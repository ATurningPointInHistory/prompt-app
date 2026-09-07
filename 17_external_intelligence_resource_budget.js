/* ============================================================
   FILE: 17_external_intelligence_resource_budget.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.2.0
   Phase 03: Source Governance / Discovery / Budget / Usage Policy
   Decision: EXTERNAL-010-DECISION-024
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 resource budget blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("resourceBudget");
  const HIERARCHY = Object.freeze(VERSION_MANIFEST.resourceBudget.hierarchy.slice());
  const DIMENSIONS = Object.freeze(VERSION_MANIFEST.resourceBudget.resourceDimensions.slice());
  const BUDGET_STATES = Object.freeze(["CANDIDATE", "ACTIVE", "BLOCKED", "EXHAUSTED", "REVOKED"]);

  function upper(value, fallback) { return internal.text(value, fallback || "").toUpperCase(); }
  function finiteNonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function normalizePeriod(value) {
    const input = internal.isPlainObject(value) ? value : {};
    return {
      type: upper(input.type, "UNBOUNDED"),
      startsAt: input.startsAt ? internal.text(input.startsAt, "") : null,
      endsAt: input.endsAt ? internal.text(input.endsAt, "") : null
    };
  }

  function normalizeLimits(value) {
    const input = internal.isPlainObject(value) ? value : {};
    const output = {};
    DIMENSIONS.forEach(function dimensionLimit(dimension) {
      if (!Object.prototype.hasOwnProperty.call(input, dimension)) return;
      const raw = internal.isPlainObject(input[dimension]) ? input[dimension] : {};
      const soft = raw.softLimit == null ? null : finiteNonNegative(raw.softLimit);
      const hard = raw.hardLimit == null ? null : finiteNonNegative(raw.hardLimit);
      if ((raw.softLimit != null && soft == null) || (raw.hardLimit != null && hard == null)) return;
      if (soft != null && hard != null && soft > hard) return;
      output[dimension] = { softLimit: soft, hardLimit: hard };
    });
    return output;
  }

  function normalizeUsage(value) {
    const input = internal.isPlainObject(value) ? value : {};
    const output = {};
    DIMENSIONS.forEach(function dimensionUsage(dimension) {
      if (!Object.prototype.hasOwnProperty.call(input, dimension)) return;
      const number = finiteNonNegative(input[dimension]);
      if (number != null) output[dimension] = number;
    });
    return output;
  }

  function zeroConsumed(limits) {
    const output = {};
    Object.keys(limits || {}).forEach(function initDimension(dimension) { output[dimension] = 0; });
    return output;
  }

  function validateBudgetRecord(record) {
    const contract = namespace.validateExternalIntelligenceContract("resourceBudget", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-RESOURCE-BUDGET", record);
    return { valid: contract.valid === true && schema.valid === true, contract: contract, schema: schema };
  }

  function validateUsageRecord(record) {
    const contract = namespace.validateExternalIntelligenceContract("resourceUsageRecord", record);
    const schema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-RESOURCE-USAGE-RECORD", record);
    return { valid: contract.valid === true && schema.valid === true, contract: contract, schema: schema };
  }

  function getHistoryRef(budgetId) {
    if (!state.resourceBudgetHistory.has(budgetId)) state.resourceBudgetHistory.set(budgetId, []);
    return state.resourceBudgetHistory.get(budgetId);
  }

  function commitBudgetVersion(budgetId, patch) {
    const current = state.resourceBudgets.get(budgetId);
    if (!current) return null;
    const now = internal.nowIso();
    const next = internal.deepFreeze(Object.assign({}, internal.clone(current), internal.clone(patch || {}), {
      budgetId: budgetId,
      authorityGranted: false,
      automaticReallocationAllowed: false,
      version: current.version + 1,
      createdAt: current.createdAt,
      updatedAt: now,
      immutable: true
    }));
    const validation = validateBudgetRecord(next);
    if (!validation.valid) return null;
    state.resourceBudgets.set(budgetId, next);
    getHistoryRef(budgetId).push(next);
    internal.touch();
    return next;
  }

  function createExternalIntelligenceResourceBudgetCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const scopeType = upper(settings.scopeType, "");
    const scopeId = internal.text(settings.scopeId, "");
    const limits = normalizeLimits(settings.limits);
    if (!HIERARCHY.includes(scopeType) || !scopeId || !Object.keys(limits).length) {
      return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_CANDIDATE_INVALID", "Blocked", { scopeType: scopeType || null, scopeId: scopeId || null });
    }
    if (settings.parentBudgetId) {
      const parent = state.resourceBudgets.get(internal.text(settings.parentBudgetId, ""));
      if (!parent) return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_PARENT_NOT_FOUND", "Blocked", { parentBudgetId: internal.text(settings.parentBudgetId, "") });
      if (HIERARCHY.indexOf(parent.scopeType) >= HIERARCHY.indexOf(scopeType)) {
        return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_PARENT_HIERARCHY_INVALID", "Blocked", { parentScopeType: parent.scopeType, scopeType: scopeType });
      }
    }
    const now = internal.nowIso();
    const budgetId = internal.text(settings.budgetId, "") || internal.nextId("EXTERNAL-010-BUDGET");
    if (state.resourceBudgets.has(budgetId)) return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_DUPLICATE", "Blocked", { budgetId: budgetId });
    const record = internal.deepFreeze({
      budgetId: budgetId,
      scopeType: scopeType,
      scopeId: scopeId,
      parentBudgetId: settings.parentBudgetId ? internal.text(settings.parentBudgetId, "") : null,
      period: normalizePeriod(settings.period),
      currency: upper(settings.currency, "JPY"),
      limits: limits,
      consumed: zeroConsumed(limits),
      state: "CANDIDATE",
      authorityGranted: false,
      automaticReallocationAllowed: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
      immutable: true
    });
    const validation = validateBudgetRecord(record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_CONTRACT_INVALID", "Blocked", { validation: validation });
    state.resourceBudgets.set(budgetId, record);
    state.resourceBudgetHistory.set(budgetId, [record]);
    state.resourceBudgetLedger.push(internal.deepFreeze({
      ledgerId: internal.nextId("EXTERNAL-010-BUDGET-LEDGER"),
      eventType: "BUDGET_CANDIDATE_CREATED",
      budgetId: budgetId,
      createdAt: now,
      immutable: true
    }));
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RESOURCE_BUDGET_CANDIDATE_CREATED", "Candidate", { budget: internal.clone(record), authorityGranted: false });
  }

  async function activateExternalIntelligenceResourceBudget(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const budgetId = internal.text(settings.budgetId, "");
    const current = state.resourceBudgets.get(budgetId);
    const purpose = internal.text(settings.purpose, "resource-budget");
    if (!current) return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_NOT_FOUND", "Blocked", { budgetId: budgetId || null });
    if (current.state !== "CANDIDATE" && current.state !== "BLOCKED") return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_STATE_INVALID", "Blocked", { budgetId: budgetId, state: current.state });
    const authority = namespace.evaluateExternalIntelligenceAuthority({ action: "ACTIVATE_RESOURCE_BUDGET", target: { type: "resource-budget", id: budgetId }, purpose: purpose });
    if (!authority.allowed) return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_AUTHORITY_DENIED", "Blocked", { budgetId: budgetId, authority: authority });
    const next = commitBudgetVersion(budgetId, { state: "ACTIVE" });
    if (!next) return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_ACTIVATION_COMMIT_FAILED", "Failed", { budgetId: budgetId });
    state.resourceBudgetLedger.push(internal.deepFreeze({ ledgerId: internal.nextId("EXTERNAL-010-BUDGET-LEDGER"), eventType: "BUDGET_ACTIVATED", budgetId: budgetId, authorityEnvelopeId: authority.authorityEnvelopeId, createdAt: internal.nowIso(), immutable: true }));
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "RESOURCE_BUDGET_ACTIVATED", actor: "Resource Budget Registry", outcome: "Active", details: { budgetId: budgetId, authorityEnvelopeId: authority.authorityEnvelopeId, hardBudgetLimitMayBeSilentlyExceeded: false } });
    return internal.buildResult(true, "EXTERNAL010_RESOURCE_BUDGET_ACTIVATED", "Active", { budget: internal.clone(next), authority: authority });
  }

  function listCandidateBudgets(settings) {
    const explicit = internal.unique(settings.budgetIds || []);
    if (explicit.length) return explicit.map(function get(id) { return state.resourceBudgets.get(id); }).filter(Boolean);
    const matches = [];
    state.resourceBudgets.forEach(function include(budget) {
      if (budget.state !== "ACTIVE") return;
      const scope = budget.scopeType;
      if (scope === "GLOBAL") matches.push(budget);
      else if (scope === "CATEGORY" && internal.text(settings.categoryId, "") === budget.scopeId) matches.push(budget);
      else if (scope === "SOURCE" && internal.text(settings.sourceId, "") === budget.scopeId) matches.push(budget);
      else if (scope === "GOAL" && internal.text(settings.goalId, "") === budget.scopeId) matches.push(budget);
      else if (scope === "PLAN" && internal.text(settings.planId, "") === budget.scopeId) matches.push(budget);
      else if (scope === "REQUEST" && internal.text(settings.requestId, "") === budget.scopeId) matches.push(budget);
    });
    return matches.sort(function hierarchyOrder(a, b) { return HIERARCHY.indexOf(a.scopeType) - HIERARCHY.indexOf(b.scopeType); });
  }

  function checkExternalIntelligenceResourceBudget(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const estimated = normalizeUsage(settings.estimatedUsage);
    const pricingMode = upper(settings.pricingMode, "FREE");
    const paid = settings.paidRequest === true || ["FIXED_MONTHLY", "USAGE_BASED", "TIERED", "UNKNOWN"].includes(pricingMode);
    if (paid && !Object.prototype.hasOwnProperty.call(estimated, "FINANCIAL_COST")) {
      const result = internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_UNKNOWN_PAID_COST", "Blocked", { unknownCostMayBeAssumedZero: false, pricingMode: pricingMode, estimatedUsage: estimated, budgetIds: [] });
      state.resourceBudgetLedger.push(internal.deepFreeze({ ledgerId: internal.nextId("EXTERNAL-010-BUDGET-LEDGER"), eventType: "UNKNOWN_PAID_COST_BLOCK", budgetId: null, createdAt: internal.nowIso(), immutable: true }));
      return result;
    }
    const budgets = listCandidateBudgets(settings);
    if (!budgets.length) return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_ACTIVE_BUDGET_REQUIRED", "Blocked", { budgetIds: [], estimatedUsage: estimated });
    const evaluations = [];
    let hardExceeded = false;
    let softExceeded = false;
    budgets.forEach(function evaluateBudget(budget) {
      const dimensions = [];
      Object.keys(budget.limits).forEach(function evaluateDimension(dimension) {
        const estimate = estimated[dimension] || 0;
        const consumed = budget.consumed[dimension] || 0;
        const projected = consumed + estimate;
        const limit = budget.limits[dimension];
        const soft = limit.softLimit != null && projected > limit.softLimit;
        const hard = limit.hardLimit != null && projected > limit.hardLimit;
        if (soft) softExceeded = true;
        if (hard) hardExceeded = true;
        dimensions.push({ dimension: dimension, consumed: consumed, estimated: estimate, projected: projected, softLimit: limit.softLimit, hardLimit: limit.hardLimit, softExceeded: soft, hardExceeded: hard });
      });
      evaluations.push({ budgetId: budget.budgetId, scopeType: budget.scopeType, scopeId: budget.scopeId, dimensions: dimensions });
    });
    if (hardExceeded) {
      state.resourceBudgetLedger.push(internal.deepFreeze({ ledgerId: internal.nextId("EXTERNAL-010-BUDGET-LEDGER"), eventType: "BUDGET_HARD_LIMIT_BLOCK", budgetId: budgets[0] && budgets[0].budgetId || null, createdAt: internal.nowIso(), immutable: true }));
      return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_HARD_LIMIT_EXCEEDED", "Blocked", { budgetIds: budgets.map(function id(b) { return b.budgetId; }), estimatedUsage: estimated, evaluations: evaluations, softLimitExceeded: softExceeded, hardLimitExceeded: true, priorityMayBypassHardLimit: false });
    }
    return internal.buildResult(true, softExceeded ? "EXTERNAL010_RESOURCE_BUDGET_SOFT_LIMIT_WARNING" : "EXTERNAL010_RESOURCE_BUDGET_CHECK_PASS", softExceeded ? "Warning" : "Ready", { budgetIds: budgets.map(function id(b) { return b.budgetId; }), estimatedUsage: estimated, evaluations: evaluations, softLimitExceeded: softExceeded, hardLimitExceeded: false, reservationPerformed: false });
  }

  async function recordExternalIntelligenceResourceUsage(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const operationId = upper(settings.operationId, "");
    const budgetIds = internal.unique(settings.budgetIds || []);
    const estimatedUsage = normalizeUsage(settings.estimatedUsage);
    const actualUsage = normalizeUsage(settings.actualUsage);
    if (!operationId || !budgetIds.length) return internal.buildResult(false, "EXTERNAL010_RESOURCE_USAGE_INVALID", "Blocked", null);
    for (const budgetId of budgetIds) {
      const budget = state.resourceBudgets.get(budgetId);
      if (!budget || budget.state !== "ACTIVE") return internal.buildResult(false, "EXTERNAL010_RESOURCE_USAGE_BUDGET_NOT_ACTIVE", "Blocked", { budgetId: budgetId });
      const projected = {};
      Object.keys(budget.consumed).forEach(function copyConsumed(dimension) { projected[dimension] = budget.consumed[dimension] || 0; });
      Object.keys(actualUsage).forEach(function addUsage(dimension) { projected[dimension] = (projected[dimension] || 0) + actualUsage[dimension]; });
      const hardExceed = Object.keys(budget.limits).some(function exceeds(dimension) {
        const hard = budget.limits[dimension].hardLimit;
        return hard != null && (projected[dimension] || 0) > hard;
      });
      if (hardExceed) return internal.buildResult(false, "EXTERNAL010_RESOURCE_USAGE_HARD_LIMIT_RECONCILIATION_BLOCK", "Blocked", { budgetId: budgetId, hardBudgetLimitMayBeSilentlyExceeded: false });
    }
    const now = internal.nowIso();
    const record = internal.deepFreeze({
      usageRecordId: internal.nextId("EXTERNAL-010-RESOURCE-USAGE"),
      operationId: operationId,
      budgetIds: budgetIds.slice(),
      estimatedUsage: estimatedUsage,
      actualUsage: actualUsage,
      sourceId: settings.sourceId ? internal.text(settings.sourceId, "") : null,
      goalId: settings.goalId ? internal.text(settings.goalId, "") : null,
      planId: settings.planId ? internal.text(settings.planId, "") : null,
      reconciled: true,
      createdAt: now,
      immutable: true
    });
    const validation = validateUsageRecord(record);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_RESOURCE_USAGE_CONTRACT_INVALID", "Blocked", { validation: validation });
    state.resourceUsageRecords.set(record.usageRecordId, record);
    budgetIds.forEach(function updateBudget(budgetId) {
      const current = state.resourceBudgets.get(budgetId);
      const consumed = internal.clone(current.consumed);
      Object.keys(actualUsage).forEach(function addDimension(dimension) { consumed[dimension] = (consumed[dimension] || 0) + actualUsage[dimension]; });
      let exhausted = false;
      Object.keys(current.limits).forEach(function checkHard(dimension) {
        const hard = current.limits[dimension].hardLimit;
        if (hard != null && (consumed[dimension] || 0) >= hard) exhausted = true;
      });
      commitBudgetVersion(budgetId, { consumed: consumed, state: exhausted ? "EXHAUSTED" : "ACTIVE" });
    });
    state.resourceBudgetLedger.push(internal.deepFreeze({ ledgerId: internal.nextId("EXTERNAL-010-BUDGET-LEDGER"), eventType: "RESOURCE_USAGE_RECORDED", budgetId: budgetIds[0] || null, usageRecordId: record.usageRecordId, createdAt: now, immutable: true }));
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "RESOURCE_USAGE_RECORDED", actor: "Resource Budget Registry", outcome: "Reconciled", details: { usageRecordId: record.usageRecordId, budgetIds: budgetIds, sourceId: record.sourceId, goalId: record.goalId, planId: record.planId } });
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RESOURCE_USAGE_RECORDED", "Reconciled", { usageRecord: internal.clone(record), automaticReallocationPerformed: false });
  }

  function createExternalIntelligenceAdditionalBudgetProposal(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const proposal = internal.deepFreeze({
      proposalId: internal.nextId("EXTERNAL-010-BUDGET-PROPOSAL"),
      budgetId: settings.budgetId ? internal.text(settings.budgetId, "") : null,
      reason: internal.text(settings.reason, "Additional budget candidate"),
      proposedLimits: normalizeLimits(settings.proposedLimits),
      budgetAuthorityGranted: false,
      automaticAllocationPerformed: false,
      subscriptionAuthorityGranted: false,
      financialTradingAuthorityGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    return internal.buildResult(true, "EXTERNAL010_ADDITIONAL_BUDGET_PROPOSAL_CREATED", "Candidate", { proposal: internal.clone(proposal) });
  }

  function getExternalIntelligenceResourceBudget(id) {
    const record = state.resourceBudgets.get(internal.text(id, ""));
    return record ? internal.clone(record) : null;
  }
  function listExternalIntelligenceResourceBudgets() { return Array.from(state.resourceBudgets.values()).map(internal.clone); }
  function getExternalIntelligenceResourceBudgetHistory(id) { return (state.resourceBudgetHistory.get(internal.text(id, "")) || []).map(internal.clone); }
  function listExternalIntelligenceResourceUsageRecords() { return Array.from(state.resourceUsageRecords.values()).map(internal.clone); }
  function getExternalIntelligenceResourceBudgetLedger() { return state.resourceBudgetLedger.map(internal.clone); }

  function initializeExternalIntelligenceResourceBudget() {
    namespace.modules.resourceBudget.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_RESOURCE_BUDGET_INITIALIZED", "Ready", {
      hierarchy: HIERARCHY.slice(),
      resourceDimensions: DIMENSIONS.slice(),
      hardLimitBlocksExecution: true,
      unknownCostMayBeAssumedZero: false,
      automaticReallocationAllowed: false,
      budgetCount: state.resourceBudgets.size
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceResourceBudget: initializeExternalIntelligenceResourceBudget,
    createExternalIntelligenceResourceBudgetCandidate: createExternalIntelligenceResourceBudgetCandidate,
    activateExternalIntelligenceResourceBudget: activateExternalIntelligenceResourceBudget,
    checkExternalIntelligenceResourceBudget: checkExternalIntelligenceResourceBudget,
    recordExternalIntelligenceResourceUsage: recordExternalIntelligenceResourceUsage,
    createExternalIntelligenceAdditionalBudgetProposal: createExternalIntelligenceAdditionalBudgetProposal,
    getExternalIntelligenceResourceBudget: getExternalIntelligenceResourceBudget,
    listExternalIntelligenceResourceBudgets: listExternalIntelligenceResourceBudgets,
    getExternalIntelligenceResourceBudgetHistory: getExternalIntelligenceResourceBudgetHistory,
    listExternalIntelligenceResourceUsageRecords: listExternalIntelligenceResourceUsageRecords,
    getExternalIntelligenceResourceBudgetLedger: getExternalIntelligenceResourceBudgetLedger
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.resourceBudget = {
    id: "EXTERNAL-010-RESOURCE-BUDGET",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    hierarchy: HIERARCHY.slice(),
    hardLimitMayBeSilentlyExceeded: false,
    unknownCostMayBeAssumedZero: false,
    automaticReallocationAllowed: false,
    tradingAuthorityGranted: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
