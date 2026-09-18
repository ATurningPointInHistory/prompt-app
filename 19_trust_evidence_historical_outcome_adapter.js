/* ============================================================
   FILE: 19_trust_evidence_historical_outcome_adapter.js
   EXTERNAL-020 Phase 3 / EXTERNAL-010 Public Read Adapter
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P3=global.EXTERNAL020Phase3VersionManifest;if(!namespace||!namespace.__internal||!P3)return;
  const i=namespace.__internal,s=i.state;
  if(!(s.historicalInputPackages instanceof Map))s.historicalInputPackages=new Map();
  function dependencyStatus(){
    const e=global.EXTERNAL010ExternalIntelligence||{};
    const api={};P3.publicReadDependencies.forEach(function(name){api[name]=typeof e[name]==="function";});
    return {external010:Boolean(global.EXTERNAL010ExternalIntelligence),apis:api,allRequiredPublicReadApisAvailable:P3.publicReadDependencies.every(function(name){return api[name]===true;}),writeApiRequired:false,internalStateAccessAllowed:false};
  }
  function safeCall(fn,args,fallback){try{return typeof fn==="function"?fn.apply(null,args||[]):fallback;}catch(_){return fallback;}}
  function captureExternal020HistoricalOutcomeInputs(input){
    const x=i.isPlainObject(input)?input:{};const e=global.EXTERNAL010ExternalIntelligence||{};const dep=dependencyStatus();
    if(!dep.allRequiredPublicReadApisAvailable)return i.buildResult(false,"EXTERNAL020_PHASE3_PUBLIC_READ_DEPENDENCY_MISSING","Blocked",dep);
    let predictionId=i.text(x.predictionId,"");let outcomeId=i.text(x.outcomeId,"");const capabilityId=i.text(x.capabilityId,"");
    let currentPrediction=predictionId?safeCall(e.getExternalIntelligencePrediction,[predictionId],null):null;
    if(!outcomeId&&currentPrediction&&currentPrediction.outcomeReference)outcomeId=i.text(currentPrediction.outcomeReference,"");
    let currentOutcome=outcomeId?safeCall(e.getExternalIntelligenceOutcome,[outcomeId],null):null;
    if(!predictionId&&currentOutcome&&currentOutcome.predictionId){predictionId=i.text(currentOutcome.predictionId,"");currentPrediction=safeCall(e.getExternalIntelligencePrediction,[predictionId],null);}
    const predictionHistory=predictionId?safeCall(e.listExternalIntelligencePredictionHistory,[predictionId],[]):[];
    const outcomeHistory=outcomeId?safeCall(e.listExternalIntelligenceOutcomeHistory,[outcomeId],[]):[];
    const capabilityPerformanceProfiles=capabilityId?safeCall(e.listExternalIntelligenceCapabilityPerformanceProfiles,[capabilityId],[]):[];
    const record=i.deepFreeze({
      historicalInputPackageId:i.nextId("EXTERNAL020-HISTORICAL-INPUT"),
      sourceComponentId:"EXTERNAL-010",
      sourceAuthorityBoundary:"OBSERVE_RECORD_DETECT",
      finalReliabilityAuthority:"EXTERNAL-020",
      predictionId:predictionId||null,
      outcomeId:outcomeId||null,
      capabilityId:capabilityId||null,
      currentPrediction:i.clone(currentPrediction),
      currentOutcome:i.clone(currentOutcome),
      predictionHistory:i.clone(Array.isArray(predictionHistory)?predictionHistory:[]),
      outcomeHistory:i.clone(Array.isArray(outcomeHistory)?outcomeHistory:[]),
      capabilityPerformanceProfiles:i.clone(Array.isArray(capabilityPerformanceProfiles)?capabilityPerformanceProfiles:[]),
      publicReadApisUsed:P3.publicReadDependencies.slice(),
      readOnly:true,
      external010WriteApiInvoked:false,
      internalStateAccessPerformed:false,
      rawEvidenceMutationPerformed:false,
      externalTransmissionPerformed:false,
      paidApiExecutionPerformed:false,
      capturedAt:i.nowIso(),
      immutable:true
    });
    s.historicalInputPackages.set(record.historicalInputPackageId,record);s.latestHistoricalInputPackageId=record.historicalInputPackageId;i.touch();
    return i.buildResult(true,"EXTERNAL020_HISTORICAL_INPUT_CAPTURED","Ready",{historicalInputPackage:record});
  }
  function getExternal020HistoricalOutcomeDependencyStatus(){return i.clone(dependencyStatus());}
  function getExternal020HistoricalInputPackage(id){const key=i.text(id,s.latestHistoricalInputPackageId||"");const r=key?s.historicalInputPackages.get(key):null;return r?i.clone(r):null;}
  Object.assign(namespace.api,{getExternal020HistoricalOutcomeDependencyStatus,captureExternal020HistoricalOutcomeInputs,getExternal020HistoricalInputPackage});Object.assign(namespace,namespace.api);
  namespace.modules.phase3HistoricalAdapter={id:"EXTERNAL-020-PHASE3-HISTORICAL-OUTCOME-ADAPTER",version:P3.version,status:"Ready",readOnly:true,external010WriteApiRequired:false,internalStateAccessAllowed:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
