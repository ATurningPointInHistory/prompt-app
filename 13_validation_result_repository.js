/* ============================================================
   FILE: 13_validation_result_repository.js
   Validation Result Repository
   Version: 1.0.0
   Status: Ready

   Purpose:
   - Persist validation results across page reloads.
   - Keep a compact canonical record without duplicating raw Evidence.
   - Provide an optional MemoBox Repository publication adapter.
   ============================================================ */
(function initializeValidationResultRepository(global) {
  "use strict";

  const COMPONENT_ID = "VALIDATION-RESULT-REPOSITORY";
  const VERSION = "1.0.0";
  const STORAGE_KEY = "AI_PROMPT_OS_VALIDATION_RESULT_REPOSITORY_V1";
  const MAX_RECORDS = 100;

  const state = {
    records: [],
    loaded: false,
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function text(value, fallback) { const result = String(value == null ? "" : value).trim(); return result || String(fallback || ""); }
  function finite(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function unique(values) { return [...new Set(asArray(values).filter(Boolean).map(String))]; }

  function stableStringify(value) {
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort().map(function mapKey(key) {
        return JSON.stringify(key) + ":" + stableStringify(value[key]);
      }).join(",") + "}";
    }
    return JSON.stringify(value);
  }

  function hashText(value) {
    const input = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function setError(error, operation) {
    state.lastError = {
      operation: text(operation, "unknown"),
      message: error && error.message ? error.message : String(error),
      at: nowIso()
    };
    state.updatedAt = state.lastError.at;
  }

  function compactScenarioResult(item) {
    const source = item && typeof item === "object" ? item : {};
    return {
      id: text(source.id, ""),
      scenarioId: text(source.scenarioId, ""),
      title: text(source.title, ""),
      category: text(source.category, ""),
      critical: source.critical === true,
      risk: text(source.risk, "Unknown"),
      passed: source.passed === true,
      status: text(source.status, source.passed === true ? "Passed" : "Failed"),
      detail: text(source.detail, ""),
      durationMs: finite(source.durationMs, 0),
      actualStateSequence: unique(source.actualStateSequence),
      expectedStateSequence: unique(source.expectedStateSequence),
      policyResults: clone(asArray(source.policyResults)),
      evidenceReferences: unique(source.evidenceReferences),
      restoreResult: clone(source.restoreResult || {}),
      safetyResult: clone(source.safetyResult || {}),
      closureResult: clone(source.closureResult || {}),
      integrationResults: clone(asArray(source.integrationResults)),
      performanceResults: clone(source.performanceResults || {}),
      expectedRestoreResult: text(source.expectedRestoreResult, ""),
      expectedClosureResult: text(source.expectedClosureResult, ""),
      expectedReopenDecision: text(source.expectedReopenDecision, ""),
      executedAt: text(source.executedAt, "")
    };
  }

  function collectEvidenceReferences(result) {
    const refs = [];
    asArray(result && result.scenarioResults).forEach(function fromScenario(item) {
      refs.push(...asArray(item && item.evidenceReferences));
    });
    if (result && result.evidencePackage) {
      refs.push(...asArray(result.evidencePackage.evidenceReferences));
    }
    return unique(refs);
  }

  function compactValidationPayload(result) {
    const source = result && typeof result === "object" ? result : {};
    const scenarioResults = asArray(source.scenarioResults).map(compactScenarioResult);
    const report = source.report && typeof source.report === "object" ? source.report : {};
    const handoff = source.handoff && typeof source.handoff === "object" ? source.handoff : {};
    const evidencePackage = source.evidencePackage && typeof source.evidencePackage === "object" ? source.evidencePackage : {};

    return {
      id: text(source.id, ""),
      componentId: text(source.componentId, "Unknown"),
      version: text(source.version, ""),
      targetComponent: text(source.targetComponent, ""),
      targetVersion: text(source.targetVersion, ""),
      status: text(source.status, "Unknown"),
      severity: text(source.severity, "Unknown"),
      releaseAllowed: source.releaseAllowed === true,
      implementationReady: source.implementationReady === true,
      passed: finite(source.passed, 0),
      failed: finite(source.failed, 0),
      warnings: finite(source.warnings, 0),
      total: finite(source.total, scenarioResults.length),
      health: finite(source.health, 0),
      progress: finite(source.progress, 0),
      gates: clone(asArray(source.gates)),
      coverageResults: clone(asArray(source.coverageResults)),
      scenarioResults: scenarioResults,
      evidenceReferences: collectEvidenceReferences(source),
      evidencePackage: {
        id: text(evidencePackage.id, ""),
        decision: text(evidencePackage.decision, source.status || ""),
        releaseAllowed: evidencePackage.releaseAllowed === true,
        createdAt: text(evidencePackage.createdAt, "")
      },
      report: {
        id: text(report.id, ""),
        title: text(report.title, ""),
        executiveSummary: text(report.executiveSummary, ""),
        generatedAt: text(report.generatedAt, "")
      },
      handoff: {
        id: text(handoff.id, ""),
        validationDecision: text(handoff.validationDecision, ""),
        restoreStatus: text(handoff.restoreStatus, ""),
        safetyStatus: text(handoff.safetyStatus, ""),
        responsibleWorkflow: text(handoff.responsibleWorkflow, ""),
        recommendedActions: unique(handoff.recommendedActions),
        regressionRequirements: unique(handoff.regressionRequirements),
        releaseAllowed: handoff.releaseAllowed === true,
        generatedAt: text(handoff.generatedAt, "")
      },
      durationMs: finite(source.durationMs, 0),
      startedAt: text(source.startedAt, ""),
      completedAt: text(source.completedAt, ""),
      repositoryVersion: text(source.repositoryVersion, ""),
      datasetVersion: text(source.datasetVersion, "")
    };
  }

  function normalizeStoredRecord(input) {
    const source = input && typeof input === "object" ? input : {};
    const payload = compactValidationPayload(source.payload || source.result || source);
    if (!payload.id) throw new Error("Validation result id is required.");
    const official = source.official === true || (
      payload.status === "Passed" &&
      payload.releaseAllowed === true &&
      payload.implementationReady === true
    );
    const savedAt = text(source.savedAt, nowIso());
    const canonical = {
      recordId: text(source.recordId, "VALIDATION-RECORD-" + payload.id),
      id: payload.id,
      sourceComponent: text(source.sourceComponent, payload.componentId),
      sourceType: text(source.sourceType, "Validation Result"),
      targetComponent: text(source.targetComponent, payload.targetComponent),
      resultVersion: text(source.resultVersion, payload.version),
      repositoryVersion: text(source.repositoryVersion, payload.repositoryVersion),
      datasetVersion: text(source.datasetVersion, payload.datasetVersion),
      status: payload.status,
      releaseAllowed: payload.releaseAllowed,
      implementationReady: payload.implementationReady,
      official: official,
      health: payload.health,
      completedAt: payload.completedAt,
      evidenceReferences: payload.evidenceReferences,
      payload: payload,
      savedAt: savedAt,
      updatedAt: nowIso()
    };
    canonical.contentHash = hashText(stableStringify(canonical.payload));
    return canonical;
  }

  function serializeRepository() {
    return {
      id: COMPONENT_ID,
      version: VERSION,
      storageKey: STORAGE_KEY,
      records: state.records.map(clone),
      updatedAt: state.updatedAt
    };
  }

  function persistRepository() {
    try {
      if (!global.localStorage) throw new Error("localStorage is unavailable.");
      state.updatedAt = nowIso();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeRepository()));
      state.lastError = null;
      return { persisted: true, recordCount: state.records.length, storageKey: STORAGE_KEY, updatedAt: state.updatedAt };
    } catch (error) {
      setError(error, "persistRepository");
      return { persisted: false, reason: state.lastError.message, storageKey: STORAGE_KEY };
    }
  }

  function loadValidationResultRepository() {
    try {
      state.records = [];
      if (global.localStorage) {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const records = Array.isArray(parsed) ? parsed : asArray(parsed && parsed.records);
          records.forEach(function loadRecord(item) {
            try { state.records.push(normalizeStoredRecord(item)); }
            catch (_) { /* skip invalid legacy record */ }
          });
        }
      }
      state.records.sort(function newest(a, b) {
        return Date.parse(b.completedAt || b.savedAt || 0) - Date.parse(a.completedAt || a.savedAt || 0);
      });
      state.records = state.records.slice(0, MAX_RECORDS);
      state.loaded = true;
      state.lastError = null;
      state.updatedAt = nowIso();
      return { loaded: true, recordCount: state.records.length, storageKey: STORAGE_KEY };
    } catch (error) {
      setError(error, "loadValidationResultRepository");
      state.loaded = true;
      return { loaded: false, recordCount: 0, reason: state.lastError.message, storageKey: STORAGE_KEY };
    }
  }

  function saveValidationResult(result, options) {
    const settings = options && typeof options === "object" ? options : {};
    try {
      const record = normalizeStoredRecord(Object.assign({}, settings, { payload: result }));
      const index = state.records.findIndex(function find(item) { return item.id === record.id; });
      if (index >= 0) state.records[index] = record;
      else state.records.unshift(record);
      state.records.sort(function newest(a, b) {
        return Date.parse(b.completedAt || b.savedAt || 0) - Date.parse(a.completedAt || a.savedAt || 0);
      });
      state.records = state.records.slice(0, finite(settings.maxRecords, MAX_RECORDS));
      const persistence = settings.persist === false
        ? { persisted: false, skipped: true, reason: "Persistence disabled by caller." }
        : persistRepository();
      return {
        saved: true,
        replaced: index >= 0,
        persisted: persistence.persisted === true,
        record: clone(Object.assign({}, record, { payload: undefined })),
        storageKey: STORAGE_KEY,
        error: persistence.persisted === false && !persistence.skipped ? persistence.reason : null
      };
    } catch (error) {
      setError(error, "saveValidationResult");
      return { saved: false, persisted: false, reason: state.lastError.message, storageKey: STORAGE_KEY };
    }
  }

  function getValidationResult(id) {
    const target = text(id, "");
    const record = state.records.find(function find(item) { return item.id === target || item.recordId === target; });
    return clone(record || null);
  }

  function getValidationResults(filter) {
    const settings = filter && typeof filter === "object" ? filter : {};
    const limit = Math.max(0, finite(settings.limit, MAX_RECORDS));
    return state.records.filter(function match(item) {
      if (settings.sourceComponent && item.sourceComponent !== String(settings.sourceComponent)) return false;
      if (settings.targetComponent && item.targetComponent !== String(settings.targetComponent)) return false;
      if (settings.status && item.status !== String(settings.status)) return false;
      if (settings.official === true && item.official !== true) return false;
      if (settings.releaseAllowed === true && item.releaseAllowed !== true) return false;
      return true;
    }).slice(0, limit || MAX_RECORDS).map(clone);
  }

  function getLatestValidationResult(filter) {
    const records = getValidationResults(Object.assign({}, filter || {}, { limit: 1 }));
    return records.length ? records[0] : null;
  }

  function removeValidationResult(id, options) {
    const settings = options && typeof options === "object" ? options : {};
    const target = text(id, "");
    const before = state.records.length;
    state.records = state.records.filter(function keep(item) { return item.id !== target && item.recordId !== target; });
    const removed = state.records.length !== before;
    if (removed && settings.persist !== false) persistRepository();
    return { removed: removed, id: target, recordCount: state.records.length };
  }

  function clearValidationResultRepository(options) {
    const settings = options && typeof options === "object" ? options : {};
    state.records = [];
    state.updatedAt = nowIso();
    if (settings.persist !== false) persistRepository();
    return { cleared: true, recordCount: 0 };
  }

  function buildValidationResultRepositoryMemo(record, options) {
    const settings = options && typeof options === "object" ? options : {};
    const source = normalizeStoredRecord(record);
    const payload = source.payload;
    const memoId = text(settings.memoId, "VALIDATION-RESULT-" + payload.id);
    const summary = [
      source.sourceComponent,
      payload.status,
      payload.passed + "/" + payload.total,
      "Health " + payload.health,
      source.official ? "Official" : "Review"
    ].join(" / ");
    const textBody = [
      "============================================================",
      "Validation Result Repository Record",
      "============================================================",
      "",
      "Record ID:", source.recordId,
      "Validation ID:", payload.id,
      "Component:", source.sourceComponent,
      "Target:", source.targetComponent || "",
      "Version:", source.resultVersion || "",
      "Status:", payload.status,
      "Release Allowed:", String(payload.releaseAllowed),
      "Implementation Ready:", String(payload.implementationReady),
      "Health:", String(payload.health),
      "Repository Version:", source.repositoryVersion || "",
      "Dataset Version:", source.datasetVersion || "",
      "Completed At:", payload.completedAt || "",
      "Content Hash:", source.contentHash,
      "",
      "Evidence References:",
      source.evidenceReferences.length ? source.evidenceReferences.join("\n") : "None",
      "",
      "Canonical Validation Record JSON:",
      JSON.stringify(payload, null, 2)
    ].join("\n");

    return {
      boxTitle: "Validation Result",
      id: memoId,
      name: source.sourceComponent + " Validation Result " + payload.status,
      summary: summary,
      text: textBody,
      knowledgeType: "ValidationResult",
      category: "Development IDE",
      type: "Report",
      status: source.official ? "Official" : "Review",
      series: "IDE",
      version: source.resultVersion,
      keywords: unique(["Validation", "Validation Result", source.sourceComponent, source.targetComponent, payload.status]),
      relationships: unique([source.sourceComponent, source.targetComponent, payload.id, payload.report && payload.report.id, payload.handoff && payload.handoff.id]),
      locked: source.official,
      migrationLocked: false,
      memoMode: "knowledge",
      sourceFormat: "Validation Result Repository",
      sourceFileName: "runtime/localStorage",
      createdAt: text(settings.createdAt, source.savedAt),
      updatedAt: nowIso()
    };
  }

  function publishValidationResultToRepository(resultOrId, options) {
    const settings = options && typeof options === "object" ? options : {};
    let record = null;
    if (typeof resultOrId === "string") record = getValidationResult(resultOrId);
    else if (resultOrId && resultOrId.recordId && resultOrId.payload) record = clone(resultOrId);
    else if (resultOrId && typeof resultOrId === "object") {
      const saved = saveValidationResult(resultOrId, { persist: settings.persistLocal !== false });
      if (saved.saved) record = getValidationResult(resultOrId.id);
    }
    if (!record) return { published: false, reason: "Validation record was not found." };
    if (typeof global.getMemoBoxList !== "function" || typeof global.saveMemoBoxes !== "function") {
      return { published: false, pending: true, reason: "MemoBox Repository adapter is unavailable.", recordId: record.recordId };
    }

    try {
      const memo = buildValidationResultRepositoryMemo(record, settings);
      const list = global.getMemoBoxList();
      if (!Array.isArray(list)) throw new Error("MemoBox Repository list is unavailable.");
      const index = list.findIndex(function find(item) { return item && item.id === memo.id; });
      if (index >= 0) {
        const createdAt = list[index].createdAt || memo.createdAt;
        list[index] = Object.assign({}, list[index], memo, { createdAt: createdAt });
      } else {
        list.push(memo);
      }
      global.saveMemoBoxes();
      return {
        published: true,
        replaced: index >= 0,
        memoId: memo.id,
        recordId: record.recordId,
        status: memo.status,
        publishedAt: nowIso()
      };
    } catch (error) {
      setError(error, "publishValidationResultToRepository");
      return { published: false, reason: state.lastError.message, recordId: record.recordId };
    }
  }

  function exportValidationResultRepository() {
    return clone(serializeRepository());
  }

  function importValidationResultRepository(input, options) {
    const settings = options && typeof options === "object" ? options : {};
    try {
      const parsed = typeof input === "string" ? JSON.parse(input) : input;
      const records = Array.isArray(parsed) ? parsed : asArray(parsed && parsed.records);
      if (settings.replace === true) state.records = [];
      let imported = 0;
      records.forEach(function importRecord(item) {
        try {
          const record = normalizeStoredRecord(item);
          const index = state.records.findIndex(function find(existing) { return existing.id === record.id; });
          if (index >= 0) state.records[index] = record;
          else state.records.push(record);
          imported += 1;
        } catch (_) { /* skip invalid record */ }
      });
      state.records.sort(function newest(a, b) {
        return Date.parse(b.completedAt || b.savedAt || 0) - Date.parse(a.completedAt || a.savedAt || 0);
      });
      state.records = state.records.slice(0, MAX_RECORDS);
      const persistence = settings.persist === false ? { persisted: false } : persistRepository();
      return { imported: imported, recordCount: state.records.length, persisted: persistence.persisted === true };
    } catch (error) {
      setError(error, "importValidationResultRepository");
      return { imported: 0, recordCount: state.records.length, reason: state.lastError.message };
    }
  }

  function validateValidationResultRepository() {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    try {
      check("Repository loaded", state.loaded === true);
      check("Storage key", STORAGE_KEY.length > 10, STORAGE_KEY);
      check("Record limit", MAX_RECORDS >= 50, "max=" + MAX_RECORDS);
      check("Canonical normalizer", typeof normalizeStoredRecord === "function");
      check("Compact payload", typeof compactValidationPayload === "function");
      check("Save API", typeof saveValidationResult === "function");
      check("Load API", typeof loadValidationResultRepository === "function");
      check("Query API", typeof getValidationResults === "function" && typeof getLatestValidationResult === "function");
      check("Export/import API", typeof exportValidationResultRepository === "function" && typeof importValidationResultRepository === "function");
      check("Repository adapter", typeof publishValidationResultToRepository === "function");
      check("Evidence reference policy", compactValidationPayload({ id: "TEST", componentId: "TEST", scenarioResults: [{ evidenceReferences: ["E1", "E1"] }] }).evidenceReferences.length === 1);
      check("Raw Evidence not duplicated", !Object.prototype.hasOwnProperty.call(compactValidationPayload({ id: "TEST", componentId: "TEST" }), "rawEvidence"));
    } catch (error) {
      check("Unexpected exception", false, error && error.message ? error.message : String(error));
    }
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return {
      id: COMPONENT_ID + "-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      valid: passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      checks: checks,
      validatedAt: nowIso()
    };
  }

  function getValidationResultRepositoryStatus() {
    const validation = validateValidationResultRepository();
    const officialCount = state.records.filter(function official(item) { return item.official; }).length;
    const latest = state.records.length ? state.records[0] : null;
    return {
      id: COMPONENT_ID,
      title: "Validation Result Repository",
      name: "Validation Result Repository",
      version: VERSION,
      status: validation.valid ? "Ready" : "Attention",
      lifecycleStatus: "Active",
      ready: validation.valid,
      health: validation.health,
      progress: 100,
      recordCount: state.records.length,
      officialRecordCount: officialCount,
      latestRecord: latest ? clone(Object.assign({}, latest, { payload: undefined })) : null,
      storage: {
        adapter: "localStorage",
        storageKey: STORAGE_KEY,
        loaded: state.loaded,
        maxRecords: MAX_RECORDS
      },
      repositoryAdapter: {
        type: "MemoBox Repository",
        available: typeof global.getMemoBoxList === "function" && typeof global.saveMemoBoxes === "function",
        automatic: false
      },
      provides: [
        "Persistent Validation Result Storage",
        "Canonical Validation Record",
        "Official Result Query",
        "MemoBox Repository Publication Adapter",
        "IDE-140 Analytics Intake"
      ],
      nextTask: state.records.length
        ? "Use official validation records as IDE-140 analytics input."
        : "Run an official validation to create the first persistent record.",
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt
    };
  }

  const api = {
    loadValidationResultRepository: loadValidationResultRepository,
    saveValidationResult: saveValidationResult,
    getValidationResult: getValidationResult,
    getValidationResults: getValidationResults,
    getLatestValidationResult: getLatestValidationResult,
    removeValidationResult: removeValidationResult,
    clearValidationResultRepository: clearValidationResultRepository,
    exportValidationResultRepository: exportValidationResultRepository,
    importValidationResultRepository: importValidationResultRepository,
    publishValidationResultToRepository: publishValidationResultToRepository,
    buildValidationResultRepositoryMemo: buildValidationResultRepositoryMemo,
    validateValidationResultRepository: validateValidationResultRepository,
    getValidationResultRepositoryStatus: getValidationResultRepositoryStatus
  };

  loadValidationResultRepository();
  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.ValidationResultRepository = Object.freeze(Object.assign({
    id: COMPONENT_ID,
    version: VERSION,
    storageKey: STORAGE_KEY
  }, api));

  if (typeof global.registerDevelopmentStatus === "function") {
    global.registerDevelopmentStatus({ id: COMPONENT_ID, statusApi: "getValidationResultRepositoryStatus", validator: "validateValidationResultRepository" }, { source: "runtime", persist: false });
  }
  if (typeof global.registerDevelopmentDashboardModule === "function") {
    global.registerDevelopmentDashboardModule({ id: COMPONENT_ID, title: "Validation Result Repository", statusApi: "getValidationResultRepositoryStatus", validator: "validateValidationResultRepository" });
  }
})(typeof window !== "undefined" ? window : globalThis);