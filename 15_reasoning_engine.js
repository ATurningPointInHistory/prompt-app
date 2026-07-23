/* ===============================
   FILE: 15_reasoning_engine.js
   Reasoning Engine
   ENGINE-050
   Version: 1.1.0
=============================== */

var REASONING_ENGINE_ID = "ENGINE-050";
var REASONING_ENGINE_TITLE = "Reasoning Engine";
var REASONING_ENGINE_VERSION = "1.1.0";
var REASONING_HISTORY_LIMIT = 300;
var REASONING_CANDIDATE_LIMIT = 200;
var REASONING_EVIDENCE_LIMIT = 1000;
var REASONING_ASSUMPTION_LIMIT = 500;

var reasoningSessions =
  typeof reasoningSessions !== "undefined" && reasoningSessions instanceof Map
    ? reasoningSessions
    : new Map();
var reasoningHistory =
  typeof reasoningHistory !== "undefined" && Array.isArray(reasoningHistory)
    ? reasoningHistory
    : [];
var reasoningEvidenceNodes =
  typeof reasoningEvidenceNodes !== "undefined" && reasoningEvidenceNodes instanceof Map
    ? reasoningEvidenceNodes
    : new Map();
var reasoningEvidenceRelationships =
  typeof reasoningEvidenceRelationships !== "undefined" && Array.isArray(reasoningEvidenceRelationships)
    ? reasoningEvidenceRelationships
    : [];
var reasoningAssumptionNodes =
  typeof reasoningAssumptionNodes !== "undefined" && reasoningAssumptionNodes instanceof Map
    ? reasoningAssumptionNodes
    : new Map();
var reasoningAssumptionRelationships =
  typeof reasoningAssumptionRelationships !== "undefined" && Array.isArray(reasoningAssumptionRelationships)
    ? reasoningAssumptionRelationships
    : [];
var reasoningMetrics =
  typeof reasoningMetrics !== "undefined" && reasoningMetrics && typeof reasoningMetrics === "object"
    ? reasoningMetrics
    : {
        executions: 0,
        completed: 0,
        failed: 0,
        candidatesGenerated: 0,
        evidenceCollected: 0,
        assumptionsCreated: 0,
        reportsGenerated: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        lastExecutionAt: null,
        errors: 0
      };

function createReasoningTimestamp() {
  return new Date().toISOString();
}

function createReasoningId(prefix) {
  return [
    String(prefix || "RSN").toUpperCase(),
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8)
  ].join("-");
}

function cloneReasoningValue(value) {
  if (value == null) return value;
  try { return JSON.parse(JSON.stringify(value)); }
  catch (error) { return value; }
}

function normalizeReasoningObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? cloneReasoningValue(value)
    : {};
}

function normalizeReasoningList(value) {
  return Array.isArray(value) ? value.map(cloneReasoningValue)
    : value == null ? [] : [cloneReasoningValue(value)];
}

function clampReasoningScore(value) {
  var number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
}

function normalizeReasoningTraceLevel(value) {
  var level = String(value || "standard").toLowerCase();
  return ["minimal", "standard", "diagnostic"].includes(level) ? level : "standard";
}

function normalizeReasoningReportLevel(value) {
  var level = String(value || "standard").toLowerCase();
  return ["minimal", "standard", "detailed"].includes(level) ? level : "standard";
}

function normalizeCandidate(candidate, index, sourceName) {
  var item = candidate && typeof candidate === "object"
    ? candidate
    : { value: candidate };
  var id = String(item.id || item.candidateId || createReasoningId("CAND"));
  var title = String(item.title || item.name || item.label || item.value || ("Candidate " + (index + 1)));
  return {
    id: id,
    title: title,
    value: item.value === undefined ? cloneReasoningValue(item) : cloneReasoningValue(item.value),
    source: String(item.source || sourceName || "input"),
    sourceReferences: normalizeReasoningList(item.sourceReferences || item.references),
    metadata: normalizeReasoningObject(item.metadata),
    scores: normalizeReasoningObject(item.scores),
    penalties: normalizeReasoningList(item.penalties),
    evidenceIds: normalizeReasoningList(item.evidenceIds).map(String),
    assumptionIds: normalizeReasoningList(item.assumptionIds).map(String),
    constraintResults: normalizeReasoningList(item.constraintResults),
    finalScore: clampReasoningScore(item.finalScore),
    confidence: clampReasoningScore(item.confidence),
    rank: Number(item.rank || 0),
    createdAt: item.createdAt || createReasoningTimestamp()
  };
}

function generateReasoningCandidates(input, options) {
  input = input || {};
  options = options || {};
  var buckets = [
    ["input", input.candidates],
    ["search", input.searchCandidates || (input.search && input.search.results)],
    ["context", input.contextCandidates || (input.context && input.context.candidates)],
    ["perception", input.perceptionCandidates || (input.perception && input.perception.candidates)],
    ["repository", input.repositoryCandidates || input.knowledgeCandidates],
    ["rule", input.ruleCandidates]
  ];
  var merged = [];
  buckets.forEach(function (entry) {
    normalizeReasoningList(entry[1]).forEach(function (candidate, index) {
      merged.push(normalizeCandidate(candidate, index, entry[0]));
    });
  });
  if (!merged.length && input.decisionOptions) {
    normalizeReasoningList(input.decisionOptions).forEach(function (candidate, index) {
      merged.push(normalizeCandidate(candidate, index, "decisionOptions"));
    });
  }
  var byKey = new Map();
  merged.forEach(function (candidate) {
    var key = String(candidate.id || candidate.title).toLowerCase();
    if (!byKey.has(key)) byKey.set(key, candidate);
    else {
      var current = byKey.get(key);
      current.sourceReferences = current.sourceReferences.concat(candidate.sourceReferences);
      current.evidenceIds = Array.from(new Set(current.evidenceIds.concat(candidate.evidenceIds)));
      current.assumptionIds = Array.from(new Set(current.assumptionIds.concat(candidate.assumptionIds)));
      current.metadata = Object.assign({}, current.metadata, candidate.metadata);
    }
  });
  var result = Array.from(byKey.values()).slice(0, Number(options.limit || REASONING_CANDIDATE_LIMIT));
  reasoningMetrics.candidatesGenerated += result.length;
  return result;
}

function createEvidenceNode(evidence, options) {
  evidence = evidence || {};
  options = options || {};
  var id = String(evidence.id || createReasoningId("EVD"));
  var node = {
    id: id,
    type: "evidence",
    title: String(evidence.title || evidence.name || id),
    summary: String(evidence.summary || evidence.text || evidence.content || ""),
    value: evidence.value === undefined ? null : cloneReasoningValue(evidence.value),
    source: String(evidence.source || options.source || "unknown"),
    sourceReference: evidence.sourceReference || evidence.reference || null,
    reliability: clampReasoningScore(evidence.reliability == null ? 70 : evidence.reliability),
    relevance: clampReasoningScore(evidence.relevance == null ? 70 : evidence.relevance),
    confidence: clampReasoningScore(evidence.confidence == null ? 70 : evidence.confidence),
    metadata: normalizeReasoningObject(evidence.metadata),
    createdAt: evidence.createdAt || createReasoningTimestamp(),
    updatedAt: createReasoningTimestamp()
  };
  if (!reasoningEvidenceNodes.has(id) && reasoningEvidenceNodes.size >= REASONING_EVIDENCE_LIMIT) {
    var oldest = reasoningEvidenceNodes.keys().next().value;
    reasoningEvidenceNodes.delete(oldest);
  }
  reasoningEvidenceNodes.set(id, node);
  reasoningMetrics.evidenceCollected += 1;
  return cloneReasoningValue(node);
}

function getEvidenceNode(id) {
  var node = reasoningEvidenceNodes.get(String(id || ""));
  return node ? cloneReasoningValue(node) : null;
}

function listEvidenceNodes() {
  return Array.from(reasoningEvidenceNodes.values()).map(cloneReasoningValue);
}

function addEvidenceRelationship(sourceId, type, targetId, metadata) {
  var allowed = ["supports", "conflicts", "dependsOn", "relatedTo", "derivedFrom", "producedBy", "validates"];
  var relationType = String(type || "relatedTo");
  if (!allowed.includes(relationType)) throw new Error("Unsupported evidence relationship: " + relationType);
  var relationship = {
    id: createReasoningId("EVR"),
    sourceId: String(sourceId || ""),
    type: relationType,
    targetId: String(targetId || ""),
    metadata: normalizeReasoningObject(metadata),
    createdAt: createReasoningTimestamp()
  };
  reasoningEvidenceRelationships.push(relationship);
  return cloneReasoningValue(relationship);
}

function getEvidenceGraph(options) {
  options = options || {};
  var ids = normalizeReasoningList(options.ids).map(String);
  var nodes = listEvidenceNodes().filter(function (node) { return !ids.length || ids.includes(node.id); });
  var nodeIds = nodes.map(function (node) { return node.id; });
  var relationships = reasoningEvidenceRelationships.filter(function (rel) {
    return !ids.length || nodeIds.includes(rel.sourceId) || nodeIds.includes(rel.targetId);
  });
  return { nodes: nodes, relationships: cloneReasoningValue(relationships) };
}

function createAssumptionNode(assumption, options) {
  assumption = assumption || {};
  options = options || {};
  var id = String(assumption.id || createReasoningId("ASM"));
  var node = {
    id: id,
    type: "assumption",
    statement: String(assumption.statement || assumption.summary || assumption.text || ""),
    confidence: clampReasoningScore(assumption.confidence == null ? 50 : assumption.confidence),
    validationState: String(assumption.validationState || "unvalidated"),
    reviewRequired: assumption.reviewRequired !== false,
    metadata: normalizeReasoningObject(assumption.metadata),
    createdAt: assumption.createdAt || createReasoningTimestamp(),
    updatedAt: createReasoningTimestamp()
  };
  if (!reasoningAssumptionNodes.has(id) && reasoningAssumptionNodes.size >= REASONING_ASSUMPTION_LIMIT) {
    reasoningAssumptionNodes.delete(reasoningAssumptionNodes.keys().next().value);
  }
  reasoningAssumptionNodes.set(id, node);
  reasoningMetrics.assumptionsCreated += 1;
  return cloneReasoningValue(node);
}

function getAssumptionNode(id) {
  var node = reasoningAssumptionNodes.get(String(id || ""));
  return node ? cloneReasoningValue(node) : null;
}

function addAssumptionRelationship(sourceId, type, targetId, metadata) {
  var allowed = ["derivedFrom", "supportedBy", "conflictsWith", "resolvedBy"];
  var relationType = String(type || "derivedFrom");
  if (!allowed.includes(relationType)) throw new Error("Unsupported assumption relationship: " + relationType);
  var relationship = {
    id: createReasoningId("ASR"),
    sourceId: String(sourceId || ""),
    type: relationType,
    targetId: String(targetId || ""),
    metadata: normalizeReasoningObject(metadata),
    createdAt: createReasoningTimestamp()
  };
  reasoningAssumptionRelationships.push(relationship);
  return cloneReasoningValue(relationship);
}

function getAssumptionGraph(options) {
  options = options || {};
  var ids = normalizeReasoningList(options.ids).map(String);
  var nodes = Array.from(reasoningAssumptionNodes.values()).map(cloneReasoningValue)
    .filter(function (node) { return !ids.length || ids.includes(node.id); });
  var nodeIds = nodes.map(function (node) { return node.id; });
  return {
    nodes: nodes,
    relationships: cloneReasoningValue(reasoningAssumptionRelationships.filter(function (rel) {
      return !ids.length || nodeIds.includes(rel.sourceId) || nodeIds.includes(rel.targetId);
    }))
  };
}

function evaluateReasoningConstraints(candidate, constraints) {
  return normalizeReasoningList(constraints).map(function (constraint, index) {
    var item = constraint && typeof constraint === "object" ? constraint : { value: constraint };
    var passed = true;
    var error = null;
    try {
      if (typeof item.test === "function") passed = item.test(candidate) !== false;
      else if (item.required === true && item.value === false) passed = false;
      else if (item.passed === false) passed = false;
    } catch (caught) {
      passed = false;
      error = String(caught.message || caught);
    }
    return {
      id: String(item.id || ("CONSTRAINT-" + (index + 1))),
      title: String(item.title || item.name || ("Constraint " + (index + 1))),
      passed: passed,
      weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 1,
      required: item.required === true,
      penalty: passed ? 0 : clampReasoningScore(item.penalty == null ? 20 : item.penalty),
      error: error
    };
  });
}

function calculateEvidenceQuality(candidate) {
  var evidence = candidate.evidenceIds.map(getEvidenceNode).filter(Boolean);
  if (!evidence.length) return 50;
  var total = evidence.reduce(function (sum, item) {
    return sum + (item.reliability * 0.4 + item.relevance * 0.35 + item.confidence * 0.25);
  }, 0);
  return clampReasoningScore(total / evidence.length);
}

function scoreReasoningCandidate(candidate, input, options) {
  input = input || {};
  options = options || {};
  var weights = Object.assign({
    rule: 0.15,
    evidence: 0.25,
    context: 0.15,
    perception: 0.10,
    constraint: 0.15,
    repository: 0.10,
    confidenceModifier: 0.10
  }, normalizeReasoningObject(options.weights || input.weights));
  var sourceScores = Object.assign({
    rule: 50,
    evidence: calculateEvidenceQuality(candidate),
    context: clampReasoningScore(candidate.scores.context == null ? 50 : candidate.scores.context),
    perception: clampReasoningScore(candidate.scores.perception == null ? 50 : candidate.scores.perception),
    repository: clampReasoningScore(candidate.scores.repository == null ? 50 : candidate.scores.repository),
    confidenceModifier: clampReasoningScore(candidate.scores.confidenceModifier == null ? 50 : candidate.scores.confidenceModifier)
  }, normalizeReasoningObject(candidate.scores));
  var constraints = evaluateReasoningConstraints(candidate, input.constraints);
  var passedWeight = constraints.reduce(function (sum, item) { return sum + (item.passed ? item.weight : 0); }, 0);
  var totalWeight = constraints.reduce(function (sum, item) { return sum + item.weight; }, 0);
  sourceScores.constraint = totalWeight ? (passedWeight / totalWeight) * 100 : 100;
  var weighted = Object.keys(weights).reduce(function (sum, key) {
    return sum + clampReasoningScore(sourceScores[key]) * Number(weights[key] || 0);
  }, 0);
  var weightTotal = Object.keys(weights).reduce(function (sum, key) { return sum + Number(weights[key] || 0); }, 0) || 1;
  var penalty = constraints.reduce(function (sum, item) { return sum + item.penalty; }, 0) +
    normalizeReasoningList(candidate.penalties).reduce(function (sum, item) { return sum + Number(item.value || item || 0); }, 0);
  candidate.constraintResults = constraints;
  candidate.scores = sourceScores;
  candidate.finalScore = clampReasoningScore(weighted / weightTotal - penalty);
  return candidate;
}

function calculateReasoningConfidence(candidate, validation) {
  var evidenceQuality = calculateEvidenceQuality(candidate);
  var assumptionNodes = candidate.assumptionIds.map(getAssumptionNode).filter(Boolean);
  var assumptionQuality = assumptionNodes.length
    ? assumptionNodes.reduce(function (sum, item) { return sum + item.confidence; }, 0) / assumptionNodes.length
    : 60;
  var constraintSatisfaction = candidate.constraintResults.length
    ? candidate.constraintResults.filter(function (item) { return item.passed; }).length / candidate.constraintResults.length * 100
    : 100;
  var validationScore = validation && validation.valid === false ? 35 : 90;
  candidate.confidence = clampReasoningScore(
    candidate.finalScore * 0.30 + evidenceQuality * 0.25 + assumptionQuality * 0.15 +
    constraintSatisfaction * 0.15 + validationScore * 0.15
  );
  return candidate.confidence;
}

function createReasoningTrace(session, candidates, decision, options) {
  options = options || {};
  var level = normalizeReasoningTraceLevel(options.traceLevel);
  var trace = {
    id: createReasoningId("TRACE"),
    level: level,
    sessionId: session.id,
    inputSummary: session.inputSummary,
    candidateIds: candidates.map(function (item) { return item.id; }),
    selectedCandidateId: decision ? decision.id : null,
    evidenceIds: Array.from(new Set(candidates.flatMap(function (item) { return item.evidenceIds; }))),
    assumptionIds: Array.from(new Set(candidates.flatMap(function (item) { return item.assumptionIds; }))),
    reasons: decision ? ["highest normalized weighted score", "confidence and constraints evaluated"] : ["no selectable candidate"],
    createdAt: createReasoningTimestamp()
  };
  if (level !== "minimal") {
    trace.ranking = candidates.map(function (item) {
      return { id: item.id, score: item.finalScore, confidence: item.confidence, rank: item.rank };
    });
  }
  if (level === "diagnostic") {
    trace.diagnostics = candidates.map(function (item) {
      return { id: item.id, scores: cloneReasoningValue(item.scores), constraints: cloneReasoningValue(item.constraintResults) };
    });
  }
  return trace;
}

function validateReasoningResult(result) {
  if (typeof validateTargetSync === "function") {
    try {
      return validateTargetSync(result, { targetType: "custom", metadata: { engineId: REASONING_ENGINE_ID } });
    } catch (error) {
      return { valid: false, error: String(error.message || error) };
    }
  }
  return { valid: true, skipped: true, reason: "ENGINE-040 unavailable" };
}

function createReasoningReport(result, options) {
  options = options || {};
  var level = normalizeReasoningReportLevel(options.reportLevel);
  var decision = result.decision;
  var report = {
    id: createReasoningId("REPORT"),
    level: level,
    summary: decision ? ("Selected " + decision.title) : "No decision selected",
    decision: decision ? cloneReasoningValue(decision) : null,
    explanation: decision
      ? "The selected candidate achieved the highest weighted score after evidence, constraints, confidence and validation were considered."
      : "No candidate satisfied the selection requirements.",
    evidenceReferences: decision ? cloneReasoningValue(decision.evidenceIds) : [],
    assumptionReferences: decision ? cloneReasoningValue(decision.assumptionIds) : [],
    constraintReferences: decision ? decision.constraintResults.map(function (item) { return item.id; }) : [],
    decisionTraceReference: result.trace ? result.trace.id : null,
    confidence: decision ? decision.confidence : 0,
    validation: cloneReasoningValue(result.validation),
    createdAt: createReasoningTimestamp()
  };
  if (level === "detailed") {
    report.ranking = cloneReasoningValue(result.candidates);
    report.trace = cloneReasoningValue(result.trace);
    report.evidenceGraph = getEvidenceGraph({ ids: report.evidenceReferences });
    report.assumptionGraph = getAssumptionGraph({ ids: report.assumptionReferences });
  }
  reasoningMetrics.reportsGenerated += 1;
  return report;
}

function addReasoningHistory(record) {
  reasoningHistory.push(cloneReasoningValue(record));
  while (reasoningHistory.length > REASONING_HISTORY_LIMIT) reasoningHistory.shift();
}

function getReasoningHistory(options) {
  options = options || {};
  var limit = Math.max(0, Math.min(Number(options.limit || REASONING_HISTORY_LIMIT), REASONING_HISTORY_LIMIT));
  return cloneReasoningValue(reasoningHistory.slice(-limit).reverse());
}

function clearReasoningHistory() {
  var count = reasoningHistory.length;
  reasoningHistory.length = 0;
  return { cleared: count };
}

function getReasoningSession(sessionId) {
  var session = reasoningSessions.get(String(sessionId || ""));
  return session ? cloneReasoningValue(session) : null;
}

function listReasoningSessions() {
  return Array.from(reasoningSessions.values()).map(cloneReasoningValue);
}

function normalizeWorkflowReasoningInput(input, options) {
  input = normalizeReasoningObject(input);
  options = normalizeReasoningObject(options);
  var workflow = normalizeReasoningObject(input.workflow);
  var workflowContext = normalizeReasoningObject(input.context || options.workflowContext);
  var normalized = Object.assign({}, input);
  delete normalized.workflow;
  if (!normalized.goal && workflow.goal) normalized.goal = workflow.goal;
  if (!normalized.summary && workflow.summary) normalized.summary = workflow.summary;
  if (!normalized.constraints && workflow.constraints) normalized.constraints = workflow.constraints;
  if (!normalized.evidence && workflow.evidence) normalized.evidence = workflow.evidence;
  if (!normalized.assumptions && workflow.assumptions) normalized.assumptions = workflow.assumptions;
  normalized.workflowContext = workflowContext;
  return normalized;
}

function executeReasoning(input, options) {
  input = normalizeWorkflowReasoningInput(input, options);
  options = options || {};
  var started = performance && typeof performance.now === "function" ? performance.now() : Date.now();
  var session = {
    id: String(options.sessionId || input.sessionId || createReasoningId("SESSION")),
    engineId: REASONING_ENGINE_ID,
    version: REASONING_ENGINE_VERSION,
    status: "Running",
    inputSummary: String(input.summary || input.question || input.goal || "Reasoning request"),
    startedAt: createReasoningTimestamp(),
    completedAt: null,
    decisionId: null,
    confidence: 0,
    executionTime: 0,
    traceId: null,
    reportId: null
  };
  reasoningSessions.set(session.id, session);
  reasoningMetrics.executions += 1;

  try {
    normalizeReasoningList(input.evidence).forEach(function (item) { createEvidenceNode(item); });
    normalizeReasoningList(input.assumptions).forEach(function (item) { createAssumptionNode(item); });
    var candidates = generateReasoningCandidates(input, options);
    candidates = candidates.map(function (candidate) {
      var scored = scoreReasoningCandidate(candidate, input, options);
      calculateReasoningConfidence(scored, null);
      return scored;
    }).sort(function (a, b) { return b.finalScore - a.finalScore || b.confidence - a.confidence; });
    candidates.forEach(function (candidate, index) { candidate.rank = index + 1; });
    var decision = candidates.length ? candidates[0] : null;
    var provisional = { sessionId: session.id, candidates: candidates, decision: decision };
    var validation = validateReasoningResult(provisional);
    if (decision) calculateReasoningConfidence(decision, validation);
    var trace = createReasoningTrace(session, candidates, decision, options);
    var result = {
      id: createReasoningId("RESULT"),
      sessionId: session.id,
      engineId: REASONING_ENGINE_ID,
      version: REASONING_ENGINE_VERSION,
      valid: Boolean(decision),
      candidates: cloneReasoningValue(candidates),
      decision: decision ? cloneReasoningValue(decision) : null,
      confidence: decision ? decision.confidence : 0,
      trace: trace,
      validation: validation,
      report: null,
      completedAt: createReasoningTimestamp()
    };
    result.report = createReasoningReport(result, options);
    var ended = performance && typeof performance.now === "function" ? performance.now() : Date.now();
    session.status = decision ? "Completed" : "Failed";
    session.completedAt = result.completedAt;
    session.decisionId = decision ? decision.id : null;
    session.confidence = result.confidence;
    session.executionTime = Math.max(0, ended - started);
    session.traceId = trace.id;
    session.reportId = result.report.id;
    reasoningSessions.set(session.id, session);
    result.executionTime = session.executionTime;
    addReasoningHistory({
      sessionId: session.id,
      timestamp: result.completedAt,
      inputSummary: session.inputSummary,
      decisionTraceId: trace.id,
      evidenceIds: trace.evidenceIds,
      assumptionIds: trace.assumptionIds,
      decisionId: session.decisionId,
      confidence: session.confidence,
      executionTime: session.executionTime,
      version: REASONING_ENGINE_VERSION
    });
    reasoningMetrics.completed += decision ? 1 : 0;
    reasoningMetrics.failed += decision ? 0 : 1;
    reasoningMetrics.totalExecutionTime += session.executionTime;
    reasoningMetrics.averageExecutionTime = reasoningMetrics.executions
      ? reasoningMetrics.totalExecutionTime / reasoningMetrics.executions : 0;
    reasoningMetrics.lastExecutionAt = result.completedAt;
    return result;
  } catch (error) {
    var endedError = performance && typeof performance.now === "function" ? performance.now() : Date.now();
    session.status = "Failed";
    session.completedAt = createReasoningTimestamp();
    session.executionTime = Math.max(0, endedError - started);
    session.error = String(error.message || error);
    reasoningSessions.set(session.id, session);
    reasoningMetrics.failed += 1;
    reasoningMetrics.errors += 1;
    reasoningMetrics.lastExecutionAt = session.completedAt;
    return {
      id: createReasoningId("RESULT"),
      sessionId: session.id,
      engineId: REASONING_ENGINE_ID,
      version: REASONING_ENGINE_VERSION,
      valid: false,
      error: { name: String(error.name || "Error"), message: String(error.message || error) },
      completedAt: session.completedAt,
      executionTime: session.executionTime
    };
  }
}

function getReasoningMetrics() {
  return cloneReasoningValue(reasoningMetrics);
}

function resetReasoningMetrics() {
  Object.keys(reasoningMetrics).forEach(function (key) {
    reasoningMetrics[key] = ["lastExecutionAt"].includes(key) ? null : 0;
  });
  return getReasoningMetrics();
}

function getReasoningEngineStatus() {
  var registered = typeof getEngine === "function" && Boolean(getEngine(REASONING_ENGINE_ID));
  var ready = registered;
  return {
    id: REASONING_ENGINE_ID,
    title: REASONING_ENGINE_TITLE,
    version: REASONING_ENGINE_VERSION,
    status: ready ? "Ready" : "Not Registered",
    ready: ready,
    health: ready ? 100 : 0,
    progress: ready ? 100 : 95,
    registered: registered,
    sessions: { total: reasoningSessions.size, limit: REASONING_HISTORY_LIMIT },
    history: { total: reasoningHistory.length, limit: REASONING_HISTORY_LIMIT },
    evidence: { nodes: reasoningEvidenceNodes.size, relationships: reasoningEvidenceRelationships.length },
    assumptions: { nodes: reasoningAssumptionNodes.size, relationships: reasoningAssumptionRelationships.length },
    integrations: {
      context: typeof getContext === "function",
      perception: typeof executePerception === "function",
      validation: typeof validateTargetSync === "function",
      relationshipDatabase: typeof addRelationship === "function" || typeof createRelationship === "function"
    },
    metrics: getReasoningMetrics(),
    updatedAt: createReasoningTimestamp()
  };
}

function getReasoningEngineHealth() {
  var status = getReasoningEngineStatus();
  return { id: status.id, health: status.health, ready: status.ready, status: status.status, errors: status.metrics.errors };
}

function createReasoningEngineDefinition() {
  return {
    id: REASONING_ENGINE_ID,
    title: REASONING_ENGINE_TITLE,
    version: REASONING_ENGINE_VERSION,
    status: "Ready",
    enabled: true,
    description: "Generates candidates, evaluates evidence and constraints, scores alternatives, selects decisions and produces explainable reasoning reports.",
    dependencies: [],
    inputs: ["Reasoning request", "Candidate sources", "Evidence", "Assumptions", "Constraints", "Scoring options"],
    outputs: ["Decision", "Candidate ranking", "Confidence", "Decision trace", "Reasoning report", "Reasoning history"],
    execute: function (input, context, options) {
      return executeReasoning(input, Object.assign({}, options || {}, { engineContext: context || null }));
    },
    validateInput: function (input) { return { valid: Boolean(input && typeof input === "object") }; },
    validateOutput: function (output) { return { valid: Boolean(output && output.engineId === REASONING_ENGINE_ID) }; },
    getStatus: getReasoningEngineStatus,
    metadata: {
      reasoningMethod: "Hybrid Reasoning",
      candidateGeneration: "Hybrid Multi-Source Candidate Generation",
      scoring: "Hybrid Weighted Scoring",
      confidence: "Hybrid Confidence",
      evidenceModel: "Hybrid Evidence Graph",
      assumptionModel: "Hybrid Assumption Graph",
      traceLevel: "standard",
      reportLevel: "standard",
      optionalIntegrations: ["ENGINE-010", "ENGINE-020", "ENGINE-030", "ENGINE-040"]
    }
  };
}

function registerReasoningEngine(options) {
  options = options || {};
  if (typeof registerEngine !== "function") {
    return { registered: false, replaced: false, id: REASONING_ENGINE_ID, errors: ["ENGINE-001 registerEngine is unavailable"] };
  }
  return registerEngine(createReasoningEngineDefinition(), { replace: options.replace !== false });
}

function validateReasoningEngine() {
  var checks = {};
  var failed = [];
  function remember(name, value) { checks[name] = Boolean(value); if (!checks[name]) failed.push(name); }
  var savedHistory = cloneReasoningValue(reasoningHistory);
  var savedMetrics = cloneReasoningValue(reasoningMetrics);
  var evidenceId = "ENGINE-050-TEST-EVIDENCE";
  var assumptionId = "ENGINE-050-TEST-ASSUMPTION";
  try {
    remember("engineCore", typeof registerEngine === "function");
    remember("sessionRegistry", reasoningSessions instanceof Map);
    remember("evidenceRegistry", reasoningEvidenceNodes instanceof Map);
    remember("assumptionRegistry", reasoningAssumptionNodes instanceof Map);
    var evidence = createEvidenceNode({ id: evidenceId, title: "Test Evidence", reliability: 90, relevance: 90, confidence: 90 });
    remember("evidenceNode", evidence.id === evidenceId);
    var evRel = addEvidenceRelationship(evidenceId, "supports", "ENGINE-050-TEST-CANDIDATE");
    remember("evidenceRelationship", evRel.type === "supports");
    var assumption = createAssumptionNode({ id: assumptionId, statement: "Test assumption", confidence: 70 });
    remember("assumptionNode", assumption.id === assumptionId);
    var asRel = addAssumptionRelationship(assumptionId, "supportedBy", evidenceId);
    remember("assumptionRelationship", asRel.type === "supportedBy");
    var candidates = generateReasoningCandidates({ candidates: [{ id: "A", title: "A" }, { id: "B", title: "B" }] });
    remember("candidateGeneration", candidates.length === 2);
    var scored = scoreReasoningCandidate(normalizeCandidate({ id: "A", title: "A", evidenceIds: [evidenceId] }, 0, "test"), { constraints: [{ id: "C1", passed: true }] }, {});
    remember("scoring", scored.finalScore >= 0 && scored.finalScore <= 100);
    remember("constraintEvaluation", scored.constraintResults.length === 1 && scored.constraintResults[0].passed === true);
    remember("confidence", calculateReasoningConfidence(scored, { valid: true }) > 0);
    var result = executeReasoning({ summary: "Validation", candidates: [
      { id: "CAND-A", title: "Candidate A", evidenceIds: [evidenceId], assumptionIds: [assumptionId], scores: { context: 90 } },
      { id: "CAND-B", title: "Candidate B", scores: { context: 20 } }
    ], constraints: [{ id: "REQUIRED", passed: true, required: true }] }, { traceLevel: "diagnostic", reportLevel: "detailed" });
    remember("execution", result.valid === true && result.decision != null);
    remember("ranking", result.candidates[0].rank === 1);
    remember("trace", result.trace && result.trace.level === "diagnostic");
    remember("report", result.report && result.report.level === "detailed");
    remember("history", reasoningHistory.length > 0);
    remember("serialization", typeof JSON.stringify(result) === "string");
    var registration = registerReasoningEngine({ replace: true });
    remember("registration", registration.registered === true);
    remember("platformLookup", typeof getEngine === "function" && Boolean(getEngine(REASONING_ENGINE_ID)));
  } catch (error) {
    failed.push("exception:" + String(error.message || error));
  } finally {
    reasoningEvidenceNodes.delete(evidenceId);
    reasoningAssumptionNodes.delete(assumptionId);
    reasoningEvidenceRelationships = reasoningEvidenceRelationships.filter(function (item) { return item.sourceId !== evidenceId && item.targetId !== evidenceId; });
    reasoningAssumptionRelationships = reasoningAssumptionRelationships.filter(function (item) { return item.sourceId !== assumptionId && item.targetId !== assumptionId; });
    reasoningHistory.length = 0;
    savedHistory.forEach(function (item) { reasoningHistory.push(item); });
    Object.keys(savedMetrics).forEach(function (key) { reasoningMetrics[key] = savedMetrics[key]; });
  }
  var total = 20;
  var passed = Object.values(checks).filter(Boolean).length;
  return {
    id: REASONING_ENGINE_ID,
    title: REASONING_ENGINE_TITLE,
    version: REASONING_ENGINE_VERSION,
    valid: failed.length === 0 && passed === total,
    passed: passed,
    total: total,
    failed: Array.from(new Set(failed)),
    checks: checks,
    status: getReasoningEngineStatus()
  };
}

var reasoningEngineRegistrationResult = registerReasoningEngine({ replace: true });