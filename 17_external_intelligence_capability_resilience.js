/* ============================================================
   FILE: 17_external_intelligence_capability_resilience.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.19.0
   Phase 20: Capability Resilience / Disaster Recovery
   Primary Decision: 020
   Supporting Decisions: 013 / 051 / 054
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("capabilityResilience");
  const HEALTH_STATES = new Set(["READY", "DEGRADED", "UNAVAILABLE", "BLOCKED", "RECOVERING", "UNKNOWN"]);
  const COMPONENT_CRITICALITY = new Set(["CRITICAL", "REQUIRED", "OPTIONAL"]);

  ["componentHealthRecords", "capabilityHealthDefinitions", "capabilityHealthRecords", "recoveryActivities"].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  const DEFINITIONS = [
    ["componentHealthRecord", "EXTERNAL-010-CONTRACT-COMPONENT-HEALTH", "EXTERNAL-010-SCHEMA-COMPONENT-HEALTH", [
      "componentHealthRecordId", "componentId", "componentType", "healthState", "reasonCode", "criticality",
      "securityCritical", "offlineAvailable", "observedAt", "recoveryCorrelationId", "details", "immutable"
    ]],
    ["capabilityHealthDefinition", "EXTERNAL-010-CONTRACT-CAPABILITY-HEALTH-DEFINITION", "EXTERNAL-010-SCHEMA-CAPABILITY-HEALTH-DEFINITION", [
      "capabilityId", "requiredComponents", "optionalComponents", "securityCriticalComponents", "offlineAvailable",
      "unknownImpliesReady", "createdAt", "immutable"
    ]],
    ["capabilityHealthRecord", "EXTERNAL-010-CONTRACT-CAPABILITY-HEALTH-RECORD", "EXTERNAL-010-SCHEMA-CAPABILITY-HEALTH-RECORD", [
      "capabilityHealthRecordId", "capabilityId", "healthState", "reasonCodes", "componentStates", "evaluatedAt",
      "safeToResume", "authorityGranted", "unknownImpliesReady", "immutable"
    ]],
    ["recoveryActivity", "EXTERNAL-010-CONTRACT-RECOVERY-ACTIVITY", "EXTERNAL-010-SCHEMA-RECOVERY-ACTIVITY", [
      "recoveryActivityId", "correlationId", "scope", "state", "startedAt", "completedAt", "validationState",
      "controlledResumeAllowed", "authorityEscalationPerformed", "details", "immutable"
    ]]
  ];

  function registerDefinitions() {
    const results = [];
    DEFINITIONS.forEach(function register(definition) {
      const key = definition[0], contractId = definition[1], schemaId = definition[2], fields = definition[3];
      if (typeof namespace.registerExternalIntelligenceContract === "function") {
        results.push(namespace.registerExternalIntelligenceContract({
          contractId, key, name: key + " Contract", version: MODULE_VERSION, immutable: true,
          fields: fields.map(function field(name) { return { name, required: true }; }), source: "phase20"
        }));
      }
      if (typeof namespace.registerExternalIntelligenceSchema === "function") {
        results.push(namespace.registerExternalIntelligenceSchema({
          schemaId, name: key + " Schema", version: MODULE_VERSION, type: "object", required: fields,
          properties: Object.fromEntries(fields.map(function prop(name) { return [name, {}]; })),
          additionalProperties: true, immutable: true, owner: "EXTERNAL-010", source: "phase20"
        }));
      }
    });
    return results;
  }

  registerDefinitions();

  function upper(value, fallback) { return internal.text(value, fallback || "").toUpperCase(); }
  function health(value) { const v = upper(value, "UNKNOWN"); return HEALTH_STATES.has(v) ? v : "UNKNOWN"; }
  function criticality(value) { const v = upper(value, "REQUIRED"); return COMPONENT_CRITICALITY.has(v) ? v : "REQUIRED"; }
  function clone(value) { return internal.clone(value); }

  function validateRecord(contractKey, schemaId, record) {
    const cv = namespace.validateExternalIntelligenceContract(contractKey, record);
    const sv = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return { valid: cv.valid === true && sv.valid === true, contract: cv, schema: sv };
  }

  async function audit(eventType, outcome, details, references) {
    if (typeof namespace.appendExternalIntelligenceAuditEvent !== "function") return null;
    return namespace.appendExternalIntelligenceAuditEvent({
      eventType, actor: "EXTERNAL-010-PHASE20-RESILIENCE", outcome: outcome || "Recorded",
      details: clone(details || {}), references: internal.unique(references || [])
    });
  }

  function reportExternalIntelligenceComponentHealth(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const componentId = internal.text(x.componentId, "");
    if (!componentId) return internal.buildResult(false, "EXTERNAL010_COMPONENT_ID_REQUIRED", "Blocked", null);
    const record = internal.deepFreeze({
      componentHealthRecordId: internal.text(x.componentHealthRecordId, "") || internal.nextId("EXTERNAL-010-COMPONENT-HEALTH"),
      componentId,
      componentType: upper(x.componentType, "OTHER"),
      healthState: health(x.healthState),
      reasonCode: upper(x.reasonCode, "NONE"),
      criticality: criticality(x.criticality),
      securityCritical: x.securityCritical === true,
      offlineAvailable: x.offlineAvailable === true,
      observedAt: internal.text(x.observedAt, "") || internal.nowIso(),
      recoveryCorrelationId: internal.text(x.recoveryCorrelationId, "") || null,
      details: internal.isPlainObject(x.details) ? clone(x.details) : {},
      immutable: true
    });
    const validation = validateRecord("componentHealthRecord", "EXTERNAL-010-SCHEMA-COMPONENT-HEALTH", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_COMPONENT_HEALTH_INVALID", "Blocked", validation);
    state.componentHealthRecords.set(componentId, record);
    state.componentHealthRecords.set(record.componentHealthRecordId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_COMPONENT_HEALTH_RECORDED", record.healthState, { componentHealth: clone(record) });
  }

  function defineExternalIntelligenceCapabilityHealth(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const capabilityId = internal.text(x.capabilityId, "");
    if (!capabilityId) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_ID_REQUIRED", "Blocked", null);
    const requiredComponents = internal.unique(x.requiredComponents || []);
    const optionalComponents = internal.unique(x.optionalComponents || []).filter(function notRequired(id) { return !requiredComponents.includes(id); });
    const securityCriticalComponents = internal.unique(x.securityCriticalComponents || []).filter(function present(id) { return requiredComponents.includes(id) || optionalComponents.includes(id); });
    const record = internal.deepFreeze({
      capabilityId, requiredComponents, optionalComponents, securityCriticalComponents,
      offlineAvailable: x.offlineAvailable === true,
      unknownImpliesReady: false,
      createdAt: internal.text(x.createdAt, "") || internal.nowIso(),
      immutable: true
    });
    const validation = validateRecord("capabilityHealthDefinition", "EXTERNAL-010-SCHEMA-CAPABILITY-HEALTH-DEFINITION", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_HEALTH_DEFINITION_INVALID", "Blocked", validation);
    state.capabilityHealthDefinitions.set(capabilityId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_HEALTH_DEFINED", "Ready", { definition: clone(record) });
  }

  function latestComponentHealth(componentId) {
    return state.componentHealthRecords.get(internal.text(componentId, "")) || null;
  }

  function evaluateExternalIntelligenceCapabilityHealth(input) {
    const x = internal.isPlainObject(input) ? input : { capabilityId: input };
    const capabilityId = internal.text(x.capabilityId, "");
    const definition = state.capabilityHealthDefinitions.get(capabilityId);
    if (!definition) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_HEALTH_DEFINITION_NOT_FOUND", "Blocked", { capabilityId });

    const componentStates = {};
    const reasonCodes = [];
    let resultState = "READY";
    let requiredUnknown = false;
    let requiredUnavailable = false;
    let requiredRecovering = false;
    let requiredDegraded = false;
    let requiredBlocked = false;
    let optionalDegraded = false;

    definition.requiredComponents.forEach(function inspect(componentId) {
      const record = latestComponentHealth(componentId);
      const componentState = record ? record.healthState : "UNKNOWN";
      componentStates[componentId] = componentState;
      if (!record) reasonCodes.push("COMPONENT_HEALTH_MISSING:" + componentId);
      else if (record.reasonCode && record.reasonCode !== "NONE") reasonCodes.push(record.reasonCode + ":" + componentId);
      if (definition.securityCriticalComponents.includes(componentId) && ["UNKNOWN", "UNAVAILABLE", "DEGRADED", "BLOCKED"].includes(componentState)) requiredBlocked = true;
      else if (componentState === "BLOCKED") requiredBlocked = true;
      else if (componentState === "UNAVAILABLE") requiredUnavailable = true;
      else if (componentState === "RECOVERING") requiredRecovering = true;
      else if (componentState === "UNKNOWN") requiredUnknown = true;
      else if (componentState === "DEGRADED") requiredDegraded = true;
    });

    definition.optionalComponents.forEach(function inspectOptional(componentId) {
      const record = latestComponentHealth(componentId);
      const componentState = record ? record.healthState : "UNKNOWN";
      componentStates[componentId] = componentState;
      if (componentState !== "READY") optionalDegraded = true;
    });

    if (requiredBlocked) resultState = "BLOCKED";
    else if (requiredUnavailable) resultState = definition.offlineAvailable ? "DEGRADED" : "UNAVAILABLE";
    else if (requiredRecovering) resultState = "RECOVERING";
    else if (requiredUnknown) resultState = "UNKNOWN";
    else if (requiredDegraded || optionalDegraded) resultState = "DEGRADED";

    const record = internal.deepFreeze({
      capabilityHealthRecordId: internal.nextId("EXTERNAL-010-CAPABILITY-HEALTH"),
      capabilityId,
      healthState: resultState,
      reasonCodes: internal.unique(reasonCodes),
      componentStates,
      evaluatedAt: internal.nowIso(),
      safeToResume: resultState === "READY" || resultState === "DEGRADED",
      authorityGranted: false,
      unknownImpliesReady: false,
      immutable: true
    });
    const validation = validateRecord("capabilityHealthRecord", "EXTERNAL-010-SCHEMA-CAPABILITY-HEALTH-RECORD", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_CAPABILITY_HEALTH_INVALID", "Blocked", validation);
    state.capabilityHealthRecords.set(capabilityId, record);
    state.capabilityHealthRecords.set(record.capabilityHealthRecordId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_HEALTH_EVALUATED", resultState, { capabilityHealth: clone(record) });
  }

  async function beginExternalIntelligenceRecoveryActivity(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const recoveryActivityId = internal.text(x.recoveryActivityId, "") || internal.nextId("EXTERNAL-010-RECOVERY-ACTIVITY");
    const correlationId = internal.text(x.correlationId, "") || internal.nextId("EXTERNAL-010-RECOVERY-CORRELATION");
    const record = internal.deepFreeze({
      recoveryActivityId, correlationId, scope: internal.text(x.scope, "EXTERNAL-010"), state: "RECOVERING",
      startedAt: internal.nowIso(), completedAt: null, validationState: "PENDING", controlledResumeAllowed: false,
      authorityEscalationPerformed: false, details: internal.isPlainObject(x.details) ? clone(x.details) : {}, immutable: true
    });
    const validation = validateRecord("recoveryActivity", "EXTERNAL-010-SCHEMA-RECOVERY-ACTIVITY", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_RECOVERY_ACTIVITY_INVALID", "Blocked", validation);
    state.recoveryActivities.set(recoveryActivityId, record); internal.touch();
    await audit("RECOVERY_STARTED", "Recovering", { recoveryActivityId, correlationId, scope: record.scope, authorityEscalationPerformed: false }, [recoveryActivityId]);
    return internal.buildResult(true, "EXTERNAL010_RECOVERY_ACTIVITY_STARTED", "Recovering", { recoveryActivity: clone(record) });
  }

  async function completeExternalIntelligenceRecoveryActivity(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const id = internal.text(x.recoveryActivityId, "");
    const existing = state.recoveryActivities.get(id);
    if (!existing) return internal.buildResult(false, "EXTERNAL010_RECOVERY_ACTIVITY_NOT_FOUND", "Blocked", { recoveryActivityId: id || null });
    const validationState = upper(x.validationState, "FAIL");
    const success = ["PASS", "PASS_WITH_WARNINGS"].includes(validationState);
    const next = internal.deepFreeze(Object.assign({}, clone(existing), {
      state: success ? (validationState === "PASS" ? "READY" : "DEGRADED") : "BLOCKED",
      completedAt: internal.nowIso(), validationState,
      controlledResumeAllowed: success,
      authorityEscalationPerformed: false,
      details: Object.assign({}, clone(existing.details), internal.isPlainObject(x.details) ? clone(x.details) : {}),
      immutable: true
    }));
    state.recoveryActivities.set(id, next); internal.touch();
    await audit(success ? "RECOVERY_VALIDATED" : "RECOVERY_VALIDATION_FAILED", success ? "Validated" : "Blocked", {
      recoveryActivityId: id, correlationId: next.correlationId, validationState, controlledResumeAllowed: next.controlledResumeAllowed,
      authorityEscalationPerformed: false
    }, [id]);
    return internal.buildResult(success, success ? "EXTERNAL010_RECOVERY_ACTIVITY_VALIDATED" : "EXTERNAL010_RECOVERY_ACTIVITY_BLOCKED", next.state, { recoveryActivity: clone(next) });
  }

  function getExternalIntelligenceComponentHealth(componentId) {
    const record = latestComponentHealth(componentId);
    return record ? clone(record) : null;
  }
  function getExternalIntelligenceCapabilityHealth(capabilityId) {
    const record = state.capabilityHealthRecords.get(internal.text(capabilityId, ""));
    return record ? clone(record) : null;
  }
  function listExternalIntelligenceComponentHealth() {
    const seen = new Set(), out = [];
    state.componentHealthRecords.forEach(function collect(record) {
      if (!record || seen.has(record.componentHealthRecordId)) return;
      seen.add(record.componentHealthRecordId); out.push(clone(record));
    });
    return out;
  }

  function installDefaultDefinitions() {
    const definitions = [
      { capabilityId: "EXTERNAL-010-CAPABILITY-EXISTING-EVIDENCE-READ", requiredComponents: ["EVIDENCE_STORE"], optionalComponents: ["GATEWAY"], offlineAvailable: true },
      { capabilityId: "EXTERNAL-010-CAPABILITY-PUBLIC-EXTERNAL-ACQUISITION", requiredComponents: ["GATEWAY", "SOURCE_ROUTER"], optionalComponents: ["NETWORK"], offlineAvailable: false },
      { capabilityId: "EXTERNAL-010-CAPABILITY-AUTHENTICATED-EXTERNAL-ACQUISITION", requiredComponents: ["GATEWAY", "SOURCE_ROUTER", "SECRET_STORE"], optionalComponents: ["NETWORK"], securityCriticalComponents: ["SECRET_STORE"], offlineAvailable: false },
      { capabilityId: "EXTERNAL-010-CAPABILITY-SECURITY-SCANNED-PARSE", requiredComponents: ["EVIDENCE_STORE", "MALWARE_SCANNER", "PARSER"], securityCriticalComponents: ["MALWARE_SCANNER"], offlineAvailable: true }
    ];
    definitions.forEach(function ensure(definition) {
      if (!state.capabilityHealthDefinitions.has(definition.capabilityId)) defineExternalIntelligenceCapabilityHealth(definition);
    });
  }

  function initializeExternalIntelligenceCapabilityResilience() {
    registerDefinitions(); installDefaultDefinitions();
    namespace.modules.capabilityResilience.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_CAPABILITY_RESILIENCE_INITIALIZED", "Ready", {
      decision: "020", capabilityDefinitionCount: state.capabilityHealthDefinitions.size,
      unknownImpliesReady: false, automaticSecurityDowngradeAllowed: false, recoveryGrantsAuthority: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceCapabilityResilience,
    reportExternalIntelligenceComponentHealth,
    defineExternalIntelligenceCapabilityHealth,
    evaluateExternalIntelligenceCapabilityHealth,
    getExternalIntelligenceComponentHealth,
    getExternalIntelligenceCapabilityHealth,
    listExternalIntelligenceComponentHealth,
    beginExternalIntelligenceRecoveryActivity,
    completeExternalIntelligenceRecoveryActivity
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.capabilityResilience = {
    id: "EXTERNAL-010-CAPABILITY-RESILIENCE", version: MODULE_VERSION, status: "Loaded", phase: 20, decisions: ["020", "013", "051", "054"],
    partialFailureImpliesTotalShutdown: false, unknownStateImpliesReady: false, scannerUnavailableAllowsRequiredScanBypass: false,
    gatewayFailureImpliesCoreFailure: false, sourceFailureImpliesExternalPlatformFailure: false, gatewayRestartImpliesBlindRetry: false,
    recoveryImpliesAuthorityEscalation: false, securityFailureAutoDowngradeAllowed: false, loadedAt: internal.nowIso()
  };

  installDefaultDefinitions();
})(typeof window !== "undefined" ? window : globalThis);
