/* ============================================================
   FILE: 13_intelligence_source_adapter.js
   IDE-170 Intelligence Platform
   Version: 1.1.0
   Phase: 2 Source Intake - Source Adapter Framework
   Design Freeze: v1.0.0 / 2026-08-06
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Source Adapter Framework blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.1.0";
  const FRAMEWORK_CAPABILITY_ID = "IDE-170-SOURCE-ADAPTER-FRAMEWORK";
  const ADAPTER_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$/;
  const ADAPTER_STATUSES = Object.freeze([
    "Active",
    "Experimental",
    "Conditional",
    "Official",
    "Deprecated",
    "Blocked"
  ]);
  const INTAKE_STATUSES = Object.freeze([
    "Capturing",
    "Ready",
    "Partial",
    "Unavailable",
    "Invalid",
    "Blocked",
    "Frozen"
  ]);

  if (!(state.sourceAdapters instanceof Map)) state.sourceAdapters = new Map();
  if (!(state.sourceAdapterImplementations instanceof Map)) {
    state.sourceAdapterImplementations = new Map();
  }
  if (!(state.sourceIntakes instanceof Map)) state.sourceIntakes = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestSourceIntakeId")) {
    state.latestSourceIntakeId = null;
  }

  function normalizeAvailability(value) {
    if (typeof value === "boolean") {
      return {
        available: value,
        status: value ? "Ready" : "Unavailable",
        reason: value ? "" : "Source API is unavailable."
      };
    }
    const source = internal.isPlainObject(value) ? value : {};
    const available = source.available === true || source.ready === true;
    return {
      available: available,
      status: internal.text(source.status, available ? "Ready" : "Unavailable"),
      reason: internal.text(source.reason || source.message, ""),
      detail: internal.clone(source.detail || source.metadata || {})
    };
  }

  function normalizeAdapterDefinition(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      adapterId: internal.canonicalId(source.adapterId || source.id),
      capabilityId: internal.canonicalId(
        source.capabilityId || source.adapterId || source.id
      ),
      name: internal.text(source.name || source.title, ""),
      version: internal.text(source.version, ""),
      status: internal.text(source.status, "Official"),
      sourceType: internal.text(source.sourceType || source.source, ""),
      recordTypes: internal.unique(source.recordTypes || source.supportedRecordTypes),
      domains: internal.unique(source.domains || source.supportedDomains),
      required: source.required === true,
      priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 100,
      description: internal.text(source.description || source.summary, ""),
      limitations: internal.asArray(source.limitations).map(String),
      dependencies: internal.asArray(source.dependencies).map(internal.clone),
      schemas: internal.unique(source.schemas || ["IDE-170-SCHEMA-SOURCE-RECORD"]),
      provides: internal.unique(source.provides || ["Official Source Intake"]),
      owner: internal.text(source.owner, "IDE-170"),
      metadata: internal.isPlainObject(source.metadata) ? internal.clone(source.metadata) : {},
      source: internal.text(source.registrationSource, "built-in")
    };
  }

  function validateSourceAdapter(definition) {
    const normalized = normalizeAdapterDefinition(definition);
    const source = internal.isPlainObject(definition) ? definition : {};
    const checks = [];

    function check(name, passed, detail, field) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: internal.text(detail, ""),
        field: internal.text(field, "")
      });
    }

    check("Adapter ID is present", Boolean(normalized.adapterId), normalized.adapterId, "adapterId");
    check("Adapter ID format is valid", ADAPTER_ID_PATTERN.test(normalized.adapterId), normalized.adapterId, "adapterId");
    check("Capability ID matches governed format", ADAPTER_ID_PATTERN.test(normalized.capabilityId), normalized.capabilityId, "capabilityId");
    check("Adapter name is present", Boolean(normalized.name), normalized.name, "name");
    check(
      "Adapter version is semantic",
      Boolean(internal.semverPattern && internal.semverPattern.test(normalized.version)),
      normalized.version,
      "version"
    );
    check("Adapter status is governed", ADAPTER_STATUSES.includes(normalized.status), normalized.status, "status");
    check("Source type is present", Boolean(normalized.sourceType), normalized.sourceType, "sourceType");
    check("At least one record type is declared", normalized.recordTypes.length > 0, normalized.recordTypes.join(", "), "recordTypes");
    check("Read implementation is available", typeof source.read === "function", typeof source.read, "read");
    check(
      "Availability implementation is valid",
      source.isAvailable == null || typeof source.isAvailable === "function",
      typeof source.isAvailable,
      "isAvailable"
    );
    check(
      "Record transformer is valid",
      source.transformRecord == null || typeof source.transformRecord === "function",
      typeof source.transformRecord,
      "transformRecord"
    );
    check("Adapter is read only", source.write == null && source.mutate == null, "No write/mutate implementation", "governance");

    const passed = checks.filter(function countPassed(item) {
      return item.passed;
    }).length;

    return {
      id: internal.nextId("IDE-170-SOURCE-ADAPTER-VALIDATION"),
      componentId: namespace.componentId,
      adapterId: normalized.adapterId,
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      adapter: normalized,
      validatedAt: internal.nowIso()
    };
  }

  function registerFrameworkSchemas() {
    const schemas = [
      {
        schemaId: "IDE-170-SCHEMA-SOURCE-ADAPTER-DEFINITION",
        name: "Source Adapter Definition",
        version: VERSION,
        description: "Read-only official Source Adapter metadata contract.",
        type: "object",
        required: ["adapterId", "capabilityId", "name", "version", "status", "sourceType", "recordTypes"],
        properties: {
          adapterId: { type: "string", pattern: "^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$" },
          capabilityId: { type: "string", pattern: "^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$" },
          name: { type: "string", minLength: 1 },
          version: { type: "string", format: "semver" },
          status: { type: "string" },
          sourceType: { type: "string", minLength: 1 },
          recordTypes: { type: "array" },
          required: { type: "boolean" },
          priority: { type: "number" }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      },
      {
        schemaId: "IDE-170-SCHEMA-SOURCE-RECORD",
        name: "Source Intake Record",
        version: VERSION,
        description: "Source-derived immutable input record before Canonical conversion.",
        type: "object",
        required: [
          "sourceRecordId", "recordType", "sourceType", "sourceId",
          "adapterId", "adapterVersion", "capturedAt", "identity",
          "classification", "payload", "quality"
        ],
        properties: {
          sourceRecordId: { type: "string", minLength: 1 },
          recordType: { type: "string", minLength: 1 },
          sourceType: { type: "string", minLength: 1 },
          sourceId: { type: "string", minLength: 1 },
          sourceVersion: { type: "string" },
          sourceUpdatedAt: { type: "string" },
          adapterId: { type: "string", minLength: 1 },
          adapterVersion: { type: "string", format: "semver" },
          capturedAt: { type: "string", format: "date-time" },
          identity: { type: "object" },
          classification: { type: "object" },
          payload: { type: "object" },
          quality: { type: "object" }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      },
      {
        schemaId: "IDE-170-SCHEMA-SOURCE-INTAKE",
        name: "Source Intake Result",
        version: VERSION,
        description: "Frozen Source Intake result for one Intelligence Session.",
        type: "object",
        required: [
          "intakeId", "componentId", "version", "sessionId", "status",
          "adapterResults", "summary", "capturedAt", "frozen", "immutable"
        ],
        properties: {
          intakeId: { type: "string", minLength: 1 },
          componentId: { type: "string", enum: ["IDE-170"] },
          version: { type: "string", format: "semver" },
          sessionId: { type: "string", minLength: 1 },
          status: { type: "string" },
          adapterResults: { type: "array" },
          summary: { type: "object" },
          capturedAt: { type: "string", format: "date-time" },
          frozen: { type: "boolean", enum: [true] },
          immutable: { type: "boolean", enum: [true] }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      }
    ];

    const results = [];
    schemas.forEach(function registerSchema(schema) {
      if (namespace.getSchema(schema.schemaId)) {
        results.push({ schemaId: schema.schemaId, registered: true, existing: true });
        return;
      }
      const result = namespace.registerSchema(schema);
      results.push({ schemaId: schema.schemaId, registered: result.ok === true, code: result.code });
    });
    return results;
  }

  function registerFrameworkCapability() {
    if (namespace.getCapability(FRAMEWORK_CAPABILITY_ID)) {
      return internal.buildResult(true, "SOURCE_ADAPTER_FRAMEWORK_CAPABILITY_EXISTS", "Ready", {
        capability: namespace.getCapability(FRAMEWORK_CAPABILITY_ID)
      });
    }
    return namespace.registerCapability({
      capabilityId: FRAMEWORK_CAPABILITY_ID,
      name: "Official Source Adapter Framework",
      version: VERSION,
      type: "Adapter",
      status: "Official",
      owner: "IDE-170",
      description: "Registers read-only Source Adapters and creates frozen Source Intake results.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: "1.0.0", optional: false },
        { capabilityId: "IDE-170-CAPABILITY-REGISTRY", minimumVersion: "1.0.0", optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: "1.0.0", optional: false }
      ],
      schemas: [
        "IDE-170-SCHEMA-SOURCE-ADAPTER-DEFINITION",
        "IDE-170-SCHEMA-SOURCE-RECORD",
        "IDE-170-SCHEMA-SOURCE-INTAKE"
      ],
      provides: [
        "Source Adapter Registration",
        "Source Availability Check",
        "Frozen Source Intake",
        "Source Provenance"
      ],
      source: "built-in"
    });
  }

  function registerSourceAdapter(definition) {
    const validation = validateSourceAdapter(definition);
    const metadata = validation.adapter;
    if (!validation.valid) {
      internal.appendAudit({
        action: "SOURCE_ADAPTER_REGISTRATION_BLOCKED",
        actor: metadata.owner,
        targetType: "Source Adapter",
        targetId: metadata.adapterId || "UNKNOWN",
        outcome: "Blocked",
        detail: { reason: "Invalid Source Adapter", validation: validation }
      });
      return internal.buildResult(false, "SOURCE_ADAPTER_INVALID", "Blocked", {
        validation: validation
      }, {
        error: { message: "Source Adapter definition failed validation.", category: "Validation Failure" }
      });
    }

    if (state.sourceAdapters.has(metadata.adapterId)) {
      return internal.buildResult(false, "SOURCE_ADAPTER_DUPLICATE", "Blocked", {
        adapter: getSourceAdapter(metadata.adapterId)
      }, {
        error: { message: "Source Adapter is already registered.", category: "Governance Failure" }
      });
    }

    if (!namespace.getCapability(metadata.capabilityId)) {
      const capability = namespace.registerCapability({
        capabilityId: metadata.capabilityId,
        name: metadata.name,
        version: metadata.version,
        type: "Adapter",
        status: metadata.status,
        owner: metadata.owner,
        description: metadata.description,
        dependencies: [
          { capabilityId: FRAMEWORK_CAPABILITY_ID, minimumVersion: "1.0.0", optional: false }
        ].concat(metadata.dependencies),
        schemas: metadata.schemas,
        provides: metadata.provides,
        metadata: {
          adapterId: metadata.adapterId,
          sourceType: metadata.sourceType,
          recordTypes: metadata.recordTypes,
          domains: metadata.domains,
          required: metadata.required,
          limitations: metadata.limitations
        },
        source: metadata.source
      });
      if (!capability.ok) {
        return internal.buildResult(false, "SOURCE_ADAPTER_CAPABILITY_BLOCKED", "Blocked", {
          capabilityResult: capability
        }, {
          error: { message: "Source Adapter Capability registration failed.", category: "Dependency Failure" }
        });
      }
    }

    const definitionSchema = namespace.validateAgainstSchema(
      "IDE-170-SCHEMA-SOURCE-ADAPTER-DEFINITION",
      metadata
    );
    if (!definitionSchema.valid) {
      return internal.buildResult(false, "SOURCE_ADAPTER_SCHEMA_INVALID", "Blocked", {
        schemaValidation: definitionSchema
      }, {
        error: { message: "Source Adapter metadata does not match the registered Schema.", category: "Schema Failure" }
      });
    }

    const registeredAt = internal.nowIso();
    const record = internal.deepFreeze(Object.assign({}, metadata, {
      registeredAt: registeredAt,
      updatedAt: registeredAt,
      immutable: true
    }));
    const source = internal.isPlainObject(definition) ? definition : {};
    state.sourceAdapters.set(record.adapterId, record);
    state.sourceAdapterImplementations.set(record.adapterId, {
      isAvailable: typeof source.isAvailable === "function"
        ? source.isAvailable
        : function defaultAvailability() { return true; },
      read: source.read,
      transformRecord: typeof source.transformRecord === "function"
        ? source.transformRecord
        : null
    });
    internal.touch();
    internal.appendAudit({
      action: "SOURCE_ADAPTER_REGISTERED",
      actor: record.owner,
      targetType: "Source Adapter",
      targetId: record.adapterId,
      capabilityId: record.capabilityId,
      outcome: "Succeeded",
      detail: {
        version: record.version,
        sourceType: record.sourceType,
        recordTypes: record.recordTypes,
        required: record.required
      }
    });

    return internal.buildResult(true, "SOURCE_ADAPTER_REGISTERED", "Ready", {
      adapter: getSourceAdapter(record.adapterId)
    });
  }

  function getSourceAdapter(adapterId) {
    return internal.clone(state.sourceAdapters.get(internal.canonicalId(adapterId)) || null);
  }

  function getSourceAdapters(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const sourceType = internal.text(settings.sourceType, "");
    const recordType = internal.text(settings.recordType, "");
    const status = internal.text(settings.status, "");
    return [...state.sourceAdapters.values()]
      .filter(function filterAdapter(adapter) {
        if (sourceType && adapter.sourceType !== sourceType) return false;
        if (recordType && !adapter.recordTypes.includes(recordType)) return false;
        if (status && adapter.status !== status) return false;
        return true;
      })
      .sort(function sortAdapter(left, right) {
        return left.priority - right.priority || left.adapterId.localeCompare(right.adapterId);
      })
      .map(internal.clone);
  }

  function getSourceAvailability(adapterId, options) {
    const id = internal.canonicalId(adapterId);
    const adapter = state.sourceAdapters.get(id);
    const implementation = state.sourceAdapterImplementations.get(id);
    if (!adapter || !implementation) {
      return {
        adapterId: id,
        available: false,
        status: "Unavailable",
        reason: "Source Adapter is not registered.",
        checkedAt: internal.nowIso()
      };
    }
    if (adapter.status === "Blocked" || adapter.status === "Deprecated") {
      return {
        adapterId: id,
        available: false,
        status: "Blocked",
        reason: "Source Adapter status does not permit intake.",
        checkedAt: internal.nowIso()
      };
    }
    try {
      const availability = normalizeAvailability(implementation.isAvailable(options || {}));
      return Object.assign({ adapterId: id, checkedAt: internal.nowIso() }, availability);
    } catch (error) {
      return {
        adapterId: id,
        available: false,
        status: "Invalid",
        reason: error && error.message ? error.message : String(error),
        checkedAt: internal.nowIso()
      };
    }
  }

  function normalizeSourceRecord(adapter, rawRecord, index) {
    const source = internal.isPlainObject(rawRecord) ? internal.clone(rawRecord) : {};
    const identity = internal.isPlainObject(source.identity) ? source.identity : {};
    const classification = internal.isPlainObject(source.classification)
      ? source.classification
      : {};
    const payload = internal.isPlainObject(source.payload)
      ? source.payload
      : internal.isPlainObject(source.data)
        ? source.data
        : {};
    const sourceId = internal.text(
      source.sourceId || identity.sourceId || identity.qualifiedName || identity.name,
      ""
    );
    const recordType = internal.text(source.recordType || source.type, "");
    const missingFields = [];
    if (!sourceId) missingFields.push("sourceId");
    if (!recordType) missingFields.push("recordType");
    if (!identity.name && !identity.qualifiedName) missingFields.push("identity.name");

    const record = {
      sourceRecordId: internal.text(
        source.sourceRecordId,
        internal.nextId("IDE-170-SOURCE-RECORD")
      ),
      recordType: recordType || "unknown",
      sourceType: internal.text(source.sourceType, adapter.sourceType),
      sourceId: sourceId || (adapter.adapterId + ":record:" + (index + 1)),
      sourceVersion: internal.text(source.sourceVersion, ""),
      sourceUpdatedAt: internal.text(source.sourceUpdatedAt || source.updatedAt, ""),
      adapterId: adapter.adapterId,
      adapterVersion: adapter.version,
      capturedAt: internal.text(source.capturedAt, internal.nowIso()),
      identity: {
        sourceId: sourceId || null,
        name: internal.text(identity.name || source.name, ""),
        qualifiedName: internal.text(identity.qualifiedName || source.qualifiedName, ""),
        aliases: internal.unique(identity.aliases || source.aliases)
      },
      classification: {
        domain: internal.text(classification.domain || source.domain, adapter.domains[0] || "unknown"),
        category: internal.text(classification.category || source.category, ""),
        subtype: internal.text(classification.subtype || source.subtype, ""),
        lifecycle: internal.text(classification.lifecycle || source.lifecycle, "Active")
      },
      payload: internal.clone(payload),
      metadata: internal.isPlainObject(source.metadata) ? internal.clone(source.metadata) : {},
      quality: {
        status: missingFields.length ? "Partial" : "Valid",
        completeness: missingFields.length ? Math.max(0, 1 - missingFields.length / 3) : 1,
        warnings: internal.asArray(source.quality && source.quality.warnings).map(String),
        errors: internal.asArray(source.quality && source.quality.errors).map(String),
        missingFields: internal.unique(
          missingFields.concat(internal.asArray(source.quality && source.quality.missingFields))
        ),
        inferredFields: []
      }
    };

    if (!adapter.recordTypes.includes(record.recordType)) {
      record.quality.status = "Invalid";
      record.quality.errors.push("Record type is not declared by the Source Adapter.");
    }
    const schemaValidation = namespace.validateAgainstSchema(
      "IDE-170-SCHEMA-SOURCE-RECORD",
      record
    );
    if (!schemaValidation.valid) {
      record.quality.status = "Invalid";
      record.quality.errors = record.quality.errors.concat(
        schemaValidation.errors.map(function mapError(error) {
          return error.code + " at " + error.path;
        })
      );
    }
    return record;
  }

  function resolveRequestedAdapters(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const requested = internal.asArray(settings.adapterIds || settings.adapters)
      .map(internal.canonicalId)
      .filter(Boolean);
    if (requested.length) return requested;
    return getSourceAdapters({})
      .filter(function usableAdapter(adapter) {
        return adapter.status !== "Blocked" && adapter.status !== "Deprecated";
      })
      .map(function adapterId(adapter) { return adapter.adapterId; });
  }

  function captureSources(sessionId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = namespace.getSession(sessionId);
    if (!session) {
      return internal.buildResult(false, "SOURCE_INTAKE_SESSION_NOT_FOUND", "Blocked", null, {
        error: { message: "Intelligence Session was not found.", category: "Input Failure" }
      });
    }
    if (session.state === "Frozen" || session.frozen === true) {
      return internal.buildResult(false, "SOURCE_INTAKE_SESSION_FROZEN", "Blocked", {
        sessionId: sessionId
      }, {
        error: { message: "Frozen Session cannot capture new Sources.", category: "Governance Failure" }
      });
    }

    const adapterIds = resolveRequestedAdapters(settings);
    if (!adapterIds.length) {
      return internal.buildResult(false, "SOURCE_ADAPTERS_NOT_AVAILABLE", "Blocked", null, {
        error: { message: "No Source Adapter was selected.", category: "Dependency Failure" }
      });
    }

    const intakeId = internal.text(settings.intakeId, internal.nextId("IDE-170-SOURCE-INTAKE"));
    if (state.sourceIntakes.has(intakeId)) {
      return internal.buildResult(false, "SOURCE_INTAKE_ID_DUPLICATE", "Blocked", {
        intakeId: intakeId
      }, {
        error: { message: "Source Intake ID already exists.", category: "Identity Failure" }
      });
    }

    const requiredAdapterIds = new Set(
      internal.asArray(settings.requiredAdapterIds || settings.requiredAdapters)
        .map(internal.canonicalId)
        .filter(Boolean)
    );
    const adapterResults = [];

    adapterIds.forEach(function captureAdapter(adapterId) {
      const adapter = state.sourceAdapters.get(adapterId);
      const implementation = state.sourceAdapterImplementations.get(adapterId);
      const required = Boolean(
        requiredAdapterIds.has(adapterId) || (adapter && adapter.required === true)
      );
      if (!adapter || !implementation) {
        adapterResults.push({
          adapterId: adapterId,
          capabilityId: adapterId,
          sourceType: "unknown",
          status: required ? "Blocked" : "Unavailable",
          required: required,
          available: false,
          recordCount: 0,
          records: [],
          warnings: [],
          errors: ["Source Adapter is not registered."],
          capturedAt: internal.nowIso()
        });
        return;
      }

      const availability = getSourceAvailability(adapterId, settings);
      if (!availability.available) {
        adapterResults.push({
          adapterId: adapter.adapterId,
          capabilityId: adapter.capabilityId,
          sourceType: adapter.sourceType,
          status: required ? "Blocked" : availability.status,
          required: required,
          available: false,
          recordCount: 0,
          records: [],
          warnings: [],
          errors: [availability.reason || "Source is unavailable."],
          availability: availability,
          capturedAt: internal.nowIso()
        });
        return;
      }

      try {
        const rawResult = implementation.read(internal.clone(settings), internal.clone(adapter));
        if (rawResult && typeof rawResult.then === "function") {
          throw new Error("Asynchronous Adapter read is not supported by captureSources. Prepare the Source before intake.");
        }
        const response = Array.isArray(rawResult)
          ? { records: rawResult }
          : internal.isPlainObject(rawResult)
            ? rawResult
            : { records: [] };
        const rawRecords = internal.asArray(response.records);
        const sourceSnapshot = internal.clone(rawRecords);
        const records = rawRecords.map(function transform(rawRecord, index) {
          const transformed = implementation.transformRecord
            ? implementation.transformRecord(internal.clone(rawRecord), {
                index: index,
                adapter: internal.clone(adapter),
                options: internal.clone(settings)
              })
            : rawRecord;
          return normalizeSourceRecord(adapter, transformed, index);
        });
        const invalidCount = records.filter(function invalidRecord(record) {
          return record.quality.status === "Invalid";
        }).length;
        const partialCount = records.filter(function partialRecord(record) {
          return record.quality.status === "Partial";
        }).length;
        const resultStatus = invalidCount
          ? required ? "Blocked" : "Invalid"
          : partialCount || response.status === "Partial"
            ? "Partial"
            : "Ready";

        adapterResults.push({
          adapterId: adapter.adapterId,
          capabilityId: adapter.capabilityId,
          adapterVersion: adapter.version,
          sourceType: adapter.sourceType,
          status: resultStatus,
          required: required,
          available: true,
          sourceVersion: internal.text(response.sourceVersion, ""),
          recordCount: records.length,
          validRecordCount: records.length - invalidCount - partialCount,
          partialRecordCount: partialCount,
          invalidRecordCount: invalidCount,
          records: records,
          warnings: internal.asArray(response.warnings).map(String),
          errors: internal.asArray(response.errors).map(String),
          metadata: internal.isPlainObject(response.metadata) ? internal.clone(response.metadata) : {},
          sourceReadOnly: JSON.stringify(rawRecords) === JSON.stringify(sourceSnapshot),
          capturedAt: internal.nowIso()
        });
      } catch (error) {
        adapterResults.push({
          adapterId: adapter.adapterId,
          capabilityId: adapter.capabilityId,
          adapterVersion: adapter.version,
          sourceType: adapter.sourceType,
          status: required ? "Blocked" : "Invalid",
          required: required,
          available: true,
          recordCount: 0,
          records: [],
          warnings: [],
          errors: [error && error.message ? error.message : String(error)],
          capturedAt: internal.nowIso()
        });
      }
    });

    const summary = {
      requestedAdapterCount: adapterIds.length,
      readyAdapterCount: adapterResults.filter(function count(item) { return item.status === "Ready"; }).length,
      partialAdapterCount: adapterResults.filter(function count(item) { return item.status === "Partial"; }).length,
      unavailableAdapterCount: adapterResults.filter(function count(item) { return item.status === "Unavailable"; }).length,
      invalidAdapterCount: adapterResults.filter(function count(item) { return item.status === "Invalid"; }).length,
      blockedAdapterCount: adapterResults.filter(function count(item) { return item.status === "Blocked"; }).length,
      recordCount: adapterResults.reduce(function sum(total, item) { return total + item.recordCount; }, 0)
    };

    const blocked = summary.blockedAdapterCount > 0;
    const partial = summary.partialAdapterCount > 0 ||
      summary.unavailableAdapterCount > 0 || summary.invalidAdapterCount > 0;
    const intakeStatus = blocked ? "Blocked" : partial ? "Partial" : "Ready";
    const capturedAt = internal.nowIso();
    const intake = {
      intakeId: intakeId,
      componentId: namespace.componentId,
      version: VERSION,
      schemaVersion: VERSION,
      sessionId: sessionId,
      status: intakeStatus,
      adapterResults: adapterResults,
      summary: summary,
      warnings: adapterResults.reduce(function collect(result, item) {
        return result.concat(item.warnings || []);
      }, []),
      errors: adapterResults.reduce(function collect(result, item) {
        return result.concat(item.errors || []);
      }, []),
      capturedAt: capturedAt,
      validatedAt: capturedAt,
      frozenAt: capturedAt,
      frozen: true,
      immutable: true
    };
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-SOURCE-INTAKE", intake);
    if (!schemaValidation.valid) {
      return internal.buildResult(false, "SOURCE_INTAKE_SCHEMA_INVALID", "Blocked", {
        intake: intake,
        schemaValidation: schemaValidation
      }, {
        error: { message: "Source Intake does not match the registered Schema.", category: "Schema Failure" }
      });
    }

    const frozenIntake = internal.deepFreeze(intake);
    state.sourceIntakes.set(intakeId, frozenIntake);
    state.latestSourceIntakeId = intakeId;
    if (typeof internal.attachSessionSourceReference === "function") {
      internal.attachSessionSourceReference(sessionId, {
        referenceType: "Source Intake",
        intakeId: intakeId,
        status: intakeStatus,
        recordCount: summary.recordCount,
        capturedAt: capturedAt
      }, { actor: internal.text(settings.actor, "IDE-170 Source Intake") });
    }
    internal.touch();
    internal.appendAudit({
      action: "SOURCE_INTAKE_CAPTURED",
      actor: internal.text(settings.actor, "IDE-170 Source Intake"),
      targetType: "Source Intake",
      targetId: intakeId,
      sessionId: sessionId,
      outcome: blocked ? "Blocked" : intakeStatus,
      detail: summary
    });

    return internal.buildResult(!blocked, blocked ? "SOURCE_INTAKE_BLOCKED" : "SOURCE_INTAKE_FROZEN", intakeStatus, {
      intake: getSourceIntake(intakeId)
    }, blocked ? {
      error: { message: "One or more required Sources are unavailable or invalid.", category: "Source Failure" }
    } : {});
  }

  function getSourceIntake(intakeId) {
    return internal.clone(state.sourceIntakes.get(internal.text(intakeId, "")) || null);
  }

  function getSourceIntakes(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const sessionId = internal.text(settings.sessionId, "");
    const status = internal.text(settings.status, "");
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return [...state.sourceIntakes.values()]
      .filter(function filterIntake(intake) {
        if (sessionId && intake.sessionId !== sessionId) return false;
        if (status && intake.status !== status) return false;
        return true;
      })
      .slice(-limit)
      .map(internal.clone);
  }

  function validateSourceIntake(intakeOrId) {
    const intake = typeof intakeOrId === "string"
      ? state.sourceIntakes.get(intakeOrId)
      : intakeOrId;
    if (!intake) {
      return {
        id: internal.nextId("IDE-170-SOURCE-INTAKE-VALIDATION"),
        valid: false,
        passed: 0,
        failed: 1,
        total: 1,
        errors: [{ code: "SOURCE_INTAKE_NOT_FOUND" }],
        validatedAt: internal.nowIso()
      };
    }
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-SOURCE-INTAKE", intake);
    const checks = [
      { name: "Source Intake Schema", passed: schemaValidation.valid, detail: schemaValidation.errors },
      { name: "Source Intake frozen flag", passed: intake.frozen === true, detail: intake.frozen },
      { name: "Source Intake immutable flag", passed: intake.immutable === true, detail: intake.immutable },
      {
        name: "Source Records do not contain inferred fields",
        passed: intake.adapterResults.every(function adaptersClean(adapterResult) {
          return adapterResult.records.every(function recordClean(record) {
            return Array.isArray(record.quality.inferredFields) && record.quality.inferredFields.length === 0;
          });
        }),
        detail: "Canonical inference is prohibited during Source Intake."
      }
    ];
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      id: internal.nextId("IDE-170-SOURCE-INTAKE-VALIDATION"),
      componentId: namespace.componentId,
      intakeId: intake.intakeId,
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      errors: schemaValidation.errors,
      validatedAt: internal.nowIso()
    };
  }

  async function prepareCurrentRepositorySources(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (typeof global.ensureCurrentProjectAnalyzeSources !== "function") {
      return internal.buildResult(false, "REPOSITORY_SOURCE_PREPARATION_UNAVAILABLE", "Unavailable", null, {
        error: { message: "ensureCurrentProjectAnalyzeSources is unavailable.", category: "Dependency Failure" }
      });
    }
    try {
      const result = await global.ensureCurrentProjectAnalyzeSources({
        silent: settings.silent !== false
      });
      return internal.buildResult(result && result.ready === true,
        result && result.ready === true ? "REPOSITORY_SOURCES_READY" : "REPOSITORY_SOURCES_UNAVAILABLE",
        result && result.status || "Unavailable",
        { preparation: internal.clone(result) },
        result && result.ready === true ? {} : {
          error: { message: "Current Project Sources could not be prepared.", category: "Source Failure" }
        });
    } catch (error) {
      return internal.buildResult(false, "REPOSITORY_SOURCE_PREPARATION_FAILED", "Failed", null, {
        error: { message: error && error.message ? error.message : String(error), category: "Source Failure" }
      });
    }
  }

  function getSourceAdapterFrameworkStatus() {
    const adapters = getSourceAdapters({});
    const latest = state.latestSourceIntakeId
      ? state.sourceIntakes.get(state.latestSourceIntakeId)
      : null;
    return {
      id: "IDE-170-SOURCE-ADAPTER-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: namespace.getCapability(FRAMEWORK_CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability(FRAMEWORK_CAPABILITY_ID)),
      adapterCount: adapters.length,
      requiredAdapterCount: adapters.filter(function required(adapter) { return adapter.required; }).length,
      intakeCount: state.sourceIntakes.size,
      latestIntakeId: latest && latest.intakeId || null,
      latestIntakeStatus: latest && latest.status || "Not Run",
      latestRecordCount: latest && latest.summary.recordCount || 0,
      directSourceMutationAllowed: false,
      missingInformationInferenceAllowed: false,
      updatedAt: state.updatedAt || internal.nowIso()
    };
  }

  function initializeSourceAdapterFramework() {
    const schemaResults = registerFrameworkSchemas();
    const capabilityResult = registerFrameworkCapability();
    const schemaFailures = schemaResults.filter(function failure(item) {
      return item.registered !== true;
    });
    const ready = schemaFailures.length === 0 && capabilityResult.ok === true;
    return internal.buildResult(ready,
      ready ? "SOURCE_ADAPTER_FRAMEWORK_INITIALIZED" : "SOURCE_ADAPTER_FRAMEWORK_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      {
        schemaResults: schemaResults,
        capabilityResult: capabilityResult,
        adapterCount: state.sourceAdapters.size
      },
      ready ? {} : {
        error: { message: "Source Adapter Framework initialization failed.", category: "Initialization Failure" }
      });
  }

  function removeSourceAdapterForValidation(adapterId) {
    const id = internal.canonicalId(adapterId);
    state.sourceAdapterImplementations.delete(id);
    return state.sourceAdapters.delete(id);
  }

  function removeSourceIntakeForValidation(intakeId) {
    const removed = state.sourceIntakes.delete(internal.text(intakeId, ""));
    if (state.latestSourceIntakeId === intakeId) state.latestSourceIntakeId = null;
    return removed;
  }

  Object.assign(internal, {
    sourceAdapterStatuses: ADAPTER_STATUSES,
    intakeStatuses: INTAKE_STATUSES,
    removeSourceAdapterForValidation: removeSourceAdapterForValidation,
    removeSourceIntakeForValidation: removeSourceIntakeForValidation
  });

  Object.assign(namespace.api, {
    initializeSourceAdapterFramework: initializeSourceAdapterFramework,
    validateSourceAdapter: validateSourceAdapter,
    registerSourceAdapter: registerSourceAdapter,
    getSourceAdapter: getSourceAdapter,
    getSourceAdapters: getSourceAdapters,
    getSourceAvailability: getSourceAvailability,
    prepareCurrentRepositorySources: prepareCurrentRepositorySources,
    captureSources: captureSources,
    getSourceIntake: getSourceIntake,
    getSourceIntakes: getSourceIntakes,
    validateSourceIntake: validateSourceIntake,
    getSourceAdapterFrameworkStatus: getSourceAdapterFrameworkStatus
  });

  Object.assign(namespace, {
    validateSourceAdapter: validateSourceAdapter,
    registerSourceAdapter: registerSourceAdapter,
    getSourceAdapter: getSourceAdapter,
    getSourceAdapters: getSourceAdapters,
    getSourceAvailability: getSourceAvailability,
    prepareCurrentRepositorySources: prepareCurrentRepositorySources,
    captureSources: captureSources,
    getSourceIntake: getSourceIntake,
    getSourceIntakes: getSourceIntakes,
    validateSourceIntake: validateSourceIntake,
    getSourceAdapterFrameworkStatus: getSourceAdapterFrameworkStatus
  });

  namespace.modules.sourceAdapterFramework = {
    id: FRAMEWORK_CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    readOnly: true,
    immutableIntake: true,
    provenanceRequired: true,
    loadedAt: internal.nowIso()
  };

  global.registerIntelligenceSourceAdapter = registerSourceAdapter;
  global.getIntelligenceSourceAdapters = getSourceAdapters;
  global.prepareIntelligenceRepositorySources = prepareCurrentRepositorySources;
  global.captureIntelligenceSources = captureSources;
  global.getIntelligenceSourceIntake = getSourceIntake;
  global.getIntelligenceSourceAdapterStatus = getSourceAdapterFrameworkStatus;
})(typeof window !== "undefined" ? window : globalThis);
