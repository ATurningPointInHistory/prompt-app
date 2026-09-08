/* ============================================================
   FILE: 17_external_intelligence_phase9_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.8.0
   Phase 09 Validation: Temporal Relation / Event / Impact Graph
   Primary Decisions: 028 / 029
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 09 validation blocked: dependencies missing.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase9Validation");

  function collector() {
    const checks = [];
    return {
      checks,
      check(name, passed, detail, group, severity) {
        checks.push({
          name,
          passed: passed === true,
          detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)),
          group: group || "General",
          severity: severity || "Critical"
        });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    return {
      passed,
      failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(1)) : 0,
      criticalFailed
    };
  }

  async function runExternalIntelligencePhase9Validation() {
    const c = collector();
    const check = c.check;

    try {
      check("Release Version is Phase 09 compatible or later", VERSION_MANIFEST.isReleaseCompatibleFrom("1.8.0"), VERSION_MANIFEST.release.version, "Foundation");
      check("Implementation Phase is Phase 09", VERSION_MANIFEST.release.phase === 9 && VERSION_MANIFEST.release.implementationPhase.indexOf("Phase 09") === 0, VERSION_MANIFEST.release.implementationPhase, "Foundation");
      check("Phase 09 primary Decisions are 028 / 029", internal.stableStringify(namespace.modules.phase9Validation.decisions) === internal.stableStringify(["028", "029"]), namespace.modules.phase9Validation.decisions, "Foundation");
      check("Gateway remains unchanged at 1.4.0", VERSION_MANIFEST.gateway.gatewayVersion === "1.4.0", VERSION_MANIFEST.gateway.gatewayVersion, "Boundary");

      const initialized = await namespace.initializeExternalIntelligenceFoundation();
      check("Phase 09 foundation initializes", initialized && initialized.ok === true, initialized && initialized.code, "Initialization");

      const phase8 = await namespace.runExternalIntelligencePhase8Validation();
      check("Phase 08 regression remains PASS", phase8.failed === 0 && phase8.health === 100 && phase8.phase8Complete === true, { passed: phase8.passed, failed: phase8.failed, total: phase8.total }, "Regression");

      const phase9ContractKeys = [
        "temporalRelationRecord", "eventRecord", "eventStateTransition", "impactEdge", "impactPath",
        "impactObservation", "historicalAnalogCandidate", "scenarioCandidate", "impactOutcomeEvaluationCandidate",
        "phase9ValidationResult"
      ];
      check("Phase 09 contracts are registered", phase9ContractKeys.every(function exists(key) { return Boolean(namespace.getExternalIntelligenceContract(key)); }), phase9ContractKeys, "Contract");
      const phase9SchemaIds = [
        "EXTERNAL-010-SCHEMA-TEMPORAL-RELATION-RECORD", "EXTERNAL-010-SCHEMA-EVENT-RECORD",
        "EXTERNAL-010-SCHEMA-EVENT-STATE-TRANSITION", "EXTERNAL-010-SCHEMA-IMPACT-EDGE",
        "EXTERNAL-010-SCHEMA-IMPACT-PATH", "EXTERNAL-010-SCHEMA-IMPACT-OBSERVATION",
        "EXTERNAL-010-SCHEMA-HISTORICAL-ANALOG-CANDIDATE", "EXTERNAL-010-SCHEMA-SCENARIO-CANDIDATE",
        "EXTERNAL-010-SCHEMA-IMPACT-OUTCOME-EVALUATION-CANDIDATE", "EXTERNAL-010-SCHEMA-PHASE9-VALIDATION-RESULT"
      ];
      check("Phase 09 schemas are registered", phase9SchemaIds.every(function exists(id) { return Boolean(namespace.getExternalIntelligenceSchema(id)); }), phase9SchemaIds.length, "Schema");

      const entityA = "ENTITY-PHASE9-COMPANY-A";
      const entityB = "ENTITY-PHASE9-COMPANY-B";
      const entityC = "ENTITY-PHASE9-COMPANY-C";
      [
        { entityId: entityA, entityType: "COMPANY", canonicalLabel: "Phase 09 Company A" },
        { entityId: entityB, entityType: "COMPANY", canonicalLabel: "Phase 09 Company B" },
        { entityId: entityC, entityType: "COMPANY", canonicalLabel: "Phase 09 Company C" }
      ].forEach(function register(input) { namespace.registerExternalIntelligenceEntity(input); });
      check("Phase 09 Relation / Event participants use Stable Entity IDs", [entityA, entityB, entityC].every(function exists(id) { return Boolean(namespace.getExternalIntelligenceEntity(id)); }), [entityA, entityB, entityC], "Entity Integration");

      const relationAB = namespace.registerExternalIntelligenceTemporalRelation({
        relationId: "REL-PHASE9-A-B",
        recordVersion: 1,
        subjectEntityId: entityA,
        relationType: "SUPPLIES_TO",
        objectEntityId: entityB,
        validFrom: "2025-01-01T00:00:00Z",
        validUntil: "2025-12-31T23:59:59Z",
        relationState: "ACTIVE",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-REL-AB-V1"],
        sourceClaimIds: ["CLAIM-PHASE9-REL-AB-V1"],
        createdBy: "PHASE9_VALIDATION"
      });
      check("Stable Temporal Relation registers with Decision 028 fields", relationAB.ok === true && relationAB.data.temporalRelation.subjectEntityId === entityA && relationAB.data.temporalRelation.objectEntityId === entityB && relationAB.data.temporalRelation.relationType === "SUPPLIES_TO", relationAB.data || relationAB.code, "Relation");
      check("Relation Candidate / Causality authority remains separated", relationAB.ok === true && relationAB.data.temporalRelation.canonicalRelationConfirmed === false && relationAB.data.temporalRelation.relationExistenceEqualsCausalImpact === false && relationAB.data.temporalRelation.causalImpactGranted === false, relationAB.data && relationAB.data.temporalRelation, "Relation Safety");

      const relationABV2 = namespace.registerExternalIntelligenceTemporalRelation({
        relationId: "REL-PHASE9-A-B",
        recordVersion: 2,
        subjectEntityId: entityA,
        relationType: "SUPPLIES_TO",
        objectEntityId: entityB,
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: null,
        relationState: "SUPPORTED",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-REL-AB-V2"],
        sourceClaimIds: ["CLAIM-PHASE9-REL-AB-V2"],
        supersedesRelationRecordId: "REL-PHASE9-A-B-V1",
        createdBy: "PHASE9_VALIDATION"
      });
      const relationHistory = namespace.listExternalIntelligenceTemporalRelationHistory("REL-PHASE9-A-B");
      check("Relation update preserves historical version", relationABV2.ok === true && relationHistory.length >= 2 && relationHistory.some(function old(record) { return record.recordVersion === 1; }) && relationHistory.some(function next(record) { return record.recordVersion === 2; }), relationHistory, "Relation Versioning");

      const relationBC = namespace.registerExternalIntelligenceTemporalRelation({
        relationId: "REL-PHASE9-B-C",
        recordVersion: 1,
        subjectEntityId: entityB,
        relationType: "SUPPLIES_TO",
        objectEntityId: entityC,
        validFrom: "2025-01-01T00:00:00Z",
        validUntil: null,
        relationState: "SUPPORTED",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-REL-BC"],
        sourceClaimIds: ["CLAIM-PHASE9-REL-BC"]
      });
      check("Supply-chain Relation Graph supports multiple links", relationBC.ok === true, relationBC.data || relationBC.code, "Relation Graph");

      const disputed = namespace.registerExternalIntelligenceTemporalRelation({
        relationId: "REL-PHASE9-A-C-DISPUTED",
        recordVersion: 1,
        subjectEntityId: entityA,
        relationType: "PARTNERS_WITH",
        objectEntityId: entityC,
        relationState: "DISPUTED",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-DISPUTED-A"],
        sourceClaimIds: ["CLAIM-PHASE9-DISPUTED-A"]
      });
      check("Conflicting Relation state is retained instead of auto-deleted", disputed.ok === true && disputed.data.temporalRelation.relationState === "DISPUTED", disputed.data || disputed.code, "Conflict State");

      const asOf = namespace.reconstructExternalIntelligenceRelationGraphAsOf({ asOfTime: "2025-06-01T00:00:00Z" });
      check("Historical As-Of Graph reconstructs temporal Relations", asOf.ok === true && asOf.data.relations.some(function v1(record) { return record.relationId === "REL-PHASE9-A-B" && record.recordVersion === 1; }) && asOf.data.canonicalAutoSelectionPerformed === false, asOf.data || asOf.code, "Historical Graph");

      const traversal = namespace.traverseExternalIntelligenceRelationGraph({ startEntityId: entityA, maxDepth: 2, asOfTime: "2025-06-01T00:00:00Z", relationTypes: ["SUPPLIES_TO"] });
      check("Time-filtered Graph Traversal reaches 2-Hop Entity", traversal.ok === true && traversal.data.entities.some(function found(item) { return item.entityId === entityC && item.depth === 2; }) && traversal.data.timeFilteredTraversal === true, traversal.data || traversal.code, "Graph Traversal");

      const announcedEvent = namespace.registerExternalIntelligenceEvent({
        eventId: "EVENT-PHASE9-ACQUISITION",
        recordVersion: 1,
        eventType: "ACQUISITION",
        participants: [entityA, entityB],
        relationIds: ["REL-PHASE9-A-B"],
        supportingEvidenceIds: ["EVIDENCE-PHASE9-EVENT-ANNOUNCED"],
        sourceClaimIds: ["CLAIM-PHASE9-EVENT-ANNOUNCED"],
        announcedAt: "2026-02-01T00:00:00Z",
        eventState: "ANNOUNCED"
      });
      check("Stable Event Record is separate from Relation", announcedEvent.ok === true && announcedEvent.data.eventRecord.eventId !== relationAB.data.temporalRelation.relationId && announcedEvent.data.eventRecord.eventState === "ANNOUNCED", announcedEvent.data || announcedEvent.code, "Event");
      check("Announcement does not equal Completion / Actual Event", announcedEvent.ok === true && announcedEvent.data.eventRecord.announcementEqualsCompletion === false && announcedEvent.data.eventRecord.planEqualsActualEvent === false && announcedEvent.data.eventRecord.claimEqualsEventOccurred === false, announcedEvent.data && announcedEvent.data.eventRecord, "Event Boundary");

      const transition = namespace.transitionExternalIntelligenceEventState({
        eventId: "EVENT-PHASE9-ACQUISITION",
        toState: "COMPLETED",
        transitionedAt: "2026-04-01T00:00:00Z",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-EVENT-COMPLETED"]
      });
      const eventHistory = namespace.listExternalIntelligenceEventHistory("EVENT-PHASE9-ACQUISITION");
      check("Event State history preserves Announcement and Completion", transition.ok === true && eventHistory.some(function announced(record) { return record.eventState === "ANNOUNCED"; }) && eventHistory.some(function complete(record) { return record.eventState === "COMPLETED"; }) && eventHistory.length >= 2, eventHistory, "Event Versioning");
      check("Event update does not rewrite historical Record", eventHistory[0] && eventHistory[0].historicalRecordPreserved === true && namespace.getExternalIntelligenceEvent("EVENT-PHASE9-ACQUISITION", 1).eventState === "ANNOUNCED", eventHistory, "Event Safety");

      const eventRelationLink = namespace.linkExternalIntelligenceEventRelation({
        eventRelationLinkId: "EVENT-PHASE9-ACQUISITION::ESTABLISHES::REL-PHASE9-A-B",
        eventId: "EVENT-PHASE9-ACQUISITION",
        relationId: "REL-PHASE9-A-B",
        linkType: "ESTABLISHES",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-EVENT-REL-LINK"]
      });
      check("Event ↔ Relation link is explicit and non-activating", eventRelationLink.ok === true && eventRelationLink.data.eventRelationLink.relationAutomaticallyActivated === false && eventRelationLink.data.eventRelationLink.relationAutomaticallyEnded === false, eventRelationLink.data || eventRelationLink.code, "Event Relation Link");

      const edge1 = namespace.createExternalIntelligenceImpactEdge({
        impactEdgeId: "IMPACT-PHASE9-EDGE-1",
        fromNodeId: "EVENT-PHASE9-ACQUISITION",
        toNodeId: "IMPACT-PHASE9-DEMAND-STAGE",
        fromNodeType: "EVENT",
        toNodeType: "INTERMEDIATE_IMPACT",
        impactType: "DEMAND_TRANSMISSION",
        impactDimension: "DEMAND",
        direction: "POSITIVE",
        impactStrength: 0.7,
        confidence: 0.52,
        causalState: "CAUSAL_HYPOTHESIS",
        earliestLag: { amount: 1, unit: "DAY" },
        expectedLag: { amount: 3, unit: "DAY" },
        latestLag: { amount: 7, unit: "DAY" },
        lagDistributionReference: "LAG-DIST-PHASE9-001",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-IMPACT-1"],
        historicalEvidenceIds: ["EVIDENCE-HIST-PHASE9-IMPACT-1"],
        historicalSampleCount: 12,
        candidateConfounders: ["INTEREST_RATE"],
        modelId: "PHASE9-FOUNDATION-MODEL",
        modelVersion: "1.0.0",
        timeHorizon: "SHORT_TERM"
      });
      const edge2 = namespace.createExternalIntelligenceImpactEdge({
        impactEdgeId: "IMPACT-PHASE9-EDGE-2",
        fromNodeId: "IMPACT-PHASE9-DEMAND-STAGE",
        toNodeId: "OUTCOME-PHASE9-REVENUE-CANDIDATE",
        fromNodeType: "INTERMEDIATE_IMPACT",
        toNodeType: "OUTCOME",
        impactType: "REVENUE_TRANSMISSION",
        impactDimension: "REVENUE",
        direction: "POSITIVE",
        impactStrength: 0.45,
        confidence: 0.41,
        causalState: "INFLUENCE_CANDIDATE",
        earliestLag: { amount: 14, unit: "DAY" },
        expectedLag: { amount: 30, unit: "DAY" },
        latestLag: { amount: 60, unit: "DAY" },
        supportingEvidenceIds: ["EVIDENCE-PHASE9-IMPACT-2"],
        historicalEvidenceIds: ["EVIDENCE-HIST-PHASE9-IMPACT-2"],
        historicalSampleCount: 8,
        candidateConfounders: ["FX_CHANGE"],
        modelId: "PHASE9-FOUNDATION-MODEL",
        modelVersion: "1.0.0",
        timeHorizon: "MEDIUM_TERM"
      });
      check("Impact Edges retain Direction separately from Strength / Confidence", edge1.ok === true && edge2.ok === true && edge1.data.impactEdge.direction === "POSITIVE" && edge1.data.impactEdge.impactStrength === 0.7 && edge1.data.impactEdge.confidence === 0.52, edge1.data || edge1.code, "Impact Edge");
      check("Impact Edge retains Earliest / Expected / Latest Lag", edge1.ok === true && edge1.data.impactEdge.earliestLag.amount === 1 && edge1.data.impactEdge.expectedLag.amount === 3 && edge1.data.impactEdge.latestLag.amount === 7 && edge1.data.impactEdge.lagDistributionHook === true, edge1.data && edge1.data.impactEdge, "Temporal Lag");
      check("Impact Edge retains Evidence Lineage / Model Version", edge1.ok === true && edge1.data.impactEdge.supportingEvidenceIds.length === 1 && edge1.data.impactEdge.historicalEvidenceIds.length === 1 && edge1.data.impactEdge.modelVersion === "1.0.0" && edge1.data.impactEdge.evidenceLineagePreserved === true, edge1.data && edge1.data.impactEdge, "Evidence Lineage");
      check("Causal Hypothesis does not become Verified Causal Truth", edge1.ok === true && edge1.data.impactEdge.causalState === "CAUSAL_HYPOTHESIS" && edge1.data.impactEdge.causalTruthConfirmed === false && edge1.data.impactEdge.correlationEqualsCausation === false && edge1.data.impactEdge.temporalProximityEqualsCausation === false, edge1.data && edge1.data.impactEdge, "Causal Boundary");

      const path = namespace.createExternalIntelligenceImpactPath({
        impactPathId: "IMPACT-PHASE9-PATH-1",
        triggerEventId: "EVENT-PHASE9-ACQUISITION",
        edgeIds: ["IMPACT-PHASE9-EDGE-1", "IMPACT-PHASE9-EDGE-2"],
        modelId: "PHASE9-FOUNDATION-MODEL",
        modelVersion: "1.0.0"
      });
      check("Multi-Stage Influence Path links Event → Intermediate → Outcome", path.ok === true && path.data.impactPath.edgeIds.length === 2 && path.data.impactPath.stages.length === 3 && path.data.impactPath.predictionCandidateOnly === true, path.data || path.code, "Impact Path");
      check("Path Timing composes Edge Lag hooks without claiming certainty", path.ok === true && path.data.impactPath.pathTiming.earliestMilliseconds !== null && path.data.impactPath.pathTiming.expectedMilliseconds !== null && path.data.impactPath.pathTiming.latestMilliseconds !== null && path.data.impactPath.pathTiming.distributionBasedPathTimingHook === true, path.data && path.data.impactPath.pathTiming, "Path Timing");

      const observation = namespace.recordExternalIntelligenceImpactObservation({
        impactObservationId: "IMPACT-PHASE9-OBS-1",
        impactPathId: "IMPACT-PHASE9-PATH-1",
        stageIndex: 1,
        stageState: "OBSERVED",
        observedReferenceId: "IMPACT-PHASE9-DEMAND-STAGE",
        observedAt: "2026-04-10T00:00:00Z",
        supportingEvidenceIds: ["EVIDENCE-PHASE9-INTERMEDIATE-OBS"]
      });
      check("Intermediate Stage Observation is tracked explicitly", observation.ok === true && observation.data.impactObservation.stageState === "OBSERVED" && observation.data.impactObservation.finalOutcomeConfirmed === false, observation.data || observation.code, "Intermediate Observation");
      check("Observed Stage triggers Remaining Lag recalculation", observation.ok === true && observation.data.remainingPath && observation.data.remainingPath.remainingEdgeIds.length === 1 && observation.data.remainingPath.completedLagExcludedFromFuturePrediction === true, observation.data && observation.data.remainingPath, "Remaining Lag");

      const analog = namespace.createExternalIntelligenceHistoricalAnalogCandidate({
        historicalAnalogCandidateId: "ANALOG-PHASE9-001",
        currentEventId: "EVENT-PHASE9-ACQUISITION",
        historicalEventId: "EVENT-HISTORICAL-ACQUISITION",
        similarityScore: 0.82,
        similarityDimensions: ["EVENT_TYPE", "INDUSTRY", "SEVERITY"],
        differenceDimensions: ["INTEREST_RATE_ENVIRONMENT", "REGION"],
        historicalImpactPathIds: ["HISTORICAL-IMPACT-PATH-001"],
        outcomeReferences: ["HISTORICAL-OUTCOME-001"],
        supportingEvidenceIds: ["EVIDENCE-PHASE9-ANALOG"],
        analysisVersion: "1.0.0",
        modelVersion: "1.0.0"
      });
      check("Historical Analog retains Similarity and material Differences", analog.ok === true && analog.data.historicalAnalogCandidate.similarityDimensions.length === 3 && analog.data.historicalAnalogCandidate.differenceDimensions.length === 2, analog.data || analog.code, "Historical Analog");
      check("Historical Similarity does not grant same Outcome", analog.ok === true && analog.data.historicalAnalogCandidate.historicalAnalogEqualsSameOutcome === false && analog.data.historicalAnalogCandidate.automaticPredictionGranted === false, analog.data && analog.data.historicalAnalogCandidate, "Historical Analog Safety");

      const scenario = namespace.createExternalIntelligenceScenarioCandidate({
        scenarioCandidateId: "SCENARIO-PHASE9-001",
        triggerEventId: "EVENT-PHASE9-ACQUISITION",
        impactPathIds: ["IMPACT-PHASE9-PATH-1"],
        historicalAnalogIds: ["ANALOG-PHASE9-001"],
        expectedStages: ["IMPACT-PHASE9-DEMAND-STAGE", "OUTCOME-PHASE9-REVENUE-CANDIDATE"],
        expectedTiming: { horizon: "MEDIUM_TERM" },
        expectedDirection: "POSITIVE",
        confidence: "MEDIUM",
        importantAssumptions: ["DEMAND_TRANSMISSION_CONTINUES"],
        riskFactors: ["INTEREST_RATE", "FX_CHANGE"],
        contradictingEvidenceIds: [],
        modelVersion: "1.0.0"
      });
      check("Scenario Candidate Hook is available without Future Fact authority", scenario.ok === true && scenario.data.scenarioCandidate.scenarioCandidateEqualsFutureFact === false && scenario.data.scenarioCandidate.actionAuthorityGranted === false && scenario.data.scenarioCandidate.financialAuthorityGranted === false, scenario.data || scenario.code, "Scenario Candidate");

      const evaluation = namespace.createExternalIntelligenceImpactOutcomeEvaluationCandidate({
        impactOutcomeEvaluationCandidateId: "IMPACT-EVAL-PHASE9-001",
        impactPathId: "IMPACT-PHASE9-PATH-1",
        actualOutcomeReferenceId: "OUTCOME-ACTUAL-PHASE9",
        directionAssessment: "MATCHED",
        magnitudeAssessment: "PARTIAL",
        timingAssessment: "LATE",
        pathAssessment: "PARTIAL",
        confidenceAssessment: "OVERESTIMATED"
      });
      check("Prediction Evaluation preserves Direction / Magnitude / Timing / Path / Confidence", evaluation.ok === true && evaluation.data.impactOutcomeEvaluationCandidate.directionAssessment === "MATCHED" && evaluation.data.impactOutcomeEvaluationCandidate.timingAssessment === "LATE" && evaluation.data.impactOutcomeEvaluationCandidate.pathAssessment === "PARTIAL", evaluation.data || evaluation.code, "Outcome Evaluation");
      check("Failed Prediction remains Learning Evidence / recalibration Candidate only", evaluation.ok === true && evaluation.data.impactOutcomeEvaluationCandidate.failedPredictionPreserved === true && evaluation.data.impactOutcomeEvaluationCandidate.modelRecalibrationCandidate === true && evaluation.data.impactOutcomeEvaluationCandidate.automaticModelUpdatePerformed === false && evaluation.data.impactOutcomeEvaluationCandidate.knowledgePromotionPerformed === false, evaluation.data && evaluation.data.impactOutcomeEvaluationCandidate, "Learning Boundary");

      const lineage = namespace.getExternalIntelligenceImpactEvidenceLineage("IMPACT-PHASE9-EDGE-1");
      check("Impact Evidence Lineage remains queryable with Model Version", lineage.ok === true && lineage.data.supportingEvidenceIds.length === 1 && lineage.data.modelVersion === "1.0.0" && lineage.data.evidenceLineagePreserved === true, lineage.data || lineage.code, "Evidence Lineage");

      const sf = VERSION_MANIFEST.safety;
      check("Decision 028 safety boundary remains fail-closed", sf.eventEqualsRelation === false && sf.announcementEqualsCompletion === false && sf.planEqualsActualEvent === false && sf.claimEqualsEventOccurred === false && sf.currentRelationEqualsHistoricalRelation === false && sf.relationCandidateEqualsVerifiedRelationship === false && sf.aiExtractedRelationEqualsCanonicalRelation === false && sf.visualAssociationEqualsBusinessRelationship === false && sf.eventOccurrenceEqualsCausation === false && sf.relationExistenceEqualsCausalImpact === false && sf.relationUpdateMayEraseHistoricalState === false && sf.eventUpdateMayEraseHistoricalState === false && sf.aiCandidateGenerationGrantsCanonicalAuthority === false, sf, "Safety");
      check("Decision 029 causal safety remains fail-closed", sf.relationEqualsImpact === false && sf.impactEqualsCausation === false && sf.correlationEqualsCausation === false && sf.temporalProximityEqualsCausation === false && sf.eventOccurrenceEqualsOutcomeCause === false && sf.historicalPatternEqualsGuaranteedFuture === false && sf.historicalSimilarityEqualsSameOutcome === false && sf.predictionEqualsOutcome === false && sf.aiCausalHypothesisEqualsVerifiedCausalLink === false && sf.highImpactScoreEqualsCertainCause === false && sf.highSimilarityEqualsCertainOutcome === false, sf, "Safety");
      check("Temporal / Backtest / Learning safety remains fail-closed", sf.marketReactionTimeEqualsBusinessImpactTime === false && sf.businessImpactTimeEqualsAccountingRecognitionTime === false && sf.futureEvidenceMayBeUsedInHistoricalBacktest === false && sf.failedPredictionMayBeSilentlyDeleted === false && sf.failedPropagationMayBeSilentlyDeleted === false && sf.impactPathGrantsActionAuthority === false && sf.automaticImpactModelUpdateAllowed === false, sf, "Safety");
      const p9Permissions = VERSION_MANIFEST.phase9Permissions || {};
      check("AI generation capabilities do not imply Canonical Authority", p9Permissions.aiMayGenerateRelationCandidate === true && p9Permissions.aiMayGenerateEventCandidate === true && p9Permissions.aiMayGenerateCausalHypothesis === true && p9Permissions.aiMayGenerateHistoricalAnalogCandidate === true && p9Permissions.aiMayGenerateScenarioCandidate === true && p9Permissions.candidateGenerationGrantsCanonicalAuthority === false && sf.aiCandidateGenerationGrantsCanonicalAuthority === false, { permissions: p9Permissions, safety: sf }, "AI Boundary");

      ["relationGraph", "eventGraph", "impactGraph", "phase9Validation"].forEach(function moduleCheck(name) {
        check("Module " + name + " is loaded", Boolean(namespace.modules[name]), namespace.modules[name] && namespace.modules[name].status, "Modules");
      });

      const auditEvent = await namespace.appendExternalIntelligenceAuditEvent({
        eventType: "PHASE9_VALIDATION_TEMPORAL_RELATION_EVENT_IMPACT_GRAPH",
        actor: "EXTERNAL-010 Phase 09 Validation",
        outcome: "Recorded",
        details: {
          relationVersionCount: state.temporalRelationVersions.size,
          eventVersionCount: state.eventVersions.size,
          impactEdgeCount: state.impactEdges.size,
          impactPathCount: state.impactPaths.size,
          historicalAnalogCount: state.historicalAnalogCandidates.size,
          scenarioCandidateCount: state.scenarioCandidates.size,
          canonicalCausalTruthConfirmed: false,
          automaticActionPerformed: false
        },
        references: ["REL-PHASE9-A-B", "EVENT-PHASE9-ACQUISITION", "IMPACT-PHASE9-PATH-1"]
      });
      check("Phase 09 operations integrate with append-only Audit", auditEvent.ok === true, auditEvent.data || auditEvent.code, "Audit");
      const audit = await namespace.verifyExternalIntelligenceAuditChain();
      check("Phase 09 audit chain remains valid", audit.valid === true, { valid: audit.valid, eventCount: audit.eventCount }, "Audit");
    } catch (error) {
      check("Phase 09 validation execution completes without exception", false, { message: error && error.message || String(error), stack: error && error.stack || null }, "Validation");
    }

    const summary = summarize(c.checks);
    const gate = summary.failed === 0 && summary.criticalFailed === 0;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE9-VALIDATION"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      roadmapId: VERSION_MANIFEST.release.implementationRoadmapId,
      decisionCoverage: VERSION_MANIFEST.release.decisionCount,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: gate ? "EXTERNAL-010 Phase 09 Validation PASS" : "EXTERNAL-010 Phase 09 Validation FAIL",
      releaseAllowed: gate,
      phase9Complete: gate,
      phase10Allowed: gate,
      checks: c.checks,
      safety: internal.clone(VERSION_MANIFEST.safety),
      validatedAt: internal.nowIso()
    };

    const contract = namespace.validateExternalIntelligenceContract("phase9ValidationResult", result);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE9-VALIDATION-RESULT", result);
    if (!contract.valid || !schema.valid) {
      result.failed += 1;
      result.total += 1;
      result.criticalFailed += 1;
      result.health = Number(((result.passed / result.total) * 100).toFixed(1));
      result.status = "EXTERNAL-010 Phase 09 Validation FAIL";
      result.releaseAllowed = false;
      result.phase9Complete = false;
      result.phase10Allowed = false;
      result.checks.push({ name: "Phase 09 result validates against contract and schema", passed: false, detail: internal.stableStringify({ contract, schema }), group: "Validation", severity: "Critical" });
    } else {
      result.checks.push({ name: "Phase 09 result validates against contract and schema", passed: true, detail: "valid", group: "Validation", severity: "Critical" });
      result.passed += 1;
      result.total += 1;
      result.health = Number(((result.passed / result.total) * 100).toFixed(1));
    }

    state.latestPhase9Validation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase9Validation.status = result.failed === 0 ? "Passed" : "Failed";
    internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase9Validation() {
    return state.latestPhase9Validation ? internal.clone(state.latestPhase9Validation) : null;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase9Validation, getLatestExternalIntelligencePhase9Validation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase9Validation = {
    id: "EXTERNAL-010-PHASE9-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    decisions: ["028", "029"],
    gatewayChangeRequired: false,
    loadedAt: internal.nowIso()
  };
  global.runExternalIntelligencePhase9Validation = runExternalIntelligencePhase9Validation;
})(typeof window !== "undefined" ? window : globalThis);
