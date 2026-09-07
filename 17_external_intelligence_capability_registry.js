/* ============================================================
   FILE: 17_external_intelligence_capability_registry.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.7.0
   Phase 08: Analytical Capability Registry
   Primary Decision: 036
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 capability registry blocked: dependencies missing.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("capabilityRegistry");

  ["analyticalCapabilities", "analyticalCapabilityVersions", "capabilityPerformanceProfiles", "analysisExecutionRecords", "capabilityFallbackRecords"].forEach(function ensure(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  const TYPES = new Set(VERSION_MANIFEST.analyticalCapability.capabilityTypes || []);
  const AVAILABILITY = new Set(VERSION_MANIFEST.analyticalCapability.availabilityStates || []);
  const ROLES = new Set(VERSION_MANIFEST.analyticalCapability.roles || []);
  const OUTPUTS = new Set(VERSION_MANIFEST.analyticalCapability.outputClassifications || []);
  const SENSITIVE_INPUT_KEY = /(^|[_-])(secret|token|password|credential|authorization|api[_-]?key|private[_-]?key|session[_-]?key)(value)?($|[_-])/i;
  const SAFE_KEYS = new Set(["secretReferenceId", "secretType"]);

  function hasSensitiveValue(value) {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(hasSensitiveValue);
    return Object.keys(value).some(function inspect(key) {
      if (SAFE_KEYS.has(key)) return false;
      if (SENSITIVE_INPUT_KEY.test(key) && value[key] != null && String(value[key]) !== "") return true;
      return hasSensitiveValue(value[key]);
    });
  }

  function normalizeStringArray(values, fallback) {
    const out = internal.unique(values).map(function upper(v) { return String(v).toUpperCase(); });
    return out.length ? out : (fallback ? [fallback] : []);
  }

  function capabilityVersionKey(capabilityId, recordVersion) {
    return capabilityId + "@" + String(recordVersion);
  }

  function registerExternalIntelligenceAnalyticalCapability(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (hasSensitiveValue(x)) {
      return internal.buildResult(false, "EXTERNAL010_CAPABILITY_SECRET_VALUE_REJECTED", "Blocked", {
        secretReferenceOnlyRequired: true,
        secretValueStored: false
      });
    }
    const capabilityId = internal.text(x.capabilityId, "");
    const recordVersion = internal.text(x.recordVersion || x.capabilityVersion, "1.0.0");
    const capabilityType = internal.text(x.capabilityType, "UNKNOWN").toUpperCase();
    const availabilityState = internal.text(x.availabilityState, "UNKNOWN").toUpperCase();
    const roles = normalizeStringArray(x.roles, "PRIMARY");
    const outputClassifications = normalizeStringArray(x.outputClassifications, "MODEL_ANALYSIS");
    if (!capabilityId || !/^EXTERNAL-010-CAPABILITY-[A-Z0-9._-]+$/i.test(capabilityId)) {
      return internal.buildResult(false, "EXTERNAL010_CAPABILITY_ID_INVALID", "Blocked", { capabilityId: capabilityId || null });
    }
    if (!TYPES.has(capabilityType) || !AVAILABILITY.has(availabilityState) || roles.some(function (r) { return !ROLES.has(r); }) || outputClassifications.some(function (o) { return !OUTPUTS.has(o); })) {
      return internal.buildResult(false, "EXTERNAL010_CAPABILITY_ENUM_INVALID", "Blocked", { capabilityType, availabilityState, roles, outputClassifications });
    }

    const existingCurrent = state.analyticalCapabilities.get(capabilityId) || null;
    const createdAt = existingCurrent ? existingCurrent.createdAt : internal.nowIso();
    const record = internal.deepFreeze({
      capabilityId,
      recordVersion,
      capabilityType,
      providerId: internal.text(x.providerId, "LOCAL"),
      modelFamily: internal.text(x.modelFamily, "UNKNOWN"),
      modelVersion: internal.text(x.modelVersion, "UNKNOWN"),
      algorithmVersion: internal.text(x.algorithmVersion, "UNKNOWN"),
      supportedTasks: normalizeStringArray(x.supportedTasks, "GENERAL_ANALYSIS"),
      supportedDomains: normalizeStringArray(x.supportedDomains, "GENERAL"),
      supportedHorizons: normalizeStringArray(x.supportedHorizons, "ANY"),
      supportedInputTypes: normalizeStringArray(x.supportedInputTypes, "TEXT"),
      costProfile: internal.isPlainObject(x.costProfile) ? internal.clone(x.costProfile) : { pricingMode: "UNKNOWN", estimatedCost: null, currency: null },
      latencyProfile: internal.isPlainObject(x.latencyProfile) ? internal.clone(x.latencyProfile) : { class: "UNKNOWN", estimatedMs: null },
      availabilityState,
      executionLocation: internal.text(x.executionLocation, "LOCAL").toUpperCase(),
      dataHandlingPolicy: internal.isPlainObject(x.dataHandlingPolicy) ? internal.clone(x.dataHandlingPolicy) : { externalTransmissionAllowed: false, allowedDataClasses: ["PUBLIC", "DERIVED"] },
      secretReferenceId: internal.text(x.secretReferenceId, "") || null,
      roles,
      outputClassifications,
      active: x.active !== false,
      modelNameEqualsStableAnalyticalIdentity: false,
      analysisOutputIsPrimaryEvidence: false,
      highPerformanceGrantsActionAuthority: false,
      automaticPromotionPerformed: false,
      secretValueStored: false,
      createdAt,
      updatedAt: internal.nowIso(),
      immutable: true
    });

    const key = capabilityVersionKey(capabilityId, recordVersion);
    if (state.analyticalCapabilityVersions.has(key)) {
      const existing = state.analyticalCapabilityVersions.get(key);
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_CAPABILITY_VERSION_ALREADY_REGISTERED" : "EXTERNAL010_CAPABILITY_VERSION_CONFLICT", same ? "Ready" : "Blocked", { analyticalCapability: internal.clone(existing) });
    }

    const cv = namespace.validateExternalIntelligenceContract("analyticalCapability", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-ANALYTICAL-CAPABILITY", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_RECORD_INVALID", "Blocked", { contract: cv, schema: sv });

    state.analyticalCapabilityVersions.set(key, record);
    state.analyticalCapabilities.set(capabilityId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_REGISTERED", "Ready", { analyticalCapability: internal.clone(record) });
  }

  function getExternalIntelligenceAnalyticalCapability(capabilityId, recordVersion) {
    const id = internal.text(capabilityId, "");
    if (!id) return null;
    const record = recordVersion ? state.analyticalCapabilityVersions.get(capabilityVersionKey(id, recordVersion)) : state.analyticalCapabilities.get(id);
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceAnalyticalCapabilities(options) {
    const x = internal.isPlainObject(options) ? options : {};
    let list = Array.from(state.analyticalCapabilities.values());
    if (x.activeOnly === true) list = list.filter(function (r) { return r.active === true; });
    if (x.role) list = list.filter(function (r) { return r.roles.includes(String(x.role).toUpperCase()); });
    return list.map(internal.clone);
  }

  function recordExternalIntelligenceCapabilityPerformanceProfile(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const capabilityId = internal.text(x.capabilityId, "");
    if (!state.analyticalCapabilities.has(capabilityId)) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_NOT_FOUND", "Blocked", { capabilityId });
    const record = internal.deepFreeze({
      performanceProfileId: internal.nextId("EXTERNAL-010-CAPABILITY-PERFORMANCE"),
      capabilityId,
      capabilityRecordVersion: state.analyticalCapabilities.get(capabilityId).recordVersion,
      taskType: internal.text(x.taskType, "GENERAL_ANALYSIS").toUpperCase(),
      domain: internal.text(x.domain, "GENERAL").toUpperCase(),
      horizon: internal.text(x.horizon, "ANY").toUpperCase(),
      evaluationType: internal.text(x.evaluationType, "HISTORICAL").toUpperCase(),
      sampleCount: Number.isFinite(Number(x.sampleCount)) ? Number(x.sampleCount) : 0,
      metrics: internal.isPlainObject(x.metrics) ? internal.clone(x.metrics) : {},
      outcomeGrounded: x.outcomeGrounded === true,
      evaluationEvidenceRefs: internal.unique(x.evaluationEvidenceRefs),
      performanceGrantsRoutingAuthority: false,
      performanceGrantsActionAuthority: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("capabilityPerformanceProfile", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-CAPABILITY-PERFORMANCE-PROFILE", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_PERFORMANCE_INVALID", "Blocked", { contract: cv, schema: sv });
    state.capabilityPerformanceProfiles.set(record.performanceProfileId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_PERFORMANCE_RECORDED", "Ready", { performanceProfile: internal.clone(record) });
  }

  function listExternalIntelligenceCapabilityPerformanceProfiles(capabilityId) {
    const id = internal.text(capabilityId, "");
    return Array.from(state.capabilityPerformanceProfiles.values()).filter(function (r) { return !id || r.capabilityId === id; }).map(internal.clone);
  }

  function createExternalIntelligenceAnalysisExecutionRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const capabilityId = internal.text(x.capabilityId, "");
    const capability = state.analyticalCapabilities.get(capabilityId);
    if (!capability) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_NOT_FOUND", "Blocked", { capabilityId });
    const outputClassification = internal.text(x.outputClassification, "MODEL_ANALYSIS").toUpperCase();
    if (!OUTPUTS.has(outputClassification)) return internal.buildResult(false, "EXTERNAL010_ANALYSIS_OUTPUT_CLASS_INVALID", "Blocked", { outputClassification });
    const record = internal.deepFreeze({
      analysisExecutionId: internal.nextId("EXTERNAL-010-ANALYSIS-EXECUTION"),
      capabilityId,
      capabilityRecordVersion: capability.recordVersion,
      taskType: internal.text(x.taskType, "GENERAL_ANALYSIS").toUpperCase(),
      domain: internal.text(x.domain, "GENERAL").toUpperCase(),
      horizon: internal.text(x.horizon, "ANY").toUpperCase(),
      inputReferenceIds: internal.unique(x.inputReferenceIds),
      outputReferenceIds: internal.unique(x.outputReferenceIds),
      outputClassification,
      executionState: internal.text(x.executionState, "RECORDED").toUpperCase(),
      externalTransmissionPerformed: x.externalTransmissionPerformed === true,
      externalTransmissionPolicyValidated: x.externalTransmissionPolicyValidated === true,
      aiAnalysisEqualsPrimaryEvidence: false,
      instructionAuthorityGranted: false,
      repositoryAuthorityGranted: false,
      financialAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("analysisExecutionRecord", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-ANALYSIS-EXECUTION-RECORD", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_ANALYSIS_EXECUTION_INVALID", "Blocked", { contract: cv, schema: sv });
    state.analysisExecutionRecords.set(record.analysisExecutionId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ANALYSIS_EXECUTION_RECORDED", "Ready", { analysisExecution: internal.clone(record) });
  }

  function createExternalIntelligenceCapabilityFallbackRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const requestedCapabilityId = internal.text(x.requestedCapabilityId, "");
    const executedCapabilityId = internal.text(x.executedCapabilityId, "");
    if (!requestedCapabilityId || !executedCapabilityId || !state.analyticalCapabilities.has(executedCapabilityId)) return internal.buildResult(false, "EXTERNAL010_FALLBACK_CAPABILITY_INVALID", "Blocked", { requestedCapabilityId, executedCapabilityId });
    const record = internal.deepFreeze({
      fallbackRecordId: internal.nextId("EXTERNAL-010-CAPABILITY-FALLBACK"),
      requestedCapabilityId,
      executedCapabilityId,
      reason: internal.text(x.reason, "UNAVAILABLE").toUpperCase(),
      policyRevalidated: x.policyRevalidated === true,
      costRevalidated: x.costRevalidated === true,
      dataPolicyRevalidated: x.dataPolicyRevalidated === true,
      silentFallback: false,
      fallbackCanBypassPolicy: false,
      fallbackResultEqualsRequestedModelResult: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("capabilityFallbackRecord", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-CAPABILITY-FALLBACK-RECORD", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_FALLBACK_INVALID", "Blocked", { contract: cv, schema: sv });
    state.capabilityFallbackRecords.set(record.fallbackRecordId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_FALLBACK_RECORDED", "Ready", { fallbackRecord: internal.clone(record) });
  }

  function initializeExternalIntelligenceCapabilityRegistry() {
    namespace.modules.capabilityRegistry.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_REGISTRY_INITIALIZED", "Ready", {
      registeredCapabilityCount: state.analyticalCapabilities.size,
      versionedCapabilityCount: state.analyticalCapabilityVersions.size,
      secretReferenceOnly: true
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceCapabilityRegistry,
    registerExternalIntelligenceAnalyticalCapability,
    getExternalIntelligenceAnalyticalCapability,
    listExternalIntelligenceAnalyticalCapabilities,
    recordExternalIntelligenceCapabilityPerformanceProfile,
    listExternalIntelligenceCapabilityPerformanceProfiles,
    createExternalIntelligenceAnalysisExecutionRecord,
    createExternalIntelligenceCapabilityFallbackRecord
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.capabilityRegistry = {
    id: "EXTERNAL-010-ANALYTICAL-CAPABILITY-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    decisions: ["036"],
    stableIdentity: true,
    versionedHistory: true,
    secretReferenceOnly: true,
    automaticPromotionAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
