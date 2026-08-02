/* ===============================
   FILE: 13_diagnostic_validation.js
   AI Prompt OS v7.0
   IDE-115 Diagnostic Validation Platform v1.0.2
=============================== */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-115";
  const VERSION = "1.0.2";
  const MAX_HISTORY = 50;

  const state = {
    rules: Object.create(null),
    history: [],
    reports: [],
    lastResult: null,
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function text(value, fallback) { const v = String(value == null ? "" : value).trim(); return v || String(fallback || ""); }
  function touch() { state.updatedAt = nowIso(); }
  function trim(list, limit) { while (list.length > (limit || MAX_HISTORY)) list.shift(); }

  function normalizeSeverity(value) {
    const severity = text(value, "error").toLowerCase();
    return ["info", "warning", "error", "critical"].includes(severity) ? severity : "error";
  }

  function registerDiagnosticValidationRule(rule) {
    if (!rule || typeof rule !== "object") return { registered: false, reason: "Rule must be an object." };
    const id = text(rule.id, "");
    if (!id) return { registered: false, reason: "Rule id is required." };
    if (typeof rule.validate !== "function") return { registered: false, reason: "Rule validate function is required." };
    state.rules[id] = {
      id,
      title: text(rule.title, id),
      group: text(rule.group, "IDE-110"),
      category: text(rule.category, "Platform"),
      severity: normalizeSeverity(rule.severity),
      enabled: rule.enabled !== false,
      validate: rule.validate,
      description: text(rule.description, "")
    };
    touch();
    return { registered: true, id };
  }

  function unregisterDiagnosticValidationRule(id) {
    const ruleId = text(id, "");
    if (!ruleId || !state.rules[ruleId]) return { removed: false, reason: "Rule not found." };
    delete state.rules[ruleId];
    touch();
    return { removed: true, id: ruleId };
  }

  function listDiagnosticValidationRules(options) {
    const input = options && typeof options === "object" ? options : {};
    return Object.values(state.rules)
      .filter(function (rule) { return input.group ? rule.group === input.group : true; })
      .map(function (rule) {
        return { id: rule.id, title: rule.title, group: rule.group, category: rule.category, severity: rule.severity, enabled: rule.enabled, description: rule.description };
      })
      .sort(function (a, b) { return a.id.localeCompare(b.id); });
  }

  function executeRule(rule, context) {
    const startedAt = performance && typeof performance.now === "function" ? performance.now() : Date.now();
    let passed = false;
    let detail = "";
    let data = null;
    try {
      const raw = rule.validate(context || {});
      if (raw && typeof raw === "object") {
        passed = raw.passed === true || raw.valid === true;
        detail = text(raw.detail || raw.message, "");
        data = raw.data == null ? null : clone(raw.data);
      } else {
        passed = raw === true;
      }
    } catch (error) {
      passed = false;
      detail = error && error.message ? error.message : String(error);
    }
    const endedAt = performance && typeof performance.now === "function" ? performance.now() : Date.now();
    return {
      id: rule.id,
      name: rule.title,
      group: rule.group,
      category: rule.category,
      severity: rule.severity,
      passed,
      detail,
      data,
      durationMs: Math.max(0, Number((endedAt - startedAt).toFixed(3)))
    };
  }

  function calculateDiagnosticValidationHealth(checks) {
    const list = Array.isArray(checks) ? checks : [];
    if (!list.length) return 0;
    const weights = { info: 1, warning: 2, error: 4, critical: 8 };
    const totalWeight = list.reduce(function (sum, check) { return sum + (weights[check.severity] || 4); }, 0);
    const passedWeight = list.reduce(function (sum, check) { return sum + (check.passed ? (weights[check.severity] || 4) : 0); }, 0);
    return totalWeight ? Math.round((passedWeight / totalWeight) * 100) : 0;
  }

  function runDiagnosticValidation(options) {
    const input = options && typeof options === "object" ? options : {};
    const rules = Object.values(state.rules).filter(function (rule) {
      if (!rule.enabled) return false;
      if (input.id && rule.id !== input.id) return false;
      if (input.group && rule.group !== input.group) return false;
      return true;
    });
    const checks = rules.map(function (rule) { return executeRule(rule, input.context || {}); });
    const passed = checks.filter(function (check) { return check.passed; }).length;
    const failed = checks.length - passed;
    const warnings = checks.filter(function (check) { return !check.passed && check.severity === "warning"; }).length;
    const critical = checks.filter(function (check) { return !check.passed && check.severity === "critical"; }).length;
    const health = calculateDiagnosticValidationHealth(checks);
    const result = {
      id: input.resultId || "IDE-115-VALIDATION",
      componentId: COMPONENT_ID,
      group: input.group || "ALL",
      valid: checks.length > 0 && failed === 0,
      status: checks.length > 0 && failed === 0 ? "Ready" : (critical > 0 ? "Blocked" : "Attention Required"),
      passed,
      failed,
      warnings,
      critical,
      total: checks.length,
      health,
      progress: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      checks,
      validatedAt: nowIso()
    };
    state.lastResult = clone(result);
    state.history.push(clone(result));
    trim(state.history);
    touch();
    return result;
  }

  function runDiagnosticValidationGroup(group, context) {
    return runDiagnosticValidation({ group: text(group, "IDE-110"), context: context || {}, resultId: "IDE-115-" + text(group, "IDE-110") + "-VALIDATION" });
  }

  function runAllDiagnosticValidations(context) {
    return runDiagnosticValidation({ context: context || {}, resultId: "IDE-115-VALIDATION" });
  }

  function buildDiagnosticValidationReport(result) {
    const source = result && typeof result === "object" ? result : state.lastResult;
    if (!source) return null;
    const report = {
      id: "IDE-115-REPORT-" + Date.now().toString(36).toUpperCase(),
      componentId: COMPONENT_ID,
      title: "Diagnostic Validation Report",
      summary: source.passed + "/" + source.total + " passed; health=" + source.health,
      result: clone(source),
      failures: source.checks.filter(function (check) { return !check.passed; }),
      createdAt: nowIso()
    };
    state.reports.push(report);
    trim(state.reports);
    touch();
    return clone(report);
  }

  function getDiagnosticValidationHistory(limit) {
    const count = Math.max(1, Math.min(Number(limit) || 20, MAX_HISTORY));
    return clone(state.history.slice(-count).reverse());
  }

  function getDiagnosticValidationState() {
    return {
      rules: listDiagnosticValidationRules(),
      history: getDiagnosticValidationHistory(MAX_HISTORY),
      reports: clone(state.reports),
      lastResult: clone(state.lastResult),
      lastError: clone(state.lastError),
      updatedAt: state.updatedAt
    };
  }

  function getDiagnosticValidationStatus() {
    const requiredApis = ["registerDiagnosticValidationRule", "unregisterDiagnosticValidationRule", "listDiagnosticValidationRules", "runDiagnosticValidation", "runDiagnosticValidationGroup", "runAllDiagnosticValidations", "buildDiagnosticValidationReport", "calculateDiagnosticValidationHealth", "getDiagnosticValidationHistory", "getDiagnosticValidationStatus", "validateDiagnosticValidationPlatform"];
    const implemented = requiredApis.filter(function (name) { return typeof global[name] === "function"; }).length;
    const ruleCount = Object.keys(state.rules).length; const platformReady = implemented === requiredApis.length && ruleCount >= 20;
    const last = state.lastResult;
    const releaseEvidence = typeof global.getDevelopmentReleaseEvidence === "function"
      ? global.getDevelopmentReleaseEvidence(COMPONENT_ID, { componentVersion: VERSION })
      : null;
    const releaseAllowed = Boolean((last && last.valid === true && last.failed === 0 && last.critical === 0) || (releaseEvidence && releaseEvidence.releaseAllowed));
    return { id: COMPONENT_ID, title: "Diagnostic Validation Platform", name: "Diagnostic Validation Platform", version: VERSION,
      status: platformReady ? "Ready" : "In Progress", lifecycleStatus: releaseAllowed ? "Completed" : "Implementation", officialStatus: releaseAllowed ? "Official" : "Not Run",
      ready: platformReady, releaseAllowed: releaseAllowed, progress: Math.round((implemented / requiredApis.length) * 100), health: last ? last.health : (releaseEvidence ? releaseEvidence.health : (platformReady ? 90 : 70)),
      implemented: implemented, total: requiredApis.length, registeredRules: ruleCount, historyCount: state.history.length, reportCount: state.reports.length,
      lastValidation: last ? clone(last) : (releaseEvidence ? clone({ valid: true, failed: 0, health: releaseEvidence.health, validatedAt: releaseEvidence.completedAt, source: releaseEvidence.source }) : null), releaseEvidence: releaseEvidence, warnings: releaseAllowed ? [] : ["Platform readiness does not equal an Official validation result."], errors: state.lastError ? [clone(state.lastError)] : [],
      nextTask: releaseAllowed ? "IDE-115 Official validation is available for downstream gates." : "Run validateDiagnosticValidationPlatform() and resolve all Critical failures.",
      dependsOn: ["IDE-110", "IDE-090", "VALIDATION-001"], provides: ["Validation Registry", "Validation Runner", "Health Calculation", "Validation History", "Validation Reporting", "Validation Status API"], updatedAt: state.updatedAt };
  }

  function apiExists(name) { return typeof global[name] === "function"; }
  function statusReady(name) { if (!apiExists(name)) return false; const value = global[name](); return Boolean(value && value.ready === true); }

  const defaultRules = [
    ["IDE115-001", "Diagnostic session API", "Functional", "critical", function () { return apiExists("createDiagnosticSession"); }],
    ["IDE115-002", "Diagnostic instrumentation validator", "Functional", "critical", function () { return apiExists("validateDiagnosticInstrumentation") && global.validateDiagnosticInstrumentation().valid === true; }],
    ["IDE115-003", "Diagnostic platform validator", "Platform", "critical", function () { return apiExists("validateDiagnosticPlatform") && global.validateDiagnosticPlatform().valid === true; }],
    ["IDE115-004", "Diagnostic platform status", "Platform", "critical", function () { return statusReady("getDiagnosticPlatformStatus"); }],
    ["IDE115-005", "Instrumentation type registry", "Registry", "error", function () { return apiExists("registerInstrumentationType"); }],
    ["IDE115-006", "Probe type registry", "Registry", "error", function () { return apiExists("registerProbeType"); }],
    ["IDE115-007", "Instrumentation preview", "Safety", "error", function () { return apiExists("previewInstrumentation"); }],
    ["IDE115-008", "Instrumentation apply", "Functional", "error", function () { return apiExists("addInstrumentation"); }],
    ["IDE115-009", "Instrumentation remove", "Restore", "critical", function () { return apiExists("removeInstrumentation"); }],
    ["IDE115-010", "Instrumentation verification", "Safety", "error", function () { return apiExists("verifyInstrumentation"); }],
    ["IDE115-011", "Investigation management", "Integration", "error", function () { return apiExists("createInvestigation") && apiExists("addInvestigationEvidence"); }],
    ["IDE115-012", "Performance monitoring", "Performance", "error", function () { return apiExists("recordPerformance") && apiExists("getPerformanceRanking"); }],
    ["IDE115-013", "Source backup", "Restore", "critical", function () { return apiExists("backupSource"); }],
    ["IDE115-014", "Source restore", "Restore", "critical", function () { return apiExists("restoreSource"); }],
    ["IDE115-015", "Restore verification", "Restore", "critical", function () { return apiExists("verifyRestore"); }],
    ["IDE115-016", "Diagnostic reporting", "Report", "error", function () { return apiExists("buildDiagnosticReport"); }],
    ["IDE115-017", "IDE Registry integration", "Registry", "warning", function () { return apiExists("registerIdeComponent") && (apiExists("getIdeComponent") || apiExists("getIdeRegistryStatus")); }],
    ["IDE115-018", "Development Dashboard integration", "Dashboard", "warning", function () { return typeof global.getDevelopmentDashboardStatus === "function" || typeof global.validateDevelopmentDashboard === "function"; }],
    ["IDE115-019", "Status consistency", "Quality", "error", function () { const s = global.getDiagnosticPlatformStatus(); return s.ready === true && s.progress === 100 && s.implemented === s.total; }],
    ["IDE115-020", "No diagnostic errors", "Quality", "critical", function () { const s = global.getDiagnosticPlatformStatus(); return Array.isArray(s.errors) && s.errors.length === 0; }]
  ];

  defaultRules.forEach(function (item) {
    registerDiagnosticValidationRule({ id: item[0], title: item[1], group: "IDE-110", category: item[2], severity: item[3], validate: item[4] });
  });

  function validateDiagnosticValidationPlatform() {
    const result = Object.assign({}, runDiagnosticValidationGroup("IDE-110"), { id: "IDE-115-VALIDATION", componentId: COMPONENT_ID, version: VERSION });
    if (result.valid && result.failed === 0 && typeof global.saveDevelopmentReleaseEvidence === "function") {
      global.saveDevelopmentReleaseEvidence(COMPONENT_ID, result, { componentVersion: VERSION, releaseAllowed: true });
    }
    return result;
  }

  const api = {
    registerDiagnosticValidationRule,
    unregisterDiagnosticValidationRule,
    listDiagnosticValidationRules,
    runDiagnosticValidation,
    runDiagnosticValidationGroup,
    runAllDiagnosticValidations,
    buildDiagnosticValidationReport,
    calculateDiagnosticValidationHealth,
    getDiagnosticValidationHistory,
    getDiagnosticValidationState,
    getDiagnosticValidationStatus,
    validateDiagnosticValidationPlatform
  };

  Object.keys(api).forEach(function (name) { global[name] = api[name]; });
  global.DiagnosticValidationPlatform = Object.freeze(Object.assign({ id: COMPONENT_ID, version: VERSION }, api));

  if (typeof global.registerIdeComponent === "function") {
    global.registerIdeComponent({
      id: COMPONENT_ID,
      title: "Diagnostic Validation Platform",
      summary: "Common validation platform for IDE-110 and future IDE modules.",
      icon: "✅",
      version: VERSION,
      status: "Ready",
      ready: true,
      progress: 100,
      health: 100,
      validator: "validateDiagnosticValidationPlatform",
      probe: "getDiagnosticValidationStatus",
      category: "IDE Validation"
    });
  }
})(typeof window !== "undefined" ? window : globalThis);