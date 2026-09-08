/* ============================================================
   FILE: 17_external_intelligence_phase8_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.7.2 / Gateway 1.4.0 compatibility
   Phase 08 PC Real Runtime Validation
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL010ExternalIntelligence,VERSION_MANIFEST=global.EXTERNAL010VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST){console.warn("EXTERNAL-010 Phase 08 PC validation blocked: dependencies missing.");return;}
  const internal=namespace.__internal,state=internal.state,MODULE_VERSION=VERSION_MANIFEST.getModuleVersion("phase8RealRuntimeValidation");
  function collector(){const checks=[];return{checks,check(name,passed,detail,group,severity){checks.push({name,passed:passed===true,detail:detail==null?"":(typeof detail==="string"?detail:internal.stableStringify(detail)),group:group||"PC Real Runtime",severity:severity||"Critical"});}};}
  function summarize(checks){const passed=checks.filter(x=>x.passed).length,failed=checks.length-passed,criticalFailed=checks.filter(x=>!x.passed&&x.severity==="Critical").length;return{passed,failed,total:checks.length,criticalFailed,health:checks.length?Math.round(passed/checks.length*1000)/10:0};}
  async function runExternalIntelligencePhase8PcRealRuntimeValidation(){
    const c=collector(),check=c.check;let regression=null;
    try{
      const ua=global.navigator&&global.navigator.userAgent||"";
      check("Release Version is Phase 08 compatible or later",VERSION_MANIFEST.isReleaseCompatibleFrom("1.7.0"),VERSION_MANIFEST.release.version,"Foundation");
      check("Gateway remains compatible at 1.4.0 without Phase 08 changes",VERSION_MANIFEST.gateway.gatewayVersion==="1.4.0",VERSION_MANIFEST.gateway.gatewayVersion,"Boundary");
      check("Runtime is not Android",!/Android/i.test(ua),ua,"PC Environment");
      check("Application document is loaded",Boolean(global.document&&global.document.readyState),global.document&&global.document.readyState,"PC Environment");
      check("Web Crypto SHA-256 is available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.crypto.subtle.digest==="function"),Boolean(global.crypto&&global.crypto.subtle),"PC Environment");
      const init=await namespace.initializeExternalIntelligenceFoundation();check("Phase 08 foundation initializes on PC runtime",init&&init.ok===true,init&&init.code,"Initialization");
      regression=await namespace.runExternalIntelligencePhase8Validation();check("Phase 08 regression remains PASS on PC runtime",regression.failed===0&&regression.health===100&&regression.phase8Complete===true,{passed:regression.passed,failed:regression.failed,total:regression.total},"Regression");
      check("PC runtime contains Stable Analytical Capabilities",state.analyticalCapabilities.size>=3,state.analyticalCapabilities.size,"Capability Registry");
      check("PC runtime retains versioned Capability history",state.analyticalCapabilityVersions.size>=4,state.analyticalCapabilityVersions.size,"Capability Versioning");
      check("PC runtime contains Routing Candidates without automatic winner",state.capabilityRoutingCandidates.size>=2&&Array.from(state.capabilityRoutingCandidates.values()).every(r=>r.automaticWinnerSelected===false),state.capabilityRoutingCandidates.size,"Routing");
      check("PC runtime contains independent Review / Shadow records",state.independentReviewPlans.size>=1&&state.shadowEvaluationRecords.size>=1,{reviewPlans:state.independentReviewPlans.size,shadow:state.shadowEvaluationRecords.size},"Review");
      check("PC runtime contains Snapshot / Transformation / Lineage records",state.snapshotManifests.size>=1&&state.transformationRecords.size>=1&&state.lineageRecords.size>=3,{snapshots:state.snapshotManifests.size,transformations:state.transformationRecords.size,lineage:state.lineageRecords.size},"Lineage");
      const trace=namespace.traceExternalIntelligenceReverseProvenance("INTELLIGENCE-PHASE8-PACKAGE",8);check("PC reverse provenance query reaches original Claim input",trace.references.some(r=>r.referenceId==="CLAIM-PHASE8-INPUT"),trace,"Lineage Query");
      check("Phase 08 grants no Repository / Knowledge / Action authority",VERSION_MANIFEST.safety.directRepositoryMutationAllowed===false&&VERSION_MANIFEST.safety.automaticKnowledgePromotionAllowed===false&&VERSION_MANIFEST.safety.highModelPerformanceGrantsActionAuthority===false&&VERSION_MANIFEST.safety.capabilityRoutingGrantsBusinessAuthority===false,VERSION_MANIFEST.safety,"Authority Boundary");
      const audit=await namespace.verifyExternalIntelligenceAuditChain();check("Audit chain remains valid on PC runtime",audit.valid===true,{eventCount:audit.eventCount,valid:audit.valid},"Audit");
    }catch(error){check("Phase 08 PC validation completes without exception",false,{message:error&&error.message||String(error),stack:error&&error.stack||null},"Validation");}
    const s=summarize(c.checks),gate=s.failed===0&&s.criticalFailed===0;
    const result={id:internal.nextId("EXTERNAL-010-PHASE8-PC-REAL-RUNTIME"),componentId:"EXTERNAL-010",version:VERSION_MANIFEST.release.version,gatewayVersion:VERSION_MANIFEST.gateway.gatewayVersion,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:s.passed,failed:s.failed,total:s.total,health:s.health,criticalFailed:s.criticalFailed,status:gate?"EXTERNAL-010 Phase 08 PC Real Runtime Validation PASS":"EXTERNAL-010 Phase 08 PC Real Runtime Validation FAIL",releaseAllowed:gate,phase8PcRealRuntimeComplete:gate,pcRealRuntimeValidation:{passed:gate,userAgent:global.navigator&&global.navigator.userAgent||"",phase8RegressionPassed:Boolean(regression&&regression.failed===0),gatewayChangeRequired:false,validatedAt:internal.nowIso()},regression:regression?{passed:regression.passed,failed:regression.failed,total:regression.total,health:regression.health,criticalFailed:regression.criticalFailed,status:regression.status}:null,checks:c.checks,validatedAt:internal.nowIso()};
    state.latestPhase8RealRuntimeValidation=internal.deepFreeze(internal.clone(result));namespace.modules.phase8RealRuntimeValidation.status=gate?"Passed":"Failed";internal.touch();return internal.clone(result);
  }
  function getLatestExternalIntelligencePhase8PcRealRuntimeValidation(){return state.latestPhase8RealRuntimeValidation?internal.clone(state.latestPhase8RealRuntimeValidation):null;}
  Object.assign(namespace.api,{runExternalIntelligencePhase8PcRealRuntimeValidation,getLatestExternalIntelligencePhase8PcRealRuntimeValidation});Object.assign(namespace,namespace.api);
  namespace.modules.phase8RealRuntimeValidation={id:"EXTERNAL-010-PHASE8-PC-REAL-RUNTIME-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:8,decisions:["036","037"],gatewayChangeRequired:false,loadedAt:internal.nowIso()};
  global.runExternalIntelligencePhase8PcRealRuntimeValidation=runExternalIntelligencePhase8PcRealRuntimeValidation;
})(typeof window!=="undefined"?window:globalThis);
