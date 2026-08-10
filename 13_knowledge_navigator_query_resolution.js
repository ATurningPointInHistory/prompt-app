/* ============================================================
   FILE: 13_knowledge_navigator_query_resolution.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Query Resolution 1.0.0
   Phase 3: Basic Navigation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 query resolution blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("queryResolution");
  const CONTRACT_VERSION = VERSION_MANIFEST.getContractVersion("navigationRequest");

  const QUERY_TYPE_MAP = Object.freeze({
    "entity-lookup": "entity",
    "entity-summary": "entity",
    "entity-search": "search",
    "member-list": "entity",
    "ownership-trace": "entity",
    "dependency-analysis": "dependency",
    "reverse-dependency-analysis": "reverse-dependency",
    "relationship-path": "relationship",
    "relationship-search": "relationship",
    "change-analysis": "timeline",
    "snapshot-diff": "version",
    "change-history": "timeline",
    "impact-candidate-analysis": "relationship",
    "rename-candidate-search": "search",
    "workflow-trace": "workflow",
    "decision-trace": "decision",
    "approval-trace": "workflow",
    "execution-trace": "workflow",
    "rollback-trace": "workflow",
    "deployment-trace": "workflow",
    "validation-trace": "validation",
    "diagnostic-trace": "validation",
    "evidence-trace": "evidence",
    "explanation-request": "explanation",
    "insight-search": "insight",
    "missing-information-search": "search"
  });

  function inferTargetType(target) {
    if (!target || typeof target !== "object") return null;
    return internal.text(target.recordType, "") || null;
  }

  function createNavigationRequest(input, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const source = internal.isPlainObject(input) ? internal.clone(input) : { query: input == null ? null : String(input) };
    const navigationType = internal.text(source.navigationType || settings.navigationType, "");
    return {
      requestId: internal.text(source.requestId, internal.nextId("IDE-180-NAV-REQUEST")),
      contractVersion: internal.text(source.contractVersion, CONTRACT_VERSION),
      query: source.query == null ? null : String(source.query),
      target: source.target == null ? null : internal.clone(source.target),
      navigationType: navigationType,
      scope: source.scope == null ? null : internal.clone(source.scope),
      sourcePreference: Array.isArray(source.sourcePreference) ? source.sourcePreference.slice() : [],
      evidenceRequirement: source.evidenceRequirement == null ? null : internal.clone(source.evidenceRequirement),
      maxDepth: Number.isInteger(source.maxDepth) ? source.maxDepth : null,
      options: internal.isPlainObject(source.options) ? internal.clone(source.options) : {}
    };
  }

  function loadRecordsForInterpreter() {
    if (typeof namespace.loadKnowledgeNavigatorCanonicalSnapshot !== "function") return null;
    const loaded = namespace.loadKnowledgeNavigatorCanonicalSnapshot();
    return loaded && loaded.ok === true && loaded.data ? loaded.data.records || [] : null;
  }

  function resolveNaturalLanguage(query, options) {
    const runtime = global.IDE170Intelligence;
    if (!runtime || typeof runtime.interpretQuery !== "function") {
      return internal.buildResult(false, "IDE180_QUERY_INTERPRETER_UNAVAILABLE", "unsupported", null, {
        missingSource: { sourceType: "ide170-query-interpreter", reason: "public-api-unavailable" }
      });
    }

    const settings = internal.isPlainObject(options) ? internal.clone(options) : {};
    const records = loadRecordsForInterpreter();
    if (Array.isArray(records)) settings.records = records;
    const interpreted = runtime.interpretQuery(query, settings);
    if (!interpreted || interpreted.ok !== true || !interpreted.data || !interpreted.data.query) {
      const status = interpreted && interpreted.status === "Ambiguous" ? "partial" : interpreted && interpreted.status === "Needs Resolution" ? "partial" : "invalid-request";
      return internal.buildResult(false, interpreted && interpreted.code || "IDE180_QUERY_INTERPRETATION_FAILED", status, interpreted && interpreted.data || null, {
        warnings: interpreted && interpreted.warnings || []
      });
    }

    const typed = interpreted.data.query;
    const navigationType = QUERY_TYPE_MAP[typed.queryType] || null;
    if (!navigationType) {
      return internal.buildResult(false, "IDE180_TYPED_QUERY_UNSUPPORTED", "unsupported", { typedQuery: typed });
    }

    const request = createNavigationRequest({
      query: typed.originalInput,
      target: typed.target,
      navigationType: navigationType,
      scope: typed.scope,
      evidenceRequirement: typed.requirements && typed.requirements.evidenceRequired === false ? "optional" : "required",
      options: {
        ide170TypedQueryId: typed.queryId,
        ide170QueryType: typed.queryType,
        targetRecordType: inferTargetType(typed.target)
      }
    });
    return internal.buildResult(true, "IDE180_QUERY_RESOLVED", "complete", {
      request: request,
      typedQuery: typed,
      interpretation: interpreted.data
    });
  }

  function resolveNavigationRequest(input, options) {
    if (typeof input === "string") return resolveNaturalLanguage(input, options);
    if (!internal.isPlainObject(input)) {
      return internal.buildResult(false, "IDE180_NAVIGATION_REQUEST_REQUIRED", "invalid-request", null);
    }
    const request = createNavigationRequest(input, options);
    if (!request.navigationType && request.query) return resolveNaturalLanguage(request.query, options);
    const typeResolution = typeof namespace.resolveNavigationType === "function" ? namespace.resolveNavigationType(request.navigationType) : null;
    if (!typeResolution || typeResolution.ok !== true) {
      return internal.buildResult(false, typeResolution && typeResolution.code || "IDE180_NAVIGATION_TYPE_UNSUPPORTED", typeResolution && typeResolution.status || "unsupported", { request: request });
    }
    request.navigationType = typeResolution.typeId;
    const validation = typeof namespace.validateContract === "function" ? namespace.validateContract("navigationRequest", request) : { valid: true };
    if (!validation.valid) {
      return internal.buildResult(false, "IDE180_NAVIGATION_REQUEST_INVALID", "invalid-request", { request: request, validation: validation });
    }
    return internal.buildResult(true, "IDE180_NAVIGATION_REQUEST_RESOLVED", "complete", { request: request, typeResolution: typeResolution, validation: validation });
  }

  function initializeQueryResolution() {
    namespace.modules.queryResolution.status = "Ready";
    return internal.buildResult(true, "IDE180_QUERY_RESOLUTION_INITIALIZED", "Ready", {
      queryTypeMapCount: Object.keys(QUERY_TYPE_MAP).length,
      publicInterpreterBridge: Boolean(global.IDE170Intelligence && typeof global.IDE170Intelligence.interpretQuery === "function"),
      readOnly: true
    });
  }

  Object.assign(namespace.api, {
    initializeQueryResolution: initializeQueryResolution,
    createKnowledgeNavigationRequest: createNavigationRequest,
    resolveKnowledgeNavigationRequest: resolveNavigationRequest,
    resolveKnowledgeNavigationQuery: resolveNaturalLanguage
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.queryResolution = {
    id: "IDE-180-QUERY-RESOLUTION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    publicInterpreterBridge: true,
    duplicateNaturalLanguageInterpreter: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
