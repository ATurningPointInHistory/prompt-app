/* ============================================================
   FILE: 17_external_intelligence_monitoring_change.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.15.0
   Phase 16: Change / Materiality / Monitoring Outcome
   Primary Decision: 045
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("monitoringChange");
  const CONFIG = VERSION_MANIFEST.monitoring || {};
  ["monitoringObservations", "materialChangeCandidates", "monitoringAlertFingerprints", "monitoringOutcomeEvaluations"].forEach(function ensure(k) { if (!(state[k] instanceof Map)) state[k] = new Map(); });
  if (!Array.isArray(state.monitoringObservationOrder)) state.monitoringObservationOrder = [];
  const CHANGE_TYPES = new Set(CONFIG.materialChangeTypes || []);

  function upper(v, f) { return internal.text(v, f || "").toUpperCase(); }
  function validateRecord(contractKey, schemaId, record) { const c = namespace.validateExternalIntelligenceContract(contractKey, record), s = namespace.validateExternalIntelligenceRecord(schemaId, record); return c.valid && s.valid ? null : { contract: c, schema: s }; }
  function audit(eventType, outcome, details) { if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") namespace.appendExternalIntelligenceAuditEvent({ eventType: eventType, actor: "Phase16 Monitoring", outcome: outcome, details: internal.clone(details || {}) }); }
  function lineage(inputs, output) { if (typeof namespace.createExternalIntelligenceLineageRecord !== "function") return []; return internal.unique(inputs || []).filter(Boolean).map(function link(id) { const r = namespace.createExternalIntelligenceLineageRecord({ inputReferenceId: id, outputReferenceId: output, relationType: "DERIVED_FROM", lineageState: "ACTIVE" }); return r && r.ok && r.data ? r.data.lineageRecord : null; }).filter(Boolean); }

  function latestObservationForWatch(watchId) {
    for (let idx = state.monitoringObservationOrder.length - 1; idx >= 0; idx -= 1) {
      const obs = state.monitoringObservations.get(state.monitoringObservationOrder[idx]);
      if (obs && obs.watchId === watchId) return obs;
    }
    return null;
  }

  function recordObservation(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watch = typeof namespace.getExternalIntelligenceWatch === "function" ? namespace.getExternalIntelligenceWatch(x.watchId) : null;
    if (!watch) return internal.buildResult(false, "EXTERNAL010_MONITORING_WATCH_REQUIRED", "Blocked", null);
    const previous = latestObservationForWatch(watch.watchId);
    const hash = internal.text(x.contentHash, "");
    const fingerprint = internal.text(x.eventFingerprint, "") || null;
    const sameHash = Boolean(previous && hash && previous.contentHash === hash);
    const sameEvent = Boolean(previous && fingerprint && previous.eventFingerprint === fingerprint);
    const record = internal.deepFreeze({ monitoringObservationId: internal.text(x.monitoringObservationId, "") || internal.nextId("EXTERNAL-010-MONITORING-OBSERVATION"), watchId: watch.watchId, sourceId: internal.text(x.sourceId, "") || null, contentHash: hash || null, eventFingerprint: fingerprint, evidenceRefs: internal.unique(x.evidenceRefs || []), observedAt: internal.text(x.observedAt, internal.nowIso()), availableAt: internal.text(x.availableAt, x.observedAt || internal.nowIso()), rawChanged: previous ? !sameHash : true, sameEventReobserved: sameEvent, newEventCreated: !sameEvent, recoveredFromGap: x.recoveredFromGap === true, monitoringGapId: internal.text(x.monitoringGapId, "") || null, summary: internal.text(x.summary, "") || null, createdAt: internal.nowIso(), immutable: true });
    const invalid = validateRecord("monitoringObservation", "EXTERNAL-010-SCHEMA-MONITORING-OBSERVATION", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_MONITORING_OBSERVATION_INVALID", "Blocked", invalid);
    state.monitoringObservations.set(record.monitoringObservationId, record); state.monitoringObservationOrder.push(record.monitoringObservationId); internal.touch();
    lineage(record.evidenceRefs, record.monitoringObservationId);
    return internal.buildResult(true, "EXTERNAL010_MONITORING_OBSERVATION_RECORDED", sameHash ? "Unchanged" : "Changed", { observation: internal.clone(record), previousObservationId: previous && previous.monitoringObservationId || null, dataChangedEqualsMaterialIntelligenceChange: false });
  }

  function createMaterialChange(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const obs = state.monitoringObservations.get(internal.text(x.monitoringObservationId, ""));
    if (!obs) return internal.buildResult(false, "EXTERNAL010_MONITORING_OBSERVATION_REQUIRED", "Blocked", null);
    const changeType = upper(x.changeType, "SIGNIFICANT_NEW_EVIDENCE");
    if (!CHANGE_TYPES.has(changeType)) return internal.buildResult(false, "EXTERNAL010_MATERIAL_CHANGE_TYPE_INVALID", "Blocked", { changeType: changeType });
    const materiality = upper(x.materiality, "MEDIUM");
    const fingerprint = internal.text(x.changeFingerprint, "") || [obs.watchId, changeType, obs.eventFingerprint || obs.contentHash || obs.monitoringObservationId].join("|");
    const priorId = state.monitoringAlertFingerprints.get(fingerprint);
    const materiallyUpdated = x.materiallyUpdated === true || Boolean(x.severityChanged) || Boolean(x.officialConfirmation) || Boolean(x.eventCompletion);
    const alertState = priorId && !materiallyUpdated ? "SUPPRESSED_DUPLICATE" : priorId ? "UPDATED_MATERIALLY" : "NEW";
    const record = internal.deepFreeze({ materialChangeId: internal.text(x.materialChangeId, "") || internal.nextId("EXTERNAL-010-MATERIAL-CHANGE"), watchId: obs.watchId, monitoringObservationId: obs.monitoringObservationId, changeType: changeType, materiality: materiality, changeFingerprint: fingerprint, alertState: alertState, rawChangeDetected: obs.rawChanged === true, semanticChangeDetected: x.semanticChangeDetected === true, materialChangeCandidate: true, duplicateOfMaterialChangeId: priorId || null, affectedEntityIds: internal.unique(x.affectedEntityIds || []), affectedPredictionIds: internal.unique(x.affectedPredictionIds || []), affectedHypothesisIds: internal.unique(x.affectedHypothesisIds || []), evidenceRefs: internal.unique((x.evidenceRefs || []).concat(obs.evidenceRefs || [])), actionAuthorityGranted: false, tradingAuthorityGranted: false, createdAt: internal.nowIso(), immutable: true });
    const invalid = validateRecord("materialChangeCandidate", "EXTERNAL-010-SCHEMA-MATERIAL-CHANGE-CANDIDATE", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_MATERIAL_CHANGE_INVALID", "Blocked", invalid);
    state.materialChangeCandidates.set(record.materialChangeId, record);
    if (alertState !== "SUPPRESSED_DUPLICATE") state.monitoringAlertFingerprints.set(fingerprint, record.materialChangeId);
    lineage([obs.monitoringObservationId].concat(record.evidenceRefs), record.materialChangeId);
    audit(alertState === "SUPPRESSED_DUPLICATE" ? "DUPLICATE_ALERT_SUPPRESSED" : "MATERIAL_CHANGE_DETECTED", alertState, { materialChangeId: record.materialChangeId, watchId: record.watchId, changeType: changeType });
    return internal.buildResult(true, alertState === "SUPPRESSED_DUPLICATE" ? "EXTERNAL010_MATERIAL_CHANGE_DUPLICATE_SUPPRESSED" : "EXTERNAL010_MATERIAL_CHANGE_CANDIDATE_CREATED", alertState, { materialChange: internal.clone(record), shouldNotifyCandidate: alertState !== "SUPPRESSED_DUPLICATE" });
  }

  function createChangePackage(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const change = state.materialChangeCandidates.get(internal.text(x.materialChangeId, ""));
    if (!change) return internal.buildResult(false, "EXTERNAL010_MATERIAL_CHANGE_NOT_FOUND", "Blocked", null);
    const packageCandidate = internal.deepFreeze({ changePackageId: internal.nextId("EXTERNAL-010-CHANGE-PACKAGE"), materialChangeId: change.materialChangeId, watchId: change.watchId, previousStateReference: internal.text(x.previousStateReference, "") || null, currentStateReference: change.monitoringObservationId, materialDifferences: internal.isPlainObject(x.materialDifferences) ? internal.clone(x.materialDifferences) : {}, newEvidenceRefs: internal.unique(change.evidenceRefs || []), contradictions: internal.clone(x.contradictions || []), affectedEntities: internal.unique(change.affectedEntityIds || []), affectedPredictions: internal.unique(change.affectedPredictionIds || []), affectedHypotheses: internal.unique(change.affectedHypothesisIds || []), recommendedResearchCandidateIds: internal.unique(x.recommendedResearchCandidateIds || []), actionAuthorityGranted: false, knowledgePromotionPerformed: false, createdAt: internal.nowIso(), immutable: true });
    return internal.buildResult(true, "EXTERNAL010_CHANGE_PACKAGE_CANDIDATE_CREATED", "Candidate", { changePackage: packageCandidate });
  }

  function createSelectiveRecompute(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const change = state.materialChangeCandidates.get(internal.text(x.materialChangeId, ""));
    if (!change) return internal.buildResult(false, "EXTERNAL010_MATERIAL_CHANGE_NOT_FOUND", "Blocked", null);
    const outputs = internal.unique(x.outputReferenceIds || []);
    const candidates = outputs.map(function make(outputReferenceId) {
      return typeof namespace.createExternalIntelligenceRecomputeCandidate === "function" ? namespace.createExternalIntelligenceRecomputeCandidate({ outputReferenceId: outputReferenceId, reason: "MATERIAL_CHANGE", triggerReferenceIds: [change.materialChangeId] }) : null;
    }).filter(Boolean);
    return internal.buildResult(candidates.every(function ok(r) { return r.ok === true; }), "EXTERNAL010_MONITORING_SELECTIVE_RECOMPUTE_CANDIDATES_CREATED", "Candidate", { candidates: candidates.map(function d(r) { return r.data && r.data.recomputeCandidate; }).filter(Boolean), automaticRecomputePerformed: false });
  }

  function recordOutcomeEvaluation(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watch = typeof namespace.getExternalIntelligenceWatch === "function" ? namespace.getExternalIntelligenceWatch(x.watchId) : null;
    if (!watch) return internal.buildResult(false, "EXTERNAL010_MONITORING_WATCH_REQUIRED", "Blocked", null);
    const record = internal.deepFreeze({ monitoringOutcomeEvaluationId: internal.text(x.monitoringOutcomeEvaluationId, "") || internal.nextId("EXTERNAL-010-MONITORING-OUTCOME-EVALUATION"), watchId: watch.watchId, outcomeId: internal.text(x.outcomeId, "") || null, monitoringCost: Number.isFinite(x.monitoringCost) ? x.monitoringCost : 0, usefulSignalCount: Number.isFinite(x.usefulSignalCount) ? x.usefulSignalCount : 0, falseAlertCount: Number.isFinite(x.falseAlertCount) ? x.falseAlertCount : 0, missedSignalCount: Number.isFinite(x.missedSignalCount) ? x.missedSignalCount : 0, detectionLeadTimeMs: Number.isFinite(x.detectionLeadTimeMs) ? x.detectionLeadTimeMs : null, lateDetection: x.lateDetection === true, resourceEfficiency: Number.isFinite(x.resourceEfficiency) ? x.resourceEfficiency : null, policyChangeAppliedAutomatically: false, monitoringPolicyAuthorityGranted: false, createdAt: internal.nowIso(), immutable: true });
    const invalid = validateRecord("monitoringOutcomeEvaluation", "EXTERNAL-010-SCHEMA-MONITORING-OUTCOME-EVALUATION", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_MONITORING_OUTCOME_EVALUATION_INVALID", "Blocked", invalid);
    state.monitoringOutcomeEvaluations.set(record.monitoringOutcomeEvaluationId, record);
    audit("MONITORING_OUTCOME_EVALUATED", "Recorded", { watchId: watch.watchId, monitoringOutcomeEvaluationId: record.monitoringOutcomeEvaluationId });
    return internal.buildResult(true, "EXTERNAL010_MONITORING_OUTCOME_EVALUATION_RECORDED", "Ready", { evaluation: internal.clone(record), futurePolicyChangeRequiresProposalValidationAuthority: true });
  }

  function listChanges(watchId) { return Array.from(state.materialChangeCandidates.values()).filter(function f(r) { return !watchId || r.watchId === watchId; }).map(internal.clone); }
  function getObservation(id) { const r = state.monitoringObservations.get(internal.text(id, "")); return r ? internal.clone(r) : null; }

  Object.assign(namespace.api, { recordExternalIntelligenceMonitoringObservation: recordObservation, createExternalIntelligenceMaterialChangeCandidate: createMaterialChange, createExternalIntelligenceChangePackageCandidate: createChangePackage, createExternalIntelligenceMonitoringSelectiveRecomputeCandidates: createSelectiveRecompute, recordExternalIntelligenceMonitoringOutcomeEvaluation: recordOutcomeEvaluation, listExternalIntelligenceMaterialChanges: listChanges, getExternalIntelligenceMonitoringObservation: getObservation });
  Object.assign(namespace, namespace.api);
  namespace.modules.monitoringChange = { id: "EXTERNAL-010-MONITORING-CHANGE-MATERIALITY", version: MODULE_VERSION, status: "Ready", phase: 16, decisions: ["045"], rawChangeSeparatedFromMateriality: true, duplicateSuppression: true, selectiveRecomputeCandidateOnly: true, outcomeGroundedLearningHook: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
