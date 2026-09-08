/* ============================================================
   FILE: 17_external_intelligence_event_graph.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.8.0
   Phase 09: Versioned Event Graph Foundation
   Primary Decision: 028
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 event graph blocked: dependencies missing.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("eventGraph");
  const EVENT_TYPES = new Set(VERSION_MANIFEST.relationEvent.eventTypes || []);
  const EVENT_STATES = new Set(VERSION_MANIFEST.relationEvent.eventStates || []);

  ["eventRecords", "eventVersions", "eventStateTransitions"].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  function iso(value) {
    const text = internal.text(value, "");
    if (!text) return null;
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  function versionKey(eventId, recordVersion) {
    return eventId + "@" + String(recordVersion);
  }

  function latestVersion(eventId) {
    let latest = null;
    state.eventVersions.forEach(function inspect(record) {
      if (record.eventId === eventId && (!latest || record.recordVersion > latest.recordVersion)) latest = record;
    });
    return latest;
  }

  function buildRecord(input, eventId, recordVersion, existing) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      eventRecordId: eventId + "-V" + recordVersion,
      eventId,
      recordVersion,
      eventType: internal.text(source.eventType, "UNKNOWN").toUpperCase(),
      participants: internal.unique(source.participants || source.entityIds),
      participantResolutionStates: internal.isPlainObject(source.participantResolutionStates) ? internal.clone(source.participantResolutionStates) : {},
      locationEntityIds: internal.unique(source.locationEntityIds),
      relationIds: internal.unique(source.relationIds),
      supportingEvidenceIds: internal.unique(source.supportingEvidenceIds || source.evidenceRefs),
      sourceClaimIds: internal.unique(source.sourceClaimIds || source.claimRefs),
      eventTime: iso(source.eventTime || source.occurredAt),
      startTime: iso(source.startTime),
      endTime: iso(source.endTime),
      announcedAt: iso(source.announcedAt),
      plannedAt: iso(source.plannedAt),
      completedAt: iso(source.completedAt),
      eventState: internal.text(source.eventState, "UNKNOWN").toUpperCase(),
      correctionType: internal.text(source.correctionType, "NONE").toUpperCase(),
      supersedesEventRecordId: internal.text(source.supersedesEventRecordId, "") || null,
      eventSchemaVersion: internal.text(source.eventSchemaVersion, "1.0.0"),
      createdBy: internal.text(source.createdBy, source.generatedByAI === true ? "AI_CANDIDATE" : "SYSTEM"),
      generatedByAI: source.generatedByAI === true,
      canonicalEventConfirmed: false,
      claimEqualsEventOccurred: false,
      announcementEqualsCompletion: false,
      planEqualsActualEvent: false,
      eventOccurrenceEqualsCausation: false,
      historicalRecordPreserved: true,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    };
  }

  function registerExternalIntelligenceEvent(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const eventId = internal.text(source.eventId, "") || internal.nextId("EXTERNAL-010-EVENT");
    const recordVersion = Number.isInteger(Number(source.recordVersion)) && Number(source.recordVersion) > 0 ? Number(source.recordVersion) : 1;
    const existing = state.eventVersions.get(versionKey(eventId, recordVersion));
    const record = buildRecord(source, eventId, recordVersion, existing);

    if (!EVENT_TYPES.has(record.eventType) || !EVENT_STATES.has(record.eventState)) {
      return internal.buildResult(false, "EXTERNAL010_EVENT_INVALID_TAXONOMY", "Blocked", {
        eventType: record.eventType,
        eventState: record.eventState
      });
    }
    if (typeof namespace.getExternalIntelligenceEntity === "function" && record.participants.some(function missing(entityId) { return !namespace.getExternalIntelligenceEntity(entityId); })) {
      return internal.buildResult(false, "EXTERNAL010_EVENT_PARTICIPANT_NOT_REGISTERED", "Blocked", { participants: record.participants });
    }
    const timeInputs = ["eventTime", "startTime", "endTime", "announcedAt", "plannedAt", "completedAt"];
    for (const key of timeInputs) {
      if (source[key] && !record[key]) return internal.buildResult(false, "EXTERNAL010_EVENT_INVALID_TIME", "Blocked", { key, value: source[key] });
    }
    if (record.startTime && record.endTime && Date.parse(record.endTime) < Date.parse(record.startTime)) {
      return internal.buildResult(false, "EXTERNAL010_EVENT_INVALID_INTERVAL", "Blocked", { startTime: record.startTime, endTime: record.endTime });
    }

    const contract = namespace.validateExternalIntelligenceContract("eventRecord", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-EVENT-RECORD", record);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_EVENT_RECORD_INVALID", "Blocked", { contract, schema });

    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_EVENT_ALREADY_REGISTERED" : "EXTERNAL010_EVENT_VERSION_CONFLICT", same ? "Ready" : "Blocked", { eventRecord: internal.clone(existing) });
    }

    const previous = latestVersion(eventId);
    if (previous && recordVersion <= previous.recordVersion) {
      return internal.buildResult(false, "EXTERNAL010_EVENT_VERSION_NOT_ADVANCING", "Blocked", { previousVersion: previous.recordVersion, recordVersion });
    }

    const frozen = internal.deepFreeze(internal.clone(record));
    state.eventVersions.set(versionKey(eventId, recordVersion), frozen);
    state.eventRecords.set(eventId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EVENT_REGISTERED", "Ready", { eventRecord: internal.clone(frozen) });
  }

  function transitionExternalIntelligenceEventState(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const eventId = internal.text(source.eventId, "");
    const current = state.eventRecords.get(eventId);
    if (!current) return internal.buildResult(false, "EXTERNAL010_EVENT_NOT_FOUND", "Blocked", { eventId });

    const toState = internal.text(source.toState, "").toUpperCase();
    if (!EVENT_STATES.has(toState)) return internal.buildResult(false, "EXTERNAL010_EVENT_STATE_INVALID", "Blocked", { toState });
    if (current.eventState === toState) {
      return internal.buildResult(true, "EXTERNAL010_EVENT_STATE_ALREADY_CURRENT", "Ready", {
        eventRecord: internal.clone(current),
        eventStateTransition: null
      });
    }

    const transitionedAt = iso(source.transitionedAt) || internal.nowIso();
    const nextVersion = current.recordVersion + 1;
    const nextInput = Object.assign({}, internal.clone(current), {
      recordVersion: nextVersion,
      eventState: toState,
      supersedesEventRecordId: current.eventRecordId,
      correctionType: internal.text(source.correctionType, current.correctionType || "NONE"),
      completedAt: toState === "COMPLETED" ? transitionedAt : current.completedAt
    });
    delete nextInput.eventRecordId;
    delete nextInput.createdAt;
    delete nextInput.immutable;

    const registered = registerExternalIntelligenceEvent(nextInput);
    if (!registered.ok) return registered;

    const transitionId = internal.text(source.eventStateTransitionId, "") || [eventId, current.eventState, toState, nextVersion].join("::");
    const existing = state.eventStateTransitions.get(transitionId);
    const transition = internal.deepFreeze({
      eventStateTransitionId: transitionId,
      eventId,
      fromState: current.eventState,
      toState,
      fromEventRecordId: current.eventRecordId,
      toEventRecordId: registered.data.eventRecord.eventRecordId,
      supportingEvidenceIds: internal.unique(source.supportingEvidenceIds || source.evidenceRefs),
      transitionedAt,
      historicalEventRewritePerformed: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    });

    const contract = namespace.validateExternalIntelligenceContract("eventStateTransition", transition);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-EVENT-STATE-TRANSITION", transition);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_EVENT_TRANSITION_INVALID", "Blocked", { contract, schema });

    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(transition);
      return internal.buildResult(same, same ? "EXTERNAL010_EVENT_TRANSITION_ALREADY_RECORDED" : "EXTERNAL010_EVENT_TRANSITION_CONFLICT", same ? "Ready" : "Blocked", {
        eventRecord: registered.data.eventRecord,
        eventStateTransition: internal.clone(existing)
      });
    }

    state.eventStateTransitions.set(transitionId, transition);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EVENT_STATE_TRANSITION_RECORDED", "Ready", {
      eventRecord: registered.data.eventRecord,
      eventStateTransition: internal.clone(transition)
    });
  }

  function getExternalIntelligenceEvent(eventId, recordVersion) {
    const id = internal.text(eventId, "");
    const record = recordVersion != null ? state.eventVersions.get(versionKey(id, recordVersion)) : state.eventRecords.get(id);
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceEventHistory(eventId) {
    const id = internal.text(eventId, "");
    return Array.from(state.eventVersions.values())
      .filter(function filter(record) { return record.eventId === id; })
      .sort(function sort(a, b) { return a.recordVersion - b.recordVersion; })
      .map(internal.clone);
  }

  function initializeExternalIntelligenceEventGraph() {
    namespace.modules.eventGraph.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_EVENT_GRAPH_INITIALIZED", "Ready", {
      stableEventId: true,
      eventRelationSeparated: true,
      announcementPlanCompletionSeparated: true,
      versionedStateHistory: true,
      correctionSupersessionHook: true,
      eventOccurrenceEqualsCausation: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceEventGraph,
    registerExternalIntelligenceEvent,
    transitionExternalIntelligenceEventState,
    getExternalIntelligenceEvent,
    listExternalIntelligenceEventHistory
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.eventGraph = {
    id: "EXTERNAL-010-VERSIONED-EVENT-GRAPH",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    decisions: ["028"],
    eventRelationSeparated: true,
    versionedStateHistory: true,
    correctionSupersessionHook: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
