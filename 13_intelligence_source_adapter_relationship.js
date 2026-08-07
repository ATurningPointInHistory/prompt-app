/* ============================================================
   FILE: 13_intelligence_source_adapter_relationship.js
   IDE-170 Intelligence Platform
   Release: 1.6.1 / Module: 1.0.0
   Phase: 4 Evidence Graph - Official Relationship Source Adapter
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Relationship Source Adapter blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("IDE-170 sourceAdapterRelationship blocked: Version Manifest is not loaded.");
    return;
  }
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("sourceAdapterRelationship");
  const INTERNAL_MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const capabilityVersion = VERSION_MANIFEST.getCapabilityVersion;
  const schemaVersion = VERSION_MANIFEST.getSchemaVersion;
  const artifactVersion = VERSION_MANIFEST.getArtifactVersion;
  const datasetVersion = VERSION_MANIFEST.getDatasetVersion;
  const ADAPTER_ID = "IDE-170-ADAPTER-RELATIONSHIP";

  function normalizeType(value) {
    const source = internal.text(value, "");
    const map = {
      RelatedTo: "related-to",
      Contains: "contains",
      Defines: "defines",
      Calls: "calls",
      DependsOn: "depends-on",
      BelongsToLayer: "belongs-to-layer",
      Implements: "implements",
      Validates: "validates",
      Changes: "changes",
      Modifies: "modifies",
      Supersedes: "supersedes"
    };
    if (map[source]) return map[source];
    return source.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[ _]+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();
  }

  function getArchitectureDatabaseValue() {
    if (typeof global.getArchitectureDatabase === "function") {
      try { return global.getArchitectureDatabase(); } catch (_) { return null; }
    }
    return global.architectureDatabase && typeof global.architectureDatabase === "object"
      ? global.architectureDatabase
      : null;
  }

  function availability() {
    const database = getArchitectureDatabaseValue();
    const available = Boolean(database && Array.isArray(database.relationships));
    return {
      available: available,
      status: available ? "Ready" : "Unavailable",
      reason: available ? "" : "Architecture Relationship source is unavailable."
    };
  }

  function read() {
    const database = getArchitectureDatabaseValue() || { relationships: [] };
    const relationships = Array.isArray(database.relationships) ? database.relationships : [];
    const records = relationships.map(function mapRelationship(rel, index) {
      const value = internal.isPlainObject(rel) ? rel : {};
      const sourceId = internal.text(value.source || value.sourceId || value.from, "");
      const targetId = internal.text(value.target || value.targetId || value.to, "");
      const relationshipType = normalizeType(value.type || value.relationshipType);
      const id = internal.text(value.id, "architecture-relationship:" + sourceId + ":" + relationshipType + ":" + targetId + ":" + index);
      return {
        recordType: "relationship",
        sourceType: "architecture-relationship-database",
        sourceId: id,
        sourceVersion: internal.text(value.version, database.version || ""),
        sourceUpdatedAt: internal.text(value.updatedAt || value.createdAt, ""),
        identity: {
          sourceId: id,
          name: relationshipType || "unknown-relationship",
          qualifiedName: sourceId + " -> " + relationshipType + " -> " + targetId,
          aliases: []
        },
        classification: {
          domain: "architecture",
          category: "relationship",
          subtype: relationshipType || "unknown",
          lifecycle: internal.text(value.status, "Active")
        },
        payload: {
          sourceId: sourceId,
          targetId: targetId,
          relationshipType: relationshipType,
          direction: internal.text(value.direction, "directed"),
          reason: internal.text(value.reason || value.description, ""),
          original: internal.clone(value)
        },
        metadata: { originalIndex: index },
        quality: {
          missingFields: [
            !sourceId ? "payload.sourceId" : "",
            !targetId ? "payload.targetId" : "",
            !relationshipType ? "payload.relationshipType" : ""
          ].filter(Boolean),
          warnings: relationshipType === "related-to"
            ? ["Generic related-to is not promoted unless formally registered."]
            : [],
          errors: []
        }
      };
    });
    return {
      sourceVersion: internal.text(database.version, ""),
      status: "Ready",
      records: records,
      warnings: records.length ? [] : ["Architecture Relationship Database contains no records."],
      metadata: { relationshipCount: records.length, sourceApi: typeof global.getArchitectureDatabase === "function" ? "getArchitectureDatabase" : "architectureDatabase" }
    };
  }

  function initializeRelationshipSourceAdapter() {
    const existing = namespace.getSourceAdapter(ADAPTER_ID);
    if (existing && existing.version === capabilityVersion(ADAPTER_ID)) {
      return internal.buildResult(true, "RELATIONSHIP_SOURCE_ADAPTER_EXISTS", "Ready", { adapter: existing });
    }
    if (existing && typeof internal.removeSourceAdapterForValidation === "function") {
      internal.removeSourceAdapterForValidation(ADAPTER_ID);
      if (typeof internal.removeCapabilityForValidation === "function") internal.removeCapabilityForValidation(ADAPTER_ID);
    }
    return namespace.registerSourceAdapter({
      adapterId: ADAPTER_ID,
      capabilityId: ADAPTER_ID,
      name: "Official Relationship Source Adapter",
      version: capabilityVersion(ADAPTER_ID),
      status: "Official",
      sourceType: "relationship-data",
      recordTypes: ["relationship"],
      domains: ["architecture", "repository", "workflow", "quality", "change"],
      required: false,
      priority: 70,
      description: "Reads official Relationship records without modifying their Source.",
      limitations: ["Generic or unregistered Relationship Types remain excluded from the Fact Graph."],
      isAvailable: availability,
      read: read
    });
  }

  Object.assign(namespace.api, { initializeRelationshipSourceAdapter: initializeRelationshipSourceAdapter });
  namespace.modules.relationshipSourceAdapter = {
    id: ADAPTER_ID,
    version: MODULE_VERSION,
    status: "Ready",
    readOnly: true,
    factPromotionAutomatic: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
