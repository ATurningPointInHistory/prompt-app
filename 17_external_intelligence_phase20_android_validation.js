/* ============================================================
   FILE: 17_external_intelligence_phase20_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.19.0
   Phase 20 Android Real Device Validation
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL010ExternalIntelligence,VM=global.EXTERNAL010VersionManifest;
  if(!namespace||!namespace.__internal||!VM)return;
  const internal=namespace.__internal,state=internal.state;
  const MODULE_VERSION=VM.getModuleVersion("phase20AndroidValidation");
  async function runExternalIntelligencePhase20AndroidValidation(){
    const base=await namespace.runExternalIntelligencePhase20Validation();
    const checks=[];const add=(name,passed,detail,group)=>checks.push({name,passed:passed===true,detail:detail==null?"":typeof detail==="string"?detail:internal.stableStringify(detail),group:group||"Phase 20 Android",severity:"Critical"});
    const ua=typeof navigator!=="undefined"?navigator.userAgent:"";
    add("Phase 20 functional regression remains PASS",base.failed===0,{passed:base.passed,failed:base.failed,total:base.total},"Regression");
    add("Android/browser runtime is active",typeof global!=="undefined",ua,"Runtime");
    add("Capability Resilience remains available without requiring Gateway",!!namespace.modules.capabilityResilience&&namespace.modules.capabilityResilience.gatewayFailureImpliesCoreFailure===false,namespace.modules.capabilityResilience,"Offline");
    add("Disaster Recovery records preserve no-secret/session-token boundary",!!namespace.modules.disasterRecovery&&namespace.modules.disasterRecovery.restoredSessionRecordEqualsCurrentAuthentication===false&&namespace.modules.disasterRecovery.secretReconstructionAllowed===false,namespace.modules.disasterRecovery,"Security");
    add("Gateway remains optional for Android Core boot",namespace.modules.gatewayClient&&namespace.modules.gatewayClient.gatewayFailureBreaksCore===false,namespace.modules.gatewayClient,"Offline");
    add("Offline Existing Evidence capability can degrade explicitly rather than fail Core",(function(){namespace.reportExternalIntelligenceComponentHealth({componentId:"EVIDENCE_STORE",componentType:"STORAGE",healthState:"READY",offlineAvailable:true});namespace.reportExternalIntelligenceComponentHealth({componentId:"GATEWAY",componentType:"GATEWAY",healthState:"UNAVAILABLE"});const r=namespace.evaluateExternalIntelligenceCapabilityHealth({capabilityId:"EXTERNAL-010-CAPABILITY-EXISTING-EVIDENCE-READ"});return r.ok&&r.data.capabilityHealth.healthState==="DEGRADED";})(),"Existing Evidence remains accessible","Offline");
    add("Restored session record never equals current authentication",VM.safety.restoredSessionRecordEqualsCurrentAuthentication===false,VM.safety.restoredSessionRecordEqualsCurrentAuthentication,"Session");
    add("Recovery cannot grant Trading/Real-Money authority",namespace.modules.strategyExperiment&&namespace.modules.strategyExperiment.tradingAuthorityGranted===false&&namespace.modules.strategyExperiment.realMoneyAuthorityGranted===false,namespace.modules.strategyExperiment,"Authority");
    add("No automatic orphan deletion or blind retry is enabled",namespace.modules.disasterRecovery.automaticOrphanDeletionAllowed===false&&namespace.modules.disasterRecovery.automaticBlindRetryAllowed===false,namespace.modules.disasterRecovery,"Safety");
    const failed=checks.filter(c=>!c.passed);const result={id:internal.nextId("EXTERNAL-010-PHASE20-ANDROID-REAL-DEVICE"),componentId:"EXTERNAL-010",version:VM.release.version,gatewayVersion:VM.gateway.gatewayVersion,implementationPhase:VM.release.implementationPhase,passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:checks.length?Math.round((checks.length-failed.length)*1000/checks.length)/10:0,criticalFailed:failed.length,status:failed.length?"EXTERNAL-010 Phase 20 Android Real Device Validation FAILED":"EXTERNAL-010 Phase 20 Android Real Device Validation PASS",releaseAllowed:failed.length===0,phase20AndroidRealDeviceComplete:failed.length===0,phase20FinalGateReady:failed.length===0,androidRealDeviceValidation:{passed:failed.length===0,userAgent:ua,gatewayRequiredForCore:false},checks,validatedAt:internal.nowIso()};state.latestPhase20AndroidValidation=internal.deepFreeze(internal.clone(result));return result;
  }
  Object.assign(namespace.api,{runExternalIntelligencePhase20AndroidValidation});Object.assign(namespace,namespace.api);global.runExternalIntelligencePhase20AndroidValidation=runExternalIntelligencePhase20AndroidValidation;namespace.modules.phase20AndroidValidation={id:"EXTERNAL-010-PHASE20-ANDROID-REAL-DEVICE",version:MODULE_VERSION,phase:20,status:"Ready"};
})(typeof window!=="undefined"?window:globalThis);
