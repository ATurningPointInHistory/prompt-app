/* ============================================================
   FILE: 19_trust_evidence_traceability.js
   EXTERNAL-020 Decision 001 / Phase 1 Requirement Traceability
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence, VERSION_MANIFEST=global.EXTERNAL020VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST) return;
  const i=namespace.__internal;
  const stateById={
    "REQ-020-001":"IMPLEMENTED_PHASE1","REQ-020-002":"IMPLEMENTED_PHASE1","REQ-020-003":"IMPLEMENTED_PHASE1_FOUNDATION","REQ-020-004":"IMPLEMENTED_PHASE1_FOUNDATION",
    "REQ-020-005":"FOUNDATION_ONLY","REQ-020-006":"IMPLEMENTED_PHASE1","REQ-020-007":"IMPLEMENTED_PHASE1_FOUNDATION","REQ-020-008":"DEFERRED_LATER_PHASE",
    "REQ-020-009":"FOUNDATION_ONLY","REQ-020-010":"IMPLEMENTED_PHASE1","REQ-020-011":"IMPLEMENTED_PHASE1","REQ-020-012":"IMPLEMENTED_PHASE1",
    "REQ-020-013":"IMPLEMENTED_PHASE1","REQ-020-014":"IMPLEMENTED_PHASE1","REQ-020-015":"FOUNDATION_ONLY","REQ-020-016":"IMPLEMENTED_PHASE1",
    "REQ-020-017":"IMPLEMENTED_PHASE1","REQ-020-018":"IMPLEMENTED_PHASE1"
  };
  const refs={
    "REQ-020-001":["19_trust_evidence_version_manifest.js"],"REQ-020-002":["19_trust_evidence_external010_adapter.js"],"REQ-020-003":["19_trust_evidence_evaluation_context.js"],
    "REQ-020-004":["19_trust_evidence_evaluation_context.js","19_trust_evidence_evaluation_candidate.js"],"REQ-020-005":["19_trust_evidence_evaluation_candidate.js"],
    "REQ-020-006":["19_trust_evidence_evaluation_candidate.js"],"REQ-020-007":["19_trust_evidence_evaluation_candidate.js"],"REQ-020-010":["19_trust_evidence_evaluation_candidate.js"],
    "REQ-020-011":["19_trust_evidence_evaluation_candidate.js"],"REQ-020-012":["19_trust_evidence_version_manifest.js","19_trust_evidence_evaluation_candidate.js"],
    "REQ-020-013":["19_trust_evidence_evaluation_candidate.js"],"REQ-020-014":["19_trust_evidence_lineage.js"],"REQ-020-016":["19_trust_evidence_external010_adapter.js"],
    "REQ-020-017":["19_trust_evidence_evaluation_candidate.js"],"REQ-020-018":["19_trust_evidence_version_manifest.js","19_trust_evidence_evaluation_candidate.js"]
  };
  function getExternal020RequirementTraceability(){ return VERSION_MANIFEST.requirements.map(function(r){return {requirementId:r.requirementId,title:r.title,phase1Disposition:r.phase1Disposition,verificationState:stateById[r.requirementId]||"UNKNOWN",implementationRefs:i.clone(refs[r.requirementId]||[]),validationRefs:["19_trust_evidence_phase1_validation.js#"+r.requirementId]};}); }
  function getExternal020Phase1Coverage(){ const rows=getExternal020RequirementTraceability(), scope=VERSION_MANIFEST.phase1ImplementationRequirements.map(i.clone), implemented=scope.filter(function(x){return x.implemented===true;}).length; return {decisionId:VERSION_MANIFEST.decisionId,totalDecisionRequirements:rows.length,decisionRequirementsFullyImplemented:rows.filter(function(r){return r.verificationState==="IMPLEMENTED_PHASE1";}).length,allDecisionRequirementsComplete:rows.every(function(r){return r.verificationState==="IMPLEMENTED_PHASE1";}),phase1ScopeTotal:scope.length,phase1ScopeImplemented:implemented,phase1ScopeComplete:scope.length>0&&implemented===scope.length,falseFullDecisionCompletionClaimed:false,rows:rows,phase1Scope:scope}; }
  Object.assign(namespace.api,{getExternal020RequirementTraceability,getExternal020Phase1Coverage}); Object.assign(namespace,namespace.api);
  namespace.modules.traceability={id:"EXTERNAL-020-TRACEABILITY",version:VERSION_MANIFEST.version,status:"Ready",decisionCoverageAloneIsConformance:false,loadedAt:i.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
