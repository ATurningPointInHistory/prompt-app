/* ============================================================
   FILE: 17_external_intelligence_uncertainty.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.9.0
   Phase 10: Reliability Signals / Uncertainty / Outcome Foundation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("uncertainty");

  const PROBABILITY_STATES=["NOT_ESTIMATED","QUALITATIVE","RANGE","POINT_ESTIMATE","UNKNOWN"];
  function registerExternalIntelligencePrediction(input){const x=internal.isPlainObject(input)?input:{}; const predictionId=internal.text(x.predictionId,""); if(!predictionId)return internal.buildResult(false,"EXTERNAL010_PREDICTION_ID_REQUIRED","Blocked",null);
    const version=Math.max(1,Number(x.version)||1), key=predictionId+"@"+version; if(state.predictionVersions.has(key))return internal.buildResult(true,"EXTERNAL010_PREDICTION_ALREADY_REGISTERED","Ready",{prediction:internal.clone(state.predictionVersions.get(key))});
    const probabilityState=internal.text(x.probabilityState,"NOT_ESTIMATED").toUpperCase(); if(!PROBABILITY_STATES.includes(probabilityState))return internal.buildResult(false,"EXTERNAL010_PROBABILITY_STATE_INVALID","Blocked",{probabilityState});
    const probability=x.probability==null?null:Number(x.probability); if(probabilityState==="NOT_ESTIMATED"&&probability!==null)return internal.buildResult(false,"EXTERNAL010_INVENTED_PROBABILITY_BLOCKED","Blocked",null); if(probability!==null&&(!Number.isFinite(probability)||probability<0||probability>1))return internal.buildResult(false,"EXTERNAL010_PROBABILITY_INVALID","Blocked",{probability});
    const rec=internal.deepFreeze({predictionId,version,predictionRecordId:predictionId+"-V"+version,subjectRef:internal.text(x.subjectRef,"")||null,predictionType:internal.text(x.predictionType,"UNSPECIFIED"),targetTime:internal.text(x.targetTime,"")||null,probabilityState,probability,estimateConfidence:internal.text(x.estimateConfidence,"UNKNOWN"),evidenceStrength:internal.text(x.evidenceStrength,"UNKNOWN"),historicalSampleCount:x.historicalSampleCount==null?null:Math.max(0,Number(x.historicalSampleCount)||0),predictionInterval:internal.clone(x.predictionInterval||null),uncertaintyFactors:internal.unique(x.uncertaintyFactors||[]),modelId:internal.text(x.modelId,"")||null,modelVersion:internal.text(x.modelVersion,"")||null,evidenceIds:internal.unique(x.evidenceIds||[]),outcomeReference:internal.text(x.outcomeReference,"")||null,calibrationState:internal.text(x.calibrationState,"UNASSESSED"),supersedesPredictionRecordId:internal.text(x.supersedesPredictionRecordId,"")||null,probabilityInvented:false,canonicalTruthConfirmed:false,actionAuthorityGranted:false,createdAt:internal.nowIso(),immutable:true});
    state.predictionVersions.set(key,rec); state.predictionRecords.set(predictionId,rec); internal.touch(); return internal.buildResult(true,"EXTERNAL010_PREDICTION_REGISTERED","Ready",{prediction:internal.clone(rec)});}
  function listExternalIntelligencePredictionHistory(id){return Array.from(state.predictionVersions.values()).filter(r=>r.predictionId===id).sort((a,b)=>a.version-b.version).map(internal.clone);}
  Object.assign(namespace.api,{registerExternalIntelligencePrediction,listExternalIntelligencePredictionHistory,getExternalIntelligencePrediction:function(id){const r=state.predictionRecords.get(internal.text(id,""));return r?internal.clone(r):null;}}); Object.assign(namespace,namespace.api);
  namespace.modules.uncertainty={id:"EXTERNAL-010-UNCERTAINTY",version:MODULE_VERSION,status:"Ready",phase:10,decisions:["030"],noInventedProbability:true,loadedAt:internal.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
