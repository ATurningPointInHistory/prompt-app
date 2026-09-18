/* ============================================================
   FILE: 19_trust_evidence_phase4_traceability.js
   EXTERNAL-020 Decision 001 / Phase 4 Requirement Traceability
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P4=global.EXTERNAL020Phase4VersionManifest;if(!namespace||!namespace.__internal||!P4)return;const i=namespace.__internal;
  const phase4Refs={"REQ-020-015":["19_trust_evidence_external_ai_context_policy.js","19_trust_evidence_external_ai_governance_adapter.js","19_trust_evidence_external_ai_reasoning.js"]};
  function getExternal020Phase4RequirementTraceability(){const prior=typeof namespace.getExternal020Phase3RequirementTraceability==="function"?namespace.getExternal020Phase3RequirementTraceability():[];return prior.map(function(r){const id=r.requirementId;return {requirementId:id,title:r.title,verificationState:id==="REQ-020-015"?"IMPLEMENTED_PHASE4":r.verificationState,implementationRefs:i.unique((r.implementationRefs||[]).concat(phase4Refs[id]||[])),validationRefs:i.unique((r.validationRefs||[]).concat(phase4Refs[id]?["19_trust_evidence_phase4_validation.js#"+id]:[]))};});}
  function getExternal020Phase4Decision001Coverage(){const rows=getExternal020Phase4RequirementTraceability(),fully=rows.filter(function(r){return /^IMPLEMENTED_/.test(r.verificationState);}).length;return {decisionId:P4.decisionId,phase:4,version:P4.version,totalDecisionRequirements:rows.length,decisionRequirementsFullyImplemented:fully,allDecisionRequirementsComplete:fully===rows.length,remainingRequirementIds:rows.filter(function(r){return !/^IMPLEMENTED_/.test(r.verificationState);}).map(function(r){return r.requirementId;}),falseFullDecisionCompletionClaimed:false,rows:rows};}
  Object.assign(namespace.api,{getExternal020Phase4RequirementTraceability,getExternal020Phase4Decision001Coverage});Object.assign(namespace,namespace.api);namespace.modules.phase4Traceability={id:"EXTERNAL-020-PHASE4-TRACEABILITY",version:P4.version,status:"Ready",loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
