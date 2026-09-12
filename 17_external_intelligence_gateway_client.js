/* ============================================================
   FILE: 17_external_intelligence_gateway_client.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 02 Foundation + Phase 04 Governed Acquisition Bridge
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
        if (result.body && ["SESSION_EXPIRED", "SESSION_INVALID", "SESSION_REVOKED", "RUNTIME_INVALIDATED", "RECOVERY_EPOCH_INVALIDATED"].includes(result.body.code)) clearSessionLocal(result.body.code);
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

  function gatewaySessionHasScopes(requiredScopes) {
    if (!isSessionUsable()) return false;
    const granted = new Set((sessionMetadata && sessionMetadata.scope || []).map(function upperScope(value) { return String(value || "").toUpperCase(); }));
    return (requiredScopes || []).every(function hasScope(scope) { return granted.has(String(scope || "").toUpperCase()); });
  }

  async function ensureGatewaySessionScopes(requiredScopes) {
    const scopes = internal.unique(requiredScopes || []).map(function normalizeScope(value) { return internal.text(value, "").toUpperCase(); }).filter(Boolean);
    if (gatewaySessionHasScopes(scopes)) return internal.buildResult(true, "EXTERNAL010_GATEWAY_SESSION_SCOPE_READY", "Ready", { session: internal.clone(sessionMetadata), requestedScope: scopes });
    if (isSessionUsable()) clearSessionLocal("SCOPE_REHANDSHAKE");
    return openGatewaySession({ requestedScope: internal.unique(["PROBE", "READ_RUNTIME"].concat(scopes)) });
  }

  function buildGatewayAcquisitionAuthority(context) {
    const request = context && context.request;
    if (!request) return { allowed: false, decision: "DENY", reason: "REQUEST_REQUIRED", authorityEnvelopeId: null };
    return namespace.evaluateExternalIntelligenceAuthority({
      action: "EXECUTE_EXTERNAL_ACQUISITION",
      target: { type: "external-acquisition", id: request.requestId },
      purpose: request.purpose
    });
  }

  function buildGovernedGatewayAcquisitionPayload(context, authority) {
    const request = context.request || {};
    const source = context.source || {};
    const operationContract = context.operationContract || {};
    const route = context.route || {};
    return {
      request: {
        requestId: request.requestId,
        sourceId: request.sourceId,
        operationId: request.operationId,
        purpose: request.purpose,
        parameters: internal.clone(request.parameters || {}),
        timeoutPolicy: internal.clone(request.timeoutPolicy || {})
      },
      source: {
        sourceId: source.sourceId,
        enabled: source.enabled === true,
        lifecycleState: source.lifecycleState,
        accessMode: source.accessMode,
        authenticationMode: source.authenticationMode,
        secretReferenceId: source.secretReferenceId || null,
        allowedOperations: internal.clone(source.allowedOperations || []),
        adapterId: source.adapterId,
        endpointPolicy: internal.clone(source.endpointPolicy || {})
      },
      operationContract: {
        operationContractId: operationContract.operationContractId,
        sourceId: operationContract.sourceId,
        operationId: operationContract.operationId,
        method: operationContract.method,
        adapterId: operationContract.adapterId,
        endpoint: internal.clone(operationContract.endpoint || {}),
        parameterPolicy: internal.clone(operationContract.parameterPolicy || {})
      },
      route: {
        routeId: route.routeId,
        sourceId: route.sourceId,
        operationId: route.operationId,
        runtimeTarget: route.runtimeTarget,
        adapterId: route.adapterId,
        operationContractId: route.operationContractId,
        endpointReference: route.endpointReference
      },
      authority: {
        action: "EXECUTE_EXTERNAL_ACQUISITION",
        allowed: authority.allowed === true,
        decision: authority.decision,
        reason: authority.reason,
        authorityEnvelopeId: authority.authorityEnvelopeId,
        evaluatedAt: authority.evaluatedAt
      }
    };
  }

  async function executeGovernedGatewayAcquisition(context) {
    const request = context && context.request;
    const source = context && context.source;
    const operationContract = context && context.operationContract;
    const route = context && context.route;
    if (!request || !source || !operationContract || !route || route.runtimeTarget !== "LOCAL_GATEWAY") {
      throw Object.assign(new Error("Governed Gateway acquisition context invalid"), { externalCategory: "INVALID_REQUEST", retryable: false });
    }
    const authority = buildGatewayAcquisitionAuthority(context);
    if (!authority.allowed || !authority.authorityEnvelopeId) {
      throw Object.assign(new Error("Gateway acquisition authority revalidation failed"), { externalCategory: "BLOCKED", retryable: false });
    }
    const authenticated = String(source.authenticationMode || "NONE").toUpperCase() !== "NONE";
    const requiredScope = authenticated ? (VERSION_MANIFEST.gateway.governedAcquisitionScope || "ACQUIRE_EXTERNAL") : (VERSION_MANIFEST.gateway.publicAcquisitionScope || "ACQUIRE_PUBLIC");
    const endpoint = authenticated ? (VERSION_MANIFEST.gateway.governedAcquisitionEndpoint || "/v1/acquire/governed") : VERSION_MANIFEST.gateway.publicAcquisitionEndpoint;
    const scopeReady = await ensureGatewaySessionScopes([requiredScope]);
    if (!scopeReady.ok) {
      throw Object.assign(new Error("Gateway acquisition session unavailable"), { externalCategory: "SOURCE_UNAVAILABLE", retryable: true });
    }
    const result = await guardedGatewayRequest(
      endpoint,
      buildGovernedGatewayAcquisitionPayload(context, authority),
      { method: "POST", requestId: request.requestId + "-GW" }
    );
    const response = result && result.data && result.data.response;
    if (!result.ok || !response || response.ok !== true || !response.acquisition) {
      const error = new Error(response && response.message || response && response.code || result.code || "Gateway acquisition failed");
      error.externalCategory = response && response.category || (result.status === "Unavailable" ? "SOURCE_UNAVAILABLE" : "BLOCKED");
      error.retryable = Boolean(response && response.retryable);
      error.rawProviderStatus = response && response.providerStatus || result && result.data && result.data.httpStatus || null;
      throw error;
    }
    return internal.clone(response.acquisition);
  }

  function enableGatewayAcquisitionBridge() {
    if (typeof namespace.setExternalIntelligenceGatewayAcquisitionExecutor !== "function") {
      return internal.buildResult(false, "EXTERNAL010_GATEWAY_ACQUISITION_BRIDGE_DEPENDENCY_MISSING", "Blocked", { adapterRegistryLoaded: false });
    }
    const configured = namespace.setExternalIntelligenceGatewayAcquisitionExecutor(executeGovernedGatewayAcquisition);
    return internal.buildResult(configured.ok === true, configured.ok ? "EXTERNAL010_GATEWAY_ACQUISITION_BRIDGE_ENABLED" : "EXTERNAL010_GATEWAY_ACQUISITION_BRIDGE_ENABLE_FAILED", configured.ok ? "Ready" : "Blocked", {
      baseUrl: baseUrl,
      endpoint: VERSION_MANIFEST.gateway.publicAcquisitionEndpoint,
      requiredScope: VERSION_MANIFEST.gateway.publicAcquisitionScope || "ACQUIRE_PUBLIC",
      arbitraryUrlProxyEnabled: false,
      authorityRevalidationRequired: true,
      gatewayTargetAllowlistRequired: true
    });
  }

  function disableGatewayAcquisitionBridge() {
    if (typeof namespace.setExternalIntelligenceGatewayAcquisitionExecutor !== "function") return internal.buildResult(true, "EXTERNAL010_GATEWAY_ACQUISITION_BRIDGE_ALREADY_DISABLED", "Ready", null);
    return namespace.setExternalIntelligenceGatewayAcquisitionExecutor(null);
  }


  async function gatewayEvidencePersist(payload) {
    const scopeReady = await ensureGatewaySessionScopes([VERSION_MANIFEST.gateway.evidencePersistScope || "PERSIST_EVIDENCE"]);
    if (!scopeReady.ok) return scopeReady;
    return guardedGatewayRequest(VERSION_MANIFEST.gateway.evidencePersistEndpoint, payload, { method: "POST" });
  }

  async function gatewayEvidenceRead(payload) {
    const scopeReady = await ensureGatewaySessionScopes([VERSION_MANIFEST.gateway.evidenceReadScope || "READ_EVIDENCE"]);
    if (!scopeReady.ok) return scopeReady;
    return guardedGatewayRequest(VERSION_MANIFEST.gateway.evidenceReadEndpoint, payload, { method: "POST" });
  }

  async function gatewayEvidenceIntegrity(payload) {
    const scopeReady = await ensureGatewaySessionScopes([VERSION_MANIFEST.gateway.evidenceReadScope || "READ_EVIDENCE"]);
    if (!scopeReady.ok) return scopeReady;
    return guardedGatewayRequest(VERSION_MANIFEST.gateway.evidenceIntegrityEndpoint, payload, { method: "POST" });
  }

  async function gatewayProcessingCheckpoint(payload) {
    const scopeReady = await ensureGatewaySessionScopes([VERSION_MANIFEST.gateway.evidencePersistScope || "PERSIST_EVIDENCE"]);
    if (!scopeReady.ok) return scopeReady;
    return guardedGatewayRequest(VERSION_MANIFEST.gateway.processingCheckpointEndpoint, payload, { method: "POST" });
  }

  function enableGatewayEvidencePersistenceBridge() {
    if (typeof namespace.setExternalIntelligenceEvidencePersistenceAdapter !== "function") return internal.buildResult(false, "EXTERNAL010_GATEWAY_EVIDENCE_BRIDGE_DEPENDENCY_MISSING", "Blocked", null);
    return namespace.setExternalIntelligenceEvidencePersistenceAdapter({
      persistEvidence: async function persistEvidence(payload) {
        const result = await gatewayEvidencePersist(payload);
        const response = result && result.data && result.data.response;
        return response && response.ok ? internal.buildResult(true, "EXTERNAL010_GATEWAY_EVIDENCE_PERSISTED", "Ready", response) : internal.buildResult(false, response && response.code || "EXTERNAL010_GATEWAY_EVIDENCE_PERSIST_FAILED", result && result.status || "Failed", response || null);
      },
      readEvidence: async function readEvidence(payload) {
        const result = await gatewayEvidenceRead(payload); const response = result && result.data && result.data.response;
        return response && response.ok ? internal.buildResult(true, "EXTERNAL010_GATEWAY_EVIDENCE_READ", "Ready", response.evidence) : internal.buildResult(false, response && response.code || "EXTERNAL010_GATEWAY_EVIDENCE_READ_FAILED", result && result.status || "Failed", response || null);
      },
      integrityScan: async function integrityScan(payload) {
        const result = await gatewayEvidenceIntegrity(payload); const response = result && result.data && result.data.response;
        return response && response.ok ? internal.buildResult(true, "EXTERNAL010_GATEWAY_EVIDENCE_INTEGRITY", "Ready", response.integrity) : internal.buildResult(false, response && response.code || "EXTERNAL010_GATEWAY_EVIDENCE_INTEGRITY_FAILED", result && result.status || "Failed", response || null);
      },
      persistCheckpoint: async function persistCheckpoint(payload) {
        const result = await gatewayProcessingCheckpoint(payload); const response = result && result.data && result.data.response;
        return response && response.ok ? internal.buildResult(true, "EXTERNAL010_GATEWAY_PROCESSING_CHECKPOINT_PERSISTED", "Ready", response.checkpoint) : internal.buildResult(false, response && response.code || "EXTERNAL010_GATEWAY_PROCESSING_CHECKPOINT_FAILED", result && result.status || "Failed", response || null);
      }
    });
  }

  async function getGatewaySecretMetadataStatus(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const secretReferenceId = internal.text(settings.secretReferenceId, "").toUpperCase();
    if (!/^SECRET-[A-Z0-9-]+$/.test(secretReferenceId)) return internal.buildResult(false, "EXTERNAL010_SECRET_REFERENCE_INVALID", "Blocked", { secretReferenceId: secretReferenceId || null, secretValueReturned: false });
    const scopeReady = await ensureGatewaySessionScopes([VERSION_MANIFEST.gateway.secretMetadataScope || "READ_SECRET_METADATA"]);
    if (!scopeReady.ok) return scopeReady;
    const result = await guardedGatewayRequest(VERSION_MANIFEST.gateway.secretStatusEndpoint || "/v1/secret/status", { secretReferenceId: secretReferenceId, secretType: settings.secretType || null }, { method: "POST" });
    const response = result && result.data && result.data.response;
    if (!result.ok || !response) return internal.buildResult(false, response && response.code || "EXTERNAL010_SECRET_STATUS_UNAVAILABLE", result && result.status || "Unavailable", { secretReferenceId, secretValueReturned:false });
    return internal.buildResult(response.ok === true, response.code || "EXTERNAL010_SECRET_STATUS", response.ok ? "Ready" : "Blocked", { secretMetadata: internal.clone(response.secretMetadata || null), secretValueReturned:false });
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


  function evaluateGatewayRecoveryAuthority(action, recoveryPointId, purpose) {
    const targetId = internal.text(recoveryPointId, "") || "RECOVERY-POINT-NEW";
    return namespace.evaluateExternalIntelligenceAuthority({
      action: action,
      target: { type: "external-intelligence-recovery", id: targetId },
      purpose: internal.text(purpose, "phase20-recovery")
    });
  }

  async function gatewayRecoveryRequest(endpoint, action, input, authorityTargetId) {
    const settings = internal.isPlainObject(input) ? input : {};
    const scopeReady = await ensureGatewaySessionScopes([VERSION_MANIFEST.gateway.recoveryScope || "MANAGE_RECOVERY"]);
    if (!scopeReady.ok) return scopeReady;
    const recoveryPointId = internal.text(settings.recoveryPointId, "") || null;
    const authorityTarget = internal.text(authorityTargetId, "") || recoveryPointId;
    const authority = evaluateGatewayRecoveryAuthority(action, authorityTarget, settings.purpose);
    if (!authority.allowed || !authority.authorityEnvelopeId) {
      return internal.buildResult(false, "EXTERNAL010_RECOVERY_AUTHORITY_DENIED", "Blocked", { action, recoveryPointId, authorityTargetId: authorityTarget || null, authority, gatewayRequestSent: false });
    }
    const payload = Object.assign({}, internal.clone(settings), {
      authority: { action, allowed: true, decision: authority.decision, reason: authority.reason, authorityEnvelopeId: authority.authorityEnvelopeId, evaluatedAt: authority.evaluatedAt }
    });
    delete payload.purpose;
    const result = await guardedGatewayRequest(endpoint, payload, { method: "POST" });
    const response = result && result.data && result.data.response;
    if (response && response.recovery && response.recovery.sessionInvalidationRequired === true) clearSessionLocal("RECOVERY_EPOCH_CHANGED");
    return result;
  }

  async function createExternalIntelligenceGatewayRecoveryPoint(input) {
    return gatewayRecoveryRequest(VERSION_MANIFEST.gateway.recoveryCreateEndpoint || "/v1/recovery/create", "CREATE_RECOVERY_POINT", input);
  }
  async function listExternalIntelligenceGatewayRecoveryPoints(input) {
    return gatewayRecoveryRequest(VERSION_MANIFEST.gateway.recoveryListEndpoint || "/v1/recovery/list", "READ_RECOVERY_POINT", input, "RECOVERY_CATALOG");
  }
  async function validateExternalIntelligenceGatewayRecoveryPoint(input) {
    return gatewayRecoveryRequest(VERSION_MANIFEST.gateway.recoveryValidateEndpoint || "/v1/recovery/validate", "READ_RECOVERY_POINT", input);
  }
  async function restoreExternalIntelligenceGatewayRecoveryPoint(input) {
    return gatewayRecoveryRequest(VERSION_MANIFEST.gateway.recoveryRestoreEndpoint || "/v1/recovery/restore", "RESTORE_RECOVERY_POINT", input);
  }
  async function assessExternalIntelligenceGatewayMetadataRebuild(input) {
    return gatewayRecoveryRequest(VERSION_MANIFEST.gateway.recoveryRebuildAssessmentEndpoint || "/v1/recovery/rebuild-assessment", "READ_RECOVERY_POINT", input, "CURRENT_METADATA_STORE");
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
    ensureExternalIntelligenceGatewaySessionScopes: ensureGatewaySessionScopes,
    enableExternalIntelligenceGatewayAcquisitionBridge: enableGatewayAcquisitionBridge,
    disableExternalIntelligenceGatewayAcquisitionBridge: disableGatewayAcquisitionBridge,
    enableExternalIntelligenceGatewayEvidencePersistenceBridge: enableGatewayEvidencePersistenceBridge,
    getExternalIntelligenceGatewaySecretMetadataStatus: getGatewaySecretMetadataStatus,
    createExternalIntelligenceGatewayRecoveryPoint: createExternalIntelligenceGatewayRecoveryPoint,
    listExternalIntelligenceGatewayRecoveryPoints: listExternalIntelligenceGatewayRecoveryPoints,
    validateExternalIntelligenceGatewayRecoveryPoint: validateExternalIntelligenceGatewayRecoveryPoint,
    restoreExternalIntelligenceGatewayRecoveryPoint: restoreExternalIntelligenceGatewayRecoveryPoint,
    assessExternalIntelligenceGatewayMetadataRebuild: assessExternalIntelligenceGatewayMetadataRebuild,
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
    governedAcquisitionBridgeAvailable: true,
    governedAuthenticatedAcquisitionAvailable: true,
    secretValueReturnedToBrowser: false,
    arbitraryUrlProxyEnabled: false,
    gatewayTargetAllowlistRequired: true,
    recoveryBridgeAvailable: true,
    restoredSessionRecordEqualsCurrentAuthentication: false,
    gatewayFailureBreaksCore: false,
    loadedAt: internal.nowIso()
  };

  global.getExternalIntelligenceGatewayHealth = getGatewayHealth;
  global.openExternalIntelligenceGatewaySession = openGatewaySession;
  global.probeExternalIntelligenceGateway = probeGateway;
  global.initializeExternalIntelligenceStartup = initializeExternalIntelligenceStartup;
})(typeof window !== "undefined" ? window : globalThis);
