/* ============================================================
   FILE: 13_local_first_repository_transfer_package.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.4.0 / Module: Transfer Package 1.0.0
   Phase 5: Transfer Package / Integrity Preflight
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Transfer Package blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("transferPackage");
  const RESTORE_STATUSES = Object.freeze(["restored", "blocked", "corrupted", "missing-source", "not-found"]);

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sorted(key) { out[key] = stableValue(value[key]); });
    return out;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  function isSha256Hex(value) { return /^[0-9a-f]{64}$/i.test(String(value || "")); }

  async function sha256Hex(value) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder !== "function") {
      throw new Error("Web Crypto SHA-256 is unavailable.");
    }
    const encoded = new TextEncoder().encode(String(value));
    const buffer = await global.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function buildIntegritySnapshot(integrity) {
    return {
      hashAlgorithm: integrity.hashAlgorithm,
      fileHashes: internal.clone(integrity.fileHashes || {}),
      manifestHash: integrity.manifestHash,
      scriptSetHash: integrity.scriptSetHash,
      contentHash: integrity.contentHash,
      repositoryStateHash: integrity.repositoryStateHash,
      integrityStatus: integrity.integrityStatus,
      hashGeneratedAt: integrity.hashGeneratedAt
    };
  }

  function integritySnapshotValid(snapshot) {
    if (!snapshot || snapshot.hashAlgorithm !== "SHA-256" || snapshot.integrityStatus !== "verified") return false;
    if (!isSha256Hex(snapshot.manifestHash) || !isSha256Hex(snapshot.scriptSetHash) || !isSha256Hex(snapshot.contentHash) || !isSha256Hex(snapshot.repositoryStateHash)) return false;
    const files = snapshot.fileHashes && typeof snapshot.fileHashes === "object" ? snapshot.fileHashes : null;
    if (!files || !Object.keys(files).length) return false;
    return Object.keys(files).every(function validFile(key) { return isSha256Hex(files[key]); });
  }

  function buildHashPayload(record) {
    return {
      transferPackageId: record.transferPackageId,
      syncCandidateId: record.syncCandidateId,
      projectId: record.projectId,
      repositoryId: record.repositoryId,
      sourceNodeId: record.sourceNodeId,
      revisionId: record.revisionId,
      baseRevisionId: record.baseRevisionId,
      integrityRecordId: record.integrityRecordId,
      candidateStateRecordId: record.candidateStateRecordId,
      v1GateId: record.v1GateId,
      integritySnapshot: internal.clone(record.integritySnapshot || {}),
      packageHashAlgorithm: "SHA-256",
      integrityPreflightStatus: "verified",
      integrityPreflightPassed: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: record.createdAt,
      immutable: true
    };
  }

  async function loadCandidateSources(syncCandidateId) {
    const candidate = await namespace.getPersistedLocalFirstRepositoryRecord("syncCandidate", syncCandidateId);
    if (!candidate) return { ok: false, code: "REPOSITORY010_TRANSFER_PACKAGE_CANDIDATE_NOT_FOUND" };
    const integrity = await namespace.getPersistedLocalFirstRepositoryRecord("integrityRecord", candidate.integrityRecordId);
    const candidateState = await namespace.getPersistedLocalFirstRepositoryRecord("stateRecord", candidate.candidateStateRecordId);
    const v1Gate = await namespace.getPersistedLocalFirstRepositoryRecord("validationGate", candidate.v1GateId);
    if (!integrity || !candidateState || !v1Gate) {
      return {
        ok: false,
        code: "REPOSITORY010_TRANSFER_PACKAGE_SOURCE_MISSING",
        missing: {
          integrityRecord: !integrity,
          candidateStateRecord: !candidateState,
          v1Gate: !v1Gate
        }
      };
    }
    return { ok: true, candidate: candidate, integrity: integrity, candidateState: candidateState, v1Gate: v1Gate };
  }

  function validateSources(source) {
    const problems = [];
    const candidate = source.candidate;
    const integrity = source.integrity;
    const candidateState = source.candidateState;
    const v1Gate = source.v1Gate;
    if (candidate.lifecycleStatus !== "sync-candidate" || candidate.localValidationPassed !== true) problems.push("sync-candidate-not-locally-validated");
    if (candidate.transferAttempted !== false || candidate.transferIntegrityValidated !== false || candidate.syncEngineInvoked !== false) problems.push("transfer-boundary-already-crossed");
    if (candidate.canonicalMutationPerformed !== false || candidate.authorityEffect !== "none") problems.push("authority-boundary-invalid");
    if (candidateState.state !== "sync-candidate" || candidateState.integrityStatus !== "verified" || candidateState.authorityEffect !== "none") problems.push("candidate-state-invalid");
    if (v1Gate.gateType !== "V1 Local Validation" || v1Gate.result !== "passed" || v1Gate.validationIsApproval !== false || v1Gate.mutationAuthorityGranted !== false) problems.push("v1-evidence-invalid");
    if (integrity.integrityStatus !== "verified" || integrity.hashAlgorithm !== "SHA-256") problems.push("integrity-not-verified");
    const snapshot = buildIntegritySnapshot(integrity);
    if (!integritySnapshotValid(snapshot)) problems.push("layered-hash-snapshot-invalid");
    if (integrity.revisionId !== candidate.revisionId || candidateState.revisionId !== candidate.revisionId) problems.push("revision-linkage-invalid");
    return { valid: problems.length === 0, problems: problems, integritySnapshot: snapshot };
  }

  async function prepareLocalTransferPackage(syncCandidateId, options) {
    const id = internal.text(syncCandidateId, "");
    const opts = internal.isPlainObject(options) ? options : {};
    if (!id) return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_CANDIDATE_ID_REQUIRED", "Blocked", null);
    const transferPackageId = internal.text(opts.transferPackageId, internal.nextId("REPOSITORY010-TRANSFER-PACKAGE"));
    const existing = await namespace.getPersistedLocalFirstRepositoryRecord("transferPackage", transferPackageId);
    if (existing) {
      const restored = await restoreLocalTransferPackage(transferPackageId);
      if (restored.ok) return internal.buildResult(true, "REPOSITORY010_TRANSFER_PACKAGE_ALREADY_PREPARED", "Ready", restored.data);
      return restored;
    }

    const loaded = await loadCandidateSources(id);
    if (!loaded.ok) return internal.buildResult(false, loaded.code, "Blocked", loaded.missing || null);
    const validation = validateSources(loaded);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_PREFLIGHT_BLOCKED", "Blocked", { problems: validation.problems });

    const candidate = loaded.candidate;
    const createdAt = internal.text(opts.createdAt, internal.nowIso());
    const draft = {
      transferPackageId: transferPackageId,
      syncCandidateId: candidate.syncCandidateId,
      projectId: candidate.projectId,
      repositoryId: candidate.repositoryId,
      sourceNodeId: candidate.sourceNodeId,
      revisionId: candidate.revisionId,
      baseRevisionId: candidate.baseRevisionId,
      integrityRecordId: candidate.integrityRecordId,
      candidateStateRecordId: candidate.candidateStateRecordId,
      v1GateId: candidate.v1GateId,
      integritySnapshot: validation.integritySnapshot,
      packageHashAlgorithm: "SHA-256",
      integrityPreflightStatus: "verified",
      integrityPreflightPassed: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: createdAt,
      immutable: true
    };

    let packageHash;
    try {
      packageHash = await sha256Hex(stableStringify(buildHashPayload(draft)));
    } catch (error) {
      return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_HASH_UNAVAILABLE", "Blocked", null, { error: { message: error.message, category: "Integrity" } });
    }
    draft.packageHash = packageHash;

    const metadata = namespace.createTransferPackageDescriptor(draft);
    if (!metadata || metadata.ok !== true) return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_METADATA_BLOCKED", "Blocked", metadata && metadata.data || null);
    const record = metadata.data.record;
    const persisted = await namespace.persistLocalFirstRepositoryRecord("transferPackage", record);
    if (!persisted || persisted.ok !== true) {
      state.transferPackageDescriptors.delete(transferPackageId);
      try { await namespace.deletePersistedLocalFirstRepositoryRecord("transferPackage", transferPackageId); } catch (_) {}
      return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_PERSISTENCE_FAILED", "Failed", persisted && persisted.data || null);
    }

    state.transferPackageStatus = "Prepared";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_TRANSFER_PACKAGE_PREPARED", "Prepared", {
      transferPackage: internal.clone(record),
      packageHashVerified: true,
      integrityPreflightPassed: true,
      actualTransferRequiredForV2: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      pcRealValidationRequiredForActualV2: true,
      crossDeviceRealValidationRequiredForActualV2: true,
      syncEngineInvoked: false,
      authorityEffect: "none",
      canonicalMutationPerformed: false
    });
  }

  async function restoreLocalTransferPackage(transferPackageId) {
    const id = internal.text(transferPackageId, "");
    if (!id) return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_ID_REQUIRED", "Blocked", null);
    const record = await namespace.getPersistedLocalFirstRepositoryRecord("transferPackage", id);
    if (!record) {
      state.transferPackageStatus = "Not Found";
      return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_NOT_FOUND", "Not Found", { transferPackageId: id, restoreStatus: "not-found" });
    }
    const contract = namespace.validateContract("transferPackageDescriptor", record);
    if (!contract.valid) {
      state.transferPackageStatus = "Corrupted";
      return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_CONTRACT_INVALID", "Corrupted", { transferPackageId: id, restoreStatus: "corrupted", validation: contract });
    }
    if (!integritySnapshotValid(record.integritySnapshot)) {
      state.transferPackageStatus = "Corrupted";
      return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_INTEGRITY_SNAPSHOT_INVALID", "Corrupted", { transferPackageId: id, restoreStatus: "corrupted" });
    }

    let recalculated;
    try {
      recalculated = await sha256Hex(stableStringify(buildHashPayload(record)));
    } catch (error) {
      return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_HASH_UNAVAILABLE", "Blocked", null, { error: { message: error.message, category: "Integrity" } });
    }
    if (recalculated !== record.packageHash) {
      state.transferPackageStatus = "Corrupted";
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_TRANSFER_PACKAGE_HASH_MISMATCH", "Corrupted", {
        transferPackageId: id,
        restoreStatus: "corrupted",
        expectedHash: record.packageHash,
        actualHash: recalculated,
        transferAttempted: false,
        canonicalMutationPerformed: false,
        authorityEffect: "none"
      });
    }

    state.transferPackageDescriptors.set(id, internal.clone(record));
    state.transferPackageStatus = "Restored";
    state.lastTransferPackageRestore = { transferPackageId: id, restoreStatus: "restored", restoredAt: internal.nowIso() };
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_TRANSFER_PACKAGE_RESTORED", "Restored", {
      transferPackageId: id,
      restoreStatus: "restored",
      transferPackage: internal.clone(record),
      packageHashVerified: true,
      integrityPreflightPassed: true,
      actualTransferRequiredForV2: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      pcRealValidationRequiredForActualV2: true,
      crossDeviceRealValidationRequiredForActualV2: true,
      syncEngineInvoked: false,
      authorityEffect: "none",
      canonicalMutationPerformed: false
    });
  }

  async function listLocalTransferPackages() {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords("transferPackage");
    return list.filter(function valid(item) { return item && item.integrityPreflightPassed === true; }).sort(function order(a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
  }

  function getTransferPackageStatus() {
    return {
      status: state.transferPackageStatus || "Ready",
      phase: 5,
      supportedRestoreStatuses: RESTORE_STATUSES.slice(),
      transferPackagePreparationImplemented: true,
      transferPackagePersistenceImplemented: true,
      v2IntegrityPreflightImplemented: true,
      v2TransferIntegrityValidationImplemented: false,
      transferImplemented: false,
      syncEngineImplemented: false,
      actualTransferRequiresPC: true,
      actualV2RequiresCrossDeviceRealValidation: true,
      v3BaseConflictValidationImplemented: false,
      v4TargetEnvironmentValidationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      canonicalMutationAuthority: false,
      explicitAcceptanceImplemented: false,
      automaticConflictWinnerAllowed: false,
      offlineCanonicalFinalizationAllowed: false,
      lastRestore: internal.clone(state.lastTransferPackageRestore || null),
      runtimeTransferPackageCount: state.transferPackageDescriptors instanceof Map ? state.transferPackageDescriptors.size : 0
    };
  }

  Object.assign(namespace.api, {
    prepareLocalTransferPackage: prepareLocalTransferPackage,
    restoreLocalTransferPackage: restoreLocalTransferPackage,
    listLocalTransferPackages: listLocalTransferPackages,
    getTransferPackageStatus: getTransferPackageStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.transferPackage = {
    id: "REPOSITORY-010-TRANSFER-PACKAGE",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 5,
    integrityPreflightImplemented: true,
    actualTransferImplemented: false,
    v2TransferIntegrityValidationImplemented: false,
    pcRequiredForActualTransfer: true,
    syncEngineImplemented: false,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
