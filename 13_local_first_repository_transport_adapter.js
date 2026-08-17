/* ============================================================
   FILE: 13_local_first_repository_transport_adapter.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.15.0 / Module: Transport Adapter Registry 1.0.0
   Phase 16: Controlled Cross-Device Sync Engine
   Decision-011 / Decision-012
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Transport Adapter blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("transportAdapter");

  if (!(state.transportAdapters instanceof Map)) state.transportAdapters = new Map();
  if (!state.transportAdapterStatus) state.transportAdapterStatus = "Ready";

  function validateAdapter(adapter) {
    const source = adapter && typeof adapter === "object" ? adapter : null;
    if (!source) return { valid: false, reason: "adapter-required" };
    const descriptor = source.descriptor || source;
    const contract = namespace.validateContract("transportAdapterDescriptor", descriptor);
    const requiredFunctions = ["prepare", "exportEnvelope", "receiveEnvelope", "getStatus"];
    const missingFunctions = requiredFunctions.filter(function (name) { return typeof source[name] !== "function"; });
    return {
      valid: contract.valid === true && missingFunctions.length === 0,
      contract: contract,
      missingFunctions: missingFunctions
    };
  }

  function registerTransportAdapter(adapter) {
    if (typeof namespace.getContractDefinition === "function" && !namespace.getContractDefinition("transportAdapterDescriptor") && typeof namespace.initializeContracts === "function") {
      namespace.initializeContracts();
    }
    const checked = validateAdapter(adapter);
    if (!checked.valid) {
      state.transportAdapterStatus = "Blocked";
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_TRANSPORT_ADAPTER_INVALID", "Blocked", checked);
    }
    const descriptor = internal.clone(adapter.descriptor || adapter);
    state.transportAdapters.set(descriptor.transportAdapterId, adapter);
    state.transportAdapterStatus = "Ready";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_TRANSPORT_ADAPTER_REGISTERED", "Ready", {
      descriptor: descriptor,
      adapterCount: state.transportAdapters.size,
      authorityEffect: "none",
      canonicalMutationAuthority: false
    });
  }

  function getTransportAdapter(adapterId) {
    const id = internal.text(adapterId, "");
    const adapter = id ? state.transportAdapters.get(id) : null;
    return adapter || null;
  }

  function listTransportAdapters() {
    return Array.from(state.transportAdapters.values()).map(function (adapter) {
      return internal.clone(adapter.descriptor || adapter);
    }).sort(function (a, b) {
      return String(a.transportAdapterId || "").localeCompare(String(b.transportAdapterId || ""));
    });
  }

  function getTransportAdapterRegistryStatus() {
    return {
      status: state.transportAdapterStatus || "Ready",
      phase: 16,
      moduleVersion: MODULE_VERSION,
      transportAdapterRegistryImplemented: true,
      adapterCount: state.transportAdapters.size,
      registeredAdapters: listTransportAdapters(),
      canonicalMutationAuthority: false,
      automaticAcceptanceAllowed: false,
      automaticBaselinePromotionAllowed: false
    };
  }

  Object.assign(namespace.api, {
    registerLocalFirstRepositoryTransportAdapter: registerTransportAdapter,
    getLocalFirstRepositoryTransportAdapter: getTransportAdapter,
    listLocalFirstRepositoryTransportAdapters: listTransportAdapters,
    getLocalFirstRepositoryTransportAdapterRegistryStatus: getTransportAdapterRegistryStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.transportAdapter = {
    id: "REPOSITORY-010-TRANSPORT-ADAPTER-REGISTRY",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 16,
    transportAdapterRegistryImplemented: true,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
