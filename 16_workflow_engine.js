/* ===============================
   FILE: 16_workflow_engine.js
   Workflow Engine
   ENGINE-060
   Version: 1.1.0
=============================== */

var WORKFLOW_ENGINE_ID = "ENGINE-060";
var WORKFLOW_ENGINE_TITLE = "Workflow Engine";
var WORKFLOW_ENGINE_VERSION = "1.1.0";
var WORKFLOW_DEFINITION_LIMIT = 200;
var WORKFLOW_INSTANCE_LIMIT = 500;
var WORKFLOW_HISTORY_LIMIT = 500;
var WORKFLOW_DEFAULT_TIMEOUT = 30000;

var WORKFLOW_STATES = ["Created", "Waiting", "Running", "Paused", "Completed", "Cancelled", "Failed"];
var WORKFLOW_STEP_STATES = ["Pending", "Running", "Completed", "Skipped", "Retrying", "Failed"];
var WORKFLOW_EVENTS = [
  "WorkflowCreated", "WorkflowStarted", "BeforeStep", "AfterStep",
  "StepCompleted", "StepFailed", "WorkflowPaused", "WorkflowResumed",
  "WorkflowCancelled", "WorkflowCompleted", "WorkflowFailed"
];

var workflowDefinitions = typeof workflowDefinitions !== "undefined" && workflowDefinitions instanceof Map
  ? workflowDefinitions : new Map();
var workflowInstances = typeof workflowInstances !== "undefined" && workflowInstances instanceof Map
  ? workflowInstances : new Map();
var workflowQueue = typeof workflowQueue !== "undefined" && Array.isArray(workflowQueue)
  ? workflowQueue : [];
var workflowHistory = typeof workflowHistory !== "undefined" && Array.isArray(workflowHistory)
  ? workflowHistory : [];
var workflowListeners = typeof workflowListeners !== "undefined" && workflowListeners instanceof Map
  ? workflowListeners : new Map();
var workflowSequence = typeof workflowSequence === "number" ? workflowSequence : 0;
var workflowInstanceSequence = typeof workflowInstanceSequence === "number" ? workflowInstanceSequence : 0;
var workflowMetrics = typeof workflowMetrics !== "undefined" && workflowMetrics
  ? workflowMetrics : {
      totalWorkflowCount: 0,
      runningWorkflowCount: 0,
      completedWorkflowCount: 0,
      failedWorkflowCount: 0,
      cancelledWorkflowCount: 0,
      totalExecutionTime: 0,
      totalStepTime: 0,
      executedStepCount: 0,
      retryCount: 0,
      errorCount: 0,
      reasoningExecutions: 0,
      reasoningFailures: 0,
      totalReasoningTime: 0,
      lastReasoningAt: null,
      lastExecutionAt: null
    };

["reasoningExecutions", "reasoningFailures", "totalReasoningTime"].forEach(function(key) {
  if (typeof workflowMetrics[key] !== "number") workflowMetrics[key] = 0;
});
if (!("lastReasoningAt" in workflowMetrics)) workflowMetrics.lastReasoningAt = null;

function createWorkflowTimestamp() { return new Date().toISOString(); }
function cloneWorkflowValue(value) {
  if (value == null) return value;
  try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); }
}
function normalizeWorkflowObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? cloneWorkflowValue(value) : {};
}
function normalizeWorkflowList(value) {
  return Array.isArray(value) ? cloneWorkflowValue(value) : value == null ? [] : [cloneWorkflowValue(value)];
}
function createWorkflowInstanceId() {
  workflowInstanceSequence += 1;
  return "WF-INSTANCE-" + String(workflowInstanceSequence).padStart(6, "0");
}
function createWorkflowHistoryId() {
  workflowSequence += 1;
  return "WF-HISTORY-" + String(workflowSequence).padStart(6, "0");
}
function createWorkflowError(code, message, details) {
  return { code: String(code || "WF-008"), message: String(message || "Workflow execution failed"), details: cloneWorkflowValue(details || null) };
}
function exportWorkflowDefinition(definition) { return definition ? cloneWorkflowValue(definition) : null; }
function exportWorkflowInstance(instance) { return instance ? cloneWorkflowValue(instance) : null; }

function validateWorkflowDefinition(definition) {
  var errors = [];
  var warnings = [];
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    errors.push("Workflow definition must be an object");
  } else {
    if (!String(definition.id || "").trim()) errors.push("Workflow id is required");
    if (!String(definition.name || "").trim()) errors.push("Workflow name is required");
    if (!String(definition.version || "").trim()) errors.push("Workflow version is required");
    if (!Array.isArray(definition.steps) || definition.steps.length === 0) errors.push("Workflow steps are required");
    if (Array.isArray(definition.steps)) {
      var ids = new Set();
      definition.steps.forEach(function(step, index) {
        if (!step || typeof step !== "object") { errors.push("Step " + index + " must be an object"); return; }
        var stepId = String(step.id || "").trim();
        if (!stepId) errors.push("Step " + index + " id is required");
        if (ids.has(stepId)) errors.push("Duplicate step id: " + stepId);
        ids.add(stepId);
        if (!String(step.engine || "").trim()) errors.push("Step " + stepId + " engine is required");
        if (!String(step.action || "execute").trim()) errors.push("Step " + stepId + " action is required");
        if (step.retry && Number(step.retry.limit || 0) < 0) errors.push("Step " + stepId + " retry limit is invalid");
      });
    }
    if (definition.timeout != null && Number(definition.timeout) <= 0) errors.push("Workflow timeout must be positive");
    if (definition.enabled === false) warnings.push("Workflow definition is disabled");
  }
  return { valid: errors.length === 0, errors: errors, warnings: warnings };
}

function normalizeWorkflowDefinition(definition) {
  var now = createWorkflowTimestamp();
  return {
    id: String(definition.id).trim(),
    name: String(definition.name).trim(),
    version: String(definition.version).trim(),
    description: String(definition.description || ""),
    metadata: normalizeWorkflowObject(definition.metadata),
    inputSchema: cloneWorkflowValue(definition.inputSchema || null),
    outputSchema: cloneWorkflowValue(definition.outputSchema || null),
    steps: definition.steps.map(function(step, index) {
      return {
        id: String(step.id).trim(),
        name: String(step.name || step.id).trim(),
        engine: String(step.engine).trim(),
        action: String(step.action || "execute").trim(),
        input: cloneWorkflowValue(step.input),
        output: cloneWorkflowValue(step.output),
        condition: step.condition == null ? true : cloneWorkflowValue(step.condition),
        timeout: Number(step.timeout) > 0 ? Number(step.timeout) : WORKFLOW_DEFAULT_TIMEOUT,
        retry: {
          limit: Math.max(0, Number(step.retry && step.retry.limit) || 0),
          delay: Math.max(0, Number(step.retry && step.retry.delay) || 0)
        },
        next: step.next == null ? (definition.steps[index + 1] ? String(definition.steps[index + 1].id) : null) : String(step.next)
      };
    }),
    timeout: Number(definition.timeout) > 0 ? Number(definition.timeout) : WORKFLOW_DEFAULT_TIMEOUT,
    rules: normalizeWorkflowObject(definition.rules),
    enabled: definition.enabled !== false,
    createdAt: definition.createdAt || now,
    updatedAt: now
  };
}

function registerWorkflowDefinition(definition, options) {
  options = options || {};
  var check = validateWorkflowDefinition(definition);
  if (!check.valid) return { registered: false, id: definition && definition.id || "", errors: check.errors, warnings: check.warnings };
  var id = String(definition.id).trim();
  var exists = workflowDefinitions.has(id);
  if (exists && options.replace !== true) return { registered: false, id: id, errors: ["Workflow definition already exists"], warnings: [] };
  if (!exists && workflowDefinitions.size >= WORKFLOW_DEFINITION_LIMIT) return { registered: false, id: id, errors: ["Workflow definition limit reached"], warnings: [] };
  var normalized = normalizeWorkflowDefinition(definition);
  if (exists) normalized.createdAt = workflowDefinitions.get(id).createdAt;
  workflowDefinitions.set(id, normalized);
  return { registered: true, replaced: exists, id: id, version: normalized.version, warnings: check.warnings };
}
function updateWorkflowDefinition(definition) { return registerWorkflowDefinition(definition, { replace: true }); }
function removeWorkflowDefinition(id) { return workflowDefinitions.delete(String(id || "").trim()); }
function getWorkflowDefinition(id) { return exportWorkflowDefinition(workflowDefinitions.get(String(id || "").trim())); }
function listWorkflowDefinitions(options) {
  options = options || {};
  return Array.from(workflowDefinitions.values())
    .filter(function(item) { return options.includeDisabled === true || item.enabled; })
    .map(exportWorkflowDefinition)
    .sort(function(a, b) { return a.id.localeCompare(b.id); });
}

function createWorkflowInstance(workflowId, input, options) {
  options = options || {};
  var definition = workflowDefinitions.get(String(workflowId || "").trim());
  if (!definition) throw new Error("WF-001 Workflow Not Found: " + workflowId);
  if (!definition.enabled) throw new Error("WF-002 Workflow Definition Disabled: " + workflowId);
  if (workflowInstances.size >= WORKFLOW_INSTANCE_LIMIT) throw new Error("Workflow instance limit reached");
  var id = String(options.instanceId || createWorkflowInstanceId());
  var now = createWorkflowTimestamp();
  var instance = {
    instanceId: id,
    workflowId: definition.id,
    workflowVersion: definition.version,
    state: "Created",
    currentStep: definition.steps.length ? definition.steps[0].id : null,
    contextId: options.contextId || null,
    input: cloneWorkflowValue(input),
    variables: normalizeWorkflowObject(options.variables),
    context: normalizeWorkflowObject(options.context),
    engineExecutions: [],
    stepStates: {},
    stepResults: {},
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
    elapsedTime: 0,
    createdAt: now,
    updatedAt: now,
    history: []
  };
  definition.steps.forEach(function(step) {
    instance.stepStates[step.id] = { state: "Pending", attempts: 0, startedAt: null, completedAt: null, durationMs: 0, error: null };
  });
  workflowInstances.set(id, instance);
  workflowMetrics.totalWorkflowCount += 1;
  dispatchWorkflowEvent("WorkflowCreated", { instance: exportWorkflowInstance(instance) });
  return exportWorkflowInstance(instance);
}
function getWorkflowInstance(id) { return exportWorkflowInstance(workflowInstances.get(String(id || "").trim())); }
function listWorkflowInstances(options) {
  options = options || {};
  return Array.from(workflowInstances.values()).filter(function(item) {
    return !options.state || item.state === options.state;
  }).map(exportWorkflowInstance);
}
function destroyWorkflowInstance(id) { return workflowInstances.delete(String(id || "").trim()); }

var WORKFLOW_TRANSITIONS = {
  Created: ["Waiting", "Running", "Cancelled", "Failed"],
  Waiting: ["Running", "Cancelled", "Failed"],
  Running: ["Paused", "Completed", "Cancelled", "Failed"],
  Paused: ["Running", "Cancelled", "Failed"],
  Completed: [], Cancelled: [], Failed: []
};
function isValidWorkflowTransition(from, to) { return Boolean(WORKFLOW_TRANSITIONS[from] && WORKFLOW_TRANSITIONS[from].includes(to)); }
function transitionWorkflowState(instance, nextState) {
  if (!instance || !WORKFLOW_STATES.includes(nextState)) return false;
  if (instance.state === nextState) return true;
  if (!isValidWorkflowTransition(instance.state, nextState)) return false;
  if (instance.state === "Running") workflowMetrics.runningWorkflowCount = Math.max(0, workflowMetrics.runningWorkflowCount - 1);
  instance.state = nextState;
  if (nextState === "Running") workflowMetrics.runningWorkflowCount += 1;
  if (nextState === "Completed") workflowMetrics.completedWorkflowCount += 1;
  if (nextState === "Failed") workflowMetrics.failedWorkflowCount += 1;
  if (nextState === "Cancelled") workflowMetrics.cancelledWorkflowCount += 1;
  instance.updatedAt = createWorkflowTimestamp();
  return true;
}
function validateWorkflowState(instance) {
  var errors = [];
  if (!instance || typeof instance !== "object") errors.push("Workflow instance is required");
  else {
    if (!WORKFLOW_STATES.includes(instance.state)) errors.push("Invalid workflow state");
    if (!workflowDefinitions.has(instance.workflowId)) errors.push("Workflow definition is unavailable");
  }
  return { valid: errors.length === 0, errors: errors };
}
function validateWorkflowInstance(instance) { return validateWorkflowState(instance); }

function enqueueWorkflow(instanceId, priority) {
  var id = String(instanceId || "").trim();
  if (!workflowInstances.has(id)) return null;
  var item = { queueId: "WF-QUEUE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), priority: Number(priority) || 0, workflowInstanceId: id, createdAt: createWorkflowTimestamp(), scheduledAt: null };
  workflowQueue.push(item);
  workflowQueue.sort(function(a, b) { return b.priority - a.priority || a.createdAt.localeCompare(b.createdAt); });
  return cloneWorkflowValue(item);
}
function dequeueWorkflow() { return workflowQueue.length ? cloneWorkflowValue(workflowQueue.shift()) : null; }
function cancelQueuedWorkflow(instanceId) {
  var before = workflowQueue.length;
  workflowQueue = workflowQueue.filter(function(item) { return item.workflowInstanceId !== String(instanceId || ""); });
  return before !== workflowQueue.length;
}
function initializeScheduler() { return { initialized: true, queued: workflowQueue.length }; }
async function scheduleNextWorkflow() {
  var item = dequeueWorkflow();
  if (!item) return null;
  return executeWorkflow(item.workflowInstanceId);
}

function resolveStepInput(step, instance, previousResult) {
  if (typeof step.input === "function") return step.input(exportWorkflowInstance(instance), cloneWorkflowValue(previousResult));
  if (step.input !== undefined && step.input !== null) return cloneWorkflowValue(step.input);
  return previousResult === undefined ? cloneWorkflowValue(instance.input) : cloneWorkflowValue(previousResult);
}
function shouldExecuteStep(step, instance) {
  if (typeof step.condition === "function") return step.condition(exportWorkflowInstance(instance)) !== false;
  return step.condition !== false;
}
function delayWorkflow(ms) { return new Promise(function(resolve) { setTimeout(resolve, Math.max(0, Number(ms) || 0)); }); }

async function invokeWorkflowEngine(step, input, instance) {
  if (typeof executeEngine !== "function") throw new Error("WF-004 Engine Platform executeEngine() is unavailable");
  var context = typeof createEngineContext === "function"
    ? createEngineContext({
        source: WORKFLOW_ENGINE_ID,
        metadata: {
          workflowId: instance.workflowId,
          instanceId: instance.instanceId,
          stepId: step.id,
          action: step.action
        }
      })
    : undefined;
  var started = Date.now();
  var execution = await executeEngine(step.engine, input, { context: context });
  var durationMs = Date.now() - started;
  var record = {
    engineId: step.engine,
    stepId: step.id,
    action: step.action,
    ok: Boolean(execution && execution.ok === true),
    durationMs: durationMs,
    executedAt: createWorkflowTimestamp()
  };
  instance.engineExecutions.push(record);

  if (step.engine === "ENGINE-050") {
    workflowMetrics.reasoningExecutions += 1;
    workflowMetrics.totalReasoningTime += durationMs;
    workflowMetrics.lastReasoningAt = record.executedAt;
  }

  if (!execution || execution.ok !== true) {
    if (step.engine === "ENGINE-050") workflowMetrics.reasoningFailures += 1;
    var message = execution && execution.errors && execution.errors[0]
      ? execution.errors[0].message
      : "Engine execution failed";
    throw new Error(message);
  }

  var output = execution.output;
  if (step.engine === "ENGINE-050") {
    instance.context.reasoning = mapReasoningResultToWorkflowContext(output, step, record);
  }
  return output;
}

function mapReasoningResultToWorkflowContext(output, step, executionRecord) {
  var result = normalizeWorkflowObject(output);
  return {
    engineId: "ENGINE-050",
    stepId: step && step.id ? step.id : null,
    decision: cloneWorkflowValue(result.decision || null),
    confidence: Number(result.confidence) || 0,
    trace: cloneWorkflowValue(result.trace || null),
    report: cloneWorkflowValue(result.report || null),
    validation: cloneWorkflowValue(result.validation || null),
    sessionId: result.sessionId || null,
    resultId: result.id || null,
    executionTime: Number(result.executionTime) || (executionRecord ? executionRecord.durationMs : 0),
    completedAt: result.completedAt || createWorkflowTimestamp()
  };
}

async function executeWorkflowStep(instanceId, stepId) {
  var instance = workflowInstances.get(String(instanceId || "").trim());
  if (!instance) throw new Error("WF-001 Workflow Instance Not Found");
  var definition = workflowDefinitions.get(instance.workflowId);
  var step = definition && definition.steps.find(function(item) { return item.id === String(stepId || instance.currentStep); });
  if (!step) throw new Error("WF-003 Invalid Step");
  var state = instance.stepStates[step.id];
  if (!shouldExecuteStep(step, instance)) {
    state.state = "Skipped";
    state.completedAt = createWorkflowTimestamp();
    recordStepHistory(instance, step, "Skipped", null, null);
    return { ok: true, skipped: true, stepId: step.id, output: null };
  }
  var previousResult = Object.keys(instance.stepResults).length ? instance.stepResults[Object.keys(instance.stepResults).slice(-1)[0]] : undefined;
  var stepInput = resolveStepInput(step, instance, previousResult);
  var started = Date.now();
  state.state = "Running";
  state.startedAt = createWorkflowTimestamp();
  dispatchWorkflowEvent("BeforeStep", { instanceId: instance.instanceId, workflowId: instance.workflowId, step: cloneWorkflowValue(step), input: cloneWorkflowValue(stepInput) });
  var lastError = null;
  var attempts = Math.max(1, Number(step.retry.limit || 0) + 1);
  for (var attempt = 1; attempt <= attempts; attempt += 1) {
    state.attempts = attempt;
    try {
      var output = await Promise.race([
        invokeWorkflowEngine(step, stepInput, instance),
        new Promise(function(_, reject) { setTimeout(function() { reject(new Error("WF-006 Timeout")); }, step.timeout); })
      ]);
      state.state = "Completed";
      state.completedAt = createWorkflowTimestamp();
      state.durationMs = Date.now() - started;
      instance.stepResults[step.id] = cloneWorkflowValue(output);
      workflowMetrics.totalStepTime += state.durationMs;
      workflowMetrics.executedStepCount += 1;
      recordStepHistory(instance, step, "Completed", output, null);
      dispatchWorkflowEvent("StepCompleted", { instanceId: instance.instanceId, stepId: step.id, output: cloneWorkflowValue(output) });
      dispatchWorkflowEvent("AfterStep", { instanceId: instance.instanceId, stepId: step.id, output: cloneWorkflowValue(output) });
      return { ok: true, skipped: false, stepId: step.id, output: cloneWorkflowValue(output), attempts: attempt, durationMs: state.durationMs };
    } catch (error) {
      lastError = error;
      state.error = createWorkflowError("WF-008", error.message, { attempt: attempt });
      if (attempt < attempts) {
        state.state = "Retrying";
        workflowMetrics.retryCount += 1;
        if (step.retry.delay > 0) await delayWorkflow(step.retry.delay);
      }
    }
  }
  state.state = "Failed";
  state.completedAt = createWorkflowTimestamp();
  state.durationMs = Date.now() - started;
  workflowMetrics.errorCount += 1;
  recordStepHistory(instance, step, "Failed", null, state.error);
  dispatchWorkflowEvent("StepFailed", { instanceId: instance.instanceId, stepId: step.id, error: cloneWorkflowValue(state.error) });
  throw lastError || new Error("WF-007 Retry Limit Exceeded");
}

async function executeWorkflow(workflowOrInstanceId, input, options) {
  options = options || {};
  var instance = workflowInstances.get(String(workflowOrInstanceId || "").trim());
  if (!instance) instance = workflowInstances.get(createWorkflowInstance(workflowOrInstanceId, input, options).instanceId);
  var definition = workflowDefinitions.get(instance.workflowId);
  if (!definition) throw new Error("WF-001 Workflow Not Found");
  if (["Completed", "Cancelled"].includes(instance.state)) return exportWorkflowInstance(instance);
  var started = Date.now();
  if (!instance.startedAt) instance.startedAt = createWorkflowTimestamp();
  if (instance.state === "Created") transitionWorkflowState(instance, "Running");
  else if (instance.state === "Waiting" || instance.state === "Paused") transitionWorkflowState(instance, "Running");
  dispatchWorkflowEvent("WorkflowStarted", { instanceId: instance.instanceId, workflowId: instance.workflowId });
  try {
    for (var i = 0; i < definition.steps.length; i += 1) {
      if (instance.state === "Paused" || instance.state === "Cancelled") break;
      var step = definition.steps[i];
      instance.currentStep = step.id;
      await executeWorkflowStep(instance.instanceId, step.id);
    }
    if (instance.state === "Running") {
      transitionWorkflowState(instance, "Completed");
      instance.result = definition.steps.length ? cloneWorkflowValue(instance.stepResults[definition.steps[definition.steps.length - 1].id]) : null;
      instance.completedAt = createWorkflowTimestamp();
      instance.elapsedTime = Date.now() - started;
      workflowMetrics.totalExecutionTime += instance.elapsedTime;
      workflowMetrics.lastExecutionAt = instance.completedAt;
      recordWorkflowHistory(instance, "Completed", null);
      dispatchWorkflowEvent("WorkflowCompleted", { instance: exportWorkflowInstance(instance) });
    }
  } catch (error) {
    transitionWorkflowState(instance, "Failed");
    instance.error = createWorkflowError("WF-008", error.message);
    instance.completedAt = createWorkflowTimestamp();
    instance.elapsedTime = Date.now() - started;
    workflowMetrics.totalExecutionTime += instance.elapsedTime;
    workflowMetrics.lastExecutionAt = instance.completedAt;
    recordWorkflowHistory(instance, "Failed", instance.error);
    dispatchWorkflowEvent("WorkflowFailed", { instance: exportWorkflowInstance(instance), error: cloneWorkflowValue(instance.error) });
  }
  instance.updatedAt = createWorkflowTimestamp();
  return exportWorkflowInstance(instance);
}

function pauseWorkflow(instanceId) {
  var instance = workflowInstances.get(String(instanceId || ""));
  if (!instance || !transitionWorkflowState(instance, "Paused")) return null;
  dispatchWorkflowEvent("WorkflowPaused", { instanceId: instance.instanceId });
  return exportWorkflowInstance(instance);
}
async function resumeWorkflow(instanceId) {
  var instance = workflowInstances.get(String(instanceId || ""));
  if (!instance || !transitionWorkflowState(instance, "Running")) return null;
  dispatchWorkflowEvent("WorkflowResumed", { instanceId: instance.instanceId });
  return executeWorkflow(instance.instanceId);
}
function cancelWorkflow(instanceId) {
  var instance = workflowInstances.get(String(instanceId || ""));
  if (!instance || !transitionWorkflowState(instance, "Cancelled")) return null;
  instance.completedAt = createWorkflowTimestamp();
  cancelQueuedWorkflow(instance.instanceId);
  recordWorkflowHistory(instance, "Cancelled", null);
  dispatchWorkflowEvent("WorkflowCancelled", { instanceId: instance.instanceId });
  return exportWorkflowInstance(instance);
}
async function retryWorkflowStep(instanceId, stepId) {
  var instance = workflowInstances.get(String(instanceId || ""));
  if (!instance) return null;
  var state = instance.stepStates[String(stepId || instance.currentStep)];
  if (!state || state.state !== "Failed") return null;
  state.state = "Pending"; state.error = null;
  return executeWorkflowStep(instance.instanceId, stepId);
}

function registerWorkflowEventListener(eventType, listener) {
  var type = String(eventType || "");
  if (!WORKFLOW_EVENTS.includes(type)) throw new Error("Invalid workflow event: " + type);
  if (typeof listener !== "function") throw new Error("Workflow listener must be a function");
  if (!workflowListeners.has(type)) workflowListeners.set(type, new Set());
  workflowListeners.get(type).add(listener);
  return { registered: true, eventType: type, listeners: workflowListeners.get(type).size };
}
function removeWorkflowEventListener(eventType, listener) {
  var set = workflowListeners.get(String(eventType || ""));
  return set ? set.delete(listener) : false;
}
function dispatchWorkflowEvent(eventType, payload) {
  var set = workflowListeners.get(String(eventType || ""));
  if (!set) return { eventType: eventType, dispatched: 0 };
  var count = 0;
  set.forEach(function(listener) {
    try { Promise.resolve().then(function() { return listener(cloneWorkflowValue(payload), eventType); }).catch(function() {}); count += 1; } catch (error) {}
  });
  return { eventType: eventType, dispatched: count };
}

function recordStepHistory(instance, step, status, output, error) {
  var record = { id: createWorkflowHistoryId(), type: "step", instanceId: instance.instanceId, workflowId: instance.workflowId, stepId: step.id, engine: step.engine, status: status, output: cloneWorkflowValue(output), error: cloneWorkflowValue(error), recordedAt: createWorkflowTimestamp() };
  instance.history.push(record);
  workflowHistory.push(record);
  trimWorkflowHistory();
  return cloneWorkflowValue(record);
}
function recordWorkflowHistory(instance, status, error) {
  var record = { id: createWorkflowHistoryId(), type: "workflow", instanceId: instance.instanceId, workflowId: instance.workflowId, status: status, result: cloneWorkflowValue(instance.result), error: cloneWorkflowValue(error), durationMs: instance.elapsedTime, recordedAt: createWorkflowTimestamp() };
  instance.history.push(record);
  workflowHistory.push(record);
  trimWorkflowHistory();
  return cloneWorkflowValue(record);
}
function trimWorkflowHistory() { if (workflowHistory.length > WORKFLOW_HISTORY_LIMIT) workflowHistory.splice(0, workflowHistory.length - WORKFLOW_HISTORY_LIMIT); }
function getWorkflowHistory(options) {
  options = options || {};
  return workflowHistory.filter(function(item) {
    if (options.instanceId && item.instanceId !== options.instanceId) return false;
    if (options.workflowId && item.workflowId !== options.workflowId) return false;
    if (options.type && item.type !== options.type) return false;
    return true;
  }).slice(-(Number(options.limit) || 100)).map(cloneWorkflowValue);
}
function clearWorkflowHistory() { var count = workflowHistory.length; workflowHistory.length = 0; return { cleared: count }; }

function getWorkflowMetrics() {
  var metrics = cloneWorkflowValue(workflowMetrics);
  metrics.averageExecutionTime = metrics.completedWorkflowCount + metrics.failedWorkflowCount ? Math.round(metrics.totalExecutionTime / (metrics.completedWorkflowCount + metrics.failedWorkflowCount)) : 0;
  metrics.averageStepTime = metrics.executedStepCount ? Math.round(metrics.totalStepTime / metrics.executedStepCount) : 0;
  metrics.averageReasoningTime = metrics.reasoningExecutions ? Math.round(metrics.totalReasoningTime / metrics.reasoningExecutions) : 0;
  return metrics;
}
function getWorkflowStatistics() { return getWorkflowMetrics(); }
function resetWorkflowStatistics() {
  Object.keys(workflowMetrics).forEach(function(key) { workflowMetrics[key] = ["lastExecutionAt", "lastReasoningAt"].includes(key) ? null : 0; });
  return getWorkflowMetrics();
}
function getWorkflowStatus(instanceId) {
  var instance = workflowInstances.get(String(instanceId || ""));
  return instance ? { instanceId: instance.instanceId, workflowId: instance.workflowId, state: instance.state, currentStep: instance.currentStep, ready: !["Failed", "Cancelled"].includes(instance.state), updatedAt: instance.updatedAt } : null;
}
function getWorkflowEngineHealth() {
  var registered = typeof getEngine === "function" && Boolean(getEngine(WORKFLOW_ENGINE_ID));
  var health = registered ? 100 : 0;
  return { id: WORKFLOW_ENGINE_ID, health: health, status: health === 100 ? "Healthy" : "Unhealthy", ready: health === 100, registered: registered, updatedAt: createWorkflowTimestamp() };
}
function getWorkflowEngineStatus() {
  var health = getWorkflowEngineHealth();
  return {
    id: WORKFLOW_ENGINE_ID, title: WORKFLOW_ENGINE_TITLE, version: WORKFLOW_ENGINE_VERSION,
    status: health.ready ? (workflowMetrics.runningWorkflowCount > 0 ? "Busy" : "Ready") : "Error",
    ready: health.ready, health: health.health, progress: 100, registered: health.registered,
    definitions: { total: workflowDefinitions.size, limit: WORKFLOW_DEFINITION_LIMIT },
    instances: { total: workflowInstances.size, running: workflowMetrics.runningWorkflowCount, limit: WORKFLOW_INSTANCE_LIMIT },
    queue: workflowQueue.length, history: { total: workflowHistory.length, limit: WORKFLOW_HISTORY_LIMIT },
    metrics: getWorkflowMetrics(), updatedAt: createWorkflowTimestamp()
  };
}

function createWorkflowEngineDefinition() {
  return {
    id: WORKFLOW_ENGINE_ID,
    title: WORKFLOW_ENGINE_TITLE,
    version: WORKFLOW_ENGINE_VERSION,
    status: "Ready",
    enabled: true,
    dependencies: [],
    inputs: ["Workflow id or instance id", "Workflow input", "Execution options"],
    outputs: ["Workflow instance", "Workflow result", "Execution history", "Workflow status"],
    execute: function(input) {
      input = input || {};
      return executeWorkflow(input.instanceId || input.workflowId || input.id, input.input, input.options || {});
    },
    validate: validateWorkflowEngine,
    getStatus: getWorkflowEngineStatus,
    getHealth: getWorkflowEngineHealth,
    metadata: { orchestrates: ["ENGINE-010", "ENGINE-020", "ENGINE-030", "ENGINE-040", "ENGINE-050"], definitionLimit: WORKFLOW_DEFINITION_LIMIT, instanceLimit: WORKFLOW_INSTANCE_LIMIT, historyLimit: WORKFLOW_HISTORY_LIMIT }
  };
}
function registerWorkflowEngine(options) {
  options = options || {};
  if (typeof registerEngine !== "function") return { registered: false, error: "ENGINE-001 registerEngine() is unavailable" };
  return registerEngine(createWorkflowEngineDefinition(), { replace: options.replace !== false });
}

function validateWorkflowEngine() {
  var checks = {};
  var failed = [];
  function remember(name, value) { checks[name] = Boolean(value); if (!checks[name]) failed.push(name); }
  var testDefinitionId = "WF-SELF-TEST";
  try {
    remember("engineCore", typeof registerEngine === "function" && typeof executeEngine === "function");
    remember("definitionRegistry", workflowDefinitions instanceof Map);
    remember("instanceRegistry", workflowInstances instanceof Map);
    remember("queue", Array.isArray(workflowQueue));
    remember("history", Array.isArray(workflowHistory));
    remember("listeners", workflowListeners instanceof Map);
    remember("states", WORKFLOW_STATES.length === 7 && WORKFLOW_STEP_STATES.length === 6);
    remember("events", WORKFLOW_EVENTS.length >= 10);
    var definition = { id: testDefinitionId, name: "Workflow Self Test", version: "1.0.0", steps: [{ id: "STEP-1", engine: "ENGINE-040", action: "execute" }] };
    remember("definitionValidation", validateWorkflowDefinition(definition).valid);
    remember("definitionRegistration", registerWorkflowDefinition(definition, { replace: true }).registered);
    remember("definitionLookup", Boolean(getWorkflowDefinition(testDefinitionId)));
    var instance = createWorkflowInstance(testDefinitionId, { target: {} });
    remember("instanceCreation", Boolean(instance.instanceId));
    remember("stateValidation", validateWorkflowInstance(instance).valid);
    remember("stateTransition", transitionWorkflowState(workflowInstances.get(instance.instanceId), "Running"));
    remember("pause", Boolean(pauseWorkflow(instance.instanceId)));
    remember("cancel", Boolean(cancelWorkflow(instance.instanceId)));
    remember("historyWrite", getWorkflowHistory({ instanceId: instance.instanceId }).length > 0);
    remember("metrics", typeof getWorkflowMetrics().totalWorkflowCount === "number");
    remember("status", getWorkflowEngineStatus().id === WORKFLOW_ENGINE_ID);
    remember("registration", Boolean(registerWorkflowEngine({ replace: true }).registered));
  } catch (error) { failed.push("exception:" + error.message); }
  finally {
    removeWorkflowDefinition(testDefinitionId);
    Array.from(workflowInstances.keys()).filter(function(id) { return id.indexOf("WF-INSTANCE-") === 0; }).forEach(function(id) {
      var item = workflowInstances.get(id); if (item && item.workflowId === testDefinitionId) workflowInstances.delete(id);
    });
  }
  var total = 20;
  var passed = Object.keys(checks).filter(function(key) { return checks[key]; }).length;
  return { id: WORKFLOW_ENGINE_ID, title: WORKFLOW_ENGINE_TITLE, version: WORKFLOW_ENGINE_VERSION, valid: failed.length === 0 && passed === total, passed: passed, total: total, failed: failed, checks: checks, status: getWorkflowEngineStatus() };
}

async function validateWorkflowReasoningIntegration() {
  var checks = {};
  var failed = [];
  var errors = [];
  var definitionId = "WF-REASONING-INTEGRATION-TEST";
  var instanceId = null;
  function remember(name, value) {
    checks[name] = Boolean(value);
    if (!checks[name]) failed.push(name);
  }
  try {
    remember("reasoningAvailable", typeof getEngine === "function" && Boolean(getEngine("ENGINE-050")));
    var registration = registerWorkflowDefinition({
      id: definitionId,
      name: "Workflow Reasoning Integration Test",
      version: "1.0.0",
      steps: [{
        id: "REASON",
        engine: "ENGINE-050",
        action: "execute",
        input: {
          goal: "Select the safest integration approach",
          candidates: [
            { id: "CANDIDATE-A", title: "Function-level integration", score: 0.9 },
            { id: "CANDIDATE-B", title: "Full-file replacement", score: 0.4 }
          ],
          constraints: [{ id: "SAFE", required: true }]
        }
      }]
    }, { replace: true });
    remember("definitionRegistration", registration.registered === true);
    var created = createWorkflowInstance(definitionId, {}, { context: {} });
    instanceId = created.instanceId;
    remember("instanceCreation", Boolean(instanceId));
    var completed = await executeWorkflow(instanceId);
    remember("workflowCompleted", completed && completed.state === "Completed");
    var reasoning = completed && completed.context ? completed.context.reasoning : null;
    remember("contextStored", Boolean(reasoning));
    remember("decision", Boolean(reasoning && reasoning.decision));
    remember("confidence", Boolean(reasoning && typeof reasoning.confidence === "number"));
    remember("trace", Boolean(reasoning && reasoning.trace));
    remember("report", Boolean(reasoning && reasoning.report));
    remember("engineHistory", Boolean(completed && Array.isArray(completed.engineExecutions) && completed.engineExecutions.length));
    remember("metrics", getWorkflowMetrics().reasoningExecutions > 0);
  } catch (error) {
    errors.push(String(error && error.message ? error.message : error));
  } finally {
    removeWorkflowDefinition(definitionId);
    if (instanceId) workflowInstances.delete(instanceId);
  }
  var total = 11;
  var passed = Object.keys(checks).filter(function(key) { return checks[key] === true; }).length;
  return {
    id: "ENGINE-050-060-INTEGRATION",
    title: "Workflow Reasoning Integration Validation",
    version: "1.0.0",
    valid: failed.length === 0 && errors.length === 0 && passed === total,
    passed: passed,
    total: total,
    failed: failed,
    errors: errors,
    checks: checks,
    workflowStatus: getWorkflowEngineStatus(),
    reasoningStatus: typeof getReasoningEngineStatus === "function" ? getReasoningEngineStatus() : null
  };
}

initializeScheduler();
registerWorkflowEngine();