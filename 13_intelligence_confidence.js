/* ============================================================
   FILE: 13_intelligence_confidence.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 7: Multi-Factor Confidence and Quality Model
   Architecture Decision: IDE-170-008
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("confidence");
  const REGISTRY_CAPABILITY_ID = "IDE-170-CONFIDENCE-MODEL-REGISTRY";
  const ASSESSMENT_CAPABILITY_ID = "IDE-170-CONFIDENCE-ASSESSMENT";
  const REGISTRY_CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(REGISTRY_CAPABILITY_ID);
  const ASSESSMENT_CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(ASSESSMENT_CAPABILITY_ID);
  const MODEL_ID = "IDE-170-CONFIDENCE-MODEL-DETERMINISTIC";
  const MODEL_VERSION = "1.0.0";
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;

  const MODEL_SCHEMA_ID = "IDE-170-SCHEMA-CONFIDENCE-MODEL";
  const RESULT_SCHEMA_ID = "IDE-170-SCHEMA-CONFIDENCE-RESULT";
  const QUALITY_SCHEMA_ID = "IDE-170-SCHEMA-QUALITY-RESULT";

  if (!(state.confidenceModels instanceof Map)) state.confidenceModels = new Map();
  if (!(state.confidenceResults instanceof Map)) state.confidenceResults = new Map();
  if (!(state.qualityResults instanceof Map)) state.qualityResults = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestConfidenceResultId")) state.latestConfidenceResultId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestQualityResultId")) state.latestQualityResultId = null;

  const FACTOR_NAMES = Object.freeze([
    "evidenceStrength",
    "evidenceCoverage",
    "sourceQuality",
    "sourceIndependence",
    "consistency",
    "ruleReliability",
    "engineReliability",
    "scopeCompleteness"
  ]);

  const PENALTY_NAMES = Object.freeze([
    "missingInformation",
    "contradiction",
    "ambiguity",
    "partialSnapshot",
    "staleness"
  ]);

  const QUALITY_DIMENSIONS = Object.freeze([
    "completeness",
    "consistency",
    "traceability",
    "explainability",
    "reproducibility",
    "freshness",
    "integrity",
    "compatibility"
  ]);

  const DEFAULT_MODEL = Object.freeze({
    modelId: MODEL_ID,
    version: MODEL_VERSION,
    name: "IDE-170 Deterministic Multi-Factor Confidence Model",
    status: "Official",
    supportedResultClasses: ["derived-result", "insight-candidate"],
    factPolicy: "Canonical Fact receives quality assessment, not speculative Confidence score.",
    weights: Object.freeze({
      evidenceStrength: 0.20,
      evidenceCoverage: 0.20,
      sourceQuality: 0.15,
      sourceIndependence: 0.10,
      consistency: 0.15,
      ruleReliability: 0.08,
      engineReliability: 0.05,
      scopeCompleteness: 0.07
    }),
    penaltyDefinitions: Object.freeze({
      missingInformation: Object.freeze({ maximum: 0.20, unit: 0.04 }),
      contradiction: Object.freeze({ maximum: 0.25, unit: 0.125 }),
      ambiguity: Object.freeze({ maximum: 0.15, unit: 0.05 }),
      partialSnapshot: Object.freeze({ maximum: 0.10, unit: 0.10 }),
      staleness: Object.freeze({ maximum: 0.10, unit: 0.10 })
    }),
    factorDefinitions: Object.freeze({
      evidenceStrength: "Evidence directness/strength from governed Evidence records.",
      evidenceCoverage: "Available supporting Evidence divided by available + explicitly missing Evidence.",
      sourceQuality: "Readiness of Source Adapters referenced by Evidence.",
      sourceIndependence: "Independent source lineages represented by supporting Evidence.",
      consistency: "Absence of explicit contradiction indicators in Evidence and Explanation.",
      ruleReliability: "Reliability class of applied governed Rules.",
      engineReliability: "Reliability of applied Reasoning/Learning Engines, excluding self-reported confidence.",
      scopeCompleteness: "Coverage of requested scope relative to explicitly missing Sources and scope limitations."
    }),
    categoryScores: Object.freeze({
      evidenceStrength: Object.freeze({ direct: 1.00, corroborated: 1.00, derived: 0.80, inferred: 0.50, unknown: 0.00 }),
      ruleReliability: Object.freeze({ deterministic: 1.00, "validated heuristic": 0.85, experimental: 0.60, deprecated: 0.25, unknown: 0.40 }),
      engineReliability: Object.freeze({ official: 0.90, active: 0.90, validated: 0.90, experimental: 0.60, deprecated: 0.30, unknown: 0.40 }),
      sourceQuality: Object.freeze({ ready: 1.00, partial: 0.60, unavailable: 0.00, invalid: 0.00, blocked: 0.00, unknown: 0.50 })
    }),
    levelThresholds: Object.freeze({ veryHigh: 0.90, high: 0.75, medium: 0.50, low: 0.25 }),
    caps: Object.freeze({
      partialSnapshot: "High",
      reasoningEngineOnly: "Medium",
      singleInferredEvidence: "Low",
      unverifiedSourceOnly: "Low",
      experimentalRule: "Medium",
      criticalEntityUnresolved: "Not Assessable",
      majorContradiction: "Blocked"
    }),
    interpretationPolicy: Object.freeze({
      base: 0.98,
      canonicalSnapshotTypePreference: 0.94,
      conversationContext: 0.90,
      alternativeIntentPenalty: 0.08,
      ambiguityPenalty: 0.15
    }),
    source: "Architecture Decision 008 / Project Owner approved deterministic v1 weights and penalties"
  });

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(1, number));
  }

  function round(value, digits) {
    const factor = Math.pow(10, Number.isInteger(digits) ? digits : 4);
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }

  function average(values) {
    const usable = internal.asArray(values).map(Number).filter(Number.isFinite);
    return usable.length ? usable.reduce(function sum(total, item) { return total + item; }, 0) / usable.length : null;
  }

  function modelKey(modelId, version) {
    return internal.text(modelId, "") + "@" + internal.text(version, "");
  }

  function normalizeModel(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      modelId: internal.text(source.modelId, ""),
      version: internal.text(source.version, ""),
      name: internal.text(source.name, ""),
      status: internal.text(source.status, "Experimental"),
      supportedResultClasses: internal.unique(source.supportedResultClasses),
      factPolicy: internal.text(source.factPolicy, ""),
      weights: internal.clone(source.weights || {}),
      penaltyDefinitions: internal.clone(source.penaltyDefinitions || {}),
      factorDefinitions: internal.clone(source.factorDefinitions || {}),
      categoryScores: internal.clone(source.categoryScores || {}),
      levelThresholds: internal.clone(source.levelThresholds || {}),
      caps: internal.clone(source.caps || {}),
      interpretationPolicy: internal.clone(source.interpretationPolicy || {}),
      source: internal.text(source.source, "user")
    };
  }

  function validateConfidenceModel(input) {
    const model = normalizeModel(input);
    const checks = [];
    function check(name, passed, detail, severity) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), severity: severity || "High" });
    }
    check("Model ID is present", Boolean(model.modelId), model.modelId, "Critical");
    check("Model Version is SemVer", /^\d+\.\d+\.\d+$/.test(model.version), model.version, "Critical");
    check("All eight Factor weights are present", FACTOR_NAMES.every(function has(name) { return Number.isFinite(Number(model.weights[name])); }), JSON.stringify(model.weights), "Critical");
    const weightTotal = FACTOR_NAMES.reduce(function sum(total, name) { return total + Number(model.weights[name] || 0); }, 0);
    check("Factor weights total 1.0", Math.abs(weightTotal - 1) < 1e-9, weightTotal, "Critical");
    check("All five Penalties are present", PENALTY_NAMES.every(function has(name) { const d = model.penaltyDefinitions[name]; return d && Number.isFinite(Number(d.maximum)) && Number(d.maximum) >= 0; }), JSON.stringify(model.penaltyDefinitions), "Critical");
    check("Confidence caps are defined", Boolean(model.caps.partialSnapshot && model.caps.reasoningEngineOnly && model.caps.singleInferredEvidence && model.caps.unverifiedSourceOnly && model.caps.experimentalRule), JSON.stringify(model.caps), "High");
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return { valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, checks: checks, model: model };
  }

  function registerConfidenceModel(input) {
    const validation = validateConfidenceModel(input);
    if (!validation.valid) {
      return internal.buildResult(false, "CONFIDENCE_MODEL_INVALID", "Invalid", { validation: validation }, { error: { message: "Confidence Model failed validation.", category: "Validation Failure" } });
    }
    const model = internal.deepFreeze(internal.clone(validation.model));
    const key = modelKey(model.modelId, model.version);
    const existing = state.confidenceModels.get(key);
    if (existing) {
      if (internal.stableStringify(existing) !== internal.stableStringify(model)) {
        return internal.buildResult(false, "CONFIDENCE_MODEL_VERSION_CONFLICT", "Blocked", { existing: existing, incoming: model }, { error: { message: "Same Confidence Model version has different content.", category: "Integrity Failure" } });
      }
      return internal.buildResult(true, "CONFIDENCE_MODEL_EXISTS", "Ready", { model: internal.clone(existing) });
    }
    state.confidenceModels.set(key, model);
    internal.touch();
    return internal.buildResult(true, "CONFIDENCE_MODEL_REGISTERED", "Ready", { model: internal.clone(model) });
  }

  function getConfidenceModel(modelId, version) {
    const id = internal.text(modelId, MODEL_ID);
    const requested = internal.text(version, MODEL_VERSION);
    return internal.clone(state.confidenceModels.get(modelKey(id, requested)) || null);
  }

  function listConfidenceModels() {
    return [...state.confidenceModels.values()].map(internal.clone);
  }

  function resultClassOf(target) {
    if (!target || typeof target !== "object") return "unknown";
    if (target.resultKind === "Insight Candidate" || target.insightId) return "insight-candidate";
    if (target.resultKind === "Derived Result" || target.derivedResultId) return "derived-result";
    if (target.resultKind === "Fact" || target.canonicalId || target.resultClass === "fact") return "canonical-fact";
    const insights = internal.asArray(target.insightCandidates || target.insights);
    const derived = internal.asArray(target.derivedResults || target.derived);
    const facts = internal.asArray(target.factResults || target.facts);
    if (insights.length) return "insight-candidate";
    if (derived.length) return "derived-result";
    if (facts.length) return "canonical-fact";
    return "query-result";
  }

  function collectEvidence(target) {
    const evidence = [];
    const seen = new Set();

    function evidenceKey(item) {
      if (!item || typeof item !== "object") return "";
      if (item.evidenceId) return "evidenceId:" + String(item.evidenceId);
      return [
        item.sourceId || "",
        item.sourceType || "",
        item.adapterId || "",
        item.canonicalId || "",
        item.relationshipId || "",
        item.strength || ""
      ].join("|");
    }

    function pushUnique(item) {
      if (!item) return;
      const key = evidenceKey(item);
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      evidence.push(item);
    }

    internal.asArray(target && target.evidence).forEach(pushUnique);
    internal.asArray(target && target.insightCandidates || target && target.insights).forEach(function each(item) {
      internal.asArray(item && item.evidence).forEach(pushUnique);
    });
    internal.asArray(target && target.derivedResults || target && target.derived).forEach(function each(item) {
      internal.asArray(item && item.evidence).forEach(pushUnique);
    });
    return evidence;
  }

  function collectMissing(target) {
    const values = [];
    const explanation = target && target.explanation || {};
    values.push.apply(values, internal.asArray(explanation.missingInformation));
    values.push.apply(values, internal.asArray(explanation.missingEvidence));
    internal.asArray(target && target.insightCandidates || target && target.insights).forEach(function each(item) {
      values.push.apply(values, internal.asArray(item && item.explanation && item.explanation.missingEvidence));
      values.push.apply(values, internal.asArray(item && item.explanation && item.explanation.limitations));
    });
    return internal.unique(values);
  }

  function collectLimitations(target) {
    const values = [];
    const explanation = target && target.explanation || {};
    values.push.apply(values, internal.asArray(explanation.limitations));
    values.push.apply(values, collectMissing(target));
    internal.asArray(target && target.insightCandidates || target && target.insights).forEach(function each(item) {
      values.push.apply(values, internal.asArray(item && item.explanation && item.explanation.limitations));
    });
    return internal.unique(values);
  }

  function evidenceStrengthScore(evidence, model) {
    const map = model.categoryScores.evidenceStrength || {};
    const values = evidence.map(function score(item) {
      return Number(map[String(item && item.strength || "unknown").toLowerCase()]);
    }).filter(Number.isFinite);
    return values.length ? average(values) : null;
  }

  function evidenceCoverageScore(evidence, missing) {
    const available = evidence.length;
    const absent = missing.length;
    if (!available && !absent) return null;
    return clamp01(available / Math.max(1, available + absent));
  }

  function sourceQualityScore(evidence, model) {
    if (!evidence.length) return null;
    const adapters = typeof namespace.getSourceAdapters === "function" ? namespace.getSourceAdapters() : [];
    const adapterMap = new Map(internal.asArray(adapters).map(function map(item) { return [item.adapterId, item]; }));
    const scoreMap = model.categoryScores.sourceQuality || {};
    const values = evidence.map(function score(item) {
      const adapter = adapterMap.get(item && item.adapterId);
      const status = String(adapter && adapter.status || item && item.sourceStatus || "unknown").toLowerCase();
      const score = Number(scoreMap[status]);
      return Number.isFinite(score) ? score : Number(scoreMap.unknown || 0.5);
    });
    return average(values);
  }

  function sourceIndependenceScore(evidence) {
    if (!evidence.length) return null;
    const lineages = evidence.map(function lineage(item) {
      return [item && item.sourceType || "", item && item.sourceId || "", item && item.adapterId || ""].join("|");
    }).filter(Boolean);
    const uniqueCount = new Set(lineages).size;
    if (evidence.length === 1) return 0.5;
    return clamp01(uniqueCount / evidence.length);
  }

  function contradictionSignals(target, options) {
    const explicit = internal.asArray(options && options.contradictions);
    const limitations = collectLimitations(target);
    const textual = limitations.filter(function match(item) { return /contradict|矛盾|conflict|反証/i.test(String(item)); });
    return internal.unique(explicit.concat(textual));
  }

  function consistencyScore(target, options) {
    const contradictions = contradictionSignals(target, options);
    if (!contradictions.length) return 1;
    if (options && options.majorContradiction === true) return 0;
    return clamp01(1 - Math.min(0.75, contradictions.length * 0.25));
  }

  function appliedRuleIds(target) {
    const ids = [];
    const explanation = target && target.explanation || {};
    ids.push.apply(ids, internal.asArray(explanation.rulesApplied));
    internal.asArray(target && target.derivedResults || target && target.derived).forEach(function each(item) {
      if (item && item.ruleId) ids.push(item.ruleId);
    });
    internal.asArray(target && target.insightCandidates || target && target.insights).forEach(function each(item) {
      ids.push.apply(ids, internal.asArray(item && item.generatedBy && item.generatedBy.ruleIds));
    });
    return internal.unique(ids);
  }

  function ruleReliabilityScore(target, options, model) {
    const ids = appliedRuleIds(target);
    const classifications = internal.asArray(options && options.ruleReliabilityClasses);
    if (!ids.length && !classifications.length) return null;
    const map = model.categoryScores.ruleReliability || {};
    const values = (classifications.length ? classifications : ids.map(function infer() { return "Deterministic"; })).map(function score(value) {
      const key = String(value || "Unknown").toLowerCase();
      const score = Number(map[key]);
      return Number.isFinite(score) ? score : Number(map.unknown || 0.4);
    });
    return average(values);
  }

  function engineReliabilityScore(target, options, model) {
    const ids = [];
    const explanation = target && target.explanation || {};
    ids.push.apply(ids, internal.asArray(explanation.enginesUsed));
    internal.asArray(target && target.insightCandidates || target && target.insights).forEach(function each(item) {
      ids.push.apply(ids, internal.asArray(item && item.generatedBy && item.generatedBy.engineIds));
    });
    const uniqueIds = internal.unique(ids).filter(function exclude(id) { return id && id !== "IDE-170-QUERY-ENGINE"; });
    if (!uniqueIds.length) return null;
    const explicit = internal.isPlainObject(options && options.engineReliability) ? options.engineReliability : {};
    const map = model.categoryScores.engineReliability || {};
    const values = uniqueIds.map(function score(id) {
      if (Number.isFinite(Number(explicit[id]))) return clamp01(explicit[id]);
      const capability = typeof namespace.getCapability === "function" ? namespace.getCapability(id) : null;
      const status = String(capability && capability.status || "unknown").toLowerCase();
      const value = Number(map[status]);
      return Number.isFinite(value) ? value : Number(map.unknown || 0.4);
    });
    return average(values);
  }

  function scopeCoverage(target, options) {
    const coverage = options && options.sourceCoverage || options && options.context && options.context.understanding && options.context.understanding.scope && options.context.understanding.scope.sourceCoverage || null;
    if (coverage) {
      const statuses = internal.asArray(coverage.adapterStatus);
      if (statuses.length) {
        const ready = statuses.filter(function count(item) { return item && item.status === "Ready"; }).length;
        return clamp01(ready / statuses.length);
      }
      if (Number.isFinite(Number(coverage.canonicalCompleteness))) return clamp01(Number(coverage.canonicalCompleteness));
    }
    const limitations = collectLimitations(target);
    if (limitations.some(function match(item) { return /scope|source adapter|snapshot|unavailable|incomplete|不足|欠落/i.test(String(item)); })) return 0.75;
    return 1;
  }

  function buildFactor(value, applicable, detail) {
    return { value: applicable && Number.isFinite(Number(value)) ? round(clamp01(value), 4) : null, applicable: applicable === true, detail: internal.text(detail, "") };
  }

  function penaltyValue(name, count, model) {
    const definition = model.penaltyDefinitions[name] || { maximum: 0, unit: 0 };
    return round(Math.min(Number(definition.maximum || 0), Math.max(0, Number(count || 0)) * Number(definition.unit || 0)), 4);
  }

  function confidenceLevel(score) {
    if (!Number.isFinite(Number(score))) return "Not Assessable";
    const value = clamp01(score);
    if (value >= 0.90) return "Very High";
    if (value >= 0.75) return "High";
    if (value >= 0.50) return "Medium";
    if (value >= 0.25) return "Low";
    return value > 0 ? "Very Low" : "Very Low";
  }

  function capScoreForLevel(level) {
    if (level === "High") return 0.8999;
    if (level === "Medium") return 0.7499;
    if (level === "Low") return 0.4999;
    if (level === "Very Low") return 0.2499;
    return null;
  }

  function determineCaps(target, options, evidence, model) {
    const caps = [];
    const limitations = collectLimitations(target);
    const missing = collectMissing(target);
    const strengths = evidence.map(function map(item) { return String(item && item.strength || "unknown").toLowerCase(); });
    const rules = internal.asArray(options && options.ruleReliabilityClasses).map(function map(item) { return String(item || "").toLowerCase(); });
    const engines = internal.asArray(options && options.reasoningEngineIds);
    const partialSnapshot = Boolean(options && options.partialSnapshot === true) || limitations.some(function match(item) { return /partial snapshot|source adapter is not ready|snapshot.*partial/i.test(String(item)); });
    if (partialSnapshot) caps.push({ code: "PARTIAL_SNAPSHOT", level: model.caps.partialSnapshot, reason: "Partial Snapshot prohibits Very High Confidence." });
    if (evidence.length === 1 && strengths[0] === "inferred") caps.push({ code: "SINGLE_INFERRED_EVIDENCE", level: model.caps.singleInferredEvidence, reason: "Single inferred Evidence is capped at Low." });
    if (options && options.unverifiedSourceOnly === true) caps.push({ code: "UNVERIFIED_SOURCE_ONLY", level: model.caps.unverifiedSourceOnly, reason: "Unverified Source-only support is capped at Low." });
    if (rules.includes("experimental")) caps.push({ code: "EXPERIMENTAL_RULE", level: model.caps.experimentalRule, reason: "Experimental Rule is capped at Medium." });
    if (options && options.reasoningEngineOnly === true || engines.length && !evidence.length) caps.push({ code: "REASONING_ENGINE_ONLY", level: model.caps.reasoningEngineOnly, reason: "Reasoning Engine-only output is capped at Medium." });
    if (options && options.criticalEntityUnresolved === true) caps.push({ code: "CRITICAL_ENTITY_UNRESOLVED", level: "Not Assessable", reason: "Critical Entity is unresolved." });
    if (options && options.majorContradiction === true) caps.push({ code: "MAJOR_CONTRADICTION", level: "Blocked", reason: "Major contradictory Evidence requires blocking." });
    if (missing.length && !partialSnapshot && options && options.forcePartialSnapshotCap === true) caps.push({ code: "PARTIAL_SCOPE", level: "High", reason: "Explicit missing scope prevents Very High Confidence." });
    return caps;
  }

  function weightedScore(factors, model) {
    let numerator = 0;
    let denominator = 0;
    FACTOR_NAMES.forEach(function each(name) {
      const factor = factors[name];
      if (!factor || factor.applicable !== true || !Number.isFinite(Number(factor.value))) return;
      const weight = Number(model.weights[name] || 0);
      numerator += factor.value * weight;
      denominator += weight;
    });
    return denominator > 0 ? clamp01(numerator / denominator) : null;
  }

  function assessInterpretationConfidence(query) {
    if (!query || typeof query !== "object" || !query.interpretation) {
      return { score: null, level: "Not Assessable", modelId: MODEL_ID, modelVersion: MODEL_VERSION, explanation: "Typed Query interpretation metadata is unavailable." };
    }
    const policy = DEFAULT_MODEL.interpretationPolicy;
    const target = query.target || null;
    let score = Number(policy.base);
    const source = String(target && target.resolutionSource || "");
    if (source === "canonical-snapshot-type-preference") score = Math.min(score, Number(policy.canonicalSnapshotTypePreference));
    if (source === "conversation-context") score = Math.min(score, Number(policy.conversationContext));
    score -= internal.asArray(query.interpretation.alternativeIntents).length * Number(policy.alternativeIntentPenalty);
    score -= internal.asArray(query.interpretation.ambiguities).length * Number(policy.ambiguityPenalty);
    score = round(clamp01(score), 4);
    return {
      score: score,
      level: confidenceLevel(score),
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      type: "Interpretation Confidence",
      factors: {
        intentResolved: query.interpretation.status === "Resolved",
        targetResolutionSource: source || "not-required",
        alternativeIntentCount: internal.asArray(query.interpretation.alternativeIntents).length,
        ambiguityCount: internal.asArray(query.interpretation.ambiguities).length
      },
      explanation: "Interpretation Confidence is assessed independently from Insight Confidence."
    };
  }

  function assessConfidence(target, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const model = getConfidenceModel(settings.modelId || MODEL_ID, settings.modelVersion || MODEL_VERSION) || internal.clone(DEFAULT_MODEL);
    const resultClass = internal.text(settings.resultClass, resultClassOf(target));
    const evidence = internal.asArray(settings.evidence).length ? internal.asArray(settings.evidence) : collectEvidence(target);
    const missing = internal.asArray(settings.missingInformation).length ? internal.unique(settings.missingInformation) : collectMissing(target);
    const limitations = collectLimitations(target);
    const contradictions = contradictionSignals(target, settings);
    const ambiguities = internal.unique(internal.asArray(settings.ambiguities).concat(internal.asArray(settings.query && settings.query.interpretation && settings.query.interpretation.ambiguities)));
    const partialSnapshot = Boolean(settings.partialSnapshot === true) || limitations.some(function match(item) { return /partial snapshot|source adapter is not ready|unavailable in the current canonical snapshot|incomplete/i.test(String(item)); });
    const stale = settings.stale === true;

    const factors = {
      evidenceStrength: buildFactor(evidenceStrengthScore(evidence, model), evidence.length > 0, "Governed Evidence strength classification."),
      evidenceCoverage: buildFactor(evidenceCoverageScore(evidence, missing), evidence.length > 0 || missing.length > 0, "Available Evidence versus explicitly missing Evidence."),
      sourceQuality: buildFactor(sourceQualityScore(evidence, model), evidence.length > 0, "Source Adapter readiness of Evidence sources."),
      sourceIndependence: buildFactor(sourceIndependenceScore(evidence), evidence.length > 0, "Independent source lineage ratio."),
      consistency: buildFactor(consistencyScore(target, settings), evidence.length > 0 || contradictions.length > 0, "Explicit contradiction assessment."),
      ruleReliability: buildFactor(ruleReliabilityScore(target, settings, model), appliedRuleIds(target).length > 0 || internal.asArray(settings.ruleReliabilityClasses).length > 0, "Governed Rule reliability classification."),
      engineReliability: buildFactor(engineReliabilityScore(target, settings, model), internal.asArray(settings.reasoningEngineIds).length > 0 || internal.asArray(target && target.explanation && target.explanation.enginesUsed).some(function id(value) { return value && value !== "IDE-170-QUERY-ENGINE"; }), "Reasoning/Learning Engine reliability; self-reported confidence is ignored."),
      scopeCompleteness: buildFactor(scopeCoverage(target, settings), true, "Requested analysis scope and Source coverage.")
    };

    const penalties = {
      missingInformation: penaltyValue("missingInformation", missing.length, model),
      contradiction: penaltyValue("contradiction", contradictions.length, model),
      ambiguity: penaltyValue("ambiguity", ambiguities.length, model),
      partialSnapshot: penaltyValue("partialSnapshot", partialSnapshot ? 1 : 0, model),
      staleness: penaltyValue("staleness", stale ? 1 : 0, model)
    };

    const penaltyTotal = PENALTY_NAMES.reduce(function sum(total, name) { return total + Number(penalties[name] || 0); }, 0);
    const caps = determineCaps(target, settings, evidence, model);
    const blockedCap = caps.find(function find(cap) { return cap.level === "Blocked"; });
    const notAssessableCap = caps.find(function find(cap) { return cap.level === "Not Assessable"; });

    let rawScore = weightedScore(factors, model);
    let finalScore = rawScore == null ? null : clamp01(rawScore - penaltyTotal);
    let level = finalScore == null ? "Not Assessable" : confidenceLevel(finalScore);

    if (resultClass === "canonical-fact") {
      rawScore = null;
      finalScore = null;
      level = "Not Assessable";
    }
    if (notAssessableCap) {
      finalScore = null;
      level = "Not Assessable";
    }
    if (blockedCap) {
      finalScore = null;
      level = "Not Assessable";
    }

    caps.forEach(function apply(cap) {
      const capScore = capScoreForLevel(cap.level);
      if (capScore != null && finalScore != null && finalScore > capScore) {
        finalScore = capScore;
        level = confidenceLevel(finalScore);
      }
    });

    const factorSummary = FACTOR_NAMES.map(function map(name) {
      const factor = factors[name];
      return name + "=" + (factor.applicable ? factor.value : "N/A");
    }).join(", ");
    const penaltySummary = PENALTY_NAMES.filter(function filter(name) { return penalties[name] > 0; }).map(function map(name) { return name + "=-" + penalties[name]; }).join(", ") || "none";

    const result = {
      confidenceId: internal.nextId("IDE-170-CONFIDENCE"),
      schemaVersion: VERSION_MANIFEST.getSchemaVersion(RESULT_SCHEMA_ID),
      modelId: model.modelId,
      modelVersion: model.version,
      resultClass: resultClass,
      assessmentMode: resultClass === "canonical-fact" ? "Fact Quality - No Speculative Score" : "Multi-Factor Confidence",
      score: finalScore == null ? null : round(finalScore, 4),
      rawScore: rawScore == null ? null : round(rawScore, 4),
      level: level,
      status: blockedCap ? "Blocked" : finalScore == null ? "Not Assessable" : "Assessed",
      factors: factors,
      weights: internal.clone(model.weights),
      penalties: penalties,
      penaltyTotal: round(penaltyTotal, 4),
      caps: caps,
      limitations: internal.unique(limitations.concat(missing)),
      explanation: resultClass === "canonical-fact"
        ? "Canonical Fact is not assigned a speculative Confidence score. Quality, Source, Integrity and Traceability are validated independently."
        : "Applicable Factors were re-normalized by weight. " + factorSummary + ". Penalties: " + penaltySummary + ".",
      selfReportedEngineConfidenceUsed: false,
      assessedAt: internal.nowIso()
    };

    const frozen = internal.deepFreeze(internal.clone(result));
    state.confidenceResults.set(result.confidenceId, frozen);
    state.latestConfidenceResultId = result.confidenceId;
    internal.touch();
    return internal.clone(frozen);
  }

  function traceabilityScore(target) {
    const facts = internal.asArray(target && target.factResults || target && target.facts);
    const derived = internal.asArray(target && target.derivedResults || target && target.derived);
    const insights = internal.asArray(target && target.insightCandidates || target && target.insights);
    const total = facts.length + derived.length + insights.length;
    if (!total) return 1;
    let traced = 0;
    facts.forEach(function each(item) { if (item && (item.sourceReference || item.evidenceReference || item.snapshotReference)) traced += 1; });
    derived.forEach(function each(item) { if (item && (internal.asArray(item.evidence).length || item.ruleId)) traced += 1; });
    insights.forEach(function each(item) { if (item && (internal.asArray(item.evidence).length || item.explanation && internal.asArray(item.explanation.missingEvidence).length)) traced += 1; });
    return clamp01(traced / total);
  }

  function explainabilityScore(target) {
    const explanation = target && target.explanation;
    if (!explanation) return 0;
    const checks = [
      Boolean(explanation.summary),
      Array.isArray(explanation.limitations),
      Array.isArray(explanation.missingInformation),
      Array.isArray(explanation.rulesApplied),
      Array.isArray(explanation.enginesUsed)
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  function reproducibilityScore(target, options) {
    const snapshot = target && target.snapshotReference || {};
    const hasSnapshot = Boolean(snapshot.canonicalSnapshotId || snapshot.repositorySnapshotId || snapshot.evidenceGraphId || snapshot.understandingId);
    const hasModel = Boolean(target && target.confidence && target.confidence.modelId && target.confidence.modelVersion);
    const deterministic = !(options && options.nonDeterministic === true);
    return [hasSnapshot, hasModel, deterministic].filter(Boolean).length / 3;
  }

  function compatibilityScore(target) {
    const schemaId = target && target.schemaVersion;
    const artifact = target && target.artifactVersion;
    return schemaId && artifact ? 1 : 0.75;
  }

  function assessQuality(target, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const confidence = settings.confidence || target && target.confidence || null;
    const missing = collectMissing(target);
    const limitations = collectLimitations(target);
    const completeness = clamp01(1 - Math.min(1, missing.length * 0.1));
    const consistency = confidence && confidence.factors && confidence.factors.consistency && confidence.factors.consistency.applicable
      ? confidence.factors.consistency.value
      : consistencyScore(target, settings);
    const freshness = settings.stale === true ? 0.5 : 1;
    const dimensions = {
      completeness: round(completeness, 4),
      consistency: round(consistency == null ? 1 : consistency, 4),
      traceability: round(traceabilityScore(target), 4),
      explainability: round(explainabilityScore(target), 4),
      reproducibility: round(reproducibilityScore(target, settings), 4),
      freshness: round(freshness, 4),
      integrity: settings.integrityValid === false ? 0 : 1,
      compatibility: round(compatibilityScore(target), 4)
    };
    const overall = round(average(QUALITY_DIMENSIONS.map(function map(name) { return dimensions[name]; })) || 0, 4);
    const result = {
      qualityId: internal.nextId("IDE-170-QUALITY"),
      schemaVersion: VERSION_MANIFEST.getSchemaVersion(QUALITY_SCHEMA_ID),
      dimensions: dimensions,
      overall: overall,
      limitations: internal.unique(limitations),
      assessedAt: internal.nowIso()
    };
    const frozen = internal.deepFreeze(internal.clone(result));
    state.qualityResults.set(result.qualityId, frozen);
    state.latestQualityResultId = result.qualityId;
    internal.touch();
    return internal.clone(frozen);
  }

  function validateConfidenceResult(input) {
    const result = input && typeof input === "object" ? input : {};
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) }); }
    check("Confidence Model exists", Boolean(getConfidenceModel(result.modelId, result.modelVersion)), result.modelId + "@" + result.modelVersion);
    check("Result Class exists", Boolean(result.resultClass), result.resultClass);
    check("Eight Factors are recorded", FACTOR_NAMES.every(function every(name) { return result.factors && Object.prototype.hasOwnProperty.call(result.factors, name); }), result.factors && Object.keys(result.factors).length);
    check("Five Penalties are recorded", PENALTY_NAMES.every(function every(name) { return result.penalties && Number.isFinite(Number(result.penalties[name])); }), result.penalties && JSON.stringify(result.penalties));
    check("Caps are recorded", Array.isArray(result.caps), result.caps && result.caps.length);
    check("Engine self-reported Confidence is not used", result.selfReportedEngineConfidenceUsed === false, result.selfReportedEngineConfidenceUsed);
    if (result.resultClass === "canonical-fact") {
      check("Canonical Fact has no speculative Score", result.score == null && result.level === "Not Assessable", result.score);
    } else if (result.status !== "Blocked" && result.level !== "Not Assessable") {
      check("Score is within 0..1", Number.isFinite(Number(result.score)) && Number(result.score) >= 0 && Number(result.score) <= 1, result.score);
      check("Score and Level agree", confidenceLevel(result.score) === result.level, result.level + "/" + result.score);
    }
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return { valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, checks: checks, validatedAt: internal.nowIso() };
  }

  function getConfidenceStatus() {
    return {
      id: "IDE-170-CONFIDENCE-STATUS",
      version: MODULE_VERSION,
      registryCapabilityVersion: REGISTRY_CAPABILITY_VERSION,
      assessmentCapabilityVersion: ASSESSMENT_CAPABILITY_VERSION,
      status: getConfidenceModel(MODEL_ID, MODEL_VERSION) ? "Ready" : "Loaded",
      ready: Boolean(getConfidenceModel(MODEL_ID, MODEL_VERSION)),
      modelCount: state.confidenceModels.size,
      confidenceResultCount: state.confidenceResults.size,
      qualityResultCount: state.qualityResults.size,
      latestConfidenceResultId: state.latestConfidenceResultId,
      latestQualityResultId: state.latestQualityResultId,
      defaultModelId: MODEL_ID,
      defaultModelVersion: MODEL_VERSION,
      factorCount: FACTOR_NAMES.length,
      penaltyCount: PENALTY_NAMES.length,
      qualityDimensionCount: QUALITY_DIMENSIONS.length,
      engineSelfReportedConfidenceAllowed: false
    };
  }

  function registerSchemas() {
    const definitions = [
      { id: MODEL_SCHEMA_ID, name: "Confidence Model", required: ["modelId", "version", "weights", "penaltyDefinitions", "caps"] },
      { id: RESULT_SCHEMA_ID, name: "Confidence Result", required: ["confidenceId", "modelId", "modelVersion", "resultClass", "level", "factors", "penalties", "caps", "assessedAt"] },
      { id: QUALITY_SCHEMA_ID, name: "Quality Result", required: ["qualityId", "dimensions", "overall", "assessedAt"] }
    ];
    return definitions.map(function register(definition) {
      const version = VERSION_MANIFEST.getSchemaVersion(definition.id);
      const existing = namespace.getSchema && namespace.getSchema(definition.id);
      if (existing && existing.version === version) return { schemaId: definition.id, registered: true, existing: true };
      if (existing && internal.removeSchemaForValidation) internal.removeSchemaForValidation(definition.id);
      const properties = {};
      definition.required.forEach(function each(name) {
        properties[name] = ["weights", "penaltyDefinitions", "caps", "factors", "penalties", "dimensions"].includes(name) ? { type: name === "caps" ? "array" : "object" } : name === "overall" ? { type: "number" } : { type: "string" };
      });
      const result = namespace.registerSchema({ schemaId: definition.id, name: definition.name, version: version, type: "object", required: definition.required, properties: properties, additionalProperties: true, owner: "IDE-170", source: "Architecture Decision 008" });
      return { schemaId: definition.id, registered: result.ok === true, code: result.code };
    });
  }

  function registerCapabilities() {
    const definitions = [
      {
        capabilityId: REGISTRY_CAPABILITY_ID,
        name: "Confidence Model Registry",
        version: REGISTRY_CAPABILITY_VERSION,
        type: "Registry",
        dependencies: [{ capabilityId: "IDE-170-CORE", minimumVersion: MINIMUM_VERSION, optional: false }],
        schemas: [MODEL_SCHEMA_ID],
        provides: ["Versioned Confidence Model Registry", "Weight Definition", "Penalty Definition", "Confidence Cap Definition"]
      },
      {
        capabilityId: ASSESSMENT_CAPABILITY_ID,
        name: "Multi-Factor Confidence Assessment",
        version: ASSESSMENT_CAPABILITY_VERSION,
        type: "Validation",
        dependencies: [
          { capabilityId: REGISTRY_CAPABILITY_ID, minimumVersion: MINIMUM_VERSION, optional: false },
          { capabilityId: "IDE-170-EVIDENCE-GRAPH", minimumVersion: MINIMUM_VERSION, optional: false }
        ],
        schemas: [RESULT_SCHEMA_ID, QUALITY_SCHEMA_ID],
        provides: ["Multi-Factor Confidence", "Penalty Application", "Confidence Cap", "Interpretation Confidence", "Quality Assessment"]
      }
    ];
    return definitions.map(function register(definition) {
      const existing = namespace.getCapability && namespace.getCapability(definition.capabilityId);
      if (existing && existing.version === definition.version) return { capabilityId: definition.capabilityId, registered: true, existing: true };
      if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(definition.capabilityId);
      const result = namespace.registerCapability(Object.assign({ status: "Active", owner: "IDE-170", source: "Architecture Decision 008" }, definition));
      return { capabilityId: definition.capabilityId, registered: result.ok === true, code: result.code };
    });
  }

  function initializeConfidence() {
    const schemas = registerSchemas();
    const capabilities = registerCapabilities();
    const model = registerConfidenceModel(DEFAULT_MODEL);
    const ready = schemas.every(function every(item) { return item.registered; }) && capabilities.every(function every(item) { return item.registered; }) && model.ok === true;
    namespace.modules.confidence.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "CONFIDENCE_INITIALIZED" : "CONFIDENCE_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { schemas: schemas, capabilities: capabilities, model: model.data && model.data.model });
  }

  Object.assign(namespace.api, {
    initializeConfidence: initializeConfidence,
    registerConfidenceModel: registerConfidenceModel,
    validateConfidenceModel: validateConfidenceModel,
    getConfidenceModel: getConfidenceModel,
    listConfidenceModels: listConfidenceModels,
    assessInterpretationConfidence: assessInterpretationConfidence,
    assessConfidence: assessConfidence,
    assessQuality: assessQuality,
    validateConfidenceResult: validateConfidenceResult,
    getConfidenceStatus: getConfidenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.confidence = {
    id: ASSESSMENT_CAPABILITY_ID,
    version: MODULE_VERSION,
    registryCapabilityVersion: REGISTRY_CAPABILITY_VERSION,
    assessmentCapabilityVersion: ASSESSMENT_CAPABILITY_VERSION,
    status: "Loaded",
    multiFactor: true,
    independentInterpretationConfidence: true,
    penaltyModel: true,
    confidenceCaps: true,
    qualityDimensions: QUALITY_DIMENSIONS.length,
    engineSelfReportedConfidenceAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
