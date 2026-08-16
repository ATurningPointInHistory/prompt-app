/* ============================================================
   FILE: 13_local_first_repository_phase13_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.12.0 / Module: Phase 13 Validation 1.0.0
   Phase 13: Persistent Canonical Reflection / V5 Gate
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase13Validation");

  function summarize(checks) {
    const passed = checks.filter(function f(x) { return x.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function f(x) { return !x.passed && x.severity === "Critical"; }).length;
    return {
      id: "REPOSITORY-010-PHASE13-VALIDATION",
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: "Phase 13 Persistent Canonical Reflection / V5",
      passed: passed, failed: failed, total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "REPOSITORY-010 Phase 13 Pre-Device Validation PASS" : "REPOSITORY-010 Phase 13 Pre-Device Validation FAIL",
      releaseAllowed: failed === 0,
      phase13ReadyForRealDeviceValidation: failed === 0,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function runLocalFirstRepositoryPhase13Validation() {
    const checks = [];
    function check(name, condition, actual, category, severity) { checks.push({ name: name, passed: Boolean(condition), actual: internal.clone(actual), category: category, severity: severity || "Critical" }); }
    const impl = VERSION_MANIFEST.implementation || {};
    const writeAdapter = namespace.getRestrictedDesktopWriteAdapterStatus ? namespace.getRestrictedDesktopWriteAdapterStatus() : null;
    const closure = namespace.getReflectionIntegrityClosureStatus ? namespace.getReflectionIntegrityClosureStatus() : null;
    const reflection = namespace.getPersistentCanonicalReflectionStatus ? namespace.getPersistentCanonicalReflectionStatus() : null;

    check("Release version is 1.12.0", VERSION_MANIFEST.release.version === "1.12.0", VERSION_MANIFEST.release.version, "Version");
    check("Decision-008 is frozen baseline", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-008") !== -1, VERSION_MANIFEST.release.decisionIds, "Architecture");
    check("Reflection Closure API available", typeof namespace.deriveReflectionIntegrityClosure === "function", typeof namespace.deriveReflectionIntegrityClosure, "API");
    check("Persistent Reflection API available", typeof namespace.executePersistentCanonicalReflection === "function", typeof namespace.executePersistentCanonicalReflection, "API");
    check("Phase 12 transaction persistence preserved", typeof namespace.putControlledTransactionRecord === "function" && typeof namespace.getControlledTransactionRecord === "function", true, "Persistence");
    check("Phase 12 mechanics connected internally", Boolean(internal.phase12ControlledTransactionMechanics), Boolean(internal.phase12ControlledTransactionMechanics), "Connection");
    check("Restricted Desktop Write adapter connected", Boolean(internal.phase12DesktopWriteAdapter), Boolean(internal.phase12DesktopWriteAdapter), "Connection");
    check("Unrestricted public write API remains prohibited", Boolean(writeAdapter && writeAdapter.unrestrictedWriteApiExposed === false && writeAdapter.arbitraryFileCreateAllowed === false && writeAdapter.arbitraryFileDeleteAllowed === false), writeAdapter, "Safety");
    check("Accepted mutation remains function-patch only", Boolean(closure && closure.functionPatchOnly !== false && reflection && reflection.functionPatchOnly === true), { closure: closure, reflection: reflection }, "Scope");
    check("Closure is deterministic only", Boolean(closure && closure.deterministicOnly === true && closure.timestampWinnerUsed === false && closure.authorityScoringUsed === false && closure.trustScoringUsed === false && closure.conflictScoringUsed === false), closure, "Decision-008");
    check("Manifest/index closure write is transaction-bound internal API", Boolean(internal.phase12DesktopWriteAdapter && typeof internal.phase12DesktopWriteAdapter.executeBoundClosureWrite === "function" && typeof internal.phase12DesktopWriteAdapter.executeBoundClosureRestore === "function"), true, "Write Boundary");
    check("V5 full verification API is internal and required", Boolean(internal.phase12DesktopWriteAdapter && typeof internal.phase12DesktopWriteAdapter.runV5PostReflectionVerification === "function" && reflection && reflection.v5Required === true), true, "V5");
    check("V5 failure rollback is required", Boolean(reflection && reflection.automaticRollbackOnV5Failure === true), reflection, "Rollback");
    check("Persistent reflection is implemented", impl.persistentCanonicalReflectionImplemented === true, impl.persistentCanonicalReflectionImplemented, "Implementation");
    check("V5 post-reflection verification is implemented", impl.v5PostReflectionVerificationImplemented === true, impl.v5PostReflectionVerificationImplemented, "Implementation");
    check("Controlled canonical transaction is implemented", impl.controlledCanonicalTransactionImplemented === true, impl.controlledCanonicalTransactionImplemented, "Implementation");
    check("Canonical Revision promotion remains explicit", impl.automaticCanonicalRevisionPromotionEnabled === false && impl.canonicalRevisionPromotionImplemented === false, { auto: impl.automaticCanonicalRevisionPromotionEnabled, implemented: impl.canonicalRevisionPromotionImplemented }, "Authority");
    check("Sync Engine remains out of Phase 13", impl.syncEngineImplemented === false, impl.syncEngineImplemented, "Boundary");
    check("Direct Repository mutation remains prohibited", VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Safety");

    const result = summarize(checks);
    state.lastPhase13Validation = internal.clone(result);
    state.phase13ValidationStatus = result.status;
    internal.touch();
    return result;
  }

  function getLocalFirstRepositoryPhase13ValidationStatus() {
    return internal.clone(state.lastPhase13Validation || { status: "Not Run", moduleVersion: MODULE_VERSION, phase: 13 });
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase13Validation: runLocalFirstRepositoryPhase13Validation,
    getLocalFirstRepositoryPhase13ValidationStatus: getLocalFirstRepositoryPhase13ValidationStatus
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase13Validation = { id: "REPOSITORY-010-PHASE13-VALIDATION", version: MODULE_VERSION, status: "Loaded", phase: 13, loadedAt: internal.nowIso() };
  global.runLocalFirstRepositoryPhase13Validation = runLocalFirstRepositoryPhase13Validation;
})(typeof window !== "undefined" ? window : globalThis);
