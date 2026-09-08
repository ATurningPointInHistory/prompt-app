/* ============================================================
   FILE: 17_external_intelligence_phase9_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.8.0
   Phase 09 PC Real Runtime Validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase9RealRuntimeValidation");

  function add(checks, name, passed, detail, group) {
    checks.push({
      name,
      passed: passed === true,
      detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)),
      group: group || "General",
      severity: "Critical"
    });
  }

  async function runExternalIntelligencePhase9PcRealRuntimeValidation() {
    const checks = [];
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const regression = await namespace.runExternalIntelligencePhase9Validation();

    add(checks, "Release Version is Phase 09 compatible or later", VERSION_MANIFEST.isReleaseCompatibleFrom("1.8.0"), VERSION_MANIFEST.release.version, "Foundation");
    add(checks, "Gateway remains compatible at 1.4.0 without Phase 09 changes", VERSION_MANIFEST.gateway.gatewayVersion === "1.4.0", VERSION_MANIFEST.gateway.gatewayVersion, "Boundary");
    add(checks, "Runtime is not Android", !/Android/i.test(userAgent), userAgent, "PC Environment");
    add(checks, "Application document is loaded", typeof document !== "undefined" && document.readyState !== "loading", typeof document !== "undefined" ? document.readyState : "none", "PC Environment");
    add(checks, "Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle), Boolean(global.crypto && global.crypto.subtle), "PC Environment");
    add(checks, "Phase 09 regression remains PASS on PC runtime", regression.failed === 0 && regression.health === 100, { passed: regression.passed, failed: regression.failed, total: regression.total }, "Regression");
    add(checks, "PC runtime contains versioned Temporal Relation history", state.temporalRelationVersions.size >= 3 && namespace.listExternalIntelligenceTemporalRelationHistory("REL-PHASE9-A-B").length >= 2, state.temporalRelationVersions.size, "Relation");
    add(checks, "PC runtime contains versioned Event State history", state.eventVersions.size >= 2 && namespace.listExternalIntelligenceEventHistory("EVENT-PHASE9-ACQUISITION").some(function completed(record) { return record.eventState === "COMPLETED"; }), state.eventVersions.size, "Event");
    add(checks, "PC runtime contains explicit Event to Relation link", state.eventRelationLinks.size >= 1, state.eventRelationLinks.size, "Event Relation Link");
    add(checks, "PC runtime contains multi-stage Impact Edge / Path model", state.impactEdges.size >= 2 && state.impactPaths.size >= 1 && Array.from(state.impactPaths.values()).some(function path(record) { return record.edgeIds.length >= 2 && record.stages.length >= 3; }), { edges: state.impactEdges.size, paths: state.impactPaths.size }, "Impact");
    add(checks, "PC runtime contains Intermediate Observation / Remaining Lag state", state.impactObservations.size >= 1 && Array.from(state.impactObservations.values()).some(function observed(record) { return record.remainingLagRecalculationPerformed === true; }), state.impactObservations.size, "Impact Observation");
    add(checks, "PC runtime contains Historical Analog and Scenario Candidates", state.historicalAnalogCandidates.size >= 1 && state.scenarioCandidates.size >= 1, { analogs: state.historicalAnalogCandidates.size, scenarios: state.scenarioCandidates.size }, "Historical Analog / Scenario");
    add(checks, "PC runtime preserves causal / action authority boundary", Array.from(state.impactEdges.values()).every(function safe(edge) { return edge.causalTruthConfirmed === false && edge.actionAuthorityGranted === false && edge.financialAuthorityGranted === false; }) && VERSION_MANIFEST.safety.automaticKnowledgePromotionAllowed === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, "candidate-only", "Authority Boundary");
    const audit = await namespace.verifyExternalIntelligenceAuditChain();
    add(checks, "Audit chain remains valid on PC runtime", audit.valid === true, { eventCount: audit.eventCount, valid: audit.valid }, "Audit");

    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE9-PC-REAL-RUNTIME"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed,
      failed,
      total: checks.length,
      health: Number(((passed / checks.length) * 100).toFixed(1)),
      criticalFailed: failed,
      status: failed === 0 ? "EXTERNAL-010 Phase 09 PC Real Runtime Validation PASS" : "EXTERNAL-010 Phase 09 PC Real Runtime Validation FAIL",
      releaseAllowed: failed === 0,
      phase9PcRealRuntimeComplete: failed === 0,
      pcRealRuntimeValidation: {
        passed: failed === 0,
        userAgent,
        phase9RegressionPassed: regression.failed === 0,
        gatewayChangeRequired: false,
        validatedAt: internal.nowIso()
      },
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
    state.latestPhase9PcRealRuntimeValidation = internal.deepFreeze(internal.clone(result));
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase9PcRealRuntimeValidation() {
    return state.latestPhase9PcRealRuntimeValidation ? internal.clone(state.latestPhase9PcRealRuntimeValidation) : null;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase9PcRealRuntimeValidation, getLatestExternalIntelligencePhase9PcRealRuntimeValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase9RealRuntimeValidation = {
    id: "EXTERNAL-010-PHASE9-PC-REAL-RUNTIME",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    decisions: ["028", "029"],
    gatewayChangeRequired: false,
    loadedAt: internal.nowIso()
  };
  global.runExternalIntelligencePhase9PcRealRuntimeValidation = runExternalIntelligencePhase9PcRealRuntimeValidation;
})(typeof window !== "undefined" ? window : globalThis);
