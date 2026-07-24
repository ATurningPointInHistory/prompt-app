/* ===============================
   FILE: 13_development_status_registry.js
   AI Prompt OS v7.0
   Development Status Registry
=============================== */

const DEVELOPMENT_STATUS_REGISTRY_STORAGE_KEY =
  "AI_PROMPT_OS_DEVELOPMENT_STATUS_REGISTRY_V1";

const DEVELOPMENT_STATUS_BUILT_IN_DEFINITIONS = [
  { id: "IDE-010", statusApi: "getMobileConsoleStatus", validator: "" },
  { id: "IDE-020", statusApi: "getFunctionHelpStatus", validator: "" },
  { id: "IDE-030", statusApi: "getCommandPaletteStatus", validator: "validateCommandPalette" },
  { id: "IDE-040", statusApi: "getProjectSearchStatus", validator: "validateProjectSearch" },
  { id: "IDE-050", statusApi: "getErrorInspectorStatus", validator: "validateErrorInspector" },
  { id: "IDE-060", statusApi: "getQuickCommandStatus", validator: "validateQuickCommand" },
  { id: "IDE-070", statusApi: "getAutocompleteStatus", validator: "validateAutocomplete" },
  { id: "IDE-080", statusApi: "getVirtualKeyboardStatus", validator: "validateVirtualKeyboard" },
  { id: "IDE-110", statusApi: "getDiagnosticInstrumentationStatus", validator: "validateDiagnosticInstrumentation" }
];

const DEVELOPMENT_STATUS_REGISTRY = [];

function normalizeDevelopmentStatusDefinition(definition, source) {
  if (!definition || typeof definition !== "object") return null;

  const id = typeof definition.id === "string" ? definition.id.trim() : "";
  const statusApi = typeof definition.statusApi === "string" ? definition.statusApi.trim() : "";
  const validator = typeof definition.validator === "string" ? definition.validator.trim() : "";

  if (!id || (!statusApi && !validator)) return null;

  return {
    id: id,
    statusApi: statusApi,
    validator: validator,
    enabled: definition.enabled !== false,
    source: source || definition.source || "user"
  };
}

function registerDevelopmentStatus(definition, options) {
  const settings = options && typeof options === "object" ? options : {};
  const normalized = normalizeDevelopmentStatusDefinition(
    definition,
    settings.source || (definition && definition.source) || "user"
  );

  if (!normalized) {
    return {
      id: "DEVELOPMENT-STATUS-REGISTER",
      registered: false,
      reason: "id and statusApi or validator are required."
    };
  }

  const existingIndex = DEVELOPMENT_STATUS_REGISTRY.findIndex(
    function findStatus(item) { return item.id === normalized.id; }
  );

  if (existingIndex >= 0) {
    const existing = DEVELOPMENT_STATUS_REGISTRY[existingIndex];

    if (existing.source === "built-in" && normalized.source !== "built-in") {
      return {
        id: "DEVELOPMENT-STATUS-REGISTER",
        registered: false,
        protected: true,
        reason: "Built-in registration cannot be overwritten by user data.",
        definition: { ...existing }
      };
    }

    DEVELOPMENT_STATUS_REGISTRY[existingIndex] = normalized;

    if (settings.persist !== false && normalized.source !== "built-in") {
      saveDevelopmentStatusRegistry();
    }

    return {
      id: "DEVELOPMENT-STATUS-REGISTER",
      registered: true,
      updated: true,
      definition: { ...normalized }
    };
  }

  DEVELOPMENT_STATUS_REGISTRY.push(normalized);

  if (settings.persist !== false && normalized.source !== "built-in") {
    saveDevelopmentStatusRegistry();
  }

  return {
    id: "DEVELOPMENT-STATUS-REGISTER",
    registered: true,
    updated: false,
    definition: { ...normalized }
  };
}

function unregisterDevelopmentStatus(id, options) {
  const targetId = typeof id === "string" ? id.trim() : "";
  const settings = options && typeof options === "object" ? options : {};
  const index = DEVELOPMENT_STATUS_REGISTRY.findIndex(
    function findStatus(item) { return item.id === targetId; }
  );

  if (index < 0) {
    return { id: "DEVELOPMENT-STATUS-UNREGISTER", removed: false, reason: "Status ID was not found." };
  }

  if (DEVELOPMENT_STATUS_REGISTRY[index].source === "built-in" && settings.force !== true) {
    return { id: "DEVELOPMENT-STATUS-UNREGISTER", removed: false, protected: true, reason: "Built-in registration cannot be removed." };
  }

  const removed = DEVELOPMENT_STATUS_REGISTRY.splice(index, 1)[0];
  if (settings.persist !== false) saveDevelopmentStatusRegistry();

  return { id: "DEVELOPMENT-STATUS-UNREGISTER", removed: true, definition: { ...removed } };
}

function getDevelopmentStatusRegistry(options) {
  const settings = options && typeof options === "object" ? options : {};

  return DEVELOPMENT_STATUS_REGISTRY
    .filter(function filterStatus(item) {
      return settings.includeDisabled === true || item.enabled !== false;
    })
    .map(function cloneStatus(item) { return { ...item }; });
}

function buildDevelopmentStatusFromValidation(definition, validation) {
  const total = Number(validation && validation.total) || 0;
  const passed = Number(validation && validation.passed) || 0;
  const valid = Boolean(validation && validation.valid === true);
  const rate = total > 0 ? Math.round(passed / total * 100) : (valid ? 100 : 0);

  return {
    id: definition.id,
    version: "1.0",
    status: valid ? "Ready" : "Error",
    ready: valid,
    progress: rate,
    health: rate,
    validation: validation
  };
}

function getDevelopmentStatus(id) {
  const targetId = typeof id === "string" ? id.trim() : "";
  const definition = DEVELOPMENT_STATUS_REGISTRY.find(
    function findStatus(item) { return item.id === targetId; }
  );

  if (!definition || definition.enabled === false) {
    return {
      id: targetId || "UNKNOWN",
      status: "Unavailable",
      ready: false,
      progress: 0,
      health: 0,
      source: "Unavailable",
      available: false,
      error: definition ? "Registration is disabled." : "Status ID was not found."
    };
  }

  try {
    let status = null;
    let source = "Unavailable";

    if (definition.statusApi && typeof window[definition.statusApi] === "function") {
      status = window[definition.statusApi]();
      source = definition.statusApi;
    }

    if (!status && definition.validator && typeof window[definition.validator] === "function") {
      const validation = window[definition.validator](false);
      if (validation && typeof validation === "object") {
        status = buildDevelopmentStatusFromValidation(definition, validation);
        source = definition.validator;
      }
    }

    if (!status && typeof getIdeComponentStatus === "function") {
      status = getIdeComponentStatus(definition.id);
      if (status) source = "getIdeComponentStatus";
    }

    if (!status || typeof status !== "object") {
      return {
        id: definition.id,
        status: "Unavailable",
        ready: false,
        progress: 0,
        health: 0,
        source: source,
        available: false,
        error: "Status information is unavailable."
      };
    }

    return {
      ...status,
      id: status.id || definition.id,
      ready: status.ready === true,
      progress: Math.max(0, Math.min(100, Number(status.progress) || 0)),
      health: Math.max(0, Math.min(100, Number(status.health) || 0)),
      source: source,
      available: true
    };
  } catch (error) {
    return {
      id: definition.id,
      status: "Error",
      ready: false,
      progress: 0,
      health: 0,
      source: definition.statusApi || definition.validator || "Unavailable",
      available: false,
      error: error && error.message ? error.message : String(error)
    };
  }
}

function collectDevelopmentStatuses(options) {
  const definitions = getDevelopmentStatusRegistry(options);
  const statuses = definitions.map(function collectStatus(definition) {
    return getDevelopmentStatus(definition.id);
  });

  const errors = statuses
    .filter(function filterError(status) { return Boolean(status.error); })
    .map(function mapError(status) {
      return { id: status.id, message: status.error, source: status.source };
    });

  return {
    id: "DEVELOPMENT-STATUSES",
    statuses: statuses,
    summary: {
      total: statuses.length,
      available: statuses.filter(function (item) { return item.available === true; }).length,
      ready: statuses.filter(function (item) { return item.ready === true; }).length,
      errors: errors.length
    },
    errors: errors,
    readOnly: true,
    collectedAt: new Date().toISOString()
  };
}

function validateDevelopmentStatusRegistry() {
  const definitions = getDevelopmentStatusRegistry({ includeDisabled: true });
  const checks = [];
  const ids = new Set();

  function check(name, passed, detail) {
    checks.push({ name: name, passed: passed === true, detail: detail || "" });
  }

  check("Registry exists", Array.isArray(definitions), "count=" + definitions.length);
  check("Registry is not empty", definitions.length > 0, "count=" + definitions.length);

  definitions.forEach(function validateDefinition(definition) {
    const duplicate = ids.has(definition.id);
    check("Unique ID: " + definition.id, !duplicate, duplicate ? "Duplicate ID" : "");
    ids.add(definition.id);
    check("API definition: " + definition.id, Boolean(definition.statusApi || definition.validator), definition.statusApi || definition.validator || "No API");
    check("Source: " + definition.id, definition.source === "built-in" || definition.source === "user", definition.source);
  });

  DEVELOPMENT_STATUS_BUILT_IN_DEFINITIONS.forEach(function validateBuiltIn(definition) {
    check(
      "Built-in registration: " + definition.id,
      definitions.some(function (item) { return item.id === definition.id && item.source === "built-in"; }),
      definition.statusApi || definition.validator
    );
  });

  const passed = checks.filter(function (item) { return item.passed; }).length;
  const total = checks.length;
  const valid = total > 0 && passed === total;

  return {
    id: "DEVELOPMENT-STATUS-REGISTRY-VALIDATION",
    valid: valid,
    passed: passed,
    total: total,
    registryCount: definitions.length,
    health: valid ? 100 : Math.round(passed / total * 100),
    checks: checks,
    validatedAt: new Date().toISOString()
  };
}

function saveDevelopmentStatusRegistry() {
  const userDefinitions = DEVELOPMENT_STATUS_REGISTRY.filter(
    function filterUser(item) { return item.source !== "built-in"; }
  );

  try {
    localStorage.setItem(
      DEVELOPMENT_STATUS_REGISTRY_STORAGE_KEY,
      JSON.stringify({ version: "1.0.0", statuses: userDefinitions })
    );
    return { id: "DEVELOPMENT-STATUS-REGISTRY-SAVE", saved: true, count: userDefinitions.length };
  } catch (error) {
    return { id: "DEVELOPMENT-STATUS-REGISTRY-SAVE", saved: false, count: 0, error: error && error.message ? error.message : String(error) };
  }
}

function loadDevelopmentStatusRegistry() {
  let parsed = null;

  try {
    const raw = localStorage.getItem(DEVELOPMENT_STATUS_REGISTRY_STORAGE_KEY);
    if (!raw) return { id: "DEVELOPMENT-STATUS-REGISTRY-LOAD", loaded: true, count: 0 };
    parsed = JSON.parse(raw);
  } catch (error) {
    return { id: "DEVELOPMENT-STATUS-REGISTRY-LOAD", loaded: false, count: 0, error: error && error.message ? error.message : String(error) };
  }

  const statuses = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.statuses) ? parsed.statuses : []);
  let count = 0;

  statuses.forEach(function loadStatus(definition) {
    const result = registerDevelopmentStatus(definition, { source: "user", persist: false });
    if (result.registered) count += 1;
  });

  return { id: "DEVELOPMENT-STATUS-REGISTRY-LOAD", loaded: true, count: count };
}

function exportDevelopmentStatusRegistry(options) {
  const settings = options && typeof options === "object" ? options : {};
  const payload = {
    id: "DEVELOPMENT-STATUS-REGISTRY-BACKUP",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    statuses: getDevelopmentStatusRegistry({ includeDisabled: true })
  };

  if (settings.download === false) return payload;

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "Development_Status_Registry_" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return { id: "DEVELOPMENT-STATUS-REGISTRY-EXPORT", exported: true, count: payload.statuses.length, payload: payload };
}

function importDevelopmentStatusRegistry(input, options) {
  const settings = options && typeof options === "object" ? options : {};

  function applyPayload(payload) {
    const statuses = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.statuses) ? payload.statuses : []);
    let imported = 0;
    const rejected = [];

    statuses.forEach(function importStatus(definition) {
      if (definition && definition.source === "built-in") return;
      const result = registerDevelopmentStatus(definition, { source: "user", persist: false });
      if (result.registered) imported += 1;
      else rejected.push({ definition: definition, reason: result.reason || "Rejected" });
    });

    if (settings.persist !== false) saveDevelopmentStatusRegistry();

    return { id: "DEVELOPMENT-STATUS-REGISTRY-IMPORT", imported: imported, rejected: rejected, valid: rejected.length === 0 };
  }

  if (typeof input === "string") {
    try { return applyPayload(JSON.parse(input)); }
    catch (error) { return { id: "DEVELOPMENT-STATUS-REGISTRY-IMPORT", imported: 0, valid: false, error: error && error.message ? error.message : String(error) }; }
  }

  if (input && typeof File !== "undefined" && input instanceof File) {
    return input.text().then(function (text) { return importDevelopmentStatusRegistry(text, settings); });
  }

  if (input && typeof input === "object") return applyPayload(input);

  return { id: "DEVELOPMENT-STATUS-REGISTRY-IMPORT", imported: 0, valid: false, error: "JSON text, object, or File is required." };
}

function initializeDevelopmentStatusRegistry() {
  DEVELOPMENT_STATUS_REGISTRY.length = 0;

  DEVELOPMENT_STATUS_BUILT_IN_DEFINITIONS.forEach(function registerBuiltIn(definition) {
    registerDevelopmentStatus(definition, { source: "built-in", persist: false });
  });

  const loadResult = loadDevelopmentStatusRegistry();

  return {
    id: "DEVELOPMENT-STATUS-REGISTRY-INITIALIZE",
    initialized: true,
    builtIn: DEVELOPMENT_STATUS_BUILT_IN_DEFINITIONS.length,
    user: loadResult.loaded ? loadResult.count : 0,
    registryCount: DEVELOPMENT_STATUS_REGISTRY.length,
    loadResult: loadResult
  };
}

initializeDevelopmentStatusRegistry();