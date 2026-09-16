/* ============================================================
   FILE: 18_self_development_phase5_live_trial_controller.js
   Decision 058 Phase 5A / Explicitly Armed Controlled Live Trial
   IMPORTANT: Validation never calls side-effecting functions in this file.
   Persistent reflection and baseline promotion are prohibited in Phase 5A.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;
  const i = namespace.__internal;
  let arm = null;
  function policy() { return namespace.getSelfDevelopmentPhase5LiveTrialPolicy(); }
  function repo() { return global.REPOSITORY010LocalFirstRepository || null; }
  function result(ok, code, status, data) { return { ok: ok === true, code: code, status: status, data: data || null, at: new Date().toISOString() }; }
  function activeArm() {
    if (!arm) return null;
    if (arm.used === true || Date.now() >= arm.expiresAtMs) return null;
    return arm;
  }
  namespace.armSelfDevelopmentPhase5LiveTrial = function (input) {
    const p = policy(), source = input && typeof input === "object" ? input : {};
    if (source.actorRole !== p.actorRoleRequired || source.explicitProjectOwnerAction !== true || source.confirmationPhrase !== p.armPhrase) {
      return result(false, "SELFDEV058_PHASE5_TRIAL_ARM_BLOCKED", "Blocked", { armed: false, mutationAuthorityGranted: false });
    }
    const readiness = namespace.inspectSelfDevelopmentPhase5LiveTrialReadiness();
    if (!readiness || readiness.platform !== "PC_DESKTOP_CANDIDATE" || readiness.readyForLiveTrialPreparation !== true) {
      return result(false, "SELFDEV058_PHASE5_PC_LIVE_TRIAL_NOT_READY", "Blocked", { armed: false, readiness: readiness, mutationAuthorityGranted: false });
    }
    arm = Object.freeze({
      armId: i.nextId("SELFDEV058-PHASE5-TRIAL-ARM"),
      actorRole: p.actorRoleRequired,
      purpose: "AUTHORIZE_REPOSITORY010_CONTROLLED_TRIAL_ONLY",
      issuedAt: new Date().toISOString(),
      expiresAtMs: Date.now() + p.armValidityMinutes * 60 * 1000,
      used: false,
      adoptionAuthorizationGranted: false,
      persistentReflectionAuthorized: false,
      baselinePromotionAuthorized: false,
      mutationAuthorityGranted: false
    });
    return result(true, "SELFDEV058_PHASE5_TRIAL_ARMED", "Armed", { arm: arm, mutationAuthorityGranted: false });
  };
  namespace.getSelfDevelopmentPhase5TrialArmStatus = function () {
    const current = activeArm();
    return { armed: Boolean(current), arm: current ? JSON.parse(JSON.stringify(current)) : null, persistentReflectionAuthorized: false, baselinePromotionAuthorized: false, mutationAuthorityGranted: false };
  };
  namespace.prepareSelfDevelopmentPhase5SafeMutationPackage = async function (input) {
    const r = repo(), p = policy(), source = input && typeof input === "object" ? input : {};
    if (!r || typeof r.prepareHybridMutationPackage !== "function") return result(false, "SELFDEV058_PHASE5_REPOSITORY_MUTATION_API_UNAVAILABLE", "Blocked");
    const currentArm = activeArm();
    if (!currentArm || source.armId !== currentArm.armId) return result(false, "SELFDEV058_PHASE5_ACTIVE_ARM_REQUIRED", "Blocked", { mutationPackagePrepared: false });
    const beforeSource = `function selfDevelopment058Phase5LiveTrialFixture(value) {\n    return String(value || "").trim();\n  }`;
    const afterSource = `function selfDevelopment058Phase5LiveTrialFixture(value) {\n    return String(value == null ? "" : value).trim();\n  }`;
    const prepared = await r.prepareHybridMutationPackage({
      transferPackageId: source.transferPackageId,
      mutations: [{ mutationType: "function-patch", targetFile: p.targetFile, targetFunction: p.targetFunction, beforeFunctionSource: beforeSource, afterFunctionSource: afterSource }]
    });
    return result(Boolean(prepared && prepared.ok === true), prepared && prepared.code || "SELFDEV058_PHASE5_MUTATION_PACKAGE_RESULT", prepared && prepared.status || "Completed", {
      repositoryResult: prepared,
      targetFile: p.targetFile,
      targetFunction: p.targetFunction,
      protectedControlPlane: false,
      persistentReflectionAuthorized: false,
      canonicalMutationPerformed: false
    });
  };
  namespace.issueSelfDevelopmentPhase5TrialAcceptanceToken = async function (input) {
    const r = repo(), source = input && typeof input === "object" ? input : {}, currentArm = activeArm();
    if (!currentArm || source.armId !== currentArm.armId) return result(false, "SELFDEV058_PHASE5_ACTIVE_ARM_REQUIRED", "Blocked", { tokenIssued: false });
    if (!r || typeof r.issueManualAcceptanceToken !== "function") return result(false, "SELFDEV058_PHASE5_ACCEPTANCE_API_UNAVAILABLE", "Blocked", { tokenIssued: false });
    const pkg = source.mutationPackage || (r.__internal && r.__internal.state && r.__internal.state.lastMutationPackage) || null;
    if (!pkg || !Array.isArray(pkg.allowedMutationSet) || pkg.allowedMutationSet.length !== 1) return result(false, "SELFDEV058_PHASE5_SINGLE_MUTATION_PACKAGE_REQUIRED", "Blocked", { tokenIssued: false });
    const token = await r.issueManualAcceptanceToken({ v4EvidenceId: source.v4EvidenceId, allowedMutationSet: pkg.allowedMutationSet, acceptedBy: "Project Owner", explicitProjectOwnerAction: true });
    return result(Boolean(token && token.ok === true), token && token.code || "SELFDEV058_PHASE5_TOKEN_RESULT", token && token.status || "Completed", { repositoryResult: token, tokenIssued: Boolean(token && token.ok === true), mutationAuthorityGranted: false, persistentReflectionAuthorized: false });
  };
  namespace.executeSelfDevelopmentPhase5ControlledTrial = async function (input) {
    const r = repo(), source = input && typeof input === "object" ? input : {}, currentArm = activeArm();
    if (!currentArm || source.armId !== currentArm.armId) return result(false, "SELFDEV058_PHASE5_ACTIVE_ARM_REQUIRED", "Blocked", { controlledTrialExecuted: false });
    if (!r || typeof r.executeControlledTransactionTrial !== "function") return result(false, "SELFDEV058_PHASE5_TRIAL_API_UNAVAILABLE", "Blocked", { controlledTrialExecuted: false });
    if (source.forceFailureAfterWrite === true) return result(false, "SELFDEV058_PHASE5_NORMAL_TRIAL_ONLY", "Blocked", { controlledTrialExecuted: false });
    const trial = await r.executeControlledTransactionTrial({ acceptanceTokenId: source.acceptanceTokenId, mutationPackageId: source.mutationPackageId, forceFailureAfterWrite: false });
    const d = trial && trial.data || {};
    const pass = Boolean(trial && trial.ok === true && d.physicalWritePerformed === true && d.readbackVerified === true && d.rollbackVerified === true && d.repositoryRestored === true && d.acceptanceTokenConsumed === true && d.canonicalMutationPerformed === false);
    arm = Object.freeze(Object.assign({}, currentArm, { used: true, usedAt: new Date().toISOString() }));
    return result(pass, pass ? "SELFDEV058_PHASE5_CONTROLLED_LIVE_TRIAL_RESTORED" : "SELFDEV058_PHASE5_CONTROLLED_LIVE_TRIAL_FAILED", pass ? "Verified / Restored" : "Blocked", {
      repositoryResult: trial,
      physicalWritePerformed: d.physicalWritePerformed === true,
      readbackVerified: d.readbackVerified === true,
      rollbackVerified: d.rollbackVerified === true,
      repositoryRestored: d.repositoryRestored === true,
      acceptanceTokenConsumed: d.acceptanceTokenConsumed === true,
      persistentReflectionPerformed: false,
      baselinePromotionPerformed: false,
      canonicalMutationPerformed: false
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
