/* ============================================================
   FILE: 13_local_first_repository_sync_candidate.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.3.0 / Module: Sync Candidate 1.0.0
   Phase 4: Sync Candidate Preparation / V1 Local Validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Sync Candidate blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("syncCandidate");
  const RESTORE_STATUSES = Object.freeze(["restored", "blocked", "corrupted", "missing-source", "not-found"]);

  function fail(code, message, data, status) {
    return internal.buildResult(false, code, status || "Blocked", data || null, {
      error: { message: message, category: "Sync Candidate" }
    });
  }

  function keyForRecord(recordType, record) {
    if (!record) return "";
    if (recordType === "stateRecord") return internal.text(record.stateRecordId, "");
    if (recordType === "validationGate") return internal.text(record.gateId, "");
    if (recordType === "syncCandidate") return internal.text(record.syncCandidateId, "");
    return "";
  }

  function runtimeMapForRecord(recordType) {
    if (recordType === "stateRecord") return state.stateRecords;
    if (recordType === "validationGate") return state.validationGates;
    if (recordType === "syncCandidate") return state.syncCandidateDescriptors;
    return null;
  }

  async function persistExact(recordType, record, createdNow) {
    const id = keyForRecord(recordType, record);
    if (!id) return fail("REPOSITORY010_SYNC_CANDIDATE_RECORD_ID_MISSING", "Sync candidate record id is missing.", { recordType: recordType });
    const existing = await namespace.getPersistedLocalFirstRepositoryRecord(recordType, id);
    if (existing) return fail("REPOSITORY010_SYNC_CANDIDATE_RECORD_EXISTS", "Sync candidate record already exists.", { recordType: recordType, recordId: id });
    const result = await namespace.persistLocalFirstRepositoryRecord(recordType, record);
    if (result && result.ok === true) createdNow.push([recordType, id]);
    return result;
  }

  async function compensate(createdNow) {
    const results = [];
    for (let i = createdNow.length - 1; i >= 0; i -= 1) {
      const pair = createdNow[i];
      const deletion = await namespace.deletePersistedLocalFirstRepositoryRecord(pair[0], pair[1]);
      const runtimeMap = runtimeMapForRecord(pair[0]);
      if (runtimeMap instanceof Map) runtimeMap.delete(pair[1]);
      results.push({ recordType: pair[0], recordId: pair[1], deleted: Boolean(deletion && deletion.ok === true) });
    }
    return results;
  }

  async function loadAndValidateStagingSource(stagingId) {
    const id = internal.text(stagingId, "");
    if (!id) return fail("REPOSITORY010_SYNC_CANDIDATE_STAGING_ID_REQUIRED", "stagingId is required.", null, "Not Found");

    const descriptor = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", id);
    if (!descriptor) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_STAGING_NOT_FOUND", "Not Found", {
        stagingId: id,
        localValidationPassed: false,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    const descriptorValidation = namespace.validateContract("offlineStagingDescriptor", descriptor);
    if (!descriptorValidation.valid || descriptor.lifecycleStatus !== "staged") {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_STAGING_BLOCKED", "Blocked", {
        stagingId: id,
        descriptorValidation: descriptorValidation,
        lifecycleStatus: descriptor.lifecycleStatus || null,
        localValidationPassed: false,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    const node = await namespace.getPersistedLocalFirstRepositoryRecord("nodeIdentity", descriptor.nodeId);
    const revision = await namespace.getPersistedLocalFirstRepositoryRecord("revision", descriptor.revisionId);
    const integrity = await namespace.getPersistedLocalFirstRepositoryRecord("integrityRecord", descriptor.integrityRecordId);
    const stagedState = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", descriptor.stateRecordId);

    const missing = [];
    if (!node) missing.push("nodeIdentity");
    if (!revision) missing.push("revision");
    if (!integrity) missing.push("integrityRecord");
    if (!stagedState) missing.push("stateRecord");
    if (missing.length) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_MISSING_SOURCE", "Blocked", {
        stagingId: id,
        missing: missing,
        localValidationPassed: false,
        missingSourceInferencePerformed: false,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    const validations = {
      offlineStaging: descriptorValidation,
      nodeIdentity: namespace.validateContract("repositoryNodeIdentity", node),
      revision: namespace.validateContract("repositoryRevision", revision),
      integrityRecord: namespace.validateContract("repositoryIntegrityRecord", integrity),
      stagedStateRecord: namespace.validateContract("repositoryStateRecord", stagedState)
    };
    const invalid = Object.keys(validations).filter(function invalidKey(key) { return validations[key].valid !== true; });
    const problems = [];
    if (node.projectId !== descriptor.projectId || node.repositoryId !== descriptor.repositoryId || node.nodeId !== descriptor.nodeId) problems.push("node-identity-mismatch");
    if (revision.revisionId !== descriptor.revisionId || revision.sourceNodeId !== descriptor.nodeId || revision.baseRevisionId !== descriptor.baseRevisionId) problems.push("revision-lineage-mismatch");
    if (integrity.integrityRecordId !== descriptor.integrityRecordId || integrity.revisionId !== descriptor.revisionId) problems.push("integrity-revision-mismatch");
    if (stagedState.stateRecordId !== descriptor.stateRecordId || stagedState.revisionId !== descriptor.revisionId || stagedState.nodeId !== descriptor.nodeId || stagedState.repositoryId !== descriptor.repositoryId) problems.push("staged-state-reference-mismatch");
    if (stagedState.state !== "staged") problems.push("staged-state-required");
    if (integrity.integrityStatus !== "verified" || stagedState.integrityStatus !== "verified") problems.push("verified-integrity-required");
    if (descriptor.authorityEffect !== "none" || descriptor.canonicalMutationPerformed !== false) problems.push("authority-boundary-invalid");

    if (invalid.length || problems.length) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_LOCAL_VALIDATION_FAILED", "Blocked", {
        stagingId: id,
        invalidContracts: invalid,
        relationshipProblems: problems,
        validations: validations,
        localValidationPassed: false,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    return internal.buildResult(true, "REPOSITORY010_SYNC_CANDIDATE_LOCAL_VALIDATION_PASS", "Validated", {
      stagingDescriptor: internal.clone(descriptor),
      nodeIdentity: internal.clone(node),
      revision: internal.clone(revision),
      integrityRecord: internal.clone(integrity),
      stagedStateRecord: internal.clone(stagedState),
      validations: validations,
      localValidationPassed: true,
      validationLayer: "V1 Local Validation",
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      authorityEffect: "none",
      transferAttempted: false,
      canonicalMutationPerformed: false
    });
  }

  async function findExistingCandidateForStaging(stagingId) {
    const candidates = await namespace.listPersistedLocalFirstRepositoryRecords("syncCandidate");
    const id = internal.text(stagingId, "");
    return (Array.isArray(candidates) ? candidates : []).find(function find(item) {
      return item && item.stagingId === id && item.lifecycleStatus === "sync-candidate";
    }) || null;
  }

  async function prepareLocalSyncCandidate(stagingId, options) {
    const source = internal.isPlainObject(options) ? options : {};
    const validated = await loadAndValidateStagingSource(stagingId);
    if (!validated || validated.ok !== true) return validated;

    const staging = validated.data.stagingDescriptor;
    const node = validated.data.nodeIdentity;
    const revision = validated.data.revision;
    const integrity = validated.data.integrityRecord;
    const stagedState = validated.data.stagedStateRecord;

    const existing = await findExistingCandidateForStaging(staging.stagingId);
    if (existing) {
      const existingValidation = namespace.validateContract("syncCandidateDescriptor", existing);
      const sameSource = Boolean(
        existingValidation.valid === true &&
        existing.revisionId === revision.revisionId &&
        existing.baseRevisionId === revision.baseRevisionId &&
        existing.sourceNodeId === node.nodeId &&
        existing.integrityRecordId === integrity.integrityRecordId
      );
      if (!sameSource) {
        return fail("REPOSITORY010_SYNC_CANDIDATE_EXISTING_CONFLICT", "An existing sync candidate does not match the staged source.", {
          stagingId: staging.stagingId,
          existingSyncCandidateId: existing.syncCandidateId,
          authorityEffect: "none",
          transferAttempted: false,
          canonicalMutationPerformed: false
        });
      }
      return internal.buildResult(true, "REPOSITORY010_SYNC_CANDIDATE_ALREADY_PREPARED", "Prepared", {
        syncCandidate: internal.clone(existing),
        idempotent: true,
        localValidationPassed: true,
        validationLayer: "V1 Local Validation",
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false,
        syncEngineInvoked: false
      });
    }

    const candidateId = internal.text(source.syncCandidateId, internal.nextId("REPOSITORY-010-SYNC-CANDIDATE"));
    const candidateStateRecordId = internal.text(source.candidateStateRecordId, candidateId + "-STATE");
    const v1GateId = internal.text(source.v1GateId, candidateId + "-V1-GATE");
    const createdAt = internal.text(source.createdAt, internal.nowIso());

    const candidateState = {
      stateRecordId: candidateStateRecordId,
      repositoryId: staging.repositoryId,
      nodeId: staging.nodeId,
      revisionId: staging.revisionId,
      state: "sync-candidate",
      integrityStatus: "verified",
      authorityEffect: "none",
      recordedAt: createdAt,
      immutable: true
    };
    const v1Gate = {
      gateId: v1GateId,
      capabilityId: "REPOSITORY-010-SYNC-CANDIDATE-PREPARATION",
      gateType: "V1 Local Validation",
      applicability: "required",
      result: "passed",
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      recordedAt: createdAt,
      immutable: true
    };
    const candidate = {
      syncCandidateId: candidateId,
      stagingId: staging.stagingId,
      projectId: staging.projectId,
      repositoryId: staging.repositoryId,
      sourceNodeId: staging.nodeId,
      revisionId: staging.revisionId,
      baseRevisionId: staging.baseRevisionId,
      integrityRecordId: staging.integrityRecordId,
      stagedStateRecordId: staging.stateRecordId,
      candidateStateRecordId: candidateStateRecordId,
      v1GateId: v1GateId,
      lifecycleStatus: "sync-candidate",
      validationLayer: "V1 Local Validation",
      localValidationPassed: true,
      transferAttempted: false,
      transferIntegrityValidated: false,
      baseConflictValidated: false,
      targetEnvironmentValidated: false,
      explicitAcceptanceReceived: false,
      canonicalMutationPerformed: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: createdAt,
      immutable: true
    };

    const validations = {
      candidateStateRecord: namespace.validateContract("repositoryStateRecord", candidateState),
      v1Gate: namespace.validateContract("validationGateDescriptor", v1Gate),
      syncCandidate: namespace.validateContract("syncCandidateDescriptor", candidate)
    };
    const invalid = Object.keys(validations).filter(function invalidKey(key) { return validations[key].valid !== true; });
    if (invalid.length) {
      return fail("REPOSITORY010_SYNC_CANDIDATE_CONTRACT_INVALID", "Sync candidate contracts are invalid.", {
        invalid: invalid,
        validations: validations,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    const createdNow = [];
    const records = [
      ["stateRecord", candidateState],
      ["validationGate", v1Gate],
      ["syncCandidate", candidate]
    ];
    for (const pair of records) {
      const persisted = await persistExact(pair[0], pair[1], createdNow);
      if (!persisted || persisted.ok !== true) {
        const rollback = await compensate(createdNow);
        return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_PERSIST_FAILED", "Rolled Back", {
          failedRecordType: pair[0],
          failedCode: persisted && persisted.code || null,
          compensation: rollback,
          localValidationPassed: true,
          authorityEffect: "none",
          transferAttempted: false,
          canonicalMutationPerformed: false,
          syncEngineInvoked: false
        }, { error: persisted && persisted.error || { message: "Sync candidate persistence failed.", category: "Persistence" } });
      }
    }

    namespace.createRepositoryStateRecord(candidateState);
    namespace.createValidationGateDescriptor(v1Gate);
    namespace.createSyncCandidateDescriptor(candidate);

    state.syncCandidateStatus = "Prepared";
    state.lastSyncCandidateId = candidateId;
    internal.touch();

    return internal.buildResult(true, "REPOSITORY010_SYNC_CANDIDATE_PREPARED", "Prepared", {
      syncCandidate: internal.clone(candidate),
      candidateStateRecord: internal.clone(candidateState),
      v1Gate: internal.clone(v1Gate),
      sourceStagingDescriptor: internal.clone(staging),
      persistedRecordCount: records.length,
      localValidationPassed: true,
      validationLayer: "V1 Local Validation",
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      authorityEffect: "none",
      transferAttempted: false,
      canonicalMutationPerformed: false,
      syncEngineInvoked: false
    });
  }

  async function listLocalSyncCandidates() {
    const candidates = await namespace.listPersistedLocalFirstRepositoryRecords("syncCandidate");
    return (Array.isArray(candidates) ? candidates : [])
      .filter(function onlyCandidate(item) { return item && item.lifecycleStatus === "sync-candidate"; })
      .sort(function byCreatedAt(a, b) { return String(a.createdAt || "").localeCompare(String(b.createdAt || "")); })
      .map(internal.clone);
  }

  async function restoreLocalSyncCandidate(syncCandidateId) {
    const id = internal.text(syncCandidateId, "");
    if (!id) return fail("REPOSITORY010_SYNC_CANDIDATE_ID_REQUIRED", "syncCandidateId is required.", null, "Not Found");

    const candidate = await namespace.getPersistedLocalFirstRepositoryRecord("syncCandidate", id);
    if (!candidate) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_NOT_FOUND", "Not Found", {
        syncCandidateId: id,
        restoreStatus: "not-found",
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    const candidateValidation = namespace.validateContract("syncCandidateDescriptor", candidate);
    if (!candidateValidation.valid) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_CORRUPTED", "Blocked", {
        syncCandidateId: id,
        restoreStatus: "corrupted",
        candidateValidation: candidateValidation,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    const staging = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", candidate.stagingId);
    const node = await namespace.getPersistedLocalFirstRepositoryRecord("nodeIdentity", candidate.sourceNodeId);
    const revision = await namespace.getPersistedLocalFirstRepositoryRecord("revision", candidate.revisionId);
    const integrity = await namespace.getPersistedLocalFirstRepositoryRecord("integrityRecord", candidate.integrityRecordId);
    const stagedState = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", candidate.stagedStateRecordId);
    const candidateState = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", candidate.candidateStateRecordId);
    const v1Gate = await namespace.getPersistedLocalFirstRepositoryRecord("validationGate", candidate.v1GateId);

    const missing = [];
    if (!staging) missing.push("offlineStaging");
    if (!node) missing.push("nodeIdentity");
    if (!revision) missing.push("revision");
    if (!integrity) missing.push("integrityRecord");
    if (!stagedState) missing.push("stagedStateRecord");
    if (!candidateState) missing.push("candidateStateRecord");
    if (!v1Gate) missing.push("validationGate");
    if (missing.length) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_MISSING_SOURCE", "Blocked", {
        syncCandidateId: id,
        restoreStatus: "missing-source",
        missing: missing,
        missingSourceInferencePerformed: false,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    const validations = {
      syncCandidate: candidateValidation,
      offlineStaging: namespace.validateContract("offlineStagingDescriptor", staging),
      nodeIdentity: namespace.validateContract("repositoryNodeIdentity", node),
      revision: namespace.validateContract("repositoryRevision", revision),
      integrityRecord: namespace.validateContract("repositoryIntegrityRecord", integrity),
      stagedStateRecord: namespace.validateContract("repositoryStateRecord", stagedState),
      candidateStateRecord: namespace.validateContract("repositoryStateRecord", candidateState),
      v1Gate: namespace.validateContract("validationGateDescriptor", v1Gate)
    };
    const invalid = Object.keys(validations).filter(function invalidKey(key) { return validations[key].valid !== true; });
    const problems = [];
    if (candidate.stagingId !== staging.stagingId || candidate.projectId !== staging.projectId || candidate.repositoryId !== staging.repositoryId) problems.push("candidate-staging-mismatch");
    if (candidate.sourceNodeId !== staging.nodeId || candidate.revisionId !== staging.revisionId || candidate.baseRevisionId !== staging.baseRevisionId || candidate.integrityRecordId !== staging.integrityRecordId) problems.push("candidate-source-reference-mismatch");
    if (candidate.stagedStateRecordId !== staging.stateRecordId) problems.push("candidate-staged-state-mismatch");
    if (node.nodeId !== candidate.sourceNodeId || revision.sourceNodeId !== candidate.sourceNodeId || revision.revisionId !== candidate.revisionId || revision.baseRevisionId !== candidate.baseRevisionId) problems.push("candidate-lineage-mismatch");
    if (integrity.integrityStatus !== "verified" || stagedState.integrityStatus !== "verified" || candidateState.integrityStatus !== "verified") problems.push("verified-integrity-required");
    if (stagedState.state !== "staged" || candidateState.state !== "sync-candidate") problems.push("repository-state-mismatch");
    if (v1Gate.gateId !== candidate.v1GateId || v1Gate.gateType !== "V1 Local Validation" || v1Gate.result !== "passed" || v1Gate.validationIsApproval !== false || v1Gate.mutationAuthorityGranted !== false) problems.push("v1-gate-invalid");
    if (candidate.transferAttempted !== false || candidate.syncEngineInvoked !== false || candidate.canonicalMutationPerformed !== false || candidate.authorityEffect !== "none") problems.push("authority-or-transfer-boundary-invalid");

    if (invalid.length || problems.length) {
      return internal.buildResult(false, "REPOSITORY010_SYNC_CANDIDATE_CORRUPTED", "Blocked", {
        syncCandidateId: id,
        restoreStatus: "corrupted",
        invalidContracts: invalid,
        relationshipProblems: problems,
        authorityEffect: "none",
        transferAttempted: false,
        canonicalMutationPerformed: false
      });
    }

    namespace.createOfflineStagingDescriptor(staging);
    namespace.createRepositoryNodeIdentity(node);
    namespace.createRepositoryRevision(revision);
    namespace.createRepositoryIntegrityRecord(integrity);
    namespace.createRepositoryStateRecord(stagedState);
    namespace.createRepositoryStateRecord(candidateState);
    namespace.createValidationGateDescriptor(v1Gate);
    namespace.createSyncCandidateDescriptor(candidate);

    state.syncCandidateStatus = "Restored";
    state.lastSyncCandidateRestore = {
      syncCandidateId: id,
      restoreStatus: "restored",
      restoredAt: internal.nowIso()
    };
    internal.touch();

    return internal.buildResult(true, "REPOSITORY010_SYNC_CANDIDATE_RESTORED", "Restored", {
      syncCandidateId: id,
      restoreStatus: "restored",
      syncCandidate: internal.clone(candidate),
      sourceStagingDescriptor: internal.clone(staging),
      candidateStateRecord: internal.clone(candidateState),
      v1Gate: internal.clone(v1Gate),
      localValidationPassed: true,
      validationLayer: "V1 Local Validation",
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      authorityEffect: "none",
      transferAttempted: false,
      canonicalMutationPerformed: false,
      syncEngineInvoked: false
    });
  }

  function getSyncCandidateStatus() {
    return {
      status: state.syncCandidateStatus || "Ready",
      phase: 4,
      supportedRestoreStatuses: RESTORE_STATUSES.slice(),
      syncCandidateCreationImplemented: true,
      syncCandidatePersistenceImplemented: true,
      v1LocalValidationImplemented: true,
      stagedToSyncCandidateImplemented: true,
      v2TransferIntegrityValidationImplemented: false,
      v3BaseConflictValidationImplemented: false,
      v4TargetEnvironmentValidationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      transferImplemented: false,
      syncEngineImplemented: false,
      canonicalMutationAuthority: false,
      explicitAcceptanceImplemented: false,
      automaticConflictWinnerAllowed: false,
      offlineCanonicalFinalizationAllowed: false,
      lastRestore: internal.clone(state.lastSyncCandidateRestore || null),
      runtimeCandidateCount: state.syncCandidateDescriptors instanceof Map ? state.syncCandidateDescriptors.size : 0
    };
  }

  Object.assign(namespace.api, {
    prepareLocalSyncCandidate: prepareLocalSyncCandidate,
    listLocalSyncCandidates: listLocalSyncCandidates,
    restoreLocalSyncCandidate: restoreLocalSyncCandidate,
    getSyncCandidateStatus: getSyncCandidateStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.syncCandidate = {
    id: "REPOSITORY-010-SYNC-CANDIDATE",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 4,
    validationLayer: "V1 Local Validation",
    transferImplemented: false,
    syncEngineImplemented: false,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
