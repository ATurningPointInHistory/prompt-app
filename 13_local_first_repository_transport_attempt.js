/* ============================================================
   FILE: 13_local_first_repository_transport_attempt.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.15.0 / Module: Transport Attempt 1.0.0
   Phase 16: Controlled Cross-Device Sync Engine
   Decision-012: Evidence-Bound Recovery
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Transport Attempt blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("transportAttempt");
  const ATTEMPT_STATUSES = Object.freeze(["CREATED", "PREPARED", "EXPORT_READY", "TRANSFERRING", "RECEIVED", "VERIFYING", "VERIFIED", "FAILED", "INTERRUPTED"]);
  const TERMINAL = Object.freeze(["VERIFIED", "FAILED"]);
  const ALLOWED = Object.freeze({
    CREATED: Object.freeze(["PREPARED", "FAILED", "INTERRUPTED"]),
    PREPARED: Object.freeze(["EXPORT_READY", "FAILED", "INTERRUPTED"]),
    EXPORT_READY: Object.freeze(["TRANSFERRING", "FAILED", "INTERRUPTED"]),
    TRANSFERRING: Object.freeze(["RECEIVED", "FAILED", "INTERRUPTED"]),
    RECEIVED: Object.freeze(["VERIFYING", "FAILED", "INTERRUPTED"]),
    VERIFYING: Object.freeze(["VERIFIED", "FAILED", "INTERRUPTED"]),
    VERIFIED: Object.freeze([]),
    FAILED: Object.freeze([]),
    INTERRUPTED: Object.freeze([])
  });

  if (!(state.transportAttemptDescriptors instanceof Map)) state.transportAttemptDescriptors = new Map();
  if (!state.transportAttemptStatus) state.transportAttemptStatus = "Ready";

  function normalizeHistory(value) {
    return Array.isArray(value) ? value.map(function (item) {
      return {
        fromStatus: item && item.fromStatus == null ? null : internal.text(item && item.fromStatus, ""),
        toStatus: internal.text(item && item.toStatus, ""),
        transitionedAt: internal.text(item && item.transitionedAt, internal.nowIso()),
        reason: internal.text(item && item.reason, "unspecified")
      };
    }) : [];
  }

  function normalizeAttempt(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const status = internal.text(source.attemptStatus, "CREATED").toUpperCase();
    if (ATTEMPT_STATUSES.indexOf(status) === -1) return null;
    const now = internal.text(source.updatedAt, internal.nowIso());
    return {
      transportAttemptId: internal.text(source.transportAttemptId, internal.nextId("REPOSITORY010-TRANSPORT-ATTEMPT")),
      syncSessionId: internal.text(source.syncSessionId, ""),
      transportAdapterId: internal.text(source.transportAdapterId, "REPOSITORY-010-EXPLICIT-FILE-TRANSPORT"),
      transportType: internal.text(source.transportType, "explicit-file-transfer"),
      transferPackageId: internal.text(source.transferPackageId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      targetNodeId: internal.text(source.targetNodeId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      sourceRevisionId: source.sourceRevisionId == null ? null : internal.text(source.sourceRevisionId, ""),
      targetRevisionId: source.targetRevisionId == null ? null : internal.text(source.targetRevisionId, ""),
      attemptStatus: status,
      retryOrdinal: Number.isFinite(Number(source.retryOrdinal)) ? Number(source.retryOrdinal) : 1,
      packageHash: source.packageHash == null ? null : internal.text(source.packageHash, ""),
      v2EnvelopeHash: source.v2EnvelopeHash == null ? null : internal.text(source.v2EnvelopeHash, ""),
      transportEnvelopeHash: source.transportEnvelopeHash == null ? null : internal.text(source.transportEnvelopeHash, ""),
      transportEnvelope: internal.isPlainObject(source.transportEnvelope) ? internal.clone(source.transportEnvelope) : null,
      sourceSessionProofHash: source.sourceSessionProofHash == null ? null : internal.text(source.sourceSessionProofHash, ""),
      receiptId: source.receiptId == null ? null : internal.text(source.receiptId, ""),
      v3EvidenceId: source.v3EvidenceId == null ? null : internal.text(source.v3EvidenceId, ""),
      v4EvidenceId: source.v4EvidenceId == null ? null : internal.text(source.v4EvidenceId, ""),
      sourceFileName: source.sourceFileName == null ? null : internal.text(source.sourceFileName, ""),
      statusHistory: normalizeHistory(source.statusHistory),
      startedAt: internal.text(source.startedAt, now),
      completedAt: source.completedAt == null ? null : internal.text(source.completedAt, ""),
      interruptedFromStatus: source.interruptedFromStatus == null ? null : internal.text(source.interruptedFromStatus, ""),
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      automaticAcceptancePerformed: false,
      automaticConflictWinnerApplied: false,
      automaticBaselinePromotionPerformed: false,
      updatedAt: now,
      immutable: false
    };
  }

  async function persistAttempt(record) {
    const validation = namespace.validateContract("transportAttemptDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_CONTRACT_INVALID", "Blocked", { record: record, validation: validation });
    const saved = await namespace.persistLocalFirstRepositoryRecord("transportAttempt", record);
    if (!saved || saved.ok !== true) return saved;
    state.transportAttemptDescriptors.set(record.transportAttemptId, internal.clone(record));
    state.lastTransportAttemptId = record.transportAttemptId;
    state.transportAttemptStatus = record.attemptStatus;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_TRANSPORT_ATTEMPT_PERSISTED", record.attemptStatus, { transportAttempt: internal.clone(record), validation: validation, authorityEffect: "none" });
  }

  async function createTransportAttempt(input) {
    const record = normalizeAttempt(input);
    if (!record || !record.syncSessionId || !record.transferPackageId || !record.sourceNodeId || !record.targetNodeId || !record.baseRevisionId) {
      return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_INPUT_INVALID", "Blocked", { input: internal.clone(input || null) });
    }
    if (record.attemptStatus !== "CREATED") return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_INITIAL_STATE_GUARD_BLOCKED", "Blocked", { requestedInitialStatus: record.attemptStatus, requiredInitialStatus: "CREATED", blindStateJumpPrevented: true });
    const session = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", record.syncSessionId);
    if (!session) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_SESSION_NOT_FOUND", "Blocked", { syncSessionId: record.syncSessionId });
    if (session.transferPackageId && session.transferPackageId !== record.transferPackageId) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_PACKAGE_BINDING_MISMATCH", "Blocked", { syncSessionId: record.syncSessionId, sessionTransferPackageId: session.transferPackageId, transferPackageId: record.transferPackageId });
    const existing = await namespace.getPersistedLocalFirstRepositoryRecord("transportAttempt", record.transportAttemptId);
    if (existing) return internal.buildResult(true, "REPOSITORY010_TRANSPORT_ATTEMPT_ALREADY_EXISTS", existing.attemptStatus, { transportAttempt: internal.clone(existing), idempotent: true });
    if (record.statusHistory.length === 0) record.statusHistory.push({ fromStatus: null, toStatus: "CREATED", transitionedAt: record.startedAt, reason: "transport-attempt-created" });
    return persistAttempt(record);
  }

  function transitionAllowed(current, next) {
    return Boolean(ALLOWED[current] && ALLOWED[current].indexOf(next) !== -1);
  }

  async function transitionTransportAttempt(transportAttemptId, nextStatus, patch) {
    const id = internal.text(transportAttemptId, "");
    const next = internal.text(nextStatus, "").toUpperCase();
    if (!id || ATTEMPT_STATUSES.indexOf(next) === -1) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_TRANSITION_INVALID", "Blocked", { transportAttemptId: id || null, nextStatus: next || null });
    const current = await namespace.getPersistedLocalFirstRepositoryRecord("transportAttempt", id);
    if (!current) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_NOT_FOUND", "Blocked", { transportAttemptId: id });
    if (!transitionAllowed(current.attemptStatus, next)) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_TRANSITION_GUARD_BLOCKED", "Blocked", { transportAttemptId: id, currentStatus: current.attemptStatus, requestedStatus: next, allowedNextStatuses: (ALLOWED[current.attemptStatus] || []).slice() });
    const sourcePatch = internal.isPlainObject(patch) ? patch : {};
    const history = normalizeHistory(current.statusHistory);
    history.push({ fromStatus: current.attemptStatus, toStatus: next, transitionedAt: internal.nowIso(), reason: internal.text(sourcePatch.transitionReason, "guarded-transition") });
    const data = Object.assign({}, current, sourcePatch, {
      transportAttemptId: id,
      attemptStatus: next,
      statusHistory: history,
      interruptedFromStatus: next === "INTERRUPTED" ? current.attemptStatus : current.interruptedFromStatus,
      completedAt: TERMINAL.indexOf(next) !== -1 ? internal.nowIso() : current.completedAt,
      startedAt: current.startedAt,
      updatedAt: internal.nowIso()
    });
    const normalized = normalizeAttempt(data);
    return persistAttempt(normalized);
  }

  async function restoreTransportAttempt(transportAttemptId) {
    const id = internal.text(transportAttemptId, "");
    const record = id ? await namespace.getPersistedLocalFirstRepositoryRecord("transportAttempt", id) : null;
    if (!record) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_NOT_FOUND", "Not Found", { transportAttemptId: id || null });
    const validation = namespace.validateContract("transportAttemptDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ATTEMPT_CORRUPTED", "Blocked", { transportAttemptId: id, validation: validation });
    state.transportAttemptDescriptors.set(id, internal.clone(record));
    state.lastTransportAttemptId = id;
    state.transportAttemptStatus = record.attemptStatus;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_TRANSPORT_ATTEMPT_RESTORED", "Restored", { transportAttempt: internal.clone(record), reloadRecoveryVerified: true });
  }

  async function listTransportAttempts(syncSessionId) {
    const sessionId = internal.text(syncSessionId, "");
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("transportAttempt");
    return (Array.isArray(records) ? records : []).filter(function (item) { return !sessionId || item.syncSessionId === sessionId; }).sort(function (a, b) { return Number(a.retryOrdinal || 0) - Number(b.retryOrdinal || 0) || String(a.startedAt || "").localeCompare(String(b.startedAt || "")); }).map(internal.clone);
  }

  function getTransportAttemptStatus() {
    return {
      status: state.transportAttemptStatus || "Ready",
      phase: 16,
      moduleVersion: MODULE_VERSION,
      supportedStatuses: ATTEMPT_STATUSES.slice(),
      guardedStateMachineImplemented: true,
      retryCreatesNewAttempt: true,
      reloadRecoveryImplemented: true,
      runtimeAttemptCount: state.transportAttemptDescriptors.size,
      lastTransportAttemptId: state.lastTransportAttemptId || null,
      authorityEffect: "none"
    };
  }

  Object.assign(namespace.api, {
    createLocalFirstRepositoryTransportAttempt: createTransportAttempt,
    transitionLocalFirstRepositoryTransportAttempt: transitionTransportAttempt,
    restoreLocalFirstRepositoryTransportAttempt: restoreTransportAttempt,
    listLocalFirstRepositoryTransportAttempts: listTransportAttempts,
    getLocalFirstRepositoryTransportAttemptStatus: getTransportAttemptStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.transportAttempt = {
    id: "REPOSITORY-010-TRANSPORT-ATTEMPT",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 16,
    transportAttemptImplemented: true,
    guardedStateMachineImplemented: true,
    authorityEffect: "none",
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
