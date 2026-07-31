/* ============================================================
   IDE-110 Diagnostic Instrumentation
   File: 13_diagnostic_instrumentation.js
   Version: 1.0.0

   Current implementation scope:
   - Session Management
   - Public API
   - State Management
   - Status API
   - Dashboard integration through Status API
   - Lightweight self-validation

   Out of scope:
   - Panel UI
   - Probe Manager
   - Performance Monitor
   - Report
   - Restore
   - Full Validation module
============================================================ */

(function initializeDiagnosticInstrumentation(global) {
  "use strict";

  const COMPONENT_ID = "IDE-110";
  const COMPONENT_TITLE = "Diagnostic Instrumentation";
  const COMPONENT_VERSION = "1.0.0";
  const MAX_SESSION_HISTORY = 100;

  const SESSION_STATUS = Object.freeze({
    CREATED: "Created",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    FAILED: "Failed"
  });

  const state = {
    initialized: true,
    enabled: true,
    activeSessionId: null,
    sessions: [],
    sequence: 0,

    statistics: {
      created: 0,
      started: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
      removed: 0
    },

    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value, fallback) {
    const text = String(value == null ? "" : value).trim();
    return text || fallback;
  }

  function normalizeObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return clone(value);
  }

  function touchState() {
    state.updatedAt = nowIso();
  }

  function setLastError(error, operation) {
    state.lastError = {
      operation: normalizeText(operation, "unknown"),
      message: error && error.message ? error.message : String(error),
      at: nowIso()
    };
    touchState();
  }

  function clearLastError() {
    state.lastError = null;
    touchState();
  }

  function createSessionId() {
    state.sequence += 1;

    return [
      "DIAG",
      Date.now().toString(36).toUpperCase(),
      state.sequence.toString(36).toUpperCase()
    ].join("-");
  }

  function findSessionIndex(sessionId) {
    return state.sessions.findIndex(function findSession(session) {
      return session.id === sessionId;
    });
  }

  function getMutableSession(sessionId) {
    const id = normalizeText(sessionId, state.activeSessionId || "");
    const index = findSessionIndex(id);
    return index >= 0 ? state.sessions[index] : null;
  }

  function calculateDurationMs(session, endTime) {
    if (!session || !session.startedAt) {
      return null;
    }

    const start = Date.parse(session.startedAt);
    const end = Date.parse(endTime || session.endedAt || nowIso());

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }

    return Math.max(0, end - start);
  }

  function trimSessionHistory() {
    if (state.sessions.length <= MAX_SESSION_HISTORY) {
      return;
    }

    const removable = state.sessions.filter(function filterSession(session) {
      return session.id !== state.activeSessionId;
    });

    while (
      state.sessions.length > MAX_SESSION_HISTORY &&
      removable.length > 0
    ) {
      const candidate = removable.shift();
      const index = findSessionIndex(candidate.id);

      if (index >= 0) {
        state.sessions.splice(index, 1);
      }
    }
  }

  function buildSession(options) {
    const input = normalizeObject(options);
    const timestamp = nowIso();

    return {
      id: createSessionId(),
      title: normalizeText(input.title, "Diagnostic Session"),
      description: normalizeText(input.description, ""),
      targetType: normalizeText(input.targetType, "Unknown"),
      targetId: normalizeText(input.targetId, ""),
      status: SESSION_STATUS.CREATED,
      createdAt: timestamp,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      metadata: normalizeObject(input.metadata),
      result: null,
      error: null,
      events: [
        {
          type: "SESSION_CREATED",
          at: timestamp,
          data: null
        }
      ]
    };
  }

  function addDiagnosticSessionEvent(sessionId, type, data) {
    const session = getMutableSession(sessionId);

    if (!session) {
      return {
        id: "IDE-110-EVENT",
        added: false,
        reason: "Session not found.",
        sessionId: normalizeText(sessionId, "")
      };
    }

    const event = {
      type: normalizeText(type, "SESSION_EVENT"),
      at: nowIso(),
      data: data === undefined ? null : clone(data)
    };

    session.events.push(event);
    touchState();

    return {
      id: "IDE-110-EVENT",
      added: true,
      sessionId: session.id,
      event: clone(event)
    };
  }

  function createDiagnosticSession(options) {
    try {
      const session = buildSession(options);
  
      state.sessions.push(session);
      state.statistics.created += 1;
  
      trimSessionHistory();
      clearLastError();
  
      return clone(session);
    } catch (error) {
      setLastError(error, "createDiagnosticSession");
      throw error;
    }
  }

  function startDiagnosticSession(sessionIdOrOptions) {
    try {
      if (!state.enabled) {
        return {
          id: "IDE-110-START",
          started: false,
          reason: "Diagnostic instrumentation is disabled."
        };
      }

      if (state.activeSessionId) {
        return {
          id: "IDE-110-START",
          started: false,
          reason: "Another diagnostic session is already active.",
          activeSessionId: state.activeSessionId
        };
      }

      let session = null;

      if (typeof sessionIdOrOptions === "string") {
        session = getMutableSession(sessionIdOrOptions);
      } else {
        const created = createDiagnosticSession(sessionIdOrOptions || {});
        session = getMutableSession(created.id);
      }

      if (!session) {
        return {
          id: "IDE-110-START",
          started: false,
          reason: "Session not found."
        };
      }

      if (session.status !== SESSION_STATUS.CREATED) {
        return {
          id: "IDE-110-START",
          started: false,
          reason: "Only a Created session can be started.",
          sessionId: session.id,
          status: session.status
        };
      }

      session.status = SESSION_STATUS.ACTIVE;
      session.startedAt = nowIso();
      session.endedAt = null;
      session.durationMs = null;
      session.error = null;

      state.activeSessionId = session.id;
      state.statistics.started += 1;

      addDiagnosticSessionEvent(session.id, "SESSION_STARTED", null);
      clearLastError();

      return {
        id: "IDE-110-START",
        started: true,
        session: clone(session)
      };
    } catch (error) {
      setLastError(error, "startDiagnosticSession");
      throw error;
    }
  }

  function finishSession(sessionId, status, result, errorValue) {
    const session = getMutableSession(sessionId);

    if (!session) {
      return {
        finished: false,
        reason: "Session not found.",
        sessionId: normalizeText(sessionId, "")
      };
    }

    if (session.status !== SESSION_STATUS.ACTIVE) {
      return {
        finished: false,
        reason: "Only an Active session can be finished.",
        sessionId: session.id,
        status: session.status
      };
    }

    const endedAt = nowIso();

    session.status = status;
    session.endedAt = endedAt;
    session.durationMs = calculateDurationMs(session, endedAt);
    session.result = result === undefined ? null : clone(result);
    session.error = errorValue == null
      ? null
      : {
          message: errorValue && errorValue.message
            ? errorValue.message
            : String(errorValue),
          at: endedAt
        };

    if (status === SESSION_STATUS.COMPLETED) {
      state.statistics.completed += 1;
    } else if (status === SESSION_STATUS.CANCELLED) {
      state.statistics.cancelled += 1;
    } else if (status === SESSION_STATUS.FAILED) {
      state.statistics.failed += 1;
    }

    if (state.activeSessionId === session.id) {
      state.activeSessionId = null;
    }

    addDiagnosticSessionEvent(
      session.id,
      "SESSION_" + status.toUpperCase(),
      session.error || session.result
    );

    clearLastError();

    return {
      finished: true,
      session: clone(session)
    };
  }

  function completeDiagnosticSession(sessionId, result) {
    const output = finishSession(
      sessionId || state.activeSessionId,
      SESSION_STATUS.COMPLETED,
      result,
      null
    );

    return Object.assign(
      { id: "IDE-110-COMPLETE", completed: output.finished === true },
      output
    );
  }

  function cancelDiagnosticSession(sessionId, reason) {
    const output = finishSession(
      sessionId || state.activeSessionId,
      SESSION_STATUS.CANCELLED,
      { reason: normalizeText(reason, "Cancelled by user.") },
      null
    );

    return Object.assign(
      { id: "IDE-110-CANCEL", cancelled: output.finished === true },
      output
    );
  }

  function failDiagnosticSession(sessionId, error) {
    const output = finishSession(
      sessionId || state.activeSessionId,
      SESSION_STATUS.FAILED,
      null,
      error || "Diagnostic session failed."
    );

    return Object.assign(
      { id: "IDE-110-FAIL", failed: output.finished === true },
      output
    );
  }

  function getDiagnosticSession(sessionId) {
    const session = getMutableSession(sessionId);
    return session ? clone(session) : null;
  }

  function getActiveDiagnosticSession() {
    return state.activeSessionId
      ? getDiagnosticSession(state.activeSessionId)
      : null;
  }

  function listDiagnosticSessions(filter) {
    const input = normalizeObject(filter);
    let sessions = state.sessions.slice();

    if (input.status) {
      sessions = sessions.filter(function filterStatus(session) {
        return session.status === input.status;
      });
    }

    if (input.targetType) {
      sessions = sessions.filter(function filterTargetType(session) {
        return session.targetType === input.targetType;
      });
    }

    sessions.sort(function sortSessions(a, b) {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });

    if (Number.isFinite(Number(input.limit)) && Number(input.limit) > 0) {
      sessions = sessions.slice(0, Number(input.limit));
    }

    return clone(sessions);
  }

  function removeDiagnosticSession(sessionId) {
    const id = normalizeText(sessionId, "");

    if (!id) {
      return {
        id: "IDE-110-REMOVE",
        removed: false,
        reason: "sessionId is required."
      };
    }

    if (state.activeSessionId === id) {
      return {
        id: "IDE-110-REMOVE",
        removed: false,
        reason: "An active session cannot be removed.",
        sessionId: id
      };
    }

    const index = findSessionIndex(id);

    if (index < 0) {
      return {
        id: "IDE-110-REMOVE",
        removed: false,
        reason: "Session not found.",
        sessionId: id
      };
    }

    state.sessions.splice(index, 1);
    state.statistics.removed += 1;

    touchState();

    return {
      id: "IDE-110-REMOVE",
      removed: true,
      sessionId: id
    };
  }

  function clearDiagnosticSessions() {
    const active = getMutableSession(state.activeSessionId);

    state.sessions = active ? [active] : [];
    touchState();

    return {
      id: "IDE-110-CLEAR",
      cleared: true,
      retainedActiveSession: Boolean(active),
      sessionCount: state.sessions.length
    };
  }

  function setDiagnosticInstrumentationEnabled(enabled) {
    state.enabled = enabled !== false;
    touchState();

    return {
      id: "IDE-110-ENABLED",
      enabled: state.enabled
    };
  }

  function resetDiagnosticInstrumentationState(options) {
    const input = normalizeObject(options);
    const force = input.force === true;
    const preserveStatistics = input.preserveStatistics === true;

    if (state.activeSessionId && !force) {
      return {
        id: "IDE-110-RESET",
        reset: false,
        reason: "An active session exists. Use { force: true } to reset.",
        activeSessionId: state.activeSessionId
      };
    }

    state.activeSessionId = null;
    state.sessions = [];
    state.sequence = 0;
    state.lastError = null;
    state.enabled = true;

    if (!preserveStatistics) {
      state.statistics = {
        created: 0,
        started: 0,
        completed: 0,
        cancelled: 0,
        failed: 0,
        removed: 0
      };
    }

    state.createdAt = nowIso();
    touchState();

    return {
      id: "IDE-110-RESET",
      reset: true,
      statisticsPreserved: preserveStatistics,
      state: getDiagnosticInstrumentationState()
    };
  }

  function getDiagnosticInstrumentationState() {
    return clone({
      initialized: state.initialized,
      enabled: state.enabled,
      activeSessionId: state.activeSessionId,
      sessions: state.sessions,
      sequence: state.sequence,
      statistics: state.statistics,
      lastError: state.lastError,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt
    });
  }

  function getDiagnosticInstrumentationStatus() {
    const counts = {
      total: state.sessions.length,
      created: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      failed: 0
    };

    state.sessions.forEach(function countSession(session) {
      const key = session.status.toLowerCase();

      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      }
    });

    const apiNames = [
      "createDiagnosticSession",
      "startDiagnosticSession",
      "completeDiagnosticSession",
      "cancelDiagnosticSession",
      "failDiagnosticSession",
      "addDiagnosticSessionEvent",
      "getDiagnosticSession",
      "getActiveDiagnosticSession",
      "listDiagnosticSessions",
      "removeDiagnosticSession",
      "clearDiagnosticSessions",
      "setDiagnosticInstrumentationEnabled",
      "resetDiagnosticInstrumentationState",
      "getDiagnosticInstrumentationState",
      "getDiagnosticInstrumentationStatus",
      "validateDiagnosticInstrumentation"
    ];

    const implemented = apiNames.filter(function checkApi(name) {
      return typeof global[name] === "function";
    }).length;

    const total = apiNames.length;
    const ready = state.initialized && implemented === total;
    const progress = Math.round((implemented / total) * 100);
    const warnings = [];
    const errors = [];

    if (!state.enabled) {
      warnings.push("Diagnostic instrumentation is disabled.");
    }

    if (state.lastError) {
      errors.push(clone(state.lastError));
    }

    return {
      id: COMPONENT_ID,
      title: COMPONENT_TITLE,
      name: COMPONENT_TITLE,
      version: COMPONENT_VERSION,
      status: ready ? "Ready" : "In Progress",
      ready: ready,
      progress: progress,
      health: errors.length > 0 ? 80 : 100,
      implemented: implemented,
      total: total,
      enabled: state.enabled,
      activeSessionId: state.activeSessionId,
      sessionCount: state.sessions.length,

      counts: counts,
      statistics: clone(state.statistics),

      warnings: warnings,
      errors: errors,

      nextTask: ready
        ? "Implement Probe Manager and Performance Monitor."
        : "Complete IDE-110 public APIs.",

      dependsOn: [
        "IDE-050",
        "IDE-090",
        "IDE-100",
        "OBSERVABILITY-001",
        "LOGGING-001"
      ],

      provides: [
        "Diagnostic Session Management",
        "Diagnostic State Management",
        "Diagnostic Public API",
        "Diagnostic Status API"
      ],

      readOnly: false,
      updatedAt: state.updatedAt
    };
  }

  function validateDiagnosticInstrumentation() {
    const checks = [];

    function check(name, passed, detail) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail || ""
      });
    }

    const snapshot = getDiagnosticInstrumentationState();

    try {
      resetDiagnosticInstrumentationState({
        force: true,
        preserveStatistics: false
      });

      const created = createDiagnosticSession({
        title: "IDE-110 Validation",
        targetType: "Function",
        targetId: "validateDiagnosticInstrumentation"
      });

      check(
        "Session creation",
        Boolean(created && created.id),
        created ? created.id : "Session not created"
      );

      const started = startDiagnosticSession(created.id);

      check(
        "Session start",
        started.started === true,
        started.reason
      );

      const active = getActiveDiagnosticSession();

      check(
        "Active session state",
        Boolean(
          active &&
          active.id === created.id &&
          active.status === SESSION_STATUS.ACTIVE
        ),
        active ? active.status : "No active session"
      );

      const completed = completeDiagnosticSession(
        created.id,
        { ok: true }
      );

      check(
        "Session completion",
        completed.completed === true,
        completed.reason
      );

      const finished = getDiagnosticSession(created.id);

      check(
        "Completed session state",
        Boolean(
          finished &&
          finished.status === SESSION_STATUS.COMPLETED
        ),
        finished ? finished.status : "Session missing"
      );

      const list = listDiagnosticSessions();

      check(
        "Session listing",
        list.length === 1,
        "count=" + list.length
      );

      const status = getDiagnosticInstrumentationStatus();

      check(
        "Status API",
        Boolean(
          status &&
          status.id === COMPONENT_ID &&
          status.ready === true &&
          status.health === 100 &&
          status.progress === 100 &&
          status.enabled === true &&
          status.statistics &&
          status.statistics.created === 1 &&
          status.statistics.started === 1 &&
          status.statistics.completed === 1 &&
          status.statistics.cancelled === 0 &&
          status.statistics.failed === 0
        ),
        status
          ? status.status +
            " / created=" + status.statistics.created +
            " / started=" + status.statistics.started +
            " / completed=" + status.statistics.completed
          : "Status unavailable"
      );

      const removed = removeDiagnosticSession(created.id);

      check(
        "Session removal",
        removed.removed === true,
        removed.reason
      );
    } catch (error) {
      check(
        "Unexpected exception",
        false,
        error.message || String(error)
      );
    } finally {
      state.initialized = snapshot.initialized;
      state.enabled = snapshot.enabled;
      state.activeSessionId = snapshot.activeSessionId;
      state.sessions = snapshot.sessions;
      state.sequence = snapshot.sequence;
      state.statistics = snapshot.statistics;
      state.lastError = snapshot.lastError;
      state.createdAt = snapshot.createdAt;
      state.updatedAt = snapshot.updatedAt;
    }

    const passed = checks.filter(function filterCheck(item) {
      return item.passed;
    }).length;

    const total = checks.length;
    const valid = total > 0 && passed === total;

    return {
      id: "IDE-110-VALIDATION",
      valid: valid,
      passed: passed,
      total: total,
      health: valid ? 100 : Math.round((passed / total) * 100),
      progress: valid ? 100 : Math.round((passed / total) * 100),
      checks: checks,
      validatedAt: nowIso()
    };
  }

  const publicApi = {
    DIAGNOSTIC_INSTRUMENTATION_SESSION_STATUS: SESSION_STATUS,
    createDiagnosticSession: createDiagnosticSession,
    startDiagnosticSession: startDiagnosticSession,
    completeDiagnosticSession: completeDiagnosticSession,
    cancelDiagnosticSession: cancelDiagnosticSession,
    failDiagnosticSession: failDiagnosticSession,
    addDiagnosticSessionEvent: addDiagnosticSessionEvent,
    getDiagnosticSession: getDiagnosticSession,
    getActiveDiagnosticSession: getActiveDiagnosticSession,
    listDiagnosticSessions: listDiagnosticSessions,
    removeDiagnosticSession: removeDiagnosticSession,
    clearDiagnosticSessions: clearDiagnosticSessions,
    setDiagnosticInstrumentationEnabled: setDiagnosticInstrumentationEnabled,
    resetDiagnosticInstrumentationState: resetDiagnosticInstrumentationState,
    getDiagnosticInstrumentationState: getDiagnosticInstrumentationState,
    getDiagnosticInstrumentationStatus: getDiagnosticInstrumentationStatus,
    validateDiagnosticInstrumentation: validateDiagnosticInstrumentation
  };

  Object.keys(publicApi).forEach(function exposeApi(name) {
    global[name] = publicApi[name];
  });

  global.DiagnosticInstrumentation = Object.freeze({
    id: COMPONENT_ID,
    title: COMPONENT_TITLE,
    version: COMPONENT_VERSION,
    sessionStatus: SESSION_STATUS,
    createSession: createDiagnosticSession,
    startSession: startDiagnosticSession,
    completeSession: completeDiagnosticSession,
    cancelSession: cancelDiagnosticSession,
    failSession: failDiagnosticSession,
    addEvent: addDiagnosticSessionEvent,
    getSession: getDiagnosticSession,
    getActiveSession: getActiveDiagnosticSession,
    listSessions: listDiagnosticSessions,
    removeSession: removeDiagnosticSession,
    clearSessions: clearDiagnosticSessions,
    setEnabled: setDiagnosticInstrumentationEnabled,
    reset: resetDiagnosticInstrumentationState,
    getState: getDiagnosticInstrumentationState,
    getStatus: getDiagnosticInstrumentationStatus,
    validate: validateDiagnosticInstrumentation
  });
})(typeof window !== "undefined" ? window : globalThis);/* ============================================================
   IDE-110 Diagnostic Platform Extension
   File: 13_diagnostic_platform.js
   Version: 1.1.1
   Strategy: additive extension; existing instrumentation remains intact.
============================================================ */
(function initializeDiagnosticPlatform(global) {
  "use strict";

  const COMPONENT_ID = "IDE-110";
  const VERSION = "1.1.1";
  const MAX_RECORDS = 500;

  const state = {
    initialized: true,
    instrumentationTypes: {},
    probeTypes: {},
    instrumentations: [],
    investigations: [],
    performanceRecords: [],
    sourceBackups: [],
    reports: [],
    sequence: 0,
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function text(value, fallback) { const v = String(value == null ? "" : value).trim(); return v || fallback; }
  function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? clone(value) : {}; }
  function nextId(prefix) { state.sequence += 1; return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase(); }
  function touch() { state.updatedAt = nowIso(); }
  function trim(list) { while (list.length > MAX_RECORDS) list.shift(); }
  function fail(operation, error) { state.lastError = { operation: operation, message: error && error.message ? error.message : String(error), at: nowIso() }; touch(); }

  function registerInstrumentationType(definition) {
    const input = object(definition);
    const id = text(input.id || input.type, "");
    if (!id) return { registered: false, reason: "Instrumentation type id is required." };
    state.instrumentationTypes[id] = {
      id: id,
      title: text(input.title, id),
      description: text(input.description, ""),
      reversible: input.reversible !== false,
      enabled: input.enabled !== false,
      metadata: object(input.metadata),
      registeredAt: nowIso()
    };
    touch();
    return { registered: true, definition: clone(state.instrumentationTypes[id]) };
  }

  function registerProbeType(definition) {
    const input = object(definition);
    const id = text(input.id || input.type, "");
    if (!id) return { registered: false, reason: "Probe type id is required." };
    state.probeTypes[id] = {
      id: id,
      title: text(input.title, id),
      description: text(input.description, ""),
      metric: text(input.metric, "custom"),
      enabled: input.enabled !== false,
      metadata: object(input.metadata),
      registeredAt: nowIso()
    };
    touch();
    return { registered: true, definition: clone(state.probeTypes[id]) };
  }

  function previewInstrumentation(options) {
    const input = object(options);
    const type = text(input.type, "TRACE");
    return {
      id: "IDE-110-INSTRUMENTATION-PREVIEW",
      valid: Boolean(input.targetId || input.target),
      type: type,
      targetType: text(input.targetType, "Function"),
      targetId: text(input.targetId || input.target, ""),
      changes: [{ action: "ADD_PROBE", type: type, reversible: true }],
      sourceChanged: false,
      previewedAt: nowIso()
    };
  }

  function addInstrumentation(options) {
    try {
      const preview = previewInstrumentation(options);
      if (!preview.valid) return { added: false, reason: "targetId is required.", preview: preview };
      const input = object(options);
      const item = {
        id: nextId("INST"),
        sessionId: text(input.sessionId, ""),
        investigationId: text(input.investigationId, ""),
        type: preview.type,
        targetType: preview.targetType,
        targetId: preview.targetId,
        config: object(input.config),
        status: "Applied",
        appliedAt: nowIso(),
        removedAt: null,
        verified: false
      };
      state.instrumentations.push(item); trim(state.instrumentations); touch();
      if (item.sessionId && typeof global.addDiagnosticSessionEvent === "function") global.addDiagnosticSessionEvent(item.sessionId, "INSTRUMENTATION_ADDED", item);
      return { added: true, instrumentation: clone(item) };
    } catch (error) { fail("addInstrumentation", error); return { added: false, reason: state.lastError.message }; }
  }

  function removeInstrumentation(instrumentationId) {
    const item = state.instrumentations.find(function (x) { return x.id === instrumentationId; });
    if (!item) return { removed: false, reason: "Instrumentation not found." };
    if (item.status === "Removed") return { removed: true, alreadyRemoved: true, instrumentation: clone(item) };
    item.status = "Removed"; item.removedAt = nowIso(); touch();
    return { removed: true, instrumentation: clone(item) };
  }

  function verifyInstrumentation(instrumentationId) {
    const item = state.instrumentations.find(function (x) { return x.id === instrumentationId; });
    if (!item) return { verified: false, reason: "Instrumentation not found." };
    item.verified = item.status === "Applied" || item.status === "Removed"; item.verifiedAt = nowIso(); touch();
    return { verified: item.verified, instrumentation: clone(item) };
  }

  function createInvestigation(options) {
    const input = object(options);
    const item = {
      id: nextId("INV"),
      sessionId: text(input.sessionId, ""),
      title: text(input.title, "Diagnostic Investigation"),
      problem: text(input.problem, ""),
      scope: object(input.scope),
      hypotheses: [],
      evidence: [],
      findings: [],
      status: "Created",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.investigations.push(item); trim(state.investigations); touch();
    return clone(item);
  }

  function addInvestigationEvidence(investigationId, evidence) {
    const item = state.investigations.find(function (x) { return x.id === investigationId; });
    if (!item) return { added: false, reason: "Investigation not found." };
    const record = { id: nextId("EVD"), type: text(evidence && evidence.type, "Observation"), data: clone(evidence && evidence.data !== undefined ? evidence.data : evidence), recordedAt: nowIso() };
    item.evidence.push(record); item.updatedAt = nowIso(); touch();
    return { added: true, evidence: clone(record) };
  }

  function recordPerformance(options) {
    const input = object(options);
    const durationMs = Number(input.durationMs);
    if (!Number.isFinite(durationMs) || durationMs < 0) return { recorded: false, reason: "durationMs must be a non-negative number." };
    const record = {
      id: nextId("PERF"), sessionId: text(input.sessionId, ""), investigationId: text(input.investigationId, ""),
      targetType: text(input.targetType, "Function"), targetId: text(input.targetId, "Unknown"),
      durationMs: durationMs, selfMs: Number.isFinite(Number(input.selfMs)) ? Number(input.selfMs) : durationMs,
      inclusiveMs: Number.isFinite(Number(input.inclusiveMs)) ? Number(input.inclusiveMs) : durationMs,
      callCount: Number.isFinite(Number(input.callCount)) ? Number(input.callCount) : 1,
      metadata: object(input.metadata), recordedAt: nowIso()
    };
    state.performanceRecords.push(record); trim(state.performanceRecords); touch();
    return { recorded: true, record: clone(record) };
  }

  function getPerformanceRanking(options) {
    const input = object(options); const limit = Math.max(1, Number(input.limit) || 20);
    const grouped = {};
    state.performanceRecords.forEach(function (r) {
      if (input.sessionId && r.sessionId !== input.sessionId) return;
      const key = r.targetType + ":" + r.targetId;
      if (!grouped[key]) grouped[key] = { targetType: r.targetType, targetId: r.targetId, totalMs: 0, maxMs: 0, callCount: 0, samples: 0 };
      grouped[key].totalMs += r.durationMs; grouped[key].maxMs = Math.max(grouped[key].maxMs, r.durationMs); grouped[key].callCount += r.callCount; grouped[key].samples += 1;
    });
    return Object.keys(grouped).map(function (key) { const x = grouped[key]; x.averageMs = x.samples ? x.totalMs / x.samples : 0; return x; })
      .sort(function (a, b) { return b.totalMs - a.totalMs; }).slice(0, limit);
  }

  function backupSource(options) {
    const input = object(options);
    const backup = { id: nextId("BACKUP"), targetId: text(input.targetId || input.path, ""), content: input.content == null ? "" : String(input.content), hash: text(input.hash, ""), metadata: object(input.metadata), createdAt: nowIso(), restoredAt: null };
    if (!backup.targetId) return { backedUp: false, reason: "targetId or path is required." };
    state.sourceBackups.push(backup); trim(state.sourceBackups); touch();
    return { backedUp: true, backup: clone(backup) };
  }

  function restoreSource(backupId) {
    const backup = state.sourceBackups.find(function (x) { return x.id === backupId; });
    if (!backup) return { restored: false, reason: "Backup not found." };
    backup.restoredAt = nowIso(); touch();
    return { restored: true, targetId: backup.targetId, content: backup.content, backup: clone(backup) };
  }

  function verifyRestore(backupId, currentContent) {
    const backup = state.sourceBackups.find(function (x) { return x.id === backupId; });
    if (!backup) return { verified: false, reason: "Backup not found." };
    const verified = String(currentContent == null ? "" : currentContent) === backup.content;
    return { verified: verified, backupId: backupId, targetId: backup.targetId, checkedAt: nowIso() };
  }

  function buildDiagnosticReport(options) {
    const input = object(options);
    const session = input.sessionId && typeof global.getDiagnosticSession === "function" ? global.getDiagnosticSession(input.sessionId) : null;
    const report = {
      id: nextId("REPORT"), sessionId: text(input.sessionId, ""), investigationId: text(input.investigationId, ""),
      title: text(input.title, "Diagnostic Report"), executiveSummary: text(input.executiveSummary, ""),
      session: session, findings: clone(input.findings || []), recommendations: clone(input.recommendations || []),
      performanceRanking: getPerformanceRanking({ sessionId: input.sessionId, limit: input.performanceLimit || 20 }),
      restore: object(input.restore), metadata: object(input.metadata), createdAt: nowIso()
    };
    state.reports.push(report); trim(state.reports); touch();
    return clone(report);
  }

  function getDiagnosticPlatformState() { return clone(state); }

  function getDiagnosticPlatformStatus() {
    const required = ["registerInstrumentationType","registerProbeType","previewInstrumentation","addInstrumentation","removeInstrumentation","verifyInstrumentation","createInvestigation","addInvestigationEvidence","recordPerformance","getPerformanceRanking","backupSource","restoreSource","verifyRestore","buildDiagnosticReport","getDiagnosticPlatformStatus","validateDiagnosticPlatform"];
    const implemented = required.filter(function (name) { return typeof global[name] === "function"; }).length;
    const base = typeof global.getDiagnosticInstrumentationStatus === "function" ? global.getDiagnosticInstrumentationStatus() : null;
    const ready = Boolean(base && base.ready && implemented === required.length);
    return {
      id: COMPONENT_ID, title: "Diagnostic Platform", name: "Diagnostic Platform", version: VERSION,
      status: ready ? "Ready" : "In Progress", ready: ready, progress: Math.round((implemented / required.length) * 100),
      health: state.lastError ? 80 : (ready ? 100 : 90), implemented: implemented, total: required.length,
      baseInstrumentation: base, counts: {
        instrumentationTypes: Object.keys(state.instrumentationTypes).length, probeTypes: Object.keys(state.probeTypes).length,
        instrumentations: state.instrumentations.length, investigations: state.investigations.length,
        performanceRecords: state.performanceRecords.length, backups: state.sourceBackups.length, reports: state.reports.length
      },
      warnings: [], errors: state.lastError ? [clone(state.lastError)] : [], nextTask: ready ? "Run IDE-115 Diagnostic Validation." : "Complete IDE-110 Diagnostic Platform APIs.",
      provides: ["Instrumentation Registry","Probe Registry","Performance Monitoring","Investigation Management","Restore Management","Diagnostic Reporting"],
      updatedAt: state.updatedAt
    };
  }

  function validateDiagnosticPlatform() {
    const checks = []; function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail || "" }); }
    const snapshot = clone(state);
    try {
      check("Base instrumentation", typeof global.validateDiagnosticInstrumentation === "function" && global.validateDiagnosticInstrumentation().valid === true);
      check("Instrumentation type registry", registerInstrumentationType({ id: "TRACE", title: "Trace" }).registered === true);
      check("Probe type registry", registerProbeType({ id: "ELAPSED", metric: "durationMs" }).registered === true);
      const preview = previewInstrumentation({ type: "TRACE", targetId: "sampleFunction" }); check("Instrumentation preview", preview.valid === true && preview.sourceChanged === false);
      const added = addInstrumentation({ type: "TRACE", targetId: "sampleFunction" }); check("Instrumentation apply", added.added === true);
      check("Instrumentation verification", verifyInstrumentation(added.instrumentation.id).verified === true);
      check("Instrumentation removal", removeInstrumentation(added.instrumentation.id).removed === true);
      const investigation = createInvestigation({ title: "Validation", problem: "test" }); check("Investigation creation", Boolean(investigation.id));
      check("Evidence recording", addInvestigationEvidence(investigation.id, { type: "Observation", data: "ok" }).added === true);
      check("Performance recording", recordPerformance({ targetId: "sampleFunction", durationMs: 12.5 }).recorded === true);
      check("Performance ranking", getPerformanceRanking({ limit: 5 }).length === 1);
      const backup = backupSource({ targetId: "sample.js", content: "function sample(){}" }); check("Source backup", backup.backedUp === true);
      const restored = restoreSource(backup.backup.id); check("Source restore", restored.restored === true);
      check("Restore verification", verifyRestore(backup.backup.id, restored.content).verified === true);
      check("Diagnostic report", Boolean(buildDiagnosticReport({ title: "Validation Report" }).id));
      const status = getDiagnosticPlatformStatus(); check("Platform Status API", status.ready === true && status.health === 100, status.status + " / " + status.implemented + "/" + status.total);
    } catch (error) { check("Unexpected exception", false, error.message || String(error)); }
    finally { Object.keys(state).forEach(function (key) { delete state[key]; }); Object.keys(snapshot).forEach(function (key) { state[key] = snapshot[key]; }); }
    const passed = checks.filter(function (x) { return x.passed; }).length;
    return { id: "IDE-110-PLATFORM-VALIDATION", valid: passed === checks.length, passed: passed, total: checks.length, health: checks.length ? Math.round((passed / checks.length) * 100) : 0, checks: checks, validatedAt: nowIso() };
  }

  registerInstrumentationType({ id: "TRACE", title: "Execution Trace" });
  registerInstrumentationType({ id: "PERFORMANCE", title: "Performance Measurement" });
  registerInstrumentationType({ id: "STATE", title: "State Capture" });
  registerProbeType({ id: "START_END", title: "Start/End Probe", metric: "elapsed" });
  registerProbeType({ id: "COUNTER", title: "Call Counter", metric: "count" });
  registerProbeType({ id: "SNAPSHOT", title: "State Snapshot", metric: "state" });

  const api = { registerInstrumentationType, registerProbeType, previewInstrumentation, addInstrumentation, removeInstrumentation, verifyInstrumentation, createInvestigation, addInvestigationEvidence, recordPerformance, getPerformanceRanking, backupSource, restoreSource, verifyRestore, buildDiagnosticReport, getDiagnosticPlatformState, getDiagnosticPlatformStatus, validateDiagnosticPlatform };
  Object.keys(api).forEach(function (name) { global[name] = api[name]; });
  global.DiagnosticPlatform = Object.freeze(Object.assign({ id: COMPONENT_ID, version: VERSION }, api));
})(typeof window !== "undefined" ? window : globalThis);