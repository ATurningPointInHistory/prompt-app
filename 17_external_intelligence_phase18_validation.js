/* ============================================================
   FILE: 17_external_intelligence_phase18_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.17.1
   Phase 18 Functional Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal;
  const MODULE_VERSION = VM.getModuleVersion("phase18Validation");

  async function runExternalIntelligencePhase18Validation() {
    if (typeof namespace.initializeExternalIntelligencePhase18Definitions === "function") namespace.initializeExternalIntelligencePhase18Definitions();
    const checks = [];
    const add = function add(name, passed, detail, group) { checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Phase 18", severity: "Critical" }); };
    // Validation must be safely re-runnable because PC/Android real-runtime gates
    // intentionally invoke the functional suite again in the same browser session.
    const runToken = internal.nextId("P18-RUN").replace(/[^A-Z0-9._-]/gi, "-");
    const testIds = {
      venueId: "XNAS-" + runToken,
      symbol: "P18",
      entityId: "ENTITY-" + runToken,
      capabilityId: "EXTERNAL-010-CAPABILITY-" + runToken,
      technicalSignalId: runToken + "-SIG-TECH",
      momentumSignalId: runToken + "-SIG-MOM",
      fundamentalSignalId: runToken + "-SIG-FUND",
      leakedSignalId: runToken + "-SIG-LEAK",
      hypothesisId: runToken + "-HYP",
      predictionId: runToken + "-PRED",
      packageId: runToken + "-PKG",
      benchmarkId: runToken + "-BENCH",
      outcomeId: runToken + "-OUTCOME",
      d030PredictionId: runToken + "-PRED-D030"
    };

    add("Release is Phase 18 v1.17.1 compatible", VM.isReleaseCompatibleFrom("1.17.1"), VM.release.version, "Foundation");
    add("Implementation Phase is Phase 18", VM.release.phase >= 18, VM.release.implementationPhase, "Foundation");
    add("Primary Decision is 048", namespace.modules.marketFusion && namespace.modules.marketFusion.decisions.includes("048"), namespace.modules.marketFusion, "Foundation");
    add("Gateway remains unchanged at 1.4.0", VM.isGatewayCompatibleFrom("1.4.0"), VM.gateway.gatewayVersion, "Boundary");

    const contractKeys = ["crossDomainMarketSignal", "compositeMarketHypothesis", "marketFusionPredictionCandidate", "marketFusionPackage", "marketFusionOutcomeEvaluation"];
    add("Phase 18 contracts are registered", contractKeys.every(function exists(key) { return !!namespace.getExternalIntelligenceContract(key); }), contractKeys, "Contract");
    const schemaIds = ["EXTERNAL-010-SCHEMA-CROSS-DOMAIN-MARKET-SIGNAL", "EXTERNAL-010-SCHEMA-COMPOSITE-MARKET-HYPOTHESIS", "EXTERNAL-010-SCHEMA-MARKET-FUSION-PREDICTION-CANDIDATE", "EXTERNAL-010-SCHEMA-MARKET-FUSION-PACKAGE", "EXTERNAL-010-SCHEMA-MARKET-FUSION-OUTCOME-EVALUATION"];
    add("Phase 18 schemas are registered", schemaIds.every(function exists(id) { return !!namespace.getExternalIntelligenceSchema(id); }), schemaIds, "Schema");

    const venue = namespace.registerExternalIntelligenceMarketVenue({ venueId: testIds.venueId, venueName: "P18 Test Venue", timeZone: "UTC" });
    const instrument = namespace.registerExternalIntelligenceMarketInstrument({ venueId: testIds.venueId, symbol: testIds.symbol, assetType: "EQUITY", currency: "USD", entityId: testIds.entityId });
    add("Phase 17 market identity foundation remains reusable", venue.ok && instrument.ok, { venue, instrument }, "Regression");

    const capability = namespace.registerExternalIntelligenceMarketFusionCapability({ fusionCapabilityId: testIds.capabilityId, fusionCapabilityVersion: MODULE_VERSION, fusionMethod: "RULE_BASED", ruleDefinition: { mode: "dependency-aware-no-majority-vote" } });
    add("Fusion Capability is versioned through Decision 036 registry", capability.ok && capability.data.fusionCapability.fusionCapabilityVersion === MODULE_VERSION, capability, "Capability");

    const instrumentId = instrument.data.instrument.instrumentId;
    const technical = namespace.createExternalIntelligenceCrossDomainMarketSignal({ signalId: testIds.technicalSignalId, signalFamily: "TECHNICAL_TREND", instrumentId, targetEntityId: testIds.entityId, direction: "BULLISH", strength: 0.7, confidence: 0.7, freshness: "CURRENT", timeHorizon: "SHORT_TERM", independenceGroup: "PRICE-SERIES-A", commonInputRefs: ["PRICE-SERIES-A"], sourceLineage: ["TECHNICAL-SIGNAL-P17"], evidenceStrength: "MODERATE", availableAt: "2026-09-10T00:00:00Z", calculatedAt: "2026-09-10T00:01:00Z" });
    const momentum = namespace.createExternalIntelligenceCrossDomainMarketSignal({ signalId: testIds.momentumSignalId, signalFamily: "TECHNICAL_MOMENTUM", instrumentId, targetEntityId: testIds.entityId, direction: "BULLISH", strength: 0.6, confidence: 0.6, freshness: "CURRENT", timeHorizon: "SHORT_TERM", independenceGroup: "PRICE-SERIES-A", commonInputRefs: ["PRICE-SERIES-A"], sourceLineage: ["TECHNICAL-SIGNAL-P17-B"], evidenceStrength: "MODERATE", availableAt: "2026-09-10T00:00:00Z", calculatedAt: "2026-09-10T00:01:00Z" });
    const fundamental = namespace.createExternalIntelligenceCrossDomainMarketSignal({ signalId: testIds.fundamentalSignalId, signalFamily: "FUNDAMENTAL_VALUE", instrumentId, targetEntityId: testIds.entityId, direction: "BEARISH", strength: 0.5, confidence: 0.5, freshness: "CURRENT", timeHorizon: "MEDIUM_TERM", independenceGroup: "FUNDAMENTAL-REPORT-A", commonSourceRefs: ["FUND-REPORT-A"], sourceLineage: ["EVIDENCE-FUND-A"], evidenceStrength: "MODERATE", availableAt: "2026-09-09T00:00:00Z", calculatedAt: "2026-09-09T00:05:00Z" });
    add("Technical / Fundamental atomic signals are preserved separately", technical.ok && momentum.ok && fundamental.ok && technical.data.signal.signalFamily !== fundamental.data.signal.signalFamily, { technical, fundamental }, "Signal");

    const independence = [technical.data.signal, momentum.data.signal].every(function sameGroup(s) { return s.independenceGroup === "PRICE-SERIES-A"; });
    add("Same underlying technical series is not declared independent", independence && technical.data.signal.simpleVoteUnit === false && momentum.data.signal.simpleVoteUnit === false, { technical: technical.data.signal.independenceGroup, momentum: momentum.data.signal.independenceGroup }, "Independence");

    const leaked = namespace.createExternalIntelligenceCrossDomainMarketSignal({ signalId: testIds.leakedSignalId, signalFamily: "NEWS_INFORMATION", instrumentId, targetEntityId: testIds.entityId, direction: "BULLISH", confidence: 0.5, freshness: "CURRENT", timeHorizon: "SHORT_TERM", sourceLineage: ["NEWS-LATE"], availableAt: "2026-09-12T00:00:00Z", calculatedAt: "2026-09-12T00:01:00Z" });
    const leakageCheck = namespace.validateExternalIntelligenceMarketFusionFeatureAvailability({ signalIds: [technical.data.signal.signalId, leaked.data.signal.signalId], decisionTime: "2026-09-11T00:00:00Z" });
    add("Future information leakage is detected and blocked", leaked.ok && leakageCheck.valid === false && leakageCheck.leakageDetected === true && leakageCheck.blockedSignalIds.includes(testIds.leakedSignalId), leakageCheck, "Temporal");

    const hypothesis = await namespace.createExternalIntelligenceCompositeMarketHypothesis({ hypothesisId: testIds.hypothesisId, version: 1, instrumentId, targetMetric: "PRICE_DIRECTION", targetDirection: "BULLISH", timeHorizon: "SHORT_TERM", supportingSignalRefs: [testIds.technicalSignalId, testIds.momentumSignalId], contradictingSignalRefs: [testIds.fundamentalSignalId], regimeProfile: { state: "NORMAL" }, causalMechanismRefs: ["MECHANISM-P18"], uncertaintyProfile: { state: "CONTRADICTED", evidenceStrength: "MODERATE" }, missingEvidence: ["MACRO_CONFIRMATION"], state: "INCONCLUSIVE", fusionCapabilityId: testIds.capabilityId, fusionCapabilityVersion: MODULE_VERSION, decisionTime: "2026-09-11T00:00:00Z" });
    add("Composite Hypothesis preserves contradiction and dependency profile", hypothesis.ok && hypothesis.data.hypothesis.contradictingSignalRefs.includes(testIds.fundamentalSignalId) && hypothesis.data.hypothesis.independenceProfile.redundantGroups.length === 1 && hypothesis.data.hypothesis.simpleVoteAggregationUsed === false, hypothesis, "Fusion");

    const falsePrecision = await namespace.createExternalIntelligenceMarketFusionPredictionCandidate({ hypothesisId: testIds.hypothesisId, probability: 0.82, qualitativeLikelihood: "LIKELY", confidence: "MODERATE", calibrationBasis: { state: "UNASSESSED", sampleCount: 0 } });
    add("Numeric probability without calibration basis is rejected", falsePrecision.ok === false && falsePrecision.code === "EXTERNAL010_MARKET_FUSION_FALSE_PRECISION_BLOCKED", falsePrecision, "Prediction");

    const abstention = await namespace.createExternalIntelligenceMarketFusionPredictionCandidate({ predictionCandidateId: testIds.predictionId, hypothesisId: testIds.hypothesisId, targetMetric: "PRICE_DIRECTION", targetDirection: "BULLISH", targetTime: "2026-09-12T00:00:00Z", timeHorizon: "SHORT_TERM", qualitativeLikelihood: "UNCERTAIN", confidence: "LOW", uncertaintyFactors: ["CONTRADICTING_FUNDAMENTALS"], abstentionState: "CONFLICTING_SIGNALS", calibrationBasis: { state: "INSUFFICIENT_EVIDENCE", sampleCount: 0 } });
    add("Abstention is a valid output and does not create false precision", abstention.ok && abstention.data.predictionCandidate.abstentionState === "CONFLICTING_SIGNALS" && abstention.data.predictionCandidate.probability === null, abstention, "Prediction");

    const pkg = await namespace.createExternalIntelligenceMarketFusionPackage({ fusionPackageId: testIds.packageId, version: 1, instrumentId, asOfTime: "2026-09-11T00:00:00Z", compositeHypothesisRefs: [testIds.hypothesisId], predictionRefs: [testIds.predictionId], regimeProfile: { state: "NORMAL" }, dataQuality: { state: "PASS" }, freshnessProfile: { state: "CURRENT" } });
    add("Fusion Package separates domain signals and preserves FINANCE boundary", pkg.ok && pkg.data.fusionPackage.technicalSignals.length === 2 && pkg.data.fusionPackage.fundamentalSignals.length === 1 && pkg.data.fusionPackage.marketFusionPackageEqualsCapitalAuthority === false && pkg.data.fusionPackage.tradingAuthorityGranted === false, pkg, "Package");

    await namespace.persistExternalIntelligenceMarketFusionPackage(testIds.packageId, 1);
    const readback = await namespace.readBackExternalIntelligenceMarketFusionPackage(testIds.packageId, 1);
    add("Fusion Package persistence/readback preserves immutable package", readback.ok && readback.data.fusionPackage.fusionPackageId === testIds.packageId && readback.data.fusionPackage.immutable === true, readback, "Persistence");

    const benchmark = namespace.registerExternalIntelligenceBenchmarkDefinition({ benchmarkDefinitionId: testIds.benchmarkId, version: 1, targetMetric: "PRICE_DIRECTION", measurementMethod: "DIRECTION_MATCH", targetWindow: "1D", timezone: "UTC" });
    const outcome = namespace.registerExternalIntelligenceOutcome({ outcomeId: testIds.outcomeId, version: 1, predictionId: testIds.d030PredictionId, benchmarkDefinitionId: testIds.benchmarkId, outcomeType: "MARKET_DIRECTION", targetEntityId: instrumentId, targetMetric: "PRICE_DIRECTION", observationTime: "2026-09-12T00:00:00Z", effectiveTime: "2026-09-12T00:00:00Z", settlementState: "FINAL", value: "UP", supportingEvidenceIds: ["P18-OUTCOME-EVIDENCE"] });
    const evaluation = await namespace.recordExternalIntelligenceMarketFusionOutcomeEvaluation({ fusionPackageId: testIds.packageId, outcomeRefs: [testIds.outcomeId], evaluationDimensions: { directionAccuracy: 1, abstentionQuality: "REVIEW" }, signalFamilyContribution: { TECHNICAL_TREND: "POSITIVE", FUNDAMENTAL_VALUE: "CONTRADICTING" } });
    add("Outcome evaluation is outcome-grounded but does not auto-recalibrate production logic", benchmark.ok && outcome.ok && evaluation.ok && evaluation.data.evaluation.automaticRecalibrationPerformed === false && evaluation.data.evaluation.productionFusionLogicChanged === false, evaluation, "Outcome");

    if (typeof namespace.flushExternalIntelligenceAudit === "function") await namespace.flushExternalIntelligenceAudit();
    add("Evidence / Lineage / Audit hooks are active", pkg.ok && Array.isArray(pkg.data.fusionPackage.lineageRefs) && pkg.data.fusionPackage.lineageRefs.length > 0 && namespace.listExternalIntelligenceAuditEvents().some(function event(e) { return e.eventType === "MARKET_FUSION_PACKAGE_CREATED"; }), { lineageRefs: pkg.ok ? pkg.data.fusionPackage.lineageRefs : [], auditCount: namespace.listExternalIntelligenceAuditEvents().length }, "Lineage");
    add("Prediction remains separate from Strategy / Order / Trading Authority", abstention.ok && abstention.data.predictionCandidate.predictionEqualsStrategy === false && abstention.data.predictionCandidate.strategyEqualsOrder === false && abstention.data.predictionCandidate.tradingAuthorityGranted === false, abstention.ok ? abstention.data.predictionCandidate : abstention, "Safety");
    add("Phase 17 technical foundation remains authority-neutral", namespace.modules.technicalSignal.candidateOnly === true && namespace.modules.pythonWorker.tradingAuthorityGranted === false, { technicalSignal: namespace.modules.technicalSignal, pythonWorker: namespace.modules.pythonWorker }, "Regression");

    const failed = checks.filter(function failed(c) { return !c.passed; });
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE18-VALIDATION"), componentId: "EXTERNAL-010", version: VM.release.version, gatewayVersion: VM.gateway.gatewayVersion,
      implementationPhase: VM.release.implementationPhase, decisionCoverage: 54, requirementCoverage: { decision048: true },
      passed: checks.length - failed.length, failed: failed.length, total: checks.length,
      health: checks.length ? Math.round((checks.length - failed.length) * 1000 / checks.length) / 10 : 0,
      criticalFailed: failed.length, status: failed.length ? "EXTERNAL-010 Phase 18 Validation FAILED" : "EXTERNAL-010 Phase 18 Validation PASS",
      releaseAllowed: failed.length === 0, phase18Complete: failed.length === 0, phase19Allowed: failed.length === 0,
      checks, validatedAt: internal.nowIso(), immutable: true
    };
    return result;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase18Validation });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase18Validation = runExternalIntelligencePhase18Validation;
  namespace.modules.phase18Validation = { id: "EXTERNAL-010-PHASE18-VALIDATION", version: MODULE_VERSION, phase: 18, decisions: ["048"], status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
