/* ============================================================
   FILE: 13_development_automation_contracts.js
   IDE-190 Development Automation
   Release: 1.1.0 / Module: Contracts 1.1.0
   Phase 2: IDE-180 Intake / Grounding
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 contracts blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("contracts");
  const AUTOMATION_LEVEL_IDS = VERSION_MANIFEST.automationLevels.map(function map(item) { return item.id; });
  const MUTATION_LEVEL_IDS = VERSION_MANIFEST.mutationLevels.map(function map(item) { return item.id; });
  const EXECUTION_MODE_IDS = VERSION_MANIFEST.executionModes.map(function map(item) { return item.id; });
  const EXTERNAL_EFFECT_LEVEL_IDS = VERSION_MANIFEST.externalEffectLevels.map(function map(item) { return item.id; });
  const PERMISSION_CLASSES = ["Policy-Controlled", "Controlled", "Approval-Required", "PROHIBITED"];

  function field(name, options) {
    return Object.assign({ name: name, required: false }, options || {});
  }

  const BUILT_IN_CONTRACTS = [
    {
      key: "foundation",
      name: "IDE-190 Foundation Contract",
      description: "Frozen Phase 1 identity, lifecycle, safety, permission and common runtime boundary.",
      fields: [
        field("componentId", { required: true, type: "string", enum: ["IDE-190"] }),
        field("componentName", { required: true, type: "string", enum: ["Development Automation"] }),
        field("releaseVersion", { required: true, type: "string" }),
        field("designFreezeId", { required: true, type: "string", enum: ["IDE-190-DESIGN-FREEZE-1.0.0"] }),
        field("architectureStatus", { required: true, type: "string", enum: ["DESIGN COMPLETE / FROZEN"] }),
        field("mission", { required: true, type: "string", enum: ["Safe Automation Orchestrator"] }),
        field("lifecycle", { required: true, type: "array" }),
        field("automationLevels", { required: true, type: "array" }),
        field("approvalClasses", { required: true, type: "array" }),
        field("mutationLevels", { required: true, type: "array" }),
        field("executionModes", { required: true, type: "array" }),
        field("validationLayers", { required: true, type: "array" }),
        field("externalEffectLevels", { required: true, type: "array" }),
        field("safetyDefaults", { required: true, type: "object" }),
        field("commonRuntime", { required: true, type: "object" })
      ]
    },
    {
      key: "foundationState",
      name: "IDE-190 Foundation State Contract",
      description: "Phase 1 component state only. No automation session, approval, dispatch or mutation state is synthesized here.",
      fields: [
        field("initialized", { required: true, type: "boolean" }),
        field("currentPhase", { required: true, type: "integer", enum: [1, 2] }),
        field("releaseAllowed", { required: true, type: "boolean", enum: [false] }),
        field("ide190Complete", { required: true, type: "boolean", enum: [false] }),
        field("phase2Allowed", { required: true, type: "boolean" }),
        field("phase3Allowed", { required: true, type: "boolean" }),
        field("lastPreDeviceValidation", { required: true, type: "object|null" }),
        field("lastAndroidValidation", { required: true, type: "object|null" }),
        field("lastPhase2Validation", { required: true, type: "object|null" }),
        field("lastPhase2AndroidValidation", { required: true, type: "object|null" })
      ]
    },
    {
      key: "capabilityDescriptor",
      name: "IDE-190 Capability Descriptor Contract",
      description: "Describes capability existence separately from current execution permission.",
      fields: [
        field("capabilityId", { required: true, type: "string" }),
        field("capabilityVersion", { required: true, type: "string" }),
        field("ownerComponentId", { required: true, type: "string" }),
        field("capabilityType", { required: true, type: "string" }),
        field("available", { required: true, type: "boolean" }),
        field("permissionClass", { required: true, type: "string", enum: PERMISSION_CLASSES }),
        field("automationLevel", { required: true, type: "string", enum: AUTOMATION_LEVEL_IDS }),
        field("mutationLevel", { required: true, type: "string", enum: MUTATION_LEVEL_IDS }),
        field("executionMode", { required: true, type: "string", enum: EXECUTION_MODE_IDS }),
        field("externalEffectLevel", { required: true, type: "string", enum: EXTERNAL_EFFECT_LEVEL_IDS }),
        field("operations", { required: true, type: "array" }),
        field("source", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "platformProfile",
      name: "IDE-190 Platform Profile Contract",
      description: "Capability-based Common Web Runtime profile that cannot escalate permission.",
      fields: [
        field("profileId", { required: true, type: "string" }),
        field("runtime", { required: true, type: "string", enum: ["Common Web Runtime"] }),
        field("deviceClass", { required: true, type: "string" }),
        field("userAgent", { required: true, type: "string" }),
        field("screen", { required: true, type: "object" }),
        field("input", { required: true, type: "object" }),
        field("capabilities", { required: true, type: "object" }),
        field("permissionIndependent", { required: true, type: "boolean", enum: [true] }),
        field("persistentCommitPermission", { required: true, type: "boolean", enum: [false] }),
        field("githubAutomaticReflectionPermission", { required: true, type: "boolean", enum: [false] }),
        field("approvalBypassAllowed", { required: true, type: "boolean", enum: [false] })
      ]
    }    ,
    {
      key: "navigationIntake",
      name: "IDE-190 Validated Navigation Intake Contract",
      description: "Accepts only a validated immutable IDE-180 Navigation Package plus a validated IDE-180 to IDE-190 Handoff without provider bypass or inferred source completion.",
      fields: [
        field("intakeId", { required: true, type: "string" }),
        field("sourceComponentId", { required: true, type: "string", enum: ["IDE-180"] }),
        field("groundingInputType", { required: true, type: "string", enum: ["validated-ide180-package-plus-handoff"] }),
        field("packageId", { required: true, type: "string" }),
        field("packageHash", { required: true, type: "string" }),
        field("handoffId", { required: true, type: "string" }),
        field("handoffHash", { required: true, type: "string" }),
        field("navigationStatus", { required: true, type: "string" }),
        field("packageValidationValid", { required: true, type: "boolean", enum: [true] }),
        field("handoffValidationValid", { required: true, type: "boolean", enum: [true] }),
        field("linkageValid", { required: true, type: "boolean", enum: [true] }),
        field("providerBypassUsed", { required: true, type: "boolean", enum: [false] }),
        field("missingSourceInferenceUsed", { required: true, type: "boolean", enum: [false] }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "groundingContext",
      name: "IDE-190 Grounding Context Contract",
      description: "Source-bounded V0 Grounding derived only from a validated IDE-180 intake. Missing Source remains explicit and recovery is delegated to IDE-180.",
      fields: [
        field("groundingId", { required: true, type: "string" }),
        field("intakeId", { required: true, type: "string" }),
        field("packageId", { required: true, type: "string" }),
        field("handoffId", { required: true, type: "string" }),
        field("canonicalTarget", { required: true, type: "object" }),
        field("navigationStatus", { required: true, type: "string" }),
        field("groundingStatus", { required: true, type: "string", enum: ["Grounded", "Partial", "Recovery-Required"] }),
        field("authority", { required: true, type: "object" }),
        field("evidence", { required: true, type: "array" }),
        field("lineage", { required: true, type: "array" }),
        field("validation", { required: true, type: "object" }),
        field("conflicts", { required: true, type: "array" }),
        field("missingSources", { required: true, type: "array" }),
        field("sourceSnapshot", { required: true, type: "object" }),
        field("structuredExplanation", { required: true, type: "object" }),
        field("inferenceUsed", { required: true, type: "boolean", enum: [false] }),
        field("authorityRecomputed", { required: true, type: "boolean", enum: [false] }),
        field("providerCompositionUsed", { required: true, type: "boolean", enum: [false] }),
        field("planEligible", { required: true, type: "boolean" }),
        field("dispatchEligible", { required: true, type: "boolean", enum: [false] }),
        field("recoveryDelegation", { required: true, type: "object" }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    }
  ];

  function typeMatches(value, type) {
    if (type === "array") return Array.isArray(value);
    if (type === "object") return internal.isPlainObject(value);
    if (type === "boolean") return typeof value === "boolean";
    if (type === "integer") return Number.isInteger(value);
    if (type === "string") return typeof value === "string";
    if (type === "object|null") return value == null || internal.isPlainObject(value);
    return true;
  }

  function normalizeDefinition(definition) {
    const key = internal.text(definition && definition.key, "");
    const contractId = VERSION_MANIFEST.getContractId(key);
    const version = VERSION_MANIFEST.getContractVersion(key);
    return internal.deepFreeze({
      contractId: contractId,
      key: key,
      name: internal.text(definition && definition.name, key),
      version: version,
      status: "Active",
      description: internal.text(definition && definition.description, ""),
      fields: (definition && Array.isArray(definition.fields) ? definition.fields : []).map(function copyField(item) {
        return Object.freeze(Object.assign({}, item));
      }),
      readOnly: true,
      owner: "IDE-190",
      source: "IDE-190-DESIGN-FREEZE-1.0.0"
    });
  }

  function registerContract(definition) {
    const normalized = normalizeDefinition(definition);
    if (!normalized.contractId || !normalized.version) {
      return internal.buildResult(false, "IDE190_CONTRACT_DEFINITION_INVALID", "Blocked", null, {
        error: { message: "Contract ID or version is missing.", category: "Validation Failure" }
      });
    }
    const existing = state.contracts.get(normalized.contractId);
    if (existing && existing.version === normalized.version) {
      return internal.buildResult(true, "IDE190_CONTRACT_EXISTS", "Ready", { contract: internal.clone(existing), existing: true });
    }
    if (existing && existing.version !== normalized.version) {
      return internal.buildResult(false, "IDE190_CONTRACT_VERSION_CONFLICT", "Blocked", {
        existing: internal.clone(existing), incoming: internal.clone(normalized)
      });
    }
    state.contracts.set(normalized.contractId, normalized);
    internal.touch();
    return internal.buildResult(true, "IDE190_CONTRACT_REGISTERED", "Ready", { contract: internal.clone(normalized), existing: false });
  }

  function getContractDefinition(contractIdOrKey) {
    const direct = state.contracts.get(internal.text(contractIdOrKey, ""));
    if (direct) return internal.clone(direct);
    const id = VERSION_MANIFEST.getContractId(internal.text(contractIdOrKey, ""));
    return id && state.contracts.has(id) ? internal.clone(state.contracts.get(id)) : null;
  }

  function listContractDefinitions() {
    return Array.from(state.contracts.values()).map(function copy(item) { return internal.clone(item); });
  }

  function validateContract(contractIdOrKey, payload) {
    const definition = getContractDefinition(contractIdOrKey);
    const checks = [];
    function check(name, passed, detail, fieldName) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), field: fieldName || null });
    }

    check("Contract definition exists", Boolean(definition), contractIdOrKey);
    if (!definition) return { valid: false, status: "Invalid", passed: 0, failed: 1, total: 1, health: 0, checks: checks };

    check("Payload is an object", internal.isPlainObject(payload), typeof payload);
    if (!internal.isPlainObject(payload)) {
  
    if (definition.key === "navigationIntake") {
      check("Formal input uses validated IDE-180 package and handoff", payload.groundingInputType === "validated-ide180-package-plus-handoff", payload.groundingInputType, "groundingInputType");
      check("IDE-180 Provider bypass is not used", payload.providerBypassUsed === false, payload.providerBypassUsed, "providerBypassUsed");
      check("Missing Source inference is not used", payload.missingSourceInferenceUsed === false, payload.missingSourceInferenceUsed, "missingSourceInferenceUsed");
      check("Package and Handoff linkage is valid", payload.linkageValid === true, payload.linkageValid, "linkageValid");
    }

    if (definition.key === "groundingContext") {
      const hasMissing = Array.isArray(payload.missingSources) && payload.missingSources.length > 0;
      check("Grounding never uses inference", payload.inferenceUsed === false, payload.inferenceUsed, "inferenceUsed");
      check("Grounding never recomputes IDE-180 Authority", payload.authorityRecomputed === false, payload.authorityRecomputed, "authorityRecomputed");
      check("Grounding never composes IDE-180 Providers", payload.providerCompositionUsed === false, payload.providerCompositionUsed, "providerCompositionUsed");
      check("Phase 2 never becomes Dispatch eligible", payload.dispatchEligible === false, payload.dispatchEligible, "dispatchEligible");
      if (hasMissing) {
        check("Missing Source requires Recovery-Required", payload.groundingStatus === "Recovery-Required", payload.groundingStatus, "groundingStatus");
        check("Missing Source cannot become Plan eligible", payload.planEligible === false, payload.planEligible, "planEligible");
        check("Missing Source Recovery is delegated to IDE-180", payload.recoveryDelegation && payload.recoveryDelegation.ownerComponentId === "IDE-180", payload.recoveryDelegation && payload.recoveryDelegation.ownerComponentId, "recoveryDelegation.ownerComponentId");
      }
    }

    const passed = checks.filter(function count(item) { return item.passed; }).length;
      return { valid: false, status: "Invalid", contractId: definition.contractId, contractVersion: definition.version, passed: passed, failed: checks.length - passed, total: checks.length, health: Number(((passed / checks.length) * 100).toFixed(2)), checks: checks };
    }

    definition.fields.forEach(function validateField(rule) {
      const has = Object.prototype.hasOwnProperty.call(payload, rule.name);
      if (rule.required) check("Required field exists: " + rule.name, has, has ? "present" : "missing", rule.name);
      if (!has) return;
      check("Field type is valid: " + rule.name, typeMatches(payload[rule.name], rule.type), rule.type || "any", rule.name);
      if (Array.isArray(rule.enum)) check("Field value is governed: " + rule.name, rule.enum.includes(payload[rule.name]), payload[rule.name], rule.name);
    });

    if (definition.key === "foundation") {
      check("Frozen lifecycle is exact", JSON.stringify(payload.lifecycle) === JSON.stringify(VERSION_MANIFEST.lifecycle), payload.lifecycle && payload.lifecycle.join(" -> "), "lifecycle");
      const safetyKeys = Object.keys(VERSION_MANIFEST.safety);
      check("Safety key set is exact", JSON.stringify(Object.keys(payload.safetyDefaults || {}).sort()) === JSON.stringify(safetyKeys.slice().sort()), safetyKeys.length, "safetyDefaults");
      safetyKeys.forEach(function validateSafety(key) {
        check("Safety remains false: " + key, payload.safetyDefaults && payload.safetyDefaults[key] === false, payload.safetyDefaults && payload.safetyDefaults[key], "safetyDefaults." + key);
      });
    }

    if (definition.key === "capabilityDescriptor") {
      const prohibited = payload.automationLevel === "L5" || payload.mutationLevel === "M3" || payload.executionMode === "E2" || payload.externalEffectLevel === "X2" || payload.externalEffectLevel === "X3";
      if (prohibited) check("Initial hard-deny capability remains prohibited", payload.permissionClass === "PROHIBITED", payload.permissionClass, "permissionClass");
      check("Capability existence does not imply permission", !(payload.available === true && prohibited && payload.permissionClass !== "PROHIBITED"), payload.available + "/" + payload.permissionClass, "available");
    }

    if (definition.key === "platformProfile") {
      check("Platform does not grant persistent commit", payload.persistentCommitPermission === false, payload.persistentCommitPermission, "persistentCommitPermission");
      check("Platform does not grant GitHub automatic reflection", payload.githubAutomaticReflectionPermission === false, payload.githubAutomaticReflectionPermission, "githubAutomaticReflectionPermission");
      check("Platform does not bypass approval", payload.approvalBypassAllowed === false, payload.approvalBypassAllowed, "approvalBypassAllowed");
    }

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return {
      valid: failed === 0,
      status: failed === 0 ? "Valid" : "Invalid",
      contractId: definition.contractId,
      contractVersion: definition.version,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function initializeContracts() {
    const results = BUILT_IN_CONTRACTS.map(registerContract);
    const failed = results.filter(function failedResult(result) { return !result || result.ok !== true; });
    namespace.modules.contracts.status = failed.length === 0 ? "Ready" : "Blocked";
    return internal.buildResult(
      failed.length === 0,
      failed.length === 0 ? "IDE190_CONTRACTS_INITIALIZED" : "IDE190_CONTRACTS_INITIALIZATION_FAILED",
      failed.length === 0 ? "Ready" : "Blocked",
      { registered: state.contracts.size, expected: BUILT_IN_CONTRACTS.length, results: results }
    );
  }

  Object.assign(namespace.api, {
    initializeContracts: initializeContracts,
    registerContract: registerContract,
    getContractDefinition: getContractDefinition,
    listContractDefinitions: listContractDefinitions,
    validateContract: validateContract
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.contracts = {
    id: "IDE-190-CONTRACTS",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    contractCount: BUILT_IN_CONTRACTS.length,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
