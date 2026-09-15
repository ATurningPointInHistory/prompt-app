/* ============================================================
   FILE: 18_self_development_phase2_traceability.js
   Decision 058 Phase 2 / Additive Requirement Traceability
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;
  const i = namespace.__internal;
  const states = {
    "REQ-058-001":"IMPLEMENTED_PHASE1", "REQ-058-002":"IMPLEMENTED_PHASE2", "REQ-058-003":"IMPLEMENTED_PHASE2", "REQ-058-004":"IMPLEMENTED_PHASE2", "REQ-058-005":"IMPLEMENTED_PHASE1", "REQ-058-006":"IMPLEMENTED_PHASE1",
    "REQ-058-007":"DEFERRED_LATER_PHASE", "REQ-058-008":"DEFERRED_LATER_PHASE", "REQ-058-009":"IMPLEMENTED_PHASE2", "REQ-058-010":"IMPLEMENTED_PHASE2", "REQ-058-011":"IMPLEMENTED_PHASE2_CONTRACT_ONLY", "REQ-058-012":"IMPLEMENTED_PHASE1", "REQ-058-013":"IMPLEMENTED_PHASE2_READINESS_ONLY", "REQ-058-014":"DEFERRED_LATER_PHASE", "REQ-058-015":"FOUNDATION_ONLY", "REQ-058-016":"DEFERRED_LATER_PHASE", "REQ-058-017":"IMPLEMENTED_PHASE2_ANALYSIS_SCOPE", "REQ-058-018":"IMPLEMENTED_PHASE1"
  };
  const refs = {
    "REQ-058-002":["18_self_development_phase2_repository_inspection.js"],
    "REQ-058-003":["18_self_development_phase2_candidate_detection.js"],
    "REQ-058-004":["18_self_development_phase2_evidence_integrity.js","18_self_development_phase2_candidate_detection.js"],
    "REQ-058-009":["18_self_development_phase2_candidate_detection.js"],
    "REQ-058-010":["18_self_development_phase2_validation_contract.js","18_self_development_phase2_validation.js"],
    "REQ-058-011":["18_self_development_phase2_validation_contract.js"],
    "REQ-058-013":["18_self_development_phase2_external_ai_readiness.js"],
    "REQ-058-017":["18_self_development_phase2_repository_inspection.js","18_self_development_phase2_persistence.js","18_self_development_phase2_evidence_integrity.js"]
  };
  function getSelfDevelopmentPhase2RequirementTraceability() {
    const base = typeof namespace.getSelfDevelopmentRequirementTraceability === "function" ? namespace.getSelfDevelopmentRequirementTraceability() : [];
    return base.map(function (row) { const r = i.clone(row); r.phase2VerificationState = states[r.requirementId] || r.verificationState || "UNKNOWN"; r.phase2ImplementationRefs = i.clone(refs[r.requirementId] || []); r.phase2ValidationRefs = ["18_self_development_phase2_validation.js#" + r.requirementId]; return r; });
  }
  function getSelfDevelopmentPhase2Coverage() {
    const rows = getSelfDevelopmentPhase2RequirementTraceability();
    const fully = rows.filter(function (r) { return r.phase2VerificationState === "IMPLEMENTED_PHASE1" || r.phase2VerificationState === "IMPLEMENTED_PHASE2"; }).length;
    return { decisionId: "EXTERNAL-010-DECISION-058", phase2Version: P2.version, totalDecisionRequirements: rows.length, fullyImplementedDecisionRequirements: fully, allDecisionRequirementsComplete: false, phase2ScopeTotal: P2.scope.length, phase2ScopeImplemented: P2.scope.length, phase2ScopeComplete: true, falseFullDecisionCompletionClaimed: false, partialStatesPreserved: true, rows: rows, scope: i.clone(P2.scope) };
  }
  Object.assign(namespace.api, { getSelfDevelopmentPhase2RequirementTraceability, getSelfDevelopmentPhase2Coverage }); Object.assign(namespace, namespace.api);
  namespace.modules.phase2Traceability = { id: "SELF-DEVELOPMENT-058-PHASE2-TRACEABILITY", version: P2.version, status: "Ready", falseFullDecisionCompletionClaimed: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
