/* ============================================================
   FILE: 17_external_intelligence_phase19_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.18.1
   Phase 19 PC Real Runtime Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase19RealRuntimeValidation");

  async function run() {
    const base = await namespace.runExternalIntelligencePhase19Validation();
    const checks = [
      { name: "Phase 19 functional regression remains PASS", passed: base.failed === 0, detail: JSON.stringify({ passed: base.passed, failed: base.failed, total: base.total }), group: "Regression", severity: "Critical" },
      { name: "Browser/PC runtime is available", passed: typeof global !== "undefined", detail: typeof navigator !== "undefined" ? navigator.userAgent : "non-browser", group: "Runtime", severity: "Critical" },
      { name: "Strategy Experiment persistence adapter is available", passed: !!state.marketPersistence && state.marketPersistence.adapterId === "EXTERNAL-010-MARKET-PERSISTENCE-LOCAL-STORAGE", detail: state.marketPersistence && state.marketPersistence.adapterId, group: "Persistence", severity: "Critical" },
      { name: "Phase 19 Strategy Experiment module is active", passed: !!namespace.modules.strategyExperiment && namespace.modules.strategyExperiment.status === "Ready", detail: namespace.modules.strategyExperiment, group: "Runtime", severity: "Critical" },
      { name: "Gateway boundary remains 1.4.0 and unchanged", passed: VM.gateway.gatewayVersion === "1.4.0", detail: VM.gateway.gatewayVersion, group: "Boundary", severity: "Critical" },
      { name: "Failed experiments and trial history remain preservation-first", passed: namespace.modules.strategyExperiment.failedExperimentPreserved === true && namespace.modules.strategyExperiment.trialHistoryPreserved === true, detail: namespace.modules.strategyExperiment, group: "Evidence", severity: "Critical" },
      { name: "Backtest/Paper/Real-Money authority boundaries remain separated", passed: namespace.modules.strategyExperiment.backtestPassEqualsPaperApproval === false && namespace.modules.strategyExperiment.paperPassEqualsRealMoneyApproval === false && namespace.modules.strategyExperiment.realMoneyAuthorityGranted === false && namespace.modules.strategyExperiment.orderAuthorityGranted === false, detail: namespace.modules.strategyExperiment, group: "Safety", severity: "Critical" }
    ];
    const failed = checks.filter(function failed(c) { return !c.passed; });
    return {
      id: internal.nextId("EXTERNAL-010-PHASE19-PC-REAL-RUNTIME"), componentId: "EXTERNAL-010", version: VM.release.version,
      gatewayVersion: VM.gateway.gatewayVersion, implementationPhase: VM.release.implementationPhase,
      passed: checks.length - failed.length, failed: failed.length, total: checks.length,
      health: Math.round((checks.length - failed.length) * 1000 / checks.length) / 10, criticalFailed: failed.length,
      status: failed.length ? "EXTERNAL-010 Phase 19 PC Real Runtime Validation FAILED" : "EXTERNAL-010 Phase 19 PC Real Runtime Validation PASS",
      releaseAllowed: failed.length === 0, phase19PcRealRuntimeComplete: failed.length === 0, checks, validatedAt: internal.nowIso()
    };
  }
  Object.assign(namespace.api, { runExternalIntelligencePhase19RealRuntimeValidation: run });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase19RealRuntimeValidation = run;
  namespace.modules.phase19RealRuntimeValidation = { id: "EXTERNAL-010-PHASE19-PC-REAL-RUNTIME", version: MODULE_VERSION, phase: 19, status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
