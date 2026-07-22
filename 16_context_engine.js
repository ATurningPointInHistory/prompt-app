/* ===============================
   FILE: 16_context_engine.js
   Context Engine
   ENGINE-020
   Version: 1.0.0
=============================== */

var CONTEXT_ENGINE_ID = "ENGINE-020";
var CONTEXT_ENGINE_TITLE = "Context Engine";
var CONTEXT_ENGINE_VERSION = "1.0.0";
var CONTEXT_ENGINE_STORE_LIMIT = 500;

var contextEngineStore =
  typeof contextEngineStore !== "undefined" &&
  contextEngineStore instanceof Map
    ? contextEngineStore
    : new Map();

var contextEngineMetrics =
  typeof contextEngineMetrics !== "undefined" &&
  contextEngineMetrics &&
  typeof contextEngineMetrics === "object"
    ? contextEngineMetrics
    : {
        created: 0,
        updated: 0,
        removed: 0,
        cloned: 0,
        childrenCreated: 0,
        executions: 0,
        errors: 0,
        lastCreatedAt: null,
        lastUpdatedAt: null,
        lastExecutionAt: null
      };

/* ===============================
   Utilities
=============================== */

function createContextEngineTimestamp() {
  return new Date().toISOString();
}

function createContextEngineId(prefix = "CTX") {
  return [
    String(prefix || "CTX").toUpperCase(),
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8)
  ].join("-");
}

function cloneContextValue(value) {
  if (value == null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function normalizeContextObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? cloneContextValue(value)
    : {};
}

function normalizeContextList(value) {
  const list = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [value];

  return list
    .map(cloneContextValue)
    .filter(item => item != null);
}

function createContextEngineError(code, message, details = null) {
  return {
    code: String(code || "CONTEXT_ERROR"),
    message: String(message || "Unknown context error"),
    details: cloneContextValue(details)
  };
}

function mergeContextObjects(base, patch) {
  const output = normalizeContextObject(base);
  const source = normalizeContextObject(patch);

  Object.keys(source).forEach(key => {
    const current = output[key];
    const incoming = source[key];

    if (
      current && typeof current === "object" && !Array.isArray(current) &&
      incoming && typeof incoming === "object" && !Array.isArray(incoming)
    ) {
      output[key] = mergeContextObjects(current, incoming);
    } else {
      output[key] = cloneContextValue(incoming);
    }
  });

  return output;
}

function normalizeContextRecord(input = {}, options = {}) {
  const source = input && typeof input === "object" ? input : {};
  const now = createContextEngineTimestamp();
  const id = String(source.id || options.id || createContextEngineId()).trim();
  const parentContextId = source.parentContextId == null
    ? options.parentContextId == null
      ? null
      : String(options.parentContextId)
    : String(source.parentContextId);

  return {
    id,
    traceId: String(
      source.traceId ||
      options.traceId ||
      createContextEngineId("TRACE")
    ),
    parentContextId,
    rootContextId: String(
      source.rootContextId ||
      options.rootContextId ||
      parentContextId ||
      id
    ),
    depth: Math.max(0, Number(source.depth ?? options.depth) || 0),
    source: String(source.source || options.source || "unknown"),
    status: String(source.status || options.status || "active"),
    scope: normalizeContextObject(source.scope || options.scope),
    policies: normalizeContextObject(
      source.policies || source.policy || options.policies || options.policy
    ),
    metadata: normalizeContextObject(source.metadata || options.metadata),
    state: normalizeContextObject(source.state || options.state),
    provenance: normalizeContextList(
      source.provenance || options.provenance
    ),
    warnings: normalizeContextList(source.warnings || options.warnings),
    errors: normalizeContextList(source.errors || options.errors),
    children: Array.from(
      new Set(
        normalizeContextList(source.children || options.children)
          .map(value => String(value || "").trim())
          .filter(Boolean)
      )
    ),
    createdAt: String(source.createdAt || options.createdAt || now),
    updatedAt: String(source.updatedAt || options.updatedAt || now),
    expiresAt: source.expiresAt || options.expiresAt || null
  };
}

function validateContextRecord(context) {
  const errors = [];
  const warnings = [];

  if (!context || typeof context !== "object") {
    errors.push("context must be an object");
  }

  if (context && !String(context.id || "").trim()) {
    errors.push("context id is required");
  }

  if (context && !String(context.traceId || "").trim()) {
    errors.push("traceId is required");
  }

  if (context && context.parentContextId === context.id) {
    errors.push("context cannot be its own parent");
  }

  if (context && !Array.isArray(context.provenance)) {
    errors.push("provenance must be an array");
  }

  if (context && context.expiresAt) {
    const expiresAt = Date.parse(context.expiresAt);
    if (Number.isNaN(expiresAt)) {
      warnings.push("expiresAt is not a valid date");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function enforceContextStoreLimit() {
  const overflow = contextEngineStore.size - CONTEXT_ENGINE_STORE_LIMIT;

  if (overflow <= 0) {
    return;
  }

  const removable = Array.from(contextEngineStore.values())
    .filter(context => context.status !== "active")
    .sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));

  removable.slice(0, overflow).forEach(context => {
    contextEngineStore.delete(context.id);
  });
}

/* ===============================
   Lifecycle
=============================== */

function createContext(input = {}, options = {}) {
  const context = normalizeContextRecord(input, options);
  const validation = validateContextRecord(context);
  const replace = options.replace === true;

  if (!validation.valid) {
    contextEngineMetrics.errors += 1;
    return {
      created: false,
      id: context.id,
      context: null,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  if (contextEngineStore.has(context.id) && !replace) {
    return {
      created: false,
      id: context.id,
      context: null,
      errors: ["context already exists"],
      warnings: validation.warnings
    };
  }

  contextEngineStore.set(context.id, context);
  contextEngineMetrics.created += 1;
  contextEngineMetrics.lastCreatedAt = context.createdAt;
  enforceContextStoreLimit();

  return {
    created: true,
    replaced: replace,
    id: context.id,
    context: cloneContextValue(context),
    errors: [],
    warnings: validation.warnings
  };
}

function getContext(contextId) {
  const id = String(contextId || "").trim();
  const context = contextEngineStore.get(id);
  return context ? cloneContextValue(context) : null;
}

function listContexts(options = {}) {
  const status = String(options.status || "").trim();
  const parentContextId = String(options.parentContextId || "").trim();
  const rootContextId = String(options.rootContextId || "").trim();
  const source = String(options.source || "").trim();
  const limit = Math.max(1, Number(options.limit) || 100);

  return Array.from(contextEngineStore.values())
    .filter(context => !status || context.status === status)
    .filter(context => !parentContextId || context.parentContextId === parentContextId)
    .filter(context => !rootContextId || context.rootContextId === rootContextId)
    .filter(context => !source || context.source === source)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit)
    .map(cloneContextValue);
}

function updateContext(contextId, patch = {}, options = {}) {
  const id = String(contextId || "").trim();
  const current = contextEngineStore.get(id);

  if (!current) {
    return {
      updated: false,
      id,
      context: null,
      errors: ["context not found"]
    };
  }

  const source = patch && typeof patch === "object" ? patch : {};
  const next = normalizeContextRecord({
    ...current,
    ...cloneContextValue(source),
    id: current.id,
    traceId: source.traceId || current.traceId,
    parentContextId:
      source.parentContextId === undefined
        ? current.parentContextId
        : source.parentContextId,
    rootContextId: source.rootContextId || current.rootContextId,
    scope: options.merge === false
      ? normalizeContextObject(source.scope ?? current.scope)
      : mergeContextObjects(current.scope, source.scope),
    policies: options.merge === false
      ? normalizeContextObject(source.policies ?? source.policy ?? current.policies)
      : mergeContextObjects(current.policies, source.policies || source.policy),
    metadata: options.merge === false
      ? normalizeContextObject(source.metadata ?? current.metadata)
      : mergeContextObjects(current.metadata, source.metadata),
    state: options.merge === false
      ? normalizeContextObject(source.state ?? current.state)
      : mergeContextObjects(current.state, source.state),
    provenance: source.provenance === undefined
      ? current.provenance
      : normalizeContextList(source.provenance),
    warnings: source.warnings === undefined
      ? current.warnings
      : normalizeContextList(source.warnings),
    errors: source.errors === undefined
      ? current.errors
      : normalizeContextList(source.errors),
    children: source.children === undefined
      ? current.children
      : normalizeContextList(source.children),
    createdAt: current.createdAt,
    updatedAt: createContextEngineTimestamp()
  });

  const validation = validateContextRecord(next);

  if (!validation.valid) {
    contextEngineMetrics.errors += 1;
    return {
      updated: false,
      id,
      context: null,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  contextEngineStore.set(id, next);
  contextEngineMetrics.updated += 1;
  contextEngineMetrics.lastUpdatedAt = next.updatedAt;

  return {
    updated: true,
    id,
    context: cloneContextValue(next),
    errors: [],
    warnings: validation.warnings
  };
}

function removeContext(contextId, options = {}) {
  const id = String(contextId || "").trim();
  const current = contextEngineStore.get(id);

  if (!current) {
    return {
      removed: false,
      id,
      errors: ["context not found"]
    };
  }

  const childIds = Array.from(contextEngineStore.values())
    .filter(context => context.parentContextId === id)
    .map(context => context.id);

  if (childIds.length > 0 && options.cascade !== true) {
    return {
      removed: false,
      id,
      children: childIds,
      errors: ["context has child contexts"]
    };
  }

  if (options.cascade === true) {
    childIds.forEach(childId => removeContext(childId, { cascade: true }));
  }

  if (current.parentContextId) {
    const parent = contextEngineStore.get(current.parentContextId);
    if (parent) {
      parent.children = parent.children.filter(childId => childId !== id);
      parent.updatedAt = createContextEngineTimestamp();
      contextEngineStore.set(parent.id, parent);
    }
  }

  contextEngineStore.delete(id);
  contextEngineMetrics.removed += 1;

  return {
    removed: true,
    id,
    cascade: options.cascade === true,
    errors: []
  };
}

function destroyContext(contextId, options = {}) {
  return removeContext(contextId, options);
}

function clearContexts(options = {}) {
  const preserveActive = options.preserveActive === true;
  const ids = Array.from(contextEngineStore.values())
    .filter(context => !preserveActive || context.status !== "active")
    .map(context => context.id);

  ids.forEach(id => contextEngineStore.delete(id));

  return {
    cleared: true,
    removed: ids.length,
    remaining: contextEngineStore.size
  };
}

/* ===============================
   Hierarchy and Clone
=============================== */

function createChildContext(parentContextId, input = {}, options = {}) {
  const parent = contextEngineStore.get(String(parentContextId || "").trim());

  if (!parent) {
    return {
      created: false,
      context: null,
      errors: ["parent context not found"]
    };
  }

  const inherit = options.inherit !== false;
  const result = createContext({
    ...cloneContextValue(input),
    parentContextId: parent.id,
    rootContextId: parent.rootContextId || parent.id,
    depth: parent.depth + 1,
    traceId: input.traceId || parent.traceId,
    source: input.source || parent.source,
    scope: inherit
      ? mergeContextObjects(parent.scope, input.scope)
      : normalizeContextObject(input.scope),
    policies: inherit
      ? mergeContextObjects(parent.policies, input.policies || input.policy)
      : normalizeContextObject(input.policies || input.policy),
    metadata: inherit
      ? mergeContextObjects(parent.metadata, input.metadata)
      : normalizeContextObject(input.metadata),
    state: inherit
      ? mergeContextObjects(parent.state, input.state)
      : normalizeContextObject(input.state),
    provenance: inherit
      ? [...parent.provenance, ...normalizeContextList(input.provenance)]
      : normalizeContextList(input.provenance)
  }, options);

  if (result.created) {
    parent.children = Array.from(new Set([...parent.children, result.id]));
    parent.updatedAt = createContextEngineTimestamp();
    contextEngineStore.set(parent.id, parent);
    contextEngineMetrics.childrenCreated += 1;
  }

  return result;
}

function cloneContext(contextId, options = {}) {
  const current = contextEngineStore.get(String(contextId || "").trim());

  if (!current) {
    return {
      cloned: false,
      context: null,
      errors: ["context not found"]
    };
  }

  const copy = cloneContextValue(current);
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  copy.children = [];
  copy.parentContextId = options.parentContextId ?? current.parentContextId;
  copy.status = options.status || "active";

  const result = createContext(copy, {
    id: options.id,
    replace: false
  });

  if (result.created) {
    contextEngineMetrics.cloned += 1;
  }

  return {
    cloned: result.created,
    id: result.id,
    context: result.context,
    errors: result.errors,
    warnings: result.warnings
  };
}

/* ===============================
   Context Data APIs
=============================== */

function setContextMetadata(contextId, metadata = {}) {
  return updateContext(contextId, { metadata }, { merge: false });
}

function mergeContextMetadata(contextId, metadata = {}) {
  return updateContext(contextId, { metadata }, { merge: true });
}

function getContextMetadata(contextId) {
  const context = getContext(contextId);
  return context ? cloneContextValue(context.metadata) : null;
}

function setContextScope(contextId, scope = {}) {
  return updateContext(contextId, { scope }, { merge: false });
}

function mergeContextScope(contextId, scope = {}) {
  return updateContext(contextId, { scope }, { merge: true });
}

function getContextScope(contextId) {
  const context = getContext(contextId);
  return context ? cloneContextValue(context.scope) : null;
}

function setContextPolicy(contextId, policies = {}) {
  return updateContext(contextId, { policies }, { merge: false });
}

function mergeContextPolicy(contextId, policies = {}) {
  return updateContext(contextId, { policies }, { merge: true });
}

function getContextPolicy(contextId) {
  const context = getContext(contextId);
  return context ? cloneContextValue(context.policies) : null;
}

function addContextProvenance(contextId, entry) {
  const context = contextEngineStore.get(String(contextId || "").trim());

  if (!context) {
    return {
      updated: false,
      errors: ["context not found"]
    };
  }

  const additions = normalizeContextList(entry);
  const provenance = [...context.provenance];

  additions.forEach(item => {
    const signature = JSON.stringify(item);
    if (!provenance.some(existing => JSON.stringify(existing) === signature)) {
      provenance.push(item);
    }
  });

  return updateContext(context.id, { provenance });
}

function getContextProvenance(contextId) {
  const context = getContext(contextId);
  return context ? cloneContextValue(context.provenance) : null;
}

function attachContextTrace(contextId, traceId) {
  return updateContext(contextId, {
    traceId: String(traceId || createContextEngineId("TRACE"))
  });
}

function detachContextTrace(contextId) {
  return updateContext(contextId, {
    traceId: createContextEngineId("TRACE")
  });
}

/* ===============================
   Engine Execution
=============================== */

function validateContextEngineInput(input) {
  const action = String(input && input.action || "create").trim();
  const supported = [
    "create",
    "get",
    "update",
    "remove",
    "child",
    "clone",
    "list"
  ];

  return {
    valid: supported.includes(action),
    errors: supported.includes(action)
      ? []
      : [`unsupported action: ${action}`]
  };
}

function executeContextEngine(input = {}, engineContext = null) {
  const request = input && typeof input === "object" ? input : {};
  const action = String(request.action || "create").trim();
  const startedAtMs = Date.now();
  let result;

  switch (action) {
    case "get":
      result = {
        found: !!getContext(request.contextId),
        context: getContext(request.contextId)
      };
      break;
    case "update":
      result = updateContext(request.contextId, request.patch || {}, request.options || {});
      break;
    case "remove":
      result = removeContext(request.contextId, request.options || {});
      break;
    case "child":
      result = createChildContext(
        request.parentContextId,
        request.context || request.input || {},
        request.options || {}
      );
      break;
    case "clone":
      result = cloneContext(request.contextId, request.options || {});
      break;
    case "list":
      result = {
        contexts: listContexts(request.options || {}),
        total: contextEngineStore.size
      };
      break;
    case "create":
    default:
      result = createContext(
        request.context || request.input || {},
        request.options || {}
      );
      break;
  }

  contextEngineMetrics.executions += 1;
  contextEngineMetrics.lastExecutionAt = createContextEngineTimestamp();

  return {
    ok: !result.errors || result.errors.length === 0,
    engineId: CONTEXT_ENGINE_ID,
    version: CONTEXT_ENGINE_VERSION,
    action,
    result: cloneContextValue(result),
    engineContext: cloneContextValue(engineContext),
    completedAt: createContextEngineTimestamp(),
    durationMs: Date.now() - startedAtMs
  };
}

function validateContextEngineOutput(output) {
  return {
    valid:
      !!output &&
      typeof output === "object" &&
      output.engineId === CONTEXT_ENGINE_ID &&
      typeof output.action === "string",
    errors: []
  };
}

/* ===============================
   Status and Registration
=============================== */

function getContextEngineStatus() {
  const registered =
    typeof getEngine === "function" &&
    !!getEngine(CONTEXT_ENGINE_ID);
  const active = Array.from(contextEngineStore.values())
    .filter(context => context.status === "active").length;
  const expired = Array.from(contextEngineStore.values())
    .filter(context => context.expiresAt && Date.parse(context.expiresAt) <= Date.now()).length;
  const ready =
    registered &&
    contextEngineStore instanceof Map &&
    typeof createContext === "function" &&
    typeof createChildContext === "function";

  return {
    id: CONTEXT_ENGINE_ID,
    title: CONTEXT_ENGINE_TITLE,
    version: CONTEXT_ENGINE_VERSION,
    status: ready ? "Ready" : "Not Registered",
    ready,
    health: ready ? 100 : 0,
    progress: ready ? 100 : 90,
    registered,
    contexts: {
      total: contextEngineStore.size,
      active,
      expired,
      limit: CONTEXT_ENGINE_STORE_LIMIT
    },
    metrics: cloneContextValue(contextEngineMetrics),
    updatedAt: createContextEngineTimestamp()
  };
}

function getContextEngineHealth() {
  const status = getContextEngineStatus();

  return {
    id: status.id,
    health: status.health,
    ready: status.ready,
    status: status.status,
    contexts: status.contexts.total,
    errors: status.metrics.errors
  };
}

function createContextEngineDefinition() {
  return {
    id: CONTEXT_ENGINE_ID,
    title: CONTEXT_ENGINE_TITLE,
    version: CONTEXT_ENGINE_VERSION,
    status: "Ready",
    enabled: true,
    description:
      "Creates, inherits, updates, validates and manages execution context without owning source information.",
    dependencies: [],
    inputs: [
      "Context action",
      "Context payload",
      "Parent context",
      "Metadata, scope and policies"
    ],
    outputs: [
      "Managed context",
      "Context hierarchy",
      "Context status",
      "Context diagnostics"
    ],
    execute: executeContextEngine,
    validateInput: validateContextEngineInput,
    validateOutput: validateContextEngineOutput,
    getStatus: getContextEngineStatus,
    metadata: {
      knowledgeObject: "113",
      series: "Engine",
      category: "Engine Platform",
      authority: "Engine Platform Architecture",
      declaredDependsOn: [
        "ENGINE-001",
        "INFORMATION-001",
        "INFORMATION-020"
      ],
      sourceOfTruth: false,
      circularReferenceFree: true,
      jsonSerializable: true
    }
  };
}

function registerContextEngine(options = {}) {
  if (typeof registerEngine !== "function") {
    return {
      registered: false,
      replaced: false,
      id: CONTEXT_ENGINE_ID,
      errors: ["ENGINE-001 registerEngine is unavailable"]
    };
  }

  return registerEngine(
    createContextEngineDefinition(),
    { replace: options.replace !== false }
  );
}

/* ===============================
   Validation
=============================== */

async function validateContextEngine() {
  const checks = {
    engineCore: typeof registerEngine === "function",
    contextStore: contextEngineStore instanceof Map,
    create: false,
    lookup: false,
    update: false,
    metadata: false,
    scope: false,
    policy: false,
    provenance: false,
    child: false,
    inheritance: false,
    clone: false,
    serialization: false,
    execution: false,
    registration: false,
    platformLookup: false
  };
  const failed = [];
  const testIds = [
    "ENGINE-020-TEST-PARENT",
    "ENGINE-020-TEST-CHILD",
    "ENGINE-020-TEST-CLONE"
  ];
  const backup = testIds
    .map(id => contextEngineStore.get(id))
    .filter(Boolean)
    .map(cloneContextValue);

  try {
    testIds.forEach(id => contextEngineStore.delete(id));

    const parentResult = createContext({
      id: testIds[0],
      source: "validation",
      metadata: { project: "AI Prompt OS" },
      scope: { repository: true },
      policies: { readOnly: true },
      provenance: ["validation"]
    });
    checks.create = parentResult.created === true;
    checks.lookup = !!getContext(testIds[0]);

    const updateResult = updateContext(testIds[0], {
      state: { step: 1 }
    });
    checks.update = updateResult.updated === true &&
      updateResult.context.state.step === 1;

    mergeContextMetadata(testIds[0], { phase: "implementation" });
    checks.metadata = getContextMetadata(testIds[0]).phase === "implementation";

    mergeContextScope(testIds[0], { engine: true });
    checks.scope = getContextScope(testIds[0]).engine === true;

    mergeContextPolicy(testIds[0], { traceRequired: true });
    checks.policy = getContextPolicy(testIds[0]).traceRequired === true;

    addContextProvenance(testIds[0], "ENGINE-020");
    checks.provenance = getContextProvenance(testIds[0]).includes("ENGINE-020");

    const childResult = createChildContext(testIds[0], {
      id: testIds[1],
      metadata: { child: true }
    });
    checks.child = childResult.created === true &&
      childResult.context.parentContextId === testIds[0];
    checks.inheritance = childResult.context.scope.repository === true &&
      childResult.context.policies.readOnly === true &&
      childResult.context.metadata.project === "AI Prompt OS";

    const cloneResult = cloneContext(testIds[1], { id: testIds[2] });
    checks.clone = cloneResult.cloned === true &&
      cloneResult.context.id === testIds[2];

    checks.serialization = (() => {
      try {
        JSON.stringify(getContext(testIds[1]));
        return true;
      } catch (error) {
        return false;
      }
    })();

    const executionResult = executeContextEngine({
      action: "get",
      contextId: testIds[0]
    });
    checks.execution = executionResult.ok === true &&
      executionResult.result.found === true;

    const registration = registerContextEngine({ replace: true });
    checks.registration = registration.registered === true;
    checks.platformLookup =
      typeof getEngine === "function" &&
      !!getEngine(CONTEXT_ENGINE_ID);
  } catch (error) {
    contextEngineMetrics.errors += 1;
    failed.push(error.message);
  } finally {
    testIds.forEach(id => contextEngineStore.delete(id));
    backup.forEach(context => contextEngineStore.set(context.id, context));
  }

  Object.keys(checks).forEach(key => {
    if (!checks[key]) {
      failed.push(key);
    }
  });

  return {
    id: CONTEXT_ENGINE_ID,
    title: CONTEXT_ENGINE_TITLE,
    version: CONTEXT_ENGINE_VERSION,
    valid: failed.length === 0,
    passed: Object.values(checks).filter(Boolean).length,
    total: Object.keys(checks).length,
    failed: Array.from(new Set(failed)),
    checks,
    contexts: contextEngineStore.size,
    status: getContextEngineStatus()
  };
}

var contextEngineRegistrationResult = registerContextEngine({
  replace: true
});