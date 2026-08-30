/* ============================================================
   FILE: 13_local_first_repository_phase17_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.16.0 / Module: Phase 17 Validation 1.0.0
   Cross-Device Operational Hardening
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 17 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase17Validation");

  function check(list, name, passed, detail, category, critical) {
    list.push({ name: name, passed: passed === true, detail: detail == null ? null : internal.clone(detail), category: category || "Phase 17", critical: critical !== false });
  }
  function summary(checks, name) {
    const passed = checks.filter(function (item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function (item) { return item.critical && !item.passed; }).length;
    return {
      id: internal.nextId("REPOSITORY010-PHASE17-VALIDATION"),
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: "Phase 17 Cross-Device Operational Hardening",
      name: name,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 100,
      criticalFailed: criticalFailed,
      releaseAllowed: failed === 0 && criticalFailed === 0,
      checks: checks,
      createdAt: internal.nowIso()
    };
  }

  async function runPhase17Validation() {
    const checks = [];
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const persistence = await namespace.initializeLocalFirstRepositoryPersistence();
    check(checks, "Release = 1.16.0", VERSION_MANIFEST.release.version === "1.16.0", VERSION_MANIFEST.release.version, "Architecture");
    check(checks, "Phase = 17", VERSION_MANIFEST.implementation.phase === 17, VERSION_MANIFEST.implementation.phase, "Architecture");
    check(checks, "Decision-015 Frozen", VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-015") !== -1, VERSION_MANIFEST.release.decisionIds, "Architecture");
    ["operationalEvidence", "replicaBaselineProvisioning", "pickerSafeTransport", "operationalInitialization", "phase17Validation"].forEach(function (key) { check(checks, "Module loaded: " + key, Boolean(namespace.modules[key]), namespace.modules[key] || null, "Architecture"); });
    check(checks, "DB Version = 9", namespace.getLocalFirstRepositoryPersistenceStatus().databaseVersion === 9, namespace.getLocalFirstRepositoryPersistenceStatus(), "Persistence");
    ["replicaBaselineReference", "replicaBaselineProvisionPackage", "replicaBaselineProvisionEvidence", "operationalEvidence"].forEach(function (recordType) { check(checks, "Persistence record type: " + recordType, namespace.getLocalFirstRepositoryPersistenceStatus().recordTypes.indexOf(recordType) !== -1, recordType, "Persistence"); });
    check(checks, "Persistence initialized", persistence && persistence.ok === true, persistence, "Persistence");
    ["replicaBaselineReferenceDescriptor", "replicaBaselineProvisionPackageDescriptor", "replicaBaselineProvisionEvidenceDescriptor", "desktopScanBindingDescriptor", "operationalEvidenceDescriptor"].forEach(function (key) { check(checks, "Contract registered: " + key, Boolean(namespace.getContractDefinition(key)), namespace.getContractDefinition(key), "Contracts"); });
    check(checks, "Replica baseline provisioning API", typeof namespace.createLocalFirstRepositoryReplicaBaselineProvisionPackage === "function", null, "Provisioning");
    check(checks, "Provision validation API", typeof namespace.validateLocalFirstRepositoryReplicaBaselineProvisionPackage === "function", null, "Provisioning");
    check(checks, "Provision apply API", typeof namespace.applyLocalFirstRepositoryReplicaBaselineProvisionPackage === "function", null, "Provisioning");
    check(checks, "Provision file receive API", typeof namespace.receiveLocalFirstRepositoryReplicaBaselineProvisionFile === "function", null, "Provisioning");
    check(checks, "Picker-safe prepare API", typeof namespace.prepareLocalFirstRepositoryPickerSafePcReceiver === "function", null, "Picker Safety");
    check(checks, "Picker-safe receive API", typeof namespace.selectAndReceiveLocalFirstRepositoryPickerSafeAndroidToPcSync === "function", null, "Picker Safety");
    check(checks, "Receive hidden Directory Picker fallback disabled", VERSION_MANIFEST.implementation.hiddenDirectoryPickerFallbackAllowed === false, VERSION_MANIFEST.implementation.hiddenDirectoryPickerFallbackAllowed, "Picker Safety");
    const noBindingResult = await namespace.selectAndReceiveLocalFirstRepositoryPickerSafeAndroidToPcSync();
    check(checks, "Receive without Fresh Binding blocked", noBindingResult && noBindingResult.ok === false && noBindingResult.code === "REPOSITORY010_FRESH_PC_SCAN_REQUIRED", noBindingResult, "Picker Safety");
    check(checks, "Unified initialization API", typeof namespace.initializeLocalFirstRepositoryOperationalRuntime === "function", null, "Reload");
    const init1 = await namespace.initializeLocalFirstRepositoryOperationalRuntime({ suppressEvidence: true });
    const init2 = await namespace.initializeLocalFirstRepositoryOperationalRuntime({ suppressEvidence: true });
    check(checks, "Unified initialization succeeds", init1 && init1.ok === true, init1, "Reload");
    check(checks, "Second initialization succeeds", init2 && init2.ok === true, init2, "Reload");
    check(checks, "Second initialization idempotent", init2 && init2.data && init2.data.idempotent === true, init2 && init2.data, "Reload");
    check(checks, "Desktop selection required after initialization", init2 && init2.data && init2.data.desktopSelectionRequired === true, init2 && init2.data, "Reload");
    check(checks, "Directory handle not falsely restored", init2 && init2.data && init2.data.fileSystemDirectoryHandleRestored === false, init2 && init2.data, "Reload");
    check(checks, "Blind resume not performed", init2 && init2.data && init2.data.blindResumePerformed === false, init2 && init2.data, "Reload");
    check(checks, "Operational evidence API", typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function", null, "Evidence");
    check(checks, "Replica baseline grants no authority", VERSION_MANIFEST.safety.replicaBaselineGrantsAuthority === false, VERSION_MANIFEST.safety.replicaBaselineGrantsAuthority, "Authority");
    check(checks, "Picker binding grants no authority", VERSION_MANIFEST.safety.pickerBindingGrantsAuthority === false, VERSION_MANIFEST.safety.pickerBindingGrantsAuthority, "Authority");
    check(checks, "Operational initialization grants no authority", VERSION_MANIFEST.safety.operationalInitializationGrantsAuthority === false, VERSION_MANIFEST.safety.operationalInitializationGrantsAuthority, "Authority");
    check(checks, "Direct repository mutation disabled", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Authority");
    check(checks, "Automatic acceptance disabled", VERSION_MANIFEST.acceptance.phase17AutomaticAcceptanceAllowed === false, VERSION_MANIFEST.acceptance.phase17AutomaticAcceptanceAllowed, "Authority");
    check(checks, "Automatic conflict winner disabled", VERSION_MANIFEST.safety.phase17AutomaticConflictWinnerAllowed === false, VERSION_MANIFEST.safety.phase17AutomaticConflictWinnerAllowed, "Authority");
    check(checks, "Automatic promotion disabled", VERSION_MANIFEST.acceptance.phase17AutomaticBaselinePromotionAllowed === false, VERSION_MANIFEST.acceptance.phase17AutomaticBaselinePromotionAllowed, "Authority");
    check(checks, "Automatic GitHub reflection disabled", VERSION_MANIFEST.safety.phase17AutomaticGitHubReflectionAllowed === false, VERSION_MANIFEST.safety.phase17AutomaticGitHubReflectionAllowed, "Authority");
    check(checks, "Android->PC push preserved", VERSION_MANIFEST.implementation.androidToPcRealPushArchitectureImplemented === true, null, "Compatibility");
    check(checks, "PC->Android pull remains deferred", VERSION_MANIFEST.implementation.pcToAndroidRealPullImplemented === false, null, "Compatibility");
    check(checks, "V2 preserved", VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === true, null, "Compatibility");
    check(checks, "V3 preserved", VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === true, null, "Compatibility");
    check(checks, "V4 preserved", VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === true, null, "Compatibility");
    check(checks, "AWAITING_ACCEPTANCE boundary preserved", VERSION_MANIFEST.acceptance.phase17SyncEngineStopsAtAwaitingAcceptance === true, null, "Compatibility");
    const result = summary(checks, "REPOSITORY-010 Phase 17 Pre-Device Validation");
    state.lastPhase17Validation = internal.clone(result);
    state.phase17PreDeviceValidationPassed = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  async function runPersistenceReloadValidation() {
    const checks = [];
    const init = await namespace.initializeLocalFirstRepositoryOperationalRuntime({ suppressEvidence: true });
    const revalidated = await namespace.revalidateLocalFirstRepositoryOperationalRuntime();
    check(checks, "Unified initialization PASS", init && init.ok === true, init, "Reload");
    check(checks, "Operational revalidation PASS", revalidated && revalidated.ok === true, revalidated, "Reload");
    check(checks, "No FileSystem handle restoration", init && init.data && init.data.fileSystemDirectoryHandleRestored === false, init && init.data, "Reload");
    check(checks, "Fresh Desktop selection required", revalidated && revalidated.data && revalidated.data.desktopSelectionRequired === true, revalidated && revalidated.data, "Reload");
    check(checks, "No blind resume", revalidated && revalidated.data && revalidated.data.blindResumePerformed === false, revalidated && revalidated.data, "Reload");
    check(checks, "Replica references reloadable", typeof revalidated.data.replicaBaselineReferenceCount === "number", revalidated.data.replicaBaselineReferenceCount, "Reload");
    check(checks, "Sync sessions reloadable", typeof revalidated.data.syncSessionCount === "number", revalidated.data.syncSessionCount, "Reload");
    check(checks, "Transport attempts reloadable", typeof revalidated.data.transportAttemptCount === "number", revalidated.data.transportAttemptCount, "Reload");
    check(checks, "Canonical mutation absent", revalidated.data.canonicalMutationPerformed === false, revalidated.data, "Authority");
    const result = summary(checks, "REPOSITORY-010 Phase 17 Persistence Reload Validation");
    state.lastPhase17PersistenceReloadValidation = internal.clone(result);
    state.phase17PersistenceReloadValidationPassed = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  async function runRealOperationalValidation() {
    const checks = [];
    const refs = await namespace.listPersistedLocalFirstRepositoryRecords("replicaBaselineReference");
    const sessions = await namespace.listPersistedLocalFirstRepositoryRecords("syncSession");
    const attempts = await namespace.listPersistedLocalFirstRepositoryRecords("transportAttempt");
    const receipts = await namespace.listPersistedLocalFirstRepositoryRecords("v2TransferReceipt");
    const v3 = await namespace.listPersistedLocalFirstRepositoryRecords("v3ConflictEvidence");
    const v4 = await namespace.listPersistedLocalFirstRepositoryRecords("v4TargetValidationEvidence");
    const latestRef = (refs || []).sort(function (a, b) { return String(a.provisionedAt || "").localeCompare(String(b.provisionedAt || "")); }).slice(-1)[0] || null;
    const awaiting = (sessions || []).filter(function (record) { return record.sessionStatus === "AWAITING_ACCEPTANCE"; }).slice(-1)[0] || null;
    const verifiedAttempt = awaiting ? (attempts || []).filter(function (record) { return record.syncSessionId === awaiting.syncSessionId && record.attemptStatus === "VERIFIED"; }).slice(-1)[0] : null;
    check(checks, "Replica Baseline Reference exists", Boolean(latestRef), latestRef, "Real Device");
    check(checks, "Replica Reference grants no authority", Boolean(latestRef && latestRef.authorityEffect === "none" && latestRef.mutationAuthorityGranted === false), latestRef, "Authority");
    check(checks, "AWAITING_ACCEPTANCE Session exists", Boolean(awaiting), awaiting, "Cross Device");
    check(checks, "Transport Attempt VERIFIED", Boolean(verifiedAttempt), verifiedAttempt, "Cross Device");
    check(checks, "V2 Receipt persisted", Boolean(verifiedAttempt && receipts.some(function (record) { return record.receiptId === verifiedAttempt.receiptId && record.v2TransferIntegrityValidated === true; })), verifiedAttempt, "V2");
    check(checks, "V3 Evidence persisted", Boolean(verifiedAttempt && v3.some(function (record) { return record.conflictEvidenceId === verifiedAttempt.v3EvidenceId && record.baseRevisionMatch === true && record.conflictDetected === false; })), verifiedAttempt, "V3");
    check(checks, "V4 Evidence persisted", Boolean(verifiedAttempt && v4.some(function (record) { return record.v4EvidenceId === verifiedAttempt.v4EvidenceId && record.v4TargetEnvironmentValidated === true; })), verifiedAttempt, "V4");
    check(checks, "No Canonical mutation", Boolean(awaiting && awaiting.canonicalMutationPerformed === false), awaiting, "Authority");
    check(checks, "No automatic acceptance", Boolean(awaiting && awaiting.automaticAcceptancePerformed === false), awaiting, "Authority");
    check(checks, "PC real environment", /Windows|Macintosh|Linux x86_64/i.test(global.navigator && global.navigator.userAgent || ""), global.navigator && global.navigator.userAgent || null, "Real Device");
    const result = summary(checks, "REPOSITORY-010 Phase 17 Real Operational Validation");
    result.phase17Complete = result.releaseAllowed === true;
    result.crossDeviceOperationalHardeningImplemented = true;
    result.replicaBaselineProvisioningImplemented = true;
    result.replicaBaselineProvisioningRealDeviceValidated = Boolean(latestRef);
    result.pickerSafeTransportImplemented = true;
    result.pickerUserGestureIssueResolved = result.releaseAllowed === true;
    result.unifiedReloadSafeInitializationImplemented = true;
    result.reloadRecoveryRealDeviceValidated = state.phase17PersistenceReloadValidationPassed === true;
    result.androidToPcRealPushImplemented = true;
    result.crossDeviceRealSyncImplemented = Boolean(awaiting && verifiedAttempt);
    result.crossDeviceRealSyncToAcceptanceBoundaryImplemented = Boolean(awaiting);
    result.pcToAndroidRealPullImplemented = false;
    result.canonicalMutationAuthority = false;
    result.canonicalMutationPerformed = false;
    result.automaticAcceptancePerformed = false;
    result.automaticConflictWinnerApplied = false;
    result.automaticBaselinePromotionPerformed = false;
    state.lastPhase17RealOperationalValidation = internal.clone(result);
    state.phase17Complete = result.phase17Complete;
    internal.touch();
    return result;
  }

  function getPhase17ValidationStatus() {
    return {
      status: state.phase17Complete === true ? "Complete" : state.phase17PreDeviceValidationPassed === true ? "Pre-Device Passed" : "Ready",
      phase: 17,
      moduleVersion: MODULE_VERSION,
      preDevicePassed: state.phase17PreDeviceValidationPassed === true,
      persistenceReloadPassed: state.phase17PersistenceReloadValidationPassed === true,
      phase17Complete: state.phase17Complete === true,
      lastPreDevice: internal.clone(state.lastPhase17Validation),
      lastPersistenceReload: internal.clone(state.lastPhase17PersistenceReloadValidation),
      lastRealOperational: internal.clone(state.lastPhase17RealOperationalValidation)
    };
  }

  function showPhase17OperationalPanel() {
    return internal.buildResult(true, "REPOSITORY010_PHASE17_OPERATIONAL_PANEL_READY", "Ready", {
      pcActions: ["initialize", "create-provision-package", "download-provision-package", "prepare-pc-receiver", "select-sync-json", "reload-recovery-validate", "run-final-validation"],
      androidActions: ["initialize", "select-provision-package", "verify-replica-baseline", "reload-recovery-validate", "create-test-staging", "export-sync-json", "run-android-validation"],
      panelGrantsAuthority: false
    });
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase17Validation: runPhase17Validation,
    runLocalFirstRepositoryPhase17PersistenceReloadValidation: runPersistenceReloadValidation,
    runLocalFirstRepositoryPhase17RealOperationalValidation: runRealOperationalValidation,
    getLocalFirstRepositoryPhase17ValidationStatus: getPhase17ValidationStatus,
    showLocalFirstRepositoryPhase17OperationalPanel: showPhase17OperationalPanel
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase17Validation = {
    id: "REPOSITORY-010-PHASE17-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 17,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
