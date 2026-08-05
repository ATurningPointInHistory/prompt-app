/* ============================================================
   FILE: 13_ai_development_workflow_decision.js
   IDE-160 AI Development Workflow Decision Routing / Recovery
   Version: 2.0.1
   Phase: Complete - Monitoring / Package / Completion / Integration / Release
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;

  const DECISION_ROUTES = Object.freeze([
    "Proceed",
    "Retry",
    "Revise Plan",
    "Reject",
    "Stop"
  ]);

  const ROUTE_PRECEDENCE = Object.freeze([
    "Stop",
    "Reject",
    "Revise Plan",
    "Retry",
    "Proceed"
  ]);

  const DECISION_CONFIDENCE = Object.freeze([
    "High",
    "Medium",
    "Low",
    "Unknown"
  ]);

  const APPROVAL_REQUIREMENTS = Object.freeze([
    "Required",
    "Not Required",
    "Already Satisfied",
    "Invalid",
    "Not Applicable"
  ]);

  const decisionStore = internal.foundationRecordStore && Array.isArray(internal.foundationRecordStore.decisions)
    ? internal.foundationRecordStore.decisions
    : [];

  if (internal.foundationRecordStore && !Array.isArray(internal.foundationRecordStore.decisions)) {
    internal.foundationRecordStore.decisions = decisionStore;
  }

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function getActivePlanMutable(workflow) {
    if (!workflow || !workflow.planning || !workflow.planning.activePlanId) return null;
    const plans = Array.isArray(workflow.planning.candidatePlans) ? workflow.planning.candidatePlans : [];
    return plans.find(function findPlan(plan) {
      return plan && plan.planId === workflow.planning.activePlanId;
    }) || null;
  }

  function getExecutionSummary(workflow) {
    return workflow && workflow.execution && workflow.execution.executionSummary
      ? workflow.execution.executionSummary
      : null;
  }

  function normalizePolicyResult(input) {
    const source = input && typeof input === "object" ? input : {};
    const status = internal.text(source.status, source.hardDeny === true ? "Hard Deny" : "Passed");
    return {
      status: status,
      hardDeny: source.hardDeny === true || status === "Hard Deny",
      version: internal.text(source.version, "Not Specified"),
      evidenceReferences: internal.asArray(source.evidenceReferences).map(internal.clone)
    };
  }

  function normalizeValidationResult(summary, input) {
    const source = input && typeof input === "object" ? input : {};
    const validationItems = Array.isArray(summary && summary.validationSummary)
      ? summary.validationSummary
      : [];
    const failedItems = validationItems.filter(function filter(item) {
      const result = item && item.validationResult;
      return result && (result.passed === false || result.valid === false || result.status === "Failed");
    });
    const status = internal.text(source.status, failedItems.length ? "Failed" : "Passed");
    return {
      status: status,
      passed: source.passed === false ? false : status !== "Failed" && failedItems.length === 0,
      failedItems: failedItems.map(internal.clone),
      evidenceReferences: internal.asArray(source.evidenceReferences).map(internal.clone)
    };
  }

  function normalizeRepositoryResult(summary, input) {
    const source = input && typeof input === "object" ? input : {};
    const executionRepository = summary && summary.repositoryIntegrity && typeof summary.repositoryIntegrity === "object"
      ? summary.repositoryIntegrity
      : {};
    const merged = Object.assign({}, executionRepository, source);
    const currentHash = internal.text(merged.repositoryHash || merged.currentHash, "");
    const expectedHash = internal.text(merged.expectedHash || merged.repositoryHash, currentHash);
    const hashMatch = merged.hashMatch === false ? false : (!expectedHash || !currentHash || expectedHash === currentHash);
    return {
      repositoryId: internal.text(merged.repositoryId, "Not Evaluated"),
      repositoryVersion: internal.text(merged.repositoryVersion, "Not Evaluated"),
      expectedHash: expectedHash || null,
      currentHash: currentHash || null,
      hashMatch: hashMatch,
      integrityVerified: merged.integrityVerified === false ? false : Boolean(currentHash && hashMatch),
      unexpectedWrite: merged.unexpectedWrite === true,
      persistentCommitExecuted: merged.persistentCommitExecuted === true,
      zipFileMutation: merged.zipFileMutation === true,
      sourceRestored: merged.sourceRestored !== false,
      rollbackVerified: merged.rollbackVerified !== false,
      evidenceReferences: internal.asArray(merged.evidenceReferences).map(internal.clone)
    };
  }

  function normalizeRollbackResult(summary, input) {
    const source = input && typeof input === "object" ? input : {};
    const rollbackCount = Number(summary && summary.metricsSummary && summary.metricsSummary.rollbackCount) || 0;
    const required = source.required === true || rollbackCount > 0;
    const verified = source.verified === false ? false : (!required || source.verified === true || rollbackCount > 0);
    return {
      required: required,
      executed: source.executed === false ? false : (!required || source.executed === true || rollbackCount > 0),
      verified: verified,
      sourceRestored: source.sourceRestored !== false,
      evidenceReferences: internal.asArray(source.evidenceReferences).map(internal.clone)
    };
  }

  function buildDecisionInput(workflow, options) {
    const settings = options && typeof options === "object" ? options : {};
    const executionSummary = getExecutionSummary(workflow);
    const activePlan = getActivePlanMutable(workflow);
    const failures = typeof namespace.api.listWorkflowFailures === "function"
      ? namespace.api.listWorkflowFailures(workflow.identity.workflowId)
      : [];
    const policyResult = normalizePolicyResult(settings.policyResult);
    const validationResult = normalizeValidationResult(executionSummary, settings.validationResult);
    const repositoryIntegrityResult = normalizeRepositoryResult(executionSummary, settings.repositoryIntegrityResult);
    const rollbackResult = normalizeRollbackResult(executionSummary, settings.rollbackResult);
    const input = {
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      planId: activePlan && activePlan.planId || null,
      planVersion: activePlan && activePlan.planVersion || null,
      planHash: activePlan && activePlan.planHash || null,
      planStatus: activePlan && activePlan.status || null,
      executionSummaryId: executionSummary && executionSummary.executionSummaryId || null,
      executionSummaryHash: executionSummary && executionSummary.integrity && executionSummary.integrity.hash || null,
      executionSummary: internal.clone(executionSummary),
      policyResult: policyResult,
      validationResult: validationResult,
      repositoryIntegrityResult: repositoryIntegrityResult,
      rollbackResult: rollbackResult,
      failureRecords: internal.clone(failures),
      remainingRisk: internal.clone(settings.remainingRisk || workflow.context.remainingRisk || []),
      unresolvedItems: internal.clone(settings.unresolvedItems || workflow.context.unresolvedItems || []),
      explicitRejection: settings.explicitRejection === true,
      retryRequested: settings.retryRequested === true,
      requiresPlanRevision: settings.requiresPlanRevision === true,
      planInvalidated: settings.planInvalidated === true,
      componentVersionMismatch: settings.componentVersionMismatch === true,
      baselineChanged: settings.baselineChanged === true,
      humanDecisionRequired: settings.humanDecisionRequired === true,
      selectedRoute: DECISION_ROUTES.includes(settings.selectedRoute) ? settings.selectedRoute : null,
      evidenceReferences: internal.asArray(settings.evidenceReferences).map(internal.clone),
      actor: internal.text(settings.actor, "IDE-160"),
      evaluatedAt: internal.nowIso()
    };
    if (executionSummary) {
      input.evidenceReferences.push({
        type: "Execution Summary",
        id: executionSummary.executionSummaryId,
        hash: executionSummary.integrity && executionSummary.integrity.hash || null
      });
    }
    if (activePlan) {
      input.evidenceReferences.push({
        type: "Frozen Plan",
        id: activePlan.planId,
        version: activePlan.planVersion,
        hash: activePlan.planHash || null
      });
    }
    input.evidenceReferences = input.evidenceReferences.filter(Boolean);
    const integrity = internal.hashCanonicalSync(input);
    return { input: input, integrity: integrity, activePlan: activePlan, executionSummary: executionSummary };
  }

  function validateDecisionInput(workflow, built) {
    const input = built.input;
    const missing = [];
    if (!workflow || workflow.state.primaryPhase !== "Decision") missing.push("Decision Phase");
    if (!input.workflowId) missing.push("Workflow ID");
    if (!input.attemptId) missing.push("Attempt ID");
    if (!input.planId) missing.push("Plan ID");
    if (!input.planVersion) missing.push("Plan Version");
    if (!input.planHash) missing.push("Plan Hash");
    if (!input.executionSummaryId) missing.push("Execution Summary ID");
    if (!input.executionSummaryHash) missing.push("Execution Summary Hash");
    if (!built.activePlan || !["Frozen", "Active", "Completed"].includes(built.activePlan.status)) missing.push("Frozen Plan");
    if (!built.executionSummary) missing.push("Execution Summary");
    if (built.executionSummary && built.executionSummary.workflowId !== workflow.identity.workflowId) missing.push("Execution Workflow Identity");
    if (built.executionSummary && built.executionSummary.attemptId !== workflow.currentAttempt.attemptId) missing.push("Execution Attempt Identity");
    if (!input.evidenceReferences.length) missing.push("Decision Evidence");
    return {
      valid: missing.length === 0,
      missing: missing,
      checkedAt: internal.nowIso()
    };
  }

  function evaluateGates(workflow, built, options) {
    const settings = options && typeof options === "object" ? options : {};
    const input = built.input;
    const unresolvedCritical = input.failureRecords.filter(function filter(failure) {
      return failure && failure.status !== "Resolved" && ["Critical", "High"].includes(failure.severity);
    });
    const unknownFailures = input.failureRecords.filter(function filter(failure) {
      return failure && failure.status !== "Resolved" && failure.category === "Unknown Failure";
    });
    const riskItems = internal.asArray(input.remainingRisk);
    const highRisk = riskItems.filter(function filterRisk(item) {
      const severity = item && typeof item === "object" ? item.severity || item.level : item;
      return ["Critical", "High"].includes(String(severity || ""));
    });
    const blockingItems = internal.asArray(input.unresolvedItems).filter(function filterItem(item) {
      return item && typeof item === "object" ? item.blocking === true || item.type === "Blocking" : false;
    });
    const safetyFailures = [];
    if (input.repositoryIntegrityResult.persistentCommitExecuted) safetyFailures.push("Persistent Commit Executed");
    if (input.repositoryIntegrityResult.zipFileMutation) safetyFailures.push("ZIP File Mutation");
    if (input.repositoryIntegrityResult.unexpectedWrite) safetyFailures.push("Unexpected Repository Write");
    if (input.repositoryIntegrityResult.hashMatch === false) safetyFailures.push("Repository Hash Mismatch");
    if (input.repositoryIntegrityResult.integrityVerified === false) safetyFailures.push("Repository Integrity Not Verified");
    if (input.rollbackResult.required && input.rollbackResult.verified !== true) safetyFailures.push("Rollback Not Verified");
    if (input.policyResult.hardDeny) safetyFailures.push("Policy Hard Deny");
    if (settings.traceabilityLost === true) safetyFailures.push("Traceability Lost");

    const gates = {
      inputContract: { passed: true, failures: [] },
      safety: { passed: safetyFailures.length === 0, failures: safetyFailures },
      policy: { passed: input.policyResult.hardDeny !== true, failures: input.policyResult.hardDeny ? ["Policy Hard Deny"] : [] },
      repositoryIntegrity: {
        passed: input.repositoryIntegrityResult.integrityVerified === true && input.repositoryIntegrityResult.hashMatch !== false && input.repositoryIntegrityResult.unexpectedWrite !== true && input.repositoryIntegrityResult.persistentCommitExecuted !== true && input.repositoryIntegrityResult.zipFileMutation !== true,
        failures: safetyFailures.filter(function filter(item) { return item.indexOf("Repository") >= 0 || item.indexOf("Commit") >= 0 || item.indexOf("ZIP") >= 0; })
      },
      rollback: { passed: !input.rollbackResult.required || input.rollbackResult.verified === true, failures: input.rollbackResult.required && input.rollbackResult.verified !== true ? ["Rollback Not Verified"] : [] },
      traceability: { passed: settings.traceabilityLost !== true && Boolean(input.executionSummaryHash && input.planHash), failures: settings.traceabilityLost === true ? ["Traceability Lost"] : [] },
      validation: { passed: input.validationResult.passed === true, failures: input.validationResult.passed === true ? [] : ["Validation Failed"] },
      failureRecovery: { passed: unresolvedCritical.length === 0 && unknownFailures.length === 0, failures: unresolvedCritical.concat(unknownFailures).map(function map(item) { return item.failureId || item.code || item.category; }) },
      planValidity: {
        passed: !input.planInvalidated && !input.componentVersionMismatch && !input.baselineChanged && built.activePlan && ["Frozen", "Active", "Completed"].includes(built.activePlan.status),
        failures: [
          input.planInvalidated ? "Plan Invalidated" : null,
          input.componentVersionMismatch ? "Component Version Mismatch" : null,
          input.baselineChanged ? "Repository Baseline Changed" : null
        ].filter(Boolean)
      },
      risk: { passed: highRisk.length === 0 && blockingItems.length === 0, failures: highRisk.concat(blockingItems).map(function map(item) { return item && item.id || item && item.code || String(item); }) }
    };
    return gates;
  }

  function buildCandidates(input, gates) {
    const candidates = [];
    const hardStop = !gates.safety.passed || !gates.policy.passed || !gates.repositoryIntegrity.passed || !gates.rollback.passed || !gates.traceability.passed || !gates.failureRecovery.passed;
    candidates.push({
      route: "Stop",
      eligible: hardStop,
      reason: hardStop ? "A Hard Gate or Critical Safety condition failed." : "No Stop condition detected.",
      confidence: hardStop ? "High" : "Low",
      blockingConditions: [].concat(gates.safety.failures, gates.policy.failures, gates.repositoryIntegrity.failures, gates.rollback.failures, gates.traceability.failures, gates.failureRecovery.failures)
    });
    candidates.push({
      route: "Reject",
      eligible: input.explicitRejection === true,
      reason: input.explicitRejection === true ? "Project Owner or policy context explicitly rejected the current result." : "No explicit rejection.",
      confidence: input.explicitRejection === true ? "High" : "Low",
      blockingConditions: []
    });
    const revise = input.requiresPlanRevision === true || !gates.planValidity.passed;
    candidates.push({
      route: "Revise Plan",
      eligible: !hardStop && revise,
      reason: revise ? "Plan assumptions, baseline, component binding, or plan structure require revision." : "Current Frozen Plan remains valid.",
      confidence: revise ? "High" : "Low",
      blockingConditions: gates.planValidity.failures.slice()
    });
    const retryableFailures = input.failureRecords.filter(function filter(failure) {
      return failure && failure.status !== "Resolved" && failure.retryEligibility !== "Non-Retryable" && !["Critical", "High"].includes(failure.severity);
    });
    const retry = input.retryRequested === true || retryableFailures.length > 0;
    candidates.push({
      route: "Retry",
      eligible: !hardStop && !revise && retry,
      reason: retry ? "A controlled retry is requested or a retryable transient failure is present." : "No retry condition detected.",
      confidence: retry ? "Medium" : "Low",
      blockingConditions: []
    });
    const proceed = !hardStop && !input.explicitRejection && !revise && !retry && gates.validation.passed && gates.planValidity.passed && gates.risk.passed;
    candidates.push({
      route: "Proceed",
      eligible: proceed,
      reason: proceed ? "All mandatory Decision Gates passed." : "One or more Proceed conditions are not satisfied.",
      confidence: proceed ? "High" : "Low",
      blockingConditions: [].concat(gates.validation.failures, gates.planValidity.failures, gates.risk.failures)
    });
    return candidates;
  }

  function chooseRoute(candidates, requestedRoute) {
    if (requestedRoute) {
      const requested = candidates.find(function find(item) { return item.route === requestedRoute; });
      return requested && requested.eligible ? requested.route : null;
    }
    for (let index = 0; index < ROUTE_PRECEDENCE.length; index += 1) {
      const route = ROUTE_PRECEDENCE[index];
      const candidate = candidates.find(function find(item) { return item.route === route; });
      if (candidate && candidate.eligible) return route;
    }
    return null;
  }

  function calculateConfidence(route, candidates, inputValidation) {
    if (!inputValidation.valid) return "Unknown";
    const candidate = candidates.find(function find(item) { return item.route === route; });
    return candidate && DECISION_CONFIDENCE.includes(candidate.confidence) ? candidate.confidence : "Medium";
  }

  function appendDecisionRecord(record) {
    const previous = decisionStore.length ? decisionStore[decisionStore.length - 1] : null;
    const recordWithoutHash = Object.assign({}, record, {
      previousDecisionHash: previous ? previous.decisionHash : null
    });
    const integrity = internal.hashCanonicalSync(recordWithoutHash);
    const sealed = Object.assign({}, recordWithoutHash, {
      hashAlgorithm: integrity.algorithm,
      decisionHash: integrity.hash
    });
    decisionStore.push(sealed);
    while (decisionStore.length > 50) decisionStore.shift();
    if (internal.foundationRecordStore) internal.foundationRecordStore.decisions = decisionStore;
    if (typeof internal.persistFoundationRecords === "function") internal.persistFoundationRecords();
    return sealed;
  }

  function createDecisionRecord(workflow, built, inputValidation, gates, candidates, route, status, application) {
    const approvalRequired = route === "Proceed" ? "Required" : route ? "Not Applicable" : "Invalid";
    const record = {
      decisionId: internal.nextId("IDE-160-DECISION"),
      decisionVersion: "1.0.0",
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      executionSessionId: built.executionSummary && built.executionSummary.executionSessionId || null,
      planId: built.input.planId,
      planVersion: built.input.planVersion,
      executionSummaryReference: built.input.executionSummaryId ? {
        executionSummaryId: built.input.executionSummaryId,
        hash: built.input.executionSummaryHash
      } : null,
      decisionInputHash: built.integrity.hash,
      decisionInputHashAlgorithm: built.integrity.algorithm,
      inputValidation: internal.clone(inputValidation),
      gates: internal.clone(gates),
      candidateRoutes: internal.clone(candidates),
      selectedRoute: route,
      routePrecedenceResult: route ? { selected: route, precedence: ROUTE_PRECEDENCE.slice() } : { selected: null, precedence: ROUTE_PRECEDENCE.slice() },
      decisionReason: route ? (candidates.find(function find(item) { return item.route === route; }) || {}).reason || "Decision Route selected." : "Decision requires additional evidence or Human Decision.",
      supportingEvidence: built.input.evidenceReferences.map(internal.clone),
      conflictingEvidence: [],
      policyResult: internal.clone(built.input.policyResult),
      validationResult: internal.clone(built.input.validationResult),
      repositoryIntegrityResult: internal.clone(built.input.repositoryIntegrityResult),
      rollbackResult: internal.clone(built.input.rollbackResult),
      failureReferences: built.input.failureRecords.map(function map(failure) { return failure.failureId; }).filter(Boolean),
      risk: internal.clone(built.input.remainingRisk),
      remainingRisk: internal.clone(built.input.remainingRisk),
      unresolvedItems: internal.clone(built.input.unresolvedItems),
      confidence: calculateConfidence(route, candidates, inputValidation),
      approvalRequirement: APPROVAL_REQUIREMENTS.includes(approvalRequired) ? approvalRequired : "Invalid",
      recommendedNextAction: route || "Human Decision",
      applicationResult: internal.clone(application || null),
      status: status,
      actor: built.input.actor,
      createdAt: internal.nowIso(),
      traceabilityReference: {
        workflowId: workflow.identity.workflowId,
        attemptId: workflow.currentAttempt.attemptId,
        planId: built.input.planId,
        executionSummaryId: built.input.executionSummaryId
      }
    };
    return appendDecisionRecord(record);
  }

  function transitionDecision(workflow, fromStatus, toStatus, reasonCode, decisionId) {
    return namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Decision",
      fromStatus: fromStatus,
      toPhase: "Decision",
      toStatus: toStatus,
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: reasonCode,
      evidenceReferences: [{ type: "Decision", id: decisionId }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
  }

  function applyProceed(workflow, decisionId) {
    const succeeded = transitionDecision(workflow, "Running", "Succeeded", "DECISION_PROCEED", decisionId);
    if (!succeeded.ok) return succeeded;
    return namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Decision",
      fromStatus: "Succeeded",
      toPhase: "Approval",
      toStatus: "Ready",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "DECISION_HANDOFF_TO_APPROVAL",
      evidenceReferences: [{ type: "Decision", id: decisionId }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
  }

  function applyReject(workflow, decisionId) {
    return transitionDecision(workflow, "Running", "Rejected", "DECISION_REJECTED", decisionId);
  }

  function applyStop(workflow, decisionId) {
    const cancelling = transitionDecision(workflow, "Running", "Cancelling", "DECISION_STOP", decisionId);
    if (!cancelling.ok) return cancelling;
    return transitionDecision(workflow, "Cancelling", "Cancelled", "DECISION_STOP_COMPLETED", decisionId);
  }

  function ensureRoutingFailure(workflow, route, options, decisionId) {
    const settings = options && typeof options === "object" ? options : {};
    const existingId = internal.text(settings.failureId, "");
    if (existingId && typeof namespace.api.getWorkflowFailure === "function") {
      const existing = namespace.api.getWorkflowFailure(existingId);
      if (existing) return { ok: true, failure: existing };
    }
    const category = route === "Revise Plan" ? "Validation Failure" : "Execution Failure";
    const result = namespace.api.createWorkflowFailure(workflow.identity.workflowId, {
      category: category,
      code: route === "Revise Plan" ? "DECISION_PLAN_REVISION_REQUIRED" : "DECISION_RETRY_REQUIRED",
      severity: "Medium",
      retryEligibility: "Conditionally Retryable",
      directCause: route === "Revise Plan" ? "Decision requires a new Plan Version." : "Decision authorizes a controlled retry.",
      evidenceReferences: [{ type: "Decision", id: decisionId }],
      recommendedRecoveryLevel: route === "Revise Plan" ? "Plan Recovery" : "Local Recovery",
      recommendedNextAction: route
    });
    return result.ok ? { ok: true, failure: result.data.failure } : { ok: false, result: result };
  }

  function applyRetryOrRevision(workflow, route, decisionId, options) {
    const blocked = transitionDecision(workflow, "Running", "Blocked", route === "Revise Plan" ? "PLAN_REVISION_REQUIRED" : "RETRY_REQUIRED", decisionId);
    if (!blocked.ok) return blocked;
    const failureResult = ensureRoutingFailure(workflow, route, options, decisionId);
    if (!failureResult.ok) return failureResult.result;
    const targetPhase = route === "Revise Plan" ? "Planning" : internal.text(options && options.retryTargetPhase, "Execution");
    const recovery = namespace.api.createWorkflowRecoveryDecision(workflow.identity.workflowId, {
      failureId: failureResult.failure.failureId,
      selectedRecoveryLevel: route === "Revise Plan" ? "Plan Recovery" : "Local Recovery",
      retryAllowed: true,
      targetPhase: targetPhase,
      requiredPlanRevision: route === "Revise Plan",
      requiredApproval: route === "Retry",
      reason: route === "Revise Plan" ? "Decision requires Plan Revision." : "Decision authorizes controlled Retry.",
      actor: internal.text(options && options.actor, "Project Owner"),
      evidenceReferences: [{ type: "Decision", id: decisionId }]
    });
    if (!recovery.ok) return recovery;
    return namespace.api.createWorkflowRetryAttempt(workflow.identity.workflowId, {
      recoveryDecisionId: recovery.data.recoveryDecision.recoveryDecisionId,
      targetPhase: targetPhase,
      reason: route,
      actor: internal.text(options && options.actor, "Project Owner")
    });
  }

  function applyRoute(workflow, route, decisionId, options) {
    if (route === "Proceed") return applyProceed(workflow, decisionId);
    if (route === "Reject") return applyReject(workflow, decisionId);
    if (route === "Stop") return applyStop(workflow, decisionId);
    if (route === "Retry" || route === "Revise Plan") return applyRetryOrRevision(workflow, route, decisionId, options || {});
    return internal.buildResult(false, "DECISION_ROUTE_INVALID", "Blocked", null, {
      error: { message: "Decision Route is invalid.", category: "Input Failure", severity: "High" }
    });
  }

  function beginDecision(workflow) {
    if (workflow.state.primaryPhase !== "Decision") {
      return internal.buildResult(false, "DECISION_PHASE_REQUIRED", "Blocked", { currentState: internal.clone(workflow.state) }, {
        error: { message: "Workflow must be in Decision Phase.", category: "Policy Failure", severity: "High" }
      });
    }
    if (workflow.state.controlStatus === "Ready") {
      return namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
        fromPhase: "Decision",
        fromStatus: "Ready",
        toPhase: "Decision",
        toStatus: "Running",
        attemptId: workflow.currentAttempt.attemptId,
        reasonCode: "DECISION_EVALUATION_STARTED",
        evidenceReferences: [{ type: "Execution Summary", id: getExecutionSummary(workflow) && getExecutionSummary(workflow).executionSummaryId || "Missing" }],
        actor: "IDE-160",
        sourceComponent: namespace.componentId
      });
    }
    if (workflow.state.controlStatus === "Waiting") {
      const ready = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
        fromPhase: "Decision",
        fromStatus: "Waiting",
        toPhase: "Decision",
        toStatus: "Ready",
        attemptId: workflow.currentAttempt.attemptId,
        reasonCode: "HUMAN_DECISION_RECEIVED",
        evidenceReferences: [{ type: "Human Decision", id: internal.nextId("IDE-160-HUMAN-DECISION") }],
        actor: "Project Owner",
        sourceComponent: namespace.componentId
      });
      if (!ready.ok) return ready;
      return beginDecision(workflow);
    }
    if (workflow.state.controlStatus === "Running") return internal.buildResult(true, "DECISION_ALREADY_RUNNING", "Running", { state: internal.clone(workflow.state) });
    return internal.buildResult(false, "DECISION_STATE_INVALID", "Blocked", { currentState: internal.clone(workflow.state) }, {
      error: { message: "Decision cannot start from the current State.", category: "Policy Failure", severity: "High" }
    });
  }

  function evaluateWorkflowDecision(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const started = beginDecision(workflow);
    if (!started.ok) return started;

    const built = buildDecisionInput(workflow, settings);
    const inputValidation = validateDecisionInput(workflow, built);
    if (!inputValidation.valid) {
      const placeholderId = internal.nextId("IDE-160-DECISION");
      if (workflow.state.controlStatus === "Running") {
        transitionDecision(workflow, "Running", "Blocked", "DECISION_INPUT_INCOMPLETE", placeholderId);
      }
      const record = createDecisionRecord(workflow, built, inputValidation, {}, [], null, "Blocked", { code: "DECISION_INPUT_INCOMPLETE" });
      workflow.decision = {
        status: "Blocked",
        currentDecisionId: record.decisionId,
        selectedRoute: null,
        decisionInputHash: record.decisionInputHash,
        updatedAt: record.createdAt
      };
      workflow.context.decisionReference = { decisionId: record.decisionId, status: "Blocked", selectedRoute: null };
      internal.persistRuntimeIfAvailable();
      return internal.buildResult(false, "DECISION_INPUT_INCOMPLETE", "Blocked", {
        decision: internal.clone(record),
        missing: inputValidation.missing
      }, {
        error: { message: "Decision Input Contract is incomplete.", category: "Input Failure", severity: "High" }
      });
    }

    const gates = evaluateGates(workflow, built, settings);
    const candidates = buildCandidates(built.input, gates);
    const ambiguous = settings.humanDecisionRequired === true;
    let route = ambiguous ? null : chooseRoute(candidates, built.input.selectedRoute);
    if (!route && built.input.selectedRoute) {
      const placeholderId = internal.nextId("IDE-160-DECISION");
      transitionDecision(workflow, "Running", "Blocked", "DECISION_ROUTE_NOT_ELIGIBLE", placeholderId);
      const invalidRecord = createDecisionRecord(workflow, built, inputValidation, gates, candidates, null, "Blocked", { code: "DECISION_ROUTE_NOT_ELIGIBLE", requestedRoute: built.input.selectedRoute });
      workflow.decision = { status: "Blocked", currentDecisionId: invalidRecord.decisionId, selectedRoute: null, updatedAt: invalidRecord.createdAt };
      workflow.context.decisionReference = { decisionId: invalidRecord.decisionId, status: "Blocked", selectedRoute: null };
      internal.persistRuntimeIfAvailable();
      return internal.buildResult(false, "DECISION_ROUTE_NOT_ELIGIBLE", "Blocked", { decision: internal.clone(invalidRecord) });
    }

    if (!route) {
      const placeholderId = internal.nextId("IDE-160-DECISION");
      const waiting = transitionDecision(workflow, "Running", "Waiting", "DECISION_HUMAN_INPUT_REQUIRED", placeholderId);
      const waitingRecord = createDecisionRecord(workflow, built, inputValidation, gates, candidates, null, "Waiting", { transition: waiting && waiting.data && waiting.data.transition || null });
      workflow.decision = {
        status: "Waiting",
        currentDecisionId: waitingRecord.decisionId,
        selectedRoute: null,
        candidateRoutes: internal.clone(candidates),
        updatedAt: waitingRecord.createdAt
      };
      workflow.context.decisionReference = { decisionId: waitingRecord.decisionId, status: "Waiting", selectedRoute: null };
      internal.persistRuntimeIfAvailable();
      return internal.buildResult(true, "DECISION_WAITING_HUMAN", "Waiting", {
        decision: internal.clone(waitingRecord),
        candidates: internal.clone(candidates),
        workflowState: internal.clone(workflow.state)
      });
    }

    const decisionId = internal.nextId("IDE-160-DECISION");
    const application = applyRoute(workflow, route, decisionId, settings);
    const finalStatus = application && application.ok === true ? "Applied" : "Application Failed";
    const record = createDecisionRecord(workflow, built, inputValidation, gates, candidates, route, finalStatus, application);
    workflow.decision = {
      status: finalStatus,
      currentDecisionId: record.decisionId,
      selectedRoute: route,
      candidateRoutes: internal.clone(candidates),
      confidence: record.confidence,
      approvalRequirement: record.approvalRequirement,
      updatedAt: record.createdAt
    };
    workflow.context.decisionReference = {
      decisionId: record.decisionId,
      selectedRoute: route,
      status: finalStatus,
      decisionHash: record.decisionHash
    };
    workflow.timeline.push({ type: "Decision Created", decisionId: record.decisionId, route: route, at: record.createdAt });
    workflow.updatedAt = record.createdAt;
    internal.persistRuntimeIfAvailable();
    if (!application || application.ok !== true) {
      return internal.buildResult(false, "DECISION_ROUTE_APPLICATION_FAILED", "Failed", {
        decision: internal.clone(record),
        application: internal.clone(application)
      }, {
        error: { message: "Decision Route could not be applied.", category: "System Failure", severity: "High" }
      });
    }
    return internal.buildResult(true, "WORKFLOW_DECISION_APPLIED", route, {
      decision: internal.clone(record),
      application: internal.clone(application),
      workflowState: internal.clone(workflow.state)
    }, {
      evidence: built.input.evidenceReferences
    });
  }

  function selectWorkflowDecisionRoute(workflowId, route, options) {
    if (!DECISION_ROUTES.includes(route)) {
      return internal.buildResult(false, "DECISION_ROUTE_INVALID", "Blocked", { route: route || null });
    }
    const settings = Object.assign({}, options || {}, {
      selectedRoute: route,
      humanDecisionRequired: false,
      actor: internal.text(options && options.actor, "Project Owner")
    });
    return evaluateWorkflowDecision(workflowId, settings);
  }

  function getWorkflowDecision(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow || !workflow.decision || !workflow.decision.currentDecisionId) return null;
    return internal.clone(decisionStore.find(function find(record) {
      return record.decisionId === workflow.decision.currentDecisionId;
    }) || null);
  }

  function listWorkflowDecisions(workflowId) {
    const target = String(workflowId || "");
    return decisionStore.filter(function filter(record) {
      return !target || record.workflowId === target;
    }).map(internal.clone);
  }

  function getDecisionCandidates(workflowId) {
    const decision = getWorkflowDecision(workflowId);
    return decision ? internal.clone(decision.candidateRoutes || []) : [];
  }

  function getWorkflowDecisionStatus(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    const decision = getWorkflowDecision(workflowId);
    return {
      id: "IDE-160-DECISION-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      workflowId: workflow && workflow.identity.workflowId || null,
      status: workflow && workflow.decision && workflow.decision.status || "Not Started",
      selectedRoute: decision && decision.selectedRoute || null,
      confidence: decision && decision.confidence || null,
      approvalRequirement: decision && decision.approvalRequirement || null,
      decisionId: decision && decision.decisionId || null,
      recordCount: targetDecisionCount(workflowId),
      updatedAt: internal.nowIso()
    };
  }

  function targetDecisionCount(workflowId) {
    const target = String(workflowId || "");
    return decisionStore.filter(function filter(record) { return !target || record.workflowId === target; }).length;
  }

  function validateWorkflowDecision(options) {
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group || "Decision" });
    }

    const memory = namespace.api.createIDE160MemoryStorage();
    namespace.api.runWithIDE160Storage(memory, function runValidation() {
      const originalState = internal.exportRuntimeState();
      const originalJournal = internal.transitionJournal ? internal.transitionJournal.slice() : [];
      const originalRecords = internal.clone(internal.foundationRecordStore || {});
      const originalValidation = state.lastValidation;
      const originalPersistence = internal.clone(state.lastPersistence);
      const originalError = internal.clone(state.lastError);
      const originalUpdatedAt = state.updatedAt;
      const testAdapterId = "IDE-160-DECISION-TEST";
      const testFunctionName = "__IDE160DecisionTestExecute";
      const previousFunction = global[testFunctionName];
      const previousAdapter = internal.adapterRegistry && internal.adapterRegistry.get(testAdapterId);

      function resetRuntime() {
        state.definitions.clear();
        state.workflows.clear();
        state.activeWorkflowId = null;
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length);
        if (internal.foundationRecordStore) {
          internal.foundationRecordStore.failures = [];
          internal.foundationRecordStore.recoveries = [];
          internal.foundationRecordStore.attempts = [];
          internal.foundationRecordStore.decisions = [];
        }
        decisionStore.splice(0, decisionStore.length);
      }

      function createDecisionReadyWorkflow(workflowId) {
        const definitionId = workflowId + "-DEF";
        namespace.api.createWorkflowDefinition({
          id: definitionId,
          version: "1.0.0",
          name: "Decision Validation",
          goal: "Validate Decision Routing",
          scope: { component: "IDE-160", phase: 4 },
          excludedScope: { persistentCommit: true, zipMutation: true },
          requiredComponents: [testAdapterId],
          requiredCapabilities: ["Decision Test"],
          inputContract: { type: "Decision Validation" },
          requiredEvidence: ["Execution Summary"],
          requiredPolicies: ["Fail-Closed"],
          executionRequirement: { mutation: false },
          approvalRequirement: { required: true },
          monitoringRequirement: { required: true },
          completionRequirement: { decision: true },
          repositoryBaseline: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-DECISION-BASELINE",
            repositoryHash: "DECISION-REPOSITORY-HASH"
          },
          handoffTarget: "IDE-170"
        });
        namespace.api.createWorkflow(definitionId, {}, { workflowId: workflowId, actor: "Validation" });
        namespace.api.startWorkflow(workflowId, { actor: "Validation" });
        namespace.api.createCandidatePlan(workflowId, {
          planVersion: "1.0.0",
          goal: "Decision Validation Plan",
          scope: { component: "IDE-160" },
          repositoryBinding: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-DECISION-BASELINE",
            repositoryHash: "DECISION-REPOSITORY-HASH"
          },
          componentBindings: [{ componentId: testAdapterId, componentVersion: "1.0.0", capability: "Decision Test" }],
          tasks: [{
            taskId: "TASK-DECISION",
            taskName: "Decision Test Task",
            targetComponent: testAdapterId,
            requiredCapability: "Decision Test",
            operationType: "Execute",
            inputReferences: [{ id: "INPUT-DECISION" }],
            expectedOutput: { requiredFields: ["value"] },
            validationRequirement: { required: true, mode: "Result Contract" },
            evidenceRequirement: [{ id: "EVIDENCE-DECISION" }],
            sideEffectType: "Read-Only"
          }],
          completionConditions: [{ type: "All Tasks Succeeded" }],
          evidenceReferences: [{ type: "Decision Validation", id: "EVIDENCE-DECISION" }]
        }, { planId: workflowId + "-PLAN", actor: "Validation" });
        namespace.api.validateCandidatePlan(workflowId, workflowId + "-PLAN");
        namespace.api.selectActivePlan(workflowId, workflowId + "-PLAN", {
          selectionReason: "Decision Validation",
          evidenceReferences: [{ type: "Validation", id: "PLAN-VALID" }],
          actor: "Validation"
        });
        namespace.api.freezeActivePlan(workflowId, {
          actor: "Validation",
          currentRepository: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-DECISION-BASELINE",
            repositoryHash: "DECISION-REPOSITORY-HASH"
          }
        });
        namespace.api.createExecutionSession(workflowId, {
          actor: "Validation",
          currentRepository: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-DECISION-BASELINE",
            repositoryHash: "DECISION-REPOSITORY-HASH"
          }
        });
        namespace.api.executeWorkflowTask(workflowId, "TASK-DECISION", { value: "decision" }, {});
        return getWorkflowMutable(workflowId);
      }

      try {
        resetRuntime();
        global[testFunctionName] = function decisionTestExecute(input) {
          return { status: "Succeeded", value: input && input.value || "ok", validationResult: { passed: true } };
        };
        if (internal.adapterRegistry) internal.adapterRegistry.delete(testAdapterId);
        namespace.api.registerIDE160ComponentAdapter({
          adapterId: testAdapterId,
          componentId: testAdapterId,
          componentVersion: "1.0.0",
          capabilities: ["Decision Test"],
          operations: { "Execute": testFunctionName },
          inputContractVersion: "1.0.0",
          outputContractVersion: "1.0.0",
          statusApi: testFunctionName,
          validatorApi: testFunctionName,
          rollbackCapability: false,
          cancellationCapability: false,
          idempotency: "Idempotent",
          compatibility: "Compatible",
          enabled: true,
          source: "Phase 4 Decision Validation"
        }, { replace: true, allowMultipleForComponent: true });

        check("Decision module loaded", Boolean(namespace.modules.decision), namespace.modules.decision && namespace.modules.decision.status, "Module");
        check("Decision Route constants", DECISION_ROUTES.length === 5, DECISION_ROUTES.join(" > "), "Module");
        check("Route precedence", ROUTE_PRECEDENCE.join("|") === "Stop|Reject|Revise Plan|Retry|Proceed", ROUTE_PRECEDENCE.join(" > "), "Policy");

        resetRuntime();
        createDecisionReadyWorkflow("IDE-160-DECISION-PROCEED");
        const proceed = evaluateWorkflowDecision("IDE-160-DECISION-PROCEED", {
          policyResult: { status: "Passed" },
          validationResult: { status: "Passed" },
          evidenceReferences: [{ type: "Decision Validation", id: "PROCEED" }]
        });
        check("Proceed Route selected", proceed.ok === true && proceed.data && proceed.data.decision && proceed.data.decision.selectedRoute === "Proceed", proceed.code, "Proceed");
        check("Proceed enters Approval Ready", namespace.api.getWorkflowState("IDE-160-DECISION-PROCEED").primaryPhase === "Approval" && namespace.api.getWorkflowState("IDE-160-DECISION-PROCEED").controlStatus === "Ready", JSON.stringify(namespace.api.getWorkflowState("IDE-160-DECISION-PROCEED")), "Proceed");
        check("Proceed requires Workflow Approval", proceed.data && proceed.data.decision && proceed.data.decision.approvalRequirement === "Required", JSON.stringify(proceed), "Proceed");

        resetRuntime();
        createDecisionReadyWorkflow("IDE-160-DECISION-STOP");
        const stop = evaluateWorkflowDecision("IDE-160-DECISION-STOP", {
          policyResult: { status: "Hard Deny", hardDeny: true },
          retryRequested: true,
          evidenceReferences: [{ type: "Decision Validation", id: "STOP" }]
        });
        check("Stop precedence over Retry", stop.ok === true && stop.data && stop.data.decision && stop.data.decision.selectedRoute === "Stop", stop.data && stop.data.decision && stop.data.decision.selectedRoute, "Stop");
        check("Stop closes Workflow", namespace.api.getWorkflowState("IDE-160-DECISION-STOP").controlStatus === "Cancelled", JSON.stringify(namespace.api.getWorkflowState("IDE-160-DECISION-STOP")), "Stop");
        check("Hard Gate recorded", stop.data && stop.data.decision && stop.data.decision.gates && stop.data.decision.gates.policy && stop.data.decision.gates.policy.passed === false, JSON.stringify(stop), "Stop");

        resetRuntime();
        createDecisionReadyWorkflow("IDE-160-DECISION-REJECT");
        const reject = evaluateWorkflowDecision("IDE-160-DECISION-REJECT", {
          explicitRejection: true,
          evidenceReferences: [{ type: "Project Owner Decision", id: "REJECT" }]
        });
        check("Reject Route selected", reject.ok === true && reject.data && reject.data.decision && reject.data.decision.selectedRoute === "Reject", reject.code, "Reject");
        check("Reject state applied", namespace.api.getWorkflowState("IDE-160-DECISION-REJECT").controlStatus === "Rejected", JSON.stringify(namespace.api.getWorkflowState("IDE-160-DECISION-REJECT")), "Reject");

        resetRuntime();
        createDecisionReadyWorkflow("IDE-160-DECISION-REVISE");
        const revise = evaluateWorkflowDecision("IDE-160-DECISION-REVISE", {
          requiresPlanRevision: true,
          evidenceReferences: [{ type: "Plan Evidence", id: "REVISE" }],
          actor: "Project Owner"
        });
        check("Revise Plan Route selected", revise.ok === true && revise.data && revise.data.decision && revise.data.decision.selectedRoute === "Revise Plan", revise.code, "Revise Plan");
        const reviseState = namespace.api.getWorkflowState("IDE-160-DECISION-REVISE");
        check("Revise Plan creates new Attempt", namespace.api.getWorkflow("IDE-160-DECISION-REVISE").currentAttempt.sequence === 2, JSON.stringify(namespace.api.getWorkflow("IDE-160-DECISION-REVISE").currentAttempt), "Revise Plan");
        check("Revise Plan returns Planning Ready", reviseState.primaryPhase === "Planning" && reviseState.controlStatus === "Ready", JSON.stringify(reviseState), "Revise Plan");

        resetRuntime();
        createDecisionReadyWorkflow("IDE-160-DECISION-RETRY");
        const retry = evaluateWorkflowDecision("IDE-160-DECISION-RETRY", {
          retryRequested: true,
          retryTargetPhase: "Execution",
          evidenceReferences: [{ type: "Failure Evidence", id: "RETRY" }],
          actor: "Project Owner"
        });
        check("Retry Route selected", retry.ok === true && retry.data && retry.data.decision && retry.data.decision.selectedRoute === "Retry", retry.code, "Retry");
        const retryState = namespace.api.getWorkflowState("IDE-160-DECISION-RETRY");
        check("Retry creates new Attempt", namespace.api.getWorkflow("IDE-160-DECISION-RETRY").currentAttempt.sequence === 2, JSON.stringify(namespace.api.getWorkflow("IDE-160-DECISION-RETRY").currentAttempt), "Retry");
        check("Retry returns Execution Ready", retryState.primaryPhase === "Execution" && retryState.controlStatus === "Ready", JSON.stringify(retryState), "Retry");
        const retryBudget = namespace.api.getWorkflowRetryBudget("IDE-160-DECISION-RETRY", "Execution");
        check("Retry Budget remains enforced", retryBudget && retryBudget.usedAttempts === 2 && retryBudget.maximumAttempts === 3, JSON.stringify(retryBudget), "Retry");

        resetRuntime();
        createDecisionReadyWorkflow("IDE-160-DECISION-WAIT");
        const waiting = evaluateWorkflowDecision("IDE-160-DECISION-WAIT", {
          humanDecisionRequired: true,
          evidenceReferences: [{ type: "Ambiguity Evidence", id: "WAIT" }]
        });
        check("Ambiguous Decision waits", waiting.ok === true && waiting.code === "DECISION_WAITING_HUMAN", waiting.code, "Human Decision");
        check("Waiting state applied", namespace.api.getWorkflowState("IDE-160-DECISION-WAIT").controlStatus === "Waiting", JSON.stringify(namespace.api.getWorkflowState("IDE-160-DECISION-WAIT")), "Human Decision");
        const humanProceed = selectWorkflowDecisionRoute("IDE-160-DECISION-WAIT", "Proceed", {
          evidenceReferences: [{ type: "Human Decision", id: "HUMAN-PROCEED" }],
          actor: "Project Owner"
        });
        check("Human Route resolves Waiting", humanProceed.ok === true && humanProceed.data && humanProceed.data.decision && humanProceed.data.decision.selectedRoute === "Proceed", humanProceed.code, "Human Decision");

        resetRuntime();
        const incompleteDefinition = namespace.api.createWorkflowDefinition({
          id: "IDE-160-DECISION-INCOMPLETE-DEF",
          version: "1.0.0",
          name: "Decision Incomplete",
          goal: "Validate incomplete input",
          scope: { component: "IDE-160" },
          excludedScope: {},
          requiredComponents: ["IDE-160"],
          requiredCapabilities: ["Decision"],
          inputContract: { type: "Incomplete" },
          requiredEvidence: ["Evidence"],
          requiredPolicies: ["Fail-Closed"],
          executionRequirement: {},
          approvalRequirement: {},
          monitoringRequirement: {},
          completionRequirement: {},
          repositoryBaseline: {},
          handoffTarget: "IDE-170"
        });
        namespace.api.createWorkflow(incompleteDefinition.data.definition.workflowDefinitionId, {}, { workflowId: "IDE-160-DECISION-INCOMPLETE" });
        const incompleteWorkflow = getWorkflowMutable("IDE-160-DECISION-INCOMPLETE");
        incompleteWorkflow.state.primaryPhase = "Decision";
        incompleteWorkflow.state.controlStatus = "Ready";
        const incomplete = evaluateWorkflowDecision("IDE-160-DECISION-INCOMPLETE", {});
        check("Incomplete Decision Input blocked", incomplete.ok === false && incomplete.code === "DECISION_INPUT_INCOMPLETE", incomplete.code, "Input");

        const records = listWorkflowDecisions();
        check("Decision Records appended", records.length >= 1, "count=" + records.length, "Record");
        check("Decision Record hash chain", records.every(function every(record, index) {
          return index === 0 ? record.previousDecisionHash == null : record.previousDecisionHash === records[index - 1].decisionHash;
        }), "hash chain", "Integrity");
        check("Decision Input hash recorded", records.every(function every(record) { return Boolean(record.decisionInputHash && record.decisionHash); }), "hashes", "Integrity");
        const status = getWorkflowDecisionStatus("IDE-160-DECISION-INCOMPLETE");
        check("Decision Status lightweight", status && status.componentId === "IDE-160" && status.status === "Blocked", JSON.stringify(status), "Status");
        check("Persistent commit remains prohibited", namespace.api.getAIDevelopmentWorkflowStatus().persistentCommitAllowed === false, "false", "Safety");
        check("ZIP mutation remains prohibited", namespace.api.getAIDevelopmentWorkflowStatus().zipFileMutationAllowed === false, "false", "Safety");
      } finally {
        internal.importRuntimeState(originalState);
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length, ...originalJournal);
        if (internal.foundationRecordStore) {
          internal.foundationRecordStore.failures = originalRecords.failures || [];
          internal.foundationRecordStore.recoveries = originalRecords.recoveries || [];
          internal.foundationRecordStore.attempts = originalRecords.attempts || [];
          internal.foundationRecordStore.decisions = originalRecords.decisions || [];
        }
        decisionStore.splice(0, decisionStore.length, ...(originalRecords.decisions || []));
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
      id: internal.nextId("IDE-160-DECISION-VALIDATION"),
      componentId: namespace.componentId,
      version: VERSION,
      mode: internal.text(options && options.mode, "Phase 4 Decision Routing / Recovery"),
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

  namespace.constants.DECISION_ROUTES = DECISION_ROUTES;
  namespace.constants.DECISION_ROUTE_PRECEDENCE = ROUTE_PRECEDENCE;
  namespace.constants.DECISION_CONFIDENCE = DECISION_CONFIDENCE;
  namespace.constants.APPROVAL_REQUIREMENTS = APPROVAL_REQUIREMENTS;

  Object.assign(internal, {
    decisionStore: decisionStore,
    buildIDE160DecisionInput: buildDecisionInput,
    evaluateIDE160DecisionGates: evaluateGates,
    buildIDE160DecisionCandidates: buildCandidates
  });

  Object.assign(namespace.api, {
    evaluateWorkflowDecision: evaluateWorkflowDecision,
    getDecisionCandidates: getDecisionCandidates,
    selectWorkflowDecisionRoute: selectWorkflowDecisionRoute,
    getWorkflowDecision: getWorkflowDecision,
    listWorkflowDecisions: listWorkflowDecisions,
    getWorkflowDecisionStatus: getWorkflowDecisionStatus,
    validateWorkflowDecision: validateWorkflowDecision
  });

  namespace.modules.decision = {
    id: "IDE-160-DECISION",
    version: VERSION,
    status: "Ready",
    routeCount: DECISION_ROUTES.length,
    routePrecedence: ROUTE_PRECEDENCE.slice(),
    singleSelectedRoute: true,
    failClosed: true,
    loadedAt: internal.nowIso()
  };

  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);