/* ============================================================
   FILE: 17_external_intelligence_monitoring_watch.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.15.0
   Phase 16: Adaptive Monitoring / Watch Governance
   Primary Decision: 045
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("monitoringWatch");
  const CONFIG = VERSION_MANIFEST.monitoring || {};

  ["monitoringWatches", "monitoringWatchVersions", "monitoringBaselines", "monitoringGaps", "monitoringObservations", "monitoringOutcomeEvaluations"].forEach(function ensure(key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });
  if (!state.monitoringPersistence || typeof state.monitoringPersistence !== "object") state.monitoringPersistence = { adapter: null, adapterId: null, lastReadbackAt: null };

  const WATCH_TYPES = new Set(CONFIG.watchTypes || []);
  const PURPOSES = new Set(CONFIG.purposes || []);
  const MODES = new Set(CONFIG.modes || []);
  const WATCH_STATES = new Set(CONFIG.watchStates || []);
  const CATCHUP = new Set(CONFIG.catchUpStrategies || []);

  function upper(value, fallback) { return internal.text(value, fallback || "").toUpperCase(); }
  function iso(value) { const t = Date.parse(internal.text(value, "")); return Number.isFinite(t) ? new Date(t).toISOString() : null; }
  function validateRecord(contractKey, schemaId, record) {
    const contract = namespace.validateExternalIntelligenceContract(contractKey, record);
    const schema = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return contract.valid && schema.valid ? null : { contract: contract, schema: schema };
  }
  function audit(eventType, outcome, details) {
    if (typeof namespace.appendExternalIntelligenceAuditEvent !== "function") return Promise.resolve(null);
    return namespace.appendExternalIntelligenceAuditEvent({ eventType: eventType, actor: "Phase16 Monitoring", outcome: outcome, details: internal.clone(details || {}) });
  }
  function lineage(inputs, output, relationType) {
    if (typeof namespace.createExternalIntelligenceLineageRecord !== "function") return [];
    return internal.unique(inputs || []).filter(Boolean).map(function link(id) {
      const result = namespace.createExternalIntelligenceLineageRecord({ inputReferenceId: id, outputReferenceId: output, relationType: relationType || "DERIVED_FROM", lineageState: "ACTIVE" });
      return result && result.ok && result.data ? result.data.lineageRecord : null;
    }).filter(Boolean);
  }

  function createMemoryAdapter() {
    const records = new Map();
    return {
      adapterId: "EXTERNAL-010-MONITORING-PERSISTENCE-MEMORY",
      async put(kind, id, record) { records.set(kind + "::" + id, internal.clone(record)); return true; },
      async get(kind, id) { const value = records.get(kind + "::" + id); return value ? internal.clone(value) : null; },
      async list(kind) { const prefix = kind + "::"; return Array.from(records.entries()).filter(function f(entry) { return entry[0].indexOf(prefix) === 0; }).map(function m(entry) { return internal.clone(entry[1]); }); },
      async remove(kind, id) { records.delete(kind + "::" + id); return true; }
    };
  }

  function createLocalStorageAdapter(storageKey) {
    const key = internal.text(storageKey, "EXTERNAL010_MONITORING_NOTIFICATION_V1");
    function load() {
      try { const parsed = JSON.parse(global.localStorage.getItem(key) || "{}"); return internal.isPlainObject(parsed) ? parsed : {}; } catch (_) { return {}; }
    }
    function save(records) { global.localStorage.setItem(key, JSON.stringify(records)); }
    return {
      adapterId: "EXTERNAL-010-MONITORING-PERSISTENCE-LOCAL-STORAGE",
      async put(kind, id, record) { const all = load(); if (!all[kind]) all[kind] = {}; all[kind][id] = internal.clone(record); save(all); return true; },
      async get(kind, id) { const all = load(); return all[kind] && all[kind][id] ? internal.clone(all[kind][id]) : null; },
      async list(kind) { const all = load(); return Object.keys(all[kind] || {}).map(function m(id) { return internal.clone(all[kind][id]); }); },
      async remove(kind, id) { const all = load(); if (all[kind]) delete all[kind][id]; save(all); return true; }
    };
  }

  function setPersistenceAdapter(adapter) {
    if (!adapter || typeof adapter.put !== "function" || typeof adapter.get !== "function" || typeof adapter.list !== "function") {
      return internal.buildResult(false, "EXTERNAL010_MONITORING_PERSISTENCE_ADAPTER_INVALID", "Blocked", null);
    }
    state.monitoringPersistence.adapter = adapter;
    state.monitoringPersistence.adapterId = internal.text(adapter.adapterId, "CUSTOM");
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_MONITORING_PERSISTENCE_ADAPTER_SET", "Ready", { adapterId: state.monitoringPersistence.adapterId });
  }

  async function persistRecord(kind, id, record) {
    if (!state.monitoringPersistence.adapter) return internal.buildResult(false, "EXTERNAL010_MONITORING_PERSISTENCE_ADAPTER_REQUIRED", "Blocked", null);
    await state.monitoringPersistence.adapter.put(kind, id, record);
    return internal.buildResult(true, "EXTERNAL010_MONITORING_RECORD_PERSISTED", "Ready", { kind: kind, recordId: id, adapterId: state.monitoringPersistence.adapterId });
  }
  async function readBackRecord(kind, id) {
    if (!state.monitoringPersistence.adapter) return internal.buildResult(false, "EXTERNAL010_MONITORING_PERSISTENCE_ADAPTER_REQUIRED", "Blocked", null);
    const record = await state.monitoringPersistence.adapter.get(kind, id);
    state.monitoringPersistence.lastReadbackAt = internal.nowIso();
    return internal.buildResult(Boolean(record), record ? "EXTERNAL010_MONITORING_RECORD_READBACK" : "EXTERNAL010_MONITORING_RECORD_NOT_FOUND", record ? "Ready" : "Missing", { kind: kind, record: record, adapterId: state.monitoringPersistence.adapterId });
  }

  function normalizedCadence(input) {
    const c = internal.isPlainObject(input) ? input : {};
    const normalMs = Number.isFinite(c.normalIntervalMs) && c.normalIntervalMs > 0 ? c.normalIntervalMs : 3600000;
    const escalatedMs = Number.isFinite(c.escalatedIntervalMs) && c.escalatedIntervalMs > 0 ? Math.min(c.escalatedIntervalMs, normalMs) : Math.max(60000, Math.floor(normalMs / 4));
    const cooldownMs = Number.isFinite(c.cooldownIntervalMs) && c.cooldownIntervalMs > 0 ? c.cooldownIntervalMs : Math.max(escalatedMs, Math.floor(normalMs / 2));
    return { normalIntervalMs: normalMs, escalatedIntervalMs: escalatedMs, cooldownIntervalMs: cooldownMs, adaptive: c.adaptive !== false, minIntervalMs: Number.isFinite(c.minIntervalMs) ? c.minIntervalMs : 60000, maxIntervalMs: Number.isFinite(c.maxIntervalMs) ? c.maxIntervalMs : Math.max(normalMs * 24, normalMs) };
  }

  function createWatchCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watchType = upper(x.watchType, "ENTITY_WATCH");
    const purpose = upper(x.monitoringPurpose, "CURRENT_AWARENESS");
    const modes = internal.unique((x.monitoringModes || ["SCHEDULED_CHECK"]).map(function m(v) { return upper(v, ""); })).filter(Boolean);
    if (!WATCH_TYPES.has(watchType) || !PURPOSES.has(purpose) || !modes.length || !modes.every(function ok(v) { return MODES.has(v); })) {
      return internal.buildResult(false, "EXTERNAL010_WATCH_DEFINITION_INVALID", "Blocked", { watchType: watchType, monitoringPurpose: purpose, monitoringModes: modes });
    }
    const watchId = internal.text(x.watchId, "") || internal.nextId("EXTERNAL-010-WATCH");
    if (state.monitoringWatches.has(watchId)) return internal.buildResult(false, "EXTERNAL010_WATCH_DUPLICATE", "Blocked", { watchId: watchId });
    const validFrom = iso(x.validFrom) || internal.nowIso();
    const validUntil = x.validUntil ? iso(x.validUntil) : null;
    if (x.validUntil && !validUntil) return internal.buildResult(false, "EXTERNAL010_WATCH_VALID_UNTIL_INVALID", "Blocked", null);
    const record = internal.deepFreeze({
      watchId: watchId,
      watchVersion: 1,
      watchType: watchType,
      monitoringPurpose: purpose,
      targetEntityIds: internal.unique(x.targetEntityIds || []),
      targetSignalTypes: internal.unique(x.targetSignalTypes || []),
      targetEventTypes: internal.unique(x.targetEventTypes || []),
      targetSourceIds: internal.unique(x.targetSourceIds || []),
      targetDomain: internal.text(x.targetDomain, "EXTERNAL"),
      priorityProfile: internal.isPlainObject(x.priorityProfile) ? internal.clone(x.priorityProfile) : { level: "NORMAL" },
      freshnessRequirement: internal.isPlainObject(x.freshnessRequirement) ? internal.clone(x.freshnessRequirement) : {},
      monitoringModes: modes,
      cadencePolicy: normalizedCadence(x.cadencePolicy),
      triggerPolicy: internal.isPlainObject(x.triggerPolicy) ? internal.clone(x.triggerPolicy) : {},
      budgetProfile: internal.isPlainObject(x.budgetProfile) ? internal.clone(x.budgetProfile) : { budgetIds: [] },
      validFrom: validFrom,
      validUntil: validUntil,
      baselineId: internal.text(x.baselineId, "") || null,
      watchState: "DRAFT",
      nextCheckAt: iso(x.nextCheckAt) || validFrom,
      lastCheckedAt: null,
      currentCadenceState: "NORMAL",
      catchUpStrategy: CATCHUP.has(upper(x.catchUpStrategy, "LATEST_ONLY")) ? upper(x.catchUpStrategy, "LATEST_ONLY") : "LATEST_ONLY",
      activationAuthorityEnvelopeId: null,
      researchGoalEqualsMonitoringGoal: false,
      watchDefinitionEqualsScheduler: false,
      monitorAuthorityAllowsUnlimitedPaidAPI: false,
      marketWatchAuthorityEqualsTradingAuthority: false,
      createdAt: internal.nowIso(),
      createdBy: internal.text(x.createdBy, "AI_OR_OWNER_PROPOSAL"),
      immutable: true
    });
    const invalid = validateRecord("watchRecord", "EXTERNAL-010-SCHEMA-WATCH-RECORD", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_WATCH_CONTRACT_INVALID", "Blocked", invalid);
    state.monitoringWatches.set(watchId, record);
    state.monitoringWatchVersions.set(watchId, [record]);
    internal.touch();
    audit("WATCH_CREATED", "Candidate", { watchId: watchId, watchType: watchType, monitoringPurpose: purpose });
    return internal.buildResult(true, "EXTERNAL010_WATCH_CANDIDATE_CREATED", "Candidate", { watch: internal.clone(record), authorityGranted: false });
  }

  function versionWatch(watchId, patch) {
    const current = state.monitoringWatches.get(watchId);
    if (!current) return null;
    const next = internal.deepFreeze(Object.assign({}, internal.clone(current), internal.clone(patch || {}), { watchVersion: current.watchVersion + 1, immutable: true }));
    const invalid = validateRecord("watchRecord", "EXTERNAL-010-SCHEMA-WATCH-RECORD", next);
    if (invalid) return null;
    state.monitoringWatches.set(watchId, next);
    const history = state.monitoringWatchVersions.get(watchId) || [];
    history.push(next); state.monitoringWatchVersions.set(watchId, history); internal.touch();
    return next;
  }

  function activateWatch(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watchId = internal.text(x.watchId, "");
    const current = state.monitoringWatches.get(watchId);
    if (!current) return internal.buildResult(false, "EXTERNAL010_WATCH_NOT_FOUND", "Blocked", { watchId: watchId || null });
    const authority = typeof namespace.evaluateExternalIntelligenceAuthority === "function" ? namespace.evaluateExternalIntelligenceAuthority({ action: "ACTIVATE_MONITORING_WATCH", target: { type: "monitoring-watch", id: watchId }, purpose: internal.text(x.purpose, "monitoring activation") }) : { allowed: false, reason: "AUTHORITY_API_UNAVAILABLE" };
    if (!authority.allowed) return internal.buildResult(false, "EXTERNAL010_WATCH_ACTIVATION_AUTHORITY_DENIED", "Blocked", { watchId: watchId, authority: authority });
    const next = versionWatch(watchId, { watchState: "ACTIVE", activationAuthorityEnvelopeId: authority.authorityEnvelopeId, nextCheckAt: iso(x.nextCheckAt) || current.nextCheckAt || internal.nowIso() });
    if (!next) return internal.buildResult(false, "EXTERNAL010_WATCH_ACTIVATION_COMMIT_FAILED", "Failed", null);
    audit("WATCH_ACTIVATED", "Active", { watchId: watchId, authorityEnvelopeId: authority.authorityEnvelopeId });
    return internal.buildResult(true, "EXTERNAL010_WATCH_ACTIVATED", "Active", { watch: internal.clone(next), authority: authority });
  }

  function transitionWatch(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watchId = internal.text(x.watchId, "");
    const targetState = upper(x.watchState, "");
    const current = state.monitoringWatches.get(watchId);
    if (!current || !WATCH_STATES.has(targetState)) return internal.buildResult(false, "EXTERNAL010_WATCH_TRANSITION_INVALID", "Blocked", { watchId: watchId || null, watchState: targetState || null });
    if (targetState === "ACTIVE" && current.watchState === "DRAFT") return activateWatch(x);
    const next = versionWatch(watchId, { watchState: targetState, currentCadenceState: targetState === "ESCALATED" ? "ESCALATED" : targetState === "COOLDOWN" ? "COOLDOWN" : current.currentCadenceState });
    if (!next) return internal.buildResult(false, "EXTERNAL010_WATCH_TRANSITION_COMMIT_FAILED", "Failed", null);
    audit("WATCH_" + targetState, targetState, { watchId: watchId });
    return internal.buildResult(true, "EXTERNAL010_WATCH_STATE_UPDATED", targetState, { watch: internal.clone(next), authorityGranted: false });
  }

  function evaluateCadence(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watch = state.monitoringWatches.get(internal.text(x.watchId, ""));
    if (!watch) return internal.buildResult(false, "EXTERNAL010_WATCH_NOT_FOUND", "Blocked", null);
    const risk = upper(x.currentRisk, "NORMAL");
    const activity = upper(x.signalActivity, "NORMAL");
    const material = x.materialChangeDetected === true;
    let cadenceState = "NORMAL";
    if (material || ["HIGH", "CRITICAL", "SPIKE"].includes(risk) || ["HIGH", "SPIKE"].includes(activity)) cadenceState = "ESCALATED";
    else if (watch.currentCadenceState === "ESCALATED" && x.stabilized === true) cadenceState = "COOLDOWN";
    const policy = watch.cadencePolicy;
    const interval = cadenceState === "ESCALATED" ? policy.escalatedIntervalMs : cadenceState === "COOLDOWN" ? policy.cooldownIntervalMs : policy.normalIntervalMs;
    const bounded = Math.max(policy.minIntervalMs, Math.min(policy.maxIntervalMs, interval));
    return internal.buildResult(true, "EXTERNAL010_MONITORING_CADENCE_EVALUATED", "Ready", { watchId: watch.watchId, cadenceState: cadenceState, recommendedIntervalMs: bounded, sourceRateLimitBypassAllowed: false, hardBudgetBypassAllowed: false, monitoringEqualsFixedFrequentPolling: false });
  }

  function applyCadence(input) {
    const evaluation = evaluateCadence(input);
    if (!evaluation.ok) return evaluation;
    const watchId = evaluation.data.watchId;
    const current = state.monitoringWatches.get(watchId);
    if (!current || !["ACTIVE", "ESCALATED", "COOLDOWN", "DEGRADED"].includes(current.watchState)) return internal.buildResult(false, "EXTERNAL010_WATCH_NOT_ACTIVE_FOR_CADENCE", "Blocked", { watchId: watchId });
    const nextCheck = new Date(Date.now() + evaluation.data.recommendedIntervalMs).toISOString();
    const nextState = evaluation.data.cadenceState === "ESCALATED" ? "ESCALATED" : evaluation.data.cadenceState === "COOLDOWN" ? "COOLDOWN" : (current.watchState === "DEGRADED" ? "DEGRADED" : "ACTIVE");
    const next = versionWatch(watchId, { currentCadenceState: evaluation.data.cadenceState, watchState: nextState, nextCheckAt: nextCheck });
    return internal.buildResult(Boolean(next), next ? "EXTERNAL010_MONITORING_CADENCE_APPLIED" : "EXTERNAL010_MONITORING_CADENCE_COMMIT_FAILED", next ? "Ready" : "Failed", { watch: next ? internal.clone(next) : null, evaluation: evaluation.data });
  }

  function listDueWatches(at) {
    const now = Date.parse(iso(at) || internal.nowIso());
    return Array.from(state.monitoringWatches.values()).filter(function due(w) {
      if (!["ACTIVE", "ESCALATED", "COOLDOWN", "DEGRADED"].includes(w.watchState)) return false;
      if (w.validUntil && now >= Date.parse(w.validUntil)) return false;
      const next = Date.parse(w.nextCheckAt || w.validFrom);
      return Number.isFinite(next) && next <= now;
    }).map(internal.clone);
  }

  function createBaseline(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watch = state.monitoringWatches.get(internal.text(x.watchId, ""));
    if (!watch) return internal.buildResult(false, "EXTERNAL010_WATCH_NOT_FOUND", "Blocked", null);
    const prior = watch.baselineId ? state.monitoringBaselines.get(watch.baselineId) : null;
    const record = internal.deepFreeze({ baselineId: internal.text(x.baselineId, "") || internal.nextId("EXTERNAL-010-MONITORING-BASELINE"), watchId: watch.watchId, baselineVersion: prior ? prior.baselineVersion + 1 : 1, snapshotRefs: internal.unique(x.snapshotRefs || []), contentHash: internal.text(x.contentHash, "") || null, createdAt: internal.nowIso(), supersedesBaselineId: prior ? prior.baselineId : null, immutable: true });
    const invalid = validateRecord("monitoringBaseline", "EXTERNAL-010-SCHEMA-MONITORING-BASELINE", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_MONITORING_BASELINE_INVALID", "Blocked", invalid);
    state.monitoringBaselines.set(record.baselineId, record);
    const next = versionWatch(watch.watchId, { baselineId: record.baselineId });
    lineage(record.snapshotRefs, record.baselineId, "DERIVED_FROM");
    return internal.buildResult(true, "EXTERNAL010_MONITORING_BASELINE_CREATED", "Ready", { baseline: internal.clone(record), watch: internal.clone(next) });
  }

  function recordGap(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const watch = state.monitoringWatches.get(internal.text(x.watchId, ""));
    if (!watch) return internal.buildResult(false, "EXTERNAL010_WATCH_NOT_FOUND", "Blocked", null);
    const record = internal.deepFreeze({ monitoringGapId: internal.text(x.monitoringGapId, "") || internal.nextId("EXTERNAL-010-MONITORING-GAP"), watchId: watch.watchId, gapStart: iso(x.gapStart) || internal.nowIso(), gapEnd: x.gapEnd ? iso(x.gapEnd) : null, affectedSourceIds: internal.unique(x.affectedSourceIds || watch.targetSourceIds || []), reason: internal.text(x.reason, "SOURCE_OR_RUNTIME_UNAVAILABLE"), coverageImpact: upper(x.coverageImpact, "UNKNOWN"), recoveryState: upper(x.recoveryState, "OPEN"), catchUpStrategy: CATCHUP.has(upper(x.catchUpStrategy, watch.catchUpStrategy)) ? upper(x.catchUpStrategy, watch.catchUpStrategy) : watch.catchUpStrategy, noObservationEqualsNoChange: false, monitoringGapEqualsStableWorld: false, createdAt: internal.nowIso(), immutable: true });
    const invalid = validateRecord("monitoringGap", "EXTERNAL-010-SCHEMA-MONITORING-GAP", record);
    if (invalid) return internal.buildResult(false, "EXTERNAL010_MONITORING_GAP_INVALID", "Blocked", invalid);
    state.monitoringGaps.set(record.monitoringGapId, record);
    versionWatch(watch.watchId, { watchState: "DEGRADED" });
    audit("MONITORING_GAP_STARTED", "Degraded", { watchId: watch.watchId, monitoringGapId: record.monitoringGapId, reason: record.reason });
    return internal.buildResult(true, "EXTERNAL010_MONITORING_GAP_RECORDED", "Degraded", { monitoringGap: internal.clone(record), noChangeClaimed: false });
  }

  function resolveGap(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const id = internal.text(x.monitoringGapId, "");
    const current = state.monitoringGaps.get(id);
    if (!current) return internal.buildResult(false, "EXTERNAL010_MONITORING_GAP_NOT_FOUND", "Blocked", null);
    const strategy = CATCHUP.has(upper(x.catchUpStrategy, current.catchUpStrategy)) ? upper(x.catchUpStrategy, current.catchUpStrategy) : current.catchUpStrategy;
    const next = internal.deepFreeze(Object.assign({}, internal.clone(current), { gapEnd: iso(x.gapEnd) || internal.nowIso(), recoveryState: "RESOLVED", catchUpStrategy: strategy, resolvedAt: internal.nowIso(), immutable: true }));
    state.monitoringGaps.set(id, next);
    const watch = state.monitoringWatches.get(current.watchId);
    if (watch && watch.watchState === "DEGRADED") versionWatch(watch.watchId, { watchState: "ACTIVE", nextCheckAt: internal.nowIso() });
    audit("MONITORING_GAP_RESOLVED", "Resolved", { watchId: current.watchId, monitoringGapId: id, catchUpStrategy: strategy });
    return internal.buildResult(true, "EXTERNAL010_MONITORING_GAP_RESOLVED", "Ready", { monitoringGap: internal.clone(next), unlimitedCatchupAllowed: false });
  }

  function getWatch(id) { const value = state.monitoringWatches.get(internal.text(id, "")); return value ? internal.clone(value) : null; }
  function listWatches() { return Array.from(state.monitoringWatches.values()).map(internal.clone); }
  function listWatchHistory(id) { return (state.monitoringWatchVersions.get(internal.text(id, "")) || []).map(internal.clone); }
  function listGaps(watchId) { return Array.from(state.monitoringGaps.values()).filter(function f(g) { return !watchId || g.watchId === watchId; }).map(internal.clone); }
  function getMonitoringState() { return { watchCount: state.monitoringWatches.size, activeWatchCount: Array.from(state.monitoringWatches.values()).filter(function f(w) { return ["ACTIVE","ESCALATED","COOLDOWN","DEGRADED"].includes(w.watchState); }).length, baselineCount: state.monitoringBaselines.size, gapCount: state.monitoringGaps.size, observationCount: state.monitoringObservations.size, outcomeEvaluationCount: state.monitoringOutcomeEvaluations.size, persistenceAdapterId: state.monitoringPersistence.adapterId, alwaysOnRequired: false, loadedAt: namespace.modules.monitoringWatch && namespace.modules.monitoringWatch.loadedAt || null, version: MODULE_VERSION }; }

  if (!state.monitoringPersistence.adapter) {
    if (global.localStorage) setPersistenceAdapter(createLocalStorageAdapter());
    else setPersistenceAdapter(createMemoryAdapter());
  }

  Object.assign(namespace.api, {
    createExternalIntelligenceMonitoringMemoryPersistenceAdapter: createMemoryAdapter,
    createExternalIntelligenceMonitoringLocalStoragePersistenceAdapter: createLocalStorageAdapter,
    setExternalIntelligenceMonitoringPersistenceAdapter: setPersistenceAdapter,
    persistExternalIntelligenceMonitoringRecord: persistRecord,
    readBackExternalIntelligenceMonitoringRecord: readBackRecord,
    createExternalIntelligenceWatchCandidate: createWatchCandidate,
    activateExternalIntelligenceWatch: activateWatch,
    transitionExternalIntelligenceWatch: transitionWatch,
    evaluateExternalIntelligenceMonitoringCadence: evaluateCadence,
    applyExternalIntelligenceMonitoringCadence: applyCadence,
    listExternalIntelligenceDueWatches: listDueWatches,
    createExternalIntelligenceMonitoringBaseline: createBaseline,
    recordExternalIntelligenceMonitoringGap: recordGap,
    resolveExternalIntelligenceMonitoringGap: resolveGap,
    getExternalIntelligenceWatch: getWatch,
    listExternalIntelligenceWatches: listWatches,
    listExternalIntelligenceWatchHistory: listWatchHistory,
    listExternalIntelligenceMonitoringGaps: listGaps,
    getExternalIntelligenceMonitoringState: getMonitoringState
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.monitoringWatch = { id: "EXTERNAL-010-ADAPTIVE-MONITORING-WATCH", version: MODULE_VERSION, status: "Ready", phase: 16, decisions: ["045"], stableWatchRecord: true, adaptiveCadence: true, monitoringGapExplicit: true, alwaysOnRequired: false, persistenceHook: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
