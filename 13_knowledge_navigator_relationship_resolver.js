/* ============================================================
   FILE: 13_knowledge_navigator_relationship_resolver.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Relationship Resolver 1.0.0
   Phase 4: Relationship / Traversal
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 relationship resolver blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("relationshipResolver");
  const RESOLVER_ID = "IDE-180-RESOLVER-RELATIONSHIP-TRAVERSAL";
  const NAVIGATION_TYPES = Object.freeze(["relationship", "dependency", "reverse-dependency", "workflow"]);
  const DEPENDENCY_TYPES = Object.freeze(["calls", "imports", "references", "depends-on", "implements", "consumes", "produces"]);

  function targetValue(request) {
    const target = request && request.target;
    if (target == null) return internal.text(request && request.query, "");
    if (typeof target === "string") return target;
    return internal.text(target.canonicalId || target.recordId || target.name || target.qualifiedName, internal.text(request && request.query, ""));
  }

  function loadGraph() {
    if (typeof namespace.getIntelligencePackageArtifact !== "function") {
      return internal.buildResult(false, "IDE180_RELATIONSHIP_PROVIDER_UNAVAILABLE", "missing-source", null, {
        missingSource: { sourceType: "ide170-intelligence-package", artifactType: "fact-relationship-graph", reason: "provider-api-unavailable" }
      });
    }
    const loaded = namespace.getIntelligencePackageArtifact({ artifactType: "fact-relationship-graph" });
    if (!loaded || loaded.ok !== true || !loaded.data || !loaded.data.artifact) return loaded;
    const graph = loaded.data.artifact.payload;
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.factEdges)) {
      return internal.buildResult(false, "IDE180_RELATIONSHIP_GRAPH_INVALID", "incompatible", null);
    }
    return internal.buildResult(true, "IDE180_RELATIONSHIP_GRAPH_READY", "complete", {
      graph: graph,
      record: loaded.data.record
    }, { sourceSnapshot: loaded.sourceSnapshot || null });
  }

  function resolveTarget(request, graph) {
    const type = internal.text(request && request.navigationType, "");
    const target = request && request.target;
    const canonicalId = target && typeof target === "object" ? internal.text(target.canonicalId, "") : "";
    if (canonicalId) {
      const node = graph.nodes.find(function find(item) { return item && item.canonicalId === canonicalId; }) || null;
      if (node) {
        const resolved = typeof namespace.resolveCanonicalNavigationTarget === "function"
          ? namespace.resolveCanonicalNavigationTarget(canonicalId, { recordType: node.recordType, limit: 20 })
          : null;
        return internal.buildResult(true, "IDE180_RELATIONSHIP_TARGET_RESOLVED", "complete", {
          target: resolved && resolved.ok === true && resolved.data ? resolved.data.target : internal.clone(node),
          graphNode: internal.clone(node)
        });
      }
    }

    if (type === "workflow") {
      const workflowNodes = graph.nodes.filter(function filter(node) { return node && node.recordType === "workflow-package"; });
      if (!workflowNodes.length) {
        return internal.buildResult(false, "IDE180_WORKFLOW_SOURCE_MISSING", "missing-source", { candidates: [] }, {
          missingSource: { sourceType: "fact-relationship-graph", capability: "workflow-navigation", recordType: "workflow-package", reason: "workflow-node-unavailable" }
        });
      }
    }

    const value = targetValue(request);
    if (!value) return internal.buildResult(false, "IDE180_RELATIONSHIP_TARGET_REQUIRED", "invalid-request", null);
    const recordType = type === "workflow" ? "workflow-package" : internal.text(target && typeof target === "object" && target.recordType, "");
    const resolved = namespace.resolveCanonicalNavigationTarget(target || value, { recordType: recordType, limit: 20 });
    if (!resolved || resolved.ok !== true || !resolved.data || !resolved.data.target) return resolved;
    const node = graph.nodes.find(function find(item) { return item && item.canonicalId === resolved.data.target.canonicalId; }) || null;
    if (!node) {
      return internal.buildResult(false, "IDE180_RELATIONSHIP_TARGET_NOT_IN_GRAPH", "missing-source", { target: resolved.data.target }, {
        missingSource: { sourceType: "fact-relationship-graph", canonicalId: resolved.data.target.canonicalId, reason: "target-not-in-relationship-graph" }
      });
    }
    return internal.buildResult(true, "IDE180_RELATIONSHIP_TARGET_RESOLVED", "complete", {
      target: resolved.data.target,
      graphNode: internal.clone(node)
    });
  }

  function policyFor(request) {
    const type = internal.text(request && request.navigationType, "relationship");
    const options = internal.isPlainObject(request && request.options) ? request.options : {};
    const explicitTypes = Array.isArray(options.relationshipTypes) ? options.relationshipTypes.map(function normalize(value) { return String(value).toLowerCase(); }) : [];
    const includeCandidates = options.includeCandidates === true;
    if (type === "dependency") {
      return { strategy: "breadth-first", direction: "outgoing", relationshipTypes: explicitTypes.length ? explicitTypes.filter(function allowed(value) { return DEPENDENCY_TYPES.includes(value); }) : DEPENDENCY_TYPES.slice(), layers: includeCandidates ? ["fact", "candidate"] : ["fact"] };
    }
    if (type === "reverse-dependency") {
      return { strategy: "breadth-first", direction: "incoming", relationshipTypes: explicitTypes.length ? explicitTypes.filter(function allowed(value) { return DEPENDENCY_TYPES.includes(value); }) : DEPENDENCY_TYPES.slice(), layers: includeCandidates ? ["fact", "candidate"] : ["fact"] };
    }
    if (type === "workflow") {
      return { strategy: "hybrid", direction: "both", relationshipTypes: explicitTypes, layers: includeCandidates ? ["fact", "candidate"] : ["fact"] };
    }
    return { strategy: "breadth-first", direction: ["incoming", "outgoing", "both"].includes(options.direction) ? options.direction : "both", relationshipTypes: explicitTypes, layers: includeCandidates ? ["fact", "candidate"] : ["fact"] };
  }

  function nodeIndex(graph) {
    return new Map(graph.nodes.map(function map(node) { return [node.canonicalId, node]; }));
  }

  function normalizeRelationship(edge) {
    const sourceId = edge && edge.sourceNode && edge.sourceNode.canonicalId || null;
    const targetId = edge && edge.targetNode && edge.targetNode.canonicalId || null;
    return internal.deepFreeze({
      relationshipId: edge && (edge.edgeId || edge.edgeKey) || [sourceId, edge && edge.relationshipType, targetId, edge && edge.layer].join("|"),
      relationshipType: edge && edge.relationshipType || null,
      layer: edge && edge.layer || "fact",
      direction: edge && edge.direction || "directed",
      source: internal.clone(edge && edge.sourceNode || null),
      target: internal.clone(edge && edge.targetNode || null),
      traversedFrom: edge && edge.traversedFrom || sourceId,
      traversedTo: edge && edge.traversedTo || targetId,
      traversedDirection: edge && edge.traversedDirection || "forward",
      evidenceReferenceIds: (Array.isArray(edge && edge.evidence) ? edge.evidence : []).map(function id(item) { return item && item.evidenceId; }).filter(Boolean),
      provenance: internal.clone(edge && edge.provenance || {}),
      candidate: String(edge && edge.layer || "fact").toLowerCase() === "candidate",
      immutable: true
    });
  }

  function resolve(request) {
    const type = internal.text(request && request.navigationType, "");
    if (!NAVIGATION_TYPES.includes(type)) {
      return internal.buildResult(false, "IDE180_RELATIONSHIP_RESOLVER_TYPE_UNSUPPORTED", "unsupported", { navigationType: type });
    }
    const loaded = loadGraph();
    if (!loaded || loaded.ok !== true) return loaded;
    const graph = loaded.data.graph;
    const targetResolution = resolveTarget(request, graph);
    if (!targetResolution || targetResolution.ok !== true) return targetResolution;

    const target = targetResolution.data.target;
    const startId = target && target.canonicalId || targetResolution.data.graphNode && targetResolution.data.graphNode.canonicalId;
    const policy = policyFor(request);
    const budget = namespace.buildKnowledgeNavigatorTraversalBudget(request, graph, type);
    const traversed = namespace.traverseKnowledgeRelationshipGraph(graph, startId, {
      navigationType: type,
      strategy: policy.strategy,
      direction: policy.direction,
      relationshipTypes: policy.relationshipTypes,
      layers: policy.layers,
      maxDepth: budget.effective.maxDepth,
      budgetTier: budget.tier,
      budget: budget
    });
    if (!traversed || traversed.ok !== true) return traversed;

    const nodes = nodeIndex(graph);
    const uniqueRelationships = new Map();
    const navigationPaths = traversed.data.paths.map(function path(item, index) {
      const relationships = item.edges.map(normalizeRelationship);
      relationships.forEach(function remember(rel) { uniqueRelationships.set(rel.relationshipId + "|" + rel.traversedFrom + "|" + rel.traversedTo, rel); });
      return {
        pathId: "IDE-180-PATH-" + String(index + 1).padStart(3, "0"),
        depth: item.depth,
        nodePath: item.nodes.map(function map(id) { return internal.clone(nodes.get(id) || { canonicalId: id }); }),
        relationships: relationships,
        targetCanonicalId: item.targetCanonicalId
      };
    });

    const status = traversed.status === "partial" ? "partial" : "complete";
    return internal.buildResult(true, "IDE180_RELATIONSHIP_NAVIGATION_RESOLVED", status, {
      navigationType: type,
      target: target,
      navigationPath: navigationPaths,
      relationships: Array.from(uniqueRelationships.values()),
      relationshipCount: uniqueRelationships.size,
      traversal: {
        strategy: policy.strategy,
        direction: policy.direction,
        relationshipTypes: policy.relationshipTypes,
        layers: policy.layers,
        visitedCanonicalIds: traversed.data.visitedCanonicalIds,
        cyclePaths: traversed.data.cyclePaths,
        relationshipsExamined: traversed.data.relationshipsExamined,
        availableRelationshipCount: traversed.data.availableRelationshipCount
      },
      budget: budget,
      truncation: traversed.data.truncation,
      partialReason: traversed.data.truncation && traversed.data.truncation.truncated ? traversed.data.truncation.reason : null,
      graph: {
        graphId: graph.graphId || null,
        status: graph.status || null,
        quality: internal.clone(graph.quality || {}),
        summary: internal.clone(graph.summary || {})
      },
      sourceSnapshot: loaded.sourceSnapshot || null
    });
  }

  const resolverDefinition = {
    resolverId: RESOLVER_ID,
    version: MODULE_VERSION,
    navigationTypes: NAVIGATION_TYPES.slice(),
    readOnly: true,
    resolve: resolve
  };

  function initializeRelationshipResolver() {
    const existing = internal.state.resolverDefinitions instanceof Map ? internal.state.resolverDefinitions.get(RESOLVER_ID) : null;
    const registration = existing
      ? internal.buildResult(true, "IDE180_RESOLVER_EXISTS", "Ready", { resolverId: RESOLVER_ID, existing: true })
      : namespace.registerResolverDefinition(resolverDefinition);
    namespace.modules.relationshipResolver.status = registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration.ok === true, registration.ok === true ? "IDE180_RELATIONSHIP_RESOLVER_INITIALIZED" : "IDE180_RELATIONSHIP_RESOLVER_INITIALIZATION_FAILED", registration.ok === true ? "Ready" : "Blocked", {
      registration: registration,
      resolverId: RESOLVER_ID,
      navigationTypes: NAVIGATION_TYPES.slice(),
      dependencyTypes: DEPENDENCY_TYPES.slice()
    });
  }

  Object.assign(namespace.api, {
    initializeRelationshipResolver: initializeRelationshipResolver,
    resolveRelationshipNavigation: resolve,
    getRelationshipNavigationResolverDefinition: function getDefinition() { return internal.clone(resolverDefinition); },
    getKnowledgeNavigatorDependencyRelationshipTypes: function getTypes() { return DEPENDENCY_TYPES.slice(); }
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.relationshipResolver = {
    id: RESOLVER_ID,
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    navigationTypes: NAVIGATION_TYPES.slice(),
    dependencyTypes: DEPENDENCY_TYPES.slice(),
    candidateLayerDefault: false,
    scoringAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
