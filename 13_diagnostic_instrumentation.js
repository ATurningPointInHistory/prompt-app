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
    state.createdAt = nowIso();
    touchState();

    return {
      id: "IDE-110-RESET",
      reset: true,
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
      resetDiagnosticInstrumentationState({ force: true });

      const created = createDiagnosticSession({
        title: "IDE-110 Validation",
        targetType: "Function",
        targetId: "validateDiagnosticInstrumentation"
      });

      check("Session creation", Boolean(created && created.id), created.id);

      const started = startDiagnosticSession(created.id);
      check("Session start", started.started === true, started.reason);

      const active = getActiveDiagnosticSession();
      check(
        "Active session state",
        Boolean(active && active.id === created.id && active.status === SESSION_STATUS.ACTIVE),
        active ? active.status : "No active session"
      );

      const completed = completeDiagnosticSession(created.id, { ok: true });
      check("Session completion", completed.completed === true, completed.reason);

      const finished = getDiagnosticSession(created.id);
      check(
        "Completed session state",
        Boolean(finished && finished.status === SESSION_STATUS.COMPLETED),
        finished ? finished.status : "Session missing"
      );

      const list = listDiagnosticSessions();
      check("Session listing", list.length === 1, "count=" + list.length);

      const status = getDiagnosticInstrumentationStatus();
      check(
        "Status API",
        Boolean(status && status.id === COMPONENT_ID && status.ready === true),
        status.status
      );

      const removed = removeDiagnosticSession(created.id);
      check("Session removal", removed.removed === true, removed.reason);
    } catch (error) {
      check("Unexpected exception", false, error.message || String(error));
    } finally {
      state.initialized = snapshot.initialized;
      state.enabled = snapshot.enabled;
      state.activeSessionId = snapshot.activeSessionId;
      state.sessions = snapshot.sessions;
      state.sequence = snapshot.sequence;
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
      health: total > 0 ? Math.round((passed / total) * 100) : 0,
      progress: total > 0 ? Math.round((passed / total) * 100) : 0,
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
})(typeof window !== "undefined" ? window : globalThis);