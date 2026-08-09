/* ============================================================
   FILE: 13_intelligence_ide180_handoff.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 8: IDE-180 Typed Handoff Contract
   Architecture Decision: IDE-170-009
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("ide180Handoff");
  const CAPABILITY_ID = "IDE-170-IDE180-HANDOFF";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const SCHEMA_ID = "IDE-170-SCHEMA-IDE180-HANDOFF";
  const CONTRACT_VERSION = VERSION_MANIFEST.contractVersions.ide180Handoff;

  if (!(state.ide180Handoffs instanceof Map)) state.ide180Handoffs = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestIDE180HandoffId")) state.latestIDE180HandoffId = null;

  const CAPABILITY_REQUIREMENTS = Object.freeze({
    "entity-navigation": ["canonical-snapshot"],
    "file-navigation": ["canonical-snapshot"],
    "function-navigation": ["canonical-snapshot"],
    "module-navigation": ["canonical-snapshot"],
    "architecture-navigation": ["canonical-snapshot"],
    "knowledge-navigation": ["canonical-snapshot"],
    "relationship-navigation": ["fact-relationship-graph"],
    "dependency-trace": ["fact-relationship-graph"],
    "reverse-dependency-trace": ["fact-relationship-graph"],
    "workflow-trace": ["workflow-understanding"],
    "decision-trace": ["workflow-understanding"],
    "validation-trace": ["artifact-validation"],
    "evidence-trace": ["evidence-index"],
    "insight-navigation": ["repository-insight"],
    "confidence-explanation": ["confidence-result", "explanation-record"],
    "snapshot-comparison": ["canonical-snapshot", "repository-baseline"],
    "change-history-navigation": ["change-understanding"]
  });

  function artifactList(packageLike) {
    if (!packageLike) return [];
    if (Array.isArray(packageLike.artifacts)) return packageLike.artifacts.map(function normalize(item) {
      if (item && item.artifact) return { artifact: item.artifact, location: item.location || "" };
      return { artifact: item, location: "" };
    });
    if (packageLike.artifacts && typeof packageLike.artifacts === "object") {
      return internal.asArray(packageLike.artifactOrder).map(function map(id) {
        return { artifact: packageLike.artifacts[id], location: packageLike.locations && packageLike.locations[id] || "" };
      }).filter(function keep(item) { return Boolean(item.artifact); });
    }
    return [];
  }

  function typesAndLocations(packageLike) {
    const map = new Map();
    artifactList(packageLike).forEach(function index(item) {
      if (!item.artifact) return;
      if (!map.has(item.artifact.artifactType)) map.set(item.artifact.artifactType, []);
      map.get(item.artifact.artifactType).push(item);
    });
    return map;
  }

  function canonicalCounts(packageLike) {
    const map = typesAndLocations(packageLike);
    const canonical = map.get("canonical-snapshot");
    const artifact = canonical && canonical[0] && canonical[0].artifact;
    const payload = artifact && artifact.payload;
    const counts = payload && payload.summary && payload.summary.recordTypeCounts || {};
    const domains = payload && payload.summary && payload.summary.domainCounts || {};
    return { recordTypeCounts: internal.clone(counts), domainCounts: internal.clone(domains) };
  }

  function graphRelationshipTypes(packageLike) {
    const map = typesAndLocations(packageLike);
    const graph = map.get("fact-relationship-graph");
    const artifact = graph && graph[0] && graph[0].artifact;
    const edges = internal.asArray(artifact && artifact.payload && artifact.payload.factEdges);
    return new Set(edges.map(function type(edge) { return String(edge && edge.relationshipType || "").toLowerCase(); }).filter(Boolean));
  }

  function hasTypes(map, types) {
    return internal.asArray(types).every(function has(type) { return map.has(type) && map.get(type).length > 0; });
  }

  function deriveAvailableCapabilities(packageLike) {
    const map = typesAndLocations(packageLike);
    const counts = canonicalCounts(packageLike);
    const relationships = graphRelationshipTypes(packageLike);
    const available = [];
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["entity-navigation"])) available.push("entity-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["file-navigation"]) && Number(counts.recordTypeCounts.file || 0) > 0) available.push("file-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["function-navigation"]) && Number(counts.recordTypeCounts.function || 0) > 0) available.push("function-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["module-navigation"]) && Number(counts.recordTypeCounts.module || 0) > 0) available.push("module-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["architecture-navigation"]) && Number(counts.domainCounts.architecture || 0) > 0) available.push("architecture-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["knowledge-navigation"]) && (Number(counts.recordTypeCounts["knowledge-record"] || 0) > 0 || Number(counts.recordTypeCounts.memo || 0) > 0 || Number(counts.domainCounts.knowledge || 0) > 0)) available.push("knowledge-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["relationship-navigation"])) available.push("relationship-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["dependency-trace"]) && [...relationships].some(function match(type) { return /calls|depends|imports|uses|defines/.test(type); })) available.push("dependency-trace", "reverse-dependency-trace");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["workflow-trace"])) available.push("workflow-trace");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["decision-trace"])) {
      const workflow = map.get("workflow-understanding")[0].artifact;
      if (/decision|approval/i.test(JSON.stringify(workflow.payload || {}))) available.push("decision-trace");
    }
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["validation-trace"])) available.push("validation-trace");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["evidence-trace"])) available.push("evidence-trace");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["insight-navigation"])) available.push("insight-navigation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["confidence-explanation"])) available.push("confidence-explanation");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["snapshot-comparison"])) available.push("snapshot-comparison");
    if (hasTypes(map, CAPABILITY_REQUIREMENTS["change-history-navigation"])) available.push("change-history-navigation");
    return internal.unique(available);
  }

  function entryPointFor(map, type, fallback) {
    const items = map.get(type);
    return items && items[0] ? items[0].location || fallback : null;
  }

  function buildIDE180HandoffContract(packageLike, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (!packageLike || !packageLike.packageId) return internal.buildResult(false, "IDE180_HANDOFF_PACKAGE_REQUIRED", "Blocked", null, { error: { message: "Package identity is required for IDE-180 Handoff.", category: "Input Failure" } });
    const map = typesAndLocations(packageLike);
    const available = deriveAvailableCapabilities(packageLike);
    const limitations = internal.unique(internal.asArray(packageLike.limitations).concat(packageLike.quality && packageLike.quality.limitations || []));
    const warnings = internal.unique(internal.asArray(packageLike.warnings).concat(packageLike.quality && packageLike.quality.warnings || []));
    const now = internal.nowIso();
    const handoff = {
      handoffId: internal.text(settings.handoffId, internal.nextId("IDE-170-TO-IDE-180")),
      contractVersion: CONTRACT_VERSION,
      packageId: packageLike.packageId,
      packageVersion: packageLike.packageVersion || VERSION_MANIFEST.contractVersions.intelligencePackage,
      status: hasTypes(map, ["source-intake-summary", "canonical-snapshot", "repository-baseline", "fact-relationship-graph"]) ? "Ready" : "Blocked",
      consumer: { componentId: "IDE-180", minimumVersion: VERSION_MANIFEST.compatibility.minimumIDE180Version },
      availableCapabilities: available,
      entryPoints: {
        manifest: "package_manifest.json",
        repository: entryPointFor(map, "repository-understanding", null),
        workflow: entryPointFor(map, "workflow-understanding", null),
        insights: map.has("repository-insight") ? "insights/" : null,
        evidence: map.has("evidence-index") || map.has("evidence-record") ? "evidence/" : null,
        queries: map.has("typed-query") || map.has("query-result") ? "queries/" : null,
        canonicalSnapshot: entryPointFor(map, "canonical-snapshot", "snapshots/canonical_snapshot.json"),
        repositorySnapshot: entryPointFor(map, "repository-baseline", "snapshots/repository_baseline.json"),
        relationships: entryPointFor(map, "fact-relationship-graph", "relationships/fact_graph.json")
      },
      limitations: limitations,
      warnings: warnings,
      validation: { status: "Valid", gate: "Allowed" },
      policy: {
        packageMutationAllowed: false,
        factMutationAllowed: false,
        insightFactPromotionAllowed: false,
        confidenceRecalculationAllowed: false,
        validationMutationAllowed: false,
        evidenceDeletionAllowed: false,
        repositoryMutationAllowed: false,
        workflowAutoExecutionAllowed: false
      },
      loadingModel: ["Package Manifest", "Handoff Contract", "Compatibility Validation", "Entry Point Selection", "Lazy Artifact Load", "Artifact Validation", "Navigation"],
      createdAt: now,
      frozenAt: now,
      frozen: true,
      immutable: true
    };
    const validation = validateIDE180HandoffContract(handoff, packageLike);
    if (!validation.valid) return internal.buildResult(false, "IDE180_HANDOFF_INVALID", "Blocked", { handoff: handoff, validation: validation }, { error: { message: "IDE-180 Handoff failed validation.", category: "Validation Failure" } });
    if (settings.internalBuild !== true) {
      const frozen = internal.deepFreeze(internal.clone(handoff));
      state.ide180Handoffs.set(frozen.handoffId, frozen);
      state.latestIDE180HandoffId = frozen.handoffId;
      internal.touch();
    }
    return internal.buildResult(true, "IDE180_HANDOFF_READY", handoff.status, { handoff: internal.clone(handoff), validation: validation }, { warnings: warnings });
  }

  function validateIDE180HandoffContract(handoff, packageLike) {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) }); }
    check("Handoff exists", Boolean(handoff), handoff && handoff.handoffId);
    if (handoff) {
      check("Handoff ID is present", Boolean(handoff.handoffId), handoff.handoffId);
      check("Contract Version matches", handoff.contractVersion === CONTRACT_VERSION, handoff.contractVersion);
      check("Package ID matches", !packageLike || handoff.packageId === packageLike.packageId, handoff.packageId);
      check("Consumer is IDE-180", handoff.consumer && handoff.consumer.componentId === "IDE-180", handoff.consumer && handoff.consumer.componentId);
      check("Minimum IDE-180 Version is declared", handoff.consumer && Boolean(handoff.consumer.minimumVersion), handoff.consumer && handoff.consumer.minimumVersion);
      check("Manifest Entry Point is present", handoff.entryPoints && handoff.entryPoints.manifest === "package_manifest.json", handoff.entryPoints && handoff.entryPoints.manifest);
      check("Package mutation is prohibited", handoff.policy && handoff.policy.packageMutationAllowed === false, handoff.policy && handoff.policy.packageMutationAllowed);
      check("Repository mutation is prohibited", handoff.policy && handoff.policy.repositoryMutationAllowed === false, handoff.policy && handoff.policy.repositoryMutationAllowed);
      const derived = packageLike ? deriveAvailableCapabilities(packageLike) : internal.asArray(handoff.availableCapabilities);
      const overclaimed = internal.asArray(handoff.availableCapabilities).filter(function unsupported(cap) { return !derived.includes(cap); });
      check("Available Capabilities are Artifact-backed", overclaimed.length === 0, overclaimed.join(","));
      check("Handoff is Frozen", handoff.frozen === true && handoff.immutable === true && Boolean(handoff.frozenAt), handoff.frozenAt);
      if (typeof namespace.validateAgainstSchema === "function") {
        const schema = namespace.validateAgainstSchema(SCHEMA_ID, handoff);
        check("Handoff Schema validates", schema.valid === true, "errors=" + internal.asArray(schema.errors).length);
      }
    }
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return { id: internal.nextId("IDE-170-HANDOFF-VALIDATION"), valid: failed === 0, status: failed === 0 ? "Valid" : "Invalid", passed: passed, failed: failed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null, checks: checks, validatedAt: internal.nowIso() };
  }

  function getIDE180Handoff(handoffId) {
    return internal.clone(state.ide180Handoffs.get(internal.text(handoffId, "")) || null);
  }

  function getIDE180HandoffStatus() {
    const latest = state.latestIDE180HandoffId ? state.ide180Handoffs.get(state.latestIDE180HandoffId) : null;
    return {
      id: "IDE-170-IDE180-HANDOFF-STATUS",
      version: MODULE_VERSION,
      capabilityVersion: CAPABILITY_VERSION,
      contractVersion: CONTRACT_VERSION,
      status: namespace.getCapability && namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability && namespace.getCapability(CAPABILITY_ID)),
      handoffCount: state.ide180Handoffs.size,
      latestHandoffId: state.latestIDE180HandoffId,
      latestHandoffStatus: latest && latest.status || null,
      consumer: "IDE-180",
      minimumConsumerVersion: VERSION_MANIFEST.compatibility.minimumIDE180Version,
      mutationAllowed: false
    };
  }

  function registerSchema() {
    const version = VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID);
    const existing = namespace.getSchema && namespace.getSchema(SCHEMA_ID);
    if (existing && existing.version === version) return { registered: true, existing: true };
    if (existing && internal.removeSchemaForValidation) internal.removeSchemaForValidation(SCHEMA_ID);
    const result = namespace.registerSchema({
      schemaId: SCHEMA_ID,
      name: "IDE-180 Handoff Contract",
      version: version,
      type: "object",
      required: ["handoffId", "contractVersion", "packageId", "status", "consumer", "availableCapabilities", "entryPoints", "limitations", "warnings", "validation", "policy", "createdAt", "frozenAt", "frozen", "immutable"],
      properties: {
        handoffId: { type: "string" }, contractVersion: { type: "string" }, packageId: { type: "string" }, status: { type: "string" },
        consumer: { type: "object" }, availableCapabilities: { type: "array" }, entryPoints: { type: "object" }, limitations: { type: "array" }, warnings: { type: "array" },
        validation: { type: "object" }, policy: { type: "object" }, createdAt: { type: "string" }, frozenAt: { type: "string" }, frozen: { type: "boolean" }, immutable: { type: "boolean" }
      },
      additionalProperties: true, owner: "IDE-170", source: "Architecture Decision 009"
    });
    return { registered: result.ok === true, code: result.code };
  }

  function registerCapability() {
    const existing = namespace.getCapability && namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === CAPABILITY_VERSION) return internal.buildResult(true, "IDE180_HANDOFF_CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "IDE-180 Handoff Provider",
      version: CAPABILITY_VERSION,
      type: "Integration",
      status: "Active",
      owner: "IDE-170",
      dependencies: [{ capabilityId: "IDE-170-INTELLIGENCE-PACKAGE", minimumVersion: MINIMUM_VERSION, optional: false }],
      schemas: [SCHEMA_ID],
      provides: ["IDE-180 Handoff Contract", "Consumer Compatibility", "Artifact-backed Capability Declaration", "Lazy Entry Points"],
      source: "Architecture Decision 009"
    });
  }

  function initializeIDE180Handoff() {
    const schema = registerSchema();
    const capability = registerCapability();
    const ready = schema.registered === true && capability.ok === true;
    namespace.modules.ide180Handoff.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "IDE180_HANDOFF_INITIALIZED" : "IDE180_HANDOFF_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { schema: schema, capability: capability });
  }

  Object.assign(namespace.api, {
    initializeIDE180Handoff: initializeIDE180Handoff,
    buildIDE180HandoffContract: buildIDE180HandoffContract,
    getIDE180Handoff: getIDE180Handoff,
    validateIDE180HandoffContract: validateIDE180HandoffContract,
    getIDE180HandoffStatus: getIDE180HandoffStatus,
    deriveIDE180AvailableCapabilities: deriveAvailableCapabilities
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.ide180Handoff = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    capabilityVersion: CAPABILITY_VERSION,
    status: "Loaded",
    consumer: "IDE-180",
    typedContract: true,
    artifactBackedCapabilitiesOnly: true,
    lazyLoadingModel: true,
    mutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
