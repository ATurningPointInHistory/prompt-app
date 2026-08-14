/* ============================================================
   FILE: 13_local_first_repository_offline_staging.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.2.0 / Module: Offline Staging 1.0.0
   Phase 3: Offline Staging Lifecycle / Full-Reload Recovery
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Offline Staging blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("offlineStaging");
  const RESTORE_STATUSES = Object.freeze(["restored", "stale", "blocked", "corrupted", "missing-source", "not-found"]);

  function fail(code, message, data, status) {
    return internal.buildResult(false, code, status || "Blocked", data || null, {
      error: { message: message, category: "Offline Staging" }
    });
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  function exactRecordMatch(left, right) {
    return stableStringify(left) === stableStringify(right);
  }

  function runtimeMapFor(recordType) {
    if (recordType === "nodeIdentity") return state.nodeIdentities;
    if (recordType === "revision") return state.revisions;
    if (recordType === "integrityRecord") return state.integrityRecords;
    if (recordType === "stateRecord") return state.stateRecords;
    if (recordType === "offlineStaging") return state.offlineStagingDescriptors;
    return null;
  }

  function recordId(recordType, record) {
    if (!record) return "";
    if (recordType === "nodeIdentity") return String(record.nodeId || "");
    if (recordType === "revision") return String(record.revisionId || "");
    if (recordType === "integrityRecord") return String(record.integrityRecordId || "");
    if (recordType === "stateRecord") return String(record.stateRecordId || "");
    if (recordType === "offlineStaging") return String(record.stagingId || "");
    return "";
  }

  async function persistExact(recordType, record, createdNow) {
    const id = recordId(recordType, record);
    if (!id) return fail("REPOSITORY010_OFFLINE_STAGING_RECORD_ID_MISSING", "Staging record id is required.", { recordType: recordType });
    const existing = await namespace.getPersistedLocalFirstRepositoryRecord(recordType, id);
    if (existing) {
      if (!exactRecordMatch(existing, record)) {
        return fail("REPOSITORY010_OFFLINE_STAGING_ID_COLLISION", "A different persisted record already uses the requested staging id.", { recordType: recordType, recordId: id });
      }
      return internal.buildResult(true, "REPOSITORY010_OFFLINE_STAGING_RECORD_REUSED", "Ready", { recordType: recordType, recordId: id, reused: true });
    }
    const persisted = await namespace.persistLocalFirstRepositoryRecord(recordType, record);
    if (persisted.ok === true) createdNow.push({ recordType: recordType, recordId: id });
    return persisted;
  }

  async function compensate(createdNow) {
    const results = [];
    for (const item of createdNow.slice().reverse()) {
      try {
        const deletion = await namespace.deletePersistedLocalFirstRepositoryRecord(item.recordType, item.recordId);
        const map = runtimeMapFor(item.recordType);
        if (map instanceof Map) map.delete(item.recordId);
        results.push({ recordType: item.recordType, recordId: item.recordId, deleted: Boolean(deletion && deletion.ok === true) });
      } catch (error) {
        results.push({ recordType: item.recordType, recordId: item.recordId, deleted: false, error: error && error.message ? error.message : String(error) });
      }
    }
    return results;
  }

  function validateInputRelationships(node, revision, integrity, descriptorInput) {
    const problems = [];
    if (!node || node.nodeType !== "replica") problems.push("nodeType-must-be-replica");
    if (!revision || !revision.baseRevisionId) problems.push("baseRevisionId-required");
    if (!revision || !revision.parentRevisionId) problems.push("parentRevisionId-required");
    if (node && revision && revision.sourceNodeId !== node.nodeId) problems.push("revision-source-node-mismatch");
    if (revision && integrity && integrity.revisionId !== revision.revisionId) problems.push("integrity-revision-mismatch");
    if (!integrity || integrity.integrityStatus !== "verified") problems.push("verified-integrity-required");
    if (descriptorInput && descriptorInput.repositoryId && node && descriptorInput.repositoryId !== node.repositoryId) problems.push("repository-id-mismatch");
    return problems;
  }

  async function stageOfflineRepositoryWork(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const nodeInput = internal.isPlainObject(source.nodeIdentity) ? source.nodeIdentity : {};
    const revisionInput = internal.isPlainObject(source.revision) ? source.revision : {};
    const integrityInput = internal.isPlainObject(source.integrityRecord) ? source.integrityRecord : {};
    const descriptorInput = internal.isPlainObject(source.stagingDescriptor) ? source.stagingDescriptor : {};

    if (typeof namespace.persistLocalFirstRepositoryRecord !== "function") {
      return fail("REPOSITORY010_OFFLINE_STAGING_PERSISTENCE_UNAVAILABLE", "Persistence API is unavailable.");
    }

    const requiredNode = ["projectId", "repositoryId", "nodeId", "nodeType"];
    const missingNode = requiredNode.filter(function missing(key) { return !internal.text(nodeInput[key], ""); });
    if (missingNode.length) return fail("REPOSITORY010_OFFLINE_STAGING_NODE_INVALID", "Node Identity is invalid.", { missing: missingNode });

    let node = {
      projectId: internal.text(nodeInput.projectId, ""),
      repositoryId: internal.text(nodeInput.repositoryId, ""),
      nodeId: internal.text(nodeInput.nodeId, ""),
      nodeType: internal.text(nodeInput.nodeType, ""),
      identityGrantsAuthority: false,
      createdAt: internal.text(nodeInput.createdAt, internal.nowIso()),
      immutable: true
    };
    const persistedNode = await namespace.getPersistedLocalFirstRepositoryRecord("nodeIdentity", node.nodeId);
    if (persistedNode) {
      const validPersistedNode = namespace.validateContract("repositoryNodeIdentity", persistedNode).valid === true;
      const sameIdentity = persistedNode.projectId === node.projectId && persistedNode.repositoryId === node.repositoryId && persistedNode.nodeType === node.nodeType;
      if (!validPersistedNode || !sameIdentity) {
        return fail("REPOSITORY010_OFFLINE_STAGING_NODE_COLLISION", "Persisted Node Identity conflicts with staging input.", { nodeId: node.nodeId });
      }
      node = persistedNode;
    }

    const revision = {
      revisionId: internal.text(revisionInput.revisionId, ""),
      baseRevisionId: revisionInput.baseRevisionId == null ? null : internal.text(revisionInput.baseRevisionId, ""),
      parentRevisionId: revisionInput.parentRevisionId == null ? null : internal.text(revisionInput.parentRevisionId, ""),
      sourceNodeId: internal.text(revisionInput.sourceNodeId, ""),
      createdAt: internal.text(revisionInput.createdAt, internal.nowIso()),
      immutable: true
    };
    const integrity = {
      integrityRecordId: internal.text(integrityInput.integrityRecordId, internal.nextId("REPOSITORY-010-INTEGRITY")),
      revisionId: internal.text(integrityInput.revisionId, ""),
      hashAlgorithm: "SHA-256",
      fileHashes: internal.isPlainObject(integrityInput.fileHashes) ? internal.clone(integrityInput.fileHashes) : {},
      manifestHash: internal.text(integrityInput.manifestHash, ""),
      scriptSetHash: internal.text(integrityInput.scriptSetHash, ""),
      contentHash: internal.text(integrityInput.contentHash, ""),
      repositoryStateHash: internal.text(integrityInput.repositoryStateHash, ""),
      integrityStatus: internal.text(integrityInput.integrityStatus, ""),
      hashGeneratedAt: internal.text(integrityInput.hashGeneratedAt, internal.nowIso()),
      immutable: true
    };

    const problems = validateInputRelationships(node, revision, integrity, descriptorInput);
    if (problems.length) return fail("REPOSITORY010_OFFLINE_STAGING_RELATIONSHIP_INVALID", "Offline staging record relationships are invalid.", { problems: problems });

    const stateRecord = {
      stateRecordId: internal.text(source.stateRecordId, internal.nextId("REPOSITORY-010-OFFLINE-STAGE-STATE")),
      repositoryId: node.repositoryId,
      nodeId: node.nodeId,
      revisionId: revision.revisionId,
      state: "staged",
      integrityStatus: integrity.integrityStatus,
      authorityEffect: "none",
      recordedAt: internal.text(source.recordedAt, internal.nowIso()),
      immutable: true
    };
    const descriptor = {
      stagingId: internal.text(descriptorInput.stagingId, internal.nextId("REPOSITORY-010-OFFLINE-STAGING")),
      projectId: node.projectId,
      repositoryId: node.repositoryId,
      nodeId: node.nodeId,
      revisionId: revision.revisionId,
      baseRevisionId: revision.baseRevisionId,
      integrityRecordId: integrity.integrityRecordId,
      stateRecordId: stateRecord.stateRecordId,
      lifecycleStatus: "staged",
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      syncCandidateCreated: false,
      createdAt: internal.text(descriptorInput.createdAt, internal.nowIso()),
      immutable: true
    };

    const validations = {
      nodeIdentity: namespace.validateContract("repositoryNodeIdentity", node),
      revision: namespace.validateContract("repositoryRevision", revision),
      integrityRecord: namespace.validateContract("repositoryIntegrityRecord", integrity),
      stateRecord: namespace.validateContract("repositoryStateRecord", stateRecord),
      offlineStaging: namespace.validateContract("offlineStagingDescriptor", descriptor)
    };
    const invalid = Object.keys(validations).filter(function invalidKey(key) { return validations[key].valid !== true; });
    if (invalid.length) return fail("REPOSITORY010_OFFLINE_STAGING_CONTRACT_INVALID", "Offline staging contracts are invalid.", { invalid: invalid, validations: validations });

    const createdNow = [];
    const records = [
      ["nodeIdentity", node],
      ["revision", revision],
      ["integrityRecord", integrity],
      ["stateRecord", stateRecord],
      ["offlineStaging", descriptor]
    ];

    for (const pair of records) {
      const persisted = await persistExact(pair[0], pair[1], createdNow);
      if (!persisted.ok) {
        const compensation = await compensate(createdNow);
        return internal.buildResult(false, "REPOSITORY010_OFFLINE_STAGING_PERSIST_FAILED", "Rolled Back", {
          failedRecordType: pair[0],
          failedCode: persisted.code,
          compensation: compensation,
          authorityEffect: "none",
          canonicalMutationPerformed: false,
          syncCandidateCreated: false
        }, { error: persisted.error || { message: "Offline staging persistence failed.", category: "Persistence" } });
      }
    }

    namespace.createRepositoryNodeIdentity(node);
    namespace.createRepositoryRevision(revision);
    namespace.createRepositoryIntegrityRecord(integrity);
    namespace.createRepositoryStateRecord(stateRecord);
    namespace.createOfflineStagingDescriptor(descriptor);

    state.offlineStagingStatus = "Staged";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_OFFLINE_STAGING_CREATED", "Staged", {
      stagingDescriptor: internal.clone(descriptor),
      nodeIdentity: internal.clone(node),
      revision: internal.clone(revision),
      integrityRecord: internal.clone(integrity),
      stateRecord: internal.clone(stateRecord),
      persistedRecordCount: records.length,
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      syncCandidateCreated: false
    });
  }

  async function listOfflineStagedRepositoryWork() {
    const descriptors = await namespace.listPersistedLocalFirstRepositoryRecords("offlineStaging");
    return (Array.isArray(descriptors) ? descriptors : [])
      .filter(function onlyStaged(item) { return item && item.lifecycleStatus === "staged"; })
      .sort(function byCreatedAt(a, b) { return String(a.createdAt || "").localeCompare(String(b.createdAt || "")); })
      .map(internal.clone);
  }

  async function restoreOfflineStagedRepositoryWork(stagingId, options) {
    const id = internal.text(stagingId, "");
    const source = internal.isPlainObject(options) ? options : {};
    if (!id) return fail("REPOSITORY010_OFFLINE_STAGING_ID_REQUIRED", "stagingId is required.", null, "Not Found");

    const descriptor = await namespace.getPersistedLocalFirstRepositoryRecord("offlineStaging", id);
    if (!descriptor) {
      return internal.buildResult(false, "REPOSITORY010_OFFLINE_STAGING_NOT_FOUND", "Not Found", {
        stagingId: id,
        restoreStatus: "not-found",
        authorityEffect: "none",
        canonicalMutationPerformed: false
      });
    }

    const descriptorValidation = namespace.validateContract("offlineStagingDescriptor", descriptor);
    if (!descriptorValidation.valid) {
      return internal.buildResult(false, "REPOSITORY010_OFFLINE_STAGING_CORRUPTED", "Blocked", {
        stagingId: id,
        restoreStatus: "corrupted",
        descriptorValidation: descriptorValidation,
        authorityEffect: "none",
        canonicalMutationPerformed: false
      });
    }

    if (descriptor.lifecycleStatus !== "staged") {
      return internal.buildResult(false, "REPOSITORY010_OFFLINE_STAGING_STATE_BLOCKED", "Blocked", {
        stagingId: id,
        restoreStatus: "blocked",
        lifecycleStatus: descriptor.lifecycleStatus,
        authorityEffect: "none",
        canonicalMutationPerformed: false
      });
    }

    const node = await namespace.getPersistedLocalFirstRepositoryRecord("nodeIdentity", descriptor.nodeId);
    const revision = await namespace.getPersistedLocalFirstRepositoryRecord("revision", descriptor.revisionId);
    const integrity = await namespace.getPersistedLocalFirstRepositoryRecord("integrityRecord", descriptor.integrityRecordId);
    const stateRecord = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", descriptor.stateRecordId);

    const missing = [];
    if (!node) missing.push("nodeIdentity");
    if (!revision) missing.push("revision");
    if (!integrity) missing.push("integrityRecord");
    if (!stateRecord) missing.push("stateRecord");
    if (missing.length) {
      return internal.buildResult(false, "REPOSITORY010_OFFLINE_STAGING_MISSING_SOURCE", "Blocked", {
        stagingId: id,
        restoreStatus: "missing-source",
        missing: missing,
        authorityEffect: "none",
        canonicalMutationPerformed: false
      });
    }

    const validations = {
      nodeIdentity: namespace.validateContract("repositoryNodeIdentity", node),
      revision: namespace.validateContract("repositoryRevision", revision),
      integrityRecord: namespace.validateContract("repositoryIntegrityRecord", integrity),
      stateRecord: namespace.validateContract("repositoryStateRecord", stateRecord)
    };
    const invalid = Object.keys(validations).filter(function invalidKey(key) { return validations[key].valid !== true; });
    const relationshipProblems = [];
    if (node.repositoryId !== descriptor.repositoryId || node.projectId !== descriptor.projectId) relationshipProblems.push("descriptor-node-identity-mismatch");
    if (revision.revisionId !== descriptor.revisionId || revision.sourceNodeId !== descriptor.nodeId || revision.baseRevisionId !== descriptor.baseRevisionId) relationshipProblems.push("descriptor-revision-mismatch");
    if (integrity.integrityRecordId !== descriptor.integrityRecordId || integrity.revisionId !== descriptor.revisionId) relationshipProblems.push("descriptor-integrity-mismatch");
    if (stateRecord.stateRecordId !== descriptor.stateRecordId || stateRecord.revisionId !== descriptor.revisionId || stateRecord.nodeId !== descriptor.nodeId || stateRecord.state !== "staged") relationshipProblems.push("descriptor-state-mismatch");
    if (integrity.integrityStatus !== "verified" || stateRecord.integrityStatus !== "verified") relationshipProblems.push("verified-integrity-required");

    if (invalid.length || relationshipProblems.length) {
      return internal.buildResult(false, "REPOSITORY010_OFFLINE_STAGING_CORRUPTED", "Blocked", {
        stagingId: id,
        restoreStatus: "corrupted",
        invalidContracts: invalid,
        relationshipProblems: relationshipProblems,
        authorityEffect: "none",
        canonicalMutationPerformed: false
      });
    }

    const expectedBaseRevisionId = internal.text(source.expectedBaseRevisionId, "");
    if (expectedBaseRevisionId && revision.baseRevisionId !== expectedBaseRevisionId) {
      return internal.buildResult(false, "REPOSITORY010_OFFLINE_STAGING_STALE", "Stale", {
        stagingId: id,
        restoreStatus: "stale",
        expectedBaseRevisionId: expectedBaseRevisionId,
        actualBaseRevisionId: revision.baseRevisionId,
        repositoryState: "staged",
        authorityEffect: "none",
        canonicalMutationPerformed: false,
        syncCandidateCreated: false
      });
    }

    namespace.createRepositoryNodeIdentity(node);
    namespace.createRepositoryRevision(revision);
    namespace.createRepositoryIntegrityRecord(integrity);
    namespace.createRepositoryStateRecord(stateRecord);
    namespace.createOfflineStagingDescriptor(descriptor);

    state.offlineStagingStatus = "Restored";
    state.lastOfflineStagingRestore = {
      stagingId: id,
      restoreStatus: "restored",
      restoredAt: internal.nowIso()
    };
    internal.touch();

    return internal.buildResult(true, "REPOSITORY010_OFFLINE_STAGING_RESTORED", "Restored", {
      stagingId: id,
      restoreStatus: "restored",
      stagingDescriptor: internal.clone(descriptor),
      nodeIdentity: internal.clone(node),
      revision: internal.clone(revision),
      integrityRecord: internal.clone(integrity),
      stateRecord: internal.clone(stateRecord),
      repositoryState: "staged",
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      syncCandidateCreated: false
    });
  }

  function getOfflineStagingStatus() {
    return {
      status: state.offlineStagingStatus || "Ready",
      phase: 3,
      supportedRestoreStatuses: RESTORE_STATUSES.slice(),
      persistenceRequired: true,
      fullReloadRecoveryImplemented: true,
      replicaToStagedSupported: true,
      stagedToSyncCandidateImplemented: false,
      syncEngineImplemented: false,
      canonicalMutationAuthority: false,
      automaticConflictWinnerAllowed: false,
      offlineCanonicalFinalizationAllowed: false,
      lastRestore: internal.clone(state.lastOfflineStagingRestore || null),
      runtimeDescriptorCount: state.offlineStagingDescriptors instanceof Map ? state.offlineStagingDescriptors.size : 0
    };
  }

  Object.assign(namespace.api, {
    stageOfflineRepositoryWork: stageOfflineRepositoryWork,
    listOfflineStagedRepositoryWork: listOfflineStagedRepositoryWork,
    restoreOfflineStagedRepositoryWork: restoreOfflineStagedRepositoryWork,
    getOfflineStagingStatus: getOfflineStagingStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.offlineStaging = {
    id: "REPOSITORY-010-OFFLINE-STAGING",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 3,
    fullReloadRecoveryImplemented: true,
    syncEngineImplemented: false,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
