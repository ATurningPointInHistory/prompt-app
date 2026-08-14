/* ============================================================
   FILE: 13_local_first_repository_core.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.2.0 / Module: Core 1.1.0
   Phase 3: Offline Staging Lifecycle / Full-Reload Recovery
   ============================================================ */
(function (global) {
  "use strict";

  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 core blocked: Version Manifest is not loaded.");
    return;
  }

  const COMPONENT_ID = "REPOSITORY-010";
  const COMPONENT_NAME = "Local-First Repository Coordination";
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("core");

  function nowIso() { return new Date().toISOString(); }

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
      try { return structuredClone(value); } catch (_) {}
    }
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Map) {
      const output = new Map();
      value.forEach(function copyMap(item, key) { output.set(key, clone(item)); });
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
    Object.keys(value).forEach(function freezeChild(key) { deepFreeze(value[key], visited); });
    return Object.freeze(value);
  }

  const namespace = global.REPOSITORY010LocalFirstRepository && typeof global.REPOSITORY010LocalFirstRepository === "object"
    ? global.REPOSITORY010LocalFirstRepository
    : {};
  const internal = namespace.__internal && typeof namespace.__internal === "object" ? namespace.__internal : {};
  const state = internal.state && typeof internal.state === "object" ? internal.state : {
    initialized: false,
    initializing: false,
    sequence: 0,
    contracts: new Map(),
    nodeIdentities: new Map(),
    revisions: new Map(),
    integrityRecords: new Map(),
    stateRecords: new Map(),
    validationGates: new Map(),
    offlineStagingDescriptors: new Map(),
    lastPhase1Validation: null,
    lastPhase1AndroidValidation: null,
    phase1PreDeviceValidationPassed: false,
    androidPhase1ValidationPassed: false,
    lastPhase2Validation: null,
    lastPhase2AndroidValidation: null,
    phase2PreDeviceValidationPassed: false,
    androidPhase2ValidationPassed: false,
    lastPhase3Validation: null,
    lastPhase3AndroidReloadPreparation: null,
    lastPhase3AndroidValidation: null,
    phase3PreDeviceValidationPassed: false,
    phase3AndroidReloadPrepared: false,
    androidPhase3ValidationPassed: false,
    offlineStagingStatus: "Ready",
    lastOfflineStagingRestore: null,
    persistenceStatus: "Not Initialized",
    lastPersistenceError: null,
    lastError: null,
    updatedAt: null
  };

  ["contracts", "nodeIdentities", "revisions", "integrityRecords", "stateRecords", "validationGates", "offlineStagingDescriptors"].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  function touch() { state.updatedAt = nowIso(); }

  function nextId(prefix) {
    state.sequence += 1;
    return text(prefix, "REPOSITORY-010") + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }

  function buildResult(ok, code, status, data, extras) {
    return Object.assign({
      ok: ok === true,
      code: text(code, ok ? "REPOSITORY010_OK" : "REPOSITORY010_BLOCKED"),
      status: text(status, ok ? "Ready" : "Blocked"),
      componentId: COMPONENT_ID,
      version: RELEASE_VERSION,
      data: data == null ? null : data,
      createdAt: nowIso()
    }, extras || {});
  }

  function getDependencyStatus() {
    const ide190Manifest = global.IDE190VersionManifest || null;
    return {
      ide150RuntimeLoaded: Boolean(global.IDE150AutoRefactoring),
      ide160RuntimeLoaded: Boolean(global.AIPromptOSIDE160),
      ide170RuntimeLoaded: Boolean(global.IDE170Intelligence),
      ide180RuntimeLoaded: Boolean(global.IDE180KnowledgeNavigator),
      ide190RuntimeLoaded: Boolean(global.IDE190DevelopmentAutomation),
      ide190ManifestLoaded: Boolean(ide190Manifest),
      ide190ReleaseVersion: ide190Manifest && ide190Manifest.release ? ide190Manifest.release.version : null,
      ide190FrozenBaselineCompatible: Boolean(
        ide190Manifest &&
        ide190Manifest.release &&
        ide190Manifest.release.version === "1.10.0" &&
        ide190Manifest.release.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0"
      ),
      phase1DirectDependencyRequired: false,
      persistenceApiReusedInPhase1: false,
      mutationApiReusedInPhase1: false,
      phase2DirectDependencyRequired: false,
      existingIndexedDBPatternReusedByDesign: true,
      mutationApiReusedInPhase2: false
    };
  }

  function getSafetyStatus() { return clone(VERSION_MANIFEST.safety); }
  function getAuthorityBoundaryStatus() { return clone(VERSION_MANIFEST.authority); }
  function getValidationAuthorityStatus() { return clone(VERSION_MANIFEST.validationAuthority); }

  function buildFoundationSnapshot() {
    return deepFreeze({
      componentId: COMPONENT_ID,
      componentName: COMPONENT_NAME,
      version: "1.0.0",
      implementationPhase: "Phase 1 Foundation / Contracts / Metadata Model",
      architectureStatus: VERSION_MANIFEST.release.architectureStatus,
      decisions: clone(VERSION_MANIFEST.release.decisionIds),
      logicalAuthority: VERSION_MANIFEST.authority.logicalAuthority,
      initialCanonicalNode: VERSION_MANIFEST.authority.initialCanonicalNode,
      syncMode: VERSION_MANIFEST.authority.syncMode,
      repositoryStates: clone(VERSION_MANIFEST.repositoryStates),
      hashAlgorithm: VERSION_MANIFEST.integrity.hashAlgorithm,
      readOnlyFoundation: true,
      persistentMutationImplemented: false,
      persistenceImplemented: false,
      syncEngineImplemented: false,
      createdAt: nowIso()
    });
  }

  function phase1Complete() {
    return state.phase1PreDeviceValidationPassed === true && state.androidPhase1ValidationPassed === true;
  }

  function phase2Complete() {
    return phase1Complete() && state.phase2PreDeviceValidationPassed === true && state.androidPhase2ValidationPassed === true;
  }

  function phase3Complete() {
    return phase2Complete() && state.phase3PreDeviceValidationPassed === true && state.androidPhase3ValidationPassed === true;
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
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      architectureStatus: VERSION_MANIFEST.release.architectureStatus,
      decisionsFrozen: clone(VERSION_MANIFEST.release.decisionIds),
      initialized: state.initialized === true,
      phase1Complete: phase1Complete(),
      phase2Complete: phase2Complete(),
      phase3Complete: phase3Complete(),
      releaseAllowed: phase3Complete(),
      logicalAuthority: VERSION_MANIFEST.authority.logicalAuthority,
      initialCanonicalNode: VERSION_MANIFEST.authority.initialCanonicalNode,
      androidRole: VERSION_MANIFEST.authority.androidIndexedDBRole,
      syncMode: VERSION_MANIFEST.authority.syncMode,
      persistenceImplemented: VERSION_MANIFEST.implementation.persistenceImplemented === true,
      androidIndexedDBPersistenceImplemented: VERSION_MANIFEST.implementation.androidIndexedDBPersistenceImplemented === true,
      offlineStagingImplemented: VERSION_MANIFEST.implementation.offlineStagingImplemented === true,
      fullReloadRecoveryImplemented: VERSION_MANIFEST.implementation.fullReloadRecoveryImplemented === true,
      syncEngineImplemented: false,
      directRepositoryMutationAllowed: false,
      automaticConflictWinnerAllowed: false,
      phase1RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet),
      phase2RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet),
      phase3RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet),
      phase1PreDeviceValidationPassed: state.phase1PreDeviceValidationPassed === true,
      androidPhase1ValidationPassed: state.androidPhase1ValidationPassed === true,
      phase2PreDeviceValidationPassed: state.phase2PreDeviceValidationPassed === true,
      androidPhase2ValidationPassed: state.androidPhase2ValidationPassed === true,
      phase3PreDeviceValidationPassed: state.phase3PreDeviceValidationPassed === true,
      phase3AndroidReloadPrepared: state.phase3AndroidReloadPrepared === true,
      androidPhase3ValidationPassed: state.androidPhase3ValidationPassed === true,
      offlineStagingStatus: state.offlineStagingStatus || "Ready",
      persistenceStatus: state.persistenceStatus,
      metadataCounts: {
        nodeIdentities: state.nodeIdentities.size,
        revisions: state.revisions.size,
        integrityRecords: state.integrityRecords.size,
        stateRecords: state.stateRecords.size,
        validationGates: state.validationGates.size,
        offlineStagingDescriptors: state.offlineStagingDescriptors.size
      },
      modules: modules,
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt
    };
  }

  function initialize() {
    if (state.initializing) return buildResult(false, "REPOSITORY010_INITIALIZATION_IN_PROGRESS", "Blocked", getStatus());
    state.initializing = true;
    state.lastError = null;
    try {
      const results = [];
      if (typeof namespace.initializeContracts === "function") results.push(namespace.initializeContracts());
      if (typeof namespace.initializeMetadataModel === "function") results.push(namespace.initializeMetadataModel());
      if (typeof namespace.initializeContracts !== "function" || typeof namespace.initializeMetadataModel !== "function") {
        throw new Error("Phase 1 required modules are not loaded.");
      }
      if (typeof namespace.getLocalFirstRepositoryPersistenceStatus === "function") {
        state.persistenceStatus = namespace.getLocalFirstRepositoryPersistenceStatus().status;
      }
      const failed = results.filter(function findFailed(item) { return !item || item.ok !== true; });
      state.initialized = failed.length === 0;
      touch();
      return buildResult(state.initialized, state.initialized ? "REPOSITORY010_FOUNDATION_INITIALIZED" : "REPOSITORY010_FOUNDATION_INITIALIZATION_FAILED", state.initialized ? "Ready" : "Blocked", { status: getStatus(), moduleInitialization: results });
    } catch (error) {
      state.initialized = false;
      state.lastError = { message: error && error.message ? error.message : String(error), category: "Initialization" };
      touch();
      return buildResult(false, "REPOSITORY010_FOUNDATION_INITIALIZATION_EXCEPTION", "Blocked", getStatus(), { error: clone(state.lastError) });
    } finally {
      state.initializing = false;
    }
  }

  function markPhase1PreDeviceValidation(result) {
    state.lastPhase1Validation = clone(result);
    state.phase1PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase1AndroidValidation(result) {
    state.lastPhase1AndroidValidation = clone(result);
    state.androidPhase1ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true);
    touch();
  }

  function markPhase2PreDeviceValidation(result) {
    state.lastPhase2Validation = clone(result);
    state.phase2PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase2AndroidValidation(result) {
    state.lastPhase2AndroidValidation = clone(result);
    state.androidPhase2ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true);
    touch();
  }

  function markPhase3PreDeviceValidation(result) {
    state.lastPhase3Validation = clone(result);
    state.phase3PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase3AndroidReloadPreparation(result) {
    state.lastPhase3AndroidReloadPreparation = clone(result);
    state.phase3AndroidReloadPrepared = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true && result.reloadRequired === true);
    touch();
  }

  function markPhase3AndroidValidation(result) {
    state.lastPhase3AndroidValidation = clone(result);
    state.androidPhase3ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true && result.fullReloadValidated === true);
    if (state.androidPhase3ValidationPassed) state.phase3AndroidReloadPrepared = true;
    touch();
  }

  function getPublicApiDescription() {
    return {
      componentId: COMPONENT_ID,
      version: RELEASE_VERSION,
      namespace: "window.REPOSITORY010LocalFirstRepository",
      phase: 3,
      namespaceFunctions: Object.keys(namespace.api || {}).sort(),
      contractsImplemented: typeof namespace.validateContract === "function",
      metadataModelImplemented: typeof namespace.createRepositoryNodeIdentity === "function",
      phase1PersistenceImplemented: false,
      persistenceImplemented: VERSION_MANIFEST.implementation.persistenceImplemented === true,
      androidIndexedDBPersistenceImplemented: VERSION_MANIFEST.implementation.androidIndexedDBPersistenceImplemented === true,
      offlineStagingImplemented: VERSION_MANIFEST.implementation.offlineStagingImplemented === true,
      fullReloadRecoveryImplemented: VERSION_MANIFEST.implementation.fullReloadRecoveryImplemented === true,
      syncEngineImplemented: false,
      mutationEngineImplemented: false,
      phase1ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase1Validation === "function",
      phase2ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase2Validation === "function",
      phase3ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase3Validation === "function"
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
    nextId: nextId,
    touch: touch,
    buildResult: buildResult,
    markPhase1PreDeviceValidation: markPhase1PreDeviceValidation,
    markPhase1AndroidValidation: markPhase1AndroidValidation,
    markPhase2PreDeviceValidation: markPhase2PreDeviceValidation,
    markPhase2AndroidValidation: markPhase2AndroidValidation,
    markPhase3PreDeviceValidation: markPhase3PreDeviceValidation,
    markPhase3AndroidReloadPreparation: markPhase3AndroidReloadPreparation,
    markPhase3AndroidValidation: markPhase3AndroidValidation
  });
  namespace.__internal = internal;

  Object.assign(namespace.constants, {
    COMPONENT_ID: COMPONENT_ID,
    COMPONENT_NAME: COMPONENT_NAME,
    VERSION: RELEASE_VERSION
  });

  Object.assign(namespace.api, {
    initialize: initialize,
    getStatus: getStatus,
    getDependencyStatus: getDependencyStatus,
    getSafetyStatus: getSafetyStatus,
    getAuthorityBoundaryStatus: getAuthorityBoundaryStatus,
    getValidationAuthorityStatus: getValidationAuthorityStatus,
    buildFoundationSnapshot: buildFoundationSnapshot,
    getPublicApiDescription: getPublicApiDescription
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.core = {
    id: "REPOSITORY-010-CORE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    persistentMutationImplemented: false,
    persistenceImplemented: true,
    offlineStagingImplemented: true,
    fullReloadRecoveryImplemented: true,
    syncEngineImplemented: false,
    loadedAt: nowIso()
  };

  global.REPOSITORY010LocalFirstRepository = namespace;
  global.initializeLocalFirstRepository = initialize;
  global.getLocalFirstRepositoryStatus = getStatus;
  global.getLocalFirstRepositoryDependencyStatus = getDependencyStatus;
  global.getLocalFirstRepositorySafetyStatus = getSafetyStatus;
})(typeof window !== "undefined" ? window : globalThis);
