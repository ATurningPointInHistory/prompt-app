/* ============================================================
   FILE: 18_self_development_phase6_dashboard.js
   Decision 058 Phase 6 / External AI Governance Dashboard State
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P6 = global.SELFDEVELOPMENT058Phase6VersionManifest;
  if (!namespace || !namespace.__internal || !P6) return;
  const i = namespace.__internal;
  function getSelfDevelopmentPhase6Dashboard() {
    const readiness = typeof namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness === "function" ? namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness() : null;
    const coverage = typeof namespace.getSelfDevelopmentPhase6Coverage === "function" ? namespace.getSelfDevelopmentPhase6Coverage() : null;
    const policy = typeof namespace.getSelfDevelopmentPhase6ExternalAiContextPolicy === "function" ? namespace.getSelfDevelopmentPhase6ExternalAiContextPolicy() : null;
    const audit = typeof namespace.getSelfDevelopmentPhase6ExternalAiAuditStatus === "function" ? namespace.getSelfDevelopmentPhase6ExternalAiAuditStatus() : null;
    return {
      id: "SELF-DEVELOPMENT-058",
      version: P6.version,
      phase: 6,
      status: "Candidate / Governed External AI Reasoning",
      readiness: readiness,
      contextPolicy: policy,
      coverage: coverage,
      audit: audit,
      externalTransmissionAutomatic: false,
      projectOwnerExternalTransmissionApprovalRequired: true,
      providerOutputProposalCandidateOnly: true,
      directRepositoryMutationAvailable: false,
      automaticCandidateApprovalAvailable: false,
      automaticAdoptionAvailable: false,
      automaticBudgetExpansionAvailable: false,
      finalFreezeAvailableAutomatically: false,
      updatedAt: Date.now()
    };
  }
  Object.assign(namespace.api, { getSelfDevelopmentPhase6Dashboard }); Object.assign(namespace, namespace.api);
  namespace.modules.phase6Dashboard = { id: "SELF-DEVELOPMENT-058-PHASE6-DASHBOARD", version: P6.version, status: "Ready", readOnlyGovernanceState: true, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
