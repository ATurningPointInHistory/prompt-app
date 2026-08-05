/* ============================================================
   FILE: 13_ai_development_workflow_approval.js
   IDE-160 AI Development Workflow Approval
   Version: 2.0.0
   Phase: Complete - Monitoring / Package / Completion / Integration / Release
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const APPROVAL_VALIDITY_HOURS = 24;
  const REQUIRED_APPROVER = "Project Owner";

  const APPROVAL_TYPES = Object.freeze(["Standard", "Elevated"]);
  const APPROVAL_STATUSES = Object.freeze([
    "Requested",
    "Approved",
    "Rejected",
    "Consumed",
    "Invalidated",
    "Expired"
  ]);

  const foundationStore = internal.foundationRecordStore || {};
  const approvalStore = Array.isArray(foundationStore.approvals) ? foundationStore.approvals : [];
  foundationStore.approvals = approvalStore;

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function getActivePlanMutable(workflow) {
    if (!workflow || !workflow.planning || !workflow.planning.activePlanId) return null;
    const plans = Array.isArray(workflow.planning.candidatePlans) ? workflow.planning.candidatePlans : [];
    return plans.find(function find(plan) {
      return plan && plan.planId === workflow.planning.activePlanId;
    }) || null;
  }

  function getCurrentDecision(workflow) {
    if (!workflow || !workflow.decision || !workflow.decision.currentDecisionId) return null;
    if (typeof namespace.api.getWorkflowDecision === "function") {
      return namespace.api.getWorkflowDecision(workflow.identity.workflowId);
    }
    return null;
  }

  function getExecutionSummary(workflow) {
    return workflow && workflow.execution && workflow.execution.executionSummary
      ? workflow.execution.executionSummary
      : null;
  }

  function asRiskLevel(item) {
    if (typeof item === "string") return item;
    return internal.text(item && (item.level || item.severity || item.risk), "");
  }

  function determineApprovalType(workflow, options) {
    const settings = options && typeof options === "object" ? options : {};
    const plan = getActivePlanMutable(workflow);
    const summary = getExecutionSummary(workflow);
    const decision = getCurrentDecision(workflow);
    const tasks = plan && Array.isArray(plan.tasks) ? plan.tasks : [];
    const risks = internal.asArray((decision && decision.remainingRisk) || workflow.context.remainingRisk || []);
    const unresolved = internal.asArray((decision && decision.unresolvedItems) || workflow.context.unresolvedItems || []);
    const elevated = settings.forceElevated === true ||
      tasks.some(function some(task) {
        return task && (task.sideEffectType === "Repository Mutation" || task.operationType === "Controlled Mutation" || task.mutationScope);
      }) ||
      Number(summary && summary.metricsSummary && summary.metricsSummary.repositoryWriteCount) > 0 ||
      risks.some(function some(item) { return ["Critical", "High"].includes(asRiskLevel(item)); }) ||
      unresolved.length > 0 ||
      settings.humanOverride === true ||
      settings.retryApproval === true ||
      settings.planRevisionApproval === true;
    return elevated ? "Elevated" : "Standard";
  }

  function buildApprovalContext(workflow, options) {
    const settings = options && typeof options === "object" ? options : {};
    const plan = getActivePlanMutable(workflow);
    const summary = getExecutionSummary(workflow);
    const decision = getCurrentDecision(workflow);
    const repository = decision && decision.repositoryIntegrityResult || summary && summary.repositoryIntegrity || {};
    const policy = decision && decision.policyResult || {};
    const validation = decision && decision.validationResult || {};
    const rollback = decision && decision.rollbackResult || {};
    const context = {
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      planId: plan && plan.planId || null,
      planVersion: plan && plan.planVersion || null,
      planHash: plan && plan.planHash || null,
      executionSummaryId: summary && summary.executionSummaryId || null,
      executionSummaryHash: summary && summary.integrity && summary.integrity.hash || null,
      decisionId: decision && decision.decisionId || null,
      decisionHash: decision && decision.decisionHash || null,
      decisionInputHash: decision && decision.decisionInputHash || null,
      selectedRoute: decision && decision.selectedRoute || null,
      repositoryId: repository.repositoryId || null,
      repositoryVersion: repository.repositoryVersion || null,
      repositoryHash: repository.currentHash || repository.repositoryHash || null,
      repositoryIntegrityVerified: repository.integrityVerified === true,
      unexpectedWrite: repository.unexpectedWrite === true,
      persistentCommitExecuted: repository.persistentCommitExecuted === true,
      zipFileMutation: repository.zipFileMutation === true,
      policyStatus: policy.status || null,
      policyHardDeny: policy.hardDeny === true,
      policyVersion: policy.version || null,
      validationStatus: validation.status || null,
      validationPassed: validation.passed !== false,
      rollbackRequired: rollback.required === true,
      rollbackVerified: rollback.verified !== false,
      sourceRestored: rollback.sourceRestored !== false && repository.sourceRestored !== false,
      risk: internal.clone((decision && decision.remainingRisk) || workflow.context.remainingRisk || []),
      unresolvedItems: internal.clone((decision && decision.unresolvedItems) || workflow.context.unresolvedItems || []),
      approvalType: determineApprovalType(workflow, settings)
    };
    const integrity = internal.hashCanonicalSync(context);
    return { context: context, integrity: integrity, decision: decision, plan: plan, summary: summary };
  }

  function validateApprovalContext(workflow, built) {
    const context = built.context;
    const missing = [];
    if (!workflow || workflow.state.primaryPhase !== "Approval") missing.push("Approval Phase");
    if (!context.workflowId) missing.push("Workflow ID");
    if (!context.attemptId) missing.push("Attempt ID");
    if (!context.planId || !context.planVersion || !context.planHash) missing.push("Frozen Plan Binding");
    if (!context.executionSummaryId || !context.executionSummaryHash) missing.push("Execution Summary Binding");
    if (!context.decisionId || !context.decisionHash || !context.decisionInputHash) missing.push("Decision Binding");
    if (context.selectedRoute !== "Proceed") missing.push("Proceed Decision");
    if (!built.decision || built.decision.approvalRequirement !== "Required") missing.push("Workflow Approval Requirement");
    if (!context.repositoryId || !context.repositoryVersion || !context.repositoryHash) missing.push("Repository Binding");
    return { valid: missing.length === 0, missing: missing };
  }

  function hardDenyReasons(context) {
    const reasons = [];
    if (context.policyHardDeny) reasons.push("Policy Hard Deny");
    if (!context.repositoryIntegrityVerified) reasons.push("Repository Integrity Not Verified");
    if (context.unexpectedWrite) reasons.push("Unexpected Repository Write");
    if (context.persistentCommitExecuted) reasons.push("Persistent Commit Executed");
    if (context.zipFileMutation) reasons.push("ZIP File Mutation");
    if (context.validationPassed === false) reasons.push("Validation Failed");
    if (context.rollbackRequired && !context.rollbackVerified) reasons.push("Rollback Not Verified");
    if (!context.sourceRestored) reasons.push("Source Not Restored");
    return reasons;
  }

  function appendApprovalRecord(record) {
    const previous = approvalStore.length ? approvalStore[approvalStore.length - 1] : null;
    const source = Object.assign({}, record, {
      previousApprovalHash: previous && previous.approvalHash || null,
      hashAlgorithm: null,
      approvalHash: null
    });
    const integrity = internal.hashCanonicalSync(source);
    source.hashAlgorithm = integrity.algorithm;
    source.approvalHash = integrity.hash;
    approvalStore.push(source);
    if (approvalStore.length > 50) approvalStore.splice(0, approvalStore.length - 50);
    if (typeof internal.persistFoundationRecords === "function") internal.persistFoundationRecords();
    return source;
  }

  function findRequest(requestId) {
    return approvalStore.find(function find(record) {
      return record && record.eventType === "Request" && record.approvalRequestId === requestId;
    }) || null;
  }

  function recordsForRequest(requestId) {
    return approvalStore.filter(function filter(record) {
      return record && record.approvalRequestId === requestId;
    });
  }

  function latestForRequest(requestId) {
    const records = recordsForRequest(requestId);
    return records.length ? records[records.length - 1] : null;
  }

  function latestWorkflowApproval(workflowId) {
    const records = approvalStore.filter(function filter(record) {
      return record && record.workflowId === workflowId;
    });
    return records.length ? records[records.length - 1] : null;
  }

  function updateWorkflowApproval(workflow, record) {
    workflow.approval = Object.assign({}, workflow.approval || {}, {
      status: record.status,
      currentRequestId: record.approvalRequestId,
      currentApprovalRecordId: record.approvalRecordId,
      approvalType: record.approvalType,
      contextHash: record.contextHash,
      expiresAt: record.expiresAt || workflow.approval && workflow.approval.expiresAt || null,
      approvedAt: record.approvedAt || workflow.approval && workflow.approval.approvedAt || null,
      consumedAt: record.consumedAt || workflow.approval && workflow.approval.consumedAt || null,
      updatedAt: record.createdAt
    });
    workflow.context.approvalReferences = internal.asArray(workflow.context.approvalReferences);
    workflow.context.approvalReferences.push({
      approvalRecordId: record.approvalRecordId,
      approvalRequestId: record.approvalRequestId,
      status: record.status,
      approvalHash: record.approvalHash
    });
    workflow.timeline.push({ type: "Workflow Approval " + record.status, approvalRecordId: record.approvalRecordId, at: record.createdAt });
    workflow.updatedAt = record.createdAt;
    internal.persistRuntimeIfAvailable();
  }

  function transitionApproval(workflow, fromStatus, toStatus, reasonCode, recordId) {
    return namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Approval",
      fromStatus: fromStatus,
      toPhase: "Approval",
      toStatus: toStatus,
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: reasonCode,
      evidenceReferences: [{ type: "Workflow Approval", id: recordId }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
  }

  function createWorkflowApprovalRequest(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);

    if (workflow.state.primaryPhase !== "Approval") {
      return internal.buildResult(false, "APPROVAL_PHASE_REQUIRED", "Blocked", { currentState: internal.clone(workflow.state) });
    }
    if (workflow.state.controlStatus === "Blocked") {
      const ready = transitionApproval(workflow, "Blocked", "Ready", "APPROVAL_REAPPROVAL_READY", workflow.approval && workflow.approval.currentApprovalRecordId || "REAPPROVAL");
      if (!ready.ok) return ready;
    }
    if (workflow.state.controlStatus !== "Ready") {
      return internal.buildResult(false, "APPROVAL_STATE_INVALID", "Blocked", { currentState: internal.clone(workflow.state) });
    }

    const built = buildApprovalContext(workflow, settings);
    const validation = validateApprovalContext(workflow, built);
    if (!validation.valid) {
      return internal.buildResult(false, "APPROVAL_CONTEXT_INCOMPLETE", "Blocked", { missing: validation.missing });
    }
    const latest = latestWorkflowApproval(workflow.identity.workflowId);
    if (latest && latest.status === "Rejected" && latest.contextHash === built.integrity.hash) {
      return internal.buildResult(false, "REJECTED_CONTEXT_RESUBMISSION_PROHIBITED", "Blocked", {
        approvalRequestId: latest.approvalRequestId,
        contextHash: built.integrity.hash
      });
    }

    const issuedAt = settings.issuedAt ? new Date(settings.issuedAt) : new Date();
    const issuedTime = Number.isFinite(issuedAt.getTime()) ? issuedAt : new Date();
    const expiresAt = new Date(issuedTime.getTime() + APPROVAL_VALIDITY_HOURS * 60 * 60 * 1000);
    const requestId = internal.nextId("IDE-160-APPROVAL-REQUEST");
    const started = transitionApproval(workflow, "Ready", "Running", "WORKFLOW_APPROVAL_REQUESTED", requestId);
    if (!started.ok) return started;

    const record = appendApprovalRecord({
      approvalRecordId: internal.nextId("IDE-160-APPROVAL-RECORD"),
      approvalRequestId: requestId,
      eventType: "Request",
      status: "Requested",
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      approvalType: built.context.approvalType,
      requiredApprover: REQUIRED_APPROVER,
      contextBinding: internal.clone(built.context),
      contextHash: built.integrity.hash,
      contextHashAlgorithm: built.integrity.algorithm,
      decisionReference: { decisionId: built.context.decisionId, decisionHash: built.context.decisionHash },
      executionSummaryReference: { executionSummaryId: built.context.executionSummaryId, hash: built.context.executionSummaryHash },
      repositoryContext: {
        repositoryId: built.context.repositoryId,
        repositoryVersion: built.context.repositoryVersion,
        repositoryHash: built.context.repositoryHash
      },
      riskSummary: internal.clone(built.context.risk),
      unresolvedItems: internal.clone(built.context.unresolvedItems),
      reapprovalOf: settings.reapprovalOf || null,
      requestedBy: internal.text(settings.actor, "IDE-160"),
      issuedAt: issuedTime.toISOString(),
      expiresAt: expiresAt.toISOString(),
      createdAt: internal.nowIso()
    });
    updateWorkflowApproval(workflow, record);
    return internal.buildResult(true, "WORKFLOW_APPROVAL_REQUEST_CREATED", "Requested", {
      approvalRequest: internal.clone(record),
      workflowState: internal.clone(workflow.state)
    });
  }

  function expireRequestIfNeeded(workflow, request) {
    const latest = request && latestForRequest(request.approvalRequestId);
    if (!request || !latest || ["Consumed", "Rejected", "Invalidated", "Expired"].includes(latest.status)) return latest;
    if (Date.now() <= new Date(request.expiresAt).getTime()) return latest;
    const expired = appendApprovalRecord({
      approvalRecordId: internal.nextId("IDE-160-APPROVAL-RECORD"),
      approvalRequestId: request.approvalRequestId,
      eventType: "Expiration",
      status: "Expired",
      workflowId: request.workflowId,
      workflowVersion: request.workflowVersion,
      attemptId: request.attemptId,
      approvalType: request.approvalType,
      contextHash: request.contextHash,
      expiresAt: request.expiresAt,
      reason: "Approval Request exceeded the 24-hour validity period.",
      createdAt: internal.nowIso()
    });
    if (workflow && workflow.state.primaryPhase === "Approval" && workflow.state.controlStatus === "Running") {
      transitionApproval(workflow, "Running", "Blocked", "WORKFLOW_APPROVAL_EXPIRED", expired.approvalRecordId);
    }
    if (workflow) updateWorkflowApproval(workflow, expired);
    return expired;
  }

  function resolveCurrentRequest(workflow) {
    const requestId = workflow && workflow.approval && workflow.approval.currentRequestId;
    const request = requestId ? findRequest(requestId) : null;
    if (!request) return { request: null, latest: null };
    return { request: request, latest: expireRequestIfNeeded(workflow, request) };
  }

  function validateBoundContext(workflow, request) {
    const rebuilt = buildApprovalContext(workflow, { forceElevated: request.approvalType === "Elevated" });
    return {
      valid: rebuilt.integrity.hash === request.contextHash,
      expectedHash: request.contextHash,
      currentHash: rebuilt.integrity.hash,
      currentContext: rebuilt.context
    };
  }

  function approveWorkflow(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (settings.confirmed !== true) return internal.buildResult(false, "APPROVAL_EXPLICIT_CONFIRMATION_REQUIRED", "Blocked", null);
    const approver = internal.text(settings.approver, "");
    if (approver !== REQUIRED_APPROVER) return internal.buildResult(false, "APPROVER_NOT_AUTHORIZED", "Blocked", { approver: approver || null });

    const current = resolveCurrentRequest(workflow);
    if (!current.request) return internal.buildResult(false, "APPROVAL_REQUEST_NOT_FOUND", "Blocked", null);
    if (!current.latest || current.latest.status !== "Requested") {
      return internal.buildResult(false, "APPROVAL_REQUEST_NOT_APPROVABLE", "Blocked", { status: current.latest && current.latest.status || null });
    }
    const binding = validateBoundContext(workflow, current.request);
    if (!binding.valid) {
      return invalidateWorkflowApproval(workflowId, {
        reason: "Approval Context changed before approval.",
        evidenceReferences: settings.evidenceReferences,
        actor: approver
      });
    }
    const hardDenies = hardDenyReasons(binding.currentContext);
    if (hardDenies.length) {
      return internal.buildResult(false, "APPROVAL_HARD_DENY", "Blocked", { reasons: hardDenies });
    }

    const record = appendApprovalRecord({
      approvalRecordId: internal.nextId("IDE-160-APPROVAL-RECORD"),
      approvalRequestId: current.request.approvalRequestId,
      eventType: "Approval",
      status: "Approved",
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      approvalType: current.request.approvalType,
      contextHash: current.request.contextHash,
      approver: approver,
      approvalEvidence: internal.asArray(settings.evidenceReferences).map(internal.clone),
      explicitAction: true,
      approvedAt: internal.nowIso(),
      expiresAt: current.request.expiresAt,
      createdAt: internal.nowIso()
    });
    updateWorkflowApproval(workflow, record);
    return internal.buildResult(true, "WORKFLOW_APPROVED", "Approved", { approval: internal.clone(record) });
  }

  function rejectWorkflow(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (settings.confirmed !== true) return internal.buildResult(false, "REJECTION_EXPLICIT_CONFIRMATION_REQUIRED", "Blocked", null);
    if (internal.text(settings.approver, "") !== REQUIRED_APPROVER) return internal.buildResult(false, "APPROVER_NOT_AUTHORIZED", "Blocked", null);
    const current = resolveCurrentRequest(workflow);
    if (!current.request || !current.latest || current.latest.status !== "Requested") {
      return internal.buildResult(false, "APPROVAL_REQUEST_NOT_REJECTABLE", "Blocked", { status: current.latest && current.latest.status || null });
    }
    const record = appendApprovalRecord({
      approvalRecordId: internal.nextId("IDE-160-APPROVAL-RECORD"),
      approvalRequestId: current.request.approvalRequestId,
      eventType: "Rejection",
      status: "Rejected",
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      approvalType: current.request.approvalType,
      contextHash: current.request.contextHash,
      approver: REQUIRED_APPROVER,
      reason: internal.text(settings.reason, "Workflow Approval rejected."),
      explicitAction: true,
      rejectedAt: internal.nowIso(),
      createdAt: internal.nowIso()
    });
    const transition = transitionApproval(workflow, "Running", "Rejected", "WORKFLOW_APPROVAL_REJECTED", record.approvalRecordId);
    if (!transition.ok) return transition;
    updateWorkflowApproval(workflow, record);
    return internal.buildResult(true, "WORKFLOW_APPROVAL_REJECTED", "Rejected", { approval: internal.clone(record) });
  }

  function invalidateWorkflowApproval(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const current = resolveCurrentRequest(workflow);
    if (!current.request || !current.latest || !["Requested", "Approved"].includes(current.latest.status)) {
      return internal.buildResult(false, "APPROVAL_NOT_INVALIDATABLE", "Blocked", { status: current.latest && current.latest.status || null });
    }
    const rebuilt = buildApprovalContext(workflow, { forceElevated: current.request.approvalType === "Elevated" });
    const record = appendApprovalRecord({
      approvalRecordId: internal.nextId("IDE-160-APPROVAL-RECORD"),
      approvalRequestId: current.request.approvalRequestId,
      eventType: "Invalidation",
      status: "Invalidated",
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      approvalType: current.request.approvalType,
      contextHash: current.request.contextHash,
      currentContextHash: rebuilt.integrity.hash,
      reason: internal.text(settings.reason, "Approval Context materially changed."),
      actor: internal.text(settings.actor, "IDE-160"),
      evidenceReferences: internal.asArray(settings.evidenceReferences).map(internal.clone),
      invalidatedAt: internal.nowIso(),
      createdAt: internal.nowIso()
    });
    if (workflow.state.primaryPhase === "Approval" && workflow.state.controlStatus === "Running") {
      const transition = transitionApproval(workflow, "Running", "Blocked", "WORKFLOW_APPROVAL_INVALIDATED", record.approvalRecordId);
      if (!transition.ok) return transition;
    }
    updateWorkflowApproval(workflow, record);
    return internal.buildResult(true, "WORKFLOW_APPROVAL_INVALIDATED", "Invalidated", { approval: internal.clone(record) });
  }

  function requestWorkflowReapproval(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const latest = latestWorkflowApproval(workflow.identity.workflowId);
    if (!latest || !["Invalidated", "Expired", "Rejected"].includes(latest.status)) {
      return internal.buildResult(false, "REAPPROVAL_NOT_AVAILABLE", "Blocked", { status: latest && latest.status || null });
    }
    const rebuilt = buildApprovalContext(workflow, settings);
    if (latest.status === "Rejected" && latest.contextHash === rebuilt.integrity.hash) {
      return internal.buildResult(false, "REJECTED_CONTEXT_RESUBMISSION_PROHIBITED", "Blocked", { contextHash: latest.contextHash });
    }
    if (workflow.state.controlStatus === "Rejected") {
      let result = transitionApproval(workflow, "Rejected", "Retry Required", "APPROVAL_CONTEXT_REVISION_REQUIRED", latest.approvalRecordId);
      if (!result.ok) return result;
      result = transitionApproval(workflow, "Retry Required", "Ready", "APPROVAL_REAPPROVAL_READY", latest.approvalRecordId);
      if (!result.ok) return result;
    }
    return createWorkflowApprovalRequest(workflowId, Object.assign({}, settings, {
      reapprovalOf: latest.approvalRequestId
    }));
  }

  function consumeWorkflowApproval(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    const current = resolveCurrentRequest(workflow);
    if (!current.request || !current.latest || current.latest.status !== "Approved") {
      return internal.buildResult(false, "APPROVAL_NOT_CONSUMABLE", "Blocked", { status: current.latest && current.latest.status || null });
    }
    const binding = validateBoundContext(workflow, current.request);
    if (!binding.valid) {
      return invalidateWorkflowApproval(workflowId, {
        reason: "Approval Context changed before consumption.",
        actor: "IDE-160"
      });
    }
    const hardDenies = hardDenyReasons(binding.currentContext);
    if (hardDenies.length) return internal.buildResult(false, "APPROVAL_HARD_DENY", "Blocked", { reasons: hardDenies });

    const record = appendApprovalRecord({
      approvalRecordId: internal.nextId("IDE-160-APPROVAL-RECORD"),
      approvalRequestId: current.request.approvalRequestId,
      eventType: "Consumption",
      status: "Consumed",
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      approvalType: current.request.approvalType,
      contextHash: current.request.contextHash,
      consumedBy: internal.text(settings.actor, "IDE-160"),
      consumedAt: internal.nowIso(),
      createdAt: internal.nowIso()
    });
    const succeeded = transitionApproval(workflow, "Running", "Succeeded", "WORKFLOW_APPROVAL_CONSUMED", record.approvalRecordId);
    if (!succeeded.ok) return succeeded;
    const monitoring = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Approval",
      fromStatus: "Succeeded",
      toPhase: "Monitoring",
      toStatus: "Ready",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "APPROVAL_HANDOFF_TO_MONITORING",
      evidenceReferences: [{ type: "Workflow Approval", id: record.approvalRecordId }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
    if (!monitoring.ok) return monitoring;
    updateWorkflowApproval(workflow, record);
    return internal.buildResult(true, "WORKFLOW_APPROVAL_CONSUMED", "Consumed", {
      approval: internal.clone(record),
      workflowState: internal.clone(workflow.state)
    });
  }

  function getWorkflowApproval(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow || !workflow.approval || !workflow.approval.currentRequestId) return null;
    const request = findRequest(workflow.approval.currentRequestId);
    const latest = request ? latestForRequest(request.approvalRequestId) : null;
    return { request: internal.clone(request), latest: internal.clone(latest), records: recordsForRequest(workflow.approval.currentRequestId).map(internal.clone) };
  }

  function listWorkflowApprovals(workflowId) {
    const target = String(workflowId || "");
    return approvalStore.filter(function filter(record) {
      return !target || record.workflowId === target;
    }).map(internal.clone);
  }

  function getWorkflowApprovalStatus(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    if (workflow) resolveCurrentRequest(workflow);
    const latest = workflow ? latestWorkflowApproval(workflow.identity.workflowId) : null;
    return {
      id: "IDE-160-APPROVAL-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      workflowId: workflow && workflow.identity.workflowId || null,
      status: latest && latest.status || "Not Started",
      approvalType: latest && latest.approvalType || null,
      approvalRequestId: latest && latest.approvalRequestId || null,
      approvalRecordId: latest && latest.approvalRecordId || null,
      requiredApprover: REQUIRED_APPROVER,
      validityHours: APPROVAL_VALIDITY_HOURS,
      contextHash: latest && latest.contextHash || null,
      recordCount: listWorkflowApprovals(workflowId).length,
      updatedAt: internal.nowIso()
    };
  }

  function validateWorkflowApproval(options) {
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group || "Approval" });
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

      function resetRuntime() {
        state.definitions.clear();
        state.workflows.clear();
        state.activeWorkflowId = null;
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length);
        approvalStore.splice(0, approvalStore.length);
        if (internal.foundationRecordStore) internal.foundationRecordStore.approvals = approvalStore;
      }

      function createApprovalReadyWorkflow(workflowId, mutation) {
        const definitionId = workflowId + "-DEF";
        namespace.api.createWorkflowDefinition({
          id: definitionId,
          version: "1.0.0",
          name: "Approval Validation",
          goal: "Validate Workflow Approval",
          scope: { component: "IDE-160", phase: 5 },
          excludedScope: { persistentCommit: true, zipMutation: true },
          requiredComponents: ["IDE-160"],
          requiredCapabilities: ["Approval"],
          inputContract: { type: "Approval Validation" },
          requiredEvidence: ["Decision Record"],
          requiredPolicies: ["Fail-Closed"],
          executionRequirement: { mutation: mutation === true },
          approvalRequirement: { required: true },
          monitoringRequirement: { required: true },
          completionRequirement: { approval: true },
          repositoryBaseline: { repositoryId: "AI-PROMPT-OS", repositoryVersion: "v6.0", repositoryHash: "APPROVAL-REPOSITORY-HASH" },
          handoffTarget: "IDE-170"
        });
        namespace.api.createWorkflow(definitionId, {}, { workflowId: workflowId, actor: "Validation" });
        const workflow = getWorkflowMutable(workflowId);
        const plan = {
          planId: workflowId + "-PLAN",
          planVersion: "1.0.0",
          planHash: "PLAN-HASH-" + workflowId,
          status: "Frozen",
          tasks: [{
            taskId: "TASK-APPROVAL",
            operationType: mutation ? "Controlled Mutation" : "Read",
            sideEffectType: mutation ? "Repository Mutation" : "Read-Only",
            mutationScope: mutation ? { file: "approval_test.js", function: "test" } : null
          }]
        };
        workflow.planning = { activePlanId: plan.planId, candidatePlans: [plan] };
        workflow.execution = {
          status: "Succeeded",
          executionSummary: {
            executionSummaryId: workflowId + "-EXECUTION-SUMMARY",
            integrity: { algorithm: "FNV-1A-32", hash: "EXECUTION-HASH-" + workflowId },
            metricsSummary: { repositoryWriteCount: mutation ? 1 : 0, rollbackCount: mutation ? 1 : 0 },
            repositoryIntegrity: {
              repositoryId: "AI-PROMPT-OS",
              repositoryVersion: "v6.0",
              repositoryHash: "APPROVAL-REPOSITORY-HASH",
              currentHash: "APPROVAL-REPOSITORY-HASH",
              integrityVerified: true,
              unexpectedWrite: false,
              persistentCommitExecuted: false,
              zipFileMutation: false,
              sourceRestored: true,
              rollbackVerified: true
            }
          }
        };
        const decision = {
          decisionId: workflowId + "-DECISION",
          decisionHash: "DECISION-HASH-" + workflowId,
          decisionInputHash: "DECISION-INPUT-HASH-" + workflowId,
          workflowId: workflowId,
          attemptId: workflow.currentAttempt.attemptId,
          planId: plan.planId,
          planVersion: plan.planVersion,
          executionSummaryReference: { executionSummaryId: workflow.execution.executionSummary.executionSummaryId, hash: workflow.execution.executionSummary.integrity.hash },
          selectedRoute: "Proceed",
          approvalRequirement: "Required",
          policyResult: { status: "Passed", hardDeny: false, version: "1.0.0" },
          validationResult: { status: "Passed", passed: true },
          repositoryIntegrityResult: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            currentHash: "APPROVAL-REPOSITORY-HASH",
            integrityVerified: true,
            unexpectedWrite: false,
            persistentCommitExecuted: false,
            zipFileMutation: false,
            sourceRestored: true
          },
          rollbackResult: { required: mutation === true, executed: true, verified: true, sourceRestored: true },
          remainingRisk: [],
          unresolvedItems: []
        };
        internal.decisionStore.push(decision);
        workflow.decision = { status: "Applied", currentDecisionId: decision.decisionId, selectedRoute: "Proceed", approvalRequirement: "Required" };
        workflow.context.decisionReference = { decisionId: decision.decisionId, decisionHash: decision.decisionHash, selectedRoute: "Proceed" };
        workflow.state.primaryPhase = "Approval";
        workflow.state.controlStatus = "Ready";
        workflow.state.previousPhase = "Decision";
        workflow.state.previousStatus = "Succeeded";
        workflow.state.updatedAt = internal.nowIso();
        return workflow;
      }

      try {
        check("Approval module loaded", namespace.modules.approval && namespace.modules.approval.status === "Ready", namespace.modules.approval && namespace.modules.approval.status, "Module");
        check("Approval types available", APPROVAL_TYPES.length === 2, APPROVAL_TYPES.join(", "), "Module");
        check("Approval validity fixed", APPROVAL_VALIDITY_HOURS === 24, String(APPROVAL_VALIDITY_HOURS), "Policy");
        check("Project Owner required", REQUIRED_APPROVER === "Project Owner", REQUIRED_APPROVER, "Policy");

        resetRuntime();
        createApprovalReadyWorkflow("IDE-160-APPROVAL-ELEVATED", true);
        const request = createWorkflowApprovalRequest("IDE-160-APPROVAL-ELEVATED", { actor: "IDE-160" });
        check("Approval Request created", request.ok === true && request.code === "WORKFLOW_APPROVAL_REQUEST_CREATED", request.code, "Request");
        check("Mutation requires Elevated Approval", request.data.approvalRequest.approvalType === "Elevated", request.data.approvalRequest.approvalType, "Request");
        check("Approval context hash recorded", Boolean(request.data.approvalRequest.contextHash), request.data.approvalRequest.contextHash, "Binding");
        check("Approval context binds Decision", Boolean(request.data.approvalRequest.contextBinding.decisionId && request.data.approvalRequest.contextBinding.decisionInputHash), JSON.stringify(request.data.approvalRequest.decisionReference), "Binding");
        check("Approval context binds Repository", request.data.approvalRequest.contextBinding.repositoryHash === "APPROVAL-REPOSITORY-HASH", request.data.approvalRequest.contextBinding.repositoryHash, "Binding");
        const wrongApprover = approveWorkflow("IDE-160-APPROVAL-ELEVATED", { confirmed: true, approver: "AI" });
        check("Unauthorized approver rejected", wrongApprover.ok === false && wrongApprover.code === "APPROVER_NOT_AUTHORIZED", wrongApprover.code, "Authorization");
        const noConfirmation = approveWorkflow("IDE-160-APPROVAL-ELEVATED", { approver: "Project Owner" });
        check("Explicit confirmation required", noConfirmation.ok === false && noConfirmation.code === "APPROVAL_EXPLICIT_CONFIRMATION_REQUIRED", noConfirmation.code, "Authorization");
        const approved = approveWorkflow("IDE-160-APPROVAL-ELEVATED", { confirmed: true, approver: "Project Owner", evidenceReferences: [{ type: "Owner Approval", id: "APPROVE" }] });
        check("Workflow approved", approved.ok === true && approved.code === "WORKFLOW_APPROVED", approved.code, "Approval");
        const consumed = consumeWorkflowApproval("IDE-160-APPROVAL-ELEVATED", { actor: "IDE-160" });
        check("Approval consumed", consumed.ok === true && consumed.code === "WORKFLOW_APPROVAL_CONSUMED", consumed.code, "Consumption");
        check("Consumption enters Monitoring Ready", consumed.data.workflowState.primaryPhase === "Monitoring" && consumed.data.workflowState.controlStatus === "Ready", JSON.stringify(consumed.data.workflowState), "Consumption");
        const consumedAgain = consumeWorkflowApproval("IDE-160-APPROVAL-ELEVATED", {});
        check("Approval one-time consumption", consumedAgain.ok === false && consumedAgain.code === "APPROVAL_NOT_CONSUMABLE", consumedAgain.code, "Consumption");

        resetRuntime();
        createApprovalReadyWorkflow("IDE-160-APPROVAL-STANDARD", false);
        const standard = createWorkflowApprovalRequest("IDE-160-APPROVAL-STANDARD", {});
        check("Read-only uses Standard Approval", standard.ok === true && standard.data.approvalRequest.approvalType === "Standard", standard.data.approvalRequest.approvalType, "Request");

        resetRuntime();
        createApprovalReadyWorkflow("IDE-160-APPROVAL-EXPIRED", false);
        const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
        createWorkflowApprovalRequest("IDE-160-APPROVAL-EXPIRED", { issuedAt: oldDate });
        const expiredStatus = getWorkflowApprovalStatus("IDE-160-APPROVAL-EXPIRED");
        check("Approval expires after 24 hours", expiredStatus.status === "Expired", expiredStatus.status, "Expiration");
        check("Expired Approval blocked", namespace.api.getWorkflowState("IDE-160-APPROVAL-EXPIRED").controlStatus === "Blocked", JSON.stringify(namespace.api.getWorkflowState("IDE-160-APPROVAL-EXPIRED")), "Expiration");

        resetRuntime();
        const changedWorkflow = createApprovalReadyWorkflow("IDE-160-APPROVAL-CHANGED", false);
        createWorkflowApprovalRequest("IDE-160-APPROVAL-CHANGED", {});
        approveWorkflow("IDE-160-APPROVAL-CHANGED", { confirmed: true, approver: "Project Owner" });
        changedWorkflow.planning.candidatePlans[0].planHash = "CHANGED-PLAN-HASH";
        const changedConsume = consumeWorkflowApproval("IDE-160-APPROVAL-CHANGED", {});
        check("Material change invalidates Approval", changedConsume.ok === true && changedConsume.code === "WORKFLOW_APPROVAL_INVALIDATED", changedConsume.code, "Invalidation");
        check("Invalidated Approval blocked", namespace.api.getWorkflowState("IDE-160-APPROVAL-CHANGED").controlStatus === "Blocked", JSON.stringify(namespace.api.getWorkflowState("IDE-160-APPROVAL-CHANGED")), "Invalidation");
        const reapproval = requestWorkflowReapproval("IDE-160-APPROVAL-CHANGED", {});
        check("Reapproval creates new Request", reapproval.ok === true && Boolean(reapproval.data && reapproval.data.approvalRequest && reapproval.data.approvalRequest.reapprovalOf), JSON.stringify(reapproval.data), "Reapproval");

        resetRuntime();
        createApprovalReadyWorkflow("IDE-160-APPROVAL-REJECT", false);
        createWorkflowApprovalRequest("IDE-160-APPROVAL-REJECT", {});
        const rejected = rejectWorkflow("IDE-160-APPROVAL-REJECT", { confirmed: true, approver: "Project Owner", reason: "Rejected by validation" });
        check("Workflow Approval rejected", rejected.ok === true && rejected.code === "WORKFLOW_APPROVAL_REJECTED", rejected.code, "Rejection");
        const unchanged = requestWorkflowReapproval("IDE-160-APPROVAL-REJECT", {});
        check("Rejected unchanged context cannot resubmit", unchanged.ok === false && unchanged.code === "REJECTED_CONTEXT_RESUBMISSION_PROHIBITED", unchanged.code, "Rejection");

        resetRuntime();
        const hardDenyWorkflow = createApprovalReadyWorkflow("IDE-160-APPROVAL-HARD-DENY", false);
        internal.decisionStore.find(function find(item) { return item.decisionId === hardDenyWorkflow.decision.currentDecisionId; }).policyResult = { status: "Hard Deny", hardDeny: true, version: "1.0.0" };
        createWorkflowApprovalRequest("IDE-160-APPROVAL-HARD-DENY", {});
        const hardDeny = approveWorkflow("IDE-160-APPROVAL-HARD-DENY", { confirmed: true, approver: "Project Owner" });
        check("Approval cannot override Hard Deny", hardDeny.ok === false && hardDeny.code === "APPROVAL_HARD_DENY", hardDeny.code, "Safety");

        const records = listWorkflowApprovals();
        check("Approval Records append-only", records.length >= 1, "count=" + records.length, "Record");
        check("Approval Record hash chain", records.every(function every(record, index) {
          return index === 0 ? record.previousApprovalHash == null : record.previousApprovalHash === records[index - 1].approvalHash;
        }), "hash chain", "Integrity");
        check("Approval Status lightweight", getWorkflowApprovalStatus("IDE-160-APPROVAL-HARD-DENY").componentId === "IDE-160", JSON.stringify(getWorkflowApprovalStatus("IDE-160-APPROVAL-HARD-DENY")), "Status");
        check("Persistent commit remains prohibited", namespace.api.getAIDevelopmentWorkflowStatus().persistentCommitAllowed === false, "false", "Safety");
        check("ZIP mutation remains prohibited", namespace.api.getAIDevelopmentWorkflowStatus().zipFileMutationAllowed === false, "false", "Safety");
      } finally {
        internal.importRuntimeState(originalState);
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length, ...originalJournal);
        if (internal.foundationRecordStore) {
          Object.keys(internal.foundationRecordStore).forEach(function remove(key) { delete internal.foundationRecordStore[key]; });
          Object.assign(internal.foundationRecordStore, originalRecords || {});
          internal.foundationRecordStore.approvals = Array.isArray(originalRecords.approvals) ? originalRecords.approvals : [];
        }
        approvalStore.splice(0, approvalStore.length, ...(originalRecords.approvals || []));
        state.lastValidation = originalValidation;
        state.lastPersistence = originalPersistence;
        state.lastError = originalError;
        state.updatedAt = originalUpdatedAt;
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
      id: internal.nextId("IDE-160-APPROVAL-VALIDATION"),
      componentId: namespace.componentId,
      version: VERSION,
      mode: internal.text(options && options.mode, "Phase 5 Workflow Approval"),
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

  namespace.constants.APPROVAL_TYPES = APPROVAL_TYPES;
  namespace.constants.APPROVAL_STATUSES = APPROVAL_STATUSES;
  namespace.constants.APPROVAL_VALIDITY_HOURS = APPROVAL_VALIDITY_HOURS;
  namespace.constants.WORKFLOW_APPROVER = REQUIRED_APPROVER;

  Object.assign(internal, {
    approvalStore: approvalStore,
    buildIDE160ApprovalContext: buildApprovalContext,
    determineIDE160ApprovalType: determineApprovalType
  });

  Object.assign(namespace.api, {
    createWorkflowApprovalRequest: createWorkflowApprovalRequest,
    approveWorkflow: approveWorkflow,
    rejectWorkflow: rejectWorkflow,
    consumeWorkflowApproval: consumeWorkflowApproval,
    invalidateWorkflowApproval: invalidateWorkflowApproval,
    requestWorkflowReapproval: requestWorkflowReapproval,
    getWorkflowApproval: getWorkflowApproval,
    listWorkflowApprovals: listWorkflowApprovals,
    getWorkflowApprovalStatus: getWorkflowApprovalStatus,
    validateWorkflowApproval: validateWorkflowApproval
  });

  namespace.modules.approval = {
    id: "IDE-160-APPROVAL",
    version: VERSION,
    status: "Ready",
    approvalTypes: APPROVAL_TYPES.slice(),
    requiredApprover: REQUIRED_APPROVER,
    validityHours: APPROVAL_VALIDITY_HOURS,
    contextBound: true,
    oneTimeConsumption: true,
    loadedAt: internal.nowIso()
  };

  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);