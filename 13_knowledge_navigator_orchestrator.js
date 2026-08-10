/* ============================================================
   FILE: 13_knowledge_navigator_orchestrator.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Orchestrator 1.1.0
   Phase 4: Relationship / Traversal
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 orchestrator blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("orchestrator");
  const RESULT_VERSION = VERSION_MANIFEST.getContractVersion("navigationResult");

  function providerSnapshot() {
    const status = typeof namespace.getIntelligenceProviderStatus === "function" ? namespace.getIntelligenceProviderStatus() : null;
    const active = status && status.activePackage || null;
    return {
      providerId: status && status.providerId || null,
      providerVersion: status && status.providerVersion || null,
      sourceType: status && status.sourceType || null,
      availability: status && status.availability || "unavailable",
      packageId: active && active.packageId || null,
      packageHash: active && active.packageHash || null,
      sourceOrigin: active && active.sourceOrigin || null
    };
  }

  async function ensureSource() {
    const status = typeof namespace.getIntelligenceProviderStatus === "function" ? namespace.getIntelligenceProviderStatus() : null;
    if (status && status.activePackage) return internal.buildResult(true, "IDE180_NAVIGATION_SOURCE_READY", status.availability || "available", { provider: status });
    if (typeof namespace.openLatestIntelligencePackageSource !== "function") {
      return internal.buildResult(false, "IDE180_NAVIGATION_SOURCE_PROVIDER_UNAVAILABLE", "missing-source", null);
    }
    return namespace.openLatestIntelligencePackageSource({ allowIndexedDB: true });
  }

  function basicResult(request, status, resolution, sourceStatus) {
    const data = resolution && resolution.data || {};
    const provider = sourceStatus && sourceStatus.data && sourceStatus.data.provider || (typeof namespace.getIntelligenceProviderStatus === "function" ? namespace.getIntelligenceProviderStatus() : null);
    const missing = [];
    if (resolution && resolution.missingSource) missing.push(internal.clone(resolution.missingSource));
    if (resolution && resolution.status === "missing-source" && !missing.length) missing.push({ sourceType: "canonical-snapshot", reason: resolution.code || "missing-source" });
    const ambiguityCandidates = data.candidates || [];
    const ambiguity = data.resolutionStatus === "ambiguous" || resolution && resolution.code === "IDE180_TARGET_AMBIGUOUS"
      ? { status: "ambiguous", candidates: internal.clone(ambiguityCandidates) }
      : { status: "none", candidates: [] };
    const result = {
      resultId: internal.nextId("IDE-180-NAV-RESULT"),
      requestId: request.requestId,
      contractVersion: RESULT_VERSION,
      status: status,
      target: data.target || null,
      navigationPath: internal.clone(data.navigationPath || []),
      sources: data.target ? [{
        providerId: provider && provider.providerId || null,
        sourceType: provider && provider.sourceType || null,
        packageId: provider && provider.activePackage && provider.activePackage.packageId || null,
        canonicalId: data.target.canonicalId || null,
        recordId: data.target.recordId || null,
        recordType: data.target.recordType || null
      }] : [],
      relationships: internal.clone(data.relationships || []),
      authority: { status: "not-applicable", reason: "Authority Resolution begins in Phase 5." },
      evidence: [],
      lineage: [],
      version: data.target && data.target.source && data.target.source.sourceVersion || null,
      validation: { status: "not-evaluated", reason: "Validation Resolver begins in Phase 5." },
      conflicts: [],
      missingSources: missing,
      partialReason: status === "partial" ? (data.partialReason || (ambiguity.status === "ambiguous" ? "ambiguous-target" : "partial-source")) : null,
      explanation: {},
      metadata: {
        navigationType: request.navigationType,
        resolverId: resolution && resolution.resolverId || "IDE-180-RESOLVER-BASIC-NAVIGATION",
        sourceSnapshot: providerSnapshot(),
        candidates: internal.clone(data.candidates || []),
        totalMatches: data.totalMatches == null ? null : data.totalMatches,
        matchKind: data.matchKind || null,
        limitations: internal.unique(provider && provider.limitations || []),
        warnings: internal.unique(provider && provider.warnings || []),
        ambiguity: ambiguity,
        traversal: internal.clone(data.traversal || null),
        budget: internal.clone(data.budget || null),
        graph: internal.clone(data.graph || null),
        truncation: internal.clone(data.truncation || { truncated: false, reason: null }),
        readOnly: true,
        createdAt: internal.nowIso()
      }
    };
    result.explanation = typeof namespace.buildKnowledgeNavigationExplanation === "function"
      ? namespace.buildKnowledgeNavigationExplanation(result, request, data)
      : namespace.buildBasicNavigationExplanation(result, request, data);
    return result;
  }

  function failureResult(request, resolution, sourceStatus) {
    const rawStatus = resolution && resolution.status || "error";
    const allowed = ["partial", "not-found", "missing-source", "unsupported", "invalid-request", "incompatible", "error"];
    const status = allowed.includes(rawStatus) ? rawStatus : "error";
    return basicResult(request, status, resolution || {}, sourceStatus);
  }

  function resolverFor(typeId) {
    if (typeof namespace.getNavigationType !== "function") return null;
    const type = namespace.getNavigationType(typeId);
    if (!type || type.implemented !== true || !type.resolverId) return null;
    if (typeof namespace.getResolverDefinition === "function") return namespace.getResolverDefinition(type.resolverId);
    return internal.state.resolverDefinitions instanceof Map ? internal.state.resolverDefinitions.get(type.resolverId) || null : null;
  }

  async function navigate(input, options) {
    const resolvedRequest = namespace.resolveKnowledgeNavigationRequest(input, options);
    if (!resolvedRequest || resolvedRequest.ok !== true || !resolvedRequest.data || !resolvedRequest.data.request) {
      const fallbackRequest = namespace.createKnowledgeNavigationRequest(internal.isPlainObject(input) ? input : { query: input, navigationType: "search" });
      return failureResult(fallbackRequest, resolvedRequest || internal.buildResult(false, "IDE180_REQUEST_RESOLUTION_FAILED", "invalid-request", null), null);
    }

    const request = resolvedRequest.data.request;
    const typeResolution = namespace.resolveNavigationType(request.navigationType);
    if (!typeResolution || typeResolution.ok !== true) return failureResult(request, typeResolution, null);
    const definition = typeResolution.definition;
    if (!definition || definition.implemented !== true) {
      return failureResult(request, internal.buildResult(false, "IDE180_NAVIGATION_TYPE_NOT_IMPLEMENTED", "unsupported", { navigationType: request.navigationType }), null);
    }

    const sourceStatus = await ensureSource();
    if (!sourceStatus || sourceStatus.ok !== true) return failureResult(request, sourceStatus, sourceStatus);

    const resolver = resolverFor(request.navigationType);
    if (!resolver || typeof resolver.resolve !== "function") {
      return failureResult(request, internal.buildResult(false, "IDE180_NAVIGATION_RESOLVER_UNAVAILABLE", "unsupported", { navigationType: request.navigationType }), sourceStatus);
    }

    const resolution = resolver.resolve(request, {
      contextId: internal.nextId("IDE-180-NAV-CONTEXT"),
      sourceSnapshot: providerSnapshot(),
      readOnly: true
    });
    if (!resolution || resolution.ok !== true) return failureResult(request, resolution, sourceStatus);
    const status = resolution.status === "partial" ? "partial" : resolution.status === "not-found" ? "not-found" : "complete";
    const result = basicResult(request, status, Object.assign({ resolverId: resolver.resolverId }, resolution), sourceStatus);
    const validation = namespace.validateContract("navigationResult", result);
    if (!validation.valid) {
      return basicResult(request, "error", internal.buildResult(false, "IDE180_NAVIGATION_RESULT_CONTRACT_INVALID", "error", { validation: validation }), sourceStatus);
    }
    internal.state.lastNavigation = internal.clone(result);
    internal.touch();
    return internal.deepFreeze(result);
  }

  function getOrchestratorStatus() {
    return {
      id: "IDE-180-ORCHESTRATOR-STATUS",
      version: MODULE_VERSION,
      status: namespace.modules.orchestrator && namespace.modules.orchestrator.status || "Loaded",
      implementedNavigationTypes: namespace.listNavigationTypes().filter(function filter(item) { return item.implemented === true; }).map(function id(item) { return item.typeId; }),
      resolverCount: namespace.listResolverDefinitions().length,
      lastNavigation: internal.clone(internal.state.lastNavigation || null),
      readOnly: true
    };
  }

  function initializeOrchestrator() {
    namespace.modules.orchestrator.status = "Ready";
    return internal.buildResult(true, "IDE180_ORCHESTRATOR_INITIALIZED", "Ready", getOrchestratorStatus());
  }

  Object.assign(namespace.api, {
    initializeOrchestrator: initializeOrchestrator,
    navigate: navigate,
    navigateKnowledge: navigate,
    getKnowledgeNavigatorOrchestratorStatus: getOrchestratorStatus
  });
  Object.assign(namespace, namespace.api);
  global.navigateKnowledge = navigate;
  global.navigateKnowledgeNavigator = navigate;

  namespace.modules.orchestrator = {
    id: "IDE-180-ORCHESTRATOR",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    verticalSlice: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
