/* ============================================================
   FILE: 13_intelligence_validation_compiler.js
   IDE-170 Intelligence Platform
   Version: 1.5.0
   Architecture Decision: 011 v1.1.0
   Phase: Test Procedure Intake and Validation Compiler (Pre-Phase 4)
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Validation Compiler blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.5.0";
  const CAPABILITY_ID = "IDE-170-VALIDATION-COMPILER";

  if (!(state.validationDatasetCandidates instanceof Map)) state.validationDatasetCandidates = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestValidationDatasetCandidateId")) {
    state.latestValidationDatasetCandidateId = null;
  }
  if (!Object.prototype.hasOwnProperty.call(state, "activeImportedProcedureDatasetId")) {
    state.activeImportedProcedureDatasetId = null;
  }
  if (!Object.prototype.hasOwnProperty.call(state, "lastProcedureValidation")) {
    state.lastProcedureValidation = null;
  }

  function sha256(value) {
    return namespace.calculateSHA256(typeof value === "string" ? value : internal.stableStringify(value));
  }

  function candidateIdFor(parsed) {
    return internal.canonicalId("IDE-170-DATASET-CANDIDATE-" + parsed.procedureId.replace(/^IDE-170-PROCEDURE-/, ""));
  }

  function datasetIdFor(parsed, candidate) {
    const suffix = parsed.procedureId.replace(/^IDE-170-PROCEDURE-/, "");
    const revision = String(candidate.revision || 1).padStart(2, "0");
    return internal.canonicalId("IDE-170-DATASET-PROCEDURE-" + suffix + "-R" + revision);
  }

  function conditionToExpected(condition) {
    const source = internal.isPlainObject(condition) ? condition : {};
    if (source.comparator === "Numeric Range") {
      return {
        comparator: "Numeric Range",
        path: source.path || null,
        minimum: source.minimum,
        maximum: source.maximum
      };
    }
    if (source.comparator === "One Of") {
      return {
        comparator: "One Of",
        path: source.path || null,
        values: internal.clone(source.values || [])
      };
    }
    if (source.comparator === "Partial Object") {
      return {
        comparator: "Partial Object",
        path: source.path || null,
        value: internal.clone(source.expected)
      };
    }
    return {
      comparator: source.comparator === "Unrecognized" ? "Exact" : internal.text(source.comparator, "Exact"),
      path: source.path || null,
      value: internal.clone(source.expected)
    };
  }

  function buildExpected(step) {
    const recognized = step.expectedConditions.filter(function recognized(condition) {
      return condition && condition.comparator !== "Unrecognized";
    });
    if (!recognized.length) {
      return { comparator: "Type", value: "object" };
    }
    if (recognized.length === 1) return conditionToExpected(recognized[0]);
    return {
      comparator: "All",
      conditions: recognized.map(conditionToExpected)
    };
  }

  function buildOwnerSelection(step) {
    const selected = step.defaultSelected === true && step.executionPolicy !== "Prohibited" && step.executionPolicy !== "Unrecognized";
    return {
      stepId: step.stepId,
      originalPolicy: step.executionPolicy,
      finalPolicy: step.executionPolicy,
      defaultSelected: step.defaultSelected === true,
      selected: selected,
      selectedBy: selected ? "System Default" : null,
      selectedAt: selected ? internal.nowIso() : null,
      warningAcknowledged: false,
      warningReasons: internal.clone(step.warningReasons || []),
      executed: false,
      result: "Not Run"
    };
  }

  function compileTestProcedure(parsedProcedureInput, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const parsed = typeof parsedProcedureInput === "string"
      ? namespace.getParsedTestProcedure(parsedProcedureInput)
      : internal.isPlainObject(parsedProcedureInput)
        ? internal.clone(parsedProcedureInput)
        : null;
    if (!parsed) {
      return internal.buildResult(false, "PARSED_TEST_PROCEDURE_NOT_FOUND", "Blocked", null, {
        error: { message: "Parsed Test Procedure was not found.", category: "Input Failure" }
      });
    }

    const candidateId = internal.canonicalId(settings.candidateId || candidateIdFor(parsed));
    if (state.validationDatasetCandidates.has(candidateId) && settings.replace !== true) {
      return internal.buildResult(false, "VALIDATION_DATASET_CANDIDATE_DUPLICATE", "Blocked", {
        candidateId: candidateId
      }, {
        error: { message: "Validation Dataset Candidate already exists.", category: "Identity Failure" }
      });
    }

    const selections = parsed.steps.map(buildOwnerSelection);
    const warnings = parsed.parserWarnings.slice();
    parsed.steps.forEach(function collect(step) {
      if (!step.expectedConditions.length && step.executionPolicy !== "Manual Confirmation") {
        warnings.push(step.stepId + ": Expected Result was not recognized; Type comparator will be used until reviewed.");
      }
    });

    const now = internal.nowIso();
    const candidate = {
      candidateId: candidateId,
      componentId: namespace.componentId,
      version: internal.text(settings.version, parsed.procedureVersion || "1.0.0"),
      status: "Candidate",
      revision: 1,
      procedureId: parsed.procedureId,
      procedureVersion: parsed.procedureVersion,
      procedureHash: parsed.procedureHash,
      parsedProcedureId: parsed.parsedProcedureId,
      parseHash: parsed.parseHash,
      parserVersion: parsed.parserVersion,
      steps: internal.clone(parsed.steps),
      ownerSelections: selections,
      warnings: internal.unique(warnings),
      policySummary: internal.clone(parsed.policySummary),
      approvedDatasetId: null,
      approvedBy: null,
      approvedAt: null,
      createdBy: internal.text(settings.actor, "Project Owner"),
      createdAt: now,
      updatedAt: now,
      candidateHash: null
    };
    candidate.candidateHash = sha256(Object.assign({}, candidate, { candidateHash: null }));
    state.validationDatasetCandidates.set(candidateId, candidate);
    state.latestValidationDatasetCandidateId = candidateId;
    internal.touch();
    internal.appendAudit({
      action: "VALIDATION_DATASET_CANDIDATE_COMPILED",
      actor: candidate.createdBy,
      targetType: "Validation Dataset Candidate",
      targetId: candidateId,
      outcome: "Succeeded",
      detail: { stepCount: candidate.steps.length, policySummary: candidate.policySummary }
    });
    return internal.buildResult(true, "VALIDATION_DATASET_CANDIDATE_COMPILED", "Candidate", {
      candidate: getValidationDatasetCandidate(candidateId),
      executionPlan: getProcedureExecutionPlan(candidateId)
    });
  }

  function getValidationDatasetCandidate(candidateId) {
    const record = state.validationDatasetCandidates.get(internal.canonicalId(candidateId));
    return record ? internal.clone(record) : null;
  }

  function listValidationDatasetCandidates() {
    return [...state.validationDatasetCandidates.values()]
      .sort(function sort(left, right) { return left.createdAt.localeCompare(right.createdAt); })
      .map(internal.clone);
  }

  function updateProcedureStepSelection(candidateId, stepId, update, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const current = state.validationDatasetCandidates.get(internal.canonicalId(candidateId));
    if (!current) {
      return internal.buildResult(false, "VALIDATION_DATASET_CANDIDATE_NOT_FOUND", "Blocked", null, {
        error: { message: "Validation Dataset Candidate was not found.", category: "Input Failure" }
      });
    }
    if (current.status === "Approved" || Object.isFrozen(current)) {
      return internal.buildResult(false, "VALIDATION_DATASET_CANDIDATE_FROZEN", "Blocked", null, {
        error: { message: "Approved Candidate cannot be changed.", category: "Governance Failure" }
      });
    }
    const step = current.steps.find(function find(item) { return item.stepId === stepId; });
    const selection = current.ownerSelections.find(function find(item) { return item.stepId === stepId; });
    if (!step || !selection) {
      return internal.buildResult(false, "PROCEDURE_STEP_NOT_FOUND", "Blocked", null, {
        error: { message: "Procedure Step was not found.", category: "Input Failure" }
      });
    }
    const source = internal.isPlainObject(update) ? update : { selected: update === true };
    let finalPolicy = internal.text(source.finalPolicy, selection.finalPolicy);
    if (selection.originalPolicy === "Prohibited" || finalPolicy === "Prohibited") {
      return internal.buildResult(false, "PROHIBITED_PROCEDURE_STEP", "Blocked", {
        stepId: stepId,
        prohibitedReasons: internal.clone(step.prohibitedReasons)
      }, {
        error: { message: "Prohibited Step cannot be selected.", category: "Safety Boundary" }
      });
    }
    if (selection.originalPolicy === "Unrecognized" && source.convertToWarningSelectable === true) {
      finalPolicy = "Warning Selectable";
    }
    if (selection.originalPolicy === "Unrecognized" && finalPolicy !== "Warning Selectable") {
      return internal.buildResult(false, "UNRECOGNIZED_STEP_REVIEW_REQUIRED", "Blocked", {
        stepId: stepId
      }, {
        error: { message: "Unrecognized Step must be explicitly changed to Warning Selectable.", category: "Review Required" }
      });
    }
    const selected = source.selected === true;
    const warningAcknowledged = source.warningAcknowledged === true;
    if (selected && finalPolicy === "Warning Selectable" && !warningAcknowledged) {
      return internal.buildResult(false, "WARNING_ACKNOWLEDGEMENT_REQUIRED", "Blocked", {
        stepId: stepId,
        warningReasons: internal.clone(step.warningReasons)
      }, {
        error: { message: "Warning must be acknowledged before selecting this Step.", category: "Owner Approval Required" }
      });
    }
    selection.finalPolicy = finalPolicy;
    selection.selected = selected;
    selection.selectedBy = internal.text(source.selectedBy || settings.actor, "Project Owner");
    selection.selectedAt = internal.nowIso();
    selection.warningAcknowledged = warningAcknowledged;
    current.updatedAt = selection.selectedAt;
    current.revision += 1;
    current.candidateHash = sha256(Object.assign({}, current, { candidateHash: null }));
    internal.touch();
    internal.appendAudit({
      action: "PROCEDURE_STEP_SELECTION_UPDATED",
      actor: selection.selectedBy,
      targetType: "Validation Dataset Candidate",
      targetId: current.candidateId,
      outcome: selected ? "Selected" : "Not Selected",
      detail: internal.clone(selection)
    });
    return internal.buildResult(true, "PROCEDURE_STEP_SELECTION_UPDATED", selected ? "Selected" : "Not Selected", {
      selection: internal.clone(selection),
      executionPlan: getProcedureExecutionPlan(current.candidateId)
    });
  }

  function getProcedureExecutionPlan(candidateId) {
    const candidate = getValidationDatasetCandidate(candidateId);
    if (!candidate) return null;
    const plan = candidate.steps.map(function map(step) {
      const selection = candidate.ownerSelections.find(function find(item) { return item.stepId === step.stepId; });
      return {
        stepId: step.stepId,
        order: step.order,
        title: step.title,
        executionPolicy: selection ? selection.finalPolicy : step.executionPolicy,
        defaultSelected: step.defaultSelected,
        selected: Boolean(selection && selection.selected),
        warningAcknowledged: Boolean(selection && selection.warningAcknowledged),
        warningLevel: step.warningLevel,
        warningReasons: internal.clone(step.warningReasons),
        prohibitedReasons: internal.clone(step.prohibitedReasons),
        executionCode: step.executionCode,
        expectedConditions: internal.clone(step.expectedConditions),
        manualConfirmation: step.manualConfirmation,
        finalGate: step.finalGate
      };
    });
    return {
      candidateId: candidate.candidateId,
      procedureId: candidate.procedureId,
      status: candidate.status,
      total: plan.length,
      selected: plan.filter(function count(item) { return item.selected; }).length,
      autoExecutable: plan.filter(function count(item) { return item.executionPolicy === "Auto Executable"; }).length,
      warningSelectable: plan.filter(function count(item) { return item.executionPolicy === "Warning Selectable"; }).length,
      manualConfirmation: plan.filter(function count(item) { return item.executionPolicy === "Manual Confirmation"; }).length,
      prohibited: plan.filter(function count(item) { return item.executionPolicy === "Prohibited"; }).length,
      unrecognized: plan.filter(function count(item) { return item.executionPolicy === "Unrecognized"; }).length,
      steps: plan
    };
  }

  function createTestCase(step, selection, candidate) {
    const expected = buildExpected(step);
    const caseId = internal.canonicalId(
      "IDE-170-PROCEDURE-TEST-" + candidate.procedureId.replace(/^IDE-170-PROCEDURE-/, "") + "-" + step.stepId
    );
    const warningSelectable = selection.finalPolicy === "Warning Selectable";
    const input = internal.clone(step.input || {});
    if (warningSelectable && step.targetId === "IDE-170-TARGET-OWNER-APPROVED-CODE") {
      input.code = step.executionCode;
      input.ownerApproved = true;
      input.approvedBy = selection.selectedBy;
      input.warningAcknowledged = selection.warningAcknowledged;
    }
    return {
      caseId: caseId,
      name: step.title,
      description: step.description,
      category: step.finalGate ? "Final Gate" : "Imported Test Procedure",
      severity: step.finalGate ? "High" : "High",
      target: step.executionType === "Manual Confirmation" ? "" : step.targetId,
      executionType: step.executionType,
      executionPolicy: selection.finalPolicy,
      warningLevel: step.warningLevel,
      warningReasons: internal.clone(step.warningReasons),
      selectedByOwner: warningSelectable ? selection.selected === true : null,
      input: input,
      preconditions: [],
      expected: expected,
      timeout: warningSelectable ? 60000 : 15000,
      dependencies: [],
      tags: ["Imported Procedure", step.stepId, step.finalGate ? "Final Gate" : "Step"],
      enabled: selection.selected === true,
      required: step.required !== false,
      retry: {
        maximumAttempts: /Not Ready|Loading|Pending/i.test(step.expectedText || "") ? 3 : 1,
        intervalMs: 500,
        retryOn: ["Not Ready", "Module Loading", "Initialization Pending"]
      },
      createdAt: internal.nowIso(),
      updatedAt: internal.nowIso()
    };
  }

  function approveValidationDatasetCandidate(candidateId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const current = state.validationDatasetCandidates.get(internal.canonicalId(candidateId));
    if (!current) {
      return internal.buildResult(false, "VALIDATION_DATASET_CANDIDATE_NOT_FOUND", "Blocked", null, {
        error: { message: "Validation Dataset Candidate was not found.", category: "Input Failure" }
      });
    }
    if (current.status === "Approved") {
      return internal.buildResult(true, "VALIDATION_DATASET_CANDIDATE_ALREADY_APPROVED", "Frozen", {
        candidate: getValidationDatasetCandidate(current.candidateId),
        dataset: namespace.getTestDataset(current.approvedDatasetId)
      });
    }
    const selectedSteps = current.steps.filter(function select(step) {
      const selection = current.ownerSelections.find(function find(item) { return item.stepId === step.stepId; });
      return selection && selection.selected === true;
    });
    if (!selectedSteps.length) {
      return internal.buildResult(false, "NO_PROCEDURE_STEPS_SELECTED", "Blocked", null, {
        error: { message: "At least one Step must be selected.", category: "Owner Selection Failure" }
      });
    }
    const unacknowledged = selectedSteps.find(function find(step) {
      const selection = current.ownerSelections.find(function item(value) { return value.stepId === step.stepId; });
      return selection.finalPolicy === "Warning Selectable" && selection.warningAcknowledged !== true;
    });
    if (unacknowledged) {
      return internal.buildResult(false, "WARNING_ACKNOWLEDGEMENT_REQUIRED", "Blocked", { stepId: unacknowledged.stepId }, {
        error: { message: "All selected Warning Steps must be acknowledged.", category: "Owner Approval Required" }
      });
    }
    const prohibited = selectedSteps.find(function find(step) {
      const selection = current.ownerSelections.find(function item(value) { return value.stepId === step.stepId; });
      return selection.finalPolicy === "Prohibited";
    });
    if (prohibited) {
      return internal.buildResult(false, "PROHIBITED_PROCEDURE_STEP", "Blocked", { stepId: prohibited.stepId }, {
        error: { message: "Prohibited Step cannot be compiled.", category: "Safety Boundary" }
      });
    }

    const datasetId = internal.canonicalId(settings.datasetId || datasetIdFor(current, current));
    const dataset = {
      datasetId: datasetId,
      name: "Imported Procedure - " + current.procedureId,
      version: internal.text(settings.version, current.version || "1.0.0"),
      componentId: namespace.componentId,
      targetPhase: namespace.implementationPhase,
      status: "Frozen",
      description: "Compiled from an imported Test Procedure after Project Owner review.",
      sourceProcedureId: current.procedureId,
      sourceProcedureVersion: current.procedureVersion,
      sourceProcedureHash: current.procedureHash,
      parsedProcedureId: current.parsedProcedureId,
      candidateId: current.candidateId,
      ownerSelections: internal.clone(current.ownerSelections),
      warnings: internal.clone(current.warnings),
      testCases: selectedSteps.map(function map(step) {
        const selection = current.ownerSelections.find(function find(item) { return item.stepId === step.stepId; });
        return createTestCase(step, selection, current);
      }),
      metadata: {
        architectureDecision: "IDE-170-ARCHITECTURE-DECISION-011-v1.1.0",
        parserVersion: current.parserVersion,
        parseHash: current.parseHash,
        candidateHash: current.candidateHash,
        automaticExecutionOnStartup: false,
        repositoryMutationAllowed: false
      },
      createdAt: internal.nowIso(),
      updatedAt: internal.nowIso(),
      frozenAt: internal.nowIso()
    };
    const registration = namespace.registerTestDataset(dataset, { actor: internal.text(settings.actor, "Project Owner") });
    if (!registration.ok) return registration;

    current.status = "Approved";
    current.approvedDatasetId = datasetId;
    current.approvedBy = internal.text(settings.actor, "Project Owner");
    current.approvedAt = internal.nowIso();
    current.updatedAt = current.approvedAt;
    current.candidateHash = sha256(Object.assign({}, current, { candidateHash: null }));
    state.validationDatasetCandidates.set(current.candidateId, internal.deepFreeze(internal.clone(current)));
    state.activeImportedProcedureDatasetId = datasetId;
    internal.touch();
    internal.appendAudit({
      action: "VALIDATION_DATASET_CANDIDATE_APPROVED",
      actor: current.approvedBy,
      targetType: "Validation Dataset Candidate",
      targetId: current.candidateId,
      outcome: "Succeeded",
      detail: { datasetId: datasetId, testCaseCount: dataset.testCases.length }
    });
    return internal.buildResult(true, "VALIDATION_DATASET_CANDIDATE_APPROVED", "Frozen", {
      candidate: getValidationDatasetCandidate(current.candidateId),
      dataset: namespace.getTestDataset(datasetId)
    });
  }

  function createSameOriginFetch() {
    return async function sameOriginFetch(input, init) {
      if (typeof global.fetch !== "function") throw Object.assign(new Error("fetch is unavailable."), { code: "FETCH_UNAVAILABLE" });
      const base = global.location && global.location.href ? global.location.href : "https://local.invalid/";
      const url = new URL(typeof input === "string" ? input : input.url, base);
      const baseOrigin = new URL(base).origin;
      if (url.origin !== baseOrigin) {
        throw Object.assign(new Error("Owner Approved Code is limited to same-origin Network access."), { code: "EXTERNAL_NETWORK_PROHIBITED" });
      }
      return global.fetch(input, init);
    };
  }

  function validateOwnerApprovedCode(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const code = internal.text(source.code, "");
    const classification = internal.classifyTestProcedureCode
      ? internal.classifyTestProcedureCode(code, { manual: false })
      : { policy: "Warning Selectable", prohibitedReasons: [] };
    if (!code || source.ownerApproved !== true || source.warningAcknowledged !== true) {
      throw Object.assign(new Error("Owner Approved Code requires explicit approval and warning acknowledgement."), {
        code: "OWNER_APPROVAL_REQUIRED"
      });
    }
    if (classification.policy === "Prohibited") {
      throw Object.assign(new Error("Owner Approved Code contains a prohibited operation."), {
        code: "OWNER_APPROVED_CODE_PROHIBITED",
        detail: classification.prohibitedReasons
      });
    }
    return code;
  }

  async function executeOwnerApprovedCode(input) {
    const code = validateOwnerApprovedCode(input);
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const parameters = [
      "IDE170Intelligence",
      "getAIDevelopmentWorkflowStatus",
      "getIntelligencePlatformStatus",
      "getIntelligencePlatformReleaseStatus",
      "navigator",
      "document",
      "URL",
      "performance",
      "console",
      "fetch",
      "window",
      "globalThis",
      "self",
      "localStorage",
      "sessionStorage",
      "location",
      "XMLHttpRequest",
      "WebSocket",
      "Function"
    ];
    const values = [
      namespace,
      typeof global.getAIDevelopmentWorkflowStatus === "function" ? global.getAIDevelopmentWorkflowStatus : undefined,
      typeof global.getIntelligencePlatformStatus === "function" ? global.getIntelligencePlatformStatus : undefined,
      typeof global.getIntelligencePlatformReleaseStatus === "function" ? global.getIntelligencePlatformReleaseStatus : undefined,
      global.navigator || {},
      global.document,
      global.URL,
      global.performance,
      global.console,
      createSameOriginFetch(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    ];
    let implementation;
    try {
      implementation = new AsyncFunction(...parameters, '"use strict"; return await (' + code + ');');
    } catch (expressionError) {
      implementation = new AsyncFunction(...parameters, '"use strict"; ' + code);
    }
    return implementation(...values);
  }

  function registerCompilerTargets() {
    const results = [];
    function add(definition, implementation) {
      if (namespace.getValidationTarget(definition.targetId)) {
        results.push({ targetId: definition.targetId, registered: true, existing: true });
        return;
      }
      const result = namespace.registerValidationTarget(definition, implementation);
      results.push({ targetId: definition.targetId, registered: result.ok === true, code: result.code });
    }
    add({ targetId: "IDE-170-TARGET-CURRENT-STATUS", name: "IDE-170 Current Status", executionTypes: ["Status Probe", "Regression Probe"] }, function statusTarget() {
      return namespace.getStatus();
    });
    add({ targetId: "IDE-170-TARGET-CURRENT-RELEASE", name: "IDE-170 Current Release", executionTypes: ["Status Probe", "Regression Probe"] }, function releaseTarget() {
      return namespace.getReleaseStatus();
    });
    add({ targetId: "IDE-170-TARGET-OWNER-APPROVED-CODE", name: "Owner Approved Procedure Code", executionTypes: ["Function", "Async Function", "Download Generation", "Owner Approved Code"] }, executeOwnerApprovedCode);
    return results;
  }

  async function runImportedTestProcedure(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    let datasetId = internal.canonicalId(settings.datasetId || state.activeImportedProcedureDatasetId || "");
    if (!datasetId && settings.candidateId) {
      const candidate = getValidationDatasetCandidate(settings.candidateId);
      datasetId = candidate && candidate.approvedDatasetId;
    }
    if (!datasetId) {
      return internal.buildResult(false, "IMPORTED_TEST_DATASET_NOT_APPROVED", "Blocked", {
        executionPlan: state.latestValidationDatasetCandidateId
          ? getProcedureExecutionPlan(state.latestValidationDatasetCandidateId)
          : null
      }, {
        error: { message: "Import, review, and approve a Test Procedure before execution.", category: "Owner Review Required" }
      });
    }

    const runResult = await namespace.runAutomatedValidation(datasetId, {
      actor: internal.text(settings.actor, "Project Owner"),
      onProgress: settings.onProgress,
      signal: settings.signal,
      cancelled: settings.cancelled
    });
    if (!runResult.ok) return runResult;
    const runId = runResult.data.validationRun.validationRunId;
    const dataset = namespace.getTestDataset(datasetId);
    const confirmations = Array.isArray(settings.manualConfirmations) ? settings.manualConfirmations : [];
    confirmations.forEach(function confirm(item) {
      namespace.addManualConfirmation(runId, item, { actor: internal.text(settings.confirmedBy || settings.actor, "Project Owner") });
    });

    const runBeforeFreeze = namespace.getValidationRun(runId);
    const freeze = namespace.freezeValidationRun(runId, { actor: internal.text(settings.actor, "Project Owner") });
    if (!freeze.ok) return freeze;
    const evidence = await namespace.buildValidationEvidencePackage(runId, {
      actor: internal.text(settings.actor, "Project Owner"),
      download: settings.downloadEvidence === true,
      onProgress: settings.onEvidenceProgress
    });
    const evidenceValidation = evidence.ok
      ? await namespace.validateValidationEvidencePackage(evidence.data.packageId)
      : null;
    const finalRun = namespace.getValidationRun(runId);
    return {
      ok: Boolean(evidence.ok && evidenceValidation && evidenceValidation.valid),
      code: evidence.ok ? "IMPORTED_TEST_PROCEDURE_COMPLETED" : evidence.code,
      status: finalRun && finalRun.summary.requiredGatePassed ? "Passed" : "Blocked",
      data: {
        dataset: dataset,
        validationRun: finalRun,
        validationRunBeforeFreeze: runBeforeFreeze,
        evidencePackageId: evidence.ok ? evidence.data.packageId : null,
        evidenceFileName: evidence.ok ? evidence.data.fileName : null,
        evidenceValidation: evidenceValidation
      },
      warnings: evidence.warnings || [],
      error: evidence.error || null,
      createdAt: internal.nowIso()
    };
  }

  async function runCurrentPhaseValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (settings.file || settings.procedure || settings.content) {
      const source = settings.file || settings.procedure || {
        content: settings.content,
        fileName: settings.fileName || "test-procedure.txt"
      };
      const imported = await namespace.importTestProcedure(source, settings);
      if (!imported.ok) return imported;
      const parsed = namespace.parseTestProcedure(imported.data.procedure.procedureId, settings);
      if (!parsed.ok) return parsed;
      const compiled = namespace.compileTestProcedure(parsed.data.parsedProcedure.parsedProcedureId, settings);
      if (!compiled.ok) return compiled;
      return internal.buildResult(true, "TEST_PROCEDURE_REVIEW_REQUIRED", "Review Required", {
        procedure: imported.data.procedure,
        parsedProcedure: parsed.data.parsedProcedure,
        candidate: compiled.data.candidate,
        executionPlan: compiled.data.executionPlan
      });
    }
    if (state.activeImportedProcedureDatasetId && settings.executeApproved === true) {
      return runImportedTestProcedure(settings);
    }
    if (settings.openUI !== false && typeof namespace.openTestProcedureValidationConsole === "function") {
      namespace.openTestProcedureValidationConsole();
      return internal.buildResult(true, "TEST_PROCEDURE_UI_OPENED", "Review Required", {
        activeDatasetId: state.activeImportedProcedureDatasetId || null
      });
    }
    return internal.buildResult(false, "TEST_PROCEDURE_IMPORT_REQUIRED", "Blocked", null, {
      error: { message: "Import and approve a Test Procedure first.", category: "Input Required" }
    });
  }

  async function runTestProcedureCompilerValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group || "Foundation", severity: "High" });
    }
    const unique = Date.now().toString(36).toUpperCase();
    const procedureText = `============================================================
1. Status確認
============================================================

実行:

IDE170Intelligence.getStatus()

期待結果:

version = "${VERSION}"
ready = true
modules.testProcedureIntake = true
modules.testProcedureParser = true
modules.validationCompiler = true

============================================================
2. 警告付き状態確認
============================================================

実行:

(async () => IDE170Intelligence.getReleaseStatus())()

期待結果:

componentId = "IDE-170"

警告:

状態取得用の複合コードとしてOwner確認後に実行する。

============================================================
3. Android確認
============================================================

手動確認:

- Android Chromeで画面とDownloadを確認した

============================================================
4. 実行禁止確認
============================================================

実行:

github push --force

期待結果:

blocked = true

============================================================
5. 認識不能確認
============================================================

このSectionには実行コードがありません。
`;
    try {
      const foundationValidation = await namespace.runValidationAutomationFoundationValidation({
        actor: internal.text(settings.actor, "IDE-170 Validation"),
        confirmedBy: internal.text(settings.confirmedBy || settings.actor, "Project Owner"),
        androidRealDevicePassed: settings.androidRealDevicePassed === true,
        device: internal.text(settings.device, ""),
        androidEvidence: internal.text(settings.androidEvidence, ""),
        downloadEvidence: false
      });
      check(
        "Validation Automation Foundation remains Passed",
        Boolean(foundationValidation && foundationValidation.valid === true && foundationValidation.failed === 0),
        foundationValidation ? "passed=" + foundationValidation.passed + "/" + foundationValidation.total : "Unavailable",
        "Foundation Regression"
      );
      check("Test Procedure Intake module is Ready", namespace.modules.testProcedureIntake && namespace.modules.testProcedureIntake.status === "Ready", JSON.stringify(namespace.modules.testProcedureIntake), "Module");
      check("Test Procedure Parser module is Ready", namespace.modules.testProcedureParser && namespace.modules.testProcedureParser.status === "Ready", JSON.stringify(namespace.modules.testProcedureParser), "Module");
      check("Validation Compiler module is Ready", namespace.modules.validationCompiler && namespace.modules.validationCompiler.status === "Ready", JSON.stringify(namespace.modules.validationCompiler), "Module");
      check("Test Procedure UI module is Ready", namespace.modules.testProcedureUI && namespace.modules.testProcedureUI.status === "Ready", JSON.stringify(namespace.modules.testProcedureUI), "Module");

      const imported = await namespace.importTestProcedure({
        content: procedureText,
        fileName: "IDE-170_Validation_Procedure_" + unique + ".txt"
      }, {
        procedureId: "IDE-170-PROCEDURE-VALIDATION-" + unique,
        name: "Procedure Compiler Validation",
        version: "1.0.0",
        actor: "IDE-170 Validation"
      });
      check("TXT Test Procedure can be imported", imported.ok === true, imported.code, "Intake");
      check("Imported Procedure is Frozen", imported.ok && imported.data.procedure.status === "Frozen", imported.ok && imported.data.procedure.status, "Intake");
      check("Imported Procedure has SHA-256", imported.ok && imported.data.procedure.procedureHash.length === 64, imported.ok && imported.data.procedure.procedureHash, "Integrity");

      const markdownImport = await namespace.importTestProcedure({ content: "# Test\n\n実行:\n\nIDE170Intelligence.getStatus()\n\n期待結果:\n\nready = true\n", fileName: "validation.md" }, { procedureId: "IDE-170-PROCEDURE-MD-" + unique, version: "1.0.0", actor: "IDE-170 Validation" });
      check("Markdown Test Procedure can be imported", markdownImport.ok === true, markdownImport.code, "Intake");
      const jsonImport = await namespace.importTestProcedure({ content: JSON.stringify({ steps: [{ stepId: "STEP-001", title: "JSON", executionCode: "IDE170Intelligence.getStatus()", expected: { path: "ready", comparator: "Exact", value: true } }] }), fileName: "validation.json" }, { procedureId: "IDE-170-PROCEDURE-JSON-" + unique, version: "1.0.0", actor: "IDE-170 Validation" });
      check("JSON Test Procedure can be imported", jsonImport.ok === true, jsonImport.code, "Intake");

      const parsed = namespace.parseTestProcedure(imported.data.procedure.procedureId, { actor: "IDE-170 Validation" });
      const parsedRecord = parsed.ok ? parsed.data.parsedProcedure : null;
      check("Test Procedure can be parsed", parsed.ok === true, parsed.code, "Parser");
      check("Executable Steps are recognized", parsedRecord && parsedRecord.stepCount >= 4, parsedRecord && parsedRecord.stepCount, "Parser");
      check("Expected Results are recognized", parsedRecord && parsedRecord.steps.some(function item(step) { return step.expectedConditions.length >= 3; }), "Expected Conditions", "Parser");
      check("Auto Executable is classified", parsedRecord && parsedRecord.policySummary["Auto Executable"] >= 1, JSON.stringify(parsedRecord && parsedRecord.policySummary), "Policy");
      check("Warning Selectable is classified", parsedRecord && parsedRecord.policySummary["Warning Selectable"] >= 1, JSON.stringify(parsedRecord && parsedRecord.policySummary), "Policy");
      check("Manual Confirmation is classified", parsedRecord && parsedRecord.policySummary["Manual Confirmation"] >= 1, JSON.stringify(parsedRecord && parsedRecord.policySummary), "Policy");
      check("Prohibited is classified", parsedRecord && parsedRecord.policySummary.Prohibited >= 1, JSON.stringify(parsedRecord && parsedRecord.policySummary), "Policy");

      const compiled = namespace.compileTestProcedure(parsedRecord.parsedProcedureId, { actor: "IDE-170 Validation" });
      const candidate = compiled.ok ? compiled.data.candidate : null;
      check("Validation Dataset Candidate can be compiled", compiled.ok === true, compiled.code, "Compiler");
      check("Execution Plan can be generated", compiled.ok && compiled.data.executionPlan.total >= 4, JSON.stringify(compiled.ok && compiled.data.executionPlan), "Compiler");

      const prohibitedStep = candidate.steps.find(function find(step) { return step.executionPolicy === "Prohibited"; });
      const prohibitedSelection = namespace.updateProcedureStepSelection(candidate.candidateId, prohibitedStep.stepId, { selected: true, warningAcknowledged: true }, { actor: "IDE-170 Validation" });
      check("Prohibited Step selection is blocked", prohibitedSelection.ok === false && prohibitedSelection.code === "PROHIBITED_PROCEDURE_STEP", prohibitedSelection.code, "Safety");

      const warningStep = candidate.steps.find(function find(step) { return step.executionPolicy === "Warning Selectable"; });
      const warningWithoutAck = namespace.updateProcedureStepSelection(candidate.candidateId, warningStep.stepId, { selected: true }, { actor: "IDE-170 Validation" });
      check("Warning Step requires acknowledgement", warningWithoutAck.ok === false && warningWithoutAck.code === "WARNING_ACKNOWLEDGEMENT_REQUIRED", warningWithoutAck.code, "Owner Selection");
      const warningSelection = namespace.updateProcedureStepSelection(candidate.candidateId, warningStep.stepId, { selected: true, warningAcknowledged: true, selectedBy: "Project Owner" }, { actor: "Project Owner" });
      check("Warning Step can be selected after acknowledgement", warningSelection.ok === true, warningSelection.code, "Owner Selection");

      const approved = namespace.approveValidationDatasetCandidate(candidate.candidateId, { actor: "Project Owner", version: "1.0.0" });
      check("Validation Dataset Candidate can be approved", approved.ok === true, approved.code, "Compiler");
      check("Compiled Dataset is Frozen", approved.ok && approved.data.dataset.status === "Frozen", approved.ok && approved.data.dataset.status, "Compiler");
      check("Compiled Dataset preserves Procedure reference", approved.ok && approved.data.dataset.sourceProcedureId === imported.data.procedure.procedureId, approved.ok && approved.data.dataset.sourceProcedureId, "Evidence");

      const manualCase = approved.data.dataset.testCases.find(function find(testCase) { return testCase.executionType === "Manual Confirmation"; });
      const confirmations = settings.androidRealDevicePassed === true && manualCase ? [{
        caseId: manualCase.caseId,
        testType: "Android Real Device Confirmation",
        description: "Imported Procedure Android real-device checks completed.",
        required: true,
        confirmed: true,
        confirmedBy: internal.text(settings.confirmedBy || settings.actor, "Project Owner"),
        device: internal.text(settings.device, "Android Chrome"),
        evidence: internal.text(settings.androidEvidence, "Android Test Procedure Intake and Compiler checks passed.")
      }] : [];

      const execution = await namespace.runImportedTestProcedure({
        datasetId: approved.data.dataset.datasetId,
        actor: internal.text(settings.actor, "IDE-170 Validation"),
        confirmedBy: internal.text(settings.confirmedBy, "Project Owner"),
        manualConfirmations: confirmations,
        downloadEvidence: settings.downloadEvidence === true
      });
      const run = execution.data && execution.data.validationRun;
      check("Imported Test Procedure can be executed", Boolean(execution.data && run), execution.code, "Runner");
      check("Expected Result comparison is generated", Boolean(run && run.comparisons.length === run.caseResults.length), run && run.comparisons.length, "Comparator");
      check("Warning-selected Code executes", Boolean(run && run.caseResults.some(function item(result) { return result.caseId.includes(warningStep.stepId) && result.status === "Passed"; })), "Warning Case", "Runner");
      if (settings.androidRealDevicePassed === true) {
        check("Required Manual Confirmation passes", Boolean(run && run.summary.requiredGatePassed === true), JSON.stringify(run && run.summary), "Manual Confirmation");
      } else {
        check("Required Manual Confirmation remains explicit", Boolean(run && run.summary.blocked >= 1), JSON.stringify(run && run.summary), "Manual Confirmation");
      }
      const evidenceValidation = execution.data && execution.data.evidenceValidation;
      check("Extended Evidence Package can be generated", Boolean(execution.data && execution.data.evidencePackageId), execution.data && execution.data.evidencePackageId, "Evidence");
      check("Extended Evidence Package passes re-validation", Boolean(evidenceValidation && evidenceValidation.valid === true), JSON.stringify(evidenceValidation), "Evidence");
      const evidenceRecord = execution.data && namespace.getValidationEvidencePackage(execution.data.evidencePackageId);
      check("Original Procedure is stored in Evidence", Boolean(evidenceRecord && Object.keys(evidenceRecord.artifacts).some(function path(name) { return name.indexOf("original-test-procedure.") === 0; })), evidenceRecord && Object.keys(evidenceRecord.artifacts), "Evidence");
      check("Parsed Procedure is stored in Evidence", Boolean(evidenceRecord && evidenceRecord.artifacts["parsed-test-procedure.json"]), "parsed-test-procedure.json", "Evidence");
      check("Owner Selections are stored in Evidence", Boolean(evidenceRecord && evidenceRecord.artifacts["owner-selections.json"]), "owner-selections.json", "Evidence");
      const ownerSelectionEvidence = evidenceRecord && evidenceRecord.artifacts["owner-selections.json"]
        ? JSON.parse(evidenceRecord.artifacts["owner-selections.json"])
        : [];
      const selectedOwnerSelections = ownerSelectionEvidence.filter(function selected(item) { return item.selected === true; });
      check(
        "Owner Selection Evidence reflects execution results",
        Boolean(selectedOwnerSelections.length && selectedOwnerSelections.every(function executed(item) {
          return item.executed === true && item.result !== "Not Run" && Boolean(item.caseId) && Boolean(item.executedAt);
        })),
        JSON.stringify(selectedOwnerSelections),
        "Evidence Metadata"
      );
      const originalProcedurePath = evidenceRecord && Object.keys(evidenceRecord.artifacts).find(function findOriginal(name) {
        return name.indexOf("original-test-procedure.") === 0;
      });
      const originalProcedureEntry = evidenceRecord && originalProcedurePath
        ? evidenceRecord.manifest.artifacts.find(function findEntry(item) { return item.path === originalProcedurePath; })
        : null;
      const originalProcedureContent = evidenceRecord && originalProcedurePath
        ? evidenceRecord.artifacts[originalProcedurePath]
        : null;
      const originalProcedureByteSize = typeof originalProcedureContent === "string"
        ? (typeof global.TextEncoder === "function"
          ? new global.TextEncoder().encode(originalProcedureContent).length
          : new global.Blob([originalProcedureContent]).size)
        : -1;
      check(
        "Evidence Manifest stores UTF-8 byte size and character count",
        Boolean(
          originalProcedureEntry &&
          originalProcedureEntry.size === originalProcedureByteSize &&
          originalProcedureEntry.byteSize === originalProcedureByteSize &&
          originalProcedureEntry.characterCount === originalProcedureContent.length
        ),
        JSON.stringify(originalProcedureEntry),
        "Evidence Metadata"
      );
      check(
        "Test Procedure UI supports non-blocking manual confirmation",
        Boolean(
          namespace.modules.testProcedureUI &&
          namespace.modules.testProcedureUI.nonBlockingMinimize === true &&
          namespace.modules.testProcedureUI.persistentCloseState === true &&
          typeof namespace.minimizeTestProcedureValidationConsole === "function" &&
          typeof namespace.restoreTestProcedureValidationConsole === "function"
        ),
        JSON.stringify(namespace.modules.testProcedureUI),
        "User Interface"
      );
      check("Automatic Startup execution remains prohibited", namespace.modules.validationAutomation.automaticStartupExecution === false, String(namespace.modules.validationAutomation.automaticStartupExecution), "Safety");
      check("Repository automatic mutation remains prohibited", namespace.getStatus().directRepositoryMutationAllowed === false, String(namespace.getStatus().directRepositoryMutationAllowed), "Safety");
      check("GitHub automatic reflection remains prohibited", namespace.getStatus().githubAutomaticReflectionAllowed === false, String(namespace.getStatus().githubAutomaticReflectionAllowed), "Safety");

      const approvedDatasetId = approved.ok && approved.data.dataset.datasetId;
      const candidateRemoved = internal.removeValidationDatasetCandidateForValidation
        ? internal.removeValidationDatasetCandidateForValidation(candidate.candidateId)
        : false;
      const parsedRemoved = internal.removeParsedTestProcedureForValidation
        ? internal.removeParsedTestProcedureForValidation(parsedRecord.parsedProcedureId)
        : false;
      const procedureRemoved = internal.removeTestProcedureForValidation
        ? internal.removeTestProcedureForValidation(imported.data.procedure.procedureId)
        : false;
      const markdownRemoved = internal.removeTestProcedureForValidation
        ? internal.removeTestProcedureForValidation(markdownImport.data.procedure.procedureId)
        : false;
      const jsonRemoved = internal.removeTestProcedureForValidation
        ? internal.removeTestProcedureForValidation(jsonImport.data.procedure.procedureId)
        : false;
      if (state.activeImportedProcedureDatasetId === approvedDatasetId) state.activeImportedProcedureDatasetId = null;
      check("Validation Candidate and compiled Dataset are isolated", candidateRemoved === true && !namespace.getTestDataset(approvedDatasetId), approvedDatasetId, "Validation Isolation");
      check("Validation Parsed Procedure is isolated", parsedRemoved === true && !namespace.getParsedTestProcedure(parsedRecord.parsedProcedureId), parsedRecord.parsedProcedureId, "Validation Isolation");
      check("Validation original Procedures are isolated", procedureRemoved === true && markdownRemoved === true && jsonRemoved === true, imported.data.procedure.procedureId, "Validation Isolation");

      const passed = checks.filter(function count(item) { return item.passed; }).length;
      const valid = checks.length > 0 && passed === checks.length;
      const result = {
        id: internal.nextId("IDE-170-PROCEDURE-FOUNDATION-VALIDATION"),
        componentId: namespace.componentId,
        name: "IDE-170 Test Procedure Intake and Validation Compiler Validation",
        version: VERSION,
        architectureDecisionVersion: "011-v1.1.0",
        valid: valid,
        passed: passed,
        failed: checks.length - passed,
        total: checks.length,
        health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
        status: valid ? "Passed" : "Failed",
        checks: checks,
        androidRealDeviceValidation: {
          required: true,
          passed: settings.androidRealDevicePassed === true,
          device: internal.text(settings.device, ""),
          evidence: internal.text(settings.androidEvidence, ""),
          validatedAt: settings.androidRealDevicePassed === true ? internal.nowIso() : null
        },
        codeValidationPassed: valid,
        phase4Gate: valid && settings.androidRealDevicePassed === true ? "Passed" : "Blocked",
        validationRunId: run && run.validationRunId,
        evidencePackageId: execution.data && execution.data.evidencePackageId,
        evidenceFileName: execution.data && execution.data.evidenceFileName,
        evidencePackageValidation: evidenceValidation ? internal.clone(evidenceValidation) : null,
        executedAt: internal.nowIso()
      };
      state.lastProcedureValidation = internal.deepFreeze(internal.clone(result));
      internal.touch();
      result.releaseStatus = namespace.getReleaseStatus();
      return result;
    } catch (error) {
      const passed = checks.filter(function count(item) { return item.passed; }).length;
      const result = {
        id: internal.nextId("IDE-170-PROCEDURE-FOUNDATION-VALIDATION"),
        componentId: namespace.componentId,
        name: "IDE-170 Test Procedure Intake and Validation Compiler Validation",
        version: VERSION,
        valid: false,
        passed: passed,
        failed: checks.length - passed + 1,
        total: checks.length + 1,
        health: 0,
        status: "Failed",
        checks: checks.concat([{ name: "Validation completed without unexpected Error", passed: false, detail: internal.text(error && error.message, String(error)), group: "Unexpected Error", severity: "High" }]),
        error: { code: internal.text(error && error.code, "PROCEDURE_FOUNDATION_VALIDATION_FAILED"), message: internal.text(error && error.message, String(error)) },
        androidRealDeviceValidation: { required: true, passed: false },
        codeValidationPassed: false,
        phase4Gate: "Blocked",
        executedAt: internal.nowIso()
      };
      state.lastProcedureValidation = internal.deepFreeze(internal.clone(result));
      internal.touch();
      return result;
    }
  }

  function registerSchemas() {
    const definitions = [
      {
        schemaId: "IDE-170-SCHEMA-VALIDATION-DATASET-CANDIDATE",
        name: "Validation Dataset Candidate",
        version: VERSION,
        type: "object",
        required: ["candidateId", "procedureId", "parsedProcedureId", "steps", "ownerSelections", "status", "candidateHash"],
        properties: {
          candidateId: { type: "string", minLength: 1 },
          procedureId: { type: "string", minLength: 1 },
          parsedProcedureId: { type: "string", minLength: 1 },
          steps: { type: "array" },
          ownerSelections: { type: "array" },
          status: { type: "string", enum: ["Candidate", "Approved"] },
          candidateHash: { type: "string", minLength: 64, maxLength: 64 }
        },
        owner: "IDE-170",
        source: "Architecture Decision 011 v1.1.0"
      },
      {
        schemaId: "IDE-170-SCHEMA-OWNER-SELECTION",
        name: "Procedure Owner Selection",
        version: VERSION,
        type: "object",
        required: ["stepId", "originalPolicy", "finalPolicy", "selected", "warningAcknowledged"],
        properties: {
          stepId: { type: "string", minLength: 1 },
          originalPolicy: { type: "string" },
          finalPolicy: { type: "string" },
          selected: { type: "boolean" },
          warningAcknowledged: { type: "boolean" }
        },
        owner: "IDE-170",
        source: "Architecture Decision 011 v1.1.0"
      }
    ];
    return definitions.map(function register(definition) {
      if (namespace.getSchema && namespace.getSchema(definition.schemaId)) return { schemaId: definition.schemaId, registered: true, existing: true };
      const result = namespace.registerSchema(definition);
      return { schemaId: definition.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerCapability() {
    if (namespace.getCapability && namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: namespace.getCapability(CAPABILITY_ID) });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Validation Compiler and Selectable Execution Policy",
      version: VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-TEST-PROCEDURE-PARSER", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-VALIDATION-AUTOMATION", minimumVersion: "1.3.0", optional: false },
        { capabilityId: "IDE-170-VALIDATION-EVIDENCE-PACKAGE", minimumVersion: "1.3.0", optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-VALIDATION-DATASET-CANDIDATE", "IDE-170-SCHEMA-OWNER-SELECTION"],
      provides: ["Validation Compiler", "Warning Selectable", "Owner Selection", "Common Validation Launcher", "Imported Procedure Runner"],
      source: "Architecture Decision 011 v1.1.0"
    });
  }

  function initializeValidationCompiler() {
    const schemaResults = registerSchemas();
    const capabilityResult = registerCapability();
    const targetResults = registerCompilerTargets();
    const ready = schemaResults.every(function item(result) { return result.registered; }) &&
      capabilityResult.ok === true && targetResults.every(function item(result) { return result.registered; });
    return internal.buildResult(ready,
      ready ? "VALIDATION_COMPILER_INITIALIZED" : "VALIDATION_COMPILER_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capabilityResult, targetResults: targetResults }
    );
  }

  function removeValidationDatasetCandidateForValidation(candidateId) {
    const id = internal.canonicalId(candidateId);
    const record = state.validationDatasetCandidates.get(id);
    if (record && record.approvedDatasetId && internal.removeTestDatasetForValidation) {
      internal.removeTestDatasetForValidation(record.approvedDatasetId);
    }
    const removed = state.validationDatasetCandidates.delete(id);
    if (state.latestValidationDatasetCandidateId === id) state.latestValidationDatasetCandidateId = null;
    return removed;
  }

  Object.assign(internal, {
    executeOwnerApprovedProcedureCode: executeOwnerApprovedCode,
    removeValidationDatasetCandidateForValidation: removeValidationDatasetCandidateForValidation
  });

  Object.assign(namespace.api, {
    initializeValidationCompiler: initializeValidationCompiler,
    compileTestProcedure: compileTestProcedure,
    getValidationDatasetCandidate: getValidationDatasetCandidate,
    listValidationDatasetCandidates: listValidationDatasetCandidates,
    updateProcedureStepSelection: updateProcedureStepSelection,
    approveValidationDatasetCandidate: approveValidationDatasetCandidate,
    getProcedureExecutionPlan: getProcedureExecutionPlan,
    runImportedTestProcedure: runImportedTestProcedure,
    runCurrentPhaseValidation: runCurrentPhaseValidation,
    runTestProcedureCompilerValidation: runTestProcedureCompilerValidation
  });
  Object.assign(namespace, {
    compileTestProcedure: compileTestProcedure,
    getValidationDatasetCandidate: getValidationDatasetCandidate,
    listValidationDatasetCandidates: listValidationDatasetCandidates,
    updateProcedureStepSelection: updateProcedureStepSelection,
    approveValidationDatasetCandidate: approveValidationDatasetCandidate,
    getProcedureExecutionPlan: getProcedureExecutionPlan,
    runImportedTestProcedure: runImportedTestProcedure,
    runCurrentPhaseValidation: runCurrentPhaseValidation,
    runTestProcedureCompilerValidation: runTestProcedureCompilerValidation
  });

  namespace.modules.validationCompiler = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    datasetCandidate: true,
    ownerSelection: true,
    warningSelectable: true,
    prohibitedSelectionAllowed: false,
    commonValidationLauncher: true,
    automaticStartupExecution: false,
    loadedAt: internal.nowIso()
  };

  global.runIntelligenceCurrentPhaseValidation = runCurrentPhaseValidation;
  global.validateIntelligenceTestProcedureCompiler = runTestProcedureCompilerValidation;
})(typeof window !== "undefined" ? window : globalThis);
