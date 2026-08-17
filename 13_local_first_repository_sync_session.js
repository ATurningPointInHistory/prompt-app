/* ============================================================
   FILE: 13_local_first_repository_sync_session.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.15.0 / Module: Sync Session 1.1.0
   Phase 16: Guarded Deterministic Sync State Machine
   Decision-012
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Sync Session blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("syncSession");
  const SESSION_STATUSES = Object.freeze([
    "CREATED", "OBSERVING", "DIFFERENCE_DETECTED", "CANDIDATE_READY",
    "TRANSFER_PREPARED", "TRANSFERRING", "TRANSFERRED", "VERIFYING",
    "CONFLICT_DETECTED", "AWAITING_ACCEPTANCE", "COMPLETED", "FAILED", "INTERRUPTED"
  ]);
  const DIRECTIONS = Object.freeze(["pull", "push"]);
  const ACTIVE = Object.freeze(["CREATED", "OBSERVING", "DIFFERENCE_DETECTED", "CANDIDATE_READY", "TRANSFER_PREPARED", "TRANSFERRING", "TRANSFERRED", "VERIFYING"]);
  const ALLOWED = Object.freeze({
    CREATED: Object.freeze(["OBSERVING", "FAILED", "INTERRUPTED"]),
    OBSERVING: Object.freeze(["DIFFERENCE_DETECTED", "COMPLETED", "FAILED", "INTERRUPTED"]),
    DIFFERENCE_DETECTED: Object.freeze(["CANDIDATE_READY", "CONFLICT_DETECTED", "FAILED", "INTERRUPTED"]),
    CANDIDATE_READY: Object.freeze(["TRANSFER_PREPARED", "FAILED", "INTERRUPTED"]),
    TRANSFER_PREPARED: Object.freeze(["TRANSFERRING", "FAILED", "INTERRUPTED"]),
    TRANSFERRING: Object.freeze(["TRANSFERRED", "FAILED", "INTERRUPTED"]),
    TRANSFERRED: Object.freeze(["VERIFYING", "FAILED", "INTERRUPTED"]),
    VERIFYING: Object.freeze(["AWAITING_ACCEPTANCE", "CONFLICT_DETECTED", "FAILED", "INTERRUPTED"]),
    CONFLICT_DETECTED: Object.freeze([]),
    AWAITING_ACCEPTANCE: Object.freeze([]),
    COMPLETED: Object.freeze([]),
    FAILED: Object.freeze([]),
    INTERRUPTED: Object.freeze([])
  });

  if (!(state.syncSessionDescriptors instanceof Map)) state.syncSessionDescriptors = new Map();
  if (!state.syncSessionStatus) state.syncSessionStatus = "Ready";

  function fail(code, message, data) {
    state.syncSessionStatus = "Blocked";
    state.lastSyncSessionError = { message: message, category: "Sync Session" };
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(state.lastSyncSessionError) });
  }

  function normalizeHistory(value) {
    return Array.isArray(value) ? value.map(function (item) {
      return {
        fromStatus: item && item.fromStatus == null ? null : internal.text(item && item.fromStatus, ""),
        toStatus: internal.text(item && item.toStatus, ""),
        transitionedAt: internal.text(item && item.transitionedAt, internal.nowIso()),
        reason: internal.text(item && item.reason, "unspecified"),
        relatedRecordId: item && item.relatedRecordId == null ? null : internal.text(item && item.relatedRecordId, "")
      };
    }) : [];
  }

  function sessionRecord(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const direction = internal.text(source.direction, "").toLowerCase();
    const status = internal.text(source.sessionStatus, "CREATED").toUpperCase();
    if (DIRECTIONS.indexOf(direction) === -1 || SESSION_STATUSES.indexOf(status) === -1) return null;
    const now = internal.text(source.updatedAt, internal.nowIso());
    return {
      syncSessionId: internal.text(source.syncSessionId, internal.nextId("REPOSITORY010-SYNC-SESSION")),
      projectId: internal.text(source.projectId, "AI-PROMPT-OS-MAIN"),
      repositoryId: internal.text(source.repositoryId, "AI-PROMPT-OS-REPOSITORY"),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      targetNodeId: internal.text(source.targetNodeId, ""),
      direction: direction,
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      sourceRevisionId: source.sourceRevisionId == null ? null : internal.text(source.sourceRevisionId, ""),
      targetRevisionId: source.targetRevisionId == null ? null : internal.text(source.targetRevisionId, ""),
      sessionStatus: status,
      differenceId: source.differenceId == null ? null : internal.text(source.differenceId, ""),
      syncCandidateId: source.syncCandidateId == null ? null : internal.text(source.syncCandidateId, ""),
      transferPackageId: source.transferPackageId == null ? null : internal.text(source.transferPackageId, ""),
      transportAttemptId: source.transportAttemptId == null ? null : internal.text(source.transportAttemptId, ""),
      transitionHistory: normalizeHistory(source.transitionHistory),
      conflictEvidenceId: source.conflictEvidenceId == null ? null : internal.text(source.conflictEvidenceId, ""),
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      automaticAcceptancePerformed: false,
      automaticConflictWinnerApplied: false,
      automaticBaselinePromotionPerformed: false,
      syncEngineInvoked: source.syncEngineInvoked === true,
      createdAt: internal.text(source.createdAt, now),
      updatedAt: now,
      immutable: false
    };
  }

  async function persist(record) {
    const validation = namespace.validateContract("syncSessionDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_SYNC_SESSION_CONTRACT_INVALID", "Blocked", { validation: validation, record: record });
    const saved = await namespace.persistLocalFirstRepositoryRecord("syncSession", record);
    if (!saved || saved.ok !== true) return saved;
    state.syncSessionDescriptors.set(record.syncSessionId, internal.clone(record));
    state.lastSyncSessionId = record.syncSessionId;
    state.syncSessionStatus = record.sessionStatus;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_SESSION_PERSISTED", record.sessionStatus, { syncSession: internal.clone(record), validation: validation, authorityEffect: "none", canonicalMutationPerformed: false, syncEngineInvoked: record.syncEngineInvoked === true });
  }

  async function createSyncSession(input) {
    const record = sessionRecord(input);
    if (!record || !record.sourceNodeId || !record.targetNodeId || !record.baseRevisionId) return fail("REPOSITORY010_SYNC_SESSION_INPUT_INVALID", "sourceNodeId, targetNodeId, direction and baseRevisionId are required.", { input: internal.clone(input || null) });
    if (record.sessionStatus !== "CREATED") return fail("REPOSITORY010_SYNC_SESSION_INITIAL_STATE_GUARD_BLOCKED", "New Sync Sessions must start in CREATED.", { requestedInitialStatus: record.sessionStatus, requiredInitialStatus: "CREATED", blindStateJumpPrevented: true });
    const existing = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", record.syncSessionId);
    if (existing) return internal.buildResult(true, "REPOSITORY010_SYNC_SESSION_ALREADY_EXISTS", existing.sessionStatus, { syncSession: internal.clone(existing), idempotent: true, authorityEffect: "none", canonicalMutationPerformed: false, syncEngineInvoked: existing.syncEngineInvoked === true });
    if (record.transitionHistory.length === 0) record.transitionHistory.push({ fromStatus: null, toStatus: "CREATED", transitionedAt: record.createdAt, reason: "sync-session-created", relatedRecordId: null });
    return persist(record);
  }

  function allowedTransition(currentStatus, nextStatus) {
    return Boolean(ALLOWED[currentStatus] && ALLOWED[currentStatus].indexOf(nextStatus) !== -1);
  }

  async function transitionSyncSession(syncSessionId, nextStatus, patch) {
    const id = internal.text(syncSessionId, "");
    const status = internal.text(nextStatus, "").toUpperCase();
    if (!id || SESSION_STATUSES.indexOf(status) === -1) return fail("REPOSITORY010_SYNC_SESSION_TRANSITION_INVALID", "A valid syncSessionId and session status are required.");
    const current = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", id);
    if (!current) return fail("REPOSITORY010_SYNC_SESSION_NOT_FOUND", "Sync session was not found.", { syncSessionId: id });
    if (current.sessionStatus === status) return internal.buildResult(true, "REPOSITORY010_SYNC_SESSION_TRANSITION_IDEMPOTENT", status, { syncSession: internal.clone(current), idempotent: true });
    if (!allowedTransition(current.sessionStatus, status)) return fail("REPOSITORY010_SYNC_SESSION_TRANSITION_GUARD_BLOCKED", "The requested sync session state transition is not allowed.", { syncSessionId: id, currentStatus: current.sessionStatus, requestedStatus: status, allowedNextStatuses: (ALLOWED[current.sessionStatus] || []).slice(), blindStateJumpPrevented: true });
    const sourcePatch = internal.isPlainObject(patch) ? patch : {};
    const history = normalizeHistory(current.transitionHistory);
    history.push({
      fromStatus: current.sessionStatus,
      toStatus: status,
      transitionedAt: internal.nowIso(),
      reason: internal.text(sourcePatch.transitionReason, "guarded-transition"),
      relatedRecordId: sourcePatch.relatedRecordId == null ? null : internal.text(sourcePatch.relatedRecordId, "")
    });
    const next = sessionRecord(Object.assign({}, current, sourcePatch, {
      syncSessionId: id,
      sessionStatus: status,
      transitionHistory: history,
      createdAt: current.createdAt,
      updatedAt: internal.nowIso()
    }));
    if (!next) return fail("REPOSITORY010_SYNC_SESSION_TRANSITION_BLOCKED", "Sync session transition could not be normalized.", { syncSessionId: id, nextStatus: status });
    return persist(next);
  }

  async function restoreSyncSession(syncSessionId) {
    const id = internal.text(syncSessionId, "");
    if (!id) return fail("REPOSITORY010_SYNC_SESSION_ID_REQUIRED", "syncSessionId is required.");
    const record = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", id);
    if (!record) return fail("REPOSITORY010_SYNC_SESSION_NOT_FOUND", "Sync session was not found.", { syncSessionId: id });
    const validation = namespace.validateContract("syncSessionDescriptor", record);
    if (!validation.valid) return fail("REPOSITORY010_SYNC_SESSION_CORRUPTED", "Persisted sync session failed contract validation.", { syncSessionId: id, validation: validation });
    const restored = internal.clone(record);
    if (!Array.isArray(restored.transitionHistory)) restored.transitionHistory = [];
    if (!Object.prototype.hasOwnProperty.call(restored, "transportAttemptId")) restored.transportAttemptId = null;
    state.syncSessionDescriptors.set(id, internal.clone(restored));
    state.lastSyncSessionId = id;
    state.syncSessionStatus = restored.sessionStatus;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_SESSION_RESTORED", "Restored", { syncSession: restored, validation: validation, reloadRecoveryVerified: true, backwardCompatiblePhase15Record: !Array.isArray(record.transitionHistory), authorityEffect: "none", canonicalMutationPerformed: false, syncEngineInvoked: restored.syncEngineInvoked === true });
  }

  async function listSyncSessions() {
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("syncSession");
    return (Array.isArray(records) ? records : []).sort(function (a, b) { return String(a.createdAt || "").localeCompare(String(b.createdAt || "")); }).map(internal.clone);
  }

  function getSyncSessionStatus() {
    return {
      status: state.syncSessionStatus || "Ready",
      phase: 16,
      moduleVersion: MODULE_VERSION,
      supportedDirections: DIRECTIONS.slice(),
      supportedSessionStatuses: SESSION_STATUSES.slice(),
      activeSessionStatuses: ACTIVE.slice(),
      allowedTransitions: internal.clone(ALLOWED),
      syncSessionImplemented: true,
      syncSessionPersistenceImplemented: true,
      guardedStateMachineImplemented: true,
      transitionHistoryImplemented: true,
      reloadRecoveryImplemented: true,
      syncEngineImplemented: VERSION_MANIFEST.implementation.syncEngineImplemented === true,
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticConflictWinnerAllowed: false,
      automaticBaselinePromotionAllowed: false,
      runtimeSessionCount: state.syncSessionDescriptors.size,
      lastSyncSessionId: state.lastSyncSessionId || null
    };
  }

  Object.assign(namespace.api, {
    createLocalFirstRepositorySyncSession: createSyncSession,
    transitionLocalFirstRepositorySyncSession: transitionSyncSession,
    restoreLocalFirstRepositorySyncSession: restoreSyncSession,
    listLocalFirstRepositorySyncSessions: listSyncSessions,
    getLocalFirstRepositorySyncSessionStatus: getSyncSessionStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.syncSession = {
    id: "REPOSITORY-010-SYNC-SESSION",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 16,
    syncSessionImplemented: true,
    persistenceImplemented: true,
    guardedStateMachineImplemented: true,
    transitionHistoryImplemented: true,
    reloadRecoveryImplemented: true,
    syncEngineImplemented: VERSION_MANIFEST.implementation.syncEngineImplemented === true,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
