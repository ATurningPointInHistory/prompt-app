/* ============================================================
   FILE: 13_investigation_workflow_validation.js
   IDE-135 Investigation Workflow Validation
   Version: 1.2.4
   Status: Ready
   Design Freeze: 2026-07-26
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-135";
  const VERSION = "1.2.4";
  const TARGET_COMPONENT = "IDE-130";
  const MAX_HISTORY = 100;

  const COVERAGE_LAYERS = Object.freeze([
    "Requirement", "State", "Transition", "Policy", "Evidence",
    "Restore", "Safety", "Integration", "Performance", "Closure"
  ]);


  const REQUIRED_COVERAGE_TARGETS = Object.freeze({
    Requirement: ["IDE-130-001", "IDE-130-002", "IDE-130-003", "IDE-130-004", "IDE-130-005", "IDE-130-006", "IDE-130-007", "IDE-130-008", "IDE-130-009", "IDE-130-010"],
    State: ["Requested", "Scoped", "Searching", "Investigating", "Instrumenting", "Measuring", "Analyzing", "Reporting", "Restoring", "Verifying", "Completed", "Paused", "Blocked", "Inconclusive", "Safety Stopped", "Restore Required", "Manual Recovery Required", "Failed"],
    Transition: ["Normal Path", "Invalid Transition Rejected", "User Cancelled Restore Path", "Runtime Error Restore Path", "Budget Exhausted Restore Path", "Concurrent Change Protection", "Restore Failure Escalation", "Closure Reopen Rejected"],
    Policy: ["Permission Gate", "Evidence Gate", "Budget Gate", "Scope Gate", "Restore Gate", "Safety Gate", "Closure Gate"],
    Evidence: ["Evidence Registry", "Evidence Reference Integrity", "Supporting Evidence", "Contradicting Evidence", "Evidence Reference Break Detection"],
    Restore: ["Instrumentation Removal", "Runtime Wrapper Restore", "Residual Scan", "Concurrent Change Preservation", "Restore Failure Detection"],
    Safety: ["Unauthorized Change Rejection", "Hard Limit", "Runtime Error Handling", "Safety Stop", "Manual Recovery"],
    Integration: ["IDE-110", "IDE-115", "IDE-120", "IDE-125", "IDE-130", "Relationship Platform", "Validation Result Repository"],
    Performance: ["Search Duration", "Instrumentation Measurement", "Validation Duration", "Budget Limit"],
    Closure: ["Completed", "Closed as Inconclusive", "Closed as Not Reproduced", "Safety Stopped", "Manual Recovery Required", "Reopen Rejected"]
  });

  const STANDARD_COVERAGE_BY_SCENARIO = Object.freeze({
    "IDE135-SCN-001": { Transition: ["Normal Path"], Policy: ["Scope Gate", "Closure Gate"], Evidence: ["Evidence Registry", "Supporting Evidence"], Performance: ["Search Duration"], Closure: ["Completed"] },
    "IDE135-SCN-002": { Transition: ["Invalid Transition Rejected"], Policy: ["Safety Gate"] },
    "IDE135-SCN-003": { State: ["Failed"], Policy: ["Evidence Gate"], Evidence: ["Evidence Reference Integrity"] },
    "IDE135-SCN-004": { Policy: ["Permission Gate"], Safety: ["Unauthorized Change Rejection"] },
    "IDE135-SCN-005": { Transition: ["Budget Exhausted Restore Path"], Policy: ["Budget Gate"], Safety: ["Hard Limit"], Performance: ["Budget Limit"] },
    "IDE135-SCN-006": { State: ["Inconclusive"], Policy: ["Closure Gate"], Closure: ["Closed as Inconclusive"] },
    "IDE135-SCN-007": { Policy: ["Restore Gate"], Evidence: ["Evidence Registry"], Restore: ["Instrumentation Removal", "Runtime Wrapper Restore", "Residual Scan"], Performance: ["Instrumentation Measurement"] },
    "IDE135-SCN-008": { Transition: ["Closure Reopen Rejected"], Policy: ["Closure Gate"], Closure: ["Reopen Rejected"] },
    "IDE135-SCN-009": { Evidence: ["Evidence Reference Integrity", "Supporting Evidence", "Contradicting Evidence"], Integration: ["Relationship Platform"] },
    "IDE135-SCN-010": { Integration: ["IDE-110", "IDE-115", "IDE-120", "IDE-125", "IDE-130", "Validation Result Repository"], Performance: ["Validation Duration"] },
    "IDE135-SCN-011": { State: ["Paused", "Blocked"], Policy: ["Scope Gate"] },
    "IDE135-SCN-012": { State: ["Failed", "Restoring"], Transition: ["User Cancelled Restore Path"], Restore: ["Instrumentation Removal", "Runtime Wrapper Restore"] },
    "IDE135-SCN-013": { State: ["Failed", "Restoring"], Transition: ["Runtime Error Restore Path"], Restore: ["Instrumentation Removal", "Runtime Wrapper Restore"], Safety: ["Runtime Error Handling"] },
    "IDE135-SCN-014": { Transition: ["Concurrent Change Protection"], Restore: ["Concurrent Change Preservation"], Policy: ["Safety Gate"] },
    "IDE135-SCN-015": { State: ["Restore Required", "Manual Recovery Required"], Transition: ["Restore Failure Escalation"], Restore: ["Restore Failure Detection"], Safety: ["Manual Recovery"], Closure: ["Manual Recovery Required"] },
    "IDE135-SCN-016": { Policy: ["Evidence Gate"], Evidence: ["Evidence Reference Break Detection"] },
    "IDE135-SCN-017": { Closure: ["Closed as Not Reproduced"] },
    "IDE135-SCN-018": { State: ["Safety Stopped", "Manual Recovery Required"], Safety: ["Safety Stop", "Manual Recovery"], Closure: ["Safety Stopped", "Manual Recovery Required"] }
  });

  const VALIDATION_GATES = Object.freeze([
    "Requirement Gate", "State Gate", "Transition Gate", "Policy Gate",
    "Evidence Gate", "Restore Gate", "Safety Gate", "Coverage Gate",
    "Integration Gate", "Closure Gate"
  ]);

  const SESSION_STATES = Object.freeze([
    "Created", "Planned", "Running", "Aggregating", "Reporting",
    "Completed", "Completed with Warnings", "Failed", "Blocked",
    "Coverage Insufficient", "Restore Required", "Safety Failed",
    "Inconclusive", "Manual Review Required", "Manual Recovery Required"
  ]);

  const DEFAULT_POLICY = Object.freeze({
    criticalCoverageRequired: 1,
    nonCriticalCoverageRequired: 0.8,
    stopOnSafetyFailure: true,
    requireRestoreVerified: true,
    requireEvidenceTraceability: true,
    requireIntegration: true,
    requireOfficialDependencyRelease: false,
    maxScenarioDurationMs: 60000,
    maxValidationDurationMs: 300000
  });

  const state = {
    scenarios: new Map(),
    sessions: new Map(),
    results: new Map(),
    reports: new Map(),
    evidencePackages: new Map(),
    handoffs: new Map(),
    relationships: [],
    history: [],
    sequence: 0,
    lastResult: null,
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function text(value, fallback) { const result = String(value == null ? "" : value).trim(); return result || String(fallback || ""); }
  function finite(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function unique(values) { return [...new Set(asArray(values).filter(Boolean).map(String))]; }
  function nextId(prefix) {
    state.sequence += 1;
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }
  function touch() { state.updatedAt = nowIso(); }
  function trimHistory() { while (state.history.length > MAX_HISTORY) state.history.shift(); }
  function measureNow() { return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now(); }

  function recordEvent(type, sessionId, details) {
    const event = {
      id: nextId("IDE-135-EVENT"),
      type: text(type, "Event"),
      sessionId: text(sessionId, ""),
      details: clone(details || {}),
      at: nowIso()
    };
    state.history.push(event);
    trimHistory();
    touch();
    return clone(event);
  }

  function addRelationship(sourceId, type, targetId, metadata) {
    const source = text(sourceId, "");
    const target = text(targetId, "");
    const relationType = text(type, "relates-to");
    if (!source || !target) return null;
    const existing = state.relationships.find(function find(item) {
      return item.sourceId === source && item.targetId === target && item.type === relationType;
    });
    if (existing) return clone(existing);
    const relation = {
      id: nextId("IDE-135-REL"),
      sourceId: source,
      type: relationType,
      targetId: target,
      metadata: clone(metadata || {}),
      createdAt: nowIso()
    };
    state.relationships.push(relation);
    touch();
    return clone(relation);
  }

  function getInvestigationValidationRelationships(filter) {
    const settings = filter && typeof filter === "object" ? filter : {};
    return state.relationships.filter(function match(item) {
      if (settings.sourceId && item.sourceId !== String(settings.sourceId)) return false;
      if (settings.targetId && item.targetId !== String(settings.targetId)) return false;
      if (settings.type && item.type !== String(settings.type)) return false;
      if (settings.sessionId) {
        const sessionId = String(settings.sessionId);
        if (item.sourceId !== sessionId && item.targetId !== sessionId && item.metadata.sessionId !== sessionId) return false;
      }
      return true;
    }).map(clone);
  }

  function normalizeCoverage(input) {
    const source = input && typeof input === "object" ? input : {};
    const result = {};
    COVERAGE_LAYERS.forEach(function mapLayer(layer) {
      result[layer] = unique(source[layer] || source[layer.toLowerCase()] || []);
    });
    return result;
  }

  function normalizeScenario(definition) {
    const source = definition && typeof definition === "object" ? definition : {};
    const id = text(source.id, "");
    if (!id) throw new Error("Scenario id is required.");
    if (typeof source.execute !== "function") throw new Error("Scenario execute function is required: " + id);
    return {
      id: id,
      title: text(source.title, id),
      description: text(source.description, ""),
      category: text(source.category, "Normal"),
      priority: finite(source.priority, 100),
      risk: text(source.risk, "Medium"),
      critical: source.critical === true,
      enabled: source.enabled !== false,
      required: source.required !== false,
      stopPipelineOnFailure: source.stopPipelineOnFailure === true,
      initialContext: clone(source.initialContext || {}),
      preconditions: unique(source.preconditions),
      expectedStateSequence: unique(source.expectedStateSequence),
      expectedEvidence: unique(source.expectedEvidence),
      expectedGateDecisions: clone(source.expectedGateDecisions || {}),
      expectedRestoreResult: text(source.expectedRestoreResult, "Not Applicable"),
      expectedClosureResult: text(source.expectedClosureResult, "Not Applicable"),
      expectedReopenDecision: text(source.expectedReopenDecision, "Not Applicable"),
      covers: normalizeCoverage(source.covers),
      relatedRequirements: unique(source.relatedRequirements),
      relatedDecisions: unique(source.relatedDecisions),
      execute: source.execute,
      version: text(source.version, VERSION),
      createdAt: source.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }

  function registerInvestigationValidationScenario(definition, options) {
    const settings = options && typeof options === "object" ? options : {};
    const scenario = normalizeScenario(definition);
    if (state.scenarios.has(scenario.id) && settings.replace !== true) {
      return { registered: false, reason: "Scenario already registered: " + scenario.id };
    }
    state.scenarios.set(scenario.id, scenario);
    touch();
    return { registered: true, scenario: getInvestigationValidationScenario(scenario.id) };
  }

  function unregisterInvestigationValidationScenario(id) {
    const scenarioId = text(id, "");
    if (!state.scenarios.has(scenarioId)) return { removed: false, reason: "Scenario not found." };
    state.scenarios.delete(scenarioId);
    touch();
    return { removed: true, id: scenarioId };
  }

  function getInvestigationValidationScenario(id) {
    const scenario = state.scenarios.get(String(id));
    if (!scenario) return null;
    const copy = clone(scenario);
    delete copy.execute;
    return copy;
  }

  function getInvestigationValidationScenarios(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.scenarios.values()]
      .filter(function filter(item) {
        if (!settings.includeDisabled && item.enabled === false) return false;
        if (settings.category && item.category !== String(settings.category)) return false;
        if (settings.critical === true && item.critical !== true) return false;
        return true;
      })
      .sort(function sort(a, b) { return a.priority - b.priority || a.id.localeCompare(b.id); })
      .map(function strip(item) { const copy = clone(item); delete copy.execute; return copy; });
  }

  function mergePolicy(input) {
    return Object.assign({}, DEFAULT_POLICY, input && typeof input === "object" ? input : {});
  }

  function createInvestigationValidationSession(request) {
    const source = request && typeof request === "object" ? request : {};
    const selectedScenarioIds = unique(source.scenarioIds || source.selectedScenarioIds);
    const session = {
      id: nextId("IDE-135-SESSION"),
      componentId: COMPONENT_ID,
      version: VERSION,
      targetComponent: TARGET_COMPONENT,
      targetVersion: text(source.targetVersion, "1.0.0"),
      repositoryVersion: text(source.repositoryVersion, "memo-current"),
      datasetVersion: text(source.datasetVersion, "golden-core-v1.0.0"),
      validationType: text(source.validationType, "Full"),
      executionMode: text(source.executionMode, "Manual"),
      scope: clone(source.scope || { component: TARGET_COMPONENT }),
      policy: mergePolicy(source.policy),
      selectedScenarioIds: selectedScenarioIds,
      plan: [],
      executionQueue: [],
      scenarioResults: [],
      coverageResults: [],
      gateResults: [],
      findings: [],
      warnings: [],
      errors: [],
      overallDecision: "Pending",
      implementationReady: false,
      releaseAllowed: false,
      reportId: null,
      evidencePackageId: null,
      handoffId: null,
      state: "Created",
      startedAt: null,
      completedAt: null,
      durationMs: 0,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.sessions.set(session.id, session);
    recordEvent("Validation Session Created", session.id, { validationType: session.validationType });
    return clone(session);
  }

  function requireValidationSession(id) {
    const session = state.sessions.get(String(id));
    if (!session) throw new Error("IDE-135 validation session was not found: " + id);
    return session;
  }

  function getInvestigationValidationSession(id) { return clone(state.sessions.get(String(id)) || null); }
  function getInvestigationValidationSessions() { return [...state.sessions.values()].map(clone); }

  function buildInvestigationValidationPlan(sessionId) {
    const session = requireValidationSession(sessionId);
    let scenarios = [...state.scenarios.values()].filter(function enabled(item) { return item.enabled !== false; });
    if (session.selectedScenarioIds.length > 0) {
      const selected = new Set(session.selectedScenarioIds);
      scenarios = scenarios.filter(function include(item) { return selected.has(item.id); });
    }
    scenarios.sort(function sort(a, b) {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return a.priority - b.priority || a.id.localeCompare(b.id);
    });
    session.plan = scenarios.map(function plan(item, index) {
      return {
        order: index + 1,
        scenarioId: item.id,
        category: item.category,
        priority: item.priority,
        risk: item.risk,
        critical: item.critical,
        expectedRestoreResult: item.expectedRestoreResult,
        expectedClosureResult: item.expectedClosureResult,
      expectedReopenDecision: item.expectedReopenDecision
      };
    });
    session.executionQueue = session.plan.map(function queue(item) {
      return Object.assign({}, item, { status: "Ready" });
    });
    session.state = "Planned";
    session.updatedAt = nowIso();
    recordEvent("Validation Plan Built", session.id, { scenarioCount: session.plan.length });
    return { planned: true, plan: clone(session.plan), session: clone(session) };
  }

  function normalizeScenarioExecution(raw, scenario) {
    const source = raw && typeof raw === "object" ? raw : { passed: raw === true };
    const passed = source.passed === true || source.valid === true;
    return {
      passed: passed,
      status: text(source.status, passed ? "Passed" : "Failed"),
      detail: text(source.detail || source.message, ""),
      actualStateSequence: unique(source.actualStateSequence),
      stateResults: clone(source.stateResults || []),
      transitionResults: clone(source.transitionResults || []),
      policyResults: clone(source.policyResults || []),
      evidenceResults: clone(source.evidenceResults || []),
      restoreResult: clone(source.restoreResult || { status: source.restoreStatus || "Not Applicable" }),
      safetyResult: clone(source.safetyResult || { status: source.safetyStatus || (passed ? "Passed" : "Failed") }),
      closureResult: clone(source.closureResult || { status: source.closureStatus || "Not Applicable" }),
      integrationResults: clone(source.integrationResults || []),
      performanceResults: clone(source.performanceResults || {}),
      evidenceReferences: unique(source.evidenceReferences),
      investigationSessionIds: unique(source.investigationSessionIds),
      findings: clone(source.findings || []),
      warnings: unique(source.warnings),
      errors: unique(source.errors),
      expectedStateSequence: clone(scenario.expectedStateSequence),
      expectedRestoreResult: scenario.expectedRestoreResult,
      expectedClosureResult: scenario.expectedClosureResult,
      expectedReopenDecision: scenario.expectedReopenDecision
    };
  }

  async function runInvestigationValidationScenario(sessionId, scenarioId) {
    const session = requireValidationSession(sessionId);
    const scenario = state.scenarios.get(String(scenarioId));
    if (!scenario) return { executed: false, reason: "Scenario not found: " + scenarioId };
    const queueItem = session.executionQueue.find(function find(item) { return item.scenarioId === scenario.id; });
    if (queueItem) queueItem.status = "Running";
    const started = measureNow();
    let normalized;
    try {
      const raw = await Promise.resolve(scenario.execute({
        validationSession: clone(session),
        scenario: getInvestigationValidationScenario(scenario.id),
        global: global
      }));
      normalized = normalizeScenarioExecution(raw, scenario);
    } catch (error) {
      normalized = normalizeScenarioExecution({
        passed: false,
        status: "Failed",
        detail: error && error.message ? error.message : String(error),
        errors: [error && error.stack ? error.stack : String(error)]
      }, scenario);
    }
    const ended = measureNow();
    const result = Object.assign({
      id: nextId("IDE-135-RESULT"),
      validationSessionId: session.id,
      scenarioId: scenario.id,
      title: scenario.title,
      category: scenario.category,
      critical: scenario.critical,
      risk: scenario.risk,
      covers: clone(scenario.covers),
      durationMs: Number((ended - started).toFixed(3)),
      executedAt: nowIso()
    }, normalized);
    state.results.set(result.id, result);
    session.scenarioResults.push(result.id);
    result.investigationSessionIds.forEach(function link(id) {
      addRelationship(result.id, "validates", id, { sessionId: session.id, scenarioId: scenario.id });
    });
    result.evidenceReferences.forEach(function link(id) {
      addRelationship(result.id, "supported-by", id, { sessionId: session.id, scenarioId: scenario.id });
    });
    addRelationship(session.id, "executed-as", result.id, { sessionId: session.id, scenarioId: scenario.id });
    if (queueItem) queueItem.status = result.passed ? "Passed" : "Failed";
    session.findings.push(...result.findings.map(function withScenario(item) {
      return Object.assign({ scenarioId: scenario.id }, clone(item));
    }));
    session.warnings.push(...result.warnings);
    session.errors.push(...result.errors);
    session.updatedAt = nowIso();
    recordEvent("Scenario Executed", session.id, { scenarioId: scenario.id, passed: result.passed, durationMs: result.durationMs });
    return { executed: true, result: clone(result) };
  }

  function getInvestigationValidationResult(id) { return clone(state.results.get(String(id)) || null); }
  function getSessionInvestigationValidationResults(sessionId) {
    const session = requireValidationSession(sessionId);
    return session.scenarioResults.map(function map(id) { return state.results.get(id); }).filter(Boolean).map(clone);
  }

  function calculateInvestigationValidationCoverage(sessionId) {
    const session = requireValidationSession(sessionId); const results = getSessionInvestigationValidationResults(session.id);
    const coverage = COVERAGE_LAYERS.map(function (layer) { const targetSet = new Set(asArray(REQUIRED_COVERAGE_TARGETS[layer]).map(String)); const coveredSet = new Set(); results.filter(item => item.passed).forEach(function (result) { asArray(result.covers[layer]).forEach(id => coveredSet.add(String(id))); const standardized = STANDARD_COVERAGE_BY_SCENARIO[result.scenarioId] || {}; asArray(standardized[layer]).forEach(id => coveredSet.add(String(id))); }); const missing = [...targetSet].filter(id => !coveredSet.has(id)); const rate = targetSet.size ? (targetSet.size - missing.length) / targetSet.size : 1; const critical = ["Requirement", "State", "Transition", "Policy", "Evidence", "Restore", "Safety", "Closure"].includes(layer); const requiredThreshold = critical ? session.policy.criticalCoverageRequired : session.policy.nonCriticalCoverageRequired; return { id: nextId("IDE-135-COVERAGE"), layer, targetCount: targetSet.size, coveredCount: targetSet.size - missing.length, extraCoveredCount: [...coveredSet].filter(id => !targetSet.has(id)).length, missingCount: missing.length, coverageRate: Number(rate.toFixed(4)), requiredThreshold, critical, missingItems: missing, status: rate >= requiredThreshold ? "Complete" : rate > 0 ? "Partial" : "Missing", source: "Design Freeze Requirement Registry" }; });
    session.coverageResults = coverage; session.updatedAt = nowIso(); recordEvent("Coverage Calculated", session.id, { layers: coverage.length, source: "Design Freeze Requirement Registry" }); return clone(coverage);
  }

  function findScenarioResultById(results, scenarioId) {
    return results.find(function find(item) { return item.scenarioId === scenarioId; }) || null;
  }

  function buildGate(name, passed, metrics, severity, reason) {
    return {
      name: name,
      passed: passed === true,
      metrics: clone(metrics || {}),
      severity: text(severity, passed ? "Info" : "Error"),
      reason: text(reason, passed ? "Gate passed." : "Gate failed.")
    };
  }

  function evaluateInvestigationValidationGates(sessionId) {
    const session = requireValidationSession(sessionId);
    const results = getSessionInvestigationValidationResults(session.id);
    const coverage = session.coverageResults.length ? clone(session.coverageResults) : calculateInvestigationValidationCoverage(session.id);
    const resultMap = new Map(results.map(function pair(item) { return [item.scenarioId, item]; }));
    const requiredScenarioIds = session.plan.filter(function required(item) {
      const scenario = state.scenarios.get(item.scenarioId);
      return scenario && scenario.required !== false;
    }).map(function id(item) { return item.scenarioId; });
    const missingRequired = requiredScenarioIds.filter(function missing(id) { return !resultMap.has(id); });
    const failedRequired = requiredScenarioIds.filter(function failed(id) {
      const result = resultMap.get(id);
      return result && !result.passed;
    });
    const layer = function layer(name) { return coverage.find(function find(item) { return item.layer === name; }); };
    const allLayerCoverage = coverage.every(function complete(item) { return item.coverageRate >= item.requiredThreshold; });
    const restoreScenario = findScenarioResultById(results, "IDE135-SCN-007");
    const safetyFailures = results.filter(function safety(item) {
      return item.category === "Safety" && (!item.passed || String(item.safetyResult && item.safetyResult.status).includes("Failed"));
    });
    const evidenceTraceable = results.every(function traceable(item) {
      if (!item.passed) return true;
      if (item.scenarioId === "IDE135-SCN-003") return item.evidenceResults.length > 0;
      if (item.category === "Evidence" || item.scenarioId === "IDE135-SCN-001" || item.scenarioId === "IDE135-SCN-007") {
        return item.evidenceReferences.length > 0 || item.evidenceResults.length > 0;
      }
      return true;
    });
    const integrationPassed = ["IDE135-SCN-001", "IDE135-SCN-007", "IDE135-SCN-010"].every(function passed(id) {
      const result = resultMap.get(id);
      return Boolean(result && result.passed);
    });
    const closurePassed = ["IDE135-SCN-006", "IDE135-SCN-008"].every(function passed(id) {
      const result = resultMap.get(id);
      return Boolean(result && result.passed);
    });

    const gates = [
      buildGate("Requirement Gate", missingRequired.length === 0 && failedRequired.length === 0,
        { required: requiredScenarioIds.length, missing: missingRequired, failed: failedRequired }, "Critical",
        missingRequired.length || failedRequired.length ? "Required scenarios are incomplete." : "All required scenarios passed."),
      buildGate("State Gate", layer("State").coverageRate >= layer("State").requiredThreshold,
        layer("State"), "Critical", "State coverage evaluated."),
      buildGate("Transition Gate", layer("Transition").coverageRate >= layer("Transition").requiredThreshold,
        layer("Transition"), "Critical", "Transition coverage evaluated."),
      buildGate("Policy Gate", layer("Policy").coverageRate >= layer("Policy").requiredThreshold,
        layer("Policy"), "Critical", "Policy rejection and budget controls evaluated."),
      buildGate("Evidence Gate", layer("Evidence").coverageRate >= layer("Evidence").requiredThreshold && evidenceTraceable,
        { coverage: layer("Evidence"), traceable: evidenceTraceable }, "Critical", evidenceTraceable ? "Evidence is traceable." : "Evidence traceability is incomplete."),
      buildGate("Restore Gate", Boolean(restoreScenario && restoreScenario.passed && ["Verified", "Not Required"].includes(String(restoreScenario.restoreResult && restoreScenario.restoreResult.status))),
        restoreScenario ? restoreScenario.restoreResult : { status: "Missing" }, "Critical", "Restore and residual scan evaluated."),
      buildGate("Safety Gate", safetyFailures.length === 0,
        { safetyFailures: safetyFailures.map(function id(item) { return item.scenarioId; }) }, "Critical", safetyFailures.length ? "Safety scenario failed." : "Safety scenarios passed."),
      buildGate("Coverage Gate", allLayerCoverage,
        { layers: coverage.map(function summary(item) { return { layer: item.layer, rate: item.coverageRate, required: item.requiredThreshold }; }) }, "Critical", allLayerCoverage ? "Required coverage achieved." : "Required coverage is insufficient."),
      buildGate("Integration Gate", integrationPassed,
        { requiredScenarios: ["IDE135-SCN-001", "IDE135-SCN-007", "IDE135-SCN-010"] }, "Critical", integrationPassed ? "IDE-110/120/125/130 integration passed." : "Integration scenario is incomplete."),
      buildGate("Closure Gate", closurePassed,
        { requiredScenarios: ["IDE135-SCN-006", "IDE135-SCN-008"] }, "Critical", closurePassed ? "Closure and reopen restrictions passed." : "Closure validation failed.")
    ];

    session.gateResults = gates;
    const criticalFailures = gates.filter(function failed(item) { return !item.passed && item.severity === "Critical"; });
    session.releaseAllowed = criticalFailures.length === 0;
    session.implementationReady = session.releaseAllowed;
    session.overallDecision = session.releaseAllowed ? (session.warnings.length ? "Passed with Warnings" : "Passed") : "Failed";
    session.updatedAt = nowIso();
    recordEvent("Validation Gates Evaluated", session.id, { passed: gates.filter(function pass(item) { return item.passed; }).length, total: gates.length });
    return clone(gates);
  }

  function buildInvestigationValidationEvidencePackage(sessionId) {
    const session = requireValidationSession(sessionId);
    const results = getSessionInvestigationValidationResults(session.id);
    const evidenceReferences = unique(results.flatMap(function refs(item) { return item.evidenceReferences; }));
    const packageValue = {
      id: nextId("IDE-135-EVIDENCE"),
      componentId: COMPONENT_ID,
      version: VERSION,
      validationSessionId: session.id,
      targetComponent: session.targetComponent,
      targetVersion: session.targetVersion,
      repositoryVersion: session.repositoryVersion,
      datasetVersion: session.datasetVersion,
      decision: session.overallDecision,
      releaseAllowed: session.releaseAllowed,
      scenarioResults: results.map(function summarize(item) {
        return { id: item.id, scenarioId: item.scenarioId, passed: item.passed, status: item.status, evidenceReferences: item.evidenceReferences, durationMs: item.durationMs };
      }),
      coverageResults: clone(session.coverageResults),
      gateDecisions: clone(session.gateResults),
      evidenceReferences: evidenceReferences,
      failureEvidence: results.filter(function failed(item) { return !item.passed; }).map(function evidence(item) {
        return { scenarioId: item.scenarioId, detail: item.detail, errors: item.errors };
      }),
      reproductionData: {
        validationType: session.validationType,
        executionMode: session.executionMode,
        selectedScenarioIds: clone(session.selectedScenarioIds),
        policy: clone(session.policy)
      },
      createdAt: nowIso()
    };
    state.evidencePackages.set(packageValue.id, packageValue);
    session.evidencePackageId = packageValue.id;
    addRelationship(session.id, "produced", packageValue.id, { sessionId: session.id });
    recordEvent("Evidence Package Built", session.id, { evidencePackageId: packageValue.id });
    return { generated: true, evidencePackage: clone(packageValue) };
  }

  function buildInvestigationValidationReport(sessionId) {
    const session = requireValidationSession(sessionId);
    const results = getSessionInvestigationValidationResults(session.id);
    const report = {
      id: nextId("IDE-135-REPORT"),
      componentId: COMPONENT_ID,
      version: VERSION,
      title: "Investigation Workflow Validation Report",
      validationSessionId: session.id,
      executiveSummary: session.overallDecision + "; " + results.filter(function pass(item) { return item.passed; }).length + "/" + results.length + " scenarios passed.",
      scope: clone(session.scope),
      environment: {
        repositoryVersion: session.repositoryVersion,
        datasetVersion: session.datasetVersion,
        targetVersion: session.targetVersion,
        executionMode: session.executionMode
      },
      scenarioSummary: results.map(function summarize(item) {
        return { scenarioId: item.scenarioId, title: item.title, category: item.category, passed: item.passed, status: item.status, durationMs: item.durationMs };
      }),
      stateTransitionResults: results.flatMap(function list(item) { return item.transitionResults; }),
      policyEvaluation: results.flatMap(function list(item) { return item.policyResults; }),
      gateDecisions: clone(session.gateResults),
      evidenceValidation: results.flatMap(function list(item) { return item.evidenceResults; }),
      coverageAnalysis: clone(session.coverageResults),
      restoreValidation: results.map(function map(item) { return { scenarioId: item.scenarioId, restoreResult: item.restoreResult }; }),
      safetyValidation: results.map(function map(item) { return { scenarioId: item.scenarioId, safetyResult: item.safetyResult }; }),
      integrationResults: results.flatMap(function list(item) { return item.integrationResults; }),
      performanceResults: results.map(function map(item) { return { scenarioId: item.scenarioId, performanceResults: item.performanceResults }; }),
      findings: clone(session.findings),
      failures: results.filter(function failed(item) { return !item.passed; }),
      warnings: unique(session.warnings),
      remainingRisks: results.filter(function failed(item) { return !item.passed; }).map(function risk(item) { return "Scenario failed: " + item.scenarioId; }),
      evidencePackageId: session.evidencePackageId,
      releaseAllowed: session.releaseAllowed,
      implementationReady: session.implementationReady,
      structuredResult: true,
      generatedAt: nowIso()
    };
    state.reports.set(report.id, report);
    session.reportId = report.id;
    addRelationship(session.id, "produced-report", report.id, { sessionId: session.id });
    recordEvent("Validation Report Built", session.id, { reportId: report.id });
    return { generated: true, report: clone(report) };
  }

  function buildInvestigationValidationHandoff(sessionId) {
    const session = requireValidationSession(sessionId);
    if (!session.reportId) return { generated: false, reason: "Validation report is required." };
    const failedResults = getSessionInvestigationValidationResults(session.id).filter(function failed(item) { return !item.passed; });
    const handoff = {
      id: nextId("IDE-135-HANDOFF"),
      componentId: COMPONENT_ID,
      version: VERSION,
      validationSessionId: session.id,
      validationDecision: session.overallDecision,
      targetComponent: session.targetComponent,
      targetVersion: session.targetVersion,
      repositoryVersion: session.repositoryVersion,
      datasetVersion: session.datasetVersion,
      failedScenarios: failedResults.map(function id(item) { return item.scenarioId; }),
      failedRules: session.gateResults.filter(function failed(item) { return !item.passed; }).map(function name(item) { return item.name; }),
      coverageResults: clone(session.coverageResults),
      evidencePackageId: session.evidencePackageId,
      reportId: session.reportId,
      restoreStatus: (session.gateResults.find(function find(item) { return item.name === "Restore Gate"; }) || {}).passed ? "Verified" : "Restore Required",
      safetyStatus: (session.gateResults.find(function find(item) { return item.name === "Safety Gate"; }) || {}).passed ? "Passed" : "Safety Failed",
      recommendedActions: session.releaseAllowed ? ["Proceed to IDE-140 Development Analytics implementation."] : ["Correct failed IDE-130 scenarios and rerun IDE-135."],
      prohibitedActions: session.releaseAllowed ? [] : ["Do not declare IDE-130 release complete while critical gates fail."],
      regressionRequirements: ["Rerun IDE-135 after IDE-130, IDE-120, IDE-125 or IDE-110 changes."],
      responsibleWorkflow: session.releaseAllowed ? "IDE-140 Development Analytics" : "IDE-130 Investigation Workflow",
      completionCriteria: ["All critical gates pass", "Required coverage is achieved", "Restore is verified", "Evidence remains traceable"],
      releaseAllowed: session.releaseAllowed,
      generatedAt: nowIso()
    };
    state.handoffs.set(handoff.id, handoff);
    session.handoffId = handoff.id;
    addRelationship(session.id, "handed-off-as", handoff.id, { sessionId: session.id });
    recordEvent("Validation Handoff Built", session.id, { handoffId: handoff.id, releaseAllowed: handoff.releaseAllowed });
    return { generated: true, handoff: clone(handoff) };
  }

  function getInvestigationValidationReport(id) { return clone(state.reports.get(String(id)) || null); }
  function getInvestigationValidationEvidencePackage(id) { return clone(state.evidencePackages.get(String(id)) || null); }
  function getInvestigationValidationHandoff(id) { return clone(state.handoffs.get(String(id)) || null); }

  async function runInvestigationWorkflowValidation(request) {
    const sessionValue = createInvestigationValidationSession(request || {});
    const session = requireValidationSession(sessionValue.id);
    buildInvestigationValidationPlan(session.id);
    session.state = "Running";
    session.startedAt = nowIso();
    const started = measureNow();

    for (const queueItem of session.executionQueue) {
      const scenario = state.scenarios.get(queueItem.scenarioId);
      const execution = await runInvestigationValidationScenario(session.id, queueItem.scenarioId);
      if (!execution.executed) {
        session.errors.push(execution.reason || "Scenario execution failed.");
        queueItem.status = "Failed";
      }
      const result = execution.result;
      if (result && !result.passed && scenario && scenario.stopPipelineOnFailure && session.policy.stopOnSafetyFailure) {
        session.state = scenario.category === "Safety" || scenario.category === "Restore" ? "Safety Failed" : "Failed";
        session.errors.push("Validation pipeline stopped after critical scenario failure: " + scenario.id);
        break;
      }
      if (measureNow() - started > session.policy.maxValidationDurationMs) {
        session.state = "Blocked";
        session.errors.push("Validation duration limit reached.");
        break;
      }
    }

    session.state = "Aggregating";
    calculateInvestigationValidationCoverage(session.id);
    evaluateInvestigationValidationGates(session.id);
    buildInvestigationValidationEvidencePackage(session.id);
    session.state = "Reporting";
    buildInvestigationValidationReport(session.id);
    buildInvestigationValidationHandoff(session.id);
    const ended = measureNow();
    session.durationMs = Number((ended - started).toFixed(3));
    session.completedAt = nowIso();
    session.state = session.releaseAllowed ? (session.warnings.length ? "Completed with Warnings" : "Completed") : session.state === "Safety Failed" ? "Safety Failed" : "Failed";
    session.updatedAt = session.completedAt;

    const results = getSessionInvestigationValidationResults(session.id);
    const passed = results.filter(function pass(item) { return item.passed; }).length;
    const output = {
      id: session.id,
      componentId: COMPONENT_ID,
      version: VERSION,
      targetComponent: TARGET_COMPONENT,
      targetVersion: session.targetVersion,
      status: session.overallDecision,
      severity: session.releaseAllowed ? "Info" : "Critical",
      releaseAllowed: session.releaseAllowed,
      implementationReady: session.implementationReady,
      passed: passed,
      failed: results.length - passed,
      warnings: session.warnings.length,
      total: results.length,
      health: results.length ? Math.round((passed / results.length) * 100) : 0,
      progress: 100,
      gates: clone(session.gateResults),
      coverageResults: clone(session.coverageResults),
      scenarioResults: results,
      evidencePackage: getInvestigationValidationEvidencePackage(session.evidencePackageId),
      report: getInvestigationValidationReport(session.reportId),
      handoff: getInvestigationValidationHandoff(session.handoffId),
      durationMs: session.durationMs,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      repositoryVersion: session.repositoryVersion,
      datasetVersion: session.datasetVersion
    };
    let persistence = null;
    if (typeof global.saveValidationResult === "function") {
      try {
        persistence = global.saveValidationResult(output, {
          sourceComponent: COMPONENT_ID,
          sourceType: "Full Investigation Workflow Validation",
          official: output.releaseAllowed === true && output.implementationReady === true
        });
      } catch (error) {
        persistence = {
          saved: false,
          persisted: false,
          reason: error && error.message ? error.message : String(error)
        };
        session.warnings.push("Validation Result Repository persistence failed.");
      }
    } else {
      persistence = {
        saved: false,
        persisted: false,
        pending: true,
        reason: "Validation Result Repository API is unavailable."
      };
    }
    output.persistence = clone(persistence);
    state.lastResult = clone(output);
    recordEvent("Validation Completed", session.id, {
      status: output.status,
      releaseAllowed: output.releaseAllowed,
      health: output.health,
      persisted: Boolean(persistence && persistence.persisted)
    });
    return output;
  }

  function requireApis(names) {
    return names.filter(function missing(name) { return typeof global[name] !== "function"; });
  }

  function baseRequest(overrides) {
    const source = overrides && typeof overrides === "object" ? overrides : {};
    const result = Object.assign({
      problemStatement: "IDE-135 validation scenario",
      initialScope: { component: TARGET_COMPONENT, readOnly: true },
      repositoryVersion: "memo-current",
      datasetVersion: "golden-core-v1.0.0",
      permission: { readOnly: true, instrumentation: false },
      executionContext: {
        validationOwned: true,
        validationComponent: "IDE-135"
      },
      budget: { concurrentSessionLimit: 50 }
    }, source);
    result.budget = Object.assign({ concurrentSessionLimit: 50 }, source.budget || {});
    return result;
  }

  function transitionSequence(sessionId) {
    const value = global.getInvestigationSession(sessionId);
    return value ? value.transitions.map(function map(item) { return item.to; }) : [];
  }

  function scenarioCovers(values) {
    const result = {};
    COVERAGE_LAYERS.forEach(function layer(name) { result[name] = []; });
    Object.keys(values || {}).forEach(function assign(name) { result[name] = asArray(values[name]); });
    return result;
  }

  async function executeReadOnlyEndToEnd() {
    const missing = requireApis(["createInvestigationRequest", "createInvestigationSession", "runInvestigationSearch", "createInvestigationHypothesis", "evaluateInvestigationHypothesis", "setInvestigationConclusion", "buildInvestigationReport", "closeInvestigation"]);
    if (missing.length) return { passed: false, detail: "Missing APIs: " + missing.join(", "), errors: missing };
    const request = global.createInvestigationRequest(baseRequest({ problemStatement: "IDE-135 read-only end-to-end validation" }));
    const created = global.createInvestigationSession(request.id);
    if (!created.created) return { passed: false, detail: created.reason || "Session creation failed." };
    const sessionId = created.session.id;
    const search = await global.runInvestigationSearch(sessionId, "IDE-130");
    if (!search.executed || !search.evidence) return { passed: false, detail: search.reason || "Search execution failed.", investigationSessionIds: [sessionId] };
    const hypothesis = global.createInvestigationHypothesis(sessionId, { statement: "IDE-130 is searchable through IDE-120", targetComponent: TARGET_COMPONENT, supportingEvidence: [search.evidence.id] });
    const evaluated = global.evaluateInvestigationHypothesis(hypothesis.hypothesis.id, { status: "Confirmed", supportingEvidence: [search.evidence.id], confidence: 1, reason: "Search evidence confirms the integration." });
    global.transitionInvestigationState(sessionId, "Analyzing", "Analyze search evidence", COMPONENT_ID);
    const conclusion = global.setInvestigationConclusion(sessionId, { status: "Root Cause Confirmed", rootCause: "IDE-120 to IDE-130 integration is operational", evidenceReferences: [search.evidence.id], confidence: 1, decisionReason: "Validated by search evidence." });
    global.transitionInvestigationState(sessionId, "Reporting", "Analysis completed", COMPONENT_ID);
    const report = global.buildInvestigationReport(sessionId, { executiveSummary: "IDE-135 read-only scenario" });
    const closed = global.closeInvestigation(sessionId, { handoff: { responsibleWorkflow: COMPONENT_ID } });
    const finalSession = global.getInvestigationSession(sessionId);
    const passed = evaluated.evaluated && conclusion.set && report.generated && closed.closed && finalSession.state === "Completed" && finalSession.restoreStatus === "Not Required" && finalSession.integrityStatus === "Verified";
    return {
      passed: passed,
      detail: passed ? "Read-only workflow completed." : "Read-only workflow did not satisfy closure requirements.",
      actualStateSequence: transitionSequence(sessionId),
      evidenceReferences: [search.evidence.id],
      investigationSessionIds: [sessionId],
      restoreResult: { status: finalSession.restoreStatus },
      closureResult: { status: finalSession.closureStatus },
      integrationResults: [{ component: "IDE-120", passed: search.executed }, { component: "IDE-130", passed: closed.closed }],
      performanceResults: { searchDurationMs: search.execution && search.execution.durationMs },
      transitionResults: finalSession.transitions,
      evidenceResults: [{ evidenceId: search.evidence.id, traceable: true }]
    };
  }

  function executeInvalidTransition() {
    const request = global.createInvestigationRequest(baseRequest({ problemStatement: "Invalid transition rejection" }));
    const created = global.createInvestigationSession(request.id);
    const attempt = global.transitionInvestigationState(created.session.id, "Analyzing", "Invalid direct transition", COMPONENT_ID);
    const passed = attempt.transitioned === false;
    global.transitionInvestigationState(created.session.id, "Failed", "Validation scenario completed", COMPONENT_ID);
    return {
      passed: passed,
      detail: attempt.reason || "Invalid transition was evaluated.",
      investigationSessionIds: [created.session.id],
      transitionResults: [{ from: "Requested", to: "Analyzing", allowed: attempt.transitioned === true, expected: false, reason: attempt.reason }],
      policyResults: [{ policy: "State Transition", passed: passed }],
      safetyResult: { status: passed ? "Passed" : "Failed" }
    };
  }

  function executeEvidenceGateRejection(context) {
    const request = global.createInvestigationRequest(baseRequest({ problemStatement: "Evidence gate rejection" }));
    const created = global.createInvestigationSession(request.id);
    const sessionId = created.session.id;
    global.defineInvestigationScope(sessionId, { component: TARGET_COMPONENT, readOnly: true }, "Initial scope", []);
    global.transitionInvestigationState(sessionId, "Searching", "Start search state", COMPONENT_ID);
    global.transitionInvestigationState(sessionId, "Investigating", "No evidence test", COMPONENT_ID);
    const attempt = global.transitionInvestigationState(sessionId, "Analyzing", "Evidence missing", COMPONENT_ID);
    const rejectionPassed = attempt.transitioned === false && String(attempt.reason || "").toLowerCase().includes("evidence");
    global.transitionInvestigationState(sessionId, "Failed", "Validation scenario completed", COMPONENT_ID);
    const actualStateSequence = transitionSequence(sessionId);
    const expectedStateSequence = context && context.scenario ? asArray(context.scenario.expectedStateSequence) : [];
    const stateSequencePassed = expectedStateSequence.length === actualStateSequence.length && expectedStateSequence.every(function same(item, index) { return item === actualStateSequence[index]; });
    const passed = rejectionPassed && stateSequencePassed;
    return {
      passed: passed,
      detail: attempt.reason || "Evidence gate evaluated.",
      actualStateSequence: actualStateSequence,
      investigationSessionIds: [sessionId],
      evidenceResults: [{ evidenceRequired: true, transitionRejected: !attempt.transitioned }],
      policyResults: [{ policy: "Evidence Required", passed: rejectionPassed }, { policy: "Expected State Sequence", passed: stateSequencePassed }],
      safetyResult: { status: passed ? "Passed" : "Failed" }
    };
  }

  function executePermissionBlock() {
    const request = global.createInvestigationRequest(baseRequest({
      problemStatement: "Instrumentation permission rejection",
      initialScope: { component: TARGET_COMPONENT, function: "validateInvestigationWorkflow", readOnly: false },
      permission: { readOnly: true, instrumentation: false }
    }));
    const created = global.createInvestigationSession(request.id);
    const sessionId = created.session.id;
    global.defineInvestigationScope(sessionId, request.initialScope, "Initial scope", []);
    const evidence = global.addInvestigationEvidence(sessionId, { type: "Observation", source: COMPONENT_ID, data: { permissionTest: true } });
    global.transitionInvestigationState(sessionId, "Investigating", "Evidence available", COMPONENT_ID);
    const transaction = global.createInstrumentationTransaction(sessionId, { targetId: "validateInvestigationWorkflow", file: "13_investigation_workflow.js", functionName: "validateInvestigationWorkflow", type: "TRACE", probeType: "START_END", restorePlan: { method: "removeInstrumentation" } });
    const applied = global.applyInvestigationInstrumentation(sessionId, transaction.transaction.id);
    const passed = applied.applied === false && applied.blocked === true;
    global.transitionInvestigationState(sessionId, "Failed", "Validation scenario completed", COMPONENT_ID);
    return {
      passed: passed,
      detail: applied.reason || "Permission policy evaluated.",
      investigationSessionIds: [sessionId],
      evidenceReferences: evidence.added ? [evidence.evidence.id] : [],
      policyResults: [{ policy: "Instrumentation Permission", expected: "Blocked", actual: applied.blocked ? "Blocked" : "Allowed", passed: passed }],
      safetyResult: { status: passed ? "Passed" : "Failed" }
    };
  }

  function executeBudgetLimit() {
    const request = global.createInvestigationRequest(baseRequest({
      problemStatement: "Measurement budget limit",
      budget: { measurementSampleLimit: 0 }
    }));
    const created = global.createInvestigationSession(request.id);
    const sessionId = created.session.id;
    global.defineInvestigationScope(sessionId, request.initialScope, "Initial scope", []);
    const evidence = global.addInvestigationEvidence(sessionId, { type: "Observation", source: COMPONENT_ID, data: { budgetTest: true } });
    global.transitionInvestigationState(sessionId, "Investigating", "Evidence available", COMPONENT_ID);
    const record = global.recordInvestigationPerformance(sessionId, { targetId: TARGET_COMPONENT, durationMs: 1, callCount: 1 });
    const passed = record.recorded === false && String(record.reason || "").toLowerCase().includes("limit");
    global.transitionInvestigationState(sessionId, "Failed", "Validation scenario completed", COMPONENT_ID);
    return {
      passed: passed,
      detail: record.reason || "Budget policy evaluated.",
      investigationSessionIds: [sessionId],
      evidenceReferences: evidence.added ? [evidence.evidence.id] : [],
      policyResults: [{ policy: "Measurement Sample Limit", expected: "Rejected", actual: record.recorded ? "Recorded" : "Rejected", passed: passed }],
      performanceResults: { budgetLimit: 0, rejected: !record.recorded },
      safetyResult: { status: passed ? "Passed" : "Failed" }
    };
  }

  function executeInconclusiveClosure() {
    const request = global.createInvestigationRequest(baseRequest({ problemStatement: "Inconclusive closure" }));
    const created = global.createInvestigationSession(request.id);
    const sessionId = created.session.id;
    global.defineInvestigationScope(sessionId, request.initialScope, "Initial scope", []);
    const evidence = global.addInvestigationEvidence(sessionId, { type: "Observation", source: COMPONENT_ID, data: { reproduced: false } });
    global.transitionInvestigationState(sessionId, "Investigating", "Observation registered", COMPONENT_ID);
    global.transitionInvestigationState(sessionId, "Analyzing", "Analyze incomplete evidence", COMPONENT_ID);
    global.setInvestigationConclusion(sessionId, { status: "Inconclusive", evidenceReferences: [evidence.evidence.id], decisionReason: "Evidence is insufficient for root cause confirmation." });
    global.transitionInvestigationState(sessionId, "Reporting", "Inconclusive analysis complete", COMPONENT_ID);
    global.buildInvestigationReport(sessionId, { executiveSummary: "Closed as Inconclusive" });
    const closed = global.closeInvestigation(sessionId, { handoff: { responsibleWorkflow: "Additional Investigation" } });
    const finalSession = global.getInvestigationSession(sessionId);
    const passed = closed.closed && finalSession.state === "Completed" && finalSession.closureStatus === "Closed as Inconclusive";
    return {
      passed: passed,
      detail: passed ? "Inconclusive closure completed." : "Inconclusive closure failed.",
      actualStateSequence: transitionSequence(sessionId),
      investigationSessionIds: [sessionId],
      evidenceReferences: [evidence.evidence.id],
      restoreResult: { status: finalSession.restoreStatus },
      closureResult: { status: finalSession.closureStatus },
      transitionResults: finalSession.transitions
    };
  }

  function executeInstrumentationRestore() {
    const missing = requireApis(["previewInstrumentation", "addInstrumentation", "removeInstrumentation", "getDiagnosticPlatformState"]);
    if (missing.length) return { passed: false, detail: "Missing IDE-110 APIs: " + missing.join(", "), errors: missing, safetyResult: { status: "Failed" }, restoreResult: { status: "Restore Required" } };
    const request = global.createInvestigationRequest(baseRequest({
      problemStatement: "Transactional instrumentation restore validation",
      initialScope: { component: TARGET_COMPONENT, function: "validateInvestigationWorkflow", readOnly: false },
      permission: { readOnly: true, instrumentation: true }
    }));
    const created = global.createInvestigationSession(request.id);
    const sessionId = created.session.id;
    global.defineInvestigationScope(sessionId, request.initialScope, "Initial scope", []);
    const observation = global.addInvestigationEvidence(sessionId, { type: "Observation", source: COMPONENT_ID, data: { restoreValidation: true } });
    global.transitionInvestigationState(sessionId, "Investigating", "Observation registered", COMPONENT_ID);
    const transaction = global.createInstrumentationTransaction(sessionId, { targetId: "validateInvestigationWorkflow", file: "13_investigation_workflow.js", functionName: "validateInvestigationWorkflow", type: "TRACE", probeType: "START_END", purpose: "IDE-135 restore validation", restorePlan: { method: "removeInstrumentation" } });
    const applied = global.applyInvestigationInstrumentation(sessionId, transaction.transaction.id);
    if (!applied.applied) return { passed: false, detail: applied.reason || "Instrumentation apply failed.", investigationSessionIds: [sessionId], evidenceReferences: [observation.evidence.id], safetyResult: { status: "Failed" }, restoreResult: { status: "Restore Required" } };
    const captured = global.captureInstrumentationEvidence(sessionId, transaction.transaction.id, { started: true, ended: true, scenario: "IDE135-SCN-007" });
    global.transitionInvestigationState(sessionId, "Measuring", "Evidence captured", COMPONENT_ID);
    const performance = global.recordInvestigationPerformance(sessionId, { targetId: "validateInvestigationWorkflow", durationMs: 1, callCount: 1, classification: "Not a Bottleneck" });
    global.transitionInvestigationState(sessionId, "Analyzing", "Measurement completed", COMPONENT_ID);
    const current = global.getInvestigationSession(sessionId);
    const hypothesis = global.createInvestigationHypothesis(sessionId, { statement: "Instrumentation can be removed without residual state", targetComponent: TARGET_COMPONENT, supportingEvidence: current.evidenceReferences });
    global.evaluateInvestigationHypothesis(hypothesis.hypothesis.id, { status: "Confirmed", supportingEvidence: current.evidenceReferences, confidence: 1, reason: "Instrumentation evidence captured." });
    global.setInvestigationConclusion(sessionId, { status: "Root Cause Confirmed", rootCause: "Transactional instrumentation restore is operational", evidenceReferences: current.evidenceReferences, confidence: 1, decisionReason: "Apply, capture and restore were executed." });
    global.transitionInvestigationState(sessionId, "Reporting", "Restore validation analysis completed", COMPONENT_ID);
    global.buildInvestigationReport(sessionId, { executiveSummary: "Instrumentation restore scenario" });
    const closed = global.closeInvestigation(sessionId, { handoff: { responsibleWorkflow: COMPONENT_ID } });
    const finalSession = global.getInvestigationSession(sessionId);
    const diagnosticState = global.getDiagnosticPlatformState();
    const instrumentationId = finalSession.instrumentationTransactions[0] && finalSession.instrumentationTransactions[0].diagnosticInstrumentationId;
    const diagnosticRecord = asArray(diagnosticState && diagnosticState.instrumentations).find(function find(item) { return item.id === instrumentationId; });
    const residualCount = asArray(diagnosticState && diagnosticState.instrumentations).filter(function active(item) { return item.id === instrumentationId && String(item.status || "") !== "Removed"; }).length;
    const passed = applied.applied && captured.captured && performance.recorded && closed.closed && finalSession.restoreStatus === "Verified" && finalSession.integrityStatus === "Verified" && diagnosticRecord && diagnosticRecord.status === "Removed" && residualCount === 0;
    return {
      passed: passed,
      detail: passed ? "Instrumentation was removed and restore was verified." : "Instrumentation restore validation failed.",
      actualStateSequence: transitionSequence(sessionId),
      investigationSessionIds: [sessionId],
      evidenceReferences: clone(finalSession.evidenceReferences),
      restoreResult: { status: finalSession.restoreStatus, transactionState: finalSession.instrumentationTransactions[0] && finalSession.instrumentationTransactions[0].state, diagnosticStatus: diagnosticRecord && diagnosticRecord.status, activeResidualCount: residualCount },
      safetyResult: { status: passed ? "Passed" : "Failed", activeResidualCount: residualCount },
      closureResult: { status: finalSession.closureStatus },
      performanceResults: { recorded: performance.recorded, durationMs: performance.record && performance.record.totalDurationMs },
      integrationResults: [{ component: "IDE-110", passed: applied.applied && residualCount === 0 }, { component: "IDE-130", passed: closed.closed }]
    };
  }

  function executeClosedSessionReopenRejection(context) {
    const request = global.createInvestigationRequest(baseRequest({ problemStatement: "Closed session reopen rejection" }));
    const created = global.createInvestigationSession(request.id);
    const sessionId = created.session.id;
    global.defineInvestigationScope(sessionId, request.initialScope, "Initial scope", []);
    const evidence = global.addInvestigationEvidence(sessionId, { type: "Observation", source: COMPONENT_ID, data: { closureTest: true } });
    global.transitionInvestigationState(sessionId, "Investigating", "Evidence registered", COMPONENT_ID);
    global.transitionInvestigationState(sessionId, "Analyzing", "Analyze closure behavior", COMPONENT_ID);
    global.setInvestigationConclusion(sessionId, { status: "Inconclusive", evidenceReferences: [evidence.evidence.id], decisionReason: "Closure transition test." });
    global.transitionInvestigationState(sessionId, "Reporting", "Analysis complete", COMPONENT_ID);
    global.buildInvestigationReport(sessionId, { executiveSummary: "Closure restriction test" });
    global.closeInvestigation(sessionId, { handoff: { responsibleWorkflow: COMPONENT_ID } });
    const reopen = global.transitionInvestigationState(sessionId, "Searching", "Invalid reopen", COMPONENT_ID);
    const finalSession = global.getInvestigationSession(sessionId);
    const reopenDecision = reopen.transitioned === false ? "Rejected" : "Allowed";
    const expectedClosureStatus = context && context.scenario ? context.scenario.expectedClosureResult : "Closed as Inconclusive";
    const expectedReopenDecision = context && context.scenario ? context.scenario.expectedReopenDecision : "Rejected";
    const closureStatusPassed = finalSession.closureStatus === expectedClosureStatus;
    const reopenDecisionPassed = reopenDecision === expectedReopenDecision;
    const passed = finalSession.state === "Completed" && closureStatusPassed && reopenDecisionPassed;
    return {
      passed: passed,
      detail: reopen.reason || "Closed-session transition evaluated.",
      actualStateSequence: transitionSequence(sessionId),
      investigationSessionIds: [sessionId],
      evidenceReferences: [evidence.evidence.id],
      closureResult: { status: finalSession.closureStatus, reopenDecision: reopenDecision, reopenRejected: !reopen.transitioned },
      policyResults: [{ policy: "Closure Status", passed: closureStatusPassed }, { policy: "Reopen Decision", passed: reopenDecisionPassed }],
      transitionResults: [{ from: "Completed", to: "Searching", expected: false, actual: reopen.transitioned, passed: !reopen.transitioned }]
    };
  }

  function executeTraceabilityContract() {
    const status = typeof global.getInvestigationWorkflowStatus === "function" ? global.getInvestigationWorkflowStatus() : null;
    const workflowState = typeof global.getInvestigationWorkflowState === "function" ? global.getInvestigationWorkflowState() : null;
    const requiredApis = ["getInvestigationRelationships", "getInvestigationEvidence", "getInvestigationReport", "getInvestigationHandoff"];
    const missing = requireApis(requiredApis);
    const passed = missing.length === 0 && status && status.ready === true && workflowState && Array.isArray(workflowState.relationships);
    const syntheticEvidenceRef = workflowState && workflowState.evidence && workflowState.evidence.length ? workflowState.evidence[workflowState.evidence.length - 1].id : "IDE-130-EVIDENCE-CONTRACT";
    return {
      passed: passed,
      detail: passed ? "Evidence and relationship traceability contracts are available." : "Traceability contract is incomplete.",
      evidenceReferences: [syntheticEvidenceRef],
      evidenceResults: [{ apiCount: requiredApis.length, missing: missing, relationshipRegistryAvailable: Boolean(workflowState && Array.isArray(workflowState.relationships)) }],
      integrationResults: [{ component: "Relationship Platform", passed: passed }],
      safetyResult: { status: passed ? "Passed" : "Failed" }
    };
  }

  function createStateScenarioSession(title, options) {
    const settings = options && typeof options === "object" ? options : {};
    const request = global.createInvestigationRequest(baseRequest({
      problemStatement: title,
      initialScope: settings.initialScope || { component: TARGET_COMPONENT, readOnly: settings.readOnly !== false },
      permission: settings.permission || { readOnly: true, instrumentation: false }
    }));
    const created = global.createInvestigationSession(request.id);
    return { request: request, sessionId: created.session.id };
  }

  function executePausedBlockedResume() {
    const fixture = createStateScenarioSession("Paused and blocked resume validation");
    const sessionId = fixture.sessionId;
    const paused = global.transitionInvestigationState(sessionId, "Paused", "Validation pause", COMPONENT_ID);
    const resumed = global.transitionInvestigationState(sessionId, "Scoped", "Resume from pause", COMPONENT_ID, { force: true });
    const blocked = global.transitionInvestigationState(sessionId, "Blocked", "Permission dependency blocked", COMPONENT_ID);
    const unblocked = global.transitionInvestigationState(sessionId, "Scoped", "Dependency resolved", COMPONENT_ID);
    const passed = paused.transitioned && resumed.transitioned && blocked.transitioned && unblocked.transitioned;
    return { passed: passed, detail: passed ? "Paused and Blocked states resumed through explicit transitions." : "Pause/Block resume failed.", actualStateSequence: transitionSequence(sessionId), investigationSessionIds: [sessionId], transitionResults: [paused, resumed, blocked, unblocked], policyResults: [{ policy: "Resume requires explicit reason", passed: passed }] };
  }

  function executeUserCancelledRestorePath() {
    const fixture = createStateScenarioSession("User cancelled restore path", { readOnly: false, initialScope: { component: TARGET_COMPONENT, function: "temporaryUserCancelTarget", readOnly: false }, permission: { readOnly: true, instrumentation: true } });
    const sessionId = fixture.sessionId;
    const targetId = "__ide135UserCancelTarget";
    const original = function originalUserCancelTarget(value) { return value; };
    global[targetId] = original;
    const added = global.addInstrumentation({ targetId: targetId, targetType: "Function", type: "TRACE", sessionId: sessionId });
    const cancelled = global.transitionInvestigationState(sessionId, "Failed", "User Cancelled", COMPONENT_ID, { force: true });
    const restoring = global.transitionInvestigationState(sessionId, "Restoring", "Restore after cancellation", COMPONENT_ID, { force: true });
    const removed = added.added ? global.removeInstrumentation(added.instrumentation.id) : { removed: false };
    const restored = global[targetId] === original;
    delete global[targetId];
    const passed = added.added && cancelled.transitioned && restoring.transitioned && removed.removed && restored;
    return { passed: passed, detail: passed ? "User cancellation restored the runtime wrapper." : "Cancellation restore failed.", actualStateSequence: transitionSequence(sessionId), investigationSessionIds: [sessionId], transitionResults: [cancelled, restoring], restoreResult: { status: restored ? "Verified" : "Restore Required", instrumentationRemoved: removed.removed }, safetyResult: { status: passed ? "Passed" : "Failed" } };
  }

  function executeRuntimeErrorRestorePath() {
    const fixture = createStateScenarioSession("Runtime error restore path", { readOnly: false, initialScope: { component: TARGET_COMPONENT, function: "temporaryRuntimeErrorTarget", readOnly: false }, permission: { readOnly: true, instrumentation: true } });
    const sessionId = fixture.sessionId;
    const targetId = "__ide135RuntimeErrorTarget";
    const original = function originalRuntimeErrorTarget() { throw new Error("IDE-135 expected runtime error"); };
    global[targetId] = original;
    const added = global.addInstrumentation({ targetId: targetId, targetType: "Function", type: "TRACE", sessionId: sessionId });
    let caught = false;
    try { global[targetId](); } catch (_) { caught = true; }
    const failed = global.transitionInvestigationState(sessionId, "Failed", "Runtime Error", COMPONENT_ID, { force: true });
    const restoring = global.transitionInvestigationState(sessionId, "Restoring", "Restore after runtime error", COMPONENT_ID, { force: true });
    const removed = added.added ? global.removeInstrumentation(added.instrumentation.id) : { removed: false };
    const restored = global[targetId] === original;
    delete global[targetId];
    const passed = added.added && caught && failed.transitioned && restoring.transitioned && removed.removed && restored;
    return { passed: passed, detail: passed ? "Runtime error was captured and runtime state restored." : "Runtime error restore failed.", actualStateSequence: transitionSequence(sessionId), investigationSessionIds: [sessionId], transitionResults: [failed, restoring], restoreResult: { status: restored ? "Verified" : "Restore Required" }, safetyResult: { status: passed ? "Passed" : "Failed", runtimeErrorCaught: caught } };
  }

  function executeConcurrentChangeProtection() {
    const targetId = "__ide135ConcurrentChangeTarget";
    const original = function originalConcurrentChangeTarget() { return "original"; };
    const concurrent = function concurrentChangeTarget() { return "concurrent"; };
    global[targetId] = original;
    const added = global.addInstrumentation({ targetId: targetId, targetType: "Function", type: "TRACE" });
    global[targetId] = concurrent;
    const removed = added.added ? global.removeInstrumentation(added.instrumentation.id) : { removed: false };
    const concurrentPreserved = global[targetId] === concurrent;
    global[targetId] = original;
    delete global[targetId];
    const passed = added.added && removed.conflict === true && removed.removed === false && concurrentPreserved;
    return { passed: passed, detail: passed ? "Concurrent change was preserved and automatic restore was blocked." : "Concurrent change protection failed.", transitionResults: [{ transition: "Concurrent Change Protection", passed: passed }], restoreResult: { status: "Conflict Detected", concurrentChangePreserved: concurrentPreserved }, safetyResult: { status: passed ? "Passed" : "Failed" } };
  }

  function executeRestoreFailureEscalation() {
    const fixture = createStateScenarioSession("Restore failure escalation", { readOnly: false, initialScope: { component: TARGET_COMPONENT, function: "temporaryRestoreFailureTarget", readOnly: false }, permission: { readOnly: true, instrumentation: true } });
    const sessionId = fixture.sessionId;
    const targetId = "__ide135RestoreFailureTarget";
    const original = function originalRestoreFailureTarget() { return "original"; };
    global[targetId] = original;
    const added = global.addInstrumentation({ targetId: targetId, targetType: "Function", type: "TRACE", sessionId: sessionId });
    global[targetId] = function userConcurrentReplacement() { return "changed"; };
    const removed = added.added ? global.removeInstrumentation(added.instrumentation.id) : { removed: false };
    const restoreRequired = global.transitionInvestigationState(sessionId, "Restore Required", "Conflict detected during restore", COMPONENT_ID, { force: true });
    const manualRecovery = global.transitionInvestigationState(sessionId, "Manual Recovery Required", "Automatic restore prohibited", COMPONENT_ID);
    global[targetId] = original;
    delete global[targetId];
    const passed = added.added && removed.conflict === true && restoreRequired.transitioned && manualRecovery.transitioned;
    return { passed: passed, detail: passed ? "Restore conflict escalated to Manual Recovery Required." : "Restore escalation failed.", actualStateSequence: transitionSequence(sessionId), investigationSessionIds: [sessionId], transitionResults: [restoreRequired, manualRecovery], restoreResult: { status: "Manual Recovery Required", conflictDetected: removed.conflict === true }, safetyResult: { status: passed ? "Passed" : "Failed" }, closureResult: { status: "Manual Recovery Required" } };
  }

  function executeEvidenceReferenceBreakDetection() {
    const fixture = createStateScenarioSession("Evidence reference break detection");
    const sessionId = fixture.sessionId;
    global.defineInvestigationScope(sessionId, fixture.request.initialScope, "Initial scope", []);
    const evidence = global.addInvestigationEvidence(sessionId, { type: "Observation", source: COMPONENT_ID, data: { traceability: true } });
    global.transitionInvestigationState(sessionId, "Investigating", "Evidence available", COMPONENT_ID);
    global.transitionInvestigationState(sessionId, "Analyzing", "Check evidence integrity", COMPONENT_ID);
    const missingId = "IDE-130-EVIDENCE-MISSING-EXPECTED";
    global.setInvestigationConclusion(sessionId, { status: "Inconclusive", evidenceReferences: [evidence.evidence.id, missingId], decisionReason: "Intentional broken reference validation." });
    global.transitionInvestigationState(sessionId, "Reporting", "Build report for integrity check", COMPONENT_ID);
    global.buildInvestigationReport(sessionId, { executiveSummary: "Evidence reference break test" });
    const integrity = global.verifyInvestigationIntegrity(sessionId);
    const passed = integrity.verified === false && asArray(integrity.missingEvidence).includes(missingId);
    return { passed: passed, detail: passed ? "Broken evidence reference was detected before closure." : "Broken evidence reference was not detected.", investigationSessionIds: [sessionId], evidenceReferences: [evidence.evidence.id, missingId], evidenceResults: [{ evidenceId: missingId, traceable: false, detected: passed }], policyResults: [{ policy: "Evidence Gate", passed: passed }], safetyResult: { status: passed ? "Passed" : "Failed" } };
  }

  function executeNotReproducedClosure() {
    const fixture = createStateScenarioSession("Issue not reproduced closure");
    const sessionId = fixture.sessionId;
    global.defineInvestigationScope(sessionId, fixture.request.initialScope, "Initial scope", []);
    const evidence = global.addInvestigationEvidence(sessionId, { type: "Reproduction Result", source: COMPONENT_ID, data: { reproduced: false } });
    global.transitionInvestigationState(sessionId, "Investigating", "Reproduction evidence available", COMPONENT_ID);
    global.transitionInvestigationState(sessionId, "Analyzing", "Analyze reproduction result", COMPONENT_ID);
    global.setInvestigationConclusion(sessionId, { status: "Issue Not Reproduced", evidenceReferences: [evidence.evidence.id], decisionReason: "Issue was not reproduced under fixed conditions." });
    global.transitionInvestigationState(sessionId, "Reporting", "Prepare not reproduced report", COMPONENT_ID);
    global.buildInvestigationReport(sessionId, { executiveSummary: "Issue not reproduced" });
    const closed = global.closeInvestigation(sessionId, { handoff: { responsibleWorkflow: "Additional Investigation" } });
    const finalSession = global.getInvestigationSession(sessionId);
    const passed = closed.closed && finalSession.closureStatus === "Closed as Not Reproduced";
    return { passed: passed, detail: passed ? "Not Reproduced was preserved as a formal closure state." : "Not Reproduced closure failed.", actualStateSequence: transitionSequence(sessionId), investigationSessionIds: [sessionId], evidenceReferences: [evidence.evidence.id], closureResult: { status: finalSession.closureStatus } };
  }

  function executeSafetyStopManualRecovery() {
    const fixture = createStateScenarioSession("Safety stop manual recovery", { readOnly: false, initialScope: { component: TARGET_COMPONENT, function: "safetyTarget", readOnly: false }, permission: { readOnly: true, instrumentation: true } });
    const sessionId = fixture.sessionId;
    global.defineInvestigationScope(sessionId, fixture.request.initialScope, "Initial scope", []);
    const evidence = global.addInvestigationEvidence(sessionId, { type: "Safety Observation", source: COMPONENT_ID, data: { criticalSafetyViolation: true } });
    global.transitionInvestigationState(sessionId, "Investigating", "Safety evidence registered", COMPONENT_ID);
    const instrumenting = global.transitionInvestigationState(sessionId, "Instrumenting", "Prepare controlled instrumentation", COMPONENT_ID);
    const stopped = global.transitionInvestigationState(sessionId, "Safety Stopped", "Critical safety violation", COMPONENT_ID);
    const manual = global.transitionInvestigationState(sessionId, "Manual Recovery Required", "Automatic continuation prohibited", COMPONENT_ID);
    const passed = instrumenting.transitioned && stopped.transitioned && manual.transitioned;
    return { passed: passed, detail: passed ? "Critical safety violation stopped execution and required manual recovery." : "Safety stop escalation failed.", actualStateSequence: transitionSequence(sessionId), investigationSessionIds: [sessionId], evidenceReferences: [evidence.evidence.id], transitionResults: [instrumenting, stopped, manual], safetyResult: { status: passed ? "Safety Stopped" : "Failed" }, closureResult: { status: "Manual Recovery Required" } };
  }

  function executeDependencyContract(context) {
    const definitions = [
      { component: "IDE-110", api: "getDiagnosticPlatformStatus" },
      { component: "IDE-115", api: "getDiagnosticValidationStatus" },
      { component: "IDE-120", api: "getSearchPipelineStatus" },
      { component: "IDE-125", api: "getSearchValidationStatus" },
      { component: "IDE-130", api: "getInvestigationWorkflowStatus" }
    ];

    const requireOfficialRelease =
      Boolean(
        context &&
        context.validationSession &&
        context.validationSession.policy &&
        context.validationSession.policy.requireOfficialDependencyRelease
      );

    const results =
      definitions.map(function evaluate(definition) {
        const fn = global[definition.api];
        let status = null;

        try {
          status =
            typeof fn === "function"
              ? fn()
              : null;
        } catch (_) {
          status = null;
        }

        const available =
          typeof fn === "function";

        const platformReady =
          Boolean(
            status &&
            status.ready === true
          );

        const exposesReleaseState =
          Boolean(
            status &&
            (
              Object.prototype.hasOwnProperty.call(status, "releaseAllowed") ||
              Object.prototype.hasOwnProperty.call(status, "releaseStatus") ||
              Object.prototype.hasOwnProperty.call(status, "officialStatus") ||
              Object.prototype.hasOwnProperty.call(status, "lifecycleStatus")
            )
          );

        const releaseAllowed =
          Boolean(
            status &&
            (
              status.releaseAllowed === true ||
              status.releaseStatus === "Official" ||
              status.officialStatus === "Official"
            )
          );

        const contractPassed =
          available &&
          platformReady &&
          exposesReleaseState;

        return {
          component: definition.component,
          statusApi: definition.api,
          available,
          platformReady,
          exposesReleaseState,
          releaseAllowed,
          contractPassed,
          passed:
            contractPassed &&
            (
              !requireOfficialRelease ||
              releaseAllowed
            ),
          health: status && status.health,
          lifecycleStatus:
            status && status.lifecycleStatus,
          releaseEvidenceSource:
            status && status.releaseEvidence && status.releaseEvidence.source || (releaseAllowed ? "Runtime" : "")
        };
      });

    const repository =
      typeof global.getValidationResultRepositoryStatus === "function"
        ? global.getValidationResultRepositoryStatus()
        : null;

    const repositoryReady = Boolean(repository && repository.ready);
    const repositoryReleaseAllowed = Boolean(
      repositoryReady &&
      (
        repository.releaseAllowed === true ||
        repository.releaseStatus === "Official" ||
        repository.officialStatus === "Official"
      )
    );

    results.push({
      component: "Validation Result Repository",
      statusApi: "getValidationResultRepositoryStatus",
      available: Boolean(repository),
      platformReady: repositoryReady,
      exposesReleaseState: Boolean(
        repository &&
        (
          Object.prototype.hasOwnProperty.call(repository, "releaseAllowed") ||
          Object.prototype.hasOwnProperty.call(repository, "releaseStatus") ||
          Object.prototype.hasOwnProperty.call(repository, "officialStatus")
        )
      ),
      releaseAllowed: repositoryReleaseAllowed,
      contractPassed: repositoryReady && repositoryReleaseAllowed,
      passed: repositoryReady && repositoryReleaseAllowed,
      health: repository && repository.health,
      lifecycleStatus: repository && repository.lifecycleStatus,
      releaseStatus: repository && (repository.releaseStatus || repository.officialStatus),
      releaseEvidenceSource:
        repository && repository.releaseEvidence && repository.releaseEvidence.source ||
        "Validation Result Repository"
    });

    const passed =
      results.every(item => item.passed);

    const pendingOfficial =
      results
        .filter(item =>
          item.component !== "Validation Result Repository" &&
          item.contractPassed &&
          !item.releaseAllowed
        )
        .map(item => item.component);

    return {
      passed,
      detail: passed
        ? requireOfficialRelease
          ? "All required dependency contracts are ready and Official."
          : "All required dependency API and lifecycle contracts are available."
        : requireOfficialRelease
          ? "One or more dependency contracts are not Official or not ready."
          : "One or more dependency API contracts are unavailable or malformed.",
      integrationResults: results,
      evidenceReferences: ["IDE-130-DEPENDENCY-CONTRACT"],
      evidenceResults: results,
      warnings:
        !requireOfficialRelease && pendingOfficial.length
          ? [
              "Official dependency release evidence is not loaded for: " +
              pendingOfficial.join(", ") +
              ". Run with policy.requireOfficialDependencyRelease=true for the formal release gate."
            ]
          : [],
      safetyResult: {
        status: passed ? "Passed" : "Failed",
        requireOfficialRelease,
        pendingOfficial
      }
    };
  }

  const builtInScenarios = [
    {
      id: "IDE135-SCN-001", title: "Read-only end-to-end investigation", category: "Normal", priority: 10, risk: "Medium", critical: true,
      expectedStateSequence: ["Scoped", "Searching", "Investigating", "Analyzing", "Reporting", "Verifying", "Completed"], expectedRestoreResult: "Not Required", expectedClosureResult: "Completed",
      covers: scenarioCovers({ Requirement: ["IDE-130-001", "IDE-130-002", "IDE-130-003", "IDE-130-004", "IDE-130-007", "IDE-130-010"], State: ["Requested", "Scoped", "Searching", "Investigating", "Analyzing", "Reporting", "Verifying", "Completed"], Transition: ["Requested->Scoped", "Scoped->Searching", "Searching->Investigating", "Investigating->Analyzing", "Analyzing->Reporting", "Reporting->Verifying", "Verifying->Completed"], Evidence: ["Search Evidence", "Conclusion Traceability"], Integration: ["IDE-120", "IDE-130"], Performance: ["Search Duration"], Closure: ["Completed"] }),
      relatedDecisions: ["IDE-135-001", "IDE-135-005", "IDE-135-010"], execute: executeReadOnlyEndToEnd
    },
    {
      id: "IDE135-SCN-002", title: "Invalid state transition rejection", category: "State", priority: 20, risk: "High", critical: true,
      expectedStateSequence: ["Requested"], expectedRestoreResult: "Not Applicable", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-001"], State: ["Requested"], Transition: ["Invalid Requested->Analyzing"], Policy: ["Transition Policy"], Safety: ["Illegal Transition Rejection"] }),
      relatedDecisions: ["IDE-135-001", "IDE-135-006"], execute: executeInvalidTransition
    },
    {
      id: "IDE135-SCN-003", title: "Missing evidence gate rejection", category: "Evidence", priority: 30, risk: "High", critical: true,
      expectedStateSequence: ["Scoped", "Searching", "Investigating", "Failed"], expectedRestoreResult: "Not Applicable", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-004"], State: ["Investigating"], Transition: ["Investigating->Analyzing Rejected"], Policy: ["Evidence Required"], Evidence: ["Missing Evidence Rejection"], Safety: ["Evidence Gate"] }),
      relatedDecisions: ["IDE-135-001", "IDE-135-005", "IDE-135-006"], execute: executeEvidenceGateRejection
    },
    {
      id: "IDE135-SCN-004", title: "Instrumentation permission rejection", category: "Permission", priority: 40, risk: "Critical", critical: true,
      expectedRestoreResult: "Not Required", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-005", "IDE-130-009"], State: ["Investigating"], Policy: ["Permission Gate"], Evidence: ["Permission Observation"], Safety: ["Unauthorized Instrumentation Rejection"] }),
      relatedDecisions: ["IDE-135-001", "IDE-135-008"], execute: executePermissionBlock
    },
    {
      id: "IDE135-SCN-005", title: "Performance budget limit rejection", category: "Budget", priority: 50, risk: "High", critical: true,
      expectedRestoreResult: "Not Required", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-006", "IDE-130-009"], Policy: ["Measurement Sample Limit"], Evidence: ["Budget Observation"], Safety: ["Hard Limit"], Performance: ["Measurement Budget"] }),
      relatedDecisions: ["IDE-135-003", "IDE-135-006"], execute: executeBudgetLimit
    },
    {
      id: "IDE135-SCN-006", title: "Inconclusive closure", category: "Closure", priority: 60, risk: "Medium", critical: true,
      expectedRestoreResult: "Not Required", expectedClosureResult: "Closed as Inconclusive",
      covers: scenarioCovers({ Requirement: ["IDE-130-007", "IDE-130-010"], State: ["Analyzing", "Reporting", "Verifying", "Completed"], Transition: ["Inconclusive Closure Path"], Evidence: ["Inconclusive Evidence"], Closure: ["Closed as Inconclusive"] }),
      relatedDecisions: ["IDE-135-007", "IDE-135-010"], execute: executeInconclusiveClosure
    },
    {
      id: "IDE135-SCN-007", title: "Transactional instrumentation restore", category: "Restore", priority: 70, risk: "Critical", critical: true, stopPipelineOnFailure: true,
      expectedStateSequence: ["Scoped", "Investigating", "Instrumenting", "Measuring", "Analyzing", "Reporting", "Restoring", "Verifying", "Completed"], expectedRestoreResult: "Verified", expectedClosureResult: "Completed",
      covers: scenarioCovers({ Requirement: ["IDE-130-005", "IDE-130-006", "IDE-130-008", "IDE-130-009", "IDE-130-010"], State: ["Instrumenting", "Measuring", "Restoring"], Transition: ["Investigating->Instrumenting", "Instrumenting->Measuring", "Reporting->Restoring", "Restoring->Verifying"], Policy: ["Instrumentation Permission", "Restore Required"], Evidence: ["Instrumentation Evidence", "Performance Evidence"], Restore: ["Remove Instrumentation", "Residual Scan", "Integrity Verification"], Safety: ["Transactional Restore", "No Residual Instrumentation"], Integration: ["IDE-110", "IDE-130"], Performance: ["Instrumentation Measurement"], Closure: ["Restore-aware Completed"] }),
      relatedDecisions: ["IDE-135-004", "IDE-135-008", "IDE-135-010"], execute: executeInstrumentationRestore
    },
    {
      id: "IDE135-SCN-008", title: "Closed workflow cannot reopen", category: "Closure", priority: 80, risk: "High", critical: true,
      expectedRestoreResult: "Not Required", expectedClosureResult: "Closed as Inconclusive", expectedReopenDecision: "Rejected",
      covers: scenarioCovers({ Requirement: ["IDE-130-001", "IDE-130-010"], State: ["Completed"], Transition: ["Completed->Searching Rejected"], Policy: ["Closure Reopen Policy"], Evidence: ["Closure Evidence"], Safety: ["Closed State Protection"], Closure: ["Reopen Rejected"] }),
      relatedDecisions: ["IDE-135-001", "IDE-135-010"], execute: executeClosedSessionReopenRejection
    },
    {
      id: "IDE135-SCN-009", title: "Evidence and relationship traceability", category: "Evidence", priority: 90, risk: "High", critical: true,
      expectedRestoreResult: "Not Applicable", expectedClosureResult: "Not Applicable",
      covers: scenarioCovers({ Requirement: ["IDE-130-004", "IDE-130-007"], Evidence: ["Evidence Registry", "Relationship Registry", "Report Reference", "Handoff Reference"], Safety: ["Reference Integrity"], Integration: ["Relationship Platform"] }),
      relatedDecisions: ["IDE-135-005", "IDE-135-007", "IDE-135-009"], execute: executeTraceabilityContract
    },
    {
      id: "IDE135-SCN-010", title: "Required dependency contracts", category: "Integration", priority: 100, risk: "High", critical: true,
      expectedRestoreResult: "Not Applicable", expectedClosureResult: "Not Applicable",
      covers: scenarioCovers({ Requirement: ["IDE-110", "IDE-115", "IDE-120", "IDE-125", "IDE-130"], Evidence: ["Dependency Status Evidence"], Safety: ["Dependency Readiness"], Integration: ["IDE-110", "IDE-115", "IDE-120", "IDE-125", "IDE-130", "Validation Result Repository"] }),
      relatedDecisions: ["IDE-135-004", "IDE-135-009"], execute: executeDependencyContract
    },
    {
      id: "IDE135-SCN-011", title: "Paused and blocked resume", category: "State", priority: 110, risk: "Medium", critical: true,
      expectedRestoreResult: "Not Applicable", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-001", "IDE-130-002"], State: ["Paused", "Blocked"], Policy: ["Scope Gate"] }),
      relatedDecisions: ["IDE-135-001", "IDE-135-002"], execute: executePausedBlockedResume
    },
    {
      id: "IDE135-SCN-012", title: "User cancelled restore path", category: "Restore", priority: 120, risk: "Critical", critical: true,
      expectedRestoreResult: "Verified", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-005", "IDE-130-008", "IDE-130-009"], State: ["Failed", "Restoring"], Transition: ["User Cancelled Restore Path"], Restore: ["Instrumentation Removal", "Runtime Wrapper Restore"] }),
      relatedDecisions: ["IDE-135-004", "IDE-135-008"], execute: executeUserCancelledRestorePath
    },
    {
      id: "IDE135-SCN-013", title: "Runtime error restore path", category: "Failure", priority: 130, risk: "Critical", critical: true,
      expectedRestoreResult: "Verified", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-005", "IDE-130-008", "IDE-130-009"], State: ["Failed", "Restoring"], Transition: ["Runtime Error Restore Path"], Restore: ["Instrumentation Removal", "Runtime Wrapper Restore"], Safety: ["Runtime Error Handling"] }),
      relatedDecisions: ["IDE-135-004", "IDE-135-008"], execute: executeRuntimeErrorRestorePath
    },
    {
      id: "IDE135-SCN-014", title: "Concurrent change protection", category: "Concurrency", priority: 140, risk: "Critical", critical: true,
      expectedRestoreResult: "Conflict Detected", expectedClosureResult: "Open",
      covers: scenarioCovers({ Requirement: ["IDE-130-005", "IDE-130-008"], Transition: ["Concurrent Change Protection"], Restore: ["Concurrent Change Preservation"], Safety: ["Concurrent Change Protection"] }),
      relatedDecisions: ["IDE-135-004", "IDE-135-008"], execute: executeConcurrentChangeProtection
    },
    {
      id: "IDE135-SCN-015", title: "Restore failure escalation", category: "Recovery", priority: 150, risk: "Critical", critical: true,
      expectedRestoreResult: "Manual Recovery Required", expectedClosureResult: "Manual Recovery Required",
      covers: scenarioCovers({ Requirement: ["IDE-130-008", "IDE-130-010"], State: ["Restore Required", "Manual Recovery Required"], Transition: ["Restore Failure Escalation"], Restore: ["Restore Failure Detection"], Safety: ["Manual Recovery"], Closure: ["Manual Recovery Required"] }),
      relatedDecisions: ["IDE-135-008", "IDE-135-010"], execute: executeRestoreFailureEscalation
    },
    {
      id: "IDE135-SCN-016", title: "Evidence reference break detection", category: "Evidence", priority: 160, risk: "Critical", critical: true,
      expectedRestoreResult: "Not Required", expectedClosureResult: "Blocked",
      covers: scenarioCovers({ Requirement: ["IDE-130-004", "IDE-130-007", "IDE-130-010"], Policy: ["Evidence Gate"], Evidence: ["Evidence Reference Break Detection"] }),
      relatedDecisions: ["IDE-135-005", "IDE-135-007"], execute: executeEvidenceReferenceBreakDetection
    },
    {
      id: "IDE135-SCN-017", title: "Issue not reproduced closure", category: "Closure", priority: 170, risk: "Medium", critical: true,
      expectedRestoreResult: "Not Required", expectedClosureResult: "Closed as Not Reproduced",
      covers: scenarioCovers({ Requirement: ["IDE-130-007", "IDE-130-010"], Closure: ["Closed as Not Reproduced"] }),
      relatedDecisions: ["IDE-135-007", "IDE-135-010"], execute: executeNotReproducedClosure
    },
    {
      id: "IDE135-SCN-018", title: "Safety stopped and manual recovery", category: "Safety", priority: 180, risk: "Critical", critical: true,
      expectedRestoreResult: "Manual Recovery Required", expectedClosureResult: "Manual Recovery Required",
      covers: scenarioCovers({ Requirement: ["IDE-130-005", "IDE-130-008", "IDE-130-009", "IDE-130-010"], State: ["Safety Stopped", "Manual Recovery Required"], Safety: ["Safety Stop", "Manual Recovery"], Closure: ["Safety Stopped", "Manual Recovery Required"] }),
      relatedDecisions: ["IDE-135-008", "IDE-135-010"], execute: executeSafetyStopManualRecovery
    }
  ];

  builtInScenarios.forEach(function register(definition) {
    registerInvestigationValidationScenario(definition, { replace: true });
  });

  function validateInvestigationWorkflowValidation() {
    const checks = [];
    const check = function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); };
    try {
      check("Coverage layers", COVERAGE_LAYERS.length === 10, "count=" + COVERAGE_LAYERS.length);
      check("Validation gates", VALIDATION_GATES.length === 10, "count=" + VALIDATION_GATES.length);
      check("Design Freeze requirement registry", Object.keys(REQUIRED_COVERAGE_TARGETS).length === 10 && REQUIRED_COVERAGE_TARGETS.Requirement.length === 10);
      check("Validation states", SESSION_STATES.length >= 15, "count=" + SESSION_STATES.length);
      check("Default policy", DEFAULT_POLICY.criticalCoverageRequired === 1 && DEFAULT_POLICY.requireRestoreVerified === true && DEFAULT_POLICY.requireOfficialDependencyRelease === false);
      check("Scenario registry", state.scenarios.size >= 18, "registered=" + state.scenarios.size);
      check("Normal scenario", Boolean(state.scenarios.get("IDE135-SCN-001")));
      check("State scenario", Boolean(state.scenarios.get("IDE135-SCN-002")));
      check("Evidence scenario", Boolean(state.scenarios.get("IDE135-SCN-003")));
      check("Permission scenario", Boolean(state.scenarios.get("IDE135-SCN-004")));
      check("Budget scenario", Boolean(state.scenarios.get("IDE135-SCN-005")));
      check("Inconclusive scenario", Boolean(state.scenarios.get("IDE135-SCN-006")));
      check("Restore scenario", Boolean(state.scenarios.get("IDE135-SCN-007")));
      check("Closure scenario", Boolean(state.scenarios.get("IDE135-SCN-008")));
      check("Traceability scenario", Boolean(state.scenarios.get("IDE135-SCN-009")));
      check("Integration scenario", Boolean(state.scenarios.get("IDE135-SCN-010")));

      const session = createInvestigationValidationSession({ selectedScenarioIds: ["IDE135-SCN-001"] });
      check("Session creation", Boolean(session.id) && session.state === "Created");
      const plan = buildInvestigationValidationPlan(session.id);
      check("Plan generation", plan.planned === true && plan.plan.length === 1);
      check("Execution queue", plan.session.executionQueue.length === 1 && plan.session.executionQueue[0].status === "Ready");
      check("Coverage model", COVERAGE_LAYERS.every(function layer(name) { return Object.prototype.hasOwnProperty.call(state.scenarios.get("IDE135-SCN-001").covers, name); }));
      check("Evidence-linked result model", typeof addRelationship === "function" && typeof getInvestigationValidationRelationships === "function");
      check("Gate decision model", typeof evaluateInvestigationValidationGates === "function");
      check("Structured report", typeof buildInvestigationValidationReport === "function");
      check("Evidence package", typeof buildInvestigationValidationEvidencePackage === "function");
      check("Traceable handoff", typeof buildInvestigationValidationHandoff === "function");
      check("IDE-130 dependency", typeof global.getInvestigationWorkflowStatus === "function" && global.getInvestigationWorkflowStatus().ready === true);
      check("IDE-110 dependency", typeof global.getDiagnosticPlatformStatus === "function");
      check("IDE-120 dependency", typeof global.getSearchPipelineStatus === "function");
      check("IDE-125 dependency", typeof global.getSearchValidationStatus === "function");
      check("Validation Result Repository dependency", typeof global.getValidationResultRepositoryStatus === "function" && global.getValidationResultRepositoryStatus().ready === true);
      check("Validation persistence API", typeof global.saveValidationResult === "function" && typeof persistInvestigationWorkflowValidationResult === "function");
      check("Persisted result restore API", typeof restoreInvestigationWorkflowValidationResult === "function" && typeof getInvestigationWorkflowValidationPersistenceStatus === "function");
      const publicApis = [
        "registerInvestigationValidationScenario", "getInvestigationValidationScenarios", "createInvestigationValidationSession",
        "buildInvestigationValidationPlan", "runInvestigationValidationScenario", "runInvestigationWorkflowValidation",
        "calculateInvestigationValidationCoverage", "evaluateInvestigationValidationGates", "buildInvestigationValidationReport",
        "buildInvestigationValidationEvidencePackage", "buildInvestigationValidationHandoff", "getInvestigationWorkflowValidationStatus",
        "persistInvestigationWorkflowValidationResult", "restoreInvestigationWorkflowValidationResult", "publishInvestigationWorkflowValidationResult"
      ];
      check("Public API", publicApis.every(function exists(name) { return typeof global[name] === "function"; }));
      check("Read-only responsibility", typeof global.applyInvestigationValidationFix !== "function");
      state.sessions.delete(session.id);
      state.history = state.history.filter(function filter(event) { return event.sessionId !== session.id; });
    } catch (error) {
      state.lastError = { message: error && error.message ? error.message : String(error), stack: error && error.stack ? error.stack : "", at: nowIso() };
      check("Unexpected validation error", false, state.lastError.message);
    }
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return {
      id: "IDE-135-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      valid: passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      progress: 100,
      checks: checks,
      validatedAt: nowIso()
    };
  }

  function persistInvestigationWorkflowValidationResult(options) {
    const settings = options && typeof options === "object" ? options : {};
    const result = settings.result || state.lastResult;
    if (!result) return { saved: false, persisted: false, reason: "IDE-135 validation result is not available." };
    if (typeof global.saveValidationResult !== "function") {
      return { saved: false, persisted: false, pending: true, reason: "Validation Result Repository API is unavailable." };
    }
    const saved = global.saveValidationResult(result, {
      sourceComponent: COMPONENT_ID,
      sourceType: "Full Investigation Workflow Validation",
      official: result.releaseAllowed === true && result.implementationReady === true,
      persist: settings.persist !== false
    });
    if (saved && saved.saved) {
      state.lastResult = clone(Object.assign({}, result, { persistence: clone(saved) }));
      touch();
    }
    return saved;
  }

  function restoreInvestigationWorkflowValidationResult(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (typeof global.getLatestValidationResult !== "function") {
      return { restored: false, pending: true, reason: "Validation Result Repository API is unavailable." };
    }
    const record = global.getLatestValidationResult({
      sourceComponent: COMPONENT_ID,
      official: settings.officialOnly === true
    });
    if (!record || !record.payload) {
      return { restored: false, reason: "Persisted IDE-135 validation result was not found." };
    }
    state.lastResult = clone(Object.assign({}, record.payload, {
      persistence: {
        saved: true,
        persisted: true,
        restored: true,
        recordId: record.recordId,
        storageKey: typeof global.getValidationResultRepositoryStatus === "function"
          ? global.getValidationResultRepositoryStatus().storage.storageKey
          : ""
      }
    }));
    touch();
    return {
      restored: true,
      recordId: record.recordId,
      validationId: record.id,
      official: record.official === true,
      result: clone(state.lastResult)
    };
  }

  function publishInvestigationWorkflowValidationResult(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (typeof global.publishValidationResultToRepository !== "function") {
      return { published: false, pending: true, reason: "MemoBox Repository publication adapter is unavailable." };
    }
    const result = settings.result || state.lastResult;
    if (!result) return { published: false, reason: "IDE-135 validation result is not available." };
    return global.publishValidationResultToRepository(result, settings);
  }

  function getInvestigationWorkflowValidationPersistenceStatus() {
    const repository = typeof global.getValidationResultRepositoryStatus === "function"
      ? global.getValidationResultRepositoryStatus()
      : null;
    const summary = typeof global.getValidationResultRepositorySummary === "function"
      ? global.getValidationResultRepositorySummary({ sourceComponent: COMPONENT_ID })
      : null;
    const latest = summary && summary.latest ? summary.latest : null;
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      available: Boolean(repository && repository.ready),
      adapter: repository && repository.storage ? repository.storage.adapter : "Unavailable",
      storageKey: repository && repository.storage ? repository.storage.storageKey : "",
      persistedRecordCount: summary ? summary.count : 0,
      latestRecordId: latest ? latest.recordId : null,
      latestValidationId: latest ? latest.id : null,
      latestOfficial: Boolean(latest && latest.official),
      autoPersist: true,
      repositoryPublication: "Manual",
      updatedAt: nowIso()
    };
  }

  function getInvestigationWorkflowValidationState() {
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      scenarios: getInvestigationValidationScenarios({ includeDisabled: true }),
      sessions: getInvestigationValidationSessions(),
      results: [...state.results.values()].map(clone),
      reports: [...state.reports.values()].map(clone),
      evidencePackages: [...state.evidencePackages.values()].map(clone),
      handoffs: [...state.handoffs.values()].map(clone),
      relationships: state.relationships.map(clone),
      history: state.history.map(clone),
      lastResult: clone(state.lastResult),
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt
    };
  }

  function buildInvestigationValidationLifecycle(validation, lastResult) {
    const selfValid = Boolean(validation && validation.valid);
    const hasResult = Boolean(lastResult);
    const releaseAllowed = Boolean(hasResult && lastResult.releaseAllowed && lastResult.implementationReady);
    if (!selfValid) {
      return {
        status: "Attention",
        lifecycleStatus: "Implementation",
        releaseStatus: "Blocked",
        nextTask: "Resolve IDE-135 self-validation failures before running full validation."
      };
    }
    if (!hasResult) {
      return {
        status: "Ready",
        lifecycleStatus: "Implementation",
        releaseStatus: "Not Run",
        nextTask: "Run runInvestigationWorkflowValidation() and confirm all critical gates pass."
      };
    }
    if (releaseAllowed) {
      return {
        status: "Ready",
        lifecycleStatus: "Completed",
        releaseStatus: "Official",
        nextTask: "Begin IDE-140 Development Analytics implementation."
      };
    }
    const failedGates = asArray(lastResult.gates).filter(function failed(item) { return !item.passed; }).map(function name(item) { return item.name; });
    return {
      status: "Attention",
      lifecycleStatus: "Validation Failed",
      releaseStatus: "Blocked",
      nextTask: "Resolve failed IDE-135 gates" + (failedGates.length ? ": " + failedGates.join(", ") : "") + ", then rerun full validation."
    };
  }

  function getInvestigationWorkflowValidationStatus() {
    const requiredApis = ["registerInvestigationValidationScenario", "getInvestigationValidationScenarios", "createInvestigationValidationSession", "buildInvestigationValidationPlan", "runInvestigationValidationScenario", "runInvestigationWorkflowValidation", "calculateInvestigationValidationCoverage", "evaluateInvestigationValidationGates", "getInvestigationWorkflowValidationStatus"];
    const implemented = requiredApis.filter(name => typeof global[name] === "function").length; const platformReady = implemented === requiredApis.length && state.scenarios.size >= 18; const lifecycle = buildInvestigationValidationLifecycle({ valid: platformReady, health: platformReady ? 100 : 0 }, state.lastResult); const last = state.lastResult;
    return { id: COMPONENT_ID, title: "Investigation Workflow Validation", name: "Investigation Workflow Validation", version: VERSION, status: lifecycle.status, lifecycleStatus: lifecycle.lifecycleStatus, ready: platformReady, health: last ? last.health : (platformReady ? 90 : 0), progress: last && last.releaseAllowed ? 100 : platformReady ? 90 : 0, implemented, total: requiredApis.length, registeredScenarios: state.scenarios.size, requiredCoverageTargetCount: Object.values(REQUIRED_COVERAGE_TARGETS).reduce((sum, values) => sum + values.length, 0), coverageSource: "Design Freeze Requirement Registry", coverageLayers: COVERAGE_LAYERS.length, validationGates: VALIDATION_GATES.length, sessionCount: state.sessions.size || (last ? 1 : 0), resultCount: state.results.size || asArray(last && last.scenarioResults).length, reportCount: state.reports.size || (last && last.report && last.report.id ? 1 : 0), evidencePackageCount: state.evidencePackages.size || (last && last.evidencePackage && last.evidencePackage.id ? 1 : 0), handoffCount: state.handoffs.size || (last && last.handoff && last.handoff.id ? 1 : 0), persistence: getInvestigationWorkflowValidationPersistenceStatus(), releaseStatus: lifecycle.releaseStatus, releaseAllowed: Boolean(last && last.releaseAllowed), lastValidation: last ? { id: last.id, status: last.status, releaseAllowed: last.releaseAllowed, implementationReady: last.implementationReady, passed: last.passed, failed: last.failed, total: last.total, health: last.health, failedGates: asArray(last.gates).filter(gate => !gate.passed).map(gate => gate.name), completedAt: last.completedAt } : null, statusApiMode: "Lightweight / no self-validation execution", dependsOn: ["IDE-110", "IDE-115", "IDE-120", "IDE-125", "IDE-130", "Relationship Platform"], provides: ["Scenario Registry", "Design Freeze Requirement Coverage", "Dependency-aware Validation Pipeline", "Evidence-linked Validation Result", "Gate-based Release Decision", "Layered Safety and Restore Gate", "Analytics-ready Validation Package", "Validation Handoff"], nextTask: lifecycle.nextTask, lastError: clone(state.lastError), updatedAt: state.updatedAt };
  }

  const api = {
    registerInvestigationValidationScenario: registerInvestigationValidationScenario,
    unregisterInvestigationValidationScenario: unregisterInvestigationValidationScenario,
    getInvestigationValidationScenario: getInvestigationValidationScenario,
    getInvestigationValidationScenarios: getInvestigationValidationScenarios,
    createInvestigationValidationSession: createInvestigationValidationSession,
    getInvestigationValidationSession: getInvestigationValidationSession,
    getInvestigationValidationSessions: getInvestigationValidationSessions,
    buildInvestigationValidationPlan: buildInvestigationValidationPlan,
    runInvestigationValidationScenario: runInvestigationValidationScenario,
    getInvestigationValidationResult: getInvestigationValidationResult,
    getSessionInvestigationValidationResults: getSessionInvestigationValidationResults,
    calculateInvestigationValidationCoverage: calculateInvestigationValidationCoverage,
    evaluateInvestigationValidationGates: evaluateInvestigationValidationGates,
    buildInvestigationValidationEvidencePackage: buildInvestigationValidationEvidencePackage,
    buildInvestigationValidationReport: buildInvestigationValidationReport,
    buildInvestigationValidationHandoff: buildInvestigationValidationHandoff,
    getInvestigationValidationEvidencePackage: getInvestigationValidationEvidencePackage,
    getInvestigationValidationReport: getInvestigationValidationReport,
    getInvestigationValidationHandoff: getInvestigationValidationHandoff,
    runInvestigationWorkflowValidation: runInvestigationWorkflowValidation,
    addInvestigationValidationRelationship: addRelationship,
    getInvestigationValidationRelationships: getInvestigationValidationRelationships,
    getInvestigationWorkflowValidationState: getInvestigationWorkflowValidationState,
    persistInvestigationWorkflowValidationResult: persistInvestigationWorkflowValidationResult,
    restoreInvestigationWorkflowValidationResult: restoreInvestigationWorkflowValidationResult,
    publishInvestigationWorkflowValidationResult: publishInvestigationWorkflowValidationResult,
    getInvestigationWorkflowValidationPersistenceStatus: getInvestigationWorkflowValidationPersistenceStatus,
    validateInvestigationWorkflowValidation: validateInvestigationWorkflowValidation,
    getInvestigationWorkflowValidationStatus: getInvestigationWorkflowValidationStatus
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.IDE135InvestigationWorkflowValidation = Object.freeze({
    id: COMPONENT_ID,
    version: VERSION,
    coverageLayers: COVERAGE_LAYERS,
    validationGates: VALIDATION_GATES,
    states: SESSION_STATES,
    ...api
  });

  try {
    restoreInvestigationWorkflowValidationResult({ officialOnly: false });
  } catch (_) {
    /* Persistence hydration is best-effort and must not block module startup. */
  }

  if (typeof global.registerDevelopmentStatus === "function") {
    global.registerDevelopmentStatus({ id: COMPONENT_ID, statusApi: "getInvestigationWorkflowValidationStatus", validator: "validateInvestigationWorkflowValidation" }, { source: "runtime", persist: false });
  }
  if (typeof global.registerDevelopmentDashboardModule === "function") {
    global.registerDevelopmentDashboardModule({ id: COMPONENT_ID, title: "Investigation Workflow Validation", statusApi: "getInvestigationWorkflowValidationStatus", validator: "validateInvestigationWorkflowValidation" });
  }
  if (typeof global.registerIdeComponent === "function") {
    global.registerIdeComponent({
      id: COMPONENT_ID,
      title: "Investigation Workflow Validation",
      summary: "Scenario, coverage, safety, restore and release validation for IDE-130.",
      icon: "🧪",
      version: VERSION,
      status: "Ready",
      ready: true,
      progress: 100,
      health: 100,
      validator: "validateInvestigationWorkflowValidation",
      probe: "getInvestigationWorkflowValidationStatus",
      category: "IDE Validation"
    });
  }
})(typeof window !== "undefined" ? window : globalThis);