/* ============================================================
   FILE: 13_ai_development_workflow_package.js
   IDE-160 Workflow Context / Immutable Package / IDE-170 Handoff
   Version: 2.0.0
   Phase: 7 - Context Package / Release Handoff
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const packageStore = [];

  function restoreStore() {
    if (typeof namespace.api.loadWorkflowPackageStore !== "function") return;
    const loaded = namespace.api.loadWorkflowPackageStore();
    if (loaded && Array.isArray(loaded.packages)) packageStore.splice(0, packageStore.length, ...loaded.packages.slice(-10));
  }

  function persistStore() {
    return typeof namespace.api.persistWorkflowPackageStore === "function"
      ? namespace.api.persistWorkflowPackageStore(packageStore) : null;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeKey(key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function collectRecords(workflowId) {
    return {
      executionRecords: typeof namespace.api.getWorkflowExecutionRecords === "function" ? namespace.api.getWorkflowExecutionRecords(workflowId) : [],
      decisionRecords: typeof namespace.api.listWorkflowDecisions === "function" ? namespace.api.listWorkflowDecisions(workflowId) : [],
      approvalRecords: typeof namespace.api.listWorkflowApprovals === "function" ? namespace.api.listWorkflowApprovals(workflowId) : [],
      monitoringRecords: typeof namespace.api.listWorkflowMonitoringRecords === "function" ? namespace.api.listWorkflowMonitoringRecords(workflowId) : []
    };
  }

  function validatePackageInput(workflow, records) {
    const missing = [];
    if (!workflow || workflow.state.primaryPhase !== "Context Packaging" || workflow.state.controlStatus !== "Ready") missing.push("Context Packaging Ready State");
    if (!workflow || !workflow.monitoring || !["Completed", "Warning"].includes(workflow.monitoring.status)) missing.push("Completed Monitoring");
    if (!records.executionRecords.length) missing.push("Execution Record");
    if (!records.decisionRecords.length) missing.push("Decision Record");
    if (!records.approvalRecords.length) missing.push("Approval Record");
    if (!records.monitoringRecords.length) missing.push("Monitoring Record");
    return { valid: missing.length === 0, missing: missing };
  }

  function buildPackagePayload(workflow, records, options) {
    const settings = options && typeof options === "object" ? options : {};
    return {
      packageId: internal.text(settings.packageId, internal.nextId("IDE-160-WORKFLOW-PACKAGE")),
      packageVersion: "1.0.0",
      packageType: "IDE-160 Immutable Workflow Package",
      componentId: namespace.componentId,
      componentVersion: VERSION,
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      definitionReference: internal.clone(workflow.context.definitionReference),
      planningReference: internal.clone(workflow.context.planningReference),
      executionReference: internal.clone(workflow.context.executionReference),
      decisionReference: internal.clone(workflow.context.decisionReference),
      approvalReferences: internal.clone(workflow.context.approvalReferences),
      monitoringReference: internal.clone(workflow.context.monitoringReference),
      executionRecords: internal.clone(records.executionRecords),
      decisionRecords: internal.clone(records.decisionRecords),
      approvalRecords: internal.clone(records.approvalRecords),
      monitoringRecords: internal.clone(records.monitoringRecords),
      metrics: internal.clone(workflow.context.metrics || workflow.metrics || {}),
      timeline: internal.clone(workflow.context.timeline || workflow.timeline || []),
      remainingRisk: internal.clone(workflow.context.remainingRisk || []),
      unresolvedItems: internal.clone(workflow.context.unresolvedItems || []),
      traceability: internal.clone(workflow.context.traceability || workflow.traceability || []),
      repositoryIntegrity: internal.clone(workflow.execution && workflow.execution.executionSummary && workflow.execution.executionSummary.repositoryIntegrity || null),
      handoffTarget: internal.text(settings.handoffTarget || workflow.definition.handoffTarget, "IDE-170"),
      immutable: true,
      persistentCommitExecuted: false,
      zipFileMutation: false,
      generatedBy: "IDE-160",
      generatedAt: internal.nowIso()
    };
  }

  function sealPackage(payload) {
    const source = internal.clone(payload);
    const integrity = internal.hashCanonicalSync(source);
    source.integrity = { algorithm: integrity.algorithm, hash: integrity.hash };
    source.packageHash = integrity.hash;
    return deepFreeze(source);
  }

  function verifyWorkflowPackage(packageValue) {
    const source = packageValue && typeof packageValue === "object" ? internal.clone(packageValue) : null;
    if (!source || !source.integrity || !source.packageHash) return { valid: false, reason: "Package or Integrity missing." };
    const expected = source.packageHash;
    delete source.integrity;
    delete source.packageHash;
    const recalculated = internal.hashCanonicalSync(source);
    return {
      valid: recalculated.hash === expected,
      expectedHash: expected,
      actualHash: recalculated.hash,
      algorithm: recalculated.algorithm,
      immutable: packageValue.immutable === true,
      handoffTarget: packageValue.handoffTarget || null
    };
  }

  function buildWorkflowPackage(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null);
    if (workflow.package && workflow.package.packageId) {
      const existing = packageStore.find(function find(item) { return item.packageId === workflow.package.packageId; });
      const verification = verifyWorkflowPackage(existing);
      if (verification.valid) return internal.buildResult(true, "WORKFLOW_PACKAGE_ALREADY_GENERATED", "Ready", { package: internal.clone(existing), verification: verification });
      return internal.buildResult(false, "WORKFLOW_PACKAGE_INTEGRITY_FAILED", "Failed", { verification: verification });
    }
    const records = collectRecords(workflow.identity.workflowId);
    const inputValidation = validatePackageInput(workflow, records);
    if (!inputValidation.valid) return internal.buildResult(false, "WORKFLOW_PACKAGE_INPUT_INCOMPLETE", "Blocked", { missing: inputValidation.missing });

    const packageId = internal.text(options && options.packageId, internal.nextId("IDE-160-WORKFLOW-PACKAGE"));
    let transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Context Packaging", fromStatus: "Ready", toPhase: "Context Packaging", toStatus: "Running",
      attemptId: workflow.currentAttempt.attemptId, reasonCode: "WORKFLOW_PACKAGE_BUILD_STARTED",
      evidenceReferences: [{ type: "Workflow Package", id: packageId }], actor: "IDE-160", sourceComponent: namespace.componentId
    });
    if (!transition.ok) return transition;

    const sealed = sealPackage(buildPackagePayload(workflow, records, Object.assign({}, options || {}, { packageId: packageId })));
    packageStore.push(sealed);
    if (packageStore.length > 10) packageStore.splice(0, packageStore.length - 10);
    const persistence = persistStore();
    const verification = verifyWorkflowPackage(sealed);
    if (!verification.valid) return internal.buildResult(false, "WORKFLOW_PACKAGE_INTEGRITY_FAILED", "Failed", { verification: verification });

    transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Context Packaging", fromStatus: "Running", toPhase: "Context Packaging", toStatus: "Succeeded",
      attemptId: workflow.currentAttempt.attemptId, reasonCode: "WORKFLOW_PACKAGE_SEALED",
      evidenceReferences: [{ type: "Workflow Package", id: sealed.packageId, hash: sealed.packageHash }], actor: "IDE-160", sourceComponent: namespace.componentId
    });
    if (!transition.ok) return transition;
    transition = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Context Packaging", fromStatus: "Succeeded", toPhase: "Completion Gate", toStatus: "Ready",
      attemptId: workflow.currentAttempt.attemptId, reasonCode: "PACKAGE_HANDOFF_TO_COMPLETION_GATE",
      evidenceReferences: [{ type: "Workflow Package", id: sealed.packageId, hash: sealed.packageHash }], actor: "IDE-160", sourceComponent: namespace.componentId
    });
    if (!transition.ok) return transition;

    workflow.package = { packageId: sealed.packageId, packageVersion: sealed.packageVersion, packageHash: sealed.packageHash, handoffTarget: sealed.handoffTarget, immutable: true, status: "Ready", generatedAt: sealed.generatedAt };
    workflow.context.packageReference = internal.clone(workflow.package);
    workflow.timeline.push({ type: "Workflow Package Generated", packageId: sealed.packageId, at: sealed.generatedAt });
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "WORKFLOW_PACKAGE_GENERATED", "Ready", { package: internal.clone(sealed), verification: verification, persistence: persistence, workflowState: internal.clone(workflow.state) });
  }

  function getWorkflowPackage(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    const packageId = workflow && workflow.package && workflow.package.packageId;
    return internal.clone(packageStore.find(function find(item) { return item.packageId === packageId; }) || null);
  }

  function listWorkflowPackages(workflowId) {
    const target = String(workflowId || "");
    return packageStore.filter(function filter(item) { return !target || item.workflowId === target; }).map(internal.clone);
  }

  function exportWorkflowPackageJson(workflowId, options) {
    const packageValue = getWorkflowPackage(workflowId);
    if (!packageValue) return internal.buildResult(false, "WORKFLOW_PACKAGE_NOT_FOUND", "Blocked", null);
    const pretty = !options || options.pretty !== false;
    return internal.buildResult(true, "WORKFLOW_PACKAGE_JSON_EXPORTED", "Ready", {
      fileName: "IDE-160_Workflow_Package_" + packageValue.workflowId + ".json",
      mimeType: "application/json",
      content: JSON.stringify(packageValue, null, pretty ? 2 : 0),
      packageHash: packageValue.packageHash
    });
  }

  async function generateWorkflowPackageZip(workflowId, options) {
    const packageValue = getWorkflowPackage(workflowId);
    if (!packageValue) return internal.buildResult(false, "WORKFLOW_PACKAGE_NOT_FOUND", "Blocked", null);
    if (typeof global.JSZip !== "function") return internal.buildResult(false, "JSZIP_UNAVAILABLE", "Blocked", null, { warnings: ["JSZip is required for browser ZIP export."] });
    const zip = new global.JSZip();
    zip.file("summary.json", JSON.stringify({ packageId: packageValue.packageId, workflowId: packageValue.workflowId, handoffTarget: packageValue.handoffTarget, packageHash: packageValue.packageHash, generatedAt: packageValue.generatedAt }, null, 2));
    zip.file("workflow-package.json", JSON.stringify(packageValue, null, 2));
    zip.file("README.txt", "IDE-160 Immutable Workflow Package\nHandoff Target: " + packageValue.handoffTarget + "\nPackage Hash: " + packageValue.packageHash + "\n");
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    return internal.buildResult(true, "WORKFLOW_PACKAGE_ZIP_GENERATED", "Ready", { fileName: internal.text(options && options.fileName, "IDE-160_Workflow_Package_" + packageValue.workflowId + ".zip"), blob: blob, packageHash: packageValue.packageHash });
  }

  function getWorkflowPackageStatus(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    const value = getWorkflowPackage(workflowId);
    const verification = value ? verifyWorkflowPackage(value) : null;
    return { id: "IDE-160-PACKAGE-STATUS", componentId: namespace.componentId, version: VERSION, workflowId: workflow && workflow.identity.workflowId || null, status: value && verification.valid ? "Ready" : value ? "Integrity Failed" : "Not Started", packageId: value && value.packageId || null, packageHash: value && value.packageHash || null, immutable: value && value.immutable === true, handoffTarget: value && value.handoffTarget || null, recordCount: value ? value.executionRecords.length + value.decisionRecords.length + value.approvalRecords.length + value.monitoringRecords.length : 0, updatedAt: value && value.generatedAt || internal.nowIso() };
  }

  function validateWorkflowPackage(options) {
    const checks = [];
    function check(name, passed, detail, group) { checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group }); }
    const originalState = internal.exportRuntimeState();
    const originalJournal = internal.transitionJournal.slice();
    const originalPackageStore = internal.clone(packageStore);
    const originalExecution = internal.clone(internal.executionStore && internal.executionStore.records || []);
    const originalRecords = internal.clone(internal.foundationRecordStore);
    const memory = namespace.api.createIDE160MemoryStorage();
    namespace.api.runWithIDE160Storage(memory, function run() {
      try {
        state.definitions.clear(); state.workflows.clear(); state.activeWorkflowId = null; internal.transitionJournal.splice(0, internal.transitionJournal.length); packageStore.splice(0, packageStore.length);
        if (internal.executionStore) internal.executionStore.records.splice(0, internal.executionStore.records.length);
        if (internal.decisionStore) internal.decisionStore.splice(0, internal.decisionStore.length);
        if (internal.approvalStore) internal.approvalStore.splice(0, internal.approvalStore.length);
        if (internal.monitoringStore) internal.monitoringStore.splice(0, internal.monitoringStore.length);
        namespace.api.createWorkflowDefinition({ id: "IDE-160-PACKAGE-DEF", version: "1.0.0", goal: "Package", scope: { phase: 7 }, inputContract: {}, approvalRequirement: {}, monitoringRequirement: {}, completionRequirement: {}, handoffTarget: "IDE-170" });
        namespace.api.createWorkflow("IDE-160-PACKAGE-DEF", {}, { workflowId: "IDE-160-PACKAGE-TEST" });
        const wf = state.workflows.get("IDE-160-PACKAGE-TEST");
        wf.state.primaryPhase = "Context Packaging"; wf.state.controlStatus = "Ready"; wf.currentAttempt.phasesEntered = ["Context Packaging"];
        wf.monitoring = { status: "Completed", health: 100, currentRecordId: "MONITORING-1" };
        wf.context.metrics = { health: 100, completionRate: 100 };
        internal.executionStore.records.push({ executionRecordId: "EXEC-1", workflowId: wf.identity.workflowId, recordHash: "E1" });
        internal.decisionStore.push({ decisionId: "DEC-1", workflowId: wf.identity.workflowId, decisionHash: "D1" });
        internal.approvalStore.push({ approvalRecordId: "APP-1", workflowId: wf.identity.workflowId, status: "Consumed", approvalHash: "A1" });
        internal.monitoringStore.push({ monitoringRecordId: "MON-1", workflowId: wf.identity.workflowId, status: "Healthy", monitoringHash: "M1" });
        check("Package module loaded", namespace.modules.package && namespace.modules.package.status === "Ready", namespace.modules.package && namespace.modules.package.status, "Module");
        const result = buildWorkflowPackage(wf.identity.workflowId, {});
        check("Workflow Package generated", result.ok === true, result.code, "Build");
        check("Workflow Package immutable flag", result.data.package.immutable === true, String(result.data.package.immutable), "Immutability");
        check("Workflow Package sealed", Boolean(result.data.package.packageHash), result.data.package.packageHash, "Integrity");
        check("Package integrity verified", result.data.verification.valid === true, JSON.stringify(result.data.verification), "Integrity");
        check("Execution Records integrated", result.data.package.executionRecords.length === 1, "count=" + result.data.package.executionRecords.length, "Contents");
        check("Decision Records integrated", result.data.package.decisionRecords.length === 1, "count=" + result.data.package.decisionRecords.length, "Contents");
        check("Approval Records integrated", result.data.package.approvalRecords.length === 1, "count=" + result.data.package.approvalRecords.length, "Contents");
        check("Monitoring Records integrated", result.data.package.monitoringRecords.length === 1, "count=" + result.data.package.monitoringRecords.length, "Contents");
        check("Metrics integrated", result.data.package.metrics.health === 100, JSON.stringify(result.data.package.metrics), "Contents");
        check("Timeline integrated", Array.isArray(result.data.package.timeline), "count=" + result.data.package.timeline.length, "Contents");
        check("IDE-170 handoff target", result.data.package.handoffTarget === "IDE-170", result.data.package.handoffTarget, "Handoff");
        check("Completion Gate handoff ready", wf.state.primaryPhase === "Completion Gate" && wf.state.controlStatus === "Ready", JSON.stringify(wf.state), "Handoff");
        check("Package reference stored", wf.context.packageReference.packageHash === result.data.package.packageHash, JSON.stringify(wf.context.packageReference), "Context");
        const second = buildWorkflowPackage(wf.identity.workflowId, {});
        check("Package generation idempotent", second.ok === true && second.code === "WORKFLOW_PACKAGE_ALREADY_GENERATED", second.code, "Idempotency");
        const exported = exportWorkflowPackageJson(wf.identity.workflowId, {});
        check("Package JSON export", exported.ok === true && exported.data.content.includes(result.data.package.packageId), exported.code, "Export");
        check("Package store persistence", packageStore.length === 1, "count=" + packageStore.length, "Persistence");
        check("Package lightweight status", getWorkflowPackageStatus(wf.identity.workflowId).status === "Ready", JSON.stringify(getWorkflowPackageStatus(wf.identity.workflowId)), "Status");
        const tampered = internal.clone(result.data.package); tampered.metrics.health = 0;
        check("Tampered Package rejected", verifyWorkflowPackage(tampered).valid === false, JSON.stringify(verifyWorkflowPackage(tampered)), "Integrity");
        check("Persistent commit prohibited", result.data.package.persistentCommitExecuted === false, "false", "Safety");
        check("ZIP mutation prohibited", result.data.package.zipFileMutation === false, "false", "Safety");
      } finally {
        internal.importRuntimeState(originalState); internal.transitionJournal.splice(0, internal.transitionJournal.length, ...originalJournal); packageStore.splice(0, packageStore.length, ...originalPackageStore);
        if (internal.executionStore) internal.executionStore.records.splice(0, internal.executionStore.records.length, ...originalExecution);
        internal.foundationRecordStore.failures.splice(0, internal.foundationRecordStore.failures.length, ...(originalRecords.failures || []));
        internal.foundationRecordStore.recoveries.splice(0, internal.foundationRecordStore.recoveries.length, ...(originalRecords.recoveries || []));
        internal.foundationRecordStore.attempts.splice(0, internal.foundationRecordStore.attempts.length, ...(originalRecords.attempts || []));
        if (internal.decisionStore) internal.decisionStore.splice(0, internal.decisionStore.length, ...(originalRecords.decisions || []));
        if (internal.approvalStore) internal.approvalStore.splice(0, internal.approvalStore.length, ...(originalRecords.approvals || []));
        if (internal.monitoringStore) internal.monitoringStore.splice(0, internal.monitoringStore.length, ...(originalRecords.monitoring || []));
        if (internal.completionStore) internal.completionStore.splice(0, internal.completionStore.length, ...(originalRecords.completions || []));
      }
    });
    const passed = checks.filter(function count(c) { return c.passed; }).length; const groups = {};
    checks.forEach(function group(c) { if (!groups[c.group]) groups[c.group] = { passed: 0, failed: 0, total: 0 }; groups[c.group].total += 1; c.passed ? groups[c.group].passed += 1 : groups[c.group].failed += 1; });
    return { id: internal.nextId("IDE-160-PACKAGE-VALIDATION"), componentId: namespace.componentId, version: VERSION, mode: internal.text(options && options.mode, "Phase 7 Workflow Package"), valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null, status: passed === checks.length ? "Passed" : "Failed", groups: groups, checks: checks, warnings: [], storageIsolation: true, executedAt: internal.nowIso() };
  }

  restoreStore();
  Object.assign(internal, { workflowPackageStore: packageStore, deepFreezeIDE160: deepFreeze, verifyIDE160WorkflowPackage: verifyWorkflowPackage });
  Object.assign(namespace.api, { buildWorkflowPackage: buildWorkflowPackage, getWorkflowPackage: getWorkflowPackage, listWorkflowPackages: listWorkflowPackages, verifyWorkflowPackage: verifyWorkflowPackage, exportWorkflowPackageJson: exportWorkflowPackageJson, generateWorkflowPackageZip: generateWorkflowPackageZip, getWorkflowPackageStatus: getWorkflowPackageStatus, validateWorkflowPackage: validateWorkflowPackage });
  namespace.modules.package = { id: "IDE-160-PACKAGE", version: VERSION, status: "Ready", immutable: true, handoffTarget: "IDE-170", packageContents: ["Execution Record", "Decision Record", "Approval Record", "Monitoring Record", "Metrics", "Timeline"], loadedAt: internal.nowIso() };
  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);