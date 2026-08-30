/* ============================================================
   FILE: 13_local_first_repository_operational_initialization.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.16.0 / Module: Operational Initialization 1.0.0
   Phase 17 / Decision-015
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Operational Initialization blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("operationalInitialization");

  function ensurePageSession() {
    if (!state.operationalPageSessionId) state.operationalPageSessionId = internal.nextId("REPOSITORY010-PAGE-SESSION");
    return state.operationalPageSessionId;
  }

  async function initializeOperationalRuntime(options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const pageId = ensurePageSession();
    const alreadyInitialized = state.operationalInitializationPageSessionId === pageId && state.operationalInitializationStatus === "Ready";
    const steps = [];
    try {
      if (typeof namespace.initializeContracts === "function") steps.push({ name: "contracts", result: namespace.initializeContracts() });
      if (typeof namespace.initializeMetadataModel === "function") steps.push({ name: "metadata", result: namespace.initializeMetadataModel() });
      if (typeof namespace.initializeLocalFirstRepositoryPersistence === "function") steps.push({ name: "persistence", result: await namespace.initializeLocalFirstRepositoryPersistence() });
      if (typeof namespace.initializeDesktopRepositoryAdapter === "function" && typeof global.showDirectoryPicker === "function") steps.push({ name: "desktop-adapter", result: namespace.initializeDesktopRepositoryAdapter() });
      else steps.push({ name: "desktop-adapter", result: { ok: true, code: "REPOSITORY010_DESKTOP_ADAPTER_NOT_REQUIRED_ON_THIS_RUNTIME", status: "Not Required" } });
      if (typeof namespace.initializeBaselinePromotion === "function") steps.push({ name: "baseline-promotion", result: await namespace.initializeBaselinePromotion() });
      if (typeof namespace.restoreLocalFirstRepositoryDevelopmentReleaseRecords === "function") steps.push({ name: "development-release", result: await namespace.restoreLocalFirstRepositoryDevelopmentReleaseRecords() });
      if (typeof namespace.restoreLocalFirstRepositoryReplicaBaselineProvisioningRecords === "function") steps.push({ name: "replica-baseline", result: await namespace.restoreLocalFirstRepositoryReplicaBaselineProvisioningRecords() });

      const recordTypes = ["syncSession", "syncDifference", "syncEvidence", "transportAttempt", "v2TransferReceipt", "v3ConflictEvidence", "v4TargetValidationEvidence", "operationalEvidence"];
      const restoredCounts = {};
      for (const recordType of recordTypes) {
        try {
          const records = await namespace.listPersistedLocalFirstRepositoryRecords(recordType);
          restoredCounts[recordType] = Array.isArray(records) ? records.length : 0;
        } catch (_) { restoredCounts[recordType] = 0; }
      }
      if (typeof namespace.restoreLocalFirstRepositoryOperationalEvidence === "function") steps.push({ name: "operational-evidence", result: await namespace.restoreLocalFirstRepositoryOperationalEvidence() });
      if (typeof namespace.initializeLocalFirstRepositorySyncEngine === "function") steps.push({ name: "sync-engine", result: await namespace.initializeLocalFirstRepositorySyncEngine() });

      const failedStep = steps.find(function (step) { return step.result && step.result.ok === false; });
      if (failedStep) throw new Error("Operational initialization failed at " + failedStep.name + ".");
      state.activeDesktopScanBinding = null;
      state.activeDesktopScanResult = null;
      state.desktopSelectionRequired = true;
      state.operationalInitializationStatus = "Ready";
      state.operationalInitializationPageSessionId = pageId;
      state.operationalInitializationRunCount = Number(state.operationalInitializationRunCount || 0) + 1;
      state.lastOperationalInitializationError = null;
      internal.touch();
      const resultData = {
        pageSessionId: pageId,
        idempotent: alreadyInitialized,
        initializationRunCount: state.operationalInitializationRunCount,
        restoredCounts: restoredCounts,
        desktopSelectionRequired: true,
        fileSystemDirectoryHandleRestored: false,
        activeDesktopScanBindingRestored: false,
        blindResumePerformed: false,
        canonicalMutationPerformed: false,
        automaticAcceptancePerformed: false,
        automaticPromotionPerformed: false,
        authorityEffect: "none"
      };
      if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function" && opts.suppressEvidence !== true && !alreadyInitialized) {
        await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "reload-initialization", sourceNodeId: null, targetNodeId: null, relatedRecordId: pageId, validationPassed: true, detail: resultData });
      }
      return internal.buildResult(true, "REPOSITORY010_OPERATIONAL_RUNTIME_INITIALIZED", "Ready", resultData);
    } catch (error) {
      state.operationalInitializationStatus = "Blocked";
      state.lastOperationalInitializationError = error && error.message ? error.message : String(error);
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_OPERATIONAL_RUNTIME_INITIALIZATION_FAILED", "Blocked", { pageSessionId: pageId, steps: steps.map(function (step) { return { name: step.name, ok: !step.result || step.result.ok !== false, code: step.result && step.result.code || null }; }), desktopSelectionRequired: true, blindResumePerformed: false }, { error: { message: state.lastOperationalInitializationError, category: "Operational Initialization" } });
    }
  }

  async function revalidateOperationalRuntime() {
    const initialized = await initializeOperationalRuntime({ suppressEvidence: true });
    if (!initialized || initialized.ok !== true) return initialized;
    const canonical = await namespace.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const replica = await namespace.listPersistedLocalFirstRepositoryRecords("replicaBaselineReference");
    const sessions = await namespace.listPersistedLocalFirstRepositoryRecords("syncSession");
    const attempts = await namespace.listPersistedLocalFirstRepositoryRecords("transportAttempt");
    const awaiting = (sessions || []).filter(function (record) { return record.sessionStatus === "AWAITING_ACCEPTANCE"; });
    const resultData = {
      canonicalBaselineCount: canonical.length,
      replicaBaselineReferenceCount: replica.length,
      syncSessionCount: sessions.length,
      transportAttemptCount: attempts.length,
      awaitingAcceptanceSessionCount: awaiting.length,
      desktopSelectionRequired: true,
      freshScanRequiredForResume: awaiting.length > 0,
      blindResumePerformed: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none"
    };
    if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function") await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "reload-recovery", sourceNodeId: null, targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL", relatedRecordId: awaiting.length ? awaiting[awaiting.length - 1].syncSessionId : null, validationPassed: true, detail: resultData });
    return internal.buildResult(true, "REPOSITORY010_OPERATIONAL_RUNTIME_REVALIDATED", "Verified", resultData);
  }

  function getInitializationStatus() {
    return {
      status: state.operationalInitializationStatus || "Not Initialized",
      phase: 17,
      moduleVersion: MODULE_VERSION,
      pageSessionId: ensurePageSession(),
      initializationRunCount: Number(state.operationalInitializationRunCount || 0),
      desktopSelectionRequired: state.desktopSelectionRequired !== false,
      fileSystemDirectoryHandleAutoRestoreAllowed: false,
      activeDesktopScanBindingAutoRestoreAllowed: false,
      idempotentInitializationImplemented: true,
      operationalInitializationGrantsAuthority: false,
      lastError: state.lastOperationalInitializationError || null
    };
  }

  Object.assign(namespace.api, {
    initializeLocalFirstRepositoryOperationalRuntime: initializeOperationalRuntime,
    revalidateLocalFirstRepositoryOperationalRuntime: revalidateOperationalRuntime,
    getLocalFirstRepositoryOperationalInitializationStatus: getInitializationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.operationalInitialization = {
    id: "REPOSITORY-010-OPERATIONAL-INITIALIZATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 17,
    idempotent: true,
    blindResumeAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
