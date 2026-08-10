/* ============================================================
   FILE: 13_knowledge_navigator_evidence.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Evidence 1.0.0
   Phase 5: Authority / Evidence / Lineage
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 evidence blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("evidence");
  const RESOLVER_ID = "IDE-180-RESOLVER-EVIDENCE-TRACE";

  function loadArtifact(type) {
    if (typeof namespace.getIntelligencePackageArtifact !== "function") {
      return internal.buildResult(false, "IDE180_EVIDENCE_PROVIDER_UNAVAILABLE", "missing-source", null, { missingSource: { sourceType: "ide170-intelligence-package", artifactType: type } });
    }
    return namespace.getIntelligencePackageArtifact({ artifactType: type });
  }

  function loadEvidenceIndex() {
    const loaded = loadArtifact("evidence-index");
    if (!loaded || loaded.ok !== true || !loaded.data || !loaded.data.artifact) return loaded;
    const payload = loaded.data.artifact.payload || {};
    const index = internal.isPlainObject(payload.evidenceIndex) ? payload.evidenceIndex : {};
    return internal.buildResult(true, "IDE180_EVIDENCE_INDEX_READY", "complete", { graphId: payload.graphId || null, evidenceIndex: index, sourceRecord: loaded.data.record || null }, { sourceSnapshot: loaded.sourceSnapshot || null });
  }

  function normalizeEvidenceRecord(id, entry) {
    const source = internal.isPlainObject(entry) ? entry : {};
    const evidence = internal.isPlainObject(source.evidence) ? source.evidence : source;
    return internal.deepFreeze({
      evidenceId: internal.text(evidence.evidenceId || id, id),
      evidenceType: internal.text(evidence.evidenceType || evidence.type, "source-reference"),
      strength: internal.text(evidence.strength, "unknown").toLowerCase(),
      recordId: evidence.recordId || null,
      sourceId: evidence.sourceId || null,
      sourceType: evidence.sourceType || null,
      sourceVersion: evidence.sourceVersion || null,
      adapterId: evidence.adapterId || null,
      adapterVersion: evidence.adapterVersion || null,
      snapshotId: evidence.snapshotId || null,
      ruleId: evidence.ruleId || null,
      detail: internal.clone(evidence.detail || {}),
      capturedAt: evidence.capturedAt || null,
      edgeIds: Array.isArray(source.edgeIds) ? source.edgeIds.slice() : [],
      immutable: true
    });
  }

  function resolveEvidenceById(evidenceId) {
    const id = internal.text(evidenceId, "");
    if (!id) return internal.buildResult(false, "IDE180_EVIDENCE_ID_REQUIRED", "invalid-request", null);
    const loaded = loadEvidenceIndex();
    if (!loaded || loaded.ok !== true) return loaded;
    const entry = loaded.data.evidenceIndex[id];
    if (!entry) return internal.buildResult(false, "IDE180_EVIDENCE_NOT_FOUND", "not-found", { evidenceId: id }, { sourceSnapshot: loaded.sourceSnapshot || null });
    return internal.deepFreeze(internal.buildResult(true, "IDE180_EVIDENCE_RESOLVED", "complete", { evidence: normalizeEvidenceRecord(id, entry), graphId: loaded.data.graphId }, { sourceSnapshot: loaded.sourceSnapshot || null }));
  }

  function evidenceIdsForCanonicalId(canonicalId) {
    const graphLoaded = loadArtifact("fact-relationship-graph");
    if (!graphLoaded || graphLoaded.ok !== true || !graphLoaded.data || !graphLoaded.data.artifact) return graphLoaded;
    const graph = graphLoaded.data.artifact.payload || {};
    const ids = [];
    (Array.isArray(graph.factEdges) ? graph.factEdges : []).forEach(function inspect(edge) {
      const sourceId = edge && edge.sourceNode && edge.sourceNode.canonicalId;
      const targetId = edge && edge.targetNode && edge.targetNode.canonicalId;
      if (sourceId !== canonicalId && targetId !== canonicalId) return;
      (Array.isArray(edge.evidence) ? edge.evidence : []).forEach(function collect(item) {
        if (item && item.evidenceId && !ids.includes(item.evidenceId)) ids.push(item.evidenceId);
      });
    });
    return internal.buildResult(true, "IDE180_EVIDENCE_REFERENCES_COLLECTED", "complete", { evidenceIds: ids, graphId: graph.graphId || null }, { sourceSnapshot: graphLoaded.sourceSnapshot || null });
  }

  function resolveEvidenceForCanonicalId(canonicalId) {
    const references = evidenceIdsForCanonicalId(canonicalId);
    if (!references || references.ok !== true) return references;
    const indexLoaded = loadEvidenceIndex();
    if (!indexLoaded || indexLoaded.ok !== true) return indexLoaded;
    const evidence = references.data.evidenceIds.map(function map(id) {
      const entry = indexLoaded.data.evidenceIndex[id];
      return entry ? normalizeEvidenceRecord(id, entry) : null;
    }).filter(Boolean);
    return internal.deepFreeze(internal.buildResult(true, "IDE180_ENTITY_EVIDENCE_RESOLVED", "complete", { canonicalId: canonicalId, evidence: evidence, unresolvedEvidenceIds: references.data.evidenceIds.filter(function missing(id) { return !indexLoaded.data.evidenceIndex[id]; }) }, { sourceSnapshot: indexLoaded.sourceSnapshot || references.sourceSnapshot || null }));
  }


  function resolveEvidenceReferences(ids) {
    const uniqueIds = internal.unique(Array.isArray(ids) ? ids : []);
    if (!uniqueIds.length) return internal.buildResult(true, "IDE180_EVIDENCE_REFERENCES_EMPTY", "complete", { evidence: [], unresolvedEvidenceIds: [] });
    const loaded = loadEvidenceIndex();
    if (!loaded || loaded.ok !== true) return loaded;
    const evidence = [];
    const unresolved = [];
    uniqueIds.forEach(function each(id) {
      const entry = loaded.data.evidenceIndex[id];
      if (entry) evidence.push(normalizeEvidenceRecord(id, entry));
      else unresolved.push(id);
    });
    return internal.deepFreeze(internal.buildResult(true, "IDE180_EVIDENCE_REFERENCES_RESOLVED", unresolved.length ? "partial" : "complete", { evidence: evidence, unresolvedEvidenceIds: unresolved }, { sourceSnapshot: loaded.sourceSnapshot || null }));
  }

  function requestTargetValue(request) {
    const target = request && request.target;
    if (typeof target === "string") return target;
    if (target && typeof target === "object") return target.evidenceId || target.canonicalId || target.recordId || target.name || target.value || "";
    return internal.text(request && request.query, "");
  }

  function resolve(request) {
    const value = requestTargetValue(request);
    if (!value) return internal.buildResult(false, "IDE180_EVIDENCE_TARGET_REQUIRED", "invalid-request", null);
    if (/^IDE-170-EVIDENCE-/i.test(value)) {
      const direct = resolveEvidenceById(value);
      if (!direct || direct.ok !== true) return direct;
      return internal.buildResult(true, "IDE180_EVIDENCE_NAVIGATION_RESOLVED", "complete", {
        target: { canonicalId: direct.data.evidence.evidenceId, recordId: direct.data.evidence.evidenceId, recordType: "evidence", name: direct.data.evidence.evidenceType, source: { sourceType: direct.data.evidence.sourceType || "evidence-index", sourceVersion: direct.data.evidence.sourceVersion || "" } },
        navigationPath: [{ pathId: "IDE-180-EVIDENCE-PATH-001", depth: 0, evidenceId: direct.data.evidence.evidenceId }],
        evidence: [direct.data.evidence],
        validation: { status: "validated", reason: "Evidence record resolved from IDE-170 evidence-index artifact." },
        lineage: direct.data.evidence.snapshotId ? [{ type: "snapshot-reference", snapshotId: direct.data.evidence.snapshotId, sourceId: direct.data.evidence.sourceId || null }] : [],
        sourceSnapshot: direct.sourceSnapshot || null
      });
    }
    const targetResolved = typeof namespace.resolveCanonicalNavigationTarget === "function" ? namespace.resolveCanonicalNavigationTarget(value, { limit: 20 }) : null;
    if (!targetResolved || targetResolved.ok !== true || !targetResolved.data || !targetResolved.data.target) return targetResolved || internal.buildResult(false, "IDE180_EVIDENCE_TARGET_NOT_RESOLVED", "not-found", null);
    const found = resolveEvidenceForCanonicalId(targetResolved.data.target.canonicalId);
    if (!found || found.ok !== true) return found;
    return internal.buildResult(true, "IDE180_EVIDENCE_NAVIGATION_RESOLVED", "complete", {
      target: targetResolved.data.target,
      navigationPath: found.data.evidence.map(function path(item, index) { return { pathId: "IDE-180-EVIDENCE-PATH-" + String(index + 1).padStart(3, "0"), depth: 1, targetCanonicalId: targetResolved.data.target.canonicalId, evidenceId: item.evidenceId }; }),
      evidence: found.data.evidence,
      validation: { status: "validated", reason: "Evidence references were resolved through the package evidence-index." },
      lineage: [],
      sourceSnapshot: found.sourceSnapshot || null
    });
  }

  const resolverDefinition = { resolverId: RESOLVER_ID, version: MODULE_VERSION, navigationTypes: ["evidence"], readOnly: true, resolve: resolve };

  function initializeEvidence() {
    const existing = typeof namespace.getResolverDefinition === "function" ? namespace.getResolverDefinition(RESOLVER_ID) : null;
    const registration = existing ? internal.buildResult(true, "IDE180_RESOLVER_EXISTS", "Ready", { resolverId: RESOLVER_ID, existing: true }) : namespace.registerResolverDefinition(resolverDefinition);
    namespace.modules.evidence.status = registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration.ok === true, registration.ok === true ? "IDE180_EVIDENCE_INITIALIZED" : "IDE180_EVIDENCE_INITIALIZATION_FAILED", registration.ok === true ? "Ready" : "Blocked", { resolverId: RESOLVER_ID, registration: registration, scoringAllowed: false, readOnly: true });
  }

  Object.assign(namespace.api, {
    initializeEvidence: initializeEvidence,
    loadKnowledgeNavigatorEvidenceIndex: loadEvidenceIndex,
    resolveKnowledgeEvidenceById: resolveEvidenceById,
    resolveKnowledgeEvidenceReferences: resolveEvidenceReferences,
    resolveKnowledgeEvidenceForCanonicalId: resolveEvidenceForCanonicalId,
    resolveEvidenceNavigation: resolve
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.evidence = { id: "IDE-180-EVIDENCE", version: MODULE_VERSION, status: "Loaded", phase: 5, resolverId: RESOLVER_ID, readOnly: true, scoringAllowed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
