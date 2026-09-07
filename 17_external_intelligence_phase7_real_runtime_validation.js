/* ============================================================
   FILE: 17_external_intelligence_phase7_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.6.0 / Gateway 1.4.0 compatibility
   Phase 07 PC Real Runtime Validation
   Normalization / Temporal / Claim / Entity Foundation
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL010ExternalIntelligence,VERSION_MANIFEST=global.EXTERNAL010VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST){console.warn("EXTERNAL-010 Phase 07 PC validation blocked: dependencies missing.");return;}
  const internal=namespace.__internal,state=internal.state,MODULE_VERSION=VERSION_MANIFEST.getModuleVersion("phase7RealRuntimeValidation");
  function collector(){const checks=[];return{checks,check(name,passed,detail,group,severity){checks.push({name,passed:passed===true,detail:detail==null?"":(typeof detail==="string"?detail:internal.stableStringify(detail)),group:group||"PC Real Runtime",severity:severity||"Critical"});}};}
  function summarize(checks){const passed=checks.filter(x=>x.passed).length,failed=checks.length-passed,criticalFailed=checks.filter(x=>!x.passed&&x.severity==="Critical").length;return{passed,failed,total:checks.length,criticalFailed,health:checks.length?Math.round(passed/checks.length*1000)/10:0};}
  async function runExternalIntelligencePhase7PcRealRuntimeValidation(){
    const c=collector(),check=c.check;let regression=null;
    try{
      const ua=global.navigator&&global.navigator.userAgent||"";
      check("Release Version is Phase 07 compatible or later",["1.6.0","1.7.0"].includes(VERSION_MANIFEST.release.version),VERSION_MANIFEST.release.version,"Foundation");
      check("Gateway remains compatible at 1.4.0 without Phase 07 changes",VERSION_MANIFEST.gateway.gatewayVersion==="1.4.0",VERSION_MANIFEST.gateway.gatewayVersion,"Boundary");
      check("Runtime is not Android",!/Android/i.test(ua),ua,"PC Environment");
      check("Application document is loaded",Boolean(global.document&&global.document.documentElement&&global.document.body),global.document&&global.document.readyState,"PC Environment");
      check("Web Crypto SHA-256 is available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.crypto.subtle.digest==="function"),Boolean(global.crypto&&global.crypto.subtle),"PC Environment");
      const init=await namespace.initializeExternalIntelligenceFoundation();check("Phase 07 foundation initializes on PC runtime",init&&init.ok===true,init&&init.code,"Initialization");
      regression=await namespace.runExternalIntelligencePhase7Validation();check("Phase 07 regression remains PASS on PC runtime",regression.failed===0&&regression.health===100&&regression.phase7Complete===true,{passed:regression.passed,failed:regression.failed,total:regression.total,health:regression.health},"Regression");
      check("PC runtime contains versioned Normalized Records",state.normalizedRecords.size>=2,state.normalizedRecords.size,"Normalization");
      check("PC runtime contains Temporal Context history",state.temporalContexts.size>=3,state.temporalContexts.size,"Temporal");
      check("PC runtime contains versioned Atomic Claim Candidates",state.claimCandidates.size>=2,state.claimCandidates.size,"Claim");
      check("PC runtime contains Entity Mention / Resolution Candidates",state.entityMentions.size>=2&&state.entityResolutionCandidates.size>=1,{mentions:state.entityMentions.size,resolutionCandidates:state.entityResolutionCandidates.size},"Entity");
      check("PC runtime preserves Raw Evidence separately",state.rawEvidenceRecords.size>=1&&VERSION_MANIFEST.safety.rawEvidenceOverwriteAllowed===false,{rawEvidenceCount:state.rawEvidenceRecords.size,rawEvidenceOverwriteAllowed:VERSION_MANIFEST.safety.rawEvidenceOverwriteAllowed},"Immutability");
      check("Phase 07 grants no Canonical Repository or Knowledge authority",VERSION_MANIFEST.safety.directRepositoryMutationAllowed===false&&VERSION_MANIFEST.safety.automaticKnowledgePromotionAllowed===false&&VERSION_MANIFEST.safety.claimExtractionEqualsKnowledgePromotion===false,VERSION_MANIFEST.safety,"Authority Boundary");
      const audit=await namespace.verifyExternalIntelligenceAuditChain();check("Audit chain remains valid on PC runtime",audit.valid===true,{valid:audit.valid,eventCount:audit.eventCount},"Audit");
    }catch(error){check("Phase 07 PC validation completes without exception",false,{message:error&&error.message||String(error),stack:error&&error.stack||null},"Validation");}
    const s=summarize(c.checks),gate=s.failed===0&&s.criticalFailed===0;
    const result={id:internal.nextId("EXTERNAL-010-PHASE7-PC-REAL-RUNTIME"),componentId:"EXTERNAL-010",version:VERSION_MANIFEST.release.version,gatewayVersion:VERSION_MANIFEST.gateway.gatewayVersion,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:s.passed,failed:s.failed,total:s.total,health:s.health,criticalFailed:s.criticalFailed,status:gate?"EXTERNAL-010 Phase 07 PC Real Runtime Validation PASS":"EXTERNAL-010 Phase 07 PC Real Runtime Validation FAIL",releaseAllowed:gate,phase7PcRealRuntimeComplete:gate,pcRealRuntimeValidation:{passed:gate,userAgent:global.navigator&&global.navigator.userAgent||"",phase7RegressionPassed:Boolean(regression&&regression.failed===0),gatewayChangeRequired:false,validatedAt:internal.nowIso()},regression:regression?{passed:regression.passed,failed:regression.failed,total:regression.total,health:regression.health,criticalFailed:regression.criticalFailed,status:regression.status}:null,checks:c.checks,validatedAt:internal.nowIso()};
    state.latestPhase7RealRuntimeValidation=internal.deepFreeze(internal.clone(result));namespace.modules.phase7RealRuntimeValidation.status=gate?"Passed":"Failed";internal.touch();return internal.clone(result);
  }
  function getLatestExternalIntelligencePhase7PcRealRuntimeValidation(){return state.latestPhase7RealRuntimeValidation?internal.clone(state.latestPhase7RealRuntimeValidation):null;}
  Object.assign(namespace.api,{runExternalIntelligencePhase7PcRealRuntimeValidation,getLatestExternalIntelligencePhase7PcRealRuntimeValidation});Object.assign(namespace,namespace.api);
  namespace.modules.phase7RealRuntimeValidation={id:"EXTERNAL-010-PHASE7-PC-REAL-RUNTIME-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:7,decisions:["009","022","026","027"],gatewayChangeRequired:false,loadedAt:internal.nowIso()};
  global.runExternalIntelligencePhase7PcRealRuntimeValidation=runExternalIntelligencePhase7PcRealRuntimeValidation;
})(typeof window!=="undefined"?window:globalThis);
