/* ============================================================
   FILE: 17_external_intelligence_disaster_recovery.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.19.0
   Phase 20: Capability Resilience / Disaster Recovery
   Primary Decision: 052
   Supporting Decisions: 013 / 051 / 054
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("disasterRecovery");

  ["recoveryPointRecords", "recoveryOperations", "queueRecoveryReconciliations", "watchRecoveryReconciliations", "restoreValidationRecords"].forEach(function ensureMap(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });
  if (!state.recoveryEpochState || typeof state.recoveryEpochState !== "object") {
    state.recoveryEpochState = { recoveryEpoch: null, updatedAt: null };
  }

  const DEFINITIONS = [
    ["recoveryPointRecord", "EXTERNAL-010-CONTRACT-RECOVERY-POINT", "EXTERNAL-010-SCHEMA-RECOVERY-POINT", [
      "recoveryPointId", "recoveryPointType", "createdAt", "recoveryPointState", "manifestHash", "applicationConsistentSnapshot",
      "credentialMaterialPresent", "secretValuesIncluded", "gatewaySessionTokensIncluded", "backupExistsEqualsRecoveryProven", "immutable"
    ]],
    ["queueRecoveryReconciliation", "EXTERNAL-010-CONTRACT-QUEUE-RECOVERY-RECONCILIATION", "EXTERNAL-010-SCHEMA-QUEUE-RECOVERY-RECONCILIATION", [
      "queueRecoveryReconciliationId", "createdAt", "items", "runningRestoredAsActive", "blindRetryAllowed", "unknownExecutionPreserved", "immutable"
    ]],
    ["watchRecoveryReconciliation", "EXTERNAL-010-CONTRACT-WATCH-RECOVERY-RECONCILIATION", "EXTERNAL-010-SCHEMA-WATCH-RECOVERY-RECONCILIATION", [
      "watchRecoveryReconciliationId", "createdAt", "items", "monitoringGapPreserved", "unlimitedCatchupAllowed", "immutable"
    ]],
    ["restoreValidationRecord", "EXTERNAL-010-CONTRACT-RESTORE-VALIDATION", "EXTERNAL-010-SCHEMA-RESTORE-VALIDATION", [
      "restoreValidationId", "recoveryPointId", "recoveryEpoch", "physicalIntegrityState", "policyReconciliationState",
      "queueReconciliationState", "watchReconciliationState", "sessionIsolationState", "secretBoundaryState", "lineageIntegrityState",
      "schemaCompatibilityState", "recoveryState", "platformReady", "partialRecovery", "filesRestoredEqualsPlatformReady",
      "recoveryEqualsAuthority", "validatedAt", "immutable"
    ]]
  ];

  function registerDefinitions() {
    const results = [];
    DEFINITIONS.forEach(function register(definition) {
      const key = definition[0], contractId = definition[1], schemaId = definition[2], fields = definition[3];
      if (typeof namespace.registerExternalIntelligenceContract === "function") {
        results.push(namespace.registerExternalIntelligenceContract({
          contractId, key, name: key + " Contract", version: MODULE_VERSION, immutable: true,
          fields: fields.map(function field(name) { return { name, required: true }; }), source: "phase20"
        }));
      }
      if (typeof namespace.registerExternalIntelligenceSchema === "function") {
        results.push(namespace.registerExternalIntelligenceSchema({
          schemaId, name: key + " Schema", version: MODULE_VERSION, type: "object", required: fields,
          properties: Object.fromEntries(fields.map(function prop(name) { return [name, {}]; })),
          additionalProperties: true, immutable: true, owner: "EXTERNAL-010", source: "phase20"
        }));
      }
    });
    return results;
  }
  registerDefinitions();

  function clone(value) { return internal.clone(value); }
  function upper(value, fallback) { return internal.text(value, fallback || "").toUpperCase(); }
  function passState(value) { return ["PASS", "PASS_WITH_WARNINGS", "READY"].includes(upper(value, "UNKNOWN")); }
  function validateRecord(contractKey, schemaId, record) {
    const cv = namespace.validateExternalIntelligenceContract(contractKey, record);
    const sv = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return { valid: cv.valid === true && sv.valid === true, contract: cv, schema: sv };
  }
  async function audit(eventType, outcome, details, references) {
    if (typeof namespace.appendExternalIntelligenceAuditEvent !== "function") return null;
    return namespace.appendExternalIntelligenceAuditEvent({ eventType, actor: "EXTERNAL-010-PHASE20-RECOVERY", outcome: outcome || "Recorded", details: clone(details || {}), references: internal.unique(references || []) });
  }

  function recordRecoveryPointFromGateway(manifest) {
    const m = internal.isPlainObject(manifest) ? manifest : {};
    const record = internal.deepFreeze({
      recoveryPointId: internal.text(m.recoveryPointId, ""),
      recoveryPointType: upper(m.recoveryPointType, "CHECKPOINT"),
      createdAt: internal.text(m.createdAt, "") || internal.nowIso(),
      recoveryPointState: upper(m.recoveryPointState, "UNKNOWN"),
      manifestHash: internal.text(m.manifestHash, ""),
      applicationConsistentSnapshot: m.applicationConsistentSnapshot === true,
      credentialMaterialPresent: m.credentialMaterialPresent === true,
      secretValuesIncluded: m.secretValuesIncluded === true,
      gatewaySessionTokensIncluded: m.gatewaySessionTokensIncluded === true,
      backupExistsEqualsRecoveryProven: false,
      immutable: true
    });
    if (!record.recoveryPointId || !record.manifestHash || record.credentialMaterialPresent || record.secretValuesIncluded || record.gatewaySessionTokensIncluded) {
      return internal.buildResult(false, "EXTERNAL010_RECOVERY_POINT_BOUNDARY_INVALID", "Blocked", { recoveryPoint: clone(record) });
    }
    const validation = validateRecord("recoveryPointRecord", "EXTERNAL-010-SCHEMA-RECOVERY-POINT", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_RECOVERY_POINT_RECORD_INVALID", "Blocked", validation);
    state.recoveryPointRecords.set(record.recoveryPointId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RECOVERY_POINT_RECORDED", record.recoveryPointState, { recoveryPoint: clone(record) });
  }

  function snapshotQueueForRecovery() {
    const jobs = typeof namespace.listExternalIntelligenceAcquisitionJobs === "function" ? namespace.listExternalIntelligenceAcquisitionJobs() : [];
    return {
      capturedAt: internal.nowIso(),
      items: jobs.map(function map(job) {
        return { jobId: job.jobId, requestId: job.requestId, status: job.status, scheduledAt: job.scheduledAt || null, attemptCount: job.attemptCount || 0, idempotencyKey: job.idempotencyKey || null };
      }),
      restoredRunningWorkBecomesActive: false,
      blindRetryAllowed: false
    };
  }

  function snapshotWatchesForRecovery() {
    const watches = typeof namespace.listExternalIntelligenceMonitoringWatches === "function" ? namespace.listExternalIntelligenceMonitoringWatches() : [];
    return {
      capturedAt: internal.nowIso(),
      items: watches.map(function map(watch) {
        return { watchId: watch.watchId, watchState: watch.watchState, nextCheckAt: watch.nextCheckAt || null, lastCheckedAt: watch.lastCheckedAt || null, catchUpStrategy: watch.catchUpStrategy || "LATEST_ONLY" };
      }),
      overdueAutoCatchupAllowed: false,
      monitoringGapPreserved: true
    };
  }

  function buildQueueRecoveryReconciliation(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const jobs = Array.isArray(x.items) ? x.items : (x.queueSnapshot && Array.isArray(x.queueSnapshot.items) ? x.queueSnapshot.items : []);
    const items = jobs.map(function reconcile(job) {
      const original = upper(job.status, "UNKNOWN");
      let restored = original;
      let requiresVerification = false;
      let blindRetryAllowed = false;
      if (original === "RUNNING") { restored = "UNKNOWN_EXECUTION_STATE"; requiresVerification = true; }
      else if (["QUEUED", "WAITING", "RETRY_PENDING", "RECOVERING"].includes(original)) restored = "RECOVERING";
      return { jobId: job.jobId || null, requestId: job.requestId || null, originalStatus: original, restoredStatus: restored, requiresExternalVerification: requiresVerification, blindRetryAllowed };
    });
    const record = internal.deepFreeze({
      queueRecoveryReconciliationId: internal.nextId("EXTERNAL-010-QUEUE-RECOVERY"), createdAt: internal.nowIso(), items,
      runningRestoredAsActive: false, blindRetryAllowed: false,
      unknownExecutionPreserved: items.filter(function f(item) { return item.originalStatus === "RUNNING"; }).every(function f(item) { return item.restoredStatus === "UNKNOWN_EXECUTION_STATE"; }),
      immutable: true
    });
    const validation = validateRecord("queueRecoveryReconciliation", "EXTERNAL-010-SCHEMA-QUEUE-RECOVERY-RECONCILIATION", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_QUEUE_RECOVERY_RECONCILIATION_INVALID", "Blocked", validation);
    state.queueRecoveryReconciliations.set(record.queueRecoveryReconciliationId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_QUEUE_RECOVERY_RECONCILED", "Ready", { reconciliation: clone(record) });
  }

  function buildWatchRecoveryReconciliation(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watches = Array.isArray(x.items) ? x.items : (x.watchSnapshot && Array.isArray(x.watchSnapshot.items) ? x.watchSnapshot.items : []);
    const restoredAt = Date.parse(internal.text(x.restoredAt, "") || internal.nowIso());
    const items = watches.map(function reconcile(watch) {
      const next = Date.parse(String(watch.nextCheckAt || ""));
      const overdue = Number.isFinite(next) && next < restoredAt;
      return {
        watchId: watch.watchId || null,
        originalState: upper(watch.watchState, "UNKNOWN"),
        recoveryState: overdue ? "MONITORING_GAP" : "RECOVERING",
        overdue,
        catchUpStrategy: internal.text(watch.catchUpStrategy, "LATEST_ONLY"),
        unlimitedCatchupAllowed: false,
        noObservationEqualsNoChange: false
      };
    });
    const record = internal.deepFreeze({
      watchRecoveryReconciliationId: internal.nextId("EXTERNAL-010-WATCH-RECOVERY"), createdAt: internal.nowIso(), items,
      monitoringGapPreserved: true, unlimitedCatchupAllowed: false, immutable: true
    });
    const validation = validateRecord("watchRecoveryReconciliation", "EXTERNAL-010-SCHEMA-WATCH-RECOVERY-RECONCILIATION", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_WATCH_RECOVERY_RECONCILIATION_INVALID", "Blocked", validation);
    state.watchRecoveryReconciliations.set(record.watchRecoveryReconciliationId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_WATCH_RECOVERY_RECONCILED", "Ready", { reconciliation: clone(record) });
  }

  function createSelectiveRecomputeCandidates(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const missing = internal.unique(x.missingReferenceIds || []);
    const created = [];
    if (typeof namespace.analyzeExternalIntelligenceBlastRadius !== "function" || typeof namespace.createExternalIntelligenceRecomputeCandidate !== "function") {
      return internal.buildResult(true, "EXTERNAL010_SELECTIVE_RECOMPUTE_HOOK_UNAVAILABLE_NO_MUTATION", "Degraded", { missingReferenceIds: missing, candidates: [], automaticRecomputePerformed: false });
    }
    missing.forEach(function each(referenceId) {
      const blast = namespace.analyzeExternalIntelligenceBlastRadius({ referenceId: referenceId, maxDepth: 8 });
      const affected = blast && blast.ok && blast.data && Array.isArray(blast.data.affectedReferenceIds) ? blast.data.affectedReferenceIds : [];
      affected.forEach(function candidate(outputReferenceId) {
        const result = namespace.createExternalIntelligenceRecomputeCandidate({ inputReferenceId: referenceId, outputReferenceId: outputReferenceId, reason: "RECOVERY_INPUT_MISSING_OR_CORRUPTED", recomputeState: "CANDIDATE" });
        if (result && result.ok) created.push(result.data && result.data.recomputeCandidate || result.data);
      });
    });
    return internal.buildResult(true, "EXTERNAL010_SELECTIVE_RECOMPUTE_CANDIDATES_CREATED", "Ready", { missingReferenceIds: missing, candidates: created, automaticRecomputePerformed: false });
  }

  async function createExternalIntelligenceRecoveryPoint(input) {
    const x = internal.isPlainObject(input) ? clone(input) : {};
    if (typeof namespace.createExternalIntelligenceGatewayRecoveryPoint !== "function") return internal.buildResult(false, "EXTERNAL010_RECOVERY_GATEWAY_BRIDGE_REQUIRED", "Unavailable", null);
    if (!x.queueSnapshot) x.queueSnapshot = snapshotQueueForRecovery();
    if (!x.watchSnapshot) x.watchSnapshot = snapshotWatchesForRecovery();
    if (!x.policyProfile) x.policyProfile = { state: "REQUIRES_RECONCILIATION_ON_RESTORE" };
    if (!x.retentionProfile) x.retentionProfile = { state: "REQUIRES_RECONCILIATION_ON_RESTORE" };
    if (!x.privacyProfile) x.privacyProfile = { state: "REQUIRES_RECONCILIATION_ON_RESTORE" };
    const result = await namespace.createExternalIntelligenceGatewayRecoveryPoint(x);
    const response = result && result.data && result.data.response;
    const manifest = response && response.recovery && response.recovery.recoveryPoint;
    if (!result.ok || !manifest) return result;
    const recorded = recordRecoveryPointFromGateway(manifest);
    await audit("RECOVERY_POINT_REGISTERED", recorded.ok ? "Recorded" : "Blocked", { recoveryPointId: manifest.recoveryPointId, gatewayResult: result.ok, credentialMaterialPresent: false }, [manifest.recoveryPointId]);
    return internal.buildResult(recorded.ok, recorded.ok ? "EXTERNAL010_RECOVERY_POINT_CREATED" : recorded.code, recorded.ok ? manifest.recoveryPointState : "Blocked", { gateway: clone(response.recovery), recoveryPoint: recorded.data && recorded.data.recoveryPoint });
  }

  async function validateExternalIntelligenceRecoveryPoint(input) {
    if (typeof namespace.validateExternalIntelligenceGatewayRecoveryPoint !== "function") return internal.buildResult(false, "EXTERNAL010_RECOVERY_GATEWAY_BRIDGE_REQUIRED", "Unavailable", null);
    return namespace.validateExternalIntelligenceGatewayRecoveryPoint(input);
  }

  async function runExternalIntelligenceRestoreDrill(input) {
    if (typeof namespace.restoreExternalIntelligenceGatewayRecoveryPoint !== "function") return internal.buildResult(false, "EXTERNAL010_RECOVERY_GATEWAY_BRIDGE_REQUIRED", "Unavailable", null);
    const x = Object.assign({}, clone(input || {}), { mode: "DRILL" });
    const result = await namespace.restoreExternalIntelligenceGatewayRecoveryPoint(x);
    const response = result && result.data && result.data.response;
    const recovery = response && response.recovery;
    const pass = result.ok && recovery && recovery.state === "RESTORE_DRILL_PASS" && recovery.platformReady === false;
    await audit("RECOVERY_RESTORE_DRILL_COMPLETED", pass ? "PASS" : "FAIL", { recoveryPointId: x.recoveryPointId || null, platformReady: false, canonicalMutationPerformed: false }, [x.recoveryPointId].filter(Boolean));
    return result;
  }

  async function activateExternalIntelligencePhysicalRestore(input) {
    if (typeof namespace.restoreExternalIntelligenceGatewayRecoveryPoint !== "function") return internal.buildResult(false, "EXTERNAL010_RECOVERY_GATEWAY_BRIDGE_REQUIRED", "Unavailable", null);
    const x = Object.assign({}, clone(input || {}), { mode: "ACTIVATE" });
    const result = await namespace.restoreExternalIntelligenceGatewayRecoveryPoint(x);
    const response = result && result.data && result.data.response;
    const recovery = response && response.recovery;
    if (result.ok && recovery && recovery.recoveryEpoch) {
      state.recoveryEpochState = { recoveryEpoch: recovery.recoveryEpoch, updatedAt: internal.nowIso() };
      internal.touch();
    }
    return result;
  }

  function validateExternalIntelligenceRestoredState(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const physical = upper(x.physicalIntegrityState, "UNKNOWN");
    const policy = upper(x.policyReconciliationState, "UNKNOWN");
    const queue = upper(x.queueReconciliationState, "UNKNOWN");
    const watch = upper(x.watchReconciliationState, "UNKNOWN");
    const session = upper(x.sessionIsolationState, "UNKNOWN");
    const secret = upper(x.secretBoundaryState, "UNKNOWN");
    const lineage = upper(x.lineageIntegrityState, "UNKNOWN");
    const schema = upper(x.schemaCompatibilityState, "UNKNOWN");
    const required = [physical, policy, queue, watch, session, secret, lineage, schema];
    const anyFail = required.some(function f(v) { return ["FAIL", "BLOCKED", "INVALID", "CORRUPTED"].includes(v); });
    const anyUnknown = required.some(function f(v) { return ["UNKNOWN", "NOT_EVALUATED", "PENDING"].includes(v); });
    const warnings = required.some(function f(v) { return ["PASS_WITH_WARNINGS", "DEGRADED", "PARTIAL"].includes(v); });
    let recoveryState = "READY";
    if (anyFail) recoveryState = "BLOCKED";
    else if (anyUnknown) recoveryState = "PARTIAL_RECOVERY";
    else if (warnings) recoveryState = "DEGRADED";
    const platformReady = recoveryState === "READY" || recoveryState === "DEGRADED";
    const record = internal.deepFreeze({
      restoreValidationId: internal.text(x.restoreValidationId, "") || internal.nextId("EXTERNAL-010-RESTORE-VALIDATION"),
      recoveryPointId: internal.text(x.recoveryPointId, ""),
      recoveryEpoch: internal.text(x.recoveryEpoch, "") || state.recoveryEpochState.recoveryEpoch || null,
      physicalIntegrityState: physical, policyReconciliationState: policy, queueReconciliationState: queue, watchReconciliationState: watch,
      sessionIsolationState: session, secretBoundaryState: secret, lineageIntegrityState: lineage, schemaCompatibilityState: schema,
      recoveryState, platformReady, partialRecovery: recoveryState === "PARTIAL_RECOVERY",
      filesRestoredEqualsPlatformReady: false, recoveryEqualsAuthority: false, validatedAt: internal.nowIso(), immutable: true
    });
    const validation = validateRecord("restoreValidationRecord", "EXTERNAL-010-SCHEMA-RESTORE-VALIDATION", record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_RESTORE_VALIDATION_RECORD_INVALID", "Blocked", validation);
    state.restoreValidationRecords.set(record.restoreValidationId, record); internal.touch();
    audit(platformReady ? "RECOVERY_VALIDATION_PASS" : "RECOVERY_VALIDATION_NOT_READY", platformReady ? recoveryState : "Blocked", {
      recoveryPointId: record.recoveryPointId, recoveryEpoch: record.recoveryEpoch, platformReady, recoveryState, recoveryEqualsAuthority: false
    }, [record.recoveryPointId].filter(Boolean));
    return internal.buildResult(platformReady, platformReady ? "EXTERNAL010_RESTORED_STATE_VALIDATED" : "EXTERNAL010_RESTORED_STATE_NOT_READY", recoveryState, { restoreValidation: clone(record) });
  }

  function getExternalIntelligenceRecoveryPoint(id) {
    const record = state.recoveryPointRecords.get(internal.text(id, ""));
    return record ? clone(record) : null;
  }
  function listExternalIntelligenceRecoveryPoints() { return Array.from(state.recoveryPointRecords.values()).map(clone); }
  function getExternalIntelligenceRecoveryEpoch() { return clone(state.recoveryEpochState); }

  function initializeExternalIntelligenceDisasterRecovery() {
    registerDefinitions();
    namespace.modules.disasterRecovery.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_DISASTER_RECOVERY_INITIALIZED", "Ready", {
      decision: "052", backupExistsEqualsRecoveryProven: false, filesRestoredEqualsPlatformReady: false,
      restoredSessionRecordEqualsCurrentAuthentication: false, evidenceBackupMayReconstructCredential: false,
      automaticOrphanDeletionAllowed: false, automaticBlindRetryAllowed: false, automaticPolicyReactivationAllowed: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceDisasterRecovery,
    createExternalIntelligenceRecoveryPoint,
    validateExternalIntelligenceRecoveryPoint,
    runExternalIntelligenceRestoreDrill,
    activateExternalIntelligencePhysicalRestore,
    validateExternalIntelligenceRestoredState,
    buildExternalIntelligenceQueueRecoveryReconciliation: buildQueueRecoveryReconciliation,
    buildExternalIntelligenceWatchRecoveryReconciliation: buildWatchRecoveryReconciliation,
    createExternalIntelligenceSelectiveRecomputeCandidates: createSelectiveRecomputeCandidates,
    recordExternalIntelligenceRecoveryPointFromGateway: recordRecoveryPointFromGateway,
    getExternalIntelligenceRecoveryPoint,
    listExternalIntelligenceRecoveryPoints,
    getExternalIntelligenceRecoveryEpoch
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.disasterRecovery = {
    id: "EXTERNAL-010-DISASTER-RECOVERY", version: MODULE_VERSION, status: "Loaded", phase: 20, decisions: ["052", "013", "051", "054"],
    backupExistsEqualsRecoveryProven: false, filesRestoredEqualsPlatformReady: false, partialRecoveryEqualsFullRecovery: false,
    restoredSessionRecordEqualsCurrentAuthentication: false, secretReconstructionAllowed: false, automaticOrphanDeletionAllowed: false,
    automaticBlindRetryAllowed: false, recoveryEqualsBusinessAuthority: false, loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
