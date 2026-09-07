/* ============================================================
   FILE: 17_external_intelligence_lineage.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.7.0
   Phase 08: Unified Derived Intelligence Lineage Graph
   Primary Decision: 037
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("EXTERNAL-010 lineage module blocked: dependencies missing."); return; }
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("lineage");
  ["snapshotManifests", "transformationRecords", "lineageRecords", "lineageForwardIndex", "lineageReverseIndex", "recomputeCandidates", "emergencyDecisionLineageHooks"].forEach(function ensure(k) { if (!(state[k] instanceof Map)) state[k] = new Map(); });
  const RELATIONS = new Set(VERSION_MANIFEST.lineage.relationTypes || []);
  const STATES = new Set(VERSION_MANIFEST.lineage.lineageStates || []);
  const TRANSFORMATIONS = new Set(VERSION_MANIFEST.lineage.transformationTypes || []);

  function indexAdd(index, key, value) {
    const current = Array.isArray(index.get(key)) ? index.get(key).slice() : [];
    if (!current.includes(value)) current.push(value);
    index.set(key, internal.deepFreeze(current));
  }
  function forwardNeighbors(id) { const x = state.lineageForwardIndex.get(id); return Array.isArray(x) ? x.slice() : []; }
  function reverseNeighbors(id) { const x = state.lineageReverseIndex.get(id); return Array.isArray(x) ? x.slice() : []; }
  function reachable(start, target) {
    const queue = [start], seen = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (current === target) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      forwardNeighbors(current).forEach(function (n) { if (!seen.has(n)) queue.push(n); });
    }
    return false;
  }

  function createExternalIntelligenceSnapshotManifest(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const refs = Array.isArray(x.references) ? x.references.map(function (r) {
      const y = internal.isPlainObject(r) ? r : {};
      return { referenceId: internal.text(y.referenceId, ""), recordType: internal.text(y.recordType, "UNKNOWN"), versionId: internal.text(y.versionId, "UNKNOWN"), contentHash: internal.text(y.contentHash, "") || null };
    }).filter(function (r) { return r.referenceId; }) : [];
    if (!refs.length) return internal.buildResult(false, "EXTERNAL010_SNAPSHOT_REFERENCES_REQUIRED", "Blocked", null);
    const record = internal.deepFreeze({
      snapshotManifestId: internal.nextId("EXTERNAL-010-SNAPSHOT-MANIFEST"),
      purpose: internal.text(x.purpose, "DERIVED_INTELLIGENCE_REPRODUCIBILITY").toUpperCase(),
      references: refs,
      temporalContextId: internal.text(x.temporalContextId, "") || null,
      configurationVersion: internal.text(x.configurationVersion, "UNKNOWN"),
      snapshotBasedReproducibility: true,
      currentStateEqualsHistoricalInputState: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("snapshotManifest", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SNAPSHOT-MANIFEST", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_SNAPSHOT_MANIFEST_INVALID", "Blocked", { contract: cv, schema: sv });
    state.snapshotManifests.set(record.snapshotManifestId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SNAPSHOT_MANIFEST_CREATED", "Ready", { snapshotManifest: internal.clone(record) });
  }

  function createExternalIntelligenceTransformationRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const type = internal.text(x.transformationType, "UNKNOWN").toUpperCase();
    const inputReferenceIds = internal.unique(x.inputReferenceIds), outputReferenceIds = internal.unique(x.outputReferenceIds);
    if (!TRANSFORMATIONS.has(type) || !inputReferenceIds.length || !outputReferenceIds.length) return internal.buildResult(false, "EXTERNAL010_TRANSFORMATION_RECORD_INVALID_INPUT", "Blocked", { transformationType: type, inputReferenceIds, outputReferenceIds });
    const capabilityId = internal.text(x.capabilityId, "") || null;
    if (capabilityId && !state.analyticalCapabilities.has(capabilityId)) return internal.buildResult(false, "EXTERNAL010_TRANSFORMATION_CAPABILITY_NOT_FOUND", "Blocked", { capabilityId });
    const snapshotManifestId = internal.text(x.snapshotManifestId, "") || null;
    if (snapshotManifestId && !state.snapshotManifests.has(snapshotManifestId)) return internal.buildResult(false, "EXTERNAL010_TRANSFORMATION_SNAPSHOT_NOT_FOUND", "Blocked", { snapshotManifestId });
    const record = internal.deepFreeze({
      transformationId: internal.nextId("EXTERNAL-010-TRANSFORMATION"), transformationType: type,
      transformationVersion: internal.text(x.transformationVersion, "1.0.0"), capabilityId,
      capabilityRecordVersion: capabilityId ? state.analyticalCapabilities.get(capabilityId).recordVersion : null,
      modelVersion: internal.text(x.modelVersion, "UNKNOWN"), algorithmVersion: internal.text(x.algorithmVersion, "UNKNOWN"), promptVersion: internal.text(x.promptVersion, "UNKNOWN"), configurationVersion: internal.text(x.configurationVersion, "UNKNOWN"),
      inputReferenceIds, outputReferenceIds, snapshotManifestId,
      status: internal.text(x.status, "SUCCESS").toUpperCase(), partialSuccess: x.partialSuccess === true,
      sourceProvenanceEqualsAnalyticalLineage: false, auditEqualsLineage: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("transformationRecord", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-TRANSFORMATION-RECORD", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_TRANSFORMATION_RECORD_INVALID", "Blocked", { contract: cv, schema: sv });
    state.transformationRecords.set(record.transformationId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_TRANSFORMATION_RECORDED", "Ready", { transformationRecord: internal.clone(record) });
  }

  function createExternalIntelligenceLineageRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const inputReferenceId = internal.text(x.inputReferenceId, ""), outputReferenceId = internal.text(x.outputReferenceId, "");
    const relationType = internal.text(x.relationType, "DERIVED_FROM").toUpperCase(), lineageState = internal.text(x.lineageState, "ACTIVE").toUpperCase();
    const transformationId = internal.text(x.transformationId, "") || null;
    if (!inputReferenceId || !outputReferenceId || inputReferenceId === outputReferenceId || !RELATIONS.has(relationType) || !STATES.has(lineageState)) return internal.buildResult(false, "EXTERNAL010_LINEAGE_EDGE_INVALID", "Blocked", { inputReferenceId, outputReferenceId, relationType, lineageState });
    if (transformationId && !state.transformationRecords.has(transformationId)) return internal.buildResult(false, "EXTERNAL010_LINEAGE_TRANSFORMATION_NOT_FOUND", "Blocked", { transformationId });
    if (reachable(outputReferenceId, inputReferenceId)) return internal.buildResult(false, "EXTERNAL010_DERIVATION_CYCLE_REJECTED", "Blocked", { inputReferenceId, outputReferenceId, derivationCycleCreated: false });
    const record = internal.deepFreeze({
      lineageRecordId: internal.nextId("EXTERNAL-010-LINEAGE"), inputReferenceId, outputReferenceId, relationType, transformationId, lineageState,
      affectedEqualsInvalid: false, historicalRecordSilentlyRewritten: false, automaticRecomputePerformed: false,
      createdAt: internal.nowIso(), immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("lineageRecord", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-LINEAGE-RECORD", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_LINEAGE_RECORD_INVALID", "Blocked", { contract: cv, schema: sv });
    state.lineageRecords.set(record.lineageRecordId, record); indexAdd(state.lineageForwardIndex, inputReferenceId, outputReferenceId); indexAdd(state.lineageReverseIndex, outputReferenceId, inputReferenceId); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_LINEAGE_RECORDED", "Ready", { lineageRecord: internal.clone(record) });
  }

  function trace(startId, direction, maxDepth) {
    const start = internal.text(startId, "");
    const limit = Number.isInteger(maxDepth) && maxDepth > 0 ? Math.min(maxDepth, 32) : 8;
    const queue = [{ id: start, depth: 0 }], seen = new Set([start]), results = [];
    while (queue.length) {
      const cur = queue.shift(); if (cur.depth >= limit) continue;
      const neighbors = direction === "reverse" ? reverseNeighbors(cur.id) : forwardNeighbors(cur.id);
      neighbors.forEach(function (id) { if (!seen.has(id)) { seen.add(id); results.push({ referenceId: id, depth: cur.depth + 1 }); queue.push({ id, depth: cur.depth + 1 }); } });
    }
    return { startReferenceId: start, direction, maxDepth: limit, references: results, historicalRecordMutationPerformed: false };
  }
  function traceExternalIntelligenceForwardDependencies(referenceId, maxDepth) { return trace(referenceId, "forward", maxDepth); }
  function traceExternalIntelligenceReverseProvenance(referenceId, maxDepth) { return trace(referenceId, "reverse", maxDepth); }

  function analyzeExternalIntelligenceBlastRadius(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const referenceId = internal.text(x.referenceId, "");
    if (!referenceId) return internal.buildResult(false, "EXTERNAL010_BLAST_RADIUS_REFERENCE_REQUIRED", "Blocked", null);
    const traceResult = trace(referenceId, "forward", Number(x.maxDepth) || 8);
    return internal.buildResult(true, "EXTERNAL010_BLAST_RADIUS_ANALYZED", "Ready", { referenceId, affectedReferences: traceResult.references, affectedEqualsInvalid: false, automaticInvalidationPerformed: false, automaticDeletionPerformed: false });
  }

  function createExternalIntelligenceRecomputeCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const outputReferenceId = internal.text(x.outputReferenceId, "");
    if (!outputReferenceId) return internal.buildResult(false, "EXTERNAL010_RECOMPUTE_OUTPUT_REQUIRED", "Blocked", null);
    const record = internal.deepFreeze({ recomputeCandidateId: internal.nextId("EXTERNAL-010-RECOMPUTE-CANDIDATE"), outputReferenceId, reason: internal.text(x.reason, "INPUT_REVISION").toUpperCase(), triggerReferenceIds: internal.unique(x.triggerReferenceIds), recomputeRequiredEqualsKnownIncorrect: false, automaticRecomputePerformed: false, approvalGranted: false, createdAt: internal.nowIso(), immutable: true });
    const cv = namespace.validateExternalIntelligenceContract("recomputeCandidate", record), sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-RECOMPUTE-CANDIDATE", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_RECOMPUTE_CANDIDATE_INVALID", "Blocked", { contract: cv, schema: sv });
    state.recomputeCandidates.set(record.recomputeCandidateId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RECOMPUTE_CANDIDATE_CREATED", "Ready", { recomputeCandidate: internal.clone(record) });
  }

  function createExternalIntelligenceRevisionLineage(input) {
    const x = internal.isPlainObject(input) ? input : {};
    return createExternalIntelligenceLineageRecord({ inputReferenceId: x.previousRecordId, outputReferenceId: x.newRecordId, relationType: "SUPERSEDES", transformationId: x.transformationId || null, lineageState: "SUPERSEDED" });
  }

  function createExternalIntelligenceEmergencyDecisionLineageHook(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const decisionReferenceId = internal.text(x.decisionReferenceId, "");
    if (!decisionReferenceId) return internal.buildResult(false, "EXTERNAL010_EMERGENCY_LINEAGE_DECISION_REFERENCE_REQUIRED", "Blocked", null);
    const record = internal.deepFreeze({ emergencyLineageHookId: internal.nextId("EXTERNAL-010-EMERGENCY-LINEAGE-HOOK"), decisionReferenceId, evidenceReferenceIds: internal.unique(x.evidenceReferenceIds), intelligenceReferenceIds: internal.unique(x.intelligenceReferenceIds), reasoningReferenceIds: internal.unique(x.reasoningReferenceIds), lineageBypassAllowed: false, actionAuthorityGranted: false, createdAt: internal.nowIso(), immutable: true });
    state.emergencyDecisionLineageHooks.set(record.emergencyLineageHookId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EMERGENCY_LINEAGE_HOOK_CREATED", "Ready", { emergencyLineageHook: internal.clone(record) });
  }

  function initializeExternalIntelligenceLineage() {
    namespace.modules.lineage.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_LINEAGE_INITIALIZED", "Ready", { forwardDependencyQuery: true, reverseProvenanceQuery: true, derivationCycleRejected: true, automaticRecomputeAllowed: false });
  }

  Object.assign(namespace.api, { initializeExternalIntelligenceLineage, createExternalIntelligenceSnapshotManifest, createExternalIntelligenceTransformationRecord, createExternalIntelligenceLineageRecord, traceExternalIntelligenceForwardDependencies, traceExternalIntelligenceReverseProvenance, analyzeExternalIntelligenceBlastRadius, createExternalIntelligenceRecomputeCandidate, createExternalIntelligenceRevisionLineage, createExternalIntelligenceEmergencyDecisionLineageHook });
  Object.assign(namespace, namespace.api);
  namespace.modules.lineage = { id: "EXTERNAL-010-UNIFIED-DERIVED-LINEAGE", version: MODULE_VERSION, status: "Loaded", phase: 8, decisions: ["037"], snapshotBasedReproducibility: true, dependencyQueries: true, derivationGraphAcyclic: true, automaticRecomputeAllowed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
