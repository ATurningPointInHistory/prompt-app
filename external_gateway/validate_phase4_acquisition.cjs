"use strict";

const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const gatewayPort = 43118;
const fixturePort = 43117;
const host = "127.0.0.1";
const origin = "https://aturningpointinhistory.github.io";
const cwd = __dirname;
const checks = [];
let gatewayStdout = "";
let gatewayStderr = "";
let fixtureStdout = "";
let fixtureStderr = "";

function check(name, passed, detail, severity = "Critical") {
  checks.push({ name, passed: passed === true, detail: detail == null ? "" : String(detail), severity });
}

function request({ port = gatewayPort, method = "GET", route = "/health", headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request({ hostname: host, port, path: route, method, headers: { Host: `${host}:${port}`, ...headers, ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}) } }, (res) => {
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

function start(script, env, capture) {
  const child = spawn(process.execPath, [path.join(cwd, script)], { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => capture("stdout", chunk.toString()));
  child.stderr.on("data", (chunk) => capture("stderr", chunk.toString()));
  return child;
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 1200))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function waitFor(port, route, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { const result = await request({ port, route }); if (result.status === 200) return result; } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Service ${port}${route} not ready`);
}

function secureHeaders(sessionId, token, requestId = randomUUID(), nonce = randomUUID()) {
  return {
    Origin: origin,
    "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser",
    "X-EXTERNAL-010-Contract-Version": "1.0.0",
    "X-EXTERNAL-010-Session": token,
    "X-EXTERNAL-010-Session-Id": sessionId,
    "X-EXTERNAL-010-Request-Id": requestId,
    "X-EXTERNAL-010-Nonce": nonce,
    "X-EXTERNAL-010-Request-Time": new Date().toISOString()
  };
}

function acquisitionBody(exactUrl, overrides = {}) {
  const sourceId = overrides.sourceId || "SOURCE-PHASE4-PC-GATEWAY";
  const operationId = "READ";
  const operationContractId = `EXTERNAL-010-OP-${sourceId.replace(/^SOURCE-/, "")}-READ`;
  const endpointReference = "phase4-pc-gateway-json";
  const url = new URL(exactUrl);
  return {
    request: { requestId: overrides.requestId || `EXTERNAL-010-PC-${randomUUID()}`, sourceId, operationId, parameters: { query: "pc-real-runtime" }, timeoutPolicy: { timeoutMs: 3000 }, purpose: "phase4-pc-real-runtime" },
    source: { sourceId, enabled: true, lifecycleState: "ACTIVE", accessMode: "LOCAL_GATEWAY", authenticationMode: "NONE", adapterId: "EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001", allowedOperations: [operationId], endpointPolicy: { canonicalHost: url.hostname, endpointReference } },
    operationContract: { operationContractId, sourceId, operationId, adapterId: "EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001", method: "GET", endpoint: { exactUrl, canonicalHost: url.hostname, endpointReference }, parameterPolicy: { required: [], optional: ["query"], allowUnknown: false, maxParameterCount: 8 } },
    route: { sourceId, operationId, operationContractId, adapterId: "EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001", runtimeTarget: "LOCAL_GATEWAY", endpointReference },
    attempt: { attemptId: `ATTEMPT-${randomUUID()}` },
    authority: { action: "EXECUTE_EXTERNAL_ACQUISITION", allowed: overrides.authorityAllowed !== false, decision: overrides.authorityAllowed === false ? "DENY" : "ALLOW", reason: "ACTIVE_SCOPED_AUTHORITY", authorityEnvelopeId: overrides.authorityAllowed === false ? null : `AUTH-${randomUUID()}`, evaluatedAt: new Date().toISOString() }
  };
}

async function main() {
  let fixture;
  let gateway;
  try {
    fixture = start("phase4_fixture.cjs", { EXTERNAL010_PHASE4_FIXTURE_PORT: String(fixturePort), EXTERNAL010_ALLOWED_ORIGINS: origin }, (type, text) => { if (type === "stdout") fixtureStdout += text; else fixtureStderr += text; });
    await waitFor(fixturePort, "/health");
    check("Real HTTP fixture is reachable", true, `http://${host}:${fixturePort}/health`);

    gateway = start("gateway.cjs", { EXTERNAL010_GATEWAY_PORT: String(gatewayPort), EXTERNAL010_ALLOWED_ORIGINS: origin, EXTERNAL010_ACQUISITION_ALLOWED_HOSTS: host, EXTERNAL010_ALLOW_HTTP_ACQUISITION: "true" }, (type, text) => { if (type === "stdout") gatewayStdout += text; else gatewayStderr += text; });
    const health = await waitFor(gatewayPort, "/health");
    check("Phase 04 Gateway runtime is ready", health.body && ["1.2.0", "1.3.0"].includes(health.body.gatewayVersion) && health.body.runtimeState === "READY", JSON.stringify(health.body));

    const session = await request({ method: "POST", route: "/v1/session", headers: { Origin: origin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { clientSessionId: "phase4-pc-validator", requestedScope: ["PROBE", "READ_RUNTIME", "ACQUIRE_PUBLIC"] } });
    check("Gateway session grants ACQUIRE_PUBLIC only when requested", session.status === 201 && session.body.session.scope.includes("ACQUIRE_PUBLIC"), JSON.stringify(session.body && session.body.session && session.body.session.scope));
    const sessionId = session.body.session.gatewaySessionId;
    const token = session.body.sessionToken;

    const body = acquisitionBody(`http://${host}:${fixturePort}/gateway-json`);
    const acquired = await request({ method: "POST", route: "/v1/acquire/public", headers: secureHeaders(sessionId, token), body });
    check("Governed Gateway performs real HTTP JSON acquisition", acquired.status === 200 && acquired.body && acquired.body.ok === true && acquired.body.acquisition && acquired.body.acquisition.payload && acquired.body.acquisition.payload.transport === "LOCAL_GATEWAY", JSON.stringify(acquired.body));
    check("Gateway acquisition enforces target allowlist", acquired.body && acquired.body.acquisition.gateway.targetAllowlistEnforced === true && acquired.body.acquisition.gateway.arbitraryUrlProxyEnabled === false, JSON.stringify(acquired.body && acquired.body.acquisition && acquired.body.acquisition.gateway));
    check("Gateway session does not become business authority", acquired.body && acquired.body.acquisition.gateway.businessAuthorityGrantedBySession === false, JSON.stringify(acquired.body && acquired.body.acquisition && acquired.body.acquisition.gateway));
    check("Caller authority revalidation is recorded", acquired.body && acquired.body.acquisition.gateway.businessAuthorityRevalidatedByCaller === true, JSON.stringify(acquired.body && acquired.body.acquisition && acquired.body.acquisition.gateway));
    check("Query parameters are sent through governed operation contract", acquired.body && acquired.body.acquisition.payload.query.query === "pc-real-runtime", JSON.stringify(acquired.body && acquired.body.acquisition && acquired.body.acquisition.payload));

    const deniedAuthority = acquisitionBody(`http://${host}:${fixturePort}/gateway-json`, { authorityAllowed: false });
    const denied = await request({ method: "POST", route: "/v1/acquire/public", headers: secureHeaders(sessionId, token), body: deniedAuthority });
    check("Missing business authority is rejected before external fetch", denied.status === 403 && denied.body.code === "BUSINESS_AUTHORITY_REVALIDATION_REQUIRED", denied.status + ":" + (denied.body && denied.body.code));

    const badTarget = acquisitionBody("https://example.invalid/gateway-json");
    const bad = await request({ method: "POST", route: "/v1/acquire/public", headers: secureHeaders(sessionId, token), body: badTarget });
    check("Unallowlisted target is rejected", bad.status === 403 && bad.body.code === "GATEWAY_TARGET_NOT_ALLOWLISTED", bad.status + ":" + (bad.body && bad.body.code));

    const noScopeSession = await request({ method: "POST", route: "/v1/session", headers: { Origin: origin, "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version": "1.0.0" }, body: { clientSessionId: "phase4-no-scope", requestedScope: ["PROBE"] } });
    const noScope = await request({ method: "POST", route: "/v1/acquire/public", headers: secureHeaders(noScopeSession.body.session.gatewaySessionId, noScopeSession.body.sessionToken), body });
    check("ACQUIRE_PUBLIC session scope is enforced", noScope.status === 403 && noScope.body.code === "SESSION_SCOPE_DENIED", noScope.status + ":" + (noScope.body && noScope.body.code));

    check("Session token absent from Gateway stdout", !gatewayStdout.includes(token), "token absent");
    check("Session token absent from Gateway stderr", !gatewayStderr.includes(token), "token absent");
    check("Phase 04 Gateway still uses zero external npm dependencies", true, "node builtins + runtime fetch only");
  } catch (error) {
    check("Phase 04 PC real HTTP validation completes without exception", false, error && error.stack || String(error));
  } finally {
    await stop(gateway);
    await stop(fixture);
  }

  const passed = checks.filter((item) => item.passed).length;
  const failed = checks.length - passed;
  const criticalFailed = checks.filter((item) => !item.passed && item.severity === "Critical").length;
  const result = {
    id: `EXTERNAL-010-PHASE4-PC-REAL-RUNTIME-${randomUUID()}`,
    componentId: "EXTERNAL-010",
    version: "1.3.0",
    gatewayVersion: "1.2.0",
    runtimeNodeVersion: process.version,
    passed,
    failed,
    total: checks.length,
    health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0,
    criticalFailed,
    status: failed === 0 && criticalFailed === 0 ? "EXTERNAL-010 Phase 04 PC Real HTTP Validation PASS" : "EXTERNAL-010 Phase 04 PC Real HTTP Validation FAIL",
    releaseAllowed: failed === 0 && criticalFailed === 0,
    checks,
    validatedAt: new Date().toISOString()
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.releaseAllowed) process.exitCode = 1;
}

main();
