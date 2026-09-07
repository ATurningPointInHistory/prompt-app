/* ============================================================
   FILE: 17_external_intelligence_temporal.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.6.0
   Phase 07: Temporal Intent / Freshness / Historical Guard
   Decision: 009 / Supporting 008 / 042
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 temporal module blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("temporal");

  if (!(state.temporalContexts instanceof Map)) state.temporalContexts = new Map();
  if (!(state.freshnessPolicies instanceof Map)) state.freshnessPolicies = new Map();

  const INTENTS = new Set(VERSION_MANIFEST.temporal.temporalIntents || []);
  const FRESHNESS_STATES = new Set(VERSION_MANIFEST.temporal.freshnessStates || []);

  function normalizeIso(value) {
    const text = internal.text(value, "");
    if (!text) return null;
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  function getEvidenceTimeSource(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const evidenceId = internal.text(x.evidenceId, "");
    const rawEvidenceId = internal.text(x.rawEvidenceId, "");
    const evidence = evidenceId && state.acquisitionEvidenceRecords.has(evidenceId)
      ? state.acquisitionEvidenceRecords.get(evidenceId)
      : null;
    const raw = rawEvidenceId && state.rawEvidenceRecords.has(rawEvidenceId)
      ? state.rawEvidenceRecords.get(rawEvidenceId)
      : evidence && evidence.rawEvidenceId && state.rawEvidenceRecords.has(evidence.rawEvidenceId)
        ? state.rawEvidenceRecords.get(evidence.rawEvidenceId)
        : null;
    const response = evidence && evidence.responseId && state.acquisitionResponses.has(evidence.responseId)
      ? state.acquisitionResponses.get(evidence.responseId)
      : null;
    const temporal = response && response.temporalMetadata && typeof response.temporalMetadata === "object"
      ? response.temporalMetadata
      : {};
    return { evidence, raw, response, temporal };
  }

  function registerExternalIntelligenceFreshnessPolicy(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const freshnessPolicyId = internal.text(x.freshnessPolicyId, "");
    if (!freshnessPolicyId) return internal.buildResult(false, "EXTERNAL010_FRESHNESS_POLICY_ID_REQUIRED", "Blocked", null);
    if (state.freshnessPolicies.has(freshnessPolicyId)) {
      const existing = state.freshnessPolicies.get(freshnessPolicyId);
      const candidate = internal.deepFreeze({
        freshnessPolicyId,
        sourceType: internal.text(x.sourceType, "ANY").toUpperCase(),
        operationId: internal.text(x.operationId, "ANY").toUpperCase(),
        temporalIntent: internal.text(x.temporalIntent, "LATEST").toUpperCase(),
        maxAgeMs: Number.isFinite(Number(x.maxAgeMs)) && Number(x.maxAgeMs) >= 0 ? Number(x.maxAgeMs) : null,
        policyVersion: internal.text(x.policyVersion, "1.0.0"),
        newestEvidenceAutomaticallyWins: false,
        freshnessGrantsReliability: false,
        createdAt: existing.createdAt,
        immutable: true
      });
      const same = internal.stableStringify(existing) === internal.stableStringify(candidate);
      return internal.buildResult(same, same ? "EXTERNAL010_FRESHNESS_POLICY_ALREADY_REGISTERED" : "EXTERNAL010_FRESHNESS_POLICY_CONFLICT", same ? "Ready" : "Blocked", { freshnessPolicy: internal.clone(existing) });
    }
    const intent = internal.text(x.temporalIntent, "LATEST").toUpperCase();
    if (!INTENTS.has(intent)) return internal.buildResult(false, "EXTERNAL010_TEMPORAL_INTENT_INVALID", "Blocked", { temporalIntent: intent });
    const record = internal.deepFreeze({
      freshnessPolicyId,
      sourceType: internal.text(x.sourceType, "ANY").toUpperCase(),
      operationId: internal.text(x.operationId, "ANY").toUpperCase(),
      temporalIntent: intent,
      maxAgeMs: Number.isFinite(Number(x.maxAgeMs)) && Number(x.maxAgeMs) >= 0 ? Number(x.maxAgeMs) : null,
      policyVersion: internal.text(x.policyVersion, "1.0.0"),
      newestEvidenceAutomaticallyWins: false,
      freshnessGrantsReliability: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    state.freshnessPolicies.set(freshnessPolicyId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_FRESHNESS_POLICY_REGISTERED", "Ready", { freshnessPolicy: internal.clone(record) });
  }

  function findFreshnessPolicy(sourceType, operationId, intent) {
    let best = null;
    state.freshnessPolicies.forEach(function choose(policy) {
      if (best) return;
      const sourceMatch = policy.sourceType === "ANY" || policy.sourceType === sourceType;
      const operationMatch = policy.operationId === "ANY" || policy.operationId === operationId;
      const intentMatch = policy.temporalIntent === intent;
      if (sourceMatch && operationMatch && intentMatch) best = policy;
    });
    return best;
  }

  function evaluateExternalIntelligenceTemporalEvidence(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const refs = getEvidenceTimeSource(x);
    const evidenceId = internal.text(x.evidenceId || (refs.evidence && refs.evidence.evidenceId), "");
    const rawEvidenceId = internal.text(x.rawEvidenceId || (refs.raw && refs.raw.rawEvidenceId), "");
    if (!evidenceId && !rawEvidenceId) return internal.buildResult(false, "EXTERNAL010_TEMPORAL_EVIDENCE_REFERENCE_REQUIRED", "Blocked", null);

    const intent = internal.text(x.temporalIntent, "LATEST").toUpperCase();
    if (!INTENTS.has(intent)) return internal.buildResult(false, "EXTERNAL010_TEMPORAL_INTENT_INVALID", "Blocked", { temporalIntent: intent });

    const publishedAt = normalizeIso(x.publishedAt != null ? x.publishedAt : (refs.temporal.publishedAt != null ? refs.temporal.publishedAt : refs.evidence && refs.evidence.publishedAt));
    const availableAt = normalizeIso(x.availableAt != null ? x.availableAt : refs.temporal.availableAt);
    const effectiveAt = normalizeIso(x.effectiveAt != null ? x.effectiveAt : refs.temporal.effectiveAt);
    const acquiredAt = normalizeIso(x.acquiredAt != null ? x.acquiredAt : ((refs.evidence && refs.evidence.acquiredAt) || (refs.raw && refs.raw.acquiredAt)));
    const observedAt = normalizeIso(x.observedAt != null ? x.observedAt : refs.temporal.observedAt);
    const asOfTime = normalizeIso(x.asOfTime);
    const evaluationTime = normalizeIso(x.evaluationTime) || internal.nowIso();
    const sourceType = internal.text(x.sourceType || (refs.evidence && refs.evidence.sourceType), "UNKNOWN").toUpperCase();
    const operationId = internal.text(x.operationId || (refs.evidence && refs.evidence.operationId), "UNKNOWN").toUpperCase();

    const historyIntent = intent === "HISTORICAL" || intent === "BACKTEST" || intent === "AS_OF";
    const availabilityBoundary = availableAt || publishedAt || acquiredAt || observedAt;
    let futureEvidenceBlocked = false;
    let eligibilityState = "ELIGIBLE";
    let temporalAmbiguity = false;

    if (historyIntent) {
      if (!asOfTime) {
        eligibilityState = "BLOCKED_AS_OF_REQUIRED";
        futureEvidenceBlocked = true;
      } else if (!availabilityBoundary) {
        eligibilityState = "BLOCKED_TEMPORAL_UNKNOWN";
        futureEvidenceBlocked = true;
        temporalAmbiguity = true;
      } else if (Date.parse(availabilityBoundary) > Date.parse(asOfTime)) {
        eligibilityState = "BLOCKED_FUTURE_EVIDENCE";
        futureEvidenceBlocked = true;
      }
    }

    const policy = findFreshnessPolicy(sourceType, operationId, intent);
    let freshnessState = "UNKNOWN";
    if (historyIntent) freshnessState = "HISTORICAL_CONTEXT";
    else if (policy && policy.maxAgeMs != null && availabilityBoundary) {
      const age = Math.max(0, Date.parse(evaluationTime) - Date.parse(availabilityBoundary));
      freshnessState = age <= policy.maxAgeMs ? "FRESH" : "STALE";
    } else if (availabilityBoundary && intent === "LATEST") {
      freshnessState = "UNASSESSED";
    }
    if (!FRESHNESS_STATES.has(freshnessState)) freshnessState = "UNKNOWN";

    const timestampCount = [publishedAt, availableAt, effectiveAt, acquiredAt].filter(Boolean).length;
    if (timestampCount === 0) temporalAmbiguity = true;

    const context = internal.deepFreeze({
      temporalContextId: internal.nextId("EXTERNAL-010-TEMPORAL-CONTEXT"),
      evidenceId: evidenceId || null,
      rawEvidenceId: rawEvidenceId || null,
      sourceType,
      operationId,
      publishedAt,
      availableAt,
      effectiveAt,
      acquiredAt,
      observedAt,
      temporalIntent: intent,
      historicalMode: historyIntent,
      asOfTime,
      evaluationTime,
      freshnessPolicyId: policy ? policy.freshnessPolicyId : null,
      freshnessState,
      temporalAmbiguity,
      futureEvidenceBlocked,
      eligibilityState,
      newestEvidenceAutomaticallyWins: false,
      freshnessGrantsReliability: false,
      unknownTimestampInvented: false,
      createdAt: internal.nowIso(),
      immutable: true
    });

    const cv = namespace.validateExternalIntelligenceContract("temporalContext", context);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-TEMPORAL-CONTEXT", context);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_TEMPORAL_CONTEXT_INVALID", "Blocked", { contract: cv, schema: sv });
    state.temporalContexts.set(context.temporalContextId, context);
    internal.touch();
    return internal.buildResult(!futureEvidenceBlocked, futureEvidenceBlocked ? "EXTERNAL010_TEMPORAL_EVIDENCE_BLOCKED" : "EXTERNAL010_TEMPORAL_EVIDENCE_ELIGIBLE", futureEvidenceBlocked ? "Blocked" : "Ready", { temporalContext: internal.clone(context), evidenceWinnerSelected: false });
  }

  function getExternalIntelligenceTemporalContext(temporalContextId) {
    const id = internal.text(temporalContextId, "");
    const record = id && state.temporalContexts.get(id);
    return record ? internal.clone(record) : null;
  }

  function initializeExternalIntelligenceTemporal() {
    namespace.modules.temporal.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_TEMPORAL_INITIALIZED", "Ready", {
      temporalIntents: Array.from(INTENTS),
      freshnessStates: Array.from(FRESHNESS_STATES),
      historicalEqualsStale: false,
      futureEvidenceInBacktestAllowed: false,
      newestEvidenceAutomaticallyWins: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceTemporal,
    registerExternalIntelligenceFreshnessPolicy,
    evaluateExternalIntelligenceTemporalEvidence,
    getExternalIntelligenceTemporalContext
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.temporal = { id: "EXTERNAL-010-TEMPORAL", version: MODULE_VERSION, status: "Loaded", phase: 7, decisions: ["009"], supporting: ["008", "042"], loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
