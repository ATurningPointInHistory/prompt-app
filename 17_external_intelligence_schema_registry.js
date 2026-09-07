/* ============================================================
   FILE: 17_external_intelligence_schema_registry.js
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
    console.warn("EXTERNAL-010 schema registry blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("schemaRegistry");

  function schema(id, name, required, properties) {
    return Object.freeze({
      schemaId: id,
      name: name,
      version: "1.0.0",
      type: "object",
      required: Object.freeze(required.slice()),
      properties: Object.freeze(properties),
      additionalProperties: true,
      immutable: true,
      owner: "EXTERNAL-010",
      source: "built-in"
    });
  }

  const BUILT_IN_SCHEMAS = Object.freeze([
    schema("EXTERNAL-010-SCHEMA-FOUNDATION-STATE", "External Intelligence Foundation State",
      ["componentId", "componentName", "version", "implementationPhase", "designFreezeId", "decisionRange", "decisionCount", "initialized", "safety"], {
        componentId: { type: "string", enum: ["EXTERNAL-010"] },
        componentName: { type: "string" },
        version: { type: "string" },
        implementationPhase: { type: "string" },
        designFreezeId: { type: "string" },
        decisionRange: { type: "string" },
        decisionCount: { type: "number", enum: [54] },
        initialized: { type: "boolean" },
        safety: { type: "object" }
      }),
    schema("EXTERNAL-010-SCHEMA-AUTHORITY-ENVELOPE", "External Intelligence Authority Envelope",
      ["authorityEnvelopeId", "action", "target", "purpose", "scope", "state", "createdAt", "immutable"], {
        authorityEnvelopeId: { type: "string" }, action: { type: "string" }, target: { type: "object" }, purpose: { type: "string" }, scope: { type: "object" },
        state: { type: "string", enum: ["CANDIDATE", "ACTIVE", "EXPIRED", "REVOKED", "BLOCKED"] }, approvalEvidenceId: { type: ["string", "null"] },
        createdAt: { type: "string" }, expiresAt: { type: ["string", "null"] }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-AUDIT-EVENT", "External Intelligence Audit Event",
      ["auditEventId", "componentId", "sequence", "eventType", "actor", "outcome", "details", "eventHash", "appendOnly", "immutable", "createdAt"], {
        auditEventId: { type: "string" }, componentId: { type: "string", enum: ["EXTERNAL-010"] }, sequence: { type: "number" }, eventType: { type: "string" },
        actor: { type: "string" }, outcome: { type: "string" }, details: { type: "object" }, previousEventHash: { type: ["string", "null"] },
        eventHash: { type: "string", pattern: "^[a-f0-9]{64}$" }, appendOnly: { type: "boolean", enum: [true] }, immutable: { type: "boolean", enum: [true] }, createdAt: { type: "string" }
      }),
    schema("EXTERNAL-010-SCHEMA-VALIDATION-RESULT", "External Intelligence Phase Validation Result",
      ["id", "componentId", "version", "passed", "failed", "total", "health", "criticalFailed", "status", "releaseAllowed", "phase2Allowed", "validatedAt"], {
        id: { type: "string" }, componentId: { type: "string", enum: ["EXTERNAL-010"] }, version: { type: "string" }, passed: { type: "number" }, failed: { type: "number" }, total: { type: "number" },
        health: { type: "number" }, criticalFailed: { type: "number" }, status: { type: "string" }, releaseAllowed: { type: "boolean" }, phase2Allowed: { type: "boolean" }, validatedAt: { type: "string" }
      }),
    schema("EXTERNAL-010-SCHEMA-PROMOTION-BOUNDARY", "External Intelligence Promotion Boundary",
      ["promotionBoundaryId", "candidateType", "automaticPromotionAllowed", "canonicalMutationPerformed", "validationEqualsApproval", "authorityEffect", "createdAt", "immutable"], {
        promotionBoundaryId: { type: "string" }, candidateType: { type: "string" }, automaticPromotionAllowed: { type: "boolean", enum: [false] }, canonicalMutationPerformed: { type: "boolean", enum: [false] },
        validationEqualsApproval: { type: "boolean", enum: [false] }, authorityEffect: { type: "string", enum: ["none"] }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      })
  ]);

  function normalizeSchema(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      schemaId: internal.text(source.schemaId || source.id, ""),
      name: internal.text(source.name, ""),
      version: internal.text(source.version, ""),
      type: internal.text(source.type, "object"),
      required: internal.unique(source.required),
      properties: internal.isPlainObject(source.properties) ? internal.clone(source.properties) : {},
      additionalProperties: source.additionalProperties !== false,
      immutable: source.immutable !== false,
      owner: internal.text(source.owner, "EXTERNAL-010"),
      source: internal.text(source.source, "runtime")
    };
  }

  function findSchema(schemaId) {
    const id = internal.text(schemaId, "");
    return id && state.schemas.has(id) ? state.schemas.get(id) : null;
  }

  function registerSchema(input) {
    const definition = normalizeSchema(input);
    if (!/^EXTERNAL-010-SCHEMA-[A-Z0-9-]+$/.test(definition.schemaId) || !definition.name || !definition.version || definition.type !== "object") {
      return internal.buildResult(false, "EXTERNAL010_SCHEMA_DEFINITION_INVALID", "Blocked", { schema: definition });
    }
    const contractValidation = namespace.validateExternalIntelligenceContract && namespace.validateExternalIntelligenceContract("schemaDefinition", definition);
    if (contractValidation && contractValidation.valid !== true) {
      return internal.buildResult(false, "EXTERNAL010_SCHEMA_CONTRACT_INVALID", "Blocked", { schema: definition, validation: contractValidation });
    }
    const existing = findSchema(definition.schemaId);
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(internal.deepFreeze(internal.clone(definition)));
      return internal.buildResult(same, same ? "EXTERNAL010_SCHEMA_ALREADY_REGISTERED" : "EXTERNAL010_SCHEMA_DUPLICATE_CONFLICT", same ? "Ready" : "Blocked", { schema: internal.clone(existing) });
    }
    const frozen = internal.deepFreeze(internal.clone(definition));
    state.schemas.set(frozen.schemaId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SCHEMA_REGISTERED", "Ready", { schema: internal.clone(frozen) });
  }

  function typeMatches(value, expected) {
    const types = Array.isArray(expected) ? expected : [expected];
    return types.some(function matches(type) {
      if (type === "null") return value === null;
      if (type === "array") return Array.isArray(value);
      if (type === "object") return internal.isPlainObject(value);
      if (type === "number") return typeof value === "number" && Number.isFinite(value);
      if (type === "integer") return Number.isInteger(value);
      if (type === "boolean") return typeof value === "boolean";
      if (type === "string") return typeof value === "string";
      return true;
    });
  }

  function validateRule(value, rule, path, errors) {
    if (!rule || typeof rule !== "object") return;
    if (rule.type && !typeMatches(value, rule.type)) {
      errors.push({ path: path, code: "TYPE_MISMATCH", expected: rule.type, actual: value === null ? "null" : Array.isArray(value) ? "array" : typeof value });
      return;
    }
    if (rule.enum && !rule.enum.includes(value)) errors.push({ path: path, code: "ENUM_MISMATCH", value: value });
    if (rule.pattern && typeof value === "string") {
      let regex = null;
      try { regex = new RegExp(rule.pattern); } catch (_) { regex = null; }
      if (!regex || !regex.test(value)) errors.push({ path: path, code: "PATTERN_MISMATCH", value: value });
    }
  }

  function validateAgainstSchema(schemaId, value) {
    const definition = findSchema(schemaId);
    if (!definition) return { valid: false, schemaId: schemaId || null, errors: [{ path: "$", code: "SCHEMA_NOT_FOUND" }], validatedAt: internal.nowIso() };
    const errors = [];
    if (!internal.isPlainObject(value)) errors.push({ path: "$", code: "TYPE_MISMATCH", expected: "object" });
    const object = internal.isPlainObject(value) ? value : {};
    definition.required.forEach(function requiredKey(key) {
      if (!Object.prototype.hasOwnProperty.call(object, key)) errors.push({ path: "$." + key, code: "REQUIRED_MISSING" });
    });
    Object.keys(definition.properties).forEach(function validateProperty(key) {
      if (Object.prototype.hasOwnProperty.call(object, key)) validateRule(object[key], definition.properties[key], "$." + key, errors);
    });
    if (!definition.additionalProperties) {
      Object.keys(object).forEach(function unknownProperty(key) {
        if (!Object.prototype.hasOwnProperty.call(definition.properties, key)) errors.push({ path: "$." + key, code: "ADDITIONAL_PROPERTY" });
      });
    }
    return { valid: errors.length === 0, schemaId: definition.schemaId, schemaVersion: definition.version, errors: errors, validatedAt: internal.nowIso() };
  }

  function getSchema(schemaId) {
    const definition = findSchema(schemaId);
    return definition ? internal.clone(definition) : null;
  }

  function listSchemas() {
    return Array.from(state.schemas.values()).map(internal.clone);
  }

  function registerProjectionAdapter(input) {
    const adapter = input && typeof input === "object" ? input : null;
    const adapterId = adapter && internal.text(adapter.adapterId, "");
    if (!adapterId || typeof adapter.project !== "function") return internal.buildResult(false, "EXTERNAL010_PROJECTION_ADAPTER_INVALID", "Blocked", null);
    if (state.projectionAdapters.has(adapterId)) return internal.buildResult(false, "EXTERNAL010_PROJECTION_ADAPTER_DUPLICATE", "Blocked", { adapterId: adapterId });
    state.projectionAdapters.set(adapterId, adapter);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_PROJECTION_ADAPTER_REGISTERED", "Ready", { adapterId: adapterId });
  }

  async function projectRecord(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const adapterId = internal.text(settings.adapterId, "");
    const adapter = state.projectionAdapters.get(adapterId);
    if (!adapter) return internal.buildResult(false, "EXTERNAL010_PROJECTION_ADAPTER_REQUIRED", "Blocked", { adapterId: adapterId || null });
    try {
      const output = await adapter.project(internal.clone(settings.record), internal.clone(settings));
      return internal.buildResult(true, "EXTERNAL010_RECORD_PROJECTED", "Ready", { adapterId: adapterId, output: output });
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_RECORD_PROJECTION_FAILED", "Failed", null, { error: { message: error && error.message || String(error), category: "Projection" } });
    }
  }

  function getCompatibilityProfile(recordType, versions) {
    const list = internal.unique(versions || ["1.0.0"]);
    return internal.deepFreeze({
      compatibilityProfileId: "EXTERNAL-010-COMPAT-" + internal.text(recordType, "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]+/g, "-"),
      recordType: internal.text(recordType, "unknown"),
      readVersions: list,
      writeVersion: list[list.length - 1] || "1.0.0",
      readOldWriteCurrent: true,
      silentUpgradeAllowed: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
  }

  function initializeExternalIntelligenceSchemaRegistry() {
    const results = BUILT_IN_SCHEMAS.map(function add(definition) { return registerSchema(definition); });
    const failed = results.filter(function failed(item) { return !item.ok; });
    namespace.modules.schemaRegistry.status = failed.length ? "Blocked" : "Ready";
    return internal.buildResult(failed.length === 0,
      failed.length ? "EXTERNAL010_SCHEMA_REGISTRY_INITIALIZATION_FAILED" : "EXTERNAL010_SCHEMA_REGISTRY_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      { builtInCount: BUILT_IN_SCHEMAS.length, registeredCount: state.schemas.size, results: results });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceSchemaRegistry: initializeExternalIntelligenceSchemaRegistry,
    registerExternalIntelligenceSchema: registerSchema,
    getExternalIntelligenceSchema: getSchema,
    listExternalIntelligenceSchemas: listSchemas,
    validateExternalIntelligenceRecord: validateAgainstSchema,
    registerExternalIntelligenceProjectionAdapter: registerProjectionAdapter,
    projectExternalIntelligenceRecord: projectRecord,
    getExternalIntelligenceCompatibilityProfile: getCompatibilityProfile
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.schemaRegistry = {
    id: "EXTERNAL-010-SCHEMA-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    immutableSchemas: true,
    unknownSchemaWriteAllowed: false,
    readOldWriteCurrent: true,
    projectionAdapterRequired: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
