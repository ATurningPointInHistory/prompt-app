/* ============================================================
   FILE: 13_local_first_repository_metadata.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.14.0 / Module: Metadata Model 1.11.0
   Phase 15: Sync Session / Difference / Evidence metadata
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


  function createOfflineStagingDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["stagingId", "projectId", "repositoryId", "nodeId", "revisionId", "baseRevisionId", "integrityRecordId", "stateRecordId", "lifecycleStatus"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_OFFLINE_STAGING_DESCRIPTOR_MISSING_FIELDS", "Required offline staging fields are missing.", { missing: missing });
    const record = {
      stagingId: internal.text(source.stagingId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      nodeId: internal.text(source.nodeId, ""),
      revisionId: internal.text(source.revisionId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      integrityRecordId: internal.text(source.integrityRecordId, ""),
      stateRecordId: internal.text(source.stateRecordId, ""),
      lifecycleStatus: internal.text(source.lifecycleStatus, "staged"),
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      syncCandidateCreated: false,
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("offlineStagingDescriptor", record, state.offlineStagingDescriptors, "stagingId", "REPOSITORY010_OFFLINE_STAGING_DESCRIPTOR_READY");
  }

  function createSyncCandidateDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["syncCandidateId", "stagingId", "projectId", "repositoryId", "sourceNodeId", "revisionId", "baseRevisionId", "integrityRecordId", "stagedStateRecordId", "candidateStateRecordId", "v1GateId"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_SYNC_CANDIDATE_DESCRIPTOR_MISSING_FIELDS", "Required sync candidate fields are missing.", { missing: missing });
    const record = {
      syncCandidateId: internal.text(source.syncCandidateId, ""),
      stagingId: internal.text(source.stagingId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      revisionId: internal.text(source.revisionId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      integrityRecordId: internal.text(source.integrityRecordId, ""),
      stagedStateRecordId: internal.text(source.stagedStateRecordId, ""),
      candidateStateRecordId: internal.text(source.candidateStateRecordId, ""),
      v1GateId: internal.text(source.v1GateId, ""),
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
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("syncCandidateDescriptor", record, state.syncCandidateDescriptors, "syncCandidateId", "REPOSITORY010_SYNC_CANDIDATE_DESCRIPTOR_READY");
  }

  function createTransferPackageDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["transferPackageId", "syncCandidateId", "projectId", "repositoryId", "sourceNodeId", "revisionId", "baseRevisionId", "integrityRecordId", "candidateStateRecordId", "v1GateId", "packageHash"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_TRANSFER_PACKAGE_DESCRIPTOR_MISSING_FIELDS", "Required transfer package fields are missing.", { missing: missing });
    const record = {
      transferPackageId: internal.text(source.transferPackageId, ""),
      syncCandidateId: internal.text(source.syncCandidateId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      revisionId: internal.text(source.revisionId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      integrityRecordId: internal.text(source.integrityRecordId, ""),
      candidateStateRecordId: internal.text(source.candidateStateRecordId, ""),
      v1GateId: internal.text(source.v1GateId, ""),
      integritySnapshot: internal.clone(source.integritySnapshot || {}),
      packageHashAlgorithm: "SHA-256",
      packageHash: internal.text(source.packageHash, ""),
      integrityPreflightStatus: "verified",
      integrityPreflightPassed: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("transferPackageDescriptor", record, state.transferPackageDescriptors, "transferPackageId", "REPOSITORY010_TRANSFER_PACKAGE_DESCRIPTOR_READY");
  }

  function createV2TransferReceiptDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["receiptId", "transferPackageId", "projectId", "repositoryId", "sourceNodeId", "targetNodeId", "revisionId", "baseRevisionId", "packageHash", "receiverCalculatedPackageHash", "envelopeHash", "senderRuntimeVersion", "senderOrigin", "senderUserAgent", "transportMode", "sourceFileName"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_V2_TRANSFER_RECEIPT_MISSING_FIELDS", "Required V2 transfer receipt fields are missing.", { missing: missing });
    const record = {
      receiptId: internal.text(source.receiptId, ""),
      transferPackageId: internal.text(source.transferPackageId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      targetNodeId: internal.text(source.targetNodeId, ""),
      revisionId: internal.text(source.revisionId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      packageHashAlgorithm: "SHA-256",
      packageHash: internal.text(source.packageHash, ""),
      receiverCalculatedPackageHash: internal.text(source.receiverCalculatedPackageHash, ""),
      envelopeHash: internal.text(source.envelopeHash, ""),
      senderRuntimeVersion: internal.text(source.senderRuntimeVersion, ""),
      senderOrigin: internal.text(source.senderOrigin, ""),
      senderUserAgent: internal.text(source.senderUserAgent, ""),
      transportMode: "explicit-file-transfer",
      sourceFileName: internal.text(source.sourceFileName, "transfer-package.json"),
      receivedViaUserSelection: source.receivedViaUserSelection === true,
      v2TransferIntegrityValidated: true,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      explicitAcceptanceGranted: false,
      canonicalMutationPerformed: false,
      v3BaseConflictValidated: false,
      v4TargetEnvironmentValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      receivedAt: internal.text(source.receivedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("v2TransferReceiptDescriptor", record, state.v2TransferReceipts, "receiptId", "REPOSITORY010_V2_TRANSFER_RECEIPT_READY");
  }

  function createCanonicalBaselineDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["canonicalBaselineDescriptorId", "projectId", "repositoryId", "canonicalRevisionId", "sourceNodeId", "directoryName", "manifestHash", "scriptSetHash"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_CANONICAL_BASELINE_MISSING_FIELDS", "Required canonical baseline fields are missing.", { missing: missing });
    const record = {
      canonicalBaselineDescriptorId: internal.text(source.canonicalBaselineDescriptorId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      canonicalRevisionId: internal.text(source.canonicalRevisionId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      directoryName: internal.text(source.directoryName, ""),
      manifestHash: internal.text(source.manifestHash, ""),
      scriptSetHash: internal.text(source.scriptSetHash, ""),
      scriptCount: Number(source.scriptCount || 0),
      integrityStatus: "verified",
      baselineMode: "explicit-project-owner",
      explicitlyEstablished: true,
      establishedBy: "Project Owner",
      revisionDerivedFromHash: false,
      revisionDerivedFromVersion: false,
      identityGrantsAuthority: false,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      establishedAt: internal.text(source.establishedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("canonicalBaselineDescriptor", record, state.canonicalBaselineDescriptors, "canonicalBaselineDescriptorId", "REPOSITORY010_CANONICAL_BASELINE_READY");
  }

  function createV3ConflictEvidenceDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["conflictEvidenceId", "v3GateId", "receiptId", "transferPackageId", "projectId", "repositoryId", "sourceNodeId", "targetNodeId", "candidateRevisionId", "candidateBaseRevisionId", "canonicalRevisionId", "candidateState", "resolutionStatus"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_V3_CONFLICT_EVIDENCE_MISSING_FIELDS", "Required V3 conflict evidence fields are missing.", { missing: missing });
    const match = source.baseRevisionMatch === true;
    const record = {
      conflictEvidenceId: internal.text(source.conflictEvidenceId, ""),
      v3GateId: internal.text(source.v3GateId, ""),
      receiptId: internal.text(source.receiptId, ""),
      transferPackageId: internal.text(source.transferPackageId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      targetNodeId: internal.text(source.targetNodeId, ""),
      candidateRevisionId: internal.text(source.candidateRevisionId, ""),
      candidateBaseRevisionId: internal.text(source.candidateBaseRevisionId, ""),
      canonicalRevisionId: internal.text(source.canonicalRevisionId, ""),
      baseRevisionMatch: match,
      conflictDetected: !match,
      candidateState: match ? "validated-base-match" : "conflicted",
      blockingConflict: !match,
      resolutionStatus: match ? "not-required" : "manual-resolution-required",
      automaticWinnerSelected: false,
      timestampWinnerUsed: false,
      hashWinnerUsed: false,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      explicitAcceptanceGranted: false,
      canonicalMutationPerformed: false,
      v4TargetEnvironmentValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      validatedAt: internal.text(source.validatedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("v3ConflictEvidenceDescriptor", record, state.v3ConflictEvidenceDescriptors, "conflictEvidenceId", "REPOSITORY010_V3_CONFLICT_EVIDENCE_READY");
  }

  function createV4TargetValidationEvidenceDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["v4EvidenceId", "v4GateId", "v3ConflictEvidenceId", "v3GateId", "receiptId", "transferPackageId", "projectId", "repositoryId", "sourceNodeId", "targetNodeId", "candidateRevisionId", "candidateBaseRevisionId", "canonicalRevisionId", "baselineManifestHash", "currentManifestHash", "baselineScriptSetHash", "currentScriptSetHash"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_V4_TARGET_EVIDENCE_MISSING_FIELDS", "Required V4 target validation evidence fields are missing.", { missing: missing });
    const match = source.targetEnvironmentMatch === true;
    const record = {
      v4EvidenceId: internal.text(source.v4EvidenceId, ""),
      v4GateId: internal.text(source.v4GateId, ""),
      v3ConflictEvidenceId: internal.text(source.v3ConflictEvidenceId, ""),
      v3GateId: internal.text(source.v3GateId, ""),
      receiptId: internal.text(source.receiptId, ""),
      transferPackageId: internal.text(source.transferPackageId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      targetNodeId: internal.text(source.targetNodeId, ""),
      candidateRevisionId: internal.text(source.candidateRevisionId, ""),
      candidateBaseRevisionId: internal.text(source.candidateBaseRevisionId, ""),
      canonicalRevisionId: internal.text(source.canonicalRevisionId, ""),
      baselineManifestHash: internal.text(source.baselineManifestHash, ""),
      currentManifestHash: internal.text(source.currentManifestHash, ""),
      manifestHashMatch: source.manifestHashMatch === true,
      baselineScriptSetHash: internal.text(source.baselineScriptSetHash, ""),
      currentScriptSetHash: internal.text(source.currentScriptSetHash, ""),
      scriptSetHashMatch: source.scriptSetHashMatch === true,
      baselineScriptCount: Number(source.baselineScriptCount || 0),
      currentScriptCount: Number(source.currentScriptCount || 0),
      scriptCountMatch: source.scriptCountMatch === true,
      repositoryIdentityMatch: source.repositoryIdentityMatch === true,
      targetNodeMatch: source.targetNodeMatch === true,
      directoryMatch: source.directoryMatch === true,
      integrityVerified: source.integrityVerified === true,
      targetEnvironmentMatch: match,
      targetEnvironmentStatus: match ? "validated-target-environment" : "target-drift-detected",
      blockingTargetDrift: !match,
      v4TargetEnvironmentValidated: match,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      explicitAcceptanceGranted: false,
      canonicalMutationPerformed: false,
      v5PostReflectionVerified: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      validatedAt: internal.text(source.validatedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("v4TargetValidationEvidenceDescriptor", record, state.v4TargetValidationEvidenceDescriptors, "v4EvidenceId", "REPOSITORY010_V4_TARGET_VALIDATION_EVIDENCE_READY");
  }

  function createMutationPackageDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["mutationPackageId", "schema", "schemaVersion", "strategy", "projectId", "repositoryId", "sourceNodeId", "candidateId", "candidateRevisionId", "baseRevisionId", "transferPackageId", "sourceTransferPackageHash", "mutationSetHash", "payloadHash", "mutationPackageHash"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_MUTATION_PACKAGE_MISSING_FIELDS", "Required Mutation Package fields are missing.", { missing: missing });
    if (!Array.isArray(source.mutationSet) || !Array.isArray(source.allowedMutationSet) || !Array.isArray(source.enabledMutationTypes) || !Array.isArray(source.fallbackMutationTypes)) {
      return fail("REPOSITORY010_MUTATION_PACKAGE_ARRAY_FIELDS_INVALID", "Mutation Package array fields are invalid.");
    }
    const record = {
      mutationPackageId: internal.text(source.mutationPackageId, ""),
      schema: internal.text(source.schema, ""),
      schemaVersion: internal.text(source.schemaVersion, ""),
      strategy: internal.text(source.strategy, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      sourceNodeId: internal.text(source.sourceNodeId, ""),
      candidateId: internal.text(source.candidateId, ""),
      candidateRevisionId: internal.text(source.candidateRevisionId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      transferPackageId: internal.text(source.transferPackageId, ""),
      sourceTransferPackageHash: internal.text(source.sourceTransferPackageHash, ""),
      mutationCount: Number(source.mutationCount || 0),
      enabledMutationTypes: internal.clone(source.enabledMutationTypes),
      fallbackMutationTypes: internal.clone(source.fallbackMutationTypes),
      mutationSet: internal.clone(source.mutationSet),
      allowedMutationSet: internal.clone(source.allowedMutationSet),
      mutationSetHashAlgorithm: "SHA-256",
      mutationSetHash: internal.text(source.mutationSetHash, ""),
      payloadHashAlgorithm: "SHA-256",
      payloadHash: internal.text(source.payloadHash, ""),
      mutationPackageHashAlgorithm: "SHA-256",
      mutationPackageHash: internal.text(source.mutationPackageHash, ""),
      ide150BridgeMode: "read-only-compatibility-adapter",
      smallestSafeMutationFirst: true,
      fullFileReplacementEnabled: false,
      multiFileZipMutationEnabled: false,
      validationIsApproval: false,
      explicitAcceptanceGranted: false,
      mutationAuthorityGranted: false,
      controlledTransactionStarted: false,
      writeAttempted: false,
      canonicalMutationPerformed: false,
      v5PostReflectionVerified: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("mutationPackageDescriptor", record, state.mutationPackageDescriptors, "mutationPackageId", "REPOSITORY010_MUTATION_PACKAGE_DESCRIPTOR_READY");
  }

  function createAcceptanceTokenDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["acceptanceTokenId", "candidateId", "candidateRevisionId", "baseRevisionId", "targetNodeId", "canonicalRevisionId", "v4EvidenceId", "transferPackageId", "receiptId", "packageHash", "acceptedBy", "issuerIdentity", "issuedAt", "expiresAt", "bindingHash"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_ACCEPTANCE_TOKEN_MISSING_FIELDS", "Required Acceptance Token fields are missing.", { missing: missing });
    if (!Array.isArray(source.allowedMutationSet)) return fail("REPOSITORY010_ACCEPTANCE_TOKEN_MUTATION_SET_INVALID", "allowedMutationSet must be an explicit array.");
    const record = {
      acceptanceTokenId: internal.text(source.acceptanceTokenId, ""),
      acceptanceMode: "MANUAL",
      candidateId: internal.text(source.candidateId, ""),
      candidateRevisionId: internal.text(source.candidateRevisionId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      targetNodeId: internal.text(source.targetNodeId, ""),
      canonicalRevisionId: internal.text(source.canonicalRevisionId, ""),
      v4EvidenceId: internal.text(source.v4EvidenceId, ""),
      transferPackageId: internal.text(source.transferPackageId, ""),
      receiptId: internal.text(source.receiptId, ""),
      packageHash: internal.text(source.packageHash, ""),
      allowedMutationSet: internal.clone(source.allowedMutationSet),
      mutationScopeMode: "explicit",
      policyId: null,
      policyVersion: null,
      delegatedBy: null,
      acceptedBy: internal.text(source.acceptedBy, ""),
      issuerIdentity: internal.text(source.issuerIdentity, ""),
      explicitProjectOwnerAction: source.explicitProjectOwnerAction === true,
      tokenTtlSeconds: Number(source.tokenTtlSeconds || 0),
      issuedAt: internal.text(source.issuedAt, ""),
      expiresAt: internal.text(source.expiresAt, ""),
      oneTimeUse: source.oneTimeUse === true,
      consumedAt: null,
      revokedAt: null,
      tokenStatus: "issued",
      bindingHash: internal.text(source.bindingHash, ""),
      validationIsApproval: false,
      explicitAcceptanceGranted: true,
      mutationAuthorityGranted: false,
      controlledTransactionStarted: false,
      canonicalMutationPerformed: false,
      v5PostReflectionVerified: false,
      syncEngineInvoked: false,
      authorityEffect: "acceptance-token-only",
      immutable: true
    };
    return validateAndStore("acceptanceTokenDescriptor", record, state.acceptanceTokenDescriptors, "acceptanceTokenId", "REPOSITORY010_ACCEPTANCE_TOKEN_DESCRIPTOR_READY");
  }

  function createAcceptanceTokenConsumptionRecord(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["acceptanceTokenId", "transactionId", "mutationPackageId", "candidateId", "candidateRevisionId", "baseRevisionId", "canonicalRevisionId", "targetNodeId", "bindingHash", "allowedMutationSetHash", "consumedAt"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_TOKEN_CONSUMPTION_MISSING_FIELDS", "Required Acceptance Token Consumption fields are missing.", { missing: missing });
    if (state.acceptanceTokenConsumptionRecords instanceof Map && state.acceptanceTokenConsumptionRecords.has(source.acceptanceTokenId)) {
      return fail("REPOSITORY010_TOKEN_ALREADY_CONSUMED", "Acceptance Token already has a Consumption Record.", { acceptanceTokenId: source.acceptanceTokenId });
    }
    const record = {
      acceptanceTokenId: internal.text(source.acceptanceTokenId, ""),
      transactionId: internal.text(source.transactionId, ""),
      mutationPackageId: internal.text(source.mutationPackageId, ""),
      candidateId: internal.text(source.candidateId, ""),
      candidateRevisionId: internal.text(source.candidateRevisionId, ""),
      baseRevisionId: internal.text(source.baseRevisionId, ""),
      canonicalRevisionId: internal.text(source.canonicalRevisionId, ""),
      targetNodeId: internal.text(source.targetNodeId, ""),
      bindingHash: internal.text(source.bindingHash, ""),
      allowedMutationSetHashAlgorithm: "SHA-256",
      allowedMutationSetHash: internal.text(source.allowedMutationSetHash, ""),
      oneTimeUseEnforced: true,
      consumedAt: internal.text(source.consumedAt, internal.nowIso()),
      consumeReason: "controlled-transaction-trial-start",
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "transaction-start-only",
      immutable: true
    };
    return validateAndStore("acceptanceTokenConsumptionRecord", record, state.acceptanceTokenConsumptionRecords, "acceptanceTokenId", "REPOSITORY010_ACCEPTANCE_TOKEN_CONSUMPTION_RECORDED");
  }

  function createDesktopRepositoryDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const required = ["desktopRepositoryDescriptorId", "projectId", "repositoryId", "nodeId", "directoryName", "entryFile", "projectVersion", "manifestHash", "scriptSetHash"];
    const missing = required.filter(function missingField(key) { return !internal.text(source[key], ""); });
    if (missing.length) return fail("REPOSITORY010_DESKTOP_REPOSITORY_DESCRIPTOR_MISSING_FIELDS", "Required desktop repository fields are missing.", { missing: missing });
    const record = {
      desktopRepositoryDescriptorId: internal.text(source.desktopRepositoryDescriptorId, ""),
      projectId: internal.text(source.projectId, ""),
      repositoryId: internal.text(source.repositoryId, ""),
      nodeId: internal.text(source.nodeId, ""),
      nodeType: "canonical",
      directoryName: internal.text(source.directoryName, ""),
      entryFile: internal.text(source.entryFile, "index.html"),
      projectVersion: internal.text(source.projectVersion, ""),
      manifestHash: internal.text(source.manifestHash, ""),
      scriptSetHash: internal.text(source.scriptSetHash, ""),
      scriptCount: Number(source.scriptCount || 0),
      integrityStatus: "verified",
      scanMode: "read-only",
      initialCanonicalNodeObserved: true,
      identityGrantsAuthority: false,
      mutationAuthorityGranted: false,
      writeAttempted: false,
      authorityEffect: "none",
      scannedAt: internal.text(source.scannedAt, internal.nowIso()),
      immutable: true
    };
    return validateAndStore("desktopRepositoryDescriptor", record, state.desktopRepositoryDescriptors, "desktopRepositoryDescriptorId", "REPOSITORY010_DESKTOP_REPOSITORY_DESCRIPTOR_READY");
  }


  function createSyncSessionDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const record = internal.clone(source);
    if (!internal.text(record.syncSessionId, "")) return fail("REPOSITORY010_SYNC_SESSION_DESCRIPTOR_ID_REQUIRED", "syncSessionId is required.");
    return validateAndStore("syncSessionDescriptor", record, state.syncSessionDescriptors, "syncSessionId", "REPOSITORY010_SYNC_SESSION_DESCRIPTOR_READY");
  }

  function createSyncDifferenceDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const record = internal.clone(source);
    if (!internal.text(record.differenceId, "")) return fail("REPOSITORY010_SYNC_DIFFERENCE_DESCRIPTOR_ID_REQUIRED", "differenceId is required.");
    return validateAndStore("syncDifferenceDescriptor", record, state.syncDifferenceDescriptors, "differenceId", "REPOSITORY010_SYNC_DIFFERENCE_DESCRIPTOR_READY");
  }

  function createSyncEvidenceDescriptor(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const record = internal.clone(source);
    if (!internal.text(record.syncEvidenceId, "")) return fail("REPOSITORY010_SYNC_EVIDENCE_DESCRIPTOR_ID_REQUIRED", "syncEvidenceId is required.");
    return validateAndStore("syncEvidenceDescriptor", record, state.syncEvidenceDescriptors, "syncEvidenceId", "REPOSITORY010_SYNC_EVIDENCE_DESCRIPTOR_READY");
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


  function getOfflineStagingDescriptor(stagingId) {
    const record = state.offlineStagingDescriptors.get(internal.text(stagingId, ""));
    return record ? internal.clone(record) : null;
  }

  function getSyncCandidateDescriptor(syncCandidateId) {
    const record = state.syncCandidateDescriptors.get(internal.text(syncCandidateId, ""));
    return record ? internal.clone(record) : null;
  }

  function getTransferPackageDescriptor(transferPackageId) {
    const record = state.transferPackageDescriptors.get(internal.text(transferPackageId, ""));
    return record ? internal.clone(record) : null;
  }

  function getCanonicalBaselineDescriptor(descriptorId) {
    const record = state.canonicalBaselineDescriptors.get(internal.text(descriptorId, ""));
    return record ? internal.clone(record) : null;
  }

  function getV3ConflictEvidenceDescriptor(conflictEvidenceId) {
    const record = state.v3ConflictEvidenceDescriptors.get(internal.text(conflictEvidenceId, ""));
    return record ? internal.clone(record) : null;
  }

  function getV4TargetValidationEvidenceDescriptor(v4EvidenceId) {
    const record = state.v4TargetValidationEvidenceDescriptors.get(internal.text(v4EvidenceId, ""));
    return record ? internal.clone(record) : null;
  }

  function getMutationPackageDescriptor(mutationPackageId) {
    const record = state.mutationPackageDescriptors.get(internal.text(mutationPackageId, ""));
    return record ? internal.clone(record) : null;
  }

  function getAcceptanceTokenDescriptor(acceptanceTokenId) {
    const record = state.acceptanceTokenDescriptors.get(internal.text(acceptanceTokenId, ""));
    return record ? internal.clone(record) : null;
  }

  function getAcceptanceTokenConsumptionRecord(acceptanceTokenId) {
    const record = state.acceptanceTokenConsumptionRecords.get(internal.text(acceptanceTokenId, ""));
    return record ? internal.clone(record) : null;
  }

  function getDesktopRepositoryDescriptor(descriptorId) {
    const record = state.desktopRepositoryDescriptors.get(internal.text(descriptorId, ""));
    return record ? internal.clone(record) : null;
  }

  function getV2TransferReceiptDescriptor(receiptId) {
    const record = state.v2TransferReceipts.get(internal.text(receiptId, ""));
    return record ? internal.clone(record) : null;
  }


  function getSyncSessionDescriptor(syncSessionId) {
    const record = state.syncSessionDescriptors.get(internal.text(syncSessionId, ""));
    return record ? internal.clone(record) : null;
  }

  function getSyncDifferenceDescriptor(differenceId) {
    const record = state.syncDifferenceDescriptors.get(internal.text(differenceId, ""));
    return record ? internal.clone(record) : null;
  }

  function getSyncEvidenceDescriptor(syncEvidenceId) {
    const record = state.syncEvidenceDescriptors.get(internal.text(syncEvidenceId, ""));
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
      persistenceImplemented: VERSION_MANIFEST.implementation.persistenceImplemented === true,
      syncEngineImplemented: VERSION_MANIFEST.implementation.syncEngineImplemented === true,
      counts: {
        nodeIdentities: state.nodeIdentities.size,
        revisions: state.revisions.size,
        integrityRecords: state.integrityRecords.size,
        stateRecords: state.stateRecords.size,
        validationGates: state.validationGates.size,
        offlineStagingDescriptors: state.offlineStagingDescriptors.size,
        syncCandidateDescriptors: state.syncCandidateDescriptors.size,
        transferPackageDescriptors: state.transferPackageDescriptors.size,
        desktopRepositoryDescriptors: state.desktopRepositoryDescriptors.size,
        v2TransferReceipts: state.v2TransferReceipts.size,
        canonicalBaselineDescriptors: state.canonicalBaselineDescriptors.size,
        v3ConflictEvidenceDescriptors: state.v3ConflictEvidenceDescriptors.size,
        v4TargetValidationEvidenceDescriptors: state.v4TargetValidationEvidenceDescriptors.size,
        mutationPackageDescriptors: state.mutationPackageDescriptors.size,
        acceptanceTokenDescriptors: state.acceptanceTokenDescriptors.size,
        syncSessionDescriptors: state.syncSessionDescriptors instanceof Map ? state.syncSessionDescriptors.size : 0,
        syncDifferenceDescriptors: state.syncDifferenceDescriptors instanceof Map ? state.syncDifferenceDescriptors.size : 0,
        syncEvidenceDescriptors: state.syncEvidenceDescriptors instanceof Map ? state.syncEvidenceDescriptors.size : 0
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
    createOfflineStagingDescriptor: createOfflineStagingDescriptor,
    createSyncCandidateDescriptor: createSyncCandidateDescriptor,
    createTransferPackageDescriptor: createTransferPackageDescriptor,
    createV2TransferReceiptDescriptor: createV2TransferReceiptDescriptor,
    createCanonicalBaselineDescriptor: createCanonicalBaselineDescriptor,
    createV3ConflictEvidenceDescriptor: createV3ConflictEvidenceDescriptor,
    createV4TargetValidationEvidenceDescriptor: createV4TargetValidationEvidenceDescriptor,
    createMutationPackageDescriptor: createMutationPackageDescriptor,
    createAcceptanceTokenDescriptor: createAcceptanceTokenDescriptor,
    createAcceptanceTokenConsumptionRecord: createAcceptanceTokenConsumptionRecord,
    createDesktopRepositoryDescriptor: createDesktopRepositoryDescriptor,
    createSyncSessionDescriptor: createSyncSessionDescriptor,
    createSyncDifferenceDescriptor: createSyncDifferenceDescriptor,
    createSyncEvidenceDescriptor: createSyncEvidenceDescriptor,
    getRepositoryNodeIdentity: getRepositoryNodeIdentity,
    getRepositoryRevision: getRepositoryRevision,
    getRepositoryIntegrityRecord: getRepositoryIntegrityRecord,
    getRepositoryStateRecord: getRepositoryStateRecord,
    getValidationGateDescriptor: getValidationGateDescriptor,
    getOfflineStagingDescriptor: getOfflineStagingDescriptor,
    getSyncCandidateDescriptor: getSyncCandidateDescriptor,
    getTransferPackageDescriptor: getTransferPackageDescriptor,
    getV2TransferReceiptDescriptor: getV2TransferReceiptDescriptor,
    getCanonicalBaselineDescriptor: getCanonicalBaselineDescriptor,
    getV3ConflictEvidenceDescriptor: getV3ConflictEvidenceDescriptor,
    getV4TargetValidationEvidenceDescriptor: getV4TargetValidationEvidenceDescriptor,
    getMutationPackageDescriptor: getMutationPackageDescriptor,
    getAcceptanceTokenDescriptor: getAcceptanceTokenDescriptor,
    getAcceptanceTokenConsumptionRecord: getAcceptanceTokenConsumptionRecord,
    getDesktopRepositoryDescriptor: getDesktopRepositoryDescriptor,
    getSyncSessionDescriptor: getSyncSessionDescriptor,
    getSyncDifferenceDescriptor: getSyncDifferenceDescriptor,
    getSyncEvidenceDescriptor: getSyncEvidenceDescriptor,
    getMetadataModelStatus: getMetadataModelStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.metadata = {
    id: "REPOSITORY-010-METADATA-MODEL",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    persistenceImplemented: VERSION_MANIFEST.implementation.persistenceImplemented === true,
    syncEngineImplemented: VERSION_MANIFEST.implementation.syncEngineImplemented === true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
