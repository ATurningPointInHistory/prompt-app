/* ============================================================
   FILE: 13_development_automation_preflight.js
   IDE-190 Development Automation
   Release: 1.2.0 / Module: Preflight 1.0.0
   Phase 3: Plan / Propose / Dry Run / Preflight
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 preflight blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("preflight");

  function requiredApprovalClass(plan) {
    if (!plan) return "P0";
    if (plan.mutationLevel === "M2" || plan.automationLevel === "L4") return "P2";
    if (plan.mutationLevel === "M1" || plan.automationLevel === "L3" || plan.requestedExecutionMode === "E1") return "P1";
    return "P0";
  }

  function hasRepositoryBaseline(plan) {
    if (!plan || !(plan.mutationLevel === "M2" || plan.automationLevel === "L4")) return true;
    const baseline = plan.repositoryBaseline;
    return Boolean(baseline && typeof baseline === "object" && internal.text(baseline.repositoryBaselineId, "") && internal.text(baseline.repositoryHash, ""));
  }

  async function runAutomationPreflight(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const dryRunId = internal.text(settings.dryRunId, state.latestDryRunId || "");
    const dryRun = state.dryRuns.get(dryRunId) || null;
    const proposal = dryRun && state.proposals.get(dryRun.proposalId) || null;
    const plan = proposal && state.plans.get(proposal.planId) || null;
    const grounding = plan && state.groundings.get(plan.groundingId) || null;
    const hash = plan ? await namespace.verifyAutomationPlanHash(plan) : { valid: false };
    const safety = namespace.getSafetyStatus();
    const hardDenied = Boolean(plan && (plan.automationLevel === "L5" || plan.mutationLevel === "M3" || plan.requestedExecutionMode === "E2" || plan.externalEffectLevel === "X2" || plan.externalEffectLevel === "X3"));
    const checks = [
      { name: "Dry Run exists and passed", passed: Boolean(dryRun && dryRun.dryRunStatus === "Passed"), detail: dryRun && dryRun.dryRunStatus },
      { name: "E0 invariants remain intact", passed: Boolean(dryRun && dryRun.repositoryMutation === false && dryRun.repositoryWriteCount === 0 && dryRun.sourceUnchanged === true && dryRun.applicationAttempted === false && dryRun.approvalRequested === false && dryRun.autoApply === false), detail: dryRun && dryRun.repositoryWriteCount },
      { name: "Proposal is Plan-bound", passed: Boolean(proposal && plan && proposal.planHash === plan.planHash), detail: proposal && proposal.planHash },
      { name: "Plan hash is valid", passed: hash.valid === true, detail: plan && plan.planHash },
      { name: "Grounding remains complete", passed: Boolean(grounding && grounding.groundingStatus === "Grounded" && grounding.planEligible === true && (grounding.missingSources || []).length === 0), detail: grounding && grounding.groundingStatus },
      { name: "No Initial hard-deny level requested", passed: hardDenied === false, detail: hardDenied },
      { name: "Repository baseline is explicit when M2/L4 is requested", passed: hasRepositoryBaseline(plan), detail: plan && plan.repositoryBaseline && plan.repositoryBaseline.repositoryBaselineId },
      { name: "Direct Repository Mutation remains disabled", passed: safety.directRepositoryMutationAllowed === false, detail: safety.directRepositoryMutationAllowed },
      { name: "Automatic Workflow Execution remains disabled", passed: safety.automaticWorkflowExecutionAllowed === false, detail: safety.automaticWorkflowExecutionAllowed },
      { name: "GitHub Automatic Reflection remains disabled", passed: safety.githubAutomaticReflectionAllowed === false, detail: safety.githubAutomaticReflectionAllowed },
      { name: "Gate has not been evaluated in Phase 3", passed: true, detail: "Phase 4 owns Gate / Approval / Consent" }
    ];
    const passed = checks.every(function pass(item) { return item.passed; });
    const preflight = {
      preflightId: internal.nextId("IDE-190-PREFLIGHT"),
      dryRunId: dryRun && dryRun.dryRunId || dryRunId,
      proposalId: proposal && proposal.proposalId || "",
      planId: plan && plan.planId || "",
      planHash: plan && plan.planHash || "",
      validationLayer: "V3",
      preflightStatus: passed ? "Passed" : "Blocked",
      approvalClassRequired: requiredApprovalClass(plan),
      approvalRequested: false,
      gateRequired: true,
      gatePassed: false,
      dispatchEligible: false,
      repositoryMutation: false,
      repositoryWriteCount: 0,
      checks: checks,
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("preflightRecord", preflight);
    if (!contract.valid) return internal.buildResult(false, "IDE190_PREFLIGHT_CONTRACT_INVALID", "Blocked", { preflight: preflight, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(preflight));
    state.preflights.set(frozen.preflightId, frozen);
    state.latestPreflightId = frozen.preflightId;
    internal.touch();
    return internal.buildResult(passed, passed ? "IDE190_PREFLIGHT_PASSED" : "IDE190_PREFLIGHT_BLOCKED", passed ? "Passed" : "Blocked", { preflight: internal.clone(frozen), validation: contract });
  }

  function getAutomationPreflight(preflightId) { return internal.clone(state.preflights.get(internal.text(preflightId, "")) || null); }
  function getLatestAutomationPreflight() { return state.latestPreflightId ? getAutomationPreflight(state.latestPreflightId) : null; }
  function listAutomationPreflights() { return Array.from(state.preflights.values()).map(function copy(item) { return internal.clone(item); }); }
  function initializePreflight() { namespace.modules.preflight.status = "Ready"; return internal.buildResult(true, "IDE190_PREFLIGHT_INITIALIZED", "Ready", { preflightCount: state.preflights.size, validationLayer: "V3" }); }

  Object.assign(namespace.api, { initializePreflight, runAutomationPreflight, getAutomationPreflight, getLatestAutomationPreflight, listAutomationPreflights });
  Object.assign(namespace, namespace.api);
  namespace.modules.preflight = { id: "IDE-190-PREFLIGHT", version: MODULE_VERSION, status: "Loaded", phase: 3, validationLayer: "V3", gateRequired: true, gateImplemented: false, approvalRequested: false, dispatchImplemented: false, repositoryMutationAllowed: false, readOnly: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
