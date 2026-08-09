/* ============================================================
   FILE: 13_intelligence_platform_core.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 8: Intelligence Package
   Design Freeze: v1.0.0 / 2026-08-06
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-170";
  const COMPONENT_NAME = "Intelligence Platform";
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("IDE-170 platformCore blocked: Version Manifest is not loaded.");
    return;
  }
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("platformCore");
  const INTERNAL_MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const capabilityVersion = VERSION_MANIFEST.getCapabilityVersion;
  const schemaVersion = VERSION_MANIFEST.getSchemaVersion;
  const artifactVersion = VERSION_MANIFEST.getArtifactVersion;
  const datasetVersion = VERSION_MANIFEST.getDatasetVersion;
  const SCHEMA_VERSION = VERSION_MANIFEST.contractVersions.coreApi;
  const DESIGN_FREEZE_VERSION = VERSION_MANIFEST.release.designFreezeVersion;
  const IMPLEMENTATION_PHASE = VERSION_MANIFEST.release.implementationPhase;
  const PHASE1_RELEASE_FROZEN = true;
  const PHASE2_RELEASE_FROZEN = true;
  const PHASE3_RELEASE_FROZEN = true;
  const PROCEDURE_COMPILER_RELEASE_FROZEN = true;
  const PHASE4_RELEASE_FROZEN = true;
  const PHASE5_RELEASE_FROZEN = true;
  const PHASE6_RELEASE_FROZEN = true;
  const PHASE7_RELEASE_FROZEN = true;
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
        repositorySnapshots: new Map(),
        testDatasets: new Map(),
        validationTargets: new Map(),
        validationRuns: new Map(),
        validationEvidencePackages: new Map(),
        validationEvidenceBlobs: new Map(),
        testProcedures: new Map(),
        parsedTestProcedures: new Map(),
        validationDatasetCandidates: new Map(),
        relationshipTypes: new Map(),
        evidenceGraphSnapshots: new Map(),
        understandingResults: new Map(),
        terminologyRecords: new Map(),
        typedQueries: new Map(),
        queryResults: new Map(),
        explainableEnvelopes: new Map(),
        intelligenceArtifacts: new Map(),
        intelligencePackages: new Map(),
        packageValidations: new Map(),
        ide180Handoffs: new Map(),
        intelligencePackageExports: new Map(),
        latestSourceIntakeId: null,
        latestCanonicalSnapshotId: null,
        latestRepositorySnapshotId: null,
        latestRepositoryBaselineId: null,
        latestTestDatasetId: null,
        latestValidationRunId: null,
        latestValidationEvidencePackageId: null,
        latestTestProcedureId: null,
        latestParsedTestProcedureId: null,
        latestValidationDatasetCandidateId: null,
        latestEvidenceGraphSnapshotId: null,
        latestUnderstandingResultId: null,
        latestTypedQueryId: null,
        latestQueryResultId: null,
        latestExplainableEnvelopeId: null,
        latestIntelligencePackageId: null,
        latestIDE180HandoffId: null,
        activeImportedProcedureDatasetId: null,
        lastAutomationValidation: null,
        lastProcedureValidation: null,
        lastEvidenceGraphValidation: null,
        lastUnderstandingValidation: null,
        lastQueryValidation: null,
        lastConfidenceValidation: null,
        lastPackageValidation: null,
        lastPackagePhaseValidation: null,
        lastPackageReleaseReceipt: null,
        lastPackageReleaseRestore: null,
        packageReleasePersistenceStatus: "Not Initialized",
        validationPersistenceStatus: "Not Initialized",
        lastValidationGateReceipt: null,
        lastValidationGateRestore: null,
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
  if (!(state.repositorySnapshots instanceof Map)) state.repositorySnapshots = new Map();
  if (!(state.testDatasets instanceof Map)) state.testDatasets = new Map();
  if (!(state.validationTargets instanceof Map)) state.validationTargets = new Map();
  if (!(state.validationRuns instanceof Map)) state.validationRuns = new Map();
  if (!(state.validationEvidencePackages instanceof Map)) state.validationEvidencePackages = new Map();
  if (!(state.validationEvidenceBlobs instanceof Map)) state.validationEvidenceBlobs = new Map();
  if (!(state.testProcedures instanceof Map)) state.testProcedures = new Map();
  if (!(state.parsedTestProcedures instanceof Map)) state.parsedTestProcedures = new Map();
  if (!(state.validationDatasetCandidates instanceof Map)) state.validationDatasetCandidates = new Map();
  if (!(state.relationshipTypes instanceof Map)) state.relationshipTypes = new Map();
  if (!(state.evidenceGraphSnapshots instanceof Map)) state.evidenceGraphSnapshots = new Map();
  if (!(state.understandingResults instanceof Map)) state.understandingResults = new Map();
  if (!(state.terminologyRecords instanceof Map)) state.terminologyRecords = new Map();
  if (!(state.typedQueries instanceof Map)) state.typedQueries = new Map();
  if (!(state.queryResults instanceof Map)) state.queryResults = new Map();
  if (!(state.explainableEnvelopes instanceof Map)) state.explainableEnvelopes = new Map();
  if (!(state.intelligenceArtifacts instanceof Map)) state.intelligenceArtifacts = new Map();
  if (!(state.intelligencePackages instanceof Map)) state.intelligencePackages = new Map();
  if (!(state.packageValidations instanceof Map)) state.packageValidations = new Map();
  if (!(state.ide180Handoffs instanceof Map)) state.ide180Handoffs = new Map();
  if (!(state.intelligencePackageExports instanceof Map)) state.intelligencePackageExports = new Map();
  if (!Array.isArray(state.audits)) state.audits = [];
  if (!Object.prototype.hasOwnProperty.call(state, "latestSourceIntakeId")) state.latestSourceIntakeId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestCanonicalSnapshotId")) state.latestCanonicalSnapshotId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestRepositorySnapshotId")) state.latestRepositorySnapshotId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestRepositoryBaselineId")) state.latestRepositoryBaselineId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestTestDatasetId")) state.latestTestDatasetId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestValidationRunId")) state.latestValidationRunId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestValidationEvidencePackageId")) state.latestValidationEvidencePackageId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestTestProcedureId")) state.latestTestProcedureId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestParsedTestProcedureId")) state.latestParsedTestProcedureId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestValidationDatasetCandidateId")) state.latestValidationDatasetCandidateId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestEvidenceGraphSnapshotId")) state.latestEvidenceGraphSnapshotId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestUnderstandingResultId")) state.latestUnderstandingResultId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestTypedQueryId")) state.latestTypedQueryId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestQueryResultId")) state.latestQueryResultId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestExplainableEnvelopeId")) state.latestExplainableEnvelopeId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestIntelligencePackageId")) state.latestIntelligencePackageId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "latestIDE180HandoffId")) state.latestIDE180HandoffId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "activeImportedProcedureDatasetId")) state.activeImportedProcedureDatasetId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastAutomationValidation")) state.lastAutomationValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastProcedureValidation")) state.lastProcedureValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastEvidenceGraphValidation")) state.lastEvidenceGraphValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastUnderstandingValidation")) state.lastUnderstandingValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastQueryValidation")) state.lastQueryValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastConfidenceValidation")) state.lastConfidenceValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackageValidation")) state.lastPackageValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackagePhaseValidation")) state.lastPackagePhaseValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackageReleaseReceipt")) state.lastPackageReleaseReceipt = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackageReleaseRestore")) state.lastPackageReleaseRestore = null;
  if (!Object.prototype.hasOwnProperty.call(state, "packageReleasePersistenceStatus")) state.packageReleasePersistenceStatus = "Not Initialized";
  if (!Object.prototype.hasOwnProperty.call(state, "validationPersistenceStatus")) state.validationPersistenceStatus = "Not Initialized";
  if (!Object.prototype.hasOwnProperty.call(state, "lastValidationGateReceipt")) state.lastValidationGateReceipt = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastValidationGateRestore")) state.lastValidationGateRestore = null;

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
      version: RELEASE_VERSION,
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
      relationshipSourceAdapter: Boolean(namespace.modules && namespace.modules.relationshipSourceAdapter),
      canonicalModel: Boolean(namespace.modules && namespace.modules.canonicalModel),
      repositorySnapshot: Boolean(namespace.modules && namespace.modules.repositorySnapshot),
      relationshipRegistry: Boolean(namespace.modules && namespace.modules.relationshipRegistry),
      evidenceGraph: Boolean(namespace.modules && namespace.modules.evidenceGraph),
      repositoryUnderstanding: Boolean(namespace.modules && namespace.modules.repositoryUnderstanding),
      workflowUnderstanding: Boolean(namespace.modules && namespace.modules.workflowUnderstanding),
      understandingPipeline: Boolean(namespace.modules && namespace.modules.understandingPipeline),
      terminologyRegistry: Boolean(namespace.modules && namespace.modules.terminologyRegistry),
      queryInterpreter: Boolean(namespace.modules && namespace.modules.queryInterpreter),
      queryEngine: Boolean(namespace.modules && namespace.modules.queryEngine),
      confidence: Boolean(namespace.modules && namespace.modules.confidence),
      independentValidation: Boolean(namespace.modules && namespace.modules.independentValidation),
      validationPersistence: Boolean(namespace.modules && namespace.modules.validationPersistence),
      packageModel: Boolean(namespace.modules && namespace.modules.packageModel),
      packageValidation: Boolean(namespace.modules && namespace.modules.packageValidation),
      ide180Handoff: Boolean(namespace.modules && namespace.modules.ide180Handoff),
      packageExport: Boolean(namespace.modules && namespace.modules.packageExport),
      testDatasetRegistry: Boolean(namespace.modules && namespace.modules.testDatasetRegistry),
      validationAutomation: Boolean(namespace.modules && namespace.modules.validationAutomation),
      validationEvidence: Boolean(namespace.modules && namespace.modules.validationEvidence),
      testProcedureIntake: Boolean(namespace.modules && namespace.modules.testProcedureIntake),
      testProcedureParser: Boolean(namespace.modules && namespace.modules.testProcedureParser),
      validationCompiler: Boolean(namespace.modules && namespace.modules.validationCompiler),
      testProcedureUI: Boolean(namespace.modules && namespace.modules.testProcedureUI),
      versionValidation: Boolean(namespace.modules && namespace.modules.versionValidation),
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
          summary: "IDE-170 Intelligence Platform。Phase 8でImmutable Intelligence Package、Package Validation、ZIP/IndexedDB Export、IDE-180 Handoffを提供。",
          icon: "🧠",
          version: RELEASE_VERSION,
          status: "Phase 8 Intelligence Package",
          ready: state.initialized === true,
          progress: 100,
          health: state.lastPackagePhaseValidation && Number(state.lastPackagePhaseValidation.health) || state.lastConfidenceValidation && Number(state.lastConfidenceValidation.health) || state.lastQueryValidation && Number(state.lastQueryValidation.health) || state.lastUnderstandingValidation && Number(state.lastUnderstandingValidation.health) || state.lastValidation && Number(state.lastValidation.health) || 0,
          launcher: "openIntelligenceTestProcedureConsole",
          validator: "validateIntelligencePackagePhase",
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
          !dependencyStatus.required.relationshipSourceAdapter ||
          !dependencyStatus.required.canonicalModel ||
          !dependencyStatus.required.repositorySnapshot ||
          !dependencyStatus.required.relationshipRegistry ||
          !dependencyStatus.required.evidenceGraph ||
          !dependencyStatus.required.repositoryUnderstanding ||
          !dependencyStatus.required.workflowUnderstanding ||
          !dependencyStatus.required.understandingPipeline ||
          !dependencyStatus.required.terminologyRegistry ||
          !dependencyStatus.required.queryInterpreter ||
          !dependencyStatus.required.queryEngine ||
          !dependencyStatus.required.confidence ||
          !dependencyStatus.required.independentValidation ||
          !dependencyStatus.required.validationPersistence ||
          !dependencyStatus.required.packageModel ||
          !dependencyStatus.required.packageValidation ||
          !dependencyStatus.required.ide180Handoff ||
          !dependencyStatus.required.packageExport ||
          !dependencyStatus.required.testDatasetRegistry ||
          !dependencyStatus.required.validationAutomation ||
          !dependencyStatus.required.validationEvidence ||
          !dependencyStatus.required.testProcedureIntake ||
          !dependencyStatus.required.testProcedureParser ||
          !dependencyStatus.required.validationCompiler ||
          !dependencyStatus.required.testProcedureUI ||
          !dependencyStatus.required.versionValidation ||
          !dependencyStatus.required.validation) {
        state.initializing = false;
        return buildResult(false, "IDE170_DEPENDENCY_MISSING", "Blocked", {
          dependencies: dependencyStatus
        }, {
          error: { message: "IDE-170 Phase 8 required modules are not fully loaded.", category: "Dependency Failure" }
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

      if (namespace.api && typeof namespace.api.initializeVersionValidation === "function") {
        const versionValidationResult = namespace.api.initializeVersionValidation();
        if (!versionValidationResult.ok) throw new Error("Version Validation initialization failed.");
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

      if (namespace.api && typeof namespace.api.initializeRelationshipSourceAdapter === "function") {
        const relationshipAdapterResult = namespace.api.initializeRelationshipSourceAdapter();
        if (!relationshipAdapterResult.ok) throw new Error("Relationship Source Adapter initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeCanonicalModel === "function") {
        const canonicalModelResult = namespace.api.initializeCanonicalModel();
        if (!canonicalModelResult.ok) throw new Error("Canonical Model initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeRepositorySnapshot === "function") {
        const repositorySnapshotResult = namespace.api.initializeRepositorySnapshot();
        if (!repositorySnapshotResult.ok) throw new Error("Repository Snapshot initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeRelationshipRegistry === "function") {
        const relationshipRegistryResult = namespace.api.initializeRelationshipRegistry();
        if (!relationshipRegistryResult.ok) throw new Error("Relationship Registry initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeEvidenceGraph === "function") {
        const evidenceGraphResult = namespace.api.initializeEvidenceGraph();
        if (!evidenceGraphResult.ok) throw new Error("Evidence Graph initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeRepositoryUnderstanding === "function") {
        const repositoryUnderstandingResult = namespace.api.initializeRepositoryUnderstanding();
        if (!repositoryUnderstandingResult.ok) throw new Error("Repository Understanding initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeWorkflowUnderstanding === "function") {
        const workflowUnderstandingResult = namespace.api.initializeWorkflowUnderstanding();
        if (!workflowUnderstandingResult.ok) throw new Error("Workflow Understanding initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeUnderstandingPipeline === "function") {
        const understandingPipelineResult = namespace.api.initializeUnderstandingPipeline();
        if (!understandingPipelineResult.ok) throw new Error("Understanding Pipeline initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeTerminologyRegistry === "function") {
        const terminologyResult = namespace.api.initializeTerminologyRegistry();
        if (!terminologyResult.ok) throw new Error("Terminology Registry initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeQueryInterpreter === "function") {
        const queryInterpreterResult = namespace.api.initializeQueryInterpreter();
        if (!queryInterpreterResult.ok) throw new Error("Query Interpreter initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeTestDatasetRegistry === "function") {
        const datasetRegistryResult = namespace.api.initializeTestDatasetRegistry();
        if (!datasetRegistryResult.ok) throw new Error("Test Dataset Registry initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeValidationAutomation === "function") {
        const automationResult = namespace.api.initializeValidationAutomation();
        if (!automationResult.ok) throw new Error("Validation Automation initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeConfidence === "function") {
        const confidenceResult = namespace.api.initializeConfidence();
        if (!confidenceResult.ok) throw new Error("Confidence initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeIndependentValidation === "function") {
        const independentValidationResult = namespace.api.initializeIndependentValidation();
        if (!independentValidationResult.ok) throw new Error("Independent Validation initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeQueryEngine === "function") {
        const queryEngineResult = namespace.api.initializeQueryEngine();
        if (!queryEngineResult.ok) throw new Error("Query Engine initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeValidationPersistence === "function") {
        const persistenceResult = namespace.api.initializeValidationPersistence();
        if (!persistenceResult.ok) throw new Error("Validation Persistence initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializePackageModel === "function") {
        const packageModelResult = namespace.api.initializePackageModel();
        if (!packageModelResult.ok) throw new Error("Package Model initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeIDE180Handoff === "function") {
        const handoffResult = namespace.api.initializeIDE180Handoff();
        if (!handoffResult.ok) throw new Error("IDE-180 Handoff initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializePackageValidation === "function") {
        const packageValidationResult = namespace.api.initializePackageValidation();
        if (!packageValidationResult.ok) throw new Error("Package Validation initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializePackageExport === "function") {
        const packageExportResult = namespace.api.initializePackageExport();
        if (!packageExportResult.ok) throw new Error("Package Export initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeValidationEvidence === "function") {
        const evidenceResult = namespace.api.initializeValidationEvidence();
        if (!evidenceResult.ok) throw new Error("Validation Evidence initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeTestProcedureIntake === "function") {
        const procedureIntakeResult = namespace.api.initializeTestProcedureIntake();
        if (!procedureIntakeResult.ok) throw new Error("Test Procedure Intake initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeTestProcedureParser === "function") {
        const procedureParserResult = namespace.api.initializeTestProcedureParser();
        if (!procedureParserResult.ok) throw new Error("Test Procedure Parser initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeValidationCompiler === "function") {
        const compilerResult = namespace.api.initializeValidationCompiler();
        if (!compilerResult.ok) throw new Error("Validation Compiler initialization failed.");
      }

      if (namespace.api && typeof namespace.api.initializeTestProcedureUI === "function") {
        const uiResult = namespace.api.initializeTestProcedureUI();
        if (!uiResult.ok) throw new Error("Test Procedure UI initialization failed.");
      }

      state.initialized = true;
      state.lastError = null;
      touch();

      if (namespace.api && typeof namespace.api.restoreValidationGateReceipt === "function" && settings.restoreValidationReceipt !== false) {
        Promise.resolve(namespace.api.restoreValidationGateReceipt({ automatic: true })).catch(function ignoreRestoreError() {});
      }
      if (namespace.api && typeof namespace.api.restorePackageReleaseReceipt === "function" && settings.restorePackageReleaseReceipt !== false) {
        Promise.resolve(namespace.api.restorePackageReleaseReceipt({ automatic: true })).catch(function ignorePackageRestoreError() {});
      }

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
          version: RELEASE_VERSION,
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
    const dependencyStatus = getDependencyStatus();
    const packageValidation = state.lastPackagePhaseValidation;
    const androidValidation = packageValidation && packageValidation.androidRealDeviceValidation;
    const androidPassed = Boolean(androidValidation && androidValidation.passed === true);
    const packageCodePassed = Boolean(packageValidation && packageValidation.valid === true && packageValidation.failed === 0);
    const completionGateAllowed = Boolean(packageValidation && packageValidation.completionGate === "Allowed");
    const handoffReady = Boolean(packageValidation && packageValidation.handoffId);
    const versionValidation = state.lastVersionArchitectureValidation;
    const versionArchitecturePassed = Boolean(
      versionValidation && versionValidation.valid === true && versionValidation.failed === 0 &&
      versionValidation.staticManifestValidated === true && versionValidation.fullScriptHashValidated === true &&
      versionValidation.releaseGateAllowed === true
    );
    const releaseReady = Boolean(
      state.initialized && dependencyStatus.requiredReady && PHASE7_RELEASE_FROZEN &&
      packageCodePassed && androidPassed && completionGateAllowed && handoffReady && versionArchitecturePassed
    );
    return {
      componentId: COMPONENT_ID, version: RELEASE_VERSION, phase: IMPLEMENTATION_PHASE,
      releaseStatus: releaseReady ? "Phase 8 Intelligence Package Ready"
        : packageCodePassed && androidPassed && !versionArchitecturePassed ? "Conditional - Phase 8 Static Integrity Validation Pending"
        : packageCodePassed && !androidPassed ? "Conditional - Phase 8 Android Validation Pending"
        : packageValidation ? "Blocked" : "Phase 8 Validation Not Run",
      releaseAllowed: releaseReady,
      validationStatus: packageValidation ? packageValidation.status : "Not Run",
      health: packageValidation && Number.isFinite(Number(packageValidation.health)) ? Number(packageValidation.health) : null,
      packageValidationPassed: packageCodePassed,
      packageCompletionGateAllowed: completionGateAllowed,
      ide180HandoffReady: handoffReady,
      packageId: packageValidation && packageValidation.packageId || null,
      packageHash: packageValidation && packageValidation.packageHash || null,
      handoffId: packageValidation && packageValidation.handoffId || null,
      androidRealDevicePassed: androidPassed,
      versionArchitecture: VERSION_MANIFEST.versionArchitecture,
      versionArchitectureValidationStatus: versionValidation ? versionValidation.status : "Not Run",
      versionArchitectureHealth: versionValidation ? versionValidation.health : null,
      versionArchitecturePassed: versionArchitecturePassed,
      validationPersistenceStatus: state.validationPersistenceStatus || "Not Initialized",
      validationGateReceiptPresent: Boolean(state.lastValidationGateReceipt),
      packageReleasePersistenceStatus: state.packageReleasePersistenceStatus || "Not Initialized",
      packageReleaseReceiptPresent: Boolean(state.lastPackageReleaseReceipt),
      phase1ReleaseFrozen: PHASE1_RELEASE_FROZEN, phase2ReleaseFrozen: PHASE2_RELEASE_FROZEN,
      phase3ReleaseFrozen: PHASE3_RELEASE_FROZEN, procedureCompilerReleaseFrozen: PROCEDURE_COMPILER_RELEASE_FROZEN,
      phase4ReleaseFrozen: PHASE4_RELEASE_FROZEN, phase5ReleaseFrozen: PHASE5_RELEASE_FROZEN, phase6ReleaseFrozen: PHASE6_RELEASE_FROZEN, phase7ReleaseFrozen: PHASE7_RELEASE_FROZEN,
      phase2Allowed: PHASE1_RELEASE_FROZEN, phase3Allowed: PHASE2_RELEASE_FROZEN,
      phase4Allowed: PROCEDURE_COMPILER_RELEASE_FROZEN, phase5Allowed: PHASE4_RELEASE_FROZEN,
      phase6Allowed: PHASE5_RELEASE_FROZEN, phase7Allowed: PHASE6_RELEASE_FROZEN, phase8Allowed: PHASE7_RELEASE_FROZEN,
      ide180Allowed: releaseReady, checkedAt: nowIso()
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
      version: RELEASE_VERSION,
      moduleVersion: MODULE_VERSION,
      versionArchitecture: VERSION_MANIFEST.versionArchitecture,
      versionManifestContractVersion: VERSION_MANIFEST.manifestContractVersion,
      schemaVersion: SCHEMA_VERSION,
      designFreezeVersion: DESIGN_FREEZE_VERSION,
      implementationPhase: IMPLEMENTATION_PHASE,
      implementationStatus: state.initialized
        ? "Phase 8 Intelligence Package Implemented"
        : "Loaded",
      status: state.lastError
        ? "Degraded"
        : state.initialized
          ? "Ready"
          : "Loaded",
      ready: Boolean(state.initialized && dependencies.requiredReady && !state.lastError),
      available: true,
      initialized: state.initialized === true,
      progress: 100,
      phaseProgress: state.initialized ? 100 : 50,
      validationAutomationFoundationProgress: 100,
      testProcedureCompilerProgress: 100,
      evidenceGraphProgress: 100,
      understandingProgress: 100,
      queryExplanationProgress: 100,
      confidenceValidationProgress: 100,
      intelligencePackageProgress: state.initialized ? 100 : 0,
      modules: clone(dependencies.required),
      capabilityCount: state.capabilities.size,
      schemaCount: state.schemas.size,
      sourceAdapterCount: state.sourceAdapters.size,
      sourceIntakeCount: state.sourceIntakes.size,
      canonicalSnapshotCount: state.canonicalSnapshots.size,
      latestSourceIntakeId: state.latestSourceIntakeId,
      latestCanonicalSnapshotId: state.latestCanonicalSnapshotId,
      repositorySnapshotCount: state.repositorySnapshots.size,
      latestRepositorySnapshotId: state.latestRepositorySnapshotId,
      latestRepositoryBaselineId: state.latestRepositoryBaselineId,
      testDatasetCount: state.testDatasets.size,
      validationTargetCount: state.validationTargets.size,
      validationRunCount: state.validationRuns.size,
      validationEvidencePackageCount: state.validationEvidencePackages.size,
      testProcedureCount: state.testProcedures.size,
      parsedTestProcedureCount: state.parsedTestProcedures.size,
      validationDatasetCandidateCount: state.validationDatasetCandidates.size,
      relationshipTypeCount: state.relationshipTypes.size,
      evidenceGraphCount: state.evidenceGraphSnapshots.size,
      understandingResultCount: state.understandingResults.size,
      terminologyCount: state.terminologyRecords.size,
      typedQueryCount: state.typedQueries.size,
      queryResultCount: state.queryResults.size,
      explainableEnvelopeCount: state.explainableEnvelopes.size,
      confidenceModelCount: state.confidenceModels instanceof Map ? state.confidenceModels.size : 0,
      confidenceResultCount: state.confidenceResults instanceof Map ? state.confidenceResults.size : 0,
      independentValidationResultCount: state.independentValidationResults instanceof Map ? state.independentValidationResults.size : 0,
      intelligencePackageCount: state.intelligencePackages instanceof Map ? state.intelligencePackages.size : 0,
      intelligenceArtifactCount: state.intelligenceArtifacts instanceof Map ? state.intelligenceArtifacts.size : 0,
      packageValidationCount: state.packageValidations instanceof Map ? state.packageValidations.size : 0,
      ide180HandoffCount: state.ide180Handoffs instanceof Map ? state.ide180Handoffs.size : 0,
      packageExportCount: state.intelligencePackageExports instanceof Map ? state.intelligencePackageExports.size : 0,
      latestIntelligencePackageId: state.latestIntelligencePackageId || null,
      latestIDE180HandoffId: state.latestIDE180HandoffId || null,
      latestTestDatasetId: state.latestTestDatasetId,
      latestValidationRunId: state.latestValidationRunId,
      latestValidationEvidencePackageId: state.latestValidationEvidencePackageId,
      latestTestProcedureId: state.latestTestProcedureId,
      latestParsedTestProcedureId: state.latestParsedTestProcedureId,
      latestValidationDatasetCandidateId: state.latestValidationDatasetCandidateId,
      latestEvidenceGraphSnapshotId: state.latestEvidenceGraphSnapshotId,
      latestUnderstandingResultId: state.latestUnderstandingResultId,
      latestTypedQueryId: state.latestTypedQueryId,
      latestQueryResultId: state.latestQueryResultId,
      latestExplainableEnvelopeId: state.latestExplainableEnvelopeId,
      latestConfidenceResultId: state.latestConfidenceResultId || null,
      latestIndependentValidationResultId: state.latestIndependentValidationResultId || null,
      activeImportedProcedureDatasetId: state.activeImportedProcedureDatasetId,
      automationValidationStatus: state.lastAutomationValidation
        ? state.lastAutomationValidation.status
        : "Not Run",
      versionArchitectureValidationStatus: state.lastVersionArchitectureValidation
        ? state.lastVersionArchitectureValidation.status
        : "Not Run",
      versionArchitectureHealth: state.lastVersionArchitectureValidation
        ? state.lastVersionArchitectureValidation.health
        : null,
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
      phase2ReleaseFrozen: PHASE2_RELEASE_FROZEN,
      phase3ReleaseFrozen: PHASE3_RELEASE_FROZEN,
      dependencyStatus: dependencies,
      integration: clone(state.integration),
      directRepositoryMutationAllowed: false,
      missingInformationInferenceAllowed: false,
      canonicalFactInferenceAllowed: false,
      automaticRecommendationApplicationAllowed: false,
      automaticWorkflowExecutionAllowed: false,
      githubAutomaticReflectionAllowed: false,
      phase2Started: true,
      phase2Complete: PHASE2_RELEASE_FROZEN,
      phase3Started: true,
      phase3Complete: PHASE3_RELEASE_FROZEN,
      validationAutomationFoundationStarted: true,
      validationAutomationFoundationComplete: true,
      testProcedureCompilerStarted: true,
      testProcedureCompilerComplete: true,
      phase4Started: true,
      phase4Complete: PHASE4_RELEASE_FROZEN,
      phase5Started: true,
      phase5Complete: PHASE5_RELEASE_FROZEN,
      phase6Started: true,
      phase6Complete: PHASE6_RELEASE_FROZEN,
      phase7Started: true,
      phase7Complete: PHASE7_RELEASE_FROZEN,
      phase8Started: true,
      phase8Complete: state.initialized === true && dependencies.required.packageModel && dependencies.required.packageValidation && dependencies.required.ide180Handoff && dependencies.required.packageExport,
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt || nowIso()
    };
  }

  function removeSessionForValidation(sessionId) {
    return state.sessions.delete(text(sessionId, ""));
  }

  namespace.componentId = COMPONENT_ID;
  namespace.name = COMPONENT_NAME;
  namespace.version = RELEASE_VERSION;
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
    VERSION: RELEASE_VERSION,
    RELEASE_VERSION: RELEASE_VERSION,
    MODULE_VERSION: MODULE_VERSION,
    VERSION_ARCHITECTURE: VERSION_MANIFEST.versionArchitecture,
    SCHEMA_VERSION: SCHEMA_VERSION,
    DESIGN_FREEZE_VERSION: DESIGN_FREEZE_VERSION,
    IMPLEMENTATION_PHASE: IMPLEMENTATION_PHASE,
    PHASE1_RELEASE_FROZEN: PHASE1_RELEASE_FROZEN,
    PHASE2_RELEASE_FROZEN: PHASE2_RELEASE_FROZEN,
    PHASE3_RELEASE_FROZEN: PHASE3_RELEASE_FROZEN,
    PROCEDURE_COMPILER_RELEASE_FROZEN: PROCEDURE_COMPILER_RELEASE_FROZEN,
    PHASE4_RELEASE_FROZEN: PHASE4_RELEASE_FROZEN,
    PHASE5_RELEASE_FROZEN: PHASE5_RELEASE_FROZEN,
    PHASE6_RELEASE_FROZEN: PHASE6_RELEASE_FROZEN,
    PHASE7_RELEASE_FROZEN: PHASE7_RELEASE_FROZEN,
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
    version: MODULE_VERSION,
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
