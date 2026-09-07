/* ============================================================
   FILE: 17_external_intelligence_normalization.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.6.0
   Phase 07: Versioned Normalized Layer / Explicit Resolution State
   Decision: 022 / Supporting 008 / 037 / 042
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 normalization module blocked: dependencies missing.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("normalization");
  ["normalizerDefinitions", "normalizedRecords"].forEach(function ensure(key) { if (!(state[key] instanceof Map)) state[key] = new Map(); });
  if (!(state.normalizerImplementations instanceof Map)) state.normalizerImplementations = new Map();
  if (!state.normalizationResolutionHooks || typeof state.normalizationResolutionHooks !== "object") state.normalizationResolutionHooks = { UNIT: null, TEMPORAL: null, ENTITY: null };

  const NORMALIZATION_STATES = new Set(VERSION_MANIFEST.normalization.normalizationStates || []);
  const RESOLUTION_STATES = new Set(VERSION_MANIFEST.normalization.resolutionStates || []);

  function validateRecord(contractKey, schemaId, record) {
    const cv = namespace.validateExternalIntelligenceContract(contractKey, record);
    const sv = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return { valid: cv.valid === true && sv.valid === true, contract: cv, schema: sv };
  }

  function registerExternalIntelligenceNormalizer(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const normalizerId = internal.text(x.normalizerId, "");
    const normalizerVersion = internal.text(x.normalizerVersion, "");
    const schemaVersion = internal.text(x.schemaVersion, "");
    if (!normalizerId || !normalizerVersion || !schemaVersion || typeof x.normalize !== "function") {
      return internal.buildResult(false, "EXTERNAL010_NORMALIZER_DEFINITION_INVALID", "Blocked", null);
    }
    const registryKey = normalizerId + "@" + normalizerVersion;
    const definition = internal.deepFreeze({
      normalizerId,
      normalizerVersion,
      schemaVersion,
      recordType: internal.text(x.recordType, "GENERIC"),
      supportedSourceTypes: internal.unique(x.supportedSourceTypes || ["ANY"]),
      deterministic: x.deterministic !== false,
      rawEvidenceMutationAllowed: false,
      historicalOverwriteAllowed: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const existing = state.normalizerDefinitions.get(registryKey);
    if (existing) {
      const comparable = Object.assign({}, definition, { createdAt: existing.createdAt });
      const same = internal.stableStringify(existing) === internal.stableStringify(comparable);
      if (!same) return internal.buildResult(false, "EXTERNAL010_NORMALIZER_VERSION_CONFLICT", "Blocked", { normalizerDefinition: internal.clone(existing) });
      state.normalizerImplementations.set(registryKey, x.normalize);
      return internal.buildResult(true, "EXTERNAL010_NORMALIZER_ALREADY_REGISTERED", "Ready", { normalizerDefinition: internal.clone(existing) });
    }
    const validity = validateRecord("normalizerDefinition", "EXTERNAL-010-SCHEMA-NORMALIZER-DEFINITION", definition);
    if (!validity.valid) return internal.buildResult(false, "EXTERNAL010_NORMALIZER_CONTRACT_INVALID", "Blocked", validity);
    state.normalizerDefinitions.set(registryKey, definition);
    state.normalizerImplementations.set(registryKey, x.normalize);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_NORMALIZER_REGISTERED", "Ready", { normalizerDefinition: internal.clone(definition) });
  }

  function setExternalIntelligenceNormalizationResolutionHook(type, hook) {
    const key = internal.text(type, "").toUpperCase();
    if (!["UNIT", "TEMPORAL", "ENTITY"].includes(key)) return internal.buildResult(false, "EXTERNAL010_RESOLUTION_HOOK_TYPE_INVALID", "Blocked", { type: key || null });
    if (hook != null && typeof hook !== "function") return internal.buildResult(false, "EXTERNAL010_RESOLUTION_HOOK_INVALID", "Blocked", { type: key });
    state.normalizationResolutionHooks[key] = hook || null;
    internal.touch();
    return internal.buildResult(true, hook ? "EXTERNAL010_RESOLUTION_HOOK_SET" : "EXTERNAL010_RESOLUTION_HOOK_CLEARED", "Ready", { type: key, configured: Boolean(hook) });
  }

  function getRawAndEvidence(input) {
    const x = internal.isPlainObject(input) ? input : {};
    let raw = null;
    let evidence = null;
    if (x.rawEvidenceId && state.rawEvidenceRecords.has(x.rawEvidenceId)) raw = state.rawEvidenceRecords.get(x.rawEvidenceId);
    if (x.evidenceId && state.acquisitionEvidenceRecords.has(x.evidenceId)) evidence = state.acquisitionEvidenceRecords.get(x.evidenceId);
    if (!raw && evidence && evidence.rawEvidenceId && state.rawEvidenceRecords.has(evidence.rawEvidenceId)) raw = state.rawEvidenceRecords.get(evidence.rawEvidenceId);
    if (!evidence && raw) {
      state.acquisitionEvidenceRecords.forEach(function find(record) { if (!evidence && record.rawEvidenceId === raw.rawEvidenceId) evidence = record; });
    }
    return { raw, evidence };
  }

  async function runResolutionHook(type, payload, context) {
    const hook = state.normalizationResolutionHooks[type];
    if (typeof hook !== "function") return { state: "UNRESOLVED", candidates: [], hookConfigured: false };
    try {
      const result = await hook(internal.clone(payload), internal.clone(context));
      const out = internal.isPlainObject(result) ? result : {};
      let resolutionState = internal.text(out.resolutionState, "UNRESOLVED").toUpperCase();
      if (!RESOLUTION_STATES.has(resolutionState)) resolutionState = "UNKNOWN";
      return { state: resolutionState, candidates: Array.isArray(out.candidates) ? internal.clone(out.candidates) : [], hookConfigured: true, exactResolutionPerformed: false };
    } catch (error) {
      return { state: "FAILED", candidates: [], hookConfigured: true, exactResolutionPerformed: false, error: error && error.message || String(error) };
    }
  }

  async function normalizeExternalIntelligenceEvidence(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const refs = getRawAndEvidence(x);
    if (!refs.raw || !refs.evidence) return internal.buildResult(false, "EXTERNAL010_NORMALIZATION_RAW_EVIDENCE_REQUIRED", "Blocked", { rawEvidenceFound: Boolean(refs.raw), acquisitionEvidenceFound: Boolean(refs.evidence) });
    const normalizerId = internal.text(x.normalizerId, "");
    const normalizerVersion = internal.text(x.normalizerVersion, "");
    const registryKey = normalizerId + "@" + normalizerVersion;
    const definition = state.normalizerDefinitions.get(registryKey);
    const implementation = state.normalizerImplementations.get(registryKey);
    if (!definition || typeof implementation !== "function") return internal.buildResult(false, "EXTERNAL010_NORMALIZER_NOT_REGISTERED", "Blocked", { normalizerId, normalizerVersion });

    const rawBefore = internal.stableStringify(refs.raw);
    const evidenceBefore = internal.stableStringify(refs.evidence);
    let normalizedData;
    try {
      normalizedData = await implementation(internal.clone(x.inputData), {
        rawEvidence: internal.clone(refs.raw),
        acquisitionEvidence: internal.clone(refs.evidence),
        schemaVersion: definition.schemaVersion,
        normalizerId,
        normalizerVersion
      });
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_NORMALIZATION_FAILED", "Failed", { rawEvidencePreserved: true, normalizationFailureInvalidatesRawEvidence: false }, { error: { message: error && error.message || String(error), category: "Normalization" } });
    }

    if (!internal.isPlainObject(normalizedData) && !Array.isArray(normalizedData)) return internal.buildResult(false, "EXTERNAL010_NORMALIZED_DATA_INVALID", "Blocked", { rawEvidencePreserved: true });
    const context = { evidenceId: refs.evidence.evidenceId, rawEvidenceId: refs.raw.rawEvidenceId, normalizerId, normalizerVersion };
    const unit = await runResolutionHook("UNIT", normalizedData, context);
    const temporal = await runResolutionHook("TEMPORAL", normalizedData, context);
    const entity = await runResolutionHook("ENTITY", normalizedData, context);
    let resolutionState = internal.text(x.resolutionState, "UNRESOLVED").toUpperCase();
    if (!RESOLUTION_STATES.has(resolutionState)) resolutionState = "UNKNOWN";
    if ([unit.state, temporal.state, entity.state].includes("AMBIGUOUS")) resolutionState = "AMBIGUOUS";
    if ([unit.state, temporal.state, entity.state].includes("FAILED")) resolutionState = "FAILED";

    const rawAfter = internal.stableStringify(state.rawEvidenceRecords.get(refs.raw.rawEvidenceId));
    const evidenceAfter = internal.stableStringify(state.acquisitionEvidenceRecords.get(refs.evidence.evidenceId));
    if (rawBefore !== rawAfter || evidenceBefore !== evidenceAfter) return internal.buildResult(false, "EXTERNAL010_RAW_EVIDENCE_MUTATION_DETECTED", "Blocked", { rawEvidencePreserved: false });

    const previous = Array.from(state.normalizedRecords.values()).filter(function sameRaw(record) { return record.rawEvidenceId === refs.raw.rawEvidenceId && record.normalizerId === normalizerId; }).sort(function newest(a,b){return String(b.createdAt).localeCompare(String(a.createdAt));})[0] || null;
    let normalizationState = internal.text(x.normalizationState, "NORMALIZED").toUpperCase();
    if (!NORMALIZATION_STATES.has(normalizationState)) normalizationState = "UNKNOWN";
    const record = internal.deepFreeze({
      normalizedRecordId: internal.nextId("EXTERNAL-010-NORMALIZED"),
      recordType: definition.recordType,
      recordVersion: 1,
      schemaVersion: definition.schemaVersion,
      rawEvidenceId: refs.raw.rawEvidenceId,
      sourceEvidenceId: refs.evidence.evidenceId,
      sourceContentHash: refs.raw.contentHash,
      normalizerId,
      normalizerVersion,
      normalizationState,
      resolutionState,
      normalizedData: internal.clone(normalizedData),
      unitResolution: unit,
      temporalResolution: temporal,
      entityResolution: entity,
      provenanceReference: { evidenceId: refs.evidence.evidenceId, rawEvidenceId: refs.raw.rawEvidenceId, requestId: refs.evidence.requestId || null, sourceId: refs.evidence.sourceId || null },
      derivedDataBoundary: true,
      rawEvidencePreserved: true,
      rawEvidenceOverwritePerformed: false,
      normalizationReplacesRawEvidence: false,
      normalizationEqualsInterpretation: false,
      supersedesNormalizedRecordId: previous ? previous.normalizedRecordId : null,
      historyOverwritePerformed: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const validity = validateRecord("normalizedRecord", "EXTERNAL-010-SCHEMA-NORMALIZED-RECORD", record);
    if (!validity.valid) return internal.buildResult(false, "EXTERNAL010_NORMALIZED_RECORD_INVALID", "Blocked", validity);
    state.normalizedRecords.set(record.normalizedRecordId, record);
    internal.touch();
    return internal.buildResult(true, previous ? "EXTERNAL010_EVIDENCE_RENORMALIZED" : "EXTERNAL010_EVIDENCE_NORMALIZED", "Ready", { normalizedRecord: internal.clone(record), priorVersionPreserved: Boolean(previous), rawEvidenceUnchanged: true });
  }

  function getExternalIntelligenceNormalizedRecord(normalizedRecordId) {
    const id = internal.text(normalizedRecordId, "");
    const record = id && state.normalizedRecords.get(id);
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceNormalizedRecords(input) {
    const x = internal.isPlainObject(input) ? input : {};
    return Array.from(state.normalizedRecords.values()).filter(function filter(record) {
      if (x.rawEvidenceId && record.rawEvidenceId !== x.rawEvidenceId) return false;
      if (x.sourceEvidenceId && record.sourceEvidenceId !== x.sourceEvidenceId) return false;
      if (x.normalizerId && record.normalizerId !== x.normalizerId) return false;
      return true;
    }).map(internal.clone);
  }

  function initializeExternalIntelligenceNormalization() {
    namespace.modules.normalization.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_NORMALIZATION_INITIALIZED", "Ready", {
      immutableRaw: true,
      versionedNormalizedLayer: true,
      explicitResolutionState: true,
      reprocessingPreservesHistory: true,
      unknownMayBeSilentlyResolved: false,
      ambiguousMayBeSilentlyResolved: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceNormalization,
    registerExternalIntelligenceNormalizer,
    setExternalIntelligenceNormalizationResolutionHook,
    normalizeExternalIntelligenceEvidence,
    getExternalIntelligenceNormalizedRecord,
    listExternalIntelligenceNormalizedRecords
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.normalization = { id: "EXTERNAL-010-NORMALIZATION", version: MODULE_VERSION, status: "Loaded", phase: 7, decisions: ["022"], supporting: ["008", "037", "042"], loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
