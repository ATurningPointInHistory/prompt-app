/* ============================================================
   FILE: 13_local_first_repository_metadata.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.0.0 / Module: Metadata Model 1.0.0
   Phase 1: Foundation / Contracts / Metadata Model
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Metadata blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("metadata");

  function fail(code, message, data) {
    return internal.buildResult(false, code, "Blocked", data || null, { error: { message: message, category: "Metadata" } });
  }

  function validateAndStore(contractKey, record, collection, idField, readyCode) {
    if (typeof namespace.validateContract !== "function") return fail("REPOSITORY010_CONTRACT_API_UNAVAILABLE", "Contract validation API is unavailable.");
    const validation = namespace.validateContract(contractKey, record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_METADATA_CONTRACT_INVALID", "Blocked", { record: record, validation: validation });
    const frozen = internal.deepFreeze(internal.clone(record));
    collection.set(record[idField], frozen);
    internal.touch();
    return internal.buildResult(true, readyCode, "Ready", { record: internal.clone(frozen), validation: validation });
  }

  function createRepositoryNodeIdentity(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["projectId", "repositoryId", "nodeId", "nodeType"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_NODE_IDENTITY_MISSING_FIELDS", "Required node identity fields are missing.", { missing: missing });
    const record = {
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      nodeId: internal.text(source.nodeId, ""),
      nodeType: internal.text(source.nodeType, ""),
      identityGrantsAuthority: false,
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("repositoryNodeIdentity", record, state.nodeIdentities, "nodeId", "REPOSITORY010_NODE_IDENTITY_READY");
  }

  function createRepositoryRevision(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["revisionId", "sourceNodeId"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_REVISION_MISSING_FIELDS", "Required revision fields are missing.", { missing: missing });
    const record = {
      revisionId: internal.text(source.revisionId, ""),
      baseRevisionId: source.baseRevisionId == null ? null : internal.text(source.baseRevisionId, ""),
      parentRevisionId: source.parentRevisionId == null ? null : internal.text(source.parentRevisionId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("repositoryRevision", record, state.revisions, "revisionId", "REPOSITORY010_REVISION_READY");
  }

  function createRepositoryIntegrityRecord(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["revisionId", "manifestHash", "scriptSetHash", "contentHash", "repositoryStateHash", "integrityStatus"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_INTEGRITY_MISSING_FIELDS", "Required integrity fields are missing.", { missing: missing });
    const record = {
      integrityRecordId: internal.text(source.integrityRecordId, internal.nextId("REPOSITORY-010-INTEGRITY")),
      revisionId: internal.text(source.revisionId, ""),
      hashAlgorithm: "SHA-256",
      fileHashes: internal.isPlainObject(source.fileHashes) ? internal.clone(source.fileHashes) : {},
      manifestHash: internal.text(source.manifestHash, ""),
      scriptSetHash: internal.text(source.scriptSetHash, ""),
      contentHash: internal.text(source.contentHash, ""),
      repositoryStateHash: internal.text(source.repositoryStateHash, ""),
      integrityStatus: internal.text(source.integrityStatus, ""),
      hashGeneratedAt: internal.text(source.hashGeneratedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("repositoryIntegrityRecord", record, state.integrityRecords, "integrityRecordId", "REPOSITORY010_INTEGRITY_RECORD_READY");
  }

  function createRepositoryStateRecord(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["repositoryId", "nodeId", "revisionId", "state", "integrityStatus"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_STATE_MISSING_FIELDS", "Required repository state fields are missing.", { missing: missing });
    const record = {
      stateRecordId: internal.text(source.stateRecordId, internal.nextId("REPOSITORY-010-STATE")),
      repositoryId: internal.text(source.repositoryId, ""),
      nodeId: internal.text(source.nodeId, ""),
      revisionId: internal.text(source.revisionId, ""),
      state: internal.text(source.state, ""),
      integrityStatus: internal.text(source.integrityStatus, ""),
      authorityEffect: "none",
      recordedAt: internal.text(source.recordedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("repositoryStateRecord", record, state.stateRecords, "stateRecordId", "REPOSITORY010_STATE_RECORD_READY");
  }

  function createValidationGateDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["gateId", "capabilityId", "gateType", "applicability", "result"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_VALIDATION_GATE_MISSING_FIELDS", "Required validation gate fields are missing.", { missing: missing });
    const record = {
      gateId: internal.text(source.gateId, ""),
      capabilityId: internal.text(source.capabilityId, ""),
      gateType: internal.text(source.gateType, ""),
      applicability: internal.text(source.applicability, ""),
      result: internal.text(source.result, ""),
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      recordedAt: internal.text(source.recordedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("validationGateDescriptor", record, state.validationGates, "gateId", "REPOSITORY010_VALIDATION_GATE_READY");
  }

  function getRepositoryNodeIdentity(nodeId) {
    const record = state.nodeIdentities.get(internal.text(nodeId, ""));
    return record ? internal.clone(record) : null;
  }

  function getRepositoryRevision(revisionId) {
    const record = state.revisions.get(internal.text(revisionId, ""));
    return record ? internal.clone(record) : null;
  }

  function getRepositoryIntegrityRecord(integrityRecordId) {
    const record = state.integrityRecords.get(internal.text(integrityRecordId, ""));
    return record ? internal.clone(record) : null;
  }

  function getRepositoryStateRecord(stateRecordId) {
    const record = state.stateRecords.get(internal.text(stateRecordId, ""));
    return record ? internal.clone(record) : null;
  }

  function getValidationGateDescriptor(gateId) {
    const record = state.validationGates.get(internal.text(gateId, ""));
    return record ? internal.clone(record) : null;
  }

  function getMetadataModelStatus() {
    return {
      status: "Ready",
      phase: 1,
      repositoryStates: internal.clone(VERSION_MANIFEST.repositoryStates),
      integrityStatuses: internal.clone(VERSION_MANIFEST.integrity.statuses),
      hashAlgorithm: VERSION_MANIFEST.integrity.hashAlgorithm,
      hashLayers: internal.clone(VERSION_MANIFEST.integrity.hashLayers),
      gateApplicability: internal.clone(VERSION_MANIFEST.validationAuthority.gateApplicability),
      gateResults: internal.clone(VERSION_MANIFEST.validationAuthority.gateResults),
      identityGrantsAuthority: false,
      stateGrantsAuthority: false,
      validationGrantsApproval: false,
      persistenceImplemented: false,
      syncEngineImplemented: false,
      counts: {
        nodeIdentities: state.nodeIdentities.size,
        revisions: state.revisions.size,
        integrityRecords: state.integrityRecords.size,
        stateRecords: state.stateRecords.size,
        validationGates: state.validationGates.size
      }
    };
  }

  function initializeMetadataModel() {
    namespace.modules.metadata.status = "Ready";
    return internal.buildResult(true, "REPOSITORY010_METADATA_MODEL_INITIALIZED", "Ready", getMetadataModelStatus());
  }

  Object.assign(namespace.api, {
    initializeMetadataModel: initializeMetadataModel,
    createRepositoryNodeIdentity: createRepositoryNodeIdentity,
    createRepositoryRevision: createRepositoryRevision,
    createRepositoryIntegrityRecord: createRepositoryIntegrityRecord,
    createRepositoryStateRecord: createRepositoryStateRecord,
    createValidationGateDescriptor: createValidationGateDescriptor,
    getRepositoryNodeIdentity: getRepositoryNodeIdentity,
    getRepositoryRevision: getRepositoryRevision,
    getRepositoryIntegrityRecord: getRepositoryIntegrityRecord,
    getRepositoryStateRecord: getRepositoryStateRecord,
    getValidationGateDescriptor: getValidationGateDescriptor,
    getMetadataModelStatus: getMetadataModelStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.metadata = {
    id: "REPOSITORY-010-METADATA-MODEL",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    persistenceImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
