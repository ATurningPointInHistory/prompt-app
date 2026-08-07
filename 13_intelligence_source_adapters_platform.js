/* ============================================================
   FILE: 13_intelligence_source_adapters_platform.js
   IDE-170 Intelligence Platform
   Release: 1.6.1 / Module: 1.0.0
   Phase: 2 Source Intake - Platform Source Adapters
   Design Freeze: v1.0.0 / 2026-08-06
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Platform Source Adapters blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("IDE-170 sourceAdaptersPlatform blocked: Version Manifest is not loaded.");
    return;
  }
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("sourceAdaptersPlatform");
  const INTERNAL_MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const capabilityVersion = VERSION_MANIFEST.getCapabilityVersion;
  const schemaVersion = VERSION_MANIFEST.getSchemaVersion;
  const artifactVersion = VERSION_MANIFEST.getArtifactVersion;
  const datasetVersion = VERSION_MANIFEST.getDatasetVersion;
  const ADAPTER_IDS = Object.freeze({
    architecture: "IDE-170-ADAPTER-ARCHITECTURE",
    workflow: "IDE-170-ADAPTER-WORKFLOW"
  });

  function architectureAvailability() {
    return {
      available: typeof global.getArchitectureDatabase === "function" ||
        Boolean(global.architectureDatabase),
      status: typeof global.getArchitectureDatabase === "function" || global.architectureDatabase
        ? "Ready"
        : "Unavailable",
      reason: typeof global.getArchitectureDatabase === "function" || global.architectureDatabase
        ? ""
        : "Architecture Database API is unavailable."
    };
  }

  function readArchitecture() {
    const database = typeof global.getArchitectureDatabase === "function"
      ? global.getArchitectureDatabase()
      : global.architectureDatabase || { objects: {}, relationships: [] };
    const objects = database && database.objects && typeof database.objects === "object"
      ? database.objects
      : {};
    const relationships = Array.isArray(database && database.relationships)
      ? database.relationships
      : [];
    const records = Object.entries(objects).map(function mapObject(entry, index) {
      const key = entry[0];
      const object = internal.isPlainObject(entry[1]) ? entry[1] : {};
      const id = internal.text(object.id, key);
      const name = internal.text(object.title || object.name, id);
      return {
        recordType: "architecture-object",
        sourceType: "architecture-database",
        sourceId: id,
        sourceVersion: internal.text(object.version, database && database.version || ""),
        sourceUpdatedAt: internal.text(object.updatedAt, ""),
        identity: {
          sourceId: id,
          name: name,
          qualifiedName: internal.text(object.qualifiedName, id),
          aliases: internal.unique(object.aliases)
        },
        classification: {
          domain: "architecture",
          category: internal.text(object.category, "General"),
          subtype: internal.text(object.type, "Architecture Object"),
          lifecycle: internal.text(object.status, "Active")
        },
        payload: internal.clone(object),
        metadata: { databaseKey: key, originalIndex: index },
        quality: { missingFields: [], warnings: [], errors: [] }
      };
    });
    return {
      sourceVersion: internal.text(database && database.version, ""),
      status: "Ready",
      records: records,
      warnings: records.length ? [] : ["Architecture Database contains no objects."],
      metadata: {
        sourceApi: typeof global.getArchitectureDatabase === "function"
          ? "getArchitectureDatabase"
          : "architectureDatabase",
        relationshipRecordCount: relationships.length,
        relationshipIntakeDeferredToPhase4: true
      }
    };
  }

  function workflowNamespace() {
    return global.AIPromptOSIDE160 && global.AIPromptOSIDE160.api
      ? global.AIPromptOSIDE160
      : null;
  }

  function workflowAvailability() {
    const workflow = workflowNamespace();
    const api = workflow && workflow.api;
    const available = Boolean(api &&
      typeof api.listWorkflowPackages === "function" &&
      typeof api.listWorkflowBaselines === "function");
    return {
      available: available,
      status: available ? "Ready" : "Unavailable",
      reason: available ? "" : "IDE-160 Workflow Package/Baseline APIs are unavailable."
    };
  }

  function readWorkflow() {
    const workflow = workflowNamespace();
    const api = workflow && workflow.api;
    const packages = api && typeof api.listWorkflowPackages === "function"
      ? api.listWorkflowPackages()
      : [];
    const baselines = api && typeof api.listWorkflowBaselines === "function"
      ? api.listWorkflowBaselines()
      : [];
    const records = [];

    internal.asArray(packages).forEach(function mapPackage(packageValue, index) {
      const value = internal.isPlainObject(packageValue) ? packageValue : {};
      const id = internal.text(value.packageId, "workflow-package-" + (index + 1));
      records.push({
        recordType: "workflow-package",
        sourceType: "ide-160-workflow-package",
        sourceId: id,
        sourceVersion: internal.text(value.version || value.packageVersion, workflow.version || ""),
        sourceUpdatedAt: internal.text(value.generatedAt || value.completedAt, ""),
        identity: {
          sourceId: id,
          name: internal.text(value.name, id),
          qualifiedName: id,
          aliases: []
        },
        classification: {
          domain: "workflow",
          category: "workflow-package",
          subtype: internal.text(value.packageType, "IDE-160 Package"),
          lifecycle: internal.text(value.status, value.immutable === true ? "Frozen" : "Active")
        },
        payload: internal.clone(value),
        metadata: { originalIndex: index, handoffTarget: value.handoffTarget || null },
        quality: { missingFields: [], warnings: [], errors: [] }
      });
    });

    internal.asArray(baselines).forEach(function mapBaseline(baselineValue, index) {
      const value = internal.isPlainObject(baselineValue) ? baselineValue : {};
      const id = internal.text(value.baselineId, "workflow-baseline-" + (index + 1));
      records.push({
        recordType: "workflow-baseline",
        sourceType: "ide-160-workflow-baseline",
        sourceId: id,
        sourceVersion: internal.text(value.version || value.baselineVersion, workflow.version || ""),
        sourceUpdatedAt: internal.text(value.createdAt || value.completedAt, ""),
        identity: {
          sourceId: id,
          name: id,
          qualifiedName: id,
          aliases: []
        },
        classification: {
          domain: "workflow",
          category: "workflow-baseline",
          subtype: "IDE-160 Baseline",
          lifecycle: internal.text(value.status, value.immutable === true ? "Frozen" : "Active")
        },
        payload: internal.clone(value),
        metadata: { originalIndex: index },
        quality: { missingFields: [], warnings: [], errors: [] }
      });
    });

    return {
      sourceVersion: internal.text(workflow && workflow.version, ""),
      status: "Ready",
      records: records,
      warnings: records.length ? [] : ["IDE-160 contains no Workflow Package or Baseline records."],
      metadata: {
        packageCount: internal.asArray(packages).length,
        baselineCount: internal.asArray(baselines).length,
        sourceApi: "AIPromptOSIDE160.api"
      }
    };
  }

  function definitions() {
    return [
      {
        adapterId: ADAPTER_IDS.architecture,
        capabilityId: ADAPTER_IDS.architecture,
        name: "Architecture Database Source Adapter",
        version: capabilityVersion(ADAPTER_IDS.architecture),
        status: "Official",
        sourceType: "architecture-database",
        recordTypes: ["architecture-object"],
        domains: ["architecture"],
        required: false,
        priority: 50,
        description: "Reads Architecture Objects; Relationship graph conversion is deferred to Phase 4.",
        limitations: ["Architecture Relationships are recorded as intake metadata until Evidence Graph Phase."],
        isAvailable: architectureAvailability,
        read: readArchitecture
      },
      {
        adapterId: ADAPTER_IDS.workflow,
        capabilityId: ADAPTER_IDS.workflow,
        name: "IDE-160 Workflow Source Adapter",
        version: capabilityVersion(ADAPTER_IDS.workflow),
        status: "Official",
        sourceType: "ide-160-workflow",
        recordTypes: ["workflow-package", "workflow-baseline"],
        domains: ["workflow"],
        required: false,
        priority: 60,
        description: "Reads immutable IDE-160 Workflow Packages and Workflow Baselines.",
        limitations: ["The Adapter never executes or modifies IDE-160 Workflows."],
        isAvailable: workflowAvailability,
        read: readWorkflow
      }
    ];
  }

  function initializePlatformSourceAdapters() {
    const results = definitions().map(function register(definition) {
      const existing = namespace.getSourceAdapter(definition.adapterId);
      if (existing) return { adapterId: definition.adapterId, registered: true, existing: true };
      const result = namespace.registerSourceAdapter(definition);
      return { adapterId: definition.adapterId, registered: result.ok === true, code: result.code };
    });
    const failed = results.filter(function failure(item) { return item.registered !== true; });
    return internal.buildResult(failed.length === 0,
      failed.length ? "PLATFORM_SOURCE_ADAPTERS_INITIALIZATION_FAILED" : "PLATFORM_SOURCE_ADAPTERS_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      { results: results, adapterCount: definitions().length },
      failed.length ? {
        error: { message: "One or more Platform Source Adapters could not be registered.", category: "Initialization Failure" }
      } : {});
  }

  Object.assign(namespace.api, {
    initializePlatformSourceAdapters: initializePlatformSourceAdapters
  });

  namespace.modules.platformSourceAdapters = {
    id: "IDE-170-PLATFORM-SOURCE-ADAPTERS",
    version: MODULE_VERSION,
    status: "Ready",
    adapterIds: Object.values(ADAPTER_IDS),
    workflowExecutionAllowed: false,
    architectureMutationAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.initializeIntelligencePlatformSourceAdapters = initializePlatformSourceAdapters;
})(typeof window !== "undefined" ? window : globalThis);
