/* ============================================================
   FILE: 17_external_intelligence_evidence_persistence.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 05: Immutable Evidence / Storage / Incremental Persistence
   Decisions: 005 / 006 / 008 / 014
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 evidence persistence blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("evidencePersistence");

  function ensureMap(key) { if (!(state[key] instanceof Map)) state[key] = new Map(); }
  ["rawEvidenceRecords", "acquisitionEvidenceRecords", "contentMetadataIndex", "processingCheckpoints"].forEach(ensureMap);
  if (!Object.prototype.hasOwnProperty.call(state, "evidencePersistenceAdapter")) state.evidencePersistenceAdapter = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestPhase5Validation")) state.latestPhase5Validation = null;

  const SENSITIVE_KEY = /(secret|token|password|credential|authorization|api[_-]?key|private[_-]?key|session[_-]?key)/i;

  function containsSensitiveKey(value, depth) {
    const d = Number(depth) || 0;
    if (d > 32 || value == null) return false;
    if (Array.isArray(value)) return value.some(function nested(v) { return containsSensitiveKey(v, d + 1); });
    if (!internal.isPlainObject(value)) return false;
    return Object.keys(value).some(function inspect(key) {
      return SENSITIVE_KEY.test(key) || containsSensitiveKey(value[key], d + 1);
    });
  }

  function byteLength(text) {
    const value = String(text == null ? "" : text);
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).byteLength;
    return unescape(encodeURIComponent(value)).length;
  }

  async function sha256Hex(text) {
    const value = String(text == null ? "" : text);
    if (global.crypto && global.crypto.subtle && typeof TextEncoder !== "undefined") {
      const bytes = new TextEncoder().encode(value);
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map(function hex(b) { return b.toString(16).padStart(2, "0"); }).join("");
    }
    throw new Error("SHA-256 capability unavailable");
  }

  function normalizeRawText(evidenceInput) {
    if (evidenceInput && typeof evidenceInput.rawText === "string") return evidenceInput.rawText;
    return internal.stableStringify(evidenceInput && Object.prototype.hasOwnProperty.call(evidenceInput, "payload") ? evidenceInput.payload : null);
  }

  function getResponse(responseOrId) {
    if (internal.isPlainObject(responseOrId)) return internal.clone(responseOrId);
    const id = internal.text(responseOrId, "");
    return id && state.acquisitionResponses.has(id) ? internal.clone(state.acquisitionResponses.get(id)) : null;
  }

  function getAttempt(attemptId) {
    return attemptId && state.acquisitionAttempts.has(attemptId) ? internal.clone(state.acquisitionAttempts.get(attemptId)) : null;
  }

  function getRequest(requestId) {
    return requestId && state.acquisitionRequests.has(requestId) ? internal.clone(state.acquisitionRequests.get(requestId)) : null;
  }

  function getRouteForRequest(requestId) {
    let match = null;
    state.acquisitionRoutes.forEach(function find(route) { if (!match && route.requestId === requestId) match = route; });
    return match ? internal.clone(match) : null;
  }

  async function buildEvidenceCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const response = getResponse(settings.response || settings.responseId);
    if (!response || response.status !== "SUCCESS") return internal.buildResult(false, "EXTERNAL010_EVIDENCE_SUCCESS_RESPONSE_REQUIRED", "Blocked", null);
    const request = getRequest(response.requestId);
    const attempt = getAttempt(response.attemptId);
    const route = getRouteForRequest(response.requestId);
    const source = request && state.sourceRegistry.has(request.sourceId) ? state.sourceRegistry.get(request.sourceId) : null;
    const evidenceInput = response.evidenceInput || {};
    if (!request || !attempt || !route || !source) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_LINEAGE_INCOMPLETE", "Blocked", { request: Boolean(request), attempt: Boolean(attempt), route: Boolean(route), source: Boolean(source) });
    if (containsSensitiveKey(evidenceInput.payload)) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_SENSITIVE_CONTENT_BLOCKED", "Blocked", { requestId: response.requestId });

    const rawText = normalizeRawText(evidenceInput);
    const contentHash = await sha256Hex(rawText);
    const acquiredAt = internal.text(response.temporalMetadata && response.temporalMetadata.observedAt, response.createdAt || internal.nowIso());
    const contentType = internal.text(response.responseMetadata && response.responseMetadata.contentType, "application/octet-stream");
    const evidenceId = internal.nextId("EXTERNAL-010-EVIDENCE");
    const rawEvidenceId = internal.nextId("EXTERNAL-010-RAW");
    const contentId = "EXTERNAL-010-CONTENT-SHA256-" + contentHash;
    const baseEvidence = {
      evidenceId: evidenceId,
      requestId: response.requestId,
      sourceId: request.sourceId,
      sourceVersion: Number(route.sourceVersion || source.version || 1),
      operationId: request.operationId,
      adapterId: route.adapterId,
      adapterVersion: internal.text(attempt.adapterVersion, "unknown"),
      accessMode: route.accessMode,
      acquiredAt: acquiredAt,
      publishedAt: response.temporalMetadata && response.temporalMetadata.publishedAt || null,
      status: "ACQUIRED",
      contentHash: contentHash,
      contentType: contentType,
      rawEvidenceId: rawEvidenceId,
      attemptCount: (state.acquisitionAttemptOrder.get(response.requestId) || []).length,
      correlationId: request.correlationId || null,
      acquisitionPlanId: request.acquisitionPlanId || null,
      researchGoalId: request.researchGoalId || null,
      responseId: response.responseId,
      attemptId: response.attemptId,
      routeId: route.routeId,
      runtimeVersion: VERSION_MANIFEST.release.version,
      gatewayVersion: response.evidenceInput && response.evidenceInput.gatewayVersion || null,
      schemaVersion: "1.0.0",
      recordVersion: 1,
      createdAt: internal.nowIso(),
      immutable: true
    };
    const recordHash = await sha256Hex(internal.stableStringify(baseEvidence));
    const acquisitionEvidence = Object.assign({}, baseEvidence, { recordHash: recordHash });
    const rawEvidence = {
      rawEvidenceId: rawEvidenceId,
      contentId: contentId,
      contentHash: contentHash,
      contentType: contentType,
      sizeBytes: byteLength(rawText),
      rawDataReference: null,
      storageClass: "HOT",
      acquiredAt: acquiredAt,
      publishedAt: acquisitionEvidence.publishedAt,
      sourceId: request.sourceId,
      requestId: response.requestId,
      acquisitionStatus: "ACQUIRED",
      schemaVersion: "1.0.0",
      createdAt: internal.nowIso(),
      immutable: true
    };
    const contentObject = {
      contentId: contentId,
      contentHash: contentHash,
      storageClass: "HOT",
      storageProvider: "UNPERSISTED",
      storageReference: null,
      sizeBytes: byteLength(rawText),
      contentType: contentType,
      integrityState: "HASHED",
      createdAt: internal.nowIso(),
      immutable: true
    };
    return internal.buildResult(true, "EXTERNAL010_EVIDENCE_CANDIDATE_READY", "Ready", {
      acquisitionEvidence: acquisitionEvidence,
      rawEvidence: rawEvidence,
      contentObject: contentObject,
      rawText: rawText,
      externalResponseGrantsAuthority: false,
      canonicalRepositoryMutationPerformed: false,
      knowledgePromotionPerformed: false
    });
  }

  function validateFinalRecord(contractKey, schemaId, record) {
    const contract = namespace.validateExternalIntelligenceContract(contractKey, record);
    const schema = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return { valid: contract.valid === true && schema.valid === true, contract: contract, schema: schema };
  }

  function setEvidencePersistenceAdapter(adapter) {
    if (adapter == null) {
      state.evidencePersistenceAdapter = null;
      internal.touch();
      return internal.buildResult(true, "EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_CLEARED", "Ready", null);
    }
    const required = ["persistEvidence", "readEvidence", "integrityScan", "persistCheckpoint"];
    const missing = required.filter(function missingMethod(name) { return !adapter || typeof adapter[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_INVALID", "Blocked", { missing: missing });
    state.evidencePersistenceAdapter = adapter;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_SET", "Ready", { methods: required, authorityGranted: false });
  }

  function evaluatePersistenceAuthority(action, id, purpose) {
    if (typeof namespace.evaluateExternalIntelligenceAuthority !== "function") return { allowed: false, decision: "DENY", reason: "AUTHORITY_MODULE_UNAVAILABLE", authorityEnvelopeId: null };
    return namespace.evaluateExternalIntelligenceAuthority({
      action: action,
      target: { type: action === "READ_EXTERNAL_EVIDENCE" ? "external-evidence" : "external-evidence-persistence", id: id },
      purpose: internal.text(purpose, "external-evidence")
    });
  }

  function commitReturnedPersistence(data) {
    const persisted = data && data.persistence ? data.persistence : data;
    if (!persisted || !persisted.acquisitionEvidence || !persisted.rawEvidence || !persisted.contentObject) {
      return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_RESULT_INVALID", "Blocked", null);
    }
    const ev = persisted.acquisitionEvidence;
    const raw = persisted.rawEvidence;
    const content = persisted.contentObject;
    const checks = [
      validateFinalRecord("acquisitionEvidenceRecord", "EXTERNAL-010-SCHEMA-ACQUISITION-EVIDENCE", ev),
      validateFinalRecord("rawEvidenceRecord", "EXTERNAL-010-SCHEMA-RAW-EVIDENCE", raw),
      validateFinalRecord("contentObjectMetadata", "EXTERNAL-010-SCHEMA-CONTENT-OBJECT", content)
    ];
    if (checks.some(function invalid(v) { return !v.valid; })) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_SCHEMA_INVALID", "Blocked", { validations: checks });
    if (state.acquisitionEvidenceRecords.has(ev.evidenceId)) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_ID_ALREADY_COMMITTED", "Blocked", { evidenceId: ev.evidenceId });
    state.acquisitionEvidenceRecords.set(ev.evidenceId, internal.deepFreeze(internal.clone(ev)));
    state.rawEvidenceRecords.set(raw.rawEvidenceId, internal.deepFreeze(internal.clone(raw)));
    if (!state.contentMetadataIndex.has(content.contentHash)) state.contentMetadataIndex.set(content.contentHash, internal.deepFreeze(internal.clone(content)));
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EVIDENCE_PERSISTENCE_COMMITTED", "Ready", internal.clone(persisted));
  }

  async function persistAcquisitionEvidence(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    if (!state.evidencePersistenceAdapter) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_UNAVAILABLE", "Unavailable", { persisted: false });
    const candidate = await buildEvidenceCandidate(settings);
    if (!candidate.ok) return candidate;
    const evidence = candidate.data.acquisitionEvidence;
    const authority = evaluatePersistenceAuthority("PERSIST_EXTERNAL_EVIDENCE", evidence.evidenceId, settings.purpose || "persist-external-evidence");
    if (!authority.allowed || !authority.authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_AUTHORITY_DENIED", "Blocked", { authority: authority, persisted: false });
    const result = await state.evidencePersistenceAdapter.persistEvidence({
      acquisitionEvidence: internal.clone(candidate.data.acquisitionEvidence),
      rawEvidence: internal.clone(candidate.data.rawEvidence),
      contentObject: internal.clone(candidate.data.contentObject),
      rawText: candidate.data.rawText,
      authority: {
        action: "PERSIST_EXTERNAL_EVIDENCE",
        allowed: true,
        decision: authority.decision,
        reason: authority.reason,
        authorityEnvelopeId: authority.authorityEnvelopeId,
        evaluatedAt: authority.evaluatedAt
      }
    });
    if (!result || result.ok !== true) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_FAILED", result && result.status || "Failed", result && result.data || null, result && result.error ? { error: result.error } : null);
    const committed = commitReturnedPersistence(result.data);
    if (committed.ok && typeof namespace.appendExternalIntelligenceAuditEvent === "function") {
      await namespace.appendExternalIntelligenceAuditEvent({ eventType: "EXTERNAL_EVIDENCE_PERSISTED", actor: "SYSTEM", outcome: "Succeeded", details: { evidenceId: committed.data.acquisitionEvidence.evidenceId, rawEvidenceId: committed.data.rawEvidence.rawEvidenceId, contentHash: committed.data.contentObject.contentHash, contentCreated: committed.data.contentCreated === true, canonicalRepositoryMutationPerformed: false } });
    }
    return committed;
  }

  async function readPersistedEvidence(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const evidenceId = internal.text(settings.evidenceId, "");
    if (!evidenceId) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_ID_REQUIRED", "Blocked", null);
    if (!state.evidencePersistenceAdapter) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_UNAVAILABLE", "Unavailable", null);
    const authority = evaluatePersistenceAuthority("READ_EXTERNAL_EVIDENCE", evidenceId, settings.purpose || "read-external-evidence");
    if (!authority.allowed || !authority.authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_READ_AUTHORITY_DENIED", "Blocked", { authority: authority });
    return state.evidencePersistenceAdapter.readEvidence({ evidenceId: evidenceId, verifyHash: settings.verifyHash !== false, authority: { action: "READ_EXTERNAL_EVIDENCE", allowed: true, authorityEnvelopeId: authority.authorityEnvelopeId, decision: authority.decision, reason: authority.reason, evaluatedAt: authority.evaluatedAt } });
  }

  async function scanEvidenceIntegrity(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    if (!state.evidencePersistenceAdapter) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_UNAVAILABLE", "Unavailable", null);
    const authority = evaluatePersistenceAuthority("READ_EXTERNAL_EVIDENCE", "integrity-scan", settings.purpose || "evidence-integrity-scan");
    if (!authority.allowed || !authority.authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_READ_AUTHORITY_DENIED", "Blocked", { authority: authority });
    return state.evidencePersistenceAdapter.integrityScan({ authority: { action: "READ_EXTERNAL_EVIDENCE", allowed: true, authorityEnvelopeId: authority.authorityEnvelopeId, decision: authority.decision, reason: authority.reason, evaluatedAt: authority.evaluatedAt } });
  }

  async function createProcessingCheckpoint(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const contentHash = internal.text(settings.contentHash, "");
    const processorId = internal.text(settings.processorId, "");
    const processorVersion = internal.text(settings.processorVersion, "");
    const parameterHash = internal.text(settings.parameterHash, "");
    if (!/^[a-f0-9]{64}$/.test(contentHash) || !processorId || !processorVersion) return internal.buildResult(false, "EXTERNAL010_PROCESSING_CHECKPOINT_INPUT_INVALID", "Blocked", null);
    const authority = evaluatePersistenceAuthority("PERSIST_EXTERNAL_PROCESSING_STATE", contentHash + ":" + processorId, settings.purpose || "processing-checkpoint");
    if (!authority.allowed || !authority.authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_PROCESSING_CHECKPOINT_AUTHORITY_DENIED", "Blocked", { authority: authority });
    const previous = Array.from(state.processingCheckpoints.values()).filter(function match(v) { return v.contentHash === contentHash && v.processorId === processorId && v.processorVersion === processorVersion && v.parameterHash === parameterHash; }).sort(function newest(a,b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })[0] || null;
    const checkpoint = {
      checkpointId: internal.nextId("EXTERNAL-010-PROCESSING-CHECKPOINT"),
      contentHash: contentHash,
      processorId: processorId,
      processorVersion: processorVersion,
      parameterHash: parameterHash,
      processingState: internal.text(settings.processingState, "READY").toUpperCase(),
      resumeCursor: settings.resumeCursor == null ? null : internal.clone(settings.resumeCursor),
      supersedesCheckpointId: previous ? previous.checkpointId : null,
      createdAt: internal.nowIso(),
      immutable: true
    };
    const validation = validateFinalRecord("processingCheckpoint", "EXTERNAL-010-SCHEMA-PROCESSING-CHECKPOINT", checkpoint);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_PROCESSING_CHECKPOINT_SCHEMA_INVALID", "Blocked", { validation: validation });
    if (!state.evidencePersistenceAdapter) return internal.buildResult(false, "EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_UNAVAILABLE", "Unavailable", null);
    const persisted = await state.evidencePersistenceAdapter.persistCheckpoint({ checkpoint: checkpoint, authority: { action: "PERSIST_EXTERNAL_PROCESSING_STATE", allowed: true, authorityEnvelopeId: authority.authorityEnvelopeId, decision: authority.decision, reason: authority.reason, evaluatedAt: authority.evaluatedAt } });
    if (!persisted || persisted.ok !== true) return persisted || internal.buildResult(false, "EXTERNAL010_PROCESSING_CHECKPOINT_PERSIST_FAILED", "Failed", null);
    state.processingCheckpoints.set(checkpoint.checkpointId, internal.deepFreeze(internal.clone(checkpoint)));
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_PROCESSING_CHECKPOINT_PERSISTED", "Ready", { checkpoint: internal.clone(checkpoint), incremental: { sameInputAndProcessor: Boolean(previous), fullReprocessingRequired: false } });
  }

  function getAcquisitionEvidence(evidenceId) {
    const record = state.acquisitionEvidenceRecords.get(internal.text(evidenceId, ""));
    return record ? internal.clone(record) : null;
  }

  function getRawEvidence(rawEvidenceId) {
    const record = state.rawEvidenceRecords.get(internal.text(rawEvidenceId, ""));
    return record ? internal.clone(record) : null;
  }

  function getContentMetadata(contentHash) {
    const record = state.contentMetadataIndex.get(internal.text(contentHash, ""));
    return record ? internal.clone(record) : null;
  }

  function getEvidencePersistenceState() {
    return {
      acquisitionEvidenceCount: state.acquisitionEvidenceRecords.size,
      rawEvidenceCount: state.rawEvidenceRecords.size,
      uniqueContentCount: state.contentMetadataIndex.size,
      processingCheckpointCount: state.processingCheckpoints.size,
      persistenceAdapterConfigured: Boolean(state.evidencePersistenceAdapter),
      immutableRawEvidence: true,
      contentAddressed: true,
      metadataIsOnlyEvidenceIdentityCopy: false,
      orphanAutomaticDeletionAllowed: false,
      canonicalRepositoryMutationAllowed: false,
      automaticKnowledgePromotionAllowed: false
    };
  }

  function initializeExternalIntelligenceEvidencePersistence() {
    if (typeof namespace.enableExternalIntelligenceGatewayEvidencePersistenceBridge === "function") namespace.enableExternalIntelligenceGatewayEvidencePersistenceBridge();
    namespace.modules.evidencePersistence.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_EVIDENCE_PERSISTENCE_INITIALIZED", "Ready", getEvidencePersistenceState());
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceEvidencePersistence: initializeExternalIntelligenceEvidencePersistence,
    setExternalIntelligenceEvidencePersistenceAdapter: setEvidencePersistenceAdapter,
    buildExternalIntelligenceEvidenceCandidate: buildEvidenceCandidate,
    persistExternalIntelligenceAcquisitionEvidence: persistAcquisitionEvidence,
    readPersistedExternalIntelligenceEvidence: readPersistedEvidence,
    scanExternalIntelligenceEvidenceIntegrity: scanEvidenceIntegrity,
    createExternalIntelligenceProcessingCheckpoint: createProcessingCheckpoint,
    getExternalIntelligenceAcquisitionEvidence: getAcquisitionEvidence,
    getExternalIntelligenceRawEvidence: getRawEvidence,
    getExternalIntelligenceContentMetadata: getContentMetadata,
    getExternalIntelligenceEvidencePersistenceState: getEvidencePersistenceState
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.evidencePersistence = {
    id: "EXTERNAL-010-EVIDENCE-PERSISTENCE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 5,
    decisions: ["005", "006", "008", "014"],
    contentAddressed: true,
    metadataIndex: "SQLite via Local Gateway",
    rawEvidenceImmutable: true,
    automaticOrphanDeletionAllowed: false,
    canonicalRepositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
