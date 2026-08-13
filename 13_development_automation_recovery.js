/* ============================================================
   FILE: 13_development_automation_recovery.js
   IDE-190 Development Automation
   Release: 1.6.0 / Module: Recovery 1.0.0
   Phase 7: Failure / Timeout / Recovery
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 recovery module blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("recovery");
  const ACTIONS = ["Stop", "Retry-Later", "Verify-Restoration", "Cancel", "Escalate"];

  function ensureRuntimeState() {
    if (!(state.recoveryDecisions instanceof Map)) state.recoveryDecisions = new Map();
    if (!(state.recoveryVerifications instanceof Map)) state.recoveryVerifications = new Map();
    if (!Object.prototype.hasOwnProperty.call(state, "latestRecoveryDecisionId")) state.latestRecoveryDecisionId = null;
    if (!Object.prototype.hasOwnProperty.call(state, "latestRecoveryVerificationId")) state.latestRecoveryVerificationId = null;
  }
  ensureRuntimeState();

  function hashIDE150Source(value) {
    const source = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function getFailure(id) {
    return state.failureRecords instanceof Map ? state.failureRecords.get(internal.text(id, "")) || null : null;
  }

  function getV6ForFailure(failure) {
    if (!failure || !failure.sourceRecordId || !(state.repositoryIntegrityRecords instanceof Map)) return null;
    if (state.repositoryIntegrityRecords.has(failure.sourceRecordId)) return state.repositoryIntegrityRecords.get(failure.sourceRecordId);
    const trial = state.mutationTrials instanceof Map ? state.mutationTrials.get(failure.sourceRecordId) || null : null;
    if (trial && trial.repositoryIntegrityRecordId) return state.repositoryIntegrityRecords.get(trial.repositoryIntegrityRecordId) || null;
    return null;
  }

  function getV7ForFailure(failure) {
    if (!failure || !failure.sourceRecordId || !(state.rollbackRestorationRecords instanceof Map)) return null;
    if (state.rollbackRestorationRecords.has(failure.sourceRecordId)) return state.rollbackRestorationRecords.get(failure.sourceRecordId);
    const trial = state.mutationTrials instanceof Map ? state.mutationTrials.get(failure.sourceRecordId) || null : null;
    if (trial && trial.rollbackRestorationRecordId) return state.rollbackRestorationRecords.get(trial.rollbackRestorationRecordId) || null;
    return null;
  }

  function createAutomationRecoveryDecision(input) {
    ensureRuntimeState();
    const source = internal.isPlainObject(input) ? input : {};
    const failure = getFailure(source.failureRecordId);
    if (!failure) return internal.buildResult(false, "IDE190_RECOVERY_FAILURE_RECORD_REQUIRED", "Blocked", null);
    const action = internal.text(source.action, "");
    if (!ACTIONS.includes(action)) return internal.buildResult(false, "IDE190_RECOVERY_ACTION_INVALID", "Blocked", { allowedActions: ACTIONS.slice() });
    const actorRole = internal.text(source.actorRole, "");
    if ((failure.severity === "Critical" || failure.recoveryRequired === true) && !(actorRole === "Project Owner" && source.explicitDecision === true)) {
      return internal.buildResult(false, "IDE190_RECOVERY_PROJECT_OWNER_REQUIRED", "Blocked", null);
    }
    if (action === "Retry-Later" && failure.retryEligibility === "Non-Retryable") {
      return internal.buildResult(false, "IDE190_RECOVERY_RETRY_PROHIBITED", "Blocked", { failure: internal.clone(failure) });
    }
    if (state.repositoryMutationTrust && state.repositoryMutationTrust.status === "Untrusted" && action !== "Verify-Restoration" && action !== "Stop" && action !== "Escalate") {
      return internal.buildResult(false, "IDE190_UNTRUSTED_REPOSITORY_REQUIRES_RESTORATION_VERIFICATION", "Blocked", null);
    }
    const evidence = Array.isArray(source.evidence) ? source.evidence.filter(Boolean).map(internal.clone) : [];
    if (!evidence.length) return internal.buildResult(false, "IDE190_RECOVERY_EVIDENCE_REQUIRED", "Blocked", null);

    const decision = {
      recoveryDecisionId: internal.nextId("IDE-190-RECOVERY-DECISION"),
      failureRecordId: failure.failureRecordId,
      action: action,
      actorRole: actorRole || "Operator",
      explicitDecision: source.explicitDecision === true,
      retryAllowed: action === "Retry-Later" && failure.retryEligibility !== "Non-Retryable",
      repositoryTrustStatus: state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted",
      automaticRepositoryWrite: false,
      automaticRetry: false,
      evidence: evidence,
      status: "Approved",
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("recoveryDecision", decision);
    if (!contract.valid) return internal.buildResult(false, "IDE190_RECOVERY_DECISION_CONTRACT_INVALID", "Blocked", { validation: contract });
    const frozen = internal.deepFreeze(internal.clone(decision));
    state.recoveryDecisions.set(frozen.recoveryDecisionId, frozen);
    state.latestRecoveryDecisionId = frozen.recoveryDecisionId;
    internal.touch();
    return internal.buildResult(true, "IDE190_RECOVERY_DECISION_RECORDED", "Approved", { recoveryDecision: internal.clone(frozen), validation: contract });
  }

  function verifyAutomationRepositoryRecovery(input) {
    ensureRuntimeState();
    const source = internal.isPlainObject(input) ? input : {};
    const decision = state.recoveryDecisions.get(internal.text(source.recoveryDecisionId, ""));
    if (!decision || decision.action !== "Verify-Restoration") return internal.buildResult(false, "IDE190_RESTORATION_DECISION_REQUIRED", "Blocked", null);
    const failure = getFailure(decision.failureRecordId);
    if (!failure) return internal.buildResult(false, "IDE190_RECOVERY_FAILURE_RECORD_REQUIRED", "Blocked", null);
    if (!(decision.actorRole === "Project Owner" && decision.explicitDecision === true && source.explicitVerification === true)) {
      return internal.buildResult(false, "IDE190_RECOVERY_PROJECT_OWNER_VERIFICATION_REQUIRED", "Blocked", null);
    }
    if (state.mutationTrialLock && state.mutationTrialLock.active === true) {
      return internal.buildResult(false, "IDE190_RECOVERY_MUTATION_LOCK_ACTIVE", "Blocked", { mutationLock: internal.clone(state.mutationTrialLock) });
    }
    if (!state.repositoryMutationTrust || state.repositoryMutationTrust.status !== "Untrusted") {
      return internal.buildResult(false, "IDE190_RECOVERY_REPOSITORY_NOT_UNTRUSTED", "Blocked", { repositoryTrust: internal.clone(state.repositoryMutationTrust) });
    }
    const v6 = getV6ForFailure(failure);
    const v7 = getV7ForFailure(failure);
    if (!v6 || !internal.text(v6.targetFile, "") || !internal.text(v6.originalHash, "")) {
      return internal.buildResult(false, "IDE190_RECOVERY_V6_EVIDENCE_REQUIRED", "Blocked", null);
    }
    if (v7 && v7.restorationStatus !== "Recovery-Required") {
      return internal.buildResult(false, "IDE190_RECOVERY_V7_NOT_RECOVERY_REQUIRED", "Blocked", { rollbackRestoration: internal.clone(v7) });
    }
    const targetFile = internal.text(source.targetFile, "");
    if (!targetFile || targetFile !== v6.targetFile) return internal.buildResult(false, "IDE190_RECOVERY_TARGET_MISMATCH", "Blocked", { expected: v6.targetFile, actual: targetFile || null });
    const expectedOriginalSource = typeof source.expectedOriginalSource === "string" ? source.expectedOriginalSource : "";
    if (!expectedOriginalSource) return internal.buildResult(false, "IDE190_RECOVERY_EXPECTED_SOURCE_REQUIRED", "Blocked", null);
    if (hashIDE150Source(expectedOriginalSource) !== v6.originalHash) {
      return internal.buildResult(false, "IDE190_RECOVERY_EXPECTED_SOURCE_HASH_MISMATCH", "Blocked", { expectedHash: v6.originalHash, suppliedHash: hashIDE150Source(expectedOriginalSource) });
    }
    if (typeof global.getProjectFile !== "function") return internal.buildResult(false, "IDE190_RECOVERY_RUNTIME_FILE_STORE_REQUIRED", "Blocked", null);
    const file = global.getProjectFile(targetFile);
    const currentSource = file ? String(file.code || file.text || file.content || file.value || "") : "";
    if (!currentSource) return internal.buildResult(false, "IDE190_RECOVERY_CURRENT_SOURCE_REQUIRED", "Blocked", null);
    const currentHash = hashIDE150Source(currentSource);
    const sourceExact = currentSource === expectedOriginalSource;
    const hashExact = currentHash === v6.originalHash;
    if (!sourceExact || !hashExact) {
      return internal.buildResult(false, "IDE190_RECOVERY_RESTORATION_NOT_VERIFIED", "Recovery-Required", {
        targetFile: targetFile,
        sourceExact: sourceExact,
        hashExact: hashExact,
        expectedHash: v6.originalHash,
        currentHash: currentHash,
        repositoryTrust: internal.clone(state.repositoryMutationTrust)
      });
    }

    const verification = {
      recoveryVerificationId: internal.nextId("IDE-190-RECOVERY-VERIFICATION"),
      recoveryDecisionId: decision.recoveryDecisionId,
      failureRecordId: failure.failureRecordId,
      targetFile: targetFile,
      expectedOriginalHash: v6.originalHash,
      currentHash: currentHash,
      sourceExact: true,
      hashExact: true,
      mutationLockReleased: state.mutationTrialLock.active === false,
      repositoryTrustBefore: "Untrusted",
      repositoryTrustAfter: "Trusted",
      repositoryWriteCount: 0,
      persistentCommit: false,
      verifiedBy: "Project Owner",
      status: "Verified",
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("recoveryVerification", verification);
    if (!contract.valid) return internal.buildResult(false, "IDE190_RECOVERY_VERIFICATION_CONTRACT_INVALID", "Blocked", { validation: contract });
    state.repositoryMutationTrust = {
      status: "Trusted",
      reason: "Phase 7 exact restoration verification passed.",
      mutationTrialId: failure.sourceRecordId || null,
      rollbackId: v7 && v7.rollbackId || null,
      markedAt: state.repositoryMutationTrust.markedAt || null,
      recoveredAt: internal.nowIso(),
      recoveryVerificationId: verification.recoveryVerificationId
    };
    const frozen = internal.deepFreeze(internal.clone(verification));
    state.recoveryVerifications.set(frozen.recoveryVerificationId, frozen);
    state.latestRecoveryVerificationId = frozen.recoveryVerificationId;
    internal.touch();
    return internal.buildResult(true, "IDE190_REPOSITORY_TRUST_RESTORED", "Verified", {
      recoveryVerification: internal.clone(frozen),
      repositoryTrust: internal.clone(state.repositoryMutationTrust),
      validation: contract
    });
  }

  function recoverInterruptedPreMutationLock(input) {
    ensureRuntimeState();
    const source = internal.isPlainObject(input) ? input : {};
    if (!state.mutationTrialLock || state.mutationTrialLock.active !== true) return internal.buildResult(false, "IDE190_RECOVERY_NO_ACTIVE_MUTATION_LOCK", "Blocked", null);
    if (!(source.actorRole === "Project Owner" && source.explicitRecovery === true && source.executionConfirmedStopped === true)) {
      return internal.buildResult(false, "IDE190_INTERRUPTED_LOCK_RECOVERY_EVIDENCE_REQUIRED", "Blocked", null);
    }
    if (source.mutationStarted === true) return internal.buildResult(false, "IDE190_INTERRUPTED_MUTATION_REQUIRES_RESTORATION_VERIFICATION", "Recovery-Required", null);
    state.mutationTrialLock = {
      active: false,
      mutationTrialId: null,
      acquiredAt: state.mutationTrialLock.acquiredAt || null,
      releasedAt: internal.nowIso()
    };
    internal.touch();
    return internal.buildResult(true, "IDE190_INTERRUPTED_PRE_MUTATION_LOCK_RELEASED", "Recovered", { mutationLock: internal.clone(state.mutationTrialLock) });
  }

  function getIDE160RecoveryCapabilityStatus() {
    const ide160 = global.AIPromptOSIDE160;
    const api = ide160 && ide160.api || null;
    return {
      available: Boolean(api),
      createWorkflowFailure: Boolean(api && typeof api.createWorkflowFailure === "function"),
      createWorkflowRecoveryDecision: Boolean(api && typeof api.createWorkflowRecoveryDecision === "function"),
      createWorkflowRetryAttempt: Boolean(api && typeof api.createWorkflowRetryAttempt === "function"),
      automaticBridgeUsed: false
    };
  }

  function getAutomationRecoveryDecision(id) {
    ensureRuntimeState();
    return internal.clone(state.recoveryDecisions.get(internal.text(id, state.latestRecoveryDecisionId || "")) || null);
  }
  function getAutomationRecoveryVerification(id) {
    ensureRuntimeState();
    return internal.clone(state.recoveryVerifications.get(internal.text(id, state.latestRecoveryVerificationId || "")) || null);
  }

  function initializeRecovery() {
    ensureRuntimeState();
    namespace.modules.recovery.status = "Ready";
    return internal.buildResult(true, "IDE190_RECOVERY_INITIALIZED", "Ready", {
      automaticRepairImplemented: false,
      directIDE150RecoveryCallAllowed: false,
      ide160Recovery: getIDE160RecoveryCapabilityStatus()
    });
  }

  Object.assign(namespace.api, {
    initializeRecovery: initializeRecovery,
    createAutomationRecoveryDecision: createAutomationRecoveryDecision,
    verifyAutomationRepositoryRecovery: verifyAutomationRepositoryRecovery,
    recoverInterruptedPreMutationLock: recoverInterruptedPreMutationLock,
    getIDE160RecoveryCapabilityStatus: getIDE160RecoveryCapabilityStatus,
    getAutomationRecoveryDecision: getAutomationRecoveryDecision,
    getAutomationRecoveryVerification: getAutomationRecoveryVerification
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.recovery = {
    id: "IDE-190-RECOVERY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 7,
    automaticRepairImplemented: false,
    directIDE150RecoveryCallAllowed: false,
    exactRestorationVerificationRequired: true,
    projectOwnerVerificationRequiredForCritical: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
