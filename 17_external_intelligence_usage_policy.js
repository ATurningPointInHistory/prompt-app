/* ============================================================
   FILE: 17_external_intelligence_usage_policy.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.2.0
   Phase 03: Source Governance / Discovery / Budget / Usage Policy
   Decision: EXTERNAL-010-DECISION-025
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 usage policy blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("usagePolicy");
  const OPERATIONS = Object.freeze(VERSION_MANIFEST.usagePolicy.operations.slice());
  const RIGHTS_STATES = Object.freeze(VERSION_MANIFEST.usagePolicy.states.slice());
  const ALLOW_STATES = Object.freeze(["ALLOWED", "ALLOWED_WITH_CONDITIONS"]);
  const COMPLETENESS = Object.freeze(["COMPLETE", "PARTIAL", "UNKNOWN"]);
  const CONFIDENCE = Object.freeze(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

  function upper(value, fallback) { return internal.text(value, fallback || "").toUpperCase(); }
  function policyId(value) { return internal.text(value, ""); }
  function sourceId(value) { return internal.text(value, "").toUpperCase(); }

  function normalizeRight(value) {
    const input = internal.isPlainObject(value) ? value : {};
    const stateValue = RIGHTS_STATES.includes(upper(input.state, "UNKNOWN")) ? upper(input.state, "UNKNOWN") : "UNKNOWN";
    return {
      state: stateValue,
      conditions: internal.unique(input.conditions || []),
      evidenceIds: internal.unique(input.evidenceIds || []),
      clauseReference: input.clauseReference ? internal.text(input.clauseReference, "") : null,
      confidence: CONFIDENCE.includes(upper(input.confidence, "UNKNOWN")) ? upper(input.confidence, "UNKNOWN") : "UNKNOWN"
    };
  }

  function normalizeRights(value) {
    const input = internal.isPlainObject(value) ? value : {};
    const output = {};
    Object.keys(input).forEach(function normalizeOperation(operationKey) {
      const operation = upper(operationKey, "");
      if (OPERATIONS.includes(operation)) output[operation] = normalizeRight(input[operationKey]);
    });
    return output;
  }

  function validatePolicy(record) {
    const contract = namespace.validateExternalIntelligenceContract("usagePolicy", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-USAGE-POLICY", record);
    return { valid: contract.valid === true && schema.valid === true, contract: contract, schema: schema };
  }

  function getVersionList(source) {
    if (!state.usagePolicyVersions.has(source)) state.usagePolicyVersions.set(source, []);
    return state.usagePolicyVersions.get(source);
  }

  function createExternalIntelligenceUsagePolicyCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const source = sourceId(settings.sourceId);
    if (!source) return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_SOURCE_REQUIRED", "Blocked", null);
    const completeness = COMPLETENESS.includes(upper(settings.policyCompleteness, "UNKNOWN")) ? upper(settings.policyCompleteness, "UNKNOWN") : "UNKNOWN";
    const confidence = CONFIDENCE.includes(upper(settings.interpretationConfidence, "UNKNOWN")) ? upper(settings.interpretationConfidence, "UNKNOWN") : "UNKNOWN";
    const rights = normalizeRights(settings.rights);
    const previousId = state.activeUsagePolicyBySource.get(source) || null;
    const previous = previousId ? state.usagePolicies.get(previousId) : null;
    const hasAmbiguous = Object.keys(rights).some(function ambiguous(operation) { return ["AMBIGUOUS", "REVIEW_REQUIRED"].includes(rights[operation].state); });
    const analysisStatus = upper(settings.analysisStatus, "SUCCESS");
    const parserFailure = analysisStatus === "PARSER_FAILED";
    const policyUnavailable = analysisStatus === "POLICY_UNAVAILABLE";
    const explicitStatus = upper(settings.status, "");
    let status = explicitStatus;
    if (!status) status = parserFailure || policyUnavailable || hasAmbiguous || completeness !== "COMPLETE" ? "REVIEW_REQUIRED" : "CANDIDATE";
    if (!["CANDIDATE", "REVIEW_REQUIRED", "ACTIVE", "SUPERSEDED", "REVOKED"].includes(status)) status = "REVIEW_REQUIRED";
    const now = internal.nowIso();
    const id = policyId(settings.usagePolicyId) || internal.nextId("EXTERNAL-010-USAGE-POLICY");
    if (state.usagePolicies.has(id)) return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_DUPLICATE", "Blocked", { usagePolicyId: id });
    const record = internal.deepFreeze({
      usagePolicyId: id,
      sourceId: source,
      policyVersion: internal.text(settings.policyVersion, "1"),
      effectiveAt: settings.effectiveAt ? internal.text(settings.effectiveAt, "") : null,
      observedAt: internal.text(settings.observedAt, now),
      policyEvidenceIds: internal.unique(settings.policyEvidenceIds || []),
      analysisVersion: internal.text(settings.analysisVersion, MODULE_VERSION),
      status: status,
      rights: rights,
      policyCompleteness: completeness,
      interpretationConfidence: confidence,
      aiInterpretationEqualsLegalAuthority: false,
      previousPolicyId: previousId,
      policyChangeDetected: Boolean(previous && internal.stableStringify(previous.rights) !== internal.stableStringify(rights)),
      analysisStatus: analysisStatus,
      parserFailureEqualsNoRestriction: false,
      policyUnavailableEqualsPermission: false,
      createdAt: now,
      updatedAt: now,
      immutable: true
    });
    /* Contracts intentionally define the canonical governance fields only. */
    const canonical = internal.deepFreeze({
      usagePolicyId: record.usagePolicyId,
      sourceId: record.sourceId,
      policyVersion: record.policyVersion,
      effectiveAt: record.effectiveAt,
      observedAt: record.observedAt,
      policyEvidenceIds: record.policyEvidenceIds,
      analysisVersion: record.analysisVersion,
      status: record.status,
      rights: record.rights,
      policyCompleteness: record.policyCompleteness,
      interpretationConfidence: record.interpretationConfidence,
      aiInterpretationEqualsLegalAuthority: false,
      previousPolicyId: record.previousPolicyId,
      policyChangeDetected: record.policyChangeDetected,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      immutable: true
    });
    const validation = validatePolicy(canonical);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_CONTRACT_INVALID", "Blocked", { validation: validation });
    state.usagePolicies.set(id, record);
    getVersionList(source).push(record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_USAGE_POLICY_CANDIDATE_CREATED", status === "REVIEW_REQUIRED" ? "Review Required" : "Candidate", { usagePolicy: internal.clone(record), legalAuthorityGranted: false });
  }

  async function activateExternalIntelligenceUsagePolicy(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = policyId(settings.usagePolicyId);
    const current = state.usagePolicies.get(id);
    const purpose = internal.text(settings.purpose, "usage-policy");
    if (!current) return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_NOT_FOUND", "Blocked", { usagePolicyId: id || null });
    if (!["CANDIDATE", "REVIEW_REQUIRED"].includes(current.status)) return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_STATE_INVALID", "Blocked", { usagePolicyId: id, status: current.status });
    const authority = namespace.evaluateExternalIntelligenceAuthority({ action: "ACTIVATE_USAGE_POLICY", target: { type: "usage-policy", id: id }, purpose: purpose });
    if (!authority.allowed) return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_AUTHORITY_DENIED", "Blocked", { usagePolicyId: id, authority: authority });
    const oldActiveId = state.activeUsagePolicyBySource.get(current.sourceId) || null;
    if (oldActiveId && oldActiveId !== id) {
      const old = state.usagePolicies.get(oldActiveId);
      if (old) state.usagePolicies.set(oldActiveId, internal.deepFreeze(Object.assign({}, internal.clone(old), { status: "SUPERSEDED", updatedAt: internal.nowIso() })));
    }
    const active = internal.deepFreeze(Object.assign({}, internal.clone(current), { status: "ACTIVE", updatedAt: internal.nowIso(), immutable: true }));
    state.usagePolicies.set(id, active);
    state.activeUsagePolicyBySource.set(active.sourceId, id);
    internal.touch();
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "USAGE_POLICY_ACTIVATED", actor: "Usage Policy Registry", outcome: "Active", details: { usagePolicyId: id, sourceId: active.sourceId, authorityEnvelopeId: authority.authorityEnvelopeId, aiInterpretationEqualsLegalAuthority: false, policyChangeDetected: active.policyChangeDetected } });
    return internal.buildResult(true, "EXTERNAL010_USAGE_POLICY_ACTIVATED", "Active", { usagePolicy: internal.clone(active), authority: authority, legalAuthorityGranted: false });
  }

  function checkExternalIntelligenceUsagePolicy(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const source = sourceId(settings.sourceId);
    const operation = upper(settings.operation, "");
    if (!source || !OPERATIONS.includes(operation)) return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_CHECK_INVALID", "Blocked", { sourceId: source || null, operation: operation || null });
    const activeId = state.activeUsagePolicyBySource.get(source);
    const policy = activeId ? state.usagePolicies.get(activeId) : null;
    if (!policy || policy.status !== "ACTIVE") return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_UNKNOWN", "Blocked", { sourceId: source, operation: operation, rightState: "UNKNOWN", unknownUsagePolicyEqualsAllowed: false });
    const right = policy.rights[operation] || { state: "UNKNOWN", conditions: [], evidenceIds: [], clauseReference: null, confidence: "UNKNOWN" };
    const allowed = ALLOW_STATES.includes(right.state);
    return internal.buildResult(allowed, allowed ? "EXTERNAL010_USAGE_POLICY_OPERATION_ALLOWED" : "EXTERNAL010_USAGE_POLICY_OPERATION_BLOCKED", allowed ? (right.state === "ALLOWED_WITH_CONDITIONS" ? "Allowed With Conditions" : "Allowed") : "Blocked", {
      usagePolicyId: policy.usagePolicyId,
      sourceId: source,
      operation: operation,
      right: internal.clone(right),
      policyCompleteness: policy.policyCompleteness,
      allowed: allowed,
      unknownUsagePolicyEqualsAllowed: false,
      ambiguousUsagePolicyEqualsAllowed: false,
      legalAuthorityGranted: false
    });
  }

  function setExternalIntelligenceTermsAnalysisHook(hook) {
    if (hook == null) {
      state.termsAnalysisHook = null;
      internal.touch();
      return internal.buildResult(true, "EXTERNAL010_TERMS_ANALYSIS_HOOK_RESET", "Ready", { hookId: null });
    }
    if (!hook || typeof hook.analyze !== "function") return internal.buildResult(false, "EXTERNAL010_TERMS_ANALYSIS_HOOK_INVALID", "Blocked", null);
    state.termsAnalysisHook = hook;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_TERMS_ANALYSIS_HOOK_SET", "Ready", { hookId: internal.text(hook.hookId, "custom") });
  }

  async function analyzeExternalIntelligenceTerms(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    if (!state.termsAnalysisHook) return internal.buildResult(false, "EXTERNAL010_TERMS_ANALYSIS_HOOK_REQUIRED", "Blocked", { aiInterpretationEqualsLegalAuthority: false });
    let analysis;
    try {
      analysis = await state.termsAnalysisHook.analyze(internal.clone(settings));
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_TERMS_ANALYSIS_FAILED", "Failed", { parserFailureEqualsNoRestriction: false }, { error: { message: error && error.message || String(error), category: "Terms Analysis" } });
    }
    const candidateInput = Object.assign({}, internal.clone(analysis || {}), {
      sourceId: sourceId(settings.sourceId || analysis && analysis.sourceId),
      policyEvidenceIds: internal.unique((analysis && analysis.policyEvidenceIds) || settings.policyEvidenceIds || []),
      observedAt: internal.nowIso(),
      analysisVersion: internal.text(analysis && analysis.analysisVersion, MODULE_VERSION),
      status: null
    });
    const candidate = createExternalIntelligenceUsagePolicyCandidate(candidateInput);
    if (!candidate.ok) return candidate;
    return internal.buildResult(true, "EXTERNAL010_TERMS_ANALYSIS_CANDIDATE_CREATED", "Candidate", { analysis: internal.redactSensitive(analysis || {}), usagePolicy: candidate.data.usagePolicy, legalAuthorityGranted: false });
  }

  function createExternalIntelligenceTermsResearchGoal(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const goal = internal.deepFreeze({
      goalId: internal.nextId("EXTERNAL-010-TERMS-RESEARCH-GOAL"),
      sourceId: sourceId(settings.sourceId),
      reason: internal.text(settings.reason, "Usage policy unknown or ambiguous"),
      purpose: "Locate and ground source usage terms",
      activationAuthorityGranted: false,
      legalAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    return internal.buildResult(true, "EXTERNAL010_TERMS_RESEARCH_GOAL_CREATED", "Candidate", { goal: internal.clone(goal) });
  }

  function getExternalIntelligenceUsagePolicy(id) {
    const policy = state.usagePolicies.get(policyId(id));
    return policy ? internal.clone(policy) : null;
  }
  function getActiveExternalIntelligenceUsagePolicyForSource(id) {
    const activeId = state.activeUsagePolicyBySource.get(sourceId(id));
    const policy = activeId ? state.usagePolicies.get(activeId) : null;
    return policy ? internal.clone(policy) : null;
  }
  function listExternalIntelligenceUsagePolicies() { return Array.from(state.usagePolicies.values()).map(internal.clone); }
  function getExternalIntelligenceUsagePolicyHistory(id) { return (state.usagePolicyVersions.get(sourceId(id)) || []).map(internal.clone); }

  function initializeExternalIntelligenceUsagePolicy() {
    namespace.modules.usagePolicy.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_USAGE_POLICY_INITIALIZED", "Ready", {
      operations: OPERATIONS.slice(),
      states: RIGHTS_STATES.slice(),
      unknownDefaultsToAllowed: false,
      aiInterpretationEqualsLegalAuthority: false,
      policyCount: state.usagePolicies.size
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceUsagePolicy: initializeExternalIntelligenceUsagePolicy,
    createExternalIntelligenceUsagePolicyCandidate: createExternalIntelligenceUsagePolicyCandidate,
    activateExternalIntelligenceUsagePolicy: activateExternalIntelligenceUsagePolicy,
    checkExternalIntelligenceUsagePolicy: checkExternalIntelligenceUsagePolicy,
    setExternalIntelligenceTermsAnalysisHook: setExternalIntelligenceTermsAnalysisHook,
    analyzeExternalIntelligenceTerms: analyzeExternalIntelligenceTerms,
    createExternalIntelligenceTermsResearchGoal: createExternalIntelligenceTermsResearchGoal,
    getExternalIntelligenceUsagePolicy: getExternalIntelligenceUsagePolicy,
    getActiveExternalIntelligenceUsagePolicyForSource: getActiveExternalIntelligenceUsagePolicyForSource,
    listExternalIntelligenceUsagePolicies: listExternalIntelligenceUsagePolicies,
    getExternalIntelligenceUsagePolicyHistory: getExternalIntelligenceUsagePolicyHistory
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.usagePolicy = {
    id: "EXTERNAL-010-USAGE-POLICY-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    unknownDefaultsToAllowed: false,
    ambiguousDefaultsToAllowed: false,
    aiInterpretationEqualsLegalAuthority: false,
    parserFailureEqualsNoRestriction: false,
    policyUnavailableEqualsPermission: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
