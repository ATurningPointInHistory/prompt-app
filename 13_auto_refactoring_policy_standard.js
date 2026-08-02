/* ============================================================
   FILE: 13_auto_refactoring_policy_standard.js
   IDE-150 Standard Policy Adapter / Governed Dry Run
   Version: 1.1.1
   Status: Completed

   Responsibilities:
   - Independent fail-closed standard Policy Adapter
   - Deterministic function-level safety rules
   - Actual-project read-only Governed Patch Dry Run
   ============================================================ */
(function (global) {
  "use strict";

  const internal = global.__IDE150AutoRefactoringInternal;
  const phase2 = global.__IDE150AutoRefactoringPhase2Internal;
  if (!internal || !phase2) throw new Error("IDE-150 Core Phase 2 must be loaded before Standard Policy Adapter.");

  const COMPONENT_ID = internal.COMPONENT_ID;
  const VERSION = internal.VERSION;
  const ADAPTER_ID = "AI-PROMPT-OS-STANDARD-REFACTORING-POLICY";
  const ADAPTER_VERSION = "1.1.1";
  const POLICY_VERSION = "IDE-150-STANDARD-POLICY-v1.1.1";
  const DRY_RUN_STORAGE_KEY = "AI_PROMPT_OS_IDE150_STANDARD_DRY_RUN_V1";
  const PRACTICAL_DRY_RUN_VERSION = "1.0.1";
  const nowIso = internal.nowIso;
  const clone = internal.clone;
  const text = internal.text;
  const finite = internal.finite;
  const unique = internal.unique;
  const findFunctionBlock = internal.findFunctionBlock;
  const hashText = internal.hashText;

  const RISK_ORDER = Object.freeze({ Low: 0, Medium: 1, High: 2, Critical: 3 });
  const DEFAULT_CONFIG = Object.freeze({
    maxRiskLevel: "Medium",
    maxChangedLines: 40,
    maxInboundReferences: 50,
    maxImpactedFiles: 12,
    maxAddedCallees: 4,
    maxGlobalExposureCount: 2,
    requireDependencyPassed: true,
    requireUniqueDefinition: true,
    requireExplicitApproval: true,
    requireRollback: true,
    prohibitAutoApply: true,
    prohibitTruncatedDiff: true,
    disallowedAddedPatterns: [
      { id: "DYNAMIC-EVAL", label: "Dynamic evaluation", pattern: "\\beval\\s*\\(|\\bnew\\s+Function\\s*\\(|\\bFunction\\s*\\(" },
      { id: "NETWORK-WRITE", label: "Network side effect", pattern: "\\bfetch\\s*\\(|\\bXMLHttpRequest\\b|\\bWebSocket\\s*\\(|\\bnavigator\\.sendBeacon\\s*\\(" },
      { id: "PERSISTENT-WRITE", label: "Persistent storage write", pattern: "\\blocalStorage\\.setItem\\s*\\(|\\bsessionStorage\\.setItem\\s*\\(|\\bindexedDB\\.open\\s*\\(" },
      { id: "DYNAMIC-IMPORT", label: "Dynamic code loading", pattern: "\\bimport\\s*\\(|\\bimportScripts\\s*\\(|\\bWorker\\s*\\(" },
      { id: "UNSAFE-DOM-WRITE", label: "Unsafe DOM write", pattern: "\\bdocument\\.write\\s*\\(|\\.innerHTML\\s*=|\\.outerHTML\\s*=" },
      { id: "NAVIGATION-SIDE-EFFECT", label: "Navigation side effect", pattern: "\\blocation\\.(?:href|assign|replace)\\s*(?:=|\\()|\\bwindow\\.open\\s*\\(" }
    ]
  });

  let config = normalizeConfig(DEFAULT_CONFIG);
  let installedAt = "";
  let lastEvaluation = null;
  let lastDryRun = loadLastDryRun();

  function loadLastDryRun() {
    try {
      if (!global.localStorage) return null;
      const raw = global.localStorage.getItem(DRY_RUN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function persistLastDryRun(summary) {
    try {
      if (!global.localStorage) return { persisted: false, reason: "localStorage unavailable" };
      global.localStorage.setItem(DRY_RUN_STORAGE_KEY, JSON.stringify(summary));
      return { persisted: true, storageKey: DRY_RUN_STORAGE_KEY };
    } catch (error) {
      return { persisted: false, storageKey: DRY_RUN_STORAGE_KEY, error: error && error.message ? error.message : String(error) };
    }
  }

  function normalizeRisk(value) {
    const risk = text(value, "Medium");
    return Object.prototype.hasOwnProperty.call(RISK_ORDER, risk) ? risk : "Medium";
  }

  function normalizePattern(item) {
    const source = item && typeof item === "object" ? item : {};
    return {
      id: text(source.id, "RULE-PATTERN"),
      label: text(source.label, source.id || "Disallowed pattern"),
      pattern: text(source.pattern, "")
    };
  }

  function normalizeConfig(input) {
    const source = input && typeof input === "object" ? input : {};
    return {
      maxRiskLevel: normalizeRisk(source.maxRiskLevel || DEFAULT_CONFIG.maxRiskLevel),
      maxChangedLines: Math.max(1, finite(source.maxChangedLines, DEFAULT_CONFIG.maxChangedLines)),
      maxInboundReferences: Math.max(0, finite(source.maxInboundReferences, DEFAULT_CONFIG.maxInboundReferences)),
      maxImpactedFiles: Math.max(1, finite(source.maxImpactedFiles, DEFAULT_CONFIG.maxImpactedFiles)),
      maxAddedCallees: Math.max(0, finite(source.maxAddedCallees, DEFAULT_CONFIG.maxAddedCallees)),
      maxGlobalExposureCount: Math.max(0, finite(source.maxGlobalExposureCount, DEFAULT_CONFIG.maxGlobalExposureCount)),
      requireDependencyPassed: source.requireDependencyPassed !== false,
      requireUniqueDefinition: source.requireUniqueDefinition !== false,
      requireExplicitApproval: source.requireExplicitApproval !== false,
      requireRollback: source.requireRollback !== false,
      prohibitAutoApply: source.prohibitAutoApply !== false,
      prohibitTruncatedDiff: source.prohibitTruncatedDiff !== false,
      disallowedAddedPatterns: (Array.isArray(source.disallowedAddedPatterns)
        ? source.disallowedAddedPatterns
        : DEFAULT_CONFIG.disallowedAddedPatterns).map(normalizePattern).filter(function valid(item) { return item.pattern; })
    };
  }

  function addRule(rules, id, name, passed, severity, detail) {
    rules.push({
      id: id,
      name: name,
      passed: passed === true,
      severity: text(severity, "Critical"),
      detail: text(detail, "")
    });
  }

  function addedDiffText(diff) {
    return String(diff && diff.text || "")
      .split("\n")
      .filter(function added(line) { return line.startsWith("+") && !line.startsWith("+++"); })
      .map(function strip(line) { return line.slice(1); })
      .join("\n");
  }

  function evaluateStandardAutoRefactoringPolicy(context, options) {
    const source = context && typeof context === "object" ? context : {};
    const settings = normalizeConfig(Object.assign({}, config, options && options.config));
    const plan = source.plan && typeof source.plan === "object" ? source.plan : {};
    const diff = source.diff && typeof source.diff === "object" ? source.diff : {};
    const dependency = source.dependencyAnalysis && typeof source.dependencyAnalysis === "object" ? source.dependencyAnalysis : {};
    const riskLevel = normalizeRisk(source.riskLevel || dependency.riskLevel);
    const rules = [];
    const changedLineLimit = Math.min(settings.maxChangedLines, Math.max(1, finite(plan.budget && plan.budget.changedLineLimit, settings.maxChangedLines)));
    const inboundCount = finite(dependency.summary && dependency.summary.inboundReferenceCount, Array.isArray(dependency.inboundReferences) ? dependency.inboundReferences.length : 0);
    const impactedFileCount = finite(dependency.summary && dependency.summary.impactedFileCount, Array.isArray(dependency.impactedFiles) ? dependency.impactedFiles.length : 0);
    const addedCalleeCount = finite(dependency.summary && dependency.summary.addedCalleeCount, Array.isArray(dependency.addedCallees) ? dependency.addedCallees.length : 0);
    const globalExposureCount = finite(dependency.summary && dependency.summary.globalExposureCount, Array.isArray(dependency.globalExposure) ? dependency.globalExposure.length : 0);
    const definitions = Array.isArray(dependency.definitions) ? dependency.definitions.length : 0;
    const addedText = addedDiffText(diff);

    addRule(rules, "STD-001", "Core Phase 2 context", source.phase === "Core Phase 2", "Critical", "phase=" + text(source.phase, "Unknown"));
    addRule(rules, "STD-002", "Single JavaScript function scope", Boolean(plan.targetFile && /\.js$/i.test(plan.targetFile) && plan.targetFunction && plan.budget && plan.budget.fileLimit === 1 && plan.budget.functionLimit === 1), "Critical", text(plan.targetFile, "") + "#" + text(plan.targetFunction, ""));
    addRule(rules, "STD-003", "Supported operation", plan.operation === "Replace Existing Function", "Critical", text(plan.operation, "Unknown"));
    addRule(rules, "STD-004", "Dependency Analysis passed", settings.requireDependencyPassed ? dependency.passed === true && dependency.status === "Passed" : true, "Critical", "status=" + text(dependency.status, "Unknown"));
    addRule(rules, "STD-005", "Unique target definition", settings.requireUniqueDefinition ? definitions === 1 : true, "Critical", "definitions=" + definitions);
    addRule(rules, "STD-006", "Risk threshold", RISK_ORDER[riskLevel] <= RISK_ORDER[settings.maxRiskLevel], "Critical", "risk=" + riskLevel + ", max=" + settings.maxRiskLevel);
    addRule(rules, "STD-007", "Changed-line budget", finite(diff.changedLines, 0) > 0 && finite(diff.changedLines, 0) <= changedLineLimit, "Critical", "changed=" + finite(diff.changedLines, 0) + ", limit=" + changedLineLimit);
    addRule(rules, "STD-008", "Complete diff", settings.prohibitTruncatedDiff ? diff.truncated !== true : true, "Critical", "truncated=" + String(diff.truncated === true));
    addRule(rules, "STD-009", "Inbound reference budget", inboundCount <= settings.maxInboundReferences, "High", "references=" + inboundCount + ", limit=" + settings.maxInboundReferences);
    addRule(rules, "STD-010", "Impacted-file budget", impactedFileCount <= settings.maxImpactedFiles, "High", "files=" + impactedFileCount + ", limit=" + settings.maxImpactedFiles);
    addRule(rules, "STD-011", "Added-callee budget", addedCalleeCount <= settings.maxAddedCallees, "High", "added=" + addedCalleeCount + ", limit=" + settings.maxAddedCallees);
    addRule(rules, "STD-012", "Global-exposure budget", globalExposureCount <= settings.maxGlobalExposureCount, "High", "exposures=" + globalExposureCount + ", limit=" + settings.maxGlobalExposureCount);
    addRule(rules, "STD-013", "Explicit approval remains required", settings.requireExplicitApproval ? plan.explicitApprovalRequired === true : true, "Critical", "required=" + String(plan.explicitApprovalRequired === true));
    addRule(rules, "STD-014", "Rollback remains required", settings.requireRollback ? plan.rollbackRequired === true : true, "Critical", "required=" + String(plan.rollbackRequired === true));
    addRule(rules, "STD-015", "Auto-apply prohibited", settings.prohibitAutoApply ? plan.autoApply === false : true, "Critical", "autoApply=" + String(plan.autoApply === true));

    settings.disallowedAddedPatterns.forEach(function inspect(item) {
      let matched = false;
      try { matched = new RegExp(item.pattern, "i").test(addedText); }
      catch (_) { matched = true; }
      addRule(rules, "STD-PATTERN-" + item.id, "No added " + item.label, matched === false, "Critical", matched ? "Disallowed pattern detected in added lines." : "Not detected");
    });

    const failedRules = rules.filter(function failed(item) { return !item.passed; });
    const result = {
      allowed: failedRules.length === 0,
      status: failedRules.length === 0 ? "Allowed" : "Denied",
      reason: failedRules.length === 0
        ? "AI Prompt OS Standard Policy allowed the governed function change."
        : "Standard Policy denied the change: " + failedRules.map(function name(item) { return item.id; }).join(", "),
      policyId: ADAPTER_ID,
      policyVersion: POLICY_VERSION,
      riskLevel: riskLevel,
      rules: rules,
      summary: {
        passed: rules.length - failedRules.length,
        failed: failedRules.length,
        total: rules.length,
        criticalFailures: failedRules.filter(function critical(item) { return item.severity === "Critical"; }).length
      },
      evaluatedAt: nowIso()
    };
    lastEvaluation = clone(result);
    return result;
  }

  function createStandardAutoRefactoringPolicyAdapter(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (settings.config) config = normalizeConfig(Object.assign({}, config, settings.config));
    return {
      id: ADAPTER_ID,
      componentId: ADAPTER_ID,
      name: "AI Prompt OS Standard Refactoring Policy",
      version: ADAPTER_VERSION,
      mode: "Independent Deterministic Fail-Closed Policy Adapter",
      evaluate: function evaluate(context) {
        return evaluateStandardAutoRefactoringPolicy(context);
      }
    };
  }

  function installStandardAutoRefactoringPolicyAdapter(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (typeof global.registerAutoRefactoringPolicyAdapter !== "function") {
      return { installed: false, reason: "Core Phase 2 Policy Adapter API is unavailable." };
    }
    const adapter = createStandardAutoRefactoringPolicyAdapter(settings);
    const registration = global.registerAutoRefactoringPolicyAdapter(adapter, { active: settings.active !== false });
    if (registration && registration.registered) installedAt = nowIso();
    return {
      installed: Boolean(registration && registration.registered),
      adapter: registration && registration.adapter,
      policyVersion: POLICY_VERSION,
      config: clone(config),
      installedAt: installedAt,
      reason: registration && registration.reason
    };
  }

  function setStandardAutoRefactoringPolicyConfig(input) {
    config = normalizeConfig(Object.assign({}, config, input && typeof input === "object" ? input : {}));
    const installed = installStandardAutoRefactoringPolicyAdapter({ active: true });
    return { updated: installed.installed === true, config: clone(config), adapter: installed.adapter };
  }

  function getStandardAutoRefactoringPolicyStatus() {
    const adapterStatus = typeof global.getAutoRefactoringPolicyAdapterStatus === "function"
      ? global.getAutoRefactoringPolicyAdapterStatus()
      : { available: false, adapters: [] };
    const record = (adapterStatus.adapters || []).find(function find(item) { return item.id === ADAPTER_ID; }) || null;
    return {
      componentId: ADAPTER_ID,
      version: ADAPTER_VERSION,
      policyVersion: POLICY_VERSION,
      status: record ? "Ready" : "Not Installed",
      installed: Boolean(record),
      active: Boolean(record && record.active),
      failClosed: true,
      networkRequired: false,
      deterministic: true,
      config: clone(config),
      lastEvaluation: clone(lastEvaluation),
      lastDryRun: clone(lastDryRun),
      installedAt: installedAt
    };
  }

  function defaultAfterFunction(targetFile, targetFunction, beforeFunction) {
    if (targetFile === "13_auto_refactoring_phase2.js" && targetFunction === "sourceName") {
      return [
        "function sourceName(item) {",
        "    const resolvedName = text(item && (item.fileName || item.name || item.path), \"unknown\");",
        "    return resolvedName.replace(/^\\.\\//, \"\");",
        "  }"
      ].join("\n");
    }
    return beforeFunction;
  }

  function runStandardAutoRefactoringDryRun(options) {
    const startedAt = global.performance && typeof global.performance.now === "function" ? global.performance.now() : Date.now();
    const settings = options && typeof options === "object" ? options : {};
    const targetFile = text(settings.targetFile, "13_auto_refactoring_phase2.js");
    const targetFunction = text(settings.targetFunction, "sourceName");
    const sources = phase2.resolveProjectSources(settings);
    if (!sources.length) return { completed: false, reason: "Project sources are unavailable. Dry Run is fail-closed." };
    const file = sources.find(function find(item) { return item.fileName === targetFile || item.fileName.endsWith("/" + targetFile); });
    if (!file) return { completed: false, reason: "Dry Run target file is unavailable.", targetFile: targetFile };
    const block = findFunctionBlock(file.code, targetFunction);
    if (!block) return { completed: false, reason: "Dry Run target function is unavailable.", targetFunction: targetFunction };
    const beforeFunction = block.block.trim();
    const afterFunction = text(settings.afterFunctionSource, defaultAfterFunction(targetFile, targetFunction, beforeFunction));
    if (afterFunction === beforeFunction) return { completed: false, reason: "Dry Run replacement must differ from the current function." };

    const policyStatus = getStandardAutoRefactoringPolicyStatus();
    if (!policyStatus.installed || !policyStatus.active) {
      const install = installStandardAutoRefactoringPolicyAdapter({ active: true });
      if (!install.installed) return { completed: false, reason: install.reason || "Standard Policy Adapter installation failed." };
    }

    const requestResult = global.createAutoRefactoringRequest({
      sourceType: "IDE-150 Governed Patch Dry Run",
      recommendationId: text(settings.recommendationId, "IDE-150-DRYRUN-SOURCE-NAME-CLARITY"),
      recommendationSummary: text(settings.recommendationSummary, "Clarify local name normalization without changing behavior."),
      evidenceReferences: unique(settings.evidenceReferences || ["IDE-150-CORE-PHASE2-v1.1.0", "IDE-140-PUBLISHED-HANDOFF"]),
      confidence: finite(settings.confidence, 0.95),
      riskLevel: text(settings.riskLevel, "Low"),
      requestedBy: text(settings.actor, "Project Owner")
    });
    if (!requestResult.created) return { completed: false, stage: "Request", reason: requestResult.reason };

    const scopeResult = global.defineAutoRefactoringScope(requestResult.request.id, {
      targetFile: targetFile,
      targetFunction: targetFunction,
      repositoryVersion: text(settings.repositoryVersion, "current-project"),
      actor: text(settings.actor, "Project Owner")
    });
    if (!scopeResult.scoped) return { completed: false, stage: "Scope", reason: scopeResult.reason };

    const planResult = global.createGovernedAutoRefactoringPlan(requestResult.request.id, {
      objective: text(settings.objective, "Create a behavior-preserving function-level clarity patch."),
      policyAdapterId: ADAPTER_ID,
      dependencyReferences: unique(settings.dependencyReferences || []),
      budget: settings.budget || {},
      actor: text(settings.actor, "Project Owner")
    });
    if (!planResult.created) return { completed: false, stage: "Plan", reason: planResult.reason };

    const candidateResult = global.createGovernedAutoRefactoringCandidate(planResult.plan.id, {
      beforeFunctionSource: beforeFunction,
      afterFunctionSource: afterFunction,
      riskLevel: text(settings.riskLevel, "Low"),
      actor: text(settings.actor, "Project Owner")
    }, { sources: sources });
    if (!candidateResult.created) return { completed: false, stage: "Candidate", reason: candidateResult.reason, dependency: candidateResult.dependency, policyDecision: candidateResult.policyDecision };

    const patchResult = global.generateAutoRefactoringPatch(candidateResult.candidate.id, { actor: text(settings.actor, "Project Owner") });
    if (!patchResult.generated) return { completed: false, stage: "Patch", reason: patchResult.reason };

    let repositoryWriteCount = 0;
    const readOnlyRepository = {
      name: "IDE-150 Dry Run Read-only Repository Adapter",
      getFileText: function getFileText(fileName) {
        const source = sources.find(function find(item) { return item.fileName === fileName || item.fileName.endsWith("/" + fileName); });
        return source ? source.code : null;
      },
      setFileText: function setFileText() {
        repositoryWriteCount += 1;
        return false;
      }
    };
    const beforeFileHash = hashText(file.code);
    const verification = global.verifyAutoRefactoringPatch(patchResult.patch.id, { adapter: readOnlyRepository });
    if (!verification.verified) return { completed: false, stage: "Patch Verification", reason: "Governed Patch verification failed.", verification: verification.verification };
    const sandbox = global.runAutoRefactoringSandbox(candidateResult.candidate.id, { adapter: readOnlyRepository });
    if (!sandbox.passed) return { completed: false, stage: "Sandbox", reason: sandbox.reason || "Sandbox failed.", validation: sandbox.validation };
    const afterFileHash = hashText(file.code);
    const policyDecision = candidateResult.policyDecision || {};
    const dependency = candidateResult.dependencyAnalysis || {};
    const patch = verification.patch || patchResult.patch;
    const result = {
      id: "IDE-150-STANDARD-DRY-RUN-" + String(Date.now()),
      componentId: COMPONENT_ID,
      version: VERSION,
      standardPolicyVersion: POLICY_VERSION,
      completed: true,
      status: "Dry Run Passed",
      reason: "",
      mode: settings.afterFunctionSource ? "Manual Before/After Read-only Dry Run" : "Standard Read-only Governed Patch Dry Run",
      manualCandidate: Boolean(settings.afterFunctionSource),
      repositoryMutation: false,
      repositoryWriteCount: repositoryWriteCount,
      sourceUnchanged: beforeFileHash === afterFileHash,
      applicationAttempted: false,
      approvalRequested: false,
      target: { file: targetFile, function: targetFunction },
      request: { id: requestResult.request.id, status: requestResult.request.status },
      plan: { id: planResult.plan.id, governanceMode: planResult.plan.governanceMode, policyAdapterId: planResult.plan.externalPolicyAdapter },
      dependencyAnalysis: {
        id: dependency.id,
        status: dependency.status,
        riskLevel: dependency.riskLevel,
        inboundReferenceCount: dependency.summary && dependency.summary.inboundReferenceCount,
        impactedFileCount: dependency.summary && dependency.summary.impactedFileCount,
        addedCallees: clone(dependency.addedCallees || []),
        removedCallees: clone(dependency.removedCallees || [])
      },
      policyDecision: {
        id: policyDecision.id,
        adapterId: policyDecision.adapterId,
        status: policyDecision.status,
        allowed: policyDecision.allowed,
        reason: policyDecision.reason,
        passedRules: policyDecision.rules ? policyDecision.rules.filter(function pass(item) { return item.passed; }).length : 0,
        failedRules: policyDecision.rules ? policyDecision.rules.filter(function fail(item) { return !item.passed; }).map(function id(item) { return item.id; }) : []
      },
      patch: {
        id: patch.id,
        status: patch.status,
        verified: patch.status === "Verified",
        beforeHash: patch.preconditions && patch.preconditions.beforeFunctionHash,
        afterHash: patch.postconditions && patch.postconditions.afterFunctionHash,
        changedLines: candidateResult.candidate.diff && candidateResult.candidate.diff.changedLines,
        autoApply: patch.autoApply === true,
        diff: clone(candidateResult.candidate.diff)
      },
      sandbox: {
        passed: sandbox.passed,
        health: sandbox.validation && sandbox.validation.health,
        passedChecks: sandbox.validation && sandbox.validation.passedChecks,
        failedChecks: sandbox.validation && sandbox.validation.failedChecks
      },
      safety: {
        failClosedPolicy: true,
        fullDependencyAnalysis: dependency.status === "Passed",
        explicitApprovalRequired: true,
        rollbackRequired: true,
        repositoryWriteProhibited: true,
        autoApplyProhibited: patch.autoApply !== true
      },
      persistence: clone(internal.state.lastPersistence),
      executionMs: Math.round((((global.performance && typeof global.performance.now === "function" ? global.performance.now() : Date.now()) - startedAt) * 1000)) / 1000,
      completedAt: nowIso()
    };
    lastDryRun = {
      id: result.id,
      status: result.status,
      reason: "",
      mode: result.mode,
      manualCandidate: result.manualCandidate === true,
      target: clone(result.target),
      repositoryMutation: result.repositoryMutation,
      repositoryWriteCount: result.repositoryWriteCount,
      sourceUnchanged: result.sourceUnchanged,
      dependencyAnalysisId: result.dependencyAnalysis && result.dependencyAnalysis.id,
      policyDecisionId: result.policyDecision && result.policyDecision.id,
      patchId: result.patch && result.patch.id,
      patchVerified: result.patch && result.patch.verified === true,
      sandboxPassed: result.sandbox && result.sandbox.passed === true,
      executionMs: result.executionMs,
      completedAt: result.completedAt
    };
    result.dryRunPersistence = persistLastDryRun(lastDryRun);
    return result;
  }


  function countLines(value) {
    return String(value == null ? "" : value).replace(/\r\n/g, "\n").split("\n").length;
  }

  function resolveDryRunTarget(options) {
    const settings = options && typeof options === "object" ? options : {};
    const targetFile = text(settings.targetFile, "13_auto_refactoring_phase2.js");
    const targetFunction = text(settings.targetFunction, "sourceName");
    const sources = phase2.resolveProjectSources(settings);
    if (!sources.length) return { resolved: false, reason: "Project sources are unavailable. Dry Run is fail-closed." };
    const file = sources.find(function find(item) { return item.fileName === targetFile || item.fileName.endsWith("/" + targetFile); });
    if (!file) return { resolved: false, reason: "Dry Run target file is unavailable.", target: { file: targetFile, function: targetFunction } };
    const block = findFunctionBlock(file.code, targetFunction);
    if (!block) return { resolved: false, reason: "Dry Run target function is unavailable.", target: { file: targetFile, function: targetFunction } };
    const beforeFunctionSource = block.block.trim();
    return {
      resolved: true,
      target: { file: targetFile, function: targetFunction },
      sources: sources,
      file: file,
      beforeFunctionSource: beforeFunctionSource,
      beforeHash: hashText(beforeFunctionSource),
      fileHash: hashText(file.code)
    };
  }

  async function ensureDryRunSources(options) {
    const settings = options && typeof options === "object" ? options : {};
    const existing = phase2.resolveProjectSources(settings);
    if (existing.length) {
      return { ready: true, loadedNow: false, sourceCount: existing.length, sources: existing, reason: "" };
    }
    if (typeof global.ensureCurrentProjectAnalyzeSources !== "function") {
      return { ready: false, loadedNow: false, sourceCount: 0, sources: [], reason: "Current Project source loader is unavailable." };
    }
    const loaded = await global.ensureCurrentProjectAnalyzeSources({ silent: true });
    const sources = Array.isArray(loaded && loaded.sources) ? loaded.sources : [];
    return {
      ready: sources.length > 0,
      loadedNow: Boolean(loaded && loaded.loadedNow),
      sourceCount: sources.length,
      sources: sources,
      failedFileCount: finite(loaded && loaded.failedFileCount, 0),
      failedFiles: clone(loaded && loaded.failedFiles || []),
      reason: text(loaded && loaded.reason, sources.length ? "" : "Project sources are unavailable after lazy loading.")
    };
  }

  async function prepareAutoRefactoringDryRunTemplateAsync(options) {
    const settings = options && typeof options === "object" ? options : {};
    const sourceState = await ensureDryRunSources(settings);
    if (!sourceState.ready) {
      return {
        prepared: false,
        status: "Blocked",
        reason: sourceState.reason,
        sourceLoad: sourceState
      };
    }
    const result = prepareAutoRefactoringDryRunTemplate(Object.assign({}, settings, { sources: sourceState.sources }));
    result.sourceLoad = {
      ready: true,
      loadedNow: sourceState.loadedNow,
      sourceCount: sourceState.sourceCount,
      failedFileCount: sourceState.failedFileCount || 0,
      failedFiles: sourceState.failedFiles || []
    };
    return result;
  }

  async function runPracticalAutoRefactoringDryRunAsync(options) {
    const settings = options && typeof options === "object" ? options : {};
    const sourceState = await ensureDryRunSources(settings);
    if (!sourceState.ready) {
      return {
        completed: false,
        status: "Blocked",
        reason: sourceState.reason,
        sourceLoad: sourceState,
        repositoryMutation: false,
        repositoryWriteCount: 0
      };
    }
    const result = runPracticalAutoRefactoringDryRun(Object.assign({}, settings, { sources: sourceState.sources }));
    result.sourceLoad = {
      ready: true,
      loadedNow: sourceState.loadedNow,
      sourceCount: sourceState.sourceCount,
      failedFileCount: sourceState.failedFileCount || 0,
      failedFiles: sourceState.failedFiles || []
    };
    return result;
  }

  function prepareAutoRefactoringDryRunTemplate(options) {
    const resolved = resolveDryRunTarget(options);
    if (!resolved.resolved) return { prepared: false, reason: resolved.reason, target: resolved.target || null };
    return {
      prepared: true,
      status: "Awaiting Manual After Function",
      reason: "",
      mode: "Manual Before/After Read-only Dry Run",
      practicalDryRunVersion: PRACTICAL_DRY_RUN_VERSION,
      target: clone(resolved.target),
      beforeFunctionSource: resolved.beforeFunctionSource,
      beforeHash: resolved.beforeHash,
      beforeLineCount: countLines(resolved.beforeFunctionSource),
      afterFunctionSource: resolved.beforeFunctionSource,
      requiresManualChange: true,
      repositoryMutation: false,
      instructions: [
        "Keep the same target function name.",
        "Edit only afterFunctionSource.",
        "Pass beforeFunctionSource back to enable the concurrent-change guard.",
        "The Dry Run never requests approval or writes to the Repository."
      ]
    };
  }

  function compactDependencyImpact(analysis) {
    const source = analysis && typeof analysis === "object" ? analysis : {};
    return {
      id: source.id,
      status: source.status,
      passed: source.passed === true,
      riskScore: finite(source.riskScore, 0),
      riskLevel: text(source.riskLevel, "Unknown"),
      repositoryFileCount: finite(source.repositoryFileCount, 0),
      definitions: clone(source.definitions || []),
      inboundReferences: clone(source.inboundReferences || []),
      impactedFiles: clone(source.impactedFiles || []),
      outboundBefore: clone(source.outboundBefore || []),
      outboundAfter: clone(source.outboundAfter || []),
      addedCallees: clone(source.addedCallees || []),
      removedCallees: clone(source.removedCallees || []),
      globalExposure: clone(source.globalExposure || []),
      summary: clone(source.summary || {}),
      checks: clone(source.checks || [])
    };
  }

  function runPracticalAutoRefactoringDryRun(options) {
    const settings = options && typeof options === "object" ? options : {};
    const resolved = resolveDryRunTarget(settings);
    if (!resolved.resolved) return { completed: false, status: "Blocked", reason: resolved.reason, target: resolved.target || null };
    const afterFunctionSource = text(settings.afterFunctionSource, "");
    if (!afterFunctionSource) {
      return {
        completed: false,
        status: "Awaiting Manual After Function",
        reason: "afterFunctionSource is required for a Practical Dry Run.",
        template: prepareAutoRefactoringDryRunTemplate(settings)
      };
    }
    const expectedBefore = text(settings.beforeFunctionSource, "");
    if (expectedBefore && expectedBefore.trim() !== resolved.beforeFunctionSource) {
      return {
        completed: false,
        status: "Concurrent Change Detected",
        reason: "beforeFunctionSource does not match the current Project function.",
        target: clone(resolved.target),
        expectedBeforeHash: hashText(expectedBefore.trim()),
        currentBeforeHash: resolved.beforeHash,
        repositoryMutation: false,
        repositoryWriteCount: 0
      };
    }
    if (afterFunctionSource.trim() === resolved.beforeFunctionSource) {
      return {
        completed: false,
        status: "No Change",
        reason: "afterFunctionSource must differ from the current Project function.",
        target: clone(resolved.target),
        repositoryMutation: false,
        repositoryWriteCount: 0
      };
    }

    const result = runStandardAutoRefactoringDryRun(Object.assign({}, settings, {
      sources: resolved.sources,
      targetFile: resolved.target.file,
      targetFunction: resolved.target.function,
      afterFunctionSource: afterFunctionSource,
      recommendationId: text(settings.recommendationId, "IDE-150-PRACTICAL-DRY-RUN"),
      recommendationSummary: text(settings.recommendationSummary, "Manually proposed function-level change candidate."),
      objective: text(settings.objective, "Evaluate the manually supplied Before/After function change without Repository mutation.")
    }));
    if (!result.completed) return result;

    const dependency = typeof global.getAutoRefactoringDependencyAnalysis === "function"
      ? global.getAutoRefactoringDependencyAnalysis(result.dependencyAnalysis && result.dependencyAnalysis.id)
      : null;
    const policyDecision = typeof global.getAutoRefactoringPolicyDecision === "function"
      ? global.getAutoRefactoringPolicyDecision(result.policyDecision && result.policyDecision.id)
      : null;
    const patch = typeof global.getAutoRefactoringPatch === "function"
      ? global.getAutoRefactoringPatch(result.patch && result.patch.id)
      : null;
    const normalizedAfter = patch && patch.replacement && patch.replacement.source
      ? patch.replacement.source
      : afterFunctionSource.trim();
    const diff = patch && patch.replacement && patch.replacement.diff
      ? clone(patch.replacement.diff)
      : clone(result.patch && result.patch.diff);

    return Object.assign({}, result, {
      reason: "",
      mode: "Manual Before/After Read-only Dry Run",
      practicalDryRunVersion: PRACTICAL_DRY_RUN_VERSION,
      manualCandidate: true,
      candidateInput: {
        beforeFunctionSource: resolved.beforeFunctionSource,
        afterFunctionSource: normalizedAfter,
        beforeHash: resolved.beforeHash,
        afterHash: hashText(normalizedAfter),
        beforeLineCount: countLines(resolved.beforeFunctionSource),
        afterLineCount: countLines(normalizedAfter),
        expectedBeforeVerified: expectedBefore ? expectedBefore.trim() === resolved.beforeFunctionSource : true
      },
      diff: diff,
      dependencyImpact: compactDependencyImpact(dependency),
      policyEvaluation: {
        id: policyDecision && policyDecision.id,
        status: policyDecision && policyDecision.status,
        allowed: Boolean(policyDecision && policyDecision.allowed === true),
        reason: text(policyDecision && policyDecision.reason, ""),
        passedRules: policyDecision && policyDecision.rules ? policyDecision.rules.filter(function pass(item) { return item.passed; }).length : 0,
        failedRules: policyDecision && policyDecision.rules ? policyDecision.rules.filter(function fail(item) { return !item.passed; }) : [],
        rules: clone(policyDecision && policyDecision.rules || [])
      },
      repository: {
        mutation: false,
        writeCount: result.repositoryWriteCount,
        sourceUnchanged: result.sourceUnchanged,
        approvalRequested: false,
        applicationAttempted: false
      }
    });
  }

  const originalPhase2Status = global.getAutoRefactoringPhase2Status;
  function getAutoRefactoringPhase2RuntimeStatus() {
    const base = typeof originalPhase2Status === "function" ? originalPhase2Status() : {};
    const standard = getStandardAutoRefactoringPolicyStatus();
    return Object.assign({}, base, {
      phaseVersion: base.phaseVersion || "1.1.0",
      practicalDryRunVersion: PRACTICAL_DRY_RUN_VERSION,
      runtimeReady: standard.installed && standard.active,
      externalPolicyStatus: standard.installed && standard.active ? "Standard Policy Connected" : "Not Connected",
      standardPolicy: {
        id: ADAPTER_ID,
        version: ADAPTER_VERSION,
        policyVersion: POLICY_VERSION,
        installed: standard.installed,
        active: standard.active,
        failClosed: true,
        deterministic: true
      },
      governedDryRun: clone(lastDryRun || { status: "Not Run" }),
      practicalDryRun: {
        version: PRACTICAL_DRY_RUN_VERSION,
        templateApi: "prepareAutoRefactoringDryRunTemplate",
        asyncTemplateApi: "prepareAutoRefactoringDryRunTemplateAsync",
        executionApi: "runPracticalAutoRefactoringDryRun",
        asyncExecutionApi: "runPracticalAutoRefactoringDryRunAsync",
        lazySourceLoading: true,
        manualAfterRequired: true,
        repositoryWriteProhibited: true
      },
      capabilities: unique([].concat(base.capabilities || [], ["Standard Fail-Closed Policy", "Read-only Governed Patch Dry Run", "Manual Before/After Practical Dry Run"])),
      updatedAt: nowIso()
    });
  }

  const api = {
    createStandardAutoRefactoringPolicyAdapter: createStandardAutoRefactoringPolicyAdapter,
    installStandardAutoRefactoringPolicyAdapter: installStandardAutoRefactoringPolicyAdapter,
    setStandardAutoRefactoringPolicyConfig: setStandardAutoRefactoringPolicyConfig,
    getStandardAutoRefactoringPolicyStatus: getStandardAutoRefactoringPolicyStatus,
    evaluateStandardAutoRefactoringPolicy: evaluateStandardAutoRefactoringPolicy,
    prepareAutoRefactoringDryRunTemplate: prepareAutoRefactoringDryRunTemplate,
    prepareAutoRefactoringDryRunTemplateAsync: prepareAutoRefactoringDryRunTemplateAsync,
    runStandardAutoRefactoringDryRun: runStandardAutoRefactoringDryRun,
    runPracticalAutoRefactoringDryRun: runPracticalAutoRefactoringDryRun,
    runPracticalAutoRefactoringDryRunAsync: runPracticalAutoRefactoringDryRunAsync,
    getAutoRefactoringPhase2Status: getAutoRefactoringPhase2RuntimeStatus
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  installStandardAutoRefactoringPolicyAdapter({ active: true });
  global.__IDE150StandardPolicyInternal = {
    adapterId: ADAPTER_ID,
    adapterVersion: ADAPTER_VERSION,
    policyVersion: POLICY_VERSION,
    practicalDryRunVersion: PRACTICAL_DRY_RUN_VERSION,
    dryRunStorageKey: DRY_RUN_STORAGE_KEY,
    defaultConfig: clone(DEFAULT_CONFIG)
  };
  global.IDE150AutoRefactoring = Object.assign(global.IDE150AutoRefactoring || {}, api, {
    standardPolicyAdapterVersion: ADAPTER_VERSION,
    standardPolicyVersion: POLICY_VERSION,
    practicalDryRunVersion: PRACTICAL_DRY_RUN_VERSION
  });
})(typeof window !== "undefined" ? window : globalThis);