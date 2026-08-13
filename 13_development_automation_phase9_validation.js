/* ============================================================
   FILE: 13_development_automation_phase9_validation.js
   IDE-190 Development Automation
   Release: 1.8.0
   Phase 9: UI / Reflection Package / Cross-Device Validation
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Phase 9 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase9Validation");
  const PHASE9_FILES = [
    "13_development_automation_cross_device.js",
    "13_development_automation_reflection.js",
    "13_development_automation_ui.js",
    "13_development_automation_phase9_validation.js"
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

  function finish(checks, stage, stageName, extras) {
    const passed = checks.filter(function yes(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function bad(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(stage === "B" ? "IDE-190-PHASE9-ANDROID-VALIDATION" : "IDE-190-PHASE9-STAGE-A-VALIDATION"),
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "IDE-190 Phase 9 " + stageName + " PASS" : "IDE-190 Phase 9 " + stageName + " FAIL",
      checks: checks,
      validatedAt: internal.nowIso(),
      stage: stage,
      stageName: stageName
    }, extras || {});
  }

  function actualLoadedScriptCount() {
    if (!global.document || typeof global.document.querySelectorAll !== "function") return 0;
    return Array.from(global.document.querySelectorAll('script[src]')).filter(function local(script) {
      const src = String(script.getAttribute("src") || "");
      return src.indexOf("./") === 0 || (!/^https?:/i.test(src) && src.indexOf("//") !== 0);
    }).length;
  }

  function uiSourceBoundary() {
    const candidates = [
      namespace.openDevelopmentAutomationConsole,
      namespace.ensureDevelopmentAutomationConsole,
      namespace.getDevelopmentAutomationUIProjection
    ].filter(function fn(value) { return typeof value === "function"; }).map(function source(fn) { return Function.prototype.toString.call(fn); }).join("\n");
    const forbidden = [
      "grantAutomationApproval(",
      "dispatchAutomationFromGate(",
      "executeAutomationControlledMutationTrial(",
      "executeControlledAutoRefactoringApplication(",
      "approveControlledAutoRefactoringApplication("
    ].filter(function found(token) { return candidates.indexOf(token) >= 0; });
    return { clean: forbidden.length === 0, forbidden: forbidden };
  }

  async function runDevelopmentAutomationPhase9Validation() {
    const c = collector();
    const check = c.check;
    const init = typeof namespace.initialize === "function" ? namespace.initialize() : null;
    check("Foundation initialization succeeds", init && init.ok === true, init && init.code, "Initialization", "Critical");
    check("Release Version is 1.8.0", VERSION_MANIFEST.release.version === "1.8.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 9", VERSION_MANIFEST.release.phase === 9, VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains exact", VERSION_MANIFEST.release.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Manifest", "Critical");
    check("Phases 1 through 8 are recorded complete", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6,7,8]), VERSION_MANIFEST.implementation.completedPhases.join(","), "Phase Gate", "Critical");
    check("Phase 8 completion is recorded in Phase 9 release", VERSION_MANIFEST.implementation.completedPhases.includes(8) && VERSION_MANIFEST.implementation.phase === 9, JSON.stringify({ completedPhases: VERSION_MANIFEST.implementation.completedPhases, priorRuntimeGateState: state.androidPhase8ValidationPassed === true }), "Phase Gate", "Critical");

    Object.keys(VERSION_MANIFEST.safety).forEach(function safety(key) { check("Safety flag remains disabled: " + key, VERSION_MANIFEST.safety[key] === false, VERSION_MANIFEST.safety[key], "Safety", "Critical"); });
    check("Persistent Commit remains prohibited", VERSION_MANIFEST.initialPolicy.persistentCommitAllowed === false, VERSION_MANIFEST.initialPolicy.persistentCommitAllowed, "Safety", "Critical");
    check("X1 user-mediated reflection preparation remains allowed", VERSION_MANIFEST.externalEffectLevels.some(function find(x) { return x.id === "X1" && x.initialPolicy === "Allowed"; }), "X1", "External Boundary", "Critical");
    check("X2/X3 external effects remain prohibited", VERSION_MANIFEST.externalEffectLevels.filter(function filter(x) { return x.id === "X2" || x.id === "X3"; }).every(function deny(x) { return x.initialPolicy === "PROHIBITED"; }), "X2/X3", "External Boundary", "Critical");

    const contracts = typeof namespace.listContractDefinitions === "function" ? namespace.listContractDefinitions() : [];
    check("All Phase 1-9 contracts are registered", contracts.length === 28, contracts.length, "Contracts", "Critical");
    ["reflectionPackage","crossDeviceRecord"].forEach(function contract(key) {
      const definition = namespace.getContractDefinition(key);
      check("Phase 9 contract exists: " + key, Boolean(definition && definition.version === "1.0.0"), definition && definition.version, "Contracts", "Critical");
    });

    ["crossDevice","reflection","ui","phase9Validation"].forEach(function module(key) {
      const status = namespace.modules[key] && namespace.modules[key].status;
      const ready = key === "ui" ? (status === "Ready" || status === "Headless Ready") : status === "Ready";
      check("Module is Ready: " + key, ready, status, "Modules", "Critical");
    });

    const api = namespace.getPublicApiDescription();
    check("Responsive Safe UI is implemented", api.uiImplemented === true, api.uiImplemented, "Scope", "Critical");
    check("Reflection Package is implemented", api.reflectionPackageImplemented === true, api.reflectionPackageImplemented, "Scope", "Critical");
    check("Cross-Device parity is implemented", api.crossDeviceImplemented === true, api.crossDeviceImplemented, "Scope", "Critical");
    check("Persistent Mutation is still not implemented", api.persistentMutationImplemented === false, api.persistentMutationImplemented, "Scope", "Critical");

    const cross = namespace.validateAutomationCrossDeviceParity();
    check("Cross-Device sensitive permission parity verifies", cross && cross.ok === true && cross.data && cross.data.record && cross.data.record.parityVerified === true, cross && cross.code, "Cross-Device", "Critical");
    const matrix = namespace.getAutomationCrossDevicePolicyMatrix();
    const androidPolicy = matrix.profiles.find(function find(x) { return x.deviceClass === "Android"; });
    const webPolicy = matrix.profiles.find(function find(x) { return x.deviceClass === "Web"; });
    check("Android and Web have identical Sensitive Permissions", JSON.stringify(androidPolicy.sensitivePermissions) === JSON.stringify(webPolicy.sensitivePermissions), JSON.stringify(androidPolicy.sensitivePermissions), "Cross-Device", "Critical");
    check("PC cannot escalate permission", matrix.pcPermissionEscalationAllowed === false, matrix.pcPermissionEscalationAllowed, "Cross-Device", "Critical");
    check("Android cannot escalate permission", matrix.androidPermissionEscalationAllowed === false, matrix.androidPermissionEscalationAllowed, "Cross-Device", "Critical");
    check("Display mode never changes permission", matrix.displayModeChangesPermission === false, matrix.displayModeChangesPermission, "Cross-Device", "Critical");

    const projection = namespace.getDevelopmentAutomationUIProjection();
    check("UI exposes status/receipt/reflection without execution controls", projection.uiCapabilities.statusRead === true && projection.uiCapabilities.receiptRead === true && projection.uiCapabilities.reflectionPreparation === true && projection.uiCapabilities.approvalAction === false && projection.uiCapabilities.dispatchAction === false && projection.uiCapabilities.mutationAction === false, JSON.stringify(projection.uiCapabilities), "UI", "Critical");
    check("UI exposes no Repository or GitHub write action", projection.uiCapabilities.repositoryWriteAction === false && projection.uiCapabilities.githubWriteAction === false && projection.uiCapabilities.automaticReflectionAction === false, JSON.stringify(projection.uiCapabilities), "UI", "Critical");
    check("UI display mode changes no permission", projection.permissionChangesFromDisplayMode === false, projection.permissionChangesFromDisplayMode, "UI", "Critical");
    const sourceBoundary = uiSourceBoundary();
    check("UI source contains no Approval/Dispatch/Mutation execution call", sourceBoundary.clean === true, sourceBoundary.forbidden.join(","), "UI Boundary", "Critical");
    check("Existing ZIP Paste Manager remains user-invoked only", typeof global.openZipPasteManager === "function" && projection.uiCapabilities.openExistingManualPasteManager === true, typeof global.openZipPasteManager, "Reflection Tools", "Critical");
    check("Existing Diff ZIP Manager remains user-invoked only", typeof global.openZipDiffManager === "function" && projection.uiCapabilities.openExistingDiffManager === true, typeof global.openZipDiffManager, "Reflection Tools", "Critical");

    const missing = await namespace.prepareAutomationReflectionPackage({ filePaths: [], actorRole: "Project Owner" });
    check("Reflection Package never infers missing file selection", missing && missing.ok === false && missing.code === "IDE190_REFLECTION_EXPLICIT_FILES_REQUIRED", missing && missing.code, "No Inference", "Critical");
    const nonOwner = await namespace.prepareAutomationReflectionPackage({ filePaths: ["13_development_automation_reflection.js"], actorRole: "Operator" });
    check("Reflection Package preparation requires Project Owner", nonOwner && nonOwner.ok === false && nonOwner.code === "IDE190_REFLECTION_PROJECT_OWNER_REQUIRED", nonOwner && nonOwner.code, "Reflection", "Critical");

    const prepared = await namespace.prepareAutomationReflectionPackage({ filePaths: ["13_development_automation_reflection.js", "13_development_automation_cross_device.js"], actorRole: "Project Owner" });
    const pkg = prepared && prepared.data && prepared.data.package;
    check("Explicit Reflection Package prepares", prepared && prepared.ok === true, prepared && prepared.code, "Reflection", "Critical");
    check("Reflection Package is X1 user-mediated only", pkg && pkg.externalEffectLevel === "X1" && pkg.userMediated === true && pkg.automaticReflection === false, pkg && pkg.externalEffectLevel, "Reflection", "Critical");
    check("Reflection Package performs no GitHub or Repository write", pkg && pkg.githubWrite === false && pkg.repositoryWriteCount === 0 && pkg.persistentCommit === false, pkg && pkg.repositoryWriteCount, "Reflection", "Critical");
    check("Reflection selection remains explicit-only", pkg && pkg.sourceSelectionMode === "explicit-only" && pkg.automaticFileSelection === false && pkg.fileCount === 2, pkg && pkg.fileCount, "Reflection", "Critical");
    check("Reflection descriptor contains no Source payload", pkg && pkg.sourcePayloadInDescriptor === false && pkg.transientPayloadPersisted === false && !Object.prototype.hasOwnProperty.call(pkg, "sourcePayload"), pkg && pkg.sourcePayloadInDescriptor, "Selective Payload", "Critical");
    check("Reflection files carry SHA-256 identities", pkg && pkg.files.every(function each(file) { return /^[a-f0-9]{64}$/.test(file.sha256) && file.byteSize > 0; }), pkg && JSON.stringify(pkg.files), "Integrity", "Critical");
    check("Reflection Package Contract validates", prepared && prepared.data && prepared.data.validation && prepared.data.validation.valid === true, prepared && prepared.data && prepared.data.validation && prepared.data.validation.status, "Contracts", "Critical");
    const reflectionStatus = namespace.getAutomationReflectionStatus();
    check("Reflection preparation does not trigger download", prepared && prepared.data && prepared.data.downloadTriggered === false, prepared && prepared.data && prepared.data.downloadTriggered, "External Boundary", "Critical");
    check("Reflection status keeps automatic reflection disabled", reflectionStatus.githubWrite === false && reflectionStatus.automaticReflection === false && reflectionStatus.repositoryWriteCount === 0 && reflectionStatus.persistentCommit === false, JSON.stringify(reflectionStatus), "External Boundary", "Critical");
    check("Reflection ZIP build API is available but not auto-run", typeof namespace.buildAutomationReflectionZip === "function" && typeof namespace.downloadAutomationReflectionPackage === "function", typeof namespace.buildAutomationReflectionZip, "Reflection", "Critical");

    check("Repository remains Trusted", state.repositoryMutationTrust && state.repositoryMutationTrust.status === "Trusted", state.repositoryMutationTrust && state.repositoryMutationTrust.status, "Repository Trust", "Critical");
    check("Mutation Lock remains released", Boolean(state.mutationTrialLock && state.mutationTrialLock.active) === false, state.mutationTrialLock && state.mutationTrialLock.active, "Mutation Lock", "Critical");

    const result = finish(c.checks, "A", "Stage A UI / Reflection Package / Cross-Device", {
      phase9Complete: false,
      phase10Allowed: false,
      androidRealDeviceRequired: true,
      androidRealDevicePassed: false,
      releaseAllowed: false,
      ide190Complete: false,
      latestReflectionPackageId: pkg && pkg.reflectionPackageId || null,
      repositoryTrustStatus: state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted",
      mutationLockActive: Boolean(state.mutationTrialLock && state.mutationTrialLock.active)
    });
    internal.markPhase9Validation(result);
    return result;
  }

  async function runDevelopmentAutomationPhase9AndroidValidation() {
    const c = collector();
    const check = c.check;
    const pre = await runDevelopmentAutomationPhase9Validation();
    check("Phase 9 Stage A is PASS", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Stage A", "Critical");
    const userAgent = String(global.navigator && global.navigator.userAgent || "");
    check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Runtime", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"), Boolean(global.crypto && global.crypto.subtle), "Android Runtime", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android Runtime", "Critical");
    check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android Runtime", "Critical");
    check("JSZip is available for explicit Reflection ZIP generation", typeof global.JSZip === "function", typeof global.JSZip, "Android Runtime", "Critical");

    PHASE9_FILES.forEach(function loaded(file) {
      const scripts = global.document ? Array.from(global.document.querySelectorAll('script[src]')) : [];
      const found = scripts.some(function match(script) { return String(script.getAttribute("src") || "").indexOf("./" + file) === 0; });
      check("Actual script loaded: " + file, found, actualLoadedScriptCount(), "Actual Script Loading", "Critical");
    });

    let staticLoad = null;
    if (typeof global.loadStaticScriptManifest === "function") staticLoad = await global.loadStaticScriptManifest();
    check("Static Manifest fetch/integrity succeeds", staticLoad && staticLoad.ok === true, staticLoad && staticLoad.errors && staticLoad.errors.join(","), "Static Integrity", "Critical");
    const manifest = staticLoad && staticLoad.manifest || null;
    check("Static Manifest contains exactly 225 scripts", manifest && Array.isArray(manifest.scripts) && manifest.scripts.length === 225, manifest && manifest.scripts && manifest.scripts.length, "Static Integrity", "Critical");
    PHASE9_FILES.forEach(function manifestFile(file) {
      const entry = manifest && manifest.hashes && manifest.hashes[file];
      check("Static Manifest has SHA-256: " + file, Boolean(entry && /^[a-f0-9]{64}$/.test(String(entry.sha256 || ""))), entry && entry.sha256, "Static Integrity", "Critical");
    });

    const androidCross = namespace.validateAutomationCrossDeviceParity();
    check("Android Cross-Device parity is verified", androidCross && androidCross.ok === true && androidCross.data && androidCross.data.currentDeviceClass === "Android", androidCross && androidCross.code, "Cross-Device", "Critical");
    const profile = namespace.getPlatformProfile();
    check("Android cannot gain Persistent Commit", profile.persistentCommitPermission === false, profile.persistentCommitPermission, "Cross-Device", "Critical");
    check("Android cannot gain GitHub automatic reflection", profile.githubAutomaticReflectionPermission === false, profile.githubAutomaticReflectionPermission, "Cross-Device", "Critical");
    check("Android cannot bypass Approval", profile.approvalBypassAllowed === false, profile.approvalBypassAllowed, "Cross-Device", "Critical");

    const prepared = await namespace.prepareAutomationReflectionPackage({ filePaths: ["13_development_automation_ui.js"], actorRole: "Project Owner" });
    const pkg = prepared && prepared.data && prepared.data.package;
    check("Android prepares explicit X1 Reflection Package", prepared && prepared.ok === true && pkg && pkg.externalEffectLevel === "X1", prepared && prepared.code, "Reflection", "Critical");
    const zip = pkg ? await namespace.buildAutomationReflectionZip(pkg.reflectionPackageId) : null;
    check("Android can build Reflection ZIP without triggering download", zip && zip.ok === true && zip.data && zip.data.byteLength > 0 && zip.data.downloadTriggered === false, zip && zip.code, "Reflection", "Critical");
    check("Reflection ZIP build causes zero Repository writes", pkg && pkg.repositoryWriteCount === 0 && pkg.persistentCommit === false, pkg && pkg.repositoryWriteCount, "Reflection", "Critical");
    check("Reflection remains user-mediated after ZIP build", pkg && pkg.userMediated === true && pkg.automaticReflection === false && pkg.githubWrite === false, pkg && pkg.userMediated, "Reflection", "Critical");

    const projection = namespace.getDevelopmentAutomationUIProjection();
    check("Android responsive UI has no execution permission", projection.uiCapabilities.approvalAction === false && projection.uiCapabilities.dispatchAction === false && projection.uiCapabilities.mutationAction === false && projection.uiCapabilities.repositoryWriteAction === false, JSON.stringify(projection.uiCapabilities), "UI", "Critical");
    check("Android can access existing manual ZIP Paste Manager", projection.uiCapabilities.openExistingManualPasteManager === true, projection.uiCapabilities.openExistingManualPasteManager, "Reflection Tools", "Critical");
    check("Android can access existing manual Diff ZIP Manager", projection.uiCapabilities.openExistingDiffManager === true, projection.uiCapabilities.openExistingDiffManager, "Reflection Tools", "Critical");
    check("Android UI display mode cannot change permission", projection.permissionChangesFromDisplayMode === false, projection.permissionChangesFromDisplayMode, "UI", "Critical");
    check("Repository remains Trusted", state.repositoryMutationTrust && state.repositoryMutationTrust.status === "Trusted", state.repositoryMutationTrust && state.repositoryMutationTrust.status, "Repository Trust", "Critical");
    check("Mutation Lock remains released", Boolean(state.mutationTrialLock && state.mutationTrialLock.active) === false, state.mutationTrialLock && state.mutationTrialLock.active, "Mutation Lock", "Critical");

    const phaseGatePassed = c.checks.every(function all(item) { return item.passed; });
    const result = finish(c.checks, "B", "Android Real Device UI / Reflection / Cross-Device Validation", {
      preDeviceValidationId: pre.id,
      preDevicePassed: pre.failed === 0 && pre.criticalFailed === 0,
      androidRealDeviceRequired: true,
      androidRealDevicePassed: phaseGatePassed,
      phaseGatePassed: phaseGatePassed,
      phase9Complete: phaseGatePassed,
      phase10Allowed: phaseGatePassed,
      releaseAllowed: false,
      ide190Complete: false,
      repositoryTrustStatus: state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted",
      mutationLockActive: Boolean(state.mutationTrialLock && state.mutationTrialLock.active),
      userAgent: userAgent
    });
    internal.markPhase9AndroidValidation(result);
    return result;
  }

  function initializePhase9Validation() {
    namespace.modules.phase9Validation.status = "Ready";
    return internal.buildResult(true, "IDE190_PHASE9_VALIDATION_INITIALIZED", "Ready", { androidReleaseAuthority: true, phase10AllowedBeforeAndroidGate: false });
  }

  Object.assign(namespace.api, {
    initializePhase9Validation: initializePhase9Validation,
    runDevelopmentAutomationPhase9Validation: runDevelopmentAutomationPhase9Validation,
    runDevelopmentAutomationPhase9AndroidValidation: runDevelopmentAutomationPhase9AndroidValidation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase9Validation = {
    id: "IDE-190-PHASE9-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    androidReleaseAuthority: true,
    loadedAt: internal.nowIso()
  };

  global.runDevelopmentAutomationPhase9Validation = runDevelopmentAutomationPhase9Validation;
  global.runDevelopmentAutomationPhase9AndroidValidation = runDevelopmentAutomationPhase9AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
