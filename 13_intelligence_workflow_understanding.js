/* ============================================================
   FILE: 13_intelligence_workflow_understanding.js
   IDE-170 Intelligence Platform
   Release: 1.6.1 / Module: 1.0.0
   Phase: 5 Repository and Workflow Understanding
   Design Freeze: v1.0.0 / Decision 006
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Workflow Understanding blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("IDE-170 workflowUnderstanding blocked: Version Manifest is not loaded.");
    return;
  }
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("workflowUnderstanding");
  const INTERNAL_MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const capabilityVersion = VERSION_MANIFEST.getCapabilityVersion;
  const schemaVersion = VERSION_MANIFEST.getSchemaVersion;
  const artifactVersion = VERSION_MANIFEST.getArtifactVersion;
  const datasetVersion = VERSION_MANIFEST.getDatasetVersion;
  const CAPABILITY_ID = "IDE-170-WORKFLOW-UNDERSTANDING";
  const RULES = Object.freeze({
    workflowTrace: "IDE-170-RULE-WORKFLOW-TRACE",
    workflowState: "IDE-170-RULE-WORKFLOW-STATE-SEQUENCE",
    workflowRepository: "IDE-170-RULE-WORKFLOW-REPOSITORY-MAPPING",
    crossDomain: "IDE-170-RULE-CROSS-DOMAIN-PATH",
    incompleteWorkflow: "IDE-170-RULE-INCOMPLETE-WORKFLOW-CANDIDATE",
    executionWithoutApproval: "IDE-170-RULE-EXECUTION-WITHOUT-APPROVAL-CANDIDATE",
    changeWithoutValidation: "IDE-170-RULE-CHANGE-WITHOUT-VALIDATION-CANDIDATE",
    rollbackPattern: "IDE-170-RULE-ROLLBACK-PATTERN-CANDIDATE"
  });

  const TRACE_DEFINITIONS = Object.freeze([
    { type: "Planning", keys: ["planningRecords", "plans", "planning", "plan"] },
    { type: "Decision", keys: ["decisionRecords", "decisions", "decision"] },
    { type: "Approval", keys: ["approvalRecords", "approvals", "approval"] },
    { type: "Execution", keys: ["executionRecords", "executions", "execution"] },
    { type: "Change", keys: ["changeRecords", "changes", "change"] },
    { type: "Validation", keys: ["validationRecords", "validations", "validation"] },
    { type: "Rollback", keys: ["rollbackRecords", "rollbacks", "rollback"] },
    { type: "Completion", keys: ["completionRecords", "completions", "completion"] }
  ]);

  function clone(value) { return internal.clone(value); }

  function recordEvidence(record, ruleId, detail) {
    return {
      evidenceId: internal.nextId("IDE-170-WORKFLOW-EVIDENCE"),
      evidenceType: "canonical-workflow-record",
      recordId: record.recordId,
      sourceId: record.source && record.source.sourceId || record.identity && record.identity.sourceId || null,
      sourceType: record.source && record.source.sourceType || "workflow",
      sourceVersion: record.source && record.source.sourceVersion || null,
      adapterId: record.source && record.source.adapterId || null,
      adapterVersion: record.source && record.source.adapterVersion || null,
      snapshotId: record.source && record.source.intakeId || null,
      strength: "direct",
      ruleId: ruleId,
      detail: clone(detail || {})
    };
  }

  function edgeEvidence(edge) {
    return internal.asArray(edge && edge.evidence).map(function map(item) {
      return {
        evidenceId: item.evidenceId,
        evidenceType: item.evidenceType,
        recordId: item.recordId || null,
        sourceId: item.sourceId || null,
        snapshotId: item.snapshotId || null,
        strength: item.strength,
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
      evidenceIds: edgeEvidence(edge).map(function map(item) { return item.evidenceId; })
    };
  }

  function createWorkflowFact(record, factType, detail) {
    return {
      resultKind: "Fact",
      factId: internal.nextId("IDE-170-WORKFLOW-FACT"),
      factType: factType,
      subject: {
        canonicalId: record.identity.canonicalId,
        recordType: record.recordType,
        name: record.identity.name
      },
      predicate: "recorded-as",
      object: null,
      edgeReference: null,
      evidence: [recordEvidence(record, RULES.workflowTrace, detail)],
      detail: clone(detail || {}),
      sourceDerived: true,
      inferred: false,
      createdAt: internal.nowIso()
    };
  }

  function createEdgeFact(edge, factType) {
    return {
      resultKind: "Fact",
      factId: internal.nextId("IDE-170-WORKFLOW-FACT"),
      factType: factType,
      subject: clone(edge.sourceNode),
      predicate: edge.relationshipType,
      object: clone(edge.targetNode),
      edgeReference: edgeReference(edge),
      evidence: edgeEvidence(edge),
      detail: {},
      sourceDerived: true,
      inferred: false,
      createdAt: internal.nowIso()
    };
  }

  function createDerived(type, ruleId, subject, objects, edges, detail) {
    const evidence = [];
    internal.asArray(edges).forEach(function each(edge) { evidence.push.apply(evidence, edgeEvidence(edge)); });
    return {
      resultKind: "Derived Result",
      derivedResultId: internal.nextId("IDE-170-WORKFLOW-DERIVED"),
      derivedType: type,
      ruleId: ruleId,
      subject: clone(subject),
      objects: clone(objects || []),
      relationshipPath: internal.asArray(edges).map(edgeReference),
      evidence: evidence,
      detail: clone(detail || {}),
      deterministic: true,
      factLayerMutationAllowed: false,
      createdAt: internal.nowIso()
    };
  }

  function createInsight(type, ruleId, subject, statement, evidence, relationshipPath, detail, limitations) {
    return {
      resultKind: "Insight Candidate",
      insightId: internal.nextId("IDE-170-WORKFLOW-INSIGHT"),
      insightType: type,
      status: "Candidate",
      subject: clone(subject),
      statement: String(statement || ""),
      evidence: clone(evidence || []),
      relationshipPath: clone(relationshipPath || []),
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
        missingEvidence: internal.asArray(evidence).length ? [] : ["Required supporting record was not available."]
      },
      generatedBy: { pipelineVersion: capabilityVersion(CAPABILITY_ID), ruleIds: [ruleId], engineIds: [] },
      detail: clone(detail || {}),
      review: { required: true, status: "Not Reviewed" },
      factPromotionAllowed: false,
      createdAt: internal.nowIso()
    };
  }

  function firstTimestamp(value) {
    const source = internal.isPlainObject(value) ? value : {};
    const candidates = [
      source.createdAt, source.updatedAt, source.startedAt, source.completedAt,
      source.executedAt, source.decidedAt, source.approvedAt, source.rolledBackAt,
      source.timestamp, source.at
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const time = Date.parse(candidates[index]);
      if (Number.isFinite(time)) return new Date(time).toISOString();
    }
    return null;
  }

  function collectTraceEntries(payload) {
    const entries = [];
    TRACE_DEFINITIONS.forEach(function definition(item) {
      item.keys.forEach(function key(name) {
        const value = payload && payload[name];
        if (value == null) return;
        internal.asArray(value).forEach(function append(record, index) {
          const normalized = internal.isPlainObject(record) ? clone(record) : { value: record };
          entries.push({
            traceType: item.type,
            sourceKey: name,
            sourceIndex: index,
            timestamp: firstTimestamp(normalized),
            status: internal.text(normalized.status || normalized.state || normalized.outcome, "Unknown"),
            record: normalized
          });
        });
      });
    });
    entries.sort(function sort(left, right) {
      if (left.timestamp && right.timestamp) return left.timestamp.localeCompare(right.timestamp);
      if (left.timestamp) return -1;
      if (right.timestamp) return 1;
      return left.traceType.localeCompare(right.traceType) || left.sourceIndex - right.sourceIndex;
    });
    return entries.map(function sequence(item, index) {
      item.sequence = index + 1;
      return item;
    });
  }

  function recordsByType(snapshot, types) {
    const typeSet = new Set(internal.asArray(types));
    return internal.asArray(snapshot && snapshot.records).filter(function filter(record) {
      return typeSet.has(record.recordType);
    });
  }

  function buildWorkflowUnderstanding(context) {
    const canonicalSnapshot = context.canonicalSnapshot;
    const graph = context.graph;
    const workflowRecords = recordsByType(canonicalSnapshot, ["workflow-package", "workflow-baseline"]);
    const workflowPackages = workflowRecords.filter(function filter(record) { return record.recordType === "workflow-package"; });
    const workflowBaselines = workflowRecords.filter(function filter(record) { return record.recordType === "workflow-baseline"; });
    const changeEdges = internal.asArray(graph && graph.factEdges).filter(function filter(edge) {
      return edge.relationshipType === "changes" && edge.sourceNode.recordType === "workflow-package";
    });
    const facts = [];
    const derivedResults = [];
    const insights = [];
    const warnings = [];

    workflowRecords.forEach(function fact(record) {
      facts.push(createWorkflowFact(record, record.recordType === "workflow-package" ? "Workflow Package" : "Workflow Baseline", {
        lifecycle: record.classification && record.classification.lifecycle
      }));
    });
    changeEdges.forEach(function fact(edge) { facts.push(createEdgeFact(edge, "Workflow Repository Change")); });

    workflowPackages.forEach(function understand(record) {
      const payload = internal.isPlainObject(record.payload) ? record.payload : {};
      const trace = collectTraceEntries(payload);
      const counts = trace.reduce(function count(acc, item) {
        acc[item.traceType] = (acc[item.traceType] || 0) + 1;
        return acc;
      }, {});
      const changed = changeEdges.filter(function filter(edge) {
        return edge.sourceNode.canonicalId === record.identity.canonicalId;
      });
      const subject = { canonicalId: record.identity.canonicalId, recordType: record.recordType };
      derivedResults.push(createDerived(
        "Workflow Trace",
        RULES.workflowTrace,
        subject,
        changed.map(function map(edge) { return edge.targetNode; }),
        changed,
        {
          packageRecordId: record.recordId,
          trace: trace,
          traceTypeCounts: counts,
          completionStatus: internal.text(payload.status || payload.completionStatus, record.classification && record.classification.lifecycle || "Unknown"),
          blockedReason: payload.blockedReason || payload.failureReason || null,
          failurePoint: payload.failurePoint || null,
          recoveryPath: payload.recoveryPath || null
        }
      ));

      if (trace.length) {
        derivedResults.push(createDerived(
          "Workflow State Sequence",
          RULES.workflowState,
          subject,
          [],
          [],
          { sequence: trace.map(function map(item) { return { sequence: item.sequence, traceType: item.traceType, status: item.status, timestamp: item.timestamp }; }) }
        ));
      }

      const approvalCount = counts.Approval || 0;
      const executionCount = counts.Execution || 0;
      const validationCount = counts.Validation || 0;
      const rollbackCount = counts.Rollback || 0;
      const completionCount = counts.Completion || 0;
      const workflowEvidence = [recordEvidence(record, RULES.workflowTrace, { traceTypeCounts: counts })];

      if (executionCount > 0 && approvalCount === 0) {
        insights.push(createInsight(
          "Execution Without Approval Candidate",
          RULES.executionWithoutApproval,
          subject,
          "Execution records exist but no Approval record was found in the same Workflow Package.",
          workflowEvidence,
          [],
          { executionCount: executionCount, approvalCount: approvalCount },
          ["Approval may be stored in an unavailable Workflow Source or external package."]
        ));
      }
      if (changed.length > 0 && validationCount === 0) {
        insights.push(createInsight(
          "Change Without Validation Candidate",
          RULES.changeWithoutValidation,
          subject,
          "Repository change relationships exist but no Validation record was found in the Workflow Package.",
          workflowEvidence.concat(changed.reduce(function flatten(acc, edge) { return acc.concat(edgeEvidence(edge)); }, [])),
          changed.map(edgeReference),
          { changedFileCount: changed.length, validationCount: validationCount },
          ["Validation may be stored in Validation Result Repository rather than the Workflow Package."]
        ));
      }
      if (completionCount === 0 && !/complete|completed|frozen|ready/i.test(internal.text(payload.status || payload.completionStatus, ""))) {
        insights.push(createInsight(
          "Incomplete Workflow Candidate",
          RULES.incompleteWorkflow,
          subject,
          "No explicit Completion record or completed status was found.",
          workflowEvidence,
          [],
          { completionCount: completionCount, status: payload.status || payload.completionStatus || null },
          ["Absence in this package does not prove the Workflow is incomplete outside the captured scope."]
        ));
      }
      if (rollbackCount > 1) {
        insights.push(createInsight(
          "Repeated Rollback Pattern",
          RULES.rollbackPattern,
          subject,
          "Multiple Rollback records were found in the Workflow Package.",
          workflowEvidence,
          [],
          { rollbackCount: rollbackCount },
          ["Pattern significance is evaluated by Phase 7 Confidence and independent Validation."]
        ));
      }
      if (!changed.length) {
        insights.push(createInsight(
          "Workflow Repository Mapping Gap",
          RULES.workflowRepository,
          subject,
          "The Workflow Package has no registered changes Relationship to a Repository File.",
          workflowEvidence,
          [],
          { graphId: graph.graphId },
          ["The package may legitimately contain no Repository change, or the Relationship Source may be Partial."]
        ));
      }
    });

    if (!workflowPackages.length) warnings.push("IDE-160 Workflow Package is unavailable in the current Canonical Snapshot.");
    if (!workflowBaselines.length) warnings.push("IDE-160 Workflow Baseline is unavailable in the current Canonical Snapshot.");

    return {
      stageId: "WORKFLOW-UNDERSTANDING",
      stageName: "Workflow Understanding",
      status: warnings.length ? "Partial" : "Ready",
      facts: facts,
      derivedResults: derivedResults,
      insights: insights,
      evidence: facts.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, []),
      summary: {
        workflowPackageCount: workflowPackages.length,
        workflowBaselineCount: workflowBaselines.length,
        workflowChangeEdgeCount: changeEdges.length,
        workflowTraceCount: derivedResults.filter(function filter(item) { return item.derivedType === "Workflow Trace"; }).length,
        insightCandidateCount: insights.length
      },
      warnings: warnings,
      errors: [],
      appliedRuleIds: [RULES.workflowTrace, RULES.workflowState, RULES.workflowRepository, RULES.incompleteWorkflow, RULES.executionWithoutApproval, RULES.changeWithoutValidation, RULES.rollbackPattern],
      engineIds: [],
      createdAt: internal.nowIso()
    };
  }

  function graphAdjacency(graph) {
    const result = new Map();
    internal.asArray(graph && graph.factEdges).forEach(function add(edge) {
      if (!result.has(edge.sourceNode.canonicalId)) result.set(edge.sourceNode.canonicalId, []);
      result.get(edge.sourceNode.canonicalId).push(edge);
    });
    return result;
  }

  function buildCrossDomainUnderstanding(context) {
    const graph = context.graph;
    const graphNodes = new Map(internal.asArray(graph.nodes).map(function node(item) { return [item.canonicalId, item]; }));
    const starts = internal.asArray(graph.nodes).filter(function filter(node) {
      return ["workflow-package", "workflow-baseline", "validation-result", "knowledge", "architecture-object", "decision"].includes(node.recordType) ||
        ["workflow", "validation", "knowledge", "architecture"].includes(node.domain);
    });
    const adjacency = graphAdjacency(graph);
    const derivedResults = [];
    const facts = [];
    const insights = [];
    const warnings = [];
    const maximumPaths = Math.max(1, Math.min(500, Number(context.options && context.options.maximumCrossDomainPaths) || 200));
    const maximumDepth = Math.max(1, Math.min(6, Number(context.options && context.options.maximumCrossDomainDepth) || 4));
    let remaining = maximumPaths;

    starts.forEach(function start(node) {
      if (remaining <= 0) return;
      const queue = [{ nodeId: node.canonicalId, nodes: [node.canonicalId], edges: [] }];
      while (queue.length && remaining > 0) {
        const current = queue.shift();
        if (current.edges.length >= maximumDepth) continue;
        internal.asArray(adjacency.get(current.nodeId)).forEach(function advance(edge) {
          if (remaining <= 0) return;
          const nextId = edge.targetNode.canonicalId;
          if (current.nodes.includes(nextId)) return;
          const target = graphNodes.get(nextId) || edge.targetNode;
          const next = { nodeId: nextId, nodes: current.nodes.concat(nextId), edges: current.edges.concat(edge) };
          if (target.domain !== node.domain || target.recordType !== node.recordType) {
            derivedResults.push(createDerived(
              "Cross-Domain Mapping",
              RULES.crossDomain,
              node,
              [target],
              next.edges,
              { nodePath: next.nodes, depth: next.edges.length, sourceDomain: node.domain, targetDomain: target.domain }
            ));
            remaining -= 1;
          }
          queue.push(next);
        });
      }
    });

    if (!starts.length) warnings.push("No Workflow, Validation, Knowledge, Architecture, or Decision starting node is available for Cross-Domain Understanding.");
    if (remaining === 0) warnings.push("Cross-Domain result reached the configured maximum.");

    return {
      stageId: "CROSS-DOMAIN-UNDERSTANDING",
      stageName: "Cross-Domain Understanding",
      status: warnings.length ? "Partial" : "Ready",
      facts: facts,
      derivedResults: derivedResults,
      insights: insights,
      evidence: derivedResults.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, []),
      summary: { startingNodeCount: starts.length, mappingCount: derivedResults.length, maximumDepth: maximumDepth },
      warnings: warnings,
      errors: [],
      appliedRuleIds: [RULES.crossDomain],
      engineIds: [],
      createdAt: internal.nowIso()
    };
  }

  function initializeWorkflowUnderstanding() {
    const definitions = [
      {
        capabilityId: CAPABILITY_ID,
        name: "Workflow Understanding",
        version: capabilityVersion(CAPABILITY_ID),
        type: "Pipeline",
        status: "Active",
        owner: "IDE-170",
        dependencies: [
          { capabilityId: "IDE-170-EVIDENCE-GRAPH", minimumVersion: INTERNAL_MINIMUM_VERSION, optional: false },
          { capabilityId: "IDE-170-ADAPTER-WORKFLOW", minimumVersion: INTERNAL_MINIMUM_VERSION, optional: true }
        ],
        schemas: [],
        provides: ["Workflow Trace", "Workflow Repository Mapping", "Cross-Domain Understanding", "Workflow Insight Candidate"],
        source: "Architecture Decision 006"
      }
    ].concat(Object.keys(RULES).map(function rule(key) {
      return {
        capabilityId: RULES[key],
        name: RULES[key].replace(/^IDE-170-RULE-/, "").replace(/-/g, " "),
        version: capabilityVersion(RULES[key]),
        type: "Service",
        status: "Active",
        owner: "IDE-170",
        dependencies: [{ capabilityId: CAPABILITY_ID, minimumVersion: INTERNAL_MINIMUM_VERSION, optional: false }],
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
      ready ? "WORKFLOW_UNDERSTANDING_INITIALIZED" : "WORKFLOW_UNDERSTANDING_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { capabilityResults: results, ruleIds: Object.values(RULES) },
      ready ? {} : { error: { message: "Workflow Understanding initialization failed.", category: "Initialization Failure" } }
    );
  }

  Object.assign(internal, { workflowUnderstandingRuleIds: RULES });
  Object.assign(namespace.api, {
    initializeWorkflowUnderstanding: initializeWorkflowUnderstanding,
    buildWorkflowUnderstanding: buildWorkflowUnderstanding,
    buildCrossDomainUnderstanding: buildCrossDomainUnderstanding
  });
  Object.assign(namespace, {
    buildWorkflowUnderstanding: buildWorkflowUnderstanding,
    buildCrossDomainUnderstanding: buildCrossDomainUnderstanding
  });

  namespace.modules.workflowUnderstanding = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    status: "Ready",
    workflowTrace: true,
    workflowRepositoryMapping: true,
    crossDomainUnderstanding: true,
    insightCandidate: true,
    workflowExecutionAllowed: false,
    workflowMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
