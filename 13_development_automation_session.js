/* ============================================================
   FILE: 13_development_automation_session.js
   IDE-190 Development Automation
   Release: 1.7.0 / Module: Automation Session 1.0.0
   Phase 8: Audit / Session / Persistence / Receipt
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Automation Session blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("session");

  function ensureState() {
    if (!(state.automationSessions instanceof Map)) state.automationSessions = new Map();
    if (!Object.prototype.hasOwnProperty.call(state, "latestAutomationSessionId")) state.latestAutomationSessionId = null;
  }

  function normalizeFederatedReference(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const ownerComponentId = internal.text(source.ownerComponentId, "");
    const recordType = internal.text(source.recordType, "");
    const recordId = internal.text(source.recordId, "");
    if (!ownerComponentId || !recordType || !recordId) return null;
    return {
      ownerComponentId: ownerComponentId,
      recordType: recordType,
      recordId: recordId,
      recordHash: internal.text(source.recordHash, "") || null,
      relationship: internal.text(source.relationship, "reference"),
      authoritative: source.authoritative === true
    };
  }

  function createAutomationSession(input) {
    ensureState();
    const settings = internal.isPlainObject(input) ? input : {};
    const requestId = internal.text(settings.automationRequestId, "") || internal.nextId("IDE-190-AUTOMATION-REQUEST");
    const now = internal.nowIso();
    const session = {
      automationRequestId: requestId,
      automationSessionId: internal.nextId("IDE-190-AUTOMATION-SESSION"),
      automationAttemptId: internal.text(settings.automationAttemptId, "") || internal.nextId("IDE-190-AUTOMATION-ATTEMPT"),
      automationOperationId: internal.text(settings.automationOperationId, "") || internal.nextId("IDE-190-AUTOMATION-OPERATION"),
      dispatchId: internal.text(settings.dispatchId, "") || null,
      automationReceiptId: null,
      globalTransactionId: null,
      falseGlobalTransactionSynthesized: false,
      lifecycle: internal.text(settings.lifecycle, "Intake"),
      status: "Active",
      outcome: null,
      actor: internal.text(settings.actor, "Project Owner"),
      federatedReferences: [],
      auditEventIds: [],
      runtimeOnly: true,
      persisted: false,
      createdAt: now,
      updatedAt: now,
      closedAt: null
    };

    (Array.isArray(settings.federatedReferences) ? settings.federatedReferences : []).forEach(function add(item) {
      const normalized = normalizeFederatedReference(item);
      if (normalized) session.federatedReferences.push(normalized);
    });

    const contract = namespace.validateContract("automationSession", session);
    if (!contract.valid) return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_CONTRACT_INVALID", "Blocked", { session: session, validation: contract });

    state.automationSessions.set(session.automationSessionId, session);
    state.latestAutomationSessionId = session.automationSessionId;
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_SESSION_CREATED", "Active", { session: internal.clone(session), validation: contract });
  }

  function getMutableSession(sessionId) {
    ensureState();
    return state.automationSessions.get(internal.text(sessionId, state.latestAutomationSessionId || "")) || null;
  }

  function getAutomationSession(sessionId) {
    const session = getMutableSession(sessionId);
    return session ? internal.clone(session) : null;
  }

  function bindAutomationSessionReference(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const session = getMutableSession(settings.automationSessionId);
    if (!session) return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_NOT_FOUND", "not-found", null);
    if (session.status !== "Active") return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_NOT_ACTIVE", "Blocked", { status: session.status });
    const reference = normalizeFederatedReference(settings.reference);
    if (!reference) return internal.buildResult(false, "IDE190_FEDERATED_REFERENCE_INVALID", "Blocked", null);
    const exists = session.federatedReferences.some(function same(item) {
      return item.ownerComponentId === reference.ownerComponentId && item.recordType === reference.recordType && item.recordId === reference.recordId;
    });
    if (!exists) session.federatedReferences.push(reference);
    if (reference.recordType === "dispatch" || reference.recordType === "dispatch-request" || reference.recordType === "execution-result") {
      session.dispatchId = reference.recordId;
    }
    session.updatedAt = internal.nowIso();
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_SESSION_REFERENCE_BOUND", "Active", { session: internal.clone(session), reference: internal.clone(reference), existing: exists });
  }

  function updateAutomationSessionLifecycle(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const session = getMutableSession(settings.automationSessionId);
    if (!session) return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_NOT_FOUND", "not-found", null);
    if (session.status !== "Active") return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_NOT_ACTIVE", "Blocked", { status: session.status });
    const lifecycle = internal.text(settings.lifecycle, "");
    if (!VERSION_MANIFEST.lifecycle.includes(lifecycle)) return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_LIFECYCLE_INVALID", "Blocked", { lifecycle: lifecycle });
    session.lifecycle = lifecycle;
    session.updatedAt = internal.nowIso();
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_SESSION_LIFECYCLE_UPDATED", "Active", { session: internal.clone(session) });
  }

  function closeAutomationSession(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const session = getMutableSession(settings.automationSessionId);
    if (!session) return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_NOT_FOUND", "not-found", null);
    if (session.status === "Closed") return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_ALREADY_CLOSED", "Blocked", { session: internal.clone(session) });
    const outcome = internal.text(settings.outcome, "");
    if (!VERSION_MANIFEST.outcomes.includes(outcome)) return internal.buildResult(false, "IDE190_AUTOMATION_SESSION_OUTCOME_INVALID", "Blocked", { outcome: outcome });
    const now = internal.nowIso();
    session.lifecycle = "Close";
    session.status = "Closed";
    session.outcome = outcome;
    session.closedAt = now;
    session.updatedAt = now;
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_SESSION_CLOSED", "Closed", { session: internal.clone(session) });
  }

  function attachReceiptIdentity(sessionId, automationReceiptId) {
    const session = getMutableSession(sessionId);
    if (!session) return false;
    session.automationReceiptId = internal.text(automationReceiptId, "") || null;
    session.updatedAt = internal.nowIso();
    internal.touch();
    return true;
  }

  function attachAuditEventIdentity(sessionId, auditEventId) {
    const session = getMutableSession(sessionId);
    if (!session) return false;
    const id = internal.text(auditEventId, "");
    if (id && !session.auditEventIds.includes(id)) session.auditEventIds.push(id);
    session.updatedAt = internal.nowIso();
    internal.touch();
    return true;
  }

  function clearAutomationRuntimeSessions() {
    ensureState();
    const count = state.automationSessions.size;
    state.automationSessions.clear();
    state.latestAutomationSessionId = null;
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_RUNTIME_SESSIONS_CLEARED", "Ready", { cleared: count, persistedAuditEventsAffected: false, persistedReceiptsAffected: false });
  }

  function getAutomationSessionStatus() {
    ensureState();
    return {
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      moduleVersion: MODULE_VERSION,
      sessionCount: state.automationSessions.size,
      latestAutomationSessionId: state.latestAutomationSessionId,
      runtimeOnly: true,
      sessionPersistenceImplemented: false,
      globalTransactionSynthesized: false,
      updatedAt: state.updatedAt
    };
  }

  function listAutomationSessions() {
    ensureState();
    return Array.from(state.automationSessions.values()).map(function copy(item) { return internal.clone(item); });
  }

  function initializeAutomationSession() {
    ensureState();
    namespace.modules.session.status = "Ready";
    return internal.buildResult(true, "IDE190_AUTOMATION_SESSION_INITIALIZED", "Ready", getAutomationSessionStatus());
  }

  internal.attachReceiptIdentity = attachReceiptIdentity;
  internal.attachAuditEventIdentity = attachAuditEventIdentity;

  Object.assign(namespace.api, {
    initializeAutomationSession: initializeAutomationSession,
    createAutomationSession: createAutomationSession,
    bindAutomationSessionReference: bindAutomationSessionReference,
    updateAutomationSessionLifecycle: updateAutomationSessionLifecycle,
    closeAutomationSession: closeAutomationSession,
    getAutomationSession: getAutomationSession,
    listAutomationSessions: listAutomationSessions,
    clearAutomationRuntimeSessions: clearAutomationRuntimeSessions,
    getAutomationSessionStatus: getAutomationSessionStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.session = {
    id: "IDE-190-AUTOMATION-SESSION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    runtimeOnly: true,
    persisted: false,
    falseGlobalTransactionSynthesized: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
