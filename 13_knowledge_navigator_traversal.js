/* ============================================================
   FILE: 13_knowledge_navigator_traversal.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Traversal 1.0.0
   Phase 4: Relationship / Traversal
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 traversal blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("traversal");
  const STRATEGIES = Object.freeze(["breadth-first", "depth-first", "hybrid"]);
  const DIRECTIONS = Object.freeze(["outgoing", "incoming", "both"]);

  function stableEdgeKey(edge) {
    const source = edge && edge.sourceNode && edge.sourceNode.canonicalId || "";
    const target = edge && edge.targetNode && edge.targetNode.canonicalId || "";
    const type = edge && edge.relationshipType || "";
    const layer = edge && edge.layer || "";
    const id = edge && (edge.edgeId || edge.edgeKey) || "";
    return [type, source, target, layer, id].join("|");
  }

  function cloneEdgeForTraversal(edge, fromId, toId, traversedDirection) {
    const copy = internal.clone(edge);
    copy.traversedFrom = fromId;
    copy.traversedTo = toId;
    copy.traversedDirection = traversedDirection;
    return copy;
  }

  function filteredEdges(graph, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const layers = new Set((Array.isArray(settings.layers) && settings.layers.length ? settings.layers : ["fact"]).map(function normalize(value) { return String(value).toLowerCase(); }));
    const relationshipTypes = new Set((Array.isArray(settings.relationshipTypes) ? settings.relationshipTypes : []).map(function normalize(value) { return String(value).toLowerCase(); }));
    return (Array.isArray(graph && graph.factEdges) ? graph.factEdges : [])
      .concat(Array.isArray(graph && graph.candidateEdges) ? graph.candidateEdges : [])
      .filter(function filter(edge) {
        return layers.has(String(edge && edge.layer || "fact").toLowerCase()) &&
          (!relationshipTypes.size || relationshipTypes.has(String(edge && edge.relationshipType || "").toLowerCase()));
      })
      .slice()
      .sort(function sort(a, b) { return stableEdgeKey(a).localeCompare(stableEdgeKey(b)); });
  }

  function adjacencyFor(graph, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const direction = DIRECTIONS.includes(settings.direction) ? settings.direction : "both";
    const adjacency = new Map();
    const edges = filteredEdges(graph, settings);

    function add(nodeId, record) {
      if (!nodeId) return;
      if (!adjacency.has(nodeId)) adjacency.set(nodeId, []);
      adjacency.get(nodeId).push(record);
    }

    edges.forEach(function each(edge) {
      const sourceId = edge && edge.sourceNode && edge.sourceNode.canonicalId;
      const targetId = edge && edge.targetNode && edge.targetNode.canonicalId;
      if (!sourceId || !targetId) return;
      if (direction === "outgoing" || direction === "both") {
        add(sourceId, { edge: edge, nextId: targetId, traversedDirection: "forward" });
      }
      if (direction === "incoming" || direction === "both") {
        add(targetId, { edge: edge, nextId: sourceId, traversedDirection: "reverse" });
      }
    });

    adjacency.forEach(function sort(list) {
      list.sort(function compare(a, b) {
        return [stableEdgeKey(a.edge), a.nextId, a.traversedDirection].join("|")
          .localeCompare([stableEdgeKey(b.edge), b.nextId, b.traversedDirection].join("|"));
      });
    });
    return { adjacency: adjacency, edges: edges, direction: direction };
  }

  function pathRecord(startId, current, edgeRecord) {
    return {
      startCanonicalId: startId,
      targetCanonicalId: edgeRecord.nextId,
      depth: current.edges.length + 1,
      nodes: current.nodes.concat(edgeRecord.nextId),
      edges: current.edges.concat(cloneEdgeForTraversal(edgeRecord.edge, current.nodeId, edgeRecord.nextId, edgeRecord.traversedDirection))
    };
  }

  function traverseBreadthFirst(startId, adjacency, budget) {
    const queue = [{ nodeId: startId, nodes: [startId], edges: [] }];
    const bestDepth = new Map([[startId, 0]]);
    const discovered = [];
    const cycles = [];
    let relationshipsExamined = 0;
    let limitReached = null;

    while (queue.length) {
      const current = queue.shift();
      if (current.edges.length >= budget.effective.maxDepth) continue;
      const nextRecords = adjacency.get(current.nodeId) || [];
      for (const next of nextRecords) {
        relationshipsExamined += 1;
        if (relationshipsExamined > budget.effective.maxRelationships) {
          limitReached = "relationship-budget-reached";
          break;
        }
        if (current.nodes.includes(next.nextId)) {
          cycles.push({ nodes: current.nodes.concat(next.nextId), edge: cloneEdgeForTraversal(next.edge, current.nodeId, next.nextId, next.traversedDirection) });
          continue;
        }
        const candidate = pathRecord(startId, current, next);
        if (bestDepth.has(next.nextId) && bestDepth.get(next.nextId) < candidate.depth) continue;
        if (!bestDepth.has(next.nextId)) discovered.push(candidate);
        bestDepth.set(next.nextId, candidate.depth);
        if (discovered.length >= budget.effective.maxResults || bestDepth.size > Math.max(1, budget.effective.maxNodes)) {
          limitReached = discovered.length >= budget.effective.maxResults ? "result-budget-reached" : "node-budget-reached";
          break;
        }
        queue.push({ nodeId: next.nextId, nodes: candidate.nodes, edges: candidate.edges });
      }
      if (limitReached) break;
    }
    return { paths: discovered, cycles: cycles, relationshipsExamined: relationshipsExamined, limitReached: limitReached };
  }

  function traverseDepthFirst(startId, adjacency, budget, initialPaths) {
    const discovered = Array.isArray(initialPaths) ? initialPaths.slice() : [];
    const cycles = [];
    const seenTargets = new Set(discovered.map(function target(path) { return path.targetCanonicalId; }));
    let relationshipsExamined = 0;
    let limitReached = null;

    function walk(current) {
      if (limitReached || current.edges.length >= budget.effective.maxDepth) return;
      const nextRecords = adjacency.get(current.nodeId) || [];
      for (const next of nextRecords) {
        relationshipsExamined += 1;
        if (relationshipsExamined > budget.effective.maxRelationships) {
          limitReached = "relationship-budget-reached";
          return;
        }
        if (current.nodes.includes(next.nextId)) {
          cycles.push({ nodes: current.nodes.concat(next.nextId), edge: cloneEdgeForTraversal(next.edge, current.nodeId, next.nextId, next.traversedDirection) });
          continue;
        }
        const candidate = pathRecord(startId, current, next);
        if (!seenTargets.has(candidate.targetCanonicalId)) {
          seenTargets.add(candidate.targetCanonicalId);
          discovered.push(candidate);
          if (discovered.length >= budget.effective.maxResults || seenTargets.size + 1 > Math.max(1, budget.effective.maxNodes)) {
            limitReached = discovered.length >= budget.effective.maxResults ? "result-budget-reached" : "node-budget-reached";
            return;
          }
        }
        walk({ nodeId: next.nextId, nodes: candidate.nodes, edges: candidate.edges });
        if (limitReached) return;
      }
    }

    walk({ nodeId: startId, nodes: [startId], edges: [] });
    return { paths: discovered, cycles: cycles, relationshipsExamined: relationshipsExamined, limitReached: limitReached };
  }

  function traverseHybrid(startId, adjacency, budget) {
    if (budget.effective.maxDepth <= 1) return traverseBreadthFirst(startId, adjacency, budget);
    const directBudget = internal.clone(budget);
    directBudget.effective.maxDepth = 1;
    const direct = traverseBreadthFirst(startId, adjacency, directBudget);
    if (direct.limitReached) return direct;

    const discovered = direct.paths.slice();
    const cycles = direct.cycles.slice();
    const seen = new Set(discovered.map(function target(path) { return path.targetCanonicalId; }));
    let relationshipsExamined = direct.relationshipsExamined;
    let limitReached = null;

    function walkFrom(path) {
      if (limitReached || path.depth >= budget.effective.maxDepth) return;
      const currentId = path.targetCanonicalId;
      const nextRecords = adjacency.get(currentId) || [];
      for (const next of nextRecords) {
        relationshipsExamined += 1;
        if (relationshipsExamined > budget.effective.maxRelationships) {
          limitReached = "relationship-budget-reached";
          return;
        }
        if (path.nodes.includes(next.nextId)) {
          cycles.push({ nodes: path.nodes.concat(next.nextId), edge: cloneEdgeForTraversal(next.edge, currentId, next.nextId, next.traversedDirection) });
          continue;
        }
        const current = { nodeId: currentId, nodes: path.nodes, edges: path.edges };
        const candidate = pathRecord(startId, current, next);
        if (!seen.has(candidate.targetCanonicalId)) {
          seen.add(candidate.targetCanonicalId);
          discovered.push(candidate);
          if (discovered.length >= budget.effective.maxResults || seen.size + 1 > Math.max(1, budget.effective.maxNodes)) {
            limitReached = discovered.length >= budget.effective.maxResults ? "result-budget-reached" : "node-budget-reached";
            return;
          }
        }
        walkFrom(candidate);
        if (limitReached) return;
      }
    }

    direct.paths.forEach(function each(path) {
      if (!limitReached) walkFrom(path);
    });
    return { paths: discovered, cycles: cycles, relationshipsExamined: relationshipsExamined, limitReached: limitReached };
  }

  function traverseRelationshipGraph(graph, startCanonicalId, options) {
    const settings = internal.isPlainObject(options) ? internal.clone(options) : {};
    const startId = internal.text(startCanonicalId, "");
    if (!startId) return internal.buildResult(false, "IDE180_TRAVERSAL_START_REQUIRED", "invalid-request", null);
    if (!graph || !Array.isArray(graph.nodes)) return internal.buildResult(false, "IDE180_TRAVERSAL_GRAPH_REQUIRED", "missing-source", null);
    if (!graph.nodes.some(function match(node) { return node && node.canonicalId === startId; })) {
      return internal.buildResult(false, "IDE180_TRAVERSAL_START_NOT_IN_GRAPH", "missing-source", { startCanonicalId: startId }, {
        missingSource: { sourceType: "fact-relationship-graph", canonicalId: startId, reason: "target-not-in-relationship-graph" }
      });
    }

    const strategy = STRATEGIES.includes(settings.strategy) ? settings.strategy : "breadth-first";
    const budget = settings.budget || namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: settings.maxDepth, options: { budgetTier: settings.budgetTier } }, graph, settings.navigationType || "relationship");
    const built = adjacencyFor(graph, settings);
    let traversed;
    if (strategy === "depth-first") traversed = traverseDepthFirst(startId, built.adjacency, budget);
    else if (strategy === "hybrid") traversed = traverseHybrid(startId, built.adjacency, budget);
    else traversed = traverseBreadthFirst(startId, built.adjacency, budget);

    const hardCeiling = budget.limitReason === "hard-safety-ceiling-reached";
    const limitReached = traversed.limitReached || budget.limitReason || null;
    const truncated = Boolean(limitReached);
    return internal.buildResult(true, "IDE180_RELATIONSHIP_TRAVERSAL_COMPLETE", truncated ? "partial" : "complete", {
      startCanonicalId: startId,
      strategy: strategy,
      direction: built.direction,
      paths: traversed.paths,
      cyclePaths: traversed.cycles,
      relationshipsExamined: traversed.relationshipsExamined,
      availableRelationshipCount: built.edges.length,
      visitedCanonicalIds: internal.unique([startId].concat(traversed.paths.map(function target(path) { return path.targetCanonicalId; }))),
      budget: budget,
      truncation: {
        truncated: truncated,
        reason: limitReached,
        hardSafetyCeilingReached: hardCeiling
      }
    });
  }

  function initializeTraversal() {
    namespace.modules.traversal.status = "Ready";
    return internal.buildResult(true, "IDE180_TRAVERSAL_INITIALIZED", "Ready", {
      strategies: STRATEGIES.slice(),
      cycleDetection: true,
      deterministicOrdering: true,
      candidateLayerDefault: false,
      readOnly: true
    });
  }

  Object.assign(namespace.api, {
    initializeTraversal: initializeTraversal,
    traverseKnowledgeRelationshipGraph: traverseRelationshipGraph
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.traversal = {
    id: "IDE-180-TRAVERSAL",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    strategies: STRATEGIES.slice(),
    cycleDetection: true,
    deterministicOrdering: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
