/* ============================================================
   FILE: 13_local_first_repository_sync_coordinator.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.14.0 / Module: Sync Coordinator Foundation 1.0.0
   Phase 15: Controlled Sync Foundation
   Decision-010: Evidence-Bound Controlled Two-Way Sync Coordinator
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Sync Coordinator blocked: Core or Version Manifest is not loaded.");
    return;
  }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("syncCoordinator");

  async function initializeSyncCoordinatorFoundation() {
    const persistence = await namespace.initializeLocalFirstRepositoryPersistence();
    if (!persistence || persistence.ok !== true) return persistence;
    const sessions = await namespace.listLocalFirstRepositorySyncSessions();
    const differences = await namespace.listLocalFirstRepositorySyncDifferences();
    const evidence = await namespace.listLocalFirstRepositorySyncEvidence();
    state.syncCoordinatorStatus = "Ready";
    state.lastSyncCoordinatorError = null;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_COORDINATOR_FOUNDATION_INITIALIZED", "Ready", {
      moduleVersion: MODULE_VERSION,
      restoredSessionCount: sessions.length,
      restoredDifferenceCount: differences.length,
      restoredEvidenceCount: evidence.length,
      existingSyncCandidateApiReused: typeof namespace.prepareLocalSyncCandidate === "function",
      existingTransferPackageApiReused: typeof namespace.prepareLocalTransferPackage === "function",
      existingV2ApiReused: typeof namespace.receiveV2TransferEnvelope === "function",
      existingV3ApiReused: typeof namespace.evaluateV3BaseRevision === "function",
      existingV4ApiReused: typeof namespace.evaluateV4TargetEnvironment === "function",
      syncCoordinatorFoundationImplemented: true,
      syncEngineImplemented: false,
      crossDeviceRealSyncImplemented: false,
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticConflictWinnerAllowed: false,
      automaticBaselinePromotionAllowed: false,
      canonicalSourceFilesWritten: false,
      githubReflectionPerformed: false
    });
  }

  async function createObservationSession(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const created = await namespace.createLocalFirstRepositorySyncSession({
      syncSessionId: source.syncSessionId,
      projectId: source.projectId,
      repositoryId: source.repositoryId,
      sourceNodeId: source.sourceNodeId,
      targetNodeId: source.targetNodeId,
      direction: source.direction,
      baseRevisionId: source.baseRevisionId,
      sourceRevisionId: source.sourceRevisionId,
      targetRevisionId: source.targetRevisionId,
      sessionStatus: "CREATED"
    });
    if (!created || created.ok !== true) return created;
    const session = created.data.syncSession;
    await namespace.transitionLocalFirstRepositorySyncSession(session.syncSessionId, "OBSERVING");
    const evidence = await namespace.createLocalFirstRepositorySyncEvidence({ syncSessionId: session.syncSessionId, evidenceType: "session-created", sessionStatus: "OBSERVING", validationPassed: true, detail: { direction: session.direction, baseRevisionId: session.baseRevisionId } });
    if (!evidence || evidence.ok !== true) return evidence;
    return internal.buildResult(true, "REPOSITORY010_SYNC_COORDINATOR_SESSION_READY", "Observing", { syncSessionId: session.syncSessionId, syncSession: (await namespace.restoreLocalFirstRepositorySyncSession(session.syncSessionId)).data.syncSession, syncEvidence: evidence.data.syncEvidence, authorityEffect: "none", canonicalMutationPerformed: false, syncEngineInvoked: false });
  }

  async function observeAndDetect(input) {
    const source = internal.isPlainObject(input) ? input : {};
    let sessionId = internal.text(source.syncSessionId, "");
    if (!sessionId) {
      const created = await createObservationSession(source);
      if (!created || created.ok !== true) return created;
      sessionId = created.data.syncSessionId;
    }
    const diff = await namespace.detectLocalFirstRepositorySyncDifference(sessionId, source.sourceObservation || {}, source.targetObservation || {}, { baseRevisionId: source.baseRevisionId, differenceId: source.differenceId });
    if (!diff || diff.ok !== true) return diff;
    const evidence = await namespace.createLocalFirstRepositorySyncEvidence({ syncSessionId: sessionId, evidenceType: "difference", sessionStatus: diff.data.syncDifference.hasDifference ? "DIFFERENCE_DETECTED" : "COMPLETED", relatedRecordId: diff.data.syncDifference.differenceId, validationPassed: true, detail: { differenceType: diff.data.syncDifference.differenceType, hasDifference: diff.data.syncDifference.hasDifference, baseRevisionMatch: diff.data.syncDifference.baseRevisionMatch, changedFileCount: diff.data.syncDifference.changedFiles.length } });
    if (!evidence || evidence.ok !== true) return evidence;
    return internal.buildResult(true, "REPOSITORY010_SYNC_COORDINATOR_OBSERVATION_COMPLETE", diff.data.syncDifference.hasDifference ? "Difference Detected" : "No Change", { syncSessionId: sessionId, syncDifference: diff.data.syncDifference, syncEvidence: evidence.data.syncEvidence, nextAction: diff.data.syncDifference.hasDifference ? "prepare-candidate-or-transfer-plan-explicitly" : "none", authorityEffect: "none", canonicalMutationPerformed: false, syncEngineInvoked: false });
  }

  async function preparePushFoundation(syncSessionId, stagingId, options) {
    const sessionId = internal.text(syncSessionId, "");
    const staging = internal.text(stagingId, "");
    if (!sessionId || !staging) return internal.buildResult(false, "REPOSITORY010_SYNC_COORDINATOR_PUSH_INPUT_REQUIRED", "Blocked", { syncSessionId: sessionId || null, stagingId: staging || null });
    const session = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", sessionId);
    if (!session || session.direction !== "push") return internal.buildResult(false, "REPOSITORY010_SYNC_COORDINATOR_PUSH_SESSION_REQUIRED", "Blocked", { syncSessionId: sessionId });
    const candidate = await namespace.prepareLocalSyncCandidate(staging, options || {});
    if (!candidate || candidate.ok !== true) return candidate;
    await namespace.transitionLocalFirstRepositorySyncSession(sessionId, "CANDIDATE_READY", { syncCandidateId: candidate.data.syncCandidate.syncCandidateId });
    const transfer = await namespace.prepareLocalTransferPackage(candidate.data.syncCandidate.syncCandidateId, options || {});
    if (!transfer || transfer.ok !== true) return transfer;
    await namespace.transitionLocalFirstRepositorySyncSession(sessionId, "TRANSFER_PREPARED", { transferPackageId: transfer.data.transferPackage.transferPackageId });
    const evidence = await namespace.createLocalFirstRepositorySyncEvidence({ syncSessionId: sessionId, evidenceType: "transfer-prepared", sessionStatus: "TRANSFER_PREPARED", relatedRecordId: transfer.data.transferPackage.transferPackageId, validationPassed: true, detail: { syncCandidateId: candidate.data.syncCandidate.syncCandidateId, transferPackageId: transfer.data.transferPackage.transferPackageId, actualTransferPerformed: false } });
    return internal.buildResult(true, "REPOSITORY010_SYNC_COORDINATOR_PUSH_FOUNDATION_PREPARED", "Transfer Prepared", { syncSessionId: sessionId, syncCandidate: candidate.data.syncCandidate, transferPackage: transfer.data.transferPackage, syncEvidence: evidence && evidence.data ? evidence.data.syncEvidence : null, actualTransferPerformed: false, v2Invoked: false, v3Invoked: false, v4Invoked: false, explicitAcceptanceReceived: false, canonicalMutationPerformed: false, baselinePromotionPerformed: false, syncEngineInvoked: false, authorityEffect: "none" });
  }

  function getSyncCoordinatorStatus() {
    return {
      status: state.syncCoordinatorStatus || "Ready",
      phase: 15,
      moduleVersion: MODULE_VERSION,
      decisionId: "REPOSITORY-010-DECISION-010",
      model: "Evidence-Bound Controlled Two-Way Sync Coordinator",
      syncCoordinatorFoundationImplemented: true,
      syncSessionImplemented: typeof namespace.createLocalFirstRepositorySyncSession === "function",
      differenceDetectionImplemented: typeof namespace.detectLocalFirstRepositorySyncDifference === "function",
      syncEvidenceImplemented: typeof namespace.createLocalFirstRepositorySyncEvidence === "function",
      existingSyncCandidateReused: typeof namespace.prepareLocalSyncCandidate === "function",
      existingTransferPackageReused: typeof namespace.prepareLocalTransferPackage === "function",
      syncEngineImplemented: false,
      crossDeviceRealSyncImplemented: false,
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticConflictWinnerAllowed: false,
      automaticBaselinePromotionAllowed: false,
      automaticGitHubReflectionAllowed: false,
      canonicalSourceFilesWritten: false,
      lastError: internal.clone(state.lastSyncCoordinatorError || null)
    };
  }

  Object.assign(namespace.api, {
    initializeLocalFirstRepositorySyncCoordinatorFoundation: initializeSyncCoordinatorFoundation,
    createLocalFirstRepositorySyncObservationSession: createObservationSession,
    observeAndDetectLocalFirstRepositorySyncDifference: observeAndDetect,
    prepareLocalFirstRepositoryPushFoundation: preparePushFoundation,
    getLocalFirstRepositorySyncCoordinatorStatus: getSyncCoordinatorStatus
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.syncCoordinator = { id: "REPOSITORY-010-SYNC-COORDINATOR-FOUNDATION", version: MODULE_VERSION, status: "Ready", phase: 15, decisionId: "REPOSITORY-010-DECISION-010", syncCoordinatorFoundationImplemented: true, syncEngineImplemented: false, crossDeviceRealSyncImplemented: false, canonicalMutationAuthority: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
