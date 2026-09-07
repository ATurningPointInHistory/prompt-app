/* ============================================================
   FILE: 17_external_intelligence_phase5_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 05 Android Real Device Validation
   Browser Direct Evidence Candidate + Local Persistence Fail-Closed
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 05 Android validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase5AndroidValidation");
  const PURPOSE = "phase5-android-real-device";

  function collector(){ const checks=[]; return {checks,check(name,passed,detail,group,severity){checks.push({name,passed:passed===true,detail:detail==null?"":(typeof detail==="string"?detail:internal.stableStringify(detail)),group:group||"Android Real Device",severity:severity||"Critical"});}}; }
  function summarize(checks){const passed=checks.filter(x=>x.passed).length;const failed=checks.length-passed;const criticalFailed=checks.filter(x=>!x.passed&&x.severity==="Critical").length;return{passed,failed,total:checks.length,criticalFailed,health:checks.length?Math.round((passed/checks.length)*1000)/10:0};}
  function newestBrowserSuccessResponse(){
    const adapterId=VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson;
    const values=Array.from(state.acquisitionResponses.values()).filter(r=>r&&r.status==="SUCCESS"&&r.evidenceInput&&r.evidenceInput.adapterId===adapterId);
    values.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    return values[0]?internal.clone(values[0]):null;
  }

  async function runExternalIntelligencePhase5AndroidValidation(){
    const c=collector(); const check=c.check;
    let p5=null; let p4Android=null; let candidate=null; let blockedPersistence=null;
    try {
      const ua=global.navigator&&global.navigator.userAgent||"";
      check("Release Version is 1.4.0",VERSION_MANIFEST.release.version==="1.4.0",VERSION_MANIFEST.release.version,"Foundation");
      check("Gateway compatibility version is 1.3.0",VERSION_MANIFEST.gateway.gatewayVersion==="1.3.0",VERSION_MANIFEST.gateway.gatewayVersion,"Foundation");
      check("Android real-device environment is detected",/Android/i.test(ua),ua,"Android Environment");
      check("Fetch API remains available",typeof global.fetch==="function",typeof global.fetch,"Android Environment");
      check("Web Crypto SHA-256 remains available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.crypto.subtle.digest==="function"),Boolean(global.crypto&&global.crypto.subtle),"Android Environment");

      const init=await namespace.initializeExternalIntelligenceFoundation();
      check("Phase 05 foundation initializes on Android",init&&init.ok===true,init&&init.code,"Foundation");
      p5=await namespace.runExternalIntelligencePhase5Validation();
      check("Phase 05 regression remains PASS on Android",p5.failed===0&&p5.health===100&&p5.phase5Complete===true,{passed:p5.passed,failed:p5.failed,total:p5.total},"Regression");

      p4Android=await namespace.runExternalIntelligencePhase4AndroidValidation();
      check("Phase 04 Android real-device regression remains PASS",p4Android.failed===0&&p4Android.health===100&&p4Android.phase4AndroidRealDeviceComplete===true,{passed:p4Android.passed,failed:p4Android.failed,total:p4Android.total},"Regression");
      check("Android Browser Direct real HTTP remains verified",Boolean(p4Android.androidRealDeviceValidation&&p4Android.androidRealDeviceValidation.browserDirectRealHttp===true),p4Android.androidRealDeviceValidation,"Browser Direct");
      check("Android Gateway-unavailable route remains fail-closed",Boolean(p4Android.androidRealDeviceValidation&&p4Android.androidRealDeviceValidation.gatewayUnavailableFailClosed===true),p4Android.androidRealDeviceValidation,"Gateway Boundary");
      check("Static Manifest integrity remains verified on Android",Boolean(p4Android.androidRealDeviceValidation&&p4Android.androidRealDeviceValidation.staticIntegrityPassed===true&&p4Android.staticManifest&&p4Android.staticManifest.scriptCount>=304),p4Android.staticManifest,"Static Integrity");

      const response=newestBrowserSuccessResponse();
      check("Real Android Browser Direct response is available as Evidence input",Boolean(response&&response.evidenceInput&&response.evidenceInput.adapterId===VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson),response&&{responseId:response.responseId,adapterId:response.evidenceInput.adapterId,sourceId:response.evidenceInput.sourceId},"Evidence Input");
      candidate=response?await namespace.buildExternalIntelligenceEvidenceCandidate({response}):null;
      check("Android real HTTP response produces immutable Evidence candidate",Boolean(candidate&&candidate.ok===true&&candidate.data.acquisitionEvidence.immutable===true&&candidate.data.rawEvidence.immutable===true),candidate&&(candidate.data||candidate.code),"Evidence Candidate");
      check("Evidence identity is distinct from request/content/source identity",Boolean(candidate&&candidate.ok===true&&candidate.data.acquisitionEvidence.evidenceId!==candidate.data.acquisitionEvidence.requestId&&candidate.data.acquisitionEvidence.evidenceId!==candidate.data.acquisitionEvidence.contentHash&&candidate.data.acquisitionEvidence.evidenceId!==candidate.data.acquisitionEvidence.sourceId),candidate&&candidate.data.acquisitionEvidence,"Evidence Identity");
      check("Android Evidence candidate retains full governed lineage",Boolean(candidate&&candidate.ok===true&&candidate.data.acquisitionEvidence.requestId&&candidate.data.acquisitionEvidence.attemptId&&candidate.data.acquisitionEvidence.routeId&&candidate.data.acquisitionEvidence.adapterId&&candidate.data.acquisitionEvidence.accessMode==="BROWSER_DIRECT"),candidate&&candidate.data.acquisitionEvidence,"Lineage");
      check("Raw content is referenced by hash and not embedded in Evidence metadata",Boolean(candidate&&candidate.ok===true&&/^[a-f0-9]{64}$/.test(candidate.data.acquisitionEvidence.contentHash)&&!Object.prototype.hasOwnProperty.call(candidate.data.acquisitionEvidence,"rawText")&&!Object.prototype.hasOwnProperty.call(candidate.data.rawEvidence,"rawText")),candidate&&{evidence:candidate.data.acquisitionEvidence,rawEvidence:candidate.data.rawEvidence},"Storage Boundary");

      namespace.setExternalIntelligenceEvidencePersistenceAdapter(null);
      const before=namespace.getExternalIntelligenceEvidencePersistenceState();
      blockedPersistence=response?await namespace.persistExternalIntelligenceAcquisitionEvidence({response,purpose:PURPOSE}):null;
      const after=namespace.getExternalIntelligenceEvidencePersistenceState();
      check("Android does not silently persist Evidence when Local Gateway writer is unavailable",Boolean(blockedPersistence&&blockedPersistence.ok===false&&blockedPersistence.code==="EXTERNAL010_EVIDENCE_PERSISTENCE_ADAPTER_UNAVAILABLE"),blockedPersistence&&(blockedPersistence.data||blockedPersistence.code),"Persistence Fail-Closed");
      check("Failed Android persistence creates no local Evidence metadata",after.acquisitionEvidenceCount===before.acquisitionEvidenceCount&&after.rawEvidenceCount===before.rawEvidenceCount&&after.uniqueContentCount===before.uniqueContentCount,{before,after},"Persistence Fail-Closed");
      check("Phase 05 persistence requires Local Gateway single writer",VERSION_MANIFEST.persistence.localGatewayWriterRequired===true&&VERSION_MANIFEST.persistence.metadataIndex==="SQLITE",VERSION_MANIFEST.persistence,"Storage Architecture");
      check("Browser Direct persistent store is explicitly disabled",VERSION_MANIFEST.persistence.browserDirectPersistentStoreAllowed===false&&VERSION_MANIFEST.persistence.androidLocalSqlitePersistenceAvailable===false,VERSION_MANIFEST.persistence,"Storage Architecture");
      check("Project ZIP still excludes bulk external evidence by default",VERSION_MANIFEST.persistence.projectZipAutoIncludesBulkEvidence===false,VERSION_MANIFEST.persistence,"Storage Boundary");
      check("Android cannot rewrite Raw Evidence or auto-delete orphan content",VERSION_MANIFEST.safety.rawEvidenceOverwriteAllowed===false&&VERSION_MANIFEST.safety.orphanContentAutomaticDeletionAllowed===false,VERSION_MANIFEST.safety,"Safety");
      check("Evidence persistence grants no Knowledge/Repository/financial authority",VERSION_MANIFEST.safety.evidencePersistenceGrantsKnowledgeAuthority===false&&VERSION_MANIFEST.safety.directRepositoryMutationAllowed===false&&VERSION_MANIFEST.safety.automaticPaidApiActivationAllowed===false&&VERSION_MANIFEST.safety.automaticTradeExecutionAllowed===false,VERSION_MANIFEST.safety,"Safety");
      const audit=await namespace.verifyExternalIntelligenceAuditChain();
      check("EXTERNAL-010 audit chain remains valid after Phase 05 Android validation",audit.valid===true,{valid:audit.valid,eventCount:audit.eventCount},"Audit");
    } catch(error) {
      check("Phase 05 Android validation completes without exception",false,{message:error&&error.message||String(error),stack:error&&error.stack||null},"Validation");
    } finally {
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
      namespace.setExternalIntelligenceEvidencePersistenceAdapter(null);
    }

    const s=summarize(c.checks); const gate=s.failed===0&&s.criticalFailed===0;
    const result={
      id:internal.nextId("EXTERNAL-010-PHASE5-ANDROID-REAL-DEVICE"),componentId:"EXTERNAL-010",version:VERSION_MANIFEST.release.version,gatewayVersion:VERSION_MANIFEST.gateway.gatewayVersion,implementationPhase:VERSION_MANIFEST.release.implementationPhase,
      passed:s.passed,failed:s.failed,total:s.total,health:s.health,criticalFailed:s.criticalFailed,status:gate?"EXTERNAL-010 Phase 05 Android Real Device Validation PASS":"EXTERNAL-010 Phase 05 Android Real Device Validation FAIL",releaseAllowed:gate,
      phase5AndroidRealDeviceComplete:gate,phase5FinalGateReady:gate,
      androidRealDeviceValidation:{passed:gate,userAgent:global.navigator&&global.navigator.userAgent||"",browserDirectEvidenceCandidate:Boolean(candidate&&candidate.ok===true),localPersistenceFailClosed:Boolean(blockedPersistence&&blockedPersistence.ok===false),staticIntegrityPassed:Boolean(p4Android&&p4Android.androidRealDeviceValidation&&p4Android.androidRealDeviceValidation.staticIntegrityPassed===true),phase5RegressionPassed:Boolean(p5&&p5.failed===0),validatedAt:internal.nowIso()},
      staticManifest:p4Android&&p4Android.staticManifest?internal.clone(p4Android.staticManifest):null,
      regression:p5?{passed:p5.passed,failed:p5.failed,total:p5.total,health:p5.health,criticalFailed:p5.criticalFailed,status:p5.status}:null,
      checks:c.checks,validatedAt:internal.nowIso()
    };
    state.latestPhase5AndroidValidation=internal.deepFreeze(internal.clone(result)); namespace.modules.phase5AndroidValidation.status=gate?"Passed":"Failed"; internal.touch(); return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase5AndroidValidation(){return state.latestPhase5AndroidValidation?internal.clone(state.latestPhase5AndroidValidation):null;}
  Object.assign(namespace.api,{runExternalIntelligencePhase5AndroidValidation,getLatestExternalIntelligencePhase5AndroidValidation});Object.assign(namespace,namespace.api);
  namespace.modules.phase5AndroidValidation={id:"EXTERNAL-010-PHASE5-ANDROID-REAL-DEVICE-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:5,decisions:["005","006","008","014"],localGatewayWriterRequired:true,browserPersistenceFallbackAllowed:false,loadedAt:internal.nowIso()};
  global.runExternalIntelligencePhase5AndroidValidation=runExternalIntelligencePhase5AndroidValidation;
})(typeof window!=="undefined"?window:globalThis);
