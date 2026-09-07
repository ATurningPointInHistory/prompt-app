"use strict";

const http = require("node:http");
const { buildConfig } = require("./lib/config.cjs");
const { createAudit } = require("./lib/audit.cjs");
const { createRuntime } = require("./lib/runtime.cjs");
const { createSecurity } = require("./lib/security.cjs");
const { createSessionStore } = require("./lib/session_store.cjs");
const { createAcquisition } = require("./lib/acquisition.cjs");
const { createEvidenceStore } = require("./lib/evidence_store.cjs");

const config = buildConfig();
const audit = createAudit();
const runtime = createRuntime(config);
const security = createSecurity(config, audit);
const sessions = createSessionStore(config, runtime, audit);
const acquisition = createAcquisition(config, audit);
const evidenceStore = createEvidenceStore(config, audit);

function sendJson(req, res, status, body, cors) {
  if (cors) security.applyCors(req, res);
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function reject(req, res, status, code, detail) {
  audit.append("GATEWAY_REQUEST_REJECTED", "Rejected", { code, method: req.method, url: req.url, detail: detail || null });
  sendJson(req, res, status, { ok: false, code, status: "Blocked" }, security.originAllowed(req.headers.origin));
}

function readJson(req) {
  return new Promise((resolve, rejectPromise) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > config.maxBodyBytes) {
        const error = new Error("BODY_TOO_LARGE");
        error.code = "BODY_TOO_LARGE";
        rejectPromise(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (_) {
        const error = new Error("INVALID_JSON");
        error.code = "INVALID_JSON";
        rejectPromise(error);
      }
    });
    req.on("error", rejectPromise);
  });
}

function validateProtectedRequest(req, res, requiredScope) {
  if (!security.validateHost(req)) { reject(req, res, 403, "HOST_REJECTED"); return null; }
  if (!security.validateOrigin(req)) { reject(req, res, 403, "ORIGIN_REJECTED"); return null; }
  if (!security.validateClientHeaders(req)) { reject(req, res, 403, "CLIENT_HEADER_REJECTED"); return null; }
  const result = sessions.validateProtected(req, requiredScope);
  if (!result.ok) { reject(req, res, result.status, result.code); return null; }
  return result;
}

async function route(req, res) {
  if (!security.validateHost(req)) return reject(req, res, 403, "HOST_REJECTED");

  if (req.method === "OPTIONS") {
    if (!security.validateOrigin(req)) return reject(req, res, 403, "ORIGIN_REJECTED");
    if (!security.applyCors(req, res)) return reject(req, res, 403, "CORS_REJECTED");
    res.statusCode = 204;
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  }

  if (req.url === "/health" && req.method === "GET") {
    const origin = req.headers.origin;
    if (origin && !security.validateOrigin(req)) return reject(req, res, 403, "ORIGIN_REJECTED");
    return sendJson(req, res, 200, runtime.minimalHealth(), Boolean(origin));
  }

  if (req.url === "/v1/session" && req.method === "POST") {
    if (!security.validateOrigin(req)) return reject(req, res, 403, "ORIGIN_REJECTED");
    if (!security.validateClientHeaders(req)) return reject(req, res, 403, "CLIENT_HEADER_REJECTED");
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) return reject(req, res, 415, "JSON_REQUIRED");
    let body;
    try { body = await readJson(req); }
    catch (error) { return reject(req, res, error.code === "BODY_TOO_LARGE" ? 413 : 400, error.code || "INVALID_BODY"); }
    const created = sessions.create({
      clientSessionId: String(body.clientSessionId || "unknown"),
      scope: Array.isArray(body.requestedScope) ? body.requestedScope : [],
      origin: String(req.headers.origin)
    });
    return sendJson(req, res, 201, { ok: true, code: "SESSION_CREATED", sessionToken: created.sessionToken, session: created.session }, true);
  }

  if (req.url === "/v1/probe" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res, "PROBE");
    if (!integrity) return;
    let body;
    try { body = await readJson(req); }
    catch (error) { return reject(req, res, error.code === "BODY_TOO_LARGE" ? 413 : 400, error.code || "INVALID_BODY"); }
    return sendJson(req, res, 200, {
      ok: true,
      code: "PROBE_ACCEPTED",
      requestId: integrity.requestId,
      gatewaySessionId: integrity.session.gatewaySessionId,
      runtimeInstanceId: runtime.runtime.runtimeInstanceId,
      probe: typeof body.probe === "string" ? body.probe.slice(0, 128) : null,
      businessAuthorityGranted: false
    }, true);
  }

  if (req.url === "/v1/runtime" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res, "READ_RUNTIME");
    if (!integrity) return;
    return sendJson(req, res, 200, {
      ok: true,
      code: "RUNTIME_STATE",
      runtime: runtime.protectedDetails(),
      requestId: integrity.requestId,
      sessionSummary: sessions.summary(),
      auditSummary: audit.summary(),
      supplyChain: {
        dependencyMode: "node-builtins-only",
        externalDependencyCount: 0,
        runtimePackageInstallAllowed: false
      }
    }, true);
  }

  if (req.url === "/v1/acquire/public" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res, "ACQUIRE_PUBLIC");
    if (!integrity) return;
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) return reject(req, res, 415, "JSON_REQUIRED");
    let body;
    try { body = await readJson(req); }
    catch (error) { return reject(req, res, error.code === "BODY_TOO_LARGE" ? 413 : 400, error.code || "INVALID_BODY"); }
    try {
      const result = await acquisition.acquirePublic(body, integrity);
      return sendJson(req, res, 200, { ok: true, code: "PUBLIC_ACQUISITION_SUCCEEDED", acquisition: result }, true);
    } catch (error) {
      const status = Number(error && error.status) || 502;
      audit.append("GATEWAY_PUBLIC_ACQUISITION_REJECTED", "Rejected", { code: error && error.code || "PUBLIC_ACQUISITION_FAILED", category: error && error.category || "SOURCE_UNAVAILABLE", providerStatus: error && error.providerStatus || null, requestId: integrity.requestId });
      return sendJson(req, res, status, {
        ok: false,
        code: error && error.code || "PUBLIC_ACQUISITION_FAILED",
        category: error && error.category || "SOURCE_UNAVAILABLE",
        status: status >= 500 ? "Failed" : "Blocked",
        retryable: error && error.retryable === true,
        providerStatus: error && error.providerStatus || null,
        message: error && error.message ? String(error.message).slice(0, 512) : "Public acquisition failed"
      }, true);
    }
  }


  if (req.url === "/v1/evidence/persist" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res, "PERSIST_EVIDENCE");
    if (!integrity) return;
    let body; try { body = await readJson(req); } catch (error) { return reject(req, res, error.code === "BODY_TOO_LARGE" ? 413 : 400, error.code || "INVALID_BODY"); }
    try { return sendJson(req, res, 201, { ok: true, code: "EVIDENCE_PERSISTED", persistence: evidenceStore.persistEvidence(body) }, true); }
    catch (error) { return sendJson(req, res, Number(error.status) || 500, { ok: false, code: error.code || "EVIDENCE_PERSISTENCE_FAILED", status: Number(error.status) >= 500 ? "Failed" : "Blocked" }, true); }
  }

  if (req.url === "/v1/evidence/read" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res, "READ_EVIDENCE");
    if (!integrity) return;
    let body; try { body = await readJson(req); } catch (error) { return reject(req, res, 400, error.code || "INVALID_BODY"); }
    try { return sendJson(req, res, 200, { ok: true, code: "EVIDENCE_READ", evidence: evidenceStore.readEvidence(body) }, true); }
    catch (error) { return sendJson(req, res, Number(error.status) || 500, { ok: false, code: error.code || "EVIDENCE_READ_FAILED", status: Number(error.status) >= 500 ? "Failed" : "Blocked" }, true); }
  }

  if (req.url === "/v1/evidence/integrity" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res, "READ_EVIDENCE");
    if (!integrity) return;
    let body; try { body = await readJson(req); } catch (error) { return reject(req, res, 400, error.code || "INVALID_BODY"); }
    try { return sendJson(req, res, 200, { ok: true, code: "EVIDENCE_INTEGRITY", integrity: evidenceStore.integrityScan(body) }, true); }
    catch (error) { return sendJson(req, res, Number(error.status) || 500, { ok: false, code: error.code || "EVIDENCE_INTEGRITY_FAILED", status: Number(error.status) >= 500 ? "Failed" : "Blocked" }, true); }
  }

  if (req.url === "/v1/evidence/checkpoint" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res, "PERSIST_EVIDENCE");
    if (!integrity) return;
    let body; try { body = await readJson(req); } catch (error) { return reject(req, res, 400, error.code || "INVALID_BODY"); }
    try { return sendJson(req, res, 201, { ok: true, code: "PROCESSING_CHECKPOINT_PERSISTED", checkpoint: evidenceStore.persistCheckpoint(body) }, true); }
    catch (error) { return sendJson(req, res, Number(error.status) || 500, { ok: false, code: error.code || "PROCESSING_CHECKPOINT_FAILED", status: Number(error.status) >= 500 ? "Failed" : "Blocked" }, true); }
  }

  if (req.url === "/v1/session/revoke" && req.method === "POST") {
    const integrity = validateProtectedRequest(req, res);
    if (!integrity) return;
    sessions.revoke(integrity.session.gatewaySessionId, "CLIENT_REQUEST");
    return sendJson(req, res, 200, { ok: true, code: "SESSION_REVOKED", gatewaySessionId: integrity.session.gatewaySessionId }, true);
  }

  return reject(req, res, 404, "ENDPOINT_NOT_FOUND");
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    audit.append("GATEWAY_REQUEST_EXCEPTION", "Failed", { message: error && error.message || String(error) });
    if (!res.headersSent) sendJson(req, res, 500, { ok: false, code: "INTERNAL_ERROR", status: "Failed" }, security.originAllowed(req.headers.origin));
    else res.end();
  });
});

server.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});

server.on("error", (error) => {
  runtime.setState("FAILED");
  audit.append("GATEWAY_FAILED", "Failed", { code: error.code || null, message: error.message });
  console.error(`EXTERNAL-010 Gateway failed: ${error.code || "ERROR"} ${error.message}`);
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  runtime.setState("READY");
  audit.append("GATEWAY_READY", "Ready", { host: config.host, port: config.port, loopbackOnly: true, runtimeInstanceId: runtime.runtime.runtimeInstanceId });
  console.log(`EXTERNAL-010 Local Gateway v${config.gatewayVersion}`);
  console.log(`READY http://${config.host}:${config.port}`);
  console.log(`Runtime ${runtime.runtime.runtimeInstanceId}`);
  console.log(`Allowed origins: ${config.allowedOrigins.join(", ")}`);
  console.log("External npm dependencies: 0");
});

function shutdown(signal) {
  runtime.setState("RECOVERING");
  sessions.invalidateAll(signal || "SHUTDOWN");
  audit.append("GATEWAY_STOPPING", "Stopping", { signal: signal || null });
  server.close(() => {
    try { evidenceStore.close(); } catch (_) {}
    runtime.setState("STOPPED");
    audit.append("GATEWAY_STOPPED", "Stopped", { signal: signal || null });
    process.exit(0);
  });
  if (typeof server.closeIdleConnections === "function") server.closeIdleConnections();
  setTimeout(() => {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
  }, 250).unref();
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = { server, config, runtime, sessions, audit, acquisition, evidenceStore };
