/* ============================================================
   FILE: 17_external_intelligence_acquisition_contract.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 04: Unified Acquisition Contract
   Decisions: 007 / 015 / 016
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 acquisition contract blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("acquisitionContract");
  const ACQ = VERSION_MANIFEST.acquisition;
  const SENSITIVE_KEY = /(password|api[_-]?key|bearer[_-]?token|access[_-]?token|refresh[_-]?token|private[_-]?key|authorization|secret|credential|cookie)/i;

  function upper(value, fallback) {
    return internal.text(value, fallback || "").toUpperCase().replace(/[^A-Z0-9_:-]/g, "_");
  }

  function normalizeSourceId(value) {
    const text = upper(value, "").replace(/_/g, "-");
    return /^SOURCE-[A-Z0-9-]+$/.test(text) ? text : "";
  }

  function normalizeOperationId(value) {
    const text = upper(value, "");
    return /^[A-Z][A-Z0-9_:-]*$/.test(text) ? text : "";
  }

  function containsSecret(value, keyHint) {
    if (SENSITIVE_KEY.test(internal.text(keyHint, ""))) return true;
    if (Array.isArray(value)) return value.some(function item(v) { return containsSecret(v, ""); });
    if (!internal.isPlainObject(value)) return false;
    return Object.keys(value).some(function key(k) { return containsSecret(value[k], k); });
  }

  function normalizeRetryPolicy(value) {
    const input = internal.isPlainObject(value) ? value : {};
    const maxAttempts = Number.isInteger(input.maxAttempts) ? input.maxAttempts : ACQ.defaultRetryPolicy.maxAttempts;
    const initialDelayMs = Number.isFinite(Number(input.initialDelayMs)) ? Math.max(0, Number(input.initialDelayMs)) : ACQ.defaultRetryPolicy.initialDelayMs;
    const maxDelayMs = Number.isFinite(Number(input.maxDelayMs)) ? Math.max(initialDelayMs, Number(input.maxDelayMs)) : ACQ.defaultRetryPolicy.maxDelayMs;
    const retryableCategories = internal.unique(input.retryableCategories && input.retryableCategories.length ? input.retryableCategories : ACQ.defaultRetryPolicy.retryableCategories).map(function category(v) { return upper(v, ""); });
    return {
      maxAttempts: Math.max(1, Math.min(maxAttempts, ACQ.maxRetryAttempts)),
      initialDelayMs: initialDelayMs,
      maxDelayMs: maxDelayMs,
      backoffPolicy: upper(input.backoffPolicy, ACQ.defaultRetryPolicy.backoffPolicy),
      retryableCategories: retryableCategories
    };
  }

  function normalizeTimeoutPolicy(value) {
    const input = internal.isPlainObject(value) ? value : {};
    const timeoutMs = Number.isFinite(Number(input.timeoutMs)) ? Number(input.timeoutMs) : ACQ.defaultTimeoutMs;
    return { timeoutMs: Math.max(250, Math.min(timeoutMs, ACQ.maxTimeoutMs)) };
  }

  function normalizeParameterPolicy(value) {
    const input = internal.isPlainObject(value) ? value : {};
    return {
      required: internal.unique(input.required),
      optional: internal.unique(input.optional),
      allowUnknown: false,
      maxParameterCount: Number.isInteger(input.maxParameterCount) ? Math.max(1, Math.min(input.maxParameterCount, 100)) : 32
    };
  }

  function normalizeOperationContract(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const sourceId = normalizeSourceId(source.sourceId);
    const operationId = normalizeOperationId(source.operationId);
    const endpoint = internal.isPlainObject(source.endpoint) ? source.endpoint : {};
    const estimatedUsage = internal.isPlainObject(source.estimatedUsage) ? internal.clone(source.estimatedUsage) : { REQUEST_COUNT: 1 };
    return {
      operationContractId: internal.text(source.operationContractId, "") || (sourceId && operationId ? "EXTERNAL-010-OP-" + sourceId.replace(/^SOURCE-/, "") + "-" + operationId.replace(/[^A-Z0-9]+/g, "-") : ""),
      sourceId: sourceId,
      operationId: operationId,
      adapterId: internal.text(source.adapterId, ""),
      method: upper(source.method, "GET"),
      endpoint: {
        exactUrl: internal.text(endpoint.exactUrl, "") || null,
        canonicalHost: internal.text(endpoint.canonicalHost, "") || null,
        endpointReference: internal.text(endpoint.endpointReference, "") || null
      },
      parameterPolicy: normalizeParameterPolicy(source.parameterPolicy),
      timeoutPolicy: normalizeTimeoutPolicy(source.timeoutPolicy),
      retryPolicy: normalizeRetryPolicy(source.retryPolicy),
      responseMode: upper(source.responseMode, "JSON"),
      executionHints: {
        backgroundPreferred: Boolean(source.executionHints && source.executionHints.backgroundPreferred),
        expectedResponseSize: upper(source.executionHints && source.executionHints.expectedResponseSize, "SMALL"),
        longRunning: Boolean(source.executionHints && source.executionHints.longRunning),
        batch: Boolean(source.executionHints && source.executionHints.batch)
      },
      estimatedUsage: estimatedUsage,
      enabled: source.enabled !== false,
      authorityGranted: false,
      createdAt: internal.nowIso(),
      updatedAt: internal.nowIso(),
      immutable: true
    };
  }

  function validateEndpoint(operation, source) {
    const errors = [];
    if (operation.method !== "GET") errors.push("PHASE4_READ_ONLY_METHOD_REQUIRED");
    if (operation.endpoint.exactUrl) {
      let url;
      try { url = new URL(operation.endpoint.exactUrl); } catch (_) { url = null; }
      if (!url || !["https:", "http:"].includes(url.protocol)) errors.push("ENDPOINT_URL_INVALID");
      if (url && source && source.endpointPolicy && source.endpointPolicy.canonicalHost && url.hostname !== source.endpointPolicy.canonicalHost) errors.push("ENDPOINT_HOST_MISMATCH");
      if (url && operation.endpoint.canonicalHost && url.hostname !== operation.endpoint.canonicalHost) errors.push("OPERATION_ENDPOINT_HOST_MISMATCH");
      if (url && url.protocol === "http:" && !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) errors.push("INSECURE_REMOTE_HTTP_BLOCKED");
    }
    return errors;
  }

  async function registerExternalIntelligenceSourceOperationContract(input) {
    const record = normalizeOperationContract(input);
    const source = state.sourceRegistry.get(record.sourceId);
    const errors = [];
    if (!source) errors.push("SOURCE_NOT_REGISTERED");
    if (!record.operationId) errors.push("OPERATION_ID_INVALID");
    if (!record.adapterId) errors.push("ADAPTER_ID_REQUIRED");
    if (source && !source.allowedOperations.includes(record.operationId)) errors.push("OPERATION_NOT_ALLOWED_BY_SOURCE");
    if (source && source.adapterId && source.adapterId !== record.adapterId) errors.push("ADAPTER_BINDING_MISMATCH");
    errors.push.apply(errors, validateEndpoint(record, source));
    if (record.retryPolicy.maxAttempts > ACQ.maxRetryAttempts) errors.push("RETRY_LIMIT_INVALID");
    if (errors.length) return internal.buildResult(false, "EXTERNAL010_SOURCE_OPERATION_CONTRACT_INVALID", "Blocked", { errors: errors, sourceId: record.sourceId, operationId: record.operationId });
    if (state.sourceOperationContracts.has(record.operationContractId)) return internal.buildResult(false, "EXTERNAL010_SOURCE_OPERATION_CONTRACT_DUPLICATE", "Blocked", { operationContractId: record.operationContractId });

    const authority = namespace.evaluateExternalIntelligenceAuthority({ action: "REGISTER_SOURCE_OPERATION_CONTRACT", target: { type: "source-operation", id: record.operationContractId }, purpose: "phase4-operation-contract" });
    if (!authority.allowed) return internal.buildResult(false, "EXTERNAL010_SOURCE_OPERATION_CONTRACT_AUTHORITY_DENIED", "Blocked", { authority: authority, registrationPerformed: false });

    const contract = namespace.validateExternalIntelligenceContract("sourceOperationContract", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SOURCE-OPERATION-CONTRACT", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_SOURCE_OPERATION_CONTRACT_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(record));
    state.sourceOperationContracts.set(record.operationContractId, frozen);
    state.sourceOperationByKey.set(record.sourceId + "::" + record.operationId, record.operationContractId);
    internal.touch();
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "SOURCE_OPERATION_CONTRACT_REGISTERED", actor: "Unified Acquisition Contract", outcome: "Registered", details: { operationContractId: record.operationContractId, sourceId: record.sourceId, operationId: record.operationId, adapterId: record.adapterId, authorityEnvelopeId: authority.authorityEnvelopeId } });
    return internal.buildResult(true, "EXTERNAL010_SOURCE_OPERATION_CONTRACT_REGISTERED", "Ready", { operationContract: internal.clone(frozen), authority: authority });
  }

  function getExternalIntelligenceSourceOperationContract(sourceId, operationId) {
    const key = normalizeSourceId(sourceId) + "::" + normalizeOperationId(operationId);
    const id = state.sourceOperationByKey.get(key);
    const record = id && state.sourceOperationContracts.get(id);
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceSourceOperationContracts() {
    return Array.from(state.sourceOperationContracts.values()).map(internal.clone);
  }

  function validateParameters(operationContract, parameters) {
    const policy = operationContract.parameterPolicy;
    const object = internal.isPlainObject(parameters) ? parameters : {};
    const keys = Object.keys(object);
    const errors = [];
    policy.required.forEach(function required(key) { if (!Object.prototype.hasOwnProperty.call(object, key)) errors.push("PARAMETER_REQUIRED:" + key); });
    if (!policy.allowUnknown) {
      keys.forEach(function unknown(key) { if (!policy.required.includes(key) && !policy.optional.includes(key)) errors.push("PARAMETER_UNKNOWN:" + key); });
    }
    if (keys.length > policy.maxParameterCount) errors.push("PARAMETER_COUNT_EXCEEDED");
    if (containsSecret(object, "parameters")) errors.push("SECRET_IN_PARAMETERS_BLOCKED");
    return errors;
  }

  function normalizeRequest(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const requestId = internal.text(source.requestId, "") || internal.nextId("EXTERNAL-010-REQUEST");
    return {
      requestId: requestId,
      sourceId: normalizeSourceId(source.sourceId),
      operationId: normalizeOperationId(source.operationId),
      parameters: internal.isPlainObject(source.parameters) ? internal.clone(source.parameters) : {},
      requestedAt: internal.nowIso(),
      priority: ACQ.priorities.includes(upper(source.priority, "NORMAL")) ? upper(source.priority, "NORMAL") : "NORMAL",
      executionPreference: ACQ.executionPreferences.includes(upper(source.executionPreference, "AUTO")) ? upper(source.executionPreference, "AUTO") : "AUTO",
      timeoutPolicy: normalizeTimeoutPolicy(source.timeoutPolicy),
      retryPolicy: normalizeRetryPolicy(source.retryPolicy),
      idempotencyKey: internal.text(source.idempotencyKey, "") || null,
      requestContext: internal.isPlainObject(source.requestContext) ? internal.clone(source.requestContext) : {},
      purpose: internal.text(source.purpose, "external-acquisition"),
      requestedBy: internal.text(source.requestedBy, "Project Owner / Application"),
      correlationId: internal.text(source.correlationId, "") || null,
      budgetIds: internal.unique(source.budgetIds),
      acquisitionPlanId: internal.text(source.acquisitionPlanId, "") || null,
      researchGoalId: internal.text(source.researchGoalId, "") || null,
      status: "CREATED",
      executionAuthorityGranted: false,
      validationGrantsExecutionAuthority: false,
      immutable: true
    };
  }

  function createExternalIntelligenceAcquisitionRequest(input) {
    const original = internal.isPlainObject(input) ? input : {};
    if (containsSecret(original, "request")) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_REQUEST_SECRET_BLOCKED", "Blocked", { secretInRequestContractAllowed: false });
    const record = normalizeRequest(original);
    const errors = [];
    if (!record.sourceId) errors.push("SOURCE_ID_INVALID");
    if (!record.operationId) errors.push("OPERATION_ID_INVALID");
    if (!record.purpose) errors.push("PURPOSE_REQUIRED");
    if (state.acquisitionRequests.has(record.requestId)) errors.push("REQUEST_ID_DUPLICATE");
    if (record.idempotencyKey && state.acquisitionIdempotency.has(record.idempotencyKey)) errors.push("IDEMPOTENCY_KEY_DUPLICATE");
    if (errors.length) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_REQUEST_INVALID", "Blocked", { errors: errors });
    const contract = namespace.validateExternalIntelligenceContract("externalAcquisitionRequest", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-ACQUISITION-REQUEST", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_REQUEST_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(record));
    state.acquisitionRequests.set(record.requestId, frozen);
    if (record.idempotencyKey) state.acquisitionIdempotency.set(record.idempotencyKey, record.requestId);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_REQUEST_CREATED", "Ready", { request: internal.clone(frozen), executionAuthorityGranted: false });
  }

  function getExternalIntelligenceAcquisitionRequest(requestId) {
    const record = state.acquisitionRequests.get(internal.text(requestId, ""));
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceAcquisitionRequests() {
    return Array.from(state.acquisitionRequests.values()).map(internal.clone);
  }

  function validateExternalIntelligenceAcquisitionRequest(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const request = typeof settings.requestId === "string" ? state.acquisitionRequests.get(settings.requestId) : settings.request;
    if (!request) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_REQUEST_NOT_FOUND", "Blocked", null);
    if (containsSecret(request, "request")) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_REQUEST_SECRET_BLOCKED", "Blocked", { secretInRequestContractAllowed: false });

    const sourceResolution = namespace.resolveExternalIntelligenceSourceForOperation({ sourceId: request.sourceId, operationId: request.operationId });
    if (!sourceResolution.ok) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_SOURCE_VALIDATION_FAILED", "Blocked", { requestId: request.requestId, sourceResolution: sourceResolution });
    const operationContract = getExternalIntelligenceSourceOperationContract(request.sourceId, request.operationId);
    if (!operationContract || operationContract.enabled !== true) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_OPERATION_CONTRACT_MISSING", "Blocked", { requestId: request.requestId, sourceId: request.sourceId, operationId: request.operationId });
    const parameterErrors = validateParameters(operationContract, request.parameters);
    if (parameterErrors.length) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_PARAMETER_VALIDATION_FAILED", "Blocked", { requestId: request.requestId, errors: parameterErrors });

    const budget = namespace.checkExternalIntelligenceResourceBudget({ budgetIds: request.budgetIds, sourceId: request.sourceId, goalId: request.researchGoalId, planId: request.acquisitionPlanId, requestId: request.requestId, pricingMode: state.sourceRegistry.get(request.sourceId).pricingMode, paidRequest: state.sourceRegistry.get(request.sourceId).pricingMode !== "FREE", estimatedUsage: operationContract.estimatedUsage });
    if (!budget.ok) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_BUDGET_VALIDATION_FAILED", "Blocked", { requestId: request.requestId, budget: budget });

    const authorityAction = internal.text(settings.authorityAction, "EXECUTE_EXTERNAL_ACQUISITION");
    const authority = namespace.evaluateExternalIntelligenceAuthority({ action: authorityAction, target: { type: "external-acquisition", id: request.requestId }, purpose: request.purpose });
    const requireAuthority = settings.requireExecutionAuthority !== false;
    if (requireAuthority && !authority.allowed) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_EXECUTION_AUTHORITY_DENIED", "Blocked", { requestId: request.requestId, authority: authority, requestValidationGrantsExecutionAuthority: false });

    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_REQUEST_VALID", "Ready", {
      requestId: request.requestId,
      sourceResolution: sourceResolution.data,
      operationContract: operationContract,
      budget: budget.data,
      authority: authority,
      executionAuthorityGranted: requireAuthority ? authority.allowed === true : false,
      validationGrantsExecutionAuthority: false
    });
  }

  function createAttemptRecord(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const request = state.acquisitionRequests.get(internal.text(source.requestId, ""));
    if (!request) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ATTEMPT_REQUEST_NOT_FOUND", "Blocked", null);
    const attemptNumber = Number.isInteger(source.attemptNumber) ? source.attemptNumber : 1;
    const record = {
      attemptId: internal.nextId("EXTERNAL-010-ATTEMPT"),
      requestId: request.requestId,
      sourceId: request.sourceId,
      operationId: request.operationId,
      attemptNumber: attemptNumber,
      adapterId: internal.text(source.adapterId, ""),
      adapterVersion: internal.text(source.adapterVersion, ""),
      routeId: internal.text(source.routeId, "") || null,
      startedAt: internal.nowIso(),
      completedAt: null,
      status: "RUNNING",
      retryable: false,
      errorId: null,
      responseId: null,
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("externalAcquisitionAttempt", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-ACQUISITION-ATTEMPT", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ATTEMPT_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(record));
    state.acquisitionAttempts.set(record.attemptId, frozen);
    if (!state.acquisitionAttemptOrder.has(request.requestId)) state.acquisitionAttemptOrder.set(request.requestId, []);
    state.acquisitionAttemptOrder.get(request.requestId).push(record.attemptId);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_ATTEMPT_STARTED", "Running", { attempt: internal.clone(frozen) });
  }

  function completeAttempt(attemptId, patch) {
    const current = state.acquisitionAttempts.get(attemptId);
    if (!current) return null;
    const next = internal.deepFreeze(Object.assign({}, internal.clone(current), internal.clone(patch || {}), { attemptId: current.attemptId, completedAt: internal.nowIso(), immutable: true }));
    state.acquisitionAttempts.set(attemptId, next);
    internal.touch();
    return next;
  }

  function sanitizeErrorMessage(value) {
    return internal.text(value, "External acquisition failed")
      .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [REDACTED]")
      .replace(/((?:api[_-]?key|token|password|secret|credential)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]");
  }

  function mapExternalIntelligenceAcquisitionError(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const category = ACQ.errorCategories.includes(upper(source.category, "UNKNOWN")) ? upper(source.category, "UNKNOWN") : "UNKNOWN";
    const record = {
      errorId: internal.nextId("EXTERNAL-010-ERROR"),
      errorCode: upper(source.errorCode, "EXTERNAL_ACQUISITION_FAILED"),
      category: category,
      message: sanitizeErrorMessage(source.message),
      retryable: Boolean(source.retryable),
      sourceId: normalizeSourceId(source.sourceId),
      operationId: normalizeOperationId(source.operationId),
      requestId: internal.text(source.requestId, ""),
      attemptId: internal.text(source.attemptId, ""),
      occurredAt: internal.nowIso(),
      rawProviderStatus: source.rawProviderStatus == null ? null : sanitizeErrorMessage(String(source.rawProviderStatus)),
      secretRedacted: true,
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("externalAcquisitionError", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-ACQUISITION-ERROR", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ERROR_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(record));
    state.acquisitionErrors.set(frozen.errorId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_ERROR_MAPPED", "Ready", { error: internal.clone(frozen) });
  }

  function buildExternalIntelligenceAcquisitionResponse(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const record = {
      responseId: internal.nextId("EXTERNAL-010-RESPONSE"),
      requestId: internal.text(source.requestId, ""),
      attemptId: internal.text(source.attemptId, ""),
      sourceId: normalizeSourceId(source.sourceId),
      operationId: normalizeOperationId(source.operationId),
      status: upper(source.status, "SUCCESS"),
      responseMetadata: internal.isPlainObject(source.responseMetadata) ? internal.redactSensitive(source.responseMetadata) : {},
      temporalMetadata: internal.isPlainObject(source.temporalMetadata) ? internal.clone(source.temporalMetadata) : {},
      payload: source.payload == null ? null : internal.redactSensitive(source.payload),
      evidenceInput: internal.isPlainObject(source.evidenceInput) ? internal.redactSensitive(source.evidenceInput) : {},
      externalResponseGrantsAuthority: false,
      knowledgePromotionPerformed: false,
      canonicalRepositoryMutationPerformed: false,
      createdAt: internal.nowIso(),
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("externalAcquisitionResponse", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-ACQUISITION-RESPONSE", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_RESPONSE_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(record));
    state.acquisitionResponses.set(record.responseId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_RESPONSE_BUILT", "Ready", { response: internal.clone(frozen) });
  }

  function getExternalIntelligenceAcquisitionAttempts(requestId) {
    const ids = state.acquisitionAttemptOrder.get(internal.text(requestId, "")) || [];
    return ids.map(function get(id) { return state.acquisitionAttempts.get(id); }).filter(Boolean).map(internal.clone);
  }

  function initializeExternalIntelligenceAcquisitionContract() {
    namespace.modules.acquisitionContract.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_CONTRACT_INITIALIZED", "Ready", { unifiedContract: true, adapterDirectInvocationAsNormalFlow: false, maxRetryAttempts: ACQ.maxRetryAttempts });
  }

  internal.createExternalIntelligenceAcquisitionAttempt = createAttemptRecord;
  internal.completeExternalIntelligenceAcquisitionAttempt = completeAttempt;
  internal.getExternalIntelligenceSourceOperationContract = getExternalIntelligenceSourceOperationContract;

  Object.assign(namespace.api, {
    initializeExternalIntelligenceAcquisitionContract: initializeExternalIntelligenceAcquisitionContract,
    registerExternalIntelligenceSourceOperationContract: registerExternalIntelligenceSourceOperationContract,
    getExternalIntelligenceSourceOperationContract: getExternalIntelligenceSourceOperationContract,
    listExternalIntelligenceSourceOperationContracts: listExternalIntelligenceSourceOperationContracts,
    createExternalIntelligenceAcquisitionRequest: createExternalIntelligenceAcquisitionRequest,
    getExternalIntelligenceAcquisitionRequest: getExternalIntelligenceAcquisitionRequest,
    listExternalIntelligenceAcquisitionRequests: listExternalIntelligenceAcquisitionRequests,
    validateExternalIntelligenceAcquisitionRequest: validateExternalIntelligenceAcquisitionRequest,
    getExternalIntelligenceAcquisitionAttempts: getExternalIntelligenceAcquisitionAttempts,
    mapExternalIntelligenceAcquisitionError: mapExternalIntelligenceAcquisitionError,
    buildExternalIntelligenceAcquisitionResponse: buildExternalIntelligenceAcquisitionResponse
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.acquisitionContract = {
    id: "EXTERNAL-010-ACQUISITION-CONTRACT",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    unifiedContract: true,
    adapterDirectInvocationAsNormalFlow: false,
    validationGrantsExecutionAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
