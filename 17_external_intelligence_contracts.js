/* ============================================================
   FILE: 17_external_intelligence_contracts.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.0.0
   Phase 01: Governance / Contract / Authority Foundation
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 contracts blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("contracts");

  function field(name, options) {
    return Object.assign({ name: name, required: false }, options || {});
  }

  const BUILT_IN_CONTRACTS = Object.freeze([
    {
      key: "foundationState",
      id: VERSION_MANIFEST.getContractId("foundationState"),
      name: "EXTERNAL-010 Foundation State Contract",
      version: VERSION_MANIFEST.getContractVersion("foundationState"),
      immutable: true,
      fields: [
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("componentName", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("implementationPhase", { required: true, type: "string" }),
        field("designFreezeId", { required: true, type: "string" }),
        field("decisionRange", { required: true, type: "string" }),
        field("decisionCount", { required: true, type: "number", enum: [54] }),
        field("initialized", { required: true, type: "boolean" }),
        field("safety", { required: true, type: "object" })
      ]
    },
    {
      key: "contractDefinition",
      id: VERSION_MANIFEST.getContractId("contractDefinition"),
      name: "EXTERNAL-010 Contract Definition Contract",
      version: VERSION_MANIFEST.getContractVersion("contractDefinition"),
      immutable: true,
      fields: [
        field("contractId", { required: true, type: "string", pattern: /^EXTERNAL-010-CONTRACT-[A-Z0-9-]+$/ }),
        field("key", { required: true, type: "string" }),
        field("name", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("fields", { required: true, type: "array" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "schemaDefinition",
      id: VERSION_MANIFEST.getContractId("schemaDefinition"),
      name: "EXTERNAL-010 Schema Definition Contract",
      version: VERSION_MANIFEST.getContractVersion("schemaDefinition"),
      immutable: true,
      fields: [
        field("schemaId", { required: true, type: "string", pattern: /^EXTERNAL-010-SCHEMA-[A-Z0-9-]+$/ }),
        field("name", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("type", { required: true, type: "string", enum: ["object"] }),
        field("required", { required: true, type: "array" }),
        field("properties", { required: true, type: "object" }),
        field("additionalProperties", { required: true, type: "boolean" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "compatibilityProfile",
      id: VERSION_MANIFEST.getContractId("compatibilityProfile"),
      name: "EXTERNAL-010 Compatibility Profile Contract",
      version: VERSION_MANIFEST.getContractVersion("compatibilityProfile"),
      immutable: true,
      fields: [
        field("compatibilityProfileId", { required: true, type: "string" }),
        field("recordType", { required: true, type: "string" }),
        field("readVersions", { required: true, type: "array" }),
        field("writeVersion", { required: true, type: "string" }),
        field("readOldWriteCurrent", { required: true, type: "boolean", enum: [true] }),
        field("silentUpgradeAllowed", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "authorityEnvelope",
      id: VERSION_MANIFEST.getContractId("authorityEnvelope"),
      name: "EXTERNAL-010 Authority Envelope Contract",
      version: VERSION_MANIFEST.getContractVersion("authorityEnvelope"),
      immutable: true,
      fields: [
        field("authorityEnvelopeId", { required: true, type: "string" }),
        field("action", { required: true, type: "string" }),
        field("target", { required: true, type: "object" }),
        field("purpose", { required: true, type: "string" }),
        field("scope", { required: true, type: "object" }),
        field("state", { required: true, type: "string", enum: ["CANDIDATE", "ACTIVE", "EXPIRED", "REVOKED", "BLOCKED"] }),
        field("approvalEvidenceId", { required: false, type: ["string", "null"] }),
        field("createdAt", { required: true, type: "string" }),
        field("expiresAt", { required: false, type: ["string", "null"] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "auditEvent",
      id: VERSION_MANIFEST.getContractId("auditEvent"),
      name: "EXTERNAL-010 Audit Event Contract",
      version: VERSION_MANIFEST.getContractVersion("auditEvent"),
      immutable: true,
      fields: [
        field("auditEventId", { required: true, type: "string" }),
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("sequence", { required: true, type: "number" }),
        field("eventType", { required: true, type: "string" }),
        field("actor", { required: true, type: "string" }),
        field("outcome", { required: true, type: "string" }),
        field("details", { required: true, type: "object" }),
        field("previousEventHash", { required: false, type: ["string", "null"] }),
        field("eventHash", { required: true, type: "string", pattern: /^[a-f0-9]{64}$/ }),
        field("appendOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "validationResult",
      id: VERSION_MANIFEST.getContractId("validationResult"),
      name: "EXTERNAL-010 Validation Result Contract",
      version: VERSION_MANIFEST.getContractVersion("validationResult"),
      immutable: true,
      fields: [
        field("id", { required: true, type: "string" }),
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("version", { required: true, type: "string" }),
        field("passed", { required: true, type: "number" }),
        field("failed", { required: true, type: "number" }),
        field("total", { required: true, type: "number" }),
        field("health", { required: true, type: "number" }),
        field("criticalFailed", { required: true, type: "number" }),
        field("status", { required: true, type: "string" }),
        field("releaseAllowed", { required: true, type: "boolean" }),
        field("phase2Allowed", { required: true, type: "boolean" }),
        field("validatedAt", { required: true, type: "string" })
      ]
    },
    {
      key: "promotionBoundary",
      id: VERSION_MANIFEST.getContractId("promotionBoundary"),
      name: "EXTERNAL-010 Promotion Boundary Contract",
      version: VERSION_MANIFEST.getContractVersion("promotionBoundary"),
      immutable: true,
      fields: [
        field("promotionBoundaryId", { required: true, type: "string" }),
        field("candidateType", { required: true, type: "string" }),
        field("automaticPromotionAllowed", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("validationEqualsApproval", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
  ]);

  function typeMatches(value, expected) {
    const types = Array.isArray(expected) ? expected : [expected];
    return types.some(function matches(type) {
      if (type === "null") return value === null;
      if (type === "array") return Array.isArray(value);
      if (type === "object") return internal.isPlainObject(value);
      if (type === "number") return typeof value === "number" && Number.isFinite(value);
      if (type === "boolean") return typeof value === "boolean";
      if (type === "string") return typeof value === "string";
      return true;
    });
  }

  function normalizeDefinition(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const fields = Array.isArray(source.fields) ? source.fields.map(function normalizeField(rule) {
      const copy = internal.clone(rule || {});
      copy.name = internal.text(copy.name, "");
      return copy;
    }) : [];
    return {
      contractId: internal.text(source.contractId || source.id, ""),
      key: internal.text(source.key, ""),
      name: internal.text(source.name, ""),
      version: internal.text(source.version, ""),
      fields: fields,
      immutable: source.immutable !== false,
      source: internal.text(source.source, "runtime")
    };
  }

  function findContract(contractIdOrKey) {
    const value = internal.text(contractIdOrKey, "");
    if (!value) return null;
    if (state.contracts.has(value)) return state.contracts.get(value);
    for (const item of state.contracts.values()) {
      if (item.key === value || item.contractId === value) return item;
    }
    return null;
  }

  function registerContract(input) {
    const definition = normalizeDefinition(input);
    if (!definition.contractId || !definition.key || !definition.name || !definition.version || !definition.fields.length) {
      return internal.buildResult(false, "EXTERNAL010_CONTRACT_DEFINITION_INVALID", "Blocked", { definition: definition });
    }
    if (!/^EXTERNAL-010-CONTRACT-[A-Z0-9-]+$/.test(definition.contractId)) {
      return internal.buildResult(false, "EXTERNAL010_CONTRACT_ID_INVALID", "Blocked", { contractId: definition.contractId });
    }
    const existing = findContract(definition.contractId) || findContract(definition.key);
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(internal.deepFreeze(internal.clone(definition)));
      return internal.buildResult(same, same ? "EXTERNAL010_CONTRACT_ALREADY_REGISTERED" : "EXTERNAL010_CONTRACT_DUPLICATE_CONFLICT", same ? "Ready" : "Blocked", { contract: internal.clone(existing) });
    }
    const frozen = internal.deepFreeze(internal.clone(definition));
    state.contracts.set(frozen.contractId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CONTRACT_REGISTERED", "Ready", { contract: internal.clone(frozen) });
  }

  function validateContract(contractIdOrKey, payload) {
    const definition = findContract(contractIdOrKey);
    const checks = [];
    if (!definition) {
      return { valid: false, contractId: contractIdOrKey || null, checks: [{ name: "Contract is registered", passed: false, detail: "not-found" }], validatedAt: internal.nowIso() };
    }
    const object = internal.isPlainObject(payload) ? payload : {};
    definition.fields.forEach(function validateField(rule) {
      const present = Object.prototype.hasOwnProperty.call(object, rule.name);
      checks.push({ name: rule.name + " presence", passed: rule.required !== true || present, detail: present ? "present" : "missing" });
      if (!present) return;
      const value = object[rule.name];
      if (rule.type) checks.push({ name: rule.name + " type", passed: typeMatches(value, rule.type), detail: typeof value });
      if (rule.enum) checks.push({ name: rule.name + " enum", passed: rule.enum.includes(value), detail: String(value) });
      if (rule.pattern && typeof value === "string") checks.push({ name: rule.name + " pattern", passed: rule.pattern.test(value), detail: value });
    });
    const valid = checks.every(function pass(item) { return item.passed; });
    return { valid: valid, contractId: definition.contractId, contractKey: definition.key, contractVersion: definition.version, checks: checks, validatedAt: internal.nowIso() };
  }

  function getContract(contractIdOrKey) {
    const definition = findContract(contractIdOrKey);
    return definition ? internal.clone(definition) : null;
  }

  function listContracts() {
    return Array.from(state.contracts.values()).map(internal.clone);
  }

  function initializeExternalIntelligenceContracts() {
    const results = BUILT_IN_CONTRACTS.map(function add(definition) {
      return registerContract(Object.assign({}, definition, { contractId: definition.id, source: "built-in" }));
    });
    const failed = results.filter(function failed(item) { return !item.ok; });
    namespace.modules.contracts.status = failed.length ? "Blocked" : "Ready";
    return internal.buildResult(failed.length === 0,
      failed.length ? "EXTERNAL010_CONTRACTS_INITIALIZATION_FAILED" : "EXTERNAL010_CONTRACTS_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      { builtInCount: BUILT_IN_CONTRACTS.length, registeredCount: state.contracts.size, results: results });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceContracts: initializeExternalIntelligenceContracts,
    registerExternalIntelligenceContract: registerContract,
    getExternalIntelligenceContract: getContract,
    listExternalIntelligenceContracts: listContracts,
    validateExternalIntelligenceContract: validateContract
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.contracts = {
    id: "EXTERNAL-010-CONTRACT-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    immutableDefinitions: true,
    duplicateProtection: true,
    unknownContractAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.validateExternalIntelligenceContract = validateContract;
  global.getExternalIntelligenceContracts = listContracts;
})(typeof window !== "undefined" ? window : globalThis);
