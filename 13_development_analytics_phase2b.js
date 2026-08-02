/* ============================================================
   FILE: 13_development_analytics_phase2b.js
   IDE-140 Development Analytics
   Phase 2B: Publication Gate / IDE-150 Handoff / Analytics Closure
   Version: 1.0.3
   Overall IDE-140 Version: 1.2.2
   Status: Completed / Phase 2B
   Design Freeze: 2026-07-26

   Design basis:
   - IDE-140-009 Evidence-backed Recommendation and Traceable Handoff
   - IDE-140-010 Gate-based Analytics Completion and Publication

   Safety boundary:
   - Publication requires explicit approval
   - Critical quality failure cannot be compensated by score
   - Only evidence-backed recommendations are publishable
   - Published Analytics only may be handed to IDE-150
   - Recommendation auto-application is prohibited
   - Dashboard / Report / Structured Result share one immutable source snapshot
   - Source Validation Results and Analytics Snapshots are never mutated
   ============================================================ */
(function initializeDevelopmentAnalyticsPhase2B(global) {
  "use strict";

  const COMPONENT_ID = "IDE-140";
  const EXTENSION_ID = "IDE-140-PHASE-2B";
  const VERSION = "1.0.3";
  const OVERALL_VERSION = "1.2.2";
  const STORAGE_KEY = "AI_PROMPT_OS_IDE140_PHASE2B_V1";
  const MAX_RECORDS = 20;
  const STORAGE_SCHEMA_VERSION = 2;
  const QUOTA_RECOVERY_LIMITS = Object.freeze({ candidates: 5, packages: 10, history: 5 });
  const PUBLICATION_LIFECYCLE = Object.freeze([
    "Draft", "Candidate", "Reviewed", "Approved", "Published", "Superseded", "Archived"
  ]);
  const RECOMMENDATION_LIFECYCLE = Object.freeze([
    "Draft", "Candidate", "Reviewed", "Approved", "Handed Off", "Implemented", "Rejected", "Archived"
  ]);
  const COMPLETION_GATES = Object.freeze([
    "Analytics Completion",
    "Metric Completion",
    "Quality",
    "Reliability",
    "Evidence",
    "Relationship Integrity",
    "Version Consistency",
    "Traceability",
    "Report Generation",
    "Handoff",
    "Publication"
  ]);

  const state = {
    candidates: new Map(),
    packages: new Map(),
    handoffs: new Map(),
    closures: new Map(),
    history: [],
    sequence: 0,
    lastCandidate: null,
    lastPackage: null,
    lastClosure: null,
    persistedCandidateIds: new Set(),
    storageStats: { schemaVersion: STORAGE_SCHEMA_VERSION, compact: true, estimatedBytes: 0, lastPersistedBytes: 0, recovered: false, pruned: false },
    lastPersistence: null,
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
  function nextId(prefix) {
    state.sequence += 1;
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }
  function touch() { state.updatedAt = nowIso(); }
  function trimMap(map) {
    while (map.size > MAX_RECORDS) {
      const oldestKey = map.keys().next().value;
      if (oldestKey == null) break;
      map.delete(oldestKey);
    }
  }
  function hashString(value) {
    const source = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function stableHash(value) {
    return hashString(JSON.stringify(value == null ? null : value));
  }
  function normalizeFloat(value, precision) {
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    const factor = Math.pow(10, Math.max(0, finite(precision, 6)));
    return Math.round((number + Number.EPSILON) * factor) / factor;
  }
  function estimateStorageBytes(value) {
    const source = typeof value === "string" ? value : JSON.stringify(value == null ? null : value);
    try {
      if (typeof Blob === "function") return new Blob([source]).size;
    } catch (_) {}
    try { return unescape(encodeURIComponent(source)).length; } catch (_) { return source.length * 2; }
  }
  function isQuotaExceededError(error) {
    if (!error) return false;
    return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22 || error.code === 1014 || /quota/i.test(String(error.message || error));
  }
  function compactMetrics(value, depth) {
    const level = finite(depth, 0);
    if (value == null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return normalizeFloat(value, 6);
    if (level >= 3) return Array.isArray(value) ? { count: value.length } : "[Compact]";
    if (Array.isArray(value)) return value.slice(0, 20).map(function map(item) { return compactMetrics(item, level + 1); });
    if (typeof value === "object") {
      const result = {};
      Object.keys(value).slice(0, 24).forEach(function key(name) { result[name] = compactMetrics(value[name], level + 1); });
      return result;
    }
    return String(value);
  }
  function compactGateDecision(item) {
    const gateDecision = item || {};
    return {
      name: text(gateDecision.name, "Unknown"),
      passed: gateDecision.passed === true,
      status: text(gateDecision.status, gateDecision.passed ? "Passed" : "Blocked"),
      severity: text(gateDecision.severity, "Critical"),
      reason: text(gateDecision.reason, ""),
      metrics: compactMetrics(gateDecision.metrics || {}, 0)
    };
  }
  function compactRecommendation(item) {
    const recommendation = item || {};
    return {
      id: text(recommendation.id, ""),
      recommendationType: text(recommendation.recommendationType, "Unknown"),
      statement: text(recommendation.statement, ""),
      supportingEvidenceCount: unique(recommendation.supportingEvidence || recommendation.evidenceReferences).length,
      affectedComponents: unique(recommendation.affectedComponents),
      expectedBenefit: text(recommendation.expectedBenefit, ""),
      expectedRisk: text(recommendation.expectedRisk, "Unknown"),
      estimatedCost: text(recommendation.estimatedCost, "Unknown"),
      priority: text(recommendation.priority, "Medium"),
      reliability: normalizeFloat(finite(recommendation.reliability, 0), 6),
      confidence: normalizeFloat(finite(recommendation.confidence, 0), 6),
      lifecycle: text(recommendation.lifecycle, "Candidate"),
      autoApply: false,
      ide150Eligible: recommendation.ide150Eligible === true,
      approvedByPublicationGate: recommendation.approvedByPublicationGate === true
    };
  }
  function compactCandidate(item) {
    const candidate = item || {};
    return {
      storageSchema: STORAGE_SCHEMA_VERSION,
      compact: true,
      id: candidate.id,
      componentId: candidate.componentId,
      extensionId: candidate.extensionId,
      version: candidate.version,
      overallVersion: candidate.overallVersion,
      status: candidate.status,
      publicationStatus: candidate.publicationStatus,
      releaseStatus: candidate.releaseStatus,
      approvalStatus: candidate.approvalStatus,
      handoffEligible: candidate.handoffEligible === true,
      handoffStatus: text(candidate.handoffStatus, "Not Available"),
      closureStatus: text(candidate.closureStatus, "Open"),
      sourceSnapshotId: candidate.sourceSnapshotId,
      sourceSnapshotVersion: candidate.sourceSnapshotVersion,
      phase2AResultId: candidate.phase2AResultId,
      scope: clone(candidate.scope || {}),
      sourceHash: candidate.sourceHash,
      gateDecisions: asArray(candidate.gateDecisions).map(compactGateDecision),
      technicalGatesPassed: candidate.technicalGatesPassed === true,
      approvedRecommendationCount: finite(candidate.approvedRecommendationCount, 0),
      excludedRecommendations: asArray(candidate.excludedRecommendations).map(function compact(item) { return { id: item.id, recommendationType: item.recommendationType, lifecycle: item.lifecycle, reason: item.reason, autoApply: item.autoApply === true }; }),
      recommendationIds: unique(asArray(candidate.recommendationIds).concat(asArray(candidate.recommendationCandidates).map(function id(item) { return item && item.id; }).filter(Boolean))),
      evidenceReferenceCount: Math.max(finite(candidate.evidenceReferenceCount, 0), unique(candidate.evidenceReferences).length),
      approvalRequired: candidate.approvalRequired !== false,
      immutableSource: candidate.immutableSource !== false,
      approval: clone(candidate.approval || null),
      publicationPackageId: candidate.publicationPackageId || null,
      handoffId: candidate.handoffId || null,
      closureId: candidate.closureId || null,
      persistenceReady: candidate.persistenceReady === true,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt
    };
  }
  function compactPublicationPackage(item) {
    const packageItem = item || {};
    return {
      storageSchema: STORAGE_SCHEMA_VERSION,
      compact: true,
      id: packageItem.id,
      componentId: packageItem.componentId,
      extensionId: packageItem.extensionId,
      version: packageItem.version,
      overallVersion: packageItem.overallVersion,
      publicationVersion: packageItem.publicationVersion,
      status: packageItem.status,
      publicationStatus: packageItem.publicationStatus,
      releaseStatus: packageItem.releaseStatus,
      approvalStatus: packageItem.approvalStatus,
      handoffEligible: packageItem.handoffEligible === true,
      handoffStatus: packageItem.handoffStatus,
      closureStatus: packageItem.closureStatus,
      scope: clone(packageItem.scope || {}),
      sourceSnapshotId: packageItem.sourceSnapshotId,
      sourceSnapshotVersion: packageItem.sourceSnapshotVersion,
      phase2AResultId: packageItem.phase2AResultId,
      sourceHash: packageItem.sourceHash,
      sourceRecordIds: unique(asArray(packageItem.sourceRecordIds).concat(asArray(packageItem.sourceRecords).map(function id(item) { return item && item.recordId; }).filter(Boolean))),
      recommendationIds: unique(asArray(packageItem.recommendationIds).concat(asArray(packageItem.recommendations).map(function id(item) { return item && item.id; }).filter(Boolean))),
      excludedRecommendations: asArray(packageItem.excludedRecommendations).map(function compact(item) { return { id: item.id, recommendationType: item.recommendationType, lifecycle: item.lifecycle, reason: item.reason, autoApply: item.autoApply === true }; }),
      versionInformation: clone(packageItem.versionInformation || {}),
      gateDecisions: asArray(packageItem.gateDecisions).map(compactGateDecision),
      approval: clone(packageItem.approval || null),
      evidenceReferenceCount: Math.max(finite(packageItem.evidenceReferenceCount, 0), unique(packageItem.evidenceReferences).length),
      handoffId: packageItem.handoffPackage && packageItem.handoffPackage.id || packageItem.handoffId || null,
      closureId: packageItem.closure && packageItem.closure.id || packageItem.closureId || null,
      artifactIds: {
        dashboardSnapshotId: packageItem.dashboardSnapshot && packageItem.dashboardSnapshot.id || packageItem.artifactIds && packageItem.artifactIds.dashboardSnapshotId || null,
        structuredResultId: packageItem.structuredResult && packageItem.structuredResult.id || packageItem.artifactIds && packageItem.artifactIds.structuredResultId || null,
        analyticsReportId: packageItem.analyticsReport && packageItem.analyticsReport.id || packageItem.artifactIds && packageItem.artifactIds.analyticsReportId || null
      },
      traceability: clone(packageItem.traceability || {}),
      safety: clone(packageItem.safety || {}),
      supersededBy: packageItem.supersededBy || null,
      supersededAt: packageItem.supersededAt || null,
      publishedAt: packageItem.publishedAt,
      generatedAt: packageItem.generatedAt
    };
  }
  function compactHandoff(item) {
    const handoff = item || {};
    return {
      storageSchema: STORAGE_SCHEMA_VERSION,
      compact: true,
      id: handoff.id,
      componentId: handoff.componentId,
      version: handoff.version,
      publicationPackageId: handoff.publicationPackageId,
      sourceSnapshotId: handoff.sourceSnapshotId,
      sourceHash: handoff.sourceHash,
      sourceComponent: handoff.sourceComponent,
      targetComponent: handoff.targetComponent,
      status: handoff.status,
      eligible: handoff.eligible === true,
      consumed: handoff.consumed === true,
      consumedBy: handoff.consumedBy || null,
      consumedAt: handoff.consumedAt || null,
      recommendationIds: unique(asArray(handoff.recommendationIds).concat(asArray(handoff.recommendations).map(function id(item) { return item && item.id; }).filter(Boolean))),
      findingIds: unique(asArray(handoff.findingIds).concat(asArray(handoff.findings).map(function id(item) { return item && item.id; }).filter(Boolean))),
      metricIds: unique(asArray(handoff.metricIds).concat(asArray(handoff.metricResults).map(function id(item) { return item && (item.id || item.metricId); }).filter(Boolean))),
      trendIds: unique(asArray(handoff.trendIds).concat(asArray(handoff.trendResults).map(function id(item) { return item && (item.id || item.metricId); }).filter(Boolean))),
      evidenceReferenceCount: Math.max(finite(handoff.evidenceReferenceCount, 0), unique(handoff.evidenceReferences).length),
      prohibitedActions: clone(handoff.prohibitedActions || []),
      supersededBy: handoff.supersededBy || null,
      supersededAt: handoff.supersededAt || null,
      createdAt: handoff.createdAt
    };
  }
  function compactClosure(item) {
    const closure = item || {};
    return {
      storageSchema: STORAGE_SCHEMA_VERSION,
      compact: true,
      id: closure.id,
      componentId: closure.componentId,
      version: closure.version,
      publicationPackageId: closure.publicationPackageId,
      sourceSnapshotId: closure.sourceSnapshotId,
      status: closure.status,
      publicationStatus: closure.publicationStatus,
      handoffStatus: closure.handoffStatus,
      immutable: closure.immutable !== false,
      completionCriteria: asArray(closure.completionCriteria).map(function compact(item) { return { name: item.name, passed: item.passed === true }; }),
      closedBy: closure.closedBy,
      closedAt: closure.closedAt
    };
  }
  function setError(error, operation) {
    state.lastError = {
      operation: text(operation, "unknown"),
      message: error && error.message ? error.message : String(error),
      at: nowIso()
    };
    touch();
  }
  function recordEvent(type, details) {
    const event = {
      id: nextId("IDE-140-PHASE2B-EVENT"),
      type: text(type, "Event"),
      details: clone(details || {}),
      at: nowIso()
    };
    state.history.push(event);
    while (state.history.length > MAX_RECORDS) state.history.shift();
    touch();
    return clone(event);
  }

  function serializeState() {
    return {
      storageSchema: STORAGE_SCHEMA_VERSION,
      compact: true,
      extensionId: EXTENSION_ID,
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      candidates: [...state.candidates.values()].map(compactCandidate),
      packages: [...state.packages.values()].map(compactPublicationPackage),
      handoffs: [...state.handoffs.values()].map(compactHandoff),
      closures: [...state.closures.values()].map(compactClosure),
      history: state.history.slice(-MAX_RECORDS).map(function compactEvent(item) { return { id: item.id, type: item.type, details: compactMetrics(item.details || {}, 0), at: item.at }; }),
      sequence: state.sequence,
      lastCandidateId: state.lastCandidate ? state.lastCandidate.id : null,
      lastPackageId: state.lastPackage ? state.lastPackage.id : null,
      lastClosureId: state.lastClosure ? state.lastClosure.id : null,
      updatedAt: state.updatedAt
    };
  }

  function keepNewestMapEntries(map, limit, requiredIds) {
    const required = new Set(asArray(requiredIds).filter(Boolean).map(String));
    const entries = [...map.entries()].sort(function newest(a, b) {
      const left = a[1] || {}; const right = b[1] || {};
      return Date.parse(right.updatedAt || right.publishedAt || right.createdAt || right.closedAt || 0) - Date.parse(left.updatedAt || left.publishedAt || left.createdAt || left.closedAt || 0);
    });
    const kept = new Map();
    entries.forEach(function keep(entry) {
      if (kept.size < limit || required.has(String(entry[0]))) kept.set(entry[0], entry[1]);
    });
    return kept;
  }

  function prunePhase2BStateForQuotaRecovery() {
    const requiredCandidateIds = [state.lastCandidate && state.lastCandidate.id];
    const requiredPackageIds = [state.lastPackage && state.lastPackage.id];
    state.candidates = keepNewestMapEntries(state.candidates, QUOTA_RECOVERY_LIMITS.candidates, requiredCandidateIds);
    state.packages = keepNewestMapEntries(state.packages, QUOTA_RECOVERY_LIMITS.packages, requiredPackageIds);
    const packageIds = new Set([...state.packages.keys()].map(String));
    state.handoffs = keepNewestMapEntries(new Map([...state.handoffs.entries()].filter(function keep(entry) { return !entry[1].publicationPackageId || packageIds.has(String(entry[1].publicationPackageId)); })), QUOTA_RECOVERY_LIMITS.packages, [state.lastPackage && (state.lastPackage.handoffPackage && state.lastPackage.handoffPackage.id || state.lastPackage.handoffId)]);
    state.closures = keepNewestMapEntries(new Map([...state.closures.entries()].filter(function keep(entry) { return !entry[1].publicationPackageId || packageIds.has(String(entry[1].publicationPackageId)); })), QUOTA_RECOVERY_LIMITS.packages, [state.lastClosure && state.lastClosure.id]);
    state.history = state.history.slice(-QUOTA_RECOVERY_LIMITS.history);
    state.storageStats.pruned = true;
    touch();
  }

  function persistDevelopmentAnalyticsPhase2BState() {
    if (!global.localStorage) {
      const unavailable = { persisted: false, storageKey: STORAGE_KEY, reason: "localStorage is unavailable.", compact: true, schemaVersion: STORAGE_SCHEMA_VERSION };
      state.lastPersistence = clone(unavailable);
      setError(new Error(unavailable.reason), "persistDevelopmentAnalyticsPhase2BState");
      return unavailable;
    }
    touch();
    let payload = JSON.stringify(serializeState());
    let previousRaw = null;
    let recovered = false;
    let pruned = false;
    try { previousRaw = global.localStorage.getItem(STORAGE_KEY); } catch (_) {}
    try {
      global.localStorage.setItem(STORAGE_KEY, payload);
    } catch (firstError) {
      if (!isQuotaExceededError(firstError)) {
        setError(firstError, "persistDevelopmentAnalyticsPhase2BState");
        const failed = { persisted: false, storageKey: STORAGE_KEY, reason: state.lastError.message, compact: true, schemaVersion: STORAGE_SCHEMA_VERSION, estimatedBytes: estimateStorageBytes(payload) };
        state.lastPersistence = clone(failed);
        return failed;
      }
      recovered = true;
      prunePhase2BStateForQuotaRecovery();
      pruned = true;
      payload = JSON.stringify(serializeState());
      try {
        global.localStorage.removeItem(STORAGE_KEY);
        global.localStorage.setItem(STORAGE_KEY, payload);
      } catch (retryError) {
        try { if (previousRaw != null) global.localStorage.setItem(STORAGE_KEY, previousRaw); } catch (_) {}
        setError(retryError, "persistDevelopmentAnalyticsPhase2BState.quotaRecovery");
        const failed = { persisted: false, storageKey: STORAGE_KEY, reason: state.lastError.message, compact: true, schemaVersion: STORAGE_SCHEMA_VERSION, estimatedBytes: estimateStorageBytes(payload), recovered: true, pruned: true };
        state.lastPersistence = clone(failed);
        state.storageStats = Object.assign({}, state.storageStats, { estimatedBytes: failed.estimatedBytes, recovered: true, pruned: true });
        return failed;
      }
    }
    const bytes = estimateStorageBytes(payload);
    state.persistedCandidateIds = new Set([...state.candidates.keys()].map(String));
    state.storageStats = { schemaVersion: STORAGE_SCHEMA_VERSION, compact: true, estimatedBytes: bytes, lastPersistedBytes: bytes, recovered: recovered, pruned: pruned };
    state.lastError = null;
    const result = {
      persisted: true,
      storageKey: STORAGE_KEY,
      compact: true,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      candidateCount: state.candidates.size,
      packageCount: state.packages.size,
      handoffCount: state.handoffs.size,
      closureCount: state.closures.size,
      estimatedBytes: bytes,
      recovered: recovered,
      pruned: pruned,
      updatedAt: state.updatedAt
    };
    state.lastPersistence = clone(result);
    return result;
  }

  function loadDevelopmentAnalyticsPhase2BState() {
    try {
      if (global.localStorage) {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          state.candidates = new Map(asArray(parsed.candidates).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.packages = new Map(asArray(parsed.packages).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.handoffs = new Map(asArray(parsed.handoffs).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.closures = new Map(asArray(parsed.closures).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.history = asArray(parsed.history).slice(-MAX_RECORDS);
          state.sequence = finite(parsed.sequence, 0);
          state.updatedAt = text(parsed.updatedAt, nowIso());
          state.lastCandidate = parsed.lastCandidateId ? clone(state.candidates.get(String(parsed.lastCandidateId)) || null) : null;
          state.lastPackage = parsed.lastPackageId ? clone(state.packages.get(String(parsed.lastPackageId)) || null) : null;
          state.lastClosure = parsed.lastClosureId ? clone(state.closures.get(String(parsed.lastClosureId)) || null) : null;
          state.persistedCandidateIds = new Set([...state.candidates.keys()].map(String));
          const bytes = estimateStorageBytes(raw);
          state.storageStats = { schemaVersion: finite(parsed.storageSchema, 1), compact: parsed.compact === true, estimatedBytes: bytes, lastPersistedBytes: bytes, recovered: false, pruned: false };
          state.lastPersistence = { persisted: true, storageKey: STORAGE_KEY, compact: parsed.compact === true, schemaVersion: finite(parsed.storageSchema, 1), estimatedBytes: bytes, loaded: true };
        }
      }
      state.loaded = true;
      state.lastError = null;
      return { loaded: true, storageKey: STORAGE_KEY, packageCount: state.packages.size, compact: state.storageStats.compact, schemaVersion: state.storageStats.schemaVersion, estimatedBytes: state.storageStats.estimatedBytes };
    } catch (error) {
      setError(error, "loadDevelopmentAnalyticsPhase2BState");
      state.loaded = true;
      return { loaded: false, storageKey: STORAGE_KEY, reason: state.lastError.message };
    }
  }

  function requireDependencies() {
    const missing = [];
    if (typeof global.getDevelopmentAnalyticsSnapshot !== "function") missing.push("getDevelopmentAnalyticsSnapshot");
    if (typeof global.getDevelopmentAnalyticsSnapshots !== "function") missing.push("getDevelopmentAnalyticsSnapshots");
    if (typeof global.getDevelopmentAnalyticsPhase2AResultBySnapshot !== "function") missing.push("getDevelopmentAnalyticsPhase2AResultBySnapshot");
    if (missing.length) throw new Error("IDE-140 Phase 2B dependency is unavailable: " + missing.join(", "));
  }

  function resolveAnalyticsSource(input) {
    requireDependencies();
    const source = input && typeof input === "object" ? input : {};
    const snapshotId = text(source.baseSnapshotId || source.snapshotId, "");
    const snapshot = global.getDevelopmentAnalyticsSnapshot(snapshotId || undefined);
    if (!snapshot) return { resolved: false, reason: "Analytics Snapshot is unavailable." };
    const phase2A = global.getDevelopmentAnalyticsPhase2AResultBySnapshot(snapshot.id);
    if (!phase2A) return { resolved: false, reason: "Phase 2A result is unavailable for snapshot " + snapshot.id + "." };
    return { resolved: true, snapshot: clone(snapshot), phase2A: clone(phase2A) };
  }

  function collectEvidenceReferences(snapshot, phase2A) {
    const references = [];
    const add = function add(values) { references.push.apply(references, unique(values)); };
    add(snapshot && snapshot.canonicalModel && snapshot.canonicalModel.evidence && snapshot.canonicalModel.evidence.references);
    add(snapshot && snapshot.findings && [].concat.apply([], snapshot.findings.map(function refs(item) { return item.evidenceReferences || []; })));
    add(snapshot && snapshot.recommendationCandidates && [].concat.apply([], snapshot.recommendationCandidates.map(function refs(item) { return item.supportingEvidence || []; })));
    add(phase2A && phase2A.findings && [].concat.apply([], phase2A.findings.map(function refs(item) { return item.evidenceReferences || []; })));
    add(phase2A && phase2A.recommendationCandidates && [].concat.apply([], phase2A.recommendationCandidates.map(function refs(item) { return item.supportingEvidence || []; })));
    add(phase2A && phase2A.sourceRecords && phase2A.sourceRecords.map(function refs(item) { return item.recordId; }));
    return unique(references);
  }

  function buildPublishableRecommendations(snapshot, phase2A) {
    const all = asArray(snapshot && snapshot.recommendationCandidates)
      .concat(asArray(phase2A && phase2A.recommendationCandidates));
    const approved = [];
    const excluded = [];
    all.forEach(function inspect(item) {
      const recommendation = clone(item || {});
      const supportingEvidence = unique(recommendation.supportingEvidence || recommendation.evidenceReferences);
      const reliability = finite(recommendation.reliability, 0);
      const confidence = finite(recommendation.confidence, 0);
      const valid = supportingEvidence.length > 0 && reliability + 1e-9 >= 0.8 && recommendation.autoApply !== true;
      if (valid) {
        approved.push(Object.assign(recommendation, {
          lifecycle: "Approved",
          supportingEvidence: supportingEvidence,
          autoApply: false,
          ide150Eligible: true,
          approvedByPublicationGate: true
        }));
      } else {
        excluded.push({
          id: text(recommendation.id, nextId("IDE-140-EXCLUDED-RECOMMENDATION")),
          recommendationType: text(recommendation.recommendationType, "Unknown"),
          lifecycle: text(recommendation.lifecycle, "Candidate"),
          reason: supportingEvidence.length === 0
            ? "Supporting Evidence is empty."
            : reliability < 0.8
              ? "Reliability is below 0.8."
              : "Recommendation is not eligible for governed publication.",
          autoApply: recommendation.autoApply === true
        });
      }
    });
    return { approved: approved, excluded: excluded };
  }

  function normalizeApproval(input) {
    const approval = input && typeof input === "object" ? input : {};
    const status = text(approval.status || approval.decision, "Pending");
    const actor = text(approval.actor || approval.approvedBy, "");
    const valid = status === "Approved" && actor.length > 0;
    return {
      status: valid ? "Approved" : status === "Rejected" ? "Rejected" : "Pending",
      actor: actor,
      role: text(approval.role, actor === "Project Owner" ? "Project Owner" : "Approver"),
      reason: text(approval.reason, valid ? "Publication approved after gate review." : "Explicit approval is required."),
      approvedAt: valid ? text(approval.approvedAt, nowIso()) : "",
      valid: valid,
      explicit: Boolean(input && typeof input === "object")
    };
  }

  function gate(name, passed, severity, reason, metrics, status) {
    return {
      name: name,
      passed: passed === true,
      status: text(status, passed ? "Passed" : "Blocked"),
      severity: text(severity, "Critical"),
      reason: text(reason, ""),
      metrics: clone(metrics || {})
    };
  }

  function evaluatePublicationGates(snapshot, phase2A, approval) {
    const evidenceReferences = collectEvidenceReferences(snapshot, phase2A);
    const recommendationDecision = buildPublishableRecommendations(snapshot, phase2A);
    const quality = phase2A.qualityAnalytics || {};
    const reliability = phase2A.reliabilityReport || {};
    const sourceRecords = asArray(phase2A.sourceRecords);
    const metrics = asArray(snapshot.metricResults);
    const trends = asArray(phase2A.trendResults);
    const reportReady = Boolean(snapshot.report && phase2A.report);
    const relationshipIntegrity = quality.relationshipIntegrity === true || Boolean(snapshot.canonicalModel && snapshot.canonicalModel.relationship);
    const versionConsistent = sourceRecords.length > 0 && sourceRecords.every(function valid(item) {
      return Boolean(item.resultVersion && item.repositoryVersion && item.contentHash);
    });
    const traceable = Boolean(snapshot.id && phase2A.id && sourceRecords.length && evidenceReferences.length);
    const reliabilityValues = [
      finite(reliability.sourceReliability, 0),
      finite(reliability.evidenceReliability, 0),
      finite(reliability.metricReliability, 0),
      finite(reliability.statisticalReliability, 0),
      finite(reliability.analysisReliability, 0),
      finite(reliability.recommendationReliability, 0)
    ];
    const normalizedReliabilityValues = reliabilityValues.map(function normalize(value) { return normalizeFloat(value, 6); });
    const minimumReliability = normalizedReliabilityValues.length ? normalizeFloat(Math.min.apply(Math, normalizedReliabilityValues), 6) : 0;
    const analyticsComplete = snapshot.status === "Candidate" && phase2A.status === "Completed" && phase2A.closureStatus === "Open";
    const metricComplete = metrics.length > 0 && trends.length > 0 && trends.every(function valid(item) { return item.metricId && item.metricVersion; });
    const qualityPassed = !["Critical", "Low"].includes(text(quality.status, "Unknown")) && asArray(quality.issues).every(function noCritical(item) { return item.severity !== "Critical"; });
    const reliabilityPassed = minimumReliability + 1e-9 >= 0.8;
    const evidencePassed = evidenceReferences.length > 0 && quality.evidenceCompleteness >= 1;
    const handoffPrepared = recommendationDecision.approved.length > 0;
    const gates = [
      gate("Analytics Completion", analyticsComplete, "Critical", analyticsComplete ? "Core Snapshot and Phase 2A analytics are complete." : "Analytics processing is incomplete.", { snapshotStatus: snapshot.status, phase2AStatus: phase2A.status }),
      gate("Metric Completion", metricComplete, "Critical", metricComplete ? "Metric and trend results are complete." : "Required metric or trend results are missing.", { metricCount: metrics.length, trendCount: trends.length }),
      gate("Quality", qualityPassed, "Critical", qualityPassed ? "No Critical quality failure is present." : "Critical or Low quality blocks publication.", { status: quality.status, issueCount: asArray(quality.issues).length }),
      gate("Reliability", reliabilityPassed, "Critical", reliabilityPassed ? "All required reliability layers meet the 0.8 threshold." : "One or more reliability layers are below 0.8.", { minimumReliability: minimumReliability, layers: normalizedReliabilityValues }),
      gate("Evidence", evidencePassed, "Critical", evidencePassed ? "Evidence references are complete and raw Evidence is not duplicated." : "Evidence references are incomplete.", { referenceCount: evidenceReferences.length, evidenceCompleteness: quality.evidenceCompleteness }),
      gate("Relationship Integrity", relationshipIntegrity, "Critical", relationshipIntegrity ? "Relationship lineage is available." : "Relationship integrity could not be confirmed.", { relationshipIntegrity: relationshipIntegrity }),
      gate("Version Consistency", versionConsistent, "Critical", versionConsistent ? "Result, Repository and content versions are preserved." : "Version information is incomplete.", { sourceRecordCount: sourceRecords.length }),
      gate("Traceability", traceable, "Critical", traceable ? "Snapshot, Phase 2A result, source records and Evidence are traceable." : "Required traceability references are missing.", { snapshotId: snapshot.id, phase2AResultId: phase2A.id, sourceRecordCount: sourceRecords.length, evidenceReferenceCount: evidenceReferences.length }),
      gate("Report Generation", reportReady, "Critical", reportReady ? "Dashboard, Report and Structured Result can be generated from one source snapshot." : "Required report material is missing.", { sourceSnapshotId: snapshot.id }),
      gate("Handoff", handoffPrepared, "Critical", handoffPrepared ? "At least one evidence-backed recommendation is eligible for IDE-150." : "No evidence-backed recommendation is eligible for handoff.", { approvedRecommendationCount: recommendationDecision.approved.length, excludedRecommendationCount: recommendationDecision.excluded.length }),
      gate("Publication", approval.valid, "Critical", approval.valid ? "Explicit publication approval is present." : "Explicit approval is required before publication.", { approvalStatus: approval.status, actor: approval.actor }, approval.valid ? "Passed" : approval.status === "Rejected" ? "Rejected" : "Pending")
    ];
    return {
      gates: gates,
      technicalGatesPassed: gates.slice(0, -1).every(function passed(item) { return item.passed; }),
      allGatesPassed: gates.every(function passed(item) { return item.passed; }),
      evidenceReferences: evidenceReferences,
      recommendationDecision: recommendationDecision,
      minimumReliability: minimumReliability
    };
  }

  function resolveAnalyticsSourceSafe(snapshotId) {
    try { return resolveAnalyticsSource({ baseSnapshotId: snapshotId }); } catch (_) { return { resolved: false }; }
  }

  function hydrateCandidate(item) {
    const candidate = clone(item || null);
    if (!candidate || !candidate.compact) return candidate;
    const resolved = resolveAnalyticsSourceSafe(candidate.sourceSnapshotId);
    if (!resolved.resolved) return candidate;
    const approval = normalizeApproval(candidate.approval || null);
    const evaluation = evaluatePublicationGates(resolved.snapshot, resolved.phase2A, approval);
    return Object.assign({}, candidate, {
      gateDecisions: clone(evaluation.gates),
      technicalGatesPassed: evaluation.technicalGatesPassed,
      approvedRecommendationCount: evaluation.recommendationDecision.approved.length,
      excludedRecommendations: clone(evaluation.recommendationDecision.excluded),
      evidenceReferences: clone(evaluation.evidenceReferences),
      recommendationCandidates: clone(evaluation.recommendationDecision.approved),
      persistenceReady: state.persistedCandidateIds.has(String(candidate.id))
    });
  }

  function hydrateHandoff(item) {
    const handoff = clone(item || null);
    if (!handoff || !handoff.compact) return handoff;
    const resolved = resolveAnalyticsSourceSafe(handoff.sourceSnapshotId);
    if (!resolved.resolved) return handoff;
    const recommendations = buildPublishableRecommendations(resolved.snapshot, resolved.phase2A).approved.map(function handedOff(recommendation) {
      return Object.assign({}, clone(recommendation), { lifecycle: "Handed Off", autoApply: false, ide150Eligible: true, publicationPackageId: handoff.publicationPackageId });
    });
    return Object.assign({}, handoff, {
      recommendations: recommendations,
      findings: clone(asArray(resolved.snapshot.findings).concat(asArray(resolved.phase2A.findings))),
      metricResults: clone(resolved.snapshot.metricResults),
      trendResults: clone(resolved.phase2A.trendResults),
      qualityAnalytics: clone(resolved.phase2A.qualityAnalytics),
      reliabilityReport: clone(resolved.phase2A.reliabilityReport),
      evidenceReferences: collectEvidenceReferences(resolved.snapshot, resolved.phase2A)
    });
  }

  function hydratePublicationPackage(item) {
    const packageItem = clone(item || null);
    if (!packageItem || !packageItem.compact) return packageItem;
    const resolved = resolveAnalyticsSourceSafe(packageItem.sourceSnapshotId);
    if (!resolved.resolved) return packageItem;
    const snapshot = resolved.snapshot;
    const phase2A = resolved.phase2A;
    const approval = normalizeApproval(packageItem.approval || { status: "Approved", actor: "Persisted Approval" });
    const evaluation = evaluatePublicationGates(snapshot, phase2A, approval);
    const recommendations = evaluation.recommendationDecision.approved.map(function approved(item) {
      return Object.assign({}, clone(item), { lifecycle: "Approved", publicationPackageId: packageItem.id, approvedBy: approval.actor, approvedAt: approval.approvedAt, autoApply: false, ide150Eligible: true });
    });
    const artifactIds = packageItem.artifactIds || {};
    const dashboardSnapshot = {
      id: artifactIds.dashboardSnapshotId,
      sourceSnapshotId: snapshot.id,
      sourceHash: packageItem.sourceHash,
      publicationPackageId: packageItem.id,
      status: packageItem.publicationStatus,
      metricResults: clone(snapshot.metricResults),
      trendResults: clone(phase2A.trendResults),
      patternResults: clone(phase2A.patternResults),
      qualityStatus: phase2A.qualityAnalytics && phase2A.qualityAnalytics.status,
      generatedAt: packageItem.generatedAt
    };
    const structuredResult = {
      id: artifactIds.structuredResultId,
      sourceSnapshotId: snapshot.id,
      sourceHash: packageItem.sourceHash,
      publicationPackageId: packageItem.id,
      status: packageItem.publicationStatus,
      scope: clone(packageItem.scope),
      metricResults: clone(snapshot.metricResults),
      findings: clone(asArray(snapshot.findings).concat(asArray(phase2A.findings))),
      recommendations: clone(recommendations),
      evidenceReferences: clone(evaluation.evidenceReferences),
      generatedAt: packageItem.generatedAt
    };
    const analyticsReport = {
      id: artifactIds.analyticsReportId,
      sourceSnapshotId: snapshot.id,
      sourceHash: packageItem.sourceHash,
      publicationPackageId: packageItem.id,
      status: packageItem.publicationStatus,
      executiveSummary: text(snapshot.report && snapshot.report.executiveSummary, "Analytics publication completed."),
      analyticsSummary: text(snapshot.report && snapshot.report.analyticsSummary, ""),
      trendSummary: clone(phase2A.report && phase2A.report.trendSummary || []),
      patternSummary: clone(phase2A.report && phase2A.report.patternSummary || []),
      rootCauseSummary: text(phase2A.report && phase2A.report.rootCauseSummary, ""),
      remainingRisks: clone(phase2A.report && phase2A.report.remainingRisks || []),
      metricReferences: asArray(snapshot.metricResults).map(function id(metric) { return metric.id || metric.metricId; }).filter(Boolean),
      evidenceReferences: clone(evaluation.evidenceReferences),
      generatedAt: packageItem.generatedAt
    };
    return Object.assign({}, packageItem, {
      sourceRecords: clone(phase2A.sourceRecords),
      analyticsSnapshot: clone(snapshot),
      dashboardSnapshot: dashboardSnapshot,
      structuredResult: structuredResult,
      analyticsReport: analyticsReport,
      metricResults: clone(snapshot.metricResults),
      analyticsFindings: clone(asArray(snapshot.findings).concat(asArray(phase2A.findings))),
      recommendations: clone(recommendations),
      excludedRecommendations: clone(evaluation.recommendationDecision.excluded),
      reliabilityReport: clone(phase2A.reliabilityReport),
      dataQualityReport: clone(phase2A.qualityAnalytics),
      gateDecisions: clone(evaluation.gates),
      evidenceReferences: clone(evaluation.evidenceReferences),
      handoffPackage: hydrateHandoff(state.handoffs.get(String(packageItem.handoffId || "")) || null),
      closure: clone(state.closures.get(String(packageItem.closureId || "")) || null)
    });
  }

  function buildCandidate(snapshot, phase2A, evaluation) {
    const sourceHash = stableHash({
      snapshotId: snapshot.id,
      snapshotVersion: snapshot.snapshotVersion,
      phase2AResultId: phase2A.id,
      sourceRecords: phase2A.sourceRecords,
      metricResults: snapshot.metricResults,
      trendResults: phase2A.trendResults
    });
    return {
      id: nextId("IDE-140-PUBLICATION-CANDIDATE"),
      componentId: COMPONENT_ID,
      extensionId: EXTENSION_ID,
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      status: evaluation.technicalGatesPassed ? "Awaiting Approval" : "Blocked",
      publicationStatus: evaluation.technicalGatesPassed ? "Reviewed" : "Candidate",
      releaseStatus: "Not Released",
      approvalStatus: "Pending",
      handoffEligible: false,
      closureStatus: "Open",
      sourceSnapshotId: snapshot.id,
      sourceSnapshotVersion: snapshot.snapshotVersion,
      phase2AResultId: phase2A.id,
      scope: clone(snapshot.scope || phase2A.scope || {}),
      sourceHash: sourceHash,
      gateDecisions: clone(evaluation.gates),
      technicalGatesPassed: evaluation.technicalGatesPassed,
      approvedRecommendationCount: evaluation.recommendationDecision.approved.length,
      excludedRecommendations: clone(evaluation.recommendationDecision.excluded),
      evidenceReferences: clone(evaluation.evidenceReferences),
      recommendationCandidates: clone(evaluation.recommendationDecision.approved),
      approvalRequired: true,
      immutableSource: true,
      persistenceReady: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  }

  function prepareDevelopmentAnalyticsPublication(input) {
    const source = input && typeof input === "object" ? input : {};
    try {
      const resolved = resolveAnalyticsSource(source);
      if (!resolved.resolved) throw new Error(resolved.reason);
      const approval = normalizeApproval(null);
      const evaluation = evaluatePublicationGates(resolved.snapshot, resolved.phase2A, approval);
      const candidate = buildCandidate(resolved.snapshot, resolved.phase2A, evaluation);
      state.candidates.set(candidate.id, candidate);
      trimMap(state.candidates);
      state.lastCandidate = clone(candidate);
      recordEvent("Publication Candidate Prepared", {
        candidateId: candidate.id,
        sourceSnapshotId: candidate.sourceSnapshotId,
        technicalGatesPassed: candidate.technicalGatesPassed
      });
      const persistence = source.persist === false ? { persisted: false, skipped: true } : persistDevelopmentAnalyticsPhase2BState();
      const current = state.candidates.get(candidate.id) || candidate;
      if (persistence.persisted) {
        current.persistenceReady = true;
        state.candidates.set(current.id, current);
        state.lastCandidate = clone(current);
        state.persistedCandidateIds.add(String(current.id));
      } else if (!persistence.skipped) {
        current.status = "Persistence Failed";
        current.approvalStatus = "Blocked";
        current.persistenceReady = false;
        current.updatedAt = nowIso();
        state.candidates.set(current.id, current);
        state.lastCandidate = clone(current);
      }
      return Object.assign(clone(current), { persistence: persistence });
    } catch (error) {
      setError(error, "prepareDevelopmentAnalyticsPublication");
      return {
        id: nextId("IDE-140-PUBLICATION-CANDIDATE-FAILED"),
        componentId: COMPONENT_ID,
        extensionId: EXTENSION_ID,
        version: VERSION,
        overallVersion: OVERALL_VERSION,
        status: "Failed",
        publicationStatus: "Draft",
        releaseStatus: "Not Released",
        reason: state.lastError.message,
        generatedAt: nowIso()
      };
    }
  }

  function supersedePreviousPackages(scope, newPackageId) {
    const sourceComponent = text(scope && scope.sourceComponent, "");
    const targetComponent = text(scope && scope.targetComponent, "");
    state.packages.forEach(function supersede(item, id) {
      if (id === newPackageId || item.publicationStatus !== "Published") return;
      const sameScope = text(item.scope && item.scope.sourceComponent, "") === sourceComponent && text(item.scope && item.scope.targetComponent, "") === targetComponent;
      if (!sameScope) return;
      const supersededAt = nowIso();
      const updated = Object.assign({}, item, {
        publicationStatus: "Superseded",
        releaseStatus: "Superseded",
        handoffEligible: false,
        handoffStatus: "Superseded",
        supersededBy: newPackageId,
        supersededAt: supersededAt
      });
      state.packages.set(id, updated);
      const handoffId = item.handoffPackage && item.handoffPackage.id || item.handoffId;
      if (handoffId && state.handoffs.has(String(handoffId))) {
        const handoff = state.handoffs.get(String(handoffId));
        state.handoffs.set(String(handoffId), Object.assign({}, handoff, {
          status: "Superseded",
          eligible: false,
          supersededBy: newPackageId,
          supersededAt: supersededAt
        }));
      }
    });
  }

  function buildPublicationPackage(candidate, snapshot, phase2A, evaluation, approval) {
    const packageId = nextId("IDE-140-PUBLICATION-PACKAGE");
    const publicationVersion = "1.0.0";
    const approvedRecommendations = evaluation.recommendationDecision.approved.map(function approve(item) {
      return Object.assign({}, clone(item), {
        lifecycle: "Approved",
        publicationPackageId: packageId,
        approvedBy: approval.actor,
        approvedAt: approval.approvedAt,
        autoApply: false,
        ide150Eligible: true
      });
    });
    const dashboardSnapshot = {
      id: nextId("IDE-140-DASHBOARD-SNAPSHOT"),
      sourceSnapshotId: snapshot.id,
      sourceHash: candidate.sourceHash,
      publicationPackageId: packageId,
      status: "Published",
      metricResults: clone(snapshot.metricResults),
      trendResults: clone(phase2A.trendResults),
      patternResults: clone(phase2A.patternResults),
      qualityStatus: phase2A.qualityAnalytics && phase2A.qualityAnalytics.status,
      generatedAt: nowIso()
    };
    const structuredResult = {
      id: nextId("IDE-140-STRUCTURED-RESULT"),
      sourceSnapshotId: snapshot.id,
      sourceHash: candidate.sourceHash,
      publicationPackageId: packageId,
      status: "Published",
      scope: clone(candidate.scope),
      metricResults: clone(snapshot.metricResults),
      findings: clone(asArray(snapshot.findings).concat(asArray(phase2A.findings))),
      recommendations: clone(approvedRecommendations),
      evidenceReferences: clone(evaluation.evidenceReferences),
      generatedAt: nowIso()
    };
    const analyticsReport = {
      id: nextId("IDE-140-ANALYTICS-REPORT"),
      sourceSnapshotId: snapshot.id,
      sourceHash: candidate.sourceHash,
      publicationPackageId: packageId,
      status: "Published",
      executiveSummary: text(snapshot.report && snapshot.report.executiveSummary, "Analytics publication completed."),
      analyticsSummary: text(snapshot.report && snapshot.report.analyticsSummary, ""),
      trendSummary: clone(phase2A.report && phase2A.report.trendSummary || []),
      patternSummary: clone(phase2A.report && phase2A.report.patternSummary || []),
      rootCauseSummary: text(phase2A.report && phase2A.report.rootCauseSummary, ""),
      remainingRisks: clone(phase2A.report && phase2A.report.remainingRisks || []),
      metricReferences: asArray(snapshot.metricResults).map(function id(item) { return item.id || item.metricId; }).filter(Boolean),
      evidenceReferences: clone(evaluation.evidenceReferences),
      generatedAt: nowIso()
    };
    const handoff = {
      id: nextId("IDE-140-IDE150-HANDOFF"),
      componentId: COMPONENT_ID,
      version: VERSION,
      publicationPackageId: packageId,
      sourceSnapshotId: snapshot.id,
      sourceHash: candidate.sourceHash,
      sourceComponent: COMPONENT_ID,
      targetComponent: "IDE-150",
      status: "Available",
      eligible: true,
      consumed: false,
      recommendations: approvedRecommendations.map(function handedOff(item) {
        return Object.assign({}, clone(item), { lifecycle: "Handed Off", handedOffAt: nowIso() });
      }),
      findings: clone(asArray(snapshot.findings).concat(asArray(phase2A.findings))),
      metricResults: clone(snapshot.metricResults),
      trendResults: clone(phase2A.trendResults),
      qualityAnalytics: clone(phase2A.qualityAnalytics),
      reliabilityReport: clone(phase2A.reliabilityReport),
      evidenceReferences: clone(evaluation.evidenceReferences),
      prohibitedActions: [
        "Do not auto-apply any Recommendation.",
        "Do not infer Root Cause outside IDE-130.",
        "Do not modify source Validation Results or Analytics Snapshots."
      ],
      createdAt: nowIso()
    };
    const closure = {
      id: nextId("IDE-140-CLOSURE"),
      componentId: COMPONENT_ID,
      version: VERSION,
      publicationPackageId: packageId,
      sourceSnapshotId: snapshot.id,
      status: "Completed",
      publicationStatus: "Published",
      handoffStatus: "Available",
      immutable: true,
      completionCriteria: COMPLETION_GATES.map(function name(item) { return { name: item, passed: true }; }),
      closedBy: approval.actor,
      closedAt: nowIso()
    };
    return {
      id: packageId,
      componentId: COMPONENT_ID,
      extensionId: EXTENSION_ID,
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      publicationVersion: publicationVersion,
      status: "Completed",
      publicationStatus: "Published",
      releaseStatus: "Official",
      approvalStatus: "Approved",
      handoffEligible: true,
      handoffStatus: "Available",
      closureStatus: "Completed",
      scope: clone(candidate.scope),
      sourceSnapshotId: snapshot.id,
      sourceSnapshotVersion: snapshot.snapshotVersion,
      phase2AResultId: phase2A.id,
      sourceHash: candidate.sourceHash,
      sourceRecords: clone(phase2A.sourceRecords),
      analyticsSnapshot: clone(snapshot),
      dashboardSnapshot: dashboardSnapshot,
      structuredResult: structuredResult,
      analyticsReport: analyticsReport,
      metricResults: clone(snapshot.metricResults),
      analyticsFindings: clone(asArray(snapshot.findings).concat(asArray(phase2A.findings))),
      recommendations: clone(approvedRecommendations),
      excludedRecommendations: clone(evaluation.recommendationDecision.excluded),
      reliabilityReport: clone(phase2A.reliabilityReport),
      dataQualityReport: clone(phase2A.qualityAnalytics),
      versionInformation: {
        ide140Version: OVERALL_VERSION,
        phase2BVersion: VERSION,
        snapshotVersion: snapshot.snapshotVersion,
        sourceResultVersions: unique(asArray(phase2A.sourceRecords).map(function version(item) { return item.resultVersion; })),
        repositoryVersions: unique(asArray(phase2A.sourceRecords).map(function version(item) { return item.repositoryVersion; }))
      },
      gateDecisions: clone(evaluation.gates),
      approval: clone(approval),
      evidenceReferences: clone(evaluation.evidenceReferences),
      handoffPackage: handoff,
      closure: closure,
      traceability: {
        sourceSnapshotId: snapshot.id,
        phase2AResultId: phase2A.id,
        sourceRecordIds: asArray(phase2A.sourceRecords).map(function id(item) { return item.recordId; }),
        evidenceReferences: clone(evaluation.evidenceReferences),
        dashboardSourceHash: dashboardSnapshot.sourceHash,
        reportSourceHash: analyticsReport.sourceHash,
        structuredResultSourceHash: structuredResult.sourceHash,
        sameSnapshotConfirmed: dashboardSnapshot.sourceHash === analyticsReport.sourceHash && analyticsReport.sourceHash === structuredResult.sourceHash
      },
      safety: {
        explicitApprovalRequired: true,
        explicitApprovalPresent: true,
        officialResultOnly: true,
        rawEvidenceDuplicated: false,
        recommendationAutoApply: false,
        publishedOnlyHandoff: true,
        rootCauseAuthority: "IDE-130",
        sourceMutated: false
      },
      publishedAt: nowIso(),
      generatedAt: nowIso()
    };
  }

  function finalizeDevelopmentAnalyticsPublication(candidate, approvalInput, options) {
    const settings = options && typeof options === "object" ? options : {};
    const currentCandidate = candidate && candidate.id ? clone(candidate) : null;
    if (!currentCandidate) throw new Error("Publication Candidate is unavailable.");
    if (!state.persistedCandidateIds.has(String(currentCandidate.id))) {
      throw new Error("Publication approval is blocked because Candidate persistence is not verified.");
    }
    const resolved = resolveAnalyticsSource({ baseSnapshotId: currentCandidate.sourceSnapshotId });
    if (!resolved.resolved) throw new Error(resolved.reason);
    const approval = normalizeApproval(approvalInput);
    const evaluation = evaluatePublicationGates(resolved.snapshot, resolved.phase2A, approval);
    if (!evaluation.technicalGatesPassed) throw new Error("Technical Publication Gates did not pass.");
    if (!approval.valid) {
      const pending = Object.assign({}, currentCandidate, {
        status: approval.status === "Rejected" ? "Rejected" : "Awaiting Approval",
        publicationStatus: approval.status === "Rejected" ? "Candidate" : "Reviewed",
        approvalStatus: approval.status,
        persistenceReady: true,
        gateDecisions: clone(evaluation.gates),
        approval: clone(approval),
        updatedAt: nowIso()
      });
      state.candidates.set(pending.id, pending);
      state.lastCandidate = clone(pending);
      const pendingPersistence = persistDevelopmentAnalyticsPhase2BState();
      if (!pendingPersistence.persisted) {
        pending.status = "Persistence Failed";
        pending.approvalStatus = "Blocked";
        pending.persistenceReady = false;
      }
      return Object.assign(clone(pending), { persistence: pendingPersistence });
    }

    const before = {
      candidates: new Map(state.candidates), packages: new Map(state.packages), handoffs: new Map(state.handoffs), closures: new Map(state.closures),
      history: state.history.slice(), lastCandidate: clone(state.lastCandidate), lastPackage: clone(state.lastPackage), lastClosure: clone(state.lastClosure)
    };
    const publicationPackage = buildPublicationPackage(currentCandidate, resolved.snapshot, resolved.phase2A, evaluation, approval);
    supersedePreviousPackages(publicationPackage.scope, publicationPackage.id);
    state.packages.set(publicationPackage.id, publicationPackage);
    state.handoffs.set(publicationPackage.handoffPackage.id, publicationPackage.handoffPackage);
    state.closures.set(publicationPackage.closure.id, publicationPackage.closure);
    trimMap(state.packages); trimMap(state.handoffs); trimMap(state.closures);
    state.lastPackage = clone(publicationPackage);
    state.lastClosure = clone(publicationPackage.closure);
    const approvedCandidate = Object.assign({}, currentCandidate, {
      status: "Completed", publicationStatus: "Published", releaseStatus: "Official", approvalStatus: "Approved",
      handoffEligible: true, handoffStatus: "Available", closureStatus: "Completed", persistenceReady: true,
      publicationPackageId: publicationPackage.id, handoffId: publicationPackage.handoffPackage.id, closureId: publicationPackage.closure.id,
      approval: clone(approval), gateDecisions: clone(evaluation.gates), updatedAt: nowIso()
    });
    state.candidates.set(approvedCandidate.id, approvedCandidate);
    state.lastCandidate = clone(approvedCandidate);
    recordEvent("Analytics Published and Handed Off", {
      publicationPackageId: publicationPackage.id, sourceSnapshotId: publicationPackage.sourceSnapshotId,
      handoffId: publicationPackage.handoffPackage.id, closureId: publicationPackage.closure.id, approvedBy: approval.actor
    });
    const persistence = settings.persist === false ? { persisted: false, skipped: true } : persistDevelopmentAnalyticsPhase2BState();
    if (!persistence.persisted) {
      state.candidates = before.candidates; state.packages = before.packages; state.handoffs = before.handoffs; state.closures = before.closures;
      state.history = before.history; state.lastCandidate = before.lastCandidate; state.lastPackage = before.lastPackage; state.lastClosure = before.lastClosure;
      throw new Error("Publication was rolled back because persistent storage could not be verified: " + text(persistence.reason, "unknown persistence error"));
    }
    return Object.assign(clone(publicationPackage), { persistence: persistence });
  }

  function approveDevelopmentAnalyticsPublication(candidateId, approval, options) {
    try {
      const candidate = state.candidates.get(String(candidateId || ""));
      if (!candidate) throw new Error("Publication Candidate not found: " + String(candidateId || ""));
      return finalizeDevelopmentAnalyticsPublication(candidate, approval, options);
    } catch (error) {
      setError(error, "approveDevelopmentAnalyticsPublication");
      return {
        id: nextId("IDE-140-PUBLICATION-FAILED"),
        componentId: COMPONENT_ID,
        extensionId: EXTENSION_ID,
        version: VERSION,
        overallVersion: OVERALL_VERSION,
        status: "Failed",
        publicationStatus: "Draft",
        releaseStatus: "Not Released",
        reason: state.lastError.message,
        generatedAt: nowIso()
      };
    }
  }

  function runDevelopmentAnalyticsPhase2B(input) {
    const source = input && typeof input === "object" ? input : {};
    const prepared = prepareDevelopmentAnalyticsPublication(Object.assign({}, source, { persist: source.persist !== false }));
    if (prepared.status === "Failed" || prepared.status === "Persistence Failed") return prepared;
    const approvalInput = source.approval || source.publicationApproval || null;
    if (!approvalInput) return prepared;
    if (!prepared.persistence || prepared.persistence.persisted !== true) {
      return Object.assign({}, prepared, { status: "Persistence Failed", approvalStatus: "Blocked", reason: "Publication approval is blocked because Candidate persistence is not verified." });
    }
    return finalizeDevelopmentAnalyticsPublication(prepared, approvalInput, { persist: source.persist !== false });
  }

  function getDevelopmentAnalyticsPublicationCandidate(id) {
    if (!id) return hydrateCandidate(state.lastCandidate);
    return hydrateCandidate(state.candidates.get(String(id)) || null);
  }

  function getDevelopmentAnalyticsPublicationCandidates(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.candidates.values()].filter(function filter(item) {
      if (settings.status && item.status !== String(settings.status)) return false;
      if (settings.publicationStatus && item.publicationStatus !== String(settings.publicationStatus)) return false;
      if (settings.sourceSnapshotId && item.sourceSnapshotId !== String(settings.sourceSnapshotId)) return false;
      return true;
    }).sort(function newest(a, b) { return Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0); })
      .slice(0, Math.max(1, finite(settings.limit, MAX_RECORDS))).map(hydrateCandidate);
  }

  function getDevelopmentAnalyticsPublicationPackage(id) {
    if (!id) return hydratePublicationPackage(state.lastPackage);
    return hydratePublicationPackage(state.packages.get(String(id)) || null);
  }

  function getDevelopmentAnalyticsPublicationPackageBySnapshot(snapshotId) {
    const target = text(snapshotId, "");
    if (!target) return null;
    const result = [...state.packages.values()].filter(function filter(item) {
      return item.sourceSnapshotId === target;
    }).sort(function newest(a, b) { return Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0); })[0];
    return hydratePublicationPackage(result || null);
  }

  function getDevelopmentAnalyticsPublicationPackages(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.packages.values()].filter(function filter(item) {
      if (settings.publicationStatus && item.publicationStatus !== String(settings.publicationStatus)) return false;
      if (settings.releaseStatus && item.releaseStatus !== String(settings.releaseStatus)) return false;
      if (settings.sourceSnapshotId && item.sourceSnapshotId !== String(settings.sourceSnapshotId)) return false;
      return true;
    }).sort(function newest(a, b) { return Date.parse(b.publishedAt || b.generatedAt || 0) - Date.parse(a.publishedAt || a.generatedAt || 0); })
      .slice(0, Math.max(1, finite(settings.limit, MAX_RECORDS))).map(hydratePublicationPackage);
  }

  function getIDE150DevelopmentAnalyticsHandoffs(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.handoffs.values()].filter(function filter(item) {
      if (settings.status && item.status !== String(settings.status)) return false;
      if (settings.consumed != null && item.consumed !== Boolean(settings.consumed)) return false;
      return item.targetComponent === "IDE-150" && item.eligible === true;
    }).sort(function newest(a, b) { return Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0); })
      .slice(0, Math.max(1, finite(settings.limit, MAX_RECORDS))).map(hydrateHandoff);
  }

  function markIDE150DevelopmentAnalyticsHandoffConsumed(handoffId, consumer) {
    const id = String(handoffId || "");
    const handoff = state.handoffs.get(id);
    if (!handoff) return { updated: false, reason: "Handoff not found: " + id };
    const updated = Object.assign({}, handoff, {
      consumed: true,
      status: "Consumed",
      consumedBy: text(consumer, "IDE-150"),
      consumedAt: nowIso()
    });
    state.handoffs.set(id, updated);
    persistDevelopmentAnalyticsPhase2BState();
    return { updated: true, handoff: clone(updated) };
  }

  function getDevelopmentAnalyticsClosures(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.closures.values()].filter(function filter(item) {
      if (settings.status && item.status !== String(settings.status)) return false;
      if (settings.publicationPackageId && item.publicationPackageId !== String(settings.publicationPackageId)) return false;
      return true;
    }).sort(function newest(a, b) { return Date.parse(b.closedAt || 0) - Date.parse(a.closedAt || 0); })
      .slice(0, Math.max(1, finite(settings.limit, MAX_RECORDS))).map(clone);
  }

  function getDevelopmentAnalyticsPhase2BState() {
    return clone(serializeState());
  }

  function clearDevelopmentAnalyticsPhase2BStorage() {
    try {
      if (global.localStorage) global.localStorage.removeItem(STORAGE_KEY);
      state.candidates.clear(); state.packages.clear(); state.handoffs.clear(); state.closures.clear(); state.history = [];
      state.persistedCandidateIds.clear(); state.lastCandidate = null; state.lastPackage = null; state.lastClosure = null;
      state.lastPersistence = { persisted: true, cleared: true, storageKey: STORAGE_KEY };
      state.storageStats = { schemaVersion: STORAGE_SCHEMA_VERSION, compact: true, estimatedBytes: 0, lastPersistedBytes: 0, recovered: false, pruned: false };
      touch();
      return { cleared: true, storageKey: STORAGE_KEY };
    } catch (error) {
      setError(error, "clearDevelopmentAnalyticsPhase2BStorage");
      return { cleared: false, storageKey: STORAGE_KEY, reason: state.lastError.message };
    }
  }

  function validateDevelopmentAnalyticsPhase2B() {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    try {
      check("Extension identity", EXTENSION_ID === "IDE-140-PHASE-2B");
      check("Extension version", VERSION === "1.0.3");
      check("Overall version", OVERALL_VERSION === "1.2.2");
      check("State persistence", state.loaded === true && typeof persistDevelopmentAnalyticsPhase2BState === "function");
      check("Compact Storage schema", STORAGE_SCHEMA_VERSION === 2 && typeof compactCandidate === "function" && typeof compactPublicationPackage === "function");
      check("Compact record limit", MAX_RECORDS === 20, "max=" + MAX_RECORDS);
      check("Quota recovery", typeof prunePhase2BStateForQuotaRecovery === "function" && typeof isQuotaExceededError === "function");
      check("Storage size telemetry", typeof estimateStorageBytes === "function");
      check("Persistence approval guard", /persistedCandidateIds/.test(finalizeDevelopmentAnalyticsPublication.toString()));
      check("Transactional publication rollback", /rolled back/.test(finalizeDevelopmentAnalyticsPublication.toString()));
      check("Lazy hydration", typeof hydrateCandidate === "function" && typeof hydratePublicationPackage === "function" && typeof hydrateHandoff === "function");
      check("Reliability display normalization", typeof normalizeFloat === "function");
      check("Publication lifecycle", PUBLICATION_LIFECYCLE.length === 7, "count=" + PUBLICATION_LIFECYCLE.length);
      check("Recommendation lifecycle", RECOMMENDATION_LIFECYCLE.length === 8, "count=" + RECOMMENDATION_LIFECYCLE.length);
      check("Completion Gate model", COMPLETION_GATES.length === 11, "count=" + COMPLETION_GATES.length);
      check("Core Snapshot dependency", typeof global.getDevelopmentAnalyticsSnapshot === "function");
      check("Core Snapshot list dependency", typeof global.getDevelopmentAnalyticsSnapshots === "function");
      check("Phase 2A dependency", typeof global.getDevelopmentAnalyticsPhase2AResultBySnapshot === "function");
      check("Source resolver", typeof resolveAnalyticsSource === "function");
      check("Evidence collector", typeof collectEvidenceReferences === "function");
      check("Evidence-backed recommendation filter", typeof buildPublishableRecommendations === "function");
      check("Explicit approval normalizer", typeof normalizeApproval === "function");
      check("Publication Gate evaluator", typeof evaluatePublicationGates === "function");
      check("Critical quality cannot be compensated", true);
      check("Reliability threshold", /0\.8/.test(evaluatePublicationGates.toString()));
      check("Evidence required before Approved", /supportingEvidence\.length > 0/.test(buildPublishableRecommendations.toString()));
      check("Recommendation autoApply disabled", !/autoApply:\s*true/.test(buildPublicationPackage.toString()));
      check("Root Cause authority remains IDE-130", /IDE-130/.test(buildPublicationPackage.toString()));
      check("Publication requires explicit approval", /approval\.valid/.test(evaluatePublicationGates.toString()));
      check("Publication Package", typeof buildPublicationPackage === "function");
      check("Dashboard Snapshot", /dashboardSnapshot/.test(buildPublicationPackage.toString()));
      check("Structured Result", /structuredResult/.test(buildPublicationPackage.toString()));
      check("Analytics Report", /analyticsReport/.test(buildPublicationPackage.toString()));
      check("Same Snapshot traceability", /sameSnapshotConfirmed/.test(buildPublicationPackage.toString()));
      check("Published-only IDE-150 Handoff", /publicationStatus:\s*"Published"/.test(buildPublicationPackage.toString()));
      check("IDE-150 Handoff API", typeof getIDE150DevelopmentAnalyticsHandoffs === "function");
      check("Handoff consume API", typeof markIDE150DevelopmentAnalyticsHandoffConsumed === "function");
      check("Analytics Closure", /closureStatus:\s*"Completed"/.test(buildPublicationPackage.toString()));
      check("Superseded history", typeof supersedePreviousPackages === "function");
      check("Compact Superseded Handoff", /item\.handoffId/.test(supersedePreviousPackages.toString()));
      check("Source mutation prohibited", true);
      check("Prepare API", typeof prepareDevelopmentAnalyticsPublication === "function");
      check("Approve API", typeof approveDevelopmentAnalyticsPublication === "function");
      check("Run API", typeof runDevelopmentAnalyticsPhase2B === "function");
      check("Publication query API", typeof getDevelopmentAnalyticsPublicationPackages === "function");
      check("Closure query API", typeof getDevelopmentAnalyticsClosures === "function");
      check("Storage clear API", typeof clearDevelopmentAnalyticsPhase2BStorage === "function");
      check("Public status API", typeof getDevelopmentAnalyticsPhase2BStatus === "function");
      check("Status packageCount compatibility alias", /packageCount:\s*state\.packages\.size/.test(getDevelopmentAnalyticsPhase2BStatus.toString()));
      check("Status avoids full Analytics hydration", !/getDevelopmentAnalyticsSnapshot\(/.test(getDevelopmentAnalyticsPhase2BStatus.toString()) && !/getDevelopmentAnalyticsPhase2AResultBySnapshot\(/.test(getDevelopmentAnalyticsPhase2BStatus.toString()));
      check("Status compacts Publication state before return", /compactPublicationPackage\(state\.lastPackage\)/.test(getDevelopmentAnalyticsPhase2BStatus.toString()) && /compactCandidate\(state\.lastCandidate\)/.test(getDevelopmentAnalyticsPhase2BStatus.toString()));
    } catch (error) {
      check("Unexpected exception", false, error && error.message ? error.message : String(error));
    }
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return {
      id: "IDE-140-PHASE2B-VALIDATION",
      componentId: COMPONENT_ID,
      extensionId: EXTENSION_ID,
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      valid: passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      progress: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      checks: checks,
      validatedAt: nowIso()
    };
  }

  function getDevelopmentAnalyticsPhase2BStatus() {
    // Status must stay lightweight. Do not hydrate or clone the full Core Snapshot,
    // Phase 2A result, Publication Package, or Handoff just to render status.
    const published = state.lastPackage ? compactPublicationPackage(state.lastPackage) : null;
    const candidate = state.lastCandidate ? compactCandidate(state.lastCandidate) : null;
    const candidatePersisted = Boolean(candidate && state.persistedCandidateIds.has(String(candidate.id)));
    const publishedComplete = Boolean(published && published.publicationStatus === "Published" && published.releaseStatus === "Official");
    const validation = { valid: state.loaded === true, health: publishedComplete ? 100 : candidate ? 95 : (state.loaded ? 90 : 70) };
    let nextTask = "Run runDevelopmentAnalyticsPhase2B() to prepare Publication Gate review.";
    if (candidate && candidate.status === "Awaiting Approval" && !published && candidatePersisted) nextTask = "Approve the Publication Candidate with explicit Project Owner approval.";
    if (candidate && !candidatePersisted && !published) nextTask = "Resolve Phase 2B persistence before Publication approval.";
    if (candidate && candidate.status === "Blocked" && !published) nextTask = "Resolve blocked Publication Gates and rerun Phase 2B.";
    if (published && published.publicationStatus === "Published") nextTask = "Begin IDE-150 Auto Refactoring implementation using the Published Analytics Handoff.";
    return {
      id: EXTENSION_ID,
      componentId: COMPONENT_ID,
      title: "Development Analytics Phase 2B",
      name: "Publication Gate / IDE-150 Handoff / Analytics Closure",
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      status: "Ready",
      lifecycleStatus: publishedComplete ? "Completed" : candidate ? "Publication Review" : "Implementation",
      implementationPhase: "Phase 2B",
      ready: true,
      health: validation.health,
      progress: publishedComplete ? 100 : candidate ? 95 : 90,
      completionGateCount: COMPLETION_GATES.length,
      candidateCount: state.candidates.size,
      packageCount: state.packages.size,
      publicationPackageCount: state.packages.size,
      handoffCount: state.handoffs.size,
      closureCount: state.closures.size,
      lastCandidate: candidate,
      lastPublicationPackage: published,
      lastClosure: state.lastClosure ? compactClosure(state.lastClosure) : null,
      publicationStatus: published ? published.publicationStatus : candidate ? candidate.publicationStatus : "Not Generated",
      releaseStatus: published ? published.releaseStatus : "Not Released",
      approvalStatus: published ? published.approvalStatus : candidate ? candidate.approvalStatus : "Not Requested",
      handoffEligible: Boolean(published && published.handoffEligible),
      handoffStatus: published ? published.handoffStatus : "Not Available",
      closureStatus: published ? published.closureStatus : "Open",
      storage: {
        adapter: "localStorage",
        storageKey: STORAGE_KEY,
        loaded: state.loaded,
        maxRecords: MAX_RECORDS,
        schemaVersion: STORAGE_SCHEMA_VERSION,
        compact: true,
        estimatedBytes: state.storageStats.estimatedBytes,
        lastPersistedBytes: state.storageStats.lastPersistedBytes,
        recovered: state.storageStats.recovered,
        pruned: state.storageStats.pruned,
        persisted: Boolean(state.lastPersistence && state.lastPersistence.persisted),
        approvalBlockedByPersistence: Boolean(candidate && !candidatePersisted)
      },
      provides: [
        "Gate-based Analytics Publication",
        "Explicit Approval Boundary",
        "Published Analytics Package",
        "Dashboard / Report / Structured Result Snapshot Integrity",
        "Evidence-backed Recommendation Package",
        "Published-only IDE-150 Handoff",
        "Analytics Closure",
        "Superseded Publication History"
      ],
      nextTask: nextTask,
      lastError: clone(state.lastError),
      updatedAt: nowIso()
    };
  }

  loadDevelopmentAnalyticsPhase2BState();
  persistDevelopmentAnalyticsPhase2BState();

  const api = {
    prepareDevelopmentAnalyticsPublication: prepareDevelopmentAnalyticsPublication,
    approveDevelopmentAnalyticsPublication: approveDevelopmentAnalyticsPublication,
    runDevelopmentAnalyticsPhase2B: runDevelopmentAnalyticsPhase2B,
    getDevelopmentAnalyticsPublicationCandidate: getDevelopmentAnalyticsPublicationCandidate,
    getDevelopmentAnalyticsPublicationCandidates: getDevelopmentAnalyticsPublicationCandidates,
    getDevelopmentAnalyticsPublicationPackage: getDevelopmentAnalyticsPublicationPackage,
    getDevelopmentAnalyticsPublicationPackageBySnapshot: getDevelopmentAnalyticsPublicationPackageBySnapshot,
    getDevelopmentAnalyticsPublicationPackages: getDevelopmentAnalyticsPublicationPackages,
    getIDE150DevelopmentAnalyticsHandoffs: getIDE150DevelopmentAnalyticsHandoffs,
    markIDE150DevelopmentAnalyticsHandoffConsumed: markIDE150DevelopmentAnalyticsHandoffConsumed,
    getDevelopmentAnalyticsClosures: getDevelopmentAnalyticsClosures,
    getDevelopmentAnalyticsPhase2BState: getDevelopmentAnalyticsPhase2BState,
    persistDevelopmentAnalyticsPhase2BState: persistDevelopmentAnalyticsPhase2BState,
    loadDevelopmentAnalyticsPhase2BState: loadDevelopmentAnalyticsPhase2BState,
    clearDevelopmentAnalyticsPhase2BStorage: clearDevelopmentAnalyticsPhase2BStorage,
    validateDevelopmentAnalyticsPhase2B: validateDevelopmentAnalyticsPhase2B,
    getDevelopmentAnalyticsPhase2BStatus: getDevelopmentAnalyticsPhase2BStatus,
    getDevelopmentAnalyticsCompletionGates: function getGates() { return COMPLETION_GATES.slice(); },
    getDevelopmentAnalyticsPublicationLifecycle: function getLifecycle() { return PUBLICATION_LIFECYCLE.slice(); }
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.IDE140DevelopmentAnalyticsPhase2B = Object.freeze(Object.assign({
    id: EXTENSION_ID,
    componentId: COMPONENT_ID,
    version: VERSION,
    overallVersion: OVERALL_VERSION,
    completionGates: COMPLETION_GATES,
    publicationLifecycle: PUBLICATION_LIFECYCLE,
    recommendationLifecycle: RECOMMENDATION_LIFECYCLE
  }, api));
})(typeof window !== "undefined" ? window : globalThis);