/* ============================================================
   FILE: 13_knowledge_navigator_phase4_validation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Phase 4 Validation 1.0.0
   Phase 4: Relationship / Traversal
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 4 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase4Validation");
  const BASIC_TYPES = ["entity", "file", "function", "module", "repository", "search"];
  const PHASE4_TYPES = ["dependency", "relationship", "reverse-dependency", "workflow"];
  const IMPLEMENTED_TYPES = BASIC_TYPES.concat(PHASE4_TYPES).sort();
  const DEPENDENCY_TYPES = ["calls", "imports", "references", "depends-on", "implements", "consumes", "produces"];

  function syntheticGraph() {
    return {
      graphId: "IDE-180-PHASE4-TRAVERSAL-FIXTURE",
      status: "Frozen",
      nodes: [
        { canonicalId: "function:a::alpha", recordType: "function", name: "alpha" },
        { canonicalId: "function:b::beta", recordType: "function", name: "beta" },
        { canonicalId: "function:c::gamma", recordType: "function", name: "gamma" },
        { canonicalId: "file:a.js", recordType: "file", name: "a.js" },
        { canonicalId: "file:b.js", recordType: "file", name: "b.js" }
      ],
      factEdges: [
        { edgeId: "EDGE-DEFINES", relationshipType: "defines", layer: "fact", direction: "directed", sourceNode: { canonicalId: "file:a.js", recordType: "file" }, targetNode: { canonicalId: "function:a::alpha", recordType: "function" }, evidence: [{ evidenceId: "EV-DEFINES" }] },
        { edgeId: "EDGE-CALL-AB", relationshipType: "calls", layer: "fact", direction: "directed", sourceNode: { canonicalId: "function:a::alpha", recordType: "function" }, targetNode: { canonicalId: "function:b::beta", recordType: "function" }, evidence: [{ evidenceId: "EV-AB" }] },
        { edgeId: "EDGE-CALL-BC", relationshipType: "calls", layer: "fact", direction: "directed", sourceNode: { canonicalId: "function:b::beta", recordType: "function" }, targetNode: { canonicalId: "function:c::gamma", recordType: "function" }, evidence: [{ evidenceId: "EV-BC" }] },
        { edgeId: "EDGE-CALL-CA", relationshipType: "calls", layer: "fact", direction: "directed", sourceNode: { canonicalId: "function:c::gamma", recordType: "function" }, targetNode: { canonicalId: "function:a::alpha", recordType: "function" }, evidence: [{ evidenceId: "EV-CA" }] }
      ],
      candidateEdges: [
        { edgeId: "EDGE-CANDIDATE-REPLACE", relationshipType: "replaces", layer: "candidate", direction: "directed", sourceNode: { canonicalId: "file:a.js", recordType: "file" }, targetNode: { canonicalId: "file:b.js", recordType: "file" }, evidence: [{ evidenceId: "EV-CANDIDATE" }] }
      ],
      quality: { status: "Ready", warnings: [], errors: [] },
      summary: { nodeCount: 5, edgeCount: 5, factEdgeCount: 4, candidateEdgeCount: 1 }
    };
  }

  async function runKnowledgeNavigatorPhase4Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : String(detail),
        group: group || "Phase 4",
        severity: severity || "High"
      });
    }

    const initialization = namespace.initialize({ requireIDE170: settings.requireIDE170 !== false });
    check("IDE-180 initialization succeeds", initialization.ok === true, initialization.code, "Initialization", "Critical");
    const status = namespace.getStatus();
    check("Release Version is 1.3.0", status.version === "1.3.0", status.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 4", VERSION_MANIFEST.implementation.phase === 4, status.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains 1.0.0", status.designFreezeVersion === "1.0.0", status.designFreezeVersion, "Manifest", "High");
    check("Completed phases include 1, 2 and 3", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1, 2, 3]), JSON.stringify(VERSION_MANIFEST.implementation.completedPhases), "Manifest", "High");

    const safety = namespace.getSafetyStatus();
    Object.keys(VERSION_MANIFEST.safety).forEach(function validateSafetyFlag(key) {
      check("Safety flag remains disabled: " + key, safety[key] === false, safety[key], "Safety", "Critical");
    });

    check("Nine frozen contracts remain registered", namespace.listContractDefinitions().length === 9, namespace.listContractDefinitions().length, "Contracts", "Critical");
    check("All frozen contracts remain read-only", namespace.listContractDefinitions().every(function readonly(item) { return item.readOnly === true; }), namespace.listContractDefinitions().filter(function mutable(item) { return item.readOnly !== true; }).length, "Contracts", "Critical");
    check("Twenty core navigation types remain registered", namespace.listNavigationTypes().length === 20, namespace.listNavigationTypes().length, "Registry", "Critical");
    const implemented = namespace.listNavigationTypes().filter(function filter(item) { return item.implemented === true; }).map(function id(item) { return item.typeId; }).sort();
    check("Exactly ten Phase 1-4 navigation types are implemented", JSON.stringify(implemented) === JSON.stringify(IMPLEMENTED_TYPES), implemented.join(","), "Registry", "Critical");
    PHASE4_TYPES.forEach(function typeCheck(type) {
      const def = namespace.getNavigationType(type);
      check("Phase 4 navigation type is implemented: " + type, Boolean(def && def.implemented === true), def && def.implemented, "Registry", "Critical");
      check("Phase 4 navigation type uses Relationship Resolver: " + type, Boolean(def && def.resolverId === "IDE-180-RESOLVER-RELATIONSHIP-TRAVERSAL"), def && def.resolverId, "Registry", "Critical");
    });
    check("Phase 5 evidence remains unimplemented", namespace.getNavigationType("evidence").implemented === false, namespace.getNavigationType("evidence").implemented, "No Overclaim", "Critical");
    check("Phase 5 lineage remains unimplemented", namespace.getNavigationType("lineage").implemented === false, namespace.getNavigationType("lineage").implemented, "No Overclaim", "Critical");
    check("Exactly two resolvers are registered", namespace.listResolverDefinitions().length === 2, namespace.listResolverDefinitions().length, "Resolver Registry", "Critical");

    const relationshipResolver = namespace.getResolverDefinition("IDE-180-RESOLVER-RELATIONSHIP-TRAVERSAL");
    check("Relationship Resolver is registered", Boolean(relationshipResolver), JSON.stringify(namespace.listResolverDefinitions()), "Resolver", "Critical");
    check("Relationship Resolver is read-only", Boolean(relationshipResolver && relationshipResolver.readOnly === true), relationshipResolver && relationshipResolver.readOnly, "Resolver", "Critical");
    check("Relationship Resolver contains four Phase 4 types", Boolean(relationshipResolver && relationshipResolver.navigationTypes && relationshipResolver.navigationTypes.length === 4), relationshipResolver && relationshipResolver.navigationTypes && relationshipResolver.navigationTypes.join(","), "Resolver", "Critical");
    check("Relationship Resolver does not contain Phase 5 Evidence", Boolean(relationshipResolver && !relationshipResolver.navigationTypes.includes("evidence")), relationshipResolver && relationshipResolver.navigationTypes && relationshipResolver.navigationTypes.join(","), "No Overclaim", "Critical");

    const fixture = syntheticGraph();
    const defaultBudget = namespace.buildKnowledgeNavigatorTraversalBudget({ navigationType: "dependency", maxDepth: null, options: {} }, fixture, "dependency");
    check("Default Relationship budget tier is STANDARD", defaultBudget.tier === "STANDARD", defaultBudget.tier, "Budget", "Critical");
    check("Default traversal depth is direct relationship only", defaultBudget.effective.maxDepth === 1, defaultBudget.effective.maxDepth, "Budget", "Critical");
    check("Hard Safety Ceiling is source-derived", defaultBudget.hardSafetyCeiling.derivedFromSourceGraph === true, JSON.stringify(defaultBudget.hardSafetyCeiling), "Budget", "Critical");
    check("Hard Safety Ceiling cannot be disabled", defaultBudget.hardSafetyCeiling.disableAllowed === false, defaultBudget.hardSafetyCeiling.disableAllowed, "Budget", "Critical");
    check("Budget uses no score", !("score" in defaultBudget), JSON.stringify(defaultBudget), "Safety", "Critical");

    const oversizedBudget = namespace.buildKnowledgeNavigatorTraversalBudget({ navigationType: "dependency", maxDepth: 999, options: { budgetTier: "DEEP" } }, fixture, "dependency");
    check("Explicit DEEP tier is preserved", oversizedBudget.tier === "DEEP", oversizedBudget.tier, "Budget", "High");
    check("Oversized depth is capped by source-derived Hard Ceiling", oversizedBudget.effective.maxDepth === fixture.nodes.length - 1, oversizedBudget.effective.maxDepth, "Budget", "Critical");
    check("Oversized depth reports hard-safety-ceiling-reached", oversizedBudget.limitReason === "hard-safety-ceiling-reached", oversizedBudget.limitReason, "Budget", "Critical");

    const bf = namespace.traverseKnowledgeRelationshipGraph(fixture, "function:a::alpha", { navigationType: "dependency", strategy: "breadth-first", direction: "outgoing", relationshipTypes: DEPENDENCY_TYPES, layers: ["fact"], maxDepth: 3, budget: namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: 3, options: {} }, fixture, "dependency") });
    check("Breadth-first traversal completes", bf.ok === true, bf.code, "Traversal Fixture", "Critical");
    check("Breadth-first traversal discovers dependency path", bf.data.paths.some(function path(item) { return item.targetCanonicalId === "function:b::beta"; }), bf.data.paths.length, "Traversal Fixture", "Critical");
    check("Multi-hop breadth-first traversal reaches gamma", bf.data.paths.some(function path(item) { return item.targetCanonicalId === "function:c::gamma" && item.depth === 2; }), JSON.stringify(bf.data.paths.map(function map(item) { return [item.targetCanonicalId, item.depth]; })), "Traversal Fixture", "Critical");
    check("Cycle detection records cycle path", bf.data.cyclePaths.length > 0, bf.data.cyclePaths.length, "Traversal Fixture", "Critical");
    check("Traversal paths do not repeat nodes internally", bf.data.paths.every(function path(item) { return new Set(item.nodes).size === item.nodes.length; }), bf.data.paths.length, "Traversal Fixture", "Critical");

    const incoming = namespace.traverseKnowledgeRelationshipGraph(fixture, "function:b::beta", { navigationType: "reverse-dependency", strategy: "breadth-first", direction: "incoming", relationshipTypes: DEPENDENCY_TYPES, layers: ["fact"], maxDepth: 1, budget: namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: 1, options: {} }, fixture, "reverse-dependency") });
    check("Incoming traversal completes", incoming.ok === true, incoming.code, "Traversal Fixture", "Critical");
    check("Incoming traversal finds alpha as reverse dependency", incoming.data.paths.some(function path(item) { return item.targetCanonicalId === "function:a::alpha"; }), incoming.data.paths.length, "Traversal Fixture", "Critical");
    check("Incoming traversal marks reversed traversal direction", incoming.data.paths.some(function path(item) { return item.edges.some(function edge(value) { return value.traversedDirection === "reverse"; }); }), JSON.stringify(incoming.data.paths), "Traversal Fixture", "High");

    const candidateDefault = namespace.traverseKnowledgeRelationshipGraph(fixture, "file:a.js", { navigationType: "relationship", strategy: "breadth-first", direction: "both", layers: ["fact"], maxDepth: 1, budget: namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: 1, options: {} }, fixture, "relationship") });
    check("Candidate layer is excluded by default fixture", candidateDefault.data.paths.every(function path(item) { return item.edges.every(function edge(value) { return value.layer !== "candidate"; }); }), JSON.stringify(candidateDefault.data.paths), "Candidate Boundary", "Critical");
    const candidateIncluded = namespace.traverseKnowledgeRelationshipGraph(fixture, "file:a.js", { navigationType: "relationship", strategy: "breadth-first", direction: "both", layers: ["fact", "candidate"], maxDepth: 1, budget: namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: 1, options: {} }, fixture, "relationship") });
    check("Candidate layer can be explicitly included", candidateIncluded.data.paths.some(function path(item) { return item.edges.some(function edge(value) { return value.layer === "candidate"; }); }), JSON.stringify(candidateIncluded.data.paths), "Candidate Boundary", "Critical");
    check("Candidate inclusion does not promote layer to fact", candidateIncluded.data.paths.some(function path(item) { return item.edges.some(function edge(value) { return value.layer === "candidate"; }); }), "candidate-preserved", "Candidate Boundary", "Critical");

    const filtered = namespace.traverseKnowledgeRelationshipGraph(fixture, "function:a::alpha", { navigationType: "relationship", strategy: "breadth-first", direction: "both", relationshipTypes: ["calls"], layers: ["fact"], maxDepth: 1, budget: namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: 1, options: {} }, fixture, "relationship") });
    check("Relationship type filter excludes defines", filtered.data.paths.every(function path(item) { return item.edges.every(function edge(value) { return value.relationshipType === "calls"; }); }), JSON.stringify(filtered.data.paths), "Traversal Policy", "Critical");
    const hybrid = namespace.traverseKnowledgeRelationshipGraph(fixture, "function:a::alpha", { navigationType: "workflow", strategy: "hybrid", direction: "both", layers: ["fact"], maxDepth: 3, budget: namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: 3, options: {} }, fixture, "workflow") });
    check("Hybrid traversal strategy executes", hybrid.ok === true && hybrid.data.strategy === "hybrid", hybrid.data.strategy, "Traversal Policy", "Critical");
    const depthFirst = namespace.traverseKnowledgeRelationshipGraph(fixture, "function:a::alpha", { navigationType: "relationship", strategy: "depth-first", direction: "both", layers: ["fact"], maxDepth: 2, budget: namespace.buildKnowledgeNavigatorTraversalBudget({ maxDepth: 2, options: {} }, fixture, "relationship") });
    check("Depth-first traversal strategy executes", depthFirst.ok === true && depthFirst.data.strategy === "depth-first", depthFirst.data.strategy, "Traversal Policy", "Critical");

    const hardLimited = namespace.traverseKnowledgeRelationshipGraph(fixture, "function:a::alpha", { navigationType: "dependency", strategy: "breadth-first", direction: "outgoing", relationshipTypes: DEPENDENCY_TYPES, layers: ["fact"], maxDepth: 999, budget: oversizedBudget });
    check("Traversal exposes Hard Ceiling truncation", hardLimited.status === "partial" && hardLimited.data.truncation.hardSafetyCeilingReached === true, JSON.stringify(hardLimited.data.truncation), "Budget", "Critical");

    const opened = await namespace.openLatestIntelligencePackageSource({ allowIndexedDB: settings.allowIndexedDB !== false });
    check("IDE-170 Intelligence Package opens", opened && opened.ok === true, opened && opened.code, "Package Intake", "Critical");
    const provider = namespace.getIntelligenceProviderStatus();
    check("Provider remains read-only", provider.readMode === "read-only" && provider.mutationAllowed === false, provider.readMode, "Provider", "Critical");
    check("Provider exposes relationship-navigation capability", Array.isArray(provider.capabilities) && provider.capabilities.includes("relationship-navigation"), provider.capabilities && provider.capabilities.join(","), "Provider", "Critical");
    check("Provider source origin remains explicit", Boolean(provider.activePackage && provider.activePackage.sourceOrigin), provider.activePackage && provider.activePackage.sourceOrigin, "Provider", "High");

    const graphLoaded = namespace.getIntelligencePackageArtifact({ artifactType: "fact-relationship-graph" });
    check("Fact Relationship Graph loads through Provider", Boolean(graphLoaded && graphLoaded.ok === true), graphLoaded && graphLoaded.code, "Real Graph", "Critical");
    const realGraph = graphLoaded && graphLoaded.data && graphLoaded.data.artifact && graphLoaded.data.artifact.payload || null;
    check("Real Relationship Graph contains nodes", Boolean(realGraph && Array.isArray(realGraph.nodes) && realGraph.nodes.length > 0), realGraph && realGraph.nodes && realGraph.nodes.length, "Real Graph", "Critical");
    check("Real Relationship Graph contains Fact Edges", Boolean(realGraph && Array.isArray(realGraph.factEdges) && realGraph.factEdges.length > 0), realGraph && realGraph.factEdges && realGraph.factEdges.length, "Real Graph", "Critical");
    check("Real Relationship Graph keeps Candidate Edges separate", Boolean(realGraph && Array.isArray(realGraph.candidateEdges)), realGraph && realGraph.candidateEdges && realGraph.candidateEdges.length, "Real Graph", "Critical");

    const firstFactEdge = realGraph && realGraph.factEdges && realGraph.factEdges[0] || null;
    const sourceId = firstFactEdge && firstFactEdge.sourceNode && firstFactEdge.sourceNode.canonicalId || null;
    const targetId = firstFactEdge && firstFactEdge.targetNode && firstFactEdge.targetNode.canonicalId || null;
    check("Real Graph fixture has source Canonical ID", Boolean(sourceId), sourceId, "Real Graph", "Critical");
    check("Real Graph fixture has target Canonical ID", Boolean(targetId), targetId, "Real Graph", "Critical");

    const relationResult = sourceId ? await namespace.navigateKnowledge({ navigationType: "relationship", target: { canonicalId: sourceId }, maxDepth: 1 }) : null;
    check("Real relationship navigation completes", Boolean(relationResult && ["complete", "partial"].includes(relationResult.status)), relationResult && relationResult.status, "Relationship Navigation", "Critical");
    check("Real relationship navigation returns explicit Target", Boolean(relationResult && relationResult.target && relationResult.target.canonicalId === sourceId), relationResult && relationResult.target && relationResult.target.canonicalId, "Relationship Navigation", "Critical");
    check("Real relationship navigation returns relationships", Boolean(relationResult && relationResult.relationships && relationResult.relationships.length > 0), relationResult && relationResult.relationships && relationResult.relationships.length, "Relationship Navigation", "Critical");
    check("Real relationship navigation contains first Fact Edge relationship type", Boolean(relationResult && relationResult.relationships.some(function match(item) { return item.relationshipType === firstFactEdge.relationshipType; })), firstFactEdge && firstFactEdge.relationshipType, "Relationship Navigation", "Critical");
    check("Default real traversal is breadth-first", Boolean(relationResult && relationResult.metadata && relationResult.metadata.traversal && relationResult.metadata.traversal.strategy === "breadth-first"), relationResult && relationResult.metadata && relationResult.metadata.traversal && relationResult.metadata.traversal.strategy, "Traversal Policy", "Critical");
    check("Default real relationship direction is both", Boolean(relationResult && relationResult.metadata && relationResult.metadata.traversal && relationResult.metadata.traversal.direction === "both"), relationResult && relationResult.metadata && relationResult.metadata.traversal && relationResult.metadata.traversal.direction, "Traversal Policy", "High");
    check("Default real traversal depth does not exceed one", Boolean(relationResult && relationResult.navigationPath.every(function depth(item) { return item.depth <= 1; })), relationResult && relationResult.navigationPath && relationResult.navigationPath.length, "Budget", "Critical");
    check("Real Relationship Result satisfies frozen contract", Boolean(relationResult && namespace.validateContract("navigationResult", relationResult).valid === true), relationResult && namespace.validateContract("navigationResult", relationResult).failed, "Contracts", "Critical");
    check("Real Relationship Explanation satisfies frozen contract", Boolean(relationResult && namespace.validateContract("navigationExplanation", relationResult.explanation).valid === true), relationResult && namespace.validateContract("navigationExplanation", relationResult.explanation).failed, "Contracts", "Critical");
    check("Real relationship result is immutable", Boolean(relationResult && Object.isFrozen(relationResult)), Object.isFrozen(relationResult || {}), "Read-Only", "Critical");
    check("Real relationship items are immutable", Boolean(relationResult && relationResult.relationships.every(function frozen(item) { return Object.isFrozen(item); })), relationResult && relationResult.relationships && relationResult.relationships.length, "Read-Only", "Critical");
    check("Phase 4 Authority remains not-applicable", Boolean(relationResult && relationResult.authority && relationResult.authority.status === "not-applicable"), relationResult && relationResult.authority && relationResult.authority.status, "No Overclaim", "Critical");
    check("Phase 4 does not resolve Evidence payload", Boolean(relationResult && relationResult.evidence.length === 0), relationResult && relationResult.evidence && relationResult.evidence.length, "No Overclaim", "Critical");
    check("Phase 4 does not resolve Lineage", Boolean(relationResult && relationResult.lineage.length === 0), relationResult && relationResult.lineage && relationResult.lineage.length, "No Overclaim", "Critical");
    check("Relationship references preserve Evidence IDs without resolving payload", Boolean(relationResult && relationResult.relationships.every(function refs(item) { return Array.isArray(item.evidenceReferenceIds); })), relationResult && relationResult.relationships && relationResult.relationships.length, "Traceability", "High");
    check("Default real Relationship result excludes candidate layer", Boolean(relationResult && relationResult.relationships.every(function fact(item) { return item.layer === "fact"; })), relationResult && relationResult.relationships && relationResult.relationships.map(function layer(item) { return item.layer; }).join(","), "Candidate Boundary", "Critical");
    check("Relationship result contains no relationship score", Boolean(relationResult && relationResult.relationships.every(function noScore(item) { return !("score" in item); })), relationResult && relationResult.relationships && relationResult.relationships.length, "Safety", "Critical");
    check("Relationship explanation excludes hidden reasoning", Boolean(relationResult && relationResult.explanation && relationResult.explanation.metadata && relationResult.explanation.metadata.hiddenReasoningIncluded === false), relationResult && relationResult.explanation && relationResult.explanation.metadata && relationResult.explanation.metadata.hiddenReasoningIncluded, "Explanation", "Critical");

    const dependencyEdge = realGraph && realGraph.factEdges && realGraph.factEdges.find(function dependency(edge) { return DEPENDENCY_TYPES.includes(String(edge.relationshipType || "").toLowerCase()); }) || null;
    if (dependencyEdge) {
      const depSource = dependencyEdge.sourceNode.canonicalId;
      const depTarget = dependencyEdge.targetNode.canonicalId;
      const dependencyResult = await namespace.navigateKnowledge({ navigationType: "dependency", target: { canonicalId: depSource }, maxDepth: 1 });
      check("Real dependency navigation completes when dependency Fact exists", ["complete", "partial"].includes(dependencyResult.status), dependencyResult.status, "Dependency", "Critical");
      check("Dependency traversal is outgoing", dependencyResult.metadata.traversal.direction === "outgoing", dependencyResult.metadata.traversal.direction, "Dependency", "Critical");
      check("Dependency result reaches Fact target", dependencyResult.navigationPath.some(function path(item) { return item.targetCanonicalId === depTarget; }), depTarget, "Dependency", "Critical");
      const reverseResult = await namespace.navigateKnowledge({ navigationType: "reverse-dependency", target: { canonicalId: depTarget }, maxDepth: 1 });
      check("Real reverse-dependency navigation completes when dependency Fact exists", ["complete", "partial"].includes(reverseResult.status), reverseResult.status, "Reverse Dependency", "Critical");
      check("Reverse-dependency traversal is incoming", reverseResult.metadata.traversal.direction === "incoming", reverseResult.metadata.traversal.direction, "Reverse Dependency", "Critical");
      check("Reverse-dependency reaches original source", reverseResult.navigationPath.some(function path(item) { return item.targetCanonicalId === depSource; }), depSource, "Reverse Dependency", "Critical");
    } else {
      const dependencyResult = sourceId ? await namespace.navigateKnowledge({ navigationType: "dependency", target: { canonicalId: sourceId }, maxDepth: 1 }) : null;
      check("Dependency navigation does not fabricate relationships when current graph has none", Boolean(dependencyResult && dependencyResult.relationships.length === 0), dependencyResult && dependencyResult.relationships && dependencyResult.relationships.length, "Dependency", "Critical");
      check("Dependency navigation still uses outgoing policy", Boolean(dependencyResult && dependencyResult.metadata.traversal.direction === "outgoing"), dependencyResult && dependencyResult.metadata.traversal && dependencyResult.metadata.traversal.direction, "Dependency", "Critical");
      const reverseResult = sourceId ? await namespace.navigateKnowledge({ navigationType: "reverse-dependency", target: { canonicalId: sourceId }, maxDepth: 1 }) : null;
      check("Reverse-dependency navigation does not fabricate relationships when current graph has none", Boolean(reverseResult && reverseResult.relationships.length === 0), reverseResult && reverseResult.relationships && reverseResult.relationships.length, "Reverse Dependency", "Critical");
      check("Reverse-dependency navigation still uses incoming policy", Boolean(reverseResult && reverseResult.metadata.traversal.direction === "incoming"), reverseResult && reverseResult.metadata.traversal && reverseResult.metadata.traversal.direction, "Reverse Dependency", "Critical");
      check("Current graph dependency absence is source-bounded rather than scored", Boolean(dependencyResult && !JSON.stringify(dependencyResult).includes('"score"')), "no-score", "Safety", "Critical");
      check("Current graph reverse-dependency absence is source-bounded rather than inferred", Boolean(reverseResult && reverseResult.missingSources.length === 0), reverseResult && reverseResult.missingSources && reverseResult.missingSources.length, "No Inference", "High");
    }

    const workflowNode = realGraph && realGraph.nodes && realGraph.nodes.find(function workflow(node) { return node && node.recordType === "workflow-package"; }) || null;
    if (workflowNode) {
      const workflowResult = await namespace.navigateKnowledge({ navigationType: "workflow", target: { canonicalId: workflowNode.canonicalId, recordType: "workflow-package" }, maxDepth: 2 });
      check("Workflow navigation executes when workflow node exists", ["complete", "partial"].includes(workflowResult.status), workflowResult.status, "Workflow", "Critical");
      check("Workflow navigation uses hybrid strategy", workflowResult.metadata.traversal.strategy === "hybrid", workflowResult.metadata.traversal.strategy, "Workflow", "Critical");
    } else {
      const workflowResult = await namespace.navigateKnowledge({ navigationType: "workflow", query: "workflow" });
      check("Workflow navigation reports missing-source when workflow nodes are unavailable", workflowResult.status === "missing-source", workflowResult.status, "Workflow", "Critical");
      check("Workflow missing-source identifies workflow-navigation capability", Boolean(workflowResult.missingSources[0] && workflowResult.missingSources[0].capability === "workflow-navigation"), workflowResult.missingSources[0] && workflowResult.missingSources[0].capability, "Workflow", "Critical");
    }

    const unknownRelationTarget = await namespace.navigateKnowledge({ navigationType: "relationship", target: { canonicalId: "file:__ide180_phase4_missing__.js", recordType: "file" } });
    check("Unknown Relationship target is not silently replaced", ["not-found", "missing-source"].includes(unknownRelationTarget.status), unknownRelationTarget.status, "Missing Target", "Critical");
    check("Unknown Relationship target contains no invented relationship", unknownRelationTarget.relationships.length === 0, unknownRelationTarget.relationships.length, "Missing Target", "Critical");

    const relationAlias = namespace.resolveNavigationType("関連");
    check("Japanese alias 関連 resolves to relationship", relationAlias.ok === true && relationAlias.typeId === "relationship", relationAlias.typeId, "Registry", "High");
    const dependencyAlias = namespace.resolveNavigationType("依存関係");
    check("Japanese alias 依存関係 resolves to dependency", dependencyAlias.ok === true && dependencyAlias.typeId === "dependency", dependencyAlias.typeId, "Registry", "High");
    const reverseAlias = namespace.resolveNavigationType("何が依存している");
    check("Japanese reverse dependency alias remains deterministic", reverseAlias.ok === true && reverseAlias.typeId === "reverse-dependency", reverseAlias.typeId, "Registry", "High");

    check("Budget module is Ready", namespace.modules.budget && namespace.modules.budget.status === "Ready", namespace.modules.budget && namespace.modules.budget.status, "Modules", "Critical");
    check("Traversal module is Ready", namespace.modules.traversal && namespace.modules.traversal.status === "Ready", namespace.modules.traversal && namespace.modules.traversal.status, "Modules", "Critical");
    check("Relationship Resolver module is Ready", namespace.modules.relationshipResolver && namespace.modules.relationshipResolver.status === "Ready", namespace.modules.relationshipResolver && namespace.modules.relationshipResolver.status, "Modules", "Critical");
    check("Orchestrator module remains Ready", namespace.modules.orchestrator && namespace.modules.orchestrator.status === "Ready", namespace.modules.orchestrator && namespace.modules.orchestrator.status, "Modules", "Critical");
    check("Phase 4 Validation module is loaded", Boolean(namespace.modules.phase4Validation), namespace.modules.phase4Validation && namespace.modules.phase4Validation.status, "Modules", "Critical");

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    const result = {
      id: internal.nextId("IDE-180-PHASE4-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "IDE-180 Phase 4 Relationship / Traversal PASS" : "IDE-180 Phase 4 Relationship / Traversal FAIL",
      releaseAllowed: failed === 0,
      phase5Allowed: failed === 0,
      readOnly: true,
      implementedNavigationTypes: implemented,
      budgetCalibration: {
        sourceDerivedHardCeiling: true,
        androidDeviceNumericCalibration: "Validated by this real-device gate; additional Phase 10 tuning remains allowed."
      },
      sourceProvider: namespace.getIntelligenceProviderStatus ? namespace.getIntelligenceProviderStatus() : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
    state.lastValidation = internal.clone(result);
    state.lastPhase4Validation = internal.clone(result);
    namespace.modules.phase4Validation.status = failed === 0 ? "Ready" : "Blocked";
    internal.touch();
    return internal.clone(result);
  }

  function getKnowledgeNavigatorPhase4ValidationStatus() {
    return state.lastPhase4Validation ? internal.clone(state.lastPhase4Validation) : {
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      status: "Not Validated",
      releaseAllowed: false,
      phase5Allowed: false
    };
  }

  Object.assign(namespace.api, {
    runKnowledgeNavigatorPhase4Validation: runKnowledgeNavigatorPhase4Validation,
    getKnowledgeNavigatorPhase4ValidationStatus: getKnowledgeNavigatorPhase4ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase4Validation = {
    id: "IDE-180-PHASE4-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    phaseName: "Relationship / Traversal",
    asynchronous: true,
    realPackageRequired: true,
    androidGateRequired: true,
    releaseGate: true,
    loadedAt: internal.nowIso()
  };

  global.runKnowledgeNavigatorPhase4Validation = runKnowledgeNavigatorPhase4Validation;
  global.getKnowledgeNavigatorPhase4ValidationStatus = getKnowledgeNavigatorPhase4ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
