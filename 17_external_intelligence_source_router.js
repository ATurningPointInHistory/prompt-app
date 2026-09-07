/* ============================================================
   FILE: 17_external_intelligence_source_router.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 04: Hybrid Source Router
   Decisions: 002 / 007 / 015
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 source router blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("sourceRouter");

  function chooseRuntime(source, adapter, request) {
    if (!source || !adapter) return { ok: false, code: "ROUTING_INPUT_MISSING" };
    if (adapter.testOnly === true) {
      if (request && request.requestContext && request.requestContext.validationOnly === true && adapter.runtimeTargets.includes("TEST")) return { ok: true, runtimeTarget: "TEST" };
      return { ok: false, code: "TEST_ADAPTER_PRODUCTION_USE_BLOCKED" };
    }
    if (source.accessMode === "DISABLED") return { ok: false, code: "SOURCE_ACCESS_MODE_DISABLED" };
    if (source.accessMode === "BROWSER_DIRECT") {
      if (!adapter.runtimeTargets.includes("BROWSER")) return { ok: false, code: "BROWSER_ADAPTER_REQUIRED" };
      if (source.authenticationMode !== "NONE") return { ok: false, code: "BROWSER_SECRET_AUTH_BLOCKED" };
      return { ok: true, runtimeTarget: "BROWSER" };
    }
    if (source.accessMode === "LOCAL_GATEWAY") {
      if (!adapter.runtimeTargets.includes("LOCAL_GATEWAY")) return { ok: false, code: "LOCAL_GATEWAY_ADAPTER_REQUIRED" };
      if (typeof state.gatewayAcquisitionExecutor !== "function") return { ok: false, code: "LOCAL_GATEWAY_ACQUISITION_EXECUTOR_UNAVAILABLE" };
      return { ok: true, runtimeTarget: "LOCAL_GATEWAY" };
    }
    if (source.accessMode === "AUTO_ROUTE") {
      if (source.authenticationMode === "NONE" && adapter.runtimeTargets.includes("BROWSER")) return { ok: true, runtimeTarget: "BROWSER" };
      if (adapter.runtimeTargets.includes("LOCAL_GATEWAY") && typeof state.gatewayAcquisitionExecutor === "function") return { ok: true, runtimeTarget: "LOCAL_GATEWAY" };
      return { ok: false, code: "AUTO_ROUTE_NO_POLICY_COMPLIANT_RUNTIME" };
    }
    if (adapter.runtimeTargets.includes("TEST") && adapter.testOnly === true) return { ok: true, runtimeTarget: "TEST" };
    return { ok: false, code: "ACCESS_MODE_UNSUPPORTED" };
  }

  function resolveExternalIntelligenceAcquisitionRoute(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const request = settings.requestId ? state.acquisitionRequests.get(settings.requestId) : settings.request;
    if (!request) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_REQUEST_NOT_FOUND", "Blocked", null);
    const sourceResult = namespace.resolveExternalIntelligenceSourceForOperation({ sourceId: request.sourceId, operationId: request.operationId });
    if (!sourceResult.ok) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_SOURCE_BLOCKED", "Blocked", { sourceResult: sourceResult });
    const source = state.sourceRegistry.get(request.sourceId);
    const operationContract = internal.getExternalIntelligenceSourceOperationContract(request.sourceId, request.operationId);
    if (!operationContract) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_OPERATION_CONTRACT_MISSING", "Blocked", { sourceId: request.sourceId, operationId: request.operationId });
    const adapterId = operationContract.adapterId || source.adapterId;
    if (source.adapterId !== adapterId) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_ADAPTER_BINDING_MISMATCH", "Blocked", { sourceAdapterId: source.adapterId, operationAdapterId: adapterId });
    const adapter = state.adapterRegistry.get(adapterId);
    if (!adapter) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_ADAPTER_NOT_REGISTERED", "Blocked", { adapterId: adapterId });
    if (adapter.status === "BLOCKED" || adapter.status === "DEPRECATED") return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_ADAPTER_UNAVAILABLE", "Blocked", { adapterId: adapterId, status: adapter.status });
    const runtime = chooseRuntime(source, adapter, request);
    if (!runtime.ok) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_RUNTIME_UNAVAILABLE", "Blocked", { code: runtime.code, sourceId: source.sourceId, accessMode: source.accessMode, adapterId: adapter.adapterId, fallbackPerformed: false });

    const route = {
      routeId: internal.nextId("EXTERNAL-010-ROUTE"),
      requestId: request.requestId,
      sourceId: source.sourceId,
      sourceVersion: source.version,
      operationId: request.operationId,
      operationContractId: operationContract.operationContractId,
      adapterId: adapter.adapterId,
      adapterVersion: adapter.adapterVersion,
      accessMode: source.accessMode,
      runtimeTarget: runtime.runtimeTarget,
      endpointReference: operationContract.endpoint.endpointReference,
      fallbackPerformed: false,
      fallbackCanBypassPolicy: false,
      sourceAuthorityGranted: false,
      economicAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("sourceRouteDecision", route);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SOURCE-ROUTE-DECISION", route);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(route));
    state.acquisitionRoutes.set(route.routeId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_ROUTE_RESOLVED", "Ready", { route: internal.clone(frozen), adapter: internal.clone(adapter), source: internal.clone(source), operationContract: internal.clone(operationContract) });
  }

  function getExternalIntelligenceAcquisitionRoute(routeId) {
    const route = state.acquisitionRoutes.get(internal.text(routeId, ""));
    return route ? internal.clone(route) : null;
  }

  function listExternalIntelligenceAcquisitionRoutes() {
    return Array.from(state.acquisitionRoutes.values()).map(internal.clone);
  }

  function initializeExternalIntelligenceSourceRouter() {
    namespace.modules.sourceRouter.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_SOURCE_ROUTER_INITIALIZED", "Ready", { hybridRouting: true, browserDirect: true, localGateway: true, automaticUnsafeFallback: false, arbitraryExternalRequestAllowed: false });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceSourceRouter: initializeExternalIntelligenceSourceRouter,
    resolveExternalIntelligenceAcquisitionRoute: resolveExternalIntelligenceAcquisitionRoute,
    getExternalIntelligenceAcquisitionRoute: getExternalIntelligenceAcquisitionRoute,
    listExternalIntelligenceAcquisitionRoutes: listExternalIntelligenceAcquisitionRoutes
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.sourceRouter = {
    id: "EXTERNAL-010-SOURCE-ROUTER",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    hybridRouting: true,
    unsafeFallbackAllowed: false,
    arbitraryExternalRequestAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
