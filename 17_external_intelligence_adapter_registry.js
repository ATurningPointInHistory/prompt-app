/* ============================================================
   FILE: 17_external_intelligence_adapter_registry.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 04: Common Source Adapter Contract / Registry
   Decisions: 002 / 015
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 adapter registry blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("adapterRegistry");
  const REQUIRED_METHODS = ["validateRequest", "acquire", "normalizeResponseMetadata", "extractTemporalMetadata", "sanitize", "buildEvidenceInput"];

  function upper(value, fallback) { return internal.text(value, fallback || "").toUpperCase().replace(/[^A-Z0-9_:-]/g, "_"); }

  const EVIDENCE_SENSITIVE_KEY = /(secret|token|password|credential|authorization|api[_-]?key|private[_-]?key|session[_-]?key)/i;
  function stripSensitiveEvidenceFields(value) {
    if (Array.isArray(value)) return value.map(stripSensitiveEvidenceFields);
    if (!internal.isPlainObject(value)) return value;
    const output = {};
    Object.keys(value).forEach(function keepSafeEvidenceField(key) {
      if (EVIDENCE_SENSITIVE_KEY.test(key)) return;
      output[key] = stripSensitiveEvidenceFields(value[key]);
    });
    return output;
  }

  function validateAdapterImplementation(adapter) {
    const errors = [];
    REQUIRED_METHODS.forEach(function required(name) { if (!adapter || typeof adapter[name] !== "function") errors.push("METHOD_REQUIRED:" + name); });
    return errors;
  }

  function normalizeDefinition(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      adapterId: internal.text(source.adapterId, ""),
      adapterVersion: internal.text(source.adapterVersion, ""),
      adapterType: upper(source.adapterType, "CUSTOM"),
      supportedSourceTypes: internal.unique(source.supportedSourceTypes).map(function sourceType(v) { return upper(v, ""); }),
      supportedOperations: internal.unique(source.supportedOperations).map(function op(v) { return upper(v, ""); }),
      runtimeTargets: internal.unique(source.runtimeTargets).map(function runtime(v) { return upper(v, ""); }),
      status: upper(source.status, "READY"),
      testOnly: source.testOnly === true,
      sourceAuthorityGranted: false,
      repositoryAuthorityGranted: false,
      financialAuthorityGranted: false,
      reliabilityAuthorityGranted: false,
      automaticRetryAllowed: false,
      arbitraryUrlAllowed: false,
      createdAt: internal.nowIso(),
      immutable: true
    };
  }

  function registerAdapter(input, implementation) {
    const definition = normalizeDefinition(input);
    const errors = validateAdapterImplementation(implementation);
    if (!/^EXTERNAL-010-ADAPTER-[A-Z0-9-]+$/.test(definition.adapterId)) errors.push("ADAPTER_ID_INVALID");
    if (!definition.adapterVersion) errors.push("ADAPTER_VERSION_REQUIRED");
    if (!definition.runtimeTargets.length) errors.push("RUNTIME_TARGET_REQUIRED");
    if (state.adapterRegistry.has(definition.adapterId)) {
      const existing = state.adapterRegistry.get(definition.adapterId);
      const same = existing.adapterVersion === definition.adapterVersion;
      return internal.buildResult(same, same ? "EXTERNAL010_ADAPTER_ALREADY_REGISTERED" : "EXTERNAL010_ADAPTER_DUPLICATE_CONFLICT", same ? "Ready" : "Blocked", { adapter: internal.clone(existing) });
    }
    if (errors.length) return internal.buildResult(false, "EXTERNAL010_ADAPTER_DEFINITION_INVALID", "Blocked", { errors: errors });
    const contract = namespace.validateExternalIntelligenceContract("sourceAdapterDefinition", definition);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SOURCE-ADAPTER-DEFINITION", definition);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_ADAPTER_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(definition));
    state.adapterRegistry.set(definition.adapterId, frozen);
    state.adapterImplementations.set(definition.adapterId, implementation);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ADAPTER_REGISTERED", "Ready", { adapter: internal.clone(frozen) });
  }

  function getExternalIntelligenceSourceAdapter(adapterId) {
    const record = state.adapterRegistry.get(internal.text(adapterId, ""));
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceSourceAdapters() {
    return Array.from(state.adapterRegistry.values()).map(internal.clone);
  }

  function mapFetchError(error, context) {
    const message = error && error.message ? String(error.message) : String(error || "External request failed");
    const name = error && error.name ? String(error.name) : "";
    let category = "SOURCE_UNAVAILABLE";
    let code = "SOURCE_UNAVAILABLE";
    let retryable = true;
    if (name === "AbortError") { category = "TIMEOUT"; code = "TIMEOUT"; retryable = true; }
    if (/json|parse/i.test(message)) { category = "INVALID_RESPONSE"; code = "INVALID_RESPONSE"; retryable = false; }
    return { errorCode: code, category: category, message: message, retryable: retryable, rawProviderStatus: context && context.status || null };
  }

  function buildMockAdapter() {
    return {
      validateRequest: function validateRequest(context) {
        return { valid: Boolean(context && context.request && context.route), errors: [] };
      },
      acquire: async function acquire(context) {
        const parameters = context.request.parameters || {};
        if (parameters.__mockFailureCategory) {
          const category = upper(parameters.__mockFailureCategory, "SOURCE_UNAVAILABLE");
          const retryable = ["TIMEOUT", "TEMPORARY_SOURCE_UNAVAILABLE", "SOURCE_UNAVAILABLE", "RATE_LIMITED"].includes(category);
          const error = new Error("Mock adapter forced failure: " + category);
          error.externalCategory = category;
          error.retryable = retryable;
          throw error;
        }
        return {
          status: 200,
          contentType: "application/json",
          payload: { ok: true, mock: true, sourceId: context.request.sourceId, operationId: context.request.operationId, parameters: internal.clone(parameters) },
          providerRequestId: "MOCK-" + context.attempt.attemptId,
          headers: {},
          observedAt: internal.nowIso()
        };
      },
      normalizeResponseMetadata: function normalizeResponseMetadata(raw) {
        const text = JSON.stringify(raw && raw.payload == null ? null : raw.payload);
        return { status: raw.status || 200, contentType: raw.contentType || "application/json", responseSize: text.length, providerRequestId: raw.providerRequestId || null, rateLimitMetadata: {} };
      },
      extractTemporalMetadata: function extractTemporalMetadata(raw) { return { observedAt: raw.observedAt || internal.nowIso(), publishedAt: null, availableAt: null, effectiveAt: null }; },
      sanitize: function sanitize(raw) { return internal.redactSensitive(raw); },
      buildEvidenceInput: function buildEvidenceInput(context) { return { requestId: context.request.requestId, attemptId: context.attempt.attemptId, sourceId: context.request.sourceId, operationId: context.request.operationId, adapterId: context.adapter.adapterId, adapterVersion: context.adapter.adapterVersion, payload: internal.redactSensitive(context.raw.payload), rawText: typeof context.raw.rawText === "string" ? context.raw.rawText : internal.stableStringify(context.raw.payload), responseMetadata: internal.clone(context.responseMetadata), temporalMetadata: internal.clone(context.temporalMetadata), persistenceAuthorityGranted: false }; }
    };
  }

  function buildBrowserHttpJsonAdapter() {
    return {
      validateRequest: function validateRequest(context) {
        const errors = [];
        if (!context || !context.route || context.route.runtimeTarget !== "BROWSER") errors.push("BROWSER_RUNTIME_REQUIRED");
        const endpoint = context && context.operationContract && context.operationContract.endpoint && context.operationContract.endpoint.exactUrl;
        if (!endpoint) errors.push("REGISTERED_ENDPOINT_REQUIRED");
        if (context && context.operationContract && context.operationContract.method !== "GET") errors.push("GET_ONLY_PHASE4");
        if (context && context.source && context.source.authenticationMode !== "NONE") errors.push("BROWSER_SECRET_AUTH_BLOCKED");
        return { valid: errors.length === 0, errors: errors };
      },
      acquire: async function acquire(context) {
        if (typeof global.fetch !== "function") throw Object.assign(new Error("Browser fetch unavailable"), { externalCategory: "SOURCE_UNAVAILABLE", retryable: true });
        const endpoint = context.operationContract.endpoint.exactUrl;
        const url = new URL(endpoint);
        Object.keys(context.request.parameters || {}).sort().forEach(function addParameter(key) {
          const value = context.request.parameters[key];
          if (value != null) url.searchParams.set(key, String(value));
        });
        const timeoutMs = context.request.timeoutPolicy.timeoutMs;
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller ? setTimeout(function abort() { controller.abort(); }, timeoutMs) : null;
        try {
          const response = await global.fetch(url.toString(), { method: "GET", mode: "cors", cache: "no-store", credentials: "omit", redirect: context.source.endpointPolicy.allowRedirects ? "follow" : "error", signal: controller ? controller.signal : undefined, headers: { Accept: "application/json" } });
          const text = await response.text();
          let payload = null;
          try { payload = text ? JSON.parse(text) : null; } catch (error) { throw Object.assign(error, { externalCategory: "INVALID_RESPONSE", retryable: false, rawProviderStatus: response.status }); }
          if (!response.ok) {
            const category = response.status === 429 ? "RATE_LIMITED" : response.status === 401 || response.status === 403 ? "AUTHENTICATION_FAILED" : response.status >= 500 ? "TEMPORARY_SOURCE_UNAVAILABLE" : "INVALID_RESPONSE";
            throw Object.assign(new Error("HTTP " + response.status), { externalCategory: category, retryable: response.status === 429 || response.status >= 500, rawProviderStatus: response.status });
          }
          return { status: response.status, contentType: response.headers.get("content-type") || "application/json", payload: payload, rawText: text, providerRequestId: response.headers.get("x-request-id") || null, headers: { etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified") }, observedAt: internal.nowIso() };
        } finally { if (timer) clearTimeout(timer); }
      },
      normalizeResponseMetadata: function normalizeResponseMetadata(raw) { const text = JSON.stringify(raw.payload == null ? null : raw.payload); return { status: raw.status, contentType: raw.contentType, responseSize: text.length, providerRequestId: raw.providerRequestId || null, rateLimitMetadata: {} }; },
      extractTemporalMetadata: function extractTemporalMetadata(raw) { return { observedAt: raw.observedAt || internal.nowIso(), publishedAt: null, availableAt: null, effectiveAt: null, providerLastModified: raw.headers && raw.headers.lastModified || null }; },
      sanitize: function sanitize(raw) { return internal.redactSensitive(raw); },
      buildEvidenceInput: function buildEvidenceInput(context) { return { requestId: context.request.requestId, attemptId: context.attempt.attemptId, sourceId: context.request.sourceId, operationId: context.request.operationId, adapterId: context.adapter.adapterId, adapterVersion: context.adapter.adapterVersion, payload: internal.redactSensitive(context.raw.payload), rawText: typeof context.raw.rawText === "string" ? context.raw.rawText : internal.stableStringify(context.raw.payload), responseMetadata: internal.clone(context.responseMetadata), temporalMetadata: internal.clone(context.temporalMetadata), persistenceAuthorityGranted: false }; }
    };
  }

  function buildLocalGatewayAdapter() {
    return {
      validateRequest: function validateRequest(context) {
        const errors = [];
        if (!context || !context.route || context.route.runtimeTarget !== "LOCAL_GATEWAY") errors.push("LOCAL_GATEWAY_RUNTIME_REQUIRED");
        if (typeof state.gatewayAcquisitionExecutor !== "function") errors.push("GATEWAY_ACQUISITION_EXECUTOR_UNAVAILABLE");
        return { valid: errors.length === 0, errors: errors };
      },
      acquire: async function acquire(context) {
        if (typeof state.gatewayAcquisitionExecutor !== "function") throw Object.assign(new Error("Governed Gateway acquisition executor unavailable"), { externalCategory: "SOURCE_UNAVAILABLE", retryable: true });
        return state.gatewayAcquisitionExecutor({ request: internal.clone(context.request), source: internal.clone(context.source), operationContract: internal.clone(context.operationContract), route: internal.clone(context.route), attempt: internal.clone(context.attempt) });
      },
      normalizeResponseMetadata: function normalizeResponseMetadata(raw) { return internal.redactSensitive(raw && raw.responseMetadata || { status: raw && raw.status || 200, contentType: raw && raw.contentType || null, responseSize: raw && raw.responseSize || 0, providerRequestId: raw && raw.providerRequestId || null, rateLimitMetadata: {} }); },
      extractTemporalMetadata: function extractTemporalMetadata(raw) { return internal.clone(raw && raw.temporalMetadata || { observedAt: internal.nowIso(), publishedAt: null, availableAt: null, effectiveAt: null }); },
      sanitize: function sanitize(raw) { return internal.redactSensitive(raw); },
      buildEvidenceInput: function buildEvidenceInput(context) { return { requestId: context.request.requestId, attemptId: context.attempt.attemptId, sourceId: context.request.sourceId, operationId: context.request.operationId, adapterId: context.adapter.adapterId, adapterVersion: context.adapter.adapterVersion, payload: stripSensitiveEvidenceFields(internal.redactSensitive(context.raw && context.raw.payload)), rawText: context.raw && typeof context.raw.rawText === "string" ? context.raw.rawText : internal.stableStringify(context.raw && context.raw.payload), responseMetadata: internal.clone(context.responseMetadata), temporalMetadata: internal.clone(context.temporalMetadata), persistenceAuthorityGranted: false }; }
    };
  }

  function setExternalIntelligenceGatewayAcquisitionExecutor(executor) {
    if (executor == null) { state.gatewayAcquisitionExecutor = null; internal.touch(); return internal.buildResult(true, "EXTERNAL010_GATEWAY_ACQUISITION_EXECUTOR_CLEARED", "Ready", null); }
    if (typeof executor !== "function") return internal.buildResult(false, "EXTERNAL010_GATEWAY_ACQUISITION_EXECUTOR_INVALID", "Blocked", null);
    state.gatewayAcquisitionExecutor = executor;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_GATEWAY_ACQUISITION_EXECUTOR_SET", "Ready", { authorityGranted: false, arbitraryProxyEnabled: false });
  }

  async function invokeAdapter(context) {
    const adapterId = context && context.route && context.route.adapterId;
    const adapterDefinition = state.adapterRegistry.get(adapterId);
    const implementation = state.adapterImplementations.get(adapterId);
    if (!adapterDefinition || !implementation) return internal.buildResult(false, "EXTERNAL010_ADAPTER_NOT_REGISTERED", "Blocked", { adapterId: adapterId || null });
    const requestValidation = implementation.validateRequest(context);
    if (!requestValidation || requestValidation.valid !== true) return internal.buildResult(false, "EXTERNAL010_ADAPTER_REQUEST_INVALID", "Blocked", { adapterId: adapterId, errors: requestValidation && requestValidation.errors || [] });
    try {
      const raw = await implementation.acquire(context);
      const sanitized = implementation.sanitize(raw, context);
      const responseMetadata = implementation.normalizeResponseMetadata(sanitized, context);
      const temporalMetadata = implementation.extractTemporalMetadata(sanitized, context);
      const evidenceInput = implementation.buildEvidenceInput(Object.assign({}, context, { raw: sanitized, responseMetadata: responseMetadata, temporalMetadata: temporalMetadata }));
      return internal.buildResult(true, "EXTERNAL010_ADAPTER_ACQUISITION_SUCCESS", "Ready", { adapter: internal.clone(adapterDefinition), raw: sanitized, responseMetadata: responseMetadata, temporalMetadata: temporalMetadata, evidenceInput: evidenceInput, authorityGranted: false });
    } catch (error) {
      const category = upper(error && error.externalCategory, "SOURCE_UNAVAILABLE");
      const mapped = mapFetchError(error, { status: error && error.rawProviderStatus });
      mapped.category = category;
      mapped.errorCode = category;
      mapped.retryable = error && typeof error.retryable === "boolean" ? error.retryable : mapped.retryable;
      return internal.buildResult(false, "EXTERNAL010_ADAPTER_ACQUISITION_FAILED", "Failed", { adapterId: adapterId, error: internal.redactSensitive(mapped) });
    }
  }

  function initializeExternalIntelligenceAdapterRegistry() {
    const results = [];
    results.push(registerAdapter({ adapterId: "EXTERNAL-010-ADAPTER-MOCK-001", adapterVersion: "1.0.0", adapterType: "MOCK", supportedSourceTypes: ["OTHER", "PUBLIC_API"], supportedOperations: ["*"], runtimeTargets: ["TEST"], status: "READY", testOnly: true }, buildMockAdapter()));
    results.push(registerAdapter({ adapterId: "EXTERNAL-010-ADAPTER-HTTP-JSON-BROWSER-001", adapterVersion: "1.0.0", adapterType: "HTTP_JSON", supportedSourceTypes: ["PUBLIC_API", "GOVERNMENT_DATA", "DATASET"], supportedOperations: ["READ"], runtimeTargets: ["BROWSER"], status: "READY" }, buildBrowserHttpJsonAdapter()));
    results.push(registerAdapter({ adapterId: "EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001", adapterVersion: "1.0.0", adapterType: "LOCAL_GATEWAY", supportedSourceTypes: ["PUBLIC_API", "MARKET_DATA", "FINANCIAL_DATA", "NEWS", "RSS", "WEB_PAGE", "SEARCH", "GITHUB", "GOVERNMENT_DATA", "TECHNICAL_DOCUMENTATION", "AI_SERVICE", "DATASET", "OTHER"], supportedOperations: ["*"], runtimeTargets: ["LOCAL_GATEWAY"], status: "DEGRADED" }, buildLocalGatewayAdapter()));
    const failed = results.filter(function fail(result) { return !result.ok; });
    namespace.modules.adapterRegistry.status = failed.length ? "Blocked" : "Ready";
    return internal.buildResult(failed.length === 0, failed.length ? "EXTERNAL010_ADAPTER_REGISTRY_INITIALIZATION_FAILED" : "EXTERNAL010_ADAPTER_REGISTRY_INITIALIZED", failed.length ? "Blocked" : "Ready", { adapterCount: state.adapterRegistry.size, results: results, adapterDirectInvocationAsNormalFlow: false });
  }

  internal.invokeExternalIntelligenceAdapter = invokeAdapter;

  Object.assign(namespace.api, {
    initializeExternalIntelligenceAdapterRegistry: initializeExternalIntelligenceAdapterRegistry,
    getExternalIntelligenceSourceAdapter: getExternalIntelligenceSourceAdapter,
    listExternalIntelligenceSourceAdapters: listExternalIntelligenceSourceAdapters,
    setExternalIntelligenceGatewayAcquisitionExecutor: setExternalIntelligenceGatewayAcquisitionExecutor
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.adapterRegistry = {
    id: "EXTERNAL-010-ADAPTER-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    commonAdapterContract: true,
    adapterDirectInvocationAsNormalFlow: false,
    arbitraryUrlAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
