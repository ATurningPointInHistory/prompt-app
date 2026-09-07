/* ============================================================
   FILE: 17_external_intelligence_source_discovery.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.2.0
   Phase 03: Staged Source Discovery / Risk-Based Activation
   Decision: 023
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 source discovery blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("sourceDiscovery");
  const LIFECYCLE = VERSION_MANIFEST.discovery.lifecycle.slice();
  const RISK_CLASSES = VERSION_MANIFEST.discovery.riskClasses.slice();
  const TERMINAL_STATES = ["REJECTED", "QUARANTINED", "REVOKED"];

  function upper(value, fallback) {
    return internal.text(value, fallback || "").toUpperCase().replace(/[^A-Z0-9_:-]/g, "_");
  }

  function historyFor(id) {
    if (!state.sourceDiscoveryHistory.has(id)) state.sourceDiscoveryHistory.set(id, []);
    return state.sourceDiscoveryHistory.get(id);
  }

  function storeDiscovery(record) {
    const frozen = internal.deepFreeze(internal.clone(record));
    state.sourceDiscoveryRecords.set(frozen.discoveryId, frozen);
    historyFor(frozen.discoveryId).push(frozen);
    internal.touch();
    return frozen;
  }

  function commitDiscovery(id, patch) {
    const key = internal.text(id, "");
    const current = state.sourceDiscoveryRecords.get(key);
    if (!current) return null;
    const next = Object.assign({}, internal.clone(current), internal.clone(patch || {}), {
      discoveryId: current.discoveryId,
      discoveredAt: current.discoveredAt,
      createdAt: current.createdAt,
      updatedAt: internal.nowIso(),
      activationAuthorityGranted: false,
      registrationAuthorityGranted: false,
      immutable: true
    });
    if (!LIFECYCLE.includes(next.lifecycleState)) return null;
    const contract = namespace.validateExternalIntelligenceContract("sourceDiscoveryRecord", next);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SOURCE-DISCOVERY-RECORD", next);
    if (!contract.valid || !schema.valid) return null;
    return storeDiscovery(next);
  }

  function createExternalIntelligenceSourceDiscovery(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const candidateLocation = internal.text(settings.candidateLocation || settings.candidateUrl || settings.endpoint, "");
    const discoveredBy = internal.text(settings.discoveredBy, "AI Research");
    const discoveryReason = upper(settings.discoveryReason, "AI_RESEARCH");
    const sourceTypeCandidate = upper(settings.sourceTypeCandidate, "OTHER");
    if (!candidateLocation) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_LOCATION_REQUIRED", "Blocked", null);
    const now = internal.nowIso();
    const record = {
      discoveryId: internal.nextId("EXTERNAL-010-SOURCE-DISCOVERY"),
      candidateLocation: candidateLocation,
      discoveredAt: now,
      discoveredBy: discoveredBy,
      discoveryReason: discoveryReason,
      goalId: internal.text(settings.goalId, "") || null,
      planId: internal.text(settings.planId, "") || null,
      sourceTypeCandidate: sourceTypeCandidate,
      lifecycleState: "DISCOVERED",
      identityState: "UNKNOWN",
      riskClassification: "UNKNOWN",
      costClassification: "UNKNOWN",
      authenticationRequirement: "UNKNOWN",
      operationRisk: "UNKNOWN",
      activationAuthorityGranted: false,
      registrationAuthorityGranted: false,
      sourceId: null,
      provenance: {
        searchRankingGrantsTrust: false,
        externalLinkGrantsTrust: false,
        discoveryGrantsNetworkAuthority: false,
        discoveryGrantsSecretAuthority: false,
        discoveryGrantsSubscriptionAuthority: false,
        discoveryGrantsFinancialAuthority: false,
        reasonDetail: internal.text(settings.reasonDetail, "")
      },
      createdAt: now,
      updatedAt: now,
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("sourceDiscoveryRecord", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SOURCE-DISCOVERY-RECORD", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_RECORD_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = storeDiscovery(record);
    return internal.buildResult(true, "EXTERNAL010_SOURCE_DISCOVERY_RECORDED", "Discovered", { discovery: internal.clone(frozen), activationGranted: false, registrationGranted: false });
  }

  function identifyExternalIntelligenceSourceCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = internal.text(settings.discoveryId, "");
    const current = state.sourceDiscoveryRecords.get(id);
    if (!current) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_NOT_FOUND", "Blocked", { discoveryId: id || null });
    if (TERMINAL_STATES.includes(current.lifecycleState)) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_TERMINAL", "Blocked", { discoveryId: id, lifecycleState: current.lifecycleState });
    if (current.lifecycleState !== "DISCOVERED" && current.lifecycleState !== "IDENTIFIED") return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_IDENTIFICATION_ORDER_INVALID", "Blocked", { discoveryId: id, lifecycleState: current.lifecycleState });
    const provider = internal.text(settings.provider, "");
    const canonicalHost = internal.text(settings.canonicalHost, "");
    const identityState = upper(settings.identityState, provider && canonicalHost ? "IDENTIFIED" : "UNVERIFIED");
    const next = commitDiscovery(id, {
      lifecycleState: "IDENTIFIED",
      identityState: identityState,
      identifiedProvider: provider,
      canonicalHost: canonicalHost,
      officialReference: internal.text(settings.officialReference, "") || null,
      httpsObserved: settings.httpsObserved === true
    });
    if (!next) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_IDENTIFICATION_FAILED", "Failed", { discoveryId: id });
    return internal.buildResult(true, "EXTERNAL010_SOURCE_DISCOVERY_IDENTIFIED", "Identified", { discovery: internal.clone(next), trustGranted: false });
  }

  function setExternalIntelligenceSourceRiskAssessmentHook(hook) {
    if (hook == null) {
      state.sourceRiskAssessmentHook = null;
      internal.touch();
      return internal.buildResult(true, "EXTERNAL010_SOURCE_RISK_HOOK_RESET", "Ready", { configured: false });
    }
    if (!hook || typeof hook.assess !== "function") return internal.buildResult(false, "EXTERNAL010_SOURCE_RISK_HOOK_INVALID", "Blocked", null);
    state.sourceRiskAssessmentHook = hook;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SOURCE_RISK_HOOK_SET", "Ready", { configured: true, hookId: internal.text(hook.hookId, "custom") });
  }

  function normalizeAssessment(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const risk = upper(settings.riskClassification, "UNKNOWN");
    return {
      riskClassification: RISK_CLASSES.includes(risk) ? risk : "UNKNOWN",
      networkRisk: upper(settings.networkRisk, "UNKNOWN"),
      payloadRisk: upper(settings.payloadRisk, "UNKNOWN"),
      promptInjectionRisk: upper(settings.promptInjectionRisk, "UNKNOWN"),
      authenticationRisk: upper(settings.authenticationRisk, "UNKNOWN"),
      costRisk: upper(settings.costRisk, "UNKNOWN"),
      operationRisk: upper(settings.operationRisk, "UNKNOWN"),
      dataUploadRisk: upper(settings.dataUploadRisk, "NONE"),
      financialCapabilityRisk: upper(settings.financialCapabilityRisk, "NONE"),
      unknownProviderRisk: upper(settings.unknownProviderRisk, "UNKNOWN"),
      costClassification: upper(settings.costClassification, "UNKNOWN"),
      authenticationRequirement: upper(settings.authenticationRequirement, "UNKNOWN"),
      assessmentEvidenceIds: internal.unique(settings.assessmentEvidenceIds),
      assessedBy: internal.text(settings.assessedBy, "AI / Validation")
    };
  }

  async function assessExternalIntelligenceSourceCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = internal.text(settings.discoveryId, "");
    const current = state.sourceDiscoveryRecords.get(id);
    if (!current) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_NOT_FOUND", "Blocked", { discoveryId: id || null });
    if (current.lifecycleState !== "IDENTIFIED" && current.lifecycleState !== "ASSESSED") return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_ASSESSMENT_ORDER_INVALID", "Blocked", { discoveryId: id, lifecycleState: current.lifecycleState });
    let assessment = normalizeAssessment(settings);
    if (state.sourceRiskAssessmentHook) {
      try {
        const hooked = await state.sourceRiskAssessmentHook.assess({ discovery: internal.clone(current), proposedAssessment: internal.clone(assessment) });
        if (internal.isPlainObject(hooked)) assessment = normalizeAssessment(Object.assign({}, assessment, hooked));
      } catch (error) {
        return internal.buildResult(false, "EXTERNAL010_SOURCE_RISK_HOOK_FAILED", "Failed", { discoveryId: id }, { error: { message: error && error.message || String(error), category: "Source Assessment" } });
      }
    }
    const next = commitDiscovery(id, Object.assign({}, assessment, { lifecycleState: "ASSESSED", assessedAt: internal.nowIso() }));
    if (!next) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_ASSESSMENT_FAILED", "Failed", { discoveryId: id });
    return internal.buildResult(true, "EXTERNAL010_SOURCE_DISCOVERY_ASSESSED", "Assessed", { discovery: internal.clone(next), activationGranted: false, registrationGranted: false, highRiskRequiresExplicitApproval: next.riskClassification === "HIGH" });
  }

  function createExternalIntelligenceControlledInspection(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = internal.text(settings.discoveryId, "");
    const current = state.sourceDiscoveryRecords.get(id);
    if (!current) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_NOT_FOUND", "Blocked", { discoveryId: id || null });
    if (TERMINAL_STATES.includes(current.lifecycleState)) return internal.buildResult(false, "EXTERNAL010_CONTROLLED_INSPECTION_SOURCE_BLOCKED", "Blocked", { discoveryId: id, lifecycleState: current.lifecycleState });
    const record = internal.deepFreeze({
      inspectionId: internal.nextId("EXTERNAL-010-CONTROLLED-INSPECTION"),
      discoveryId: id,
      inspectionPurpose: internal.text(settings.inspectionPurpose, "Source Assessment"),
      networkAuthorityGranted: false,
      activationAuthorityGranted: false,
      contentInstructionAuthorityGranted: false,
      securityBoundaryRequired: true,
      state: "CONTRACT_ONLY",
      requestedMethod: upper(settings.requestedMethod, "GET"),
      requestedLocation: current.candidateLocation,
      ordinaryAcquisitionSource: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const contract = namespace.validateExternalIntelligenceContract("controlledInspectionRecord", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-CONTROLLED-INSPECTION-RECORD", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_CONTROLLED_INSPECTION_INVALID", "Blocked", { contract: contract, schema: schema });
    state.controlledInspectionRecords.set(record.inspectionId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CONTROLLED_INSPECTION_CONTRACT_CREATED", "Candidate", { inspection: internal.clone(record), activationGranted: false, networkExecutionPerformed: false });
  }

  function getExternalIntelligenceSourceDiscovery(id) {
    const record = state.sourceDiscoveryRecords.get(internal.text(id, ""));
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceSourceDiscoveries(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    return Array.from(state.sourceDiscoveryRecords.values()).filter(function filter(record) {
      if (settings.lifecycleState && record.lifecycleState !== upper(settings.lifecycleState, "")) return false;
      if (settings.riskClassification && record.riskClassification !== upper(settings.riskClassification, "")) return false;
      return true;
    }).map(internal.clone);
  }

  function getExternalIntelligenceSourceDiscoveryHistory(id) {
    const values = state.sourceDiscoveryHistory.get(internal.text(id, "")) || [];
    return values.map(internal.clone);
  }

  function changeDiscoveryState(input, target) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = internal.text(settings.discoveryId, "");
    const current = state.sourceDiscoveryRecords.get(id);
    if (!current) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_NOT_FOUND", "Blocked", { discoveryId: id || null });
    const next = commitDiscovery(id, { lifecycleState: target, dispositionReason: internal.text(settings.reason, target) });
    if (!next) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_STATE_CHANGE_FAILED", "Failed", { discoveryId: id, target: target });
    return internal.buildResult(true, "EXTERNAL010_SOURCE_DISCOVERY_" + target, target, { discovery: internal.clone(next), historicalEvidenceDeletionPerformed: false });
  }

  function quarantineExternalIntelligenceSourceCandidate(input) { return changeDiscoveryState(input, "QUARANTINED"); }
  function rejectExternalIntelligenceSourceCandidate(input) { return changeDiscoveryState(input, "REJECTED"); }

  function initializeExternalIntelligenceSourceDiscovery() {
    namespace.modules.sourceDiscovery.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_SOURCE_DISCOVERY_INITIALIZED", "Ready", {
      lifecycle: LIFECYCLE.slice(),
      riskClasses: RISK_CLASSES.slice(),
      aiMayDiscoverSourceCandidate: true,
      aiMayAssessSourceCandidate: true,
      discoveryGrantsActivationAuthority: false,
      controlledInspectionAvailable: true
    });
  }

  internal.markExternalSourceDiscoveryLifecycle = function markDiscoveryLifecycle(discoveryId, lifecycleState, registeredSourceId) {
    const id = internal.text(discoveryId, "");
    const current = state.sourceDiscoveryRecords.get(id);
    if (!current || !LIFECYCLE.includes(lifecycleState)) return null;
    return commitDiscovery(id, { lifecycleState: lifecycleState, sourceId: internal.text(registeredSourceId, "") || current.sourceId || null });
  };

  Object.assign(namespace.api, {
    initializeExternalIntelligenceSourceDiscovery: initializeExternalIntelligenceSourceDiscovery,
    createExternalIntelligenceSourceDiscovery: createExternalIntelligenceSourceDiscovery,
    identifyExternalIntelligenceSourceCandidate: identifyExternalIntelligenceSourceCandidate,
    assessExternalIntelligenceSourceCandidate: assessExternalIntelligenceSourceCandidate,
    setExternalIntelligenceSourceRiskAssessmentHook: setExternalIntelligenceSourceRiskAssessmentHook,
    createExternalIntelligenceControlledInspection: createExternalIntelligenceControlledInspection,
    getExternalIntelligenceSourceDiscovery: getExternalIntelligenceSourceDiscovery,
    listExternalIntelligenceSourceDiscoveries: listExternalIntelligenceSourceDiscoveries,
    getExternalIntelligenceSourceDiscoveryHistory: getExternalIntelligenceSourceDiscoveryHistory,
    quarantineExternalIntelligenceSourceCandidate: quarantineExternalIntelligenceSourceCandidate,
    rejectExternalIntelligenceSourceCandidate: rejectExternalIntelligenceSourceCandidate
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.sourceDiscovery = {
    id: "EXTERNAL-010-SOURCE-DISCOVERY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    stagedLifecycle: true,
    riskBasedActivation: true,
    discoveryGrantsAuthority: false,
    controlledInspectionGrantsActivation: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
