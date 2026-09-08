/* ============================================================
   FILE: 17_external_intelligence_relation_graph.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.8.0
   Phase 09: Temporal Relation Graph Foundation
   Primary Decision: 028
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 relation graph blocked: dependencies missing.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("relationGraph");
  const RELATION_STATES = new Set(VERSION_MANIFEST.relationEvent.relationStates || []);
  const RELATION_TYPES = new Set(VERSION_MANIFEST.relationEvent.relationTypes || []);
  const EVENT_RELATION_LINK_TYPES = new Set(VERSION_MANIFEST.relationEvent.eventRelationLinkTypes || []);

  ["temporalRelations", "temporalRelationVersions", "eventRelationLinks"].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });

  function iso(value) {
    const text = internal.text(value, "");
    if (!text) return null;
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  function versionKey(relationId, recordVersion) {
    return relationId + "@" + String(recordVersion);
  }

  function latestVersion(relationId) {
    let latest = null;
    state.temporalRelationVersions.forEach(function inspect(record) {
      if (record.relationId === relationId && (!latest || record.recordVersion > latest.recordVersion)) latest = record;
    });
    return latest;
  }

  function relationPayload(input, existing) {
    const source = internal.isPlainObject(input) ? input : {};
    const relationId = internal.text(source.relationId, "") || internal.nextId("EXTERNAL-010-RELATION");
    const recordVersion = Number.isInteger(Number(source.recordVersion)) && Number(source.recordVersion) > 0 ? Number(source.recordVersion) : 1;
    const subjectEntityId = internal.text(source.subjectEntityId || source.sourceEntityId, "");
    const objectEntityId = internal.text(source.objectEntityId || source.targetEntityId, "");
    const relationType = internal.text(source.relationType, "RELATED_TO").toUpperCase();
    const relationState = internal.text(source.relationState, "CANDIDATE").toUpperCase();
    const validFrom = iso(source.validFrom);
    const validUntil = iso(source.validUntil);

    return {
      relationRecordId: relationId + "-V" + recordVersion,
      relationId,
      recordVersion,
      subjectEntityId,
      relationType,
      objectEntityId,
      validFrom,
      validUntil,
      relationState,
      supportingEvidenceIds: internal.unique(source.supportingEvidenceIds || source.evidenceRefs),
      sourceClaimIds: internal.unique(source.sourceClaimIds || source.claimRefs),
      linkedEventIds: internal.unique(source.linkedEventIds || source.eventRefs),
      participantResolutionStates: internal.isPlainObject(source.participantResolutionStates) ? internal.clone(source.participantResolutionStates) : {},
      generatedByAI: source.generatedByAI === true,
      createdBy: internal.text(source.createdBy, source.generatedByAI === true ? "AI_CANDIDATE" : "SYSTEM"),
      resolverId: internal.text(source.resolverId, "") || null,
      resolverVersion: internal.text(source.resolverVersion, "") || null,
      correctionState: internal.text(source.correctionState, "NONE").toUpperCase(),
      supersedesRelationRecordId: internal.text(source.supersedesRelationRecordId, "") || null,
      canonicalRelationConfirmed: false,
      relationCandidateEqualsVerifiedRelationship: false,
      relationExistenceEqualsCausalImpact: false,
      causalImpactGranted: false,
      historicalRecordPreserved: true,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    };
  }

  function registerExternalIntelligenceTemporalRelation(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const relationId = internal.text(source.relationId, "") || internal.nextId("EXTERNAL-010-RELATION");
    const recordVersion = Number.isInteger(Number(source.recordVersion)) && Number(source.recordVersion) > 0 ? Number(source.recordVersion) : 1;
    const existing = state.temporalRelationVersions.get(versionKey(relationId, recordVersion));
    const record = relationPayload(Object.assign({}, source, { relationId, recordVersion }), existing);

    if (!record.subjectEntityId || !record.objectEntityId || record.subjectEntityId === record.objectEntityId) {
      return internal.buildResult(false, "EXTERNAL010_TEMPORAL_RELATION_INVALID_ENTITIES", "Blocked", {
        subjectEntityId: record.subjectEntityId,
        objectEntityId: record.objectEntityId
      });
    }
    if (typeof namespace.getExternalIntelligenceEntity === "function" && (!namespace.getExternalIntelligenceEntity(record.subjectEntityId) || !namespace.getExternalIntelligenceEntity(record.objectEntityId))) {
      return internal.buildResult(false, "EXTERNAL010_TEMPORAL_RELATION_ENTITY_NOT_REGISTERED", "Blocked", {
        subjectEntityId: record.subjectEntityId,
        objectEntityId: record.objectEntityId
      });
    }
    if (!RELATION_TYPES.has(record.relationType) || !RELATION_STATES.has(record.relationState)) {
      return internal.buildResult(false, "EXTERNAL010_TEMPORAL_RELATION_INVALID_TAXONOMY", "Blocked", {
        relationType: record.relationType,
        relationState: record.relationState
      });
    }
    if ((source.validFrom && !record.validFrom) || (source.validUntil && !record.validUntil)) {
      return internal.buildResult(false, "EXTERNAL010_TEMPORAL_RELATION_INVALID_TIME", "Blocked", null);
    }
    if (record.validFrom && record.validUntil && Date.parse(record.validUntil) < Date.parse(record.validFrom)) {
      return internal.buildResult(false, "EXTERNAL010_TEMPORAL_RELATION_INVALID_INTERVAL", "Blocked", {
        validFrom: record.validFrom,
        validUntil: record.validUntil
      });
    }

    const contract = namespace.validateExternalIntelligenceContract("temporalRelationRecord", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-TEMPORAL-RELATION-RECORD", record);
    if (!contract.valid || !schema.valid) {
      return internal.buildResult(false, "EXTERNAL010_TEMPORAL_RELATION_INVALID", "Blocked", { contract, schema });
    }

    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(
        same,
        same ? "EXTERNAL010_TEMPORAL_RELATION_ALREADY_REGISTERED" : "EXTERNAL010_TEMPORAL_RELATION_VERSION_CONFLICT",
        same ? "Ready" : "Blocked",
        { temporalRelation: internal.clone(existing) }
      );
    }

    const previous = latestVersion(relationId);
    if (previous && recordVersion <= previous.recordVersion) {
      return internal.buildResult(false, "EXTERNAL010_TEMPORAL_RELATION_VERSION_NOT_ADVANCING", "Blocked", {
        previousVersion: previous.recordVersion,
        recordVersion
      });
    }

    const frozen = internal.deepFreeze(internal.clone(record));
    state.temporalRelationVersions.set(versionKey(relationId, recordVersion), frozen);
    state.temporalRelations.set(relationId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_TEMPORAL_RELATION_REGISTERED", "Ready", { temporalRelation: internal.clone(frozen) });
  }

  function getExternalIntelligenceTemporalRelation(relationId, recordVersion) {
    const id = internal.text(relationId, "");
    const record = recordVersion != null
      ? state.temporalRelationVersions.get(versionKey(id, recordVersion))
      : state.temporalRelations.get(id);
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceTemporalRelationHistory(relationId) {
    const id = internal.text(relationId, "");
    return Array.from(state.temporalRelationVersions.values())
      .filter(function filter(record) { return record.relationId === id; })
      .sort(function sort(a, b) { return a.recordVersion - b.recordVersion; })
      .map(internal.clone);
  }

  function linkExternalIntelligenceEventRelation(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const eventId = internal.text(source.eventId, "");
    const relationId = internal.text(source.relationId, "");
    const linkType = internal.text(source.linkType, "RELATED_TO").toUpperCase();
    if (!eventId || !relationId || !EVENT_RELATION_LINK_TYPES.has(linkType)) {
      return internal.buildResult(false, "EXTERNAL010_EVENT_RELATION_LINK_INVALID", "Blocked", { eventId, relationId, linkType });
    }
    if (!state.temporalRelations.has(relationId)) {
      return internal.buildResult(false, "EXTERNAL010_EVENT_RELATION_RELATION_NOT_FOUND", "Blocked", { relationId });
    }
    if (state.eventRecords instanceof Map && state.eventRecords.size && !state.eventRecords.has(eventId)) {
      return internal.buildResult(false, "EXTERNAL010_EVENT_RELATION_EVENT_NOT_FOUND", "Blocked", { eventId });
    }
    const linkId = internal.text(source.eventRelationLinkId, "") || [eventId, linkType, relationId].join("::");
    const existing = state.eventRelationLinks.get(linkId);
    const record = internal.deepFreeze({
      eventRelationLinkId: linkId,
      eventId,
      relationId,
      linkType,
      supportingEvidenceIds: internal.unique(source.supportingEvidenceIds),
      relationAutomaticallyActivated: false,
      relationAutomaticallyEnded: false,
      createdAt: existing ? existing.createdAt : internal.nowIso(),
      immutable: true
    });
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(record);
      return internal.buildResult(same, same ? "EXTERNAL010_EVENT_RELATION_LINK_ALREADY_EXISTS" : "EXTERNAL010_EVENT_RELATION_LINK_CONFLICT", same ? "Ready" : "Blocked", { eventRelationLink: internal.clone(existing) });
    }
    state.eventRelationLinks.set(linkId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EVENT_RELATION_LINK_CREATED", "Ready", { eventRelationLink: internal.clone(record) });
  }

  function activeAt(record, timestamp) {
    const t = Date.parse(timestamp);
    const from = record.validFrom ? Date.parse(record.validFrom) : -Infinity;
    const until = record.validUntil ? Date.parse(record.validUntil) : Infinity;
    return from <= t && t <= until;
  }

  function reconstructExternalIntelligenceRelationGraphAsOf(input) {
    const source = internal.isPlainObject(input) ? input : { asOfTime: input };
    const asOfTime = iso(source.asOfTime);
    if (!asOfTime) return internal.buildResult(false, "EXTERNAL010_AS_OF_TIME_REQUIRED", "Blocked", null);

    const relationTypes = new Set(internal.unique(source.relationTypes).map(function upper(value) { return value.toUpperCase(); }));
    const relations = Array.from(state.temporalRelationVersions.values())
      .filter(function filter(record) {
        return activeAt(record, asOfTime) && (!relationTypes.size || relationTypes.has(record.relationType));
      })
      .map(internal.clone);

    const byRelation = {};
    relations.forEach(function group(record) {
      if (!byRelation[record.relationId]) byRelation[record.relationId] = [];
      byRelation[record.relationId].push(record.relationRecordId);
    });

    return internal.buildResult(true, "EXTERNAL010_RELATION_AS_OF_GRAPH_RECONSTRUCTED", "Ready", {
      asOfTime,
      relations,
      relationVersionGroups: byRelation,
      historicalAsOfGraph: true,
      currentRelationEqualsHistoricalRelation: false,
      canonicalAutoSelectionPerformed: false
    });
  }

  function traverseExternalIntelligenceRelationGraph(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const startEntityId = internal.text(source.startEntityId, "");
    const maxDepth = Number.isInteger(Number(source.maxDepth)) && Number(source.maxDepth) > 0 ? Math.min(Number(source.maxDepth), 8) : 2;
    const asOfTime = source.asOfTime ? iso(source.asOfTime) : null;
    const relationTypes = new Set(internal.unique(source.relationTypes).map(function upper(value) { return value.toUpperCase(); }));
    if (!startEntityId) return internal.buildResult(false, "EXTERNAL010_RELATION_TRAVERSAL_START_REQUIRED", "Blocked", null);
    if (source.asOfTime && !asOfTime) return internal.buildResult(false, "EXTERNAL010_RELATION_TRAVERSAL_TIME_INVALID", "Blocked", null);

    const all = Array.from(state.temporalRelationVersions.values()).filter(function eligible(record) {
      return (!asOfTime || activeAt(record, asOfTime)) && (!relationTypes.size || relationTypes.has(record.relationType));
    });
    const queue = [{ entityId: startEntityId, depth: 0 }];
    const seenEntities = new Set([startEntityId]);
    const seenEdges = new Set();
    const entities = [{ entityId: startEntityId, depth: 0 }];
    const relations = [];

    while (queue.length) {
      const current = queue.shift();
      if (current.depth >= maxDepth) continue;
      all.forEach(function inspect(record) {
        if (record.subjectEntityId !== current.entityId && record.objectEntityId !== current.entityId) return;
        if (!seenEdges.has(record.relationRecordId)) {
          seenEdges.add(record.relationRecordId);
          relations.push(internal.clone(record));
        }
        const other = record.subjectEntityId === current.entityId ? record.objectEntityId : record.subjectEntityId;
        if (!seenEntities.has(other)) {
          seenEntities.add(other);
          entities.push({ entityId: other, depth: current.depth + 1 });
          queue.push({ entityId: other, depth: current.depth + 1 });
        }
      });
    }

    return internal.buildResult(true, "EXTERNAL010_RELATION_GRAPH_TRAVERSED", "Ready", {
      startEntityId,
      maxDepth,
      asOfTime,
      entities,
      relations,
      timeFilteredTraversal: Boolean(asOfTime),
      canonicalAutoSelectionPerformed: false
    });
  }

  function initializeExternalIntelligenceRelationGraph() {
    namespace.modules.relationGraph.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_RELATION_GRAPH_INITIALIZED", "Ready", {
      stableRelationId: true,
      temporalValidity: true,
      versionedRelationHistory: true,
      eventRelationLink: true,
      historicalAsOfGraph: true,
      graphTraversalHook: true,
      impactAnalysisExtensionHook: true,
      relationEqualsCausalImpact: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceRelationGraph,
    registerExternalIntelligenceTemporalRelation,
    getExternalIntelligenceTemporalRelation,
    listExternalIntelligenceTemporalRelationHistory,
    linkExternalIntelligenceEventRelation,
    reconstructExternalIntelligenceRelationGraphAsOf,
    traverseExternalIntelligenceRelationGraph
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.relationGraph = {
    id: "EXTERNAL-010-TEMPORAL-RELATION-GRAPH",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    decisions: ["028"],
    stableRelationIdentity: true,
    versioned: true,
    historicalAsOfGraph: true,
    traversalHook: true,
    impactAnalysisExtensionHook: true,
    canonicalAutoResolution: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
