/* ============================================================
   FILE: 13_development_automation_core.js
   IDE-190 Development Automation
   Release: 1.9.0 / Module: Core 1.9.0
   Phase 10: Integrated / Android Final Validation
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
        plans: new Map(),
        latestPlanId: null,
        proposals: new Map(),
        latestProposalId: null,
        dryRuns: new Map(),
        latestDryRunId: null,
        preflights: new Map(),
        latestPreflightId: null,
        authorizationGates: new Map(),
        latestAuthorizationGateId: null,
        approvalRequests: new Map(),
        approvals: new Map(),
        approvalStates: new Map(),
        latestApprovalRequestId: null,
        latestApprovalId: null,
        consents: new Map(),
        consentStates: new Map(),
        latestConsentId: null,
        lastPhase2Validation: null,
        lastPhase2AndroidValidation: null,
        androidPhase2ValidationPassed: false,
        lastPhase3Validation: null,
        lastPhase3AndroidValidation: null,
        androidPhase3ValidationPassed: false,
        lastPhase4Validation: null,
        lastPhase4AndroidValidation: null,
        androidPhase4ValidationPassed: false,
        mutationTrials: new Map(),
        repositoryIntegrityRecords: new Map(),
        rollbackRestorationRecords: new Map(),
        phase6ExecutionStates: new Map(),
        latestMutationTrialId: null,
        latestRepositoryIntegrityRecordId: null,
        latestRollbackRestorationRecordId: null,
        mutationTrialLock: { active: false, mutationTrialId: null, acquiredAt: null, releasedAt: null },
        repositoryMutationTrust: { status: "Trusted", reason: "", mutationTrialId: null, rollbackId: null, markedAt: null },
        lastPhase6Validation: null,
        lastPhase6AndroidValidation: null,
        androidPhase6ValidationPassed: false,
        failureRecords: new Map(),
        timeoutWatches: new Map(),
        timeoutRecords: new Map(),
        recoveryDecisions: new Map(),
        recoveryVerifications: new Map(),
        latestFailureRecordId: null,
        latestTimeoutWatchId: null,
        latestTimeoutRecordId: null,
        latestRecoveryDecisionId: null,
        latestRecoveryVerificationId: null,
        lastPhase7Validation: null,
        lastPhase7AndroidValidation: null,
        androidPhase7ValidationPassed: false,
        automationSessions: new Map(),
        auditEvents: new Map(),
        auditEventOrder: [],
        automationReceipts: new Map(),
        latestAutomationSessionId: null,
        latestAuditEventId: null,
        latestAutomationReceiptId: null,
        automationPersistenceStatus: "Not Initialized",
        lastAutomationPersistenceError: null,
        lastAutomationReceiptRestore: null,
        lastPhase8Validation: null,
        lastPhase8AndroidValidation: null,
        androidPhase8ValidationPassed: false,
        lastError: null,
        updatedAt: null
      };

  if (!(state.contracts instanceof Map)) state.contracts = new Map();
  if (!(state.intakes instanceof Map)) state.intakes = new Map();
  if (!(state.intakeSources instanceof Map)) state.intakeSources = new Map();
  if (!(state.groundings instanceof Map)) state.groundings = new Map();
  if (!(state.plans instanceof Map)) state.plans = new Map();
  if (!(state.proposals instanceof Map)) state.proposals = new Map();
  if (!(state.dryRuns instanceof Map)) state.dryRuns = new Map();
  if (!(state.preflights instanceof Map)) state.preflights = new Map();
  if (!(state.authorizationGates instanceof Map)) state.authorizationGates = new Map();
  if (!(state.approvalRequests instanceof Map)) state.approvalRequests = new Map();
  if (!(state.approvals instanceof Map)) state.approvals = new Map();
  if (!(state.approvalStates instanceof Map)) state.approvalStates = new Map();
  if (!(state.consents instanceof Map)) state.consents = new Map();
  if (!(state.consentStates instanceof Map)) state.consentStates = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestIntakeId")) state.latestIntakeId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestGroundingId")) state.latestGroundingId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase2Validation")) state.lastPhase2Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase2AndroidValidation")) state.lastPhase2AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase2ValidationPassed")) state.androidPhase2ValidationPassed = false;
  if (!Object.prototype.hasOwnProperty.call(state, "latestPlanId")) state.latestPlanId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestProposalId")) state.latestProposalId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestDryRunId")) state.latestDryRunId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestPreflightId")) state.latestPreflightId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestAuthorizationGateId")) state.latestAuthorizationGateId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestApprovalRequestId")) state.latestApprovalRequestId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestApprovalId")) state.latestApprovalId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestConsentId")) state.latestConsentId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase3Validation")) state.lastPhase3Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase3AndroidValidation")) state.lastPhase3AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase3ValidationPassed")) state.androidPhase3ValidationPassed = false;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase4Validation")) state.lastPhase4Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase4AndroidValidation")) state.lastPhase4AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase4ValidationPassed")) state.androidPhase4ValidationPassed = false;
  if (!(state.dispatchRequests instanceof Map)) state.dispatchRequests = new Map();
  if (!(state.executionResults instanceof Map)) state.executionResults = new Map();
  if (!(state.gateDispatchStates instanceof Map)) state.gateDispatchStates = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestDispatchRequestId")) state.latestDispatchRequestId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestExecutionResultId")) state.latestExecutionResultId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase5Validation")) state.lastPhase5Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase5AndroidValidation")) state.lastPhase5AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase5ValidationPassed")) state.androidPhase5ValidationPassed = false;
  if (!(state.mutationTrials instanceof Map)) state.mutationTrials = new Map();
  if (!(state.repositoryIntegrityRecords instanceof Map)) state.repositoryIntegrityRecords = new Map();
  if (!(state.rollbackRestorationRecords instanceof Map)) state.rollbackRestorationRecords = new Map();
  if (!(state.phase6ExecutionStates instanceof Map)) state.phase6ExecutionStates = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestMutationTrialId")) state.latestMutationTrialId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestRepositoryIntegrityRecordId")) state.latestRepositoryIntegrityRecordId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestRollbackRestorationRecordId")) state.latestRollbackRestorationRecordId = null;
  if (!state.mutationTrialLock || typeof state.mutationTrialLock !== "object") state.mutationTrialLock = { active: false, mutationTrialId: null, acquiredAt: null, releasedAt: null };
  if (!state.repositoryMutationTrust || typeof state.repositoryMutationTrust !== "object") state.repositoryMutationTrust = { status: "Trusted", reason: "", mutationTrialId: null, rollbackId: null, markedAt: null };
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase6Validation")) state.lastPhase6Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase6AndroidValidation")) state.lastPhase6AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase6ValidationPassed")) state.androidPhase6ValidationPassed = false;
  if (!(state.failureRecords instanceof Map)) state.failureRecords = new Map();
  if (!(state.timeoutWatches instanceof Map)) state.timeoutWatches = new Map();
  if (!(state.timeoutRecords instanceof Map)) state.timeoutRecords = new Map();
  if (!(state.recoveryDecisions instanceof Map)) state.recoveryDecisions = new Map();
  if (!(state.recoveryVerifications instanceof Map)) state.recoveryVerifications = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestFailureRecordId")) state.latestFailureRecordId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestTimeoutWatchId")) state.latestTimeoutWatchId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestTimeoutRecordId")) state.latestTimeoutRecordId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestRecoveryDecisionId")) state.latestRecoveryDecisionId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestRecoveryVerificationId")) state.latestRecoveryVerificationId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase7Validation")) state.lastPhase7Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase7AndroidValidation")) state.lastPhase7AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase7ValidationPassed")) state.androidPhase7ValidationPassed = false;
  if (!(state.automationSessions instanceof Map)) state.automationSessions = new Map();
  if (!(state.auditEvents instanceof Map)) state.auditEvents = new Map();
  if (!Array.isArray(state.auditEventOrder)) state.auditEventOrder = [];
  if (!(state.automationReceipts instanceof Map)) state.automationReceipts = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestAutomationSessionId")) state.latestAutomationSessionId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestAuditEventId")) state.latestAuditEventId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestAutomationReceiptId")) state.latestAutomationReceiptId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "automationPersistenceStatus")) state.automationPersistenceStatus = "Not Initialized";
  if (!Object.prototype.hasOwnProperty.call(state, "lastAutomationPersistenceError")) state.lastAutomationPersistenceError = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastAutomationReceiptRestore")) state.lastAutomationReceiptRestore = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase8Validation")) state.lastPhase8Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase8AndroidValidation")) state.lastPhase8AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase8ValidationPassed")) state.androidPhase8ValidationPassed = false;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase9Validation")) state.lastPhase9Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase9AndroidValidation")) state.lastPhase9AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase9ValidationPassed")) state.androidPhase9ValidationPassed = false;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase10Validation")) state.lastPhase10Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase10AndroidValidation")) state.lastPhase10AndroidValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "androidPhase10ValidationPassed")) state.androidPhase10ValidationPassed = false;
  if (!Object.prototype.hasOwnProperty.call(state, "ide190FinalReleaseReceipt")) state.ide190FinalReleaseReceipt = null;
  if (!(state.reflectionPackages instanceof Map)) state.reflectionPackages = new Map();
  if (!(state.reflectionPayloads instanceof Map)) state.reflectionPayloads = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestReflectionPackageId")) state.latestReflectionPackageId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestCrossDeviceRecord")) state.latestCrossDeviceRecord = null;

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
      releaseAllowed: state.androidPhase10ValidationPassed === true,
      ide190Complete: state.androidPhase10ValidationPassed === true,
      phase2Allowed: true,
      phase3Allowed: true,
      phase4Allowed: VERSION_MANIFEST.implementation.phase >= 4,
      phase5Allowed: state.androidPhase4ValidationPassed === true,
      phase6Allowed: true,
      phase7Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(6),
      phase8Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(7),
      phase9Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(8),
      phase10Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(9),
      lastPreDeviceValidation: clone(state.lastPreDeviceValidation),
      lastAndroidValidation: clone(state.lastAndroidValidation),
      lastPhase2Validation: clone(state.lastPhase2Validation),
      lastPhase2AndroidValidation: clone(state.lastPhase2AndroidValidation),
      lastPhase3Validation: clone(state.lastPhase3Validation),
      lastPhase3AndroidValidation: clone(state.lastPhase3AndroidValidation),
      lastPhase4Validation: clone(state.lastPhase4Validation),
      lastPhase4AndroidValidation: clone(state.lastPhase4AndroidValidation),
      lastPhase5Validation: clone(state.lastPhase5Validation),
      lastPhase5AndroidValidation: clone(state.lastPhase5AndroidValidation),
      lastPhase6Validation: clone(state.lastPhase6Validation),
      lastPhase6AndroidValidation: clone(state.lastPhase6AndroidValidation),
      lastPhase7Validation: clone(state.lastPhase7Validation),
      lastPhase7AndroidValidation: clone(state.lastPhase7AndroidValidation),
      lastPhase8Validation: clone(state.lastPhase8Validation),
      lastPhase8AndroidValidation: clone(state.lastPhase8AndroidValidation),
      lastPhase9Validation: clone(state.lastPhase9Validation),
      lastPhase9AndroidValidation: clone(state.lastPhase9AndroidValidation),
      lastPhase10Validation: clone(state.lastPhase10Validation),
      lastPhase10AndroidValidation: clone(state.lastPhase10AndroidValidation),
      ide190FinalReleaseReceipt: clone(state.ide190FinalReleaseReceipt)
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
      ide190Complete: state.androidPhase10ValidationPassed === true,
      releaseAllowed: state.androidPhase10ValidationPassed === true,
      phase2Allowed: true,
      phase3Allowed: true,
      phase4Allowed: VERSION_MANIFEST.implementation.phase >= 4,
      phase5Allowed: state.androidPhase4ValidationPassed === true,
      phase6Allowed: true,
      phase7Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(6),
      phase8Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(7),
      phase9Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(8),
      phase10Allowed: VERSION_MANIFEST.implementation.completedPhases.includes(9),
      androidPhase1ValidationPassed: state.androidPhase1ValidationPassed === true,
      androidPhase2ValidationPassed: state.androidPhase2ValidationPassed === true,
      androidPhase3ValidationPassed: state.androidPhase3ValidationPassed === true,
      androidPhase4ValidationPassed: state.androidPhase4ValidationPassed === true,
      androidPhase5ValidationPassed: state.androidPhase5ValidationPassed === true,
      androidPhase6ValidationPassed: state.androidPhase6ValidationPassed === true,
      androidPhase7ValidationPassed: state.androidPhase7ValidationPassed === true,
      androidPhase8ValidationPassed: state.androidPhase8ValidationPassed === true,
      androidPhase9ValidationPassed: state.androidPhase9ValidationPassed === true,
      androidPhase10ValidationPassed: state.androidPhase10ValidationPassed === true,
      latestAutomationSessionId: state.latestAutomationSessionId,
      latestAuditEventId: state.latestAuditEventId,
      latestAutomationReceiptId: state.latestAutomationReceiptId,
      latestIntakeId: state.latestIntakeId,
      latestGroundingId: state.latestGroundingId,
      latestPlanId: state.latestPlanId,
      latestProposalId: state.latestProposalId,
      latestDryRunId: state.latestDryRunId,
      latestPreflightId: state.latestPreflightId,
      latestAuthorizationGateId: state.latestAuthorizationGateId,
      latestApprovalRequestId: state.latestApprovalRequestId,
      latestApprovalId: state.latestApprovalId,
      latestConsentId: state.latestConsentId,
      latestDispatchRequestId: state.latestDispatchRequestId,
      latestExecutionResultId: state.latestExecutionResultId,
      latestMutationTrialId: state.latestMutationTrialId,
      latestFailureRecordId: state.latestFailureRecordId,
      latestTimeoutRecordId: state.latestTimeoutRecordId,
      latestRecoveryDecisionId: state.latestRecoveryDecisionId,
      latestRecoveryVerificationId: state.latestRecoveryVerificationId,
      repositoryMutationTrust: clone(state.repositoryMutationTrust),
      mutationTrialLock: clone(state.mutationTrialLock),
      lastPreDeviceValidation: clone(state.lastPreDeviceValidation),
      lastAndroidValidation: clone(state.lastAndroidValidation),
      lastPhase2Validation: clone(state.lastPhase2Validation),
      lastPhase2AndroidValidation: clone(state.lastPhase2AndroidValidation),
      lastPhase3Validation: clone(state.lastPhase3Validation),
      lastPhase3AndroidValidation: clone(state.lastPhase3AndroidValidation),
      lastPhase4Validation: clone(state.lastPhase4Validation),
      lastPhase4AndroidValidation: clone(state.lastPhase4AndroidValidation),
      lastPhase5Validation: clone(state.lastPhase5Validation),
      lastPhase5AndroidValidation: clone(state.lastPhase5AndroidValidation),
      lastPhase6Validation: clone(state.lastPhase6Validation),
      lastPhase6AndroidValidation: clone(state.lastPhase6AndroidValidation),
      lastPhase7Validation: clone(state.lastPhase7Validation),
      lastPhase7AndroidValidation: clone(state.lastPhase7AndroidValidation),
      lastPhase8Validation: clone(state.lastPhase8Validation),
      lastPhase8AndroidValidation: clone(state.lastPhase8AndroidValidation),
      lastPhase9Validation: clone(state.lastPhase9Validation),
      lastPhase9AndroidValidation: clone(state.lastPhase9AndroidValidation),
      lastPhase10Validation: clone(state.lastPhase10Validation),
      lastPhase10AndroidValidation: clone(state.lastPhase10AndroidValidation),
      ide190FinalReleaseReceipt: clone(state.ide190FinalReleaseReceipt),
      latestReflectionPackageId: state.latestReflectionPackageId,
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
      if (typeof namespace.initializePlanning === "function") results.push(namespace.initializePlanning());
      if (typeof namespace.initializeProposal === "function") results.push(namespace.initializeProposal());
      if (typeof namespace.initializeDryRun === "function") results.push(namespace.initializeDryRun());
      if (typeof namespace.initializePreflight === "function") results.push(namespace.initializePreflight());
      if (typeof namespace.initializeApproval === "function") results.push(namespace.initializeApproval());
      if (typeof namespace.initializeConsent === "function") results.push(namespace.initializeConsent());
      if (typeof namespace.initializeAuthorizationGate === "function") results.push(namespace.initializeAuthorizationGate());
      if (typeof namespace.initializeDispatch === "function") results.push(namespace.initializeDispatch());
      if (typeof namespace.initializeMutationTrial === "function") results.push(namespace.initializeMutationTrial());
      if (typeof namespace.initializeFailure === "function") results.push(namespace.initializeFailure());
      if (typeof namespace.initializeTimeout === "function") results.push(namespace.initializeTimeout());
      if (typeof namespace.initializeRecovery === "function") results.push(namespace.initializeRecovery());
      if (typeof namespace.initializeAutomationSession === "function") results.push(namespace.initializeAutomationSession());
      if (typeof namespace.initializeAutomationAudit === "function") results.push(namespace.initializeAutomationAudit());
      if (typeof namespace.initializeAutomationPersistence === "function") results.push(namespace.initializeAutomationPersistence());
      if (typeof namespace.initializeAutomationReceipt === "function") results.push(namespace.initializeAutomationReceipt());
      if (typeof namespace.initializePhase8Validation === "function") results.push(namespace.initializePhase8Validation());
      if (typeof namespace.initializeCrossDevice === "function") results.push(namespace.initializeCrossDevice());
      if (typeof namespace.initializeReflection === "function") results.push(namespace.initializeReflection());
      if (typeof namespace.initializeDevelopmentAutomationUI === "function") results.push(namespace.initializeDevelopmentAutomationUI());
      if (typeof namespace.initializePhase9Validation === "function") results.push(namespace.initializePhase9Validation());
      if (typeof namespace.initializePhase10Validation === "function") results.push(namespace.initializePhase10Validation());
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

  function markPhase3Validation(result) {
    state.lastPhase3Validation = clone(result);
    touch();
  }

  function markPhase3AndroidValidation(result) {
    state.lastPhase3AndroidValidation = clone(result);
    state.androidPhase3ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }


  function markPhase4Validation(result) {
    state.lastPhase4Validation = clone(result);
    touch();
  }

  function markPhase4AndroidValidation(result) {
    state.lastPhase4AndroidValidation = clone(result);
    state.androidPhase4ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }

  function markPhase5Validation(result) {
    state.lastPhase5Validation = clone(result);
    touch();
  }

  function markPhase5AndroidValidation(result) {
    state.lastPhase5AndroidValidation = clone(result);
    state.androidPhase5ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }

  function markPhase6Validation(result) {
    state.lastPhase6Validation = clone(result);
    touch();
  }

  function markPhase6AndroidValidation(result) {
    state.lastPhase6AndroidValidation = clone(result);
    state.androidPhase6ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }

  function markPhase7Validation(result) {
    state.lastPhase7Validation = clone(result);
    touch();
  }

  function markPhase7AndroidValidation(result) {
    state.lastPhase7AndroidValidation = clone(result);
    state.androidPhase7ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }

  function markPhase8Validation(result) {
    state.lastPhase8Validation = clone(result);
    touch();
  }

  function markPhase8AndroidValidation(result) {
    state.lastPhase8AndroidValidation = clone(result);
    state.androidPhase8ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0 && result.fullReloadValidated === true);
    touch();
  }

  function markPhase9Validation(result) {
    state.lastPhase9Validation = clone(result);
    touch();
  }

  function markPhase9AndroidValidation(result) {
    state.lastPhase9AndroidValidation = clone(result);
    state.androidPhase9ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0);
    touch();
  }

  function markPhase10Validation(result) {
    state.lastPhase10Validation = clone(result);
    touch();
  }

  function markPhase10AndroidValidation(result) {
    state.lastPhase10AndroidValidation = clone(result);
    state.androidPhase10ValidationPassed = Boolean(result && result.passed === result.total && result.criticalFailed === 0 && result.phaseGatePassed === true && result.releaseAllowed === true && result.ide190Complete === true);
    if (result && result.releaseReceipt) state.ide190FinalReleaseReceipt = clone(result.releaseReceipt);
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
      planningImplemented: typeof namespace.createAutomationPlan === "function",
      proposalImplemented: typeof namespace.createAutomationProposal === "function",
      dryRunImplemented: typeof namespace.runAutomationDryRun === "function",
      preflightImplemented: typeof namespace.runAutomationPreflight === "function",
      gateImplemented: typeof namespace.evaluateAuthorizationGate === "function",
      approvalImplemented: typeof namespace.requestAutomationApproval === "function" && typeof namespace.grantAutomationApproval === "function",
      consentImplemented: typeof namespace.recordAutomationConsent === "function",
      dispatchImplemented: typeof namespace.dispatchAutomationFromGate === "function",
      mutationImplemented: typeof namespace.executeAutomationControlledMutationTrial === "function",
      persistentMutationImplemented: false,
      recoveryImplemented: typeof namespace.createAutomationRecoveryDecision === "function" && typeof namespace.verifyAutomationRepositoryRecovery === "function",
      sessionImplemented: typeof namespace.createAutomationSession === "function",
      auditImplemented: typeof namespace.appendAutomationAuditEvent === "function",
      persistenceImplemented: typeof namespace.persistAutomationAuditEvent === "function" && typeof namespace.persistAutomationReceipt === "function",
      receiptImplemented: typeof namespace.buildAutomationReceipt === "function" && typeof namespace.restoreAutomationReceipt === "function",
      reflectionPackageImplemented: typeof namespace.prepareAutomationReflectionPackage === "function" && typeof namespace.buildAutomationReflectionZip === "function",
      uiImplemented: typeof namespace.getDevelopmentAutomationUIProjection === "function" && typeof namespace.openDevelopmentAutomationConsole === "function",
      crossDeviceImplemented: typeof namespace.validateAutomationCrossDeviceParity === "function",
      finalValidationImplemented: typeof namespace.runDevelopmentAutomationPhase10Validation === "function" && typeof namespace.runDevelopmentAutomationPhase10AndroidValidation === "function"
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
    markPhase2AndroidValidation: markPhase2AndroidValidation,
    markPhase3Validation: markPhase3Validation,
    markPhase3AndroidValidation: markPhase3AndroidValidation,
    markPhase4Validation: markPhase4Validation,
    markPhase4AndroidValidation: markPhase4AndroidValidation,
    markPhase5Validation: markPhase5Validation,
    markPhase5AndroidValidation: markPhase5AndroidValidation,
    markPhase6Validation: markPhase6Validation,
    markPhase6AndroidValidation: markPhase6AndroidValidation,
    markPhase7Validation: markPhase7Validation,
    markPhase7AndroidValidation: markPhase7AndroidValidation,
    markPhase8Validation: markPhase8Validation,
    markPhase8AndroidValidation: markPhase8AndroidValidation,
    markPhase9Validation: markPhase9Validation,
    markPhase9AndroidValidation: markPhase9AndroidValidation,
    markPhase10Validation: markPhase10Validation,
    markPhase10AndroidValidation: markPhase10AndroidValidation
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
    phase: 10,
    phaseName: "Integrated / Android Final Validation",
    designFreezeId: VERSION_MANIFEST.release.designFreezeId,
    safeAutomationOrchestrator: true,
    directMutation: false,
    dispatchImplemented: true,
    controlledMutationTrialImplemented: true,
    persistentCommitAllowed: false,
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
