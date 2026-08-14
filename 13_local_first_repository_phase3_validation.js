/* ============================================================
   FILE: 13_local_first_repository_phase3_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.2.0 / Module: Phase 3 Validation 1.0.0
   Phase 3: Offline Staging Lifecycle / Full-Reload Recovery
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 3 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase3Validation");
  const RELOAD_IDS = Object.freeze({
    stagingId: "REPOSITORY010-PHASE3-ANDROID-RELOAD-STAGING",
    nodeId: "REPOSITORY010-PHASE3-ANDROID-RELOAD-NODE",
    revisionId: "REPOSITORY010-PHASE3-ANDROID-RELOAD-REVISION",
    integrityRecordId: "REPOSITORY010-PHASE3-ANDROID-RELOAD-INTEGRITY",
    stateRecordId: "REPOSITORY010-PHASE3-ANDROID-RELOAD-STATE"
  });

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: group || "Phase 3", severity: severity || "High" });
      }
    };
  }

  function summarize(checks, idPrefix, passStatus, failStatus, extras) {
    const passed = checks.filter(function passed(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(idPrefix),
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 10000) / 100 : 100,
      criticalFailed: criticalFailed,
      status: failed === 0 ? passStatus : failStatus,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  function fixture(prefix, fixedIds) {
    const p = String(prefix || "PHASE3");
    const ids = fixedIds || {};
    const nodeId = ids.nodeId || ("REPOSITORY010-" + p + "-NODE");
    const revisionId = ids.revisionId || ("REPOSITORY010-" + p + "-REVISION");
    const integrityRecordId = ids.integrityRecordId || ("REPOSITORY010-" + p + "-INTEGRITY");
    const stateRecordId = ids.stateRecordId || ("REPOSITORY010-" + p + "-STATE");
    const stagingId = ids.stagingId || ("REPOSITORY010-" + p + "-STAGING");
    return {
      nodeIdentity: {
        projectId: "AI-PROMPT-OS-MAIN",
        repositoryId: "AI-PROMPT-OS-REPOSITORY",
        nodeId: nodeId,
        nodeType: "replica"
      },
      revision: {
        revisionId: revisionId,
        baseRevisionId: "REPOSITORY010-PHASE3-BASE",
        parentRevisionId: "REPOSITORY010-PHASE3-BASE",
        sourceNodeId: nodeId
      },
      integrityRecord: {
        integrityRecordId: integrityRecordId,
        revisionId: revisionId,
        fileHashes: { "index.html": "1".repeat(64) },
        manifestHash: "2".repeat(64),
        scriptSetHash: "3".repeat(64),
        contentHash: "4".repeat(64),
        repositoryStateHash: "5".repeat(64),
        integrityStatus: "verified"
      },
      stateRecordId: stateRecordId,
      stagingDescriptor: {
        stagingId: stagingId
      }
    };
  }

  async function deleteFixtureExact(f) {
    const targets = [
      ["offlineStaging", f.stagingDescriptor.stagingId],
      ["stateRecord", f.stateRecordId],
      ["integrityRecord", f.integrityRecord.integrityRecordId],
      ["revision", f.revision.revisionId],
      ["nodeIdentity", f.nodeIdentity.nodeId]
    ];
    const results = [];
    for (const target of targets) {
      try {
        const existing = await namespace.getPersistedLocalFirstRepositoryRecord(target[0], target[1]);
        if (!existing) {
          results.push({ recordType: target[0], recordId: target[1], deleted: true, alreadyAbsent: true });
          continue;
        }
        const deletion = await namespace.deletePersistedLocalFirstRepositoryRecord(target[0], target[1]);
        const runtimeMap = target[0] === "offlineStaging" ? state.offlineStagingDescriptors :
          target[0] === "stateRecord" ? state.stateRecords :
          target[0] === "integrityRecord" ? state.integrityRecords :
          target[0] === "revision" ? state.revisions :
          target[0] === "nodeIdentity" ? state.nodeIdentities : null;
        if (runtimeMap instanceof Map) runtimeMap.delete(target[1]);
        results.push({ recordType: target[0], recordId: target[1], deleted: Boolean(deletion && deletion.ok === true) });
      } catch (error) {
        results.push({ recordType: target[0], recordId: target[1], deleted: false, error: error && error.message ? error.message : String(error) });
      }
    }
    return results;
  }

  async function runLocalFirstRepositoryPhase3Validation() {
    const phase2 = typeof namespace.runLocalFirstRepositoryPhase2Validation === "function" ? await namespace.runLocalFirstRepositoryPhase2Validation() : null;
    const c = collector();
    const check = c.check;

    check("Phase 2 pre-device regression passes", Boolean(phase2 && phase2.failed === 0 && phase2.criticalFailed === 0), phase2 && phase2.status, "Regression", "Critical");
    check("Release version is 1.2.0", VERSION_MANIFEST.release.version === "1.2.0", VERSION_MANIFEST.release.version, "Version", "Critical");
    check("Phase 3 scope is Offline Staging / Full-Reload Recovery", VERSION_MANIFEST.implementation.phase === 3 && VERSION_MANIFEST.implementation.offlineStagingImplemented === true && VERSION_MANIFEST.implementation.fullReloadRecoveryImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");
    check("Canonical Mutation remains disabled", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false && VERSION_MANIFEST.safety.offlineCanonicalFinalizationAllowed === false, VERSION_MANIFEST.safety, "Safety", "Critical");
    check("Offline staging API is available", typeof namespace.stageOfflineRepositoryWork === "function", typeof namespace.stageOfflineRepositoryWork, "API", "Critical");
    check("Offline restore API is available", typeof namespace.restoreOfflineStagedRepositoryWork === "function", typeof namespace.restoreOfflineStagedRepositoryWork, "API", "Critical");
    check("Offline staging list API is available", typeof namespace.listOfflineStagedRepositoryWork === "function", typeof namespace.listOfflineStagedRepositoryWork, "API", "Critical");
    check("Offline Staging Descriptor contract is registered", Boolean(namespace.getContractDefinition("offlineStagingDescriptor")), namespace.getContractDefinition("offlineStagingDescriptor"), "Contract", "Critical");

    const memory = namespace.createMemoryLocalFirstRepositoryPersistenceAdapter();
    const set = namespace.setLocalFirstRepositoryPersistenceAdapter(memory);
    check("Memory adapter selected", set.ok === true, set.code, "Adapter", "Critical");
    const initialized = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Memory persistence initializes", initialized.ok === true, initialized.code, "Adapter", "Critical");

    const f = fixture("PHASE3-PREDEVICE");
    const staged = await namespace.stageOfflineRepositoryWork(f);
    check("Validated Replica can be staged", Boolean(staged && staged.ok === true && staged.status === "Staged"), staged && staged.code, "Offline Staging", "Critical");
    check("Staged work grants no Authority", Boolean(staged && staged.data && staged.data.authorityEffect === "none" && staged.data.canonicalMutationPerformed === false), staged && staged.data, "Authority", "Critical");
    check("Staged work does not create Sync Candidate", Boolean(staged && staged.data && staged.data.syncCandidateCreated === false), staged && staged.data && staged.data.syncCandidateCreated, "Safety", "Critical");

    const listed = await namespace.listOfflineStagedRepositoryWork();
    check("Persisted staging descriptor is listed", Array.isArray(listed) && listed.some(function item(x) { return x.stagingId === f.stagingDescriptor.stagingId; }), listed, "Offline Staging", "Critical");

    const restored = await namespace.restoreOfflineStagedRepositoryWork(f.stagingDescriptor.stagingId, { expectedBaseRevisionId: f.revision.baseRevisionId });
    check("Valid staged work restores", Boolean(restored && restored.ok === true && restored.data && restored.data.restoreStatus === "restored"), restored && restored.code, "Recovery", "Critical");
    check("Restored Repository State remains staged", Boolean(restored && restored.data && restored.data.repositoryState === "staged"), restored && restored.data && restored.data.repositoryState, "State", "Critical");
    check("Restore grants no Authority", Boolean(restored && restored.data && restored.data.authorityEffect === "none" && restored.data.canonicalMutationPerformed === false), restored && restored.data, "Authority", "Critical");

    const stale = await namespace.restoreOfflineStagedRepositoryWork(f.stagingDescriptor.stagingId, { expectedBaseRevisionId: "REPOSITORY010-DIFFERENT-BASE" });
    check("Base Revision mismatch is detected as stale", Boolean(stale && stale.ok === false && stale.data && stale.data.restoreStatus === "stale"), stale && stale.data, "Recovery", "Critical");
    check("Stale restore does not create Sync Candidate", Boolean(stale && stale.data && stale.data.syncCandidateCreated === false), stale && stale.data && stale.data.syncCandidateCreated, "Safety", "Critical");

    const rollbackMemory = namespace.createMemoryLocalFirstRepositoryPersistenceAdapter();
    let putCount = 0;
    const failingAdapter = {
      adapterId: "REPOSITORY-010-PHASE3-ROLLBACK-FIXTURE",
      role: "deterministic-validation-replica",
      readMode: "validated-record-read-write-no-canonical-authority",
      async put(recordType, record) {
        putCount += 1;
        if (recordType === "integrityRecord") throw new Error("intentional-phase3-integrity-write-failure");
        return rollbackMemory.put(recordType, record);
      },
      async get(recordType, id) { return rollbackMemory.get(recordType, id); },
      async list(recordType) { return rollbackMemory.list(recordType); },
      async delete(recordType, id) { return rollbackMemory.delete(recordType, id); }
    };
    const setFailing = namespace.setLocalFirstRepositoryPersistenceAdapter(failingAdapter);
    check("Controlled failing adapter selected", setFailing.ok === true, setFailing.code, "Rollback", "High");
    await namespace.initializeLocalFirstRepositoryPersistence();
    const rollbackFixture = fixture("PHASE3-ROLLBACK");
    const rolledBack = await namespace.stageOfflineRepositoryWork(rollbackFixture);
    check("Partial staging failure rolls back", Boolean(rolledBack && rolledBack.ok === false && rolledBack.status === "Rolled Back"), rolledBack && rolledBack.code, "Rollback", "Critical");
    const rollbackNode = await failingAdapter.get("nodeIdentity", rollbackFixture.nodeIdentity.nodeId);
    const rollbackRevision = await failingAdapter.get("revision", rollbackFixture.revision.revisionId);
    check("Compensation removes newly written Node Identity", rollbackNode === null, rollbackNode, "Rollback", "Critical");
    check("Compensation removes newly written Revision", rollbackRevision === null, rollbackRevision, "Rollback", "Critical");
    check("Rollback never reaches Canonical Mutation", Boolean(rolledBack && rolledBack.data && rolledBack.data.canonicalMutationPerformed === false), rolledBack && rolledBack.data, "Authority", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(memory);
    await deleteFixtureExact(f);
    namespace.setLocalFirstRepositoryPersistenceAdapter(null);

    const phase3Status = namespace.getOfflineStagingStatus();
    check("Phase 3 status keeps Sync Engine disabled", phase3Status.syncEngineImplemented === false, phase3Status.syncEngineImplemented, "Safety", "Critical");
    check("Phase 3 status keeps Canonical Authority false", phase3Status.canonicalMutationAuthority === false, phase3Status.canonicalMutationAuthority, "Authority", "Critical");
    check("Phase 3 Android gate is required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet.androidRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 3 PC gate is not required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 3 Cross-device gate is not required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet, "Validation Authority", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE3-VALIDATION", "REPOSITORY-010 Phase 3 Pre-Device Validation PASS", "REPOSITORY-010 Phase 3 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet),
      releaseAllowed: false,
      phase3Complete: false,
      fullReloadValidationRequired: true,
      androidReloadPreparationRequired: true,
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false
    });
    internal.markPhase3PreDeviceValidation(result);
    return result;
  }

  async function prepareLocalFirstRepositoryPhase3AndroidReloadValidation() {
    const pre = await runLocalFirstRepositoryPhase3Validation();
    const c = collector();
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "";
    const androidRealDevice = /Android/i.test(userAgent);

    check("Phase 3 pre-device validation passes", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Pre-Device", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android IndexedDB", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Native IndexedDB persistence initializes", init.ok === true, init.code, "Android IndexedDB", "Critical");

    const f = fixture("PHASE3-ANDROID-RELOAD", RELOAD_IDS);
    const cleanupBefore = await deleteFixtureExact(f);
    check("Previous Phase 3 reload fixture is absent or cleaned", cleanupBefore.every(function all(x) { return x.deleted === true; }), cleanupBefore, "Preparation", "Critical");

    const staged = await namespace.stageOfflineRepositoryWork(f);
    check("Reload fixture is staged in native IndexedDB", Boolean(staged && staged.ok === true), staged && staged.code, "Preparation", "Critical");
    const descriptor = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", RELOAD_IDS.stagingId);
    check("Reload descriptor read-back succeeds", Boolean(descriptor && descriptor.stagingId === RELOAD_IDS.stagingId), descriptor, "Preparation", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE3-ANDROID-RELOAD-PREP", "REPOSITORY-010 Phase 3 Android Reload Preparation PASS", "REPOSITORY-010 Phase 3 Android Reload Preparation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      reloadRequired: true,
      doNotRerunPreparationAfterReload: true,
      reloadFixture: internal.clone(RELOAD_IDS),
      reloadRecordCreatedAt: descriptor && descriptor.createdAt || null,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet),
      releaseAllowed: false,
      phase3Complete: false
    });
    internal.markPhase3AndroidReloadPreparation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase3AndroidValidation() {
    const pre = await runLocalFirstRepositoryPhase3Validation();
    const phase2Android = typeof namespace.runLocalFirstRepositoryPhase2AndroidValidation === "function" ? await namespace.runLocalFirstRepositoryPhase2AndroidValidation() : null;
    const c = collector();
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "";
    const androidRealDevice = /Android/i.test(userAgent);

    check("Phase 3 pre-device validation passes", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Pre-Device", "Critical");
    check("Phase 2 Android regression passes", Boolean(phase2Android && phase2Android.failed === 0 && phase2Android.criticalFailed === 0 && phase2Android.androidRealDevice === true), phase2Android && phase2Android.status, "Regression", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android IndexedDB", "Critical");
    check("PC Real Validation is not required by Phase 3", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 3", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Native IndexedDB persistence initializes", init.ok === true, init.code, "Android IndexedDB", "Critical");

    const descriptor = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", RELOAD_IDS.stagingId);
    check("Phase 3 reload descriptor survives real reload", Boolean(descriptor), descriptor && descriptor.stagingId, "Full Reload", "Critical");
    const moduleLoadedAt = namespace.modules.phase3Validation && namespace.modules.phase3Validation.loadedAt || null;
    const fullReloadProved = Boolean(descriptor && descriptor.createdAt && moduleLoadedAt && Date.parse(moduleLoadedAt) > Date.parse(descriptor.createdAt));
    check("Module load occurred after persisted staging record", fullReloadProved, { descriptorCreatedAt: descriptor && descriptor.createdAt, moduleLoadedAt: moduleLoadedAt }, "Full Reload", "Critical");

    const restored = await namespace.restoreOfflineStagedRepositoryWork(RELOAD_IDS.stagingId, { expectedBaseRevisionId: "REPOSITORY010-PHASE3-BASE" });
    check("Persisted staged work restores after full reload", Boolean(restored && restored.ok === true && restored.data && restored.data.restoreStatus === "restored"), restored && restored.code, "Recovery", "Critical");
    check("Restored state remains staged", Boolean(restored && restored.data && restored.data.repositoryState === "staged"), restored && restored.data && restored.data.repositoryState, "State", "Critical");
    check("Restored work grants no Authority", Boolean(restored && restored.data && restored.data.authorityEffect === "none" && restored.data.canonicalMutationPerformed === false), restored && restored.data, "Authority", "Critical");
    check("Restored work creates no Sync Candidate", Boolean(restored && restored.data && restored.data.syncCandidateCreated === false), restored && restored.data && restored.data.syncCandidateCreated, "Safety", "Critical");

    const restoredRuntimeState = namespace.getRepositoryStateRecord(RELOAD_IDS.stateRecordId);
    const restoredRuntimeRevision = namespace.getRepositoryRevision(RELOAD_IDS.revisionId);
    check("Runtime State is hydrated from IndexedDB", Boolean(restoredRuntimeState && restoredRuntimeState.state === "staged"), restoredRuntimeState, "Recovery", "Critical");
    check("Runtime Revision is hydrated from IndexedDB", Boolean(restoredRuntimeRevision && restoredRuntimeRevision.baseRevisionId === "REPOSITORY010-PHASE3-BASE"), restoredRuntimeRevision, "Recovery", "Critical");

    const stale = await namespace.restoreOfflineStagedRepositoryWork(RELOAD_IDS.stagingId, { expectedBaseRevisionId: "REPOSITORY010-PHASE3-OTHER-BASE" });
    check("Base mismatch is stale after reload", Boolean(stale && stale.ok === false && stale.data && stale.data.restoreStatus === "stale"), stale && stale.data, "Stale Detection", "Critical");
    check("Stale detection does not mutate Canonical", Boolean(stale && stale.data && stale.data.canonicalMutationPerformed === false), stale && stale.data, "Authority", "Critical");

    const f = fixture("PHASE3-ANDROID-RELOAD", RELOAD_IDS);
    const cleanup = await deleteFixtureExact(f);
    check("Reload validation fixture cleanup uses exact ids", cleanup.every(function all(x) { return x.deleted === true; }), cleanup, "Fixture Cleanup", "Critical");
    const descriptorAfter = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", RELOAD_IDS.stagingId);
    const stateAfter = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", RELOAD_IDS.stateRecordId);
    check("Reload descriptor is absent after cleanup", descriptorAfter === null, descriptorAfter, "Fixture Cleanup", "Critical");
    check("Reload state record is absent after cleanup", stateAfter === null, stateAfter, "Fixture Cleanup", "Critical");

    const stagingStatus = namespace.getOfflineStagingStatus();
    check("Sync Engine remains unimplemented", stagingStatus.syncEngineImplemented === false, stagingStatus.syncEngineImplemented, "Safety", "Critical");
    check("Canonical Mutation Authority remains false", stagingStatus.canonicalMutationAuthority === false, stagingStatus.canonicalMutationAuthority, "Safety", "Critical");
    check("Offline Canonical finalization remains prohibited", stagingStatus.offlineCanonicalFinalizationAllowed === false, stagingStatus.offlineCanonicalFinalizationAllowed, "Safety", "Critical");

    const passedAll = c.checks.every(function all(item) { return item.passed; });
    const result = summarize(c.checks, "REPOSITORY-010-PHASE3-ANDROID-VALIDATION", "REPOSITORY-010 Phase 3 Android Full-Reload Validation PASS", "REPOSITORY-010 Phase 3 Android Full-Reload Validation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      fullReloadValidated: fullReloadProved,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet),
      releaseAllowed: passedAll,
      phase3Complete: passedAll,
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false,
      offlineStagingStatus: stagingStatus
    });
    internal.markPhase3AndroidValidation(result);
    return result;
  }

  function getLocalFirstRepositoryPhase3ValidationStatus() {
    return {
      preDevice: internal.clone(state.lastPhase3Validation),
      androidReloadPreparation: internal.clone(state.lastPhase3AndroidReloadPreparation),
      androidRealDevice: internal.clone(state.lastPhase3AndroidValidation),
      phase3PreDeviceValidationPassed: state.phase3PreDeviceValidationPassed === true,
      phase3AndroidReloadPrepared: state.phase3AndroidReloadPrepared === true,
      androidPhase3ValidationPassed: state.androidPhase3ValidationPassed === true,
      phase3Complete: state.phase3PreDeviceValidationPassed === true && state.androidPhase3ValidationPassed === true,
      releaseAllowed: state.phase3PreDeviceValidationPassed === true && state.androidPhase3ValidationPassed === true,
      fullReloadValidationRequired: true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet)
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase3Validation: runLocalFirstRepositoryPhase3Validation,
    prepareLocalFirstRepositoryPhase3AndroidReloadValidation: prepareLocalFirstRepositoryPhase3AndroidReloadValidation,
    runLocalFirstRepositoryPhase3AndroidValidation: runLocalFirstRepositoryPhase3AndroidValidation,
    getLocalFirstRepositoryPhase3ValidationStatus: getLocalFirstRepositoryPhase3ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase3Validation = {
    id: "REPOSITORY-010-PHASE3-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    fullReloadValidationRequired: true,
    androidRealDeviceRequired: true,
    pcRealValidationRequired: false,
    crossDeviceRealValidationRequired: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase3Validation = runLocalFirstRepositoryPhase3Validation;
  global.prepareLocalFirstRepositoryPhase3AndroidReloadValidation = prepareLocalFirstRepositoryPhase3AndroidReloadValidation;
  global.runLocalFirstRepositoryPhase3AndroidValidation = runLocalFirstRepositoryPhase3AndroidValidation;
  global.getLocalFirstRepositoryPhase3ValidationStatus = getLocalFirstRepositoryPhase3ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
