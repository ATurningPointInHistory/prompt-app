/* ============================================================
   FILE: 17_external_intelligence_phase7_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.6.0 / Gateway 1.4.0 compatibility
   Phase 07 Android Real Device Validation
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL010ExternalIntelligence,VERSION_MANIFEST=global.EXTERNAL010VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST){console.warn("EXTERNAL-010 Phase 07 Android validation blocked: dependencies missing.");return;}
  const internal=namespace.__internal,state=internal.state,MODULE_VERSION=VERSION_MANIFEST.getModuleVersion("phase7AndroidValidation");
  function collector(){const checks=[];return{checks,check(name,passed,detail,group,severity){checks.push({name,passed:passed===true,detail:detail==null?"":(typeof detail==="string"?detail:internal.stableStringify(detail)),group:group||"Android Real Device",severity:severity||"Critical"});}};}
  function summarize(checks){const passed=checks.filter(x=>x.passed).length,failed=checks.length-passed,criticalFailed=checks.filter(x=>!x.passed&&x.severity==="Critical").length;return{passed,failed,total:checks.length,criticalFailed,health:checks.length?Math.round(passed/checks.length*1000)/10:0};}
  async function runExternalIntelligencePhase7AndroidValidation(input){
    const c=collector(),check=c.check;let regression=null,p6Android=null;
    try{
      const ua=global.navigator&&global.navigator.userAgent||"";
      check("Release Version is Phase 07 compatible or later",["1.6.0","1.7.0"].includes(VERSION_MANIFEST.release.version),VERSION_MANIFEST.release.version,"Foundation");
      check("Gateway remains compatible at 1.4.0 without Phase 07 changes",VERSION_MANIFEST.gateway.gatewayVersion==="1.4.0",VERSION_MANIFEST.gateway.gatewayVersion,"Boundary");
      check("Android real-device environment is detected",/Android/i.test(ua),ua,"Android Environment");
      check("Fetch API remains available",typeof global.fetch==="function",typeof global.fetch,"Android Environment");
      check("Web Crypto SHA-256 remains available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.crypto.subtle.digest==="function"),Boolean(global.crypto&&global.crypto.subtle),"Android Environment");
      const init=await namespace.initializeExternalIntelligenceFoundation();check("Phase 07 foundation initializes on Android",init&&init.ok===true,init&&init.code,"Initialization");
      regression=await namespace.runExternalIntelligencePhase7Validation();check("Phase 07 regression remains PASS on Android",regression.failed===0&&regression.health===100&&regression.phase7Complete===true,{passed:regression.passed,failed:regression.failed,total:regression.total},"Regression");
      p6Android=await namespace.runExternalIntelligencePhase6AndroidValidation(input);check("Inherited Phase 06 Android real-device gate remains PASS",p6Android.failed===0&&p6Android.health===100&&p6Android.phase6AndroidRealDeviceComplete===true,{passed:p6Android.passed,failed:p6Android.failed,total:p6Android.total},"Inherited Android Gate");
      check("Static Script Manifest includes Phase 07 scripts",Boolean(p6Android.staticManifest&&p6Android.staticManifest.scriptCount>=322),p6Android.staticManifest,"Static Integrity");
      check("Android keeps Normalized Layer separate from Raw Evidence",state.normalizedRecords.size>=2&&state.rawEvidenceRecords.size>=1&&VERSION_MANIFEST.safety.normalizationReplacesRawEvidence===false,{normalized:state.normalizedRecords.size,raw:state.rawEvidenceRecords.size},"Normalization");
      const ambiguous=Array.from(state.entityResolutionCandidates.values()).some(r=>r&&r.resolutionState==="AMBIGUOUS"&&r.canonicalResolutionPerformed===false);
      check("Ambiguous/visual Entity candidates remain unresolved on Android",ambiguous,{resolutionCandidateCount:state.entityResolutionCandidates.size},"Entity Safety");
      const blocked=Array.from(state.temporalContexts.values()).some(r=>r&&r.futureEvidenceBlocked===true&&r.eligibilityState==="BLOCKED_FUTURE_EVIDENCE");
      check("Backtest Future Evidence Guard remains active on Android",blocked,{temporalContextCount:state.temporalContexts.size},"Temporal Safety");
      const claimsSafe=Array.from(state.claimCandidates.values()).every(r=>r&&r.truthVerified===false&&r.knowledgePromotionPerformed===false&&r.repositoryAuthorityGranted===false);
      check("Claim Candidates grant no Truth/Knowledge/Repository authority on Android",state.claimCandidates.size>=2&&claimsSafe,{claimCandidateCount:state.claimCandidates.size},"Claim Safety");
      check("Phase 07 browser-only Structured Layer requires no Android canonical bulk store",VERSION_MANIFEST.persistence.androidLocalSqlitePersistenceAvailable===false&&VERSION_MANIFEST.persistence.browserDirectPersistentStoreAllowed===false,VERSION_MANIFEST.persistence,"Storage Boundary");
      check("Direct Repository mutation and automatic Knowledge promotion remain prohibited",VERSION_MANIFEST.safety.directRepositoryMutationAllowed===false&&VERSION_MANIFEST.safety.automaticKnowledgePromotionAllowed===false,VERSION_MANIFEST.safety,"Authority Boundary");
      const audit=await namespace.verifyExternalIntelligenceAuditChain();check("Audit chain remains valid after Phase 07 Android validation",audit.valid===true,{valid:audit.valid,eventCount:audit.eventCount},"Audit");
    }catch(error){check("Phase 07 Android validation completes without exception",false,{message:error&&error.message||String(error),stack:error&&error.stack||null},"Validation");}
    const s=summarize(c.checks),gate=s.failed===0&&s.criticalFailed===0;
    const result={id:internal.nextId("EXTERNAL-010-PHASE7-ANDROID-REAL-DEVICE"),componentId:"EXTERNAL-010",version:VERSION_MANIFEST.release.version,gatewayVersion:VERSION_MANIFEST.gateway.gatewayVersion,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:s.passed,failed:s.failed,total:s.total,health:s.health,criticalFailed:s.criticalFailed,status:gate?"EXTERNAL-010 Phase 07 Android Real Device Validation PASS":"EXTERNAL-010 Phase 07 Android Real Device Validation FAIL",releaseAllowed:gate,phase7AndroidRealDeviceComplete:gate,phase7FinalGateReady:gate,androidRealDeviceValidation:{passed:gate,userAgent:global.navigator&&global.navigator.userAgent||"",phase7RegressionPassed:Boolean(regression&&regression.failed===0),staticIntegrityPassed:Boolean(p6Android&&p6Android.androidRealDeviceValidation&&p6Android.androidRealDeviceValidation.staticIntegrityPassed===true),gatewayChangeRequired:false,validatedAt:internal.nowIso()},staticManifest:p6Android&&p6Android.staticManifest?internal.clone(p6Android.staticManifest):null,regression:regression?{passed:regression.passed,failed:regression.failed,total:regression.total,health:regression.health,criticalFailed:regression.criticalFailed,status:regression.status}:null,checks:c.checks,validatedAt:internal.nowIso()};
    state.latestPhase7AndroidValidation=internal.deepFreeze(internal.clone(result));namespace.modules.phase7AndroidValidation.status=gate?"Passed":"Failed";internal.touch();return internal.clone(result);
  }
  function getLatestExternalIntelligencePhase7AndroidValidation(){return state.latestPhase7AndroidValidation?internal.clone(state.latestPhase7AndroidValidation):null;}
  Object.assign(namespace.api,{runExternalIntelligencePhase7AndroidValidation,getLatestExternalIntelligencePhase7AndroidValidation});Object.assign(namespace,namespace.api);
  namespace.modules.phase7AndroidValidation={id:"EXTERNAL-010-PHASE7-ANDROID-REAL-DEVICE-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:7,decisions:["009","022","026","027"],gatewayChangeRequired:false,loadedAt:internal.nowIso()};
  global.runExternalIntelligencePhase7AndroidValidation=runExternalIntelligencePhase7AndroidValidation;
})(typeof window!=="undefined"?window:globalThis);
