/* ============================================================
   FILE: 13_local_first_repository_core.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.9.0 / Module: Core 1.8.0
   Phase 10: Manual Acceptance Token / Authority Gate
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
    syncCandidateDescriptors: new Map(),
    transferPackageDescriptors: new Map(),
    desktopRepositoryDescriptors: new Map(),
    v2TransferReceipts: new Map(),
    canonicalBaselineDescriptors: new Map(),
    v3ConflictEvidenceDescriptors: new Map(),
    v4TargetValidationEvidenceDescriptors: new Map(),
    acceptanceTokenDescriptors: new Map(),
    acceptanceTokenConsumptionRecords: new Map(),
    acceptanceTokenRevocationRecords: new Map(),
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
    lastPhase4Validation: null,
    lastPhase4AndroidReloadPreparation: null,
    lastPhase4AndroidValidation: null,
    phase4PreDeviceValidationPassed: false,
    phase4AndroidReloadPrepared: false,
    androidPhase4ValidationPassed: false,
    lastPhase5Validation: null,
    lastPhase5AndroidReloadPreparation: null,
    lastPhase5AndroidValidation: null,
    phase5PreDeviceValidationPassed: false,
    phase5AndroidReloadPrepared: false,
    androidPhase5ValidationPassed: false,
    lastPhase6Validation: null,
    lastPhase6PCValidation: null,
    phase6PreDeviceValidationPassed: false,
    pcPhase6ValidationPassed: false,
    lastPhase7Validation: null,
    lastPhase7CrossDeviceValidation: null,
    phase7PreDeviceValidationPassed: false,
    crossDevicePhase7ValidationPassed: false,
    v2TransferStatus: "Ready",
    lastV2TransferReceipt: null,
    lastV2TransferEnvelope: null,
    lastV2TransferValidation: null,
    lastPhase8Validation: null,
    lastPhase8CrossDeviceValidation: null,
    phase8PreDeviceValidationPassed: false,
    crossDevicePhase8ValidationPassed: false,
    canonicalBaselineStatus: "Not Established",
    lastCanonicalBaseline: null,
    v3ConflictStatus: "Ready",
    lastV3ConflictEvidence: null,
    lastV3Evaluation: null,
    lastPhase9Validation: null,
    lastPhase9CrossDeviceValidation: null,
    phase9PreDeviceValidationPassed: false,
    crossDevicePhase9ValidationPassed: false,
    v4TargetStatus: "Ready",
    lastV4TargetValidationEvidence: null,
    lastV4Evaluation: null,
    lastPhase10Validation: null,
    lastPhase10CrossDeviceValidation: null,
    phase10PreDeviceValidationPassed: false,
    crossDevicePhase10ValidationPassed: false,
    acceptanceStatus: "Ready",
    lastAcceptanceToken: null,
    desktopAdapterStatus: "Not Initialized",
    lastDesktopRepositoryScan: null,
    transferPackageStatus: "Ready",
    lastTransferPackageRestore: null,
    syncCandidateStatus: "Ready",
    lastSyncCandidateRestore: null,
    offlineStagingStatus: "Ready",
    lastOfflineStagingRestore: null,
    persistenceStatus: "Not Initialized",
    lastPersistenceError: null,
    lastError: null,
    updatedAt: null
  };

  ["contracts", "nodeIdentities", "revisions", "integrityRecords", "stateRecords", "validationGates", "offlineStagingDescriptors", "syncCandidateDescriptors", "transferPackageDescriptors", "desktopRepositoryDescriptors", "v2TransferReceipts", "canonicalBaselineDescriptors", "v3ConflictEvidenceDescriptors", "v4TargetValidationEvidenceDescriptors", "acceptanceTokenDescriptors", "acceptanceTokenConsumptionRecords", "acceptanceTokenRevocationRecords"].forEach(function ensureMap(key) {
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

  function priorValidatedPhase() {
    const prior = VERSION_MANIFEST.release && VERSION_MANIFEST.release.priorValidatedBaseline;
    return prior && (prior.androidRealValidationPassed === true || prior.pcRealValidationPassed === true) ? Number(prior.phase || 0) : 0;
  }

  function phase1Complete() {
    return priorValidatedPhase() >= 1 || (state.phase1PreDeviceValidationPassed === true && state.androidPhase1ValidationPassed === true);
  }

  function phase2Complete() {
    return priorValidatedPhase() >= 2 || (phase1Complete() && state.phase2PreDeviceValidationPassed === true && state.androidPhase2ValidationPassed === true);
  }

  function phase3Complete() {
    return priorValidatedPhase() >= 3 || (phase2Complete() && state.phase3PreDeviceValidationPassed === true && state.androidPhase3ValidationPassed === true);
  }

  function phase4Complete() {
    return priorValidatedPhase() >= 4 || (phase3Complete() && state.phase4PreDeviceValidationPassed === true && state.androidPhase4ValidationPassed === true);
  }

  function phase5Complete() {
    return priorValidatedPhase() >= 5 || (phase4Complete() && state.phase5PreDeviceValidationPassed === true && state.androidPhase5ValidationPassed === true);
  }

  function phase6Complete() {
    return priorValidatedPhase() >= 6 || (phase5Complete() && state.phase6PreDeviceValidationPassed === true && state.pcPhase6ValidationPassed === true);
  }

  function phase7Complete() {
    return priorValidatedPhase() >= 7 || (phase6Complete() && state.phase7PreDeviceValidationPassed === true && state.crossDevicePhase7ValidationPassed === true);
  }

  function phase8Complete() {
    return priorValidatedPhase() >= 8 || (phase7Complete() && state.phase8PreDeviceValidationPassed === true && state.crossDevicePhase8ValidationPassed === true && !(state.lastV3ConflictEvidence && state.lastV3ConflictEvidence.blockingConflict === true));
  }

  function phase9Complete() {
    return priorValidatedPhase() >= 9 || (phase8Complete() && state.phase9PreDeviceValidationPassed === true && state.crossDevicePhase9ValidationPassed === true && Boolean(state.lastV4TargetValidationEvidence && state.lastV4TargetValidationEvidence.v4TargetEnvironmentValidated === true && state.lastV4TargetValidationEvidence.blockingTargetDrift === false));
  }

  function phase10Complete() {
    return phase9Complete() && state.phase10PreDeviceValidationPassed === true && state.crossDevicePhase10ValidationPassed === true && Boolean(state.lastAcceptanceToken && state.lastAcceptanceToken.acceptanceMode === "MANUAL" && state.lastAcceptanceToken.explicitAcceptanceGranted === true && state.lastAcceptanceToken.mutationAuthorityGranted === false && state.lastAcceptanceToken.canonicalMutationPerformed === false);
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
      priorValidatedBaseline: clone(VERSION_MANIFEST.release.priorValidatedBaseline || null),
      initialized: state.initialized === true,
      phase1Complete: phase1Complete(),
      phase2Complete: phase2Complete(),
      phase3Complete: phase3Complete(),
      phase4Complete: phase4Complete(),
      phase5Complete: phase5Complete(),
      phase6Complete: phase6Complete(),
      phase7Complete: phase7Complete(),
      phase8Complete: phase8Complete(),
      phase9Complete: phase9Complete(),
      phase10Complete: phase10Complete(),
      releaseAllowed: phase10Complete(),
      logicalAuthority: VERSION_MANIFEST.authority.logicalAuthority,
      initialCanonicalNode: VERSION_MANIFEST.authority.initialCanonicalNode,
      androidRole: VERSION_MANIFEST.authority.androidIndexedDBRole,
      syncMode: VERSION_MANIFEST.authority.syncMode,
      persistenceImplemented: VERSION_MANIFEST.implementation.persistenceImplemented === true,
      androidIndexedDBPersistenceImplemented: VERSION_MANIFEST.implementation.androidIndexedDBPersistenceImplemented === true,
      offlineStagingImplemented: VERSION_MANIFEST.implementation.offlineStagingImplemented === true,
      fullReloadRecoveryImplemented: VERSION_MANIFEST.implementation.fullReloadRecoveryImplemented === true,
      syncCandidateCreationImplemented: VERSION_MANIFEST.implementation.syncCandidateCreationImplemented === true,
      syncCandidatePersistenceImplemented: VERSION_MANIFEST.implementation.syncCandidatePersistenceImplemented === true,
      v1LocalValidationImplemented: VERSION_MANIFEST.implementation.v1LocalValidationImplemented === true,
      transferPackagePreparationImplemented: VERSION_MANIFEST.implementation.transferPackagePreparationImplemented === true,
      transferPackagePersistenceImplemented: VERSION_MANIFEST.implementation.transferPackagePersistenceImplemented === true,
      v2IntegrityPreflightImplemented: VERSION_MANIFEST.implementation.v2IntegrityPreflightImplemented === true,
      v2TransferIntegrityValidationImplemented: VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === true,
      v3BaseConflictValidationImplemented: VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === true,
      v4TargetEnvironmentValidationImplemented: VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === true,
      explicitCanonicalBaselineImplemented: VERSION_MANIFEST.implementation.explicitCanonicalBaselineImplemented === true,
      explicitAcceptanceImplemented: VERSION_MANIFEST.implementation.explicitAcceptanceImplemented === true,
      manualAcceptanceTokenImplemented: VERSION_MANIFEST.implementation.manualAcceptanceTokenImplemented === true,
      delegatedAcceptanceEnabled: Boolean(VERSION_MANIFEST.acceptance && VERSION_MANIFEST.acceptance.delegatedAcceptanceEnabled === true),
      controlledCanonicalTransactionImplemented: VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented === true,
      v5PostReflectionVerificationImplemented: VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === true,
      desktopAdapterImplemented: VERSION_MANIFEST.implementation.desktopAdapterImplemented === true,
      pcLocalRepositoryReadOnlyScanImplemented: VERSION_MANIFEST.implementation.pcLocalRepositoryReadOnlyScanImplemented === true,
      pcLocalRepositoryIntegrityVerificationImplemented: VERSION_MANIFEST.implementation.pcLocalRepositoryIntegrityVerificationImplemented === true,
      pcCanonicalMutationImplemented: false,
      syncEngineImplemented: false,
      directRepositoryMutationAllowed: false,
      automaticConflictWinnerAllowed: false,
      phase1RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet),
      phase2RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase2RequiredGateSet),
      phase3RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase3RequiredGateSet),
      phase4RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase4RequiredGateSet),
      phase5RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase5RequiredGateSet),
      phase6RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet),
      phase7RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet),
      phase8RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet),
      phase9RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet),
      phase10RequiredGateSet: clone(VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet),
      phase1PreDeviceValidationPassed: state.phase1PreDeviceValidationPassed === true,
      androidPhase1ValidationPassed: state.androidPhase1ValidationPassed === true || priorValidatedPhase() >= 1,
      phase2PreDeviceValidationPassed: state.phase2PreDeviceValidationPassed === true,
      androidPhase2ValidationPassed: state.androidPhase2ValidationPassed === true || priorValidatedPhase() >= 2,
      phase3PreDeviceValidationPassed: state.phase3PreDeviceValidationPassed === true,
      phase3AndroidReloadPrepared: state.phase3AndroidReloadPrepared === true,
      androidPhase3ValidationPassed: state.androidPhase3ValidationPassed === true || priorValidatedPhase() >= 3,
      phase4PreDeviceValidationPassed: state.phase4PreDeviceValidationPassed === true,
      phase4AndroidReloadPrepared: state.phase4AndroidReloadPrepared === true,
      androidPhase4ValidationPassed: state.androidPhase4ValidationPassed === true || priorValidatedPhase() >= 4,
      phase5PreDeviceValidationPassed: state.phase5PreDeviceValidationPassed === true,
      phase5AndroidReloadPrepared: state.phase5AndroidReloadPrepared === true,
      androidPhase5ValidationPassed: state.androidPhase5ValidationPassed === true || priorValidatedPhase() >= 5,
      phase6PreDeviceValidationPassed: state.phase6PreDeviceValidationPassed === true,
      pcPhase6ValidationPassed: state.pcPhase6ValidationPassed === true || priorValidatedPhase() >= 6,
      phase7PreDeviceValidationPassed: state.phase7PreDeviceValidationPassed === true,
      crossDevicePhase7ValidationPassed: state.crossDevicePhase7ValidationPassed === true || priorValidatedPhase() >= 7,
      phase8PreDeviceValidationPassed: state.phase8PreDeviceValidationPassed === true,
      crossDevicePhase8ValidationPassed: state.crossDevicePhase8ValidationPassed === true || priorValidatedPhase() >= 8,
      phase9PreDeviceValidationPassed: state.phase9PreDeviceValidationPassed === true,
      crossDevicePhase9ValidationPassed: state.crossDevicePhase9ValidationPassed === true || priorValidatedPhase() >= 9,
      phase10PreDeviceValidationPassed: state.phase10PreDeviceValidationPassed === true,
      crossDevicePhase10ValidationPassed: state.crossDevicePhase10ValidationPassed === true,
      acceptanceStatus: state.acceptanceStatus || "Ready",
      lastAcceptanceToken: clone(state.lastAcceptanceToken),
      acceptanceTokenTtlSeconds: VERSION_MANIFEST.acceptance && VERSION_MANIFEST.acceptance.tokenLifetimeSeconds || null,
      v4TargetStatus: state.v4TargetStatus || "Ready",
      lastV4TargetValidationEvidence: clone(state.lastV4TargetValidationEvidence),
      canonicalBaselineStatus: state.canonicalBaselineStatus || "Not Established",
      lastCanonicalBaseline: clone(state.lastCanonicalBaseline),
      v3ConflictStatus: state.v3ConflictStatus || "Ready",
      lastV3ConflictEvidence: clone(state.lastV3ConflictEvidence),
      v2TransferStatus: state.v2TransferStatus || "Ready",
      lastV2TransferReceipt: clone(state.lastV2TransferReceipt),
      desktopAdapterStatus: state.desktopAdapterStatus || "Not Initialized",
      lastDesktopRepositoryScan: clone(state.lastDesktopRepositoryScan),
      transferPackageStatus: state.transferPackageStatus || "Ready",
      syncCandidateStatus: state.syncCandidateStatus || "Ready",
      offlineStagingStatus: state.offlineStagingStatus || "Ready",
      persistenceStatus: state.persistenceStatus,
      metadataCounts: {
        nodeIdentities: state.nodeIdentities.size,
        revisions: state.revisions.size,
        integrityRecords: state.integrityRecords.size,
        stateRecords: state.stateRecords.size,
        validationGates: state.validationGates.size,
        offlineStagingDescriptors: state.offlineStagingDescriptors.size,
        syncCandidateDescriptors: state.syncCandidateDescriptors.size,
        transferPackageDescriptors: state.transferPackageDescriptors.size,
        desktopRepositoryDescriptors: state.desktopRepositoryDescriptors.size,
        v2TransferReceipts: state.v2TransferReceipts.size,
        canonicalBaselineDescriptors: state.canonicalBaselineDescriptors.size,
        v3ConflictEvidenceDescriptors: state.v3ConflictEvidenceDescriptors.size,
        v4TargetValidationEvidenceDescriptors: state.v4TargetValidationEvidenceDescriptors.size,
        acceptanceTokenDescriptors: state.acceptanceTokenDescriptors.size,
        acceptanceTokenConsumptionRecords: state.acceptanceTokenConsumptionRecords.size,
        acceptanceTokenRevocationRecords: state.acceptanceTokenRevocationRecords.size
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
      if (typeof namespace.initializeDesktopRepositoryAdapter === "function") {
        results.push(namespace.initializeDesktopRepositoryAdapter());
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

  function markPhase4PreDeviceValidation(result) {
    state.lastPhase4Validation = clone(result);
    state.phase4PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase4AndroidReloadPreparation(result) {
    state.lastPhase4AndroidReloadPreparation = clone(result);
    state.phase4AndroidReloadPrepared = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true && result.reloadRequired === true);
    touch();
  }

  function markPhase4AndroidValidation(result) {
    state.lastPhase4AndroidValidation = clone(result);
    state.androidPhase4ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true && result.fullReloadValidated === true);
    if (state.androidPhase4ValidationPassed) state.phase4AndroidReloadPrepared = true;
    touch();
  }

  function markPhase5PreDeviceValidation(result) {
    state.lastPhase5Validation = clone(result);
    state.phase5PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase5AndroidReloadPreparation(result) {
    state.lastPhase5AndroidReloadPreparation = clone(result);
    state.phase5AndroidReloadPrepared = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true && result.reloadRequired === true);
    touch();
  }

  function markPhase5AndroidValidation(result) {
    state.lastPhase5AndroidValidation = clone(result);
    state.androidPhase5ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.androidRealDevice === true && result.fullReloadValidated === true);
    if (state.androidPhase5ValidationPassed) state.phase5AndroidReloadPrepared = true;
    touch();
  }

  function markPhase6PreDeviceValidation(result) {
    state.lastPhase6Validation = clone(result);
    state.phase6PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase6PCValidation(result) {
    state.lastPhase6PCValidation = clone(result);
    state.pcPhase6ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.pcRealDevice === true);
    if (state.pcPhase6ValidationPassed) state.desktopAdapterStatus = "Verified";
    touch();
  }

  function markPhase7PreDeviceValidation(result) {
    state.lastPhase7Validation = clone(result);
    state.phase7PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase7CrossDeviceValidation(result) {
    state.lastPhase7CrossDeviceValidation = clone(result);
    state.crossDevicePhase7ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.crossDeviceRealValidation === true && result.pcRealDevice === true && result.androidSenderRealDevice === true);
    touch();
  }

  function markPhase8PreDeviceValidation(result) {
    state.lastPhase8Validation = clone(result);
    state.phase8PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase8CrossDeviceValidation(result) {
    state.lastPhase8CrossDeviceValidation = clone(result);
    state.crossDevicePhase8ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.crossDeviceRealValidation === true && result.pcRealDevice === true && result.androidSenderRealDevice === true && result.blockingConflict !== true);
    touch();
  }

  function markPhase9PreDeviceValidation(result) {
    state.lastPhase9Validation = clone(result);
    state.phase9PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase9CrossDeviceValidation(result) {
    state.lastPhase9CrossDeviceValidation = clone(result);
    state.crossDevicePhase9ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.crossDeviceRealValidation === true && result.pcRealDevice === true && result.androidSenderRealDevice === true && result.blockingTargetDrift !== true && result.v4TargetEnvironmentValidated === true);
    touch();
  }

  function markPhase10PreDeviceValidation(result) {
    state.lastPhase10Validation = clone(result);
    state.phase10PreDeviceValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0);
    touch();
  }

  function markPhase10CrossDeviceValidation(result) {
    state.lastPhase10CrossDeviceValidation = clone(result);
    state.crossDevicePhase10ValidationPassed = Boolean(result && result.failed === 0 && result.criticalFailed === 0 && result.crossDeviceRealValidation === true && result.pcRealDevice === true && result.androidSenderRealDevice === true && result.manualAcceptanceTokenIssued === true && result.tokenValidForControlledTransactionStart === true);
    touch();
  }

  function getPublicApiDescription() {
    return {
      componentId: COMPONENT_ID,
      version: RELEASE_VERSION,
      namespace: "window.REPOSITORY010LocalFirstRepository",
      phase: 10,
      namespaceFunctions: Object.keys(namespace.api || {}).sort(),
      contractsImplemented: typeof namespace.validateContract === "function",
      metadataModelImplemented: typeof namespace.createRepositoryNodeIdentity === "function",
      phase1PersistenceImplemented: false,
      persistenceImplemented: VERSION_MANIFEST.implementation.persistenceImplemented === true,
      androidIndexedDBPersistenceImplemented: VERSION_MANIFEST.implementation.androidIndexedDBPersistenceImplemented === true,
      offlineStagingImplemented: VERSION_MANIFEST.implementation.offlineStagingImplemented === true,
      fullReloadRecoveryImplemented: VERSION_MANIFEST.implementation.fullReloadRecoveryImplemented === true,
      syncCandidateCreationImplemented: VERSION_MANIFEST.implementation.syncCandidateCreationImplemented === true,
      syncCandidatePersistenceImplemented: VERSION_MANIFEST.implementation.syncCandidatePersistenceImplemented === true,
      v1LocalValidationImplemented: VERSION_MANIFEST.implementation.v1LocalValidationImplemented === true,
      transferPackagePreparationImplemented: VERSION_MANIFEST.implementation.transferPackagePreparationImplemented === true,
      transferPackagePersistenceImplemented: VERSION_MANIFEST.implementation.transferPackagePersistenceImplemented === true,
      v2IntegrityPreflightImplemented: VERSION_MANIFEST.implementation.v2IntegrityPreflightImplemented === true,
      v2TransferIntegrityValidationImplemented: VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === true,
      v3BaseConflictValidationImplemented: VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === true,
      v4TargetEnvironmentValidationImplemented: VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === true,
      explicitCanonicalBaselineImplemented: VERSION_MANIFEST.implementation.explicitCanonicalBaselineImplemented === true,
      explicitAcceptanceImplemented: VERSION_MANIFEST.implementation.explicitAcceptanceImplemented === true,
      manualAcceptanceTokenImplemented: VERSION_MANIFEST.implementation.manualAcceptanceTokenImplemented === true,
      delegatedAcceptanceEnabled: Boolean(VERSION_MANIFEST.acceptance && VERSION_MANIFEST.acceptance.delegatedAcceptanceEnabled === true),
      controlledCanonicalTransactionImplemented: VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented === true,
      v5PostReflectionVerificationImplemented: VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === true,
      desktopAdapterImplemented: VERSION_MANIFEST.implementation.desktopAdapterImplemented === true,
      pcLocalRepositoryReadOnlyScanImplemented: VERSION_MANIFEST.implementation.pcLocalRepositoryReadOnlyScanImplemented === true,
      pcCanonicalMutationImplemented: false,
      syncEngineImplemented: false,
      mutationEngineImplemented: false,
      phase1ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase1Validation === "function",
      phase2ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase2Validation === "function",
      phase3ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase3Validation === "function",
      phase4ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase4Validation === "function",
      phase5ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase5Validation === "function",
      phase6ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase6Validation === "function",
      phase7ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase7Validation === "function",
      phase8ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase8Validation === "function",
      phase9ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase9Validation === "function",
      phase10ValidationImplemented: typeof namespace.runLocalFirstRepositoryPhase10Validation === "function"
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
    markPhase3AndroidValidation: markPhase3AndroidValidation,
    markPhase4PreDeviceValidation: markPhase4PreDeviceValidation,
    markPhase4AndroidReloadPreparation: markPhase4AndroidReloadPreparation,
    markPhase4AndroidValidation: markPhase4AndroidValidation,
    markPhase5PreDeviceValidation: markPhase5PreDeviceValidation,
    markPhase5AndroidReloadPreparation: markPhase5AndroidReloadPreparation,
    markPhase5AndroidValidation: markPhase5AndroidValidation,
    markPhase6PreDeviceValidation: markPhase6PreDeviceValidation,
    markPhase6PCValidation: markPhase6PCValidation,
    markPhase7PreDeviceValidation: markPhase7PreDeviceValidation,
    markPhase7CrossDeviceValidation: markPhase7CrossDeviceValidation,
    markPhase8PreDeviceValidation: markPhase8PreDeviceValidation,
    markPhase8CrossDeviceValidation: markPhase8CrossDeviceValidation,
    markPhase9PreDeviceValidation: markPhase9PreDeviceValidation,
    markPhase9CrossDeviceValidation: markPhase9CrossDeviceValidation,
    markPhase10PreDeviceValidation: markPhase10PreDeviceValidation,
    markPhase10CrossDeviceValidation: markPhase10CrossDeviceValidation
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
    phase: 10,
    persistentMutationImplemented: false,
    persistenceImplemented: true,
    offlineStagingImplemented: true,
    fullReloadRecoveryImplemented: true,
    syncCandidateCreationImplemented: true,
    syncCandidatePersistenceImplemented: true,
    v1LocalValidationImplemented: true,
    transferPackagePreparationImplemented: true,
    transferPackagePersistenceImplemented: true,
    v2IntegrityPreflightImplemented: true,
    v2TransferIntegrityValidationImplemented: true,
    v3BaseConflictValidationImplemented: true,
    v4TargetEnvironmentValidationImplemented: true,
    explicitCanonicalBaselineImplemented: true,
    manualAcceptanceTokenImplemented: true,
    delegatedAcceptanceEnabled: false,
    controlledCanonicalTransactionImplemented: false,
    desktopAdapterImplemented: true,
    pcLocalRepositoryReadOnlyScanImplemented: true,
    pcCanonicalMutationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: nowIso()
  };

  global.REPOSITORY010LocalFirstRepository = namespace;
  global.initializeLocalFirstRepository = initialize;
  global.getLocalFirstRepositoryStatus = getStatus;
  global.getLocalFirstRepositoryDependencyStatus = getDependencyStatus;
  global.getLocalFirstRepositorySafetyStatus = getSafetyStatus;
})(typeof window !== "undefined" ? window : globalThis);
