/* ============================================================
   FILE: 13_local_first_repository_contracts.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.14.0 / Module: Contracts 1.12.0
   Phase 15: Controlled Sync Foundation contracts
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Contracts blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("contracts");

  function field(name, options) { return Object.assign({ name: name, required: false }, options || {}); }

  const BUILT_IN_CONTRACTS = [
    {
      key: "foundation",
      name: "REPOSITORY-010 Foundation Contract",
      fields: [
        field("componentId", { required: true, type: "string", enum: ["REPOSITORY-010"] }),
        field("version", { required: true, type: "string", enum: ["1.0.0"] }),
        field("implementationPhase", { required: true, type: "string" }),
        field("architectureStatus", { required: true, type: "string" }),
        field("logicalAuthority", { required: true, type: "string", enum: ["AI Prompt OS Repository"] }),
        field("initialCanonicalNode", { required: true, type: "string", enum: ["PC Local Repository"] }),
        field("syncMode", { required: true, type: "string", enum: ["controlled-two-way"] }),
        field("readOnlyFoundation", { required: true, type: "boolean", enum: [true] }),
        field("persistentMutationImplemented", { required: true, type: "boolean", enum: [false] }),
        field("persistenceImplemented", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineImplemented", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "repositoryNodeIdentity",
      name: "REPOSITORY-010 Repository Node Identity Contract",
      fields: [
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("nodeId", { required: true, type: "string" }),
        field("nodeType", { required: true, type: "string" }),
        field("identityGrantsAuthority", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "repositoryRevision",
      name: "REPOSITORY-010 Repository Revision Contract",
      fields: [
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string|null" }),
        field("parentRevisionId", { required: true, type: "string|null" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "repositoryIntegrityRecord",
      name: "REPOSITORY-010 Repository Integrity Record Contract",
      fields: [
        field("integrityRecordId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("hashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("fileHashes", { required: true, type: "object" }),
        field("manifestHash", { required: true, type: "string" }),
        field("scriptSetHash", { required: true, type: "string" }),
        field("contentHash", { required: true, type: "string" }),
        field("repositoryStateHash", { required: true, type: "string" }),
        field("integrityStatus", { required: true, type: "string", enum: VERSION_MANIFEST.integrity.statuses }),
        field("hashGeneratedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "repositoryStateRecord",
      name: "REPOSITORY-010 Repository State Record Contract",
      fields: [
        field("stateRecordId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("nodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("state", { required: true, type: "string", enum: VERSION_MANIFEST.repositoryStates }),
        field("integrityStatus", { required: true, type: "string", enum: VERSION_MANIFEST.integrity.statuses }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("recordedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "validationGateDescriptor",
      name: "REPOSITORY-010 Validation Gate Descriptor Contract",
      fields: [
        field("gateId", { required: true, type: "string" }),
        field("capabilityId", { required: true, type: "string" }),
        field("gateType", { required: true, type: "string" }),
        field("applicability", { required: true, type: "string", enum: VERSION_MANIFEST.validationAuthority.gateApplicability }),
        field("result", { required: true, type: "string", enum: VERSION_MANIFEST.validationAuthority.gateResults }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("recordedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "offlineStagingDescriptor",
      name: "REPOSITORY-010 Offline Staging Descriptor Contract",
      fields: [
        field("stagingId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("nodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("integrityRecordId", { required: true, type: "string" }),
        field("stateRecordId", { required: true, type: "string" }),
        field("lifecycleStatus", { required: true, type: "string", enum: ["staged"] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncCandidateCreated", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "syncCandidateDescriptor",
      name: "REPOSITORY-010 Sync Candidate Descriptor Contract",
      fields: [
        field("syncCandidateId", { required: true, type: "string" }),
        field("stagingId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("integrityRecordId", { required: true, type: "string" }),
        field("stagedStateRecordId", { required: true, type: "string" }),
        field("candidateStateRecordId", { required: true, type: "string" }),
        field("v1GateId", { required: true, type: "string" }),
        field("lifecycleStatus", { required: true, type: "string", enum: ["sync-candidate"] }),
        field("validationLayer", { required: true, type: "string", enum: ["V1 Local Validation"] }),
        field("localValidationPassed", { required: true, type: "boolean", enum: [true] }),
        field("transferAttempted", { required: true, type: "boolean", enum: [false] }),
        field("transferIntegrityValidated", { required: true, type: "boolean", enum: [false] }),
        field("baseConflictValidated", { required: true, type: "boolean", enum: [false] }),
        field("targetEnvironmentValidated", { required: true, type: "boolean", enum: [false] }),
        field("explicitAcceptanceReceived", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "transferPackageDescriptor",
      name: "REPOSITORY-010 Transfer Package Descriptor Contract",
      fields: [
        field("transferPackageId", { required: true, type: "string" }),
        field("syncCandidateId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("integrityRecordId", { required: true, type: "string" }),
        field("candidateStateRecordId", { required: true, type: "string" }),
        field("v1GateId", { required: true, type: "string" }),
        field("integritySnapshot", { required: true, type: "object" }),
        field("packageHashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("packageHash", { required: true, type: "string" }),
        field("integrityPreflightStatus", { required: true, type: "string", enum: ["verified"] }),
        field("integrityPreflightPassed", { required: true, type: "boolean", enum: [true] }),
        field("transferAttempted", { required: true, type: "boolean", enum: [false] }),
        field("transferCompleted", { required: true, type: "boolean", enum: [false] }),
        field("v2TransferIntegrityValidated", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "v2TransferReceiptDescriptor",
      name: "REPOSITORY-010 V2 Transfer Receipt Descriptor Contract",
      fields: [
        field("receiptId", { required: true, type: "string" }),
        field("transferPackageId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("packageHashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("packageHash", { required: true, type: "string" }),
        field("receiverCalculatedPackageHash", { required: true, type: "string" }),
        field("envelopeHash", { required: true, type: "string" }),
        field("senderRuntimeVersion", { required: true, type: "string" }),
        field("senderOrigin", { required: true, type: "string" }),
        field("senderUserAgent", { required: true, type: "string" }),
        field("transportMode", { required: true, type: "string", enum: ["explicit-file-transfer"] }),
        field("sourceFileName", { required: true, type: "string" }),
        field("receivedViaUserSelection", { required: true, type: "boolean", enum: [true] }),
        field("v2TransferIntegrityValidated", { required: true, type: "boolean", enum: [true] }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("explicitAcceptanceGranted", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("v3BaseConflictValidated", { required: true, type: "boolean", enum: [false] }),
        field("v4TargetEnvironmentValidated", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("receivedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "canonicalBaselineDescriptor",
      name: "REPOSITORY-010 Explicit Canonical Baseline Descriptor Contract",
      fields: [
        field("canonicalBaselineDescriptorId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("canonicalRevisionId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("directoryName", { required: true, type: "string" }),
        field("manifestHash", { required: true, type: "string" }),
        field("scriptSetHash", { required: true, type: "string" }),
        field("scriptCount", { required: true, type: "number" }),
        field("integrityStatus", { required: true, type: "string", enum: ["verified"] }),
        field("baselineMode", { required: true, type: "string", enum: ["explicit-project-owner"] }),
        field("explicitlyEstablished", { required: true, type: "boolean", enum: [true] }),
        field("establishedBy", { required: true, type: "string", enum: ["Project Owner"] }),
        field("revisionDerivedFromHash", { required: true, type: "boolean", enum: [false] }),
        field("revisionDerivedFromVersion", { required: true, type: "boolean", enum: [false] }),
        field("identityGrantsAuthority", { required: true, type: "boolean", enum: [false] }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("establishedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "v3ConflictEvidenceDescriptor",
      name: "REPOSITORY-010 V3 Base Revision / Conflict Evidence Descriptor Contract",
      fields: [
        field("conflictEvidenceId", { required: true, type: "string" }),
        field("v3GateId", { required: true, type: "string" }),
        field("receiptId", { required: true, type: "string" }),
        field("transferPackageId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string" }),
        field("candidateRevisionId", { required: true, type: "string" }),
        field("candidateBaseRevisionId", { required: true, type: "string" }),
        field("canonicalRevisionId", { required: true, type: "string" }),
        field("baseRevisionMatch", { required: true, type: "boolean" }),
        field("conflictDetected", { required: true, type: "boolean" }),
        field("candidateState", { required: true, type: "string", enum: ["validated-base-match", "conflicted"] }),
        field("blockingConflict", { required: true, type: "boolean" }),
        field("resolutionStatus", { required: true, type: "string", enum: ["not-required", "manual-resolution-required"] }),
        field("automaticWinnerSelected", { required: true, type: "boolean", enum: [false] }),
        field("timestampWinnerUsed", { required: true, type: "boolean", enum: [false] }),
        field("hashWinnerUsed", { required: true, type: "boolean", enum: [false] }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("explicitAcceptanceGranted", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("v4TargetEnvironmentValidated", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("validatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "v4TargetValidationEvidenceDescriptor",
      name: "REPOSITORY-010 V4 Target Environment Validation Evidence Descriptor Contract",
      fields: [
        field("v4EvidenceId", { required: true, type: "string" }),
        field("v4GateId", { required: true, type: "string" }),
        field("v3ConflictEvidenceId", { required: true, type: "string" }),
        field("v3GateId", { required: true, type: "string" }),
        field("receiptId", { required: true, type: "string" }),
        field("transferPackageId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string" }),
        field("candidateRevisionId", { required: true, type: "string" }),
        field("candidateBaseRevisionId", { required: true, type: "string" }),
        field("canonicalRevisionId", { required: true, type: "string" }),
        field("baselineManifestHash", { required: true, type: "string" }),
        field("currentManifestHash", { required: true, type: "string" }),
        field("manifestHashMatch", { required: true, type: "boolean" }),
        field("baselineScriptSetHash", { required: true, type: "string" }),
        field("currentScriptSetHash", { required: true, type: "string" }),
        field("scriptSetHashMatch", { required: true, type: "boolean" }),
        field("baselineScriptCount", { required: true, type: "number" }),
        field("currentScriptCount", { required: true, type: "number" }),
        field("scriptCountMatch", { required: true, type: "boolean" }),
        field("repositoryIdentityMatch", { required: true, type: "boolean" }),
        field("targetNodeMatch", { required: true, type: "boolean" }),
        field("directoryMatch", { required: true, type: "boolean" }),
        field("integrityVerified", { required: true, type: "boolean" }),
        field("targetEnvironmentMatch", { required: true, type: "boolean" }),
        field("targetEnvironmentStatus", { required: true, type: "string", enum: ["validated-target-environment", "target-drift-detected"] }),
        field("blockingTargetDrift", { required: true, type: "boolean" }),
        field("v4TargetEnvironmentValidated", { required: true, type: "boolean" }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("explicitAcceptanceGranted", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("v5PostReflectionVerified", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("validatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "mutationPackageDescriptor",
      name: "REPOSITORY-010 Hybrid Mutation Package Descriptor Contract",
      fields: [
        field("mutationPackageId", { required: true, type: "string" }),
        field("schema", { required: true, type: "string", enum: ["REPOSITORY-010-HYBRID-MUTATION-PACKAGE"] }),
        field("schemaVersion", { required: true, type: "string", enum: ["1.0.0"] }),
        field("strategy", { required: true, type: "string", enum: ["smallest-safe-mutation-first"] }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("candidateId", { required: true, type: "string" }),
        field("candidateRevisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("transferPackageId", { required: true, type: "string" }),
        field("sourceTransferPackageHash", { required: true, type: "string" }),
        field("mutationCount", { required: true, type: "number" }),
        field("enabledMutationTypes", { required: true, type: "array" }),
        field("fallbackMutationTypes", { required: true, type: "array" }),
        field("mutationSet", { required: true, type: "array" }),
        field("allowedMutationSet", { required: true, type: "array" }),
        field("mutationSetHashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("mutationSetHash", { required: true, type: "string" }),
        field("payloadHashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("payloadHash", { required: true, type: "string" }),
        field("mutationPackageHashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("mutationPackageHash", { required: true, type: "string" }),
        field("ide150BridgeMode", { required: true, type: "string", enum: ["read-only-compatibility-adapter"] }),
        field("smallestSafeMutationFirst", { required: true, type: "boolean", enum: [true] }),
        field("fullFileReplacementEnabled", { required: true, type: "boolean", enum: [false] }),
        field("multiFileZipMutationEnabled", { required: true, type: "boolean", enum: [false] }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("explicitAcceptanceGranted", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("controlledTransactionStarted", { required: true, type: "boolean", enum: [false] }),
        field("writeAttempted", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("v5PostReflectionVerified", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "acceptanceTokenDescriptor",
      name: "REPOSITORY-010 Manual Acceptance Token Descriptor Contract",
      fields: [
        field("acceptanceTokenId", { required: true, type: "string" }),
        field("acceptanceMode", { required: true, type: "string", enum: ["MANUAL"] }),
        field("candidateId", { required: true, type: "string" }),
        field("candidateRevisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string" }),
        field("canonicalRevisionId", { required: true, type: "string" }),
        field("v4EvidenceId", { required: true, type: "string" }),
        field("transferPackageId", { required: true, type: "string" }),
        field("receiptId", { required: true, type: "string" }),
        field("packageHash", { required: true, type: "string" }),
        field("allowedMutationSet", { required: true, type: "array" }),
        field("mutationScopeMode", { required: true, type: "string", enum: ["explicit"] }),
        field("policyId", { required: true, type: "string|null", enum: [null] }),
        field("policyVersion", { required: true, type: "string|null", enum: [null] }),
        field("delegatedBy", { required: true, type: "string|null", enum: [null] }),
        field("acceptedBy", { required: true, type: "string", enum: ["Project Owner"] }),
        field("issuerIdentity", { required: true, type: "string", enum: ["Project Owner"] }),
        field("explicitProjectOwnerAction", { required: true, type: "boolean", enum: [true] }),
        field("tokenTtlSeconds", { required: true, type: "number", enum: [900] }),
        field("issuedAt", { required: true, type: "string" }),
        field("expiresAt", { required: true, type: "string" }),
        field("oneTimeUse", { required: true, type: "boolean", enum: [true] }),
        field("consumedAt", { required: true, type: "string|null", enum: [null] }),
        field("revokedAt", { required: true, type: "string|null", enum: [null] }),
        field("tokenStatus", { required: true, type: "string", enum: ["issued"] }),
        field("bindingHash", { required: true, type: "string" }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("explicitAcceptanceGranted", { required: true, type: "boolean", enum: [true] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("controlledTransactionStarted", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("v5PostReflectionVerified", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["acceptance-token-only"] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "acceptanceTokenConsumptionRecord",
      name: "REPOSITORY-010 Acceptance Token Consumption Record Contract",
      fields: [
        field("acceptanceTokenId", { required: true, type: "string" }),
        field("transactionId", { required: true, type: "string" }),
        field("mutationPackageId", { required: true, type: "string" }),
        field("candidateId", { required: true, type: "string" }),
        field("candidateRevisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("canonicalRevisionId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string", enum: ["REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL"] }),
        field("bindingHash", { required: true, type: "string" }),
        field("allowedMutationSetHashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("allowedMutationSetHash", { required: true, type: "string" }),
        field("oneTimeUseEnforced", { required: true, type: "boolean", enum: [true] }),
        field("consumedAt", { required: true, type: "string" }),
        field("consumeReason", { required: true, type: "string", enum: ["controlled-transaction-trial-start"] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["transaction-start-only"] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "functionRollbackBackupRecord",
      name: "REPOSITORY-010 Function Rollback Backup Record Contract",
      fields: [
        field("backupId", { required: true, type: "string" }),
        field("transactionId", { required: true, type: "string" }),
        field("mutationPackageId", { required: true, type: "string" }),
        field("mutationId", { required: true, type: "string" }),
        field("targetFile", { required: true, type: "string" }),
        field("targetFunction", { required: true, type: "string" }),
        field("beforeFunctionSource", { required: true, type: "string" }),
        field("beforeFunctionSha256", { required: true, type: "string" }),
        field("expectedAfterFunctionSha256", { required: true, type: "string" }),
        field("beforeFileSha256", { required: true, type: "string" }),
        field("expectedAfterFileSha256", { required: true, type: "string" }),
        field("backupMode", { required: true, type: "string", enum: ["function-level-primary"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "fullFileEmergencyBackupRecord",
      name: "REPOSITORY-010 Full-File Emergency Backup Record Contract",
      fields: [
        field("backupId", { required: true, type: "string" }),
        field("transactionId", { required: true, type: "string" }),
        field("mutationPackageId", { required: true, type: "string" }),
        field("targetFile", { required: true, type: "string" }),
        field("completeBeforeFileSource", { required: true, type: "string" }),
        field("beforeFileSha256", { required: true, type: "string" }),
        field("expectedAfterFileSha256", { required: true, type: "string" }),
        field("backupMode", { required: true, type: "string", enum: ["full-file-emergency"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "controlledTransactionJournalRecord",
      name: "REPOSITORY-010 Controlled Transaction Journal Record Contract",
      fields: [
        field("schema", { required: true, type: "string", enum: ["REPOSITORY-010-CONTROLLED-TRANSACTION-JOURNAL"] }),
        field("schemaVersion", { required: true, type: "string", enum: ["1.0.0"] }),
        field("transactionId", { required: true, type: "string" }),
        field("acceptanceTokenId", { required: true, type: "string" }),
        field("mutationPackageId", { required: true, type: "string" }),
        field("candidateId", { required: true, type: "string" }),
        field("candidateRevisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("canonicalRevisionId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string", enum: ["REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL"] }),
        field("targetFile", { required: true, type: "string" }),
        field("targetFunction", { required: true, type: "string" }),
        field("mutationId", { required: true, type: "string" }),
        field("beforeFunctionSha256", { required: true, type: "string" }),
        field("afterFunctionSha256", { required: true, type: "string" }),
        field("beforeFileSha256", { required: true, type: "string" }),
        field("afterFileSha256", { required: true, type: "string" }),
        field("functionBackupId", { required: true, type: "string" }),
        field("fullFileBackupId", { required: true, type: "string" }),
        field("status", { required: true, type: "string" }),
        field("backupVerified", { required: true, type: "boolean" }),
        field("journalPersisted", { required: true, type: "boolean", enum: [true] }),
        field("acceptanceTokenConsumed", { required: true, type: "boolean" }),
        field("physicalWritePerformed", { required: true, type: "boolean" }),
        field("readbackVerified", { required: true, type: "boolean" }),
        field("rollbackAttempted", { required: true, type: "boolean" }),
        field("rollbackVerified", { required: true, type: "boolean" }),
        field("emergencyRollbackUsed", { required: true, type: "boolean" }),
        field("repositoryRestored", { required: true, type: "boolean" }),
        field("forcedFailureTrial", { required: true, type: "boolean" }),
        field("closureWritePerformed", { required: true, type: "boolean" }),
        field("persistentReflectionPerformed", { required: true, type: "boolean" }),
        field("controlledCanonicalTransactionImplemented", { required: true, type: "boolean" }),
        field("canonicalMutationPerformed", { required: true, type: "boolean" }),
        field("v5PostReflectionVerified", { required: true, type: "boolean" }),
        field("canonicalRevisionPromoted", { required: true, type: "boolean", enum: [false] }),
        field("automaticBaselinePromotionPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["controlled-trial-only", "persistent-reflection"] }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" })
      ]
    }
    ,{
      key: "baselinePromotionCandidateDescriptor",
      name: "REPOSITORY-010 Baseline Promotion Candidate Descriptor Contract",
      fields: [
        field("promotionCandidateId", { required: true, type: "string" }),
        field("sourceEvidenceId", { required: true, type: "string" }),
        field("sourceTransactionId", { required: true, type: "string" }),
        field("previousCanonicalRevisionId", { required: true, type: "string" }),
        field("suggestedCanonicalRevisionId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string", enum: ["REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL"] }),
        field("directoryName", { required: true, type: "string" }),
        field("manifestHash", { required: true, type: "string" }),
        field("scriptSetHash", { required: true, type: "string" }),
        field("scriptCount", { required: true, type: "number" }),
        field("targetFile", { required: true, type: "string" }),
        field("targetFileSha256", { required: true, type: "string" }),
        field("manifestFileSha256", { required: true, type: "string" }),
        field("indexFileSha256", { required: true, type: "string" }),
        field("repositoryStateHash", { required: true, type: "string" }),
        field("sourceV5Verified", { required: true, type: "boolean", enum: [true] }),
        field("freshRevalidationPassed", { required: true, type: "boolean", enum: [true] }),
        field("exactPostV5FileHashesVerified", { required: true, type: "boolean", enum: [true] }),
        field("projectOwnerConfirmationRequired", { required: true, type: "boolean", enum: [true] }),
        field("automaticPromotionAllowed", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "baselinePromotionEvidenceDescriptor",
      name: "REPOSITORY-010 Baseline Promotion Evidence Descriptor Contract",
      fields: [
        field("promotionEvidenceId", { required: true, type: "string" }),
        field("promotionCandidateId", { required: true, type: "string" }),
        field("sourceEvidenceId", { required: true, type: "string" }),
        field("sourceTransactionId", { required: true, type: "string" }),
        field("previousCanonicalRevisionId", { required: true, type: "string" }),
        field("canonicalRevisionId", { required: true, type: "string" }),
        field("canonicalBaselineDescriptorId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string", enum: ["REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL"] }),
        field("directoryName", { required: true, type: "string" }),
        field("manifestHash", { required: true, type: "string" }),
        field("scriptSetHash", { required: true, type: "string" }),
        field("scriptCount", { required: true, type: "number" }),
        field("repositoryStateHash", { required: true, type: "string" }),
        field("sourceV5Verified", { required: true, type: "boolean", enum: [true] }),
        field("freshRevalidationPassed", { required: true, type: "boolean", enum: [true] }),
        field("exactPostV5FileHashesVerified", { required: true, type: "boolean", enum: [true] }),
        field("explicitProjectOwnerAction", { required: true, type: "boolean", enum: [true] }),
        field("canonicalRevisionPromoted", { required: true, type: "boolean", enum: [true] }),
        field("automaticPromotionPerformed", { required: true, type: "boolean", enum: [false] }),
        field("canonicalSourceFilesWritten", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("githubReflectionPerformed", { required: true, type: "boolean", enum: [false] }),
        field("establishedBy", { required: true, type: "string", enum: ["Project Owner"] }),
        field("promotedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "syncSessionDescriptor",
      name: "REPOSITORY-010 Sync Session Descriptor Contract",
      fields: [
        field("syncSessionId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string" }),
        field("direction", { required: true, type: "string", enum: ["pull", "push"] }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("sourceRevisionId", { required: true, type: "string|null" }),
        field("targetRevisionId", { required: true, type: "string|null" }),
        field("sessionStatus", { required: true, type: "string", enum: ["CREATED", "OBSERVING", "DIFFERENCE_DETECTED", "TRANSFER_PREPARED", "TRANSFERRING", "TRANSFERRED", "VERIFYING", "CONFLICT_DETECTED", "CANDIDATE_READY", "AWAITING_ACCEPTANCE", "COMPLETED", "FAILED", "INTERRUPTED"] }),
        field("differenceId", { required: true, type: "string|null" }),
        field("syncCandidateId", { required: true, type: "string|null" }),
        field("transferPackageId", { required: true, type: "string|null" }),
        field("conflictEvidenceId", { required: true, type: "string|null" }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("automaticAcceptancePerformed", { required: true, type: "boolean", enum: [false] }),
        field("automaticConflictWinnerApplied", { required: true, type: "boolean", enum: [false] }),
        field("automaticBaselinePromotionPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [false] })
      ]
    }
    ,{
      key: "syncDifferenceDescriptor",
      name: "REPOSITORY-010 Sync Difference Descriptor Contract",
      fields: [
        field("differenceId", { required: true, type: "string" }),
        field("syncSessionId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("sourceRevisionId", { required: true, type: "string|null" }),
        field("targetRevisionId", { required: true, type: "string|null" }),
        field("sourceManifestHash", { required: true, type: "string|null" }),
        field("targetManifestHash", { required: true, type: "string|null" }),
        field("sourceScriptSetHash", { required: true, type: "string|null" }),
        field("targetScriptSetHash", { required: true, type: "string|null" }),
        field("sourceRepositoryStateHash", { required: true, type: "string|null" }),
        field("targetRepositoryStateHash", { required: true, type: "string|null" }),
        field("differenceType", { required: true, type: "string", enum: ["no-change", "source-ahead", "target-ahead", "diverged", "unknown"] }),
        field("hasDifference", { required: true, type: "boolean" }),
        field("baseRevisionMatch", { required: true, type: "boolean" }),
        field("changedFiles", { required: true, type: "array" }),
        field("conflictCandidate", { required: true, type: "boolean" }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "syncEvidenceDescriptor",
      name: "REPOSITORY-010 Sync Evidence Descriptor Contract",
      fields: [
        field("syncEvidenceId", { required: true, type: "string" }),
        field("syncSessionId", { required: true, type: "string" }),
        field("evidenceType", { required: true, type: "string", enum: ["session-created", "observation", "difference", "candidate-prepared", "transfer-prepared", "verification", "conflict", "failure", "interruption", "completion"] }),
        field("sessionStatus", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("targetNodeId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("sourceRevisionId", { required: true, type: "string|null" }),
        field("targetRevisionId", { required: true, type: "string|null" }),
        field("relatedRecordId", { required: true, type: "string|null" }),
        field("validationPassed", { required: true, type: "boolean" }),
        field("detail", { required: true, type: "object" }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("automaticAcceptancePerformed", { required: true, type: "boolean", enum: [false] }),
        field("automaticConflictWinnerApplied", { required: true, type: "boolean", enum: [false] }),
        field("automaticBaselinePromotionPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
    ,{
      key: "desktopRepositoryDescriptor",
      name: "REPOSITORY-010 Desktop Repository Descriptor Contract",
      fields: [
        field("desktopRepositoryDescriptorId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("nodeId", { required: true, type: "string" }),
        field("nodeType", { required: true, type: "string", enum: ["canonical"] }),
        field("directoryName", { required: true, type: "string" }),
        field("entryFile", { required: true, type: "string", enum: ["index.html"] }),
        field("projectVersion", { required: true, type: "string" }),
        field("manifestHash", { required: true, type: "string" }),
        field("scriptSetHash", { required: true, type: "string" }),
        field("scriptCount", { required: true, type: "number" }),
        field("integrityStatus", { required: true, type: "string", enum: ["verified"] }),
        field("scanMode", { required: true, type: "string", enum: ["read-only"] }),
        field("initialCanonicalNodeObserved", { required: true, type: "boolean", enum: [true] }),
        field("identityGrantsAuthority", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("writeAttempted", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("scannedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
  ];

  function typeMatches(value, type) {
    if (type === "string|null") return value === null || typeof value === "string";
    if (type === "string") return typeof value === "string";
    if (type === "boolean") return typeof value === "boolean";
    if (type === "array") return Array.isArray(value);
    if (type === "object") return internal.isPlainObject(value);
    return true;
  }

  function normalizeDefinition(definition) {
    const contractId = VERSION_MANIFEST.getContractId(definition.key);
    const version = VERSION_MANIFEST.getContractVersion(definition.key);
    return internal.deepFreeze({
      key: definition.key,
      contractId: contractId,
      version: version,
      name: definition.name,
      fields: definition.fields.map(function copyField(item) { return Object.freeze(Object.assign({}, item)); })
    });
  }

  function registerContract(definition) {
    const normalized = normalizeDefinition(definition);
    if (!normalized.contractId || !normalized.version) {
      return internal.buildResult(false, "REPOSITORY010_CONTRACT_MANIFEST_MISSING", "Blocked", { key: normalized.key });
    }
    state.contracts.set(normalized.contractId, normalized);
    state.contracts.set(normalized.key, normalized);
    return internal.buildResult(true, "REPOSITORY010_CONTRACT_REGISTERED", "Ready", { contractId: normalized.contractId, key: normalized.key, version: normalized.version });
  }

  function getContractDefinition(contractIdOrKey) {
    const definition = state.contracts.get(internal.text(contractIdOrKey, ""));
    return definition ? internal.clone(definition) : null;
  }

  function listContractDefinitions() {
    const seen = new Set();
    const output = [];
    state.contracts.forEach(function collect(definition) {
      if (!definition || seen.has(definition.contractId)) return;
      seen.add(definition.contractId);
      output.push(internal.clone(definition));
    });
    return output.sort(function sort(a, b) { return a.contractId.localeCompare(b.contractId); });
  }

  function validateContract(contractIdOrKey, payload) {
    const definition = state.contracts.get(internal.text(contractIdOrKey, ""));
    const checks = [];
    if (!definition) {
      return { valid: false, contractId: contractIdOrKey || null, checks: [{ name: "Contract is registered", passed: false, detail: "not-found" }], validatedAt: internal.nowIso() };
    }
    const data = internal.isPlainObject(payload) ? payload : {};
    definition.fields.forEach(function validateField(rule) {
      const exists = Object.prototype.hasOwnProperty.call(data, rule.name);
      checks.push({ name: rule.name + " required", passed: !rule.required || exists, detail: exists ? "present" : "missing" });
      if (!exists) return;
      checks.push({ name: rule.name + " type", passed: typeMatches(data[rule.name], rule.type), detail: rule.type || "any" });
      if (Array.isArray(rule.enum)) {
        checks.push({ name: rule.name + " enum", passed: rule.enum.indexOf(data[rule.name]) !== -1, detail: data[rule.name] });
      }
      if (rule.required && typeof data[rule.name] === "string") {
        checks.push({ name: rule.name + " non-empty", passed: data[rule.name].trim().length > 0, detail: data[rule.name] });
      }
    });
    return {
      valid: checks.every(function all(item) { return item.passed; }),
      contractId: definition.contractId,
      contractVersion: definition.version,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function initializeContracts() {
    const results = BUILT_IN_CONTRACTS.map(registerContract);
    const failed = results.filter(function find(item) { return !item.ok; });
    namespace.modules.contracts.status = failed.length === 0 ? "Ready" : "Blocked";
    return internal.buildResult(failed.length === 0, failed.length === 0 ? "REPOSITORY010_CONTRACTS_INITIALIZED" : "REPOSITORY010_CONTRACTS_INITIALIZATION_FAILED", failed.length === 0 ? "Ready" : "Blocked", { registered: listContractDefinitions().length, results: results });
  }

  Object.assign(namespace.api, {
    initializeContracts: initializeContracts,
    registerContract: registerContract,
    getContractDefinition: getContractDefinition,
    listContractDefinitions: listContractDefinitions,
    validateContract: validateContract
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.contracts = {
    id: "REPOSITORY-010-CONTRACTS",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    builtInContractCount: BUILT_IN_CONTRACTS.length,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
