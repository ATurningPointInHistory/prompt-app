/* ============================================================
   FILE: 13_intelligence_package_model.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 8: Immutable Intelligence Package Model
   Architecture Decision: IDE-170-009
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("packageModel");
  const CAPABILITY_ID = "IDE-170-INTELLIGENCE-PACKAGE";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const PACKAGE_VERSION = VERSION_MANIFEST.contractVersions.intelligencePackage;
  const MANIFEST_VERSION = VERSION_MANIFEST.contractVersions.intelligencePackageManifest;
  const ARTIFACT_SCHEMA_ID = "IDE-170-SCHEMA-TYPED-ARTIFACT";
  const MANIFEST_SCHEMA_ID = "IDE-170-SCHEMA-INTELLIGENCE-PACKAGE-MANIFEST";
  const PACKAGE_SCHEMA_ID = "IDE-170-SCHEMA-INTELLIGENCE-PACKAGE";
  const HASH_ALGORITHM = "SHA-256";

  if (!(state.intelligenceArtifacts instanceof Map)) state.intelligenceArtifacts = new Map();
  if (!(state.intelligencePackages instanceof Map)) state.intelligencePackages = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestIntelligencePackageId")) state.latestIntelligencePackageId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackageBuild")) state.lastPackageBuild = null;

  const ARTIFACT_TYPES = Object.freeze({
    "source-intake-summary": { category: "source", required: true },
    "source-status": { category: "source", required: false },
    "adapter-result": { category: "source", required: false },
    "canonical-snapshot": { category: "snapshot", required: true },
    "repository-baseline": { category: "snapshot", required: true },
    "repository-incremental": { category: "snapshot", required: false },
    "snapshot-diff": { category: "snapshot", required: false },
    "fact-relationship-graph": { category: "relationship", required: true },
    "candidate-relationship-graph": { category: "relationship", required: false },
    "evidence-index": { category: "relationship", required: false },
    "relationship-path": { category: "relationship", required: false },
    "repository-understanding": { category: "understanding", required: false },
    "workflow-understanding": { category: "understanding", required: false },
    "change-understanding": { category: "understanding", required: false },
    "relationship-understanding": { category: "understanding", required: false },
    "cross-domain-understanding": { category: "understanding", required: false },
    "repository-insight": { category: "insight", required: false },
    "architecture-insight": { category: "insight", required: false },
    "workflow-insight": { category: "insight", required: false },
    "change-insight": { category: "insight", required: false },
    "knowledge-insight": { category: "insight", required: false },
    "typed-query": { category: "query", required: false },
    "query-result": { category: "query", required: false },
    "explainable-insight-envelope": { category: "query", required: false },
    "evidence-record": { category: "evidence", required: false },
    "source-reference": { category: "evidence", required: false },
    "rule-reference": { category: "evidence", required: false },
    "engine-reference": { category: "evidence", required: false },
    "confidence-result": { category: "confidence", required: false },
    "quality-result": { category: "quality", required: false },
    "limitation-record": { category: "quality", required: false },
    "artifact-validation": { category: "validation", required: false },
    "package-validation": { category: "validation", required: true },
    "completion-gate-result": { category: "validation", required: true },
    "explanation-record": { category: "explanation", required: false },
    "confidence-explanation": { category: "explanation", required: false },
    "evidence-explanation": { category: "explanation", required: false },
    "limitation-explanation": { category: "explanation", required: false },
    "ide180-handoff-contract": { category: "handoff", required: true }
  });

  const REQUIRED_TYPES = Object.freeze([
    "source-intake-summary",
    "canonical-snapshot",
    "repository-baseline",
    "fact-relationship-graph",
    "package-validation",
    "completion-gate-result",
    "ide180-handoff-contract"
  ]);

  const DEFAULT_LOCATIONS = Object.freeze({
    "source-intake-summary": "source_intake/intake_summary.json",
    "source-status": "source_intake/source_status.json",
    "canonical-snapshot": "snapshots/canonical_snapshot.json",
    "repository-baseline": "snapshots/repository_baseline.json",
    "repository-incremental": "snapshots/repository_incremental.json",
    "snapshot-diff": "snapshots/snapshot_diff.json",
    "fact-relationship-graph": "relationships/fact_graph.json",
    "candidate-relationship-graph": "relationships/candidate_graph.json",
    "evidence-index": "relationships/evidence_index.json",
    "repository-understanding": "understanding/repository_understanding.json",
    "workflow-understanding": "understanding/workflow_understanding.json",
    "change-understanding": "understanding/change_understanding.json",
    "cross-domain-understanding": "understanding/cross_domain_understanding.json",
    "repository-insight": "insights/repository_insights.json",
    "typed-query": "queries/typed_queries.json",
    "query-result": "queries/query_results.json",
    "explainable-insight-envelope": "queries/explainable_insight_envelopes.json",
    "evidence-record": "evidence/evidence_records.json",
    "source-reference": "evidence/source_references.json",
    "confidence-result": "confidence/confidence_results.json",
    "quality-result": "quality/quality_results.json",
    "limitation-record": "quality/limitations.json",
    "artifact-validation": "validation/artifact_validations.json",
    "package-validation": "validation/package_validation.json",
    "completion-gate-result": "validation/completion_gate.json",
    "explanation-record": "explanations/explanation_records.json",
    "ide180-handoff-contract": "handoff/ide180_handoff.json"
  });

  function stableStringify(value) {
    if (value == null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function mapKey(key) {
      return JSON.stringify(key) + ":" + stableStringify(value[key]);
    }).join(",") + "}";
  }

  function sha256(value) {
    if (typeof namespace.calculateSHA256 !== "function") throw new Error("SHA-256 API is unavailable.");
    return namespace.calculateSHA256(typeof value === "string" ? value : stableStringify(value));
  }

  function utf8ByteSize(value) {
    const text = typeof value === "string" ? value : stableStringify(value);
    if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }

  function artifactHashPayload(artifact) {
    const copy = internal.clone(artifact || {});
    if (copy.integrity) copy.integrity = { algorithm: copy.integrity.algorithm || HASH_ALGORITHM };
    return copy;
  }

  function manifestHashPayload(manifest) {
    const copy = internal.clone(manifest || {});
    if (copy.integrity) {
      copy.integrity.manifestHash = null;
      copy.integrity.packageHash = null;
      copy.integrity.status = "Pending";
    }
    return copy;
  }

  function calculatePackageHash(manifestHash, artifactEntries) {
    const list = internal.asArray(artifactEntries).map(function mapEntry(entry) {
      return { artifactId: entry.artifactId, hash: entry.hash, location: entry.location };
    }).sort(function sortEntries(a, b) { return a.artifactId.localeCompare(b.artifactId); });
    return sha256({ manifestHash: manifestHash, artifactHashes: list });
  }

  function sensitiveKey(key) {
    return /(^|[-_])(token|api[-_]?key|password|passwd|cookie|authorization|credential|session[-_]?secret|environment[-_]?secret)([-_]|$)/i.test(String(key || ""));
  }

  function sourceBodyKey(key) {
    return /^(content|sourceText|sourceCode|functionSource|rawContent|rawSource|fileContent)$/i.test(String(key || ""));
  }

  function sanitizeForPackage(value, path, warnings) {
    const currentPath = path || "$";
    if (Array.isArray(value)) {
      return value.map(function mapItem(item, index) { return sanitizeForPackage(item, currentPath + "[" + index + "]", warnings); });
    }
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).forEach(function copyKey(key) {
      if (sensitiveKey(key)) {
        out[key] = "[REDACTED]";
        warnings.push("Sensitive field redacted: " + currentPath + "." + key);
        return;
      }
      if (sourceBodyKey(key) && typeof value[key] === "string") {
        out[key + "Omitted"] = true;
        out[key + "Hash"] = sha256(value[key]);
        warnings.push("Raw source body omitted from Intelligence Package: " + currentPath + "." + key);
        return;
      }
      out[key] = sanitizeForPackage(value[key], currentPath + "." + key, warnings);
    });
    return out;
  }

  function registerSchemas() {
    const definitions = [
      {
        schemaId: ARTIFACT_SCHEMA_ID,
        name: "IDE-170 Typed Intelligence Artifact",
        required: ["artifactId", "artifactType", "artifactVersion", "schemaVersion", "packageId", "sessionId", "status", "payload", "quality", "validation", "integrity", "createdAt", "frozenAt", "frozen"]
      },
      {
        schemaId: MANIFEST_SCHEMA_ID,
        name: "IDE-170 Intelligence Package Manifest",
        required: ["packageId", "packageVersion", "manifestVersion", "schemaVersion", "status", "project", "session", "snapshots", "artifacts", "integrity", "validation", "compatibility", "createdAt", "validatedAt", "frozenAt"]
      },
      {
        schemaId: PACKAGE_SCHEMA_ID,
        name: "IDE-170 Immutable Intelligence Package",
        required: ["packageId", "packageVersion", "manifest", "artifactOrder", "status", "quality", "createdAt", "frozenAt", "frozen", "immutable"]
      }
    ];
    return definitions.map(function register(definition) {
      const version = VERSION_MANIFEST.getSchemaVersion(definition.schemaId);
      const existing = namespace.getSchema && namespace.getSchema(definition.schemaId);
      if (existing && existing.version === version) return { schemaId: definition.schemaId, registered: true, existing: true };
      if (existing && internal.removeSchemaForValidation) internal.removeSchemaForValidation(definition.schemaId);
      const properties = {};
      definition.required.forEach(function property(name) {
        if (["payload", "quality", "validation", "integrity", "project", "session", "snapshots", "compatibility", "manifest"].includes(name)) properties[name] = { type: "object" };
        else if (["artifacts", "artifactOrder"].includes(name)) properties[name] = { type: "array" };
        else if (["frozen", "immutable"].includes(name)) properties[name] = { type: "boolean" };
        else properties[name] = { type: "string" };
      });
      const result = namespace.registerSchema({
        schemaId: definition.schemaId,
        name: definition.name,
        version: version,
        type: "object",
        required: definition.required,
        properties: properties,
        additionalProperties: true,
        owner: "IDE-170",
        source: "Architecture Decision 009"
      });
      return { schemaId: definition.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerCapability() {
    const existing = namespace.getCapability && namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === CAPABILITY_VERSION) return internal.buildResult(true, "PACKAGE_CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Immutable Intelligence Package Model",
      version: CAPABILITY_VERSION,
      type: "Package",
      status: "Active",
      owner: "IDE-170",
      description: "Builds immutable, typed, hash-bound Intelligence Packages without duplicating the Source of Truth.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-CANONICAL-MODEL", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-REPOSITORY-SNAPSHOT", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-EVIDENCE-GRAPH", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-UNDERSTANDING-PIPELINE", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-INDEPENDENT-VALIDATION", minimumVersion: MINIMUM_VERSION, optional: false }
      ],
      schemas: [ARTIFACT_SCHEMA_ID, MANIFEST_SCHEMA_ID, PACKAGE_SCHEMA_ID],
      provides: ["Typed Artifact", "Package Manifest", "Artifact Hash", "Package Hash", "Package Freeze", "Partial Package Policy"],
      source: "Architecture Decision 009"
    });
  }

  function artifactTypeInfo(type) {
    return ARTIFACT_TYPES[type] ? internal.clone(ARTIFACT_TYPES[type]) : null;
  }

  function createTypedArtifact(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const type = internal.text(source.artifactType, "");
    if (!ARTIFACT_TYPES[type]) throw new Error("Unregistered Intelligence Artifact Type: " + type);
    const warnings = [];
    const now = internal.nowIso();
    const artifact = {
      artifactId: internal.text(source.artifactId, internal.nextId("IDE-170-ARTIFACT")),
      artifactType: type,
      artifactVersion: VERSION_MANIFEST.getArtifactVersion(type) || "1.0.0",
      schemaVersion: VERSION_MANIFEST.getSchemaVersion(ARTIFACT_SCHEMA_ID),
      packageId: internal.text(source.packageId, ""),
      sessionId: internal.text(source.sessionId, ""),
      snapshotReferences: internal.unique(source.snapshotReferences),
      sourceReferences: internal.unique(source.sourceReferences),
      status: internal.text(source.status, "Valid"),
      payload: sanitizeForPackage(source.payload == null ? {} : source.payload, "$.payload", warnings),
      quality: internal.clone(source.quality || {}),
      validation: internal.clone(source.validation || { status: "Valid" }),
      limitations: internal.unique(internal.asArray(source.limitations).concat(warnings)),
      integrity: { algorithm: HASH_ALGORITHM, hash: null, byteSize: 0, status: "Pending" },
      createdAt: internal.text(source.createdAt, now),
      frozenAt: now,
      frozen: true,
      immutable: true
    };
    artifact.integrity.hash = sha256(artifactHashPayload(artifact));
    artifact.integrity.byteSize = utf8ByteSize(stableStringify(artifactHashPayload(artifact)));
    artifact.integrity.status = "Valid";
    return internal.deepFreeze(artifact);
  }

  function addArtifact(draft, input, location) {
    const artifact = createTypedArtifact(Object.assign({}, input, { packageId: draft.packageId, sessionId: draft.sessionId }));
    const resolvedLocation = internal.text(location, DEFAULT_LOCATIONS[artifact.artifactType] || ("artifacts/" + artifact.artifactId + ".json"));
    if (draft.artifactsById[artifact.artifactId]) throw new Error("Duplicate Artifact ID: " + artifact.artifactId);
    if (draft.locationIds[resolvedLocation]) throw new Error("Duplicate Artifact location: " + resolvedLocation);
    draft.artifactsById[artifact.artifactId] = artifact;
    draft.locationIds[resolvedLocation] = artifact.artifactId;
    draft.artifactOrder.push(artifact.artifactId);
    draft.locations[artifact.artifactId] = resolvedLocation;
    return artifact;
  }

  function latestBySession(items, sessionId) {
    const filtered = internal.asArray(items).filter(function filter(item) { return item && item.sessionId === sessionId; });
    return filtered.length ? filtered[filtered.length - 1] : null;
  }

  function resolveSessionContext(sessionId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = namespace.getSession(sessionId);
    if (!session) return { ok: false, code: "PACKAGE_SESSION_NOT_FOUND", status: "Blocked", error: "Intelligence Session was not found." };

    const intakes = typeof namespace.getSourceIntakes === "function" ? namespace.getSourceIntakes({ sessionId: sessionId, limit: 100 }) : [];
    const canonicalSnapshots = typeof namespace.getCanonicalSnapshots === "function" ? namespace.getCanonicalSnapshots({ sessionId: sessionId, limit: 100 }) : [];
    const repositorySnapshots = typeof namespace.getRepositorySnapshots === "function" ? namespace.getRepositorySnapshots({ sessionId: sessionId, limit: 100 }) : [];
    const graphs = typeof namespace.getEvidenceGraphs === "function" ? namespace.getEvidenceGraphs({ sessionId: sessionId, limit: 100 }) : [];
    const understandings = typeof namespace.getUnderstandingResults === "function" ? namespace.getUnderstandingResults({ sessionId: sessionId, limit: 100 }) : [];

    const sourceIntake = settings.sourceIntake || latestBySession(intakes, sessionId);
    const canonicalSnapshot = settings.canonicalSnapshot || latestBySession(canonicalSnapshots, sessionId);
    const repositorySnapshot = settings.repositorySnapshot || latestBySession(repositorySnapshots, sessionId);
    const graph = settings.graph || latestBySession(graphs, sessionId);
    const understanding = settings.understanding || latestBySession(understandings, sessionId);

    if (!sourceIntake || !canonicalSnapshot || !repositorySnapshot || !graph || !understanding) {
      return {
        ok: false,
        code: "PACKAGE_REQUIRED_SOURCE_ARTIFACT_MISSING",
        status: "Blocked",
        error: "Source Intake, Canonical Snapshot, Repository Snapshot, Fact Graph and Understanding Result are required."
      };
    }

    const canonicalSnapshotId = canonicalSnapshot.snapshotId;
    const allQueries = typeof namespace.listTypedQueries === "function" ? namespace.listTypedQueries() : [];
    const allResults = typeof namespace.listQueryResults === "function" ? namespace.listQueryResults() : [];
    const envelopes = state.explainableEnvelopes instanceof Map ? [...state.explainableEnvelopes.values()].map(internal.clone) : [];
    const matchingEnvelopes = envelopes.filter(function filterEnvelope(item) {
      return item && item.snapshotReference && item.snapshotReference.canonicalSnapshotId === canonicalSnapshotId;
    });
    const queryIds = new Set(matchingEnvelopes.map(function id(item) { return item.queryId; }));
    const envelopeIds = new Set(matchingEnvelopes.map(function id(item) { return item.envelopeId; }));
    const typedQueries = allQueries.filter(function filterQuery(item) { return item && queryIds.has(item.queryId); });
    const queryResults = allResults.filter(function filterResult(item) { return item && (queryIds.has(item.queryId) || envelopeIds.has(item.envelopeId)); });

    return {
      ok: true,
      session: session,
      sourceIntake: sourceIntake,
      canonicalSnapshot: canonicalSnapshot,
      repositorySnapshot: repositorySnapshot,
      graph: graph,
      understanding: understanding,
      typedQueries: typedQueries,
      queryResults: queryResults,
      envelopes: matchingEnvelopes
    };
  }

  function compactSourceIntake(intake) {
    return {
      intakeId: intake.intakeId,
      sessionId: intake.sessionId,
      status: intake.status,
      summary: internal.clone(intake.summary || {}),
      warnings: internal.clone(intake.warnings || []),
      adapterResults: internal.asArray(intake.adapterResults).map(function mapAdapter(item) {
        return {
          adapterId: item.adapterId,
          adapterVersion: item.adapterVersion || null,
          sourceType: item.sourceType,
          sourceVersion: item.sourceVersion || null,
          status: item.status,
          recordCount: item.recordCount,
          capturedAt: item.capturedAt
        };
      }),
      capturedAt: intake.capturedAt
    };
  }

  function compactCanonicalSnapshot(snapshot) {
    return {
      snapshotId: snapshot.snapshotId,
      snapshotType: snapshot.snapshotType,
      componentId: snapshot.componentId,
      version: snapshot.version,
      schemaVersion: snapshot.schemaVersion,
      sessionId: snapshot.sessionId,
      sourceIntakeId: snapshot.sourceIntakeId,
      status: snapshot.status,
      records: internal.asArray(snapshot.records).map(function mapRecord(record) {
        return {
          recordId: record.recordId,
          recordType: record.recordType,
          schemaVersion: record.schemaVersion,
          identity: internal.clone(record.identity || {}),
          classification: internal.clone(record.classification || {}),
          source: internal.clone(record.source || {}),
          metadata: internal.clone(record.metadata || {}),
          quality: internal.clone(record.quality || {}),
          payload: internal.clone(record.payload || {})
        };
      }),
      sourceReferences: internal.clone(snapshot.sourceReferences || []),
      summary: internal.clone(snapshot.summary || {}),
      quality: internal.clone(snapshot.quality || {}),
      validation: internal.clone(snapshot.validation || {}),
      capturedAt: snapshot.capturedAt,
      validatedAt: snapshot.validatedAt,
      frozenAt: snapshot.frozenAt,
      immutable: snapshot.immutable === true
    };
  }

  function compactRepositorySnapshot(snapshot) {
    return internal.clone(snapshot);
  }

  function compactGraph(graph) {
    return {
      graphId: graph.graphId,
      graphType: graph.graphType,
      sessionId: graph.sessionId,
      canonicalSnapshotId: graph.canonicalSnapshotId,
      repositorySnapshotId: graph.repositorySnapshotId,
      status: graph.status,
      nodes: internal.clone(graph.nodes || []),
      factEdges: internal.clone(graph.factEdges || []),
      candidateEdges: internal.clone(graph.candidateEdges || []),
      evidenceIndex: internal.clone(graph.evidenceIndex || {}),
      indexes: internal.clone(graph.indexes || {}),
      summary: internal.clone(graph.summary || {}),
      validation: internal.clone(graph.validation || {}),
      integrity: internal.clone(graph.integrity || {}),
      createdAt: graph.createdAt,
      frozenAt: graph.frozenAt,
      immutable: graph.immutable === true
    };
  }

  function splitUnderstanding(understanding) {
    if (!understanding) return {};
    const facts = internal.asArray(understanding.facts);
    const derived = internal.asArray(understanding.derivedResults);
    const insights = internal.asArray(understanding.insights);
    const workflowPattern = /workflow|approval|decision|rollback|execution|validation/i;
    const changePattern = /change|added|modified|removed|impact|rename/i;
    const crossPattern = /cross[- ]domain|mapping/i;
    function matches(item, pattern) {
      return pattern.test(stableStringify({ type: item && (item.factType || item.resultType || item.insightType || item.type), ruleId: item && item.ruleId, statement: item && (item.statement || item.summary || item.fact) }));
    }
    const base = {
      understandingId: understanding.understandingId,
      sessionId: understanding.sessionId,
      scope: internal.clone(understanding.scope || {}),
      quality: internal.clone(understanding.quality || {}),
      summary: internal.clone(understanding.summary || {}),
      rules: internal.clone(understanding.rules || []),
      engines: internal.clone(understanding.engines || []),
      stages: internal.clone(understanding.stages || []),
      integrity: internal.clone(understanding.integrity || {}),
      frozenAt: understanding.frozenAt,
      immutable: understanding.immutable === true
    };
    function isSpecialized(item) {
      return matches(item, workflowPattern) || matches(item, changePattern) || matches(item, crossPattern);
    }
    return {
      repository: Object.assign({}, base, { facts: facts.filter(function item(x) { return !isSpecialized(x); }), derivedResults: derived.filter(function item(x) { return !isSpecialized(x); }) }),
      workflow: Object.assign({}, base, { facts: facts.filter(function item(x) { return matches(x, workflowPattern); }), derivedResults: derived.filter(function item(x) { return matches(x, workflowPattern); }) }),
      change: Object.assign({}, base, { facts: facts.filter(function item(x) { return matches(x, changePattern) && !matches(x, workflowPattern); }), derivedResults: derived.filter(function item(x) { return matches(x, changePattern) && !matches(x, workflowPattern); }) }),
      crossDomain: Object.assign({}, base, { facts: facts.filter(function item(x) { return matches(x, crossPattern); }), derivedResults: derived.filter(function item(x) { return matches(x, crossPattern); }) }),
      insights: insights,
      evidence: internal.clone(understanding.evidence || [])
    };
  }

  function buildDraftFromContext(context, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = context.session;
    const packageId = internal.text(settings.packageId, internal.nextId("IDE-170-INTELLIGENCE-PACKAGE"));
    if (state.intelligencePackages.has(packageId)) throw new Error("Intelligence Package ID already exists.");
    const now = internal.nowIso();
    const draft = {
      packageId: packageId,
      packageVersion: PACKAGE_VERSION,
      manifestVersion: MANIFEST_VERSION,
      sessionId: session.sessionId,
      status: "Building",
      artifactsById: {},
      artifactOrder: [],
      locations: {},
      locationIds: {},
      warnings: [],
      limitations: [],
      createdAt: now
    };

    const sourceSummary = compactSourceIntake(context.sourceIntake);
    addArtifact(draft, {
      artifactType: "source-intake-summary",
      payload: sourceSummary,
      sourceReferences: sourceSummary.adapterResults.map(function id(item) { return item.adapterId; }),
      status: context.sourceIntake.status === "Blocked" || context.sourceIntake.status === "Invalid" ? "Blocked" : context.sourceIntake.status === "Partial" ? "Partial" : "Valid",
      quality: { status: context.sourceIntake.status, warnings: internal.clone(context.sourceIntake.warnings || []) },
      validation: { status: context.sourceIntake.status === "Blocked" || context.sourceIntake.status === "Invalid" ? "Invalid" : "Valid" },
      limitations: context.sourceIntake.warnings || []
    });
    addArtifact(draft, {
      artifactType: "source-status",
      payload: { adapterResults: sourceSummary.adapterResults },
      sourceReferences: sourceSummary.adapterResults.map(function id(item) { return item.adapterId; }),
      status: context.sourceIntake.status === "Partial" ? "Partial" : "Valid",
      quality: { status: context.sourceIntake.status }
    });

    addArtifact(draft, {
      artifactType: "canonical-snapshot",
      payload: compactCanonicalSnapshot(context.canonicalSnapshot),
      snapshotReferences: [context.canonicalSnapshot.snapshotId],
      sourceReferences: internal.asArray(context.canonicalSnapshot.sourceReferences).map(function id(item) { return item.adapterId; }),
      status: context.canonicalSnapshot.quality && context.canonicalSnapshot.quality.status === "Partial" ? "Partial" : "Valid",
      quality: internal.clone(context.canonicalSnapshot.quality || {}),
      validation: internal.clone(context.canonicalSnapshot.validation || { status: "Valid" })
    });

    addArtifact(draft, {
      artifactType: "repository-baseline",
      payload: compactRepositorySnapshot(context.repositorySnapshot),
      snapshotReferences: [context.canonicalSnapshot.snapshotId, context.repositorySnapshot.snapshotId],
      status: context.repositorySnapshot.quality && context.repositorySnapshot.quality.status === "Partial" ? "Partial" : "Valid",
      quality: internal.clone(context.repositorySnapshot.quality || {}),
      validation: internal.clone(context.repositorySnapshot.validation || { status: "Valid" })
    });

    addArtifact(draft, {
      artifactType: "fact-relationship-graph",
      payload: compactGraph(context.graph),
      snapshotReferences: [context.canonicalSnapshot.snapshotId, context.repositorySnapshot.snapshotId, context.graph.graphId],
      status: "Valid",
      quality: { status: context.graph.quality && context.graph.quality.status || "Ready", summary: internal.clone(context.graph.summary || {}) },
      validation: internal.clone(context.graph.validation || { status: "Valid" })
    });
    addArtifact(draft, {
      artifactType: "evidence-index",
      payload: { graphId: context.graph.graphId, evidenceIndex: internal.clone(context.graph.evidenceIndex || {}) },
      snapshotReferences: [context.graph.graphId],
      status: "Valid"
    });
    if (internal.asArray(context.graph.candidateEdges).length) {
      addArtifact(draft, {
        artifactType: "candidate-relationship-graph",
        payload: { graphId: context.graph.graphId, candidateEdges: internal.clone(context.graph.candidateEdges) },
        snapshotReferences: [context.graph.graphId],
        status: "Valid"
      });
    }

    if (context.understanding) {
      const split = splitUnderstanding(context.understanding);
      addArtifact(draft, {
        artifactType: "repository-understanding",
        payload: split.repository,
        snapshotReferences: [context.canonicalSnapshot.snapshotId, context.repositorySnapshot.snapshotId, context.graph.graphId],
        status: context.understanding.quality && context.understanding.quality.status === "Invalid" ? "Invalid" : context.understanding.quality && context.understanding.quality.status === "Partial" ? "Partial" : "Valid",
        quality: internal.clone(context.understanding.quality || {}),
        validation: { status: context.understanding.summary && context.understanding.summary.errorCount > 0 ? "Invalid" : "Valid" },
        limitations: context.understanding.quality && context.understanding.quality.warnings || []
      });
      if (internal.asArray(split.workflow.facts).length || internal.asArray(split.workflow.derivedResults).length) {
        addArtifact(draft, { artifactType: "workflow-understanding", payload: split.workflow, snapshotReferences: [context.graph.graphId], status: "Valid" });
      }
      if (internal.asArray(split.change.facts).length || internal.asArray(split.change.derivedResults).length) {
        addArtifact(draft, { artifactType: "change-understanding", payload: split.change, snapshotReferences: [context.repositorySnapshot.snapshotId], status: "Valid" });
      }
      if (internal.asArray(split.crossDomain.facts).length || internal.asArray(split.crossDomain.derivedResults).length) {
        addArtifact(draft, { artifactType: "cross-domain-understanding", payload: split.crossDomain, snapshotReferences: [context.graph.graphId], status: "Valid" });
      }
      if (internal.asArray(split.insights).length) {
        addArtifact(draft, {
          artifactType: "repository-insight",
          payload: { understandingId: context.understanding.understandingId, insights: split.insights },
          snapshotReferences: [context.graph.graphId],
          status: "Valid"
        });
      }
      if (internal.asArray(split.evidence).length) {
        addArtifact(draft, {
          artifactType: "evidence-record",
          payload: { understandingId: context.understanding.understandingId, evidence: split.evidence },
          snapshotReferences: [context.graph.graphId],
          status: "Valid"
        });
      }
    }

    if (context.typedQueries.length) addArtifact(draft, { artifactType: "typed-query", payload: { queries: context.typedQueries }, snapshotReferences: [context.canonicalSnapshot.snapshotId], status: "Valid" });
    if (context.queryResults.length) addArtifact(draft, { artifactType: "query-result", payload: { results: context.queryResults }, snapshotReferences: [context.canonicalSnapshot.snapshotId], status: "Valid" });
    if (context.envelopes.length) {
      addArtifact(draft, { artifactType: "explainable-insight-envelope", payload: { envelopes: context.envelopes }, snapshotReferences: [context.canonicalSnapshot.snapshotId, context.graph.graphId], status: context.envelopes.some(function partial(x) { return x.status === "Partial"; }) ? "Partial" : "Valid" });
      const confidences = context.envelopes.map(function map(item) { return item.confidence; }).filter(Boolean);
      const qualities = context.envelopes.map(function map(item) { return item.quality; }).filter(Boolean);
      const explanations = context.envelopes.map(function map(item) { return { envelopeId: item.envelopeId, queryId: item.queryId, explanation: item.explanation, interpretationConfidence: item.interpretationConfidence }; });
      if (confidences.length) addArtifact(draft, { artifactType: "confidence-result", payload: { results: confidences }, snapshotReferences: [context.canonicalSnapshot.snapshotId], status: "Valid" });
      if (qualities.length) addArtifact(draft, { artifactType: "quality-result", payload: { results: qualities }, snapshotReferences: [context.canonicalSnapshot.snapshotId], status: "Valid" });
      addArtifact(draft, { artifactType: "explanation-record", payload: { explanations: explanations }, snapshotReferences: [context.canonicalSnapshot.snapshotId], status: "Valid" });
    } else {
      const limitations = context.understanding && context.understanding.quality && context.understanding.quality.warnings || context.sourceIntake.warnings || [];
      addArtifact(draft, {
        artifactType: "explanation-record",
        payload: {
          explanationType: "package-scope-and-limitations",
          summary: limitations.length ? "Current Intelligence Package contains explicit Source/Understanding limitations." : "Current Intelligence Package is built from validated Repository evidence.",
          limitations: internal.clone(limitations),
          missingInformationInferenceAllowed: false
        },
        snapshotReferences: [context.canonicalSnapshot.snapshotId],
        status: limitations.length ? "Partial" : "Valid",
        limitations: limitations
      });
    }

    const receipt = state.lastValidationGateReceipt || null;
    const phase7 = state.lastConfidenceValidation || null;
    const versionValidation = state.lastVersionArchitectureValidation || null;
    addArtifact(draft, {
      artifactType: "artifact-validation",
      payload: {
        validationEvidenceReferences: [
          receipt ? { type: "validation-gate-receipt", receiptId: receipt.receiptId, receiptHash: receipt.receiptHash || null } : null,
          state.latestValidationEvidencePackageId ? { type: "validation-evidence-package", packageId: state.latestValidationEvidencePackageId } : null
        ].filter(Boolean),
        validationSummary: phase7 ? { id: phase7.id, status: phase7.status, valid: phase7.valid, passed: phase7.passed, failed: phase7.failed, total: phase7.total, health: phase7.health, androidRealDeviceValidation: internal.clone(phase7.androidRealDeviceValidation || null) } : null,
        datasetVersion: VERSION_MANIFEST.getDatasetVersion("phase7ConfidenceValidation"),
        releaseGate: typeof namespace.getReleaseStatus === "function" ? namespace.getReleaseStatus() : null,
        staticIntegrity: versionValidation ? { id: versionValidation.id, status: versionValidation.status, valid: versionValidation.valid, passed: versionValidation.passed, failed: versionValidation.failed, total: versionValidation.total, health: versionValidation.health, releaseGateAllowed: versionValidation.releaseGateAllowed } : null
      },
      status: phase7 && phase7.valid === true ? "Valid" : "Partial",
      validation: { status: phase7 && phase7.valid === true ? "Valid" : "Partial" },
      limitations: phase7 ? [] : ["Phase 7 Validation summary is unavailable in the current Runtime."]
    });

    draft.warnings = internal.unique(internal.asArray(context.sourceIntake.warnings).concat(context.understanding && context.understanding.quality && context.understanding.quality.warnings || []));
    draft.limitations = internal.clone(draft.warnings);
    return draft;
  }

  function manifestArtifactEntry(draft, artifact) {
    const location = draft.locations[artifact.artifactId];
    return {
      artifactId: artifact.artifactId,
      artifactType: artifact.artifactType,
      artifactVersion: artifact.artifactVersion,
      schemaVersion: artifact.schemaVersion,
      location: location,
      required: REQUIRED_TYPES.includes(artifact.artifactType),
      status: artifact.status,
      size: artifact.integrity.byteSize,
      hashAlgorithm: HASH_ALGORITHM,
      hash: artifact.integrity.hash
    };
  }

  function projectMetadata(context) {
    const projectRecord = internal.asArray(context.canonicalSnapshot.records).find(function find(record) { return record && record.recordType === "project"; });
    return {
      projectId: projectRecord && projectRecord.identity && projectRecord.identity.canonicalId || "project:current",
      projectName: projectRecord && projectRecord.identity && projectRecord.identity.name || "AIプロンプト生成Pro",
      projectVersion: projectRecord && projectRecord.source && projectRecord.source.sourceVersion || "unknown"
    };
  }

  function buildManifest(draft, context, validationSummary, handoff) {
    const now = internal.nowIso();
    const artifacts = draft.artifactOrder.map(function mapArtifact(id) { return manifestArtifactEntry(draft, draft.artifactsById[id]); });
    const manifest = {
      packageId: draft.packageId,
      packageVersion: PACKAGE_VERSION,
      manifestVersion: MANIFEST_VERSION,
      schemaVersion: VERSION_MANIFEST.getSchemaVersion(MANIFEST_SCHEMA_ID),
      status: "Frozen",
      qualityStatus: draft.limitations.length ? "Partial" : "Ready",
      project: projectMetadata(context),
      session: {
        sessionId: draft.sessionId,
        queryIds: context.typedQueries.map(function id(item) { return item.queryId; }),
        startedAt: context.session.createdAt || null,
        completedAt: context.session.frozenAt || context.session.updatedAt || now
      },
      snapshots: {
        canonicalSnapshotId: context.canonicalSnapshot.snapshotId,
        repositorySnapshotId: context.repositorySnapshot.snapshotId,
        relationshipGraphId: context.graph.graphId,
        understandingId: context.understanding && context.understanding.understandingId || null
      },
      artifacts: artifacts,
      engines: context.understanding ? internal.clone(context.understanding.engines || []) : [],
      rules: context.understanding ? internal.clone(context.understanding.rules || []) : [],
      adapters: internal.asArray(context.sourceIntake.adapterResults).map(function mapAdapter(item) { return { adapterId: item.adapterId, adapterVersion: item.adapterVersion || null, status: item.status }; }),
      models: [{ modelId: "IDE-170-CONFIDENCE-MODEL-DETERMINISTIC", version: "1.0.0" }],
      integrity: { hashAlgorithm: HASH_ALGORITHM, manifestHash: null, packageHash: null, status: "Pending" },
      validation: validationSummary || { status: "Pending", completionGate: "Pending", health: null },
      compatibility: {
        minimumIDE180Version: VERSION_MANIFEST.compatibility.minimumIDE180Version,
        handoffContractVersion: VERSION_MANIFEST.contractVersions.ide180Handoff,
        supportedConsumers: ["IDE-180"]
      },
      handoff: handoff ? { handoffId: handoff.handoffId, location: DEFAULT_LOCATIONS["ide180-handoff-contract"], status: handoff.status } : null,
      limitations: internal.clone(draft.limitations),
      warnings: internal.clone(draft.warnings),
      createdAt: draft.createdAt,
      validatedAt: now,
      frozenAt: now
    };
    manifest.integrity.manifestHash = sha256(manifestHashPayload(manifest));
    manifest.integrity.packageHash = calculatePackageHash(manifest.integrity.manifestHash, artifacts);
    manifest.integrity.status = "Valid";
    return internal.deepFreeze(manifest);
  }

  function buildPackageFromResolvedContext(context, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (!context || context.ok === false) return internal.buildResult(false, context && context.code || "PACKAGE_CONTEXT_INVALID", context && context.status || "Blocked", null, { error: { message: context && context.error || "Package context is invalid.", category: "Dependency Failure" } });
    try {
      const draft = buildDraftFromContext(context, settings);
      if (typeof namespace.buildIDE180HandoffContract !== "function" || typeof namespace.evaluateIntelligencePackageCompletionGate !== "function" || typeof namespace.validateIntelligencePackageDraft !== "function" || typeof namespace.validateIntelligencePackage !== "function") {
        return internal.buildResult(false, "PACKAGE_PHASE8_DEPENDENCY_MISSING", "Blocked", null, { error: { message: "Phase 8 Handoff/Validation modules are unavailable.", category: "Dependency Failure" } });
      }

      const handoffPreview = namespace.buildIDE180HandoffContract({
        packageId: draft.packageId,
        packageVersion: PACKAGE_VERSION,
        sessionId: draft.sessionId,
        artifacts: draft.artifactOrder.map(function mapArtifact(id) { return { artifact: draft.artifactsById[id], location: draft.locations[id] }; }),
        context: context,
        limitations: draft.limitations,
        warnings: draft.warnings
      }, { internalBuild: true });
      if (!handoffPreview || handoffPreview.ok !== true) return handoffPreview;
      addArtifact(draft, { artifactType: "ide180-handoff-contract", payload: handoffPreview.data.handoff, status: handoffPreview.data.handoff.status === "Ready" ? "Valid" : "Partial", limitations: handoffPreview.data.handoff.limitations }, DEFAULT_LOCATIONS["ide180-handoff-contract"]);

      const gatePreview = namespace.evaluateIntelligencePackageCompletionGate({ draft: draft, context: context, handoff: handoffPreview.data.handoff });
      addArtifact(draft, { artifactType: "completion-gate-result", payload: gatePreview, status: gatePreview.allowed === true ? "Valid" : "Blocked", validation: { status: gatePreview.allowed === true ? "Valid" : "Invalid" } }, DEFAULT_LOCATIONS["completion-gate-result"]);

      const draftValidation = namespace.validateIntelligencePackageDraft({ draft: draft, context: context, handoff: handoffPreview.data.handoff, completionGate: gatePreview });
      addArtifact(draft, { artifactType: "package-validation", payload: draftValidation, status: draftValidation.valid === true ? "Valid" : "Blocked", validation: { status: draftValidation.valid === true ? "Valid" : "Invalid" } }, DEFAULT_LOCATIONS["package-validation"]);

      const validationSummary = {
        status: draftValidation.valid === true && gatePreview.allowed === true ? "Valid" : "Invalid",
        completionGate: gatePreview.status,
        health: draftValidation.health
      };
      const manifest = buildManifest(draft, context, validationSummary, handoffPreview.data.handoff);
      const packageRecord = {
        packageId: draft.packageId,
        packageVersion: PACKAGE_VERSION,
        manifestVersion: MANIFEST_VERSION,
        manifest: manifest,
        artifacts: internal.clone(draft.artifactsById),
        artifactOrder: internal.clone(draft.artifactOrder),
        locations: internal.clone(draft.locations),
        status: "Frozen",
        quality: { status: draft.limitations.length ? "Partial" : "Ready", limitations: internal.clone(draft.limitations), warnings: internal.clone(draft.warnings) },
        completionGate: internal.clone(gatePreview),
        handoffId: handoffPreview.data.handoff.handoffId,
        createdAt: draft.createdAt,
        validatedAt: manifest.validatedAt,
        frozenAt: manifest.frozenAt,
        frozen: true,
        immutable: true
      };
      const finalValidation = namespace.validateIntelligencePackage(packageRecord);
      if (!finalValidation.valid) {
        state.lastPackageBuild = internal.clone({ ok: false, packageId: packageRecord.packageId, validation: finalValidation, builtAt: internal.nowIso() });
        return internal.buildResult(false, "INTELLIGENCE_PACKAGE_VALIDATION_BLOCKED", "Blocked", { package: packageRecord, validation: finalValidation }, { error: { message: "Final Intelligence Package validation failed.", category: "Validation Failure" } });
      }

      const frozen = internal.deepFreeze(packageRecord);
      draft.artifactOrder.forEach(function storeArtifact(id) { state.intelligenceArtifacts.set(id, draft.artifactsById[id]); });
      state.intelligencePackages.set(frozen.packageId, frozen);
      state.latestIntelligencePackageId = frozen.packageId;
      if (state.ide180Handoffs instanceof Map) {
        const storedHandoff = internal.deepFreeze(internal.clone(handoffPreview.data.handoff));
        state.ide180Handoffs.set(storedHandoff.handoffId, storedHandoff);
        state.latestIDE180HandoffId = storedHandoff.handoffId;
      }
      state.lastPackageBuild = internal.deepFreeze({ ok: true, packageId: frozen.packageId, packageHash: frozen.manifest.integrity.packageHash, validation: internal.clone(finalValidation), builtAt: internal.nowIso() });
      internal.touch();
      internal.appendAudit({
        action: "INTELLIGENCE_PACKAGE_FROZEN",
        actor: internal.text(settings.actor, "Project Owner"),
        targetType: "Intelligence Package",
        targetId: frozen.packageId,
        sessionId: frozen.manifest.session.sessionId,
        outcome: frozen.quality.status,
        detail: { packageHash: frozen.manifest.integrity.packageHash, artifactCount: frozen.artifactOrder.length, completionGate: frozen.completionGate.status, handoffId: frozen.handoffId }
      });
      return internal.buildResult(true, "INTELLIGENCE_PACKAGE_FROZEN", frozen.quality.status === "Partial" ? "Partial" : "Ready", { package: getIntelligencePackage(frozen.packageId), validation: finalValidation, handoff: handoffPreview.data.handoff }, { warnings: frozen.quality.warnings });
    } catch (error) {
      return internal.buildResult(false, "INTELLIGENCE_PACKAGE_BUILD_FAILED", "Failed", null, { error: { message: error && error.message ? error.message : String(error), category: "Package Failure" } });
    }
  }

  function buildIntelligencePackage(sessionId, options) {
    const context = resolveSessionContext(internal.text(sessionId, ""), options);
    if (!context.ok) return internal.buildResult(false, context.code, context.status, null, { error: { message: context.error, category: "Dependency Failure" } });
    return buildPackageFromResolvedContext(context, options);
  }

  function getIntelligencePackage(packageId) {
    return internal.clone(state.intelligencePackages.get(internal.text(packageId, "")) || null);
  }

  function listIntelligencePackages(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return [...state.intelligencePackages.values()].slice(-limit).map(function summary(item) {
      if (settings.details === true) return internal.clone(item);
      return {
        packageId: item.packageId,
        packageVersion: item.packageVersion,
        status: item.status,
        qualityStatus: item.quality && item.quality.status,
        artifactCount: item.artifactOrder.length,
        packageHash: item.manifest && item.manifest.integrity && item.manifest.integrity.packageHash,
        handoffId: item.handoffId,
        frozenAt: item.frozenAt
      };
    });
  }

  function getIntelligenceArtifact(artifactId) {
    return internal.clone(state.intelligenceArtifacts.get(internal.text(artifactId, "")) || null);
  }

  function removeIntelligencePackageForValidation(packageId) {
    const id = internal.text(packageId, "");
    const pkg = state.intelligencePackages.get(id);
    if (!pkg) return false;
    internal.asArray(pkg.artifactOrder).forEach(function removeArtifact(artifactId) { state.intelligenceArtifacts.delete(artifactId); });
    state.intelligencePackages.delete(id);
    if (state.latestIntelligencePackageId === id) {
      const remaining = [...state.intelligencePackages.keys()];
      state.latestIntelligencePackageId = remaining.length ? remaining[remaining.length - 1] : null;
    }
    internal.touch();
    return true;
  }

  function getPackageModelStatus() {
    const latest = state.latestIntelligencePackageId ? state.intelligencePackages.get(state.latestIntelligencePackageId) : null;
    return {
      id: "IDE-170-PACKAGE-MODEL-STATUS",
      version: MODULE_VERSION,
      capabilityVersion: CAPABILITY_VERSION,
      packageVersion: PACKAGE_VERSION,
      manifestVersion: MANIFEST_VERSION,
      status: namespace.getCapability && namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability && namespace.getCapability(CAPABILITY_ID)),
      artifactTypeCount: Object.keys(ARTIFACT_TYPES).length,
      requiredArtifactTypeCount: REQUIRED_TYPES.length,
      packageCount: state.intelligencePackages.size,
      artifactCount: state.intelligenceArtifacts.size,
      latestPackageId: state.latestIntelligencePackageId,
      latestPackageHash: latest && latest.manifest && latest.manifest.integrity && latest.manifest.integrity.packageHash || null,
      singleGiantJsonExportAllowed: false,
      repositoryMutationAllowed: false
    };
  }

  function initializePackageModel() {
    const schemas = registerSchemas();
    const capability = registerCapability();
    const ready = schemas.every(function all(item) { return item.registered === true; }) && capability.ok === true;
    namespace.modules.packageModel.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "PACKAGE_MODEL_INITIALIZED" : "PACKAGE_MODEL_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { schemas: schemas, capability: capability });
  }

  Object.assign(internal, {
    packageArtifactTypes: ARTIFACT_TYPES,
    packageRequiredArtifactTypes: REQUIRED_TYPES,
    packageDefaultLocations: DEFAULT_LOCATIONS,
    stableStringifyPackage: stableStringify,
    calculatePackageArtifactHash: function calculateArtifactHash(artifact) { return sha256(artifactHashPayload(artifact)); },
    manifestHashPayload: manifestHashPayload,
    calculateIntelligencePackageHash: calculatePackageHash,
    buildPackageFromResolvedContext: buildPackageFromResolvedContext,
    createTypedArtifact: createTypedArtifact,
    removeIntelligencePackageForValidation: removeIntelligencePackageForValidation
  });

  Object.assign(namespace.api, {
    initializePackageModel: initializePackageModel,
    buildIntelligencePackage: buildIntelligencePackage,
    buildPackage: buildIntelligencePackage,
    getIntelligencePackage: getIntelligencePackage,
    listIntelligencePackages: listIntelligencePackages,
    getIntelligenceArtifact: getIntelligenceArtifact,
    getPackageModelStatus: getPackageModelStatus,
    getIntelligenceArtifactType: artifactTypeInfo
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.packageModel = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    capabilityVersion: CAPABILITY_VERSION,
    status: "Loaded",
    immutablePackage: true,
    typedArtifacts: true,
    manifest: true,
    sha256Integrity: true,
    partialPackagePolicy: true,
    singleGiantJsonExportAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
