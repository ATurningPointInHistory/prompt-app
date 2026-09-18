/* ============================================================
   FILE: 19_trust_evidence_phase2_traceability.js
   EXTERNAL-020 Decision 001 / Phase 2 Requirement Traceability
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P2=global.EXTERNAL020Phase2VersionManifest;if(!namespace||!namespace.__internal||!P2)return;
  const i=namespace.__internal;
  const completed=new Set(["REQ-020-001","REQ-020-002","REQ-020-003","REQ-020-004","REQ-020-005","REQ-020-006","REQ-020-007","REQ-020-009","REQ-020-010","REQ-020-011","REQ-020-012","REQ-020-013","REQ-020-014","REQ-020-016","REQ-020-017","REQ-020-018"]);
  const phase2Refs={
    "REQ-020-003":["19_trust_evidence_reliability_profile.js"],
    "REQ-020-004":["19_trust_evidence_reliability_profile.js"],
    "REQ-020-005":["19_trust_evidence_dimensions.js","19_trust_evidence_reliability_profile.js"],
    "REQ-020-007":["19_trust_evidence_independence.js","19_trust_evidence_reliability_profile.js"],
    "REQ-020-009":["19_trust_evidence_reliability_revision.js"]
  };
  function getExternal020Phase2RequirementTraceability(){
    const phase1=typeof namespace.getExternal020RequirementTraceability==="function"?namespace.getExternal020RequirementTraceability():[];
    return phase1.map(function(r){const id=r.requirementId;return {requirementId:id,title:r.title,verificationState:completed.has(id)?(phase2Refs[id]?"IMPLEMENTED_PHASE2":"IMPLEMENTED_PREVIOUS_PHASE"):"DEFERRED_LATER_PHASE",implementationRefs:i.unique((r.implementationRefs||[]).concat(phase2Refs[id]||[])),validationRefs:i.unique((r.validationRefs||[]).concat(phase2Refs[id]?["19_trust_evidence_phase2_validation.js#"+id]:[]))};});
  }
  function getExternal020Decision001Coverage(){const rows=getExternal020Phase2RequirementTraceability();const fully=rows.filter(function(r){return /^IMPLEMENTED_/.test(r.verificationState);}).length;return {decisionId:P2.decisionId,phase:2,version:P2.version,totalDecisionRequirements:rows.length,decisionRequirementsFullyImplemented:fully,allDecisionRequirementsComplete:fully===rows.length,remainingRequirementIds:rows.filter(function(r){return !/^IMPLEMENTED_/.test(r.verificationState);}).map(function(r){return r.requirementId;}),expectedRemaining:["REQ-020-008","REQ-020-015"],falseFullDecisionCompletionClaimed:false,rows:rows};}
  Object.assign(namespace.api,{getExternal020Phase2RequirementTraceability,getExternal020Decision001Coverage});Object.assign(namespace,namespace.api);
  namespace.modules.phase2Traceability={id:"EXTERNAL-020-PHASE2-TRACEABILITY",version:P2.version,status:"Ready",decisionCoverageAloneIsConformance:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
