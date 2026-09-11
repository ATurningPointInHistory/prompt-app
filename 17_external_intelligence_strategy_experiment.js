/* ============================================================
   FILE: 17_external_intelligence_strategy_experiment.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.18.1
   Phase 19: Market Strategy Experiment / Backtest Readiness
   Primary Decision: 049
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("strategyExperiment");

  [
    "strategyHypothesisReferences",
    "strategyDatasetSnapshots",
    "strategyUniverseSnapshots",
    "strategyMarketRuleSnapshots",
    "strategyTransactionCostModels",
    "strategyExecutionModels",
    "strategyExperimentProtocols",
    "strategyTrialRecords",
    "strategyBacktestResults",
    "strategyFingerprints",
    "strategyFailureRecords",
    "strategyExperimentReadiness",
    "strategyFinanceHandoffs",
    "strategyBacktestCapabilities"
  ].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  const EXECUTION_MODELS = new Set([
    "MARKET_NEXT_OPEN", "MARKET_NEXT_BAR", "LIMIT_TOUCH",
    "VOLUME_CONSTRAINED", "PARTIAL_FILL_MODEL", "CUSTOM"
  ]);
  const PARAMETER_SENSITIVITY = new Set([
    "ROBUST", "MODERATELY_SENSITIVE", "HIGHLY_SENSITIVE", "CLIFF_EDGE",
    "INSUFFICIENT_SAMPLE", "UNKNOWN"
  ]);
  const ROBUSTNESS_STATES = new Set(["PASS", "PASS_WITH_WARNINGS", "FAIL", "INSUFFICIENT_SAMPLE", "NOT_EVALUATED", "UNKNOWN"]);
  const VALIDATION_STATES = new Set(["PASS", "PASS_WITH_WARNINGS", "FAIL", "BLOCKED", "NOT_EVALUATED", "UNKNOWN"]);
  const BACKTEST_STATES = new Set(["BACKTEST_VALIDATED", "BACKTEST_FAILED", "BACKTEST_INCONCLUSIVE", "BACKTEST_BLOCKED"]);
  const READINESS_STATES = new Set(["NOT_READY", "BACKTEST_READY", "SHADOW_READY", "PAPER_READY"]);
  const FAILURE_REASONS = new Set([
    "OVERFIT", "LOOK_AHEAD", "SURVIVORSHIP_CONTAMINATED", "FEATURE_LEAKAGE",
    "HIGH_COST", "LOW_SAMPLE", "REGIME_FRAGILE", "EXCESSIVE_DRAWDOWN",
    "LOW_LIQUIDITY", "UNSTABLE_PARAMETERS", "NO_OUT_OF_SAMPLE_EDGE",
    "EXECUTION_UNREALISTIC", "UNKNOWN"
  ]);

  const DEFINITIONS = [
    ["strategyHypothesisReference", "EXTERNAL-010-CONTRACT-STRATEGY-HYPOTHESIS-REFERENCE", "EXTERNAL-010-SCHEMA-STRATEGY-HYPOTHESIS-REFERENCE", [
      "strategyHypothesisId", "version", "compositeHypothesisRef", "predictionCandidateRef", "fusionPackageRef",
      "entryReasoning", "exitReasoning", "expectedMarketBehavior", "targetHorizon", "requiredSignalCombination",
      "hypothesisEqualsExperiment", "tradingAuthorityGranted", "createdAt", "immutable"
    ]],
    ["strategyDatasetSnapshot", "EXTERNAL-010-CONTRACT-STRATEGY-DATASET-SNAPSHOT", "EXTERNAL-010-SCHEMA-STRATEGY-DATASET-SNAPSHOT", [
      "datasetSnapshotId", "version", "asOfTime", "dataRefs", "dataVersions", "sourceVersions", "availabilityState",
      "pointInTimeRequired", "currentStateEqualsHistoricalInputState", "createdAt", "immutable"
    ]],
    ["historicalUniverseSnapshot", "EXTERNAL-010-CONTRACT-HISTORICAL-UNIVERSE-SNAPSHOT", "EXTERNAL-010-SCHEMA-HISTORICAL-UNIVERSE-SNAPSHOT", [
      "historicalUniverseSnapshotId", "version", "asOfTime", "members", "survivorshipValidationState",
      "includesInactiveMembersWhenApplicable", "currentUniverseEqualsHistoricalUniverse", "evidenceRefs", "createdAt", "immutable"
    ]],
    ["marketRuleSnapshot", "EXTERNAL-010-CONTRACT-MARKET-RULE-SNAPSHOT", "EXTERNAL-010-SCHEMA-MARKET-RULE-SNAPSHOT", [
      "marketRuleSnapshotId", "version", "marketRuleProfileId", "periodStart", "periodEnd", "tradingSession", "tickSize",
      "tradingUnit", "priceLimit", "marketControlRule", "historicalEvidenceRefs", "historicalRuleIntegrityState",
      "currentMarketRuleEqualsHistoricalMarketRule", "knownLimitations", "createdAt", "immutable"
    ]],
    ["transactionCostModel", "EXTERNAL-010-CONTRACT-TRANSACTION-COST-MODEL", "EXTERNAL-010-SCHEMA-TRANSACTION-COST-MODEL", [
      "transactionCostModelId", "version", "commission", "spread", "slippage", "exchangeFee", "brokerFee", "taxAssumption",
      "borrowCost", "financingCost", "marketImpact", "assumptionState", "zeroCostBacktestEqualsExecutableReturn",
      "realisticExecutionClaimed", "createdAt", "immutable"
    ]],
    ["executionModel", "EXTERNAL-010-CONTRACT-EXECUTION-MODEL", "EXTERNAL-010-SCHEMA-EXECUTION-MODEL", [
      "executionModelId", "version", "modelType", "parameters", "liquidityConstraintState", "fillStates", "intrabarAmbiguityPolicy",
      "signalPriceEqualsExecutionPrice", "paperFillEqualsRealFill", "createdAt", "immutable"
    ]],
    ["strategyExperimentProtocol", "EXTERNAL-010-CONTRACT-STRATEGY-EXPERIMENT-PROTOCOL", "EXTERNAL-010-SCHEMA-STRATEGY-EXPERIMENT-PROTOCOL", [
      "experimentProtocolId", "protocolVersion", "strategyHypothesisId", "strategyHypothesisVersion", "datasetSnapshotId", "datasetSnapshotVersion",
      "historicalUniverseSnapshotId", "historicalUniverseSnapshotVersion", "marketRuleSnapshotId", "marketRuleSnapshotVersion",
      "transactionCostModelId", "transactionCostModelVersion", "executionModelId", "executionModelVersion",
      "backtestCapabilityId", "backtestCapabilityVersion", "targetUniverse", "entryLogic",
      "exitLogic", "featureSet", "parameterSearchSpace", "timeHorizon", "trainingWindow", "validationWindow", "outOfSampleWindow",
      "benchmarkDefinition", "riskMetrics", "successCriteria", "failureCriteria", "preRegistered", "resultsObservedBeforeRegistration",
      "paperAuthorityGranted", "realMoneyAuthorityGranted", "createdAt", "immutable"
    ]],
    ["strategyTrialRecord", "EXTERNAL-010-CONTRACT-STRATEGY-TRIAL-RECORD", "EXTERNAL-010-SCHEMA-STRATEGY-TRIAL-RECORD", [
      "strategyTrialId", "experimentProtocolId", "protocolVersion", "trialSequence", "testedParameters", "searchMethod", "resultSummary",
      "trialState", "selected", "selectionReason", "preserved", "createdAt", "immutable"
    ]],
    ["strategyFingerprint", "EXTERNAL-010-CONTRACT-STRATEGY-FINGERPRINT", "EXTERNAL-010-SCHEMA-STRATEGY-FINGERPRINT", [
      "strategyFingerprintId", "strategyHypothesisId", "strategyHypothesisVersion", "featureSet", "logicStructure", "parameters", "universeRef", "universeVersion", "horizon", "exitLogic",
      "fingerprintHash", "hashAlgorithm", "securityIdentity", "createdAt", "immutable"
    ]],
    ["strategyBacktestResult", "EXTERNAL-010-CONTRACT-STRATEGY-BACKTEST-RESULT", "EXTERNAL-010-SCHEMA-STRATEGY-BACKTEST-RESULT", [
      "backtestResultId", "experimentProtocolId", "protocolVersion", "strategyFingerprintId", "engineCapabilityId", "engineVersion",
      "pointInTimeValidation", "lookAheadValidation", "leakageValidation", "survivorshipValidationState", "costModelState",
      "executionModelState", "walkForwardState", "outOfSampleState", "parameterRobustnessState", "regimeRobustnessState",
      "parameterSensitivityState", "trialCount", "metrics", "benchmarkMetrics", "sampleStrength", "performanceCriteriaMet",
      "backtestState", "failureReasons", "failedExperimentPreserved", "paperAuthorityGranted", "realMoneyAuthorityGranted",
      "capitalExpansionAuthorityGranted", "createdAt", "immutable"
    ]],
    ["strategyExperimentReadiness", "EXTERNAL-010-CONTRACT-STRATEGY-EXPERIMENT-READINESS", "EXTERNAL-010-SCHEMA-STRATEGY-EXPERIMENT-READINESS", [
      "strategyExperimentReadinessId", "strategyHypothesisId", "experimentProtocolId", "protocolVersion", "backtestResultId",
      "backtestState", "walkForwardState", "outOfSampleState", "biasValidationState", "costModelState", "executionModelState",
      "regimeRobustnessState", "parameterRobustnessState", "shadowReadiness", "paperReadiness", "readinessState", "knownLimitations",
      "criticalFailures", "validationRefs", "readinessEqualsAuthority", "paperActivationAuthorityGranted", "realMoneyAuthorityGranted",
      "createdAt", "immutable"
    ]],
    ["strategyFinanceHandoff", "EXTERNAL-010-CONTRACT-STRATEGY-FINANCE-HANDOFF", "EXTERNAL-010-SCHEMA-STRATEGY-FINANCE-HANDOFF", [
      "financeHandoffId", "strategyExperimentReadinessId", "strategyHypothesisId", "experimentProtocolId", "backtestResultId",
      "readinessState", "knownLimitations", "validationRefs", "targetPlatform", "portfolioAuthorityGranted", "positionSizingAuthorityGranted",
      "brokerAuthorityGranted", "orderAuthorityGranted", "executionAuthorityGranted", "realMoneyAuthorityGranted", "capitalExpansionAuthorityGranted",
      "authorityFrameworkRequired", "createdAt", "immutable"
    ]]
  ];

  function initializeExternalIntelligencePhase19Definitions() {
    const results = [];
    DEFINITIONS.forEach(function register(definition) {
      const key = definition[0], contractId = definition[1], schemaId = definition[2], fields = definition[3];
      if (typeof namespace.registerExternalIntelligenceContract === "function") {
        results.push(namespace.registerExternalIntelligenceContract({
          contractId, key, name: key + " Contract", version: MODULE_VERSION, immutable: true,
          fields: fields.map(function field(name) { return { name, required: true }; }), source: "phase19"
        }));
      }
      if (typeof namespace.registerExternalIntelligenceSchema === "function") {
        results.push(namespace.registerExternalIntelligenceSchema({
          schemaId, name: key + " Schema", version: MODULE_VERSION, type: "object", required: fields,
          properties: Object.fromEntries(fields.map(function prop(name) { return [name, {}]; })),
          additionalProperties: true, immutable: true, owner: "EXTERNAL-010", source: "phase19"
        }));
      }
    });
    return results;
  }

  initializeExternalIntelligencePhase19Definitions();

  function ensureDefinitions() {
    const ids = DEFINITIONS.map(function id(definition) { return definition[2]; });
    const ready = ids.every(function exists(id) { return typeof namespace.getExternalIntelligenceSchema === "function" && !!namespace.getExternalIntelligenceSchema(id); });
    if (!ready) initializeExternalIntelligencePhase19Definitions();
    return ids.every(function exists(id) { return typeof namespace.getExternalIntelligenceSchema === "function" && !!namespace.getExternalIntelligenceSchema(id); });
  }

  function text(value, fallback) { return internal.text(value, fallback == null ? "" : fallback); }
  function upper(value, fallback) { return text(value, fallback || "").trim().toUpperCase(); }
  function clone(value) { return internal.clone(value); }
  function versionNumber(value) { return Number.isInteger(value) && value > 0 ? value : 1; }
  function versionText(value) { const v = text(value, "1.0.0"); return /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(v) ? v : "1.0.0"; }
  function key(id, version) { return text(id, "") + "@" + text(version, "1.0.0"); }
  function parseTime(value) { const n = Date.parse(String(value || "")); return Number.isFinite(n) ? n : null; }
  function asFinite(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback); }
  function normalizeState(value, allowed, fallback) { const v = upper(value, fallback); return allowed.has(v) ? v : fallback; }
  function existingByKey(map, id, version) { return map.get(key(id, version)) || null; }

  function validateRecord(contractKey, schemaId, record) {
    const cv = namespace.validateExternalIntelligenceContract(contractKey, record);
    const sv = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return { valid: cv.valid === true && sv.valid === true, contract: cv, schema: sv };
  }

  async function audit(eventType, details, references) {
    if (typeof namespace.appendExternalIntelligenceAuditEvent !== "function") return null;
    return namespace.appendExternalIntelligenceAuditEvent({
      eventType, actor: "EXTERNAL-010", outcome: "Recorded", details: clone(details || {}), references: internal.unique(references || [])
    });
  }

  function addLineage(inputs, output, relationType) {
    if (typeof namespace.createExternalIntelligenceLineageRecord !== "function") return [];
    return internal.unique(inputs || []).map(function edge(input) {
      return namespace.createExternalIntelligenceLineageRecord({
        inputReferenceId: input, outputReferenceId: output, relationType: relationType || "DERIVED_FROM", lineageState: "ACTIVE"
      });
    }).filter(function ok(result) { return result && result.ok; }).map(function id(result) { return result.data.lineageRecord.lineageRecordId; });
  }

  function resolveUpstreamStrategyRef(x) {
    const composite = text(x.compositeHypothesisRef, "") || null;
    const prediction = text(x.predictionCandidateRef, "") || null;
    const fusionPackage = text(x.fusionPackageRef, "") || null;
    const validComposite = composite && state.compositeMarketHypotheses instanceof Map && !!state.compositeMarketHypotheses.get(composite);
    const validPrediction = prediction && state.marketFusionPredictionCandidates instanceof Map && !!state.marketFusionPredictionCandidates.get(prediction);
    const validPackage = fusionPackage && state.marketFusionPackages instanceof Map && !!state.marketFusionPackages.get(fusionPackage);
    return { composite, prediction, fusionPackage, anyProvided: !!(composite || prediction || fusionPackage), anyValid: !!(validComposite || validPrediction || validPackage) };
  }

  async function createExternalIntelligenceStrategyHypothesisReference(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const upstream = resolveUpstreamStrategyRef(x);
    if (!upstream.anyProvided || !upstream.anyValid) return internal.buildResult(false, "EXTERNAL010_STRATEGY_HYPOTHESIS_UPSTREAM_REFERENCE_REQUIRED", "Blocked", upstream);
    const strategyHypothesisId = text(x.strategyHypothesisId, "") || internal.nextId("EXTERNAL-010-STRATEGY-HYPOTHESIS");
    const version = versionNumber(x.version);
    const recordId = strategyHypothesisId + "-V" + version;
    if (state.strategyHypothesisReferences.has(recordId)) return internal.buildResult(false, "EXTERNAL010_STRATEGY_HYPOTHESIS_VERSION_CONFLICT", "Blocked", { strategyHypothesisId, version });
    const record = internal.deepFreeze({
      strategyHypothesisId, version,
      compositeHypothesisRef: upstream.composite,
      predictionCandidateRef: upstream.prediction,
      fusionPackageRef: upstream.fusionPackage,
      entryReasoning: text(x.entryReasoning, "UNSPECIFIED"),
      exitReasoning: text(x.exitReasoning, "UNSPECIFIED"),
      expectedMarketBehavior: text(x.expectedMarketBehavior, "UNKNOWN"),
      targetHorizon: upper(x.targetHorizon, "UNKNOWN"),
      requiredSignalCombination: internal.unique(x.requiredSignalCombination || []),
      hypothesisEqualsExperiment: false,
      tradingAuthorityGranted: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("strategyHypothesisReference", "EXTERNAL-010-SCHEMA-STRATEGY-HYPOTHESIS-REFERENCE", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_STRATEGY_HYPOTHESIS_INVALID", "Blocked", v);
    state.strategyHypothesisReferences.set(recordId, record);
    state.strategyHypothesisReferences.set(strategyHypothesisId, record);
    internal.touch();
    const inputs = [upstream.composite, upstream.prediction, upstream.fusionPackage].filter(Boolean);
    const lineageRefs = addLineage(inputs, recordId, "DERIVED_FROM");
    await audit("STRATEGY_HYPOTHESIS_REFERENCED", { strategyHypothesisId, version, tradingAuthorityGranted: false }, [recordId].concat(inputs));
    return internal.buildResult(true, "EXTERNAL010_STRATEGY_HYPOTHESIS_REFERENCED", "Ready", { strategyHypothesis: clone(record), lineageRefs });
  }

  function createExternalIntelligenceStrategyDatasetSnapshot(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const dataRefs = Array.isArray(x.dataRefs) ? x.dataRefs.map(function map(item) {
      const r = internal.isPlainObject(item) ? item : {};
      return {
        referenceId: text(r.referenceId, ""), recordType: text(r.recordType, "UNKNOWN"), versionId: text(r.versionId, "UNKNOWN"),
        availableAt: text(r.availableAt, "") || null, effectiveAt: text(r.effectiveAt, "") || null,
        finalizationState: upper(r.finalizationState, "UNKNOWN"), revisionState: upper(r.revisionState, "UNKNOWN"),
        leakageRisk: upper(r.leakageRisk, "NONE")
      };
    }).filter(function valid(r) { return !!r.referenceId; }) : [];
    if (!dataRefs.length) return internal.buildResult(false, "EXTERNAL010_STRATEGY_DATASET_REFERENCES_REQUIRED", "Blocked", null);
    const datasetSnapshotId = text(x.datasetSnapshotId, "") || internal.nextId("EXTERNAL-010-STRATEGY-DATASET-SNAPSHOT");
    const version = versionNumber(x.version), id = datasetSnapshotId + "-V" + version;
    if (state.strategyDatasetSnapshots.has(id)) return internal.buildResult(false, "EXTERNAL010_STRATEGY_DATASET_SNAPSHOT_VERSION_CONFLICT", "Blocked", { datasetSnapshotId, version });
    const record = internal.deepFreeze({
      datasetSnapshotId, version, asOfTime: text(x.asOfTime, "") || internal.nowIso(), dataRefs,
      dataVersions: internal.isPlainObject(x.dataVersions) ? clone(x.dataVersions) : {},
      sourceVersions: internal.isPlainObject(x.sourceVersions) ? clone(x.sourceVersions) : {},
      availabilityState: upper(x.availabilityState, "POINT_IN_TIME_CAPTURED"), pointInTimeRequired: true,
      currentStateEqualsHistoricalInputState: false, createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("strategyDatasetSnapshot", "EXTERNAL-010-SCHEMA-STRATEGY-DATASET-SNAPSHOT", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_STRATEGY_DATASET_SNAPSHOT_INVALID", "Blocked", v);
    state.strategyDatasetSnapshots.set(id, record); state.strategyDatasetSnapshots.set(datasetSnapshotId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_STRATEGY_DATASET_SNAPSHOT_CREATED", "Ready", { datasetSnapshot: clone(record) });
  }

  function createExternalIntelligenceHistoricalUniverseSnapshot(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const members = Array.isArray(x.members) ? x.members.map(function map(item) {
      const m = internal.isPlainObject(item) ? item : {};
      return {
        instrumentId: text(m.instrumentId, ""), historicalStatus: upper(m.historicalStatus, "UNKNOWN"),
        effectiveFrom: text(m.effectiveFrom, "") || null, effectiveTo: text(m.effectiveTo, "") || null,
        evidenceRefs: internal.unique(m.evidenceRefs || [])
      };
    }).filter(function valid(m) { return !!m.instrumentId; }) : [];
    if (!members.length) return internal.buildResult(false, "EXTERNAL010_HISTORICAL_UNIVERSE_MEMBERS_REQUIRED", "Blocked", null);
    const historicalUniverseSnapshotId = text(x.historicalUniverseSnapshotId, "") || internal.nextId("EXTERNAL-010-HISTORICAL-UNIVERSE");
    const version = versionNumber(x.version), id = historicalUniverseSnapshotId + "-V" + version;
    if (state.strategyUniverseSnapshots.has(id)) return internal.buildResult(false, "EXTERNAL010_HISTORICAL_UNIVERSE_VERSION_CONFLICT", "Blocked", { historicalUniverseSnapshotId, version });
    const inactive = members.some(function inactive(m) { return ["DELISTED", "BANKRUPT", "MERGED", "ACQUIRED", "RENAMED"].includes(m.historicalStatus); });
    const record = internal.deepFreeze({
      historicalUniverseSnapshotId, version, asOfTime: text(x.asOfTime, "") || internal.nowIso(), members,
      survivorshipValidationState: normalizeState(x.survivorshipValidationState, VALIDATION_STATES, "UNKNOWN"),
      includesInactiveMembersWhenApplicable: x.includesInactiveMembersWhenApplicable === true || inactive,
      currentUniverseEqualsHistoricalUniverse: false,
      evidenceRefs: internal.unique(x.evidenceRefs || members.flatMap(function refs(m) { return m.evidenceRefs; })),
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("historicalUniverseSnapshot", "EXTERNAL-010-SCHEMA-HISTORICAL-UNIVERSE-SNAPSHOT", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_HISTORICAL_UNIVERSE_INVALID", "Blocked", v);
    state.strategyUniverseSnapshots.set(id, record); state.strategyUniverseSnapshots.set(historicalUniverseSnapshotId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_HISTORICAL_UNIVERSE_SNAPSHOT_CREATED", "Ready", { historicalUniverseSnapshot: clone(record) });
  }

  function createExternalIntelligenceMarketRuleSnapshot(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const marketRuleProfileId = text(x.marketRuleProfileId, "");
    const profile = marketRuleProfileId && state.marketRuleProfiles instanceof Map ? state.marketRuleProfiles.get(marketRuleProfileId) : null;
    if (!marketRuleProfileId || !profile) return internal.buildResult(false, "EXTERNAL010_MARKET_RULE_PROFILE_REQUIRED", "Blocked", { marketRuleProfileId: marketRuleProfileId || null });
    const historicalEvidenceRefs = internal.unique(x.historicalEvidenceRefs || []);
    const marketRuleSnapshotId = text(x.marketRuleSnapshotId, "") || internal.nextId("EXTERNAL-010-MARKET-RULE-SNAPSHOT");
    const version = versionNumber(x.version), id = marketRuleSnapshotId + "-V" + version;
    if (state.strategyMarketRuleSnapshots.has(id)) return internal.buildResult(false, "EXTERNAL010_MARKET_RULE_SNAPSHOT_VERSION_CONFLICT", "Blocked", { marketRuleSnapshotId, version });
    const integrity = normalizeState(x.historicalRuleIntegrityState, VALIDATION_STATES, "UNKNOWN");
    const inferredLimitations = [];
    if (!historicalEvidenceRefs.length) inferredLimitations.push("HISTORICAL_RULE_EVIDENCE_NOT_PROVIDED");
    if (x.tradingSession == null) inferredLimitations.push("HISTORICAL_TRADING_SESSION_NOT_PROVIDED");
    if (x.tickSize == null) inferredLimitations.push("HISTORICAL_TICK_SIZE_NOT_PROVIDED");
    if (x.tradingUnit == null) inferredLimitations.push("HISTORICAL_TRADING_UNIT_NOT_PROVIDED");
    if (x.priceLimit == null) inferredLimitations.push("HISTORICAL_PRICE_LIMIT_NOT_PROVIDED");
    if (x.marketControlRule == null) inferredLimitations.push("HISTORICAL_MARKET_CONTROL_RULE_NOT_PROVIDED");
    const record = internal.deepFreeze({
      marketRuleSnapshotId, version, marketRuleProfileId,
      periodStart: text(x.periodStart, "") || null, periodEnd: text(x.periodEnd, "") || null,
      tradingSession: x.tradingSession == null ? null : clone(x.tradingSession),
      tickSize: x.tickSize == null ? null : x.tickSize,
      tradingUnit: x.tradingUnit == null ? null : x.tradingUnit,
      priceLimit: x.priceLimit == null ? null : clone(x.priceLimit),
      marketControlRule: x.marketControlRule == null ? null : clone(x.marketControlRule),
      historicalEvidenceRefs, historicalRuleIntegrityState: integrity,
      currentMarketRuleEqualsHistoricalMarketRule: false,
      currentRuleFallbackApplied: false,
      knownLimitations: internal.unique((x.knownLimitations || []).concat(inferredLimitations)),
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("marketRuleSnapshot", "EXTERNAL-010-SCHEMA-MARKET-RULE-SNAPSHOT", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_MARKET_RULE_SNAPSHOT_INVALID", "Blocked", v);
    state.strategyMarketRuleSnapshots.set(id, record); state.strategyMarketRuleSnapshots.set(marketRuleSnapshotId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_MARKET_RULE_SNAPSHOT_CREATED", "Ready", { marketRuleSnapshot: clone(record) });
  }

  function createExternalIntelligenceTransactionCostModel(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const transactionCostModelId = text(x.transactionCostModelId, "") || internal.nextId("EXTERNAL-010-TRANSACTION-COST-MODEL");
    const version = versionText(x.version), id = key(transactionCostModelId, version);
    if (state.strategyTransactionCostModels.has(id)) return internal.buildResult(false, "EXTERNAL010_TRANSACTION_COST_MODEL_VERSION_CONFLICT", "Blocked", { transactionCostModelId, version });
    const fields = ["commission", "spread", "slippage", "exchangeFee", "brokerFee", "taxAssumption", "borrowCost", "financingCost", "marketImpact"];
    const values = {}; fields.forEach(function copyField(name) { values[name] = asFinite(x[name], 0); });
    const allZero = fields.every(function zero(name) { return values[name] === 0; });
    const zeroCost = x.zeroCostAssumption === true || allZero;
    const record = internal.deepFreeze(Object.assign({
      transactionCostModelId, version
    }, values, {
      assumptionState: zeroCost ? "ZERO_COST_ASSUMPTION" : upper(x.assumptionState, "MODELED_COST_ASSUMPTION"),
      zeroCostBacktestEqualsExecutableReturn: false,
      realisticExecutionClaimed: zeroCost ? false : x.realisticExecutionClaimed === true,
      createdAt: internal.nowIso(), immutable: true
    }));
    const v = validateRecord("transactionCostModel", "EXTERNAL-010-SCHEMA-TRANSACTION-COST-MODEL", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_TRANSACTION_COST_MODEL_INVALID", "Blocked", v);
    state.strategyTransactionCostModels.set(id, record); state.strategyTransactionCostModels.set(transactionCostModelId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_TRANSACTION_COST_MODEL_CREATED", "Ready", { transactionCostModel: clone(record) });
  }

  function createExternalIntelligenceExecutionModel(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const executionModelId = text(x.executionModelId, "") || internal.nextId("EXTERNAL-010-EXECUTION-MODEL");
    const version = versionText(x.version), modelType = upper(x.modelType, "CUSTOM"), id = key(executionModelId, version);
    if (!EXECUTION_MODELS.has(modelType)) return internal.buildResult(false, "EXTERNAL010_EXECUTION_MODEL_TYPE_INVALID", "Blocked", { modelType });
    if (state.strategyExecutionModels.has(id)) return internal.buildResult(false, "EXTERNAL010_EXECUTION_MODEL_VERSION_CONFLICT", "Blocked", { executionModelId, version });
    const record = internal.deepFreeze({
      executionModelId, version, modelType,
      parameters: internal.isPlainObject(x.parameters) ? clone(x.parameters) : {},
      liquidityConstraintState: upper(x.liquidityConstraintState, "MODELED"),
      fillStates: ["NO_FILL", "PARTIAL_FILL", "FULL_FILL", "UNKNOWN_FILL"],
      intrabarAmbiguityPolicy: upper(x.intrabarAmbiguityPolicy, "UNKNOWN_INTRABAR_SEQUENCE"),
      signalPriceEqualsExecutionPrice: false, paperFillEqualsRealFill: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("executionModel", "EXTERNAL-010-SCHEMA-EXECUTION-MODEL", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_EXECUTION_MODEL_INVALID", "Blocked", v);
    state.strategyExecutionModels.set(id, record); state.strategyExecutionModels.set(executionModelId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EXECUTION_MODEL_CREATED", "Ready", { executionModel: clone(record) });
  }

  function registerExternalIntelligenceBacktestEngineCapability(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const capabilityId = text(x.backtestCapabilityId || x.capabilityId, "");
    if (!capabilityId || typeof namespace.registerExternalIntelligenceAnalyticalCapability !== "function") return internal.buildResult(false, "EXTERNAL010_BACKTEST_CAPABILITY_INVALID", "Blocked", { capabilityId: capabilityId || null });
    const recordVersion = versionText(x.engineVersion || x.recordVersion || MODULE_VERSION);
    const r = namespace.registerExternalIntelligenceAnalyticalCapability({
      capabilityId, recordVersion, capabilityType: "ALGORITHM", providerId: text(x.providerId, "LOCAL"),
      modelFamily: text(x.modelFamily, "MARKET_BACKTEST_ENGINE"), modelVersion: text(x.modelVersion, "N/A"),
      algorithmVersion: text(x.algorithmVersion, recordVersion), supportedTasks: ["MARKET_BACKTEST", "WALK_FORWARD", "OUT_OF_SAMPLE"],
      supportedDomains: ["MARKET"], supportedHorizons: ["ANY"], supportedInputTypes: ["TIME_SERIES", "STRATEGY_PROTOCOL"],
      availabilityState: upper(x.availabilityState, "READY"), executionLocation: upper(x.executionLocation, "LOCAL"),
      roles: ["PRIMARY"], outputClassifications: ["MODEL_ANALYSIS"], active: x.active !== false
    });
    if (r.ok) state.strategyBacktestCapabilities.set(capabilityId, clone(r.data.analyticalCapability));
    return r;
  }

  async function registerExternalIntelligenceStrategyExperimentProtocol(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const experimentProtocolId = text(x.experimentProtocolId, "") || internal.nextId("EXTERNAL-010-EXPERIMENT-PROTOCOL");
    const protocolVersion = versionText(x.protocolVersion), id = key(experimentProtocolId, protocolVersion);
    if (state.strategyExperimentProtocols.has(id)) return internal.buildResult(false, "EXTERNAL010_EXPERIMENT_PROTOCOL_VERSION_CONFLICT", "Blocked", { experimentProtocolId, protocolVersion });

    const strategyHypothesisId = text(x.strategyHypothesisId, "");
    const strategyLatest = state.strategyHypothesisReferences.get(strategyHypothesisId) || null;
    const strategyHypothesisVersion = versionNumber(x.strategyHypothesisVersion == null ? strategyLatest && strategyLatest.version : x.strategyHypothesisVersion);
    const strategyExact = state.strategyHypothesisReferences.get(strategyHypothesisId + "-V" + strategyHypothesisVersion) || null;

    const datasetSnapshotId = text(x.datasetSnapshotId, "");
    const datasetLatest = state.strategyDatasetSnapshots.get(datasetSnapshotId) || null;
    const datasetSnapshotVersion = versionNumber(x.datasetSnapshotVersion == null ? datasetLatest && datasetLatest.version : x.datasetSnapshotVersion);
    const datasetExact = state.strategyDatasetSnapshots.get(datasetSnapshotId + "-V" + datasetSnapshotVersion) || null;

    const historicalUniverseSnapshotId = text(x.historicalUniverseSnapshotId, "");
    const universeLatest = state.strategyUniverseSnapshots.get(historicalUniverseSnapshotId) || null;
    const historicalUniverseSnapshotVersion = versionNumber(x.historicalUniverseSnapshotVersion == null ? universeLatest && universeLatest.version : x.historicalUniverseSnapshotVersion);
    const universeExact = state.strategyUniverseSnapshots.get(historicalUniverseSnapshotId + "-V" + historicalUniverseSnapshotVersion) || null;

    const marketRuleSnapshotId = text(x.marketRuleSnapshotId, "");
    const ruleLatest = state.strategyMarketRuleSnapshots.get(marketRuleSnapshotId) || null;
    const marketRuleSnapshotVersion = versionNumber(x.marketRuleSnapshotVersion == null ? ruleLatest && ruleLatest.version : x.marketRuleSnapshotVersion);
    const ruleExact = state.strategyMarketRuleSnapshots.get(marketRuleSnapshotId + "-V" + marketRuleSnapshotVersion) || null;

    const transactionCostModelId = text(x.transactionCostModelId, "");
    const costLatest = state.strategyTransactionCostModels.get(transactionCostModelId) || null;
    const transactionCostModelVersion = versionText(x.transactionCostModelVersion || costLatest && costLatest.version || "1.0.0");
    const costExact = existingByKey(state.strategyTransactionCostModels, transactionCostModelId, transactionCostModelVersion);

    const executionModelId = text(x.executionModelId, "");
    const executionLatest = state.strategyExecutionModels.get(executionModelId) || null;
    const executionModelVersion = versionText(x.executionModelVersion || executionLatest && executionLatest.version || "1.0.0");
    const executionExact = existingByKey(state.strategyExecutionModels, executionModelId, executionModelVersion);

    const backtestCapabilityId = text(x.backtestCapabilityId, "");
    const currentBacktestCapability = state.strategyBacktestCapabilities.get(backtestCapabilityId) || (state.analyticalCapabilities instanceof Map && state.analyticalCapabilities.get(backtestCapabilityId)) || null;
    const backtestCapabilityVersion = versionText(x.backtestCapabilityVersion || currentBacktestCapability && currentBacktestCapability.recordVersion || MODULE_VERSION);
    const backtestCapability = state.analyticalCapabilityVersions instanceof Map
      ? state.analyticalCapabilityVersions.get(backtestCapabilityId + "@" + backtestCapabilityVersion) || null
      : currentBacktestCapability && versionText(currentBacktestCapability.recordVersion || MODULE_VERSION) === backtestCapabilityVersion ? currentBacktestCapability : null;

    const missing = [];
    if (!strategyExact) missing.push("strategyHypothesisId@version");
    if (!datasetExact) missing.push("datasetSnapshotId@version");
    if (!universeExact) missing.push("historicalUniverseSnapshotId@version");
    if (!ruleExact) missing.push("marketRuleSnapshotId@version");
    if (!costExact) missing.push("transactionCostModelId@version");
    if (!executionExact) missing.push("executionModelId@version");
    if (!backtestCapability) missing.push("backtestCapabilityId@version");
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_EXPERIMENT_PROTOCOL_REFERENCE_INVALID", "Blocked", { missing });

    const record = internal.deepFreeze({
      experimentProtocolId, protocolVersion,
      strategyHypothesisId, strategyHypothesisVersion,
      datasetSnapshotId, datasetSnapshotVersion,
      historicalUniverseSnapshotId, historicalUniverseSnapshotVersion,
      marketRuleSnapshotId, marketRuleSnapshotVersion,
      transactionCostModelId, transactionCostModelVersion,
      executionModelId, executionModelVersion,
      backtestCapabilityId, backtestCapabilityVersion,
      targetUniverse: clone(x.targetUniverse == null ? { snapshotId: historicalUniverseSnapshotId, snapshotVersion: historicalUniverseSnapshotVersion } : x.targetUniverse),
      entryLogic: clone(x.entryLogic == null ? {} : x.entryLogic), exitLogic: clone(x.exitLogic == null ? {} : x.exitLogic),
      featureSet: internal.unique(x.featureSet || []), parameterSearchSpace: internal.isPlainObject(x.parameterSearchSpace) ? clone(x.parameterSearchSpace) : {},
      timeHorizon: upper(x.timeHorizon, "UNKNOWN"), trainingWindow: clone(x.trainingWindow == null ? {} : x.trainingWindow),
      validationWindow: clone(x.validationWindow == null ? {} : x.validationWindow), outOfSampleWindow: clone(x.outOfSampleWindow == null ? {} : x.outOfSampleWindow),
      benchmarkDefinition: clone(x.benchmarkDefinition == null ? {} : x.benchmarkDefinition), riskMetrics: internal.unique(x.riskMetrics || []),
      successCriteria: clone(x.successCriteria == null ? {} : x.successCriteria), failureCriteria: clone(x.failureCriteria == null ? {} : x.failureCriteria),
      preRegistered: true, resultsObservedBeforeRegistration: false, paperAuthorityGranted: false, realMoneyAuthorityGranted: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("strategyExperimentProtocol", "EXTERNAL-010-SCHEMA-STRATEGY-EXPERIMENT-PROTOCOL", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_EXPERIMENT_PROTOCOL_INVALID", "Blocked", v);
    state.strategyExperimentProtocols.set(id, record); state.strategyExperimentProtocols.set(experimentProtocolId, record); internal.touch();
    addLineage([
      strategyHypothesisId + "-V" + strategyHypothesisVersion,
      datasetSnapshotId + "-V" + datasetSnapshotVersion,
      historicalUniverseSnapshotId + "-V" + historicalUniverseSnapshotVersion,
      marketRuleSnapshotId + "-V" + marketRuleSnapshotVersion,
      key(transactionCostModelId, transactionCostModelVersion),
      key(executionModelId, executionModelVersion),
      backtestCapabilityId + "@" + backtestCapabilityVersion
    ], id, "DEPENDS_ON");
    await audit("EXPERIMENT_PROTOCOL_REGISTERED", { experimentProtocolId, protocolVersion, preRegistered: true }, [id, strategyHypothesisId + "-V" + strategyHypothesisVersion]);
    return internal.buildResult(true, "EXTERNAL010_EXPERIMENT_PROTOCOL_REGISTERED", "Ready", { experimentProtocol: clone(record) });
  }

  function validateExternalIntelligenceStrategyPointInTime(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const decisionTime = text(x.decisionTime, "");
    const decisionMs = parseTime(decisionTime);
    const features = Array.isArray(x.features) ? x.features : [];
    const strict = x.strict !== false;
    const checks = features.map(function check(item) {
      const f = internal.isPlainObject(item) ? item : {};
      const availableAt = text(f.featureAvailableAt || f.availableAt, "");
      const effectiveAt = text(f.featureEffectiveAt || f.effectiveAt, "");
      const availableMs = parseTime(availableAt), effectiveMs = parseTime(effectiveAt);
      const availabilityKnown = availableMs != null;
      const availableInTime = decisionMs != null && availableMs != null ? availableMs <= decisionMs : !strict;
      return {
        referenceId: text(f.referenceId, "UNKNOWN"), featureEffectiveAt: effectiveAt || null, featureAvailableAt: availableAt || null,
        decisionTime: decisionTime || null, availabilityKnown, availableInTime,
        effectiveAfterDecision: decisionMs != null && effectiveMs != null ? effectiveMs > decisionMs : false,
        passed: availableInTime
      };
    });
    const validDecision = decisionMs != null;
    const valid = validDecision && features.length > 0 && checks.every(function pass(c) { return c.passed; });
    return { valid, state: valid ? "PASS" : "FAIL", decisionTime: decisionTime || null, strict, checks, lookAheadDetected: checks.some(function late(c) { return !c.passed; }), currentStateEqualsHistoricalInputState: false };
  }

  function validateExternalIntelligenceStrategyLeakage(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const decisionTime = text(x.decisionTime, ""), decisionMs = parseTime(decisionTime);
    const features = Array.isArray(x.features) ? x.features : [];
    const checks = features.map(function check(item) {
      const f = internal.isPlainObject(item) ? item : {};
      const availableAt = text(f.featureAvailableAt || f.availableAt, ""), availableMs = parseTime(availableAt);
      const leakageRisk = upper(f.leakageRisk, "NONE");
      const explicitLeakage = leakageRisk !== "NONE" || f.futureOutcomeData === true || f.revisedFinancialDataUnavailableAtDecision === true || f.finalizedBarUnavailableAtDecision === true || f.laterCorporateActionAdjustment === true;
      const futureAvailability = decisionMs != null && availableMs != null ? availableMs > decisionMs : false;
      const leaked = explicitLeakage || futureAvailability;
      return { referenceId: text(f.referenceId, "UNKNOWN"), leakageRisk, explicitLeakage, futureAvailability, passed: !leaked };
    });
    const valid = features.length > 0 && checks.every(function pass(c) { return c.passed; });
    return { valid, state: valid ? "PASS" : "FAIL", leakageDetected: !valid, checks, futureInformationUseAllowed: false };
  }

  async function recordExternalIntelligenceStrategyTrial(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const experimentProtocolId = text(x.experimentProtocolId, ""), protocolVersion = versionText(x.protocolVersion);
    if (!existingByKey(state.strategyExperimentProtocols, experimentProtocolId, protocolVersion)) return internal.buildResult(false, "EXTERNAL010_STRATEGY_TRIAL_PROTOCOL_NOT_FOUND", "Blocked", { experimentProtocolId, protocolVersion });
    const existingTrials = Array.from(state.strategyTrialRecords.values()).filter(function uniqueRecords(r, i, arr) { return r.experimentProtocolId === experimentProtocolId && r.protocolVersion === protocolVersion && arr.findIndex(function same(x2) { return x2.strategyTrialId === r.strategyTrialId; }) === i; });
    const strategyTrialId = text(x.strategyTrialId, "") || internal.nextId("EXTERNAL-010-STRATEGY-TRIAL");
    if (state.strategyTrialRecords.has(strategyTrialId)) return internal.buildResult(false, "EXTERNAL010_STRATEGY_TRIAL_DUPLICATE", "Blocked", { strategyTrialId });
    const record = internal.deepFreeze({
      strategyTrialId, experimentProtocolId, protocolVersion, trialSequence: existingTrials.length + 1,
      testedParameters: internal.isPlainObject(x.testedParameters) ? clone(x.testedParameters) : {}, searchMethod: upper(x.searchMethod, "MANUAL"),
      resultSummary: internal.isPlainObject(x.resultSummary) ? clone(x.resultSummary) : {}, trialState: upper(x.trialState, "COMPLETED"),
      selected: x.selected === true, selectionReason: text(x.selectionReason, "") || null, preserved: true,
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("strategyTrialRecord", "EXTERNAL-010-SCHEMA-STRATEGY-TRIAL-RECORD", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_STRATEGY_TRIAL_INVALID", "Blocked", v);
    state.strategyTrialRecords.set(strategyTrialId, record); internal.touch();
    await audit("STRATEGY_TRIAL_RECORDED", { strategyTrialId, experimentProtocolId, trialSequence: record.trialSequence, preserved: true }, [strategyTrialId, key(experimentProtocolId, protocolVersion)]);
    return internal.buildResult(true, "EXTERNAL010_STRATEGY_TRIAL_RECORDED", "Ready", { strategyTrial: clone(record) });
  }

  async function sha256Text(value) {
    const source = String(value == null ? "" : value);
    if (global.crypto && global.crypto.subtle && typeof TextEncoder !== "undefined") {
      const bytes = new TextEncoder().encode(source);
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return { hash: Array.from(new Uint8Array(digest)).map(function hex(b) { return b.toString(16).padStart(2, "0"); }).join(""), algorithm: "SHA-256" };
    }
    let h = 2166136261;
    for (let i = 0; i < source.length; i += 1) { h ^= source.charCodeAt(i); h = Math.imul(h, 16777619); }
    return { hash: (h >>> 0).toString(16).padStart(8, "0"), algorithm: "FNV1A-32-NON-SECURITY" };
  }

  async function createExternalIntelligenceStrategyFingerprint(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const strategyHypothesisId = text(x.strategyHypothesisId, "");
    const strategyLatest = state.strategyHypothesisReferences.get(strategyHypothesisId) || null;
    const strategyHypothesisVersion = versionNumber(x.strategyHypothesisVersion == null ? strategyLatest && strategyLatest.version : x.strategyHypothesisVersion);
    if (!state.strategyHypothesisReferences.get(strategyHypothesisId + "-V" + strategyHypothesisVersion)) return internal.buildResult(false, "EXTERNAL010_STRATEGY_FINGERPRINT_HYPOTHESIS_REQUIRED", "Blocked", { strategyHypothesisId, strategyHypothesisVersion });
    const universeRef = text(x.universeRef, "") || null;
    const universeLatest = universeRef ? state.strategyUniverseSnapshots.get(universeRef) : null;
    const universeVersion = universeRef ? versionNumber(x.universeVersion == null ? universeLatest && universeLatest.version : x.universeVersion) : null;
    if (universeRef && !state.strategyUniverseSnapshots.get(universeRef + "-V" + universeVersion)) return internal.buildResult(false, "EXTERNAL010_STRATEGY_FINGERPRINT_UNIVERSE_REQUIRED", "Blocked", { universeRef, universeVersion });
    const canonical = {
      strategyHypothesisId, strategyHypothesisVersion, featureSet: internal.unique(x.featureSet || []).slice().sort(), logicStructure: clone(x.logicStructure == null ? {} : x.logicStructure),
      parameters: clone(x.parameters == null ? {} : x.parameters), universeRef, universeVersion,
      horizon: upper(x.horizon, "UNKNOWN"), exitLogic: clone(x.exitLogic == null ? {} : x.exitLogic)
    };
    const digest = await sha256Text(internal.stableStringify(canonical));
    const strategyFingerprintId = "EXTERNAL-010-STRATEGY-FINGERPRINT-" + digest.hash.slice(0, 24).toUpperCase();
    const record = internal.deepFreeze(Object.assign({}, canonical, {
      strategyFingerprintId, fingerprintHash: digest.hash, hashAlgorithm: digest.algorithm, securityIdentity: false,
      createdAt: internal.nowIso(), immutable: true
    }));
    const v = validateRecord("strategyFingerprint", "EXTERNAL-010-SCHEMA-STRATEGY-FINGERPRINT", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_STRATEGY_FINGERPRINT_INVALID", "Blocked", v);
    const existing = state.strategyFingerprints.get(strategyFingerprintId);
    if (!existing) state.strategyFingerprints.set(strategyFingerprintId, record);
    return internal.buildResult(true, existing ? "EXTERNAL010_STRATEGY_FINGERPRINT_ALREADY_EXISTS" : "EXTERNAL010_STRATEGY_FINGERPRINT_CREATED", "Ready", { strategyFingerprint: clone(existing || record) });
  }

  function requiredBacktestGate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const point = x.pointInTimeValidation && x.pointInTimeValidation.valid === true;
    const lookAhead = x.lookAheadValidation && x.lookAheadValidation.valid === true;
    const leakage = x.leakageValidation && x.leakageValidation.valid === true;
    const survivorship = ["PASS", "PASS_WITH_WARNINGS"].includes(upper(x.survivorshipValidationState, "UNKNOWN"));
    const cost = ["PASS", "PASS_WITH_WARNINGS"].includes(upper(x.costModelState, "UNKNOWN"));
    const execution = ["PASS", "PASS_WITH_WARNINGS"].includes(upper(x.executionModelState, "UNKNOWN"));
    const walk = ["PASS", "PASS_WITH_WARNINGS"].includes(upper(x.walkForwardState, "UNKNOWN"));
    const oos = ["PASS", "PASS_WITH_WARNINGS"].includes(upper(x.outOfSampleState, "UNKNOWN"));
    const parameter = ["PASS", "PASS_WITH_WARNINGS"].includes(upper(x.parameterRobustnessState, "UNKNOWN"));
    const regime = ["PASS", "PASS_WITH_WARNINGS"].includes(upper(x.regimeRobustnessState, "UNKNOWN"));
    return { point, lookAhead, leakage, survivorship, cost, execution, walk, oos, parameter, regime, all: point && lookAhead && leakage && survivorship && cost && execution && walk && oos && parameter && regime };
  }

  async function recordExternalIntelligenceStrategyBacktestResult(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const experimentProtocolId = text(x.experimentProtocolId, ""), protocolVersion = versionText(x.protocolVersion);
    const protocol = existingByKey(state.strategyExperimentProtocols, experimentProtocolId, protocolVersion);
    if (!protocol) return internal.buildResult(false, "EXTERNAL010_BACKTEST_PROTOCOL_NOT_FOUND", "Blocked", { experimentProtocolId, protocolVersion });
    const strategyFingerprintId = text(x.strategyFingerprintId, "");
    if (!state.strategyFingerprints.has(strategyFingerprintId)) return internal.buildResult(false, "EXTERNAL010_BACKTEST_FINGERPRINT_REQUIRED", "Blocked", { strategyFingerprintId });
    const engineCapabilityId = text(x.engineCapabilityId || protocol.backtestCapabilityId, "");
    if (engineCapabilityId !== protocol.backtestCapabilityId) {
      return internal.buildResult(false, "EXTERNAL010_BACKTEST_ENGINE_PROTOCOL_MISMATCH", "Blocked", {
        engineCapabilityId, protocolEngineCapabilityId: protocol.backtestCapabilityId, protocolEngineVersion: protocol.backtestCapabilityVersion
      });
    }
    const engine = state.analyticalCapabilityVersions instanceof Map
      ? state.analyticalCapabilityVersions.get(engineCapabilityId + "@" + protocol.backtestCapabilityVersion) || null
      : state.analyticalCapabilities instanceof Map && state.analyticalCapabilities.get(engineCapabilityId) || null;
    if (!engine || versionText(engine.recordVersion || MODULE_VERSION) !== protocol.backtestCapabilityVersion) {
      return internal.buildResult(false, "EXTERNAL010_BACKTEST_ENGINE_VERSION_MISMATCH", "Blocked", {
        engineCapabilityId, requiredVersion: protocol.backtestCapabilityVersion, actualVersion: engine && engine.recordVersion || null
      });
    }
    const trials = Array.from(state.strategyTrialRecords.values()).filter(function trial(r) { return r.experimentProtocolId === experimentProtocolId && r.protocolVersion === protocolVersion; });
    const gate = requiredBacktestGate(x);
    const performanceCriteriaMet = x.performanceCriteriaMet === true;
    let backtestState = "BACKTEST_INCONCLUSIVE";
    if (!gate.all) backtestState = "BACKTEST_BLOCKED";
    else if (performanceCriteriaMet) backtestState = "BACKTEST_VALIDATED";
    else if (x.performanceCriteriaMet === false) backtestState = "BACKTEST_FAILED";
    if (x.backtestState && BACKTEST_STATES.has(upper(x.backtestState, "")) && upper(x.backtestState, "") !== "BACKTEST_VALIDATED") backtestState = upper(x.backtestState, backtestState);
    const failureReasons = internal.unique(x.failureReasons || []).map(function reason(v) { const r = upper(v, "UNKNOWN"); return FAILURE_REASONS.has(r) ? r : "UNKNOWN"; });
    if (!gate.point || !gate.lookAhead) failureReasons.push("LOOK_AHEAD");
    if (!gate.leakage) failureReasons.push("FEATURE_LEAKAGE");
    if (!gate.survivorship) failureReasons.push("SURVIVORSHIP_CONTAMINATED");
    if (!gate.parameter) failureReasons.push("UNSTABLE_PARAMETERS");
    if (!gate.regime) failureReasons.push("REGIME_FRAGILE");
    if (!gate.execution) failureReasons.push("EXECUTION_UNREALISTIC");
    const backtestResultId = text(x.backtestResultId, "") || internal.nextId("EXTERNAL-010-BACKTEST-RESULT");
    if (state.strategyBacktestResults.has(backtestResultId)) return internal.buildResult(false, "EXTERNAL010_BACKTEST_RESULT_DUPLICATE", "Blocked", { backtestResultId });
    const record = internal.deepFreeze({
      backtestResultId, experimentProtocolId, protocolVersion, strategyFingerprintId, engineCapabilityId, engineVersion: engine.recordVersion,
      pointInTimeValidation: clone(x.pointInTimeValidation || { valid: false, state: "UNKNOWN" }),
      lookAheadValidation: clone(x.lookAheadValidation || { valid: false, state: "UNKNOWN" }),
      leakageValidation: clone(x.leakageValidation || { valid: false, state: "UNKNOWN" }),
      survivorshipValidationState: normalizeState(x.survivorshipValidationState, VALIDATION_STATES, "UNKNOWN"),
      costModelState: normalizeState(x.costModelState, VALIDATION_STATES, "UNKNOWN"), executionModelState: normalizeState(x.executionModelState, VALIDATION_STATES, "UNKNOWN"),
      walkForwardState: normalizeState(x.walkForwardState, ROBUSTNESS_STATES, "UNKNOWN"), outOfSampleState: normalizeState(x.outOfSampleState, ROBUSTNESS_STATES, "UNKNOWN"),
      parameterRobustnessState: normalizeState(x.parameterRobustnessState, ROBUSTNESS_STATES, "UNKNOWN"), regimeRobustnessState: normalizeState(x.regimeRobustnessState, ROBUSTNESS_STATES, "UNKNOWN"),
      parameterSensitivityState: normalizeState(x.parameterSensitivityState, PARAMETER_SENSITIVITY, "UNKNOWN"), trialCount: trials.length,
      metrics: internal.isPlainObject(x.metrics) ? clone(x.metrics) : {}, benchmarkMetrics: internal.isPlainObject(x.benchmarkMetrics) ? clone(x.benchmarkMetrics) : {},
      sampleStrength: upper(x.sampleStrength, "UNKNOWN"), performanceCriteriaMet, backtestState,
      failureReasons: internal.unique(failureReasons), failedExperimentPreserved: backtestState !== "BACKTEST_VALIDATED",
      paperAuthorityGranted: false, realMoneyAuthorityGranted: false, capitalExpansionAuthorityGranted: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("strategyBacktestResult", "EXTERNAL-010-SCHEMA-STRATEGY-BACKTEST-RESULT", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_BACKTEST_RESULT_INVALID", "Blocked", v);
    state.strategyBacktestResults.set(backtestResultId, record); internal.touch();
    if (record.failedExperimentPreserved) {
      const failureId = internal.nextId("EXTERNAL-010-STRATEGY-FAILURE");
      state.strategyFailureRecords.set(failureId, internal.deepFreeze({ failureId, backtestResultId, experimentProtocolId, protocolVersion, failureReasons: record.failureReasons, preserved: true, createdAt: internal.nowIso(), immutable: true }));
      await audit("STRATEGY_REJECTED", { backtestResultId, failureReasons: record.failureReasons, failedExperimentPreserved: true }, [backtestResultId, key(experimentProtocolId, protocolVersion)]);
    }
    addLineage([key(experimentProtocolId, protocolVersion), strategyFingerprintId].concat(trials.map(function id(t) { return t.strategyTrialId; })), backtestResultId, "DERIVED_FROM");
    await audit("BACKTEST_COMPLETED", { backtestResultId, backtestState, trialCount: record.trialCount, paperAuthorityGranted: false, realMoneyAuthorityGranted: false }, [backtestResultId, key(experimentProtocolId, protocolVersion)]);
    return internal.buildResult(true, "EXTERNAL010_BACKTEST_RESULT_RECORDED", "Ready", { backtestResult: clone(record), gate });
  }

  async function createExternalIntelligenceStrategyExperimentReadiness(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const backtestResultId = text(x.backtestResultId, ""), backtest = state.strategyBacktestResults.get(backtestResultId);
    if (!backtest) return internal.buildResult(false, "EXTERNAL010_READINESS_BACKTEST_RESULT_REQUIRED", "Blocked", { backtestResultId });
    const protocol = existingByKey(state.strategyExperimentProtocols, backtest.experimentProtocolId, backtest.protocolVersion);
    const hypothesis = protocol && state.strategyHypothesisReferences.get(protocol.strategyHypothesisId + "-V" + protocol.strategyHypothesisVersion);
    if (!protocol || !hypothesis) return internal.buildResult(false, "EXTERNAL010_READINESS_REFERENCES_INVALID", "Blocked", null);
    const biasValidationState = backtest.pointInTimeValidation.valid && backtest.lookAheadValidation.valid && backtest.leakageValidation.valid && ["PASS", "PASS_WITH_WARNINGS"].includes(backtest.survivorshipValidationState) ? "PASS" : "FAIL";
    const shadowReadiness = upper(x.shadowReadiness, "NOT_EVALUATED"), paperReadiness = upper(x.paperReadiness, "NOT_EVALUATED");
    let readinessState = "NOT_READY";
    if (backtest.backtestState === "BACKTEST_VALIDATED") readinessState = "BACKTEST_READY";
    if (readinessState === "BACKTEST_READY" && shadowReadiness === "READY") readinessState = "SHADOW_READY";
    if (readinessState === "SHADOW_READY" && paperReadiness === "READY") readinessState = "PAPER_READY";
    if (!READINESS_STATES.has(readinessState)) readinessState = "NOT_READY";
    const criticalFailures = internal.unique(x.criticalFailures || backtest.failureReasons || []);
    const strategyExperimentReadinessId = text(x.strategyExperimentReadinessId, "") || internal.nextId("EXTERNAL-010-STRATEGY-READINESS");
    const record = internal.deepFreeze({
      strategyExperimentReadinessId, strategyHypothesisId: protocol.strategyHypothesisId, experimentProtocolId: protocol.experimentProtocolId,
      protocolVersion: protocol.protocolVersion, backtestResultId, backtestState: backtest.backtestState,
      walkForwardState: backtest.walkForwardState, outOfSampleState: backtest.outOfSampleState, biasValidationState,
      costModelState: backtest.costModelState, executionModelState: backtest.executionModelState,
      regimeRobustnessState: backtest.regimeRobustnessState, parameterRobustnessState: backtest.parameterRobustnessState,
      shadowReadiness, paperReadiness, readinessState,
      knownLimitations: internal.unique(x.knownLimitations || []), criticalFailures,
      validationRefs: internal.unique(x.validationRefs || []), readinessEqualsAuthority: false,
      paperActivationAuthorityGranted: false, realMoneyAuthorityGranted: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("strategyExperimentReadiness", "EXTERNAL-010-SCHEMA-STRATEGY-EXPERIMENT-READINESS", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_STRATEGY_READINESS_INVALID", "Blocked", v);
    state.strategyExperimentReadiness.set(strategyExperimentReadinessId, record); internal.touch();
    addLineage([backtestResultId, key(protocol.experimentProtocolId, protocol.protocolVersion)], strategyExperimentReadinessId, "DERIVED_FROM");
    await audit("STRATEGY_READINESS_CREATED", { strategyExperimentReadinessId, readinessState, readinessEqualsAuthority: false }, [strategyExperimentReadinessId, backtestResultId]);
    return internal.buildResult(true, "EXTERNAL010_STRATEGY_READINESS_CREATED", "Ready", { readiness: clone(record) });
  }

  async function createExternalIntelligenceStrategyFinanceHandoff(input) {
    if (!ensureDefinitions()) return internal.buildResult(false, "EXTERNAL010_PHASE19_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const readinessId = text(x.strategyExperimentReadinessId, ""), readiness = state.strategyExperimentReadiness.get(readinessId);
    if (!readiness) return internal.buildResult(false, "EXTERNAL010_FINANCE_HANDOFF_READINESS_REQUIRED", "Blocked", { readinessId });
    const financeHandoffId = text(x.financeHandoffId, "") || internal.nextId("EXTERNAL-010-FINANCE-HANDOFF");
    const record = internal.deepFreeze({
      financeHandoffId, strategyExperimentReadinessId: readinessId, strategyHypothesisId: readiness.strategyHypothesisId,
      experimentProtocolId: readiness.experimentProtocolId, backtestResultId: readiness.backtestResultId,
      readinessState: readiness.readinessState, knownLimitations: readiness.knownLimitations,
      validationRefs: readiness.validationRefs, targetPlatform: "FINANCE",
      portfolioAuthorityGranted: false, positionSizingAuthorityGranted: false, brokerAuthorityGranted: false,
      orderAuthorityGranted: false, executionAuthorityGranted: false, realMoneyAuthorityGranted: false,
      capitalExpansionAuthorityGranted: false, authorityFrameworkRequired: true,
      createdAt: internal.nowIso(), immutable: true
    });
    const v = validateRecord("strategyFinanceHandoff", "EXTERNAL-010-SCHEMA-STRATEGY-FINANCE-HANDOFF", record);
    if (!v.valid) return internal.buildResult(false, "EXTERNAL010_FINANCE_HANDOFF_INVALID", "Blocked", v);
    state.strategyFinanceHandoffs.set(financeHandoffId, record); internal.touch();
    addLineage([readinessId], financeHandoffId, "DERIVED_FROM");
    await audit("STRATEGY_FINANCE_HANDOFF_CREATED", { financeHandoffId, readinessState: readiness.readinessState, realMoneyAuthorityGranted: false }, [financeHandoffId, readinessId]);
    return internal.buildResult(true, "EXTERNAL010_FINANCE_HANDOFF_CREATED", "Ready", { financeHandoff: clone(record) });
  }

  const PERSISTENCE_KINDS = {
    strategy: { map: "strategyHypothesisReferences", idField: "strategyHypothesisId", versionField: "version", numericVersion: true },
    dataset: { map: "strategyDatasetSnapshots", idField: "datasetSnapshotId", versionField: "version", numericVersion: true },
    universe: { map: "strategyUniverseSnapshots", idField: "historicalUniverseSnapshotId", versionField: "version", numericVersion: true },
    marketrule: { map: "strategyMarketRuleSnapshots", idField: "marketRuleSnapshotId", versionField: "version", numericVersion: true },
    costmodel: { map: "strategyTransactionCostModels", idField: "transactionCostModelId", versionField: "version", numericVersion: false },
    executionmodel: { map: "strategyExecutionModels", idField: "executionModelId", versionField: "version", numericVersion: false },
    protocol: { map: "strategyExperimentProtocols", idField: "experimentProtocolId", versionField: "protocolVersion", numericVersion: false },
    trial: { map: "strategyTrialRecords", idField: "strategyTrialId", versionField: null },
    fingerprint: { map: "strategyFingerprints", idField: "strategyFingerprintId", versionField: null },
    backtest: { map: "strategyBacktestResults", idField: "backtestResultId", versionField: null },
    failure: { map: "strategyFailureRecords", idField: "failureId", versionField: null },
    readiness: { map: "strategyExperimentReadiness", idField: "strategyExperimentReadinessId", versionField: null },
    handoff: { map: "strategyFinanceHandoffs", idField: "financeHandoffId", versionField: null }
  };

  function getPersistenceMapRecord(cfg, id, version) {
    const map = state[cfg.map];
    if (!(map instanceof Map)) return null;
    const recordId = text(id, "");
    if (!cfg.versionField) return map.get(recordId) || null;
    if (version == null || version === "") return map.get(recordId) || null;
    if (cfg.numericVersion) return map.get(recordId + "-V" + versionNumber(Number(version))) || null;
    return map.get(key(recordId, versionText(version))) || null;
  }

  function getPersistenceStorageId(cfg, record) {
    if (!cfg.versionField) return record[cfg.idField];
    return key(record[cfg.idField], record[cfg.versionField]);
  }

  async function persistExternalIntelligenceStrategyExperimentRecord(kind, id, version) {
    const k = text(kind, "").toLowerCase(), cfg = PERSISTENCE_KINDS[k];
    if (!cfg || !state.marketPersistence || !state.marketPersistence.adapter) return internal.buildResult(false, "EXTERNAL010_STRATEGY_EXPERIMENT_PERSISTENCE_BLOCKED", "Blocked", { kind: k || null });
    const record = getPersistenceMapRecord(cfg, id, version);
    if (!record) return internal.buildResult(false, "EXTERNAL010_STRATEGY_EXPERIMENT_RECORD_NOT_FOUND", "Missing", { kind: k, id, version: version == null ? null : version });
    const storageId = getPersistenceStorageId(cfg, record);
    await state.marketPersistence.adapter.put("strategyExperiment." + k, storageId, record);
    return internal.buildResult(true, "EXTERNAL010_STRATEGY_EXPERIMENT_RECORD_PERSISTED", "Ready", { kind: k, storageId, adapterId: state.marketPersistence.adapterId });
  }

  async function readBackExternalIntelligenceStrategyExperimentRecord(kind, id, version) {
    const k = text(kind, "").toLowerCase(), cfg = PERSISTENCE_KINDS[k];
    if (!cfg || !state.marketPersistence || !state.marketPersistence.adapter) return internal.buildResult(false, "EXTERNAL010_STRATEGY_EXPERIMENT_READBACK_BLOCKED", "Blocked", { kind: k || null });
    let storageId = text(id, "");
    if (cfg.versionField) {
      if (version == null || version === "") {
        const live = getPersistenceMapRecord(cfg, id, null);
        if (!live) return internal.buildResult(false, "EXTERNAL010_STRATEGY_EXPERIMENT_VERSION_REQUIRED", "Blocked", { kind: k, id });
        storageId = getPersistenceStorageId(cfg, live);
      } else {
        storageId = key(id, cfg.numericVersion ? versionNumber(Number(version)) : versionText(version));
      }
    }
    const record = await state.marketPersistence.adapter.get("strategyExperiment." + k, storageId);
    return internal.buildResult(!!record, record ? "EXTERNAL010_STRATEGY_EXPERIMENT_RECORD_READBACK" : "EXTERNAL010_STRATEGY_EXPERIMENT_RECORD_NOT_FOUND", record ? "Ready" : "Missing", { kind: k, storageId, record });
  }

  function getExternalIntelligenceStrategyExperimentProtocol(id, version) {
    const record = version ? existingByKey(state.strategyExperimentProtocols, id, versionText(version)) : state.strategyExperimentProtocols.get(text(id, ""));
    return record ? clone(record) : null;
  }
  function getExternalIntelligenceStrategyBacktestResult(id) { const r = state.strategyBacktestResults.get(text(id, "")); return r ? clone(r) : null; }
  function getExternalIntelligenceStrategyExperimentReadiness(id) { const r = state.strategyExperimentReadiness.get(text(id, "")); return r ? clone(r) : null; }
  function listExternalIntelligenceStrategyFailureRecords() { return Array.from(state.strategyFailureRecords.values()).map(clone); }
  function listExternalIntelligenceStrategyTrials(experimentProtocolId, protocolVersion) {
    return Array.from(state.strategyTrialRecords.values()).filter(function filter(r) {
      return (!experimentProtocolId || r.experimentProtocolId === experimentProtocolId) && (!protocolVersion || r.protocolVersion === versionText(protocolVersion));
    }).map(clone);
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligencePhase19Definitions,
    createExternalIntelligenceStrategyHypothesisReference,
    createExternalIntelligenceStrategyDatasetSnapshot,
    createExternalIntelligenceHistoricalUniverseSnapshot,
    createExternalIntelligenceMarketRuleSnapshot,
    createExternalIntelligenceTransactionCostModel,
    createExternalIntelligenceExecutionModel,
    registerExternalIntelligenceBacktestEngineCapability,
    registerExternalIntelligenceStrategyExperimentProtocol,
    validateExternalIntelligenceStrategyPointInTime,
    validateExternalIntelligenceStrategyLeakage,
    recordExternalIntelligenceStrategyTrial,
    createExternalIntelligenceStrategyFingerprint,
    recordExternalIntelligenceStrategyBacktestResult,
    createExternalIntelligenceStrategyExperimentReadiness,
    createExternalIntelligenceStrategyFinanceHandoff,
    persistExternalIntelligenceStrategyExperimentRecord,
    readBackExternalIntelligenceStrategyExperimentRecord,
    getExternalIntelligenceStrategyExperimentProtocol,
    getExternalIntelligenceStrategyBacktestResult,
    getExternalIntelligenceStrategyExperimentReadiness,
    listExternalIntelligenceStrategyFailureRecords,
    listExternalIntelligenceStrategyTrials
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.strategyExperiment = {
    id: "EXTERNAL-010-MARKET-STRATEGY-EXPERIMENT",
    version: MODULE_VERSION,
    phase: 19,
    decisions: ["049"],
    status: "Ready",
    preRegistrationRequired: true,
    pointInTimeRequired: true,
    lookAheadBlocked: true,
    survivorshipControlRequired: true,
    featureLeakageBlocked: true,
    failedExperimentPreserved: true,
    trialHistoryPreserved: true,
    strategyHypothesisEqualsExperiment: false,
    highBacktestReturnEqualsValidatedStrategy: false,
    currentUniverseEqualsHistoricalUniverse: false,
    currentMarketRuleEqualsHistoricalMarketRule: false,
    signalPriceEqualsExecutionPrice: false,
    zeroCostBacktestEqualsExecutableReturn: false,
    paperFillEqualsRealFill: false,
    paperProfitEqualsExpectedRealProfit: false,
    missingMarketDataEqualsFlatMarket: false,
    highSharpeEqualsSafeStrategy: false,
    bestParameterEqualsRobustParameter: false,
    historicalPerformanceEqualsRegimeRobustness: false,
    backtestPassEqualsPaperApproval: false,
    paperPassEqualsRealMoneyApproval: false,
    readinessEqualsAuthority: false,
    failedOnceEqualsUniversallyUseless: false,
    successfulStrategyAllowsCapitalExpansion: false,
    researchFreedomAllowsUnlimitedParameterSearch: false,
    generatorEqualsIndependentValidator: false,
    tradingAuthorityGranted: false,
    portfolioAuthorityGranted: false,
    orderAuthorityGranted: false,
    executionAuthorityGranted: false,
    realMoneyAuthorityGranted: false,
    capitalExpansionAuthorityGranted: false
  };
})(typeof window !== "undefined" ? window : globalThis);
