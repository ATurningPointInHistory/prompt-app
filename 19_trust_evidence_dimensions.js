/* ============================================================
   FILE: 19_trust_evidence_dimensions.js
   EXTERNAL-020 Phase 2 / Multi-Dimensional Reliability Model
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence, P2=global.EXTERNAL020Phase2VersionManifest;
  if(!namespace||!namespace.__internal||!P2)return;
  const i=namespace.__internal,s=i.state;
  function intersects(a,b){const set=new Set(a||[]);return (b||[]).some(function(x){return set.has(x);});}
  function relevantOperational(pkg,ctx){const sourceRefs=i.unique((ctx.sourceRefs||[]).concat(ctx.subjectType==="SOURCE"?[ctx.subjectRef]:[]));return (pkg.operationalSignals||[]).filter(function(x){return sourceRefs.length===0?false:sourceRefs.includes(i.text(x&&x.sourceId,""));});}
  function relevantQuality(pkg,ctx){return (pkg.evidenceQualitySignals||[]).filter(function(x){const eid=i.text(x&&x.evidenceId,"");const sid=i.text(x&&x.sourceId,"");return (ctx.subjectType==="EVIDENCE"&&eid===ctx.subjectRef)||((ctx.evidenceRefs||[]).includes(eid))||((ctx.sourceRefs||[]).includes(sid))||(ctx.subjectType==="SOURCE"&&sid===ctx.subjectRef);});}
  function relevantCandidates(list,ctx){return (list||[]).filter(function(c){const ids=Array.isArray(c&&c.evidenceIds)?c.evidenceIds:[];return (c&&c.subjectRef&&c.subjectRef===ctx.subjectRef)||intersects(ctx.evidenceRefs||[],ids);});}
  function boolCompleteness(rows,field){if(!rows.length)return "UNKNOWN";return rows.every(function(x){return x&&x[field]===true;})?"COMPLETE":"INCOMPLETE";}
  function buildExternal020ReliabilityDimensions(input){
    const x=i.isPlainObject(input)?input:{};const evaluationId=i.text(x.evaluationId,s.latestEvaluationId||"");const ev=evaluationId?s.evaluations.get(evaluationId):null;
    if(!ev)return i.buildResult(false,"EXTERNAL020_PHASE2_EVALUATION_REQUIRED","Blocked",null);
    const ctx=s.contexts.get(ev.contextId),pkg=s.inputPackages.get(ev.inputPackageId);if(!ctx||!pkg)return i.buildResult(false,"EXTERNAL020_PHASE2_INPUT_CONTEXT_REQUIRED","Blocked",null);
    const ops=relevantOperational(pkg,ctx),quality=relevantQuality(pkg,ctx),contradictions=relevantCandidates(pkg.contradictionCandidates,ctx),confirmations=relevantCandidates(pkg.confirmationCandidates,ctx);
    const verifiedIndependent=confirmations.filter(function(c){return c&&c.independenceVerified===true;});
    const unknownIndependence=confirmations.filter(function(c){return !c||c.independenceVerified!==true;});
    const dims={
      OPERATIONAL_RELIABILITY:{state:ops.length?"OBSERVED":"UNKNOWN",supportingRefs:ops.map(function(x){return x.reliabilitySignalId;}).filter(Boolean),facts:{signalCount:ops.length,requestCount:ops.reduce(function(n,x){return n+(Number(x.requestCount)||0);},0),successCount:ops.reduce(function(n,x){return n+(Number(x.successCount)||0);},0),timeoutCount:ops.reduce(function(n,x){return n+(Number(x.timeoutCount)||0);},0),schemaFailureCount:ops.reduce(function(n,x){return n+(Number(x.schemaFailureCount)||0);},0)},numericalReliabilityScore:null},
      EVIDENCE_QUALITY:{state:quality.length?"OBSERVED":"UNKNOWN",supportingRefs:quality.map(function(x){return x.qualitySignalId;}).filter(Boolean),facts:{signalCount:quality.length,contentPresentCount:quality.filter(function(x){return x.contentPresent===true;}).length,schemaValidCount:quality.filter(function(x){return x.schemaValid===true;}).length,contentHashVerifiedCount:quality.filter(function(x){return x.contentHashVerified===true;}).length},numericalReliabilityScore:null},
      PROVENANCE_COMPLETENESS:{state:boolCompleteness(quality,"provenanceComplete"),supportingRefs:quality.map(function(x){return x.qualitySignalId;}).filter(Boolean)},
      TEMPORAL_COMPLETENESS_FRESHNESS:{state:boolCompleteness(quality,"temporalMetadataComplete"),supportingRefs:quality.map(function(x){return x.qualitySignalId;}).filter(Boolean),freshnessStates:i.unique(ops.map(function(x){return i.text(x.freshnessState,"UNKNOWN").toUpperCase();}))},
      CONTRADICTION_STATE:{state:contradictions.length?"CONTRADICTION_OBSERVED":"NONE_OBSERVED",supportingRefs:contradictions.map(function(x){return x.candidateId;}).filter(Boolean),conflictWinner:null,automaticResolutionPerformed:false},
      CONFIRMATION_STATE:{state:confirmations.length?"CONFIRMATION_OBSERVED":"NONE_OBSERVED",supportingRefs:confirmations.map(function(x){return x.candidateId;}).filter(Boolean),confirmationCount:confirmations.length},
      INDEPENDENCE_STATE:{state:verifiedIndependent.length?"VERIFIED_INDEPENDENT":(confirmations.length?"UNKNOWN":"NOT_APPLICABLE"),supportingRefs:verifiedIndependent.map(function(x){return x.candidateId;}).filter(Boolean),verifiedIndependentCount:verifiedIndependent.length,unknownCount:unknownIndependence.length,verifiedDependentCount:0,dependencyInferred:false},
      CONTEXT_COVERAGE:{state:(ctx.evidenceRefs||[]).length||quality.length||ops.length?"REFERENCED":"UNKNOWN",evidenceRefCount:(ctx.evidenceRefs||[]).length,sourceRefCount:(ctx.sourceRefs||[]).length,contextSpecific:ctx.contextSpecific===true},
      UNCERTAINTY_MISSING_INFORMATION:{state:ev.evaluationState||"UNKNOWN",missingInformation:i.clone(ev.missingInformation||[]),falsePrecisionPrevented:ev.reliabilityScore===null&&ev.authorityScore===null}
    };
    Object.keys(dims).forEach(function(k){dims[k]=i.deepFreeze(Object.assign({dimensionId:k},dims[k]));});
    return i.buildResult(true,"EXTERNAL020_PHASE2_DIMENSIONS_BUILT","Ready",{evaluationId:ev.evaluationId,dimensions:i.deepFreeze(dims)});
  }
  Object.assign(namespace.api,{buildExternal020ReliabilityDimensions});Object.assign(namespace,namespace.api);
  namespace.modules.phase2Dimensions={id:"EXTERNAL-020-PHASE2-DIMENSIONS",version:P2.version,status:"Ready",universalScoreImplemented:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
