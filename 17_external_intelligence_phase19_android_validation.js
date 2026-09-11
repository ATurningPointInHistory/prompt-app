/* ============================================================
   FILE: 17_external_intelligence_phase19_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.18.1
   Phase 19 Android Real Device Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase19AndroidValidation");

  async function run() {
    const base = await namespace.runExternalIntelligencePhase19Validation();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const checks = [
      { name: "Phase 19 regression remains PASS", passed: base.failed === 0, detail: JSON.stringify({ passed: base.passed, failed: base.failed, total: base.total }), group: "Regression", severity: "Critical" },
      { name: "Android/mobile browser runtime detected", passed: /Android|Mobile/i.test(ua), detail: ua, group: "Device", severity: "Critical" },
      { name: "Strategy Experiment persistence adapter is available on device", passed: !!state.marketPersistence && state.marketPersistence.adapterId === "EXTERNAL-010-MARKET-PERSISTENCE-LOCAL-STORAGE", detail: state.marketPersistence && state.marketPersistence.adapterId, group: "Persistence", severity: "Critical" },
      { name: "Phase 19 contracts and module are loaded on device", passed: !!namespace.getExternalIntelligenceContract("strategyExperimentProtocol") && !!namespace.getExternalIntelligenceContract("strategyBacktestResult") && !!namespace.modules.strategyExperiment, detail: namespace.modules.strategyExperiment, group: "Load", severity: "Critical" },
      { name: "Point-in-Time / Look-Ahead / Leakage controls remain mandatory", passed: namespace.modules.strategyExperiment.pointInTimeRequired === true && namespace.modules.strategyExperiment.lookAheadBlocked === true && namespace.modules.strategyExperiment.featureLeakageBlocked === true && namespace.modules.strategyExperiment.survivorshipControlRequired === true, detail: namespace.modules.strategyExperiment, group: "Temporal", severity: "Critical" },
      { name: "Failure and trial history preservation remain active", passed: namespace.modules.strategyExperiment.failedExperimentPreserved === true && namespace.modules.strategyExperiment.trialHistoryPreserved === true, detail: namespace.modules.strategyExperiment, group: "Evidence", severity: "Critical" },
      { name: "Readiness does not become trading or real-money authority", passed: namespace.modules.strategyExperiment.readinessEqualsAuthority === false && namespace.modules.strategyExperiment.tradingAuthorityGranted === false && namespace.modules.strategyExperiment.orderAuthorityGranted === false && namespace.modules.strategyExperiment.executionAuthorityGranted === false && namespace.modules.strategyExperiment.realMoneyAuthorityGranted === false, detail: "authority-neutral", group: "Safety", severity: "Critical" }
    ];
    const failed = checks.filter(function failed(c) { return !c.passed; });
    return {
      id: internal.nextId("EXTERNAL-010-PHASE19-ANDROID-REAL-DEVICE"), componentId: "EXTERNAL-010", version: VM.release.version,
      gatewayVersion: VM.gateway.gatewayVersion, implementationPhase: VM.release.implementationPhase,
      passed: checks.length - failed.length, failed: failed.length, total: checks.length,
      health: Math.round((checks.length - failed.length) * 1000 / checks.length) / 10, criticalFailed: failed.length,
      status: failed.length ? "EXTERNAL-010 Phase 19 Android Real Device Validation FAILED" : "EXTERNAL-010 Phase 19 Android Real Device Validation PASS",
      releaseAllowed: failed.length === 0, phase19AndroidRealDeviceComplete: failed.length === 0, phase19FinalGateReady: failed.length === 0,
      checks, validatedAt: internal.nowIso()
    };
  }
  Object.assign(namespace.api, { runExternalIntelligencePhase19AndroidValidation: run });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase19AndroidValidation = run;
  namespace.modules.phase19AndroidValidation = { id: "EXTERNAL-010-PHASE19-ANDROID", version: MODULE_VERSION, phase: 19, status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
