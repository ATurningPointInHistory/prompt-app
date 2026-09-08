/* ============================================================
   FILE: 17_external_intelligence_impact_graph.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.8.0
   Phase 09: Temporal Impact Propagation / Historical Analog Foundation
   Primary Decision: 029
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 impact graph blocked: dependencies missing.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("impactGraph");
  const DIRECTIONS = new Set(VERSION_MANIFEST.impactGraph.directions || []);
  const CAUSAL_STATES = new Set(VERSION_MANIFEST.impactGraph.causalStates || []);
  const DIMENSIONS = new Set(VERSION_MANIFEST.impactGraph.impactDimensions || []);
  const HORIZONS = new Set(VERSION_MANIFEST.impactGraph.timeHorizons || []);
  const STAGE_STATES = new Set(VERSION_MANIFEST.impactGraph.stageStates || []);
  const LAG_UNITS = new Set(VERSION_MANIFEST.impactGraph.lagUnits || []);

  [
    "impactEdges", "impactPaths", "impactObservations", "historicalAnalogCandidates",
    "scenarioCandidates", "impactOutcomeEvaluationCandidates"
  ].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  function nullableNumber(value) {
    return value === null || value === undefined || value === "" ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
  }

  function normalizeLag(value) {
    const source = internal.isPlainObject(value) ? value : {};
    const amount = nullableNumber(source.amount);
    const unit = internal.text(source.unit, "UNKNOWN").toUpperCase();
    if (!LAG_UNITS.has(unit)) return null;
    if (amount !== null && amount < 0) return null;
    return { amount, unit };
  }

  function lagToMilliseconds(lag) {
    if (!lag || lag.amount === null) return null;
    const multiplier = {
      MILLISECOND: 1,
      SECOND: 1000,
      MINUTE: 60000,
      HOUR: 3600000,
      DAY: 86400000,
      WEEK: 604800000,
      MONTH: 2592000000,
      YEAR: 31536000000
    }[lag.unit];
    return multiplier ? lag.amount * multiplier : null;
  }

  function edgeRecord(input, impactEdgeId, existing) {
    const source = internal.isPlainObject(input) ? input : {};
    const earliestLag = normalizeLag(source.earliestLag);
    const expectedLag = normalizeLag(source.expectedLag);
    const latestLag = normalizeLag(source.latestLag);
    return {
      impactEdgeId,
      fromNodeId: internal.text(source.fromNodeId || source.sourceReferenceId, ""),
      toNodeId: internal.text(source.toNodeId || source.targetReferenceId, ""),
      fromNodeType: internal.text(source.fromNodeType || source.sourceReferenceType, "UNKNOWN").toUpperCase(),
      toNodeType: internal.text(source.toNodeType || source.targetReferenceType, "UNKNOWN").toUpperCase(),
      impactType: internal.text(source.impactType, "GENERAL_IMPACT").toUpperCase(),
      impactDimension: internal.text(source.impactDimension, "UNKNOWN").toUpperCase(),
      direction: internal.text(source.direction, "UNKNOWN").toUpperCase(),
      impactStrength: nullableNumber(source.impactStrength !== undefined ? source.impactStrength : source.strength),
      confidence: nullableNumber(source.confidence),
      causalState: internal.text(source.causalState, "UNKNOWN").toUpperCase(),
      earliestLag,
      expectedLag,
      latestLag,
      lagDistributionReference: internal.text(source.lagDistributionReference, "") || null,
      lagDistributionHook: true,
      impactDuration: internal.isPlainObject(source.impactDuration) ? internal.clone(source.impactDuration) : null,
      decayModel: internal.isPlainObject(source.decayModel) ? internal.clone(source.decayModel) : null,
      supportingEvidenceIds: internal.unique(source.supportingEvidenceIds || source.supportingEvidenceRefs),
      contradictingEvidenceIds: internal.unique(source.contradictingEvidenceIds || source.counterEvidenceRefs),
      historicalEvidenceIds: internal.unique(source.historicalEvidenceIds || source.historicalEvidenceRefs),
      historicalSampleCount: Number.isInteger(Number(source.historicalSampleCount)) && Number(source.historicalSampleCount) >= 0 ? Number(source.historicalSampleCount) : 0,
      candidateConfounders: internal.unique(source.candidateConfounders),
      modelId: internal.text(source.modelId, "PHASE9-FOUNDATION-MODEL"),
      modelVersion: internal.text(source.modelVersion, "1.0.0"),
      evidenceLineagePreserved: true,
      causalTruthConfirmed: false,
      correlationEqualsCausation: false,
      temporalProximityEqualsCausation: false,
      actionAuthorityGranted: false,
      financialAuthorityGranted: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      updatedAt: existing ? existing.updatedAt : internal.nowIso(),
      immutable: true
    };
  }

  function createExternalIntelligenceImpactEdge(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const impactEdgeId = internal.text(source.impactEdgeId, "") || internal.nextId("EXTERNAL-010-IMPACT-EDGE");
    const existing = state.impactEdges.get(impactEdgeId);
    const record = edgeRecord(source, impactEdgeId, existing);

    if (!record.fromNodeId || !record.toNodeId || record.fromNodeId === record.toNodeId) {
      return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_INVALID_NODES", "Blocked", { fromNodeId: record.fromNodeId, toNodeId: record.toNodeId });
    }
    if (!DIRECTIONS.has(record.direction) || !CAUSAL_STATES.has(record.causalState) || !DIMENSIONS.has(record.impactDimension)) {
      return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_INVALID_TAXONOMY", "Blocked", {
        direction: record.direction,
        causalState: record.causalState,
        impactDimension: record.impactDimension
      });
    }
    const timeHorizon = internal.text(source.timeHorizon, "UNKNOWN").toUpperCase();
    if (!HORIZONS.has(timeHorizon)) return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_INVALID_HORIZON", "Blocked", { timeHorizon });
    record.timeHorizon = timeHorizon;

    if ((source.earliestLag && !record.earliestLag) || (source.expectedLag && !record.expectedLag) || (source.latestLag && !record.latestLag)) {
      return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_INVALID_LAG", "Blocked", null);
    }
    const earliestMs = lagToMilliseconds(record.earliestLag);
    const expectedMs = lagToMilliseconds(record.expectedLag);
    const latestMs = lagToMilliseconds(record.latestLag);
    if (earliestMs !== null && expectedMs !== null && expectedMs < earliestMs) return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_LAG_ORDER_INVALID", "Blocked", null);
    if (expectedMs !== null && latestMs !== null && latestMs < expectedMs) return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_LAG_ORDER_INVALID", "Blocked", null);
    if (earliestMs !== null && latestMs !== null && latestMs < earliestMs) return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_LAG_ORDER_INVALID", "Blocked", null);

    const contract = namespace.validateExternalIntelligenceContract("impactEdge", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-IMPACT-EDGE", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_INVALID", "Blocked", { contract, schema });

    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_IMPACT_EDGE_ALREADY_REGISTERED" : "EXTERNAL010_IMPACT_EDGE_CONFLICT", same ? "Ready" : "Blocked", { impactEdge: internal.clone(existing) });
    }

    const frozen = internal.deepFreeze(internal.clone(record));
    state.impactEdges.set(impactEdgeId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_IMPACT_EDGE_CREATED", "Ready", { impactEdge: internal.clone(frozen) });
  }

  function buildStages(edgeIds) {
    const stages = [];
    edgeIds.forEach(function each(edgeId, index) {
      const edge = state.impactEdges.get(edgeId);
      if (!edge) return;
      if (index === 0) stages.push({ stageIndex: 0, nodeId: edge.fromNodeId, nodeType: edge.fromNodeType, state: "OBSERVED" });
      stages.push({ stageIndex: index + 1, nodeId: edge.toNodeId, nodeType: edge.toNodeType, state: "NOT_OBSERVED" });
    });
    return stages;
  }

  function calculatePathLag(edgeIds) {
    let earliestMs = 0, expectedMs = 0, latestMs = 0;
    let earliestKnown = true, expectedKnown = true, latestKnown = true;
    edgeIds.forEach(function sum(edgeId) {
      const edge = state.impactEdges.get(edgeId);
      if (!edge) return;
      const a = lagToMilliseconds(edge.earliestLag), b = lagToMilliseconds(edge.expectedLag), c = lagToMilliseconds(edge.latestLag);
      if (a === null) earliestKnown = false; else earliestMs += a;
      if (b === null) expectedKnown = false; else expectedMs += b;
      if (c === null) latestKnown = false; else latestMs += c;
    });
    return {
      earliestMilliseconds: earliestKnown ? earliestMs : null,
      expectedMilliseconds: expectedKnown ? expectedMs : null,
      latestMilliseconds: latestKnown ? latestMs : null,
      distributionBasedPathTimingHook: true
    };
  }

  function createExternalIntelligenceImpactPath(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const impactPathId = internal.text(source.impactPathId, "") || internal.nextId("EXTERNAL-010-IMPACT-PATH");
    const edgeIds = internal.unique(source.edgeIds);
    if (!edgeIds.length || edgeIds.some(function missing(id) { return !state.impactEdges.has(id); })) {
      return internal.buildResult(false, "EXTERNAL010_IMPACT_PATH_EDGE_NOT_FOUND", "Blocked", { edgeIds });
    }
    for (let index = 1; index < edgeIds.length; index += 1) {
      const previous = state.impactEdges.get(edgeIds[index - 1]);
      const current = state.impactEdges.get(edgeIds[index]);
      if (previous.toNodeId !== current.fromNodeId) {
        return internal.buildResult(false, "EXTERNAL010_IMPACT_PATH_DISCONNECTED", "Blocked", { previousEdgeId: previous.impactEdgeId, currentEdgeId: current.impactEdgeId });
      }
    }

    const existing = state.impactPaths.get(impactPathId);
    const record = internal.deepFreeze({
      impactPathId,
      triggerEventId: internal.text(source.triggerEventId, "") || null,
      edgeIds,
      stages: buildStages(edgeIds),
      pathState: internal.text(source.pathState, "CANDIDATE").toUpperCase(),
      currentStageIndex: 0,
      pathTiming: calculatePathLag(edgeIds),
      modelId: internal.text(source.modelId, "PHASE9-FOUNDATION-MODEL"),
      modelVersion: internal.text(source.modelVersion, "1.0.0"),
      predictionCandidateOnly: true,
      canonicalCausalTruthConfirmed: false,
      automaticActionPerformed: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    });

    const contract = namespace.validateExternalIntelligenceContract("impactPath", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-IMPACT-PATH", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_IMPACT_PATH_INVALID", "Blocked", { contract, schema });
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_IMPACT_PATH_ALREADY_REGISTERED" : "EXTERNAL010_IMPACT_PATH_CONFLICT", same ? "Ready" : "Blocked", { impactPath: internal.clone(existing) });
    }
    state.impactPaths.set(impactPathId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_IMPACT_PATH_CREATED", "Ready", { impactPath: internal.clone(record) });
  }

  function listObservations(impactPathId) {
    return Array.from(state.impactObservations.values())
      .filter(function filter(record) { return record.impactPathId === impactPathId; })
      .sort(function sort(a, b) { return a.stageIndex - b.stageIndex || Date.parse(a.observedAt) - Date.parse(b.observedAt); });
  }

  function calculateExternalIntelligenceRemainingImpactPath(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const impactPathId = internal.text(source.impactPathId, "");
    const path = state.impactPaths.get(impactPathId);
    if (!path) return internal.buildResult(false, "EXTERNAL010_IMPACT_PATH_NOT_FOUND", "Blocked", { impactPathId });

    const observations = listObservations(impactPathId);
    const observedStageIndex = observations.length ? Math.max.apply(null, observations.map(function index(record) { return record.stageIndex; })) : 0;
    const remainingEdgeIds = path.edgeIds.slice(Math.max(0, observedStageIndex));
    const timing = calculatePathLag(remainingEdgeIds);
    const observedAt = observations.length ? observations[observations.length - 1].observedAt : null;
    const base = observedAt ? Date.parse(observedAt) : null;
    const expectedArrivalWindow = base === null ? null : {
      earliestAt: timing.earliestMilliseconds === null ? null : new Date(base + timing.earliestMilliseconds).toISOString(),
      expectedAt: timing.expectedMilliseconds === null ? null : new Date(base + timing.expectedMilliseconds).toISOString(),
      latestAt: timing.latestMilliseconds === null ? null : new Date(base + timing.latestMilliseconds).toISOString()
    };

    return internal.buildResult(true, "EXTERNAL010_REMAINING_IMPACT_PATH_CALCULATED", "Ready", {
      impactPathId,
      observedStageIndex,
      remainingEdgeIds,
      remainingLag: timing,
      expectedArrivalWindow,
      completedLagExcludedFromFuturePrediction: true,
      predictionCandidateOnly: true
    });
  }

  function recordExternalIntelligenceImpactObservation(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const impactPathId = internal.text(source.impactPathId, "");
    const path = state.impactPaths.get(impactPathId);
    if (!path) return internal.buildResult(false, "EXTERNAL010_IMPACT_PATH_NOT_FOUND", "Blocked", { impactPathId });
    const stageIndex = Number.isInteger(Number(source.stageIndex)) ? Number(source.stageIndex) : -1;
    const stageState = internal.text(source.stageState, "OBSERVED").toUpperCase();
    if (stageIndex < 0 || stageIndex >= path.stages.length || !STAGE_STATES.has(stageState)) {
      return internal.buildResult(false, "EXTERNAL010_IMPACT_OBSERVATION_INVALID_STAGE", "Blocked", { stageIndex, stageState });
    }
    const observedAtText = internal.text(source.observedAt, "");
    const observedAtMs = Date.parse(observedAtText);
    if (!observedAtText || !Number.isFinite(observedAtMs)) return internal.buildResult(false, "EXTERNAL010_IMPACT_OBSERVATION_TIME_REQUIRED", "Blocked", null);
    const observedAt = new Date(observedAtMs).toISOString();
    const impactObservationId = internal.text(source.impactObservationId, "") || [impactPathId, stageIndex, stageState, observedAt].join("::");
    const existing = state.impactObservations.get(impactObservationId);

    const provisional = {
      impactObservationId,
      impactPathId,
      stageIndex,
      stageState,
      observedReferenceId: internal.text(source.observedReferenceId, path.stages[stageIndex].nodeId),
      observedAt,
      supportingEvidenceIds: internal.unique(source.supportingEvidenceIds || source.evidenceRefs),
      remainingEdgeIds: path.edgeIds.slice(Math.max(0, stageIndex)),
      remainingLagRecalculationPerformed: true,
      finalOutcomeConfirmed: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("impactObservation", provisional);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-IMPACT-OBSERVATION", provisional);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_IMPACT_OBSERVATION_INVALID", "Blocked", { contract, schema });
    const record = internal.deepFreeze(internal.clone(provisional));
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      const remaining = same ? calculateExternalIntelligenceRemainingImpactPath({ impactPathId }) : null;
      return internal.buildResult(
        same,
        same ? "EXTERNAL010_IMPACT_OBSERVATION_ALREADY_RECORDED" : "EXTERNAL010_IMPACT_OBSERVATION_CONFLICT",
        same ? "Ready" : "Blocked",
        {
          impactObservation: internal.clone(existing),
          remainingPath: remaining && remaining.ok ? remaining.data : null
        }
      );
    }
    state.impactObservations.set(impactObservationId, record);
    internal.touch();
    const remaining = calculateExternalIntelligenceRemainingImpactPath({ impactPathId });
    return internal.buildResult(true, "EXTERNAL010_IMPACT_OBSERVATION_RECORDED", "Ready", {
      impactObservation: internal.clone(record),
      remainingPath: remaining.ok ? remaining.data : null
    });
  }

  function createExternalIntelligenceHistoricalAnalogCandidate(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const historicalAnalogCandidateId = internal.text(source.historicalAnalogCandidateId || source.analogId, "") || internal.nextId("EXTERNAL-010-HISTORICAL-ANALOG");
    const currentEventId = internal.text(source.currentEventId || source.currentReferenceId, "");
    const historicalEventId = internal.text(source.historicalEventId || source.historicalReferenceId, "");
    const similarityDimensions = internal.unique(source.similarityDimensions || source.similarities);
    const differenceDimensions = internal.unique(source.differenceDimensions || source.materialDifferences);
    if (!currentEventId || !historicalEventId || !differenceDimensions.length) {
      return internal.buildResult(false, "EXTERNAL010_HISTORICAL_ANALOG_INVALID_INPUT", "Blocked", { currentEventId, historicalEventId, differenceDimensions });
    }
    const existing = state.historicalAnalogCandidates.get(historicalAnalogCandidateId);
    const record = internal.deepFreeze({
      historicalAnalogCandidateId,
      currentEventId,
      historicalEventId,
      similarityScore: nullableNumber(source.similarityScore !== undefined ? source.similarityScore : source.similarity),
      similarityDimensions,
      differenceDimensions,
      historicalImpactPathIds: internal.unique(source.historicalImpactPathIds),
      outcomeReferences: internal.unique(source.outcomeReferences),
      supportingEvidenceIds: internal.unique(source.supportingEvidenceIds || source.evidenceRefs),
      analysisVersion: internal.text(source.analysisVersion, "1.0.0"),
      modelId: internal.text(source.modelId, "PHASE9-ANALOG-FOUNDATION"),
      modelVersion: internal.text(source.modelVersion, "1.0.0"),
      historicalAnalogEqualsSameOutcome: false,
      automaticPredictionGranted: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    });
    const contract = namespace.validateExternalIntelligenceContract("historicalAnalogCandidate", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-HISTORICAL-ANALOG-CANDIDATE", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_HISTORICAL_ANALOG_INVALID", "Blocked", { contract, schema });
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_HISTORICAL_ANALOG_ALREADY_REGISTERED" : "EXTERNAL010_HISTORICAL_ANALOG_CONFLICT", same ? "Ready" : "Blocked", { historicalAnalogCandidate: internal.clone(existing) });
    }
    state.historicalAnalogCandidates.set(historicalAnalogCandidateId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_HISTORICAL_ANALOG_CREATED", "Ready", { historicalAnalogCandidate: internal.clone(record) });
  }

  function createExternalIntelligenceScenarioCandidate(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const scenarioCandidateId = internal.text(source.scenarioCandidateId || source.scenarioId, "") || internal.nextId("EXTERNAL-010-SCENARIO-CANDIDATE");
    const triggerEventId = internal.text(source.triggerEventId, "");
    const impactPathIds = internal.unique(source.impactPathIds);
    if (!triggerEventId || !impactPathIds.length || impactPathIds.some(function missing(id) { return !state.impactPaths.has(id); })) {
      return internal.buildResult(false, "EXTERNAL010_SCENARIO_CANDIDATE_INVALID_INPUT", "Blocked", { triggerEventId, impactPathIds });
    }
    const existing = state.scenarioCandidates.get(scenarioCandidateId);
    const record = internal.deepFreeze({
      scenarioCandidateId,
      triggerEventId,
      impactPathIds,
      historicalAnalogIds: internal.unique(source.historicalAnalogIds),
      expectedStages: Array.isArray(source.expectedStages) ? internal.clone(source.expectedStages) : [],
      expectedTiming: internal.isPlainObject(source.expectedTiming) ? internal.clone(source.expectedTiming) : {},
      expectedDirection: internal.text(source.expectedDirection, "UNKNOWN").toUpperCase(),
      confidence: source.confidence === undefined ? "UNKNOWN" : source.confidence,
      importantAssumptions: internal.unique(source.importantAssumptions),
      riskFactors: internal.unique(source.riskFactors),
      contradictingEvidenceIds: internal.unique(source.contradictingEvidenceIds),
      modelId: internal.text(source.modelId, "PHASE9-SCENARIO-FOUNDATION"),
      modelVersion: internal.text(source.modelVersion, "1.0.0"),
      scenarioCandidateEqualsFutureFact: false,
      actionAuthorityGranted: false,
      financialAuthorityGranted: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    });
    const contract = namespace.validateExternalIntelligenceContract("scenarioCandidate", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SCENARIO-CANDIDATE", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_SCENARIO_CANDIDATE_INVALID", "Blocked", { contract, schema });
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_SCENARIO_ALREADY_REGISTERED" : "EXTERNAL010_SCENARIO_CONFLICT", same ? "Ready" : "Blocked", { scenarioCandidate: internal.clone(existing) });
    }
    state.scenarioCandidates.set(scenarioCandidateId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SCENARIO_CANDIDATE_CREATED", "Ready", { scenarioCandidate: internal.clone(record) });
  }

  function createExternalIntelligenceImpactOutcomeEvaluationCandidate(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const impactOutcomeEvaluationCandidateId = internal.text(source.impactOutcomeEvaluationCandidateId, "") || internal.nextId("EXTERNAL-010-IMPACT-OUTCOME-EVALUATION");
    const impactPathId = internal.text(source.impactPathId, "");
    const actualOutcomeReferenceId = internal.text(source.actualOutcomeReferenceId, "");
    if (!impactPathId || !state.impactPaths.has(impactPathId) || !actualOutcomeReferenceId) {
      return internal.buildResult(false, "EXTERNAL010_IMPACT_OUTCOME_EVALUATION_INVALID_INPUT", "Blocked", { impactPathId, actualOutcomeReferenceId });
    }
    const existing = state.impactOutcomeEvaluationCandidates.get(impactOutcomeEvaluationCandidateId);
    const record = internal.deepFreeze({
      impactOutcomeEvaluationCandidateId,
      impactPathId,
      actualOutcomeReferenceId,
      directionAssessment: internal.text(source.directionAssessment, "UNKNOWN").toUpperCase(),
      magnitudeAssessment: internal.text(source.magnitudeAssessment, "UNKNOWN").toUpperCase(),
      timingAssessment: internal.text(source.timingAssessment, "UNKNOWN").toUpperCase(),
      pathAssessment: internal.text(source.pathAssessment, "UNKNOWN").toUpperCase(),
      confidenceAssessment: internal.text(source.confidenceAssessment, "UNKNOWN").toUpperCase(),
      failedPredictionPreserved: true,
      modelRecalibrationCandidate: true,
      automaticModelUpdatePerformed: false,
      knowledgePromotionPerformed: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    });
    const contract = namespace.validateExternalIntelligenceContract("impactOutcomeEvaluationCandidate", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-IMPACT-OUTCOME-EVALUATION-CANDIDATE", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_IMPACT_OUTCOME_EVALUATION_INVALID", "Blocked", { contract, schema });
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_IMPACT_OUTCOME_EVALUATION_ALREADY_REGISTERED" : "EXTERNAL010_IMPACT_OUTCOME_EVALUATION_CONFLICT", same ? "Ready" : "Blocked", { impactOutcomeEvaluationCandidate: internal.clone(existing) });
    }
    state.impactOutcomeEvaluationCandidates.set(impactOutcomeEvaluationCandidateId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_IMPACT_OUTCOME_EVALUATION_CREATED", "Ready", { impactOutcomeEvaluationCandidate: internal.clone(record) });
  }

  function getExternalIntelligenceImpactEvidenceLineage(impactEdgeId) {
    const id = internal.text(impactEdgeId, "");
    const edge = state.impactEdges.get(id);
    if (!edge) return internal.buildResult(false, "EXTERNAL010_IMPACT_EDGE_NOT_FOUND", "Blocked", { impactEdgeId: id });
    return internal.buildResult(true, "EXTERNAL010_IMPACT_EVIDENCE_LINEAGE_READY", "Ready", {
      impactEdgeId: id,
      supportingEvidenceIds: internal.clone(edge.supportingEvidenceIds),
      contradictingEvidenceIds: internal.clone(edge.contradictingEvidenceIds),
      historicalEvidenceIds: internal.clone(edge.historicalEvidenceIds),
      modelId: edge.modelId,
      modelVersion: edge.modelVersion,
      evidenceLineagePreserved: true
    });
  }

  function initializeExternalIntelligenceImpactGraph() {
    namespace.modules.impactGraph.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_IMPACT_GRAPH_INITIALIZED", "Ready", {
      multiStagePaths: true,
      earliestExpectedLatestLag: true,
      lagDistributionHook: true,
      propagationStageState: true,
      intermediateObservationTracking: true,
      remainingLagRecalculationHook: true,
      historicalAnalogDifferenceRepresentation: true,
      scenarioCandidateHook: true,
      predictionEvaluationHook: true,
      modelVersion: true,
      evidenceLineage: true,
      automaticCausalTruthAllowed: false,
      automaticActionAllowed: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceImpactGraph,
    createExternalIntelligenceImpactEdge,
    createExternalIntelligenceImpactPath,
    calculateExternalIntelligenceRemainingImpactPath,
    recordExternalIntelligenceImpactObservation,
    createExternalIntelligenceHistoricalAnalogCandidate,
    createExternalIntelligenceScenarioCandidate,
    createExternalIntelligenceImpactOutcomeEvaluationCandidate,
    getExternalIntelligenceImpactEvidenceLineage
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.impactGraph = {
    id: "EXTERNAL-010-TEMPORAL-IMPACT-PROPAGATION-GRAPH",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    decisions: ["029"],
    multiStagePaths: true,
    temporalLagDistributionHook: true,
    historicalAnalogLearningHook: true,
    scenarioCandidateHook: true,
    outcomeEvaluationHook: true,
    automaticCausalTruthAllowed: false,
    automaticActionAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
