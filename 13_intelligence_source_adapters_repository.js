/* ============================================================
   FILE: 13_intelligence_source_adapters_repository.js
   IDE-170 Intelligence Platform
   Version: 1.4.0
   Phase: 2 Source Intake - Repository Source Adapters
   Design Freeze: v1.0.0 / 2026-08-06
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Repository Source Adapters blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const VERSION = "1.4.0";
  const ADAPTER_IDS = Object.freeze({
    repository: "IDE-170-ADAPTER-REPOSITORY",
    project: "IDE-170-ADAPTER-PROJECT",
    functions: "IDE-170-ADAPTER-FUNCTION",
    modules: "IDE-170-ADAPTER-MODULE"
  });

  function fileType(path) {
    const name = internal.text(path, "").toLowerCase();
    const match = name.match(/\.([a-z0-9]+)$/i);
    return match ? match[1] : "unknown";
  }

  function normalizePath(value) {
    let path = internal.text(value, "").replace(/\\/g, "/");
    path = path.replace(/^\.\//, "").replace(/^\/+/, "");
    return path || "unknown";
  }

  function getLoadedProjectFiles() {
    if (typeof global.getProjectFiles === "function") {
      const files = global.getProjectFiles();
      if (Array.isArray(files)) return files;
    }
    if (typeof global.getRepairSearchFiles === "function") {
      const files = global.getRepairSearchFiles();
      if (Array.isArray(files)) return files;
    }
    if (global.repairSearchFileStore && typeof global.repairSearchFileStore === "object") {
      return Object.values(global.repairSearchFileStore);
    }
    return [];
  }

  function getProjectDatabase() {
    return global.projectDatabase && typeof global.projectDatabase === "object"
      ? global.projectDatabase
      : null;
  }

  function getFunctionDatabaseSource() {
    if (typeof global.getFunctionDatabase === "function") {
      const value = global.getFunctionDatabase();
      if (value && typeof value === "object") return value;
    }
    if (global.projectFunctionDatabase && typeof global.projectFunctionDatabase === "object") {
      return global.projectFunctionDatabase;
    }
    const database = getProjectDatabase();
    return database && database.functions && typeof database.functions === "object"
      ? database.functions
      : {};
  }

  function repositoryAvailability() {
    return {
      available: typeof global.getProjectFiles === "function" ||
        typeof global.getRepairSearchFiles === "function" ||
        Boolean(global.repairSearchFileStore),
      status: "Ready",
      reason: ""
    };
  }

  function readRepository(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const includeContent = settings.includeContent !== false;
    const files = getLoadedProjectFiles();
    const records = files.map(function mapFile(file, index) {
      const path = normalizePath(file.path || file.fileName || file.name || ("file-" + (index + 1)));
      const content = internal.text(file.code || file.text || file.content || file.value, "");
      const updatedAt = file.updatedAt || file.modifiedAt || null;
      const payload = {
        path: path,
        fileName: path.split("/").pop(),
        fileType: fileType(path),
        lineCount: content ? content.split(/\r?\n/).length : Number(file.lineCount) || 0,
        charCount: content.length || Number(file.charCount) || 0,
        source: internal.text(file.source, "current-project"),
        fetchPath: internal.text(file.fetchPath, ""),
        contentAvailable: Boolean(content)
      };
      if (includeContent) payload.content = content;
      return {
        recordType: "file",
        sourceType: "repository-file-data",
        sourceId: path,
        sourceVersion: internal.text(file.version, ""),
        sourceUpdatedAt: updatedAt ? String(updatedAt) : "",
        identity: {
          sourceId: path,
          name: payload.fileName,
          qualifiedName: path,
          aliases: []
        },
        classification: {
          domain: "repository",
          category: "file",
          subtype: payload.fileType,
          lifecycle: internal.text(file.status, "Active")
        },
        payload: payload,
        metadata: {
          originalIndex: index,
          existingKeys: Object.keys(file || {}).sort()
        },
        quality: {
          missingFields: content ? [] : ["payload.content"],
          warnings: content ? [] : ["File content is not loaded."],
          errors: []
        }
      };
    });
    return {
      sourceVersion: internal.text(getProjectDatabase() && getProjectDatabase().version, ""),
      status: records.length ? "Ready" : "Partial",
      records: records,
      warnings: records.length ? [] : ["No current Project file is loaded."],
      metadata: {
        sourceApi: typeof global.getProjectFiles === "function"
          ? "getProjectFiles"
          : typeof global.getRepairSearchFiles === "function"
            ? "getRepairSearchFiles"
            : "repairSearchFileStore",
        includeContent: includeContent
      }
    };
  }

  function projectAvailability() {
    return {
      available: typeof global.buildCurrentProjectInfo === "function" ||
        Boolean(global.PROJECT_INFO) || Boolean(getProjectDatabase()),
      status: "Ready"
    };
  }

  function readProject() {
    let projectInfo = null;
    let sourceApi = "";
    if (typeof global.buildCurrentProjectInfo === "function") {
      projectInfo = global.buildCurrentProjectInfo();
      sourceApi = "buildCurrentProjectInfo";
    } else if (global.PROJECT_INFO && typeof global.PROJECT_INFO === "object") {
      projectInfo = internal.clone(global.PROJECT_INFO);
      sourceApi = "PROJECT_INFO";
    } else {
      const database = getProjectDatabase();
      projectInfo = database ? {
        app: "AIプロンプト生成Pro",
        version: database.version,
        analyzedAt: database.analyzedAt,
        sourceMode: database.sourceMode,
        files: Object.keys(database.files || {})
      } : {};
      sourceApi = "projectDatabase";
    }
    const name = internal.text(projectInfo.name || projectInfo.app, "AIプロンプト生成Pro");
    return {
      sourceVersion: internal.text(projectInfo.version, ""),
      status: name ? "Ready" : "Partial",
      records: [{
        recordType: "project",
        sourceType: "project-database",
        sourceId: internal.text(projectInfo.id, "project:ai-prompt-os"),
        sourceVersion: internal.text(projectInfo.version, ""),
        sourceUpdatedAt: internal.text(projectInfo.updatedAt || projectInfo.createdAt, ""),
        identity: {
          sourceId: internal.text(projectInfo.id, "project:ai-prompt-os"),
          name: name,
          qualifiedName: "AI Prompt OS / " + name,
          aliases: ["AI Prompt OS", "AIプロンプト生成Pro"]
        },
        classification: {
          domain: "repository",
          category: "project",
          subtype: internal.text(projectInfo.type, "application"),
          lifecycle: internal.text(projectInfo.status, "Active")
        },
        payload: internal.clone(projectInfo),
        metadata: { sourceApi: sourceApi },
        quality: { missingFields: [], warnings: [], errors: [] }
      }],
      metadata: { sourceApi: sourceApi }
    };
  }

  function functionAvailability() {
    return {
      available: typeof global.getFunctionDatabase === "function" ||
        Boolean(global.projectFunctionDatabase) || Boolean(getProjectDatabase()),
      status: "Ready"
    };
  }

  function readFunctions() {
    const database = getFunctionDatabaseSource();
    const entries = Array.isArray(database)
      ? database.map(function arrayEntry(value, index) { return [String(index), value]; })
      : Object.entries(database || {});
    const records = entries.map(function mapFunction(entry, index) {
      const key = entry[0];
      const fn = internal.isPlainObject(entry[1]) ? entry[1] : {};
      const name = internal.text(fn.name || fn.functionName || key, "unknown");
      const fileName = normalizePath(fn.fileName || fn.file || fn.definedFile || "unknown");
      const qualifiedName = internal.text(fn.qualifiedName, fileName + "::" + name);
      return {
        recordType: "function",
        sourceType: "function-database",
        sourceId: internal.text(fn.id, qualifiedName),
        sourceVersion: internal.text(fn.version, ""),
        sourceUpdatedAt: internal.text(fn.updatedAt, ""),
        identity: {
          sourceId: internal.text(fn.id, qualifiedName),
          name: name,
          qualifiedName: qualifiedName,
          aliases: internal.unique(fn.aliases)
        },
        classification: {
          domain: "repository",
          category: "function",
          subtype: internal.text(fn.type || fn.functionType, "function"),
          lifecycle: internal.text(fn.status, "Active")
        },
        payload: Object.assign({
          functionName: name,
          fileName: fileName,
          qualifiedName: qualifiedName
        }, internal.clone(fn)),
        metadata: { databaseKey: key, originalIndex: index },
        quality: {
          missingFields: fileName === "unknown" ? ["payload.fileName"] : [],
          warnings: fileName === "unknown" ? ["Function definition file is unavailable."] : [],
          errors: []
        }
      };
    });
    return {
      sourceVersion: internal.text(getProjectDatabase() && getProjectDatabase().version, ""),
      status: records.length ? "Ready" : "Partial",
      records: records,
      warnings: records.length ? [] : ["Function Database contains no records."],
      metadata: { sourceApi: typeof global.getFunctionDatabase === "function" ? "getFunctionDatabase" : "window database" }
    };
  }

  function moduleAvailability() {
    const database = getProjectDatabase();
    return {
      available: Boolean(database && database.modules && typeof database.modules === "object"),
      status: database ? "Ready" : "Unavailable",
      reason: database ? "" : "Project Database is unavailable."
    };
  }

  function readModules() {
    const database = getProjectDatabase();
    const modules = database && database.modules && typeof database.modules === "object"
      ? database.modules
      : {};
    const records = Object.entries(modules).map(function mapModule(entry, index) {
      const key = entry[0];
      const moduleValue = internal.isPlainObject(entry[1]) ? entry[1] : {};
      const name = internal.text(moduleValue.name || moduleValue.fileName || key, key);
      return {
        recordType: "module",
        sourceType: "module-database",
        sourceId: internal.text(moduleValue.id, key),
        sourceVersion: internal.text(moduleValue.version, database && database.version || ""),
        sourceUpdatedAt: internal.text(moduleValue.updatedAt || database && database.analyzedAt, ""),
        identity: {
          sourceId: internal.text(moduleValue.id, key),
          name: name,
          qualifiedName: internal.text(moduleValue.qualifiedName, key),
          aliases: internal.unique(moduleValue.aliases)
        },
        classification: {
          domain: "repository",
          category: "module",
          subtype: internal.text(moduleValue.role, "module"),
          lifecycle: internal.text(moduleValue.status, "Active")
        },
        payload: internal.clone(moduleValue),
        metadata: { databaseKey: key, originalIndex: index },
        quality: { missingFields: [], warnings: [], errors: [] }
      };
    });
    return {
      sourceVersion: internal.text(database && database.version, ""),
      status: records.length ? "Ready" : "Partial",
      records: records,
      warnings: records.length ? [] : ["Module Database contains no records."],
      metadata: { sourceApi: "projectDatabase.modules" }
    };
  }

  function definitions() {
    return [
      {
        adapterId: ADAPTER_IDS.repository,
        capabilityId: ADAPTER_IDS.repository,
        name: "Repository File Source Adapter",
        version: VERSION,
        status: "Official",
        sourceType: "repository-file-data",
        recordTypes: ["file"],
        domains: ["repository"],
        required: true,
        priority: 10,
        description: "Reads current Project files without modifying Repository content.",
        limitations: ["Requires current Project files to be loaded before capture."],
        isAvailable: repositoryAvailability,
        read: readRepository
      },
      {
        adapterId: ADAPTER_IDS.project,
        capabilityId: ADAPTER_IDS.project,
        name: "Project Source Adapter",
        version: VERSION,
        status: "Official",
        sourceType: "project-database",
        recordTypes: ["project"],
        domains: ["repository"],
        required: true,
        priority: 20,
        description: "Reads Project identity and package metadata.",
        isAvailable: projectAvailability,
        read: readProject
      },
      {
        adapterId: ADAPTER_IDS.functions,
        capabilityId: ADAPTER_IDS.functions,
        name: "Function Database Source Adapter",
        version: VERSION,
        status: "Official",
        sourceType: "function-database",
        recordTypes: ["function"],
        domains: ["repository"],
        required: false,
        priority: 30,
        description: "Reads the existing Function Database as Source-derived records.",
        limitations: ["Analyzer-derived fields remain identified as Function Database output."],
        isAvailable: functionAvailability,
        read: readFunctions
      },
      {
        adapterId: ADAPTER_IDS.modules,
        capabilityId: ADAPTER_IDS.modules,
        name: "Module Database Source Adapter",
        version: VERSION,
        status: "Official",
        sourceType: "module-database",
        recordTypes: ["module"],
        domains: ["repository"],
        required: false,
        priority: 40,
        description: "Reads the existing Module Database without rebuilding or repairing it.",
        isAvailable: moduleAvailability,
        read: readModules
      }
    ];
  }

  function initializeRepositorySourceAdapters() {
    const results = definitions().map(function register(definition) {
      const existing = namespace.getSourceAdapter(definition.adapterId);
      if (existing) return { adapterId: definition.adapterId, registered: true, existing: true };
      const result = namespace.registerSourceAdapter(definition);
      return { adapterId: definition.adapterId, registered: result.ok === true, code: result.code };
    });
    const failed = results.filter(function failure(item) { return item.registered !== true; });
    return internal.buildResult(failed.length === 0,
      failed.length ? "REPOSITORY_SOURCE_ADAPTERS_INITIALIZATION_FAILED" : "REPOSITORY_SOURCE_ADAPTERS_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      { results: results, adapterCount: definitions().length },
      failed.length ? {
        error: { message: "One or more Repository Source Adapters could not be registered.", category: "Initialization Failure" }
      } : {});
  }

  Object.assign(namespace.api, {
    initializeRepositorySourceAdapters: initializeRepositorySourceAdapters
  });

  namespace.modules.repositorySourceAdapters = {
    id: "IDE-170-REPOSITORY-SOURCE-ADAPTERS",
    version: VERSION,
    status: "Ready",
    adapterIds: Object.values(ADAPTER_IDS),
    directRepositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.initializeIntelligenceRepositorySourceAdapters = initializeRepositorySourceAdapters;
})(typeof window !== "undefined" ? window : globalThis);
