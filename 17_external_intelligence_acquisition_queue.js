/* ============================================================
   FILE: 17_external_intelligence_acquisition_queue.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 04: Immediate Execution / Governed Queue / Scheduler
   Decision: 016
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 acquisition queue blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("acquisitionQueue");
  const ACQ = VERSION_MANIFEST.acquisition;
  const PRIORITY_WEIGHT = { CRITICAL: 5, HIGH: 4, NORMAL: 3, LOW: 2, BACKGROUND: 1 };

  function sleep(ms) { return new Promise(function wait(resolve) { setTimeout(resolve, Math.max(0, ms)); }); }

  function queuePersistenceAdapterValid(adapter) {
    return adapter && typeof adapter.writeJob === "function" && typeof adapter.readJob === "function" && typeof adapter.writeCheckpoint === "function";
  }

  function setExternalIntelligenceAcquisitionQueuePersistenceAdapter(adapter) {
    if (adapter == null) { state.acquisitionQueuePersistenceAdapter = null; internal.touch(); return internal.buildResult(true, "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_CLEARED", "Ready", null); }
    if (!queuePersistenceAdapterValid(adapter)) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_INVALID", "Blocked", null);
    state.acquisitionQueuePersistenceAdapter = adapter;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_SET", "Ready", { adapterId: internal.text(adapter.adapterId, "EXTERNAL-010-QUEUE-PERSISTENCE"), authorityGranted: false });
  }

  function buildBrowserLocalStorageAdapter() {
    if (!global.localStorage) return null;
    const prefix = "EXTERNAL010_QUEUE_V1:";
    return {
      adapterId: "EXTERNAL-010-BROWSER-LOCALSTORAGE-QUEUE",
      async writeJob(job) { global.localStorage.setItem(prefix + "JOB:" + job.jobId, JSON.stringify(internal.redactSensitive(job))); return { written: true }; },
      async readJob(jobId) { const raw = global.localStorage.getItem(prefix + "JOB:" + jobId); return raw ? JSON.parse(raw) : null; },
      async writeCheckpoint(checkpoint) { global.localStorage.setItem(prefix + "CHECKPOINT:" + checkpoint.checkpointId, JSON.stringify(internal.redactSensitive(checkpoint))); return { written: true }; }
    };
  }

  async function persistJob(job) {
    const adapter = state.acquisitionQueuePersistenceAdapter;
    if (!queuePersistenceAdapterValid(adapter)) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_REQUIRED", "Blocked", { jobId: job.jobId, persistentQueueMetadata: false });
    try {
      await adapter.writeJob(internal.clone(job));
      const readback = await adapter.readJob(job.jobId);
      const verified = Boolean(readback && readback.jobId === job.jobId && readback.requestId === job.requestId && readback.status === job.status);
      return internal.buildResult(verified, verified ? "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_VERIFIED" : "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_READBACK_FAILED", verified ? "Ready" : "Blocked", { jobId: job.jobId, readBackVerified: verified });
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_FAILED", "Failed", { jobId: job.jobId }, { error: { message: error && error.message || String(error), category: "Persistence" } });
    }
  }

  function planExternalIntelligenceAcquisitionExecution(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const request = state.acquisitionRequests.get(internal.text(settings.requestId, ""));
    if (!request) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_PLAN_REQUEST_NOT_FOUND", "Blocked", null);
    const operationContract = internal.getExternalIntelligenceSourceOperationContract(request.sourceId, request.operationId);
    if (!operationContract) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_PLAN_OPERATION_CONTRACT_MISSING", "Blocked", null);
    let mode = request.executionPreference;
    if (mode === "AUTO") mode = operationContract.executionHints.backgroundPreferred || operationContract.executionHints.longRunning || operationContract.executionHints.batch || operationContract.executionHints.expectedResponseSize === "LARGE" ? "BACKGROUND" : "IMMEDIATE";
    const decision = mode === "BACKGROUND" ? "QUEUE" : mode === "IMMEDIATE" ? "IMMEDIATE" : "BLOCKED";
    return internal.buildResult(decision !== "BLOCKED", decision === "QUEUE" ? "EXTERNAL010_ACQUISITION_EXECUTION_QUEUE" : decision === "IMMEDIATE" ? "EXTERNAL010_ACQUISITION_EXECUTION_IMMEDIATE" : "EXTERNAL010_ACQUISITION_EXECUTION_BLOCKED", decision === "BLOCKED" ? "Blocked" : "Ready", { requestId: request.requestId, executionPreference: request.executionPreference, executionDecision: decision, modeChangeGrantsAuthority: false, schedulerMayInventResearchGoal: false, schedulerMayInventAcquisitionPurpose: false });
  }

  function errorRetryable(request, adapterError, attemptNumber) {
    const category = String(adapterError && adapterError.category || "UNKNOWN").toUpperCase();
    return Boolean(adapterError && adapterError.retryable) && request.retryPolicy.retryableCategories.includes(category) && attemptNumber < request.retryPolicy.maxAttempts;
  }

  function retryDelay(policy, attemptNumber) {
    if (policy.backoffPolicy === "NONE") return 0;
    const multiplier = policy.backoffPolicy === "EXPONENTIAL" ? Math.pow(2, Math.max(0, attemptNumber - 1)) : Math.max(1, attemptNumber);
    return Math.min(policy.maxDelayMs, policy.initialDelayMs * multiplier);
  }

  async function executeExternalIntelligenceAcquisition(input) {
    const settings = internal.isPlainObject(input) ? input : { requestId: input };
    const request = state.acquisitionRequests.get(internal.text(settings.requestId, ""));
    if (!request) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_EXECUTION_REQUEST_NOT_FOUND", "Blocked", null);
    let finalError = null;
    let finalResponse = null;
    let attempts = 0;
    const startedAt = Date.now();

    for (let attemptNumber = 1; attemptNumber <= request.retryPolicy.maxAttempts; attemptNumber += 1) {
      const validation = namespace.validateExternalIntelligenceAcquisitionRequest({ requestId: request.requestId, authorityAction: "EXECUTE_EXTERNAL_ACQUISITION", requireExecutionAuthority: true });
      if (!validation.ok) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_PREEXECUTION_REVALIDATION_FAILED", "Blocked", { requestId: request.requestId, validation: validation, retryCanBypassPolicy: false });
      const routeResult = namespace.resolveExternalIntelligenceAcquisitionRoute({ requestId: request.requestId });
      if (!routeResult.ok) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ROUTE_FAILED", "Blocked", { requestId: request.requestId, route: routeResult, fallbackPerformed: false });
      const routeData = routeResult.data;
      const attemptStart = internal.createExternalIntelligenceAcquisitionAttempt({ requestId: request.requestId, attemptNumber: attemptNumber, adapterId: routeData.adapter.adapterId, adapterVersion: routeData.adapter.adapterVersion, routeId: routeData.route.routeId });
      if (!attemptStart.ok) return attemptStart;
      attempts += 1;
      const attempt = attemptStart.data.attempt;
      const adapterResult = await internal.invokeExternalIntelligenceAdapter({ request: internal.clone(request), source: routeData.source, operationContract: routeData.operationContract, route: routeData.route, adapter: routeData.adapter, attempt: attempt });
      if (adapterResult.ok) {
        const responseBuild = namespace.buildExternalIntelligenceAcquisitionResponse({ requestId: request.requestId, attemptId: attempt.attemptId, sourceId: request.sourceId, operationId: request.operationId, status: "SUCCESS", responseMetadata: adapterResult.data.responseMetadata, temporalMetadata: adapterResult.data.temporalMetadata, payload: adapterResult.data.raw && adapterResult.data.raw.payload, evidenceInput: adapterResult.data.evidenceInput });
        if (!responseBuild.ok) return responseBuild;
        finalResponse = responseBuild.data.response;
        internal.completeExternalIntelligenceAcquisitionAttempt(attempt.attemptId, { status: "SUCCESS", retryable: false, responseId: finalResponse.responseId });
        break;
      }

      const errorData = adapterResult.data && adapterResult.data.error || { errorCode: "EXTERNAL_ACQUISITION_FAILED", category: "UNKNOWN", message: "External acquisition failed", retryable: false };
      const mapped = namespace.mapExternalIntelligenceAcquisitionError(Object.assign({}, errorData, { sourceId: request.sourceId, operationId: request.operationId, requestId: request.requestId, attemptId: attempt.attemptId }));
      finalError = mapped.ok ? mapped.data.error : errorData;
      const retryable = errorRetryable(request, finalError, attemptNumber);
      internal.completeExternalIntelligenceAcquisitionAttempt(attempt.attemptId, { status: "FAILED", retryable: retryable, errorId: finalError.errorId || null });
      if (!retryable) break;
      const delay = retryDelay(request.retryPolicy, attemptNumber);
      if (delay > 0) await sleep(delay);
    }

    const elapsed = Date.now() - startedAt;
    if (request.budgetIds.length && typeof namespace.recordExternalIntelligenceResourceUsage === "function") {
      const bytes = finalResponse && finalResponse.responseMetadata && Number(finalResponse.responseMetadata.responseSize) || 0;
      await namespace.recordExternalIntelligenceResourceUsage({ budgetIds: request.budgetIds, sourceId: request.sourceId, operationId: request.operationId, goalId: request.researchGoalId, planId: request.acquisitionPlanId, estimatedUsage: internal.getExternalIntelligenceSourceOperationContract(request.sourceId, request.operationId).estimatedUsage, actualUsage: { REQUEST_COUNT: attempts, NETWORK_BYTES: bytes, PROCESSING_TIME: elapsed } });
    }
    if (finalResponse) {
      if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "EXTERNAL_ACQUISITION_COMPLETED", actor: "Acquisition Execution Layer", outcome: "Completed", details: { requestId: request.requestId, responseId: finalResponse.responseId, attemptCount: attempts, knowledgePromotionPerformed: false, canonicalRepositoryMutationPerformed: false } });
      return internal.buildResult(true, "EXTERNAL010_ACQUISITION_COMPLETED", "Completed", { requestId: request.requestId, response: finalResponse, attempts: namespace.getExternalIntelligenceAcquisitionAttempts(request.requestId), attemptCount: attempts, knowledgePromotionPerformed: false, canonicalRepositoryMutationPerformed: false });
    }
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "EXTERNAL_ACQUISITION_FAILED", actor: "Acquisition Execution Layer", outcome: "Failed", details: { requestId: request.requestId, errorId: finalError && finalError.errorId || null, attemptCount: attempts } });
    return internal.buildResult(false, "EXTERNAL010_ACQUISITION_FAILED", "Failed", { requestId: request.requestId, error: finalError, attempts: namespace.getExternalIntelligenceAcquisitionAttempts(request.requestId), attemptCount: attempts });
  }

  async function enqueueExternalIntelligenceAcquisition(input) {
    const settings = internal.isPlainObject(input) ? input : { requestId: input };
    const request = state.acquisitionRequests.get(internal.text(settings.requestId, ""));
    if (!request) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_QUEUE_REQUEST_NOT_FOUND", "Blocked", null);
    const validation = namespace.validateExternalIntelligenceAcquisitionRequest({ requestId: request.requestId, authorityAction: "ENQUEUE_EXTERNAL_ACQUISITION", requireExecutionAuthority: true });
    if (!validation.ok) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_ENQUEUE_VALIDATION_FAILED", "Blocked", { validation: validation, queueBypassesSourcePolicy: false, queueBypassesBudgetPolicy: false });
    const job = {
      jobId: internal.nextId("EXTERNAL-010-JOB"),
      requestId: request.requestId,
      priority: request.priority,
      status: "QUEUED",
      scheduledAt: internal.text(settings.scheduledAt, "") || internal.nowIso(),
      attemptCount: 0,
      maxAttempts: request.retryPolicy.maxAttempts,
      checkpointId: null,
      cancellationRequested: false,
      executionAuthorityGranted: false,
      researchGoalAuthorityGranted: false,
      paidAuthorityGranted: false,
      financialAuthorityGranted: false,
      createdAt: internal.nowIso(),
      updatedAt: internal.nowIso(),
      immutable: true
    };
    const contract = namespace.validateExternalIntelligenceContract("acquisitionJob", job);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-ACQUISITION-JOB", job);
    if (!contract.valid || !schema.valid) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_JOB_SCHEMA_INVALID", "Blocked", { contract: contract, schema: schema });
    const frozen = internal.deepFreeze(internal.clone(job));
    state.acquisitionJobs.set(job.jobId, frozen);
    state.acquisitionQueueOrder.push(job.jobId);
    const persistence = await persistJob(frozen);
    if (!persistence.ok) {
      state.acquisitionJobs.delete(job.jobId);
      state.acquisitionQueueOrder = state.acquisitionQueueOrder.filter(function keep(id) { return id !== job.jobId; });
      return persistence;
    }
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_JOB_QUEUED", "Queued", { job: internal.clone(frozen), persistence: persistence.data, scheduleGrantsPaidAuthority: false, scheduleGrantsFinancialAuthority: false });
  }

  function jobSort(a, b) {
    const aw = PRIORITY_WEIGHT[a.priority] || 0;
    const bw = PRIORITY_WEIGHT[b.priority] || 0;
    if (aw !== bw) return bw - aw;
    const at = Date.parse(a.scheduledAt) || 0;
    const bt = Date.parse(b.scheduledAt) || 0;
    if (at !== bt) return at - bt;
    return a.createdAt.localeCompare(b.createdAt);
  }

  function replaceJob(jobId, patch) {
    const current = state.acquisitionJobs.get(jobId);
    if (!current) return null;
    const next = internal.deepFreeze(Object.assign({}, internal.clone(current), internal.clone(patch || {}), { jobId: current.jobId, requestId: current.requestId, updatedAt: internal.nowIso(), immutable: true }));
    state.acquisitionJobs.set(jobId, next);
    internal.touch();
    return next;
  }

  async function runExternalIntelligenceAcquisitionSchedulerOnce() {
    if (state.acquisitionSchedulerRunning >= ACQ.concurrencyLimit) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_SCHEDULER_CONCURRENCY_LIMIT", "Blocked", { concurrencyLimit: ACQ.concurrencyLimit, unlimitedConcurrencyAllowed: false });
    const now = Date.now();
    const jobs = state.acquisitionQueueOrder.map(function get(id) { return state.acquisitionJobs.get(id); }).filter(function ready(job) { return job && ["QUEUED", "WAITING", "RETRY_PENDING", "RECOVERING"].includes(job.status) && !job.cancellationRequested && (Date.parse(job.scheduledAt) || 0) <= now; }).sort(jobSort);
    if (!jobs.length) return internal.buildResult(true, "EXTERNAL010_ACQUISITION_SCHEDULER_IDLE", "Idle", { queueDepth: state.acquisitionQueueOrder.length });
    const job = jobs[0];
    const request = state.acquisitionRequests.get(job.requestId);
    if (!request) { const blocked = replaceJob(job.jobId, { status: "BLOCKED" }); await persistJob(blocked); return internal.buildResult(false, "EXTERNAL010_ACQUISITION_JOB_REQUEST_MISSING", "Blocked", { job: internal.clone(blocked) }); }

    const validation = namespace.validateExternalIntelligenceAcquisitionRequest({ requestId: request.requestId, authorityAction: "EXECUTE_EXTERNAL_ACQUISITION", requireExecutionAuthority: true });
    if (!validation.ok) { const blocked = replaceJob(job.jobId, { status: "BLOCKED" }); await persistJob(blocked); return internal.buildResult(false, "EXTERNAL010_ACQUISITION_JOB_PREEXECUTION_REVALIDATION_FAILED", "Blocked", { job: internal.clone(blocked), validation: validation, queueBypassesSourcePolicy: false, queueBypassesBudgetPolicy: false }); }

    state.acquisitionSchedulerRunning += 1;
    let running = replaceJob(job.jobId, { status: "RUNNING" });
    await persistJob(running);
    try {
      const result = await executeExternalIntelligenceAcquisition({ requestId: request.requestId });
      const attemptCount = namespace.getExternalIntelligenceAcquisitionAttempts(request.requestId).length;
      const finalStatus = result.ok ? "COMPLETED" : "FAILED";
      const finalJob = replaceJob(job.jobId, { status: finalStatus, attemptCount: attemptCount });
      await persistJob(finalJob);
      return internal.buildResult(result.ok, result.ok ? "EXTERNAL010_ACQUISITION_JOB_COMPLETED" : "EXTERNAL010_ACQUISITION_JOB_FAILED", result.ok ? "Completed" : "Failed", { job: internal.clone(finalJob), execution: result, preExecutionRevalidated: true });
    } finally { state.acquisitionSchedulerRunning = Math.max(0, state.acquisitionSchedulerRunning - 1); }
  }

  async function cancelExternalIntelligenceAcquisitionJob(input) {
    const settings = internal.isPlainObject(input) ? input : { jobId: input };
    const job = state.acquisitionJobs.get(internal.text(settings.jobId, ""));
    if (!job) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_JOB_NOT_FOUND", "Blocked", null);
    if (["COMPLETED", "FAILED", "CANCELLED", "BLOCKED"].includes(job.status)) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_JOB_NOT_CANCELLABLE", "Blocked", { status: job.status });
    const cancelled = replaceJob(job.jobId, { status: "CANCELLED", cancellationRequested: true });
    const persistence = await persistJob(cancelled);
    return internal.buildResult(persistence.ok, persistence.ok ? "EXTERNAL010_ACQUISITION_JOB_CANCELLED" : "EXTERNAL010_ACQUISITION_JOB_CANCEL_PERSISTENCE_FAILED", persistence.ok ? "Cancelled" : "Failed", { job: internal.clone(cancelled), persistence: persistence.data });
  }

  async function checkpointExternalIntelligenceAcquisitionJob(input) {
    const settings = internal.isPlainObject(input) ? input : { jobId: input };
    const job = state.acquisitionJobs.get(internal.text(settings.jobId, ""));
    if (!job) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_JOB_NOT_FOUND", "Blocked", null);
    const checkpoint = internal.deepFreeze({ checkpointId: internal.nextId("EXTERNAL-010-CHECKPOINT"), jobId: job.jobId, requestId: job.requestId, status: job.status, attemptCount: job.attemptCount, createdAt: internal.nowIso(), immutable: true });
    const adapter = state.acquisitionQueuePersistenceAdapter;
    if (!queuePersistenceAdapterValid(adapter)) return internal.buildResult(false, "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_REQUIRED", "Blocked", null);
    await adapter.writeCheckpoint(internal.clone(checkpoint));
    state.acquisitionQueueCheckpoints.set(checkpoint.checkpointId, checkpoint);
    const updated = replaceJob(job.jobId, { checkpointId: checkpoint.checkpointId });
    await persistJob(updated);
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_JOB_CHECKPOINTED", "Ready", { checkpoint: internal.clone(checkpoint), job: internal.clone(updated) });
  }

  function getExternalIntelligenceAcquisitionJob(jobId) { const job = state.acquisitionJobs.get(internal.text(jobId, "")); return job ? internal.clone(job) : null; }
  function listExternalIntelligenceAcquisitionJobs() { return Array.from(state.acquisitionJobs.values()).map(internal.clone); }
  function getExternalIntelligenceAcquisitionQueueMetrics() {
    const jobs = Array.from(state.acquisitionJobs.values());
    const statusCounts = {};
    ACQ.jobStatuses.forEach(function status(v) { statusCounts[v] = 0; });
    jobs.forEach(function count(job) { statusCounts[job.status] = (statusCounts[job.status] || 0) + 1; });
    return { queueDepth: jobs.filter(function queued(job) { return ["QUEUED", "WAITING", "RETRY_PENDING", "RECOVERING"].includes(job.status); }).length, totalJobs: jobs.length, running: state.acquisitionSchedulerRunning, concurrencyLimit: ACQ.concurrencyLimit, unlimitedConcurrencyAllowed: false, statusCounts: statusCounts, persistenceConfigured: queuePersistenceAdapterValid(state.acquisitionQueuePersistenceAdapter) };
  }

  async function submitExternalIntelligenceAcquisition(input) {
    const created = namespace.createExternalIntelligenceAcquisitionRequest(input);
    if (!created.ok) return created;
    const request = created.data.request;
    const plan = planExternalIntelligenceAcquisitionExecution({ requestId: request.requestId });
    if (!plan.ok) return plan;
    if (plan.data.executionDecision === "QUEUE") return enqueueExternalIntelligenceAcquisition({ requestId: request.requestId });
    return executeExternalIntelligenceAcquisition({ requestId: request.requestId });
  }

  function initializeExternalIntelligenceAcquisitionQueue() {
    if (!queuePersistenceAdapterValid(state.acquisitionQueuePersistenceAdapter)) {
      const browserAdapter = buildBrowserLocalStorageAdapter();
      if (browserAdapter) state.acquisitionQueuePersistenceAdapter = browserAdapter;
    }
    namespace.modules.acquisitionQueue.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_ACQUISITION_QUEUE_INITIALIZED", "Ready", { hybridExecution: true, concurrencyLimit: ACQ.concurrencyLimit, unlimitedRetryAllowed: false, unlimitedConcurrencyAllowed: false, persistenceConfigured: queuePersistenceAdapterValid(state.acquisitionQueuePersistenceAdapter), schedulerMayInventResearchGoal: false, schedulerMayInventAcquisitionPurpose: false });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceAcquisitionQueue: initializeExternalIntelligenceAcquisitionQueue,
    setExternalIntelligenceAcquisitionQueuePersistenceAdapter: setExternalIntelligenceAcquisitionQueuePersistenceAdapter,
    planExternalIntelligenceAcquisitionExecution: planExternalIntelligenceAcquisitionExecution,
    executeExternalIntelligenceAcquisition: executeExternalIntelligenceAcquisition,
    enqueueExternalIntelligenceAcquisition: enqueueExternalIntelligenceAcquisition,
    runExternalIntelligenceAcquisitionSchedulerOnce: runExternalIntelligenceAcquisitionSchedulerOnce,
    cancelExternalIntelligenceAcquisitionJob: cancelExternalIntelligenceAcquisitionJob,
    checkpointExternalIntelligenceAcquisitionJob: checkpointExternalIntelligenceAcquisitionJob,
    getExternalIntelligenceAcquisitionJob: getExternalIntelligenceAcquisitionJob,
    listExternalIntelligenceAcquisitionJobs: listExternalIntelligenceAcquisitionJobs,
    getExternalIntelligenceAcquisitionQueueMetrics: getExternalIntelligenceAcquisitionQueueMetrics,
    submitExternalIntelligenceAcquisition: submitExternalIntelligenceAcquisition
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.acquisitionQueue = {
    id: "EXTERNAL-010-ACQUISITION-QUEUE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    hybridExecution: true,
    finiteRetry: true,
    finiteConcurrency: true,
    preExecutionRevalidation: true,
    schedulerGoalAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
