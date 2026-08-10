/* ============================================================
   FILE: 13_knowledge_navigator_basic_resolver.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Basic Resolver 1.0.0
   Phase 3: Basic Navigation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 basic resolver blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("basicResolver");
  const RESOLVER_ID = "IDE-180-RESOLVER-BASIC-NAVIGATION";
  const NAVIGATION_TYPES = ["search", "entity", "repository", "file", "module", "function"];

  function targetValue(request) {
    const target = request && request.target;
    if (target == null) return internal.text(request && request.query, "");
    if (typeof target === "string") return target;
    return internal.text(target.canonicalId || target.recordId || target.name || target.qualifiedName, internal.text(request && request.query, ""));
  }

  function requestedRecordType(request) {
    const type = internal.text(request && request.navigationType, "");
    if (["file", "module", "function"].includes(type)) return type;
    const target = request && request.target;
    return target && typeof target === "object" ? internal.text(target.recordType, "") : "";
  }

  function requiredCapability(request) {
    const recordType = requestedRecordType(request);
    if (recordType === "file") return "file-navigation";
    if (recordType === "module") return "module-navigation";
    if (recordType === "function") return "function-navigation";
    if (request && request.navigationType === "repository") return "entity-navigation";
    if (request && request.navigationType === "entity") return "entity-navigation";
    return null;
  }

  function capabilityGate(request) {
    const capability = requiredCapability(request);
    if (!capability || typeof namespace.getIntelligenceProviderStatus !== "function") return null;
    const status = namespace.getIntelligenceProviderStatus();
    const capabilities = Array.isArray(status && status.capabilities) ? status.capabilities : [];
    if (capabilities.includes(capability)) return null;
    return internal.buildResult(false, "IDE180_NAVIGATION_CAPABILITY_MISSING", "missing-source", {
      capability: capability,
      navigationType: request && request.navigationType,
      recordType: requestedRecordType(request) || null
    }, {
      missingSource: {
        sourceType: "ide170-intelligence-package",
        capability: capability,
        reason: "artifact-backed-capability-unavailable"
      }
    });
  }

  function resolveSearch(request) {
    const query = internal.text(request.query || targetValue(request), "");
    if (!query) return internal.buildResult(false, "IDE180_SEARCH_QUERY_REQUIRED", "invalid-request", null);
    const searched = namespace.searchCanonicalNavigationTargets(query, {
      recordType: requestedRecordType(request),
      limit: request.options && request.options.limit || 20
    });
    if (!searched.ok) return searched;
    return internal.buildResult(true, "IDE180_BASIC_SEARCH_RESOLVED", searched.status === "not-found" ? "not-found" : "complete", {
      navigationType: "search",
      target: searched.data.targets[0] || null,
      candidates: searched.data.targets,
      totalMatches: searched.data.totalMatches,
      matchKind: searched.data.matchKind,
      navigationPath: searched.data.targets.slice(0, 1).map(function path(target) {
        return { step: 1, type: "search-result", target: target };
      }),
      sourceSnapshot: searched.sourceSnapshot || null
    });
  }

  function resolveRepository(request) {
    const target = targetValue(request);
    if (target) {
      const resolved = namespace.resolveCanonicalNavigationTarget(target, { recordType: "project", limit: 20 });
      if (resolved.ok) return internal.buildResult(true, "IDE180_REPOSITORY_TARGET_RESOLVED", "complete", {
        navigationType: "repository",
        target: resolved.data.target,
        candidates: resolved.data.candidates,
        navigationPath: [{ step: 1, type: "canonical-entity", target: resolved.data.target }],
        sourceSnapshot: resolved.sourceSnapshot || null
      });
    }
    const listed = namespace.listCanonicalNavigationTargets({ recordType: "project", limit: 20 });
    if (!listed.ok) return listed;
    const targets = listed.data.targets || [];
    if (!targets.length) {
      return internal.buildResult(false, "IDE180_REPOSITORY_TARGET_MISSING", "missing-source", { candidates: [] }, {
        missingSource: { sourceType: "canonical-snapshot", recordType: "project" }
      });
    }
    return internal.buildResult(true, "IDE180_REPOSITORY_TARGET_RESOLVED", targets.length > 1 ? "partial" : "complete", {
      navigationType: "repository",
      target: targets.length === 1 ? targets[0] : null,
      candidates: targets,
      resolutionStatus: targets.length === 1 ? "resolved" : "ambiguous",
      navigationPath: targets.length === 1 ? [{ step: 1, type: "canonical-entity", target: targets[0] }] : [],
      sourceSnapshot: listed.sourceSnapshot || null
    });
  }

  function resolveEntity(request) {
    const value = targetValue(request);
    if (!value) return internal.buildResult(false, "IDE180_ENTITY_TARGET_REQUIRED", "invalid-request", null);
    const recordType = requestedRecordType(request);
    const resolved = namespace.resolveCanonicalNavigationTarget(request.target || value, { recordType: recordType, limit: 20 });
    if (!resolved.ok) return resolved;
    return internal.buildResult(true, "IDE180_BASIC_ENTITY_RESOLVED", "complete", {
      navigationType: request.navigationType,
      target: resolved.data.target,
      candidates: resolved.data.candidates,
      resolutionStatus: resolved.data.resolutionStatus,
      navigationPath: [{ step: 1, type: "canonical-entity", target: resolved.data.target }],
      sourceSnapshot: resolved.sourceSnapshot || null
    });
  }

  function resolve(request) {
    const type = internal.text(request && request.navigationType, "");
    if (!NAVIGATION_TYPES.includes(type)) {
      return internal.buildResult(false, "IDE180_BASIC_RESOLVER_TYPE_UNSUPPORTED", "unsupported", { navigationType: type });
    }
    const gated = capabilityGate(request);
    if (gated) return gated;
    if (type === "search") return resolveSearch(request);
    if (type === "repository") return resolveRepository(request);
    return resolveEntity(request);
  }

  const resolverDefinition = {
    resolverId: RESOLVER_ID,
    version: MODULE_VERSION,
    navigationTypes: NAVIGATION_TYPES.slice(),
    readOnly: true,
    resolve: resolve
  };

  function initializeBasicResolver() {
    const existing = internal.state.resolverDefinitions instanceof Map ? internal.state.resolverDefinitions.get(RESOLVER_ID) : null;
    const registration = existing
      ? internal.buildResult(true, "IDE180_RESOLVER_EXISTS", "Ready", { resolverId: RESOLVER_ID, existing: true })
      : namespace.registerResolverDefinition(resolverDefinition);
    namespace.modules.basicResolver.status = registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration.ok === true, registration.ok === true ? "IDE180_BASIC_RESOLVER_INITIALIZED" : "IDE180_BASIC_RESOLVER_INITIALIZATION_FAILED", registration.ok === true ? "Ready" : "Blocked", {
      registration: registration,
      resolverId: RESOLVER_ID,
      navigationTypes: NAVIGATION_TYPES.slice()
    });
  }

  Object.assign(namespace.api, {
    initializeBasicResolver: initializeBasicResolver,
    resolveBasicNavigation: resolve,
    getBasicNavigationResolverDefinition: function getDefinition() { return internal.clone(resolverDefinition); }
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.basicResolver = {
    id: RESOLVER_ID,
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    navigationTypes: NAVIGATION_TYPES.slice(),
    scoringAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
