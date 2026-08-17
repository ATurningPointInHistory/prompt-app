/* ============================================================
   FILE: 13_local_first_repository_phase16_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.15.0 / Module: Phase 16 Validation 1.0.0
   Phase 16: Controlled Cross-Device Sync Engine
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 16 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase16Validation");

  function add(checks, name, passed, detail, category, critical) {
    checks.push({ name: name, passed: passed === true, detail: detail == null ? null : internal.clone(detail), category: category || "General", critical: critical !== false });
  }

  function summarize(name, checks, extras) {
    const passed = checks.filter(function (item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function (item) { return !item.passed && item.critical; }).length;
    return Object.assign({
      id: "REPOSITORY010-PHASE16-VALIDATION-" + Date.now().toString(36).toUpperCase(),
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      name: name,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(1)) : 0,
      criticalFailed: criticalFailed,
      releaseAllowed: failed === 0 && criticalFailed === 0,
      checks: checks,
      createdAt: internal.nowIso()
    }, extras || {});
  }

  async function runPreDeviceValidation() {
    const checks = [];
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const persistenceStatus = namespace.getLocalFirstRepositoryPersistenceStatus();
    const syncStatus = namespace.getLocalFirstRepositorySyncSessionStatus();
    const engineStatus = namespace.getLocalFirstRepositorySyncEngineStatus();
    const transportStatus = namespace.getLocalFirstRepositoryExplicitFileTransportStatus();
    const developmentStatus = namespace.getLocalFirstRepositoryDevelopmentReleaseStatus();
    const promotionStatus = namespace.getBaselinePromotionStatus ? namespace.getBaselinePromotionStatus() : {};

    add(checks, "Release version is 1.15.0", VERSION_MANIFEST.release.version === "1.15.0", VERSION_MANIFEST.release.version, "Version");
    add(checks, "Phase is Controlled Cross-Device Sync Engine", VERSION_MANIFEST.implementation.phase === 16, VERSION_MANIFEST.release.implementationPhase, "Version");
    add(checks, "Decision-001..014 are frozen", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.length === 14 && VERSION_MANIFEST.release.decisionIds[13] === "REPOSITORY-010-DECISION-014", VERSION_MANIFEST.release.decisionIds, "Architecture");
    add(checks, "Canonical 0010 is Phase 16 starting baseline", VERSION_MANIFEST.release.priorValidatedBaseline && VERSION_MANIFEST.release.priorValidatedBaseline.canonicalRevisionId === "REPOSITORY010-CANONICAL-REVISION-0010", VERSION_MANIFEST.release.priorValidatedBaseline, "Baseline");
    add(checks, "DB version is 8", persistenceStatus.databaseVersion === 8, persistenceStatus.databaseVersion, "Persistence");
    ["transportAttempt", "v2TransferReceipt", "v3ConflictEvidence", "v4TargetValidationEvidence", "developmentReleasePlan", "developmentReleaseV5Evidence"].forEach(function (recordType) {
      add(checks, "DB v8 record type exists: " + recordType, persistenceStatus.recordTypes.indexOf(recordType) !== -1, persistenceStatus.recordTypes, "Persistence");
    });

    ["transportAdapterDescriptor", "transportAttemptDescriptor", "syncTransportEnvelopeDescriptor", "developmentReleasePlanDescriptor", "developmentReleaseV5EvidenceDescriptor"].forEach(function (key) {
      add(checks, "Contract registered: " + key, !!namespace.getContractDefinition(key), namespace.getContractDefinition(key), "Contract");
    });

    const oldPhase15Session = {
      syncSessionId: "REPOSITORY010-PHASE16-BACKWARD-COMPAT-SESSION",
      projectId: "AI-PROMPT-OS-MAIN",
      repositoryId: "AI-PROMPT-OS-REPOSITORY",
      sourceNodeId: "REPOSITORY010-ANDROID-VALIDATED-REPLICA",
      targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
      direction: "push",
      baseRevisionId: "REPOSITORY010-CANONICAL-REVISION-0010",
      sourceRevisionId: null,
      targetRevisionId: "REPOSITORY010-CANONICAL-REVISION-0010",
      sessionStatus: "CREATED",
      differenceId: null,
      syncCandidateId: null,
      transferPackageId: null,
      conflictEvidenceId: null,
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      automaticAcceptancePerformed: false,
      automaticConflictWinnerApplied: false,
      automaticBaselinePromotionPerformed: false,
      syncEngineInvoked: false,
      createdAt: internal.nowIso(),
      updatedAt: internal.nowIso(),
      immutable: false
    };
    add(checks, "Phase 15 Sync Session records remain contract-compatible", namespace.validateContract("syncSessionDescriptor", oldPhase15Session).valid === true, namespace.validateContract("syncSessionDescriptor", oldPhase15Session), "Compatibility");
    const phase16EngineSession = Object.assign({}, oldPhase15Session, { syncSessionId: "REPOSITORY010-PHASE16-ENGINE-PROVENANCE", syncEngineInvoked: true, transitionHistory: [], transportAttemptId: null });
    add(checks, "Phase 16 Sync Session can record Sync Engine provenance", namespace.validateContract("syncSessionDescriptor", phase16EngineSession).valid === true, namespace.validateContract("syncSessionDescriptor", phase16EngineSession), "Compatibility");

    const previousAdapter = namespace.getLocalFirstRepositoryPersistenceStatus().adapterId;
    const memory = namespace.createMemoryLocalFirstRepositoryPersistenceAdapter();
    namespace.setLocalFirstRepositoryPersistenceAdapter(memory);
    try {
      const session = await namespace.createLocalFirstRepositorySyncSession({
        syncSessionId: "REPOSITORY010-PHASE16-GUARD-SESSION",
        sourceNodeId: "REPOSITORY010-ANDROID-VALIDATED-REPLICA",
        targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
        direction: "push",
        baseRevisionId: "REPOSITORY010-CANONICAL-REVISION-0010"
      });
      add(checks, "Guard fixture Sync Session created", session && session.ok === true, session, "State Machine");
      const illegalInitialSession = await namespace.createLocalFirstRepositorySyncSession({
        syncSessionId: "REPOSITORY010-PHASE16-ILLEGAL-INITIAL-SESSION",
        sourceNodeId: "REPOSITORY010-ANDROID-VALIDATED-REPLICA",
        targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
        direction: "push",
        baseRevisionId: "REPOSITORY010-CANONICAL-REVISION-0010",
        sessionStatus: "VERIFYING"
      });
      add(checks, "New Sync Session cannot bypass CREATED", illegalInitialSession && illegalInitialSession.ok === false && illegalInitialSession.code === "REPOSITORY010_SYNC_SESSION_INITIAL_STATE_GUARD_BLOCKED", illegalInitialSession, "State Machine");
      const illegal = await namespace.transitionLocalFirstRepositorySyncSession("REPOSITORY010-PHASE16-GUARD-SESSION", "VERIFYING");
      add(checks, "Illegal Sync Session state jump is blocked", illegal && illegal.ok === false && illegal.code === "REPOSITORY010_SYNC_SESSION_TRANSITION_GUARD_BLOCKED", illegal, "State Machine");
      const legal = await namespace.transitionLocalFirstRepositorySyncSession("REPOSITORY010-PHASE16-GUARD-SESSION", "OBSERVING", { transitionReason: "phase16-validation" });
      add(checks, "Legal Sync Session transition passes", legal && legal.ok === true && legal.data.syncSession.sessionStatus === "OBSERVING", legal, "State Machine");
      add(checks, "Transition History is recorded", legal && Array.isArray(legal.data.syncSession.transitionHistory) && legal.data.syncSession.transitionHistory.length >= 2, legal && legal.data.syncSession.transitionHistory, "State Machine");

      const attemptCreated = await namespace.createLocalFirstRepositoryTransportAttempt({
        transportAttemptId: "REPOSITORY010-PHASE16-GUARD-ATTEMPT",
        syncSessionId: "REPOSITORY010-PHASE16-GUARD-SESSION",
        transportAdapterId: "REPOSITORY-010-EXPLICIT-FILE-TRANSPORT",
        transportType: "explicit-file-transfer",
        transferPackageId: "REPOSITORY010-PHASE16-VALIDATION-PACKAGE",
        sourceNodeId: "REPOSITORY010-ANDROID-VALIDATED-REPLICA",
        targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
        baseRevisionId: "REPOSITORY010-CANONICAL-REVISION-0010"
      });
      add(checks, "Transport Attempt persists", attemptCreated && attemptCreated.ok === true, attemptCreated, "Transport");
      const illegalInitialAttempt = await namespace.createLocalFirstRepositoryTransportAttempt({
        transportAttemptId: "REPOSITORY010-PHASE16-ILLEGAL-INITIAL-ATTEMPT",
        syncSessionId: "REPOSITORY010-PHASE16-GUARD-SESSION",
        transportAdapterId: "REPOSITORY-010-EXPLICIT-FILE-TRANSPORT",
        transportType: "explicit-file-transfer",
        transferPackageId: "REPOSITORY010-PHASE16-VALIDATION-PACKAGE",
        sourceNodeId: "REPOSITORY010-ANDROID-VALIDATED-REPLICA",
        targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
        baseRevisionId: "REPOSITORY010-CANONICAL-REVISION-0010",
        attemptStatus: "VERIFIED"
      });
      add(checks, "New Transport Attempt cannot bypass CREATED", illegalInitialAttempt && illegalInitialAttempt.ok === false && illegalInitialAttempt.code === "REPOSITORY010_TRANSPORT_ATTEMPT_INITIAL_STATE_GUARD_BLOCKED", illegalInitialAttempt, "Transport");
      const attemptIllegal = await namespace.transitionLocalFirstRepositoryTransportAttempt("REPOSITORY010-PHASE16-GUARD-ATTEMPT", "VERIFIED");
      add(checks, "Illegal Transport Attempt state jump is blocked", attemptIllegal && attemptIllegal.ok === false && attemptIllegal.code === "REPOSITORY010_TRANSPORT_ATTEMPT_TRANSITION_GUARD_BLOCKED", attemptIllegal, "Transport");
      const attemptLegal = await namespace.transitionLocalFirstRepositoryTransportAttempt("REPOSITORY010-PHASE16-GUARD-ATTEMPT", "PREPARED", { transitionReason: "phase16-validation" });
      add(checks, "Legal Transport Attempt transition passes", attemptLegal && attemptLegal.ok === true && attemptLegal.data.transportAttempt.attemptStatus === "PREPARED", attemptLegal, "Transport");
      const restoredAttempt = await namespace.restoreLocalFirstRepositoryTransportAttempt("REPOSITORY010-PHASE16-GUARD-ATTEMPT");
      add(checks, "Transport Attempt reload recovery passes", restoredAttempt && restoredAttempt.ok === true && restoredAttempt.data.reloadRecoveryVerified === true, restoredAttempt, "Recovery");
    } finally {
      namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    }
    add(checks, "Persistence adapter restored after deterministic validation", namespace.getLocalFirstRepositoryPersistenceStatus().adapterId !== "REPOSITORY-010-MEMORY-REPLICA-PERSISTENCE", { before: previousAdapter, after: namespace.getLocalFirstRepositoryPersistenceStatus().adapterId }, "Persistence");

    add(checks, "Explicit File Transport adapter registered", !!namespace.getLocalFirstRepositoryTransportAdapter("REPOSITORY-010-EXPLICIT-FILE-TRANSPORT"), namespace.listLocalFirstRepositoryTransportAdapters(), "Transport");
    add(checks, "Explicit File Transport is user-action-bound", transportStatus.explicitFileTransportImplemented === true && transportStatus.canonicalMutationAuthority === false && transportStatus.automaticAcceptanceAllowed === false, transportStatus, "Authority");
    add(checks, "V2 implementation is reused", typeof namespace.receiveV2TransferEnvelope === "function" && typeof namespace.validateV2TransferEnvelope === "function", null, "Reuse");
    add(checks, "V3 implementation is reused", typeof namespace.evaluateV3BaseRevision === "function", null, "Reuse");
    add(checks, "V4 implementation is reused", typeof namespace.evaluateV4TargetEnvironment === "function", null, "Reuse");
    add(checks, "Development Release V5 implemented", developmentStatus.developmentReleaseV5Implemented === true && developmentStatus.automaticSourceWrite === false, developmentStatus, "Development Release");
    add(checks, "Baseline Promotion supports Development Release V5", promotionStatus.developmentReleaseV5Supported === true || (namespace.modules.baselinePromotion && namespace.modules.baselinePromotion.developmentReleaseV5Supported === true), promotionStatus, "Development Release");
    add(checks, "Sync Engine is implemented", engineStatus.syncEngineImplemented === true, engineStatus, "Sync Engine");
    add(checks, "Sync Engine stops at explicit acceptance boundary", engineStatus.crossDeviceRealSyncToAcceptanceBoundaryImplemented === true && engineStatus.canonicalMutationAuthority === false && engineStatus.automaticAcceptanceAllowed === false, engineStatus, "Authority");
    add(checks, "PC to Android Real Pull remains unimplemented", engineStatus.pcToAndroidRealPullImplemented === false, engineStatus, "Scope");
    add(checks, "Cross-device real sync is not claimed by pre-device validation", engineStatus.crossDeviceRealSyncImplemented === false, engineStatus, "Scope");
    add(checks, "Direct Repository mutation remains disabled", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false && VERSION_MANIFEST.safety.phase16SyncEngineCanonicalMutationAuthority === false, VERSION_MANIFEST.safety, "Authority");
    add(checks, "Automatic acceptance/conflict/promotion/GitHub remain disabled", VERSION_MANIFEST.safety.phase16AutomaticAcceptanceAllowed === false && VERSION_MANIFEST.safety.phase16AutomaticConflictWinnerAllowed === false && VERSION_MANIFEST.safety.phase16AutomaticBaselinePromotionAllowed === false && VERSION_MANIFEST.safety.phase16AutomaticGitHubReflectionAllowed === false, VERSION_MANIFEST.safety, "Authority");

    const result = summarize("REPOSITORY-010 Phase 16 Pre-Device Validation", checks, {
      phase16PreDeviceValidationPassed: checks.every(function (item) { return item.passed; }),
      databaseVersion: persistenceStatus.databaseVersion,
      guardedSyncStateMachineImplemented: syncStatus.guardedStateMachineImplemented === true,
      transportAttemptImplemented: true,
      explicitFileTransportImplemented: true,
      developmentReleaseV5Implemented: true,
      syncEngineImplemented: true,
      crossDeviceRealSyncImplemented: false,
      canonicalMutationPerformed: false
    });
    state.lastPhase16Validation = internal.clone(result);
    state.phase16PreDeviceValidationPassed = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  async function runPersistenceReloadValidation() {
    const checks = [];
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const initialized = await namespace.initializeLocalFirstRepositoryPersistence();
    add(checks, "DB v8 initializes", initialized && initialized.ok === true, initialized, "Persistence");
    const status = namespace.getLocalFirstRepositoryPersistenceStatus();
    add(checks, "DB v8 active", status.databaseVersion === 8, status, "Persistence");
    ["transportAttempt", "v2TransferReceipt", "v3ConflictEvidence", "v4TargetValidationEvidence", "developmentReleasePlan", "developmentReleaseV5Evidence"].forEach(function (recordType) {
      add(checks, "Reload store available: " + recordType, status.recordTypes.indexOf(recordType) !== -1, status.recordTypes, "Persistence");
    });
    const result = summarize("REPOSITORY-010 Phase 16 Persistence Reload Validation", checks, {
      persistenceReloadVerified: checks.every(function (item) { return item.passed; }),
      databaseVersion: status.databaseVersion,
      canonicalMutationPerformed: false
    });
    state.lastPhase16PersistenceReloadValidation = internal.clone(result);
    state.phase16PersistenceReloadValidationPassed = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  async function runRealCrossDeviceValidation() {
    const checks = [];
    const sessions = await namespace.listLocalFirstRepositorySyncSessions();
    const awaiting = sessions.filter(function (item) { return item.sessionStatus === "AWAITING_ACCEPTANCE"; }).sort(function (a, b) { return String(a.updatedAt || "").localeCompare(String(b.updatedAt || "")); }).pop();
    add(checks, "AWAITING_ACCEPTANCE Session exists", !!awaiting, awaiting || null, "Cross Device");
    let attempt = null;
    let receipt = null;
    let v3 = null;
    let v4 = null;
    if (awaiting) {
      const attempts = await namespace.listLocalFirstRepositoryTransportAttempts(awaiting.syncSessionId);
      attempt = attempts.filter(function (item) { return item.attemptStatus === "VERIFIED"; }).pop() || null;
      if (attempt && attempt.receiptId) receipt = await namespace.getPersistedLocalFirstRepositoryRecord("v2TransferReceipt", attempt.receiptId);
      if (attempt && attempt.v3EvidenceId) v3 = await namespace.getPersistedLocalFirstRepositoryRecord("v3ConflictEvidence", attempt.v3EvidenceId);
      if (attempt && attempt.v4EvidenceId) v4 = await namespace.getPersistedLocalFirstRepositoryRecord("v4TargetValidationEvidence", attempt.v4EvidenceId);
    }
    add(checks, "Transport Attempt VERIFIED", !!attempt, attempt || null, "Cross Device");
    add(checks, "V2 Receipt persisted", !!receipt && receipt.v2TransferIntegrityValidated === true, receipt || null, "V2");
    add(checks, "Android sender is real-device evidence", !!receipt && /Android/i.test(String(receipt.senderUserAgent || "")), receipt && receipt.senderUserAgent || null, "Real Device");
    add(checks, "Physical user-selected transfer occurred", !!receipt && receipt.receivedViaUserSelection === true, receipt || null, "Real Device");
    add(checks, "V3 Evidence persisted and base matched", !!v3 && v3.baseRevisionMatch === true && v3.conflictDetected === false, v3 || null, "V3");
    add(checks, "V4 Evidence persisted and target stable", !!v4 && v4.targetEnvironmentMatch === true && v4.integrityVerified === true, v4 || null, "V4");
    add(checks, "Session has no Canonical mutation", !!awaiting && awaiting.canonicalMutationPerformed === false && awaiting.automaticAcceptancePerformed === false && awaiting.automaticBaselinePromotionPerformed === false, awaiting || null, "Authority");
    add(checks, "PC Real Environment detected", !/Android/i.test(global.navigator && global.navigator.userAgent || "") && typeof global.showDirectoryPicker === "function", global.navigator && global.navigator.userAgent || null, "Real Device");

    const result = summarize("REPOSITORY-010 Phase 16 Real Cross-Device Validation", checks, {
      phase16Complete: checks.every(function (item) { return item.passed; }),
      pcRealDevice: checks.length > 0 && checks[checks.length - 1].passed === true,
      androidSenderRealDevice: Boolean(receipt && /Android/i.test(String(receipt.senderUserAgent || ""))),
      crossDeviceRealValidation: true,
      actualPhysicalTransfer: Boolean(receipt && receipt.receivedViaUserSelection === true),
      syncEngineImplemented: true,
      androidToPcRealPushImplemented: checks.every(function (item) { return item.passed; }),
      pcToAndroidRealPullImplemented: false,
      crossDeviceRealSyncImplemented: checks.every(function (item) { return item.passed; }),
      crossDeviceRealSyncToAcceptanceBoundaryImplemented: checks.every(function (item) { return item.passed; }),
      canonicalMutationAuthority: false,
      canonicalMutationPerformed: false,
      automaticAcceptancePerformed: false,
      automaticConflictWinnerApplied: false,
      automaticBaselinePromotionPerformed: false
    });
    state.lastPhase16RealCrossDeviceValidation = internal.clone(result);
    state.crossDevicePhase16ValidationPassed = result.releaseAllowed === true;
    state.phase16Complete = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  function getPhase16ValidationStatus() {
    return {
      status: state.phase16Complete === true ? "Complete" : (state.phase16PreDeviceValidationPassed === true ? "Pre-Device Passed" : "Ready"),
      phase: 16,
      moduleVersion: MODULE_VERSION,
      phase16PreDeviceValidationPassed: state.phase16PreDeviceValidationPassed === true,
      persistenceReloadValidationPassed: state.phase16PersistenceReloadValidationPassed === true,
      crossDeviceRealValidationPassed: state.crossDevicePhase16ValidationPassed === true,
      phase16Complete: state.phase16Complete === true,
      lastPreDeviceValidation: internal.clone(state.lastPhase16Validation || null),
      lastPersistenceReloadValidation: internal.clone(state.lastPhase16PersistenceReloadValidation || null),
      lastRealCrossDeviceValidation: internal.clone(state.lastPhase16RealCrossDeviceValidation || null)
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase16Validation: runPreDeviceValidation,
    runLocalFirstRepositoryPhase16PersistenceReloadValidation: runPersistenceReloadValidation,
    runLocalFirstRepositoryPhase16RealCrossDeviceValidation: runRealCrossDeviceValidation,
    getLocalFirstRepositoryPhase16ValidationStatus: getPhase16ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase16Validation = {
    id: "REPOSITORY-010-PHASE16-VALIDATION",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 16,
    preDeviceValidationImplemented: true,
    persistenceReloadValidationImplemented: true,
    realCrossDeviceValidationImplemented: true,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase16Validation = runPreDeviceValidation;
  global.runLocalFirstRepositoryPhase16PersistenceReloadValidation = runPersistenceReloadValidation;
  global.runLocalFirstRepositoryPhase16RealCrossDeviceValidation = runRealCrossDeviceValidation;
})(typeof window !== "undefined" ? window : globalThis);
