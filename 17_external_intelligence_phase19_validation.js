/* ============================================================
   FILE: 17_external_intelligence_phase19_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.18.1
   Phase 19 Functional Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal;
  const MODULE_VERSION = VM.getModuleVersion("phase19Validation");

  async function runExternalIntelligencePhase19Validation() {
    if (typeof namespace.initializeExternalIntelligencePhase19Definitions === "function") namespace.initializeExternalIntelligencePhase19Definitions();
    const checks = [];
    const add = function add(name, passed, detail, group) {
      checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Phase 19", severity: "Critical" });
    };
    const runToken = internal.nextId("P19-RUN").replace(/[^A-Z0-9._-]/gi, "-");
    const ids = {
      venueId: "P19V-" + runToken,
      symbol: "P19A-" + runToken,
      delistedSymbol: "P19D-" + runToken,
      entityId: "ENTITY-P19-" + runToken,
      fusionCapabilityId: "EXTERNAL-010-CAPABILITY-P19-FUSION-" + runToken,
      backtestCapabilityId: "EXTERNAL-010-CAPABILITY-P19-BACKTEST-" + runToken,
      signalId: runToken + "-SIG",
      hypothesisId: runToken + "-HYP",
      strategyId: runToken + "-STRAT",
      datasetId: runToken + "-DATA",
      universeId: runToken + "-UNIVERSE",
      ruleProfileId: runToken + "-RULE-PROFILE",
      ruleSnapshotId: runToken + "-RULE-SNAPSHOT",
      costId: runToken + "-COST",
      executionId: runToken + "-EXEC",
      protocolId: runToken + "-PROTOCOL",
      fingerprintId: null,
      backtestId: runToken + "-BT-PASS",
      failedBacktestId: runToken + "-BT-FAIL",
      readinessId: runToken + "-READY",
      handoffId: runToken + "-HANDOFF"
    };

    add("Release is Phase 19 v1.18.1 compatible", VM.isReleaseCompatibleFrom("1.18.1"), VM.release.version, "Foundation");
    add("Implementation Phase is Phase 19", VM.release.phase === 19, VM.release.implementationPhase, "Foundation");
    add("Primary Decision is 049", namespace.modules.strategyExperiment && namespace.modules.strategyExperiment.decisions.includes("049"), namespace.modules.strategyExperiment, "Foundation");
    add("Gateway remains unchanged at 1.4.0", VM.gateway.gatewayVersion === "1.4.0", VM.gateway.gatewayVersion, "Boundary");

    const contractKeys = ["strategyHypothesisReference", "strategyDatasetSnapshot", "historicalUniverseSnapshot", "marketRuleSnapshot", "transactionCostModel", "executionModel", "strategyExperimentProtocol", "strategyTrialRecord", "strategyFingerprint", "strategyBacktestResult", "strategyExperimentReadiness", "strategyFinanceHandoff"];
    add("Phase 19 contracts are registered", contractKeys.every(function exists(k) { return !!namespace.getExternalIntelligenceContract(k); }), contractKeys, "Contract");
    const schemaIds = ["EXTERNAL-010-SCHEMA-STRATEGY-HYPOTHESIS-REFERENCE", "EXTERNAL-010-SCHEMA-STRATEGY-DATASET-SNAPSHOT", "EXTERNAL-010-SCHEMA-HISTORICAL-UNIVERSE-SNAPSHOT", "EXTERNAL-010-SCHEMA-MARKET-RULE-SNAPSHOT", "EXTERNAL-010-SCHEMA-TRANSACTION-COST-MODEL", "EXTERNAL-010-SCHEMA-EXECUTION-MODEL", "EXTERNAL-010-SCHEMA-STRATEGY-EXPERIMENT-PROTOCOL", "EXTERNAL-010-SCHEMA-STRATEGY-TRIAL-RECORD", "EXTERNAL-010-SCHEMA-STRATEGY-FINGERPRINT", "EXTERNAL-010-SCHEMA-STRATEGY-BACKTEST-RESULT", "EXTERNAL-010-SCHEMA-STRATEGY-EXPERIMENT-READINESS", "EXTERNAL-010-SCHEMA-STRATEGY-FINANCE-HANDOFF"];
    add("Phase 19 schemas are registered", schemaIds.every(function exists(id) { return !!namespace.getExternalIntelligenceSchema(id); }), schemaIds, "Schema");

    const venue = namespace.registerExternalIntelligenceMarketVenue({ venueId: ids.venueId, venueName: "P19 Test Venue", timeZone: "UTC" });
    const instrument = namespace.registerExternalIntelligenceMarketInstrument({ venueId: ids.venueId, symbol: ids.symbol, assetType: "EQUITY", currency: "USD", entityId: ids.entityId });
    const delisted = namespace.registerExternalIntelligenceMarketInstrument({ venueId: ids.venueId, symbol: ids.delistedSymbol, assetType: "EQUITY", currency: "USD", entityId: ids.entityId + "-D" });
    const ruleProfile = namespace.registerExternalIntelligenceMarketRuleProfile({ marketRuleProfileId: ids.ruleProfileId, venueId: ids.venueId, tickSize: 0.01, sessionPolicy: "VENUE_DEFINED" });
    add("Phase 17 market identity and rule profile remain reusable", venue.ok && instrument.ok && delisted.ok && ruleProfile.ok, { venue: venue.ok, instrument: instrument.ok, ruleProfile: ruleProfile.ok }, "Regression");

    const fusionCapability = namespace.registerExternalIntelligenceMarketFusionCapability({ fusionCapabilityId: ids.fusionCapabilityId, fusionCapabilityVersion: "1.17.1", fusionMethod: "RULE_BASED" });
    const signal = namespace.createExternalIntelligenceCrossDomainMarketSignal({ signalId: ids.signalId, signalFamily: "TECHNICAL_TREND", instrumentId: instrument.data.instrument.instrumentId, targetEntityId: ids.entityId, direction: "BULLISH", strength: 0.6, confidence: 0.6, freshness: "CURRENT", timeHorizon: "SHORT_TERM", independenceGroup: "P19-PRICE", sourceLineage: ["P19-EVIDENCE"], evidenceStrength: "MODERATE", availableAt: "2026-09-01T00:00:00Z", effectiveAt: "2026-09-01T00:00:00Z", calculatedAt: "2026-09-01T00:01:00Z" });
    const hypothesis = await namespace.createExternalIntelligenceCompositeMarketHypothesis({ hypothesisId: ids.hypothesisId, version: 1, instrumentId: instrument.data.instrument.instrumentId, targetMetric: "PRICE_DIRECTION", targetDirection: "BULLISH", timeHorizon: "SHORT_TERM", supportingSignalRefs: [ids.signalId], contradictingSignalRefs: [], regimeProfile: { state: "NORMAL" }, causalMechanismRefs: ["P19-MECHANISM"], uncertaintyProfile: { state: "MODERATE" }, missingEvidence: [], state: "SUPPORTED", fusionCapabilityId: ids.fusionCapabilityId, fusionCapabilityVersion: "1.17.1", decisionTime: "2026-09-05T00:00:00Z" });
    add("Phase 18 hypothesis remains reusable without becoming Strategy automatically", fusionCapability.ok && signal.ok && hypothesis.ok && namespace.modules.marketFusion.predictionEqualsStrategy === false, { hypothesis: hypothesis.ok, predictionEqualsStrategy: namespace.modules.marketFusion.predictionEqualsStrategy }, "Regression");

    const strategy = await namespace.createExternalIntelligenceStrategyHypothesisReference({ strategyHypothesisId: ids.strategyId, compositeHypothesisRef: ids.hypothesisId, entryReasoning: "Enter only when experiment protocol conditions are satisfied", exitReasoning: "Exit per protocol, not by implicit trading authority", expectedMarketBehavior: "Short-term bullish continuation", targetHorizon: "SHORT_TERM", requiredSignalCombination: [ids.signalId] });
    add("Strategy Hypothesis is a separate reference and not an Experiment", strategy.ok && strategy.data.strategyHypothesis.hypothesisEqualsExperiment === false && strategy.data.strategyHypothesis.tradingAuthorityGranted === false, strategy, "Strategy");

    const dataset = namespace.createExternalIntelligenceStrategyDatasetSnapshot({ datasetSnapshotId: ids.datasetId, version: 1, asOfTime: "2026-09-05T00:00:00Z", dataRefs: [
      { referenceId: "P19-BAR-1", recordType: "MARKET_BAR", versionId: "1", availableAt: "2026-09-01T00:01:00Z", effectiveAt: "2026-09-01T00:00:00Z", finalizationState: "FINAL", leakageRisk: "NONE" },
      { referenceId: "P19-FUND-1", recordType: "FUNDAMENTAL", versionId: "1", availableAt: "2026-09-02T00:00:00Z", effectiveAt: "2026-09-01T00:00:00Z", leakageRisk: "NONE" }
    ], dataVersions: { market: "v1", fundamental: "v1" }, sourceVersions: { source: "snapshot-v1" } });
    const universe = namespace.createExternalIntelligenceHistoricalUniverseSnapshot({ historicalUniverseSnapshotId: ids.universeId, version: 1, asOfTime: "2026-09-05T00:00:00Z", survivorshipValidationState: "PASS", includesInactiveMembersWhenApplicable: true, members: [
      { instrumentId: instrument.data.instrument.instrumentId, historicalStatus: "ACTIVE", effectiveFrom: "2020-01-01", evidenceRefs: ["P19-UNIVERSE-E1"] },
      { instrumentId: delisted.data.instrument.instrumentId, historicalStatus: "DELISTED", effectiveFrom: "2020-01-01", effectiveTo: "2025-12-31", evidenceRefs: ["P19-UNIVERSE-E2"] }
    ] });
    add("Dataset and historical Universe are point-in-time snapshots", dataset.ok && universe.ok && universe.data.historicalUniverseSnapshot.currentUniverseEqualsHistoricalUniverse === false && universe.data.historicalUniverseSnapshot.includesInactiveMembersWhenApplicable === true, { dataset: dataset.ok, universe: universe.ok }, "Snapshot");

    const ruleSnapshot = namespace.createExternalIntelligenceMarketRuleSnapshot({ marketRuleSnapshotId: ids.ruleSnapshotId, version: 1, marketRuleProfileId: ids.ruleProfileId, periodStart: "2026-01-01", periodEnd: "2026-09-05", tradingSession: { policy: "REGULAR" }, tickSize: 0.01, tradingUnit: 1, priceLimit: { type: "VENUE_RULE" }, marketControlRule: { state: "NORMAL" }, historicalEvidenceRefs: ["P19-RULE-EVIDENCE"], historicalRuleIntegrityState: "PASS" });
    add("Historical Market Rule Snapshot does not assume current rule equals historical rule", ruleSnapshot.ok && ruleSnapshot.data.marketRuleSnapshot.currentMarketRuleEqualsHistoricalMarketRule === false && ruleSnapshot.data.marketRuleSnapshot.historicalRuleIntegrityState === "PASS", ruleSnapshot, "Snapshot");

    const unknownHistoricalRule = namespace.createExternalIntelligenceMarketRuleSnapshot({ marketRuleSnapshotId: ids.ruleSnapshotId + "-UNKNOWN", version: 1, marketRuleProfileId: ids.ruleProfileId, periodStart: "2025-01-01", periodEnd: "2025-12-31" });
    add("Historical Market Rule does not inherit current trading session/tick size when historical values are unknown", unknownHistoricalRule.ok && unknownHistoricalRule.data.marketRuleSnapshot.tradingSession === null && unknownHistoricalRule.data.marketRuleSnapshot.tickSize === null && unknownHistoricalRule.data.marketRuleSnapshot.historicalRuleIntegrityState === "UNKNOWN" && unknownHistoricalRule.data.marketRuleSnapshot.currentRuleFallbackApplied === false && unknownHistoricalRule.data.marketRuleSnapshot.knownLimitations.includes("HISTORICAL_RULE_EVIDENCE_NOT_PROVIDED"), unknownHistoricalRule, "Snapshot");

    const cost = namespace.createExternalIntelligenceTransactionCostModel({ transactionCostModelId: ids.costId, version: "1.0.0", commission: 0.001, spread: 0.001, slippage: 0.001, exchangeFee: 0.0001, realisticExecutionClaimed: true });
    const zeroCost = namespace.createExternalIntelligenceTransactionCostModel({ transactionCostModelId: ids.costId + "-ZERO", version: "1.0.0", zeroCostAssumption: true });
    const execution = namespace.createExternalIntelligenceExecutionModel({ executionModelId: ids.executionId, version: "1.0.0", modelType: "VOLUME_CONSTRAINED", liquidityConstraintState: "MODELED", parameters: { maxParticipationRate: 0.05 } });
    add("Cost and Execution assumptions are versioned and explicit", cost.ok && zeroCost.ok && zeroCost.data.transactionCostModel.assumptionState === "ZERO_COST_ASSUMPTION" && zeroCost.data.transactionCostModel.realisticExecutionClaimed === false && execution.ok && execution.data.executionModel.signalPriceEqualsExecutionPrice === false, { cost, zeroCost, execution }, "Execution Assumption");

    const backtestCapability = namespace.registerExternalIntelligenceBacktestEngineCapability({ backtestCapabilityId: ids.backtestCapabilityId, engineVersion: "1.0.0", algorithmVersion: "1.0.0" });
    add("Backtest engine is a versioned analytical capability without authority promotion", backtestCapability.ok && backtestCapability.data.analyticalCapability.highPerformanceGrantsActionAuthority === false, backtestCapability, "Capability");

    const protocol = await namespace.registerExternalIntelligenceStrategyExperimentProtocol({ experimentProtocolId: ids.protocolId, protocolVersion: "1.0.0", strategyHypothesisId: ids.strategyId, datasetSnapshotId: ids.datasetId, historicalUniverseSnapshotId: ids.universeId, marketRuleSnapshotId: ids.ruleSnapshotId, transactionCostModelId: ids.costId, executionModelId: ids.executionId, backtestCapabilityId: ids.backtestCapabilityId, targetUniverse: { snapshotId: ids.universeId }, entryLogic: { rule: "P19_ENTRY" }, exitLogic: { rule: "P19_EXIT" }, featureSet: ["P19-BAR-1", "P19-FUND-1"], parameterSearchSpace: { threshold: [0.4, 0.5, 0.6] }, timeHorizon: "SHORT_TERM", trainingWindow: { start: "2024-01-01", end: "2025-06-30" }, validationWindow: { start: "2025-07-01", end: "2025-12-31" }, outOfSampleWindow: { start: "2026-01-01", end: "2026-06-30" }, benchmarkDefinition: { type: "BUY_AND_HOLD" }, riskMetrics: ["MAX_DRAWDOWN", "TURNOVER"], successCriteria: { relativeReturnPositive: true }, failureCriteria: { lookAhead: true, leakage: true } });
    const duplicateProtocol = await namespace.registerExternalIntelligenceStrategyExperimentProtocol({ experimentProtocolId: ids.protocolId, protocolVersion: "1.0.0", strategyHypothesisId: ids.strategyId, datasetSnapshotId: ids.datasetId, historicalUniverseSnapshotId: ids.universeId, marketRuleSnapshotId: ids.ruleSnapshotId, transactionCostModelId: ids.costId, executionModelId: ids.executionId, backtestCapabilityId: ids.backtestCapabilityId });
    add("Experiment Protocol is pre-registered, immutable, and binds exact snapshot/model versions", protocol.ok && protocol.data.experimentProtocol.preRegistered === true && protocol.data.experimentProtocol.resultsObservedBeforeRegistration === false && protocol.data.experimentProtocol.strategyHypothesisVersion === 1 && protocol.data.experimentProtocol.datasetSnapshotVersion === 1 && protocol.data.experimentProtocol.historicalUniverseSnapshotVersion === 1 && protocol.data.experimentProtocol.marketRuleSnapshotVersion === 1 && protocol.data.experimentProtocol.transactionCostModelVersion === "1.0.0" && protocol.data.experimentProtocol.executionModelVersion === "1.0.0" && protocol.data.experimentProtocol.backtestCapabilityVersion === "1.0.0" && duplicateProtocol.ok === false, { protocol, duplicateProtocol }, "Protocol");

    const backtestCapabilityV2 = namespace.registerExternalIntelligenceBacktestEngineCapability({ backtestCapabilityId: ids.backtestCapabilityId, engineVersion: "2.0.0", algorithmVersion: "2.0.0", availabilityState: "READY" });
    add("Protocol remains bound to exact Backtest Engine version after a newer engine version becomes current", backtestCapabilityV2.ok && protocol.data.experimentProtocol.backtestCapabilityVersion === "1.0.0", { protocolVersion: protocol.data.experimentProtocol.backtestCapabilityVersion, currentEngineVersion: backtestCapabilityV2.ok && backtestCapabilityV2.data.analyticalCapability.recordVersion }, "Reproducibility");

    const pointInTime = namespace.validateExternalIntelligenceStrategyPointInTime({ decisionTime: "2026-09-05T00:00:00Z", features: dataset.data.datasetSnapshot.dataRefs, strict: true });
    const lookAheadRejected = namespace.validateExternalIntelligenceStrategyPointInTime({ decisionTime: "2026-09-05T00:00:00Z", features: [{ referenceId: "P19-FUTURE", featureAvailableAt: "2026-09-06T00:00:00Z" }], strict: true });
    add("Point-in-Time / Look-Ahead gate blocks future availability", pointInTime.valid === true && lookAheadRejected.valid === false && lookAheadRejected.lookAheadDetected === true, { pointInTime, lookAheadRejected }, "Temporal");

    const leakage = namespace.validateExternalIntelligenceStrategyLeakage({ decisionTime: "2026-09-05T00:00:00Z", features: dataset.data.datasetSnapshot.dataRefs });
    const leakageRejected = namespace.validateExternalIntelligenceStrategyLeakage({ decisionTime: "2026-09-05T00:00:00Z", features: [{ referenceId: "P19-FUTURE-OUTCOME", featureAvailableAt: "2026-09-04T00:00:00Z", futureOutcomeData: true }] });
    add("Feature Leakage control rejects future outcome/revision contamination", leakage.valid === true && leakageRejected.valid === false && leakageRejected.leakageDetected === true, { leakage, leakageRejected }, "Temporal");

    const trial1 = await namespace.recordExternalIntelligenceStrategyTrial({ experimentProtocolId: ids.protocolId, protocolVersion: "1.0.0", testedParameters: { threshold: 0.4 }, searchMethod: "GRID", resultSummary: { score: 0.1 }, selected: false });
    const trial2 = await namespace.recordExternalIntelligenceStrategyTrial({ experimentProtocolId: ids.protocolId, protocolVersion: "1.0.0", testedParameters: { threshold: 0.5 }, searchMethod: "GRID", resultSummary: { score: 0.2 }, selected: true, selectionReason: "Best validation score" });
    const trial3 = await namespace.recordExternalIntelligenceStrategyTrial({ experimentProtocolId: ids.protocolId, protocolVersion: "1.0.0", testedParameters: { threshold: 0.6 }, searchMethod: "GRID", resultSummary: { score: 0.15 }, selected: false });
    add("Trial / parameter-search history is append-only and preserved", trial1.ok && trial2.ok && trial3.ok && namespace.listExternalIntelligenceStrategyTrials(ids.protocolId, "1.0.0").length === 3 && namespace.listExternalIntelligenceStrategyTrials(ids.protocolId, "1.0.0").every(function preserved(t) { return t.preserved === true; }), namespace.listExternalIntelligenceStrategyTrials(ids.protocolId, "1.0.0"), "Trial History");

    const fingerprint = await namespace.createExternalIntelligenceStrategyFingerprint({ strategyHypothesisId: ids.strategyId, featureSet: ["P19-BAR-1", "P19-FUND-1"], logicStructure: { entry: "P19_ENTRY", exit: "P19_EXIT" }, parameters: { threshold: 0.5 }, universeRef: ids.universeId, horizon: "SHORT_TERM", exitLogic: { rule: "P19_EXIT" } });
    ids.fingerprintId = fingerprint.ok ? fingerprint.data.strategyFingerprint.strategyFingerprintId : null;
    add("Strategy Fingerprint is stable metadata and not a security identity", fingerprint.ok && fingerprint.data.strategyFingerprint.securityIdentity === false && !!fingerprint.data.strategyFingerprint.fingerprintHash, fingerprint, "Fingerprint");

    const backtest = await namespace.recordExternalIntelligenceStrategyBacktestResult({ backtestResultId: ids.backtestId, experimentProtocolId: ids.protocolId, protocolVersion: "1.0.0", strategyFingerprintId: ids.fingerprintId, engineCapabilityId: ids.backtestCapabilityId, pointInTimeValidation: pointInTime, lookAheadValidation: pointInTime, leakageValidation: leakage, survivorshipValidationState: "PASS", costModelState: "PASS", executionModelState: "PASS", walkForwardState: "PASS", outOfSampleState: "PASS", parameterRobustnessState: "PASS", regimeRobustnessState: "PASS", parameterSensitivityState: "ROBUST", metrics: { totalReturn: 0.12, maximumDrawdown: 0.08, tradeCount: 120, turnover: 1.4 }, benchmarkMetrics: { relativeReturn: 0.03 }, sampleStrength: "MODERATE", performanceCriteriaMet: true });
    add("Backtest Result only validates after mandatory bias/cost/execution/robustness gates pass", backtest.ok && backtest.data.backtestResult.backtestState === "BACKTEST_VALIDATED" && backtest.data.backtestResult.trialCount === 3, backtest, "Backtest");
    add("Backtest Result uses the exact engine version pinned by Experiment Protocol", backtest.ok && backtest.data.backtestResult.engineCapabilityId === ids.backtestCapabilityId && backtest.data.backtestResult.engineVersion === "1.0.0", backtest, "Reproducibility");

    const failedBacktest = await namespace.recordExternalIntelligenceStrategyBacktestResult({ backtestResultId: ids.failedBacktestId, experimentProtocolId: ids.protocolId, protocolVersion: "1.0.0", strategyFingerprintId: ids.fingerprintId, engineCapabilityId: ids.backtestCapabilityId, pointInTimeValidation: pointInTime, lookAheadValidation: lookAheadRejected, leakageValidation: leakageRejected, survivorshipValidationState: "PASS", costModelState: "PASS", executionModelState: "PASS", walkForwardState: "FAIL", outOfSampleState: "FAIL", parameterRobustnessState: "FAIL", regimeRobustnessState: "FAIL", parameterSensitivityState: "CLIFF_EDGE", metrics: { totalReturn: 0.5 }, sampleStrength: "LOW", performanceCriteriaMet: false, failureReasons: ["OVERFIT"] });
    add("Failed experiment and failure reasons are preserved instead of hidden", failedBacktest.ok && failedBacktest.data.backtestResult.failedExperimentPreserved === true && namespace.listExternalIntelligenceStrategyFailureRecords().some(function found(f) { return f.backtestResultId === ids.failedBacktestId && f.preserved === true; }), { failedBacktest, failures: namespace.listExternalIntelligenceStrategyFailureRecords() }, "Failure Preservation");

    const readiness = await namespace.createExternalIntelligenceStrategyExperimentReadiness({ strategyExperimentReadinessId: ids.readinessId, backtestResultId: ids.backtestId, knownLimitations: ["PAPER_NOT_VALIDATED", "REAL_EXECUTION_NOT_VALIDATED"], validationRefs: ["P19-VALIDATION-REF"] });
    add("Readiness can reach BACKTEST_READY but is not Paper/Real-Money approval", readiness.ok && readiness.data.readiness.readinessState === "BACKTEST_READY" && readiness.data.readiness.paperActivationAuthorityGranted === false && readiness.data.readiness.realMoneyAuthorityGranted === false && readiness.data.readiness.readinessEqualsAuthority === false, readiness, "Readiness");

    const handoff = await namespace.createExternalIntelligenceStrategyFinanceHandoff({ financeHandoffId: ids.handoffId, strategyExperimentReadinessId: ids.readinessId });
    add("FINANCE handoff carries readiness but grants no Portfolio/Broker/Order/Execution/Real-Money authority", handoff.ok && handoff.data.financeHandoff.targetPlatform === "FINANCE" && handoff.data.financeHandoff.portfolioAuthorityGranted === false && handoff.data.financeHandoff.positionSizingAuthorityGranted === false && handoff.data.financeHandoff.brokerAuthorityGranted === false && handoff.data.financeHandoff.orderAuthorityGranted === false && handoff.data.financeHandoff.executionAuthorityGranted === false && handoff.data.financeHandoff.realMoneyAuthorityGranted === false, handoff, "Authority");

    const failureRecord = namespace.listExternalIntelligenceStrategyFailureRecords().find(function found(f) { return f.backtestResultId === ids.failedBacktestId; });
    const persistenceTargets = [
      ["strategy", ids.strategyId, 1], ["dataset", ids.datasetId, 1], ["universe", ids.universeId, 1], ["marketrule", ids.ruleSnapshotId, 1],
      ["costmodel", ids.costId, "1.0.0"], ["executionmodel", ids.executionId, "1.0.0"], ["protocol", ids.protocolId, "1.0.0"],
      ["trial", trial2.data.strategyTrial.strategyTrialId], ["fingerprint", ids.fingerprintId], ["backtest", ids.backtestId],
      ["failure", failureRecord && failureRecord.failureId], ["readiness", ids.readinessId], ["handoff", ids.handoffId]
    ];
    const persistenceResults = [];
    for (const target of persistenceTargets) {
      const persisted = await namespace.persistExternalIntelligenceStrategyExperimentRecord(target[0], target[1], target[2]);
      const readback = await namespace.readBackExternalIntelligenceStrategyExperimentRecord(target[0], target[1], target[2]);
      persistenceResults.push({ kind: target[0], persisted: persisted.ok, readback: readback.ok, immutable: !!(readback.ok && readback.data.record && readback.data.record.immutable) });
    }
    add("Phase 19 persistence/readback preserves snapshots, assumptions, trial/failure history, result, readiness and FINANCE handoff", persistenceResults.every(function pass(item) { return item.persisted && item.readback && item.immutable; }), persistenceResults, "Persistence");

    const auditEvents = typeof namespace.listExternalIntelligenceAuditEvents === "function" ? namespace.listExternalIntelligenceAuditEvents() : [];
    const auditChain = typeof namespace.verifyExternalIntelligenceAuditChain === "function" ? await namespace.verifyExternalIntelligenceAuditChain() : null;
    const lineage = typeof namespace.traceExternalIntelligenceReverseProvenance === "function" ? namespace.traceExternalIntelligenceReverseProvenance(ids.readinessId, 5) : null;
    add("Audit and Lineage integrations preserve a valid Experiment/Backtest/Readiness hash chain", auditEvents.some(function e(e) { return e.eventType === "EXPERIMENT_PROTOCOL_REGISTERED"; }) && auditEvents.some(function e(e) { return e.eventType === "BACKTEST_COMPLETED"; }) && auditEvents.some(function e(e) { return e.eventType === "STRATEGY_READINESS_CREATED"; }) && auditChain && auditChain.valid === true && lineage && Array.isArray(lineage.references) && lineage.references.length > 0, { auditCount: auditEvents.length, auditChain, lineage }, "Lineage");

    const safety = namespace.modules.strategyExperiment;
    add("Decision 049 safety rules and FINANCE authority boundary remain fail-closed", [
      "strategyHypothesisEqualsExperiment", "highBacktestReturnEqualsValidatedStrategy", "currentUniverseEqualsHistoricalUniverse",
      "currentMarketRuleEqualsHistoricalMarketRule", "signalPriceEqualsExecutionPrice", "zeroCostBacktestEqualsExecutableReturn",
      "paperFillEqualsRealFill", "paperProfitEqualsExpectedRealProfit", "missingMarketDataEqualsFlatMarket", "highSharpeEqualsSafeStrategy",
      "bestParameterEqualsRobustParameter", "historicalPerformanceEqualsRegimeRobustness", "backtestPassEqualsPaperApproval",
      "paperPassEqualsRealMoneyApproval", "readinessEqualsAuthority", "failedOnceEqualsUniversallyUseless",
      "successfulStrategyAllowsCapitalExpansion", "researchFreedomAllowsUnlimitedParameterSearch", "generatorEqualsIndependentValidator"
    ].every(function falseRule(name) { return safety[name] === false; }) && safety.tradingAuthorityGranted === false && safety.portfolioAuthorityGranted === false && safety.orderAuthorityGranted === false && safety.executionAuthorityGranted === false && safety.realMoneyAuthorityGranted === false && safety.capitalExpansionAuthorityGranted === false, safety, "Safety");

    const failed = checks.filter(function failed(c) { return !c.passed; });
    return {
      id: internal.nextId("EXTERNAL-010-PHASE19-VALIDATION"), componentId: "EXTERNAL-010", version: VM.release.version,
      gatewayVersion: VM.gateway.gatewayVersion, implementationPhase: VM.release.implementationPhase, decisionCoverage: 54,
      requirementCoverage: { decision049: true }, passed: checks.length - failed.length, failed: failed.length, total: checks.length,
      health: checks.length ? Math.round((checks.length - failed.length) * 1000 / checks.length) / 10 : 0,
      criticalFailed: failed.length, status: failed.length ? "EXTERNAL-010 Phase 19 Validation FAILED" : "EXTERNAL-010 Phase 19 Validation PASS",
      releaseAllowed: failed.length === 0, phase19Complete: failed.length === 0, phase20Allowed: failed.length === 0,
      checks, validatedAt: internal.nowIso(), immutable: true
    };
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase19Validation });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase19Validation = runExternalIntelligencePhase19Validation;
  namespace.modules.phase19Validation = { id: "EXTERNAL-010-PHASE19-VALIDATION", version: MODULE_VERSION, phase: 19, decisions: ["049"], status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
