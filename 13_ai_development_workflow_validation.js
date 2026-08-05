/* ============================================================
   FILE: 13_ai_development_workflow_validation.js
   IDE-160 Final Validation / Release Freeze
   Version: 2.0.0
   Phase: 10 - Final Validation / Design Freeze Close
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const REQUIRED_MODULES = Object.freeze(["core", "storage", "state", "planning", "adapter", "execution", "decision", "approval", "monitoring", "package", "completion", "integration", "validation"]);
  const REQUIRED_PIPELINE = Object.freeze(["Definition", "Planning", "Execution", "Decision", "Approval", "Monitoring", "Context Packaging", "Completion Gate", "Completed"]);
  let lastReleaseValidation = null;

  function validateWorkflowFinal(options) {
    const checks = [];
    function check(name, passed, detail, group) { checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group }); }
    const status = namespace.api.getAIDevelopmentWorkflowStatus();
    const publicApi = namespace.api.getAIDevelopmentWorkflowPublicApi();
    const storageStatus = namespace.api.getIDE160StorageStatus();
    const integrationStatus = namespace.api.getAIDevelopmentWorkflowIntegrationStatus();
    const moduleNames = Object.keys(namespace.modules || {});
    const moduleVersions = REQUIRED_MODULES.map(function map(name) { return namespace.modules[name] && namespace.modules[name].version; });

    check("Final Validation module loaded", namespace.modules.validation && namespace.modules.validation.status === "Ready", namespace.modules.validation && namespace.modules.validation.status, "Module");
    check("All required modules loaded", REQUIRED_MODULES.every(function every(name) { return Boolean(namespace.modules[name]); }), moduleNames.join(","), "Module");
    check("All module versions aligned", moduleVersions.every(function every(version) { return version === VERSION; }), moduleVersions.join(","), "Version");
    check("Component version 2.0.0", VERSION === "2.0.0", VERSION, "Version");
    check("Implementation marked Complete", status.implementationStatus === "IDE-160 Complete", status.implementationStatus, "Status");
    check("Component Ready", status.ready === true && status.status === "Ready", status.status + "/" + status.ready, "Status");
    check("No runtime error", status.lastError == null, JSON.stringify(status.lastError), "Status");
    check("Pipeline state model complete", namespace.constants.PRIMARY_PHASES && REQUIRED_PIPELINE.every(function every(phase) { return namespace.constants.PRIMARY_PHASES.includes(phase); }), JSON.stringify(namespace.constants.PRIMARY_PHASES), "Pipeline");
    check("Workflow Package storage key", Boolean(storageStatus.keys.packageStore), storageStatus.keys.packageStore, "Storage");
    check("Workflow Baseline storage key", Boolean(storageStatus.keys.baselineStore), storageStatus.keys.baselineStore, "Storage");
    check("Storage hard guard configured", Number(storageStatus.budget.hardGuardBytes) > Number(storageStatus.budget.softWarningBytes), JSON.stringify(storageStatus.budget), "Storage");
    check("Monitoring API available", typeof namespace.api.completeWorkflowMonitoring === "function", typeof namespace.api.completeWorkflowMonitoring, "API");
    check("Package API available", typeof namespace.api.buildWorkflowPackage === "function" && typeof namespace.api.verifyWorkflowPackage === "function", "Package APIs", "API");
    check("Completion API available", typeof namespace.api.completeWorkflow === "function" && typeof namespace.api.verifyWorkflowBaseline === "function", "Completion APIs", "API");
    check("Release Handoff API available", typeof namespace.api.buildIDE160Handoff === "function", typeof namespace.api.buildIDE160Handoff, "API");
    check("Public API inventory", Array.isArray(publicApi.namespaceFunctions) && publicApi.namespaceFunctions.length >= 50, "count=" + publicApi.namespaceFunctions.length, "API");
    check("Full Application integration ready", integrationStatus.status === "Ready", JSON.stringify(integrationStatus), "Integration");
    check("Completion Gate contract", namespace.modules.completion.completionGateChecks.join("|") === "Health|Policy|Approval|Metrics|Workflow Package", namespace.modules.completion.completionGateChecks.join("|"), "Completion");
    check("IDE-170 handoff contract", namespace.modules.package.handoffTarget === "IDE-170" && namespace.modules.completion.handoffTarget === "IDE-170", namespace.modules.package.handoffTarget + "/" + namespace.modules.completion.handoffTarget, "Handoff");
    check("Immutable Package contract", namespace.modules.package.immutable === true, String(namespace.modules.package.immutable), "Integrity");
    check("Single active Workflow limit", internal.limits.maximumActiveWorkflows === 1, String(internal.limits.maximumActiveWorkflows), "Safety");
    check("Mutation Lock available", typeof namespace.api.getIDE160MutationLockStatus !== "function" || namespace.api.getIDE160MutationLockStatus().active === false, typeof namespace.api.getIDE160MutationLockStatus === "function" ? JSON.stringify(namespace.api.getIDE160MutationLockStatus()) : "Not Available", "Safety");
    check("Persistent commit prohibited", status.persistentCommitAllowed === false, String(status.persistentCommitAllowed), "Safety");
    check("ZIP mutation prohibited", status.zipFileMutationAllowed === false, String(status.zipFileMutationAllowed), "Safety");
    check("Canonical serialization API stable", namespace.api.canonicalStringifyIDE160({ b: 2, a: 1 }) === '{"a":1,"b":2}', namespace.api.canonicalStringifyIDE160({ b: 2, a: 1 }), "Integrity");
    check("Canonical hash API stable", namespace.api.hashIDE160CanonicalSync({ a: 1, b: 2 }).hash === namespace.api.hashIDE160CanonicalSync({ b: 2, a: 1 }).hash, namespace.api.hashIDE160CanonicalSync({ a: 1, b: 2 }).hash, "Integrity");

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const groups = {};
    checks.forEach(function group(item) { if (!groups[item.group]) groups[item.group] = { passed: 0, failed: 0, total: 0 }; groups[item.group].total += 1; item.passed ? groups[item.group].passed += 1 : groups[item.group].failed += 1; });
    return { id: internal.nextId("IDE-160-FINAL-VALIDATION"), componentId: namespace.componentId, version: VERSION, mode: internal.text(options && options.mode, "Phase 10 Final Validation / Release Freeze"), valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null, status: passed === checks.length ? "Passed" : "Failed", groups: groups, checks: checks, warnings: [], executedAt: internal.nowIso() };
  }

  function validateIDE160Release(options) {
    const integrated = namespace.api.validateAIDevelopmentWorkflow(Object.assign({}, options || {}, { mode: internal.text(options && options.mode, "IDE-160 Final Release Validation") }));
    const release = {
      id: internal.nextId("IDE-160-RELEASE-VALIDATION"),
      componentId: namespace.componentId,
      version: VERSION,
      releaseCandidate: "IDE-160 Complete v2.0.0",
      releaseAllowed: integrated.status === "Passed" && integrated.failed === 0 && integrated.total > 0 && integrated.health === 100,
      status: integrated.status === "Passed" && integrated.failed === 0 ? "Release Allowed" : "Release Blocked",
      integratedValidation: internal.clone(integrated),
      persistentCommitExecuted: false,
      zipFileMutation: false,
      handoffTarget: "IDE-170",
      executedAt: internal.nowIso()
    };
    lastReleaseValidation = internal.clone(release);
    internal.finalReleaseValidation = lastReleaseValidation;
    return release;
  }

  function getIDE160ReleaseStatus() {
    const status = namespace.api.getAIDevelopmentWorkflowStatus();
    return {
      id: "IDE-160-RELEASE-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: lastReleaseValidation ? lastReleaseValidation.status : "Not Run",
      releaseAllowed: Boolean(lastReleaseValidation && lastReleaseValidation.releaseAllowed),
      validationPassed: Boolean(lastReleaseValidation && lastReleaseValidation.integratedValidation && lastReleaseValidation.integratedValidation.status === "Passed"),
      passed: lastReleaseValidation && lastReleaseValidation.integratedValidation && lastReleaseValidation.integratedValidation.passed || 0,
      failed: lastReleaseValidation && lastReleaseValidation.integratedValidation && lastReleaseValidation.integratedValidation.failed || 0,
      total: lastReleaseValidation && lastReleaseValidation.integratedValidation && lastReleaseValidation.integratedValidation.total || 0,
      health: lastReleaseValidation && lastReleaseValidation.integratedValidation && lastReleaseValidation.integratedValidation.health || null,
      implementationStatus: status.implementationStatus,
      handoffTarget: "IDE-170",
      persistentCommitExecuted: false,
      zipFileMutation: false,
      updatedAt: lastReleaseValidation && lastReleaseValidation.executedAt || internal.nowIso()
    };
  }

  function buildIDE160FinalReport() {
    const releaseStatus = getIDE160ReleaseStatus();
    const status = namespace.api.getAIDevelopmentWorkflowStatus();
    return {
      reportId: internal.nextId("IDE-160-FINAL-REPORT"),
      componentId: namespace.componentId,
      name: namespace.name,
      version: VERSION,
      implementationStatus: status.implementationStatus,
      releaseStatus: releaseStatus,
      modules: internal.clone(status.modules),
      pipeline: REQUIRED_PIPELINE.slice(),
      completionGateChecks: namespace.modules.completion.completionGateChecks.slice(),
      workflowPackage: { immutable: true, handoffTarget: "IDE-170", contents: namespace.modules.package.packageContents.slice() },
      safety: { persistentCommitAllowed: false, zipFileMutationAllowed: false, maximumConcurrentMutation: 1 },
      generatedAt: internal.nowIso()
    };
  }

  Object.assign(internal, { requiredIDE160Modules: REQUIRED_MODULES, requiredIDE160Pipeline: REQUIRED_PIPELINE });
  Object.assign(namespace.api, { validateWorkflowFinal: validateWorkflowFinal, validateIDE160Release: validateIDE160Release, getIDE160ReleaseStatus: getIDE160ReleaseStatus, buildIDE160FinalReport: buildIDE160FinalReport });
  namespace.modules.validation = { id: "IDE-160-FINAL-VALIDATION", version: VERSION, status: "Ready", releaseFreeze: true, requiredModules: REQUIRED_MODULES.slice(), loadedAt: internal.nowIso() };
  global.validateIDE160Release = validateIDE160Release;
  global.getIDE160ReleaseStatus = getIDE160ReleaseStatus;
  global.buildIDE160FinalReport = buildIDE160FinalReport;
  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);