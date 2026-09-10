/* ============================================================
   FILE: 17_external_intelligence_phase15_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.14.1
   Phase 15 Android Real Device Validation
   Primary Decision: 044 / Supporting Decision: 054
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase15AndroidValidation");

  async function runExternalIntelligencePhase15AndroidValidation() {
    const base = await namespace.runExternalIntelligencePhase15Validation();
    const ua = global.navigator && global.navigator.userAgent || "";
    const checks = [];
    function add(name, passed, detail, group) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Android", severity: "Critical" }); }

    add("Phase 15 functional validation is PASS", base.failed === 0 && base.criticalFailed === 0, { passed: base.passed, failed: base.failed, criticalFailed: base.criticalFailed }, "Prerequisite");
    add("Android real-device user agent detected", /Android/i.test(ua), ua, "Device");
    add("Application DOM is available", typeof global.document !== "undefined", typeof global.document, "Runtime");
    add("Phase 15 multi-layer Validation APIs are available", ["runExternalIntelligenceValidation","listExternalIntelligenceValidationSuites","listExternalIntelligenceGoldenValidationCases","createExternalIntelligenceReleaseGate"].every(function has(key) { return typeof namespace[key] === "function"; }), "Phase15 API surface", "Runtime");
    const framework = namespace.getExternalIntelligenceValidationFrameworkState();
    add("Android runtime sees versioned Validation Suites and Golden Dataset", framework.validationSuiteCount >= 8 && framework.goldenCaseCount >= 13, framework, "Validation Framework");
    add("Validation PASS does not grant approval or authority on Android", VERSION_MANIFEST.safety.validationPassEqualsApproval === false && VERSION_MANIFEST.safety.validationPassEqualsAuthorityGrant === false, VERSION_MANIFEST.safety, "Authority");
    add("Gateway Session remains separate from business authority", VERSION_MANIFEST.safety.gatewaySessionEqualsBusinessAuthority === false && VERSION_MANIFEST.safety.corsEqualsAuthentication === false, VERSION_MANIFEST.safety, "Decision 054");
    add("No Android-local Node Gateway dependency was introduced by Phase 15", VERSION_MANIFEST.gateway.gatewayVersion === "1.4.0", VERSION_MANIFEST.gateway.gatewayVersion, "Compatibility");
    add("Validation persistence has an explicit adapter boundary", typeof namespace.createExternalIntelligenceMemoryValidationPersistenceAdapter === "function" && typeof namespace.createExternalIntelligenceLocalStorageValidationPersistenceAdapter === "function" && typeof namespace.setExternalIntelligenceValidationPersistenceAdapter === "function", framework.persistenceAdapterId || "adapter API available", "Persistence");
    add("Android functional validation leaves production persistence on LocalStorage, not Memory", framework.persistenceAdapterId === "EXTERNAL-010-VALIDATION-PERSISTENCE-LOCAL-STORAGE", framework.persistenceAdapterId, "Persistence");
    add("Real Runtime remains distinct from Mock/Functional validation", VERSION_MANIFEST.safety.mockPassEqualsRealRuntimeValidated === false, String(VERSION_MANIFEST.safety.mockPassEqualsRealRuntimeValidated), "Safety");

    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return internal.deepFreeze({ id: internal.nextId("EXTERNAL-010-PHASE15-ANDROID-REAL-DEVICE"), componentId: "EXTERNAL-010", version: VERSION_MANIFEST.release.version, gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion, implementationPhase: VERSION_MANIFEST.release.implementationPhase, passed: passed, failed: failed, total: checks.length, health: checks.length ? Number((passed / checks.length * 100).toFixed(1)) : 0, criticalFailed: failed, status: failed === 0 ? "EXTERNAL-010 Phase 15 Android Real Device Validation PASS" : "EXTERNAL-010 Phase 15 Android Real Device Validation FAIL", releaseAllowed: failed === 0, phase15AndroidRealDeviceComplete: failed === 0, phase15FinalGateReady: failed === 0, androidRealDeviceValidation: { passed: failed === 0, userAgent: ua }, checks: checks, validatedAt: internal.nowIso(), immutable: true });
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase15AndroidValidation: runExternalIntelligencePhase15AndroidValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase15AndroidValidation = { id: "EXTERNAL-010-PHASE15-ANDROID-REAL-DEVICE-VALIDATION", version: MODULE_VERSION, status: "Ready", phase: 15, primaryDecision: "044", supportingDecision: "054", loadedAt: internal.nowIso() };
  global.runExternalIntelligencePhase15AndroidValidation = runExternalIntelligencePhase15AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
