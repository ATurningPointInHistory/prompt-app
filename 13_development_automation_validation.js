/* ============================================================
   FILE: 13_development_automation_validation.js
   IDE-190 Development Automation
   Release: 1.0.0 / Module: Validation 1.0.0
   Phase 1: Foundation / Contracts / Version Validation
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("validation");
  const EXPECTED_PHASE1_SCRIPT_FILES = [
    "13_development_automation_version_manifest.js",
    "13_development_automation_core.js",
    "13_development_automation_contracts.js",
    "13_development_automation_validation.js"
  ];

  function createCheckCollector() {
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : typeof detail === "string" ? detail : JSON.stringify(detail),
        group: group || "Foundation",
        severity: severity || "High"
      });
    }
    return { checks: checks, check: check };
  }

  function summarize(checks, idPrefix, statusPass, statusFail, extras) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(idPrefix),
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      criticalFailed: criticalFailed,
      status: failed === 0 ? statusPass : statusFail,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  function validFixtures() {
    return {
      foundation: namespace.buildFoundationSnapshot(),
      foundationState: namespace.buildFoundationStateSnapshot(),
      capabilityDescriptor: {
        capabilityId: "IDE-190-CAPABILITY-PHASE1-TEST",
        capabilityVersion: "1.0.0",
        ownerComponentId: "IDE-190",
        capabilityType: "Foundation Test",
        available: true,
        permissionClass: "Policy-Controlled",
        automationLevel: "L0",
        mutationLevel: "M0",
        executionMode: "E0",
        externalEffectLevel: "X0",
        operations: ["Describe"],
        source: "IDE-190 Phase 1 Validation",
        immutable: true
      },
      platformProfile: namespace.getPlatformProfile()
    };
  }

  function runDevelopmentAutomationPhase1Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const collector = createCheckCollector();
    const checks = collector.checks;
    const check = collector.check;

    const initialization = namespace.initialize({
      requireIDE180: settings.requireIDE180 !== false,
      requireIDE160: settings.requireIDE160 !== false
    });
    check("Foundation initialization succeeds", initialization.ok === true, initialization.code, "Initialization", "Critical");

    const status = namespace.getStatus();
    const dependency = namespace.getDependencyStatus();
    const safety = namespace.getSafetyStatus();
    const boundary = namespace.getPermissionBoundaryStatus();

    check("Component is IDE-190", status.componentId === "IDE-190", status.componentId, "Manifest", "Critical");
    check("Release Version is 1.0.0", status.version === "1.0.0", status.version, "Manifest", "Critical");
    check("Design Freeze identity is exact", status.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0", status.designFreezeId, "Manifest", "Critical");
    check("Architecture remains frozen", status.architectureStatus === "DESIGN COMPLETE / FROZEN", status.architectureStatus, "Manifest", "Critical");
    check("Implementation phase is 1", VERSION_MANIFEST.implementation.phase === 1, VERSION_MANIFEST.implementation.phase, "Manifest", "Critical");
    check("IDE-190 remains incomplete", status.ide190Complete === false, status.ide190Complete, "Release Gate", "Critical");
    check("Release remains blocked in Phase 1", status.releaseAllowed === false, status.releaseAllowed, "Release Gate", "Critical");

    check("IDE-180 Manifest is loaded", dependency.ide180ManifestLoaded === true, dependency.ide180ReleaseVersion, "IDE-180 Dependency", "Critical");
    check("IDE-180 runtime is loaded", dependency.ide180RuntimeLoaded === true, dependency.ide180RuntimeLoaded, "IDE-180 Dependency", "Critical");
    check("IDE-180 version is compatible", dependency.ide180VersionCompatible === true, dependency.ide180ReleaseVersion + " >= " + dependency.minimumIDE180Version, "IDE-180 Dependency", "Critical");
    check("IDE-180 handoff contract is compatible", dependency.ide180HandoffContractCompatible === true, dependency.ide180HandoffContractVersion, "IDE-180 Dependency", "Critical");
    check("IDE-180 handoff validation API is available", dependency.ide180HandoffValidationApiAvailable === true, dependency.ide180HandoffValidationApiAvailable, "IDE-180 Dependency", "Critical");
    check("IDE-180 latest handoff API is available", dependency.ide180LatestHandoffApiAvailable === true, dependency.ide180LatestHandoffApiAvailable, "IDE-180 Dependency", "High");
    check("IDE-180 package validation API is available", dependency.ide180PackageValidationApiAvailable === true, dependency.ide180PackageValidationApiAvailable, "IDE-180 Dependency", "Critical");

    check("IDE-160 runtime is loaded", dependency.ide160RuntimeLoaded === true, dependency.ide160ReleaseVersion, "IDE-160 Dependency", "Critical");
    check("IDE-160 version is compatible", dependency.ide160VersionCompatible === true, dependency.ide160ReleaseVersion + " >= " + dependency.minimumIDE160Version, "IDE-160 Dependency", "Critical");
    check("IDE-160 Adapter Registry API is available", dependency.ide160AdapterRegistryApiAvailable === true, dependency.ide160AdapterRegistryApiAvailable, "IDE-160 Dependency", "Critical");
    check("IDE-160 Adapter Invocation API is available", dependency.ide160AdapterInvocationApiAvailable === true, dependency.ide160AdapterInvocationApiAvailable, "IDE-160 Dependency", "Critical");
    check("IDE-160 Compatibility API is available", dependency.ide160CompatibilityApiAvailable === true, dependency.ide160CompatibilityApiAvailable, "IDE-160 Dependency", "High");
    check("IDE-150 Adapter is registered in IDE-160", dependency.ide150AdapterRegisteredInIDE160 === true, dependency.ide150AdapterRegisteredInIDE160, "IDE-160 Dependency", "Critical");
    check("IDE-150 Adapter is classified Controlled Mutation", dependency.ide150ControlledMutationAdapter === true, dependency.ide150ControlledMutationAdapter, "IDE-160 Dependency", "Critical");
    check("Phase 1 requires no direct IDE-150 dispatch", dependency.directIDE150DispatchRequiredByIDE190Phase1 === false, dependency.directIDE150DispatchRequiredByIDE190Phase1, "Mutation Boundary", "Critical");

    Object.keys(VERSION_MANIFEST.safety).forEach(function validateSafetyFlag(key) {
      check("Safety flag disabled: " + key, safety[key] === false, safety[key], "Safety", "Critical");
    });

    check("L5 Persistent Commit is prohibited", boundary.automationLevels.some(function find(item) { return item.id === "L5" && item.initialPolicy === "PROHIBITED"; }), "L5", "Permission", "Critical");
    check("P4 Persistent Commit Authorization is prohibited", boundary.approvalClasses.some(function find(item) { return item.id === "P4" && item.initialPolicy === "PROHIBITED"; }), "P4", "Permission", "Critical");
    check("M3 Persistent Repository Mutation is prohibited", boundary.mutationLevels.some(function find(item) { return item.id === "M3" && item.initialPolicy === "PROHIBITED"; }), "M3", "Permission", "Critical");
    check("E2 Persistent Commit Capability is prohibited", boundary.executionModes.some(function find(item) { return item.id === "E2" && item.initialPolicy === "PROHIBITED"; }), "E2", "Permission", "Critical");
    check("X2 Controlled External Side Effect is prohibited", boundary.externalEffectLevels.some(function find(item) { return item.id === "X2" && item.initialPolicy === "PROHIBITED"; }), "X2", "External Boundary", "Critical");
    check("X3 Automatic External Reflection is prohibited", boundary.externalEffectLevels.some(function find(item) { return item.id === "X3" && item.initialPolicy === "PROHIBITED"; }), "X3", "External Boundary", "Critical");
    check("Second Mutation Engine is prohibited", boundary.initialPolicy.secondMutationEngineAllowed === false, boundary.initialPolicy.secondMutationEngineAllowed, "Mutation Boundary", "Critical");
    check("IDE-180 bypass is prohibited", boundary.initialPolicy.ide180BypassAllowed === false, boundary.initialPolicy.ide180BypassAllowed, "Grounding Boundary", "Critical");
    check("Consent is not Approval", boundary.initialPolicy.consentIsApproval === false, boundary.initialPolicy.consentIsApproval, "Approval Boundary", "Critical");
    check("Human Approval cannot override Hard Deny", boundary.initialPolicy.humanApprovalOverridesHardDeny === false, boundary.initialPolicy.humanApprovalOverridesHardDeny, "Approval Boundary", "Critical");
    check("Concurrent Mutation limit is 1", boundary.initialPolicy.concurrentMutationLimit === 1, boundary.initialPolicy.concurrentMutationLimit, "Mutation Boundary", "Critical");

    check("Formal lifecycle is exact", JSON.stringify(VERSION_MANIFEST.lifecycle) === JSON.stringify(["Intake", "Ground", "Plan", "Propose", "Preflight", "Gate", "Dispatch", "Verify", "Close"]), VERSION_MANIFEST.lifecycle.join(" -> "), "Lifecycle", "Critical");
    check("Validation layer count is 9", VERSION_MANIFEST.validationLayers.length === 9, VERSION_MANIFEST.validationLayers.length, "Validation Model", "High");
    check("Outcome model contains Partial", VERSION_MANIFEST.outcomes.includes("Partial"), VERSION_MANIFEST.outcomes.join(","), "Failure Model", "High");
    check("Outcome model separates Timed-Out", VERSION_MANIFEST.outcomes.includes("Timed-Out"), VERSION_MANIFEST.outcomes.join(","), "Failure Model", "High");

    const contracts = namespace.listContractDefinitions();
    check("All Phase 1 contracts are registered", contracts.length === 4, contracts.length, "Contracts", "Critical");
    check("Contract IDs are unique", new Set(contracts.map(function map(item) { return item.contractId; })).size === contracts.length, contracts.length, "Contracts", "Critical");
    contracts.forEach(function validateDefinition(definition) {
      check("Contract version is 1.0.0: " + definition.key, definition.version === "1.0.0", definition.version, "Contracts", "High");
      check("Contract is read-only: " + definition.key, definition.readOnly === true, definition.readOnly, "Contracts", "Critical");
    });

    const fixtures = validFixtures();
    Object.keys(fixtures).forEach(function validateFixture(key) {
      const result = namespace.validateContract(key, fixtures[key]);
      check("Valid fixture passes: " + key, result.valid === true, "failed=" + result.failed, "Contracts", "Critical");
    });

    const prohibitedCapability = Object.assign({}, fixtures.capabilityDescriptor, {
      capabilityId: "IDE-190-CAPABILITY-PERSISTENT-COMMIT-TEST",
      automationLevel: "L5",
      mutationLevel: "M3",
      executionMode: "E2",
      permissionClass: "Controlled"
    });
    const prohibitedValidation = namespace.validateContract("capabilityDescriptor", prohibitedCapability);
    check("Persistent Commit capability cannot be described as Controlled", prohibitedValidation.valid === false, "failed=" + prohibitedValidation.failed, "Contracts", "Critical");

    const unsafePlatform = Object.assign({}, fixtures.platformProfile, { persistentCommitPermission: true });
    const unsafePlatformValidation = namespace.validateContract("platformProfile", unsafePlatform);
    check("Platform profile cannot grant Persistent Commit", unsafePlatformValidation.valid === false, "failed=" + unsafePlatformValidation.failed, "Contracts", "Critical");

    check("Core module is loaded", Boolean(namespace.modules.core), namespace.modules.core && namespace.modules.core.status, "Modules", "Critical");
    check("Contracts module is Ready", namespace.modules.contracts && namespace.modules.contracts.status === "Ready", namespace.modules.contracts && namespace.modules.contracts.status, "Modules", "Critical");
    check("Validation module is loaded", Boolean(namespace.modules.validation), namespace.modules.validation && namespace.modules.validation.status, "Modules", "Critical");
    check("Phase 1 does not implement Dispatch", namespace.getPublicApiDescription().dispatchImplemented === false, namespace.getPublicApiDescription().dispatchImplemented, "Scope", "Critical");
    check("Phase 1 does not implement Mutation", namespace.getPublicApiDescription().mutationImplemented === false, namespace.getPublicApiDescription().mutationImplemented, "Scope", "Critical");
    check("Phase 1 does not implement Persistence", namespace.getPublicApiDescription().persistenceImplemented === false, namespace.getPublicApiDescription().persistenceImplemented, "Scope", "High");

    const result = summarize(
      checks,
      "IDE-190-PHASE1-STAGE-A-VALIDATION",
      "IDE-190 Phase 1 Stage A Pre-Device Validation PASS",
      "IDE-190 Phase 1 Stage A Pre-Device Validation FAIL",
      {
        stage: "A",
        stageName: "Pre-Device / Pre-Android Validation",
        preDevicePassed: checks.every(function all(item) { return item.passed; }),
        androidRealDeviceRequired: true,
        androidRealDevicePassed: false,
        phaseGatePassed: false,
        phase2Allowed: false,
        releaseAllowed: false,
        ide190Complete: false
      }
    );

    internal.markPhase1PreDeviceValidation(result);
    namespace.modules.validation.status = result.failed === 0 ? "Pre-Device Ready" : "Blocked";
    return internal.clone(result);
  }

  function getLoadedScriptPaths() {
    if (!global.document || !global.document.scripts) return [];
    return Array.from(global.document.scripts).map(function mapScript(script) {
      const source = String(script && script.src || "");
      if (!source) return "";
      try {
        const url = new URL(source, global.document.baseURI);
        return url.pathname.split("/").pop() || "";
      } catch (_) {
        return source.split("?")[0].split("#")[0].split("/").pop() || "";
      }
    }).filter(Boolean);
  }

  async function runDevelopmentAutomationPhase1AndroidValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const preDevice = runDevelopmentAutomationPhase1Validation(settings);
    const collector = createCheckCollector();
    const checks = collector.checks;
    const check = collector.check;

    check("Stage A is PASS", preDevice.failed === 0 && preDevice.criticalFailed === 0, preDevice.status, "Stage A", "Critical");

    const userAgent = global.navigator && global.navigator.userAgent || "";
    check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Runtime", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"), Boolean(global.crypto && global.crypto.subtle), "Android Runtime", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android Runtime", "Critical");
    check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android Runtime", "Critical");
    check("Blob API is available", typeof global.Blob === "function", typeof global.Blob, "Android Runtime", "High");
    check("FileReader API is available", typeof global.FileReader === "function", typeof global.FileReader, "Android Runtime", "High");
    check("JSZip is available", Boolean(global.JSZip), Boolean(global.JSZip), "Android Runtime", "Critical");

    const platform = namespace.getPlatformProfile();
    check("Platform Profile is Android Web", platform.deviceClass === "Android", platform.profileId, "Cross-Device", "Critical");
    check("Platform Profile cannot grant Persistent Commit", platform.persistentCommitPermission === false, platform.persistentCommitPermission, "Cross-Device", "Critical");
    check("Platform Profile cannot grant GitHub automatic reflection", platform.githubAutomaticReflectionPermission === false, platform.githubAutomaticReflectionPermission, "Cross-Device", "Critical");
    check("Platform Profile cannot bypass Approval", platform.approvalBypassAllowed === false, platform.approvalBypassAllowed, "Cross-Device", "Critical");

    const loadedScripts = getLoadedScriptPaths();
    EXPECTED_PHASE1_SCRIPT_FILES.forEach(function validateLoadedScript(file) {
      check("Actual script loaded: " + file, loadedScripts.includes(file), loadedScripts.length, "Actual Script Loading", "Critical");
    });

    let manifestLoad = null;
    if (typeof global.loadStaticScriptManifest === "function") {
      try {
        manifestLoad = await global.loadStaticScriptManifest();
      } catch (error) {
        manifestLoad = { ok: false, errors: [error && error.message ? error.message : String(error)] };
      }
    }
    check("Static Manifest loader API is available", typeof global.loadStaticScriptManifest === "function", typeof global.loadStaticScriptManifest, "Static Integrity", "Critical");
    check("Static Manifest fetch/integrity succeeds", Boolean(manifestLoad && manifestLoad.ok === true), manifestLoad && manifestLoad.errors || [], "Static Integrity", "Critical");

    if (manifestLoad && manifestLoad.manifest) {
      const normalizedScripts = (manifestLoad.manifest.scripts || []).map(function normalize(src) {
        return String(src || "").split("?")[0].split("#")[0].replace(/^\.\//, "");
      });
      EXPECTED_PHASE1_SCRIPT_FILES.forEach(function validateManifestScript(file) {
        check("Static Manifest contains: " + file, normalizedScripts.includes(file), normalizedScripts.length, "Static Integrity", "Critical");
        const hash = manifestLoad.manifest.hashes && manifestLoad.manifest.hashes[file];
        check("Static Manifest has SHA-256: " + file, Boolean(hash && /^[a-f0-9]{64}$/.test(String(hash.sha256 || ""))), hash && hash.sha256, "Static Integrity", "Critical");
      });
    }

    const combinedChecks = preDevice.checks.concat(checks);
    const result = summarize(
      combinedChecks,
      "IDE-190-PHASE1-ANDROID-VALIDATION",
      "IDE-190 Phase 1 Android Real Device Gate PASS",
      "IDE-190 Phase 1 Android Real Device Gate FAIL",
      {
        stage: "B",
        stageName: "Android Real Device Validation",
        preDeviceValidationId: preDevice.id,
        preDevicePassed: preDevice.failed === 0 && preDevice.criticalFailed === 0,
        androidRealDeviceRequired: true,
        androidRealDevicePassed: combinedChecks.every(function all(item) { return item.passed; }),
        phaseGatePassed: combinedChecks.every(function all(item) { return item.passed; }),
        phase2Allowed: combinedChecks.every(function all(item) { return item.passed; }),
        releaseAllowed: false,
        ide190Complete: false,
        userAgent: userAgent
      }
    );

    internal.markPhase1AndroidValidation(result);
    namespace.modules.validation.status = result.phaseGatePassed ? "Phase 1 Gate Passed" : "Blocked";
    return internal.clone(result);
  }

  function getDevelopmentAutomationPhase1ValidationStatus() {
    return {
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      preDevice: internal.clone(state.lastPreDeviceValidation),
      android: internal.clone(state.lastAndroidValidation),
      phaseGatePassed: state.androidPhase1ValidationPassed === true,
      phase2Allowed: state.androidPhase1ValidationPassed === true,
      releaseAllowed: false,
      ide190Complete: false
    };
  }

  Object.assign(namespace.api, {
    runDevelopmentAutomationPhase1Validation: runDevelopmentAutomationPhase1Validation,
    runDevelopmentAutomationPhase1AndroidValidation: runDevelopmentAutomationPhase1AndroidValidation,
    getDevelopmentAutomationPhase1ValidationStatus: getDevelopmentAutomationPhase1ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.validation = {
    id: "IDE-190-PHASE1-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    phaseName: "Foundation / Contracts / Version",
    stageA: "Pre-Device / Pre-Android Validation",
    stageB: "Android Real Device Validation",
    androidRealDeviceRequired: true,
    releaseGate: false,
    phaseGate: true,
    loadedAt: internal.nowIso()
  };

  global.runDevelopmentAutomationPhase1Validation = runDevelopmentAutomationPhase1Validation;
  global.runDevelopmentAutomationPhase1AndroidValidation = runDevelopmentAutomationPhase1AndroidValidation;
  global.getDevelopmentAutomationPhase1ValidationStatus = getDevelopmentAutomationPhase1ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
