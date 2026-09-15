/* ============================================================
   FILE: 18_self_development_phase2_version_manifest.js
   EXTERNAL-010 Decision 058 / Self-Development Environment
   Candidate Release: 0.2.0
   Phase 2: Evidence-Grounded Inspection / Detection / Validation Readiness
   Phase 1 v0.1.0 remains Accepted / Frozen and is not rewritten here.
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
    version: "0.2.0",
    status: "IMPLEMENTATION_PHASE2_CANDIDATE",
    phase: 2,
    phaseName: "Evidence-Grounded Inspection / Detection / Validation Readiness",
    parentPhase1: {
      version: "0.1.0",
      status: "PROJECT_OWNER_ACCEPTED_FROZEN",
      sourceRewriteAllowed: false
    },
    scope: [
      { scopeId: "P2-058-001", title: "Read-Only Repository / Source Inspection Contract", requirements: ["REQ-058-002", "REQ-058-017"] },
      { scopeId: "P2-058-002", title: "Evidence Reference Integrity + Baseline Binding", requirements: ["REQ-058-004", "REQ-058-017"] },
      { scopeId: "P2-058-003", title: "Deterministic Improvement Candidate Detection", requirements: ["REQ-058-003", "REQ-058-004"] },
      { scopeId: "P2-058-004", title: "Smallest Safe Change Scope Classification", requirements: ["REQ-058-009"] },
      { scopeId: "P2-058-005", title: "Phase 2 Validation Pipeline + Independent Validator Separation Contract", requirements: ["REQ-058-010", "REQ-058-011"] },
      { scopeId: "P2-058-006", title: "External AI Governance Readiness Adapter (No Provider Call)", requirements: ["REQ-058-013"] },
      { scopeId: "P2-058-007", title: "Bounded Local Audit / Evidence / Lineage Persistence", requirements: ["REQ-058-017"] },
      { scopeId: "P2-058-008", title: "PC / Android Read-Only Runtime Validation", requirements: ["REQ-058-002", "REQ-058-003", "REQ-058-004", "REQ-058-010", "REQ-058-011", "REQ-058-013", "REQ-058-017"] }
    ],
    hardBoundaries: {
      canonicalRepositoryMutation: false,
      diffGeneration: false,
      candidateApproval: false,
      adoptionAuthorization: false,
      providerNetworkCall: false,
      budgetExpansion: false,
      authorityExpansion: false,
      knowledgeAutoPromotion: false,
      softwareInstallation: false,
      secondMutationEngine: false,
      validationEqualsApproval: false
    },
    persistence: {
      adapter: "localStorage",
      key: "AI_PROMPT_OS_SELF_DEVELOPMENT_058_PHASE2_V1",
      schemaVersion: 1,
      bounded: true,
      maxEvidence: 64,
      maxLineage: 128,
      sourceCodePersistenceAllowed: false,
      secretPersistenceAllowed: false,
      canonicalKnowledgePromotionAllowed: false
    }
  });
  global.SELFDEVELOPMENT058Phase2VersionManifest = manifest;
})(typeof window !== "undefined" ? window : globalThis);
