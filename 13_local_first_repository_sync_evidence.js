/* ============================================================
   FILE: 13_local_first_repository_sync_evidence.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.14.0 / Module: Sync Evidence 1.0.0
   Phase 15: Controlled Sync Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Sync Evidence blocked: Core or Version Manifest is not loaded.");
    return;
  }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("syncEvidence");
  const EVIDENCE_TYPES = Object.freeze(["session-created", "observation", "difference", "candidate-prepared", "transfer-prepared", "verification", "conflict", "failure", "interruption", "completion"]);
  if (!(state.syncEvidenceDescriptors instanceof Map)) state.syncEvidenceDescriptors = new Map();

  async function createSyncEvidence(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const evidenceType = internal.text(source.evidenceType, "");
    if (EVIDENCE_TYPES.indexOf(evidenceType) === -1) return internal.buildResult(false, "REPOSITORY010_SYNC_EVIDENCE_TYPE_INVALID", "Blocked", { evidenceType: evidenceType || null });
    const sessionId = internal.text(source.syncSessionId, "");
    const session = sessionId ? await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", sessionId) : null;
    if (!session) return internal.buildResult(false, "REPOSITORY010_SYNC_EVIDENCE_SESSION_REQUIRED", "Blocked", { syncSessionId: sessionId || null });
    const record = {
      syncEvidenceId: internal.text(source.syncEvidenceId, internal.nextId("REPOSITORY010-SYNC-EVIDENCE")),
      syncSessionId: sessionId,
      evidenceType: evidenceType,
      sessionStatus: internal.text(source.sessionStatus, session.sessionStatus),
      projectId: session.projectId,
      repositoryId: session.repositoryId,
      sourceNodeId: session.sourceNodeId,
      targetNodeId: session.targetNodeId,
      baseRevisionId: session.baseRevisionId,
      sourceRevisionId: session.sourceRevisionId,
      targetRevisionId: session.targetRevisionId,
      relatedRecordId: source.relatedRecordId == null ? null : internal.text(source.relatedRecordId, ""),
      validationPassed: source.validationPassed === true,
      detail: internal.isPlainObject(source.detail) ? internal.clone(source.detail) : {},
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      automaticAcceptancePerformed: false,
      automaticConflictWinnerApplied: false,
      automaticBaselinePromotionPerformed: false,
      syncEngineInvoked: false,
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    const validation = namespace.validateContract("syncEvidenceDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_SYNC_EVIDENCE_CONTRACT_INVALID", "Blocked", { record: record, validation: validation });
    const persisted = await namespace.persistLocalFirstRepositoryRecord("syncEvidence", record);
    if (!persisted || persisted.ok !== true) return persisted;
    state.syncEvidenceDescriptors.set(record.syncEvidenceId, internal.clone(record));
    state.lastSyncEvidenceId = record.syncEvidenceId;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_EVIDENCE_PERSISTED", "Verified", { syncEvidence: internal.clone(record), validation: validation, authorityEffect: "none", canonicalMutationPerformed: false, syncEngineInvoked: false });
  }

  async function restoreSyncEvidence(syncEvidenceId) {
    const id = internal.text(syncEvidenceId, "");
    const record = id ? await namespace.getPersistedLocalFirstRepositoryRecord("syncEvidence", id) : null;
    if (!record) return internal.buildResult(false, "REPOSITORY010_SYNC_EVIDENCE_NOT_FOUND", "Not Found", { syncEvidenceId: id || null });
    const validation = namespace.validateContract("syncEvidenceDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_SYNC_EVIDENCE_CORRUPTED", "Blocked", { syncEvidenceId: id, validation: validation });
    state.syncEvidenceDescriptors.set(id, internal.clone(record));
    state.lastSyncEvidenceId = id;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_EVIDENCE_RESTORED", "Restored", { syncEvidence: internal.clone(record), reloadRecoveryVerified: true });
  }

  async function listSyncEvidence(syncSessionId) {
    const sessionId = internal.text(syncSessionId, "");
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("syncEvidence");
    return (Array.isArray(records) ? records : []).filter(function (item) { return !sessionId || item.syncSessionId === sessionId; }).sort(function (a, b) { return String(a.createdAt || "").localeCompare(String(b.createdAt || "")); }).map(internal.clone);
  }

  function getSyncEvidenceStatus() {
    return { status: "Ready", phase: 15, moduleVersion: MODULE_VERSION, evidenceTypes: EVIDENCE_TYPES.slice(), syncEvidenceImplemented: true, persistenceImplemented: true, reloadRecoveryImplemented: true, evidenceGrantsAuthority: false, syncEngineImplemented: false, runtimeEvidenceCount: state.syncEvidenceDescriptors.size, lastEvidenceId: state.lastSyncEvidenceId || null };
  }

  Object.assign(namespace.api, {
    createLocalFirstRepositorySyncEvidence: createSyncEvidence,
    restoreLocalFirstRepositorySyncEvidence: restoreSyncEvidence,
    listLocalFirstRepositorySyncEvidence: listSyncEvidence,
    getLocalFirstRepositorySyncEvidenceStatus: getSyncEvidenceStatus
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.syncEvidence = { id: "REPOSITORY-010-SYNC-EVIDENCE", version: MODULE_VERSION, status: "Ready", phase: 15, syncEvidenceImplemented: true, persistenceImplemented: true, evidenceGrantsAuthority: false, syncEngineImplemented: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
