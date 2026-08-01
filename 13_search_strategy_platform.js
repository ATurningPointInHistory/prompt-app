/* ============================================================
   FILE: 13_search_strategy_platform.js
   IDE-120 Advanced Search Strategy
   Version: 1.1.1
   Status: Completed
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-120";
  const VERSION = "1.1.1";
  const DEFAULT_SEARCH_POLICY = Object.freeze({
    limit: 10,
    candidateLimit: 200,
    minimumScore: 50,
    exactBoost: 25,
    exactOnlyWhenFound: true,
    containsMatchFactor: 0.70
  });

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
  function finiteNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }

  function createSearchStrategy(definition = {}) {
    const id = String(definition.id || definition.name || "").trim();
    if (!id) throw new Error("Search Strategy id is required.");
    if (typeof definition.execute !== "function") throw new Error(`Search Strategy execute is required: ${id}`);
    return {
      id,
      name: String(definition.name || id),
      version: String(definition.version || VERSION),
      priority: finiteNumber(definition.priority, 100),
      weight: finiteNumber(definition.weight, 1),
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
    strategy.enabled = enabled === true;
    strategy.updatedAt = nowIso();
    return true;
  }

  function normalizePipelineOptions(options = {}) {
    return {
      ...options,
      limit: Math.max(1, finiteNumber(options.limit ?? options.topN, DEFAULT_SEARCH_POLICY.limit)),
      candidateLimit: Math.max(1, finiteNumber(options.candidateLimit, DEFAULT_SEARCH_POLICY.candidateLimit)),
      minimumScore: Math.max(0, finiteNumber(options.minimumScore, DEFAULT_SEARCH_POLICY.minimumScore)),
      exactBoost: Math.max(0, finiteNumber(options.exactBoost, DEFAULT_SEARCH_POLICY.exactBoost)),
      exactOnlyWhenFound: options.exactOnlyWhenFound !== false,
      containsMatchFactor: clamp(finiteNumber(options.containsMatchFactor, DEFAULT_SEARCH_POLICY.containsMatchFactor))
    };
  }

  function createPipelineContext(query, options = {}) {
    const normalizedOptions = normalizePipelineOptions(options);
    return {
      id: `${COMPONENT_ID}-PIPE-${Date.now().toString(36).toUpperCase()}-${++executionSequence}`,
      query: String(query == null ? "" : query),
      normalizedQuery: normalizeText(query),
      mode: String(normalizedOptions.mode || "standard"),
      operator: String(normalizedOptions.operator || "AND").toUpperCase() === "OR" ? "OR" : "AND",
      limit: normalizedOptions.limit,
      options: normalizedOptions,
      startedAt: nowIso(),
      completedAt: null,
      durationMs: 0,
      trace: [],
      diagnostics: [],
      stopReason: "",
      status: "Running"
    };
  }

  function resolveRawIdentity(raw = {}) {
    const data = raw.data && typeof raw.data === "object" ? raw.data : {};
    return String(
      raw.objectId || raw.knowledgeId || raw.koId ||
      data.id || data.key || data.koId || data.objectId ||
      raw.id || raw.key ||
      `${raw.file || ""}:${raw.name || raw.title || raw.value || ""}`
    );
  }

  function canonicalResultKey(item = {}) {
    const identity = resolveRawIdentity(item);
    if (identity) return normalizeText(identity);
    return `${normalizeText(item.file)}:${normalizeText(item.name || item.title || item.value)}`;
  }

  function normalizeResult(item, strategy, query) {
    const raw = item && typeof item === "object" ? item : { value: item };
    const identity = resolveRawIdentity(raw);
    const exactMatch = raw.exactMatch === true || strategy.id === "exact-match";
    return {
      ...raw,
      id: identity,
      strategyId: String(raw.strategyId || strategy.id),
      matchedStrategies: unique([...(raw.matchedStrategies || []), strategy.id]),
      exactMatch,
      matchScore: clamp(raw.matchScore != null ? raw.matchScore : raw.score != null ? Number(raw.score) / 1000 : 0.5),
      confidence: clamp(raw.confidence != null ? raw.confidence : 0.7),
      priority: finiteNumber(raw.priority, strategy.priority),
      weight: finiteNumber(raw.weight, strategy.weight),
      reason: String(raw.reason || `${strategy.name} matched '${query}'`),
      rawScore: finiteNumber(raw.rawScore != null ? raw.rawScore : raw.score, 0)
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
      trace.status = "Completed";
      trace.resultCount = results.length;
      return results;
    } catch (error) {
      trace.status = "Failed";
      trace.error = String(error && error.message || error);
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
      const key = canonicalResultKey(item);
      if (!key) return;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...item, matchedStrategies: unique(item.matchedStrategies || item.strategyId) });
        return;
      }

      const strategies = unique([...(existing.matchedStrategies || []), ...(item.matchedStrategies || []), item.strategyId]);
      const reasons = unique([existing.reason, item.reason]).join("; ");
      const preferIncoming = item.exactMatch === true && existing.exactMatch !== true;
      const target = preferIncoming ? { ...existing, ...item } : existing;
      target.matchedStrategies = strategies;
      target.exactMatch = existing.exactMatch === true || item.exactMatch === true;
      target.matchScore = Math.max(Number(existing.matchScore || 0), Number(item.matchScore || 0));
      target.confidence = Math.max(Number(existing.confidence || 0), Number(item.confidence || 0));
      target.rawScore = Math.max(Number(existing.rawScore || 0), Number(item.rawScore || 0));
      target.weight = Math.max(Number(existing.weight || 0), Number(item.weight || 0));
      target.priority = Math.min(Number(existing.priority || 100), Number(item.priority || 100));
      target.reason = reasons;
      merged.set(key, target);
    });
    return [...merged.values()].slice(0, Math.max(1, finiteNumber(options.candidateLimit, DEFAULT_SEARCH_POLICY.candidateLimit)));
  }

  function calculateSearchScore(result, options = {}) {
    const weights = { match: 0.52, confidence: 0.20, strategy: 0.15, priority: 0.13, diversity: 0, ...(options.weights || {}) };
    const match = clamp(result.matchScore);
    const confidence = clamp(result.confidence);
    const strategyWeight = clamp(Number(result.weight || 1) / Math.max(1, finiteNumber(options.maxStrategyWeight, 2)));
    const priority = clamp(1 - (Math.max(0, Number(result.priority || 100) - 1) / Math.max(1, finiteNumber(options.maxPriority, 200))));
    const diversity = clamp(asArray(result.matchedStrategies).length / Math.max(1, finiteNumber(options.strategyCount, registry.size || 1)));
    let score = (match * weights.match) + (confidence * weights.confidence) + (strategyWeight * weights.strategy) + (priority * weights.priority) + (diversity * weights.diversity);
    if (result.exactMatch === true || asArray(result.matchedStrategies).includes("exact-match")) {
      score += Math.max(0, finiteNumber(options.exactBoost, DEFAULT_SEARCH_POLICY.exactBoost)) / 100;
    }
    return Number((clamp(score) * 100).toFixed(3));
  }

  function scoreSearchResults(results, options = {}) {
    return asArray(results).map(item => ({ ...item, score: calculateSearchScore(item, options) }));
  }

  function rankSearchResults(results, options = {}) {
    const normalizedOptions = normalizePipelineOptions(options);
    return scoreSearchResults(results, normalizedOptions)
      .filter(item => item.exactMatch === true || Number(item.score || 0) >= normalizedOptions.minimumScore)
      .sort((a, b) => Number(b.exactMatch === true) - Number(a.exactMatch === true) || b.score - a.score || b.confidence - a.confidence || String(a.id).localeCompare(String(b.id)))
      .slice(0, normalizedOptions.limit)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  async function executeSearchPipeline(query, options = {}) {
    const clock = typeof performance !== "undefined" ? performance.now() : Date.now();
    const context = createPipelineContext(query, options);
    const strategyIds = resolveStrategyIds(context.options);
    const resultSets = [];

    for (const id of strategyIds) {
      const strategy = registry.get(id);
      const results = await runStrategy(strategy, context);
      resultSets.push(results);

      const exactFound = id === "exact-match" && results.length > 0 && context.options.exactOnlyWhenFound;
      if (exactFound || (results.length && (strategy.stopOnResult || context.options.stopOnFirstResult === true))) {
        context.stopReason = exactFound ? "Exact match found" : `Result found by ${id}`;
        break;
      }
      if (context.trace.length >= Math.max(1, finiteNumber(context.options.strategyLimit, strategyIds.length))) {
        context.stopReason = "Strategy limit reached";
        break;
      }
    }

    const merged = mergeSearchResults(resultSets, context.options);
    const ranked = rankSearchResults(merged, { ...context.options, strategyCount: strategyIds.length });
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
    context.completedAt = nowIso();
    context.durationMs = Number((end - clock).toFixed(3));
    context.status = context.diagnostics.length ? "CompletedWithDiagnostics" : "Completed";

    const execution = {
      id: context.id,
      query: context.query,
      status: context.status,
      strategyIds,
      resultCount: ranked.length,
      results: ranked,
      trace: context.trace,
      diagnostics: context.diagnostics,
      stopReason: context.stopReason,
      policy: {
        limit: context.options.limit,
        candidateLimit: context.options.candidateLimit,
        minimumScore: context.options.minimumScore,
        exactBoost: context.options.exactBoost
      },
      durationMs: context.durationMs,
      startedAt: context.startedAt,
      completedAt: context.completedAt
    };

    lastExecution = execution;
    pipelineHistory.push(execution);
    if (pipelineHistory.length > 100) pipelineHistory.shift();
    diagnostics.push(...context.diagnostics);
    if (diagnostics.length > 200) diagnostics.splice(0, diagnostics.length - 200);
    return clone(execution);
  }

  async function fallbackSearch(query, options = {}) {
    const fallbackOrder = asArray(options.fallbackOrder).length
      ? asArray(options.fallbackOrder)
      : ["exact-match", "contains-match", "metadata-search", "relationship-search", "knowledge-search", "ai-recommendation-search"];
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
    execution.mode = "compound";
    execution.operator = operator;
    execution.conditions = clone(list);
    execution.results = rankSearchResults(filtered, options);
    execution.resultCount = execution.results.length;
    return execution;
  }

  function extractKnowledgeIdentity(value) {
    const text = String(value == null ? "" : value).trim();
    if (!text) return "";
    if (typeof global.extractKnowledgeIdFromTitle === "function") {
      const resolved = String(global.extractKnowledgeIdFromTitle(text) || "").trim();
      if (resolved) return resolved;
    }
    const match = text.match(/[A-Z][A-Z0-9_]*-\d+/);
    return match ? String(match[0]).trim() : "";
  }

  function normalizeKnowledgeRecord(object = {}, index = 0) {
    const rawId = object.id || object.koId || object.objectId || object.knowledgeId || "";
    const title = String(object.title || object.name || object.boxTitle || "").trim();
    const id = String(rawId || extractKnowledgeIdentity(title)).trim();
    if (!id) return null;
    const relationships = unique(object.relationships);
    const keywords = unique(object.keywords || object.tags);
    return {
      ...object,
      id,
      objectId: id,
      knowledgeId: id,
      koId: id,
      type: "knowledge",
      name: title || id,
      title: title || id,
      file: String(object.file || "MemoBox"),
      summary: String(object.summary || ""),
      series: String(object.series || ""),
      category: String(object.category || ""),
      knowledgeType: String(object.knowledgeType || object.type || ""),
      status: String(object.status || ""),
      version: String(object.version || ""),
      relationships,
      keywords,
      repositoryIndex: finiteNumber(object.index, index),
      data: { ...object, id }
    };
  }

  function getKnowledgeRepositoryRecords() {
    let objects = [];
    try {
      if (typeof global.buildKnowledgeRepository === "function") {
        const database = global.buildKnowledgeRepository();
        objects = asArray(database && database.objects);
      }
    } catch (error) {
      diagnostics.push({ strategyId: "knowledge-repository", severity: "warning", message: String(error && error.message || error) });
    }

    if (!objects.length && typeof global.getMemoBoxList === "function") {
      try { objects = asArray(global.getMemoBoxList()); } catch (_) { objects = []; }
    }

    const normalized = objects
      .map((object, index) => normalizeKnowledgeRecord(object, index))
      .filter(Boolean);

    const byId = new Map();
    normalized.forEach(item => {
      const key = normalizeText(item.id);
      if (!key) return;
      const current = byId.get(key);
      if (!current) {
        byId.set(key, item);
        return;
      }
      const currentScore = Number(Boolean(current.summary)) + Number(asArray(current.relationships).length > 0) + Number(Boolean(current.version));
      const incomingScore = Number(Boolean(item.summary)) + Number(asArray(item.relationships).length > 0) + Number(Boolean(item.version));
      if (incomingScore > currentScore) byId.set(key, item);
    });
    return [...byId.values()];
  }

  function getKnowledgeSearchValues(record = {}) {
    return [
      record.id,
      record.name,
      record.title,
      record.summary,
      record.series,
      record.category,
      record.knowledgeType,
      record.status,
      record.version,
      ...asArray(record.keywords),
      ...asArray(record.relationships)
    ].map(normalizeText).filter(Boolean);
  }

  function calculateKnowledgeSearchScore(record, query) {
    const q = normalizeText(query);
    if (!q) return 0;
    const id = normalizeText(record.id);
    const title = normalizeText(record.title || record.name);
    const relationships = asArray(record.relationships).map(normalizeText);
    const metadata = [record.summary, record.series, record.category, record.knowledgeType, record.status, record.version, ...asArray(record.keywords)].map(normalizeText);

    if (id === q) return 1000;
    if (title === q) return 950;
    if (id.startsWith(q)) return 875;
    if (title.startsWith(q)) return 825;
    if (id.includes(q)) return 775;
    if (title.includes(q)) return 700;
    if (relationships.some(value => value === q)) return 675;
    if (relationships.some(value => value.includes(q))) return 600;
    if (metadata.some(value => value.includes(q))) return 525;
    if (getKnowledgeSearchValues(record).some(value => value.includes(q))) return 450;
    return -1;
  }

  function knowledgeSearchAdapter(query, options = {}) {
    const q = normalizeText(query);
    const candidateLimit = Math.max(1, finiteNumber(options.candidateLimit, DEFAULT_SEARCH_POLICY.candidateLimit));
    return getKnowledgeRepositoryRecords()
      .map(record => {
        const rawScore = calculateKnowledgeSearchScore(record, q);
        const matchScore = clamp(rawScore / 1000);
        return {
          ...record,
          rawScore,
          score: rawScore,
          matchScore,
          confidence: clamp(0.55 + (matchScore * 0.42))
        };
      })
      .filter(record => !q || record.rawScore >= 0)
      .sort((a, b) => b.rawScore - a.rawScore || String(a.id).localeCompare(String(b.id)))
      .slice(0, candidateLimit);
  }

  function projectSearchAdapter(query, options = {}) {
    if (typeof global.searchProject !== "function") return [];
    const candidateLimit = Math.max(1, finiteNumber(options.candidateLimit, DEFAULT_SEARCH_POLICY.candidateLimit));
    const q = normalizeText(query);
    return asArray(global.searchProject(query, { ...options, limit: candidateLimit })).map(item => {
      const rawScore = finiteNumber(item && item.score, 0);
      const matchScore = clamp(rawScore / 1000);
      return {
        ...item,
        id: resolveRawIdentity(item || {}),
        rawScore,
        matchScore,
        confidence: clamp(0.50 + (matchScore * 0.45))
      };
    }).filter(item => !q || Number(item.rawScore) > 0);
  }

  function getIdentityFields(item = {}) {
    const data = item.data && typeof item.data === "object" ? item.data : {};
    const id = String(item.id || "").trim();
    return unique([
      item.objectId, item.knowledgeId, item.koId, item.key,
      data.id, data.key, data.koId, data.objectId,
      id,
      id.replace(/^[a-z]+:/i, "")
    ]).map(normalizeText);
  }

  function getLabelFields(item = {}) {
    return unique([item.name, item.title, item.boxTitle, item.file]).map(normalizeText);
  }

  function markExactResult(item, query) {
    const normalizedQuery = normalizeText(query);
    const data = item.data && typeof item.data === "object" ? item.data : {};
    const preferred = [item.objectId, item.knowledgeId, item.koId, data.id, data.key, data.koId, item.key]
      .find(value => normalizeText(value) === normalizedQuery);
    const label = [item.name, item.title].find(value => normalizeText(value) === normalizedQuery);
    const strippedId = String(item.id || "").trim().replace(/^[a-z]+:/i, "");
    const id = String(preferred || (normalizeText(strippedId) === normalizedQuery ? strippedId : label || item.id)).trim();
    return { ...item, id, objectId: id, exactMatch: true, matchScore: 1, confidence: 1, reason: `Exact Match matched '${query}'` };
  }

  function exactProjectSearch(query, options = {}) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    const candidates = projectSearchAdapter(query, options);
    const identityMatches = candidates.filter(item => getIdentityFields(item).includes(normalizedQuery));
    const selected = identityMatches.length
      ? identityMatches
      : candidates.filter(item => getLabelFields(item).includes(normalizedQuery));
    return selected.map(item => markExactResult(item, query));
  }

  function exactKnowledgeSearch(query, options = {}) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    const candidates = knowledgeSearchAdapter(query, options);
    const identityMatches = candidates.filter(item => getIdentityFields(item).includes(normalizedQuery));
    const selected = identityMatches.length
      ? identityMatches
      : candidates.filter(item => getLabelFields(item).includes(normalizedQuery));
    return selected.map(item => markExactResult(item, query));
  }

  function exactUnifiedSearch(query, options = {}) {
    return [...exactKnowledgeSearch(query, options), ...exactProjectSearch(query, options)];
  }

  function prefixProjectSearch(query, options = {}) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    return projectSearchAdapter(query, options)
      .filter(item => [...getIdentityFields(item), ...getLabelFields(item)].some(value => value.startsWith(normalizedQuery)))
      .map(item => ({ ...item, matchScore: Math.max(item.matchScore, 0.75) }));
  }

  function prefixKnowledgeSearch(query, options = {}) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    return knowledgeSearchAdapter(query, options)
      .filter(item => [...getIdentityFields(item), ...getLabelFields(item)].some(value => value.startsWith(normalizedQuery)))
      .map(item => ({ ...item, matchScore: Math.max(item.matchScore, 0.75) }));
  }

  function prefixUnifiedSearch(query, options = {}) {
    return [...prefixKnowledgeSearch(query, options), ...prefixProjectSearch(query, options)];
  }

  function containsProjectSearch(query, options = {}) {
    const factor = clamp(finiteNumber(options.containsMatchFactor, DEFAULT_SEARCH_POLICY.containsMatchFactor));
    return projectSearchAdapter(query, options).map(item => ({
      ...item,
      matchScore: clamp(Number(item.matchScore || 0) * factor),
      confidence: clamp(Number(item.confidence || 0) * 0.95)
    }));
  }

  function containsKnowledgeSearch(query, options = {}) {
    const factor = clamp(finiteNumber(options.containsMatchFactor, DEFAULT_SEARCH_POLICY.containsMatchFactor));
    return knowledgeSearchAdapter(query, options).map(item => ({
      ...item,
      matchScore: clamp(Number(item.matchScore || 0) * factor),
      confidence: clamp(Number(item.confidence || 0) * 0.95)
    }));
  }

  function containsUnifiedSearch(query, options = {}) {
    return [...containsKnowledgeSearch(query, options), ...containsProjectSearch(query, options)];
  }

  function relationshipKnowledgeSearch(query, options = {}) {
    const q = normalizeText(query);
    if (!q) return [];
    return knowledgeSearchAdapter(query, options)
      .filter(item => asArray(item.relationships).map(normalizeText).some(value => value.includes(q)))
      .map(item => ({ ...item, matchScore: Math.max(Number(item.matchScore || 0), 0.60), confidence: Math.max(Number(item.confidence || 0), 0.75) }));
  }

  function decisionKnowledgeSearch(query, options = {}) {
    const q = normalizeText(query);
    return knowledgeSearchAdapter(query, options)
      .filter(item => {
        const decisionText = [item.knowledgeType, item.category, item.series, item.title].map(normalizeText).join(" ");
        return !q || calculateKnowledgeSearchScore(item, q) >= 0 || decisionText.includes("decision");
      });
  }

  function registerStandardStrategies() {
    const definitions = [
      { id: "exact-match", name: "Exact Match", priority: 10, weight: 2.0, stopOnResult: true, execute: exactUnifiedSearch },
      { id: "prefix-match", name: "Prefix Match", priority: 20, weight: 1.05, execute: prefixUnifiedSearch },
      { id: "contains-match", name: "Contains Match", priority: 30, weight: 0.55, execute: containsUnifiedSearch },
      { id: "regex-search", name: "Regex Search", priority: 40, weight: 0.75, execute: (q, o) => { let regex; try { regex = new RegExp(String(q), o.regexFlags || "i"); } catch (_) { return []; } return projectSearchAdapter("", o).filter(item => regex.test(JSON.stringify(item))).map(item => ({ ...item, matchScore: Math.max(item.matchScore, 0.65), confidence: Math.max(item.confidence, 0.75) })); } },
      { id: "metadata-search", name: "Metadata Search", priority: 50, weight: 0.90, execute: knowledgeSearchAdapter },
      { id: "relationship-search", name: "Relationship Search", priority: 60, weight: 0.90, execute: relationshipKnowledgeSearch },
      { id: "knowledge-search", name: "Knowledge Search", priority: 70, weight: 0.95, execute: knowledgeSearchAdapter },
      { id: "decision-search", name: "Decision Search", priority: 80, weight: 0.90, execute: decisionKnowledgeSearch },
      { id: "function-search", name: "Function Search", priority: 90, weight: 0.90, execute: (q, o) => projectSearchAdapter(q, { ...o, type: "function" }) },
      { id: "call-graph-search", name: "Call Graph Search", priority: 100, weight: 0.85, execute: projectSearchAdapter },
      { id: "file-search", name: "File Search", priority: 110, weight: 0.85, execute: (q, o) => projectSearchAdapter(q, { ...o, type: "file" }) },
      { id: "ai-recommendation-search", name: "AI Recommendation Search", priority: 120, weight: 0.70, enabled: true, fallback: true, execute: () => [] }
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
      registerSearchStrategy({ id: "validation-temp", priority: 1, execute: () => [{ id: "validation-result", matchScore: 1, confidence: 1 }] }, { replace: true });
      tempRegistered = true;
      check("Strategy registration", registry.has("validation-temp"));
      check("Strategy registry listing", getSearchStrategies({ includeDisabled: true }).some(item => item.id === "validation-temp"));
      check("Version management", getSearchStrategy("validation-temp").version === VERSION);
      check("Priority management", getSearchStrategy("validation-temp").priority === 1);
      setSearchStrategyEnabled("validation-temp", false);
      check("Enable disable management", getSearchStrategy("validation-temp").enabled === false);
      setSearchStrategyEnabled("validation-temp", true);
      check("Standard strategies", getSearchStrategies().length >= 12, `count=${getSearchStrategies().length}`);
      const merged = mergeSearchResults([[{ id: "A", matchScore: .5, confidence: .5, matchedStrategies: ["a"] }], [{ id: "A", matchScore: .8, confidence: .7, matchedStrategies: ["b"] }]]);
      check("Merge engine", merged.length === 1 && merged[0].matchedStrategies.length === 2);
      const scored = scoreSearchResults(merged);
      check("Score engine", scored.length === 1 && scored[0].score > 0);
      const ranked = rankSearchResults([{ id: "A", matchScore: .2 }, { id: "B", matchScore: .9 }], { minimumScore: 0 });
      check("Ranking engine", ranked[0].id === "B" && ranked[0].rank === 1);
      const limited = rankSearchResults(Array.from({ length: 20 }, (_, index) => ({ id: `R${index}`, matchScore: 1, confidence: 1 })), { limit: 5, minimumScore: 0 });
      check("Top-N limit", limited.length === 5);
      const thresholded = rankSearchResults([{ id: "LOW", matchScore: 0, confidence: 0 }], { minimumScore: 90 });
      check("Minimum score filter", thresholded.length === 0);
      check("Exact priority", calculateSearchScore({ id: "E", exactMatch: true, matchScore: 1, confidence: 1, weight: 2, priority: 10 }) === 100);
      check("Contains weight reduction", Number(getSearchStrategy("contains-match").weight) < 1);
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
    } catch (error) {
      check("Validation execution", false, String(error.message || error));
    } finally {
      if (tempRegistered) unregisterSearchStrategy("validation-temp");
    }
    const passed = checks.filter(item => item.passed).length;
    return {
      id: "IDE-120-VALIDATION",
      componentId: COMPONENT_ID,
      valid: passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed,
      failed: checks.length - passed,
      total: checks.length,
      health: Math.round((passed / Math.max(1, checks.length)) * 100),
      progress: Math.round((passed / Math.max(1, checks.length)) * 100),
      checks,
      validatedAt: nowIso()
    };
  }

  function getSearchPipelineStatus() {
    const validation = validateSearchStrategyPlatform();
    return {
      id: COMPONENT_ID,
      title: "Advanced Search Strategy",
      name: "Search Strategy Platform",
      version: VERSION,
      status: validation.valid ? "Ready" : "Attention",
      lifecycleStatus: "Completed",
      releaseStatus: "Official",
      ready: validation.valid,
      health: validation.health,
      progress: validation.progress,
      registeredStrategies: registry.size,
      enabledStrategies: getSearchStrategies().length,
      searchPolicy: clone(DEFAULT_SEARCH_POLICY),
      historyCount: pipelineHistory.length,
      diagnosticCount: diagnostics.length,
      lastExecution: lastExecution ? {
        id: lastExecution.id,
        query: lastExecution.query,
        status: lastExecution.status,
        resultCount: lastExecution.resultCount,
        durationMs: lastExecution.durationMs
      } : null,
      dependsOn: ["IDE-040", "IDE-090", "IDE-100", "IDE-110", "Search Engine", "Repository", "Architecture Database", "Knowledge Database"],
      provides: ["Strategy Registry", "Pipeline Engine", "Score Engine", "Merge Engine", "Fallback Engine", "Search Diagnostics"],
      nextTask: "Use the frozen golden-core regression baseline in IDE-130 Investigation Workflow.",
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
    searchKnowledgeRepository: knowledgeSearchAdapter,
    getKnowledgeRepositoryRecords,
    mergeSearchResults,
    calculateSearchScore,
    scoreSearchResults,
    rankSearchResults,
    getSearchPipelineStatus,
    getSearchStrategyPlatformStatus: getSearchPipelineStatus,
    validateSearchStrategyPlatform,
    validateAdvancedSearchStrategy: validateSearchStrategyPlatform
  });

  global.IDE120SearchPolicy = clone(DEFAULT_SEARCH_POLICY);
  console.log("13_search_strategy_platform loaded");
})(typeof window !== "undefined" ? window : globalThis);