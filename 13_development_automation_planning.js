/* ============================================================
   FILE: 13_development_automation_planning.js
   IDE-190 Development Automation
   Release: 1.2.0 / Module: Planning 1.0.0
   Phase 3: Plan / Propose / Dry Run / Preflight
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 planning blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("planning");

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function sortKey(key) { output[key] = stableValue(value[key]); });
    return output;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256Text(value) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return null;
    const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(String(value)));
    return Array.from(new Uint8Array(digest)).map(function toHex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function planHashInput(plan) {
    const copy = internal.clone(plan || {});
    delete copy.planHash;
    delete copy.immutable;
    return copy;
  }

  async function computePlanHash(plan) { return sha256Text(stableStringify(planHashInput(plan))); }

  function normalizeOperation(settings, grounding) {
    const operation = internal.isPlainObject(settings.operation) ? settings.operation : {};
    return {
      operationType: internal.text(operation.operationType || settings.operationType, ""),
      capabilityId: internal.text(operation.capabilityId || settings.capabilityId, ""),
      target: internal.clone(operation.target || settings.target || grounding.canonicalTarget || {}),
      scope: internal.clone(operation.scope || settings.scope || { type: "canonical-target", canonicalId: grounding.canonicalTarget && grounding.canonicalTarget.canonicalId || null }),
      parameters: internal.clone(operation.parameters || settings.parameters || {})
    };
  }

  function hardDenied(levels) {
    return levels.automationLevel === "L5" || levels.mutationLevel === "M3" || levels.requestedExecutionMode === "E2" || levels.externalEffectLevel === "X2" || levels.externalEffectLevel === "X3";
  }

  async function createAutomationPlan(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const groundingId = internal.text(settings.groundingId, state.latestGroundingId || "");
    const grounding = state.groundings.get(groundingId) || null;
    if (!grounding) return internal.buildResult(false, "IDE190_GROUNDED_CONTEXT_REQUIRED", "Blocked", null, { error: { message: "Grounded IDE-180 context is required before Planning.", category: "Input" } });
    if (grounding.groundingStatus !== "Grounded" || grounding.planEligible !== true || (grounding.missingSources || []).length > 0) {
      return internal.buildResult(false, "IDE190_PLAN_BLOCKED_BY_GROUNDING", grounding.groundingStatus === "Recovery-Required" ? "Recovery-Required" : "Blocked", { grounding: internal.clone(grounding) });
    }

    const operation = normalizeOperation(settings, grounding);
    if (!operation.operationType || !operation.capabilityId) {
      return internal.buildResult(false, "IDE190_PLAN_OPERATION_REQUIRED", "Blocked", null, { error: { message: "operationType and capabilityId are required. IDE-190 will not infer an executable operation.", category: "Input" } });
    }

    const levels = {
      automationLevel: internal.text(settings.automationLevel, "L2"),
      mutationLevel: internal.text(settings.mutationLevel, "M0"),
      requestedExecutionMode: internal.text(settings.requestedExecutionMode, "E0"),
      externalEffectLevel: internal.text(settings.externalEffectLevel, "X0")
    };
    if (hardDenied(levels)) return internal.buildResult(false, "IDE190_PLAN_HARD_DENY", "Blocked", { requested: levels });

    const createdAt = internal.nowIso();
    const plan = {
      planId: internal.nextId("IDE-190-PLAN"),
      planVersion: "1.0.0",
      planHash: "",
      groundingId: grounding.groundingId,
      intakeId: grounding.intakeId,
      packageId: grounding.packageId,
      packageHash: grounding.packageHash,
      handoffId: grounding.handoffId,
      handoffHash: grounding.handoffHash,
      validationLayer: "V1",
      objective: internal.text(settings.objective, operation.operationType),
      operation: operation,
      automationLevel: levels.automationLevel,
      mutationLevel: levels.mutationLevel,
      requestedExecutionMode: levels.requestedExecutionMode,
      externalEffectLevel: levels.externalEffectLevel,
      repositoryBaseline: internal.isPlainObject(settings.repositoryBaseline) ? internal.clone(settings.repositoryBaseline) : null,
      evidenceBinding: {
        sourceComponentId: "IDE-180",
        groundingId: grounding.groundingId,
        packageId: grounding.packageId,
        packageHash: grounding.packageHash,
        handoffId: grounding.handoffId,
        handoffHash: grounding.handoffHash,
        evidenceCount: Array.isArray(grounding.evidence) ? grounding.evidence.length : 0,
        sourceSnapshot: internal.clone(grounding.sourceSnapshot || {})
      },
      approvalRequested: false,
      autoApply: false,
      dispatchEligible: false,
      readOnly: true,
      immutable: true,
      createdAt: createdAt
    };
    plan.planHash = await computePlanHash(plan);
    if (!plan.planHash) return internal.buildResult(false, "IDE190_PLAN_HASH_UNAVAILABLE", "Blocked", null, { error: { message: "SHA-256 is required for Plan identity.", category: "Dependency" } });

    const contract = namespace.validateContract("automationPlan", plan);
    if (!contract.valid) return internal.buildResult(false, "IDE190_PLAN_CONTRACT_INVALID", "Blocked", { plan: plan, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(plan));
    state.plans.set(frozen.planId, frozen);
    state.latestPlanId = frozen.planId;
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_PLAN_READY", "Planned", { plan: internal.clone(frozen), validation: contract });
  }

  async function verifyAutomationPlanHash(planOrId) {
    const plan = typeof planOrId === "string" ? state.plans.get(planOrId) : planOrId;
    if (!plan) return { valid: false, expected: null, actual: null };
    const expected = await computePlanHash(plan);
    return { valid: Boolean(expected && expected === plan.planHash), expected: expected, actual: plan.planHash };
  }

  function getAutomationPlan(planId) { return internal.clone(state.plans.get(internal.text(planId, "")) || null); }
  function getLatestAutomationPlan() { return state.latestPlanId ? getAutomationPlan(state.latestPlanId) : null; }
  function listAutomationPlans() { return Array.from(state.plans.values()).map(function copy(item) { return internal.clone(item); }); }

  function initializePlanning() {
    namespace.modules.planning.status = "Ready";
    return internal.buildResult(true, "IDE190_PLANNING_INITIALIZED", "Ready", { planCount: state.plans.size, validationLayer: "V1" });
  }

  Object.assign(namespace.api, {
    initializePlanning: initializePlanning,
    createAutomationPlan: createAutomationPlan,
    verifyAutomationPlanHash: verifyAutomationPlanHash,
    getAutomationPlan: getAutomationPlan,
    getLatestAutomationPlan: getLatestAutomationPlan,
    listAutomationPlans: listAutomationPlans
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.planning = {
    id: "IDE-190-PLANNING", version: MODULE_VERSION, status: "Loaded", phase: 3,
    validationLayer: "V1", groundingRequired: true, operationInferenceAllowed: false,
    approvalRequested: false, autoApply: false, dispatchImplemented: false, readOnly: true, loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
