/* ============================================================
   FILE: 18_self_development_phase3_version_manifest.js
   EXTERNAL-010 Decision 058 / Self-Development Environment
   Candidate Release: 0.3.0
   Phase 3: Human Candidate Approval Boundary / Governed Patch Candidate Preparation
   Phase 1 v0.1.0 and Phase 2 v0.2.1 remain Accepted / Frozen.
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
    version: "0.3.0",
    status: "IMPLEMENTATION_PHASE3_CANDIDATE",
    phase: 3,
    phaseName: "Human Candidate Approval Boundary / Governed Patch Candidate Preparation",
    parentPhases: [
      { phase: 1, version: "0.1.0", status: "PROJECT_OWNER_ACCEPTED_FROZEN", sourceRewriteAllowed: false },
      { phase: 2, version: "0.2.1", status: "PROJECT_OWNER_ACCEPTED_FROZEN", sourceRewriteAllowed: false }
    ],
    scope: [
      { scopeId: "P3-058-001", title: "Candidate Approval Handoff Contract", requirements: ["REQ-058-007"] },
      { scopeId: "P3-058-002", title: "IDE-190 Approval Bridge", requirements: ["REQ-058-007"] },
      { scopeId: "P3-058-003", title: "Safe Non-Protected Function-Patch Fixture", requirements: ["REQ-058-008", "REQ-058-009"] },
      { scopeId: "P3-058-004", title: "IDE-150 Governed Patch Candidate Adapter", requirements: ["REQ-058-008"] },
      { scopeId: "P3-058-005", title: "Approval != Adoption Boundary", requirements: ["REQ-058-007", "REQ-058-014", "REQ-058-015"] },
      { scopeId: "P3-058-006", title: "Independent Patch Validation Evidence", requirements: ["REQ-058-010", "REQ-058-011", "REQ-058-017"] },
      { scopeId: "P3-058-007", title: "PC / Android Approval-Boundary Runtime Validation", requirements: ["REQ-058-007", "REQ-058-008", "REQ-058-010", "REQ-058-011", "REQ-058-017"] },
      { scopeId: "P3-058-008", title: "Future Approval Relaxation Policy Map", requirements: ["REQ-058-007", "REQ-058-012", "REQ-058-018"] }
    ],
    hardBoundaries: {
      selfApprovalAllowed: false,
      approvalBypassAllowed: false,
      candidateApprovalEqualsAdoptionAuthorization: false,
      patchGenerationEqualsMutationAuthority: false,
      validationEqualsApproval: false,
      canonicalRepositoryMutationAllowed: false,
      repository010AcceptanceTokenIssuedInPhase3: false,
      persistentReflectionAllowedInPhase3: false,
      protectedControlPlanePatchGenerationAllowed: false,
      providerNetworkCallRequired: false,
      secondApprovalEngineAllowed: false,
      secondMutationEngineAllowed: false
    },
    deferred: [
      "REQ-058-014 Project Owner Adoption Decision",
      "REQ-058-015 REPOSITORY-010 Controlled Reflection Reuse",
      "REQ-058-016 Rollback / Recovery",
      "Canonical repository write",
      "Persistent reflection",
      "Adoption acceptance-token issuance"
    ]
  });
  global.SELFDEVELOPMENT058Phase3VersionManifest = manifest;
})(typeof window !== "undefined" ? window : globalThis);
