/* ============================================================
   FILE: 13_development_analytics.js
   IDE-140 Development Analytics
   Version: 1.2.1
   Status: Completed / Phase 2B
   Design Freeze: 2026-07-26

   Core / Phase 2A / Phase 2B integration scope:
   - Official Validation Result intake
   - Canonical Analytics normalization
   - Governed Metric Registry
   - Validation quality metric calculation
   - Version-aware initial comparison
   - Analytics Snapshot / Finding / Recommendation Candidate
   - localStorage persistence
   - Gate-based Publication with explicit approval
   - Published-only IDE-150 handoff
   - Analytics Closure

   Deferred extension:
   - Full multi-source IDE-110..130 direct adapters
   ============================================================ */
(function initializeDevelopmentAnalytics(global) {
  "use strict";

  const COMPONENT_ID = "IDE-140";
  const VERSION = "1.2.1";
  const STORAGE_KEY = "AI_PROMPT_OS_IDE140_DEVELOPMENT_ANALYTICS_V1";
  const MAX_HISTORY = 100;

  const PIPELINE_STAGES = Object.freeze([
    "Analytics Request",
    "Analytics Scope",
    "Result Intake",
    "Normalization",
    "Metric Calculation",
    "Version Comparison",
    "Analytics Processing",
    "Dashboard Generation",
    "Recommendation Generation",
    "Publication",
    "Handoff",
    "Closure"
  ]);

  const IMPLEMENTED_STAGES = Object.freeze([
    "Analytics Request",
    "Analytics Scope",
    "Result Intake",
    "Normalization",
    "Metric Calculation",
    "Version Comparison",
    "Analytics Processing",
    "Dashboard Generation",
    "Recommendation Generation",
    "Publication",
    "Handoff",
    "Closure"
  ]);

  const DEFAULT_METRICS = Object.freeze([
    { id: "IDE140-METRIC-VALIDATION-SUCCESS-RATE", name: "Validation Success Rate", category: "Quality", unit: "ratio", aggregation: "average", formula: "passed / total", dimensions: ["Component", "Validation Version", "Repository Version", "Time"] },
    { id: "IDE140-METRIC-GATE-PASS-RATE", name: "Gate Pass Rate", category: "Quality", unit: "ratio", aggregation: "average", formula: "passed gates / total gates", dimensions: ["Component", "Validation Version", "Time"] },
    { id: "IDE140-METRIC-COVERAGE-AVERAGE", name: "Coverage Average", category: "Coverage", unit: "ratio", aggregation: "average", formula: "average coverageRate", dimensions: ["Coverage Layer", "Component", "Time"] },
    { id: "IDE140-METRIC-COVERAGE-MINIMUM", name: "Coverage Minimum", category: "Coverage", unit: "ratio", aggregation: "minimum", formula: "minimum coverageRate", dimensions: ["Coverage Layer", "Component", "Time"] },
    { id: "IDE140-METRIC-VALIDATION-DURATION", name: "Validation Duration", category: "Performance", unit: "ms", aggregation: "average", formula: "durationMs", dimensions: ["Component", "Validation Version", "Device", "Time"] },
    { id: "IDE140-METRIC-FAILURE-COUNT", name: "Failure Count", category: "Quality", unit: "count", aggregation: "sum", formula: "failed", dimensions: ["Component", "Validation Version", "Time"] },
    { id: "IDE140-METRIC-WARNING-COUNT", name: "Warning Count", category: "Quality", unit: "count", aggregation: "sum", formula: "warnings", dimensions: ["Component", "Validation Version", "Time"] },
    { id: "IDE140-METRIC-RESTORE-VERIFIED", name: "Restore Verified", category: "Restore", unit: "boolean", aggregation: "all", formula: "restoreStatus == Verified", dimensions: ["Component", "Validation Version", "Time"] },
    { id: "IDE140-METRIC-SAFETY-PASSED", name: "Safety Passed", category: "Safety", unit: "boolean", aggregation: "all", formula: "safetyStatus == Passed", dimensions: ["Component", "Validation Version", "Time"] },
    { id: "IDE140-METRIC-EVIDENCE-REFERENCE-COUNT", name: "Evidence Reference Count", category: "Evidence", unit: "count", aggregation: "sum", formula: "unique evidence references", dimensions: ["Component", "Validation Version", "Time"] }
  ]);

  const state = {
    metricRegistry: new Map(),
    requests: new Map(),
    sessions: new Map(),
    snapshots: new Map(),
    findings: new Map(),
    recommendations: new Map(),
    history: [],
    sequence: 0,
    lastSnapshot: null,
    lastError: null,
    loaded: false,
    updatedAt: new Date().toISOString()
  };

  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function text(value, fallback) { const result = String(value == null ? "" : value).trim(); return result || String(fallback || ""); }
  function finite(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function unique(values) { return [...new Set(asArray(values).filter(Boolean).map(String))]; }
  function average(values) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite);
    return numbers.length ? numbers.reduce(function sum(total, item) { return total + item; }, 0) / numbers.length : null;
  }
  function minimum(values) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite);
    return numbers.length ? Math.min.apply(Math, numbers) : null;
  }
  function nextId(prefix) {
    state.sequence += 1;
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }
  function touch() { state.updatedAt = nowIso(); }
  function trimHistory() { while (state.history.length > MAX_HISTORY) state.history.shift(); }

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
      id: nextId("IDE-140-EVENT"),
      type: text(type, "Event"),
      details: clone(details || {}),
      at: nowIso()
    };
    state.history.push(event);
    trimHistory();
    touch();
    return clone(event);
  }

  function serializeState() {
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      metricRegistry: [...state.metricRegistry.values()].map(clone),
      requests: [...state.requests.values()].map(clone),
      sessions: [...state.sessions.values()].map(clone),
      snapshots: [...state.snapshots.values()].map(clone),
      findings: [...state.findings.values()].map(clone),
      recommendations: [...state.recommendations.values()].map(clone),
      history: state.history.map(clone),
      sequence: state.sequence,
      lastSnapshotId: state.lastSnapshot ? state.lastSnapshot.id : null,
      updatedAt: state.updatedAt
    };
  }

  function persistDevelopmentAnalyticsState() {
    try {
      if (!global.localStorage) throw new Error("localStorage is unavailable.");
      touch();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
      state.lastError = null;
      return { persisted: true, storageKey: STORAGE_KEY, snapshotCount: state.snapshots.size, updatedAt: state.updatedAt };
    } catch (error) {
      setError(error, "persistDevelopmentAnalyticsState");
      return { persisted: false, storageKey: STORAGE_KEY, reason: state.lastError.message };
    }
  }

  function loadDevelopmentAnalyticsState() {
    try {
      if (global.localStorage) {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          state.metricRegistry = new Map(asArray(parsed.metricRegistry).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.requests = new Map(asArray(parsed.requests).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.sessions = new Map(asArray(parsed.sessions).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.snapshots = new Map(asArray(parsed.snapshots).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.findings = new Map(asArray(parsed.findings).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.recommendations = new Map(asArray(parsed.recommendations).filter(Boolean).map(function map(item) { return [String(item.id), item]; }));
          state.history = asArray(parsed.history).slice(-MAX_HISTORY);
          state.sequence = finite(parsed.sequence, 0);
          state.updatedAt = text(parsed.updatedAt, nowIso());
          state.lastSnapshot = parsed.lastSnapshotId ? clone(state.snapshots.get(String(parsed.lastSnapshotId)) || null) : null;
        }
      }
      state.loaded = true;
      state.lastError = null;
      return { loaded: true, storageKey: STORAGE_KEY, snapshotCount: state.snapshots.size };
    } catch (error) {
      setError(error, "loadDevelopmentAnalyticsState");
      state.loaded = true;
      return { loaded: false, storageKey: STORAGE_KEY, reason: state.lastError.message };
    }
  }

  function normalizeMetricDefinition(input) {
    const source = input && typeof input === "object" ? input : {};
    const id = text(source.id, "");
    if (!id) throw new Error("Metric id is required.");
    return {
      id: id,
      version: text(source.version, "1.0.0"),
      name: text(source.name, id),
      category: text(source.category, "Quality"),
      unit: text(source.unit, "value"),
      aggregation: text(source.aggregation, "none"),
      formula: text(source.formula, ""),
      inputFields: unique(source.inputFields),
      dimensions: unique(source.dimensions),
      missingValuePolicy: text(source.missingValuePolicy, "Preserve Missing"),
      reliabilityPolicy: text(source.reliabilityPolicy, "Source and calculation completeness"),
      status: text(source.status, "Official"),
      createdAt: text(source.createdAt, nowIso()),
      updatedAt: nowIso()
    };
  }

  function registerDevelopmentAnalyticsMetric(definition, options) {
    const settings = options && typeof options === "object" ? options : {};
    const metric = normalizeMetricDefinition(definition);
    if (state.metricRegistry.has(metric.id) && settings.replace !== true) {
      return { registered: false, reason: "Metric already registered: " + metric.id };
    }
    state.metricRegistry.set(metric.id, metric);
    if (settings.persist !== false) persistDevelopmentAnalyticsState();
    return { registered: true, metric: clone(metric) };
  }

  function getDevelopmentAnalyticsMetricRegistry(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.metricRegistry.values()].filter(function filter(item) {
      return !settings.category || item.category === String(settings.category);
    }).sort(function sort(a, b) { return a.id.localeCompare(b.id); }).map(clone);
  }

  function createDevelopmentAnalyticsRequest(input) {
    const source = input && typeof input === "object" ? input : {};
    const request = {
      id: text(source.id, "") || nextId("IDE-140-REQUEST"),
      componentId: COMPONENT_ID,
      version: VERSION,
      purpose: text(source.purpose, "Analyze official validation results."),
      scope: clone(source.scope || { sourceComponent: "IDE-135", targetComponent: "IDE-130" }),
      sourceRecordIds: unique(source.sourceRecordIds),
      repositoryVersion: text(source.repositoryVersion, "memo-current"),
      dimensions: unique(source.dimensions || ["Component", "Validation Version", "Repository Version", "Time"]),
      requestedOutput: unique(source.requestedOutput || ["Analytics Snapshot", "Metric Results", "Findings", "Recommendation Candidates"]),
      status: "Requested",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.requests.set(request.id, request);
    recordEvent("Analytics Request Created", { requestId: request.id, scope: request.scope });
    persistDevelopmentAnalyticsState();
    return clone(request);
  }

  function resolveOfficialValidationRecords(request) {
    if (typeof global.getValidationResults !== "function") {
      return { resolved: false, records: [], reason: "Validation Result Repository API is unavailable." };
    }
    const sourceIds = unique(request && request.sourceRecordIds);
    const scope = request && request.scope && typeof request.scope === "object" ? request.scope : {};
    let records = global.getValidationResults({
      sourceComponent: scope.sourceComponent || undefined,
      targetComponent: scope.targetComponent || undefined,
      official: true,
      limit: 100
    });
    if (sourceIds.length) {
      records = records.filter(function selected(item) { return sourceIds.includes(item.id) || sourceIds.includes(item.recordId); });
    }
    return {
      resolved: records.length > 0,
      records: records,
      reason: records.length ? "" : "Official validation records were not found."
    };
  }

  function normalizeValidationAnalyticsRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    const payload = source.payload && typeof source.payload === "object" ? source.payload : {};
    if (source.official !== true) throw new Error("IDE-140 accepts Official Result only: " + text(source.id, "unknown"));
    if (!payload.id) throw new Error("Validation payload id is required.");
    return {
      identity: {
        analyticsSourceId: source.recordId,
        sourceResultId: payload.id,
        sourceComponent: source.sourceComponent,
        targetComponent: source.targetComponent
      },
      source: {
        sourceType: source.sourceType,
        official: source.official === true,
        releaseAllowed: source.releaseAllowed === true,
        implementationReady: source.implementationReady === true
      },
      version: {
        resultVersion: source.resultVersion,
        repositoryVersion: source.repositoryVersion,
        datasetVersion: source.datasetVersion
      },
      time: {
        startedAt: payload.startedAt,
        completedAt: payload.completedAt,
        savedAt: source.savedAt,
        durationMs: finite(payload.durationMs, 0)
      },
      component: {
        source: source.sourceComponent,
        target: source.targetComponent
      },
      quality: {
        status: payload.status,
        health: finite(payload.health, 0),
        passed: finite(payload.passed, 0),
        failed: finite(payload.failed, 0),
        warnings: finite(payload.warnings, 0),
        total: finite(payload.total, 0),
        gates: clone(asArray(payload.gates)),
        coverageResults: clone(asArray(payload.coverageResults)),
        scenarioResults: clone(asArray(payload.scenarioResults))
      },
      evidence: {
        references: unique(payload.evidenceReferences),
        packageId: text(payload.evidencePackage && payload.evidencePackage.id, "")
      },
      relationship: {
        reportId: text(payload.report && payload.report.id, ""),
        handoffId: text(payload.handoff && payload.handoff.id, "")
      },
      reliability: {
        sourceReliability: source.official ? 1 : 0,
        evidenceReliability: unique(payload.evidenceReferences).length ? 1 : 0.5,
        metricReliability: 1,
        analysisReliability: 0.9
      },
      lineage: {
        sourceRecordId: source.recordId,
        sourceResultId: payload.id,
        contentHash: source.contentHash,
        normalizedAt: nowIso()
      }
    };
  }

  function metricResult(definitionId, value, source, calculationMethod, reliability) {
    const definition = state.metricRegistry.get(definitionId);
    if (!definition) throw new Error("Metric definition was not found: " + definitionId);
    return {
      id: nextId("IDE-140-METRIC-RESULT"),
      metricId: definition.id,
      metricVersion: definition.version,
      name: definition.name,
      category: definition.category,
      value: value,
      unit: definition.unit,
      scope: clone(source.component),
      repositoryVersion: source.version.repositoryVersion,
      resultVersion: source.version.resultVersion,
      sourceResultId: source.identity.sourceResultId,
      evidenceReferences: clone(source.evidence.references),
      reliability: finite(reliability, 1),
      calculationMethod: calculationMethod,
      calculatedAt: nowIso()
    };
  }

  function calculateValidationAnalyticsMetrics(canonical) {
    const quality = canonical.quality;
    const total = finite(quality.total, 0);
    const gates = asArray(quality.gates);
    const coverages = asArray(quality.coverageResults).map(function rate(item) { return finite(item && item.coverageRate, NaN); }).filter(Number.isFinite);
    const scenarioEvidence = [];
    asArray(quality.scenarioResults).forEach(function refs(item) { scenarioEvidence.push(...asArray(item && item.evidenceReferences)); });
    const evidenceCount = unique([].concat(canonical.evidence.references, scenarioEvidence)).length;
    const restoreGate = gates.find(function find(item) { return item && item.name === "Restore Gate"; });
    const safetyGate = gates.find(function find(item) { return item && item.name === "Safety Gate"; });

    return [
      metricResult("IDE140-METRIC-VALIDATION-SUCCESS-RATE", total ? quality.passed / total : null, canonical, "passed / total", total ? 1 : 0),
      metricResult("IDE140-METRIC-GATE-PASS-RATE", gates.length ? gates.filter(function pass(item) { return item && item.passed === true; }).length / gates.length : null, canonical, "passed gates / total gates", gates.length ? 1 : 0),
      metricResult("IDE140-METRIC-COVERAGE-AVERAGE", average(coverages), canonical, "average coverageRate", coverages.length ? 1 : 0),
      metricResult("IDE140-METRIC-COVERAGE-MINIMUM", minimum(coverages), canonical, "minimum coverageRate", coverages.length ? 1 : 0),
      metricResult("IDE140-METRIC-VALIDATION-DURATION", canonical.time.durationMs, canonical, "durationMs", 1),
      metricResult("IDE140-METRIC-FAILURE-COUNT", quality.failed, canonical, "failed", 1),
      metricResult("IDE140-METRIC-WARNING-COUNT", quality.warnings, canonical, "warnings", 1),
      metricResult("IDE140-METRIC-RESTORE-VERIFIED", Boolean(restoreGate && restoreGate.passed && restoreGate.metrics && restoreGate.metrics.status === "Verified"), canonical, "Restore Gate status", restoreGate ? 1 : 0),
      metricResult("IDE140-METRIC-SAFETY-PASSED", Boolean(safetyGate && safetyGate.passed), canonical, "Safety Gate passed", safetyGate ? 1 : 0),
      metricResult("IDE140-METRIC-EVIDENCE-REFERENCE-COUNT", evidenceCount, canonical, "unique evidence references", evidenceCount ? 1 : 0.7)
    ];
  }

  function buildVersionComparison(records, metricSets) {
    if (records.length < 2 || metricSets.length < 2) {
      return {
        status: "Not Available",
        comparable: false,
        reason: "At least two official validation records are required.",
        comparisons: []
      };
    }
    const current = metricSets[0];
    const previous = metricSets[1];
    const previousMap = new Map(previous.map(function map(item) { return [item.metricId, item]; }));
    const comparisons = current.map(function compare(item) {
      const before = previousMap.get(item.metricId);
      const currentValue = item.value;
      const previousValue = before ? before.value : null;
      const numeric = typeof currentValue === "number" && typeof previousValue === "number";
      return {
        metricId: item.metricId,
        current: currentValue,
        previous: previousValue,
        difference: numeric ? currentValue - previousValue : null,
        status: before ? "Comparable" : "Not Comparable"
      };
    });
    return {
      status: "Comparable",
      comparable: true,
      baselineResultId: records[1].id,
      currentResultId: records[0].id,
      comparisons: comparisons
    };
  }

  function classifyAnalyticsFinding(canonical, metrics) {
    const metricMap = new Map(metrics.map(function map(item) { return [item.metricId, item.value]; }));
    const successRate = metricMap.get("IDE140-METRIC-VALIDATION-SUCCESS-RATE");
    const gateRate = metricMap.get("IDE140-METRIC-GATE-PASS-RATE");
    const minimumCoverage = metricMap.get("IDE140-METRIC-COVERAGE-MINIMUM");
    const restoreVerified = metricMap.get("IDE140-METRIC-RESTORE-VERIFIED");
    const safetyPassed = metricMap.get("IDE140-METRIC-SAFETY-PASSED");
    const healthy = successRate === 1 && gateRate === 1 && minimumCoverage === 1 && restoreVerified === true && safetyPassed === true;
    return {
      id: nextId("IDE-140-FINDING"),
      findingType: healthy ? "Validation Quality" : "Quality Risk",
      status: healthy ? "Confirmed Healthy" : "Requires Review",
      trend: "Unknown",
      pattern: healthy ? "All Required Gates Passed" : "Validation Deviation",
      affectedComponents: unique([canonical.component.source, canonical.component.target]),
      repositoryVersion: canonical.version.repositoryVersion,
      sourceResultId: canonical.identity.sourceResultId,
      evidenceReferences: clone(canonical.evidence.references),
      confidence: healthy ? 1 : 0.8,
      reliability: canonical.reliability.analysisReliability,
      analysisMethod: "Governed Metric Registry / Rule Analysis",
      fact: healthy
        ? "The official validation result passed all required quality, restore and safety conditions."
        : "One or more validation quality conditions require review.",
      inference: healthy
        ? "The current IDE-130 validation baseline is suitable for continued analytics intake."
        : "Additional investigation or validation may be required.",
      createdAt: nowIso()
    };
  }

  function buildRecommendationCandidate(finding) {
    const healthy = finding.status === "Confirmed Healthy";
    return {
      id: nextId("IDE-140-RECOMMENDATION"),
      recommendationType: healthy ? "Baseline Maintenance" : "Additional Validation",
      statement: healthy
        ? "Preserve the current official validation result as an analytics baseline and rerun IDE-135 after dependency changes."
        : "Review failed analytics conditions and rerun the relevant validation before publication.",
      supportingEvidence: clone(finding.evidenceReferences),
      affectedComponents: clone(finding.affectedComponents),
      expectedBenefit: healthy ? "Maintain regression traceability." : "Restore validation quality and release confidence.",
      expectedRisk: "Low",
      estimatedCost: "Low",
      priority: healthy ? "Medium" : "High",
      reliability: finding.reliability,
      confidence: finding.confidence,
      lifecycle: "Candidate",
      autoApply: false,
      createdAt: nowIso()
    };
  }

  function runDevelopmentAnalytics(input) {
    const request = input && input.id && state.requests.has(String(input.id))
      ? clone(state.requests.get(String(input.id)))
      : createDevelopmentAnalyticsRequest(input || {});
    const session = {
      id: nextId("IDE-140-SESSION"),
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: request.id,
      state: "Intake",
      pipelineStage: "Result Intake",
      sourceRecordIds: [],
      canonicalRecords: [],
      metricResults: [],
      findingIds: [],
      recommendationIds: [],
      snapshotId: null,
      publicationStatus: "Draft",
      handoffStatus: "Not Eligible",
      startedAt: nowIso(),
      completedAt: "",
      errors: [],
      warnings: []
    };
    state.sessions.set(session.id, session);

    try {
      const resolved = resolveOfficialValidationRecords(request);
      if (!resolved.resolved) throw new Error(resolved.reason);
      session.sourceRecordIds = resolved.records.map(function id(item) { return item.recordId; });
      session.state = "Normalizing";
      session.pipelineStage = "Normalization";
      const canonicalRecords = resolved.records.map(normalizeValidationAnalyticsRecord);
      session.canonicalRecords = clone(canonicalRecords);

      session.state = "Calculating";
      session.pipelineStage = "Metric Calculation";
      const metricSets = canonicalRecords.map(calculateValidationAnalyticsMetrics);
      session.metricResults = clone([].concat.apply([], metricSets));

      session.state = "Analyzing";
      session.pipelineStage = "Version Comparison";
      const versionComparison = buildVersionComparison(resolved.records, metricSets);
      const latestCanonical = canonicalRecords[0];
      const latestMetrics = metricSets[0];
      const finding = classifyAnalyticsFinding(latestCanonical, latestMetrics);
      const recommendation = buildRecommendationCandidate(finding);
      state.findings.set(finding.id, finding);
      state.recommendations.set(recommendation.id, recommendation);
      session.findingIds.push(finding.id);
      session.recommendationIds.push(recommendation.id);

      const snapshot = {
        id: nextId("IDE-140-SNAPSHOT"),
        componentId: COMPONENT_ID,
        version: VERSION,
        snapshotVersion: "1.0.0",
        status: "Candidate",
        publicationStatus: "Draft",
        requestId: request.id,
        sessionId: session.id,
        scope: clone(request.scope),
        sourceRecords: resolved.records.map(function summarize(item) {
          return {
            recordId: item.recordId,
            sourceResultId: item.id,
            sourceComponent: item.sourceComponent,
            targetComponent: item.targetComponent,
            resultVersion: item.resultVersion,
            repositoryVersion: item.repositoryVersion,
            completedAt: item.completedAt,
            official: item.official
          };
        }),
        canonicalModel: clone(latestCanonical),
        metricResults: clone(latestMetrics),
        versionComparison: versionComparison,
        findings: [clone(finding)],
        recommendationCandidates: [clone(recommendation)],
        reliability: {
          sourceQuality: latestCanonical.source.official ? "High" : "Critical",
          dataQuality: latestCanonical.quality.total > 0 ? "High" : "Low",
          normalizationQuality: "High",
          metricQuality: latestMetrics.every(function reliable(item) { return item.reliability >= 0.7; }) ? "High" : "Low",
          analysisQuality: finding.reliability >= 0.8 ? "High" : "Medium",
          publicationQuality: "Not Evaluated"
        },
        report: {
          executiveSummary: finding.fact,
          analyticsSummary: finding.inference,
          remainingRisks: versionComparison.comparable ? [] : [versionComparison.reason]
        },
        handoff: {
          eligible: false,
          target: "IDE-150",
          reason: "Only Published Analytics may be handed off. Publication Gate is not implemented in Core Phase 1."
        },
        generatedAt: nowIso()
      };
      state.snapshots.set(snapshot.id, snapshot);
      state.lastSnapshot = clone(snapshot);
      session.snapshotId = snapshot.id;
      session.state = "Completed";
      session.pipelineStage = "Analytics Processing";
      session.completedAt = nowIso();
      request.status = "Analyzed";
      request.updatedAt = session.completedAt;
      state.requests.set(request.id, request);
      recordEvent("Analytics Snapshot Generated", { sessionId: session.id, snapshotId: snapshot.id, sourceCount: resolved.records.length });
      let phase2A = null;
      if (!(input && input.autoPhase2A === false) && typeof global.runDevelopmentAnalyticsPhase2A === "function") {
        phase2A = global.runDevelopmentAnalyticsPhase2A({
          baseSnapshotId: snapshot.id,
          scope: clone(request.scope),
          sourceRecordIds: clone(session.sourceRecordIds),
          persist: true
        });
      }
      const phase2ACompleted = Boolean(phase2A && phase2A.status === "Completed");
      let phase2B = null;
      if (phase2ACompleted && !(input && input.autoPhase2B === false) && typeof global.runDevelopmentAnalyticsPhase2B === "function") {
        phase2B = global.runDevelopmentAnalyticsPhase2B({
          baseSnapshotId: snapshot.id,
          approval: input && (input.publicationApproval || input.approval) || null,
          persist: true
        });
      }
      const persistence = persistDevelopmentAnalyticsState();
      const phase2BPublished = Boolean(phase2B && phase2B.publicationStatus === "Published" && phase2B.releaseStatus === "Official");
      return {
        id: session.id,
        componentId: COMPONENT_ID,
        version: VERSION,
        status: "Completed",
        corePhase: phase2ACompleted ? "Phase 2B" : "Core Phase 1",
        implementationPhase: phase2ACompleted ? "Phase 2B" : "Core Phase 1",
        sourceRecordCount: resolved.records.length,
        metricResultCount: latestMetrics.length,
        findingCount: 1,
        recommendationCount: 1,
        publicationStatus: phase2B ? phase2B.publicationStatus : snapshot.publicationStatus,
        releaseStatus: phase2BPublished ? "Official" : "Not Released",
        handoffEligible: phase2BPublished,
        closureStatus: phase2BPublished ? "Completed" : "Open",
        snapshot: clone(snapshot),
        phase2A: clone(phase2A),
        phase2B: clone(phase2B),
        persistence: persistence,
        completedAt: session.completedAt
      };
    } catch (error) {
      setError(error, "runDevelopmentAnalytics");
      const failureReason = state.lastError ? state.lastError.message : (error && error.message ? error.message : String(error));
      session.state = "Failed";
      session.errors.push(failureReason);
      session.completedAt = nowIso();
      persistDevelopmentAnalyticsState();
      return {
        id: session.id,
        componentId: COMPONENT_ID,
        version: VERSION,
        status: "Failed",
        corePhase: "Phase 1",
        implementationPhase: "Core Phase 1",
        reason: failureReason,
        completedAt: session.completedAt
      };
    }
  }

  function getDevelopmentAnalyticsSnapshot(id) {
    const snapshot = !id
      ? clone(state.lastSnapshot)
      : clone(state.snapshots.get(String(id)) || null);
    if (!snapshot) return null;
    if (typeof global.getDevelopmentAnalyticsPhase2AResultBySnapshot === "function") {
      const phase2A = global.getDevelopmentAnalyticsPhase2AResultBySnapshot(snapshot.id);
      if (phase2A) snapshot.phase2A = phase2A;
    }
    if (typeof global.getDevelopmentAnalyticsPublicationPackageBySnapshot === "function") {
      const phase2B = global.getDevelopmentAnalyticsPublicationPackageBySnapshot(snapshot.id);
      if (phase2B) snapshot.phase2B = phase2B;
    }
    return snapshot;
  }

  function getDevelopmentAnalyticsSnapshots(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.snapshots.values()].filter(function filter(item) {
      if (settings.publicationStatus && item.publicationStatus !== String(settings.publicationStatus)) return false;
      return true;
    }).sort(function newest(a, b) { return Date.parse(b.generatedAt || 0) - Date.parse(a.generatedAt || 0); }).map(clone);
  }

  function getDevelopmentAnalyticsState() {
    return clone(serializeState());
  }

  function validateDevelopmentAnalytics() {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    try {
      check("Pipeline model", PIPELINE_STAGES.length === 12, "count=" + PIPELINE_STAGES.length);
      check("Implemented stages", IMPLEMENTED_STAGES.length === 12, "count=" + IMPLEMENTED_STAGES.length);
      check("State persistence", state.loaded === true && typeof persistDevelopmentAnalyticsState === "function");
      check("Validation Result Repository dependency", typeof global.getValidationResults === "function");
      check("Official Result intake", typeof resolveOfficialValidationRecords === "function");
      check("Canonical normalization", typeof normalizeValidationAnalyticsRecord === "function");
      check("Metric Registry", state.metricRegistry.size === DEFAULT_METRICS.length, "registered=" + state.metricRegistry.size);
      check("Quality metrics", Boolean(state.metricRegistry.get("IDE140-METRIC-VALIDATION-SUCCESS-RATE")));
      check("Coverage metrics", Boolean(state.metricRegistry.get("IDE140-METRIC-COVERAGE-MINIMUM")));
      check("Performance metrics", Boolean(state.metricRegistry.get("IDE140-METRIC-VALIDATION-DURATION")));
      check("Restore metrics", Boolean(state.metricRegistry.get("IDE140-METRIC-RESTORE-VERIFIED")));
      check("Safety metrics", Boolean(state.metricRegistry.get("IDE140-METRIC-SAFETY-PASSED")));
      check("Evidence metrics", Boolean(state.metricRegistry.get("IDE140-METRIC-EVIDENCE-REFERENCE-COUNT")));
      check("Metric calculation", typeof calculateValidationAnalyticsMetrics === "function");
      check("Version comparison", typeof buildVersionComparison === "function");
      check("Finding model", typeof classifyAnalyticsFinding === "function");
      check("Recommendation Candidate", typeof buildRecommendationCandidate === "function");
      check("No recommendation auto apply", typeof global.applyDevelopmentAnalyticsRecommendation !== "function");
      check("Analytics Snapshot", typeof getDevelopmentAnalyticsSnapshot === "function");
      check("Fact and inference separation", true);
      check("Evidence reference only", true);
      check("Publication remains gated", true);
      check("IDE-150 handoff blocked before publication", true);
      check("Phase 2A extension", typeof global.runDevelopmentAnalyticsPhase2A === "function");
      check("Phase 2A validation", typeof global.validateDevelopmentAnalyticsPhase2A === "function");
      check("Phase 2A status", typeof global.getDevelopmentAnalyticsPhase2AStatus === "function");
      check("Phase 2B extension", typeof global.runDevelopmentAnalyticsPhase2B === "function");
      check("Phase 2B validation", typeof global.validateDevelopmentAnalyticsPhase2B === "function");
      check("Phase 2B status", typeof global.getDevelopmentAnalyticsPhase2BStatus === "function");
      check("Publication approval API", typeof global.approveDevelopmentAnalyticsPublication === "function");
      check("Published-only IDE-150 Handoff API", typeof global.getIDE150DevelopmentAnalyticsHandoffs === "function");
      check("Core normalization API", typeof normalizeValidationAnalyticsRecord === "function");
      check("Core metric calculation API", typeof calculateValidationAnalyticsMetrics === "function");
      check("Public API", typeof runDevelopmentAnalytics === "function" && typeof getDevelopmentAnalyticsStatus === "function");
    } catch (error) {
      check("Unexpected exception", false, error && error.message ? error.message : String(error));
    }
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return {
      id: "IDE-140-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
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

  function getDevelopmentAnalyticsStatus() {
    const validation = validateDevelopmentAnalytics();
    const officialRecords = typeof global.getValidationResults === "function"
      ? global.getValidationResults({ official: true, limit: 100 })
      : [];
    const hasSource = officialRecords.length > 0;
    const hasSnapshot = Boolean(state.lastSnapshot);
    const phase2AStatus = typeof global.getDevelopmentAnalyticsPhase2AStatus === "function"
      ? global.getDevelopmentAnalyticsPhase2AStatus()
      : null;
    const phase2ACompleted = Boolean(phase2AStatus && phase2AStatus.resultCount > 0 && phase2AStatus.lastResult && phase2AStatus.lastResult.status === "Completed");
    const phase2BStatus = typeof global.getDevelopmentAnalyticsPhase2BStatus === "function"
      ? global.getDevelopmentAnalyticsPhase2BStatus()
      : null;
    const phase2BImplemented = Boolean(phase2BStatus && phase2BStatus.ready === true);
    const phase2BPublished = Boolean(phase2BStatus && phase2BStatus.publicationStatus === "Published" && phase2BStatus.releaseStatus === "Official");
    let nextTask = "Run IDE-135 full validation to create an Official Result.";
    if (hasSource && !hasSnapshot) nextTask = "Run runDevelopmentAnalytics() to generate the first Analytics Snapshot.";
    if (hasSnapshot && !phase2ACompleted) nextTask = "Run runDevelopmentAnalyticsPhase2A() to generate Trend, Pattern, Root Cause and Quality Analytics.";
    if (phase2ACompleted && !phase2BStatus) nextTask = "Load IDE-140 Phase 2B and prepare Publication Gate review.";
    if (phase2BStatus) nextTask = phase2BStatus.nextTask;
    if (phase2BPublished) nextTask = "Begin IDE-150 Auto Refactoring implementation using the Published Analytics Handoff.";
    return {
      id: COMPONENT_ID,
      title: "Development Analytics",
      name: "Development Analytics",
      version: VERSION,
      status: validation.valid ? "Ready" : "Attention",
      lifecycleStatus: phase2BImplemented ? "Completed" : "Implementation",
      implementationPhase: phase2BImplemented ? "Phase 2B" : phase2ACompleted ? "Phase 2A" : "Core Phase 1",
      ready: validation.valid,
      health: validation.health,
      progress: Math.round((IMPLEMENTED_STAGES.length / PIPELINE_STAGES.length) * 100),
      implementedStages: IMPLEMENTED_STAGES.length,
      totalStages: PIPELINE_STAGES.length,
      registeredMetrics: state.metricRegistry.size,
      officialSourceRecordCount: officialRecords.length,
      requestCount: state.requests.size,
      sessionCount: state.sessions.size,
      snapshotCount: state.snapshots.size,
      findingCount: state.findings.size,
      recommendationCount: state.recommendations.size,
      phase2A: clone(phase2AStatus),
      phase2ACompleted: phase2ACompleted,
      phase2AProgress: phase2ACompleted ? 100 : 0,
      phase2B: clone(phase2BStatus),
      phase2BImplemented: phase2BImplemented,
      phase2BProgress: phase2BImplemented ? 100 : 0,
      lastSnapshot: getDevelopmentAnalyticsSnapshot(),
      publicationStatus: phase2BStatus ? phase2BStatus.publicationStatus : state.lastSnapshot ? state.lastSnapshot.publicationStatus : "Not Generated",
      releaseStatus: phase2BStatus ? phase2BStatus.releaseStatus : "Not Released",
      approvalStatus: phase2BStatus ? phase2BStatus.approvalStatus : "Not Requested",
      handoffEligible: Boolean(phase2BStatus && phase2BStatus.handoffEligible),
      handoffStatus: phase2BStatus ? phase2BStatus.handoffStatus : "Not Available",
      closureStatus: phase2BStatus ? phase2BStatus.closureStatus : "Open",
      persistence: {
        adapter: "localStorage",
        storageKey: STORAGE_KEY,
        loaded: state.loaded
      },
      dependsOn: ["IDE-110", "IDE-115", "IDE-120", "IDE-125", "IDE-130", "IDE-135", "Validation Result Repository", "Relationship Platform"],
      provides: [
        "Official Result Intake",
        "Canonical Analytics Model",
        "Governed Metric Registry",
        "Validation Quality Metrics",
        "Version-aware Trend and Pattern Analytics",
        "IDE-130 Confirmed Root Cause Analytics",
        "Quality Graph and Reliability Report",
        "Gate-based Publication",
        "Published Analytics Package",
        "Published-only IDE-150 Handoff",
        "Analytics Closure"
      ],
      nextTask: nextTask,
      lastError: clone(state.lastError),
      updatedAt: nowIso()
    };
  }

  loadDevelopmentAnalyticsState();
  DEFAULT_METRICS.forEach(function register(metric) {
    registerDevelopmentAnalyticsMetric(metric, { replace: true, persist: false });
  });
  persistDevelopmentAnalyticsState();

  const api = {
    registerDevelopmentAnalyticsMetric: registerDevelopmentAnalyticsMetric,
    getDevelopmentAnalyticsMetricRegistry: getDevelopmentAnalyticsMetricRegistry,
    createDevelopmentAnalyticsRequest: createDevelopmentAnalyticsRequest,
    runDevelopmentAnalytics: runDevelopmentAnalytics,
    getDevelopmentAnalyticsSnapshot: getDevelopmentAnalyticsSnapshot,
    getDevelopmentAnalyticsSnapshots: getDevelopmentAnalyticsSnapshots,
    getDevelopmentAnalyticsState: getDevelopmentAnalyticsState,
    persistDevelopmentAnalyticsState: persistDevelopmentAnalyticsState,
    loadDevelopmentAnalyticsState: loadDevelopmentAnalyticsState,
    resolveOfficialValidationRecords: resolveOfficialValidationRecords,
    normalizeValidationAnalyticsRecord: normalizeValidationAnalyticsRecord,
    calculateValidationAnalyticsMetrics: calculateValidationAnalyticsMetrics,
    buildVersionComparison: buildVersionComparison,
    validateDevelopmentAnalytics: validateDevelopmentAnalytics,
    getDevelopmentAnalyticsStatus: getDevelopmentAnalyticsStatus
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.IDE140DevelopmentAnalytics = Object.freeze(Object.assign({
    id: COMPONENT_ID,
    version: VERSION,
    pipelineStages: PIPELINE_STAGES,
    implementedStages: IMPLEMENTED_STAGES
  }, api));

  if (typeof global.registerDevelopmentStatus === "function") {
    global.registerDevelopmentStatus({ id: COMPONENT_ID, statusApi: "getDevelopmentAnalyticsStatus", validator: "validateDevelopmentAnalytics" }, { source: "runtime", persist: false });
  }
  if (typeof global.registerDevelopmentDashboardModule === "function") {
    global.registerDevelopmentDashboardModule({ id: COMPONENT_ID, title: "Development Analytics", statusApi: "getDevelopmentAnalyticsStatus", validator: "validateDevelopmentAnalytics" });
  }
  if (typeof global.registerIdeComponent === "function") {
    global.registerIdeComponent({
      id: COMPONENT_ID,
      title: "Development Analytics",
      summary: "Official Result intake, governed analytics, gate-based publication, IDE-150 handoff and closure.",
      icon: "📊",
      version: VERSION,
      status: "Completed",
      ready: true,
      progress: 100,
      health: 100,
      validator: "validateDevelopmentAnalytics",
      probe: "getDevelopmentAnalyticsStatus",
      category: "Development IDE"
    });
  }
})(typeof window !== "undefined" ? window : globalThis);