/* ===============================
   FILE: 16_perception_engine.js
   Perception Engine
   ENGINE-030
   Version: 1.0.0
=============================== */

var PERCEPTION_ENGINE_ID = "ENGINE-030";
var PERCEPTION_ENGINE_TITLE = "Perception Engine";
var PERCEPTION_ENGINE_VERSION = "1.0.0";
var PERCEPTION_ENGINE_MAX_KEYWORDS = 20;

var perceptionEngineMetrics =
  typeof perceptionEngineMetrics !== "undefined" &&
  perceptionEngineMetrics &&
  typeof perceptionEngineMetrics === "object"
    ? perceptionEngineMetrics
    : {
        executions: 0,
        normalized: 0,
        classified: 0,
        intentsDetected: 0,
        entitiesExtracted: 0,
        contextUpdates: 0,
        errors: 0,
        lastExecutionAt: null
      };

/* ===============================
   Utilities
=============================== */

function createPerceptionTimestamp() {
  return new Date().toISOString();
}

function createPerceptionId(prefix = "PERCEPTION") {
  return [
    String(prefix || "PERCEPTION").toUpperCase(),
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8)
  ].join("-");
}

function clonePerceptionValue(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function normalizePerceptionObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? clonePerceptionValue(value)
    : {};
}

function normalizePerceptionList(value) {
  const source = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [value];

  return source
    .map(item => String(item == null ? "" : item).trim())
    .filter(Boolean);
}

function uniquePerceptionList(value) {
  return Array.from(new Set(normalizePerceptionList(value)));
}

function createPerceptionError(code, message, details = null) {
  return {
    code: String(code || "PERCEPTION_ERROR"),
    message: String(message || "Unknown perception error"),
    details: clonePerceptionValue(details)
  };
}

function normalizePerceptionText(value) {
  return String(value == null ? "" : value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u3000]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenizePerceptionText(value) {
  return normalizePerceptionText(value)
    .toLowerCase()
    .split(/[\s,.;:!?、。・/\\|()[\]{}<>"'`~+=*&^%$#@_-]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

/* ===============================
   Input Normalization
=============================== */

function normalizePerceptionInput(input, options = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? input
    : { text: input };
  const rawText = source.text ?? source.input ?? source.content ?? source.prompt ?? "";
  const text = normalizePerceptionText(rawText);

  perceptionEngineMetrics.normalized += 1;

  return {
    id: String(source.id || options.id || createPerceptionId("INPUT")),
    text,
    rawText: String(rawText == null ? "" : rawText),
    typeHint: source.typeHint == null ? null : String(source.typeHint),
    languageHint: source.languageHint == null ? null : String(source.languageHint),
    intentHint: source.intentHint == null ? null : String(source.intentHint),
    metadata: normalizePerceptionObject(source.metadata),
    provenance: uniquePerceptionList(source.provenance),
    createdAt: String(source.createdAt || createPerceptionTimestamp())
  };
}

function validatePerceptionInput(input) {
  const normalized = normalizePerceptionInput(input);
  const errors = [];
  const warnings = [];

  if (!normalized.text) {
    errors.push("input text is required");
  }

  if (normalized.text.length > 200000) {
    warnings.push("input text is very large");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    input: normalized
  };
}

/* ===============================
   Detection and Classification
=============================== */

function detectPerceptionLanguage(input) {
  const text = typeof input === "string" ? input : (input && input.text) || "";
  const value = normalizePerceptionText(text);

  if (!value) return "unknown";

  const japanese = (value.match(/[ぁ-んァ-ヶ一-龠々ー]/g) || []).length;
  const latin = (value.match(/[A-Za-z]/g) || []).length;

  if (japanese > 0 && latin > 0) return "mixed-ja-en";
  if (japanese > 0) return "ja";
  if (latin > 0) return "en";
  return "unknown";
}

function detectPerceptionInputType(input) {
  const text = typeof input === "string" ? input : (input && input.text) || "";
  const value = normalizePerceptionText(text);

  if (!value) return "empty";
  if (/^\s*[\[{][\s\S]*[\]}]\s*$/.test(value)) {
    try {
      JSON.parse(value);
      return "json";
    } catch (error) {
      // Continue as text.
    }
  }
  if (/```|\b(function|const|let|var|class|return|async|await)\b|=>/.test(value)) {
    return "code";
  }
  if (/^\s*[-*+]\s+/m.test(value) || /^\s*#{1,6}\s+/m.test(value)) {
    return "structured-text";
  }
  if (/\?$|？$/.test(value)) return "question";
  return "text";
}

function detectPerceptionIntent(input) {
  const normalized = typeof input === "string"
    ? normalizePerceptionInput(input)
    : normalizePerceptionInput(input || {});
  const text = normalized.text.toLowerCase();

  const rules = [
    { id: "search", score: 0, patterns: [/検索/, /探して/, /見つけ/, /search\b/, /find\b/, /lookup\b/] },
    { id: "create", score: 0, patterns: [/作成/, /生成/, /作って/, /create\b/, /generate\b/, /build\b/] },
    { id: "modify", score: 0, patterns: [/修正/, /変更/, /更新/, /直して/, /modify\b/, /update\b/, /edit\b/, /fix\b/] },
    { id: "analyze", score: 0, patterns: [/分析/, /解析/, /確認/, /診断/, /analy[sz]e\b/, /inspect\b/, /diagnos/] },
    { id: "explain", score: 0, patterns: [/説明/, /教えて/, /とは/, /explain\b/, /what is\b/] },
    { id: "execute", score: 0, patterns: [/実行/, /開始/, /run\b/, /execute\b/, /start\b/] }
  ];

  rules.forEach(rule => {
    rule.patterns.forEach(pattern => {
      if (pattern.test(text)) rule.score += 1;
    });
  });

  rules.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const best = rules[0];
  const intent = normalized.intentHint || (best.score > 0 ? best.id : "inform");

  perceptionEngineMetrics.intentsDetected += 1;

  return {
    primary: String(intent),
    confidence: normalized.intentHint ? 1 : best.score > 0 ? Math.min(1, 0.55 + best.score * 0.15) : 0.4,
    candidates: rules
      .filter(rule => rule.score > 0)
      .map(rule => ({ intent: rule.id, score: rule.score }))
  };
}

function extractPerceptionEntities(input) {
  const text = typeof input === "string" ? input : (input && input.text) || "";
  const entities = [];
  const seen = new Set();

  function add(type, value, start = null) {
    const normalized = String(value || "").trim();
    const key = `${type}:${normalized.toLowerCase()}`;
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    entities.push({ type, value: normalized, start });
  }

  const patterns = [
    ["url", /https?:\/\/[^\s]+/g],
    ["email", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
    ["knowledge-object", /\b(?:ENGINE|INFORMATION|REPOSITORY|PLATFORM|CORE|ARCH|IDE)-\d{3}\b/gi],
    ["file", /\b[\w.-]+\.(?:js|json|html|css|md|zip|txt|pdf)\b/gi],
    ["version", /\bv?\d+\.\d+(?:\.\d+)?\b/gi],
    ["date", /\b\d{4}-\d{2}-\d{2}\b/g]
  ];

  patterns.forEach(([type, pattern]) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      add(type, match[0], match.index);
    }
  });

  perceptionEngineMetrics.entitiesExtracted += entities.length;
  return entities;
}

function extractPerceptionKeywords(input, options = {}) {
  const text = typeof input === "string" ? input : (input && input.text) || "";
  const max = Math.max(1, Number(options.max || PERCEPTION_ENGINE_MAX_KEYWORDS));
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are",
    "this", "that", "with", "を", "に", "が", "は", "の", "と", "で", "へ", "から", "まで",
    "する", "して", "です", "ます", "これ", "それ", "ため"
  ]);
  const counts = new Map();

  tokenizePerceptionText(text).forEach(token => {
    if (token.length < 2 || stopWords.has(token)) return;
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([keyword, count]) => ({ keyword, count }));
}

function extractPerceptionMetadata(input) {
  const normalized = typeof input === "string"
    ? normalizePerceptionInput(input)
    : normalizePerceptionInput(input || {});

  return {
    characterCount: normalized.text.length,
    lineCount: normalized.text ? normalized.text.split("\n").length : 0,
    tokenCount: tokenizePerceptionText(normalized.text).length,
    hasUrl: /https?:\/\//.test(normalized.text),
    hasCodeFence: /```/.test(normalized.text),
    supplied: clonePerceptionValue(normalized.metadata)
  };
}

function classifyPerceptionInput(input) {
  const normalized = typeof input === "string"
    ? normalizePerceptionInput(input)
    : normalizePerceptionInput(input || {});
  const language = normalized.languageHint || detectPerceptionLanguage(normalized);
  const inputType = normalized.typeHint || detectPerceptionInputType(normalized);
  const intent = detectPerceptionIntent(normalized);
  const entities = extractPerceptionEntities(normalized);
  const keywords = extractPerceptionKeywords(normalized);

  perceptionEngineMetrics.classified += 1;

  return {
    language,
    inputType,
    intent,
    entities,
    keywords,
    metadata: extractPerceptionMetadata(normalized)
  };
}

/* ===============================
   Search and Context Integration
=============================== */

function buildPerceptionSearchHint(classification) {
  const source = classification && typeof classification === "object"
    ? classification
    : {};
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.map(item => item.keyword || item).filter(Boolean)
    : [];
  const entities = Array.isArray(source.entities)
    ? source.entities.map(item => item.value).filter(Boolean)
    : [];

  return {
    query: uniquePerceptionList([...keywords, ...entities]).slice(0, 12).join(" "),
    terms: uniquePerceptionList(keywords).slice(0, 12),
    filters: source.inputType ? { inputType: source.inputType } : {},
    language: source.language || "unknown"
  };
}

function buildPerceptionContext(input, classification, context = null) {
  const base = context && typeof context === "object" ? context : {};

  return {
    contextId: base.id || null,
    traceId: base.traceId || null,
    metadata: {
      perception: {
        inputId: input.id,
        language: classification.language,
        inputType: classification.inputType,
        intent: classification.intent.primary,
        entityCount: classification.entities.length,
        keywordCount: classification.keywords.length,
        perceivedAt: createPerceptionTimestamp()
      }
    },
    provenance: uniquePerceptionList([
      ...(Array.isArray(base.provenance) ? base.provenance : []),
      ...input.provenance,
      PERCEPTION_ENGINE_ID
    ])
  };
}

function mergePerceptionContext(contextId, perceptionContext) {
  if (!contextId || typeof updateContext !== "function") {
    return {
      updated: false,
      contextId: contextId || null,
      reason: "Context Engine is unavailable or contextId is missing"
    };
  }

  const existing = typeof getContext === "function" ? getContext(contextId) : null;
  if (!existing) {
    return {
      updated: false,
      contextId,
      reason: "Managed context not found"
    };
  }

  const metadata = {
    ...(existing.metadata || {}),
    ...(perceptionContext.metadata || {})
  };
  const provenance = uniquePerceptionList([
    ...(existing.provenance || []),
    ...(perceptionContext.provenance || [])
  ]);
  const updated = updateContext(contextId, { metadata, provenance });

  if (updated) perceptionEngineMetrics.contextUpdates += 1;

  return {
    updated: Boolean(updated),
    contextId,
    context: clonePerceptionValue(updated)
  };
}

/* ===============================
   Execution
=============================== */

function createPerceptionResult(input, classification, options = {}) {
  const startedAt = options.startedAt || createPerceptionTimestamp();
  const searchHint = buildPerceptionSearchHint(classification);
  const perceptionContext = buildPerceptionContext(
    input,
    classification,
    options.context || null
  );

  return {
    ok: true,
    engineId: PERCEPTION_ENGINE_ID,
    version: PERCEPTION_ENGINE_VERSION,
    id: createPerceptionId("RESULT"),
    input: clonePerceptionValue(input),
    classification: clonePerceptionValue(classification),
    searchHint,
    perceptionContext,
    warnings: clonePerceptionValue(options.warnings || []),
    errors: [],
    startedAt,
    completedAt: createPerceptionTimestamp(),
    durationMs: Math.max(0, Date.now() - (options.startedAtMs || Date.now()))
  };
}

function executePerception(input, context = null, options = {}) {
  const startedAtMs = Date.now();
  const startedAt = createPerceptionTimestamp();
  const validation = validatePerceptionInput(input);

  perceptionEngineMetrics.executions += 1;
  perceptionEngineMetrics.lastExecutionAt = startedAt;

  if (!validation.valid) {
    perceptionEngineMetrics.errors += 1;
    return {
      ok: false,
      engineId: PERCEPTION_ENGINE_ID,
      version: PERCEPTION_ENGINE_VERSION,
      status: "invalid-input",
      input: clonePerceptionValue(validation.input),
      classification: null,
      searchHint: null,
      perceptionContext: null,
      warnings: clonePerceptionValue(validation.warnings),
      errors: validation.errors.map(message =>
        createPerceptionError("PERCEPTION_INPUT_INVALID", message)
      ),
      startedAt,
      completedAt: createPerceptionTimestamp(),
      durationMs: Date.now() - startedAtMs
    };
  }

  try {
    const classification = classifyPerceptionInput(validation.input);
    const result = createPerceptionResult(validation.input, classification, {
      context,
      warnings: validation.warnings,
      startedAt,
      startedAtMs
    });

    if (options.updateContext !== false && context && context.id) {
      result.contextUpdate = mergePerceptionContext(
        context.id,
        result.perceptionContext
      );
    }

    return result;
  } catch (error) {
    perceptionEngineMetrics.errors += 1;
    return {
      ok: false,
      engineId: PERCEPTION_ENGINE_ID,
      version: PERCEPTION_ENGINE_VERSION,
      status: "error",
      input: clonePerceptionValue(validation.input),
      classification: null,
      searchHint: null,
      perceptionContext: null,
      warnings: clonePerceptionValue(validation.warnings),
      errors: [
        createPerceptionError(
          "PERCEPTION_EXECUTION_ERROR",
          error.message,
          { stack: error.stack }
        )
      ],
      startedAt,
      completedAt: createPerceptionTimestamp(),
      durationMs: Date.now() - startedAtMs
    };
  }
}

function perceiveInput(input, options = {}) {
  return executePerception(input, options.context || null, options);
}

/* ===============================
   Engine Registration
=============================== */

function createPerceptionEngineDefinition() {
  return {
    id: PERCEPTION_ENGINE_ID,
    title: PERCEPTION_ENGINE_TITLE,
    version: PERCEPTION_ENGINE_VERSION,
    status: "Ready",
    enabled: true,
    dependencies: [],
    inputs: [
      "Raw text or structured input",
      "Language, type and intent hints",
      "Optional managed context"
    ],
    outputs: [
      "Normalized input",
      "Classification",
      "Entities and keywords",
      "Search hint",
      "Perception context"
    ],
    execute(input, context) {
      return executePerception(input, context, { updateContext: true });
    },
    validateInput(input) {
      const result = validatePerceptionInput(input);
      return { valid: result.valid, errors: result.errors, warnings: result.warnings };
    },
    validateOutput(output) {
      return {
        valid: Boolean(output && typeof output === "object" && typeof output.ok === "boolean"),
        errors: output && typeof output === "object" ? [] : ["output must be an object"]
      };
    },
    getStatus: getPerceptionEngineStatus,
    getHealth: getPerceptionEngineHealth
  };
}

function registerPerceptionEngine(options = {}) {
  if (typeof registerEngine !== "function") {
    return {
      registered: false,
      engineId: PERCEPTION_ENGINE_ID,
      error: "ENGINE-001 registerEngine() is unavailable"
    };
  }

  const existing = typeof getEngine === "function"
    ? getEngine(PERCEPTION_ENGINE_ID)
    : null;

  if (existing && options.replace !== true) {
    return {
      registered: true,
      engineId: PERCEPTION_ENGINE_ID,
      existing: true
    };
  }

  return registerEngine(createPerceptionEngineDefinition(), {
    replace: options.replace === true
  });
}

/* ===============================
   Status, Health and Validation
=============================== */

function getPerceptionEngineHealth() {
  const registered = typeof getEngine === "function"
    ? Boolean(getEngine(PERCEPTION_ENGINE_ID))
    : false;
  const penalty = Math.min(50, perceptionEngineMetrics.errors * 5);
  const health = Math.max(0, (registered ? 100 : 75) - penalty);

  return {
    id: `${PERCEPTION_ENGINE_ID}-HEALTH`,
    health,
    status: health >= 90 ? "Healthy" : health >= 70 ? "Degraded" : "Unhealthy",
    ready: health >= 90 && registered,
    registered,
    errors: perceptionEngineMetrics.errors,
    updatedAt: createPerceptionTimestamp()
  };
}

function getPerceptionEngineStatus() {
  const health = getPerceptionEngineHealth();

  return {
    id: PERCEPTION_ENGINE_ID,
    title: PERCEPTION_ENGINE_TITLE,
    version: PERCEPTION_ENGINE_VERSION,
    status: health.ready ? "Ready" : "Degraded",
    ready: health.ready,
    health: health.health,
    progress: 100,
    registered: health.registered,
    capabilities: {
      normalization: true,
      languageDetection: true,
      inputTypeDetection: true,
      intentDetection: true,
      entityExtraction: true,
      keywordExtraction: true,
      searchHints: true,
      contextIntegration: typeof updateContext === "function"
    },
    metrics: clonePerceptionValue(perceptionEngineMetrics),
    updatedAt: createPerceptionTimestamp()
  };
}

function validatePerceptionEngine() {
  const checks = {};
  const failures = [];
  const remember = (name, value) => {
    checks[name] = Boolean(value);
    if (!checks[name]) failures.push(name);
  };

  const originalMetrics = clonePerceptionValue(perceptionEngineMetrics);
  let testContextId = null;

  try {
    remember("engineCore", typeof registerEngine === "function");
    remember("normalization", normalizePerceptionInput("  Hello   world ").text === "Hello world");
    remember("inputValidation", validatePerceptionInput("test").valid === true);
    remember("language", detectPerceptionLanguage("日本語 text") === "mixed-ja-en");
    remember("inputType", detectPerceptionInputType("What is this?") === "question");
    remember("intent", detectPerceptionIntent("Search the repository").primary === "search");

    const entities = extractPerceptionEntities("ENGINE-030 16_perception_engine.js v1.0.0");
    remember("entities", entities.some(item => item.type === "knowledge-object"));

    const keywords = extractPerceptionKeywords("search search context engine");
    remember("keywords", keywords[0] && keywords[0].keyword === "search");

    const classification = classifyPerceptionInput("Search ENGINE-030 documentation");
    remember("classification", classification.intent.primary === "search");

    const hint = buildPerceptionSearchHint(classification);
    remember("searchHint", typeof hint.query === "string" && hint.query.length > 0);

    const contextView = buildPerceptionContext(
      normalizePerceptionInput("test"),
      classification,
      { id: "CTX-TEST", traceId: "TRACE-TEST", provenance: [] }
    );
    remember("contextBuild", contextView.contextId === "CTX-TEST");

    if (typeof createContext === "function") {
      const managed = createContext({
        source: "ENGINE-030-validation",
        metadata: { test: true }
      });
      testContextId = managed && managed.id;
      const merged = mergePerceptionContext(testContextId, contextView);
      remember("contextIntegration", merged.updated === true);
    } else {
      remember("contextIntegration", true);
    }

    const execution = executePerception(
      { text: "Search ENGINE-030 documentation", provenance: ["validation"] },
      null,
      { updateContext: false }
    );
    remember("execution", execution.ok === true);
    remember("serialization", typeof JSON.stringify(execution) === "string");

    const registration = registerPerceptionEngine({ replace: true });
    remember("registration", Boolean(registration));
    remember(
      "platformLookup",
      typeof getEngine === "function" && Boolean(getEngine(PERCEPTION_ENGINE_ID))
    );

    remember(
      "status",
      getPerceptionEngineStatus().status === "Ready"
    );
    remember(
      "health",
      getPerceptionEngineHealth().health === 100
    );
  } catch (error) {
    failures.push(`exception:${error.message}`);
  } finally {
    if (testContextId && typeof destroyContext === "function") {
      destroyContext(testContextId, { recursive: true });
    } else if (testContextId && typeof removeContext === "function") {
      removeContext(testContextId);
    }

    Object.keys(originalMetrics || {}).forEach(key => {
      perceptionEngineMetrics[key] = originalMetrics[key];
    });
  }

  const total = 18;
  const passed = Object.values(checks).filter(Boolean).length;
  const valid = failures.length === 0 && passed === total;

  return {
    id: PERCEPTION_ENGINE_ID,
    title: PERCEPTION_ENGINE_TITLE,
    version: PERCEPTION_ENGINE_VERSION,
    valid,
    passed,
    total,
    failed: failures,
    checks,
    status: getPerceptionEngineStatus()
  };
}

registerPerceptionEngine();