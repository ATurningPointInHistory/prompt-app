/* ============================================================
   FILE: 18_self_development_version_manifest.js
   EXTERNAL-010 Decision 058 / Self-Development Environment
   Candidate Release: 0.1.0
   Phase 1: Orchestration Foundation / No Canonical Mutation
   ============================================================ */
(function (global) {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  const requirements = [
    ["REQ-058-001", "Canonical Baseline Identity Gate", "PHASE1"],
    ["REQ-058-002", "Repository Inspection", "FOUNDATION"],
    ["REQ-058-003", "Improvement Candidate Detection", "FOUNDATION"],
    ["REQ-058-004", "Evidence Grounding", "FOUNDATION"],
    ["REQ-058-005", "Structured Change Proposal", "PHASE1"],
    ["REQ-058-006", "Impact / Risk / Cost Explanation", "PHASE1"],
    ["REQ-058-007", "Project Owner Candidate Approval", "LATER_PHASE"],
    ["REQ-058-008", "DIFF / Patch Candidate Generation", "LATER_PHASE"],
    ["REQ-058-009", "Smallest Safe Mutation First", "FOUNDATION"],
    ["REQ-058-010", "Validation Pipeline", "FOUNDATION"],
    ["REQ-058-011", "Independent Validation", "FOUNDATION"],
    ["REQ-058-012", "Protected Control Plane", "PHASE1"],
    ["REQ-058-013", "External AI Governance", "FOUNDATION"],
    ["REQ-058-014", "Project Owner Adoption Decision", "LATER_PHASE"],
    ["REQ-058-015", "REPOSITORY-010 Controlled Reflection Reuse", "FOUNDATION"],
    ["REQ-058-016", "Rollback / Recovery", "LATER_PHASE"],
    ["REQ-058-017", "Audit / Evidence / Lineage", "FOUNDATION"],
    ["REQ-058-018", "No Self-Granted Authority", "PHASE1"]
  ].map(function (item) { return { requirementId: item[0], title: item[1], phase1Disposition: item[2] }; });

  const manifest = deepFreeze({
    componentId: "SELF-DEVELOPMENT-058",
    decisionId: "EXTERNAL-010-DECISION-058",
    title: "Evidence-Grounded Governed Self-Development Environment",
    version: "0.1.0",
    status: "IMPLEMENTATION_PHASE1_CANDIDATE",
    phase: 1,
    phaseName: "Orchestration Foundation / No Canonical Mutation",
    parentBaseline: {
      componentId: "EXTERNAL-010",
      version: "1.20.1",
      openAiIntegrationVersion: "0.3.11"
    },
    architecture: {
      selectedOption: "C",
      orchestratesExistingComponents: true,
      duplicateMutationEngineAllowed: false,
      duplicateRepositoryEngineAllowed: false,
      duplicateWorkflowEngineAllowed: false,
      implementationConvenienceEqualsRequirementReduction: false
    },
    dependencies: ["IDE-140", "IDE-170", "IDE-190", "REPOSITORY-010", "EXTERNAL-010"],
    requirements: requirements,
    phase1ImplementationRequirements: [
      { scopeId: "P1-058-001", title: "Self-Development Candidate Contract", implemented: true },
      { scopeId: "P1-058-002", title: "Canonical Baseline Identity Gate", implemented: true },
      { scopeId: "P1-058-003", title: "Existing Analyzer / Intelligence Read-Only Adapter", implemented: true },
      { scopeId: "P1-058-004", title: "Improvement Candidate Registry Foundation", implemented: true },
      { scopeId: "P1-058-005", title: "Structured Proposal Model", implemented: true },
      { scopeId: "P1-058-006", title: "Impact / Risk / Cost Model", implemented: true },
      { scopeId: "P1-058-007", title: "Decision 058 Requirement Traceability", implemented: true },
      { scopeId: "P1-058-008", title: "Read-Only Development Dashboard Surface", implemented: true },
      { scopeId: "P1-058-009", title: "No Canonical Repository Mutation", implemented: true }
    ],
    safety: {
      directCanonicalRepositoryMutationAllowed: false,
      automaticCandidateApprovalAllowed: false,
      automaticAdoptionApprovalAllowed: false,
      automaticAuthorityExpansionAllowed: false,
      automaticBudgetExpansionAllowed: false,
      arbitrarySoftwareInstallationAllowed: false,
      automaticKnowledgePromotionAllowed: false,
      tradingAuthorityGranted: false,
      financialAuthorityGranted: false,
      selfGrantedAuthorityAllowed: false,
      repositoryWideAutomaticExternalTransmissionAllowed: false,
      validationEqualsApproval: false,
      candidateApprovalEqualsAdoptionAuthorization: false
    },
    phase1Scope: {
      candidateContract: true,
      baselineIdentityGate: true,
      analyzerIntelligenceAdapter: true,
      improvementCandidateRegistry: true,
      proposalModel: true,
      impactRiskCostModel: true,
      requirementTraceability: true,
      readOnlyDashboard: true,
      canonicalMutation: false,
      persistentCommit: false
    }
  });

  global.SELFDEVELOPMENT058VersionManifest = manifest;
})(typeof window !== "undefined" ? window : globalThis);
