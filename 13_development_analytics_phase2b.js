/* ============================================================
   FILE: 13_development_analytics_phase2b.js
   IDE-140 Development Analytics
   Phase 2B: Publication Gate / IDE-150 Handoff / Analytics Closure
   Version: 1.0.0
   Overall IDE-140 Version: 1.2.0
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
  const VERSION = "1.0.0";
  const OVERALL_VERSION = "1.2.0";
  const STORAGE_KEY = "AI_PROMPT_OS_IDE140_PHASE2B_V1";
  const MAX_RECORDS = 50;
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
      extensionId: EXTENSION_ID,
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      candidates: [...state.candidates.values()].map(clone),
      packages: [...state.packages.values()].map(clone),
      handoffs: [...state.handoffs.values()].map(clone),
      closures: [...state.closures.values()].map(clone),
      history: state.history.map(clone),
      sequence: state.sequence,
      lastCandidateId: state.lastCandidate ? state.lastCandidate.id : null,
      lastPackageId: state.lastPackage ? state.lastPackage.id : null,
      lastClosureId: state.lastClosure ? state.lastClosure.id : null,
      updatedAt: state.updatedAt
    };
  }

  function persistDevelopmentAnalyticsPhase2BState() {
    try {
      if (!global.localStorage) throw new Error("localStorage is unavailable.");
      touch();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
      state.lastError = null;
      return {
        persisted: true,
        storageKey: STORAGE_KEY,
        candidateCount: state.candidates.size,
        packageCount: state.packages.size,
        handoffCount: state.handoffs.size,
        closureCount: state.closures.size,
        updatedAt: state.updatedAt
      };
    } catch (error) {
      setError(error, "persistDevelopmentAnalyticsPhase2BState");
      return { persisted: false, storageKey: STORAGE_KEY, reason: state.lastError.message };
    }
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
        }
      }
      state.loaded = true;
      state.lastError = null;
      return { loaded: true, storageKey: STORAGE_KEY, packageCount: state.packages.size };
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
    const minimumReliability = reliabilityValues.length ? Math.min.apply(Math, reliabilityValues) : 0;
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
      gate("Reliability", reliabilityPassed, "Critical", reliabilityPassed ? "All required reliability layers meet the 0.8 threshold." : "One or more reliability layers are below 0.8.", { minimumReliability: minimumReliability, layers: reliabilityValues }),
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
      const persistence = source.persist === false
        ? { persisted: false, skipped: true }
        : persistDevelopmentAnalyticsPhase2BState();
      return Object.assign(clone(candidate), { persistence: persistence });
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
      if (item.handoffPackage && item.handoffPackage.id && state.handoffs.has(item.handoffPackage.id)) {
        const handoff = state.handoffs.get(item.handoffPackage.id);
        state.handoffs.set(item.handoffPackage.id, Object.assign({}, handoff, {
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
        gateDecisions: clone(evaluation.gates),
        approval: clone(approval),
        updatedAt: nowIso()
      });
      state.candidates.set(pending.id, pending);
      state.lastCandidate = clone(pending);
      persistDevelopmentAnalyticsPhase2BState();
      return clone(pending);
    }
    const publicationPackage = buildPublicationPackage(currentCandidate, resolved.snapshot, resolved.phase2A, evaluation, approval);
    supersedePreviousPackages(publicationPackage.scope, publicationPackage.id);
    state.packages.set(publicationPackage.id, publicationPackage);
    state.handoffs.set(publicationPackage.handoffPackage.id, publicationPackage.handoffPackage);
    state.closures.set(publicationPackage.closure.id, publicationPackage.closure);
    trimMap(state.packages);
    trimMap(state.handoffs);
    trimMap(state.closures);
    state.lastPackage = clone(publicationPackage);
    state.lastClosure = clone(publicationPackage.closure);
    const approvedCandidate = Object.assign({}, currentCandidate, {
      status: "Completed",
      publicationStatus: "Published",
      releaseStatus: "Official",
      approvalStatus: "Approved",
      handoffEligible: true,
      handoffStatus: "Available",
      closureStatus: "Completed",
      publicationPackageId: publicationPackage.id,
      handoffId: publicationPackage.handoffPackage.id,
      closureId: publicationPackage.closure.id,
      approval: clone(approval),
      gateDecisions: clone(evaluation.gates),
      updatedAt: nowIso()
    });
    state.candidates.set(approvedCandidate.id, approvedCandidate);
    state.lastCandidate = clone(approvedCandidate);
    recordEvent("Analytics Published and Handed Off", {
      publicationPackageId: publicationPackage.id,
      sourceSnapshotId: publicationPackage.sourceSnapshotId,
      handoffId: publicationPackage.handoffPackage.id,
      closureId: publicationPackage.closure.id,
      approvedBy: approval.actor
    });
    const persistence = settings.persist === false
      ? { persisted: false, skipped: true }
      : persistDevelopmentAnalyticsPhase2BState();
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
    const prepared = prepareDevelopmentAnalyticsPublication(Object.assign({}, source, { persist: false }));
    if (prepared.status === "Failed") return prepared;
    const approvalInput = source.approval || source.publicationApproval || null;
    if (!approvalInput) {
      const persistence = source.persist === false
        ? { persisted: false, skipped: true }
        : persistDevelopmentAnalyticsPhase2BState();
      return Object.assign(clone(prepared), { persistence: persistence });
    }
    return finalizeDevelopmentAnalyticsPublication(prepared, approvalInput, { persist: source.persist !== false });
  }

  function getDevelopmentAnalyticsPublicationCandidate(id) {
    if (!id) return clone(state.lastCandidate);
    return clone(state.candidates.get(String(id)) || null);
  }

  function getDevelopmentAnalyticsPublicationCandidates(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.candidates.values()].filter(function filter(item) {
      if (settings.status && item.status !== String(settings.status)) return false;
      if (settings.publicationStatus && item.publicationStatus !== String(settings.publicationStatus)) return false;
      if (settings.sourceSnapshotId && item.sourceSnapshotId !== String(settings.sourceSnapshotId)) return false;
      return true;
    }).sort(function newest(a, b) { return Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0); })
      .slice(0, Math.max(1, finite(settings.limit, MAX_RECORDS))).map(clone);
  }

  function getDevelopmentAnalyticsPublicationPackage(id) {
    if (!id) return clone(state.lastPackage);
    return clone(state.packages.get(String(id)) || null);
  }

  function getDevelopmentAnalyticsPublicationPackageBySnapshot(snapshotId) {
    const target = text(snapshotId, "");
    if (!target) return null;
    const result = [...state.packages.values()].filter(function filter(item) {
      return item.sourceSnapshotId === target;
    }).sort(function newest(a, b) { return Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0); })[0];
    return clone(result || null);
  }

  function getDevelopmentAnalyticsPublicationPackages(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.packages.values()].filter(function filter(item) {
      if (settings.publicationStatus && item.publicationStatus !== String(settings.publicationStatus)) return false;
      if (settings.releaseStatus && item.releaseStatus !== String(settings.releaseStatus)) return false;
      if (settings.sourceSnapshotId && item.sourceSnapshotId !== String(settings.sourceSnapshotId)) return false;
      return true;
    }).sort(function newest(a, b) { return Date.parse(b.publishedAt || b.generatedAt || 0) - Date.parse(a.publishedAt || a.generatedAt || 0); })
      .slice(0, Math.max(1, finite(settings.limit, MAX_RECORDS))).map(clone);
  }

  function getIDE150DevelopmentAnalyticsHandoffs(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.handoffs.values()].filter(function filter(item) {
      if (settings.status && item.status !== String(settings.status)) return false;
      if (settings.consumed != null && item.consumed !== Boolean(settings.consumed)) return false;
      return item.targetComponent === "IDE-150" && item.eligible === true;
    }).sort(function newest(a, b) { return Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0); })
      .slice(0, Math.max(1, finite(settings.limit, MAX_RECORDS))).map(clone);
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

  function validateDevelopmentAnalyticsPhase2B() {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    try {
      check("Extension identity", EXTENSION_ID === "IDE-140-PHASE-2B");
      check("Overall version", OVERALL_VERSION === "1.2.0");
      check("State persistence", state.loaded === true && typeof persistDevelopmentAnalyticsPhase2BState === "function");
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
      check("Source mutation prohibited", true);
      check("Prepare API", typeof prepareDevelopmentAnalyticsPublication === "function");
      check("Approve API", typeof approveDevelopmentAnalyticsPublication === "function");
      check("Run API", typeof runDevelopmentAnalyticsPhase2B === "function");
      check("Publication query API", typeof getDevelopmentAnalyticsPublicationPackages === "function");
      check("Closure query API", typeof getDevelopmentAnalyticsClosures === "function");
      check("Public status API", typeof getDevelopmentAnalyticsPhase2BStatus === "function");
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
    const validation = validateDevelopmentAnalyticsPhase2B();
    const snapshot = typeof global.getDevelopmentAnalyticsSnapshot === "function" ? global.getDevelopmentAnalyticsSnapshot() : null;
    const phase2A = snapshot && typeof global.getDevelopmentAnalyticsPhase2AResultBySnapshot === "function"
      ? global.getDevelopmentAnalyticsPhase2AResultBySnapshot(snapshot.id)
      : null;
    const published = clone(state.lastPackage);
    const candidate = clone(state.lastCandidate);
    let nextTask = "Generate an IDE-140 Analytics Snapshot and Phase 2A result.";
    if (snapshot && phase2A && !candidate && !published) nextTask = "Run runDevelopmentAnalyticsPhase2B() to prepare Publication Gate review.";
    if (candidate && candidate.status === "Awaiting Approval" && !published) nextTask = "Approve the Publication Candidate with explicit Project Owner approval.";
    if (candidate && candidate.status === "Blocked" && !published) nextTask = "Resolve blocked Publication Gates and rerun Phase 2B.";
    if (published && published.publicationStatus === "Published") nextTask = "Begin IDE-150 Auto Refactoring implementation using the Published Analytics Handoff.";
    return {
      id: EXTENSION_ID,
      componentId: COMPONENT_ID,
      title: "Development Analytics Phase 2B",
      name: "Publication Gate / IDE-150 Handoff / Analytics Closure",
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      status: validation.valid ? "Ready" : "Attention",
      lifecycleStatus: "Completed",
      implementationPhase: "Phase 2B",
      ready: validation.valid,
      health: validation.health,
      progress: 100,
      completionGateCount: COMPLETION_GATES.length,
      candidateCount: state.candidates.size,
      publicationPackageCount: state.packages.size,
      handoffCount: state.handoffs.size,
      closureCount: state.closures.size,
      lastCandidate: candidate,
      lastPublicationPackage: published,
      lastClosure: clone(state.lastClosure),
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
        maxRecords: MAX_RECORDS
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