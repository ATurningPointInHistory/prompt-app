/* ============================================================
   FILE: 13_intelligence_understanding_pipeline.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Phase: 5 Repository and Workflow Understanding
   Design Freeze: v1.0.0 / Decision 006
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Understanding Pipeline blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.6.0";
  const CAPABILITY_ID = "IDE-170-UNDERSTANDING-PIPELINE";
  const HASH_ALGORITHM = "SHA-256";
  const STAGE_ORDER = Object.freeze([
    "INTAKE-READINESS",
    "CANONICAL-FACT",
    "STRUCTURAL-UNDERSTANDING",
    "RELATIONSHIP-UNDERSTANDING",
    "CHANGE-UNDERSTANDING",
    "WORKFLOW-UNDERSTANDING",
    "CROSS-DOMAIN-UNDERSTANDING",
    "INSIGHT-GENERATION",
    "EXPLANATION",
    "UNDERSTANDING-VALIDATION",
    "UNDERSTANDING-FREEZE"
  ]);

  if (!(state.understandingResults instanceof Map)) state.understandingResults = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestUnderstandingResultId")) state.latestUnderstandingResultId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastUnderstandingValidation")) state.lastUnderstandingValidation = null;

  function stableStringify(value) {
    if (internal.stableStringify) return internal.stableStringify(value);
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function key(name) {
      return JSON.stringify(name) + ":" + stableStringify(value[name]);
    }).join(",") + "}";
  }

  function hash(value) {
    if (typeof namespace.calculateSHA256 === "function") {
      return namespace.calculateSHA256(typeof value === "string" ? value : stableStringify(value));
    }
    return internal.text(value, "").length.toString(16).padStart(64, "0").slice(-64);
  }

  function hashPayload(result) {
    const copy = internal.clone(result);
    if (copy && copy.integrity) copy.integrity.understandingHash = null;
    return copy;
  }

  function notify(options, stageId, current, total, detail) {
    const callback = options && options.onProgress;
    if (typeof callback !== "function") return;
    try {
      callback({ stageId: stageId, current: current, total: total, detail: internal.clone(detail || {}), at: internal.nowIso() });
    } catch (_) {}
  }

  function cancelled(options) {
    return Boolean(options && ((options.signal && options.signal.aborted) || (typeof options.cancelled === "function" && options.cancelled() === true)));
  }

  function resolveBySession(sessionId, referenceType, idField) {
    const session = namespace.getSession(sessionId);
    const references = internal.asArray(session && session.sourceReferences).slice().reverse();
    const reference = references.find(function find(item) {
      return item && item.referenceType === referenceType && item[idField];
    });
    return reference ? reference[idField] : null;
  }

  function resolveArtifacts(sessionId, options) {
    const canonicalSnapshotId = internal.text(
      options.canonicalSnapshotId || resolveBySession(sessionId, "Canonical Snapshot", "snapshotId") || state.latestCanonicalSnapshotId,
      ""
    );
    const repositorySnapshotId = internal.text(
      options.repositorySnapshotId || resolveBySession(sessionId, "Repository Baseline Snapshot", "snapshotId") || resolveBySession(sessionId, "Repository Incremental Snapshot", "snapshotId") || state.latestRepositorySnapshotId,
      ""
    );
    const graphId = internal.text(
      options.graphId || resolveBySession(sessionId, "Evidence Graph Snapshot", "graphId") || state.latestEvidenceGraphSnapshotId,
      ""
    );
    return {
      canonicalSnapshot: canonicalSnapshotId ? namespace.getCanonicalSnapshot(canonicalSnapshotId) : null,
      repositorySnapshot: repositorySnapshotId ? namespace.getRepositorySnapshot(repositorySnapshotId) : null,
      graph: graphId ? namespace.getEvidenceGraph(graphId) : null
    };
  }

  function buildCoverage(canonicalSnapshot, repositorySnapshot, graph) {
    const references = internal.asArray(canonicalSnapshot && canonicalSnapshot.sourceReferences);
    const adapterStatus = references.map(function map(item) {
      return {
        adapterId: item.adapterId,
        status: item.status,
        recordCount: item.recordCount,
        sourceType: item.sourceType,
        sourceVersion: item.sourceVersion || null
      };
    });
    const missingSources = internal.unique(
      internal.asArray(canonicalSnapshot && canonicalSnapshot.quality && canonicalSnapshot.quality.missingSources)
        .concat(adapterStatus.filter(function partial(item) { return item.status !== "Ready"; }).map(function id(item) { return item.adapterId; }))
    );
    const recordTypeCounts = internal.clone(canonicalSnapshot && canonicalSnapshot.summary && canonicalSnapshot.summary.recordTypeCounts || {});
    const status = !canonicalSnapshot || !graph
      ? "Blocked"
      : missingSources.length || canonicalSnapshot.quality && canonicalSnapshot.quality.status === "Partial" || repositorySnapshot && repositorySnapshot.quality && repositorySnapshot.quality.status === "Partial" || graph.quality && graph.quality.status === "Partial"
        ? "Partial"
        : "Ready";
    return {
      status: status,
      adapterStatus: adapterStatus,
      recordTypeCounts: recordTypeCounts,
      missingSources: missingSources,
      canonicalCompleteness: canonicalSnapshot && canonicalSnapshot.quality && canonicalSnapshot.quality.completeness != null ? canonicalSnapshot.quality.completeness : 0,
      repositoryCompleteness: repositorySnapshot && repositorySnapshot.quality && repositorySnapshot.quality.completeness != null ? repositorySnapshot.quality.completeness : null,
      graphQuality: graph && graph.quality && graph.quality.status || "Unavailable",
      limitations: missingSources.map(function map(item) { return "Source Adapter is not Ready: " + item; }),
      noSilentCompletion: true
    };
  }

  function stageRecord(stageId, status, inputReferences, output, rules, engines, warnings, errors) {
    return {
      stageId: stageId,
      sequence: STAGE_ORDER.indexOf(stageId) + 1,
      status: status,
      inputReferences: internal.clone(inputReferences || {}),
      output: internal.clone(output || {}),
      appliedRuleIds: internal.unique(rules),
      engineIds: internal.unique(engines),
      warnings: internal.asArray(warnings).map(String),
      errors: internal.asArray(errors).map(String),
      startedAt: internal.nowIso(),
      completedAt: internal.nowIso()
    };
  }

  function aggregateUnique(items, idFields) {
    const result = [];
    const seen = new Set();
    internal.asArray(items).forEach(function append(item) {
      const id = idFields.map(function field(name) { return item && item[name]; }).find(Boolean) || stableStringify(item);
      if (seen.has(id)) return;
      seen.add(id);
      result.push(internal.clone(item));
    });
    return result;
  }

  function validateUnderstandingResult(resultOrId) {
    const result = typeof resultOrId === "string" ? state.understandingResults.get(resultOrId) : resultOrId;
    if (!result) {
      return { id: internal.nextId("IDE-170-UNDERSTANDING-VALIDATION"), valid: false, passed: 0, failed: 1, total: 1, checks: [{ name: "Understanding Result exists", passed: false, detail: "Not Found" }], validatedAt: internal.nowIso() };
    }
    const facts = internal.asArray(result.facts);
    const derived = internal.asArray(result.derivedResults);
    const insights = internal.asArray(result.insights);
    const stages = internal.asArray(result.stages);
    const expectedHash = hash(hashPayload(result));
    const checks = [
      { name: "Understanding Schema", passed: namespace.validateAgainstSchema("IDE-170-SCHEMA-UNDERSTANDING-RESULT", result).valid, detail: result.understandingId },
      { name: "Session Reference is present", passed: Boolean(result.sessionId), detail: result.sessionId },
      { name: "Canonical Snapshot Reference is present", passed: Boolean(result.scope && result.scope.canonicalSnapshotId), detail: result.scope && result.scope.canonicalSnapshotId },
      { name: "Repository Snapshot Reference is present", passed: Boolean(result.scope && result.scope.repositorySnapshotId), detail: result.scope && result.scope.repositorySnapshotId },
      { name: "Evidence Graph Reference is present", passed: Boolean(result.scope && result.scope.graphId), detail: result.scope && result.scope.graphId },
      { name: "Stage order is governed", passed: stages.length === STAGE_ORDER.length && stages.every(function order(stage, index) { return stage.stageId === STAGE_ORDER[index] && stage.sequence === index + 1; }), detail: stages.map(function map(item) { return item.stageId; }) },
      { name: "Facts are Source-derived only", passed: facts.every(function fact(item) { return item.resultKind === "Fact" && item.sourceDerived === true && item.inferred !== true; }), detail: facts.length },
      { name: "Derived Results remain separate", passed: derived.every(function derivedItem(item) { return item.resultKind === "Derived Result" && item.deterministic === true && item.factLayerMutationAllowed === false && Boolean(item.ruleId); }), detail: derived.length },
      { name: "Insight Candidates remain separate", passed: insights.every(function insight(item) { return item.resultKind === "Insight Candidate" && item.status === "Candidate" && item.factPromotionAllowed === false; }), detail: insights.length },
      { name: "Derived Results retain Evidence or explicit deterministic summary", passed: derived.every(function evidence(item) { return internal.asArray(item.evidence).length > 0 || item.detail && Object.keys(item.detail).length > 0; }), detail: derived.length },
      { name: "Insights retain Evidence or missing-Evidence explanation", passed: insights.every(function evidence(item) { return internal.asArray(item.evidence).length > 0 || item.explanation && internal.asArray(item.explanation.missingEvidence).length > 0; }), detail: insights.length },
      { name: "Insights retain Explanation", passed: insights.every(function explanation(item) { return Boolean(item.explanation && item.explanation.summary && internal.asArray(item.explanation.limitations)); }), detail: insights.length },
      { name: "Rules are registered Capabilities", passed: internal.asArray(result.rules).every(function capability(id) { return Boolean(namespace.getCapability(id)); }), detail: result.rules },
      { name: "Partial Scope is explicit", passed: result.quality.status !== "Partial" || Boolean(
        result.scope && result.scope.sourceCoverage && (
          internal.asArray(result.scope.sourceCoverage.limitations).length ||
          internal.asArray(result.scope.sourceCoverage.missingSources).length ||
          internal.asArray(result.quality && result.quality.warnings).length
        )
      ), detail: {
        sourceCoverage: result.scope && result.scope.sourceCoverage,
        qualityWarnings: internal.asArray(result.quality && result.quality.warnings)
      } },
      { name: "No automatic Recommendation application", passed: result.automaticRecommendationApplicationAllowed === false, detail: result.automaticRecommendationApplicationAllowed },
      { name: "No direct Fact Graph mutation", passed: result.factGraphMutationAllowed === false, detail: result.factGraphMutationAllowed },
      { name: "Understanding Result is Frozen", passed: result.status === "Frozen" && result.frozen === true && result.immutable === true, detail: result.status },
      { name: "Understanding Hash is valid", passed: Boolean(result.integrity && result.integrity.understandingHash === expectedHash), detail: result.integrity && result.integrity.understandingHash },
      { name: "Summary matches collections", passed: result.summary.factCount === facts.length && result.summary.derivedResultCount === derived.length && result.summary.insightCount === insights.length && result.summary.stageCount === stages.length, detail: result.summary }
    ];
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return {
      id: internal.nextId("IDE-170-UNDERSTANDING-VALIDATION"),
      componentId: namespace.componentId,
      understandingId: result.understandingId,
      valid: passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function runUnderstanding(sessionId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = namespace.getSession(sessionId);
    if (!session || session.state === "Frozen") {
      return internal.buildResult(false, "UNDERSTANDING_SESSION_NOT_READY", "Blocked", null, {
        error: { message: "An active Intelligence Session is required.", category: "State Failure" }
      });
    }
    if (cancelled(settings)) return internal.buildResult(false, "UNDERSTANDING_CANCELLED", "Cancelled", null);

    const artifacts = resolveArtifacts(sessionId, settings);
    const canonicalSnapshot = artifacts.canonicalSnapshot;
    const repositorySnapshot = artifacts.repositorySnapshot;
    const graph = artifacts.graph;
    const readinessErrors = [];
    if (!canonicalSnapshot || canonicalSnapshot.status !== "Frozen") readinessErrors.push("Frozen Canonical Snapshot is required.");
    if (!repositorySnapshot || repositorySnapshot.status !== "Frozen") readinessErrors.push("Frozen Repository Snapshot is required.");
    if (!graph || graph.status !== "Frozen") readinessErrors.push("Frozen Evidence Graph is required.");
    if (canonicalSnapshot && !namespace.validateCanonicalSnapshot(canonicalSnapshot).valid) readinessErrors.push("Canonical Snapshot validation failed.");
    if (repositorySnapshot && !namespace.validateRepositorySnapshot(repositorySnapshot).valid) readinessErrors.push("Repository Snapshot validation failed.");
    if (graph && !namespace.validateEvidenceGraph(graph).valid) readinessErrors.push("Evidence Graph validation failed.");
    if (readinessErrors.length) {
      return internal.buildResult(false, "UNDERSTANDING_INTAKE_NOT_READY", "Blocked", { errors: readinessErrors }, {
        error: { message: readinessErrors.join(" "), category: "Dependency Failure" }
      });
    }

    const understandingId = internal.text(settings.understandingId, internal.nextId("IDE-170-UNDERSTANDING"));
    if (state.understandingResults.has(understandingId)) {
      return internal.buildResult(false, "UNDERSTANDING_ID_DUPLICATE", "Blocked", { understandingId: understandingId });
    }

    const coverage = buildCoverage(canonicalSnapshot, repositorySnapshot, graph);
    const context = {
      sessionId: sessionId,
      canonicalSnapshot: canonicalSnapshot,
      repositorySnapshot: repositorySnapshot,
      graph: graph,
      projectCanonicalId: (internal.asArray(graph.nodes).find(function project(node) { return node.recordType === "project"; }) || {}).canonicalId || null,
      options: settings,
      sourceCoverage: coverage
    };
    const stages = [];
    const stageOutputs = [];
    const totalStages = STAGE_ORDER.length;

    notify(settings, STAGE_ORDER[0], 1, totalStages, coverage);
    stages.push(stageRecord("INTAKE-READINESS", coverage.status, {
      canonicalSnapshotId: canonicalSnapshot.snapshotId,
      repositorySnapshotId: repositorySnapshot.snapshotId,
      graphId: graph.graphId
    }, { sourceCoverage: coverage }, [], [], coverage.limitations, []));

    notify(settings, STAGE_ORDER[1], 2, totalStages, canonicalSnapshot.summary);
    stages.push(stageRecord("CANONICAL-FACT", canonicalSnapshot.quality.status === "Partial" ? "Partial" : "Ready", {
      canonicalSnapshotId: canonicalSnapshot.snapshotId
    }, {
      recordCount: canonicalSnapshot.summary.recordCount,
      recordTypeCounts: canonicalSnapshot.summary.recordTypeCounts,
      selectedRecordIds: internal.asArray(canonicalSnapshot.records).map(function id(record) { return record.identity.canonicalId; })
    }, [], [], canonicalSnapshot.quality.warnings, canonicalSnapshot.quality.errors));

    if (cancelled(settings)) return internal.buildResult(false, "UNDERSTANDING_CANCELLED", "Cancelled", { completedStages: stages.length });
    const structural = namespace.buildStructuralUnderstanding(context);
    stageOutputs.push(structural);
    notify(settings, structural.stageId, 3, totalStages, structural.summary);
    stages.push(stageRecord(structural.stageId, structural.status, {
      canonicalSnapshotId: canonicalSnapshot.snapshotId,
      graphId: graph.graphId
    }, structural.summary, structural.appliedRuleIds, structural.engineIds, structural.warnings, structural.errors));

    const relationship = namespace.buildRelationshipUnderstanding(context);
    stageOutputs.push(relationship);
    notify(settings, relationship.stageId, 4, totalStages, relationship.summary);
    stages.push(stageRecord(relationship.stageId, relationship.status, { graphId: graph.graphId }, relationship.summary, relationship.appliedRuleIds, relationship.engineIds, relationship.warnings, relationship.errors));

    const change = namespace.buildChangeUnderstanding(context);
    stageOutputs.push(change);
    notify(settings, change.stageId, 5, totalStages, change.summary);
    stages.push(stageRecord(change.stageId, change.status, { repositorySnapshotId: repositorySnapshot.snapshotId, graphId: graph.graphId }, change.summary, change.appliedRuleIds, change.engineIds, change.warnings, change.errors));

    const workflow = namespace.buildWorkflowUnderstanding(context);
    stageOutputs.push(workflow);
    notify(settings, workflow.stageId, 6, totalStages, workflow.summary);
    stages.push(stageRecord(workflow.stageId, workflow.status, { canonicalSnapshotId: canonicalSnapshot.snapshotId, graphId: graph.graphId }, workflow.summary, workflow.appliedRuleIds, workflow.engineIds, workflow.warnings, workflow.errors));

    const crossDomain = namespace.buildCrossDomainUnderstanding(context);
    stageOutputs.push(crossDomain);
    notify(settings, crossDomain.stageId, 7, totalStages, crossDomain.summary);
    stages.push(stageRecord(crossDomain.stageId, crossDomain.status, { graphId: graph.graphId }, crossDomain.summary, crossDomain.appliedRuleIds, crossDomain.engineIds, crossDomain.warnings, crossDomain.errors));

    const facts = aggregateUnique(stageOutputs.reduce(function flatten(acc, item) { return acc.concat(item.facts); }, []), ["factId"]);
    const derivedResults = aggregateUnique(stageOutputs.reduce(function flatten(acc, item) { return acc.concat(item.derivedResults); }, []), ["derivedResultId"]);
    const insights = aggregateUnique(stageOutputs.reduce(function flatten(acc, item) { return acc.concat(item.insights); }, []), ["insightId"]);
    const evidence = aggregateUnique(
      facts.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, [])
        .concat(derivedResults.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, []))
        .concat(insights.reduce(function flatten(acc, item) { return acc.concat(item.evidence); }, [])),
      ["evidenceId"]
    );
    const rules = internal.unique(stageOutputs.reduce(function flatten(acc, item) { return acc.concat(item.appliedRuleIds); }, []));
    const engines = internal.unique(stageOutputs.reduce(function flatten(acc, item) { return acc.concat(item.engineIds); }, []));
    const warnings = internal.unique(coverage.limitations.concat(stageOutputs.reduce(function flatten(acc, item) { return acc.concat(item.warnings); }, [])));
    const errors = internal.unique(stageOutputs.reduce(function flatten(acc, item) { return acc.concat(item.errors); }, []));

    notify(settings, "INSIGHT-GENERATION", 8, totalStages, { insightCount: insights.length });
    stages.push(stageRecord("INSIGHT-GENERATION", insights.length || !errors.length ? "Ready" : "Partial", {
      factCount: facts.length,
      derivedResultCount: derivedResults.length
    }, { insightCount: insights.length, insightTypes: insights.reduce(function count(acc, item) { acc[item.insightType] = (acc[item.insightType] || 0) + 1; return acc; }, {}) }, rules, engines, [], []));

    const explanationsReady = insights.every(function ready(item) { return Boolean(item.explanation && item.explanation.summary); });
    notify(settings, "EXPLANATION", 9, totalStages, { explanationCount: insights.length });
    stages.push(stageRecord("EXPLANATION", explanationsReady ? "Ready" : "Partial", { insightCount: insights.length }, {
      explanationCount: insights.filter(function ready(item) { return Boolean(item.explanation && item.explanation.summary); }).length,
      fullExplainableEnvelopeDeferredToPhase6: true
    }, rules, [], explanationsReady ? [] : ["One or more Insight Candidates lack a structured Evidence summary."], []));

    const now = internal.nowIso();
    const result = {
      understandingId: understandingId,
      understandingType: "repository-workflow",
      componentId: namespace.componentId,
      version: VERSION,
      schemaVersion: VERSION,
      sessionId: sessionId,
      status: "Frozen",
      scope: {
        projectId: repositorySnapshot.projectId || context.projectCanonicalId || null,
        canonicalSnapshotId: canonicalSnapshot.snapshotId,
        repositorySnapshotId: repositorySnapshot.snapshotId,
        graphId: graph.graphId,
        recordTypes: Object.keys(canonicalSnapshot.summary.recordTypeCounts || {}).sort(),
        sourceCoverage: coverage
      },
      facts: facts,
      derivedResults: derivedResults,
      insights: insights,
      evidence: evidence,
      rules: rules,
      engines: engines,
      stages: [],
      quality: {
        status: errors.length ? "Invalid" : warnings.length ? "Partial" : "Ready",
        completeness: coverage.canonicalCompleteness,
        warnings: warnings,
        errors: errors,
        partialScope: warnings.length > 0,
        missingSources: coverage.missingSources
      },
      summary: {
        factCount: facts.length,
        derivedResultCount: derivedResults.length,
        insightCount: insights.length,
        evidenceCount: evidence.length,
        stageCount: STAGE_ORDER.length,
        warningCount: warnings.length,
        errorCount: errors.length
      },
      integrity: { hashAlgorithm: HASH_ALGORITHM, understandingHash: null, status: "Pending" },
      automaticRecommendationApplicationAllowed: false,
      factGraphMutationAllowed: false,
      workflowExecutionAllowed: false,
      candidateFactPromotionAllowed: false,
      createdAt: now,
      validatedAt: now,
      frozenAt: now,
      frozen: true,
      immutable: true
    };

    notify(settings, "UNDERSTANDING-VALIDATION", 10, totalStages, result.summary);
    stages.push(stageRecord("UNDERSTANDING-VALIDATION", "Ready", { understandingId: understandingId }, {
      validationRequired: true,
      criticalValidationFailureBlocksFreeze: true
    }, rules, engines, [], []));
    notify(settings, "UNDERSTANDING-FREEZE", 11, totalStages, { understandingId: understandingId });
    stages.push(stageRecord("UNDERSTANDING-FREEZE", "Frozen", { understandingId: understandingId }, {
      immutable: true,
      directMutationAllowed: false
    }, [], [], [], []));
    result.stages = stages;
    result.integrity.status = "Valid";
    result.integrity.understandingHash = hash(hashPayload(result));

    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-UNDERSTANDING-RESULT", result);
    const validation = validateUnderstandingResult(result);
    if (!schemaValidation.valid || !validation.valid) {
      return internal.buildResult(false, "UNDERSTANDING_VALIDATION_BLOCKED", "Blocked", {
        result: result,
        schemaValidation: schemaValidation,
        validation: validation
      }, { error: { message: "Understanding Result validation failed.", category: "Validation Failure" } });
    }

    const frozen = internal.deepFreeze(result);
    state.understandingResults.set(understandingId, frozen);
    state.latestUnderstandingResultId = understandingId;
    internal.attachSessionSourceReference(sessionId, {
      referenceType: "Understanding Result",
      understandingId: understandingId,
      snapshotId: understandingId,
      status: "Frozen",
      factCount: facts.length,
      derivedResultCount: derivedResults.length,
      insightCount: insights.length,
      capturedAt: now
    }, { actor: internal.text(settings.actor, "IDE-170 Understanding Pipeline") });
    internal.touch();
    internal.appendAudit({
      action: "UNDERSTANDING_RESULT_FROZEN",
      actor: internal.text(settings.actor, "IDE-170 Understanding Pipeline"),
      targetType: "Understanding Result",
      targetId: understandingId,
      sessionId: sessionId,
      outcome: result.quality.status,
      detail: result.summary
    });
    return internal.buildResult(true, "UNDERSTANDING_RESULT_FROZEN", result.quality.status, {
      understanding: getUnderstandingResult(understandingId),
      validation: validation
    }, { warnings: warnings });
  }

  function getUnderstandingResult(understandingId) {
    return internal.clone(state.understandingResults.get(internal.text(understandingId, "")) || null);
  }

  function getUnderstandingResults(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const sessionId = internal.text(settings.sessionId, "");
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return [...state.understandingResults.values()]
      .filter(function filter(item) { return !sessionId || item.sessionId === sessionId; })
      .slice(-limit)
      .map(internal.clone);
  }

  async function runCurrentRepositoryUnderstanding(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const preparation = typeof namespace.prepareCurrentRepositorySources === "function"
      ? await namespace.prepareCurrentRepositorySources({ silent: true })
      : { ok: false, code: "PREPARATION_API_UNAVAILABLE" };
    if (!preparation || preparation.ok !== true) {
      return internal.buildResult(false, "CURRENT_REPOSITORY_PREPARATION_FAILED", "Blocked", { preparation: preparation });
    }
    const sessionResult = namespace.startSession({
      actor: internal.text(settings.actor, "Project Owner"),
      purpose: "Phase 5 Current Repository and Workflow Understanding",
      requiredCapabilities: [CAPABILITY_ID, "IDE-170-REPOSITORY-UNDERSTANDING", "IDE-170-WORKFLOW-UNDERSTANDING"]
    });
    if (!sessionResult.ok) return sessionResult;
    const sessionId = sessionResult.data.session.sessionId;
    const intake = namespace.captureSources(sessionId, {
      adapterIds: ["IDE-170-ADAPTER-REPOSITORY", "IDE-170-ADAPTER-PROJECT", "IDE-170-ADAPTER-FUNCTION", "IDE-170-ADAPTER-MODULE", "IDE-170-ADAPTER-ARCHITECTURE", "IDE-170-ADAPTER-WORKFLOW"],
      requiredAdapterIds: ["IDE-170-ADAPTER-REPOSITORY", "IDE-170-ADAPTER-PROJECT"],
      includeContent: settings.includeContent === true,
      actor: settings.actor
    });
    if (!intake.ok) return intake;
    const canonical = namespace.buildCanonicalSnapshot(sessionId, { intakeId: intake.data.intake.intakeId, actor: settings.actor });
    if (!canonical.ok) return canonical;
    const repository = namespace.buildRepositoryBaseline(sessionId, { canonicalSnapshotId: canonical.data.snapshot.snapshotId, actor: settings.actor, onProgress: settings.onProgress });
    if (!repository.ok) return repository;
    let relationshipIntake = null;
    const relationshipAvailability = namespace.getSourceAvailability("IDE-170-ADAPTER-RELATIONSHIP");
    if (relationshipAvailability && relationshipAvailability.available === true) {
      relationshipIntake = namespace.captureSources(sessionId, { adapterIds: ["IDE-170-ADAPTER-RELATIONSHIP"], actor: settings.actor });
    }
    const graph = namespace.buildEvidenceGraph(sessionId, {
      canonicalSnapshotId: canonical.data.snapshot.snapshotId,
      repositorySnapshotId: repository.data.snapshot.snapshotId,
      relationshipIntakeId: relationshipIntake && relationshipIntake.ok ? relationshipIntake.data.intake.intakeId : null,
      actor: settings.actor
    });
    if (!graph.ok) return graph;
    const understanding = runUnderstanding(sessionId, {
      canonicalSnapshotId: canonical.data.snapshot.snapshotId,
      repositorySnapshotId: repository.data.snapshot.snapshotId,
      graphId: graph.data.graph.graphId,
      actor: settings.actor,
      onProgress: settings.onProgress,
      maximumDependencyPaths: settings.maximumDependencyPaths,
      maximumCrossDomainPaths: settings.maximumCrossDomainPaths
    });
    if (understanding.ok) namespace.freezeSession(sessionId, { actor: settings.actor, reason: "Phase 5 Current Repository Understanding Complete" });
    return internal.buildResult(understanding.ok, understanding.ok ? "CURRENT_REPOSITORY_UNDERSTANDING_COMPLETE" : understanding.code, understanding.status, {
      sessionId: sessionId,
      intakeSummary: intake.data.intake.summary,
      canonicalSummary: canonical.data.snapshot.summary,
      repositorySummary: repository.data.snapshot.summary,
      graphSummary: graph.data.graph.summary,
      understanding: understanding.data && understanding.data.understanding,
      validation: understanding.data && understanding.data.validation
    }, { warnings: understanding.warnings, error: understanding.error });
  }

  function registerSchemas() {
    const schemas = [
      {
        schemaId: "IDE-170-SCHEMA-UNDERSTANDING-RESULT",
        name: "Repository and Workflow Understanding Result",
        version: VERSION,
        type: "object",
        required: ["understandingId", "understandingType", "sessionId", "scope", "facts", "derivedResults", "insights", "evidence", "stages", "quality", "summary", "integrity", "status", "frozen", "immutable"],
        properties: {
          understandingId: { type: "string", minLength: 1 },
          understandingType: { type: "string", enum: ["repository-workflow"] },
          sessionId: { type: "string", minLength: 1 },
          scope: { type: "object" },
          facts: { type: "array" },
          derivedResults: { type: "array" },
          insights: { type: "array" },
          evidence: { type: "array" },
          stages: { type: "array", minItems: 11 },
          quality: { type: "object" },
          summary: { type: "object" },
          integrity: { type: "object" },
          status: { type: "string", enum: ["Frozen"] },
          frozen: { type: "boolean" },
          immutable: { type: "boolean" }
        },
        owner: "IDE-170",
        source: "Architecture Decision 006"
      }
    ];
    return schemas.map(function register(schema) {
      if (namespace.getSchema(schema.schemaId)) return { schemaId: schema.schemaId, registered: true, existing: true };
      const result = namespace.registerSchema(schema);
      return { schemaId: schema.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerCapability() {
    if (namespace.getCapability(CAPABILITY_ID)) return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: namespace.getCapability(CAPABILITY_ID) });
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Evidence-Grounded Understanding Pipeline",
      version: VERSION,
      type: "Pipeline",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-REPOSITORY-UNDERSTANDING", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-WORKFLOW-UNDERSTANDING", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-EVIDENCE-GRAPH", minimumVersion: "1.6.0", optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-UNDERSTANDING-RESULT"],
      provides: ["Stage Lifecycle", "Fact Derived Insight Separation", "Source Coverage", "Understanding Freeze", "Understanding Validation"],
      source: "Architecture Decision 006"
    });
  }

  async function runUnderstandingPhaseValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    const artifacts = { sessionIds: [], adapterIds: [], intakeIds: [], canonicalSnapshotIds: [], repositorySnapshotIds: [], graphIds: [], understandingIds: [] };
    function check(name, passed, detail, group, severity) {
      checks.push({ name: name, passed: passed === true, detail: internal.clone(detail), group: group || "Phase 5", severity: severity || "High" });
    }
    function cleanup() {
      artifacts.understandingIds.forEach(function remove(id) { if (typeof internal.removeUnderstandingForValidation === "function") internal.removeUnderstandingForValidation(id); });
      artifacts.graphIds.forEach(function remove(id) { if (typeof internal.removeEvidenceGraphForValidation === "function") internal.removeEvidenceGraphForValidation(id); });
      artifacts.repositorySnapshotIds.forEach(function remove(id) { if (typeof internal.removeRepositorySnapshotForValidation === "function") internal.removeRepositorySnapshotForValidation(id); });
      artifacts.canonicalSnapshotIds.forEach(function remove(id) { if (typeof internal.removeCanonicalSnapshotForValidation === "function") internal.removeCanonicalSnapshotForValidation(id); });
      artifacts.intakeIds.forEach(function remove(id) { if (typeof internal.removeSourceIntakeForValidation === "function") internal.removeSourceIntakeForValidation(id); });
      artifacts.adapterIds.forEach(function remove(id) {
        if (typeof internal.removeSourceAdapterForValidation === "function") internal.removeSourceAdapterForValidation(id);
        if (typeof internal.removeCapabilityForValidation === "function") internal.removeCapabilityForValidation(id);
      });
      artifacts.sessionIds.forEach(function remove(id) { if (typeof internal.removeSessionForValidation === "function") internal.removeSessionForValidation(id); });
    }

    try {
      const initialization = namespace.initialize({ actor: "IDE-170 Phase 5 Validation", registerIntegration: true });
      check("Phase 5 initialization succeeds", initialization.ok === true, initialization.code, "Foundation");
      check("Repository Understanding module is Ready", namespace.modules.repositoryUnderstanding && namespace.modules.repositoryUnderstanding.status === "Ready", namespace.modules.repositoryUnderstanding, "Foundation");
      check("Workflow Understanding module is Ready", namespace.modules.workflowUnderstanding && namespace.modules.workflowUnderstanding.status === "Ready", namespace.modules.workflowUnderstanding, "Foundation");
      check("Understanding Pipeline module is Ready", namespace.modules.understandingPipeline && namespace.modules.understandingPipeline.status === "Ready", namespace.modules.understandingPipeline, "Foundation");
      check("Understanding Schema is registered", Boolean(namespace.getSchema("IDE-170-SCHEMA-UNDERSTANDING-RESULT")), namespace.getSchema("IDE-170-SCHEMA-UNDERSTANDING-RESULT"), "Foundation");
      check("Understanding Rules are registered", Object.values(internal.repositoryUnderstandingRuleIds || {}).concat(Object.values(internal.workflowUnderstandingRuleIds || {})).every(function rule(id) { return Boolean(namespace.getCapability(id)); }), "Registered", "Foundation");

      const regression = namespace.runValidation({ actor: "IDE-170 Phase 5 Regression", androidRealDevicePassed: false });
      check("Phase 1-4 regression remains Passed", regression && regression.valid === true && regression.failed === 0, regression ? regression.passed + "/" + regression.total : "Unavailable", "Regression");

      const unique = Date.now().toString(36).toUpperCase();
      const adapterId = "IDE-170-ADAPTER-UNDERSTANDING-VALIDATION-" + unique;
      const fixtureRecords = [
        { recordType: "project", sourceType: "validation", sourceId: "project:phase5", identity: { sourceId: "project:phase5", name: "Phase 5 Fixture", qualifiedName: "Phase 5 Fixture", aliases: [] }, classification: { domain: "repository", category: "project", subtype: "application", lifecycle: "Active" }, payload: { version: VERSION }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "file", sourceType: "validation", sourceId: "src/a.js", identity: { sourceId: "src/a.js", name: "a.js", qualifiedName: "src/a.js", aliases: [] }, classification: { domain: "repository", category: "file", subtype: "js", lifecycle: "Active" }, payload: { path: "src/a.js", fileName: "a.js", content: "function alpha(){}" }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "file", sourceType: "validation", sourceId: "src/b.js", identity: { sourceId: "src/b.js", name: "b.js", qualifiedName: "src/b.js", aliases: [] }, classification: { domain: "repository", category: "file", subtype: "js", lifecycle: "Active" }, payload: { path: "src/b.js", fileName: "b.js", content: "function beta(){}" }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "file", sourceType: "validation", sourceId: "src/c.js", identity: { sourceId: "src/c.js", name: "c.js", qualifiedName: "src/c.js", aliases: [] }, classification: { domain: "repository", category: "file", subtype: "js", lifecycle: "Active" }, payload: { path: "src/c.js", fileName: "c.js", content: "function gamma(){}" }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "function", sourceType: "validation", sourceId: "src/a.js::alpha", identity: { sourceId: "src/a.js::alpha", name: "alpha", qualifiedName: "src/a.js::alpha", aliases: [] }, classification: { domain: "repository", category: "function", subtype: "function", lifecycle: "Active" }, payload: { fileName: "src/a.js", calls: ["src/b.js::beta"] }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "function", sourceType: "validation", sourceId: "src/b.js::beta", identity: { sourceId: "src/b.js::beta", name: "beta", qualifiedName: "src/b.js::beta", aliases: [] }, classification: { domain: "repository", category: "function", subtype: "function", lifecycle: "Active" }, payload: { fileName: "src/b.js", calls: ["src/c.js::gamma"] }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "function", sourceType: "validation", sourceId: "src/c.js::gamma", identity: { sourceId: "src/c.js::gamma", name: "gamma", qualifiedName: "src/c.js::gamma", aliases: [] }, classification: { domain: "repository", category: "function", subtype: "function", lifecycle: "Active" }, payload: { fileName: "src/c.js", calls: ["src/a.js::alpha"] }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "module", sourceType: "validation", sourceId: "module:core", identity: { sourceId: "module:core", name: "Core", qualifiedName: "module:core", aliases: [] }, classification: { domain: "architecture", category: "module", subtype: "module", lifecycle: "Active" }, payload: { files: ["src/a.js", "src/b.js"] }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "module", sourceType: "validation", sourceId: "module:ui", identity: { sourceId: "module:ui", name: "UI", qualifiedName: "module:ui", aliases: [] }, classification: { domain: "architecture", category: "module", subtype: "module", lifecycle: "Active" }, payload: { files: ["src/c.js"] }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "workflow-package", sourceType: "validation", sourceId: "workflow:phase5", identity: { sourceId: "workflow:phase5", name: "Phase 5 Workflow", qualifiedName: "workflow:phase5", aliases: [] }, classification: { domain: "workflow", category: "workflow-package", subtype: "IDE-160 Package", lifecycle: "Completed" }, payload: { status: "Completed", changedFiles: ["src/a.js"], decisionRecords: [{ status: "Approved", decidedAt: "2026-08-06T00:00:00.000Z" }], approvalRecords: [{ status: "Approved", approvedAt: "2026-08-06T00:01:00.000Z" }], executionRecords: [{ status: "Passed", executedAt: "2026-08-06T00:02:00.000Z", changedFiles: ["src/a.js"] }], validationRecords: [{ status: "Passed", completedAt: "2026-08-06T00:03:00.000Z" }], completionRecords: [{ status: "Completed", completedAt: "2026-08-06T00:04:00.000Z" }] }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } },
        { recordType: "workflow-baseline", sourceType: "validation", sourceId: "workflow-baseline:phase5", identity: { sourceId: "workflow-baseline:phase5", name: "Phase 5 Baseline", qualifiedName: "workflow-baseline:phase5", aliases: [] }, classification: { domain: "workflow", category: "workflow-baseline", subtype: "IDE-160 Baseline", lifecycle: "Frozen" }, payload: { status: "Frozen" }, metadata: {}, quality: { missingFields: [], warnings: [], errors: [] } }
      ];
      const adapterResult = namespace.registerSourceAdapter({
        adapterId: adapterId, capabilityId: adapterId, name: "Phase 5 Understanding Fixture", version: VERSION, status: "Experimental", sourceType: "validation", recordTypes: ["project", "file", "function", "module", "workflow-package", "workflow-baseline"], domains: ["repository", "architecture", "workflow"], required: true, priority: 1,
        isAvailable: function available() { return { available: true, status: "Ready" }; },
        read: function read() { return { status: "Ready", sourceVersion: VERSION, records: internal.clone(fixtureRecords), warnings: [] }; }
      });
      if (adapterResult.ok) artifacts.adapterIds.push(adapterId);
      check("Phase 5 fixture Adapter can be registered", adapterResult.ok === true, adapterResult.code, "Fixture");

      const sessionResult = namespace.startSession({ actor: "IDE-170 Phase 5 Validation", purpose: "Phase 5 Fixture", requiredCapabilities: [CAPABILITY_ID] });
      const sessionId = sessionResult.ok ? sessionResult.data.session.sessionId : null;
      if (sessionId) artifacts.sessionIds.push(sessionId);
      check("Phase 5 fixture Session can start", sessionResult.ok === true, sessionResult.code, "Fixture");
      const intakeResult = namespace.captureSources(sessionId, { adapterIds: [adapterId], requiredAdapterIds: [adapterId], includeContent: true, actor: "IDE-170 Phase 5 Validation" });
      const intake = intakeResult.ok ? intakeResult.data.intake : null;
      if (intake) artifacts.intakeIds.push(intake.intakeId);
      check("Phase 5 fixture Source Intake succeeds", intakeResult.ok === true, intakeResult.code, "Fixture");
      const canonicalResult = namespace.buildCanonicalSnapshot(sessionId, { intakeId: intake && intake.intakeId, actor: "IDE-170 Phase 5 Validation" });
      const canonical = canonicalResult.ok ? canonicalResult.data.snapshot : null;
      if (canonical) artifacts.canonicalSnapshotIds.push(canonical.snapshotId);
      check("Phase 5 fixture Canonical Snapshot succeeds", canonicalResult.ok === true, canonicalResult.code, "Fixture");
      const repositoryResult = namespace.buildRepositoryBaseline(sessionId, { canonicalSnapshotId: canonical && canonical.snapshotId, actor: "IDE-170 Phase 5 Validation" });
      const repository = repositoryResult.ok ? repositoryResult.data.snapshot : null;
      if (repository) artifacts.repositorySnapshotIds.push(repository.snapshotId);
      check("Phase 5 fixture Repository Snapshot succeeds", repositoryResult.ok === true, repositoryResult.code, "Fixture");
      const graphResult = namespace.buildEvidenceGraph(sessionId, { canonicalSnapshotId: canonical && canonical.snapshotId, repositorySnapshotId: repository && repository.snapshotId, actor: "IDE-170 Phase 5 Validation" });
      const graph = graphResult.ok ? graphResult.data.graph : null;
      if (graph) artifacts.graphIds.push(graph.graphId);
      check("Phase 5 fixture Evidence Graph succeeds", graphResult.ok === true, graphResult.code, "Fixture");
      const understandingResult = runUnderstanding(sessionId, { canonicalSnapshotId: canonical && canonical.snapshotId, repositorySnapshotId: repository && repository.snapshotId, graphId: graph && graph.graphId, actor: "IDE-170 Phase 5 Validation" });
      const understanding = understandingResult.ok ? understandingResult.data.understanding : null;
      if (understanding) artifacts.understandingIds.push(understanding.understandingId);
      check("Understanding Result can be built and Frozen", understandingResult.ok === true && understanding.status === "Frozen", understandingResult.code, "Pipeline");
      check("File, Function, and Module structure is captured", Boolean(understanding && understanding.scope.sourceCoverage.recordTypeCounts.file === 3 && understanding.scope.sourceCoverage.recordTypeCounts.function === 3 && understanding.scope.sourceCoverage.recordTypeCounts.module === 2), understanding && understanding.scope.sourceCoverage.recordTypeCounts, "Structural Understanding");
      check("Structural Facts are produced", Boolean(understanding && understanding.facts.some(function fact(item) { return item.factType === "Repository Structural Relationship"; })), understanding && understanding.summary, "Structural Understanding");
      check("Direct Dependency is captured", Boolean(understanding && understanding.facts.some(function fact(item) { return item.factType === "Direct Dependency"; })), understanding && understanding.summary, "Relationship Understanding");
      check("Reverse Dependency is derived", Boolean(understanding && understanding.derivedResults.some(function result(item) { return item.derivedType === "Reverse Dependency"; })), understanding && understanding.summary, "Relationship Understanding");
      check("Transitive Dependency Path is derived", Boolean(understanding && understanding.derivedResults.some(function result(item) { return item.derivedType === "Transitive Dependency" && item.relationshipPath.length >= 2; })), understanding && understanding.summary, "Relationship Understanding");
      check("Circular Dependency remains Insight Candidate", Boolean(understanding && understanding.insights.some(function insight(item) { return item.insightType === "Circular Dependency Candidate" && item.factPromotionAllowed === false; })), understanding && understanding.summary, "Relationship Understanding");
      check("Change Trace is explicit for Baseline", Boolean(understanding && understanding.derivedResults.some(function result(item) { return item.derivedType === "Change Trace Summary" && item.detail.snapshotType === "baseline"; })), understanding && understanding.quality.warnings, "Change Understanding");
      check("Workflow Trace is derived", Boolean(understanding && understanding.derivedResults.some(function result(item) { return item.derivedType === "Workflow Trace"; })), understanding && understanding.summary, "Workflow Understanding");
      check("Workflow State Sequence is derived", Boolean(understanding && understanding.derivedResults.some(function result(item) { return item.derivedType === "Workflow State Sequence"; })), understanding && understanding.summary, "Workflow Understanding");
      check("Workflow changes File is retained as Fact", Boolean(understanding && understanding.facts.some(function fact(item) { return item.factType === "Workflow Repository Change"; })), understanding && understanding.summary, "Workflow Understanding");
      check("Cross-Domain Mapping retains Relationship Path", Boolean(understanding && understanding.derivedResults.some(function result(item) { return item.derivedType === "Cross-Domain Mapping" && item.relationshipPath.length >= 1; })), understanding && understanding.summary, "Cross-Domain Understanding");
      check("Fact Derived Insight collections are separated", Boolean(understanding && understanding.facts.every(function fact(item) { return item.resultKind === "Fact"; }) && understanding.derivedResults.every(function result(item) { return item.resultKind === "Derived Result"; }) && understanding.insights.every(function insight(item) { return item.resultKind === "Insight Candidate"; })), understanding && understanding.summary, "Governance");
      check("Every Insight has Evidence or Missing-Evidence explanation", Boolean(understanding && understanding.insights.every(function insight(item) { return item.evidence.length > 0 || item.explanation.missingEvidence.length > 0; })), understanding && understanding.insights.length, "Governance");
      check("Every Insight has structured Explanation", Boolean(understanding && understanding.insights.every(function insight(item) { return Boolean(item.explanation && item.explanation.summary); })), understanding && understanding.insights.length, "Governance");
      check("Candidate automatic Fact promotion is prohibited", Boolean(understanding && understanding.insights.every(function insight(item) { return item.factPromotionAllowed === false; })), understanding && understanding.insights.length, "Governance");
      check("Understanding Stage order is complete", Boolean(understanding && understanding.stages.length === 11 && understanding.stages.every(function stage(item, index) { return item.stageId === STAGE_ORDER[index]; })), understanding && understanding.stages.map(function map(item) { return item.stageId; }), "Pipeline");
      const resultValidation = understanding ? validateUnderstandingResult(understanding.understandingId) : null;
      check("Understanding Validation passes", Boolean(resultValidation && resultValidation.valid && resultValidation.failed === 0), resultValidation, "Validation");
      const copy = understanding ? getUnderstandingResult(understanding.understandingId) : null;
      if (copy && copy.facts[0]) copy.facts[0].factType = "Tampered";
      const protectedCopy = understanding ? getUnderstandingResult(understanding.understandingId) : null;
      check("Frozen Understanding is protected from external mutation", Boolean(protectedCopy && (!protectedCopy.facts[0] || protectedCopy.facts[0].factType !== "Tampered")), protectedCopy && protectedCopy.facts[0], "Integrity");
      const tampered = understanding ? getUnderstandingResult(understanding.understandingId) : null;
      if (tampered) tampered.integrity.understandingHash = "0".repeat(64);
      const tamperValidation = tampered ? validateUnderstandingResult(tampered) : null;
      check("Understanding tampering is detected", Boolean(tamperValidation && tamperValidation.valid === false), tamperValidation && tamperValidation.failed, "Integrity");
      const sessionFreeze = namespace.freezeSession(sessionId, { actor: "IDE-170 Phase 5 Validation", reason: "Fixture Complete" });
      check("Understanding Session can be Frozen", sessionFreeze.ok === true, sessionFreeze.code, "Session Lifecycle");

      let currentRepository = null;
      if (settings.androidRealDevicePassed === true) {
        const actual = await runCurrentRepositoryUnderstanding({ actor: settings.actor, includeContent: false, maximumDependencyPaths: 200, maximumCrossDomainPaths: 200 });
        currentRepository = actual.ok ? {
          passed: Boolean(actual.data && actual.data.understanding && actual.data.validation && actual.data.validation.valid),
          sessionId: actual.data.sessionId,
          intakeSummary: actual.data.intakeSummary,
          canonicalSummary: actual.data.canonicalSummary,
          repositorySummary: actual.data.repositorySummary,
          graphSummary: actual.data.graphSummary,
          understandingSummary: actual.data.understanding && actual.data.understanding.summary,
          sourceCoverage: actual.data.understanding && actual.data.understanding.scope.sourceCoverage,
          quality: actual.data.understanding && actual.data.understanding.quality
        } : { passed: false, code: actual.code, error: actual.error };
        check("Current Repository and Workflow Understanding can be built", Boolean(currentRepository.passed), currentRepository, "Android Current Repository");
      } else {
        check("Android current Repository Understanding remains an explicit Gate", settings.androidRealDevicePassed !== true, "Manual Android execution required", "Android Current Repository");
      }

      cleanup();
      check("Validation Understanding artifacts are isolated", artifacts.understandingIds.every(function id(value) { return namespace.getUnderstandingResult(value) === null; }), artifacts.understandingIds, "Validation Isolation");
      const passed = checks.filter(function item(value) { return value.passed; }).length;
      const total = checks.length;
      const result = {
        id: internal.nextId("IDE-170-PHASE5-VALIDATION"),
        componentId: namespace.componentId,
        name: "IDE-170 Phase 5 Repository and Workflow Understanding Validation",
        version: VERSION,
        valid: passed === total && total > 0,
        passed: passed,
        failed: total - passed,
        total: total,
        health: total ? Number(((passed / total) * 100).toFixed(2)) : 0,
        status: passed === total ? "Passed" : "Failed",
        checks: checks,
        regressionValidation: regression ? { valid: regression.valid, passed: regression.passed, failed: regression.failed, total: regression.total, health: regression.health } : null,
        currentRepository: currentRepository,
        phase5Gate: "Passed - Phase 4 Release Frozen",
        phase6Gate: passed === total && settings.androidRealDevicePassed === true ? "Passed" : "Blocked",
        androidRealDeviceValidation: {
          required: true,
          passed: settings.androidRealDevicePassed === true,
          device: internal.text(settings.device, settings.androidRealDevicePassed === true ? "Android Chrome" : ""),
          evidence: internal.text(settings.androidEvidence, ""),
          validatedAt: settings.androidRealDevicePassed === true ? internal.nowIso() : null
        },
        executedAt: internal.nowIso()
      };
      state.lastUnderstandingValidation = internal.clone(result);
      internal.touch();
      if (typeof internal.registerExternalIntegration === "function") internal.registerExternalIntegration();
      result.releaseStatus = namespace.getReleaseStatus();
      state.lastUnderstandingValidation = internal.clone(result);
      return internal.clone(result);
    } catch (error) {
      cleanup();
      const passed = checks.filter(function item(value) { return value.passed; }).length;
      const result = {
        id: internal.nextId("IDE-170-PHASE5-VALIDATION"), componentId: namespace.componentId,
        name: "IDE-170 Phase 5 Repository and Workflow Understanding Validation", version: VERSION,
        valid: false, passed: passed, failed: checks.length - passed + 1, total: checks.length + 1,
        health: 0, status: "Failed",
        checks: checks.concat([{ name: "Validation completed without exception", passed: false, detail: error && error.message || String(error), group: "Runtime", severity: "Critical" }]),
        phase5Gate: "Passed - Phase 4 Release Frozen", phase6Gate: "Blocked",
        androidRealDeviceValidation: { required: true, passed: false },
        error: internal.setError(error, "UNDERSTANDING_PHASE_VALIDATION_FAILED"), executedAt: internal.nowIso()
      };
      state.lastUnderstandingValidation = internal.clone(result);
      internal.touch();
      return result;
    }
  }

  function getUnderstandingStatus() {
    const latest = state.latestUnderstandingResultId ? state.understandingResults.get(state.latestUnderstandingResultId) : null;
    return {
      id: "IDE-170-UNDERSTANDING-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability(CAPABILITY_ID)),
      resultCount: state.understandingResults.size,
      latestUnderstandingId: latest && latest.understandingId || null,
      latestStatus: latest && latest.status || "Not Run",
      latestQualityStatus: latest && latest.quality.status || "Not Run",
      latestSummary: latest && internal.clone(latest.summary) || null,
      factDerivedInsightSeparated: true,
      missingInformationInferenceAllowed: false,
      candidateFactPromotionAllowed: false,
      updatedAt: state.updatedAt || internal.nowIso()
    };
  }

  function initializeUnderstandingPipeline() {
    const schemaResults = registerSchemas();
    const capabilityResult = registerCapability();
    const ready = schemaResults.every(function item(value) { return value.registered === true; }) && capabilityResult.ok === true;
    return internal.buildResult(ready,
      ready ? "UNDERSTANDING_PIPELINE_INITIALIZED" : "UNDERSTANDING_PIPELINE_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capabilityResult, stageOrder: STAGE_ORDER },
      ready ? {} : { error: { message: "Understanding Pipeline initialization failed.", category: "Initialization Failure" } }
    );
  }

  function removeUnderstandingForValidation(understandingId) {
    const id = internal.text(understandingId, "");
    const removed = state.understandingResults.delete(id);
    if (state.latestUnderstandingResultId === id) state.latestUnderstandingResultId = null;
    return removed;
  }

  Object.assign(internal, {
    understandingStageOrder: STAGE_ORDER,
    removeUnderstandingForValidation: removeUnderstandingForValidation
  });
  Object.assign(namespace.api, {
    initializeUnderstandingPipeline: initializeUnderstandingPipeline,
    runUnderstanding: runUnderstanding,
    runCurrentRepositoryUnderstanding: runCurrentRepositoryUnderstanding,
    getUnderstandingResult: getUnderstandingResult,
    getUnderstandingResults: getUnderstandingResults,
    validateUnderstandingResult: validateUnderstandingResult,
    runUnderstandingPhaseValidation: runUnderstandingPhaseValidation,
    getUnderstandingStatus: getUnderstandingStatus
  });
  Object.assign(namespace, {
    runUnderstanding: runUnderstanding,
    runCurrentRepositoryUnderstanding: runCurrentRepositoryUnderstanding,
    getUnderstandingResult: getUnderstandingResult,
    getUnderstandingResults: getUnderstandingResults,
    validateUnderstandingResult: validateUnderstandingResult,
    runUnderstandingPhaseValidation: runUnderstandingPhaseValidation,
    getUnderstandingStatus: getUnderstandingStatus
  });

  namespace.modules.understandingPipeline = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    stageCount: STAGE_ORDER.length,
    structuralUnderstanding: true,
    relationshipUnderstanding: true,
    changeUnderstanding: true,
    workflowUnderstanding: true,
    crossDomainUnderstanding: true,
    insightCandidate: true,
    immutableResult: true,
    directRepositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.validateIntelligenceUnderstanding = runUnderstandingPhaseValidation;
})(typeof window !== "undefined" ? window : globalThis);
