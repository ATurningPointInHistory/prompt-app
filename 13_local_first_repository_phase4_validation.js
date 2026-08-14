/* ============================================================
   FILE: 13_local_first_repository_phase4_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.3.0 / Module: Phase 4 Validation 1.0.0
   Phase 4: Sync Candidate Preparation / V1 Local Validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 4 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase4Validation");
  const RELOAD_IDS = Object.freeze({
    stagingId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-STAGING",
    nodeId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-NODE",
    revisionId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-REVISION",
    integrityRecordId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-INTEGRITY",
    stagedStateRecordId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-STAGED-STATE",
    syncCandidateId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-CANDIDATE",
    candidateStateRecordId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-CANDIDATE-STATE",
    v1GateId: "REPOSITORY010-PHASE4-ANDROID-RELOAD-V1-GATE"
  });

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: group || "Phase 4", severity: severity || "High" });
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
    const p = String(prefix || "PHASE4");
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
        baseRevisionId: "REPOSITORY010-PHASE4-BASE",
        parentRevisionId: "REPOSITORY010-PHASE4-BASE",
        sourceNodeId: nodeId
      },
      integrityRecord: {
        integrityRecordId: integrityRecordId,
        revisionId: revisionId,
        fileHashes: { "index.html": "6".repeat(64) },
        manifestHash: "7".repeat(64),
        scriptSetHash: "8".repeat(64),
        contentHash: "9".repeat(64),
        repositoryStateHash: "a".repeat(64),
        integrityStatus: "verified"
      },
      stateRecordId: ids.stagedStateRecordId || ("REPOSITORY010-" + p + "-STAGED-STATE"),
      stagingDescriptor: {
        stagingId: ids.stagingId || ("REPOSITORY010-" + p + "-STAGING")
      },
      candidate: {
        syncCandidateId: ids.syncCandidateId || ("REPOSITORY010-" + p + "-CANDIDATE"),
        candidateStateRecordId: ids.candidateStateRecordId || ("REPOSITORY010-" + p + "-CANDIDATE-STATE"),
        v1GateId: ids.v1GateId || ("REPOSITORY010-" + p + "-V1-GATE")
      }
    };
  }

  function runtimeMapFor(recordType) {
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

  async function stageFixture(f) {
    return namespace.stageOfflineRepositoryWork({
      nodeIdentity: f.nodeIdentity,
      revision: f.revision,
      integrityRecord: f.integrityRecord,
      stateRecordId: f.stateRecordId,
      stagingDescriptor: f.stagingDescriptor
    });
  }

  async function prepareCandidateFixture(f) {
    return namespace.prepareLocalSyncCandidate(f.stagingDescriptor.stagingId, {
      syncCandidateId: f.candidate.syncCandidateId,
      candidateStateRecordId: f.candidate.candidateStateRecordId,
      v1GateId: f.candidate.v1GateId
    });
  }

  async function runLocalFirstRepositoryPhase4Validation() {
    const phase3 = typeof namespace.runLocalFirstRepositoryPhase3Validation === "function" ? await namespace.runLocalFirstRepositoryPhase3Validation() : null;
    const c = collector();
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;

    check("Phase 3 deterministic regression passes", Boolean(phase3 && phase3.failed === 0 && phase3.criticalFailed === 0), phase3 && phase3.status, "Regression", "Critical");
    check("Prior Phase 3 Android release baseline is recorded", Boolean(prior && prior.phase === 3 && prior.version === "1.2.0" && prior.androidRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Phase 4 scope is Sync Candidate Preparation / V1 Local Validation", VERSION_MANIFEST.implementation.phase === 4 && VERSION_MANIFEST.implementation.syncCandidateCreationImplemented === true && VERSION_MANIFEST.implementation.v1LocalValidationImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Sync Candidate Descriptor contract is registered", Boolean(namespace.getContractDefinition("syncCandidateDescriptor")), namespace.getContractDefinition("syncCandidateDescriptor"), "Contract", "Critical");
    check("Sync Candidate module is ready", Boolean(namespace.modules.syncCandidate && namespace.modules.syncCandidate.status === "Ready"), namespace.modules.syncCandidate, "Module", "Critical");
    check("V2 Transfer remains unimplemented", VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === false, VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented, "Boundary", "Critical");
    check("V3 Base/Conflict remains unimplemented", VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === false, VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented, "Boundary", "Critical");
    check("V4 Target Validation remains unimplemented", VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === false, VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented, "Boundary", "Critical");
    check("V5 Post-Reflection remains unimplemented", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");
    check("PC Real Validation is not required by Phase 4", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 4", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    const adapter = namespace.createMemoryLocalFirstRepositoryPersistenceAdapter();
    namespace.setLocalFirstRepositoryPersistenceAdapter(adapter);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Memory persistence initializes", init.ok === true, init.code, "Persistence", "Critical");

    const f = fixture("PHASE4-PRE");
    await deleteFixtureExact(f);
    const staged = await stageFixture(f);
    check("Validated Replica can become offline staged work", Boolean(staged && staged.ok === true), staged && staged.code, "Staging", "Critical");
    const stagingBefore = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", f.stagingDescriptor.stagingId);

    const prepared = await prepareCandidateFixture(f);
    check("Staged work prepares a Sync Candidate", Boolean(prepared && prepared.ok === true && prepared.code === "REPOSITORY010_SYNC_CANDIDATE_PREPARED"), prepared && prepared.code, "Candidate", "Critical");
    check("Candidate passed V1 Local Validation", Boolean(prepared && prepared.data && prepared.data.localValidationPassed === true && prepared.data.validationLayer === "V1 Local Validation"), prepared && prepared.data, "V1 Local Validation", "Critical");
    check("V1 Validation is not Approval", Boolean(prepared && prepared.data && prepared.data.validationIsApproval === false && prepared.data.mutationAuthorityGranted === false), prepared && prepared.data, "Authority", "Critical");
    check("Candidate does not attempt Transfer", Boolean(prepared && prepared.data && prepared.data.transferAttempted === false && prepared.data.syncEngineInvoked === false), prepared && prepared.data, "Transfer Boundary", "Critical");
    check("Candidate does not mutate Canonical", Boolean(prepared && prepared.data && prepared.data.canonicalMutationPerformed === false && prepared.data.authorityEffect === "none"), prepared && prepared.data, "Authority", "Critical");

    const candidate = await namespace.getPersistedLocalFirstRepositoryRecord("syncCandidate", f.candidate.syncCandidateId);
    const candidateState = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", f.candidate.candidateStateRecordId);
    const gate = await namespace.getPersistedLocalFirstRepositoryRecord("validationGate", f.candidate.v1GateId);
    check("Sync Candidate persists with read-back", Boolean(candidate && candidate.lifecycleStatus === "sync-candidate"), candidate, "Persistence", "Critical");
    check("Sync Candidate State persists", Boolean(candidateState && candidateState.state === "sync-candidate" && candidateState.authorityEffect === "none"), candidateState, "State", "Critical");
    check("V1 Gate Evidence persists", Boolean(gate && gate.gateType === "V1 Local Validation" && gate.result === "passed"), gate, "Evidence", "Critical");

    const stagingAfter = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", f.stagingDescriptor.stagingId);
    check("Original staged descriptor remains immutable", JSON.stringify(stagingBefore) === JSON.stringify(stagingAfter), { before: stagingBefore, after: stagingAfter }, "Immutability", "Critical");
    check("Original staging does not gain Authority or mutable transition flag", Boolean(stagingAfter && stagingAfter.lifecycleStatus === "staged" && stagingAfter.syncCandidateCreated === false && stagingAfter.authorityEffect === "none"), stagingAfter, "Immutability", "Critical");

    const again = await prepareCandidateFixture(f);
    const listed = await namespace.listLocalSyncCandidates();
    check("Repeated preparation is idempotent", Boolean(again && again.ok === true && again.code === "REPOSITORY010_SYNC_CANDIDATE_ALREADY_PREPARED" && again.data && again.data.syncCandidate.syncCandidateId === f.candidate.syncCandidateId), again && again.code, "Idempotency", "Critical");
    check("Idempotent preparation creates one Candidate", listed.filter(function same(item) { return item.stagingId === f.stagingDescriptor.stagingId; }).length === 1, listed, "Idempotency", "Critical");

    const restored = await namespace.restoreLocalSyncCandidate(f.candidate.syncCandidateId);
    check("Prepared Candidate restores from persistence", Boolean(restored && restored.ok === true && restored.data && restored.data.restoreStatus === "restored"), restored && restored.code, "Recovery", "Critical");
    check("Restored Candidate still has no Transfer or Authority", Boolean(restored && restored.data && restored.data.transferAttempted === false && restored.data.canonicalMutationPerformed === false && restored.data.authorityEffect === "none"), restored && restored.data, "Safety", "Critical");

    const cleanup = await deleteFixtureExact(f);
    check("Phase 4 validation fixture cleanup uses exact ids", cleanup.every(function all(item) { return item.deleted === true; }), cleanup, "Fixture Cleanup", "Critical");

    const status = namespace.getSyncCandidateStatus();
    check("Phase 4 status exposes V1-only boundary", status.stagedToSyncCandidateImplemented === true && status.v1LocalValidationImplemented === true && status.transferImplemented === false && status.syncEngineImplemented === false, status, "Status", "Critical");
    check("Canonical Mutation Authority remains false", status.canonicalMutationAuthority === false, status.canonicalMutationAuthority, "Safety", "Critical");
    check("Automatic conflict winner remains prohibited", status.automaticConflictWinnerAllowed === false, status.automaticConflictWinnerAllowed, "Safety", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE4-VALIDATION", "REPOSITORY-010 Phase 4 Pre-Device Validation PASS", "REPOSITORY-010 Phase 4 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet),
      releaseAllowed: false,
      phase4Complete: false,
      syncCandidateStatus: status
    });
    internal.markPhase4PreDeviceValidation(result);
    return result;
  }

  async function prepareLocalFirstRepositoryPhase4AndroidReloadValidation() {
    const pre = await runLocalFirstRepositoryPhase4Validation();
    const c = collector();
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "";
    const androidRealDevice = /Android/i.test(userAgent);
    const f = fixture("PHASE4-ANDROID-RELOAD", RELOAD_IDS);

    check("Phase 4 pre-device validation passes", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Pre-Device", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android IndexedDB", "Critical");
    check("PC Real Validation is not required by Phase 4", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 4", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Native IndexedDB persistence initializes", init.ok === true, init.code, "Android IndexedDB", "Critical");

    const old = await deleteFixtureExact(f);
    check("Previous Phase 4 reload fixture is absent or cleaned", old.every(function all(item) { return item.deleted === true; }), old, "Preparation", "Critical");

    const staged = await stageFixture(f);
    check("Reload staging fixture is persisted", Boolean(staged && staged.ok === true), staged && staged.code, "Preparation", "Critical");
    const stagingBefore = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", f.stagingDescriptor.stagingId);
    const prepared = await prepareCandidateFixture(f);
    check("Reload Sync Candidate is prepared", Boolean(prepared && prepared.ok === true && prepared.code === "REPOSITORY010_SYNC_CANDIDATE_PREPARED"), prepared && prepared.code, "Preparation", "Critical");
    const candidate = await namespace.getPersistedLocalFirstRepositoryRecord("syncCandidate", f.candidate.syncCandidateId);
    check("Reload Candidate read-back succeeds", Boolean(candidate && candidate.syncCandidateId === f.candidate.syncCandidateId), candidate, "Preparation", "Critical");
    const stagingAfter = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", f.stagingDescriptor.stagingId);
    check("Candidate preparation leaves staged source unchanged", JSON.stringify(stagingBefore) === JSON.stringify(stagingAfter), { before: stagingBefore, after: stagingAfter }, "Immutability", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE4-ANDROID-RELOAD-PREP", "REPOSITORY-010 Phase 4 Android Reload Preparation PASS", "REPOSITORY-010 Phase 4 Android Reload Preparation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      reloadRequired: true,
      doNotRerunPreparationAfterReload: true,
      reloadFixture: internal.clone(RELOAD_IDS),
      reloadCandidateCreatedAt: candidate && candidate.createdAt || null,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet),
      releaseAllowed: false,
      phase4Complete: false
    });
    internal.markPhase4AndroidReloadPreparation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase4AndroidValidation() {
    const pre = await runLocalFirstRepositoryPhase4Validation();
    const phase2Android = typeof namespace.runLocalFirstRepositoryPhase2AndroidValidation === "function" ? await namespace.runLocalFirstRepositoryPhase2AndroidValidation() : null;
    const c = collector();
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "";
    const androidRealDevice = /Android/i.test(userAgent);
    const f = fixture("PHASE4-ANDROID-RELOAD", RELOAD_IDS);

    check("Phase 4 pre-device validation passes", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Pre-Device", "Critical");
    check("Phase 2 Android persistence regression passes", Boolean(phase2Android && phase2Android.failed === 0 && phase2Android.criticalFailed === 0 && phase2Android.androidRealDevice === true), phase2Android && phase2Android.status, "Regression", "Critical");
    check("Prior Phase 3 release baseline remains inherited", Boolean(VERSION_MANIFEST.release.priorValidatedBaseline && VERSION_MANIFEST.release.priorValidatedBaseline.phase === 3 && VERSION_MANIFEST.release.priorValidatedBaseline.androidRealValidationPassed === true), VERSION_MANIFEST.release.priorValidatedBaseline, "Release Lineage", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android IndexedDB", "Critical");
    check("PC Real Validation is not required by Phase 4", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 4", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    namespace.setLocalFirstRepositoryPersistenceAdapter(null);
    const init = await namespace.initializeLocalFirstRepositoryPersistence();
    check("Native IndexedDB persistence initializes", init.ok === true, init.code, "Android IndexedDB", "Critical");

    const candidate = await namespace.getPersistedLocalFirstRepositoryRecord("syncCandidate", f.candidate.syncCandidateId);
    check("Phase 4 Sync Candidate survives real reload", Boolean(candidate), candidate && candidate.syncCandidateId, "Full Reload", "Critical");
    const moduleLoadedAt = namespace.modules.phase4Validation && namespace.modules.phase4Validation.loadedAt || null;
    const fullReloadProved = Boolean(candidate && candidate.createdAt && moduleLoadedAt && Date.parse(moduleLoadedAt) > Date.parse(candidate.createdAt));
    check("Phase 4 module load occurred after persisted Candidate", fullReloadProved, { candidateCreatedAt: candidate && candidate.createdAt, moduleLoadedAt: moduleLoadedAt }, "Full Reload", "Critical");

    const restored = await namespace.restoreLocalSyncCandidate(f.candidate.syncCandidateId);
    check("Persisted Sync Candidate restores after full reload", Boolean(restored && restored.ok === true && restored.data && restored.data.restoreStatus === "restored"), restored && restored.code, "Recovery", "Critical");
    check("Restored Candidate remains sync-candidate", Boolean(restored && restored.data && restored.data.syncCandidate && restored.data.syncCandidate.lifecycleStatus === "sync-candidate"), restored && restored.data, "State", "Critical");
    check("Restored Candidate retains V1 Local Validation", Boolean(restored && restored.data && restored.data.localValidationPassed === true && restored.data.validationLayer === "V1 Local Validation"), restored && restored.data, "V1 Local Validation", "Critical");
    check("Restored V1 is not Approval", Boolean(restored && restored.data && restored.data.validationIsApproval === false && restored.data.mutationAuthorityGranted === false), restored && restored.data, "Authority", "Critical");
    check("Restored Candidate has no Transfer attempt", Boolean(restored && restored.data && restored.data.transferAttempted === false && restored.data.syncEngineInvoked === false), restored && restored.data, "Transfer Boundary", "Critical");
    check("Restored Candidate cannot mutate Canonical", Boolean(restored && restored.data && restored.data.canonicalMutationPerformed === false && restored.data.authorityEffect === "none"), restored && restored.data, "Authority", "Critical");

    const sourceStaging = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", f.stagingDescriptor.stagingId);
    const candidateState = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", f.candidate.candidateStateRecordId);
    const v1Gate = await namespace.getPersistedLocalFirstRepositoryRecord("validationGate", f.candidate.v1GateId);
    check("Original source remains staged after reload", Boolean(sourceStaging && sourceStaging.lifecycleStatus === "staged" && sourceStaging.syncCandidateCreated === false), sourceStaging, "Immutability", "Critical");
    check("Candidate State is sync-candidate after reload", Boolean(candidateState && candidateState.state === "sync-candidate" && candidateState.authorityEffect === "none"), candidateState, "State", "Critical");
    check("V1 Gate Evidence survives reload", Boolean(v1Gate && v1Gate.gateType === "V1 Local Validation" && v1Gate.result === "passed" && v1Gate.validationIsApproval === false && v1Gate.mutationAuthorityGranted === false), v1Gate, "Evidence", "Critical");

    const listed = await namespace.listLocalSyncCandidates();
    check("Candidate appears in persisted Candidate list", listed.some(function find(item) { return item.syncCandidateId === f.candidate.syncCandidateId; }), listed, "Persistence", "High");
    const again = await prepareCandidateFixture(f);
    check("Preparation remains idempotent after reload", Boolean(again && again.ok === true && again.code === "REPOSITORY010_SYNC_CANDIDATE_ALREADY_PREPARED"), again && again.code, "Idempotency", "Critical");

    const status = namespace.getSyncCandidateStatus();
    check("V2 Transfer remains unimplemented", status.v2TransferIntegrityValidationImplemented === false && status.transferImplemented === false, status, "Transfer Boundary", "Critical");
    check("V3 Base/Conflict remains unimplemented", status.v3BaseConflictValidationImplemented === false, status.v3BaseConflictValidationImplemented, "Boundary", "Critical");
    check("V4 Target Validation remains unimplemented", status.v4TargetEnvironmentValidationImplemented === false, status.v4TargetEnvironmentValidationImplemented, "Boundary", "Critical");
    check("V5 Post-Reflection remains unimplemented", status.v5PostReflectionVerificationImplemented === false, status.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", status.syncEngineImplemented === false, status.syncEngineImplemented, "Safety", "Critical");
    check("Canonical Mutation Authority remains false", status.canonicalMutationAuthority === false, status.canonicalMutationAuthority, "Safety", "Critical");
    check("Explicit Acceptance remains unimplemented", status.explicitAcceptanceImplemented === false, status.explicitAcceptanceImplemented, "Safety", "Critical");

    const cleanup = await deleteFixtureExact(f);
    check("Phase 4 reload fixture cleanup uses exact ids", cleanup.every(function all(item) { return item.deleted === true; }), cleanup, "Fixture Cleanup", "Critical");
    const candidateAfter = await namespace.getPersistedLocalFirstRepositoryRecord("syncCandidate", f.candidate.syncCandidateId);
    const stagingAfter = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", f.stagingDescriptor.stagingId);
    check("Reload Candidate is absent after cleanup", candidateAfter === null, candidateAfter, "Fixture Cleanup", "Critical");
    check("Reload staging source is absent after cleanup", stagingAfter === null, stagingAfter, "Fixture Cleanup", "Critical");

    const passedAll = c.checks.every(function all(item) { return item.passed; });
    const result = summarize(c.checks, "REPOSITORY-010-PHASE4-ANDROID-VALIDATION", "REPOSITORY-010 Phase 4 Android Full-Reload Validation PASS", "REPOSITORY-010 Phase 4 Android Full-Reload Validation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      fullReloadValidated: fullReloadProved,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet),
      releaseAllowed: passedAll,
      phase4Complete: passedAll,
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false,
      syncCandidateStatus: status
    });
    internal.markPhase4AndroidValidation(result);
    return result;
  }

  function getLocalFirstRepositoryPhase4ValidationStatus() {
    return {
      preDevice: internal.clone(state.lastPhase4Validation),
      androidReloadPreparation: internal.clone(state.lastPhase4AndroidReloadPreparation),
      androidRealDevice: internal.clone(state.lastPhase4AndroidValidation),
      phase4PreDeviceValidationPassed: state.phase4PreDeviceValidationPassed === true,
      phase4AndroidReloadPrepared: state.phase4AndroidReloadPrepared === true,
      androidPhase4ValidationPassed: state.androidPhase4ValidationPassed === true,
      phase4Complete: state.phase4PreDeviceValidationPassed === true && state.androidPhase4ValidationPassed === true,
      releaseAllowed: state.phase4PreDeviceValidationPassed === true && state.androidPhase4ValidationPassed === true,
      fullReloadValidationRequired: true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet)
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase4Validation: runLocalFirstRepositoryPhase4Validation,
    prepareLocalFirstRepositoryPhase4AndroidReloadValidation: prepareLocalFirstRepositoryPhase4AndroidReloadValidation,
    runLocalFirstRepositoryPhase4AndroidValidation: runLocalFirstRepositoryPhase4AndroidValidation,
    getLocalFirstRepositoryPhase4ValidationStatus: getLocalFirstRepositoryPhase4ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase4Validation = {
    id: "REPOSITORY-010-PHASE4-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    fullReloadValidationRequired: true,
    androidRealDeviceRequired: true,
    pcRealValidationRequired: false,
    crossDeviceRealValidationRequired: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase4Validation = runLocalFirstRepositoryPhase4Validation;
  global.prepareLocalFirstRepositoryPhase4AndroidReloadValidation = prepareLocalFirstRepositoryPhase4AndroidReloadValidation;
  global.runLocalFirstRepositoryPhase4AndroidValidation = runLocalFirstRepositoryPhase4AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
