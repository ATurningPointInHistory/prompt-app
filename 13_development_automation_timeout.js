/* ============================================================
   FILE: 13_development_automation_timeout.js
   IDE-190 Development Automation
   Release: 1.6.0 / Module: Timeout 1.0.0
   Phase 7: Failure / Timeout / Recovery
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 timeout module blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("timeout");

  function ensureRuntimeState() {
    if (!(state.timeoutWatches instanceof Map)) state.timeoutWatches = new Map();
    if (!(state.timeoutRecords instanceof Map)) state.timeoutRecords = new Map();
    if (!Object.prototype.hasOwnProperty.call(state, "latestTimeoutWatchId")) state.latestTimeoutWatchId = null;
    if (!Object.prototype.hasOwnProperty.call(state, "latestTimeoutRecordId")) state.latestTimeoutRecordId = null;
  }
  ensureRuntimeState();

  function markRepositoryUntrusted(reason, sourceRecordId) {
    state.repositoryMutationTrust = {
      status: "Untrusted",
      reason: internal.text(reason, "Timed-out mutation requires Repository recovery verification."),
      mutationTrialId: internal.text(sourceRecordId, "") || null,
      rollbackId: null,
      markedAt: internal.nowIso()
    };
    internal.touch();
  }

  function startAutomationTimeoutWatch(input) {
    ensureRuntimeState();
    const source = internal.isPlainObject(input) ? input : {};
    const timeoutMs = Number(source.timeoutMs);
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      return internal.buildResult(false, "IDE190_TIMEOUT_EXPLICIT_DURATION_REQUIRED", "Blocked", {
        timeoutDefaultConfigured: false,
        required: "positive integer timeoutMs"
      });
    }
    const operationId = internal.text(source.operationId, "");
    const operationType = internal.text(source.operationType, "");
    if (!operationId || !operationType) {
      return internal.buildResult(false, "IDE190_TIMEOUT_OPERATION_REQUIRED", "Blocked", null);
    }
    const startedAtMs = Number.isFinite(Number(source.startedAtMs)) ? Number(source.startedAtMs) : Date.now();
    const watch = {
      timeoutWatchId: internal.nextId("IDE-190-TIMEOUT-WATCH"),
      operationId: operationId,
      operationType: operationType,
      timeoutMs: timeoutMs,
      startedAtMs: startedAtMs,
      deadlineAtMs: startedAtMs + timeoutMs,
      mutationPossible: source.mutationPossible === true,
      status: "Watching",
      defaultTimeoutUsed: false,
      createdAt: internal.nowIso()
    };
    state.timeoutWatches.set(watch.timeoutWatchId, watch);
    state.latestTimeoutWatchId = watch.timeoutWatchId;
    internal.touch();
    return internal.buildResult(true, "IDE190_TIMEOUT_WATCH_STARTED", "Watching", { timeoutWatch: internal.clone(watch) });
  }

  function evaluateAutomationTimeoutWatch(timeoutWatchId, input) {
    ensureRuntimeState();
    const watch = state.timeoutWatches.get(internal.text(timeoutWatchId, ""));
    if (!watch) return internal.buildResult(false, "IDE190_TIMEOUT_WATCH_NOT_FOUND", "Blocked", null);
    if (watch.status !== "Watching") {
      const existing = Array.from(state.timeoutRecords.values()).find(function find(item) { return item.timeoutWatchId === watch.timeoutWatchId; }) || null;
      return internal.buildResult(true, "IDE190_TIMEOUT_WATCH_ALREADY_FINAL", watch.status, { timeoutWatch: internal.clone(watch), timeoutRecord: internal.clone(existing) });
    }
    const source = internal.isPlainObject(input) ? input : {};
    const nowMs = Number.isFinite(Number(source.nowMs)) ? Number(source.nowMs) : Date.now();
    const elapsedMs = Math.max(0, nowMs - watch.startedAtMs);
    if (nowMs < watch.deadlineAtMs) {
      return internal.buildResult(true, "IDE190_TIMEOUT_NOT_EXPIRED", "Watching", {
        timeoutWatch: internal.clone(watch), elapsedMs: elapsedMs, remainingMs: watch.deadlineAtMs - nowMs
      });
    }

    const mutationStarted = source.mutationStarted === true;
    const rollbackVerified = source.rollbackVerified === true;
    const sourceRestored = source.sourceRestored === true;
    const recoveryRequired = mutationStarted && (!rollbackVerified || !sourceRestored);
    watch.status = "Timed-Out";
    watch.completedAt = internal.nowIso();
    const timeoutRecordId = internal.nextId("IDE-190-TIMEOUT");
    const failureResult = typeof namespace.createAutomationFailureRecord === "function" ? namespace.createAutomationFailureRecord({
      sourcePhase: VERSION_MANIFEST.implementation.phase,
      sourceRecordId: internal.text(source.sourceRecordId, "") || timeoutRecordId,
      category: "Execution",
      directCause: "Operation exceeded the explicitly configured timeout.",
      mutationStarted: mutationStarted,
      rollbackVerified: rollbackVerified,
      sourceRestored: sourceRestored,
      outcome: "Timed-Out",
      evidence: [{ type: "Timeout Watch", id: watch.timeoutWatchId, operationId: watch.operationId, timeoutMs: watch.timeoutMs, elapsedMs: elapsedMs }]
    }) : null;
    if (!failureResult || failureResult.ok !== true || !failureResult.data || !failureResult.data.failure) {
      return internal.buildResult(false, "IDE190_TIMEOUT_FAILURE_RECORD_REQUIRED", "Blocked", { failureResult: internal.clone(failureResult) });
    }
    const record = {
      timeoutRecordId: timeoutRecordId,
      failureRecordId: failureResult.data.failure.failureRecordId,
      timeoutWatchId: watch.timeoutWatchId,
      operationId: watch.operationId,
      operationType: watch.operationType,
      timeoutMs: watch.timeoutMs,
      elapsedMs: elapsedMs,
      outcome: "Timed-Out",
      mutationPossible: watch.mutationPossible === true,
      mutationStarted: mutationStarted,
      rollbackVerified: rollbackVerified,
      sourceRestored: sourceRestored,
      recoveryRequired: recoveryRequired,
      automaticRetryAllowed: false,
      repositoryTrustStatus: recoveryRequired ? "Untrusted" : (state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted"),
      immutable: true,
      createdAt: internal.nowIso()
    };
    if (recoveryRequired) markRepositoryUntrusted("Mutation operation timed out without verified rollback/restoration.", source.sourceRecordId || watch.operationId);
    record.repositoryTrustStatus = state.repositoryMutationTrust && state.repositoryMutationTrust.status || record.repositoryTrustStatus;
    const contract = namespace.validateContract("timeoutRecord", record);
    if (!contract.valid) return internal.buildResult(false, "IDE190_TIMEOUT_CONTRACT_INVALID", "Blocked", { validation: contract });
    const frozen = internal.deepFreeze(internal.clone(record));
    state.timeoutRecords.set(frozen.timeoutRecordId, frozen);
    state.latestTimeoutRecordId = frozen.timeoutRecordId;
    internal.touch();
    return internal.buildResult(true, "IDE190_OPERATION_TIMED_OUT", "Timed-Out", {
      timeoutWatch: internal.clone(watch), timeoutRecord: internal.clone(frozen), validation: contract
    });
  }

  function cancelAutomationTimeoutWatch(timeoutWatchId, input) {
    ensureRuntimeState();
    const watch = state.timeoutWatches.get(internal.text(timeoutWatchId, ""));
    if (!watch) return internal.buildResult(false, "IDE190_TIMEOUT_WATCH_NOT_FOUND", "Blocked", null);
    if (watch.status !== "Watching") return internal.buildResult(false, "IDE190_TIMEOUT_WATCH_NOT_ACTIVE", "Blocked", { timeoutWatch: internal.clone(watch) });
    const source = internal.isPlainObject(input) ? input : {};
    if (source.operationCompleted !== true) return internal.buildResult(false, "IDE190_TIMEOUT_COMPLETION_EVIDENCE_REQUIRED", "Blocked", null);
    watch.status = "Completed";
    watch.completedAt = internal.nowIso();
    internal.touch();
    return internal.buildResult(true, "IDE190_TIMEOUT_WATCH_COMPLETED", "Completed", { timeoutWatch: internal.clone(watch) });
  }

  function getAutomationTimeoutRecord(id) {
    ensureRuntimeState();
    const key = internal.text(id, state.latestTimeoutRecordId || "");
    return internal.clone(state.timeoutRecords.get(key) || null);
  }
  function getAutomationTimeoutWatch(id) {
    ensureRuntimeState();
    const key = internal.text(id, state.latestTimeoutWatchId || "");
    return internal.clone(state.timeoutWatches.get(key) || null);
  }

  function initializeTimeout() {
    ensureRuntimeState();
    namespace.modules.timeout.status = "Ready";
    return internal.buildResult(true, "IDE190_TIMEOUT_INITIALIZED", "Ready", {
      defaultTimeoutConfigured: false,
      timeoutDurationMustBeExplicit: true,
      automaticCancellationImplemented: false
    });
  }

  Object.assign(namespace.api, {
    initializeTimeout: initializeTimeout,
    startAutomationTimeoutWatch: startAutomationTimeoutWatch,
    evaluateAutomationTimeoutWatch: evaluateAutomationTimeoutWatch,
    cancelAutomationTimeoutWatch: cancelAutomationTimeoutWatch,
    getAutomationTimeoutRecord: getAutomationTimeoutRecord,
    getAutomationTimeoutWatch: getAutomationTimeoutWatch
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.timeout = {
    id: "IDE-190-TIMEOUT",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 7,
    explicitTimeoutRequired: true,
    defaultTimeoutMs: null,
    automaticCancellationImplemented: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
