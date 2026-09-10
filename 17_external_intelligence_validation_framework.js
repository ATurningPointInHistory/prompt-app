/* ============================================================
   FILE: 17_external_intelligence_validation_framework.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.14.0
   Phase 15: Multi-Layer Validation Framework
   Primary Decision: 044
   Supporting Decision: 054
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 validation framework blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("validationFramework");

  const DIMENSIONS = Object.freeze([
    "STRUCTURAL", "SEMANTIC", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE",
    "POLICY", "SECURITY", "FRESHNESS", "COVERAGE", "CONSISTENCY", "CALIBRATION",
    "OUTCOME", "INTEGRATION"
  ]);
  const VALIDATION_STATES = Object.freeze([
    "NOT_VALIDATED", "VALIDATING", "PASS", "PASS_WITH_WARNINGS", "PARTIAL",
    "DEGRADED", "FAIL", "BLOCKED", "INCONCLUSIVE", "NOT_APPLICABLE", "UNKNOWN"
  ]);
  const SEVERITIES = Object.freeze(["INFO", "WARNING", "ERROR", "CRITICAL"]);
  const PURPOSES = Object.freeze([
    "RESEARCH_USE", "NAVIGATION_USE", "PREDICTION_USE", "BACKTEST_USE",
    "EMERGENCY_USE", "TRADING_CANDIDATE_USE", "KNOWLEDGE_CANDIDATE_USE", "AUDIT_USE"
  ]);
  const FAILURE_STATES = new Set(["FAIL", "BLOCKED"]);
  const WARNING_STATES = new Set(["PASS_WITH_WARNINGS", "PARTIAL", "DEGRADED", "INCONCLUSIVE", "UNKNOWN"]);

  [
    "validationSuites", "validationSuiteVersions", "goldenValidationCases", "validationProfiles",
    "validationEvidenceRecords", "validationReleaseGates", "validationRuntimeHealthRecords",
    "validationHistoricalReplayRecords", "validationDifferentialRecords"
  ].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });
  if (!state.validationPersistence || typeof state.validationPersistence !== "object") {
    state.validationPersistence = { adapter: null, adapterId: null, lastReadbackAt: null };
  }

  const DEFAULT_SUITE_DEFINITIONS = Object.freeze([
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-RESEARCH",
      validationSuiteVersion: "1.0.0",
      purpose: "RESEARCH_USE",
      requiredDimensions: ["STRUCTURAL", "SEMANTIC", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE", "POLICY", "SECURITY", "FRESHNESS", "COVERAGE"],
      criticalDimensions: ["STRUCTURAL", "SECURITY", "POLICY"],
      description: "Research permits explicit uncertainty/partial coverage but blocks structural, security, or policy critical failures."
    },
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-NAVIGATION",
      validationSuiteVersion: "1.0.0",
      purpose: "NAVIGATION_USE",
      requiredDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "TEMPORAL", "POLICY", "SECURITY", "FRESHNESS", "COVERAGE", "INTEGRATION"],
      criticalDimensions: ["STRUCTURAL", "REFERENCE", "SECURITY", "POLICY", "INTEGRATION"],
      description: "Navigation requires valid references/integration while preserving partial coverage semantics."
    },
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-PREDICTION",
      validationSuiteVersion: "1.0.0",
      purpose: "PREDICTION_USE",
      requiredDimensions: ["STRUCTURAL", "SEMANTIC", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE", "POLICY", "SECURITY", "FRESHNESS", "COVERAGE", "CALIBRATION"],
      criticalDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "TEMPORAL", "SECURITY", "POLICY"],
      description: "Prediction requires lineage and temporal integrity; probability quality remains separate from truth authority."
    },
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-BACKTEST",
      validationSuiteVersion: "1.0.0",
      purpose: "BACKTEST_USE",
      requiredDimensions: ["STRUCTURAL", "SEMANTIC", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE", "POLICY", "SECURITY", "COVERAGE", "INTEGRATION"],
      criticalDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "TEMPORAL", "SECURITY", "POLICY", "INTEGRATION"],
      description: "Backtest treats look-ahead/future-information contamination as critical."
    },
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-EMERGENCY",
      validationSuiteVersion: "1.0.0",
      purpose: "EMERGENCY_USE",
      requiredDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE", "POLICY", "SECURITY", "FRESHNESS", "COVERAGE", "INTEGRATION"],
      criticalDimensions: ["STRUCTURAL", "TEMPORAL", "SECURITY", "POLICY", "FRESHNESS", "INTEGRATION"],
      description: "Emergency use requires current/fresh and security-valid information without creating new authority."
    },
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-TRADING-CANDIDATE",
      validationSuiteVersion: "1.0.0",
      purpose: "TRADING_CANDIDATE_USE",
      requiredDimensions: ["STRUCTURAL", "SEMANTIC", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE", "POLICY", "SECURITY", "FRESHNESS", "COVERAGE", "CALIBRATION", "INTEGRATION"],
      criticalDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "TEMPORAL", "POLICY", "SECURITY", "FRESHNESS", "INTEGRATION"],
      description: "Trading candidate validation never grants FINANCE or execution authority."
    },
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-KNOWLEDGE-CANDIDATE",
      validationSuiteVersion: "1.0.0",
      purpose: "KNOWLEDGE_CANDIDATE_USE",
      requiredDimensions: ["STRUCTURAL", "SEMANTIC", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE", "POLICY", "SECURITY", "FRESHNESS", "COVERAGE", "INTEGRATION"],
      criticalDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "POLICY", "SECURITY", "INTEGRATION"],
      description: "Knowledge candidate validation does not equal canonical Knowledge promotion."
    },
    {
      validationSuiteId: "EXTERNAL-010-VALIDATION-SUITE-AUDIT",
      validationSuiteVersion: "1.0.0",
      purpose: "AUDIT_USE",
      requiredDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "TEMPORAL", "EVIDENCE", "SECURITY", "INTEGRATION"],
      criticalDimensions: ["STRUCTURAL", "REFERENCE", "LINEAGE", "SECURITY", "INTEGRATION"],
      description: "Audit use emphasizes traceability and evidence integrity."
    }
  ]);

  const DEFAULT_GOLDEN_CASES = Object.freeze([
    { goldenCaseId: "EXTERNAL-010-GOLDEN-VALID-BASELINE", title: "Valid multi-layer baseline", category: "POSITIVE", expectedState: "PASS" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-MALICIOUS-CROSS-ORIGIN", title: "Malicious cross-origin request", category: "GATEWAY_SECURITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-MISSING-SESSION", title: "Missing gateway session", category: "GATEWAY_SECURITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-EXPIRED-SESSION", title: "Expired gateway session", category: "GATEWAY_SECURITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-REVOKED-SESSION", title: "Revoked gateway session", category: "GATEWAY_SECURITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-REPLAYED-REQUEST", title: "Replayed gateway request", category: "GATEWAY_SECURITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-OLD-SESSION-AFTER-RESTART", title: "Old session after Gateway restart", category: "GATEWAY_SECURITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-VALID-SESSION-NO-AUTHORITY", title: "Valid session without operation authority", category: "AUTHORITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-SESSION-TOKEN-LOGGED", title: "Session token accidentally logged", category: "SECRET_REDACTION", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-SENSITIVE-HEALTH", title: "Sensitive health response candidate", category: "GATEWAY_SECURITY", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-LOOK-AHEAD", title: "Historical look-ahead contamination", category: "TEMPORAL", expectedState: "BLOCKED" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-AMBIGUOUS-ENTITY", title: "Ambiguous entity remains explicit", category: "AMBIGUITY", expectedState: "PASS_WITH_WARNINGS" },
    { goldenCaseId: "EXTERNAL-010-GOLDEN-PARTIAL-COVERAGE", title: "Partial coverage is not evidence of absence", category: "COVERAGE", expectedState: "PASS_WITH_WARNINGS" }
  ]);

  function text(value, fallback) { return internal.text(value, fallback == null ? "" : fallback); }
  function unique(values) { return internal.unique(Array.isArray(values) ? values : []); }
  function clone(value) { return internal.clone(value); }
  function nowIso() { return internal.nowIso(); }
  function normalizeEnum(value, allowed, fallback) {
    const candidate = text(value, fallback || "").toUpperCase();
    return allowed.indexOf(candidate) >= 0 ? candidate : fallback;
  }
  function normalizeIso(value) {
    const candidate = text(value, "");
    if (!candidate) return null;
    const time = Date.parse(candidate);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  }
  function suiteKey(id, version) { return text(id, "") + "@" + text(version, ""); }
  function scoreState(stateValue) {
    if (FAILURE_STATES.has(stateValue)) return 4;
    if (stateValue === "DEGRADED" || stateValue === "PARTIAL") return 3;
    if (stateValue === "PASS_WITH_WARNINGS" || stateValue === "INCONCLUSIVE" || stateValue === "UNKNOWN") return 2;
    if (stateValue === "NOT_VALIDATED") return 1;
    return 0;
  }
  function combineStates(results) {
    if (!results.length) return "NOT_VALIDATED";
    let worst = "PASS";
    let score = 0;
    results.forEach(function each(item) {
      const s = scoreState(item.state);
      if (s > score) { score = s; worst = item.state; }
    });
    if (score === 0 && results.some(function warn(item) { return item.severity === "WARNING" || item.state === "NOT_APPLICABLE"; })) return "PASS_WITH_WARNINGS";
    return worst;
  }
  function validationDimensionResult(dimension, stateValue, severity, code, details, critical) {
    const dimensionName = normalizeEnum(dimension, DIMENSIONS, "INTEGRATION");
    const stateName = normalizeEnum(stateValue, VALIDATION_STATES, "UNKNOWN");
    const severityName = normalizeEnum(severity, SEVERITIES, FAILURE_STATES.has(stateName) ? "ERROR" : "INFO");
    return internal.deepFreeze({
      dimension: dimensionName,
      state: stateName,
      severity: severityName,
      code: text(code, "EXTERNAL010_VALIDATION_RESULT"),
      passed: !FAILURE_STATES.has(stateName),
      critical: critical === true || severityName === "CRITICAL",
      details: internal.isPlainObject(details) ? clone(details) : { value: details == null ? null : details },
      evaluatedAt: nowIso(),
      immutable: true
    });
  }

  function registerValidationSuite(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const suite = {
      validationSuiteId: text(source.validationSuiteId, ""),
      validationSuiteVersion: text(source.validationSuiteVersion, ""),
      purpose: normalizeEnum(source.purpose, PURPOSES, "RESEARCH_USE"),
      requiredDimensions: unique(source.requiredDimensions).map(function map(v) { return normalizeEnum(v, DIMENSIONS, "INTEGRATION"); }),
      criticalDimensions: unique(source.criticalDimensions).map(function map(v) { return normalizeEnum(v, DIMENSIONS, "INTEGRATION"); }),
      rules: Array.isArray(source.rules) ? clone(source.rules) : [],
      criticalRules: Array.isArray(source.criticalRules) ? clone(source.criticalRules) : [],
      description: text(source.description, ""),
      introducedAt: normalizeIso(source.introducedAt) || nowIso(),
      supersedesVersion: source.supersedesVersion == null ? null : text(source.supersedesVersion, ""),
      validationPassEqualsApproval: false,
      validationPassEqualsAuthorityGrant: false,
      immutable: true
    };
    if (!/^EXTERNAL-010-VALIDATION-SUITE-[A-Z0-9-]+$/.test(suite.validationSuiteId) || !/^\d+\.\d+\.\d+/.test(suite.validationSuiteVersion)) {
      return internal.buildResult(false, "EXTERNAL010_VALIDATION_SUITE_INVALID", "Blocked", { suite: suite });
    }
    const key = suiteKey(suite.validationSuiteId, suite.validationSuiteVersion);
    if (state.validationSuites.has(key)) {
      const existing = state.validationSuites.get(key);
      const same = internal.stableStringify(existing) === internal.stableStringify(internal.deepFreeze(clone(suite)));
      return internal.buildResult(same, same ? "EXTERNAL010_VALIDATION_SUITE_ALREADY_REGISTERED" : "EXTERNAL010_VALIDATION_SUITE_VERSION_CONFLICT", same ? "Ready" : "Blocked", { validationSuite: clone(existing) });
    }
    const frozen = internal.deepFreeze(clone(suite));
    state.validationSuites.set(key, frozen);
    const versions = state.validationSuiteVersions.get(frozen.validationSuiteId) || [];
    state.validationSuiteVersions.set(frozen.validationSuiteId, unique(versions.concat([frozen.validationSuiteVersion])));
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_VALIDATION_SUITE_REGISTERED", "Ready", { validationSuite: clone(frozen) });
  }

  function getValidationSuite(id, version) {
    const suiteId = text(id, "");
    if (!suiteId) return null;
    if (version) {
      const found = state.validationSuites.get(suiteKey(suiteId, version));
      return found ? clone(found) : null;
    }
    const versions = state.validationSuiteVersions.get(suiteId) || [];
    const selected = versions.slice().sort().pop();
    const found = selected ? state.validationSuites.get(suiteKey(suiteId, selected)) : null;
    return found ? clone(found) : null;
  }

  function listValidationSuites() {
    return Array.from(state.validationSuites.values()).map(clone);
  }

  function registerGoldenValidationCase(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const record = {
      goldenCaseId: text(source.goldenCaseId, ""),
      title: text(source.title, ""),
      category: text(source.category, "GENERAL").toUpperCase(),
      expectedState: normalizeEnum(source.expectedState, VALIDATION_STATES, "PASS"),
      fixture: internal.isPlainObject(source.fixture) ? clone(source.fixture) : {},
      expected: internal.isPlainObject(source.expected) ? clone(source.expected) : {},
      failureOrAmbiguityExpected: source.failureOrAmbiguityExpected === true || source.expectedState !== "PASS",
      createdAt: normalizeIso(source.createdAt) || nowIso(),
      immutable: true
    };
    if (!/^EXTERNAL-010-GOLDEN-[A-Z0-9-]+$/.test(record.goldenCaseId) || !record.title) return internal.buildResult(false, "EXTERNAL010_GOLDEN_CASE_INVALID", "Blocked", { goldenCase: record });
    const existing = state.goldenValidationCases.get(record.goldenCaseId);
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(internal.deepFreeze(clone(record)));
      return internal.buildResult(same, same ? "EXTERNAL010_GOLDEN_CASE_ALREADY_REGISTERED" : "EXTERNAL010_GOLDEN_CASE_CONFLICT", same ? "Ready" : "Blocked", { goldenCase: clone(existing) });
    }
    const frozen = internal.deepFreeze(clone(record));
    state.goldenValidationCases.set(frozen.goldenCaseId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_GOLDEN_CASE_REGISTERED", "Ready", { goldenCase: clone(frozen) });
  }

  function listGoldenValidationCases() { return Array.from(state.goldenValidationCases.values()).map(clone); }

  function createMemoryValidationPersistenceAdapter() {
    const records = new Map();
    return {
      adapterId: "EXTERNAL-010-VALIDATION-PERSISTENCE-MEMORY",
      async put(record) { records.set(record.validationProfileId || record.releaseGateId || record.validationEvidenceId, clone(record)); return true; },
      async get(id) { return records.has(id) ? clone(records.get(id)) : null; },
      async list() { return Array.from(records.values()).map(clone); }
    };
  }

  function createLocalStorageValidationPersistenceAdapter(storageKey) {
    const key = text(storageKey, "EXTERNAL010_VALIDATION_RESULTS_V1");
    function load() {
      try {
        const parsed = JSON.parse(global.localStorage.getItem(key) || "{}");
        return internal.isPlainObject(parsed) ? parsed : {};
      } catch (_) { return {}; }
    }
    function save(records) { global.localStorage.setItem(key, JSON.stringify(records)); }
    return {
      adapterId: "EXTERNAL-010-VALIDATION-PERSISTENCE-LOCAL-STORAGE",
      async put(record) { const records = load(); const id = record.validationProfileId || record.releaseGateId || record.validationEvidenceId; records[id] = clone(record); save(records); return true; },
      async get(id) { const records = load(); return records[id] ? clone(records[id]) : null; },
      async list() { const records = load(); return Object.keys(records).map(function map(id) { return clone(records[id]); }); }
    };
  }

  function setValidationPersistenceAdapter(adapter) {
    if (!adapter || typeof adapter.put !== "function" || typeof adapter.get !== "function") return internal.buildResult(false, "EXTERNAL010_VALIDATION_PERSISTENCE_ADAPTER_INVALID", "Blocked", null);
    state.validationPersistence.adapter = adapter;
    state.validationPersistence.adapterId = text(adapter.adapterId, "CUSTOM");
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_VALIDATION_PERSISTENCE_ADAPTER_SET", "Ready", { adapterId: state.validationPersistence.adapterId });
  }

  async function persistValidationRecord(record) {
    const adapter = state.validationPersistence.adapter;
    if (!adapter) return internal.buildResult(false, "EXTERNAL010_VALIDATION_PERSISTENCE_ADAPTER_REQUIRED", "Blocked", null);
    await adapter.put(clone(record));
    return internal.buildResult(true, "EXTERNAL010_VALIDATION_RESULT_PERSISTED", "Ready", { recordId: record.validationProfileId || record.releaseGateId || record.validationEvidenceId, adapterId: state.validationPersistence.adapterId });
  }

  async function readBackValidationRecord(id) {
    const adapter = state.validationPersistence.adapter;
    if (!adapter) return internal.buildResult(false, "EXTERNAL010_VALIDATION_PERSISTENCE_ADAPTER_REQUIRED", "Blocked", null);
    const record = await adapter.get(text(id, ""));
    state.validationPersistence.lastReadbackAt = nowIso();
    return internal.buildResult(Boolean(record), record ? "EXTERNAL010_VALIDATION_RESULT_READBACK" : "EXTERNAL010_VALIDATION_RESULT_NOT_FOUND", record ? "Ready" : "Missing", { record: record, adapterId: state.validationPersistence.adapterId });
  }

  function evaluateStructural(input) {
    const schemaId = text(input.schemaId || input.targetSchemaId, "");
    if (!schemaId || !internal.isPlainObject(input.targetRecord)) return validationDimensionResult("STRUCTURAL", "NOT_APPLICABLE", "INFO", "STRUCTURAL_SCHEMA_NOT_REQUESTED", { schemaId: schemaId || null }, false);
    const result = typeof namespace.validateExternalIntelligenceRecord === "function" ? namespace.validateExternalIntelligenceRecord(schemaId, input.targetRecord) : { valid: false, errors: [{ code: "SCHEMA_VALIDATOR_UNAVAILABLE" }] };
    return validationDimensionResult("STRUCTURAL", result.valid ? "PASS" : "FAIL", result.valid ? "INFO" : "CRITICAL", result.valid ? "STRUCTURAL_VALID" : "STRUCTURAL_INVALID", { schemaId: schemaId, errors: result.errors || [] }, !result.valid);
  }

  function findSemanticProblems(value, path, output) {
    if (Array.isArray(value)) { value.forEach(function each(item, index) { findSemanticProblems(item, path + "[" + index + "]", output); }); return; }
    if (!value || typeof value !== "object") return;
    Object.keys(value).forEach(function each(key) {
      const item = value[key];
      const nextPath = path + "." + key;
      if (/probability$/i.test(key) && typeof item === "number" && (item < 0 || item > 1)) output.push({ path: nextPath, code: "PROBABILITY_OUT_OF_RANGE", value: item });
      if (/volume$/i.test(key) && typeof item === "number" && item < 0) output.push({ path: nextPath, code: "NEGATIVE_VOLUME", value: item });
      findSemanticProblems(item, nextPath, output);
    });
    const start = normalizeIso(value.validFrom || value.startAt || value.rangeStart);
    const end = normalizeIso(value.validUntil || value.endAt || value.rangeEnd);
    if (start && end && Date.parse(start) > Date.parse(end)) output.push({ path: path, code: "TEMPORAL_RANGE_REVERSED", start: start, end: end });
  }

  function evaluateSemantic(input) {
    if (!internal.isPlainObject(input.targetRecord)) return validationDimensionResult("SEMANTIC", "NOT_APPLICABLE", "INFO", "SEMANTIC_TARGET_NOT_PROVIDED", {}, false);
    const problems = [];
    findSemanticProblems(input.targetRecord, "$", problems);
    return validationDimensionResult("SEMANTIC", problems.length ? "FAIL" : "PASS", problems.length ? "ERROR" : "INFO", problems.length ? "SEMANTIC_INVARIANT_FAILED" : "SEMANTIC_INVARIANTS_VALID", { problems: problems }, false);
  }

  function referenceExists(type, id) {
    const referenceType = text(type, "").toUpperCase();
    const referenceId = text(id, "");
    if (!referenceId) return false;
    if (referenceType === "SOURCE") return state.sourceRegistry instanceof Map && state.sourceRegistry.has(referenceId);
    if (referenceType === "EVIDENCE") return (state.acquisitionEvidenceRecords instanceof Map && state.acquisitionEvidenceRecords.has(referenceId)) || (state.externalEvidenceReferences instanceof Map && state.externalEvidenceReferences.has(referenceId));
    if (referenceType === "ENTITY") return state.entityRegistry instanceof Map && state.entityRegistry.has(referenceId);
    if (referenceType === "CAPABILITY") return state.analyticalCapabilities instanceof Map && state.analyticalCapabilities.has(referenceId);
    if (referenceType === "SCHEMA") return typeof namespace.getExternalIntelligenceSchema === "function" && Boolean(namespace.getExternalIntelligenceSchema(referenceId));
    if (referenceType === "POLICY") return state.usagePolicies instanceof Map && state.usagePolicies.has(referenceId);
    if (referenceType === "PACKAGE") return state.externalIntelligencePackages instanceof Map && state.externalIntelligencePackages.has(referenceId);
    if (referenceType === "LINEAGE") return state.lineageRecords instanceof Map && state.lineageRecords.has(referenceId);
    return false;
  }

  function evaluateReference(input) {
    const refs = Array.isArray(input.references) ? input.references : [];
    if (!refs.length) return validationDimensionResult("REFERENCE", "NOT_APPLICABLE", "INFO", "REFERENCE_SET_NOT_PROVIDED", {}, false);
    const missing = refs.filter(function missingRef(ref) { return !referenceExists(ref && ref.type, ref && ref.id); }).map(clone);
    return validationDimensionResult("REFERENCE", missing.length ? "FAIL" : "PASS", missing.length ? "ERROR" : "INFO", missing.length ? "REFERENCE_UNRESOLVED" : "REFERENCE_VALID", { checked: refs.length, missing: missing }, false);
  }

  function evaluateLineage(input) {
    const required = input.lineageRequired === true;
    const lineageRecordIds = unique(input.lineageRecordIds);
    const targetId = text(input.targetRecordId, "");
    if (!required && !lineageRecordIds.length && !targetId) return validationDimensionResult("LINEAGE", "NOT_APPLICABLE", "INFO", "LINEAGE_NOT_REQUESTED", {}, false);
    let found = lineageRecordIds.filter(function exists(id) { return state.lineageRecords instanceof Map && state.lineageRecords.has(id); });
    if (!found.length && targetId && typeof namespace.traceExternalIntelligenceReverseProvenance === "function") {
      const trace = namespace.traceExternalIntelligenceReverseProvenance(targetId);
      if (trace && trace.ok && trace.data && Array.isArray(trace.data.lineageRecords)) found = trace.data.lineageRecords.map(function map(item) { return item.lineageRecordId; });
    }
    const passed = !required || found.length > 0;
    return validationDimensionResult("LINEAGE", passed ? "PASS" : "FAIL", passed ? "INFO" : "CRITICAL", passed ? "LINEAGE_VALID" : "LINEAGE_REQUIRED_MISSING", { lineageRecordIds: found, targetRecordId: targetId || null }, !passed);
  }

  function evaluateTemporal(input) {
    const temporalIntent = text(input.temporalIntent, "").toUpperCase();
    const decisionTime = normalizeIso(input.decisionTime || input.asOfTime);
    const availableAt = normalizeIso(input.availableAt || (input.targetRecord && input.targetRecord.availableAt));
    if (!temporalIntent && !decisionTime && !availableAt) return validationDimensionResult("TEMPORAL", "NOT_APPLICABLE", "INFO", "TEMPORAL_CONTEXT_NOT_PROVIDED", {}, false);
    const historicalCritical = ["AS_OF", "HISTORICAL", "BACKTEST"].indexOf(temporalIntent) >= 0;
    const lookAhead = historicalCritical && decisionTime && availableAt && Date.parse(availableAt) > Date.parse(decisionTime);
    if (lookAhead) return validationDimensionResult("TEMPORAL", "BLOCKED", "CRITICAL", "TEMPORAL_LOOK_AHEAD_DETECTED", { temporalIntent: temporalIntent, decisionTime: decisionTime, availableAt: availableAt }, true);
    return validationDimensionResult("TEMPORAL", "PASS", "INFO", "TEMPORAL_VALID", { temporalIntent: temporalIntent || null, decisionTime: decisionTime, availableAt: availableAt }, false);
  }

  function evaluateEvidence(input) {
    const ids = unique(input.evidenceIds);
    if (!ids.length) return validationDimensionResult("EVIDENCE", "NOT_APPLICABLE", "INFO", "EVIDENCE_NOT_PROVIDED", {}, false);
    const missing = ids.filter(function missing(id) {
      return !((state.acquisitionEvidenceRecords instanceof Map && state.acquisitionEvidenceRecords.has(id)) || (state.externalEvidenceReferences instanceof Map && state.externalEvidenceReferences.has(id)));
    });
    return validationDimensionResult("EVIDENCE", missing.length ? "PARTIAL" : "PASS", missing.length ? "WARNING" : "INFO", missing.length ? "EVIDENCE_PARTIAL_OR_MISSING" : "EVIDENCE_REFERENCES_PRESENT", { evidenceIds: ids, missingEvidenceIds: missing }, false);
  }

  function evaluatePolicy(input) {
    const sourceId = text(input.sourceId, "");
    const operation = text(input.policyOperation || input.operation, "").toUpperCase();
    if (!sourceId || !operation || typeof namespace.checkExternalIntelligenceUsagePolicy !== "function") return validationDimensionResult("POLICY", "NOT_APPLICABLE", "INFO", "POLICY_CONTEXT_NOT_PROVIDED", { sourceId: sourceId || null, operation: operation || null }, false);
    const result = namespace.checkExternalIntelligenceUsagePolicy({ sourceId: sourceId, operation: operation, purpose: text(input.purpose, "") });
    const allowed = result && result.ok === true && result.data && result.data.allowed === true;
    return validationDimensionResult("POLICY", allowed ? "PASS" : "BLOCKED", allowed ? "INFO" : "CRITICAL", allowed ? "POLICY_ALLOWED" : "POLICY_BLOCKED_OR_UNKNOWN", { sourceId: sourceId, operation: operation, result: result }, !allowed);
  }

  function evaluateSecurity(input) {
    const securityState = text(input.securityState || (input.targetRecord && input.targetRecord.securityState), "").toUpperCase();
    const blocked = ["BLOCKED", "QUARANTINED", "MALICIOUS", "CONFIRMED_MALWARE", "KNOWN_MALICIOUS_ARTIFACT", "UNSAFE"].indexOf(securityState) >= 0;
    const unknown = !securityState || ["UNKNOWN", "UNASSESSED"].indexOf(securityState) >= 0;
    if (blocked) return validationDimensionResult("SECURITY", "BLOCKED", "CRITICAL", "SECURITY_STATE_BLOCKED", { securityState: securityState }, true);
    if (unknown) return validationDimensionResult("SECURITY", "UNKNOWN", "WARNING", "SECURITY_STATE_UNKNOWN", { securityState: securityState || "UNKNOWN" }, false);
    return validationDimensionResult("SECURITY", "PASS", "INFO", "SECURITY_STATE_ACCEPTABLE", { securityState: securityState }, false);
  }

  function evaluateFreshness(input) {
    const freshnessState = text(input.freshnessState || (input.targetRecord && input.targetRecord.freshnessState), "").toUpperCase();
    if (!freshnessState) return validationDimensionResult("FRESHNESS", "UNKNOWN", "WARNING", "FRESHNESS_UNKNOWN", {}, false);
    if (["EXPIRED"].indexOf(freshnessState) >= 0) return validationDimensionResult("FRESHNESS", "BLOCKED", "ERROR", "FRESHNESS_EXPIRED", { freshnessState: freshnessState }, false);
    if (["STALE", "AGING"].indexOf(freshnessState) >= 0) return validationDimensionResult("FRESHNESS", "PASS_WITH_WARNINGS", "WARNING", "FRESHNESS_STALE_OR_AGING", { freshnessState: freshnessState }, false);
    if (["UNKNOWN", "UNASSESSED"].indexOf(freshnessState) >= 0) return validationDimensionResult("FRESHNESS", "UNKNOWN", "WARNING", "FRESHNESS_UNKNOWN", { freshnessState: freshnessState }, false);
    return validationDimensionResult("FRESHNESS", "PASS", "INFO", "FRESHNESS_ACCEPTABLE", { freshnessState: freshnessState }, false);
  }

  function evaluateCoverage(input) {
    const profile = internal.isPlainObject(input.coverageProfile) ? input.coverageProfile : {};
    const coverageState = text(profile.coverageState || input.coverageState, "").toUpperCase();
    if (!coverageState) return validationDimensionResult("COVERAGE", "UNKNOWN", "WARNING", "COVERAGE_UNKNOWN", {}, false);
    if (["BLOCKED", "INSUFFICIENT"].indexOf(coverageState) >= 0) return validationDimensionResult("COVERAGE", "PARTIAL", "WARNING", "COVERAGE_INSUFFICIENT", { coverageState: coverageState, coverageProfile: profile }, false);
    if (["PARTIAL", "LIMITED_BY_POLICY", "LIMITED_BY_BUDGET"].indexOf(coverageState) >= 0) return validationDimensionResult("COVERAGE", "PASS_WITH_WARNINGS", "WARNING", "COVERAGE_PARTIAL", { coverageState: coverageState, coverageProfile: profile }, false);
    return validationDimensionResult("COVERAGE", "PASS", "INFO", "COVERAGE_ACCEPTABLE", { coverageState: coverageState, coverageProfile: profile }, false);
  }

  function evaluateIntegration(input) {
    const integrationState = text(input.integrationState, "").toUpperCase();
    if (!integrationState) return validationDimensionResult("INTEGRATION", "NOT_APPLICABLE", "INFO", "INTEGRATION_CONTEXT_NOT_PROVIDED", {}, false);
    const passed = ["PASS", "READY", "COMPATIBLE", "AVAILABLE"].indexOf(integrationState) >= 0;
    return validationDimensionResult("INTEGRATION", passed ? "PASS" : "FAIL", passed ? "INFO" : "ERROR", passed ? "INTEGRATION_VALID" : "INTEGRATION_INVALID", { integrationState: integrationState }, false);
  }

  function evaluateSimpleDimension(dimension, inputKey, input) {
    const value = text(input && input[inputKey], "").toUpperCase();
    if (!value) return validationDimensionResult(dimension, "NOT_APPLICABLE", "INFO", dimension + "_NOT_PROVIDED", {}, false);
    const passed = ["PASS", "VALID", "READY", "SUPPORTED", "FINAL", "CALIBRATED"].indexOf(value) >= 0;
    const warning = ["PARTIAL", "INCONCLUSIVE", "UNKNOWN", "UNASSESSED", "PROVISIONAL"].indexOf(value) >= 0;
    return validationDimensionResult(dimension, passed ? "PASS" : warning ? "PASS_WITH_WARNINGS" : "FAIL", passed ? "INFO" : warning ? "WARNING" : "ERROR", dimension + "_STATE_" + value, { state: value }, false);
  }

  function evaluateValidationDimensions(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const results = [
      evaluateStructural(source), evaluateSemantic(source), evaluateReference(source), evaluateLineage(source), evaluateTemporal(source),
      evaluateEvidence(source), evaluatePolicy(source), evaluateSecurity(source), evaluateFreshness(source), evaluateCoverage(source),
      evaluateSimpleDimension("CONSISTENCY", "consistencyState", source), evaluateSimpleDimension("CALIBRATION", "calibrationState", source),
      evaluateSimpleDimension("OUTCOME", "outcomeState", source), evaluateIntegration(source)
    ];
    const overrides = Array.isArray(source.dimensionOverrides) ? source.dimensionOverrides : [];
    overrides.forEach(function override(item) {
      const dimension = normalizeEnum(item && item.dimension, DIMENSIONS, null);
      if (!dimension) return;
      const index = results.findIndex(function find(current) { return current.dimension === dimension; });
      const replacement = validationDimensionResult(dimension, item.state, item.severity, item.code || "DIMENSION_OVERRIDE", item.details || {}, item.critical === true);
      if (index >= 0) results[index] = replacement; else results.push(replacement);
    });
    return results;
  }

  function resolveSuiteForPurpose(purpose, explicitSuiteId, explicitVersion) {
    if (explicitSuiteId) return getValidationSuite(explicitSuiteId, explicitVersion);
    const targetPurpose = normalizeEnum(purpose, PURPOSES, "RESEARCH_USE");
    const matches = listValidationSuites().filter(function match(suite) { return suite.purpose === targetPurpose; });
    return matches.length ? matches.sort(function sort(a, b) { return a.validationSuiteVersion.localeCompare(b.validationSuiteVersion); }).pop() : null;
  }

  function applyPurposeGate(suite, dimensionResults) {
    if (!suite) return { overallState: "BLOCKED", criticalFailureCount: 1, failedDimensions: ["VALIDATION_SUITE"], warningDimensions: [], purposeAllowed: false };
    const byDimension = new Map(dimensionResults.map(function pair(item) { return [item.dimension, item]; }));
    const failed = [];
    const warnings = [];
    let criticalFailureCount = 0;
    suite.requiredDimensions.forEach(function check(dimension) {
      const item = byDimension.get(dimension);
      if (!item || FAILURE_STATES.has(item.state) || item.state === "NOT_VALIDATED") {
        failed.push(dimension);
        if (suite.criticalDimensions.indexOf(dimension) >= 0 || (item && item.critical)) criticalFailureCount += 1;
      } else if (WARNING_STATES.has(item.state) || item.state === "NOT_APPLICABLE") {
        warnings.push(dimension);
        if (suite.criticalDimensions.indexOf(dimension) >= 0 && item.state === "UNKNOWN") criticalFailureCount += 1;
      }
    });
    const purposeAllowed = criticalFailureCount === 0 && failed.length === 0;
    const overallState = criticalFailureCount > 0 ? "BLOCKED" : failed.length > 0 ? "FAIL" : warnings.length > 0 ? "PASS_WITH_WARNINGS" : combineStates(dimensionResults);
    return { overallState: overallState, criticalFailureCount: criticalFailureCount, failedDimensions: failed, warningDimensions: warnings, purposeAllowed: purposeAllowed };
  }

  async function appendValidationAudit(eventType, outcome, details) {
    if (typeof namespace.appendExternalIntelligenceAuditEvent !== "function") return null;
    try { return await namespace.appendExternalIntelligenceAuditEvent({ eventType: eventType, actor: "EXTERNAL-010-VALIDATION", outcome: outcome, details: internal.redactSensitive ? internal.redactSensitive(clone(details || {})) : clone(details || {}) }); }
    catch (_) { return null; }
  }

  async function runValidation(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const purpose = normalizeEnum(source.purpose, PURPOSES, "RESEARCH_USE");
    const suite = resolveSuiteForPurpose(purpose, source.validationSuiteId, source.validationSuiteVersion);
    if (!suite) return internal.buildResult(false, "EXTERNAL010_VALIDATION_SUITE_REQUIRED", "Blocked", { purpose: purpose });
    const dimensionResults = evaluateValidationDimensions(source);
    const gate = applyPurposeGate(suite, dimensionResults);
    const record = internal.deepFreeze({
      validationProfileId: internal.nextId("EXTERNAL-010-VALIDATION-PROFILE"),
      targetRecordId: text(source.targetRecordId, "UNSPECIFIED"),
      targetRecordVersion: text(source.targetRecordVersion, "UNKNOWN"),
      targetSchemaVersion: text(source.targetSchemaVersion, "UNKNOWN"),
      validationSuiteId: suite.validationSuiteId,
      validationSuiteVersion: suite.validationSuiteVersion,
      purpose: purpose,
      validationDimensions: dimensionResults,
      overallState: gate.overallState,
      criticalFailureCount: gate.criticalFailureCount,
      failedDimensions: gate.failedDimensions,
      warningDimensions: gate.warningDimensions,
      purposeAllowed: gate.purposeAllowed,
      approvalGranted: false,
      authorityGranted: false,
      truthAuthorityGranted: false,
      canonicalPromotionPerformed: false,
      validationEnvironment: text(source.validationEnvironment, "BROWSER_RUNTIME"),
      validatedAt: nowIso(),
      immutable: true
    });
    const contractValidation = typeof namespace.validateExternalIntelligenceContract === "function" ? namespace.validateExternalIntelligenceContract("validationProfile", record) : { valid: true };
    const schemaValidation = typeof namespace.validateExternalIntelligenceRecord === "function" ? namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-VALIDATION-PROFILE", record) : { valid: true };
    if (!contractValidation.valid || !schemaValidation.valid) return internal.buildResult(false, "EXTERNAL010_VALIDATION_PROFILE_CONTRACT_INVALID", "Blocked", { contractValidation: contractValidation, schemaValidation: schemaValidation });
    state.validationProfiles.set(record.validationProfileId, record);
    internal.touch();
    let lineage = null;
    if (record.targetRecordId !== "UNSPECIFIED" && typeof namespace.createExternalIntelligenceLineageRecord === "function") {
      lineage = namespace.createExternalIntelligenceLineageRecord({ inputReferenceId: record.targetRecordId, outputReferenceId: record.validationProfileId, relationType: "REVIEWED_FROM", lineageState: "ACTIVE" });
    }
    let persistence = null;
    if (state.validationPersistence.adapter) {
      try { persistence = await persistValidationRecord(record); } catch (error) { persistence = internal.buildResult(false, "EXTERNAL010_VALIDATION_PERSISTENCE_FAILED", "Failed", null, { error: { message: error && error.message || String(error), category: "Persistence" } }); }
    }
    await appendValidationAudit(gate.purposeAllowed ? "VALIDATION_PASS" : "VALIDATION_FAILED", gate.purposeAllowed ? "PASS" : "BLOCKED", { validationProfileId: record.validationProfileId, purpose: purpose, overallState: record.overallState, criticalFailureCount: record.criticalFailureCount });
    return internal.buildResult(true, "EXTERNAL010_VALIDATION_PROFILE_CREATED", gate.purposeAllowed ? "Ready" : "Blocked", { validationProfile: clone(record), persistence: persistence, lineage: lineage });
  }

  function getValidationProfile(id) { const item = state.validationProfiles.get(text(id, "")); return item ? clone(item) : null; }
  function listValidationProfiles() { return Array.from(state.validationProfiles.values()).map(clone); }

  function createValidationEvidence(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const record = internal.deepFreeze({
      validationEvidenceId: text(source.validationEvidenceId, "") || internal.nextId("EXTERNAL-010-VALIDATION-EVIDENCE"),
      validationProfileId: text(source.validationProfileId, ""),
      testCaseId: text(source.testCaseId, ""),
      expected: source.expected == null ? null : clone(source.expected),
      actual: source.actual == null ? null : clone(source.actual),
      passed: source.passed === true,
      severity: normalizeEnum(source.severity, SEVERITIES, source.passed === true ? "INFO" : "ERROR"),
      executionEnvironment: text(source.executionEnvironment, "UNKNOWN"),
      relatedRecordIds: unique(source.relatedRecordIds),
      timestamp: nowIso(),
      failedEvidencePreserved: true,
      immutable: true
    });
    const contractValidation = typeof namespace.validateExternalIntelligenceContract === "function" ? namespace.validateExternalIntelligenceContract("validationEvidence", record) : { valid: true };
    const schemaValidation = typeof namespace.validateExternalIntelligenceRecord === "function" ? namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-VALIDATION-EVIDENCE", record) : { valid: true };
    if (!contractValidation.valid || !schemaValidation.valid) return internal.buildResult(false, "EXTERNAL010_VALIDATION_EVIDENCE_CONTRACT_INVALID", "Blocked", { contractValidation: contractValidation, schemaValidation: schemaValidation });
    state.validationEvidenceRecords.set(record.validationEvidenceId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_VALIDATION_EVIDENCE_CREATED", "Ready", { validationEvidence: clone(record) });
  }

  function createRuntimeHealthValidation(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const capabilities = internal.isPlainObject(source.capabilities) ? clone(source.capabilities) : {};
    const states = Object.values(capabilities).map(function map(v) { return text(v, "UNKNOWN").toUpperCase(); });
    const overallState = states.some(function fail(v) { return ["FAILED", "BLOCKED", "UNAVAILABLE"].indexOf(v) >= 0; }) ? "DEGRADED" : states.some(function unknown(v) { return ["UNKNOWN", "RECOVERING"].indexOf(v) >= 0; }) ? "UNKNOWN" : "READY";
    const record = internal.deepFreeze({
      runtimeHealthValidationId: internal.nextId("EXTERNAL-010-RUNTIME-HEALTH-VALIDATION"),
      runtimeInstanceId: text(source.runtimeInstanceId, "UNKNOWN"),
      capabilities: capabilities,
      overallState: overallState,
      informationTruthGranted: false,
      validatedAt: nowIso(),
      immutable: true
    });
    state.validationRuntimeHealthRecords.set(record.runtimeHealthValidationId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RUNTIME_HEALTH_VALIDATED", overallState === "READY" ? "Ready" : "Degraded", { runtimeHealthValidation: clone(record) });
  }

  function createHistoricalReplayRecord(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const record = internal.deepFreeze({
      historicalReplayId: internal.nextId("EXTERNAL-010-HISTORICAL-REPLAY"),
      originalRecordId: text(source.originalRecordId, ""),
      originalSnapshotId: text(source.originalSnapshotId, ""),
      replaySuiteId: text(source.replaySuiteId, ""),
      replaySuiteVersion: text(source.replaySuiteVersion, ""),
      originalProductionResultRewritten: false,
      replayEqualsOriginalProductionResult: false,
      replayResult: source.replayResult == null ? null : clone(source.replayResult),
      replayedAt: nowIso(),
      immutable: true
    });
    state.validationHistoricalReplayRecords.set(record.historicalReplayId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_HISTORICAL_REPLAY_RECORDED", "Ready", { historicalReplay: clone(record) });
  }

  function createDifferentialValidationRecord(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const current = internal.isPlainObject(source.current) ? source.current : {};
    const candidate = internal.isPlainObject(source.candidate) ? source.candidate : {};
    const changed = internal.stableStringify(current) === internal.stableStringify(candidate) ? [] : [text(source.targetRecordId, "TARGET")];
    const record = internal.deepFreeze({
      differentialValidationId: internal.nextId("EXTERNAL-010-DIFFERENTIAL-VALIDATION"),
      targetRecordId: text(source.targetRecordId, ""),
      currentVersion: text(source.currentVersion, ""),
      candidateVersion: text(source.candidateVersion, ""),
      changedRecords: changed,
      changedClaims: unique(source.changedClaims),
      changedEntities: unique(source.changedEntities),
      changedSignals: unique(source.changedSignals),
      changedPredictions: unique(source.changedPredictions),
      changedPackages: unique(source.changedPackages),
      unexpectedDifferenceCount: Number.isFinite(Number(source.unexpectedDifferenceCount)) ? Number(source.unexpectedDifferenceCount) : 0,
      automaticPromotionPerformed: false,
      createdAt: nowIso(),
      immutable: true
    });
    state.validationDifferentialRecords.set(record.differentialValidationId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_DIFFERENTIAL_VALIDATION_RECORDED", "Ready", { differentialValidation: clone(record) });
  }

  function evaluateGatewayRequestIntegrity(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const sessionState = text(source.sessionState, "MISSING").toUpperCase();
    const sessionValid = sessionState === "ACTIVE";
    const originValid = source.originValid === true;
    const hostValid = source.hostValid === true;
    const freshnessValid = source.freshnessValid === true;
    const replayDetected = source.replayDetected === true;
    const runtimeBindingValid = source.runtimeBindingValid === true;
    const tokenExposureCandidate = source.tokenExposureCandidate === true;
    const healthSensitiveDataCandidate = source.healthSensitiveDataCandidate === true;
    const authenticationPassed = sessionValid && originValid && hostValid && freshnessValid && !replayDetected && runtimeBindingValid && !tokenExposureCandidate && !healthSensitiveDataCandidate;
    const authorityAllowed = source.operationAuthorityAllowed === true;
    const stateValue = authenticationPassed && authorityAllowed ? "PASS" : "BLOCKED";
    const reasons = [];
    if (!sessionValid) reasons.push("SESSION_" + sessionState);
    if (!originValid) reasons.push("ORIGIN_INVALID");
    if (!hostValid) reasons.push("HOST_INVALID");
    if (!freshnessValid) reasons.push("REQUEST_STALE");
    if (replayDetected) reasons.push("REPLAY_DETECTED");
    if (!runtimeBindingValid) reasons.push("RUNTIME_SESSION_BINDING_INVALID");
    if (tokenExposureCandidate) reasons.push("SESSION_TOKEN_EXPOSURE_CANDIDATE");
    if (healthSensitiveDataCandidate) reasons.push("SENSITIVE_HEALTH_RESPONSE_CANDIDATE");
    if (authenticationPassed && !authorityAllowed) reasons.push("OPERATION_AUTHORITY_MISSING");
    return internal.deepFreeze({
      gatewayValidationId: internal.nextId("EXTERNAL-010-GATEWAY-REQUEST-INTEGRITY-VALIDATION"),
      sessionState: sessionState,
      sessionValidation: sessionValid,
      originValidation: originValid,
      hostValidation: hostValid,
      requestFreshness: freshnessValid,
      replayProtection: !replayDetected,
      runtimeSessionBinding: runtimeBindingValid,
      sessionSecretRedaction: !tokenExposureCandidate,
      healthResponseMinimized: !healthSensitiveDataCandidate,
      requestAuthenticationPassed: authenticationPassed,
      operationAuthorizationPassed: authorityAllowed,
      requestAuthenticationEqualsOperationAuthorization: false,
      overallState: stateValue,
      reasons: reasons,
      validatedAt: nowIso(),
      immutable: true
    });
  }

  function createReleaseGate(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const validationProfileIds = unique(source.validationProfileIds);
    const profiles = validationProfileIds.map(function get(id) { return state.validationProfiles.get(id) || null; });
    const profilesResolved = validationProfileIds.length > 0 && profiles.every(Boolean);
    const profilePassed = profiles.filter(function pass(profile) { return profile && profile.purposeAllowed === true && profile.criticalFailureCount === 0; }).length;
    const profileFailed = profiles.filter(function fail(profile) { return !profile || profile.purposeAllowed !== true || profile.criticalFailureCount > 0; }).length;
    const passed = Math.max(profilePassed, Math.max(0, Number(source.passed) || 0));
    const failed = Math.max(profileFailed, Math.max(0, Number(source.failed) || 0));
    const criticalFailed = Math.max(profiles.reduce(function sum(total, profile) { return total + (profile ? Number(profile.criticalFailureCount) || 0 : 1); }, 0), Math.max(0, Number(source.criticalFailed) || 0));
    const mandatory = internal.isPlainObject(source.mandatoryGates) ? clone(source.mandatoryGates) : {};
    const mandatoryPass = Object.keys(mandatory).length > 0 && Object.keys(mandatory).every(function each(key) { return mandatory[key] === true; });
    const releaseAllowed = profilesResolved && failed === 0 && criticalFailed === 0 && mandatoryPass;
    const total = passed + failed;
    const record = internal.deepFreeze({
      releaseGateId: internal.nextId("EXTERNAL-010-RELEASE-GATE"),
      targetVersion: text(source.targetVersion, VERSION_MANIFEST.release.version),
      validationSuiteVersions: unique(source.validationSuiteVersions),
      validationProfileIds: validationProfileIds,
      mandatoryGates: mandatory,
      passed: passed,
      failed: failed,
      criticalFailed: criticalFailed,
      health: total ? Number((passed / total * 100).toFixed(1)) : 0,
      evidenceGrounded: profilesResolved,
      releaseAllowed: releaseAllowed,
      approvalGranted: false,
      authorityGranted: false,
      validatedAt: nowIso(),
      immutable: true
    });
    const contractValidation = typeof namespace.validateExternalIntelligenceContract === "function" ? namespace.validateExternalIntelligenceContract("releaseGate", record) : { valid: true };
    const schemaValidation = typeof namespace.validateExternalIntelligenceRecord === "function" ? namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-RELEASE-GATE", record) : { valid: true };
    if (!contractValidation.valid || !schemaValidation.valid) return internal.buildResult(false, "EXTERNAL010_RELEASE_GATE_CONTRACT_INVALID", "Blocked", { contractValidation: contractValidation, schemaValidation: schemaValidation });
    state.validationReleaseGates.set(record.releaseGateId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RELEASE_GATE_CREATED", releaseAllowed ? "Ready" : "Blocked", { releaseGate: clone(record) });
  }

  function getValidationFrameworkState() {
    return internal.deepFreeze({
      version: MODULE_VERSION,
      dimensions: DIMENSIONS.slice(),
      validationStates: VALIDATION_STATES.slice(),
      severities: SEVERITIES.slice(),
      purposes: PURPOSES.slice(),
      validationSuiteCount: state.validationSuites.size,
      goldenCaseCount: state.goldenValidationCases.size,
      validationProfileCount: state.validationProfiles.size,
      validationEvidenceCount: state.validationEvidenceRecords.size,
      releaseGateCount: state.validationReleaseGates.size,
      persistenceAdapterId: state.validationPersistence.adapterId,
      validationPassEqualsApproval: false,
      validationPassEqualsAuthorityGrant: false,
      platformHealthEqualsInformationTruth: false,
      mockPassEqualsRealRuntimeValidated: false,
      loadedAt: namespace.modules.validationFramework && namespace.modules.validationFramework.loadedAt || null
    });
  }

  function initializeExternalIntelligenceValidationFramework() {
    const suiteResults = DEFAULT_SUITE_DEFINITIONS.map(function add(definition) { return registerValidationSuite(Object.assign({}, definition, { introducedAt: "2026-09-10T00:00:00.000Z" })); });
    const goldenResults = DEFAULT_GOLDEN_CASES.map(function add(definition) { return registerGoldenValidationCase(Object.assign({}, definition, { createdAt: "2026-09-10T00:00:00.000Z" })); });
    if (!state.validationPersistence.adapter && global.localStorage) {
      try { setValidationPersistenceAdapter(createLocalStorageValidationPersistenceAdapter()); } catch (_) { /* memory/no persistence remains explicit */ }
    }
    const failed = suiteResults.concat(goldenResults).filter(function failed(item) { return !item.ok; });
    namespace.modules.validationFramework.status = failed.length ? "Blocked" : "Ready";
    internal.touch();
    return internal.buildResult(failed.length === 0, failed.length ? "EXTERNAL010_VALIDATION_FRAMEWORK_INITIALIZATION_FAILED" : "EXTERNAL010_VALIDATION_FRAMEWORK_INITIALIZED", failed.length ? "Blocked" : "Ready", { suiteCount: state.validationSuites.size, goldenCaseCount: state.goldenValidationCases.size, failures: failed.map(clone) });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceValidationFramework: initializeExternalIntelligenceValidationFramework,
    registerExternalIntelligenceValidationSuite: registerValidationSuite,
    getExternalIntelligenceValidationSuite: getValidationSuite,
    listExternalIntelligenceValidationSuites: listValidationSuites,
    registerExternalIntelligenceGoldenValidationCase: registerGoldenValidationCase,
    listExternalIntelligenceGoldenValidationCases: listGoldenValidationCases,
    createExternalIntelligenceMemoryValidationPersistenceAdapter: createMemoryValidationPersistenceAdapter,
    createExternalIntelligenceLocalStorageValidationPersistenceAdapter: createLocalStorageValidationPersistenceAdapter,
    setExternalIntelligenceValidationPersistenceAdapter: setValidationPersistenceAdapter,
    persistExternalIntelligenceValidationRecord: persistValidationRecord,
    readBackExternalIntelligenceValidationRecord: readBackValidationRecord,
    evaluateExternalIntelligenceValidationDimensions: evaluateValidationDimensions,
    runExternalIntelligenceValidation: runValidation,
    getExternalIntelligenceValidationProfile: getValidationProfile,
    listExternalIntelligenceValidationProfiles: listValidationProfiles,
    createExternalIntelligenceValidationEvidence: createValidationEvidence,
    createExternalIntelligenceRuntimeHealthValidation: createRuntimeHealthValidation,
    createExternalIntelligenceHistoricalReplayRecord: createHistoricalReplayRecord,
    createExternalIntelligenceDifferentialValidationRecord: createDifferentialValidationRecord,
    evaluateExternalIntelligenceGatewayRequestIntegrity: evaluateGatewayRequestIntegrity,
    createExternalIntelligenceReleaseGate: createReleaseGate,
    getExternalIntelligenceValidationFrameworkState: getValidationFrameworkState
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.validationFramework = {
    id: "EXTERNAL-010-MULTI-LAYER-VALIDATION-FRAMEWORK",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 15,
    primaryDecision: "044",
    supportingDecision: "054",
    purposeSpecific: true,
    historicalResultsImmutable: true,
    validationEqualsApproval: false,
    validationEqualsAuthority: false,
    truthAuthority: "EXTERNAL-020",
    persistenceHook: true,
    loadedAt: nowIso()
  };

  global.initializeExternalIntelligenceValidationFramework = initializeExternalIntelligenceValidationFramework;
})(typeof window !== "undefined" ? window : globalThis);
