/* ============================================================
   FILE: 13_ai_development_workflow_monitoring.js
   IDE-160 AI Development Workflow Monitoring / Metrics
   Version: 2.0.1
   Phase: 6 - Workflow Monitoring
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const DEFAULT_THRESHOLDS = Object.freeze({ healthy: 90, warning: 75 });
  const MONITORING_STATUSES = Object.freeze(["Not Started", "Running", "Healthy", "Warning", "Escalated", "Completed"]);
  const store = internal.foundationRecordStore.monitoring || (internal.foundationRecordStore.monitoring = []);

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function getThresholds(workflow) {
    const requirement = workflow && workflow.definition && workflow.definition.monitoringRequirement || {};
    const healthy = Number(requirement.healthyThreshold);
    const warning = Number(requirement.warningThreshold);
    return {
      healthy: Number.isFinite(healthy) ? Math.max(0, Math.min(100, healthy)) : DEFAULT_THRESHOLDS.healthy,
      warning: Number.isFinite(warning) ? Math.max(0, Math.min(100, warning)) : DEFAULT_THRESHOLDS.warning
    };
  }

  function appendRecord(record) {
    const previous = store.length ? store[store.length - 1] : null;
    const source = Object.assign({}, record, {
      previousMonitoringHash: previous && previous.monitoringHash || null,
      hashAlgorithm: null,
      monitoringHash: null
    });
    const integrity = internal.hashCanonicalSync(source);
    source.hashAlgorithm = integrity.algorithm;
    source.monitoringHash = integrity.hash;
    store.push(source);
    if (store.length > 100) store.splice(0, store.length - 100);
    if (typeof internal.persistFoundationRecords === "function") internal.persistFoundationRecords();
    return source;
  }

  function transition(workflow, fromStatus, toStatus, reasonCode, evidenceId) {
    return namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Monitoring",
      fromStatus: fromStatus,
      toPhase: "Monitoring",
      toStatus: toStatus,
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: reasonCode,
      evidenceReferences: [{ type: "Monitoring Record", id: evidenceId }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
  }

  function computeMonitoringMetrics(workflow, input) {
    const source = input && typeof input === "object" ? input : {};
    const executionSummary = workflow.execution && workflow.execution.executionSummary || {};
    const executionMetrics = executionSummary.metricsSummary || {};
    const decision = typeof namespace.api.getWorkflowDecision === "function"
      ? namespace.api.getWorkflowDecision(workflow.identity.workflowId) : null;
    const approval = typeof namespace.api.getWorkflowApproval === "function"
      ? namespace.api.getWorkflowApproval(workflow.identity.workflowId) : null;
    const repository = executionSummary.repositoryIntegrity || decision && decision.repositoryIntegrityResult || {};
    const validationPassed = source.validationPassed !== false && (!decision || !decision.validationResult || decision.validationResult.passed !== false);
    const policyPassed = source.policyPassed !== false && (!decision || !decision.policyResult || decision.policyResult.hardDeny !== true);
    const approvalConsumed = Boolean(workflow.approval && workflow.approval.status === "Consumed") || Boolean(approval && approval.latest && approval.latest.status === "Consumed");
    const repositoryIntegrity = source.repositoryIntegrity !== false && repository.integrityVerified !== false && repository.unexpectedWrite !== true;
    const rollbackVerified = source.rollbackVerified !== false && repository.rollbackVerified !== false && repository.sourceRestored !== false;
    const persistentCommitSafe = repository.persistentCommitExecuted !== true;
    const zipMutationSafe = repository.zipFileMutation !== true;
    const totalTasks = Number(executionMetrics.taskCount || executionMetrics.executedTaskCount || 0);
    const succeededTasks = Number(executionMetrics.succeededTaskCount || totalTasks || 0);
    const failedTasks = Number(executionMetrics.failedTaskCount || 0);
    const completionRate = totalTasks > 0 ? Number(((succeededTasks / totalTasks) * 100).toFixed(2)) : 100;
    const signals = [validationPassed, policyPassed, approvalConsumed, repositoryIntegrity, rollbackVerified, persistentCommitSafe, zipMutationSafe];
    const safetyScore = Number(((signals.filter(Boolean).length / signals.length) * 100).toFixed(2));
    const health = Number.isFinite(Number(source.health))
      ? Math.max(0, Math.min(100, Number(source.health)))
      : Number(((safetyScore * 0.7) + (completionRate * 0.3)).toFixed(2));
    return {
      health: health,
      safetyScore: safetyScore,
      completionRate: completionRate,
      validationPassed: validationPassed,
      policyPassed: policyPassed,
      approvalConsumed: approvalConsumed,
      repositoryIntegrity: repositoryIntegrity,
      rollbackVerified: rollbackVerified,
      persistentCommitSafe: persistentCommitSafe,
      zipMutationSafe: zipMutationSafe,
      totalTasks: totalTasks,
      succeededTasks: succeededTasks,
      failedTasks: failedTasks,
      repositoryWriteCount: Number(executionMetrics.repositoryWriteCount || 0),
      rollbackCount: Number(executionMetrics.rollbackCount || 0),
      durationMs: Number(source.durationMs || executionSummary.durationMs || 0),
      warnings: internal.asArray(source.warnings).map(String),
      errors: internal.asArray(source.errors).map(String)
    };
  }

  function classify(metrics, thresholds) {
    const hardFailure = !metrics.validationPassed || !metrics.policyPassed || !metrics.approvalConsumed ||
      !metrics.repositoryIntegrity || !metrics.rollbackVerified || !metrics.persistentCommitSafe || !metrics.zipMutationSafe || metrics.errors.length > 0;
    if (hardFailure || metrics.health < thresholds.warning) return "Escalated";
    if (metrics.health < thresholds.healthy || metrics.warnings.length > 0) return "Warning";
    return "Healthy";
  }

  function startWorkflowMonitoring(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (workflow.state.primaryPhase !== "Monitoring" || workflow.state.controlStatus !== "Ready") {
      return internal.buildResult(false, "MONITORING_STATE_INVALID", "Blocked", { currentState: internal.clone(workflow.state) });
    }
    if (!workflow.approval || workflow.approval.status !== "Consumed") {
      return internal.buildResult(false, "MONITORING_APPROVAL_REQUIRED", "Blocked", { approvalStatus: workflow.approval && workflow.approval.status || null });
    }
    const sessionId = internal.nextId("IDE-160-MONITORING-SESSION");
    const started = transition(workflow, "Ready", "Running", "WORKFLOW_MONITORING_STARTED", sessionId);
    if (!started.ok) return started;
    const record = appendRecord({
      monitoringRecordId: internal.nextId("IDE-160-MONITORING-RECORD"),
      monitoringSessionId: sessionId,
      eventType: "Started",
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      status: "Running",
      thresholds: getThresholds(workflow),
      actor: internal.text(settings.actor, "IDE-160"),
      createdAt: internal.nowIso()
    });
    workflow.monitoring = {
      monitoringSessionId: sessionId,
      status: "Running",
      health: null,
      thresholds: getThresholds(workflow),
      snapshotCount: 0,
      warningCount: 0,
      errorCount: 0,
      currentRecordId: record.monitoringRecordId,
      startedAt: record.createdAt,
      completedAt: null,
      updatedAt: record.createdAt
    };
    workflow.context.monitoringReference = { monitoringSessionId: sessionId, monitoringRecordId: record.monitoringRecordId, monitoringHash: record.monitoringHash };
    workflow.timeline.push({ type: "Monitoring Started", monitoringSessionId: sessionId, at: record.createdAt });
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "WORKFLOW_MONITORING_STARTED", "Running", { monitoring: internal.clone(workflow.monitoring), record: internal.clone(record) });
  }

  function recordWorkflowMonitoringSnapshot(workflowId, input) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (!workflow.monitoring || workflow.monitoring.status !== "Running" || workflow.state.primaryPhase !== "Monitoring" || workflow.state.controlStatus !== "Running") {
      return internal.buildResult(false, "MONITORING_NOT_RUNNING", "Blocked", { currentState: internal.clone(workflow.state) });
    }
    const metrics = computeMonitoringMetrics(workflow, input);
    const status = classify(metrics, workflow.monitoring.thresholds || getThresholds(workflow));
    const record = appendRecord({
      monitoringRecordId: internal.nextId("IDE-160-MONITORING-RECORD"),
      monitoringSessionId: workflow.monitoring.monitoringSessionId,
      eventType: "Snapshot",
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      status: status,
      metrics: metrics,
      evidenceReferences: internal.asArray(input && input.evidenceReferences).map(internal.clone),
      createdAt: internal.nowIso()
    });
    workflow.monitoring.status = "Running";
    workflow.monitoring.lastClassification = status;
    workflow.monitoring.health = metrics.health;
    workflow.monitoring.snapshotCount += 1;
    workflow.monitoring.warningCount += metrics.warnings.length + (status === "Warning" ? 1 : 0);
    workflow.monitoring.errorCount += metrics.errors.length + (status === "Escalated" ? 1 : 0);
    workflow.monitoring.currentRecordId = record.monitoringRecordId;
    workflow.monitoring.updatedAt = record.createdAt;
    workflow.metrics = Object.assign({}, workflow.metrics || {}, metrics);
    workflow.context.metrics = internal.clone(workflow.metrics);
    workflow.context.monitoringReference = { monitoringSessionId: workflow.monitoring.monitoringSessionId, monitoringRecordId: record.monitoringRecordId, monitoringHash: record.monitoringHash };
    workflow.context.timeline.push({ type: "Monitoring Snapshot", status: status, health: metrics.health, at: record.createdAt });
    workflow.timeline.push({ type: "Monitoring Snapshot", monitoringRecordId: record.monitoringRecordId, at: record.createdAt });
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "WORKFLOW_MONITORING_SNAPSHOT_RECORDED", status, { record: internal.clone(record), metrics: internal.clone(metrics) });
  }

  function completeWorkflowMonitoring(workflowId, input) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (!workflow.monitoring || workflow.state.primaryPhase !== "Monitoring" || workflow.state.controlStatus !== "Running") {
      return internal.buildResult(false, "MONITORING_NOT_RUNNING", "Blocked", { currentState: internal.clone(workflow.state) });
    }
    const snapshot = recordWorkflowMonitoringSnapshot(workflowId, input || {});
    if (!snapshot.ok) return snapshot;
    const metrics = snapshot.data.metrics;
    const classification = classify(metrics, workflow.monitoring.thresholds || getThresholds(workflow));
    const completedAt = internal.nowIso();
    if (classification === "Escalated") {
      const record = appendRecord({
        monitoringRecordId: internal.nextId("IDE-160-MONITORING-RECORD"),
        monitoringSessionId: workflow.monitoring.monitoringSessionId,
        eventType: "Escalation",
        workflowId: workflow.identity.workflowId,
        attemptId: workflow.currentAttempt.attemptId,
        status: "Escalated",
        metrics: metrics,
        reason: "Monitoring Hard Gate or health threshold failed.",
        createdAt: completedAt
      });
      let result = transition(workflow, "Running", "Blocked", "WORKFLOW_MONITORING_ESCALATED", record.monitoringRecordId);
      if (!result.ok) return result;
      result = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
        fromPhase: "Monitoring",
        fromStatus: "Blocked",
        toPhase: "Decision",
        toStatus: "Ready",
        attemptId: workflow.currentAttempt.attemptId,
        reasonCode: "MONITORING_REQUIRES_DECISION",
        evidenceReferences: [{ type: "Monitoring Record", id: record.monitoringRecordId }],
        actor: "IDE-160",
        sourceComponent: namespace.componentId
      });
      if (!result.ok) return result;
      workflow.monitoring.status = "Escalated";
      workflow.monitoring.completedAt = completedAt;
      workflow.monitoring.currentRecordId = record.monitoringRecordId;
      workflow.monitoring.updatedAt = completedAt;
      internal.persistRuntimeIfAvailable();
      return internal.buildResult(true, "WORKFLOW_MONITORING_ESCALATED", "Escalated", { monitoring: internal.clone(workflow.monitoring), metrics: metrics, workflowState: internal.clone(workflow.state) });
    }

    const record = appendRecord({
      monitoringRecordId: internal.nextId("IDE-160-MONITORING-RECORD"),
      monitoringSessionId: workflow.monitoring.monitoringSessionId,
      eventType: "Completed",
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      status: classification,
      metrics: metrics,
      createdAt: completedAt
    });
    let result = transition(workflow, "Running", "Succeeded", "WORKFLOW_MONITORING_COMPLETED", record.monitoringRecordId);
    if (!result.ok) return result;
    result = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Monitoring",
      fromStatus: "Succeeded",
      toPhase: "Context Packaging",
      toStatus: "Ready",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "MONITORING_HANDOFF_TO_CONTEXT_PACKAGE",
      evidenceReferences: [{ type: "Monitoring Record", id: record.monitoringRecordId }],
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
    if (!result.ok) return result;
    workflow.monitoring.status = classification === "Warning" ? "Warning" : "Completed";
    workflow.monitoring.health = metrics.health;
    workflow.monitoring.completedAt = completedAt;
    workflow.monitoring.currentRecordId = record.monitoringRecordId;
    workflow.monitoring.updatedAt = completedAt;
    workflow.context.monitoringReference = { monitoringSessionId: workflow.monitoring.monitoringSessionId, monitoringRecordId: record.monitoringRecordId, monitoringHash: record.monitoringHash };
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "WORKFLOW_MONITORING_COMPLETED", classification, { monitoring: internal.clone(workflow.monitoring), metrics: metrics, workflowState: internal.clone(workflow.state) });
  }

  function getWorkflowMonitoring(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    return workflow ? internal.clone(workflow.monitoring) : null;
  }

  function listWorkflowMonitoringRecords(workflowId) {
    const target = String(workflowId || "");
    return store.filter(function filter(record) { return !target || record.workflowId === target; }).map(internal.clone);
  }

  function getWorkflowMonitoringStatus(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    const monitoring = workflow && workflow.monitoring;
    return {
      id: "IDE-160-MONITORING-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      workflowId: workflow && workflow.identity.workflowId || null,
      status: monitoring && monitoring.status || "Not Started",
      health: monitoring && Number.isFinite(monitoring.health) ? monitoring.health : null,
      snapshotCount: monitoring && monitoring.snapshotCount || 0,
      warningCount: monitoring && monitoring.warningCount || 0,
      errorCount: monitoring && monitoring.errorCount || 0,
      recordCount: listWorkflowMonitoringRecords(workflowId).length,
      updatedAt: monitoring && monitoring.updatedAt || internal.nowIso()
    };
  }

  function validateWorkflowMonitoring(options) {
    const checks = [];
    function check(name, passed, detail, group) { checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group }); }
    const originalState = internal.exportRuntimeState();
    const originalJournal = internal.transitionJournal.slice();
    const originalRecords = internal.clone(internal.foundationRecordStore);
    const originalValidation = state.lastValidation;
    const memory = namespace.api.createIDE160MemoryStorage();

    namespace.api.runWithIDE160Storage(memory, function run() {
      try {
        function reset() {
          state.definitions.clear(); state.workflows.clear(); state.activeWorkflowId = null;
          internal.transitionJournal.splice(0, internal.transitionJournal.length);
          store.splice(0, store.length);
        }
        function createReady(id) {
          namespace.api.createWorkflowDefinition({ id: id + "-DEF", version: "1.0.0", goal: "Monitor", scope: { id: id }, inputContract: {}, approvalRequirement: {}, monitoringRequirement: {}, completionRequirement: {}, handoffTarget: "IDE-170" });
          namespace.api.createWorkflow(id + "-DEF", {}, { workflowId: id });
          const wf = state.workflows.get(id);
          wf.state.primaryPhase = "Monitoring"; wf.state.controlStatus = "Ready";
          wf.currentAttempt.phasesEntered = ["Monitoring"];
          wf.approval = { status: "Consumed", approvalType: "Standard", currentApprovalRecordId: "APPROVAL-CONSUMED" };
          wf.execution = { executionSummary: { executionSummaryId: id + "-SUMMARY", integrity: { hash: "SUMMARY-HASH" }, metricsSummary: { taskCount: 3, succeededTaskCount: 3, failedTaskCount: 0, repositoryWriteCount: 0, rollbackCount: 0 }, repositoryIntegrity: { integrityVerified: true, unexpectedWrite: false, persistentCommitExecuted: false, zipFileMutation: false, rollbackVerified: true, sourceRestored: true } } };
          return wf;
        }
        reset(); const wf = createReady("IDE-160-MONITORING-TEST");
        check("Monitoring module loaded", namespace.modules.monitoring && namespace.modules.monitoring.status === "Ready", namespace.modules.monitoring && namespace.modules.monitoring.status, "Module");
        check("Monitoring status constants", MONITORING_STATUSES.length === 6, "count=" + MONITORING_STATUSES.length, "Module");
        const started = startWorkflowMonitoring(wf.identity.workflowId, {});
        check("Monitoring started", started.ok === true, started.code, "Lifecycle");
        check("Monitoring state Running", wf.state.primaryPhase === "Monitoring" && wf.state.controlStatus === "Running", JSON.stringify(wf.state), "Lifecycle");
        const snapshot = recordWorkflowMonitoringSnapshot(wf.identity.workflowId, { health: 100 });
        check("Monitoring snapshot recorded", snapshot.ok === true, snapshot.code, "Metrics");
        check("Monitoring health measured", snapshot.data.metrics.health === 100, String(snapshot.data.metrics.health), "Metrics");
        check("Approval consumption observed", snapshot.data.metrics.approvalConsumed === true, String(snapshot.data.metrics.approvalConsumed), "Safety");
        check("Repository integrity observed", snapshot.data.metrics.repositoryIntegrity === true, String(snapshot.data.metrics.repositoryIntegrity), "Safety");
        const completed = completeWorkflowMonitoring(wf.identity.workflowId, { health: 100 });
        check("Monitoring completed", completed.ok === true && completed.code === "WORKFLOW_MONITORING_COMPLETED", completed.code, "Lifecycle");
        check("Context Package handoff ready", wf.state.primaryPhase === "Context Packaging" && wf.state.controlStatus === "Ready", JSON.stringify(wf.state), "Handoff");
        check("Monitoring reference stored", Boolean(wf.context.monitoringReference && wf.context.monitoringReference.monitoringHash), JSON.stringify(wf.context.monitoringReference), "Context");
        check("Workflow metrics updated", wf.context.metrics.health === 100, JSON.stringify(wf.context.metrics), "Context");
        const records = listWorkflowMonitoringRecords(wf.identity.workflowId);
        check("Monitoring records appended", records.length >= 3, "count=" + records.length, "Record");
        check("Monitoring hash chain", records.every(function every(r, i) { return i === 0 ? r.previousMonitoringHash == null : r.previousMonitoringHash === records[i - 1].monitoringHash; }), "hash chain", "Integrity");
        check("Monitoring lightweight status", getWorkflowMonitoringStatus(wf.identity.workflowId).componentId === "IDE-160", JSON.stringify(getWorkflowMonitoringStatus(wf.identity.workflowId)), "Status");

        reset(); const critical = createReady("IDE-160-MONITORING-CRITICAL");
        startWorkflowMonitoring(critical.identity.workflowId, {});
        const escalated = completeWorkflowMonitoring(critical.identity.workflowId, { health: 40, validationPassed: false, errors: ["Validation failed"] });
        check("Critical monitoring escalated", escalated.ok === true && escalated.code === "WORKFLOW_MONITORING_ESCALATED", escalated.code, "Escalation");
        check("Escalation returns Decision Ready", critical.state.primaryPhase === "Decision" && critical.state.controlStatus === "Ready", JSON.stringify(critical.state), "Escalation");
        check("Hard failure lowers safety score", escalated.data.metrics.safetyScore < 100, String(escalated.data.metrics.safetyScore), "Escalation");
        check("Persistent commit prohibited", namespace.api.getAIDevelopmentWorkflowStatus().persistentCommitAllowed === false, "false", "Safety");
        check("ZIP mutation prohibited", namespace.api.getAIDevelopmentWorkflowStatus().zipFileMutationAllowed === false, "false", "Safety");
      } finally {
        internal.importRuntimeState(originalState);
        internal.transitionJournal.splice(0, internal.transitionJournal.length, ...originalJournal);
        internal.foundationRecordStore.failures.splice(0, internal.foundationRecordStore.failures.length, ...(originalRecords.failures || []));
        internal.foundationRecordStore.recoveries.splice(0, internal.foundationRecordStore.recoveries.length, ...(originalRecords.recoveries || []));
        internal.foundationRecordStore.attempts.splice(0, internal.foundationRecordStore.attempts.length, ...(originalRecords.attempts || []));
        if (internal.decisionStore) internal.decisionStore.splice(0, internal.decisionStore.length, ...(originalRecords.decisions || []));
        if (internal.approvalStore) internal.approvalStore.splice(0, internal.approvalStore.length, ...(originalRecords.approvals || []));
        store.splice(0, store.length, ...(originalRecords.monitoring || []));
        if (internal.completionStore) internal.completionStore.splice(0, internal.completionStore.length, ...(originalRecords.completions || []));
        state.lastValidation = originalValidation;
      }
    });

    const passed = checks.filter(function count(c) { return c.passed; }).length;
    const groups = {};
    checks.forEach(function group(c) { if (!groups[c.group]) groups[c.group] = { passed: 0, failed: 0, total: 0 }; groups[c.group].total += 1; c.passed ? groups[c.group].passed += 1 : groups[c.group].failed += 1; });
    return { id: internal.nextId("IDE-160-MONITORING-VALIDATION"), componentId: namespace.componentId, version: VERSION, mode: internal.text(options && options.mode, "Phase 6 Workflow Monitoring"), valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null, status: passed === checks.length ? "Passed" : "Failed", groups: groups, checks: checks, warnings: [], storageIsolation: true, executedAt: internal.nowIso() };
  }

  Object.assign(internal, { monitoringStore: store, computeIDE160MonitoringMetrics: computeMonitoringMetrics });
  Object.assign(namespace.api, {
    startWorkflowMonitoring: startWorkflowMonitoring,
    recordWorkflowMonitoringSnapshot: recordWorkflowMonitoringSnapshot,
    completeWorkflowMonitoring: completeWorkflowMonitoring,
    getWorkflowMonitoring: getWorkflowMonitoring,
    listWorkflowMonitoringRecords: listWorkflowMonitoringRecords,
    getWorkflowMonitoringStatus: getWorkflowMonitoringStatus,
    validateWorkflowMonitoring: validateWorkflowMonitoring
  });
  namespace.modules.monitoring = { id: "IDE-160-MONITORING", version: VERSION, status: "Ready", thresholds: internal.clone(DEFAULT_THRESHOLDS), appendOnlyRecords: true, loadedAt: internal.nowIso() };
  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);