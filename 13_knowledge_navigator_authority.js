/* ============================================================
   FILE: 13_knowledge_navigator_authority.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Authority 1.0.0
   Phase 5: Authority / Evidence / Lineage
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 authority blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("authority");
  const RULESET_VERSION = "1.0.0";

  const RULES = Object.freeze({
    SINGLE: "RULE-AUTH-000-SINGLE-APPLICABLE-SOURCE",
    SUPERSEDES: "RULE-AUTH-001-EXPLICIT-SUPERSEDES",
    DEPRECATED: "RULE-AUTH-002-DEPRECATED-EXCLUSION",
    OFFICIAL: "RULE-AUTH-003-OFFICIAL-OVER-INFORMAL",
    LIFECYCLE: "RULE-AUTH-004-FROZEN-ACCEPTED-OVER-DRAFT",
    VALIDATED: "RULE-AUTH-005-VALIDATED-STATE",
    LINEAGE: "RULE-AUTH-006-LINEAGE-CONTINUITY",
    SCOPE: "RULE-AUTH-007-SCOPE-MATCH",
    EVIDENCE: "RULE-AUTH-008-EVIDENCE-REQUIREMENT"
  });

  function text(value) { return internal.text(value, "").toLowerCase(); }
  function arr(value) { return Array.isArray(value) ? value : []; }
  function bool(value) { return value === true; }

  function normalizeCandidate(input, index) {
    const source = internal.isPlainObject(input) ? input : {};
    const lifecycle = text(source.lifecycle || source.status || "unknown");
    const officialState = text(source.officialState || "unknown");
    const validationState = text(source.validationState || "unknown");
    const scope = source.scope == null ? null : internal.clone(source.scope);
    const lineage = arr(source.lineage).map(function copy(item) { return internal.clone(item); });
    const evidenceReferences = arr(source.evidenceReferences || source.evidence).map(function copy(item) { return internal.clone(item); });
    return internal.deepFreeze({
      candidateId: internal.text(source.candidateId || source.sourceId || source.recordId || source.packageId, "IDE-180-AUTH-CANDIDATE-" + String(index + 1)),
      providerId: source.providerId || null,
      sourceType: source.sourceType || null,
      sourceId: source.sourceId || source.packageId || null,
      recordId: source.recordId || null,
      canonicalId: source.canonicalId || source.canonicalEntityId || null,
      version: source.version || null,
      lifecycle: lifecycle || "unknown",
      officialState: officialState || "unknown",
      validationState: validationState || "unknown",
      scope: scope,
      lineage: lineage,
      evidenceReferences: evidenceReferences,
      lineageContinuous: bool(source.lineageContinuous),
      immutable: source.immutable !== false,
      sourceMetadata: internal.clone(source.sourceMetadata || {})
    });
  }

  function scopeMatches(candidateScope, requestedScope) {
    if (requestedScope == null || requestedScope === "") return true;
    if (candidateScope == null || candidateScope === "") return false;
    if (typeof requestedScope === "string" || typeof candidateScope === "string") {
      return String(candidateScope).normalize("NFKC").toLowerCase() === String(requestedScope).normalize("NFKC").toLowerCase();
    }
    try { return internal.stableStringify ? internal.stableStringify(candidateScope) === internal.stableStringify(requestedScope) : JSON.stringify(candidateScope) === JSON.stringify(requestedScope); }
    catch (_) { return false; }
  }

  function explicitlySuperseded(candidate, candidates) {
    return candidates.some(function inspect(other) {
      if (other.candidateId === candidate.candidateId) return false;
      return other.lineage.some(function link(item) {
        const type = text(item && (item.type || item.relationshipType || item.relation));
        const target = internal.text(item && (item.targetId || item.targetSourceId || item.sourceId || item.recordId), "");
        return ["supersedes", "replaces"].includes(type) && [candidate.candidateId, candidate.sourceId, candidate.recordId].filter(Boolean).includes(target);
      });
    });
  }

  function applyFilter(active, predicate, ruleId, reason, appliedRules) {
    const matched = active.filter(predicate);
    if (matched.length > 0 && matched.length < active.length) {
      appliedRules.push({ ruleId: ruleId, reason: reason, before: active.length, after: matched.length });
      return matched;
    }
    return active;
  }

  function resolveAuthority(candidatesInput, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const candidates = arr(candidatesInput).map(normalizeCandidate);
    const appliedRules = [];
    if (!candidates.length) {
      return internal.deepFreeze({
        status: "not-applicable",
        rulesetVersion: RULESET_VERSION,
        selectedSource: null,
        candidates: [],
        appliedRules: [],
        reason: "No applicable Source candidate is present.",
        scoringUsed: false
      });
    }

    let active = candidates.slice();
    if (active.length === 1) {
      if (settings.evidenceRequired === true && active[0].evidenceReferences.length === 0) {
        appliedRules.push({ ruleId: RULES.EVIDENCE, reason: "Evidence is required but the only applicable Source has no resolved Evidence.", before: 1, after: 0 });
        return internal.deepFreeze({ status: "insufficient-evidence", rulesetVersion: RULESET_VERSION, selectedSource: null, candidates: candidates.map(internal.clone), appliedRules: appliedRules, officialState: active[0].officialState, reason: "Evidence requirement cannot be satisfied by the current Source.", scoringUsed: false });
      }
      appliedRules.push({ ruleId: RULES.SINGLE, reason: "Only one applicable Source candidate is present.", before: 1, after: 1 });
      return internal.deepFreeze({
        status: "resolved",
        rulesetVersion: RULESET_VERSION,
        selectedSource: internal.clone(active[0]),
        candidates: candidates.map(internal.clone),
        appliedRules: appliedRules,
        officialState: active[0].officialState,
        reason: "Only one applicable Source candidate is available; this selects a navigation source but does not promote unknown Official status.",
        scoringUsed: false
      });
    }

    active = applyFilter(active, function keep(candidate) { return !explicitlySuperseded(candidate, candidates); }, RULES.SUPERSEDES, "Explicit supersedes/replaces lineage excludes superseded candidates.", appliedRules);
    active = applyFilter(active, function keep(candidate) { return !["deprecated", "superseded", "retired"].includes(candidate.lifecycle); }, RULES.DEPRECATED, "Deprecated/superseded lifecycle is excluded when an applicable alternative exists.", appliedRules);
    active = applyFilter(active, function keep(candidate) { return candidate.officialState === "official"; }, RULES.OFFICIAL, "Official Source is preferred over informal/non-official Source within comparable scope.", appliedRules);
    active = applyFilter(active, function keep(candidate) { return ["frozen", "accepted", "active", "current-official", "validated-official"].includes(candidate.lifecycle); }, RULES.LIFECYCLE, "Frozen/accepted/active lifecycle is preferred over draft/proposal when comparable.", appliedRules);
    active = applyFilter(active, function keep(candidate) { return candidate.validationState === "validated"; }, RULES.VALIDATED, "Validated Source is preferred among otherwise comparable candidates.", appliedRules);
    active = applyFilter(active, function keep(candidate) { return candidate.lineageContinuous === true; }, RULES.LINEAGE, "Explicit lineage continuity is preferred when available.", appliedRules);
    if (settings.scope != null) active = applyFilter(active, function keep(candidate) { return scopeMatches(candidate.scope, settings.scope); }, RULES.SCOPE, "Source scope matches requested navigation scope.", appliedRules);
    if (settings.evidenceRequired === true) active = applyFilter(active, function keep(candidate) { return candidate.evidenceReferences.length > 0; }, RULES.EVIDENCE, "Evidence-backed Source is required by the Navigation Request.", appliedRules);

    if (active.length === 1) {
      return internal.deepFreeze({
        status: "resolved",
        rulesetVersion: RULESET_VERSION,
        selectedSource: internal.clone(active[0]),
        candidates: candidates.map(internal.clone),
        appliedRules: appliedRules,
        officialState: active[0].officialState,
        reason: "Deterministic authority rules resolved one applicable Source.",
        scoringUsed: false
      });
    }

    const status = settings.evidenceRequired === true && active.every(function item(candidate) { return candidate.evidenceReferences.length === 0; })
      ? "insufficient-evidence"
      : "ambiguous";
    return internal.deepFreeze({
      status: status,
      rulesetVersion: RULESET_VERSION,
      selectedSource: null,
      candidates: active.map(internal.clone),
      appliedRules: appliedRules,
      reason: status === "insufficient-evidence" ? "Evidence requirement cannot be satisfied by current Source candidates." : "Deterministic rules do not resolve a unique Authority candidate.",
      scoringUsed: false
    });
  }

  function sourceCandidatesFromResult(result) {
    const providerStatus = typeof namespace.getIntelligenceProviderStatus === "function" ? namespace.getIntelligenceProviderStatus() : null;
    const active = providerStatus && providerStatus.activePackage || null;
    return arr(result && result.sources).map(function map(source, index) {
      return {
        candidateId: source.recordId || source.packageId || "source-" + index,
        providerId: source.providerId || providerStatus && providerStatus.providerId || null,
        sourceType: source.sourceType || providerStatus && providerStatus.sourceType || null,
        sourceId: source.packageId || active && active.packageId || null,
        recordId: source.recordId || null,
        canonicalId: source.canonicalId || null,
        version: result && result.version || null,
        lifecycle: active ? "frozen" : "unknown",
        officialState: "unknown",
        validationState: active ? "validated" : "unknown",
        scope: result && result.metadata && result.metadata.scope || null,
        lineage: [],
        evidenceReferences: arr(result && result.evidence),
        lineageContinuous: Boolean(active && active.packageId),
        immutable: true,
        sourceMetadata: { packageHash: active && active.packageHash || null, sourceOrigin: active && active.sourceOrigin || null }
      };
    });
  }

  function evaluateResultAuthority(result, request) {
    if (!result || !["complete", "partial"].includes(result.status)) {
      return internal.deepFreeze({ status: result && result.status === "missing-source" ? "missing-source" : "not-applicable", rulesetVersion: RULESET_VERSION, selectedSource: null, candidates: [], appliedRules: [], reason: "Authority is not evaluated for this result state.", scoringUsed: false });
    }
    return resolveAuthority(sourceCandidatesFromResult(result), {
      scope: request && request.scope,
      evidenceRequired: Boolean(request && request.evidenceRequirement)
    });
  }

  function initializeAuthority() {
    namespace.modules.authority.status = "Ready";
    return internal.buildResult(true, "IDE180_AUTHORITY_INITIALIZED", "Ready", {
      rulesetVersion: RULESET_VERSION,
      ruleIds: Object.keys(RULES).map(function key(name) { return RULES[name]; }),
      scoringAllowed: false,
      readOnly: true
    });
  }

  Object.assign(namespace.api, {
    initializeAuthority: initializeAuthority,
    resolveKnowledgeAuthority: resolveAuthority,
    evaluateNavigationResultAuthority: evaluateResultAuthority,
    getKnowledgeAuthorityRuleSet: function getRules() { return internal.clone({ version: RULESET_VERSION, rules: RULES }); }
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.authority = {
    id: "IDE-180-AUTHORITY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 5,
    rulesetVersion: RULESET_VERSION,
    scoringAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
