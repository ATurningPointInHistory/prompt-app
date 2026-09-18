/* ============================================================
   FILE: 19_trust_evidence_reliability_revision.js
   EXTERNAL-020 Phase 2 / Append-Only Reliability Revision
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P2=global.EXTERNAL020Phase2VersionManifest;if(!namespace||!namespace.__internal||!P2)return;
  const i=namespace.__internal,s=i.state;
  function sameIdentity(a,b){return ["subjectType","subjectRef","domain","task","purpose","timeHorizon"].every(function(k){return i.text(a[k],"UNKNOWN").toUpperCase()===i.text(b[k],"UNKNOWN").toUpperCase();});}
  function diff(a,b){const A=new Set(a||[]),B=new Set(b||[]);return {added:[...B].filter(function(x){return !A.has(x);}),removed:[...A].filter(function(x){return !B.has(x);})};}
  function reviseExternal020ReliabilityProfile(input){
    const x=i.isPlainObject(input)?input:{};const profileId=i.text(x.profileId,"");const reason=i.text(x.revisionReason,"");if(!profileId||!reason)return i.buildResult(false,"EXTERNAL020_PROFILE_REVISION_INPUT_REQUIRED","Blocked",{profileId:profileId,revisionReasonRequired:true});
    const prev=s.reliabilityProfiles&&s.reliabilityProfiles.get(profileId);if(!prev)return i.buildResult(false,"EXTERNAL020_PROFILE_NOT_FOUND","Blocked",{profileId:profileId});
    const evaluationId=i.text(x.evaluationId,s.latestEvaluationId||"");const ev=evaluationId?s.evaluations.get(evaluationId):null;if(!ev)return i.buildResult(false,"EXTERNAL020_PHASE2_EVALUATION_REQUIRED","Blocked",null);
    if(!sameIdentity(prev,ev))return i.buildResult(false,"EXTERNAL020_PROFILE_CONTEXT_IDENTITY_MISMATCH","Blocked",{profileId:profileId,previous:{subjectType:prev.subjectType,subjectRef:prev.subjectRef,domain:prev.domain,task:prev.task,purpose:prev.purpose,timeHorizon:prev.timeHorizon},candidate:{subjectType:ev.subjectType,subjectRef:ev.subjectRef,domain:ev.domain,task:ev.task,purpose:ev.purpose,timeHorizon:ev.timeHorizon}});
    const dim=namespace.buildExternal020ReliabilityDimensions({evaluationId:evaluationId});if(!dim.ok)return dim;const ind=namespace.assessExternal020IndependentConfirmation({evaluationId:evaluationId});if(!ind.ok)return ind;
    const history=s.reliabilityProfileHistory.get(profileId)||[];const revisionNumber=history.length+1;const evidenceDelta=diff(prev.evidenceRefs,ev.evidenceRefs),sourceDelta=diff(prev.sourceRefs,ev.sourceRefs);
    const changedDimensions=Object.keys(dim.data.dimensions).filter(function(k){return JSON.stringify(i.clone(prev.dimensions&&prev.dimensions[k]))!==JSON.stringify(i.clone(dim.data.dimensions[k]));});
    const next=i.deepFreeze({profileId:profileId,profileVersion:"1."+Math.max(0,revisionNumber-1)+".0",revisionNumber:revisionNumber,previousVersionRef:profileId+"@"+prev.profileVersion,supersedesVersionRef:profileId+"@"+prev.profileVersion,revisionReason:reason,evidenceAddedRefs:evidenceDelta.added,evidenceRemovedRefs:evidenceDelta.removed,sourceAddedRefs:sourceDelta.added,sourceRemovedRefs:sourceDelta.removed,changedDimensions:changedDimensions,subjectType:ev.subjectType,subjectRef:ev.subjectRef,domain:ev.domain,task:ev.task,purpose:ev.purpose,timeHorizon:ev.timeHorizon,contextIdentity:prev.contextIdentity,contextId:ev.contextId,evaluationId:ev.evaluationId,inputPackageId:ev.inputPackageId,dimensions:dim.data.dimensions,independenceAssessment:ind.data.assessment,evidenceRefs:i.clone(ev.evidenceRefs||[]),sourceRefs:i.clone(ev.sourceRefs||[]),contradictionRefs:i.clone(ev.contradictionRefs||[]),confirmationRefs:i.clone(ev.confirmationRefs||[]),missingInformation:i.clone(ev.missingInformation||[]),evaluationState:ev.evaluationState,explanation:ev.explanation,reliabilityScore:null,authorityScore:null,truthConfirmed:false,conflictWinner:null,candidateOnly:true,actionAuthorityGranted:false,knowledgePromotionPerformed:false,canonicalRepositoryMutationPerformed:false,externalTransmissionPerformed:false,paidApiExecutionPerformed:false,ide170ConfidenceOverwritten:false,rawEvidenceMutationPerformed:false,createdAt:i.nowIso(),immutable:true});
    s.reliabilityProfiles.set(profileId,next);history.push(next);s.reliabilityProfileHistory.set(profileId,history);i.touch();
    const lineage=typeof namespace.createExternal020Lineage==="function"?namespace.createExternal020Lineage({outputRef:profileId+"@"+next.profileVersion,inputPackageId:next.inputPackageId,contextId:next.contextId,evidenceRefs:next.evidenceRefs,contradictionRefs:next.contradictionRefs,confirmationRefs:next.confirmationRefs,explanation:"Reliability Profile revision: "+reason}):null;
    return i.buildResult(true,"EXTERNAL020_RELIABILITY_PROFILE_REVISED","Candidate",{profile:next,previousProfile:i.clone(prev),lineage:lineage&&lineage.ok?lineage.data.lineage:null});
  }
  Object.assign(namespace.api,{reviseExternal020ReliabilityProfile});Object.assign(namespace,namespace.api);
  namespace.modules.phase2Revision={id:"EXTERNAL-020-PHASE2-RELIABILITY-REVISION",version:P2.version,status:"Ready",appendOnly:true,historyOverwriteAllowed:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
