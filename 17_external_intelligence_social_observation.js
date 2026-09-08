/* ============================================================
   FILE: 17_external_intelligence_social_observation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.12.0
   Phase 13: Social Observation / Social Acquisition Governance
   Primary Decision: 034
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("socialObservation");
  const SOCIAL_TYPES = new Set(VERSION_MANIFEST.socialIntelligence.sourceTypes || []);
  const CONTENT_TYPES = new Set(VERSION_MANIFEST.socialIntelligence.contentTypes || []);
  const RUMOR_STATES = new Set(VERSION_MANIFEST.socialIntelligence.rumorStates || []);
  ["socialObservations", "oldInformationResurgences"].forEach(function (key) { if (!(state[key] instanceof Map)) state[key] = new Map(); });

  function validateRecord(contractKey, schemaId, record) {
    const contract = namespace.validateExternalIntelligenceContract(contractKey, record);
    const schema = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return contract.valid && schema.valid ? null : { contract: contract, schema: schema };
  }
  function sourceCheck(sourceId) {
    const source = state.sourceRegistry.get(internal.text(sourceId, ""));
    if (!source) return { ok: false, code: "EXTERNAL010_SOCIAL_SOURCE_REQUIRED" };
    if (!SOCIAL_TYPES.has(source.sourceType)) return { ok: false, code: "EXTERNAL010_SOCIAL_SOURCE_TYPE_REQUIRED", sourceType: source.sourceType };
    return { ok: true, source: source };
  }
  function linkLineage(inputReferenceIds, outputReferenceId, relationType) {
    const refs = internal.unique(inputReferenceIds || []).filter(Boolean);
    if (!refs.length || typeof namespace.createExternalIntelligenceLineageRecord !== "function") return { ok: true, lineageRecords: [] };
    const results = refs.map(function (referenceId) {
      return namespace.createExternalIntelligenceLineageRecord({
        inputReferenceId: referenceId,
        outputReferenceId: outputReferenceId,
        relationType: relationType || "DERIVED_FROM",
        lineageState: "ACTIVE"
      });
    });
    return { ok: results.every(function (item) { return item && item.ok === true; }), lineageRecords: results.map(function (item) { return item && item.data && item.data.lineageRecord; }).filter(Boolean), results: results };
  }

  function checkExternalIntelligenceSocialAcquisitionGovernance(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const sourceId = internal.text(settings.sourceId || settings.platformSourceId, "");
    const source = sourceCheck(sourceId);
    if (!source.ok) return internal.buildResult(false, source.code, "Blocked", source);
    const operation = internal.text(settings.operation, "READ").toUpperCase();
    if (typeof namespace.resolveExternalIntelligenceSourceForOperation !== "function") {
      return internal.buildResult(false, "EXTERNAL010_SOCIAL_SOURCE_GOVERNANCE_UNAVAILABLE", "Blocked", { sourceId: sourceId });
    }
    const sourceGate = namespace.resolveExternalIntelligenceSourceForOperation({ sourceId: sourceId, operation: operation });
    if (!sourceGate || sourceGate.ok !== true) {
      return internal.buildResult(false, "EXTERNAL010_SOCIAL_USAGE_POLICY_OR_SOURCE_BLOCKED", "Blocked", { sourceId: sourceId, operation: operation, sourceGate: sourceGate });
    }
    if (typeof namespace.checkExternalIntelligenceResourceBudget !== "function") {
      return internal.buildResult(false, "EXTERNAL010_SOCIAL_RESOURCE_BUDGET_UNAVAILABLE", "Blocked", { sourceId: sourceId });
    }
    const budgetGate = namespace.checkExternalIntelligenceResourceBudget({
      sourceId: sourceId,
      goalId: settings.goalId,
      planId: settings.planId,
      requestId: settings.requestId,
      estimatedUsage: internal.isPlainObject(settings.estimatedUsage) ? settings.estimatedUsage : { REQUEST_COUNT: 1 },
      pricingMode: internal.text(settings.pricingMode, source.source.pricingMode || "FREE").toUpperCase(),
      paidRequest: settings.paidRequest === true
    });
    if (!budgetGate || budgetGate.ok !== true) {
      return internal.buildResult(false, "EXTERNAL010_SOCIAL_RESOURCE_BUDGET_BLOCKED", "Blocked", { sourceId: sourceId, operation: operation, sourceGate: sourceGate, budgetGate: budgetGate, priorityMayBypassHardLimit: false });
    }
    return internal.buildResult(true, "EXTERNAL010_SOCIAL_ACQUISITION_GOVERNANCE_PASS", "Ready", {
      sourceId: sourceId,
      operation: operation,
      sourceGate: sourceGate,
      budgetGate: budgetGate,
      usagePolicyChecked: true,
      resourceBudgetChecked: true,
      termsBypassAllowed: false,
      tradingAuthorityGranted: false,
      financialAuthorityGranted: false
    });
  }

  function recordExternalIntelligenceSocialObservation(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const sourceState = sourceCheck(source.platformSourceId);
    if (!sourceState.ok) return internal.buildResult(false, sourceState.code, "Blocked", sourceState);
    const contentType = internal.text(source.contentType, "UNKNOWN").toUpperCase();
    if (!CONTENT_TYPES.has(contentType)) return internal.buildResult(false, "EXTERNAL010_SOCIAL_CONTENT_TYPE_INVALID", "Blocked", { contentType: contentType });
    const rumorState = internal.text(source.rumorState, "UNKNOWN").toUpperCase();
    if (!RUMOR_STATES.has(rumorState)) return internal.buildResult(false, "EXTERNAL010_SOCIAL_RUMOR_STATE_INVALID", "Blocked", { rumorState: rumorState });
    const id = internal.text(source.socialObservationId, "") || internal.nextId("EXTERNAL-010-SOCIAL-OBSERVATION");
    const originalityState = internal.text(source.originalityState, contentType === "REPOST" ? "REPOST" : "UNKNOWN").toUpperCase();
    const advertisingClassification = internal.text(source.advertisingClassification, (contentType === "ADVERTISEMENT" || contentType === "PROMOTIONAL_CONTENT") ? "PROMOTIONAL" : "NONE").toUpperCase();
    const promotional = ["PROMOTIONAL", "ADVERTISEMENT", "PAID_PROMOTION", "SPONSORED"].includes(advertisingClassification);
    const reproduced = ["REPOST", "SYNDICATED", "QUOTE_REPOST", "CROSS_POST"].includes(originalityState) || contentType === "REPOST";
    const record = internal.deepFreeze({
      socialObservationId: id,
      platformSourceId: sourceState.source.sourceId,
      contentId: internal.text(source.contentId, id),
      accountId: internal.text(source.accountId, "PSEUDONYMOUS-UNKNOWN"),
      contentType: contentType,
      observedAt: internal.text(source.observedAt, internal.nowIso()),
      originalPublishedAt: internal.text(source.originalPublishedAt, "") || null,
      currentViralAt: internal.text(source.currentViralAt, "") || null,
      textHash: internal.text(source.textHash, "") || null,
      engagementMetrics: internal.isPlainObject(source.engagementMetrics) ? internal.clone(source.engagementMetrics) : {},
      sourceEvidenceId: internal.text(source.sourceEvidenceId, "") || null,
      rumorState: rumorState,
      originalityState: originalityState,
      estimatedIndependentOriginId: internal.text(source.estimatedIndependentOriginId, "") || null,
      aiGeneratedProbability: Number.isFinite(source.aiGeneratedProbability) ? source.aiGeneratedProbability : null,
      advertisingClassification: advertisingClassification,
      independentOpinionEligible: !promotional && !reproduced,
      informationLayerOnly: true,
      factualReliabilityDetermined: false,
      eventConfirmed: false,
      tradingAuthorityGranted: false,
      financialAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const invalid = validateRecord("socialObservation", "EXTERNAL-010-SCHEMA-SOCIAL-OBSERVATION", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_SOCIAL_OBSERVATION_INVALID", "Blocked", invalid);
    state.socialObservations.set(id, record);
    const lineage = linkLineage(record.sourceEvidenceId ? [record.sourceEvidenceId] : [], record.socialObservationId, "DERIVED_FROM");
    if (!lineage.ok) {
      state.socialObservations.delete(id);
      return internal.buildResult(false, "EXTERNAL010_SOCIAL_OBSERVATION_LINEAGE_FAILED", "Blocked", lineage);
    }
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SOCIAL_OBSERVATION_RECORDED", "Ready", { socialObservation: internal.clone(record), sourceType: sourceState.source.sourceType, lineageRecords: internal.clone(lineage.lineageRecords) });
  }

  function recordExternalIntelligenceOldInformationResurgence(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const observation = state.socialObservations.get(internal.text(source.socialObservationId, ""));
    if (!observation) return internal.buildResult(false, "EXTERNAL010_SOCIAL_OBSERVATION_REQUIRED", "Blocked", null);
    const original = Date.parse(observation.originalPublishedAt || "");
    const viral = Date.parse(internal.text(source.currentViralAt, observation.currentViralAt || internal.nowIso()));
    if (!Number.isFinite(original) || !Number.isFinite(viral) || viral < original) return internal.buildResult(false, "EXTERNAL010_SOCIAL_RESURGENCE_TIME_INVALID", "Blocked", null);
    const id = internal.text(source.resurgenceId, "") || internal.nextId("EXTERNAL-010-OLD-INFORMATION-RESURGENCE");
    const record = internal.deepFreeze({
      resurgenceId: id,
      socialObservationId: observation.socialObservationId,
      originalPublishedAt: observation.originalPublishedAt,
      currentViralAt: new Date(viral).toISOString(),
      ageMs: viral - original,
      resurgenceVelocity: Number.isFinite(source.resurgenceVelocity) ? source.resurgenceVelocity : null,
      newEventCreated: false,
      currentMarketImpactEligible: true,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const invalid = validateRecord("oldInformationResurgence", "EXTERNAL-010-SCHEMA-OLD-INFORMATION-RESURGENCE", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_SOCIAL_RESURGENCE_INVALID", "Blocked", invalid);
    state.oldInformationResurgences.set(id, record);
    const lineage = linkLineage([observation.socialObservationId], record.resurgenceId, "DERIVED_FROM");
    if (!lineage.ok) { state.oldInformationResurgences.delete(id); return internal.buildResult(false, "EXTERNAL010_SOCIAL_RESURGENCE_LINEAGE_FAILED", "Blocked", lineage); }
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_OLD_INFORMATION_RESURGENCE_RECORDED", "Candidate", { resurgence: internal.clone(record), lineageRecords: internal.clone(lineage.lineageRecords) });
  }

  function getExternalIntelligenceSocialObservation(id) { const record = state.socialObservations.get(internal.text(id, "")); return record ? internal.clone(record) : null; }
  Object.assign(namespace.api, { checkExternalIntelligenceSocialAcquisitionGovernance, recordExternalIntelligenceSocialObservation, recordExternalIntelligenceOldInformationResurgence, getExternalIntelligenceSocialObservation });
  Object.assign(namespace, namespace.api);
  namespace.modules.socialObservation = { id: "EXTERNAL-010-SOCIAL-OBSERVATION", version: MODULE_VERSION, status: "Ready", phase: 13, decisions: ["034"], informationPropagationInfluenceSeparated: true, governedAcquisitionRequired: true, usagePolicyIntegration: true, resourceBudgetIntegration: true, lineageIntegration: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
