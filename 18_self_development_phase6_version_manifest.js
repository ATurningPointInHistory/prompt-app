/* ============================================================
   FILE: 18_self_development_phase6_version_manifest.js
   EXTERNAL-010 Decision 058 / Self-Development Environment
   Candidate Release: 0.6.0
   Phase 6: Governed External AI Reasoning / REQ-058-013 Closure
   ============================================================ */
(function (global) {
  "use strict";
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }
  const manifest = deepFreeze({
    componentId: "SELF-DEVELOPMENT-058",
    decisionId: "EXTERNAL-010-DECISION-058",
    version: "0.6.0",
    status: "IMPLEMENTATION_PHASE6_EXTERNAL_AI_GOVERNANCE_CANDIDATE",
    phase: 6,
    phaseName: "Governed External AI Reasoning / REQ-058-013 Closure",
    parentPhases: [
      { phase: 1, version: "0.1.0", status: "PROJECT_OWNER_ACCEPTED_FROZEN", sourceRewriteAllowed: false },
      { phase: 2, version: "0.2.1", status: "PROJECT_OWNER_ACCEPTED_FROZEN", sourceRewriteAllowed: false },
      { phase: 3, version: "0.3.0", status: "PROJECT_OWNER_ACCEPTED_FROZEN", sourceRewriteAllowed: false },
      { phase: 4, version: "0.4.0", status: "PROJECT_OWNER_ACCEPTED_FROZEN", sourceRewriteAllowed: false },
      { phase: 5, version: "0.5.7", status: "TECHNICAL_AND_LIVE_GATE_COMPLETE_PROJECT_OWNER_FREEZE_PENDING", sourceRewriteAllowed: false }
    ],
    dependencies: {
      externalComponent: "EXTERNAL-010",
      openAiIntegrationVersion: "0.3.11",
      sourceId: "SOURCE-OPENAI",
      operationId: "INTERNAL_ANALYSIS",
      decisions: ["EXTERNAL-010-DECISION-055", "EXTERNAL-010-DECISION-056", "EXTERNAL-010-DECISION-057"]
    },
    scope: [
      { scopeId: "P6-058-001", title: "External AI Readiness Gate", requirements: ["REQ-058-013"] },
      { scopeId: "P6-058-002", title: "Purpose-Bound Context Minimization", requirements: ["REQ-058-004", "REQ-058-013", "REQ-058-017"] },
      { scopeId: "P6-058-003", title: "Secret / Credential Exclusion", requirements: ["REQ-058-012", "REQ-058-013", "REQ-058-018"] },
      { scopeId: "P6-058-004", title: "Existing OpenAI Provider / Budget / Usage Policy Reuse", requirements: ["REQ-058-006", "REQ-058-013"] },
      { scopeId: "P6-058-005", title: "Explicit External Transmission Authority", requirements: ["REQ-058-007", "REQ-058-013", "REQ-058-018"] },
      { scopeId: "P6-058-006", title: "Provider Output Is Proposal Candidate Only", requirements: ["REQ-058-005", "REQ-058-013", "REQ-058-018"] },
      { scopeId: "P6-058-007", title: "No Direct Mutation / No Auto Approval / No Auto Adoption", requirements: ["REQ-058-012", "REQ-058-014", "REQ-058-015", "REQ-058-018"] },
      { scopeId: "P6-058-008", title: "External AI Audit / Evidence / Lineage", requirements: ["REQ-058-013", "REQ-058-017"] }
    ],
    hardBoundaries: {
      validationMayExecuteProviderNetworkCall: false,
      repositoryWideAutomaticExternalTransmissionAllowed: false,
      secretValueTransmissionAllowed: false,
      externalTransmissionRequiresExplicitProjectOwnerAction: true,
      automaticBudgetExpansionAllowed: false,
      automaticRechargeAllowed: false,
      automaticCredentialFailoverAllowed: false,
      providerOutputEqualsApproval: false,
      providerOutputEqualsAdoptionAuthorization: false,
      providerOutputGrantsMutationAuthority: false,
      providerMayDirectlyMutateRepository: false,
      providerMayPromoteKnowledgeAutomatically: false,
      providerToolsEnabledByPhase6: false,
      secondExternalAiExecutionEngineAllowed: false,
      secondMutationEngineAllowed: false,
      secondAdoptionEngineAllowed: false
    },
    finalization: {
      decision058TechnicalCompletionMayReach18Of18: true,
      projectOwnerAcceptanceStillRequired: true,
      automaticFinalFreezeAllowed: false,
      phase5AcceptedFrozenMayNotBeFabricated: true
    }
  });
  global.SELFDEVELOPMENT058Phase6VersionManifest = manifest;
})(typeof window !== "undefined" ? window : globalThis);
