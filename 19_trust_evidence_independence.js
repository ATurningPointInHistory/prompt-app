/* ============================================================
   FILE: 19_trust_evidence_independence.js
   EXTERNAL-020 Phase 2 / Independent Confirmation Assessment
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P2=global.EXTERNAL020Phase2VersionManifest;if(!namespace||!namespace.__internal||!P2)return;
  const i=namespace.__internal,s=i.state;
  function intersects(a,b){const set=new Set(a||[]);return (b||[]).some(function(x){return set.has(x);});}
  function assessExternal020IndependentConfirmation(input){
    const x=i.isPlainObject(input)?input:{};const evaluationId=i.text(x.evaluationId,s.latestEvaluationId||"");const ev=evaluationId?s.evaluations.get(evaluationId):null;if(!ev)return i.buildResult(false,"EXTERNAL020_PHASE2_EVALUATION_REQUIRED","Blocked",null);
    const ctx=s.contexts.get(ev.contextId),pkg=s.inputPackages.get(ev.inputPackageId);if(!ctx||!pkg)return i.buildResult(false,"EXTERNAL020_PHASE2_INPUT_CONTEXT_REQUIRED","Blocked",null);
    const confirmations=(pkg.confirmationCandidates||[]).filter(function(c){const ids=Array.isArray(c&&c.evidenceIds)?c.evidenceIds:[];return (c&&c.subjectRef&&c.subjectRef===ctx.subjectRef)||intersects(ctx.evidenceRefs||[],ids);});
    const independent=confirmations.filter(function(c){return c&&c.independenceVerified===true;});
    const unknown=confirmations.filter(function(c){return !c||c.independenceVerified!==true;});
    const state=independent.length?"VERIFIED_INDEPENDENT":(confirmations.length?"UNKNOWN":"NOT_APPLICABLE");
    const assessment=i.deepFreeze({assessmentId:i.nextId("EXTERNAL020-INDEPENDENCE"),evaluationId:ev.evaluationId,subjectType:ev.subjectType,subjectRef:ev.subjectRef,state:state,confirmationCount:confirmations.length,verifiedIndependentCount:independent.length,verifiedDependentCount:0,unknownCount:unknown.length,confirmationRefs:confirmations.map(function(c){return c.candidateId;}).filter(Boolean),independentConfirmationRefs:independent.map(function(c){return c.candidateId;}).filter(Boolean),dependencyInferred:false,unknownTreatedAsIndependent:false,duplicateEqualsIndependentConfirmation:false,createdAt:i.nowIso(),immutable:true});
    return i.buildResult(true,"EXTERNAL020_PHASE2_INDEPENDENCE_ASSESSED","Ready",{assessment:assessment});
  }
  Object.assign(namespace.api,{assessExternal020IndependentConfirmation});Object.assign(namespace,namespace.api);
  namespace.modules.phase2Independence={id:"EXTERNAL-020-PHASE2-INDEPENDENCE",version:P2.version,status:"Ready",unknownTreatedAsIndependent:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
