/* ============================================================
   FILE: 13_knowledge_navigator_orchestrator.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Orchestrator 1.2.0
   Phase 5: Authority / Evidence / Lineage
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
      authority: internal.clone(data.authority || { status: "not-applicable", reason: "No Authority evaluation is applicable for this resolver output." }),
      evidence: internal.clone(data.evidence || []),
      lineage: internal.clone(data.lineage || []),
      version: data.version != null ? internal.clone(data.version) : (data.target && data.target.source && data.target.source.sourceVersion || null),
      validation: internal.clone(data.validation || { status: "not-evaluated", reason: "No Validation artifact was resolved for this navigation result." }),
      conflicts: [],
      missingSources: missing,
      partialReason: status === "partial" ? (data.partialReason || (ambiguity.status === "ambiguous" ? "ambiguous-target" : "partial-source")) : null,
      explanation: {},
      metadata: {
        navigationType: request.navigationType,
        scope: internal.clone(request.scope || null),
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
    enrichPhase5Result(result, request);
    if (typeof namespace.evaluateNavigationResultAuthority === "function") {
      result.authority = internal.clone(namespace.evaluateNavigationResultAuthority(result, request));
    }
    result.explanation = typeof namespace.buildKnowledgeNavigationExplanation === "function"
      ? namespace.buildKnowledgeNavigationExplanation(result, request, data)
      : namespace.buildBasicNavigationExplanation(result, request, data);
    return result;
  }

  function enrichPhase5Result(result, request) {
    if (!result || !["complete", "partial"].includes(result.status)) return result;

    if ((!Array.isArray(result.evidence) || result.evidence.length === 0) && typeof namespace.resolveKnowledgeEvidenceReferences === "function") {
      const evidenceIds = [];
      (Array.isArray(result.relationships) ? result.relationships : []).forEach(function relationship(item) {
        (Array.isArray(item && item.evidenceReferenceIds) ? item.evidenceReferenceIds : []).forEach(function id(value) { if (value && !evidenceIds.includes(value)) evidenceIds.push(value); });
      });
      if (evidenceIds.length) {
        const resolvedEvidence = namespace.resolveKnowledgeEvidenceReferences(evidenceIds);
        if (resolvedEvidence && resolvedEvidence.ok === true && resolvedEvidence.data) {
          result.evidence = internal.clone(resolvedEvidence.data.evidence || []);
          if (resolvedEvidence.data.unresolvedEvidenceIds && resolvedEvidence.data.unresolvedEvidenceIds.length) {
            result.metadata.warnings = internal.unique((result.metadata.warnings || []).concat(["Some Evidence references could not be resolved from the current evidence-index."]));
          }
        }
      }
      if ((!Array.isArray(result.evidence) || result.evidence.length === 0) && result.target && result.target.canonicalId && typeof namespace.resolveKnowledgeEvidenceForCanonicalId === "function") {
        const entityEvidence = namespace.resolveKnowledgeEvidenceForCanonicalId(result.target.canonicalId);
        if (entityEvidence && entityEvidence.ok === true && entityEvidence.data) result.evidence = internal.clone(entityEvidence.data.evidence || []);
      }
    }

    if ((!Array.isArray(result.lineage) || result.lineage.length === 0) && result.target && result.target.canonicalId && typeof namespace.resolveKnowledgeLineage === "function") {
      const lineage = namespace.resolveKnowledgeLineage(result.target.canonicalId);
      if (lineage && lineage.ok === true && lineage.data) result.lineage = internal.clone(lineage.data.lineage || []);
    }

    if ((!result.validation || result.validation.status === "not-evaluated") && typeof namespace.getKnowledgeNavigatorValidationState === "function") {
      const validation = namespace.getKnowledgeNavigatorValidationState();
      if (validation && validation.ok === true && validation.data && validation.data.validation) result.validation = internal.clone(validation.data.validation);
    }

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
    phase: 5,
    verticalSlice: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
