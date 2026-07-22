/* ===============================
   FILE: 16_search_engine.js
   Search Engine
   ENGINE-010
   Version: 1.0.0
=============================== */

var SEARCH_ENGINE_ID = "ENGINE-010";
var SEARCH_ENGINE_VERSION = "1.0.0";
var SEARCH_ENGINE_TITLE = "Search Engine";
var SEARCH_ENGINE_DEFAULT_LIMIT = 20;
var SEARCH_ENGINE_MAX_LIMIT = 200;

var searchEngineIndex =
  typeof searchEngineIndex !== "undefined" &&
  searchEngineIndex instanceof Map
    ? searchEngineIndex
    : new Map();

var searchEngineSources =
  typeof searchEngineSources !== "undefined" &&
  searchEngineSources instanceof Map
    ? searchEngineSources
    : new Map();

var searchEngineMetrics =
  typeof searchEngineMetrics !== "undefined" &&
  searchEngineMetrics &&
  typeof searchEngineMetrics === "object"
    ? searchEngineMetrics
    : {
        searches: 0,
        indexed: 0,
        updated: 0,
        removed: 0,
        emptyResults: 0,
        partialResults: 0,
        errors: 0,
        lastSearchAt: null,
        lastIndexAt: null
      };

/* ===============================
   Utilities
=============================== */

function createSearchTimestamp() {
  return new Date().toISOString();
}

function cloneSearchValue(value) {
  if (value == null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function normalizeSearchString(value) {
  return String(value == null ? "" : value)
    .trim()
    .toLowerCase();
}

function normalizeSearchStringList(value) {
  const source = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [value];

  return Array.from(
    new Set(
      source
        .map(item => String(item == null ? "" : item).trim())
        .filter(Boolean)
    )
  );
}

function tokenizeSearchText(value) {
  return normalizeSearchString(value)
    .replace(/[\u3000\s]+/g, " ")
    .split(/[\s,.;:!?、。・/\\|()[\]{}<>"'`~+=*&^%$#@_-]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function createSearchResultError(code, message, details = null) {
  return {
    code: String(code || "SEARCH_ERROR"),
    message: String(message || "Unknown search error"),
    details: cloneSearchValue(details)
  };
}

function calculateSearchLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return SEARCH_ENGINE_DEFAULT_LIMIT;
  }

  return Math.min(
    SEARCH_ENGINE_MAX_LIMIT,
    Math.max(1, Math.floor(parsed))
  );
}

/* ===============================
   Source and Record Normalization
=============================== */

function normalizeSearchSource(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const id = String(source.id || source.sourceId || "").trim();

  if (!id) {
    return null;
  }

  return {
    id,
    title: String(source.title || source.name || id).trim(),
    type: String(source.type || "memory").trim(),
    enabled: source.enabled !== false,
    priority: Number.isFinite(Number(source.priority))
      ? Number(source.priority)
      : 0,
    retrieve:
      typeof source.retrieve === "function"
        ? source.retrieve
        : null,
    metadata:
      source.metadata && typeof source.metadata === "object"
        ? cloneSearchValue(source.metadata)
        : {},
    registeredAt: source.registeredAt || createSearchTimestamp(),
    updatedAt: createSearchTimestamp()
  };
}

function normalizeSearchRecord(record, options = {}) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const id = String(
    record.id || record.key || record.recordId || ""
  ).trim();

  if (!id) {
    return null;
  }

  const sourceId = String(
    record.sourceId || options.sourceId || "local"
  ).trim();
  const title = String(
    record.title || record.name || record.label || id
  ).trim();
  const body = String(
    record.body || record.text || record.content || ""
  );
  const summary = String(record.summary || "").trim();
  const type = String(
    record.type || record.knowledgeType || record.category || "unknown"
  ).trim();
  const tags = normalizeSearchStringList(
    record.tags || (record.metadata && record.metadata.tags)
  );
  const keywords = normalizeSearchStringList(
    record.keywords || (record.metadata && record.metadata.keywords)
  );
  const searchableText = [
    id,
    title,
    summary,
    body,
    type,
    tags.join(" "),
    keywords.join(" ")
  ].join(" ");

  return {
    id,
    sourceId,
    title,
    summary,
    body,
    type,
    tags,
    keywords,
    visibility: String(record.visibility || "public").trim(),
    access: normalizeSearchStringList(record.access || record.roles),
    metadata:
      record.metadata && typeof record.metadata === "object"
        ? cloneSearchValue(record.metadata)
        : {},
    provenance: normalizeSearchStringList(
      record.provenance || [sourceId, id]
    ),
    searchableText,
    normalizedText: normalizeSearchString(searchableText),
    tokens: tokenizeSearchText(searchableText),
    indexedAt: createSearchTimestamp()
  };
}

/* ===============================
   Source Registry
=============================== */

function registerSearchSource(source, options = {}) {
  const normalized = normalizeSearchSource(source);

  if (!normalized) {
    return {
      registered: false,
      replaced: false,
      id: "",
      errors: ["source id is required"]
    };
  }

  const exists = searchEngineSources.has(normalized.id);

  if (exists && options.replace !== true) {
    return {
      registered: false,
      replaced: false,
      id: normalized.id,
      errors: ["search source is already registered"]
    };
  }

  const previous = exists
    ? searchEngineSources.get(normalized.id)
    : null;

  normalized.registeredAt = previous
    ? previous.registeredAt
    : normalized.registeredAt;

  searchEngineSources.set(normalized.id, normalized);

  return {
    registered: true,
    replaced: exists,
    id: normalized.id
  };
}

function unregisterSearchSource(sourceId) {
  const id = String(sourceId || "").trim();
  const existed = searchEngineSources.delete(id);

  return {
    id,
    unregistered: existed
  };
}

function listSearchSources(options = {}) {
  const includeDisabled = options.includeDisabled === true;

  return Array.from(searchEngineSources.values())
    .filter(source => includeDisabled || source.enabled)
    .map(source => ({
      id: source.id,
      title: source.title,
      type: source.type,
      enabled: source.enabled,
      priority: source.priority,
      hasRetriever: typeof source.retrieve === "function",
      registeredAt: source.registeredAt,
      updatedAt: source.updatedAt
    }))
    .sort((a, b) =>
      b.priority - a.priority || a.id.localeCompare(b.id)
    );
}

/* ===============================
   Index Management
=============================== */

function buildSearchIndex(records, options = {}) {
  const list = Array.isArray(records) ? records : [];
  const replace = options.replace !== false;
  const sourceId = String(options.sourceId || "local").trim();
  const errors = [];
  let indexed = 0;
  let skipped = 0;

  if (replace) {
    searchEngineIndex.clear();
  }

  list.forEach((record, index) => {
    const normalized = normalizeSearchRecord(record, { sourceId });

    if (!normalized) {
      skipped += 1;
      errors.push({
        index,
        message: "record id is required"
      });
      return;
    }

    searchEngineIndex.set(normalized.id, normalized);
    indexed += 1;
  });

  searchEngineMetrics.indexed += indexed;
  searchEngineMetrics.lastIndexAt = createSearchTimestamp();

  return {
    built: true,
    replace,
    indexed,
    skipped,
    total: searchEngineIndex.size,
    errors
  };
}

function updateSearchIndex(record, options = {}) {
  const normalized = normalizeSearchRecord(record, options);

  if (!normalized) {
    return {
      updated: false,
      created: false,
      id: "",
      errors: ["record id is required"]
    };
  }

  const existed = searchEngineIndex.has(normalized.id);
  searchEngineIndex.set(normalized.id, normalized);
  searchEngineMetrics.updated += 1;
  searchEngineMetrics.lastIndexAt = createSearchTimestamp();

  return {
    updated: true,
    created: !existed,
    id: normalized.id,
    total: searchEngineIndex.size
  };
}

function removeSearchIndex(recordId) {
  const id = String(recordId || "").trim();
  const removed = searchEngineIndex.delete(id);

  if (removed) {
    searchEngineMetrics.removed += 1;
  }

  return {
    id,
    removed,
    total: searchEngineIndex.size
  };
}

function clearSearchIndex() {
  const removed = searchEngineIndex.size;
  searchEngineIndex.clear();
  searchEngineMetrics.removed += removed;

  return {
    cleared: true,
    removed,
    total: 0
  };
}

function getSearchIndexRecord(recordId) {
  const id = String(recordId || "").trim();
  const record = searchEngineIndex.get(id);
  return record ? cloneSearchValue(record) : null;
}

function getSearchIndexStatus() {
  const sources = {};

  searchEngineIndex.forEach(record => {
    sources[record.sourceId] = (sources[record.sourceId] || 0) + 1;
  });

  return {
    records: searchEngineIndex.size,
    sources,
    updatedAt: searchEngineMetrics.lastIndexAt
  };
}

/* ===============================
   Query Planning
=============================== */

function parseSearchQuery(query, options = {}) {
  const raw = String(query == null ? "" : query).trim();
  const normalized = normalizeSearchString(raw);
  const phrases = [];
  const phrasePattern = /"([^"]+)"|'([^']+)'/g;
  let match;

  while ((match = phrasePattern.exec(raw))) {
    const phrase = String(match[1] || match[2] || "").trim();
    if (phrase) {
      phrases.push(phrase);
    }
  }

  const withoutPhrases = raw.replace(phrasePattern, " ");
  const terms = tokenizeSearchText(withoutPhrases);

  return {
    raw,
    normalized,
    terms,
    phrases,
    mode: String(options.mode || "all").toLowerCase() === "any"
      ? "any"
      : "all",
    empty: !normalized,
    createdAt: createSearchTimestamp()
  };
}

function buildSearchQueryPlan(request = {}) {
  const query = parseSearchQuery(request.query, request);
  const filters =
    request.filters && typeof request.filters === "object"
      ? cloneSearchValue(request.filters)
      : {};
  const scope =
    request.scope && typeof request.scope === "object"
      ? cloneSearchValue(request.scope)
      : {};
  const accessPolicy =
    request.accessPolicy && typeof request.accessPolicy === "object"
      ? cloneSearchValue(request.accessPolicy)
      : {};

  return {
    id: typeof createEngineTraceId === "function"
      ? createEngineTraceId("SEARCH-PLAN")
      : `SEARCH-PLAN-${Date.now()}`,
    engineId: SEARCH_ENGINE_ID,
    version: SEARCH_ENGINE_VERSION,
    query,
    scope,
    filters,
    accessPolicy,
    sourceIds: normalizeSearchStringList(
      request.sourceIds || scope.sourceIds
    ),
    limit: calculateSearchLimit(request.limit),
    sort: String(request.sort || "score").trim(),
    includeBody: request.includeBody === true,
    createdAt: createSearchTimestamp()
  };
}

/* ===============================
   Candidate Retrieval
=============================== */

async function retrieveSearchCandidates(plan) {
  const candidates = Array.from(searchEngineIndex.values())
    .map(cloneSearchValue);
  const diagnostics = [];
  let partial = false;

  const sources = Array.from(searchEngineSources.values())
    .filter(source => source.enabled)
    .filter(source =>
      plan.sourceIds.length === 0 || plan.sourceIds.includes(source.id)
    );

  for (const source of sources) {
    if (typeof source.retrieve !== "function") {
      continue;
    }

    try {
      const result = await source.retrieve(cloneSearchValue(plan));
      const records = Array.isArray(result)
        ? result
        : result && Array.isArray(result.records)
          ? result.records
          : [];

      records.forEach(record => {
        const normalized = normalizeSearchRecord(record, {
          sourceId: source.id
        });

        if (normalized) {
          candidates.push(normalized);
        }
      });

      diagnostics.push({
        sourceId: source.id,
        status: "success",
        records: records.length
      });
    } catch (error) {
      partial = true;
      diagnostics.push({
        sourceId: source.id,
        status: "error",
        records: 0,
        message: error.message
      });
    }
  }

  return {
    candidates,
    diagnostics,
    partial
  };
}

/* ===============================
   Policy, Filter and Deduplication
=============================== */

function isSearchRecordAccessible(record, accessPolicy = {}) {
  const allowedVisibilities = normalizeSearchStringList(
    accessPolicy.allowedVisibilities || ["public", "internal"]
  ).map(normalizeSearchString);
  const roles = normalizeSearchStringList(accessPolicy.roles)
    .map(normalizeSearchString);
  const visibility = normalizeSearchString(record.visibility || "public");

  if (
    allowedVisibilities.length > 0 &&
    !allowedVisibilities.includes(visibility)
  ) {
    return false;
  }

  if (!record.access || record.access.length === 0) {
    return true;
  }

  return record.access
    .map(normalizeSearchString)
    .some(role => roles.includes(role));
}

function filterSearchResults(records, plan) {
  const filters = plan.filters || {};
  const types = normalizeSearchStringList(filters.type || filters.types)
    .map(normalizeSearchString);
  const tags = normalizeSearchStringList(filters.tag || filters.tags)
    .map(normalizeSearchString);
  const ids = normalizeSearchStringList(filters.id || filters.ids);
  const sourceIds = plan.sourceIds;

  return records
    .filter(record => isSearchRecordAccessible(record, plan.accessPolicy))
    .filter(record =>
      sourceIds.length === 0 || sourceIds.includes(record.sourceId)
    )
    .filter(record =>
      ids.length === 0 || ids.includes(record.id)
    )
    .filter(record =>
      types.length === 0 || types.includes(normalizeSearchString(record.type))
    )
    .filter(record => {
      if (tags.length === 0) {
        return true;
      }

      const recordTags = record.tags.map(normalizeSearchString);
      return tags.every(tag => recordTags.includes(tag));
    });
}

function deduplicateSearchResults(records) {
  const result = new Map();

  records.forEach(record => {
    const key = `${record.sourceId}::${record.id}`;

    if (!result.has(key)) {
      result.set(key, record);
    }
  });

  return Array.from(result.values());
}

/* ===============================
   Ranking
=============================== */

function scoreSearchRecord(record, parsedQuery) {
  if (parsedQuery.empty) {
    return {
      matched: true,
      score: 1,
      reasons: ["empty-query-scope-match"]
    };
  }

  const id = normalizeSearchString(record.id);
  const title = normalizeSearchString(record.title);
  const summary = normalizeSearchString(record.summary);
  const body = normalizeSearchString(record.body);
  const tags = record.tags.map(normalizeSearchString);
  const keywords = record.keywords.map(normalizeSearchString);
  const text = record.normalizedText;
  const reasons = [];
  const termMatches = [];
  let score = 0;

  parsedQuery.terms.forEach(term => {
    let termScore = 0;

    if (id === term) {
      termScore += 100;
      reasons.push(`id-exact:${term}`);
    } else if (id.includes(term)) {
      termScore += 50;
      reasons.push(`id-partial:${term}`);
    }

    if (title === term) {
      termScore += 80;
      reasons.push(`title-exact:${term}`);
    } else if (title.includes(term)) {
      termScore += 40;
      reasons.push(`title:${term}`);
    }

    if (tags.includes(term)) {
      termScore += 30;
      reasons.push(`tag:${term}`);
    }

    if (keywords.includes(term)) {
      termScore += 25;
      reasons.push(`keyword:${term}`);
    }

    if (summary.includes(term)) {
      termScore += 15;
      reasons.push(`summary:${term}`);
    }

    if (body.includes(term)) {
      termScore += 5;
      reasons.push(`body:${term}`);
    }

    if (termScore === 0 && text.includes(term)) {
      termScore += 2;
      reasons.push(`text:${term}`);
    }

    termMatches.push(termScore > 0);
    score += termScore;
  });

  parsedQuery.phrases.forEach(phraseValue => {
    const phrase = normalizeSearchString(phraseValue);

    if (title.includes(phrase)) {
      score += 100;
      reasons.push(`title-phrase:${phraseValue}`);
    } else if (text.includes(phrase)) {
      score += 35;
      reasons.push(`phrase:${phraseValue}`);
    } else {
      termMatches.push(false);
    }
  });

  const matched = parsedQuery.mode === "any"
    ? termMatches.some(Boolean)
    : termMatches.every(Boolean);

  return {
    matched,
    score: matched ? score : 0,
    reasons: matched ? reasons : []
  };
}

function rankSearchResults(records, plan) {
  return records
    .map(record => {
      const ranking = scoreSearchRecord(record, plan.query);
      return {
        record,
        score: ranking.score,
        reasons: ranking.reasons,
        matched: ranking.matched
      };
    })
    .filter(item => item.matched)
    .sort((a, b) =>
      b.score - a.score ||
      a.record.title.localeCompare(b.record.title) ||
      a.record.id.localeCompare(b.record.id)
    );
}

function sortSearchResults(results, sort = "score") {
  const normalizedSort = normalizeSearchString(sort);
  const copy = [...results];

  if (normalizedSort === "title") {
    return copy.sort((a, b) =>
      a.record.title.localeCompare(b.record.title)
    );
  }

  if (normalizedSort === "id") {
    return copy.sort((a, b) =>
      a.record.id.localeCompare(b.record.id)
    );
  }

  return copy.sort((a, b) =>
    b.score - a.score || a.record.id.localeCompare(b.record.id)
  );
}

/* ===============================
   Result Assembly
=============================== */

function assembleSearchResult(item, plan, rank) {
  const record = item.record;

  const result = {
    rank,
    id: record.id,
    sourceId: record.sourceId,
    title: record.title,
    summary: record.summary,
    type: record.type,
    tags: [...record.tags],
    keywords: [...record.keywords],
    score: item.score,
    explanation: [...item.reasons],
    metadata: cloneSearchValue(record.metadata),
    provenance: [...record.provenance]
  };

  if (plan.includeBody === true) {
    result.body = record.body;
  }

  return result;
}

function validateSearchResultSet(result) {
  const errors = [];
  const warnings = [];

  if (!result || typeof result !== "object") {
    errors.push("result must be an object");
  }

  if (result && !Array.isArray(result.results)) {
    errors.push("results must be an array");
  }

  if (result && Array.isArray(result.results)) {
    result.results.forEach((item, index) => {
      if (!item.id) {
        errors.push(`results[${index}].id is required`);
      }
      if (!item.sourceId) {
        errors.push(`results[${index}].sourceId is required`);
      }
      if (!Array.isArray(item.provenance) || item.provenance.length === 0) {
        errors.push(`results[${index}].provenance is required`);
      }
      if (!Array.isArray(item.explanation)) {
        errors.push(`results[${index}].explanation must be an array`);
      }
    });
  }

  if (result && result.status === "empty") {
    warnings.push("search completed with no matching results");
  }

  if (result && result.status === "partial") {
    warnings.push("one or more search sources failed");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/* ===============================
   Search Execution
=============================== */

function validateSearchRequest(request) {
  const errors = [];

  if (!request || typeof request !== "object") {
    errors.push("request must be an object");
  }

  if (
    request &&
    request.query != null &&
    typeof request.query !== "string"
  ) {
    errors.push("query must be a string");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function executeSearch(request = {}, context = null) {
  const startedAtMs = Date.now();
  const startedAt = createSearchTimestamp();
  const validation = validateSearchRequest(request);
  const errors = [];
  const warnings = [];

  if (!validation.valid) {
    validation.errors.forEach(message => {
      errors.push(
        createSearchResultError("SEARCH_REQUEST_INVALID", message)
      );
    });
  }

  if (errors.length > 0) {
    searchEngineMetrics.errors += 1;
    return {
      ok: false,
      engineId: SEARCH_ENGINE_ID,
      version: SEARCH_ENGINE_VERSION,
      status: "error",
      query: null,
      plan: null,
      results: [],
      total: 0,
      returned: 0,
      diagnostics: [],
      warnings,
      errors,
      context: cloneSearchValue(context),
      startedAt,
      completedAt: createSearchTimestamp(),
      durationMs: Date.now() - startedAtMs
    };
  }

  const plan = buildSearchQueryPlan(request);
  let retrieval;

  try {
    retrieval = await retrieveSearchCandidates(plan);
  } catch (error) {
    searchEngineMetrics.errors += 1;
    return {
      ok: false,
      engineId: SEARCH_ENGINE_ID,
      version: SEARCH_ENGINE_VERSION,
      status: "error",
      query: cloneSearchValue(plan.query),
      plan: cloneSearchValue(plan),
      results: [],
      total: 0,
      returned: 0,
      diagnostics: [],
      warnings: cloneSearchValue(warnings),
      errors: [
        createSearchResultError(
          "SEARCH_RETRIEVAL_ERROR",
          error.message,
          { stack: error.stack }
        )
      ],
      context: cloneSearchValue(context),
      startedAt,
      completedAt: createSearchTimestamp(),
      durationMs: Date.now() - startedAtMs
    };
  }

  const filtered = filterSearchResults(retrieval.candidates, plan);
  const deduplicated = deduplicateSearchResults(filtered);
  const ranked = rankSearchResults(deduplicated, plan);
  const sorted = sortSearchResults(ranked, plan.sort);
  const limited = sorted.slice(0, plan.limit);
  const results = limited.map((item, index) =>
    assembleSearchResult(item, plan, index + 1)
  );
  const status = retrieval.partial
    ? "partial"
    : results.length === 0
      ? "empty"
      : "success";

  if (status === "partial") {
    warnings.push(
      createSearchResultError(
        "SEARCH_PARTIAL_RESULT",
        "One or more search sources failed"
      )
    );
    searchEngineMetrics.partialResults += 1;
  }

  if (status === "empty") {
    warnings.push(
      createSearchResultError(
        "SEARCH_EMPTY_RESULT",
        "No matching results were found"
      )
    );
    searchEngineMetrics.emptyResults += 1;
  }

  searchEngineMetrics.searches += 1;
  searchEngineMetrics.lastSearchAt = createSearchTimestamp();

  const output = {
    ok: true,
    engineId: SEARCH_ENGINE_ID,
    version: SEARCH_ENGINE_VERSION,
    status,
    query: cloneSearchValue(plan.query),
    plan: cloneSearchValue(plan),
    results,
    total: sorted.length,
    returned: results.length,
    diagnostics: cloneSearchValue(retrieval.diagnostics),
    warnings: cloneSearchValue(warnings),
    errors: cloneSearchValue(errors),
    context: cloneSearchValue(context),
    startedAt,
    completedAt: createSearchTimestamp(),
    durationMs: Date.now() - startedAtMs
  };
  const outputValidation = validateSearchResultSet(output);

  if (!outputValidation.valid) {
    output.ok = false;
    output.status = "error";
    outputValidation.errors.forEach(message => {
      output.errors.push(
        createSearchResultError("SEARCH_OUTPUT_INVALID", message)
      );
    });
    searchEngineMetrics.errors += 1;
  }

  return output;
}

async function searchById(id, options = {}) {
  return executeSearch({
    ...options,
    query: String(options.query || id || ""),
    filters: {
      ...(options.filters || {}),
      id: String(id || "")
    }
  });
}

async function searchByType(type, query = "", options = {}) {
  return executeSearch({
    ...options,
    query,
    filters: {
      ...(options.filters || {}),
      type: String(type || "")
    }
  });
}

async function searchByTag(tag, query = "", options = {}) {
  return executeSearch({
    ...options,
    query,
    filters: {
      ...(options.filters || {}),
      tag: String(tag || "")
    }
  });
}

/* ===============================
   Engine Contract
=============================== */

function validateSearchEngineInput(input) {
  return validateSearchRequest(input);
}

function validateSearchEngineOutput(output) {
  return validateSearchResultSet(output);
}

function getSearchEngineStatus() {
  const registered =
    typeof getEngine === "function" &&
    !!getEngine(SEARCH_ENGINE_ID);
  const ready =
    typeof executeSearch === "function" &&
    typeof buildSearchIndex === "function" &&
    typeof parseSearchQuery === "function" &&
    registered;

  return {
    id: SEARCH_ENGINE_ID,
    title: SEARCH_ENGINE_TITLE,
    version: SEARCH_ENGINE_VERSION,
    status: ready ? "Ready" : "Not Registered",
    ready,
    health: ready ? 100 : 0,
    progress: ready ? 100 : 90,
    registered,
    index: getSearchIndexStatus(),
    sources: listSearchSources({ includeDisabled: true }),
    metrics: cloneSearchValue(searchEngineMetrics),
    updatedAt: createSearchTimestamp()
  };
}

function getSearchEngineHealth() {
  const status = getSearchEngineStatus();

  return {
    id: status.id,
    health: status.health,
    ready: status.ready,
    status: status.status,
    records: status.index.records,
    sources: status.sources.length,
    errors: status.metrics.errors
  };
}

function createSearchEngineDefinition() {
  return {
    id: SEARCH_ENGINE_ID,
    title: SEARCH_ENGINE_TITLE,
    version: SEARCH_ENGINE_VERSION,
    status: "Ready",
    enabled: true,
    description:
      "Interprets queries, coordinates retrieval, filters, deduplicates, ranks and returns provenance-preserving search results.",
    dependencies: [],
    inputs: [
      "Query",
      "Search scope",
      "Metadata filters",
      "Access policy",
      "Index and retrieval interfaces"
    ],
    outputs: [
      "Ranked results",
      "Result explanations",
      "Search diagnostics",
      "Search trace"
    ],
    execute: executeSearch,
    validateInput: validateSearchEngineInput,
    validateOutput: validateSearchEngineOutput,
    getStatus: getSearchEngineStatus,
    metadata: {
      knowledgeObject: "112",
      series: "Engine",
      category: "Engine Platform",
      authority: "Engine Platform Architecture",
      declaredDependsOn: [
        "ENGINE-001",
        "INFORMATION-001",
        "INFORMATION-080",
        "INFORMATION-090",
        "INFORMATION-100",
        "INFORMATION-110"
      ],
      readOnly: true,
      provenanceRequired: true
    }
  };
}

function registerSearchEngine(options = {}) {
  if (typeof registerEngine !== "function") {
    return {
      registered: false,
      replaced: false,
      id: SEARCH_ENGINE_ID,
      errors: ["ENGINE-001 registerEngine is unavailable"]
    };
  }

  return registerEngine(
    createSearchEngineDefinition(),
    { replace: options.replace !== false }
  );
}

/* ===============================
   Validation
=============================== */

async function validateSearchEngine() {
  const checks = {
    engineCore: typeof registerEngine === "function",
    indexStore: searchEngineIndex instanceof Map,
    sourceRegistry: searchEngineSources instanceof Map,
    queryParser: typeof parseSearchQuery === "function",
    queryPlan: typeof buildSearchQueryPlan === "function",
    indexing: false,
    lookup: false,
    filtering: false,
    ranking: false,
    provenance: false,
    emptyResult: false,
    execution: false,
    registration: false,
    platformLookup: false
  };
  const failed = [];
  const testIds = [
    "ENGINE-010-TEST-A",
    "ENGINE-010-TEST-B",
    "ENGINE-010-TEST-C"
  ];
  const previousRecords = testIds
    .map(id => searchEngineIndex.get(id))
    .filter(Boolean);

  try {
    const build = buildSearchIndex(
      [
        {
          id: testIds[0],
          sourceId: "validation",
          title: "Search Engine Overview",
          summary: "Query retrieval ranking",
          type: "Engine Specification",
          tags: ["Search", "Engine"],
          provenance: ["validation", testIds[0]]
        },
        {
          id: testIds[1],
          sourceId: "validation",
          title: "Context Engine",
          summary: "Context assembly",
          type: "Engine Specification",
          tags: ["Context", "Engine"],
          provenance: ["validation", testIds[1]]
        },
        {
          id: testIds[2],
          sourceId: "validation",
          title: "Private Search Record",
          summary: "Restricted",
          type: "Test",
          tags: ["Search"],
          visibility: "private",
          access: ["admin"],
          provenance: ["validation", testIds[2]]
        }
      ],
      { replace: false, sourceId: "validation" }
    );

    checks.indexing = build.indexed === 3;
    checks.lookup = !!getSearchIndexRecord(testIds[0]);

    const result = await executeSearch({
      query: '"Search Engine" ranking',
      sourceIds: ["validation"],
      accessPolicy: {
        allowedVisibilities: ["public"]
      },
      limit: 10
    });

    checks.execution = result.ok === true;
    checks.filtering = result.results.every(item =>
      item.id !== testIds[2]
    );
    checks.ranking =
      result.results.length > 0 &&
      result.results[0].id === testIds[0] &&
      result.results[0].score > 0;
    checks.provenance = result.results.every(item =>
      Array.isArray(item.provenance) && item.provenance.length > 0
    );

    const empty = await executeSearch({
      query: "ENGINE010-NO-MATCH-EXPECTED",
      sourceIds: ["validation"]
    });

    checks.emptyResult =
      empty.ok === true &&
      empty.status === "empty" &&
      empty.results.length === 0;

    const registration = registerSearchEngine({ replace: true });
    checks.registration = registration.registered === true;
    checks.platformLookup =
      typeof getEngine === "function" &&
      !!getEngine(SEARCH_ENGINE_ID);
  } catch (error) {
    failed.push(`exception: ${error.message}`);
  } finally {
    testIds.forEach(id => searchEngineIndex.delete(id));
    previousRecords.forEach(record => {
      searchEngineIndex.set(record.id, record);
    });
  }

  Object.keys(checks).forEach(name => {
    if (!checks[name]) {
      failed.push(name);
    }
  });

  const total = Object.keys(checks).length;
  const passed = total - Object.values(checks).filter(value => !value).length;
  const status = getSearchEngineStatus();

  return {
    id: SEARCH_ENGINE_ID,
    title: SEARCH_ENGINE_TITLE,
    version: SEARCH_ENGINE_VERSION,
    valid: failed.length === 0,
    passed,
    total,
    failed,
    checks,
    records: searchEngineIndex.size,
    sources: searchEngineSources.size,
    status
  };
}

/* ===============================
   Auto Registration
=============================== */

var searchEngineRegistrationResult = registerSearchEngine({
  replace: true
});