/* ============================================================
   FILE: 17_external_intelligence_phase21_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.20.0
   Phase 21 PC Real Runtime Final Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase21RealRuntimeValidation");

  async function runExternalIntelligencePhase21RealRuntimeValidation() {
    const base = await namespace.runExternalIntelligencePhase21Validation();
    const checks = [];
    const add = function add(name, passed, detail, group) { checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Phase 21 PC", severity: "Critical" }); };
    add("Phase 21 Integrated Functional Validation remains PASS", base.failed === 0 && base.criticalFailed === 0, { passed: base.passed, failed: base.failed, total: base.total }, "Regression");
    add("PC Browser runtime is active", typeof global !== "undefined" && typeof navigator !== "undefined", typeof navigator !== "undefined" ? navigator.userAgent : "non-browser", "Runtime");
    add("Gateway target remains v1.5.0", VM.gateway.gatewayVersion === "1.5.0", VM.gateway.gatewayVersion, "Gateway");

    try {
      const health = await namespace.getExternalIntelligenceGatewayHealth();
      add("Real Gateway health is READY and minimally exposed", health && health.ok === true && health.data && health.data.health && health.data.health.gatewayVersion === "1.5.0" && !Object.prototype.hasOwnProperty.call(health.data.health, "secretValue"), health, "Gateway");
      const opened = await namespace.openExternalIntelligenceGatewaySession({ requestedScope: ["READ_RUNTIME"] });
      add("Gateway handshake creates ephemeral memory-only session", opened && opened.ok === true && opened.data && opened.data.sessionTokenPersisted === false && opened.data.tokenReturnedToCaller === false, opened, "Decision 054");
      const runtime = await namespace.getProtectedExternalIntelligenceGatewayRuntime();
      const runtimeResponse = runtime && runtime.data && runtime.data.response;
      add("Protected Gateway operation succeeds only through current runtime-bound session", Boolean(runtime && runtime.ok === true && runtimeResponse && runtimeResponse.runtime && runtimeResponse.runtime.runtimeInstanceId && runtimeResponse.runtime.startupEpoch), runtimeResponse, "Decision 054");
      const publicState = namespace.getExternalIntelligenceGatewayClientState();
      add("Public Gateway client state exposes no session token", publicState && !Object.prototype.hasOwnProperty.call(publicState, "sessionToken") && publicState.session && publicState.session.tokenPersisted === false, publicState, "Security");

      const denied = await namespace.requestAuthorityGovernedExternalIntelligenceGatewayOperation({ action: "PHASE21_UNAUTHORIZED_OPERATION", target: { type: "gateway", id: "local" }, purpose: "phase21-negative", path: VM.gateway.runtimeEndpoint, payload: {} });
      add("Valid Gateway session cannot bypass Decision 039 business authority", denied && denied.ok === false && denied.code === "EXTERNAL010_GATEWAY_OPERATION_AUTHORITY_DENIED" && denied.data && denied.data.gatewayRequestSent === false, denied, "Authority");

      await namespace.revokeExternalIntelligenceGatewaySession();
      const afterRevoke = namespace.getExternalIntelligenceGatewayClientState();
      add("Session revocation removes active authentication state", !afterRevoke.session || String(afterRevoke.session.state || "").toUpperCase() !== "ACTIVE", afterRevoke, "Decision 054");
      add("Gateway session never grants Trading/Repository/Knowledge authority", VM.safety.gatewaySessionEqualsBusinessAuthority === false && VM.safety.automaticTradeExecutionAllowed === false && VM.safety.directRepositoryMutationAllowed === false && VM.safety.automaticKnowledgePromotionAllowed === false, VM.safety, "Authority");
    } catch (error) {
      add("Phase 21 PC Real Runtime completes without exception", false, error && error.stack || String(error), "Runtime");
      try { await namespace.revokeExternalIntelligenceGatewaySession(); } catch (_) {}
    }

    const failed = checks.filter(function fail(item) { return !item.passed; });
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE21-PC-REAL-RUNTIME"), componentId: "EXTERNAL-010", version: VM.release.version, gatewayVersion: VM.gateway.gatewayVersion,
      implementationPhase: VM.release.implementationPhase, passed: checks.length - failed.length, failed: failed.length, total: checks.length,
      health: checks.length ? Math.round((checks.length - failed.length) * 1000 / checks.length) / 10 : 0, criticalFailed: failed.length,
      status: failed.length ? "EXTERNAL-010 Phase 21 PC Real Runtime Validation FAILED" : "EXTERNAL-010 Phase 21 PC Real Runtime Validation PASS",
      releaseAllowed: failed.length === 0, phase21PcRealRuntimeComplete: failed.length === 0, finalReleaseAllowed: false, androidRealDeviceRequired: true, projectOwnerAcceptanceRequired: true,
      checks, validatedAt: internal.nowIso(), immutable: true
    };
    state.latestPhase21RealRuntimeValidation = internal.deepFreeze(internal.clone(result));
    return result;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase21RealRuntimeValidation });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase21RealRuntimeValidation = runExternalIntelligencePhase21RealRuntimeValidation;
  namespace.modules.phase21RealRuntimeValidation = { id: "EXTERNAL-010-PHASE21-PC-REAL-RUNTIME", version: MODULE_VERSION, phase: 21, status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
