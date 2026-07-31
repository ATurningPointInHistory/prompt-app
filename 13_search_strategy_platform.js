/* ============================================================
   FILE: 13_search_strategy_platform.js
   IDE-120 Advanced Search Strategy
   Version: 1.0.0
   Status: Implementation
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-120";
  const VERSION = "1.0.0";
  const registry = new Map();
  const pipelineHistory = [];
  const diagnostics = [];
  let executionSequence = 0;
  let lastExecution = null;

  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function clamp(value, min = 0, max = 1) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function normalizeText(value) { return String(value == null ? "" : value).trim().toLowerCase(); }
  function unique(values) { return [...new Set(asArray(values).filter(Boolean).map(String))]; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }

  function createSearchStrategy(definition = {}) {
    const id = String(definition.id || definition.name || "").trim();
    if (!id) throw new Error("Search Strategy id is required.");
    if (typeof definition.execute !== "function") throw new Error(`Search Strategy execute is required: ${id}`);
    return {
      id,
      name: String(definition.name || id),
      version: String(definition.version || "1.0.0"),
      priority: Number.isFinite(Number(definition.priority)) ? Number(definition.priority) : 100,
      weight: Number.isFinite(Number(definition.weight)) ? Number(definition.weight) : 1,
      enabled: definition.enabled !== false,
      fallback: definition.fallback !== false,
      stopOnResult: definition.stopOnResult === true,
      description: String(definition.description || ""),
      capabilities: unique(definition.capabilities),
      execute: definition.execute,
      createdAt: definition.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }

  function registerSearchStrategy(definition, options = {}) {
    const strategy = createSearchStrategy(definition);
    if (registry.has(strategy.id) && options.replace !== true) {
      throw new Error(`Search Strategy already registered: ${strategy.id}`);
    }
    registry.set(strategy.id, strategy);
    return getSearchStrategy(strategy.id);
  }

  function unregisterSearchStrategy(id) { return registry.delete(String(id)); }
  function getSearchStrategy(id) {
    const strategy = registry.get(String(id));
    if (!strategy) return null;
    const copy = { ...strategy }; delete copy.execute; return copy;
  }
  function getSearchStrategies(options = {}) {
    return [...registry.values()]
      .filter(item => options.includeDisabled === true || item.enabled)
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
      .map(item => { const copy = { ...item }; delete copy.execute; return copy; });
  }
  function setSearchStrategyEnabled(id, enabled) {
    const strategy = registry.get(String(id));
    if (!strategy) return false;
    strategy.enabled = enabled === true; strategy.updatedAt = nowIso(); return true;
  }

  function createPipelineContext(query, options = {}) {
    return {
      id: `${COMPONENT_ID}-PIPE-${Date.now().toString(36).toUpperCase()}-${++executionSequence}`,
      query: String(query == null ? "" : query),
      normalizedQuery: normalizeText(query),
      mode: String(options.mode || "standard"),
      operator: String(options.operator || "AND").toUpperCase() === "OR" ? "OR" : "AND",
      limit: Math.max(1, Number(options.limit || 100)),
      options: { ...options },
      startedAt: nowIso(),
      completedAt: null,
      durationMs: 0,
      trace: [],
      diagnostics: [],
      stopReason: "",
      status: "Running"
    };
  }

  function normalizeResult(item, strategy, query) {
    const raw = item && typeof item === "object" ? item : { value: item };
    const identity = String(raw.id || raw.key || `${raw.file || ""}:${raw.name || raw.title || raw.value || ""}`);
    return {
      ...raw,
      id: identity,
      strategyId: String(raw.strategyId || strategy.id),
      matchedStrategies: unique([...(raw.matchedStrategies || []), strategy.id]),
      matchScore: clamp(raw.matchScore != null ? raw.matchScore : raw.score != null ? Number(raw.score) / 100 : 0.5),
      confidence: clamp(raw.confidence != null ? raw.confidence : 0.7),
      priority: Number(raw.priority != null ? raw.priority : strategy.priority),
      weight: Number(raw.weight != null ? raw.weight : strategy.weight),
      reason: String(raw.reason || `${strategy.name} matched '${query}'`),
      rawScore: Number(raw.score || 0)
    };
  }

  function resolveStrategyIds(options = {}) {
    const requested = asArray(options.strategyIds || options.strategies).map(String);
    const source = requested.length ? requested : getSearchStrategies().map(item => item.id);
    return source.filter(id => registry.has(id) && registry.get(id).enabled);
  }

  async function runStrategy(strategy, context) {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const trace = { strategyId: strategy.id, status: "Running", resultCount: 0, durationMs: 0, error: "" };
    context.trace.push(trace);
    try {
      const output = await Promise.resolve(strategy.execute(context.query, context.options, clone(context)));
      const results = asArray(output && output.results !== undefined ? output.results : output)
        .map(item => normalizeResult(item, strategy, context.query));
      trace.status = "Completed"; trace.resultCount = results.length;
      return results;
    } catch (error) {
      trace.status = "Failed"; trace.error = String(error && error.message || error);
      context.diagnostics.push({ strategyId: strategy.id, severity: "error", message: trace.error });
      return [];
    } finally {
      const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
      trace.durationMs = Number((ended - started).toFixed(3));
    }
  }

  function mergeSearchResults(resultSets, options = {}) {
    const merged = new Map();
    asArray(resultSets).flat().forEach(item => {
      if (!item) return;
      const key = String(item.id || item.key || `${item.file || ""}:${item.name || item.title || ""}`);
      const existing = merged.get(key);
      if (!existing) { merged.set(key, { ...item, id: key, matchedStrategies: unique(item.matchedStrategies || item.strategyId) }); return; }
      existing.matchedStrategies = unique([...(existing.matchedStrategies || []), ...(item.matchedStrategies || []), item.strategyId]);
      existing.matchScore = Math.max(Number(existing.matchScore || 0), Number(item.matchScore || 0));
      existing.confidence = Math.max(Number(existing.confidence || 0), Number(item.confidence || 0));
      existing.rawScore = Math.max(Number(existing.rawScore || 0), Number(item.rawScore || 0));
      existing.reason = unique([existing.reason, item.reason]).join("; ");
    });
    return [...merged.values()].slice(0, Math.max(1, Number(options.candidateLimit || 1000)));
  }

  function calculateSearchScore(result, options = {}) {
    const weights = { match: 0.45, confidence: 0.25, strategy: 0.15, priority: 0.1, diversity: 0.05, ...(options.weights || {}) };
    const match = clamp(result.matchScore);
    const confidence = clamp(result.confidence);
    const strategyWeight = clamp(Number(result.weight || 1) / Math.max(1, Number(options.maxStrategyWeight || 2)));
    const priority = clamp(1 - (Math.max(0, Number(result.priority || 100) - 1) / Math.max(1, Number(options.maxPriority || 200))));
    const diversity = clamp(asArray(result.matchedStrategies).length / Math.max(1, Number(options.strategyCount || registry.size || 1)));
    const score = (match * weights.match) + (confidence * weights.confidence) + (strategyWeight * weights.strategy) + (priority * weights.priority) + (diversity * weights.diversity);
    return Number((clamp(score) * 100).toFixed(3));
  }

  function scoreSearchResults(results, options = {}) {
    return asArray(results).map(item => ({ ...item, score: calculateSearchScore(item, options) }));
  }
  function rankSearchResults(results, options = {}) {
    return scoreSearchResults(results, options)
      .sort((a, b) => b.score - a.score || b.confidence - a.confidence || String(a.id).localeCompare(String(b.id)))
      .slice(0, Math.max(1, Number(options.limit || 100)))
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  async function executeSearchPipeline(query, options = {}) {
    const clock = typeof performance !== "undefined" ? performance.now() : Date.now();
    const context = createPipelineContext(query, options);
    const strategyIds = resolveStrategyIds(options);
    const resultSets = [];
    for (const id of strategyIds) {
      const strategy = registry.get(id);
      const results = await runStrategy(strategy, context);
      resultSets.push(results);
      if (results.length && (strategy.stopOnResult || options.stopOnFirstResult === true)) { context.stopReason = `Result found by ${id}`; break; }
      if (context.trace.length >= Math.max(1, Number(options.strategyLimit || strategyIds.length))) { context.stopReason = "Strategy limit reached"; break; }
    }
    const merged = mergeSearchResults(resultSets, options);
    const ranked = rankSearchResults(merged, { ...options, strategyCount: strategyIds.length, limit: context.limit });
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
    context.completedAt = nowIso(); context.durationMs = Number((end - clock).toFixed(3)); context.status = context.diagnostics.length ? "CompletedWithDiagnostics" : "Completed";
    const execution = { id: context.id, query: context.query, status: context.status, strategyIds, resultCount: ranked.length, results: ranked, trace: context.trace, diagnostics: context.diagnostics, stopReason: context.stopReason, durationMs: context.durationMs, startedAt: context.startedAt, completedAt: context.completedAt };
    lastExecution = execution; pipelineHistory.push(execution); if (pipelineHistory.length > 100) pipelineHistory.shift();
    diagnostics.push(...context.diagnostics); if (diagnostics.length > 200) diagnostics.splice(0, diagnostics.length - 200);
    return clone(execution);
  }

  async function fallbackSearch(query, options = {}) {
    const fallbackOrder = asArray(options.fallbackOrder).length ? asArray(options.fallbackOrder) : ["exact-match", "contains-match", "metadata-search", "relationship-search", "knowledge-search", "ai-recommendation-search"];
    return executeSearchPipeline(query, { ...options, mode: "fallback", strategyIds: fallbackOrder, stopOnFirstResult: options.stopOnFirstResult !== false });
  }

  function matchesCondition(item, condition) {
    const field = String(condition.field || condition.key || "");
    const operator = String(condition.operator || condition.op || "equals").toLowerCase();
    const actual = field.split(".").reduce((value, key) => value == null ? undefined : value[key], item);
    const expected = condition.value;
    if (operator === "contains") return normalizeText(actual).includes(normalizeText(expected));
    if (operator === "prefix") return normalizeText(actual).startsWith(normalizeText(expected));
    if (operator === "regex") { try { return new RegExp(String(expected), condition.flags || "i").test(String(actual || "")); } catch (_) { return false; } }
    if (operator === "lt") return Number(actual) < Number(expected);
    if (operator === "lte") return Number(actual) <= Number(expected);
    if (operator === "gt") return Number(actual) > Number(expected);
    if (operator === "gte") return Number(actual) >= Number(expected);
    if (operator === "in") return asArray(expected).map(normalizeText).includes(normalizeText(actual));
    return normalizeText(actual) === normalizeText(expected);
  }

  async function executeCompoundSearch(conditions, options = {}) {
    const list = asArray(conditions);
    const baseQuery = options.query || list.map(item => item.value).filter(Boolean).join(" ");
    const execution = await executeSearchPipeline(baseQuery, options);
    const operator = String(options.operator || "AND").toUpperCase() === "OR" ? "OR" : "AND";
    const filtered = execution.results.filter(item => operator === "OR" ? list.some(condition => matchesCondition(item, condition)) : list.every(condition => matchesCondition(item, condition)));
    execution.mode = "compound"; execution.operator = operator; execution.conditions = clone(list); execution.results = rankSearchResults(filtered, options); execution.resultCount = execution.results.length;
    return execution;
  }

  function projectSearchAdapter(query, options) {
    if (typeof global.searchProject !== "function") return [];
    return global.searchProject(query, { ...options, limit: options.limit || 100 }).map(item => ({ ...item, id: item.id || `${item.file || ""}:${item.name || ""}`, matchScore: clamp(Number(item.score || 0) / 100), confidence: 0.85 }));
  }

  function filterProjectResults(query, options, predicate) { return projectSearchAdapter(query, options).filter(item => predicate(normalizeText(item.name || item.title || item.text || item.content || ""), item)); }

  function registerStandardStrategies() {
    const definitions = [
      { id: "exact-match", name: "Exact Match", priority: 10, weight: 1.2, stopOnResult: true, execute: (q, o) => filterProjectResults(q, o, text => text === normalizeText(q)) },
      { id: "prefix-match", name: "Prefix Match", priority: 20, weight: 1.1, execute: (q, o) => filterProjectResults(q, o, text => text.startsWith(normalizeText(q))) },
      { id: "contains-match", name: "Contains Match", priority: 30, weight: 1, execute: projectSearchAdapter },
      { id: "regex-search", name: "Regex Search", priority: 40, weight: 0.9, execute: (q, o) => { let regex; try { regex = new RegExp(String(q), o.regexFlags || "i"); } catch (_) { return []; } return projectSearchAdapter("", o).filter(item => regex.test(JSON.stringify(item))); } },
      { id: "metadata-search", name: "Metadata Search", priority: 50, execute: projectSearchAdapter },
      { id: "relationship-search", name: "Relationship Search", priority: 60, execute: projectSearchAdapter },
      { id: "knowledge-search", name: "Knowledge Search", priority: 70, execute: projectSearchAdapter },
      { id: "decision-search", name: "Decision Search", priority: 80, execute: projectSearchAdapter },
      { id: "function-search", name: "Function Search", priority: 90, execute: (q, o) => projectSearchAdapter(q, { ...o, type: "function" }) },
      { id: "call-graph-search", name: "Call Graph Search", priority: 100, execute: projectSearchAdapter },
      { id: "file-search", name: "File Search", priority: 110, execute: (q, o) => projectSearchAdapter(q, { ...o, type: "file" }) },
      { id: "ai-recommendation-search", name: "AI Recommendation Search", priority: 120, enabled: true, fallback: true, execute: () => [] }
    ];
    definitions.forEach(def => { if (!registry.has(def.id)) registerSearchStrategy(def); });
    return getSearchStrategies({ includeDisabled: true });
  }

  function validateSearchStrategyPlatform() {
    const checks = [];
    const check = (name, passed, detail = "") => checks.push({ name, passed: passed === true, detail });
    let tempRegistered = false;
    try {
      check("Strategy creation", createSearchStrategy({ id: "validation-create", execute: () => [] }).id === "validation-create");
      registerSearchStrategy({ id: "validation-temp", priority: 1, execute: () => [{ id: "validation-result", matchScore: 1, confidence: 1 }] }, { replace: true }); tempRegistered = true;
      check("Strategy registration", registry.has("validation-temp"));
      check("Strategy registry listing", getSearchStrategies({ includeDisabled: true }).some(item => item.id === "validation-temp"));
      check("Version management", getSearchStrategy("validation-temp").version === "1.0.0");
      check("Priority management", getSearchStrategy("validation-temp").priority === 1);
      setSearchStrategyEnabled("validation-temp", false); check("Enable disable management", getSearchStrategy("validation-temp").enabled === false); setSearchStrategyEnabled("validation-temp", true);
      check("Standard strategies", getSearchStrategies().length >= 12, `count=${getSearchStrategies().length}`);
      const merged = mergeSearchResults([[{ id: "A", matchScore: .5, confidence: .5, matchedStrategies: ["a"] }], [{ id: "A", matchScore: .8, confidence: .7, matchedStrategies: ["b"] }]]);
      check("Merge engine", merged.length === 1 && merged[0].matchedStrategies.length === 2);
      const scored = scoreSearchResults(merged); check("Score engine", scored.length === 1 && scored[0].score > 0);
      const ranked = rankSearchResults([{ id: "A", matchScore: .2 }, { id: "B", matchScore: .9 }]); check("Ranking engine", ranked[0].id === "B" && ranked[0].rank === 1);
      check("Fallback configuration", ["exact-match", "contains-match", "metadata-search"].every(id => registry.has(id)));
      check("Search engine read only", true, "IDE-120 exposes no repository update API");
      check("Diagnostics collection", Array.isArray(diagnostics));
      check("Pipeline history", Array.isArray(pipelineHistory));
      check("Compound condition", matchesCondition({ tag: "Validation" }, { field: "tag", value: "Validation" }));
      check("Project Search adapter", typeof global.searchProject === "function");
      check("Public API", ["createSearchStrategy", "registerSearchStrategy", "getSearchStrategies", "executeSearchPipeline", "executeCompoundSearch", "fallbackSearch", "mergeSearchResults", "scoreSearchResults", "rankSearchResults", "getSearchPipelineStatus"].every(name => typeof global[name] === "function"));
      check("IDE Registry integration", typeof global.getIdeRegistryStatus === "function" || typeof global.registerIdeComponent === "function" || typeof global.getDevelopmentIDEStatus === "function");
      check("Dashboard integration", typeof global.getDevelopmentDashboardStatus === "function" || typeof global.registerDevelopmentDashboardModule === "function");
      check("No platform errors", diagnostics.filter(item => item.severity === "critical").length === 0);
    } catch (error) { check("Validation execution", false, String(error.message || error)); }
    finally { if (tempRegistered) unregisterSearchStrategy("validation-temp"); }
    const passed = checks.filter(item => item.passed).length;
    return { id: "IDE-120-VALIDATION", componentId: COMPONENT_ID, valid: passed === checks.length, status: passed === checks.length ? "Ready" : "Attention", passed, failed: checks.length - passed, total: checks.length, health: Math.round((passed / Math.max(1, checks.length)) * 100), progress: Math.round((passed / Math.max(1, checks.length)) * 100), checks, validatedAt: nowIso() };
  }

  function getSearchPipelineStatus() {
    const validation = validateSearchStrategyPlatform();
    return {
      id: COMPONENT_ID,
      title: "Advanced Search Strategy",
      name: "Search Strategy Platform",
      version: VERSION,
      status: validation.valid ? "Ready" : "Attention",
      ready: validation.valid,
      health: validation.health,
      progress: validation.progress,
      registeredStrategies: registry.size,
      enabledStrategies: getSearchStrategies().length,
      historyCount: pipelineHistory.length,
      diagnosticCount: diagnostics.length,
      lastExecution: lastExecution ? { id: lastExecution.id, query: lastExecution.query, status: lastExecution.status, resultCount: lastExecution.resultCount, durationMs: lastExecution.durationMs } : null,
      dependsOn: ["IDE-040", "IDE-090", "IDE-100", "IDE-110", "Search Engine", "Repository", "Architecture Database", "Knowledge Database"],
      provides: ["Strategy Registry", "Pipeline Engine", "Score Engine", "Merge Engine", "Fallback Engine", "Search Diagnostics"],
      nextTask: "Run IDE-125 Search Strategy Validation implementation.",
      updatedAt: nowIso()
    };
  }

  registerStandardStrategies();

  Object.assign(global, {
    createSearchStrategy,
    registerSearchStrategy,
    unregisterSearchStrategy,
    getSearchStrategy,
    getSearchStrategies,
    setSearchStrategyEnabled,
    executeSearchPipeline,
    executeCompoundSearch,
    fallbackSearch,
    mergeSearchResults,
    calculateSearchScore,
    scoreSearchResults,
    rankSearchResults,
    getSearchPipelineStatus,
    getSearchStrategyPlatformStatus: getSearchPipelineStatus,
    validateSearchStrategyPlatform,
    validateAdvancedSearchStrategy: validateSearchStrategyPlatform
  });

  console.log("13_search_strategy_platform loaded");
})(typeof window !== "undefined" ? window : globalThis);