/* ============================================================
   FILE: 19_trust_evidence_historical_outcome_assessment.js
   EXTERNAL-020 Phase 3 / Historical Outcome-Grounded Assessment
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P3=global.EXTERNAL020Phase3VersionManifest;if(!namespace||!namespace.__internal||!P3)return;
  const i=namespace.__internal,s=i.state;
  if(!(s.historicalOutcomeAssessments instanceof Map))s.historicalOutcomeAssessments=new Map();
  const CONFLICT=new Set(["DISPUTED","UNRESOLVED"]),PARTIAL=new Set(["NOT_YET_OBSERVED","NOT_YET_AVAILABLE","PARTIALLY_OBSERVED","PRELIMINARY","PROVISIONAL","REVISED","UNMEASURABLE","UNKNOWN"]);
  function upper(v,f){return i.text(v,f||"UNKNOWN").toUpperCase();}
  function collectRefs(snapshot){
    const refs=[];(snapshot.predictionHistory||[]).forEach(function(r){(r.evidenceIds||[]).forEach(function(x){refs.push(x);});});(snapshot.outcomeHistory||[]).forEach(function(r){(r.supportingEvidenceIds||[]).forEach(function(x){refs.push(x);});});(snapshot.capabilityPerformanceProfiles||[]).forEach(function(r){(r.evaluationEvidenceRefs||[]).forEach(function(x){refs.push(x);});});return i.unique(refs);
  }
  function contextMatchesPerformance(profile,row){
    if(!profile||!row)return false;const d=upper(row.domain,"GENERAL"),t=upper(row.taskType,"GENERAL_ANALYSIS"),h=upper(row.horizon,"ANY");
    const pd=upper(profile.domain,"GENERAL"),pt=upper(profile.task,"UNKNOWN"),ph=upper(profile.timeHorizon,"UNKNOWN");
    const domainMatch=d==="ANY"||d===pd;const taskMatch=t==="ANY"||t===pt||t==="GENERAL_ANALYSIS";const horizonMatch=h==="ANY"||h===ph;return domainMatch&&taskMatch&&horizonMatch;
  }
  function evaluateExternal020HistoricalOutcomeSnapshot(input){
    const x=i.isPlainObject(input)?input:{};const profile=i.isPlainObject(x.profile)?x.profile:null;const snapshot=i.isPlainObject(x.historicalInputPackage)?x.historicalInputPackage:{};
    const predictions=Array.isArray(snapshot.predictionHistory)?snapshot.predictionHistory:[];const outcomes=Array.isArray(snapshot.outcomeHistory)?snapshot.outcomeHistory:[];const perf=Array.isArray(snapshot.capabilityPerformanceProfiles)?snapshot.capabilityPerformanceProfiles:[];
    const latestOutcome=outcomes.length?outcomes[outcomes.length-1]:(i.isPlainObject(snapshot.currentOutcome)?snapshot.currentOutcome:null);const settlement=latestOutcome?upper(latestOutcome.settlementState,"UNKNOWN"):"UNKNOWN";
    const groundedPerf=perf.filter(function(r){return r&&r.outcomeGrounded===true;});const contextPerf=groundedPerf.filter(function(r){return contextMatchesPerformance(profile,r);});
    let state="INSUFFICIENT_HISTORY";
    if(latestOutcome&&CONFLICT.has(settlement))state="CONFLICTED_HISTORY";
    else if(latestOutcome&&settlement==="FINAL")state="OUTCOME_GROUNDED";
    else if(latestOutcome&&PARTIAL.has(settlement))state="PARTIALLY_GROUNDED";
    else if(groundedPerf.length>0)state="PARTIALLY_GROUNDED";
    else if(outcomes.length||predictions.length||perf.length)state="UNKNOWN_HISTORY";
    const result=i.deepFreeze({
      historicalGroundingState:state,
      predictionHistoryCount:predictions.length,
      outcomeHistoryCount:outcomes.length,
      latestOutcomeSettlementState:latestOutcome?settlement:null,
      finalSettlementObserved:Boolean(latestOutcome&&settlement==="FINAL"),
      capabilityPerformanceProfileCount:perf.length,
      outcomeGroundedPerformanceProfileCount:groundedPerf.length,
      contextMatchingOutcomeGroundedPerformanceProfileCount:contextPerf.length,
      historicalEvidenceRefs:collectRefs(snapshot),
      predictionOutcomeMatchComputed:false,
      historicalAccuracyScore:null,
      calibrationScore:null,
      reliabilityScore:null,
      authorityScore:null,
      truthConfirmed:false,
      conflictWinner:null,
      automaticConflictResolutionPerformed:false,
      automaticProfileRevisionPerformed:false,
      automaticKnowledgePromotionPerformed:false,
      actionAuthorityGranted:false,
      externalAiReasoningPerformed:false,
      externalTransmissionPerformed:false,
      paidApiExecutionPerformed:false,
      rawEvidenceMutationPerformed:false,
      canonicalRepositoryMutationPerformed:false,
      ide170ConfidenceOverwritten:false,
      historicalOutcomeGroundedEvaluationPerformed:true,
      immutable:true
    });
    return i.clone(result);
  }
  function createExternal020HistoricalOutcomeAssessment(input){
    const x=i.isPlainObject(input)?input:{};const profileId=i.text(x.profileId,"");const profile=profileId&&s.reliabilityProfiles?s.reliabilityProfiles.get(profileId):null;if(!profile)return i.buildResult(false,"EXTERNAL020_PHASE3_PROFILE_REQUIRED","Blocked",{profileId:profileId||null});
    const captured=namespace.captureExternal020HistoricalOutcomeInputs({predictionId:x.predictionId,outcomeId:x.outcomeId,capabilityId:x.capabilityId});if(!captured.ok)return captured;
    const snapshot=captured.data.historicalInputPackage;const evalResult=evaluateExternal020HistoricalOutcomeSnapshot({profile:i.clone(profile),historicalInputPackage:snapshot});
    const assessment=i.deepFreeze({
      historicalAssessmentId:i.nextId("EXTERNAL020-HISTORICAL-ASSESSMENT"),
      profileId:profile.profileId,
      profileVersionRef:profile.profileId+"@"+profile.profileVersion,
      subjectType:profile.subjectType,
      subjectRef:profile.subjectRef,
      domain:profile.domain,
      task:profile.task,
      purpose:profile.purpose,
      timeHorizon:profile.timeHorizon,
      historicalInputPackageId:snapshot.historicalInputPackageId,
      predictionId:snapshot.predictionId,
      outcomeId:snapshot.outcomeId,
      capabilityId:snapshot.capabilityId,
      historicalGroundingState:evalResult.historicalGroundingState,
      predictionHistoryCount:evalResult.predictionHistoryCount,
      outcomeHistoryCount:evalResult.outcomeHistoryCount,
      latestOutcomeSettlementState:evalResult.latestOutcomeSettlementState,
      finalSettlementObserved:evalResult.finalSettlementObserved,
      capabilityPerformanceProfileCount:evalResult.capabilityPerformanceProfileCount,
      outcomeGroundedPerformanceProfileCount:evalResult.outcomeGroundedPerformanceProfileCount,
      contextMatchingOutcomeGroundedPerformanceProfileCount:evalResult.contextMatchingOutcomeGroundedPerformanceProfileCount,
      historicalEvidenceRefs:i.clone(evalResult.historicalEvidenceRefs),
      predictionOutcomeMatchComputed:false,
      historicalAccuracyScore:null,
      calibrationScore:null,
      reliabilityScore:null,
      authorityScore:null,
      truthConfirmed:false,
      conflictWinner:null,
      automaticConflictResolutionPerformed:false,
      automaticProfileRevisionPerformed:false,
      profileRevisionCandidateOnly:true,
      knowledgePromotionPerformed:false,
      actionAuthorityGranted:false,
      externalAiReasoningPerformed:false,
      externalTransmissionPerformed:false,
      paidApiExecutionPerformed:false,
      rawEvidenceMutationPerformed:false,
      canonicalRepositoryMutationPerformed:false,
      ide170ConfidenceOverwritten:false,
      historicalOutcomeGroundedEvaluationPerformed:true,
      explanation:i.text(x.explanation,"Historical outcome-grounded assessment linked to existing Reliability Profile without automatic revision."),
      createdAt:i.nowIso(),
      immutable:true
    });
    s.historicalOutcomeAssessments.set(assessment.historicalAssessmentId,assessment);s.latestHistoricalOutcomeAssessmentId=assessment.historicalAssessmentId;i.touch();
    const lineage=typeof namespace.createExternal020Lineage==="function"?namespace.createExternal020Lineage({outputRef:assessment.historicalAssessmentId,inputPackageId:snapshot.historicalInputPackageId,contextId:profile.contextId,evidenceRefs:assessment.historicalEvidenceRefs,contradictionRefs:profile.contradictionRefs||[],confirmationRefs:profile.confirmationRefs||[],explanation:"Historical Outcome Assessment for "+assessment.profileVersionRef}):null;
    return i.buildResult(true,"EXTERNAL020_HISTORICAL_OUTCOME_ASSESSMENT_CREATED","Candidate",{assessment:assessment,lineage:lineage&&lineage.ok?lineage.data.lineage:null});
  }
  function getExternal020HistoricalOutcomeAssessment(id){const key=i.text(id,s.latestHistoricalOutcomeAssessmentId||"");const r=key?s.historicalOutcomeAssessments.get(key):null;return r?i.clone(r):null;}
  function listExternal020HistoricalOutcomeAssessments(profileId){const id=i.text(profileId,"");return Array.from(s.historicalOutcomeAssessments.values()).filter(function(r){return !id||r.profileId===id;}).map(i.clone);}
  Object.assign(namespace.api,{evaluateExternal020HistoricalOutcomeSnapshot,createExternal020HistoricalOutcomeAssessment,getExternal020HistoricalOutcomeAssessment,listExternal020HistoricalOutcomeAssessments});Object.assign(namespace,namespace.api);
  namespace.modules.phase3HistoricalAssessment={id:"EXTERNAL-020-PHASE3-HISTORICAL-OUTCOME-ASSESSMENT",version:P3.version,status:"Ready",historicalOutcomeGroundedEvaluation:true,automaticProfileRevisionAllowed:false,truthAuthorityGranted:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
