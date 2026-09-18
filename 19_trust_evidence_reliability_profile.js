/* ============================================================
   FILE: 19_trust_evidence_reliability_profile.js
   EXTERNAL-020 Phase 2 / Context-Specific Reliability Profile
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P2=global.EXTERNAL020Phase2VersionManifest;if(!namespace||!namespace.__internal||!P2)return;
  const i=namespace.__internal,s=i.state;
  if(!(s.reliabilityProfiles instanceof Map))s.reliabilityProfiles=new Map();
  if(!(s.reliabilityProfileSeries instanceof Map))s.reliabilityProfileSeries=new Map();
  if(!(s.reliabilityProfileHistory instanceof Map))s.reliabilityProfileHistory=new Map();
  function contextKey(ev){return [ev.subjectType,ev.subjectRef,ev.domain,ev.task,ev.purpose,ev.timeHorizon].map(function(v){return i.text(v,"UNKNOWN").toUpperCase();}).join("|");}
  function makeVersion(n){return "1."+Math.max(0,n-1)+".0";}
  function store(profile,key){s.reliabilityProfiles.set(profile.profileId,profile);if(!s.reliabilityProfileHistory.has(profile.profileId))s.reliabilityProfileHistory.set(profile.profileId,[]);s.reliabilityProfileHistory.get(profile.profileId).push(profile);s.reliabilityProfileSeries.set(key,profile.profileId);i.touch();}
  function createExternal020ReliabilityProfile(input){
    const x=i.isPlainObject(input)?input:{};const evaluationId=i.text(x.evaluationId,s.latestEvaluationId||"");const ev=evaluationId?s.evaluations.get(evaluationId):null;if(!ev)return i.buildResult(false,"EXTERNAL020_PHASE2_EVALUATION_REQUIRED","Blocked",null);
    const key=contextKey(ev);if(s.reliabilityProfileSeries.has(key))return i.buildResult(false,"EXTERNAL020_PROFILE_ALREADY_EXISTS_USE_REVISION","Blocked",{profileId:s.reliabilityProfileSeries.get(key),contextKey:key});
    const dim=namespace.buildExternal020ReliabilityDimensions({evaluationId:evaluationId});if(!dim.ok)return dim;const ind=namespace.assessExternal020IndependentConfirmation({evaluationId:evaluationId});if(!ind.ok)return ind;
    const profileId=i.nextId("EXTERNAL020-PROFILE");const profile=i.deepFreeze({profileId:profileId,profileVersion:makeVersion(1),revisionNumber:1,previousVersionRef:null,supersedesVersionRef:null,subjectType:ev.subjectType,subjectRef:ev.subjectRef,domain:ev.domain,task:ev.task,purpose:ev.purpose,timeHorizon:ev.timeHorizon,contextIdentity:key,contextId:ev.contextId,evaluationId:ev.evaluationId,inputPackageId:ev.inputPackageId,dimensions:dim.data.dimensions,independenceAssessment:ind.data.assessment,evidenceRefs:i.clone(ev.evidenceRefs||[]),sourceRefs:i.clone(ev.sourceRefs||[]),contradictionRefs:i.clone(ev.contradictionRefs||[]),confirmationRefs:i.clone(ev.confirmationRefs||[]),missingInformation:i.clone(ev.missingInformation||[]),evaluationState:ev.evaluationState,explanation:ev.explanation,reliabilityScore:null,authorityScore:null,truthConfirmed:false,conflictWinner:null,candidateOnly:true,actionAuthorityGranted:false,knowledgePromotionPerformed:false,canonicalRepositoryMutationPerformed:false,externalTransmissionPerformed:false,paidApiExecutionPerformed:false,ide170ConfidenceOverwritten:false,rawEvidenceMutationPerformed:false,createdAt:i.nowIso(),immutable:true});
    store(profile,key);const lineage=typeof namespace.createExternal020Lineage==="function"?namespace.createExternal020Lineage({outputRef:profile.profileId+"@"+profile.profileVersion,inputPackageId:profile.inputPackageId,contextId:profile.contextId,evidenceRefs:profile.evidenceRefs,contradictionRefs:profile.contradictionRefs,confirmationRefs:profile.confirmationRefs,explanation:"Reliability Profile created from "+evaluationId}):null;
    return i.buildResult(true,"EXTERNAL020_RELIABILITY_PROFILE_CREATED","Candidate",{profile:profile,lineage:lineage&&lineage.ok?lineage.data.lineage:null});
  }
  function getExternal020ReliabilityProfile(profileId){const id=i.text(profileId,"");const r=id?s.reliabilityProfiles.get(id):null;return r?i.clone(r):null;}
  function listExternal020ReliabilityProfileHistory(profileId){const id=i.text(profileId,"");const rows=s.reliabilityProfileHistory.get(id)||[];return rows.map(function(r,idx){const c=i.clone(r);c.historyState=idx===rows.length-1?"CURRENT":"SUPERSEDED";c.supersededByRef=idx<rows.length-1?(rows[idx+1].profileId+"@"+rows[idx+1].profileVersion):null;return c;});}
  function findExternal020ReliabilityProfile(input){const x=i.isPlainObject(input)?input:{};const key=[x.subjectType,x.subjectRef,x.domain,x.task,x.purpose,x.timeHorizon].map(function(v){return i.text(v,"UNKNOWN").toUpperCase();}).join("|");const id=s.reliabilityProfileSeries.get(key);return id?getExternal020ReliabilityProfile(id):null;}
  Object.assign(namespace.api,{createExternal020ReliabilityProfile,getExternal020ReliabilityProfile,listExternal020ReliabilityProfileHistory,findExternal020ReliabilityProfile});Object.assign(namespace,namespace.api);
  namespace.modules.phase2Profile={id:"EXTERNAL-020-PHASE2-RELIABILITY-PROFILE",version:P2.version,status:"Ready",contextSpecific:true,universalScoreImplemented:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
