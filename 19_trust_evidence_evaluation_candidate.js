/* ============================================================
   FILE: 19_trust_evidence_evaluation_candidate.js
   EXTERNAL-020 Phase 1 / Reliability Evaluation Candidate
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence, VERSION_MANIFEST=global.EXTERNAL020VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST) return;
  const i=namespace.__internal,s=i.state, STATES=VERSION_MANIFEST.evaluationStates;

  function intersects(a,b){ const set=new Set(a||[]); return (b||[]).some(function(x){return set.has(x);}); }
  function relevantCandidates(list,ctx){ return (list||[]).filter(function(c){ const ids=Array.isArray(c&&c.evidenceIds)?c.evidenceIds:[]; return (ctx.evidenceRefs&&ctx.evidenceRefs.length?intersects(ctx.evidenceRefs,ids):true); }); }
  function inferState(pkg,ctx,explicit){
    const requested=i.text(explicit,"").toUpperCase(); if(requested){ if(!STATES.includes(requested)) return {error:requested}; return {state:requested}; }
    const contradictions=relevantCandidates(pkg.contradictionCandidates,ctx);
    if(contradictions.length) return {state:"CONFLICTED"};
    const hasEvidence=(ctx.evidenceRefs||[]).length>0 || (pkg.evidenceQualitySignals||[]).length>0 || (pkg.operationalSignals||[]).length>0;
    return {state:hasEvidence?"ASSESSABLE":"INSUFFICIENT_EVIDENCE"};
  }
  function createExternal020ReliabilityEvaluationCandidate(input){
    const x=i.isPlainObject(input)?input:{};
    const contextId=i.text(x.contextId,s.latestContextId||""), ctx=contextId?s.contexts.get(contextId):null;
    if(!ctx) return i.buildResult(false,"EXTERNAL020_CONTEXT_REQUIRED","Blocked",null);
    const inputPackageId=i.text(x.inputPackageId,ctx.inputPackageId||s.latestInputPackageId||""), pkg=inputPackageId?s.inputPackages.get(inputPackageId):null;
    if(!pkg) return i.buildResult(false,"EXTERNAL020_INPUT_PACKAGE_REQUIRED","Blocked",null);
    const stateResult=inferState(pkg,ctx,x.evaluationState); if(stateResult.error) return i.buildResult(false,"EXTERNAL020_EVALUATION_STATE_INVALID","Blocked",{evaluationState:stateResult.error,allowed:STATES});
    const contradictions=relevantCandidates(pkg.contradictionCandidates,ctx), confirmations=relevantCandidates(pkg.confirmationCandidates,ctx);
    const independentConfirmations=confirmations.filter(function(c){return c&&c.independenceVerified===true;});
    const contradictionRefs=contradictions.map(function(c){return c.candidateId;}).filter(Boolean), confirmationRefs=confirmations.map(function(c){return c.candidateId;}).filter(Boolean);
    const missing=i.unique((x.missingInformation||[]).concat(stateResult.state==="INSUFFICIENT_EVIDENCE"?["SUFFICIENT_EVIDENCE"]:[]));
    const evaluation=i.deepFreeze({
      evaluationId:i.nextId("EXTERNAL020-EVALUATION"), evaluationVersion:"1.0.0", contextId:ctx.contextId, inputPackageId:pkg.inputPackageId,
      subjectType:ctx.subjectType, subjectRef:ctx.subjectRef, domain:ctx.domain, task:ctx.task, purpose:ctx.purpose, timeHorizon:ctx.timeHorizon,
      evaluationState:stateResult.state, evidenceRefs:i.clone(ctx.evidenceRefs), sourceRefs:i.clone(ctx.sourceRefs),
      factorSummary:{operationalSignalCount:(pkg.operationalSignals||[]).length,evidenceQualitySignalCount:(pkg.evidenceQualitySignals||[]).length,contradictionCandidateCount:contradictions.length,confirmationCandidateCount:confirmations.length,independentConfirmationCount:independentConfirmations.length,unknownIndependenceCount:confirmations.length-independentConfirmations.length},
      contradictionRefs:contradictionRefs, confirmationRefs:confirmationRefs, missingInformation:missing,
      reliabilityScore:null, authorityScore:null, truthConfirmed:false, conflictWinner:null, automaticConflictResolutionPerformed:false,
      duplicateEqualsIndependentConfirmation:false, independenceAssumedWhenUnknown:false, candidateOnly:true,
      evidenceAuthorityAssessmentOnly:true, actionAuthorityGranted:false, knowledgePromotionPerformed:false, canonicalRepositoryMutationPerformed:false,
      tradingAuthorityGranted:false, financialAuthorityGranted:false, businessAuthorityGranted:false, externalTransmissionPerformed:false, paidApiExecutionPerformed:false,
      ide170ConfidenceOverwritten:false, rawEvidenceMutationPerformed:false,
      explanation:i.text(x.explanation,"Reliability candidate is context-specific and evidence-grounded; numerical false precision is intentionally withheld in Phase 1."),
      createdAt:i.nowIso(), immutable:true
    });
    s.evaluations.set(evaluation.evaluationId,evaluation); s.latestEvaluationId=evaluation.evaluationId; i.touch();
    const lineageResult=typeof namespace.createExternal020Lineage==="function"?namespace.createExternal020Lineage({outputRef:evaluation.evaluationId,inputPackageId:pkg.inputPackageId,contextId:ctx.contextId,evidenceRefs:evaluation.evidenceRefs,contradictionRefs:contradictionRefs,confirmationRefs:confirmationRefs,explanation:evaluation.explanation}):null;
    return i.buildResult(true,"EXTERNAL020_EVALUATION_CANDIDATE_CREATED","Candidate",{evaluation:evaluation,lineage:lineageResult&&lineageResult.ok?lineageResult.data.lineage:null});
  }
  function getExternal020ReliabilityEvaluation(id){ const key=i.text(id,s.latestEvaluationId||""); return key&&s.evaluations.has(key)?i.clone(s.evaluations.get(key)):null; }
  Object.assign(namespace.api,{createExternal020ReliabilityEvaluationCandidate,getExternal020ReliabilityEvaluation}); Object.assign(namespace,namespace.api);
  namespace.modules.evaluationCandidate={id:"EXTERNAL-020-EVALUATION-CANDIDATE",version:VERSION_MANIFEST.version,status:"Ready",universalScoreImplemented:false,automaticConflictWinnerImplemented:false,loadedAt:i.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
