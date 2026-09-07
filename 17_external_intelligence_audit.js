/* ============================================================
   FILE: 17_external_intelligence_audit.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.0.0
   Phase 01: Governance / Contract / Authority Foundation
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 audit blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("audit");

  function getCrypto() {
    if (global.crypto && global.crypto.subtle) return global.crypto;
    return null;
  }

  async function sha256Text(value) {
    const crypto = getCrypto();
    if (!crypto || !crypto.subtle || typeof global.TextEncoder !== "function") return null;
    const bytes = new global.TextEncoder().encode(String(value == null ? "" : value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function eventHashPayload(event) {
    const copy = internal.clone(event || {});
    delete copy.eventHash;
    return copy;
  }

  async function computeAuditEventHash(event) {
    return sha256Text(internal.stableStringify(eventHashPayload(event)));
  }

  function createMemoryAuditPersistenceAdapter() {
    const records = new Map();
    return {
      adapterId: "EXTERNAL-010-MEMORY-AUDIT-PERSISTENCE",
      role: "phase1-validation-readback",
      async put(record) { records.set(record.auditEventId, internal.clone(record)); return true; },
      async get(id) { return records.has(String(id)) ? internal.clone(records.get(String(id))) : null; },
      async list() { return Array.from(records.values()).map(internal.clone); },
      async clear() { records.clear(); return true; }
    };
  }

  function setAuditPersistenceAdapter(adapter) {
    if (adapter == null) {
      state.auditPersistenceAdapter = null;
      internal.touch();
      return internal.buildResult(true, "EXTERNAL010_AUDIT_PERSISTENCE_ADAPTER_RESET", "Ready", { adapterId: null });
    }
    const valid = adapter && typeof adapter.put === "function" && typeof adapter.get === "function" && typeof adapter.list === "function";
    if (!valid) return internal.buildResult(false, "EXTERNAL010_AUDIT_PERSISTENCE_ADAPTER_INVALID", "Blocked", null);
    state.auditPersistenceAdapter = adapter;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_AUDIT_PERSISTENCE_ADAPTER_SET", "Ready", { adapterId: internal.text(adapter.adapterId, "custom") });
  }

  function previousAuditEvent() {
    if (!state.auditOrder.length) return null;
    return state.auditEvents.get(state.auditOrder[state.auditOrder.length - 1]) || null;
  }

  async function appendExternalIntelligenceAuditEvent(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const eventType = internal.text(settings.eventType, "");
    const actor = internal.text(settings.actor, "System");
    const outcome = internal.text(settings.outcome, "Recorded");
    if (!eventType) return internal.buildResult(false, "EXTERNAL010_AUDIT_EVENT_TYPE_REQUIRED", "Blocked", null);

    const previous = previousAuditEvent();
    const event = {
      auditEventId: internal.nextId("EXTERNAL-010-AUDIT"),
      componentId: "EXTERNAL-010",
      sequence: previous ? previous.sequence + 1 : 1,
      eventType: eventType,
      actor: actor,
      outcome: outcome,
      details: internal.redactSensitive(internal.isPlainObject(settings.details) ? settings.details : {}),
      references: internal.unique(settings.references),
      previousEventHash: previous ? previous.eventHash : null,
      eventHash: null,
      appendOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    event.eventHash = await computeAuditEventHash(event);
    if (!event.eventHash) return internal.buildResult(false, "EXTERNAL010_AUDIT_HASH_UNAVAILABLE", "Blocked", null);

    const validation = namespace.validateExternalIntelligenceContract("auditEvent", event);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_AUDIT_CONTRACT_INVALID", "Blocked", { validation: validation, event: internal.redactSensitive(event) });
    if (state.auditEvents.has(event.auditEventId)) return internal.buildResult(false, "EXTERNAL010_AUDIT_DUPLICATE", "Blocked", null);

    const frozen = internal.deepFreeze(internal.clone(event));
    state.auditEvents.set(frozen.auditEventId, frozen);
    state.auditOrder.push(frozen.auditEventId);
    internal.touch();

    let persistence = { configured: false, readBackVerified: false, adapterId: null };
    if (state.auditPersistenceAdapter) {
      try {
        await state.auditPersistenceAdapter.put(frozen);
        const readBack = await state.auditPersistenceAdapter.get(frozen.auditEventId);
        const readBackValid = Boolean(readBack && internal.stableStringify(readBack) === internal.stableStringify(frozen));
        if (!readBackValid) throw new Error("Audit persistence read-back verification failed.");
        persistence = { configured: true, readBackVerified: true, adapterId: internal.text(state.auditPersistenceAdapter.adapterId, "custom") };
      } catch (error) {
        return internal.buildResult(false, "EXTERNAL010_AUDIT_PERSISTENCE_FAILED", "Failed", { event: internal.clone(frozen), persistence: persistence }, {
          error: { message: error && error.message || String(error), category: "Persistence" }
        });
      }
    }

    return internal.buildResult(true, "EXTERNAL010_AUDIT_EVENT_APPENDED", "Recorded", {
      event: internal.clone(frozen),
      validation: validation,
      persistence: persistence
    });
  }

  async function verifyAuditEvent(event) {
    const validation = namespace.validateExternalIntelligenceContract("auditEvent", event);
    const expectedHash = await computeAuditEventHash(event);
    const hashValid = Boolean(expectedHash && event && event.eventHash === expectedHash);
    return { valid: validation.valid === true && hashValid, contractValid: validation.valid === true, hashValid: hashValid, expectedHash: expectedHash, checkedAt: internal.nowIso() };
  }

  async function verifyExternalIntelligenceAuditChain(eventsOverride) {
    const events = Array.isArray(eventsOverride)
      ? eventsOverride.map(internal.clone)
      : state.auditOrder.map(function get(id) { return state.auditEvents.get(id); }).filter(Boolean).map(internal.clone);
    events.sort(function sequence(a, b) { return a.sequence - b.sequence; });
    const checks = [];
    let previousHash = null;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      const verification = await verifyAuditEvent(event);
      checks.push({
        auditEventId: event.auditEventId,
        sequenceValid: event.sequence === index + 1,
        previousHashValid: event.previousEventHash === previousHash,
        hashValid: verification.hashValid,
        contractValid: verification.contractValid
      });
      previousHash = event.eventHash;
    }
    const valid = events.length > 0 && checks.every(function pass(item) { return item.sequenceValid && item.previousHashValid && item.hashValid && item.contractValid; });
    return { valid: valid, eventCount: events.length, checks: checks, lastEventHash: previousHash, checkedAt: internal.nowIso() };
  }

  function getAuditEvent(id) {
    const event = state.auditEvents.get(internal.text(id, ""));
    return event ? internal.clone(event) : null;
  }

  function listAuditEvents() {
    return state.auditOrder.map(function get(id) { return state.auditEvents.get(id); }).filter(Boolean).map(internal.clone);
  }

  async function readBackPersistedAuditEvent(id) {
    if (!state.auditPersistenceAdapter) return internal.buildResult(false, "EXTERNAL010_AUDIT_PERSISTENCE_ADAPTER_REQUIRED", "Blocked", null);
    const record = await state.auditPersistenceAdapter.get(internal.text(id, ""));
    return internal.buildResult(Boolean(record), record ? "EXTERNAL010_AUDIT_PERSISTENCE_READBACK" : "EXTERNAL010_AUDIT_PERSISTENCE_RECORD_NOT_FOUND", record ? "Verified" : "Blocked", { record: record });
  }

  function initializeExternalIntelligenceAudit() {
    namespace.modules.audit.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_AUDIT_INITIALIZED", "Ready", {
      appendOnly: true,
      hashChain: true,
      secretRedaction: true,
      persistenceAdapterConfigured: Boolean(state.auditPersistenceAdapter),
      eventCount: state.auditEvents.size
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceAudit: initializeExternalIntelligenceAudit,
    createExternalIntelligenceMemoryAuditPersistenceAdapter: createMemoryAuditPersistenceAdapter,
    setExternalIntelligenceAuditPersistenceAdapter: setAuditPersistenceAdapter,
    appendExternalIntelligenceAuditEvent: appendExternalIntelligenceAuditEvent,
    verifyExternalIntelligenceAuditEvent: verifyAuditEvent,
    verifyExternalIntelligenceAuditChain: verifyExternalIntelligenceAuditChain,
    getExternalIntelligenceAuditEvent: getAuditEvent,
    listExternalIntelligenceAuditEvents: listAuditEvents,
    readBackExternalIntelligenceAuditEvent: readBackPersistedAuditEvent
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.audit = {
    id: "EXTERNAL-010-AUDIT",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    appendOnly: true,
    hashChain: true,
    secretRedaction: true,
    persistenceHook: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
