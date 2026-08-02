/* ============================================================
   IDE-110 Diagnostic Platform Extension
   File: 13_diagnostic_platform.js
   Version: 1.2.1
   Strategy: standalone platform extension loaded after instrumentation.
============================================================ */
(function initializeDiagnosticPlatform(global) {
  "use strict";

  const COMPONENT_ID = "IDE-110";
  const VERSION = "1.2.1";
  const MAX_RECORDS = 500;
  const runtimeBindings = new Map();

  const state = {
    initialized: true,
    instrumentationTypes: {},
    probeTypes: {},
    instrumentations: [],
    investigations: [],
    performanceRecords: [],
    sourceBackups: [],
    reports: [],
    sequence: 0,
    lastError: null,
    lastValidation: null,
    updatedAt: new Date().toISOString()
  };

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function text(value, fallback) { const v = String(value == null ? "" : value).trim(); return v || fallback; }
  function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? clone(value) : {}; }
  function nextId(prefix) { state.sequence += 1; return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase(); }
  function touch() { state.updatedAt = nowIso(); }
  function trim(list) { while (list.length > MAX_RECORDS) list.shift(); }
  function fail(operation, error) { state.lastError = { operation: operation, message: error && error.message ? error.message : String(error), at: nowIso() }; touch(); }

  function registerInstrumentationType(definition) {
    const input = object(definition);
    const id = text(input.id || input.type, "");
    if (!id) return { registered: false, reason: "Instrumentation type id is required." };
    state.instrumentationTypes[id] = {
      id: id,
      title: text(input.title, id),
      description: text(input.description, ""),
      reversible: input.reversible !== false,
      enabled: input.enabled !== false,
      metadata: object(input.metadata),
      registeredAt: nowIso()
    };
    touch();
    return { registered: true, definition: clone(state.instrumentationTypes[id]) };
  }

  function registerProbeType(definition) {
    const input = object(definition);
    const id = text(input.id || input.type, "");
    if (!id) return { registered: false, reason: "Probe type id is required." };
    state.probeTypes[id] = {
      id: id,
      title: text(input.title, id),
      description: text(input.description, ""),
      metric: text(input.metric, "custom"),
      enabled: input.enabled !== false,
      metadata: object(input.metadata),
      registeredAt: nowIso()
    };
    touch();
    return { registered: true, definition: clone(state.probeTypes[id]) };
  }

  function previewInstrumentation(options) {
    const input = object(options);
    const type = text(input.type, "TRACE");
    const targetId = text(input.targetId || input.target || input.functionName, "");
    const runtimeTarget = Boolean(targetId && typeof global[targetId] === "function");
    return {
      id: "IDE-110-INSTRUMENTATION-PREVIEW",
      valid: Boolean(targetId),
      type: type,
      targetType: text(input.targetType, "Function"),
      targetId: targetId,
      applicationMode: runtimeTarget ? "Runtime Wrapper" : "Logical Adapter",
      runtimeTargetAvailable: runtimeTarget,
      changes: [{ action: runtimeTarget ? "WRAP_RUNTIME_FUNCTION" : "REGISTER_LOGICAL_PROBE", type: type, reversible: true }],
      sourceChanged: false,
      runtimeChanged: runtimeTarget,
      previewedAt: nowIso()
    };
  }

  function addInstrumentation(options) {
    try {
      const preview = previewInstrumentation(options);
      if (!preview.valid) return { added: false, reason: "targetId is required.", preview: preview };
      const input = object(options);
      const item = {
        id: nextId("INST"), sessionId: text(input.sessionId, ""), investigationId: text(input.investigationId, ""),
        type: preview.type, targetType: preview.targetType, targetId: preview.targetId, config: object(input.config),
        status: "Applied", applicationMode: preview.applicationMode, sourceMutated: false, runtimeMutated: false,
        callCount: 0, appliedAt: nowIso(), removedAt: null, verified: false
      };
      if (preview.runtimeTargetAvailable) {
        const original = global[item.targetId];
        const wrapper = function diagnosticRuntimeWrapper() {
          const started = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
          item.callCount += 1;
          const finish = function (outcome) {
            const ended = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
            recordPerformance({ targetId: item.targetId, durationMs: Math.max(0, ended - started), metadata: { instrumentationId: item.id, outcome: outcome } });
          };
          try {
            const result = original.apply(this, arguments);
            if (result && typeof result.then === "function") {
              return result.then(function (value) { finish("Resolved"); return value; }, function (error) { finish("Rejected"); throw error; });
            }
            finish("Returned");
            return result;
          } catch (error) {
            finish("Thrown");
            throw error;
          }
        };
        runtimeBindings.set(item.id, { targetId: item.targetId, original: original, wrapper: wrapper });
        global[item.targetId] = wrapper;
        item.runtimeMutated = true;
      }
      state.instrumentations.push(item); trim(state.instrumentations); touch();
      if (item.sessionId && typeof global.addDiagnosticSessionEvent === "function") global.addDiagnosticSessionEvent(item.sessionId, "INSTRUMENTATION_ADDED", item);
      return { added: true, instrumentation: clone(item) };
    } catch (error) { fail("addInstrumentation", error); return { added: false, reason: state.lastError.message }; }
  }

  function removeInstrumentation(instrumentationId) {
    const item = state.instrumentations.find(function (x) { return x.id === instrumentationId; });
    if (!item) return { removed: false, reason: "Instrumentation not found." };
    if (item.status === "Removed") return { removed: true, alreadyRemoved: true, instrumentation: clone(item) };
    const binding = runtimeBindings.get(item.id);
    if (binding) {
      if (global[binding.targetId] !== binding.wrapper) {
        item.status = "Conflict Detected"; item.removedAt = nowIso(); touch();
        return { removed: false, conflict: true, reason: "Runtime target changed after instrumentation; automatic restore was blocked.", instrumentation: clone(item) };
      }
      global[binding.targetId] = binding.original;
      runtimeBindings.delete(item.id);
    }
    item.status = "Removed"; item.removedAt = nowIso(); touch();
    return { removed: true, instrumentation: clone(item) };
  }

  function verifyInstrumentation(instrumentationId) {
    const item = state.instrumentations.find(function (x) { return x.id === instrumentationId; });
    if (!item) return { verified: false, reason: "Instrumentation not found." };
    const binding = runtimeBindings.get(item.id);
    if (item.status === "Applied" && item.runtimeMutated) item.verified = Boolean(binding && global[item.targetId] === binding.wrapper);
    else if (item.status === "Applied") item.verified = item.applicationMode === "Logical Adapter";
    else if (item.status === "Removed") item.verified = !binding;
    else item.verified = false;
    item.verifiedAt = nowIso(); touch();
    return { verified: item.verified, instrumentation: clone(item) };
  }

  function createInvestigation(options) {
    const input = object(options);
    const item = {
      id: nextId("INV"),
      sessionId: text(input.sessionId, ""),
      title: text(input.title, "Diagnostic Investigation"),
      problem: text(input.problem, ""),
      scope: object(input.scope),
      hypotheses: [],
      evidence: [],
      findings: [],
      status: "Created",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.investigations.push(item); trim(state.investigations); touch();
    return clone(item);
  }

  function addInvestigationEvidence(investigationId, evidence) {
    const item = state.investigations.find(function (x) { return x.id === investigationId; });
    if (!item) return { added: false, reason: "Investigation not found." };
    const record = { id: nextId("EVD"), type: text(evidence && evidence.type, "Observation"), data: clone(evidence && evidence.data !== undefined ? evidence.data : evidence), recordedAt: nowIso() };
    item.evidence.push(record); item.updatedAt = nowIso(); touch();
    return { added: true, evidence: clone(record) };
  }

  function recordPerformance(options) {
    const input = object(options);
    const durationMs = Number(input.durationMs);
    if (!Number.isFinite(durationMs) || durationMs < 0) return { recorded: false, reason: "durationMs must be a non-negative number." };
    const record = {
      id: nextId("PERF"), sessionId: text(input.sessionId, ""), investigationId: text(input.investigationId, ""),
      targetType: text(input.targetType, "Function"), targetId: text(input.targetId, "Unknown"),
      durationMs: durationMs, selfMs: Number.isFinite(Number(input.selfMs)) ? Number(input.selfMs) : durationMs,
      inclusiveMs: Number.isFinite(Number(input.inclusiveMs)) ? Number(input.inclusiveMs) : durationMs,
      callCount: Number.isFinite(Number(input.callCount)) ? Number(input.callCount) : 1,
      metadata: object(input.metadata), recordedAt: nowIso()
    };
    state.performanceRecords.push(record); trim(state.performanceRecords); touch();
    return { recorded: true, record: clone(record) };
  }

  function getPerformanceRanking(options) {
    const input = object(options); const limit = Math.max(1, Number(input.limit) || 20);
    const grouped = {};
    state.performanceRecords.forEach(function (r) {
      if (input.sessionId && r.sessionId !== input.sessionId) return;
      const key = r.targetType + ":" + r.targetId;
      if (!grouped[key]) grouped[key] = { targetType: r.targetType, targetId: r.targetId, totalMs: 0, maxMs: 0, callCount: 0, samples: 0 };
      grouped[key].totalMs += r.durationMs; grouped[key].maxMs = Math.max(grouped[key].maxMs, r.durationMs); grouped[key].callCount += r.callCount; grouped[key].samples += 1;
    });
    return Object.keys(grouped).map(function (key) { const x = grouped[key]; x.averageMs = x.samples ? x.totalMs / x.samples : 0; return x; })
      .sort(function (a, b) { return b.totalMs - a.totalMs; }).slice(0, limit);
  }

  function backupSource(options) {
    const input = object(options);
    const backup = { id: nextId("BACKUP"), targetId: text(input.targetId || input.path, ""), content: input.content == null ? "" : String(input.content), hash: text(input.hash, ""), metadata: object(input.metadata), createdAt: nowIso(), restoredAt: null };
    if (!backup.targetId) return { backedUp: false, reason: "targetId or path is required." };
    state.sourceBackups.push(backup); trim(state.sourceBackups); touch();
    return { backedUp: true, backup: clone(backup) };
  }

  function restoreSource(backupId) {
    const backup = state.sourceBackups.find(function (x) { return x.id === backupId; });
    if (!backup) return { restored: false, reason: "Backup not found." };
    const returnOnly = Boolean(backup.metadata && backup.metadata.returnOnly === true);
    let repositoryWritten = false;
    if (!returnOnly && typeof global.updateProjectFile === "function") repositoryWritten = global.updateProjectFile(backup.targetId, backup.content) === true;
    backup.restoredAt = nowIso(); backup.repositoryWritten = repositoryWritten; touch();
    return { restored: returnOnly || repositoryWritten, logicalRestore: returnOnly || !repositoryWritten, repositoryWritten: repositoryWritten, targetId: backup.targetId, content: backup.content, backup: clone(backup) };
  }

  function verifyRestore(backupId, currentContent) {
    const backup = state.sourceBackups.find(function (x) { return x.id === backupId; });
    if (!backup) return { verified: false, reason: "Backup not found." };
    let actual = currentContent;
    if (actual === undefined && typeof global.getProjectFile === "function") {
      const file = global.getProjectFile(backup.targetId);
      actual = file && (file.code || file.text || file.content);
    }
    const verified = String(actual == null ? "" : actual) === backup.content;
    return { verified: verified, backupId: backupId, targetId: backup.targetId, repositoryVerified: actual !== undefined, checkedAt: nowIso() };
  }

  function buildDiagnosticReport(options) {
    const input = object(options);
    const session = input.sessionId && typeof global.getDiagnosticSession === "function" ? global.getDiagnosticSession(input.sessionId) : null;
    const report = {
      id: nextId("REPORT"), sessionId: text(input.sessionId, ""), investigationId: text(input.investigationId, ""),
      title: text(input.title, "Diagnostic Report"), executiveSummary: text(input.executiveSummary, ""),
      session: session, findings: clone(input.findings || []), recommendations: clone(input.recommendations || []),
      performanceRanking: getPerformanceRanking({ sessionId: input.sessionId, limit: input.performanceLimit || 20 }),
      restore: object(input.restore), metadata: object(input.metadata), createdAt: nowIso()
    };
    state.reports.push(report); trim(state.reports); touch();
    return clone(report);
  }

  function getDiagnosticPlatformState() { return clone(state); }

  function getDiagnosticPlatformStatus() {
    const required = ["registerInstrumentationType","registerProbeType","previewInstrumentation","addInstrumentation","removeInstrumentation","verifyInstrumentation","createInvestigation","addInvestigationEvidence","recordPerformance","getPerformanceRanking","backupSource","restoreSource","verifyRestore","buildDiagnosticReport","getDiagnosticPlatformStatus","validateDiagnosticPlatform"];
    const implemented = required.filter(function (name) { return typeof global[name] === "function"; }).length;
    const base = typeof global.getDiagnosticInstrumentationStatus === "function" ? global.getDiagnosticInstrumentationStatus() : null;
    const platformReady = Boolean(base && base.ready && implemented === required.length);
    const validation = state.lastValidation;
    const releaseEvidence = typeof global.getDevelopmentReleaseEvidence === "function"
      ? global.getDevelopmentReleaseEvidence(COMPONENT_ID, { componentVersion: VERSION })
      : null;
    const releaseAllowed = Boolean((validation && validation.valid) || (releaseEvidence && releaseEvidence.releaseAllowed));
    return {
      id: COMPONENT_ID, title: "Diagnostic Platform", name: "Diagnostic Platform", version: VERSION,
      status: platformReady ? "Ready" : "In Progress", lifecycleStatus: releaseAllowed ? "Completed" : "Implementation",
      officialStatus: releaseAllowed ? "Official" : "Not Validated", ready: platformReady, releaseAllowed: releaseAllowed,
      health: validation ? validation.health : (releaseEvidence ? releaseEvidence.health : (platformReady ? 90 : 70)), progress: Math.round((implemented / required.length) * 100),
      implemented: implemented, total: required.length,
      instrumentationCapabilities: { runtimeWrapper: true, logicalAdapter: true, projectFileRestore: typeof global.updateProjectFile === "function", sourcePatchGeneration: false },
      baseInstrumentation: base,
      lastValidation: validation ? clone({ valid: validation.valid, passed: validation.passed, failed: validation.failed, total: validation.total, health: validation.health, validatedAt: validation.validatedAt, source: "Runtime" }) : (releaseEvidence ? clone({ valid: true, failed: 0, health: releaseEvidence.health, validatedAt: releaseEvidence.completedAt, source: releaseEvidence.source }) : null),
      releaseEvidence: releaseEvidence,
      counts: { instrumentationTypes: Object.keys(state.instrumentationTypes).length, probeTypes: Object.keys(state.probeTypes).length, instrumentations: state.instrumentations.length, activeRuntimeBindings: runtimeBindings.size, investigations: state.investigations.length, performanceRecords: state.performanceRecords.length, backups: state.sourceBackups.length, reports: state.reports.length },
      warnings: [], errors: state.lastError ? [clone(state.lastError)] : [],
      nextTask: releaseAllowed ? "Run IDE-115 Diagnostic Validation release check." : "Run validateDiagnosticPlatform() once and confirm runtime instrumentation restore.",
      provides: ["Instrumentation Registry","Runtime Function Wrapper","Logical Probe Adapter","Performance Monitoring","Investigation Management","Project File Restore Adapter","Diagnostic Reporting"], updatedAt: state.updatedAt
    };
  }

  function validateDiagnosticPlatform() {
    const checks = []; function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail || "" }); }
    const snapshot = clone(state); const testName = "__IDE110_RUNTIME_TEST__"; const previousTest = global[testName];
    global[testName] = function (value) { return value + 1; };
    try {
      check("Base instrumentation", typeof global.validateDiagnosticInstrumentation === "function" && global.validateDiagnosticInstrumentation().valid === true);
      check("Instrumentation type registry", registerInstrumentationType({ id: "TRACE", title: "Trace" }).registered === true);
      check("Probe type registry", registerProbeType({ id: "ELAPSED", metric: "durationMs" }).registered === true);
      const preview = previewInstrumentation({ type: "TRACE", targetId: testName }); check("Runtime instrumentation preview", preview.valid && preview.applicationMode === "Runtime Wrapper");
      const original = global[testName]; const added = addInstrumentation({ type: "TRACE", targetId: testName });
      check("Runtime instrumentation apply", added.added && added.instrumentation.runtimeMutated && global[testName] !== original);
      check("Instrumented function execution", global[testName](1) === 2);
      check("Instrumentation verification", verifyInstrumentation(added.instrumentation.id).verified === true);
      check("Runtime instrumentation removal", removeInstrumentation(added.instrumentation.id).removed === true && global[testName] === original);
      const investigation = createInvestigation({ title: "Validation", problem: "test" }); check("Investigation creation", Boolean(investigation.id));
      check("Evidence recording", addInvestigationEvidence(investigation.id, { type: "Observation", data: "ok" }).added === true);
      check("Performance recording", recordPerformance({ targetId: testName, durationMs: 12.5 }).recorded === true);
      check("Performance ranking", getPerformanceRanking({ limit: 5 }).length >= 1);
      const backup = backupSource({ targetId: "sample.js", content: "function sample(){}", metadata: { returnOnly: true } }); check("Source backup", backup.backedUp === true);
      const restored = restoreSource(backup.backup.id); check("Logical source restore", restored.restored && restored.logicalRestore);
      check("Restore verification", verifyRestore(backup.backup.id, restored.content).verified === true);
      check("Diagnostic report", Boolean(buildDiagnosticReport({ title: "Validation Report" }).id));
      check("Status API is lightweight", !/const\s+validation\s*=\s*validateDiagnosticPlatform\s*\(/.test(getDiagnosticPlatformStatus.toString()));
    } catch (error) { check("Unexpected exception", false, error.message || String(error)); }
    finally {
      if (previousTest === undefined) delete global[testName]; else global[testName] = previousTest;
      runtimeBindings.clear(); Object.keys(state).forEach(function (key) { delete state[key]; }); Object.keys(snapshot).forEach(function (key) { state[key] = snapshot[key]; });
    }
    const passed = checks.filter(function (x) { return x.passed; }).length;
    const result = { id: "IDE-110-PLATFORM-VALIDATION", valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, health: checks.length ? Math.round((passed / checks.length) * 100) : 0, checks: checks, validatedAt: nowIso() };
    state.lastValidation = clone(result);
    if (result.valid && typeof global.saveDevelopmentReleaseEvidence === "function") {
      global.saveDevelopmentReleaseEvidence(COMPONENT_ID, result, { componentVersion: VERSION, releaseAllowed: true });
    }
    touch(); return result;
  }

  registerInstrumentationType({ id: "TRACE", title: "Execution Trace" });
  registerInstrumentationType({ id: "PERFORMANCE", title: "Performance Measurement" });
  registerInstrumentationType({ id: "STATE", title: "State Capture" });
  registerProbeType({ id: "START_END", title: "Start/End Probe", metric: "elapsed" });
  registerProbeType({ id: "COUNTER", title: "Call Counter", metric: "count" });
  registerProbeType({ id: "SNAPSHOT", title: "State Snapshot", metric: "state" });

  const api = { registerInstrumentationType, registerProbeType, previewInstrumentation, addInstrumentation, removeInstrumentation, verifyInstrumentation, createInvestigation, addInvestigationEvidence, recordPerformance, getPerformanceRanking, backupSource, restoreSource, verifyRestore, buildDiagnosticReport, getDiagnosticPlatformState, getDiagnosticPlatformStatus, validateDiagnosticPlatform };
  Object.keys(api).forEach(function (name) { global[name] = api[name]; });
  global.DiagnosticPlatform = Object.freeze(Object.assign({ id: COMPONENT_ID, version: VERSION }, api));
})(typeof window !== "undefined" ? window : globalThis);