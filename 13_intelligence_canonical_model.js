/* ============================================================
   FILE: 13_intelligence_canonical_model.js
   IDE-170 Intelligence Platform
   Version: 1.5.0
   Phase: 2 Source Intake and Canonical Model
   Design Freeze: v1.0.0 / 2026-08-06
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Canonical Model blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.5.0";
  const CAPABILITY_ID = "IDE-170-CANONICAL-MODEL";
  const SUPPORTED_RECORD_TYPES = Object.freeze([
    "project",
    "file",
    "function",
    "module",
    "configuration",
    "architecture-object",
    "component",
    "layer",
    "interface",
    "knowledge-record",
    "memo",
    "specification",
    "decision",
    "workflow-package",
    "workflow-baseline",
    "workflow-session",
    "execution-record",
    "approval-record",
    "decision-record",
    "validation-result",
    "diagnostic-result",
    "test-result",
    "health-status",
    "change-record",
    "diff-record",
    "refactoring-record",
    "deployment-record"
  ]);

  if (!(state.canonicalSnapshots instanceof Map)) state.canonicalSnapshots = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestCanonicalSnapshotId")) {
    state.latestCanonicalSnapshotId = null;
  }

  function normalizeIdPart(value) {
    return internal.text(value, "unknown")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildCanonicalId(sourceRecord) {
    const record = internal.isPlainObject(sourceRecord) ? sourceRecord : {};
    const identity = internal.isPlainObject(record.identity) ? record.identity : {};
    if (identity.canonicalId) return internal.text(identity.canonicalId, "");
    const type = internal.text(record.recordType, "unknown").toLowerCase();
    const sourceId = normalizeIdPart(record.sourceId || identity.sourceId);
    if (type === "file") {
      return "file:" + normalizeIdPart(record.payload && record.payload.path || identity.qualifiedName || sourceId);
    }
    if (type === "function") {
      const payload = internal.isPlainObject(record.payload) ? record.payload : {};
      const fileName = normalizeIdPart(payload.fileName || "unknown");
      const functionName = normalizeIdPart(
        identity.qualifiedName || payload.qualifiedName || identity.name || sourceId
      );
      return "function:" + fileName + "::" + functionName.replace(fileName + "::", "");
    }
    if (type === "architecture-object") return "architecture:" + sourceId;
    if (type === "workflow-package") return "workflow-package:" + sourceId;
    if (type === "workflow-baseline") return "workflow-baseline:" + sourceId;
    return type + ":" + sourceId;
  }

  function domainForRecordType(recordType, fallback) {
    const type = internal.text(recordType, "").toLowerCase();
    if (["project", "file", "function", "module", "configuration"].includes(type)) return "repository";
    if (["architecture-object", "component", "layer", "interface"].includes(type)) return "architecture";
    if (["knowledge-record", "memo", "specification", "decision"].includes(type)) return "knowledge";
    if (["workflow-package", "workflow-baseline", "workflow-session", "execution-record", "approval-record", "decision-record"].includes(type)) return "workflow";
    if (["validation-result", "diagnostic-result", "test-result", "health-status"].includes(type)) return "quality";
    if (["change-record", "diff-record", "refactoring-record", "deployment-record"].includes(type)) return "change";
    return internal.text(fallback, "unknown");
  }

  function registerCanonicalSchemas() {
    const schemas = [
      {
        schemaId: "IDE-170-SCHEMA-CANONICAL-RECORD",
        name: "Canonical Intelligence Record",
        version: VERSION,
        description: "Common Core plus Typed Payload for Source-derived Facts.",
        type: "object",
        required: [
          "recordId", "recordType", "schemaVersion", "identity",
          "classification", "source", "metadata", "quality", "payload"
        ],
        properties: {
          recordId: { type: "string", minLength: 1 },
          recordType: { type: "string", minLength: 1 },
          schemaVersion: { type: "string", format: "semver" },
          identity: { type: "object" },
          classification: { type: "object" },
          source: { type: "object" },
          metadata: { type: "object" },
          quality: { type: "object" },
          payload: { type: "object" }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      },
      {
        schemaId: "IDE-170-SCHEMA-CANONICAL-SNAPSHOT",
        name: "Canonical Intelligence Snapshot",
        version: VERSION,
        description: "Frozen read-only analysis projection of one Source Intake.",
        type: "object",
        required: [
          "snapshotId", "snapshotType", "schemaVersion", "sessionId",
          "sourceIntakeId", "status", "records", "summary", "quality",
          "frozen", "immutable", "capturedAt", "frozenAt"
        ],
        properties: {
          snapshotId: { type: "string", minLength: 1 },
          snapshotType: { type: "string", enum: ["canonical"] },
          schemaVersion: { type: "string", format: "semver" },
          sessionId: { type: "string", minLength: 1 },
          sourceIntakeId: { type: "string", minLength: 1 },
          status: { type: "string", enum: ["Frozen"] },
          records: { type: "array" },
          summary: { type: "object" },
          quality: { type: "object" },
          frozen: { type: "boolean", enum: [true] },
          immutable: { type: "boolean", enum: [true] },
          capturedAt: { type: "string", format: "date-time" },
          frozenAt: { type: "string", format: "date-time" }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      }
    ];
    return schemas.map(function register(schema) {
      if (namespace.getSchema(schema.schemaId)) {
        return { schemaId: schema.schemaId, registered: true, existing: true };
      }
      const result = namespace.registerSchema(schema);
      return { schemaId: schema.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerCanonicalCapability() {
    if (namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "CANONICAL_MODEL_CAPABILITY_EXISTS", "Ready", {
        capability: namespace.getCapability(CAPABILITY_ID)
      });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Canonical Intelligence Model",
      version: VERSION,
      type: "Service",
      status: "Official",
      owner: "IDE-170",
      description: "Converts Source-derived records into immutable Common Core plus Typed Payload records.",
      dependencies: [
        { capabilityId: "IDE-170-SOURCE-ADAPTER-FRAMEWORK", minimumVersion: "1.0.0", optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: "1.0.0", optional: false }
      ],
      schemas: [
        "IDE-170-SCHEMA-SOURCE-RECORD",
        "IDE-170-SCHEMA-CANONICAL-RECORD",
        "IDE-170-SCHEMA-CANONICAL-SNAPSHOT"
      ],
      provides: [
        "Canonical ID",
        "Canonical Record",
        "Canonical Snapshot",
        "Snapshot Freeze"
      ],
      source: "built-in"
    });
  }

  function createCanonicalRecord(sourceRecord, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const source = internal.isPlainObject(sourceRecord) ? internal.clone(sourceRecord) : {};
    const sourceValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-SOURCE-RECORD", source);
    if (!sourceValidation.valid) {
      return internal.buildResult(false, "SOURCE_RECORD_SCHEMA_INVALID", "Blocked", {
        schemaValidation: sourceValidation
      }, {
        error: { message: "Source Record does not match the registered Schema.", category: "Schema Failure" }
      });
    }
    if (!SUPPORTED_RECORD_TYPES.includes(source.recordType)) {
      return internal.buildResult(false, "CANONICAL_RECORD_TYPE_UNSUPPORTED", "Blocked", {
        recordType: source.recordType
      }, {
        error: { message: "Canonical Record type is not registered for Version 1.", category: "Compatibility Failure" }
      });
    }

    const canonicalId = buildCanonicalId(source);
    const identity = source.identity || {};
    const classification = source.classification || {};
    const missingFields = internal.unique(
      internal.asArray(source.quality && source.quality.missingFields)
    );
    const warnings = internal.asArray(source.quality && source.quality.warnings).map(String);
    const errors = internal.asArray(source.quality && source.quality.errors).map(String);
    const status = errors.length
      ? "Invalid"
      : missingFields.length || source.quality && source.quality.status === "Partial"
        ? "Partial"
        : "Valid";
    const capturedAt = internal.nowIso();
    const record = {
      recordId: internal.text(settings.recordId, internal.nextId("IDE-170-CANONICAL-RECORD")),
      recordType: source.recordType,
      schemaVersion: VERSION,
      identity: {
        canonicalId: canonicalId,
        sourceId: source.sourceId,
        name: internal.text(identity.name, source.sourceId),
        qualifiedName: internal.text(identity.qualifiedName, canonicalId),
        aliases: internal.unique(identity.aliases)
      },
      classification: {
        domain: domainForRecordType(source.recordType, classification.domain),
        category: internal.text(classification.category, source.recordType),
        subtype: internal.text(classification.subtype, ""),
        lifecycle: internal.text(classification.lifecycle, "Active")
      },
      source: {
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        sourceVersion: internal.text(source.sourceVersion, ""),
        sourceUpdatedAt: source.sourceUpdatedAt || null,
        adapterId: source.adapterId,
        adapterVersion: source.adapterVersion,
        sourceRecordId: source.sourceRecordId,
        capturedAt: source.capturedAt
      },
      metadata: Object.assign({}, internal.clone(source.metadata || {}), {
        canonicalizedAt: capturedAt,
        sourceDerivedFactOnly: true
      }),
      quality: {
        status: status,
        completeness: Number.isFinite(Number(source.quality && source.quality.completeness))
          ? Number(source.quality.completeness)
          : missingFields.length ? 0.5 : 1,
        warnings: warnings,
        errors: errors,
        missingFields: missingFields,
        inferredFields: []
      },
      payload: internal.clone(source.payload || {})
    };
    const recordValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-CANONICAL-RECORD", record);
    if (!recordValidation.valid) {
      return internal.buildResult(false, "CANONICAL_RECORD_SCHEMA_INVALID", "Blocked", {
        record: record,
        schemaValidation: recordValidation
      }, {
        error: { message: "Canonical Record does not match the registered Schema.", category: "Schema Failure" }
      });
    }
    return internal.buildResult(status !== "Invalid",
      status === "Invalid" ? "CANONICAL_RECORD_INVALID" : "CANONICAL_RECORD_CREATED",
      status,
      { record: record },
      status === "Invalid" ? {
        error: { message: "Canonical Record contains Source validation errors.", category: "Source Failure" }
      } : {});
  }

  function resolveIntakeForSession(sessionId, intakeId) {
    if (intakeId) return namespace.getSourceIntake(intakeId);
    const intakes = namespace.getSourceIntakes({ sessionId: sessionId, limit: 100 });
    return intakes.length ? intakes[intakes.length - 1] : null;
  }

  function buildCanonicalSnapshot(sessionId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = namespace.getSession(sessionId);
    if (!session) {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_SESSION_NOT_FOUND", "Blocked", null, {
        error: { message: "Intelligence Session was not found.", category: "Input Failure" }
      });
    }
    if (session.state === "Frozen" || session.frozen === true) {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_SESSION_FROZEN", "Blocked", null, {
        error: { message: "Frozen Session cannot build a new Canonical Snapshot.", category: "Governance Failure" }
      });
    }
    const intake = resolveIntakeForSession(sessionId, settings.intakeId);
    if (!intake) {
      return internal.buildResult(false, "SOURCE_INTAKE_NOT_FOUND", "Blocked", null, {
        error: { message: "Source Intake was not found for the Session.", category: "Dependency Failure" }
      });
    }
    if (intake.status === "Blocked" || intake.status === "Invalid") {
      return internal.buildResult(false, "SOURCE_INTAKE_NOT_USABLE", "Blocked", {
        intakeId: intake.intakeId,
        intakeStatus: intake.status
      }, {
        error: { message: "Blocked or Invalid Source Intake cannot produce a Canonical Snapshot.", category: "Source Failure" }
      });
    }

    const snapshotId = internal.text(settings.snapshotId, internal.nextId("IDE-170-CANONICAL-SNAPSHOT"));
    if (state.canonicalSnapshots.has(snapshotId)) {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_ID_DUPLICATE", "Blocked", {
        snapshotId: snapshotId
      }, {
        error: { message: "Canonical Snapshot ID already exists.", category: "Identity Failure" }
      });
    }

    const records = [];
    const canonicalIds = new Set();
    const issues = [];
    intake.adapterResults.forEach(function convertAdapterResult(adapterResult) {
      internal.asArray(adapterResult.records).forEach(function convertRecord(sourceRecord) {
        const result = createCanonicalRecord(sourceRecord, {});
        if (!result.ok || !result.data || !result.data.record) {
          issues.push({
            code: result.code,
            adapterId: adapterResult.adapterId,
            sourceRecordId: sourceRecord.sourceRecordId
          });
          return;
        }
        const record = result.data.record;
        const canonicalId = record.identity.canonicalId;
        if (canonicalIds.has(canonicalId)) {
          issues.push({
            code: "CANONICAL_ID_DUPLICATE",
            canonicalId: canonicalId,
            adapterId: adapterResult.adapterId,
            sourceRecordId: sourceRecord.sourceRecordId
          });
          return;
        }
        canonicalIds.add(canonicalId);
        records.push(record);
      });
    });

    if (issues.some(function critical(issue) {
      return issue.code === "CANONICAL_ID_DUPLICATE" || issue.code === "CANONICAL_RECORD_SCHEMA_INVALID";
    })) {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_VALIDATION_BLOCKED", "Blocked", {
        intakeId: intake.intakeId,
        issues: issues
      }, {
        error: { message: "Canonical Snapshot contains duplicate IDs or invalid Records.", category: "Integrity Failure" }
      });
    }

    const typeCounts = {};
    const domainCounts = {};
    let partialRecordCount = 0;
    records.forEach(function summarize(record) {
      typeCounts[record.recordType] = (typeCounts[record.recordType] || 0) + 1;
      domainCounts[record.classification.domain] = (domainCounts[record.classification.domain] || 0) + 1;
      if (record.quality.status === "Partial") partialRecordCount += 1;
    });
    const qualityStatus = intake.status === "Partial" || partialRecordCount > 0 || issues.length
      ? "Partial"
      : "Ready";
    const now = internal.nowIso();
    const snapshot = {
      snapshotId: snapshotId,
      snapshotType: "canonical",
      componentId: namespace.componentId,
      version: VERSION,
      schemaVersion: VERSION,
      sessionId: sessionId,
      sourceIntakeId: intake.intakeId,
      status: "Frozen",
      records: records,
      sourceReferences: intake.adapterResults.map(function reference(result) {
        return {
          adapterId: result.adapterId,
          adapterVersion: result.adapterVersion || null,
          sourceType: result.sourceType,
          sourceVersion: result.sourceVersion || null,
          status: result.status,
          recordCount: result.recordCount,
          capturedAt: result.capturedAt
        };
      }),
      summary: {
        recordCount: records.length,
        recordTypeCounts: typeCounts,
        domainCounts: domainCounts,
        validRecordCount: records.filter(function valid(record) { return record.quality.status === "Valid"; }).length,
        partialRecordCount: partialRecordCount,
        issueCount: issues.length
      },
      quality: {
        status: qualityStatus,
        completeness: records.length
          ? Number(((records.length - partialRecordCount) / records.length).toFixed(4))
          : 0,
        warnings: intake.warnings.concat(issues.map(function issueText(issue) { return issue.code; })),
        errors: [],
        missingSources: intake.adapterResults
          .filter(function missing(result) { return result.status !== "Ready"; })
          .map(function sourceId(result) { return result.adapterId; }),
        inferredFields: []
      },
      validation: {
        status: "Valid",
        issueCount: issues.length,
        issues: issues
      },
      capturedAt: intake.capturedAt,
      validatedAt: now,
      frozenAt: now,
      frozen: true,
      immutable: true
    };
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-CANONICAL-SNAPSHOT", snapshot);
    if (!schemaValidation.valid) {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_SCHEMA_INVALID", "Blocked", {
        snapshot: snapshot,
        schemaValidation: schemaValidation
      }, {
        error: { message: "Canonical Snapshot does not match the registered Schema.", category: "Schema Failure" }
      });
    }
    const validation = validateCanonicalSnapshot(snapshot);
    if (!validation.valid) {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_INTEGRITY_INVALID", "Blocked", {
        snapshot: snapshot,
        validation: validation
      }, {
        error: { message: "Canonical Snapshot Integrity validation failed.", category: "Integrity Failure" }
      });
    }

    const frozenSnapshot = internal.deepFreeze(snapshot);
    state.canonicalSnapshots.set(snapshotId, frozenSnapshot);
    state.latestCanonicalSnapshotId = snapshotId;
    if (typeof internal.attachSessionSourceReference === "function") {
      internal.attachSessionSourceReference(sessionId, {
        referenceType: "Canonical Snapshot",
        snapshotId: snapshotId,
        sourceIntakeId: intake.intakeId,
        status: "Frozen",
        recordCount: records.length,
        capturedAt: now
      }, { actor: internal.text(settings.actor, "IDE-170 Canonical Model") });
    }
    internal.touch();
    internal.appendAudit({
      action: "CANONICAL_SNAPSHOT_FROZEN",
      actor: internal.text(settings.actor, "IDE-170 Canonical Model"),
      targetType: "Canonical Snapshot",
      targetId: snapshotId,
      sessionId: sessionId,
      outcome: qualityStatus,
      detail: snapshot.summary
    });
    return internal.buildResult(true, "CANONICAL_SNAPSHOT_FROZEN", qualityStatus, {
      snapshot: getCanonicalSnapshot(snapshotId),
      validation: validation
    });
  }

  function getCanonicalSnapshot(snapshotId) {
    return internal.clone(state.canonicalSnapshots.get(internal.text(snapshotId, "")) || null);
  }

  function getCanonicalSnapshots(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const sessionId = internal.text(settings.sessionId, "");
    const qualityStatus = internal.text(settings.qualityStatus, "");
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return [...state.canonicalSnapshots.values()]
      .filter(function filterSnapshot(snapshot) {
        if (sessionId && snapshot.sessionId !== sessionId) return false;
        if (qualityStatus && snapshot.quality.status !== qualityStatus) return false;
        return true;
      })
      .slice(-limit)
      .map(internal.clone);
  }

  function validateCanonicalSnapshot(snapshotOrId) {
    const snapshot = typeof snapshotOrId === "string"
      ? state.canonicalSnapshots.get(snapshotOrId)
      : snapshotOrId;
    if (!snapshot) {
      return {
        id: internal.nextId("IDE-170-CANONICAL-SNAPSHOT-VALIDATION"),
        valid: false,
        passed: 0,
        failed: 1,
        total: 1,
        checks: [{ name: "Canonical Snapshot exists", passed: false, detail: "Not Found" }],
        validatedAt: internal.nowIso()
      };
    }
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-CANONICAL-SNAPSHOT", snapshot);
    const canonicalIds = snapshot.records.map(function id(record) { return record.identity.canonicalId; });
    const uniqueIds = new Set(canonicalIds);
    const checks = [
      { name: "Canonical Snapshot Schema", passed: schemaValidation.valid, detail: schemaValidation.errors },
      { name: "Canonical IDs are unique", passed: uniqueIds.size === canonicalIds.length, detail: canonicalIds.length },
      {
        name: "Canonical Record count matches Summary",
        passed: snapshot.records.length === snapshot.summary.recordCount,
        detail: snapshot.records.length + "/" + snapshot.summary.recordCount
      },
      {
        name: "Canonical Records have Source provenance",
        passed: snapshot.records.every(function provenance(record) {
          return Boolean(record.source && record.source.sourceId && record.source.adapterId);
        }),
        detail: snapshot.records.length
      },
      {
        name: "Canonical Records contain no inferred fields",
        passed: snapshot.records.every(function noInference(record) {
          return Array.isArray(record.quality.inferredFields) && record.quality.inferredFields.length === 0;
        }),
        detail: "Source-derived Fact only"
      },
      { name: "Canonical Snapshot is frozen", passed: snapshot.frozen === true && snapshot.status === "Frozen", detail: snapshot.status },
      { name: "Canonical Snapshot is immutable", passed: snapshot.immutable === true, detail: snapshot.immutable }
    ];
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      id: internal.nextId("IDE-170-CANONICAL-SNAPSHOT-VALIDATION"),
      componentId: namespace.componentId,
      snapshotId: snapshot.snapshotId,
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      errors: schemaValidation.errors,
      validatedAt: internal.nowIso()
    };
  }

  function getCanonicalModelStatus() {
    const latest = state.latestCanonicalSnapshotId
      ? state.canonicalSnapshots.get(state.latestCanonicalSnapshotId)
      : null;
    return {
      id: "IDE-170-CANONICAL-MODEL-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability(CAPABILITY_ID)),
      supportedRecordTypeCount: SUPPORTED_RECORD_TYPES.length,
      snapshotCount: state.canonicalSnapshots.size,
      latestSnapshotId: latest && latest.snapshotId || null,
      latestSnapshotStatus: latest && latest.status || "Not Run",
      latestQualityStatus: latest && latest.quality.status || "Not Run",
      latestRecordCount: latest && latest.summary.recordCount || 0,
      sourceDerivedFactOnly: true,
      automaticFactInferenceAllowed: false,
      frozenSnapshotMutationAllowed: false,
      updatedAt: state.updatedAt || internal.nowIso()
    };
  }

  function initializeCanonicalModel() {
    const schemaResults = registerCanonicalSchemas();
    const capabilityResult = registerCanonicalCapability();
    const schemaFailures = schemaResults.filter(function failure(item) {
      return item.registered !== true;
    });
    const ready = schemaFailures.length === 0 && capabilityResult.ok === true;
    return internal.buildResult(ready,
      ready ? "CANONICAL_MODEL_INITIALIZED" : "CANONICAL_MODEL_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      {
        schemaResults: schemaResults,
        capabilityResult: capabilityResult,
        supportedRecordTypes: SUPPORTED_RECORD_TYPES.length
      },
      ready ? {} : {
        error: { message: "Canonical Model initialization failed.", category: "Initialization Failure" }
      });
  }

  function removeCanonicalSnapshotForValidation(snapshotId) {
    const removed = state.canonicalSnapshots.delete(internal.text(snapshotId, ""));
    if (state.latestCanonicalSnapshotId === snapshotId) state.latestCanonicalSnapshotId = null;
    return removed;
  }

  Object.assign(internal, {
    supportedCanonicalRecordTypes: SUPPORTED_RECORD_TYPES,
    buildCanonicalId: buildCanonicalId,
    removeCanonicalSnapshotForValidation: removeCanonicalSnapshotForValidation
  });

  Object.assign(namespace.api, {
    initializeCanonicalModel: initializeCanonicalModel,
    createCanonicalRecord: createCanonicalRecord,
    buildCanonicalSnapshot: buildCanonicalSnapshot,
    getCanonicalSnapshot: getCanonicalSnapshot,
    getCanonicalSnapshots: getCanonicalSnapshots,
    validateCanonicalSnapshot: validateCanonicalSnapshot,
    getCanonicalModelStatus: getCanonicalModelStatus
  });

  Object.assign(namespace, {
    createCanonicalRecord: createCanonicalRecord,
    buildCanonicalSnapshot: buildCanonicalSnapshot,
    getCanonicalSnapshot: getCanonicalSnapshot,
    getCanonicalSnapshots: getCanonicalSnapshots,
    validateCanonicalSnapshot: validateCanonicalSnapshot,
    getCanonicalModelStatus: getCanonicalModelStatus
  });

  namespace.modules.canonicalModel = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    sourceDerivedFactOnly: true,
    typedPayload: true,
    immutableSnapshot: true,
    supportedRecordTypeCount: SUPPORTED_RECORD_TYPES.length,
    loadedAt: internal.nowIso()
  };

  global.createIntelligenceCanonicalRecord = createCanonicalRecord;
  global.buildIntelligenceCanonicalSnapshot = buildCanonicalSnapshot;
  global.getIntelligenceCanonicalSnapshot = getCanonicalSnapshot;
  global.getIntelligenceCanonicalModelStatus = getCanonicalModelStatus;
})(typeof window !== "undefined" ? window : globalThis);
