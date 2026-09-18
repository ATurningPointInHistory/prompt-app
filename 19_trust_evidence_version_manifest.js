/* ============================================================
   FILE: 19_trust_evidence_version_manifest.js
   EXTERNAL-020 Trust / Evidence Intelligence
   Decision 001 / Candidate Release: 0.1.1
   Phase 1: Context-Specific Reliability Foundation
   ============================================================ */
(function (global) {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  const requirements = [
    ["REQ-020-001", "Canonical Baseline Identity", "PHASE1"],
    ["REQ-020-002", "EXTERNAL-010 Reliability Input Reuse", "PHASE1"],
    ["REQ-020-003", "Source / Evidence / Claim Reliability Separation", "PHASE1_FOUNDATION"],
    ["REQ-020-004", "Context-Specific Reliability", "PHASE1_FOUNDATION"],
    ["REQ-020-005", "Multi-Dimensional Reliability Model", "FOUNDATION"],
    ["REQ-020-006", "Contradiction Preservation", "PHASE1"],
    ["REQ-020-007", "Independent Confirmation Assessment", "PHASE1_FOUNDATION"],
    ["REQ-020-008", "Historical Outcome-Grounded Evaluation", "LATER_PHASE"],
    ["REQ-020-009", "Versioned Reliability Revision", "FOUNDATION"],
    ["REQ-020-010", "Explicit Uncertainty / Abstention", "PHASE1"],
    ["REQ-020-011", "False Precision Prevention", "PHASE1"],
    ["REQ-020-012", "IDE-170 Confidence Separation", "PHASE1"],
    ["REQ-020-013", "Evidence Authority / Action Authority Separation", "PHASE1"],
    ["REQ-020-014", "Reliability Explanation / Lineage", "PHASE1"],
    ["REQ-020-015", "External AI Governance Reuse", "FOUNDATION"],
    ["REQ-020-016", "No Raw Evidence Mutation", "PHASE1"],
    ["REQ-020-017", "No Automatic Knowledge Promotion", "PHASE1"],
    ["REQ-020-018", "No Self-Granted / Execution Authority", "PHASE1"]
  ].map(function (item) { return { requirementId:item[0], title:item[1], phase1Disposition:item[2] }; });

  const manifest = deepFreeze({
    componentId: "EXTERNAL-020",
    decisionId: "EXTERNAL-020-DECISION-001",
    title: "Evidence-Grounded Multi-Dimensional Trust / Evidence Intelligence",
    version: "0.1.1",
    status: "IMPLEMENTATION_PHASE1_CANDIDATE",
    phase: 1,
    phaseName: "Context-Specific Reliability Foundation",
    parentCanonical: {
      revisionId: "REPOSITORY010-CANONICAL-REVISION-0023",
      applicationVersion: "1.20.1",
      scriptCount: 462,
      manifestHash: "0673af6e0cff8332cd9322d62b582eea312b549f9f3660f28222a87957c4160b",
      scriptSetHash: "d3121eb588b7c7b332cb86ef66f82fe2f2ecd77bd1be029143ff578f2d0514a3"
    },
    dependencies: ["EXTERNAL-010", "IDE-170", "IDE-180"],
    evaluationStates: ["UNKNOWN", "INSUFFICIENT_EVIDENCE", "CONFLICTED", "UNRESOLVED", "ASSESSABLE", "NOT_APPLICABLE"],
    subjectTypes: ["SOURCE", "EVIDENCE", "CLAIM", "PUBLISHER", "MODEL_CAPABILITY", "DOMAIN_TASK"],
    requirements: requirements,
    phase1ImplementationRequirements: [
      { scopeId:"P1-020-001", title:"EXTERNAL-020 Component / Version Foundation", implemented:true },
      { scopeId:"P1-020-002", title:"EXTERNAL-010 Reliability Input Adapter", implemented:true },
      { scopeId:"P1-020-003", title:"Evaluation Context Foundation", implemented:true },
      { scopeId:"P1-020-004", title:"Reliability Evaluation Candidate", implemented:true },
      { scopeId:"P1-020-005", title:"Explicit Uncertainty / Abstention", implemented:true },
      { scopeId:"P1-020-006", title:"Explanation / Lineage Foundation", implemented:true },
      { scopeId:"P1-020-007", title:"Requirement Traceability", implemented:true },
      { scopeId:"P1-020-008", title:"No Universal Trust Score / No Automatic Truth Resolution", implemented:true }
    ],
    safety: {
      universalTrustScoreImplemented: false,
      permanentGlobalSourceRankingImplemented: false,
      automaticConflictResolutionAllowed: false,
      truthConfirmationAllowed: false,
      rawEvidenceMutationAllowed: false,
      automaticKnowledgePromotionAllowed: false,
      canonicalRepositoryMutationAllowed: false,
      externalTransmissionAutomaticallyAllowed: false,
      paidApiExecutionAutomaticallyAllowed: false,
      tradingAuthorityGranted: false,
      financialAuthorityGranted: false,
      businessAuthorityGranted: false,
      selfGrantedAuthorityAllowed: false,
      reliabilityEqualsTruth: false,
      reliabilityEqualsActionAuthority: false,
      validationEqualsApproval: false,
      ide170ConfidenceOverwriteAllowed: false
    }
  });

  global.EXTERNAL020VersionManifest = manifest;
})(typeof window !== "undefined" ? window : globalThis);
