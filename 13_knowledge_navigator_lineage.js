/* ============================================================
   FILE: 13_knowledge_navigator_lineage.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Lineage 1.0.0
   Phase 5: Authority / Evidence / Lineage
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 lineage blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("lineage");
  const RESOLVER_ID = "IDE-180-RESOLVER-LINEAGE-VERSION-TIMELINE";
  const NAVIGATION_TYPES = ["lineage", "version", "timeline"];
  const LINEAGE_RELATION_TYPES = ["supersedes", "replaces", "derived-from", "generated-from", "based-on", "previous-version", "next-version"];

  function loadArtifact(type) {
    if (typeof namespace.getIntelligencePackageArtifact !== "function") return internal.buildResult(false, "IDE180_LINEAGE_PROVIDER_UNAVAILABLE", "missing-source", null, { missingSource: { sourceType: "ide170-intelligence-package", artifactType: type } });
    return namespace.getIntelligencePackageArtifact({ artifactType: type });
  }

  function findRawCanonicalRecord(canonicalId) {
    const loaded = loadArtifact("canonical-snapshot");
    if (!loaded || loaded.ok !== true || !loaded.data || !loaded.data.artifact) return loaded;
    const payload = loaded.data.artifact.payload || {};
    const record = (Array.isArray(payload.records) ? payload.records : []).find(function find(item) { return item && item.identity && item.identity.canonicalId === canonicalId; }) || null;
    if (!record) return internal.buildResult(false, "IDE180_LINEAGE_TARGET_NOT_FOUND", "not-found", { canonicalId: canonicalId }, { sourceSnapshot: loaded.sourceSnapshot || null });
    return internal.buildResult(true, "IDE180_LINEAGE_CANONICAL_RECORD_READY", "complete", { record: internal.clone(record), snapshot: { snapshotId: payload.snapshotId || null, sourceIntakeId: payload.sourceIntakeId || null, capturedAt: payload.capturedAt || null, frozenAt: payload.frozenAt || null } }, { sourceSnapshot: loaded.sourceSnapshot || null });
  }

  function explicitGraphLineage(canonicalId) {
    const loaded = loadArtifact("fact-relationship-graph");
    if (!loaded || loaded.ok !== true || !loaded.data || !loaded.data.artifact) return [];
    const graph = loaded.data.artifact.payload || {};
    return (Array.isArray(graph.factEdges) ? graph.factEdges : []).filter(function filter(edge) {
      const type = String(edge && edge.relationshipType || "").toLowerCase();
      const sourceId = edge && edge.sourceNode && edge.sourceNode.canonicalId;
      const targetId = edge && edge.targetNode && edge.targetNode.canonicalId;
      return LINEAGE_RELATION_TYPES.includes(type) && (sourceId === canonicalId || targetId === canonicalId);
    }).map(function map(edge) {
      return internal.deepFreeze({
        type: edge.relationshipType,
        edgeId: edge.edgeId || null,
        sourceCanonicalId: edge.sourceNode && edge.sourceNode.canonicalId || null,
        targetCanonicalId: edge.targetNode && edge.targetNode.canonicalId || null,
        layer: edge.layer || "fact",
        evidenceReferenceIds: (Array.isArray(edge.evidence) ? edge.evidence : []).map(function id(item) { return item && item.evidenceId; }).filter(Boolean),
        immutable: true
      });
    });
  }

  function buildLineage(canonicalId) {
    const found = findRawCanonicalRecord(canonicalId);
    if (!found || found.ok !== true) return found;
    const record = found.data.record;
    const source = record.source || {};
    const snapshot = found.data.snapshot || {};
    const lineage = [];
    if (source.sourceRecordId || source.sourceId || source.adapterId) {
      lineage.push(internal.deepFreeze({
        type: "source-record",
        canonicalId: canonicalId,
        sourceRecordId: source.sourceRecordId || null,
        sourceId: source.sourceId || null,
        sourceType: source.sourceType || null,
        sourceVersion: source.sourceVersion || null,
        adapterId: source.adapterId || null,
        adapterVersion: source.adapterVersion || null,
        sourceUpdatedAt: source.sourceUpdatedAt || null,
        capturedAt: source.capturedAt || null,
        immutable: true
      }));
    }
    if (snapshot.snapshotId || snapshot.sourceIntakeId) {
      lineage.push(internal.deepFreeze({ type: "canonical-snapshot", snapshotId: snapshot.snapshotId || null, sourceIntakeId: snapshot.sourceIntakeId || null, capturedAt: snapshot.capturedAt || null, frozenAt: snapshot.frozenAt || null, immutable: true }));
    }
    explicitGraphLineage(canonicalId).forEach(function add(item) { lineage.push(item); });
    const provider = typeof namespace.getIntelligenceProviderStatus === "function" ? namespace.getIntelligenceProviderStatus() : null;
    if (provider && provider.activePackage) {
      lineage.push(internal.deepFreeze({ type: "intelligence-package", packageId: provider.activePackage.packageId || null, packageHash: provider.activePackage.packageHash || null, sourceOrigin: provider.activePackage.sourceOrigin || null, immutable: true }));
    }
    return internal.buildResult(true, "IDE180_LINEAGE_RESOLVED", "complete", { canonicalId: canonicalId, lineage: lineage, sourceRecord: internal.clone(record) }, { sourceSnapshot: found.sourceSnapshot || null });
  }

  function targetValue(request) {
    const target = request && request.target;
    if (typeof target === "string") return target;
    if (target && typeof target === "object") return target.canonicalId || target.recordId || target.name || target.value || "";
    return internal.text(request && request.query, "");
  }

  function resolve(request) {
    const type = internal.text(request && request.navigationType, "lineage");
    if (!NAVIGATION_TYPES.includes(type)) return internal.buildResult(false, "IDE180_LINEAGE_TYPE_UNSUPPORTED", "unsupported", { navigationType: type });
    const value = targetValue(request);
    const targetResolved = typeof namespace.resolveCanonicalNavigationTarget === "function" ? namespace.resolveCanonicalNavigationTarget(value, { limit: 20 }) : null;
    if (!targetResolved || targetResolved.ok !== true || !targetResolved.data || !targetResolved.data.target) return targetResolved || internal.buildResult(false, "IDE180_LINEAGE_TARGET_NOT_RESOLVED", "not-found", null);
    const lineageResult = buildLineage(targetResolved.data.target.canonicalId);
    if (!lineageResult || lineageResult.ok !== true) return lineageResult;
    let lineage = lineageResult.data.lineage.slice();
    if (type === "version") lineage = lineage.filter(function filter(item) { return item.type === "source-record" || item.type === "canonical-snapshot" || ["supersedes", "replaces", "previous-version", "next-version"].includes(String(item.type || "").toLowerCase()); });
    if (type === "timeline") lineage = lineage.slice().sort(function sort(a, b) { return String(a.capturedAt || a.sourceUpdatedAt || a.frozenAt || "").localeCompare(String(b.capturedAt || b.sourceUpdatedAt || b.frozenAt || "")); });
    return internal.buildResult(true, "IDE180_LINEAGE_NAVIGATION_RESOLVED", "complete", {
      target: targetResolved.data.target,
      navigationPath: lineage.map(function map(item, index) { return { pathId: "IDE-180-LINEAGE-PATH-" + String(index + 1).padStart(3, "0"), depth: index + 1, lineageType: item.type, source: internal.clone(item) }; }),
      lineage: lineage,
      validation: { status: "not-evaluated", reason: "Lineage was resolved from explicit Source metadata and Fact relationships only." },
      version: lineageResult.data.sourceRecord && lineageResult.data.sourceRecord.source && lineageResult.data.sourceRecord.source.sourceVersion || null,
      sourceSnapshot: lineageResult.sourceSnapshot || null
    });
  }

  const resolverDefinition = { resolverId: RESOLVER_ID, version: MODULE_VERSION, navigationTypes: NAVIGATION_TYPES.slice(), readOnly: true, resolve: resolve };

  function initializeLineage() {
    const existing = typeof namespace.getResolverDefinition === "function" ? namespace.getResolverDefinition(RESOLVER_ID) : null;
    const registration = existing ? internal.buildResult(true, "IDE180_RESOLVER_EXISTS", "Ready", { resolverId: RESOLVER_ID, existing: true }) : namespace.registerResolverDefinition(resolverDefinition);
    namespace.modules.lineage.status = registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration.ok === true, registration.ok === true ? "IDE180_LINEAGE_INITIALIZED" : "IDE180_LINEAGE_INITIALIZATION_FAILED", registration.ok === true ? "Ready" : "Blocked", { resolverId: RESOLVER_ID, navigationTypes: NAVIGATION_TYPES.slice(), registration: registration, readOnly: true });
  }

  Object.assign(namespace.api, { initializeLineage: initializeLineage, resolveKnowledgeLineage: buildLineage, resolveLineageNavigation: resolve });
  Object.assign(namespace, namespace.api);

  namespace.modules.lineage = { id: "IDE-180-LINEAGE", version: MODULE_VERSION, status: "Loaded", phase: 5, resolverId: RESOLVER_ID, navigationTypes: NAVIGATION_TYPES.slice(), inferredLineageAllowed: false, readOnly: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
