/* ============================================================
   FILE: 17_external_intelligence_phase9_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.8.0
   Phase 09 Android Real Device Validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase9AndroidValidation");

  function add(checks, name, passed, detail, group) {
    checks.push({
      name,
      passed: passed === true,
      detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)),
      group: group || "General",
      severity: "Critical"
    });
  }

  async function runExternalIntelligencePhase9AndroidValidation() {
    const checks = [];
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const regression = await namespace.runExternalIntelligencePhase9Validation();
    const phase8 = await namespace.runExternalIntelligencePhase8AndroidValidation();

    add(checks, "Release Version is Phase 09 compatible or later", VERSION_MANIFEST.isReleaseCompatibleFrom("1.8.0"), VERSION_MANIFEST.release.version, "Foundation");
    add(checks, "Gateway remains compatible at 1.4.0 without Phase 09 changes", VERSION_MANIFEST.gateway.gatewayVersion === "1.4.0", VERSION_MANIFEST.gateway.gatewayVersion, "Boundary");
    add(checks, "Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Environment");
    add(checks, "Fetch API remains available", typeof global.fetch === "function", typeof global.fetch, "Android Environment");
    add(checks, "Web Crypto SHA-256 remains available", Boolean(global.crypto && global.crypto.subtle), Boolean(global.crypto && global.crypto.subtle), "Android Environment");
    add(checks, "Phase 09 regression remains PASS on Android", regression.failed === 0 && regression.health === 100, { passed: regression.passed, failed: regression.failed, total: regression.total }, "Regression");
    add(checks, "Inherited Phase 08 Android real-device gate remains PASS", phase8.failed === 0 && phase8.health === 100 && phase8.phase8FinalGateReady === true, { passed: phase8.passed, failed: phase8.failed, total: phase8.total }, "Inherited Android Gate");
    const staticManifest = phase8.staticManifest || null;
    add(checks, "Static Script Manifest includes Phase 09 scripts", Boolean(staticManifest && staticManifest.scriptCount >= 334 && staticManifest.manifestHash && staticManifest.scriptSetHash), staticManifest || "", "Static Integrity");
    add(checks, "Android retains Temporal Relation history and As-Of query capability", state.temporalRelationVersions.size >= 3 && typeof namespace.reconstructExternalIntelligenceRelationGraphAsOf === "function" && typeof namespace.traverseExternalIntelligenceRelationGraph === "function", state.temporalRelationVersions.size, "Relation");
    add(checks, "Android retains Announcement / Completion as versioned Event states", state.eventVersions.size >= 2 && namespace.listExternalIntelligenceEventHistory("EVENT-PHASE9-ACQUISITION").some(function announced(record) { return record.eventState === "ANNOUNCED"; }) && namespace.listExternalIntelligenceEventHistory("EVENT-PHASE9-ACQUISITION").some(function completed(record) { return record.eventState === "COMPLETED"; }), state.eventVersions.size, "Event");
    add(checks, "Android retains explicit Event to Relation link without automatic activation", state.eventRelationLinks.size >= 1 && Array.from(state.eventRelationLinks.values()).every(function safe(link) { return link.relationAutomaticallyActivated === false && link.relationAutomaticallyEnded === false; }), state.eventRelationLinks.size, "Event Relation Link");
    add(checks, "Android Impact Graph remains multi-stage and candidate-only", state.impactPaths.size >= 1 && Array.from(state.impactPaths.values()).every(function safe(path) { return path.predictionCandidateOnly === true && path.canonicalCausalTruthConfirmed === false && path.automaticActionPerformed === false; }), state.impactPaths.size, "Impact Safety");
    add(checks, "Android Historical Analog / Scenario retain Difference and non-fact boundary", state.historicalAnalogCandidates.size >= 1 && state.scenarioCandidates.size >= 1 && Array.from(state.historicalAnalogCandidates.values()).every(function analog(record) { return record.differenceDimensions.length > 0 && record.historicalAnalogEqualsSameOutcome === false; }) && Array.from(state.scenarioCandidates.values()).every(function scenario(record) { return record.scenarioCandidateEqualsFutureFact === false && record.actionAuthorityGranted === false; }), { analogs: state.historicalAnalogCandidates.size, scenarios: state.scenarioCandidates.size }, "Historical Analog / Scenario");
    add(checks, "Android Intermediate Observation keeps Remaining Lag recalculation candidate-only", state.impactObservations.size >= 1 && Array.from(state.impactObservations.values()).every(function observation(record) { return record.remainingLagRecalculationPerformed === true && record.finalOutcomeConfirmed === false; }), state.impactObservations.size, "Intermediate Observation");
    add(checks, "Direct Repository mutation / automatic Knowledge or Impact action remain prohibited", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false && VERSION_MANIFEST.safety.automaticKnowledgePromotionAllowed === false && VERSION_MANIFEST.safety.impactPathGrantsActionAuthority === false && VERSION_MANIFEST.safety.automaticImpactModelUpdateAllowed === false && VERSION_MANIFEST.safety.aiCandidateGenerationGrantsCanonicalAuthority === false, VERSION_MANIFEST.safety, "Authority Boundary");
    const audit = await namespace.verifyExternalIntelligenceAuditChain();
    add(checks, "Audit chain remains valid after Phase 09 Android validation", audit.valid === true, { eventCount: audit.eventCount, valid: audit.valid }, "Audit");

    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE9-ANDROID-REAL-DEVICE"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed,
      failed,
      total: checks.length,
      health: Number(((passed / checks.length) * 100).toFixed(1)),
      criticalFailed: failed,
      status: failed === 0 ? "EXTERNAL-010 Phase 09 Android Real Device Validation PASS" : "EXTERNAL-010 Phase 09 Android Real Device Validation FAIL",
      releaseAllowed: failed === 0,
      phase9AndroidRealDeviceComplete: failed === 0,
      phase9FinalGateReady: failed === 0,
      androidRealDeviceValidation: {
        passed: failed === 0,
        userAgent,
        phase9RegressionPassed: regression.failed === 0,
        staticIntegrityPassed: Boolean(staticManifest),
        gatewayChangeRequired: false,
        validatedAt: internal.nowIso()
      },
      staticManifest,
      regression: {
        passed: regression.passed,
        failed: regression.failed,
        total: regression.total,
        health: regression.health,
        criticalFailed: regression.criticalFailed,
        status: regression.status
      },
      checks,
      validatedAt: internal.nowIso()
    };
    state.latestPhase9AndroidValidation = internal.deepFreeze(internal.clone(result));
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase9AndroidValidation() {
    return state.latestPhase9AndroidValidation ? internal.clone(state.latestPhase9AndroidValidation) : null;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase9AndroidValidation, getLatestExternalIntelligencePhase9AndroidValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase9AndroidValidation = {
    id: "EXTERNAL-010-PHASE9-ANDROID-REAL-DEVICE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    decisions: ["028", "029"],
    gatewayChangeRequired: false,
    loadedAt: internal.nowIso()
  };
  global.runExternalIntelligencePhase9AndroidValidation = runExternalIntelligencePhase9AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
