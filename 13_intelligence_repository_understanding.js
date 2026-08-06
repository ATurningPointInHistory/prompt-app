/* ============================================================
   FILE: 13_intelligence_repository_understanding.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Phase: 5 Repository and Workflow Understanding
   Design Freeze: v1.0.0 / Decision 006
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Repository Understanding blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const VERSION = "1.6.0";
  const CAPABILITY_ID = "IDE-170-REPOSITORY-UNDERSTANDING";
  const RULES = Object.freeze({
    structure: "IDE-170-RULE-REPOSITORY-STRUCTURE",
    directDependency: "IDE-170-RULE-DIRECT-DEPENDENCY",
    reverseDependency: "IDE-170-RULE-REVERSE-DEPENDENCY",
    transitiveDependency: "IDE-170-RULE-TRANSITIVE-DEPENDENCY",
    isolatedRecord: "IDE-170-RULE-ISOLATED-RECORD-CANDIDATE",
    circularDependency: "IDE-170-RULE-CIRCULAR-DEPENDENCY-CANDIDATE",
    changeTrace: "IDE-170-RULE-CHANGE-TRACE",
    changeImpact: "IDE-170-RULE-CHANGE-IMPACT-CANDIDATE"
  });

  const DEPENDENCY_TYPES = Object.freeze([
    "calls", "imports", "references", "depends-on", "implements", "consumes", "produces"
  ]);

  function clone(value) {
    return internal.clone(value);
  }

  function nodeMap(graph) {
    return new Map(internal.asArray(graph && graph.nodes).map(function mapNode(node) {
      return [node.canonicalId, node];
    }));
  }

  function canonicalMap(snapshot) {
    return new Map(internal.asArray(snapshot && snapshot.records).map(function mapRecord(record) {
      return [record.identity && record.identity.canonicalId, record];
    }));
  }

  function evidenceRefs(edge) {
    return internal.asArray(edge && edge.evidence).map(function mapEvidence(item) {
      return {
        evidenceId: item.evidenceId,
        evidenceType: item.evidenceType,
        recordId: item.recordId || null,
        sourceId: item.sourceId || null,
        snapshotId: item.snapshotId || null,
        strength: item.strength || "direct",
        ruleId: item.ruleId || null
      };
    });
  }

  function edgeReference(edge) {
    return {
      edgeId: edge.edgeId,
      relationshipType: edge.relationshipType,
      sourceCanonicalId: edge.sourceNode.canonicalId,
      targetCanonicalId: edge.targetNode.canonicalId,
      layer: edge.layer,
      evidenceIds: evidenceRefs(edge).map(function map(item) { return item.evidenceId; })
    };
  }

  function createFact(type, subject, predicate, object, edge, detail) {
    return {
      resultKind: "Fact",
      factId: internal.nextId("IDE-170-UNDERSTANDING-FACT"),
      factType: type,
      subject: clone(subject),
      predicate: predicate,
      object: clone(object),
      edgeReference: edge ? edgeReference(edge) : null,
      evidence: edge ? evidenceRefs(edge) : [],
      detail: clone(detail || {}),
      sourceDerived: true,
      inferred: false,
      createdAt: internal.nowIso()
    };
  }

  function createDerived(type, ruleId, subject, objects, edges, detail) {
    const relationshipPath = internal.asArray(edges).map(edgeReference);
    const evidence = [];
    internal.asArray(edges).forEach(function collect(edge) {
      evidence.push.apply(evidence, evidenceRefs(edge));
    });
    return {
      resultKind: "Derived Result",
      derivedResultId: internal.nextId("IDE-170-DERIVED"),
      derivedType: type,
      ruleId: ruleId,
      subject: clone(subject),
      objects: clone(objects || []),
      relationshipPath: relationshipPath,
      evidence: evidence,
      detail: clone(detail || {}),
      deterministic: true,
      factLayerMutationAllowed: false,
      createdAt: internal.nowIso()
    };
  }

  function createInsight(type, ruleId, subject, statement, edges, detail, limitations) {
    const relationshipPath = internal.asArray(edges).map(edgeReference);
    const evidence = [];
    internal.asArray(edges).forEach(function collect(edge) {
      evidence.push.apply(evidence, evidenceRefs(edge));
    });
    return {
      resultKind: "Insight Candidate",
      insightId: internal.nextId("IDE-170-INSIGHT"),
      insightType: type,
      status: "Candidate",
      subject: clone(subject),
      statement: String(statement || ""),
      evidence: evidence,
      relationshipPath: relationshipPath,
      confidence: {
        status: "Not Evaluated",
        score: null,
        level: "Unknown",
        method: "Deferred to IDE-170 Phase 7"
      },
      explanation: {
        status: "Structured Evidence Summary",
        summary: String(statement || ""),
        reasoningSteps: ["Applied deterministic Phase 5 candidate rule: " + ruleId],
        limitations: internal.asArray(limitations).map(String),
        missingEvidence: evidence.length ? [] : ["No direct Edge Evidence was available."]
      },
      generatedBy: {
        pipelineVersion: VERSION,
        ruleIds: [ruleId],
        engineIds: []
      },
      detail: clone(detail || {}),
      review: { required: true, status: "Not Reviewed" },
      factPromotionAllowed: false,
      createdAt: internal.nowIso()
    };
  }

  function edgesFor(graph, relationshipTypes) {
    const types = new Set(internal.asArray(relationshipTypes).map(function normalize(item) {
      return String(item).toLowerCase();
    }));
    return internal.asArray(graph && graph.factEdges).filter(function filter(edge) {
      return !types.size || types.has(edge.relationshipType);
    });
  }

  function byType(graph) {
    return internal.asArray(graph && graph.nodes).reduce(function reduce(acc, node) {
      if (!acc[node.recordType]) acc[node.recordType] = [];
      acc[node.recordType].push(node);
      return acc;
    }, {});
  }

  function buildStructuralUnderstanding(context) {
    const graph = context.graph;
    const grouped = byType(graph);
    const facts = [];
    const derivedResults = [];
    const insights = [];
    const warnings = [];
    const structuralEdges = edgesFor(graph, ["contains", "defines", "belongs-to", "belongs-to-layer", "implements"]);

    structuralEdges.forEach(function each(edge) {
      facts.push(createFact(
        "Repository Structural Relationship",
        edge.sourceNode,
        edge.relationshipType,
        edge.targetNode,
        edge,
        { graphId: graph.graphId }
      ));
    });

    const structureSummary = {
      projectCount: internal.asArray(grouped.project).length,
      fileCount: internal.asArray(grouped.file).length,
      functionCount: internal.asArray(grouped.function).length,
      moduleCount: internal.asArray(grouped.module).length,
      componentCount: internal.asArray(grouped.component).length,
      layerCount: internal.asArray(grouped.layer).length,
      interfaceCount: internal.asArray(grouped.interface).length,
      configurationCount: internal.asArray(grouped.configuration).length,
      structuralEdgeCount: structuralEdges.length
    };

    derivedResults.push(createDerived(
      "Repository Structure Summary",
      RULES.structure,
      { canonicalId: context.projectCanonicalId || null, recordType: "project" },
      [],
      structuralEdges,
      structureSummary
    ));

    const degree = new Map();
    internal.asArray(graph.nodes).forEach(function initialize(node) { degree.set(node.canonicalId, 0); });
    internal.asArray(graph.factEdges).forEach(function count(edge) {
      degree.set(edge.sourceNode.canonicalId, (degree.get(edge.sourceNode.canonicalId) || 0) + 1);
      degree.set(edge.targetNode.canonicalId, (degree.get(edge.targetNode.canonicalId) || 0) + 1);
    });

    ["function", "module", "component", "interface"].forEach(function inspect(recordType) {
      internal.asArray(grouped[recordType]).forEach(function node(nodeValue) {
        if ((degree.get(nodeValue.canonicalId) || 0) !== 0) return;
        insights.push(createInsight(
          "Isolated " + recordType + " Candidate",
          RULES.isolatedRecord,
          nodeValue,
          nodeValue.name + " has no registered Fact Relationship in the current Graph.",
          [],
          { graphId: graph.graphId, degree: 0 },
          ["A missing optional Source or Relationship Adapter can produce an apparent isolated record."]
        ));
      });
    });

    if (!structureSummary.functionCount) warnings.push("Function structure is unavailable in the current Canonical Snapshot.");
    if (!structureSummary.moduleCount) warnings.push("Module structure is unavailable in the current Canonical Snapshot.");

    return {
      stageId: "STRUCTURAL-UNDERSTANDING",
      stageName: "Structural Understanding",
      status: warnings.length ? "Partial" : "Ready",
      facts: facts,
      derivedResults: derivedResults,
      insights: insights,
      evidence: facts.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, []),
      summary: structureSummary,
      warnings: warnings,
      errors: [],
      appliedRuleIds: [RULES.structure, RULES.isolatedRecord],
      engineIds: [],
      createdAt: internal.nowIso()
    };
  }

  function adjacency(graph, relationshipTypes) {
    const result = new Map();
    edgesFor(graph, relationshipTypes).forEach(function add(edge) {
      if (!result.has(edge.sourceNode.canonicalId)) result.set(edge.sourceNode.canonicalId, []);
      result.get(edge.sourceNode.canonicalId).push(edge);
    });
    return result;
  }

  function findPaths(graph, startId, maxDepth, relationshipTypes, maximumResults) {
    const result = [];
    const graphAdjacency = adjacency(graph, relationshipTypes);
    const queue = [{ nodeId: startId, nodes: [startId], edges: [] }];
    while (queue.length && result.length < maximumResults) {
      const current = queue.shift();
      if (current.edges.length >= maxDepth) continue;
      internal.asArray(graphAdjacency.get(current.nodeId)).forEach(function advance(edge) {
        const nextId = edge.targetNode.canonicalId;
        if (current.nodes.includes(nextId)) return;
        const next = {
          nodeId: nextId,
          nodes: current.nodes.concat(nextId),
          edges: current.edges.concat(edge)
        };
        if (next.edges.length >= 2) result.push(next);
        queue.push(next);
      });
    }
    return result;
  }

  function canonicalCycleKey(nodes) {
    const values = nodes.slice(0, -1);
    if (!values.length) return "";
    const rotations = values.map(function rotate(_, index) {
      return values.slice(index).concat(values.slice(0, index)).join("|");
    });
    return rotations.sort()[0];
  }

  function findCycles(graph, relationshipTypes, maximumCycles) {
    const graphAdjacency = adjacency(graph, relationshipTypes);
    const found = new Map();
    function walk(start, current, nodes, edges, depth) {
      if (found.size >= maximumCycles || depth > 8) return;
      internal.asArray(graphAdjacency.get(current)).forEach(function inspect(edge) {
        const nextId = edge.targetNode.canonicalId;
        if (nextId === start && edges.length >= 1) {
          const cycleNodes = nodes.concat(start);
          const key = canonicalCycleKey(cycleNodes);
          if (!found.has(key)) found.set(key, { nodes: cycleNodes, edges: edges.concat(edge) });
          return;
        }
        if (nodes.includes(nextId)) return;
        walk(start, nextId, nodes.concat(nextId), edges.concat(edge), depth + 1);
      });
    }
    internal.asArray(graph && graph.nodes).forEach(function start(node) {
      if (found.size < maximumCycles) walk(node.canonicalId, node.canonicalId, [node.canonicalId], [], 0);
    });
    return [...found.values()];
  }

  function buildRelationshipUnderstanding(context) {
    const graph = context.graph;
    const dependencyEdges = edgesFor(graph, DEPENDENCY_TYPES);
    const facts = dependencyEdges.map(function map(edge) {
      return createFact("Direct Dependency", edge.sourceNode, edge.relationshipType, edge.targetNode, edge, { graphId: graph.graphId });
    });
    const derivedResults = [];
    const insights = [];
    const warnings = [];

    dependencyEdges.forEach(function reverse(edge) {
      derivedResults.push(createDerived(
        "Reverse Dependency",
        RULES.reverseDependency,
        edge.targetNode,
        [edge.sourceNode],
        [edge],
        { originalRelationshipType: edge.relationshipType }
      ));
    });

    const pathLimit = Math.max(1, Math.min(500, Number(context.options && context.options.maximumDependencyPaths) || 200));
    const maxDepth = Math.max(2, Math.min(8, Number(context.options && context.options.maximumDependencyDepth) || 5));
    let remaining = pathLimit;
    internal.asArray(graph.nodes).forEach(function pathStart(node) {
      if (remaining <= 0) return;
      findPaths(graph, node.canonicalId, maxDepth, DEPENDENCY_TYPES, remaining).forEach(function path(pathValue) {
        if (remaining <= 0) return;
        derivedResults.push(createDerived(
          "Transitive Dependency",
          RULES.transitiveDependency,
          { canonicalId: pathValue.nodes[0], recordType: node.recordType },
          [{ canonicalId: pathValue.nodes[pathValue.nodes.length - 1], recordType: "unknown" }],
          pathValue.edges,
          { depth: pathValue.edges.length, nodePath: pathValue.nodes }
        ));
        remaining -= 1;
      });
    });
    if (remaining === 0) warnings.push("Dependency Path result reached the configured maximum.");

    findCycles(graph, DEPENDENCY_TYPES, 100).forEach(function cycle(value) {
      insights.push(createInsight(
        "Circular Dependency Candidate",
        RULES.circularDependency,
        { canonicalId: value.nodes[0], recordType: "unknown" },
        "A circular dependency path was found in the current Fact Graph.",
        value.edges,
        { nodePath: value.nodes },
        ["Cycle meaning depends on the registered Relationship Types and Source coverage."]
      ));
    });

    return {
      stageId: "RELATIONSHIP-UNDERSTANDING",
      stageName: "Relationship Understanding",
      status: warnings.length ? "Partial" : "Ready",
      facts: facts,
      derivedResults: derivedResults,
      insights: insights,
      evidence: facts.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, []),
      summary: {
        directDependencyCount: facts.length,
        reverseDependencyCount: dependencyEdges.length,
        transitiveDependencyCount: derivedResults.filter(function item(value) { return value.derivedType === "Transitive Dependency"; }).length,
        circularDependencyCandidateCount: insights.length,
        maximumDepth: maxDepth
      },
      warnings: warnings,
      errors: [],
      appliedRuleIds: [RULES.directDependency, RULES.reverseDependency, RULES.transitiveDependency, RULES.circularDependency],
      engineIds: [],
      createdAt: internal.nowIso()
    };
  }

  function buildChangeUnderstanding(context) {
    const snapshot = context.repositorySnapshot;
    const graph = context.graph;
    const graphNodes = nodeMap(graph);
    const facts = [];
    const derivedResults = [];
    const insights = [];
    const warnings = [];
    const changes = internal.asArray(snapshot && snapshot.changes);

    if (!snapshot) {
      return {
        stageId: "CHANGE-UNDERSTANDING",
        stageName: "Change Understanding",
        status: "Partial",
        facts: [], derivedResults: [], insights: [], evidence: [],
        summary: { snapshotAvailable: false, changeCount: 0 },
        warnings: ["Repository Snapshot is unavailable."], errors: [],
        appliedRuleIds: [RULES.changeTrace, RULES.changeImpact], engineIds: [], createdAt: internal.nowIso()
      };
    }

    changes.forEach(function change(changeValue) {
      const recordId = changeValue.currentRecordId || changeValue.previousRecordId || changeValue.canonicalId || null;
      const node = graphNodes.get(recordId) || { canonicalId: recordId, recordType: changeValue.recordType || "unknown" };
      facts.push({
        resultKind: "Fact",
        factId: internal.nextId("IDE-170-CHANGE-FACT"),
        factType: "Repository Change Record",
        subject: clone(node),
        predicate: changeValue.changeType || "Changed",
        object: null,
        edgeReference: null,
        evidence: [{
          evidenceId: changeValue.changeId || internal.nextId("IDE-170-CHANGE-EVIDENCE"),
          evidenceType: "repository-snapshot-change",
          recordId: recordId,
          sourceId: snapshot.snapshotId,
          snapshotId: snapshot.snapshotId,
          strength: "direct",
          ruleId: RULES.changeTrace
        }],
        detail: clone(changeValue),
        sourceDerived: true,
        inferred: false,
        createdAt: internal.nowIso()
      });

      const incoming = internal.asArray(graph.relationshipIndex && graph.relationshipIndex.incoming && graph.relationshipIndex.incoming[recordId]);
      const affectedEdges = internal.asArray(graph.factEdges).filter(function edge(item) {
        return incoming.includes(item.edgeId);
      });
      affectedEdges.forEach(function affected(edge) {
        insights.push(createInsight(
          "Change Impact Candidate",
          RULES.changeImpact,
          edge.sourceNode,
          "A Fact Relationship points to a changed Repository Record.",
          [edge],
          { changeId: changeValue.changeId || null, changedRecordId: recordId },
          ["Potential impact is not a confirmed failure or required modification."]
        ));
      });
    });

    derivedResults.push(createDerived(
      "Change Trace Summary",
      RULES.changeTrace,
      { canonicalId: snapshot.snapshotId, recordType: "repository-snapshot" },
      [],
      [],
      {
        snapshotType: snapshot.snapshotType,
        parentSnapshotId: snapshot.parentSnapshotId || null,
        changeCount: changes.length,
        changeTypeCounts: changes.reduce(function count(acc, item) {
          const key = item.changeType || "Unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      }
    ));

    if (snapshot.snapshotType === "Baseline" && !changes.length) {
      warnings.push("Baseline Snapshot contains no incremental Change Trace.");
    }

    return {
      stageId: "CHANGE-UNDERSTANDING",
      stageName: "Change Understanding",
      status: warnings.length ? "Partial" : "Ready",
      facts: facts,
      derivedResults: derivedResults,
      insights: insights,
      evidence: facts.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, []),
      summary: {
        snapshotAvailable: true,
        snapshotType: snapshot.snapshotType,
        changeCount: changes.length,
        changeImpactCandidateCount: insights.length
      },
      warnings: warnings,
      errors: [],
      appliedRuleIds: [RULES.changeTrace, RULES.changeImpact],
      engineIds: [],
      createdAt: internal.nowIso()
    };
  }

  function initializeRepositoryUnderstanding() {
    const definitions = [
      {
        capabilityId: CAPABILITY_ID,
        name: "Repository Understanding",
        version: VERSION,
        type: "Pipeline",
        status: "Active",
        owner: "IDE-170",
        dependencies: [
          { capabilityId: "IDE-170-EVIDENCE-GRAPH", minimumVersion: "1.6.0", optional: false },
          { capabilityId: "IDE-170-REPOSITORY-SNAPSHOT", minimumVersion: "1.2.0", optional: false }
        ],
        schemas: [],
        provides: ["Structural Understanding", "Relationship Understanding", "Change Understanding", "Repository Insight Candidate"],
        source: "Architecture Decision 006"
      }
    ].concat(Object.keys(RULES).map(function rule(key) {
      return {
        capabilityId: RULES[key],
        name: RULES[key].replace(/^IDE-170-RULE-/, "").replace(/-/g, " "),
        version: VERSION,
        type: "Service",
        status: "Active",
        owner: "IDE-170",
        dependencies: [{ capabilityId: CAPABILITY_ID, minimumVersion: VERSION, optional: false }],
        schemas: [],
        provides: ["Deterministic Understanding Rule"],
        source: "Architecture Decision 006"
      };
    }));

    const results = definitions.map(function register(definition) {
      if (namespace.getCapability(definition.capabilityId)) return { capabilityId: definition.capabilityId, registered: true, existing: true };
      const result = namespace.registerCapability(definition);
      return { capabilityId: definition.capabilityId, registered: result.ok === true, code: result.code };
    });
    const ready = results.every(function item(value) { return value.registered === true; });
    return internal.buildResult(ready,
      ready ? "REPOSITORY_UNDERSTANDING_INITIALIZED" : "REPOSITORY_UNDERSTANDING_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { capabilityResults: results, ruleIds: Object.values(RULES) },
      ready ? {} : { error: { message: "Repository Understanding initialization failed.", category: "Initialization Failure" } }
    );
  }

  Object.assign(internal, {
    repositoryUnderstandingRuleIds: RULES,
    repositoryUnderstandingDependencyTypes: DEPENDENCY_TYPES
  });

  Object.assign(namespace.api, {
    initializeRepositoryUnderstanding: initializeRepositoryUnderstanding,
    buildStructuralUnderstanding: buildStructuralUnderstanding,
    buildRelationshipUnderstanding: buildRelationshipUnderstanding,
    buildChangeUnderstanding: buildChangeUnderstanding
  });
  Object.assign(namespace, {
    buildStructuralUnderstanding: buildStructuralUnderstanding,
    buildRelationshipUnderstanding: buildRelationshipUnderstanding,
    buildChangeUnderstanding: buildChangeUnderstanding
  });

  namespace.modules.repositoryUnderstanding = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    structuralUnderstanding: true,
    relationshipUnderstanding: true,
    changeUnderstanding: true,
    insightCandidate: true,
    factMutationAllowed: false,
    candidateFactPromotionAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
