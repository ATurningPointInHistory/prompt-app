/* ============================================================
   FILE: 17_external_intelligence_phase8_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.7.2 / Gateway 1.4.0 compatibility
   Phase 08 Android Real Device Validation
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL010ExternalIntelligence,VERSION_MANIFEST=global.EXTERNAL010VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST){console.warn("EXTERNAL-010 Phase 08 Android validation blocked: dependencies missing.");return;}
  const internal=namespace.__internal,state=internal.state,MODULE_VERSION=VERSION_MANIFEST.getModuleVersion("phase8AndroidValidation");
  function collector(){const checks=[];return{checks,check(name,passed,detail,group,severity){checks.push({name,passed:passed===true,detail:detail==null?"":(typeof detail==="string"?detail:internal.stableStringify(detail)),group:group||"Android Real Device",severity:severity||"Critical"});}};}
  function summarize(checks){const passed=checks.filter(x=>x.passed).length,failed=checks.length-passed,criticalFailed=checks.filter(x=>!x.passed&&x.severity==="Critical").length;return{passed,failed,total:checks.length,criticalFailed,health:checks.length?Math.round(passed/checks.length*1000)/10:0};}
  async function runExternalIntelligencePhase8AndroidValidation(input){
    const c=collector(),check=c.check;let regression=null,p7Android=null;
    try{
      const ua=global.navigator&&global.navigator.userAgent||"";
      check("Release Version is Phase 08 compatible or later",VERSION_MANIFEST.isReleaseCompatibleFrom("1.7.0"),VERSION_MANIFEST.release.version,"Foundation");
      check("Gateway remains compatible at 1.4.0 without Phase 08 changes",VERSION_MANIFEST.gateway.gatewayVersion==="1.4.0",VERSION_MANIFEST.gateway.gatewayVersion,"Boundary");
      check("Android real-device environment is detected",/Android/i.test(ua),ua,"Android Environment");
      check("Fetch API remains available",typeof global.fetch==="function",typeof global.fetch,"Android Environment");
      check("Web Crypto SHA-256 remains available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.crypto.subtle.digest==="function"),Boolean(global.crypto&&global.crypto.subtle),"Android Environment");
      const init=await namespace.initializeExternalIntelligenceFoundation();check("Phase 08 foundation initializes on Android",init&&init.ok===true,init&&init.code,"Initialization");
      regression=await namespace.runExternalIntelligencePhase8Validation();check("Phase 08 regression remains PASS on Android",regression.failed===0&&regression.health===100&&regression.phase8Complete===true,{passed:regression.passed,failed:regression.failed,total:regression.total},"Regression");
      p7Android=await namespace.runExternalIntelligencePhase7AndroidValidation(input);check("Inherited Phase 07 Android real-device gate remains PASS",p7Android.failed===0&&p7Android.health===100&&p7Android.phase7AndroidRealDeviceComplete===true,{passed:p7Android.passed,failed:p7Android.failed,total:p7Android.total},"Inherited Android Gate");
      check("Static Script Manifest includes Phase 08 scripts",Boolean(p7Android.staticManifest&&p7Android.staticManifest.scriptCount>=328),p7Android.staticManifest,"Static Integrity");
      check("Android keeps Capability identity/version records locally without Secret Value",state.analyticalCapabilities.size>=3&&Array.from(state.analyticalCapabilities.values()).every(r=>r.secretValueStored===false),{capabilityCount:state.analyticalCapabilities.size},"Capability Registry");
      const sensitive=namespace.createExternalIntelligenceCapabilityRoutingCandidate({taskType:"CLAIM_REVIEW",domain:"GENERAL",horizon:"SHORT",inputType:"TEXT",dataClass:"SENSITIVE",requiresExternalTransmission:true,maxEstimatedCost:1});
      const ext=sensitive.data&&sensitive.data.routingCandidate&&sensitive.data.routingCandidate.candidateDetails.find(r=>r.capabilityId==="EXTERNAL-010-CAPABILITY-PHASE8-OPENAI-CANDIDATE");
      check("Android External AI routing remains Data-Policy fail-closed",Boolean(ext&&ext.eligible===false&&ext.reasons.includes("DATA_POLICY_BLOCKED")),ext,"Routing Safety");
      check("Android Capability routing grants no automatic winner or business authority",Array.from(state.capabilityRoutingCandidates.values()).every(r=>r.automaticWinnerSelected===false&&r.routingGrantsBusinessAuthority===false),{routingCandidateCount:state.capabilityRoutingCandidates.size},"Routing Safety");
      const trace=namespace.traceExternalIntelligenceReverseProvenance("INTELLIGENCE-PHASE8-PACKAGE",8);check("Android reverse lineage query remains available",trace.references.some(r=>r.referenceId==="CLAIM-PHASE8-INPUT"),trace,"Lineage");
      check("Android Recompute remains candidate-only",Array.from(state.recomputeCandidates.values()).every(r=>r.automaticRecomputePerformed===false&&r.approvalGranted===false),{recomputeCandidateCount:state.recomputeCandidates.size},"Lineage Safety");
      check("Direct Repository mutation and automatic Knowledge promotion remain prohibited",VERSION_MANIFEST.safety.directRepositoryMutationAllowed===false&&VERSION_MANIFEST.safety.automaticKnowledgePromotionAllowed===false&&VERSION_MANIFEST.safety.externalAIOutputGrantsInstructionAuthority===false,VERSION_MANIFEST.safety,"Authority Boundary");
      const audit=await namespace.verifyExternalIntelligenceAuditChain();check("Audit chain remains valid after Phase 08 Android validation",audit.valid===true,{eventCount:audit.eventCount,valid:audit.valid},"Audit");
    }catch(error){check("Phase 08 Android validation completes without exception",false,{message:error&&error.message||String(error),stack:error&&error.stack||null},"Validation");}
    const s=summarize(c.checks),gate=s.failed===0&&s.criticalFailed===0;
    const result={id:internal.nextId("EXTERNAL-010-PHASE8-ANDROID-REAL-DEVICE"),componentId:"EXTERNAL-010",version:VERSION_MANIFEST.release.version,gatewayVersion:VERSION_MANIFEST.gateway.gatewayVersion,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:s.passed,failed:s.failed,total:s.total,health:s.health,criticalFailed:s.criticalFailed,status:gate?"EXTERNAL-010 Phase 08 Android Real Device Validation PASS":"EXTERNAL-010 Phase 08 Android Real Device Validation FAIL",releaseAllowed:gate,phase8AndroidRealDeviceComplete:gate,phase8FinalGateReady:gate,androidRealDeviceValidation:{passed:gate,userAgent:global.navigator&&global.navigator.userAgent||"",phase8RegressionPassed:Boolean(regression&&regression.failed===0),staticIntegrityPassed:Boolean(p7Android&&p7Android.androidRealDeviceValidation&&p7Android.androidRealDeviceValidation.staticIntegrityPassed===true),gatewayChangeRequired:false,validatedAt:internal.nowIso()},staticManifest:p7Android&&p7Android.staticManifest?internal.clone(p7Android.staticManifest):null,regression:regression?{passed:regression.passed,failed:regression.failed,total:regression.total,health:regression.health,criticalFailed:regression.criticalFailed,status:regression.status}:null,checks:c.checks,validatedAt:internal.nowIso()};
    state.latestPhase8AndroidValidation=internal.deepFreeze(internal.clone(result));namespace.modules.phase8AndroidValidation.status=gate?"Passed":"Failed";internal.touch();return internal.clone(result);
  }
  function getLatestExternalIntelligencePhase8AndroidValidation(){return state.latestPhase8AndroidValidation?internal.clone(state.latestPhase8AndroidValidation):null;}
  Object.assign(namespace.api,{runExternalIntelligencePhase8AndroidValidation,getLatestExternalIntelligencePhase8AndroidValidation});Object.assign(namespace,namespace.api);
  namespace.modules.phase8AndroidValidation={id:"EXTERNAL-010-PHASE8-ANDROID-REAL-DEVICE-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:8,decisions:["036","037"],gatewayChangeRequired:false,loadedAt:internal.nowIso()};
  global.runExternalIntelligencePhase8AndroidValidation=runExternalIntelligencePhase8AndroidValidation;
})(typeof window!=="undefined"?window:globalThis);
