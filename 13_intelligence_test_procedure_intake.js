/* ============================================================
   FILE: 13_intelligence_test_procedure_intake.js
   IDE-170 Intelligence Platform
   Version: 1.5.0
   Architecture Decision: 011 v1.1.0
   Phase: Test Procedure Intake and Validation Compiler (Pre-Phase 4)
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Test Procedure Intake blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.5.0";
  const CAPABILITY_ID = "IDE-170-TEST-PROCEDURE-INTAKE";
  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const SUPPORTED_FORMATS = Object.freeze(["txt", "md", "markdown", "json"]);

  if (!(state.testProcedures instanceof Map)) state.testProcedures = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestTestProcedureId")) {
    state.latestTestProcedureId = null;
  }

  function sha256(value) {
    if (typeof namespace.calculateSHA256 === "function") {
      return namespace.calculateSHA256(String(value == null ? "" : value));
    }
    return internal.hashValidationValue(String(value == null ? "" : value));
  }

  function extensionOf(fileName, fallback) {
    const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : String(fallback || "txt").toLowerCase();
  }

  function mediaTypeFor(format) {
    if (format === "json") return "application/json";
    if (format === "md" || format === "markdown") return "text/markdown";
    return "text/plain";
  }

  function normalizeFormat(format) {
    const value = String(format || "txt").toLowerCase().replace(/^\./, "");
    return value === "markdown" ? "md" : value;
  }

  async function readInput(input, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    let content = "";
    let fileName = internal.text(settings.fileName, "test-procedure.txt");
    let format = normalizeFormat(settings.format || extensionOf(fileName, "txt"));
    let mediaType = internal.text(settings.mediaType, mediaTypeFor(format));

    if (typeof input === "string") {
      content = input;
    } else if (internal.isPlainObject(input) && typeof input.content === "string") {
      content = input.content;
      fileName = internal.text(input.fileName || input.name, fileName);
      format = normalizeFormat(input.format || extensionOf(fileName, format));
      mediaType = internal.text(input.mediaType || input.type, mediaTypeFor(format));
    } else if (input && typeof input.text === "function") {
      content = await input.text();
      fileName = internal.text(input.name, fileName);
      format = normalizeFormat(settings.format || extensionOf(fileName, format));
      mediaType = internal.text(input.type, mediaTypeFor(format));
    } else if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
      const buffer = input instanceof ArrayBuffer
        ? input
        : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
      content = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    } else {
      throw Object.assign(new Error("Test Procedure input is not supported."), {
        code: "TEST_PROCEDURE_INPUT_UNSUPPORTED"
      });
    }

    return {
      content: String(content || "").replace(/^\uFEFF/, ""),
      fileName: fileName,
      format: format,
      mediaType: mediaType
    };
  }

  function validateProcedureRecord(record) {
    const checks = [];
    function check(name, passed, detail) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, "") });
    }
    check("Procedure ID is present", Boolean(record.procedureId), record.procedureId);
    check("Procedure name is present", Boolean(record.name), record.name);
    check("Procedure version is semantic", Boolean(internal.semverPattern && internal.semverPattern.test(record.version)), record.version);
    check("Procedure format is supported", SUPPORTED_FORMATS.includes(record.format), record.format);
    check("Procedure content is present", Boolean(record.originalText), "length=" + record.originalText.length);
    check("Procedure size is within limit", record.size <= MAX_FILE_SIZE, "size=" + record.size);
    check("Procedure SHA-256 is present", Boolean(record.procedureHash && record.procedureHash.length === 64), record.procedureHash);
    if (record.format === "json") {
      let jsonValid = true;
      try { JSON.parse(record.originalText); } catch (error) { jsonValid = false; }
      check("JSON Procedure is parseable", jsonValid, jsonValid ? "Valid" : "Invalid JSON");
    }
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      id: internal.nextId("IDE-170-PROCEDURE-VALIDATION"),
      componentId: namespace.componentId,
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  async function importTestProcedure(input, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    try {
      const loaded = await readInput(input, settings);
      const format = normalizeFormat(loaded.format);
      const originalText = loaded.content.replace(/\r\n?/g, "\n");
      const size = new TextEncoder().encode(originalText).length;
      const procedureId = internal.canonicalId(
        settings.procedureId ||
        "IDE-170-PROCEDURE-" + internal.nextId("IMPORT").replace(/^IDE-170-/, "")
      );
      const now = internal.nowIso();
      const record = {
        procedureId: procedureId,
        name: internal.text(settings.name, loaded.fileName.replace(/\.[^.]+$/, "") || "Test Procedure"),
        version: internal.text(settings.version, "1.0.0"),
        componentId: namespace.componentId,
        phase: internal.text(settings.phase, namespace.implementationPhase || "Pre-Phase 4"),
        status: "Frozen",
        immutable: true,
        fileName: loaded.fileName,
        format: format,
        mediaType: loaded.mediaType || mediaTypeFor(format),
        encoding: "UTF-8",
        size: size,
        originalText: originalText,
        procedureHash: sha256(originalText),
        source: internal.text(settings.source, "User Import"),
        createdBy: internal.text(settings.actor, "Project Owner"),
        createdAt: now,
        importedAt: now,
        frozenAt: now
      };
      const validation = validateProcedureRecord(record);
      if (!validation.valid) {
        return internal.buildResult(false, "TEST_PROCEDURE_INVALID", "Blocked", {
          validation: validation,
          procedure: internal.clone(record)
        }, {
          error: { message: "Test Procedure validation failed.", category: "Validation Failure" }
        });
      }
      if (state.testProcedures.has(procedureId)) {
        return internal.buildResult(false, "TEST_PROCEDURE_DUPLICATE", "Blocked", {
          procedureId: procedureId
        }, {
          error: { message: "Test Procedure ID already exists.", category: "Identity Failure" }
        });
      }
      const stored = internal.deepFreeze(record);
      state.testProcedures.set(procedureId, stored);
      state.latestTestProcedureId = procedureId;
      internal.touch();
      internal.appendAudit({
        action: "TEST_PROCEDURE_IMPORTED",
        actor: record.createdBy,
        targetType: "Test Procedure",
        targetId: procedureId,
        outcome: "Succeeded",
        detail: {
          fileName: record.fileName,
          format: record.format,
          size: record.size,
          procedureHash: record.procedureHash
        }
      });
      return internal.buildResult(true, "TEST_PROCEDURE_IMPORTED", "Frozen", {
        procedure: getTestProcedure(procedureId),
        validation: validation
      });
    } catch (error) {
      return internal.buildResult(false,
        internal.text(error && error.code, "TEST_PROCEDURE_IMPORT_FAILED"),
        "Failed",
        null,
        { error: { message: internal.text(error && error.message, String(error)), category: "Input Failure" } }
      );
    }
  }

  function getTestProcedure(procedureId) {
    const record = state.testProcedures.get(internal.canonicalId(procedureId));
    return record ? internal.clone(record) : null;
  }

  function listTestProcedures() {
    return [...state.testProcedures.values()]
      .sort(function sort(left, right) { return left.importedAt.localeCompare(right.importedAt); })
      .map(internal.clone);
  }

  function registerSchemas() {
    if (namespace.getSchema && namespace.getSchema("IDE-170-SCHEMA-TEST-PROCEDURE")) {
      return [{ schemaId: "IDE-170-SCHEMA-TEST-PROCEDURE", registered: true, existing: true }];
    }
    const result = namespace.registerSchema({
      schemaId: "IDE-170-SCHEMA-TEST-PROCEDURE",
      name: "Imported Test Procedure",
      version: VERSION,
      type: "object",
      required: ["procedureId", "name", "version", "format", "originalText", "procedureHash", "status"],
      properties: {
        procedureId: { type: "string", minLength: 1 },
        name: { type: "string", minLength: 1 },
        version: { type: "string", format: "semver" },
        format: { type: "string", enum: ["txt", "md", "json"] },
        originalText: { type: "string", minLength: 1 },
        procedureHash: { type: "string", minLength: 64, maxLength: 64 },
        status: { type: "string", enum: ["Frozen"] }
      },
      owner: "IDE-170",
      source: "Architecture Decision 011 v1.1.0"
    });
    return [{ schemaId: "IDE-170-SCHEMA-TEST-PROCEDURE", registered: result.ok === true, code: result.code }];
  }

  function registerCapability() {
    if (namespace.getCapability && namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", {
        capability: namespace.getCapability(CAPABILITY_ID)
      });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Test Procedure Intake",
      version: VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-TEST-DATASET-REGISTRY", minimumVersion: "1.3.0", optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-TEST-PROCEDURE"],
      provides: ["TXT Intake", "Markdown Intake", "JSON Intake", "Procedure Hash", "Immutable Original Procedure"],
      source: "Architecture Decision 011 v1.1.0"
    });
  }

  function initializeTestProcedureIntake() {
    const schemaResults = registerSchemas();
    const capabilityResult = registerCapability();
    const ready = schemaResults.every(function item(result) { return result.registered; }) && capabilityResult.ok === true;
    return internal.buildResult(ready,
      ready ? "TEST_PROCEDURE_INTAKE_INITIALIZED" : "TEST_PROCEDURE_INTAKE_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capabilityResult }
    );
  }

  function removeTestProcedureForValidation(procedureId) {
    const id = internal.canonicalId(procedureId);
    const removed = state.testProcedures.delete(id);
    if (state.latestTestProcedureId === id) state.latestTestProcedureId = null;
    return removed;
  }

  Object.assign(internal, {
    testProcedureMaxFileSize: MAX_FILE_SIZE,
    supportedTestProcedureFormats: SUPPORTED_FORMATS,
    validateTestProcedureRecord: validateProcedureRecord,
    removeTestProcedureForValidation: removeTestProcedureForValidation
  });

  Object.assign(namespace.api, {
    initializeTestProcedureIntake: initializeTestProcedureIntake,
    importTestProcedure: importTestProcedure,
    getTestProcedure: getTestProcedure,
    listTestProcedures: listTestProcedures
  });
  Object.assign(namespace, {
    importTestProcedure: importTestProcedure,
    getTestProcedure: getTestProcedure,
    listTestProcedures: listTestProcedures
  });

  namespace.modules.testProcedureIntake = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    supportedFormats: ["txt", "md", "json"],
    maximumFileSize: MAX_FILE_SIZE,
    immutableOriginal: true,
    automaticExecution: false,
    loadedAt: internal.nowIso()
  };

  global.importIntelligenceTestProcedure = importTestProcedure;
})(typeof window !== "undefined" ? window : globalThis);
