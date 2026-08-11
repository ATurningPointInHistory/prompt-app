/* ============================================================
   FILE: 13_development_automation_proposal.js
   IDE-190 Development Automation
   Release: 1.2.0 / Module: Proposal 1.0.0
   Phase 3: Plan / Propose / Dry Run / Preflight
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 proposal blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("proposal");

  async function createAutomationProposal(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const planId = internal.text(settings.planId, state.latestPlanId || "");
    const plan = state.plans.get(planId) || null;
    if (!plan) return internal.buildResult(false, "IDE190_PLAN_REQUIRED_FOR_PROPOSAL", "Blocked", null);
    const hash = await namespace.verifyAutomationPlanHash(plan);
    if (!hash.valid) return internal.buildResult(false, "IDE190_PROPOSAL_PLAN_HASH_INVALID", "Blocked", { planId: planId, hash: hash });
    const grounding = state.groundings.get(plan.groundingId) || null;
    if (!grounding || grounding.groundingStatus !== "Grounded" || grounding.planEligible !== true) return internal.buildResult(false, "IDE190_PROPOSAL_GROUNDING_INVALID", "Blocked", { groundingId: plan.groundingId });

    const proposal = {
      proposalId: internal.nextId("IDE-190-PROPOSAL"),
      planId: plan.planId,
      planHash: plan.planHash,
      groundingId: plan.groundingId,
      proposalStatus: "Proposed",
      summary: internal.text(settings.summary, plan.objective),
      expectedEffects: Array.isArray(settings.expectedEffects) ? internal.clone(settings.expectedEffects) : [],
      executionPermissionGranted: false,
      mutationApprovalGranted: false,
      approvalRequested: false,
      autoApply: false,
      dispatchEligible: false,
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("automationProposal", proposal);
    if (!contract.valid) return internal.buildResult(false, "IDE190_PROPOSAL_CONTRACT_INVALID", "Blocked", { proposal: proposal, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(proposal));
    state.proposals.set(frozen.proposalId, frozen);
    state.latestProposalId = frozen.proposalId;
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_PROPOSAL_READY", "Proposed", { proposal: internal.clone(frozen), validation: contract });
  }

  function getAutomationProposal(proposalId) { return internal.clone(state.proposals.get(internal.text(proposalId, "")) || null); }
  function getLatestAutomationProposal() { return state.latestProposalId ? getAutomationProposal(state.latestProposalId) : null; }
  function listAutomationProposals() { return Array.from(state.proposals.values()).map(function copy(item) { return internal.clone(item); }); }
  function initializeProposal() { namespace.modules.proposal.status = "Ready"; return internal.buildResult(true, "IDE190_PROPOSAL_INITIALIZED", "Ready", { proposalCount: state.proposals.size }); }

  Object.assign(namespace.api, { initializeProposal, createAutomationProposal, getAutomationProposal, getLatestAutomationProposal, listAutomationProposals });
  Object.assign(namespace, namespace.api);
  namespace.modules.proposal = { id: "IDE-190-PROPOSAL", version: MODULE_VERSION, status: "Loaded", phase: 3, executionPermissionGranted: false, mutationApprovalGranted: false, dispatchImplemented: false, readOnly: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
