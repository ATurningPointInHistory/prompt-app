/* ============================================================
   FILE: 13_development_automation_phase2_validation.js
   IDE-190 Development Automation
   Release: 1.1.0 / Module: Phase 2 Validation 1.0.0
   Phase 2: IDE-180 Intake / Grounding
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Phase 2 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase2Validation");
  const EXPECTED_PHASE2_SCRIPT_FILES = [
    "13_development_automation_intake.js",
    "13_development_automation_grounding.js",
    "13_development_automation_phase2_validation.js"
  ];

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), group: group || "General", severity: severity || "Critical" });
      }
    };
  }

  function summarize(checks, idPrefix, passStatus, failStatus, extras) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function count(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(idPrefix),
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? passStatus : failStatus,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  function getLoadedScriptPaths() {
    if (!global.document || !global.document.scripts) return [];
    return Array.from(global.document.scripts).map(function mapScript(script) {
      const source = String(script && script.src || "");
      if (!source) return "";
      try { return new URL(source, global.document.baseURI).pathname.split("/").pop() || ""; }
      catch (_) { return source.split("?")[0].split("#")[0].split("/").pop() || ""; }
    }).filter(Boolean);
  }

  async function runDevelopmentAutomationPhase2Validation() {
    const c = collector();
    const checks = c.checks;
    const check = c.check;
    const init = namespace.initialize({ requireIDE180: true, requireIDE160: true });
    check("Foundation initialization succeeds", init && init.ok === true, init && init.code, "Initialization", "Critical");
    check("Release Version is 1.1.0", VERSION_MANIFEST.release.version === "1.1.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 2", VERSION_MANIFEST.implementation.phase === 2, VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains exact", VERSION_MANIFEST.release.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Manifest", "Critical");
    check("Phase 1 is recorded complete", Array.isArray(VERSION_MANIFEST.implementation.completedPhases) && VERSION_MANIFEST.implementation.completedPhases.includes(1), VERSION_MANIFEST.implementation.completedPhases, "Phase Gate", "Critical");

    const dependency = namespace.getDependencyStatus();
    check("IDE-180 latest Package API is available", dependency.ide180LatestPackageApiAvailable === true, dependency.ide180LatestPackageApiAvailable, "IDE-180 Dependency", "Critical");
    check("IDE-180 latest Handoff API is available", dependency.ide180LatestHandoffApiAvailable === true, dependency.ide180LatestHandoffApiAvailable, "IDE-180 Dependency", "Critical");
    check("IDE-180 Package validation API is available", dependency.ide180PackageValidationApiAvailable === true, dependency.ide180PackageValidationApiAvailable, "IDE-180 Dependency", "Critical");
    check("IDE-180 Handoff validation API is available", dependency.ide180HandoffValidationApiAvailable === true, dependency.ide180HandoffValidationApiAvailable, "IDE-180 Dependency", "Critical");

    Object.keys(VERSION_MANIFEST.safety).forEach(function safety(key) {
      check("Safety flag remains disabled: " + key, VERSION_MANIFEST.safety[key] === false, VERSION_MANIFEST.safety[key], "Safety", "Critical");
    });
    check("IDE-180 bypass remains prohibited", VERSION_MANIFEST.initialPolicy.ide180BypassAllowed === false, VERSION_MANIFEST.initialPolicy.ide180BypassAllowed, "Grounding Boundary", "Critical");
    check("Second Mutation Engine remains prohibited", VERSION_MANIFEST.initialPolicy.secondMutationEngineAllowed === false, VERSION_MANIFEST.initialPolicy.secondMutationEngineAllowed, "Mutation Boundary", "Critical");

    const contracts = namespace.listContractDefinitions();
    check("Six Phase 1+2 contracts are registered", ["foundation","foundationState","capabilityDescriptor","platformProfile","navigationIntake","groundingContext"].every(function(key){ return Boolean(namespace.getContractDefinition(key)); }), contracts.length, "Contracts", "Critical");
    check("Navigation Intake contract exists", Boolean(namespace.getContractDefinition("navigationIntake")), namespace.getContractDefinition("navigationIntake") && namespace.getContractDefinition("navigationIntake").version, "Contracts", "Critical");
    check("Grounding Context contract exists", Boolean(namespace.getContractDefinition("groundingContext")), namespace.getContractDefinition("groundingContext") && namespace.getContractDefinition("groundingContext").version, "Contracts", "Critical");

    check("Intake module is Ready", namespace.modules.intake && namespace.modules.intake.status === "Ready", namespace.modules.intake && namespace.modules.intake.status, "Modules", "Critical");
    check("Grounding module is Ready", namespace.modules.grounding && namespace.modules.grounding.status === "Ready", namespace.modules.grounding && namespace.modules.grounding.status, "Modules", "Critical");
    check("Phase 2 Validation module is loaded", Boolean(namespace.modules.phase2Validation), namespace.modules.phase2Validation && namespace.modules.phase2Validation.status, "Modules", "Critical");

    const publicApi = namespace.getPublicApiDescription();
    check("Phase 2 implements Intake", publicApi.intakeImplemented === true, publicApi.intakeImplemented, "Scope", "Critical");
    check("Phase 2 implements Grounding", publicApi.groundingImplemented === true, publicApi.groundingImplemented, "Scope", "Critical");
    check("Phase 2 still does not implement Dispatch", publicApi.dispatchImplemented === false, publicApi.dispatchImplemented, "Scope", "Critical");
    check("Phase 2 still does not implement Mutation", publicApi.mutationImplemented === false, publicApi.mutationImplemented, "Scope", "Critical");
    check("Phase 2 still does not implement Persistence", publicApi.persistenceImplemented === false, publicApi.persistenceImplemented, "Scope", "Critical");

    const intakeResult = await namespace.intakeLatestIDE180Navigation();
    check("Latest IDE-180 formal Intake succeeds", intakeResult && intakeResult.ok === true, intakeResult && intakeResult.code, "Formal Intake", "Critical");
    const intake = intakeResult && intakeResult.data && intakeResult.data.intake || null;
    check("Intake source is IDE-180", intake && intake.sourceComponentId === "IDE-180", intake && intake.sourceComponentId, "Formal Intake", "Critical");
    check("Intake uses Package + Handoff formal input", intake && intake.groundingInputType === "validated-ide180-package-plus-handoff", intake && intake.groundingInputType, "Formal Intake", "Critical");
    check("Package validation is valid", intake && intake.packageValidationValid === true, intake && intake.packageValidationValid, "Formal Intake", "Critical");
    check("Handoff validation is valid", intake && intake.handoffValidationValid === true, intake && intake.handoffValidationValid, "Formal Intake", "Critical");
    check("Package/Handoff linkage is valid", intake && intake.linkageValid === true, intake && intake.linkageValid, "Formal Intake", "Critical");
    check("Provider bypass is not used", intake && intake.providerBypassUsed === false, intake && intake.providerBypassUsed, "No Bypass", "Critical");
    check("Missing Source inference is not used in Intake", intake && intake.missingSourceInferenceUsed === false, intake && intake.missingSourceInferenceUsed, "No Inference", "Critical");

    const groundingResult = intake ? await namespace.groundIDE180Navigation({ intakeId: intake.intakeId }) : null;
    check("V0 Grounding succeeds", groundingResult && groundingResult.ok === true, groundingResult && groundingResult.code, "Grounding", "Critical");
    const grounding = groundingResult && groundingResult.data && groundingResult.data.grounding || null;
    check("Grounding is source-bounded", grounding && grounding.sourceBounded === true, grounding && grounding.sourceBounded, "Grounding", "Critical");
    check("Grounding uses V0", grounding && grounding.validationLayer === "V0", grounding && grounding.validationLayer, "Grounding", "Critical");
    check("Grounding never infers Missing Source", grounding && grounding.inferenceUsed === false && grounding.missingSourceInferenceAllowed === false, grounding && grounding.inferenceUsed, "No Inference", "Critical");
    check("Grounding preserves IDE-180 Authority without recompute", grounding && grounding.authorityRecomputed === false, grounding && grounding.authorityRecomputed, "Authority", "Critical");
    check("Grounding does not compose Providers", grounding && grounding.providerCompositionUsed === false, grounding && grounding.providerCompositionUsed, "No Bypass", "Critical");
    check("Phase 2 Grounding cannot Dispatch", grounding && grounding.dispatchEligible === false, grounding && grounding.dispatchEligible, "Dispatch Boundary", "Critical");
    if (grounding) {
      const hasMissing = Array.isArray(grounding.missingSources) && grounding.missingSources.length > 0;
      check("Missing Source is never silently promoted", !hasMissing || grounding.groundingStatus === "Recovery-Required", grounding.groundingStatus, "Missing Source", "Critical");
      check("Missing Source blocks Plan eligibility", !hasMissing || grounding.planEligible === false, grounding.planEligible, "Missing Source", "Critical");
      check("Recovery is delegated to IDE-180 when required", !hasMissing || (grounding.recoveryDelegation && grounding.recoveryDelegation.ownerComponentId === "IDE-180"), grounding.recoveryDelegation && grounding.recoveryDelegation.ownerComponentId, "Recovery", "Critical");
      check("Archive automatic Import remains disabled", grounding.recoveryDelegation && grounding.recoveryDelegation.automaticArchiveImportAllowed === false, grounding.recoveryDelegation && grounding.recoveryDelegation.automaticArchiveImportAllowed, "Recovery", "Critical");
    }

    const unsafeIntake = intake ? Object.assign({}, intake, { missingSourceInferenceUsed: true }) : null;
    const unsafeIntakeValidation = unsafeIntake ? namespace.validateContract("navigationIntake", unsafeIntake) : null;
    check("Intake contract rejects Missing Source inference", unsafeIntakeValidation && unsafeIntakeValidation.valid === false, unsafeIntakeValidation && unsafeIntakeValidation.failed, "Negative Contract", "Critical");
    const unsafeGrounding = grounding ? Object.assign({}, grounding, { dispatchEligible: true }) : null;
    const unsafeGroundingValidation = unsafeGrounding ? namespace.validateContract("groundingContext", unsafeGrounding) : null;
    check("Grounding contract rejects Phase 2 Dispatch eligibility", unsafeGroundingValidation && unsafeGroundingValidation.valid === false, unsafeGroundingValidation && unsafeGroundingValidation.failed, "Negative Contract", "Critical");

    const result = summarize(checks, "IDE-190-PHASE2-STAGE-A-VALIDATION", "IDE-190 Phase 2 Stage A Intake / Grounding PASS", "IDE-190 Phase 2 Stage A Intake / Grounding FAIL", {
      stage: "A",
      stageName: "Phase 2 Deterministic / Pre-Android Validation",
      phase2Complete: false,
      phase3Allowed: false,
      androidRealDeviceRequired: true,
      androidRealDevicePassed: false,
      releaseAllowed: false,
      ide190Complete: false,
      intakeId: intake && intake.intakeId || null,
      groundingId: grounding && grounding.groundingId || null
    });
    internal.markPhase2Validation(result);
    namespace.modules.phase2Validation.status = result.failed === 0 ? "Pre-Device Ready" : "Blocked";
    return internal.clone(result);
  }

  async function runDevelopmentAutomationPhase2AndroidValidation() {
    const preDevice = await runDevelopmentAutomationPhase2Validation();
    const c = collector();
    const checks = c.checks;
    const check = c.check;
    check("Phase 2 Stage A is PASS", preDevice.failed === 0 && preDevice.criticalFailed === 0, preDevice.status, "Stage A", "Critical");
    const userAgent = global.navigator && global.navigator.userAgent || "";
    check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Runtime", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"), Boolean(global.crypto && global.crypto.subtle), "Android Runtime", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android Runtime", "Critical");
    check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android Runtime", "Critical");

    const loadedScripts = getLoadedScriptPaths();
    EXPECTED_PHASE2_SCRIPT_FILES.forEach(function loaded(file) {
      check("Actual script loaded: " + file, loadedScripts.includes(file), loadedScripts.length, "Actual Script Loading", "Critical");
    });

    let manifestLoad = null;
    if (typeof global.loadStaticScriptManifest === "function") {
      try { manifestLoad = await global.loadStaticScriptManifest(); }
      catch (error) { manifestLoad = { ok: false, errors: [error && error.message ? error.message : String(error)] }; }
    }
    check("Static Manifest loader API is available", typeof global.loadStaticScriptManifest === "function", typeof global.loadStaticScriptManifest, "Static Integrity", "Critical");
    check("Static Manifest fetch/integrity succeeds", Boolean(manifestLoad && manifestLoad.ok === true), manifestLoad && manifestLoad.errors || [], "Static Integrity", "Critical");
    if (manifestLoad && manifestLoad.manifest) {
      const normalizedScripts = (manifestLoad.manifest.scripts || []).map(function normalize(src) { return String(src || "").split("?")[0].split("#")[0].replace(/^\.\//, ""); });
      EXPECTED_PHASE2_SCRIPT_FILES.forEach(function manifest(file) {
        check("Static Manifest contains: " + file, normalizedScripts.includes(file), normalizedScripts.length, "Static Integrity", "Critical");
        const hash = manifestLoad.manifest.hashes && manifestLoad.manifest.hashes[file];
        check("Static Manifest has SHA-256: " + file, Boolean(hash && /^[a-f0-9]{64}$/.test(String(hash.sha256 || ""))), hash && hash.sha256, "Static Integrity", "Critical");
      });
    }

    const latestGrounding = namespace.getLatestGroundingContext();
    check("Latest Grounding remains immutable/read-only", Boolean(latestGrounding && latestGrounding.immutable === true && latestGrounding.readOnly === true), latestGrounding && latestGrounding.groundingId, "Grounding", "Critical");
    check("Android cannot grant Dispatch in Phase 2", Boolean(latestGrounding && latestGrounding.dispatchEligible === false), latestGrounding && latestGrounding.dispatchEligible, "Dispatch Boundary", "Critical");
    check("Android platform cannot grant Persistent Commit", namespace.getPlatformProfile().persistentCommitPermission === false, namespace.getPlatformProfile().persistentCommitPermission, "Cross-Device", "Critical");
    check("Android platform cannot bypass Approval", namespace.getPlatformProfile().approvalBypassAllowed === false, namespace.getPlatformProfile().approvalBypassAllowed, "Cross-Device", "Critical");

    const combined = preDevice.checks.concat(checks);
    const allPassed = combined.every(function every(item) { return item.passed; });
    const result = summarize(combined, "IDE-190-PHASE2-ANDROID-VALIDATION", "IDE-190 Phase 2 Android Real Device Gate PASS", "IDE-190 Phase 2 Android Real Device Gate FAIL", {
      stage: "B",
      stageName: "Phase 2 Android Real Device Validation",
      preDeviceValidationId: preDevice.id,
      preDevicePassed: preDevice.failed === 0 && preDevice.criticalFailed === 0,
      androidRealDeviceRequired: true,
      androidRealDevicePassed: allPassed,
      phaseGatePassed: allPassed,
      phase2Complete: allPassed,
      phase3Allowed: allPassed,
      releaseAllowed: false,
      ide190Complete: false,
      userAgent: userAgent
    });
    internal.markPhase2AndroidValidation(result);
    namespace.modules.phase2Validation.status = result.phaseGatePassed ? "Phase 2 Gate Passed" : "Blocked";
    return internal.clone(result);
  }

  function getDevelopmentAutomationPhase2ValidationStatus() {
    return {
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      preDevice: internal.clone(state.lastPhase2Validation),
      android: internal.clone(state.lastPhase2AndroidValidation),
      phaseGatePassed: state.androidPhase2ValidationPassed === true,
      phase2Complete: state.androidPhase2ValidationPassed === true,
      phase3Allowed: state.androidPhase2ValidationPassed === true,
      releaseAllowed: false,
      ide190Complete: false
    };
  }

  Object.assign(namespace.api, {
    runDevelopmentAutomationPhase2Validation: runDevelopmentAutomationPhase2Validation,
    runDevelopmentAutomationPhase2AndroidValidation: runDevelopmentAutomationPhase2AndroidValidation,
    getDevelopmentAutomationPhase2ValidationStatus: getDevelopmentAutomationPhase2ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase2Validation = {
    id: "IDE-190-PHASE2-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    phaseName: "IDE-180 Intake / Grounding",
    androidRealDeviceRequired: true,
    phaseGate: true,
    releaseGate: false,
    loadedAt: internal.nowIso()
  };

  global.runDevelopmentAutomationPhase2Validation = runDevelopmentAutomationPhase2Validation;
  global.runDevelopmentAutomationPhase2AndroidValidation = runDevelopmentAutomationPhase2AndroidValidation;
  global.getDevelopmentAutomationPhase2ValidationStatus = getDevelopmentAutomationPhase2ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
