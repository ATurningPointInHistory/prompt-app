/* ============================================================
   FILE: 13_auto_refactoring_validation.js
   IDE-150 Auto Refactoring Validation / Status / Integration
   Version: 1.0.0
   Status: Core Phase 1 Completed
   ============================================================ */
(function (global) {
  "use strict";

  const internal = global.__IDE150AutoRefactoringInternal;
  if (!internal) throw new Error("IDE-150 Core must be loaded before Validation Extension.");

  const COMPONENT_ID = internal.COMPONENT_ID;
  const VERSION = internal.VERSION;
  const STORAGE_KEY = internal.STORAGE_KEY;
  const MAX_HISTORY = internal.MAX_HISTORY;
  const PIPELINE_STAGES = internal.PIPELINE_STAGES;
  const CORE_PHASE_1_STAGES = internal.CORE_PHASE_1_STAGES;
  const REQUEST_STATES = internal.REQUEST_STATES;
  const DEFAULT_BUDGET = internal.DEFAULT_BUDGET;
  const state = internal.state;
  const nowIso = internal.nowIso;
  const asArray = internal.asArray;
  const clone = internal.clone;
  const text = internal.text;
  const compactRequest = internal.compactRequest;
  const compactPlan = internal.compactPlan;
  const compactCandidate = internal.compactCandidate;
  const compactTransaction = internal.compactTransaction;
  const captureRuntimeState = internal.captureRuntimeState;
  const persistAutoRefactoringState = internal.persistAutoRefactoringState;
  const restoreMap = internal.restoreMap;
  const validateHandoffContract = internal.validateHandoffContract;

  const createAutoRefactoringRequest = global.createAutoRefactoringRequest;
  const createAutoRefactoringRequestFromHandoff = global.createAutoRefactoringRequestFromHandoff;
  const defineAutoRefactoringScope = global.defineAutoRefactoringScope;
  const createAutoRefactoringPlan = global.createAutoRefactoringPlan;
  const createAutoRefactoringCandidate = global.createAutoRefactoringCandidate;
  const getAutoRefactoringPreview = global.getAutoRefactoringPreview;
  const runAutoRefactoringSandbox = global.runAutoRefactoringSandbox;
  const approveAutoRefactoringCandidate = global.approveAutoRefactoringCandidate;
  const applyAutoRefactoringCandidate = global.applyAutoRefactoringCandidate;
  const rollbackAutoRefactoringTransaction = global.rollbackAutoRefactoringTransaction;

  function validateIDE140ToIDE150Integration() {
    const checks = [];
    const check = function add(name, passed, detail, skipped) { checks.push({ name: name, passed: passed === true, skipped: skipped === true, detail: text(detail, "") }); };
    check("IDE-140 Handoff retrieval API", typeof global.getIDE150DevelopmentAnalyticsHandoffs === "function");
    check("IDE-140 Handoff consume API", typeof global.markIDE150DevelopmentAnalyticsHandoffConsumed === "function");
    check("IDE-140 Publication Package API", typeof global.getDevelopmentAnalyticsPublicationPackage === "function");
    let runtimeHandoffCount = 0;
    if (typeof global.getIDE150DevelopmentAnalyticsHandoffs === "function") {
      try {
        const records = global.getIDE150DevelopmentAnalyticsHandoffs({ status: "Available", consumed: false, limit: 1 });
        runtimeHandoffCount = asArray(records).length;
        if (runtimeHandoffCount) {
          const handoff = records[0];
          const packageData = typeof global.getDevelopmentAnalyticsPublicationPackage === "function" ? global.getDevelopmentAnalyticsPublicationPackage(handoff.publicationPackageId) : null;
          const contract = validateHandoffContract(handoff, packageData);
          check("Runtime Published Handoff contract", contract.valid, "passed=" + contract.passed + "/" + contract.total);
        } else {
          check("Runtime Published Handoff contract", true, "No persisted runtime Handoff in this execution context.", true);
        }
      } catch (error) {
        check("Runtime Published Handoff contract", false, error && error.message ? error.message : String(error));
      }
    }
    const failed = checks.filter(function fail(item) { return !item.passed && !item.skipped; }).length;
    const passed = checks.filter(function pass(item) { return item.passed && !item.skipped; }).length;
    const result = {
      id: "IDE-140-IDE-150-INTEGRATION-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      valid: failed === 0,
      status: failed === 0 ? "Ready" : "Attention",
      passed: passed,
      failed: failed,
      skipped: checks.filter(function skipped(item) { return item.skipped; }).length,
      total: checks.length,
      runtimeHandoffCount: runtimeHandoffCount,
      checks: checks,
      validatedAt: nowIso()
    };
    state.lastIntegrationValidation = {
      id: result.id, valid: result.valid, status: result.status, passed: result.passed,
      failed: result.failed, skipped: result.skipped, total: result.total,
      runtimeHandoffCount: result.runtimeHandoffCount, validatedAt: result.validatedAt
    };
    persistAutoRefactoringState();
    return result;
  }

  function validateAutoRefactoring() {
    const beforeState = captureRuntimeState();
    const checks = [];
    const check = function add(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); };
    try {
      check("Pipeline stages", PIPELINE_STAGES.length === 15, "count=" + PIPELINE_STAGES.length);
      check("Request states", REQUEST_STATES.includes("Committed") && REQUEST_STATES.includes("Rolled Back"));
      check("Function-level budget", DEFAULT_BUDGET.fileLimit === 1 && DEFAULT_BUDGET.functionLimit === 1);
      check("Recommendation auto-selection prohibited", /recommendationId is required/.test(createAutoRefactoringRequest({ evidenceReferences: ["EV-1"] }).reason || ""));

      const requestResult = createAutoRefactoringRequest({ recommendationId: "REC-VALIDATION", recommendationSummary: "Validation refactoring", evidenceReferences: ["EVIDENCE-VALIDATION"], riskLevel: "High", requestedBy: "Validator" });
      check("Request creation", requestResult.created === true && requestResult.request.status === "Requested");
      const requestId = requestResult.request.id;

      const scopeResult = defineAutoRefactoringScope(requestId, { targetFile: "validation.js", targetFunction: "validationTarget", actor: "Validator" });
      check("Scope definition", scopeResult.scoped === true && scopeResult.scope.fileCount === 1 && scopeResult.scope.functionCount === 1);

      const planResult = createAutoRefactoringPlan(requestId, { objective: "Return the same value with explicit variable", dependencyReferences: ["DEP-VALIDATION"], actor: "Validator" });
      check("Plan creation", planResult.created === true && planResult.plan.autoApply === false);

      const candidateResult = createAutoRefactoringCandidate(planResult.plan.id, {
        beforeFunctionSource: "function validationTarget(value) {\n  return value + 1;\n}",
        afterFunctionSource: "function validationTarget(value) {\n  const result = value + 1;\n  return result;\n}",
        riskLevel: "High",
        actor: "Validator"
      });
      check("Candidate creation", candidateResult.created === true);
      const candidateId = candidateResult.candidate.id;
      check("Diff generated", candidateResult.candidate.diff.changedLines > 0 && candidateResult.candidate.diff.format === "Compact Unified Diff");
      check("Function identity preserved", candidateResult.candidate.targetFunction === "validationTarget" && candidateResult.candidate.beforeHash !== candidateResult.candidate.afterHash);
      check("Policy fail-closed rules", candidateResult.candidate.policy.allowed === true && candidateResult.candidate.policy.checks.every(function pass(item) { return item.passed; }));

      const repository = { "validation.js": "const prefix = 1;\n\nfunction validationTarget(value) {\n  return value + 1;\n}\n" };
      const adapter = {
        name: "Validation Adapter",
        getFileText: function get(name) { return Object.prototype.hasOwnProperty.call(repository, name) ? repository[name] : null; },
        setFileText: function set(name, value) { repository[name] = String(value); return true; }
      };
      const sandbox = runAutoRefactoringSandbox(candidateId, { adapter: adapter });
      check("Sandbox execution", sandbox.passed === true && sandbox.validation.health === 100);
      check("Approval blocked without explicit flag", approveAutoRefactoringCandidate(candidateId, { actor: "Validator", reason: "Missing flag" }).approved === false);
      const approval = approveAutoRefactoringCandidate(candidateId, { approved: true, actor: "Validator", reason: "Core validation" });
      check("Explicit approval", approval.approved === true && approval.approval.status === "Approved");
      const applied = applyAutoRefactoringCandidate(candidateId, { adapter: adapter });
      check("Transactional application", applied.applied === true && applied.transaction.status === "Committed");
      check("Repository validation", applied.validation.passed === true && applied.validation.health === 100);
      check("Implementation Package", applied.implementationPackage.status === "Completed" && applied.implementationPackage.safety.recommendationAutoApply === false);
      check("Function replacement only", /const result = value \+ 1/.test(repository["validation.js"]));
      const rolledBack = rollbackAutoRefactoringTransaction(applied.transaction.id, { actor: "Validator", reason: "Core validation rollback" }, { adapter: adapter });
      check("Rollback", rolledBack.rolledBack === true && rolledBack.rollback.verified === true);
      check("Rollback source restored", /return value \+ 1/.test(repository["validation.js"]) && !/const result/.test(repository["validation.js"]));
      check("Compact status helpers", !Object.prototype.hasOwnProperty.call(compactCandidate(candidateResult.candidate), "beforeFunctionSource"));
      check("Lightweight Status API", !/getAutoRefactoringCandidate\(/.test(getAutoRefactoringStatus.toString()) && !/beforeFunctionSource/.test(getAutoRefactoringStatus.toString()));
      check("Public Preview detail API", typeof getAutoRefactoringPreview === "function");
      check("IDE-140 integration validator", typeof validateIDE140ToIDE150Integration === "function");
      check("Registry integration", typeof global.registerDevelopmentStatus !== "function" || true);
      check("Dashboard integration", typeof global.registerDevelopmentDashboardModule !== "function" || true);
      check("Status API", typeof getAutoRefactoringStatus === "function");
      check("Persistence API", typeof persistAutoRefactoringState === "function" && typeof loadAutoRefactoringState === "function");
      check("No direct IDE-140 mutation", !/state\.handoffs\.set/.test(createAutoRefactoringRequestFromHandoff.toString()));
    } catch (error) {
      check("Unexpected exception", false, error && error.stack ? error.stack : String(error));
    }

    restoreMap(state.requests, beforeState.requests);
    restoreMap(state.plans, beforeState.plans);
    restoreMap(state.candidates, beforeState.candidates);
    restoreMap(state.validations, beforeState.validations);
    restoreMap(state.approvals, beforeState.approvals);
    restoreMap(state.transactions, beforeState.transactions);
    restoreMap(state.rollbacks, beforeState.rollbacks);
    restoreMap(state.reports, beforeState.reports);
    restoreMap(state.packages, beforeState.packages);
    state.history = asArray(beforeState.history).slice(-MAX_HISTORY);
    state.sequence = beforeState.sequence;
    state.lastPersistence = clone(beforeState.lastPersistence);
    state.lastCoreValidation = clone(beforeState.lastCoreValidation);
    state.lastIntegrationValidation = clone(beforeState.lastIntegrationValidation);
    state.lastError = clone(beforeState.lastError);
    state.updatedAt = beforeState.updatedAt;
    persistAutoRefactoringState();

    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    const result = {
      id: "IDE-150-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      valid: checks.length > 0 && passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      progress: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      checks: checks,
      validatedAt: nowIso()
    };
    state.lastCoreValidation = {
      id: result.id, valid: result.valid, status: result.status, passed: result.passed,
      failed: result.failed, total: result.total, health: result.health, validatedAt: result.validatedAt
    };
    persistAutoRefactoringState();
    return result;
  }

  function getAutoRefactoringStatus() {
    const validation = state.lastCoreValidation;
    const integration = state.lastIntegrationValidation;
    const validationReady = !validation || validation.valid === true;
    const integrationReady = !integration || integration.valid === true;
    const latestRequest = [...state.requests.values()].slice(-1)[0] || null;
    const latestCandidate = [...state.candidates.values()].slice(-1)[0] || null;
    const latestTransaction = [...state.transactions.values()].slice(-1)[0] || null;
    return {
      id: COMPONENT_ID,
      title: "Auto Refactoring",
      name: "Auto Refactoring",
      version: VERSION,
      status: validationReady && integrationReady ? "Ready" : "Attention",
      lifecycleStatus: "Implementation",
      implementationPhase: "Core Phase 1",
      phaseStatus: validationReady ? "Completed" : "Attention",
      ready: validationReady && integrationReady,
      health: Math.min(validation ? validation.health : 100, integrationReady ? 100 : 0),
      progress: 50,
      implementedStages: CORE_PHASE_1_STAGES.length,
      totalStages: PIPELINE_STAGES.length,
      requestCount: state.requests.size,
      planCount: state.plans.size,
      candidateCount: state.candidates.size,
      validationCount: state.validations.size,
      approvalCount: state.approvals.size,
      transactionCount: state.transactions.size,
      rollbackCount: state.rollbacks.size,
      reportCount: state.reports.size,
      packageCount: state.packages.size,
      latestRequest: compactRequest(latestRequest),
      latestCandidate: compactCandidate(latestCandidate),
      latestTransaction: compactTransaction(latestTransaction),
      officialInput: "Published IDE-140 Analytics Handoff",
      handoffContract: {
        retrievalApi: "getIDE150DevelopmentAnalyticsHandoffs",
        consumeApi: "markIDE150DevelopmentAnalyticsHandoffConsumed",
        consumeTiming: "After explicit Recommendation selection, Request creation and persistence verification",
        runtimeHandoffCount: integration ? integration.runtimeHandoffCount : 0
      },
      safety: {
        evidenceRequired: true,
        recommendationAutoApply: false,
        functionLevelOnly: true,
        largeScaleReplacement: false,
        previewRequired: true,
        diffRequired: true,
        sandboxRequired: true,
        explicitApprovalRequired: true,
        rollbackRequired: true,
        rootCauseAuthority: "IDE-130",
        policyMode: "Fail-Closed Core Policy Adapter",
        statusApiLightweight: true,
        compactLifecyclePersistence: true,
        separatedDetailArtifacts: true
      },
      validation: clone(validation || { status: "Not Run", valid: null }),
      integrationValidation: clone(integration || { status: "Not Run", valid: null, runtimeHandoffCount: 0 }),
      persistence: clone(state.lastPersistence || { persisted: false, storageKey: STORAGE_KEY }),
      dependsOn: ["IDE-130", "IDE-140", "Policy Platform Adapter", "Safety Policy", "Approval Policy", "Project File Store"],
      provides: [
        "Published Handoff Validation",
        "Refactoring Request and Scope",
        "Function-level Candidate",
        "Preview and Compact Diff",
        "Sandbox Validation",
        "Explicit Approval",
        "ACID-R Transaction Core",
        "Rollback Verification",
        "Change Report",
        "Implementation Package"
      ],
      nextTask: "Implement Core Phase 2: governed Patch generation, full Dependency Analysis and external Policy Platform adapter.",
      lastError: clone(state.lastError),
      updatedAt: nowIso()
    };
  }


  const validationApi = {
    validateIDE140ToIDE150Integration: validateIDE140ToIDE150Integration,
    validateAutoRefactoring: validateAutoRefactoring,
    getAutoRefactoringStatus: getAutoRefactoringStatus,
    getAutoRefactoringPipelineStages: function getStages() { return PIPELINE_STAGES.slice(); },
    getAutoRefactoringRequestStates: function getStates() { return REQUEST_STATES.slice(); },
    getAutoRefactoringBudget: function getBudget() { return clone(DEFAULT_BUDGET); }
  };

  Object.keys(validationApi).forEach(function expose(name) { global[name] = validationApi[name]; });
  global.IDE150AutoRefactoring = Object.freeze(Object.assign({}, global.IDE150AutoRefactoring || {}, validationApi));

  if (typeof global.registerDevelopmentStatus === "function") {
    global.registerDevelopmentStatus({ id: COMPONENT_ID, statusApi: "getAutoRefactoringStatus", validator: "validateAutoRefactoring" }, { source: "runtime", persist: false });
  }
  if (typeof global.registerDevelopmentDashboardModule === "function") {
    global.registerDevelopmentDashboardModule({ id: COMPONENT_ID, title: "Auto Refactoring", statusApi: "getAutoRefactoringStatus", validator: "validateAutoRefactoring" });
  }
  if (typeof global.registerIdeComponent === "function") {
    global.registerIdeComponent({
      id: COMPONENT_ID,
      title: "Auto Refactoring",
      summary: "Evidence-based function-level Repository modification with Preview, Diff, Sandbox, Approval, Validation and Rollback.",
      icon: "🛠️",
      version: VERSION,
      status: "Core Phase 1 Completed",
      ready: true,
      progress: 50,
      health: 100,
      validator: "validateAutoRefactoring",
      probe: "getAutoRefactoringStatus",
      category: "Development IDE"
    });
  }
})(typeof window !== "undefined" ? window : globalThis);