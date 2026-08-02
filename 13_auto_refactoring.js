/* ============================================================
   FILE: 13_auto_refactoring.js
   IDE-150 Auto Refactoring
   Version: 1.2.2
   Status: Controlled Application Trial Snapshot Persistence Hardened
   Design Freeze: 2026-07-26
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-150";
  const VERSION = "1.2.2";
  const STORAGE_KEY = "AI_PROMPT_OS_IDE150_CORE_V1";
  const STORAGE_SCHEMA_VERSION = 2;
  const IDE140_PHASE2B_STORAGE_KEY = "AI_PROMPT_OS_IDE140_PHASE2B_V1";
  const ARTIFACT_PREFIX = "AI_PROMPT_OS_IDE150_ARTIFACT_V1:";
  const MAX_RECORDS = 30;
  const MAX_HISTORY = 200;
  const MAX_ROLLBACK_SNAPSHOTS = 10;
  const MAX_ARTIFACTS = 10;

  const PIPELINE_STAGES = Object.freeze([
    "Handoff Validation",
    "Refactoring Request",
    "Scope Definition",
    "Change Planning",
    "Dependency References",
    "Function Candidate",
    "Preview and Diff",
    "Sandbox Validation",
    "Explicit Approval",
    "Transactional Application",
    "Repository Validation",
    "Rollback Verification",
    "Change Report",
    "Implementation Package",
    "Completion Gate"
  ]);

  const CORE_PHASE_1_STAGES = Object.freeze(PIPELINE_STAGES.slice());
  const CORE_PHASE_2_CAPABILITIES = Object.freeze([
    "Governed Patch Generation",
    "Full Dependency Analysis",
    "External Policy Platform Adapter"
  ]);

  const REQUEST_STATES = Object.freeze([
    "Requested",
    "Scoped",
    "Planned",
    "Candidate Ready",
    "Sandbox Passed",
    "Awaiting Approval",
    "Approved",
    "Applying",
    "Committed",
    "Rolled Back",
    "Rejected",
    "Blocked",
    "Failed"
  ]);

  const DEFAULT_BUDGET = Object.freeze({
    fileLimit: 1,
    functionLimit: 1,
    functionSourceCharLimit: 120000,
    fileSourceCharLimit: 2000000,
    changedLineLimit: 500,
    diffOutputCharLimit: 60000,
    dependencyReferenceLimit: 100,
    rollbackSnapshotLimit: MAX_ROLLBACK_SNAPSHOTS
  });

  const state = {
    requests: new Map(),
    plans: new Map(),
    candidates: new Map(),
    validations: new Map(),
    approvals: new Map(),
    transactions: new Map(),
    rollbacks: new Map(),
    reports: new Map(),
    packages: new Map(),
    dependencyAnalyses: new Map(),
    patches: new Map(),
    policyDecisions: new Map(),
    history: [],
    sequence: 0,
    loaded: false,
    lastPersistence: null,
    lastCoreValidation: null,
    lastIntegrationValidation: null,
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function text(value, fallback) { const result = String(value == null ? "" : value).trim(); return result || String(fallback || ""); }
  function finite(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function unique(values) { return [...new Set(asArray(values).filter(Boolean).map(String))]; }
  function nextId(prefix) {
    state.sequence += 1;
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }
  function touch() { state.updatedAt = nowIso(); }
  function trimArray(array, limit) { while (array.length > limit) array.shift(); }
  function trimMap(map, limit) { while (map.size > limit) map.delete(map.keys().next().value); }
  function hashText(value) {
    const source = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function recordEvent(type, details) {
    const event = {
      id: nextId("IDE-150-EVENT"),
      type: text(type, "Event"),
      details: clone(details || {}),
      at: nowIso()
    };
    state.history.push(event);
    trimArray(state.history, MAX_HISTORY);
    touch();
    return clone(event);
  }

  function normalizeBudget(input) {
    const source = input && typeof input === "object" ? input : {};
    const budget = {};
    Object.keys(DEFAULT_BUDGET).forEach(function mapBudget(key) {
      budget[key] = Math.max(0, finite(source[key], DEFAULT_BUDGET[key]));
    });
    budget.fileLimit = 1;
    budget.functionLimit = 1;
    return budget;
  }

  function compactRequest(item) {
    if (!item) return null;
    return {
      id: item.id,
      status: item.status,
      sourceType: item.sourceType,
      sourceHandoffId: item.sourceHandoffId,
      recommendationId: item.recommendationId,
      targetFile: item.scope && item.scope.targetFile,
      targetFunction: item.scope && item.scope.targetFunction,
      riskLevel: item.riskLevel,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  function compactPlan(item) {
    if (!item) return null;
    return {
      id: item.id,
      requestId: item.requestId,
      status: item.status,
      passed: item.passed === true,
      targetFile: item.targetFile,
      targetFunction: item.targetFunction,
      operation: item.operation,
      dependencyReferenceCount: asArray(item.dependencyReferences).length,
      createdAt: item.createdAt
    };
  }

  function compactCandidate(item) {
    if (!item) return null;
    return {
      id: item.id,
      requestId: item.requestId,
      planId: item.planId,
      status: item.status,
      targetFile: item.targetFile,
      targetFunction: item.targetFunction,
      beforeHash: item.beforeHash,
      afterHash: item.afterHash,
      changedLines: item.diff && item.diff.changedLines,
      riskLevel: item.riskLevel,
      sandboxStatus: item.sandboxStatus,
      approvalStatus: item.approvalStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      artifactKey: text(item.artifactKey, "")
    };
  }

  function compactTransaction(item) {
    if (!item) return null;
    return {
      id: item.id,
      requestId: item.requestId,
      candidateId: item.candidateId,
      status: item.status,
      targetFile: item.targetFile,
      targetFunction: item.targetFunction,
      beforeFileHash: item.beforeFileHash,
      afterFileHash: item.afterFileHash,
      committedAt: item.committedAt,
      rollbackStatus: item.rollbackStatus,
      artifactKey: text(item.artifactKey, "")
    };
  }

  function compactDependencyAnalysis(item) {
    if (!item) return null;
    return {
      id: item.id,
      planId: item.planId,
      requestId: item.requestId,
      status: item.status,
      passed: item.passed === true,
      targetFile: item.targetFile,
      targetFunction: item.targetFunction,
      riskLevel: item.riskLevel,
      inboundReferenceCount: finite(item.summary && item.summary.inboundReferenceCount, 0),
      outboundBeforeCount: finite(item.summary && item.summary.outboundBeforeCount, 0),
      outboundAfterCount: finite(item.summary && item.summary.outboundAfterCount, 0),
      impactedFileCount: finite(item.summary && item.summary.impactedFileCount, 0),
      analyzedAt: item.analyzedAt,
      artifactKey: text(item.artifactKey, "")
    };
  }

  function compactPatch(item) {
    if (!item) return null;
    return {
      id: item.id,
      candidateId: item.candidateId,
      planId: item.planId,
      requestId: item.requestId,
      status: item.status,
      format: item.format,
      targetFile: item.targetFile,
      targetFunction: item.targetFunction,
      beforeFunctionHash: item.preconditions && item.preconditions.beforeFunctionHash,
      afterFunctionHash: item.postconditions && item.postconditions.afterFunctionHash,
      dependencyAnalysisId: item.dependencyAnalysisId,
      policyDecisionId: item.policyDecisionId,
      verifiedAt: item.verifiedAt || "",
      createdAt: item.createdAt,
      artifactKey: text(item.artifactKey, "")
    };
  }

  function compactPolicyDecision(item) {
    if (!item) return null;
    return {
      id: item.id,
      adapterId: item.adapterId,
      adapterVersion: item.adapterVersion,
      requestId: item.requestId,
      planId: item.planId,
      candidateId: item.candidateId,
      allowed: item.allowed === true,
      status: item.status,
      riskLevel: item.riskLevel,
      evaluatedAt: item.evaluatedAt,
      artifactKey: text(item.artifactKey, "")
    };
  }

  function getArtifactKey(type, id) {
    return ARTIFACT_PREFIX + String(type || "RECORD").toUpperCase() + ":" + String(id || "");
  }

  function buildPersistenceRecords() {
    const candidateValues = [...state.candidates.values()].slice(-MAX_RECORDS);
    const transactionValues = [...state.transactions.values()].slice(-MAX_ROLLBACK_SNAPSHOTS);
    const dependencyValues = [...state.dependencyAnalyses.values()].slice(-MAX_RECORDS);
    const patchValues = [...state.patches.values()].slice(-MAX_RECORDS);
    const policyValues = [...state.policyDecisions.values()].slice(-MAX_RECORDS);
    const candidateArtifactIds = new Set(candidateValues.slice(-MAX_ARTIFACTS).map(function id(item) { return item.id; }));
    const transactionArtifactIds = new Set(transactionValues.slice(-MAX_ARTIFACTS).map(function id(item) { return item.id; }));
    const dependencyArtifactIds = new Set(dependencyValues.slice(-MAX_ARTIFACTS).map(function id(item) { return item.id; }));
    const patchArtifactIds = new Set(patchValues.slice(-MAX_ARTIFACTS).map(function id(item) { return item.id; }));
    const policyArtifactIds = new Set(policyValues.slice(-MAX_ARTIFACTS).map(function id(item) { return item.id; }));
    const candidates = candidateValues.map(function compact(item) {
      item.artifactKey = candidateArtifactIds.has(item.id) ? getArtifactKey("CANDIDATE", item.id) : "";
      return compactCandidate(item);
    });
    const transactions = transactionValues.map(function compact(item) {
      item.artifactKey = transactionArtifactIds.has(item.id) ? getArtifactKey("TRANSACTION", item.id) : "";
      return compactTransaction(item);
    });
    const dependencyAnalyses = dependencyValues.map(function compact(item) {
      item.artifactKey = dependencyArtifactIds.has(item.id) ? getArtifactKey("DEPENDENCY", item.id) : "";
      return compactDependencyAnalysis(item);
    });
    const patches = patchValues.map(function compact(item) {
      item.artifactKey = patchArtifactIds.has(item.id) ? getArtifactKey("PATCH", item.id) : "";
      return compactPatch(item);
    });
    const policyDecisions = policyValues.map(function compact(item) {
      item.artifactKey = policyArtifactIds.has(item.id) ? getArtifactKey("POLICY", item.id) : "";
      return compactPolicyDecision(item);
    });
    return {
      candidates: candidates,
      transactions: transactions,
      dependencyAnalyses: dependencyAnalyses,
      patches: patches,
      policyDecisions: policyDecisions,
      artifactIndex: candidates.concat(transactions, dependencyAnalyses, patches, policyDecisions).map(function key(item) { return item.artifactKey; }).filter(Boolean)
    };
  }

  function serializeState() {
    const persistenceRecords = buildPersistenceRecords();
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      componentId: COMPONENT_ID,
      version: VERSION,
      sequence: state.sequence,
      requests: [...state.requests.values()].slice(-MAX_RECORDS),
      plans: [...state.plans.values()].slice(-MAX_RECORDS),
      candidates: persistenceRecords.candidates,
      validations: [...state.validations.values()].slice(-MAX_RECORDS),
      approvals: [...state.approvals.values()].slice(-MAX_RECORDS),
      transactions: persistenceRecords.transactions,
      rollbacks: [...state.rollbacks.values()].slice(-MAX_ROLLBACK_SNAPSHOTS),
      reports: [...state.reports.values()].slice(-MAX_RECORDS),
      packages: [...state.packages.values()].slice(-MAX_RECORDS),
      dependencyAnalyses: persistenceRecords.dependencyAnalyses,
      patches: persistenceRecords.patches,
      policyDecisions: persistenceRecords.policyDecisions,
      history: state.history.slice(-MAX_HISTORY),
      artifactIndex: persistenceRecords.artifactIndex,
      lastCoreValidation: clone(state.lastCoreValidation),
      lastIntegrationValidation: clone(state.lastIntegrationValidation),
      updatedAt: state.updatedAt
    };
  }

  function readStoredPayload() {
    try {
      if (!global.localStorage) return null;
      const raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function persistArtifactRecords(payload, previousPayload) {
    const keepKeys = new Set(asArray(payload && payload.artifactIndex));
    const previousKeys = asArray(previousPayload && previousPayload.artifactIndex);
    let candidateArtifactCount = 0;
    let transactionArtifactCount = 0;
    let dependencyArtifactCount = 0;
    let patchArtifactCount = 0;
    let policyArtifactCount = 0;
    let estimatedBytes = 0;
    const failed = [];

    [...state.candidates.values()].forEach(function saveCandidate(item) {
      if (!item || !item.artifactKey || !keepKeys.has(item.artifactKey)) return;
      if (typeof item.beforeFunctionSource !== "string" || typeof item.afterFunctionSource !== "string") return;
      try {
        const raw = JSON.stringify(item);
        global.localStorage.setItem(item.artifactKey, raw);
        candidateArtifactCount += 1;
        estimatedBytes += raw.length * 2;
      } catch (error) {
        failed.push({ key: item.artifactKey, error: error && error.message ? error.message : String(error) });
      }
    });

    [...state.transactions.values()].forEach(function saveTransaction(item) {
      if (!item || !item.artifactKey || !keepKeys.has(item.artifactKey)) return;
      if (!item.rollbackSnapshot) return;
      const hasInlineSource = typeof item.rollbackSnapshot.source === "string" && item.rollbackSnapshot.source.length > 0;
      const hasSnapshotReference = typeof item.rollbackSnapshot.storageKey === "string" && item.rollbackSnapshot.storageKey.length > 0;
      if (!hasInlineSource && !hasSnapshotReference) return;
      try {
        const persistedItem = clone(item);
        if (hasSnapshotReference && persistedItem.rollbackSnapshot) {
          persistedItem.rollbackSnapshot.source = "";
          persistedItem.rollbackSnapshot.sourceStoredSeparately = true;
        }
        const raw = JSON.stringify(persistedItem);
        global.localStorage.setItem(item.artifactKey, raw);
        transactionArtifactCount += 1;
        estimatedBytes += raw.length * 2;
      } catch (error) {
        failed.push({ key: item.artifactKey, error: error && error.message ? error.message : String(error) });
      }
    });

    [...state.dependencyAnalyses.values()].forEach(function saveDependency(item) {
      if (!item || !item.artifactKey || !keepKeys.has(item.artifactKey)) return;
      if (!Array.isArray(item.inboundReferences) || !Array.isArray(item.checks)) return;
      try {
        const raw = JSON.stringify(item);
        global.localStorage.setItem(item.artifactKey, raw);
        dependencyArtifactCount += 1;
        estimatedBytes += raw.length * 2;
      } catch (error) {
        failed.push({ key: item.artifactKey, error: error && error.message ? error.message : String(error) });
      }
    });

    [...state.patches.values()].forEach(function savePatch(item) {
      if (!item || !item.artifactKey || !keepKeys.has(item.artifactKey)) return;
      if (!item.replacement || typeof item.replacement.source !== "string") return;
      try {
        const raw = JSON.stringify(item);
        global.localStorage.setItem(item.artifactKey, raw);
        patchArtifactCount += 1;
        estimatedBytes += raw.length * 2;
      } catch (error) {
        failed.push({ key: item.artifactKey, error: error && error.message ? error.message : String(error) });
      }
    });

    [...state.policyDecisions.values()].forEach(function savePolicy(item) {
      if (!item || !item.artifactKey || !keepKeys.has(item.artifactKey)) return;
      if (!item.rawDecision && !Array.isArray(item.rules)) return;
      try {
        const raw = JSON.stringify(item);
        global.localStorage.setItem(item.artifactKey, raw);
        policyArtifactCount += 1;
        estimatedBytes += raw.length * 2;
      } catch (error) {
        failed.push({ key: item.artifactKey, error: error && error.message ? error.message : String(error) });
      }
    });

    previousKeys.forEach(function removeStale(key) {
      if (!keepKeys.has(key)) {
        try { global.localStorage.removeItem(key); } catch (_) {}
      }
    });

    return {
      persisted: failed.length === 0,
      candidateArtifactCount: candidateArtifactCount,
      transactionArtifactCount: transactionArtifactCount,
      dependencyArtifactCount: dependencyArtifactCount,
      patchArtifactCount: patchArtifactCount,
      policyArtifactCount: policyArtifactCount,
      artifactKeyCount: keepKeys.size,
      estimatedBytes: estimatedBytes,
      failed: failed
    };
  }

  function readArtifact(key) {
    try {
      if (!global.localStorage || !key) return null;
      const raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function getCandidateRecord(id) {
    const key = String(id || "");
    const current = state.candidates.get(key) || null;
    if (!current) return null;
    if (typeof current.beforeFunctionSource === "string" && typeof current.afterFunctionSource === "string") return current;
    const artifact = readArtifact(current.artifactKey);
    if (artifact && artifact.id === key) { state.candidates.set(key, artifact); return artifact; }
    return current;
  }

  function hydrateTransactionSnapshot(item) {
    if (!item || !item.rollbackSnapshot) return item;
    if (typeof item.rollbackSnapshot.source === "string" && item.rollbackSnapshot.source.length > 0) return item;
    const storageKey = text(item.rollbackSnapshot.storageKey, "");
    if (!storageKey) return item;
    const snapshot = readArtifact(storageKey);
    if (!snapshot || snapshot.transactionId !== item.id || typeof snapshot.source !== "string") return item;
    if (snapshot.sourceHash && hashText(snapshot.source) !== snapshot.sourceHash) return item;
    item.rollbackSnapshot.source = snapshot.source;
    item.rollbackSnapshot.sourceHash = snapshot.sourceHash || item.rollbackSnapshot.sourceHash;
    item.rollbackSnapshot.persisted = true;
    item.rollbackSnapshot.verifiedAt = snapshot.verifiedAt || item.rollbackSnapshot.verifiedAt || "";
    return item;
  }

  function getTransactionRecord(id) {
    const key = String(id || "");
    const current = state.transactions.get(key) || null;
    if (!current) return null;
    hydrateTransactionSnapshot(current);
    if (current.rollbackSnapshot && typeof current.rollbackSnapshot.source === "string" && current.rollbackSnapshot.source.length > 0) return current;
    const artifact = readArtifact(current.artifactKey);
    if (artifact && artifact.id === key) {
      hydrateTransactionSnapshot(artifact);
      state.transactions.set(key, artifact);
      return artifact;
    }
    return current;
  }


  function hydrateArtifactRecord(map, id, fullCheck) {
    const key = String(id || "");
    const current = map.get(key) || null;
    if (!current) return null;
    if (typeof fullCheck === "function" && fullCheck(current)) return current;
    const artifact = readArtifact(current.artifactKey);
    if (artifact && artifact.id === key) { map.set(key, artifact); return artifact; }
    return current;
  }

  function getDependencyAnalysisRecord(id) {
    return hydrateArtifactRecord(state.dependencyAnalyses, id, function full(item) { return Array.isArray(item.inboundReferences) && Array.isArray(item.checks); });
  }

  function getPatchRecord(id) {
    return hydrateArtifactRecord(state.patches, id, function full(item) { return Boolean(item.replacement && typeof item.replacement.source === "string"); });
  }

  function getPolicyDecisionRecord(id) {
    return hydrateArtifactRecord(state.policyDecisions, id, function full(item) { return Boolean(item.rawDecision || Array.isArray(item.rules)); });
  }

  function captureRuntimeState() {
    return {
      requests: [...state.requests.values()].map(clone), plans: [...state.plans.values()].map(clone),
      candidates: [...state.candidates.values()].map(clone), validations: [...state.validations.values()].map(clone),
      approvals: [...state.approvals.values()].map(clone), transactions: [...state.transactions.values()].map(clone),
      rollbacks: [...state.rollbacks.values()].map(clone), reports: [...state.reports.values()].map(clone),
      packages: [...state.packages.values()].map(clone), dependencyAnalyses: [...state.dependencyAnalyses.values()].map(clone),
      patches: [...state.patches.values()].map(clone), policyDecisions: [...state.policyDecisions.values()].map(clone), history: state.history.map(clone), sequence: state.sequence,
      lastPersistence: clone(state.lastPersistence), lastCoreValidation: clone(state.lastCoreValidation),
      lastIntegrationValidation: clone(state.lastIntegrationValidation), lastError: clone(state.lastError), updatedAt: state.updatedAt
    };
  }

  function persistAutoRefactoringState() {
    try {
      if (!global.localStorage) {
        state.lastPersistence = { persisted: false, reason: "localStorage unavailable", storageKey: STORAGE_KEY };
        return clone(state.lastPersistence);
      }
      const previousPayload = readStoredPayload();
      const serialized = serializeState();
      const artifacts = persistArtifactRecords(serialized, previousPayload);
      if (!artifacts.persisted) throw new Error("IDE-150 artifact persistence failed.");
      const payload = JSON.stringify(serialized);
      global.localStorage.setItem(STORAGE_KEY, payload);
      state.lastPersistence = {
        persisted: true,
        compactLifecycle: true,
        separatedArtifacts: true,
        storageKey: STORAGE_KEY,
        schemaVersion: STORAGE_SCHEMA_VERSION,
        estimatedBytes: payload.length * 2,
        artifactEstimatedBytes: artifacts.estimatedBytes,
        artifactKeyCount: artifacts.artifactKeyCount,
        candidateArtifactCount: artifacts.candidateArtifactCount,
        transactionArtifactCount: artifacts.transactionArtifactCount,
        dependencyArtifactCount: artifacts.dependencyArtifactCount,
        patchArtifactCount: artifacts.patchArtifactCount,
        policyArtifactCount: artifacts.policyArtifactCount,
        persistedAt: nowIso()
      };
      return clone(state.lastPersistence);
    } catch (error) {
      state.lastError = { operation: "Persist", message: error && error.message ? error.message : String(error), at: nowIso() };
      state.lastPersistence = { persisted: false, storageKey: STORAGE_KEY, error: state.lastError.message };
      return clone(state.lastPersistence);
    }
  }

  function restoreMap(map, records) {
    map.clear();
    asArray(records).forEach(function add(item) { if (item && item.id) map.set(String(item.id), item); });
  }

  function loadAutoRefactoringState() {
    try {
      if (!global.localStorage) {
        state.loaded = true;
        return { loaded: true, restored: false, reason: "localStorage unavailable" };
      }
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.loaded = true;
        return { loaded: true, restored: false, storageKey: STORAGE_KEY };
      }
      const payload = JSON.parse(raw);
      restoreMap(state.requests, payload.requests);
      restoreMap(state.plans, payload.plans);
      restoreMap(state.candidates, payload.candidates);
      restoreMap(state.validations, payload.validations);
      restoreMap(state.approvals, payload.approvals);
      restoreMap(state.transactions, payload.transactions);
      restoreMap(state.rollbacks, payload.rollbacks);
      restoreMap(state.reports, payload.reports);
      restoreMap(state.packages, payload.packages);
      restoreMap(state.dependencyAnalyses, payload.dependencyAnalyses);
      restoreMap(state.patches, payload.patches);
      restoreMap(state.policyDecisions, payload.policyDecisions);
      state.history = asArray(payload.history).slice(-MAX_HISTORY);
      state.lastCoreValidation = clone(payload.lastCoreValidation || null);
      state.lastIntegrationValidation = clone(payload.lastIntegrationValidation || null);
      state.sequence = Math.max(0, finite(payload.sequence, state.sequence));
      state.updatedAt = text(payload.updatedAt, nowIso());
      state.loaded = true;
      return { loaded: true, restored: true, storageKey: STORAGE_KEY, schemaVersion: payload.schemaVersion || 0 };
    } catch (error) {
      state.loaded = true;
      state.lastError = { operation: "Load", message: error && error.message ? error.message : String(error), at: nowIso() };
      return { loaded: false, restored: false, storageKey: STORAGE_KEY, error: state.lastError.message };
    }
  }

  function clearAutoRefactoringStorage() {
    if (global.localStorage) {
      const previous = readStoredPayload();
      asArray(previous && previous.artifactIndex).forEach(function remove(key) { try { global.localStorage.removeItem(key); } catch (_) {} });
      global.localStorage.removeItem(STORAGE_KEY);
    }
    [state.requests, state.plans, state.candidates, state.validations, state.approvals, state.transactions, state.rollbacks, state.reports, state.packages, state.dependencyAnalyses, state.patches, state.policyDecisions].forEach(function clear(map) { map.clear(); });
    state.history = [];
    state.sequence = 0;
    state.lastCoreValidation = null;
    state.lastIntegrationValidation = null;
    state.lastError = null;
    touch();
    return { cleared: true, storageKey: STORAGE_KEY };
  }

  function findFunctionBlockFallback(sourceText, functionName) {
    const source = String(sourceText || "");
    const name = String(functionName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp("\\b(?:async\\s+)?function\\s+" + name + "\\s*\\("),
      new RegExp("\\b(?:const|let|var)\\s+" + name + "\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|[A-Za-z0-9_$]+)\\s*=>\\s*\\{"),
      new RegExp("\\b(?:const|let|var)\\s+" + name + "\\s*=\\s*(?:async\\s+)?function\\s*\\("),
      new RegExp("\\bwindow\\." + name + "\\s*=\\s*(?:async\\s+)?function\\s*\\(")
    ];
    let start = -1;
    for (const pattern of patterns) {
      const match = pattern.exec(source);
      if (match && (start < 0 || match.index < start)) start = match.index;
    }
    if (start < 0) return null;
    const braceStart = source.indexOf("{", start);
    if (braceStart < 0) return null;
    let depth = 0;
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (let index = braceStart; index < source.length; index += 1) {
      const char = source[index];
      const next = source[index + 1];
      if (lineComment) { if (char === "\n") lineComment = false; continue; }
      if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
      if (quote) {
        if (escaped) { escaped = false; continue; }
        if (char === "\\") { escaped = true; continue; }
        if (char === quote) quote = "";
        continue;
      }
      if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
      if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
      if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          let end = index + 1;
          if (source[end] === ";") end += 1;
          return { start: start, end: end, block: source.slice(start, end) };
        }
      }
    }
    return null;
  }

  function findFunctionBlock(source, functionName) {
    if (typeof global.findFunctionBlockInText === "function") {
      return global.findFunctionBlockInText(String(source || ""), String(functionName || ""));
    }
    return findFunctionBlockFallback(source, functionName);
  }

  function countFunctionDefinitions(sourceText, functionName) {
    const source = String(sourceText || "");
    const name = String(functionName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp("\\b(?:async\\s+)?function\\s+" + name + "\\s*\\(", "g"),
      new RegExp("\\b(?:const|let|var)\\s+" + name + "\\s*=\\s*(?:async\\s*)?(?:function\\s*\\(|\\([^)]*\\)\\s*=>|[A-Za-z0-9_$]+\\s*=>)", "g"),
      new RegExp("\\bwindow\\." + name + "\\s*=\\s*(?:async\\s+)?function\\s*\\(", "g")
    ];
    return patterns.reduce(function total(sum, pattern) { return sum + (source.match(pattern) || []).length; }, 0);
  }

  function normalizeFunctionSource(source, functionName) {
    const block = findFunctionBlock(String(source || ""), functionName);
    if (!block) return null;
    const prefix = String(source || "").slice(0, block.start).trim();
    const suffix = String(source || "").slice(block.end).trim().replace(/^;\s*/, "");
    if (prefix || suffix) return null;
    return block.block.trim();
  }

  function buildCompactLineDiff(beforeSource, afterSource, budget) {
    const before = String(beforeSource || "").replace(/\r\n/g, "\n").split("\n");
    const after = String(afterSource || "").replace(/\r\n/g, "\n").split("\n");
    let prefix = 0;
    while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
    let suffix = 0;
    while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
    const removed = before.slice(prefix, before.length - suffix);
    const added = after.slice(prefix, after.length - suffix);
    const changedLines = removed.length + added.length;
    const body = [];
    removed.forEach(function line(value) { body.push("-" + value); });
    added.forEach(function line(value) { body.push("+" + value); });
    let diffText = [
      "@@ function lines " + (prefix + 1) + " @@",
      ...body
    ].join("\n");
    const limit = Math.max(1000, finite(budget && budget.diffOutputCharLimit, DEFAULT_BUDGET.diffOutputCharLimit));
    const truncated = diffText.length > limit;
    if (truncated) diffText = diffText.slice(0, limit) + "\n... DIFF TRUNCATED ...";
    return {
      format: "Compact Unified Diff",
      prefixLineCount: prefix,
      suffixLineCount: suffix,
      removedLineCount: removed.length,
      addedLineCount: added.length,
      changedLines: changedLines,
      beforeLineCount: before.length,
      afterLineCount: after.length,
      truncated: truncated,
      text: diffText
    };
  }

  function getCompactAnalyticsPhase2BState() {
    try {
      if (typeof global.getDevelopmentAnalyticsPhase2BState === "function") {
        const payload = global.getDevelopmentAnalyticsPhase2BState();
        if (payload && payload.compact === true && Array.isArray(payload.handoffs)) {
          return { available: true, source: "Runtime Compact State API", payload: payload };
        }
      }
      if (global.localStorage) {
        const raw = global.localStorage.getItem(IDE140_PHASE2B_STORAGE_KEY);
        if (raw) {
          const payload = JSON.parse(raw);
          if (payload && payload.compact === true && Array.isArray(payload.handoffs)) {
            return { available: true, source: "Compact Persistence", payload: payload };
          }
        }
      }
      return { available: false, reason: "IDE-140 Compact Phase 2B state is unavailable.", payload: null };
    } catch (error) {
      return {
        available: false,
        reason: error && error.message ? error.message : String(error),
        payload: null
      };
    }
  }

  function getCompactPublicationPackage(publicationPackageId, compactStateResult) {
    const source = compactStateResult && compactStateResult.payload
      ? compactStateResult
      : getCompactAnalyticsPhase2BState();
    if (!source.available || !source.payload) return null;
    const target = String(publicationPackageId || "");
    return asArray(source.payload.packages).find(function find(item) {
      return item && String(item.id || "") === target;
    }) || null;
  }

  function validateHandoffContract(handoff, publicationPackage) {
    const checks = [];
    const check = function add(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); };
    const recommendationCount = handoff
      ? Math.max(asArray(handoff.recommendations).length, asArray(handoff.recommendationIds).length)
      : 0;
    check("Handoff object", Boolean(handoff && typeof handoff === "object"));
    check("Source component", handoff && handoff.sourceComponent === "IDE-140", handoff && handoff.sourceComponent);
    check("Target component", handoff && handoff.targetComponent === COMPONENT_ID, handoff && handoff.targetComponent);
    check("Eligible", handoff && handoff.eligible === true);
    check("Available status", handoff && handoff.status === "Available", handoff && handoff.status);
    check("Not consumed", handoff && handoff.consumed !== true);
    check("Publication package reference", Boolean(handoff && handoff.publicationPackageId));
    check("Snapshot traceability", Boolean(handoff && handoff.sourceSnapshotId && handoff.sourceHash));
    check("Recommendation exists", recommendationCount > 0, "count=" + recommendationCount);
    check("No auto apply contract", Boolean(handoff && asArray(handoff.prohibitedActions).some(function match(item) { return /auto[- ]?apply/i.test(String(item)); })));
    if (publicationPackage) {
      check("Published package", publicationPackage.publicationStatus === "Published", publicationPackage.publicationStatus);
      check("Official release", publicationPackage.releaseStatus === "Official", publicationPackage.releaseStatus);
      check("Approved package", publicationPackage.approvalStatus === "Approved", publicationPackage.approvalStatus);
      check("Handoff eligible package", publicationPackage.handoffEligible === true);
      check("Package ID match", publicationPackage.id === handoff.publicationPackageId);
      check("Source hash match", publicationPackage.sourceHash === handoff.sourceHash);
      check("Recommendation auto apply prohibited", publicationPackage.safety && publicationPackage.safety.recommendationAutoApply === false);
      check("Root Cause authority", publicationPackage.safety && publicationPackage.safety.rootCauseAuthority === "IDE-130");
      check("Source not mutated", publicationPackage.safety && publicationPackage.safety.sourceMutated === false);
    }
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return {
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks
    };
  }

  function summarizeCompactHandoff(item) {
    return {
      id: item.id,
      publicationPackageId: item.publicationPackageId,
      sourceSnapshotId: item.sourceSnapshotId,
      sourceHash: item.sourceHash,
      sourceComponent: item.sourceComponent,
      targetComponent: item.targetComponent,
      status: item.status,
      eligible: item.eligible === true,
      consumed: item.consumed === true,
      recommendationCount: Math.max(asArray(item.recommendations).length, asArray(item.recommendationIds).length),
      findingCount: Math.max(asArray(item.findings).length, asArray(item.findingIds).length),
      metricCount: Math.max(asArray(item.metricResults).length, asArray(item.metricIds).length),
      trendCount: Math.max(asArray(item.trendResults).length, asArray(item.trendIds).length),
      evidenceReferenceCount: Math.max(finite(item.evidenceReferenceCount, 0), asArray(item.evidenceReferences).length),
      createdAt: item.createdAt
    };
  }

  function getPublishedAnalyticsHandoffs(options) {
    const settings = options && typeof options === "object" ? options : {};
    const limit = Math.max(1, Math.min(20, finite(settings.limit, 10)));

    if (settings.hydrate === true || settings.details === true) {
      if (typeof global.getIDE150DevelopmentAnalyticsHandoffs !== "function") {
        return { available: false, reason: "IDE-140 Handoff API is unavailable.", count: 0, handoffs: [] };
      }
      const hydrated = global.getIDE150DevelopmentAnalyticsHandoffs({
        status: settings.includeConsumed ? undefined : "Available",
        consumed: settings.includeConsumed ? undefined : false,
        limit: limit
      });
      return {
        available: true,
        mode: "Hydrated Detail",
        hydration: true,
        count: asArray(hydrated).length,
        handoffs: clone(hydrated)
      };
    }

    const compactState = getCompactAnalyticsPhase2BState();
    if (!compactState.available || !compactState.payload) {
      return { available: false, reason: compactState.reason, count: 0, handoffs: [] };
    }
    const records = asArray(compactState.payload.handoffs).filter(function filter(item) {
      if (!item || item.targetComponent !== COMPONENT_ID || item.eligible !== true) return false;
      if (!settings.includeConsumed && (item.status !== "Available" || item.consumed === true)) return false;
      return true;
    }).sort(function newest(a, b) {
      return Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0);
    }).slice(0, limit);

    return {
      available: true,
      mode: "Compact Summary",
      hydration: false,
      source: compactState.source,
      count: records.length,
      handoffs: settings.compactDetails === true
        ? records.map(function compact(item) { return clone(item); })
        : records.map(summarizeCompactHandoff)
    };
  }

  function getPublishedAnalyticsHandoffDetail(handoffId, options) {
    const settings = options && typeof options === "object" ? options : {};
    const id = String(handoffId || "");
    if (!id) return null;

    const shouldHydrate = settings.compact !== true && settings.hydrate !== false;
    if (shouldHydrate) {
      if (typeof global.getIDE150DevelopmentAnalyticsHandoffs !== "function") return null;
      const records = global.getIDE150DevelopmentAnalyticsHandoffs({ limit: Math.max(1, Math.min(20, finite(settings.limit, 20))) });
      return clone(asArray(records).find(function find(item) { return item.id === id; }) || null);
    }

    const compactState = getCompactAnalyticsPhase2BState();
    if (!compactState.available || !compactState.payload) return null;
    return clone(asArray(compactState.payload.handoffs).find(function find(item) { return item && item.id === id; }) || null);
  }

  function verifyPublishedAnalyticsHandoff(handoffId, options) {
    const settings = options && typeof options === "object" ? options : {};
    const compactState = getCompactAnalyticsPhase2BState();
    const shouldHydrate = settings.compact !== true && settings.hydrate !== false;
    const handoff = getPublishedAnalyticsHandoffDetail(handoffId, { hydrate: shouldHydrate, limit: settings.limit });
    if (!handoff) return { valid: false, reason: "Published Analytics Handoff not found.", handoffId: String(handoffId || "") };
    let publicationPackage = getCompactPublicationPackage(handoff.publicationPackageId, compactState);
    if (settings.hydratePackage === true && typeof global.getDevelopmentAnalyticsPublicationPackage === "function") {
      publicationPackage = global.getDevelopmentAnalyticsPublicationPackage(handoff.publicationPackageId);
    }
    const validation = validateHandoffContract(handoff, publicationPackage);
    return {
      valid: validation.valid,
      mode: shouldHydrate ? "Hydrated Detail" : "Compact Contract",
      hydration: shouldHydrate,
      handoff: clone(handoff),
      publicationPackage: publicationPackage ? {
        id: publicationPackage.id,
        publicationStatus: publicationPackage.publicationStatus,
        releaseStatus: publicationPackage.releaseStatus,
        approvalStatus: publicationPackage.approvalStatus,
        sourceSnapshotId: publicationPackage.sourceSnapshotId,
        sourceHash: publicationPackage.sourceHash,
        handoffEligible: publicationPackage.handoffEligible === true,
        safety: clone(publicationPackage.safety || {})
      } : null,
      validation: validation
    };
  }

  function normalizeRiskLevel(value) {
    const risk = text(value, "Medium");
    return ["Low", "Medium", "High", "Critical"].includes(risk) ? risk : "Medium";
  }

  function createAutoRefactoringRequest(input) {
    const source = input && typeof input === "object" ? input : {};
    const evidenceReferences = unique(source.evidenceReferences || source.evidenceIds);
    const recommendationId = text(source.recommendationId, "");
    if (!recommendationId) return { created: false, reason: "recommendationId is required. Recommendation auto-selection is prohibited." };
    if (!evidenceReferences.length) return { created: false, reason: "At least one Evidence reference is required." };
    const request = {
      id: nextId("IDE-150-REQUEST"),
      componentId: COMPONENT_ID,
      version: VERSION,
      status: "Requested",
      sourceType: text(source.sourceType, "Manual"),
      sourceHandoffId: text(source.sourceHandoffId, ""),
      publicationPackageId: text(source.publicationPackageId, ""),
      sourceSnapshotId: text(source.sourceSnapshotId, ""),
      sourceHash: text(source.sourceHash, ""),
      recommendationId: recommendationId,
      recommendationSummary: text(source.recommendationSummary || source.summary, "Refactoring recommendation"),
      evidenceReferences: evidenceReferences,
      rootCauseReferences: unique(source.rootCauseReferences),
      impactReferences: unique(source.impactReferences),
      riskReferences: unique(source.riskReferences),
      confidence: Math.max(0, Math.min(1, finite(source.confidence, 0))),
      riskLevel: normalizeRiskLevel(source.riskLevel),
      scope: null,
      policy: {
        recommendationAutoApply: false,
        rootCauseAuthority: "IDE-130",
        directRepositoryModification: false,
        explicitApprovalRequired: true
      },
      requestedBy: text(source.requestedBy || source.actor, "Project Owner"),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.requests.set(request.id, request);
    trimMap(state.requests, MAX_RECORDS);
    recordEvent("Request Created", { requestId: request.id, recommendationId: request.recommendationId, sourceHandoffId: request.sourceHandoffId });
    const persistence = persistAutoRefactoringState();
    return { created: true, request: clone(request), persistence: persistence };
  }

  function createAutoRefactoringRequestFromHandoff(input) {
    const settings = input && typeof input === "object" ? input : {};
    const verified = verifyPublishedAnalyticsHandoff(settings.handoffId, { hydrate: true });
    if (!verified.valid) return { created: false, reason: "Published Analytics Handoff validation failed.", verification: verified };
    const recommendations = asArray(verified.handoff.recommendations);
    const recommendationId = text(settings.recommendationId, "");
    if (!recommendationId) return { created: false, reason: "recommendationId is required. Published recommendations are never selected automatically." };
    const recommendation = recommendations.find(function find(item) { return String(item.id || item.recommendationId || "") === recommendationId; });
    if (!recommendation) return { created: false, reason: "Recommendation was not found in the selected Handoff." };
    return createAutoRefactoringRequest({
      sourceType: "IDE-140 Published Analytics Handoff",
      sourceHandoffId: verified.handoff.id,
      publicationPackageId: verified.handoff.publicationPackageId,
      sourceSnapshotId: verified.handoff.sourceSnapshotId,
      sourceHash: verified.handoff.sourceHash,
      recommendationId: recommendationId,
      recommendationSummary: recommendation.summary || recommendation.title || recommendation.recommendation || "Published Analytics Recommendation",
      evidenceReferences: verified.handoff.evidenceReferences,
      rootCauseReferences: recommendation.rootCauseReferences || recommendation.rootCauseReference || [],
      impactReferences: recommendation.impactReferences || [],
      riskReferences: recommendation.riskReferences || [],
      confidence: recommendation.confidence,
      riskLevel: recommendation.riskLevel || recommendation.risk || "Medium",
      requestedBy: settings.actor || "Project Owner"
    });
  }

  function consumePublishedAnalyticsHandoffForRequest(requestId, actor) {
    const request = state.requests.get(String(requestId || ""));
    if (!request) return { consumed: false, reason: "Refactoring Request not found." };
    if (!request.sourceHandoffId) return { consumed: false, reason: "Request is not linked to a Published Analytics Handoff." };
    if (!state.lastPersistence || state.lastPersistence.persisted !== true) return { consumed: false, reason: "Request persistence is not verified." };
    if (typeof global.markIDE150DevelopmentAnalyticsHandoffConsumed !== "function") return { consumed: false, reason: "IDE-140 Handoff consume API is unavailable." };
    const result = global.markIDE150DevelopmentAnalyticsHandoffConsumed(request.sourceHandoffId, text(actor, COMPONENT_ID));
    if (!result || result.updated !== true) return { consumed: false, reason: result && result.reason ? result.reason : "Handoff consume failed." };
    request.handoffConsumed = true;
    request.handoffConsumedAt = nowIso();
    request.updatedAt = nowIso();
    state.requests.set(request.id, request);
    recordEvent("Handoff Consumed", { requestId: request.id, handoffId: request.sourceHandoffId, actor: text(actor, COMPONENT_ID) });
    persistAutoRefactoringState();
    return { consumed: true, request: compactRequest(request), handoff: { id: result.handoff.id, status: result.handoff.status, consumed: result.handoff.consumed === true, consumedBy: result.handoff.consumedBy, consumedAt: result.handoff.consumedAt } };
  }

  function defineAutoRefactoringScope(requestId, input) {
    const request = state.requests.get(String(requestId || ""));
    if (!request) return { scoped: false, reason: "Refactoring Request not found." };
    const source = input && typeof input === "object" ? input : {};
    const targetFile = text(source.targetFile || source.fileName, "");
    const targetFunction = text(source.targetFunction || source.functionName, "");
    if (!targetFile || !targetFunction) return { scoped: false, reason: "targetFile and targetFunction are required." };
    if (!/\.js(?:$|\?)/i.test(targetFile)) return { scoped: false, reason: "Core Phase 1 supports JavaScript function replacement only." };
    const scope = {
      mode: "Function Replacement",
      targetFile: targetFile.split("?")[0],
      targetFunction: targetFunction,
      fileCount: 1,
      functionCount: 1,
      excludedFiles: unique(source.excludedFiles),
      excludedFunctions: unique(source.excludedFunctions),
      repositoryVersion: text(source.repositoryVersion, "current-project"),
      immutableOutsideScope: true,
      definedBy: text(source.actor, "Project Owner"),
      definedAt: nowIso()
    };
    request.scope = scope;
    request.status = "Scoped";
    request.updatedAt = nowIso();
    state.requests.set(request.id, request);
    recordEvent("Scope Defined", { requestId: request.id, targetFile: scope.targetFile, targetFunction: scope.targetFunction });
    persistAutoRefactoringState();
    return { scoped: true, request: clone(request), scope: clone(scope) };
  }

  function createAutoRefactoringPlan(requestId, input) {
    const request = state.requests.get(String(requestId || ""));
    if (!request) return { created: false, reason: "Refactoring Request not found." };
    if (!request.scope) return { created: false, reason: "Scope must be defined before planning." };
    const source = input && typeof input === "object" ? input : {};
    const budget = normalizeBudget(source.budget);
    const dependencyReferences = unique(source.dependencyReferences).slice(0, budget.dependencyReferenceLimit);
    const plan = {
      id: nextId("IDE-150-PLAN"),
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: request.id,
      status: "Planned",
      operation: "Replace Existing Function",
      targetFile: request.scope.targetFile,
      targetFunction: request.scope.targetFunction,
      objective: text(source.objective, request.recommendationSummary),
      dependencyReferences: dependencyReferences,
      dependencyAnalysisMode: "Reference-only Core Adapter",
      requiredValidations: unique(source.requiredValidations || ["Scope", "Function Identity", "Concurrent Change", "JavaScript Syntax", "Repository Write Verification"]),
      budget: budget,
      policyMode: "Fail-Closed Core Policy Adapter",
      externalPolicyAdapter: text(source.externalPolicyAdapter, "Not Connected"),
      explicitApprovalRequired: true,
      rollbackRequired: true,
      autoApply: false,
      createdBy: text(source.actor, "Project Owner"),
      createdAt: nowIso()
    };
    state.plans.set(plan.id, plan);
    trimMap(state.plans, MAX_RECORDS);
    request.status = "Planned";
    request.planId = plan.id;
    request.updatedAt = nowIso();
    state.requests.set(request.id, request);
    recordEvent("Plan Created", { requestId: request.id, planId: plan.id });
    persistAutoRefactoringState();
    return { created: true, plan: clone(plan) };
  }

  function evaluateCandidatePolicy(plan, beforeFunction, afterFunction, diff, riskLevel, options) {
    const checks = [];
    const check = function add(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); };
    check("Single file scope", Boolean(plan && plan.budget.fileLimit === 1 && plan.targetFile));
    check("Single function scope", Boolean(plan && plan.budget.functionLimit === 1 && plan.targetFunction));
    check("JavaScript target", plan && /\.js$/i.test(plan.targetFile), plan && plan.targetFile);
    check("Function source size", beforeFunction.length <= plan.budget.functionSourceCharLimit && afterFunction.length <= plan.budget.functionSourceCharLimit, "before=" + beforeFunction.length + ", after=" + afterFunction.length);
    check("Changed line budget", diff.changedLines <= plan.budget.changedLineLimit, "changed=" + diff.changedLines + ", limit=" + plan.budget.changedLineLimit);
    check("Change exists", hashText(beforeFunction) !== hashText(afterFunction));
    check("Rollback required", plan.rollbackRequired === true);
    check("Explicit approval required", plan.explicitApprovalRequired === true);
    check("Recommendation auto apply prohibited", plan.autoApply === false);
    let external = null;
    if (options && typeof options.policyEvaluator === "function") {
      try {
        external = options.policyEvaluator({ plan: clone(plan), diff: clone(diff), riskLevel: riskLevel });
        check("External Policy Adapter", external === true || Boolean(external && external.allowed === true), external && external.reason);
      } catch (error) {
        check("External Policy Adapter", false, error && error.message ? error.message : String(error));
      }
    }
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return { allowed: passed === checks.length, mode: "Fail-Closed Core Policy Adapter", external: clone(external), passed: passed, failed: checks.length - passed, total: checks.length, checks: checks };
  }

  function createAutoRefactoringCandidate(planId, input, options) {
    const plan = state.plans.get(String(planId || ""));
    if (!plan) return { created: false, reason: "Refactoring Plan not found." };
    const request = state.requests.get(plan.requestId);
    if (!request) return { created: false, reason: "Refactoring Request not found." };
    const source = input && typeof input === "object" ? input : {};
    const beforeFunction = normalizeFunctionSource(source.beforeFunctionSource || source.beforeSource, plan.targetFunction);
    const afterFunction = normalizeFunctionSource(source.afterFunctionSource || source.afterSource, plan.targetFunction);
    if (!beforeFunction || !afterFunction) return { created: false, reason: "beforeFunctionSource and afterFunctionSource must contain only the scoped function." };
    if (countFunctionDefinitions(beforeFunction, plan.targetFunction) !== 1 || countFunctionDefinitions(afterFunction, plan.targetFunction) !== 1) {
      return { created: false, reason: "The scoped function must have exactly one definition in each candidate source." };
    }
    const diff = buildCompactLineDiff(beforeFunction, afterFunction, plan.budget);
    const riskLevel = normalizeRiskLevel(source.riskLevel || request.riskLevel);
    const policy = evaluateCandidatePolicy(plan, beforeFunction, afterFunction, diff, riskLevel, options || {});
    if (!policy.allowed) return { created: false, reason: "Candidate Policy evaluation failed.", policy: policy };
    const candidate = {
      id: nextId("IDE-150-CANDIDATE"),
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: request.id,
      planId: plan.id,
      status: "Preview Ready",
      operation: plan.operation,
      targetFile: plan.targetFile,
      targetFunction: plan.targetFunction,
      beforeFunctionSource: beforeFunction,
      afterFunctionSource: afterFunction,
      beforeHash: hashText(beforeFunction),
      afterHash: hashText(afterFunction),
      diff: diff,
      riskLevel: riskLevel,
      policy: policy,
      sandboxStatus: "Not Run",
      approvalStatus: "Not Requested",
      autoApply: false,
      traceability: {
        sourceHandoffId: request.sourceHandoffId,
        publicationPackageId: request.publicationPackageId,
        sourceSnapshotId: request.sourceSnapshotId,
        sourceHash: request.sourceHash,
        recommendationId: request.recommendationId,
        evidenceReferences: clone(request.evidenceReferences)
      },
      createdBy: text(source.actor, "Project Owner"),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.candidates.set(candidate.id, candidate);
    trimMap(state.candidates, MAX_RECORDS);
    request.status = "Candidate Ready";
    request.candidateId = candidate.id;
    request.updatedAt = nowIso();
    state.requests.set(request.id, request);
    recordEvent("Candidate Created", { requestId: request.id, planId: plan.id, candidateId: candidate.id, changedLines: diff.changedLines });
    persistAutoRefactoringState();
    return { created: true, candidate: clone(candidate), preview: { candidate: compactCandidate(candidate), diff: clone(diff), policy: clone(policy) } };
  }


  loadAutoRefactoringState();
  persistAutoRefactoringState();

  const coreApi = {
    getPublishedAnalyticsHandoffs: getPublishedAnalyticsHandoffs,
    getPublishedAnalyticsHandoffDetail: getPublishedAnalyticsHandoffDetail,
    verifyPublishedAnalyticsHandoff: verifyPublishedAnalyticsHandoff,
    createAutoRefactoringRequest: createAutoRefactoringRequest,
    createAutoRefactoringRequestFromHandoff: createAutoRefactoringRequestFromHandoff,
    consumePublishedAnalyticsHandoffForRequest: consumePublishedAnalyticsHandoffForRequest,
    defineAutoRefactoringScope: defineAutoRefactoringScope,
    createAutoRefactoringPlan: createAutoRefactoringPlan,
    createAutoRefactoringCandidate: createAutoRefactoringCandidate,
    persistAutoRefactoringState: persistAutoRefactoringState,
    loadAutoRefactoringState: loadAutoRefactoringState,
    clearAutoRefactoringStorage: clearAutoRefactoringStorage
  };

  Object.keys(coreApi).forEach(function expose(name) { global[name] = coreApi[name]; });

  global.__IDE150AutoRefactoringInternal = {
    COMPONENT_ID: COMPONENT_ID,
    VERSION: VERSION,
    STORAGE_KEY: STORAGE_KEY,
    MAX_RECORDS: MAX_RECORDS,
    MAX_HISTORY: MAX_HISTORY,
    MAX_ROLLBACK_SNAPSHOTS: MAX_ROLLBACK_SNAPSHOTS,
    PIPELINE_STAGES: PIPELINE_STAGES,
    CORE_PHASE_1_STAGES: CORE_PHASE_1_STAGES,
    CORE_PHASE_2_CAPABILITIES: CORE_PHASE_2_CAPABILITIES,
    REQUEST_STATES: REQUEST_STATES,
    DEFAULT_BUDGET: DEFAULT_BUDGET,
    state: state,
    nowIso: nowIso,
    asArray: asArray,
    clone: clone,
    text: text,
    finite: finite,
    unique: unique,
    nextId: nextId,
    trimMap: trimMap,
    hashText: hashText,
    recordEvent: recordEvent,
    compactRequest: compactRequest,
    compactPlan: compactPlan,
    compactCandidate: compactCandidate,
    compactTransaction: compactTransaction,
    compactDependencyAnalysis: compactDependencyAnalysis,
    compactPatch: compactPatch,
    compactPolicyDecision: compactPolicyDecision,
    getCandidateRecord: getCandidateRecord,
    getTransactionRecord: getTransactionRecord,
    getDependencyAnalysisRecord: getDependencyAnalysisRecord,
    getPatchRecord: getPatchRecord,
    getPolicyDecisionRecord: getPolicyDecisionRecord,
    captureRuntimeState: captureRuntimeState,
    persistAutoRefactoringState: persistAutoRefactoringState,
    restoreMap: restoreMap,
    findFunctionBlock: findFunctionBlock,
    countFunctionDefinitions: countFunctionDefinitions,
    normalizeFunctionSource: normalizeFunctionSource,
    buildCompactLineDiff: buildCompactLineDiff,
    normalizeRiskLevel: normalizeRiskLevel,
    validateHandoffContract: validateHandoffContract,
    getCompactAnalyticsPhase2BState: getCompactAnalyticsPhase2BState,
    getCompactPublicationPackage: getCompactPublicationPackage
  };

  global.IDE150AutoRefactoring = Object.assign({
    id: COMPONENT_ID,
    version: VERSION,
    storageKey: STORAGE_KEY,
    pipelineStages: PIPELINE_STAGES,
    corePhase1Stages: CORE_PHASE_1_STAGES,
    corePhase2Capabilities: CORE_PHASE_2_CAPABILITIES
  }, coreApi);
})(typeof window !== "undefined" ? window : globalThis);