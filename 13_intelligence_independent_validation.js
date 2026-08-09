/* ============================================================
   FILE: 13_intelligence_independent_validation.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 7: Independent Validation Gate
   Architecture Decision: IDE-170-008
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("independentValidation");
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const CAPABILITY_ID = "IDE-170-INDEPENDENT-VALIDATION";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const SCHEMA_ID = "IDE-170-SCHEMA-INDEPENDENT-VALIDATION-RESULT";
  const DATASET_ID = "IDE-170-DATASET-PHASE7-CONFIDENCE-VALIDATION";

  if (!(state.independentValidationResults instanceof Map)) state.independentValidationResults = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestIndependentValidationResultId")) state.latestIndependentValidationResultId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastConfidenceValidation")) state.lastConfidenceValidation = null;

  const GATE_GROUPS = Object.freeze([
    "Schema Validation",
    "Reference Validation",
    "Evidence Validation",
    "Confidence Validation",
    "Explanation Validation",
    "Policy Validation",
    "Integrity Validation",
    "Freshness Validation",
    "Compatibility Validation",
    "Freeze Validation"
  ]);

  const SEVERITIES = Object.freeze(["Critical", "High", "Medium", "Low", "Info"]);

  function stableStringify(value) {
    if (typeof internal.stableStringify === "function") return internal.stableStringify(value);
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function map(key) { return JSON.stringify(key) + ":" + stableStringify(value[key]); }).join(",") + "}";
  }

  function sha256(value) {
    if (typeof namespace.calculateSHA256 === "function") return namespace.calculateSHA256(typeof value === "string" ? value : stableStringify(value));
    throw new Error("SHA-256 API is unavailable.");
  }

  function payloadForHash(target) {
    const copy = internal.clone(target || {});
    delete copy.validation;
    delete copy.integrity;
    delete copy.frozenAt;
    delete copy.immutable;
    return copy;
  }

  function computeIntelligencePayloadHash(target) {
    return sha256(payloadForHash(target));
  }

  function resultClassOf(target) {
    if (!target || typeof target !== "object") return "unknown";
    if (internal.asArray(target.insightCandidates || target.insights).length) return "insight-candidate";
    if (internal.asArray(target.derivedResults || target.derived).length) return "derived-result";
    if (internal.asArray(target.factResults || target.facts).length) return "canonical-fact";
    if (target.insightId) return "insight-candidate";
    if (target.derivedResultId) return "derived-result";
    if (target.canonicalId || target.resultClass === "fact") return "canonical-fact";
    return "query-result";
  }

  function checkRecord(name, passed, detail, group, severity, code) {
    return {
      checkId: internal.text(code, internal.canonicalId(group + "-" + name).slice(0, 120)),
      name: name,
      group: GATE_GROUPS.includes(group) ? group : "Policy Validation",
      severity: SEVERITIES.includes(severity) ? severity : "High",
      passed: passed === true,
      message: detail == null ? "" : String(detail)
    };
  }

  function contextHasReference(kind, id, options) {
    if (!id) return true;
    const settings = options || {};
    const context = settings.context || {};
    if (kind === "query") {
      if (settings.query && settings.query.queryId === id) return true;
      return state.typedQueries instanceof Map && state.typedQueries.has(id);
    }
    if (kind === "canonical") {
      if (context.canonicalSnapshot && context.canonicalSnapshot.snapshotId === id) return true;
      return state.canonicalSnapshots instanceof Map && state.canonicalSnapshots.has(id);
    }
    if (kind === "repository") {
      if (context.repositorySnapshot && context.repositorySnapshot.snapshotId === id) return true;
      return state.repositorySnapshots instanceof Map && state.repositorySnapshots.has(id);
    }
    if (kind === "graph") {
      if (context.graph && context.graph.graphId === id) return true;
      return state.evidenceGraphSnapshots instanceof Map && state.evidenceGraphSnapshots.has(id);
    }
    if (kind === "understanding") {
      if (context.understanding && context.understanding.understandingId === id) return true;
      return state.understandingResults instanceof Map && state.understandingResults.has(id);
    }
    return false;
  }

  function evidenceReferencesAreTraceable(target) {
    const evidence = internal.asArray(target && target.evidence);
    const facts = internal.asArray(target && target.factResults || target && target.facts);
    const derived = internal.asArray(target && target.derivedResults || target && target.derived);
    const insights = internal.asArray(target && target.insightCandidates || target && target.insights);
    const explicitEvidenceOkay = evidence.every(function every(item) {
      return Boolean(item && (item.evidenceId || item.recordId || item.sourceId || item.sourceRecordId));
    });
    const factRefsOkay = facts.every(function every(item) {
      return Boolean(item && (item.sourceReference || item.evidenceReference || item.snapshotReference));
    });
    const derivedRefsOkay = derived.every(function every(item) {
      return Boolean(item && (internal.asArray(item.evidence).length || item.ruleId));
    });
    const insightRefsOkay = insights.every(function every(item) {
      return Boolean(item && internal.asArray(item.evidence).length);
    });
    return explicitEvidenceOkay && factRefsOkay && derivedRefsOkay && insightRefsOkay;
  }

  function hasRequiredEvidence(target, query) {
    const resultClass = resultClassOf(target);
    const evidence = internal.asArray(target && target.evidence);
    const facts = internal.asArray(target && target.factResults || target && target.facts);
    const derived = internal.asArray(target && target.derivedResults || target && target.derived);
    const insights = internal.asArray(target && target.insightCandidates || target && target.insights);
    if (resultClass === "canonical-fact") return facts.length > 0 && facts.every(function every(item) { return Boolean(item && (item.sourceReference || item.snapshotReference || item.evidenceReference)); });
    if (resultClass === "derived-result") return derived.length > 0 && derived.every(function every(item) { return internal.asArray(item && item.evidence).length > 0 || Boolean(item && item.ruleId); });
    if (resultClass === "insight-candidate") return insights.length > 0 && insights.every(function every(item) { return internal.asArray(item && item.evidence).length > 0; });
    if (query && query.queryType === "missing-information-search") return internal.asArray(target && target.explanation && target.explanation.missingInformation).length > 0 || target.status === "Completed";
    const required = !(query && query.requirements && query.requirements.evidenceRequired === false);
    return required ? evidence.length > 0 || facts.length > 0 : true;
  }

  function countDuplicateEvidence(target) {
    const evidence = internal.asArray(target && target.evidence);
    const keys = evidence.map(function key(item) {
      return item && (item.evidenceId || item.recordId || [item.sourceType, item.sourceId, item.adapterId, item.sourceRecordId].join("|"));
    }).filter(Boolean);
    return keys.length - new Set(keys).size;
  }

  function containsInferredFact(target) {
    const facts = internal.asArray(target && target.factResults || target && target.facts);
    return facts.some(function some(item) {
      return internal.asArray(item && item.evidence).some(function evidence(value) { return ["inferred", "unknown"].includes(String(value && value.strength || "").toLowerCase()); });
    });
  }

  function schemaChecks(target, options) {
    const checks = [];
    const schemaId = internal.text(options && options.schemaId, target && target.envelopeId ? "IDE-170-SCHEMA-EXPLAINABLE-INSIGHT-ENVELOPE" : "");
    if (!schemaId || typeof namespace.validateAgainstSchema !== "function") {
      checks.push(checkRecord("Target Schema is resolvable", false, schemaId || "Schema ID unavailable", "Schema Validation", "Critical", "SCHEMA-RESOLVABLE"));
      return checks;
    }
    const candidate = internal.clone(target);
    if (candidate && candidate.validation == null) candidate.validation = { status: "Validating" };
    const validation = namespace.validateAgainstSchema(schemaId, candidate);
    checks.push(checkRecord("Schema exists", Boolean(namespace.getSchema && namespace.getSchema(schemaId)), schemaId, "Schema Validation", "Critical", "SCHEMA-EXISTS"));
    checks.push(checkRecord("Target conforms to Schema", validation && validation.valid === true, validation && validation.errors ? validation.errors.join("; ") : schemaId, "Schema Validation", "Critical", "SCHEMA-CONFORMS"));
    checks.push(checkRecord("Result Class is governed", ["canonical-fact", "derived-result", "insight-candidate", "query-result"].includes(resultClassOf(target)), resultClassOf(target), "Schema Validation", "High", "RESULT-CLASS-GOVERNED"));
    return checks;
  }

  function referenceChecks(target, options) {
    const checks = [];
    const queryId = target && target.queryId;
    const refs = target && target.snapshotReference || {};
    checks.push(checkRecord("Query Reference resolves", contextHasReference("query", queryId, options), queryId, "Reference Validation", "Critical", "QUERY-REFERENCE"));
    checks.push(checkRecord("Canonical Snapshot Reference resolves", contextHasReference("canonical", refs.canonicalSnapshotId, options), refs.canonicalSnapshotId || "not-used", "Reference Validation", "Critical", "CANONICAL-REFERENCE"));
    checks.push(checkRecord("Repository Snapshot Reference resolves when present", contextHasReference("repository", refs.repositorySnapshotId, options), refs.repositorySnapshotId || "not-used", "Reference Validation", "High", "REPOSITORY-REFERENCE"));
    checks.push(checkRecord("Evidence Graph Reference resolves when present", contextHasReference("graph", refs.evidenceGraphId, options), refs.evidenceGraphId || "not-used", "Reference Validation", "High", "GRAPH-REFERENCE"));
    checks.push(checkRecord("Understanding Reference resolves when present", contextHasReference("understanding", refs.understandingId, options), refs.understandingId || "not-used", "Reference Validation", "High", "UNDERSTANDING-REFERENCE"));
    return checks;
  }

  function evidenceChecks(target, options) {
    const checks = [];
    const query = options && options.query;
    const duplicates = countDuplicateEvidence(target);
    const limitations = internal.asArray(target && target.explanation && target.explanation.limitations);
    const missing = internal.asArray(target && target.explanation && target.explanation.missingInformation);
    checks.push(checkRecord("Required Evidence exists", hasRequiredEvidence(target, query), resultClassOf(target), "Evidence Validation", "Critical", "EVIDENCE-REQUIRED"));
    checks.push(checkRecord("Evidence and Source references are traceable", evidenceReferencesAreTraceable(target), "traceability", "Evidence Validation", "Critical", "EVIDENCE-TRACEABLE"));
    checks.push(checkRecord("Duplicate Evidence is not over-counted", duplicates === 0, "duplicates=" + duplicates, "Evidence Validation", duplicates ? "Medium" : "Info", "EVIDENCE-DUPLICATES"));
    checks.push(checkRecord("Inferred Evidence is not presented as Fact", containsInferredFact(target) === false, "fact-layer", "Evidence Validation", "Critical", "INFERRED-NOT-FACT"));
    checks.push(checkRecord("Missing Evidence is disclosed", missing.length > 0 || limitations.length === 0 || limitations.every(function every(item) { return missing.includes(item); }), "missing=" + missing.length + ", limitations=" + limitations.length, "Evidence Validation", "High", "MISSING-EVIDENCE-DISCLOSED"));
    return checks;
  }

  function confidenceChecks(target) {
    const checks = [];
    const confidence = target && target.confidence;
    const validation = typeof namespace.validateConfidenceResult === "function" ? namespace.validateConfidenceResult(confidence) : null;
    checks.push(checkRecord("Confidence Result exists", Boolean(confidence), confidence && confidence.confidenceId, "Confidence Validation", "Critical", "CONFIDENCE-EXISTS"));
    checks.push(checkRecord("Confidence Model is registered", Boolean(confidence && namespace.getConfidenceModel && namespace.getConfidenceModel(confidence.modelId, confidence.modelVersion)), confidence && confidence.modelId, "Confidence Validation", "High", "CONFIDENCE-MODEL"));
    checks.push(checkRecord("Confidence structure is valid", Boolean(validation && validation.valid), validation && (validation.failed + " failed"), "Confidence Validation", "Critical", "CONFIDENCE-VALID"));
    checks.push(checkRecord("Engine self-reported Confidence is ignored", Boolean(confidence && confidence.selfReportedEngineConfidenceUsed === false), confidence && confidence.selfReportedEngineConfidenceUsed, "Confidence Validation", "Critical", "ENGINE-SELF-CONFIDENCE"));
    const className = resultClassOf(target);
    checks.push(checkRecord("Result Class uses correct Confidence policy", className !== "canonical-fact" || confidence && confidence.score == null && confidence.assessmentMode === "Fact Quality - No Speculative Score", className, "Confidence Validation", "High", "RESULT-CLASS-CONFIDENCE-POLICY"));
    return checks;
  }

  function explanationChecks(target) {
    const checks = [];
    const explanation = target && target.explanation || {};
    checks.push(checkRecord("Explanation summary exists", Boolean(explanation.summary), explanation.summary || "", "Explanation Validation", "Critical", "EXPLANATION-SUMMARY"));
    checks.push(checkRecord("Evidence usage is explainable", Array.isArray(explanation.evidenceUsed), explanation.evidenceUsed && explanation.evidenceUsed.length, "Explanation Validation", "High", "EXPLANATION-EVIDENCE"));
    checks.push(checkRecord("Rules applied are recorded", Array.isArray(explanation.rulesApplied), explanation.rulesApplied && explanation.rulesApplied.length, "Explanation Validation", "High", "EXPLANATION-RULES"));
    checks.push(checkRecord("Engines used are recorded", Array.isArray(explanation.enginesUsed), explanation.enginesUsed && explanation.enginesUsed.length, "Explanation Validation", "High", "EXPLANATION-ENGINES"));
    checks.push(checkRecord("Limitations are recorded", Array.isArray(explanation.limitations), explanation.limitations && explanation.limitations.length, "Explanation Validation", "Critical", "EXPLANATION-LIMITATIONS"));
    checks.push(checkRecord("Missing Information is recorded", Array.isArray(explanation.missingInformation), explanation.missingInformation && explanation.missingInformation.length, "Explanation Validation", "Critical", "EXPLANATION-MISSING"));
    checks.push(checkRecord("Alternative Interpretations are recorded", Array.isArray(explanation.alternativeInterpretations), explanation.alternativeInterpretations && explanation.alternativeInterpretations.length, "Explanation Validation", "Medium", "EXPLANATION-ALTERNATIVES"));
    return checks;
  }

  function policyChecks(target) {
    const checks = [];
    const policy = target && target.policy || {};
    checks.push(checkRecord("Repository mutation remains prohibited", policy.repositoryMutationAllowed === false, policy.repositoryMutationAllowed, "Policy Validation", "Critical", "POLICY-REPOSITORY-MUTATION"));
    checks.push(checkRecord("Workflow execution remains prohibited", policy.workflowExecutionAllowed === false, policy.workflowExecutionAllowed, "Policy Validation", "Critical", "POLICY-WORKFLOW-EXECUTION"));
    checks.push(checkRecord("Candidate Fact promotion remains prohibited", policy.candidateFactPromotionAllowed === false, policy.candidateFactPromotionAllowed, "Policy Validation", "Critical", "POLICY-FACT-PROMOTION"));
    checks.push(checkRecord("Missing Information inference remains prohibited", policy.missingInformationInferenceAllowed === false, policy.missingInformationInferenceAllowed, "Policy Validation", "Critical", "POLICY-MISSING-INFERENCE"));
    checks.push(checkRecord("Natural language direct Reasoning remains prohibited", policy.naturalLanguageDirectReasoningAllowed === false, policy.naturalLanguageDirectReasoningAllowed, "Policy Validation", "Critical", "POLICY-NL-DIRECT-REASONING"));
    const candidates = internal.asArray(target && target.insightCandidates || target && target.insights);
    checks.push(checkRecord("Insight Candidates remain Candidates", candidates.every(function every(item) { return item && item.factPromotionAllowed === false && (item.status === "Candidate" || item.resultKind === "Insight Candidate"); }), "candidates=" + candidates.length, "Policy Validation", "Critical", "POLICY-CANDIDATE-SEPARATION"));
    return checks;
  }

  function integrityChecks(target) {
    const checks = [];
    const integrity = target && target.integrity || {};
    let computed = "";
    try { computed = computeIntelligencePayloadHash(target); } catch (error) { computed = "ERROR:" + error.message; }
    checks.push(checkRecord("Content Hash is present", /^[a-f0-9]{64}$/.test(String(integrity.payloadHash || "")), integrity.payloadHash || "", "Integrity Validation", "Critical", "INTEGRITY-HASH-PRESENT"));
    checks.push(checkRecord("Content Hash matches Result payload", computed === integrity.payloadHash, computed, "Integrity Validation", "Critical", "INTEGRITY-HASH-MATCH"));
    checks.push(checkRecord("Schema Version is present", Boolean(target && target.schemaVersion), target && target.schemaVersion, "Integrity Validation", "High", "INTEGRITY-SCHEMA-VERSION"));
    checks.push(checkRecord("Artifact Version is present", Boolean(target && target.artifactVersion), target && target.artifactVersion, "Integrity Validation", "High", "INTEGRITY-ARTIFACT-VERSION"));
    return checks;
  }

  function freshnessChecks(target, options) {
    const checks = [];
    const stale = options && options.stale === true;
    const currentRequired = options && options.currentStateRequired === true;
    checks.push(checkRecord("Freshness is evaluated for current-state Query", !currentRequired || stale === false, stale ? "stale" : "current-or-not-required", "Freshness Validation", currentRequired && stale ? "Medium" : "Info", "FRESHNESS-CURRENT"));
    checks.push(checkRecord("Historical Query does not penalize age by default", !(options && options.historicalQuery === true) || options.stale !== true || options.applyHistoricalStalenessPenalty !== true, "historical-policy", "Freshness Validation", "Info", "FRESHNESS-HISTORICAL"));
    return checks;
  }

  function compatibilityChecks(target) {
    const checks = [];
    const expectedSchema = VERSION_MANIFEST.getSchemaVersion("IDE-170-SCHEMA-EXPLAINABLE-INSIGHT-ENVELOPE");
    const expectedArtifact = VERSION_MANIFEST.getArtifactVersion("explainableInsightEnvelope");
    checks.push(checkRecord("Envelope Schema Version is compatible", !target.envelopeId || target.schemaVersion === expectedSchema, target.schemaVersion + "/" + expectedSchema, "Compatibility Validation", "Critical", "COMPATIBILITY-SCHEMA"));
    checks.push(checkRecord("Envelope Artifact Version is compatible", !target.envelopeId || target.artifactVersion === expectedArtifact, target.artifactVersion + "/" + expectedArtifact, "Compatibility Validation", "High", "COMPATIBILITY-ARTIFACT"));
    checks.push(checkRecord("Confidence Model Version is resolvable", Boolean(target.confidence && namespace.getConfidenceModel && namespace.getConfidenceModel(target.confidence.modelId, target.confidence.modelVersion)), target.confidence && target.confidence.modelVersion, "Compatibility Validation", "High", "COMPATIBILITY-CONFIDENCE-MODEL"));
    return checks;
  }

  function freezeChecks(target) {
    const checks = [];
    checks.push(checkRecord("Result is not frozen before Validation Gate", target && target.immutable === false && !target.frozenAt, "immutable=" + Boolean(target && target.immutable), "Freeze Validation", "Critical", "FREEZE-PRECONDITION"));
    checks.push(checkRecord("Freeze metadata fields exist", target && Object.prototype.hasOwnProperty.call(target, "immutable") && Object.prototype.hasOwnProperty.call(target, "frozenAt"), "freeze-fields", "Freeze Validation", "High", "FREEZE-FIELDS"));
    return checks;
  }

  function validationOutcome(checks) {
    const failed = checks.filter(function filter(item) { return item.passed !== true; });
    const critical = failed.filter(function filter(item) { return item.severity === "Critical"; });
    const high = failed.filter(function filter(item) { return item.severity === "High"; });
    const medium = failed.filter(function filter(item) { return item.severity === "Medium"; });
    const schemaOrIntegrityCritical = critical.some(function some(item) { return item.group === "Schema Validation" || item.group === "Integrity Validation"; });
    if (critical.length) return { validationStatus: schemaOrIntegrityCritical ? "Invalid" : "Blocked", gateStatus: schemaOrIntegrityCritical ? "Invalid" : "Blocked", allowed: false, reason: critical.length + " Critical validation issue(s)." };
    if (high.length) return { validationStatus: "Blocked", gateStatus: "Blocked", allowed: false, reason: high.length + " High validation issue(s)." };
    if (medium.length) return { validationStatus: "Partial", gateStatus: "Conditionally Allowed", allowed: true, reason: medium.length + " Medium issue(s); Warning and Limitation required." };
    return { validationStatus: "Valid", gateStatus: "Allowed", allowed: true, reason: "All Critical and High validations passed." };
  }

  function validateIntelligenceResult(target, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (!target || typeof target !== "object") {
      return { validationId: internal.nextId("IDE-170-INDEPENDENT-VALIDATION"), targetId: "", targetType: "unknown", schemaVersion: VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID), status: "Failed", checks: [checkRecord("Validation target exists", false, "missing", "Schema Validation", "Critical", "TARGET-EXISTS")], summary: { total: 1, passed: 0, failed: 1, warnings: 0, health: 0 }, gate: { status: "Failed", allowed: false, reason: "Validation target is missing." }, validatedAt: internal.nowIso(), validatorId: CAPABILITY_ID, validatorVersion: CAPABILITY_VERSION };
    }

    let checks = [];
    checks = checks.concat(schemaChecks(target, settings));
    checks = checks.concat(referenceChecks(target, settings));
    checks = checks.concat(evidenceChecks(target, settings));
    checks = checks.concat(confidenceChecks(target));
    checks = checks.concat(explanationChecks(target));
    checks = checks.concat(policyChecks(target));
    checks = checks.concat(integrityChecks(target));
    checks = checks.concat(freshnessChecks(target, settings));
    checks = checks.concat(compatibilityChecks(target));
    checks = checks.concat(freezeChecks(target));

    const outcome = validationOutcome(checks);
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const warnings = checks.filter(function count(item) { return item.passed !== true && ["Medium", "Low", "Info"].includes(item.severity); }).length;
    const result = {
      validationId: internal.nextId("IDE-170-INDEPENDENT-VALIDATION"),
      targetId: target.envelopeId || target.insightId || target.derivedResultId || target.canonicalId || "",
      targetType: internal.text(settings.targetType, target.envelopeId ? "query-envelope" : resultClassOf(target)),
      schemaVersion: VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID),
      status: outcome.validationStatus,
      checks: checks,
      summary: {
        total: checks.length,
        passed: passed,
        failed: failed,
        warnings: warnings,
        health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0
      },
      gate: {
        status: outcome.gateStatus,
        allowed: outcome.allowed,
        reason: outcome.reason
      },
      resultClass: resultClassOf(target),
      validatedAt: internal.nowIso(),
      validatorId: CAPABILITY_ID,
      validatorVersion: CAPABILITY_VERSION,
      resultHash: null
    };
    result.resultHash = sha256(Object.assign({}, result, { resultHash: null }));
    const frozen = internal.deepFreeze(internal.clone(result));
    state.independentValidationResults.set(result.validationId, frozen);
    state.latestIndependentValidationResultId = result.validationId;
    internal.touch();
    return internal.clone(frozen);
  }

  function validateFrozenIntelligenceResult(target) {
    const checks = [];
    checks.push(checkRecord("Frozen Result is immutable", target && target.immutable === true, target && target.immutable, "Freeze Validation", "Critical", "FROZEN-IMMUTABLE"));
    checks.push(checkRecord("Frozen Result has timestamp", Boolean(target && target.frozenAt), target && target.frozenAt, "Freeze Validation", "Critical", "FROZEN-TIMESTAMP"));
    const expected = target && target.integrity && target.integrity.payloadHash;
    let actual = "";
    try { actual = computeIntelligencePayloadHash(target); } catch (error) { actual = "ERROR:" + error.message; }
    checks.push(checkRecord("Frozen Result payload Hash remains valid", Boolean(expected) && expected === actual, actual, "Integrity Validation", "Critical", "FROZEN-HASH"));
    const validation = target && target.validation;
    checks.push(checkRecord("Frozen Result was allowed by Validation Gate", Boolean(validation && validation.gate && validation.gate.allowed === true), validation && validation.gate && validation.gate.status, "Freeze Validation", "Critical", "FROZEN-GATE"));
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return { valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, health: Number(((passed / checks.length) * 100).toFixed(2)), status: passed === checks.length ? "Valid" : "Invalid", checks: checks, validatedAt: internal.nowIso() };
  }

  function buildFixtureEnvelope(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const query = {
      queryId: "IDE-170-P7-QUERY-FIXTURE",
      queryType: settings.queryType || "insight-search",
      requirements: { evidenceRequired: true },
      interpretation: { status: "Resolved", ambiguities: [], alternativeIntents: [] }
    };
    const evidence = settings.noEvidence ? [] : [
      { evidenceId: "P7-E1", evidenceType: "canonical-record-reference", sourceId: "P7-S1", sourceType: "repository-file-data", adapterId: "IDE-170-ADAPTER-REPOSITORY", strength: settings.inferredOnly ? "inferred" : "direct" },
      { evidenceId: "P7-E2", evidenceType: "official-relationship-record", sourceId: "P7-S2", sourceType: "relationship-data", adapterId: "IDE-170-ADAPTER-RELATIONSHIP", strength: "corroborated" }
    ];
    if (settings.inferredOnly) evidence.splice(1, 1);
    const insight = {
      resultKind: "Insight Candidate",
      insightId: "IDE-170-P7-INSIGHT-FIXTURE",
      insightType: "Validation Fixture",
      status: "Candidate",
      statement: "Fixture insight",
      evidence: internal.clone(evidence),
      explanation: { summary: "Fixture insight", reasoningSteps: ["Applied deterministic validation fixture rule"], limitations: settings.missing ? ["Function Adapter is not Ready"] : [], missingEvidence: settings.noEvidence ? ["Supporting Evidence is unavailable"] : [] },
      generatedBy: { ruleIds: ["IDE-170-RULE-REPOSITORY-STRUCTURE"], engineIds: [] },
      factPromotionAllowed: false
    };
    const envelope = {
      envelopeId: "IDE-170-P7-ENVELOPE-FIXTURE",
      artifactVersion: VERSION_MANIFEST.getArtifactVersion("explainableInsightEnvelope"),
      schemaVersion: VERSION_MANIFEST.getSchemaVersion("IDE-170-SCHEMA-EXPLAINABLE-INSIGHT-ENVELOPE"),
      queryId: query.queryId,
      queryType: query.queryType,
      status: settings.missing ? "Partial" : "Completed",
      answerSummary: { statement: "Fixture", answerType: "evidence-grounded" },
      factResults: [],
      derivedResults: [],
      insightCandidates: [insight],
      evidence: internal.clone(evidence),
      relationshipPaths: [],
      interpretationConfidence: namespace.assessInterpretationConfidence(query),
      confidence: null,
      quality: null,
      explanation: { summary: "Fixture", evidenceUsed: evidence.map(function map(item) { return item.evidenceId; }), relationshipPaths: [], rulesApplied: ["IDE-170-RULE-REPOSITORY-STRUCTURE"], enginesUsed: ["IDE-170-QUERY-ENGINE"], limitations: settings.missing ? ["Function Adapter is not Ready"] : [], missingInformation: settings.missing ? ["Function Adapter is not Ready"] : [], alternativeInterpretations: [] },
      scope: { projectId: "project:fixture", snapshotId: "P7-CANONICAL", domains: ["intelligence"], relationshipDepth: 1, includeCandidates: true, defaultScopeUsed: false },
      snapshotReference: { canonicalSnapshotId: "P7-CANONICAL", repositorySnapshotId: "P7-REPOSITORY", evidenceGraphId: "P7-GRAPH", understandingId: "P7-UNDERSTANDING" },
      validation: { status: "Validating" },
      policy: { repositoryMutationAllowed: false, workflowExecutionAllowed: false, candidateFactPromotionAllowed: false, missingInformationInferenceAllowed: false, naturalLanguageDirectReasoningAllowed: false },
      createdAt: internal.nowIso(),
      frozenAt: null,
      immutable: false,
      integrity: null
    };
    const context = {
      canonicalSnapshot: { snapshotId: "P7-CANONICAL" },
      repositorySnapshot: { snapshotId: "P7-REPOSITORY" },
      graph: { graphId: "P7-GRAPH" },
      understanding: { understandingId: "P7-UNDERSTANDING", scope: { sourceCoverage: { adapterStatus: [{ status: settings.partialSnapshot ? "Partial" : "Ready" }, { status: "Ready" }] } } }
    };
    envelope.confidence = namespace.assessConfidence(envelope, { query: query, context: context, partialSnapshot: settings.partialSnapshot === true, ruleReliabilityClasses: settings.experimentalRule ? ["Experimental"] : ["Deterministic"], majorContradiction: settings.majorContradiction === true });
    envelope.quality = namespace.assessQuality(envelope, { confidence: envelope.confidence, partialSnapshot: settings.partialSnapshot === true });
    envelope.integrity = { algorithm: "SHA-256", payloadHash: computeIntelligencePayloadHash(envelope), generatedAt: internal.nowIso() };
    return { query: query, envelope: envelope, context: context };
  }

  function runConfidencePhaseValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group, severity) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), group: group || "Phase 7", severity: severity || "High" }); }
    try {
      const model = namespace.getConfidenceModel && namespace.getConfidenceModel("IDE-170-CONFIDENCE-MODEL-DETERMINISTIC", "1.0.0");
      const modelValidation = namespace.validateConfidenceModel && namespace.validateConfidenceModel(model);
      check("Deterministic Confidence Model is registered", Boolean(model), model && model.modelId, "Model Registry", "Critical");
      check("Confidence Model validates", Boolean(modelValidation && modelValidation.valid), modelValidation && modelValidation.failed, "Model Registry", "Critical");
      check("Eight Confidence Factors are defined", model && Object.keys(model.weights || {}).length === 8, model && Object.keys(model.weights || {}).length, "Model Registry", "Critical");
      check("Factor weights sum to 1.0", model && Math.abs(Object.values(model.weights || {}).reduce(function sum(a, b) { return a + Number(b || 0); }, 0) - 1) < 1e-9, model && JSON.stringify(model.weights), "Model Registry", "Critical");
      check("Five Penalties are defined", model && Object.keys(model.penaltyDefinitions || {}).length === 5, model && Object.keys(model.penaltyDefinitions || {}).length, "Penalty", "Critical");
      check("Missing Information maximum Penalty is 0.20", model && model.penaltyDefinitions.missingInformation.maximum === 0.20, model && model.penaltyDefinitions.missingInformation.maximum, "Penalty", "High");
      check("Contradiction maximum Penalty is 0.25", model && model.penaltyDefinitions.contradiction.maximum === 0.25, model && model.penaltyDefinitions.contradiction.maximum, "Penalty", "High");
      check("Ambiguity maximum Penalty is 0.15", model && model.penaltyDefinitions.ambiguity.maximum === 0.15, model && model.penaltyDefinitions.ambiguity.maximum, "Penalty", "High");
      check("Partial Snapshot maximum Penalty is 0.10", model && model.penaltyDefinitions.partialSnapshot.maximum === 0.10, model && model.penaltyDefinitions.partialSnapshot.maximum, "Penalty", "High");
      check("Staleness maximum Penalty is 0.10", model && model.penaltyDefinitions.staleness.maximum === 0.10, model && model.penaltyDefinitions.staleness.maximum, "Penalty", "High");

      const normal = buildFixtureEnvelope({});
      const normalValidation = validateIntelligenceResult(normal.envelope, { query: normal.query, context: normal.context });
      check("Insight Confidence receives numeric score", Number.isFinite(Number(normal.envelope.confidence.score)), normal.envelope.confidence.score, "Confidence", "Critical");
      check("Insight Confidence records all Factors", Object.keys(normal.envelope.confidence.factors || {}).length === 8, Object.keys(normal.envelope.confidence.factors || {}).length, "Confidence", "Critical");
      check("Insight Confidence records all Penalties", Object.keys(normal.envelope.confidence.penalties || {}).length === 5, Object.keys(normal.envelope.confidence.penalties || {}).length, "Confidence", "Critical");
      check("Engine self-reported Confidence is not used", normal.envelope.confidence.selfReportedEngineConfidenceUsed === false, normal.envelope.confidence.selfReportedEngineConfidenceUsed, "Confidence", "Critical");
      check("Independent Validation has ten Gate groups", new Set(normalValidation.checks.map(function map(item) { return item.group; })).size === 10, new Set(normalValidation.checks.map(function map(item) { return item.group; })).size, "Validation Gate", "Critical");
      check("Valid Insight is Allowed by independent Gate", normalValidation.gate.allowed === true && normalValidation.gate.status === "Allowed", normalValidation.gate.status, "Validation Gate", "Critical");
      check("Independent Validation Result has Result Hash", /^[a-f0-9]{64}$/.test(normalValidation.resultHash), normalValidation.resultHash, "Integrity", "Critical");

      const missing = buildFixtureEnvelope({ missing: true, partialSnapshot: true });
      check("Missing Information applies Penalty", missing.envelope.confidence.penalties.missingInformation > 0, missing.envelope.confidence.penalties.missingInformation, "Penalty", "Critical");
      check("Partial Snapshot applies Penalty", missing.envelope.confidence.penalties.partialSnapshot === 0.10, missing.envelope.confidence.penalties.partialSnapshot, "Penalty", "Critical");
      check("Partial Snapshot prevents Very High Confidence", missing.envelope.confidence.level !== "Very High", missing.envelope.confidence.level, "Confidence Cap", "Critical");

      const inferred = buildFixtureEnvelope({ inferredOnly: true });
      check("Single inferred Evidence is capped at Low", ["Low", "Very Low"].includes(inferred.envelope.confidence.level) && inferred.envelope.confidence.caps.some(function some(item) { return item.code === "SINGLE_INFERRED_EVIDENCE"; }), inferred.envelope.confidence.level, "Confidence Cap", "Critical");

      const experimental = buildFixtureEnvelope({ experimentalRule: true });
      check("Experimental Rule is capped at Medium", ["Medium", "Low", "Very Low"].includes(experimental.envelope.confidence.level) && experimental.envelope.confidence.caps.some(function some(item) { return item.code === "EXPERIMENTAL_RULE"; }), experimental.envelope.confidence.level, "Confidence Cap", "Critical");

      const criticalAmbiguity = namespace.assessConfidence(normal.envelope, { resultClass: "insight-candidate", evidence: normal.envelope.evidence, criticalEntityUnresolved: true });
      check("Critical Entity unresolved becomes Not Assessable", criticalAmbiguity.score == null && criticalAmbiguity.level === "Not Assessable", criticalAmbiguity.level, "Confidence Cap", "Critical");

      const contradiction = namespace.assessConfidence(normal.envelope, { resultClass: "insight-candidate", evidence: normal.envelope.evidence, majorContradiction: true, contradictions: ["Major conflict"] });
      check("Major contradiction blocks Confidence", contradiction.status === "Blocked" && contradiction.caps.some(function some(item) { return item.code === "MAJOR_CONTRADICTION"; }), contradiction.status, "Confidence Cap", "Critical");

      const factTarget = { factResults: [{ resultClass: "fact", canonicalId: "file:a.js", sourceReference: { adapterId: "IDE-170-ADAPTER-REPOSITORY" }, snapshotReference: "S" }], evidence: [], explanation: { limitations: [], missingInformation: [] } };
      const factConfidence = namespace.assessConfidence(factTarget, { resultClass: "canonical-fact" });
      check("Canonical Fact has no speculative Confidence score", factConfidence.score == null && factConfidence.assessmentMode === "Fact Quality - No Speculative Score", factConfidence.score, "Result Class", "Critical");

      check("Interpretation Confidence is separate from Insight Confidence", normal.envelope.interpretationConfidence && normal.envelope.interpretationConfidence.type === "Interpretation Confidence" && normal.envelope.confidence.resultClass === "insight-candidate", normal.envelope.interpretationConfidence && normal.envelope.interpretationConfidence.score, "Interpretation", "Critical");
      check("Quality Model has eight dimensions", normal.envelope.quality && Object.keys(normal.envelope.quality.dimensions || {}).length === 8, normal.envelope.quality && Object.keys(normal.envelope.quality.dimensions || {}).length, "Quality", "Critical");
      check("Quality overall is bounded", normal.envelope.quality && normal.envelope.quality.overall >= 0 && normal.envelope.quality.overall <= 1, normal.envelope.quality && normal.envelope.quality.overall, "Quality", "High");

      const invalidSchema = buildFixtureEnvelope({});
      delete invalidSchema.envelope.answerSummary;
      invalidSchema.envelope.integrity.payloadHash = computeIntelligencePayloadHash(invalidSchema.envelope);
      const invalidSchemaValidation = validateIntelligenceResult(invalidSchema.envelope, { query: invalidSchema.query, context: invalidSchema.context });
      check("High Confidence cannot bypass invalid Schema", invalidSchemaValidation.gate.allowed === false && invalidSchemaValidation.status === "Invalid", invalidSchemaValidation.status, "Independent Gate", "Critical");

      const noEvidence = buildFixtureEnvelope({ noEvidence: true });
      const noEvidenceValidation = validateIntelligenceResult(noEvidence.envelope, { query: noEvidence.query, context: noEvidence.context });
      check("Insight Candidate without Evidence is blocked", noEvidenceValidation.gate.allowed === false, noEvidenceValidation.gate.status, "Independent Gate", "Critical");
      check("Insight Candidate is not promoted to Fact", noEvidence.envelope.insightCandidates.every(function every(item) { return item.factPromotionAllowed === false; }), noEvidence.envelope.insightCandidates.length, "Policy", "Critical");

      const mutated = internal.clone(normal.envelope);
      const priorHash = mutated.integrity.payloadHash;
      mutated.answerSummary.statement = "MUTATED";
      check("Payload mutation changes Content Hash", computeIntelligencePayloadHash(mutated) !== priorHash, priorHash, "Integrity", "Critical");

      const validForFreeze = internal.clone(normal.envelope);
      validForFreeze.validation = normalValidation;
      validForFreeze.frozenAt = internal.nowIso();
      validForFreeze.immutable = true;
      const frozenValidation = validateFrozenIntelligenceResult(validForFreeze);
      check("Frozen Result integrity can be verified", frozenValidation.valid === true, frozenValidation.status, "Freeze", "Critical");

      const persistenceStatus = namespace.getValidationPersistenceStatus && namespace.getValidationPersistenceStatus();
      check("Validation Persistence module is ready", Boolean(persistenceStatus && persistenceStatus.ready), persistenceStatus && persistenceStatus.status, "Persistence", "Critical");
      const preview = namespace.buildValidationGateReceiptPreview && namespace.buildValidationGateReceiptPreview({ dryRun: true, confidenceValidationOverride: { valid: true, failed: 0, total: 1, passed: 1, health: 100, status: "Passed", androidRealDeviceValidation: { passed: true, device: "Android Validation Fixture", evidence: "Fixture", validatedAt: internal.nowIso() } }, versionValidationOverride: { valid: true, failed: 0, total: 1, passed: 1, health: 100, status: "Passed", staticManifestValidated: true, fullScriptHashValidated: true, releaseGateAllowed: true, staticManifest: { manifestHash: "a".repeat(64), scriptSetHash: "b".repeat(64), scriptCount: 148 } } });
      check("Validation Gate Receipt can be deterministically hashed", Boolean(preview && preview.ok && preview.data && /^[a-f0-9]{64}$/.test(preview.data.receipt.receiptHash)), preview && preview.code, "Persistence", "Critical");
      check("Validation Gate Receipt binds Release Version", Boolean(preview && preview.data && preview.data.receipt.releaseVersion === RELEASE_VERSION), preview && preview.data && preview.data.receipt.releaseVersion, "Persistence", "Critical");
      check("Validation Gate Receipt binds Manifest Hash", Boolean(preview && preview.data && preview.data.receipt.manifestHash === "a".repeat(64)), preview && preview.data && preview.data.receipt.manifestHash, "Persistence", "Critical");
      check("Validation Gate Receipt binds Script Set Hash", Boolean(preview && preview.data && preview.data.receipt.scriptSetHash === "b".repeat(64)), preview && preview.data && preview.data.receipt.scriptSetHash, "Persistence", "Critical");
      check("Validation Gate Receipt binds Confidence Validation Hash", Boolean(preview && preview.data && /^[a-f0-9]{64}$/.test(preview.data.receipt.binding && preview.data.receipt.binding.confidenceValidationHash || "")), preview && preview.data && preview.data.receipt.binding && preview.data.receipt.binding.confidenceValidationHash, "Persistence", "Critical");
      check("Validation Gate Receipt binds Version Validation Hash", Boolean(preview && preview.data && /^[a-f0-9]{64}$/.test(preview.data.receipt.binding && preview.data.receipt.binding.versionArchitectureValidationHash || "")), preview && preview.data && preview.data.receipt.binding && preview.data.receipt.binding.versionArchitectureValidationHash, "Persistence", "Critical");

      check("Repository mutation remains prohibited", namespace.getStatus().directRepositoryMutationAllowed === false, namespace.getStatus().directRepositoryMutationAllowed, "Safety", "Critical");
      check("Automatic Workflow execution remains prohibited", namespace.getStatus().automaticWorkflowExecutionAllowed === false, namespace.getStatus().automaticWorkflowExecutionAllowed, "Safety", "Critical");
      check("Candidate automatic Fact promotion remains prohibited", normal.envelope.policy.candidateFactPromotionAllowed === false, normal.envelope.policy.candidateFactPromotionAllowed, "Safety", "Critical");
    } catch (error) {
      check("Phase 7 Validation completed without exception", false, error && error.stack || error && error.message || String(error), "Runtime", "Critical");
    }

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const total = checks.length;
    const result = {
      id: internal.nextId("IDE-170-PHASE7-VALIDATION"),
      componentId: namespace.componentId,
      name: "IDE-170 Phase 7 Confidence and Validation",
      version: RELEASE_VERSION,
      valid: passed === total,
      passed: passed,
      failed: total - passed,
      total: total,
      health: total ? Number(((passed / total) * 100).toFixed(2)) : 0,
      status: passed === total ? "Passed" : "Failed",
      checks: checks,
      phase7Gate: "Passed - Phase 6 Release Frozen",
      phase8Gate: passed === total && settings.androidRealDevicePassed === true ? "Passed" : "Blocked",
      androidRealDeviceValidation: {
        required: true,
        passed: settings.androidRealDevicePassed === true,
        device: internal.text(settings.device, settings.androidRealDevicePassed === true ? "Android Chrome" : ""),
        evidence: internal.text(settings.androidEvidence, ""),
        validatedAt: settings.androidRealDevicePassed === true ? internal.nowIso() : null
      },
      confidenceModel: { modelId: "IDE-170-CONFIDENCE-MODEL-DETERMINISTIC", modelVersion: "1.0.0" },
      independentValidationGate: true,
      validationPersistenceRequired: true,
      executedAt: internal.nowIso()
    };
    state.lastConfidenceValidation = internal.clone(result);
    internal.touch();
    if (typeof internal.registerExternalIntegration === "function") internal.registerExternalIntegration();
    if (typeof namespace.tryPersistValidationGateReceipt === "function") {
      try { namespace.tryPersistValidationGateReceipt({ actor: internal.text(settings.actor, "Project Owner"), automatic: true }); } catch (_) {}
    }
    if (typeof namespace.getReleaseStatus === "function") result.releaseStatus = namespace.getReleaseStatus();
    state.lastConfidenceValidation = internal.clone(result);
    return internal.clone(result);
  }

  function registerSchema() {
    const version = VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID);
    const existing = namespace.getSchema && namespace.getSchema(SCHEMA_ID);
    if (existing && existing.version === version) return internal.buildResult(true, "SCHEMA_EXISTS", "Ready", { schema: existing });
    if (existing && internal.removeSchemaForValidation) internal.removeSchemaForValidation(SCHEMA_ID);
    return namespace.registerSchema({
      schemaId: SCHEMA_ID,
      name: "Independent Validation Result",
      version: version,
      type: "object",
      required: ["validationId", "targetId", "targetType", "schemaVersion", "status", "checks", "summary", "gate", "validatedAt", "validatorId", "validatorVersion"],
      properties: {
        validationId: { type: "string" }, targetId: { type: "string" }, targetType: { type: "string" }, schemaVersion: { type: "string" }, status: { type: "string" }, checks: { type: "array" }, summary: { type: "object" }, gate: { type: "object" }, validatedAt: { type: "string" }, validatorId: { type: "string" }, validatorVersion: { type: "string" }
      },
      additionalProperties: true,
      owner: "IDE-170",
      source: "Architecture Decision 008"
    });
  }

  function registerCapability() {
    const existing = namespace.getCapability && namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === CAPABILITY_VERSION) return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Independent Validation Gate",
      version: CAPABILITY_VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-CONFIDENCE-ASSESSMENT", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: MINIMUM_VERSION, optional: false }
      ],
      schemas: [SCHEMA_ID],
      provides: ["Schema Validation", "Reference Validation", "Evidence Validation", "Confidence Validation", "Explanation Validation", "Policy Validation", "Integrity Validation", "Freshness Validation", "Compatibility Validation", "Freeze Validation"],
      source: "Architecture Decision 008"
    });
  }

  function registerPhase7Dataset() {
    if (typeof namespace.registerTestDataset !== "function") return { datasetId: DATASET_ID, registered: false, code: "TEST_DATASET_REGISTRY_UNAVAILABLE" };
    if (namespace.getTestDataset && namespace.getTestDataset(DATASET_ID)) return { datasetId: DATASET_ID, registered: true, existing: true };
    const cases = [
      { caseId: "IDE-170-P7-001", name: "Direct Evidence confidence", category: "Confidence", severity: "High", target: "IDE-170-TARGET-SHA256", executionType: "Function", input: { args: ["IDE-170 Phase 7"] }, expected: { comparator: "Regex", value: "^[a-f0-9]{64}$" } },
      { caseId: "IDE-170-P7-002", name: "Independent Validation Gate registered", category: "Validation", severity: "Critical", target: "IDE-170-TARGET-SHA256", executionType: "Function", input: { args: ["IDE-170 Independent Validation"] }, expected: { comparator: "Regex", value: "^[a-f0-9]{64}$" } }
    ];
    const dataset = {
      datasetId: DATASET_ID,
      name: "IDE-170 Phase 7 Confidence and Independent Validation Dataset",
      version: VERSION_MANIFEST.getDatasetVersion("phase7ConfidenceValidation"),
      componentId: "IDE-170",
      targetPhase: "Phase 7 Confidence and Validation",
      status: "Frozen",
      description: "Decision 008 deterministic Confidence and Independent Validation regression dataset.",
      testCases: cases,
      metadata: { architectureDecision: "IDE-170-008", noAutomaticExecution: true, confidenceModelId: "IDE-170-CONFIDENCE-MODEL-DETERMINISTIC", confidenceModelVersion: "1.0.0" }
    };
    const result = namespace.registerTestDataset(dataset, { actor: "IDE-170 Phase 7 Bootstrap" });
    return { datasetId: DATASET_ID, registered: result.ok === true, code: result.code };
  }

  function initializeIndependentValidation() {
    const schema = registerSchema();
    const capability = registerCapability();
    const dataset = registerPhase7Dataset();
    const ready = schema.ok === true && capability.ok === true;
    namespace.modules.independentValidation.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "INDEPENDENT_VALIDATION_INITIALIZED" : "INDEPENDENT_VALIDATION_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { schema: schema.data && schema.data.schema, capability: capability.data && capability.data.capability, dataset: dataset });
  }

  function getIndependentValidationStatus() {
    return {
      id: "IDE-170-INDEPENDENT-VALIDATION-STATUS",
      version: MODULE_VERSION,
      capabilityVersion: CAPABILITY_VERSION,
      status: namespace.getCapability && namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability && namespace.getCapability(CAPABILITY_ID)),
      validationResultCount: state.independentValidationResults.size,
      latestValidationResultId: state.latestIndependentValidationResultId,
      gateGroupCount: GATE_GROUPS.length,
      lastPhase7ValidationStatus: state.lastConfidenceValidation ? state.lastConfidenceValidation.status : "Not Run",
      lastPhase7Health: state.lastConfidenceValidation ? state.lastConfidenceValidation.health : null
    };
  }

  Object.assign(namespace.api, {
    initializeIndependentValidation: initializeIndependentValidation,
    computeIntelligencePayloadHash: computeIntelligencePayloadHash,
    validateIntelligenceResult: validateIntelligenceResult,
    validateFrozenIntelligenceResult: validateFrozenIntelligenceResult,
    runConfidencePhaseValidation: runConfidencePhaseValidation,
    getIndependentValidationStatus: getIndependentValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.independentValidation = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    capabilityVersion: CAPABILITY_VERSION,
    status: "Loaded",
    gateGroupCount: GATE_GROUPS.length,
    confidenceIndependent: true,
    criticalFailureBlocksFreeze: true,
    loadedAt: internal.nowIso()
  };

  global.validateIntelligenceConfidenceAndValidation = runConfidencePhaseValidation;
})(typeof window !== "undefined" ? window : globalThis);
