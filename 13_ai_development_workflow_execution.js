/* ============================================================
   FILE: 13_ai_development_workflow_execution.js
   IDE-160 AI Development Workflow Execution
   Version: 2.0.1
   Phase: Complete - Monitoring / Package / Completion / Integration / Release
   Design Freeze: 2026-08-04
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const MAX_EXECUTION_RECORDS = 100;

  const TASK_EXECUTION_STATUSES = Object.freeze([
    "Pending",
    "Preparing",
    "Preflight Running",
    "Waiting Approval",
    "Ready",
    "Running",
    "Verifying",
    "Rolling Back",
    "Rolled Back",
    "Succeeded",
    "Blocked",
    "Failed",
    "Rejected",
    "Cancelling",
    "Cancelled"
  ]);

  const EXECUTION_TYPES = Object.freeze([
    "Pure Calculation",
    "Read-Only",
    "Temporary State",
    "Controlled Mutation",
    "External Side Effect"
  ]);

  const executionStore = internal.executionStore && internal.isPlainObject(internal.executionStore)
    ? internal.executionStore
    : {
        records: [],
        checkpoints: [],
        mutationLock: null,
        lastSummary: null
      };
  internal.executionStore = executionStore;

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function getActivePlanMutable(workflow) {
    if (!workflow || !workflow.planning || !Array.isArray(workflow.planning.candidatePlans)) return null;
    const planId = workflow.planning.activePlanId || workflow.planning.selectedPlanId;
    return workflow.planning.candidatePlans.find(function findPlan(plan) { return plan.planId === planId; }) || null;
  }

  function getTaskMutable(plan, taskId) {
    if (!plan || !Array.isArray(plan.tasks)) return null;
    return plan.tasks.find(function findTask(task) { return task.taskId === String(taskId || ""); }) || null;
  }

  function ensureExecutionContainer(workflow) {
    if (!workflow.execution || !internal.isPlainObject(workflow.execution)) {
      workflow.execution = {
        status: "Not Started",
        currentSession: null,
        sessions: [],
        executionRecordReferences: [],
        executionSummary: null,
        createdAt: internal.nowIso(),
        updatedAt: internal.nowIso()
      };
    }
    if (!Array.isArray(workflow.execution.sessions)) workflow.execution.sessions = [];
    if (!Array.isArray(workflow.execution.executionRecordReferences)) workflow.execution.executionRecordReferences = [];
    return workflow.execution;
  }

  function isMutationTask(task) {
    return Boolean(internal.isWorkflowMutationTask && internal.isWorkflowMutationTask(task));
  }

  function repositoryMatches(expected, actual) {
    const left = internal.isPlainObject(expected) ? expected : {};
    const right = internal.isPlainObject(actual) ? actual : {};
    return ["repositoryId", "repositoryVersion", "repositoryBaselineId", "repositoryHash"].every(function compare(key) {
      return String(left[key] || "") === String(right[key] || "");
    });
  }

  function buildInputSnapshot(task, input) {
    const snapshotWithoutHash = {
      inputSnapshotId: internal.nextId("IDE-160-INPUT-SNAPSHOT"),
      taskId: task.taskId,
      inputReferences: internal.clone(task.inputReferences || []),
      input: internal.clone(input == null ? null : input),
      capturedAt: internal.nowIso()
    };
    const integrity = internal.hashCanonicalSync(snapshotWithoutHash);
    return Object.assign({}, snapshotWithoutHash, {
      hashAlgorithm: integrity.algorithm,
      inputHash: integrity.hash
    });
  }

  function createCheckpoint(workflow, session, task, type, detail) {
    const recordWithoutHash = {
      checkpointId: internal.nextId("IDE-160-EXECUTION-CHECKPOINT"),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      executionSessionId: session.executionSessionId,
      taskId: task ? task.taskId : null,
      checkpointType: type,
      executionStatus: session.status,
      repositoryVersion: session.currentRepository && session.currentRepository.repositoryVersion || null,
      repositoryHash: session.currentRepository && session.currentRepository.repositoryHash || null,
      detail: internal.clone(detail || null),
      createdAt: internal.nowIso()
    };
    const integrity = internal.hashCanonicalSync(recordWithoutHash);
    const record = Object.assign({}, recordWithoutHash, {
      previousCheckpointHash: executionStore.checkpoints.length
        ? executionStore.checkpoints[executionStore.checkpoints.length - 1].checkpointHash
        : null,
      hashAlgorithm: integrity.algorithm,
      checkpointHash: integrity.hash
    });
    executionStore.checkpoints.push(record);
    while (executionStore.checkpoints.length > 200) executionStore.checkpoints.shift();
    return record;
  }

  function appendExecutionRecord(workflow, record) {
    const previous = executionStore.records.length ? executionStore.records[executionStore.records.length - 1] : null;
    const payload = Object.assign({}, record, {
      previousExecutionRecordHash: previous ? previous.executionRecordHash : null
    });
    const integrity = internal.hashCanonicalSync(payload);
    const stored = Object.assign({}, payload, {
      hashAlgorithm: integrity.algorithm,
      executionRecordHash: integrity.hash
    });
    executionStore.records.push(stored);
    while (executionStore.records.length > MAX_EXECUTION_RECORDS) executionStore.records.shift();
    const container = ensureExecutionContainer(workflow);
    container.executionRecordReferences.push({
      executionRecordId: stored.executionRecordId,
      taskId: stored.taskId,
      status: stored.finalStatus,
      recordHash: stored.executionRecordHash
    });
    while (container.executionRecordReferences.length > MAX_EXECUTION_RECORDS) container.executionRecordReferences.shift();
    return stored;
  }

  function getTaskExecutionState(session, taskId) {
    return session.taskStates && session.taskStates[taskId] || "Pending";
  }

  function setTaskExecutionState(session, taskId, status) {
    session.taskStates = session.taskStates || {};
    session.taskStates[taskId] = status;
    session.updatedAt = internal.nowIso();
  }

  function createExecutionSession(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = internal.isPlainObject(options) ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (workflow.state.primaryPhase !== "Execution" || workflow.state.controlStatus !== "Ready") {
      return internal.buildResult(false, "EXECUTION_STATE_NOT_READY", "Blocked", { currentState: internal.clone(workflow.state) }, {
        error: { message: "Workflow is not ready for Execution.", category: "Policy Failure", severity: "High" }
      });
    }
    const plan = getActivePlanMutable(workflow);
    if (!plan || plan.status !== "Frozen") {
      return internal.buildResult(false, "FROZEN_PLAN_REQUIRED", "Blocked", null, {
        error: { message: "Execution requires a Frozen Active Plan.", category: "Policy Failure", severity: "High" }
      });
    }
    const hashResult = namespace.api.verifyWorkflowPlanHash(workflowId, plan.planId);
    if (!hashResult || hashResult.ok !== true) return hashResult || internal.buildResult(false, "PLAN_HASH_VERIFICATION_FAILED", "Failed", null);
    const currentRepository = internal.isPlainObject(settings.currentRepository)
      ? internal.clone(settings.currentRepository)
      : internal.clone(plan.repositoryBinding);
    if (!repositoryMatches(plan.repositoryBinding, currentRepository)) {
      return internal.buildResult(false, "EXECUTION_REPOSITORY_BASELINE_MISMATCH", "Blocked", {
        expected: internal.clone(plan.repositoryBinding),
        actual: currentRepository
      }, {
        error: { message: "Repository Baseline does not match the Frozen Plan.", category: "Repository Integrity Failure", severity: "Critical" }
      });
    }

    const taskStates = {};
    plan.tasks.forEach(function initializeTask(task) { taskStates[task.taskId] = "Pending"; });
    const timestamp = internal.nowIso();
    const session = {
      executionSessionId: internal.text(settings.executionSessionId, internal.nextId("IDE-160-EXECUTION")),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      planId: plan.planId,
      planVersion: plan.planVersion,
      planHash: plan.planHash,
      repositoryBaselineId: plan.repositoryBinding.repositoryBaselineId,
      repositoryVersion: plan.repositoryBinding.repositoryVersion,
      repositoryHash: plan.repositoryBinding.repositoryHash,
      currentRepository: currentRepository,
      currentTaskId: null,
      status: "Running",
      executionMode: internal.text(settings.executionMode, "Serial"),
      executionOrder: internal.clone(plan.graph && plan.graph.executionOrder || []),
      taskStates: taskStates,
      componentVersions: internal.clone(plan.componentBindings || []),
      metrics: {
        taskCount: plan.tasks.length,
        executedTaskCount: 0,
        succeededTaskCount: 0,
        failedTaskCount: 0,
        blockedTaskCount: 0,
        repositoryWriteCount: 0,
        rollbackCount: 0
      },
      traceability: [{ type: "Frozen Plan", id: plan.planId, hash: plan.planHash }],
      startedAt: timestamp,
      completedAt: null,
      updatedAt: timestamp
    };
    const container = ensureExecutionContainer(workflow);
    container.currentSession = session;
    container.sessions.push(internal.clone(session));
    container.status = "Running";
    container.updatedAt = timestamp;
    workflow.context.executionReference = {
      executionSessionId: session.executionSessionId,
      planId: plan.planId,
      status: "Running"
    };
    workflow.updatedAt = timestamp;
    createCheckpoint(workflow, session, null, "Before Preflight", { planHashVerified: true });

    const transition = namespace.api.transitionWorkflowState(workflowId, {
      fromPhase: "Execution",
      fromStatus: "Ready",
      toPhase: "Execution",
      toStatus: "Running",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "EXECUTION_SESSION_STARTED",
      evidenceReferences: [{ type: "Execution Session", id: session.executionSessionId }, { type: "Plan Hash", hash: plan.planHash }],
      actor: internal.text(settings.actor, "IDE-160"),
      sourceComponent: namespace.componentId
    });
    if (!transition.ok) {
      container.currentSession = null;
      container.sessions.pop();
      container.status = "Not Started";
      return transition;
    }
    internal.touch();
    const persistence = internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "EXECUTION_SESSION_CREATED", "Running", {
      executionSession: internal.clone(session),
      transition: transition.data && transition.data.transition,
      persistence: persistence
    });
  }

  function buildPreflightChecks(workflow, session, plan, task, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: internal.text(group, "Preflight") });
    }
    const adapter = internal.findIDE160AdapterMutable
      ? internal.findIDE160AdapterMutable(task.targetComponent)
      : null;
    const dependencyIds = plan.dependencies.filter(function findDependency(edge) {
      return edge.toTaskId === task.taskId;
    }).map(function mapDependency(edge) { return edge.fromTaskId; });
    const incompleteDependencies = dependencyIds.filter(function filterDependency(taskId) {
      return getTaskExecutionState(session, taskId) !== "Succeeded";
    });
    const binding = (plan.componentBindings || []).find(function findBinding(item) {
      return item.componentId === task.targetComponent;
    });
    const operationExists = Boolean(adapter && Object.prototype.hasOwnProperty.call(adapter.operations, task.operationType));
    const capabilityMatch = Boolean(adapter && adapter.capabilities.some(function match(capability) {
      return String(capability).toLowerCase() === String(task.requiredCapability).toLowerCase();
    }));
    const versionMatch = Boolean(adapter && (!binding || !binding.componentVersion || binding.componentVersion === adapter.componentVersion));
    const mutation = isMutationTask(task);
    const approval = settings.approvalReference;
    const approvalValid = !mutation || (task.approvalRequirement && task.approvalRequirement.required === true && approval && approval.approved === true);
    const rollbackDefined = !mutation || Boolean(task.rollbackRequirement && task.rollbackRequirement.required === true);
    const validationDefined = Boolean(task.validationRequirement && Object.keys(task.validationRequirement).length > 0);
    const mutationLockAvailable = !mutation || !executionStore.mutationLock || executionStore.mutationLock.taskExecutionId === settings.taskExecutionId;

    check("Workflow identity", workflow.identity.workflowId === session.workflowId, workflow.identity.workflowId, "Identity");
    check("Attempt identity", workflow.currentAttempt.attemptId === session.attemptId, workflow.currentAttempt.attemptId, "Identity");
    check("Plan identity", plan.planId === session.planId && plan.planHash === session.planHash, plan.planId, "Identity");
    check("Task exists", Boolean(task), task && task.taskId, "Task");
    check("Dependency completion", incompleteDependencies.length === 0, JSON.stringify(incompleteDependencies), "Dependency");
    check("Input reference available", Array.isArray(task.inputReferences), "count=" + (task.inputReferences && task.inputReferences.length), "Input");
    check("Evidence requirement defined", Array.isArray(task.evidenceRequirement) && task.evidenceRequirement.length > 0, "count=" + (task.evidenceRequirement && task.evidenceRequirement.length), "Evidence");
    check("Adapter registered", Boolean(adapter), task.targetComponent, "Adapter");
    check("Adapter enabled", Boolean(adapter && adapter.enabled), adapter && String(adapter.enabled), "Adapter");
    check("Capability match", capabilityMatch, task.requiredCapability, "Adapter");
    check("Operation available", operationExists, task.operationType, "Adapter");
    check("Component version compatible", versionMatch, binding && binding.componentVersion, "Compatibility");
    check("External side effect prohibited", task.sideEffectType !== "External Side Effect", task.sideEffectType, "Safety");
    check("Component approval", approvalValid, mutation ? "Required" : "Not Required", "Approval");
    check("Validation requirement", validationDefined, JSON.stringify(task.validationRequirement), "Validation");
    check("Rollback requirement", rollbackDefined, JSON.stringify(task.rollbackRequirement), "Rollback");
    check("Repository baseline", repositoryMatches(plan.repositoryBinding, session.currentRepository), session.currentRepository.repositoryHash, "Repository");
    check("Mutation lock available", mutationLockAvailable, executionStore.mutationLock && executionStore.mutationLock.lockId || "Available", "Mutation Lock");
    check("Persistent commit prohibited", settings.persistentCommit !== true, String(settings.persistentCommit === true), "Safety");
    check("ZIP mutation prohibited", settings.zipFileMutation !== true, String(settings.zipFileMutation === true), "Safety");

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      adapter: adapter,
      incompleteDependencies: incompleteDependencies,
      mutation: mutation,
      status: passed === checks.length ? "Passed" : "Failed",
      checkedAt: internal.nowIso()
    };
  }

  function preflightWorkflowTask(workflowId, taskId, options) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const container = ensureExecutionContainer(workflow);
    const session = container.currentSession;
    const plan = getActivePlanMutable(workflow);
    const task = getTaskMutable(plan, taskId);
    if (!session || session.status !== "Running") {
      return internal.buildResult(false, "EXECUTION_SESSION_NOT_RUNNING", "Blocked", null, {
        error: { message: "Execution Session is not running.", category: "Execution Failure", severity: "High" }
      });
    }
    if (!task) return internal.buildResult(false, "WORKFLOW_TASK_NOT_FOUND", "Blocked", { taskId: taskId });
    setTaskExecutionState(session, task.taskId, "Preflight Running");
    const preflight = buildPreflightChecks(workflow, session, plan, task, options);
    setTaskExecutionState(session, task.taskId, preflight.valid ? "Ready" : "Blocked");
    if (!preflight.valid) session.metrics.blockedTaskCount += 1;
    createCheckpoint(workflow, session, task, "After Preflight", { valid: preflight.valid, failed: preflight.failed });
    return internal.buildResult(preflight.valid, preflight.valid ? "TASK_PREFLIGHT_PASSED" : "TASK_PREFLIGHT_FAILED", preflight.valid ? "Ready" : "Blocked", {
      taskId: task.taskId,
      preflight: internal.clone(Object.assign({}, preflight, { adapter: internal.compactIDE160Adapter && internal.compactIDE160Adapter(preflight.adapter) }))
    }, preflight.valid ? {} : {
      error: { message: "Task Preflight failed.", category: "Dependency Failure", severity: "High" }
    });
  }

  function acquireMutationLock(workflow, session, task, taskExecutionId) {
    if (!isMutationTask(task)) return internal.buildResult(true, "MUTATION_LOCK_NOT_REQUIRED", "Not Applicable", null);
    if (executionStore.mutationLock) {
      return internal.buildResult(false, "MUTATION_LOCK_UNAVAILABLE", "Blocked", internal.clone(executionStore.mutationLock), {
        error: { message: "Repository Mutation Lock is already active.", category: "Repository Integrity Failure", severity: "Critical" }
      });
    }
    const lock = {
      lockId: internal.nextId("IDE-160-MUTATION-LOCK"),
      repositoryId: session.currentRepository.repositoryId,
      repositoryVersion: session.currentRepository.repositoryVersion,
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      taskExecutionId: taskExecutionId,
      transactionId: null,
      targetFile: task.mutationScope && task.mutationScope.targetFile || null,
      targetFunction: task.mutationScope && task.mutationScope.targetFunction || null,
      status: "Active",
      acquiredAt: internal.nowIso(),
      releasedAt: null
    };
    executionStore.mutationLock = lock;
    return internal.buildResult(true, "MUTATION_LOCK_ACQUIRED", "Active", { lock: internal.clone(lock) });
  }

  function releaseMutationLock(taskExecutionId, reason) {
    const lock = executionStore.mutationLock;
    if (!lock) return internal.buildResult(true, "MUTATION_LOCK_NOT_ACTIVE", "Not Applicable", null);
    if (lock.taskExecutionId !== taskExecutionId) {
      return internal.buildResult(false, "MUTATION_LOCK_OWNER_MISMATCH", "Blocked", internal.clone(lock));
    }
    lock.status = "Released";
    lock.releasedAt = internal.nowIso();
    lock.releaseReason = internal.text(reason, "Task Closed");
    const released = internal.clone(lock);
    executionStore.mutationLock = null;
    return internal.buildResult(true, "MUTATION_LOCK_RELEASED", "Released", { lock: released });
  }

  function verifyOutput(task, invocation, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const output = invocation && invocation.data && invocation.data.output;
    const expected = internal.isPlainObject(task.expectedOutput) ? task.expectedOutput : {};
    const requiredFields = internal.asArray(expected.requiredFields);
    const missingFields = requiredFields.filter(function findMissing(field) {
      return !output || !Object.prototype.hasOwnProperty.call(output, field);
    });
    const outputVerified = Boolean(invocation && invocation.ok === true && output != null && missingFields.length === 0);
    const validationRequired = task.validationRequirement && task.validationRequirement.required === true;
    const suppliedValidation = settings.validationResult;
    const outputValidation = output && output.validationResult;
    const resultContractValidation = task.validationRequirement && task.validationRequirement.mode === "Result Contract" && outputVerified;
    const validationPassed = !validationRequired || Boolean(
      suppliedValidation && (suppliedValidation.passed === true || suppliedValidation.valid === true) ||
      outputValidation && (outputValidation.passed === true || outputValidation.valid === true) ||
      resultContractValidation
    );
    const mutation = isMutationTask(task);
    const repositoryResult = output && output.repositoryResult;
    const mutationVerified = !mutation || Boolean(
      repositoryResult &&
      repositoryResult.applicationWriteVerified === true &&
      repositoryResult.postApplicationValidationPassed === true &&
      repositoryResult.rollbackVerified === true &&
      repositoryResult.sourceRestored === true &&
      repositoryResult.originalHash &&
      repositoryResult.restoredHash &&
      repositoryResult.originalHash === repositoryResult.restoredHash &&
      repositoryResult.persistentCommitExecuted === false &&
      repositoryResult.zipFileMutation === false
    );
    return {
      valid: outputVerified && validationPassed && mutationVerified,
      outputVerified: outputVerified,
      validationPassed: validationPassed,
      mutationVerified: mutationVerified,
      missingFields: missingFields,
      repositoryResult: internal.clone(repositoryResult || null),
      verifiedAt: internal.nowIso()
    };
  }

  function buildExecutionSummary(workflow, session, plan) {
    const records = executionStore.records.filter(function filterRecord(record) {
      return record.workflowId === workflow.identity.workflowId && record.executionSessionId === session.executionSessionId;
    });
    const summaryWithoutHash = {
      executionSummaryId: internal.nextId("IDE-160-EXECUTION-SUMMARY"),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      planId: plan.planId,
      planVersion: plan.planVersion,
      executionSessionId: session.executionSessionId,
      taskCount: plan.tasks.length,
      succeededTaskCount: records.filter(function count(record) { return record.finalStatus === "Succeeded"; }).length,
      failedTaskCount: records.filter(function count(record) { return record.finalStatus === "Failed"; }).length,
      blockedTaskCount: records.filter(function count(record) { return record.finalStatus === "Blocked"; }).length,
      rolledBackTaskCount: records.filter(function count(record) { return record.finalStatus === "Rolled Back"; }).length,
      validationSummary: records.map(function mapRecord(record) {
        return { taskId: record.taskId, validationResult: internal.clone(record.validationResult) };
      }),
      repositoryIntegrity: {
        repositoryId: session.currentRepository.repositoryId,
        repositoryVersion: session.currentRepository.repositoryVersion,
        repositoryHash: session.currentRepository.repositoryHash,
        mutationLockActive: Boolean(executionStore.mutationLock),
        persistentCommitExecuted: false,
        zipFileMutation: false
      },
      metricsSummary: internal.clone(session.metrics),
      failureReferences: internal.clone(workflow.failures || []),
      remainingRisk: internal.clone(workflow.context.remainingRisk || []),
      unresolvedItems: internal.clone(workflow.context.unresolvedItems || []),
      executionRecordReferences: records.map(function mapRecord(record) {
        return { executionRecordId: record.executionRecordId, taskId: record.taskId, recordHash: record.executionRecordHash, status: record.finalStatus };
      }),
      completedAt: internal.nowIso()
    };
    const integrity = internal.hashCanonicalSync(summaryWithoutHash);
    return Object.assign({}, summaryWithoutHash, { integrity: integrity });
  }

  function completeExecutionIfReady(workflow, session, plan) {
    const allSucceeded = plan.tasks.every(function everyTask(task) {
      return getTaskExecutionState(session, task.taskId) === "Succeeded";
    });
    if (!allSucceeded) return null;
    session.status = "Succeeded";
    session.completedAt = internal.nowIso();
    session.updatedAt = session.completedAt;
    const summary = buildExecutionSummary(workflow, session, plan);
    const container = ensureExecutionContainer(workflow);
    container.status = "Succeeded";
    container.executionSummary = summary;
    container.updatedAt = session.completedAt;
    workflow.context.executionReference = {
      executionSessionId: session.executionSessionId,
      executionSummaryId: summary.executionSummaryId,
      integrity: summary.integrity,
      status: "Succeeded"
    };
    workflow.updatedAt = session.completedAt;
    executionStore.lastSummary = internal.clone(summary);
    createCheckpoint(workflow, session, null, "Before Task Close", { allTasksSucceeded: true });

    const executionSucceeded = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Execution",
      fromStatus: "Running",
      toPhase: "Execution",
      toStatus: "Succeeded",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "EXECUTION_PLAN_SUCCEEDED",
      evidenceReferences: [{ type: "Execution Summary", id: summary.executionSummaryId, hash: summary.integrity.hash }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
    if (!executionSucceeded.ok) return executionSucceeded;
    const decisionReady = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Execution",
      fromStatus: "Succeeded",
      toPhase: "Decision",
      toStatus: "Ready",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "EXECUTION_HANDOFF_TO_DECISION",
      evidenceReferences: [{ type: "Execution Summary", id: summary.executionSummaryId, hash: summary.integrity.hash }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
    if (!decisionReady.ok) return decisionReady;
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "EXECUTION_SESSION_COMPLETED", "Succeeded", {
      executionSummary: internal.clone(summary),
      workflowState: internal.clone(workflow.state)
    });
  }

  function finalizeTaskExecution(workflow, session, plan, task, requestContext, invocation, options) {
    const completedAt = internal.nowIso();
    setTaskExecutionState(session, task.taskId, "Verifying");
    createCheckpoint(workflow, session, task, "After Validation", { invocationOk: invocation && invocation.ok === true });
    const verification = verifyOutput(task, invocation, options);
    const mutation = isMutationTask(task);
    const rollbackResult = verification.repositoryResult ? {
      required: mutation,
      executed: Boolean(verification.repositoryResult.rollbackVerified),
      verified: Boolean(verification.repositoryResult.rollbackVerified),
      sourceRestored: Boolean(verification.repositoryResult.sourceRestored),
      originalHash: verification.repositoryResult.originalHash || null,
      restoredHash: verification.repositoryResult.restoredHash || null
    } : { required: mutation, executed: false, verified: !mutation };
    const success = Boolean(invocation && invocation.ok === true && verification.valid);
    const finalStatus = success ? "Succeeded" : mutation && rollbackResult.verified ? "Rolled Back" : "Failed";
    setTaskExecutionState(session, task.taskId, success ? "Succeeded" : finalStatus);
    session.metrics.executedTaskCount += 1;
    if (success) session.metrics.succeededTaskCount += 1;
    else session.metrics.failedTaskCount += 1;
    if (mutation) {
      session.metrics.repositoryWriteCount += Number(verification.repositoryResult && verification.repositoryResult.repositoryWriteCount) || 0;
      session.metrics.rollbackCount += rollbackResult.executed ? 1 : 0;
    }
    const record = appendExecutionRecord(workflow, {
      executionRecordId: internal.nextId("IDE-160-EXECUTION-RECORD"),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      executionSessionId: session.executionSessionId,
      taskExecutionId: requestContext.taskExecutionId,
      planId: plan.planId,
      planVersion: plan.planVersion,
      taskId: task.taskId,
      taskVersion: task.taskVersion,
      componentId: task.targetComponent,
      componentVersion: requestContext.adapter && requestContext.adapter.componentVersion || null,
      executionType: task.sideEffectType,
      operationType: task.operationType,
      inputSnapshotReference: internal.clone(requestContext.inputSnapshot),
      executionRequest: internal.clone(requestContext.executionRequest),
      executionResult: internal.clone(invocation),
      policyResult: { persistentCommitAllowed: false, zipFileMutationAllowed: false },
      approvalResult: internal.clone(options && options.approvalReference || null),
      validationResult: internal.clone(verification),
      repositoryBeforeState: internal.clone(session.currentRepository),
      repositoryAfterState: internal.clone(session.currentRepository),
      rollbackResult: rollbackResult,
      metrics: {
        startedAt: requestContext.startedAt,
        completedAt: completedAt,
        durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(requestContext.startedAt))
      },
      failureReference: success ? null : invocation && invocation.error || { category: "Validation Failure", severity: "High" },
      startedAt: requestContext.startedAt,
      completedAt: completedAt,
      finalStatus: finalStatus,
      traceabilityReference: internal.clone(task.traceabilityReferences || [])
    });
    createCheckpoint(workflow, session, task, mutation ? "After Rollback" : "Before Task Close", {
      finalStatus: finalStatus,
      recordId: record.executionRecordId
    });
    const lockRelease = releaseMutationLock(requestContext.taskExecutionId, finalStatus);
    if (!success) {
      session.status = "Failed";
      ensureExecutionContainer(workflow).status = "Failed";
      if (workflow.state.primaryPhase === "Execution" && workflow.state.controlStatus === "Running") {
        namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
          fromPhase: "Execution",
          fromStatus: "Running",
          toPhase: "Execution",
          toStatus: "Failed",
          attemptId: workflow.currentAttempt.attemptId,
          reasonCode: "TASK_EXECUTION_FAILED",
          evidenceReferences: [{ type: "Execution Record", id: record.executionRecordId, hash: record.executionRecordHash }],
          actor: "IDE-160",
          sourceComponent: namespace.componentId
        });
      }
      internal.persistRuntimeIfAvailable();
      return internal.buildResult(false, "WORKFLOW_TASK_EXECUTION_FAILED", finalStatus, {
        executionRecord: internal.clone(record),
        verification: verification,
        mutationLock: lockRelease.data
      }, {
        error: invocation && invocation.error || { message: "Task Execution verification failed.", category: "Validation Failure", severity: "High" }
      });
    }
    const completion = completeExecutionIfReady(workflow, session, plan);
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "WORKFLOW_TASK_EXECUTED", "Succeeded", {
      executionRecord: internal.clone(record),
      verification: verification,
      mutationLock: lockRelease.data,
      sessionCompletion: completion && completion.data || null,
      workflowState: internal.clone(workflow.state)
    });
  }

  function executeWorkflowTask(workflowId, taskId, input, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = internal.isPlainObject(options) ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const container = ensureExecutionContainer(workflow);
    const session = container.currentSession;
    const plan = getActivePlanMutable(workflow);
    const task = getTaskMutable(plan, taskId);
    if (!session || !task) return internal.buildResult(false, "EXECUTION_CONTEXT_NOT_FOUND", "Blocked", null);
    const taskExecutionId = internal.nextId("IDE-160-TASK-EXECUTION");
    const preflightOptions = Object.assign({}, settings, { taskExecutionId: taskExecutionId });
    const preflight = preflightWorkflowTask(workflowId, taskId, preflightOptions);
    if (!preflight.ok) return preflight;
    const adapter = internal.findIDE160AdapterMutable(task.targetComponent);
    const lock = acquireMutationLock(workflow, session, task, taskExecutionId);
    if (!lock.ok) {
      setTaskExecutionState(session, task.taskId, "Blocked");
      return lock;
    }
    const startedAt = internal.nowIso();
    setTaskExecutionState(session, task.taskId, "Running");
    session.currentTaskId = task.taskId;
    createCheckpoint(workflow, session, task, isMutationTask(task) ? "Before Mutation" : "Before Dispatch", {
      taskExecutionId: taskExecutionId,
      adapterId: adapter.adapterId
    });
    const inputSnapshot = buildInputSnapshot(task, input);
    const executionRequest = {
      requestId: internal.nextId("IDE-160-EXECUTION-REQUEST"),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      executionSessionId: session.executionSessionId,
      taskExecutionId: taskExecutionId,
      taskId: task.taskId,
      taskVersion: task.taskVersion,
      targetComponent: task.targetComponent,
      targetCapability: task.requiredCapability,
      operationType: task.operationType,
      inputReference: internal.clone(task.inputReferences),
      inputHash: inputSnapshot.inputHash,
      expectedOutput: internal.clone(task.expectedOutput),
      precondition: internal.clone(task.preconditions),
      postcondition: internal.clone(task.postconditions),
      approvalReference: internal.clone(settings.approvalReference || null),
      validationRequirement: internal.clone(task.validationRequirement),
      rollbackRequirement: internal.clone(task.rollbackRequirement),
      repositoryContext: internal.clone(session.currentRepository),
      traceabilityReference: internal.clone(task.traceabilityReferences || [])
    };
    const context = {
      taskExecutionId: taskExecutionId,
      adapter: adapter,
      inputSnapshot: inputSnapshot,
      executionRequest: executionRequest,
      startedAt: startedAt
    };
    const invocation = namespace.api.invokeIDE160ComponentAdapter(
      adapter.adapterId,
      task.operationType,
      input,
      { approvalReference: settings.approvalReference, executionRequest: executionRequest }
    );
    if (invocation && typeof invocation.then === "function") {
      return invocation.then(function finalizeAsync(result) {
        return finalizeTaskExecution(workflow, session, plan, task, context, result, settings);
      }).catch(function catchAsync(error) {
        const failure = internal.buildResult(false, "TASK_EXECUTION_EXCEPTION", "Failed", null, {
          error: { message: error && error.message ? error.message : String(error), category: "Execution Failure", severity: "High" }
        });
        return finalizeTaskExecution(workflow, session, plan, task, context, failure, settings);
      });
    }
    return finalizeTaskExecution(workflow, session, plan, task, context, invocation, settings);
  }

  async function executeWorkflowPlan(workflowId, inputProvider, options) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const session = ensureExecutionContainer(workflow).currentSession;
    const plan = getActivePlanMutable(workflow);
    if (!session || !plan) return internal.buildResult(false, "EXECUTION_CONTEXT_NOT_FOUND", "Blocked", null);
    const results = [];
    for (const taskId of session.executionOrder) {
      if (getTaskExecutionState(session, taskId) === "Succeeded") continue;
      const task = getTaskMutable(plan, taskId);
      const provider = typeof inputProvider === "function" ? inputProvider(task, workflow) : inputProvider || {};
      const taskInput = provider && typeof provider.then === "function" ? await provider : provider;
      const taskOptions = internal.isPlainObject(options) && internal.isPlainObject(options.tasks) && options.tasks[taskId]
        ? options.tasks[taskId]
        : options;
      const result = await Promise.resolve(executeWorkflowTask(workflowId, taskId, taskInput, taskOptions));
      results.push(result);
      if (!result.ok) return internal.buildResult(false, "WORKFLOW_PLAN_EXECUTION_STOPPED", "Failed", { results: results, failedTaskId: taskId });
    }
    return internal.buildResult(true, "WORKFLOW_PLAN_EXECUTED", "Succeeded", {
      results: results,
      executionSummary: getWorkflowExecutionSummary(workflowId),
      workflowState: internal.clone(workflow.state)
    });
  }

  function getWorkflowExecutionSession(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    return workflow && workflow.execution ? internal.clone(workflow.execution.currentSession) : null;
  }

  function getWorkflowExecutionRecords(workflowId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const id = String(workflowId || "");
    return executionStore.records.filter(function filterRecord(record) {
      if (id && record.workflowId !== id) return false;
      if (settings.executionSessionId && record.executionSessionId !== settings.executionSessionId) return false;
      return true;
    }).map(internal.clone);
  }

  function getWorkflowExecutionSummary(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    return workflow && workflow.execution ? internal.clone(workflow.execution.executionSummary) : null;
  }

  function getIDE160MutationLockStatus() {
    return executionStore.mutationLock ? internal.clone(executionStore.mutationLock) : {
      status: "Available",
      active: false
    };
  }

  function cancelWorkflowExecution(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const container = ensureExecutionContainer(workflow);
    const session = container.currentSession;
    if (!session || session.status !== "Running") return internal.buildResult(false, "EXECUTION_SESSION_NOT_RUNNING", "Blocked", null);
    if (executionStore.mutationLock) {
      return internal.buildResult(false, "CANCELLATION_BLOCKED_BY_MUTATION", "Blocked", internal.clone(executionStore.mutationLock), {
        error: { message: "Cancellation is blocked until the Controlled Mutation reaches a Safe Point.", category: "Repository Integrity Failure", severity: "Critical" }
      });
    }
    const settings = internal.isPlainObject(options) ? options : {};
    const requested = namespace.api.requestWorkflowCancellationState(workflowId, {
      actor: internal.text(settings.actor, "Project Owner"),
      reasonCode: internal.text(settings.reasonCode, "EXECUTION_CANCELLATION_REQUESTED"),
      evidenceReferences: internal.asArray(settings.evidenceReferences).length
        ? settings.evidenceReferences
        : [{ type: "Execution Session", id: session.executionSessionId }]
    });
    if (!requested.ok) return requested;
    const cancelled = namespace.api.transitionWorkflowState(workflowId, {
      fromPhase: "Execution",
      fromStatus: "Cancelling",
      toPhase: "Execution",
      toStatus: "Cancelled",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "EXECUTION_CANCELLED_AT_SAFE_POINT",
      evidenceReferences: [{ type: "Safe Point", id: session.executionSessionId }],
      actor: internal.text(settings.actor, "Project Owner"),
      sourceComponent: namespace.componentId
    });
    session.status = "Cancelled";
    session.completedAt = internal.nowIso();
    container.status = "Cancelled";
    internal.persistRuntimeIfAvailable();
    return cancelled;
  }

  function validateWorkflowExecution(options) {
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: internal.text(group, "Execution") });
    }
    const originalState = internal.exportRuntimeState();
    const originalJournal = internal.transitionJournal ? internal.clone(internal.transitionJournal) : [];
    const originalRecords = internal.clone(executionStore.records);
    const originalCheckpoints = internal.clone(executionStore.checkpoints);
    const originalLock = internal.clone(executionStore.mutationLock);
    const originalSummary = internal.clone(executionStore.lastSummary);
    const originalValidation = internal.clone(state.lastValidation);
    const originalPersistence = internal.clone(state.lastPersistence);
    const originalError = internal.clone(state.lastError);
    const originalUpdatedAt = state.updatedAt;
    const testFunctionName = "__IDE160_PHASE3_EXECUTION_TEST__";
    const previousFunction = global[testFunctionName];
    const testAdapterId = "IDE-160-ADAPTER-EXECUTION-TEST";
    const previousAdapter = internal.adapterRegistry && internal.adapterRegistry.get(testAdapterId);

    global[testFunctionName] = function executePhase3Task(input) {
      if (input && input.mode === "mutation") {
        return {
          status: "Succeeded",
          repositoryResult: {
            applicationWriteVerified: true,
            postApplicationValidationPassed: true,
            rollbackVerified: true,
            sourceRestored: true,
            originalHash: "ORIGINAL-HASH",
            appliedHash: "APPLIED-HASH",
            restoredHash: "ORIGINAL-HASH",
            repositoryWriteCount: 1,
            persistentCommitExecuted: false,
            zipFileMutation: false
          },
          validationResult: { passed: true }
        };
      }
      return { status: "Succeeded", value: input && input.value, validationResult: { passed: true } };
    };

    const memory = namespace.api.createIDE160MemoryStorage();
    namespace.api.runWithIDE160Storage(memory, function runExecutionValidation() {
      try {
        internal.importRuntimeState({ definitions: [], workflows: [], activeWorkflowId: null });
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length);
        executionStore.records.splice(0, executionStore.records.length);
        executionStore.checkpoints.splice(0, executionStore.checkpoints.length);
        executionStore.mutationLock = null;
        executionStore.lastSummary = null;

        const adapterResult = namespace.api.registerIDE160ComponentAdapter({
          adapterId: testAdapterId,
          componentId: "IDE-160-EXECUTION-TEST-COMPONENT",
          componentVersion: "1.0.0",
          capabilities: ["Phase 3 Execution"],
          operations: { "Execute Read": testFunctionName, "Execute Mutation": testFunctionName },
          statusApi: testFunctionName,
          validatorApi: testFunctionName,
          rollbackCapability: true,
          cancellationCapability: true,
          idempotency: "Conditionally Idempotent",
          source: "Phase 3 Execution Validation"
        }, { replace: true, allowMultipleForComponent: true });
        check("Execution test adapter registered", adapterResult.ok === true, adapterResult.code, "Setup");

        const definitionResult = namespace.api.createWorkflowDefinition({
          workflowDefinitionId: "IDE-160-PHASE3-TEST-DEFINITION",
          workflowDefinitionVersion: "1.0.0",
          name: "Phase 3 Execution Validation",
          goal: "Validate Component Adapter and Controlled Step Execution",
          scope: { description: "Phase 3 isolated validation" },
          inputContract: { type: "Validation" },
          approvalRequirement: { workflowLevel: true },
          monitoringRequirement: { checkpoints: true },
          completionRequirement: { executionSummary: true },
          repositoryBaseline: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE3-BASELINE",
            repositoryHash: "PHASE3-REPOSITORY-HASH",
            sourceCount: 108
          },
          handoffTarget: "IDE-170"
        });
        check("Execution Definition created", definitionResult.ok === true, definitionResult.code, "Setup");
        const workflowResult = namespace.api.createWorkflow("IDE-160-PHASE3-TEST-DEFINITION", { test: true }, { workflowId: "IDE-160-PHASE3-TEST-WORKFLOW" });
        check("Execution Workflow created", workflowResult.ok === true, workflowResult.code, "Setup");
        const started = namespace.api.startWorkflow("IDE-160-PHASE3-TEST-WORKFLOW", { actor: "Validation" });
        check("Workflow entered Planning", started.ok === true, started.code, "Setup");

        const candidate = namespace.api.createCandidatePlan("IDE-160-PHASE3-TEST-WORKFLOW", {
          goal: "Execute three controlled test tasks",
          scope: { description: "Phase 3 execution" },
          repositoryBinding: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE3-BASELINE",
            repositoryHash: "PHASE3-REPOSITORY-HASH",
            sourceCount: 108
          },
          componentBindings: [{ componentId: "IDE-160-EXECUTION-TEST-COMPONENT", componentVersion: "1.0.0", capability: "Phase 3 Execution" }],
          tasks: [
            {
              taskId: "TASK-PHASE3-READ-1",
              taskName: "Read Task 1",
              targetComponent: "IDE-160-EXECUTION-TEST-COMPONENT",
              requiredCapability: "Phase 3 Execution",
              operationType: "Execute Read",
              inputReferences: [{ id: "INPUT-1" }],
              expectedOutput: { requiredFields: ["value"] },
              validationRequirement: { required: true, mode: "Result Contract" },
              evidenceRequirement: [{ id: "EVIDENCE-1" }],
              sideEffectType: "Read-Only"
            },
            {
              taskId: "TASK-PHASE3-READ-2",
              taskName: "Read Task 2",
              targetComponent: "IDE-160-EXECUTION-TEST-COMPONENT",
              requiredCapability: "Phase 3 Execution",
              operationType: "Execute Read",
              dependencies: ["TASK-PHASE3-READ-1"],
              inputReferences: [{ id: "INPUT-2" }],
              expectedOutput: { requiredFields: ["value"] },
              validationRequirement: { required: true, mode: "Result Contract" },
              evidenceRequirement: [{ id: "EVIDENCE-2" }],
              sideEffectType: "Read-Only"
            },
            {
              taskId: "TASK-PHASE3-MUTATION",
              taskName: "Controlled Mutation Simulation",
              targetComponent: "IDE-160-EXECUTION-TEST-COMPONENT",
              requiredCapability: "Phase 3 Execution",
              operationType: "Execute Mutation",
              dependencies: ["TASK-PHASE3-READ-2"],
              inputReferences: [{ id: "INPUT-3" }],
              expectedOutput: { requiredFields: ["repositoryResult"] },
              validationRequirement: { required: true, mode: "Result Contract" },
              approvalRequirement: { required: true, type: "Component-Level Approval" },
              rollbackRequirement: { required: true, type: "Mandatory Rollback" },
              mutationScope: { targetFile: "phase3_test.js", targetFunction: "sourceName" },
              evidenceRequirement: [{ id: "EVIDENCE-3" }],
              sideEffectType: "Controlled Mutation"
            }
          ],
          completionConditions: [{ type: "All Tasks Succeeded" }],
          evidenceReferences: [{ type: "Phase 3 Validation", id: "EVIDENCE-PHASE3" }]
        }, { planId: "IDE-160-PHASE3-PLAN", actor: "Validation" });
        check("Execution Candidate Plan created", candidate.ok === true, candidate.code, "Planning");
        const validated = namespace.api.validateCandidatePlan("IDE-160-PHASE3-TEST-WORKFLOW", "IDE-160-PHASE3-PLAN");
        check("Execution Plan validated", validated.ok === true, validated.code, "Planning");
        const selected = namespace.api.selectActivePlan("IDE-160-PHASE3-TEST-WORKFLOW", "IDE-160-PHASE3-PLAN", {
          selectionReason: "Phase 3 Validation Plan",
          evidenceReferences: [{ type: "Validation", id: "PLAN-VALID" }],
          actor: "Project Owner"
        });
        check("Execution Plan selected", selected.ok === true, selected.code, "Planning");
        const frozen = namespace.api.freezeActivePlan("IDE-160-PHASE3-TEST-WORKFLOW", {
          actor: "Project Owner",
          currentRepository: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE3-BASELINE",
            repositoryHash: "PHASE3-REPOSITORY-HASH"
          }
        });
        check("Execution Plan frozen", frozen.ok === true, frozen.code, "Planning");

        const mismatchSession = createExecutionSession("IDE-160-PHASE3-TEST-WORKFLOW", {
          currentRepository: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE3-BASELINE",
            repositoryHash: "WRONG-HASH"
          }
        });
        check("Repository mismatch blocked", mismatchSession.ok === false && mismatchSession.code === "EXECUTION_REPOSITORY_BASELINE_MISMATCH", mismatchSession.code, "Repository");
        const sessionResult = createExecutionSession("IDE-160-PHASE3-TEST-WORKFLOW", {
          actor: "Validation",
          currentRepository: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE3-BASELINE",
            repositoryHash: "PHASE3-REPOSITORY-HASH"
          }
        });
        check("Execution Session created", sessionResult.ok === true, sessionResult.code, "Session");
        check("Execution state Running", namespace.api.getWorkflowState("IDE-160-PHASE3-TEST-WORKFLOW").controlStatus === "Running", JSON.stringify(namespace.api.getWorkflowState("IDE-160-PHASE3-TEST-WORKFLOW")), "Session");

        const dependencyBlocked = preflightWorkflowTask("IDE-160-PHASE3-TEST-WORKFLOW", "TASK-PHASE3-READ-2", {});
        check("Dependency order enforced", dependencyBlocked.ok === false, dependencyBlocked.code, "Preflight");
        const first = executeWorkflowTask("IDE-160-PHASE3-TEST-WORKFLOW", "TASK-PHASE3-READ-1", { value: "first" }, {});
        check("First Task executed", first.ok === true, first.code, "Execution");
        const second = executeWorkflowTask("IDE-160-PHASE3-TEST-WORKFLOW", "TASK-PHASE3-READ-2", { value: "second" }, {});
        check("Second Task executed", second.ok === true, second.code, "Execution");
        const approvalBlocked = preflightWorkflowTask("IDE-160-PHASE3-TEST-WORKFLOW", "TASK-PHASE3-MUTATION", {});
        check("Mutation approval enforced", approvalBlocked.ok === false, approvalBlocked.code, "Approval");
        const mutation = executeWorkflowTask("IDE-160-PHASE3-TEST-WORKFLOW", "TASK-PHASE3-MUTATION", { mode: "mutation" }, {
          approvalReference: { approvalId: "PHASE3-COMPONENT-APPROVAL", approved: true, actor: "Project Owner" }
        });
        check("Controlled Mutation executed", mutation.ok === true, mutation.code, "Execution");
        check("Mandatory Rollback verified", mutation.ok === true && mutation.data.verification.mutationVerified === true, JSON.stringify(mutation.data && mutation.data.verification), "Rollback");
        check("Mutation Lock released", getIDE160MutationLockStatus().active === false, JSON.stringify(getIDE160MutationLockStatus()), "Mutation Lock");
        const records = getWorkflowExecutionRecords("IDE-160-PHASE3-TEST-WORKFLOW");
        check("Execution Records appended", records.length === 3, "count=" + records.length, "Record");
        check("Execution Record hash chain", records.every(function everyRecord(record, index) {
          return index === 0 ? record.previousExecutionRecordHash == null : record.previousExecutionRecordHash === records[index - 1].executionRecordHash;
        }), "hash chain", "Integrity");
        const summary = getWorkflowExecutionSummary("IDE-160-PHASE3-TEST-WORKFLOW");
        check("Execution Summary generated", Boolean(summary && summary.succeededTaskCount === 3 && summary.integrity), summary && summary.executionSummaryId, "Summary");
        const finalState = namespace.api.getWorkflowState("IDE-160-PHASE3-TEST-WORKFLOW");
        check("Decision handoff ready", finalState.primaryPhase === "Decision" && finalState.controlStatus === "Ready", JSON.stringify(finalState), "State");
        const session = getWorkflowExecutionSession("IDE-160-PHASE3-TEST-WORKFLOW");
        check("Session metrics captured", session && session.metrics.executedTaskCount === 3 && session.metrics.rollbackCount === 1, JSON.stringify(session && session.metrics), "Metrics");
        check("Persistent commit prohibited", summary && summary.repositoryIntegrity.persistentCommitExecuted === false, String(summary && summary.repositoryIntegrity.persistentCommitExecuted), "Safety");
        check("ZIP mutation prohibited", summary && summary.repositoryIntegrity.zipFileMutation === false, String(summary && summary.repositoryIntegrity.zipFileMutation), "Safety");
      } finally {
        internal.importRuntimeState(originalState);
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length, ...originalJournal);
        executionStore.records.splice(0, executionStore.records.length, ...originalRecords);
        executionStore.checkpoints.splice(0, executionStore.checkpoints.length, ...originalCheckpoints);
        executionStore.mutationLock = originalLock;
        executionStore.lastSummary = originalSummary;
        state.lastValidation = originalValidation;
        state.lastPersistence = originalPersistence;
        state.lastError = originalError;
        state.updatedAt = originalUpdatedAt;
        if (previousFunction === undefined) delete global[testFunctionName];
        else global[testFunctionName] = previousFunction;
        if (internal.adapterRegistry) {
          if (previousAdapter) internal.adapterRegistry.set(testAdapterId, previousAdapter);
          else internal.adapterRegistry.delete(testAdapterId);
        }
      }
    });

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
      id: internal.nextId("IDE-160-EXECUTION-VALIDATION"),
      componentId: namespace.componentId,
      version: VERSION,
      mode: internal.text(options && options.mode, "Phase 3 Workflow Execution"),
      valid: failed === 0,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      status: failed === 0 ? "Passed" : "Failed",
      groups: groups,
      checks: checks,
      warnings: [],
      storageIsolation: true,
      executedAt: internal.nowIso()
    };
  }

  namespace.constants.TASK_EXECUTION_STATUSES = TASK_EXECUTION_STATUSES;
  namespace.constants.EXECUTION_TYPES = EXECUTION_TYPES;

  Object.assign(internal, {
    executionStore: executionStore,
    ensureIDE160ExecutionContainer: ensureExecutionContainer,
    getIDE160ActivePlanMutable: getActivePlanMutable,
    getIDE160TaskMutable: getTaskMutable,
    createIDE160ExecutionCheckpoint: createCheckpoint,
    appendIDE160ExecutionRecord: appendExecutionRecord
  });

  Object.assign(namespace.api, {
    createExecutionSession: createExecutionSession,
    preflightWorkflowTask: preflightWorkflowTask,
    executeWorkflowTask: executeWorkflowTask,
    executeWorkflowPlan: executeWorkflowPlan,
    getWorkflowExecutionSession: getWorkflowExecutionSession,
    getWorkflowExecutionRecords: getWorkflowExecutionRecords,
    getWorkflowExecutionSummary: getWorkflowExecutionSummary,
    getIDE160MutationLockStatus: getIDE160MutationLockStatus,
    cancelWorkflowExecution: cancelWorkflowExecution,
    validateWorkflowExecution: validateWorkflowExecution
  });

  namespace.modules.execution = {
    id: "IDE-160-EXECUTION",
    version: VERSION,
    status: "Ready",
    executionTypeCount: EXECUTION_TYPES.length,
    taskStatusCount: TASK_EXECUTION_STATUSES.length,
    serialExecutionDefault: true,
    maximumConcurrentMutation: 1,
    loadedAt: internal.nowIso()
  };

  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);