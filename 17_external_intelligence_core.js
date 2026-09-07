/* ============================================================
   FILE: 17_external_intelligence_core.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.1.0
   Phase 02: Runtime / Gateway / Software Supply Chain Foundation
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 core blocked: Version Manifest is not loaded.");
    return;
  }

  const namespace = global.EXTERNAL010ExternalIntelligence &&
    typeof global.EXTERNAL010ExternalIntelligence === "object"
    ? global.EXTERNAL010ExternalIntelligence
    : {};

  const previousInternal = namespace.__internal && typeof namespace.__internal === "object"
    ? namespace.__internal
    : {};

  const state = previousInternal.state && typeof previousInternal.state === "object"
    ? previousInternal.state
    : {
        contracts: new Map(),
        schemas: new Map(),
        projectionAdapters: new Map(),
        authorityEnvelopes: new Map(),
        auditEvents: new Map(),
        auditOrder: [],
        runtimeInstances: new Map(),
        runtimeLeases: new Map(),
        workClaims: new Map(),
        dependencyCandidates: new Map(),
        runtimeProfiles: new Map(),
        auditPersistenceAdapter: null,
        authorityApprovalAdapter: null,
        initialized: false,
        initializing: false,
        sequence: 0,
        latestValidation: null,
        latestPhase2Validation: null,
        gatewayClientState: { baseUrl: null, healthState: "UNKNOWN", session: null, lastError: null, lastCheckedAt: null },
        lastError: null,
        updatedAt: null
      };

  ["contracts", "schemas", "projectionAdapters", "authorityEnvelopes", "auditEvents", "runtimeInstances", "runtimeLeases", "workClaims", "dependencyCandidates", "runtimeProfiles"].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });
  if (!Array.isArray(state.auditOrder)) state.auditOrder = [];
  if (!Number.isInteger(state.sequence)) state.sequence = 0;

  function nowIso() { return new Date().toISOString(); }

  function text(value, fallback) {
    const output = value == null ? "" : String(value).trim();
    return output || (fallback == null ? "" : String(fallback));
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function clone(value) {
    if (value == null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp) return new RegExp(value.source, value.flags);
    if (value instanceof Map) {
      const output = new Map();
      value.forEach(function copyMapItem(item, key) { output.set(key, clone(item)); });
      return output;
    }
    const output = {};
    Object.keys(value).forEach(function copyKey(key) { output[key] = clone(value[key]); });
    return output;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  function unique(values) {
    const output = [];
    (Array.isArray(values) ? values : []).forEach(function add(value) {
      const normalized = text(value, "");
      if (normalized && !output.includes(normalized)) output.push(normalized);
    });
    return output;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function sortKey(key) { output[key] = stableValue(value[key]); });
    return output;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  function nextId(prefix) {
    state.sequence += 1;
    return text(prefix, "EXTERNAL-010") + "-" + Date.now().toString(36).toUpperCase() + "-" + String(state.sequence).padStart(4, "0");
  }

  function touch() { state.updatedAt = nowIso(); }

  function buildResult(ok, code, status, data, extras) {
    const result = {
      ok: ok === true,
      code: text(code, ok ? "EXTERNAL010_OK" : "EXTERNAL010_FAILED"),
      status: text(status, ok ? "Ready" : "Blocked"),
      componentId: VERSION_MANIFEST.componentId,
      version: VERSION_MANIFEST.release.version,
      data: data == null ? null : clone(data),
      checkedAt: nowIso()
    };
    if (isPlainObject(extras)) Object.assign(result, clone(extras));
    return result;
  }

  const SENSITIVE_KEY_PATTERN = /(secret|token|password|credential|authorization|api[_-]?key|private[_-]?key|session[_-]?key)/i;

  function redactSensitive(value, keyHint) {
    if (SENSITIVE_KEY_PATTERN.test(text(keyHint, ""))) return "[REDACTED]";
    if (Array.isArray(value)) return value.map(function redactArray(item) { return redactSensitive(item, ""); });
    if (!isPlainObject(value)) return value;
    const output = {};
    Object.keys(value).forEach(function redactKey(key) {
      output[key] = redactSensitive(value[key], key);
    });
    return output;
  }

  function getFoundationState() {
    return {
      componentId: VERSION_MANIFEST.componentId,
      componentName: VERSION_MANIFEST.componentName,
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      decisionRange: VERSION_MANIFEST.release.decisionRange,
      decisionCount: VERSION_MANIFEST.release.decisionCount,
      initialized: state.initialized === true,
      contractCount: state.contracts.size,
      schemaCount: state.schemas.size,
      authorityEnvelopeCount: state.authorityEnvelopes.size,
      auditEventCount: state.auditEvents.size,
      runtimeInstanceCount: state.runtimeInstances.size,
      dependencyCandidateCount: state.dependencyCandidates.size,
      runtimeProfileCount: state.runtimeProfiles.size,
      gateway: state.gatewayClientState ? { baseUrl: state.gatewayClientState.baseUrl || null, healthState: state.gatewayClientState.healthState || "UNKNOWN", sessionActive: Boolean(state.gatewayClientState.session && state.gatewayClientState.session.state === "ACTIVE"), lastCheckedAt: state.gatewayClientState.lastCheckedAt || null } : null,
      safety: clone(VERSION_MANIFEST.safety),
      updatedAt: state.updatedAt || null
    };
  }

  async function initializeExternalIntelligenceFoundation() {
    if (state.initializing) return buildResult(false, "EXTERNAL010_FOUNDATION_INITIALIZATION_IN_PROGRESS", "Blocked", getFoundationState());
    state.initializing = true;
    const steps = [];
    try {
      const initializers = [
        ["contracts", namespace.initializeExternalIntelligenceContracts],
        ["schemas", namespace.initializeExternalIntelligenceSchemaRegistry],
        ["authority", namespace.initializeExternalIntelligenceAuthority],
        ["audit", namespace.initializeExternalIntelligenceAudit],
        ["runtimeCoordination", namespace.initializeExternalIntelligenceRuntimeCoordination],
        ["softwareSupplyChain", namespace.initializeExternalIntelligenceSoftwareSupplyChain],
        ["gatewayClient", namespace.initializeExternalIntelligenceGatewayClient]
      ];
      for (const item of initializers) {
        const name = item[0];
        const fn = item[1];
        if (typeof fn !== "function") {
          steps.push({ module: name, ok: false, code: "NOT_LOADED" });
          continue;
        }
        const result = await fn();
        steps.push({ module: name, ok: Boolean(result && result.ok), code: result && result.code || null });
      }
      const failed = steps.filter(function failedStep(item) { return !item.ok; });
      state.initialized = failed.length === 0;
      state.lastError = failed.length ? "One or more foundation modules failed initialization." : null;
      touch();
      return buildResult(failed.length === 0,
        failed.length ? "EXTERNAL010_FOUNDATION_INITIALIZATION_FAILED" : "EXTERNAL010_FOUNDATION_INITIALIZED",
        failed.length ? "Blocked" : "Ready",
        { foundation: getFoundationState(), steps: steps });
    } catch (error) {
      state.initialized = false;
      state.lastError = error && error.message ? error.message : String(error);
      touch();
      return buildResult(false, "EXTERNAL010_FOUNDATION_INITIALIZATION_EXCEPTION", "Failed", getFoundationState(), {
        error: { message: state.lastError, category: "Initialization" }
      });
    } finally {
      state.initializing = false;
    }
  }

  const internal = Object.assign(previousInternal, {
    state: state,
    nowIso: nowIso,
    text: text,
    isPlainObject: isPlainObject,
    clone: clone,
    deepFreeze: deepFreeze,
    unique: unique,
    stableStringify: stableStringify,
    nextId: nextId,
    touch: touch,
    buildResult: buildResult,
    redactSensitive: redactSensitive
  });

  const api = namespace.api && typeof namespace.api === "object" ? namespace.api : {};
  Object.assign(api, {
    initializeExternalIntelligenceFoundation: initializeExternalIntelligenceFoundation,
    getExternalIntelligenceFoundationState: getFoundationState
  });

  Object.assign(namespace, {
    componentId: VERSION_MANIFEST.componentId,
    componentName: VERSION_MANIFEST.componentName,
    version: VERSION_MANIFEST.release.version,
    versionManifest: VERSION_MANIFEST,
    modules: namespace.modules && typeof namespace.modules === "object" ? namespace.modules : {},
    api: api,
    __internal: internal,
    initializeExternalIntelligenceFoundation: initializeExternalIntelligenceFoundation,
    getExternalIntelligenceFoundationState: getFoundationState
  });

  namespace.modules.core = {
    id: "EXTERNAL-010-CORE",
    version: VERSION_MANIFEST.getModuleVersion("core"),
    status: "Loaded",
    phase: 2,
    directRepositoryMutationAllowed: false,
    loadedAt: nowIso()
  };

  global.EXTERNAL010ExternalIntelligence = namespace;
  global.initializeExternalIntelligenceFoundation = initializeExternalIntelligenceFoundation;
  global.getExternalIntelligenceFoundationState = getFoundationState;
})(typeof window !== "undefined" ? window : globalThis);
