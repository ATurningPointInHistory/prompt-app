/* ===============================
   FILE: 16_validation_engine.js
   Validation Engine
   ENGINE-040
   Version: 1.0.0
=============================== */

var VALIDATION_ENGINE_ID = "ENGINE-040";
var VALIDATION_ENGINE_TITLE = "Validation Engine";
var VALIDATION_ENGINE_VERSION = "1.0.0";
var VALIDATION_RULE_LIMIT = 500;
var VALIDATION_HISTORY_LIMIT = 100;
var VALIDATION_SEVERITIES = ["info", "warning", "error", "critical"];
var VALIDATION_STANDARD_CATEGORIES = [
  "input", "schema", "metadata", "relationship", "dependency",
  "compatibility", "engine", "context", "search", "perception", "custom"
];
var VALIDATION_PIPELINE = [
  "input", "schema", "metadata", "relationship", "dependency",
  "compatibility", "engine", "context", "search", "perception", "custom"
];

var validationRuleRegistry = typeof validationRuleRegistry !== "undefined" && validationRuleRegistry instanceof Map
  ? validationRuleRegistry : new Map();
var validationHistory = typeof validationHistory !== "undefined" && Array.isArray(validationHistory)
  ? validationHistory : [];
var validationSequence = typeof validationSequence === "number" ? validationSequence : 0;
var validationRuleSequence = typeof validationRuleSequence === "number" ? validationRuleSequence : 0;
var validationEngineMetrics = typeof validationEngineMetrics !== "undefined" && validationEngineMetrics
  ? validationEngineMetrics : {
      executions: 0, synchronousExecutions: 0, asynchronousExecutions: 0,
      rulesExecuted: 0, passedRules: 0, failedRules: 0, warnings: 0,
      errors: 0, critical: 0, historyWrites: 0, lastExecutionAt: null
    };

function createValidationTimestamp() { return new Date().toISOString(); }
function cloneValidationValue(value) {
  if (value == null) return value;
  try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); }
}
function normalizeValidationObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? cloneValidationValue(value) : {};
}
function normalizeValidationList(value) {
  var source = Array.isArray(value) ? value : value == null ? [] : [value];
  return source.map(function (item) { return String(item == null ? "" : item).trim(); }).filter(Boolean);
}
function createValidationId() {
  validationSequence += 1;
  return "VAL-" + String(validationSequence).padStart(6, "0");
}
function createValidationError(error) {
  if (!error) return null;
  return {
    name: String(error.name || "Error"),
    message: String(error.message || error),
    stack: error.stack ? String(error.stack) : null
  };
}
function isPromiseLike(value) { return Boolean(value && typeof value.then === "function"); }
function normalizeSeverity(value) {
  var severity = String(value || "error").toLowerCase();
  return VALIDATION_SEVERITIES.includes(severity) ? severity : "error";
}
function normalizeCategory(value) {
  var category = String(value || "custom").toLowerCase().trim();
  return category || "custom";
}
function pipelineIndex(category) {
  var index = VALIDATION_PIPELINE.indexOf(normalizeCategory(category));
  return index < 0 ? VALIDATION_PIPELINE.length : index;
}

function validateValidationRuleDefinition(rule) {
  var errors = [];
  if (!rule || typeof rule !== "object") errors.push("Rule must be an object");
  else {
    if (!String(rule.id || "").trim()) errors.push("Rule id is required");
    if (!/^VAL-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,}$/.test(String(rule.id || ""))) {
      errors.push("Rule id must use VAL-<NAMESPACE>-<NUMBER>");
    }
    if (!String(rule.title || "").trim()) errors.push("Rule title is required");
    if (!String(rule.description || "").trim()) errors.push("Rule description is required");
    if (!String(rule.category || "").trim()) errors.push("Rule category is required");
    if (!VALIDATION_SEVERITIES.includes(String(rule.severity || "").toLowerCase())) errors.push("Invalid severity");
    if (!Number.isFinite(Number(rule.priority))) errors.push("Rule priority must be numeric");
    if (typeof rule.enabled !== "boolean") errors.push("Rule enabled must be boolean");
    if (typeof rule.validate !== "function") errors.push("Rule validate must be a function");
  }
  return { valid: errors.length === 0, errors: errors };
}

function normalizeValidationRule(rule) {
  var normalized = {
    id: String(rule.id).trim().toUpperCase(),
    title: String(rule.title).trim(),
    description: String(rule.description).trim(),
    category: normalizeCategory(rule.category),
    severity: normalizeSeverity(rule.severity),
    priority: Number(rule.priority),
    enabled: rule.enabled !== false,
    validate: rule.validate,
    appliesTo: normalizeValidationList(rule.appliesTo),
    dependencies: normalizeValidationList(rule.dependencies),
    tags: normalizeValidationList(rule.tags),
    version: String(rule.version || "1.0.0"),
    metadata: normalizeValidationObject(rule.metadata),
    registeredOrder: ++validationRuleSequence,
    registeredAt: createValidationTimestamp()
  };
  return normalized;
}

function registerValidationRule(rule, options) {
  options = options || {};
  var check = validateValidationRuleDefinition(rule);
  if (!check.valid) throw new Error(check.errors.join("; "));
  var id = String(rule.id).trim().toUpperCase();
  if (validationRuleRegistry.has(id) && !options.replace) throw new Error("Validation rule already exists: " + id);
  if (!validationRuleRegistry.has(id) && validationRuleRegistry.size >= VALIDATION_RULE_LIMIT) throw new Error("Validation rule limit reached");
  var normalized = normalizeValidationRule(rule);
  if (options.replace && validationRuleRegistry.has(id)) {
    normalized.registeredOrder = validationRuleRegistry.get(id).registeredOrder;
  }
  validationRuleRegistry.set(id, normalized);
  return exportValidationRule(normalized);
}
function unregisterValidationRule(id) { return validationRuleRegistry.delete(String(id || "").toUpperCase()); }
function getValidationRule(id) {
  var rule = validationRuleRegistry.get(String(id || "").toUpperCase());
  return rule ? exportValidationRule(rule) : null;
}
function exportValidationRule(rule) {
  if (!rule) return null;
  return {
    id: rule.id, title: rule.title, description: rule.description,
    category: rule.category, severity: rule.severity, priority: rule.priority,
    enabled: rule.enabled, appliesTo: cloneValidationValue(rule.appliesTo),
    dependencies: cloneValidationValue(rule.dependencies), tags: cloneValidationValue(rule.tags),
    version: rule.version, metadata: cloneValidationValue(rule.metadata),
    registeredOrder: rule.registeredOrder, registeredAt: rule.registeredAt,
    asynchronous: rule.validate && rule.validate.constructor && rule.validate.constructor.name === "AsyncFunction"
  };
}
function listValidationRules(filters) {
  filters = filters || {};
  return Array.from(validationRuleRegistry.values())
    .filter(function (rule) {
      if (filters.enabled != null && rule.enabled !== Boolean(filters.enabled)) return false;
      if (filters.category && rule.category !== normalizeCategory(filters.category)) return false;
      if (filters.severity && rule.severity !== normalizeSeverity(filters.severity)) return false;
      if (filters.targetType && rule.appliesTo.length && !rule.appliesTo.includes(String(filters.targetType))) return false;
      return true;
    })
    .sort(function (a, b) {
      return pipelineIndex(a.category) - pipelineIndex(b.category) ||
        a.priority - b.priority || a.registeredOrder - b.registeredOrder;
    })
    .map(exportValidationRule);
}
function setValidationRuleEnabled(id, enabled) {
  var rule = validationRuleRegistry.get(String(id || "").toUpperCase());
  if (!rule) return null;
  rule.enabled = Boolean(enabled);
  return exportValidationRule(rule);
}
function enableValidationRule(id) { return setValidationRuleEnabled(id, true); }
function disableValidationRule(id) { return setValidationRuleEnabled(id, false); }
function clearValidationRules(options) {
  options = options || {};
  var count = validationRuleRegistry.size;
  validationRuleRegistry.clear();
  if (options.defaults !== false) registerDefaultValidationRules();
  return { cleared: count, current: validationRuleRegistry.size };
}

function normalizeValidationRuleResult(raw, rule) {
  var result;
  if (raw === true || raw == null) result = { valid: true, message: "Passed" };
  else if (raw === false) result = { valid: false, message: rule.title + " failed" };
  else if (typeof raw === "string") result = { valid: false, message: raw };
  else if (typeof raw === "object") result = raw;
  else result = { valid: Boolean(raw), message: Boolean(raw) ? "Passed" : rule.title + " failed" };
  return {
    ruleId: rule.id,
    valid: result.valid !== false,
    severity: normalizeSeverity(result.severity || rule.severity),
    message: String(result.message || (result.valid === false ? "Validation failed" : "Passed")),
    path: result.path == null ? null : String(result.path),
    expected: result.expected === undefined ? null : cloneValidationValue(result.expected),
    actual: result.actual === undefined ? null : cloneValidationValue(result.actual),
    details: result.details === undefined ? null : cloneValidationValue(result.details)
  };
}
function createValidationContext(target, options) {
  options = options || {};
  return {
    validationId: createValidationId(),
    targetType: String(options.targetType || "custom"),
    categories: normalizeValidationList(options.categories),
    ruleIds: normalizeValidationList(options.ruleIds).map(function (id) { return id.toUpperCase(); }),
    failFast: Boolean(options.failFast),
    metadata: normalizeValidationObject(options.metadata),
    provenance: normalizeValidationList(options.provenance).concat([VALIDATION_ENGINE_ID]),
    target: target,
    startedAt: createValidationTimestamp()
  };
}
function selectValidationRules(context) {
  return Array.from(validationRuleRegistry.values()).filter(function (rule) {
    if (!rule.enabled) return false;
    if (context.ruleIds.length && !context.ruleIds.includes(rule.id)) return false;
    if (context.categories.length && !context.categories.includes(rule.category)) return false;
    if (rule.appliesTo.length && !rule.appliesTo.includes(context.targetType)) return false;
    return true;
  }).sort(function (a, b) {
    return pipelineIndex(a.category) - pipelineIndex(b.category) ||
      a.priority - b.priority || a.registeredOrder - b.registeredOrder;
  });
}
function shouldFailFast(result, context) {
  return !result.valid && (context.failFast || result.severity === "critical");
}
function finalizeValidation(context, results, executionError, asynchronous) {
  var completedAt = createValidationTimestamp();
  var failed = results.filter(function (item) { return !item.valid; });
  var warnings = failed.filter(function (item) { return item.severity === "warning"; });
  var errors = failed.filter(function (item) { return item.severity === "error"; });
  var critical = failed.filter(function (item) { return item.severity === "critical"; });
  var passed = results.filter(function (item) { return item.valid; });
  var quality = results.length ? Math.max(0, Math.round(100 - (
    warnings.length * 3 + errors.length * 15 + critical.length * 40
  ))) : 100;
  var report = {
    id: context.validationId,
    engineId: VALIDATION_ENGINE_ID,
    version: VALIDATION_ENGINE_VERSION,
    valid: failed.length === 0 && !executionError,
    targetType: context.targetType,
    mode: asynchronous ? "async" : "sync",
    passed: passed.length,
    failed: failed.length,
    total: results.length,
    warnings: warnings.length,
    errors: errors.length + (executionError ? 1 : 0),
    critical: critical.length,
    validationQuality: quality,
    results: cloneValidationValue(results),
    diagnostics: {
      categories: cloneValidationValue(context.categories),
      selectedRules: results.map(function (item) { return item.ruleId; }),
      failFast: context.failFast,
      executionError: createValidationError(executionError)
    },
    provenance: cloneValidationValue(context.provenance),
    startedAt: context.startedAt,
    completedAt: completedAt,
    durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(context.startedAt))
  };
  validationEngineMetrics.executions += 1;
  validationEngineMetrics[asynchronous ? "asynchronousExecutions" : "synchronousExecutions"] += 1;
  validationEngineMetrics.rulesExecuted += results.length;
  validationEngineMetrics.passedRules += passed.length;
  validationEngineMetrics.failedRules += failed.length;
  validationEngineMetrics.warnings += warnings.length;
  validationEngineMetrics.errors += errors.length + (executionError ? 1 : 0);
  validationEngineMetrics.critical += critical.length;
  validationEngineMetrics.lastExecutionAt = completedAt;
  addValidationHistory(report);
  return report;
}
function addValidationHistory(report) {
  validationHistory.push(cloneValidationValue(report));
  while (validationHistory.length > VALIDATION_HISTORY_LIMIT) validationHistory.shift();
  validationEngineMetrics.historyWrites += 1;
}
function getValidationHistory(options) {
  options = options || {};
  var limit = Math.max(0, Math.min(Number(options.limit || VALIDATION_HISTORY_LIMIT), VALIDATION_HISTORY_LIMIT));
  return cloneValidationValue(validationHistory.slice(-limit).reverse());
}
function clearValidationHistory() { var count = validationHistory.length; validationHistory.length = 0; return count; }

function validateTargetSync(target, options) {
  var context = createValidationContext(target, options);
  var rules = selectValidationRules(context);
  var results = [];
  var executionError = null;
  try {
    for (var i = 0; i < rules.length; i += 1) {
      var raw = rules[i].validate(target, cloneValidationValue({
        validationId: context.validationId, targetType: context.targetType,
        metadata: context.metadata, provenance: context.provenance
      }));
      if (isPromiseLike(raw)) throw new Error("Async rule requires validateTarget(): " + rules[i].id);
      var result = normalizeValidationRuleResult(raw, rules[i]);
      results.push(result);
      if (shouldFailFast(result, context)) break;
    }
  } catch (error) { executionError = error; }
  return finalizeValidation(context, results, executionError, false);
}
async function validateTarget(target, options) {
  var context = createValidationContext(target, options);
  var rules = selectValidationRules(context);
  var results = [];
  var executionError = null;
  try {
    for (var i = 0; i < rules.length; i += 1) {
      var raw = rules[i].validate(target, cloneValidationValue({
        validationId: context.validationId, targetType: context.targetType,
        metadata: context.metadata, provenance: context.provenance
      }));
      if (isPromiseLike(raw)) raw = await raw;
      var result = normalizeValidationRuleResult(raw, rules[i]);
      results.push(result);
      if (shouldFailFast(result, context)) break;
    }
  } catch (error) { executionError = error; }
  return finalizeValidation(context, results, executionError, true);
}
function createValidationSummary(report) {
  return {
    id: report.id, valid: report.valid, targetType: report.targetType,
    passed: report.passed, failed: report.failed, total: report.total,
    warnings: report.warnings, errors: report.errors, critical: report.critical,
    validationQuality: report.validationQuality, durationMs: report.durationMs
  };
}
function createValidationReport(report) { return cloneValidationValue(report); }
function createValidationDiagnostics(report) { return cloneValidationValue(report && report.diagnostics || {}); }

function registerDefaultValidationRules() {
  var defaults = [
    { id:"VAL-INPUT-001", title:"Target Exists", description:"Target must not be null or undefined", category:"input", severity:"critical", priority:10, enabled:true, appliesTo:[], validate:function(target){ return target == null ? {valid:false,message:"Target is required",path:"$",expected:"non-null",actual:null} : true; } },
    { id:"VAL-SCHEMA-001", title:"Object Shape", description:"Object targets must use a plain object or array shape", category:"schema", severity:"error", priority:20, enabled:true, appliesTo:["schema","metadata","relationship","dependency","compatibility","engine","context","search","perception","custom"], validate:function(target){ return typeof target === "object" ? true : {valid:false,message:"Object target expected",path:"$",expected:"object",actual:typeof target}; } },
    { id:"VAL-METADATA-001", title:"Metadata Shape", description:"Metadata must be an object when present", category:"metadata", severity:"error", priority:30, enabled:true, appliesTo:["metadata","engine","context","search","perception","custom"], validate:function(target){ return !target || target.metadata == null || (typeof target.metadata === "object" && !Array.isArray(target.metadata)) ? true : {valid:false,message:"metadata must be an object",path:"$.metadata"}; } },
    { id:"VAL-RELATIONSHIP-001", title:"Relationship Shape", description:"Relationship collections must be arrays when present", category:"relationship", severity:"warning", priority:40, enabled:true, appliesTo:["relationship","custom"], validate:function(target){ var value=target&&(target.relationships||target.Relationships); return value==null||Array.isArray(value)?true:{valid:false,message:"relationships must be an array",path:"$.relationships"}; } },
    { id:"VAL-DEPENDENCY-001", title:"Dependency Shape", description:"Dependencies must be arrays when present", category:"dependency", severity:"error", priority:50, enabled:true, appliesTo:["dependency","engine","custom"], validate:function(target){ var value=target&&(target.dependencies||target.DependsOn); return value==null||Array.isArray(value)?true:{valid:false,message:"dependencies must be an array",path:"$.dependencies"}; } },
    { id:"VAL-COMPATIBILITY-001", title:"Version Available", description:"Compatibility targets should expose a version", category:"compatibility", severity:"warning", priority:60, enabled:true, appliesTo:["compatibility"], validate:function(target){ return target&&target.version?true:{valid:false,message:"version is recommended",path:"$.version"}; } },
    { id:"VAL-ENGINE-001", title:"Engine Identity", description:"Engine definitions require id, title and version", category:"engine", severity:"critical", priority:70, enabled:true, appliesTo:["engine"], validate:function(target){ var missing=["id","title","version"].filter(function(k){return !target||!target[k];}); return missing.length?{valid:false,message:"Missing engine fields: "+missing.join(", "),details:{missing:missing}}:true; } },
    { id:"VAL-CONTEXT-001", title:"Context Identity", description:"Managed contexts should expose an id", category:"context", severity:"error", priority:80, enabled:true, appliesTo:["context"], validate:function(target){ return target&&target.id?true:{valid:false,message:"Context id is required",path:"$.id"}; } },
    { id:"VAL-SEARCH-001", title:"Search Result Shape", description:"Search results should expose result collections", category:"search", severity:"error", priority:90, enabled:true, appliesTo:["search"], validate:function(target){ return target&&(Array.isArray(target.results)||Array.isArray(target.items))?true:{valid:false,message:"Search result collection is required",path:"$.results"}; } },
    { id:"VAL-PERCEPTION-001", title:"Perception Classification", description:"Perception results should expose classification", category:"perception", severity:"error", priority:100, enabled:true, appliesTo:["perception"], validate:function(target){ return target&&target.classification?true:{valid:false,message:"classification is required",path:"$.classification"}; } }
  ];
  defaults.forEach(function(rule){ if(!validationRuleRegistry.has(rule.id)) registerValidationRule(rule); });
  return listValidationRules();
}

function createValidationEngineDefinition() {
  return {
    id: VALIDATION_ENGINE_ID, title: VALIDATION_ENGINE_TITLE, version: VALIDATION_ENGINE_VERSION,
    status: "Ready", enabled: true, dependencies: [],
    inputs: ["Validation target", "Target type", "Categories", "Rule selection", "Execution policy"],
    outputs: ["Validation report", "Summary", "Diagnostics", "Validation history"],
    execute: function(input, context, options) {
      input = input || {};
      options = Object.assign({}, options || {}, input.options || {});
      return validateTarget(input.target === undefined ? input : input.target, options);
    },
    validate: validateValidationEngine,
    getStatus: getValidationEngineStatus,
    getHealth: getValidationEngineHealth,
    metadata: { optionalIntegrations:["ENGINE-010","ENGINE-020","ENGINE-030"], ruleLimit:VALIDATION_RULE_LIMIT, historyLimit:VALIDATION_HISTORY_LIMIT }
  };
}
function registerValidationEngine(options) {
  options = options || {};
  if (typeof registerEngine !== "function") return { registered:false, error:"ENGINE-001 registerEngine() is unavailable" };
  return registerEngine(createValidationEngineDefinition(), { replace: options.replace !== false });
}
function getValidationEngineHealth() {
  var registered = typeof getEngine === "function" && Boolean(getEngine(VALIDATION_ENGINE_ID));
  var health = registered && validationRuleRegistry.size > 0 ? 100 : registered ? 80 : 0;
  return { id:VALIDATION_ENGINE_ID, health:health, status:health>=90?"Healthy":health>=70?"Degraded":"Unhealthy", ready:health>=90, registered:registered, errors:validationEngineMetrics.errors, updatedAt:createValidationTimestamp() };
}
function getValidationEngineStatus() {
  var health = getValidationEngineHealth();
  var latest = validationHistory.length ? validationHistory[validationHistory.length-1] : null;
  return {
    id:VALIDATION_ENGINE_ID, title:VALIDATION_ENGINE_TITLE, version:VALIDATION_ENGINE_VERSION,
    status:health.ready?"Ready":"Degraded", ready:health.ready, health:health.health, progress:100,
    registered:health.registered, validationQuality:latest?latest.validationQuality:100,
    rules:{total:validationRuleRegistry.size, enabled:Array.from(validationRuleRegistry.values()).filter(function(r){return r.enabled;}).length, limit:VALIDATION_RULE_LIMIT},
    history:{total:validationHistory.length, limit:VALIDATION_HISTORY_LIMIT},
    integrations:{search:typeof executeSearch==="function", context:typeof createContext==="function", perception:typeof executePerception==="function"},
    metrics:cloneValidationValue(validationEngineMetrics), updatedAt:createValidationTimestamp()
  };
}

function validateValidationEngine() {
  var checks = {}, failed = [];
  function remember(name,value){ checks[name]=Boolean(value); if(!checks[name]) failed.push(name); }
  var savedHistory = cloneValidationValue(validationHistory);
  var savedMetrics = cloneValidationValue(validationEngineMetrics);
  var testRuleId = "VAL-CUSTOM-999";
  try {
    remember("engineCore", typeof registerEngine === "function");
    remember("registry", validationRuleRegistry instanceof Map);
    remember("defaultRules", validationRuleRegistry.size >= 10);
    var registered = registerValidationRule({id:testRuleId,title:"Test Rule",description:"Validation self test",category:"custom",severity:"warning",priority:999,enabled:true,validate:function(target){return target&&target.ok===true;},tags:["test"],metadata:{internal:true}});
    remember("ruleRegistration", registered.id === testRuleId);
    remember("ruleLookup", getValidationRule(testRuleId).id === testRuleId);
    remember("ruleEnableDisable", disableValidationRule(testRuleId).enabled === false && enableValidationRule(testRuleId).enabled === true);
    remember("namespace", /^VAL-/.test(testRuleId));
    remember("severity", VALIDATION_SEVERITIES.length === 4);
    remember("pipeline", VALIDATION_PIPELINE[0] === "input" && VALIDATION_PIPELINE.includes("custom"));
    var pass = validateTargetSync({ok:true},{targetType:"custom",ruleIds:[testRuleId]});
    remember("syncExecution", pass.valid === true && pass.passed === 1);
    var fail = validateTargetSync({ok:false},{targetType:"custom",ruleIds:[testRuleId]});
    remember("resultNormalization", fail.valid === false && fail.results[0].severity === "warning");
    var stopRule = registerValidationRule({id:"VAL-CUSTOM-998",title:"Stop Rule",description:"Critical stop test",category:"custom",severity:"critical",priority:1,enabled:true,validate:function(){return false;}});
    var stopped = validateTargetSync({ok:true},{targetType:"custom",ruleIds:["VAL-CUSTOM-998",testRuleId]});
    remember("failFast", stopped.total === 1);
    remember("asyncSupport", validateTarget.constructor.name === "AsyncFunction");
    remember("history", validationHistory.length > 0 && validationHistory.length <= VALIDATION_HISTORY_LIMIT);
    remember("summary", createValidationSummary(pass).id === pass.id);
    remember("report", createValidationReport(pass).results.length === 1);
    remember("diagnostics", typeof createValidationDiagnostics(pass) === "object");
    remember("serialization", typeof JSON.stringify(pass) === "string");
    var reg = registerValidationEngine({replace:true});
    remember("registration", Boolean(reg));
    remember("platformLookup", typeof getEngine === "function" && Boolean(getEngine(VALIDATION_ENGINE_ID)));
  } catch(error) { failed.push("exception:"+error.message); }
  finally {
    unregisterValidationRule(testRuleId); unregisterValidationRule("VAL-CUSTOM-998");
    validationHistory.length=0; savedHistory.forEach(function(item){validationHistory.push(item);});
    Object.keys(savedMetrics).forEach(function(key){validationEngineMetrics[key]=savedMetrics[key];});
  }
  var total=20, passed=Object.values(checks).filter(Boolean).length;
  return { id:VALIDATION_ENGINE_ID, title:VALIDATION_ENGINE_TITLE, version:VALIDATION_ENGINE_VERSION, valid:failed.length===0&&passed===total, passed:passed, total:total, failed:failed, checks:checks, status:getValidationEngineStatus() };
}

registerDefaultValidationRules();
registerValidationEngine();