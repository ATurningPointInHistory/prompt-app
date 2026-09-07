/* ============================================================
   FILE: 17_external_intelligence_capability_routing.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.7.0
   Phase 08: Task / Domain / Horizon-Aware Capability Routing
   Primary Decision: 036
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("EXTERNAL-010 capability routing blocked: dependencies missing."); return; }
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("capabilityRouting");
  ["capabilityRoutingCandidates", "independentReviewPlans", "shadowEvaluationRecords"].forEach(function ensure(k) { if (!(state[k] instanceof Map)) state[k] = new Map(); });

  function supports(list, value) {
    const v = internal.text(value, "ANY").toUpperCase();
    return Array.isArray(list) && (list.includes("ANY") || list.includes(v));
  }
  function estimatedCost(capability) {
    const c = capability && capability.costProfile || {};
    const n = Number(c.estimatedCost);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function dataPolicyEligible(capability, dataClass, requiresExternalTransmission) {
    const p = capability && capability.dataHandlingPolicy || {};
    const allowed = Array.isArray(p.allowedDataClasses) ? p.allowedDataClasses.map(function (v) { return String(v).toUpperCase(); }) : [];
    if (allowed.length && !allowed.includes("ANY") && !allowed.includes(String(dataClass).toUpperCase())) return false;
    if (requiresExternalTransmission && p.externalTransmissionAllowed !== true) return false;
    return true;
  }

  function createExternalIntelligenceCapabilityRoutingCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const taskType = internal.text(x.taskType, "GENERAL_ANALYSIS").toUpperCase();
    const domain = internal.text(x.domain, "GENERAL").toUpperCase();
    const horizon = internal.text(x.horizon, "ANY").toUpperCase();
    const inputType = internal.text(x.inputType, "TEXT").toUpperCase();
    const dataClass = internal.text(x.dataClass, "PUBLIC").toUpperCase();
    const maxEstimatedCost = Number.isFinite(Number(x.maxEstimatedCost)) ? Number(x.maxEstimatedCost) : null;
    const requiresExternalTransmission = x.requiresExternalTransmission === true;
    const candidateDetails = [];

    Array.from(state.analyticalCapabilities.values()).forEach(function evaluate(cap) {
      const reasons = [];
      if (!cap.active) reasons.push("INACTIVE");
      if (!["READY", "DEGRADED", "EXPERIMENTAL"].includes(cap.availabilityState)) reasons.push("UNAVAILABLE");
      if (!supports(cap.supportedTasks, taskType)) reasons.push("TASK_UNSUPPORTED");
      if (!supports(cap.supportedDomains, domain)) reasons.push("DOMAIN_UNSUPPORTED");
      if (!supports(cap.supportedHorizons, horizon)) reasons.push("HORIZON_UNSUPPORTED");
      if (!supports(cap.supportedInputTypes, inputType)) reasons.push("INPUT_UNSUPPORTED");
      if (!dataPolicyEligible(cap, dataClass, requiresExternalTransmission)) reasons.push("DATA_POLICY_BLOCKED");
      const cost = estimatedCost(cap);
      if (maxEstimatedCost != null && cost != null && cost > maxEstimatedCost) reasons.push("COST_LIMIT_EXCEEDED");
      candidateDetails.push({ capabilityId: cap.capabilityId, capabilityRecordVersion: cap.recordVersion, eligible: reasons.length === 0, reasons, estimatedCost: cost, availabilityState: cap.availabilityState, roles: cap.roles.slice() });
    });

    const eligibleCapabilityIds = candidateDetails.filter(function (r) { return r.eligible; }).map(function (r) { return r.capabilityId; });
    const blockedCapabilityIds = candidateDetails.filter(function (r) { return !r.eligible; }).map(function (r) { return r.capabilityId; });
    const record = internal.deepFreeze({
      routingCandidateId: internal.nextId("EXTERNAL-010-CAPABILITY-ROUTING-CANDIDATE"),
      taskType, domain, horizon, inputType, dataClass,
      requiresExternalTransmission,
      maxEstimatedCost,
      eligibleCapabilityIds,
      blockedCapabilityIds,
      candidateDetails,
      automaticWinnerSelected: false,
      routingGrantsExecutionAuthority: false,
      routingGrantsBusinessAuthority: false,
      agreementEqualsTruth: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("capabilityRoutingCandidate", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-CAPABILITY-ROUTING-CANDIDATE", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_ROUTING_CANDIDATE_INVALID", "Blocked", { contract: cv, schema: sv });
    state.capabilityRoutingCandidates.set(record.routingCandidateId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_ROUTING_CANDIDATE_CREATED", eligibleCapabilityIds.length ? "Ready" : "Blocked", { routingCandidate: internal.clone(record) });
  }

  function createExternalIntelligenceIndependentReviewPlan(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const primaryCapabilityId = internal.text(x.primaryCapabilityId, "");
    if (!state.analyticalCapabilities.has(primaryCapabilityId)) return internal.buildResult(false, "EXTERNAL010_PRIMARY_CAPABILITY_NOT_FOUND", "Blocked", { primaryCapabilityId });
    const requested = internal.unique(x.reviewerCapabilityIds);
    const reviewers = (requested.length ? requested : Array.from(state.analyticalCapabilities.values()).filter(function (c) { return c.roles.includes("REVIEWER") || c.roles.includes("FALSIFICATION_REVIEWER"); }).map(function (c) { return c.capabilityId; }))
      .filter(function (id) { return id !== primaryCapabilityId && state.analyticalCapabilities.has(id); });
    const record = internal.deepFreeze({
      reviewPlanId: internal.nextId("EXTERNAL-010-INDEPENDENT-REVIEW-PLAN"),
      primaryCapabilityId,
      reviewerCapabilityIds: reviewers,
      purpose: internal.text(x.purpose, "INDEPENDENT_REVIEW").toUpperCase(),
      requestedOutputClassification: internal.text(x.requestedOutputClassification, "MODEL_ANALYSIS").toUpperCase(),
      primaryExcludedFromReviewerSet: !reviewers.includes(primaryCapabilityId),
      independentReviewRequired: true,
      modelAgreementEqualsTruth: false,
      automaticExecutionGranted: false,
      automaticPromotionGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("independentReviewPlan", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-INDEPENDENT-REVIEW-PLAN", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_INDEPENDENT_REVIEW_PLAN_INVALID", "Blocked", { contract: cv, schema: sv });
    state.independentReviewPlans.set(record.reviewPlanId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_INDEPENDENT_REVIEW_PLAN_CREATED", "Ready", { reviewPlan: internal.clone(record) });
  }

  function createExternalIntelligenceShadowEvaluationRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const capabilityId = internal.text(x.capabilityId, "");
    if (!state.analyticalCapabilities.has(capabilityId)) return internal.buildResult(false, "EXTERNAL010_SHADOW_CAPABILITY_NOT_FOUND", "Blocked", { capabilityId });
    const record = internal.deepFreeze({
      shadowEvaluationId: internal.nextId("EXTERNAL-010-SHADOW-EVALUATION"),
      capabilityId,
      taskType: internal.text(x.taskType, "GENERAL_ANALYSIS").toUpperCase(),
      domain: internal.text(x.domain, "GENERAL").toUpperCase(),
      horizon: internal.text(x.horizon, "ANY").toUpperCase(),
      comparedWithCapabilityId: internal.text(x.comparedWithCapabilityId, "") || null,
      metrics: internal.isPlainObject(x.metrics) ? internal.clone(x.metrics) : {},
      evaluationEvidenceRefs: internal.unique(x.evaluationEvidenceRefs),
      shadowSuccess: x.shadowSuccess === true,
      automaticPromotionPerformed: false,
      actionAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("shadowEvaluationRecord", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SHADOW-EVALUATION-RECORD", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_SHADOW_EVALUATION_INVALID", "Blocked", { contract: cv, schema: sv });
    state.shadowEvaluationRecords.set(record.shadowEvaluationId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SHADOW_EVALUATION_RECORDED", "Ready", { shadowEvaluation: internal.clone(record) });
  }

  function initializeExternalIntelligenceCapabilityRouting() {
    namespace.modules.capabilityRouting.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_ROUTING_INITIALIZED", "Ready", { routingCandidateOnly: true, automaticWinnerSelection: false });
  }

  Object.assign(namespace.api, { initializeExternalIntelligenceCapabilityRouting, createExternalIntelligenceCapabilityRoutingCandidate, createExternalIntelligenceIndependentReviewPlan, createExternalIntelligenceShadowEvaluationRecord });
  Object.assign(namespace, namespace.api);
  namespace.modules.capabilityRouting = { id: "EXTERNAL-010-CAPABILITY-ROUTING", version: MODULE_VERSION, status: "Loaded", phase: 8, decisions: ["036"], routingCandidateOnly: true, automaticWinnerSelection: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
