/* ============================================================
   FILE: 13_ai_development_workflow_adapter.js
   IDE-160 AI Development Workflow Component Adapter
   Version: 2.0.1
   Phase: Complete - Monitoring / Package / Completion / Integration / Release
   Design Freeze: 2026-08-04
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const VERSION = namespace.version;
  const registry = namespace.adapters.registry instanceof Map
    ? namespace.adapters.registry
    : new Map();
  namespace.adapters.registry = registry;

  const ADAPTER_STATUSES = Object.freeze([
    "Ready",
    "Unavailable",
    "Blocked",
    "Compatibility Error",
    "Disabled"
  ]);

  const IDE_COMPONENT_ADAPTERS = Object.freeze([
    {
      adapterId: "IDE-160-ADAPTER-IDE-110",
      componentId: "IDE-110",
      componentVersion: "1.2.1",
      capabilities: ["Diagnostic", "Instrumentation", "Performance Monitoring", "Restore"],
      operations: {
        "Get Status": "getDiagnosticPlatformStatus",
        "Validate": "validateDiagnosticPlatform"
      },
      statusApi: "getDiagnosticPlatformStatus",
      validatorApi: "validateDiagnosticPlatform",
      rollbackCapability: true,
      cancellationCapability: false,
      idempotency: "Conditionally Idempotent"
    },
    {
      adapterId: "IDE-160-ADAPTER-IDE-115",
      componentId: "IDE-115",
      componentVersion: "1.0.2",
      capabilities: ["Diagnostic Validation", "Safety Validation", "Rollback Validation"],
      operations: {
        "Get Status": "getDiagnosticValidationStatus",
        "Validate": "validateDiagnosticValidationPlatform"
      },
      statusApi: "getDiagnosticValidationStatus",
      validatorApi: "validateDiagnosticValidationPlatform",
      rollbackCapability: false,
      cancellationCapability: false,
      idempotency: "Idempotent"
    },
    {
      adapterId: "IDE-160-ADAPTER-IDE-120",
      componentId: "IDE-120",
      componentVersion: "1.1.3",
      capabilities: ["Search", "Advanced Search Strategy", "Compound Search"],
      operations: {
        "Get Status": "getSearchPipelineStatus",
        "Validate": "validateSearchStrategyPlatform",
        "Search": "executeSearchPipeline",
        "Compound Search": "executeCompoundSearch"
      },
      operationArgumentModes: {
        "Search": "query-options",
        "Compound Search": "conditions-options"
      },
      statusApi: "getSearchPipelineStatus",
      validatorApi: "validateSearchStrategyPlatform",
      rollbackCapability: false,
      cancellationCapability: false,
      idempotency: "Idempotent"
    },
    {
      adapterId: "IDE-160-ADAPTER-IDE-125",
      componentId: "IDE-125",
      componentVersion: "1.0.5",
      capabilities: ["Search Validation", "Golden Core Validation", "Search Quality Gate"],
      operations: {
        "Get Status": "getSearchValidationStatus",
        "Validate": "validateSearchStrategyValidationPlatform",
        "Run Search Validation": "runSearchValidation"
      },
      statusApi: "getSearchValidationStatus",
      validatorApi: "validateSearchStrategyValidationPlatform",
      rollbackCapability: false,
      cancellationCapability: false,
      idempotency: "Conditionally Idempotent"
    },
    {
      adapterId: "IDE-160-ADAPTER-IDE-130",
      componentId: "IDE-130",
      componentVersion: "1.0.3",
      capabilities: ["Investigation", "Evidence Management", "Investigation Restore"],
      operations: {
        "Get Status": "getInvestigationWorkflowStatus",
        "Validate": "validateInvestigationWorkflow",
        "Create Investigation Request": "createInvestigationRequest",
        "Run Investigation Search": "runInvestigationSearch"
      },
      operationArgumentModes: {
        "Run Investigation Search": "session-query-options"
      },
      statusApi: "getInvestigationWorkflowStatus",
      validatorApi: "validateInvestigationWorkflow",
      rollbackCapability: true,
      cancellationCapability: true,
      idempotency: "Conditionally Idempotent"
    },
    {
      adapterId: "IDE-160-ADAPTER-IDE-135",
      componentId: "IDE-135",
      componentVersion: "1.2.4",
      capabilities: ["Investigation Validation", "Investigation Quality Gate"],
      operations: {
        "Get Status": "getInvestigationWorkflowValidationStatus",
        "Validate": "validateInvestigationWorkflowValidation",
        "Run Investigation Validation": "runInvestigationWorkflowValidation"
      },
      statusApi: "getInvestigationWorkflowValidationStatus",
      validatorApi: "validateInvestigationWorkflowValidation",
      rollbackCapability: false,
      cancellationCapability: false,
      idempotency: "Conditionally Idempotent"
    },
    {
      adapterId: "IDE-160-ADAPTER-IDE-140",
      componentId: "IDE-140",
      componentVersion: "1.2.3",
      capabilities: ["Development Analytics", "Recommendation", "Risk Analysis", "Analytics Handoff"],
      operations: {
        "Get Status": "getDevelopmentAnalyticsStatus",
        "Validate": "validateDevelopmentAnalytics",
        "Run Analytics": "runDevelopmentAnalytics"
      },
      statusApi: "getDevelopmentAnalyticsStatus",
      validatorApi: "validateDevelopmentAnalytics",
      rollbackCapability: false,
      cancellationCapability: false,
      idempotency: "Conditionally Idempotent"
    },
    {
      adapterId: "IDE-160-ADAPTER-IDE-150",
      componentId: "IDE-150",
      componentVersion: "1.2.8",
      capabilities: ["Auto Refactoring", "Controlled Mutation", "Mandatory Rollback", "Repository Restoration"],
      operations: {
        "Get Status": "getControlledAutoRefactoringApplicationStatus",
        "Validate": "validateControlledAutoRefactoringApplication",
        "Prepare Controlled Application": "prepareControlledAutoRefactoringApplication",
        "Prepare Controlled Application Async": "prepareControlledAutoRefactoringApplicationAsync",
        "Approve Controlled Application": "approveControlledAutoRefactoringApplication",
        "Execute Controlled Application": "executeControlledAutoRefactoringApplication"
      },
      operationArgumentModes: {
        "Approve Controlled Application": "session-input",
        "Execute Controlled Application": "session-input-options"
      },
      statusApi: "getControlledAutoRefactoringApplicationStatus",
      validatorApi: "validateControlledAutoRefactoringApplication",
      rollbackApi: "executeControlledAutoRefactoringApplication",
      rollbackCapability: true,
      cancellationCapability: false,
      idempotency: "Non-Idempotent",
      controlledMutation: true
    }
  ]);

  function normalizeOperations(value) {
    const source = internal.isPlainObject(value) ? value : {};
    const output = {};
    Object.keys(source).forEach(function normalizeOperation(key) {
      const name = internal.text(key, "");
      const reference = source[key];
      if (!name) return;
      if (typeof reference === "function" || internal.text(reference, "")) output[name] = reference;
    });
    return output;
  }

  function normalizeArgumentModes(value) {
    const source = internal.isPlainObject(value) ? value : {};
    const output = {};
    Object.keys(source).forEach(function normalizeMode(key) {
      const operation = internal.text(key, "");
      const mode = internal.text(source[key], "single");
      if (operation) output[operation] = mode;
    });
    return output;
  }

  function compactFunctionReference(reference) {
    if (typeof reference === "function") return reference.name || "[Function]";
    return internal.text(reference, "") || null;
  }

  function normalizeAdapter(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const adapter = {
      adapterId: internal.text(source.adapterId || source.id, internal.nextId("IDE-160-ADAPTER")),
      adapterVersion: internal.text(source.adapterVersion, "1.0.0"),
      componentId: internal.text(source.componentId, ""),
      componentVersion: internal.text(source.componentVersion, ""),
      capabilities: internal.unique(source.capabilities || source.supportedCapabilities),
      supportedOperations: internal.unique(source.supportedOperations || Object.keys(source.operations || {})),
      operations: normalizeOperations(source.operations),
      operationArgumentModes: normalizeArgumentModes(source.operationArgumentModes),
      inputContractVersion: internal.text(source.inputContractVersion, "1"),
      outputContractVersion: internal.text(source.outputContractVersion, "1"),
      statusApi: source.statusApi || null,
      validatorApi: source.validatorApi || null,
      cancelApi: source.cancelApi || null,
      rollbackApi: source.rollbackApi || null,
      rollbackCapability: source.rollbackCapability === true,
      cancellationCapability: source.cancellationCapability === true,
      idempotency: internal.text(source.idempotency, "Unknown"),
      controlledMutation: source.controlledMutation === true,
      compatibility: internal.text(source.compatibility, "Not Evaluated"),
      enabled: source.enabled !== false,
      source: internal.text(source.source, "IDE-160 Built-in Adapter"),
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      updatedAt: internal.nowIso()
    };
    adapter.supportedOperations = internal.unique(adapter.supportedOperations.concat(Object.keys(adapter.operations)));
    return adapter;
  }

  function resolveFunction(reference) {
    if (typeof reference === "function") return reference;
    const name = internal.text(reference, "");
    return name && typeof global[name] === "function" ? global[name] : null;
  }

  function validateAdapterObject(adapter) {
    const checks = [];
    function check(name, passed, detail) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, "") });
    }
    check("Adapter identity", Boolean(adapter.adapterId), adapter.adapterId);
    check("Component identity", Boolean(adapter.componentId), adapter.componentId);
    check("Component version", Boolean(adapter.componentVersion), adapter.componentVersion);
    check("Capability exists", adapter.capabilities.length > 0, "count=" + adapter.capabilities.length);
    check("Operation exists", Object.keys(adapter.operations).length > 0, "count=" + Object.keys(adapter.operations).length);
    check("Input contract version", Boolean(adapter.inputContractVersion), adapter.inputContractVersion);
    check("Output contract version", Boolean(adapter.outputContractVersion), adapter.outputContractVersion);
    check("Status API defined", Boolean(adapter.statusApi), compactFunctionReference(adapter.statusApi));
    check("Idempotency classified", ["Idempotent", "Conditionally Idempotent", "Non-Idempotent", "Unknown"].includes(adapter.idempotency), adapter.idempotency);
    if (adapter.controlledMutation) {
      check("Controlled mutation rollback", adapter.rollbackCapability === true, String(adapter.rollbackCapability));
      check("Controlled mutation non-idempotent", adapter.idempotency === "Non-Idempotent", adapter.idempotency);
    }
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      status: passed === checks.length ? "Passed" : "Failed"
    };
  }

  function evaluateAdapterAvailability(adapter) {
    const statusFunction = resolveFunction(adapter.statusApi);
    const operationNames = Object.keys(adapter.operations);
    const availableOperations = operationNames.filter(function filterOperation(name) {
      return Boolean(resolveFunction(adapter.operations[name]));
    });
    return {
      statusApiAvailable: Boolean(statusFunction),
      operationCount: operationNames.length,
      availableOperationCount: availableOperations.length,
      unavailableOperations: operationNames.filter(function filterMissing(name) {
        return !availableOperations.includes(name);
      }),
      available: Boolean(adapter.enabled && statusFunction && availableOperations.length > 0)
    };
  }

  function compactAdapter(adapter) {
    if (!adapter) return null;
    const availability = evaluateAdapterAvailability(adapter);
    const operations = {};
    Object.keys(adapter.operations).forEach(function mapOperation(name) {
      operations[name] = compactFunctionReference(adapter.operations[name]);
    });
    return {
      adapterId: adapter.adapterId,
      adapterVersion: adapter.adapterVersion,
      componentId: adapter.componentId,
      componentVersion: adapter.componentVersion,
      capabilities: internal.clone(adapter.capabilities),
      supportedOperations: internal.clone(adapter.supportedOperations),
      operations: operations,
      operationArgumentModes: internal.clone(adapter.operationArgumentModes),
      inputContractVersion: adapter.inputContractVersion,
      outputContractVersion: adapter.outputContractVersion,
      statusApi: compactFunctionReference(adapter.statusApi),
      validatorApi: compactFunctionReference(adapter.validatorApi),
      cancelApi: compactFunctionReference(adapter.cancelApi),
      rollbackApi: compactFunctionReference(adapter.rollbackApi),
      rollbackCapability: adapter.rollbackCapability,
      cancellationCapability: adapter.cancellationCapability,
      idempotency: adapter.idempotency,
      controlledMutation: adapter.controlledMutation,
      compatibility: adapter.compatibility,
      enabled: adapter.enabled,
      source: adapter.source,
      availability: availability,
      createdAt: adapter.createdAt,
      updatedAt: adapter.updatedAt
    };
  }

  function registerIDE160ComponentAdapter(input, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const adapter = normalizeAdapter(input);
    const validation = validateAdapterObject(adapter);
    if (!validation.valid) {
      return internal.buildResult(false, "ADAPTER_CONTRACT_INVALID", "Blocked", { validation: validation }, {
        error: { message: "Component Adapter Contract is invalid.", category: "Input Failure", severity: "High" }
      });
    }
    const existing = registry.get(adapter.adapterId);
    if (existing && settings.replace !== true) {
      return internal.buildResult(false, "ADAPTER_ALREADY_REGISTERED", "Blocked", {
        adapterId: adapter.adapterId,
        componentId: existing.componentId
      }, {
        error: { message: "Component Adapter is already registered.", category: "Input Failure", severity: "Medium" }
      });
    }
    const duplicateComponent = [...registry.values()].find(function findDuplicate(item) {
      return item.componentId === adapter.componentId && item.adapterId !== adapter.adapterId && item.enabled;
    });
    if (duplicateComponent && settings.allowMultipleForComponent !== true) {
      return internal.buildResult(false, "COMPONENT_ADAPTER_ALREADY_REGISTERED", "Blocked", {
        componentId: adapter.componentId,
        adapterId: duplicateComponent.adapterId
      }, {
        error: { message: "An enabled Adapter already exists for the Component.", category: "Policy Failure", severity: "Medium" }
      });
    }
    registry.set(adapter.adapterId, adapter);
    internal.touch();
    return internal.buildResult(true, existing ? "ADAPTER_REPLACED" : "ADAPTER_REGISTERED", "Ready", {
      adapter: compactAdapter(adapter),
      validation: validation
    });
  }

  function unregisterIDE160ComponentAdapter(adapterId, options) {
    const id = String(adapterId || "");
    const adapter = registry.get(id);
    if (!adapter) return internal.buildResult(false, "ADAPTER_NOT_FOUND", "Blocked", null);
    const settings = internal.isPlainObject(options) ? options : {};
    if (adapter.source === "IDE-160 Built-in Adapter" && settings.force !== true) {
      return internal.buildResult(false, "BUILT_IN_ADAPTER_PROTECTED", "Blocked", { adapterId: id });
    }
    registry.delete(id);
    internal.touch();
    return internal.buildResult(true, "ADAPTER_UNREGISTERED", "Removed", { adapterId: id, componentId: adapter.componentId });
  }

  function getIDE160ComponentAdapter(adapterId) {
    return compactAdapter(registry.get(String(adapterId || "")) || null);
  }

  function listIDE160ComponentAdapters(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    return [...registry.values()].filter(function filterAdapter(adapter) {
      if (settings.enabledOnly === true && !adapter.enabled) return false;
      if (settings.componentId && adapter.componentId !== settings.componentId) return false;
      return true;
    }).map(compactAdapter);
  }

  function findAdapterMutable(reference) {
    const id = internal.text(reference, "");
    if (registry.has(id)) return registry.get(id);
    return [...registry.values()].find(function findByComponent(adapter) {
      return adapter.componentId === id && adapter.enabled;
    }) || null;
  }

  function resolveIDE160Capability(capability, options) {
    const requested = internal.text(capability, "").toLowerCase();
    const settings = internal.isPlainObject(options) ? options : {};
    if (!requested) return null;
    const candidates = [...registry.values()].filter(function filterAdapter(adapter) {
      if (!adapter.enabled) return false;
      if (settings.componentId && adapter.componentId !== settings.componentId) return false;
      return adapter.capabilities.some(function match(item) {
        const value = String(item).toLowerCase();
        return value === requested || value.includes(requested) || requested.includes(value);
      });
    }).sort(function sortAdapters(a, b) {
      return a.componentId.localeCompare(b.componentId);
    });
    return compactAdapter(candidates[0] || null);
  }

  function checkIDE160ComponentCompatibility(adapterReference, requirement) {
    const adapter = findAdapterMutable(adapterReference);
    const expected = internal.isPlainObject(requirement) ? requirement : {};
    if (!adapter) {
      return internal.buildResult(false, "ADAPTER_NOT_FOUND", "Blocked", null, {
        error: { message: "Component Adapter not found.", category: "Dependency Failure", severity: "High" }
      });
    }
    const versionMatch = !internal.text(expected.componentVersion, "") || expected.componentVersion === adapter.componentVersion;
    const capabilityMatch = !internal.text(expected.capability, "") || adapter.capabilities.some(function match(item) {
      return String(item).toLowerCase() === String(expected.capability).toLowerCase();
    });
    const operationMatch = !internal.text(expected.operation, "") || Object.prototype.hasOwnProperty.call(adapter.operations, expected.operation);
    const availability = evaluateAdapterAvailability(adapter);
    const compatible = versionMatch && capabilityMatch && operationMatch && availability.available;
    adapter.compatibility = compatible ? "Compatible" : "Compatibility Error";
    adapter.updatedAt = internal.nowIso();
    return internal.buildResult(compatible, compatible ? "ADAPTER_COMPATIBLE" : "ADAPTER_INCOMPATIBLE", compatible ? "Compatible" : "Blocked", {
      adapter: compactAdapter(adapter),
      checks: {
        versionMatch: versionMatch,
        capabilityMatch: capabilityMatch,
        operationMatch: operationMatch,
        available: availability.available
      }
    }, compatible ? {} : {
      error: { message: "Component Adapter compatibility check failed.", category: "Dependency Failure", severity: "High" }
    });
  }

  function buildInvocationArguments(adapter, operation, request, settings) {
    const source = internal.isPlainObject(request) ? request : {};
    const mode = internal.text(adapter.operationArgumentModes && adapter.operationArgumentModes[operation], "single");
    if (mode === "query-options") {
      return [source.query != null ? source.query : request, internal.isPlainObject(source.options) ? source.options : settings];
    }
    if (mode === "conditions-options") {
      return [Array.isArray(source.conditions) ? source.conditions : request, internal.isPlainObject(source.options) ? source.options : settings];
    }
    if (mode === "session-query-options") {
      return [internal.text(source.sessionId, ""), source.query, internal.isPlainObject(source.options) ? source.options : settings];
    }
    if (mode === "session-input") {
      return [internal.text(source.sessionId, ""), source.input != null ? source.input : request];
    }
    if (mode === "session-input-options") {
      return [internal.text(source.sessionId, ""), source.input != null ? source.input : request, internal.isPlainObject(source.options) ? source.options : settings];
    }
    if (mode === "none") return [];
    return [request, settings];
  }

  function normalizeInvocationResult(adapter, operation, raw) {
    if (raw && raw.ok === false && raw.code) {
      return internal.buildResult(false, raw.code, raw.status || "Failed", {
        adapterId: adapter.adapterId,
        componentId: adapter.componentId,
        componentVersion: adapter.componentVersion,
        operation: operation,
        rawResult: internal.clone(raw)
      }, {
        warnings: raw.warnings,
        error: raw.error || { message: "Adapter operation reported failure.", category: "Execution Failure", severity: "High" },
        evidence: raw.evidence
      });
    }
    const statusText = raw && (raw.status || raw.lifecycleStatus || raw.executionStatus);
    const explicitFailure = raw && (raw.valid === false || raw.passed === false || raw.failed > 0 || statusText === "Failed");
    return internal.buildResult(!explicitFailure, explicitFailure ? "ADAPTER_OPERATION_FAILED" : "ADAPTER_OPERATION_SUCCEEDED", explicitFailure ? "Failed" : "Succeeded", {
      adapterId: adapter.adapterId,
      componentId: adapter.componentId,
      componentVersion: adapter.componentVersion,
      operation: operation,
      output: internal.clone(raw),
      outputContractVersion: adapter.outputContractVersion
    }, explicitFailure ? {
      error: { message: "Adapter operation returned a failed result.", category: "Execution Failure", severity: "High" }
    } : {});
  }

  function invokeIDE160ComponentAdapter(adapterReference, operation, request, options) {
    const adapter = findAdapterMutable(adapterReference);
    const settings = internal.isPlainObject(options) ? options : {};
    if (!adapter || !adapter.enabled) {
      return internal.buildResult(false, "ADAPTER_NOT_AVAILABLE", "Blocked", null, {
        error: { message: "Component Adapter is not available.", category: "Dependency Failure", severity: "High" }
      });
    }
    const operationName = internal.text(operation, "");
    const reference = adapter.operations[operationName] || adapter.operations.execute || adapter.operations["*"];
    const handler = resolveFunction(reference);
    if (!handler) {
      return internal.buildResult(false, "ADAPTER_OPERATION_NOT_AVAILABLE", "Blocked", {
        adapterId: adapter.adapterId,
        operation: operationName,
        functionReference: compactFunctionReference(reference)
      }, {
        error: { message: "Requested Adapter operation is unavailable.", category: "Dependency Failure", severity: "High" }
      });
    }
    if (adapter.controlledMutation && operationName === "Execute Controlled Application") {
      const approval = settings.approvalReference;
      if (!approval || approval.approved !== true) {
        return internal.buildResult(false, "COMPONENT_APPROVAL_REQUIRED", "Blocked", null, {
          error: { message: "Controlled Mutation requires Component-Level Approval.", category: "Approval Failure", severity: "High" }
        });
      }
    }
    try {
      const args = buildInvocationArguments(adapter, operationName, request, settings);
      const raw = handler.apply(global, args);
      if (raw && typeof raw.then === "function") {
        return raw.then(function resolveAsync(result) {
          return normalizeInvocationResult(adapter, operationName, result);
        }).catch(function rejectAsync(error) {
          return internal.buildResult(false, "ADAPTER_OPERATION_EXCEPTION", "Failed", null, {
            error: { message: error && error.message ? error.message : String(error), category: "Execution Failure", severity: "High" }
          });
        });
      }
      return normalizeInvocationResult(adapter, operationName, raw);
    } catch (error) {
      return internal.buildResult(false, "ADAPTER_OPERATION_EXCEPTION", "Failed", null, {
        error: { message: error && error.message ? error.message : String(error), category: "Execution Failure", severity: "High" }
      });
    }
  }

  function getIDE160AdapterRegistryStatus() {
    const adapters = listIDE160ComponentAdapters();
    const available = adapters.filter(function count(item) { return item.availability.available; }).length;
    return {
      id: "IDE-160-ADAPTER-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: adapters.length >= 8 ? "Ready" : "Degraded",
      ready: adapters.length >= 8,
      registered: adapters.length,
      available: available,
      unavailable: adapters.length - available,
      controlledMutationAdapters: adapters.filter(function count(item) { return item.controlledMutation; }).length,
      updatedAt: internal.nowIso()
    };
  }

  function registerBuiltInAdapters() {
    IDE_COMPONENT_ADAPTERS.forEach(function registerAdapter(definition) {
      if (registry.has(definition.adapterId)) return;
      registerIDE160ComponentAdapter(definition, { replace: false, allowMultipleForComponent: false });
    });
  }

  function validateWorkflowAdapter(options) {
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: internal.text(group, "Adapter") });
    }

    const testFunctionName = "__IDE160_PHASE3_ADAPTER_TEST__";
    const previousFunction = global[testFunctionName];
    const testAdapterId = "IDE-160-ADAPTER-TEST";
    const previousTestAdapter = registry.get(testAdapterId);
    global[testFunctionName] = function executeAdapterTest(query, options) {
      return { status: "Succeeded", value: query, optionLimit: options && options.limit, validationResult: { passed: true } };
    };
    try {
      check("Adapter module loaded", Boolean(namespace.modules.adapter), namespace.modules.adapter && namespace.modules.adapter.status, "Module");
      check("Built-in adapters registered", registry.size >= 8, "count=" + registry.size, "Registry");
      check("IDE-110 adapter registered", Boolean(findAdapterMutable("IDE-110")), "IDE-110", "Registry");
      check("IDE-150 adapter registered", Boolean(findAdapterMutable("IDE-150")), "IDE-150", "Registry");
      const ide150 = findAdapterMutable("IDE-150");
      check("IDE-150 controlled mutation classified", Boolean(ide150 && ide150.controlledMutation && ide150.rollbackCapability), ide150 && ide150.idempotency, "Safety");

      const invalid = registerIDE160ComponentAdapter({ componentId: "TEST-INVALID" });
      check("Invalid adapter rejected", invalid.ok === false && invalid.code === "ADAPTER_CONTRACT_INVALID", invalid.code, "Contract");

      const registered = registerIDE160ComponentAdapter({
        adapterId: testAdapterId,
        componentId: "IDE-160-TEST-COMPONENT",
        componentVersion: "1.0.0",
        capabilities: ["Phase 3 Test"],
        operations: { "Execute Test": testFunctionName },
        operationArgumentModes: { "Execute Test": "query-options" },
        statusApi: testFunctionName,
        validatorApi: testFunctionName,
        rollbackCapability: false,
        cancellationCapability: false,
        idempotency: "Idempotent",
        source: "Phase 3 Validation"
      }, { replace: true, allowMultipleForComponent: true });
      check("Valid adapter registered", registered.ok === true, registered.code, "Registry");

      const duplicate = registerIDE160ComponentAdapter({
        adapterId: testAdapterId,
        componentId: "IDE-160-TEST-COMPONENT",
        componentVersion: "1.0.0",
        capabilities: ["Phase 3 Test"],
        operations: { "Execute Test": testFunctionName },
        statusApi: testFunctionName,
        idempotency: "Idempotent"
      });
      check("Duplicate adapter rejected", duplicate.ok === false && duplicate.code === "ADAPTER_ALREADY_REGISTERED", duplicate.code, "Registry");

      const resolved = resolveIDE160Capability("Phase 3 Test");
      check("Capability resolved", Boolean(resolved && resolved.adapterId === testAdapterId), resolved && resolved.adapterId, "Capability");
      const compatible = checkIDE160ComponentCompatibility(testAdapterId, {
        componentVersion: "1.0.0",
        capability: "Phase 3 Test",
        operation: "Execute Test"
      });
      check("Adapter compatibility", compatible.ok === true, compatible.code, "Compatibility");
      const incompatible = checkIDE160ComponentCompatibility(testAdapterId, { componentVersion: "2.0.0" });
      check("Version mismatch rejected", incompatible.ok === false, incompatible.code, "Compatibility");
      const invoked = invokeIDE160ComponentAdapter(testAdapterId, "Execute Test", { query: "adapter-ok", options: { limit: 1 } });
      check("Adapter operation invoked", invoked && typeof invoked.then !== "function" && invoked.ok === true, invoked && invoked.code, "Invocation");
      check("Adapter output normalized", invoked && invoked.data && invoked.data.output && invoked.data.output.value === "adapter-ok" && invoked.data.output.optionLimit === 1, invoked && JSON.stringify(invoked.data.output), "Invocation");
      const missingOperation = invokeIDE160ComponentAdapter(testAdapterId, "Missing Operation", {});
      check("Missing operation rejected", missingOperation.ok === false && missingOperation.code === "ADAPTER_OPERATION_NOT_AVAILABLE", missingOperation.code, "Invocation");
      const status = getIDE160AdapterRegistryStatus();
      check("Adapter status lightweight", status.ready === true && Number.isFinite(status.registered), JSON.stringify(status), "Status");
    } finally {
      if (previousFunction === undefined) delete global[testFunctionName];
      else global[testFunctionName] = previousFunction;
      if (previousTestAdapter) registry.set(testAdapterId, previousTestAdapter);
      else registry.delete(testAdapterId);
    }

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const groups = {};
    checks.forEach(function groupCheck(item) {
      if (!groups[item.group]) groups[item.group] = { passed: 0, failed: 0, total: 0 };
      groups[item.group].total += 1;
      if (item.passed) groups[item.group].passed += 1;
      else groups[item.group].failed += 1;
    });
    return {
      id: internal.nextId("IDE-160-ADAPTER-VALIDATION"),
      componentId: namespace.componentId,
      version: VERSION,
      mode: internal.text(options && options.mode, "Phase 3 Component Adapter"),
      valid: failed === 0,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      status: failed === 0 ? "Passed" : "Failed",
      groups: groups,
      checks: checks,
      warnings: [],
      executedAt: internal.nowIso()
    };
  }

  registerBuiltInAdapters();

  namespace.constants.ADAPTER_STATUSES = ADAPTER_STATUSES;
  namespace.constants.IDE_COMPONENT_ADAPTER_IDS = IDE_COMPONENT_ADAPTERS.map(function mapAdapter(item) { return item.adapterId; });

  Object.assign(internal, {
    adapterRegistry: registry,
    findIDE160AdapterMutable: findAdapterMutable,
    resolveIDE160Function: resolveFunction,
    normalizeIDE160InvocationResult: normalizeInvocationResult,
    buildIDE160InvocationArguments: buildInvocationArguments,
    compactIDE160Adapter: compactAdapter
  });

  Object.assign(namespace.api, {
    registerIDE160ComponentAdapter: registerIDE160ComponentAdapter,
    unregisterIDE160ComponentAdapter: unregisterIDE160ComponentAdapter,
    getIDE160ComponentAdapter: getIDE160ComponentAdapter,
    listIDE160ComponentAdapters: listIDE160ComponentAdapters,
    resolveIDE160Capability: resolveIDE160Capability,
    checkIDE160ComponentCompatibility: checkIDE160ComponentCompatibility,
    invokeIDE160ComponentAdapter: invokeIDE160ComponentAdapter,
    getIDE160AdapterRegistryStatus: getIDE160AdapterRegistryStatus,
    validateWorkflowAdapter: validateWorkflowAdapter
  });

  namespace.modules.adapter = {
    id: "IDE-160-ADAPTER",
    version: VERSION,
    status: "Ready",
    registeredAdapterCount: registry.size,
    builtInAdapterCount: IDE_COMPONENT_ADAPTERS.length,
    loadedAt: internal.nowIso()
  };

  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);