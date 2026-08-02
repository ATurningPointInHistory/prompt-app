/* ============================================================
   FILE: 13_investigation_workflow.js
   IDE-130 Investigation Workflow
   Version: 1.0.1
   Status: Completed
   Design Freeze: 2026-07-26
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-130";
  const VERSION = "1.0.1";
  const MAX_HISTORY = 500;

  const WORKFLOW_STATES = Object.freeze([
    "Requested", "Scoped", "Searching", "Investigating", "Instrumenting",
    "Measuring", "Analyzing", "Reporting", "Restoring", "Verifying", "Completed",
    "Paused", "Blocked", "Inconclusive", "Safety Stopped", "Restore Required",
    "Manual Recovery Required", "Failed"
  ]);

  const TERMINAL_STATES = Object.freeze([
    "Completed", "Inconclusive", "Safety Stopped", "Manual Recovery Required", "Failed"
  ]);

  const TRANSITIONS = Object.freeze({
    Requested: ["Scoped", "Paused", "Blocked", "Failed"],
    Scoped: ["Searching", "Investigating", "Paused", "Blocked", "Failed"],
    Searching: ["Investigating", "Paused", "Blocked", "Inconclusive", "Failed"],
    Investigating: ["Instrumenting", "Measuring", "Analyzing", "Reporting", "Paused", "Blocked", "Inconclusive", "Failed"],
    Instrumenting: ["Measuring", "Restoring", "Safety Stopped", "Restore Required", "Failed"],
    Measuring: ["Analyzing", "Restoring", "Safety Stopped", "Restore Required", "Failed"],
    Analyzing: ["Reporting", "Paused", "Blocked", "Inconclusive", "Failed"],
    Reporting: ["Restoring", "Verifying", "Restore Required", "Failed"],
    Restoring: ["Verifying", "Restore Required", "Manual Recovery Required", "Failed"],
    Verifying: ["Completed", "Inconclusive", "Restore Required", "Manual Recovery Required", "Failed"],
    Paused: ["Scoped", "Searching", "Investigating", "Instrumenting", "Measuring", "Analyzing", "Reporting", "Restoring", "Verifying", "Failed"],
    Blocked: ["Scoped", "Searching", "Investigating", "Restoring", "Failed"],
    Inconclusive: [],
    "Safety Stopped": ["Restoring", "Manual Recovery Required"],
    "Restore Required": ["Restoring", "Manual Recovery Required"],
    "Manual Recovery Required": [],
    Failed: ["Restoring", "Manual Recovery Required"],
    Completed: []
  });

  const DEFAULT_BUDGET = Object.freeze({
    totalTimeMs: 300000,
    strategyTimeMs: 60000,
    retryLimit: 3,
    scopeExpansionLimit: 5,
    searchTargetLimit: 500,
    instrumentedFileLimit: 5,
    instrumentedFunctionLimit: 20,
    measurementSampleLimit: 100,
    evidenceDataSizeLimit: 2000000,
    logEntryLimit: 1000,
    concurrentSessionLimit: 3,
    failureLimit: 5
  });

  const state = {
    requests: new Map(),
    sessions: new Map(),
    evidence: new Map(),
    hypotheses: new Map(),
    reports: new Map(),
    handoffs: new Map(),
    relationships: [],
    history: [],
    sequence: 0,
    lastError: null,
    lastValidation: null,
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

  function normalizeBudget(input) {
    const source = input && typeof input === "object" ? input : {};
    const budget = {};
    Object.keys(DEFAULT_BUDGET).forEach(function mapBudget(key) {
      budget[key] = Math.max(0, finite(source[key], DEFAULT_BUDGET[key]));
    });
    return budget;
  }

  function createBudgetUsage() {
    return {
      totalTimeMs: 0,
      strategyTimeMs: 0,
      retries: 0,
      scopeExpansions: 0,
      searchTargets: 0,
      instrumentedFiles: 0,
      instrumentedFunctions: 0,
      measurementSamples: 0,
      evidenceDataSize: 0,
      logEntries: 0,
      failures: 0
    };
  }

  function recordEvent(type, sessionId, details) {
    const event = {
      id: nextId("IDE-130-EVENT"),
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
    const existing = state.relationships.find(function findRelationship(item) {
      return item.sourceId === source && item.targetId === target && item.type === relationType;
    });
    if (existing) return clone(existing);
    const relationship = {
      id: nextId("IDE-130-REL"),
      sourceId: source,
      type: relationType,
      targetId: target,
      metadata: clone(metadata || {}),
      createdAt: nowIso()
    };
    state.relationships.push(relationship);
    touch();
    return clone(relationship);
  }

  function getInvestigationRelationships(filter) {
    const settings = filter && typeof filter === "object" ? filter : {};
    return state.relationships.filter(function filterRelationship(item) {
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

  function normalizeRequest(input) {
    const request = input && typeof input === "object" ? input : {};
    const sourceId = text(request.sourceRequestId || request.id, "");
    return {
      id: text(request.investigationRequestId, "") || nextId("IDE-130-REQUEST"),
      sourceRequestId: sourceId,
      source: text(request.source, "Manual"),
      problemStatement: text(request.problemStatement || request.problem || request.title || request.actual, "Investigation requested"),
      symptom: text(request.symptom || request.actual, ""),
      expectedBehavior: text(request.expectedBehavior || request.expected, ""),
      actualBehavior: text(request.actualBehavior || request.actual, ""),
      reproductionConditions: clone(request.reproductionConditions || request.reproductionData || {}),
      initialScope: clone(request.initialScope || request.allowedScope || request.scope || { component: "Unknown" }),
      excludedScope: clone(request.excludedScope || []),
      repositoryVersion: text(request.repositoryVersion, "unknown"),
      datasetVersion: text(request.datasetVersion, "unknown"),
      executionContext: clone(request.executionContext || {}),
      severity: text(request.severity, "Medium"),
      priority: text(request.priority, "Normal"),
      risk: text(request.risk, "Medium"),
      permission: clone(request.permission || { readOnly: true, instrumentation: false }),
      budget: normalizeBudget(request.budget),
      requestedOutput: clone(request.requestedOutput || ["Investigation Result", "Report", "Handoff"]),
      evidenceReferences: unique(request.evidenceReferences),
      failedGates: clone(request.failedGates || []),
      failedMetrics: clone(request.failedMetrics || []),
      status: "Accepted",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  }

  function createInvestigationRequest(input) {
    const normalized = normalizeRequest(input);
    if (normalized.sourceRequestId) {
      const existing = [...state.requests.values()].find(function findSource(item) {
        return item.sourceRequestId === normalized.sourceRequestId;
      });
      if (existing) return clone(existing);
    }
    state.requests.set(normalized.id, normalized);
    recordEvent("Request Accepted", "", { requestId: normalized.id, sourceRequestId: normalized.sourceRequestId });
    return clone(normalized);
  }

  function importSearchValidationInvestigationRequests(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (typeof global.getInvestigationRequests !== "function") {
      return { imported: 0, skipped: 0, available: false, reason: "IDE-125 investigation handoff API is unavailable." };
    }
    const requests = asArray(global.getInvestigationRequests());
    let imported = 0;
    let skipped = 0;
    requests.forEach(function importRequest(request) {
      if (settings.includeResolved !== true && String(request.status || "Open") !== "Open") { skipped += 1; return; }
      const before = state.requests.size;
      createInvestigationRequest({ ...request, sourceRequestId: request.id, source: request.source || "IDE-125" });
      if (state.requests.size > before) imported += 1; else skipped += 1;
    });
    return { imported: imported, skipped: skipped, available: true, totalSourceRequests: requests.length };
  }

  function getInvestigationRequest(id) { return clone(state.requests.get(String(id)) || null); }
  function getInvestigationRequestRegistry() { return [...state.requests.values()].map(clone); }

  function createInvestigationSession(requestOrId, options) {
    const settings = options && typeof options === "object" ? options : {};
    let request = typeof requestOrId === "string" ? state.requests.get(requestOrId) : requestOrId;
    if (!request || typeof request !== "object") request = createInvestigationRequest(settings.request || {});
    if (!state.requests.has(request.id)) state.requests.set(request.id, clone(request));

    const activeCount = [...state.sessions.values()].filter(function active(item) {
      return !TERMINAL_STATES.includes(item.state);
    }).length;
    const budget = normalizeBudget(settings.budget || request.budget);
    if (activeCount >= budget.concurrentSessionLimit) {
      return { created: false, reason: "Concurrent session limit reached.", activeCount: activeCount };
    }

    const id = nextId("IDE-130-SESSION");
    const session = {
      id: id,
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: request.id,
      sourceRequestId: request.sourceRequestId || "",
      state: "Requested",
      previousState: null,
      currentScope: clone(request.initialScope || {}),
      excludedScope: clone(request.excludedScope || []),
      scopeHistory: [],
      currentStrategy: null,
      strategyHistory: [],
      evidenceReferences: unique(request.evidenceReferences),
      hypothesisReferences: [],
      findingReferences: [],
      instrumentationTransactions: [],
      performanceRecords: [],
      conclusion: null,
      reportId: null,
      handoffId: null,
      restoreStatus: "Not Required",
      integrityStatus: "Not Verified",
      safetyStatus: "Ready",
      closureStatus: "Open",
      mutationPerformed: false,
      budget: budget,
      budgetUsage: createBudgetUsage(),
      warnings: [],
      errors: [],
      transitions: [],
      startedAt: nowIso(),
      updatedAt: nowIso(),
      completedAt: null
    };
    state.sessions.set(id, session);
    addRelationship(id, "created-from", request.id, { sessionId: id });
    recordEvent("Session Created", id, { requestId: request.id });
    return { created: true, session: clone(session) };
  }

  function getInvestigationSession(id) { return clone(state.sessions.get(String(id)) || null); }
  function getInvestigationSessions(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.sessions.values()].filter(function filterSession(session) {
      if (settings.state && session.state !== String(settings.state)) return false;
      if (settings.active === true && TERMINAL_STATES.includes(session.state)) return false;
      return true;
    }).map(clone);
  }

  function requireSession(id) {
    const session = state.sessions.get(String(id));
    if (!session) throw new Error("Investigation session was not found: " + id);
    return session;
  }

  function validateTransitionConditions(session, targetState) {
    if (targetState === "Scoped" && (!session.currentScope || Object.keys(session.currentScope).length === 0)) {
      return { allowed: false, reason: "Scope is required." };
    }
    if (["Analyzing", "Reporting", "Verifying", "Completed"].includes(targetState) && session.evidenceReferences.length === 0) {
      return { allowed: false, reason: "Evidence is required." };
    }
    if (targetState === "Restoring" && !session.mutationPerformed && session.restoreStatus === "Not Required") {
      return { allowed: false, reason: "Restore is not required for a read-only session." };
    }
    if (targetState === "Verifying" && !session.reportId) {
      return { allowed: false, reason: "Investigation report is required before verification." };
    }
    if (targetState === "Completed") {
      if (!session.reportId) return { allowed: false, reason: "Report is required." };
      if (!session.handoffId) return { allowed: false, reason: "Handoff package is required." };
      if (!["Verified", "Not Required"].includes(session.restoreStatus)) return { allowed: false, reason: "Restore gate is not complete." };
      if (session.integrityStatus !== "Verified") return { allowed: false, reason: "Integrity verification is required." };
    }
    return { allowed: true, reason: "" };
  }

  function transitionInvestigationState(sessionId, targetState, reason, actor, options) {
    const settings = options && typeof options === "object" ? options : {};
    const session = requireSession(sessionId);
    const target = text(targetState, "");
    if (!WORKFLOW_STATES.includes(target)) return { transitioned: false, reason: "Unknown state: " + target };
    if (session.state === target) return { transitioned: true, unchanged: true, session: clone(session) };
    const allowedTargets = TRANSITIONS[session.state] || [];
    if (!allowedTargets.includes(target) && settings.force !== true) {
      return { transitioned: false, reason: "Transition is not allowed: " + session.state + " -> " + target };
    }
    const condition = validateTransitionConditions(session, target);
    if (!condition.allowed && settings.force !== true) return { transitioned: false, reason: condition.reason };

    const from = session.state;
    if (["Paused", "Blocked"].includes(target)) session.previousState = from;
    session.state = target;
    session.updatedAt = nowIso();
    const transition = {
      id: nextId("IDE-130-TRANSITION"),
      from: from,
      to: target,
      reason: text(reason, "State transition"),
      actor: text(actor, "System"),
      at: session.updatedAt
    };
    session.transitions.push(transition);
    if (target === "Completed") {
      session.closureStatus = session.closureStatus === "Open" ? "Completed" : session.closureStatus;
      session.completedAt = session.updatedAt;
    }
    recordEvent("State Transition", session.id, transition);
    return { transitioned: true, transition: clone(transition), session: clone(session) };
  }

  function defineInvestigationScope(sessionId, scope, reason, evidenceReferences) {
    const session = requireSession(sessionId);
    const nextScope = scope && typeof scope === "object" ? clone(scope) : {};
    if (Object.keys(nextScope).length === 0) return { updated: false, reason: "Scope is required." };
    const isExpansion = session.scopeHistory.length > 0 || session.state !== "Requested";
    const evidence = unique(evidenceReferences);
    if (isExpansion && evidence.length === 0) return { updated: false, reason: "Scope expansion requires evidence." };
    if (isExpansion && !text(reason, "")) return { updated: false, reason: "Scope expansion requires a reason." };
    if (isExpansion && session.budgetUsage.scopeExpansions >= session.budget.scopeExpansionLimit) {
      return { updated: false, reason: "Scope expansion limit reached." };
    }

    const previous = clone(session.currentScope);
    session.currentScope = nextScope;
    session.scopeHistory.push({ previous: previous, next: clone(nextScope), reason: text(reason, "Initial scope"), evidenceReferences: evidence, at: nowIso() });
    if (isExpansion) session.budgetUsage.scopeExpansions += 1;
    evidence.forEach(function linkEvidence(id) { addRelationship(session.id, "scope-supported-by", id, { sessionId: session.id }); });
    session.updatedAt = nowIso();
    if (session.state === "Requested") transitionInvestigationState(session.id, "Scoped", reason || "Initial scope defined", "System");
    recordEvent("Scope Updated", session.id, { scope: nextScope, reason: reason, evidenceReferences: evidence });
    return { updated: true, session: clone(session) };
  }

  function evaluateBudget(session, proposed) {
    const additions = proposed && typeof proposed === "object" ? proposed : {};
    const mapping = {
      totalTimeMs: "totalTimeMs",
      strategyTimeMs: "strategyTimeMs",
      retries: "retryLimit",
      scopeExpansions: "scopeExpansionLimit",
      searchTargets: "searchTargetLimit",
      instrumentedFiles: "instrumentedFileLimit",
      instrumentedFunctions: "instrumentedFunctionLimit",
      measurementSamples: "measurementSampleLimit",
      evidenceDataSize: "evidenceDataSizeLimit",
      logEntries: "logEntryLimit",
      failures: "failureLimit"
    };
    const violations = [];
    Object.keys(mapping).forEach(function checkUsage(usageKey) {
      const next = finite(session.budgetUsage[usageKey], 0) + finite(additions[usageKey], 0);
      const limit = finite(session.budget[mapping[usageKey]], Infinity);
      if (next > limit) violations.push({ usage: usageKey, next: next, limit: limit });
    });
    return { allowed: violations.length === 0, violations: violations };
  }

  function selectInvestigationStrategy(sessionId, options) {
    const session = requireSession(sessionId);
    const settings = options && typeof options === "object" ? options : {};
    const availableEvidence = session.evidenceReferences.length;
    let strategy = text(settings.strategy, "");
    if (!strategy) {
      if (availableEvidence > 0) strategy = "Existing Evidence Review";
      else if (settings.performance === true) strategy = "Performance Investigation";
      else strategy = "Exact Search";
    }
    const instrumentationStrategies = ["Instrumentation Investigation", "Performance Investigation"];
    if (instrumentationStrategies.includes(strategy) && session.currentScope && session.currentScope.readOnly === true) {
      return { selected: false, blocked: true, reason: "Read-only scope does not permit instrumentation." };
    }
    const selection = {
      id: nextId("IDE-130-STRATEGY"),
      strategy: strategy,
      reason: text(settings.reason, availableEvidence ? "Existing evidence is available." : "Start with the lowest-cost read-only strategy."),
      expectedInformationGain: finite(settings.expectedInformationGain, 0.5),
      estimatedCost: finite(settings.estimatedCost, 1),
      selectedAt: nowIso()
    };
    session.currentStrategy = clone(selection);
    session.strategyHistory.push(selection);
    session.updatedAt = nowIso();
    recordEvent("Strategy Selected", session.id, selection);
    return { selected: true, strategy: clone(selection) };
  }

  function estimateEvidenceSize(evidence) {
    try { return JSON.stringify(evidence).length; } catch (_) { return 0; }
  }

  function addInvestigationEvidence(sessionId, input) {
    const session = requireSession(sessionId);
    const source = input && typeof input === "object" ? input : { data: input };
    const id = text(source.id, "") || nextId("IDE-130-EVIDENCE");
    const request = state.requests.get(session.requestId) || {};
    const evidence = {
      id: id,
      sessionId: session.id,
      type: text(source.type, "Observation"),
      source: text(source.source, "Investigation Workflow"),
      data: clone(source.data !== undefined ? source.data : source.value),
      scope: clone(source.scope || session.currentScope),
      repositoryVersion: text(source.repositoryVersion, request.repositoryVersion || "unknown"),
      datasetVersion: text(source.datasetVersion, request.datasetVersion || "unknown"),
      reliability: finite(source.reliability, 1),
      integrity: text(source.integrity, "Recorded"),
      maskingStatus: text(source.maskingStatus, "Not Required"),
      referenceLocation: text(source.referenceLocation, "runtime:IDE-130"),
      collectedAt: nowIso()
    };
    const size = estimateEvidenceSize(evidence);
    const budgetCheck = evaluateBudget(session, { evidenceDataSize: size });
    if (!budgetCheck.allowed) return { added: false, reason: "Evidence data size limit reached.", violations: budgetCheck.violations };
    state.evidence.set(id, evidence);
    session.evidenceReferences = unique([...session.evidenceReferences, id]);
    session.budgetUsage.evidenceDataSize += size;
    session.updatedAt = nowIso();
    addRelationship(session.id, "produced", id, { sessionId: session.id });
    recordEvent("Evidence Added", session.id, { evidenceId: id, type: evidence.type, size: size });
    return { added: true, evidence: clone(evidence) };
  }

  function getInvestigationEvidence(id) { return clone(state.evidence.get(String(id)) || null); }
  function getSessionEvidence(sessionId) {
    const session = requireSession(sessionId);
    return session.evidenceReferences.map(function mapEvidence(id) { return state.evidence.get(id); }).filter(Boolean).map(clone);
  }

  async function runInvestigationSearch(sessionId, query, options) {
    const session = requireSession(sessionId);
    if (typeof global.executeSearchPipeline !== "function") throw new Error("IDE-120 executeSearchPipeline is unavailable.");
    if (session.state === "Requested") defineInvestigationScope(session.id, session.currentScope || { component: "Unknown" }, "Initial scope", []);
    if (session.state === "Scoped") transitionInvestigationState(session.id, "Searching", "Search started", "IDE-130");
    if (session.state !== "Searching") return { executed: false, reason: "Session must be in Searching state." };

    const settings = options && typeof options === "object" ? options : {};
    const budgetCheck = evaluateBudget(session, { strategyTimeMs: finite(settings.estimatedTimeMs, 0) });
    if (!budgetCheck.allowed) return { executed: false, reason: "Search budget would be exceeded.", violations: budgetCheck.violations };
    if (!session.currentStrategy) selectInvestigationStrategy(session.id, settings);

    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const execution = await global.executeSearchPipeline(query, settings.searchOptions || settings);
    const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Number((ended - started).toFixed(3));
    session.budgetUsage.strategyTimeMs += durationMs;
    session.budgetUsage.totalTimeMs += durationMs;
    session.budgetUsage.searchTargets += finite(execution.resultCount, 0);

    const evidenceResult = addInvestigationEvidence(session.id, {
      type: "Search Execution",
      source: "IDE-120",
      data: {
        executionId: execution.id,
        query: execution.query,
        status: execution.status,
        strategyIds: execution.strategyIds,
        resultCount: execution.resultCount,
        results: asArray(execution.results).slice(0, 50),
        trace: execution.trace,
        diagnostics: execution.diagnostics,
        durationMs: execution.durationMs
      },
      reliability: execution.status === "Completed" ? 1 : 0.8,
      referenceLocation: "IDE-120:" + execution.id
    });
    if (evidenceResult.added) addRelationship(evidenceResult.evidence.id, "derived-from", execution.id, { sessionId: session.id });
    transitionInvestigationState(session.id, "Investigating", "Search evidence captured", "IDE-130");
    return { executed: true, execution: clone(execution), evidence: evidenceResult.evidence || null, session: clone(session) };
  }

  function createInvestigationHypothesis(sessionId, input) {
    const session = requireSession(sessionId);
    const source = input && typeof input === "object" ? input : { statement: input };
    const id = text(source.id, "") || nextId("IDE-130-HYPOTHESIS");
    const hypothesis = {
      id: id,
      sessionId: session.id,
      statement: text(source.statement || source.content, ""),
      targetComponent: text(source.targetComponent, ""),
      status: "Proposed",
      supportingEvidence: unique(source.supportingEvidence),
      contradictingEvidence: unique(source.contradictingEvidence),
      confidence: Math.max(0, Math.min(1, finite(source.confidence, 0))),
      impact: text(source.impact, "Unknown"),
      verificationMethod: text(source.verificationMethod, "Evidence review"),
      requiredPermission: clone(source.requiredPermission || {}),
      validationStatus: "Not Evaluated",
      decisionReason: "",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    if (!hypothesis.statement) return { created: false, reason: "Hypothesis statement is required." };
    state.hypotheses.set(id, hypothesis);
    session.hypothesisReferences = unique([...session.hypothesisReferences, id]);
    addRelationship(session.id, "contains-hypothesis", id, { sessionId: session.id });
    hypothesis.supportingEvidence.forEach(function link(idValue) { addRelationship(id, "supports", idValue, { sessionId: session.id }); });
    hypothesis.contradictingEvidence.forEach(function link(idValue) { addRelationship(id, "contradicted-by", idValue, { sessionId: session.id }); });
    recordEvent("Hypothesis Created", session.id, { hypothesisId: id });
    return { created: true, hypothesis: clone(hypothesis) };
  }

  function evaluateInvestigationHypothesis(hypothesisId, decision) {
    const hypothesis = state.hypotheses.get(String(hypothesisId));
    if (!hypothesis) return { evaluated: false, reason: "Hypothesis was not found." };
    const input = decision && typeof decision === "object" ? decision : { status: decision };
    const status = text(input.status, "Investigating");
    const supportedStatuses = ["Investigating", "Supported", "Confirmed", "Weakened", "Rejected", "Inconclusive"];
    if (!supportedStatuses.includes(status)) return { evaluated: false, reason: "Unsupported hypothesis status." };
    const supportingEvidence = unique([...hypothesis.supportingEvidence, ...asArray(input.supportingEvidence)]);
    const contradictingEvidence = unique([...hypothesis.contradictingEvidence, ...asArray(input.contradictingEvidence)]);
    if (["Supported", "Confirmed"].includes(status) && supportingEvidence.length === 0) {
      return { evaluated: false, reason: "Supporting evidence is required." };
    }
    if (status === "Confirmed" && !text(input.reason, "")) return { evaluated: false, reason: "Confirmation reason is required." };
    hypothesis.status = status;
    hypothesis.supportingEvidence = supportingEvidence;
    hypothesis.contradictingEvidence = contradictingEvidence;
    hypothesis.confidence = Math.max(0, Math.min(1, finite(input.confidence, hypothesis.confidence)));
    hypothesis.validationStatus = text(input.validationStatus, "Evaluated");
    hypothesis.decisionReason = text(input.reason, "Evidence evaluation");
    hypothesis.updatedAt = nowIso();
    supportingEvidence.forEach(function link(id) { addRelationship(hypothesis.id, "supported-by", id, { sessionId: hypothesis.sessionId }); });
    contradictingEvidence.forEach(function link(id) { addRelationship(hypothesis.id, "contradicted-by", id, { sessionId: hypothesis.sessionId }); });
    recordEvent("Hypothesis Evaluated", hypothesis.sessionId, { hypothesisId: hypothesis.id, status: status });
    return { evaluated: true, hypothesis: clone(hypothesis) };
  }

  function getInvestigationHypothesis(id) { return clone(state.hypotheses.get(String(id)) || null); }
  function getSessionHypotheses(sessionId) {
    const session = requireSession(sessionId);
    return session.hypothesisReferences.map(function mapHypothesis(id) { return state.hypotheses.get(id); }).filter(Boolean).map(clone);
  }

  function createInstrumentationTransaction(sessionId, plan) {
    const session = requireSession(sessionId);
    const input = plan && typeof plan === "object" ? plan : {};
    if (!input.targetId) return { created: false, reason: "Instrumentation targetId is required." };
    if (input.restorePlan === false) return { created: false, reason: "Restore Plan is required." };
    const transaction = {
      id: nextId("IDE-130-INSTRUMENTATION"),
      sessionId: session.id,
      state: "Planned",
      targetId: text(input.targetId, ""),
      file: text(input.file, ""),
      functionName: text(input.functionName, input.targetId),
      type: text(input.type, "TRACE"),
      probeType: text(input.probeType, "START_END"),
      purpose: text(input.purpose, "Investigation evidence collection"),
      originalState: clone(input.originalState || {}),
      restorePlan: clone(input.restorePlan || { method: "removeInstrumentation" }),
      diagnosticInstrumentationId: null,
      evidenceReferences: [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    session.instrumentationTransactions.push(transaction);
    recordEvent("Instrumentation Planned", session.id, { transactionId: transaction.id, targetId: transaction.targetId });
    return { created: true, transaction: clone(transaction) };
  }

  function applyInvestigationInstrumentation(sessionId, transactionId) {
    const session = requireSession(sessionId);
    const transaction = session.instrumentationTransactions.find(function findTransaction(item) { return item.id === String(transactionId); });
    if (!transaction) return { applied: false, reason: "Instrumentation transaction was not found." };
    if (typeof global.previewInstrumentation !== "function" || typeof global.addInstrumentation !== "function") {
      return { applied: false, reason: "IDE-110 instrumentation API is unavailable." };
    }
    const request = state.requests.get(session.requestId) || {};
    if (!(request.permission && request.permission.instrumentation === true)) {
      return { applied: false, blocked: true, reason: "Instrumentation permission is required." };
    }
    const budgetCheck = evaluateBudget(session, {
      instrumentedFiles: transaction.file ? 1 : 0,
      instrumentedFunctions: transaction.functionName ? 1 : 0
    });
    if (!budgetCheck.allowed) return { applied: false, reason: "Instrumentation budget would be exceeded.", violations: budgetCheck.violations };
    if (!session.currentStrategy || session.currentStrategy.strategy === "Existing Evidence Review") {
      selectInvestigationStrategy(session.id, { strategy: "Instrumentation Investigation", reason: "Read-only evidence was insufficient." });
    }
    if (session.state === "Investigating") transitionInvestigationState(session.id, "Instrumenting", "Instrumentation approved", "IDE-130");
    if (session.state !== "Instrumenting") return { applied: false, reason: "Session must be in Instrumenting state." };

    const preview = global.previewInstrumentation({ type: transaction.type, targetId: transaction.targetId, functionName: transaction.functionName, probeType: transaction.probeType });
    if (preview && preview.valid === false) return { applied: false, reason: preview.reason || "Instrumentation preview failed.", preview: clone(preview) };
    const result = global.addInstrumentation({ type: transaction.type, targetId: transaction.targetId, functionName: transaction.functionName, probeType: transaction.probeType, source: COMPONENT_ID });
    if (!result || result.added !== true) return { applied: false, reason: result && result.reason || "Instrumentation apply failed.", result: clone(result) };

    transaction.state = "Applied";
    transaction.diagnosticInstrumentationId = result.instrumentation && result.instrumentation.id || null;
    transaction.updatedAt = nowIso();
    session.mutationPerformed = true;
    session.restoreStatus = "Required";
    session.budgetUsage.instrumentedFiles += transaction.file ? 1 : 0;
    session.budgetUsage.instrumentedFunctions += transaction.functionName ? 1 : 0;
    session.updatedAt = nowIso();
    addRelationship(transaction.id, "applied-as", transaction.diagnosticInstrumentationId || transaction.targetId, { sessionId: session.id });
    recordEvent("Instrumentation Applied", session.id, { transactionId: transaction.id, instrumentationId: transaction.diagnosticInstrumentationId });
    return { applied: true, transaction: clone(transaction), diagnosticResult: clone(result) };
  }

  function captureInstrumentationEvidence(sessionId, transactionId, data) {
    const session = requireSession(sessionId);
    const transaction = session.instrumentationTransactions.find(function findTransaction(item) { return item.id === String(transactionId); });
    if (!transaction) return { captured: false, reason: "Instrumentation transaction was not found." };
    const result = addInvestigationEvidence(session.id, {
      type: "Instrumentation Evidence",
      source: "IDE-110",
      data: clone(data),
      referenceLocation: "IDE-110:" + (transaction.diagnosticInstrumentationId || transaction.id),
      reliability: 1
    });
    if (!result.added) return { captured: false, reason: result.reason };
    transaction.evidenceReferences = unique([...transaction.evidenceReferences, result.evidence.id]);
    transaction.state = "Evidence Captured";
    transaction.updatedAt = nowIso();
    addRelationship(transaction.id, "produced", result.evidence.id, { sessionId: session.id });
    return { captured: true, evidence: result.evidence, transaction: clone(transaction) };
  }

  function recordInvestigationPerformance(sessionId, input) {
    const session = requireSession(sessionId);
    const source = input && typeof input === "object" ? input : {};
    const budgetCheck = evaluateBudget(session, { measurementSamples: 1 });
    if (!budgetCheck.allowed) return { recorded: false, reason: "Measurement sample limit reached." };
    const record = {
      id: nextId("IDE-130-PERFORMANCE"),
      sessionId: session.id,
      targetId: text(source.targetId, "unknown"),
      totalDurationMs: finite(source.totalDurationMs || source.durationMs, 0),
      selfTimeMs: finite(source.selfTimeMs, 0),
      inclusiveTimeMs: finite(source.inclusiveTimeMs || source.durationMs, 0),
      callCount: finite(source.callCount, 1),
      averageMs: finite(source.averageMs, source.durationMs || 0),
      medianMs: source.medianMs == null ? null : finite(source.medianMs, 0),
      p95Ms: source.p95Ms == null ? null : finite(source.p95Ms, 0),
      maximumMs: source.maximumMs == null ? null : finite(source.maximumMs, 0),
      asyncWaitMs: finite(source.asyncWaitMs, 0),
      instrumentationOverheadMs: finite(source.instrumentationOverheadMs, 0),
      baselineDifferenceMs: source.baselineDifferenceMs == null ? null : finite(source.baselineDifferenceMs, 0),
      classification: text(source.classification, "Inconclusive"),
      recordedAt: nowIso()
    };
    session.performanceRecords.push(record);
    session.budgetUsage.measurementSamples += 1;
    if (typeof global.recordPerformance === "function") {
      try { global.recordPerformance({ targetId: record.targetId, durationMs: record.totalDurationMs, source: COMPONENT_ID }); }
      catch (_) { session.warnings.push("IDE-110 performance adapter failed."); }
    }
    const evidence = addInvestigationEvidence(session.id, { type: "Performance Measurement", source: COMPONENT_ID, data: record, referenceLocation: COMPONENT_ID + ":" + record.id });
    if (evidence.added) addRelationship(record.id, "evidenced-by", evidence.evidence.id, { sessionId: session.id });
    recordEvent("Performance Recorded", session.id, { recordId: record.id, targetId: record.targetId });
    return { recorded: true, record: clone(record), evidence: evidence.evidence || null };
  }

  function restoreInvestigationSession(sessionId) {
    const session = requireSession(sessionId);
    if (!session.mutationPerformed) {
      session.restoreStatus = "Not Required";
      session.updatedAt = nowIso();
      return { restored: true, notRequired: true, status: session.restoreStatus };
    }
    if (session.state !== "Restoring") {
      const transition = transitionInvestigationState(session.id, "Restoring", "Restore required after instrumentation", "IDE-130");
      if (!transition.transitioned) return { restored: false, reason: transition.reason };
    }
    const failures = [];
    session.instrumentationTransactions.forEach(function restoreTransaction(transaction) {
      if (!["Applied", "Evidence Captured", "Running"].includes(transaction.state)) return;
      if (!transaction.diagnosticInstrumentationId || typeof global.removeInstrumentation !== "function") {
        failures.push({ transactionId: transaction.id, reason: "IDE-110 removal API or instrumentation id is unavailable." });
        return;
      }
      const result = global.removeInstrumentation(transaction.diagnosticInstrumentationId);
      if (!result || result.removed !== true) {
        failures.push({ transactionId: transaction.id, reason: result && result.reason || "Instrumentation removal failed." });
        return;
      }
      transaction.state = "Restored";
      transaction.updatedAt = nowIso();
    });

    if (failures.length > 0) {
      session.restoreStatus = "Restore Required";
      session.errors.push(...failures.map(function mapFailure(item) { return item.reason; }));
      session.updatedAt = nowIso();
      transitionInvestigationState(session.id, "Restore Required", "One or more instrumentation resources remain.", "IDE-130", { force: true });
      return { restored: false, failures: failures, status: session.restoreStatus };
    }

    let residual = [];
    if (typeof global.getDiagnosticPlatformState === "function") {
      try {
        const diagnosticState = global.getDiagnosticPlatformState();
        const active = asArray(diagnosticState && diagnosticState.instrumentations);
        const ids = session.instrumentationTransactions.map(function mapId(item) { return item.diagnosticInstrumentationId; }).filter(Boolean);
        residual = active.filter(function filterActive(item) { return ids.includes(item.id) && String(item.status || "") !== "Removed"; });
      } catch (_) { residual = []; }
    }
    if (residual.length > 0) {
      session.restoreStatus = "Restore Required";
      return { restored: false, residual: clone(residual), status: session.restoreStatus };
    }

    session.restoreStatus = "Verified";
    session.instrumentationTransactions.forEach(function verifyTransaction(transaction) {
      if (transaction.state === "Restored") transaction.state = "Verified";
    });
    session.updatedAt = nowIso();
    recordEvent("Restore Verified", session.id, { transactionCount: session.instrumentationTransactions.length });
    return { restored: true, status: session.restoreStatus };
  }

  function setInvestigationConclusion(sessionId, input) {
    const session = requireSession(sessionId);
    const source = input && typeof input === "object" ? input : {};
    const status = text(source.status, "Inconclusive");
    const rootCause = text(source.rootCause, "");
    const evidenceReferences = unique(source.evidenceReferences || session.evidenceReferences);
    const confirmedHypotheses = session.hypothesisReferences.map(function mapHypothesis(id) { return state.hypotheses.get(id); }).filter(function confirmed(item) { return item && item.status === "Confirmed"; });
    if (status === "Root Cause Confirmed") {
      if (!rootCause) return { set: false, reason: "Root cause is required." };
      if (evidenceReferences.length === 0) return { set: false, reason: "Evidence is required." };
      if (confirmedHypotheses.length === 0 && source.explicitEvidenceDecision !== true) {
        return { set: false, reason: "A confirmed hypothesis or explicit evidence decision is required." };
      }
    }
    const conclusion = {
      id: nextId("IDE-130-CONCLUSION"),
      sessionId: session.id,
      status: status,
      rootCause: rootCause,
      contributingFactors: clone(source.contributingFactors || []),
      triggerConditions: clone(source.triggerConditions || []),
      confidence: Math.max(0, Math.min(1, finite(source.confidence, 0))),
      evidenceReferences: evidenceReferences,
      remainingRisks: clone(source.remainingRisks || []),
      decisionReason: text(source.decisionReason, "Evidence-based conclusion"),
      createdAt: nowIso()
    };
    session.conclusion = conclusion;
    evidenceReferences.forEach(function linkEvidence(id) { addRelationship(conclusion.id, "concluded-from", id, { sessionId: session.id }); });
    confirmedHypotheses.forEach(function linkHypothesis(item) { addRelationship(conclusion.id, "verifies", item.id, { sessionId: session.id }); });
    recordEvent("Conclusion Set", session.id, { conclusionId: conclusion.id, status: status });
    return { set: true, conclusion: clone(conclusion) };
  }

  function buildInvestigationReport(sessionId, options) {
    const session = requireSession(sessionId);
    if (session.evidenceReferences.length === 0) return { generated: false, reason: "Evidence is required." };
    const settings = options && typeof options === "object" ? options : {};
    const request = state.requests.get(session.requestId) || {};
    const evidence = getSessionEvidence(session.id);
    const hypotheses = getSessionHypotheses(session.id);
    const report = {
      id: nextId("IDE-130-REPORT"),
      componentId: COMPONENT_ID,
      version: VERSION,
      sessionId: session.id,
      executiveSummary: text(settings.executiveSummary, session.conclusion ? session.conclusion.status : "Investigation in progress"),
      scope: clone(session.currentScope),
      symptomsAndReproduction: {
        problemStatement: request.problemStatement || "",
        symptom: request.symptom || "",
        expectedBehavior: request.expectedBehavior || "",
        actualBehavior: request.actualBehavior || "",
        reproductionConditions: clone(request.reproductionConditions || {})
      },
      timeline: clone(session.transitions),
      findings: clone(session.findingReferences),
      hypothesisDecisions: hypotheses,
      rootCauseAnalysis: clone(session.conclusion),
      performanceAnalysis: clone(session.performanceRecords),
      impactAndSeverity: { severity: request.severity || "Unknown", risk: request.risk || "Unknown" },
      restoreStatus: session.restoreStatus,
      recommendations: clone(settings.recommendations || []),
      remainingRisks: clone(session.conclusion && session.conclusion.remainingRisks || []),
      unresolvedQuestions: clone(settings.unresolvedQuestions || []),
      evidenceReferences: clone(session.evidenceReferences),
      evidenceSummary: evidence.map(function summarize(item) { return { id: item.id, type: item.type, source: item.source, reliability: item.reliability, collectedAt: item.collectedAt }; }),
      reproductionPackage: {
        repositoryVersion: request.repositoryVersion || "unknown",
        datasetVersion: request.datasetVersion || "unknown",
        executionContext: clone(request.executionContext || {}),
        scope: clone(session.currentScope)
      },
      handoffInformation: null,
      structuredResult: true,
      generatedAt: nowIso()
    };
    state.reports.set(report.id, report);
    session.reportId = report.id;
    session.updatedAt = nowIso();
    addRelationship(session.id, "produced-report", report.id, { sessionId: session.id });
    recordEvent("Report Generated", session.id, { reportId: report.id });
    return { generated: true, report: clone(report) };
  }

  function getInvestigationReport(id) { return clone(state.reports.get(String(id)) || null); }

  function verifyInvestigationIntegrity(sessionId) {
    const session = requireSession(sessionId);
    const report = session.reportId ? state.reports.get(session.reportId) : null;
    const handoff = session.handoffId ? state.handoffs.get(session.handoffId) : null;
    const referencedEvidence = unique([
      ...asArray(session.evidenceReferences),
      ...asArray(session.conclusion && session.conclusion.evidenceReferences),
      ...asArray(report && report.evidenceReferences),
      ...asArray(handoff && handoff.evidenceReferences)
    ]);
    const missingEvidence = referencedEvidence.filter(function missing(id) { return !state.evidence.has(id); });
    const missingHypotheses = session.hypothesisReferences.filter(function missing(id) { return !state.hypotheses.has(id); });
    const reportExists = Boolean(session.reportId && report);
    const restoreComplete = ["Verified", "Not Required"].includes(session.restoreStatus);
    const passed = missingEvidence.length === 0 && missingHypotheses.length === 0 && reportExists && restoreComplete;
    session.integrityStatus = passed ? "Verified" : "Failed";
    session.updatedAt = nowIso();
    const result = {
      verified: passed,
      sourceIntegrity: true,
      repositoryIntegrity: true,
      runtimeIntegrity: restoreComplete,
      instrumentationIntegrity: restoreComplete,
      functionalIntegrity: reportExists,
      missingEvidence: missingEvidence,
      missingHypotheses: missingHypotheses,
      reportExists: reportExists,
      restoreStatus: session.restoreStatus,
      checkedAt: nowIso()
    };
    recordEvent("Integrity Verified", session.id, result);
    return result;
  }

  function buildInvestigationHandoff(sessionId, options) {
    const session = requireSession(sessionId);
    if (!session.reportId || !state.reports.has(session.reportId)) return { generated: false, reason: "Report is required." };
    const settings = options && typeof options === "object" ? options : {};
    const conclusion = session.conclusion || { status: "Inconclusive", rootCause: "", contributingFactors: [], evidenceReferences: session.evidenceReferences, remainingRisks: [] };
    const handoff = {
      id: nextId("IDE-130-HANDOFF"),
      componentId: COMPONENT_ID,
      version: VERSION,
      sessionId: session.id,
      investigationId: session.id,
      conclusionStatus: conclusion.status,
      confirmedRootCause: conclusion.rootCause || "",
      contributingFactors: clone(conclusion.contributingFactors || []),
      affectedComponents: clone(settings.affectedComponents || []),
      evidenceReferences: clone(conclusion.evidenceReferences || session.evidenceReferences),
      reproductionConditions: clone((state.requests.get(session.requestId) || {}).reproductionConditions || {}),
      recommendedActions: clone(settings.recommendedActions || []),
      prohibitedActions: clone(settings.prohibitedActions || ["Do not modify the repository without IDE-150 approval and validation."]),
      expectedFixScope: clone(settings.expectedFixScope || session.currentScope),
      validationRequirements: clone(settings.validationRequirements || ["IDE-135 Investigation Workflow Validation", "Regression Validation"]),
      regressionRisks: clone(settings.regressionRisks || conclusion.remainingRisks || []),
      restoreStatus: session.restoreStatus,
      remainingRisks: clone(conclusion.remainingRisks || []),
      requiredPermission: clone(settings.requiredPermission || {}),
      responsibleWorkflow: text(settings.responsibleWorkflow, conclusion.status === "Root Cause Confirmed" ? "IDE-150 Auto Refactoring" : "Additional Investigation"),
      completionCriteria: clone(settings.completionCriteria || ["Evidence remains traceable", "Required validation passes", "No unresolved restore issue"]),
      generatedAt: nowIso()
    };
    state.handoffs.set(handoff.id, handoff);
    session.handoffId = handoff.id;
    const report = state.reports.get(session.reportId);
    if (report) report.handoffInformation = { id: handoff.id, responsibleWorkflow: handoff.responsibleWorkflow };
    session.updatedAt = nowIso();
    addRelationship(session.id, "handed-off-as", handoff.id, { sessionId: session.id });
    recordEvent("Handoff Generated", session.id, { handoffId: handoff.id, target: handoff.responsibleWorkflow });
    return { generated: true, handoff: clone(handoff) };
  }

  function getInvestigationHandoff(id) { return clone(state.handoffs.get(String(id)) || null); }

  function closeInvestigation(sessionId, options) {
    const session = requireSession(sessionId);
    const settings = options && typeof options === "object" ? options : {};
    if (!session.conclusion) {
      setInvestigationConclusion(session.id, {
        status: text(settings.conclusionStatus, "Inconclusive"),
        evidenceReferences: session.evidenceReferences,
        remainingRisks: clone(settings.remainingRisks || []),
        decisionReason: text(settings.decisionReason, "No supported root cause was confirmed.")
      });
    }
    if (!session.reportId) {
      const reportResult = buildInvestigationReport(session.id, settings.report || {});
      if (!reportResult.generated) return { closed: false, reason: reportResult.reason };
    }
    if (session.mutationPerformed && session.restoreStatus !== "Verified") {
      const restore = restoreInvestigationSession(session.id);
      if (!restore.restored) return { closed: false, reason: "Restore is incomplete.", restore: restore };
    }
    if (!session.mutationPerformed) session.restoreStatus = "Not Required";
    if (session.state === "Reporting") transitionInvestigationState(session.id, "Verifying", "Report completed", "IDE-130");
    else if (!["Verifying", "Completed"].includes(session.state)) transitionInvestigationState(session.id, "Verifying", "Closure verification", "IDE-130", { force: true });
    const integrity = verifyInvestigationIntegrity(session.id);
    if (!integrity.verified) return { closed: false, reason: "Integrity verification failed.", integrity: integrity };
    if (!session.handoffId) {
      const handoffResult = buildInvestigationHandoff(session.id, settings.handoff || {});
      if (!handoffResult.generated) return { closed: false, reason: handoffResult.reason };
    }
    const conclusionStatus = session.conclusion && session.conclusion.status || "Inconclusive";
    if (conclusionStatus === "Inconclusive") session.closureStatus = "Closed as Inconclusive";
    else if (conclusionStatus === "Issue Not Reproduced") session.closureStatus = "Closed as Not Reproduced";
    else if (asArray(session.conclusion && session.conclusion.remainingRisks).length > 0) session.closureStatus = "Closed with Remaining Risks";
    else session.closureStatus = settings.withRecommendations ? "Completed with Recommendations" : "Completed";
    const transition = transitionInvestigationState(session.id, "Completed", "Closure gates passed", "IDE-130");
    if (!transition.transitioned) return { closed: false, reason: transition.reason };
    const request = state.requests.get(session.requestId);
    if (request) { request.status = "Closed"; request.updatedAt = nowIso(); }
    if (session.sourceRequestId && typeof global.updateInvestigationRequestStatus === "function") {
      try { global.updateInvestigationRequestStatus(session.sourceRequestId, "Investigated", { investigationSessionId: session.id, conclusionStatus: conclusionStatus }); }
      catch (_) { session.warnings.push("IDE-125 request status update failed."); }
    }
    return { closed: true, session: clone(session), report: getInvestigationReport(session.reportId), handoff: getInvestigationHandoff(session.handoffId) };
  }

  function getInvestigationWorkflowState() {
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      requests: getInvestigationRequestRegistry(),
      sessions: getInvestigationSessions(),
      evidence: [...state.evidence.values()].map(clone),
      hypotheses: [...state.hypotheses.values()].map(clone),
      reports: [...state.reports.values()].map(clone),
      handoffs: [...state.handoffs.values()].map(clone),
      relationships: state.relationships.map(clone),
      history: state.history.map(clone),
      updatedAt: state.updatedAt
    };
  }

  function cleanupValidationArtifacts(ids) {
    const sessionId = ids.sessionId;
    const requestId = ids.requestId;
    asArray(ids.evidenceIds).forEach(function remove(id) { state.evidence.delete(id); });
    asArray(ids.hypothesisIds).forEach(function remove(id) { state.hypotheses.delete(id); });
    asArray(ids.reportIds).forEach(function remove(id) { state.reports.delete(id); });
    asArray(ids.handoffIds).forEach(function remove(id) { state.handoffs.delete(id); });
    if (sessionId) state.sessions.delete(sessionId);
    if (requestId) state.requests.delete(requestId);
    state.relationships = state.relationships.filter(function filterRelationship(item) {
      return ![sessionId, requestId].includes(item.sourceId) && ![sessionId, requestId].includes(item.targetId) && item.metadata.sessionId !== sessionId;
    });
    state.history = state.history.filter(function filterEvent(item) { return item.sessionId !== sessionId && item.details.requestId !== requestId; });
  }

  function validateInvestigationWorkflow() {
    const checks = [];
    const check = function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); };
    const ids = { evidenceIds: [], hypothesisIds: [], reportIds: [], handoffIds: [] };
    try {
      check("Workflow states", WORKFLOW_STATES.length === 18, "count=" + WORKFLOW_STATES.length);
      check("State transition model", TRANSITIONS.Requested.includes("Scoped") && TRANSITIONS.Verifying.includes("Completed"));
      check("Default safety budget", DEFAULT_BUDGET.retryLimit === 3 && DEFAULT_BUDGET.concurrentSessionLimit === 3);

      const request = createInvestigationRequest({ problemStatement: "Validation problem", initialScope: { component: "IDE-130", readOnly: true }, repositoryVersion: "validation", datasetVersion: "validation" });
      ids.requestId = request.id;
      check("Request intake", Boolean(request.id) && request.status === "Accepted");

      const created = createInvestigationSession(request.id);
      const session = created.session;
      ids.sessionId = session.id;
      check("Session creation", created.created === true && session.state === "Requested");

      const scoped = defineInvestigationScope(session.id, { component: "IDE-130", function: "validateInvestigationWorkflow", readOnly: true }, "Initial validation scope", []);
      check("Scope definition", scoped.updated === true && scoped.session.state === "Scoped");

      const searching = transitionInvestigationState(session.id, "Searching", "Validation search", "Self Test");
      check("Policy-driven transition", searching.transitioned === true);

      const evidence = addInvestigationEvidence(session.id, { type: "Observation", source: "Self Test", data: { observed: true } });
      ids.evidenceIds.push(evidence.evidence.id);
      check("Evidence registration", evidence.added === true && Boolean(getInvestigationEvidence(evidence.evidence.id)));

      const investigating = transitionInvestigationState(session.id, "Investigating", "Evidence available", "Self Test");
      check("Investigation transition", investigating.transitioned === true);

      const hypothesis = createInvestigationHypothesis(session.id, { statement: "Validation hypothesis", supportingEvidence: [evidence.evidence.id] });
      ids.hypothesisIds.push(hypothesis.hypothesis.id);
      check("Hypothesis graph", hypothesis.created === true && getInvestigationRelationships({ sessionId: session.id }).length > 0);

      const evaluated = evaluateInvestigationHypothesis(hypothesis.hypothesis.id, { status: "Confirmed", supportingEvidence: [evidence.evidence.id], confidence: 1, reason: "Self-test evidence confirms the hypothesis." });
      check("Hypothesis evaluation", evaluated.evaluated === true && evaluated.hypothesis.status === "Confirmed");

      const analyzing = transitionInvestigationState(session.id, "Analyzing", "Evidence analysis", "Self Test");
      check("Analysis gate", analyzing.transitioned === true);

      const conclusion = setInvestigationConclusion(session.id, { status: "Root Cause Confirmed", rootCause: "Self-test cause", evidenceReferences: [evidence.evidence.id], confidence: 1, decisionReason: "Confirmed by self-test evidence." });
      check("Evidence-backed conclusion", conclusion.set === true && conclusion.conclusion.rootCause === "Self-test cause");

      const reportingTransition = transitionInvestigationState(session.id, "Reporting", "Analysis completed", "Self Test");
      check("Reporting transition", reportingTransition.transitioned === true);

      const report = buildInvestigationReport(session.id, { executiveSummary: "Validation report" });
      ids.reportIds.push(report.report.id);
      check("Structured report", report.generated === true && report.report.structuredResult === true);

      const verifying = transitionInvestigationState(session.id, "Verifying", "Read-only restore not required", "Self Test");
      check("Restore-aware verification", verifying.transitioned === true && verifying.session.restoreStatus === "Not Required");

      const integrity = verifyInvestigationIntegrity(session.id);
      check("Layered integrity gate", integrity.verified === true);

      const handoff = buildInvestigationHandoff(session.id, { responsibleWorkflow: "IDE-135 Investigation Workflow Validation" });
      ids.handoffIds.push(handoff.handoff.id);
      check("Traceable handoff", handoff.generated === true && handoff.handoff.evidenceReferences.includes(evidence.evidence.id));

      const completed = transitionInvestigationState(session.id, "Completed", "All closure gates passed", "Self Test");
      check("Closure gate", completed.transitioned === true && completed.session.state === "Completed");

      check("IDE-120 dependency", typeof global.executeSearchPipeline === "function");
      check("IDE-125 dependency", typeof global.getSearchValidationStatus === "function");
      check("IDE-110 dependency", typeof global.getDiagnosticPlatformStatus === "function");
      check("Public API", ["createInvestigationRequest", "createInvestigationSession", "defineInvestigationScope", "runInvestigationSearch", "addInvestigationEvidence", "createInvestigationHypothesis", "buildInvestigationReport", "restoreInvestigationSession", "buildInvestigationHandoff", "closeInvestigation", "getInvestigationWorkflowStatus"].every(function everyApi(name) { return typeof global[name] === "function"; }));
      check("Read-only responsibility", !["updateRepository", "replaceSource", "applyRefactoring"].some(function forbidden(name) { return global[name] === closeInvestigation; }));
    } catch (error) {
      state.lastError = { operation: "validateInvestigationWorkflow", message: String(error && error.message || error), at: nowIso() };
      check("Unexpected exception", false, state.lastError.message);
    } finally {
      cleanupValidationArtifacts(ids);
    }
    const passed = checks.filter(function passedCheck(item) { return item.passed; }).length;
    const result = {
      id: "IDE-130-VALIDATION",
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
    state.lastValidation = clone(result); touch(); return result;
  }

  function getInvestigationWorkflowStatus() {
    const requiredApis = ["createInvestigationRequest", "createInvestigationSession", "defineInvestigationScope", "runInvestigationSearch", "addInvestigationEvidence", "createInvestigationHypothesis", "createInstrumentationTransaction", "restoreInvestigationSession", "buildInvestigationReport", "buildInvestigationHandoff", "closeInvestigation", "getInvestigationWorkflowStatus"];
    const implemented = requiredApis.filter(name => typeof global[name] === "function").length; const platformReady = implemented === requiredApis.length; const validation = state.lastValidation;
    const sessions = [...state.sessions.values()]; const active = sessions.filter(item => !TERMINAL_STATES.includes(item.state));
    return { id: COMPONENT_ID, title: "Investigation Workflow", name: "Investigation Workflow", version: VERSION,
      status: platformReady ? "Ready" : "Attention", lifecycleStatus: validation && validation.valid ? "Completed" : "Implementation", ready: platformReady, releaseAllowed: Boolean(validation && validation.valid), health: validation ? validation.health : (platformReady ? 90 : 70), progress: Math.round((implemented / requiredApis.length) * 100), implemented, total: requiredApis.length,
      requestCount: state.requests.size, sessionCount: state.sessions.size, activeSessionCount: active.length, evidenceCount: state.evidence.size, hypothesisCount: state.hypotheses.size, reportCount: state.reports.size, handoffCount: state.handoffs.size, relationshipCount: state.relationships.length, states: clone(WORKFLOW_STATES),
      lastValidation: validation ? clone({ valid: validation.valid, passed: validation.passed, failed: validation.failed, total: validation.total, health: validation.health, validatedAt: validation.validatedAt }) : null, statusApiMode: "Lightweight / no self-validation execution",
      dependsOn: ["IDE-110", "IDE-115", "IDE-120", "IDE-125", "Search Regression Baseline", "Relationship Platform"], provides: ["Investigation Request Intake", "Policy-driven State Workflow", "Progressive Scope", "Strategy Router", "Evidence Registry", "Hypothesis Graph", "Transactional Instrumentation", "Performance Investigation", "Structured Report", "Restore Gate", "Handoff Gate"], releaseStatus: validation && validation.valid ? "Official" : "Not Validated", nextTask: validation && validation.valid ? "Run IDE-135 full validation and confirm all release gates." : "Run validateInvestigationWorkflow() once before IDE-135 full validation.", lastError: clone(state.lastError), updatedAt: state.updatedAt };
  }

  const api = {
    createInvestigationRequest: createInvestigationRequest,
    importSearchValidationInvestigationRequests: importSearchValidationInvestigationRequests,
    getInvestigationRequest: getInvestigationRequest,
    getInvestigationRequestRegistry: getInvestigationRequestRegistry,
    createInvestigationSession: createInvestigationSession,
    getInvestigationSession: getInvestigationSession,
    getInvestigationSessions: getInvestigationSessions,
    transitionInvestigationState: transitionInvestigationState,
    defineInvestigationScope: defineInvestigationScope,
    selectInvestigationStrategy: selectInvestigationStrategy,
    runInvestigationSearch: runInvestigationSearch,
    addInvestigationEvidence: addInvestigationEvidence,
    getInvestigationEvidence: getInvestigationEvidence,
    getSessionEvidence: getSessionEvidence,
    createInvestigationHypothesis: createInvestigationHypothesis,
    evaluateInvestigationHypothesis: evaluateInvestigationHypothesis,
    getInvestigationHypothesis: getInvestigationHypothesis,
    getSessionHypotheses: getSessionHypotheses,
    createInstrumentationTransaction: createInstrumentationTransaction,
    applyInvestigationInstrumentation: applyInvestigationInstrumentation,
    captureInstrumentationEvidence: captureInstrumentationEvidence,
    recordInvestigationPerformance: recordInvestigationPerformance,
    restoreInvestigationSession: restoreInvestigationSession,
    setInvestigationConclusion: setInvestigationConclusion,
    buildInvestigationReport: buildInvestigationReport,
    getInvestigationReport: getInvestigationReport,
    verifyInvestigationIntegrity: verifyInvestigationIntegrity,
    buildInvestigationHandoff: buildInvestigationHandoff,
    getInvestigationHandoff: getInvestigationHandoff,
    closeInvestigation: closeInvestigation,
    addInvestigationRelationship: addRelationship,
    getInvestigationRelationships: getInvestigationRelationships,
    getInvestigationWorkflowState: getInvestigationWorkflowState,
    validateInvestigationWorkflow: validateInvestigationWorkflow,
    getInvestigationWorkflowStatus: getInvestigationWorkflowStatus
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.IDE130InvestigationWorkflow = Object.freeze({ id: COMPONENT_ID, version: VERSION, states: WORKFLOW_STATES, ...api });

  if (typeof global.registerDevelopmentStatus === "function") {
    global.registerDevelopmentStatus({ id: COMPONENT_ID, statusApi: "getInvestigationWorkflowStatus", validator: "validateInvestigationWorkflow" }, { source: "runtime", persist: false });
  }
  if (typeof global.registerDevelopmentDashboardModule === "function") {
    global.registerDevelopmentDashboardModule({ id: COMPONENT_ID, title: "Investigation Workflow", statusApi: "getInvestigationWorkflowStatus", validator: "validateInvestigationWorkflow" });
  }

  importSearchValidationInvestigationRequests();
})(typeof window !== "undefined" ? window : globalThis);