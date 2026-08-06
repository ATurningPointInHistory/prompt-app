/* ============================================================
   FILE: 13_intelligence_schema_registry.js
   IDE-170 Intelligence Platform
   Version: 1.3.0
   Phase: 2 Schema Registry - Schema Registry
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Schema Registry blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.3.0";
  const SCHEMA_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$/;
  const SUPPORTED_TYPES = Object.freeze([
    "object",
    "array",
    "string",
    "number",
    "integer",
    "boolean",
    "null"
  ]);

  const BUILT_IN_SCHEMAS = Object.freeze([
    Object.freeze({
      schemaId: "IDE-170-SCHEMA-CAPABILITY-DEFINITION",
      name: "Capability Definition",
      version: VERSION,
      description: "Governed Capability registration contract.",
      type: "object",
      required: ["capabilityId", "name", "version", "type", "status", "owner"],
      properties: {
        capabilityId: { type: "string", pattern: "^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$" },
        name: { type: "string", minLength: 1 },
        version: { type: "string", format: "semver" },
        type: { type: "string" },
        status: { type: "string", enum: ["Active", "Experimental", "Deprecated", "Blocked"] },
        owner: { type: "string", minLength: 1 },
        dependencies: { type: "array" },
        schemas: { type: "array" },
        provides: { type: "array" }
      },
      additionalProperties: true,
      owner: "IDE-170",
      source: "built-in"
    }),
    Object.freeze({
      schemaId: "IDE-170-SCHEMA-INTELLIGENCE-SESSION",
      name: "Intelligence Session",
      version: VERSION,
      description: "IDE-170 Session lifecycle record.",
      type: "object",
      required: ["sessionId", "componentId", "version", "state", "capabilityBindings", "createdAt"],
      properties: {
        sessionId: { type: "string", minLength: 1 },
        componentId: { type: "string", enum: ["IDE-170"] },
        version: { type: "string", format: "semver" },
        state: { type: "string", enum: ["Created", "Active", "Cancelled", "Frozen"] },
        frozen: { type: "boolean" },
        capabilityBindings: { type: "array" },
        transitionHistory: { type: "array" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      },
      additionalProperties: true,
      owner: "IDE-170",
      source: "built-in"
    }),
    Object.freeze({
      schemaId: "IDE-170-SCHEMA-AUDIT-RECORD",
      name: "Intelligence Audit Record",
      version: VERSION,
      description: "Immutable basic Audit record.",
      type: "object",
      required: ["auditId", "componentId", "action", "targetType", "targetId", "outcome", "immutable", "createdAt"],
      properties: {
        auditId: { type: "string", minLength: 1 },
        componentId: { type: "string", enum: ["IDE-170"] },
        action: { type: "string", minLength: 1 },
        targetType: { type: "string", minLength: 1 },
        targetId: { type: "string", minLength: 1 },
        outcome: { type: "string", minLength: 1 },
        immutable: { type: "boolean", enum: [true] },
        createdAt: { type: "string", format: "date-time" }
      },
      additionalProperties: true,
      owner: "IDE-170",
      source: "built-in"
    }),
    Object.freeze({
      schemaId: "IDE-170-SCHEMA-VALIDATION-RESULT",
      name: "Intelligence Validation Result",
      version: VERSION,
      description: "Independent IDE-170 Validation result.",
      type: "object",
      required: ["id", "componentId", "version", "valid", "passed", "failed", "total", "status"],
      properties: {
        id: { type: "string", minLength: 1 },
        componentId: { type: "string", enum: ["IDE-170"] },
        version: { type: "string", format: "semver" },
        valid: { type: "boolean" },
        passed: { type: "integer", minimum: 0 },
        failed: { type: "integer", minimum: 0 },
        total: { type: "integer", minimum: 0 },
        health: { type: "number", minimum: 0, maximum: 100 },
        status: { type: "string" }
      },
      additionalProperties: true,
      owner: "IDE-170",
      source: "built-in"
    })
  ]);

  function normalizeSchema(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      schemaId: internal.canonicalId(source.schemaId || source.id),
      name: internal.text(source.name || source.title, ""),
      version: internal.text(source.version, ""),
      description: internal.text(source.description || source.summary, ""),
      type: internal.text(source.type, "object"),
      required: internal.unique(source.required),
      properties: internal.isPlainObject(source.properties)
        ? internal.clone(source.properties)
        : {},
      items: source.items == null ? null : internal.clone(source.items),
      enum: Array.isArray(source.enum) ? internal.clone(source.enum) : null,
      pattern: internal.text(source.pattern, "") || null,
      format: internal.text(source.format, "") || null,
      minLength: Number.isFinite(Number(source.minLength)) ? Number(source.minLength) : null,
      maxLength: Number.isFinite(Number(source.maxLength)) ? Number(source.maxLength) : null,
      minimum: Number.isFinite(Number(source.minimum)) ? Number(source.minimum) : null,
      maximum: Number.isFinite(Number(source.maximum)) ? Number(source.maximum) : null,
      additionalProperties: source.additionalProperties !== false,
      owner: internal.text(source.owner, "IDE-170"),
      source: internal.text(source.source, "user"),
      metadata: internal.isPlainObject(source.metadata) ? internal.clone(source.metadata) : {}
    };
  }

  function validateRuleDefinition(rule, path, checks) {
    if (!internal.isPlainObject(rule)) {
      checks.push({
        name: "Rule is an object",
        passed: false,
        detail: path,
        field: path
      });
      return;
    }

    const type = internal.text(rule.type, "");
    checks.push({
      name: "Rule type is supported",
      passed: !type || SUPPORTED_TYPES.includes(type),
      detail: path + ": " + (type || "unspecified"),
      field: path
    });

    if (rule.properties != null) {
      const propertiesValid = internal.isPlainObject(rule.properties);
      checks.push({
        name: "Rule properties is an object",
        passed: propertiesValid,
        detail: path,
        field: path
      });
      if (propertiesValid) {
        Object.keys(rule.properties).forEach(function validateChild(propertyName) {
          validateRuleDefinition(rule.properties[propertyName], path + "." + propertyName, checks);
        });
      }
    }

    if (rule.items != null) {
      validateRuleDefinition(rule.items, path + "[]", checks);
    }

    if (rule.pattern != null) {
      let patternValid = true;
      try {
        new RegExp(String(rule.pattern));
      } catch (_) {
        patternValid = false;
      }
      checks.push({
        name: "Rule pattern is valid",
        passed: patternValid,
        detail: path,
        field: path
      });
    }
  }

  function validateSchemaDefinition(definition) {
    const schema = normalizeSchema(definition);
    const checks = [];

    function check(name, passed, detail, field) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: internal.text(detail, ""),
        field: field || ""
      });
    }

    check("Schema ID is present", Boolean(schema.schemaId), schema.schemaId, "schemaId");
    check("Schema ID format", SCHEMA_ID_PATTERN.test(schema.schemaId), schema.schemaId, "schemaId");
    check("Schema name is present", Boolean(schema.name), schema.name, "name");
    check(
      "Schema version is valid",
      Boolean(internal.semverPattern && internal.semverPattern.test(schema.version)),
      schema.version,
      "version"
    );
    check("Root type is supported", SUPPORTED_TYPES.includes(schema.type), schema.type, "type");
    check("Schema owner is present", Boolean(schema.owner), schema.owner, "owner");
    check("Required is an array", Array.isArray(schema.required), "count=" + schema.required.length, "required");
    check("Properties is an object", internal.isPlainObject(schema.properties), "count=" + Object.keys(schema.properties).length, "properties");

    const propertyNames = new Set(Object.keys(schema.properties));
    schema.required.forEach(function validateRequired(propertyName) {
      check(
        "Required property exists: " + propertyName,
        propertyNames.has(propertyName),
        propertyName,
        "required"
      );
    });

    Object.keys(schema.properties).forEach(function validateProperty(propertyName) {
      validateRuleDefinition(schema.properties[propertyName], "properties." + propertyName, checks);
    });

    if (schema.items) validateRuleDefinition(schema.items, "items", checks);

    const passed = checks.filter(function countPassed(item) {
      return item.passed;
    }).length;

    return {
      id: internal.nextId("IDE-170-SCHEMA-DEFINITION-VALIDATION"),
      componentId: namespace.componentId,
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      schema: schema,
      validatedAt: internal.nowIso()
    };
  }

  function registerSchema(definition) {
    const validation = validateSchemaDefinition(definition);
    const schema = validation.schema;

    if (!validation.valid) {
      internal.appendAudit({
        action: "SCHEMA_REGISTRATION_BLOCKED",
        actor: schema.owner,
        targetType: "Schema",
        targetId: schema.schemaId || "UNKNOWN",
        outcome: "Blocked",
        detail: { reason: "Invalid Schema", validation: validation }
      });
      return internal.buildResult(false, "SCHEMA_INVALID", "Blocked", {
        validation: validation
      }, {
        error: {
          message: "Schema definition failed validation.",
          category: "Validation Failure"
        }
      });
    }

    if (state.schemas.has(schema.schemaId)) {
      internal.appendAudit({
        action: "SCHEMA_REGISTRATION_BLOCKED",
        actor: schema.owner,
        targetType: "Schema",
        targetId: schema.schemaId,
        outcome: "Blocked",
        detail: { reason: "Duplicate Schema", requestedVersion: schema.version }
      });
      return internal.buildResult(false, "SCHEMA_DUPLICATE", "Blocked", {
        schema: getSchema(schema.schemaId)
      }, {
        error: {
          message: "Schema is already registered.",
          category: "Governance Failure"
        }
      });
    }

    const registeredAt = internal.nowIso();
    const record = internal.deepFreeze(Object.assign({}, schema, {
      registeredAt: registeredAt,
      updatedAt: registeredAt,
      immutable: true
    }));
    state.schemas.set(record.schemaId, record);
    internal.touch();

    internal.appendAudit({
      action: "SCHEMA_REGISTERED",
      actor: record.owner,
      targetType: "Schema",
      targetId: record.schemaId,
      outcome: "Succeeded",
      detail: {
        version: record.version,
        type: record.type,
        source: record.source
      }
    });

    return internal.buildResult(true, "SCHEMA_REGISTERED", "Ready", {
      schema: getSchema(record.schemaId)
    });
  }

  function getSchema(schemaId) {
    return internal.clone(state.schemas.get(internal.canonicalId(schemaId)) || null);
  }

  function getSchemas(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const owner = internal.text(settings.owner, "");
    const type = internal.text(settings.type, "");
    return [...state.schemas.values()]
      .filter(function filterSchema(item) {
        if (owner && item.owner !== owner) return false;
        if (type && item.type !== type) return false;
        return true;
      })
      .sort(function sortSchema(left, right) {
        return left.schemaId.localeCompare(right.schemaId);
      })
      .map(internal.clone);
  }

  function actualType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (Number.isInteger(value)) return "integer";
    return typeof value;
  }

  function valueMatchesType(value, expectedType) {
    if (!expectedType) return true;
    const type = actualType(value);
    if (expectedType === "number") return type === "number" || type === "integer";
    return type === expectedType;
  }

  function validateValue(value, rule, path, errors) {
    const sourceRule = internal.isPlainObject(rule) ? rule : {};
    const expectedType = internal.text(sourceRule.type, "");

    if (expectedType && !valueMatchesType(value, expectedType)) {
      errors.push({
        path: path,
        code: "TYPE_MISMATCH",
        expected: expectedType,
        actual: actualType(value)
      });
      return;
    }

    if (Array.isArray(sourceRule.enum)) {
      const matched = sourceRule.enum.some(function matchEnum(item) {
        return JSON.stringify(item) === JSON.stringify(value);
      });
      if (!matched) {
        errors.push({ path: path, code: "ENUM_MISMATCH", expected: internal.clone(sourceRule.enum), actual: value });
      }
    }

    if (typeof value === "string") {
      if (Number.isFinite(Number(sourceRule.minLength)) && value.length < Number(sourceRule.minLength)) {
        errors.push({ path: path, code: "MIN_LENGTH", expected: Number(sourceRule.minLength), actual: value.length });
      }
      if (Number.isFinite(Number(sourceRule.maxLength)) && value.length > Number(sourceRule.maxLength)) {
        errors.push({ path: path, code: "MAX_LENGTH", expected: Number(sourceRule.maxLength), actual: value.length });
      }
      if (sourceRule.pattern) {
        try {
          if (!new RegExp(String(sourceRule.pattern)).test(value)) {
            errors.push({ path: path, code: "PATTERN_MISMATCH", expected: String(sourceRule.pattern), actual: value });
          }
        } catch (_) {
          errors.push({ path: path, code: "SCHEMA_PATTERN_INVALID", expected: String(sourceRule.pattern), actual: value });
        }
      }
      if (sourceRule.format === "semver" && (!internal.semverPattern || !internal.semverPattern.test(value))) {
        errors.push({ path: path, code: "FORMAT_SEMVER", expected: "semantic version", actual: value });
      }
      if (sourceRule.format === "date-time" && Number.isNaN(Date.parse(value))) {
        errors.push({ path: path, code: "FORMAT_DATE_TIME", expected: "ISO date-time", actual: value });
      }
    }

    if (typeof value === "number") {
      if (Number.isFinite(Number(sourceRule.minimum)) && value < Number(sourceRule.minimum)) {
        errors.push({ path: path, code: "MINIMUM", expected: Number(sourceRule.minimum), actual: value });
      }
      if (Number.isFinite(Number(sourceRule.maximum)) && value > Number(sourceRule.maximum)) {
        errors.push({ path: path, code: "MAXIMUM", expected: Number(sourceRule.maximum), actual: value });
      }
    }

    if (Array.isArray(value) && sourceRule.items) {
      value.forEach(function validateItem(item, index) {
        validateValue(item, sourceRule.items, path + "[" + index + "]", errors);
      });
    }

    if (internal.isPlainObject(value)) {
      const properties = internal.isPlainObject(sourceRule.properties) ? sourceRule.properties : {};
      internal.asArray(sourceRule.required).forEach(function requireProperty(propertyName) {
        if (!Object.prototype.hasOwnProperty.call(value, propertyName)) {
          errors.push({ path: path + "." + propertyName, code: "REQUIRED_PROPERTY_MISSING" });
        }
      });
      Object.keys(properties).forEach(function validateProperty(propertyName) {
        if (Object.prototype.hasOwnProperty.call(value, propertyName)) {
          validateValue(value[propertyName], properties[propertyName], path + "." + propertyName, errors);
        }
      });
      if (sourceRule.additionalProperties === false) {
        Object.keys(value).forEach(function rejectAdditional(propertyName) {
          if (!Object.prototype.hasOwnProperty.call(properties, propertyName)) {
            errors.push({ path: path + "." + propertyName, code: "ADDITIONAL_PROPERTY_BLOCKED" });
          }
        });
      }
    }
  }

  function validateAgainstSchema(schemaId, value) {
    const schema = state.schemas.get(internal.canonicalId(schemaId));
    if (!schema) {
      return {
        id: internal.nextId("IDE-170-SCHEMA-VALIDATION"),
        componentId: namespace.componentId,
        schemaId: internal.canonicalId(schemaId),
        valid: false,
        passed: 0,
        failed: 1,
        total: 1,
        errors: [{ path: "$", code: "SCHEMA_NOT_REGISTERED" }],
        validatedAt: internal.nowIso()
      };
    }

    const errors = [];
    validateValue(value, schema, "$", errors);
    return {
      id: internal.nextId("IDE-170-SCHEMA-VALIDATION"),
      componentId: namespace.componentId,
      schemaId: schema.schemaId,
      schemaVersion: schema.version,
      valid: errors.length === 0,
      passed: errors.length === 0 ? 1 : 0,
      failed: errors.length,
      total: Math.max(1, errors.length),
      errors: errors,
      validatedAt: internal.nowIso()
    };
  }

  function initializeSchemaRegistry() {
    const results = [];

    BUILT_IN_SCHEMAS.forEach(function registerBuiltIn(schema) {
      if (state.schemas.has(schema.schemaId)) {
        results.push({ schemaId: schema.schemaId, registered: true, existing: true });
        return;
      }
      const result = registerSchema(schema);
      results.push({ schemaId: schema.schemaId, registered: result.ok === true, code: result.code });
    });

    const schemaCapability = {
      capabilityId: "IDE-170-SCHEMA-REGISTRY",
      name: "Intelligence Schema Registry",
      version: VERSION,
      type: "Registry",
      status: "Active",
      owner: "IDE-170",
      description: "Registers immutable Schemas and validates IDE-170 records.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-CAPABILITY-REGISTRY", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-VALIDATION-RESULT"],
      provides: ["Schema Registration", "Record Validation"],
      source: "built-in"
    };

    if (!state.capabilities.has(schemaCapability.capabilityId) &&
        namespace.api && typeof namespace.api.registerCapability === "function") {
      const capabilityResult = namespace.api.registerCapability(schemaCapability);
      results.push({
        capabilityId: schemaCapability.capabilityId,
        registered: capabilityResult.ok === true,
        code: capabilityResult.code
      });
    }

    const failed = results.filter(function filterFailure(item) {
      return item.registered !== true;
    });

    return internal.buildResult(failed.length === 0,
      failed.length ? "SCHEMA_REGISTRY_INITIALIZATION_FAILED" : "SCHEMA_REGISTRY_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      {
        builtInCount: BUILT_IN_SCHEMAS.length,
        registryCount: state.schemas.size,
        results: results
      },
      failed.length ? {
        error: {
          message: "One or more built-in Schemas could not be registered.",
          category: "Initialization Failure"
        }
      } : {});
  }

  function removeSchemaForValidation(schemaId) {
    return state.schemas.delete(internal.canonicalId(schemaId));
  }

  Object.assign(internal, {
    schemaIdPattern: SCHEMA_ID_PATTERN,
    normalizeSchema: normalizeSchema,
    removeSchemaForValidation: removeSchemaForValidation
  });

  Object.assign(namespace.api, {
    initializeSchemaRegistry: initializeSchemaRegistry,
    registerSchema: registerSchema,
    getSchema: getSchema,
    getSchemas: getSchemas,
    validateSchemaDefinition: validateSchemaDefinition,
    validateAgainstSchema: validateAgainstSchema
  });

  Object.assign(namespace, {
    registerSchema: registerSchema,
    getSchema: getSchema,
    getSchemas: getSchemas,
    validateSchemaDefinition: validateSchemaDefinition,
    validateAgainstSchema: validateAgainstSchema
  });

  namespace.modules.schemaRegistry = {
    id: "IDE-170-SCHEMA-REGISTRY",
    version: VERSION,
    status: "Ready",
    duplicateProtection: true,
    immutableSchemas: true,
    recordValidation: true,
    loadedAt: internal.nowIso()
  };

  global.registerIntelligenceSchema = registerSchema;
  global.getIntelligenceSchema = getSchema;
  global.getIntelligenceSchemas = getSchemas;
  global.validateIntelligenceRecord = validateAgainstSchema;
})(typeof window !== "undefined" ? window : globalThis);
