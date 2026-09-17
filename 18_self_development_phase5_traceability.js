/* ============================================================
   FILE: 18_self_development_phase5_traceability.js
   Decision 058 Phase 5A / Live Evidence Closure Traceability
   Candidate Hotfix: 0.5.6
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function repositoryTrialRecord() {
    const r = global.REPOSITORY010LocalFirstRepository;
    const state = r && r.__internal && r.__internal.state ? r.__internal.state : null;
    return state && (state.lastControlledTransactionTrial || state.lastControlledTransactionJournal) || null;
  }

  function auditTrialRecord() {
    if (typeof namespace.getSelfDevelopmentPhase5TrialAuditStatus !== "function") return null;
    const status = namespace.getSelfDevelopmentPhase5TrialAuditStatus();
    return status && status.lastRecord || null;
  }

  function evaluateEvidence(input) {
    const source = input && typeof input === "object" ? input : {};
    const transaction = source.transaction || source.repositoryTrial || null;
    const audit = source.audit || null;
    const tx = transaction || audit || {};
    const checks = {
      physicalWritePerformed: tx.physicalWritePerformed === true,
      readbackVerified: tx.readbackVerified === true,
      rollbackVerified: tx.rollbackVerified === true,
      repositoryRestored: tx.repositoryRestored === true,
      acceptanceTokenConsumed: (tx.acceptanceTokenConsumed === true || tx.tokenConsumed === true),
      canonicalMutationPrevented: tx.canonicalMutationPerformed === false
    };
    const complete = Object.keys(checks).every(function (key) { return checks[key] === true; });
    return {
      complete: complete,
      checks: checks,
      transactionId: tx.transactionId || tx.controlledTransactionId || null,
      acceptanceTokenId: tx.acceptanceTokenId || null,
      mutationPackageId: tx.mutationPackageId || null,
      evidenceSource: transaction ? "REPOSITORY-010_CONTROLLED_TRANSACTION" : (audit ? "PHASE5A_AUDIT" : "NONE"),
      persistentReflectionPerformed: false,
      baselinePromotionPerformed: false,
      canonicalMutationPerformed: false,
      immutable: true
    };
  }

  namespace.evaluateSelfDevelopmentPhase5LiveEvidence = function (input) {
    return clone(evaluateEvidence(input));
  };

  namespace.getSelfDevelopmentPhase5LiveEvidenceClosure = function () {
    const transaction = repositoryTrialRecord();
    const audit = auditTrialRecord();
    const primary = evaluateEvidence({ transaction: transaction, audit: audit });
    const auditEvaluation = evaluateEvidence({ audit: audit });
    return {
      phase5Version: "0.5.6",
      liveEvidenceComplete: primary.complete === true,
      completionStatus: primary.complete ? "PHASE5A_LIVE_TRIAL_COMPLETE" : "LIVE_EVIDENCE_PENDING",
      repositoryEvidence: primary,
      auditEvidence: auditEvaluation,
      persistentReflectionDeferred: true,
      baselinePromotionDeferred: true,
      decision058FinalFreezeDeferred: true,
      evaluatedAt: new Date().toISOString(),
      immutable: true
    };
  };

  namespace.getSelfDevelopmentPhase5Coverage = function () {
    const closure = namespace.getSelfDevelopmentPhase5LiveEvidenceClosure();
    const live = closure.liveEvidenceComplete === true;
    return {
      decisionId: "EXTERNAL-010-DECISION-058",
      phase5Version: "0.5.6",
      totalDecisionRequirements: 18,
      fullyImplementedDecisionRequirements: 14,
      allDecisionRequirementsComplete: false,
      phase5ScopeTotal: 8,
      phase5ScopeImplemented: 8,
      phase5ScopeComplete: true,
      phase5LiveTrialComplete: live,
      phase5CompletionStatus: closure.completionStatus,
      falseFullDecisionCompletionClaimed: false,
      controlledLiveTrialCapabilityImplemented: true,
      liveTrialExecutionEvidenceRequiredForRequirementClosure: !live,
      liveTrialExecutionEvidenceVerified: live,
      persistentReflectionDeferred: true,
      baselinePromotionDeferred: true,
      requirementStates: {
        "REQ-058-014": live ? "PHASE5A_PROJECT_OWNER_CONTROLLED_LIVE_TRIAL_EVIDENCE_VERIFIED / PERSISTENT_ADOPTION_DEFERRED" : "PHASE5A_LIVE_TRIAL_EXECUTION_CAPABILITY / LIVE EVIDENCE PENDING",
        "REQ-058-015": live ? "PHASE5A_REPOSITORY010_CONTROLLED_TRIAL_REUSE_VERIFIED / PERSISTENT_REFLECTION_DEFERRED" : "PHASE5A_CONTROLLED_TRIAL_REUSE / LIVE EVIDENCE PENDING",
        "REQ-058-016": live ? "PHASE5A_MANDATORY_ROLLBACK_RECOVERY_EVIDENCE_VERIFIED / RETAINED_MUTATION_RECOVERY_DEFERRED" : "PHASE5A_MANDATORY_ROLLBACK_REUSE / LIVE EVIDENCE PENDING",
        "REQ-058-017": live ? "PHASE5A_LIVE_TRIAL_AUDIT_EVIDENCE_VERIFIED" : "PHASE5A_LIVE_TRIAL_LINEAGE_IMPLEMENTED"
      },
      liveEvidence: clone(closure),
      deferred: ["Persistent Canonical Reflection", "Retained mutation V5 closure", "Canonical baseline promotion", "Final Decision 058 integrated freeze"]
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
