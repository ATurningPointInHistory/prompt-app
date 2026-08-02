/* ============================================================
   FILE: 13_auto_refactoring_phase2.js
   IDE-150 Auto Refactoring Core Phase 2
   Version: 1.1.1
   Status: Completed

   Responsibilities:
   - Governed Patch generation
   - Full read-only Dependency Analysis
   - External Policy Platform Adapter contract
   ============================================================ */
(function (global) {
  "use strict";

  const internal = global.__IDE150AutoRefactoringInternal;
  if (!internal) throw new Error("IDE-150 Core must be loaded before Core Phase 2.");

  const COMPONENT_ID = internal.COMPONENT_ID;
  const VERSION = internal.VERSION;
  const PHASE_VERSION = "1.1.1";
  const MAX_RECORDS = internal.MAX_RECORDS;
  const state = internal.state;
  const nowIso = internal.nowIso;
  const asArray = internal.asArray;
  const clone = internal.clone;
  const text = internal.text;
  const finite = internal.finite;
  const unique = internal.unique;
  const nextId = internal.nextId;
  const trimMap = internal.trimMap;
  const hashText = internal.hashText;
  const recordEvent = internal.recordEvent;
  const persistAutoRefactoringState = internal.persistAutoRefactoringState;
  const findFunctionBlock = internal.findFunctionBlock;
  const countFunctionDefinitions = internal.countFunctionDefinitions;
  const getCandidateRecord = internal.getCandidateRecord;
  const getDependencyAnalysisRecord = internal.getDependencyAnalysisRecord;
  const getPatchRecord = internal.getPatchRecord;
  const getPolicyDecisionRecord = internal.getPolicyDecisionRecord;

  const policyAdapters = new Map();
  let activePolicyAdapterId = "";

  function sourceText(item) {
    return String(item && (item.code || item.text || item.content || item.value) || "");
  }

  function sourceName(item) {
    return text(item && (item.fileName || item.name || item.path), "unknown").replace(/^\.\//, "");
  }

  function stripNonExecutableText(code) {
    const source = String(code || "");
    const output = source.split("");
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      const next = source[index + 1];
      if (lineComment) {
        if (char === "\n") lineComment = false;
        else output[index] = " ";
        continue;
      }
      if (blockComment) {
        output[index] = char === "\n" ? "\n" : " ";
        if (char === "*" && next === "/") { output[index + 1] = " "; blockComment = false; index += 1; }
        continue;
      }
      if (quote) {
        output[index] = char === "\n" ? "\n" : " ";
        if (escaped) { escaped = false; continue; }
        if (char === "\\") { escaped = true; continue; }
        if (char === quote) quote = "";
        continue;
      }
      if (char === "/" && next === "/") { output[index] = " "; output[index + 1] = " "; lineComment = true; index += 1; continue; }
      if (char === "/" && next === "*") { output[index] = " "; output[index + 1] = " "; blockComment = true; index += 1; continue; }
      if (char === "\"" || char === "'" || char === "`") { output[index] = " "; quote = char; }
    }
    return output.join("");
  }

  function extractCallsFallback(code) {
    const source = stripNonExecutableText(code);
    const ignore = new Set(["if", "for", "while", "switch", "catch", "function", "return", "typeof", "new", "super", "this", "setTimeout", "setInterval", "Promise", "Array", "Object", "String", "Number", "Boolean", "Date", "Math", "JSON", "RegExp", "Error"]);
    const calls = [];
    const pattern = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      if (!ignore.has(match[1])) calls.push(match[1]);
    }
    return unique(calls);
  }

  function extractCalls(code) {
    const source = String(code || "");
    const safeCalls = extractCallsFallback(source);
    if (safeCalls.length || typeof global.extractCalledFunctions !== "function") return safeCalls;
    try { return unique(global.extractCalledFunctions(source)); }
    catch (_) { return safeCalls; }
  }

  function isExecutableCodePosition(sourceTextValue, position) {
    const source = String(sourceTextValue || "");
    const limit = Math.max(0, Math.min(source.length, finite(position, 0)));
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < limit; index += 1) {
      const char = source[index];
      const next = source[index + 1];
      if (lineComment) {
        if (char === "\n") lineComment = false;
        continue;
      }
      if (blockComment) {
        if (char === "*" && next === "/") { blockComment = false; index += 1; }
        continue;
      }
      if (quote) {
        if (escaped) { escaped = false; continue; }
        if (char === "\\") { escaped = true; continue; }
        if (char === quote) quote = "";
        continue;
      }
      if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
      if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
      if (char === "\"" || char === "'" || char === "`") quote = char;
    }
    return !quote && !lineComment && !blockComment;
  }

  function filterExecutableBlocks(sourceTextValue, blocks) {
    const source = String(sourceTextValue || "");
    return asArray(blocks).filter(function executable(block) {
      const blockText = String(block && (block.code || block.block) || "");
      const start = Number.isFinite(Number(block && block.start))
        ? Number(block.start)
        : source.indexOf(blockText);
      return start >= 0 && isExecutableCodePosition(source, start);
    });
  }

  function extractBlocks(code) {
    const source = String(code || "");
    if (typeof global.extractFunctionBlocksFromText === "function") {
      try { return filterExecutableBlocks(source, global.extractFunctionBlocksFromText(source)); }
      catch (_) {}
    }
    const result = [];
    const names = unique((source.match(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g) || []).map(function (line) {
      const m = /function\s+([A-Za-z_$][\w$]*)/.exec(line); return m ? m[1] : "";
    }));
    names.forEach(function add(name) {
      const block = findFunctionBlock(source, name);
      if (block && isExecutableCodePosition(source, block.start)) result.push({ name: name, start: block.start, end: block.end, block: block.block, code: block.block });
    });
    return result;
  }

  function resolveProjectSources(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (Array.isArray(settings.sources)) {
      return settings.sources.map(function normalize(item) { return { fileName: sourceName(item), code: sourceText(item) }; }).filter(function valid(item) { return item.fileName && item.code; });
    }
    if (settings.adapter && typeof settings.adapter.listFiles === "function" && typeof settings.adapter.getFileText === "function") {
      return asArray(settings.adapter.listFiles()).map(function read(fileName) {
        return { fileName: String(fileName), code: String(settings.adapter.getFileText(fileName) || "") };
      }).filter(function valid(item) { return item.fileName && item.code; });
    }
    if (typeof global.getProjectFiles === "function") {
      try {
        const files = asArray(global.getProjectFiles());
        if (files.length) return files.map(function normalize(item) { return { fileName: sourceName(item), code: sourceText(item) }; }).filter(function valid(item) { return item.fileName && item.code; });
      } catch (_) {}
    }
    if (typeof global.getProjectAnalyzeSources === "function") {
      try {
        const files = asArray(global.getProjectAnalyzeSources("currentProject"));
        if (files.length) return files.map(function normalize(item) { return { fileName: sourceName(item), code: sourceText(item) }; }).filter(function valid(item) { return item.fileName && item.code; });
      } catch (_) {}
    }
    return [];
  }

  function analyzeAutoRefactoringDependencies(planId, options) {
    const plan = state.plans.get(String(planId || ""));
    if (!plan) return { analyzed: false, reason: "Refactoring Plan not found." };
    const request = state.requests.get(plan.requestId);
    const settings = options && typeof options === "object" ? options : {};
    const sources = resolveProjectSources(settings);
    if (!sources.length) return { analyzed: false, reason: "Project sources are unavailable. Full Dependency Analysis is fail-closed." };

    const targetFile = sources.find(function find(item) { return item.fileName === plan.targetFile || item.fileName.endsWith("/" + plan.targetFile); });
    if (!targetFile) return { analyzed: false, reason: "Target file is unavailable in Project sources." };
    const targetBlock = findFunctionBlock(targetFile.code, plan.targetFunction);
    if (!targetBlock || countFunctionDefinitions(targetFile.code, plan.targetFunction) !== 1) {
      return { analyzed: false, reason: "Target function must have exactly one definition in the target file." };
    }

    const candidate = settings.candidateId ? getCandidateRecord(settings.candidateId) : null;
    const beforeFunction = candidate && candidate.beforeFunctionSource
      ? candidate.beforeFunctionSource
      : text(settings.beforeFunctionSource, targetBlock.block.trim());
    const afterFunction = candidate && candidate.afterFunctionSource
      ? candidate.afterFunctionSource
      : text(settings.afterFunctionSource, beforeFunction);
    const outboundBefore = extractCalls(beforeFunction).filter(function exclude(name) { return name !== plan.targetFunction; });
    const outboundAfter = extractCalls(afterFunction).filter(function exclude(name) { return name !== plan.targetFunction; });
    const addedCallees = outboundAfter.filter(function added(name) { return !outboundBefore.includes(name); });
    const removedCallees = outboundBefore.filter(function removed(name) { return !outboundAfter.includes(name); });

    const inboundReferences = [];
    const definitions = [];
    const globalExposure = [];
    const impactedFiles = new Set([plan.targetFile]);

    let candidateFileCount = 0;
    sources.forEach(function scan(file) {
      if (!String(file.code || "").includes(plan.targetFunction)) return;
      candidateFileCount += 1;
      const blocks = extractBlocks(file.code);
      blocks.forEach(function scanBlock(block) {
        const blockCode = String(block.code || block.block || "");
        if (block.name === plan.targetFunction) definitions.push({ fileName: file.fileName, functionName: block.name });
        const calls = extractCalls(blockCode);
        if (block.name !== plan.targetFunction && calls.includes(plan.targetFunction)) {
          inboundReferences.push({ type: "Function Call", fileName: file.fileName, functionName: block.name, reference: plan.targetFunction });
          impactedFiles.add(file.fileName);
        }
      });
      const escaped = plan.targetFunction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exposurePatterns = [
        new RegExp("\\bwindow\\." + escaped + "\\s*="),
        new RegExp("\\bglobalThis\\." + escaped + "\\s*="),
        new RegExp("\\bonclick\\s*=\\s*[\\\"'](?:[^\\\"']*\\b)?" + escaped + "\\s*\\("),
        new RegExp("addEventListener\\s*\\([^,]+,\\s*" + escaped + "\\b")
      ];
      exposurePatterns.forEach(function detect(pattern, index) {
        if (pattern.test(file.code)) {
          globalExposure.push({ fileName: file.fileName, type: ["Window Export", "Global Export", "Inline Event", "Event Listener"][index] });
          impactedFiles.add(file.fileName);
        }
      });
    });

    let riskScore = 0;
    riskScore += Math.min(30, inboundReferences.length * 3);
    riskScore += Math.min(20, impactedFiles.size * 2);
    riskScore += Math.min(20, (addedCallees.length + removedCallees.length) * 5);
    riskScore += Math.min(20, globalExposure.length * 5);
    if (definitions.length !== 1) riskScore += 30;
    const riskLevel = riskScore >= 60 ? "Critical" : riskScore >= 35 ? "High" : riskScore >= 15 ? "Medium" : "Low";

    const checks = [
      { name: "Project sources available", passed: sources.length > 0, detail: "files=" + sources.length },
      { name: "Target file resolved", passed: Boolean(targetFile), detail: plan.targetFile },
      { name: "Unique target definition", passed: definitions.length === 1, detail: "definitions=" + definitions.length },
      { name: "Dependency reference budget", passed: inboundReferences.length <= finite(plan.budget && plan.budget.dependencyReferenceLimit, 100), detail: "references=" + inboundReferences.length },
      { name: "Read-only analysis", passed: true, detail: "No repository write API invoked" }
    ];
    const passed = checks.filter(function ok(item) { return item.passed; }).length;
    const analysis = {
      id: nextId("IDE-150-DEPENDENCY-ANALYSIS"),
      componentId: COMPONENT_ID,
      version: VERSION,
      phaseVersion: PHASE_VERSION,
      requestId: plan.requestId,
      planId: plan.id,
      candidateId: candidate ? candidate.id : "",
      status: passed === checks.length ? "Passed" : "Failed",
      passed: passed === checks.length,
      targetFile: plan.targetFile,
      targetFunction: plan.targetFunction,
      repositoryFileCount: sources.length,
      definitions: definitions,
      inboundReferences: inboundReferences,
      outboundBefore: outboundBefore,
      outboundAfter: outboundAfter,
      addedCallees: addedCallees,
      removedCallees: removedCallees,
      globalExposure: globalExposure,
      impactedFiles: [...impactedFiles],
      declaredDependencyReferences: unique(plan.dependencyReferences),
      riskScore: riskScore,
      riskLevel: riskLevel,
      summary: {
        inboundReferenceCount: inboundReferences.length,
        outboundBeforeCount: outboundBefore.length,
        outboundAfterCount: outboundAfter.length,
        addedCalleeCount: addedCallees.length,
        removedCalleeCount: removedCallees.length,
        globalExposureCount: globalExposure.length,
        impactedFileCount: impactedFiles.size,
        candidateFileCount: candidateFileCount,
        skippedFileCount: Math.max(0, sources.length - candidateFileCount)
      },
      checks: checks,
      analyzedAt: nowIso()
    };
    state.dependencyAnalyses.set(analysis.id, analysis);
    trimMap(state.dependencyAnalyses, MAX_RECORDS);
    plan.dependencyAnalysisId = analysis.id;
    plan.dependencyAnalysisMode = "Full Read-only Project Analysis";
    plan.dependencyAnalysisStatus = analysis.status;
    plan.dependencyRiskLevel = riskLevel;
    state.plans.set(plan.id, plan);
    if (request) { request.dependencyAnalysisId = analysis.id; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
    if (candidate) {
      candidate.dependencyAnalysisId = analysis.id;
      candidate.dependencyAnalysisStatus = analysis.status;
      candidate.dependencyRiskLevel = riskLevel;
      candidate.updatedAt = nowIso();
      state.candidates.set(candidate.id, candidate);
    }
    recordEvent("Dependency Analysis", { planId: plan.id, analysisId: analysis.id, status: analysis.status, riskLevel: riskLevel });
    persistAutoRefactoringState();
    return { analyzed: true, analysis: clone(analysis) };
  }

  function getAutoRefactoringDependencyAnalysis(id) {
    return clone(getDependencyAnalysisRecord(id));
  }

  function registerAutoRefactoringPolicyAdapter(adapter, options) {
    const source = adapter && typeof adapter === "object" ? adapter : {};
    const id = text(source.id || source.componentId, "");
    if (!id || typeof source.evaluate !== "function") return { registered: false, reason: "Policy Adapter id and evaluate(context) are required." };
    const record = {
      id: id,
      name: text(source.name, id),
      version: text(source.version, "1.0.0"),
      mode: text(source.mode, "External Policy Platform Adapter"),
      evaluate: source.evaluate,
      registeredAt: nowIso()
    };
    policyAdapters.set(id, record);
    if (!activePolicyAdapterId || (options && options.active === true)) activePolicyAdapterId = id;
    return { registered: true, adapter: { id: record.id, name: record.name, version: record.version, mode: record.mode, active: activePolicyAdapterId === id } };
  }

  function unregisterAutoRefactoringPolicyAdapter(adapterId) {
    const id = String(adapterId || "");
    const removed = policyAdapters.delete(id);
    if (activePolicyAdapterId === id) activePolicyAdapterId = policyAdapters.size ? policyAdapters.keys().next().value : "";
    return { removed: removed, activeAdapterId: activePolicyAdapterId };
  }

  function setActiveAutoRefactoringPolicyAdapter(adapterId) {
    const id = String(adapterId || "");
    if (!policyAdapters.has(id)) return { updated: false, reason: "Policy Adapter not found." };
    activePolicyAdapterId = id;
    return { updated: true, activeAdapterId: id };
  }

  function getAutoRefactoringPolicyAdapterStatus() {
    return {
      available: policyAdapters.size > 0,
      adapterCount: policyAdapters.size,
      activeAdapterId: activePolicyAdapterId,
      adapters: [...policyAdapters.values()].map(function compact(item) { return { id: item.id, name: item.name, version: item.version, mode: item.mode, active: item.id === activePolicyAdapterId }; })
    };
  }

  function evaluateAutoRefactoringPolicy(input) {
    const source = input && typeof input === "object" ? input : {};
    const adapterId = text(source.adapterId, activePolicyAdapterId);
    const adapter = policyAdapters.get(adapterId);
    if (!adapter) return { evaluated: false, allowed: false, reason: "External Policy Platform Adapter is unavailable. Evaluation is fail-closed.", adapterId: adapterId };
    let result;
    try {
      result = adapter.evaluate(clone(source.context || source));
    } catch (error) {
      result = { allowed: false, reason: error && error.message ? error.message : String(error) };
    }
    const allowed = result === true || Boolean(result && result.allowed === true);
    const decision = {
      id: nextId("IDE-150-POLICY-DECISION"),
      componentId: COMPONENT_ID,
      version: VERSION,
      phaseVersion: PHASE_VERSION,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      requestId: text(source.requestId, ""),
      planId: text(source.planId, ""),
      candidateId: text(source.candidateId, ""),
      allowed: allowed,
      status: allowed ? "Allowed" : "Denied",
      riskLevel: text(source.riskLevel, "Medium"),
      reason: text(result && result.reason, allowed ? "External Policy allowed the governed change." : "External Policy denied the governed change."),
      rules: asArray(result && (result.rules || result.checks)).map(clone),
      rawDecision: result && typeof result === "object" ? clone(result) : { allowed: allowed },
      evaluatedAt: nowIso()
    };
    state.policyDecisions.set(decision.id, decision);
    trimMap(state.policyDecisions, MAX_RECORDS);
    recordEvent("External Policy Evaluation", { decisionId: decision.id, adapterId: adapter.id, allowed: allowed });
    persistAutoRefactoringState();
    return { evaluated: true, allowed: allowed, decision: clone(decision) };
  }

  function getAutoRefactoringPolicyDecision(id) {
    return clone(getPolicyDecisionRecord(id));
  }

  function createGovernedAutoRefactoringPlan(requestId, input) {
    const source = input && typeof input === "object" ? input : {};
    const adapterId = text(source.policyAdapterId, activePolicyAdapterId);
    if (!adapterId || !policyAdapters.has(adapterId)) return { created: false, reason: "A registered external Policy Platform Adapter is required for Core Phase 2." };
    const result = global.createAutoRefactoringPlan(requestId, Object.assign({}, source, { externalPolicyAdapter: adapterId }));
    if (!result || result.created !== true) return result;
    const plan = state.plans.get(result.plan.id);
    plan.governanceMode = "Core Phase 2";
    plan.phaseVersion = PHASE_VERSION;
    plan.dependencyAnalysisRequired = true;
    plan.patchRequired = true;
    plan.externalPolicyRequired = true;
    plan.externalPolicyAdapter = adapterId;
    plan.policyMode = "External Policy Platform + Fail-Closed Core Policy";
    state.plans.set(plan.id, plan);
    persistAutoRefactoringState();
    return { created: true, plan: clone(plan) };
  }

  function createGovernedAutoRefactoringCandidate(planId, input, options) {
    const plan = state.plans.get(String(planId || ""));
    if (!plan) return { created: false, reason: "Refactoring Plan not found." };
    if (plan.governanceMode !== "Core Phase 2") return { created: false, reason: "Governed Candidate requires a Core Phase 2 Plan." };
    const source = input && typeof input === "object" ? input : {};
    const settings = options && typeof options === "object" ? options : {};
    const dependency = analyzeAutoRefactoringDependencies(plan.id, {
      sources: settings.sources,
      adapter: settings.adapter,
      beforeFunctionSource: source.beforeFunctionSource || source.beforeSource,
      afterFunctionSource: source.afterFunctionSource || source.afterSource
    });
    if (!dependency.analyzed || !dependency.analysis.passed) return { created: false, reason: "Full Dependency Analysis failed.", dependency: dependency };

    let capturedDecision = null;
    const result = global.createAutoRefactoringCandidate(plan.id, source, {
      policyEvaluator: function externalPolicy(context) {
        const evaluated = evaluateAutoRefactoringPolicy({
          adapterId: plan.externalPolicyAdapter,
          requestId: plan.requestId,
          planId: plan.id,
          riskLevel: source.riskLevel || dependency.analysis.riskLevel,
          context: {
            componentId: COMPONENT_ID,
            phase: "Core Phase 2",
            plan: context.plan,
            diff: context.diff,
            riskLevel: context.riskLevel,
            dependencyAnalysis: dependency.analysis
          }
        });
        capturedDecision = evaluated.decision || null;
        return evaluated.allowed ? { allowed: true, reason: capturedDecision && capturedDecision.reason, decisionId: capturedDecision && capturedDecision.id } : { allowed: false, reason: evaluated.reason || (capturedDecision && capturedDecision.reason) };
      }
    });
    if (!result || result.created !== true) return Object.assign({}, result, { dependency: dependency, policyDecision: clone(capturedDecision) });
    const candidate = state.candidates.get(result.candidate.id);
    candidate.governanceMode = "Core Phase 2";
    candidate.phaseVersion = PHASE_VERSION;
    candidate.dependencyAnalysisId = dependency.analysis.id;
    candidate.dependencyAnalysisStatus = "Passed";
    candidate.externalPolicyDecisionId = capturedDecision && capturedDecision.id;
    candidate.externalPolicyStatus = capturedDecision && capturedDecision.allowed ? "Allowed" : "Denied";
    candidate.patchStatus = "Not Generated";
    candidate.updatedAt = nowIso();
    state.candidates.set(candidate.id, candidate);
    if (capturedDecision) {
      capturedDecision.candidateId = candidate.id;
      state.policyDecisions.set(capturedDecision.id, capturedDecision);
    }
    const refreshedAnalysis = state.dependencyAnalyses.get(dependency.analysis.id);
    if (refreshedAnalysis) { refreshedAnalysis.candidateId = candidate.id; state.dependencyAnalyses.set(refreshedAnalysis.id, refreshedAnalysis); }
    persistAutoRefactoringState();
    return { created: true, candidate: clone(candidate), dependencyAnalysis: clone(refreshedAnalysis), policyDecision: clone(capturedDecision), preview: result.preview };
  }

  function generateAutoRefactoringPatch(candidateId, options) {
    const candidate = getCandidateRecord(candidateId);
    if (!candidate) return { generated: false, reason: "Refactoring Candidate not found." };
    if (candidate.governanceMode !== "Core Phase 2") return { generated: false, reason: "Governed Patch requires a Core Phase 2 Candidate." };
    const dependency = getDependencyAnalysisRecord(candidate.dependencyAnalysisId);
    const decision = getPolicyDecisionRecord(candidate.externalPolicyDecisionId);
    if (!dependency || dependency.passed !== true) return { generated: false, reason: "Passed Full Dependency Analysis is required." };
    if (!decision || decision.allowed !== true) return { generated: false, reason: "Allowed external Policy Decision is required." };
    const settings = options && typeof options === "object" ? options : {};
    const patch = {
      id: nextId("IDE-150-PATCH"),
      componentId: COMPONENT_ID,
      version: VERSION,
      phaseVersion: PHASE_VERSION,
      format: "AI Prompt OS Governed Function Patch v1",
      status: "Generated",
      requestId: candidate.requestId,
      planId: candidate.planId,
      candidateId: candidate.id,
      targetFile: candidate.targetFile,
      targetFunction: candidate.targetFunction,
      operation: "Replace Existing Function",
      preconditions: {
        filePathExact: true,
        functionDefinitionCount: 1,
        beforeFunctionHash: candidate.beforeHash,
        repositoryFileHash: text(settings.repositoryFileHash, ""),
        concurrentChangeGuard: true
      },
      replacement: {
        source: candidate.afterFunctionSource,
        sourceHash: candidate.afterHash,
        diff: clone(candidate.diff)
      },
      postconditions: {
        afterFunctionHash: candidate.afterHash,
        functionDefinitionCount: 1,
        javascriptSyntaxRequired: true,
        repositoryWriteVerificationRequired: true,
        rollbackVerificationRequired: true
      },
      dependencyAnalysisId: dependency.id,
      policyDecisionId: decision.id,
      approvalRequired: true,
      autoApply: false,
      traceability: clone(candidate.traceability),
      createdBy: text(settings.actor, "IDE-150"),
      createdAt: nowIso(),
      verifiedAt: ""
    };
    state.patches.set(patch.id, patch);
    trimMap(state.patches, MAX_RECORDS);
    candidate.patchId = patch.id;
    candidate.patchStatus = "Generated";
    candidate.updatedAt = nowIso();
    state.candidates.set(candidate.id, candidate);
    recordEvent("Governed Patch Generated", { candidateId: candidate.id, patchId: patch.id });
    persistAutoRefactoringState();
    return { generated: true, patch: clone(patch) };
  }

  function verifyAutoRefactoringPatch(patchId, options) {
    const patch = getPatchRecord(patchId);
    if (!patch) return { verified: false, reason: "Governed Patch not found." };
    const candidate = getCandidateRecord(patch.candidateId);
    const dependency = getDependencyAnalysisRecord(patch.dependencyAnalysisId);
    const decision = getPolicyDecisionRecord(patch.policyDecisionId);
    const settings = options && typeof options === "object" ? options : {};
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    check("Candidate exists", Boolean(candidate));
    check("Function scope", Boolean(candidate && candidate.targetFile === patch.targetFile && candidate.targetFunction === patch.targetFunction));
    check("Before hash", Boolean(candidate && candidate.beforeHash === patch.preconditions.beforeFunctionHash));
    check("After hash", Boolean(candidate && candidate.afterHash === patch.postconditions.afterFunctionHash && hashText(patch.replacement.source) === candidate.afterHash));
    check("Dependency Analysis", Boolean(dependency && dependency.passed === true));
    check("External Policy Decision", Boolean(decision && decision.allowed === true));
    check("Approval remains required", patch.approvalRequired === true && patch.autoApply === false);
    check("Single function definition", candidate ? countFunctionDefinitions(patch.replacement.source, candidate.targetFunction) === 1 : false);
    if (settings.adapter && typeof settings.adapter.getFileText === "function" && candidate) {
      const fileSource = settings.adapter.getFileText(candidate.targetFile);
      const block = typeof fileSource === "string" ? findFunctionBlock(fileSource, candidate.targetFunction) : null;
      check("Repository precondition", Boolean(block && hashText(block.block.trim()) === candidate.beforeHash));
    }
    const passed = checks.filter(function ok(item) { return item.passed; }).length;
    const verified = passed === checks.length;
    patch.status = verified ? "Verified" : "Rejected";
    patch.verification = { passed: passed, failed: checks.length - passed, total: checks.length, checks: checks };
    patch.verifiedAt = verified ? nowIso() : "";
    state.patches.set(patch.id, patch);
    if (candidate) {
      candidate.patchStatus = patch.status;
      candidate.patchId = patch.id;
      candidate.updatedAt = nowIso();
      state.candidates.set(candidate.id, candidate);
    }
    recordEvent("Governed Patch Verification", { patchId: patch.id, candidateId: patch.candidateId, verified: verified });
    persistAutoRefactoringState();
    return { verified: verified, patch: clone(patch), verification: clone(patch.verification) };
  }

  function getAutoRefactoringPatch(id) {
    return clone(getPatchRecord(id));
  }

  function getAutoRefactoringPhase2Status() {
    const adapterStatus = getAutoRefactoringPolicyAdapterStatus();
    const latestAnalysis = [...state.dependencyAnalyses.values()].slice(-1)[0] || null;
    const latestPatch = [...state.patches.values()].slice(-1)[0] || null;
    const latestDecision = [...state.policyDecisions.values()].slice(-1)[0] || null;
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      phase: "Core Phase 2",
      phaseVersion: PHASE_VERSION,
      status: "Ready",
      completed: true,
      implementationReady: true,
      runtimeReady: adapterStatus.available,
      externalPolicyStatus: adapterStatus.available ? "Connected" : "Not Connected",
      capabilities: internal.CORE_PHASE_2_CAPABILITIES.slice(),
      dependencyAnalysisCount: state.dependencyAnalyses.size,
      patchCount: state.patches.size,
      policyDecisionCount: state.policyDecisions.size,
      policyAdapter: adapterStatus,
      latestDependencyAnalysis: internal.compactDependencyAnalysis(latestAnalysis),
      latestPatch: internal.compactPatch(latestPatch),
      latestPolicyDecision: internal.compactPolicyDecision(latestDecision),
      safety: {
        readOnlyDependencyAnalysis: true,
        patchAutoApply: false,
        externalPolicyFailClosed: true,
        explicitApprovalRequired: true,
        rollbackRequired: true
      },
      updatedAt: nowIso()
    };
  }

  const api = {
    analyzeAutoRefactoringDependencies: analyzeAutoRefactoringDependencies,
    getAutoRefactoringDependencyAnalysis: getAutoRefactoringDependencyAnalysis,
    registerAutoRefactoringPolicyAdapter: registerAutoRefactoringPolicyAdapter,
    unregisterAutoRefactoringPolicyAdapter: unregisterAutoRefactoringPolicyAdapter,
    setActiveAutoRefactoringPolicyAdapter: setActiveAutoRefactoringPolicyAdapter,
    getAutoRefactoringPolicyAdapterStatus: getAutoRefactoringPolicyAdapterStatus,
    evaluateAutoRefactoringPolicy: evaluateAutoRefactoringPolicy,
    getAutoRefactoringPolicyDecision: getAutoRefactoringPolicyDecision,
    createGovernedAutoRefactoringPlan: createGovernedAutoRefactoringPlan,
    createGovernedAutoRefactoringCandidate: createGovernedAutoRefactoringCandidate,
    generateAutoRefactoringPatch: generateAutoRefactoringPatch,
    verifyAutoRefactoringPatch: verifyAutoRefactoringPatch,
    getAutoRefactoringPatch: getAutoRefactoringPatch,
    getAutoRefactoringPhase2Status: getAutoRefactoringPhase2Status
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.__IDE150AutoRefactoringPhase2Internal = {
    version: PHASE_VERSION,
    policyAdapters: policyAdapters,
    resolveProjectSources: resolveProjectSources,
    extractCalls: extractCalls
  };
  global.IDE150AutoRefactoring = Object.assign(global.IDE150AutoRefactoring || {}, api, { corePhase2Version: PHASE_VERSION });
})(typeof window !== "undefined" ? window : globalThis);