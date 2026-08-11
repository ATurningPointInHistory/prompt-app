/* ============================================================
   FILE: 13_development_automation_version_manifest.js
   IDE-190 Development Automation
   Release: 1.0.0
   Phase 1: Foundation / Contracts / Version
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.0.0";
  const BASELINE_VERSION = "1.0.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  const moduleVersions = {
    core: BASELINE_VERSION,
    contracts: BASELINE_VERSION,
    validation: BASELINE_VERSION
  };

  const fileModules = {
    "13_development_automation_core.js": "core",
    "13_development_automation_contracts.js": "contracts",
    "13_development_automation_validation.js": "validation"
  };

  const contractVersions = {
    foundation: BASELINE_VERSION,
    foundationState: BASELINE_VERSION,
    capabilityDescriptor: BASELINE_VERSION,
    platformProfile: BASELINE_VERSION
  };

  const contractIds = {
    foundation: "IDE-190-CONTRACT-FOUNDATION",
    foundationState: "IDE-190-CONTRACT-FOUNDATION-STATE",
    capabilityDescriptor: "IDE-190-CONTRACT-CAPABILITY-DESCRIPTOR",
    platformProfile: "IDE-190-CONTRACT-PLATFORM-PROFILE"
  };

  const lifecycle = [
    "Intake",
    "Ground",
    "Plan",
    "Propose",
    "Preflight",
    "Gate",
    "Dispatch",
    "Verify",
    "Close"
  ];

  const automationLevels = [
    { id: "L0", name: "Observe / Navigate", initialPolicy: "Policy-Controlled" },
    { id: "L1", name: "Analyze / Plan", initialPolicy: "Policy-Controlled" },
    { id: "L2", name: "Propose / Preflight / Dry Run", initialPolicy: "Policy-Controlled" },
    { id: "L3", name: "Controlled Runtime Execution", initialPolicy: "Controlled" },
    { id: "L4", name: "Controlled Mutation Trial", initialPolicy: "Project Owner Explicit Approval + Validation + Mandatory Rollback" },
    { id: "L5", name: "Persistent Repository Mutation / Commit", initialPolicy: "PROHIBITED" }
  ];

  const approvalClasses = [
    { id: "P0", name: "No Human Approval", initialPolicy: "Available according to operation policy" },
    { id: "P1", name: "Runtime Execution Approval", initialPolicy: "Controlled" },
    { id: "P2", name: "Controlled Mutation Trial Approval", initialPolicy: "Project Owner Explicit Approval" },
    { id: "P3", name: "IDE-160 Workflow Continuation Approval", initialPolicy: "Controlled" },
    { id: "P4", name: "Persistent Commit Authorization", initialPolicy: "PROHIBITED" }
  ];

  const mutationLevels = [
    { id: "M0", name: "No Mutation", initialPolicy: "Allowed according to operation policy" },
    { id: "M1", name: "Runtime Side Effect", initialPolicy: "Controlled" },
    { id: "M2", name: "Controlled Repository Mutation Trial", initialPolicy: "Bound Permission Chain" },
    { id: "M3", name: "Persistent Repository Mutation", initialPolicy: "PROHIBITED" }
  ];

  const executionModes = [
    { id: "E0", name: "Read-Only Dry Run", initialPolicy: "Allowed according to operation policy" },
    { id: "E1", name: "Controlled Mutation Trial", initialPolicy: "Bound Permission Chain" },
    { id: "E2", name: "Persistent Commit Capability", initialPolicy: "PROHIBITED" }
  ];

  const validationLayers = [
    { id: "V0", name: "Grounding" },
    { id: "V1", name: "Plan / Contract" },
    { id: "V2", name: "Dry Run" },
    { id: "V3", name: "Execution Preflight" },
    { id: "V4", name: "Authorization Gate" },
    { id: "V5", name: "Execution Result" },
    { id: "V6", name: "Repository Integrity" },
    { id: "V7", name: "Rollback / Restoration" },
    { id: "V8", name: "Completion" }
  ];

  const outcomes = [
    "Completed",
    "Completed-With-Warnings",
    "Blocked",
    "Rejected",
    "Cancelled",
    "Failed",
    "Rolled-Back",
    "Partial",
    "Recovery-Required",
    "Timed-Out"
  ];

  const failureCategories = [
    "Input",
    "Dependency",
    "Policy",
    "Approval",
    "Execution",
    "Validation",
    "Repository Integrity",
    "Rollback",
    "Persistence",
    "System",
    "Unknown"
  ];

  const externalEffectLevels = [
    { id: "X0", name: "No External Effect", initialPolicy: "Allowed according to policy" },
    { id: "X1", name: "User-Mediated Reflection Preparation", initialPolicy: "Allowed" },
    { id: "X2", name: "Controlled External Side Effect", initialPolicy: "PROHIBITED" },
    { id: "X3", name: "Automatic External Reflection", initialPolicy: "PROHIBITED" }
  ];

  const safety = {
    directRepositoryMutationAllowed: false,
    automaticRecommendationApplicationAllowed: false,
    automaticWorkflowExecutionAllowed: false,
    githubAutomaticReflectionAllowed: false,
    candidateAutomaticFactPromotionAllowed: false,
    automaticArchiveImportAllowed: false,
    missingSourceInferenceAllowed: false,
    authorityScoringAllowed: false,
    trustScoringAllowed: false,
    conflictScoringAllowed: false
  };

  const initialPolicy = {
    persistentCommitAllowed: false,
    persistentCommitApprovalClass: "P4",
    persistentCommitApprovalAvailable: false,
    persistentRepositoryMutationAllowed: false,
    controlledMutationTrialRequiresProjectOwnerApproval: true,
    controlledMutationTrialRequiresMandatoryRollback: true,
    controlledMutationTrialRequiresRestorationVerification: true,
    secondMutationEngineAllowed: false,
    ide180BypassAllowed: false,
    recommendationIsExecutionPermission: false,
    consentIsApproval: false,
    humanApprovalOverridesHardDeny: false,
    concurrentMutationLimit: 1,
    externalControlledSideEffectAllowed: false,
    externalAutomaticReflectionAllowed: false
  };

  const commonRuntimeBoundary = {
    runtime: "Common Web Runtime",
    sharedCore: true,
    responsiveCrossDeviceUI: true,
    capabilityBasedPlatformProfiles: true,
    androidInitialReleaseAuthority: true,
    pcPermissionEscalationAllowed: false,
    displayModeChangesPermission: false,
    localFirstInInitialScope: false,
    localRepositoryAuthorityInInitialScope: false,
    offlineMutationInInitialScope: false,
    syncEngineInInitialScope: false,
    ownServerInInitialScope: false,
    githubPagesDependencyRemovalInInitialScope: false
  };

  const manifest = {
    componentId: "IDE-190",
    componentName: "Development Automation",
    mission: "Safe Automation Orchestrator",
    versionArchitecture: "independent-version-v1",
    release: {
      version: RELEASE_VERSION,
      implementationPhase: "Phase 1 Foundation / Contracts / Version",
      phase: 1,
      phaseCount: 10,
      designFreezeId: "IDE-190-DESIGN-FREEZE-1.0.0",
      designFreezeVersion: "1.0.0",
      decisionRange: "IDE-190-DECISION-001..012",
      architectureStatus: "DESIGN COMPLETE / FROZEN",
      status: "Implementation - Phase 1"
    },
    moduleVersions: moduleVersions,
    fileModules: fileModules,
    contractVersions: contractVersions,
    contractIds: contractIds,
    lifecycle: lifecycle,
    automationLevels: automationLevels,
    approvalClasses: approvalClasses,
    mutationLevels: mutationLevels,
    executionModes: executionModes,
    validationLayers: validationLayers,
    outcomes: outcomes,
    failureCategories: failureCategories,
    externalEffectLevels: externalEffectLevels,
    safety: safety,
    initialPolicy: initialPolicy,
    commonRuntimeBoundary: commonRuntimeBoundary,
    compatibility: {
      minimumIDE180Version: "1.9.1",
      requiredIDE180HandoffContractVersion: "1.0.0",
      requiredIDE180HandoffVersion: "1.0.0",
      minimumIDE160Version: "2.0.1"
    },
    implementation: {
      phase: 1,
      phaseName: "Foundation / Contracts / Version",
      contractFirst: true,
      inspectBeforeImplement: true,
      ide190Complete: false,
      releaseAllowed: false,
      androidRealDeviceGateRequired: true,
      phase2AllowedBeforeAndroidGate: false
    },
    getModuleVersion: function getModuleVersion(moduleOrFile) {
      const key = fileModules[moduleOrFile] || moduleOrFile;
      return moduleVersions[key] || null;
    },
    getContractVersion: function getContractVersion(contractKeyOrId) {
      if (contractVersions[contractKeyOrId]) return contractVersions[contractKeyOrId];
      const key = Object.keys(contractIds).find(function findKey(candidate) {
        return contractIds[candidate] === contractKeyOrId;
      });
      return key ? contractVersions[key] : null;
    },
    getContractId: function getContractId(contractKey) {
      return contractIds[contractKey] || null;
    }
  };

  global.IDE190VersionManifest = deepFreeze(manifest);
})(typeof window !== "undefined" ? window : globalThis);
