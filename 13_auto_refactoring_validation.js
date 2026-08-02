/* ============================================================
   FILE: 13_auto_refactoring_validation.js
   IDE-150 Auto Refactoring Validation / Status / Integration
   Version: 1.2.1
   Status: Current Project Source Auto-Load Validation
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
  const CORE_PHASE_2_CAPABILITIES = internal.CORE_PHASE_2_CAPABILITIES || [];
  const nowIso = internal.nowIso;
  const asArray = internal.asArray;
  const clone = internal.clone;
  const text = internal.text;
  const compactRequest = internal.compactRequest;
  const compactCandidate = internal.compactCandidate;
  const compactTransaction = internal.compactTransaction;
  const captureRuntimeState = internal.captureRuntimeState;
  const persistAutoRefactoringState = internal.persistAutoRefactoringState;
  const restoreMap = internal.restoreMap;
  const validateHandoffContract = internal.validateHandoffContract;
  const getCompactAnalyticsPhase2BState = internal.getCompactAnalyticsPhase2BState;
  const getCompactPublicationPackage = internal.getCompactPublicationPackage;

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

  function clockNow() {
    return global.performance && typeof global.performance.now === "function"
      ? global.performance.now()
      : Date.now();
  }

  function lastMapValue(map) {
    let latest = null;
    map.forEach(function assign(value) { latest = value; });
    return latest;
  }

  function summarizeValidation(result) {
    return {
      id: result.id,
      valid: result.valid,
      status: result.status,
      mode: result.mode,
      passed: result.passed,
      failed: result.failed,
      skipped: result.skipped || 0,
      total: result.total,
      health: result.health == null ? (result.valid ? 100 : 0) : result.health,
      runtimeHandoffCount: result.runtimeHandoffCount || 0,
      durationMs: result.durationMs,
      validatedAt: result.validatedAt
    };
  }

  function validateIDE140ToIDE150Integration() {
    const startedAt = clockNow();
    const checks = [];
    const check = function add(name, passed, detail, skipped) {
      checks.push({ name: name, passed: passed === true, skipped: skipped === true, detail: text(detail, "") });
    };

    check("IDE-140 Handoff retrieval API", typeof global.getIDE150DevelopmentAnalyticsHandoffs === "function");
    check("IDE-140 Handoff consume API", typeof global.markIDE150DevelopmentAnalyticsHandoffConsumed === "function");
    check("IDE-140 Publication Package API", typeof global.getDevelopmentAnalyticsPublicationPackage === "function");
    check("IDE-140 Compact Phase 2B State API", typeof global.getDevelopmentAnalyticsPhase2BState === "function" || Boolean(global.localStorage));

    let runtimeHandoffCount = 0;
    const compactState = getCompactAnalyticsPhase2BState();
    if (compactState.available && compactState.payload) {
      const records = asArray(compactState.payload.handoffs).filter(function filter(item) {
        return item && item.targetComponent === COMPONENT_ID && item.eligible === true && item.status === "Available" && item.consumed !== true;
      }).sort(function newest(a, b) {
        return Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0);
      });
      runtimeHandoffCount = records.length;
      if (runtimeHandoffCount) {
        const handoff = records[0];
        const packageData = getCompactPublicationPackage(handoff.publicationPackageId, compactState);
        const contract = validateHandoffContract(handoff, packageData);
        check("Runtime Published Handoff compact contract", contract.valid, "passed=" + contract.passed + "/" + contract.total);
      } else {
        check("Runtime Published Handoff compact contract", true, "No persisted Available Handoff in this execution context.", true);
      }
    } else {
      check("Runtime Published Handoff compact contract", true, compactState.reason || "Compact state unavailable.", true);
    }

    const failed = checks.filter(function fail(item) { return !item.passed && !item.skipped; }).length;
    const passed = checks.filter(function pass(item) { return item.passed && !item.skipped; }).length;
    const result = {
      id: "IDE-140-IDE-150-INTEGRATION-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      mode: "Lightweight Compact Contract",
      hydration: false,
      persistenceWrite: false,
      valid: failed === 0,
      status: failed === 0 ? "Ready" : "Attention",
      passed: passed,
      failed: failed,
      skipped: checks.filter(function skipped(item) { return item.skipped; }).length,
      total: checks.length,
      runtimeHandoffCount: runtimeHandoffCount,
      checks: checks,
      durationMs: Math.round((clockNow() - startedAt) * 1000) / 1000,
      validatedAt: nowIso()
    };
    state.lastIntegrationValidation = summarizeValidation(result);
    return result;
  }

  function validateAutoRefactoringLightweight() {
    const startedAt = clockNow();
    const checks = [];
    const check = function add(name, passed, detail) {
      checks.push({ name: name, passed: passed === true, detail: text(detail, "") });
    };

    check("Pipeline stage count", PIPELINE_STAGES.length === 15, "count=" + PIPELINE_STAGES.length);
    check("Core Phase stage count", CORE_PHASE_1_STAGES.length === 15, "count=" + CORE_PHASE_1_STAGES.length);
    check("Requested state", REQUEST_STATES.includes("Requested"));
    check("Committed state", REQUEST_STATES.includes("Committed"));
    check("Rolled Back state", REQUEST_STATES.includes("Rolled Back"));
    check("Single-file budget", DEFAULT_BUDGET.fileLimit === 1);
    check("Single-function budget", DEFAULT_BUDGET.functionLimit === 1);
    check("Function source budget", DEFAULT_BUDGET.functionSourceCharLimit > 0);
    check("Changed-line budget", DEFAULT_BUDGET.changedLineLimit > 0);
    check("Diff output budget", DEFAULT_BUDGET.diffOutputCharLimit > 0);
    check("Published Handoff summary API", typeof global.getPublishedAnalyticsHandoffs === "function");
    check("Published Handoff detail API", typeof global.getPublishedAnalyticsHandoffDetail === "function");
    check("Published Handoff verification API", typeof global.verifyPublishedAnalyticsHandoff === "function");
    check("Request API", typeof createAutoRefactoringRequest === "function");
    check("Handoff Request API", typeof createAutoRefactoringRequestFromHandoff === "function");
    check("Scope API", typeof defineAutoRefactoringScope === "function");
    check("Plan API", typeof createAutoRefactoringPlan === "function");
    check("Candidate API", typeof createAutoRefactoringCandidate === "function");
    check("Preview API", typeof getAutoRefactoringPreview === "function");
    check("Sandbox API", typeof runAutoRefactoringSandbox === "function");
    check("Approval API", typeof approveAutoRefactoringCandidate === "function");
    check("Application API", typeof applyAutoRefactoringCandidate === "function");
    check("Rollback API", typeof rollbackAutoRefactoringTransaction === "function");
    check("Status API", typeof getAutoRefactoringStatus === "function");
    check("Persistence API", typeof persistAutoRefactoringState === "function" && typeof global.loadAutoRefactoringState === "function");
    check("Recommendation auto-selection prohibited", /recommendationId is required/.test(createAutoRefactoringRequest({ evidenceReferences: ["EV-LIGHT"] }).reason || ""));
    check("Status API does not hydrate details", !/getAutoRefactoringCandidate\(/.test(getAutoRefactoringStatus.toString()) && !/beforeFunctionSource/.test(getAutoRefactoringStatus.toString()));
    check("Integration validation uses compact state", /getCompactAnalyticsPhase2BState/.test(validateIDE140ToIDE150Integration.toString()) && !/getDevelopmentAnalyticsPublicationPackage\(/.test(validateIDE140ToIDE150Integration.toString()));
    check("No direct IDE-140 state mutation", !/state\.handoffs\.set/.test(createAutoRefactoringRequestFromHandoff.toString()));
    check("Core Phase 2 capability count", CORE_PHASE_2_CAPABILITIES.length === 3, "count=" + CORE_PHASE_2_CAPABILITIES.length);
    check("Full Dependency Analysis API", typeof global.analyzeAutoRefactoringDependencies === "function");
    check("External Policy Adapter API", typeof global.registerAutoRefactoringPolicyAdapter === "function" && typeof global.evaluateAutoRefactoringPolicy === "function");
    check("Governed Plan API", typeof global.createGovernedAutoRefactoringPlan === "function");
    check("Governed Candidate API", typeof global.createGovernedAutoRefactoringCandidate === "function");
    check("Governed Patch APIs", typeof global.generateAutoRefactoringPatch === "function" && typeof global.verifyAutoRefactoringPatch === "function");
    check("Phase 2 Status API", typeof global.getAutoRefactoringPhase2Status === "function");
    check("Standard Policy Adapter API", typeof global.installStandardAutoRefactoringPolicyAdapter === "function" && typeof global.evaluateStandardAutoRefactoringPolicy === "function");
    const standardPolicyStatus = typeof global.getStandardAutoRefactoringPolicyStatus === "function" ? global.getStandardAutoRefactoringPolicyStatus() : null;
    check("Standard Policy Adapter installed", Boolean(standardPolicyStatus && standardPolicyStatus.installed === true && standardPolicyStatus.active === true));
    check("Governed Dry Run API", typeof global.runStandardAutoRefactoringDryRun === "function");
    check("Practical Dry Run Template API", typeof global.prepareAutoRefactoringDryRunTemplate === "function");
    check("Practical Dry Run Execution API", typeof global.runPracticalAutoRefactoringDryRun === "function");
    check("Dry Run success reason contract", /reason:\s*""/.test(global.runStandardAutoRefactoringDryRun.toString()));
    const runtimePhase2Status = typeof global.getAutoRefactoringPhase2Status === "function" ? global.getAutoRefactoringPhase2Status() : null;
    check("Core Phase 2 runtime ready", Boolean(runtimePhase2Status && runtimePhase2Status.runtimeReady === true && runtimePhase2Status.externalPolicyStatus === "Standard Policy Connected"));
    check("Controlled Application preparation API", typeof global.prepareControlledAutoRefactoringApplication === "function");
    check("Controlled Application Approval API", typeof global.approveControlledAutoRefactoringApplication === "function");
    check("Controlled Application execution API", typeof global.executeControlledAutoRefactoringApplication === "function");
    check("Controlled Application Status API", typeof global.getControlledAutoRefactoringApplicationStatus === "function");
    check("Controlled Project File Store Status API", typeof global.getControlledProjectFileStoreStatus === "function");
    check("Controlled Application Approval UI", typeof global.openControlledAutoRefactoringApprovalPanel === "function");
    check("Controlled Application validation API", typeof global.validateControlledAutoRefactoringApplication === "function");

    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    const result = {
      id: "IDE-150-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      mode: "Lightweight Structural Validation",
      hydration: false,
      lifecycleMutation: false,
      persistenceWrite: false,
      valid: checks.length > 0 && passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      progress: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      checks: checks,
      durationMs: Math.round((clockNow() - startedAt) * 1000) / 1000,
      validatedAt: nowIso()
    };
    state.lastCoreValidation = summarizeValidation(result);
    return result;
  }

  function validateAutoRefactoringDeep() {
    const startedAt = clockNow();
    const beforeState = captureRuntimeState();
    const checks = [];
    const check = function add(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); };
    try {
      const requestResult = createAutoRefactoringRequest({ recommendationId: "REC-DEEP-VALIDATION", recommendationSummary: "Deep validation refactoring", evidenceReferences: ["EVIDENCE-DEEP-VALIDATION"], riskLevel: "High", requestedBy: "Validator" });
      check("Request creation", requestResult.created === true && requestResult.request.status === "Requested");
      const requestId = requestResult.request.id;
      const scopeResult = defineAutoRefactoringScope(requestId, { targetFile: "validation.js", targetFunction: "validationTarget", actor: "Validator" });
      check("Scope definition", scopeResult.scoped === true && scopeResult.scope.fileCount === 1 && scopeResult.scope.functionCount === 1);
      const planResult = createAutoRefactoringPlan(requestId, { objective: "Return the same value with explicit variable", dependencyReferences: ["DEP-DEEP-VALIDATION"], actor: "Validator" });
      check("Plan creation", planResult.created === true && planResult.plan.autoApply === false);
      const candidateResult = createAutoRefactoringCandidate(planResult.plan.id, {
        beforeFunctionSource: "function validationTarget(value) {\n  return value + 1;\n}",
        afterFunctionSource: "function validationTarget(value) {\n  const result = value + 1;\n  return result;\n}",
        riskLevel: "High",
        actor: "Validator"
      });
      check("Candidate creation", candidateResult.created === true);
      const candidateId = candidateResult.candidate.id;
      check("Diff generated", candidateResult.candidate.diff.changedLines > 0);
      const repository = { "validation.js": "const prefix = 1;\n\nfunction validationTarget(value) {\n  return value + 1;\n}\n" };
      const adapter = {
        name: "Deep Validation Adapter",
        getFileText: function get(name) { return Object.prototype.hasOwnProperty.call(repository, name) ? repository[name] : null; },
        setFileText: function set(name, value) { repository[name] = String(value); return true; }
      };
      const sandbox = runAutoRefactoringSandbox(candidateId, { adapter: adapter });
      check("Sandbox execution", sandbox.passed === true && sandbox.validation.health === 100);
      check("Approval blocked without explicit flag", approveAutoRefactoringCandidate(candidateId, { actor: "Validator", reason: "Missing flag" }).approved === false);
      const approval = approveAutoRefactoringCandidate(candidateId, { approved: true, actor: "Validator", reason: "Deep validation" });
      check("Explicit approval", approval.approved === true);
      const applied = applyAutoRefactoringCandidate(candidateId, { adapter: adapter });
      check("Transactional application", applied.applied === true && applied.transaction.status === "Committed");
      check("Repository validation", applied.validation.passed === true);
      const rolledBack = rollbackAutoRefactoringTransaction(applied.transaction.id, { actor: "Validator", reason: "Deep validation rollback" }, { adapter: adapter });
      check("Rollback", rolledBack.rolledBack === true && rolledBack.rollback.verified === true);

      const policyRegistration = global.registerAutoRefactoringPolicyAdapter({
        id: "IDE150-DEEP-VALIDATION-POLICY",
        version: "1.0.0",
        evaluate: function evaluate(context) {
          return { allowed: Boolean(context && context.dependencyAnalysis && context.dependencyAnalysis.passed), reason: "Deep validation policy" };
        }
      }, { active: true });
      check("Phase 2 Policy Adapter registration", policyRegistration.registered === true);
      const request2 = createAutoRefactoringRequest({ recommendationId: "REC-PHASE2-DEEP", recommendationSummary: "Phase 2 governed validation", evidenceReferences: ["EVIDENCE-PHASE2-DEEP"], riskLevel: "Medium", requestedBy: "Validator" });
      const scope2 = defineAutoRefactoringScope(request2.request.id, { targetFile: "phase2-validation.js", targetFunction: "phase2Target", actor: "Validator" });
      const plan2 = global.createGovernedAutoRefactoringPlan(request2.request.id, { objective: "Governed patch", policyAdapterId: "IDE150-DEEP-VALIDATION-POLICY", actor: "Validator" });
      check("Phase 2 Governed Plan", plan2.created === true && plan2.plan.governanceMode === "Core Phase 2");
      const phase2Sources = [
        { fileName: "phase2-validation.js", code: "function phase2Target(value) {\n  return helper(value);\n}\nfunction helper(value) { return value + 1; }" },
        { fileName: "consumer.js", code: "function consumer(value) { return phase2Target(value); }" }
      ];
      const candidate2 = global.createGovernedAutoRefactoringCandidate(plan2.plan.id, {
        beforeFunctionSource: "function phase2Target(value) {\n  return helper(value);\nn}".replace("\nn}", "\n}"),
        afterFunctionSource: "function phase2Target(value) {\n  const result = helper(value);\n  return result;\n}",
        riskLevel: "Medium",
        actor: "Validator"
      }, { sources: phase2Sources });
      check("Phase 2 Governed Candidate", candidate2.created === true && candidate2.candidate.externalPolicyStatus === "Allowed");
      check("Phase 2 Dependency impact", candidate2.dependencyAnalysis && candidate2.dependencyAnalysis.summary.inboundReferenceCount === 1 && candidate2.dependencyAnalysis.summary.impactedFileCount === 2);
      const patch2 = global.generateAutoRefactoringPatch(candidate2.candidate.id, { actor: "Validator" });
      check("Phase 2 Patch generation", patch2.generated === true && patch2.patch.autoApply === false);
      const phase2Repository = { "phase2-validation.js": phase2Sources[0].code, "consumer.js": phase2Sources[1].code };
      const phase2Adapter = {
        getFileText: function get(name) { return Object.prototype.hasOwnProperty.call(phase2Repository, name) ? phase2Repository[name] : null; },
        setFileText: function set(name, value) { phase2Repository[name] = String(value); return true; }
      };
      const patchVerification2 = global.verifyAutoRefactoringPatch(patch2.patch.id, { adapter: phase2Adapter });
      check("Phase 2 Patch verification", patchVerification2.verified === true);
      check("Phase 2 separated artifact persistence", state.lastPersistence && state.lastPersistence.dependencyArtifactCount >= 1 && state.lastPersistence.patchArtifactCount >= 1 && state.lastPersistence.policyArtifactCount >= 1);
      const sandbox2 = runAutoRefactoringSandbox(candidate2.candidate.id, { adapter: phase2Adapter });
      check("Phase 2 Sandbox", sandbox2.passed === true);
      const approval2 = approveAutoRefactoringCandidate(candidate2.candidate.id, { approved: true, actor: "Validator", reason: "Phase 2 deep validation" });
      check("Phase 2 Explicit Approval", approval2.approved === true);
      const applied2 = applyAutoRefactoringCandidate(candidate2.candidate.id, { adapter: phase2Adapter });
      check("Phase 2 Transactional application", applied2.applied === true && applied2.implementationPackage.governance.patchVerified === true);
      const rollback2 = rollbackAutoRefactoringTransaction(applied2.transaction.id, { actor: "Validator", reason: "Phase 2 rollback" }, { adapter: phase2Adapter });
      check("Phase 2 Rollback", rollback2.rolledBack === true);
      global.unregisterAutoRefactoringPolicyAdapter("IDE150-DEEP-VALIDATION-POLICY");

      const standardStatus = global.getStandardAutoRefactoringPolicyStatus();
      check("Standard Policy ready", standardStatus.installed === true && standardStatus.active === true);
      const standardContext = {
        phase: "Core Phase 2",
        riskLevel: "Low",
        plan: {
          targetFile: "safe.js",
          targetFunction: "safeTarget",
          operation: "Replace Existing Function",
          budget: { fileLimit: 1, functionLimit: 1, changedLineLimit: 20 },
          explicitApprovalRequired: true,
          rollbackRequired: true,
          autoApply: false
        },
        diff: { changedLines: 2, truncated: false, text: "@@ function lines 2 @@\n+  const result = value + 1;" },
        dependencyAnalysis: {
          passed: true,
          status: "Passed",
          riskLevel: "Low",
          definitions: [{ fileName: "safe.js", functionName: "safeTarget" }],
          inboundReferences: [],
          impactedFiles: ["safe.js"],
          addedCallees: [],
          globalExposure: [],
          summary: { inboundReferenceCount: 0, impactedFileCount: 1, addedCalleeCount: 0, globalExposureCount: 0 }
        }
      };
      const standardAllowed = global.evaluateStandardAutoRefactoringPolicy(standardContext);
      check("Standard Policy allows safe function patch", standardAllowed.allowed === true && standardAllowed.summary.failed === 0);
      const dangerousContext = clone(standardContext);
      dangerousContext.diff = { changedLines: 2, truncated: false, text: "@@ function lines 2 @@\n+  return fetch('/unsafe');" };
      const standardDenied = global.evaluateStandardAutoRefactoringPolicy(dangerousContext);
      check("Standard Policy rejects dangerous API addition", standardDenied.allowed === false && standardDenied.rules.some(function denied(item) { return item.id === "STD-PATTERN-NETWORK-WRITE" && item.passed === false; }));

      const actualPhase2Source = [
        "function sourceName(item) {",
        "  return text(item && (item.fileName || item.name || item.path), \"unknown\").replace(/^\\.\\//, \"\");",
        "}",
        "function dryRunCaller(item) { return sourceName(item); }"
      ].join("\n");
      const governedDryRun = global.runStandardAutoRefactoringDryRun({
        sources: [
          { fileName: "13_auto_refactoring_phase2.js", code: actualPhase2Source },
          { fileName: "dry-run-consumer.js", code: "function anotherDryRunCaller(item) { return sourceName(item); }" }
        ],
        actor: "Validator"
      });
      check("Actual-project Governed Dry Run", governedDryRun.completed === true && governedDryRun.status === "Dry Run Passed");
      check("Dry Run repository remains unchanged", governedDryRun.repositoryMutation === false && governedDryRun.repositoryWriteCount === 0 && governedDryRun.sourceUnchanged === true);
      check("Dry Run Patch and Sandbox", governedDryRun.patch && governedDryRun.patch.verified === true && governedDryRun.sandbox && governedDryRun.sandbox.passed === true);
      check("Dry Run remains unapproved and unapplied", governedDryRun.approvalRequested === false && governedDryRun.applicationAttempted === false && governedDryRun.patch.autoApply === false);
      check("Dry Run success reason is empty", governedDryRun.reason === "");

      const practicalTemplate = global.prepareAutoRefactoringDryRunTemplate({
        sources: [
          { fileName: "13_auto_refactoring_phase2.js", code: actualPhase2Source },
          { fileName: "dry-run-consumer.js", code: "function anotherDryRunCaller(item) { return sourceName(item); }" }
        ],
        targetFile: "13_auto_refactoring_phase2.js",
        targetFunction: "sourceName"
      });
      check("Practical Dry Run template", practicalTemplate.prepared === true && practicalTemplate.requiresManualChange === true && practicalTemplate.beforeFunctionSource.includes("function sourceName"));
      const practicalAfter = [
        "function sourceName(item) {",
        "  const resolvedName = text(item && (item.fileName || item.name || item.path), \"unknown\");",
        "  return resolvedName.replace(/^\\.\\//, \"\");",
        "}"
      ].join("\n");
      const practicalDryRun = global.runPracticalAutoRefactoringDryRun({
        sources: [
          { fileName: "13_auto_refactoring_phase2.js", code: actualPhase2Source },
          { fileName: "dry-run-consumer.js", code: "function anotherDryRunCaller(item) { return sourceName(item); }" }
        ],
        targetFile: "13_auto_refactoring_phase2.js",
        targetFunction: "sourceName",
        beforeFunctionSource: practicalTemplate.beforeFunctionSource,
        afterFunctionSource: practicalAfter,
        actor: "Validator"
      });
      check("Practical manual Before/After Dry Run", practicalDryRun.completed === true && practicalDryRun.reason === "" && practicalDryRun.mode === "Manual Before/After Read-only Dry Run");
      check("Practical Dry Run exposes source and diff", Boolean(practicalDryRun.candidateInput && practicalDryRun.candidateInput.beforeFunctionSource && practicalDryRun.candidateInput.afterFunctionSource && practicalDryRun.diff && practicalDryRun.diff.changedLines > 0));
      check("Practical Dry Run exposes dependency impact", Boolean(practicalDryRun.dependencyImpact && practicalDryRun.dependencyImpact.passed === true && practicalDryRun.dependencyImpact.inboundReferences.length === 2));
      check("Practical Dry Run exposes policy rules", Boolean(practicalDryRun.policyEvaluation && practicalDryRun.policyEvaluation.allowed === true && practicalDryRun.policyEvaluation.passedRules === 21));
      check("Practical Dry Run remains read-only", practicalDryRun.repository && practicalDryRun.repository.mutation === false && practicalDryRun.repository.writeCount === 0 && practicalDryRun.repository.sourceUnchanged === true);
      const practicalMismatch = global.runPracticalAutoRefactoringDryRun({
        sources: [{ fileName: "13_auto_refactoring_phase2.js", code: actualPhase2Source }],
        targetFile: "13_auto_refactoring_phase2.js",
        targetFunction: "sourceName",
        beforeFunctionSource: "function sourceName(item) { return 'stale'; }",
        afterFunctionSource: practicalAfter
      });
      check("Practical Dry Run concurrent-change guard", practicalMismatch.completed === false && practicalMismatch.status === "Concurrent Change Detected" && practicalMismatch.repositoryWriteCount === 0);
      const controlledValidation = global.validateControlledAutoRefactoringApplication();
      (controlledValidation.checks || []).forEach(function addControlledCheck(item) {
        check("Controlled Application: " + item.name, item.passed === true, item.detail);
      });
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
    restoreMap(state.dependencyAnalyses, beforeState.dependencyAnalyses);
    restoreMap(state.patches, beforeState.patches);
    restoreMap(state.policyDecisions, beforeState.policyDecisions);
    state.history = asArray(beforeState.history).slice(-MAX_HISTORY);
    state.sequence = beforeState.sequence;
    state.lastPersistence = clone(beforeState.lastPersistence);
    state.lastCoreValidation = clone(beforeState.lastCoreValidation);
    state.lastIntegrationValidation = clone(beforeState.lastIntegrationValidation);
    state.lastError = clone(beforeState.lastError);
    state.updatedAt = beforeState.updatedAt;
    persistAutoRefactoringState();

    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return {
      id: "IDE-150-DEEP-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      mode: "Explicit Deep Transaction Validation",
      valid: checks.length > 0 && passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      checks: checks,
      durationMs: Math.round((clockNow() - startedAt) * 1000) / 1000,
      validatedAt: nowIso()
    };
  }

  function validateAutoRefactoring(options) {
    const settings = options && typeof options === "object" ? options : {};
    return settings.deep === true ? validateAutoRefactoringDeep() : validateAutoRefactoringLightweight();
  }

  function getAutoRefactoringStatus() {
    const validation = state.lastCoreValidation;
    const integration = state.lastIntegrationValidation;
    const validationReady = !validation || validation.valid === true;
    const integrationReady = !integration || integration.valid === true;
    const latestRequest = lastMapValue(state.requests);
    const latestCandidate = lastMapValue(state.candidates);
    const latestTransaction = lastMapValue(state.transactions);
    return {
      id: COMPONENT_ID,
      title: "Auto Refactoring",
      name: "Auto Refactoring",
      version: VERSION,
      status: validationReady && integrationReady ? "Ready" : "Attention",
      lifecycleStatus: "Implementation",
      implementationPhase: "Controlled Application Trial",
      phaseStatus: validationReady ? "Completed" : "Attention",
      ready: validationReady && integrationReady,
      health: Math.min(validation ? validation.health : 100, integrationReady ? 100 : 0),
      progress: 90,
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
      dependencyAnalysisCount: state.dependencyAnalyses.size,
      governedPatchCount: state.patches.size,
      policyDecisionCount: state.policyDecisions.size,
      latestRequest: compactRequest(latestRequest),
      latestCandidate: compactCandidate(latestCandidate),
      latestTransaction: compactTransaction(latestTransaction),
      officialInput: "Published IDE-140 Analytics Handoff",
      handoffContract: {
        retrievalApi: "getPublishedAnalyticsHandoffs (Compact by default)",
        detailApi: "getPublishedAnalyticsHandoffDetail(id, { hydrate: true })",
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
        policyMode: "External Policy Platform + Fail-Closed Core Policy",
        fullDependencyAnalysis: true,
        governedPatchRequiredForPhase2: true,
        externalPolicyFailClosed: true,
        statusApiLightweight: true,
        validationDefaultLightweight: true,
        handoffSummaryHydration: false,
        compactLifecyclePersistence: true,
        separatedDetailArtifacts: true
      },
      validation: clone(validation || { status: "Not Run", valid: null, mode: "Lightweight Structural Validation" }),
      integrationValidation: clone(integration || { status: "Not Run", valid: null, mode: "Lightweight Compact Contract", runtimeHandoffCount: 0 }),
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
        "Implementation Package",
        "Governed Patch Generation",
        "Full Dependency Analysis",
        "External Policy Platform Adapter",
        "Standard Fail-Closed Policy Adapter",
        "Read-only Governed Patch Dry Run",
        "Manual Before/After Practical Dry Run",
        "Two-step Explicit Controlled Approval",
        "Temporary Runtime Project Application",
        "Post-Application Validation",
        "Mandatory Automatic Rollback",
        "Controlled Application Approval UI"
      ],
      corePhase2: typeof global.getAutoRefactoringPhase2Status === "function" ? global.getAutoRefactoringPhase2Status() : { status: "Unavailable" },
      controlledApplication: typeof global.getControlledAutoRefactoringApplicationStatus === "function" ? global.getControlledAutoRefactoringApplicationStatus() : { status: "Unavailable" },
      fullDesignFreezeCompleted: false,
      designFreezeCompliance: "Partial - Controlled Application Trial Completed; Persistent Commit Disabled",
      nextTask: "Implement an explicit persistent Commit Gate, durable Project Package write workflow and post-reload verification. Keep automatic application prohibited.",
      lastError: clone(state.lastError),
      updatedAt: nowIso()
    };
  }

  async function validateAutoRefactoringRuntime(options) {
    const settings = options && typeof options === "object" ? options : {};
    let sourceLoad = {
      ready: false,
      loadedNow: false,
      sourceCount: 0,
      failedFileCount: 0,
      failedFiles: [],
      reason: "Current Project source loader is unavailable."
    };

    if (typeof global.ensureCurrentProjectAnalyzeSources === "function") {
      const loaded = await global.ensureCurrentProjectAnalyzeSources({ silent: settings.silent !== false });
      sourceLoad = {
        ready: Boolean(loaded && loaded.ready),
        loadedNow: Boolean(loaded && loaded.loadedNow),
        sourceCount: Number(loaded && loaded.sourceCount) || 0,
        failedFileCount: Number(loaded && loaded.failedFileCount) || 0,
        failedFiles: clone(loaded && loaded.failedFiles || []),
        reason: loaded && loaded.reason ? String(loaded.reason) : ""
      };
    }

    if (!sourceLoad.ready) {
      return {
        valid: false,
        status: "Blocked",
        reason: sourceLoad.reason || "Current Project sources are unavailable.",
        sourceLoad: sourceLoad,
        lightweight: null,
        deep: null,
        controlled: null
      };
    }

    const lightweight = validateAutoRefactoring();
    const deep = validateAutoRefactoring({ deep: true });
    const controlled = typeof global.validateControlledAutoRefactoringApplication === "function"
      ? global.validateControlledAutoRefactoringApplication()
      : { valid: false, passed: 0, failed: 1, total: 1, health: 0, reason: "Controlled Application validator is unavailable." };

    return {
      valid: lightweight.valid === true && deep.valid === true && controlled.valid === true,
      status: lightweight.valid === true && deep.valid === true && controlled.valid === true ? "Ready" : "Failed",
      reason: "",
      sourceLoad: sourceLoad,
      lightweight: lightweight,
      deep: deep,
      controlled: controlled,
      validatedAt: nowIso()
    };
  }

  const validationApi = {
    validateIDE140ToIDE150Integration: validateIDE140ToIDE150Integration,
    validateAutoRefactoring: validateAutoRefactoring,
    validateAutoRefactoringDeep: validateAutoRefactoringDeep,
    validateAutoRefactoringRuntime: validateAutoRefactoringRuntime,
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
      summary: "Evidence-based function-level Repository modification with governed Patch, full Dependency Analysis, external Policy decision, Preview, Sandbox, Approval, Validation and Rollback.",
      icon: "🛠️",
      version: VERSION,
      status: "Controlled Application Trial Completed",
      ready: true,
      progress: 90,
      health: 100,
      validator: "validateAutoRefactoring",
      probe: "getAutoRefactoringStatus",
      category: "Development IDE"
    });
  }
})(typeof window !== "undefined" ? window : globalThis);