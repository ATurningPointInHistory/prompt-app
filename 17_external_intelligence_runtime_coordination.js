/* ============================================================
   FILE: 17_external_intelligence_runtime_coordination.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.1.0
   Phase 02: Runtime / Gateway / Software Supply Chain Foundation
   Decisions: 003 / 013 / 051
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 runtime coordination blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("runtimeCoordination");

  function normalizeRuntimeType(value) {
    const type = internal.text(value, "BROWSER_CLIENT").toUpperCase();
    const allowed = ["BROWSER_CLIENT", "NODE_GATEWAY", "DESKTOP_SERVICE", "LOCAL_BACKGROUND_SERVICE", "RECOVERY_RUNTIME", "MIGRATION_RUNTIME", "PYTHON_WORKER", "TEST_RUNTIME", "FUTURE_REMOTE_RUNTIME"];
    return allowed.includes(type) ? type : "TEST_RUNTIME";
  }

  function createRuntimeIdentity(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const runtimeType = normalizeRuntimeType(settings.runtimeType);
    const now = internal.nowIso();
    const record = internal.deepFreeze({
      runtimeInstanceId: internal.text(settings.runtimeInstanceId, internal.nextId("EXTERNAL-010-RUNTIME")),
      runtimeType: runtimeType,
      runtimeVersion: internal.text(settings.runtimeVersion, VERSION_MANIFEST.release.version),
      startupEpoch: internal.text(settings.startupEpoch, Date.now().toString(36).toUpperCase()),
      startedAt: internal.text(settings.startedAt, now),
      hostIdentity: internal.text(settings.hostIdentity, runtimeType === "BROWSER_CLIENT" ? "browser-local" : "local-runtime"),
      capabilityProfile: internal.isPlainObject(settings.capabilityProfile) ? internal.clone(settings.capabilityProfile) : {},
      schemaCompatibilityProfile: internal.isPlainObject(settings.schemaCompatibilityProfile) ? internal.clone(settings.schemaCompatibilityProfile) : {},
      healthState: internal.text(settings.healthState, "READY").toUpperCase(),
      executionAuthorityGranted: false,
      businessAuthorityGranted: false,
      immutable: true
    });
    const validation = namespace.validateExternalIntelligenceContract("gatewayRuntimeState", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_RUNTIME_IDENTITY_INVALID", "Blocked", { validation: validation, runtime: record });
    return internal.buildResult(true, "EXTERNAL010_RUNTIME_IDENTITY_CREATED", "Ready", { runtime: record });
  }

  function registerRuntimeIdentity(input) {
    const created = input && input.runtimeInstanceId ? internal.buildResult(true, "EXTERNAL010_RUNTIME_IDENTITY_PROVIDED", "Ready", { runtime: internal.deepFreeze(internal.clone(input)) }) : createRuntimeIdentity(input);
    if (!created.ok) return created;
    const runtime = created.data.runtime;
    const existing = state.runtimeInstances.get(runtime.runtimeInstanceId);
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(runtime);
      return internal.buildResult(same, same ? "EXTERNAL010_RUNTIME_ALREADY_REGISTERED" : "EXTERNAL010_RUNTIME_IDENTITY_CONFLICT", same ? "Ready" : "Blocked", { runtime: internal.clone(existing) });
    }
    state.runtimeInstances.set(runtime.runtimeInstanceId, runtime);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RUNTIME_REGISTERED", "Ready", { runtime: internal.clone(runtime) });
  }

  function getRuntimeIdentity(id) {
    const record = state.runtimeInstances.get(internal.text(id, ""));
    return record ? internal.clone(record) : null;
  }

  function listRuntimeIdentities() {
    return Array.from(state.runtimeInstances.values()).map(internal.clone);
  }

  function createLeaderLeaseCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const holder = internal.text(settings.holderRuntimeInstanceId, "");
    if (!holder || !state.runtimeInstances.has(holder)) return internal.buildResult(false, "EXTERNAL010_LEASE_RUNTIME_REQUIRED", "Blocked", null);
    const fencingToken = state.runtimeLeases.size + 1;
    const lease = internal.deepFreeze({
      coordinationRecordId: internal.nextId("EXTERNAL-010-LEASE"),
      recordType: "LEADER_LEASE",
      holderRuntimeInstanceId: holder,
      leaseType: internal.text(settings.leaseType, "PHASE2_COORDINATION"),
      fencingToken: fencingToken,
      state: "CANDIDATE",
      acquiredAt: null,
      expiresAt: null,
      executionAuthorityGranted: false,
      businessAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    state.runtimeLeases.set(lease.coordinationRecordId, lease);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_LEADER_LEASE_CANDIDATE_CREATED", "Candidate", { lease: internal.clone(lease) });
  }

  function createWorkClaimCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const runtimeInstanceId = internal.text(settings.runtimeInstanceId, "");
    const workItemId = internal.text(settings.workItemId, "");
    if (!runtimeInstanceId || !state.runtimeInstances.has(runtimeInstanceId) || !workItemId) return internal.buildResult(false, "EXTERNAL010_WORK_CLAIM_INPUT_REQUIRED", "Blocked", null);
    const claim = internal.deepFreeze({
      coordinationRecordId: internal.nextId("EXTERNAL-010-WORK-CLAIM"),
      recordType: "WORK_CLAIM",
      workItemId: workItemId,
      runtimeInstanceId: runtimeInstanceId,
      attemptId: internal.text(settings.attemptId, internal.nextId("EXTERNAL-010-ATTEMPT")),
      idempotencyKey: internal.text(settings.idempotencyKey, createIdempotencyKey(workItemId)),
      fencingToken: Number.isInteger(settings.fencingToken) ? settings.fencingToken : 0,
      state: "CANDIDATE",
      executionAuthorityGranted: false,
      businessAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    state.workClaims.set(claim.coordinationRecordId, claim);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_WORK_CLAIM_CANDIDATE_CREATED", "Candidate", { claim: internal.clone(claim) });
  }

  function createIdempotencyKey(scope) {
    return internal.nextId("EXTERNAL-010-IDEMPOTENCY-" + internal.text(scope, "WORK").toUpperCase().replace(/[^A-Z0-9]+/g, "-"));
  }

  function getClockQuality() {
    const perfAvailable = Boolean(global.performance && typeof global.performance.now === "function");
    return {
      clockState: "CLOCK_UNVERIFIED",
      measuredAt: internal.nowIso(),
      referenceSource: "LOCAL_RUNTIME_ONLY",
      monotonicClockAvailable: perfAvailable,
      estimatedSkewMs: null,
      uncertaintyMs: null,
      temporalCriticalAuthorityGranted: false
    };
  }

  function getPythonWorkerCapability() {
    return {
      capabilityId: "EXTERNAL-010-PYTHON-WORKER",
      configured: false,
      state: "UNAVAILABLE",
      role: "OPTIONAL_ANALYTICAL_WORKER",
      externalNetworkAuthority: false,
      secretAuthority: false,
      tradingAuthority: false,
      canonicalRepositoryMutationAuthority: false,
      invocationRequiresGovernedJob: true
    };
  }

  function createUnknownExecutionState(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    return internal.deepFreeze({
      coordinationRecordId: internal.nextId("EXTERNAL-010-UNKNOWN-EXECUTION"),
      recordType: "UNKNOWN_EXECUTION_STATE",
      workItemId: internal.text(settings.workItemId, "unknown"),
      requestId: internal.text(settings.requestId, ""),
      idempotencyKey: internal.text(settings.idempotencyKey, ""),
      state: "UNKNOWN_EXECUTION_STATE",
      blindRetryAllowed: false,
      verificationRequiredBeforeRetry: true,
      createdAt: internal.nowIso(),
      immutable: true
    });
  }

  function initializeExternalIntelligenceRuntimeCoordination() {
    if (!state.runtimeInstances.size) {
      const browser = createRuntimeIdentity({ runtimeType: "BROWSER_CLIENT", healthState: "READY" });
      if (browser.ok) registerRuntimeIdentity(browser.data.runtime);
    }
    namespace.modules.runtimeCoordination.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_RUNTIME_COORDINATION_INITIALIZED", "Ready", {
      runtimeCount: state.runtimeInstances.size,
      leaseCount: state.runtimeLeases.size,
      workClaimCount: state.workClaims.size,
      singleWriterHook: true,
      leaderLeaseHook: true,
      fencingTokenHook: true,
      idempotencyHook: true,
      blindRetryUnknownExecutionAllowed: false,
      pythonWorker: getPythonWorkerCapability()
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceRuntimeCoordination: initializeExternalIntelligenceRuntimeCoordination,
    createExternalIntelligenceRuntimeIdentity: createRuntimeIdentity,
    registerExternalIntelligenceRuntimeIdentity: registerRuntimeIdentity,
    getExternalIntelligenceRuntimeIdentity: getRuntimeIdentity,
    listExternalIntelligenceRuntimeIdentities: listRuntimeIdentities,
    createExternalIntelligenceLeaderLeaseCandidate: createLeaderLeaseCandidate,
    createExternalIntelligenceWorkClaimCandidate: createWorkClaimCandidate,
    createExternalIntelligenceIdempotencyKey: createIdempotencyKey,
    getExternalIntelligenceClockQuality: getClockQuality,
    getExternalIntelligencePythonWorkerCapability: getPythonWorkerCapability,
    createExternalIntelligenceUnknownExecutionState: createUnknownExecutionState
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.runtimeCoordination = {
    id: "EXTERNAL-010-RUNTIME-COORDINATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    stableRuntimeIdentity: true,
    singleWriterHook: true,
    leaderLeaseHook: true,
    fencingTokenHook: true,
    idempotencyHook: true,
    pythonWorkerOptional: true,
    businessAuthorityFromLeadership: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
