/* ============================================================
   FILE: 13_ai_development_workflow_state.js
   IDE-160 AI Development Workflow State / Failure / Recovery
   Version: 1.3.0
   Phase: 3 - Component Adapter / Workflow Execution Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;

  const PRIMARY_PHASES = Object.freeze([
    "Definition",
    "Planning",
    "Execution",
    "Decision",
    "Approval",
    "Monitoring",
    "Context Packaging",
    "Completion Gate",
    "Completed"
  ]);

  const CONTROL_STATUSES = Object.freeze([
    "Pending",
    "Ready",
    "Running",
    "Waiting",
    "Blocked",
    "Failed",
    "Rejected",
    "Retry Required",
    "Cancelling",
    "Cancelled",
    "Rolling Back",
    "Rolled Back",
    "Succeeded"
  ]);

  const FAILURE_CATEGORIES = Object.freeze([
    "Input Failure",
    "Dependency Failure",
    "Policy Failure",
    "Approval Failure",
    "Execution Failure",
    "Validation Failure",
    "Repository Integrity Failure",
    "Rollback Failure",
    "Persistence Failure",
    "System Failure",
    "Unknown Failure"
  ]);

  const FAILURE_SEVERITIES = Object.freeze(["Critical", "High", "Medium", "Low"]);
  const RETRY_ELIGIBILITY = Object.freeze(["Retryable", "Conditionally Retryable", "Non-Retryable"]);
  const RECOVERY_LEVELS = Object.freeze(["Local Recovery", "Plan Recovery", "Workflow Recovery"]);
  const RETRY_LIMITS = Object.freeze({
    initialAttempt: 1,
    automaticRetry: 1,
    humanGovernedRetry: 1,
    totalAttempts: 3
  });

  const transitionJournal = [];
  const foundationRecordStore = {
    failures: [],
    recoveries: [],
    attempts: [],
    decisions: []
  };

  const STATUS_TRANSITIONS = Object.freeze({
    "Pending": ["Ready", "Blocked", "Cancelling", "Cancelled"],
    "Ready": ["Running", "Blocked", "Cancelling", "Cancelled"],
    "Running": ["Waiting", "Blocked", "Failed", "Rejected", "Succeeded", "Cancelling", "Rolling Back"],
    "Waiting": ["Ready", "Blocked", "Failed", "Rejected", "Cancelling", "Cancelled"],
    "Blocked": ["Retry Required", "Ready", "Failed", "Cancelling", "Cancelled"],
    "Failed": ["Retry Required", "Rolling Back", "Cancelled"],
    "Rejected": ["Retry Required", "Cancelling", "Cancelled", "Failed"],
    "Retry Required": ["Ready", "Cancelled"],
    "Cancelling": ["Rolling Back", "Cancelled", "Failed"],
    "Rolling Back": ["Rolled Back", "Failed"],
    "Rolled Back": ["Retry Required", "Cancelled", "Failed"],
    "Succeeded": [],
    "Cancelled": []
  });

  function phaseIndex(phase) {
    return PRIMARY_PHASES.indexOf(String(phase || ""));
  }

  function isKnownState(phase, status) {
    return phaseIndex(phase) >= 0 && CONTROL_STATUSES.includes(String(status || ""));
  }

  function isTerminalWorkflowState(phase, status) {
    return (phase === "Completed" && status === "Succeeded") || status === "Cancelled" || (status === "Failed" && phase === "Completion Gate");
  }

  function isTransitionAllowed(fromPhase, fromStatus, toPhase, toStatus) {
    if (!isKnownState(fromPhase, fromStatus) || !isKnownState(toPhase, toStatus)) return false;
    if (fromPhase === "Completed") return false;

    if (fromPhase === toPhase) {
      if (fromStatus === "Succeeded") return false;
      return Boolean(STATUS_TRANSITIONS[fromStatus] && STATUS_TRANSITIONS[fromStatus].includes(toStatus));
    }

    const fromIndex = phaseIndex(fromPhase);
    const toIndex = phaseIndex(toPhase);
    const standardAdvance = toIndex === fromIndex + 1 && fromStatus === "Succeeded" && toStatus === "Ready";
    if (standardAdvance) return true;

    const recoveryBackward = toIndex < fromIndex && (fromStatus === "Retry Required" || fromStatus === "Blocked" || fromStatus === "Failed" || fromStatus === "Rejected") && toStatus === "Ready";
    if (recoveryBackward) return true;

    return false;
  }

  function restorePersistedFoundationRecords() {
    if (!namespace.api.loadTransitionJournal || !namespace.api.loadFoundationRecordStore) return;
    const journal = namespace.api.loadTransitionJournal();
    if (journal && Array.isArray(journal.records)) {
      transitionJournal.splice(0, transitionJournal.length, ...journal.records.slice(-300));
    }
    const records = namespace.api.loadFoundationRecordStore();
    if (records && records.store) {
      foundationRecordStore.failures = Array.isArray(records.store.failures) ? records.store.failures.slice(-100) : [];
      foundationRecordStore.recoveries = Array.isArray(records.store.recoveries) ? records.store.recoveries.slice(-100) : [];
      foundationRecordStore.attempts = Array.isArray(records.store.attempts) ? records.store.attempts.slice(-100) : [];
      foundationRecordStore.decisions = Array.isArray(records.store.decisions) ? records.store.decisions.slice(-50) : [];
    }
  }

  function persistFoundationRecords() {
    const results = {};
    if (typeof namespace.api.persistTransitionJournal === "function") {
      results.transitionJournal = namespace.api.persistTransitionJournal(transitionJournal);
    }
    if (typeof namespace.api.persistFoundationRecordStore === "function") {
      results.recordStore = namespace.api.persistFoundationRecordStore(foundationRecordStore);
    }
    return results;
  }

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function appendTransition(workflow, request) {
    const previous = transitionJournal.length ? transitionJournal[transitionJournal.length - 1] : null;
    const recordWithoutHash = {
      transitionId: internal.nextId("IDE-160-TRANSITION"),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      fromPhase: request.fromPhase,
      fromStatus: request.fromStatus,
      toPhase: request.toPhase,
      toStatus: request.toStatus,
      reasonCode: internal.text(request.reasonCode, "STATE_TRANSITION"),
      actor: internal.text(request.actor, "IDE-160"),
      sourceComponent: internal.text(request.sourceComponent, namespace.componentId),
      evidenceReferences: internal.asArray(request.evidenceReferences).map(internal.clone),
      previousTransitionHash: previous ? previous.transitionHash : null,
      createdAt: internal.nowIso()
    };
    const integrity = internal.hashCanonicalSync(recordWithoutHash);
    const record = Object.assign({}, recordWithoutHash, {
      hashAlgorithm: integrity.algorithm,
      transitionHash: integrity.hash
    });
    transitionJournal.push(record);
    while (transitionJournal.length > 300) transitionJournal.shift();
    return record;
  }

  function transitionWorkflowState(workflowId, transitionRequest) {
    const workflow = getWorkflowMutable(workflowId);
    const request = transitionRequest && typeof transitionRequest === "object" ? transitionRequest : {};
    if (!workflow) {
      return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null, {
        error: { message: "Workflow not found.", category: "Input Failure", severity: "High" }
      });
    }
    const current = workflow.state;
    const fromPhase = internal.text(request.fromPhase, "");
    const fromStatus = internal.text(request.fromStatus, "");
    const toPhase = internal.text(request.toPhase, "");
    const toStatus = internal.text(request.toStatus, "");
    const reasonCode = internal.text(request.reasonCode, "");
    const evidence = internal.asArray(request.evidenceReferences);

    if (workflow.currentAttempt.attemptId !== request.attemptId) {
      return internal.buildResult(false, "ATTEMPT_ID_MISMATCH", "Blocked", {
        expected: workflow.currentAttempt.attemptId,
        actual: request.attemptId || null
      }, {
        error: { message: "Transition Attempt ID does not match the active Attempt.", category: "Input Failure", severity: "High" }
      });
    }
    if (current.primaryPhase !== fromPhase || current.controlStatus !== fromStatus) {
      return internal.buildResult(false, "STATE_SOURCE_MISMATCH", "Blocked", {
        current: { phase: current.primaryPhase, status: current.controlStatus },
        requested: { phase: fromPhase, status: fromStatus }
      }, {
        error: { message: "Transition source does not match current state.", category: "Input Failure", severity: "High" }
      });
    }
    if (!reasonCode) {
      return internal.buildResult(false, "TRANSITION_REASON_REQUIRED", "Blocked", null, {
        error: { message: "Transition Reason is required.", category: "Input Failure", severity: "Medium" }
      });
    }
    if (!evidence.length) {
      return internal.buildResult(false, "TRANSITION_EVIDENCE_REQUIRED", "Blocked", null, {
        error: { message: "Transition Evidence is required.", category: "Input Failure", severity: "High" }
      });
    }
    if (!isTransitionAllowed(fromPhase, fromStatus, toPhase, toStatus)) {
      return internal.buildResult(false, "TRANSITION_NOT_ALLOWED", "Blocked", {
        from: { phase: fromPhase, status: fromStatus },
        to: { phase: toPhase, status: toStatus }
      }, {
        error: { message: "Requested state transition is not allowed.", category: "Policy Failure", severity: "High" }
      });
    }

    const record = appendTransition(workflow, {
      fromPhase: fromPhase,
      fromStatus: fromStatus,
      toPhase: toPhase,
      toStatus: toStatus,
      reasonCode: reasonCode,
      actor: request.actor,
      sourceComponent: request.sourceComponent,
      evidenceReferences: evidence
    });

    if (!Array.isArray(workflow.currentAttempt.phasesEntered)) {
      workflow.currentAttempt.phasesEntered = [workflow.currentAttempt.targetPhase || current.primaryPhase];
    }
    if (!workflow.currentAttempt.phasesEntered.includes(toPhase)) {
      workflow.currentAttempt.phasesEntered.push(toPhase);
    }
    workflow.currentAttempt.updatedAt = record.createdAt;
    workflow.state.previousPhase = current.primaryPhase;
    workflow.state.previousStatus = current.controlStatus;
    workflow.state.primaryPhase = toPhase;
    workflow.state.controlStatus = toStatus;
    workflow.state.lastTransitionId = record.transitionId;
    workflow.state.stateVersion += 1;
    workflow.state.enteredAt = record.createdAt;
    workflow.state.updatedAt = record.createdAt;
    workflow.updatedAt = record.createdAt;
    workflow.context.currentPhase = toPhase;
    workflow.context.currentStatus = toStatus;
    workflow.context.timeline.push({
      type: "State Transition",
      transitionId: record.transitionId,
      phase: toPhase,
      status: toStatus,
      at: record.createdAt
    });
    workflow.context.updatedAt = record.createdAt;
    workflow.timeline.push({ type: "State Transition", transitionId: record.transitionId, at: record.createdAt });

    if (isTerminalWorkflowState(toPhase, toStatus)) {
      internal.closeWorkflow(workflow.identity.workflowId, toStatus === "Cancelled" ? "Cancelled" : toPhase === "Completed" ? "Completed" : "Failed");
    } else {
      internal.touch();
      internal.persistRuntimeIfAvailable();
    }
    const persistence = persistFoundationRecords();
    return internal.buildResult(true, "STATE_TRANSITION_APPLIED", "Applied", {
      transition: record,
      state: internal.clone(workflow.state),
      persistence: persistence
    }, {
      evidence: evidence
    });
  }

  function getWorkflowState(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    return workflow ? internal.clone(workflow.state) : null;
  }

  function getTransitionJournal(workflowId) {
    const target = String(workflowId || "");
    return transitionJournal.filter(function filterRecord(record) {
      return !target || record.workflowId === target;
    }).map(internal.clone);
  }

  function classifyFailure(input) {
    const source = input && typeof input === "object" ? input : {};
    const category = FAILURE_CATEGORIES.includes(source.category) ? source.category : "Unknown Failure";
    const severity = FAILURE_SEVERITIES.includes(source.severity) ? source.severity : "High";
    let eligibility = RETRY_ELIGIBILITY.includes(source.retryEligibility) ? source.retryEligibility : "Conditionally Retryable";
    if (["Critical"].includes(severity) || [
      "Policy Failure",
      "Approval Failure",
      "Repository Integrity Failure",
      "Rollback Failure",
      "Unknown Failure"
    ].includes(category) || source.evidenceMissing === true) {
      eligibility = "Non-Retryable";
    }
    return { category: category, severity: severity, retryEligibility: eligibility };
  }

  function createFailureRecord(workflowId, input) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const source = input && typeof input === "object" ? input : {};
    const classification = classifyFailure(source);
    const evidence = internal.asArray(source.evidenceReferences || source.evidence);
    if (!evidence.length) {
      return internal.buildResult(false, "FAILURE_EVIDENCE_REQUIRED", "Blocked", null, {
        error: { message: "Failure Evidence is required.", category: "Input Failure", severity: "High" }
      });
    }
    const record = {
      failureId: internal.nextId("IDE-160-FAILURE"),
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      primaryPhase: workflow.state.primaryPhase,
      controlStatus: workflow.state.controlStatus,
      category: classification.category,
      code: internal.text(source.code, "IDE160_FAILURE"),
      severity: classification.severity,
      retryEligibility: classification.retryEligibility,
      directCause: internal.text(source.directCause, ""),
      probableCause: internal.text(source.probableCause, ""),
      missingEvidence: internal.asArray(source.missingEvidence).map(String),
      expectedResult: internal.clone(source.expectedResult || null),
      actualResult: internal.clone(source.actualResult || null),
      evidenceReferences: evidence.map(internal.clone),
      affectedComponent: internal.text(source.affectedComponent, namespace.componentId),
      affectedFile: internal.text(source.affectedFile, ""),
      affectedFunction: internal.text(source.affectedFunction, ""),
      repositoryVersion: internal.text(source.repositoryVersion, "Not Evaluated"),
      repositoryHash: internal.text(source.repositoryHash, "Not Evaluated"),
      rollbackRequired: source.rollbackRequired === true,
      rollbackResult: internal.clone(source.rollbackResult || null),
      recommendedRecoveryLevel: RECOVERY_LEVELS.includes(source.recommendedRecoveryLevel)
        ? source.recommendedRecoveryLevel
        : classification.severity === "Critical" ? "Workflow Recovery" : "Local Recovery",
      recommendedNextAction: internal.text(source.recommendedNextAction, "Human Decision"),
      status: "Open",
      createdAt: internal.nowIso(),
      traceabilityReference: internal.clone(source.traceabilityReference || null)
    };
    const integrity = internal.hashCanonicalSync(record);
    record.hashAlgorithm = integrity.algorithm;
    record.recordHash = integrity.hash;
    foundationRecordStore.failures.push(record);
    while (foundationRecordStore.failures.length > 100) foundationRecordStore.failures.shift();
    workflow.failures.push(record.failureId);
    workflow.context.failureReferences.push(record.failureId);
    workflow.updatedAt = record.createdAt;
    internal.touch();
    internal.persistRuntimeIfAvailable();
    const persistence = persistFoundationRecords();
    return internal.buildResult(true, "FAILURE_RECORD_CREATED", "Recorded", {
      failure: record,
      persistence: persistence
    }, { evidence: evidence });
  }

  function getFailureRecord(failureId) {
    const id = String(failureId || "");
    return internal.clone(foundationRecordStore.failures.find(function find(item) { return item.failureId === id; }) || null);
  }

  function listFailureRecords(workflowId) {
    const id = String(workflowId || "");
    return foundationRecordStore.failures.filter(function filter(item) {
      return !id || item.workflowId === id;
    }).map(internal.clone);
  }

  function createRecoveryDecision(workflowId, input) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const source = input && typeof input === "object" ? input : {};
    const failure = foundationRecordStore.failures.find(function find(item) { return item.failureId === source.failureId; });
    if (!failure || failure.workflowId !== workflow.identity.workflowId) {
      return internal.buildResult(false, "FAILURE_RECORD_NOT_FOUND", "Blocked", null, {
        error: { message: "Recovery Decision requires a valid Failure Record.", category: "Input Failure", severity: "High" }
      });
    }
    const level = RECOVERY_LEVELS.includes(source.selectedRecoveryLevel)
      ? source.selectedRecoveryLevel
      : failure.recommendedRecoveryLevel;
    const retryAllowed = source.retryAllowed === true && failure.retryEligibility !== "Non-Retryable";
    const evidence = internal.asArray(source.evidenceReferences || failure.evidenceReferences);
    const record = {
      recoveryDecisionId: internal.nextId("IDE-160-RECOVERY"),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      failureId: failure.failureId,
      selectedRecoveryLevel: level,
      retryAllowed: retryAllowed,
      retryScope: internal.clone(source.retryScope || null),
      targetPhase: internal.text(source.targetPhase, workflow.state.primaryPhase),
      requiredPlanRevision: source.requiredPlanRevision === true,
      requiredApproval: source.requiredApproval === true,
      requiredRollback: source.requiredRollback === true || failure.rollbackRequired === true,
      risk: internal.text(source.risk, failure.severity),
      reason: internal.text(source.reason, "Recovery Decision"),
      actor: internal.text(source.actor, "Project Owner"),
      evidenceReferences: evidence.map(internal.clone),
      status: "Approved",
      createdAt: internal.nowIso()
    };
    const integrity = internal.hashCanonicalSync(record);
    record.hashAlgorithm = integrity.algorithm;
    record.recordHash = integrity.hash;
    foundationRecordStore.recoveries.push(record);
    while (foundationRecordStore.recoveries.length > 100) foundationRecordStore.recoveries.shift();
    workflow.recoveries.push(record.recoveryDecisionId);
    workflow.context.recoveryReferences.push(record.recoveryDecisionId);
    workflow.updatedAt = record.createdAt;
    internal.touch();
    internal.persistRuntimeIfAvailable();
    const persistence = persistFoundationRecords();
    return internal.buildResult(true, "RECOVERY_DECISION_CREATED", "Approved", {
      recoveryDecision: record,
      persistence: persistence
    }, { evidence: evidence });
  }

  function countPhaseAttempts(workflow, phase) {
    return internal.asArray(workflow.attempts).filter(function filter(item) {
      return (Array.isArray(item.phasesEntered) && item.phasesEntered.includes(phase)) || item.targetPhase === phase;
    }).length;
  }

  function createRetryAttempt(workflowId, input) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const source = input && typeof input === "object" ? input : {};
    const recovery = foundationRecordStore.recoveries.find(function find(item) {
      return item.recoveryDecisionId === source.recoveryDecisionId;
    });
    if (!recovery || recovery.workflowId !== workflow.identity.workflowId || recovery.retryAllowed !== true) {
      return internal.buildResult(false, "RETRY_NOT_AUTHORIZED", "Blocked", null, {
        error: { message: "Retry requires an authorized Recovery Decision.", category: "Policy Failure", severity: "High" }
      });
    }
    if (!["Blocked", "Failed", "Rejected", "Rolled Back", "Retry Required"].includes(workflow.state.controlStatus)) {
      return internal.buildResult(false, "RETRY_STATE_INVALID", "Blocked", {
        currentState: internal.clone(workflow.state)
      }, {
        error: { message: "Retry can only start from a controlled failure or recovery state.", category: "Policy Failure", severity: "High" }
      });
    }
    const targetPhase = internal.text(source.targetPhase, recovery.targetPhase);
    const attemptCount = countPhaseAttempts(workflow, targetPhase);
    if (attemptCount >= RETRY_LIMITS.totalAttempts) {
      return internal.buildResult(false, "RETRY_BUDGET_EXCEEDED", "Blocked", {
        targetPhase: targetPhase,
        attempts: attemptCount,
        maximum: RETRY_LIMITS.totalAttempts
      }, {
        error: { message: "Retry Budget exceeded.", category: "Policy Failure", severity: "High" }
      });
    }

    const evidence = [{ type: "Recovery Decision", id: recovery.recoveryDecisionId }];
    if (workflow.state.controlStatus !== "Retry Required") {
      const retryRequired = transitionWorkflowState(workflowId, {
        fromPhase: workflow.state.primaryPhase,
        fromStatus: workflow.state.controlStatus,
        toPhase: workflow.state.primaryPhase,
        toStatus: "Retry Required",
        attemptId: workflow.currentAttempt.attemptId,
        reasonCode: "RETRY_AUTHORIZED",
        evidenceReferences: evidence,
        actor: internal.text(source.actor, "Project Owner"),
        sourceComponent: namespace.componentId
      });
      if (!retryRequired.ok) return retryRequired;
    }

    const timestamp = internal.nowIso();
    const previousAttempt = workflow.currentAttempt;
    const attempt = {
      attemptId: internal.nextId("IDE-160-ATTEMPT"),
      workflowId: workflow.identity.workflowId,
      sequence: workflow.attempts.length + 1,
      reason: internal.text(source.reason, recovery.reason),
      targetPhase: targetPhase,
      phasesEntered: [targetPhase],
      status: "Active",
      retryType: attemptCount === 1 ? "Automatic Retry" : "Human-Governed Retry",
      previousAttemptId: previousAttempt.attemptId,
      recoveryDecisionId: recovery.recoveryDecisionId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    previousAttempt.status = "Superseded";
    previousAttempt.updatedAt = timestamp;
    workflow.currentAttempt = attempt;
    workflow.attempts.push(attempt);
    workflow.context.attemptId = attempt.attemptId;

    const readyTransition = transitionWorkflowState(workflowId, {
      fromPhase: workflow.state.primaryPhase,
      fromStatus: "Retry Required",
      toPhase: targetPhase,
      toStatus: "Ready",
      attemptId: attempt.attemptId,
      reasonCode: "NEW_RETRY_ATTEMPT",
      evidenceReferences: evidence,
      actor: internal.text(source.actor, "Project Owner"),
      sourceComponent: namespace.componentId
    });
    if (!readyTransition.ok) {
      workflow.currentAttempt = previousAttempt;
      workflow.attempts.pop();
      previousAttempt.status = "Active";
      return readyTransition;
    }

    foundationRecordStore.attempts.push(internal.clone(attempt));
    while (foundationRecordStore.attempts.length > 100) foundationRecordStore.attempts.shift();
    const runtimePersistence = internal.persistRuntimeIfAvailable();
    const recordPersistence = persistFoundationRecords();
    return internal.buildResult(true, "RETRY_ATTEMPT_CREATED", "Ready", {
      attempt: attempt,
      transition: readyTransition.data && readyTransition.data.transition,
      retryBudget: getRetryBudget(workflowId, targetPhase),
      persistence: { runtime: runtimePersistence, records: recordPersistence }
    });
  }

  function getRetryBudget(workflowId, phase) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return null;
    const targetPhase = internal.text(phase, workflow.state.primaryPhase);
    const used = countPhaseAttempts(workflow, targetPhase);
    return {
      targetPhase: targetPhase,
      usedAttempts: used,
      remainingAttempts: Math.max(0, RETRY_LIMITS.totalAttempts - used),
      maximumAttempts: RETRY_LIMITS.totalAttempts,
      automaticRetryMaximum: RETRY_LIMITS.automaticRetry,
      humanGovernedRetryMaximum: RETRY_LIMITS.humanGovernedRetry
    };
  }

  function requestWorkflowCancellationState(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const settings = options && typeof options === "object" ? options : {};
    const current = workflow.state;
    if (["Cancelled", "Succeeded"].includes(current.controlStatus) || current.primaryPhase === "Completed") {
      return internal.buildResult(false, "WORKFLOW_ALREADY_TERMINAL", "Blocked", internal.clone(current));
    }
    const transition = transitionWorkflowState(workflowId, {
      fromPhase: current.primaryPhase,
      fromStatus: current.controlStatus,
      toPhase: current.primaryPhase,
      toStatus: "Cancelling",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: internal.text(settings.reasonCode, "CANCELLATION_REQUESTED"),
      evidenceReferences: internal.asArray(settings.evidenceReferences).length
        ? settings.evidenceReferences
        : [{ type: "Human Cancellation Request", actor: internal.text(settings.actor, "Project Owner") }],
      actor: internal.text(settings.actor, "Project Owner"),
      sourceComponent: namespace.componentId
    });
    return transition;
  }

  function validateWorkflowFoundation(options) {
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group || "Foundation" });
    }

    const memory = namespace.api.createIDE160MemoryStorage();
    const testResult = namespace.api.runWithIDE160Storage(memory, function runValidation() {
      const originalState = internal.exportRuntimeState();
      const originalJournal = transitionJournal.slice();
      const originalRecords = internal.clone(foundationRecordStore);
      const originalValidation = state.lastValidation;
      const originalPersistence = internal.clone(state.lastPersistence);
      const originalError = internal.clone(state.lastError);
      const originalUpdatedAt = state.updatedAt;
      try {
        state.definitions.clear();
        state.workflows.clear();
        state.activeWorkflowId = null;
        transitionJournal.splice(0, transitionJournal.length);
        foundationRecordStore.failures = [];
        foundationRecordStore.recoveries = [];
        foundationRecordStore.attempts = [];
        foundationRecordStore.decisions = [];

        check("Namespace available", Boolean(global.AIPromptOSIDE160), "window.AIPromptOSIDE160", "Core");
        check("Core module loaded", Boolean(namespace.modules.core), namespace.modules.core && namespace.modules.core.status, "Core");
        check("Storage module loaded", Boolean(namespace.modules.storage), namespace.modules.storage && namespace.modules.storage.status, "Storage");
        check("State module loaded", Boolean(namespace.modules.state), namespace.modules.state && namespace.modules.state.status, "State");

        const canonicalA = namespace.api.canonicalStringifyIDE160({ b: 2, a: 1 });
        const canonicalB = namespace.api.canonicalStringifyIDE160({ a: 1, b: 2 });
        check("Canonical serialization stable", canonicalA === canonicalB, canonicalA, "Storage");
        const hashA = namespace.api.hashIDE160CanonicalSync({ a: 1, b: 2 });
        const hashB = namespace.api.hashIDE160CanonicalSync({ b: 2, a: 1 });
        check("Canonical hash stable", hashA.hash === hashB.hash && Boolean(hashA.algorithm), hashA.algorithm + ":" + hashA.hash, "Storage");

        const invalidDefinition = namespace.api.createWorkflowDefinition({ goal: "", scope: null });
        check("Incomplete Definition blocked", invalidDefinition.ok === false && invalidDefinition.status === "Blocked", invalidDefinition.code, "Definition");

        const definitionResult = namespace.api.createWorkflowDefinition({
          id: "IDE-160-TEST-DEFINITION",
          version: "1.0.0",
          name: "IDE-160 Foundation Test",
          goal: "Validate IDE-160 Workflow Foundation",
          scope: { component: "IDE-160", phase: 1 },
          excludedScope: { repositoryMutation: true },
          requiredComponents: ["IDE-160"],
          requiredCapabilities: ["Workflow"],
          inputContract: { type: "Foundation Test" },
          requiredEvidence: ["Definition Evidence"],
          requiredPolicies: ["Fail-Closed"],
          executionRequirement: { mutation: false },
          approvalRequirement: { required: false },
          monitoringRequirement: { required: false },
          completionRequirement: { foundationValidation: true },
          repositoryBaseline: { status: "Not Required" },
          handoffTarget: "IDE-170"
        });
        check("Valid Definition created", definitionResult.ok === true, definitionResult.code, "Definition");
        check("Definition read-back", Boolean(namespace.api.getWorkflowDefinition("IDE-160-TEST-DEFINITION")), "Definition retrieved", "Definition");

        const workflowResult = namespace.api.createWorkflow("IDE-160-TEST-DEFINITION", { test: true }, { workflowId: "IDE-160-TEST-WORKFLOW" });
        check("Workflow created", workflowResult.ok === true, workflowResult.code, "Core");
        const secondWorkflow = namespace.api.createWorkflow("IDE-160-TEST-DEFINITION", {}, { workflowId: "IDE-160-TEST-WORKFLOW-2" });
        check("Single active Workflow enforced", secondWorkflow.ok === false && secondWorkflow.code === "ACTIVE_WORKFLOW_LIMIT", secondWorkflow.code, "Core");

        const started = namespace.api.startWorkflow("IDE-160-TEST-WORKFLOW", { actor: "Validation" });
        check("Workflow start transitions", started.ok === true, started.code, "State");
        const currentState = namespace.api.getWorkflowState("IDE-160-TEST-WORKFLOW");
        check("Workflow entered Planning Ready", currentState && currentState.primaryPhase === "Planning" && currentState.controlStatus === "Ready", JSON.stringify(currentState), "State");
        const journal = namespace.api.getTransitionJournal("IDE-160-TEST-WORKFLOW");
        check("Transition Journal appended", journal.length === 3, "count=" + journal.length, "State");
        check("Transition hash chain", journal.length === 3 && journal[1].previousTransitionHash === journal[0].transitionHash && journal[2].previousTransitionHash === journal[1].transitionHash, "hash chain", "State");

        const illegal = namespace.api.transitionWorkflowState("IDE-160-TEST-WORKFLOW", {
          fromPhase: "Planning",
          fromStatus: "Ready",
          toPhase: "Execution",
          toStatus: "Ready",
          attemptId: namespace.api.getWorkflow("IDE-160-TEST-WORKFLOW").currentAttempt.attemptId,
          reasonCode: "ILLEGAL_SKIP",
          evidenceReferences: [{ type: "Validation" }],
          actor: "Validation",
          sourceComponent: "IDE-160"
        });
        check("Illegal phase skip rejected", illegal.ok === false && illegal.code === "TRANSITION_NOT_ALLOWED", illegal.code, "State");

        const activeAttemptId = namespace.api.getWorkflow("IDE-160-TEST-WORKFLOW").currentAttempt.attemptId;
        const planningRunning = namespace.api.transitionWorkflowState("IDE-160-TEST-WORKFLOW", {
          fromPhase: "Planning",
          fromStatus: "Ready",
          toPhase: "Planning",
          toStatus: "Running",
          attemptId: activeAttemptId,
          reasonCode: "FOUNDATION_FAILURE_TEST_START",
          evidenceReferences: [{ type: "Validation Evidence", id: "TEST-EVIDENCE" }],
          actor: "Validation",
          sourceComponent: "IDE-160"
        });
        const planningFailed = namespace.api.transitionWorkflowState("IDE-160-TEST-WORKFLOW", {
          fromPhase: "Planning",
          fromStatus: "Running",
          toPhase: "Planning",
          toStatus: "Failed",
          attemptId: activeAttemptId,
          reasonCode: "FOUNDATION_TRANSIENT_FAILURE",
          evidenceReferences: [{ type: "Validation Evidence", id: "TEST-EVIDENCE" }],
          actor: "Validation",
          sourceComponent: "IDE-160"
        });
        check("Controlled failure state entered", planningRunning.ok === true && planningFailed.ok === true, planningFailed.code, "Failure");

        const failureResult = namespace.api.createWorkflowFailure("IDE-160-TEST-WORKFLOW", {
          category: "Execution Failure",
          code: "TEST_TRANSIENT_FAILURE",
          severity: "Medium",
          retryEligibility: "Retryable",
          directCause: "Foundation validation transient test",
          evidenceReferences: [{ type: "Validation Evidence", id: "TEST-EVIDENCE" }],
          recommendedRecoveryLevel: "Local Recovery",
          recommendedNextAction: "Retry"
        });
        check("Failure Record created", failureResult.ok === true, failureResult.code, "Failure");
        const recoveryResult = namespace.api.createWorkflowRecoveryDecision("IDE-160-TEST-WORKFLOW", {
          failureId: failureResult.data.failure.failureId,
          selectedRecoveryLevel: "Local Recovery",
          retryAllowed: true,
          targetPhase: "Planning",
          reason: "Foundation retry validation",
          evidenceReferences: [{ type: "Validation Evidence", id: "TEST-EVIDENCE" }]
        });
        check("Recovery Decision created", recoveryResult.ok === true, recoveryResult.code, "Recovery");
        const retryResult = namespace.api.createWorkflowRetryAttempt("IDE-160-TEST-WORKFLOW", {
          recoveryDecisionId: recoveryResult.data.recoveryDecision.recoveryDecisionId,
          targetPhase: "Planning",
          reason: "Foundation retry validation"
        });
        check("Retry creates new Attempt", retryResult.ok === true && retryResult.data.attempt.sequence === 2, retryResult.code, "Recovery");
        const budget = namespace.api.getWorkflowRetryBudget("IDE-160-TEST-WORKFLOW", "Planning");
        check("Retry Budget enforced", budget && budget.maximumAttempts === 3 && budget.usedAttempts === 2, JSON.stringify(budget), "Recovery");

        const persisted = namespace.api.persistWorkflowRuntime();
        check("Runtime persistence verified", persisted.ok === true && persisted.status === "Verified", persisted.code, "Storage");
        const loaded = namespace.api.loadWorkflowRuntime();
        check("Runtime read-back verified", loaded.ok === true, loaded.code, "Storage");
        const storageStatus = namespace.api.getIDE160StorageStatus();
        check("Storage budget reported", storageStatus && storageStatus.usage && Number.isFinite(storageStatus.usage.bytes), JSON.stringify(storageStatus.usage), "Storage");
        const status = namespace.api.getAIDevelopmentWorkflowStatus();
        check("Lightweight Status available", status && status.componentId === "IDE-160" && status.status === "Ready" && status.ready === true && (status.healthStatus === "Not Run" || status.healthStatus === "Measured"), status.status + "/" + status.healthStatus, "Status");
      } finally {
        internal.importRuntimeState(originalState);
        transitionJournal.splice(0, transitionJournal.length, ...originalJournal);
        foundationRecordStore.failures = originalRecords.failures || [];
        foundationRecordStore.recoveries = originalRecords.recoveries || [];
        foundationRecordStore.attempts = originalRecords.attempts || [];
        foundationRecordStore.decisions = originalRecords.decisions || [];
        state.lastValidation = originalValidation;
        state.lastPersistence = originalPersistence;
        state.lastError = originalError;
        state.updatedAt = originalUpdatedAt;
      }
    });

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const total = checks.length;
    const failed = total - passed;
    const health = total ? Number(((passed / total) * 100).toFixed(2)) : null;
    const groups = {};
    checks.forEach(function groupCheck(item) {
      if (!groups[item.group]) groups[item.group] = { passed: 0, failed: 0, total: 0 };
      groups[item.group].total += 1;
      if (item.passed) groups[item.group].passed += 1;
      else groups[item.group].failed += 1;
    });
    const result = {
      id: internal.nextId("IDE-160-VALIDATION"),
      componentId: namespace.componentId,
      version: VERSION,
      mode: internal.text(options && options.mode, "Phase 1 Foundation"),
      valid: failed === 0,
      passed: passed,
      failed: failed,
      total: total,
      health: health,
      status: failed === 0 ? "Passed" : "Failed",
      groups: groups,
      checks: checks,
      warnings: [],
      storageIsolation: true,
      executedAt: internal.nowIso()
    };
    state.lastValidation = internal.clone(result);
    internal.touch();
    return result;
  }

  namespace.constants.PRIMARY_PHASES = PRIMARY_PHASES;
  namespace.constants.CONTROL_STATUSES = CONTROL_STATUSES;
  namespace.constants.FAILURE_CATEGORIES = FAILURE_CATEGORIES;
  namespace.constants.FAILURE_SEVERITIES = FAILURE_SEVERITIES;
  namespace.constants.RETRY_ELIGIBILITY = RETRY_ELIGIBILITY;
  namespace.constants.RECOVERY_LEVELS = RECOVERY_LEVELS;
  namespace.constants.RETRY_LIMITS = RETRY_LIMITS;

  Object.assign(internal, {
    transitionJournal: transitionJournal,
    foundationRecordStore: foundationRecordStore,
    phaseIndex: phaseIndex,
    isKnownState: isKnownState,
    isTransitionAllowed: isTransitionAllowed,
    persistFoundationRecords: persistFoundationRecords
  });

  Object.assign(namespace.api, {
    getWorkflowState: getWorkflowState,
    transitionWorkflowState: transitionWorkflowState,
    getTransitionJournal: getTransitionJournal,
    createWorkflowFailure: createFailureRecord,
    getWorkflowFailure: getFailureRecord,
    listWorkflowFailures: listFailureRecords,
    createWorkflowRecoveryDecision: createRecoveryDecision,
    createWorkflowRetryAttempt: createRetryAttempt,
    getWorkflowRetryBudget: getRetryBudget,
    requestWorkflowCancellationState: requestWorkflowCancellationState,
    validateWorkflowFoundation: validateWorkflowFoundation
  });

  namespace.modules.state = {
    id: "IDE-160-STATE",
    version: VERSION,
    status: "Ready",
    primaryPhaseCount: PRIMARY_PHASES.length,
    controlStatusCount: CONTROL_STATUSES.length,
    retryLimit: RETRY_LIMITS.totalAttempts,
    loadedAt: internal.nowIso()
  };

  restorePersistedFoundationRecords();
  namespace.api.initializeAIDevelopmentWorkflow();
})(typeof window !== "undefined" ? window : globalThis);