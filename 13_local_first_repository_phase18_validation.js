/* ============================================================
   FILE: 13_local_first_repository_phase18_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.17.3
   Phase 18: Guided Repository Operations Validation
   Read-only validation; no picker, write, acceptance or promotion execution.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase18 Validation blocked: dependencies unavailable.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase18Validation") || "1.0.3";

  function runLocalFirstRepositoryPhase18Validation() {
    const checks = [];
    function add(name, passed, detail, category, critical) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? null : detail, category: category || "Phase18", critical: critical !== false });
    }

    const guided = namespace.modules.guidedOperations || {};
    const ui = namespace.modules.guidedOperationsUi || {};
    const requiredApis = [
      "initializeGuidedRepositoryOperations",
      "resolveGuidedRepositoryCanonical",
      "scanGuidedRepository",
      "receiveGuidedAndroidToPcSync",
      "receiveGuidedMutationPackage",
      "approveGuidedMutation",
      "reflectGuidedMutation",
      "promoteGuidedReflection",
      "verifyPhase18BootstrapRelease",
      "promotePhase18BootstrapRelease",
      "verifyGuidedDevelopmentReleaseUpdate",
      "promoteGuidedDevelopmentReleaseUpdate",
      "getGuidedRepositoryOperationsStatus"
    ];

    add("Release version is 1.17.3", VERSION_MANIFEST.release && VERSION_MANIFEST.release.version === "1.17.3", VERSION_MANIFEST.release && VERSION_MANIFEST.release.version, "Version");
    add("Phase18 implementation identity", VERSION_MANIFEST.implementation && Number(VERSION_MANIFEST.implementation.phase) === 18, VERSION_MANIFEST.implementation && VERSION_MANIFEST.implementation.phase, "Version");
    add("Guided Operations module loaded", guided.phase === 18 && guided.additiveOrchestrationOnly === true, guided, "Module");
    add("Guided Operations UI module loaded", ui.phase === 18 && ui.consolePasteRequiredForNormalUse === false, ui, "Module");
    add("Guided public APIs available", requiredApis.every(function (name) { return typeof namespace[name] === "function"; }), requiredApis.filter(function (name) { return typeof namespace[name] !== "function"; }), "API");
    add("Phase17 Sync Engine reused", typeof namespace.receiveLocalFirstRepositoryAndroidToPcSyncFile === "function", typeof namespace.receiveLocalFirstRepositoryAndroidToPcSyncFile, "Reuse");
    add("Phase17 Acceptance Token reused", typeof namespace.issueManualAcceptanceToken === "function", typeof namespace.issueManualAcceptanceToken, "Reuse");
    add("Phase17 Persistent Reflection reused", typeof namespace.executePersistentCanonicalReflection === "function", typeof namespace.executePersistentCanonicalReflection, "Reuse");
    add("Phase17 Explicit Baseline Promotion reused", typeof namespace.promoteCanonicalBaseline === "function", typeof namespace.promoteCanonicalBaseline, "Reuse");
    add("Development Release V5 reused", typeof namespace.selectAndVerifyLocalFirstRepositoryDevelopmentReleaseV5 === "function", typeof namespace.selectAndVerifyLocalFirstRepositoryDevelopmentReleaseV5, "Bootstrap");
    add("Automatic Acceptance remains prohibited", VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.phase18AutomaticAcceptanceAllowed === false, VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.phase18AutomaticAcceptanceAllowed, "Authority");
    add("Automatic Promotion remains prohibited", VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.phase18AutomaticBaselinePromotionAllowed === false, VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.phase18AutomaticBaselinePromotionAllowed, "Authority");
    add("Direct Repository Mutation remains prohibited", VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.phase18DirectRepositoryMutationAllowed === false, VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.phase18DirectRepositoryMutationAllowed, "Authority");
    add("Project Owner explicit actions preserved", VERSION_MANIFEST.acceptance && VERSION_MANIFEST.acceptance.phase18ProjectOwnerExplicitActionsRequired === true, VERSION_MANIFEST.acceptance && VERSION_MANIFEST.acceptance.phase18ProjectOwnerExplicitActionsRequired, "Authority");
    add("Console paste removed from normal operation", guided.consolePasteRequiredForNormalUse === false && ui.consolePasteRequiredForNormalUse === false, { guided: guided.consolePasteRequiredForNormalUse, ui: ui.consolePasteRequiredForNormalUse }, "UX");
    add("Direct user-gesture picker binding implemented", guided.directUserGesturePickerBindingRequired === true && ui.directUserGesturePickerBindingImplemented === true, { guided: guided.directUserGesturePickerBindingRequired, ui: ui.directUserGesturePickerBindingImplemented }, "UX");
    add("Picker selection precedes explicit confirmation", ui.confirmationAfterDirectorySelection === true && guided.selectedDirectoryReuseSupported === true, { confirmationAfterDirectorySelection: ui.confirmationAfterDirectorySelection, selectedDirectoryReuseSupported: guided.selectedDirectoryReuseSupported }, "UX");
    add("Repo launcher does not overlap legacy tools button", ui.launcherCollisionAvoidanceImplemented === true, ui.launcherCollisionAvoidanceImplemented, "UX");
    add("Guided controls preserve dark-mode contrast", ui.darkModeContrastHotfixImplemented === true, ui.darkModeContrastHotfixImplemented, "UX");
    add("Development Update controls available without Console", ui.developmentUpdateControlsImplemented === true, ui.developmentUpdateControlsImplemented, "UX");
    add("Development Update workflow supported", guided.developmentUpdateFlowSupported === true, guided.developmentUpdateFlowSupported, "UX");
    add("Persisted Development Release V5 Evidence recovery supported", guided.persistedDevelopmentReleaseEvidenceRecoverySupported === true, guided.persistedDevelopmentReleaseEvidenceRecoverySupported, "Persistence");
    add("Ambiguous persisted V5 Evidence is never auto-selected", guided.ambiguousPersistedEvidenceAutoSelectionAllowed === false, guided.ambiguousPersistedEvidenceAutoSelectionAllowed, "Authority");

    const passed = checks.filter(function (item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function (item) { return item.critical && !item.passed; }).length;
    const health = checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0;
    const result = {
      id: internal.nextId("REPOSITORY010-PHASE18-VALIDATION"),
      componentId: "REPOSITORY-010",
      version: "1.17.3",
      implementationPhase: "Phase 18 Guided Repository Operations",
      name: "REPOSITORY-010 Phase 18 Guided Operations Static Validation",
      passed: passed,
      failed: failed,
      total: checks.length,
      health: health,
      criticalFailed: criticalFailed,
      releaseAllowed: failed === 0 && criticalFailed === 0,
      checks: checks,
      readOnly: true,
      repositoryWriteAttempted: false,
      automaticAcceptancePerformed: false,
      automaticPromotionPerformed: false,
      createdAt: internal.nowIso()
    };
    stateLast(result);
    return result;
  }

  function stateLast(result) {
    internal.state.lastPhase18Validation = internal.clone(result);
    internal.touch();
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase18Validation: runLocalFirstRepositoryPhase18Validation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase18Validation = {
    id: "REPOSITORY-010-PHASE18-VALIDATION",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 18,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
