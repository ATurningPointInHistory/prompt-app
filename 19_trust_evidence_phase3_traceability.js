/* ============================================================
   FILE: 19_trust_evidence_phase3_traceability.js
   EXTERNAL-020 Decision 001 / Phase 3 Requirement Traceability
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P3=global.EXTERNAL020Phase3VersionManifest;if(!namespace||!namespace.__internal||!P3)return;
  const i=namespace.__internal;
  const completed=new Set(["REQ-020-001","REQ-020-002","REQ-020-003","REQ-020-004","REQ-020-005","REQ-020-006","REQ-020-007","REQ-020-008","REQ-020-009","REQ-020-010","REQ-020-011","REQ-020-012","REQ-020-013","REQ-020-014","REQ-020-016","REQ-020-017","REQ-020-018"]);
  const phase3Refs={"REQ-020-008":["19_trust_evidence_historical_outcome_adapter.js","19_trust_evidence_historical_outcome_assessment.js"]};
  function getExternal020Phase3RequirementTraceability(){
    const prior=typeof namespace.getExternal020Phase2RequirementTraceability==="function"?namespace.getExternal020Phase2RequirementTraceability():(typeof namespace.getExternal020RequirementTraceability==="function"?namespace.getExternal020RequirementTraceability():[]);
    return prior.map(function(r){const id=r.requirementId;return {requirementId:id,title:r.title,verificationState:completed.has(id)?(phase3Refs[id]?"IMPLEMENTED_PHASE3":(r.verificationState||"IMPLEMENTED_PREVIOUS_PHASE")):"DEFERRED_LATER_PHASE",implementationRefs:i.unique((r.implementationRefs||[]).concat(phase3Refs[id]||[])),validationRefs:i.unique((r.validationRefs||[]).concat(phase3Refs[id]?["19_trust_evidence_phase3_validation.js#"+id]:[]))};});
  }
  function getExternal020Phase3Decision001Coverage(){const rows=getExternal020Phase3RequirementTraceability();const fully=rows.filter(function(r){return /^IMPLEMENTED_/.test(r.verificationState);}).length;return {decisionId:P3.decisionId,phase:3,version:P3.version,totalDecisionRequirements:rows.length,decisionRequirementsFullyImplemented:fully,allDecisionRequirementsComplete:fully===rows.length,remainingRequirementIds:rows.filter(function(r){return !/^IMPLEMENTED_/.test(r.verificationState);}).map(function(r){return r.requirementId;}),expectedRemaining:["REQ-020-015"],falseFullDecisionCompletionClaimed:false,rows:rows};}
  Object.assign(namespace.api,{getExternal020Phase3RequirementTraceability,getExternal020Phase3Decision001Coverage});Object.assign(namespace,namespace.api);
  namespace.modules.phase3Traceability={id:"EXTERNAL-020-PHASE3-TRACEABILITY",version:P3.version,status:"Ready",decisionCoverageAloneIsConformance:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
