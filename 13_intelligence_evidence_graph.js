/* ============================================================
   FILE: 13_intelligence_evidence_graph.js
   IDE-170 Intelligence Platform
   Version: 1.5.0
   Phase: 4 Evidence Graph
   Design Freeze: v1.0.0 / Decision 005
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Evidence Graph blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.5.0";
  const CAPABILITY_ID = "IDE-170-EVIDENCE-GRAPH";
  const HASH_ALGORITHM = "SHA-256";
  const LAYERS = Object.freeze(["fact", "candidate"]);
  const STRENGTHS = Object.freeze(["direct", "corroborated", "derived", "inferred", "unknown"]);
  const STATUSES = Object.freeze(["Active", "Candidate", "Deprecated", "Contradicted", "Invalid", "Superseded"]);
  const MAX_PATH_DEPTH = 20;
  const MAX_PATH_RESULTS = 100;

  if (!(state.evidenceGraphSnapshots instanceof Map)) state.evidenceGraphSnapshots = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestEvidenceGraphSnapshotId")) state.latestEvidenceGraphSnapshotId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastEvidenceGraphValidation")) state.lastEvidenceGraphValidation = null;

  function stableStringify(value) {
    if (internal.stableStringify) return internal.stableStringify(value);
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function key(name) {
      return JSON.stringify(name) + ":" + stableStringify(value[name]);
    }).join(",") + "}";
  }

  function hash(value) {
    if (typeof namespace.calculateSHA256 === "function") return namespace.calculateSHA256(typeof value === "string" ? value : stableStringify(value));
    return internal.text(value, "").length.toString(16).padStart(64, "0").slice(-64);
  }

  function normalizeNodeRef(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      canonicalId: internal.text(source.canonicalId || source.id, ""),
      recordType: internal.text(source.recordType || source.type, "unknown")
    };
  }

  function evidenceId(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return "IDE-170-EVIDENCE-" + hash([
      source.evidenceType,
      source.recordId,
      source.sourceId,
      source.ruleId,
      source.strength,
      source.snapshotId
    ].join("|")).slice(0, 24).toUpperCase();
  }

  function normalizeEvidence(input, fallback) {
    const source = internal.isPlainObject(input) ? input : {};
    const base = internal.isPlainObject(fallback) ? fallback : {};
    const item = {
      evidenceId: internal.text(source.evidenceId, ""),
      evidenceType: internal.text(source.evidenceType || source.type, "source-reference"),
      recordId: internal.text(source.recordId, "") || null,
      sourceId: internal.text(source.sourceId || base.sourceId, "") || null,
      sourceType: internal.text(source.sourceType || base.sourceType, "") || null,
      sourceVersion: internal.text(source.sourceVersion || base.sourceVersion, "") || null,
      adapterId: internal.text(source.adapterId || base.adapterId, "") || null,
      adapterVersion: internal.text(source.adapterVersion || base.adapterVersion, "") || null,
      snapshotId: internal.text(source.snapshotId || base.snapshotId, "") || null,
      ruleId: internal.text(source.ruleId, "") || null,
      strength: internal.text(source.strength, "direct").toLowerCase(),
      detail: internal.isPlainObject(source.detail) ? internal.clone(source.detail) : {},
      capturedAt: internal.text(source.capturedAt || base.capturedAt, internal.nowIso())
    };
    if (!STRENGTHS.includes(item.strength)) item.strength = "unknown";
    if (!item.evidenceId) item.evidenceId = evidenceId(item);
    return item;
  }

  function normalizeEdge(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const sourceNode = normalizeNodeRef(source.sourceNode || { canonicalId: source.sourceCanonicalId, recordType: source.sourceRecordType });
    const targetNode = normalizeNodeRef(source.targetNode || { canonicalId: source.targetCanonicalId, recordType: source.targetRecordType });
    const relationshipType = internal.text(source.relationshipType, "").toLowerCase();
    const layer = internal.text(source.layer, "fact").toLowerCase();
    const direction = internal.text(source.direction, "directed").toLowerCase();
    const edgeKey = [sourceNode.canonicalId, relationshipType, targetNode.canonicalId, layer].join("|");
    const provenanceSource = internal.isPlainObject(source.provenance) ? source.provenance : {};
    const provenance = {
      sourceType: internal.text(provenanceSource.sourceType, ""),
      sourceId: internal.text(provenanceSource.sourceId, ""),
      sourceVersion: internal.text(provenanceSource.sourceVersion, ""),
      adapterId: internal.text(provenanceSource.adapterId, ""),
      adapterVersion: internal.text(provenanceSource.adapterVersion, ""),
      capturedAt: internal.text(provenanceSource.capturedAt, internal.nowIso())
    };
    const evidence = internal.asArray(source.evidence).map(function item(value) {
      return normalizeEvidence(value, provenance);
    });
    const status = internal.text(source.lifecycle && source.lifecycle.status || source.status, layer === "candidate" ? "Candidate" : "Active");
    return {
      edgeId: internal.text(source.edgeId, "IDE-170-EDGE-" + hash(edgeKey).slice(0, 24).toUpperCase()),
      edgeKey: edgeKey,
      schemaVersion: VERSION,
      relationshipType: relationshipType,
      layer: layer,
      direction: direction,
      sourceNode: sourceNode,
      targetNode: targetNode,
      provenance: provenance,
      evidence: evidence,
      candidate: layer === "candidate" ? {
        candidateType: internal.text(source.candidate && source.candidate.candidateType || source.candidateType, "Relationship Candidate"),
        confidence: Number.isFinite(Number(source.candidate && source.candidate.confidence || source.confidence)) ? Number(source.candidate && source.candidate.confidence || source.confidence) : 0,
        explanation: internal.text(source.candidate && source.candidate.explanation || source.explanation, ""),
        generatedBy: internal.text(source.candidate && source.candidate.generatedBy || source.generatedBy, "IDE-170"),
        generatedAt: internal.text(source.candidate && source.candidate.generatedAt || source.generatedAt, internal.nowIso()),
        validationStatus: internal.text(source.candidate && source.candidate.validationStatus, "Not Validated"),
        reviewStatus: internal.text(source.candidate && source.candidate.reviewStatus, "Not Reviewed"),
        factPromotionAllowed: false
      } : null,
      quality: {
        status: internal.text(source.quality && source.quality.status, "Valid"),
        completeness: Number.isFinite(Number(source.quality && source.quality.completeness)) ? Number(source.quality.completeness) : 1,
        warnings: internal.asArray(source.quality && source.quality.warnings).map(String),
        errors: internal.asArray(source.quality && source.quality.errors).map(String)
      },
      lifecycle: {
        status: STATUSES.includes(status) ? status : layer === "candidate" ? "Candidate" : "Active",
        validFrom: source.lifecycle && source.lifecycle.validFrom || null,
        validTo: source.lifecycle && source.lifecycle.validTo || null
      },
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
  }

  function validateRelationshipEdge(edgeInput, context) {
    const edge = normalizeEdge(edgeInput);
    const settings = internal.isPlainObject(context) ? context : {};
    const nodeMap = settings.nodeMap instanceof Map ? settings.nodeMap : null;
    const relationship = namespace.getRelationshipType(edge.relationshipType);
    const checks = [
      { name: "Edge ID is present", passed: Boolean(edge.edgeId), detail: edge.edgeId },
      { name: "Source Node is present", passed: Boolean(edge.sourceNode.canonicalId), detail: edge.sourceNode.canonicalId },
      { name: "Target Node is present", passed: Boolean(edge.targetNode.canonicalId), detail: edge.targetNode.canonicalId },
      { name: "Relationship Type is registered", passed: Boolean(relationship), detail: edge.relationshipType },
      { name: "Relationship Layer is allowed by Type", passed: Boolean(relationship) && (edge.layer === "fact" ? relationship.factAllowed === true : relationship.candidateAllowed === true), detail: relationship },
      { name: "Generic related-to requires explicit official Source", passed: edge.relationshipType !== "related-to" || edge.layer !== "fact" || edge.evidence.some(function evidence(item) { return item.evidenceType === "official-relationship-record"; }), detail: edge.evidence.map(function evidence(item) { return item.evidenceType; }) },
      { name: "Layer is governed", passed: LAYERS.includes(edge.layer), detail: edge.layer },
      { name: "Direction is governed", passed: Boolean(internal.relationshipDirections && internal.relationshipDirections.includes(edge.direction)), detail: edge.direction },
      { name: "Provenance is present", passed: Boolean(edge.provenance.sourceType && edge.provenance.sourceId && edge.provenance.adapterId), detail: edge.provenance },
      { name: "Fact Edge has Evidence", passed: edge.layer !== "fact" || edge.evidence.length > 0, detail: edge.evidence.length },
      { name: "Inferred is excluded from Fact", passed: edge.layer !== "fact" || edge.evidence.every(function item(value) { return value.strength !== "inferred" && value.strength !== "unknown"; }), detail: edge.evidence.map(function item(value) { return value.strength; }) },
      { name: "Candidate cannot promote itself", passed: edge.layer !== "candidate" || edge.candidate && edge.candidate.factPromotionAllowed === false, detail: edge.candidate },
      { name: "Source Node exists", passed: !nodeMap || nodeMap.has(edge.sourceNode.canonicalId), detail: edge.sourceNode.canonicalId },
      { name: "Target Node exists", passed: !nodeMap || nodeMap.has(edge.targetNode.canonicalId), detail: edge.targetNode.canonicalId }
    ];
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      id: internal.nextId("IDE-170-EDGE-VALIDATION"),
      componentId: namespace.componentId,
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      edge: edge,
      validatedAt: internal.nowIso()
    };
  }

  function canonicalIndexes(snapshot) {
    const nodes = new Map();
    const byType = new Map();
    const aliases = new Map();
    internal.asArray(snapshot && snapshot.records).forEach(function index(record) {
      const id = record.identity && record.identity.canonicalId;
      if (!id) return;
      nodes.set(id, record);
      if (!byType.has(record.recordType)) byType.set(record.recordType, []);
      byType.get(record.recordType).push(record);
      [id, record.identity.sourceId, record.identity.qualifiedName, record.identity.name]
        .concat(internal.asArray(record.identity.aliases))
        .filter(Boolean)
        .forEach(function alias(value) {
          const key = String(value).replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
          if (!aliases.has(key)) aliases.set(key, []);
          if (!aliases.get(key).some(function same(item) {
            return item.identity && item.identity.canonicalId === id;
          })) aliases.get(key).push(record);
        });
    });
    return { nodes: nodes, byType: byType, aliases: aliases };
  }

  function resolveNode(indexes, value, preferredTypes) {
    const candidate = internal.isPlainObject(value) ? value : { value: value };
    const raw = internal.text(candidate.canonicalId || candidate.targetId || candidate.sourceId || candidate.qualifiedName || candidate.functionName || candidate.fileName || candidate.name || candidate.value, "");
    if (!raw) return null;
    if (indexes.nodes.has(raw)) return indexes.nodes.get(raw);
    const key = raw.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
    const matches = internal.asArray(indexes.aliases.get(key));
    const preferred = internal.asArray(preferredTypes);
    const filtered = preferred.length ? matches.filter(function item(record) { return preferred.includes(record.recordType); }) : matches;
    return filtered.length === 1 ? filtered[0] : null;
  }

  function sourceProvenance(record, snapshot) {
    return {
      sourceType: record.source && record.source.sourceType || "canonical-record",
      sourceId: record.source && record.source.sourceId || record.identity && record.identity.sourceId || record.recordId,
      sourceVersion: record.source && record.source.sourceVersion || "",
      adapterId: record.source && record.source.adapterId || "IDE-170-CANONICAL-MODEL",
      adapterVersion: record.source && record.source.adapterVersion || VERSION,
      capturedAt: record.source && record.source.capturedAt || snapshot.capturedAt || internal.nowIso()
    };
  }

  function recordEvidence(record, snapshot, strength, ruleId, detail) {
    const provenance = sourceProvenance(record, snapshot);
    return normalizeEvidence({
      evidenceType: "canonical-record-reference",
      recordId: record.recordId,
      sourceId: provenance.sourceId,
      sourceType: provenance.sourceType,
      sourceVersion: provenance.sourceVersion,
      adapterId: provenance.adapterId,
      adapterVersion: provenance.adapterVersion,
      snapshotId: snapshot.snapshotId,
      ruleId: ruleId,
      strength: strength,
      detail: detail || {},
      capturedAt: provenance.capturedAt
    }, provenance);
  }

  function addEdge(edgeMap, input, indexes, warnings) {
    const validation = validateRelationshipEdge(input, { nodeMap: indexes.nodes });
    if (!validation.valid) {
      warnings.push({ code: "EDGE_VALIDATION_FAILED", edge: input, checks: validation.checks.filter(function item(check) { return !check.passed; }) });
      return null;
    }
    const edge = validation.edge;
    const existing = edgeMap.get(edge.edgeKey);
    if (!existing) {
      edgeMap.set(edge.edgeKey, edge);
      return edge;
    }
    const evidenceById = new Map(existing.evidence.map(function item(value) { return [value.evidenceId, value]; }));
    edge.evidence.forEach(function item(value) { evidenceById.set(value.evidenceId, value); });
    existing.evidence = [...evidenceById.values()].sort(function sort(a, b) { return a.evidenceId.localeCompare(b.evidenceId); });
    if (existing.evidence.length > 1 && existing.layer === "fact") {
      existing.evidence = existing.evidence.map(function item(value) {
        const copy = internal.clone(value);
        if (copy.strength === "direct") copy.strength = "corroborated";
        return copy;
      });
    }
    return existing;
  }

  function extractFactEdges(snapshot, indexes, edgeMap, warnings) {
    const projects = indexes.byType.get("project") || [];
    const files = indexes.byType.get("file") || [];
    const functions = indexes.byType.get("function") || [];
    const modules = indexes.byType.get("module") || [];
    const workflows = indexes.byType.get("workflow-package") || [];
    const project = projects.length === 1 ? projects[0] : null;

    if (project) {
      files.forEach(function file(record) {
        addEdge(edgeMap, {
          relationshipType: "contains", layer: "fact", direction: "directed",
          sourceNode: { canonicalId: project.identity.canonicalId, recordType: project.recordType },
          targetNode: { canonicalId: record.identity.canonicalId, recordType: record.recordType },
          provenance: sourceProvenance(record, snapshot),
          evidence: [recordEvidence(record, snapshot, "derived", "IDE-170-RULE-PROJECT-CONTAINS-FILE", { projectRecordId: project.recordId })]
        }, indexes, warnings);
      });
    }

    functions.forEach(function fn(record) {
      const payload = record.payload || {};
      const fileRef = payload.fileName || payload.file || payload.definedFile || payload.path || String(record.identity.qualifiedName || "").split("::")[0];
      const file = resolveNode(indexes, fileRef, ["file"]);
      if (file) {
        addEdge(edgeMap, {
          relationshipType: "defines", layer: "fact", direction: "directed",
          sourceNode: { canonicalId: file.identity.canonicalId, recordType: file.recordType },
          targetNode: { canonicalId: record.identity.canonicalId, recordType: record.recordType },
          provenance: sourceProvenance(record, snapshot),
          evidence: [recordEvidence(record, snapshot, "direct", "IDE-170-RULE-FILE-DEFINES-FUNCTION", { fileReference: fileRef })]
        }, indexes, warnings);
      }
      const callValues = []
        .concat(internal.asArray(payload.calls))
        .concat(internal.asArray(payload.calledFunctions))
        .concat(internal.asArray(payload.callees));
      callValues.forEach(function call(value) {
        const target = resolveNode(indexes, value, ["function"]);
        if (!target || target.identity.canonicalId === record.identity.canonicalId) return;
        addEdge(edgeMap, {
          relationshipType: "calls", layer: "fact", direction: "directed",
          sourceNode: { canonicalId: record.identity.canonicalId, recordType: record.recordType },
          targetNode: { canonicalId: target.identity.canonicalId, recordType: target.recordType },
          provenance: sourceProvenance(record, snapshot),
          evidence: [recordEvidence(record, snapshot, "direct", "IDE-170-RULE-FUNCTION-CALLS-FUNCTION", { callReference: internal.clone(value) })]
        }, indexes, warnings);
      });
    });

    modules.forEach(function moduleRecord(record) {
      const payload = record.payload || {};
      const refs = []
        .concat(internal.asArray(payload.files))
        .concat(internal.asArray(payload.fileNames))
        .concat(internal.asArray(payload.fileName || payload.path || payload.sourceFile || record.identity.qualifiedName));
      const seen = new Set();
      refs.forEach(function reference(value) {
        const file = resolveNode(indexes, value, ["file"]);
        if (!file || seen.has(file.identity.canonicalId)) return;
        seen.add(file.identity.canonicalId);
        addEdge(edgeMap, {
          relationshipType: "contains", layer: "fact", direction: "directed",
          sourceNode: { canonicalId: record.identity.canonicalId, recordType: record.recordType },
          targetNode: { canonicalId: file.identity.canonicalId, recordType: file.recordType },
          provenance: sourceProvenance(record, snapshot),
          evidence: [recordEvidence(record, snapshot, "direct", "IDE-170-RULE-MODULE-CONTAINS-FILE", { fileReference: internal.clone(value) })]
        }, indexes, warnings);
      });
    });

    workflows.forEach(function workflow(record) {
      const payload = record.payload || {};
      const values = [];
      ["changedFiles", "modifiedFiles", "addedFiles", "removedFiles", "files"].forEach(function key(name) {
        values.push.apply(values, internal.asArray(payload[name]));
      });
      internal.asArray(payload.executionRecords).forEach(function execution(item) {
        if (!internal.isPlainObject(item)) return;
        ["changedFiles", "modifiedFiles", "addedFiles", "removedFiles", "files"].forEach(function key(name) {
          values.push.apply(values, internal.asArray(item[name] || item.result && item.result[name]));
        });
      });
      const seen = new Set();
      values.forEach(function reference(value) {
        const file = resolveNode(indexes, value, ["file"]);
        if (!file || seen.has(file.identity.canonicalId)) return;
        seen.add(file.identity.canonicalId);
        addEdge(edgeMap, {
          relationshipType: "changes", layer: "fact", direction: "directed",
          sourceNode: { canonicalId: record.identity.canonicalId, recordType: record.recordType },
          targetNode: { canonicalId: file.identity.canonicalId, recordType: file.recordType },
          provenance: sourceProvenance(record, snapshot),
          evidence: [recordEvidence(record, snapshot, "direct", "IDE-170-RULE-WORKFLOW-CHANGES-FILE", { fileReference: internal.clone(value) })]
        }, indexes, warnings);
      });
    });
  }

  function extractOfficialRelationshipEdges(intake, snapshot, indexes, edgeMap, warnings) {
    if (!intake) return;
    internal.asArray(intake.adapterResults).forEach(function adapter(result) {
      const officialRelationshipSource = Boolean(
        result.adapterId === "IDE-170-ADAPTER-RELATIONSHIP" ||
        result.sourceType === "architecture-relationship-database" ||
        result.sourceType === "relationship-data"
      );
      if (!officialRelationshipSource) return;
      internal.asArray(result.records).forEach(function relationship(record) {
        const payload = record.payload || {};
        const relationshipType = internal.text(payload.relationshipType, "").toLowerCase();
        if (!namespace.getRelationshipType(relationshipType)) {
          warnings.push({ code: "RELATIONSHIP_TYPE_UNREGISTERED", sourceRecordId: record.sourceRecordId, relationshipType: relationshipType });
          return;
        }
        const sourceNode = resolveNode(indexes, payload.sourceId, []);
        const targetNode = resolveNode(indexes, payload.targetId, []);
        if (!sourceNode || !targetNode) {
          warnings.push({ code: "RELATIONSHIP_NODE_UNRESOLVED", sourceRecordId: record.sourceRecordId, sourceId: payload.sourceId, targetId: payload.targetId });
          return;
        }
        const provenance = {
          sourceType: record.sourceType,
          sourceId: record.sourceId,
          sourceVersion: record.sourceVersion,
          adapterId: record.adapterId,
          adapterVersion: record.adapterVersion,
          capturedAt: record.capturedAt
        };
        addEdge(edgeMap, {
          relationshipType: relationshipType,
          layer: "fact",
          direction: payload.direction || "directed",
          sourceNode: { canonicalId: sourceNode.identity.canonicalId, recordType: sourceNode.recordType },
          targetNode: { canonicalId: targetNode.identity.canonicalId, recordType: targetNode.recordType },
          provenance: provenance,
          evidence: [normalizeEvidence({
            evidenceType: "official-relationship-record",
            recordId: record.sourceRecordId,
            sourceId: record.sourceId,
            sourceType: record.sourceType,
            sourceVersion: record.sourceVersion,
            adapterId: record.adapterId,
            adapterVersion: record.adapterVersion,
            snapshotId: snapshot.snapshotId,
            strength: "direct",
            detail: { reason: payload.reason || "", original: payload.original || {} },
            capturedAt: record.capturedAt
          }, provenance)]
        }, indexes, warnings);
      });
    });
  }

  function extractCandidateEdges(repositorySnapshot, indexes, edgeMap, warnings) {
    if (!repositorySnapshot) return;
    internal.asArray(repositorySnapshot.renameCandidates).forEach(function candidate(value) {
      const removed = resolveNode(indexes, value.removedRecordId, ["file"]);
      const added = resolveNode(indexes, value.addedRecordId, ["file"]);
      if (!removed || !added) return;
      addEdge(edgeMap, {
        relationshipType: "replaces",
        layer: "candidate",
        direction: "directed",
        sourceNode: { canonicalId: removed.identity.canonicalId, recordType: removed.recordType },
        targetNode: { canonicalId: added.identity.canonicalId, recordType: added.recordType },
        provenance: {
          sourceType: "repository-snapshot",
          sourceId: repositorySnapshot.snapshotId,
          sourceVersion: repositorySnapshot.version || VERSION,
          adapterId: "IDE-170-REPOSITORY-SNAPSHOT",
          adapterVersion: repositorySnapshot.version || VERSION,
          capturedAt: repositorySnapshot.capturedAt || internal.nowIso()
        },
        evidence: [normalizeEvidence({
          evidenceType: "rename-candidate",
          sourceId: candidate.candidateId,
          sourceType: "repository-rename-candidate",
          snapshotId: repositorySnapshot.snapshotId,
          strength: "inferred",
          detail: internal.clone(candidate),
          capturedAt: candidate.generatedAt
        })],
        candidate: {
          candidateType: "Rename Candidate",
          confidence: candidate.confidence && candidate.confidence.score || 0,
          explanation: candidate.confidence && candidate.confidence.reason || "",
          generatedBy: "IDE-170-REPOSITORY-SNAPSHOT",
          generatedAt: candidate.generatedAt,
          validationStatus: "Candidate",
          reviewStatus: candidate.reviewStatus || "Not Reviewed"
        }
      }, indexes, warnings);
    });
  }

  function buildIndexes(nodes, factEdges, candidateEdges) {
    const evidence = {};
    const outgoing = {};
    const incoming = {};
    const byType = {};
    factEdges.concat(candidateEdges).forEach(function edge(item) {
      if (!outgoing[item.sourceNode.canonicalId]) outgoing[item.sourceNode.canonicalId] = [];
      if (!incoming[item.targetNode.canonicalId]) incoming[item.targetNode.canonicalId] = [];
      if (!byType[item.relationshipType]) byType[item.relationshipType] = [];
      outgoing[item.sourceNode.canonicalId].push(item.edgeId);
      incoming[item.targetNode.canonicalId].push(item.edgeId);
      byType[item.relationshipType].push(item.edgeId);
      item.evidence.forEach(function evidenceItem(value) {
        if (!evidence[value.evidenceId]) evidence[value.evidenceId] = { evidence: value, edgeIds: [] };
        if (!evidence[value.evidenceId].edgeIds.includes(item.edgeId)) evidence[value.evidenceId].edgeIds.push(item.edgeId);
      });
    });
    [outgoing, incoming, byType].forEach(function sortIndex(index) {
      Object.keys(index).forEach(function key(name) { index[name].sort(); });
    });
    Object.keys(evidence).forEach(function key(name) { evidence[name].edgeIds.sort(); });
    return { evidence: evidence, outgoing: outgoing, incoming: incoming, byType: byType, nodeCount: nodes.length };
  }

  function graphHashPayload(graph) {
    return {
      graphId: graph.graphId,
      canonicalSnapshotId: graph.canonicalSnapshotId,
      repositorySnapshotId: graph.repositorySnapshotId,
      relationshipIntakeId: graph.relationshipIntakeId,
      nodes: graph.nodes,
      factEdges: graph.factEdges,
      candidateEdges: graph.candidateEdges,
      evidenceIndex: graph.evidenceIndex,
      relationshipIndex: graph.relationshipIndex,
      summary: graph.summary,
      quality: graph.quality,
      createdAt: graph.createdAt
    };
  }

  function registerSchemas() {
    const schemas = [
      {
        schemaId: "IDE-170-SCHEMA-RELATIONSHIP-EDGE",
        name: "Typed Relationship Edge",
        version: VERSION,
        type: "object",
        required: ["edgeId", "relationshipType", "layer", "direction", "sourceNode", "targetNode", "provenance", "evidence", "quality", "lifecycle"],
        properties: {
          edgeId: { type: "string", minLength: 1 },
          relationshipType: { type: "string", minLength: 1 },
          layer: { type: "string", enum: LAYERS },
          direction: { type: "string", enum: ["directed", "undirected", "bidirectional"] },
          sourceNode: { type: "object" },
          targetNode: { type: "object" },
          provenance: { type: "object" },
          evidence: { type: "array" },
          quality: { type: "object" },
          lifecycle: { type: "object" },
          immutable: { type: "boolean" }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      },
      {
        schemaId: "IDE-170-SCHEMA-EVIDENCE-GRAPH-SNAPSHOT",
        name: "Immutable Evidence Graph Snapshot",
        version: VERSION,
        type: "object",
        required: ["graphId", "componentId", "version", "status", "canonicalSnapshotId", "nodes", "factEdges", "candidateEdges", "evidenceIndex", "summary", "integrity", "frozen", "immutable"],
        properties: {
          graphId: { type: "string", minLength: 1 },
          componentId: { type: "string", enum: ["IDE-170"] },
          version: { type: "string", format: "semver" },
          status: { type: "string", enum: ["Frozen"] },
          canonicalSnapshotId: { type: "string", minLength: 1 },
          nodes: { type: "array" },
          factEdges: { type: "array" },
          candidateEdges: { type: "array" },
          evidenceIndex: { type: "object" },
          summary: { type: "object" },
          integrity: { type: "object" },
          frozen: { type: "boolean", enum: [true] },
          immutable: { type: "boolean", enum: [true] }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      }
    ];
    return schemas.map(function register(schema) {
      const existing = namespace.getSchema(schema.schemaId);
      if (existing && existing.version === VERSION) return { schemaId: schema.schemaId, registered: true, existing: true };
      if (existing && typeof internal.removeSchemaForValidation === "function") internal.removeSchemaForValidation(schema.schemaId);
      const result = namespace.registerSchema(schema);
      return { schemaId: schema.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerCapability() {
    const existing = namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === VERSION) return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && typeof internal.removeCapabilityForValidation === "function") internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Immutable Layered Evidence Graph",
      version: VERSION,
      type: "Pipeline",
      status: "Active",
      owner: "IDE-170",
      description: "Builds immutable Fact and Candidate Graph layers with Evidence Index and path traversal.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-CANONICAL-MODEL", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-REPOSITORY-SNAPSHOT", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-RELATIONSHIP-TYPE-REGISTRY", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-RELATIONSHIP-EDGE", "IDE-170-SCHEMA-EVIDENCE-GRAPH-SNAPSHOT"],
      provides: ["Fact Graph", "Candidate Graph", "Evidence Index", "Relationship Path", "Duplicate Edge Control", "Graph Freeze"],
      source: "built-in"
    });
  }

  function resolveCanonicalSnapshot(sessionId, snapshotId) {
    if (snapshotId) return namespace.getCanonicalSnapshot(snapshotId);
    const session = namespace.getSession(sessionId);
    const references = internal.asArray(session && session.sourceReferences).slice().reverse();
    const reference = references.find(function item(value) { return value && value.snapshotId && value.referenceType === "Canonical Snapshot"; });
    return reference ? namespace.getCanonicalSnapshot(reference.snapshotId) : state.latestCanonicalSnapshotId ? namespace.getCanonicalSnapshot(state.latestCanonicalSnapshotId) : null;
  }

  function buildEvidenceGraph(sessionId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = namespace.getSession(sessionId);
    if (!session || session.state === "Frozen") {
      return internal.buildResult(false, "EVIDENCE_GRAPH_SESSION_NOT_READY", "Blocked", null, {
        error: { message: "An active Intelligence Session is required.", category: "State Failure" }
      });
    }
    const canonicalSnapshot = resolveCanonicalSnapshot(sessionId, settings.canonicalSnapshotId);
    if (!canonicalSnapshot || canonicalSnapshot.status !== "Frozen") {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_NOT_READY", "Blocked", null, {
        error: { message: "A Frozen Canonical Snapshot is required.", category: "Dependency Failure" }
      });
    }
    const graphId = internal.text(settings.graphId, internal.nextId("IDE-170-EVIDENCE-GRAPH"));
    if (state.evidenceGraphSnapshots.has(graphId)) {
      return internal.buildResult(false, "EVIDENCE_GRAPH_ID_DUPLICATE", "Blocked", { graphId: graphId });
    }
    const indexes = canonicalIndexes(canonicalSnapshot);
    const edgeMap = new Map();
    const warnings = [];
    extractFactEdges(canonicalSnapshot, indexes, edgeMap, warnings);

    let relationshipIntake = null;
    const relationshipIntakeId = internal.text(settings.relationshipIntakeId, "");
    if (relationshipIntakeId) relationshipIntake = namespace.getSourceIntake(relationshipIntakeId);
    extractOfficialRelationshipEdges(relationshipIntake, canonicalSnapshot, indexes, edgeMap, warnings);

    const repositorySnapshotId = internal.text(settings.repositorySnapshotId, state.latestRepositorySnapshotId || "");
    const repositorySnapshot = repositorySnapshotId ? namespace.getRepositorySnapshot(repositorySnapshotId) : null;
    extractCandidateEdges(repositorySnapshot, indexes, edgeMap, warnings);

    internal.asArray(settings.candidateEdges).forEach(function candidate(value) {
      const input = internal.clone(value);
      input.layer = "candidate";
      addEdge(edgeMap, input, indexes, warnings);
    });

    const edges = [...edgeMap.values()].sort(function sort(a, b) { return a.edgeKey.localeCompare(b.edgeKey); });
    const factEdges = edges.filter(function item(value) { return value.layer === "fact"; });
    const candidateEdges = edges.filter(function item(value) { return value.layer === "candidate"; });
    const nodes = [...indexes.nodes.values()].map(function item(record) {
      return {
        canonicalId: record.identity.canonicalId,
        recordId: record.recordId,
        recordType: record.recordType,
        name: record.identity.name,
        qualifiedName: record.identity.qualifiedName,
        domain: record.classification.domain,
        lifecycle: record.classification.lifecycle
      };
    }).sort(function sort(a, b) { return a.canonicalId.localeCompare(b.canonicalId); });
    const indexesBuilt = buildIndexes(nodes, factEdges, candidateEdges);
    const now = internal.nowIso();
    const graph = {
      graphId: graphId,
      componentId: namespace.componentId,
      version: VERSION,
      schemaVersion: VERSION,
      graphType: "Immutable Layered Evidence Graph",
      status: "Frozen",
      sessionId: sessionId,
      canonicalSnapshotId: canonicalSnapshot.snapshotId,
      repositorySnapshotId: repositorySnapshot && repositorySnapshot.snapshotId || null,
      relationshipIntakeId: relationshipIntake && relationshipIntake.intakeId || null,
      nodes: nodes,
      factEdges: factEdges,
      candidateEdges: candidateEdges,
      evidenceIndex: indexesBuilt.evidence,
      relationshipIndex: {
        outgoing: indexesBuilt.outgoing,
        incoming: indexesBuilt.incoming,
        byType: indexesBuilt.byType
      },
      summary: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        factEdgeCount: factEdges.length,
        candidateEdgeCount: candidateEdges.length,
        evidenceCount: Object.keys(indexesBuilt.evidence).length,
        duplicateEdgeCount: 0,
        relationshipTypeCounts: factEdges.concat(candidateEdges).reduce(function count(acc, edge) {
          acc[edge.relationshipType] = (acc[edge.relationshipType] || 0) + 1;
          return acc;
        }, {}),
        layerCounts: { fact: factEdges.length, candidate: candidateEdges.length }
      },
      quality: {
        status: warnings.some(function item(value) { return value.code === "EDGE_VALIDATION_FAILED"; }) ? "Partial" : "Ready",
        warnings: warnings,
        errors: [],
        inferredFactCount: factEdges.reduce(function count(total, edge) {
          return total + edge.evidence.filter(function item(value) { return value.strength === "inferred" || value.strength === "unknown"; }).length;
        }, 0)
      },
      integrity: { hashAlgorithm: HASH_ALGORITHM, graphHash: "", status: "Pending" },
      createdAt: now,
      frozenAt: now,
      frozen: true,
      immutable: true
    };
    graph.integrity.graphHash = hash(graphHashPayload(graph));
    graph.integrity.status = "Valid";
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-EVIDENCE-GRAPH-SNAPSHOT", graph);
    const graphValidation = validateEvidenceGraph(graph);
    if (!schemaValidation.valid || !graphValidation.valid) {
      return internal.buildResult(false, "EVIDENCE_GRAPH_VALIDATION_BLOCKED", "Blocked", {
        graph: graph,
        schemaValidation: schemaValidation,
        validation: graphValidation
      }, { error: { message: "Evidence Graph validation failed.", category: "Validation Failure" } });
    }
    const frozenGraph = internal.deepFreeze(graph);
    state.evidenceGraphSnapshots.set(graphId, frozenGraph);
    state.latestEvidenceGraphSnapshotId = graphId;
    internal.attachSessionSourceReference(sessionId, {
      referenceType: "Evidence Graph Snapshot",
      graphId: graphId,
      snapshotId: graphId,
      canonicalSnapshotId: canonicalSnapshot.snapshotId,
      status: "Frozen",
      edgeCount: graph.summary.edgeCount,
      capturedAt: now
    }, { actor: internal.text(settings.actor, "IDE-170 Evidence Graph") });
    internal.touch();
    internal.appendAudit({
      action: "EVIDENCE_GRAPH_FROZEN",
      actor: internal.text(settings.actor, "IDE-170 Evidence Graph"),
      targetType: "Evidence Graph",
      targetId: graphId,
      sessionId: sessionId,
      outcome: graph.quality.status,
      detail: graph.summary
    });
    return internal.buildResult(true, "EVIDENCE_GRAPH_FROZEN", graph.quality.status, {
      graph: getEvidenceGraph(graphId),
      validation: graphValidation
    });
  }

  function getEvidenceGraph(graphId) {
    return internal.clone(state.evidenceGraphSnapshots.get(internal.text(graphId, "")) || null);
  }

  function getEvidenceGraphs(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const sessionId = internal.text(settings.sessionId, "");
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return [...state.evidenceGraphSnapshots.values()]
      .filter(function item(value) { return !sessionId || value.sessionId === sessionId; })
      .slice(-limit)
      .map(internal.clone);
  }

  function validateEvidenceGraph(graphOrId) {
    const graph = typeof graphOrId === "string" ? state.evidenceGraphSnapshots.get(graphOrId) : graphOrId;
    if (!graph) return { id: internal.nextId("IDE-170-GRAPH-VALIDATION"), valid: false, passed: 0, failed: 1, total: 1, checks: [{ name: "Graph exists", passed: false, detail: "Not Found" }], validatedAt: internal.nowIso() };
    const nodes = new Map(internal.asArray(graph.nodes).map(function item(value) { return [value.canonicalId, value]; }));
    const edges = internal.asArray(graph.factEdges).concat(internal.asArray(graph.candidateEdges));
    const edgeIds = edges.map(function item(value) { return value.edgeId; });
    const edgeKeys = edges.map(function item(value) { return value.edgeKey; });
    const edgeValidations = edges.map(function item(value) { return validateRelationshipEdge(value, { nodeMap: nodes }); });
    const expectedHash = hash(graphHashPayload(graph));
    const evidenceIds = new Set();
    edges.forEach(function edge(value) { internal.asArray(value.evidence).forEach(function evidence(item) { evidenceIds.add(item.evidenceId); }); });
    const checks = [
      { name: "Graph Schema", passed: namespace.validateAgainstSchema("IDE-170-SCHEMA-EVIDENCE-GRAPH-SNAPSHOT", graph).valid, detail: graph.graphId },
      { name: "Graph is Frozen", passed: graph.status === "Frozen" && graph.frozen === true && graph.immutable === true, detail: graph.status },
      { name: "Node IDs are unique", passed: nodes.size === graph.nodes.length, detail: graph.nodes.length + "/" + nodes.size },
      { name: "Edge IDs are unique", passed: new Set(edgeIds).size === edgeIds.length, detail: edgeIds.length },
      { name: "Edge Keys are unique", passed: new Set(edgeKeys).size === edgeKeys.length, detail: edgeKeys.length },
      { name: "All Edges are valid", passed: edgeValidations.every(function item(value) { return value.valid; }), detail: edgeValidations.filter(function item(value) { return !value.valid; }).length },
      { name: "Inferred is excluded from Fact Layer", passed: graph.factEdges.every(function edge(value) { return value.evidence.every(function evidence(item) { return item.strength !== "inferred" && item.strength !== "unknown"; }); }), detail: graph.quality && graph.quality.inferredFactCount },
      { name: "Candidates cannot self-promote", passed: graph.candidateEdges.every(function edge(value) { return value.candidate && value.candidate.factPromotionAllowed === false; }), detail: graph.candidateEdges.length },
      { name: "Evidence Index covers Evidence", passed: Object.keys(graph.evidenceIndex || {}).length === evidenceIds.size && [...evidenceIds].every(function item(value) { return Boolean(graph.evidenceIndex[value]); }), detail: Object.keys(graph.evidenceIndex || {}).length + "/" + evidenceIds.size },
      { name: "Summary matches Graph", passed: graph.summary.nodeCount === graph.nodes.length && graph.summary.factEdgeCount === graph.factEdges.length && graph.summary.candidateEdgeCount === graph.candidateEdges.length && graph.summary.edgeCount === edges.length, detail: graph.summary },
      { name: "Graph Hash is valid", passed: graph.integrity && graph.integrity.graphHash === expectedHash, detail: graph.integrity && graph.integrity.graphHash },
      { name: "Direct mutation remains prohibited", passed: graph.directMutationAllowed !== true, detail: String(graph.directMutationAllowed) }
    ];
    const passed = checks.filter(function item(value) { return value.passed; }).length;
    return {
      id: internal.nextId("IDE-170-GRAPH-VALIDATION"),
      componentId: namespace.componentId,
      graphId: graph.graphId,
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      edgeValidations: edgeValidations,
      validatedAt: internal.nowIso()
    };
  }

  function getRelationshipPath(graphId, sourceCanonicalId, targetCanonicalId, options) {
    const graph = state.evidenceGraphSnapshots.get(internal.text(graphId, ""));
    const settings = internal.isPlainObject(options) ? options : {};
    if (!graph) return internal.buildResult(false, "EVIDENCE_GRAPH_NOT_FOUND", "Blocked", null);
    const sourceId = internal.text(sourceCanonicalId, "");
    const targetId = internal.text(targetCanonicalId, "");
    const maxDepth = Math.max(1, Math.min(MAX_PATH_DEPTH, Number(settings.maxDepth) || 6));
    const layers = internal.asArray(settings.layers).length ? internal.asArray(settings.layers) : ["fact"];
    const types = new Set(internal.asArray(settings.relationshipTypes).map(function item(value) { return String(value).toLowerCase(); }));
    const edges = graph.factEdges.concat(graph.candidateEdges).filter(function item(edge) {
      return layers.includes(edge.layer) && (!types.size || types.has(edge.relationshipType));
    });
    const adjacency = new Map();
    edges.forEach(function edge(item) {
      if (!adjacency.has(item.sourceNode.canonicalId)) adjacency.set(item.sourceNode.canonicalId, []);
      adjacency.get(item.sourceNode.canonicalId).push(item);
      if (item.direction !== "directed") {
        if (!adjacency.has(item.targetNode.canonicalId)) adjacency.set(item.targetNode.canonicalId, []);
        adjacency.get(item.targetNode.canonicalId).push(Object.assign({}, item, {
          sourceNode: item.targetNode,
          targetNode: item.sourceNode,
          traversedReverse: true
        }));
      }
    });
    const queue = [{ nodeId: sourceId, nodes: [sourceId], edges: [] }];
    const results = [];
    const bestDepth = new Map([[sourceId, 0]]);
    while (queue.length && results.length < MAX_PATH_RESULTS) {
      const current = queue.shift();
      if (current.nodeId === targetId) {
        results.push(current);
        continue;
      }
      if (current.edges.length >= maxDepth) continue;
      internal.asArray(adjacency.get(current.nodeId)).forEach(function next(edge) {
        const nextId = edge.targetNode.canonicalId;
        if (current.nodes.includes(nextId)) return;
        const depth = current.edges.length + 1;
        if (bestDepth.has(nextId) && bestDepth.get(nextId) < depth) return;
        bestDepth.set(nextId, depth);
        queue.push({ nodeId: nextId, nodes: current.nodes.concat(nextId), edges: current.edges.concat(internal.clone(edge)) });
      });
    }
    return internal.buildResult(true, "RELATIONSHIP_PATH_RESOLVED", results.length ? "Ready" : "Not Found", {
      graphId: graphId,
      sourceCanonicalId: sourceId,
      targetCanonicalId: targetId,
      pathCount: results.length,
      paths: results,
      maxDepth: maxDepth
    });
  }

  function getEvidence(evidenceIdValue, graphId) {
    const graph = graphId ? state.evidenceGraphSnapshots.get(graphId) : state.latestEvidenceGraphSnapshotId ? state.evidenceGraphSnapshots.get(state.latestEvidenceGraphSnapshotId) : null;
    return internal.clone(graph && graph.evidenceIndex && graph.evidenceIndex[evidenceIdValue] || null);
  }

  function getEvidenceGraphStatus() {
    const latest = state.latestEvidenceGraphSnapshotId ? state.evidenceGraphSnapshots.get(state.latestEvidenceGraphSnapshotId) : null;
    return {
      id: "IDE-170-EVIDENCE-GRAPH-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability(CAPABILITY_ID)),
      graphCount: state.evidenceGraphSnapshots.size,
      latestGraphId: latest && latest.graphId || null,
      latestGraphStatus: latest && latest.status || "Not Run",
      latestNodeCount: latest && latest.summary.nodeCount || 0,
      latestFactEdgeCount: latest && latest.summary.factEdgeCount || 0,
      latestCandidateEdgeCount: latest && latest.summary.candidateEdgeCount || 0,
      automaticCandidateFactPromotionAllowed: false,
      graphDirectMutationAllowed: false,
      updatedAt: state.updatedAt || internal.nowIso()
    };
  }

  function initializeEvidenceGraph() {
    const schemaResults = registerSchemas();
    const capability = registerCapability();
    const failed = schemaResults.filter(function item(value) { return value.registered !== true; });
    const ready = failed.length === 0 && capability.ok === true;
    return internal.buildResult(ready,
      ready ? "EVIDENCE_GRAPH_INITIALIZED" : "EVIDENCE_GRAPH_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capability, layers: LAYERS, maximumPathDepth: MAX_PATH_DEPTH },
      ready ? {} : { error: { message: "Evidence Graph initialization failed.", category: "Initialization Failure" } });
  }


  async function runEvidenceGraphPhaseValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    const artifacts = { sessionIds: [], adapterIds: [], intakeIds: [], canonicalSnapshotIds: [], repositorySnapshotIds: [], graphIds: [] };
    function check(name, passed, detail, group, severity) {
      checks.push({ name: name, passed: passed === true, detail: internal.clone(detail), group: group || "Evidence Graph", severity: severity || "High" });
    }
    function cleanup() {
      artifacts.graphIds.forEach(function remove(id) { if (typeof internal.removeEvidenceGraphForValidation === "function") internal.removeEvidenceGraphForValidation(id); });
      artifacts.repositorySnapshotIds.forEach(function remove(id) { if (typeof internal.removeRepositorySnapshotForValidation === "function") internal.removeRepositorySnapshotForValidation(id); });
      artifacts.canonicalSnapshotIds.forEach(function remove(id) { if (typeof internal.removeCanonicalSnapshotForValidation === "function") internal.removeCanonicalSnapshotForValidation(id); });
      artifacts.intakeIds.forEach(function remove(id) { if (typeof internal.removeSourceIntakeForValidation === "function") internal.removeSourceIntakeForValidation(id); });
      artifacts.adapterIds.forEach(function remove(id) {
        if (typeof internal.removeSourceAdapterForValidation === "function") internal.removeSourceAdapterForValidation(id);
        if (typeof internal.removeCapabilityForValidation === "function") internal.removeCapabilityForValidation(id);
      });
      artifacts.sessionIds.forEach(function remove(id) { if (typeof internal.removeSessionForValidation === "function") internal.removeSessionForValidation(id); });
    }
    try {
      const initialization = namespace.initialize({ actor: "IDE-170 Phase 4 Validation", registerIntegration: true });
      check("Phase 4 initialization succeeds", initialization.ok === true, initialization.code, "Foundation");
      check("Relationship Registry is Ready", namespace.modules.relationshipRegistry && namespace.modules.relationshipRegistry.status === "Ready", namespace.modules.relationshipRegistry, "Foundation");
      check("Relationship Source Adapter is Ready", namespace.modules.relationshipSourceAdapter && namespace.modules.relationshipSourceAdapter.status === "Ready", namespace.modules.relationshipSourceAdapter, "Foundation");
      check("Evidence Graph module is Ready", namespace.modules.evidenceGraph && namespace.modules.evidenceGraph.status === "Ready", namespace.modules.evidenceGraph, "Foundation");
      check("Official Relationship Types are registered", namespace.getRelationshipTypes().length >= 39, namespace.getRelationshipTypes().length, "Relationship Registry");
      const relatedType = namespace.getRelationshipType("related-to");
      check("Generic related-to is governed as explicit-Source only", Boolean(relatedType && relatedType.factAllowed === true && relatedType.candidateAllowed === false), relatedType, "Relationship Registry");

      const regression = namespace.runValidation({ actor: "IDE-170 Phase 4 Regression", androidRealDevicePassed: settings.androidRealDevicePassed === true, device: settings.device, androidEvidence: settings.androidEvidence });
      check("Phase 1-3 and Decision 011 regression remains Passed", regression && regression.valid === true && regression.failed === 0, regression ? regression.passed + "/" + regression.total : "Unavailable", "Regression");

      const unique = Date.now().toString(36).toUpperCase();
      const adapterId = "IDE-170-ADAPTER-GRAPH-VALIDATION-" + unique;
      const fixtureRecords = [
        { recordType: "project", sourceType: "graph-validation", sourceId: "project:graph", identity: { sourceId: "project:graph", name: "Graph Project", qualifiedName: "Graph Project", aliases: [] }, classification: { domain: "repository", category: "project", subtype: "validation", lifecycle: "Active" }, payload: { name: "Graph Project" }, metadata: {}, quality: {} },
        { recordType: "file", sourceType: "graph-validation", sourceId: "src/a.js", identity: { sourceId: "src/a.js", name: "a.js", qualifiedName: "src/a.js", aliases: [] }, classification: { domain: "repository", category: "file", subtype: "js", lifecycle: "Active" }, payload: { path: "src/a.js", fileName: "a.js", content: "function alpha(){return beta();}" }, metadata: {}, quality: {} },
        { recordType: "file", sourceType: "graph-validation", sourceId: "src/b.js", identity: { sourceId: "src/b.js", name: "b.js", qualifiedName: "src/b.js", aliases: [] }, classification: { domain: "repository", category: "file", subtype: "js", lifecycle: "Active" }, payload: { path: "src/b.js", fileName: "b.js", content: "function beta(){return true;}" }, metadata: {}, quality: {} },
        { recordType: "function", sourceType: "graph-validation", sourceId: "src/a.js::alpha", identity: { sourceId: "src/a.js::alpha", name: "alpha", qualifiedName: "src/a.js::alpha", aliases: [] }, classification: { domain: "repository", category: "function", subtype: "function", lifecycle: "Active" }, payload: { functionName: "alpha", fileName: "src/a.js", calls: ["src/b.js::beta"] }, metadata: {}, quality: {} },
        { recordType: "function", sourceType: "graph-validation", sourceId: "src/b.js::beta", identity: { sourceId: "src/b.js::beta", name: "beta", qualifiedName: "src/b.js::beta", aliases: [] }, classification: { domain: "repository", category: "function", subtype: "function", lifecycle: "Active" }, payload: { functionName: "beta", fileName: "src/b.js", calls: [] }, metadata: {}, quality: {} },
        { recordType: "module", sourceType: "graph-validation", sourceId: "module:core", identity: { sourceId: "module:core", name: "Core Module", qualifiedName: "module:core", aliases: [] }, classification: { domain: "repository", category: "module", subtype: "module", lifecycle: "Active" }, payload: { files: ["src/a.js", "src/b.js"] }, metadata: {}, quality: {} },
        { recordType: "workflow-package", sourceType: "graph-validation", sourceId: "workflow:graph", identity: { sourceId: "workflow:graph", name: "Graph Workflow", qualifiedName: "workflow:graph", aliases: [] }, classification: { domain: "workflow", category: "workflow-package", subtype: "validation", lifecycle: "Frozen" }, payload: { changedFiles: ["src/a.js"] }, metadata: {}, quality: {} }
      ];
      const adapter = namespace.registerSourceAdapter({
        adapterId: adapterId, capabilityId: adapterId, name: "Graph Validation Source", version: VERSION, status: "Experimental", sourceType: "graph-validation", recordTypes: ["project", "file", "function", "module", "workflow-package"], domains: ["repository", "workflow"], required: true, priority: 1,
        isAvailable: function available() { return { available: true, status: "Ready" }; },
        read: function read() { return { status: "Ready", sourceVersion: VERSION, records: internal.clone(fixtureRecords) }; }
      });
      if (adapter.ok) artifacts.adapterIds.push(adapterId);
      check("Graph validation Source Adapter can be registered", adapter.ok === true, adapter.code, "Integration");
      const sessionResult = namespace.startSession({ actor: "IDE-170 Phase 4 Validation", purpose: "Evidence Graph Fixture", requiredCapabilities: [CAPABILITY_ID] });
      const sessionId = sessionResult.ok ? sessionResult.data.session.sessionId : null;
      if (sessionId) artifacts.sessionIds.push(sessionId);
      check("Graph validation Session can be started", sessionResult.ok === true, sessionResult.code, "Integration");
      const intakeResult = namespace.captureSources(sessionId, { adapterIds: [adapterId], requiredAdapterIds: [adapterId], includeContent: true, actor: "IDE-170 Phase 4 Validation" });
      const intake = intakeResult.ok ? intakeResult.data.intake : null;
      if (intake) artifacts.intakeIds.push(intake.intakeId);
      check("Graph validation Source Intake succeeds", intakeResult.ok === true, intakeResult.code, "Integration");
      const canonicalResult = namespace.buildCanonicalSnapshot(sessionId, { intakeId: intake && intake.intakeId, actor: "IDE-170 Phase 4 Validation" });
      const canonical = canonicalResult.ok ? canonicalResult.data.snapshot : null;
      if (canonical) artifacts.canonicalSnapshotIds.push(canonical.snapshotId);
      check("Canonical Snapshot for Graph can be built", canonicalResult.ok === true, canonicalResult.code, "Integration");
      const baselineResult = namespace.buildRepositoryBaseline(sessionId, { canonicalSnapshotId: canonical && canonical.snapshotId, actor: "IDE-170 Phase 4 Validation" });
      const baseline = baselineResult.ok ? baselineResult.data.snapshot : null;
      if (baseline) artifacts.repositorySnapshotIds.push(baseline.snapshotId);
      check("Repository Baseline for Graph can be built", baselineResult.ok === true, baselineResult.code, "Integration");

      const fileA = canonical.records.find(function find(record) { return record.recordType === "file" && record.identity.qualifiedName === "src/a.js"; });
      const fileB = canonical.records.find(function find(record) { return record.recordType === "file" && record.identity.qualifiedName === "src/b.js"; });
      const candidateInput = {
        relationshipType: "replaces", layer: "candidate", direction: "directed",
        sourceNode: { canonicalId: fileA.identity.canonicalId, recordType: "file" },
        targetNode: { canonicalId: fileB.identity.canonicalId, recordType: "file" },
        provenance: { sourceType: "validation-rule", sourceId: "GRAPH-CANDIDATE", sourceVersion: VERSION, adapterId: "IDE-170-EVIDENCE-GRAPH", adapterVersion: VERSION, capturedAt: internal.nowIso() },
        evidence: [{ evidenceType: "validation-candidate", sourceId: "GRAPH-CANDIDATE", sourceType: "validation-rule", adapterId: "IDE-170-EVIDENCE-GRAPH", adapterVersion: VERSION, strength: "inferred" }],
        candidate: { candidateType: "Rename Candidate", confidence: 0.8, explanation: "Validation fixture", generatedBy: "IDE-170", reviewStatus: "Not Reviewed" }
      };
      const relationshipAdapterId = "IDE-170-ADAPTER-GRAPH-RELATIONSHIP-VALIDATION-" + unique;
      const relationshipFixture = [
        { recordType: "relationship", sourceType: "architecture-relationship-database", sourceId: "REL-CALLS-001", identity: { sourceId: "REL-CALLS-001", name: "calls", qualifiedName: "alpha calls beta official 1", aliases: [] }, classification: { domain: "architecture", category: "relationship", subtype: "calls", lifecycle: "Active" }, payload: { sourceId: "src/a.js::alpha", targetId: "src/b.js::beta", relationshipType: "calls", direction: "directed", reason: "Official fixture 1" }, metadata: {}, quality: {} },
        { recordType: "relationship", sourceType: "architecture-relationship-database", sourceId: "REL-CALLS-002", identity: { sourceId: "REL-CALLS-002", name: "calls", qualifiedName: "alpha calls beta official 2", aliases: [] }, classification: { domain: "architecture", category: "relationship", subtype: "calls", lifecycle: "Active" }, payload: { sourceId: "src/a.js::alpha", targetId: "src/b.js::beta", relationshipType: "calls", direction: "directed", reason: "Official fixture 2" }, metadata: {}, quality: {} },
        { recordType: "relationship", sourceType: "architecture-relationship-database", sourceId: "REL-RELATED-001", identity: { sourceId: "REL-RELATED-001", name: "related-to", qualifiedName: "a related-to b official", aliases: [] }, classification: { domain: "architecture", category: "relationship", subtype: "related-to", lifecycle: "Active" }, payload: { sourceId: "src/a.js", targetId: "src/b.js", relationshipType: "related-to", direction: "directed", reason: "Explicit official generic relationship" }, metadata: {}, quality: {} },
        { recordType: "relationship", sourceType: "architecture-relationship-database", sourceId: "REL-UNKNOWN-001", identity: { sourceId: "REL-UNKNOWN-001", name: "mystery-link", qualifiedName: "a mystery b", aliases: [] }, classification: { domain: "architecture", category: "relationship", subtype: "mystery-link", lifecycle: "Active" }, payload: { sourceId: "src/a.js", targetId: "src/b.js", relationshipType: "mystery-link", direction: "directed" }, metadata: {}, quality: {} }
      ];
      const relationshipAdapter = namespace.registerSourceAdapter({
        adapterId: relationshipAdapterId, capabilityId: relationshipAdapterId, name: "Official Relationship Validation Source", version: VERSION, status: "Experimental", sourceType: "architecture-relationship-database", recordTypes: ["relationship"], domains: ["architecture"], required: false, priority: 1,
        isAvailable: function available() { return { available: true, status: "Ready" }; },
        read: function read() { return { status: "Ready", sourceVersion: VERSION, records: internal.clone(relationshipFixture) }; }
      });
      if (relationshipAdapter.ok) artifacts.adapterIds.push(relationshipAdapterId);
      check("Official Relationship validation Adapter can be registered", relationshipAdapter.ok === true, relationshipAdapter.code, "Official Relationship Source");
      const relationshipIntakeResult = namespace.captureSources(sessionId, { adapterIds: [relationshipAdapterId], includeContent: false, actor: "IDE-170 Phase 4 Validation" });
      const relationshipIntake = relationshipIntakeResult.ok ? relationshipIntakeResult.data.intake : null;
      if (relationshipIntake) artifacts.intakeIds.push(relationshipIntake.intakeId);
      check("Official Relationship Source Intake succeeds", relationshipIntakeResult.ok === true, relationshipIntakeResult.code, "Official Relationship Source");

      const graphResult = namespace.buildEvidenceGraph(sessionId, { canonicalSnapshotId: canonical.snapshotId, repositorySnapshotId: baseline.snapshotId, relationshipIntakeId: relationshipIntake && relationshipIntake.intakeId, candidateEdges: [candidateInput, candidateInput], actor: "IDE-170 Phase 4 Validation" });
      const graph = graphResult.ok ? graphResult.data.graph : null;
      if (graph) artifacts.graphIds.push(graph.graphId);
      check("Evidence Graph can be built and Frozen", graphResult.ok === true && graph.status === "Frozen", graphResult.code, "Graph Build");
      const types = new Set(graph.factEdges.map(function map(edge) { return edge.relationshipType; }));
      check("File defines Function is generated", graph.factEdges.some(function edge(value) { return value.relationshipType === "defines" && value.sourceNode.recordType === "file" && value.targetNode.recordType === "function"; }), [...types], "Required Relationships");
      check("Function calls Function is generated", graph.factEdges.some(function edge(value) { return value.relationshipType === "calls" && value.sourceNode.recordType === "function" && value.targetNode.recordType === "function"; }), [...types], "Required Relationships");
      check("Module contains File is generated", graph.factEdges.some(function edge(value) { return value.relationshipType === "contains" && value.sourceNode.recordType === "module" && value.targetNode.recordType === "file"; }), [...types], "Required Relationships");
      check("Workflow changes File is generated", graph.factEdges.some(function edge(value) { return value.relationshipType === "changes" && value.sourceNode.recordType === "workflow-package" && value.targetNode.recordType === "file"; }), [...types], "Required Relationships");
      const officialCallsEdge = graph.factEdges.find(function edge(value) { return value.relationshipType === "calls" && value.sourceNode.canonicalId === "function:src/a.js::alpha" && value.targetNode.canonicalId === "function:src/b.js::beta"; });
      check("Duplicate official Relationship merges Evidence into one Edge", Boolean(officialCallsEdge && officialCallsEdge.evidence.length >= 3 && graph.factEdges.filter(function edge(value) { return value.edgeKey === officialCallsEdge.edgeKey; }).length === 1), officialCallsEdge && officialCallsEdge.evidence, "Duplicate Control");
      check("Explicit official related-to is accepted in Fact Layer", graph.factEdges.some(function edge(value) { return value.relationshipType === "related-to" && value.evidence.some(function evidence(item) { return item.evidenceType === "official-relationship-record"; }); }), [...types], "Official Relationship Source");
      check("Unregistered official Relationship Type is excluded with Warning", !graph.factEdges.some(function edge(value) { return value.relationshipType === "mystery-link"; }) && graph.quality.warnings.some(function warning(value) { return value.code === "RELATIONSHIP_TYPE_UNREGISTERED" && value.relationshipType === "mystery-link"; }), graph.quality.warnings, "Official Relationship Source");
      check("Duplicate Candidate Edge is merged", graph.candidateEdges.length === 1, graph.candidateEdges.length, "Duplicate Control");
      check("Inferred Relationship remains Candidate", graph.candidateEdges.length === 1 && graph.candidateEdges[0].candidate.factPromotionAllowed === false && graph.factEdges.every(function edge(value) { return value.evidence.every(function evidence(item) { return item.strength !== "inferred"; }); }), graph.summary, "Layer Governance");
      check("Evidence Index is generated", Object.keys(graph.evidenceIndex).length > 0 && graph.summary.evidenceCount === Object.keys(graph.evidenceIndex).length, graph.summary, "Evidence Index");
      const graphValidation = namespace.validateEvidenceGraph(graph.graphId);
      check("Graph Validation passes", graphValidation.valid === true && graphValidation.failed === 0, graphValidation.passed + "/" + graphValidation.total, "Graph Validation");
      const pathResult = namespace.getRelationshipPath(graph.graphId, fileA.identity.canonicalId, "function:src/b.js::beta", { maxDepth: 4 });
      check("Relationship Path can be resolved", pathResult.ok === true && pathResult.data.pathCount >= 1, pathResult.data, "Relationship Path");
      const copy = namespace.getEvidenceGraph(graph.graphId);
      copy.factEdges[0].relationshipType = "tampered";
      const protectedCopy = namespace.getEvidenceGraph(graph.graphId);
      check("Frozen Graph is protected from external mutation", protectedCopy.factEdges[0].relationshipType !== "tampered", protectedCopy.factEdges[0].relationshipType, "Immutability");
      const tampered = namespace.getEvidenceGraph(graph.graphId);
      tampered.factEdges[0].evidence = [];
      const tamperValidation = namespace.validateEvidenceGraph(tampered);
      check("Frozen Graph tampering is detected", tamperValidation.valid === false, tamperValidation.failed, "Integrity");
      const inferredFact = namespace.validateRelationshipEdge(Object.assign({}, candidateInput, { layer: "fact" }), { nodeMap: new Map(canonical.records.map(function map(record) { return [record.identity.canonicalId, record]; })) });
      check("Inferred Edge is blocked from Fact Layer", inferredFact.valid === false, inferredFact.checks.filter(function item(value) { return !value.passed; }), "Layer Governance");
      const ungovernedRelatedFact = namespace.validateRelationshipEdge({
        relationshipType: "related-to", layer: "fact", direction: "directed",
        sourceNode: { canonicalId: fileA.identity.canonicalId, recordType: "file" },
        targetNode: { canonicalId: fileB.identity.canonicalId, recordType: "file" },
        provenance: { sourceType: "analysis-rule", sourceId: "UNOFFICIAL-RELATED", sourceVersion: VERSION, adapterId: "IDE-170-EVIDENCE-GRAPH", adapterVersion: VERSION, capturedAt: internal.nowIso() },
        evidence: [{ evidenceType: "analysis-rule", sourceId: "UNOFFICIAL-RELATED", sourceType: "analysis-rule", adapterId: "IDE-170-EVIDENCE-GRAPH", adapterVersion: VERSION, strength: "direct" }]
      }, { nodeMap: new Map(canonical.records.map(function map(record) { return [record.identity.canonicalId, record]; })) });
      check("Generic related-to without official Relationship Evidence is blocked", ungovernedRelatedFact.valid === false, ungovernedRelatedFact.checks.filter(function item(value) { return !value.passed; }), "Layer Governance");
      const sessionFreeze = namespace.freezeSession(sessionId, { actor: "IDE-170 Phase 4 Validation", reason: "Fixture Complete" });
      check("Graph Session can be Frozen", sessionFreeze.ok === true, sessionFreeze.code, "Session Lifecycle");

      let currentRepository = null;
      if (settings.androidRealDevicePassed === true && typeof namespace.prepareCurrentRepositorySources === "function") {
        currentRepository = { passed: false, stage: "Preparation" };
        const preparation = await namespace.prepareCurrentRepositorySources({ silent: true });
        currentRepository.preparationCode = preparation && preparation.code || "PREPARATION_FAILED";
        if (preparation && preparation.ok === true) {
          const actualSession = namespace.startSession({ actor: internal.text(settings.actor, "Project Owner"), purpose: "Phase 4 Android Real Repository Graph", requiredCapabilities: [CAPABILITY_ID] });
          currentRepository.sessionCode = actualSession && actualSession.code || "SESSION_FAILED";
          if (actualSession.ok) {
            const actualSessionId = actualSession.data.session.sessionId;
            const actualIntake = namespace.captureSources(actualSessionId, { adapterIds: ["IDE-170-ADAPTER-REPOSITORY", "IDE-170-ADAPTER-PROJECT", "IDE-170-ADAPTER-FUNCTION", "IDE-170-ADAPTER-MODULE", "IDE-170-ADAPTER-ARCHITECTURE", "IDE-170-ADAPTER-WORKFLOW"], requiredAdapterIds: ["IDE-170-ADAPTER-REPOSITORY", "IDE-170-ADAPTER-PROJECT"], includeContent: false, actor: settings.actor });
            const actualCanonical = actualIntake.ok ? namespace.buildCanonicalSnapshot(actualSessionId, { intakeId: actualIntake.data.intake.intakeId, actor: settings.actor }) : null;
            let relationshipIntake = null;
            if (namespace.getSourceAvailability("IDE-170-ADAPTER-RELATIONSHIP").available) relationshipIntake = namespace.captureSources(actualSessionId, { adapterIds: ["IDE-170-ADAPTER-RELATIONSHIP"], actor: settings.actor });
            const actualGraph = actualCanonical && actualCanonical.ok ? namespace.buildEvidenceGraph(actualSessionId, { canonicalSnapshotId: actualCanonical.data.snapshot.snapshotId, relationshipIntakeId: relationshipIntake && relationshipIntake.ok ? relationshipIntake.data.intake.intakeId : null, actor: settings.actor }) : null;
            currentRepository = {
              preparationCode: preparation.code,
              sessionCode: actualSession.code,
              intakeSummary: actualIntake && actualIntake.ok ? actualIntake.data.intake.summary : null,
              canonicalSummary: actualCanonical && actualCanonical.ok ? actualCanonical.data.snapshot.summary : null,
              graphSummary: actualGraph && actualGraph.ok ? actualGraph.data.graph.summary : null,
              graphId: actualGraph && actualGraph.ok ? actualGraph.data.graph.graphId : null,
              passed: Boolean(actualGraph && actualGraph.ok && actualGraph.data.graph.summary.factEdgeCount > 0)
            };
            namespace.freezeSession(actualSessionId, { actor: settings.actor, reason: "Phase 4 Android Validation Complete" });
          }
        }
        check("Current Repository Evidence Graph can be built", Boolean(currentRepository && currentRepository.passed), currentRepository, "Android Current Repository");
      } else {
        check("Android current Repository Graph remains an explicit Gate", settings.androidRealDevicePassed !== true, "Manual Android execution required", "Android Current Repository");
      }

      cleanup();
      check("Validation Graph artifacts are isolated", artifacts.graphIds.every(function item(id) { return namespace.getEvidenceGraph(id) === null; }), artifacts.graphIds, "Validation Isolation");
      const passed = checks.filter(function item(value) { return value.passed; }).length;
      const total = checks.length;
      const result = {
        id: internal.nextId("IDE-170-PHASE4-VALIDATION"),
        componentId: namespace.componentId,
        name: "IDE-170 Phase 4 Evidence Graph Validation",
        version: VERSION,
        designFreezeVersion: namespace.designFreezeVersion,
        valid: passed === total && total > 0,
        passed: passed,
        failed: total - passed,
        total: total,
        health: total ? Number(((passed / total) * 100).toFixed(2)) : 0,
        status: passed === total ? "Passed" : "Failed",
        checks: checks,
        regressionValidation: regression ? { valid: regression.valid, passed: regression.passed, failed: regression.failed, total: regression.total, health: regression.health } : null,
        currentRepository: currentRepository,
        phase4Gate: "Passed - Procedure Compiler Release Frozen",
        phase5Gate: passed === total && settings.androidRealDevicePassed === true ? "Passed" : "Blocked",
        androidRealDeviceValidation: {
          required: true,
          passed: settings.androidRealDevicePassed === true,
          device: internal.text(settings.device, settings.androidRealDevicePassed === true ? "Android Chrome" : ""),
          evidence: internal.text(settings.androidEvidence, ""),
          validatedAt: settings.androidRealDevicePassed === true ? internal.nowIso() : null
        },
        executedAt: internal.nowIso()
      };
      state.lastEvidenceGraphValidation = internal.clone(result);
      internal.touch();
      if (typeof internal.registerExternalIntegration === "function") internal.registerExternalIntegration();
      result.releaseStatus = namespace.getReleaseStatus();
      state.lastEvidenceGraphValidation = internal.clone(result);
      return internal.clone(result);
    } catch (error) {
      cleanup();
      const passed = checks.filter(function item(value) { return value.passed; }).length;
      const result = {
        id: internal.nextId("IDE-170-PHASE4-VALIDATION"), componentId: namespace.componentId,
        name: "IDE-170 Phase 4 Evidence Graph Validation", version: VERSION,
        valid: false, passed: passed, failed: checks.length - passed + 1, total: checks.length + 1,
        health: checks.length + 1 ? Number(((passed / (checks.length + 1)) * 100).toFixed(2)) : 0,
        status: "Failed", checks: checks.concat([{ name: "Validation completed without exception", passed: false, detail: error && error.message || String(error), group: "Runtime", severity: "Critical" }]),
        phase4Gate: "Passed - Procedure Compiler Release Frozen", phase5Gate: "Blocked",
        androidRealDeviceValidation: { required: true, passed: false, device: "", evidence: "", validatedAt: null },
        error: internal.setError(error, "EVIDENCE_GRAPH_PHASE_VALIDATION_FAILED"), executedAt: internal.nowIso()
      };
      state.lastEvidenceGraphValidation = internal.clone(result);
      internal.touch();
      return result;
    }
  }

  function removeEvidenceGraphForValidation(graphId) {
    const id = internal.text(graphId, "");
    const removed = state.evidenceGraphSnapshots.delete(id);
    if (state.latestEvidenceGraphSnapshotId === id) state.latestEvidenceGraphSnapshotId = null;
    return removed;
  }

  Object.assign(internal, {
    evidenceGraphLayers: LAYERS,
    evidenceStrengths: STRENGTHS,
    relationshipStatuses: STATUSES,
    removeEvidenceGraphForValidation: removeEvidenceGraphForValidation
  });

  Object.assign(namespace.api, {
    initializeEvidenceGraph: initializeEvidenceGraph,
    buildEvidenceGraph: buildEvidenceGraph,
    getEvidenceGraph: getEvidenceGraph,
    getEvidenceGraphs: getEvidenceGraphs,
    validateRelationshipEdge: validateRelationshipEdge,
    validateEvidenceGraph: validateEvidenceGraph,
    getRelationshipPath: getRelationshipPath,
    getEvidence: getEvidence,
    getEvidenceGraphStatus: getEvidenceGraphStatus,
    runEvidenceGraphPhaseValidation: runEvidenceGraphPhaseValidation
  });
  Object.assign(namespace, {
    buildEvidenceGraph: buildEvidenceGraph,
    getEvidenceGraph: getEvidenceGraph,
    getEvidenceGraphs: getEvidenceGraphs,
    validateRelationshipEdge: validateRelationshipEdge,
    validateEvidenceGraph: validateEvidenceGraph,
    getRelationshipPath: getRelationshipPath,
    getEvidence: getEvidence,
    getEvidenceGraphStatus: getEvidenceGraphStatus,
    runEvidenceGraphPhaseValidation: runEvidenceGraphPhaseValidation
  });

  global.validateIntelligenceEvidenceGraph = runEvidenceGraphPhaseValidation;

  namespace.modules.evidenceGraph = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    factGraph: true,
    candidateGraph: true,
    evidenceIndex: true,
    relationshipPath: true,
    duplicateEdgeControl: true,
    immutableGraph: true,
    automaticCandidateFactPromotionAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
