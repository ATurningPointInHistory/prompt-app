/* ============================================================
   FILE: 13_ai_development_workflow_core.js
   IDE-160 AI Development Workflow
   Version: 1.1.0
   Phase: 2 - Workflow Planning
   Design Freeze: 2026-08-04
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-160";
  const COMPONENT_NAME = "AI Development Workflow";
  const VERSION = "1.1.0";
  const SCHEMA_VERSION = 1;
  const ARCHITECTURE_VERSION = "1.0";
  const DESIGN_FREEZE_VERSION = "1.0";
  const IMPLEMENTATION_PHASE = "Phase 2 - Workflow Planning";
  const MAX_ACTIVE_WORKFLOWS = 1;
  const MAX_DEFINITIONS = 50;
  const MAX_WORKFLOW_SUMMARIES = 5;

  const namespace = global.AIPromptOSIDE160 && typeof global.AIPromptOSIDE160 === "object"
    ? global.AIPromptOSIDE160
    : {};

  const internal = namespace.__internal && typeof namespace.__internal === "object"
    ? namespace.__internal
    : {};

  const state = internal.state && typeof internal.state === "object"
    ? internal.state
    : {
        definitions: new Map(),
        workflows: new Map(),
        activeWorkflowId: null,
        sequence: 0,
        initialized: false,
        loaded: false,
        lastPersistence: null,
        lastValidation: null,
        lastError: null,
        updatedAt: null
      };

  function nowIso() {
    return new Date().toISOString();
  }

  function text(value, fallback) {
    const result = String(value == null ? "" : value).trim();
    return result || String(fallback == null ? "" : fallback);
  }

  function asArray(value) {
    return Array.isArray(value) ? value : value == null ? [] : [value];
  }

  function unique(values) {
    return [...new Set(asArray(values).filter(function filterValue(item) {
      return item != null && String(item).trim() !== "";
    }).map(function mapValue(item) {
      return String(item).trim();
    }))];
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function nextId(prefix) {
    state.sequence += 1;
    return String(prefix || "IDE-160") + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }

  function touch() {
    state.updatedAt = nowIso();
  }

  function buildResult(ok, code, status, data, options) {
    const settings = isPlainObject(options) ? options : {};
    return {
      ok: ok === true,
      id: settings.id || nextId("IDE-160-RESULT"),
      code: text(code, ok ? "OK" : "ERROR"),
      status: text(status, ok ? "Succeeded" : "Failed"),
      data: data == null ? null : clone(data),
      warnings: asArray(settings.warnings).map(String),
      error: settings.error ? clone(settings.error) : null,
      evidence: asArray(settings.evidence).map(function mapEvidence(item) { return clone(item); }),
      createdAt: nowIso()
    };
  }

  function setError(error, code) {
    const item = {
      code: text(code, "IDE160_ERROR"),
      message: error && error.message ? error.message : String(error || "Unknown error"),
      at: nowIso()
    };
    state.lastError = item;
    touch();
    return item;
  }

  function normalizeScope(value) {
    if (typeof value === "string") {
      const scopeText = text(value, "");
      return scopeText ? { description: scopeText } : null;
    }
    return isPlainObject(value) ? clone(value) : null;
  }

  function normalizeWorkflowDefinition(input) {
    const source = isPlainObject(input) ? input : {};
    const createdAt = text(source.createdAt, nowIso());
    const definition = {
      workflowDefinitionId: text(source.workflowDefinitionId || source.id, nextId("IDE-160-DEFINITION")),
      workflowDefinitionVersion: text(source.workflowDefinitionVersion || source.version, "1.0.0"),
      name: text(source.name || source.title, "AI Development Workflow"),
      goal: text(source.goal, ""),
      scope: normalizeScope(source.scope),
      excludedScope: normalizeScope(source.excludedScope) || {},
      requiredComponents: unique(source.requiredComponents),
      requiredCapabilities: unique(source.requiredCapabilities),
      inputContract: isPlainObject(source.inputContract) ? clone(source.inputContract) : {},
      requiredEvidence: unique(source.requiredEvidence),
      requiredPolicies: unique(source.requiredPolicies || source.requiredPolicy),
      executionRequirement: isPlainObject(source.executionRequirement) ? clone(source.executionRequirement) : {},
      approvalRequirement: isPlainObject(source.approvalRequirement) ? clone(source.approvalRequirement) : {},
      monitoringRequirement: isPlainObject(source.monitoringRequirement) ? clone(source.monitoringRequirement) : {},
      completionRequirement: isPlainObject(source.completionRequirement) ? clone(source.completionRequirement) : {},
      repositoryBaseline: isPlainObject(source.repositoryBaseline) ? clone(source.repositoryBaseline) : {},
      handoffTarget: text(source.handoffTarget, "IDE-170"),
      status: text(source.status, "Draft"),
      createdBy: text(source.createdBy || source.actor, "Project Owner"),
      createdAt: createdAt,
      updatedAt: nowIso()
    };
    return definition;
  }

  function validateWorkflowDefinition(input) {
    const source = normalizeWorkflowDefinition(input);
    const checks = [];
    function check(name, passed, detail) {
      checks.push({ name: name, passed: passed === true, detail: text(detail, "") });
    }

    check("Definition identity", Boolean(source.workflowDefinitionId), source.workflowDefinitionId);
    check("Definition version", Boolean(source.workflowDefinitionVersion), source.workflowDefinitionVersion);
    check("Goal defined", Boolean(source.goal), source.goal);
    check("Scope defined", Boolean(source.scope && Object.keys(source.scope).length), source.scope && source.scope.description);
    check("Input contract defined", isPlainObject(source.inputContract), "Input Contract");
    check("Approval requirement defined", isPlainObject(source.approvalRequirement), "Approval Requirement");
    check("Monitoring requirement defined", isPlainObject(source.monitoringRequirement), "Monitoring Requirement");
    check("Completion requirement defined", isPlainObject(source.completionRequirement), "Completion Requirement");
    check("Handoff target defined", Boolean(source.handoffTarget), source.handoffTarget);

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      definition: source
    };
  }

  function createWorkflowDefinition(input, options) {
    const settings = isPlainObject(options) ? options : {};
    const validation = validateWorkflowDefinition(input);
    if (!validation.valid) {
      return buildResult(false, "WORKFLOW_DEFINITION_INVALID", "Blocked", {
        validation: validation
      }, {
        error: {
          message: "Workflow Definition is incomplete.",
          category: "Input Failure",
          severity: "High"
        }
      });
    }

    const definition = validation.definition;
    const exists = state.definitions.has(definition.workflowDefinitionId);
    if (exists && settings.replace !== true) {
      return buildResult(false, "WORKFLOW_DEFINITION_EXISTS", "Blocked", null, {
        error: {
          message: "Workflow Definition already exists.",
          category: "Input Failure",
          severity: "Medium"
        }
      });
    }
    if (!exists && state.definitions.size >= MAX_DEFINITIONS) {
      return buildResult(false, "WORKFLOW_DEFINITION_LIMIT", "Blocked", null, {
        error: {
          message: "Workflow Definition limit reached.",
          category: "Persistence Failure",
          severity: "Medium"
        }
      });
    }

    definition.status = "Ready";
    if (exists) definition.createdAt = state.definitions.get(definition.workflowDefinitionId).createdAt;
    definition.updatedAt = nowIso();
    state.definitions.set(definition.workflowDefinitionId, clone(definition));
    touch();
    persistRuntimeIfAvailable();
    return buildResult(true, exists ? "WORKFLOW_DEFINITION_REPLACED" : "WORKFLOW_DEFINITION_CREATED", "Ready", {
      definition: definition,
      validation: validation
    });
  }

  function getWorkflowDefinition(id) {
    return clone(state.definitions.get(String(id || "")) || null);
  }

  function listWorkflowDefinitions() {
    return [...state.definitions.values()].map(clone);
  }

  function createInitialAttempt(workflowId, options) {
    const settings = isPlainObject(options) ? options : {};
    const createdAt = nowIso();
    return {
      attemptId: text(settings.attemptId, nextId("IDE-160-ATTEMPT")),
      workflowId: workflowId,
      sequence: 1,
      reason: text(settings.reason, "Initial Attempt"),
      targetPhase: "Definition",
      phasesEntered: ["Definition"],
      status: "Active",
      createdAt: createdAt,
      updatedAt: createdAt
    };
  }

  function createRuntimeContext(workflowId, definition, attempt) {
    const timestamp = nowIso();
    return {
      contextId: nextId("IDE-160-CONTEXT"),
      contextVersion: 1,
      revisionId: nextId("IDE-160-CONTEXT-REVISION"),
      revisionNumber: 1,
      workflowId: workflowId,
      workflowVersion: "1.0.0",
      attemptId: attempt.attemptId,
      currentPhase: "Definition",
      currentStatus: "Ready",
      definitionReference: {
        id: definition.workflowDefinitionId,
        version: definition.workflowDefinitionVersion
      },
      planningReference: null,
      executionReference: null,
      decisionReference: null,
      approvalReferences: [],
      monitoringReference: null,
      packageReference: null,
      completionReference: null,
      baselineReference: null,
      failureReferences: [],
      recoveryReferences: [],
      metrics: {},
      timeline: [{ type: "Workflow Created", at: timestamp }],
      remainingRisk: [],
      unresolvedItems: [],
      traceability: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function createWorkflow(definitionId, input, options) {
    const settings = isPlainObject(options) ? options : {};
    const definition = state.definitions.get(String(definitionId || ""));
    if (!definition) {
      return buildResult(false, "WORKFLOW_DEFINITION_NOT_FOUND", "Blocked", null, {
        error: {
          message: "Workflow Definition not found.",
          category: "Input Failure",
          severity: "High"
        }
      });
    }
    if (state.activeWorkflowId && state.workflows.has(state.activeWorkflowId)) {
      return buildResult(false, "ACTIVE_WORKFLOW_LIMIT", "Blocked", {
        activeWorkflowId: state.activeWorkflowId,
        maximum: MAX_ACTIVE_WORKFLOWS
      }, {
        error: {
          message: "Only one active IDE-160 Workflow is allowed.",
          category: "Policy Failure",
          severity: "High"
        }
      });
    }

    const workflowId = text(settings.workflowId, nextId("IDE-160-WORKFLOW"));
    const attempt = createInitialAttempt(workflowId, settings);
    const timestamp = nowIso();
    const workflow = {
      identity: {
        workflowId: workflowId,
        workflowVersion: "1.0.0",
        componentId: COMPONENT_ID,
        componentVersion: VERSION,
        projectId: text(settings.projectId, "AI-PROMPT-OS"),
        createdBy: text(settings.actor, "Project Owner")
      },
      definition: clone(definition),
      input: clone(input || {}),
      state: {
        primaryPhase: "Definition",
        controlStatus: "Ready",
        previousPhase: null,
        previousStatus: null,
        lastTransitionId: null,
        stateVersion: 1,
        enteredAt: timestamp,
        updatedAt: timestamp
      },
      currentAttempt: attempt,
      attempts: [attempt],
      planning: null,
      execution: null,
      decision: null,
      approval: null,
      monitoring: null,
      context: createRuntimeContext(workflowId, definition, attempt),
      package: null,
      completion: null,
      baseline: null,
      failures: [],
      recoveries: [],
      metrics: {},
      timeline: [{ type: "Workflow Created", at: timestamp }],
      traceability: [],
      status: "Created",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    state.workflows.set(workflowId, workflow);
    state.activeWorkflowId = workflowId;
    touch();
    const persistence = persistRuntimeIfAvailable();
    return buildResult(true, "WORKFLOW_CREATED", "Created", {
      workflow: exportWorkflow(workflow),
      persistence: persistence
    });
  }

  function getWorkflow(id) {
    return exportWorkflow(state.workflows.get(String(id || "")) || null);
  }

  function listWorkflows() {
    return [...state.workflows.values()].map(exportWorkflow);
  }

  function exportWorkflow(workflow) {
    return workflow ? clone(workflow) : null;
  }

  function startWorkflow(workflowId, options) {
    const workflow = state.workflows.get(String(workflowId || ""));
    if (!workflow) {
      return buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null, {
        error: { message: "Workflow not found.", category: "Input Failure", severity: "High" }
      });
    }
    if (!namespace.modules || !namespace.modules.state || typeof namespace.api.transitionWorkflowState !== "function") {
      return buildResult(false, "STATE_MODULE_NOT_READY", "Blocked", null, {
        error: { message: "IDE-160 State Module is not ready.", category: "Dependency Failure", severity: "High" }
      });
    }
    const evidence = [{ type: "Workflow Definition", id: workflow.definition.workflowDefinitionId }];
    const transitions = [
      {
        fromPhase: "Definition",
        fromStatus: "Ready",
        toPhase: "Definition",
        toStatus: "Running",
        attemptId: workflow.currentAttempt.attemptId,
        reasonCode: "WORKFLOW_START",
        evidenceReferences: evidence,
        actor: text(options && options.actor, "Project Owner"),
        sourceComponent: COMPONENT_ID
      },
      {
        fromPhase: "Definition",
        fromStatus: "Running",
        toPhase: "Definition",
        toStatus: "Succeeded",
        attemptId: workflow.currentAttempt.attemptId,
        reasonCode: "DEFINITION_VALIDATED",
        evidenceReferences: evidence,
        actor: "IDE-160",
        sourceComponent: COMPONENT_ID
      },
      {
        fromPhase: "Definition",
        fromStatus: "Succeeded",
        toPhase: "Planning",
        toStatus: "Ready",
        attemptId: workflow.currentAttempt.attemptId,
        reasonCode: "ENTER_PLANNING",
        evidenceReferences: evidence,
        actor: "IDE-160",
        sourceComponent: COMPONENT_ID
      }
    ];

    const results = [];
    for (let index = 0; index < transitions.length; index += 1) {
      const result = namespace.api.transitionWorkflowState(workflowId, transitions[index]);
      results.push(result);
      if (!result || result.ok !== true) {
        return buildResult(false, "WORKFLOW_START_FAILED", "Failed", { transitions: results }, {
          error: { message: "Workflow start transition failed.", category: "System Failure", severity: "High" }
        });
      }
    }
    workflow.status = "Running";
    workflow.updatedAt = nowIso();
    touch();
    persistRuntimeIfAvailable();
    return buildResult(true, "WORKFLOW_STARTED", "Running", {
      workflow: exportWorkflow(workflow),
      transitions: results
    });
  }

  function requestWorkflowCancellation(workflowId, options) {
    if (!namespace.api || typeof namespace.api.requestWorkflowCancellationState !== "function") {
      return buildResult(false, "STATE_MODULE_NOT_READY", "Blocked", null, {
        error: { message: "Cancellation requires the State Module.", category: "Dependency Failure", severity: "High" }
      });
    }
    return namespace.api.requestWorkflowCancellationState(workflowId, options || {});
  }

  function closeWorkflow(workflowId, finalStatus) {
    const workflow = state.workflows.get(String(workflowId || ""));
    if (!workflow) return false;
    workflow.status = text(finalStatus, "Closed");
    workflow.updatedAt = nowIso();
    if (state.activeWorkflowId === workflowId) state.activeWorkflowId = null;
    touch();
    persistRuntimeIfAvailable();
    return true;
  }

  function exportRuntimeState() {
    const workflows = [...state.workflows.values()].map(exportWorkflow);
    const definitions = [...state.definitions.values()].map(clone);
    return {
      schemaVersion: SCHEMA_VERSION,
      componentId: COMPONENT_ID,
      version: VERSION,
      activeWorkflowId: state.activeWorkflowId,
      sequence: state.sequence,
      definitions: definitions,
      workflows: workflows.slice(Math.max(0, workflows.length - MAX_WORKFLOW_SUMMARIES)),
      updatedAt: state.updatedAt || nowIso()
    };
  }

  function importRuntimeState(payload) {
    if (!isPlainObject(payload) || payload.componentId !== COMPONENT_ID) {
      return buildResult(false, "RUNTIME_IMPORT_INVALID", "Blocked", null, {
        error: { message: "Invalid IDE-160 Runtime payload.", category: "Persistence Failure", severity: "High" }
      });
    }
    state.definitions.clear();
    asArray(payload.definitions).forEach(function restoreDefinition(item) {
      if (item && item.workflowDefinitionId) state.definitions.set(String(item.workflowDefinitionId), clone(item));
    });
    state.workflows.clear();
    asArray(payload.workflows).forEach(function restoreWorkflow(item) {
      const workflowId = item && item.identity && item.identity.workflowId;
      if (workflowId) state.workflows.set(String(workflowId), clone(item));
    });
    state.activeWorkflowId = payload.activeWorkflowId && state.workflows.has(payload.activeWorkflowId)
      ? payload.activeWorkflowId
      : null;
    state.sequence = Math.max(Number(payload.sequence) || 0, state.sequence);
    state.loaded = true;
    touch();
    return buildResult(true, "RUNTIME_IMPORTED", "Loaded", {
      definitionCount: state.definitions.size,
      workflowCount: state.workflows.size,
      activeWorkflowId: state.activeWorkflowId
    });
  }

  function persistRuntimeIfAvailable() {
    if (namespace.modules && namespace.modules.storage && typeof namespace.api.persistWorkflowRuntime === "function") {
      try {
        const result = namespace.api.persistWorkflowRuntime();
        state.lastPersistence = clone(result);
        return result;
      } catch (error) {
        setError(error, "RUNTIME_PERSIST_FAILED");
        return { ok: false, code: "RUNTIME_PERSIST_FAILED", error: error && error.message ? error.message : String(error) };
      }
    }
    return { ok: false, code: "STORAGE_MODULE_NOT_READY", status: "Not Available" };
  }

  function initializeAIDevelopmentWorkflow(options) {
    const settings = isPlainObject(options) ? options : {};
    if (state.initialized && settings.force !== true) {
      return buildResult(true, "IDE160_ALREADY_INITIALIZED", "Ready", getAIDevelopmentWorkflowStatus());
    }

    try {
      let loadResult = { ok: false, status: "Storage Module Not Ready" };
      if (namespace.modules && namespace.modules.storage && typeof namespace.api.loadWorkflowRuntime === "function") {
        loadResult = namespace.api.loadWorkflowRuntime();
      }
      state.initialized = true;
      state.loaded = true;
      state.lastError = null;
      touch();
      return buildResult(true, "IDE160_INITIALIZED", "Ready", {
        componentId: COMPONENT_ID,
        version: VERSION,
        implementationPhase: IMPLEMENTATION_PHASE,
        loadResult: loadResult,
        status: getAIDevelopmentWorkflowStatus()
      });
    } catch (error) {
      const errorRecord = setError(error, "IDE160_INITIALIZATION_FAILED");
      return buildResult(false, "IDE160_INITIALIZATION_FAILED", "Failed", null, {
        error: { message: errorRecord.message, category: "System Failure", severity: "High" }
      });
    }
  }

  function getAIDevelopmentWorkflowStatus() {
    const moduleStatus = {
      core: Boolean(namespace.modules && namespace.modules.core),
      storage: Boolean(namespace.modules && namespace.modules.storage),
      state: Boolean(namespace.modules && namespace.modules.state),
      planning: Boolean(namespace.modules && namespace.modules.planning)
    };
    const active = state.activeWorkflowId ? state.workflows.get(state.activeWorkflowId) : null;
    const validation = state.lastValidation;
    return {
      id: "IDE-160-STATUS",
      componentId: COMPONENT_ID,
      name: COMPONENT_NAME,
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      architectureVersion: ARCHITECTURE_VERSION,
      designFreezeVersion: DESIGN_FREEZE_VERSION,
      implementationPhase: IMPLEMENTATION_PHASE,
      implementationStatus: moduleStatus.planning ? "Phase 2 Implemented" : "Phase 1 Implemented",
      status: state.lastError ? "Degraded" : state.initialized ? "Ready" : "Loaded",
      ready: Boolean(state.initialized && moduleStatus.core && moduleStatus.storage && moduleStatus.state && moduleStatus.planning && !state.lastError),
      available: true,
      initialized: state.initialized === true,
      modules: moduleStatus,
      definitionCount: state.definitions.size,
      workflowCount: state.workflows.size,
      currentWorkflowId: active && active.identity.workflowId || null,
      currentAttemptId: active && active.currentAttempt.attemptId || null,
      primaryPhase: active && active.state.primaryPhase || null,
      controlStatus: active && active.state.controlStatus || null,
      validationStatus: validation ? validation.status : "Not Run",
      health: validation && Number.isFinite(validation.health) ? validation.health : null,
      healthStatus: validation && Number.isFinite(validation.health) ? "Measured" : "Not Run",
      repositoryIntegrity: "Not Evaluated in Phase 2",
      persistentCommitAllowed: false,
      zipFileMutationAllowed: false,
      lastPersistence: clone(state.lastPersistence),
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt || nowIso()
    };
  }

  function validateAIDevelopmentWorkflow(options) {
    const settings = isPlainObject(options) ? options : {};
    const results = [];
    if (namespace.api && typeof namespace.api.validateWorkflowFoundation === "function") {
      results.push({ name: "Foundation", result: namespace.api.validateWorkflowFoundation(settings) });
    }
    if (namespace.api && typeof namespace.api.validateWorkflowPlanning === "function") {
      results.push({ name: "Planning", result: namespace.api.validateWorkflowPlanning(settings) });
    }
    if (!results.length) {
      const notRun = {
        id: nextId("IDE-160-VALIDATION"),
        componentId: COMPONENT_ID,
        version: VERSION,
        valid: false,
        passed: 0,
        failed: 0,
        total: 0,
        health: null,
        status: "Not Run",
        groups: {},
        checks: [],
        phases: {},
        warnings: ["IDE-160 Validation Modules are not ready."],
        executedAt: null
      };
      state.lastValidation = clone(notRun);
      return notRun;
    }

    const checks = [];
    const groups = {};
    const phases = {};
    let passed = 0;
    let failed = 0;
    let total = 0;
    const warnings = [];
    results.forEach(function mergeValidation(item) {
      const result = item.result || {};
      phases[item.name] = clone(result);
      passed += Number(result.passed) || 0;
      failed += Number(result.failed) || 0;
      total += Number(result.total) || 0;
      asArray(result.warnings).forEach(function addWarning(warning) { warnings.push(String(warning)); });
      asArray(result.checks).forEach(function addCheck(check) {
        const copy = clone(check) || {};
        copy.phase = item.name;
        checks.push(copy);
      });
      Object.keys(result.groups || {}).forEach(function mergeGroup(groupName) {
        const key = item.name + " / " + groupName;
        groups[key] = clone(result.groups[groupName]);
      });
    });
    const overall = {
      id: nextId("IDE-160-VALIDATION"),
      componentId: COMPONENT_ID,
      version: VERSION,
      mode: text(settings.mode, "Phase 2 Integrated Validation"),
      valid: failed === 0 && total > 0,
      passed: passed,
      failed: failed,
      total: total,
      health: total ? Number(((passed / total) * 100).toFixed(2)) : null,
      status: failed === 0 && total > 0 ? "Passed" : "Failed",
      groups: groups,
      phases: phases,
      checks: checks,
      warnings: unique(warnings),
      executedAt: nowIso()
    };
    state.lastValidation = clone(overall);
    touch();
    return overall;
  }

  function showAIDevelopmentWorkflow() {
    return buildResult(false, "IDE160_UI_NOT_IMPLEMENTED", "Not Available", {
      implementationPhase: IMPLEMENTATION_PHASE,
      status: getAIDevelopmentWorkflowStatus()
    }, {
      warnings: ["IDE-160 Mobile UI is scheduled for Implementation Phase 8."],
      error: { message: "IDE-160 UI is not implemented in Phase 1.", category: "Dependency Failure", severity: "Low" }
    });
  }

  function getAIDevelopmentWorkflowPublicApi() {
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      namespace: "window.AIPromptOSIDE160",
      globals: [
        "initializeAIDevelopmentWorkflow",
        "getAIDevelopmentWorkflowStatus",
        "validateAIDevelopmentWorkflow",
        "showAIDevelopmentWorkflow",
        "getAIDevelopmentWorkflowPublicApi"
      ],
      namespaceFunctions: Object.keys(namespace.api || {}).sort()
    };
  }

  namespace.componentId = COMPONENT_ID;
  namespace.name = COMPONENT_NAME;
  namespace.version = VERSION;
  namespace.schemaVersion = SCHEMA_VERSION;
  namespace.architectureVersion = ARCHITECTURE_VERSION;
  namespace.designFreezeVersion = DESIGN_FREEZE_VERSION;
  namespace.implementationPhase = IMPLEMENTATION_PHASE;
  namespace.constants = namespace.constants || {};
  namespace.modules = namespace.modules || {};
  namespace.adapters = namespace.adapters || {};
  namespace.runtime = namespace.runtime || {};
  namespace.api = namespace.api || {};
  namespace.status = namespace.status || {};
  namespace.__internal = internal;

  Object.assign(internal, {
    state: state,
    nowIso: nowIso,
    text: text,
    asArray: asArray,
    unique: unique,
    clone: clone,
    isPlainObject: isPlainObject,
    nextId: nextId,
    touch: touch,
    buildResult: buildResult,
    setError: setError,
    exportWorkflow: exportWorkflow,
    exportRuntimeState: exportRuntimeState,
    importRuntimeState: importRuntimeState,
    persistRuntimeIfAvailable: persistRuntimeIfAvailable,
    closeWorkflow: closeWorkflow,
    limits: {
      maximumActiveWorkflows: MAX_ACTIVE_WORKFLOWS,
      maximumDefinitions: MAX_DEFINITIONS,
      maximumWorkflowSummaries: MAX_WORKFLOW_SUMMARIES
    }
  });

  Object.assign(namespace.constants, {
    COMPONENT_ID: COMPONENT_ID,
    COMPONENT_NAME: COMPONENT_NAME,
    VERSION: VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    ARCHITECTURE_VERSION: ARCHITECTURE_VERSION,
    DESIGN_FREEZE_VERSION: DESIGN_FREEZE_VERSION,
    IMPLEMENTATION_PHASE: IMPLEMENTATION_PHASE
  });

  Object.assign(namespace.api, {
    createWorkflowDefinition: createWorkflowDefinition,
    getWorkflowDefinition: getWorkflowDefinition,
    listWorkflowDefinitions: listWorkflowDefinitions,
    validateWorkflowDefinition: validateWorkflowDefinition,
    createWorkflow: createWorkflow,
    getWorkflow: getWorkflow,
    listWorkflows: listWorkflows,
    startWorkflow: startWorkflow,
    requestWorkflowCancellation: requestWorkflowCancellation,
    getAIDevelopmentWorkflowStatus: getAIDevelopmentWorkflowStatus,
    initializeAIDevelopmentWorkflow: initializeAIDevelopmentWorkflow,
    validateAIDevelopmentWorkflow: validateAIDevelopmentWorkflow,
    getAIDevelopmentWorkflowPublicApi: getAIDevelopmentWorkflowPublicApi
  });

  namespace.modules.core = {
    id: "IDE-160-CORE",
    version: VERSION,
    status: "Ready",
    loadedAt: nowIso()
  };

  global.AIPromptOSIDE160 = namespace;
  global.initializeAIDevelopmentWorkflow = initializeAIDevelopmentWorkflow;
  global.getAIDevelopmentWorkflowStatus = getAIDevelopmentWorkflowStatus;
  global.validateAIDevelopmentWorkflow = validateAIDevelopmentWorkflow;
  global.showAIDevelopmentWorkflow = showAIDevelopmentWorkflow;
  global.getAIDevelopmentWorkflowPublicApi = getAIDevelopmentWorkflowPublicApi;
})(typeof window !== "undefined" ? window : globalThis);