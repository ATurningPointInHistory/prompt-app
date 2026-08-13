/* ============================================================
   FILE: 13_development_automation_audit.js
   IDE-190 Development Automation
   Release: 1.7.0 / Module: Federated Audit 1.0.0
   Phase 8: Audit / Session / Persistence / Receipt
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Federated Audit blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("audit");

  function ensureState() {
    if (!(state.auditEvents instanceof Map)) state.auditEvents = new Map();
    if (!Array.isArray(state.auditEventOrder)) state.auditEventOrder = [];
    if (!Object.prototype.hasOwnProperty.call(state, "latestAuditEventId")) state.latestAuditEventId = null;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256Text(value) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return null;
    const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(String(value == null ? "" : value)));
    return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function eventPayload(event) {
    const copy = internal.clone(event || {});
    delete copy.eventHash;
    return copy;
  }

  async function computeAutomationAuditEventHash(event) {
    return sha256Text(stableStringify(eventPayload(event)));
  }

  function normalizeReferences(values) {
    const out = [];
    (Array.isArray(values) ? values : []).forEach(function add(item) {
      if (!internal.isPlainObject(item)) return;
      const ownerComponentId = internal.text(item.ownerComponentId, "");
      const recordType = internal.text(item.recordType, "");
      const recordId = internal.text(item.recordId, "");
      if (!ownerComponentId || !recordType || !recordId) return;
      const normalized = {
        ownerComponentId: ownerComponentId,
        recordType: recordType,
        recordId: recordId,
        recordHash: internal.text(item.recordHash, "") || null,
        authoritative: item.authoritative === true
      };
      if (!out.some(function same(existing) { return existing.ownerComponentId === normalized.ownerComponentId && existing.recordType === normalized.recordType && existing.recordId === normalized.recordId; })) out.push(normalized);
    });
    return out;
  }

  function previousEventForSession(sessionId) {
    ensureState();
    for (let index = state.auditEventOrder.length - 1; index >= 0; index -= 1) {
      const event = state.auditEvents.get(state.auditEventOrder[index]);
      if (event && event.automationSessionId === sessionId) return event;
    }
    return null;
  }

  async function appendAutomationAuditEvent(input) {
    ensureState();
    const settings = internal.isPlainObject(input) ? input : {};
    const session = typeof namespace.getAutomationSession === "function" ? namespace.getAutomationSession(settings.automationSessionId) : null;
    if (!session) return internal.buildResult(false, "IDE190_AUDIT_SESSION_REQUIRED", "Blocked", null);
    const eventType = internal.text(settings.eventType, "");
    const outcome = internal.text(settings.outcome, "");
    if (!eventType) return internal.buildResult(false, "IDE190_AUDIT_EVENT_TYPE_REQUIRED", "Blocked", null);
    if (outcome && !VERSION_MANIFEST.outcomes.includes(outcome) && !["Ready", "Active", "Approved", "Verified", "Recorded"].includes(outcome)) {
      return internal.buildResult(false, "IDE190_AUDIT_OUTCOME_INVALID", "Blocked", { outcome: outcome });
    }
    const previous = previousEventForSession(session.automationSessionId);
    const references = normalizeReferences(settings.federatedReferences);
    const event = {
      auditEventId: internal.nextId("IDE-190-AUDIT-EVENT"),
      auditVersion: VERSION_MANIFEST.getContractVersion("auditEvent"),
      automationRequestId: session.automationRequestId,
      automationSessionId: session.automationSessionId,
      automationAttemptId: session.automationAttemptId,
      automationOperationId: session.automationOperationId,
      dispatchId: session.dispatchId || null,
      sequence: previous ? previous.sequence + 1 : 1,
      eventType: eventType,
      sourceComponentId: internal.text(settings.sourceComponentId, "IDE-190"),
      actor: internal.text(settings.actor, session.actor || "Project Owner"),
      outcome: outcome || "Recorded",
      summary: internal.text(settings.summary, ""),
      federatedReferences: references,
      evidenceRefs: internal.unique(Array.isArray(settings.evidenceRefs) ? settings.evidenceRefs : []),
      previousEventHash: previous ? previous.eventHash : null,
      appendOnly: true,
      persisted: true,
      containsSourcePayload: false,
      containsProviderHandle: false,
      containsRuntimeQueueOrStack: false,
      containsHiddenLearningState: false,
      immutable: true,
      createdAt: internal.nowIso(),
      eventHash: null
    };
    event.eventHash = await computeAutomationAuditEventHash(event);
    if (!event.eventHash) return internal.buildResult(false, "IDE190_AUDIT_HASH_UNAVAILABLE", "Blocked", null);
    const contract = namespace.validateContract("auditEvent", event);
    if (!contract.valid) return internal.buildResult(false, "IDE190_AUDIT_CONTRACT_INVALID", "Blocked", { event: event, validation: contract });
    if (state.auditEvents.has(event.auditEventId)) return internal.buildResult(false, "IDE190_AUDIT_APPEND_ONLY_DUPLICATE", "Blocked", null);

    const frozen = internal.deepFreeze(internal.clone(event));
    state.auditEvents.set(frozen.auditEventId, frozen);
    state.auditEventOrder.push(frozen.auditEventId);
    state.latestAuditEventId = frozen.auditEventId;
    if (typeof internal.attachAuditEventIdentity === "function") internal.attachAuditEventIdentity(frozen.automationSessionId, frozen.auditEventId);
    internal.touch();

    let persistence = null;
    if (typeof namespace.persistAutomationAuditEvent === "function") {
      persistence = await namespace.persistAutomationAuditEvent(frozen);
      if (!persistence || persistence.ok !== true) {
        return internal.buildResult(false, "IDE190_AUDIT_PERSISTENCE_FAILED", "Failed", { event: internal.clone(frozen), persistence: persistence });
      }
    }

    return internal.buildResult(true, "IDE190_AUDIT_EVENT_APPENDED", "Recorded", { event: internal.clone(frozen), validation: contract, persistence: persistence && internal.clone(persistence) });
  }

  async function verifyAutomationAuditEvent(event) {
    const contract = namespace.validateContract("auditEvent", event);
    const expectedHash = await computeAutomationAuditEventHash(event);
    const hashValid = Boolean(expectedHash && event && event.eventHash === expectedHash);
    return { valid: contract.valid === true && hashValid, contractValid: contract.valid === true, hashValid: hashValid, expectedHash: expectedHash, checkedAt: internal.nowIso() };
  }

  async function verifyAutomationAuditChain(sessionId, eventsOverride) {
    const id = internal.text(sessionId, "");
    const events = Array.isArray(eventsOverride)
      ? eventsOverride.map(internal.clone)
      : state.auditEventOrder.map(function get(key) { return state.auditEvents.get(key); }).filter(function match(item) { return item && item.automationSessionId === id; }).map(internal.clone);
    events.sort(function bySequence(a, b) { return a.sequence - b.sequence; });
    const checks = [];
    let previousHash = null;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      const verification = await verifyAutomationAuditEvent(event);
      checks.push({ auditEventId: event.auditEventId, valid: verification.valid, sequenceValid: event.sequence === index + 1, previousHashValid: event.previousEventHash === previousHash, hashValid: verification.hashValid });
      previousHash = event.eventHash;
    }
    const valid = events.length > 0 && checks.every(function pass(item) { return item.valid && item.sequenceValid && item.previousHashValid && item.hashValid; });
    return { valid: valid, eventCount: events.length, firstEventHash: events[0] && events[0].eventHash || null, lastEventHash: events.length ? events[events.length - 1].eventHash : null, checks: checks, checkedAt: internal.nowIso() };
  }

  function getAutomationAuditEvent(auditEventId) {
    ensureState();
    const id = internal.text(auditEventId, state.latestAuditEventId || "");
    return internal.clone(state.auditEvents.get(id) || null);
  }

  function listAutomationAuditEvents(options) {
    ensureState();
    const settings = internal.isPlainObject(options) ? options : {};
    const sessionId = internal.text(settings.automationSessionId, "");
    return state.auditEventOrder.map(function get(id) { return state.auditEvents.get(id); }).filter(function match(item) {
      return item && (!sessionId || item.automationSessionId === sessionId);
    }).map(internal.clone);
  }

  function initializeAutomationAudit() {
    ensureState();
    namespace.modules.audit.status = "Ready";
    return internal.buildResult(true, "IDE190_AUTOMATION_AUDIT_INITIALIZED", "Ready", { eventCount: state.auditEvents.size, appendOnly: true, persistenceRequired: true });
  }

  internal.computeAutomationAuditEventHash = computeAutomationAuditEventHash;

  Object.assign(namespace.api, {
    initializeAutomationAudit: initializeAutomationAudit,
    appendAutomationAuditEvent: appendAutomationAuditEvent,
    verifyAutomationAuditEvent: verifyAutomationAuditEvent,
    verifyAutomationAuditChain: verifyAutomationAuditChain,
    getAutomationAuditEvent: getAutomationAuditEvent,
    listAutomationAuditEvents: listAutomationAuditEvents
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.audit = {
    id: "IDE-190-FEDERATED-AUDIT",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    appendOnly: true,
    federatedLineage: true,
    falseGlobalTransaction: false,
    sourcePayloadPersisted: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
