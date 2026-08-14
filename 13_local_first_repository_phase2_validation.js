/* ============================================================
   FILE: 13_local_first_repository_phase2_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.2.0 / Module: Phase 2 Validation 1.0.2
   Phase 2: Android Replica Persistence / IndexedDB Adapter
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 2 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase2Validation");

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: group || "Phase 2", severity: severity || "High" });
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

  function fixtures(prefix) {
    const p = prefix || "PHASE2";
    return {
      node: { projectId: "AI-PROMPT-OS-MAIN", repositoryId: "AI-PROMPT-OS-REPOSITORY", nodeId: "REPOSITORY010-" + p + "-NODE", nodeType: "replica" },
      revision: { revisionId: "REPOSITORY010-" + p + "-REVISION", baseRevisionId: "REPOSITORY010-BASE", parentRevisionId: "REPOSITORY010-BASE", sourceNodeId: "REPOSITORY010-" + p + "-NODE" },
      integrity: { integrityRecordId: "REPOSITORY010-" + p + "-INTEGRITY", revisionId: "REPOSITORY010-" + p + "-REVISION", fileHashes: { "index.html": "a".repeat(64) }, manifestHash: "b".repeat(64), scriptSetHash: "c".repeat(64), contentHash: "d".repeat(64), repositoryStateHash: "e".repeat(64), integrityStatus: "verified" },
      state: { stateRecordId: "REPOSITORY010-" + p + "-STATE", repositoryId: "AI-PROMPT-OS-REPOSITORY", nodeId: "REPOSITORY010-" + p + "-NODE", revisionId: "REPOSITORY010-" + p + "-REVISION", state: "staged", integrityStatus: "verified" },
      gate: { gateId: "REPOSITORY010-" + p + "-GATE", capabilityId: "REPOSITORY-010-PHASE2-PERSISTENCE", gateType: "android-real-validation", applicability: "required", result: "passed" }
    };
  }

  function materialize(f) {
    return {
      nodeIdentity: namespace.createRepositoryNodeIdentity(f.node).data.record,
      revision: namespace.createRepositoryRevision(f.revision).data.record,
      integrityRecord: namespace.createRepositoryIntegrityRecord(f.integrity).data.record,
      stateRecord: namespace.createRepositoryStateRecord(f.state).data.record,
      validationGate: namespace.createValidationGateDescriptor(f.gate).data.record
    };
  }

  function recordId(recordType, record) {
    return recordType === "nodeIdentity" ? record.nodeId :
      recordType === "revision" ? record.revisionId :
      recordType === "integrityRecord" ? record.integrityRecordId :
      recordType === "stateRecord" ? record.stateRecordId : record.gateId;
  }

  async function validatePersistenceRecords(records, c) {
    const check = c.check;
    for (const recordType of Object.keys(records)) {
      const record = records[recordType];
      const persisted = await namespace.persistLocalFirstRepositoryRecord(recordType, record);
      check("Persist succeeds: " + recordType, persisted.ok === true && persisted.data.readBackVerified === true, persisted.code, "Persistence", "Critical");
      const defId = recordId(recordType, record);
      const readBack = await namespace.getPersistedLocalFirstRepositoryRecord(recordType, defId);
      check("Read-back exists: " + recordType, Boolean(readBack), defId, "Persistence", "Critical");
      const listed = await namespace.listPersistedLocalFirstRepositoryRecords(recordType);
      check("List contains record: " + recordType, Array.isArray(listed) && listed.some(function item(x) {
        return recordId(recordType, x) === defId;
      }), listed.length, "Persistence", "High");
    }
  }

  async function cleanupPersistenceFixtures(records, c) {
    const check = c.check;
    for (const recordType of Object.keys(records)) {
      const defId = recordId(recordType, records[recordType]);
      try {
        const deleted = await namespace.deletePersistedLocalFirstRepositoryRecord(recordType, defId);
        check("Fixture delete succeeds: " + recordType, Boolean(deleted && deleted.ok === true && deleted.data && deleted.data.exactIdDelete === true && deleted.data.broadClearPerformed === false), deleted && deleted.code, "Fixture Cleanup", "Critical");
        const readBack = await namespace.getPersistedLocalFirstRepositoryRecord(recordType, defId);
        check("Cleanup read-back confirms absence: " + recordType, readBack === null, defId, "Fixture Cleanup", "Critical");
      } catch (error) {
        check("Fixture delete succeeds: " + recordType, false, error && error.message ? error.message : String(error), "Fixture Cleanup", "Critical");
        check("Cleanup read-back confirms absence: " + recordType, false, defId, "Fixture Cleanup", "Critical");
      }
    }
  }

  async function runLocalFirstRepositoryPhase2Validation() {
    const phase1 = typeof namespace.runLocalFirstRepositoryPhase1Validation === "function" ? namespace.runLocalFirstRepositoryPhase1Validation() : null;
    const c = collector();
    const check = c.check;

    check("Phase 1 pre-device regression passes", Boolean(phase1 && phase1.failed === 0 && phase1.criticalFailed === 0), phase1 && phase1.status, "Regression", "Critical");
    const versionParts = String(VERSION_MANIFEST.release.version || "0.0.0").split(".").map(Number);
    const phase2BaselineOrLater = versionParts[0] === 1 && (versionParts[1] > 1 || (versionParts[1] === 1 && versionParts[2] >= 1));
    check("Release includes Phase 2 baseline or later", phase2BaselineOrLater, VERSION_MANIFEST.release.version, "Version", "Critical");
    check("Phase 2 Android Replica Persistence capability remains implemented", VERSION_MANIFEST.implementation.phase >= 2 && VERSION_MANIFEST.implementation.persistenceImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");
    check("Direct Repository Mutation remains disabled", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Safety", "Critical");
    check("Automatic Conflict Winner remains disabled", VERSION_MANIFEST.safety.automaticConflictWinnerAllowed === false, VERSION_MANIFEST.safety.automaticConflictWinnerAllowed, "Safety", "Critical");
    check("Persistence API is available", typeof namespace.persistLocalFirstRepositoryRecord === "function", typeof namespace.persistLocalFirstRepositoryRecord, "API", "Critical");
    check("Exact-ID delete API is available", typeof namespace.deletePersistedLocalFirstRepositoryRecord === "function", typeof namespace.deletePersistedLocalFirstRepositoryRecord, "API", "Critical");
    check("Memory persistence adapter is available", typeof namespace.createMemoryLocalFirstRepositoryPersistenceAdapter === "function", typeof namespace.createMemoryLocalFirstRepositoryPersistenceAdapter, "API", "Critical");
    const metadataStatus = typeof namespace.getMetadataModelStatus === "function" ? namespace.getMetadataModelStatus() : null;
    check("Metadata Status reflects implemented Persistence", Boolean(metadataStatus && metadataStatus.persistenceImplemented === true && metadataStatus.syncEngineImplemented === false), metadataStatus, "Metadata Status", "Critical");

    const memory = namespace.createMemoryLocalFirstRepositoryPersistenceAdapter();
    const setResult = namespace.setLocalFirstRepositoryPersistenceAdapter(memory);
    check("Memory persistence adapter can be selected", setResult.ok === true, setResult.code, "Adapter", "Critical");
    const initialized = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Memory persistence initializes", initialized.ok === true, initialized.code, "Adapter", "Critical");

    const records = materialize(fixtures("PREDEVICE"));
    await validatePersistenceRecords(records, c);
    check("Staged state retains no Authority", records.stateRecord.state === "staged" && records.stateRecord.authorityEffect === "none", records.stateRecord, "Authority", "Critical");
    check("Validation Gate grants no Mutation Authority", records.validationGate.mutationAuthorityGranted === false, records.validationGate, "Authority", "Critical");
    await cleanupPersistenceFixtures(records, c);

    const status = namespace.getLocalFirstRepositoryPersistenceStatus();
    check("Persistence role matches Android Replica / Offline Staging", /replica/i.test(status.role), status.role, "Scope", "Critical");
    check("Canonical Mutation Authority remains false", status.canonicalMutationAuthority === false, status.canonicalMutationAuthority, "Authority", "Critical");
    check("Read-back verification is required", status.readBackVerificationRequired === true, status.readBackVerificationRequired, "Integrity", "Critical");
    check("Phase 2 Android gate is required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet.androidRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 2 PC gate is not required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 2 Cross-device gate is not required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet, "Validation Authority", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const result = summarize(c.checks, "REPOSITORY-010-PHASE2-VALIDATION", "REPOSITORY-010 Phase 2 Pre-Device Validation PASS", "REPOSITORY-010 Phase 2 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet),
      releaseAllowed: false,
      phase2Complete: false,
      androidRealDeviceRequired: true,
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false
    });
    internal.markPhase2PreDeviceValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase2AndroidValidation() {
    const pre = await runLocalFirstRepositoryPhase2Validation();
    const phase1Android = typeof namespace.runLocalFirstRepositoryPhase1AndroidValidation === "function" ? namespace.runLocalFirstRepositoryPhase1AndroidValidation() : null;
    const c = collector();
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "";
    const androidRealDevice = /Android/i.test(userAgent);

    check("Phase 2 pre-device validation passes", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Pre-Device", "Critical");
    check("Phase 1 Android regression passes", Boolean(phase1Android && phase1Android.failed === 0 && phase1Android.criticalFailed === 0 && phase1Android.androidRealDevice === true), phase1Android && phase1Android.status, "Regression", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android IndexedDB", "Critical");
    check("PC Real Validation is not required by Phase 2", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 2", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Native IndexedDB persistence initializes", init.ok === true, init.code, "Android IndexedDB", "Critical");

    const records = materialize(fixtures("ANDROID-REAL"));
    await validatePersistenceRecords(records, c);
    const persistedState = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", records.stateRecord.stateRecordId);
    check("Android IndexedDB persists staged Repository State", Boolean(persistedState && persistedState.state === "staged"), persistedState && persistedState.state, "Android IndexedDB", "Critical");
    check("Persisted staged State grants no Authority", Boolean(persistedState && persistedState.authorityEffect === "none"), persistedState && persistedState.authorityEffect, "Authority", "Critical");
    await cleanupPersistenceFixtures(records, c);

    const status = namespace.getLocalFirstRepositoryPersistenceStatus();
    check("Native adapter is Android IndexedDB adapter", status.adapterId === "REPOSITORY-010-ANDROID-INDEXEDDB-REPLICA-PERSISTENCE", status.adapterId, "Android IndexedDB", "Critical");
    check("Persistence is Verified after read-back", status.status === "Verified", status.status, "Integrity", "Critical");
    check("Sync Engine remains unimplemented", status.syncEngineImplemented === false, status.syncEngineImplemented, "Safety", "Critical");
    check("Canonical Mutation Authority remains false", status.canonicalMutationAuthority === false, status.canonicalMutationAuthority, "Safety", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE2-ANDROID-VALIDATION", "REPOSITORY-010 Phase 2 Android Real Device Validation PASS", "REPOSITORY-010 Phase 2 Android Real Device Validation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet),
      releaseAllowed: c.checks.every(function all(item) { return item.passed; }),
      phase2Complete: c.checks.every(function all(item) { return item.passed; }),
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false,
      persistenceStatus: status
    });
    internal.markPhase2AndroidValidation(result);
    return result;
  }

  function getLocalFirstRepositoryPhase2ValidationStatus() {
    return {
      preDevice: internal.clone(state.lastPhase2Validation),
      androidRealDevice: internal.clone(state.lastPhase2AndroidValidation),
      phase2PreDeviceValidationPassed: state.phase2PreDeviceValidationPassed === true,
      androidPhase2ValidationPassed: state.androidPhase2ValidationPassed === true,
      phase2Complete: state.phase2PreDeviceValidationPassed === true && state.androidPhase2ValidationPassed === true,
      releaseAllowed: state.phase2PreDeviceValidationPassed === true && state.androidPhase2ValidationPassed === true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet)
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase2Validation: runLocalFirstRepositoryPhase2Validation,
    runLocalFirstRepositoryPhase2AndroidValidation: runLocalFirstRepositoryPhase2AndroidValidation,
    getLocalFirstRepositoryPhase2ValidationStatus: getLocalFirstRepositoryPhase2ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase2Validation = {
    id: "REPOSITORY-010-PHASE2-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    androidRealDeviceRequired: true,
    pcRealValidationRequired: false,
    crossDeviceRealValidationRequired: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase2Validation = runLocalFirstRepositoryPhase2Validation;
  global.runLocalFirstRepositoryPhase2AndroidValidation = runLocalFirstRepositoryPhase2AndroidValidation;
  global.getLocalFirstRepositoryPhase2ValidationStatus = getLocalFirstRepositoryPhase2ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
