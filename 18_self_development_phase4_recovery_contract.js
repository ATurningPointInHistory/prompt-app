/* ============================================================
   FILE: 18_self_development_phase4_recovery_contract.js
   Decision 058 Phase 4 / Rollback + Recovery + V5 Contract Binding
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P4 = global.SELFDEVELOPMENT058Phase4VersionManifest;
  if (!namespace || !namespace.__internal || !P4) return;
  const i = namespace.__internal;

  function getSelfDevelopmentPhase4RecoveryContract() {
    return i.deepFreeze({
      contractId: "SELFDEV058-PHASE4-RECOVERY-CONTRACT",
      contractVersion: "1.0.0",
      backupBeforeWriteRequired: true,
      journalBeforeWriteRequired: true,
      rollbackOnWriteFailureRequired: true,
      rollbackOnReadbackFailureRequired: true,
      rollbackOnV5FailureRequired: true,
      exactSourceRestorationVerificationRequired: true,
      pendingRecoveryDetectionRequired: true,
      recoveryDoesNotGrantAdoptionAuthority: true,
      recoveryDoesNotGrantMutationAuthority: true,
      v5SuccessDoesNotPromoteBaselineAutomatically: true,
      baselinePromotionRequiresExplicitProjectOwnerAction: true,
      actualRollbackExecutedInPhase4Validation: false,
      canonicalMutationPerformed: false,
      engineRefs: [
        "13_local_first_repository_controlled_transaction.js#createBackupsAndJournal",
        "13_local_first_repository_controlled_transaction.js#rollbackTransaction",
        "13_local_first_repository_controlled_transaction.js#recoverControlledTransactionTrial",
        "13_local_first_repository_reflection_closure.js#deriveReflectionIntegrityClosure",
        "13_local_first_repository_baseline_promotion.js#promoteCanonicalBaseline"
      ]
    });
  }

  function validateSelfDevelopmentPhase4RecoveryContract(candidate) {
    const c = candidate || getSelfDevelopmentPhase4RecoveryContract(), failures = [];
    ["backupBeforeWriteRequired","journalBeforeWriteRequired","rollbackOnWriteFailureRequired","rollbackOnReadbackFailureRequired","rollbackOnV5FailureRequired","exactSourceRestorationVerificationRequired","pendingRecoveryDetectionRequired","baselinePromotionRequiresExplicitProjectOwnerAction"].forEach(function (key) { if (c[key] !== true) failures.push(key + "-required"); });
    if (c.recoveryDoesNotGrantAdoptionAuthority !== true) failures.push("recovery-must-not-grant-adoption-authority");
    if (c.recoveryDoesNotGrantMutationAuthority !== true) failures.push("recovery-must-not-grant-mutation-authority");
    if (c.v5SuccessDoesNotPromoteBaselineAutomatically !== true) failures.push("v5-must-not-auto-promote-baseline");
    return { valid: failures.length === 0, failures: failures, checkedAt: i.nowIso() };
  }

  Object.assign(namespace.api, { getSelfDevelopmentPhase4RecoveryContract, validateSelfDevelopmentPhase4RecoveryContract });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase4RecoveryContract = { id: "SELF-DEVELOPMENT-058-PHASE4-RECOVERY-CONTRACT", version: P4.version, status: "Ready", actualRollbackExecuted: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
