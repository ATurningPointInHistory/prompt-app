/* ============================================================
   FILE: 17_external_intelligence_conformance_repair.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.20.1 Conformance Repair Candidate
   Scope: Memo requirement conformance repair for Decisions
          030 / 032 / 035 / 038 / 039 / 040 / 041 / 042 / 051 / 053
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 conformance repair blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("conformanceRepair") || VERSION_MANIFEST.release.version;

  [
    "predictionConformanceProfiles",
    "signalObservations",
    "researchPriorityHistory",
    "researchResultRecords",
    "emergencyControlRecords",
    "emergencyOutcomeEvaluations",
    "authoritySuspensions",
    "authorityDecisionRecords",
    "authorityDelegationBoundaries",
    "workflowControlRecords",
    "workflowOutcomeEvaluations",
    "dataComplianceActions",
    "dataTombstones",
    "dataPolicyImpactRecords",
    "schemaEvolutionRecords",
    "schemaMigrationRecords",
    "schemaDriftRecords",
    "schemaImpactRecords",
    "historicalFixtures",
    "runtimeCoordinatorRecords",
    "runtimeSafetyRecords",
    "dependencyAssessmentRecords",
    "dependencySecurityExceptions",
    "dependencyLifecycleRecords"
  ].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  if (!state.schemaSemanticValidationHooks || typeof state.schemaSemanticValidationHooks !== "object") state.schemaSemanticValidationHooks = {};
  if (!state.schemaReferenceValidationHooks || typeof state.schemaReferenceValidationHooks !== "object") state.schemaReferenceValidationHooks = {};
  if (!state.runtimePrimaryCoordinatorId) state.runtimePrimaryCoordinatorId = null;
  if (!state.runtimeSingleWriterClaims || typeof state.runtimeSingleWriterClaims !== "object") state.runtimeSingleWriterClaims = {};
  if (state.emergencyKillSwitchActive !== true) state.emergencyKillSwitchActive = false;
  if (!state.controlledDependencyUpdateAdapter) state.controlledDependencyUpdateAdapter = null;

  function audit(eventType, references, details) {
    if (typeof namespace.appendExternalIntelligenceAuditEvent !== "function") return;
    Promise.resolve(namespace.appendExternalIntelligenceAuditEvent({
      eventType: eventType,
      actor: "EXTERNAL-010 Conformance Repair",
      outcome: "Recorded",
      references: internal.unique(references || []),
      details: internal.redactSensitive(internal.isPlainObject(details) ? details : {})
    })).catch(function ignoreAuditFailure() {});
  }

  function makeRecord(prefix, payload) {
    return internal.deepFreeze(Object.assign({
      recordId: internal.nextId(prefix),
      createdAt: internal.nowIso(),
      immutable: true
    }, internal.clone(payload || {})));
  }

  function store(map, key, record) {
    map.set(key, record);
    internal.touch();
    return internal.clone(record);
  }

  /* ==========================================================
     Decision 030 - Uncertainty / Calibration Conformance
     ========================================================== */
  const originalRegisterPrediction = namespace.registerExternalIntelligencePrediction;

  function registerExternalIntelligencePredictionConformant(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (typeof originalRegisterPrediction !== "function") {
      return internal.buildResult(false, "EXTERNAL010_PREDICTION_BASE_IMPLEMENTATION_UNAVAILABLE", "Blocked", null);
    }
    const result = originalRegisterPrediction(x);
    if (!result || result.ok !== true || !result.data || !result.data.prediction) return result;
    const prediction = result.data.prediction;
    const profile = internal.deepFreeze({
      predictionConformanceProfileId: internal.nextId("EXTERNAL-010-PREDICTION-CONFORMANCE"),
      predictionId: prediction.predictionId,
      predictionRecordId: prediction.predictionRecordId,
      evidenceSnapshotReference: internal.text(x.evidenceSnapshotReference, "") || null,
      directionEvaluationHook: x.directionEvaluationHook !== false,
      magnitudeEvaluationHook: x.magnitudeEvaluationHook !== false,
      timingEvaluationHook: x.timingEvaluationHook !== false,
      recalibrationCandidateHook: x.recalibrationCandidateHook !== false,
      domainSegment: internal.text(x.domainSegment, "GENERAL"),
      timeHorizonSegment: internal.text(x.timeHorizonSegment, "UNSPECIFIED"),
      outcomeProbabilityHook: true,
      outcomeEvaluationHook: true,
      createdAt: internal.nowIso(),
      immutable: true
    });
    state.predictionConformanceProfiles.set(prediction.predictionRecordId, profile);
    internal.touch();
    audit("PREDICTION_CONFORMANCE_PROFILE_RECORDED", [prediction.predictionRecordId], profile);
    return internal.buildResult(true, "EXTERNAL010_PREDICTION_RECORDED_WITH_CONFORMANCE_PROFILE", "Ready", {
      prediction: prediction,
      conformanceProfile: internal.clone(profile)
    });
  }

  function getExternalIntelligencePredictionConformanceProfile(predictionRecordId) {
    const value = state.predictionConformanceProfiles.get(internal.text(predictionRecordId, ""));
    return value ? internal.clone(value) : null;
  }

  /* ==========================================================
     Decision 032 - Signal Detection Conformance
     ========================================================== */
  const originalRegisterSignalBaseline = namespace.registerExternalIntelligenceSignalBaseline;
  const originalRecordSignalCandidate = namespace.recordExternalIntelligenceSignalCandidate;

  function recordExternalIntelligenceSignalObservation(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const observationId = internal.text(x.observationId, "") || internal.nextId("EXTERNAL-010-SIGNAL-OBSERVATION");
    const record = internal.deepFreeze({
      observationId: observationId,
      observationType: internal.text(x.observationType, "GENERIC"),
      sourceReferenceIds: internal.unique(x.sourceReferenceIds || []),
      entityIds: internal.unique(x.entityIds || []),
      observedAt: internal.text(x.observedAt, internal.nowIso()),
      value: x.value == null ? null : internal.clone(x.value),
      unit: internal.text(x.unit, "") || null,
      evidenceRefs: internal.unique(x.evidenceRefs || []),
      createdAt: internal.nowIso(),
      immutable: true
    });
    store(state.signalObservations, observationId, record);
    audit("SIGNAL_OBSERVATION_RECORDED", [observationId].concat(record.evidenceRefs), record);
    return internal.buildResult(true, "EXTERNAL010_SIGNAL_OBSERVATION_RECORDED", "Ready", { observation: internal.clone(record) });
  }

  function registerExternalIntelligenceSignalBaselineConformant(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (typeof originalRegisterSignalBaseline !== "function") return internal.buildResult(false, "EXTERNAL010_SIGNAL_BASELINE_BASE_IMPLEMENTATION_UNAVAILABLE", "Blocked", null);
    const result = originalRegisterSignalBaseline(x);
    if (!result || result.ok !== true || !result.data || !result.data.baseline) return result;
    const base = result.data.baseline;
    const augmented = internal.deepFreeze(Object.assign({}, internal.clone(base), {
      historicalBaseline: x.historicalBaseline !== false,
      seasonalityHook: x.seasonalityHook !== false,
      peerMarketAdjustmentHook: x.peerMarketAdjustmentHook !== false,
      baselineContext: internal.isPlainObject(x.baselineContext) ? internal.clone(x.baselineContext) : {},
      immutable: true
    }));
    state.signalBaselines.set(augmented.baselineId, augmented);
    state.signalBaselineVersions.set(augmented.baselineRecordId, augmented);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SIGNAL_BASELINE_REGISTERED_CONFORMANT", "Ready", { baseline: internal.clone(augmented) });
  }

  function recordExternalIntelligenceSignalCandidateConformant(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (typeof originalRecordSignalCandidate !== "function") return internal.buildResult(false, "EXTERNAL010_SIGNAL_BASE_IMPLEMENTATION_UNAVAILABLE", "Blocked", null);
    const result = originalRecordSignalCandidate(x);
    if (!result || result.ok !== true || !result.data || !result.data.signal) return result;
    const base = result.data.signal;
    const augmented = internal.deepFreeze(Object.assign({}, internal.clone(base), {
      signalTimeScale: internal.text(x.signalTimeScale, "UNSPECIFIED"),
      structuralBreakCandidate: x.structuralBreakCandidate === true,
      regimeChangeCandidate: x.regimeChangeCandidate === true,
      detectorId: internal.text(x.detectorId, "EXTERNAL-010-DETECTOR-BASIC"),
      detectorVersion: internal.text(x.detectorVersion, MODULE_VERSION),
      researchGoalIds: internal.unique(x.researchGoalIds || []),
      impactGraphReferenceIds: internal.unique(x.impactGraphReferenceIds || []),
      leadingIndicatorCandidate: x.leadingIndicatorCandidate === true,
      outcomeEvaluationHook: true,
      seasonalityConsidered: x.seasonalityConsidered === true,
      peerMarketAdjustmentApplied: x.peerMarketAdjustmentApplied === true,
      immutable: true
    }));
    state.signalRecords.set(augmented.signalId, augmented);
    internal.touch();
    audit("SIGNAL_CANDIDATE_CONFORMANCE_RECORDED", [augmented.signalId].concat(augmented.observationRefs), augmented);
    return internal.buildResult(true, "EXTERNAL010_SIGNAL_CANDIDATE_RECORDED_CONFORMANT", "Candidate", { signal: internal.clone(augmented) });
  }

  /* ==========================================================
     Decision 035 - Research Priority Conformance
     ========================================================== */
  const originalRecordResearchPriority = namespace.recordExternalIntelligenceResearchPriorityCandidate;

  function recordExternalIntelligenceResearchPriorityCandidateConformant(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (typeof originalRecordResearchPriority !== "function") return internal.buildResult(false, "EXTERNAL010_RESEARCH_PRIORITY_BASE_IMPLEMENTATION_UNAVAILABLE", "Blocked", null);
    const result = originalRecordResearchPriority(x);
    if (!result || result.ok !== true || !result.data || !result.data.researchPriority) return result;
    const base = result.data.researchPriority;
    const prior = state.researchPriorityHistory.get(base.researchCandidateId) || [];
    const augmented = internal.deepFreeze(Object.assign({}, internal.clone(base), {
      priorityRevision: prior.length + 1,
      researchPriorityProfile: internal.isPlainObject(x.researchPriorityProfile) ? internal.clone(x.researchPriorityProfile) : {},
      decisionRelevance: internal.text(x.decisionRelevance, "UNKNOWN"),
      timeSensitivity: internal.text(x.timeSensitivity, "UNKNOWN"),
      evidenceAvailability: internal.text(x.evidenceAvailability, "UNKNOWN"),
      researchAction: internal.text(x.researchAction, base.recommendedAction || "CHEAP_CHECK"),
      researchDepth: internal.text(x.researchDepth, "STANDARD"),
      cheapCheckEligible: x.cheapCheckEligible !== false,
      escalationState: internal.text(x.escalationState, "NOT_ESCALATED"),
      stopWaitState: internal.text(x.stopWaitState, "CONTINUE"),
      researchPortfolioId: internal.text(x.researchPortfolioId, "") || null,
      reserveBudgetHook: true,
      informationGainHook: true,
      outcomeEvaluationHook: true,
      auditHook: true,
      lineageHook: true,
      createdAt: internal.nowIso(),
      immutable: true
    }));
    state.researchCandidates.set(augmented.researchCandidateId, augmented);
    state.researchPriorityRecords.set(augmented.researchCandidateId, augmented);
    prior.push(augmented);
    state.researchPriorityHistory.set(augmented.researchCandidateId, prior);
    internal.touch();
    audit("RESEARCH_PRIORITY_RECORDED", [augmented.researchCandidateId].concat(augmented.relatedSignalIds, augmented.relatedHypothesisIds), augmented);
    return internal.buildResult(true, "EXTERNAL010_RESEARCH_PRIORITY_CANDIDATE_RECORDED_CONFORMANT", "Candidate", { researchPriority: internal.clone(augmented) });
  }

  function recordExternalIntelligenceResearchResult(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const researchCandidateId = internal.text(x.researchCandidateId, "");
    if (!researchCandidateId || !state.researchPriorityRecords.has(researchCandidateId)) return internal.buildResult(false, "EXTERNAL010_RESEARCH_CANDIDATE_NOT_FOUND", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-RESEARCH-RESULT", {
      researchCandidateId: researchCandidateId,
      resultState: internal.text(x.resultState, "INCONCLUSIVE"),
      resultSummary: internal.text(x.resultSummary, ""),
      informationGain: Number.isFinite(x.informationGain) ? Number(x.informationGain) : null,
      outcomeEvaluationReference: internal.text(x.outcomeEvaluationReference, "") || null,
      evidenceRefs: internal.unique(x.evidenceRefs || []),
      automaticAuthorityGranted: false
    });
    const stored = store(state.researchResultRecords, record.recordId, record);
    audit("RESEARCH_RESULT_RECORDED", [researchCandidateId, record.recordId].concat(record.evidenceRefs), record);
    return internal.buildResult(true, "EXTERNAL010_RESEARCH_RESULT_RECORDED", "Ready", { researchResult: stored });
  }

  function listExternalIntelligenceResearchPriorityHistory(researchCandidateId) {
    return (state.researchPriorityHistory.get(internal.text(researchCandidateId, "")) || []).map(internal.clone);
  }

  /* ==========================================================
     Decision 038 - Emergency Fast Path Conformance
     ========================================================== */
  const originalRecordEmergencyDecision = namespace.recordExternalIntelligenceEmergencyDecision;

  function recordExternalIntelligenceEmergencyDecisionConformant(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (typeof originalRecordEmergencyDecision !== "function") return internal.buildResult(false, "EXTERNAL010_EMERGENCY_DECISION_BASE_IMPLEMENTATION_UNAVAILABLE", "Blocked", null);
    const result = originalRecordEmergencyDecision(x);
    if (!result || result.ok !== true || !result.data || !result.data.emergencyDecision) return result;
    const base = result.data.emergencyDecision;
    const maxAgeMs = Number.isFinite(x.maximumDecisionAgeMs) ? Math.max(1, Number(x.maximumDecisionAgeMs)) : 300000;
    const augmented = internal.deepFreeze(Object.assign({}, internal.clone(base), {
      emergencySignalCandidate: true,
      emergencySeverityState: internal.text(x.emergencySeverityState, "UNKNOWN"),
      exposureGraphHook: true,
      fastEvidenceCheck: x.fastEvidenceCheck !== false,
      priorityOverrideHook: true,
      emergencyReserveHook: true,
      evidenceSnapshotReference: internal.text(x.evidenceSnapshotReference, "") || null,
      maximumDecisionAgeMs: maxAgeMs,
      staleDecisionState: "STALE",
      actionCandidate: internal.isPlainObject(x.actionCandidate) ? internal.clone(x.actionCandidate) : {},
      authorityBoundaryHook: true,
      preExecutionRevalidationHook: true,
      killSwitchHook: true,
      paperTradingExtensionHook: true,
      outcomeEvaluationHook: true,
      emergencyLineageAuditHook: true,
      killSwitchActiveAtCreation: state.emergencyKillSwitchActive === true,
      immutable: true
    }));
    state.emergencyDecisions.set(augmented.emergencyDecisionId, augmented);
    const history = state.emergencyDecisionVersions.get(augmented.emergencyDecisionId) || [];
    if (history.length && history[history.length - 1].decisionVersion === augmented.decisionVersion) history[history.length - 1] = augmented;
    else history.push(augmented);
    state.emergencyDecisionVersions.set(augmented.emergencyDecisionId, history);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EMERGENCY_DECISION_RECORDED_CONFORMANT", "Candidate", { emergencyDecision: internal.clone(augmented) });
  }

  function setExternalIntelligenceEmergencyKillSwitch(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const active = x.active === true;
    state.emergencyKillSwitchActive = active;
    const record = makeRecord("EXTERNAL-010-EMERGENCY-CONTROL", {
      controlType: "KILL_SWITCH",
      active: active,
      reason: internal.text(x.reason, active ? "Manual safety stop" : "Manual safety release"),
      actor: internal.text(x.actor, "Project Owner / Operator"),
      grantsAuthority: false
    });
    store(state.emergencyControlRecords, record.recordId, record);
    audit(active ? "EMERGENCY_KILL_SWITCH_ACTIVATED" : "EMERGENCY_KILL_SWITCH_RELEASED", [record.recordId], record);
    return internal.buildResult(true, active ? "EXTERNAL010_EMERGENCY_KILL_SWITCH_ACTIVE" : "EXTERNAL010_EMERGENCY_KILL_SWITCH_RELEASED", active ? "Blocked" : "Ready", { control: internal.clone(record) });
  }

  function evaluateExternalIntelligenceEmergencyExecutionGate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (state.emergencyKillSwitchActive === true) return internal.buildResult(false, "EXTERNAL010_EMERGENCY_KILL_SWITCH_BLOCKED", "Blocked", { killSwitchActive: true, executionAuthorityGranted: false });
    const decision = state.emergencyDecisions.get(internal.text(x.emergencyDecisionId, ""));
    if (!decision) return internal.buildResult(false, "EXTERNAL010_EMERGENCY_DECISION_NOT_FOUND", "Blocked", null);
    const ageMs = Math.max(0, Date.now() - Date.parse(decision.createdAt));
    const maxAgeMs = Number.isFinite(decision.maximumDecisionAgeMs) ? decision.maximumDecisionAgeMs : 300000;
    if (ageMs > maxAgeMs) return internal.buildResult(false, "EXTERNAL010_EMERGENCY_DECISION_STALE", "Blocked", { ageMs: ageMs, maximumDecisionAgeMs: maxAgeMs, decisionState: "STALE", executionAuthorityGranted: false });
    return internal.buildResult(false, "EXTERNAL010_EMERGENCY_EXECUTION_REQUIRES_SEPARATE_AUTHORITY", "Review Required", { decision: internal.clone(decision), executionAuthorityGranted: false, tradingAuthorityGranted: false });
  }

  function recordExternalIntelligenceEmergencyOutcomeEvaluation(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const decisionId = internal.text(x.emergencyDecisionId, "");
    if (!decisionId || !state.emergencyDecisions.has(decisionId)) return internal.buildResult(false, "EXTERNAL010_EMERGENCY_DECISION_NOT_FOUND", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-EMERGENCY-OUTCOME", {
      emergencyDecisionId: decisionId,
      outcomeReference: internal.text(x.outcomeReference, "") || null,
      evaluationState: internal.text(x.evaluationState, "UNASSESSED"),
      notes: internal.text(x.notes, ""),
      tradingAuthorityGranted: false
    });
    store(state.emergencyOutcomeEvaluations, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_EMERGENCY_OUTCOME_EVALUATION_RECORDED", "Ready", { evaluation: internal.clone(record) });
  }

  /* ==========================================================
     Decision 039 - Authority Conformance
     ========================================================== */
  const originalEvaluateAuthority = namespace.evaluateExternalIntelligenceAuthority;

  function suspendExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, reason) {
    const id = internal.text(authorityEnvelopeId, "");
    const envelope = typeof namespace.getExternalIntelligenceAuthorityEnvelope === "function" ? namespace.getExternalIntelligenceAuthorityEnvelope(id) : null;
    if (!envelope) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_ENVELOPE_NOT_FOUND", "Blocked", null);
    const record = internal.deepFreeze({ authorityEnvelopeId: id, suspended: true, reason: internal.text(reason, "Manual suspension"), suspendedAt: internal.nowIso(), immutable: true });
    state.authoritySuspensions.set(id, record);
    internal.touch();
    audit("AUTHORITY_ENVELOPE_SUSPENDED", [id], record);
    return internal.buildResult(true, "EXTERNAL010_AUTHORITY_ENVELOPE_SUSPENDED", "Suspended", { envelope: envelope, suspension: internal.clone(record), authorityGranted: false });
  }

  function resumeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId) {
    const id = internal.text(authorityEnvelopeId, "");
    if (!state.authoritySuspensions.has(id)) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_ENVELOPE_NOT_SUSPENDED", "Blocked", null);
    state.authoritySuspensions.delete(id);
    internal.touch();
    audit("AUTHORITY_ENVELOPE_RESUMED", [id], { authorityEnvelopeId: id });
    return internal.buildResult(true, "EXTERNAL010_AUTHORITY_ENVELOPE_RESUMED", "Ready", { authorityEnvelopeId: id, authorityGranted: false });
  }

  function evaluateExternalIntelligenceAuthorityConformant(input) {
    const result = typeof originalEvaluateAuthority === "function" ? originalEvaluateAuthority(input) : { allowed: false, decision: "DENY", reason: "BASE_IMPLEMENTATION_UNAVAILABLE", authorityEnvelopeId: null, evaluatedAt: internal.nowIso() };
    if (result && result.allowed === true && result.authorityEnvelopeId && state.authoritySuspensions.has(result.authorityEnvelopeId)) {
      return { allowed: false, decision: "DENY", reason: "AUTHORITY_SUSPENDED", authorityEnvelopeId: result.authorityEnvelopeId, evaluatedAt: internal.nowIso() };
    }
    const record = internal.deepFreeze({
      authorityDecisionRecordId: internal.nextId("EXTERNAL-010-AUTHORITY-DECISION"),
      action: internal.text(input && input.action, ""),
      target: internal.clone(input && input.target || {}),
      purpose: internal.text(input && input.purpose, ""),
      decision: result.decision,
      reason: result.reason,
      allowed: result.allowed === true,
      authorityEnvelopeId: result.authorityEnvelopeId || null,
      resourceLimitHook: true,
      financialLimitHook: true,
      riskLimitHook: true,
      contextualPolicyDecisionHook: true,
      repositoryAuthorityHook: true,
      knowledgeAuthorityHook: true,
      researchAuthorityHook: true,
      tradingAuthorityHook: true,
      emergencyAuthorityProfileHook: true,
      createdAt: internal.nowIso(),
      immutable: true
    });
    state.authorityDecisionRecords.set(record.authorityDecisionRecordId, record);
    internal.touch();
    return result;
  }

  function createExternalIntelligenceAuthorityDelegationBoundary(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const record = makeRecord("EXTERNAL-010-AUTHORITY-DELEGATION", {
      authorityEnvelopeId: internal.text(x.authorityEnvelopeId, "") || null,
      delegationAllowed: false,
      subDelegationAllowed: false,
      explicitNewAuthorityRequired: true,
      reason: internal.text(x.reason, "Delegation is not implicitly permitted")
    });
    store(state.authorityDelegationBoundaries, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_AUTHORITY_DELEGATION_BOUNDARY_RECORDED", "Ready", { delegationBoundary: internal.clone(record) });
  }

  /* ==========================================================
     Decision 040 - Workflow Conformance
     ========================================================== */
  function recordExternalIntelligenceWorkflowControl(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const workItemId = internal.text(x.workItemId, "");
    const workItem = typeof namespace.getExternalIntelligenceWorkItem === "function" ? namespace.getExternalIntelligenceWorkItem(workItemId) : null;
    if (!workItem) return internal.buildResult(false, "EXTERNAL010_WORK_ITEM_NOT_FOUND", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-WORKFLOW-CONTROL", {
      workItemId: workItemId,
      preemptionState: internal.text(x.preemptionState, "NONE"),
      checkpointReference: internal.text(x.checkpointReference, "") || null,
      resourceBackpressureState: internal.text(x.resourceBackpressureState, "NORMAL"),
      workLeaseReference: internal.text(x.workLeaseReference, "") || null,
      correlationId: internal.text(x.correlationId, workItem.correlationId || ""),
      idempotencyKey: internal.text(x.idempotencyKey, "") || null,
      recoveryState: internal.text(x.recoveryState, "NOT_REQUIRED"),
      contextInvalidationState: internal.text(x.contextInvalidationState, "VALID"),
      authorityRequirementHook: true,
      outcomeEvaluationHook: true,
      priorityHook: true,
      capabilityAssignmentHook: true,
      auditHook: true,
      grantsExecutionAuthority: false
    });
    store(state.workflowControlRecords, record.recordId, record);
    audit("WORKFLOW_CONTROL_RECORDED", [workItemId, record.recordId], record);
    return internal.buildResult(true, "EXTERNAL010_WORKFLOW_CONTROL_RECORDED", "Ready", { workflowControl: internal.clone(record) });
  }

  function recordExternalIntelligenceWorkflowOutcome(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const workItemId = internal.text(x.workItemId, "");
    const workItem = typeof namespace.getExternalIntelligenceWorkItem === "function" ? namespace.getExternalIntelligenceWorkItem(workItemId) : null;
    if (!workItem) return internal.buildResult(false, "EXTERNAL010_WORK_ITEM_NOT_FOUND", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-WORKFLOW-OUTCOME", {
      workItemId: workItemId,
      outcomeState: internal.text(x.outcomeState, "UNKNOWN"),
      outcomeReference: internal.text(x.outcomeReference, "") || null,
      evidenceRefs: internal.unique(x.evidenceRefs || []),
      automaticExecutionAuthorityGranted: false
    });
    store(state.workflowOutcomeEvaluations, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_WORKFLOW_OUTCOME_RECORDED", "Ready", { workflowOutcome: internal.clone(record) });
  }

  /* ==========================================================
     Decision 041 - Data Lifecycle Conformance
     ========================================================== */
  function createExternalIntelligenceComplianceActionCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const lifecycleRecordId = internal.text(x.lifecycleRecordId, "");
    const lifecycle = state.dataLifecycleRecords.get(lifecycleRecordId);
    if (!lifecycle) return internal.buildResult(false, "EXTERNAL010_DATA_LIFECYCLE_NOT_FOUND", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-COMPLIANCE-ACTION", {
      lifecycleRecordId: lifecycleRecordId,
      subjectId: lifecycle.subjectId,
      action: internal.text(x.action, "REVIEW"),
      reason: internal.text(x.reason, "Policy review"),
      actionAuthorityGranted: false,
      deletionAuthorityGranted: false,
      persistenceRecoveryHook: true,
      lineageIntegrationHook: true
    });
    store(state.dataComplianceActions, record.recordId, record);
    audit("DATA_COMPLIANCE_ACTION_CANDIDATE", [lifecycleRecordId, record.recordId], record);
    return internal.buildResult(true, "EXTERNAL010_COMPLIANCE_ACTION_CANDIDATE_CREATED", "Candidate", { complianceAction: internal.clone(record) });
  }

  function createExternalIntelligenceDataTombstone(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const lifecycleRecordId = internal.text(x.lifecycleRecordId, "");
    const lifecycle = state.dataLifecycleRecords.get(lifecycleRecordId);
    if (!lifecycle) return internal.buildResult(false, "EXTERNAL010_DATA_LIFECYCLE_NOT_FOUND", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-DATA-TOMBSTONE", {
      lifecycleRecordId: lifecycleRecordId,
      subjectId: lifecycle.subjectId,
      reason: internal.text(x.reason, "Deletion candidate tombstone"),
      deletionPerformed: x.deletionPerformed === true,
      deletedAt: x.deletionPerformed === true ? internal.text(x.deletedAt, internal.nowIso()) : null,
      rawEvidenceReconstructionAllowed: false
    });
    store(state.dataTombstones, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_DATA_TOMBSTONE_RECORDED", "Ready", { tombstone: internal.clone(record) });
  }

  function assessExternalIntelligencePolicyChangeImpact(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const sourceId = internal.text(x.sourceId, "").toUpperCase();
    const affected = Array.from(state.dataLifecycleRecords.values()).filter(function filter(record) { return !sourceId || record.sourceId === sourceId; });
    const record = makeRecord("EXTERNAL-010-POLICY-IMPACT", {
      sourceId: sourceId || null,
      fromPolicyVersion: internal.text(x.fromPolicyVersion, "UNKNOWN"),
      toPolicyVersion: internal.text(x.toPolicyVersion, "UNKNOWN"),
      affectedLifecycleRecordIds: affected.map(function map(record) { return record.lifecycleRecordId; }),
      affectedCount: affected.length,
      automaticDeletionPerformed: false,
      reviewRequired: true,
      persistenceRecoveryHook: true,
      lineageIntegrationHook: true
    });
    store(state.dataPolicyImpactRecords, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_POLICY_CHANGE_IMPACT_ASSESSED", "Review Required", { impact: internal.clone(record) });
  }

  /* ==========================================================
     Decision 042 - Schema / Contract Evolution Conformance
     ========================================================== */
  function createExternalIntelligenceVersionedRecordEnvelope(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const recordType = internal.text(x.recordType, "");
    const recordVersion = Math.max(1, Number(x.recordVersion) || 1);
    const schemaVersion = internal.text(x.schemaVersion, "");
    if (!recordType || !schemaVersion) return internal.buildResult(false, "EXTERNAL010_VERSIONED_RECORD_FIELDS_REQUIRED", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-VERSIONED-RECORD", {
      recordType: recordType,
      recordVersion: recordVersion,
      schemaVersion: schemaVersion,
      payload: internal.isPlainObject(x.payload) ? internal.clone(x.payload) : {},
      unknownFieldsPreserved: true,
      readOnlyCompatibilityState: internal.text(x.readOnlyCompatibilityState, "READ_WRITE_CURRENT"),
      currentWriteSchema: internal.text(x.currentWriteSchema, schemaVersion),
      historicalReaderHook: true,
      historicalProjectionHook: true,
      explicitPromotionHook: true,
      persistenceCompatibilityCheck: true
    });
    store(state.schemaEvolutionRecords, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_VERSIONED_RECORD_ENVELOPE_CREATED", "Ready", { versionedRecord: internal.clone(record) });
  }

  function readExternalIntelligenceHistoricalRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const record = state.schemaEvolutionRecords.get(internal.text(x.recordId, ""));
    if (!record) return internal.buildResult(false, "EXTERNAL010_VERSIONED_RECORD_NOT_FOUND", "Blocked", null);
    return internal.buildResult(true, "EXTERNAL010_HISTORICAL_RECORD_READ", "Read Only", {
      versionedRecord: internal.clone(record),
      historicalReaderUsed: true,
      mutationAllowed: false
    });
  }

  function registerExternalIntelligenceSchemaSemanticValidationHook(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const schemaId = internal.text(x.schemaId, "");
    if (!schemaId || typeof x.validate !== "function") return internal.buildResult(false, "EXTERNAL010_SCHEMA_SEMANTIC_HOOK_INVALID", "Blocked", null);
    state.schemaSemanticValidationHooks[schemaId] = x.validate;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SCHEMA_SEMANTIC_HOOK_REGISTERED", "Ready", { schemaId: schemaId });
  }

  function registerExternalIntelligenceSchemaReferenceValidationHook(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const schemaId = internal.text(x.schemaId, "");
    if (!schemaId || typeof x.validate !== "function") return internal.buildResult(false, "EXTERNAL010_SCHEMA_REFERENCE_HOOK_INVALID", "Blocked", null);
    state.schemaReferenceValidationHooks[schemaId] = x.validate;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SCHEMA_REFERENCE_HOOK_REGISTERED", "Ready", { schemaId: schemaId });
  }

  function validateExternalIntelligenceEvolvedRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const schemaId = internal.text(x.schemaId, "");
    const record = internal.isPlainObject(x.record) ? x.record : {};
    const structural = typeof namespace.validateExternalIntelligenceRecord === "function" ? namespace.validateExternalIntelligenceRecord(schemaId, record) : { valid: false, errors: [{ code: "VALIDATOR_UNAVAILABLE" }] };
    let semantic = { valid: true, errors: [] };
    let references = { valid: true, errors: [] };
    try {
      if (typeof state.schemaSemanticValidationHooks[schemaId] === "function") semantic = state.schemaSemanticValidationHooks[schemaId](internal.clone(record)) || semantic;
      if (typeof state.schemaReferenceValidationHooks[schemaId] === "function") references = state.schemaReferenceValidationHooks[schemaId](internal.clone(record)) || references;
    } catch (error) {
      semantic = { valid: false, errors: [{ code: "HOOK_EXCEPTION", message: error && error.message || String(error) }] };
    }
    return {
      valid: structural.valid === true && semantic.valid !== false && references.valid !== false,
      structural: structural,
      semantic: semantic,
      references: references,
      validatedAt: internal.nowIso()
    };
  }

  function recordExternalIntelligenceSchemaMigration(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const record = makeRecord("EXTERNAL-010-SCHEMA-MIGRATION", {
      recordType: internal.text(x.recordType, "UNKNOWN"),
      fromSchemaVersion: internal.text(x.fromSchemaVersion, "UNKNOWN"),
      toSchemaVersion: internal.text(x.toSchemaVersion, "UNKNOWN"),
      transformationId: internal.text(x.transformationId, "") || internal.nextId("TRANSFORM"),
      sourceRecordIds: internal.unique(x.sourceRecordIds || []),
      outputRecordIds: internal.unique(x.outputRecordIds || []),
      historicalRewritePerformed: false,
      explicitPromotionRequired: true,
      auditLineageHook: true
    });
    store(state.schemaMigrationRecords, record.recordId, record);
    audit("SCHEMA_MIGRATION_TRANSFORMATION_RECORDED", [record.recordId].concat(record.sourceRecordIds, record.outputRecordIds), record);
    return internal.buildResult(true, "EXTERNAL010_SCHEMA_MIGRATION_RECORDED", "Ready", { migration: internal.clone(record) });
  }

  function recordExternalIntelligenceExternalSchemaDrift(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const record = makeRecord("EXTERNAL-010-SCHEMA-DRIFT", {
      sourceId: internal.text(x.sourceId, "") || null,
      externalSchemaReference: internal.text(x.externalSchemaReference, "") || null,
      driftState: internal.text(x.driftState, "UNKNOWN"),
      changedFields: internal.unique(x.changedFields || []),
      readOnlyCompatibilityState: internal.text(x.readOnlyCompatibilityState, "REVIEW_REQUIRED"),
      automaticMigrationPerformed: false
    });
    store(state.schemaDriftRecords, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_EXTERNAL_SCHEMA_DRIFT_RECORDED", "Review Required", { drift: internal.clone(record) });
  }

  function analyzeExternalIntelligenceContractImpact(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const contractKey = internal.text(x.contractKey, "");
    const affectedModules = Object.keys(namespace.modules || {}).filter(function filter(key) {
      const module = namespace.modules[key];
      return module && Array.isArray(module.decisions) && module.decisions.includes(internal.text(x.decisionId, ""));
    });
    const record = makeRecord("EXTERNAL-010-CONTRACT-IMPACT", {
      contractKey: contractKey || null,
      fromVersion: internal.text(x.fromVersion, "UNKNOWN"),
      toVersion: internal.text(x.toVersion, "UNKNOWN"),
      affectedModules: affectedModules,
      affectedRecordTypes: internal.unique(x.affectedRecordTypes || []),
      migrationRequired: x.migrationRequired === true,
      automaticPromotionAllowed: false
    });
    store(state.schemaImpactRecords, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_CONTRACT_IMPACT_ANALYZED", "Ready", { impact: internal.clone(record) });
  }

  function registerExternalIntelligenceHistoricalFixture(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const fixtureId = internal.text(x.fixtureId, "") || internal.nextId("EXTERNAL-010-HISTORICAL-FIXTURE");
    const record = internal.deepFreeze({
      fixtureId: fixtureId,
      recordType: internal.text(x.recordType, "UNKNOWN"),
      schemaVersion: internal.text(x.schemaVersion, "UNKNOWN"),
      payload: internal.clone(x.payload || {}),
      expectedCompatibilityState: internal.text(x.expectedCompatibilityState, "READABLE"),
      createdAt: internal.nowIso(),
      immutable: true
    });
    store(state.historicalFixtures, fixtureId, record);
    return internal.buildResult(true, "EXTERNAL010_HISTORICAL_FIXTURE_REGISTERED", "Ready", { fixture: internal.clone(record) });
  }

  /* ==========================================================
     Decision 051 - Runtime Coordination Conformance
     ========================================================== */
  function setExternalIntelligencePrimaryCoordinator(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const runtimeInstanceId = internal.text(x.runtimeInstanceId, "");
    const runtime = state.runtimeInstances.get(runtimeInstanceId);
    if (!runtime) return internal.buildResult(false, "EXTERNAL010_RUNTIME_NOT_FOUND", "Blocked", null);
    state.runtimePrimaryCoordinatorId = runtimeInstanceId;
    const record = makeRecord("EXTERNAL-010-RUNTIME-COORDINATOR", {
      runtimeInstanceId: runtimeInstanceId,
      coordinatorScope: internal.text(x.coordinatorScope, "LOCAL_PRIMARY"),
      executionAuthorityGranted: false,
      businessAuthorityGranted: false
    });
    store(state.runtimeCoordinatorRecords, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_PRIMARY_COORDINATOR_SET", "Ready", { coordinator: internal.clone(record) });
  }

  function acquireExternalIntelligenceSingleWriterGuard(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const runtimeInstanceId = internal.text(x.runtimeInstanceId, "");
    const writeDomain = internal.text(x.writeDomain, "CANONICAL_EXTERNAL_METADATA");
    if (!state.runtimeInstances.has(runtimeInstanceId)) return internal.buildResult(false, "EXTERNAL010_RUNTIME_NOT_FOUND", "Blocked", null);
    const current = state.runtimeSingleWriterClaims[writeDomain];
    if (current && current.runtimeInstanceId !== runtimeInstanceId) return internal.buildResult(false, "EXTERNAL010_SINGLE_WRITER_ALREADY_HELD", "Blocked", { current: internal.clone(current) });
    const claim = internal.deepFreeze({ runtimeInstanceId: runtimeInstanceId, writeDomain: writeDomain, fencingToken: current ? current.fencingToken : Object.keys(state.runtimeSingleWriterClaims).length + 1, acquiredAt: internal.nowIso(), immutable: true });
    state.runtimeSingleWriterClaims[writeDomain] = claim;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SINGLE_WRITER_GUARD_ACQUIRED", "Ready", { singleWriterClaim: internal.clone(claim) });
  }

  function releaseExternalIntelligenceSingleWriterGuard(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const runtimeInstanceId = internal.text(x.runtimeInstanceId, "");
    const writeDomain = internal.text(x.writeDomain, "CANONICAL_EXTERNAL_METADATA");
    const current = state.runtimeSingleWriterClaims[writeDomain];
    if (!current || current.runtimeInstanceId !== runtimeInstanceId) return internal.buildResult(false, "EXTERNAL010_SINGLE_WRITER_GUARD_NOT_HELD", "Blocked", null);
    delete state.runtimeSingleWriterClaims[writeDomain];
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SINGLE_WRITER_GUARD_RELEASED", "Ready", { writeDomain: writeDomain });
  }

  function prepareExternalIntelligenceGracefulShutdown(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const runtimeInstanceId = internal.text(x.runtimeInstanceId, "");
    if (!state.runtimeInstances.has(runtimeInstanceId)) return internal.buildResult(false, "EXTERNAL010_RUNTIME_NOT_FOUND", "Blocked", null);
    const record = makeRecord("EXTERNAL-010-RUNTIME-SAFETY", {
      runtimeInstanceId: runtimeInstanceId,
      safetyType: "GRACEFUL_SHUTDOWN",
      stopAcceptingNewWork: true,
      stopNewClaims: true,
      inspectInFlightWork: true,
      persistStateRequired: true,
      readbackVerificationRequired: true,
      releaseLeaseRequired: true,
      shutdownAuthorized: false
    });
    store(state.runtimeSafetyRecords, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_GRACEFUL_SHUTDOWN_PREPARED", "Candidate", { shutdownPlan: internal.clone(record) });
  }

  function createExternalIntelligenceRestartRecoveryPlan(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const runtimeInstanceId = internal.text(x.runtimeInstanceId, "");
    const record = makeRecord("EXTERNAL-010-RUNTIME-SAFETY", {
      runtimeInstanceId: runtimeInstanceId || null,
      safetyType: "RESTART_RECOVERY",
      leaseRevalidationRequired: true,
      workClaimRevalidationRequired: true,
      unknownExecutionReadbackRequired: true,
      blindRetryAllowed: false,
      staleWriterProtectionRequired: true,
      automaticAuthorityGranted: false
    });
    store(state.runtimeSafetyRecords, record.recordId, record);
    return internal.buildResult(true, "EXTERNAL010_RESTART_RECOVERY_PLAN_CREATED", "Ready", { recoveryPlan: internal.clone(record) });
  }

  function checkExternalIntelligenceRuntimeUpgradeCompatibility(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const currentVersion = internal.text(x.currentVersion, VERSION_MANIFEST.release.version);
    const candidateVersion = internal.text(x.candidateVersion, "");
    const schemaProfile = internal.isPlainObject(x.schemaCompatibilityProfile) ? x.schemaCompatibilityProfile : {};
    const compatible = Boolean(candidateVersion && x.schemaCompatible !== false && x.contractCompatible !== false);
    const record = makeRecord("EXTERNAL-010-RUNTIME-SAFETY", {
      safetyType: "UPGRADE_COMPATIBILITY",
      currentVersion: currentVersion,
      candidateVersion: candidateVersion || null,
      schemaCompatibilityProfile: internal.clone(schemaProfile),
      schemaCompatible: x.schemaCompatible !== false,
      contractCompatible: x.contractCompatible !== false,
      compatible: compatible,
      canonicalWriteAllowed: false
    });
    store(state.runtimeSafetyRecords, record.recordId, record);
    return internal.buildResult(compatible, compatible ? "EXTERNAL010_RUNTIME_UPGRADE_COMPATIBLE" : "EXTERNAL010_RUNTIME_UPGRADE_BLOCKED", compatible ? "Ready" : "Blocked", { compatibility: internal.clone(record) });
  }

  function validateExternalIntelligenceStaleWriter(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const writeDomain = internal.text(x.writeDomain, "CANONICAL_EXTERNAL_METADATA");
    const runtimeInstanceId = internal.text(x.runtimeInstanceId, "");
    const fencingToken = Number(x.fencingToken);
    const current = state.runtimeSingleWriterClaims[writeDomain];
    const allowed = Boolean(current && current.runtimeInstanceId === runtimeInstanceId && Number(current.fencingToken) === fencingToken);
    return internal.buildResult(allowed, allowed ? "EXTERNAL010_STALE_WRITER_CHECK_PASS" : "EXTERNAL010_STALE_WRITER_REJECTED", allowed ? "Ready" : "Blocked", { writeDomain: writeDomain, runtimeInstanceId: runtimeInstanceId, fencingToken: fencingToken, current: current ? internal.clone(current) : null, canonicalWriteAllowed: allowed });
  }

  /* ==========================================================
     Decision 053 - Software Supply Chain Conformance
     ========================================================== */
  function assessExternalIntelligenceDependencyCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const dependencyId = internal.text(x.dependencyId, "");
    const candidate = state.dependencyCandidates.get(dependencyId);
    if (!candidate) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_CANDIDATE_NOT_FOUND", "Blocked", null);
    const hardFails = internal.unique(x.hardFails || []);
    const record = makeRecord("EXTERNAL-010-DEPENDENCY-ASSESSMENT", {
      dependencyId: dependencyId,
      securityScanState: internal.text(x.securityScanState, "UNKNOWN"),
      behaviorRiskState: internal.text(x.behaviorRiskState, "UNKNOWN"),
      licensePolicyState: internal.text(x.licensePolicyState, "UNKNOWN"),
      sandboxState: internal.text(x.sandboxState, "NOT_RUN"),
      functionalValidationState: internal.text(x.functionalValidationState, "NOT_RUN"),
      goldenValidationState: internal.text(x.goldenValidationState, "NOT_RUN"),
      regressionValidationState: internal.text(x.regressionValidationState, "NOT_RUN"),
      hardFails: hardFails,
      hardSecurityFail: hardFails.length > 0,
      authorityIntegrationHook: true,
      auditLineageHook: true,
      automaticInstallAllowed: false
    });
    store(state.dependencyAssessmentRecords, dependencyId, record);
    audit("DEPENDENCY_ASSESSMENT_RECORDED", [dependencyId, record.recordId], record);
    return internal.buildResult(true, "EXTERNAL010_DEPENDENCY_ASSESSMENT_RECORDED", record.hardSecurityFail ? "Blocked" : "Review Required", { assessment: internal.clone(record) });
  }

  function requestExternalIntelligenceElevatedSecurityException(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const dependencyId = internal.text(x.dependencyId, "");
    const candidate = state.dependencyCandidates.get(dependencyId);
    if (!candidate) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_CANDIDATE_NOT_FOUND", "Blocked", null);
    const assessment = state.dependencyAssessmentRecords.get(dependencyId);
    if (assessment && assessment.hardSecurityFail) return internal.buildResult(false, "EXTERNAL010_HARD_SECURITY_FAIL_NOT_OVERRIDABLE", "Blocked", { dependencyId: dependencyId, hardFails: assessment.hardFails, exceptionGranted: false });
    const record = makeRecord("EXTERNAL-010-SECURITY-EXCEPTION", {
      dependencyId: dependencyId,
      exactVersion: candidate.version,
      integrityHash: candidate.integrityHash || null,
      purpose: internal.text(x.purpose, candidate.purpose || ""),
      runtimeTarget: internal.text(x.runtimeTarget, candidate.runtimeTarget || ""),
      capabilityScope: internal.unique(x.capabilityScope || []),
      expiresAt: internal.text(x.expiresAt, "") || null,
      state: "REQUESTED",
      sandboxOnly: x.sandboxOnly !== false,
      productionSecretAccessAllowed: false,
      canonicalMutationAllowed: false,
      financialAuthorityGranted: false,
      repositoryMutationAuthorityGranted: false,
      authorityGranted: false
    });
    store(state.dependencySecurityExceptions, record.recordId, record);
    audit("ELEVATED_SECURITY_EXCEPTION_REQUESTED", [dependencyId, record.recordId], record);
    return internal.buildResult(true, "EXTERNAL010_ELEVATED_SECURITY_EXCEPTION_REQUESTED", "Review Required", { exception: internal.clone(record) });
  }

  function setExternalIntelligenceControlledDependencyUpdateAdapter(adapter) {
    if (adapter == null) {
      state.controlledDependencyUpdateAdapter = null;
      internal.touch();
      return internal.buildResult(true, "EXTERNAL010_CONTROLLED_DEPENDENCY_UPDATE_ADAPTER_CLEARED", "Ready", null);
    }
    if (!adapter || typeof adapter.update !== "function" || typeof adapter.rollback !== "function") return internal.buildResult(false, "EXTERNAL010_CONTROLLED_DEPENDENCY_UPDATE_ADAPTER_INVALID", "Blocked", null);
    state.controlledDependencyUpdateAdapter = adapter;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CONTROLLED_DEPENDENCY_UPDATE_ADAPTER_SET", "Ready", { adapterId: internal.text(adapter.adapterId, "custom") });
  }

  async function requestExternalIntelligenceControlledDependencyLifecycle(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const dependencyId = internal.text(x.dependencyId, "");
    const operation = internal.text(x.operation, "UPDATE").toUpperCase();
    const candidate = state.dependencyCandidates.get(dependencyId);
    if (!candidate) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_CANDIDATE_NOT_FOUND", "Blocked", null);
    if (!state.controlledDependencyUpdateAdapter) return internal.buildResult(false, "EXTERNAL010_CONTROLLED_DEPENDENCY_UPDATE_ADAPTER_REQUIRED", "Blocked", { operation: operation, dependencyId: dependencyId });
    const assessment = state.dependencyAssessmentRecords.get(dependencyId);
    if (assessment && assessment.hardSecurityFail) return internal.buildResult(false, "EXTERNAL010_HARD_SECURITY_FAIL_BLOCKS_DEPENDENCY_LIFECYCLE", "Blocked", { dependencyId: dependencyId, operation: operation });
    const authority = typeof namespace.evaluateExternalIntelligenceAuthority === "function" ? namespace.evaluateExternalIntelligenceAuthority({ action: operation === "ROLLBACK" ? "ROLLBACK_DEPENDENCY" : "UPDATE_DEPENDENCY", target: { type: "dependency", id: dependencyId }, purpose: internal.text(x.purpose, "controlled dependency lifecycle") }) : { allowed: false };
    if (!authority.allowed) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_LIFECYCLE_AUTHORITY_REQUIRED", "Blocked", { authority: authority, dependencyId: dependencyId, operation: operation });
    const fn = operation === "ROLLBACK" ? state.controlledDependencyUpdateAdapter.rollback : state.controlledDependencyUpdateAdapter.update;
    try {
      const adapterResult = await fn(internal.clone(candidate), internal.clone(x));
      const record = makeRecord("EXTERNAL-010-DEPENDENCY-LIFECYCLE", {
        dependencyId: dependencyId,
        operation: operation,
        adapterResult: internal.redactSensitive(adapterResult || {}),
        authorityEnvelopeId: authority.authorityEnvelopeId || null,
        auditLineageHook: true
      });
      store(state.dependencyLifecycleRecords, record.recordId, record);
      return internal.buildResult(true, "EXTERNAL010_DEPENDENCY_LIFECYCLE_OPERATION_RECORDED", "Ready", { lifecycle: internal.clone(record) });
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_LIFECYCLE_OPERATION_FAILED", "Failed", null, { error: { message: error && error.message || String(error), category: "Dependency Lifecycle" } });
    }
  }

  function initializeExternalIntelligenceConformanceRepair() {
    namespace.modules.conformanceRepair.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_CONFORMANCE_REPAIR_INITIALIZED", "Ready", {
      repairedDecisions: ["030", "032", "035", "038", "039", "040", "041", "042", "051", "053"],
      automaticAuthorityExpansion: false,
      automaticRepositoryMutation: false,
      automaticTrading: false,
      automaticDependencyInstall: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceConformanceRepair: initializeExternalIntelligenceConformanceRepair,
    registerExternalIntelligencePrediction: registerExternalIntelligencePredictionConformant,
    getExternalIntelligencePredictionConformanceProfile: getExternalIntelligencePredictionConformanceProfile,
    recordExternalIntelligenceSignalObservation: recordExternalIntelligenceSignalObservation,
    registerExternalIntelligenceSignalBaseline: registerExternalIntelligenceSignalBaselineConformant,
    recordExternalIntelligenceSignalCandidate: recordExternalIntelligenceSignalCandidateConformant,
    recordExternalIntelligenceResearchPriorityCandidate: recordExternalIntelligenceResearchPriorityCandidateConformant,
    recordExternalIntelligenceResearchResult: recordExternalIntelligenceResearchResult,
    listExternalIntelligenceResearchPriorityHistory: listExternalIntelligenceResearchPriorityHistory,
    recordExternalIntelligenceEmergencyDecision: recordExternalIntelligenceEmergencyDecisionConformant,
    setExternalIntelligenceEmergencyKillSwitch: setExternalIntelligenceEmergencyKillSwitch,
    evaluateExternalIntelligenceEmergencyExecutionGate: evaluateExternalIntelligenceEmergencyExecutionGate,
    recordExternalIntelligenceEmergencyOutcomeEvaluation: recordExternalIntelligenceEmergencyOutcomeEvaluation,
    suspendExternalIntelligenceAuthorityEnvelope: suspendExternalIntelligenceAuthorityEnvelope,
    resumeExternalIntelligenceAuthorityEnvelope: resumeExternalIntelligenceAuthorityEnvelope,
    evaluateExternalIntelligenceAuthority: evaluateExternalIntelligenceAuthorityConformant,
    createExternalIntelligenceAuthorityDelegationBoundary: createExternalIntelligenceAuthorityDelegationBoundary,
    recordExternalIntelligenceWorkflowControl: recordExternalIntelligenceWorkflowControl,
    recordExternalIntelligenceWorkflowOutcome: recordExternalIntelligenceWorkflowOutcome,
    createExternalIntelligenceComplianceActionCandidate: createExternalIntelligenceComplianceActionCandidate,
    createExternalIntelligenceDataTombstone: createExternalIntelligenceDataTombstone,
    assessExternalIntelligencePolicyChangeImpact: assessExternalIntelligencePolicyChangeImpact,
    createExternalIntelligenceVersionedRecordEnvelope: createExternalIntelligenceVersionedRecordEnvelope,
    readExternalIntelligenceHistoricalRecord: readExternalIntelligenceHistoricalRecord,
    registerExternalIntelligenceSchemaSemanticValidationHook: registerExternalIntelligenceSchemaSemanticValidationHook,
    registerExternalIntelligenceSchemaReferenceValidationHook: registerExternalIntelligenceSchemaReferenceValidationHook,
    validateExternalIntelligenceEvolvedRecord: validateExternalIntelligenceEvolvedRecord,
    recordExternalIntelligenceSchemaMigration: recordExternalIntelligenceSchemaMigration,
    recordExternalIntelligenceExternalSchemaDrift: recordExternalIntelligenceExternalSchemaDrift,
    analyzeExternalIntelligenceContractImpact: analyzeExternalIntelligenceContractImpact,
    registerExternalIntelligenceHistoricalFixture: registerExternalIntelligenceHistoricalFixture,
    setExternalIntelligencePrimaryCoordinator: setExternalIntelligencePrimaryCoordinator,
    acquireExternalIntelligenceSingleWriterGuard: acquireExternalIntelligenceSingleWriterGuard,
    releaseExternalIntelligenceSingleWriterGuard: releaseExternalIntelligenceSingleWriterGuard,
    prepareExternalIntelligenceGracefulShutdown: prepareExternalIntelligenceGracefulShutdown,
    createExternalIntelligenceRestartRecoveryPlan: createExternalIntelligenceRestartRecoveryPlan,
    checkExternalIntelligenceRuntimeUpgradeCompatibility: checkExternalIntelligenceRuntimeUpgradeCompatibility,
    validateExternalIntelligenceStaleWriter: validateExternalIntelligenceStaleWriter,
    assessExternalIntelligenceDependencyCandidate: assessExternalIntelligenceDependencyCandidate,
    requestExternalIntelligenceElevatedSecurityException: requestExternalIntelligenceElevatedSecurityException,
    setExternalIntelligenceControlledDependencyUpdateAdapter: setExternalIntelligenceControlledDependencyUpdateAdapter,
    requestExternalIntelligenceControlledDependencyLifecycle: requestExternalIntelligenceControlledDependencyLifecycle
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.conformanceRepair = {
    id: "EXTERNAL-010-CONFORMANCE-REPAIR",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 21,
    decisions: ["030", "032", "035", "038", "039", "040", "041", "042", "051", "053"],
    memoRequirementRepair: true,
    authorityNeutralByDefault: true,
    loadedAt: internal.nowIso()
  };

  const originalFoundationInitializer = namespace.initializeExternalIntelligenceFoundation;
  if (typeof originalFoundationInitializer === "function" && originalFoundationInitializer.__external010ConformanceWrapped !== true) {
    const wrappedFoundationInitializer = async function wrappedFoundationInitializer() {
      const base = await originalFoundationInitializer();
      const repair = initializeExternalIntelligenceConformanceRepair();
      if (!base || base.ok !== true) return base;
      return internal.buildResult(repair.ok === true, repair.ok ? "EXTERNAL010_FOUNDATION_INITIALIZED_WITH_CONFORMANCE_REPAIR" : "EXTERNAL010_CONFORMANCE_REPAIR_INITIALIZATION_FAILED", repair.ok ? "Ready" : "Blocked", {
        foundation: typeof namespace.getExternalIntelligenceFoundationState === "function" ? namespace.getExternalIntelligenceFoundationState() : null,
        base: base,
        conformanceRepair: repair
      });
    };
    wrappedFoundationInitializer.__external010ConformanceWrapped = true;
    namespace.initializeExternalIntelligenceFoundation = wrappedFoundationInitializer;
    namespace.api.initializeExternalIntelligenceFoundation = wrappedFoundationInitializer;
    global.initializeExternalIntelligenceFoundation = wrappedFoundationInitializer;
  }
})(typeof window !== "undefined" ? window : globalThis);
