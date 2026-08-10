/* ============================================================
   FILE: 13_knowledge_navigator_core.js
   IDE-180 Knowledge Navigator
   Release: 1.1.0 / Module: Core 1.1.0
   Phase 2: IDE-170 Package Intake / Provider Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("IDE-180 core blocked: Version Manifest is not loaded.");
    return;
  }

  const COMPONENT_ID = "IDE-180";
  const COMPONENT_NAME = "Knowledge Navigator";
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
        // Fall through to recursive clone for functions/contracts.
      }
    }
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Map) {
      const output = new Map();
      value.forEach(function copyMapItem(item, key) {
        output.set(key, clone(item));
      });
      return output;
    }
    if (value instanceof Set) {
      const output = new Set();
      value.forEach(function copySetItem(item) {
        output.add(clone(item));
      });
      return output;
    }
    if (isPlainObject(value)) {
      const output = {};
      Object.keys(value).forEach(function copyKey(key) {
        output[key] = clone(value[key]);
      });
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
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key], visited);
    });
    return Object.freeze(value);
  }

  function unique(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(function normalize(value) {
      return text(value, "");
    }).filter(Boolean)));
  }

  function canonicalId(value) {
    return text(value, "").toUpperCase().replace(/\s+/g, "-");
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

  const namespace = global.IDE180KnowledgeNavigator &&
    typeof global.IDE180KnowledgeNavigator === "object"
    ? global.IDE180KnowledgeNavigator
    : {};

  const internal = namespace.__internal && typeof namespace.__internal === "object"
    ? namespace.__internal
    : {};

  const state = internal.state && typeof internal.state === "object"
    ? internal.state
    : {
        contracts: new Map(),
        navigationTypes: new Map(),
        aliases: new Map(),
        providerDefinitions: new Map(),
        resolverDefinitions: new Map(),
        initialized: false,
        initializing: false,
        sequence: 0,
        lastValidation: null,
        lastError: null,
        updatedAt: null
      };

  if (!(state.contracts instanceof Map)) state.contracts = new Map();
  if (!(state.navigationTypes instanceof Map)) state.navigationTypes = new Map();
  if (!(state.aliases instanceof Map)) state.aliases = new Map();
  if (!(state.providerDefinitions instanceof Map)) state.providerDefinitions = new Map();
  if (!(state.resolverDefinitions instanceof Map)) state.resolverDefinitions = new Map();

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
      Object.keys(extras).forEach(function addExtra(key) {
        result[key] = clone(extras[key]);
      });
    }
    return result;
  }

  function getDependencyStatus() {
    const ide170Manifest = global.IDE170VersionManifest || null;
    const intelligence = global.IDE170Intelligence || null;
    const minimumVersion = VERSION_MANIFEST.compatibility.minimumIDE170Version;
    const releaseVersion = ide170Manifest && ide170Manifest.release && ide170Manifest.release.version || null;
    const releaseComparison = releaseVersion ? compareSemver(releaseVersion, minimumVersion) : null;
    const handoffContractVersion = ide170Manifest && ide170Manifest.contractVersions && ide170Manifest.contractVersions.ide180Handoff || null;
    const requiredHandoffContractVersion = VERSION_MANIFEST.compatibility.requiredIDE170HandoffContractVersion;

    return {
      ide170ManifestLoaded: Boolean(ide170Manifest),
      ide170RuntimeLoaded: Boolean(intelligence),
      ide170ReleaseVersion: releaseVersion,
      minimumIDE170Version: minimumVersion,
      ide170VersionCompatible: releaseComparison != null && releaseComparison >= 0,
      ide170HandoffContractVersion: handoffContractVersion,
      requiredIDE170HandoffContractVersion: requiredHandoffContractVersion,
      ide170HandoffContractCompatible: handoffContractVersion === requiredHandoffContractVersion,
      ide170HandoffApiAvailable: Boolean(intelligence && typeof intelligence.buildIDE180HandoffContract === "function"),
      ide170QueryInterpreterAvailable: Boolean(intelligence && typeof intelligence.interpretQuery === "function")
    };
  }

  function getSafetyStatus() {
    return clone(VERSION_MANIFEST.safety);
  }

  function getStatus() {
    const dependency = getDependencyStatus();
    const moduleStatuses = {};
    Object.keys(namespace.modules || {}).forEach(function mapModule(key) {
      const module = namespace.modules[key];
      moduleStatuses[key] = module && module.status || "Unknown";
    });
    return {
      componentId: COMPONENT_ID,
      componentName: COMPONENT_NAME,
      version: RELEASE_VERSION,
      moduleVersion: MODULE_VERSION,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeVersion: VERSION_MANIFEST.release.designFreezeVersion,
      initialized: state.initialized === true,
      contractCount: state.contracts.size,
      navigationTypeCount: state.navigationTypes.size,
      aliasCount: state.aliases.size,
      providerDefinitionCount: state.providerDefinitions.size,
      resolverDefinitionCount: state.resolverDefinitions.size,
      readOnly: true,
      safety: getSafetyStatus(),
      dependency: dependency,
      modules: moduleStatuses,
      lastValidation: clone(state.lastValidation),
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt
    };
  }

  function initialize(options) {
    const settings = isPlainObject(options) ? options : {};
    if (state.initializing) {
      return buildResult(false, "IDE180_INITIALIZATION_IN_PROGRESS", "Blocked", getStatus());
    }

    state.initializing = true;
    state.lastError = null;

    try {
      const dependency = getDependencyStatus();
      if (settings.requireIDE170 !== false) {
        if (!dependency.ide170ManifestLoaded || !dependency.ide170VersionCompatible || !dependency.ide170HandoffContractCompatible) {
          const error = {
            message: "IDE-170 compatibility requirement is not satisfied.",
            category: "Compatibility Failure",
            dependency: dependency
          };
          state.lastError = error;
          return buildResult(false, "IDE180_IDE170_COMPATIBILITY_REQUIRED", "Blocked", getStatus(), { error: error });
        }
      }

      const results = [];
      if (typeof namespace.initializeContracts === "function") {
        results.push(namespace.initializeContracts());
      }
      if (typeof namespace.initializeRegistry === "function") {
        results.push(namespace.initializeRegistry());
      }
      if (typeof namespace.initializeIntelligenceProvider === "function") {
        results.push(namespace.initializeIntelligenceProvider());
      }

      const failed = results.filter(function failedResult(result) {
        return !result || result.ok !== true;
      });

      state.initialized = failed.length === 0;
      touch();

      return buildResult(
        state.initialized,
        state.initialized ? "IDE180_FOUNDATION_INITIALIZED" : "IDE180_FOUNDATION_INITIALIZATION_FAILED",
        state.initialized ? "Ready" : "Blocked",
        { status: getStatus(), moduleInitialization: results }
      );
    } catch (error) {
      state.initialized = false;
      state.lastError = {
        message: error && error.message ? error.message : String(error),
        category: "Initialization Failure"
      };
      touch();
      return buildResult(false, "IDE180_FOUNDATION_INITIALIZATION_EXCEPTION", "Blocked", getStatus(), { error: state.lastError });
    } finally {
      state.initializing = false;
    }
  }

  namespace.api = namespace.api && typeof namespace.api === "object" ? namespace.api : {};
  namespace.modules = namespace.modules && typeof namespace.modules === "object" ? namespace.modules : {};

  Object.assign(internal, {
    state: state,
    nowIso: nowIso,
    text: text,
    isPlainObject: isPlainObject,
    clone: clone,
    deepFreeze: deepFreeze,
    unique: unique,
    canonicalId: canonicalId,
    parseSemver: parseSemver,
    compareSemver: compareSemver,
    nextId: nextId,
    touch: touch,
    buildResult: buildResult
  });

  namespace.__internal = internal;

  Object.assign(namespace.api, {
    initialize: initialize,
    getStatus: getStatus,
    getDependencyStatus: getDependencyStatus,
    getSafetyStatus: getSafetyStatus
  });

  Object.assign(namespace, namespace.api);

  namespace.modules.core = {
    id: "IDE-180-CORE",
    version: MODULE_VERSION,
    status: "Loaded",
    readOnly: true,
    contractDriven: true,
    designFreezeVersion: VERSION_MANIFEST.release.designFreezeVersion,
    loadedAt: nowIso()
  };

  global.IDE180KnowledgeNavigator = namespace;
  global.initializeKnowledgeNavigator = initialize;
  global.initializeKnowledgeNavigatorFoundation = initialize;
  global.getKnowledgeNavigatorStatus = getStatus;
  global.getKnowledgeNavigatorDependencyStatus = getDependencyStatus;
})(typeof window !== "undefined" ? window : globalThis);
