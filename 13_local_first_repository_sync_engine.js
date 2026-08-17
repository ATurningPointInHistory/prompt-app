/* ============================================================
   FILE: 13_local_first_repository_sync_engine.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.15.0 / Module: Controlled Cross-Device Sync Engine 1.0.0
   Phase 16
   Decision-010 / 011 / 012
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Sync Engine blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("syncEngine");

  function revisionSequence(value) {
    const match = String(value || "").match(/REPOSITORY010-CANONICAL-REVISION-(\d+)$/);
    return match ? Number(match[1]) : -1;
  }

  async function currentBaseline() {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const valid = (Array.isArray(list) ? list : []).filter(function (record) {
      return namespace.validateContract("canonicalBaselineDescriptor", record).valid === true && record.explicitlyEstablished === true;
    }).sort(function (a, b) { return revisionSequence(a.canonicalRevisionId) - revisionSequence(b.canonicalRevisionId); });
    if (!valid.length) return null;
    const baseline = internal.clone(valid[valid.length - 1]);
    const integrities = await namespace.listPersistedLocalFirstRepositoryRecords("integrityRecord");
    const matching = (Array.isArray(integrities) ? integrities : []).filter(function (record) {
      return record && record.revisionId === baseline.canonicalRevisionId && record.integrityStatus === "verified";
    }).sort(function (a, b) { return String(a.hashGeneratedAt || "").localeCompare(String(b.hashGeneratedAt || "")); });
    if (matching.length) {
      baseline.repositoryStateHash = internal.text(matching[matching.length - 1].repositoryStateHash, "");
      baseline.canonicalIntegrityRecordId = internal.text(matching[matching.length - 1].integrityRecordId, "");
    }
    return baseline;
  }

  async function initializeSyncEngine() {
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const persistence = await namespace.initializeLocalFirstRepositoryPersistence();
    if (!persistence || persistence.ok !== true) return persistence;
    const sessions = await namespace.listLocalFirstRepositorySyncSessions();
    const attempts = await namespace.listLocalFirstRepositoryTransportAttempts();
    if (typeof namespace.restoreLocalFirstRepositoryDevelopmentReleaseRecords === "function") await namespace.restoreLocalFirstRepositoryDevelopmentReleaseRecords();
    const adapters = namespace.listLocalFirstRepositoryTransportAdapters();
    const explicit = namespace.getLocalFirstRepositoryTransportAdapter("REPOSITORY-010-EXPLICIT-FILE-TRANSPORT");
    if (!explicit) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_EXPLICIT_TRANSPORT_REQUIRED", "Blocked", { registeredAdapters: adapters });
    state.syncEngineStatus = "Ready";
    state.lastSyncEngineError = null;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_ENGINE_INITIALIZED", "Ready", {
      moduleVersion: MODULE_VERSION,
      restoredSessionCount: sessions.length,
      restoredTransportAttemptCount: attempts.length,
      registeredTransportAdapters: adapters,
      explicitFileTransportAvailable: true,
      syncEngineImplemented: true,
      crossDeviceRealSyncImplemented: false,
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticConflictWinnerAllowed: false,
      automaticBaselinePromotionAllowed: false
    });
  }

  async function loadStagingObservation(stagingId) {
    const staging = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", stagingId);
    if (!staging) return null;
    const integrity = await namespace.getPersistedLocalFirstRepositoryRecord("integrityRecord", staging.integrityRecordId);
    if (!integrity) return null;
    return {
      staging: staging,
      integrity: integrity,
      observation: {
        revisionId: staging.revisionId,
        baseRevisionId: staging.baseRevisionId,
        manifestHash: integrity.manifestHash,
        scriptSetHash: integrity.scriptSetHash,
        repositoryStateHash: integrity.repositoryStateHash,
        fileHashes: internal.clone(integrity.fileHashes || {}),
        integrityStatus: integrity.integrityStatus
      }
    };
  }

  function baselineObservation(baseline) {
    return {
      revisionId: baseline.canonicalRevisionId,
      baseRevisionId: baseline.canonicalRevisionId,
      manifestHash: baseline.manifestHash,
      scriptSetHash: baseline.scriptSetHash,
      repositoryStateHash: baseline.repositoryStateHash,
      fileHashes: {},
      integrityStatus: "verified"
    };
  }

  async function prepareAndroidToPcSyncExport(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const stagingId = internal.text(source.stagingId, "");
    if (!stagingId) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_STAGING_REQUIRED", "Blocked", null);
    const initialized = await initializeSyncEngine();
    if (!initialized || initialized.ok !== true) return initialized;
    const baseline = await currentBaseline();
    if (!baseline) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_BASELINE_REQUIRED", "Blocked", null);
    const loaded = await loadStagingObservation(stagingId);
    if (!loaded) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_STAGING_NOT_FOUND", "Blocked", { stagingId: stagingId });
    if (loaded.staging.baseRevisionId !== baseline.canonicalRevisionId) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_STAGING_BASE_STALE", "Blocked", { stagingBaseRevisionId: loaded.staging.baseRevisionId, currentCanonicalRevisionId: baseline.canonicalRevisionId });

    const observed = await namespace.observeAndDetectLocalFirstRepositorySyncDifference({
      syncSessionId: source.syncSessionId,
      projectId: loaded.staging.projectId,
      repositoryId: loaded.staging.repositoryId,
      sourceNodeId: loaded.staging.nodeId,
      targetNodeId: baseline.sourceNodeId,
      direction: "push",
      baseRevisionId: baseline.canonicalRevisionId,
      sourceRevisionId: loaded.staging.revisionId,
      targetRevisionId: baseline.canonicalRevisionId,
      sourceObservation: loaded.observation,
      targetObservation: baselineObservation(baseline),
      syncEngineInvoked: true
    });
    if (!observed || observed.ok !== true) return observed;
    if (!observed.data.syncDifference.hasDifference) return internal.buildResult(true, "REPOSITORY010_SYNC_ENGINE_NO_CHANGE", "Completed", { syncSessionId: observed.data.syncSessionId, syncDifference: observed.data.syncDifference, transferPrepared: false, authorityEffect: "none" });
    if (observed.data.syncDifference.conflictCandidate === true) {
      const conflict = await namespace.transitionLocalFirstRepositorySyncSession(observed.data.syncSessionId, "CONFLICT_DETECTED", { transitionReason: "difference-conflict-candidate" });
      await namespace.createLocalFirstRepositorySyncEvidence({ syncSessionId: observed.data.syncSessionId, evidenceType: "conflict", sessionStatus: "CONFLICT_DETECTED", relatedRecordId: observed.data.syncDifference.differenceId, validationPassed: true, detail: { stage: "difference", differenceType: observed.data.syncDifference.differenceType, baseRevisionMatch: observed.data.syncDifference.baseRevisionMatch } });
      return internal.buildResult(true, "REPOSITORY010_SYNC_ENGINE_CONFLICT_DETECTED", "Conflict Detected", { syncSession: conflict.data.syncSession, syncDifference: observed.data.syncDifference, automaticWinnerSelected: false, authorityEffect: "none" });
    }

    const foundation = await namespace.prepareLocalFirstRepositoryPushFoundation(observed.data.syncSessionId, stagingId, Object.assign({}, source, { syncEngineInvoked: true }));
    if (!foundation || foundation.ok !== true) return foundation;
    const download = source.download !== false;
    const transport = download
      ? await namespace.downloadLocalFirstRepositoryExplicitFileTransport(observed.data.syncSessionId, source)
      : await namespace.prepareLocalFirstRepositoryExplicitFileTransport(observed.data.syncSessionId, source);
    if (!transport || transport.ok !== true) return transport;
    state.syncEngineStatus = "Transferring";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_ANDROID_TO_PC_SYNC_EXPORT_READY", "Transferring", {
      syncSessionId: observed.data.syncSessionId,
      syncDifference: observed.data.syncDifference,
      syncCandidate: foundation.data.syncCandidate,
      transferPackage: foundation.data.transferPackage,
      transportEnvelope: transport.data.envelope,
      transportAttempt: transport.data.transportAttempt,
      filename: transport.data.filename || null,
      requiresPhysicalUserTransfer: true,
      syncEngineImplemented: true,
      canonicalMutationPerformed: false,
      automaticAcceptancePerformed: false,
      authorityEffect: "none"
    });
  }

  async function persistVerificationEvidence(recordType, record) {
    const saved = await namespace.persistLocalFirstRepositoryRecord(recordType, record);
    return saved && saved.ok === true ? saved : saved;
  }

  async function failVerification(sessionId, attemptId, code, detail, conflict) {
    const sessionStatus = conflict ? "CONFLICT_DETECTED" : "FAILED";
    const session = await namespace.transitionLocalFirstRepositorySyncSession(sessionId, sessionStatus, { transitionReason: code, conflictEvidenceId: detail && detail.conflictEvidenceId || null });
    const attempt = await namespace.transitionLocalFirstRepositoryTransportAttempt(attemptId, "FAILED", { transitionReason: code, v3EvidenceId: detail && detail.v3EvidenceId || null, v4EvidenceId: detail && detail.v4EvidenceId || null });
    await namespace.createLocalFirstRepositorySyncEvidence({ syncSessionId: sessionId, evidenceType: conflict ? "conflict" : "failure", sessionStatus: sessionStatus, relatedRecordId: detail && (detail.v4EvidenceId || detail.v3EvidenceId) || attemptId, validationPassed: false, detail: Object.assign({ code: code }, detail || {}) });
    return { session: session, attempt: attempt };
  }

  async function verifyReceivedSession(received, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const sessionId = received.data.syncSession.syncSessionId;
    const attemptId = received.data.transportAttempt.transportAttemptId;
    let transition = await namespace.transitionLocalFirstRepositorySyncSession(sessionId, "VERIFYING", { transitionReason: "cross-device-verification-started" });
    if (!transition || transition.ok !== true) return transition;
    let attempt = await namespace.transitionLocalFirstRepositoryTransportAttempt(attemptId, "VERIFYING", { transitionReason: "cross-device-verification-started" });
    if (!attempt || attempt.ok !== true) return attempt;

    const baseline = await currentBaseline();
    if (!baseline) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_BASELINE_REQUIRED", "Blocked", null);
    if (baseline.canonicalRevisionId !== received.data.syncSession.baseRevisionId) {
      await failVerification(sessionId, attemptId, "REPOSITORY010_SYNC_ENGINE_BASELINE_CHANGED", { currentCanonicalRevisionId: baseline.canonicalRevisionId, sessionBaseRevisionId: received.data.syncSession.baseRevisionId }, true);
      return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_BASELINE_CHANGED", "Conflict Detected", { currentCanonicalRevisionId: baseline.canonicalRevisionId, sessionBaseRevisionId: received.data.syncSession.baseRevisionId });
    }

    const v3 = namespace.evaluateV3BaseRevision(received.data.receipt, baseline, {});
    if (!v3 || v3.ok !== true) {
      await failVerification(sessionId, attemptId, "REPOSITORY010_SYNC_ENGINE_V3_FAILED", { v3Result: v3 || null }, false);
      return v3;
    }
    const v3Persisted = await persistVerificationEvidence("v3ConflictEvidence", v3.data.evidence);
    if (!v3Persisted || v3Persisted.ok !== true) return v3Persisted;
    if (v3.data.conflictDetected === true || v3.data.blockingConflict === true) {
      await failVerification(sessionId, attemptId, "REPOSITORY010_SYNC_ENGINE_V3_CONFLICT", { v3EvidenceId: v3.data.evidence.conflictEvidenceId, conflictEvidenceId: v3.data.evidence.conflictEvidenceId }, true);
      return internal.buildResult(true, "REPOSITORY010_SYNC_ENGINE_V3_CONFLICT_DETECTED", "Conflict Detected", { syncSessionId: sessionId, transportAttemptId: attemptId, v3: v3.data, automaticWinnerSelected: false, canonicalMutationPerformed: false, authorityEffect: "none" });
    }

    let scanResult = opts.desktopScanResult;
    if (!scanResult) scanResult = await namespace.selectAndScanDesktopRepository();
    if (!scanResult || scanResult.ok !== true) {
      await failVerification(sessionId, attemptId, "REPOSITORY010_SYNC_ENGINE_PC_SCAN_FAILED", { v3EvidenceId: v3.data.evidence.conflictEvidenceId }, false);
      return scanResult;
    }
    const v4 = namespace.evaluateV4TargetEnvironment(v3.data.evidence, baseline, scanResult.data, {});
    if (!v4 || v4.ok !== true) {
      await failVerification(sessionId, attemptId, "REPOSITORY010_SYNC_ENGINE_V4_FAILED", { v3EvidenceId: v3.data.evidence.conflictEvidenceId, v4Result: v4 || null }, false);
      return v4;
    }
    const v4Persisted = await persistVerificationEvidence("v4TargetValidationEvidence", v4.data.evidence);
    if (!v4Persisted || v4Persisted.ok !== true) return v4Persisted;
    if (v4.data.v4TargetEnvironmentValidated !== true || v4.data.blockingTargetDrift === true) {
      await failVerification(sessionId, attemptId, "REPOSITORY010_SYNC_ENGINE_TARGET_DRIFT", { v3EvidenceId: v3.data.evidence.conflictEvidenceId, v4EvidenceId: v4.data.evidence.v4EvidenceId }, false);
      return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_TARGET_DRIFT", "Blocked", { v4: v4.data, canonicalMutationPerformed: false, authorityEffect: "none" });
    }

    attempt = await namespace.transitionLocalFirstRepositoryTransportAttempt(attemptId, "VERIFIED", { v3EvidenceId: v3.data.evidence.conflictEvidenceId, v4EvidenceId: v4.data.evidence.v4EvidenceId, transitionReason: "v2-v3-v4-verified" });
    if (!attempt || attempt.ok !== true) return attempt;
    transition = await namespace.transitionLocalFirstRepositorySyncSession(sessionId, "AWAITING_ACCEPTANCE", { conflictEvidenceId: null, transitionReason: "v2-v3-v4-verified-awaiting-explicit-acceptance" });
    if (!transition || transition.ok !== true) return transition;
    await namespace.createLocalFirstRepositorySyncEvidence({
      syncSessionId: sessionId,
      evidenceType: "verification",
      sessionStatus: "AWAITING_ACCEPTANCE",
      relatedRecordId: v4.data.evidence.v4EvidenceId,
      validationPassed: true,
      detail: { receiptId: received.data.receipt.receiptId, v3EvidenceId: v3.data.evidence.conflictEvidenceId, v4EvidenceId: v4.data.evidence.v4EvidenceId, awaitingExplicitAcceptance: true }
    });
    state.syncEngineStatus = "Awaiting Acceptance";
    state.lastSyncEngineSessionId = sessionId;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_ANDROID_TO_PC_SYNC_AWAITING_ACCEPTANCE", "Awaiting Acceptance", {
      syncSession: transition.data.syncSession,
      transportAttempt: attempt.data.transportAttempt,
      receipt: received.data.receipt,
      v3Evidence: v3.data.evidence,
      v4Evidence: v4.data.evidence,
      syncEngineStoppedAtAuthorityBoundary: true,
      explicitAcceptanceGranted: false,
      acceptanceTokenIssued: false,
      canonicalMutationPerformed: false,
      baselinePromotionPerformed: false,
      authorityEffect: "none"
    });
  }

  async function receiveAndroidToPcSyncFile(file, options) {
    const initialized = await initializeSyncEngine();
    if (!initialized || initialized.ok !== true) return initialized;
    const received = await namespace.receiveLocalFirstRepositoryExplicitFileTransport(file, { requireAndroidSender: true });
    if (!received || received.ok !== true) return received;
    return verifyReceivedSession(received, options);
  }

  async function restoreVerificationLineage(syncSessionId, baseline, lastAttempt) {
    const sessionId = internal.text(syncSessionId, "");
    const attempt = lastAttempt || null;
    if (!sessionId || !attempt) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_LINEAGE_ATTEMPT_REQUIRED", "Blocked", { syncSessionId: sessionId || null });
    if (!internal.isPlainObject(attempt.transportEnvelope) || !internal.isPlainObject(attempt.transportEnvelope.v2Envelope)) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_TRANSPORT_ENVELOPE_NOT_PERSISTED", "Blocked", { syncSessionId: sessionId, transportAttemptId: attempt.transportAttemptId, blindResumePerformed: false });
    }
    const receipt = attempt.receiptId ? await namespace.getPersistedLocalFirstRepositoryRecord("v2TransferReceipt", attempt.receiptId) : null;
    const v3 = attempt.v3EvidenceId ? await namespace.getPersistedLocalFirstRepositoryRecord("v3ConflictEvidence", attempt.v3EvidenceId) : null;
    const v4 = attempt.v4EvidenceId ? await namespace.getPersistedLocalFirstRepositoryRecord("v4TargetValidationEvidence", attempt.v4EvidenceId) : null;
    const checks = {
      receipt: Boolean(receipt && namespace.validateContract("v2TransferReceiptDescriptor", receipt).valid === true),
      v3: Boolean(v3 && namespace.validateContract("v3ConflictEvidenceDescriptor", v3).valid === true),
      v4: Boolean(v4 && namespace.validateContract("v4TargetValidationEvidenceDescriptor", v4).valid === true),
      baseline: Boolean(baseline && namespace.validateContract("canonicalBaselineDescriptor", baseline).valid === true),
      transportEnvelope: false
    };
    try {
      const transportValidation = await namespace.validateLocalFirstRepositorySyncTransportEnvelope(attempt.transportEnvelope, { requireAndroidSender: true });
      checks.transportEnvelope = Boolean(transportValidation && transportValidation.valid === true);
    } catch (_) {}
    if (!Object.keys(checks).every(function (key) { return checks[key] === true; })) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_RELOAD_LINEAGE_INVALID", "Blocked", { syncSessionId: sessionId, transportAttemptId: attempt.transportAttemptId, checks: checks, blindResumePerformed: false });
    }
    if (receipt.transferPackageId !== attempt.transferPackageId || v3.receiptId !== receipt.receiptId || v4.receiptId !== receipt.receiptId || v4.v3ConflictEvidenceId !== v3.conflictEvidenceId) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_RELOAD_LINEAGE_BINDING_MISMATCH", "Blocked", { syncSessionId: sessionId, transportAttemptId: attempt.transportAttemptId, blindResumePerformed: false });
    }
    state.lastCanonicalBaseline = internal.clone(baseline);
    state.lastV2TransferReceipt = internal.clone(receipt);
    state.lastV2TransferEnvelope = internal.clone(attempt.transportEnvelope.v2Envelope);
    state.lastV3ConflictEvidence = internal.clone(v3);
    state.lastV4TargetValidationEvidence = internal.clone(v4);
    state.lastSyncTransportEnvelope = internal.clone(attempt.transportEnvelope);
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_SYNC_ENGINE_RELOAD_LINEAGE_RESTORED", "Restored", {
      syncSessionId: sessionId,
      transportAttemptId: attempt.transportAttemptId,
      receiptId: receipt.receiptId,
      v3EvidenceId: v3.conflictEvidenceId,
      v4EvidenceId: v4.v4EvidenceId,
      checks: checks,
      authorityEffect: "none"
    });
  }

  async function resumeSyncSession(syncSessionId, options) {
    const id = internal.text(syncSessionId, "");
    if (!id) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_SESSION_REQUIRED", "Blocked", null);
    const initialized = await initializeSyncEngine();
    if (!initialized || initialized.ok !== true) return initialized;
    const restored = await namespace.restoreLocalFirstRepositorySyncSession(id);
    if (!restored || restored.ok !== true) return restored;
    const session = restored.data.syncSession;
    const baseline = await currentBaseline();
    if (!baseline || baseline.canonicalRevisionId !== session.baseRevisionId) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_RESUME_BASELINE_STALE", "Blocked", { sessionBaseRevisionId: session.baseRevisionId, currentCanonicalRevisionId: baseline && baseline.canonicalRevisionId || null, blindResumePerformed: false });
    const attempts = await namespace.listLocalFirstRepositoryTransportAttempts(id);
    const lastAttempt = attempts.length ? attempts[attempts.length - 1] : null;
    if (session.sessionStatus === "INTERRUPTED" || (lastAttempt && lastAttempt.attemptStatus === "INTERRUPTED")) {
      await namespace.createLocalFirstRepositorySyncEvidence({ syncSessionId: id, evidenceType: "resume", sessionStatus: session.sessionStatus, relatedRecordId: lastAttempt && lastAttempt.transportAttemptId || null, validationPassed: false, detail: { freshRetryRequired: true, blindResumePerformed: false } });
      return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_RESUME_REQUIRES_NEW_ATTEMPT", "Blocked", { syncSession: session, lastTransportAttempt: lastAttempt, freshRetryRequired: true, blindResumePerformed: false });
    }
    if (session.sessionStatus === "AWAITING_ACCEPTANCE") {
      const scan = options && options.desktopScanResult ? options.desktopScanResult : await namespace.selectAndScanDesktopRepository();
      if (!scan || scan.ok !== true) return scan;
      const currentStable = scan.data.staticManifest.manifestHash === baseline.manifestHash && scan.data.staticManifest.scriptSetHash === baseline.scriptSetHash && Number(scan.data.staticManifest.scriptCount) === Number(baseline.scriptCount);
      if (!currentStable) return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_RESUME_TARGET_STALE", "Blocked", { blindResumePerformed: false, currentStable: false });
      const lineage = await restoreVerificationLineage(id, baseline, lastAttempt);
      if (!lineage || lineage.ok !== true) return lineage;
      await namespace.createLocalFirstRepositorySyncEvidence({ syncSessionId: id, evidenceType: "resume", sessionStatus: "AWAITING_ACCEPTANCE", relatedRecordId: lastAttempt && lastAttempt.transportAttemptId || null, validationPassed: true, detail: { currentBaselineVerified: true, currentTargetVerified: true, verificationLineageRestored: true, blindResumePerformed: false } });
      return internal.buildResult(true, "REPOSITORY010_SYNC_ENGINE_AWAITING_ACCEPTANCE_RESTORED", "Awaiting Acceptance", { syncSession: session, lastTransportAttempt: lastAttempt, verificationLineage: lineage.data, currentBaselineVerified: true, currentTargetVerified: true, canonicalMutationPerformed: false, authorityEffect: "none" });
    }
    return internal.buildResult(false, "REPOSITORY010_SYNC_ENGINE_RESUME_STATE_NOT_SUPPORTED", "Blocked", { syncSession: session, lastTransportAttempt: lastAttempt, blindResumePerformed: false });
  }

  function getSyncEngineStatus() {
    return {
      status: state.syncEngineStatus || "Ready",
      phase: 16,
      moduleVersion: MODULE_VERSION,
      decisionIds: ["REPOSITORY-010-DECISION-010", "REPOSITORY-010-DECISION-011", "REPOSITORY-010-DECISION-012"],
      syncEngineImplemented: true,
      controlledTwoWayArchitecture: true,
      androidToPcRealPushArchitectureImplemented: true,
      pcToAndroidRealPullImplemented: false,
      crossDeviceRealSyncImplemented: state.crossDevicePhase16ValidationPassed === true,
      crossDeviceRealSyncToAcceptanceBoundaryImplemented: true,
      guardedSyncStateMachineImplemented: true,
      evidenceBoundRecoveryImplemented: true,
      explicitFileTransportImplemented: typeof namespace.receiveLocalFirstRepositoryExplicitFileTransport === "function",
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticConflictWinnerAllowed: false,
      automaticBaselinePromotionAllowed: false,
      lastSyncEngineSessionId: state.lastSyncEngineSessionId || null,
      lastError: internal.clone(state.lastSyncEngineError || null)
    };
  }

  Object.assign(namespace.api, {
    initializeLocalFirstRepositorySyncEngine: initializeSyncEngine,
    prepareLocalFirstRepositoryAndroidToPcSyncExport: prepareAndroidToPcSyncExport,
    receiveLocalFirstRepositoryAndroidToPcSyncFile: receiveAndroidToPcSyncFile,
    resumeLocalFirstRepositorySyncSession: resumeSyncSession,
    getLocalFirstRepositorySyncEngineStatus: getSyncEngineStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.syncEngine = {
    id: "REPOSITORY-010-CONTROLLED-CROSS-DEVICE-SYNC-ENGINE",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 16,
    syncEngineImplemented: true,
    androidToPcRealPushArchitectureImplemented: true,
    pcToAndroidRealPullImplemented: false,
    crossDeviceRealSyncImplemented: false,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
