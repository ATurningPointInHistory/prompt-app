/* ============================================================
   FILE: 13_development_automation_core.js
   IDE-190 Development Automation
   Release: 1.1.0 / Module: Core 1.1.0
   Phase 2: IDE-180 Intake / Grounding
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("IDE-190 core blocked: Version Manifest is not loaded.");
    return;
  }

  const COMPONENT_ID = "IDE-190";
  const COMPONENT_NAME = "Development Automation";
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("core");
  const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

  function nowIso() {
    return new Date().toISOString();
  }

  function text(value, fallback) {
    if (value == null) return fallback == null ? "" : String(fallback);
    const normalized = String(value).trim();
    return normalized || (fallback == null ? "" : String(fallback));
  }

  function isPlainObject(value) {
    if (!value || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_) {
        // Fall through for functions and frozen contracts.
      }
    }
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Map) {
      const output = new Map();
      value.forEach(function copyMapItem(item, key) { output.set(key, clone(item)); });
      return output;
    }
    if (value instanceof Set) {
      const output = new Set();
      value.forEach(function copySetItem(item) { output.add(clone(item)); });
      return output;
    }
    if (isPlainObject(value)) {
      const output = {};
      Object.keys(value).forEach(function copyKey(key) { output[key] = clone(value[key]); });
      return output;
    }
    return value;
  }

  function deepFreeze(value, seen) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    if (value instanceof Map) {
      value.forEach(function freezeMapValue(item) { deepFreeze(item, visited); });
      return Object.freeze(value);
    }
    if (value instanceof Set) {
      value.forEach(function freezeSetValue(item) { deepFreeze(item, visited); });
      return Object.freeze(value);
    }
    Object.keys(value).forEach(function freezeChild(key) { deepFreeze(value[key], visited); });
    return Object.freeze(value);
  }

  function unique(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(function normalize(value) {
      return text(value, "");
    }).filter(Boolean)));
  }

  function parseSemver(value) {
    const normalized = text(value, "");
    if (!SEMVER_PATTERN.test(normalized)) return null;
    return normalized.split(".").map(function toNumber(part) { return Number(part); });
  }

  function compareSemver(left, right) {
    const a = parseSemver(left);
    const b = parseSemver(right);
    if (!a || !b) return null;
    for (let index = 0; index < 3; index += 1) {
      if (a[index] > b[index]) return 1;
      if (a[index] < b[index]) return -1;
    }
    return 0;
  }

  const namespace = global.IDE190DevelopmentAutomation && typeof global.IDE190DevelopmentAutomation === "object"
    ? global.IDE190DevelopmentAutomation
    : {};
  const internal = namespace.__internal && typeof namespace.__internal === "object"
    ? namespace.__internal
    : {};
  const state = internal.state && typeof internal.state === "object"
    ? internal.state
    : {
        contracts: new Map(),
        initialized: false,
        initializing: false,
        sequence: 0,
        lastPreDeviceValidation: null,
        lastAndroidValidation: null,
        androidPhase1ValidationPassed: false,
        intakes: new Map(),
        intakeSources: new Map(),
        latestIntakeId: null,
        groundings: new Map(),
        latestGroundingId: null,
        lastPhase2Validation: null,
        lastPhase2AndroidValidation: null,
        androidPhase2ValidationPassed: false,
        lastError: null,
        updatedAt: null
      };

  if (!(state.contracts instanceof Map)) state.contracts = new Map();
  if (!(state.intakes instanceof Map)) state.intakes = new Map();
  if (!(state.intakeSources instanceof Map)) state.intakeSources = new Map();
  if (!(state.groundings instanceof Map)) state.groundings = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestIntakeId")) state.latestIntakeId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestGroundingId")) state.latestGroundingId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase2Validation")) state.lastPhase2Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase2AndroidValidation")) state.lastPhase2AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase2ValidationPassed")) state.androidPhase2ValidationPassed = false;

  function touch() {
    state.updatedAt = nowIso();
  }

  function nextId(prefix) {
    state.sequence += 1;
    return text(prefix, COMPONENT_ID) + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }

  function buildResult(ok, code, status, data, extras) {
    const result = {
      ok: ok === true,
      code: text(code, ok === true ? "OK" : "ERROR"),
      status: text(status, ok === true ? "Ready" : "Blocked"),
      componentId: COMPONENT_ID,
      version: RELEASE_VERSION,
      data: data == null ? null : clone(data),
      createdAt: nowIso()
    };
    if (extras && typeof extras === "object") {
      Object.keys(extras).forEach(function addExtra(key) { result[key] = clone(extras[key]); });
    }
    return result;
  }

  function getIDE160Api() {
    const ide160 = global.AIPromptOSIDE160;
    return ide160 && ide160.api && typeof ide160.api === "object" ? ide160.api : null;
  }

  function getIDE180Api() {
    const ide180 = global.IDE180KnowledgeNavigator;
    return ide180 && ide180.api && typeof ide180.api === "object" ? ide180.api : null;
  }

  function getDependencyStatus() {
    const ide180Manifest = global.IDE180VersionManifest || null;
    const ide180 = global.IDE180KnowledgeNavigator || null;
    const ide180Api = getIDE180Api();
    const ide160 = global.AIPromptOSIDE160 || null;
    const ide160Api = getIDE160Api();

    const minimumIDE180Version = VERSION_MANIFEST.compatibility.minimumIDE180Version;
    const ide180Version = ide180Manifest && ide180Manifest.release && ide180Manifest.release.version || null;
    const ide180Comparison = ide180Version ? compareSemver(ide180Version, minimumIDE180Version) : null;
    const ide180HandoffContractVersion = ide180Manifest && typeof ide180Manifest.getContractVersion === "function"
      ? ide180Manifest.getContractVersion("ide190Handoff")
      : null;
    const requiredIDE180HandoffContractVersion = VERSION_MANIFEST.compatibility.requiredIDE180HandoffContractVersion;

    const minimumIDE160Version = VERSION_MANIFEST.compatibility.minimumIDE160Version;
    const ide160Version = ide160 && ide160.version || null;
    const ide160Comparison = ide160Version ? compareSemver(ide160Version, minimumIDE160Version) : null;

    let ide150Adapter = null;
    if (ide160Api && typeof ide160Api.listIDE160ComponentAdapters === "function") {
      try {
        const matches = ide160Api.listIDE160ComponentAdapters({ componentId: "IDE-150" });
        ide150Adapter = Array.isArray(matches) && matches.length ? matches[0] : null;
      } catch (_) {
        ide150Adapter = null;
      }
    }

    return {
      ide180ManifestLoaded: Boolean(ide180Manifest),
      ide180RuntimeLoaded: Boolean(ide180),
      ide180ReleaseVersion: ide180Version,
      minimumIDE180Version: minimumIDE180Version,
      ide180VersionCompatible: ide180Comparison != null && ide180Comparison >= 0,
      ide180HandoffContractVersion: ide180HandoffContractVersion,
      requiredIDE180HandoffContractVersion: requiredIDE180HandoffContractVersion,
      ide180HandoffContractCompatible: ide180HandoffContractVersion === requiredIDE180HandoffContractVersion,
      ide180HandoffValidationApiAvailable: Boolean(ide180Api && typeof ide180Api.validateIDE190HandoffContract === "function"),
      ide180LatestHandoffApiAvailable: Boolean(ide180Api && typeof ide180Api.getLatestIDE190Handoff === "function"),
      ide180LatestPackageApiAvailable: Boolean(ide180Api && typeof ide180Api.getLatestKnowledgeNavigatorPackage === "function"),
      ide180PackageValidationApiAvailable: Boolean(ide180Api && typeof ide180Api.validateKnowledgeNavigatorPackage === "function"),
      ide160RuntimeLoaded: Boolean(ide160),
      ide160ReleaseVersion: ide160Version,
      minimumIDE160Version: minimumIDE160Version,
      ide160VersionCompatible: ide160Comparison != null && ide160Comparison >= 0,
      ide160AdapterRegistryApiAvailable: Boolean(ide160Api && typeof ide160Api.listIDE160ComponentAdapters === "function"),
      ide160AdapterInvocationApiAvailable: Boolean(ide160Api && typeof ide160Api.invokeIDE160ComponentAdapter === "function"),
      ide160CompatibilityApiAvailable: Boolean(ide160Api && typeof ide160Api.checkIDE160ComponentCompatibility === "function"),
      ide150AdapterRegisteredInIDE160: Boolean(ide150Adapter && ide150Adapter.componentId === "IDE-150"),
      ide150ControlledMutationAdapter: Boolean(ide150Adapter && ide150Adapter.controlledMutation === true),
      directIDE150DispatchRequiredByIDE190Phase1: false
    };
  }

  function getSafetyStatus() {
    return clone(VERSION_MANIFEST.safety);
  }

  function getPermissionBoundaryStatus() {
    return {
      automationLevels: clone(VERSION_MANIFEST.automationLevels),
      approvalClasses: clone(VERSION_MANIFEST.approvalClasses),
      mutationLevels: clone(VERSION_MANIFEST.mutationLevels),
      executionModes: clone(VERSION_MANIFEST.executionModes),
      externalEffectLevels: clone(VERSION_MANIFEST.externalEffectLevels),
      initialPolicy: clone(VERSION_MANIFEST.initialPolicy)
    };
  }

  function detectPlatformProfile() {
    const navigatorObject = global.navigator || {};
    const userAgent = text(navigatorObject.userAgent, "");
    const android = /Android/i.test(userAgent);
    const coarsePointer = typeof global.matchMedia === "function"
      ? Boolean(global.matchMedia("(pointer: coarse)").matches)
      : null;
    const width = global.screen && Number.isFinite(global.screen.width) ? global.screen.width : null;
    const height = global.screen && Number.isFinite(global.screen.height) ? global.screen.height : null;

    return {
      profileId: android ? "IDE-190-PROFILE-ANDROID-WEB" : "IDE-190-PROFILE-COMMON-WEB",
      runtime: VERSION_MANIFEST.commonRuntimeBoundary.runtime,
      deviceClass: android ? "Android" : "Web",
      userAgent: userAgent,
      screen: { width: width, height: height },
      input: { coarsePointer: coarsePointer, touchPoints: Number(navigatorObject.maxTouchPoints || 0) },
      capabilities: {
        webCrypto: Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"),
        indexedDB: Boolean(global.indexedDB),
        fetch: typeof global.fetch === "function",
        blob: typeof global.Blob === "function",
        fileReader: typeof global.FileReader === "function",
        jsZip: Boolean(global.JSZip)
      },
      permissionIndependent: true,
      persistentCommitPermission: false,
      githubAutomaticReflectionPermission: false,
      approvalBypassAllowed: false
    };
  }

  function buildFoundationSnapshot() {
    return {
      componentId: COMPONENT_ID,
      componentName: COMPONENT_NAME,
      releaseVersion: RELEASE_VERSION,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      architectureStatus: VERSION_MANIFEST.release.architectureStatus,
      mission: VERSION_MANIFEST.mission,
      lifecycle: clone(VERSION_MANIFEST.lifecycle),
      automationLevels: clone(VERSION_MANIFEST.automationLevels),
      approvalClasses: clone(VERSION_MANIFEST.approvalClasses),
      mutationLevels: clone(VERSION_MANIFEST.mutationLevels),
      executionModes: clone(VERSION_MANIFEST.executionModes),
      validationLayers: clone(VERSION_MANIFEST.validationLayers),
      externalEffectLevels: clone(VERSION_MANIFEST.externalEffectLevels),
      safetyDefaults: getSafetyStatus(),
      commonRuntime: clone(VERSION_MANIFEST.commonRuntimeBoundary)
    };
  }

  function buildFoundationStateSnapshot() {
    return {
      initialized: state.initialized === true,
      currentPhase: VERSION_MANIFEST.implementation.phase,
      releaseAllowed: false,
      ide190Complete: false,
      phase2Allowed: VERSION_MANIFEST.implementation.phase >= 2,
      phase3Allowed: state.androidPhase2ValidationPassed === true,
      lastPreDeviceValidation: clone(state.lastPreDeviceValidation),
      lastAndroidValidation: clone(state.lastAndroidValidation),
      lastPhase2Validation: clone(state.lastPhase2Validation),
      lastPhase2AndroidValidation: clone(state.lastPhase2AndroidValidation)
    };
  }

  function getStatus() {
    const modules = {};
    Object.keys(namespace.modules || {}).forEach(function mapModule(key) {
      modules[key] = namespace.modules[key] && namespace.modules[key].status || "Unknown";
    });
    return {
      componentId: COMPONENT_ID,
      componentName: COMPONENT_NAME,
      version: RELEASE_VERSION,
      moduleVersion: MODULE_VERSION,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      architectureStatus: VERSION_MANIFEST.release.architectureStatus,
      initialized: state.initialized === true,
      contractCount: state.contracts.size,
      commonRuntime: VERSION_MANIFEST.commonRuntimeBoundary.runtime,
      safety: getSafetyStatus(),
      initialPolicy: clone(VERSION_MANIFEST.initialPolicy),
      dependency: getDependencyStatus(),
      platformProfile: detectPlatformProfile(),
      modules: modules,
      ide190Complete: false,
      releaseAllowed: false,
      phase2Allowed: VERSION_MANIFEST.implementation.phase >= 2,
      phase3Allowed: state.androidPhase2ValidationPassed === true,
      androidPhase1ValidationPassed: state.androidPhase1ValidationPassed === true,
      androidPhase2ValidationPassed: state.androidPhase2ValidationPassed === true,
      latestIntakeId: state.latestIntakeId,
      latestGroundingId: state.latestGroundingId,
      lastPreDeviceValidation: clone(state.lastPreDeviceValidation),
      lastAndroidValidation: clone(state.lastAndroidValidation),
      lastPhase2Validation: clone(state.lastPhase2Validation),
      lastPhase2AndroidValidation: clone(state.lastPhase2AndroidValidation),
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt
    };
  }

  function initialize(options) {
    const settings = isPlainObject(options) ? options : {};
    if (state.initializing) return buildResult(false, "IDE190_INITIALIZATION_IN_PROGRESS", "Blocked", getStatus());
    state.initializing = true;
    state.lastError = null;
    try {
      const dependency = getDependencyStatus();
      const dependencyReady =
        (settings.requireIDE180 === false || (
          dependency.ide180ManifestLoaded &&
          dependency.ide180RuntimeLoaded &&
          dependency.ide180VersionCompatible &&
          dependency.ide180HandoffContractCompatible &&
          dependency.ide180HandoffValidationApiAvailable &&
          dependency.ide180LatestHandoffApiAvailable &&
          dependency.ide180LatestPackageApiAvailable &&
          dependency.ide180PackageValidationApiAvailable
        )) &&
        (settings.requireIDE160 === false || (
          dependency.ide160RuntimeLoaded &&
          dependency.ide160VersionCompatible &&
          dependency.ide160AdapterRegistryApiAvailable &&
          dependency.ide160AdapterInvocationApiAvailable &&
          dependency.ide160CompatibilityApiAvailable &&
          dependency.ide150AdapterRegisteredInIDE160 &&
          dependency.ide150ControlledMutationAdapter
        ));

      if (!dependencyReady) {
        state.initialized = false;
        state.lastError = {
          message: "IDE-190 Phase 1 dependency requirement is not satisfied.",
          category: "Dependency Failure",
          dependency: dependency
        };
        touch();
        return buildResult(false, "IDE190_DEPENDENCY_REQUIRED", "Blocked", getStatus(), { error: state.lastError });
      }

      const results = [];
      if (typeof namespace.initializeContracts === "function") results.push(namespace.initializeContracts());
      if (typeof namespace.initializeIntake === "function") results.push(namespace.initializeIntake());
      if (typeof namespace.initializeGrounding === "function") results.push(namespace.initializeGrounding());
      const failed = results.filter(function failedResult(result) { return !result || result.ok !== true; });
      if (typeof namespace.initializeContracts !== "function") {
        failed.push({ ok: false, code: "IDE190_CONTRACTS_NOT_READY" });
      }

      state.initialized = failed.length === 0;
      touch();
      return buildResult(
        state.initialized,
        state.initialized ? "IDE190_FOUNDATION_INITIALIZED" : "IDE190_FOUNDATION_INITIALIZATION_FAILED",
        state.initialized ? "Ready" : "Blocked",
        { status: getStatus(), moduleInitialization: results }
      );
    } catch (error) {
      state.initialized = false;
      state.lastError = {
        message: error && error.message ? error.message : String(error),
        category: "System Failure"
      };
      touch();
      return buildResult(false, "IDE190_FOUNDATION_INITIALIZATION_EXCEPTION", "Blocked", getStatus(), { error: state.lastError });
    } finally {
      state.initializing = false;
    }
  }

  function markPhase1PreDeviceValidation(result) {
    state.lastPreDeviceValidation = clone(result);
    touch();
  }

  function markPhase1AndroidValidation(result) {
    state.lastAndroidValidation = clone(result);
    state.androidPhase1ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }


  function markPhase2Validation(result) {
    state.lastPhase2Validation = clone(result);
    touch();
  }

  function markPhase2AndroidValidation(result) {
    state.lastPhase2AndroidValidation = clone(result);
    state.androidPhase2ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }

  function getPublicApiDescription() {
    return {
      componentId: COMPONENT_ID,
      version: RELEASE_VERSION,
      namespace: "window.IDE190DevelopmentAutomation",
      phase: VERSION_MANIFEST.implementation.phase,
      namespaceFunctions: Object.keys(namespace.api || {}).sort(),
      intakeImplemented: typeof namespace.intakeIDE180Navigation === "function",
      groundingImplemented: typeof namespace.groundIDE180Navigation === "function",
      dispatchImplemented: false,
      mutationImplemented: false,
      persistenceImplemented: false
    };
  }

  namespace.api = namespace.api && typeof namespace.api === "object" ? namespace.api : {};
  namespace.modules = namespace.modules && typeof namespace.modules === "object" ? namespace.modules : {};
  namespace.constants = namespace.constants && typeof namespace.constants === "object" ? namespace.constants : {};

  Object.assign(internal, {
    state: state,
    nowIso: nowIso,
    text: text,
    isPlainObject: isPlainObject,
    clone: clone,
    deepFreeze: deepFreeze,
    unique: unique,
    parseSemver: parseSemver,
    compareSemver: compareSemver,
    nextId: nextId,
    touch: touch,
    buildResult: buildResult,
    markPhase1PreDeviceValidation: markPhase1PreDeviceValidation,
    markPhase1AndroidValidation: markPhase1AndroidValidation,
    markPhase2Validation: markPhase2Validation,
    markPhase2AndroidValidation: markPhase2AndroidValidation
  });
  namespace.__internal = internal;

  Object.assign(namespace.constants, {
    COMPONENT_ID: COMPONENT_ID,
    COMPONENT_NAME: COMPONENT_NAME,
    VERSION: RELEASE_VERSION,
    DESIGN_FREEZE_ID: VERSION_MANIFEST.release.designFreezeId
  });

  Object.assign(namespace.api, {
    initialize: initialize,
    getStatus: getStatus,
    getDependencyStatus: getDependencyStatus,
    getSafetyStatus: getSafetyStatus,
    getPermissionBoundaryStatus: getPermissionBoundaryStatus,
    getPlatformProfile: detectPlatformProfile,
    buildFoundationSnapshot: buildFoundationSnapshot,
    buildFoundationStateSnapshot: buildFoundationStateSnapshot,
    getPublicApiDescription: getPublicApiDescription
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.core = {
    id: "IDE-190-CORE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    phaseName: "IDE-180 Intake / Grounding",
    designFreezeId: VERSION_MANIFEST.release.designFreezeId,
    safeAutomationOrchestrator: true,
    directMutation: false,
    dispatchImplemented: false,
    loadedAt: nowIso()
  };

  global.IDE190DevelopmentAutomation = namespace;
  global.initializeDevelopmentAutomation = initialize;
  global.initializeDevelopmentAutomationFoundation = initialize;
  global.getDevelopmentAutomationStatus = getStatus;
  global.getDevelopmentAutomationDependencyStatus = getDependencyStatus;
  global.getDevelopmentAutomationSafetyStatus = getSafetyStatus;
  global.getDevelopmentAutomationPlatformProfile = detectPlatformProfile;
})(typeof window !== "undefined" ? window : globalThis);
