/* ============================================================
   FILE: 13_development_automation_version_manifest.js
   IDE-190 Development Automation
   Release: 1.10.0
   Phase 10: Integrated / Android Final Validation
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.10.0";
  const BASELINE_VERSION = "1.0.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  const moduleVersions = {
    core: "1.10.0",
    contracts: "1.9.0",
    validation: BASELINE_VERSION,
    intake: BASELINE_VERSION,
    grounding: BASELINE_VERSION,
    phase2Validation: BASELINE_VERSION,
    planning: BASELINE_VERSION,
    proposal: BASELINE_VERSION,
    dryRun: BASELINE_VERSION,
    preflight: "1.0.1",
    phase3Validation: BASELINE_VERSION,
    gate: BASELINE_VERSION,
    approval: BASELINE_VERSION,
    consent: BASELINE_VERSION,
    phase4Validation: BASELINE_VERSION,
    dispatch: BASELINE_VERSION,
    phase5Validation: BASELINE_VERSION,
    mutationTrial: BASELINE_VERSION,
    phase6Validation: "1.0.1",
    failure: BASELINE_VERSION,
    timeout: BASELINE_VERSION,
    recovery: BASELINE_VERSION,
    phase7Validation: "1.0.1",
    session: BASELINE_VERSION,
    audit: BASELINE_VERSION,
    persistence: BASELINE_VERSION,
    receipt: BASELINE_VERSION,
    phase8Validation: BASELINE_VERSION,
    crossDevice: BASELINE_VERSION,
    reflection: BASELINE_VERSION,
    guide: BASELINE_VERSION,
    ui: "1.1.0",
    phase9Validation: BASELINE_VERSION,
    phase10Validation: "1.0.1"
  };

  const fileModules = {
    "13_development_automation_core.js": "core",
    "13_development_automation_contracts.js": "contracts",
    "13_development_automation_validation.js": "validation",
    "13_development_automation_intake.js": "intake",
    "13_development_automation_grounding.js": "grounding",
    "13_development_automation_phase2_validation.js": "phase2Validation",
    "13_development_automation_planning.js": "planning",
    "13_development_automation_proposal.js": "proposal",
    "13_development_automation_dry_run.js": "dryRun",
    "13_development_automation_preflight.js": "preflight",
    "13_development_automation_phase3_validation.js": "phase3Validation",
    "13_development_automation_gate.js": "gate",
    "13_development_automation_approval.js": "approval",
    "13_development_automation_consent.js": "consent",
    "13_development_automation_phase4_validation.js": "phase4Validation",
    "13_development_automation_dispatch.js": "dispatch",
    "13_development_automation_phase5_validation.js": "phase5Validation",
    "13_development_automation_mutation_trial.js": "mutationTrial",
    "13_development_automation_phase6_validation.js": "phase6Validation",
    "13_development_automation_failure.js": "failure",
    "13_development_automation_timeout.js": "timeout",
    "13_development_automation_recovery.js": "recovery",
    "13_development_automation_phase7_validation.js": "phase7Validation",
    "13_development_automation_session.js": "session",
    "13_development_automation_audit.js": "audit",
    "13_development_automation_persistence.js": "persistence",
    "13_development_automation_receipt.js": "receipt",
    "13_development_automation_phase8_validation.js": "phase8Validation",
    "13_development_automation_cross_device.js": "crossDevice",
    "13_development_automation_reflection.js": "reflection",
    "13_development_automation_guide.js": "guide",
    "13_development_automation_ui.js": "ui",
    "13_development_automation_phase9_validation.js": "phase9Validation",
    "13_development_automation_phase10_validation.js": "phase10Validation"
  };

  const contractVersions = {
    foundation: BASELINE_VERSION,
    foundationState: "1.9.0",
    capabilityDescriptor: BASELINE_VERSION,
    platformProfile: BASELINE_VERSION,
    navigationIntake: BASELINE_VERSION,
    groundingContext: BASELINE_VERSION,
    automationPlan: BASELINE_VERSION,
    automationProposal: BASELINE_VERSION,
    dryRunRecord: BASELINE_VERSION,
    preflightRecord: BASELINE_VERSION,
    authorizationGate: BASELINE_VERSION,
    approvalRequest: BASELINE_VERSION,
    approvalRecord: BASELINE_VERSION,
    consentRecord: BASELINE_VERSION,
    dispatchRequest: BASELINE_VERSION,
    executionResult: BASELINE_VERSION,
    mutationTrialRecord: BASELINE_VERSION,
    repositoryIntegrityRecord: BASELINE_VERSION,
    rollbackRestorationRecord: BASELINE_VERSION,
    failureRecord: BASELINE_VERSION,
    timeoutRecord: BASELINE_VERSION,
    recoveryDecision: BASELINE_VERSION,
    recoveryVerification: BASELINE_VERSION,
    automationSession: BASELINE_VERSION,
    auditEvent: BASELINE_VERSION,
    automationReceipt: BASELINE_VERSION,
    reflectionPackage: BASELINE_VERSION,
    crossDeviceRecord: BASELINE_VERSION
  };

  const contractIds = {
    foundation: "IDE-190-CONTRACT-FOUNDATION",
    foundationState: "IDE-190-CONTRACT-FOUNDATION-STATE",
    capabilityDescriptor: "IDE-190-CONTRACT-CAPABILITY-DESCRIPTOR",
    platformProfile: "IDE-190-CONTRACT-PLATFORM-PROFILE",
    navigationIntake: "IDE-190-CONTRACT-NAVIGATION-INTAKE",
    groundingContext: "IDE-190-CONTRACT-GROUNDING-CONTEXT",
    automationPlan: "IDE-190-CONTRACT-AUTOMATION-PLAN",
    automationProposal: "IDE-190-CONTRACT-AUTOMATION-PROPOSAL",
    dryRunRecord: "IDE-190-CONTRACT-DRY-RUN-RECORD",
    preflightRecord: "IDE-190-CONTRACT-PREFLIGHT-RECORD",
    authorizationGate: "IDE-190-CONTRACT-AUTHORIZATION-GATE",
    approvalRequest: "IDE-190-CONTRACT-APPROVAL-REQUEST",
    approvalRecord: "IDE-190-CONTRACT-APPROVAL-RECORD",
    consentRecord: "IDE-190-CONTRACT-CONSENT-RECORD",
    dispatchRequest: "IDE-190-CONTRACT-DISPATCH-REQUEST",
    executionResult: "IDE-190-CONTRACT-EXECUTION-RESULT",
    mutationTrialRecord: "IDE-190-CONTRACT-MUTATION-TRIAL-RECORD",
    repositoryIntegrityRecord: "IDE-190-CONTRACT-REPOSITORY-INTEGRITY-RECORD",
    rollbackRestorationRecord: "IDE-190-CONTRACT-ROLLBACK-RESTORATION-RECORD",
    failureRecord: "IDE-190-CONTRACT-FAILURE-RECORD",
    timeoutRecord: "IDE-190-CONTRACT-TIMEOUT-RECORD",
    recoveryDecision: "IDE-190-CONTRACT-RECOVERY-DECISION",
    recoveryVerification: "IDE-190-CONTRACT-RECOVERY-VERIFICATION",
    automationSession: "IDE-190-CONTRACT-AUTOMATION-SESSION",
    auditEvent: "IDE-190-CONTRACT-AUDIT-EVENT",
    automationReceipt: "IDE-190-CONTRACT-AUTOMATION-RECEIPT",
    reflectionPackage: "IDE-190-CONTRACT-REFLECTION-PACKAGE",
    crossDeviceRecord: "IDE-190-CONTRACT-CROSS-DEVICE-RECORD"
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
      implementationPhase: "Phase 10 Integrated / Android Final Validation",
      phase: 10,
      phaseCount: 10,
      designFreezeId: "IDE-190-DESIGN-FREEZE-1.0.0",
      designFreezeVersion: "1.0.0",
      decisionRange: "IDE-190-DECISION-001..012",
      architectureStatus: "DESIGN COMPLETE / FROZEN",
      status: "Released - v1.10.0 Compatible UI / Guide Enhancement",
      baseCompletedReleaseVersion: "1.9.0",
      compatibleFeatureRelease: true
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
      phase: 10,
      phaseName: "Integrated / Android Final Validation + UI / Guide Enhancement",
      completedPhases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      contractFirst: true,
      inspectBeforeImplement: true,
      ide190Complete: false,
      releaseAllowed: false,
      androidRealDeviceGateRequired: true,
      phase2Allowed: true,
      phase3Allowed: true,
      phase4Allowed: true,
      phase5AllowedBeforeAndroidGate: true,
      phase6AllowedBeforeAndroidGate: true,
      phase7AllowedBeforeAndroidGate: true,
      phase8AllowedBeforeAndroidGate: true,
      phase9AllowedBeforeAndroidGate: true,
      phase10AllowedBeforeAndroidGate: true
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
