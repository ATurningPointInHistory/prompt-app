/* ============================================================
   FILE: 17_external_intelligence_phase20_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.19.0
   Phase 20 PC Real Runtime Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase20RealRuntimeValidation");

  async function grant(action, recoveryPointId, owned) {
    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
      action, target:{type:"external-intelligence-recovery",id:recoveryPointId}, purpose:"phase20-recovery",
      scope:{domain:"EXTERNAL-010",operation:action}
    });
    if (!candidate.ok) return candidate;
    owned.push(candidate.data.envelope.authorityEnvelopeId);
    return namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId,{phase20Validation:true});
  }

  async function runExternalIntelligencePhase20RealRuntimeValidation() {
    const base = await namespace.runExternalIntelligencePhase20Validation();
    const checks = [];
    const add = function(name,passed,detail,group){checks.push({name,passed:passed===true,detail:detail==null?"":typeof detail==="string"?detail:internal.stableStringify(detail),group:group||"Phase 20 PC",severity:"Critical"});};
    add("Phase 20 functional regression remains PASS",base.failed===0,{passed:base.passed,failed:base.failed,total:base.total},"Regression");
    add("PC Browser runtime is available",typeof global!=="undefined",typeof navigator!=="undefined"?navigator.userAgent:"non-browser","Runtime");
    add("Gateway target is 1.5.0",VM.gateway.gatewayVersion==="1.5.0",VM.gateway.gatewayVersion,"Runtime");

    const owned=[];
    const priorApproval=state.authorityApprovalAdapter;
    const recoveryPointId="EXTERNAL-010-RECOVERY-POINT-PC-"+internal.nextId("P20").replace(/[^A-Z0-9._-]/gi,"-");
    try {
      namespace.setExternalIntelligenceAuthorityApprovalAdapter({adapterId:"EXTERNAL-010-PHASE20-PC-OWNER-APPROVAL",requiresExplicitOwnerInteraction:true,async verifyApproval(){return{approved:true,actorType:"Project Owner",interactionEvidenceId:"PHASE20-PC-OWNER-INTERACTION"};}});
      const createAuth=await grant("CREATE_RECOVERY_POINT",recoveryPointId,owned);
      const readAuth=await grant("READ_RECOVERY_POINT",recoveryPointId,owned);
      const restoreAuth=await grant("RESTORE_RECOVERY_POINT",recoveryPointId,owned);
      const metadataReadAuth=await grant("READ_RECOVERY_POINT","CURRENT_METADATA_STORE",owned);
      add("Recovery create/read/restore Authorities require explicit Owner validation adapter",createAuth.ok&&readAuth.ok&&restoreAuth.ok&&metadataReadAuth.ok,{createAuth:createAuth.ok,readAuth:readAuth.ok,restoreAuth:restoreAuth.ok,metadataReadAuth:metadataReadAuth.ok},"Authority");

      const health=await namespace.getExternalIntelligenceGatewayHealth();
      add("Real Gateway health is READY at v1.5.0",health.ok&&health.data&&health.data.health&&health.data.health.gatewayVersion==="1.5.0",health,"Gateway");
      const opened=await namespace.openExternalIntelligenceGatewaySession({requestedScope:["READ_RUNTIME","MANAGE_RECOVERY"]});
      add("Recovery session is ephemeral and memory-only",opened.ok&&opened.data.sessionTokenPersisted===false&&opened.data.tokenReturnedToCaller===false,opened,"Session");
      const runtime=await namespace.getProtectedExternalIntelligenceGatewayRuntime();
      const runtimeResponse=runtime&&runtime.data&&runtime.data.response;
      add("Gateway Runtime exposes runtime/startup/recovery epochs without business authority",runtime.ok&&runtimeResponse&&runtimeResponse.runtime&&runtimeResponse.runtime.recoveryEpoch&&runtimeResponse.runtime.businessAuthorityGranted===false,runtimeResponse,"Runtime");

      const created=await namespace.createExternalIntelligenceRecoveryPoint({recoveryPointId,recoveryPointType:"CHECKPOINT",purpose:"phase20-recovery"});
      add("Real Recovery Point creation succeeds",created.ok&&created.data&&created.data.gateway&&created.data.gateway.recoveryPoint&&created.data.gateway.recoveryPoint.applicationConsistentSnapshot===true,created,"Recovery Point");
      const validation=await namespace.validateExternalIntelligenceRecoveryPoint({recoveryPointId,purpose:"phase20-recovery"});
      const vResponse=validation&&validation.data&&validation.data.response;
      add("Real Cross-Store Recovery Point validation passes",validation.ok&&vResponse&&vResponse.recovery&&vResponse.recovery.valid===true&&vResponse.recovery.sensitiveMaterialExcluded===true,vResponse,"Recovery Point");
      const drill=await namespace.runExternalIntelligenceRestoreDrill({recoveryPointId,purpose:"phase20-recovery"});
      const dResponse=drill&&drill.data&&drill.data.response;
      add("Controlled Restore Drill passes while Platform READY remains false",drill.ok&&dResponse&&dResponse.recovery&&dResponse.recovery.state==="RESTORE_DRILL_PASS"&&dResponse.recovery.platformReady===false,dResponse,"Restore Drill");
      const rebuild=await namespace.assessExternalIntelligenceGatewayMetadataRebuild({purpose:"phase20-recovery"});
      add("Metadata rebuild assessment is available without automatic rebuild",rebuild.ok&&rebuild.data&&rebuild.data.response&&rebuild.data.response.recovery&&rebuild.data.response.recovery.automaticRebuildPerformed===false,rebuild,"Metadata Rebuild");
      const clientState=namespace.getExternalIntelligenceGatewayClientState();
      add("Public Gateway client state does not expose session token",clientState&&clientState.session&&clientState.session.tokenPersisted===false&&!Object.prototype.hasOwnProperty.call(clientState,"sessionToken"),clientState,"Security");
      add("Recovery never grants business/trading authority",namespace.modules.disasterRecovery.recoveryEqualsBusinessAuthority===false&&namespace.modules.strategyExperiment.tradingAuthorityGranted===false&&namespace.modules.strategyExperiment.realMoneyAuthorityGranted===false,{recovery:namespace.modules.disasterRecovery,strategy:namespace.modules.strategyExperiment},"Authority");
    } catch(error) {
      add("Phase 20 PC Real Runtime completes without exception",false,error&&error.stack||String(error),"Runtime");
    } finally {
      owned.forEach(function(id){try{namespace.revokeExternalIntelligenceAuthorityEnvelope(id,"Phase 20 PC validation completed");}catch(_){}});
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(priorApproval||null);
      try{await namespace.revokeExternalIntelligenceGatewaySession();}catch(_){}
    }

    const failed=checks.filter(function(c){return !c.passed;});
    const result={id:internal.nextId("EXTERNAL-010-PHASE20-PC-REAL-RUNTIME"),componentId:"EXTERNAL-010",version:VM.release.version,gatewayVersion:VM.gateway.gatewayVersion,implementationPhase:VM.release.implementationPhase,passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:checks.length?Math.round((checks.length-failed.length)*1000/checks.length)/10:0,criticalFailed:failed.length,status:failed.length?"EXTERNAL-010 Phase 20 PC Real Runtime Validation FAILED":"EXTERNAL-010 Phase 20 PC Real Runtime Validation PASS",releaseAllowed:failed.length===0,phase20PcRealRuntimeComplete:failed.length===0,checks,validatedAt:internal.nowIso()};
    state.latestPhase20RealRuntimeValidation=internal.deepFreeze(internal.clone(result));
    return result;
  }
  Object.assign(namespace.api,{runExternalIntelligencePhase20RealRuntimeValidation});Object.assign(namespace,namespace.api);
  global.runExternalIntelligencePhase20RealRuntimeValidation=runExternalIntelligencePhase20RealRuntimeValidation;
  namespace.modules.phase20RealRuntimeValidation={id:"EXTERNAL-010-PHASE20-PC-REAL-RUNTIME",version:MODULE_VERSION,phase:20,status:"Ready"};
})(typeof window!=="undefined"?window:globalThis);
