/* ============================================================
   FILE: 13_intelligence_platform_core.js
   IDE-170 Intelligence Platform
   Version: 1.1.0
   Phase: 2 Source Intake and Canonical Model
   Design Freeze: v1.0.0 / 2026-08-06
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-170";
  const COMPONENT_NAME = "Intelligence Platform";
  const VERSION = "1.1.0";
  const SCHEMA_VERSION = "1.0.0";
  const DESIGN_FREEZE_VERSION = "1.0.0";
  const IMPLEMENTATION_PHASE = "Phase 2 Source Intake and Canonical Model";
  const PHASE1_RELEASE_FROZEN = true;
  const MAX_SESSIONS = 100;
  const MAX_AUDIT_RECORDS = 1000;

  const SESSION_STATES = Object.freeze([
    "Created",
    "Active",
    "Cancelled",
    "Frozen"
  ]);

  const SESSION_TRANSITIONS = Object.freeze({
    Created: Object.freeze(["Active", "Cancelled", "Frozen"]),
    Active: Object.freeze(["Cancelled", "Frozen"]),
    Cancelled: Object.freeze(["Frozen"]),
    Frozen: Object.freeze([])
  });

  const namespace = global.IDE170Intelligence &&
    typeof global.IDE170Intelligence === "object"
    ? global.IDE170Intelligence
    : {};

  const internal = namespace.__internal &&
    typeof namespace.__internal === "object"
    ? namespace.__internal
    : {};

  const state = internal.state && typeof internal.state === "object"
    ? internal.state
    : {
        capabilities: new Map(),
        schemas: new Map(),
        sessions: new Map(),
        sourceAdapters: new Map(),
        sourceAdapterImplementations: new Map(),
        sourceIntakes: new Map(),
        canonicalSnapshots: new Map(),
        latestSourceIntakeId: null,
        latestCanonicalSnapshotId: null,
        audits: [],
        sequence: 0,
        initialized: false,
        initializing: false,
        lastValidation: null,
        lastError: null,
        integration: {
          statusRegistry: false,
          ideRegistry: false,
          dashboardRegistry: false,
          lastRegisteredAt: null
        },
        updatedAt: null
      };

  if (!(state.capabilities instanceof Map)) state.capabilities = new Map();
  if (!(state.schemas instanceof Map)) state.schemas = new Map();
  if (!(state.sessions instanceof Map)) state.sessions = new Map();
  if (!(state.sourceAdapters instanceof Map)) state.sourceAdapters = new Map();
  if (!(state.sourceAdapterImplementations instanceof Map)) state.sourceAdapterImplementations = new Map();
  if (!(state.sourceIntakes instanceof Map)) state.sourceIntakes = new Map();
  if (!(state.canonicalSnapshots instanceof Map)) state.canonicalSnapshots = new Map();
  if (!Array.isArray(state.audits)) state.audits = [];
  if (!Object.prototype.hasOwnProperty.call(state, "latestSourceIntakeId")) state.latestSourceIntakeId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestCanonicalSnapshotId")) state.latestCanonicalSnapshotId = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function text(value, fallback) {
    const normalized = String(value == null ? "" : value).trim();
    return normalized || String(fallback == null ? "" : fallback);
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    return value == null ? [] : [value];
  }

  function unique(values) {
    return [...new Set(asArray(values)
      .filter(function filterValue(item) {
        return item != null && String(item).trim() !== "";
      })
      .map(function mapValue(item) {
        return String(item).trim();
      }))];
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.getOwnPropertyNames(value).forEach(function freezeProperty(name) {
      deepFreeze(value[name]);
    });
    return Object.freeze(value);
  }

  function canonicalId(value) {
    return text(value, "").toUpperCase();
  }

  function nextId(prefix) {
    state.sequence += 1;
    const randomPart = global.crypto &&
      typeof global.crypto.getRandomValues === "function"
      ? (function buildRandomPart() {
          const values = new Uint32Array(1);
          global.crypto.getRandomValues(values);
          return values[0].toString(36).toUpperCase();
        })()
      : Math.floor(Math.random() * 0xFFFFFFFF).toString(36).toUpperCase();
    return text(prefix, COMPONENT_ID) + "-" +
      Date.now().toString(36).toUpperCase() + "-" +
      state.sequence.toString(36).toUpperCase() + "-" + randomPart;
  }

  function touch() {
    state.updatedAt = nowIso();
  }

  function buildResult(ok, code, status, data, options) {
    const settings = isPlainObject(options) ? options : {};
    return {
      ok: ok === true,
      id: text(settings.id, nextId("IDE-170-RESULT")),
      code: text(code, ok ? "OK" : "ERROR"),
      status: text(status, ok ? "Succeeded" : "Failed"),
      data: data == null ? null : clone(data),
      warnings: asArray(settings.warnings).map(String),
      error: settings.error ? clone(settings.error) : null,
      createdAt: nowIso()
    };
  }

  function setError(error, code) {
    const record = {
      code: text(code, "IDE170_ERROR"),
      message: error && error.message
        ? error.message
        : String(error || "Unknown error"),
      at: nowIso()
    };
    state.lastError = record;
    touch();
    return record;
  }

  function appendAudit(input) {
    const source = isPlainObject(input) ? input : {};
    const record = deepFreeze({
      auditId: nextId("IDE-170-AUDIT"),
      componentId: COMPONENT_ID,
      action: text(source.action, "UNSPECIFIED"),
      actor: text(source.actor, "System"),
      targetType: text(source.targetType, "Platform"),
      targetId: text(source.targetId, COMPONENT_ID),
      sessionId: text(source.sessionId, "") || null,
      capabilityId: text(source.capabilityId, "") || null,
      outcome: text(source.outcome, "Recorded"),
      detail: clone(source.detail || {}),
      immutable: true,
      createdAt: nowIso()
    });

    state.audits.push(record);
    if (state.audits.length > MAX_AUDIT_RECORDS) {
      state.audits.splice(0, state.audits.length - MAX_AUDIT_RECORDS);
    }
    touch();
    return clone(record);
  }

  function getAuditRecords(options) {
    const settings = isPlainObject(options) ? options : {};
    const action = text(settings.action, "");
    const sessionId = text(settings.sessionId, "");
    const capabilityId = canonicalId(settings.capabilityId);
    const outcome = text(settings.outcome, "");
    const since = settings.since ? Date.parse(settings.since) : NaN;
    const limit = Math.max(1, Math.min(500, Number(settings.limit) || 100));

    return state.audits
      .filter(function filterAudit(record) {
        if (action && record.action !== action) return false;
        if (sessionId && record.sessionId !== sessionId) return false;
        if (capabilityId && canonicalId(record.capabilityId) !== capabilityId) return false;
        if (outcome && record.outcome !== outcome) return false;
        if (Number.isFinite(since) && Date.parse(record.createdAt) < since) return false;
        return true;
      })
      .slice(-limit)
      .map(clone);
  }

  function getSessionMutable(sessionId) {
    return state.sessions.get(text(sessionId, "")) || null;
  }

  function isSessionTransitionAllowed(fromState, toState) {
    if (!SESSION_STATES.includes(fromState) || !SESSION_STATES.includes(toState)) {
      return false;
    }
    return SESSION_TRANSITIONS[fromState].includes(toState);
  }

  function transitionSession(sessionId, toState, options) {
    const settings = isPlainObject(options) ? options : {};
    const session = getSessionMutable(sessionId);

    if (!session) {
      return buildResult(false, "SESSION_NOT_FOUND", "Blocked", null, {
        error: { message: "Session was not found.", category: "Input Failure" }
      });
    }

    if (session.state === "Frozen" || session.frozen === true || Object.isFrozen(session)) {
      appendAudit({
        action: "SESSION_TRANSITION_BLOCKED",
        actor: settings.actor,
        targetType: "Session",
        targetId: session.sessionId,
        sessionId: session.sessionId,
        outcome: "Blocked",
        detail: { from: session.state, to: toState, reason: "Frozen Session" }
      });
      return buildResult(false, "SESSION_FROZEN", "Blocked", {
        sessionId: session.sessionId,
        state: session.state
      }, {
        error: { message: "Frozen Session cannot be modified.", category: "Governance Failure" }
      });
    }

    if (session.state === toState) {
      return buildResult(true, "SESSION_STATE_UNCHANGED", session.state, {
        session: clone(session)
      });
    }

    if (!isSessionTransitionAllowed(session.state, toState)) {
      appendAudit({
        action: "SESSION_TRANSITION_BLOCKED",
        actor: settings.actor,
        targetType: "Session",
        targetId: session.sessionId,
        sessionId: session.sessionId,
        outcome: "Blocked",
        detail: { from: session.state, to: toState, reason: "Invalid Transition" }
      });
      return buildResult(false, "SESSION_TRANSITION_INVALID", "Blocked", {
        sessionId: session.sessionId,
        from: session.state,
        to: toState
      }, {
        error: { message: "Requested Session state transition is not allowed.", category: "State Failure" }
      });
    }

    const fromState = session.state;
    const transition = {
      transitionId: nextId("IDE-170-SESSION-TRANSITION"),
      from: fromState,
      to: toState,
      reason: text(settings.reason, "State Transition"),
      actor: text(settings.actor, "System"),
      at: nowIso()
    };

    session.state = toState;
    session.status = toState;
    session.updatedAt = transition.at;
    session.transitionHistory.push(transition);
    if (toState === "Cancelled") session.cancelledAt = transition.at;
    if (toState === "Frozen") {
      session.frozen = true;
      session.frozenAt = transition.at;
      state.sessions.set(session.sessionId, deepFreeze(session));
    }

    appendAudit({
      action: "SESSION_STATE_TRANSITION",
      actor: settings.actor,
      targetType: "Session",
      targetId: session.sessionId,
      sessionId: session.sessionId,
      outcome: "Succeeded",
      detail: transition
    });

    touch();
    return buildResult(true, "SESSION_STATE_TRANSITIONED", toState, {
      session: clone(state.sessions.get(session.sessionId))
    });
  }

  function resolveRequestedCapabilities(options) {
    const settings = isPlainObject(options) ? options : {};
    const requested = ["IDE-170-CORE"].concat(asArray(
      settings.requiredCapabilities || settings.capabilities
    ));
    return unique(requested.map(function normalizeCapability(item) {
      return typeof item === "string"
        ? canonicalId(item)
        : canonicalId(item && (item.capabilityId || item.id));
    }).filter(Boolean));
  }

  function buildCapabilityBindings(capabilityIds) {
    const bindings = [];
    const missing = [];
    const blocked = [];

    capabilityIds.forEach(function bindCapability(capabilityId) {
      const capability = state.capabilities.get(canonicalId(capabilityId));
      if (!capability) {
        missing.push(capabilityId);
        return;
      }
      if (capability.status === "Blocked" || capability.enabled === false) {
        blocked.push(capabilityId);
        return;
      }
      bindings.push({
        capabilityId: capability.capabilityId,
        version: capability.version,
        status: capability.status
      });
    });

    return { bindings: bindings, missing: missing, blocked: blocked };
  }

  function startSession(options) {
    const settings = isPlainObject(options) ? options : {};
    const initialization = initialize(settings.initialization || {});
    if (!initialization.ok && state.initialized !== true) return initialization;

    if (state.sessions.size >= MAX_SESSIONS) {
      return buildResult(false, "SESSION_LIMIT_REACHED", "Blocked", null, {
        error: { message: "Session limit reached.", category: "Capacity Failure" }
      });
    }

    const requestedSessionId = text(settings.sessionId, "");
    const sessionId = requestedSessionId || nextId("IDE-170-SESSION");
    if (state.sessions.has(sessionId)) {
      appendAudit({
        action: "SESSION_CREATE_BLOCKED",
        actor: settings.actor,
        targetType: "Session",
        targetId: sessionId,
        sessionId: sessionId,
        outcome: "Blocked",
        detail: { reason: "Duplicate Session ID" }
      });
      return buildResult(false, "SESSION_ID_DUPLICATE", "Blocked", null, {
        error: { message: "Session ID already exists.", category: "Identity Failure" }
      });
    }

    const requestedCapabilities = resolveRequestedCapabilities(settings);
    const capabilityResolution = buildCapabilityBindings(requestedCapabilities);
    if (capabilityResolution.missing.length || capabilityResolution.blocked.length) {
      appendAudit({
        action: "SESSION_CREATE_BLOCKED",
        actor: settings.actor,
        targetType: "Session",
        targetId: sessionId,
        sessionId: sessionId,
        outcome: "Blocked",
        detail: capabilityResolution
      });
      return buildResult(false, "SESSION_CAPABILITY_UNAVAILABLE", "Blocked", {
        requiredCapabilities: requestedCapabilities,
        missing: capabilityResolution.missing,
        blocked: capabilityResolution.blocked
      }, {
        error: { message: "Session requires registered and enabled Capabilities.", category: "Dependency Failure" }
      });
    }

    if (namespace.api && typeof namespace.api.checkCapabilityDependencies === "function") {
      const dependencyProblems = capabilityResolution.bindings
        .map(function checkBinding(binding) {
          return namespace.api.checkCapabilityDependencies(binding.capabilityId);
        })
        .filter(function filterProblem(result) {
          return !result || result.ready !== true;
        });
      if (dependencyProblems.length) {
        return buildResult(false, "SESSION_CAPABILITY_DEPENDENCY_BLOCKED", "Blocked", {
          dependencyProblems: dependencyProblems
        }, {
          error: { message: "Capability dependency validation failed.", category: "Dependency Failure" }
        });
      }
    }

    const createdAt = nowIso();
    const session = {
      sessionId: sessionId,
      componentId: COMPONENT_ID,
      version: VERSION,
      sessionType: text(settings.sessionType || settings.type, "Intelligence"),
      purpose: text(settings.purpose || settings.goal, "IDE-170 Intelligence Session"),
      state: "Created",
      status: "Created",
      frozen: false,
      capabilityBindings: capabilityResolution.bindings,
      sourceReferences: asArray(settings.sourceReferences).map(clone),
      metadata: isPlainObject(settings.metadata) ? clone(settings.metadata) : {},
      transitionHistory: [],
      createdBy: text(settings.actor || settings.createdBy, "Project Owner"),
      createdAt: createdAt,
      updatedAt: createdAt,
      cancelledAt: null,
      frozenAt: null
    };

    state.sessions.set(sessionId, session);
    appendAudit({
      action: "SESSION_CREATED",
      actor: session.createdBy,
      targetType: "Session",
      targetId: sessionId,
      sessionId: sessionId,
      outcome: "Succeeded",
      detail: {
        sessionType: session.sessionType,
        requiredCapabilities: requestedCapabilities
      }
    });

    const activated = transitionSession(sessionId, "Active", {
      actor: session.createdBy,
      reason: "Session Start"
    });
    if (!activated.ok) {
      state.sessions.delete(sessionId);
      return activated;
    }

    return buildResult(true, "SESSION_STARTED", "Active", {
      session: getSession(sessionId)
    });
  }

  function getSession(sessionId) {
    return clone(getSessionMutable(sessionId));
  }

  function cancelSession(sessionId, options) {
    return transitionSession(sessionId, "Cancelled", Object.assign({}, options || {}, {
      reason: text(options && options.reason, "Session Cancellation")
    }));
  }

  function freezeSession(sessionId, options) {
    return transitionSession(sessionId, "Frozen", Object.assign({}, options || {}, {
      reason: text(options && options.reason, "Session Freeze")
    }));
  }

  function attachSessionSourceReference(sessionId, reference, options) {
    const settings = isPlainObject(options) ? options : {};
    const session = getSessionMutable(sessionId);
    if (!session) {
      return buildResult(false, "SESSION_NOT_FOUND", "Blocked", null, {
        error: { message: "Session was not found.", category: "Input Failure" }
      });
    }
    if (session.state === "Frozen" || session.frozen === true || Object.isFrozen(session)) {
      return buildResult(false, "SESSION_FROZEN", "Blocked", {
        sessionId: session.sessionId,
        state: session.state
      }, {
        error: { message: "Frozen Session cannot be modified.", category: "Governance Failure" }
      });
    }
    const normalized = isPlainObject(reference) ? clone(reference) : {};
    const referenceId = text(
      normalized.intakeId || normalized.snapshotId || normalized.referenceId,
      ""
    );
    const duplicate = referenceId && session.sourceReferences.some(function findReference(item) {
      return text(item && (item.intakeId || item.snapshotId || item.referenceId), "") === referenceId;
    });
    if (!duplicate) session.sourceReferences.push(normalized);
    session.updatedAt = nowIso();
    appendAudit({
      action: duplicate ? "SESSION_SOURCE_REFERENCE_EXISTS" : "SESSION_SOURCE_REFERENCE_ATTACHED",
      actor: text(settings.actor, "IDE-170"),
      targetType: "Session",
      targetId: session.sessionId,
      sessionId: session.sessionId,
      outcome: duplicate ? "Unchanged" : "Succeeded",
      detail: normalized
    });
    touch();
    return buildResult(true,
      duplicate ? "SESSION_SOURCE_REFERENCE_EXISTS" : "SESSION_SOURCE_REFERENCE_ATTACHED",
      session.state,
      { session: getSession(session.sessionId), reference: normalized });
  }

  function getDependencyStatus() {
    const moduleStatus = {
      core: Boolean(namespace.modules && namespace.modules.core),
      capabilityRegistry: Boolean(namespace.modules && namespace.modules.capabilityRegistry),
      schemaRegistry: Boolean(namespace.modules && namespace.modules.schemaRegistry),
      sourceAdapterFramework: Boolean(namespace.modules && namespace.modules.sourceAdapterFramework),
      repositorySourceAdapters: Boolean(namespace.modules && namespace.modules.repositorySourceAdapters),
      platformSourceAdapters: Boolean(namespace.modules && namespace.modules.platformSourceAdapters),
      canonicalModel: Boolean(namespace.modules && namespace.modules.canonicalModel),
      validation: Boolean(namespace.modules && namespace.modules.validation)
    };
    const requiredReady = Object.keys(moduleStatus).every(function allReady(key) {
      return moduleStatus[key] === true;
    });
    return {
      componentId: COMPONENT_ID,
      required: moduleStatus,
      requiredReady: requiredReady,
      external: {
        ide160: typeof global.getAIDevelopmentWorkflowStatus === "function",
        developmentStatusRegistry: typeof global.registerDevelopmentStatus === "function",
        ideRegistry: typeof global.registerIdeComponent === "function",
        dashboardRegistry: typeof global.registerDevelopmentDashboardModule === "function"
      },
      checkedAt: nowIso()
    };
  }

  function registerExternalIntegration() {
    const results = {
      statusRegistry: false,
      ideRegistry: false,
      dashboardRegistry: false
    };

    try {
      if (typeof global.registerDevelopmentStatus === "function") {
        const statusResult = global.registerDevelopmentStatus({
          id: COMPONENT_ID,
          statusApi: "getIntelligencePlatformStatus",
          validator: "validateIntelligencePlatform"
        }, { source: "built-in", persist: false });
        results.statusRegistry = Boolean(statusResult && statusResult.registered === true);
      }

      if (typeof global.registerIdeComponent === "function") {
        results.ideRegistry = global.registerIdeComponent({
          id: COMPONENT_ID,
          title: COMPONENT_NAME,
          summary: "公式SourceをAdapter経由で取得し、Immutable Canonical Snapshotへ変換するIntelligence Platform。Phase 2。",
          icon: "🧠",
          version: VERSION,
          status: "Phase 2",
          ready: state.initialized === true,
          progress: 25,
          health: state.lastValidation && Number(state.lastValidation.health) || 0,
          launcher: "",
          validator: "validateIntelligencePlatform",
          probe: "getIntelligencePlatformStatus",
          category: "Intelligence"
        }) === true;
      }

      if (typeof global.registerDevelopmentDashboardModule === "function") {
        const dashboardResult = global.registerDevelopmentDashboardModule({
          id: COMPONENT_ID,
          title: COMPONENT_NAME,
          statusApi: "getIntelligencePlatformStatus",
          validator: "validateIntelligencePlatform"
        });
        results.dashboardRegistry = Boolean(dashboardResult && dashboardResult.registered === true);
      }
    } catch (error) {
      setError(error, "IDE170_INTEGRATION_FAILED");
    }

    state.integration = {
      statusRegistry: results.statusRegistry,
      ideRegistry: results.ideRegistry,
      dashboardRegistry: results.dashboardRegistry,
      lastRegisteredAt: nowIso()
    };

    appendAudit({
      action: "PLATFORM_INTEGRATION_REGISTERED",
      actor: "System",
      targetType: "Platform",
      targetId: COMPONENT_ID,
      outcome: "Recorded",
      detail: results
    });
    return clone(state.integration);
  }

  function initialize(options) {
    const settings = isPlainObject(options) ? options : {};

    if (state.initialized && settings.force !== true) {
      return buildResult(true, "IDE170_ALREADY_INITIALIZED", "Ready", {
        status: getStatus()
      });
    }

    if (state.initializing) {
      return buildResult(false, "IDE170_INITIALIZATION_IN_PROGRESS", "Blocked", null, {
        error: { message: "Initialization is already in progress.", category: "State Failure" }
      });
    }

    state.initializing = true;
    try {
      const dependencyStatus = getDependencyStatus();
      if (!dependencyStatus.required.capabilityRegistry ||
          !dependencyStatus.required.schemaRegistry ||
          !dependencyStatus.required.sourceAdapterFramework ||
          !dependencyStatus.required.repositorySourceAdapters ||
          !dependencyStatus.required.platformSourceAdapters ||
          !dependencyStatus.required.canonicalModel ||
          !dependencyStatus.required.validation) {
        state.initializing = false;
        return buildResult(false, "IDE170_DEPENDENCY_MISSING", "Blocked", {
          dependencies: dependencyStatus
        }, {
          error: { message: "IDE-170 Phase 2 modules are not fully loaded.", category: "Dependency Failure" }
        });
      }

      if (namespace.api && typeof namespace.api.initializeCapabilityRegistry === "function") {
        const capabilityResult = namespace.api.initializeCapabilityRegistry();
        if (!capabilityResult.ok) throw new Error("Capability Registry initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeSchemaRegistry === "function") {
        const schemaResult = namespace.api.initializeSchemaRegistry();
        if (!schemaResult.ok) throw new Error("Schema Registry initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeSourceAdapterFramework === "function") {
        const sourceFrameworkResult = namespace.api.initializeSourceAdapterFramework();
        if (!sourceFrameworkResult.ok) throw new Error("Source Adapter Framework initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeRepositorySourceAdapters === "function") {
        const repositoryAdapterResult = namespace.api.initializeRepositorySourceAdapters();
        if (!repositoryAdapterResult.ok) throw new Error("Repository Source Adapter initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializePlatformSourceAdapters === "function") {
        const platformAdapterResult = namespace.api.initializePlatformSourceAdapters();
        if (!platformAdapterResult.ok) throw new Error("Platform Source Adapter initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeCanonicalModel === "function") {
        const canonicalModelResult = namespace.api.initializeCanonicalModel();
        if (!canonicalModelResult.ok) throw new Error("Canonical Model initialization failed.");
      }

      state.initialized = true;
      state.lastError = null;
      touch();

      if (settings.registerIntegration !== false) {
        registerExternalIntegration();
      }

      appendAudit({
        action: "PLATFORM_INITIALIZED",
        actor: text(settings.actor, "System"),
        targetType: "Platform",
        targetId: COMPONENT_ID,
        outcome: "Succeeded",
        detail: {
          version: VERSION,
          phase: IMPLEMENTATION_PHASE,
          duplicateProtection: true
        }
      });

      return buildResult(true, "IDE170_INITIALIZED", "Ready", {
        status: getStatus()
      });
    } catch (error) {
      const errorRecord = setError(error, "IDE170_INITIALIZATION_FAILED");
      return buildResult(false, "IDE170_INITIALIZATION_FAILED", "Failed", null, {
        error: {
          message: errorRecord.message,
          category: "System Failure"
        }
      });
    } finally {
      state.initializing = false;
    }
  }

  function getReleaseStatus() {
    const validation = state.lastValidation;
    const dependencyStatus = getDependencyStatus();
    const androidValidation = validation && validation.androidRealDeviceValidation;
    const androidPassed = Boolean(androidValidation && androidValidation.passed === true);
    const codeValidationPassed = Boolean(
      validation && validation.valid === true && validation.failed === 0
    );
    const releaseReady = Boolean(
      state.initialized &&
      dependencyStatus.requiredReady &&
      codeValidationPassed &&
      androidPassed
    );

    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      phase: IMPLEMENTATION_PHASE,
      releaseStatus: releaseReady
        ? "Phase 2 Ready"
        : codeValidationPassed && !androidPassed
          ? "Conditional - Phase 2 Android Validation Pending"
          : validation
            ? "Blocked"
            : "Not Validated",
      releaseAllowed: releaseReady,
      validationStatus: validation ? validation.status : "Not Run",
      health: validation && Number.isFinite(Number(validation.health))
        ? Number(validation.health)
        : null,
      independentValidationRequired: true,
      codeValidationPassed: codeValidationPassed,
      androidRealDevicePassed: androidPassed,
      phase1ReleaseFrozen: PHASE1_RELEASE_FROZEN,
      phase2Allowed: PHASE1_RELEASE_FROZEN,
      phase3Allowed: releaseReady,
      checkedAt: nowIso()
    };
  }

  function getStatus() {
    const dependencies = getDependencyStatus();
    const validation = state.lastValidation;
    const release = getReleaseStatus();
    return {
      id: "IDE-170-STATUS",
      componentId: COMPONENT_ID,
      name: COMPONENT_NAME,
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      designFreezeVersion: DESIGN_FREEZE_VERSION,
      implementationPhase: IMPLEMENTATION_PHASE,
      implementationStatus: state.initialized
        ? "Phase 2 Source Intake and Canonical Model Implemented"
        : "Loaded",
      status: state.lastError
        ? "Degraded"
        : state.initialized
          ? "Ready"
          : "Loaded",
      ready: Boolean(state.initialized && dependencies.requiredReady && !state.lastError),
      available: true,
      initialized: state.initialized === true,
      progress: 25,
      phaseProgress: state.initialized ? 100 : 25,
      modules: clone(dependencies.required),
      capabilityCount: state.capabilities.size,
      schemaCount: state.schemas.size,
      sourceAdapterCount: state.sourceAdapters.size,
      sourceIntakeCount: state.sourceIntakes.size,
      canonicalSnapshotCount: state.canonicalSnapshots.size,
      latestSourceIntakeId: state.latestSourceIntakeId,
      latestCanonicalSnapshotId: state.latestCanonicalSnapshotId,
      sessionCount: state.sessions.size,
      frozenSessionCount: [...state.sessions.values()].filter(function countFrozen(item) {
        return item && item.state === "Frozen";
      }).length,
      auditCount: state.audits.length,
      validationStatus: validation ? validation.status : "Not Run",
      health: validation && Number.isFinite(Number(validation.health))
        ? Number(validation.health)
        : null,
      releaseStatus: release.releaseStatus,
      releaseAllowed: release.releaseAllowed,
      phase1ReleaseFrozen: PHASE1_RELEASE_FROZEN,
      dependencyStatus: dependencies,
      integration: clone(state.integration),
      directRepositoryMutationAllowed: false,
      missingInformationInferenceAllowed: false,
      canonicalFactInferenceAllowed: false,
      automaticRecommendationApplicationAllowed: false,
      automaticWorkflowExecutionAllowed: false,
      githubAutomaticReflectionAllowed: false,
      phase2Started: true,
      phase2Complete: state.initialized === true && dependencies.requiredReady,
      phase3Started: false,
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt || nowIso()
    };
  }

  function removeSessionForValidation(sessionId) {
    return state.sessions.delete(text(sessionId, ""));
  }

  namespace.componentId = COMPONENT_ID;
  namespace.name = COMPONENT_NAME;
  namespace.version = VERSION;
  namespace.schemaVersion = SCHEMA_VERSION;
  namespace.designFreezeVersion = DESIGN_FREEZE_VERSION;
  namespace.implementationPhase = IMPLEMENTATION_PHASE;
  namespace.constants = namespace.constants || {};
  namespace.modules = namespace.modules || {};
  namespace.api = namespace.api || {};

  if (!namespace.__internal) {
    Object.defineProperty(namespace, "__internal", {
      value: internal,
      enumerable: false,
      configurable: false,
      writable: false
    });
  }

  Object.assign(namespace.constants, {
    COMPONENT_ID: COMPONENT_ID,
    COMPONENT_NAME: COMPONENT_NAME,
    VERSION: VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    DESIGN_FREEZE_VERSION: DESIGN_FREEZE_VERSION,
    IMPLEMENTATION_PHASE: IMPLEMENTATION_PHASE,
    PHASE1_RELEASE_FROZEN: PHASE1_RELEASE_FROZEN,
    SESSION_STATES: SESSION_STATES,
    SESSION_TRANSITIONS: SESSION_TRANSITIONS
  });

  Object.assign(internal, {
    state: state,
    nowIso: nowIso,
    text: text,
    asArray: asArray,
    unique: unique,
    isPlainObject: isPlainObject,
    clone: clone,
    deepFreeze: deepFreeze,
    canonicalId: canonicalId,
    nextId: nextId,
    touch: touch,
    buildResult: buildResult,
    setError: setError,
    appendAudit: appendAudit,
    transitionSession: transitionSession,
    isSessionTransitionAllowed: isSessionTransitionAllowed,
    getSessionMutable: getSessionMutable,
    attachSessionSourceReference: attachSessionSourceReference,
    removeSessionForValidation: removeSessionForValidation,
    registerExternalIntegration: registerExternalIntegration,
    limits: {
      maximumSessions: MAX_SESSIONS,
      maximumAuditRecords: MAX_AUDIT_RECORDS
    }
  });

  Object.assign(namespace.api, {
    initialize: initialize,
    getStatus: getStatus,
    startSession: startSession,
    getSession: getSession,
    cancelSession: cancelSession,
    freezeSession: freezeSession,
    getAuditRecords: getAuditRecords,
    getDependencyStatus: getDependencyStatus,
    getReleaseStatus: getReleaseStatus
  });

  Object.assign(namespace, {
    initialize: initialize,
    getStatus: getStatus,
    startSession: startSession,
    getSession: getSession,
    cancelSession: cancelSession,
    freezeSession: freezeSession,
    getAuditRecords: getAuditRecords,
    getDependencyStatus: getDependencyStatus,
    getReleaseStatus: getReleaseStatus
  });

  namespace.modules.core = {
    id: "IDE-170-CORE",
    version: VERSION,
    status: "Ready",
    sessionLifecycle: true,
    audit: true,
    statusApi: true,
    loadedAt: nowIso()
  };

  global.IDE170Intelligence = namespace;
  global.initializeIntelligencePlatform = initialize;
  global.getIntelligencePlatformStatus = getStatus;
  global.startIntelligenceSession = startSession;
  global.getIntelligenceSession = getSession;
  global.cancelIntelligenceSession = cancelSession;
  global.freezeIntelligenceSession = freezeSession;
  global.getIntelligenceAuditRecords = getAuditRecords;
  global.getIntelligencePlatformReleaseStatus = getReleaseStatus;
})(typeof window !== "undefined" ? window : globalThis);
