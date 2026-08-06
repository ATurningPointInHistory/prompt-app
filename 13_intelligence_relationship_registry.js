/* ============================================================
   FILE: 13_intelligence_relationship_registry.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Phase: 4 Evidence Graph - Relationship Type Registry
   Design Freeze: v1.0.0 / Decision 005
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Relationship Registry blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.6.0";
  const CAPABILITY_ID = "IDE-170-RELATIONSHIP-TYPE-REGISTRY";
  const TYPE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
  const DOMAINS = Object.freeze([
    "repository", "architecture", "knowledge", "workflow", "quality", "change"
  ]);
  const DIRECTIONS = Object.freeze(["directed", "undirected", "bidirectional"]);

  if (!(state.relationshipTypes instanceof Map)) state.relationshipTypes = new Map();

  const OFFICIAL_TYPES = Object.freeze([
    ["contains", "repository"], ["defines", "repository"], ["imports", "repository"],
    ["exports", "repository"], ["calls", "repository"], ["references", "repository"],
    ["depends-on", "repository"], ["configured-by", "repository"],
    ["belongs-to-layer", "architecture"], ["implements", "architecture"],
    ["provides-interface", "architecture"], ["consumes-interface", "architecture"],
    ["depends-on-component", "architecture"], ["governed-by", "architecture"],
    ["describes", "knowledge"], ["specifies", "knowledge"], ["explains", "knowledge"],
    ["supports", "knowledge"], ["contradicts", "knowledge"], ["supersedes", "knowledge"],
    ["produces", "workflow"], ["consumes", "workflow"], ["changes", "workflow"],
    ["approves", "workflow"], ["rejects", "workflow"], ["executes", "workflow"],
    ["rolls-back", "workflow"], ["validates", "quality"], ["tests", "quality"],
    ["diagnoses", "quality"], ["measures", "quality"], ["blocks", "quality"],
    ["allows-release", "quality"], ["adds", "change"], ["modifies", "change"],
    ["removes", "change"], ["replaces", "change"], ["derived-from", "change"],
    ["supersedes", "change"], ["related-to", "architecture"]
  ].map(function buildType(item, index) {
    return Object.freeze({
      relationshipType: item[0],
      domain: item[1],
      name: item[0],
      version: VERSION,
      status: "Official",
      direction: "directed",
      factAllowed: true,
      candidateAllowed: item[0] !== "related-to",
      description: item[0] === "related-to" ? "Allowed only when an official Source explicitly declares this generic Relationship." : "",
      source: "built-in",
      priority: index + 1
    });
  }));

  function normalizeRelationshipType(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      relationshipType: internal.text(source.relationshipType || source.type || source.id, "").toLowerCase(),
      domain: internal.text(source.domain, "repository").toLowerCase(),
      name: internal.text(source.name || source.title, source.relationshipType || source.type || ""),
      version: internal.text(source.version, VERSION),
      status: internal.text(source.status, "Official"),
      direction: internal.text(source.direction, "directed").toLowerCase(),
      factAllowed: source.factAllowed !== false,
      candidateAllowed: source.candidateAllowed !== false,
      description: internal.text(source.description, ""),
      inverseLabel: internal.text(source.inverseLabel, ""),
      source: internal.text(source.source, "user"),
      priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 1000,
      metadata: internal.isPlainObject(source.metadata) ? internal.clone(source.metadata) : {}
    };
  }

  function validateRelationshipType(input) {
    const definition = normalizeRelationshipType(input);
    const checks = [
      { name: "Relationship Type is present", passed: Boolean(definition.relationshipType), detail: definition.relationshipType },
      { name: "Relationship Type format", passed: TYPE_PATTERN.test(definition.relationshipType), detail: definition.relationshipType },
      { name: "Relationship Domain is governed", passed: DOMAINS.includes(definition.domain), detail: definition.domain },
      { name: "Relationship Direction is governed", passed: DIRECTIONS.includes(definition.direction), detail: definition.direction },
      { name: "Relationship Version is semantic", passed: Boolean(internal.semverPattern && internal.semverPattern.test(definition.version)), detail: definition.version },
      { name: "At least one Layer is allowed", passed: definition.factAllowed || definition.candidateAllowed, detail: "fact=" + definition.factAllowed + ", candidate=" + definition.candidateAllowed }
    ];
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      id: internal.nextId("IDE-170-RELATIONSHIP-TYPE-VALIDATION"),
      componentId: namespace.componentId,
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      definition: definition,
      validatedAt: internal.nowIso()
    };
  }

  function registerRelationshipType(input) {
    const validation = validateRelationshipType(input);
    const definition = validation.definition;
    if (!validation.valid) {
      return internal.buildResult(false, "RELATIONSHIP_TYPE_INVALID", "Blocked", { validation: validation }, {
        error: { message: "Relationship Type failed validation.", category: "Validation Failure" }
      });
    }
    const existing = state.relationshipTypes.get(definition.relationshipType);
    if (existing) {
      if (existing.source === "built-in" && definition.source === "built-in" && existing.version !== definition.version) {
        state.relationshipTypes.delete(definition.relationshipType);
      } else {
        return internal.buildResult(false, "RELATIONSHIP_TYPE_DUPLICATE", "Blocked", {
          relationshipType: internal.clone(existing)
        }, { error: { message: "Relationship Type is already registered.", category: "Governance Failure" } });
      }
    }
    const now = internal.nowIso();
    const record = internal.deepFreeze(Object.assign({}, definition, {
      registeredAt: now,
      updatedAt: now,
      immutable: true
    }));
    state.relationshipTypes.set(record.relationshipType, record);
    internal.touch();
    internal.appendAudit({
      action: "RELATIONSHIP_TYPE_REGISTERED",
      actor: "IDE-170",
      targetType: "Relationship Type",
      targetId: record.relationshipType,
      outcome: "Succeeded",
      detail: { domain: record.domain, direction: record.direction, version: record.version }
    });
    return internal.buildResult(true, "RELATIONSHIP_TYPE_REGISTERED", "Ready", {
      relationshipType: internal.clone(record)
    });
  }

  function getRelationshipType(type) {
    return internal.clone(state.relationshipTypes.get(internal.text(type, "").toLowerCase()) || null);
  }

  function getRelationshipTypes(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const domain = internal.text(settings.domain, "").toLowerCase();
    return [...state.relationshipTypes.values()]
      .filter(function filter(item) { return !domain || item.domain === domain; })
      .sort(function sort(a, b) { return a.priority - b.priority || a.relationshipType.localeCompare(b.relationshipType); })
      .map(internal.clone);
  }

  function registerSchemas() {
    const schemas = [
      {
        schemaId: "IDE-170-SCHEMA-RELATIONSHIP-TYPE",
        name: "Relationship Type Definition",
        version: VERSION,
        type: "object",
        required: ["relationshipType", "domain", "version", "status", "direction", "factAllowed", "candidateAllowed"],
        properties: {
          relationshipType: { type: "string", pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" },
          domain: { type: "string", enum: DOMAINS },
          version: { type: "string", format: "semver" },
          status: { type: "string" },
          direction: { type: "string", enum: DIRECTIONS },
          factAllowed: { type: "boolean" },
          candidateAllowed: { type: "boolean" }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      }
    ];
    return schemas.map(function register(schema) {
      const existing = namespace.getSchema(schema.schemaId);
      if (existing && existing.version === VERSION) return { schemaId: schema.schemaId, registered: true, existing: true };
      if (existing && typeof internal.removeSchemaForValidation === "function") internal.removeSchemaForValidation(schema.schemaId);
      const result = namespace.registerSchema(schema);
      return { schemaId: schema.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerCapability() {
    const existing = namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === VERSION) return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && typeof internal.removeCapabilityForValidation === "function") internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Relationship Type Registry",
      version: VERSION,
      type: "Registry",
      status: "Active",
      owner: "IDE-170",
      description: "Governs official Relationship Types, Domains, Directions, and Layer eligibility.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-CAPABILITY-REGISTRY", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-RELATIONSHIP-TYPE"],
      provides: ["Relationship Type Registration", "Direction Governance", "Fact and Candidate Layer Policy"],
      source: "built-in"
    });
  }

  function initializeRelationshipRegistry() {
    const schemaResults = registerSchemas();
    const capability = registerCapability();
    const typeResults = OFFICIAL_TYPES.map(function register(definition) {
      const existing = state.relationshipTypes.get(definition.relationshipType);
      if (existing && existing.version === VERSION && existing.domain === definition.domain) {
        return { relationshipType: definition.relationshipType, registered: true, existing: true };
      }
      if (existing) state.relationshipTypes.delete(definition.relationshipType);
      const result = registerRelationshipType(definition);
      return { relationshipType: definition.relationshipType, registered: result.ok === true, code: result.code };
    });
    const failed = schemaResults.concat(typeResults).filter(function item(value) { return value.registered !== true; });
    const ready = failed.length === 0 && capability.ok === true;
    return internal.buildResult(ready,
      ready ? "RELATIONSHIP_REGISTRY_INITIALIZED" : "RELATIONSHIP_REGISTRY_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { relationshipTypeCount: state.relationshipTypes.size, schemaResults: schemaResults, capabilityResult: capability, typeResults: typeResults },
      ready ? {} : { error: { message: "Relationship Registry initialization failed.", category: "Initialization Failure" } });
  }

  Object.assign(internal, {
    relationshipDomains: DOMAINS,
    relationshipDirections: DIRECTIONS,
    relationshipTypePattern: TYPE_PATTERN
  });

  Object.assign(namespace.api, {
    initializeRelationshipRegistry: initializeRelationshipRegistry,
    registerRelationshipType: registerRelationshipType,
    validateRelationshipType: validateRelationshipType,
    getRelationshipType: getRelationshipType,
    getRelationshipTypes: getRelationshipTypes
  });
  Object.assign(namespace, {
    registerRelationshipType: registerRelationshipType,
    validateRelationshipType: validateRelationshipType,
    getRelationshipType: getRelationshipType,
    getRelationshipTypes: getRelationshipTypes
  });

  namespace.modules.relationshipRegistry = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    officialTypeCount: OFFICIAL_TYPES.length,
    layeredGraphPolicy: true,
    relatedToFallbackAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
