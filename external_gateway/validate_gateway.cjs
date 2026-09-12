"use strict";

const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");

const port = 43119;
const host = "127.0.0.1";
const origin = "https://aturningpointinhistory.github.io";
const badOrigin = "https://example.invalid";
const cwd = __dirname;
const checks = [];
let stdout = "";
let stderr = "";

function check(name, passed, detail, severity = "Critical") {
  checks.push({ name, passed: passed === true, detail: detail == null ? "" : String(detail), severity });
}

function request({ method = "GET", route = "/health", headers = {}, body = null, hostHeader = `${host}:${port}` }) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request({ hostname: host, port, path: route, method, headers: { Host: hostHeader, ...headers, ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}) } }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try { json = JSON.parse(text); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, text });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sessionHeaders(sessionId, token, requestId, nonce, requestTime = new Date().toISOString()) {
  return {
    Origin: origin,
    "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser",
    "X-EXTERNAL-010-Contract-Version": "1.0.0",
    "X-EXTERNAL-010-Session": token,
    "X-EXTERNAL-010-Session-Id": sessionId,
    "X-EXTERNAL-010-Request-Id": requestId,
    "X-EXTERNAL-010-Nonce": nonce,
    "X-EXTERNAL-010-Request-Time": requestTime
  };
}

async function waitReady(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await request({});
      if (result.status === 200 && result.body && result.body.gatewayAvailable) return result;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Gateway did not become ready.");
}

function startGateway() {
  const child = spawn(process.execPath, [path.join(cwd, "gateway.cjs")], {
    cwd,
    env: { ...process.env, EXTERNAL010_GATEWAY_PORT: String(port), EXTERNAL010_ALLOWED_ORIGINS: origin },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  return child;
}

async function stopGateway(child) {
  if (!child || child.exitCode != null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1500))
  ]);
  if (child.exitCode == null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1000))
    ]);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  check("Gateway package version is compatible with Phase 02 baseline", ["1.2.0", "1.3.0", "1.4.0", "1.5.0"].includes(pkg.version), pkg.version);
  check("Gateway has zero external dependencies", Object.keys(pkg.dependencies || {}).length === 0 && Object.keys(pkg.devDependencies || {}).length === 0, JSON.stringify({ dependencies: pkg.dependencies, devDependencies: pkg.devDependencies }));
  check("Runtime Node version is captured", /^v\d+\./.test(process.version), process.version);

  const { buildConfig } = require("./lib/config.cjs");
  const { createAudit } = require("./lib/audit.cjs");
  const { createRuntime } = require("./lib/runtime.cjs");
  const { createSessionStore } = require("./lib/session_store.cjs");
  const expiryConfig = { ...buildConfig(), sessionTtlMs: 1 };
  const expiryAudit = createAudit();
  const expiryRuntime = createRuntime(expiryConfig);
  expiryRuntime.setState("READY");
  const expiryStore = createSessionStore(expiryConfig, expiryRuntime, expiryAudit);
  const expiryCreated = expiryStore.create({ clientSessionId: "expiry-test", scope: ["PROBE"], origin });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const expiryResult = expiryStore.validateSessionOnly({ headers: { [expiryConfig.sessionIdHeader]: expiryCreated.session.gatewaySessionId, [expiryConfig.sessionHeader]: expiryCreated.sessionToken, origin } });
  check("Expired session is rejected", expiryResult.ok === false && expiryResult.code === "SESSION_EXPIRED", expiryResult.code);

  let child = startGateway();
  try {
    const health = await waitReady();
    check("Gateway binds and health is ready", health.status === 200 && health.body.runtimeState === "READY", JSON.stringify(health.body));
    check("Health response is minimal", !Object.prototype.hasOwnProperty.call(health.body, "nodeVersion") && !Object.prototype.hasOwnProperty.call(health.body, "runtimeInstanceId"), JSON.stringify(health.body));
    check("Health confirms loopback-only", health.body.loopbackOnly === true, health.body.loopbackOnly);

    const badHost = await request({ hostHeader: `evil.local:${port}` });
    check("Unexpected Host is rejected", badHost.status === 403 && badHost.body.code === "HOST_REJECTED", badHost.status + ":" + (badHost.body && badHost.body.code));

    const preflightBad = await request({ method: "OPTIONS", route: "/v1/session", headers: { Origin: badOrigin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-external-010-client" } });
    check("Disallowed Origin preflight is rejected", preflightBad.status === 403, preflightBad.status);
    check("Rejected Origin receives no ACAO", !preflightBad.headers["access-control-allow-origin"], preflightBad.headers["access-control-allow-origin"] || "absent");

    const preflight = await request({ method: "OPTIONS", route: "/v1/session", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-external-010-client,x-external-010-contract-version", "Access-Control-Request-Private-Network": "true" } });
    check("Allowed Origin preflight succeeds", preflight.status === 204, preflight.status);
    check("Exact Origin is echoed", preflight.headers["access-control-allow-origin"] === origin, preflight.headers["access-control-allow-origin"]);
    check("Legacy private-network preflight compatibility is supported", preflight.headers["access-control-allow-private-network"] === "true", preflight.headers["access-control-allow-private-network"]);

    const sessionBadOrigin = await request({ method: "POST", route: "/v1/session", headers: { Origin: badOrigin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { clientSessionId: "bad" } });
    check("Session creation rejects disallowed Origin", sessionBadOrigin.status === 403 && sessionBadOrigin.body.code === "ORIGIN_REJECTED", sessionBadOrigin.status + ":" + (sessionBadOrigin.body && sessionBadOrigin.body.code));

    const missingClient = await request({ method: "POST", route: "/v1/session", headers: { Origin: origin, "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { clientSessionId: "missing-client" } });
    check("Session creation requires custom client header", missingClient.status === 403 && missingClient.body.code === "CLIENT_HEADER_REJECTED", missingClient.status + ":" + (missingClient.body && missingClient.body.code));

    const created = await request({ method: "POST", route: "/v1/session", headers: { Origin: origin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { clientSessionId: "validator", requestedScope: ["PROBE", "READ_RUNTIME"] } });
    check("Ephemeral session is created", Boolean(created.status === 201 && created.body && created.body.sessionToken && created.body.session), created.status);
    const sessionId = created.body.session.gatewaySessionId;
    const token = created.body.sessionToken;
    check("Session metadata says token is not persisted", created.body.session.tokenPersisted === false, created.body.session.tokenPersisted);
    check("Session is bound to runtime", Boolean(created.body.session.runtimeInstanceId), created.body.session.runtimeInstanceId);
    check("Session has finite expiration", Date.parse(created.body.session.expiresAt) > Date.parse(created.body.session.issuedAt), created.body.session.expiresAt);

    const missingSession = await request({ method: "POST", route: "/v1/probe", headers: { Origin: origin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { probe: "missing" } });
    check("Protected endpoint rejects missing session", missingSession.status === 401 && missingSession.body.code === "SESSION_INVALID", missingSession.status + ":" + (missingSession.body && missingSession.body.code));

    const invalidTokenHeaders = sessionHeaders(sessionId, "invalid-token", randomUUID(), randomUUID());
    const invalidToken = await request({ method: "POST", route: "/v1/probe", headers: invalidTokenHeaders, body: { probe: "invalid" } });
    check("Invalid session token is rejected", invalidToken.status === 401 && invalidToken.body.code === "SESSION_INVALID", invalidToken.status + ":" + (invalidToken.body && invalidToken.body.code));

    const missingIntegrity = await request({ method: "POST", route: "/v1/probe", headers: { Origin: origin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0", "X-EXTERNAL-010-Session": token, "X-EXTERNAL-010-Session-Id": sessionId }, body: { probe: "missing-integrity" } });
    check("Protected request requires requestId / nonce / request time", missingIntegrity.status === 400 && missingIntegrity.body.code === "REQUEST_INTEGRITY_HEADERS_REQUIRED", missingIntegrity.status + ":" + (missingIntegrity.body && missingIntegrity.body.code));

    const limitedSession = await request({ method: "POST", route: "/v1/session", headers: { Origin: origin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { clientSessionId: "limited", requestedScope: ["PROBE", "UNSUPPORTED_SCOPE"] } });
    const limitedId = limitedSession.body.session.gatewaySessionId;
    const limitedToken = limitedSession.body.sessionToken;
    check("Unsupported session scopes are not granted", limitedSession.body.session.scope.length === 1 && limitedSession.body.session.scope[0] === "PROBE", JSON.stringify(limitedSession.body.session.scope));
    const scopeDenied = await request({ method: "POST", route: "/v1/runtime", headers: sessionHeaders(limitedId, limitedToken, randomUUID(), randomUUID()), body: {} });
    check("Session scope is enforced", scopeDenied.status === 403 && scopeDenied.body.code === "SESSION_SCOPE_DENIED", scopeDenied.status + ":" + (scopeDenied.body && scopeDenied.body.code));

    const staleHeaders = sessionHeaders(sessionId, token, randomUUID(), randomUUID(), new Date(Date.now() - 600000).toISOString());
    const stale = await request({ method: "POST", route: "/v1/probe", headers: staleHeaders, body: { probe: "stale" } });
    check("Stale request is rejected", stale.status === 408 && stale.body.code === "REQUEST_STALE", stale.status + ":" + (stale.body && stale.body.code));

    const requestId = randomUUID();
    const nonce = randomUUID();
    const validHeaders = sessionHeaders(sessionId, token, requestId, nonce);
    const probe = await request({ method: "POST", route: "/v1/probe", headers: validHeaders, body: { probe: "phase2" } });
    check("Valid protected request succeeds", probe.status === 200 && probe.body.code === "PROBE_ACCEPTED", probe.status + ":" + (probe.body && probe.body.code));
    check("Gateway session does not grant business authority", probe.body.businessAuthorityGranted === false, probe.body.businessAuthorityGranted);

    const replay = await request({ method: "POST", route: "/v1/probe", headers: validHeaders, body: { probe: "phase2" } });
    check("Same requestId / nonce replay is rejected", replay.status === 409 && replay.body.code === "REQUEST_REPLAYED", replay.status + ":" + (replay.body && replay.body.code));

    const runtimeHeaders = sessionHeaders(sessionId, token, randomUUID(), randomUUID());
    const runtimeState = await request({ method: "POST", route: "/v1/runtime", headers: runtimeHeaders, body: {} });
    check("Protected runtime endpoint succeeds", runtimeState.status === 200 && runtimeState.body.code === "RUNTIME_STATE", runtimeState.status);
    check("Runtime identity is explicit", runtimeState.body.runtime.runtimeType === "NODE_GATEWAY" && Boolean(runtimeState.body.runtime.startupEpoch), JSON.stringify(runtimeState.body.runtime));
    check("Runtime captures exact Node version", runtimeState.body.runtime.nodeVersion === process.version, runtimeState.body.runtime.nodeVersion);
    check("Runtime has no business authority", runtimeState.body.runtime.businessAuthorityGranted === false, runtimeState.body.runtime.businessAuthorityGranted);
    check("Gateway runtime uses node builtins only", runtimeState.body.supplyChain.externalDependencyCount === 0 && runtimeState.body.supplyChain.runtimePackageInstallAllowed === false, JSON.stringify(runtimeState.body.supplyChain));

    const revokeHeaders = sessionHeaders(sessionId, token, randomUUID(), randomUUID());
    const revoke = await request({ method: "POST", route: "/v1/session/revoke", headers: revokeHeaders, body: { reason: "validation" } });
    check("Session can be revoked", revoke.status === 200 && revoke.body.code === "SESSION_REVOKED", revoke.status);
    const afterRevoke = await request({ method: "POST", route: "/v1/probe", headers: sessionHeaders(sessionId, token, randomUUID(), randomUUID()), body: { probe: "revoked" } });
    check("Revoked session is rejected", afterRevoke.status === 401 && afterRevoke.body.code === "SESSION_REVOKED", afterRevoke.status + ":" + (afterRevoke.body && afterRevoke.body.code));

    const created2 = await request({ method: "POST", route: "/v1/session", headers: { Origin: origin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { clientSessionId: "restart-test", requestedScope: ["PROBE"] } });
    const oldSessionId = created2.body.session.gatewaySessionId;
    const oldToken = created2.body.sessionToken;
    await stopGateway(child);
    child = startGateway();
    await waitReady();
    const oldAfterRestart = await request({ method: "POST", route: "/v1/probe", headers: sessionHeaders(oldSessionId, oldToken, randomUUID(), randomUUID()), body: { probe: "restart" } });
    check("Gateway restart invalidates old session", oldAfterRestart.status === 401 && oldAfterRestart.body.code === "SESSION_INVALID", oldAfterRestart.status + ":" + (oldAfterRestart.body && oldAfterRestart.body.code));

    check("Session token is absent from gateway stdout", !stdout.includes(token) && !stdout.includes(oldToken), "token absent");
    check("Session token is absent from gateway stderr", !stderr.includes(token) && !stderr.includes(oldToken), "token absent");

    const passed = checks.filter((item) => item.passed).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter((item) => !item.passed && item.severity === "Critical").length;
    const result = {
      id: `EXTERNAL-010-GATEWAY-VALIDATION-${randomUUID()}`,
      componentId: "EXTERNAL-010",
      version: "1.2.0",
      runtimeNodeVersion: process.version,
      passed,
      failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0,
      criticalFailed,
      status: failed === 0 && criticalFailed === 0 ? "EXTERNAL-010 Gateway Phase 02 Validation PASS" : "EXTERNAL-010 Gateway Phase 02 Validation FAIL",
      releaseAllowed: failed === 0 && criticalFailed === 0,
      checks,
      validatedAt: new Date().toISOString()
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.releaseAllowed) process.exitCode = 1;
  } finally {
    await stopGateway(child);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "EXTERNAL-010 Gateway Phase 02 Validation ERROR", message: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
});
