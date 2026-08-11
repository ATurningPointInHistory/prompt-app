/* ============================================================
   FILE: 13_development_automation_dry_run.js
   IDE-190 Development Automation
   Release: 1.2.0 / Module: Dry Run 1.0.0
   Phase 3: Plan / Propose / Dry Run / Preflight
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 dry run blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("dryRun");

  async function runAutomationDryRun(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const proposalId = internal.text(settings.proposalId, state.latestProposalId || "");
    const proposal = state.proposals.get(proposalId) || null;
    if (!proposal) return internal.buildResult(false, "IDE190_PROPOSAL_REQUIRED_FOR_DRY_RUN", "Blocked", null);
    const plan = state.plans.get(proposal.planId) || null;
    const grounding = plan && state.groundings.get(plan.groundingId) || null;
    const planHash = plan ? await namespace.verifyAutomationPlanHash(plan) : { valid: false };
    const checks = [
      { name: "Plan exists", passed: Boolean(plan), detail: proposal.planId },
      { name: "Plan hash is valid", passed: planHash.valid === true, detail: plan && plan.planHash },
      { name: "Proposal is bound to Plan", passed: Boolean(plan && proposal.planHash === plan.planHash), detail: proposal.planHash },
      { name: "Grounding is complete", passed: Boolean(grounding && grounding.groundingStatus === "Grounded" && grounding.planEligible === true), detail: grounding && grounding.groundingStatus },
      { name: "No Missing Source", passed: Boolean(grounding && Array.isArray(grounding.missingSources) && grounding.missingSources.length === 0), detail: grounding && grounding.missingSources && grounding.missingSources.length },
      { name: "No execution adapter invocation in Phase 3", passed: true, detail: "IDE-160/IDE-150 not invoked" }
    ];
    const dryRunPassed = checks.every(function pass(item) { return item.passed; });
    const record = {
      dryRunId: internal.nextId("IDE-190-DRY-RUN"),
      proposalId: proposal.proposalId,
      planId: proposal.planId,
      planHash: proposal.planHash,
      validationLayer: "V2",
      executionMode: "E0",
      dryRunStatus: dryRunPassed ? "Passed" : "Blocked",
      repositoryMutation: false,
      repositoryWriteCount: 0,
      sourceUnchanged: true,
      applicationAttempted: false,
      approvalRequested: false,
      autoApply: false,
      dispatchEligible: false,
      checks: checks,
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("dryRunRecord", record);
    if (!contract.valid) return internal.buildResult(false, "IDE190_DRY_RUN_CONTRACT_INVALID", "Blocked", { dryRun: record, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(record));
    state.dryRuns.set(frozen.dryRunId, frozen);
    state.latestDryRunId = frozen.dryRunId;
    internal.touch();
    return internal.buildResult(dryRunPassed, dryRunPassed ? "IDE190_E0_DRY_RUN_PASSED" : "IDE190_E0_DRY_RUN_BLOCKED", dryRunPassed ? "Passed" : "Blocked", { dryRun: internal.clone(frozen), validation: contract });
  }

  function getAutomationDryRun(dryRunId) { return internal.clone(state.dryRuns.get(internal.text(dryRunId, "")) || null); }
  function getLatestAutomationDryRun() { return state.latestDryRunId ? getAutomationDryRun(state.latestDryRunId) : null; }
  function listAutomationDryRuns() { return Array.from(state.dryRuns.values()).map(function copy(item) { return internal.clone(item); }); }
  function initializeDryRun() { namespace.modules.dryRun.status = "Ready"; return internal.buildResult(true, "IDE190_DRY_RUN_INITIALIZED", "Ready", { dryRunCount: state.dryRuns.size, executionMode: "E0" }); }

  Object.assign(namespace.api, { initializeDryRun, runAutomationDryRun, getAutomationDryRun, getLatestAutomationDryRun, listAutomationDryRuns });
  Object.assign(namespace, namespace.api);
  namespace.modules.dryRun = { id: "IDE-190-DRY-RUN", version: MODULE_VERSION, status: "Loaded", phase: 3, validationLayer: "V2", executionMode: "E0", repositoryMutationAllowed: false, applicationAttempted: false, approvalRequested: false, dispatchImplemented: false, readOnly: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
