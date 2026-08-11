/* ============================================================
   FILE: 13_development_automation_intake.js
   IDE-190 Development Automation
   Release: 1.1.0 / Module: Intake 1.0.0
   Phase 2: IDE-180 Intake / Grounding
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 intake blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("intake");

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function sortKey(key) { output[key] = stableValue(value[key]); });
    return output;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  function getIDE180Api() {
    const ide180 = global.IDE180KnowledgeNavigator;
    return ide180 && ide180.api && typeof ide180.api === "object" ? ide180.api : null;
  }

  function resolvePair(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const api = getIDE180Api();
    const navigationPackage = settings.navigationPackage || settings.package || null;
    const handoff = settings.handoff || settings.ide190Handoff || null;
    if (navigationPackage || handoff) return { navigationPackage: navigationPackage, handoff: handoff, source: "explicit" };
    return {
      navigationPackage: api && typeof api.getLatestKnowledgeNavigatorPackage === "function" ? api.getLatestKnowledgeNavigatorPackage() : null,
      handoff: api && typeof api.getLatestIDE190Handoff === "function" ? api.getLatestIDE190Handoff() : null,
      source: "latest-ide180-runtime"
    };
  }

  function linkageChecks(navigationPackage, handoff) {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) }); }
    check("Package ID matches Handoff Package ID", Boolean(navigationPackage && handoff && navigationPackage.packageId && navigationPackage.packageId === handoff.packageId), handoff && handoff.packageId);
    check("Navigation Result ID matches", Boolean(navigationPackage && handoff && navigationPackage.navigationResultId === handoff.navigationResultId), handoff && handoff.navigationResultId);
    check("Navigation Status matches", Boolean(navigationPackage && handoff && navigationPackage.navigationStatus === handoff.navigationStatus), handoff && handoff.navigationStatus);
    check("Canonical Target matches", Boolean(navigationPackage && handoff && stableStringify(navigationPackage.canonicalTarget) === stableStringify(handoff.canonicalTarget)), handoff && handoff.canonicalTarget && handoff.canonicalTarget.canonicalId);
    check("Source Snapshot matches", Boolean(navigationPackage && handoff && stableStringify(navigationPackage.sourceSnapshot) === stableStringify(handoff.sourceSnapshot)), handoff && handoff.sourceSnapshot && handoff.sourceSnapshot.snapshotVersion);
    check("Package is immutable", Boolean(navigationPackage && navigationPackage.immutable === true), navigationPackage && navigationPackage.immutable);
    check("Handoff is frozen and immutable", Boolean(handoff && handoff.frozen === true && handoff.immutable === true), handoff && handoff.frozen);
    check("Handoff consumer is IDE-190", Boolean(handoff && handoff.consumer && handoff.consumer.componentId === "IDE-190"), handoff && handoff.consumer && handoff.consumer.componentId);
    check("Repository mutation remains denied", Boolean(handoff && handoff.policy && handoff.policy.repositoryMutationAllowed === false), handoff && handoff.policy && handoff.policy.repositoryMutationAllowed);
    check("Workflow execution remains denied", Boolean(handoff && handoff.policy && handoff.policy.workflowExecutionAllowed === false), handoff && handoff.policy && handoff.policy.workflowExecutionAllowed);
    check("Missing Source inference remains denied", Boolean(handoff && handoff.policy && handoff.policy.missingSourceInferenceAllowed === false), handoff && handoff.policy && handoff.policy.missingSourceInferenceAllowed);
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return { valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, checks: checks };
  }

  async function intakeIDE180Navigation(input) {
    const api = getIDE180Api();
    if (!api || typeof api.validateKnowledgeNavigatorPackage !== "function" || typeof api.validateIDE190HandoffContract !== "function") {
      return internal.buildResult(false, "IDE190_IDE180_VALIDATION_API_REQUIRED", "Blocked", null, { error: { message: "IDE-180 validation API is required for formal intake.", category: "Dependency" } });
    }

    const pair = resolvePair(input);
    const navigationPackage = pair.navigationPackage;
    const handoff = pair.handoff;
    if (!navigationPackage || !handoff) {
      return internal.buildResult(false, "IDE190_VALIDATED_NAVIGATION_INPUT_REQUIRED", "Blocked", null, {
        error: { message: "Validated IDE-180 Navigation Package and IDE-180 to IDE-190 Handoff are both required.", category: "Input" },
        source: pair.source
      });
    }

    const packageValidation = await api.validateKnowledgeNavigatorPackage(navigationPackage);
    const handoffValidation = await api.validateIDE190HandoffContract(handoff);
    const linkage = linkageChecks(navigationPackage, handoff);
    if (!packageValidation || packageValidation.valid !== true || !handoffValidation || handoffValidation.valid !== true || linkage.valid !== true) {
      return internal.buildResult(false, "IDE190_NAVIGATION_INTAKE_INVALID", "Blocked", {
        packageValidation: packageValidation || null,
        handoffValidation: handoffValidation || null,
        linkage: linkage
      });
    }

    const intake = {
      intakeId: internal.nextId("IDE-190-INTAKE"),
      sourceComponentId: "IDE-180",
      groundingInputType: "validated-ide180-package-plus-handoff",
      source: pair.source,
      packageId: navigationPackage.packageId,
      packageHash: navigationPackage.integrity && navigationPackage.integrity.hash || "",
      handoffId: handoff.handoffId,
      handoffHash: handoff.integrity && handoff.integrity.hash || "",
      navigationResultId: navigationPackage.navigationResultId || null,
      navigationStatus: navigationPackage.navigationStatus || "unknown",
      packageValidationValid: true,
      handoffValidationValid: true,
      linkageValid: true,
      missingSourceCount: Array.isArray(navigationPackage.missingSources) ? navigationPackage.missingSources.length : 0,
      providerBypassUsed: false,
      missingSourceInferenceUsed: false,
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("navigationIntake", intake);
    if (!contract.valid) return internal.buildResult(false, "IDE190_NAVIGATION_INTAKE_CONTRACT_INVALID", "Blocked", { intake: intake, validation: contract });

    const frozen = internal.deepFreeze(internal.clone(intake));
    state.intakes.set(frozen.intakeId, frozen);
    state.intakeSources.set(frozen.intakeId, internal.deepFreeze({
      navigationPackage: internal.clone(navigationPackage),
      handoff: internal.clone(handoff)
    }));
    state.latestIntakeId = frozen.intakeId;
    internal.touch();
    return internal.buildResult(true, "IDE190_NAVIGATION_INTAKE_READY", frozen.navigationStatus === "complete" ? "Ready" : "Partial", {
      intake: internal.clone(frozen),
      packageValidation: packageValidation,
      handoffValidation: handoffValidation,
      linkage: linkage
    });
  }

  async function intakeLatestIDE180Navigation() { return intakeIDE180Navigation({}); }

  function getNavigationIntake(intakeId) { return internal.clone(state.intakes.get(internal.text(intakeId, "")) || null); }
  function getLatestNavigationIntake() { return state.latestIntakeId ? getNavigationIntake(state.latestIntakeId) : null; }
  function listNavigationIntakes() { return Array.from(state.intakes.values()).map(function copy(item) { return internal.clone(item); }); }
  function getIntakeSource(intakeId) { return state.intakeSources.get(internal.text(intakeId, "")) || null; }

  function getIntakeStatus() {
    return {
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      moduleVersion: MODULE_VERSION,
      status: namespace.modules.intake && namespace.modules.intake.status || "Loaded",
      intakeCount: state.intakes.size,
      latestIntakeId: state.latestIntakeId,
      formalInput: "Validated IDE-180 Navigation Package + Validated IDE-180 to IDE-190 Handoff",
      providerBypassAllowed: false,
      missingSourceInferenceAllowed: false,
      persistenceImplemented: false,
      readOnly: true
    };
  }

  function initializeIntake() {
    namespace.modules.intake.status = "Ready";
    return internal.buildResult(true, "IDE190_INTAKE_INITIALIZED", "Ready", getIntakeStatus());
  }

  internal.getIDE180IntakeSource = getIntakeSource;
  Object.assign(namespace.api, {
    initializeIntake: initializeIntake,
    intakeIDE180Navigation: intakeIDE180Navigation,
    intakeLatestIDE180Navigation: intakeLatestIDE180Navigation,
    getNavigationIntake: getNavigationIntake,
    getLatestNavigationIntake: getLatestNavigationIntake,
    listNavigationIntakes: listNavigationIntakes,
    getIntakeStatus: getIntakeStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.intake = {
    id: "IDE-190-IDE180-INTAKE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    formalInputOnly: true,
    providerBypassAllowed: false,
    missingSourceInferenceAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };

  global.intakeIDE180NavigationForAutomation = intakeIDE180Navigation;
  global.intakeLatestIDE180NavigationForAutomation = intakeLatestIDE180Navigation;
})(typeof window !== "undefined" ? window : globalThis);
