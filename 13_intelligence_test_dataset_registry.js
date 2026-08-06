/* ============================================================
   FILE: 13_intelligence_test_dataset_registry.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Architecture Decision: 011
   Phase: Validation Automation Foundation (Pre-Phase 4)
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Test Dataset Registry blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.6.0";
  const CAPABILITY_ID = "IDE-170-TEST-DATASET-REGISTRY";
  const DATASET_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$/;
  const CASE_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$/;
  const DATASET_STATUSES = Object.freeze(["Draft", "Ready", "Deprecated", "Frozen", "Invalid"]);
  const EXECUTION_TYPES = Object.freeze([
    "Function", "Async Function", "Status Probe", "Validation API",
    "Schema Validation", "Dataset Validation", "Snapshot Validation",
    "Integrity Validation", "Regression Probe", "Download Generation",
    "Owner Approved Code", "Manual Confirmation"
  ]);
  const SEVERITIES = Object.freeze(["Critical", "High", "Medium", "Low"]);
  const COMPARATORS = Object.freeze([
    "Exact", "Partial Object", "Schema", "Boolean Expression", "Numeric Range",
    "Array Ordered", "Array Unordered", "Contains", "Not Contains",
    "Required Fields", "Forbidden Fields", "Type", "Error Code", "Status",
    "All", "One Of"
  ]);

  if (!(state.testDatasets instanceof Map)) state.testDatasets = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestTestDatasetId")) {
    state.latestTestDatasetId = null;
  }

  function hashValue(value) {
    const stringify = typeof internal.stableStringify === "function"
      ? internal.stableStringify
      : JSON.stringify;
    const hash = typeof internal.sha256Hex === "function"
      ? internal.sha256Hex
      : function fallbackHash(input) {
          let valueHash = 2166136261;
          const textValue = String(input == null ? "" : input);
          for (let index = 0; index < textValue.length; index += 1) {
            valueHash ^= textValue.charCodeAt(index);
            valueHash = Math.imul(valueHash, 16777619);
          }
          return ("00000000" + (valueHash >>> 0).toString(16)).slice(-8);
        };
    return hash(stringify(value));
  }

  function normalizeExpected(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      comparator: internal.text(source.comparator, "Exact"),
      value: Object.prototype.hasOwnProperty.call(source, "value")
        ? internal.clone(source.value)
        : null,
      path: internal.text(source.path, "") || null,
      schemaId: internal.text(source.schemaId, "") || null,
      minimum: Number.isFinite(Number(source.minimum)) ? Number(source.minimum) : null,
      maximum: Number.isFinite(Number(source.maximum)) ? Number(source.maximum) : null,
      fields: internal.unique(source.fields),
      expression: internal.isPlainObject(source.expression)
        ? internal.clone(source.expression)
        : null,
      conditions: Array.isArray(source.conditions)
        ? source.conditions.map(normalizeExpected)
        : [],
      values: Array.isArray(source.values)
        ? internal.clone(source.values)
        : [],
      options: internal.isPlainObject(source.options)
        ? internal.clone(source.options)
        : {}
    };
  }

  function normalizeTestCase(input, index) {
    const source = internal.isPlainObject(input) ? input : {};
    const retry = internal.isPlainObject(source.retry) ? source.retry : {};
    return {
      caseId: internal.canonicalId(source.caseId || source.id),
      name: internal.text(source.name || source.title, "Test Case " + (index + 1)),
      description: internal.text(source.description || source.summary, ""),
      category: internal.text(source.category, "General"),
      severity: internal.text(source.severity, "High"),
      target: internal.canonicalId(source.target),
      executionType: internal.text(source.executionType, "Function"),
      executionPolicy: internal.text(source.executionPolicy, "Auto Executable"),
      warningLevel: internal.text(source.warningLevel, "") || null,
      warningReasons: internal.unique(source.warningReasons),
      selectedByOwner: source.selectedByOwner === true,
      input: internal.isPlainObject(source.input) ? internal.clone(source.input) : {},
      preconditions: Array.isArray(source.preconditions) ? internal.clone(source.preconditions) : [],
      expected: normalizeExpected(source.expected),
      timeout: Math.max(100, Math.min(120000, Number(source.timeout) || 10000)),
      dependencies: internal.unique(source.dependencies).map(internal.canonicalId),
      tags: internal.unique(source.tags),
      enabled: source.enabled !== false,
      required: source.required !== false,
      retry: {
        maximumAttempts: Math.max(1, Math.min(10, Number(retry.maximumAttempts) || 1)),
        intervalMs: Math.max(0, Math.min(30000, Number(retry.intervalMs) || 0)),
        retryOn: internal.unique(retry.retryOn)
      },
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      updatedAt: internal.text(source.updatedAt, internal.nowIso())
    };
  }

  function normalizeDataset(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const normalized = {
      datasetId: internal.canonicalId(source.datasetId || source.id),
      name: internal.text(source.name || source.title, ""),
      version: internal.text(source.version, ""),
      componentId: internal.text(source.componentId, namespace.componentId),
      targetPhase: internal.text(source.targetPhase, "Validation Automation Foundation"),
      status: internal.text(source.status, "Draft"),
      description: internal.text(source.description || source.summary, ""),
      sourceProcedureId: internal.text(source.sourceProcedureId, "") || null,
      sourceProcedureVersion: internal.text(source.sourceProcedureVersion, "") || null,
      sourceProcedureHash: internal.text(source.sourceProcedureHash, "") || null,
      parsedProcedureId: internal.text(source.parsedProcedureId, "") || null,
      candidateId: internal.text(source.candidateId, "") || null,
      ownerSelections: Array.isArray(source.ownerSelections) ? internal.clone(source.ownerSelections) : [],
      warnings: internal.unique(source.warnings),
      testCases: Array.isArray(source.testCases)
        ? source.testCases.map(normalizeTestCase)
        : [],
      metadata: internal.isPlainObject(source.metadata) ? internal.clone(source.metadata) : {},
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      updatedAt: internal.text(source.updatedAt, internal.nowIso()),
      frozenAt: internal.text(source.frozenAt, "") || null,
      datasetHash: null
    };
    normalized.datasetHash = hashValue(Object.assign({}, normalized, { datasetHash: null }));
    return normalized;
  }

  function validateTestDataset(input) {
    const dataset = normalizeDataset(input);
    const checks = [];
    const caseIds = new Set();

    function check(name, passed, detail, field) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: internal.text(detail, ""),
        field: field || ""
      });
    }

    check("Dataset ID is present", Boolean(dataset.datasetId), dataset.datasetId, "datasetId");
    check("Dataset ID format is valid", DATASET_ID_PATTERN.test(dataset.datasetId), dataset.datasetId, "datasetId");
    check("Dataset name is present", Boolean(dataset.name), dataset.name, "name");
    check("Dataset version is semantic", Boolean(internal.semverPattern && internal.semverPattern.test(dataset.version)), dataset.version, "version");
    check("Component ID matches IDE-170", dataset.componentId === namespace.componentId, dataset.componentId, "componentId");
    check("Dataset status is governed", DATASET_STATUSES.includes(dataset.status), dataset.status, "status");
    check("Dataset contains Test Cases", dataset.testCases.length > 0, "count=" + dataset.testCases.length, "testCases");

    dataset.testCases.forEach(function validateCase(testCase, index) {
      const label = "Test Case #" + (index + 1);
      check(label + " ID is present", Boolean(testCase.caseId), testCase.caseId, "testCases.caseId");
      check(label + " ID format", CASE_ID_PATTERN.test(testCase.caseId), testCase.caseId, "testCases.caseId");
      check(label + " ID is unique", !caseIds.has(testCase.caseId), testCase.caseId, "testCases.caseId");
      caseIds.add(testCase.caseId);
      check(label + " severity is governed", SEVERITIES.includes(testCase.severity), testCase.severity, "testCases.severity");
      check(label + " execution type is governed", EXECUTION_TYPES.includes(testCase.executionType), testCase.executionType, "testCases.executionType");
      check(label + " comparator is governed", COMPARATORS.includes(testCase.expected.comparator), testCase.expected.comparator, "testCases.expected.comparator");
      check(
        label + " Warning Selectable requires Owner selection",
        testCase.executionPolicy !== "Warning Selectable" || testCase.enabled === false || testCase.selectedByOwner === true,
        testCase.executionPolicy + "/selectedByOwner=" + testCase.selectedByOwner,
        "testCases.selectedByOwner"
      );
      check(
        label + " target is present or Manual Confirmation",
        testCase.executionType === "Manual Confirmation" || Boolean(testCase.target),
        testCase.target || testCase.executionType,
        "testCases.target"
      );
      testCase.dependencies.forEach(function validateDependency(dependencyId) {
        check(label + " dependency is not self", dependencyId !== testCase.caseId, dependencyId, "testCases.dependencies");
      });
    });

    dataset.testCases.forEach(function validateDependencyExists(testCase) {
      testCase.dependencies.forEach(function dependencyExists(dependencyId) {
        check(
          "Dependency exists: " + testCase.caseId + " -> " + dependencyId,
          caseIds.has(dependencyId),
          dependencyId,
          "testCases.dependencies"
        );
      });
    });

    const dependencyMap = new Map(dataset.testCases.map(function mapCase(testCase) {
      return [testCase.caseId, testCase.dependencies.slice()];
    }));
    const visiting = new Set();
    const visited = new Set();
    let circularDependency = null;

    function visit(caseId, path) {
      if (circularDependency) return;
      if (visiting.has(caseId)) {
        circularDependency = path.concat(caseId);
        return;
      }
      if (visited.has(caseId)) return;
      visiting.add(caseId);
      const dependencies = dependencyMap.get(caseId) || [];
      dependencies.forEach(function visitDependency(dependencyId) {
        if (dependencyMap.has(dependencyId)) visit(dependencyId, path.concat(caseId));
      });
      visiting.delete(caseId);
      visited.add(caseId);
    }

    dataset.testCases.forEach(function detectCycle(testCase) {
      visit(testCase.caseId, []);
    });
    check(
      "Test Case Dependency Graph is acyclic",
      circularDependency === null,
      circularDependency ? circularDependency.join(" -> ") : "Acyclic",
      "testCases.dependencies"
    );

    const passed = checks.filter(function countPassed(item) { return item.passed; }).length;
    return {
      id: internal.nextId("IDE-170-DATASET-VALIDATION"),
      componentId: namespace.componentId,
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      dataset: dataset,
      validatedAt: internal.nowIso()
    };
  }

  function registerTestDataset(input, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const validation = validateTestDataset(input);
    const dataset = validation.dataset;

    if (!validation.valid) {
      internal.appendAudit({
        action: "TEST_DATASET_REGISTRATION_BLOCKED",
        actor: internal.text(settings.actor, "IDE-170"),
        targetType: "Test Dataset",
        targetId: dataset.datasetId || "UNKNOWN",
        outcome: "Blocked",
        detail: { failed: validation.failed, total: validation.total }
      });
      return internal.buildResult(false, "TEST_DATASET_INVALID", "Blocked", { validation: validation }, {
        error: { message: "Test Dataset validation failed.", category: "Validation Failure" }
      });
    }

    if (state.testDatasets.has(dataset.datasetId) && settings.replace !== true) {
      return internal.buildResult(false, "TEST_DATASET_DUPLICATE", "Blocked", {
        datasetId: dataset.datasetId
      }, {
        error: { message: "Test Dataset already exists.", category: "Identity Failure" }
      });
    }

    const existing = state.testDatasets.get(dataset.datasetId);
    if (existing && existing.status === "Frozen") {
      return internal.buildResult(false, "TEST_DATASET_FROZEN", "Blocked", {
        datasetId: dataset.datasetId,
        version: existing.version
      }, {
        error: { message: "Frozen Test Dataset cannot be replaced.", category: "Governance Failure" }
      });
    }

    if (dataset.status === "Ready" || dataset.status === "Frozen") {
      dataset.status = "Frozen";
      dataset.frozenAt = dataset.frozenAt || internal.nowIso();
    }
    dataset.datasetHash = hashValue(Object.assign({}, dataset, { datasetHash: null }));
    const stored = dataset.status === "Frozen" ? internal.deepFreeze(dataset) : dataset;
    state.testDatasets.set(dataset.datasetId, stored);
    state.latestTestDatasetId = dataset.datasetId;
    internal.touch();
    internal.appendAudit({
      action: "TEST_DATASET_REGISTERED",
      actor: internal.text(settings.actor, "IDE-170"),
      targetType: "Test Dataset",
      targetId: dataset.datasetId,
      outcome: "Succeeded",
      detail: { version: dataset.version, status: dataset.status, testCaseCount: dataset.testCases.length }
    });
    return internal.buildResult(true, "TEST_DATASET_REGISTERED", dataset.status, {
      dataset: getTestDataset(dataset.datasetId),
      validation: validation
    });
  }

  function getTestDataset(datasetId) {
    const record = state.testDatasets.get(internal.canonicalId(datasetId));
    return record ? internal.clone(record) : null;
  }

  function listTestDatasets(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const status = internal.text(settings.status, "");
    return [...state.testDatasets.values()]
      .filter(function filterDataset(dataset) {
        return !status || dataset.status === status;
      })
      .sort(function sortDataset(left, right) {
        return left.datasetId.localeCompare(right.datasetId);
      })
      .map(internal.clone);
  }

  function freezeTestDataset(datasetId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const id = internal.canonicalId(datasetId);
    const current = state.testDatasets.get(id);
    if (!current) {
      return internal.buildResult(false, "TEST_DATASET_NOT_FOUND", "Blocked", null, {
        error: { message: "Test Dataset was not found.", category: "Input Failure" }
      });
    }
    if (current.status === "Frozen" || Object.isFrozen(current)) {
      return internal.buildResult(true, "TEST_DATASET_ALREADY_FROZEN", "Frozen", {
        dataset: getTestDataset(id)
      });
    }
    const updated = internal.clone(current);
    updated.status = "Frozen";
    updated.frozenAt = internal.nowIso();
    updated.updatedAt = updated.frozenAt;
    updated.datasetHash = hashValue(Object.assign({}, updated, { datasetHash: null }));
    state.testDatasets.set(id, internal.deepFreeze(updated));
    internal.appendAudit({
      action: "TEST_DATASET_FROZEN",
      actor: internal.text(settings.actor, "IDE-170"),
      targetType: "Test Dataset",
      targetId: id,
      outcome: "Succeeded",
      detail: { datasetHash: updated.datasetHash }
    });
    return internal.buildResult(true, "TEST_DATASET_FROZEN", "Frozen", {
      dataset: getTestDataset(id)
    });
  }

  function registerDatasetSchemas() {
    const definitions = [
      {
        schemaId: "IDE-170-SCHEMA-TEST-DATASET",
        name: "Versioned Test Dataset",
        version: VERSION,
        type: "object",
        required: ["datasetId", "name", "version", "componentId", "targetPhase", "status", "testCases", "datasetHash"],
        properties: {
          datasetId: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          version: { type: "string", format: "semver" },
          componentId: { type: "string", enum: ["IDE-170"] },
          targetPhase: { type: "string", minLength: 1 },
          status: { type: "string", enum: DATASET_STATUSES.slice() },
          testCases: { type: "array" },
          datasetHash: { type: "string", minLength: 8 }
        },
        owner: "IDE-170",
        source: "Architecture Decision 011"
      },
      {
        schemaId: "IDE-170-SCHEMA-TEST-CASE",
        name: "Automated Validation Test Case",
        version: VERSION,
        type: "object",
        required: ["caseId", "name", "severity", "executionType", "expected"],
        properties: {
          caseId: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          severity: { type: "string", enum: SEVERITIES.slice() },
          executionType: { type: "string", enum: EXECUTION_TYPES.slice() },
          expected: { type: "object" },
          dependencies: { type: "array" }
        },
        owner: "IDE-170",
        source: "Architecture Decision 011"
      }
    ];
    return definitions.map(function register(definition) {
      if (namespace.getSchema && namespace.getSchema(definition.schemaId)) {
        return { schemaId: definition.schemaId, registered: true, existing: true };
      }
      const result = namespace.registerSchema(definition);
      return { schemaId: definition.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerDatasetCapability() {
    if (namespace.getCapability && namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", {
        capability: namespace.getCapability(CAPABILITY_ID)
      });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Versioned Test Dataset Registry",
      version: VERSION,
      type: "Registry",
      status: "Active",
      owner: "IDE-170",
      description: "Architecture Decision 011 versioned Test Dataset registry.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-CAPABILITY-REGISTRY", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-REPOSITORY-SNAPSHOT", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-TEST-DATASET", "IDE-170-SCHEMA-TEST-CASE"],
      provides: ["Versioned Test Dataset", "Frozen Dataset", "Dataset Hash"],
      source: "Architecture Decision 011"
    });
  }

  function buildFoundationDataset() {
    return {
      datasetId: "IDE-170-DATASET-VALIDATION-AUTOMATION-FOUNDATION",
      name: "IDE-170 Validation Automation Foundation",
      version: VERSION,
      componentId: "IDE-170",
      targetPhase: "Test Procedure Intake and Validation Compiler (Pre-Phase 4)",
      status: "Ready",
      description: "Deterministic tests for Decision 011 foundation and required regressions.",
      testCases: [
        {
          caseId: "IDE-170-TEST-SHA256-KNOWN-VECTOR",
          name: "SHA-256 Known Vector",
          category: "Integrity",
          severity: "High",
          target: "IDE-170-TARGET-SHA256",
          executionType: "Function",
          input: { arguments: ["abc"] },
          expected: {
            comparator: "Exact",
            value: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
          }
        },
        {
          caseId: "IDE-170-TEST-IDE160-RUNTIME-READY",
          name: "IDE-160 Runtime Fully Ready",
          category: "Regression",
          severity: "High",
          target: "IDE-170-TARGET-IDE160-STATUS",
          executionType: "Status Probe",
          input: {},
          expected: {
            comparator: "Partial Object",
            value: {
              available: true,
              initialized: true,
              ready: true,
              status: "Ready",
              progress: 100,
              modules: {
                core: true,
                storage: true,
                state: true,
                planning: true,
                adapter: true,
                execution: true,
                decision: true,
                approval: true,
                monitoring: true,
                package: true,
                completion: true,
                integration: true,
                validation: true
              }
            }
          },
          retry: {
            maximumAttempts: 3,
            intervalMs: 500,
            retryOn: ["Not Ready", "Module Loading", "Initialization Pending"]
          }
        },
        {
          caseId: "IDE-170-TEST-PROJECT-ZIP-API",
          name: "Project ZIP API Available",
          category: "Regression",
          severity: "High",
          target: "IDE-170-TARGET-PROJECT-ZIP-API",
          executionType: "Regression Probe",
          expected: {
            comparator: "Partial Object",
            value: {
              saveProjectPackage: "function",
              buildProjectIndexFromStaticManifest: "function"
            }
          }
        },
        {
          caseId: "IDE-170-TEST-STATIC-MANIFEST",
          name: "Static Script Manifest Includes Validation Automation",
          category: "Regression",
          severity: "High",
          target: "IDE-170-TARGET-STATIC-MANIFEST",
          executionType: "Async Function",
          expected: {
            comparator: "Partial Object",
            value: {
              valid: true,
              version: "1.6.0",
              scriptCount: 134,
              includesDatasetRegistry: true,
              includesAutomation: true,
              includesEvidence: true,
              includesProcedureIntake: true,
              includesProcedureParser: true,
              includesValidationCompiler: true,
              includesProcedureUI: true
            }
          }
        },
        {
          caseId: "IDE-170-TEST-COMPARATOR-NUMERIC",
          name: "Numeric Range Comparator",
          category: "Comparator",
          severity: "High",
          target: "IDE-170-TARGET-ECHO",
          executionType: "Function",
          input: { value: 50 },
          expected: { comparator: "Numeric Range", minimum: 0, maximum: 100 }
        },
        {
          caseId: "IDE-170-TEST-ASYNC-EXECUTION",
          name: "Async Function Execution",
          category: "Runner",
          severity: "High",
          target: "IDE-170-TARGET-ASYNC-ECHO",
          executionType: "Async Function",
          input: { value: { ready: true } },
          expected: { comparator: "Partial Object", value: { ready: true } }
        },
        {
          caseId: "IDE-170-TEST-ANDROID-MANUAL-CONFIRMATION",
          name: "Android Real Device Manual Confirmation",
          category: "Real Device",
          severity: "High",
          executionType: "Manual Confirmation",
          required: true,
          expected: { comparator: "Exact", value: true }
        }
      ],
      metadata: {
        architectureDecision: "IDE-170-ARCHITECTURE-DECISION-011-v1.1.0",
        automaticExecutionOnStartup: false,
        repositoryMutationAllowed: false
      }
    };
  }

  function initializeTestDatasetRegistry() {
    const schemaResults = registerDatasetSchemas();
    const capabilityResult = registerDatasetCapability();
    let datasetResult;
    if (state.testDatasets.has("IDE-170-DATASET-VALIDATION-AUTOMATION-FOUNDATION")) {
      datasetResult = internal.buildResult(true, "TEST_DATASET_EXISTS", "Frozen", {
        dataset: getTestDataset("IDE-170-DATASET-VALIDATION-AUTOMATION-FOUNDATION")
      });
    } else {
      datasetResult = registerTestDataset(buildFoundationDataset(), { actor: "IDE-170 Bootstrap" });
    }
    const ready = schemaResults.every(function readySchema(item) { return item.registered; }) &&
      capabilityResult.ok === true && datasetResult.ok === true;
    return internal.buildResult(ready,
      ready ? "TEST_DATASET_REGISTRY_INITIALIZED" : "TEST_DATASET_REGISTRY_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capabilityResult, datasetResult: datasetResult },
      ready ? {} : { error: { message: "Test Dataset Registry initialization failed.", category: "Initialization Failure" } }
    );
  }

  function removeTestDatasetForValidation(datasetId) {
    const id = internal.canonicalId(datasetId);
    const removed = state.testDatasets.delete(id);
    if (state.latestTestDatasetId === id) state.latestTestDatasetId = null;
    return removed;
  }

  Object.assign(internal, {
    testDatasetStatuses: DATASET_STATUSES,
    testExecutionTypes: EXECUTION_TYPES,
    expectedComparators: COMPARATORS,
    hashValidationValue: hashValue,
    removeTestDatasetForValidation: removeTestDatasetForValidation
  });

  Object.assign(namespace.api, {
    initializeTestDatasetRegistry: initializeTestDatasetRegistry,
    registerTestDataset: registerTestDataset,
    getTestDataset: getTestDataset,
    listTestDatasets: listTestDatasets,
    validateTestDataset: validateTestDataset,
    freezeTestDataset: freezeTestDataset
  });
  Object.assign(namespace, {
    registerTestDataset: registerTestDataset,
    getTestDataset: getTestDataset,
    listTestDatasets: listTestDatasets,
    validateTestDataset: validateTestDataset,
    freezeTestDataset: freezeTestDataset
  });

  namespace.modules.testDatasetRegistry = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    versionedDataset: true,
    frozenDataset: true,
    datasetHash: true,
    automaticStartupExecution: false,
    loadedAt: internal.nowIso()
  };

  global.registerIntelligenceTestDataset = registerTestDataset;
  global.getIntelligenceTestDataset = getTestDataset;
  global.validateIntelligenceTestDataset = validateTestDataset;
})(typeof window !== "undefined" ? window : globalThis);
