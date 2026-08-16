/* ============================================================
   FILE: 13_local_first_repository_version_manifest.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.9.0
   Phase 10: Manual Acceptance Token / Authority Gate
   Architecture Baseline: DECISION-001..005 / FROZEN
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.9.0";
  const BASELINE_VERSION = "1.0.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  const moduleVersions = {
    core: "1.8.0",
    contracts: "1.8.0",
    metadata: "1.8.0",
    validation: BASELINE_VERSION,
    persistence: "1.3.0",
    phase2Validation: "1.0.2",
    offlineStaging: "1.0.0",
    phase3Validation: "1.0.1",
    syncCandidate: "1.0.0",
    phase4Validation: "1.0.0",
    transferPackage: "1.0.0",
    phase5Validation: "1.0.0",
    desktopAdapter: "1.0.0",
    phase6Validation: "1.0.0",
    v2Transfer: "1.0.0",
    phase7Validation: "1.0.0",
    v3Conflict: "1.0.0",
    phase8Validation: "1.0.0",
    v4TargetValidation: "1.0.0",
    phase9Validation: "1.0.0",
    acceptanceToken: "1.0.0",
    phase10Validation: "1.0.0"
  };

  const fileModules = {
    "13_local_first_repository_core.js": "core",
    "13_local_first_repository_contracts.js": "contracts",
    "13_local_first_repository_metadata.js": "metadata",
    "13_local_first_repository_phase1_validation.js": "validation",
    "13_local_first_repository_persistence.js": "persistence",
    "13_local_first_repository_phase2_validation.js": "phase2Validation",
    "13_local_first_repository_offline_staging.js": "offlineStaging",
    "13_local_first_repository_sync_candidate.js": "syncCandidate",
    "13_local_first_repository_phase3_validation.js": "phase3Validation",
    "13_local_first_repository_phase4_validation.js": "phase4Validation",
    "13_local_first_repository_transfer_package.js": "transferPackage",
    "13_local_first_repository_phase5_validation.js": "phase5Validation",
    "13_local_first_repository_desktop_adapter.js": "desktopAdapter",
    "13_local_first_repository_phase6_validation.js": "phase6Validation",
    "13_local_first_repository_v2_transfer.js": "v2Transfer",
    "13_local_first_repository_phase7_validation.js": "phase7Validation",
    "13_local_first_repository_v3_conflict.js": "v3Conflict",
    "13_local_first_repository_v4_target_validation.js": "v4TargetValidation",
    "13_local_first_repository_acceptance_token.js": "acceptanceToken",
    "13_local_first_repository_phase8_validation.js": "phase8Validation",
    "13_local_first_repository_phase9_validation.js": "phase9Validation",
    "13_local_first_repository_phase10_validation.js": "phase10Validation"
  };

  const contractVersions = {
    foundation: BASELINE_VERSION,
    repositoryNodeIdentity: BASELINE_VERSION,
    repositoryRevision: BASELINE_VERSION,
    repositoryIntegrityRecord: BASELINE_VERSION,
    repositoryStateRecord: BASELINE_VERSION,
    validationGateDescriptor: BASELINE_VERSION,
    offlineStagingDescriptor: "1.0.0",
    syncCandidateDescriptor: "1.0.0",
    transferPackageDescriptor: "1.0.0",
    desktopRepositoryDescriptor: "1.0.0",
    v2TransferReceiptDescriptor: "1.0.0",
    canonicalBaselineDescriptor: "1.0.0",
    v3ConflictEvidenceDescriptor: "1.0.0",
    v4TargetValidationEvidenceDescriptor: "1.0.0",
    acceptanceTokenDescriptor: "1.0.0"
  };

  const contractIds = {
    foundation: "REPOSITORY-010-CONTRACT-FOUNDATION",
    repositoryNodeIdentity: "REPOSITORY-010-CONTRACT-NODE-IDENTITY",
    repositoryRevision: "REPOSITORY-010-CONTRACT-REVISION",
    repositoryIntegrityRecord: "REPOSITORY-010-CONTRACT-INTEGRITY-RECORD",
    repositoryStateRecord: "REPOSITORY-010-CONTRACT-STATE-RECORD",
    validationGateDescriptor: "REPOSITORY-010-CONTRACT-VALIDATION-GATE",
    offlineStagingDescriptor: "REPOSITORY-010-CONTRACT-OFFLINE-STAGING",
    syncCandidateDescriptor: "REPOSITORY-010-CONTRACT-SYNC-CANDIDATE",
    transferPackageDescriptor: "REPOSITORY-010-CONTRACT-TRANSFER-PACKAGE",
    desktopRepositoryDescriptor: "REPOSITORY-010-CONTRACT-DESKTOP-REPOSITORY",
    v2TransferReceiptDescriptor: "REPOSITORY-010-CONTRACT-V2-TRANSFER-RECEIPT",
    canonicalBaselineDescriptor: "REPOSITORY-010-CONTRACT-CANONICAL-BASELINE",
    v3ConflictEvidenceDescriptor: "REPOSITORY-010-CONTRACT-V3-CONFLICT-EVIDENCE",
    v4TargetValidationEvidenceDescriptor: "REPOSITORY-010-CONTRACT-V4-TARGET-VALIDATION-EVIDENCE",
    acceptanceTokenDescriptor: "REPOSITORY-010-CONTRACT-ACCEPTANCE-TOKEN"
  };

  const repositoryStates = [
    "canonical",
    "replica",
    "staged",
    "sync-candidate",
    "conflicted",
    "stale",
    "invalid",
    "corrupted",
    "incompatible"
  ];

  const integrityStatuses = ["verified", "unverified", "mismatch", "corrupted"];
  const gateApplicability = ["required", "not-required", "deferred"];
  const gateResults = ["pending", "passed", "failed", "blocked"];
  const hashLayers = ["file", "manifest", "script-set", "content", "repository-state"];

  const manifest = {
    componentId: "REPOSITORY-010",
    componentName: "Local-First Repository Coordination",
    release: {
      version: RELEASE_VERSION,
      implementationPhase: "Phase 10 Manual Acceptance Token / Authority Gate",
      architectureStatus: "DECISION-001..005 / FORMALLY FROZEN",
      implementationStatus: "PHASE 10 IMPLEMENTED / PC + CROSS-DEVICE REAL MANUAL ACCEPTANCE TOKEN VALIDATION REQUIRED",
      priorValidatedBaseline: {
        version: "1.8.0",
        phase: 9,
        crossDeviceRealValidationPassed: true,
        pcRealValidationPassed: true,
        androidRealValidationPassed: true,
        validatedAt: "2026-08-16T01:16:07.323Z",
        status: "REPOSITORY-010 Phase 9 V4 Target Environment Validation PASS"
      },
      decisionIds: [
        "REPOSITORY-010-DECISION-001",
        "REPOSITORY-010-DECISION-002",
        "REPOSITORY-010-DECISION-003",
        "REPOSITORY-010-DECISION-004",
        "REPOSITORY-010-DECISION-005"
      ]
    },
    implementation: {
      phase: 10,
      phaseName: "Manual Acceptance Token / Authority Gate",
      phase1PersistenceImplemented: false,
      persistenceImplemented: true,
      androidIndexedDBPersistenceImplemented: true,
      offlineStagingImplemented: true,
      fullReloadRecoveryImplemented: true,
      syncCandidateCreationImplemented: true,
      syncCandidatePersistenceImplemented: true,
      v1LocalValidationImplemented: true,
      transferPackagePreparationImplemented: true,
      transferPackagePersistenceImplemented: true,
      v2IntegrityPreflightImplemented: true,
      v2TransferIntegrityValidationImplemented: true,
      v3BaseConflictValidationImplemented: true,
      v4TargetEnvironmentValidationImplemented: true,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false,
      conflictResolutionImplemented: false,
      desktopAdapterImplemented: true,
      desktopDirectorySelectionImplemented: true,
      pcLocalRepositoryReadOnlyScanImplemented: true,
      pcLocalRepositoryIntegrityVerificationImplemented: true,
      pcCanonicalMutationImplemented: false,
      crossDeviceRealSyncImplemented: false,
      explicitFileTransferImplemented: true,
      v2TransferReceiptImplemented: true,
      explicitCanonicalBaselineImplemented: true,
      canonicalRevisionDerivedFromHash: false,
      canonicalRevisionDerivedFromVersion: false,
      v3ConflictEvidenceImplemented: true,
      v4TargetValidationEvidenceImplemented: true,
      explicitAcceptanceImplemented: true,
      manualAcceptanceTokenImplemented: true,
      delegatedAcceptanceArchitectureSupported: true,
      delegatedAcceptanceEnabled: false,
      automaticLowRiskReflectionEnabled: false,
      controlledCanonicalTransactionImplemented: false,
      acceptanceTokenConsumptionImplemented: false
    },
    authority: {
      model: "logical-authority-canonical-node-separation",
      logicalAuthority: "AI Prompt OS Repository",
      initialCanonicalNode: "PC Local Repository",
      androidIndexedDBRole: "Validated Working Replica / Offline Staging",
      ownServerRole: "Sync Coordinator / Relay / Replica",
      githubRole: "Reflection / Publication / Remote Backup",
      githubPagesRole: "Optional Published Runtime",
      syncMode: "controlled-two-way",
      currentConflictResolutionAuthority: "Project Owner + Validated Resolution",
      identityGrantsAuthority: false,
      stateGrantsAuthority: false,
      validationGrantsApproval: false,
      syncGrantsMutationAuthority: false
    },
    integrity: {
      hashAlgorithm: "SHA-256",
      hashLayers: hashLayers.slice(),
      statuses: integrityStatuses.slice(),
      digitalSignatureRequired: false
    },
    repositoryStates: repositoryStates.slice(),
    validationAuthority: {
      model: "capability-scoped-required-real-environment-gate",
      gateApplicability: gateApplicability.slice(),
      gateResults: gateResults.slice(),
      phase1RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "not-required",
        crossDeviceRealValidation: "not-required"
      },
      phase2RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "not-required",
        crossDeviceRealValidation: "not-required"
      },
      phase3RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "not-required",
        crossDeviceRealValidation: "not-required"
      },
      phase4RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "not-required",
        crossDeviceRealValidation: "not-required"
      },
      phase5RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "not-required",
        crossDeviceRealValidation: "not-required"
      },
      phase6RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "not-required",
        pcRealValidation: "required",
        crossDeviceRealValidation: "not-required"
      },
      phase7RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "required",
        crossDeviceRealValidation: "required"
      },
      phase8RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "required",
        crossDeviceRealValidation: "required"
      },
      phase9RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "required",
        crossDeviceRealValidation: "required"
      },
      phase10RequiredGateSet: {
        staticValidation: "required",
        androidRealValidation: "required",
        pcRealValidation: "required",
        crossDeviceRealValidation: "required"
      },
      syncCandidateValidationLayers: [
        "V1 Local Validation",
        "V2 Transfer / Integrity Validation",
        "V3 Base Revision / Conflict Validation",
        "V4 Target Environment Validation",
        "V5 Post-Reflection Verification"
      ]
    },
    acceptance: {
      model: "acceptance-token-controlled-transaction",
      automationPrinciple: "Automation First / Human on Exception / Authority remains explicit",
      manualAcceptanceEnabled: true,
      delegatedAcceptanceArchitectureSupported: true,
      delegatedAcceptanceEnabled: false,
      automaticLowRiskReflectionEnabled: false,
      tokenLifetimePolicy: "transaction-start-window",
      tokenLifetimeMinutes: 15,
      tokenLifetimeSeconds: 900,
      tokenOneTimeUse: true,
      tokenCandidateBound: true,
      tokenTargetBound: true,
      tokenV4EvidenceBound: true,
      tokenMutationSetBound: true,
      projectOwnerImpersonationAllowed: false,
      phase10AuthorityGateMutationSet: []
    },
    safety: {
      directRepositoryMutationAllowed: false,
      automaticRecommendationApplicationAllowed: false,
      automaticWorkflowExecutionAllowed: false,
      githubAutomaticReflectionAllowed: false,
      candidateAutomaticFactPromotionAllowed: false,
      automaticArchiveImportAllowed: false,
      missingSourceInferenceAllowed: false,
      authorityScoringAllowed: false,
      trustScoringAllowed: false,
      conflictScoringAllowed: false,
      automaticConflictWinnerAllowed: false,
      implicitAuthorityTransferAllowed: false,
      offlineCanonicalFinalizationAllowed: false,
      acceptanceTokenReusable: false,
      acceptancePolicySelfApprovalAllowed: false,
      uncontrolledPersistentMutationAllowed: false,
      reflectionWithoutBackupAllowed: false,
      reflectionWithoutRollbackPlanAllowed: false,
      successfulReflectionWithoutV5Allowed: false,
      automatedProjectOwnerImpersonationAllowed: false,
      delegatedAcceptanceDefaultEnabled: false
    },
    moduleVersions: moduleVersions,
    fileModules: fileModules,
    contractVersions: contractVersions,
    contractIds: contractIds,
    getModuleVersion: function getModuleVersion(key) { return moduleVersions[key] || null; },
    getContractVersion: function getContractVersion(key) { return contractVersions[key] || null; },
    getContractId: function getContractId(key) { return contractIds[key] || null; }
  };

  global.REPOSITORY010VersionManifest = deepFreeze(manifest);
})(typeof window !== "undefined" ? window : globalThis);
