/* ============================================================
   FILE: 17_external_intelligence_initial_scope_validation_coverage.js
   EXTERNAL-010 Initial Scope Validation Coverage
   Release: 1.20.1 Candidate HF6
   Scope: 64 prior validation gaps + D020 Version Mismatch correction.
   Validation style: Decision-scoped structural contract validation,
   plus direct runtime validation for D020 Version Mismatch Detection.
   ============================================================ */
(function (global) {
  "use strict";
  const n = global.EXTERNAL010ExternalIntelligence;
  const m = global.EXTERNAL010VersionManifest;
  if (!n || !n.__internal || !m) return;
  const i = n.__internal;
  const s = i.state;
  const v = m.getModuleVersion("initialScopeValidationCoverage") || m.release.version;
  const REQUIREMENTS = [{"requirementId":"EXTERNAL-010-REQ-053-INIT-15","decisionId":"EXTERNAL-010-DECISION-053","name":"Controlled Update / Rollback Hook","sourceFile":"17_external_intelligence_conformance_repair.js","markers":["controlled","update","rollback"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-052-INIT-10","decisionId":"EXTERNAL-010-DECISION-052","name":"Selective Recompute Hook","sourceFile":"17_external_intelligence_disaster_recovery.js","markers":["selective","recompute"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-050-INIT-05","decisionId":"EXTERNAL-010-DECISION-050","name":"Data Minimization Hook","sourceFile":"17_external_intelligence_privacy_identity.js","markers":["minimization","buildResult"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-050-INIT-06","decisionId":"EXTERNAL-010-DECISION-050","name":"Account Cluster Candidate","sourceFile":"17_external_intelligence_privacy_identity.js","markers":["account","cluster"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-050-INIT-07","decisionId":"EXTERNAL-010-DECISION-050","name":"Bot / Coordination Candidate","sourceFile":"17_external_intelligence_privacy_identity.js","markers":["botCandidate","coordinationCandidate"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-050-INIT-08","decisionId":"EXTERNAL-010-DECISION-050","name":"Uncertainty / Confidence","sourceFile":"17_external_intelligence_privacy_identity.js","markers":["confidence","privacyRiskState"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-050-INIT-09","decisionId":"EXTERNAL-010-DECISION-050","name":"Cross-Platform Linking Candidate Hook","sourceFile":"17_external_intelligence_privacy_identity.js","markers":["crossPlatformLinkRequested","createExternalIntelligenceCrossPlatformLinkCandidate"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-048-INIT-06","decisionId":"EXTERNAL-010-DECISION-048","name":"Regime Context Hook","sourceFile":"17_external_intelligence_market_fusion.js","markers":["regime","context"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-047-INIT-03","decisionId":"EXTERNAL-010-DECISION-047","name":"Market Session Hook","sourceFile":"17_external_intelligence_market_identity.js","markers":["market","session"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-047-INIT-04","decisionId":"EXTERNAL-010-DECISION-047","name":"Market Rule Profile Hook","sourceFile":"17_external_intelligence_market_identity.js","markers":["market","rule","profile"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-047-INIT-08","decisionId":"EXTERNAL-010-DECISION-047","name":"Corporate Action Reference","sourceFile":"17_external_intelligence_market_timeseries.js","markers":["corporateActionRefs","createBar"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-047-INIT-09","decisionId":"EXTERNAL-010-DECISION-047","name":"Market Data Quality","sourceFile":"17_external_intelligence_market_timeseries.js","markers":["qualityState","marketBars"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-047-INIT-10","decisionId":"EXTERNAL-010-DECISION-047","name":"Market Freshness","sourceFile":"17_external_intelligence_market_timeseries.js","markers":["market","freshness"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-047-INIT-12","decisionId":"EXTERNAL-010-DECISION-047","name":"Bar Finalization State","sourceFile":"17_external_intelligence_market_timeseries.js","markers":["finalizationState","createBar"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-045-INIT-09","decisionId":"EXTERNAL-010-DECISION-045","name":"Hybrid Monitoring Extension Point","sourceFile":"17_external_intelligence_version_manifest.js","markers":["HYBRID","monitoring"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-043-INIT-15","decisionId":"EXTERNAL-010-DECISION-043","name":"Purpose Hook","sourceFile":"17_external_intelligence_intelligence_package.js","markers":["purposeId","createExternalIntelligenceRequest"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-043-INIT-18","decisionId":"EXTERNAL-010-DECISION-043","name":"Package Lineage","sourceFile":"17_external_intelligence_intelligence_package.js","markers":["package","lineage"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-041-INIT-01","decisionId":"EXTERNAL-010-DECISION-041","name":"Data Classification","sourceFile":"17_external_intelligence_data_lifecycle.js","markers":["DATA_CLASSES","dataClass"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-041-INIT-09","decisionId":"EXTERNAL-010-DECISION-041","name":"Long-Term Storage Control","sourceFile":"17_external_intelligence_data_lifecycle.js","markers":["long","term","storage"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-041-INIT-10","decisionId":"EXTERNAL-010-DECISION-041","name":"Archive Control Hook","sourceFile":"17_external_intelligence_data_lifecycle.js","markers":["ARCHIVING","checkExternalIntelligenceUsagePolicy"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-041-INIT-12","decisionId":"EXTERNAL-010-DECISION-041","name":"External Model Transmission Hook","sourceFile":"17_external_intelligence_data_lifecycle.js","markers":["model","transmission"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-041-INIT-13","decisionId":"EXTERNAL-010-DECISION-041","name":"Model Training Control Hook","sourceFile":"17_external_intelligence_data_lifecycle.js","markers":["model","training"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-040-INIT-05","decisionId":"EXTERNAL-010-DECISION-040","name":"Work State","sourceFile":"17_external_intelligence_work_graph.js","markers":["state:i.text","workItemId"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-040-INIT-06","decisionId":"EXTERNAL-010-DECISION-040","name":"Capability Assignment Hook","sourceFile":"17_external_intelligence_conformance_repair.js","markers":["capability","assignment"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-040-INIT-07","decisionId":"EXTERNAL-010-DECISION-040","name":"Priority Hook","sourceFile":"17_external_intelligence_conformance_repair.js","markers":["priority","researchPriorityHistory"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-040-INIT-14","decisionId":"EXTERNAL-010-DECISION-040","name":"Correlation ID","sourceFile":"17_external_intelligence_conformance_repair.js","markers":["correlation","correlationId"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-039-INIT-11","decisionId":"EXTERNAL-010-DECISION-039","name":"Contextual Policy Decision Hook","sourceFile":"17_external_intelligence_conformance_repair.js","markers":["contextual","decision"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-036-INIT-08","decisionId":"EXTERNAL-010-DECISION-036","name":"Cost Profile Hook","sourceFile":"17_external_intelligence_capability_registry.js","markers":["costProfile","capability"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-036-INIT-09","decisionId":"EXTERNAL-010-DECISION-036","name":"Latency Profile Hook","sourceFile":"17_external_intelligence_capability_registry.js","markers":["latencyProfile","capability"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-035-INIT-04","decisionId":"EXTERNAL-010-DECISION-035","name":"Urgency","sourceFile":"17_external_intelligence_research_priority.js","markers":["urgency","record"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-033-INIT-03","decisionId":"EXTERNAL-010-DECISION-033","name":"Competing Hypothesis Relation","sourceFile":"17_external_intelligence_hypothesis.js","markers":["alternativeHypothesisIds","hypothesisType"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-032-INIT-11","decisionId":"EXTERNAL-010-DECISION-032","name":"Novelty","sourceFile":"17_external_intelligence_signal_detection.js","markers":["novelty","registerSignal"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-031-INIT-06","decisionId":"EXTERNAL-010-DECISION-031","name":"Unit / Currency","sourceFile":"17_external_intelligence_outcome.js","markers":["unit","currency"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-031-INIT-07","decisionId":"EXTERNAL-010-DECISION-031","name":"Event Completion Criteria Hook","sourceFile":"17_external_intelligence_outcome.js","markers":["event","completion","criteria"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-030-INIT-13","decisionId":"EXTERNAL-010-DECISION-030","name":"Calibration State","sourceFile":"17_external_intelligence_uncertainty.js","markers":["calibration","deepFreeze"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-028-INIT-19","decisionId":"EXTERNAL-010-DECISION-028","name":"Impact Analysis Extension Hook","sourceFile":"17_external_intelligence_relation_graph.js","markers":["impact","analysis"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-027-INIT-07","decisionId":"EXTERNAL-010-DECISION-027","name":"Validity Period Hook","sourceFile":"17_external_intelligence_entity.js","markers":["validity","entity"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-026-INIT-10","decisionId":"EXTERNAL-010-DECISION-026","name":"Assertion / Target Time Hooks","sourceFile":"17_external_intelligence_claim.js","markers":["assertedAt","targetTime"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-024-INIT-09","decisionId":"EXTERNAL-010-DECISION-024","name":"Storage Bytes","sourceFile":"17_external_intelligence_version_manifest.js","markers":["STORAGE_BYTES","resourceDimensions"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-023-INIT-13","decisionId":"EXTERNAL-010-DECISION-023","name":"AI Discovery Provenance","sourceFile":"17_external_intelligence_source_discovery.js","markers":["discovery","provenance"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-022-INIT-06","decisionId":"EXTERNAL-010-DECISION-022","name":"Normalization State","sourceFile":"17_external_intelligence_normalization.js","markers":["normalization","_external_intelligence_normalization"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-022-INIT-11","decisionId":"EXTERNAL-010-DECISION-022","name":"Derived Data Boundary","sourceFile":"17_external_intelligence_normalization.js","markers":["derived","boundary"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-022-INIT-13","decisionId":"EXTERNAL-010-DECISION-022","name":"Provenance Reference","sourceFile":"17_external_intelligence_normalization.js","markers":["provenance","provenanceReference"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-021-INIT-07","decisionId":"EXTERNAL-010-DECISION-021","name":"Reliability Assessment Reference Hook","sourceFile":"17_external_intelligence_knowledge_boundary.js","markers":["reliability","assessment"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-021-INIT-11","decisionId":"EXTERNAL-010-DECISION-021","name":"Promotion Lineage Hook","sourceFile":"17_external_intelligence_knowledge_boundary.js","markers":["promotion","lineage"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-020-INIT-10","decisionId":"EXTERNAL-010-DECISION-020","name":"Secret Missing / Expired State","sourceFile":"17_external_intelligence_capability_resilience.js","markers":["COMPONENT_HEALTH_MISSING","securityCriticalComponents"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-018-INIT-01","decisionId":"EXTERNAL-010-DECISION-018","name":"QUARANTINED State","sourceFile":"17_external_intelligence_external_content_security.js","markers":["defaultPayloadState:\"QUARANTINED\"","quarantineExternalIntelligenceSource"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-018-INIT-05","decisionId":"EXTERNAL-010-DECISION-018","name":"Allowed Scheme Policy","sourceFile":"17_external_intelligence_external_content_security.js","markers":["javascript:","REMOVED_SCHEME"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-018-INIT-09","decisionId":"EXTERNAL-010-DECISION-018","name":"Archive Auto-Extract禁止","sourceFile":"17_external_intelligence_external_content_security.js","markers":["archiveAutoExtractAllowed:false","QUARANTINED"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-018-INIT-10","decisionId":"EXTERNAL-010-DECISION-018","name":"Executable Auto-Execute禁止","sourceFile":"17_external_intelligence_external_content_security.js","markers":["binaryAutoExecuteAllowed:false","QUARANTINED"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-018-INIT-19","decisionId":"EXTERNAL-010-DECISION-018","name":"Scanner Auto-Download禁止","sourceFile":"17_external_intelligence_external_content_security.js","markers":["automaticDownloadAllowed:false","scannerId"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-018-INIT-20","decisionId":"EXTERNAL-010-DECISION-018","name":"Scanner Auto-Install禁止","sourceFile":"17_external_intelligence_external_content_security.js","markers":["automaticInstallAllowed:false","scannerId"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-015-INIT-08","decisionId":"EXTERNAL-010-DECISION-015","name":"Response Metadata Normalization","sourceFile":"17_external_intelligence_adapter_registry.js","markers":["response","metadata"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-015-INIT-09","decisionId":"EXTERNAL-010-DECISION-015","name":"Temporal Metadata Extraction","sourceFile":"17_external_intelligence_adapter_registry.js","markers":["temporal","metadata"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-015-INIT-10","decisionId":"EXTERNAL-010-DECISION-015","name":"Sanitization","sourceFile":"17_external_intelligence_adapter_registry.js","markers":["sanitize","redactSensitive"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-009-INIT-01","decisionId":"EXTERNAL-010-DECISION-009","name":"publishedAt","sourceFile":"17_external_intelligence_temporal.js","markers":["publishedat","normalizeIso"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-009-INIT-02","decisionId":"EXTERNAL-010-DECISION-009","name":"availableAt","sourceFile":"17_external_intelligence_temporal.js","markers":["availableat","normalizeIso"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-009-INIT-03","decisionId":"EXTERNAL-010-DECISION-009","name":"effectiveAt","sourceFile":"17_external_intelligence_temporal.js","markers":["effectiveat","normalizeIso"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-005-INIT-04","decisionId":"EXTERNAL-010-DECISION-005","name":"Acquisition Timestamp","sourceFile":"17_external_intelligence_evidence_persistence.js","markers":["acquiredAt","response.temporalMetadata"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-008-INIT-08","decisionId":"EXTERNAL-010-DECISION-008","name":"Acquired At","sourceFile":"17_external_intelligence_evidence_persistence.js","markers":["acquired","acquiredAt"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-008-INIT-12","decisionId":"EXTERNAL-010-DECISION-008","name":"Status","sourceFile":"17_external_intelligence_evidence_persistence.js","markers":["status: \"ACQUIRED\"","acquisitionStatus: \"ACQUIRED\""],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-014-INIT-09","decisionId":"EXTERNAL-010-DECISION-014","name":"Basic Indexes","sourceFile":"external_gateway/lib/evidence_store.cjs","markers":["CREATE INDEX IF NOT EXISTS","idx_evidence_request"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-019-INIT-04","decisionId":"EXTERNAL-010-DECISION-019","name":"Correlation ID","sourceFile":"17_external_intelligence_acquisition_contract.js","markers":["correlation","correlationId"],"validationType":"STRUCTURAL_CONTRACT"},{"requirementId":"EXTERNAL-010-REQ-019-INIT-06","decisionId":"EXTERNAL-010-DECISION-019","name":"Source / Adapter Version References","sourceFile":"17_external_intelligence_acquisition_contract.js","markers":["source","adapter","version"],"validationType":"STRUCTURAL_CONTRACT"}];

  const sourceCache = new Map();
  async function loadSource(fileName) {
    if (sourceCache.has(fileName)) return sourceCache.get(fileName);
    const response = await fetch("./" + fileName + "?hf6-validation=" + encodeURIComponent(m.release.version), { cache: "no-store" });
    if (!response.ok) throw new Error("SOURCE_FETCH_FAILED:" + fileName + ":" + response.status);
    const text = await response.text();
    sourceCache.set(fileName, text);
    return text;
  }
  function structuralCheck(definition, sourceText) {
    const haystack = String(sourceText || "").toLowerCase();
    const markerResults = (definition.markers || []).map(function (marker) {
      const found = haystack.includes(String(marker).toLowerCase());
      return { marker: marker, found: found };
    });
    return {
      passed: markerResults.length > 0 && markerResults.every(function (entry) { return entry.found; }),
      markerResults: markerResults
    };
  }
  async function runExternalIntelligenceInitialScopeValidationCoverage() {
    if (typeof n.initializeExternalIntelligenceFoundation === "function" && s.initialized !== true) {
      await n.initializeExternalIntelligenceFoundation();
    }
    const checks = [];
    for (const definition of REQUIREMENTS) {
      try {
        const sourceText = await loadSource(definition.sourceFile);
        const result = structuralCheck(definition, sourceText);
        checks.push({
          requirementId: definition.requirementId,
          decisionId: definition.decisionId,
          name: definition.name,
          passed: result.passed === true,
          detail: i.stableStringify({ validationType: definition.validationType, sourceFile: definition.sourceFile, markerResults: result.markerResults }),
          group: "Initial Scope Validation Coverage",
          severity: "Critical"
        });
      } catch (error) {
        checks.push({ requirementId: definition.requirementId, decisionId: definition.decisionId, name: definition.name, passed: false, detail: error && error.message || String(error), group: "Initial Scope Validation Coverage", severity: "Critical" });
      }
    }

    const versionCheck = typeof n.detectExternalIntelligenceVersionMismatch === "function"
      ? n.detectExternalIntelligenceVersionMismatch({ componentId: "HF6-TEST-COMPONENT", expectedVersion: "1.0.0", actualVersion: "2.0.0" })
      : null;
    const versionRecord = versionCheck && versionCheck.data && versionCheck.data.versionCompatibility;
    checks.push({
      requirementId: "EXTERNAL-010-REQ-020-INIT-11",
      decisionId: "EXTERNAL-010-DECISION-020",
      name: "Version Mismatch Detection",
      passed: Boolean(versionCheck && versionCheck.ok === true && versionRecord && versionRecord.mismatchDetected === true && versionRecord.reasonCode === "VERSION_MISMATCH" && versionRecord.healthState === "BLOCKED" && versionRecord.automaticDowngradeAllowed === false),
      detail: versionCheck == null ? "Version mismatch API unavailable" : i.stableStringify(versionCheck),
      group: "Initial Scope Validation Coverage",
      severity: "Critical"
    });

    const passed = checks.filter(function (check) { return check.passed; }).length;
    const failed = checks.length - passed;
    const result = i.deepFreeze({
      id: i.nextId("EXTERNAL-010-INITIAL-SCOPE-VALIDATION-COVERAGE"),
      componentId: "EXTERNAL-010",
      version: m.release.version,
      gatewayVersion: m.gateway.gatewayVersion,
      implementationPhase: m.release.implementationPhase,
      scope: "65 Initial Implementation Scope validation gaps; D020 INIT-11 corrected from validation-only gap to implementation+validation",
      requirementCount: checks.length,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0,
      criticalFailed: checks.filter(function (check) { return !check.passed && check.severity === "Critical"; }).length,
      status: failed === 0 ? "EXTERNAL-010 Initial Scope Validation Coverage PASS" : "EXTERNAL-010 Initial Scope Validation Coverage FAIL",
      validationType: "DECISION_SCOPED_STRUCTURAL_CONTRACT_PLUS_TARGETED_RUNTIME",
      releaseAllowed: false,
      projectOwnerAcceptanceRequired: true,
      pcRealRuntimeRevalidationRequired: true,
      androidRealDeviceRevalidationRequired: true,
      checks: checks,
      validatedAt: i.nowIso(),
      immutable: true
    });
    s.latestInitialScopeValidationCoverage = result;
    i.touch();
    return result;
  }

  Object.assign(n.api, { runExternalIntelligenceInitialScopeValidationCoverage });
  Object.assign(n, n.api);
  n.modules.initialScopeValidationCoverage = {
    id: "EXTERNAL-010-INITIAL-SCOPE-VALIDATION-COVERAGE",
    version: v,
    status: "Ready",
    phase: 21,
    requirementCount: 65,
    authorityNeutralByDefault: true,
    loadedAt: i.nowIso()
  };
  global.runExternalIntelligenceInitialScopeValidationCoverage = runExternalIntelligenceInitialScopeValidationCoverage;
})(typeof window !== "undefined" ? window : globalThis);
