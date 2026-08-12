/* ============================================================
   FILE: 13_development_automation_mutation_trial.js
   IDE-190 Development Automation
   Release: 1.5.0 / Module: Controlled Mutation Trial 1.0.0
   Phase 6: IDE-150 Controlled Mutation Trial
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 mutation trial blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("mutationTrial");
  const IDE150_ADAPTER_ID = "IDE-160-ADAPTER-IDE-150";
  const PREPARE_OPERATIONS = Object.freeze([
    "Prepare Controlled Application",
    "Prepare Controlled Application Async"
  ]);

  function ensureRuntimeState() {
    if (!(state.mutationTrials instanceof Map)) state.mutationTrials = new Map();
    if (!(state.repositoryIntegrityRecords instanceof Map)) state.repositoryIntegrityRecords = new Map();
    if (!(state.rollbackRestorationRecords instanceof Map)) state.rollbackRestorationRecords = new Map();
    if (!(state.phase6ExecutionStates instanceof Map)) state.phase6ExecutionStates = new Map();
    if (!state.mutationTrialLock || typeof state.mutationTrialLock !== "object") {
      state.mutationTrialLock = { active: false, mutationTrialId: null, acquiredAt: null, releasedAt: null };
    }
    if (!state.repositoryMutationTrust || typeof state.repositoryMutationTrust !== "object") {
      state.repositoryMutationTrust = {
        status: "Trusted",
        reason: "",
        mutationTrialId: null,
        rollbackId: null,
        markedAt: null
      };
    }
    if (!Object.prototype.hasOwnProperty.call(state, "latestMutationTrialId")) state.latestMutationTrialId = null;
    if (!Object.prototype.hasOwnProperty.call(state, "latestRepositoryIntegrityRecordId")) state.latestRepositoryIntegrityRecordId = null;
    if (!Object.prototype.hasOwnProperty.call(state, "latestRollbackRestorationRecordId")) state.latestRollbackRestorationRecordId = null;
  }
  ensureRuntimeState();

  function getIDE160Api() {
    const ide160 = global.AIPromptOSIDE160;
    return ide160 && ide160.api && typeof ide160.api === "object" ? ide160.api : null;
  }

  function getExecutionResult(id) {
    const key = internal.text(id, state.latestExecutionResultId || "");
    return state.executionResults instanceof Map ? state.executionResults.get(key) || null : null;
  }

  function getGate(id) {
    return state.authorizationGates instanceof Map ? state.authorizationGates.get(internal.text(id, "")) || null : null;
  }

  function getPlan(id) {
    return state.plans instanceof Map ? state.plans.get(internal.text(id, "")) || null : null;
  }

  function getApproval(id) {
    return state.approvals instanceof Map ? state.approvals.get(internal.text(id, "")) || null : null;
  }

  function getInvocationOutput(invocation) {
    if (!invocation || !invocation.data) return null;
    if (Object.prototype.hasOwnProperty.call(invocation.data, "output")) return invocation.data.output;
    if (Object.prototype.hasOwnProperty.call(invocation.data, "rawResult")) return invocation.data.rawResult;
    return null;
  }

  function repositoryTrustStatus() {
    ensureRuntimeState();
    return internal.clone(state.repositoryMutationTrust);
  }

  function mutationLockStatus() {
    ensureRuntimeState();
    return internal.clone(state.mutationTrialLock);
  }

  function markRepositoryUntrusted(reason, mutationTrialId, rollbackId) {
    state.repositoryMutationTrust = {
      status: "Untrusted",
      reason: internal.text(reason, "Rollback / Restoration verification failed."),
      mutationTrialId: internal.text(mutationTrialId, "") || null,
      rollbackId: internal.text(rollbackId, "") || null,
      markedAt: internal.nowIso()
    };
    internal.touch();
    return repositoryTrustStatus();
  }

  function acquireMutationLock(mutationTrialId) {
    ensureRuntimeState();
    if (state.mutationTrialLock.active === true) return false;
    state.mutationTrialLock = {
      active: true,
      mutationTrialId: mutationTrialId,
      acquiredAt: internal.nowIso(),
      releasedAt: null
    };
    internal.touch();
    return true;
  }

  function releaseMutationLock(mutationTrialId) {
    if (!state.mutationTrialLock || state.mutationTrialLock.mutationTrialId !== mutationTrialId) return false;
    state.mutationTrialLock = {
      active: false,
      mutationTrialId: null,
      acquiredAt: state.mutationTrialLock.acquiredAt || null,
      releasedAt: internal.nowIso()
    };
    internal.touch();
    return true;
  }

  function validatePreparedExecutionResult(executionResult) {
    ensureRuntimeState();
    const reasons = [];
    if (!executionResult) reasons.push("V5 Execution Result Required");
    if (executionResult && executionResult.validationLayer !== "V5") reasons.push("V5 Result Required");
    if (executionResult && executionResult.dispatchStatus !== "Succeeded") reasons.push("Phase 5 Dispatch Must Succeed");
    if (executionResult && executionResult.executionSucceeded !== true) reasons.push("Phase 5 Execution Result Must Succeed");
    if (executionResult && executionResult.ide160InvocationUsed !== true) reasons.push("IDE-160 Invocation Required");
    if (executionResult && executionResult.directIDE150Call !== false) reasons.push("Direct IDE-150 Call Prohibited");
    if (executionResult && executionResult.targetComponentId !== "IDE-150") reasons.push("IDE-150 Target Required");
    if (executionResult && executionResult.adapterId !== IDE150_ADAPTER_ID) reasons.push("Registered IDE-150 Adapter Required");
    if (executionResult && !PREPARE_OPERATIONS.includes(executionResult.adapterOperation)) reasons.push("Phase 5 Prepare Result Required");
    if (executionResult && executionResult.phase6Required !== true) reasons.push("Phase 6 Continuation Marker Required");
    if (executionResult && executionResult.phase6MutationTrialExecuted !== false) reasons.push("Mutation Trial Must Not Already Be Executed");
    if (executionResult && executionResult.repositoryMutation !== false) reasons.push("V5 Must Be Pre-Mutation");
    if (executionResult && executionResult.persistentCommit !== false) reasons.push("Persistent Commit Prohibited");

    const gate = executionResult ? getGate(executionResult.gateId) : null;
    if (!gate) reasons.push("V4 Gate Required");
    if (gate && gate.gateStatus !== "Passed") reasons.push("Passed V4 Gate Required");
    if (gate && gate.approvalClassRequired !== "P2") reasons.push("P2 Controlled Mutation Approval Required");
    if (gate && !(gate.approvalSatisfied === true && gate.approvalConsumed === true && gate.approvalId)) reasons.push("Consumed P2 Approval Required");
    if (gate && gate.hardDeny === true) reasons.push("Hard Deny Active");
    if (gate && (!gate.authorizationBinding || !gate.authorizationBinding.rollback || gate.authorizationBinding.rollback.required !== true || gate.authorizationBinding.rollback.mandatory !== true || gate.authorizationBinding.rollback.restorationVerificationRequired !== true)) reasons.push("Mandatory Rollback Binding Required");
    if (gate && (!gate.authorizationBinding || !gate.authorizationBinding.repositoryBaseline || !internal.text(gate.authorizationBinding.repositoryBaseline.repositoryBaselineId, "") || !internal.text(gate.authorizationBinding.repositoryBaseline.repositoryHash, ""))) reasons.push("Explicit Repository Baseline Required");

    const plan = gate ? getPlan(gate.planId) : null;
    if (!plan) reasons.push("Automation Plan Required");
    if (plan && !(plan.automationLevel === "L4" && plan.mutationLevel === "M2" && plan.requestedExecutionMode === "E1")) reasons.push("L4/M2/E1 Mutation Trial Required");
    if (plan && (plan.automationLevel === "L5" || plan.mutationLevel === "M3" || plan.requestedExecutionMode === "E2")) reasons.push("Persistent Mutation Hard Deny");

    const approval = gate && gate.approvalId ? getApproval(gate.approvalId) : null;
    if (!approval) reasons.push("P2 Approval Record Required");
    if (approval && !(approval.approvalClass === "P2" && approval.actorRole === "Project Owner" && approval.explicitApproval === true && approval.contextHash === gate.contextHash)) reasons.push("Exact Project Owner P2 Approval Required");

    const prepared = executionResult && executionResult.adapterOutput;
    if (!prepared || prepared.prepared !== true || !prepared.session || !internal.text(prepared.session.id, "")) reasons.push("IDE-150 Prepared Session Required");
    if (prepared && prepared.executionRequirements && prepared.executionRequirements.persistentCommitAllowed !== false) reasons.push("IDE-150 Persistent Commit Must Be Disabled");
    if (prepared && prepared.session && prepared.session.persistentCommitAllowed !== false) reasons.push("Prepared Session Persistent Commit Must Be Disabled");
    if (prepared && (!prepared.approvalRequirements || !internal.text(prepared.approvalRequirements.confirmationText, ""))) reasons.push("IDE-150 Approval Challenge Required");
    if (prepared && (!prepared.executionRequirements || !internal.text(prepared.executionRequirements.confirmationText, ""))) reasons.push("IDE-150 Execution Challenge Required");

    if (state.phase6ExecutionStates.has(executionResult && executionResult.executionResultId)) reasons.push("V5 Prepare Result Already Used");
    if (state.repositoryMutationTrust.status !== "Trusted") reasons.push("Repository Untrusted");
    if (state.mutationTrialLock.active === true) reasons.push("Mutation Trial Lock Active");

    return {
      valid: reasons.length === 0,
      status: reasons.length === 0 ? "Valid" : "Blocked",
      reasons: reasons,
      executionResult: internal.clone(executionResult),
      gate: internal.clone(gate),
      plan: internal.clone(plan),
      approval: internal.clone(approval),
      prepared: internal.clone(prepared),
      repositoryTrust: repositoryTrustStatus(),
      mutationLock: mutationLockStatus(),
      checkedAt: internal.nowIso()
    };
  }

  function buildRepositoryIntegrityRecord(trialId, context, executionOutput) {
    const repository = executionOutput && executionOutput.repository || {};
    const record = {
      repositoryIntegrityRecordId: internal.nextId("IDE-190-REPOSITORY-INTEGRITY"),
      mutationTrialId: trialId,
      executionResultId: context.executionResult.executionResultId,
      gateId: context.gate.gateId,
      planId: context.plan.planId,
      contextHash: context.gate.contextHash,
      validationLayer: "V6",
      targetFile: internal.text(context.prepared && context.prepared.session && context.prepared.session.target && context.prepared.session.target.file, ""),
      targetFunction: internal.text(context.prepared && context.prepared.session && context.prepared.session.target && context.prepared.session.target.function, ""),
      temporaryMutationApplied: Boolean(executionOutput && executionOutput.application && executionOutput.application.applied === true),
      repositoryWriteCount: Number.isInteger(repository.writeCount) ? repository.writeCount : 0,
      targetOnlyWritesVerified: Array.isArray(repository.writes) && repository.writes.every(function every(item) { return item && item.verified === true; }),
      originalHash: internal.text(repository.originalHash, ""),
      restoredHash: internal.text(repository.restoredHash, ""),
      sourceRestored: repository.sourceRestored === true,
      persistentCommit: repository.persistentCommit === true,
      zipFileMutation: repository.zipFileMutation === true,
      integrityStatus: repository.sourceRestored === true && repository.persistentCommit === false && repository.zipFileMutation === false ? "Verified" : "Failed",
      directIDE150Call: false,
      ide160InvocationUsed: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    return record;
  }

  function buildRollbackRestorationRecord(trialId, context, executionOutput, repositoryIntegrity) {
    const rollback = executionOutput && executionOutput.rollback || {};
    const repository = executionOutput && executionOutput.repository || {};
    const verified = rollback.rolledBack === true && rollback.verified === true && repository.sourceRestored === true && repositoryIntegrity.integrityStatus === "Verified";
    return {
      rollbackRestorationRecordId: internal.nextId("IDE-190-ROLLBACK-RESTORATION"),
      mutationTrialId: trialId,
      executionResultId: context.executionResult.executionResultId,
      gateId: context.gate.gateId,
      validationLayer: "V7",
      rollbackId: internal.text(rollback.rollbackId, "") || null,
      mandatoryRollback: true,
      rollbackExecuted: rollback.rolledBack === true,
      rollbackVerified: rollback.verified === true,
      restorationVerificationRequired: true,
      sourceRestored: repository.sourceRestored === true,
      originalHash: internal.text(repository.originalHash, ""),
      restoredHash: internal.text(repository.restoredHash, ""),
      restorationStatus: verified ? "Verified" : "Recovery-Required",
      repositoryTrustStatus: verified ? "Trusted" : "Untrusted",
      persistentCommit: false,
      immutable: true,
      createdAt: internal.nowIso()
    };
  }

  async function executeAutomationControlledMutationTrial(input) {
    ensureRuntimeState();
    const settings = internal.isPlainObject(input) ? input : {};
    if (settings.retainCommit === true || settings.rollbackAfterValidation === false || settings.persistentCommit === true) {
      return internal.buildResult(false, "IDE190_PERSISTENT_COMMIT_PROHIBITED", "Blocked", { repositoryTrust: repositoryTrustStatus() });
    }
    if (settings.executeTrial !== true) {
      return internal.buildResult(false, "IDE190_EXPLICIT_MUTATION_TRIAL_EXECUTION_REQUIRED", "Blocked", { required: "executeTrial:true" });
    }

    const executionResult = getExecutionResult(settings.executionResultId);
    const validation = validatePreparedExecutionResult(executionResult);
    if (!validation.valid) {
      const code = validation.reasons.includes("Repository Untrusted") ? "IDE190_REPOSITORY_UNTRUSTED" : validation.reasons.includes("Mutation Trial Lock Active") ? "IDE190_MUTATION_LOCK_ACTIVE" : validation.reasons.includes("V5 Prepare Result Already Used") ? "IDE190_MUTATION_TRIAL_ALREADY_USED" : "IDE190_MUTATION_TRIAL_CONTEXT_BLOCKED";
      return internal.buildResult(false, code, "Blocked", { validation: validation });
    }

    const ide160Api = getIDE160Api();
    if (!ide160Api || typeof ide160Api.invokeIDE160ComponentAdapter !== "function" || typeof ide160Api.checkIDE160ComponentCompatibility !== "function") {
      return internal.buildResult(false, "IDE190_IDE160_MUTATION_API_REQUIRED", "Blocked", null);
    }
    const compatibility = ide160Api.checkIDE160ComponentCompatibility(IDE150_ADAPTER_ID, { operation: "Execute Controlled Application" });
    if (!compatibility || compatibility.ok !== true) {
      return internal.buildResult(false, "IDE190_IDE150_MUTATION_ADAPTER_INCOMPATIBLE", "Blocked", { compatibility: compatibility });
    }

    const context = validation;
    const trialId = internal.nextId("IDE-190-MUTATION-TRIAL");
    if (!acquireMutationLock(trialId)) return internal.buildResult(false, "IDE190_MUTATION_LOCK_ACTIVE", "Blocked", { mutationLock: mutationLockStatus() });
    state.phase6ExecutionStates.set(executionResult.executionResultId, { status: "Executing", mutationTrialId: trialId, startedAt: internal.nowIso(), completedAt: null });
    internal.touch();

    const approval = context.approval;
    const prepared = context.prepared;
    const sessionId = prepared.session.id;
    const approvalReference = {
      approved: true,
      source: "IDE-190-V4-P2-Gate",
      gateId: context.gate.gateId,
      approvalId: approval.approvalId,
      contextHash: context.gate.contextHash,
      actor: approval.actor,
      actorRole: approval.actorRole
    };
    let componentApprovalInvocation = null;
    let executionInvocation = null;
    let componentApprovalOutput = null;
    let executionOutput = null;
    let invocationError = "";

    try {
      componentApprovalInvocation = ide160Api.invokeIDE160ComponentAdapter(
        IDE150_ADAPTER_ID,
        "Approve Controlled Application",
        {
          sessionId: sessionId,
          input: {
            actor: approval.actor,
            reason: approval.reason,
            confirmationText: prepared.approvalRequirements.confirmationText,
            acknowledgeRuntimeMutation: true,
            acknowledgeAutomaticRollback: true
          }
        },
        { ide190Phase6: true, approvalReference: approvalReference }
      );
      if (componentApprovalInvocation && typeof componentApprovalInvocation.then === "function") componentApprovalInvocation = await componentApprovalInvocation;
      componentApprovalOutput = getInvocationOutput(componentApprovalInvocation);
      if (!(componentApprovalInvocation && componentApprovalInvocation.ok === true && componentApprovalOutput && componentApprovalOutput.approved === true)) {
        throw new Error(internal.text(componentApprovalOutput && componentApprovalOutput.reason, "IDE-150 Component Approval failed."));
      }

      const executionOptions = {};
      if (settings.adapter && typeof settings.adapter.getFileText === "function" && typeof settings.adapter.setFileText === "function") executionOptions.adapter = settings.adapter;
      if (typeof settings.validator === "function") executionOptions.validator = settings.validator;
      executionInvocation = ide160Api.invokeIDE160ComponentAdapter(
        IDE150_ADAPTER_ID,
        "Execute Controlled Application",
        {
          sessionId: sessionId,
          input: {
            execute: true,
            actor: approval.actor,
            confirmationText: internal.text(componentApprovalOutput.executionConfirmationText, prepared.executionRequirements.confirmationText),
            retainCommit: false,
            rollbackAfterValidation: true,
            rollbackReason: internal.text(settings.rollbackReason, "IDE-190 Phase 6 Mandatory Controlled Mutation Trial Rollback")
          },
          options: executionOptions
        },
        { ide190Phase6: true, approvalReference: approvalReference }
      );
      if (executionInvocation && typeof executionInvocation.then === "function") executionInvocation = await executionInvocation;
      executionOutput = getInvocationOutput(executionInvocation);
    } catch (error) {
      invocationError = error && error.message ? error.message : String(error);
    }

    const repositoryIntegrity = buildRepositoryIntegrityRecord(trialId, context, executionOutput);
    const rollbackRestoration = buildRollbackRestorationRecord(trialId, context, executionOutput, repositoryIntegrity);
    const mutationStarted = repositoryIntegrity.temporaryMutationApplied === true || repositoryIntegrity.repositoryWriteCount > 0;
    const restorationVerified = rollbackRestoration.restorationStatus === "Verified";
    if (mutationStarted && !restorationVerified) {
      markRepositoryUntrusted(invocationError || "Mandatory Rollback / Restoration verification failed.", trialId, rollbackRestoration.rollbackId);
    }

    repositoryIntegrity.repositoryTrustStatus = state.repositoryMutationTrust.status;
    rollbackRestoration.repositoryTrustStatus = state.repositoryMutationTrust.status;
    const repositoryContract = namespace.validateContract("repositoryIntegrityRecord", repositoryIntegrity);
    const rollbackContract = namespace.validateContract("rollbackRestorationRecord", rollbackRestoration);
    const succeeded = Boolean(
      componentApprovalInvocation && componentApprovalInvocation.ok === true &&
      componentApprovalOutput && componentApprovalOutput.approved === true &&
      executionInvocation && executionInvocation.ok === true &&
      executionOutput && executionOutput.executed === true &&
      repositoryIntegrity.temporaryMutationApplied === true &&
      repositoryIntegrity.integrityStatus === "Verified" &&
      rollbackRestoration.restorationStatus === "Verified" &&
      state.repositoryMutationTrust.status === "Trusted" &&
      repositoryContract.valid === true && rollbackContract.valid === true
    );

    const trial = {
      mutationTrialId: trialId,
      executionResultId: executionResult.executionResultId,
      dispatchRequestId: executionResult.dispatchRequestId,
      gateId: context.gate.gateId,
      planId: context.plan.planId,
      planHash: context.plan.planHash,
      contextHash: context.gate.contextHash,
      approvalId: approval.approvalId,
      approvalClass: "P2",
      projectOwnerApproval: approval.actorRole === "Project Owner" && approval.explicitApproval === true,
      componentSessionId: sessionId,
      componentApprovalSucceeded: Boolean(componentApprovalOutput && componentApprovalOutput.approved === true),
      ide160InvocationUsed: true,
      directIDE150Call: false,
      automationLevel: "L4",
      mutationLevel: "M2",
      executionMode: "E1",
      temporaryMutationApplied: repositoryIntegrity.temporaryMutationApplied,
      postValidationPassed: Boolean(executionOutput && executionOutput.postValidation && executionOutput.postValidation.passed === true),
      repositoryIntegrityRecordId: repositoryIntegrity.repositoryIntegrityRecordId,
      rollbackRestorationRecordId: rollbackRestoration.rollbackRestorationRecordId,
      rollbackVerified: rollbackRestoration.rollbackVerified,
      sourceRestored: rollbackRestoration.sourceRestored,
      repositoryTrustStatus: state.repositoryMutationTrust.status,
      persistentCommit: false,
      status: succeeded ? "Trial Completed and Rolled Back" : mutationStarted && !restorationVerified ? "Recovery-Required" : "Failed",
      singleUse: true,
      immutable: true,
      completedAt: internal.nowIso()
    };
    const trialContract = namespace.validateContract("mutationTrialRecord", trial);

    if (!repositoryContract.valid || !rollbackContract.valid || !trialContract.valid) {
      if (mutationStarted && state.repositoryMutationTrust.status === "Trusted" && !restorationVerified) markRepositoryUntrusted("Phase 6 safety contract failed after mutation.", trialId, rollbackRestoration.rollbackId);
    }

    const frozenRepository = internal.deepFreeze(internal.clone(repositoryIntegrity));
    const frozenRollback = internal.deepFreeze(internal.clone(rollbackRestoration));
    const frozenTrial = internal.deepFreeze(internal.clone(trial));
    state.repositoryIntegrityRecords.set(frozenRepository.repositoryIntegrityRecordId, frozenRepository);
    state.rollbackRestorationRecords.set(frozenRollback.rollbackRestorationRecordId, frozenRollback);
    state.mutationTrials.set(frozenTrial.mutationTrialId, frozenTrial);
    state.latestRepositoryIntegrityRecordId = frozenRepository.repositoryIntegrityRecordId;
    state.latestRollbackRestorationRecordId = frozenRollback.rollbackRestorationRecordId;
    state.latestMutationTrialId = frozenTrial.mutationTrialId;
    state.phase6ExecutionStates.set(executionResult.executionResultId, { status: succeeded ? "Completed" : "Failed", mutationTrialId: trialId, startedAt: state.phase6ExecutionStates.get(executionResult.executionResultId).startedAt, completedAt: frozenTrial.completedAt });
    releaseMutationLock(trialId);
    internal.touch();

    return internal.buildResult(succeeded, succeeded ? "IDE190_CONTROLLED_MUTATION_TRIAL_COMPLETED" : state.repositoryMutationTrust.status === "Untrusted" ? "IDE190_MUTATION_RECOVERY_REQUIRED" : "IDE190_CONTROLLED_MUTATION_TRIAL_FAILED", succeeded ? "Rolled-Back" : state.repositoryMutationTrust.status === "Untrusted" ? "Recovery-Required" : "Failed", {
      mutationTrial: internal.clone(frozenTrial),
      repositoryIntegrity: internal.clone(frozenRepository),
      rollbackRestoration: internal.clone(frozenRollback),
      repositoryTrust: repositoryTrustStatus(),
      mutationLock: mutationLockStatus(),
      componentApprovalInvocation: internal.clone(componentApprovalInvocation),
      executionInvocation: internal.clone(executionInvocation),
      componentApprovalOutput: internal.clone(componentApprovalOutput),
      executionOutput: internal.clone(executionOutput),
      validation: {
        preparedContext: validation,
        mutationTrialContract: trialContract,
        repositoryIntegrityContract: repositoryContract,
        rollbackRestorationContract: rollbackContract
      },
      error: invocationError ? { message: invocationError, category: "Execution" } : null
    });
  }

  function getAutomationMutationTrial(id) {
    ensureRuntimeState();
    return internal.clone(state.mutationTrials.get(internal.text(id, state.latestMutationTrialId || "")) || null);
  }
  function getLatestAutomationMutationTrial() { return getAutomationMutationTrial(state.latestMutationTrialId); }
  function getAutomationRepositoryIntegrityRecord(id) {
    ensureRuntimeState();
    return internal.clone(state.repositoryIntegrityRecords.get(internal.text(id, state.latestRepositoryIntegrityRecordId || "")) || null);
  }
  function getAutomationRollbackRestorationRecord(id) {
    ensureRuntimeState();
    return internal.clone(state.rollbackRestorationRecords.get(internal.text(id, state.latestRollbackRestorationRecordId || "")) || null);
  }
  function getAutomationMutationTrustStatus() { return repositoryTrustStatus(); }
  function getAutomationMutationLockStatus() { return mutationLockStatus(); }
  function validateAutomationMutationTrialContext(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    return validatePreparedExecutionResult(getExecutionResult(settings.executionResultId));
  }
  function initializeMutationTrial() {
    ensureRuntimeState();
    namespace.modules.mutationTrial.status = "Ready";
    return internal.buildResult(true, "IDE190_MUTATION_TRIAL_INITIALIZED", "Ready", {
      mutationTrialCount: state.mutationTrials.size,
      repositoryTrust: repositoryTrustStatus(),
      mutationLock: mutationLockStatus(),
      validationLayers: ["V6", "V7"]
    });
  }

  Object.assign(namespace.api, {
    initializeMutationTrial: initializeMutationTrial,
    validateAutomationMutationTrialContext: validateAutomationMutationTrialContext,
    executeAutomationControlledMutationTrial: executeAutomationControlledMutationTrial,
    getAutomationMutationTrial: getAutomationMutationTrial,
    getLatestAutomationMutationTrial: getLatestAutomationMutationTrial,
    getAutomationRepositoryIntegrityRecord: getAutomationRepositoryIntegrityRecord,
    getAutomationRollbackRestorationRecord: getAutomationRollbackRestorationRecord,
    getAutomationMutationTrustStatus: getAutomationMutationTrustStatus,
    getAutomationMutationLockStatus: getAutomationMutationLockStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.mutationTrial = {
    id: "IDE-190-MUTATION-TRIAL",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 6,
    validationLayers: ["V6", "V7"],
    ide160AdapterRegistryRequired: true,
    directIDE150CallAllowed: false,
    temporaryMutationAllowed: true,
    persistentCommitAllowed: false,
    mandatoryRollback: true,
    restorationVerificationRequired: true,
    repositoryUntrustedBlocksFurtherMutation: true,
    concurrentMutationLimit: 1,
    recoveryImplemented: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
