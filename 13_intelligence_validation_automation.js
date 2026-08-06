/* ============================================================
   FILE: 13_intelligence_validation_automation.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Architecture Decision: 011
   Phase: Validation Automation Foundation (Pre-Phase 4)
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Validation Automation blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.6.0";
  const CAPABILITY_ID = "IDE-170-VALIDATION-AUTOMATION";
  const RUN_STATUSES = Object.freeze([
    "Created", "Preparing", "Running", "Comparing", "Completed",
    "Failed", "Blocked", "Cancelled", "Frozen"
  ]);
  const CASE_STATUSES = Object.freeze([
    "Pending", "Running", "Passed", "Failed", "Blocked", "Skipped", "Error", "Cancelled"
  ]);
  const HIGH_GATE_SEVERITIES = Object.freeze(["Critical", "High"]);

  if (!(state.validationTargets instanceof Map)) state.validationTargets = new Map();
  if (!(state.validationRuns instanceof Map)) state.validationRuns = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestValidationRunId")) {
    state.latestValidationRunId = null;
  }

  function stableStringify(value) {
    return typeof internal.stableStringify === "function"
      ? internal.stableStringify(value)
      : JSON.stringify(value);
  }

  function valueAtPath(value, path) {
    if (!path) return value;
    return String(path).split(".").reduce(function resolve(current, key) {
      if (current == null) return undefined;
      return current[key];
    }, value);
  }

  function deepEqual(left, right) {
    return stableStringify(left) === stableStringify(right);
  }

  function comparePartial(expected, actual, path, differences) {
    const currentPath = path || "";
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
        differences.push({ path: currentPath || "$", expected: expected, actual: actual });
        return false;
      }
      let passed = true;
      Object.keys(expected).forEach(function compareKey(key) {
        const childPath = currentPath ? currentPath + "." + key : key;
        if (!comparePartial(expected[key], actual[key], childPath, differences)) passed = false;
      });
      return passed;
    }
    if (Array.isArray(expected)) {
      const equal = deepEqual(expected, actual);
      if (!equal) differences.push({ path: currentPath || "$", expected: expected, actual: actual });
      return equal;
    }
    const equal = Object.is(expected, actual);
    if (!equal) differences.push({ path: currentPath || "$", expected: expected, actual: actual });
    return equal;
  }

  function compareExpectedResult(expectedInput, actualInput) {
    const expected = internal.isPlainObject(expectedInput) ? expectedInput : { comparator: "Exact", value: expectedInput };
    const comparator = internal.text(expected.comparator, "Exact");
    const actual = expected.path ? valueAtPath(actualInput, expected.path) : actualInput;
    const differences = [];
    let passed = false;

    if (comparator === "Exact") {
      passed = deepEqual(expected.value, actual);
      if (!passed) differences.push({ path: expected.path || "$", expected: expected.value, actual: actual });
    } else if (comparator === "Partial Object") {
      passed = comparePartial(expected.value, actual, expected.path || "", differences);
    } else if (comparator === "Numeric Range") {
      const numberValue = Number(actual);
      const minimum = Number(expected.minimum);
      const maximum = Number(expected.maximum);
      passed = Number.isFinite(numberValue) &&
        (!Number.isFinite(minimum) || numberValue >= minimum) &&
        (!Number.isFinite(maximum) || numberValue <= maximum);
      if (!passed) differences.push({ path: expected.path || "$", expected: { minimum: expected.minimum, maximum: expected.maximum }, actual: actual });
    } else if (comparator === "Array Ordered") {
      passed = Array.isArray(actual) && deepEqual(expected.value, actual);
      if (!passed) differences.push({ path: expected.path || "$", expected: expected.value, actual: actual });
    } else if (comparator === "Array Unordered") {
      const left = Array.isArray(expected.value) ? expected.value.map(stableStringify).sort() : [];
      const right = Array.isArray(actual) ? actual.map(stableStringify).sort() : [];
      passed = deepEqual(left, right);
      if (!passed) differences.push({ path: expected.path || "$", expected: expected.value, actual: actual });
    } else if (comparator === "Contains") {
      passed = typeof actual === "string"
        ? actual.includes(String(expected.value))
        : Array.isArray(actual)
          ? actual.some(function contains(item) { return deepEqual(item, expected.value); })
          : false;
      if (!passed) differences.push({ path: expected.path || "$", expected: { contains: expected.value }, actual: actual });
    } else if (comparator === "Not Contains") {
      passed = typeof actual === "string"
        ? !actual.includes(String(expected.value))
        : Array.isArray(actual)
          ? !actual.some(function contains(item) { return deepEqual(item, expected.value); })
          : true;
      if (!passed) differences.push({ path: expected.path || "$", expected: { notContains: expected.value }, actual: actual });
    } else if (comparator === "Required Fields") {
      const fields = Array.isArray(expected.fields) ? expected.fields : [];
      passed = fields.every(function requiredField(path) { return valueAtPath(actual, path) !== undefined; });
      fields.forEach(function requiredDifference(path) {
        if (valueAtPath(actual, path) === undefined) differences.push({ path: path, expected: "Required", actual: undefined });
      });
    } else if (comparator === "Forbidden Fields") {
      const fields = Array.isArray(expected.fields) ? expected.fields : [];
      passed = fields.every(function forbiddenField(path) { return valueAtPath(actual, path) === undefined; });
      fields.forEach(function forbiddenDifference(path) {
        if (valueAtPath(actual, path) !== undefined) differences.push({ path: path, expected: "Forbidden", actual: valueAtPath(actual, path) });
      });
    } else if (comparator === "Type") {
      const expectedType = String(expected.value || "");
      const actualType = Array.isArray(actual) ? "array" : actual === null ? "null" : typeof actual;
      passed = actualType === expectedType;
      if (!passed) differences.push({ path: expected.path || "$", expected: expectedType, actual: actualType });
    } else if (comparator === "Error Code") {
      const actualCode = actual && (actual.code || (actual.error && actual.error.code));
      passed = actualCode === expected.value;
      if (!passed) differences.push({ path: "code", expected: expected.value, actual: actualCode });
    } else if (comparator === "Status") {
      const actualStatus = actual && actual.status;
      passed = actualStatus === expected.value;
      if (!passed) differences.push({ path: "status", expected: expected.value, actual: actualStatus });
    } else if (comparator === "Schema") {
      const schemaValidation = namespace.validateAgainstSchema(expected.schemaId, actual);
      passed = Boolean(schemaValidation && schemaValidation.valid === true);
      if (!passed) differences.push({ path: "$", expected: { schemaId: expected.schemaId }, actual: schemaValidation });
    } else if (comparator === "Boolean Expression") {
      const expression = internal.isPlainObject(expected.expression) ? expected.expression : {};
      const expressionValue = valueAtPath(actual, expression.path);
      const operator = internal.text(expression.operator, "equals");
      if (operator === "equals") passed = deepEqual(expressionValue, expression.value);
      else if (operator === "truthy") passed = Boolean(expressionValue);
      else if (operator === "falsy") passed = !expressionValue;
      else if (operator === "greaterThan") passed = Number(expressionValue) > Number(expression.value);
      else if (operator === "lessThan") passed = Number(expressionValue) < Number(expression.value);
      if (!passed) differences.push({ path: expression.path || "$", expected: expression, actual: expressionValue });
    } else if (comparator === "One Of") {
      const values = Array.isArray(expected.values) ? expected.values : [];
      passed = values.some(function one(value) { return deepEqual(value, actual); });
      if (!passed) differences.push({ path: expected.path || "$", expected: { oneOf: values }, actual: actual });
    } else if (comparator === "All") {
      const conditions = Array.isArray(expected.conditions) ? expected.conditions : [];
      const results = conditions.map(function compareCondition(condition) {
        return compareExpectedResult(condition, actualInput);
      });
      passed = conditions.length > 0 && results.every(function all(result) { return result.passed === true; });
      results.forEach(function collect(result) {
        if (!result.passed) differences.push.apply(differences, result.differences);
      });
    }

    return {
      comparator: comparator,
      passed: passed,
      expected: internal.clone(expected),
      actual: internal.clone(actualInput),
      differences: internal.clone(differences),
      comparedAt: internal.nowIso()
    };
  }

  function registerValidationTarget(definition, implementation, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const source = internal.isPlainObject(definition) ? definition : {};
    const targetId = internal.canonicalId(source.targetId || source.id);
    if (!targetId || typeof implementation !== "function") {
      return internal.buildResult(false, "VALIDATION_TARGET_INVALID", "Blocked", null, {
        error: { message: "Validation Target requires an ID and function implementation.", category: "Validation Failure" }
      });
    }
    if (state.validationTargets.has(targetId) && settings.replace !== true) {
      return internal.buildResult(false, "VALIDATION_TARGET_DUPLICATE", "Blocked", { targetId: targetId }, {
        error: { message: "Validation Target already exists.", category: "Identity Failure" }
      });
    }
    const record = internal.deepFreeze({
      targetId: targetId,
      name: internal.text(source.name, targetId),
      executionTypes: internal.unique(source.executionTypes || ["Function"]),
      description: internal.text(source.description, ""),
      owner: internal.text(source.owner, "IDE-170"),
      status: "Ready",
      registeredAt: internal.nowIso()
    });
    state.validationTargets.set(targetId, { definition: record, implementation: implementation });
    return internal.buildResult(true, "VALIDATION_TARGET_REGISTERED", "Ready", { target: record });
  }

  function getValidationTarget(targetId) {
    const record = state.validationTargets.get(internal.canonicalId(targetId));
    return record ? internal.clone(record.definition) : null;
  }

  function listValidationTargets() {
    return [...state.validationTargets.values()]
      .map(function mapTarget(record) { return internal.clone(record.definition); })
      .sort(function sortTarget(left, right) { return left.targetId.localeCompare(right.targetId); });
  }

  function delay(milliseconds) {
    return new Promise(function resolveDelay(resolve) {
      setTimeout(resolve, Math.max(0, Number(milliseconds) || 0));
    });
  }

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise(function timeoutPromise(_, reject) {
        setTimeout(function timeoutReject() {
          const error = new Error("Test Case timed out.");
          error.code = "TEST_CASE_TIMEOUT";
          reject(error);
        }, Math.max(100, Number(timeoutMs) || 10000));
      })
    ]);
  }

  function isCancelled(run, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (run.cancelRequested === true || settings.cancelled === true) return true;
    if (settings.signal && (settings.signal.aborted || settings.signal.cancelled)) return true;
    if (typeof settings.shouldCancel === "function") {
      try { return settings.shouldCancel() === true; } catch (_) { return true; }
    }
    return false;
  }

  function shouldRetryCase(testCase, actual, executionError) {
    const retryOn = testCase && testCase.retry && Array.isArray(testCase.retry.retryOn)
      ? testCase.retry.retryOn
      : [];
    if (!retryOn.length) return false;
    if (executionError && executionError.code !== "EXPECTED_RESULT_MISMATCH") {
      return retryOn.includes(executionError.code) || retryOn.includes(executionError.message);
    }
    if (retryOn.includes("Not Ready") && actual && actual.ready === false) return true;
    if (retryOn.includes("Initialization Pending") && actual && actual.initialized === false) return true;
    if (retryOn.includes("Module Loading") && actual) {
      if (["Loading", "Loaded", "Initializing"].includes(actual.status)) return true;
      if (actual.modules && Object.keys(actual.modules).some(function modulePending(key) {
        return actual.modules[key] !== true;
      })) return true;
    }
    return false;
  }

  function notifyProgress(options, run, stage, current, total, caseId, message) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (typeof settings.onProgress !== "function") return;
    try {
      settings.onProgress({
        componentId: namespace.componentId,
        validationRunId: run.validationRunId,
        stage: stage,
        current: current,
        total: total,
        progress: total > 0 ? Number(((current / total) * 100).toFixed(2)) : 100,
        caseId: caseId || null,
        message: internal.text(message, ""),
        timestamp: internal.nowIso()
      });
    } catch (_) {}
  }

  function buildEnvironmentEvidence() {
    const navigatorObject = global.navigator || {};
    const locationObject = global.location || {};
    return {
      userAgent: internal.text(navigatorObject.userAgent, ""),
      platform: internal.text(navigatorObject.platform, ""),
      language: internal.text(navigatorObject.language, ""),
      viewport: {
        width: Number(global.innerWidth) || null,
        height: Number(global.innerHeight) || null
      },
      devicePixelRatio: Number(global.devicePixelRatio) || null,
      maxTouchPoints: Number(navigatorObject.maxTouchPoints) || 0,
      localStorageAvailability: Boolean(global.localStorage),
      cryptoAvailability: Boolean(global.crypto),
      currentURL: internal.text(locationObject.href, ""),
      applicationVersion: namespace.version,
      scriptManifestVersion: null,
      scriptCount: null,
      executionStartedAt: internal.nowIso(),
      executionCompletedAt: null
    };
  }

  function recalculateRunSummary(run) {
    const statuses = { Passed: 0, Failed: 0, Blocked: 0, Skipped: 0, Error: 0, Cancelled: 0, Pending: 0, Running: 0 };
    const severitySummary = {};
    const categorySummary = {};
    run.caseResults.forEach(function summarize(result) {
      statuses[result.status] = (statuses[result.status] || 0) + 1;
      severitySummary[result.severity] = severitySummary[result.severity] || { total: 0, passed: 0, failed: 0 };
      categorySummary[result.category] = categorySummary[result.category] || { total: 0, passed: 0, failed: 0 };
      severitySummary[result.severity].total += 1;
      categorySummary[result.category].total += 1;
      if (result.status === "Passed") {
        severitySummary[result.severity].passed += 1;
        categorySummary[result.category].passed += 1;
      } else if (["Failed", "Blocked", "Error", "Cancelled"].includes(result.status)) {
        severitySummary[result.severity].failed += 1;
        categorySummary[result.category].failed += 1;
      }
    });
    const total = run.caseResults.length;
    const passed = statuses.Passed || 0;
    const requiredGatePassed = run.caseResults.every(function requiredGate(result) {
      if (!result.required) return true;
      if (!HIGH_GATE_SEVERITIES.includes(result.severity)) return result.status !== "Error";
      return result.status === "Passed";
    });
    run.summary = {
      total: total,
      passed: passed,
      failed: statuses.Failed || 0,
      blocked: statuses.Blocked || 0,
      skipped: statuses.Skipped || 0,
      error: statuses.Error || 0,
      cancelled: statuses.Cancelled || 0,
      health: total > 0 ? Number(((passed / total) * 100).toFixed(2)) : 0,
      severitySummary: severitySummary,
      categorySummary: categorySummary,
      requiredGatePassed: requiredGatePassed,
      releaseAllowed: requiredGatePassed,
      nextPhaseAllowed: requiredGatePassed
    };
    return run.summary;
  }

  async function executeCase(run, testCase, options) {
    const startedAt = internal.nowIso();
    const startedTime = Date.now();
    const baseResult = {
      resultId: internal.nextId("IDE-170-CASE-RESULT"),
      validationRunId: run.validationRunId,
      datasetId: run.datasetId,
      datasetVersion: run.datasetVersion,
      caseId: testCase.caseId,
      status: "Running",
      passed: false,
      required: testCase.required !== false,
      severity: testCase.severity,
      category: testCase.category,
      startedAt: startedAt,
      completedAt: null,
      durationMs: null,
      input: internal.clone(testCase.input),
      expected: internal.clone(testCase.expected),
      actual: null,
      differences: [],
      error: null,
      warnings: [],
      evidence: {},
      retryHistory: [],
      resultHash: null
    };

    if (testCase.enabled === false) {
      baseResult.status = "Skipped";
      baseResult.completedAt = internal.nowIso();
      baseResult.durationMs = Date.now() - startedTime;
      return baseResult;
    }

    const failedDependency = testCase.dependencies.find(function dependencyFailed(dependencyId) {
      const dependencyResult = run.caseResults.find(function findResult(item) { return item.caseId === dependencyId; });
      return !dependencyResult || dependencyResult.status !== "Passed";
    });
    if (failedDependency) {
      baseResult.status = "Blocked";
      baseResult.error = { code: "TEST_CASE_DEPENDENCY_BLOCKED", message: "Dependency did not pass: " + failedDependency };
      baseResult.completedAt = internal.nowIso();
      baseResult.durationMs = Date.now() - startedTime;
      return baseResult;
    }

    if (testCase.executionType === "Manual Confirmation") {
      const confirmation = run.manualConfirmations.find(function findConfirmation(item) {
        return item.caseId === testCase.caseId && item.confirmed === true;
      });
      baseResult.actual = Boolean(confirmation && confirmation.confirmed);
      const comparison = compareExpectedResult(testCase.expected, baseResult.actual);
      baseResult.status = comparison.passed ? "Passed" : "Blocked";
      baseResult.passed = comparison.passed;
      baseResult.differences = comparison.differences;
      if (!comparison.passed) {
        baseResult.error = { code: "MANUAL_CONFIRMATION_REQUIRED", message: "Required Manual Confirmation is not complete." };
      }
      baseResult.completedAt = internal.nowIso();
      baseResult.durationMs = Date.now() - startedTime;
      baseResult.resultHash = internal.hashValidationValue
        ? internal.hashValidationValue(Object.assign({}, baseResult, { resultHash: null }))
        : null;
      return baseResult;
    }

    const target = state.validationTargets.get(testCase.target);
    if (!target) {
      baseResult.status = "Blocked";
      baseResult.error = { code: "VALIDATION_TARGET_NOT_FOUND", message: "Validation Target is not registered: " + testCase.target };
      baseResult.completedAt = internal.nowIso();
      baseResult.durationMs = Date.now() - startedTime;
      return baseResult;
    }

    const maximumAttempts = Math.max(1, Number(testCase.retry.maximumAttempts) || 1);
    let actual = null;
    let executionError = null;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      if (isCancelled(run, options)) {
        baseResult.status = "Cancelled";
        baseResult.error = { code: "VALIDATION_RUN_CANCELLED", message: "Validation Run cancellation was requested." };
        break;
      }
      const attemptStartedAt = internal.nowIso();
      try {
        const execution = Promise.resolve(target.implementation(internal.clone(testCase.input), {
          testCase: internal.clone(testCase),
          validationRunId: run.validationRunId,
          attempt: attempt
        }));
        actual = await withTimeout(execution, testCase.timeout);
        const comparison = compareExpectedResult(testCase.expected, actual);
        baseResult.retryHistory.push({ attempt: attempt, status: comparison.passed ? "Passed" : "Mismatch", startedAt: attemptStartedAt, completedAt: internal.nowIso() });
        if (comparison.passed) {
          executionError = null;
          baseResult.actual = internal.clone(actual);
          baseResult.differences = comparison.differences;
          baseResult.status = "Passed";
          baseResult.passed = true;
          break;
        }
        baseResult.actual = internal.clone(actual);
        baseResult.differences = comparison.differences;
        executionError = { code: "EXPECTED_RESULT_MISMATCH", message: "Actual Result did not match Expected Result." };
      } catch (error) {
        executionError = {
          code: internal.text(error && error.code, "TEST_CASE_EXECUTION_ERROR"),
          message: internal.text(error && error.message, String(error))
        };
        baseResult.retryHistory.push({ attempt: attempt, status: "Error", error: internal.clone(executionError), startedAt: attemptStartedAt, completedAt: internal.nowIso() });
      }
      if (attempt < maximumAttempts && shouldRetryCase(testCase, actual, executionError)) {
        await delay(testCase.retry.intervalMs);
      } else if (attempt < maximumAttempts) {
        break;
      }
    }

    if (baseResult.status === "Running") {
      baseResult.status = executionError && executionError.code === "EXPECTED_RESULT_MISMATCH" ? "Failed" : "Error";
      baseResult.error = executionError;
    }
    baseResult.completedAt = internal.nowIso();
    baseResult.durationMs = Date.now() - startedTime;
    baseResult.resultHash = internal.hashValidationValue
      ? internal.hashValidationValue(Object.assign({}, baseResult, { resultHash: null }))
      : null;
    return baseResult;
  }

  function updateOwnerSelectionExecution(run, testCase, result, executed) {
    if (!run || !Array.isArray(run.ownerSelections) || !testCase || !result) return;
    const tags = Array.isArray(testCase.tags) ? testCase.tags : [];
    const selection = run.ownerSelections.find(function findOwnerSelection(item) {
      return item && tags.includes(item.stepId);
    });
    if (!selection) return;
    selection.executed = executed === true;
    selection.result = internal.text(result.status, executed === true ? "Completed" : "Not Run");
    selection.passed = result.passed === true;
    selection.caseId = result.caseId || testCase.caseId || null;
    selection.resultId = result.resultId || null;
    selection.validationRunId = run.validationRunId;
    selection.executedAt = executed === true ? (result.completedAt || internal.nowIso()) : null;
    selection.durationMs = executed === true ? Number(result.durationMs) || 0 : 0;
  }

  async function runAutomatedValidation(datasetId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const dataset = namespace.getTestDataset(datasetId);
    if (!dataset) {
      return internal.buildResult(false, "TEST_DATASET_NOT_FOUND", "Blocked", null, {
        error: { message: "Test Dataset was not found.", category: "Input Failure" }
      });
    }
    const datasetValidation = namespace.validateTestDataset(dataset);
    if (!datasetValidation.valid) {
      return internal.buildResult(false, "TEST_DATASET_INVALID", "Blocked", { validation: datasetValidation }, {
        error: { message: "Test Dataset is invalid.", category: "Validation Failure" }
      });
    }

    const validationRunId = internal.text(settings.validationRunId, "") || internal.nextId("IDE-170-VALIDATION-RUN");
    if (state.validationRuns.has(validationRunId)) {
      return internal.buildResult(false, "VALIDATION_RUN_DUPLICATE", "Blocked", { validationRunId: validationRunId }, {
        error: { message: "Validation Run ID already exists.", category: "Identity Failure" }
      });
    }

    const run = {
      validationRunId: validationRunId,
      componentId: namespace.componentId,
      componentVersion: namespace.version,
      architectureDecisionVersion: "011-v1.1.0",
      datasetId: dataset.datasetId,
      datasetVersion: dataset.version,
      datasetHash: dataset.datasetHash,
      sourceProcedureId: dataset.sourceProcedureId || null,
      sourceProcedureVersion: dataset.sourceProcedureVersion || null,
      sourceProcedureHash: dataset.sourceProcedureHash || null,
      parsedProcedureId: dataset.parsedProcedureId || null,
      candidateId: dataset.candidateId || null,
      ownerSelections: Array.isArray(dataset.ownerSelections) ? internal.clone(dataset.ownerSelections) : [],
      status: "Preparing",
      frozen: false,
      selectedCaseIds: [],
      caseResults: [],
      comparisons: [],
      summary: null,
      environment: buildEnvironmentEvidence(),
      capabilityVersions: namespace.getCapabilities ? namespace.getCapabilities().map(function mapCapability(item) {
        return { capabilityId: item.capabilityId, version: item.version, status: item.status };
      }) : [],
      manualConfirmations: [],
      executionLog: [],
      cancelRequested: false,
      createdBy: internal.text(settings.actor, "Project Owner"),
      createdAt: internal.nowIso(),
      startedAt: internal.nowIso(),
      completedAt: null,
      frozenAt: null,
      runHash: null
    };
    state.validationRuns.set(validationRunId, run);
    state.latestValidationRunId = validationRunId;
    notifyProgress(settings, run, "Dataset Validation", 1, 1, null, "Dataset valid");

    const selected = dataset.testCases.filter(function selectCase(testCase) {
      if (testCase.enabled === false && settings.includeDisabled !== true) return false;
      if (Array.isArray(settings.caseIds) && settings.caseIds.length) {
        return settings.caseIds.map(internal.canonicalId).includes(testCase.caseId);
      }
      return true;
    });
    run.selectedCaseIds = selected.map(function caseId(testCase) { return testCase.caseId; });
    run.status = "Running";
    notifyProgress(settings, run, "Test Execution", 0, selected.length, null, "Starting");

    for (let index = 0; index < selected.length; index += 1) {
      const testCase = selected[index];
      if (isCancelled(run, settings)) {
        for (let remaining = index; remaining < selected.length; remaining += 1) {
          const cancelledCase = selected[remaining];
          const cancelledResult = {
            resultId: internal.nextId("IDE-170-CASE-RESULT"),
            validationRunId: run.validationRunId,
            datasetId: run.datasetId,
            datasetVersion: run.datasetVersion,
            caseId: cancelledCase.caseId,
            status: "Cancelled",
            passed: false,
            required: cancelledCase.required !== false,
            severity: cancelledCase.severity,
            category: cancelledCase.category,
            startedAt: null,
            completedAt: internal.nowIso(),
            durationMs: 0,
            input: internal.clone(cancelledCase.input),
            expected: internal.clone(cancelledCase.expected),
            actual: null,
            differences: [],
            error: { code: "VALIDATION_RUN_CANCELLED", message: "Validation Run cancellation was requested." },
            warnings: [],
            evidence: {},
            retryHistory: [],
            resultHash: null
          };
          run.caseResults.push(cancelledResult);
          updateOwnerSelectionExecution(run, cancelledCase, cancelledResult, false);
        }
        run.status = "Cancelled";
        break;
      }
      const result = await executeCase(run, testCase, settings);
      run.caseResults.push(result);
      updateOwnerSelectionExecution(run, testCase, result, true);
      run.comparisons.push({
        caseId: result.caseId,
        comparator: result.expected.comparator,
        passed: result.passed,
        expected: internal.clone(result.expected),
        actual: internal.clone(result.actual),
        differences: internal.clone(result.differences),
        comparedAt: result.completedAt
      });
      run.executionLog.push("[" + result.completedAt + "] " + result.caseId + " = " + result.status);
      notifyProgress(settings, run, "Test Execution", index + 1, selected.length, testCase.caseId, result.status);
      await Promise.resolve();
    }

    run.status = run.status === "Cancelled" ? "Cancelled" : "Completed";
    run.completedAt = internal.nowIso();
    run.environment.executionCompletedAt = run.completedAt;
    recalculateRunSummary(run);
    run.runHash = internal.hashValidationValue
      ? internal.hashValidationValue(Object.assign({}, run, { runHash: null }))
      : null;
    state.validationRuns.set(validationRunId, run);
    internal.touch();
    internal.appendAudit({
      action: "AUTOMATED_VALIDATION_COMPLETED",
      actor: run.createdBy,
      targetType: "Validation Run",
      targetId: validationRunId,
      outcome: run.summary.requiredGatePassed ? "Passed" : "Blocked",
      detail: internal.clone(run.summary)
    });
    notifyProgress(settings, run, "Complete", selected.length, selected.length, null, run.status);
    return internal.buildResult(true, "AUTOMATED_VALIDATION_COMPLETED", run.status, {
      validationRun: getValidationRun(validationRunId)
    });
  }

  function getValidationRun(validationRunId) {
    const run = state.validationRuns.get(internal.text(validationRunId, ""));
    return run ? internal.clone(run) : null;
  }

  function listValidationRuns(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    return [...state.validationRuns.values()]
      .filter(function filterRun(run) { return !settings.status || run.status === settings.status; })
      .sort(function sortRun(left, right) { return left.createdAt.localeCompare(right.createdAt); })
      .map(internal.clone);
  }

  function cancelAutomatedValidation(validationRunId, options) {
    const run = state.validationRuns.get(internal.text(validationRunId, ""));
    if (!run) return internal.buildResult(false, "VALIDATION_RUN_NOT_FOUND", "Blocked", null, {
      error: { message: "Validation Run was not found.", category: "Input Failure" }
    });
    if (run.frozen || run.status === "Frozen" || Object.isFrozen(run)) {
      return internal.buildResult(false, "VALIDATION_RUN_FROZEN", "Blocked", null, {
        error: { message: "Frozen Validation Run cannot be cancelled.", category: "Governance Failure" }
      });
    }
    run.cancelRequested = true;
    run.executionLog.push("[" + internal.nowIso() + "] Cancellation requested by " + internal.text(options && options.actor, "Project Owner"));
    return internal.buildResult(true, "VALIDATION_CANCELLATION_REQUESTED", "Cancelling", {
      validationRunId: validationRunId
    });
  }

  function addManualConfirmation(validationRunId, confirmationInput, options) {
    const run = state.validationRuns.get(internal.text(validationRunId, ""));
    if (!run) return internal.buildResult(false, "VALIDATION_RUN_NOT_FOUND", "Blocked", null, {
      error: { message: "Validation Run was not found.", category: "Input Failure" }
    });
    if (run.frozen || run.status === "Frozen" || Object.isFrozen(run)) {
      return internal.buildResult(false, "VALIDATION_RUN_FROZEN", "Blocked", null, {
        error: { message: "Frozen Validation Run cannot be changed.", category: "Governance Failure" }
      });
    }
    const source = internal.isPlainObject(confirmationInput) ? confirmationInput : {};
    const confirmation = {
      confirmationId: internal.text(source.confirmationId, "") || internal.nextId("IDE-170-MANUAL-CONFIRMATION"),
      validationRunId: run.validationRunId,
      caseId: internal.canonicalId(source.caseId),
      testType: internal.text(source.testType, "Real Device Confirmation"),
      description: internal.text(source.description, ""),
      required: source.required !== false,
      confirmed: source.confirmed === true,
      confirmedBy: internal.text(source.confirmedBy || (options && options.actor), "Project Owner"),
      device: internal.text(source.device, ""),
      evidence: internal.text(source.evidence, ""),
      confirmedAt: source.confirmed === true ? internal.text(source.confirmedAt, internal.nowIso()) : null
    };
    const existingIndex = run.manualConfirmations.findIndex(function findConfirmation(item) {
      return item.caseId === confirmation.caseId;
    });
    if (existingIndex >= 0) run.manualConfirmations[existingIndex] = confirmation;
    else run.manualConfirmations.push(confirmation);

    const caseResult = run.caseResults.find(function findCase(item) { return item.caseId === confirmation.caseId; });
    if (caseResult) {
      const dataset = namespace.getTestDataset(run.datasetId);
      const testCase = dataset && dataset.testCases.find(function findTestCase(item) { return item.caseId === confirmation.caseId; });
      if (testCase && testCase.executionType === "Manual Confirmation") {
        const comparison = compareExpectedResult(testCase.expected, confirmation.confirmed);
        caseResult.actual = confirmation.confirmed;
        caseResult.passed = comparison.passed;
        caseResult.status = comparison.passed ? "Passed" : "Blocked";
        caseResult.differences = comparison.differences;
        caseResult.error = comparison.passed ? null : { code: "MANUAL_CONFIRMATION_REQUIRED", message: "Required Manual Confirmation is not complete." };
        caseResult.completedAt = internal.nowIso();
        caseResult.resultHash = internal.hashValidationValue
          ? internal.hashValidationValue(Object.assign({}, caseResult, { resultHash: null }))
          : null;
        updateOwnerSelectionExecution(run, testCase, caseResult, true);
      }
    }
    recalculateRunSummary(run);
    run.runHash = internal.hashValidationValue
      ? internal.hashValidationValue(Object.assign({}, run, { runHash: null }))
      : null;
    internal.appendAudit({
      action: "MANUAL_CONFIRMATION_RECORDED",
      actor: confirmation.confirmedBy,
      targetType: "Validation Run",
      targetId: run.validationRunId,
      outcome: confirmation.confirmed ? "Confirmed" : "Not Confirmed",
      detail: internal.clone(confirmation)
    });
    return internal.buildResult(true, "MANUAL_CONFIRMATION_RECORDED", confirmation.confirmed ? "Confirmed" : "Pending", {
      confirmation: confirmation,
      validationRun: getValidationRun(run.validationRunId)
    });
  }

  function freezeValidationRun(validationRunId, options) {
    const id = internal.text(validationRunId, "");
    const current = state.validationRuns.get(id);
    if (!current) return internal.buildResult(false, "VALIDATION_RUN_NOT_FOUND", "Blocked", null, {
      error: { message: "Validation Run was not found.", category: "Input Failure" }
    });
    if (current.frozen || current.status === "Frozen" || Object.isFrozen(current)) {
      return internal.buildResult(true, "VALIDATION_RUN_ALREADY_FROZEN", "Frozen", {
        validationRun: getValidationRun(id)
      });
    }
    const frozen = internal.clone(current);
    frozen.status = "Frozen";
    frozen.frozen = true;
    frozen.frozenAt = internal.nowIso();
    frozen.runHash = internal.hashValidationValue
      ? internal.hashValidationValue(Object.assign({}, frozen, { runHash: null }))
      : null;
    state.validationRuns.set(id, internal.deepFreeze(frozen));
    internal.appendAudit({
      action: "VALIDATION_RUN_FROZEN",
      actor: internal.text(options && options.actor, "Project Owner"),
      targetType: "Validation Run",
      targetId: id,
      outcome: "Succeeded",
      detail: { runHash: frozen.runHash, requiredGatePassed: frozen.summary.requiredGatePassed }
    });
    return internal.buildResult(true, "VALIDATION_RUN_FROZEN", "Frozen", {
      validationRun: getValidationRun(id)
    });
  }

  function registerAutomationSchemas() {
    const definitions = [
      {
        schemaId: "IDE-170-SCHEMA-VALIDATION-RUN",
        name: "Automated Validation Run",
        version: VERSION,
        type: "object",
        required: ["validationRunId", "componentId", "componentVersion", "datasetId", "datasetVersion", "status", "caseResults", "summary"],
        properties: {
          validationRunId: { type: "string", minLength: 1 },
          componentId: { type: "string", enum: ["IDE-170"] },
          componentVersion: { type: "string", format: "semver" },
          datasetId: { type: "string", minLength: 1 },
          datasetVersion: { type: "string", format: "semver" },
          status: { type: "string", enum: RUN_STATUSES.slice() },
          caseResults: { type: "array" },
          summary: { type: "object" }
        },
        owner: "IDE-170",
        source: "Architecture Decision 011"
      },
      {
        schemaId: "IDE-170-SCHEMA-CASE-RESULT",
        name: "Automated Validation Case Result",
        version: VERSION,
        type: "object",
        required: ["resultId", "validationRunId", "caseId", "status", "passed", "severity", "category"],
        properties: {
          resultId: { type: "string", minLength: 1 },
          validationRunId: { type: "string", minLength: 1 },
          caseId: { type: "string", minLength: 1 },
          status: { type: "string", enum: CASE_STATUSES.slice() },
          passed: { type: "boolean" },
          severity: { type: "string" },
          category: { type: "string" }
        },
        owner: "IDE-170",
        source: "Architecture Decision 011"
      }
    ];
    return definitions.map(function register(definition) {
      if (namespace.getSchema && namespace.getSchema(definition.schemaId)) return { schemaId: definition.schemaId, registered: true, existing: true };
      const result = namespace.registerSchema(definition);
      return { schemaId: definition.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerAutomationCapability() {
    if (namespace.getCapability && namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: namespace.getCapability(CAPABILITY_ID) });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Deterministic Automated Validation Runner",
      version: VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-TEST-DATASET-REGISTRY", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-VALIDATION-RUN", "IDE-170-SCHEMA-CASE-RESULT"],
      provides: ["Automated Test Runner", "Expected Result Comparator", "Manual Confirmation", "Progress", "Cancellation"],
      source: "Architecture Decision 011"
    });
  }

  function registerBuiltInTargets() {
    const results = [];
    function add(definition, implementation) {
      if (state.validationTargets.has(definition.targetId)) {
        results.push({ targetId: definition.targetId, registered: true, existing: true });
        return;
      }
      const result = registerValidationTarget(definition, implementation);
      results.push({ targetId: definition.targetId, registered: result.ok === true, code: result.code });
    }
    add({ targetId: "IDE-170-TARGET-SHA256", name: "SHA-256", executionTypes: ["Function"] }, function sha256Target(input) {
      const args = Array.isArray(input.arguments) ? input.arguments : [input.value];
      return namespace.calculateSHA256(args[0]);
    });
    add({ targetId: "IDE-170-TARGET-IDE160-STATUS", name: "IDE-160 Status", executionTypes: ["Status Probe", "Regression Probe"] }, function ide160Target() {
      if (typeof global.getAIDevelopmentWorkflowStatus !== "function") {
        return { available: false, ready: false, status: "Unavailable" };
      }
      return global.getAIDevelopmentWorkflowStatus();
    });
    add({ targetId: "IDE-170-TARGET-PROJECT-ZIP-API", name: "Project ZIP API", executionTypes: ["Regression Probe"] }, function projectZipApiTarget() {
      return {
        saveProjectPackage: typeof global.saveProjectPackage,
        buildProjectIndexFromStaticManifest: typeof global.buildProjectIndexFromStaticManifest
      };
    });
    add({ targetId: "IDE-170-TARGET-STATIC-MANIFEST", name: "Static Script Manifest", executionTypes: ["Async Function", "Regression Probe"] }, async function staticManifestTarget() {
      if (typeof global.__IDE170_STATIC_MANIFEST_FIXTURE__ === "object") {
        const fixture = global.__IDE170_STATIC_MANIFEST_FIXTURE__;
        const scripts = Array.isArray(fixture.scripts) ? fixture.scripts : [];
        return {
          valid: true,
          version: fixture.version,
          scriptCount: scripts.length,
          includesDatasetRegistry: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_dataset_registry.js"); }),
          includesAutomation: scripts.some(function has(item) { return String(item).includes("13_intelligence_validation_automation.js"); }),
          includesEvidence: scripts.some(function has(item) { return String(item).includes("13_intelligence_validation_evidence.js"); }),
          includesProcedureIntake: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_procedure_intake.js"); }),
          includesProcedureParser: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_procedure_parser.js"); }),
          includesValidationCompiler: scripts.some(function has(item) { return String(item).includes("13_intelligence_validation_compiler.js"); }),
          includesProcedureUI: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_procedure_ui.js"); })
        };
      }
      const source = typeof global.AI_PRO_STATIC_SCRIPT_MANIFEST_SOURCE === "string"
        ? global.AI_PRO_STATIC_SCRIPT_MANIFEST_SOURCE
        : "./00_script_manifest.json";
      const response = await global.fetch(source, { cache: "no-store" });
      if (!response.ok) throw Object.assign(new Error("Static Script Manifest fetch failed."), { code: "STATIC_MANIFEST_FETCH_FAILED" });
      const manifest = await response.json();
      const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
      return {
        valid: Boolean(manifest && manifest.version && scripts.length),
        version: manifest.version,
        scriptCount: scripts.length,
        includesDatasetRegistry: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_dataset_registry.js"); }),
        includesAutomation: scripts.some(function has(item) { return String(item).includes("13_intelligence_validation_automation.js"); }),
        includesEvidence: scripts.some(function has(item) { return String(item).includes("13_intelligence_validation_evidence.js"); }),
        includesProcedureIntake: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_procedure_intake.js"); }),
        includesProcedureParser: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_procedure_parser.js"); }),
        includesValidationCompiler: scripts.some(function has(item) { return String(item).includes("13_intelligence_validation_compiler.js"); }),
        includesProcedureUI: scripts.some(function has(item) { return String(item).includes("13_intelligence_test_procedure_ui.js"); })
      };
    });
    add({ targetId: "IDE-170-TARGET-ECHO", name: "Echo", executionTypes: ["Function"] }, function echoTarget(input) {
      return Object.prototype.hasOwnProperty.call(input, "value") ? internal.clone(input.value) : internal.clone(input);
    });
    add({ targetId: "IDE-170-TARGET-ASYNC-ECHO", name: "Async Echo", executionTypes: ["Async Function"] }, async function asyncEchoTarget(input) {
      await Promise.resolve();
      return Object.prototype.hasOwnProperty.call(input, "value") ? internal.clone(input.value) : internal.clone(input);
    });
    return results;
  }

  function initializeValidationAutomation() {
    const schemaResults = registerAutomationSchemas();
    const capabilityResult = registerAutomationCapability();
    const targetResults = registerBuiltInTargets();
    const ready = schemaResults.every(function readySchema(item) { return item.registered; }) &&
      capabilityResult.ok === true && targetResults.every(function readyTarget(item) { return item.registered; });
    return internal.buildResult(ready,
      ready ? "VALIDATION_AUTOMATION_INITIALIZED" : "VALIDATION_AUTOMATION_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capabilityResult, targetResults: targetResults },
      ready ? {} : { error: { message: "Validation Automation initialization failed.", category: "Initialization Failure" } }
    );
  }

  function removeValidationRunForValidation(validationRunId) {
    const id = internal.text(validationRunId, "");
    const removed = state.validationRuns.delete(id);
    if (state.latestValidationRunId === id) state.latestValidationRunId = null;
    return removed;
  }

  function removeValidationTargetForValidation(targetId) {
    return state.validationTargets.delete(internal.canonicalId(targetId));
  }

  Object.assign(internal, {
    validationRunStatuses: RUN_STATUSES,
    validationCaseStatuses: CASE_STATUSES,
    recalculateValidationRunSummary: recalculateRunSummary,
    removeValidationRunForValidation: removeValidationRunForValidation,
    removeValidationTargetForValidation: removeValidationTargetForValidation
  });
  Object.assign(namespace.api, {
    initializeValidationAutomation: initializeValidationAutomation,
    registerValidationTarget: registerValidationTarget,
    getValidationTarget: getValidationTarget,
    listValidationTargets: listValidationTargets,
    compareExpectedResult: compareExpectedResult,
    runAutomatedValidation: runAutomatedValidation,
    cancelAutomatedValidation: cancelAutomatedValidation,
    getValidationRun: getValidationRun,
    listValidationRuns: listValidationRuns,
    addManualConfirmation: addManualConfirmation,
    freezeValidationRun: freezeValidationRun
  });
  Object.assign(namespace, {
    registerValidationTarget: registerValidationTarget,
    getValidationTarget: getValidationTarget,
    listValidationTargets: listValidationTargets,
    compareExpectedResult: compareExpectedResult,
    runAutomatedValidation: runAutomatedValidation,
    cancelAutomatedValidation: cancelAutomatedValidation,
    getValidationRun: getValidationRun,
    listValidationRuns: listValidationRuns,
    addManualConfirmation: addManualConfirmation,
    freezeValidationRun: freezeValidationRun
  });

  namespace.modules.validationAutomation = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    deterministicRunner: true,
    expectedResultComparator: true,
    caseIsolation: true,
    retry: true,
    timeout: true,
    progress: true,
    cancellation: true,
    automaticStartupExecution: false,
    loadedAt: internal.nowIso()
  };

  global.runIntelligenceAutomatedValidation = runAutomatedValidation;
  global.compareIntelligenceExpectedResult = compareExpectedResult;
})(typeof window !== "undefined" ? window : globalThis);
