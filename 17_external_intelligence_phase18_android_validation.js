(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase18AndroidValidation");
  async function run() {
    const base = await namespace.runExternalIntelligencePhase18Validation();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const checks = [
      { name: "Phase 18 regression remains PASS", passed: base.failed === 0, detail: JSON.stringify({ passed: base.passed, failed: base.failed }), group: "Regression", severity: "Critical" },
      { name: "Android/mobile browser runtime detected", passed: /Android|Mobile/i.test(ua), detail: ua, group: "Device", severity: "Critical" },
      { name: "Market Fusion persistence adapter is available", passed: !!state.marketPersistence && !!state.marketPersistence.adapterId, detail: state.marketPersistence && state.marketPersistence.adapterId, group: "Persistence", severity: "Critical" },
      { name: "Fusion supports abstention and blocks false precision", passed: namespace.modules.marketFusion.abstentionSupported === true && namespace.modules.marketFusion.noFalsePrecision === true, detail: namespace.modules.marketFusion, group: "Fusion Safety", severity: "Critical" },
      { name: "Prediction / Strategy / Order / Trading Authority remain separated", passed: namespace.modules.marketFusion.predictionEqualsStrategy === false && namespace.modules.marketFusion.strategyEqualsOrder === false && namespace.modules.marketFusion.tradingAuthorityGranted === false, detail: "authority-neutral", group: "Safety", severity: "Critical" }
    ];
    const failed = checks.filter(function failed(c) { return !c.passed; });
    return { id: internal.nextId("EXTERNAL-010-PHASE18-ANDROID-REAL-DEVICE"), componentId: "EXTERNAL-010", version: VM.release.version, gatewayVersion: VM.gateway.gatewayVersion, implementationPhase: VM.release.implementationPhase, passed: checks.length - failed.length, failed: failed.length, total: checks.length, health: Math.round((checks.length - failed.length) * 1000 / checks.length) / 10, criticalFailed: failed.length, status: failed.length ? "EXTERNAL-010 Phase 18 Android Real Device Validation FAILED" : "EXTERNAL-010 Phase 18 Android Real Device Validation PASS", releaseAllowed: failed.length === 0, phase18AndroidRealDeviceComplete: failed.length === 0, phase18FinalGateReady: failed.length === 0, checks, validatedAt: internal.nowIso() };
  }
  Object.assign(namespace.api, { runExternalIntelligencePhase18AndroidValidation: run }); Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase18AndroidValidation = run;
  namespace.modules.phase18AndroidValidation = { id: "EXTERNAL-010-PHASE18-ANDROID", version: MODULE_VERSION, phase: 18, status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
