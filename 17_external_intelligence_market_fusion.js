/* ============================================================
   FILE: 17_external_intelligence_market_fusion.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.17.1
   Phase 18: Cross-Domain Market Intelligence Fusion
   Primary Decision: 048
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("marketFusion");

  [
    "crossDomainMarketSignals",
    "compositeMarketHypotheses",
    "marketFusionPredictionCandidates",
    "marketFusionPackages",
    "marketFusionOutcomeEvaluations",
    "marketFusionCapabilities"
  ].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  const SIGNAL_FAMILIES = new Set([
    "TECHNICAL_TREND", "TECHNICAL_MOMENTUM", "TECHNICAL_VOLATILITY", "TECHNICAL_VOLUME",
    "LIQUIDITY", "FUNDAMENTAL_VALUE", "FUNDAMENTAL_GROWTH", "FUNDAMENTAL_QUALITY",
    "FINANCIAL_HEALTH", "EARNINGS", "CORPORATE_EVENT", "SUPPLY_CHAIN", "REGULATORY",
    "DISASTER", "NEWS_INFORMATION", "SOCIAL_NARRATIVE", "SOCIAL_PROPAGATION", "MACRO",
    "INTEREST_RATE", "FX", "COMMODITY", "MARKET_REGIME", "UNKNOWN"
  ]);
  const DIRECTIONS = new Set(["BULLISH", "BEARISH", "NEUTRAL", "MIXED", "CONDITIONAL", "UNKNOWN"]);
  const HORIZONS = new Set(["INTRADAY", "SHORT_TERM", "SWING", "MEDIUM_TERM", "LONG_TERM", "STRUCTURAL", "UNKNOWN"]);
  const HYPOTHESIS_STATES = new Set(["PROPOSED", "INVESTIGATING", "SUPPORTED", "STRONGLY_SUPPORTED", "WEAKENED", "CONTRADICTED", "FALSIFIED", "INCONCLUSIVE", "EXPIRED", "UNKNOWN"]);
  const ABSTENTION_STATES = new Set(["NONE", "NO_STRONG_VIEW", "CONFLICTING_SIGNALS", "INSUFFICIENT_EVIDENCE", "REGIME_UNCERTAIN", "DATA_QUALITY_BLOCKED", "OUT_OF_DOMAIN", "UNKNOWN"]);
  const QUALITATIVE_LIKELIHOODS = new Set(["LIKELY", "POSSIBLE", "UNCERTAIN", "INSUFFICIENT_EVIDENCE", "UNKNOWN"]);
  const FUSION_METHODS = new Set(["RULE_BASED", "WEIGHTED_SCORE", "STATISTICAL_MODEL", "MACHINE_LEARNING", "BAYESIAN", "ENSEMBLE", "LLM_REASONING", "CAUSAL_MODEL", "HYBRID"]);

  const DEFINITIONS = [
    ["crossDomainMarketSignal", "EXTERNAL-010-CONTRACT-CROSS-DOMAIN-MARKET-SIGNAL", "EXTERNAL-010-SCHEMA-CROSS-DOMAIN-MARKET-SIGNAL", [
      "signalId", "signalFamily", "targetEntityId", "instrumentId", "direction", "strength", "confidence", "freshness", "timeHorizon", "expectedLag", "persistence", "independenceGroup", "dependencyRefs", "commonInputRefs", "commonSourceRefs", "evidenceStrength", "contradictionState", "contradictionRefs", "regimeContext", "sourceLineage", "algorithmId", "algorithmVersion", "availableAt", "effectiveAt", "calculatedAt", "barState", "sourceRevision", "simpleVoteUnit", "tradingAuthorityGranted", "createdAt", "immutable"
    ]],
    ["compositeMarketHypothesis", "EXTERNAL-010-CONTRACT-COMPOSITE-MARKET-HYPOTHESIS", "EXTERNAL-010-SCHEMA-COMPOSITE-MARKET-HYPOTHESIS", [
      "hypothesisId", "version", "hypothesisRecordId", "instrumentId", "targetMetric", "targetDirection", "timeHorizon", "supportingSignalRefs", "contradictingSignalRefs", "independenceProfile", "regimeProfile", "causalMechanismRefs", "uncertaintyProfile", "missingEvidence", "state", "fusionCapabilityId", "fusionCapabilityVersion", "decisionTime", "featureAvailability", "simpleVoteAggregationUsed", "signalAgreementEqualsTruth", "correlationEqualsCausation", "tradingAuthorityGranted", "createdAt", "schemaVersion", "immutable"
    ]],
    ["marketFusionPredictionCandidate", "EXTERNAL-010-CONTRACT-MARKET-FUSION-PREDICTION-CANDIDATE", "EXTERNAL-010-SCHEMA-MARKET-FUSION-PREDICTION-CANDIDATE", [
      "predictionCandidateId", "version", "predictionCandidateRecordId", "hypothesisId", "decision030PredictionId", "targetMetric", "targetDirection", "targetTime", "timeHorizon", "probabilityState", "probability", "qualitativeLikelihood", "confidence", "predictionInterval", "uncertaintyFactors", "supportingHypothesisRefs", "abstentionState", "calibrationBasis", "predictionEqualsStrategy", "strategyEqualsOrder", "tradingAuthorityGranted", "createdAt", "immutable"
    ]],
    ["marketFusionPackage", "EXTERNAL-010-CONTRACT-MARKET-FUSION-PACKAGE", "EXTERNAL-010-SCHEMA-MARKET-FUSION-PACKAGE", [
      "fusionPackageId", "version", "fusionPackageRecordId", "instrumentId", "asOfTime", "technicalSignals", "fundamentalSignals", "eventSignals", "newsSignals", "socialSignals", "macroSignals", "otherSignals", "regimeProfile", "supportingEvidence", "contradictingEvidence", "independenceProfile", "compositeHypothesisRefs", "predictionRefs", "uncertaintyProfile", "dataQuality", "freshnessProfile", "lineageRefs", "fusionCapabilityId", "fusionCapabilityVersion", "marketFusionPackageEqualsCapitalAuthority", "predictionEqualsStrategy", "strategyEqualsOrder", "tradingAuthorityGranted", "createdAt", "immutable"
    ]],
    ["marketFusionOutcomeEvaluation", "EXTERNAL-010-CONTRACT-MARKET-FUSION-OUTCOME-EVALUATION", "EXTERNAL-010-SCHEMA-MARKET-FUSION-OUTCOME-EVALUATION", [
      "fusionOutcomeEvaluationId", "fusionPackageId", "outcomeRefs", "evaluationDimensions", "signalFamilyContribution", "causationConfirmed", "automaticRecalibrationPerformed", "productionFusionLogicChanged", "tradingAuthorityGranted", "createdAt", "immutable"
    ]]
  ];

  function initializeExternalIntelligencePhase18Definitions() {
    const results = [];
    DEFINITIONS.forEach(function register(definition) {
      const key = definition[0], contractId = definition[1], schemaId = definition[2], fields = definition[3];
      if (typeof namespace.registerExternalIntelligenceContract === "function") {
        results.push(namespace.registerExternalIntelligenceContract({
          contractId, key, name: key + " Contract", version: MODULE_VERSION, immutable: true,
          fields: fields.map(function field(name) { return { name, required: true }; }), source: "phase18"
        }));
      }
      if (typeof namespace.registerExternalIntelligenceSchema === "function") {
        results.push(namespace.registerExternalIntelligenceSchema({
          schemaId, name: key + " Schema", version: MODULE_VERSION, type: "object",
          required: fields, properties: Object.fromEntries(fields.map(function prop(name) { return [name, {}]; })),
          additionalProperties: true, immutable: true, owner: "EXTERNAL-010", source: "phase18"
        }));
      }
    });
    return results;
  }

  initializeExternalIntelligencePhase18Definitions();

  function ensurePhase18Definitions() {
    const requiredSchemas = DEFINITIONS.map(function schemaId(definition) { return definition[2]; });
    const ready = requiredSchemas.every(function exists(schemaId) {
      return typeof namespace.getExternalIntelligenceSchema === "function" && !!namespace.getExternalIntelligenceSchema(schemaId);
    });
    if (!ready) initializeExternalIntelligencePhase18Definitions();
    return requiredSchemas.every(function existsAfter(schemaId) {
      return typeof namespace.getExternalIntelligenceSchema === "function" && !!namespace.getExternalIntelligenceSchema(schemaId);
    });
  }

  function upper(value, fallback) { return internal.text(value, fallback || "").trim().toUpperCase(); }
  function asNumberOrNull(value) { if (value == null || value === "") return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
  function parseTime(value) { const n = Date.parse(String(value || "")); return Number.isFinite(n) ? n : null; }
  function getSignal(id) { const r = state.crossDomainMarketSignals.get(internal.text(id, "")); return r || null; }
  function getHypothesis(id) { const r = state.compositeMarketHypotheses.get(internal.text(id, "")); return r || null; }
  function getPrediction(id) { const r = state.marketFusionPredictionCandidates.get(internal.text(id, "")); return r || null; }

  function mapFusionMethodToCapabilityType(method) {
    if (method === "RULE_BASED" || method === "WEIGHTED_SCORE") return "RULE_ENGINE";
    if (method === "STATISTICAL_MODEL" || method === "BAYESIAN" || method === "CAUSAL_MODEL") return "STATISTICAL_MODEL";
    if (method === "MACHINE_LEARNING") return "TIME_SERIES_MODEL";
    if (method === "ENSEMBLE" || method === "HYBRID") return "ENSEMBLE";
    if (method === "LLM_REASONING") return "LLM";
    return "ALGORITHM";
  }

  function registerExternalIntelligenceMarketFusionCapability(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const capabilityId = internal.text(x.fusionCapabilityId || x.capabilityId, "");
    const fusionCapabilityVersion = internal.text(x.fusionCapabilityVersion || x.recordVersion, MODULE_VERSION);
    const fusionMethod = upper(x.fusionMethod, "RULE_BASED");
    if (!capabilityId || !FUSION_METHODS.has(fusionMethod)) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_CAPABILITY_INVALID", "Blocked", { capabilityId: capabilityId || null, fusionMethod });
    }
    if (typeof namespace.registerExternalIntelligenceAnalyticalCapability !== "function") {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_CAPABILITY_REGISTRY_UNAVAILABLE", "Blocked", null);
    }
    const registered = namespace.registerExternalIntelligenceAnalyticalCapability({
      capabilityId,
      recordVersion: fusionCapabilityVersion,
      capabilityType: mapFusionMethodToCapabilityType(fusionMethod),
      providerId: internal.text(x.providerId, "LOCAL"),
      modelFamily: internal.text(x.modelFamily, fusionMethod),
      modelVersion: internal.text(x.modelVersion, "N/A"),
      algorithmVersion: internal.text(x.algorithmVersion, fusionCapabilityVersion),
      supportedTasks: internal.unique((x.supportedTasks || []).concat(["MARKET_FUSION", "COMPOSITE_HYPOTHESIS", "PREDICTION_CANDIDATE"])),
      supportedDomains: internal.unique((x.supportedDomains || []).concat(["MARKET"])),
      supportedHorizons: internal.unique((x.supportedHorizons || []).concat(["ANY"])),
      supportedInputTypes: internal.unique((x.supportedInputTypes || []).concat(["STRUCTURED_SIGNAL"])),
      availabilityState: upper(x.availabilityState, "READY"),
      executionLocation: upper(x.executionLocation, "LOCAL"),
      roles: internal.unique((x.roles || []).concat(["PRIMARY"])),
      outputClassifications: ["HYPOTHESIS", "PREDICTION"],
      dataHandlingPolicy: internal.isPlainObject(x.dataHandlingPolicy) ? x.dataHandlingPolicy : { externalTransmissionAllowed: false, allowedDataClasses: ["PUBLIC", "DERIVED"] }
    });
    if (!registered.ok) return registered;
    const descriptor = internal.deepFreeze({
      fusionCapabilityId: capabilityId,
      fusionCapabilityVersion,
      fusionMethod,
      ruleDefinition: x.ruleDefinition == null ? null : internal.clone(x.ruleDefinition),
      parameters: internal.isPlainObject(x.parameters) ? internal.clone(x.parameters) : {},
      automaticProductionPromotionAllowed: false,
      tradingAuthorityGranted: false,
      immutable: true
    });
    state.marketFusionCapabilities.set(capabilityId + "@" + fusionCapabilityVersion, descriptor);
    return internal.buildResult(true, "EXTERNAL010_MARKET_FUSION_CAPABILITY_REGISTERED", "Ready", { fusionCapability: internal.clone(descriptor), analyticalCapability: registered.data && registered.data.analyticalCapability || null });
  }

  function createExternalIntelligenceCrossDomainMarketSignal(input) {
    if (!ensurePhase18Definitions()) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const signalFamily = upper(x.signalFamily, "UNKNOWN");
    const direction = upper(x.direction, "UNKNOWN");
    const timeHorizon = upper(x.timeHorizon, "UNKNOWN");
    const instrumentId = internal.text(x.instrumentId, "") || null;
    const targetEntityId = internal.text(x.targetEntityId, "") || null;
    if (!SIGNAL_FAMILIES.has(signalFamily) || !DIRECTIONS.has(direction) || !HORIZONS.has(timeHorizon)) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_SIGNAL_ENUM_INVALID", "Blocked", { signalFamily, direction, timeHorizon });
    }
    if (!instrumentId && !targetEntityId) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_SIGNAL_TARGET_REQUIRED", "Blocked", null);
    }
    if (instrumentId && state.marketInstruments instanceof Map && !state.marketInstruments.has(instrumentId)) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_INSTRUMENT_NOT_FOUND", "Blocked", { instrumentId });
    }
    const signalId = internal.text(x.signalId, "") || internal.nextId("EXTERNAL-010-MARKET-SIGNAL");
    if (state.crossDomainMarketSignals.has(signalId)) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_SIGNAL_DUPLICATE", "Blocked", { signalId });
    }
    const record = internal.deepFreeze({
      signalId,
      signalFamily,
      targetEntityId,
      instrumentId,
      direction,
      strength: asNumberOrNull(x.strength),
      confidence: x.confidence == null ? "UNKNOWN" : internal.clone(x.confidence),
      freshness: internal.text(x.freshness, "UNKNOWN"),
      timeHorizon,
      expectedLag: x.expectedLag == null ? null : internal.clone(x.expectedLag),
      persistence: x.persistence == null ? null : internal.clone(x.persistence),
      independenceGroup: internal.text(x.independenceGroup, "UNKNOWN") || "UNKNOWN",
      dependencyRefs: internal.unique(x.dependencyRefs || []),
      commonInputRefs: internal.unique(x.commonInputRefs || []),
      commonSourceRefs: internal.unique(x.commonSourceRefs || []),
      evidenceStrength: internal.text(x.evidenceStrength, "UNKNOWN"),
      contradictionState: internal.text(x.contradictionState, "UNASSESSED"),
      contradictionRefs: internal.unique(x.contradictionRefs || []),
      regimeContext: internal.isPlainObject(x.regimeContext) ? internal.clone(x.regimeContext) : { state: "UNKNOWN" },
      sourceLineage: internal.unique(x.sourceLineage || x.evidenceRefs || []),
      algorithmId: internal.text(x.algorithmId, "HUMAN_OR_EXTERNAL_SIGNAL"),
      algorithmVersion: internal.text(x.algorithmVersion, "UNKNOWN"),
      availableAt: internal.text(x.availableAt, "") || null,
      effectiveAt: internal.text(x.effectiveAt, "") || null,
      calculatedAt: internal.text(x.calculatedAt, "") || null,
      barState: upper(x.barState, "UNKNOWN"),
      sourceRevision: x.sourceRevision == null ? null : internal.clone(x.sourceRevision),
      simpleVoteUnit: false,
      tradingAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("crossDomainMarketSignal", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-CROSS-DOMAIN-MARKET-SIGNAL", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_SIGNAL_INVALID", "Blocked", { contract: cv, schema: sv });
    state.crossDomainMarketSignals.set(signalId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_MARKET_FUSION_SIGNAL_RECORDED", "Candidate", { signal: internal.clone(record) });
  }

  function validateExternalIntelligenceMarketFusionFeatureAvailability(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const signalIds = internal.unique(x.signalIds || []);
    const decisionTime = internal.text(x.decisionTime, "");
    const decisionMs = parseTime(decisionTime);
    const strict = x.requireKnownAvailability !== false;
    if (!signalIds.length || decisionMs == null) {
      return { valid: false, leakageDetected: false, decisionTime: decisionTime || null, checks: [], blockedSignalIds: signalIds, code: "EXTERNAL010_MARKET_FUSION_DECISION_TIME_REQUIRED" };
    }
    const checks = signalIds.map(function inspect(signalId) {
      const signal = getSignal(signalId);
      if (!signal) return { signalId, eligible: false, leakage: false, reasons: ["SIGNAL_NOT_FOUND"] };
      const reasons = [];
      let leakage = false;
      const availableMs = parseTime(signal.availableAt);
      const calculatedMs = parseTime(signal.calculatedAt);
      const revisionAvailableMs = signal.sourceRevision && typeof signal.sourceRevision === "object" ? parseTime(signal.sourceRevision.availableAt) : null;
      const barFinalizedMs = signal.sourceRevision && typeof signal.sourceRevision === "object" ? parseTime(signal.sourceRevision.barFinalizedAt) : null;
      if (availableMs == null && strict) reasons.push("AVAILABILITY_UNKNOWN");
      if (availableMs != null && availableMs > decisionMs) { reasons.push("AVAILABLE_AFTER_DECISION"); leakage = true; }
      if (calculatedMs != null && calculatedMs > decisionMs) { reasons.push("CALCULATED_AFTER_DECISION"); leakage = true; }
      if (revisionAvailableMs != null && revisionAvailableMs > decisionMs) { reasons.push("REVISION_AVAILABLE_AFTER_DECISION"); leakage = true; }
      if (barFinalizedMs != null && barFinalizedMs > decisionMs) { reasons.push("BAR_FINALIZED_AFTER_DECISION"); leakage = true; }
      return { signalId, eligible: reasons.length === 0, leakage, reasons };
    });
    const blockedSignalIds = checks.filter(function blocked(c) { return !c.eligible; }).map(function id(c) { return c.signalId; });
    return { valid: blockedSignalIds.length === 0, leakageDetected: checks.some(function leaked(c) { return c.leakage; }), decisionTime, strictAvailability: strict, checks, blockedSignalIds };
  }

  function buildIndependenceProfile(signalRefs) {
    const refs = internal.unique(signalRefs || []);
    const groups = new Map();
    const underlyingRefs = new Map();
    let unknownIndependenceCount = 0;
    refs.forEach(function inspect(id) {
      const signal = getSignal(id);
      if (!signal) return;
      const group = internal.text(signal.independenceGroup, "UNKNOWN");
      if (!group || group === "UNKNOWN") unknownIndependenceCount += 1;
      else {
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(id);
      }
      internal.unique([].concat(signal.dependencyRefs || [], signal.commonInputRefs || [], signal.commonSourceRefs || [], signal.sourceLineage || [])).forEach(function ref(referenceId) {
        if (!underlyingRefs.has(referenceId)) underlyingRefs.set(referenceId, []);
        underlyingRefs.get(referenceId).push(id);
      });
    });
    return {
      rawSignalCount: refs.length,
      knownIndependenceGroupCount: groups.size,
      unknownIndependenceCount,
      redundantGroups: Array.from(groups.entries()).filter(function redundant(entry) { return entry[1].length > 1; }).map(function map(entry) { return { independenceGroup: entry[0], signalRefs: entry[1].slice() }; }),
      sharedUnderlyingReferences: Array.from(underlyingRefs.entries()).filter(function shared(entry) { return entry[1].length > 1; }).map(function map(entry) { return { referenceId: entry[0], signalRefs: internal.unique(entry[1]) }; }),
      simpleVoteCountUsed: false,
      unknownIndependenceAssumedIndependent: false
    };
  }

  async function recordFusionDerivation(inputRefs, outputRef, capabilityId, capabilityVersion, eventType, auditDetails) {
    const lineageRefs = [];
    let transformationId = null;
    if (typeof namespace.createExternalIntelligenceTransformationRecord === "function" && inputRefs.length) {
      const transformation = namespace.createExternalIntelligenceTransformationRecord({
        transformationType: "FUSE",
        transformationVersion: capabilityVersion || MODULE_VERSION,
        capabilityId: capabilityId || null,
        algorithmVersion: capabilityVersion || MODULE_VERSION,
        inputReferenceIds: inputRefs,
        outputReferenceIds: [outputRef],
        status: "SUCCESS"
      });
      if (transformation.ok && transformation.data && transformation.data.transformationRecord) {
        transformationId = transformation.data.transformationRecord.transformationId;
        inputRefs.forEach(function edge(ref) {
          const lr = namespace.createExternalIntelligenceLineageRecord({ inputReferenceId: ref, outputReferenceId: outputRef, relationType: "FUSED_FROM", transformationId, lineageState: "ACTIVE" });
          if (lr.ok && lr.data && lr.data.lineageRecord) lineageRefs.push(lr.data.lineageRecord.lineageRecordId);
        });
      }
    }
    let auditEventId = null;
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") {
      const audit = await namespace.appendExternalIntelligenceAuditEvent({ eventType, actor: "EXTERNAL-010", outcome: "Recorded", details: auditDetails || {}, references: internal.unique(inputRefs.concat([outputRef])) });
      if (audit.ok && audit.data && audit.data.event) auditEventId = audit.data.event.auditEventId;
    }
    return { transformationId, lineageRefs, auditEventId };
  }

  async function createExternalIntelligenceCompositeMarketHypothesis(input) {
    if (!ensurePhase18Definitions()) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const supportingSignalRefs = internal.unique(x.supportingSignalRefs || []);
    const contradictingSignalRefs = internal.unique(x.contradictingSignalRefs || []);
    const allSignalRefs = internal.unique(supportingSignalRefs.concat(contradictingSignalRefs));
    if (!allSignalRefs.length || allSignalRefs.some(function missing(id) { return !getSignal(id); })) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_HYPOTHESIS_SIGNAL_INVALID", "Blocked", { allSignalRefs });
    }
    if (supportingSignalRefs.some(function overlap(id) { return contradictingSignalRefs.includes(id); })) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_SIGNAL_ROLE_CONFLICT", "Blocked", null);
    }
    const timeHorizon = upper(x.timeHorizon, "UNKNOWN"), targetDirection = upper(x.targetDirection, "UNKNOWN"), hypothesisState = upper(x.state || x.hypothesisState, "PROPOSED");
    if (!HORIZONS.has(timeHorizon) || !DIRECTIONS.has(targetDirection) || !HYPOTHESIS_STATES.has(hypothesisState)) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_HYPOTHESIS_ENUM_INVALID", "Blocked", { timeHorizon, targetDirection, hypothesisState });
    }
    const fusionCapabilityId = internal.text(x.fusionCapabilityId, ""), fusionCapabilityVersion = internal.text(x.fusionCapabilityVersion, "");
    const analyticalCapability = typeof namespace.getExternalIntelligenceAnalyticalCapability === "function" ? namespace.getExternalIntelligenceAnalyticalCapability(fusionCapabilityId, fusionCapabilityVersion || undefined) : null;
    if (!fusionCapabilityId || !fusionCapabilityVersion || !analyticalCapability) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_CAPABILITY_REQUIRED", "Blocked", { fusionCapabilityId, fusionCapabilityVersion });
    }
    const decisionTime = internal.text(x.decisionTime, "") || null;
    let featureAvailability = { valid: true, leakageDetected: false, decisionTime, checks: [], blockedSignalIds: [] };
    if (decisionTime) {
      featureAvailability = validateExternalIntelligenceMarketFusionFeatureAvailability({ signalIds: allSignalRefs, decisionTime, requireKnownAvailability: x.requireKnownAvailability !== false });
      if (!featureAvailability.valid) return internal.buildResult(false, featureAvailability.leakageDetected ? "EXTERNAL010_MARKET_FUSION_LEAKAGE_BLOCKED" : "EXTERNAL010_MARKET_FUSION_FEATURE_UNAVAILABLE", "Blocked", { featureAvailability });
    }
    const hypothesisId = internal.text(x.hypothesisId, "") || internal.nextId("EXTERNAL-010-COMPOSITE-MARKET-HYPOTHESIS");
    const version = Number.isInteger(x.version) && x.version > 0 ? x.version : 1;
    const recordKey = hypothesisId + "@" + version;
    if (state.compositeMarketHypotheses.has(recordKey)) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_HYPOTHESIS_VERSION_DUPLICATE", "Blocked", { recordKey });
    const record = internal.deepFreeze({
      hypothesisId,
      version,
      hypothesisRecordId: hypothesisId + "-V" + version,
      instrumentId: internal.text(x.instrumentId, "") || null,
      targetMetric: internal.text(x.targetMetric, "UNSPECIFIED"),
      targetDirection,
      timeHorizon,
      supportingSignalRefs,
      contradictingSignalRefs,
      independenceProfile: buildIndependenceProfile(allSignalRefs),
      regimeProfile: internal.isPlainObject(x.regimeProfile) ? internal.clone(x.regimeProfile) : { state: "UNKNOWN" },
      causalMechanismRefs: internal.unique(x.causalMechanismRefs || []),
      uncertaintyProfile: internal.isPlainObject(x.uncertaintyProfile) ? internal.clone(x.uncertaintyProfile) : { state: "UNASSESSED", contradictionCount: contradictingSignalRefs.length },
      missingEvidence: Array.isArray(x.missingEvidence) ? internal.clone(x.missingEvidence) : [],
      state: hypothesisState,
      fusionCapabilityId,
      fusionCapabilityVersion,
      decisionTime,
      featureAvailability: internal.clone(featureAvailability),
      simpleVoteAggregationUsed: false,
      signalAgreementEqualsTruth: false,
      correlationEqualsCausation: false,
      tradingAuthorityGranted: false,
      createdAt: internal.nowIso(),
      schemaVersion: MODULE_VERSION,
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("compositeMarketHypothesis", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-COMPOSITE-MARKET-HYPOTHESIS", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_HYPOTHESIS_INVALID", "Blocked", { contract: cv, schema: sv });
    state.compositeMarketHypotheses.set(recordKey, record);
    state.compositeMarketHypotheses.set(hypothesisId, record);
    internal.touch();
    const derivation = await recordFusionDerivation(allSignalRefs, record.hypothesisRecordId, fusionCapabilityId, fusionCapabilityVersion, "MARKET_FUSION_HYPOTHESIS_CREATED", { hypothesisId, version, supportingCount: supportingSignalRefs.length, contradictingCount: contradictingSignalRefs.length, tradingAuthorityGranted: false });
    if (typeof namespace.createExternalIntelligenceAnalysisExecutionRecord === "function") {
      namespace.createExternalIntelligenceAnalysisExecutionRecord({ capabilityId: fusionCapabilityId, taskType: "MARKET_FUSION", domain: "MARKET", horizon: timeHorizon, inputReferenceIds: allSignalRefs, outputReferenceIds: [record.hypothesisRecordId], outputClassification: "HYPOTHESIS", executionState: "RECORDED" });
    }
    return internal.buildResult(true, "EXTERNAL010_COMPOSITE_MARKET_HYPOTHESIS_CREATED", "Candidate", { hypothesis: internal.clone(record), derivation });
  }

  async function createExternalIntelligenceMarketFusionPredictionCandidate(input) {
    if (!ensurePhase18Definitions()) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const hypothesis = getHypothesis(x.hypothesisId);
    if (!hypothesis) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_HYPOTHESIS_NOT_FOUND", "Blocked", { hypothesisId: x.hypothesisId || null });
    const abstentionState = upper(x.abstentionState, "NONE"), qualitativeLikelihood = upper(x.qualitativeLikelihood, "UNKNOWN");
    if (!ABSTENTION_STATES.has(abstentionState) || !QUALITATIVE_LIKELIHOODS.has(qualitativeLikelihood)) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_PREDICTION_ENUM_INVALID", "Blocked", { abstentionState, qualitativeLikelihood });
    }
    let probability = x.probability == null ? null : Number(x.probability);
    if (probability !== null && (!Number.isFinite(probability) || probability < 0 || probability > 1)) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_PROBABILITY_INVALID", "Blocked", { probability });
    const calibrationBasis = internal.isPlainObject(x.calibrationBasis) ? internal.clone(x.calibrationBasis) : { state: "UNASSESSED", sampleCount: 0 };
    if (probability !== null) {
      const samples = Number(calibrationBasis.sampleCount || 0), calibrationState = upper(calibrationBasis.state, "UNASSESSED");
      if (!(samples > 0) || ["UNASSESSED", "UNKNOWN", "INSUFFICIENT_EVIDENCE"].includes(calibrationState)) {
        return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_FALSE_PRECISION_BLOCKED", "Blocked", { calibrationBasis });
      }
    }
    if (abstentionState !== "NONE") probability = null;
    const probabilityState = probability !== null ? "POINT_ESTIMATE" : (qualitativeLikelihood !== "UNKNOWN" ? "QUALITATIVE" : "NOT_ESTIMATED");
    const predictionCandidateId = internal.text(x.predictionCandidateId, "") || internal.nextId("EXTERNAL-010-MARKET-PREDICTION-CANDIDATE");
    const version = Number.isInteger(x.version) && x.version > 0 ? x.version : 1;
    const underlyingPredictionId = internal.text(x.decision030PredictionId, "") || (predictionCandidateId + "-D030");
    if (typeof namespace.registerExternalIntelligencePrediction !== "function") return internal.buildResult(false, "EXTERNAL010_DECISION030_PREDICTION_API_UNAVAILABLE", "Blocked", null);
    const p = namespace.registerExternalIntelligencePrediction({
      predictionId: underlyingPredictionId,
      version,
      subjectRef: hypothesis.hypothesisRecordId,
      predictionType: "MARKET_DIRECTION",
      targetTime: internal.text(x.targetTime, "") || null,
      probabilityState,
      probability,
      estimateConfidence: internal.text(x.confidence, "UNKNOWN"),
      evidenceStrength: internal.text(hypothesis.uncertaintyProfile && hypothesis.uncertaintyProfile.evidenceStrength, "UNKNOWN"),
      historicalSampleCount: Number(calibrationBasis.sampleCount || 0),
      predictionInterval: x.predictionInterval || null,
      uncertaintyFactors: internal.unique(x.uncertaintyFactors || []),
      modelId: hypothesis.fusionCapabilityId,
      modelVersion: hypothesis.fusionCapabilityVersion,
      evidenceIds: internal.unique(hypothesis.supportingSignalRefs.concat(hypothesis.contradictingSignalRefs)),
      calibrationState: upper(calibrationBasis.state, "UNASSESSED")
    });
    if (!p.ok) return p;
    const record = internal.deepFreeze({
      predictionCandidateId,
      version,
      predictionCandidateRecordId: predictionCandidateId + "-V" + version,
      hypothesisId: hypothesis.hypothesisId,
      decision030PredictionId: underlyingPredictionId,
      targetMetric: internal.text(x.targetMetric, hypothesis.targetMetric),
      targetDirection: upper(x.targetDirection, hypothesis.targetDirection),
      targetTime: internal.text(x.targetTime, "") || null,
      timeHorizon: upper(x.timeHorizon, hypothesis.timeHorizon),
      probabilityState,
      probability,
      qualitativeLikelihood,
      confidence: internal.text(x.confidence, "UNKNOWN"),
      predictionInterval: x.predictionInterval == null ? null : internal.clone(x.predictionInterval),
      uncertaintyFactors: internal.unique(x.uncertaintyFactors || []),
      supportingHypothesisRefs: internal.unique((x.supportingHypothesisRefs || []).concat([hypothesis.hypothesisRecordId])),
      abstentionState,
      calibrationBasis,
      predictionEqualsStrategy: false,
      strategyEqualsOrder: false,
      tradingAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("marketFusionPredictionCandidate", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-MARKET-FUSION-PREDICTION-CANDIDATE", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_PREDICTION_INVALID", "Blocked", { contract: cv, schema: sv });
    state.marketFusionPredictionCandidates.set(predictionCandidateId, record);
    state.marketFusionPredictionCandidates.set(record.predictionCandidateRecordId, record);
    internal.touch();
    const derivation = await recordFusionDerivation([hypothesis.hypothesisRecordId], record.predictionCandidateRecordId, hypothesis.fusionCapabilityId, hypothesis.fusionCapabilityVersion, "MARKET_FUSION_PREDICTION_CANDIDATE_CREATED", { predictionCandidateId, abstentionState, probabilityState, tradingAuthorityGranted: false });
    return internal.buildResult(true, abstentionState === "NONE" ? "EXTERNAL010_MARKET_FUSION_PREDICTION_CANDIDATE_CREATED" : "EXTERNAL010_MARKET_FUSION_ABSTAINED", abstentionState === "NONE" ? "Candidate" : "Abstained", { predictionCandidate: internal.clone(record), decision030Prediction: p.data && p.data.prediction || null, derivation });
  }

  function classifySignalFamily(signalFamily) {
    if (signalFamily.indexOf("TECHNICAL_") === 0 || signalFamily === "LIQUIDITY") return "technicalSignals";
    if (signalFamily.indexOf("FUNDAMENTAL_") === 0 || signalFamily === "FINANCIAL_HEALTH" || signalFamily === "EARNINGS") return "fundamentalSignals";
    if (["CORPORATE_EVENT", "SUPPLY_CHAIN", "REGULATORY", "DISASTER"].includes(signalFamily)) return "eventSignals";
    if (signalFamily === "NEWS_INFORMATION") return "newsSignals";
    if (signalFamily.indexOf("SOCIAL_") === 0) return "socialSignals";
    if (["MACRO", "INTEREST_RATE", "FX", "COMMODITY", "MARKET_REGIME"].includes(signalFamily)) return "macroSignals";
    return "otherSignals";
  }

  async function createExternalIntelligenceMarketFusionPackage(input) {
    if (!ensurePhase18Definitions()) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const compositeHypothesisRefs = internal.unique(x.compositeHypothesisRefs || []);
    const predictionRefs = internal.unique(x.predictionRefs || []);
    const hypotheses = compositeHypothesisRefs.map(getHypothesis).filter(Boolean);
    const predictions = predictionRefs.map(getPrediction).filter(Boolean);
    if (!hypotheses.length || hypotheses.length !== compositeHypothesisRefs.length || predictions.length !== predictionRefs.length) {
      return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_PACKAGE_REFERENCES_INVALID", "Blocked", { compositeHypothesisRefs, predictionRefs });
    }
    const signalRefs = internal.unique(hypotheses.flatMap(function refs(h) { return h.supportingSignalRefs.concat(h.contradictingSignalRefs); }));
    const buckets = { technicalSignals: [], fundamentalSignals: [], eventSignals: [], newsSignals: [], socialSignals: [], macroSignals: [], otherSignals: [] };
    const supportingEvidence = [], contradictingEvidence = [];
    signalRefs.forEach(function categorize(ref) {
      const signal = getSignal(ref); if (!signal) return;
      buckets[classifySignalFamily(signal.signalFamily)].push(ref);
      supportingEvidence.push.apply(supportingEvidence, signal.sourceLineage || []);
    });
    hypotheses.forEach(function contradict(h) {
      h.contradictingSignalRefs.forEach(function ref(id) { const s = getSignal(id); if (s) contradictingEvidence.push.apply(contradictingEvidence, s.sourceLineage || [id]); });
    });
    const primary = hypotheses[0];
    const fusionPackageId = internal.text(x.fusionPackageId, "") || internal.nextId("EXTERNAL-010-MARKET-FUSION-PACKAGE");
    const version = Number.isInteger(x.version) && x.version > 0 ? x.version : 1;
    const record = internal.deepFreeze({
      fusionPackageId,
      version,
      fusionPackageRecordId: fusionPackageId + "-V" + version,
      instrumentId: internal.text(x.instrumentId, primary.instrumentId || "") || null,
      asOfTime: internal.text(x.asOfTime, "") || internal.nowIso(),
      technicalSignals: internal.unique(buckets.technicalSignals),
      fundamentalSignals: internal.unique(buckets.fundamentalSignals),
      eventSignals: internal.unique(buckets.eventSignals),
      newsSignals: internal.unique(buckets.newsSignals),
      socialSignals: internal.unique(buckets.socialSignals),
      macroSignals: internal.unique(buckets.macroSignals),
      otherSignals: internal.unique(buckets.otherSignals),
      regimeProfile: internal.isPlainObject(x.regimeProfile) ? internal.clone(x.regimeProfile) : internal.clone(primary.regimeProfile),
      supportingEvidence: internal.unique((x.supportingEvidence || []).concat(supportingEvidence)),
      contradictingEvidence: internal.unique((x.contradictingEvidence || []).concat(contradictingEvidence)),
      independenceProfile: buildIndependenceProfile(signalRefs),
      compositeHypothesisRefs,
      predictionRefs,
      uncertaintyProfile: internal.isPlainObject(x.uncertaintyProfile) ? internal.clone(x.uncertaintyProfile) : { state: predictions.some(function abstain(p) { return p.abstentionState !== "NONE"; }) ? "ABSTENTION_PRESENT" : "UNASSESSED" },
      dataQuality: internal.isPlainObject(x.dataQuality) ? internal.clone(x.dataQuality) : { state: "UNKNOWN" },
      freshnessProfile: internal.isPlainObject(x.freshnessProfile) ? internal.clone(x.freshnessProfile) : { state: "UNKNOWN" },
      lineageRefs: [],
      fusionCapabilityId: primary.fusionCapabilityId,
      fusionCapabilityVersion: primary.fusionCapabilityVersion,
      marketFusionPackageEqualsCapitalAuthority: false,
      predictionEqualsStrategy: false,
      strategyEqualsOrder: false,
      tradingAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("marketFusionPackage", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-MARKET-FUSION-PACKAGE", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_PACKAGE_INVALID", "Blocked", { contract: cv, schema: sv });
    state.marketFusionPackages.set(fusionPackageId, record);
    state.marketFusionPackages.set(record.fusionPackageRecordId, record);
    internal.touch();
    const inputs = internal.unique(hypotheses.map(function ref(h) { return h.hypothesisRecordId; }).concat(predictions.map(function ref(p) { return p.predictionCandidateRecordId; })));
    const derivation = await recordFusionDerivation(inputs, record.fusionPackageRecordId, record.fusionCapabilityId, record.fusionCapabilityVersion, "MARKET_FUSION_PACKAGE_CREATED", { fusionPackageId, predictionCount: predictionRefs.length, contradictionCount: record.contradictingEvidence.length, tradingAuthorityGranted: false });
    const finalRecord = internal.deepFreeze(Object.assign({}, internal.clone(record), { lineageRefs: internal.unique(derivation.lineageRefs || []) }));
    state.marketFusionPackages.set(fusionPackageId, finalRecord);
    state.marketFusionPackages.set(finalRecord.fusionPackageRecordId, finalRecord);
    return internal.buildResult(true, "EXTERNAL010_MARKET_FUSION_PACKAGE_CREATED", "Ready", { fusionPackage: internal.clone(finalRecord), derivation });
  }

  async function persistExternalIntelligenceMarketFusionPackage(fusionPackageId, version) {
    const id = internal.text(fusionPackageId, ""), v = Number.isInteger(version) && version > 0 ? version : 1;
    const record = state.marketFusionPackages.get(id + "-V" + v) || state.marketFusionPackages.get(id);
    if (!record || !state.marketPersistence || !state.marketPersistence.adapter) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_PERSISTENCE_BLOCKED", "Blocked", null);
    await state.marketPersistence.adapter.put("fusionPackage", record.fusionPackageRecordId, record);
    return internal.buildResult(true, "EXTERNAL010_MARKET_FUSION_PACKAGE_PERSISTED", "Ready", { fusionPackageId: id, version: v, adapterId: state.marketPersistence.adapterId });
  }

  async function readBackExternalIntelligenceMarketFusionPackage(fusionPackageId, version) {
    const id = internal.text(fusionPackageId, ""), v = Number.isInteger(version) && version > 0 ? version : 1;
    const recordId = id + "-V" + v;
    const record = state.marketPersistence && state.marketPersistence.adapter ? await state.marketPersistence.adapter.get("fusionPackage", recordId) : null;
    return internal.buildResult(Boolean(record), record ? "EXTERNAL010_MARKET_FUSION_PACKAGE_READBACK" : "EXTERNAL010_MARKET_FUSION_PACKAGE_NOT_FOUND", record ? "Ready" : "Missing", { fusionPackage: record });
  }

  async function recordExternalIntelligenceMarketFusionOutcomeEvaluation(input) {
    if (!ensurePhase18Definitions()) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_DEFINITIONS_NOT_READY", "Blocked", null);
    const x = internal.isPlainObject(input) ? input : {};
    const pkg = state.marketFusionPackages.get(internal.text(x.fusionPackageId, ""));
    if (!pkg) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_PACKAGE_NOT_FOUND", "Blocked", null);
    const outcomeRefs = internal.unique(x.outcomeRefs || []);
    const existingOutcomes = state.outcomeRecords instanceof Map ? outcomeRefs.filter(function exists(id) { return state.outcomeRecords.has(id); }) : [];
    if (outcomeRefs.length && existingOutcomes.length !== outcomeRefs.length) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_OUTCOME_REFERENCE_INVALID", "Blocked", { outcomeRefs, existingOutcomes });
    const record = internal.deepFreeze({
      fusionOutcomeEvaluationId: internal.nextId("EXTERNAL-010-MARKET-FUSION-OUTCOME-EVALUATION"),
      fusionPackageId: pkg.fusionPackageId,
      outcomeRefs,
      evaluationDimensions: internal.isPlainObject(x.evaluationDimensions) ? internal.clone(x.evaluationDimensions) : {},
      signalFamilyContribution: internal.isPlainObject(x.signalFamilyContribution) ? internal.clone(x.signalFamilyContribution) : {},
      causationConfirmed: false,
      automaticRecalibrationPerformed: false,
      productionFusionLogicChanged: false,
      tradingAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("marketFusionOutcomeEvaluation", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-MARKET-FUSION-OUTCOME-EVALUATION", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_MARKET_FUSION_OUTCOME_EVALUATION_INVALID", "Blocked", { contract: cv, schema: sv });
    state.marketFusionOutcomeEvaluations.set(record.fusionOutcomeEvaluationId, record);
    if (typeof namespace.recordExternalIntelligenceCapabilityPerformanceProfile === "function") {
      namespace.recordExternalIntelligenceCapabilityPerformanceProfile({
        capabilityId: pkg.fusionCapabilityId,
        taskType: "MARKET_FUSION",
        domain: "MARKET",
        horizon: "ANY",
        evaluationType: "OUTCOME_GROUNDED",
        sampleCount: outcomeRefs.length,
        metrics: record.evaluationDimensions,
        outcomeGrounded: true,
        evaluationEvidenceRefs: outcomeRefs
      });
    }
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") {
      await namespace.appendExternalIntelligenceAuditEvent({ eventType: "MARKET_FUSION_OUTCOME_EVALUATED", actor: "EXTERNAL-010", outcome: "Recorded", details: { fusionPackageId: pkg.fusionPackageId, outcomeCount: outcomeRefs.length, automaticRecalibrationPerformed: false }, references: [pkg.fusionPackageRecordId].concat(outcomeRefs) });
    }
    return internal.buildResult(true, "EXTERNAL010_MARKET_FUSION_OUTCOME_EVALUATED", "Ready", { evaluation: internal.clone(record) });
  }

  function getExternalIntelligenceCrossDomainMarketSignal(signalId) { const r = getSignal(signalId); return r ? internal.clone(r) : null; }
  function getExternalIntelligenceCompositeMarketHypothesis(hypothesisId) { const r = getHypothesis(hypothesisId); return r ? internal.clone(r) : null; }
  function getExternalIntelligenceMarketFusionPredictionCandidate(predictionId) { const r = getPrediction(predictionId); return r ? internal.clone(r) : null; }
  function getExternalIntelligenceMarketFusionPackage(packageId) { const r = state.marketFusionPackages.get(internal.text(packageId, "")); return r ? internal.clone(r) : null; }

  Object.assign(namespace.api, {
    initializeExternalIntelligencePhase18Definitions,
    registerExternalIntelligenceMarketFusionCapability,
    createExternalIntelligenceCrossDomainMarketSignal,
    validateExternalIntelligenceMarketFusionFeatureAvailability,
    createExternalIntelligenceCompositeMarketHypothesis,
    createExternalIntelligenceMarketFusionPredictionCandidate,
    createExternalIntelligenceMarketFusionPackage,
    persistExternalIntelligenceMarketFusionPackage,
    readBackExternalIntelligenceMarketFusionPackage,
    recordExternalIntelligenceMarketFusionOutcomeEvaluation,
    getExternalIntelligenceCrossDomainMarketSignal,
    getExternalIntelligenceCompositeMarketHypothesis,
    getExternalIntelligenceMarketFusionPredictionCandidate,
    getExternalIntelligenceMarketFusionPackage
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.marketFusion = {
    id: "EXTERNAL-010-MARKET-FUSION",
    version: MODULE_VERSION,
    phase: 18,
    decisions: ["048"],
    status: "Ready",
    signalFamilies: Array.from(SIGNAL_FAMILIES),
    contradictionPreserved: true,
    unknownIndependenceAssumedIndependent: false,
    noFalsePrecision: true,
    abstentionSupported: true,
    futureInformationLeakageBlocked: true,
    predictionEqualsStrategy: false,
    strategyEqualsOrder: false,
    tradingAuthorityGranted: false
  };
})(typeof window !== "undefined" ? window : globalThis);
