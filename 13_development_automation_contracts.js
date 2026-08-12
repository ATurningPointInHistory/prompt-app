/* ============================================================
   FILE: 13_development_automation_contracts.js
   IDE-190 Development Automation
   Release: 1.5.0 / Module: Contracts 1.5.0
   Phase 6: IDE-150 Controlled Mutation Trial
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 contracts blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("contracts");
  const AUTOMATION_LEVEL_IDS = VERSION_MANIFEST.automationLevels.map(function map(item) { return item.id; });
  const MUTATION_LEVEL_IDS = VERSION_MANIFEST.mutationLevels.map(function map(item) { return item.id; });
  const EXECUTION_MODE_IDS = VERSION_MANIFEST.executionModes.map(function map(item) { return item.id; });
  const EXTERNAL_EFFECT_LEVEL_IDS = VERSION_MANIFEST.externalEffectLevels.map(function map(item) { return item.id; });
  const PERMISSION_CLASSES = ["Policy-Controlled", "Controlled", "Approval-Required", "PROHIBITED"];

  function field(name, options) {
    return Object.assign({ name: name, required: false }, options || {});
  }

  const BUILT_IN_CONTRACTS = [
    {
      key: "foundation",
      name: "IDE-190 Foundation Contract",
      description: "Frozen Phase 1 identity, lifecycle, safety, permission and common runtime boundary.",
      fields: [
        field("componentId", { required: true, type: "string", enum: ["IDE-190"] }),
        field("componentName", { required: true, type: "string", enum: ["Development Automation"] }),
        field("releaseVersion", { required: true, type: "string" }),
        field("designFreezeId", { required: true, type: "string", enum: ["IDE-190-DESIGN-FREEZE-1.0.0"] }),
        field("architectureStatus", { required: true, type: "string", enum: ["DESIGN COMPLETE / FROZEN"] }),
        field("mission", { required: true, type: "string", enum: ["Safe Automation Orchestrator"] }),
        field("lifecycle", { required: true, type: "array" }),
        field("automationLevels", { required: true, type: "array" }),
        field("approvalClasses", { required: true, type: "array" }),
        field("mutationLevels", { required: true, type: "array" }),
        field("executionModes", { required: true, type: "array" }),
        field("validationLayers", { required: true, type: "array" }),
        field("externalEffectLevels", { required: true, type: "array" }),
        field("safetyDefaults", { required: true, type: "object" }),
        field("commonRuntime", { required: true, type: "object" })
      ]
    },
    {
      key: "foundationState",
      name: "IDE-190 Foundation State Contract",
      description: "Phase 1 component state only. No automation session, approval, dispatch or mutation state is synthesized here.",
      fields: [
        field("initialized", { required: true, type: "boolean" }),
        field("currentPhase", { required: true, type: "integer", enum: [1, 2, 3, 4, 5] }),
        field("releaseAllowed", { required: true, type: "boolean", enum: [false] }),
        field("ide190Complete", { required: true, type: "boolean", enum: [false] }),
        field("phase2Allowed", { required: true, type: "boolean" }),
        field("phase3Allowed", { required: true, type: "boolean" }),
        field("phase4Allowed", { required: true, type: "boolean" }),
        field("phase5Allowed", { required: true, type: "boolean" }),
        field("phase6Allowed", { required: true, type: "boolean" }),
        field("lastPreDeviceValidation", { required: true, type: "object|null" }),
        field("lastAndroidValidation", { required: true, type: "object|null" }),
        field("lastPhase2Validation", { required: true, type: "object|null" }),
        field("lastPhase2AndroidValidation", { required: true, type: "object|null" }),
        field("lastPhase3Validation", { required: true, type: "object|null" }),
        field("lastPhase3AndroidValidation", { required: true, type: "object|null" }),
        field("lastPhase4Validation", { required: true, type: "object|null" }),
        field("lastPhase4AndroidValidation", { required: true, type: "object|null" }),
        field("lastPhase5Validation", { required: true, type: "object|null" }),
        field("lastPhase5AndroidValidation", { required: true, type: "object|null" })
      ]
    },
    {
      key: "capabilityDescriptor",
      name: "IDE-190 Capability Descriptor Contract",
      description: "Describes capability existence separately from current execution permission.",
      fields: [
        field("capabilityId", { required: true, type: "string" }),
        field("capabilityVersion", { required: true, type: "string" }),
        field("ownerComponentId", { required: true, type: "string" }),
        field("capabilityType", { required: true, type: "string" }),
        field("available", { required: true, type: "boolean" }),
        field("permissionClass", { required: true, type: "string", enum: PERMISSION_CLASSES }),
        field("automationLevel", { required: true, type: "string", enum: AUTOMATION_LEVEL_IDS }),
        field("mutationLevel", { required: true, type: "string", enum: MUTATION_LEVEL_IDS }),
        field("executionMode", { required: true, type: "string", enum: EXECUTION_MODE_IDS }),
        field("externalEffectLevel", { required: true, type: "string", enum: EXTERNAL_EFFECT_LEVEL_IDS }),
        field("operations", { required: true, type: "array" }),
        field("source", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "platformProfile",
      name: "IDE-190 Platform Profile Contract",
      description: "Capability-based Common Web Runtime profile that cannot escalate permission.",
      fields: [
        field("profileId", { required: true, type: "string" }),
        field("runtime", { required: true, type: "string", enum: ["Common Web Runtime"] }),
        field("deviceClass", { required: true, type: "string" }),
        field("userAgent", { required: true, type: "string" }),
        field("screen", { required: true, type: "object" }),
        field("input", { required: true, type: "object" }),
        field("capabilities", { required: true, type: "object" }),
        field("permissionIndependent", { required: true, type: "boolean", enum: [true] }),
        field("persistentCommitPermission", { required: true, type: "boolean", enum: [false] }),
        field("githubAutomaticReflectionPermission", { required: true, type: "boolean", enum: [false] }),
        field("approvalBypassAllowed", { required: true, type: "boolean", enum: [false] })
      ]
    }    ,
    {
      key: "navigationIntake",
      name: "IDE-190 Validated Navigation Intake Contract",
      description: "Accepts only a validated immutable IDE-180 Navigation Package plus a validated IDE-180 to IDE-190 Handoff without provider bypass or inferred source completion.",
      fields: [
        field("intakeId", { required: true, type: "string" }),
        field("sourceComponentId", { required: true, type: "string", enum: ["IDE-180"] }),
        field("groundingInputType", { required: true, type: "string", enum: ["validated-ide180-package-plus-handoff"] }),
        field("packageId", { required: true, type: "string" }),
        field("packageHash", { required: true, type: "string" }),
        field("handoffId", { required: true, type: "string" }),
        field("handoffHash", { required: true, type: "string" }),
        field("navigationStatus", { required: true, type: "string" }),
        field("packageValidationValid", { required: true, type: "boolean", enum: [true] }),
        field("handoffValidationValid", { required: true, type: "boolean", enum: [true] }),
        field("linkageValid", { required: true, type: "boolean", enum: [true] }),
        field("providerBypassUsed", { required: true, type: "boolean", enum: [false] }),
        field("missingSourceInferenceUsed", { required: true, type: "boolean", enum: [false] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "groundingContext",
      name: "IDE-190 Grounding Context Contract",
      description: "Source-bounded V0 Grounding derived only from a validated IDE-180 intake. Missing Source remains explicit and recovery is delegated to IDE-180.",
      fields: [
        field("groundingId", { required: true, type: "string" }),
        field("intakeId", { required: true, type: "string" }),
        field("packageId", { required: true, type: "string" }),
        field("handoffId", { required: true, type: "string" }),
        field("canonicalTarget", { required: true, type: "object" }),
        field("navigationStatus", { required: true, type: "string" }),
        field("groundingStatus", { required: true, type: "string", enum: ["Grounded", "Partial", "Recovery-Required"] }),
        field("authority", { required: true, type: "object" }),
        field("evidence", { required: true, type: "array" }),
        field("lineage", { required: true, type: "array" }),
        field("validation", { required: true, type: "object" }),
        field("conflicts", { required: true, type: "array" }),
        field("missingSources", { required: true, type: "array" }),
        field("sourceSnapshot", { required: true, type: "object" }),
        field("structuredExplanation", { required: true, type: "object" }),
        field("inferenceUsed", { required: true, type: "boolean", enum: [false] }),
        field("authorityRecomputed", { required: true, type: "boolean", enum: [false] }),
        field("providerCompositionUsed", { required: true, type: "boolean", enum: [false] }),
        field("planEligible", { required: true, type: "boolean" }),
        field("dispatchEligible", { required: true, type: "boolean", enum: [false] }),
        field("recoveryDelegation", { required: true, type: "object" }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "automationPlan",
      name: "IDE-190 Automation Plan Contract",
      description: "V1 immutable Plan bound to a Grounded IDE-180 evidence context. Planning never grants dispatch, approval, mutation, or persistent commit permission.",
      fields: [
        field("planId", { required: true, type: "string" }),
        field("planVersion", { required: true, type: "string", enum: ["1.0.0"] }),
        field("planHash", { required: true, type: "string" }),
        field("groundingId", { required: true, type: "string" }),
        field("packageId", { required: true, type: "string" }),
        field("packageHash", { required: true, type: "string" }),
        field("handoffId", { required: true, type: "string" }),
        field("handoffHash", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V1"] }),
        field("objective", { required: true, type: "string" }),
        field("operation", { required: true, type: "object" }),
        field("automationLevel", { required: true, type: "string", enum: AUTOMATION_LEVEL_IDS }),
        field("mutationLevel", { required: true, type: "string", enum: MUTATION_LEVEL_IDS }),
        field("requestedExecutionMode", { required: true, type: "string", enum: EXECUTION_MODE_IDS }),
        field("externalEffectLevel", { required: true, type: "string", enum: EXTERNAL_EFFECT_LEVEL_IDS }),
        field("repositoryBaseline", { required: true, type: "object|null" }),
        field("evidenceBinding", { required: true, type: "object" }),
        field("approvalRequested", { required: true, type: "boolean", enum: [false] }),
        field("autoApply", { required: true, type: "boolean", enum: [false] }),
        field("dispatchEligible", { required: true, type: "boolean", enum: [false] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "automationProposal",
      name: "IDE-190 Automation Proposal Contract",
      description: "L2 advisory Proposal bound to one immutable Plan. Proposal is never execution permission or mutation approval.",
      fields: [
        field("proposalId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("planHash", { required: true, type: "string" }),
        field("groundingId", { required: true, type: "string" }),
        field("proposalStatus", { required: true, type: "string", enum: ["Proposed"] }),
        field("summary", { required: true, type: "string" }),
        field("expectedEffects", { required: true, type: "array" }),
        field("executionPermissionGranted", { required: true, type: "boolean", enum: [false] }),
        field("mutationApprovalGranted", { required: true, type: "boolean", enum: [false] }),
        field("approvalRequested", { required: true, type: "boolean", enum: [false] }),
        field("autoApply", { required: true, type: "boolean", enum: [false] }),
        field("dispatchEligible", { required: true, type: "boolean", enum: [false] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "dryRunRecord",
      name: "IDE-190 E0 Dry Run Record Contract",
      description: "V2 read-only simulation that proves no Repository mutation, write, application, approval request, or auto-apply occurred.",
      fields: [
        field("dryRunId", { required: true, type: "string" }),
        field("proposalId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("planHash", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V2"] }),
        field("executionMode", { required: true, type: "string", enum: ["E0"] }),
        field("dryRunStatus", { required: true, type: "string", enum: ["Passed", "Blocked"] }),
        field("repositoryMutation", { required: true, type: "boolean", enum: [false] }),
        field("repositoryWriteCount", { required: true, type: "integer", enum: [0] }),
        field("sourceUnchanged", { required: true, type: "boolean", enum: [true] }),
        field("applicationAttempted", { required: true, type: "boolean", enum: [false] }),
        field("approvalRequested", { required: true, type: "boolean", enum: [false] }),
        field("autoApply", { required: true, type: "boolean", enum: [false] }),
        field("dispatchEligible", { required: true, type: "boolean", enum: [false] }),
        field("checks", { required: true, type: "array" }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "preflightRecord",
      name: "IDE-190 Execution Preflight Contract",
      description: "V3 fail-closed Preflight. A PASS only permits later Gate evaluation; it never permits direct Dispatch.",
      fields: [
        field("preflightId", { required: true, type: "string" }),
        field("dryRunId", { required: true, type: "string" }),
        field("proposalId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("planHash", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V3"] }),
        field("preflightStatus", { required: true, type: "string", enum: ["Passed", "Blocked"] }),
        field("approvalClassRequired", { required: true, type: "string", enum: ["P0", "P1", "P2", "P3", "P4"] }),
        field("approvalRequested", { required: true, type: "boolean", enum: [false] }),
        field("gateRequired", { required: true, type: "boolean", enum: [true] }),
        field("gatePassed", { required: true, type: "boolean", enum: [false] }),
        field("dispatchEligible", { required: true, type: "boolean", enum: [false] }),
        field("repositoryMutation", { required: true, type: "boolean", enum: [false] }),
        field("repositoryWriteCount", { required: true, type: "integer", enum: [0] }),
        field("checks", { required: true, type: "array" }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "authorizationGate",
      name: "IDE-190 V4 Authorization Gate Contract",
      description: "V4 authorization result bound to one Preflight and one immutable authorization context. Gate may authorize later Dispatch but never executes Dispatch or Repository mutation itself.",
      fields: [
        field("gateId", { required: true, type: "string" }),
        field("preflightId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("planHash", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V4"] }),
        field("gateStatus", { required: true, type: "string", enum: ["Passed", "Awaiting-Approval", "Blocked"] }),
        field("approvalClassRequired", { required: true, type: "string", enum: ["P0", "P1", "P2", "P3", "P4"] }),
        field("approvalSatisfied", { required: true, type: "boolean" }),
        field("approvalId", { required: true, type: "string|null" }),
        field("approvalConsumed", { required: true, type: "boolean" }),
        field("hardDeny", { required: true, type: "boolean" }),
        field("contextHash", { required: true, type: "string" }),
        field("authorizationBinding", { required: true, type: "object" }),
        field("consentReference", { required: true, type: "string|null" }),
        field("consentUsedAsApproval", { required: true, type: "boolean", enum: [false] }),
        field("dispatchEligible", { required: true, type: "boolean" }),
        field("dispatchExecuted", { required: true, type: "boolean", enum: [false] }),
        field("repositoryMutation", { required: true, type: "boolean", enum: [false] }),
        field("repositoryWriteCount", { required: true, type: "integer", enum: [0] }),
        field("checks", { required: true, type: "array" }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "approvalRequest",
      name: "IDE-190 Human Approval Request Contract",
      description: "Context-bound request for P1, P2 or P3 Human Approval. P4 is prohibited and P0 never creates Human Approval.",
      fields: [
        field("approvalRequestId", { required: true, type: "string" }),
        field("preflightId", { required: true, type: "string" }),
        field("approvalClass", { required: true, type: "string", enum: ["P1", "P2", "P3"] }),
        field("contextHash", { required: true, type: "string" }),
        field("authorizationBinding", { required: true, type: "object" }),
        field("status", { required: true, type: "string", enum: ["Requested"] }),
        field("singleUse", { required: true, type: "boolean", enum: [true] }),
        field("requestedAt", { required: true, type: "string" }),
        field("expiresAt", { required: true, type: "string" }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "approvalRecord",
      name: "IDE-190 Bound Human Approval Contract",
      description: "Bound, context-specific, single-use, expiring and invalidatable Human Approval. Approval is evidence for Gate only and is not direct Dispatch or mutation permission.",
      fields: [
        field("approvalId", { required: true, type: "string" }),
        field("approvalRequestId", { required: true, type: "string" }),
        field("preflightId", { required: true, type: "string" }),
        field("approvalClass", { required: true, type: "string", enum: ["P1", "P2", "P3"] }),
        field("contextHash", { required: true, type: "string" }),
        field("authorizationBinding", { required: true, type: "object" }),
        field("actor", { required: true, type: "string" }),
        field("actorRole", { required: true, type: "string" }),
        field("reason", { required: true, type: "string" }),
        field("explicitApproval", { required: true, type: "boolean", enum: [true] }),
        field("singleUse", { required: true, type: "boolean", enum: [true] }),
        field("approvedAt", { required: true, type: "string" }),
        field("expiresAt", { required: true, type: "string" }),
        field("initialStatus", { required: true, type: "string", enum: ["Approved"] }),
        field("dispatchPermissionGranted", { required: true, type: "boolean", enum: [false] }),
        field("mutationApplied", { required: true, type: "boolean", enum: [false] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "consentRecord",
      name: "IDE-190 User Explicit Consent Contract",
      description: "User consent for read-only recovery/search. Consent never becomes Approval, import authorization, mutation approval or Dispatch permission.",
      fields: [
        field("consentId", { required: true, type: "string" }),
        field("consentType", { required: true, type: "string", enum: ["Read-Only Recovery", "Archive Search"] }),
        field("actor", { required: true, type: "string" }),
        field("scope", { required: true, type: "object" }),
        field("target", { required: true, type: "object" }),
        field("context", { required: true, type: "object" }),
        field("contextHash", { required: true, type: "string" }),
        field("status", { required: true, type: "string", enum: ["Active"] }),
        field("isApproval", { required: true, type: "boolean", enum: [false] }),
        field("importAuthorizationGranted", { required: true, type: "boolean", enum: [false] }),
        field("mutationApprovalGranted", { required: true, type: "boolean", enum: [false] }),
        field("dispatchPermissionGranted", { required: true, type: "boolean", enum: [false] }),
        field("automaticImportAllowed", { required: true, type: "boolean", enum: [false] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    }    ,
    {
      key: "dispatchRequest",
      name: "IDE-190 Controlled Dispatch Request Contract",
      description: "V5 dispatch request bound to one passed V4 Gate and one explicit registered IDE-160 Component Adapter operation. It cannot call IDE-150 directly or execute Phase 6 mutation trial.",
      fields: [
        field("dispatchRequestId", { required: true, type: "string" }),
        field("gateId", { required: true, type: "string" }),
        field("preflightId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("planHash", { required: true, type: "string" }),
        field("contextHash", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V5"] }),
        field("gateStatus", { required: true, type: "string", enum: ["Passed"] }),
        field("gateDispatchEligible", { required: true, type: "boolean", enum: [true] }),
        field("approvalClass", { required: true, type: "string", enum: ["P0", "P1", "P2", "P3"] }),
        field("approvalId", { required: true, type: "string|null" }),
        field("dispatchMode", { required: true, type: "string", enum: ["IDE-160-Adapter-Registry"] }),
        field("targetComponentId", { required: true, type: "string" }),
        field("adapterId", { required: true, type: "string" }),
        field("adapterOperation", { required: true, type: "string" }),
        field("adapterInput", { required: true, type: "object" }),
        field("directIDE150Call", { required: true, type: "boolean", enum: [false] }),
        field("phase6MutationTrialExecutionAllowed", { required: true, type: "boolean", enum: [false] }),
        field("repositoryMutation", { required: true, type: "boolean", enum: [false] }),
        field("repositoryWriteCount", { required: true, type: "integer", enum: [0] }),
        field("singleUse", { required: true, type: "boolean", enum: [true] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "executionResult",
      name: "IDE-190 V5 Execution Result Contract",
      description: "V5 result proving controlled dispatch occurred through IDE-160 without direct IDE-150 invocation, repository mutation, persistent commit, or Phase 6 mutation execution.",
      fields: [
        field("executionResultId", { required: true, type: "string" }),
        field("dispatchRequestId", { required: true, type: "string" }),
        field("gateId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("planHash", { required: true, type: "string" }),
        field("contextHash", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V5"] }),
        field("dispatchStatus", { required: true, type: "string", enum: ["Succeeded", "Failed"] }),
        field("executionSucceeded", { required: true, type: "boolean" }),
        field("ide160InvocationUsed", { required: true, type: "boolean", enum: [true] }),
        field("dispatchMode", { required: true, type: "string", enum: ["IDE-160-Adapter-Registry"] }),
        field("targetComponentId", { required: true, type: "string" }),
        field("adapterId", { required: true, type: "string" }),
        field("adapterOperation", { required: true, type: "string" }),
        field("adapterInvocationCode", { required: true, type: "string" }),
        field("adapterInvocationStatus", { required: true, type: "string" }),
        field("adapterOutput", { required: true, type: "object|null" }),
        field("directIDE150Call", { required: true, type: "boolean", enum: [false] }),
        field("phase6Required", { required: true, type: "boolean" }),
        field("phase6MutationTrialExecuted", { required: true, type: "boolean", enum: [false] }),
        field("repositoryMutation", { required: true, type: "boolean", enum: [false] }),
        field("repositoryWriteCount", { required: true, type: "integer", enum: [0] }),
        field("persistentCommit", { required: true, type: "boolean", enum: [false] }),
        field("verificationRequired", { required: true, type: "boolean", enum: [true] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("completedAt", { required: true, type: "string" })
      ]
    },
    {
      key: "mutationTrialRecord",
      name: "IDE-190 Controlled Mutation Trial Record Contract",
      description: "L4/M2/E1 trial record bound to a P2 Project Owner approval, Phase 5 IDE-150 Prepare result, IDE-160 invocation, mandatory rollback, and no persistent commit.",
      fields: [
        field("mutationTrialId", { required: true, type: "string" }),
        field("executionResultId", { required: true, type: "string" }),
        field("dispatchRequestId", { required: true, type: "string" }),
        field("gateId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("planHash", { required: true, type: "string" }),
        field("contextHash", { required: true, type: "string" }),
        field("approvalId", { required: true, type: "string" }),
        field("approvalClass", { required: true, type: "string", enum: ["P2"] }),
        field("projectOwnerApproval", { required: true, type: "boolean", enum: [true] }),
        field("componentSessionId", { required: true, type: "string" }),
        field("componentApprovalSucceeded", { required: true, type: "boolean" }),
        field("ide160InvocationUsed", { required: true, type: "boolean", enum: [true] }),
        field("directIDE150Call", { required: true, type: "boolean", enum: [false] }),
        field("automationLevel", { required: true, type: "string", enum: ["L4"] }),
        field("mutationLevel", { required: true, type: "string", enum: ["M2"] }),
        field("executionMode", { required: true, type: "string", enum: ["E1"] }),
        field("temporaryMutationApplied", { required: true, type: "boolean" }),
        field("postValidationPassed", { required: true, type: "boolean" }),
        field("repositoryIntegrityRecordId", { required: true, type: "string" }),
        field("rollbackRestorationRecordId", { required: true, type: "string" }),
        field("rollbackVerified", { required: true, type: "boolean" }),
        field("sourceRestored", { required: true, type: "boolean" }),
        field("repositoryTrustStatus", { required: true, type: "string", enum: ["Trusted", "Untrusted"] }),
        field("persistentCommit", { required: true, type: "boolean", enum: [false] }),
        field("status", { required: true, type: "string", enum: ["Trial Completed and Rolled Back", "Failed", "Recovery-Required"] }),
        field("singleUse", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("completedAt", { required: true, type: "string" })
      ]
    },
    {
      key: "repositoryIntegrityRecord",
      name: "IDE-190 V6 Repository Integrity Record Contract",
      description: "V6 record proving the controlled trial used only temporary runtime Repository writes and never persistent or ZIP mutation.",
      fields: [
        field("repositoryIntegrityRecordId", { required: true, type: "string" }),
        field("mutationTrialId", { required: true, type: "string" }),
        field("executionResultId", { required: true, type: "string" }),
        field("gateId", { required: true, type: "string" }),
        field("planId", { required: true, type: "string" }),
        field("contextHash", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V6"] }),
        field("targetFile", { required: true, type: "string" }),
        field("targetFunction", { required: true, type: "string" }),
        field("temporaryMutationApplied", { required: true, type: "boolean" }),
        field("repositoryWriteCount", { required: true, type: "integer" }),
        field("targetOnlyWritesVerified", { required: true, type: "boolean" }),
        field("originalHash", { required: true, type: "string" }),
        field("restoredHash", { required: true, type: "string" }),
        field("sourceRestored", { required: true, type: "boolean" }),
        field("persistentCommit", { required: true, type: "boolean", enum: [false] }),
        field("zipFileMutation", { required: true, type: "boolean", enum: [false] }),
        field("integrityStatus", { required: true, type: "string", enum: ["Verified", "Failed"] }),
        field("directIDE150Call", { required: true, type: "boolean", enum: [false] }),
        field("ide160InvocationUsed", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "rollbackRestorationRecord",
      name: "IDE-190 V7 Rollback / Restoration Record Contract",
      description: "V7 mandatory rollback and exact source restoration proof. Recovery-Required marks Repository Untrusted and blocks later mutation.",
      fields: [
        field("rollbackRestorationRecordId", { required: true, type: "string" }),
        field("mutationTrialId", { required: true, type: "string" }),
        field("executionResultId", { required: true, type: "string" }),
        field("gateId", { required: true, type: "string" }),
        field("validationLayer", { required: true, type: "string", enum: ["V7"] }),
        field("rollbackId", { required: true, type: "string|null" }),
        field("mandatoryRollback", { required: true, type: "boolean", enum: [true] }),
        field("rollbackExecuted", { required: true, type: "boolean" }),
        field("rollbackVerified", { required: true, type: "boolean" }),
        field("restorationVerificationRequired", { required: true, type: "boolean", enum: [true] }),
        field("sourceRestored", { required: true, type: "boolean" }),
        field("originalHash", { required: true, type: "string" }),
        field("restoredHash", { required: true, type: "string" }),
        field("restorationStatus", { required: true, type: "string", enum: ["Verified", "Recovery-Required"] }),
        field("repositoryTrustStatus", { required: true, type: "string", enum: ["Trusted", "Untrusted"] }),
        field("persistentCommit", { required: true, type: "boolean", enum: [false] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    }
  ];

  function typeMatches(value, type) {
    if (type === "array") return Array.isArray(value);
    if (type === "object") return internal.isPlainObject(value);
    if (type === "boolean") return typeof value === "boolean";
    if (type === "integer") return Number.isInteger(value);
    if (type === "string") return typeof value === "string";
    if (type === "string|null") return value == null || typeof value === "string";
    if (type === "object|null") return value == null || internal.isPlainObject(value);
    return true;
  }

  function normalizeDefinition(definition) {
    const key = internal.text(definition && definition.key, "");
    const contractId = VERSION_MANIFEST.getContractId(key);
    const version = VERSION_MANIFEST.getContractVersion(key);
    return internal.deepFreeze({
      contractId: contractId,
      key: key,
      name: internal.text(definition && definition.name, key),
      version: version,
      status: "Active",
      description: internal.text(definition && definition.description, ""),
      fields: (definition && Array.isArray(definition.fields) ? definition.fields : []).map(function copyField(item) {
        return Object.freeze(Object.assign({}, item));
      }),
      readOnly: true,
      owner: "IDE-190",
      source: "IDE-190-DESIGN-FREEZE-1.0.0"
    });
  }

  function registerContract(definition) {
    const normalized = normalizeDefinition(definition);
    if (!normalized.contractId || !normalized.version) {
      return internal.buildResult(false, "IDE190_CONTRACT_DEFINITION_INVALID", "Blocked", null, {
        error: { message: "Contract ID or version is missing.", category: "Validation Failure" }
      });
    }
    const existing = state.contracts.get(normalized.contractId);
    if (existing && existing.version === normalized.version) {
      return internal.buildResult(true, "IDE190_CONTRACT_EXISTS", "Ready", { contract: internal.clone(existing), existing: true });
    }
    if (existing && existing.version !== normalized.version) {
      return internal.buildResult(false, "IDE190_CONTRACT_VERSION_CONFLICT", "Blocked", {
        existing: internal.clone(existing), incoming: internal.clone(normalized)
      });
    }
    state.contracts.set(normalized.contractId, normalized);
    internal.touch();
    return internal.buildResult(true, "IDE190_CONTRACT_REGISTERED", "Ready", { contract: internal.clone(normalized), existing: false });
  }

  function getContractDefinition(contractIdOrKey) {
    const direct = state.contracts.get(internal.text(contractIdOrKey, ""));
    if (direct) return internal.clone(direct);
    const id = VERSION_MANIFEST.getContractId(internal.text(contractIdOrKey, ""));
    return id && state.contracts.has(id) ? internal.clone(state.contracts.get(id)) : null;
  }

  function listContractDefinitions() {
    return Array.from(state.contracts.values()).map(function copy(item) { return internal.clone(item); });
  }

  function validateContract(contractIdOrKey, payload) {
    const definition = getContractDefinition(contractIdOrKey);
    const checks = [];
    function check(name, passed, detail, fieldName) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), field: fieldName || null });
    }

    check("Contract definition exists", Boolean(definition), contractIdOrKey);
    if (!definition) return { valid: false, status: "Invalid", passed: 0, failed: 1, total: 1, health: 0, checks: checks };

    check("Payload is an object", internal.isPlainObject(payload), typeof payload);
    if (!internal.isPlainObject(payload)) {
      const passed = checks.filter(function count(item) { return item.passed; }).length;
      return { valid: false, status: "Invalid", contractId: definition.contractId, contractVersion: definition.version, passed: passed, failed: checks.length - passed, total: checks.length, health: Number(((passed / checks.length) * 100).toFixed(2)), checks: checks };
    }

    definition.fields.forEach(function validateField(rule) {
      const has = Object.prototype.hasOwnProperty.call(payload, rule.name);
      if (rule.required) check("Required field exists: " + rule.name, has, has ? "present" : "missing", rule.name);
      if (!has) return;
      check("Field type is valid: " + rule.name, typeMatches(payload[rule.name], rule.type), rule.type || "any", rule.name);
      if (Array.isArray(rule.enum)) check("Field value is governed: " + rule.name, rule.enum.includes(payload[rule.name]), payload[rule.name], rule.name);
    });

    if (definition.key === "foundation") {
      check("Frozen lifecycle is exact", JSON.stringify(payload.lifecycle) === JSON.stringify(VERSION_MANIFEST.lifecycle), payload.lifecycle && payload.lifecycle.join(" -> "), "lifecycle");
      const safetyKeys = Object.keys(VERSION_MANIFEST.safety);
      check("Safety key set is exact", JSON.stringify(Object.keys(payload.safetyDefaults || {}).sort()) === JSON.stringify(safetyKeys.slice().sort()), safetyKeys.length, "safetyDefaults");
      safetyKeys.forEach(function validateSafety(key) { check("Safety remains false: " + key, payload.safetyDefaults && payload.safetyDefaults[key] === false, payload.safetyDefaults && payload.safetyDefaults[key], "safetyDefaults." + key); });
    }

    if (definition.key === "capabilityDescriptor") {
      const prohibited = payload.automationLevel === "L5" || payload.mutationLevel === "M3" || payload.executionMode === "E2" || payload.externalEffectLevel === "X2" || payload.externalEffectLevel === "X3";
      if (prohibited) check("Initial hard-deny capability remains prohibited", payload.permissionClass === "PROHIBITED", payload.permissionClass, "permissionClass");
      check("Capability existence does not imply permission", !(payload.available === true && prohibited && payload.permissionClass !== "PROHIBITED"), payload.available + "/" + payload.permissionClass, "available");
    }

    if (definition.key === "platformProfile") {
      check("Platform does not grant persistent commit", payload.persistentCommitPermission === false, payload.persistentCommitPermission, "persistentCommitPermission");
      check("Platform does not grant GitHub automatic reflection", payload.githubAutomaticReflectionPermission === false, payload.githubAutomaticReflectionPermission, "githubAutomaticReflectionPermission");
      check("Platform does not bypass approval", payload.approvalBypassAllowed === false, payload.approvalBypassAllowed, "approvalBypassAllowed");
    }

    if (definition.key === "navigationIntake") {
      check("Formal input uses validated IDE-180 package and handoff", payload.groundingInputType === "validated-ide180-package-plus-handoff", payload.groundingInputType, "groundingInputType");
      check("IDE-180 Provider bypass is not used", payload.providerBypassUsed === false, payload.providerBypassUsed, "providerBypassUsed");
      check("Missing Source inference is not used", payload.missingSourceInferenceUsed === false, payload.missingSourceInferenceUsed, "missingSourceInferenceUsed");
      check("Package and Handoff linkage is valid", payload.linkageValid === true, payload.linkageValid, "linkageValid");
    }

    if (definition.key === "groundingContext") {
      const hasMissing = Array.isArray(payload.missingSources) && payload.missingSources.length > 0;
      check("Grounding never uses inference", payload.inferenceUsed === false, payload.inferenceUsed, "inferenceUsed");
      check("Grounding never recomputes IDE-180 Authority", payload.authorityRecomputed === false, payload.authorityRecomputed, "authorityRecomputed");
      check("Grounding never composes IDE-180 Providers", payload.providerCompositionUsed === false, payload.providerCompositionUsed, "providerCompositionUsed");
      check("Phase 2 never becomes Dispatch eligible", payload.dispatchEligible === false, payload.dispatchEligible, "dispatchEligible");
      if (hasMissing) {
        check("Missing Source requires Recovery-Required", payload.groundingStatus === "Recovery-Required", payload.groundingStatus, "groundingStatus");
        check("Missing Source cannot become Plan eligible", payload.planEligible === false, payload.planEligible, "planEligible");
        check("Missing Source Recovery is delegated to IDE-180", payload.recoveryDelegation && payload.recoveryDelegation.ownerComponentId === "IDE-180", payload.recoveryDelegation && payload.recoveryDelegation.ownerComponentId, "recoveryDelegation.ownerComponentId");
      }
    }

    if (definition.key === "automationPlan") {
      const hardDenied = payload.automationLevel === "L5" || payload.mutationLevel === "M3" || payload.requestedExecutionMode === "E2" || payload.externalEffectLevel === "X2" || payload.externalEffectLevel === "X3";
      check("Plan cannot contain Initial hard-deny capability", hardDenied === false, hardDenied, "permissionBoundary");
      check("Plan never requests Approval in Phase 3", payload.approvalRequested === false, payload.approvalRequested, "approvalRequested");
      check("Plan never auto-applies", payload.autoApply === false, payload.autoApply, "autoApply");
      check("Plan never becomes Dispatch eligible", payload.dispatchEligible === false, payload.dispatchEligible, "dispatchEligible");
    }

    if (definition.key === "automationProposal") {
      check("Proposal is not execution permission", payload.executionPermissionGranted === false, payload.executionPermissionGranted, "executionPermissionGranted");
      check("Proposal is not mutation approval", payload.mutationApprovalGranted === false, payload.mutationApprovalGranted, "mutationApprovalGranted");
      check("Proposal never becomes Dispatch eligible", payload.dispatchEligible === false, payload.dispatchEligible, "dispatchEligible");
    }

    if (definition.key === "dryRunRecord") {
      check("E0 Dry Run never mutates Repository", payload.repositoryMutation === false && payload.repositoryWriteCount === 0, payload.repositoryWriteCount, "repositoryWriteCount");
      check("E0 Dry Run leaves Source unchanged", payload.sourceUnchanged === true, payload.sourceUnchanged, "sourceUnchanged");
      check("E0 Dry Run never attempts application", payload.applicationAttempted === false, payload.applicationAttempted, "applicationAttempted");
      check("E0 Dry Run never requests Approval", payload.approvalRequested === false, payload.approvalRequested, "approvalRequested");
      check("E0 Dry Run never auto-applies", payload.autoApply === false, payload.autoApply, "autoApply");
      check("E0 Dry Run never Dispatches", payload.dispatchEligible === false, payload.dispatchEligible, "dispatchEligible");
    }

    if (definition.key === "preflightRecord") {
      check("Preflight requires Gate", payload.gateRequired === true, payload.gateRequired, "gateRequired");
      check("Preflight itself never passes Gate", payload.gatePassed === false, payload.gatePassed, "gatePassed");
      check("Preflight never Dispatches directly", payload.dispatchEligible === false, payload.dispatchEligible, "dispatchEligible");
      check("Preflight never mutates Repository", payload.repositoryMutation === false && payload.repositoryWriteCount === 0, payload.repositoryWriteCount, "repositoryWriteCount");
      check("Preflight never requests Approval directly", payload.approvalRequested === false, payload.approvalRequested, "approvalRequested");
    }

    if (definition.key === "authorizationGate") {
      const passedGate = payload.gateStatus === "Passed";
      check("Consent is never used as Approval", payload.consentUsedAsApproval === false, payload.consentUsedAsApproval, "consentUsedAsApproval");
      check("Gate never executes Dispatch", payload.dispatchExecuted === false, payload.dispatchExecuted, "dispatchExecuted");
      check("Gate never mutates Repository", payload.repositoryMutation === false && payload.repositoryWriteCount === 0, payload.repositoryWriteCount, "repositoryWriteCount");
      if (payload.approvalClassRequired === "P4") check("P4 Gate is always blocked", payload.gateStatus === "Blocked" && payload.hardDeny === true, payload.gateStatus, "gateStatus");
      if (passedGate) {
        check("Passed Gate is not Hard Deny", payload.hardDeny === false, payload.hardDeny, "hardDeny");
        check("Passed Gate is Dispatch eligible for later Phase only", payload.dispatchEligible === true, payload.dispatchEligible, "dispatchEligible");
        if (payload.approvalClassRequired === "P0") check("P0 requires no Human Approval", payload.approvalSatisfied === true && payload.approvalId === null && payload.approvalConsumed === false, payload.approvalId, "approvalId");
        else check("Human Approval is satisfied and consumed exactly once", payload.approvalSatisfied === true && typeof payload.approvalId === "string" && payload.approvalId.length > 0 && payload.approvalConsumed === true, payload.approvalId, "approvalId");
      } else {
        check("Non-passed Gate cannot Dispatch", payload.dispatchEligible === false, payload.dispatchEligible, "dispatchEligible");
      }
    }

    if (definition.key === "approvalRequest") {
      check("P4 cannot be requested", payload.approvalClass !== "P4", payload.approvalClass, "approvalClass");
      check("P0 does not create Human Approval Request", payload.approvalClass !== "P0", payload.approvalClass, "approvalClass");
      check("Approval Request is single-use scoped", payload.singleUse === true, payload.singleUse, "singleUse");
    }

    if (definition.key === "approvalRecord") {
      check("Approval is explicit", payload.explicitApproval === true, payload.explicitApproval, "explicitApproval");
      check("Approval is single-use", payload.singleUse === true, payload.singleUse, "singleUse");
      check("Approval itself does not directly grant Dispatch", payload.dispatchPermissionGranted === false, payload.dispatchPermissionGranted, "dispatchPermissionGranted");
      check("Approval itself does not mutate Repository", payload.mutationApplied === false, payload.mutationApplied, "mutationApplied");
      if (payload.approvalClass === "P2") check("P2 is Project Owner Approval", payload.actorRole === "Project Owner", payload.actorRole, "actorRole");
    }

    if (definition.key === "consentRecord") {
      check("Consent is not Approval", payload.isApproval === false, payload.isApproval, "isApproval");
      check("Archive Search Consent is not Import Authorization", payload.importAuthorizationGranted === false, payload.importAuthorizationGranted, "importAuthorizationGranted");
      check("Consent is not Mutation Approval", payload.mutationApprovalGranted === false, payload.mutationApprovalGranted, "mutationApprovalGranted");
      check("Consent is not Dispatch Permission", payload.dispatchPermissionGranted === false, payload.dispatchPermissionGranted, "dispatchPermissionGranted");
      check("Consent never enables automatic Import", payload.automaticImportAllowed === false, payload.automaticImportAllowed, "automaticImportAllowed");
    }

    if (definition.key === "dispatchRequest") {
      check("Dispatch is bound to a Passed Gate", payload.gateStatus === "Passed" && payload.gateDispatchEligible === true, payload.gateStatus, "gateStatus");
      check("Dispatch uses IDE-160 Adapter Registry", payload.dispatchMode === "IDE-160-Adapter-Registry", payload.dispatchMode, "dispatchMode");
      check("Dispatch never calls IDE-150 directly", payload.directIDE150Call === false, payload.directIDE150Call, "directIDE150Call");
      check("Phase 5 never executes Phase 6 Mutation Trial", payload.phase6MutationTrialExecutionAllowed === false, payload.phase6MutationTrialExecutionAllowed, "phase6MutationTrialExecutionAllowed");
      check("Dispatch Request never mutates Repository", payload.repositoryMutation === false && payload.repositoryWriteCount === 0, payload.repositoryWriteCount, "repositoryWriteCount");
      check("Dispatch Request is single-use", payload.singleUse === true, payload.singleUse, "singleUse");
    }

    if (definition.key === "executionResult") {
      check("V5 uses IDE-160 invocation", payload.ide160InvocationUsed === true, payload.ide160InvocationUsed, "ide160InvocationUsed");
      check("V5 has no direct IDE-150 call", payload.directIDE150Call === false, payload.directIDE150Call, "directIDE150Call");
      check("V5 has no Phase 6 Mutation Trial execution", payload.phase6MutationTrialExecuted === false, payload.phase6MutationTrialExecuted, "phase6MutationTrialExecuted");
      check("V5 has no Repository mutation", payload.repositoryMutation === false && payload.repositoryWriteCount === 0, payload.repositoryWriteCount, "repositoryWriteCount");
      check("V5 never Persistent Commits", payload.persistentCommit === false, payload.persistentCommit, "persistentCommit");
      check("V5 requires later verification", payload.verificationRequired === true, payload.verificationRequired, "verificationRequired");
    }

    if (definition.key === "mutationTrialRecord") {
      check("Mutation Trial is exact L4/M2/E1", payload.automationLevel === "L4" && payload.mutationLevel === "M2" && payload.executionMode === "E1", payload.automationLevel + "/" + payload.mutationLevel + "/" + payload.executionMode, "mutationLevel");
      check("Mutation Trial requires Project Owner P2 Approval", payload.approvalClass === "P2" && payload.projectOwnerApproval === true, payload.approvalClass, "approvalClass");
      check("Mutation Trial uses IDE-160 and never direct IDE-150", payload.ide160InvocationUsed === true && payload.directIDE150Call === false, payload.directIDE150Call, "directIDE150Call");
      check("Mutation Trial never Persistent Commits", payload.persistentCommit === false, payload.persistentCommit, "persistentCommit");
      if (payload.status === "Trial Completed and Rolled Back") {
        check("Completed Trial proves Rollback and Restoration", payload.temporaryMutationApplied === true && payload.postValidationPassed === true && payload.rollbackVerified === true && payload.sourceRestored === true && payload.repositoryTrustStatus === "Trusted", payload.repositoryTrustStatus, "sourceRestored");
      }
    }

    if (definition.key === "repositoryIntegrityRecord") {
      check("V6 never Persistent Commits", payload.persistentCommit === false && payload.zipFileMutation === false, payload.persistentCommit, "persistentCommit");
      check("V6 uses IDE-160 and no direct IDE-150 call", payload.ide160InvocationUsed === true && payload.directIDE150Call === false, payload.directIDE150Call, "directIDE150Call");
      if (payload.integrityStatus === "Verified") check("V6 Verified means exact source restored", payload.sourceRestored === true && payload.originalHash && payload.originalHash === payload.restoredHash && payload.targetOnlyWritesVerified === true, payload.restoredHash, "restoredHash");
    }

    if (definition.key === "rollbackRestorationRecord") {
      check("V7 Mandatory Rollback remains required", payload.mandatoryRollback === true && payload.restorationVerificationRequired === true, payload.mandatoryRollback, "mandatoryRollback");
      check("V7 never Persistent Commits", payload.persistentCommit === false, payload.persistentCommit, "persistentCommit");
      if (payload.restorationStatus === "Verified") check("V7 Verified means Rollback and exact Restoration", payload.rollbackExecuted === true && payload.rollbackVerified === true && payload.sourceRestored === true && payload.originalHash && payload.originalHash === payload.restoredHash && payload.repositoryTrustStatus === "Trusted", payload.repositoryTrustStatus, "repositoryTrustStatus");
      if (payload.restorationStatus === "Recovery-Required") check("V7 Recovery-Required marks Repository Untrusted", payload.repositoryTrustStatus === "Untrusted", payload.repositoryTrustStatus, "repositoryTrustStatus");
    }

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return {
      valid: failed === 0,
      status: failed === 0 ? "Valid" : "Invalid",
      contractId: definition.contractId,
      contractVersion: definition.version,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function initializeContracts() {
    const results = BUILT_IN_CONTRACTS.map(registerContract);
    const failed = results.filter(function failedResult(result) { return !result || result.ok !== true; });
    namespace.modules.contracts.status = failed.length === 0 ? "Ready" : "Blocked";
    return internal.buildResult(
      failed.length === 0,
      failed.length === 0 ? "IDE190_CONTRACTS_INITIALIZED" : "IDE190_CONTRACTS_INITIALIZATION_FAILED",
      failed.length === 0 ? "Ready" : "Blocked",
      { registered: state.contracts.size, expected: BUILT_IN_CONTRACTS.length, results: results }
    );
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
    id: "IDE-190-CONTRACTS",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 5,
    contractCount: BUILT_IN_CONTRACTS.length,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
