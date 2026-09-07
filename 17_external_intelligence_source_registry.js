/* ============================================================
   FILE: 17_external_intelligence_source_registry.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.2.0
   Phase 03: Registry-First Governed Source Identity
   Decisions: 004 / 023 / 025
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 source registry blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("sourceRegistry");
  const SOURCE_TYPES = VERSION_MANIFEST.sourceGovernance.sourceTypes.slice();
  const ACCESS_MODES = VERSION_MANIFEST.sourceGovernance.accessModes.slice();
  const AUTH_MODES = VERSION_MANIFEST.sourceGovernance.authenticationModes.slice();
  const PRICING_MODES = VERSION_MANIFEST.sourceGovernance.pricingModes.slice();
  const INITIAL_METHODS = VERSION_MANIFEST.sourceGovernance.initialAllowedHttpMethods.slice();
  const SENSITIVE_KEY = /(password|api[_-]?key|bearer[_-]?token|access[_-]?token|refresh[_-]?token|private[_-]?key|authorization|secret(?!ReferenceId$))/i;

  function upper(value, fallback) {
    return internal.text(value, fallback || "").toUpperCase().replace(/[^A-Z0-9_:-]/g, "_");
  }

  function sourceId(value) {
    const normalized = upper(value, "").replace(/_/g, "-");
    return /^SOURCE-[A-Z0-9-]+$/.test(normalized) ? normalized : "";
  }

  function containsSensitiveValue(value, keyPath) {
    if (Array.isArray(value)) return value.some(function item(v, index) { return containsSensitiveValue(v, (keyPath || "") + "[" + index + "]"); });
    if (!internal.isPlainObject(value)) return false;
    return Object.keys(value).some(function keySensitive(key) {
      if (key === "secretReferenceId" || key === "credentialReferenceId" || key === "authenticationReferenceId") return false;
      if (SENSITIVE_KEY.test(key)) return true;
      return containsSensitiveValue(value[key], (keyPath ? keyPath + "." : "") + key);
    });
  }

  function normalizeEndpointPolicy(value) {
    const source = internal.isPlainObject(value) ? value : {};
    return {
      canonicalHost: internal.text(source.canonicalHost, ""),
      endpointReference: internal.text(source.endpointReference, ""),
      directUrlAccessAllowed: false,
      arbitraryPathAllowed: false,
      allowRedirects: source.allowRedirects === true,
      operationResolutionRequired: true
    };
  }

  function normalizeSourceInput(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const methods = internal.unique(source.allowedMethods).map(function method(v) { return upper(v, ""); });
    return {
      sourceId: sourceId(source.sourceId),
      sourceName: internal.text(source.sourceName, ""),
      sourceType: upper(source.sourceType, "OTHER"),
      provider: internal.text(source.provider, ""),
      category: upper(source.category, "GENERAL"),
      accessMode: upper(source.accessMode, "DISABLED"),
      adapterId: internal.text(source.adapterId, ""),
      endpointPolicy: normalizeEndpointPolicy(source.endpointPolicy),
      authenticationMode: upper(source.authenticationMode, "NONE"),
      secretReferenceId: internal.text(source.secretReferenceId, "") || null,
      allowedOperations: internal.unique(source.allowedOperations).map(function operation(v) { return upper(v, ""); }),
      allowedMethods: methods.length ? methods : INITIAL_METHODS.slice(),
      pricingMode: upper(source.pricingMode, "UNKNOWN"),
      costCurrency: upper(source.costCurrency, "JPY"),
      identityState: upper(source.identityState, "UNVERIFIED"),
      discoveryId: internal.text(source.discoveryId, "") || null,
      purpose: internal.text(source.purpose, "source-governance")
    };
  }

  function validateSourceInput(original, normalized) {
    const errors = [];
    if (containsSensitiveValue(original)) errors.push("SECRET_VALUE_PRESENT");
    if (!normalized.sourceId) errors.push("SOURCE_ID_INVALID");
    if (!normalized.sourceName) errors.push("SOURCE_NAME_REQUIRED");
    if (!normalized.provider) errors.push("PROVIDER_REQUIRED");
    if (!SOURCE_TYPES.includes(normalized.sourceType)) errors.push("SOURCE_TYPE_INVALID");
    if (!ACCESS_MODES.includes(normalized.accessMode)) errors.push("ACCESS_MODE_INVALID");
    if (!AUTH_MODES.includes(normalized.authenticationMode)) errors.push("AUTHENTICATION_MODE_INVALID");
    if (!PRICING_MODES.includes(normalized.pricingMode)) errors.push("PRICING_MODE_INVALID");
    if (!normalized.allowedOperations.length) errors.push("ALLOWED_OPERATIONS_REQUIRED");
    if (normalized.allowedMethods.some(function method(v) { return !INITIAL_METHODS.includes(v); })) errors.push("NON_READ_METHOD_NOT_ALLOWED_PHASE3");
    if (normalized.authenticationMode !== "NONE" && !normalized.secretReferenceId) errors.push("SECRET_REFERENCE_REQUIRED");
    if (normalized.authenticationMode === "NONE" && normalized.secretReferenceId) errors.push("SECRET_REFERENCE_WITH_NONE_AUTH");
    if (normalized.accessMode !== "DISABLED" && !normalized.adapterId) errors.push("ADAPTER_REQUIRED");
    return errors;
  }

  function authority(action, id, purpose) {
    return namespace.evaluateExternalIntelligenceAuthority({
      action: action,
      target: { type: "source", id: id || "*" },
      purpose: internal.text(purpose, "source-governance")
    });
  }

  function historyFor(id) {
    if (!state.sourceVersions.has(id)) state.sourceVersions.set(id, []);
    return state.sourceVersions.get(id);
  }

  function storeSnapshot(record) {
    const frozen = internal.deepFreeze(internal.clone(record));
    state.sourceRegistry.set(frozen.sourceId, frozen);
    historyFor(frozen.sourceId).push(frozen);
    internal.touch();
    return frozen;
  }

  function commitSourceVersion(id, patch) {
    const current = state.sourceRegistry.get(internal.text(id, ""));
    if (!current) return null;
    const now = internal.nowIso();
    const next = Object.assign({}, internal.clone(current), internal.clone(patch || {}), {
      sourceId: current.sourceId,
      version: current.version + 1,
      createdAt: current.createdAt,
      updatedAt: now,
      authorityGranted: false,
      immutable: true
    });
    const validation = namespace.validateExternalIntelligenceContract("sourceRecord", next);
    const schemaValidation = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SOURCE-RECORD", next);
    if (!validation.valid || !schemaValidation.valid) return null;
    return storeSnapshot(next);
  }

  async function registerExternalIntelligenceSource(input) {
    const original = internal.isPlainObject(input) ? input : {};
    const normalized = normalizeSourceInput(original);
    const errors = validateSourceInput(original, normalized);
    if (errors.length) return internal.buildResult(false, "EXTERNAL010_SOURCE_REGISTRATION_INVALID", "Blocked", { errors: errors });
    if (state.sourceRegistry.has(normalized.sourceId)) return internal.buildResult(false, "EXTERNAL010_SOURCE_DUPLICATE", "Blocked", { sourceId: normalized.sourceId });

    if (normalized.discoveryId) {
      const discovery = state.sourceDiscoveryRecords.get(normalized.discoveryId);
      if (!discovery) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_NOT_FOUND", "Blocked", { discoveryId: normalized.discoveryId });
      if (discovery.lifecycleState !== "ASSESSED") return internal.buildResult(false, "EXTERNAL010_SOURCE_DISCOVERY_NOT_ASSESSED", "Blocked", { discoveryId: normalized.discoveryId, lifecycleState: discovery.lifecycleState });
    }

    const gate = authority("REGISTER_EXTERNAL_SOURCE", normalized.sourceId, normalized.purpose);
    if (!gate.allowed) return internal.buildResult(false, "EXTERNAL010_SOURCE_REGISTRATION_AUTHORITY_DENIED", "Blocked", { sourceId: normalized.sourceId, authority: gate, registrationPerformed: false });

    const now = internal.nowIso();
    const record = {
      sourceId: normalized.sourceId,
      sourceName: normalized.sourceName,
      sourceType: normalized.sourceType,
      provider: normalized.provider,
      category: normalized.category,
      accessMode: normalized.accessMode,
      adapterId: normalized.adapterId,
      endpointPolicy: normalized.endpointPolicy,
      authenticationMode: normalized.authenticationMode,
      secretReferenceId: normalized.secretReferenceId,
      allowedOperations: normalized.allowedOperations,
      allowedMethods: normalized.allowedMethods,
      pricingMode: normalized.pricingMode,
      costCurrency: normalized.costCurrency,
      enabled: false,
      lifecycleState: "REGISTERED",
      version: 1,
      identityState: normalized.identityState,
      reliabilityState: "UNASSESSED",
      authorityGranted: false,
      discoveryId: normalized.discoveryId,
      createdAt: now,
      updatedAt: now,
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("sourceRecord", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SOURCE-RECORD", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_SOURCE_RECORD_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = storeSnapshot(record);
    if (normalized.discoveryId && typeof internal.markExternalSourceDiscoveryLifecycle === "function") internal.markExternalSourceDiscoveryLifecycle(normalized.discoveryId, "REGISTERED", frozen.sourceId);
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") {
      await namespace.appendExternalIntelligenceAuditEvent({ eventType: "SOURCE_REGISTERED", actor: "Governed Source Registry", outcome: "Registered", details: { sourceId: frozen.sourceId, sourceVersion: frozen.version, discoveryId: frozen.discoveryId, authorityEnvelopeId: gate.authorityEnvelopeId } });
    }
    return internal.buildResult(true, "EXTERNAL010_SOURCE_REGISTERED", "Registered", { source: internal.clone(frozen), authority: gate, secretValueStored: false });
  }

  function getExternalIntelligenceSource(id) {
    const record = state.sourceRegistry.get(sourceId(id));
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceSources(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    return Array.from(state.sourceRegistry.values()).filter(function filter(record) {
      if (settings.enabled === true && !record.enabled) return false;
      if (settings.sourceType && record.sourceType !== upper(settings.sourceType, "")) return false;
      if (settings.category && record.category !== upper(settings.category, "")) return false;
      return true;
    }).map(internal.clone);
  }

  function getExternalIntelligenceSourceHistory(id) {
    const values = state.sourceVersions.get(sourceId(id)) || [];
    return values.map(internal.clone);
  }

  async function enableExternalIntelligenceSource(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = sourceId(settings.sourceId);
    const current = state.sourceRegistry.get(id);
    const purpose = internal.text(settings.purpose, "source-governance");
    if (!current) return internal.buildResult(false, "EXTERNAL010_SOURCE_NOT_FOUND", "Blocked", { sourceId: id || null });
    if (current.lifecycleState === "DISABLED" && settings.reEnable !== true) return internal.buildResult(false, "EXTERNAL010_SOURCE_REENABLE_EXPLICIT_FLAG_REQUIRED", "Blocked", { sourceId: id });
    if (current.pricingMode !== "FREE" && current.pricingMode !== "UNKNOWN") return internal.buildResult(false, "EXTERNAL010_PAID_SOURCE_ENABLEMENT_REQUIRES_SEPARATE_ECONOMIC_AUTHORITY", "Blocked", { sourceId: id, pricingMode: current.pricingMode, automaticPaidSourceActivationAllowed: false });
    if (current.pricingMode === "UNKNOWN") return internal.buildResult(false, "EXTERNAL010_SOURCE_COST_UNKNOWN_REVIEW_REQUIRED", "Blocked", { sourceId: id });
    if (current.authenticationMode !== "NONE" && !current.secretReferenceId) return internal.buildResult(false, "EXTERNAL010_SOURCE_SECRET_BINDING_REQUIRED", "Blocked", { sourceId: id, automaticSecretBindingAllowed: false });
    const gate = authority("ENABLE_EXTERNAL_SOURCE", id, purpose);
    if (!gate.allowed) return internal.buildResult(false, "EXTERNAL010_SOURCE_ENABLEMENT_AUTHORITY_DENIED", "Blocked", { sourceId: id, authority: gate });

    const requestedOperations = internal.unique(settings.operations && settings.operations.length ? settings.operations : current.allowedOperations).map(function operation(v) { return upper(v, ""); });
    const unsupported = requestedOperations.filter(function unsupportedOperation(operation) { return !current.allowedOperations.includes(operation); });
    if (unsupported.length) return internal.buildResult(false, "EXTERNAL010_SOURCE_OPERATION_NOT_REGISTERED", "Blocked", { sourceId: id, unsupportedOperations: unsupported });
    if (typeof namespace.checkExternalIntelligenceUsagePolicy !== "function") return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_MODULE_REQUIRED", "Blocked", { sourceId: id });
    const policyChecks = requestedOperations.map(function policy(operation) { return namespace.checkExternalIntelligenceUsagePolicy({ sourceId: id, operation: operation }); });
    const blocked = policyChecks.filter(function blockedCheck(check) { return !check || check.ok !== true; });
    if (blocked.length) return internal.buildResult(false, "EXTERNAL010_SOURCE_USAGE_POLICY_BLOCKED", "Blocked", { sourceId: id, policyChecks: policyChecks });

    const next = commitSourceVersion(id, { enabled: true, lifecycleState: "ENABLED", enabledOperations: requestedOperations });
    if (!next) return internal.buildResult(false, "EXTERNAL010_SOURCE_ENABLEMENT_COMMIT_FAILED", "Failed", { sourceId: id });
    if (typeof internal.markExternalSourceDiscoveryLifecycle === "function" && next.discoveryId) internal.markExternalSourceDiscoveryLifecycle(next.discoveryId, "ENABLED", next.sourceId);
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "SOURCE_ENABLED", actor: "Governed Source Registry", outcome: "Enabled", details: { sourceId: id, sourceVersion: next.version, operations: requestedOperations, authorityEnvelopeId: gate.authorityEnvelopeId } });
    return internal.buildResult(true, "EXTERNAL010_SOURCE_ENABLED", "Enabled", { source: internal.clone(next), policyChecks: policyChecks, authority: gate });
  }

  async function activateExternalIntelligenceSource(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = sourceId(settings.sourceId);
    const current = state.sourceRegistry.get(id);
    const purpose = internal.text(settings.purpose, "source-governance");
    if (!current) return internal.buildResult(false, "EXTERNAL010_SOURCE_NOT_FOUND", "Blocked", { sourceId: id || null });
    if (!current.enabled || current.lifecycleState !== "ENABLED") return internal.buildResult(false, "EXTERNAL010_SOURCE_NOT_ENABLED", "Blocked", { sourceId: id, lifecycleState: current.lifecycleState });
    if (current.accessMode === "DISABLED") return internal.buildResult(false, "EXTERNAL010_SOURCE_ACCESS_MODE_DISABLED", "Blocked", { sourceId: id });
    if (!current.adapterId) return internal.buildResult(false, "EXTERNAL010_SOURCE_ADAPTER_REQUIRED", "Blocked", { sourceId: id });
    if (current.pricingMode !== "FREE") return internal.buildResult(false, "EXTERNAL010_PAID_OR_UNKNOWN_SOURCE_ACTIVATION_BLOCKED", "Blocked", { sourceId: id, pricingMode: current.pricingMode, automaticPaidSourceActivationAllowed: false });
    const gate = authority("ACTIVATE_EXTERNAL_SOURCE", id, purpose);
    if (!gate.allowed) return internal.buildResult(false, "EXTERNAL010_SOURCE_ACTIVATION_AUTHORITY_DENIED", "Blocked", { sourceId: id, authority: gate });
    const next = commitSourceVersion(id, { enabled: true, lifecycleState: "ACTIVE" });
    if (!next) return internal.buildResult(false, "EXTERNAL010_SOURCE_ACTIVATION_COMMIT_FAILED", "Failed", { sourceId: id });
    if (typeof internal.markExternalSourceDiscoveryLifecycle === "function" && next.discoveryId) internal.markExternalSourceDiscoveryLifecycle(next.discoveryId, "ACTIVE", next.sourceId);
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "SOURCE_ACTIVATED", actor: "Governed Source Registry", outcome: "Active", details: { sourceId: id, sourceVersion: next.version, authorityEnvelopeId: gate.authorityEnvelopeId } });
    return internal.buildResult(true, "EXTERNAL010_SOURCE_ACTIVATED", "Active", { source: internal.clone(next), authority: gate });
  }

  async function disableExternalIntelligenceSource(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = sourceId(settings.sourceId);
    const current = state.sourceRegistry.get(id);
    const purpose = internal.text(settings.purpose, "source-governance");
    if (!current) return internal.buildResult(false, "EXTERNAL010_SOURCE_NOT_FOUND", "Blocked", { sourceId: id || null });
    const gate = authority("DISABLE_EXTERNAL_SOURCE", id, purpose);
    if (!gate.allowed) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISABLE_AUTHORITY_DENIED", "Blocked", { sourceId: id, authority: gate });
    const next = commitSourceVersion(id, { enabled: false, lifecycleState: "DISABLED", disabledReason: internal.text(settings.reason, "Controlled disable") });
    if (!next) return internal.buildResult(false, "EXTERNAL010_SOURCE_DISABLE_COMMIT_FAILED", "Failed", { sourceId: id });
    if (typeof internal.markExternalSourceDiscoveryLifecycle === "function" && next.discoveryId) internal.markExternalSourceDiscoveryLifecycle(next.discoveryId, "DISABLED", next.sourceId);
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "SOURCE_DISABLED", actor: "Governed Source Registry", outcome: "Disabled", details: { sourceId: id, sourceVersion: next.version, reason: next.disabledReason, historicalEvidenceDeletionPerformed: false, authorityEnvelopeId: gate.authorityEnvelopeId } });
    return internal.buildResult(true, "EXTERNAL010_SOURCE_DISABLED", "Disabled", { source: internal.clone(next), historicalEvidenceDeletionPerformed: false, authority: gate });
  }

  function resolveExternalIntelligenceSourceForOperation(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const id = sourceId(settings.sourceId);
    const operation = upper(settings.operationId || settings.operation, "");
    const source = state.sourceRegistry.get(id);
    if (!source) return internal.buildResult(false, "EXTERNAL010_UNREGISTERED_SOURCE_ACCESS_BLOCKED", "Blocked", { sourceId: id || null, arbitraryUnregisteredSourceAccessAllowed: false });
    if (!source.enabled || source.lifecycleState !== "ACTIVE") return internal.buildResult(false, "EXTERNAL010_SOURCE_NOT_ACTIVE", "Blocked", { sourceId: id, lifecycleState: source.lifecycleState });
    if (!operation || !source.allowedOperations.includes(operation)) return internal.buildResult(false, "EXTERNAL010_SOURCE_OPERATION_NOT_ALLOWED", "Blocked", { sourceId: id, operationId: operation || null });
    if (typeof namespace.checkExternalIntelligenceUsagePolicy === "function") {
      const policy = namespace.checkExternalIntelligenceUsagePolicy({ sourceId: id, operation: operation });
      if (!policy || policy.ok !== true) return internal.buildResult(false, "EXTERNAL010_SOURCE_USAGE_POLICY_BLOCKED", "Blocked", { sourceId: id, operationId: operation, policy: policy });
    }
    return internal.buildResult(true, "EXTERNAL010_SOURCE_OPERATION_RESOLVED", "Ready", {
      sourceId: source.sourceId,
      sourceVersion: source.version,
      adapterId: source.adapterId,
      accessMode: source.accessMode,
      operationId: operation,
      endpointPolicy: internal.clone(source.endpointPolicy),
      reliabilityGranted: false,
      economicAuthorityGranted: false,
      sourceAuthorityGranted: false
    });
  }

  function initializeExternalIntelligenceSourceRegistry() {
    namespace.modules.sourceRegistry.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_SOURCE_REGISTRY_INITIALIZED", "Ready", {
      registryFirst: true,
      sourceCount: state.sourceRegistry.size,
      arbitraryUnregisteredSourceAccessAllowed: false,
      secretValuesStoredInRegistry: false,
      readOrientedMethods: INITIAL_METHODS.slice()
    });
  }

  internal.commitExternalIntelligenceSourceVersion = commitSourceVersion;
  internal.getExternalIntelligenceSourceSnapshot = function getSnapshot(id) {
    const record = state.sourceRegistry.get(sourceId(id));
    return record ? internal.clone(record) : null;
  };

  Object.assign(namespace.api, {
    initializeExternalIntelligenceSourceRegistry: initializeExternalIntelligenceSourceRegistry,
    registerExternalIntelligenceSource: registerExternalIntelligenceSource,
    getExternalIntelligenceSource: getExternalIntelligenceSource,
    listExternalIntelligenceSources: listExternalIntelligenceSources,
    getExternalIntelligenceSourceHistory: getExternalIntelligenceSourceHistory,
    enableExternalIntelligenceSource: enableExternalIntelligenceSource,
    activateExternalIntelligenceSource: activateExternalIntelligenceSource,
    disableExternalIntelligenceSource: disableExternalIntelligenceSource,
    resolveExternalIntelligenceSourceForOperation: resolveExternalIntelligenceSourceForOperation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.sourceRegistry = {
    id: "EXTERNAL-010-SOURCE-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    registryFirst: true,
    sourceIdentityGrantsReliability: false,
    sourceIdentityGrantsAuthority: false,
    automaticSourceActivationAllowed: false,
    secretValuesStoredInRegistry: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
