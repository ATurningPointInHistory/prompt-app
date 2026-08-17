/* ============================================================
   FILE: 13_local_first_repository_sync_difference.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.14.0 / Module: Sync Difference 1.0.0
   Phase 15: Controlled Sync Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Sync Difference blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("syncDifference");
  const DIFFERENCE_TYPES = Object.freeze(["no-change", "source-ahead", "target-ahead", "diverged", "unknown"]);
  if (!(state.syncDifferenceDescriptors instanceof Map)) state.syncDifferenceDescriptors = new Map();

  function normalizeObservation(value) {
    const source = internal.isPlainObject(value) ? value : {};
    const staticManifest = internal.isPlainObject(source.staticManifest) ? source.staticManifest : {};
    const descriptor = internal.isPlainObject(source.descriptor) ? source.descriptor : {};
    return {
      revisionId: source.revisionId == null ? (descriptor.canonicalRevisionId == null ? null : internal.text(descriptor.canonicalRevisionId, "")) : internal.text(source.revisionId, ""),
      baseRevisionId: source.baseRevisionId == null ? null : internal.text(source.baseRevisionId, ""),
      manifestHash: internal.text(source.manifestHash, staticManifest.manifestHash || descriptor.manifestHash || ""),
      scriptSetHash: internal.text(source.scriptSetHash, staticManifest.scriptSetHash || descriptor.scriptSetHash || ""),
      repositoryStateHash: source.repositoryStateHash == null ? null : internal.text(source.repositoryStateHash, ""),
      fileHashes: internal.isPlainObject(source.fileHashes) ? internal.clone(source.fileHashes) : {},
      integrityStatus: internal.text(source.integrityStatus, source.integrity && source.integrity.status || descriptor.integrityStatus || "unverified")
    };
  }

  function changedFiles(sourceHashes, targetHashes) {
    const keys = Array.from(new Set(Object.keys(sourceHashes || {}).concat(Object.keys(targetHashes || {})))).sort();
    return keys.filter(function (key) {
      const a = sourceHashes && sourceHashes[key] && (sourceHashes[key].sha256 || sourceHashes[key]);
      const b = targetHashes && targetHashes[key] && (targetHashes[key].sha256 || targetHashes[key]);
      return String(a || "") !== String(b || "");
    });
  }

  function classify(source, target, baseRevisionId, hasDifference) {
    if (!hasDifference) return "no-change";
    if (source.revisionId && target.revisionId && source.revisionId === target.revisionId) return "diverged";
    if (baseRevisionId && target.revisionId === baseRevisionId && source.revisionId && source.revisionId !== baseRevisionId) return "source-ahead";
    if (baseRevisionId && source.revisionId === baseRevisionId && target.revisionId && target.revisionId !== baseRevisionId) return "target-ahead";
    if (source.revisionId && target.revisionId && source.revisionId !== target.revisionId) return "diverged";
    return "unknown";
  }

  async function detectSyncDifference(syncSessionId, sourceObservation, targetObservation, options) {
    const sessionId = internal.text(syncSessionId, "");
    if (!sessionId) return internal.buildResult(false, "REPOSITORY010_SYNC_DIFFERENCE_SESSION_REQUIRED", "Blocked", null);
    const session = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", sessionId);
    if (!session) return internal.buildResult(false, "REPOSITORY010_SYNC_DIFFERENCE_SESSION_NOT_FOUND", "Blocked", { syncSessionId: sessionId });

    const source = normalizeObservation(sourceObservation);
    const target = normalizeObservation(targetObservation);
    const opts = internal.isPlainObject(options) ? options : {};
    const fileDifference = changedFiles(source.fileHashes, target.fileHashes);
    const hashDifference = source.manifestHash !== target.manifestHash || source.scriptSetHash !== target.scriptSetHash || (source.repositoryStateHash && target.repositoryStateHash && source.repositoryStateHash !== target.repositoryStateHash);
    const hasDifference = Boolean(hashDifference || fileDifference.length > 0 || (source.revisionId && target.revisionId && source.revisionId !== target.revisionId));
    const baseRevisionId = internal.text(opts.baseRevisionId, session.baseRevisionId);
    const baseRevisionMatch = Boolean(!target.revisionId || target.revisionId === baseRevisionId);
    const differenceType = classify(source, target, baseRevisionId, hasDifference);

    const record = {
      differenceId: internal.text(opts.differenceId, internal.nextId("REPOSITORY010-SYNC-DIFFERENCE")),
      syncSessionId: sessionId,
      projectId: session.projectId,
      repositoryId: session.repositoryId,
      sourceNodeId: session.sourceNodeId,
      targetNodeId: session.targetNodeId,
      baseRevisionId: baseRevisionId,
      sourceRevisionId: source.revisionId,
      targetRevisionId: target.revisionId,
      sourceManifestHash: source.manifestHash || null,
      targetManifestHash: target.manifestHash || null,
      sourceScriptSetHash: source.scriptSetHash || null,
      targetScriptSetHash: target.scriptSetHash || null,
      sourceRepositoryStateHash: source.repositoryStateHash,
      targetRepositoryStateHash: target.repositoryStateHash,
      differenceType: differenceType,
      hasDifference: hasDifference,
      baseRevisionMatch: baseRevisionMatch,
      changedFiles: fileDifference,
      conflictCandidate: differenceType === "diverged" || baseRevisionMatch === false,
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      syncEngineInvoked: false,
      createdAt: internal.nowIso(),
      immutable: true
    };

    const validation = namespace.validateContract("syncDifferenceDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_SYNC_DIFFERENCE_CONTRACT_INVALID", "Blocked", { record: record, validation: validation });
    const persisted = await namespace.persistLocalFirstRepositoryRecord("syncDifference", record);
    if (!persisted || persisted.ok !== true) return persisted;
    state.syncDifferenceDescriptors.set(record.differenceId, internal.clone(record));
    state.lastSyncDifferenceId = record.differenceId;
    internal.touch();
    if (typeof namespace.transitionLocalFirstRepositorySyncSession === "function") {
      await namespace.transitionLocalFirstRepositorySyncSession(sessionId, hasDifference ? "DIFFERENCE_DETECTED" : "COMPLETED", { differenceId: record.differenceId, sourceRevisionId: source.revisionId, targetRevisionId: target.revisionId });
    }
    return internal.buildResult(true, "REPOSITORY010_SYNC_DIFFERENCE_DETECTED", hasDifference ? "Difference Detected" : "No Change", { syncDifference: internal.clone(record), validation: validation, authorityEffect: "none", canonicalMutationPerformed: false, syncEngineInvoked: false });
  }

  async function restoreSyncDifference(differenceId) {
    const id = internal.text(differenceId, "");
    const record = id ? await namespace.getPersistedLocalFirstRepositoryRecord("syncDifference", id) : null;
    if (!record) return internal.buildResult(false, "REPOSITORY010_SYNC_DIFFERENCE_NOT_FOUND", "Not Found", { differenceId: id || null });
    const validation = namespace.validateContract("syncDifferenceDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_SYNC_DIFFERENCE_CORRUPTED", "Blocked", { differenceId: id, validation: validation });
    state.syncDifferenceDescriptors.set(id, internal.clone(record));
    state.lastSyncDifferenceId = id;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_DIFFERENCE_RESTORED", "Restored", { syncDifference: internal.clone(record), reloadRecoveryVerified: true });
  }

  async function listSyncDifferences() {
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("syncDifference");
    return (Array.isArray(records) ? records : []).sort(function (a, b) { return String(a.createdAt || "").localeCompare(String(b.createdAt || "")); }).map(internal.clone);
  }

  function getSyncDifferenceStatus() {
    return { status: "Ready", phase: 15, moduleVersion: MODULE_VERSION, differenceDetectionImplemented: true, revisionComparisonImplemented: true, persistenceImplemented: true, reloadRecoveryImplemented: true, differenceTypes: DIFFERENCE_TYPES.slice(), automaticConflictWinnerAllowed: false, syncEngineImplemented: false, runtimeDifferenceCount: state.syncDifferenceDescriptors.size, lastDifferenceId: state.lastSyncDifferenceId || null };
  }

  Object.assign(namespace.api, {
    detectLocalFirstRepositorySyncDifference: detectSyncDifference,
    restoreLocalFirstRepositorySyncDifference: restoreSyncDifference,
    listLocalFirstRepositorySyncDifferences: listSyncDifferences,
    getLocalFirstRepositorySyncDifferenceStatus: getSyncDifferenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.syncDifference = { id: "REPOSITORY-010-SYNC-DIFFERENCE", version: MODULE_VERSION, status: "Ready", phase: 15, differenceDetectionImplemented: true, revisionComparisonImplemented: true, syncEngineImplemented: false, automaticConflictWinnerAllowed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
