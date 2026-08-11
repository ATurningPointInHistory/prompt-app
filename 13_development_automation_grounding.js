/* ============================================================
   FILE: 13_development_automation_grounding.js
   IDE-190 Development Automation
   Release: 1.1.0 / Module: Grounding 1.0.0
   Phase 2: IDE-180 Intake / Grounding
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 grounding blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("grounding");

  function classifyGroundingStatus(navigationStatus, missingSources) {
    const missing = Array.isArray(missingSources) ? missingSources : [];
    if (missing.length > 0 || navigationStatus === "missing-source") return "Recovery-Required";
    if (navigationStatus === "complete") return "Grounded";
    return "Partial";
  }

  function recoveryDelegation(groundingStatus, missingSources) {
    const required = groundingStatus === "Recovery-Required";
    return {
      required: required,
      ownerComponentId: "IDE-180",
      action: required ? "delegate-read-only-recovery-to-ide180" : "none",
      requiresUserExplicitConsent: required,
      userArchiveSelectionRequired: required,
      automaticArchiveImportAllowed: false,
      importAuthorized: false,
      mutationApprovalGranted: false,
      missingSources: internal.clone(Array.isArray(missingSources) ? missingSources : [])
    };
  }

  async function revalidateSourcePair(source) {
    const ide180 = global.IDE180KnowledgeNavigator;
    const api = ide180 && ide180.api && typeof ide180.api === "object" ? ide180.api : null;
    if (!api || typeof api.validateKnowledgeNavigatorPackage !== "function" || typeof api.validateIDE190HandoffContract !== "function") return null;
    const packageValidation = await api.validateKnowledgeNavigatorPackage(source.navigationPackage);
    const handoffValidation = await api.validateIDE190HandoffContract(source.handoff);
    return {
      valid: Boolean(packageValidation && packageValidation.valid === true && handoffValidation && handoffValidation.valid === true),
      packageValidation: packageValidation,
      handoffValidation: handoffValidation
    };
  }

  async function groundIDE180Navigation(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const intakeId = internal.text(settings.intakeId || input, state.latestIntakeId || "");
    const intake = state.intakes.get(intakeId) || null;
    const source = typeof internal.getIDE180IntakeSource === "function" ? internal.getIDE180IntakeSource(intakeId) : null;
    if (!intake || !source || !source.navigationPackage || !source.handoff) {
      return internal.buildResult(false, "IDE190_VALIDATED_INTAKE_REQUIRED", "Blocked", null, { error: { message: "Validated IDE-180 intake is required before Grounding.", category: "Input" } });
    }

    const revalidation = await revalidateSourcePair(source);
    if (!revalidation || revalidation.valid !== true) {
      return internal.buildResult(false, "IDE190_GROUNDING_SOURCE_REVALIDATION_FAILED", "Blocked", { intake: internal.clone(intake), revalidation: revalidation });
    }

    const navigationPackage = source.navigationPackage;
    const missingSources = internal.clone(navigationPackage.missingSources || []);
    const groundingStatus = classifyGroundingStatus(navigationPackage.navigationStatus, missingSources);
    const planEligible = groundingStatus === "Grounded" && navigationPackage.navigationStatus === "complete" && missingSources.length === 0;
    const grounding = {
      groundingId: internal.nextId("IDE-190-GROUNDING"),
      intakeId: intake.intakeId,
      packageId: intake.packageId,
      packageHash: intake.packageHash,
      handoffId: intake.handoffId,
      handoffHash: intake.handoffHash,
      validationLayer: "V0",
      canonicalTarget: internal.clone(navigationPackage.canonicalTarget || {}),
      navigationPath: internal.clone(navigationPackage.navigationPath || []),
      navigationStatus: navigationPackage.navigationStatus || "unknown",
      groundingStatus: groundingStatus,
      authority: internal.clone(navigationPackage.authority || { status: "not-applicable" }),
      evidence: internal.clone(navigationPackage.evidence || []),
      lineage: internal.clone(navigationPackage.lineage || []),
      validation: internal.clone(navigationPackage.validation || { status: "not-evaluated" }),
      conflicts: internal.clone(navigationPackage.conflicts || []),
      missingSources: missingSources,
      sourceSnapshot: internal.clone(navigationPackage.sourceSnapshot || {}),
      structuredExplanation: internal.clone(navigationPackage.structuredExplanation || {}),
      sourceBounded: true,
      inferenceUsed: false,
      missingSourceInferenceAllowed: false,
      authorityRecomputed: false,
      providerCompositionUsed: false,
      recommendationApplied: false,
      planEligible: planEligible,
      dispatchEligible: false,
      recoveryDelegation: recoveryDelegation(groundingStatus, missingSources),
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };

    const contract = namespace.validateContract("groundingContext", grounding);
    if (!contract.valid) return internal.buildResult(false, "IDE190_GROUNDING_CONTRACT_INVALID", "Blocked", { grounding: grounding, validation: contract });

    const frozen = internal.deepFreeze(internal.clone(grounding));
    state.groundings.set(frozen.groundingId, frozen);
    state.latestGroundingId = frozen.groundingId;
    internal.touch();
    return internal.buildResult(true, "IDE190_GROUNDING_READY", groundingStatus, { grounding: internal.clone(frozen), validation: contract });
  }

  async function intakeAndGroundIDE180Navigation(input) {
    const intakeResult = await namespace.intakeIDE180Navigation(input || {});
    if (!intakeResult || intakeResult.ok !== true || !intakeResult.data || !intakeResult.data.intake) return intakeResult;
    return groundIDE180Navigation({ intakeId: intakeResult.data.intake.intakeId });
  }

  async function intakeAndGroundLatestIDE180Navigation() { return intakeAndGroundIDE180Navigation({}); }

  function getGroundingContext(groundingId) { return internal.clone(state.groundings.get(internal.text(groundingId, "")) || null); }
  function getLatestGroundingContext() { return state.latestGroundingId ? getGroundingContext(state.latestGroundingId) : null; }
  function listGroundingContexts() { return Array.from(state.groundings.values()).map(function copy(item) { return internal.clone(item); }); }

  function getGroundingStatus() {
    const latest = state.latestGroundingId ? state.groundings.get(state.latestGroundingId) : null;
    return {
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      moduleVersion: MODULE_VERSION,
      status: namespace.modules.grounding && namespace.modules.grounding.status || "Loaded",
      groundingCount: state.groundings.size,
      latestGroundingId: state.latestGroundingId,
      latestGroundingStatus: latest && latest.groundingStatus || null,
      validationLayer: "V0",
      missingSourceInferenceAllowed: false,
      providerCompositionAllowed: false,
      authorityRecomputationAllowed: false,
      dispatchImplemented: false,
      readOnly: true
    };
  }

  function initializeGrounding() {
    namespace.modules.grounding.status = "Ready";
    return internal.buildResult(true, "IDE190_GROUNDING_INITIALIZED", "Ready", getGroundingStatus());
  }

  Object.assign(namespace.api, {
    initializeGrounding: initializeGrounding,
    groundIDE180Navigation: groundIDE180Navigation,
    intakeAndGroundIDE180Navigation: intakeAndGroundIDE180Navigation,
    intakeAndGroundLatestIDE180Navigation: intakeAndGroundLatestIDE180Navigation,
    getGroundingContext: getGroundingContext,
    getLatestGroundingContext: getLatestGroundingContext,
    listGroundingContexts: listGroundingContexts,
    getGroundingStatus: getGroundingStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.grounding = {
    id: "IDE-190-GROUNDING",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    validationLayer: "V0",
    sourceBounded: true,
    missingSourceInferenceAllowed: false,
    authorityRecomputationAllowed: false,
    providerCompositionAllowed: false,
    dispatchImplemented: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };

  global.groundIDE180NavigationForAutomation = groundIDE180Navigation;
  global.intakeAndGroundLatestIDE180NavigationForAutomation = intakeAndGroundLatestIDE180Navigation;
})(typeof window !== "undefined" ? window : globalThis);
