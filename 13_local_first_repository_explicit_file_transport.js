/* ============================================================
   FILE: 13_local_first_repository_explicit_file_transport.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.15.0 / Module: Explicit File Transport 1.0.0
   Phase 16: Controlled Cross-Device Sync Engine
   Decision-011: Pluggable Transport Adapter / Explicit File First
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Explicit File Transport blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("explicitFileTransport");
  const ADAPTER_ID = "REPOSITORY-010-EXPLICIT-FILE-TRANSPORT";
  const TRANSPORT_TYPE = "explicit-file-transfer";
  const ENVELOPE_SCHEMA = "REPOSITORY-010-SYNC-TRANSPORT-ENVELOPE";
  const ENVELOPE_VERSION = "1.0.0";

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function (key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  function isSha256(value) { return /^[0-9a-f]{64}$/i.test(String(value || "")); }
  async function sha256Hex(value) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") throw new Error("Web Crypto SHA-256 is unavailable.");
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value == null ? "" : value)));
    return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function sessionProofPayload(snapshot) {
    const source = internal.isPlainObject(snapshot) ? snapshot : {};
    return {
      syncSessionId: source.syncSessionId,
      sourceNodeId: source.sourceNodeId,
      targetNodeId: source.targetNodeId,
      baseRevisionId: source.baseRevisionId,
      sourceRevisionId: source.sourceRevisionId,
      targetRevisionId: source.targetRevisionId,
      differenceId: source.differenceId,
      syncCandidateId: source.syncCandidateId,
      transferPackageId: source.transferPackageId,
      transportAttemptId: source.transportAttemptId,
      sessionStatus: source.sessionStatus,
      transitionHistory: internal.clone(source.transitionHistory || [])
    };
  }

  function transportEnvelopeHashPayload(envelope) {
    const source = internal.clone(envelope || {});
    delete source.transportEnvelopeHash;
    delete source.transportEnvelopeHashAlgorithm;
    return source;
  }

  async function calculateSourceSessionProofHash(snapshot) {
    return sha256Hex(stableStringify(sessionProofPayload(snapshot)));
  }

  async function calculateSyncTransportEnvelopeHash(envelope) {
    return sha256Hex(stableStringify(transportEnvelopeHashPayload(envelope)));
  }

  function adapterDescriptor() {
    return {
      transportAdapterId: ADAPTER_ID,
      transportType: TRANSPORT_TYPE,
      adapterVersion: MODULE_VERSION,
      requiresUserAction: true,
      supportsExport: true,
      supportsImport: true,
      supportsRetry: true,
      supportsResume: true,
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticPromotionAllowed: false,
      authorityEffect: "none",
      immutable: true
    };
  }

  async function ensureAttemptForExport(session, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const prior = await namespace.listLocalFirstRepositoryTransportAttempts(session.syncSessionId);
    const retryOrdinal = prior.length + 1;
    const created = await namespace.createLocalFirstRepositoryTransportAttempt({
      transportAttemptId: opts.transportAttemptId,
      syncSessionId: session.syncSessionId,
      transportAdapterId: ADAPTER_ID,
      transportType: TRANSPORT_TYPE,
      transferPackageId: session.transferPackageId,
      sourceNodeId: session.sourceNodeId,
      targetNodeId: session.targetNodeId,
      baseRevisionId: session.baseRevisionId,
      sourceRevisionId: session.sourceRevisionId,
      targetRevisionId: session.targetRevisionId,
      retryOrdinal: retryOrdinal,
      attemptStatus: "CREATED"
    });
    if (!created || created.ok !== true) return created;
    let attempt = created.data.transportAttempt;
    if (attempt.attemptStatus === "CREATED") {
      const prepared = await namespace.transitionLocalFirstRepositoryTransportAttempt(attempt.transportAttemptId, "PREPARED", { transitionReason: "explicit-file-transport-prepared" });
      if (!prepared || prepared.ok !== true) return prepared;
      attempt = prepared.data.transportAttempt;
    }
    return internal.buildResult(true, "REPOSITORY010_EXPLICIT_FILE_ATTEMPT_READY", "Prepared", { transportAttempt: attempt });
  }

  async function prepareExplicitFileTransport(syncSessionId, options) {
    const sessionId = internal.text(syncSessionId, "");
    const session = sessionId ? await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", sessionId) : null;
    if (!session) return internal.buildResult(false, "REPOSITORY010_EXPLICIT_FILE_SESSION_NOT_FOUND", "Blocked", { syncSessionId: sessionId || null });
    if (session.direction !== "push") return internal.buildResult(false, "REPOSITORY010_EXPLICIT_FILE_PUSH_SESSION_REQUIRED", "Blocked", { syncSessionId: sessionId, direction: session.direction });
    if (session.sessionStatus !== "TRANSFER_PREPARED") return internal.buildResult(false, "REPOSITORY010_EXPLICIT_FILE_SESSION_STATE_BLOCKED", "Blocked", { syncSessionId: sessionId, currentStatus: session.sessionStatus, requiredStatus: "TRANSFER_PREPARED" });
    if (!session.transferPackageId) return internal.buildResult(false, "REPOSITORY010_EXPLICIT_FILE_PACKAGE_REQUIRED", "Blocked", { syncSessionId: sessionId });

    const attemptReady = await ensureAttemptForExport(session, options);
    if (!attemptReady || attemptReady.ok !== true) return attemptReady;
    let attempt = attemptReady.data.transportAttempt;

    const v2 = await namespace.buildV2TransferEnvelope(session.transferPackageId, {
      runtimeVersion: VERSION_MANIFEST.release.version,
      sourceNodeId: session.sourceNodeId,
      exportedAt: internal.nowIso(),
      realDeviceClaim: /Android/i.test(global.navigator && global.navigator.userAgent || "") ? "android" : "unspecified"
    });
    if (!v2 || v2.ok !== true) return v2;

    const pkg = v2.data.envelope.transferPackage;
    let step = await namespace.transitionLocalFirstRepositoryTransportAttempt(attempt.transportAttemptId, "EXPORT_READY", {
      packageHash: pkg.packageHash,
      v2EnvelopeHash: v2.data.envelope.envelopeHash,
      transitionReason: "v2-envelope-ready"
    });
    if (!step || step.ok !== true) return step;
    attempt = step.data.transportAttempt;

    const sessionTransition = await namespace.transitionLocalFirstRepositorySyncSession(sessionId, "TRANSFERRING", {
      transportAttemptId: attempt.transportAttemptId,
      transitionReason: "explicit-file-export-started"
    });
    if (!sessionTransition || sessionTransition.ok !== true) return sessionTransition;

    step = await namespace.transitionLocalFirstRepositoryTransportAttempt(attempt.transportAttemptId, "TRANSFERRING", { transitionReason: "explicit-file-export-started" });
    if (!step || step.ok !== true) return step;
    attempt = step.data.transportAttempt;

    const sourceSession = sessionTransition.data.syncSession;
    const sourceSessionSnapshot = {
      syncSessionId: sourceSession.syncSessionId,
      sourceNodeId: sourceSession.sourceNodeId,
      targetNodeId: sourceSession.targetNodeId,
      baseRevisionId: sourceSession.baseRevisionId,
      sourceRevisionId: sourceSession.sourceRevisionId,
      targetRevisionId: sourceSession.targetRevisionId,
      differenceId: sourceSession.differenceId,
      syncCandidateId: sourceSession.syncCandidateId,
      transferPackageId: sourceSession.transferPackageId,
      transportAttemptId: attempt.transportAttemptId,
      sessionStatus: sourceSession.sessionStatus,
      transitionHistory: internal.clone(sourceSession.transitionHistory || [])
    };
    const sourceSessionProofHash = await calculateSourceSessionProofHash(sourceSessionSnapshot);

    const envelope = {
      schema: ENVELOPE_SCHEMA,
      version: ENVELOPE_VERSION,
      componentId: "REPOSITORY-010",
      syncSessionId: sourceSession.syncSessionId,
      transportAttemptId: attempt.transportAttemptId,
      sourceNodeId: sourceSession.sourceNodeId,
      targetNodeId: sourceSession.targetNodeId,
      baseRevisionId: sourceSession.baseRevisionId,
      sourceRevisionId: sourceSession.sourceRevisionId,
      targetRevisionId: sourceSession.targetRevisionId,
      transferPackageId: sourceSession.transferPackageId,
      packageHash: pkg.packageHash,
      sourceSessionSnapshot: sourceSessionSnapshot,
      sourceSessionProofHashAlgorithm: "SHA-256",
      sourceSessionProofHash: sourceSessionProofHash,
      v2Envelope: internal.clone(v2.data.envelope),
      v2EnvelopeHash: v2.data.envelope.envelopeHash,
      transportAdapterId: ADAPTER_ID,
      transportType: TRANSPORT_TYPE,
      requiresUserAction: true,
      canonicalMutationRequested: false,
      automaticAcceptanceRequested: false,
      automaticPromotionRequested: false,
      authorityEffect: "none",
      createdAt: internal.nowIso(),
      immutable: true
    };
    envelope.transportEnvelopeHashAlgorithm = "SHA-256";
    envelope.transportEnvelopeHash = await calculateSyncTransportEnvelopeHash(envelope);

    const contract = namespace.validateContract("syncTransportEnvelopeDescriptor", envelope);
    if (!contract.valid) return internal.buildResult(false, "REPOSITORY010_SYNC_TRANSPORT_ENVELOPE_CONTRACT_INVALID", "Blocked", { validation: contract, envelope: envelope });

    const updatedAttempt = await namespace.getPersistedLocalFirstRepositoryRecord("transportAttempt", attempt.transportAttemptId);
    const patchedAttempt = Object.assign({}, updatedAttempt, { packageHash: pkg.packageHash, v2EnvelopeHash: envelope.v2EnvelopeHash, transportEnvelopeHash: envelope.transportEnvelopeHash, transportEnvelope: internal.clone(envelope), sourceSessionProofHash: sourceSessionProofHash, updatedAt: internal.nowIso() });
    const persisted = await namespace.persistLocalFirstRepositoryRecord("transportAttempt", patchedAttempt);
    if (!persisted || persisted.ok !== true) return persisted;

    await namespace.createLocalFirstRepositorySyncEvidence({
      syncSessionId: sessionId,
      evidenceType: "transfer-exported",
      sessionStatus: "TRANSFERRING",
      relatedRecordId: attempt.transportAttemptId,
      validationPassed: true,
      detail: { transferPackageId: session.transferPackageId, packageHash: pkg.packageHash, transportEnvelopeHash: envelope.transportEnvelopeHash, sourceSessionProofHash: sourceSessionProofHash }
    });

    state.lastSyncTransportEnvelope = internal.clone(envelope);
    state.explicitFileTransportStatus = "Export Ready";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_EXPLICIT_FILE_TRANSPORT_READY", "Export Ready", {
      envelope: envelope,
      transportAttempt: patchedAttempt,
      sourceSessionProofVerified: true,
      v2EnvelopePrepared: true,
      actualPhysicalTransferPerformed: false,
      authorityEffect: "none",
      canonicalMutationPerformed: false
    });
  }

  function downloadJson(filename, value) {
    if (!global.document || typeof Blob === "undefined" || !global.URL || typeof global.URL.createObjectURL !== "function") return internal.buildResult(false, "REPOSITORY010_EXPLICIT_FILE_DOWNLOAD_UNAVAILABLE", "Blocked", null);
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = global.URL.createObjectURL(blob);
    const a = global.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    global.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { global.URL.revokeObjectURL(url); }, 0);
    return internal.buildResult(true, "REPOSITORY010_EXPLICIT_FILE_DOWNLOAD_STARTED", "Ready", { filename: filename });
  }

  async function downloadExplicitFileTransport(syncSessionId, options) {
    const prepared = await prepareExplicitFileTransport(syncSessionId, options);
    if (!prepared || prepared.ok !== true) return prepared;
    const envelope = prepared.data.envelope;
    const filename = "REPOSITORY-010_SYNC_" + String(envelope.syncSessionId).replace(/[^A-Za-z0-9._-]/g, "_") + "_" + String(envelope.transportAttemptId).replace(/[^A-Za-z0-9._-]/g, "_") + ".json";
    const downloaded = downloadJson(filename, envelope);
    if (!downloaded.ok) return downloaded;
    return internal.buildResult(true, "REPOSITORY010_EXPLICIT_FILE_TRANSPORT_EXPORTED", "Transferring", { filename: filename, envelope: envelope, transportAttempt: prepared.data.transportAttempt, requiresUserAction: true, authorityEffect: "none" });
  }

  async function validateSyncTransportEnvelope(envelope, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const source = internal.isPlainObject(envelope) ? envelope : {};
    const contract = namespace.validateContract("syncTransportEnvelopeDescriptor", source);
    let calculatedTransportHash = null;
    let calculatedProofHash = null;
    try { calculatedTransportHash = await calculateSyncTransportEnvelopeHash(source); } catch (_) {}
    try { calculatedProofHash = await calculateSourceSessionProofHash(source.sourceSessionSnapshot || {}); } catch (_) {}
    const outerHashVerified = source.transportEnvelopeHashAlgorithm === "SHA-256" && isSha256(source.transportEnvelopeHash) && source.transportEnvelopeHash === calculatedTransportHash;
    const proofHashVerified = source.sourceSessionProofHashAlgorithm === "SHA-256" && isSha256(source.sourceSessionProofHash) && source.sourceSessionProofHash === calculatedProofHash;
    const snapshot = internal.isPlainObject(source.sourceSessionSnapshot) ? source.sourceSessionSnapshot : {};
    const bindingVerified = source.syncSessionId === snapshot.syncSessionId && source.transportAttemptId === snapshot.transportAttemptId && source.transferPackageId === snapshot.transferPackageId && source.baseRevisionId === snapshot.baseRevisionId && source.sourceNodeId === snapshot.sourceNodeId && source.targetNodeId === snapshot.targetNodeId && snapshot.sessionStatus === "TRANSFERRING";
    const v2Validation = typeof namespace.validateV2TransferEnvelope === "function" ? await namespace.validateV2TransferEnvelope(source.v2Envelope, { requireAndroidSender: opts.requireAndroidSender === true }) : { valid: false, reason: "v2-api-unavailable" };
    const v2BindingVerified = Boolean(source.v2Envelope && source.v2Envelope.transferPackage && source.v2Envelope.envelopeHash === source.v2EnvelopeHash && source.v2Envelope.transferPackage.transferPackageId === source.transferPackageId && source.v2Envelope.transferPackage.packageHash === source.packageHash && source.v2Envelope.transferPackage.baseRevisionId === source.baseRevisionId && source.v2Envelope.transferPackage.sourceNodeId === source.sourceNodeId);
    return {
      valid: contract.valid === true && outerHashVerified && proofHashVerified && bindingVerified && v2Validation.valid === true && v2BindingVerified,
      contract: contract,
      outerHashVerified: outerHashVerified,
      expectedTransportEnvelopeHash: source.transportEnvelopeHash || null,
      calculatedTransportEnvelopeHash: calculatedTransportHash,
      sourceSessionProofHashVerified: proofHashVerified,
      calculatedSourceSessionProofHash: calculatedProofHash,
      bindingVerified: bindingVerified,
      v2Validation: v2Validation,
      v2BindingVerified: v2BindingVerified
    };
  }

  async function reconstructReceiverSession(envelope) {
    const id = envelope.syncSessionId;
    let session = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", id);
    if (session) {
      const same = session.sourceNodeId === envelope.sourceNodeId && session.targetNodeId === envelope.targetNodeId && session.baseRevisionId === envelope.baseRevisionId && session.transferPackageId === envelope.transferPackageId;
      if (!same) return internal.buildResult(false, "REPOSITORY010_RECEIVER_SESSION_BINDING_MISMATCH", "Blocked", { existingSession: session, envelopeSessionId: id });
      return internal.buildResult(true, "REPOSITORY010_RECEIVER_SESSION_REUSED", session.sessionStatus, { syncSession: session, reused: true });
    }
    const created = await namespace.createLocalFirstRepositorySyncSession({
      syncSessionId: id,
      projectId: envelope.v2Envelope.transferPackage.projectId,
      repositoryId: envelope.v2Envelope.transferPackage.repositoryId,
      sourceNodeId: envelope.sourceNodeId,
      targetNodeId: envelope.targetNodeId,
      direction: "push",
      baseRevisionId: envelope.baseRevisionId,
      sourceRevisionId: envelope.sourceRevisionId,
      targetRevisionId: envelope.targetRevisionId,
      sessionStatus: "CREATED"
    });
    if (!created || created.ok !== true) return created;
    const path = ["OBSERVING", "DIFFERENCE_DETECTED", "CANDIDATE_READY", "TRANSFER_PREPARED", "TRANSFERRING"];
    for (const status of path) {
      const patch = {
        differenceId: envelope.sourceSessionSnapshot.differenceId,
        syncCandidateId: envelope.sourceSessionSnapshot.syncCandidateId,
        transferPackageId: envelope.transferPackageId,
        transportAttemptId: envelope.transportAttemptId,
        sourceRevisionId: envelope.sourceRevisionId,
        targetRevisionId: envelope.targetRevisionId,
        transitionReason: "cross-device-session-proof-replay"
      };
      const transitioned = await namespace.transitionLocalFirstRepositorySyncSession(id, status, patch);
      if (!transitioned || transitioned.ok !== true) return transitioned;
      session = transitioned.data.syncSession;
    }
    return internal.buildResult(true, "REPOSITORY010_RECEIVER_SESSION_RECONSTRUCTED", "TRANSFERRING", { syncSession: session, reused: false, replayValidated: true });
  }

  async function reconstructReceiverAttempt(envelope) {
    let attempt = await namespace.getPersistedLocalFirstRepositoryRecord("transportAttempt", envelope.transportAttemptId);
    if (attempt) return internal.buildResult(true, "REPOSITORY010_RECEIVER_ATTEMPT_REUSED", attempt.attemptStatus, { transportAttempt: attempt, reused: true });
    const created = await namespace.createLocalFirstRepositoryTransportAttempt({
      transportAttemptId: envelope.transportAttemptId,
      syncSessionId: envelope.syncSessionId,
      transportAdapterId: ADAPTER_ID,
      transportType: TRANSPORT_TYPE,
      transferPackageId: envelope.transferPackageId,
      sourceNodeId: envelope.sourceNodeId,
      targetNodeId: envelope.targetNodeId,
      baseRevisionId: envelope.baseRevisionId,
      sourceRevisionId: envelope.sourceRevisionId,
      targetRevisionId: envelope.targetRevisionId,
      retryOrdinal: 1,
      packageHash: envelope.packageHash,
      v2EnvelopeHash: envelope.v2EnvelopeHash,
      transportEnvelopeHash: envelope.transportEnvelopeHash,
      transportEnvelope: internal.clone(envelope),
      sourceSessionProofHash: envelope.sourceSessionProofHash,
      attemptStatus: "CREATED"
    });
    if (!created || created.ok !== true) return created;
    for (const status of ["PREPARED", "EXPORT_READY", "TRANSFERRING"]) {
      const transitioned = await namespace.transitionLocalFirstRepositoryTransportAttempt(envelope.transportAttemptId, status, { transitionReason: "cross-device-attempt-proof-replay" });
      if (!transitioned || transitioned.ok !== true) return transitioned;
      attempt = transitioned.data.transportAttempt;
    }
    return internal.buildResult(true, "REPOSITORY010_RECEIVER_ATTEMPT_RECONSTRUCTED", "TRANSFERRING", { transportAttempt: attempt, reused: false });
  }

  async function receiveExplicitFileTransportEnvelope(envelope, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const validation = await validateSyncTransportEnvelope(envelope, { requireAndroidSender: opts.requireAndroidSender !== false });
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_SYNC_TRANSPORT_INTEGRITY_BLOCKED", "Blocked", validation);

    const sessionReady = await reconstructReceiverSession(envelope);
    if (!sessionReady || sessionReady.ok !== true) return sessionReady;
    const attemptReady = await reconstructReceiverAttempt(envelope);
    if (!attemptReady || attemptReady.ok !== true) return attemptReady;

    const v2 = await namespace.receiveV2TransferEnvelope(envelope.v2Envelope, { requireAndroidSender: opts.requireAndroidSender !== false, receivedViaUserSelection: opts.receivedViaUserSelection === true, fileName: internal.text(opts.fileName, "sync-transport.json") });
    if (!v2 || v2.ok !== true) return v2;
    const receipt = v2.data.receipt;
    const transferPackagePersisted = await namespace.persistLocalFirstRepositoryRecord("transferPackage", envelope.v2Envelope.transferPackage);
    if (!transferPackagePersisted || transferPackagePersisted.ok !== true) return transferPackagePersisted;
    if (state.transferPackageDescriptors instanceof Map) state.transferPackageDescriptors.set(envelope.transferPackageId, internal.clone(envelope.v2Envelope.transferPackage));
    const receiptPersisted = await namespace.persistLocalFirstRepositoryRecord("v2TransferReceipt", receipt);
    if (!receiptPersisted || receiptPersisted.ok !== true) return receiptPersisted;

    let attempt = await namespace.transitionLocalFirstRepositoryTransportAttempt(envelope.transportAttemptId, "RECEIVED", { receiptId: receipt.receiptId, sourceFileName: internal.text(opts.fileName, "sync-transport.json"), transitionReason: "explicit-file-received" });
    if (!attempt || attempt.ok !== true) return attempt;
    const session = await namespace.transitionLocalFirstRepositorySyncSession(envelope.syncSessionId, "TRANSFERRED", { transportAttemptId: envelope.transportAttemptId, transitionReason: "explicit-file-received" });
    if (!session || session.ok !== true) return session;

    await namespace.createLocalFirstRepositorySyncEvidence({
      syncSessionId: envelope.syncSessionId,
      evidenceType: "transfer-received",
      sessionStatus: "TRANSFERRED",
      relatedRecordId: receipt.receiptId,
      validationPassed: true,
      detail: { transportAttemptId: envelope.transportAttemptId, transportEnvelopeHash: envelope.transportEnvelopeHash, receiptId: receipt.receiptId, actualPhysicalTransferReceived: opts.receivedViaUserSelection === true }
    });

    state.lastSyncTransportEnvelope = internal.clone(envelope);
    state.explicitFileTransportStatus = "Received";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_EXPLICIT_FILE_TRANSPORT_RECEIVED", "Transferred", {
      syncSession: session.data.syncSession,
      transportAttempt: attempt.data.transportAttempt,
      receipt: receipt,
      transportValidation: validation,
      v2Validation: v2.data.validation,
      actualPhysicalTransferReceived: opts.receivedViaUserSelection === true,
      authorityEffect: "none",
      canonicalMutationPerformed: false
    });
  }

  async function receiveExplicitFileTransport(file, options) {
    if (!file || typeof file.text !== "function") return internal.buildResult(false, "REPOSITORY010_EXPLICIT_FILE_REQUIRED", "Blocked", null);
    let envelope;
    try { envelope = JSON.parse(await file.text()); }
    catch (error) { return internal.buildResult(false, "REPOSITORY010_EXPLICIT_FILE_JSON_INVALID", "Blocked", null, { error: { message: error.message, category: "Transport" } }); }
    return receiveExplicitFileTransportEnvelope(envelope, Object.assign({}, internal.isPlainObject(options) ? options : {}, { fileName: internal.text(file.name, "sync-transport.json"), receivedViaUserSelection: true }));
  }

  function getExplicitFileTransportStatus() {
    return {
      status: state.explicitFileTransportStatus || "Ready",
      phase: 16,
      moduleVersion: MODULE_VERSION,
      transportAdapterId: ADAPTER_ID,
      transportType: TRANSPORT_TYPE,
      explicitFileTransportImplemented: true,
      sessionProofBindingImplemented: true,
      transportEnvelopeHashImplemented: true,
      v2Reused: typeof namespace.receiveV2TransferEnvelope === "function",
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticPromotionAllowed: false
    };
  }

  const adapter = {
    descriptor: adapterDescriptor(),
    prepare: prepareExplicitFileTransport,
    exportEnvelope: downloadExplicitFileTransport,
    receiveEnvelope: receiveExplicitFileTransportEnvelope,
    receiveFile: receiveExplicitFileTransport,
    validateEnvelope: validateSyncTransportEnvelope,
    getStatus: getExplicitFileTransportStatus
  };

  Object.assign(namespace.api, {
    prepareLocalFirstRepositoryExplicitFileTransport: prepareExplicitFileTransport,
    downloadLocalFirstRepositoryExplicitFileTransport: downloadExplicitFileTransport,
    receiveLocalFirstRepositoryExplicitFileTransportEnvelope: receiveExplicitFileTransportEnvelope,
    receiveLocalFirstRepositoryExplicitFileTransport: receiveExplicitFileTransport,
    validateLocalFirstRepositorySyncTransportEnvelope: validateSyncTransportEnvelope,
    calculateLocalFirstRepositorySyncTransportEnvelopeHash: calculateSyncTransportEnvelopeHash,
    getLocalFirstRepositoryExplicitFileTransportStatus: getExplicitFileTransportStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.explicitFileTransport = {
    id: "REPOSITORY-010-EXPLICIT-FILE-TRANSPORT",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 16,
    explicitFileTransportImplemented: true,
    transportType: TRANSPORT_TYPE,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };

  if (typeof namespace.registerLocalFirstRepositoryTransportAdapter === "function") namespace.registerLocalFirstRepositoryTransportAdapter(adapter);
})(typeof window !== "undefined" ? window : globalThis);
