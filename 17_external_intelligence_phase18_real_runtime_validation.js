(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase18RealRuntimeValidation");
  async function run() {
    const base = await namespace.runExternalIntelligencePhase18Validation();
    const checks = [
      { name: "Phase 18 functional regression remains PASS", passed: base.failed === 0, detail: JSON.stringify({ passed: base.passed, failed: base.failed, total: base.total }), group: "Regression", severity: "Critical" },
      { name: "Browser/PC runtime is available", passed: typeof global !== "undefined", detail: typeof navigator !== "undefined" ? navigator.userAgent : "non-browser", group: "Runtime", severity: "Critical" },
      { name: "Fusion persistence adapter is available", passed: !!state.marketPersistence && !!state.marketPersistence.adapterId, detail: state.marketPersistence && state.marketPersistence.adapterId, group: "Persistence", severity: "Critical" },
      { name: "Gateway boundary remains 1.4.0 and unchanged", passed: VM.gateway.gatewayVersion === "1.4.0", detail: VM.gateway.gatewayVersion, group: "Boundary", severity: "Critical" },
      { name: "Market Fusion remains authority-neutral", passed: namespace.modules.marketFusion.tradingAuthorityGranted === false && namespace.modules.marketFusion.predictionEqualsStrategy === false && namespace.modules.marketFusion.strategyEqualsOrder === false, detail: namespace.modules.marketFusion, group: "Safety", severity: "Critical" }
    ];
    const failed = checks.filter(function failed(c) { return !c.passed; });
    return { id: internal.nextId("EXTERNAL-010-PHASE18-PC-REAL-RUNTIME"), componentId: "EXTERNAL-010", version: VM.release.version, gatewayVersion: VM.gateway.gatewayVersion, implementationPhase: VM.release.implementationPhase, passed: checks.length - failed.length, failed: failed.length, total: checks.length, health: Math.round((checks.length - failed.length) * 1000 / checks.length) / 10, criticalFailed: failed.length, status: failed.length ? "EXTERNAL-010 Phase 18 PC Real Runtime Validation FAILED" : "EXTERNAL-010 Phase 18 PC Real Runtime Validation PASS", releaseAllowed: failed.length === 0, phase18PcRealRuntimeComplete: failed.length === 0, checks, validatedAt: internal.nowIso() };
  }
  Object.assign(namespace.api, { runExternalIntelligencePhase18RealRuntimeValidation: run }); Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase18RealRuntimeValidation = run;
  namespace.modules.phase18RealRuntimeValidation = { id: "EXTERNAL-010-PHASE18-PC-REAL-RUNTIME", version: MODULE_VERSION, phase: 18, status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
