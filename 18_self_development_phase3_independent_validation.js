/* ============================================================
   FILE: 18_self_development_phase3_independent_validation.js
   Decision 058 Phase 3 / Independent Patch Validation Evidence
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P3 = global.SELFDEVELOPMENT058Phase3VersionManifest;
  if (!namespace || !namespace.__internal || !P3) return;
  const i = namespace.__internal;
  function validateSelfDevelopmentPhase3IndependentPatchEvidence(input) {
    const x = i.isPlainObject(input) ? input : {};
    const validators = i.unique(x.validatorComponents || []), changed = i.unique(x.changedComponents || ["SELF-DEVELOPMENT-058"]);
    const independent = validators.filter(function (v) { return changed.indexOf(v) < 0; });
    const patchVerification = x.patchVerification;
    const failures = [];
    if (!patchVerification || patchVerification.ok !== true) failures.push("patch-verification-required");
    if (!independent.length) failures.push("independent-validator-required");
    if (x.validationEqualsApproval === true) failures.push("validation-cannot-equal-approval");
    const evidence = i.deepFreeze({
      evidenceId: i.nextId("SELFDEV058-PHASE3-INDEPENDENT-VALIDATION"),
      changedComponents: changed,
      validatorComponents: validators,
      independentValidatorComponents: independent,
      independentValidationReady: failures.length === 0,
      failures: failures,
      validationEqualsApproval: false,
      adoptionAuthorizationGranted: false,
      canonicalMutationAuthorized: false,
      createdAt: i.nowIso(),
      immutable: true
    });
    return i.buildResult(failures.length === 0, failures.length === 0 ? "SELFDEV058_PHASE3_INDEPENDENT_VALIDATION_CONFIRMED" : "SELFDEV058_PHASE3_INDEPENDENT_VALIDATION_BLOCKED", failures.length === 0 ? "Confirmed" : "Blocked", evidence);
  }
  Object.assign(namespace.api, { validateSelfDevelopmentPhase3IndependentPatchEvidence }); Object.assign(namespace, namespace.api);
  namespace.modules.phase3IndependentValidation = { id: "SELF-DEVELOPMENT-058-PHASE3-INDEPENDENT-VALIDATION", version: P3.version, status: "Ready", independentValidatorRequired: true, validationEqualsApproval: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
