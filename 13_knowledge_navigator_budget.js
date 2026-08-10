/* ============================================================
   FILE: 13_knowledge_navigator_budget.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Budget 1.0.0
   Phase 4: Relationship / Traversal
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 budget blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("budget");
  const TIERS = Object.freeze(["LIGHT", "STANDARD", "DEEP"]);
  const STANDARD_TYPES = Object.freeze([
    "relationship", "dependency", "reverse-dependency", "workflow", "knowledge",
    "architecture", "decision", "evidence", "lineage", "version", "timeline",
    "validation", "insight"
  ]);

  function graphSize(graph) {
    const source = internal.isPlainObject(graph) ? graph : {};
    const nodes = Array.isArray(source.nodes) ? source.nodes.length : 0;
    const factEdges = Array.isArray(source.factEdges) ? source.factEdges.length : 0;
    const candidateEdges = Array.isArray(source.candidateEdges) ? source.candidateEdges.length : 0;
    return { nodes: nodes, relationships: factEdges + candidateEdges };
  }

  function resolveBudgetTier(navigationType, request) {
    const requested = internal.text(request && request.options && request.options.budgetTier, "").toUpperCase();
    if (TIERS.includes(requested)) return requested;
    return STANDARD_TYPES.includes(internal.text(navigationType, "")) ? "STANDARD" : "LIGHT";
  }

  function buildTraversalBudget(request, graph, navigationType) {
    const size = graphSize(graph);
    const hardMaxDepth = Math.max(1, size.nodes > 1 ? size.nodes - 1 : 1);
    const requestedDepth = Number.isInteger(request && request.maxDepth) && request.maxDepth > 0 ? request.maxDepth : 1;
    const effectiveDepth = Math.min(requestedDepth, hardMaxDepth);
    const tier = resolveBudgetTier(navigationType, request);
    const hardCeilingReached = requestedDepth > hardMaxDepth;

    return internal.deepFreeze({
      policyVersion: MODULE_VERSION,
      tier: tier,
      requested: {
        maxDepth: requestedDepth,
        maxNodes: null,
        maxRelationships: null,
        maxProviderReads: null,
        maxResults: null
      },
      effective: {
        maxDepth: effectiveDepth,
        maxNodes: size.nodes,
        maxRelationships: size.relationships,
        maxProviderReads: null,
        maxResults: size.nodes
      },
      hardSafetyCeiling: {
        maxDepth: hardMaxDepth,
        maxNodes: size.nodes,
        maxRelationships: size.relationships,
        maxProviderReads: null,
        maxResults: size.nodes,
        derivedFromSourceGraph: true,
        disableAllowed: false
      },
      limitReason: hardCeilingReached ? "hard-safety-ceiling-reached" : null,
      numericDeviceCalibration: "Deferred to Android real-device validation; source-derived ceiling active.",
      silentExpansionAllowed: false,
      readOnly: true
    });
  }

  function initializeBudget() {
    namespace.modules.budget.status = "Ready";
    return internal.buildResult(true, "IDE180_BUDGET_INITIALIZED", "Ready", {
      tiers: TIERS.slice(),
      hardSafetyCeiling: "source-derived",
      deviceNumericCalibrationDeferred: true,
      readOnly: true
    });
  }

  Object.assign(namespace.api, {
    initializeBudget: initializeBudget,
    resolveKnowledgeNavigatorBudgetTier: resolveBudgetTier,
    buildKnowledgeNavigatorTraversalBudget: buildTraversalBudget
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.budget = {
    id: "IDE-180-BUDGET",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    tiers: TIERS.slice(),
    hardSafetyCeilingDisableAllowed: false,
    scoringAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
