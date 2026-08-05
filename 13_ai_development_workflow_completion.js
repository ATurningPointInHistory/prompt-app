/* ============================================================
   FILE: 13_ai_development_workflow_completion.js
   IDE-160 Workflow Completion Gate / Baseline / Close
   Version: 2.0.1
   Phase: 8 - Completion Gate / Workflow Close
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const completionStore = internal.foundationRecordStore.completions || (internal.foundationRecordStore.completions = []);
  const baselineStore = [];

  function restoreBaselines() {
    if (typeof namespace.api.loadWorkflowBaselineStore !== "function") return;
    const loaded = namespace.api.loadWorkflowBaselineStore();
    if (loaded && Array.isArray(loaded.baselines)) baselineStore.splice(0, baselineStore.length, ...loaded.baselines.slice(-10));
  }

  function persistBaselines() {
    return typeof namespace.api.persistWorkflowBaselineStore === "function"
      ? namespace.api.persistWorkflowBaselineStore(baselineStore) : null;
  }

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function appendCompletionRecord(record) {
    const previous = completionStore.length ? completionStore[completionStore.length - 1] : null;
    const source = Object.assign({}, record, { previousCompletionHash: previous && previous.completionHash || null, hashAlgorithm: null, completionHash: null });
    const integrity = internal.hashCanonicalSync(source);
    source.hashAlgorithm = integrity.algorithm;
    source.completionHash = integrity.hash;
    completionStore.push(source);
    if (completionStore.length > 50) completionStore.splice(0, completionStore.length - 50);
    if (typeof internal.persistFoundationRecords === "function") internal.persistFoundationRecords();
    return source;
  }

  function latestDecision(workflowId) {
    const records = typeof namespace.api.listWorkflowDecisions === "function" ? namespace.api.listWorkflowDecisions(workflowId) : [];
    return records.length ? records[records.length - 1] : null;
  }

  function latestApproval(workflowId) {
    const records = typeof namespace.api.listWorkflowApprovals === "function" ? namespace.api.listWorkflowApprovals(workflowId) : [];
    return records.length ? records[records.length - 1] : null;
  }

  function evaluateWorkflowCompletionGate(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = options && typeof options === "object" ? options : {};
    if (!workflow) return { valid: false, passed: 0, failed: 1, total: 1, checks: [{ name: "Workflow exists", passed: false, detail: "WORKFLOW_NOT_FOUND" }], failures: ["Workflow Not Found"] };
    const packageValue = typeof namespace.api.getWorkflowPackage === "function" ? namespace.api.getWorkflowPackage(workflowId) : null;
    const packageVerification = packageValue && typeof namespace.api.verifyWorkflowPackage === "function" ? namespace.api.verifyWorkflowPackage(packageValue) : { valid: false };
    const decision = latestDecision(workflowId);
    const approval = latestApproval(workflowId);
    const metrics = workflow.context.metrics || workflow.metrics || {};
    const requirement = workflow.definition.completionRequirement || {};
    const minimumHealth = Number.isFinite(Number(requirement.minimumHealth)) ? Number(requirement.minimumHealth) : 90;
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: internal.text(detail, "") }); }
    check("Completion Gate state", workflow.state.primaryPhase === "Completion Gate" && ["Ready", "Running"].includes(workflow.state.controlStatus), JSON.stringify(workflow.state));
    check("Health threshold", Number(metrics.health) >= minimumHealth, String(metrics.health));
    check("Policy passed", !decision || !decision.policyResult || decision.policyResult.hardDeny !== true, decision && decision.policyResult && decision.policyResult.status || "Passed");
    check("Approval consumed", Boolean(workflow.approval && workflow.approval.status === "Consumed") || Boolean(approval && approval.status === "Consumed"), workflow.approval && workflow.approval.status || approval && approval.status || "Missing");
    check("Metrics available", metrics && typeof metrics === "object" && Number.isFinite(Number(metrics.health)), JSON.stringify(metrics));
    check("Workflow Package available", Boolean(packageValue && packageValue.packageId), packageValue && packageValue.packageId || "Missing");
    check("Workflow Package immutable", Boolean(packageValue && packageValue.immutable === true), String(packageValue && packageValue.immutable));
    check("Workflow Package integrity", packageVerification.valid === true, JSON.stringify(packageVerification));
    check("IDE-170 handoff target", Boolean(packageValue && packageValue.handoffTarget === "IDE-170"), packageValue && packageValue.handoffTarget || "Missing");
    check("Repository safe", Boolean(packageValue && packageValue.persistentCommitExecuted === false && packageValue.zipFileMutation === false), packageValue ? JSON.stringify({ persistentCommitExecuted: packageValue.persistentCommitExecuted, zipFileMutation: packageValue.zipFileMutation }) : "Missing");
    check("Monitoring completed", Boolean(workflow.monitoring && ["Completed", "Warning"].includes(workflow.monitoring.status)), workflow.monitoring && workflow.monitoring.status || "Missing");
    check("Unresolved items acceptable", settings.allowUnresolved === true || internal.asArray(packageValue && packageValue.unresolvedItems).length === 0, "count=" + internal.asArray(packageValue && packageValue.unresolvedItems).length);
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return { valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, minimumHealth: minimumHealth, checks: checks, failures: checks.filter(function filter(item) { return !item.passed; }).map(function map(item) { return item.name; }), packageVerification: packageVerification };
  }

  function sealBaseline(payload) {
    const source = internal.clone(payload);
    const integrity = internal.hashCanonicalSync(source);
    source.integrity = integrity;
    source.baselineHash = integrity.hash;
    return internal.deepFreezeIDE160 ? internal.deepFreezeIDE160(source) : Object.freeze(source);
  }

  function verifyWorkflowBaseline(value) {
    const source = value && typeof value === "object" ? internal.clone(value) : null;
    if (!source || !source.baselineHash || !source.integrity) return { valid: false, reason: "Baseline or Integrity missing." };
    const expected = source.baselineHash;
    delete source.baselineHash; delete source.integrity;
    const actual = internal.hashCanonicalSync(source);
    return { valid: expected === actual.hash, expectedHash: expected, actualHash: actual.hash, algorithm: actual.algorithm };
  }

  function createWorkflowBaseline(workflow, completionRecord, packageValue) {
    return sealBaseline({
      baselineId: internal.nextId("IDE-160-WORKFLOW-BASELINE"),
      baselineVersion: "1.0.0",
      baselineType: "IDE-160 Completed Workflow Baseline",
      componentId: namespace.componentId,
      componentVersion: VERSION,
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      definitionReference: internal.clone(workflow.context.definitionReference),
      planReference: internal.clone(workflow.context.planningReference),
      packageReference: { packageId: packageValue.packageId, packageVersion: packageValue.packageVersion, packageHash: packageValue.packageHash },
      completionReference: { completionRecordId: completionRecord.completionRecordId, completionHash: completionRecord.completionHash },
      repositoryBaseline: internal.clone(workflow.definition.repositoryBaseline || {}),
      finalMetrics: internal.clone(workflow.context.metrics || workflow.metrics || {}),
      finalHealth: Number(workflow.context.metrics && workflow.context.metrics.health || workflow.metrics && workflow.metrics.health || 0),
      finalStatus: "Completed",
      handoffTarget: packageValue.handoffTarget,
      immutable: true,
      createdBy: "IDE-160",
      createdAt: internal.nowIso()
    });
  }

  function completeWorkflow(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (workflow.state.primaryPhase !== "Completion Gate" || workflow.state.controlStatus !== "Ready") return internal.buildResult(false, "COMPLETION_GATE_STATE_INVALID", "Blocked", { currentState: internal.clone(workflow.state) });
    const gateId = internal.nextId("IDE-160-COMPLETION-GATE");
    let transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, { fromPhase: "Completion Gate", fromStatus: "Ready", toPhase: "Completion Gate", toStatus: "Running", attemptId: workflow.currentAttempt.attemptId, reasonCode: "COMPLETION_GATE_STARTED", evidenceReferences: [{ type: "Completion Gate", id: gateId }], actor: "IDE-160", sourceComponent: namespace.componentId });
    if (!transition.ok) return transition;
    const evaluation = evaluateWorkflowCompletionGate(workflowId, options || {});
    if (!evaluation.valid) {
      const blockedRecord = appendCompletionRecord({ completionRecordId: internal.nextId("IDE-160-COMPLETION-RECORD"), completionGateId: gateId, eventType: "Blocked", status: "Blocked", workflowId: workflow.identity.workflowId, attemptId: workflow.currentAttempt.attemptId, evaluation: evaluation, createdAt: internal.nowIso() });
      transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, { fromPhase: "Completion Gate", fromStatus: "Running", toPhase: "Completion Gate", toStatus: "Blocked", attemptId: workflow.currentAttempt.attemptId, reasonCode: "COMPLETION_GATE_BLOCKED", evidenceReferences: [{ type: "Completion Record", id: blockedRecord.completionRecordId }], actor: "IDE-160", sourceComponent: namespace.componentId });
      workflow.completion = { status: "Blocked", gatePassed: false, completionRecordId: blockedRecord.completionRecordId, failures: evaluation.failures, updatedAt: blockedRecord.createdAt };
      internal.persistRuntimeIfAvailable();
      return internal.buildResult(false, "WORKFLOW_COMPLETION_GATE_BLOCKED", "Blocked", { completion: internal.clone(workflow.completion), evaluation: evaluation, workflowState: internal.clone(workflow.state) });
    }

    const packageValue = namespace.api.getWorkflowPackage(workflowId);
    const completionRecord = appendCompletionRecord({ completionRecordId: internal.nextId("IDE-160-COMPLETION-RECORD"), completionGateId: gateId, eventType: "Completed", status: "Passed", workflowId: workflow.identity.workflowId, workflowVersion: workflow.identity.workflowVersion, attemptId: workflow.currentAttempt.attemptId, evaluation: evaluation, packageReference: { packageId: packageValue.packageId, packageHash: packageValue.packageHash }, handoffTarget: packageValue.handoffTarget, createdAt: internal.nowIso() });
    const baseline = createWorkflowBaseline(workflow, completionRecord, packageValue);
    baselineStore.push(baseline); if (baselineStore.length > 10) baselineStore.splice(0, baselineStore.length - 10);
    const baselinePersistence = persistBaselines();
    const baselineVerification = verifyWorkflowBaseline(baseline);
    if (!baselineVerification.valid) return internal.buildResult(false, "WORKFLOW_BASELINE_INTEGRITY_FAILED", "Failed", { verification: baselineVerification });

    transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, { fromPhase: "Completion Gate", fromStatus: "Running", toPhase: "Completion Gate", toStatus: "Succeeded", attemptId: workflow.currentAttempt.attemptId, reasonCode: "COMPLETION_GATE_PASSED", evidenceReferences: [{ type: "Completion Record", id: completionRecord.completionRecordId, hash: completionRecord.completionHash }], actor: "IDE-160", sourceComponent: namespace.componentId });
    if (!transition.ok) return transition;
    transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, { fromPhase: "Completion Gate", fromStatus: "Succeeded", toPhase: "Completed", toStatus: "Ready", attemptId: workflow.currentAttempt.attemptId, reasonCode: "WORKFLOW_COMPLETION_READY", evidenceReferences: [{ type: "Workflow Baseline", id: baseline.baselineId, hash: baseline.baselineHash }], actor: "IDE-160", sourceComponent: namespace.componentId });
    if (!transition.ok) return transition;
    transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, { fromPhase: "Completed", fromStatus: "Ready", toPhase: "Completed", toStatus: "Running", attemptId: workflow.currentAttempt.attemptId, reasonCode: "WORKFLOW_CLOSE_STARTED", evidenceReferences: [{ type: "Workflow Baseline", id: baseline.baselineId }], actor: "IDE-160", sourceComponent: namespace.componentId });
    if (!transition.ok) return transition;
    transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, { fromPhase: "Completed", fromStatus: "Running", toPhase: "Completed", toStatus: "Succeeded", attemptId: workflow.currentAttempt.attemptId, reasonCode: "WORKFLOW_COMPLETED", evidenceReferences: [{ type: "Workflow Baseline", id: baseline.baselineId, hash: baseline.baselineHash }], actor: "IDE-160", sourceComponent: namespace.componentId });
    if (!transition.ok) return transition;

    workflow.completion = { status: "Completed", gatePassed: true, completionRecordId: completionRecord.completionRecordId, completionHash: completionRecord.completionHash, completedAt: completionRecord.createdAt, handoffTarget: packageValue.handoffTarget, updatedAt: completionRecord.createdAt };
    workflow.baseline = { baselineId: baseline.baselineId, baselineVersion: baseline.baselineVersion, baselineHash: baseline.baselineHash, status: "Ready", createdAt: baseline.createdAt };
    workflow.context.completionReference = internal.clone(workflow.completion);
    workflow.context.baselineReference = internal.clone(workflow.baseline);
    workflow.timeline.push({ type: "Workflow Completed", baselineId: baseline.baselineId, at: baseline.createdAt });
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "WORKFLOW_COMPLETED", "Completed", { completion: internal.clone(workflow.completion), baseline: internal.clone(baseline), baselineVerification: baselineVerification, baselinePersistence: baselinePersistence, workflowState: internal.clone(workflow.state), handoffTarget: packageValue.handoffTarget });
  }

  function getWorkflowCompletion(workflowId) { const workflow = getWorkflowMutable(workflowId); return workflow ? internal.clone(workflow.completion) : null; }
  function listWorkflowCompletionRecords(workflowId) { const target = String(workflowId || ""); return completionStore.filter(function filter(item) { return !target || item.workflowId === target; }).map(internal.clone); }
  function getWorkflowBaseline(workflowId) { const target = String(workflowId || ""); const found = baselineStore.filter(function filter(item) { return !target || item.workflowId === target; }); return internal.clone(found.length ? found[found.length - 1] : null); }
  function listWorkflowBaselines(workflowId) { const target = String(workflowId || ""); return baselineStore.filter(function filter(item) { return !target || item.workflowId === target; }).map(internal.clone); }
  function getWorkflowCompletionStatus(workflowId) { const workflow = getWorkflowMutable(workflowId); const completion = workflow && workflow.completion; const baseline = getWorkflowBaseline(workflowId); return { id: "IDE-160-COMPLETION-STATUS", componentId: namespace.componentId, version: VERSION, workflowId: workflow && workflow.identity.workflowId || null, status: completion && completion.status || "Not Started", gatePassed: completion && completion.gatePassed === true, baselineId: baseline && baseline.baselineId || null, baselineHash: baseline && baseline.baselineHash || null, handoffTarget: completion && completion.handoffTarget || null, workflowClosed: Boolean(workflow && workflow.state.primaryPhase === "Completed" && workflow.state.controlStatus === "Succeeded"), updatedAt: completion && completion.updatedAt || internal.nowIso() }; }

  function validateWorkflowCompletion(options) {
    const checks = [];
    function check(name, passed, detail, group) { checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group }); }
    const originalState = internal.exportRuntimeState(); const originalJournal = internal.transitionJournal.slice(); const originalRecords = internal.clone(internal.foundationRecordStore); const originalPackages = internal.clone(internal.workflowPackageStore || []); const originalBaselines = internal.clone(baselineStore); const originalExecution = internal.clone(internal.executionStore && internal.executionStore.records || []);
    const memory = namespace.api.createIDE160MemoryStorage();
    namespace.api.runWithIDE160Storage(memory, function run() {
      try {
        state.definitions.clear(); state.workflows.clear(); state.activeWorkflowId = null; internal.transitionJournal.splice(0, internal.transitionJournal.length); completionStore.splice(0, completionStore.length); baselineStore.splice(0, baselineStore.length); if (internal.workflowPackageStore) internal.workflowPackageStore.splice(0, internal.workflowPackageStore.length); if (internal.executionStore) internal.executionStore.records.splice(0, internal.executionStore.records.length); if (internal.decisionStore) internal.decisionStore.splice(0, internal.decisionStore.length);
        if (internal.approvalStore) internal.approvalStore.splice(0, internal.approvalStore.length);
        if (internal.monitoringStore) internal.monitoringStore.splice(0, internal.monitoringStore.length);
        completionStore.splice(0, completionStore.length);
        namespace.api.createWorkflowDefinition({ id: "IDE-160-COMPLETE-DEF", version: "1.0.0", goal: "Complete", scope: { phase: 8 }, inputContract: {}, approvalRequirement: {}, monitoringRequirement: {}, completionRequirement: { minimumHealth: 90 }, handoffTarget: "IDE-170" });
        namespace.api.createWorkflow("IDE-160-COMPLETE-DEF", {}, { workflowId: "IDE-160-COMPLETE-TEST" });
        const wf = state.workflows.get("IDE-160-COMPLETE-TEST"); wf.state.primaryPhase = "Context Packaging"; wf.state.controlStatus = "Ready"; wf.currentAttempt.phasesEntered = ["Context Packaging"]; wf.monitoring = { status: "Completed", health: 100 }; wf.approval = { status: "Consumed" }; wf.context.metrics = { health: 100, completionRate: 100 };
        internal.executionStore.records.push({ executionRecordId: "EXEC-C", workflowId: wf.identity.workflowId, recordHash: "E" }); internal.decisionStore.push({ decisionId: "DEC-C", workflowId: wf.identity.workflowId, decisionHash: "D", policyResult: { hardDeny: false, status: "Passed" } }); internal.approvalStore.push({ approvalRecordId: "APP-C", workflowId: wf.identity.workflowId, status: "Consumed", approvalHash: "A" }); internal.monitoringStore.push({ monitoringRecordId: "MON-C", workflowId: wf.identity.workflowId, status: "Healthy", monitoringHash: "M" });
        check("Completion module loaded", namespace.modules.completion && namespace.modules.completion.status === "Ready", namespace.modules.completion && namespace.modules.completion.status, "Module");
        const pkg = namespace.api.buildWorkflowPackage(wf.identity.workflowId, {}); check("Completion input Package ready", pkg.ok === true, pkg.code, "Setup");
        const evaluation = evaluateWorkflowCompletionGate(wf.identity.workflowId, {}); check("Completion Gate evaluation passed", evaluation.valid === true, JSON.stringify(evaluation.failures), "Gate"); check("Completion Gate checks Health", evaluation.checks.some(function some(c) { return c.name === "Health threshold" && c.passed; }), "Health", "Gate"); check("Completion Gate checks Policy", evaluation.checks.some(function some(c) { return c.name === "Policy passed" && c.passed; }), "Policy", "Gate"); check("Completion Gate checks Approval", evaluation.checks.some(function some(c) { return c.name === "Approval consumed" && c.passed; }), "Approval", "Gate"); check("Completion Gate checks Metrics", evaluation.checks.some(function some(c) { return c.name === "Metrics available" && c.passed; }), "Metrics", "Gate"); check("Completion Gate checks Package", evaluation.checks.some(function some(c) { return c.name === "Workflow Package integrity" && c.passed; }), "Package", "Gate");
        const completed = completeWorkflow(wf.identity.workflowId, {}); check("Workflow completed", completed.ok === true, completed.code, "Completion"); check("Workflow state Completed", wf.state.primaryPhase === "Completed" && wf.state.controlStatus === "Succeeded", JSON.stringify(wf.state), "Completion"); check("Active Workflow released", state.activeWorkflowId === null, String(state.activeWorkflowId), "Completion"); check("Workflow Baseline generated", Boolean(completed.data.baseline.baselineId), completed.data.baseline.baselineId, "Baseline"); check("Workflow Baseline immutable", completed.data.baseline.immutable === true, String(completed.data.baseline.immutable), "Baseline"); check("Workflow Baseline integrity", completed.data.baselineVerification.valid === true, JSON.stringify(completed.data.baselineVerification), "Baseline"); check("IDE-170 handoff available", completed.data.handoffTarget === "IDE-170", completed.data.handoffTarget, "Handoff"); check("Completion Record appended", listWorkflowCompletionRecords(wf.identity.workflowId).length === 1, "count=" + listWorkflowCompletionRecords(wf.identity.workflowId).length, "Record"); check("Completion hash chain", listWorkflowCompletionRecords(wf.identity.workflowId)[0].previousCompletionHash == null, "hash chain", "Integrity"); check("Completion lightweight status", getWorkflowCompletionStatus(wf.identity.workflowId).workflowClosed === true, JSON.stringify(getWorkflowCompletionStatus(wf.identity.workflowId)), "Status");
        const tampered = internal.clone(completed.data.baseline); tampered.finalHealth = 0; check("Tampered Baseline rejected", verifyWorkflowBaseline(tampered).valid === false, JSON.stringify(verifyWorkflowBaseline(tampered)), "Integrity");
        // Blocked gate case.
        state.activeWorkflowId = null; namespace.api.createWorkflow("IDE-160-COMPLETE-DEF", {}, { workflowId: "IDE-160-COMPLETE-BLOCK" }); const blocked = state.workflows.get("IDE-160-COMPLETE-BLOCK"); blocked.state.primaryPhase = "Completion Gate"; blocked.state.controlStatus = "Ready"; blocked.monitoring = { status: "Completed" }; blocked.approval = { status: "Consumed" }; blocked.context.metrics = { health: 40 };
        const blockedResult = completeWorkflow(blocked.identity.workflowId, {}); check("Failed Gate blocked", blockedResult.ok === false && blockedResult.code === "WORKFLOW_COMPLETION_GATE_BLOCKED", blockedResult.code, "Failure"); check("Blocked Workflow not closed", blocked.state.primaryPhase === "Completion Gate" && blocked.state.controlStatus === "Blocked", JSON.stringify(blocked.state), "Failure"); check("Persistent commit prohibited", namespace.api.getAIDevelopmentWorkflowStatus().persistentCommitAllowed === false, "false", "Safety"); check("ZIP mutation prohibited", namespace.api.getAIDevelopmentWorkflowStatus().zipFileMutationAllowed === false, "false", "Safety");
      } finally {
        internal.importRuntimeState(originalState); internal.transitionJournal.splice(0, internal.transitionJournal.length, ...originalJournal); internal.foundationRecordStore.failures.splice(0, internal.foundationRecordStore.failures.length, ...(originalRecords.failures || [])); internal.foundationRecordStore.recoveries.splice(0, internal.foundationRecordStore.recoveries.length, ...(originalRecords.recoveries || [])); internal.foundationRecordStore.attempts.splice(0, internal.foundationRecordStore.attempts.length, ...(originalRecords.attempts || [])); if (internal.decisionStore) internal.decisionStore.splice(0, internal.decisionStore.length, ...(originalRecords.decisions || [])); if (internal.approvalStore) internal.approvalStore.splice(0, internal.approvalStore.length, ...(originalRecords.approvals || [])); if (internal.monitoringStore) internal.monitoringStore.splice(0, internal.monitoringStore.length, ...(originalRecords.monitoring || [])); completionStore.splice(0, completionStore.length, ...(originalRecords.completions || [])); baselineStore.splice(0, baselineStore.length, ...originalBaselines); if (internal.workflowPackageStore) internal.workflowPackageStore.splice(0, internal.workflowPackageStore.length, ...originalPackages); if (internal.executionStore) internal.executionStore.records.splice(0, internal.executionStore.records.length, ...originalExecution);
      }
    });
    const passed = checks.filter(function count(c) { return c.passed; }).length; const groups = {}; checks.forEach(function group(c) { if (!groups[c.group]) groups[c.group] = { passed: 0, failed: 0, total: 0 }; groups[c.group].total += 1; c.passed ? groups[c.group].passed += 1 : groups[c.group].failed += 1; });
    return { id: internal.nextId("IDE-160-COMPLETION-VALIDATION"), componentId: namespace.componentId, version: VERSION, mode: internal.text(options && options.mode, "Phase 8 Workflow Completion"), valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null, status: passed === checks.length ? "Passed" : "Failed", groups: groups, checks: checks, warnings: [], storageIsolation: true, executedAt: internal.nowIso() };
  }

  restoreBaselines();
  Object.assign(internal, { completionStore: completionStore, workflowBaselineStore: baselineStore, verifyIDE160WorkflowBaseline: verifyWorkflowBaseline });
  Object.assign(namespace.api, { evaluateWorkflowCompletionGate: evaluateWorkflowCompletionGate, completeWorkflow: completeWorkflow, getWorkflowCompletion: getWorkflowCompletion, listWorkflowCompletionRecords: listWorkflowCompletionRecords, getWorkflowBaseline: getWorkflowBaseline, listWorkflowBaselines: listWorkflowBaselines, verifyWorkflowBaseline: verifyWorkflowBaseline, getWorkflowCompletionStatus: getWorkflowCompletionStatus, validateWorkflowCompletion: validateWorkflowCompletion });
  namespace.modules.completion = { id: "IDE-160-COMPLETION", version: VERSION, status: "Ready", completionGateChecks: ["Health", "Policy", "Approval", "Metrics", "Workflow Package"], completionOutput: "Workflow Baseline", handoffTarget: "IDE-170", loadedAt: internal.nowIso() };
  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);