/* ===============================
   FILE: 15_engine_core.js
   Engine Platform Core
   ENGINE-001
   Version: 1.0.0
=============================== */

var ENGINE_PLATFORM_VERSION = "1.0.0";
var ENGINE_PLATFORM_ID = "ENGINE-001";
var ENGINE_PLATFORM_TRACE_LIMIT = 200;

var enginePlatformRegistry =
  typeof enginePlatformRegistry !== "undefined" &&
  enginePlatformRegistry instanceof Map
    ? enginePlatformRegistry
    : new Map();

var enginePlatformTraceRecords =
  typeof enginePlatformTraceRecords !== "undefined" &&
  Array.isArray(enginePlatformTraceRecords)
    ? enginePlatformTraceRecords
    : [];

/* ===============================
   Utilities
=============================== */

function createEngineTimestamp() {
  return new Date().toISOString();
}

function createEngineTraceId(prefix = "ENG") {
  return [
    String(prefix || "ENG").toUpperCase(),
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8)
  ].join("-");
}

function normalizeEngineStringList(value) {
  const source = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [value];

  return Array.from(
    new Set(
      source
        .map(item => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function cloneEngineValue(value) {
  if (value == null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function createEngineError(
  code,
  message,
  details = null
) {
  return {
    code: String(code || "ENGINE_ERROR"),
    message: String(message || "Unknown engine error"),
    details: cloneEngineValue(details)
  };
}

/* ===============================
   Engine Definition
=============================== */

function normalizeEngineDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    return null;
  }

  const id = String(definition.id || "").trim();
  const title = String(
    definition.title || definition.name || ""
  ).trim();
  const version = String(
    definition.version || "1.0.0"
  ).trim();

  return {
    id,
    title,
    version,
    status: String(definition.status || "Ready").trim(),
    enabled: definition.enabled !== false,
    description: String(definition.description || "").trim(),
    dependencies: normalizeEngineStringList(
      definition.dependencies || definition.dependsOn
    ),
    inputs: normalizeEngineStringList(definition.inputs),
    outputs: normalizeEngineStringList(definition.outputs),
    execute:
      typeof definition.execute === "function"
        ? definition.execute
        : null,
    validateInput:
      typeof definition.validateInput === "function"
        ? definition.validateInput
        : null,
    validateOutput:
      typeof definition.validateOutput === "function"
        ? definition.validateOutput
        : null,
    getStatus:
      typeof definition.getStatus === "function"
        ? definition.getStatus
        : null,
    metadata:
      definition.metadata &&
      typeof definition.metadata === "object"
        ? cloneEngineValue(definition.metadata)
        : {},
    registeredAt:
      definition.registeredAt || createEngineTimestamp(),
    updatedAt:
      definition.updatedAt || createEngineTimestamp()
  };
}

function validateEngineDefinition(definition) {
  const engine = normalizeEngineDefinition(definition);
  const errors = [];
  const warnings = [];

  if (!engine) {
    errors.push("definition must be an object");
  }

  if (engine && !engine.id) {
    errors.push("id is required");
  }

  if (engine && !/^[A-Z][A-Z0-9_-]*$/.test(engine.id)) {
    errors.push("id must use uppercase letters, numbers, underscore or hyphen");
  }

  if (engine && !engine.title) {
    errors.push("title is required");
  }

  if (engine && !engine.version) {
    errors.push("version is required");
  }

  if (engine && typeof engine.execute !== "function") {
    errors.push("execute function is required");
  }

  if (engine && engine.inputs.length === 0) {
    warnings.push("input contract is empty");
  }

  if (engine && engine.outputs.length === 0) {
    warnings.push("output contract is empty");
  }

  return {
    id: engine ? engine.id : "",
    valid: errors.length === 0,
    errors,
    warnings,
    engine
  };
}

/* ===============================
   Registry
=============================== */

function registerEngine(definition, options = {}) {
  const validation = validateEngineDefinition(definition);

  if (!validation.valid) {
    return {
      registered: false,
      replaced: false,
      id: validation.id,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  const engine = validation.engine;
  const exists = enginePlatformRegistry.has(engine.id);
  const replace = options.replace === true;

  if (exists && !replace) {
    return {
      registered: false,
      replaced: false,
      id: engine.id,
      errors: ["engine is already registered"],
      warnings: validation.warnings
    };
  }

  const previous = exists
    ? enginePlatformRegistry.get(engine.id)
    : null;

  engine.registeredAt = previous
    ? previous.registeredAt
    : engine.registeredAt;
  engine.updatedAt = createEngineTimestamp();

  enginePlatformRegistry.set(engine.id, engine);

  return {
    registered: true,
    replaced: exists,
    id: engine.id,
    version: engine.version,
    warnings: validation.warnings
  };
}

function unregisterEngine(engineId) {
  const id = String(engineId || "").trim();
  const existed = enginePlatformRegistry.has(id);

  if (existed) {
    enginePlatformRegistry.delete(id);
  }

  return {
    id,
    unregistered: existed
  };
}

function getEngine(engineId) {
  const id = String(engineId || "").trim();
  return enginePlatformRegistry.get(id) || null;
}

function listEngines(options = {}) {
  const includeDisabled = options.includeDisabled === true;

  return Array.from(enginePlatformRegistry.values())
    .filter(engine => includeDisabled || engine.enabled)
    .map(engine => ({
      id: engine.id,
      title: engine.title,
      version: engine.version,
      status: engine.status,
      enabled: engine.enabled,
      dependencies: [...engine.dependencies],
      inputs: [...engine.inputs],
      outputs: [...engine.outputs],
      registeredAt: engine.registeredAt,
      updatedAt: engine.updatedAt
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/* ===============================
   Context and Trace
=============================== */

function createEngineContext(options = {}) {
  const parent =
    options.parentContext &&
    typeof options.parentContext === "object"
      ? options.parentContext
      : null;

  return {
    id: String(options.id || createEngineTraceId("CTX")),
    traceId: String(
      options.traceId ||
      (parent && parent.traceId) ||
      createEngineTraceId("TRACE")
    ),
    parentContextId:
      parent && parent.id
        ? String(parent.id)
        : null,
    createdAt: createEngineTimestamp(),
    source: String(options.source || "unknown"),
    scope: cloneEngineValue(options.scope || {}),
    policies: cloneEngineValue(options.policies || {}),
    metadata: cloneEngineValue(options.metadata || {}),
    provenance: normalizeEngineStringList(
      options.provenance || (parent && parent.provenance)
    ),
    warnings: [],
    errors: []
  };
}

function addEngineTraceRecord(record) {
  const normalized = {
    traceId: String(record.traceId || createEngineTraceId("TRACE")),
    contextId: String(record.contextId || ""),
    engineId: String(record.engineId || ""),
    status: String(record.status || "unknown"),
    startedAt: record.startedAt || createEngineTimestamp(),
    completedAt: record.completedAt || null,
    durationMs:
      Number.isFinite(record.durationMs)
        ? record.durationMs
        : null,
    dependencies: normalizeEngineStringList(record.dependencies),
    provenance: normalizeEngineStringList(record.provenance),
    warnings: cloneEngineValue(record.warnings || []),
    errors: cloneEngineValue(record.errors || [])
  };

  enginePlatformTraceRecords.push(normalized);

  if (
    enginePlatformTraceRecords.length >
    ENGINE_PLATFORM_TRACE_LIMIT
  ) {
    enginePlatformTraceRecords.splice(
      0,
      enginePlatformTraceRecords.length -
      ENGINE_PLATFORM_TRACE_LIMIT
    );
  }

  return normalized;
}

function getEngineTraceRecords(options = {}) {
  const engineId = String(options.engineId || "").trim();
  const traceId = String(options.traceId || "").trim();
  const limit = Math.max(1, Number(options.limit) || 50);

  return enginePlatformTraceRecords
    .filter(record => !engineId || record.engineId === engineId)
    .filter(record => !traceId || record.traceId === traceId)
    .slice(-limit)
    .map(cloneEngineValue);
}

/* ===============================
   Dependency Validation
=============================== */

function validateEngineDependencies(engine) {
  const missing = engine.dependencies.filter(
    dependencyId => !enginePlatformRegistry.has(dependencyId)
  );

  const disabled = engine.dependencies.filter(dependencyId => {
    const dependency = enginePlatformRegistry.get(dependencyId);
    return dependency && dependency.enabled === false;
  });

  return {
    valid: missing.length === 0 && disabled.length === 0,
    missing,
    disabled
  };
}

/* ===============================
   Execution
=============================== */

async function executeEngine(
  engineId,
  input,
  options = {}
) {
  const startedAtMs = Date.now();
  const startedAt = createEngineTimestamp();
  const engine = getEngine(engineId);
  const context = options.context || createEngineContext(options);
  const errors = [];
  const warnings = [];

  if (!engine) {
    errors.push(
      createEngineError(
        "ENGINE_NOT_FOUND",
        `Engine not found: ${engineId}`
      )
    );
  } else if (!engine.enabled) {
    errors.push(
      createEngineError(
        "ENGINE_DISABLED",
        `Engine is disabled: ${engine.id}`
      )
    );
  }

  const dependencyValidation = engine
    ? validateEngineDependencies(engine)
    : { valid: false, missing: [], disabled: [] };

  if (engine && !dependencyValidation.valid) {
    errors.push(
      createEngineError(
        "ENGINE_DEPENDENCY_ERROR",
        "Declared engine dependencies are unavailable",
        dependencyValidation
      )
    );
  }

  if (
    engine &&
    errors.length === 0 &&
    typeof engine.validateInput === "function"
  ) {
    try {
      const inputValidation = await engine.validateInput(
        input,
        context
      );

      if (inputValidation === false) {
        errors.push(
          createEngineError(
            "ENGINE_INPUT_INVALID",
            "Input validation failed"
          )
        );
      } else if (
        inputValidation &&
        inputValidation.valid === false
      ) {
        errors.push(
          createEngineError(
            "ENGINE_INPUT_INVALID",
            "Input validation failed",
            inputValidation
          )
        );
      }
    } catch (error) {
      errors.push(
        createEngineError(
          "ENGINE_INPUT_VALIDATION_ERROR",
          error.message,
          { stack: error.stack }
        )
      );
    }
  }

  let output = null;

  if (engine && errors.length === 0) {
    try {
      output = await engine.execute(input, context, {
        getEngine,
        executeEngine
      });
    } catch (error) {
      errors.push(
        createEngineError(
          "ENGINE_EXECUTION_ERROR",
          error.message,
          { stack: error.stack }
        )
      );
    }
  }

  if (
    engine &&
    errors.length === 0 &&
    typeof engine.validateOutput === "function"
  ) {
    try {
      const outputValidation = await engine.validateOutput(
        output,
        context
      );

      if (outputValidation === false) {
        errors.push(
          createEngineError(
            "ENGINE_OUTPUT_INVALID",
            "Output validation failed"
          )
        );
      } else if (
        outputValidation &&
        outputValidation.valid === false
      ) {
        errors.push(
          createEngineError(
            "ENGINE_OUTPUT_INVALID",
            "Output validation failed",
            outputValidation
          )
        );
      }
    } catch (error) {
      errors.push(
        createEngineError(
          "ENGINE_OUTPUT_VALIDATION_ERROR",
          error.message,
          { stack: error.stack }
        )
      );
    }
  }

  const completedAt = createEngineTimestamp();
  const durationMs = Date.now() - startedAtMs;
  const ok = errors.length === 0;

  const trace = addEngineTraceRecord({
    traceId: context.traceId,
    contextId: context.id,
    engineId: engine ? engine.id : String(engineId || ""),
    status: ok ? "success" : "error",
    startedAt,
    completedAt,
    durationMs,
    dependencies: engine ? engine.dependencies : [],
    provenance: context.provenance,
    warnings,
    errors
  });

  return {
    ok,
    engineId: engine ? engine.id : String(engineId || ""),
    version: engine ? engine.version : null,
    output: ok ? output : null,
    context,
    trace,
    warnings,
    errors,
    startedAt,
    completedAt,
    durationMs
  };
}

/* ===============================
   Status and Health
=============================== */

function getEngineStatus(engineId) {
  const engine = getEngine(engineId);

  if (!engine) {
    return {
      id: String(engineId || ""),
      status: "Not Found",
      ready: false,
      health: 0
    };
  }

  const definitionValidation = validateEngineDefinition(engine);
  const dependencyValidation = validateEngineDependencies(engine);
  const customStatus = engine.getStatus
    ? engine.getStatus(engine)
    : null;
  const ready =
    engine.enabled &&
    definitionValidation.valid &&
    dependencyValidation.valid;

  return {
    id: engine.id,
    title: engine.title,
    version: engine.version,
    status:
      customStatus && customStatus.status
        ? customStatus.status
        : ready
          ? engine.status || "Ready"
          : "Error",
    ready,
    enabled: engine.enabled,
    health: ready ? 100 : 0,
    dependencies: dependencyValidation,
    validation: {
      valid: definitionValidation.valid,
      errors: definitionValidation.errors,
      warnings: definitionValidation.warnings
    },
    custom: cloneEngineValue(customStatus),
    updatedAt: engine.updatedAt
  };
}

function getEngineHealth(engineId) {
  const status = getEngineStatus(engineId);

  return {
    id: status.id,
    health: status.health,
    ready: status.ready,
    status: status.status,
    errors:
      status.validation && status.validation.errors
        ? status.validation.errors
        : []
  };
}

function getEngineVersion(engineId) {
  const engine = getEngine(engineId);
  return engine ? engine.version : null;
}

function getEnginePlatformStatus() {
  const engines = listEngines({ includeDisabled: true });
  const statuses = engines.map(engine => getEngineStatus(engine.id));
  const ready = statuses.filter(status => status.ready).length;
  const total = statuses.length;
  const health = total === 0
    ? 100
    : Math.round((ready / total) * 100);

  return {
    id: ENGINE_PLATFORM_ID,
    title: "Engine Platform",
    version: ENGINE_PLATFORM_VERSION,
    status: health === 100 ? "Ready" : "Warning",
    ready: health === 100,
    health,
    progress: health,
    engines: {
      total,
      ready,
      disabled: engines.filter(engine => !engine.enabled).length
    },
    traces: enginePlatformTraceRecords.length,
    updatedAt: createEngineTimestamp()
  };
}

/* ===============================
   Import / Export
=============================== */

function exportEngine(engineId) {
  const engine = getEngine(engineId);

  if (!engine) {
    return null;
  }

  return {
    id: engine.id,
    title: engine.title,
    version: engine.version,
    status: engine.status,
    enabled: engine.enabled,
    description: engine.description,
    dependencies: [...engine.dependencies],
    inputs: [...engine.inputs],
    outputs: [...engine.outputs],
    metadata: cloneEngineValue(engine.metadata),
    registeredAt: engine.registeredAt,
    updatedAt: engine.updatedAt
  };
}

function importEngine(record, implementation, options = {}) {
  if (!record || typeof record !== "object") {
    return {
      registered: false,
      replaced: false,
      id: "",
      errors: ["record must be an object"],
      warnings: []
    };
  }

  const definition = {
    ...record,
    ...(implementation || {})
  };

  return registerEngine(definition, options);
}

/* ===============================
   Validation
=============================== */

function validateEnginePlatform() {
  const testId = "ENGINE-CORE-SELF-TEST";
  const previous = getEngine(testId);

  const checks = {
    registry:
      enginePlatformRegistry instanceof Map,
    traceStore:
      Array.isArray(enginePlatformTraceRecords),
    definition:
      typeof normalizeEngineDefinition === "function" &&
      typeof validateEngineDefinition === "function",
    registration:
      typeof registerEngine === "function" &&
      typeof unregisterEngine === "function",
    lookup:
      typeof getEngine === "function" &&
      typeof listEngines === "function",
    context:
      typeof createEngineContext === "function",
    execution:
      typeof executeEngine === "function",
    observability:
      typeof getEngineTraceRecords === "function" &&
      typeof getEngineStatus === "function" &&
      typeof getEngineHealth === "function",
    portability:
      typeof exportEngine === "function" &&
      typeof importEngine === "function"
  };

  const selfTestDefinition = {
    id: testId,
    title: "Engine Core Self Test",
    version: "1.0.0",
    inputs: ["value"],
    outputs: ["value"],
    execute(input) {
      return input;
    }
  };

  const selfTestValidation = validateEngineDefinition(
    selfTestDefinition
  );

  checks.contract = selfTestValidation.valid;

  const registration = registerEngine(
    selfTestDefinition,
    { replace: true }
  );

  checks.selfRegistration = registration.registered === true;
  checks.selfLookup = getEngine(testId) !== null;

  if (previous) {
    enginePlatformRegistry.set(testId, previous);
  } else {
    unregisterEngine(testId);
  }

  const failed = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);

  return {
    id: ENGINE_PLATFORM_ID,
    title: "Engine Platform Core",
    version: ENGINE_PLATFORM_VERSION,
    valid: failed.length === 0,
    passed: Object.keys(checks).length - failed.length,
    total: Object.keys(checks).length,
    failed,
    checks,
    engines: listEngines({ includeDisabled: true }).length,
    traces: enginePlatformTraceRecords.length,
    status: getEnginePlatformStatus()
  };
}
