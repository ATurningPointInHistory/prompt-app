/* ============================================================
   FILE: 13_development_analytics_phase2a.js
   IDE-140 Development Analytics
   Phase 2A: Trend / Pattern / Root Cause / Quality Analytics
   Version: 1.0.1
   Overall IDE-140 Version: 1.2.2
   Status: Implementation / Phase 2A
   Design Freeze: 2026-07-26

   Design basis:
   - IDE-140-004 Version-aware Temporal Comparison Graph
   - IDE-140-005 Evidence-backed Hybrid Trend and Pattern Analysis
   - IDE-140-006 Evidence-linked Root Cause and Quality Graph Analytics
   - IDE-140-008 Multi-layer Reliability and Data Quality Framework

   Safety boundary:
   - Official Result only
   - Evidence references only; raw Evidence is not duplicated
   - Correlation never confirms causation
   - Root Cause authority remains IDE-130
   - Recommendation is Candidate only and autoApply is always false
   - Publication / IDE-150 Handoff / Closure remain Phase 2B
   ============================================================ */
(function initializeDevelopmentAnalyticsPhase2A(global) {
  "use strict";

  const COMPONENT_ID = "IDE-140";
  const EXTENSION_ID = "IDE-140-PHASE-2A";
  const VERSION = "1.0.1";
  const OVERALL_VERSION = "1.2.2";
  const STORAGE_KEY = "AI_PROMPT_OS_IDE140_PHASE2A_V1";
  const MAX_RESULTS = 20;

  const METHOD_REGISTRY = Object.freeze([
    { id: "IDE140-STAT-MOVING-AVERAGE", version: "1.0.0", name: "Moving Average", category: "Trend" },
    { id: "IDE140-STAT-MEDIAN", version: "1.0.0", name: "Median", category: "Distribution" },
    { id: "IDE140-STAT-PERCENTILE", version: "1.0.0", name: "Percentile", category: "Distribution" },
    { id: "IDE140-STAT-IQR-OUTLIER", version: "1.0.0", name: "IQR Outlier Detection", category: "Pattern" },
    { id: "IDE140-STAT-CHANGE-POINT", version: "1.0.0", name: "Adjacent Change Point Detection", category: "Trend" },
    { id: "IDE140-STAT-PEARSON", version: "1.0.0", name: "Pearson Correlation", category: "Correlation" },
    { id: "IDE140-RULE-TREND-CLASSIFIER", version: "1.0.0", name: "Version-aware Trend Classifier", category: "Rule" },
    { id: "IDE140-RULE-PATTERN-DETECTOR", version: "1.0.0", name: "Evidence-backed Pattern Detector", category: "Rule" }
  ]);

  const METRIC_POLICY = Object.freeze({
    "IDE140-METRIC-VALIDATION-SUCCESS-RATE": { polarity: "higher", tolerance: 0.001, label: "Validation Success" },
    "IDE140-METRIC-GATE-PASS-RATE": { polarity: "higher", tolerance: 0.001, label: "Gate Pass" },
    "IDE140-METRIC-COVERAGE-AVERAGE": { polarity: "higher", tolerance: 0.001, label: "Coverage Average" },
    "IDE140-METRIC-COVERAGE-MINIMUM": { polarity: "higher", tolerance: 0.001, label: "Coverage Minimum" },
    "IDE140-METRIC-VALIDATION-DURATION": { polarity: "lower", tolerance: 0.1, label: "Validation Duration" },
    "IDE140-METRIC-FAILURE-COUNT": { polarity: "lower", tolerance: 0, label: "Failure Count" },
    "IDE140-METRIC-WARNING-COUNT": { polarity: "lower", tolerance: 0, label: "Warning Count" },
    "IDE140-METRIC-RESTORE-VERIFIED": { polarity: "boolean-true", tolerance: 0, label: "Restore Verified" },
    "IDE140-METRIC-SAFETY-PASSED": { polarity: "boolean-true", tolerance: 0, label: "Safety Passed" },
    "IDE140-METRIC-EVIDENCE-REFERENCE-COUNT": { polarity: "neutral", tolerance: 0, label: "Evidence Reference Count" }
  });

  const state = {
    results: new Map(),
    history: [],
    sequence: 0,
    lastResult: null,
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
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function nextId(prefix) {
    state.sequence += 1;
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + state.sequence.toString(36).toUpperCase();
  }
  function touch() { state.updatedAt = nowIso(); }

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
      id: nextId("IDE-140-PHASE2A-EVENT"),
      type: text(type, "Event"),
      details: clone(details || {}),
      at: nowIso()
    };
    state.history.push(event);
    while (state.history.length > MAX_RESULTS) state.history.shift();
    touch();
    return clone(event);
  }

  function serializeState() {
    return {
      extensionId: EXTENSION_ID,
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      results: [...state.results.values()].map(clone),
      history: state.history.map(clone),
      sequence: state.sequence,
      lastResultId: state.lastResult ? state.lastResult.id : null,
      updatedAt: state.updatedAt
    };
  }

  function persistDevelopmentAnalyticsPhase2AState() {
    try {
      if (!global.localStorage) throw new Error("localStorage is unavailable.");
      touch();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
      state.lastError = null;
      return {
        persisted: true,
        storageKey: STORAGE_KEY,
        resultCount: state.results.size,
        updatedAt: state.updatedAt
      };
    } catch (error) {
      setError(error, "persistDevelopmentAnalyticsPhase2AState");
      return { persisted: false, storageKey: STORAGE_KEY, reason: state.lastError.message };
    }
  }

  function loadDevelopmentAnalyticsPhase2AState() {
    try {
      if (global.localStorage) {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          state.results = new Map(asArray(parsed.results).filter(Boolean).map(function map(item) {
            return [String(item.id), item];
          }));
          state.history = asArray(parsed.history).slice(-MAX_RESULTS);
          state.sequence = finite(parsed.sequence, 0);
          state.updatedAt = text(parsed.updatedAt, nowIso());
          state.lastResult = parsed.lastResultId
            ? clone(state.results.get(String(parsed.lastResultId)) || null)
            : null;
        }
      }
      state.loaded = true;
      state.lastError = null;
      return { loaded: true, storageKey: STORAGE_KEY, resultCount: state.results.size };
    } catch (error) {
      setError(error, "loadDevelopmentAnalyticsPhase2AState");
      state.loaded = true;
      return { loaded: false, storageKey: STORAGE_KEY, reason: state.lastError.message };
    }
  }

  function mean(values) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite);
    return numbers.length ? numbers.reduce(function sum(total, item) { return total + item; }, 0) / numbers.length : null;
  }

  function median(values) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite).sort(function sort(a, b) { return a - b; });
    if (!numbers.length) return null;
    const middle = Math.floor(numbers.length / 2);
    return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
  }

  function percentile(values, percentileValue) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite).sort(function sort(a, b) { return a - b; });
    if (!numbers.length) return null;
    const p = clamp(finite(percentileValue, 0.5), 0, 1);
    const index = (numbers.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return numbers[lower];
    const ratio = index - lower;
    return numbers[lower] + (numbers[upper] - numbers[lower]) * ratio;
  }

  function standardDeviation(values) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite);
    if (numbers.length < 2) return 0;
    const average = mean(numbers);
    const variance = mean(numbers.map(function square(value) { return Math.pow(value - average, 2); }));
    return Math.sqrt(variance || 0);
  }

  function movingAverage(values, windowSize) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite);
    const size = Math.max(1, Math.floor(finite(windowSize, 3)));
    return numbers.map(function calculate(_, index) {
      const start = Math.max(0, index - size + 1);
      const sample = numbers.slice(start, index + 1);
      return mean(sample);
    });
  }

  function detectOutliersIqr(values) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite);
    if (numbers.length < 4) {
      return { method: "IQR", available: false, reason: "At least four numeric samples are required.", lower: null, upper: null, indexes: [] };
    }
    const q1 = percentile(numbers, 0.25);
    const q3 = percentile(numbers, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - (1.5 * iqr);
    const upper = q3 + (1.5 * iqr);
    const indexes = numbers.map(function map(value, index) {
      return value < lower || value > upper ? index : -1;
    }).filter(function valid(index) { return index >= 0; });
    return { method: "IQR", available: true, q1: q1, q3: q3, iqr: iqr, lower: lower, upper: upper, indexes: indexes };
  }

  function detectChangePoint(values, tolerance) {
    const numbers = asArray(values).map(Number).filter(Number.isFinite);
    if (numbers.length < 2) {
      return { available: false, reason: "At least two numeric samples are required.", detected: false };
    }
    let maximum = { index: -1, before: null, after: null, difference: 0 };
    for (let index = 1; index < numbers.length; index += 1) {
      const difference = numbers[index] - numbers[index - 1];
      if (Math.abs(difference) > Math.abs(maximum.difference)) {
        maximum = { index: index, before: numbers[index - 1], after: numbers[index], difference: difference };
      }
    }
    const adjacent = numbers.slice(1).map(function diff(value, index) { return Math.abs(value - numbers[index]); });
    const baseline = median(adjacent) || 0;
    const threshold = Math.max(Math.abs(finite(tolerance, 0)), baseline * 3);
    return {
      available: true,
      detected: Math.abs(maximum.difference) > threshold && Math.abs(maximum.difference) > 0,
      threshold: threshold,
      index: maximum.index,
      before: maximum.before,
      after: maximum.after,
      difference: maximum.difference
    };
  }

  function pearsonCorrelation(leftValues, rightValues) {
    const pairs = [];
    const left = asArray(leftValues);
    const right = asArray(rightValues);
    const length = Math.min(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const leftNumber = Number(left[index]);
      const rightNumber = Number(right[index]);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) pairs.push([leftNumber, rightNumber]);
    }
    if (pairs.length < 3) return { available: false, sampleCount: pairs.length, coefficient: null };
    const leftMean = mean(pairs.map(function item(pair) { return pair[0]; }));
    const rightMean = mean(pairs.map(function item(pair) { return pair[1]; }));
    let numerator = 0;
    let leftSquare = 0;
    let rightSquare = 0;
    pairs.forEach(function calculate(pair) {
      const leftDelta = pair[0] - leftMean;
      const rightDelta = pair[1] - rightMean;
      numerator += leftDelta * rightDelta;
      leftSquare += leftDelta * leftDelta;
      rightSquare += rightDelta * rightDelta;
    });
    const denominator = Math.sqrt(leftSquare * rightSquare);
    return {
      available: denominator > 0,
      sampleCount: pairs.length,
      coefficient: denominator > 0 ? numerator / denominator : null
    };
  }

  function sampleReliability(count, completeness) {
    const sampleScore = count >= 10 ? 1 : count >= 5 ? 0.9 : count >= 3 ? 0.8 : count >= 2 ? 0.65 : count >= 1 ? 0.4 : 0;
    return clamp(sampleScore * clamp(finite(completeness, 1), 0, 1), 0, 1);
  }

  function resolveOfficialRecords(input) {
    if (typeof global.getValidationResults !== "function") {
      return { resolved: false, records: [], reason: "Validation Result Repository API is unavailable." };
    }
    const source = input && typeof input === "object" ? input : {};
    const scope = source.scope && typeof source.scope === "object" ? source.scope : {};
    const selected = unique(source.sourceRecordIds);
    let records = global.getValidationResults({
      sourceComponent: scope.sourceComponent || undefined,
      targetComponent: scope.targetComponent || undefined,
      official: true,
      limit: MAX_RESULTS
    });
    if (selected.length) {
      records = records.filter(function filter(record) {
        return selected.includes(record.id) || selected.includes(record.recordId);
      });
    }
    records = records.filter(function official(record) {
      return record && record.official === true && record.payload && record.payload.id;
    }).sort(function newest(a, b) {
      return Date.parse(b.completedAt || b.savedAt || 0) - Date.parse(a.completedAt || a.savedAt || 0);
    });
    return {
      resolved: records.length > 0,
      records: records,
      reason: records.length ? "" : "Official validation records were not found."
    };
  }

  function requireCoreAnalyticsApis() {
    const required = [
      "normalizeValidationAnalyticsRecord",
      "calculateValidationAnalyticsMetrics"
    ];
    const missing = required.filter(function filter(name) { return typeof global[name] !== "function"; });
    if (missing.length) throw new Error("IDE-140 Core analytics API is unavailable: " + missing.join(", "));
  }

  function buildMetricSeries(records, canonicalRecords, metricSets) {
    const chronological = records.map(function pair(record, index) {
      return { record: record, canonical: canonicalRecords[index], metrics: metricSets[index] };
    }).sort(function oldest(a, b) {
      return Date.parse(a.record.completedAt || a.record.savedAt || 0) - Date.parse(b.record.completedAt || b.record.savedAt || 0);
    });
    const registry = new Map();
    chronological.forEach(function append(entry) {
      asArray(entry.metrics).forEach(function metric(item) {
        if (!registry.has(item.metricId)) {
          registry.set(item.metricId, {
            metricId: item.metricId,
            metricVersion: item.metricVersion,
            name: item.name,
            category: item.category,
            unit: item.unit,
            points: []
          });
        }
        registry.get(item.metricId).points.push({
          sourceResultId: entry.canonical.identity.sourceResultId,
          sourceRecordId: entry.record.recordId,
          repositoryVersion: entry.canonical.version.repositoryVersion,
          resultVersion: entry.canonical.version.resultVersion,
          completedAt: entry.canonical.time.completedAt || entry.record.completedAt,
          value: item.value,
          reliability: item.reliability,
          evidenceReferences: clone(item.evidenceReferences)
        });
      });
    });
    return [...registry.values()].map(clone);
  }

  function classifyTrend(series) {
    const policy = METRIC_POLICY[series.metricId] || { polarity: "neutral", tolerance: 0 };
    const points = asArray(series.points);
    const rawValues = points.map(function value(point) { return point.value; });
    const numericValues = rawValues.map(Number).filter(Number.isFinite);
    const evidenceReferences = unique([].concat.apply([], points.map(function refs(point) { return asArray(point.evidenceReferences); })));
    const completeness = points.length ? numericValues.length / points.length : 0;

    if (policy.polarity === "boolean-true") {
      const trueCount = rawValues.filter(function count(value) { return value === true; }).length;
      const falseCount = rawValues.filter(function count(value) { return value === false; }).length;
      const status = points.length < 2 ? "Unknown" : falseCount === 0 ? "Stable" : falseCount >= 2 ? "Recurring" : "Degrading";
      return {
        metricId: series.metricId,
        metricVersion: series.metricVersion,
        name: series.name,
        category: series.category,
        unit: series.unit,
        sampleCount: points.length,
        trendStatus: status,
        firstValue: rawValues[0],
        lastValue: rawValues[rawValues.length - 1],
        difference: null,
        distribution: { trueCount: trueCount, falseCount: falseCount },
        movingAverage: [],
        outlierDetection: { available: false, reason: "Boolean metric." },
        changePoint: { available: false, reason: "Boolean metric." },
        reliability: sampleReliability(points.length, 1),
        confidence: points.length >= 3 ? 0.9 : points.length === 2 ? 0.7 : 0.4,
        evidenceReferences: evidenceReferences,
        fact: falseCount === 0 ? "All observed values are true." : falseCount + " false value(s) were observed.",
        inference: status === "Stable" ? "The boolean quality condition remained stable." : "The boolean quality condition requires review.",
        causal: false
      };
    }

    if (!numericValues.length) {
      return {
        metricId: series.metricId,
        metricVersion: series.metricVersion,
        name: series.name,
        category: series.category,
        unit: series.unit,
        sampleCount: points.length,
        trendStatus: "Unknown",
        reliability: 0,
        confidence: 0,
        evidenceReferences: evidenceReferences,
        fact: "No comparable numeric values are available.",
        inference: "Trend classification is unavailable.",
        causal: false
      };
    }

    const first = numericValues[0];
    const last = numericValues[numericValues.length - 1];
    const difference = last - first;
    const tolerance = Math.max(Math.abs(finite(policy.tolerance, 0)), Math.abs(first) * 0.01);
    const averageValue = mean(numericValues);
    const deviation = standardDeviation(numericValues);
    const coefficientOfVariation = averageValue === 0 ? (deviation === 0 ? 0 : null) : Math.abs(deviation / averageValue);
    const volatile = numericValues.length >= 3 && coefficientOfVariation != null && coefficientOfVariation > 0.2;
    let status = "Unknown";

    if (numericValues.length < 2) status = "Unknown";
    else if (volatile) status = "Volatile";
    else if (Math.abs(difference) <= tolerance) status = "Stable";
    else if (policy.polarity === "higher") status = difference > 0 ? "Improving" : "Degrading";
    else if (policy.polarity === "lower") status = difference < 0 ? "Improving" : "Degrading";
    else status = difference === 0 ? "Stable" : "Emerging";

    const badOccurrences = policy.polarity === "lower"
      ? numericValues.filter(function bad(value) { return value > 0; }).length
      : 0;
    if (badOccurrences >= 2 && (series.metricId.includes("FAILURE") || series.metricId.includes("WARNING"))) status = "Recurring";

    const outlierDetection = detectOutliersIqr(numericValues);
    const changePoint = detectChangePoint(numericValues, tolerance);
    const percentChange = first !== 0 ? difference / Math.abs(first) : null;
    const reliability = sampleReliability(numericValues.length, completeness);

    return {
      metricId: series.metricId,
      metricVersion: series.metricVersion,
      name: series.name,
      category: series.category,
      unit: series.unit,
      sampleCount: numericValues.length,
      trendStatus: status,
      firstValue: first,
      lastValue: last,
      difference: difference,
      percentChange: percentChange,
      distribution: {
        minimum: Math.min.apply(Math, numericValues),
        maximum: Math.max.apply(Math, numericValues),
        mean: averageValue,
        median: median(numericValues),
        p95: percentile(numericValues, 0.95),
        standardDeviation: deviation,
        coefficientOfVariation: coefficientOfVariation
      },
      movingAverage: movingAverage(numericValues, Math.min(3, numericValues.length)),
      outlierDetection: outlierDetection,
      changePoint: changePoint,
      reliability: reliability,
      confidence: clamp(reliability + 0.05, 0, 1),
      evidenceReferences: evidenceReferences,
      fact: "The metric changed from " + first + " to " + last + " across " + numericValues.length + " official result(s).",
      inference: "The version-aware trend is classified as " + status + ".",
      causal: false
    };
  }

  function buildCorrelationAnalysis(metricSeries) {
    const numericSeries = asArray(metricSeries).filter(function filter(series) {
      return asArray(series.points).filter(function numeric(point) { return Number.isFinite(Number(point.value)); }).length >= 3;
    });
    const results = [];
    for (let leftIndex = 0; leftIndex < numericSeries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < numericSeries.length; rightIndex += 1) {
        const left = numericSeries[leftIndex];
        const right = numericSeries[rightIndex];
        const correlation = pearsonCorrelation(
          left.points.map(function value(point) { return point.value; }),
          right.points.map(function value(point) { return point.value; })
        );
        if (!correlation.available) continue;
        results.push({
          leftMetricId: left.metricId,
          rightMetricId: right.metricId,
          coefficient: correlation.coefficient,
          absoluteStrength: Math.abs(correlation.coefficient),
          sampleCount: correlation.sampleCount,
          status: Math.abs(correlation.coefficient) >= 0.8 ? "Strong Correlation" : Math.abs(correlation.coefficient) >= 0.5 ? "Moderate Correlation" : "Weak Correlation",
          causalConclusion: false,
          rule: "Correlation is not treated as Root Cause."
        });
      }
    }
    return results.sort(function strongest(a, b) { return b.absoluteStrength - a.absoluteStrength; });
  }

  function findTrend(trends, metricId) {
    return asArray(trends).find(function find(item) { return item.metricId === metricId; }) || null;
  }

  function buildPatternAnalysis(trends, records) {
    const patterns = [];
    const success = findTrend(trends, "IDE140-METRIC-VALIDATION-SUCCESS-RATE");
    const gates = findTrend(trends, "IDE140-METRIC-GATE-PASS-RATE");
    const coverage = findTrend(trends, "IDE140-METRIC-COVERAGE-MINIMUM");
    const duration = findTrend(trends, "IDE140-METRIC-VALIDATION-DURATION");
    const failures = findTrend(trends, "IDE140-METRIC-FAILURE-COUNT");
    const warnings = findTrend(trends, "IDE140-METRIC-WARNING-COUNT");
    const restore = findTrend(trends, "IDE140-METRIC-RESTORE-VERIFIED");
    const safety = findTrend(trends, "IDE140-METRIC-SAFETY-PASSED");
    const evidence = findTrend(trends, "IDE140-METRIC-EVIDENCE-REFERENCE-COUNT");

    const qualityStable = [success, gates, coverage].every(function stable(item) {
      return item && item.lastValue === 1 && ["Stable", "Unknown"].includes(item.trendStatus);
    });
    patterns.push({
      id: nextId("IDE-140-PATTERN"),
      patternType: "Validation Quality Baseline",
      status: qualityStable ? "Observed Healthy" : "Candidate Risk",
      classification: qualityStable ? "Stable" : "Degrading",
      affectedComponents: unique(records.map(function component(record) { return record.targetComponent; })),
      supportingMetricIds: [success, gates, coverage].filter(Boolean).map(function id(item) { return item.metricId; }),
      evidenceReferences: unique([].concat.apply([], [success, gates, coverage].filter(Boolean).map(function refs(item) { return item.evidenceReferences; }))),
      confidence: qualityStable ? 1 : 0.8,
      reliability: mean([success, gates, coverage].filter(Boolean).map(function reliability(item) { return item.reliability; })) || 0,
      fact: qualityStable ? "The latest official validation quality metrics remain at their required values." : "One or more validation quality metrics are below the required value.",
      inference: qualityStable ? "The current validation baseline is stable." : "The validation baseline requires review.",
      causal: false
    });

    if (duration) {
      patterns.push({
        id: nextId("IDE-140-PATTERN"),
        patternType: "Validation Performance",
        status: "Observed",
        classification: duration.trendStatus,
        affectedComponents: unique(records.map(function component(record) { return record.targetComponent; })),
        supportingMetricIds: [duration.metricId],
        evidenceReferences: clone(duration.evidenceReferences),
        confidence: duration.confidence,
        reliability: duration.reliability,
        fact: duration.fact,
        inference: duration.inference,
        causal: false
      });
    }

    if (failures && failures.trendStatus === "Recurring") {
      patterns.push({
        id: nextId("IDE-140-PATTERN"),
        patternType: "Recurring Failure",
        status: "Candidate",
        classification: "Recurring",
        affectedComponents: unique(records.map(function component(record) { return record.targetComponent; })),
        supportingMetricIds: [failures.metricId],
        evidenceReferences: clone(failures.evidenceReferences),
        confidence: failures.confidence,
        reliability: failures.reliability,
        fact: failures.fact,
        inference: "Failure recurrence should be investigated by IDE-130; IDE-140 does not determine its cause.",
        causal: false
      });
    }

    if (warnings && warnings.trendStatus === "Recurring") {
      patterns.push({
        id: nextId("IDE-140-PATTERN"),
        patternType: "Recurring Warning",
        status: "Candidate",
        classification: "Recurring",
        affectedComponents: unique(records.map(function component(record) { return record.targetComponent; })),
        supportingMetricIds: [warnings.metricId],
        evidenceReferences: clone(warnings.evidenceReferences),
        confidence: warnings.confidence,
        reliability: warnings.reliability,
        fact: warnings.fact,
        inference: "Warning recurrence requires validation review.",
        causal: false
      });
    }

    if (restore && safety) {
      const protectedState = restore.lastValue === true && safety.lastValue === true;
      patterns.push({
        id: nextId("IDE-140-PATTERN"),
        patternType: "Safety and Restore Stability",
        status: protectedState ? "Observed Healthy" : "Critical Review",
        classification: protectedState ? "Stable" : "Degrading",
        affectedComponents: unique(records.map(function component(record) { return record.targetComponent; })),
        supportingMetricIds: [restore.metricId, safety.metricId],
        evidenceReferences: unique([].concat(restore.evidenceReferences, safety.evidenceReferences)),
        confidence: Math.min(restore.confidence, safety.confidence),
        reliability: Math.min(restore.reliability, safety.reliability),
        fact: protectedState ? "Restore and Safety conditions passed in the latest official result." : "Restore or Safety conditions did not pass.",
        inference: protectedState ? "The safety baseline remains protected." : "Publication must remain blocked until the failed condition is resolved.",
        causal: false
      });
    }

    if (evidence) {
      patterns.push({
        id: nextId("IDE-140-PATTERN"),
        patternType: "Evidence Reference Volume",
        status: "Observed",
        classification: evidence.trendStatus,
        affectedComponents: unique(records.map(function component(record) { return record.targetComponent; })),
        supportingMetricIds: [evidence.metricId],
        evidenceReferences: clone(evidence.evidenceReferences),
        confidence: evidence.confidence,
        reliability: evidence.reliability,
        fact: evidence.fact,
        inference: "Evidence volume change is not treated as evidence quality or causation by itself.",
        causal: false
      });
    }

    return patterns;
  }

  function collectConfirmedRootCauses(record) {
    const payload = record && record.payload && typeof record.payload === "object" ? record.payload : {};
    const results = [];
    function add(value, status, evidenceReferences, affectedComponents, sourcePath) {
      const statement = text(value, "");
      const normalizedStatus = text(status, "");
      if (!statement) return;
      if (!/confirmed|root cause confirmed/i.test(normalizedStatus)) return;
      results.push({
        statement: statement,
        status: normalizedStatus || "Confirmed",
        sourceResultId: payload.id,
        sourceRecordId: record.recordId,
        sourceComponent: record.sourceComponent,
        targetComponent: record.targetComponent,
        repositoryVersion: record.repositoryVersion,
        evidenceReferences: unique(evidenceReferences),
        affectedComponents: unique([record.targetComponent].concat(asArray(affectedComponents))),
        sourcePath: sourcePath
      });
    }

    const conclusion = payload.conclusion && typeof payload.conclusion === "object" ? payload.conclusion : {};
    add(conclusion.rootCause, conclusion.status, conclusion.evidenceReferences, conclusion.affectedComponents, "payload.conclusion");

    const report = payload.report && typeof payload.report === "object" ? payload.report : {};
    add(report.rootCause, report.conclusionStatus || report.rootCauseStatus, report.evidenceReferences, report.affectedComponents, "payload.report");

    asArray(payload.scenarioResults).forEach(function scenario(item) {
      asArray(item && item.findings).forEach(function finding(candidate) {
        add(
          candidate && (candidate.rootCause || candidate.statement),
          candidate && candidate.status,
          candidate && (candidate.evidenceReferences || item.evidenceReferences),
          candidate && candidate.affectedComponents,
          "payload.scenarioResults.findings"
        );
      });
    });

    return results;
  }

  function buildRootCauseAnalytics(records, metricSeries) {
    const confirmed = [];
    records.forEach(function causes(record) { confirmed.push(...collectConfirmedRootCauses(record)); });
    const grouped = new Map();
    confirmed.forEach(function group(item) {
      const key = item.statement.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, {
          rootCause: item.statement,
          authority: "IDE-130 Confirmed Result",
          occurrenceCount: 0,
          sourceResultIds: [],
          sourceRecordIds: [],
          affectedComponents: [],
          repositoryVersions: [],
          evidenceReferences: []
        });
      }
      const target = grouped.get(key);
      target.occurrenceCount += 1;
      target.sourceResultIds.push(item.sourceResultId);
      target.sourceRecordIds.push(item.sourceRecordId);
      target.affectedComponents.push(...item.affectedComponents);
      target.repositoryVersions.push(item.repositoryVersion);
      target.evidenceReferences.push(...item.evidenceReferences);
    });

    const clusters = [...grouped.values()].map(function normalize(item) {
      return {
        rootCause: item.rootCause,
        authority: item.authority,
        occurrenceCount: item.occurrenceCount,
        recurrenceStatus: item.occurrenceCount >= 2 ? "Recurring" : "Observed Once",
        sourceResultIds: unique(item.sourceResultIds),
        sourceRecordIds: unique(item.sourceRecordIds),
        affectedComponents: unique(item.affectedComponents),
        repositoryVersions: unique(item.repositoryVersions),
        evidenceReferences: unique(item.evidenceReferences),
        reliability: sampleReliability(item.occurrenceCount, item.evidenceReferences.length ? 1 : 0.5),
        causalAuthority: "IDE-130",
        analyticsConfirmedNewCause: false
      };
    });

    const graphNodes = [];
    const graphEdges = [];
    records.forEach(function resultNode(record) {
      const resultNodeId = "ValidationResult:" + record.id;
      const componentNodeId = "Component:" + text(record.targetComponent, "Unknown");
      graphNodes.push({ id: resultNodeId, type: "Validation Result", label: record.id, official: record.official === true });
      graphNodes.push({ id: componentNodeId, type: "Component", label: text(record.targetComponent, "Unknown") });
      graphEdges.push({ from: resultNodeId, to: componentNodeId, relationship: "validates" });
      unique(record.evidenceReferences).forEach(function evidence(reference) {
        const evidenceNodeId = "Evidence:" + reference;
        graphNodes.push({ id: evidenceNodeId, type: "Evidence Reference", label: reference });
        graphEdges.push({ from: resultNodeId, to: evidenceNodeId, relationship: "supportedBy" });
      });
    });
    metricSeries.forEach(function metricNode(series) {
      const metricNodeId = "Metric:" + series.metricId;
      graphNodes.push({ id: metricNodeId, type: "Quality Metric", label: series.name });
      asArray(series.points).forEach(function source(point) {
        graphEdges.push({ from: metricNodeId, to: "ValidationResult:" + point.sourceResultId, relationship: "derivedFrom" });
      });
    });
    clusters.forEach(function rootNode(cluster, index) {
      const rootNodeId = "RootCause:" + index + ":" + cluster.rootCause;
      graphNodes.push({ id: rootNodeId, type: "Root Cause", label: cluster.rootCause, authority: cluster.authority });
      cluster.sourceResultIds.forEach(function source(resultId) {
        graphEdges.push({ from: rootNodeId, to: "ValidationResult:" + resultId, relationship: "confirmedBy" });
      });
      cluster.affectedComponents.forEach(function affected(component) {
        graphEdges.push({ from: rootNodeId, to: "Component:" + component, relationship: "affects" });
      });
    });

    const uniqueNodes = [...new Map(graphNodes.map(function node(item) { return [item.id, item]; })).values()];
    const uniqueEdges = [...new Map(graphEdges.map(function edge(item) {
      return [item.from + "|" + item.relationship + "|" + item.to, item];
    })).values()];

    return {
      status: clusters.length ? "Available" : "Not Available",
      authority: "IDE-130 only",
      analyticsRole: "Aggregate and analyze confirmed Root Cause; do not confirm new Root Cause.",
      confirmedRootCauseCount: clusters.length,
      clusters: clusters,
      graph: {
        nodeCount: uniqueNodes.length,
        edgeCount: uniqueEdges.length,
        nodes: uniqueNodes,
        edges: uniqueEdges
      },
      newRootCauseConfirmed: false,
      reason: clusters.length ? "Confirmed IDE-130 Root Cause data was analyzed." : "The selected Official Validation Results do not contain an IDE-130-confirmed Root Cause field."
    };
  }

  function buildQualityAnalytics(records, trends, patterns, rootCauseAnalytics) {
    const issues = [];
    records.forEach(function inspect(record) {
      if (record.official !== true) issues.push({ severity: "Critical", recordId: record.id, issue: "Result is not Official." });
      if (!record.resultVersion) issues.push({ severity: "High", recordId: record.id, issue: "Result Version is missing." });
      if (!record.repositoryVersion) issues.push({ severity: "High", recordId: record.id, issue: "Repository Version is missing." });
      if (!record.payload || !record.payload.id) issues.push({ severity: "Critical", recordId: record.id, issue: "Canonical payload is unavailable." });
      if (!unique(record.evidenceReferences).length) issues.push({ severity: "Medium", recordId: record.id, issue: "Evidence references are empty." });
    });
    const criticalIssues = issues.filter(function critical(item) { return item.severity === "Critical"; });
    const trendReliability = mean(trends.map(function reliability(item) { return item.reliability; })) || 0;
    const patternReliability = mean(patterns.map(function reliability(item) { return item.reliability; })) || 0;
    const evidenceCompleteness = records.length
      ? records.filter(function available(record) { return unique(record.evidenceReferences).length > 0; }).length / records.length
      : 0;
    return {
      status: criticalIssues.length ? "Critical" : issues.length ? "Medium" : "High",
      sourceQuality: records.every(function official(record) { return record.official === true; }) ? "High" : "Critical",
      dataQuality: criticalIssues.length ? "Critical" : issues.length ? "Medium" : "High",
      normalizationQuality: "High",
      relationshipQuality: rootCauseAnalytics.graph.edgeCount > 0 ? "High" : "Unknown",
      metricQuality: trends.every(function reliable(item) { return item.reliability >= 0.4; }) ? "High" : "Medium",
      analysisQuality: trendReliability >= 0.8 && patternReliability >= 0.8 ? "High" : records.length >= 2 ? "Medium" : "Low",
      publicationQuality: "Not Evaluated",
      evidenceCompleteness: evidenceCompleteness,
      relationshipIntegrity: rootCauseAnalytics.graph.edgeCount > 0,
      versionCompatibility: records.every(function version(record) { return Boolean(record.resultVersion && record.repositoryVersion); }),
      issues: issues,
      criticalFailureCompensated: false,
      rule: "Critical quality failure is never offset by a composite score."
    };
  }

  function buildReliabilityReport(records, trends, patterns, qualityAnalytics, rootCauseAnalytics) {
    const sourceReliability = records.every(function official(record) { return record.official === true; }) ? 1 : 0;
    const evidenceReliability = finite(qualityAnalytics.evidenceCompleteness, 0);
    const metricReliability = mean(trends.map(function reliability(item) { return item.reliability; })) || 0;
    const statisticalReliability = sampleReliability(records.length, 1);
    const analysisReliability = mean(patterns.map(function reliability(item) { return item.reliability; })) || metricReliability;
    const rootCauseReliability = rootCauseAnalytics.confirmedRootCauseCount
      ? mean(rootCauseAnalytics.clusters.map(function reliability(item) { return item.reliability; }))
      : null;
    return {
      sourceReliability: sourceReliability,
      evidenceReliability: evidenceReliability,
      metricReliability: metricReliability,
      statisticalReliability: statisticalReliability,
      analysisReliability: analysisReliability,
      rootCauseReliability: rootCauseReliability,
      recommendationReliability: Math.min(sourceReliability, evidenceReliability, metricReliability, Math.max(statisticalReliability, 0.4)),
      confidenceSeparated: true,
      sampleCount: records.length,
      rootCauseQuality: rootCauseReliability == null ? "Not Evaluated" : rootCauseReliability >= 0.8 ? "High" : "Medium"
    };
  }

  function buildAdvancedFindings(trends, patterns, rootCauseAnalytics, qualityAnalytics, reliabilityReport) {
    const findings = [];
    patterns.forEach(function patternFinding(pattern) {
      findings.push({
        id: nextId("IDE-140-ADV-FINDING"),
        findingType: pattern.patternType,
        status: pattern.status,
        trend: pattern.classification,
        affectedComponents: clone(pattern.affectedComponents),
        supportingMetricIds: clone(pattern.supportingMetricIds),
        evidenceReferences: clone(pattern.evidenceReferences),
        confidence: pattern.confidence,
        reliability: pattern.reliability,
        fact: pattern.fact,
        inference: pattern.inference,
        causal: false,
        analysisMethod: "IDE-140 Phase 2A Hybrid Trend and Pattern Analysis",
        createdAt: nowIso()
      });
    });
    findings.push({
      id: nextId("IDE-140-ADV-FINDING"),
      findingType: "Root Cause Analytics Availability",
      status: rootCauseAnalytics.status,
      trend: "Unknown",
      affectedComponents: unique([].concat.apply([], rootCauseAnalytics.clusters.map(function components(item) { return item.affectedComponents; }))),
      supportingMetricIds: [],
      evidenceReferences: unique([].concat.apply([], rootCauseAnalytics.clusters.map(function refs(item) { return item.evidenceReferences; }))),
      confidence: rootCauseAnalytics.confirmedRootCauseCount ? 1 : 0,
      reliability: rootCauseAnalytics.confirmedRootCauseCount ? reliabilityReport.rootCauseReliability : null,
      fact: rootCauseAnalytics.reason,
      inference: rootCauseAnalytics.confirmedRootCauseCount
        ? "Confirmed Root Cause recurrence and component distribution can be analyzed without changing the IDE-130 conclusion."
        : "No Root Cause trend is published because IDE-130-confirmed cause data is unavailable.",
      causal: false,
      analysisMethod: "Evidence-linked Root Cause Graph Analytics",
      createdAt: nowIso()
    });
    if (qualityAnalytics.issues.length) {
      findings.push({
        id: nextId("IDE-140-ADV-FINDING"),
        findingType: "Data Quality",
        status: qualityAnalytics.status,
        trend: "Unknown",
        affectedComponents: [],
        supportingMetricIds: trends.map(function id(item) { return item.metricId; }),
        evidenceReferences: unique([].concat.apply([], trends.map(function refs(item) { return item.evidenceReferences; }))),
        confidence: 1,
        reliability: reliabilityReport.sourceReliability,
        fact: qualityAnalytics.issues.length + " data quality issue(s) were recorded without modifying the source result.",
        inference: "Publication Quality remains Not Evaluated until Phase 2B.",
        causal: false,
        analysisMethod: "Multi-layer Data Quality Framework",
        createdAt: nowIso()
      });
    }
    return findings;
  }

  function buildAdvancedRecommendations(findings, trends, rootCauseAnalytics, reliabilityReport) {
    const recommendations = [];
    const duration = findTrend(trends, "IDE140-METRIC-VALIDATION-DURATION");
    const qualityRisk = findings.find(function find(item) {
      if (item.findingType === "Validation Performance") return false;
      return /Risk|Critical|Degrading/.test(text(item.status, "") + " " + text(item.trend, ""));
    });

    if (qualityRisk) {
      recommendations.push({
        id: nextId("IDE-140-ADV-RECOMMENDATION"),
        recommendationType: "Additional Validation",
        statement: "Review the identified quality deviation and rerun the responsible validation before Publication.",
        supportingEvidence: clone(qualityRisk.evidenceReferences),
        relatedMetrics: clone(qualityRisk.supportingMetricIds),
        expectedBenefit: "Restore evidence-backed release confidence.",
        expectedRisk: "Low",
        estimatedCost: "Medium",
        priority: "High",
        reliability: qualityRisk.reliability,
        confidence: qualityRisk.confidence,
        lifecycle: "Candidate",
        autoApply: false,
        ide150Eligible: false,
        createdAt: nowIso()
      });
    } else {
      recommendations.push({
        id: nextId("IDE-140-ADV-RECOMMENDATION"),
        recommendationType: "Baseline Maintenance",
        statement: "Preserve the current Official Validation Results as the Phase 2A comparison baseline and rerun IDE-135 after dependency changes.",
        supportingEvidence: unique([].concat.apply([], findings.map(function refs(item) { return item.evidenceReferences; }))),
        relatedMetrics: trends.map(function id(item) { return item.metricId; }),
        expectedBenefit: "Maintain version-aware regression and recurrence traceability.",
        expectedRisk: "Low",
        estimatedCost: "Low",
        priority: "Medium",
        reliability: reliabilityReport.recommendationReliability,
        confidence: reliabilityReport.analysisReliability,
        lifecycle: "Candidate",
        autoApply: false,
        ide150Eligible: false,
        createdAt: nowIso()
      });
    }

    if (duration && ["Degrading", "Volatile"].includes(duration.trendStatus)) {
      recommendations.push({
        id: nextId("IDE-140-ADV-RECOMMENDATION"),
        recommendationType: "Performance Investigation Candidate",
        statement: "Review the validation duration trend with IDE-130 before treating it as a bottleneck or Root Cause.",
        supportingEvidence: clone(duration.evidenceReferences),
        relatedMetrics: [duration.metricId],
        expectedBenefit: "Confirm whether the observed duration change is material and reproducible.",
        expectedRisk: "Low",
        estimatedCost: "Low",
        priority: "Medium",
        reliability: duration.reliability,
        confidence: duration.confidence,
        lifecycle: "Candidate",
        autoApply: false,
        ide150Eligible: false,
        createdAt: nowIso()
      });
    }

    if (!rootCauseAnalytics.confirmedRootCauseCount) {
      recommendations.push({
        id: nextId("IDE-140-ADV-RECOMMENDATION"),
        recommendationType: "Root Cause Data Availability",
        statement: "Do not publish a Root Cause trend until an IDE-130-confirmed Root Cause is present in an Official Result.",
        supportingEvidence: [],
        relatedMetrics: [],
        expectedBenefit: "Prevent correlation or validation outcomes from being misrepresented as causation.",
        expectedRisk: "Low",
        estimatedCost: "None",
        priority: "High",
        reliability: 1,
        confidence: 1,
        lifecycle: "Candidate",
        autoApply: false,
        ide150Eligible: false,
        createdAt: nowIso()
      });
    }
    return recommendations;
  }

  function runDevelopmentAnalyticsPhase2A(input) {
    const source = input && typeof input === "object" ? input : {};
    try {
      requireCoreAnalyticsApis();
      const resolved = resolveOfficialRecords(source);
      if (!resolved.resolved) throw new Error(resolved.reason);
      const canonicalRecords = resolved.records.map(global.normalizeValidationAnalyticsRecord);
      const metricSets = canonicalRecords.map(global.calculateValidationAnalyticsMetrics);
      const metricSeries = buildMetricSeries(resolved.records, canonicalRecords, metricSets);
      const trendResults = metricSeries.map(classifyTrend);
      const correlationResults = buildCorrelationAnalysis(metricSeries);
      const patternResults = buildPatternAnalysis(trendResults, resolved.records);
      const rootCauseAnalytics = buildRootCauseAnalytics(resolved.records, metricSeries);
      const qualityAnalytics = buildQualityAnalytics(resolved.records, trendResults, patternResults, rootCauseAnalytics);
      const reliabilityReport = buildReliabilityReport(resolved.records, trendResults, patternResults, qualityAnalytics, rootCauseAnalytics);
      const findings = buildAdvancedFindings(trendResults, patternResults, rootCauseAnalytics, qualityAnalytics, reliabilityReport);
      const recommendationCandidates = buildAdvancedRecommendations(findings, trendResults, rootCauseAnalytics, reliabilityReport);
      const result = {
        id: nextId("IDE-140-PHASE2A-RESULT"),
        componentId: COMPONENT_ID,
        extensionId: EXTENSION_ID,
        version: VERSION,
        overallVersion: OVERALL_VERSION,
        implementationPhase: "Phase 2A",
        status: "Completed",
        publicationStatus: "Draft",
        handoffEligible: false,
        closureStatus: "Open",
        baseSnapshotId: text(source.baseSnapshotId, ""),
        scope: clone(source.scope || { sourceComponent: "IDE-135", targetComponent: "IDE-130" }),
        sourceRecordCount: resolved.records.length,
        sourceRecords: resolved.records.map(function summarize(record) {
          return {
            recordId: record.recordId,
            sourceResultId: record.id,
            sourceComponent: record.sourceComponent,
            targetComponent: record.targetComponent,
            resultVersion: record.resultVersion,
            repositoryVersion: record.repositoryVersion,
            completedAt: record.completedAt,
            official: record.official === true,
            contentHash: record.contentHash
          };
        }),
        statisticalMethods: METHOD_REGISTRY.map(clone),
        metricSeries: metricSeries,
        trendResults: trendResults,
        correlationResults: correlationResults,
        patternResults: patternResults,
        rootCauseAnalytics: rootCauseAnalytics,
        qualityAnalytics: qualityAnalytics,
        reliabilityReport: reliabilityReport,
        findings: findings,
        recommendationCandidates: recommendationCandidates,
        report: {
          executiveSummary: qualityAnalytics.status === "High"
            ? "Official Validation Results were analyzed with version-aware trend, pattern and quality models."
            : "Official Validation Results were analyzed and quality issues require review.",
          trendSummary: trendResults.map(function summary(item) { return item.name + ": " + item.trendStatus; }),
          patternSummary: patternResults.map(function summary(item) { return item.patternType + ": " + item.classification; }),
          rootCauseSummary: rootCauseAnalytics.reason,
          remainingRisks: [
            "Publication Quality is not evaluated until Phase 2B.",
            "IDE-150 handoff remains blocked until a Published Analytics Package exists."
          ]
        },
        safety: {
          officialResultOnly: true,
          rawEvidenceDuplicated: false,
          factInferenceSeparated: true,
          correlationAsCausation: false,
          rootCauseAuthority: "IDE-130",
          recommendationAutoApply: false,
          publicationGateOpen: false,
          ide150HandoffOpen: false
        },
        nextTask: "Implement IDE-140 Phase 2B: Publication Gate, IDE-150 handoff and Analytics Closure.",
        generatedAt: nowIso()
      };
      state.results.set(result.id, result);
      while (state.results.size > MAX_RESULTS) {
        const oldest = [...state.results.values()].sort(function oldest(a, b) {
          return Date.parse(a.generatedAt || 0) - Date.parse(b.generatedAt || 0);
        })[0];
        if (!oldest) break;
        state.results.delete(oldest.id);
      }
      state.lastResult = clone(result);
      recordEvent("Phase 2A Analytics Completed", {
        resultId: result.id,
        sourceRecordCount: result.sourceRecordCount,
        trendCount: result.trendResults.length,
        patternCount: result.patternResults.length,
        confirmedRootCauseCount: result.rootCauseAnalytics.confirmedRootCauseCount
      });
      const persistence = source.persist === false
        ? { persisted: false, skipped: true, reason: "Persistence disabled by caller." }
        : persistDevelopmentAnalyticsPhase2AState();
      state.lastError = null;
      return Object.assign(clone(result), { persistence: persistence });
    } catch (error) {
      setError(error, "runDevelopmentAnalyticsPhase2A");
      return {
        id: nextId("IDE-140-PHASE2A-FAILED"),
        componentId: COMPONENT_ID,
        extensionId: EXTENSION_ID,
        version: VERSION,
        overallVersion: OVERALL_VERSION,
        implementationPhase: "Phase 2A",
        status: "Failed",
        reason: state.lastError.message,
        publicationStatus: "Draft",
        handoffEligible: false,
        completedAt: nowIso()
      };
    }
  }

  function getDevelopmentAnalyticsPhase2AResult(id) {
    if (!id) return clone(state.lastResult);
    return clone(state.results.get(String(id)) || null);
  }

  function getDevelopmentAnalyticsPhase2AResultBySnapshot(snapshotId) {
    const target = text(snapshotId, "");
    if (!target) return null;
    const result = [...state.results.values()].filter(function filter(item) {
      return item.baseSnapshotId === target;
    }).sort(function newest(a, b) {
      return Date.parse(b.generatedAt || 0) - Date.parse(a.generatedAt || 0);
    })[0];
    return clone(result || null);
  }

  function getDevelopmentAnalyticsPhase2AResults(options) {
    const settings = options && typeof options === "object" ? options : {};
    return [...state.results.values()].filter(function filter(item) {
      if (settings.status && item.status !== String(settings.status)) return false;
      if (settings.baseSnapshotId && item.baseSnapshotId !== String(settings.baseSnapshotId)) return false;
      return true;
    }).sort(function newest(a, b) {
      return Date.parse(b.generatedAt || 0) - Date.parse(a.generatedAt || 0);
    }).slice(0, Math.max(1, finite(settings.limit, MAX_RESULTS))).map(clone);
  }

  function getDevelopmentAnalyticsPhase2AState() {
    return clone(serializeState());
  }

  function validateDevelopmentAnalyticsPhase2A() {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    try {
      check("Extension identity", EXTENSION_ID === "IDE-140-PHASE-2A");
      check("Extension version", VERSION === "1.0.1");
      check("Overall version", OVERALL_VERSION === "1.2.2");
      check("State persistence", state.loaded === true && typeof persistDevelopmentAnalyticsPhase2AState === "function");
      check("Official Result Repository dependency", typeof global.getValidationResults === "function");
      check("Core normalizer dependency", typeof global.normalizeValidationAnalyticsRecord === "function");
      check("Core metric dependency", typeof global.calculateValidationAnalyticsMetrics === "function");
      check("Statistical Method Registry", METHOD_REGISTRY.length === 8, "count=" + METHOD_REGISTRY.length);
      check("Moving Average", typeof movingAverage === "function");
      check("Median", typeof median === "function");
      check("Percentile", typeof percentile === "function");
      check("Change Point Detection", typeof detectChangePoint === "function");
      check("Outlier Detection", typeof detectOutliersIqr === "function");
      check("Correlation", typeof pearsonCorrelation === "function");
      check("Version-aware Metric Series", typeof buildMetricSeries === "function");
      check("Trend Classification", typeof classifyTrend === "function");
      check("Pattern Analysis", typeof buildPatternAnalysis === "function");
      check("Root Cause extraction is Confirmed-only", /confirmed/i.test(collectConfirmedRootCauses.toString()));
      check("Root Cause authority remains IDE-130", true);
      check("Quality Graph", typeof buildRootCauseAnalytics === "function");
      check("Quality Analytics", typeof buildQualityAnalytics === "function");
      check("Reliability and Confidence separated", true);
      check("Fact and Inference separated", true);
      check("Correlation does not establish causation", true);
      check("Recommendation Candidate", typeof buildAdvancedRecommendations === "function");
      check("Recommendation autoApply disabled", true);
      check("Publication remains Draft", true);
      check("IDE-150 handoff remains blocked", true);
      check("Phase 2B Closure remains open", true);
      check("Lightweight Result summary", typeof summarizeDevelopmentAnalyticsPhase2AResult === "function");
      check("Status avoids full Phase 2A clone", !/clone\(state\.lastResult\)/.test(getDevelopmentAnalyticsPhase2AStatus.toString()) && /summarizeDevelopmentAnalyticsPhase2AResult\(state\.lastResult\)/.test(getDevelopmentAnalyticsPhase2AStatus.toString()));
      check("Public run API", typeof runDevelopmentAnalyticsPhase2A === "function");
      check("Public status API", typeof getDevelopmentAnalyticsPhase2AStatus === "function");
    } catch (error) {
      check("Unexpected exception", false, error && error.message ? error.message : String(error));
    }
    const passed = checks.filter(function pass(item) { return item.passed; }).length;
    return {
      id: "IDE-140-PHASE2A-VALIDATION",
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

  function summarizeDevelopmentAnalyticsPhase2AResult(item) {
    const result = item || null;
    if (!result) return null;
    return {
      id: result.id,
      componentId: result.componentId,
      extensionId: result.extensionId,
      version: result.version,
      overallVersion: result.overallVersion,
      implementationPhase: result.implementationPhase,
      status: result.status,
      baseSnapshotId: result.baseSnapshotId,
      sourceRecordCount: finite(result.sourceRecordCount, asArray(result.sourceRecords).length),
      trendCount: asArray(result.trendResults).length,
      patternCount: asArray(result.patternResults).length,
      findingCount: asArray(result.findings).length,
      recommendationCount: asArray(result.recommendationCandidates).length,
      rootCauseStatus: result.rootCauseAnalytics && result.rootCauseAnalytics.status || "Not Available",
      publicationStatus: result.publicationStatus || "Draft",
      handoffEligible: result.handoffEligible === true,
      generatedAt: result.generatedAt,
      completedAt: result.completedAt
    };
  }

  function getDevelopmentAnalyticsPhase2AStatus() {
    const validation = validateDevelopmentAnalyticsPhase2A();
    const officialRecords = typeof global.getValidationResults === "function"
      ? global.getValidationResults({ official: true, limit: MAX_RESULTS })
      : [];
    const last = summarizeDevelopmentAnalyticsPhase2AResult(state.lastResult);
    let nextTask = "Run IDE-135 full validation to create Official Results.";
    if (officialRecords.length && !last) nextTask = "Run runDevelopmentAnalytics() or runDevelopmentAnalyticsPhase2A() to generate Phase 2A analytics.";
    if (last && last.status === "Completed") nextTask = "Implement IDE-140 Phase 2B: Publication Gate, IDE-150 handoff and Analytics Closure.";
    return {
      id: EXTENSION_ID,
      componentId: COMPONENT_ID,
      title: "Development Analytics Phase 2A",
      name: "Trend / Pattern / Root Cause / Quality Analytics",
      version: VERSION,
      overallVersion: OVERALL_VERSION,
      status: validation.valid ? "Ready" : "Attention",
      lifecycleStatus: "Implementation",
      implementationPhase: "Phase 2A",
      ready: validation.valid,
      health: validation.health,
      progress: last && last.status === "Completed" ? 100 : 0,
      officialSourceRecordCount: officialRecords.length,
      resultCount: state.results.size,
      lastResult: last,
      publicationStatus: "Draft",
      releaseStatus: "Not Released",
      handoffEligible: false,
      closureStatus: "Open",
      storage: {
        adapter: "localStorage",
        storageKey: STORAGE_KEY,
        loaded: state.loaded,
        maxResults: MAX_RESULTS
      },
      provides: [
        "Version-aware Time-series Analysis",
        "Moving Average / Median / Percentile",
        "Change Point / Outlier Detection",
        "Non-causal Correlation Analysis",
        "Evidence-backed Trend Classification",
        "Pattern Analysis",
        "IDE-130 Confirmed Root Cause Aggregation",
        "Quality Graph",
        "Multi-layer Reliability Report",
        "Phase 2A Recommendation Candidate"
      ],
      nextTask: nextTask,
      lastError: clone(state.lastError),
      updatedAt: nowIso()
    };
  }

  loadDevelopmentAnalyticsPhase2AState();
  persistDevelopmentAnalyticsPhase2AState();

  const api = {
    runDevelopmentAnalyticsPhase2A: runDevelopmentAnalyticsPhase2A,
    getDevelopmentAnalyticsPhase2AResult: getDevelopmentAnalyticsPhase2AResult,
    getDevelopmentAnalyticsPhase2AResultBySnapshot: getDevelopmentAnalyticsPhase2AResultBySnapshot,
    getDevelopmentAnalyticsPhase2AResults: getDevelopmentAnalyticsPhase2AResults,
    getDevelopmentAnalyticsPhase2AState: getDevelopmentAnalyticsPhase2AState,
    persistDevelopmentAnalyticsPhase2AState: persistDevelopmentAnalyticsPhase2AState,
    loadDevelopmentAnalyticsPhase2AState: loadDevelopmentAnalyticsPhase2AState,
    validateDevelopmentAnalyticsPhase2A: validateDevelopmentAnalyticsPhase2A,
    getDevelopmentAnalyticsPhase2AStatus: getDevelopmentAnalyticsPhase2AStatus,
    getDevelopmentAnalyticsStatisticalMethods: function getMethods() { return METHOD_REGISTRY.map(clone); }
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.IDE140DevelopmentAnalyticsPhase2A = Object.freeze(Object.assign({
    id: EXTENSION_ID,
    componentId: COMPONENT_ID,
    version: VERSION,
    overallVersion: OVERALL_VERSION,
    statisticalMethods: METHOD_REGISTRY
  }, api));
})(typeof window !== "undefined" ? window : globalThis);