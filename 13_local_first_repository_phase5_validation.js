/* ============================================================
   FILE: 13_local_first_repository_phase5_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.4.0 / Module: Phase 5 Validation 1.0.0
   Phase 5: Transfer Package / Integrity Preflight
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 5 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase5Validation");
  const RELOAD_IDS = Object.freeze({
    stagingId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-STAGING",
    nodeId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-NODE",
    revisionId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-REVISION",
    integrityRecordId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-INTEGRITY",
    stagedStateRecordId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-STAGED-STATE",
    syncCandidateId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-CANDIDATE",
    candidateStateRecordId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-CANDIDATE-STATE",
    v1GateId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-V1-GATE",
    transferPackageId: "REPOSITORY010-PHASE5-ANDROID-RELOAD-TRANSFER-PACKAGE"
  });

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: group || "Phase 5", severity: severity || "High" });
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
    const p = String(prefix || "PHASE5");
    const ids = fixedIds || {};
    const nodeId = ids.nodeId || ("REPOSITORY010-" + p + "-NODE");
    const revisionId = ids.revisionId || ("REPOSITORY010-" + p + "-REVISION");
    const integrityRecordId = ids.integrityRecordId || ("REPOSITORY010-" + p + "-INTEGRITY");
    return {
      nodeIdentity: {
        projectId: "AI-PROMPT-OS-MAIN",
        repositoryId: "AI-PROMPT-OS-REPOSITORY",
        nodeId: nodeId,
        nodeType: "replica"
      },
      revision: {
        revisionId: revisionId,
        baseRevisionId: "REPOSITORY010-PHASE5-BASE",
        parentRevisionId: "REPOSITORY010-PHASE5-BASE",
        sourceNodeId: nodeId
      },
      integrityRecord: {
        integrityRecordId: integrityRecordId,
        revisionId: revisionId,
        fileHashes: { "index.html": "b".repeat(64) },
        manifestHash: "c".repeat(64),
        scriptSetHash: "d".repeat(64),
        contentHash: "e".repeat(64),
        repositoryStateHash: "f".repeat(64),
        integrityStatus: "verified"
      },
      stateRecordId: ids.stagedStateRecordId || ("REPOSITORY010-" + p + "-STAGED-STATE"),
      stagingDescriptor: { stagingId: ids.stagingId || ("REPOSITORY010-" + p + "-STAGING") },
      candidate: {
        syncCandidateId: ids.syncCandidateId || ("REPOSITORY010-" + p + "-CANDIDATE"),
        candidateStateRecordId: ids.candidateStateRecordId || ("REPOSITORY010-" + p + "-CANDIDATE-STATE"),
        v1GateId: ids.v1GateId || ("REPOSITORY010-" + p + "-V1-GATE")
      },
      transferPackage: {
        transferPackageId: ids.transferPackageId || ("REPOSITORY010-" + p + "-TRANSFER-PACKAGE")
      }
    };
  }

  function reloadFixture() { return fixture("PHASE5-ANDROID-RELOAD", RELOAD_IDS); }

  function runtimeMapFor(recordType) {
    if (recordType === "transferPackage") return state.transferPackageDescriptors;
    if (recordType === "syncCandidate") return state.syncCandidateDescriptors;
    if (recordType === "offlineStaging") return state.offlineStagingDescriptors;
    if (recordType === "validationGate") return state.validationGates;
    if (recordType === "stateRecord") return state.stateRecords;
    if (recordType === "integrityRecord") return state.integrityRecords;
    if (recordType === "revision") return state.revisions;
    if (recordType === "nodeIdentity") return state.nodeIdentities;
    return null;
  }

  async function deleteFixtureExact(f) {
    const targets = [
      ["transferPackage", f.transferPackage.transferPackageId],
      ["syncCandidate", f.candidate.syncCandidateId],
      ["validationGate", f.candidate.v1GateId],
      ["stateRecord", f.candidate.candidateStateRecordId],
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
          const map = runtimeMapFor(target[0]);
          if (map instanceof Map) map.delete(target[1]);
          results.push({ recordType: target[0], recordId: target[1], deleted: true, alreadyAbsent: true });
          continue;
        }
        const deletion = await namespace.deletePersistedLocalFirstRepositoryRecord(target[0], target[1]);
        const map = runtimeMapFor(target[0]);
        if (map instanceof Map) map.delete(target[1]);
        results.push({ recordType: target[0], recordId: target[1], deleted: Boolean(deletion && deletion.ok === true) });
      } catch (error) {
        results.push({ recordType: target[0], recordId: target[1], deleted: false, error: error && error.message ? error.message : String(error) });
      }
    }
    return results;
  }

  async function stageCandidateAndPackage(f) {
    const staged = await namespace.stageOfflineRepositoryWork({
      nodeIdentity: f.nodeIdentity,
      revision: f.revision,
      integrityRecord: f.integrityRecord,
      stateRecordId: f.stateRecordId,
      stagingDescriptor: f.stagingDescriptor
    });
    if (!staged || staged.ok !== true) return staged;
    const candidate = await namespace.prepareLocalSyncCandidate(f.stagingDescriptor.stagingId, {
      syncCandidateId: f.candidate.syncCandidateId,
      candidateStateRecordId: f.candidate.candidateStateRecordId,
      v1GateId: f.candidate.v1GateId
    });
    if (!candidate || candidate.ok !== true) return candidate;
    return namespace.prepareLocalTransferPackage(f.candidate.syncCandidateId, {
      transferPackageId: f.transferPackage.transferPackageId
    });
  }

  async function runLocalFirstRepositoryPhase5Validation() {
    const phase4 = typeof namespace.runLocalFirstRepositoryPhase4Validation === "function" ? await namespace.runLocalFirstRepositoryPhase4Validation() : null;
    const c = collector();
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;

    check("Phase 4 deterministic regression passes", Boolean(phase4 && phase4.failed === 0 && phase4.criticalFailed === 0), phase4 && phase4.status, "Regression", "Critical");
    check("Prior Phase 4 Android release baseline is recorded", Boolean(prior && Number(prior.phase || 0) >= 4 && prior.androidRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Phase 5 scope is Transfer Package / Integrity Preflight", Number(VERSION_MANIFEST.implementation.phase || 0) >= 5 && VERSION_MANIFEST.implementation.transferPackagePreparationImplemented === true && VERSION_MANIFEST.implementation.v2IntegrityPreflightImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Transfer Package contract is registered", Boolean(namespace.getContractDefinition("transferPackageDescriptor")), namespace.getContractDefinition("transferPackageDescriptor"), "Contract", "Critical");
    check("Transfer Package module is ready", Boolean(namespace.modules.transferPackage && namespace.modules.transferPackage.status === "Ready"), namespace.modules.transferPackage, "Module", "Critical");
    check("Persistence supports transferPackage record type", namespace.getLocalFirstRepositoryPersistenceStatus().recordTypes.indexOf("transferPackage") >= 0, namespace.getLocalFirstRepositoryPersistenceStatus(), "Persistence", "Critical");
    check("V2 actual Transfer remains unimplemented", VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === false && VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation, "Boundary", "Critical");
    check("V3 Base/Conflict remains unimplemented", VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === false, VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented, "Boundary", "Critical");
    check("V4 Target Validation remains unimplemented", VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === false, VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented, "Boundary", "Critical");
    check("V5 Post-Reflection remains unimplemented", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Phase 5 Android gate is required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.androidRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 5 PC gate is not required for preflight-only scope", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 5 Cross-device gate is not required for preflight-only scope", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet, "Validation Authority", "Critical");

    const adapter = namespace.createMemoryLocalFirstRepositoryPersistenceAdapter();
    namespace.setLocalFirstRepositoryPersistenceAdapter(adapter);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Memory persistence initializes", init.ok === true, init.code, "Persistence", "Critical");

    const f = fixture("PHASE5-PREDEVICE");
    await deleteFixtureExact(f);
    const prepared = await stageCandidateAndPackage(f);
    check("Transfer Package prepares from validated Sync Candidate", Boolean(prepared && prepared.ok === true && prepared.code === "REPOSITORY010_TRANSFER_PACKAGE_PREPARED"), prepared && prepared.code, "Transfer Package", "Critical");
    const pkg = await namespace.getPersistedLocalFirstRepositoryRecord("transferPackage", f.transferPackage.transferPackageId);
    check("Transfer Package persists", Boolean(pkg), pkg && pkg.transferPackageId, "Persistence", "Critical");
    check("Transfer Package has SHA-256 package hash", Boolean(pkg && pkg.packageHashAlgorithm === "SHA-256" && /^[0-9a-f]{64}$/i.test(pkg.packageHash)), pkg && pkg.packageHash, "Integrity", "Critical");
    check("Layered integrity snapshot is verified", Boolean(pkg && pkg.integritySnapshot && pkg.integritySnapshot.integrityStatus === "verified" && pkg.integrityPreflightPassed === true), pkg && pkg.integritySnapshot, "Integrity", "Critical");
    check("Transfer Package performs no Transfer", Boolean(pkg && pkg.transferAttempted === false && pkg.transferCompleted === false && pkg.v2TransferIntegrityValidated === false), pkg, "Transfer Boundary", "Critical");
    check("Transfer Package grants no Authority", Boolean(pkg && pkg.syncEngineInvoked === false && pkg.authorityEffect === "none"), pkg, "Authority", "Critical");

    const restored = await namespace.restoreLocalTransferPackage(f.transferPackage.transferPackageId);
    check("Transfer Package hash re-verifies on restore", Boolean(restored && restored.ok === true && restored.data && restored.data.packageHashVerified === true), restored && restored.code, "Integrity", "Critical");
    check("Restore still defers actual V2", Boolean(restored && restored.data && restored.data.v2TransferIntegrityValidated === false && restored.data.actualTransferRequiredForV2 === true), restored && restored.data, "V2 Boundary", "Critical");
    const again = await namespace.prepareLocalTransferPackage(f.candidate.syncCandidateId, { transferPackageId: f.transferPackage.transferPackageId });
    check("Transfer Package preparation is idempotent", Boolean(again && again.ok === true && again.code === "REPOSITORY010_TRANSFER_PACKAGE_ALREADY_PREPARED"), again && again.code, "Idempotency", "Critical");

    const tampered = internal.clone(pkg);
    tampered.transferPackageId = f.transferPackage.transferPackageId + "-TAMPER";
    tampered.integritySnapshot.manifestHash = "0".repeat(64);
    const tamperPersisted = await namespace.persistLocalFirstRepositoryRecord("transferPackage", tampered);
    check("Contract-valid tamper fixture persists for detection test", Boolean(tamperPersisted && tamperPersisted.ok === true), tamperPersisted && tamperPersisted.code, "Tamper Test", "High");
    const tamperRestore = await namespace.restoreLocalTransferPackage(tampered.transferPackageId);
    check("Tampered Transfer Package is detected as corrupted", Boolean(tamperRestore && tamperRestore.ok === false && tamperRestore.status === "Corrupted"), tamperRestore && tamperRestore.code, "Tamper Detection", "Critical");
    await namespace.deletePersistedLocalFirstRepositoryRecord("transferPackage", tampered.transferPackageId);
    state.transferPackageDescriptors.delete(tampered.transferPackageId);
    state.transferPackageStatus = "Prepared";

    const status = namespace.getTransferPackageStatus();
    check("Phase 5 status distinguishes preflight from actual V2", status.v2IntegrityPreflightImplemented === true && status.v2TransferIntegrityValidationImplemented === false && status.transferImplemented === false, status, "Status", "Critical");
    check("Actual V2 explicitly requires PC", status.actualTransferRequiresPC === true && status.actualV2RequiresCrossDeviceRealValidation === true, status, "Device Boundary", "Critical");
    check("Sync Engine remains unimplemented", status.syncEngineImplemented === false, status.syncEngineImplemented, "Safety", "Critical");
    check("Canonical Mutation Authority remains false", status.canonicalMutationAuthority === false, status.canonicalMutationAuthority, "Safety", "Critical");

    const cleanup = await deleteFixtureExact(f);
    check("Pre-device fixture cleanup uses exact ids", cleanup.every(function all(item) { return item.deleted === true; }), cleanup, "Fixture Cleanup", "Critical");
    namespace.setLocalFirstRepositoryPersistenceAdapter(null);

    const result = summarize(c.checks, "REPOSITORY-010-PHASE5-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 5 Pre-Device Validation PASS", "REPOSITORY-010 Phase 5 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet),
      releaseAllowed: false,
      phase5Complete: false,
      actualV2TransferImplemented: false,
      pcRequiredForActualV2: true
    });
    internal.markPhase5PreDeviceValidation(result);
    return result;
  }

  async function prepareLocalFirstRepositoryPhase5AndroidReloadValidation() {
    const pre = await runLocalFirstRepositoryPhase5Validation();
    const c = collector();
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const androidRealDevice = /Android/i.test(userAgent);

    check("Phase 5 pre-device validation passes", Boolean(pre && pre.failed === 0 && pre.criticalFailed === 0), pre && pre.status, "Pre-Device", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android IndexedDB", "Critical");
    check("PC Real Validation is not required by Phase 5 preflight", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 5 preflight", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Native IndexedDB persistence initializes", init.ok === true, init.code, "Android IndexedDB", "Critical");

    const f = reloadFixture();
    const cleanup = await deleteFixtureExact(f);
    check("Previous Phase 5 reload fixture is absent or cleaned", cleanup.every(function all(item) { return item.deleted === true; }), cleanup, "Preparation", "Critical");
    const prepared = await stageCandidateAndPackage(f);
    check("Reload Transfer Package is prepared", Boolean(prepared && prepared.ok === true && prepared.code === "REPOSITORY010_TRANSFER_PACKAGE_PREPARED"), prepared && prepared.code, "Preparation", "Critical");
    const pkg = await namespace.getPersistedLocalFirstRepositoryRecord("transferPackage", f.transferPackage.transferPackageId);
    check("Reload Transfer Package read-back succeeds", Boolean(pkg && pkg.integrityPreflightPassed === true), pkg, "Preparation", "Critical");
    check("Reload Package has no Transfer attempt", Boolean(pkg && pkg.transferAttempted === false && pkg.v2TransferIntegrityValidated === false), pkg, "Transfer Boundary", "Critical");

    const passedAll = c.checks.every(function all(item) { return item.passed; });
    const result = summarize(c.checks, "REPOSITORY-010-PHASE5-ANDROID-RELOAD-PREP", "REPOSITORY-010 Phase 5 Android Reload Preparation PASS", "REPOSITORY-010 Phase 5 Android Reload Preparation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      reloadRequired: passedAll,
      doNotRerunPreparationAfterReload: true,
      reloadFixture: internal.clone(RELOAD_IDS),
      reloadTransferPackageCreatedAt: pkg && pkg.createdAt || null,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet),
      releaseAllowed: false,
      phase5Complete: false,
      pcRequiredForActualV2: true
    });
    internal.markPhase5AndroidReloadPreparation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase5AndroidValidation() {
    const pre = await runLocalFirstRepositoryPhase5Validation();
    const c = collector();
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const androidRealDevice = /Android/i.test(userAgent);
    const f = reloadFixture();

    check("Phase 5 pre-device validation passes", Boolean(pre && pre.failed === 0 && pre.criticalFailed === 0), pre && pre.status, "Pre-Device", "Critical");
    check("Prior Phase 4 release baseline remains inherited", Boolean(VERSION_MANIFEST.release.priorValidatedBaseline && Number(VERSION_MANIFEST.release.priorValidatedBaseline.phase || 0) >= 4 && VERSION_MANIFEST.release.priorValidatedBaseline.androidRealValidationPassed === true), VERSION_MANIFEST.release.priorValidatedBaseline, "Release Lineage", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android IndexedDB", "Critical");
    check("PC Real Validation is not required by Phase 5 preflight", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 5 preflight", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Native IndexedDB persistence initializes", init.ok === true, init.code, "Android IndexedDB", "Critical");
    const pkg = await namespace.getPersistedLocalFirstRepositoryRecord("transferPackage", f.transferPackage.transferPackageId);
    check("Phase 5 Transfer Package survives real reload", Boolean(pkg), pkg && pkg.transferPackageId, "Full Reload", "Critical");
    const moduleLoadedAt = namespace.modules.phase5Validation && namespace.modules.phase5Validation.loadedAt || null;
    const fullReloadProved = Boolean(pkg && pkg.createdAt && moduleLoadedAt && Date.parse(moduleLoadedAt) > Date.parse(pkg.createdAt));
    check("Phase 5 module load occurred after persisted Transfer Package", fullReloadProved, { packageCreatedAt: pkg && pkg.createdAt, moduleLoadedAt: moduleLoadedAt }, "Full Reload", "Critical");

    const restored = await namespace.restoreLocalTransferPackage(f.transferPackage.transferPackageId);
    check("Persisted Transfer Package restores after full reload", Boolean(restored && restored.ok === true && restored.data && restored.data.restoreStatus === "restored"), restored && restored.code, "Recovery", "Critical");
    check("Package SHA-256 re-verifies after reload", Boolean(restored && restored.data && restored.data.packageHashVerified === true), restored && restored.data, "Integrity", "Critical");
    check("Layered hash snapshot survives reload", Boolean(restored && restored.data && restored.data.transferPackage && restored.data.transferPackage.integritySnapshot && restored.data.transferPackage.integritySnapshot.integrityStatus === "verified"), restored && restored.data, "Integrity", "Critical");
    check("Restored Package remains preflight-only", Boolean(restored && restored.data && restored.data.transferAttempted === false && restored.data.transferCompleted === false && restored.data.v2TransferIntegrityValidated === false), restored && restored.data, "Transfer Boundary", "Critical");
    check("Restored Package grants no Authority", Boolean(restored && restored.data && restored.data.syncEngineInvoked === false && restored.data.authorityEffect === "none" && restored.data.canonicalMutationPerformed === false), restored && restored.data, "Authority", "Critical");
    check("Actual V2 is explicitly deferred to PC + Cross-device Gate", Boolean(restored && restored.data && restored.data.pcRealValidationRequiredForActualV2 === true && restored.data.crossDeviceRealValidationRequiredForActualV2 === true), restored && restored.data, "Device Boundary", "Critical");

    const listed = await namespace.listLocalTransferPackages();
    check("Transfer Package appears in persisted list", listed.some(function find(item) { return item.transferPackageId === f.transferPackage.transferPackageId; }), listed, "Persistence", "High");
    const again = await namespace.prepareLocalTransferPackage(f.candidate.syncCandidateId, { transferPackageId: f.transferPackage.transferPackageId });
    check("Preparation remains idempotent after reload", Boolean(again && again.ok === true && again.code === "REPOSITORY010_TRANSFER_PACKAGE_ALREADY_PREPARED"), again && again.code, "Idempotency", "Critical");

    const status = namespace.getTransferPackageStatus();
    check("Integrity Preflight is implemented", status.v2IntegrityPreflightImplemented === true, status, "Status", "Critical");
    check("V2 actual Transfer remains unimplemented", status.v2TransferIntegrityValidationImplemented === false && status.transferImplemented === false, status, "V2 Boundary", "Critical");
    check("Actual Transfer requires PC", status.actualTransferRequiresPC === true, status.actualTransferRequiresPC, "Device Boundary", "Critical");
    check("Cross-device real validation is required for actual V2", status.actualV2RequiresCrossDeviceRealValidation === true, status.actualV2RequiresCrossDeviceRealValidation, "Device Boundary", "Critical");
    check("V3 Base/Conflict remains unimplemented", status.v3BaseConflictValidationImplemented === false, status.v3BaseConflictValidationImplemented, "Boundary", "Critical");
    check("V4 Target Validation remains unimplemented", status.v4TargetEnvironmentValidationImplemented === false, status.v4TargetEnvironmentValidationImplemented, "Boundary", "Critical");
    check("V5 Post-Reflection remains unimplemented", status.v5PostReflectionVerificationImplemented === false, status.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", status.syncEngineImplemented === false, status.syncEngineImplemented, "Safety", "Critical");
    check("Canonical Mutation Authority remains false", status.canonicalMutationAuthority === false, status.canonicalMutationAuthority, "Safety", "Critical");
    check("Explicit Acceptance remains unimplemented", status.explicitAcceptanceImplemented === false, status.explicitAcceptanceImplemented, "Safety", "Critical");

    const cleanup = await deleteFixtureExact(f);
    check("Phase 5 reload fixture cleanup uses exact ids", cleanup.every(function all(item) { return item.deleted === true; }), cleanup, "Fixture Cleanup", "Critical");
    const after = await namespace.getPersistedLocalFirstRepositoryRecord("transferPackage", f.transferPackage.transferPackageId);
    check("Reload Transfer Package is absent after cleanup", after === null, after, "Fixture Cleanup", "Critical");

    const passedAll = c.checks.every(function all(item) { return item.passed; });
    const result = summarize(c.checks, "REPOSITORY-010-PHASE5-ANDROID-VALIDATION", "REPOSITORY-010 Phase 5 Android Full-Reload Validation PASS", "REPOSITORY-010 Phase 5 Android Full-Reload Validation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      fullReloadValidated: fullReloadProved,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet),
      releaseAllowed: passedAll,
      phase5Complete: passedAll,
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false,
      actualV2TransferImplemented: false,
      pcRequiredForActualV2: true,
      transferPackageStatus: status
    });
    internal.markPhase5AndroidValidation(result);
    return result;
  }

  function getLocalFirstRepositoryPhase5ValidationStatus() {
    return {
      preDevice: internal.clone(state.lastPhase5Validation),
      androidReloadPreparation: internal.clone(state.lastPhase5AndroidReloadPreparation),
      androidRealDevice: internal.clone(state.lastPhase5AndroidValidation),
      phase5PreDeviceValidationPassed: state.phase5PreDeviceValidationPassed === true,
      phase5AndroidReloadPrepared: state.phase5AndroidReloadPrepared === true,
      androidPhase5ValidationPassed: state.androidPhase5ValidationPassed === true,
      phase5Complete: state.phase5PreDeviceValidationPassed === true && state.androidPhase5ValidationPassed === true,
      releaseAllowed: state.phase5PreDeviceValidationPassed === true && state.androidPhase5ValidationPassed === true,
      fullReloadValidationRequired: true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet),
      actualV2TransferImplemented: false,
      pcRequiredForActualV2: true
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase5Validation: runLocalFirstRepositoryPhase5Validation,
    prepareLocalFirstRepositoryPhase5AndroidReloadValidation: prepareLocalFirstRepositoryPhase5AndroidReloadValidation,
    runLocalFirstRepositoryPhase5AndroidValidation: runLocalFirstRepositoryPhase5AndroidValidation,
    getLocalFirstRepositoryPhase5ValidationStatus: getLocalFirstRepositoryPhase5ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase5Validation = {
    id: "REPOSITORY-010-PHASE5-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 5,
    fullReloadValidationRequired: true,
    androidRealDeviceRequired: true,
    pcRealValidationRequired: false,
    crossDeviceRealValidationRequired: false,
    pcRequiredForActualV2: true,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase5Validation = runLocalFirstRepositoryPhase5Validation;
  global.prepareLocalFirstRepositoryPhase5AndroidReloadValidation = prepareLocalFirstRepositoryPhase5AndroidReloadValidation;
  global.runLocalFirstRepositoryPhase5AndroidValidation = runLocalFirstRepositoryPhase5AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
