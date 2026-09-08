/* ============================================================
   FILE: 17_external_intelligence_social_influence.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.12.0
   Phase 13: Social Influence / Outcome-Grounded Learning / Decision 029-031 Hooks
   Primary Decision: 034
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("socialInfluence");
  ["socialAuthorProfiles", "socialAuthorProfileVersions", "socialMarketReactions", "socialInfluenceEvaluations"].forEach(function (key) { if (!(state[key] instanceof Map)) state[key] = new Map(); });
  function validateRecord(contractKey, schemaId, record) { const c = namespace.validateExternalIntelligenceContract(contractKey, record), s = namespace.validateExternalIntelligenceRecord(schemaId, record); return c.valid && s.valid ? null : { contract: c, schema: s }; }
  function linkLineage(refs, output, relation) { const list = internal.unique(refs || []).filter(Boolean); if (!list.length || typeof namespace.createExternalIntelligenceLineageRecord !== "function") return { ok: true, lineageRecords: [] }; const results = list.map(function (ref) { return namespace.createExternalIntelligenceLineageRecord({ inputReferenceId: ref, outputReferenceId: output, relationType: relation || "DERIVED_FROM", lineageState: "ACTIVE" }); }); return { ok: results.every(function (x) { return x && x.ok === true; }), lineageRecords: results.map(function (x) { return x && x.data && x.data.lineageRecord; }).filter(Boolean), results: results }; }

  function recordExternalIntelligenceSocialAuthorProfile(input) {
    const source = internal.isPlainObject(input) ? input : {}, governedSource = state.sourceRegistry.get(internal.text(source.platformSourceId, ""));
    if (!governedSource || !(VERSION_MANIFEST.socialIntelligence.sourceTypes || []).includes(governedSource.sourceType)) return internal.buildResult(false, "EXTERNAL010_SOCIAL_AUTHOR_SOURCE_REQUIRED", "Blocked", null);
    const accountId = internal.text(source.accountId, ""); if (!accountId) return internal.buildResult(false, "EXTERNAL010_SOCIAL_AUTHOR_ACCOUNT_REQUIRED", "Blocked", null);
    const id = internal.text(source.accountProfileId, "") || ("EXTERNAL-010-AUTHOR-PROFILE-" + governedSource.sourceId + "-" + accountId), previous = state.socialAuthorProfiles.get(id), version = previous ? previous.version + 1 : 1;
    const record = internal.deepFreeze({ accountProfileId: id, version: version, profileRecordId: id + "-V" + version, platformSourceId: governedSource.sourceId, accountId: accountId, identityMode: "PSEUDONYMOUS_ACCOUNT", domainProfile: internal.isPlainObject(source.domainProfile) ? internal.clone(source.domainProfile) : {}, horizonProfile: internal.isPlainObject(source.horizonProfile) ? internal.clone(source.horizonProfile) : {}, historicalRelevantPostCount: Math.max(0, Number(source.historicalRelevantPostCount) || 0), averageReach: Number.isFinite(source.averageReach) ? source.averageReach : null, averagePropagationVelocity: Number.isFinite(source.averagePropagationVelocity) ? source.averagePropagationVelocity : null, historicalFactualAccuracy: source.historicalFactualAccuracy === undefined ? null : internal.clone(source.historicalFactualAccuracy), historicalMarketReactionFrequency: Number.isFinite(source.historicalMarketReactionFrequency) ? source.historicalMarketReactionFrequency : null, medianReactionLag: Number.isFinite(source.medianReactionLag) ? source.medianReactionLag : null, historicalFalseSignalRate: Number.isFinite(source.historicalFalseSignalRate) ? source.historicalFalseSignalRate : null, accuracyEqualsInfluence: false, samePersonConfirmed: false, createdAt: internal.nowIso(), immutable: true });
    const invalid = validateRecord("socialAuthorProfile", "EXTERNAL-010-SCHEMA-SOCIAL-AUTHOR-PROFILE", record); if (invalid) return internal.buildResult(false, "EXTERNAL010_SOCIAL_AUTHOR_PROFILE_INVALID", "Blocked", invalid);
    state.socialAuthorProfiles.set(id, record); state.socialAuthorProfileVersions.set(record.profileRecordId, record); internal.touch(); return internal.buildResult(true, "EXTERNAL010_SOCIAL_AUTHOR_PROFILE_RECORDED", "Ready", { authorProfile: internal.clone(record) });
  }

  function recordExternalIntelligenceSocialMarketReaction(input) {
    const source = internal.isPlainObject(input) ? input : {}, outcomeRefs = internal.unique(source.referenceOutcomeIds || []);
    if (outcomeRefs.some(function (id) { return !state.outcomeRecords.has(id) && !Array.from(state.outcomeVersions.values()).some(function (o) { return o.outcomeId === id || o.outcomeRecordId === id; }); })) return internal.buildResult(false, "EXTERNAL010_SOCIAL_OUTCOME_REFERENCE_MISSING", "Blocked", { referenceOutcomeIds: outcomeRefs });
    const id = internal.text(source.marketReactionId, "") || internal.nextId("EXTERNAL-010-SOCIAL-MARKET-REACTION");
    const record = internal.deepFreeze({ marketReactionId: id, socialSignalRef: internal.text(source.socialSignalRef, ""), targetEntityId: internal.text(source.targetEntityId, "") || null, timeline: Array.isArray(source.timeline) ? internal.clone(source.timeline) : [], dimensions: internal.isPlainObject(source.dimensions) ? internal.clone(source.dimensions) : {}, absoluteReaction: internal.isPlainObject(source.absoluteReaction) ? internal.clone(source.absoluteReaction) : {}, relativeReaction: internal.isPlainObject(source.relativeReaction) ? internal.clone(source.relativeReaction) : {}, referenceOutcomeIds: outcomeRefs, leadTimeMs: Number.isFinite(source.leadTimeMs) ? source.leadTimeMs : null, causationConfirmed: false, tradingAuthorityGranted: false, createdAt: internal.nowIso(), immutable: true });
    if (!record.socialSignalRef) return internal.buildResult(false, "EXTERNAL010_SOCIAL_SIGNAL_REFERENCE_REQUIRED", "Blocked", null);
    const invalid = validateRecord("socialMarketReaction", "EXTERNAL-010-SCHEMA-SOCIAL-MARKET-REACTION", record); if (invalid) return internal.buildResult(false, "EXTERNAL010_SOCIAL_MARKET_REACTION_INVALID", "Blocked", invalid);
    state.socialMarketReactions.set(id, record); const lineage = linkLineage([record.socialSignalRef].concat(outcomeRefs), id, "DEPENDS_ON"); if (!lineage.ok) { state.socialMarketReactions.delete(id); return internal.buildResult(false, "EXTERNAL010_SOCIAL_MARKET_REACTION_LINEAGE_FAILED", "Blocked", lineage); }
    internal.touch(); return internal.buildResult(true, "EXTERNAL010_SOCIAL_MARKET_REACTION_RECORDED", "Ready", { marketReaction: internal.clone(record), lineageRecords: internal.clone(lineage.lineageRecords) });
  }

  function recordExternalIntelligenceSocialInfluenceEvaluation(input) {
    const source = internal.isPlainObject(input) ? input : {}, ids = internal.unique(source.marketReactionIds || []), reactions = ids.map(function (id) { return state.socialMarketReactions.get(id); }).filter(Boolean);
    if (!ids.length || reactions.length !== ids.length) return internal.buildResult(false, "EXTERNAL010_SOCIAL_MARKET_REACTIONS_REQUIRED", "Blocked", { marketReactionIds: ids });
    const sampleCount = Math.max(reactions.length, Number(source.sampleCount) || reactions.length), id = internal.text(source.socialInfluenceEvaluationId, "") || internal.nextId("EXTERNAL-010-SOCIAL-INFLUENCE-EVALUATION");
    const record = internal.deepFreeze({ socialInfluenceEvaluationId: id, subjectType: internal.text(source.subjectType, "NARRATIVE").toUpperCase(), subjectId: internal.text(source.subjectId, ""), marketReactionIds: ids, sampleCount: sampleCount, historicalPredictiveness: Number.isFinite(source.historicalPredictiveness) ? source.historicalPredictiveness : null, reactionFrequency: Number.isFinite(source.reactionFrequency) ? source.reactionFrequency : null, medianLeadTimeMs: Number.isFinite(source.medianLeadTimeMs) ? source.medianLeadTimeMs : null, falsePositiveRate: Number.isFinite(source.falsePositiveRate) ? source.falsePositiveRate : null, confidence: internal.text(source.confidence, "UNKNOWN").toUpperCase(), leadingIndicatorCandidate: source.leadingIndicatorCandidate === true, falseSignalsPreserved: true, causationConfirmed: false, financialAuthorityGranted: false, tradingAuthorityGranted: false, createdAt: internal.nowIso(), immutable: true });
    if (!record.subjectId) return internal.buildResult(false, "EXTERNAL010_SOCIAL_INFLUENCE_SUBJECT_REQUIRED", "Blocked", null);
    const invalid = validateRecord("socialInfluenceEvaluation", "EXTERNAL-010-SCHEMA-SOCIAL-INFLUENCE-EVALUATION", record); if (invalid) return internal.buildResult(false, "EXTERNAL010_SOCIAL_INFLUENCE_EVALUATION_INVALID", "Blocked", invalid);
    state.socialInfluenceEvaluations.set(id, record); const lineage = linkLineage(ids, id, "AGGREGATED_FROM"); if (!lineage.ok) { state.socialInfluenceEvaluations.delete(id); return internal.buildResult(false, "EXTERNAL010_SOCIAL_INFLUENCE_EVALUATION_LINEAGE_FAILED", "Blocked", lineage); }
    internal.touch(); return internal.buildResult(true, "EXTERNAL010_SOCIAL_INFLUENCE_EVALUATION_RECORDED", "Candidate", { evaluation: internal.clone(record), lineageRecords: internal.clone(lineage.lineageRecords) });
  }

  function createExternalIntelligenceSocialImpactHook(input) {
    const source = internal.isPlainObject(input) ? input : {}, reaction = state.socialMarketReactions.get(internal.text(source.marketReactionId, ""));
    if (!reaction) return internal.buildResult(false, "EXTERNAL010_SOCIAL_MARKET_REACTION_REQUIRED", "Blocked", null);
    if (typeof namespace.createExternalIntelligenceImpactEdge !== "function") return internal.buildResult(false, "EXTERNAL010_SOCIAL_IMPACT_GRAPH_UNAVAILABLE", "Blocked", null);
    const lagMinutes = reaction.leadTimeMs == null ? null : reaction.leadTimeMs / 60000;
    const edge = namespace.createExternalIntelligenceImpactEdge({ impactEdgeId: source.impactEdgeId, fromNodeId: reaction.socialSignalRef, toNodeId: reaction.targetEntityId || reaction.marketReactionId, fromNodeType: "SOCIAL_SIGNAL", toNodeType: reaction.targetEntityId ? "ENTITY" : "MARKET_REACTION", impactType: "SOCIAL_MARKET_INFLUENCE", impactDimension: internal.text(source.impactDimension, "MARKET_PRICE").toUpperCase(), direction: internal.text(source.direction, "UNKNOWN").toUpperCase(), impactStrength: source.impactStrength, confidence: source.confidence, causalState: "INFLUENCE_CANDIDATE", expectedLag: lagMinutes == null ? { amount: null, unit: "UNKNOWN" } : { amount: lagMinutes, unit: "MINUTE" }, timeHorizon: internal.text(source.timeHorizon, "SHORT_TERM").toUpperCase(), supportingEvidenceIds: internal.unique(source.supportingEvidenceIds || []), historicalSampleCount: Number(source.historicalSampleCount) || 0, candidateConfounders: internal.unique(source.candidateConfounders || []) });
    return internal.buildResult(edge && edge.ok === true, edge && edge.ok ? "EXTERNAL010_SOCIAL_IMPACT_HOOK_CREATED" : "EXTERNAL010_SOCIAL_IMPACT_HOOK_FAILED", edge && edge.ok ? "Candidate" : "Blocked", { impactEdge: edge && edge.data && edge.data.impactEdge, decision029Integrated: edge && edge.ok === true, causationConfirmed: false });
  }

  function createExternalIntelligenceSocialPredictionHook(input) {
    const source = internal.isPlainObject(input) ? input : {};
    if (typeof namespace.registerExternalIntelligencePrediction !== "function") return internal.buildResult(false, "EXTERNAL010_SOCIAL_UNCERTAINTY_PLATFORM_UNAVAILABLE", "Blocked", null);
    const result = namespace.registerExternalIntelligencePrediction({ predictionId: source.predictionId, subjectRef: internal.text(source.subjectRef, ""), predictionType: internal.text(source.predictionType, "SOCIAL_MARKET_REACTION_CANDIDATE"), targetTime: source.targetTime, probabilityState: internal.text(source.probabilityState, "NOT_ESTIMATED"), probability: source.probability, estimateConfidence: internal.text(source.estimateConfidence, "UNKNOWN"), evidenceStrength: internal.text(source.evidenceStrength, "UNKNOWN"), historicalSampleCount: source.historicalSampleCount, predictionInterval: source.predictionInterval, uncertaintyFactors: internal.unique(source.uncertaintyFactors || []), modelId: source.modelId, modelVersion: source.modelVersion, evidenceIds: internal.unique(source.evidenceIds || []), outcomeReference: source.outcomeReference, calibrationState: internal.text(source.calibrationState, "UNASSESSED") });
    return internal.buildResult(result && result.ok === true, result && result.ok ? "EXTERNAL010_SOCIAL_PREDICTION_HOOK_CREATED" : "EXTERNAL010_SOCIAL_PREDICTION_HOOK_FAILED", result && result.ok ? "Candidate" : "Blocked", { prediction: result && result.data && result.data.prediction, decision030Integrated: result && result.ok === true, noInventedProbability: result && result.ok === true && result.data.prediction.probabilityInvented === false });
  }

  function listExternalIntelligenceSocialAuthorProfileHistory(id) { return Array.from(state.socialAuthorProfileVersions.values()).filter(function (r) { return r.accountProfileId === id; }).sort(function (a, b) { return a.version - b.version; }).map(internal.clone); }
  Object.assign(namespace.api, { recordExternalIntelligenceSocialAuthorProfile, recordExternalIntelligenceSocialMarketReaction, recordExternalIntelligenceSocialInfluenceEvaluation, createExternalIntelligenceSocialImpactHook, createExternalIntelligenceSocialPredictionHook, listExternalIntelligenceSocialAuthorProfileHistory });
  Object.assign(namespace, namespace.api);
  namespace.modules.socialInfluence = { id: "EXTERNAL-010-SOCIAL-INFLUENCE", version: MODULE_VERSION, status: "Ready", phase: 13, decisions: ["034"], finalReliabilityAuthority: "EXTERNAL-020", decision029ImpactHook: true, decision030UncertaintyHook: true, decision031OutcomeIntegration: true, lineageIntegration: true, tradingAuthorityGranted: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
