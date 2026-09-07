/* ============================================================
   FILE: 17_external_intelligence_gateway_client.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.1.0
   Phase 02: Runtime / Gateway / Software Supply Chain Foundation
   Decisions: 011 / 013 / 054
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 gateway client blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("gatewayClient");
  let sessionToken = null;
  let sessionMetadata = null;
  let baseUrl = VERSION_MANIFEST.gateway.defaultBaseUrl;

  function sanitizeBaseUrl(value) {
    const text = internal.text(value, VERSION_MANIFEST.gateway.defaultBaseUrl).replace(/\/+$/, "");
    try {
      const url = new URL(text);
      const host = url.hostname.toLowerCase();
      const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
      if (url.protocol !== "http:" || !loopback) return null;
      return url.origin;
    } catch (_) {
      return null;
    }
  }

  function updateClientState(patch) {
    const current = state.gatewayClientState && internal.isPlainObject(state.gatewayClientState) ? state.gatewayClientState : {};
    state.gatewayClientState = Object.assign({}, current, internal.clone(patch || {}));
    state.gatewayClientState.session = sessionMetadata ? internal.clone(sessionMetadata) : null;
    state.gatewayClientState.baseUrl = baseUrl;
    internal.touch();
  }

  function getClientState() {
    return internal.clone({
      baseUrl: baseUrl,
      healthState: state.gatewayClientState && state.gatewayClientState.healthState || "UNKNOWN",
      session: sessionMetadata ? internal.clone(sessionMetadata) : null,
      sessionTokenPresentInMemory: Boolean(sessionToken),
      sessionTokenPersisted: false,
      lastError: state.gatewayClientState && state.gatewayClientState.lastError || null,
      lastCheckedAt: state.gatewayClientState && state.gatewayClientState.lastCheckedAt || null
    });
  }

  function configureGatewayClient(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const next = sanitizeBaseUrl(settings.baseUrl || baseUrl);
    if (!next) return internal.buildResult(false, "EXTERNAL010_GATEWAY_BASE_URL_INVALID", "Blocked", { loopbackOnly: true });
    if (next !== baseUrl) clearSessionLocal("BASE_URL_CHANGED");
    baseUrl = next;
    updateClientState({ baseUrl: baseUrl, lastError: null });
    return internal.buildResult(true, "EXTERNAL010_GATEWAY_CLIENT_CONFIGURED", "Ready", { baseUrl: baseUrl, loopbackOnly: true });
  }

  async function getLoopbackPermissionState() {
    if (!global.navigator || !global.navigator.permissions || typeof global.navigator.permissions.query !== "function") {
      return { supported: false, permission: "unknown", name: "loopback-network" };
    }
    try {
      const result = await global.navigator.permissions.query({ name: "loopback-network" });
      return { supported: true, permission: result && result.state || "unknown", name: "loopback-network" };
    } catch (_) {
      return { supported: false, permission: "unknown", name: "loopback-network" };
    }
  }

  function buildRequest(url, init) {
    const settings = Object.assign({ mode: "cors", cache: "no-store" }, init || {});
    try {
      return new Request(url, Object.assign({}, settings, { targetAddressSpace: "loopback" }));
    } catch (_) {
      return new Request(url, settings);
    }
  }

  async function fetchJson(path, init) {
    const url = baseUrl + path;
    const response = await global.fetch(buildRequest(url, init));
    let body = null;
    try { body = await response.json(); } catch (_) { body = null; }
    return { ok: response.ok, status: response.status, body: body, headers: response.headers };
  }

  async function getGatewayHealth() {
    try {
      const result = await fetchJson(VERSION_MANIFEST.gateway.healthEndpoint, { method: "GET" });
      const healthy = result.ok && result.body && result.body.gatewayAvailable === true;
      updateClientState({ healthState: healthy ? internal.text(result.body.runtimeState, "READY") : "UNAVAILABLE", lastError: healthy ? null : "HEALTH_CHECK_FAILED", lastCheckedAt: internal.nowIso() });
      return internal.buildResult(healthy, healthy ? "EXTERNAL010_GATEWAY_HEALTH_READY" : "EXTERNAL010_GATEWAY_HEALTH_UNAVAILABLE", healthy ? "Ready" : "Unavailable", {
        health: result.body,
        httpStatus: result.status,
        permission: await getLoopbackPermissionState()
      });
    } catch (error) {
      updateClientState({ healthState: "UNAVAILABLE", lastError: error && error.message || String(error), lastCheckedAt: internal.nowIso() });
      return internal.buildResult(false, "EXTERNAL010_GATEWAY_HEALTH_UNAVAILABLE", "Unavailable", { permission: await getLoopbackPermissionState() }, { error: { message: error && error.message || String(error), category: "Gateway Health" } });
    }
  }

  function currentOrigin() {
    if (global.location && global.location.origin) return String(global.location.origin);
    return "unknown";
  }

  function clearSessionLocal(reason) {
    sessionToken = null;
    if (sessionMetadata) {
      sessionMetadata = Object.assign({}, sessionMetadata, { state: reason === "EXPIRED" ? "EXPIRED" : "REVOKED", localClearedAt: internal.nowIso(), localClearReason: reason || "LOCAL_CLEAR" });
    }
    updateClientState({ lastError: null });
  }

  function isSessionUsable() {
    if (!sessionToken || !sessionMetadata || sessionMetadata.state !== "ACTIVE") return false;
    const expires = Date.parse(sessionMetadata.expiresAt || "");
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      clearSessionLocal("EXPIRED");
      return false;
    }
    return true;
  }

  async function openGatewaySession(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const health = await getGatewayHealth();
    if (!health.ok) return health;
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser",
        "X-EXTERNAL-010-Contract-Version": VERSION_MANIFEST.gateway.contractVersion
      };
      const payload = {
        clientSessionId: internal.text(settings.clientSessionId, internal.nextId("EXTERNAL-010-BROWSER-SESSION")),
        requestedScope: internal.unique(settings.requestedScope || ["PROBE", "READ_RUNTIME"]),
        browserOrigin: currentOrigin(),
        clientVersion: VERSION_MANIFEST.release.version
      };
      const result = await fetchJson(VERSION_MANIFEST.gateway.sessionEndpoint, { method: "POST", headers: headers, body: JSON.stringify(payload) });
      if (!result.ok || !result.body || !result.body.sessionToken || !result.body.session) {
        clearSessionLocal("HANDSHAKE_FAILED");
        return internal.buildResult(false, "EXTERNAL010_GATEWAY_SESSION_REJECTED", "Blocked", { httpStatus: result.status, response: internal.redactSensitive(result.body || {}) });
      }
      sessionToken = String(result.body.sessionToken);
      sessionMetadata = internal.clone(result.body.session);
      delete sessionMetadata.sessionToken;
      sessionMetadata.tokenPersisted = false;
      updateClientState({ healthState: "READY", lastError: null, lastCheckedAt: internal.nowIso() });
      const validation = namespace.validateExternalIntelligenceContract("gatewaySessionMetadata", sessionMetadata);
      if (!validation.valid) {
        clearSessionLocal("INVALID_METADATA");
        return internal.buildResult(false, "EXTERNAL010_GATEWAY_SESSION_METADATA_INVALID", "Blocked", { validation: validation });
      }
      return internal.buildResult(true, "EXTERNAL010_GATEWAY_SESSION_CREATED", "Active", { session: internal.clone(sessionMetadata), sessionTokenPersisted: false, tokenReturnedToCaller: false });
    } catch (error) {
      clearSessionLocal("HANDSHAKE_EXCEPTION");
      return internal.buildResult(false, "EXTERNAL010_GATEWAY_SESSION_UNAVAILABLE", "Unavailable", null, { error: { message: error && error.message || String(error), category: "Gateway Session" } });
    }
  }

  function secureHeaders(requestId, nonce, createdAt) {
    return {
      "Content-Type": "application/json",
      "X-EXTERNAL-010-Client": "AI-Prompt-OS-Browser",
      "X-EXTERNAL-010-Contract-Version": VERSION_MANIFEST.gateway.contractVersion,
      "X-EXTERNAL-010-Session": sessionToken || "",
      "X-EXTERNAL-010-Session-Id": sessionMetadata && sessionMetadata.gatewaySessionId || "",
      "X-EXTERNAL-010-Request-Id": requestId,
      "X-EXTERNAL-010-Nonce": nonce,
      "X-EXTERNAL-010-Request-Time": createdAt
    };
  }

  async function guardedGatewayRequest(path, body, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (!isSessionUsable()) return internal.buildResult(false, "EXTERNAL010_GATEWAY_SESSION_REQUIRED", "Blocked", { session: sessionMetadata ? internal.clone(sessionMetadata) : null });
    const requestId = internal.text(settings.requestId, internal.nextId("EXTERNAL-010-GATEWAY-REQUEST"));
    const nonce = internal.text(settings.nonce, internal.nextId("EXTERNAL-010-NONCE"));
    const createdAt = internal.text(settings.createdAt, internal.nowIso());
    try {
      const result = await fetchJson(path, { method: settings.method || "POST", headers: secureHeaders(requestId, nonce, createdAt), body: JSON.stringify(body || {}) });
      if (result.status === 401 || result.status === 403) {
        if (result.body && ["SESSION_EXPIRED", "SESSION_INVALID", "SESSION_REVOKED", "RUNTIME_INVALIDATED"].includes(result.body.code)) clearSessionLocal(result.body.code);
      }
      return internal.buildResult(result.ok, result.ok ? "EXTERNAL010_GATEWAY_REQUEST_ACCEPTED" : "EXTERNAL010_GATEWAY_REQUEST_REJECTED", result.ok ? "Ready" : "Blocked", {
        httpStatus: result.status,
        response: internal.redactSensitive(result.body || {}),
        request: { requestId: requestId, nonce: nonce, createdAt: createdAt, sessionId: sessionMetadata && sessionMetadata.gatewaySessionId || null }
      });
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_GATEWAY_REQUEST_FAILED", "Unavailable", { request: { requestId: requestId } }, { error: { message: error && error.message || String(error), category: "Gateway Request" } });
    }
  }

  async function probeGateway(input, options) {
    return guardedGatewayRequest(VERSION_MANIFEST.gateway.probeEndpoint, { probe: internal.text(input && input.probe, "phase2") }, internal.isPlainObject(options) ? options : {});
  }

  async function getProtectedGatewayRuntime() {
    return guardedGatewayRequest(VERSION_MANIFEST.gateway.runtimeEndpoint, {}, { method: "POST" });
  }

  async function requestAuthorityGovernedGatewayOperation(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const action = internal.text(settings.action, "").toUpperCase();
    const target = internal.isPlainObject(settings.target) ? settings.target : { type: "gateway", id: "local" };
    const purpose = internal.text(settings.purpose, "gateway-operation");
    const authority = namespace.evaluateExternalIntelligenceAuthority({ action: action, target: target, purpose: purpose });
    if (!authority.allowed) return internal.buildResult(false, "EXTERNAL010_GATEWAY_OPERATION_AUTHORITY_DENIED", "Blocked", { authority: authority, gatewayRequestSent: false });
    return guardedGatewayRequest(internal.text(settings.path, VERSION_MANIFEST.gateway.runtimeEndpoint), { action: action, target: target, purpose: purpose, payload: internal.clone(settings.payload || {}) }, {});
  }

  async function revokeGatewaySession() {
    if (!isSessionUsable()) {
      clearSessionLocal("LOCAL_REVOKE_NO_ACTIVE_SESSION");
      return internal.buildResult(true, "EXTERNAL010_GATEWAY_SESSION_ALREADY_INACTIVE", "Revoked", { session: sessionMetadata ? internal.clone(sessionMetadata) : null });
    }
    const old = internal.clone(sessionMetadata);
    const result = await guardedGatewayRequest(VERSION_MANIFEST.gateway.revokeEndpoint, { reason: "CLIENT_REQUEST" }, {});
    clearSessionLocal("CLIENT_REQUEST");
    return internal.buildResult(result.ok, result.ok ? "EXTERNAL010_GATEWAY_SESSION_REVOKED" : "EXTERNAL010_GATEWAY_SESSION_LOCAL_REVOKED", "Revoked", { previousSession: old, gatewayResponse: result.data && result.data.response || null });
  }

  function initializeExternalIntelligenceStartup() {
    Promise.resolve()
      .then(function initializeFoundation() { return namespace.initializeExternalIntelligenceFoundation(); })
      .then(function inspectPermission() { return getLoopbackPermissionState(); })
      .then(function handlePermission(permission) {
        if (permission.supported && permission.permission === "granted") return getGatewayHealth();
        if (permission.supported && permission.permission === "denied") {
          updateClientState({ healthState: "UNAVAILABLE", lastError: "LOOPBACK_PERMISSION_DENIED", lastCheckedAt: internal.nowIso() });
          return null;
        }
        updateClientState({ healthState: permission.supported ? "PERMISSION_REQUIRED" : "UNKNOWN", lastError: null, lastCheckedAt: internal.nowIso() });
        return null;
      })
      .catch(function startupFailure(error) {
        updateClientState({ healthState: "DEGRADED", lastError: error && error.message || String(error), lastCheckedAt: internal.nowIso() });
        console.warn("EXTERNAL-010 startup initialization degraded:", error);
      });
    return true;
  }

  function initializeExternalIntelligenceGatewayClient() {
    const valid = sanitizeBaseUrl(baseUrl);
    if (!valid) return internal.buildResult(false, "EXTERNAL010_GATEWAY_CLIENT_CONFIG_INVALID", "Blocked", null);
    baseUrl = valid;
    updateClientState({ baseUrl: baseUrl, healthState: state.gatewayClientState && state.gatewayClientState.healthState || "UNKNOWN", lastError: null });
    namespace.modules.gatewayClient.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_GATEWAY_CLIENT_INITIALIZED", "Ready", {
      baseUrl: baseUrl,
      loopbackOnly: true,
      sessionTokenStorage: "memory-only",
      tokenPersisted: false,
      localNetworkPermissionAware: true,
      gatewayRequiredForCore: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceGatewayClient: initializeExternalIntelligenceGatewayClient,
    configureExternalIntelligenceGatewayClient: configureGatewayClient,
    getExternalIntelligenceGatewayClientState: getClientState,
    getExternalIntelligenceLoopbackPermissionState: getLoopbackPermissionState,
    getExternalIntelligenceGatewayHealth: getGatewayHealth,
    openExternalIntelligenceGatewaySession: openGatewaySession,
    probeExternalIntelligenceGateway: probeGateway,
    getProtectedExternalIntelligenceGatewayRuntime: getProtectedGatewayRuntime,
    requestAuthorityGovernedExternalIntelligenceGatewayOperation: requestAuthorityGovernedGatewayOperation,
    revokeExternalIntelligenceGatewaySession: revokeGatewaySession,
    initializeExternalIntelligenceStartup: initializeExternalIntelligenceStartup
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.gatewayClient = {
    id: "EXTERNAL-010-GATEWAY-CLIENT",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    loopbackOnly: true,
    corsEqualsAuthentication: false,
    sessionTokenMemoryOnly: true,
    sessionTokenExposedByPublicState: false,
    replayProtectionRequired: true,
    authorityRevalidationHook: true,
    gatewayFailureBreaksCore: false,
    loadedAt: internal.nowIso()
  };

  global.getExternalIntelligenceGatewayHealth = getGatewayHealth;
  global.openExternalIntelligenceGatewaySession = openGatewaySession;
  global.probeExternalIntelligenceGateway = probeGateway;
  global.initializeExternalIntelligenceStartup = initializeExternalIntelligenceStartup;
})(typeof window !== "undefined" ? window : globalThis);
