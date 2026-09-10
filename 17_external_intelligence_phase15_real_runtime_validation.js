/* ============================================================
   FILE: 17_external_intelligence_phase15_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.14.1
   Phase 15 PC Real Runtime Validation
   Primary Decision: 044 / Supporting Decision: 054
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase15RealRuntimeValidation");

  async function runExternalIntelligencePhase15PcRealRuntimeValidation() {
    const base = await namespace.runExternalIntelligencePhase15Validation();
    const checks = [];
    function add(name, passed, detail, group, severity) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Runtime", severity: severity || "Critical" }); }

    add("Phase 15 functional validation is PASS", base.failed === 0 && base.criticalFailed === 0, { passed: base.passed, failed: base.failed, criticalFailed: base.criticalFailed }, "Prerequisite");
    add("PC browser runtime reports DOM capability", typeof global.document !== "undefined", typeof global.document, "Runtime");
    add("Web Crypto API available", Boolean(global.crypto && global.crypto.subtle), String(Boolean(global.crypto && global.crypto.subtle)), "Runtime");
    add("Phase 15 Validation Framework APIs loaded", ["runExternalIntelligenceValidation","createExternalIntelligenceReleaseGate","evaluateExternalIntelligenceGatewayRequestIntegrity","readBackExternalIntelligenceValidationRecord"].every(function has(key) { return typeof namespace[key] === "function"; }), "Phase15 API surface", "Runtime");
    const persistenceState = namespace.getExternalIntelligenceValidationFrameworkState();
    add("PC functional validation leaves production persistence on LocalStorage, not Memory", persistenceState.persistenceAdapterId === "EXTERNAL-010-VALIDATION-PERSISTENCE-LOCAL-STORAGE", persistenceState.persistenceAdapterId, "Persistence");

    const health = await namespace.getExternalIntelligenceGatewayHealth();
    add("PC Gateway health is READY", health.ok === true && health.data && health.data.health && health.data.health.gatewayAvailable === true, health.data || health.code, "Gateway Runtime");
    if (health.ok) {
      const healthText = internal.stableStringify(health.data || {}).toLowerCase();
      add("Minimal health response exposes no session token / API key / credential value", !/sessiontoken|api[_-]?key|credentialvalue|secretvalue/.test(healthText), health.data, "Gateway Security");
      const opened = await namespace.openExternalIntelligenceGatewaySession({ requestedScope: ["PROBE", "READ_RUNTIME"] });
      add("Ephemeral Gateway session opens", opened.ok === true && opened.data && opened.data.session && opened.data.session.state === "ACTIVE", opened.data || opened.code, "Gateway Session");
      add("Gateway session token is not exposed in public open-session result", opened.ok === true && opened.data.tokenReturnedToCaller === false && opened.data.sessionTokenPersisted === false && !Object.prototype.hasOwnProperty.call(opened.data, "sessionToken"), opened.data, "Gateway Session");
      const publicState = namespace.getExternalIntelligenceGatewayClientState();
      add("Gateway session token remains memory-only and absent from public state", publicState.sessionTokenPresentInMemory === true && publicState.sessionTokenPersisted === false && !Object.prototype.hasOwnProperty.call(publicState, "sessionToken"), publicState, "Gateway Session");

      const requestId = internal.nextId("P15-PC-REPLAY");
      const nonce = internal.nextId("P15-PC-NONCE");
      const first = await namespace.probeExternalIntelligenceGateway({ probe: "phase15-real-runtime" }, { requestId: requestId, nonce: nonce });
      add("Protected Gateway request succeeds with fresh authenticated session", first.ok === true && first.data && first.data.response && first.data.response.code === "PROBE_ACCEPTED", first.data || first.code, "Gateway Request Integrity");
      const replay = await namespace.probeExternalIntelligenceGateway({ probe: "phase15-real-runtime-replay" }, { requestId: requestId, nonce: nonce });
      add("Real Gateway replay protection rejects duplicate requestId / nonce", replay.ok === false && replay.data && replay.data.httpStatus === 409 && replay.data.response && replay.data.response.code === "REQUEST_REPLAYED", replay.data || replay.code, "Gateway Request Integrity");
      const stale = await namespace.probeExternalIntelligenceGateway({ probe: "phase15-real-runtime-stale" }, { createdAt: new Date(Date.now() - 600000).toISOString() });
      add("Real Gateway freshness protection rejects stale request", stale.ok === false && stale.data && stale.data.httpStatus === 408 && stale.data.response && stale.data.response.code === "REQUEST_STALE", stale.data || stale.code, "Gateway Request Integrity");
      const runtime = await namespace.getProtectedExternalIntelligenceGatewayRuntime();
      add("Runtime identity is readable only through protected Gateway surface", runtime.ok === true && runtime.data && runtime.data.response && runtime.data.response.runtime && runtime.data.response.runtime.runtimeType === "NODE_GATEWAY", runtime.data || runtime.code, "Runtime Binding");
      add("Protected runtime grants no business authority", runtime.ok === true && runtime.data.response.runtime.businessAuthorityGranted === false, runtime.data && runtime.data.response, "Authority");

      const authorityDenied = await namespace.requestAuthorityGovernedExternalIntelligenceGatewayOperation({ action: "READ_GATEWAY_RUNTIME", target: { type: "gateway", id: "local" }, purpose: "phase15-validation" });
      add("Valid Gateway session cannot bypass Decision 039 operation authority", authorityDenied.ok === false && authorityDenied.code === "EXTERNAL010_GATEWAY_OPERATION_AUTHORITY_DENIED" && authorityDenied.data && authorityDenied.data.gatewayRequestSent === false, authorityDenied, "Authority");

      const revoked = await namespace.revokeExternalIntelligenceGatewaySession();
      add("Real Gateway session can be revoked", revoked.ok === true, revoked, "Gateway Session");
      const afterRevoke = await namespace.probeExternalIntelligenceGateway({ probe: "phase15-after-revoke" });
      add("Revoked Browser session cannot be reused", afterRevoke.ok === false && afterRevoke.code === "EXTERNAL010_GATEWAY_SESSION_REQUIRED", afterRevoke, "Gateway Session");
    }

    add("Mock PASS remains separate from Real Runtime validation", VERSION_MANIFEST.safety.mockPassEqualsRealRuntimeValidated === false, String(VERSION_MANIFEST.safety.mockPassEqualsRealRuntimeValidated), "Safety");
    add("Validation PASS remains separate from Project Owner approval", VERSION_MANIFEST.safety.validationPassEqualsApproval === false, String(VERSION_MANIFEST.safety.validationPassEqualsApproval), "Safety");

    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    return internal.deepFreeze({ id: internal.nextId("EXTERNAL-010-PHASE15-PC-REAL-RUNTIME"), componentId: "EXTERNAL-010", version: VERSION_MANIFEST.release.version, gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion, implementationPhase: VERSION_MANIFEST.release.implementationPhase, passed: passed, failed: failed, total: checks.length, health: checks.length ? Number((passed / checks.length * 100).toFixed(1)) : 0, criticalFailed: criticalFailed, status: failed === 0 ? "EXTERNAL-010 Phase 15 PC Real Runtime Validation PASS" : "EXTERNAL-010 Phase 15 PC Real Runtime Validation FAIL", releaseAllowed: failed === 0 && criticalFailed === 0, phase15PcRealRuntimeComplete: failed === 0 && criticalFailed === 0, phase15FinalGateReady: failed === 0 && criticalFailed === 0, checks: checks, validatedAt: internal.nowIso(), immutable: true });
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase15PcRealRuntimeValidation: runExternalIntelligencePhase15PcRealRuntimeValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase15RealRuntimeValidation = { id: "EXTERNAL-010-PHASE15-PC-REAL-RUNTIME-VALIDATION", version: MODULE_VERSION, status: "Ready", phase: 15, primaryDecision: "044", supportingDecision: "054", gatewayRequired: true, loadedAt: internal.nowIso() };
  global.runExternalIntelligencePhase15PcRealRuntimeValidation = runExternalIntelligencePhase15PcRealRuntimeValidation;
})(typeof window !== "undefined" ? window : globalThis);
