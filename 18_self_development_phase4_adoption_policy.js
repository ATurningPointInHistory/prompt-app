/* ============================================================
   FILE: 18_self_development_phase4_adoption_policy.js
   Decision 058 Phase 4 / Adoption Boundary + Future Relaxation Map

   CURRENT REPOSITORY-010 ENFORCEMENT:
   - Project Owner manual acceptance
   - 15 minute token TTL
   - one-time token consumption

   FUTURE RELAXATION ENTRY POINTS are documented, but changing this file
   alone MUST NEVER bypass REPOSITORY-010 enforcement.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  const P4 = global.SELFDEVELOPMENT058Phase4VersionManifest;
  if (!namespace || !namespace.__internal || !P4) return;
  const i = namespace.__internal;
  function freeze(value) { return i.deepFreeze(i.clone(value)); }

  const policy = freeze({
    policyId: "SELFDEV058-PHASE4-ADOPTION-POLICY",
    policyVersion: "1.0.0",
    currentMode: "STRICT_REPOSITORY010",
    adoptionDecisionActor: "Project Owner",
    acceptanceMode: "MANUAL",
    tokenTtlMinutes: 15,
    tokenConsumptionMode: "ONE_TIME",
    maxConsumptions: 1,
    explicitAdoptionDecisionRequired: true,
    v5RequiredAfterReflection: true,
    baselinePromotionSeparateExplicitAction: true,
    relaxationPoints: [
      {
        key: "adoptionDecisionActor",
        current: "Project Owner",
        futureExamples: ["DELEGATED_ACCEPTANCE_ROLE"],
        engineEnforcementRefs: [
          "13_local_first_repository_acceptance_token.js#issueManualAcceptanceToken:Project Owner actor/role prerequisites"
        ],
        futureMigrationRequired: true
      },
      {
        key: "tokenTtlMinutes",
        current: 15,
        futureExamples: [30, 60],
        engineEnforcementRefs: [
          "13_local_first_repository_acceptance_token.js#TOKEN_TTL_MS",
          "13_local_first_repository_acceptance_token.js#tokenIsActive"
        ],
        futureMigrationRequired: true
      },
      {
        key: "tokenConsumptionMode",
        current: "ONE_TIME",
        futureExamples: ["BOUNDED_REUSE"],
        engineEnforcementRefs: [
          "13_local_first_repository_controlled_transaction.js#consumeToken",
          "13_local_first_repository_acceptance_token.js#validateAcceptanceToken:consumption/revocation state"
        ],
        futureMigrationRequired: true
      }
    ],
    immutableHardBoundaries: {
      selfAdoptionAllowed: false,
      validationEqualsAdoption: false,
      acceptanceTokenEqualsMutationAuthority: false,
      adoptionBypassAllowed: false,
      reflectionWithoutBackupAllowed: false,
      reflectionWithoutRollbackPlanAllowed: false,
      successfulReflectionWithoutV5Allowed: false,
      automaticBaselinePromotionAllowed: false,
      automatedProjectOwnerImpersonationAllowed: false
    }
  });

  function getSelfDevelopmentPhase4AdoptionPolicy() { return i.clone(policy); }
  function getSelfDevelopmentPhase4RelaxationGuide() {
    return {
      file: "18_self_development_phase4_adoption_policy.js",
      changeEntryPoints: ["adoptionDecisionActor", "acceptanceMode", "tokenTtlMinutes", "tokenConsumptionMode", "maxConsumptions"],
      currentStrictDefaults: { actor: policy.adoptionDecisionActor, acceptanceMode: policy.acceptanceMode, tokenTtlMinutes: policy.tokenTtlMinutes, consumption: policy.tokenConsumptionMode },
      engineMigrationRequired: true,
      engineEnforcementRefs: policy.relaxationPoints.reduce(function (out, item) { return out.concat(item.engineEnforcementRefs); }, []),
      immutableHardBoundaries: i.clone(policy.immutableHardBoundaries),
      note: "Relaxation requires an explicit future Decision/Phase. Policy change alone never bypasses REPOSITORY-010 enforcement."
    };
  }
  function validateSelfDevelopmentPhase4AdoptionPolicy(candidate) {
    const p = candidate && typeof candidate === "object" ? candidate : policy;
    const h = p.immutableHardBoundaries || {}, failures = [];
    if (h.selfAdoptionAllowed !== false) failures.push("self-adoption-must-remain-false");
    if (h.validationEqualsAdoption !== false) failures.push("validation-equals-adoption-must-remain-false");
    if (h.acceptanceTokenEqualsMutationAuthority !== false) failures.push("token-must-not-equal-mutation-authority");
    if (h.reflectionWithoutBackupAllowed !== false) failures.push("backup-required");
    if (h.reflectionWithoutRollbackPlanAllowed !== false) failures.push("rollback-plan-required");
    if (h.successfulReflectionWithoutV5Allowed !== false) failures.push("v5-required");
    if (h.automaticBaselinePromotionAllowed !== false) failures.push("automatic-baseline-promotion-prohibited");
    return { valid: failures.length === 0, failures: failures, policyVersion: p.policyVersion || null, checkedAt: i.nowIso() };
  }

  Object.assign(namespace.api, { getSelfDevelopmentPhase4AdoptionPolicy, getSelfDevelopmentPhase4RelaxationGuide, validateSelfDevelopmentPhase4AdoptionPolicy });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase4AdoptionPolicy = { id: "SELF-DEVELOPMENT-058-PHASE4-ADOPTION-POLICY", version: P4.version, status: "Ready", strictInitial: true, futureRelaxationDocumented: true, engineMigrationRequiredForRelaxation: true, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
