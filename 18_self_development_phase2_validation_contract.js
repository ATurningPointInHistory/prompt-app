/* ============================================================
   FILE: 18_self_development_phase2_validation_contract.js
   Decision 058 Phase 2 / Validation Pipeline + Independent Validator Separation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;
  const i = namespace.__internal;
  function buildSelfDevelopmentValidationSeparationContract(input) {
    const x = i.isPlainObject(input) ? input : {}, changed = i.unique(x.changedComponents || []), validators = i.unique(x.validatorComponents || []);
    const independent = validators.filter(function (v) { return !changed.includes(v); });
    return i.deepFreeze({
      contractId: i.nextId("SELFDEV058-VALIDATION-CONTRACT"),
      changedComponents: changed, validatorComponents: validators, independentValidatorComponents: independent,
      independentValidatorRequired: true, changedComponentCannotBeSoleValidator: true, validatorMayNotDisableItsOwnRequiredGate: true,
      protectedControlPlaneRequiresArchitectureReview: true, validationEqualsApproval: false, validationGrantsAuthority: false,
      canonicalMutationAuthorized: false, authorityEffect: "none", createdAt: i.nowIso(), immutable: true
    });
  }
  function validateSelfDevelopmentValidatorSeparation(contract) {
    const c = i.isPlainObject(contract) ? contract : {}, failures = [];
    const changed = i.unique(c.changedComponents || []), validators = i.unique(c.validatorComponents || []), independent = validators.filter(function (v) { return !changed.includes(v); });
    if (!changed.length) failures.push("changed-component-required");
    if (!validators.length) failures.push("validator-required");
    if (!independent.length) failures.push("independent-validator-required");
    if (c.validationEqualsApproval !== false) failures.push("validation-must-not-equal-approval");
    if (c.validationGrantsAuthority !== false) failures.push("validation-must-not-grant-authority");
    return i.buildResult(failures.length === 0, failures.length ? "SELFDEV058_VALIDATOR_SEPARATION_BLOCKED" : "SELFDEV058_VALIDATOR_SEPARATION_READY", failures.length ? "Blocked" : "Ready", { failures: failures, changedComponents: changed, validatorComponents: validators, independentValidatorComponents: independent, independentValidationReady: failures.length === 0, validationEqualsApproval: false, canonicalMutationAuthorized: false });
  }
  function getSelfDevelopmentPhase2ValidationPipeline() {
    return i.deepFreeze({ stages: ["BASELINE_IDENTITY", "READ_ONLY_INSPECTION", "EVIDENCE_INTEGRITY", "DETERMINISTIC_DETECTION", "SCOPE_CLASSIFICATION", "EXTERNAL_AI_READINESS_NO_CALL", "INDEPENDENT_VALIDATOR_SEPARATION", "PC_STATIC_PACKAGE", "PC_RUNTIME", "ANDROID_RUNTIME"], validationEqualsApproval: false, projectOwnerAcceptanceRequired: true, mutationValidationDeferred: true, canonicalMutationAuthorized: false });
  }
  Object.assign(namespace.api, { buildSelfDevelopmentValidationSeparationContract, validateSelfDevelopmentValidatorSeparation, getSelfDevelopmentPhase2ValidationPipeline }); Object.assign(namespace, namespace.api);
  namespace.modules.phase2ValidationContract = { id: "SELF-DEVELOPMENT-058-PHASE2-VALIDATION-CONTRACT", version: P2.version, status: "Ready", independentValidatorRequired: true, validationEqualsApproval: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
