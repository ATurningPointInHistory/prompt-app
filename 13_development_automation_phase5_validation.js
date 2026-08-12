/* ============================================================
   FILE: 13_development_automation_phase5_validation.js
   IDE-190 Development Automation
   Release: 1.4.0 / Module: Phase 5 Validation 1.0.0
   Phase 5: IDE-160 Controlled Dispatch
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 Phase 5 validation blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase5Validation");
  const EXPECTED_PHASE5_SCRIPT_FILES = ["13_development_automation_dispatch.js", "13_development_automation_phase5_validation.js"];

  function collector(){const checks=[];return{checks:checks,check:function(name,passed,detail,group,severity){checks.push({name:name,passed:passed===true,detail:detail==null?"":String(detail),group:group||"General",severity:severity||"Critical"});}};}
  function summarize(checks,idPrefix,passStatus,failStatus,extras){const passed=checks.filter(function(i){return i.passed;}).length;const failed=checks.length-passed;const criticalFailed=checks.filter(function(i){return !i.passed&&i.severity==="Critical";}).length;return Object.assign({id:internal.nextId(idPrefix),componentId:"IDE-190",version:VERSION_MANIFEST.release.version,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:passed,failed:failed,total:checks.length,health:checks.length?Number(((passed/checks.length)*100).toFixed(2)):0,criticalFailed:criticalFailed,status:failed===0?passStatus:failStatus,checks:checks,validatedAt:internal.nowIso()},extras||{});}
  function getLoadedScriptPaths(){if(!global.document||!global.document.scripts)return[];return Array.from(global.document.scripts).map(function(script){const src=String(script&&script.src||"");if(!src)return"";try{return new URL(src,global.document.baseURI).pathname.split("/").pop()||"";}catch(_){return src.split("?")[0].split("#")[0].split("/").pop()||"";}}).filter(Boolean);}

  async function buildFlow(grounding, spec){
    const plan=await namespace.createAutomationPlan({groundingId:grounding.groundingId,objective:spec.objective,operation:{operationType:spec.operationType,capabilityId:spec.capabilityId,target:grounding.canonicalTarget,scope:spec.scope||{type:"canonical-target",canonicalId:grounding.canonicalTarget&&grounding.canonicalTarget.canonicalId||null},parameters:spec.parameters||{}},automationLevel:spec.automationLevel,mutationLevel:spec.mutationLevel,requestedExecutionMode:spec.executionMode,externalEffectLevel:spec.externalEffectLevel||"X0",repositoryBaseline:spec.repositoryBaseline||null});
    const proposal=plan&&plan.ok?await namespace.createAutomationProposal({planId:plan.data.plan.planId,summary:spec.objective}):null;
    const dryRun=proposal&&proposal.ok?await namespace.runAutomationDryRun({proposalId:proposal.data.proposal.proposalId}):null;
    const preflight=dryRun&&dryRun.ok?await namespace.runAutomationPreflight({dryRunId:dryRun.data.dryRun.dryRunId}):null;
    let approvalRequest=null,approval=null,gate=null;
    if(preflight&&preflight.ok){
      const pre=preflight.data.preflight;
      if(pre.approvalClassRequired==="P0") gate=await namespace.evaluateAuthorizationGate({preflightId:pre.preflightId});
      else {
        approvalRequest=await namespace.requestAutomationApproval({preflightId:pre.preflightId,expiresInMs:60000});
        if(approvalRequest&&approvalRequest.ok){
          approval=namespace.grantAutomationApproval({approvalRequestId:approvalRequest.data.request.approvalRequestId,actor:"Phase 5 Validator",actorRole:pre.approvalClassRequired==="P2"?"Project Owner":"Validator",reason:"Phase 5 deterministic controlled dispatch validation",explicitApproval:true});
          if(approval&&approval.ok) gate=await namespace.evaluateAuthorizationGate({preflightId:pre.preflightId,approvalId:approval.data.approval.approvalId});
        }
      }
    }
    return {planResult:plan,plan:plan&&plan.data&&plan.data.plan||null,proposal:proposal&&proposal.data&&proposal.data.proposal||null,dryRun:dryRun&&dryRun.data&&dryRun.data.dryRun||null,preflight:preflight&&preflight.data&&preflight.data.preflight||null,approvalRequest:approvalRequest&&approvalRequest.data&&approvalRequest.data.request||null,approval:approval&&approval.data&&approval.data.approval||null,gateResult:gate,gate:gate&&gate.data&&gate.data.gate||null};
  }

  async function runDevelopmentAutomationPhase5Validation(){
    const c=collector(),checks=c.checks,check=c.check;
    const init=namespace.initialize({requireIDE180:true,requireIDE160:true});
    check("Foundation initialization succeeds",init&&init.ok===true,init&&init.code,"Initialization","Critical");
    check("Release Version is 1.4.0",VERSION_MANIFEST.release.version==="1.4.0",VERSION_MANIFEST.release.version,"Manifest","Critical");
    check("Implementation Phase is Phase 5",VERSION_MANIFEST.implementation.phase===5,VERSION_MANIFEST.release.implementationPhase,"Manifest","Critical");
    check("Design Freeze remains exact",VERSION_MANIFEST.release.designFreezeId==="IDE-190-DESIGN-FREEZE-1.0.0",VERSION_MANIFEST.release.designFreezeId,"Manifest","Critical");
    check("Phases 1 through 4 are recorded complete",JSON.stringify(VERSION_MANIFEST.implementation.completedPhases)===JSON.stringify([1,2,3,4]),VERSION_MANIFEST.implementation.completedPhases,"Phase Gate","Critical");
    Object.keys(VERSION_MANIFEST.safety).forEach(function(key){check("Safety flag remains disabled: "+key,VERSION_MANIFEST.safety[key]===false,VERSION_MANIFEST.safety[key],"Safety","Critical");});
    const dependency=namespace.getDependencyStatus();
    check("IDE-160 Adapter Registry API is available",dependency.ide160AdapterRegistryApiAvailable===true,dependency.ide160AdapterRegistryApiAvailable,"IDE-160 Dependency","Critical");
    check("IDE-160 Adapter Invocation API is available",dependency.ide160AdapterInvocationApiAvailable===true,dependency.ide160AdapterInvocationApiAvailable,"IDE-160 Dependency","Critical");
    check("IDE-150 Adapter remains registered in IDE-160",dependency.ide150AdapterRegisteredInIDE160===true,dependency.ide150AdapterRegisteredInIDE160,"IDE-160 Dependency","Critical");
    check("IDE-150 Adapter remains Controlled Mutation classified",dependency.ide150ControlledMutationAdapter===true,dependency.ide150ControlledMutationAdapter,"IDE-160 Dependency","Critical");

    const requiredContracts=["foundation","foundationState","capabilityDescriptor","platformProfile","navigationIntake","groundingContext","automationPlan","automationProposal","dryRunRecord","preflightRecord","authorizationGate","approvalRequest","approvalRecord","consentRecord","dispatchRequest","executionResult"];
    check("All Phase 1-5 contracts are registered",requiredContracts.every(function(key){return Boolean(namespace.getContractDefinition(key));}),namespace.listContractDefinitions().length,"Contracts","Critical");
    ["dispatchRequest","executionResult"].forEach(function(key){const d=namespace.getContractDefinition(key);check("Phase 5 contract exists: "+key,Boolean(d&&d.version==="1.0.0"&&d.readOnly===true),d&&d.version,"Contracts","Critical");});
    check("Dispatch module is Ready",namespace.modules.dispatch&&namespace.modules.dispatch.status==="Ready",namespace.modules.dispatch&&namespace.modules.dispatch.status,"Modules","Critical");
    check("Phase 5 Validation module is loaded",Boolean(namespace.modules.phase5Validation),namespace.modules.phase5Validation&&namespace.modules.phase5Validation.status,"Modules","Critical");
    const api=namespace.getPublicApiDescription();
    check("Dispatch is implemented",api.dispatchImplemented===true,api.dispatchImplemented,"Scope","Critical");
    check("Mutation is still not implemented in IDE-190",api.mutationImplemented===false,api.mutationImplemented,"Scope","Critical");
    check("Persistence is still not implemented",api.persistenceImplemented===false,api.persistenceImplemented,"Scope","Critical");
    check("Phase 6 Mutation Trial execution remains disabled",namespace.modules.dispatch.phase6MutationTrialExecutionAllowed===false,namespace.modules.dispatch.phase6MutationTrialExecutionAllowed,"Mutation Boundary","Critical");
    check("Direct IDE-150 calls remain prohibited",namespace.modules.dispatch.directIDE150CallAllowed===false,namespace.modules.dispatch.directIDE150CallAllowed,"Dispatch Boundary","Critical");

    const grounded=await namespace.intakeAndGroundLatestIDE180Navigation();
    const grounding=grounded&&grounded.ok&&grounded.data&&grounded.data.grounding||null;
    check("V0 Grounding is available",Boolean(grounding&&grounding.groundingStatus==="Grounded"),grounding&&grounding.groundingStatus,"Grounding","Critical");

    const flow=grounding?await buildFlow(grounding,{objective:"Phase 5 IDE-160 Adapter Registry read-only dispatch fixture",operationType:"Get Status",capabilityId:"IDE-150-CONTROLLED-MUTATION",automationLevel:"L2",mutationLevel:"M0",executionMode:"E0",parameters:{targetComponentId:"IDE-150",adapterId:"IDE-160-ADAPTER-IDE-150",adapterOperation:"Get Status",adapterInput:{}}}):{};
    check("V4 Gate passes before Dispatch",Boolean(flow.gate&&flow.gate.gateStatus==="Passed"&&flow.gate.dispatchEligible===true),flow.gate&&flow.gate.gateStatus,"Gate Binding","Critical");
    const requestReady=flow.gate?await namespace.buildDispatchRequest({gateId:flow.gate.gateId}):null;
    const request=requestReady&&requestReady.data&&requestReady.data.request||null;
    check("Dispatch Request builds from passed V4 Gate",Boolean(requestReady&&requestReady.ok===true&&request),requestReady&&requestReady.code,"Dispatch Request","Critical");
    check("Dispatch Request is exact Gate-bound",Boolean(request&&request.gateId===flow.gate.gateId&&request.planHash===flow.gate.planHash&&request.contextHash===flow.gate.contextHash),request&&request.contextHash,"Gate Binding","Critical");
    check("Dispatch Request uses IDE-160 Adapter Registry",request&&request.dispatchMode==="IDE-160-Adapter-Registry",request&&request.dispatchMode,"IDE-160 Dispatch","Critical");
    check("Dispatch Request targets IDE-150 only through registered Adapter",Boolean(request&&request.targetComponentId==="IDE-150"&&request.adapterId==="IDE-160-ADAPTER-IDE-150"),request&&request.adapterId,"IDE-160 Dispatch","Critical");
    check("Dispatch Request never calls IDE-150 directly",request&&request.directIDE150Call===false,request&&request.directIDE150Call,"Dispatch Boundary","Critical");
    check("Dispatch Request writes zero Repository records",Boolean(request&&request.repositoryMutation===false&&request.repositoryWriteCount===0),request&&request.repositoryWriteCount,"Mutation Boundary","Critical");

    const dispatched=flow.gate?await namespace.dispatchAutomationFromGate({gateId:flow.gate.gateId}):null;
    const exec=dispatched&&dispatched.data&&dispatched.data.executionResult||null;
    check("Controlled Dispatch succeeds through IDE-160",Boolean(dispatched&&dispatched.ok===true&&exec&&exec.dispatchStatus==="Succeeded"),dispatched&&dispatched.code,"IDE-160 Dispatch","Critical");
    check("V5 Execution Result is produced",exec&&exec.validationLayer==="V5",exec&&exec.validationLayer,"V5 Execution Result","Critical");
    check("V5 proves IDE-160 invocation was used",exec&&exec.ide160InvocationUsed===true,exec&&exec.ide160InvocationUsed,"IDE-160 Dispatch","Critical");
    check("V5 records no direct IDE-150 call",exec&&exec.directIDE150Call===false,exec&&exec.directIDE150Call,"Dispatch Boundary","Critical");
    check("V5 executes no Mutation Trial",exec&&exec.phase6MutationTrialExecuted===false,exec&&exec.phase6MutationTrialExecuted,"Mutation Boundary","Critical");
    check("V5 writes zero Repository records",Boolean(exec&&exec.repositoryMutation===false&&exec.repositoryWriteCount===0&&exec.persistentCommit===false),exec&&exec.repositoryWriteCount,"Mutation Boundary","Critical");
    check("V5 requires later verification",exec&&exec.verificationRequired===true,exec&&exec.verificationRequired,"Verification Boundary","Critical");
    const gateState=flow.gate?namespace.getAutomationGateDispatchState(flow.gate.gateId):null;
    check("Gate Dispatch state is explicit",Boolean(gateState&&gateState.status==="Succeeded"&&gateState.executionResultId===exec.executionResultId),gateState&&gateState.status,"Single-Use","Critical");
    const reuse=flow.gate?await namespace.dispatchAutomationFromGate({gateId:flow.gate.gateId}):null;
    check("Passed Gate is Single-Use for Dispatch",reuse&&reuse.ok===false&&reuse.code==="IDE190_DISPATCH_GATE_ALREADY_USED",reuse&&reuse.code,"Single-Use","Critical");

    const ungated=grounding?await buildFlow(grounding,{objective:"Phase 5 ungated dispatch negative fixture",operationType:"Get Status",capabilityId:"IDE-150-CONTROLLED-MUTATION",automationLevel:"L2",mutationLevel:"M0",executionMode:"E0",parameters:{targetComponentId:"IDE-150",adapterOperation:"Get Status"}}):{};
    const notPassed=ungated.preflight?await namespace.buildDispatchRequest({gateId:"IDE-190-MISSING-GATE"}):null;
    check("Dispatch without V4 Gate is blocked",notPassed&&notPassed.ok===false&&notPassed.code==="IDE190_DISPATCH_GATE_REQUIRED",notPassed&&notPassed.code,"Negative","Critical");

    const noTarget=grounding?await buildFlow(grounding,{objective:"Phase 5 explicit target required fixture",operationType:"Get Status",capabilityId:"IDE-150-CONTROLLED-MUTATION",automationLevel:"L2",mutationLevel:"M0",executionMode:"E0",parameters:{}}):{};
    const noTargetRequest=noTarget.gate?await namespace.buildDispatchRequest({gateId:noTarget.gate.gateId}):null;
    check("Dispatch never infers missing target Component",noTargetRequest&&noTargetRequest.ok===false&&noTargetRequest.code==="IDE190_DISPATCH_EXPLICIT_TARGET_REQUIRED",noTargetRequest&&noTargetRequest.code,"No Inference","Critical");

    const baseline={repositoryBaselineId:"IDE-190-PHASE5-M2-BASELINE",repositoryHash:"phase5-baseline-hash"};
    const m2=grounding?await buildFlow(grounding,{objective:"Phase 5 must not execute IDE-150 Mutation Trial",operationType:"Execute Controlled Application",capabilityId:"IDE-150-CONTROLLED-MUTATION",automationLevel:"L4",mutationLevel:"M2",executionMode:"E1",repositoryBaseline:baseline,parameters:{targetComponentId:"IDE-150",adapterId:"IDE-160-ADAPTER-IDE-150",adapterOperation:"Execute Controlled Application",adapterInput:{sessionId:"PHASE6-ONLY",input:{execute:true}}}}):{};
    const m2Dispatch=m2.gate?await namespace.buildDispatchRequest({gateId:m2.gate.gateId}):null;
    check("IDE-150 Execute Controlled Application is blocked until Phase 6",m2Dispatch&&m2Dispatch.ok===false&&m2Dispatch.code==="IDE190_PHASE6_MUTATION_TRIAL_REQUIRED",m2Dispatch&&m2Dispatch.code,"Mutation Boundary","Critical");
    check("P2 Gate remains valid but does not itself execute Mutation",Boolean(m2.gate&&m2.gate.gateStatus==="Passed"&&m2.gate.repositoryMutation===false&&m2.gate.dispatchExecuted===false),m2.gate&&m2.gate.gateStatus,"Mutation Boundary","Critical");

    const unsafeRequest=request?Object.assign({},request,{directIDE150Call:true,repositoryWriteCount:1}):null;
    const unsafeRequestValidation=unsafeRequest?namespace.validateContract("dispatchRequest",unsafeRequest):null;
    check("Dispatch Contract rejects direct IDE-150 call / Repository write",unsafeRequestValidation&&unsafeRequestValidation.valid===false,unsafeRequestValidation&&unsafeRequestValidation.failed,"Negative Contract","Critical");
    const unsafeExec=exec?Object.assign({},exec,{phase6MutationTrialExecuted:true,persistentCommit:true}):null;
    const unsafeExecValidation=unsafeExec?namespace.validateContract("executionResult",unsafeExec):null;
    check("Execution Result Contract rejects Phase 6 Mutation / Persistent Commit",unsafeExecValidation&&unsafeExecValidation.valid===false,unsafeExecValidation&&unsafeExecValidation.failed,"Negative Contract","Critical");

    const dispatchSource=String(namespace.dispatchAutomationFromGate);
    check("Dispatch implementation references IDE-160 Adapter API",dispatchSource.includes("invokeIDE160ComponentAdapter"),dispatchSource.includes("invokeIDE160ComponentAdapter"),"Dispatch Boundary","Critical");
    check("Dispatch implementation contains no direct IDE-150 execution Global call",!dispatchSource.includes("executeControlledAutoRefactoringApplication("),dispatchSource.includes("executeControlledAutoRefactoringApplication("),"Dispatch Boundary","Critical");

    const result=summarize(checks,"IDE-190-PHASE5-STAGE-A-VALIDATION","IDE-190 Phase 5 Stage A IDE-160 Controlled Dispatch PASS","IDE-190 Phase 5 Stage A IDE-160 Controlled Dispatch FAIL",{stage:"A",stageName:"Phase 5 Deterministic / Pre-Android Validation",phase5Complete:false,phase6Allowed:false,androidRealDeviceRequired:true,androidRealDevicePassed:false,releaseAllowed:false,ide190Complete:false,latestDispatchRequestId:state.latestDispatchRequestId,latestExecutionResultId:state.latestExecutionResultId});
    internal.markPhase5Validation(result); namespace.modules.phase5Validation.status=result.failed===0?"Pre-Device Ready":"Blocked"; return internal.clone(result);
  }

  async function runDevelopmentAutomationPhase5AndroidValidation(){
    const preDevice=await runDevelopmentAutomationPhase5Validation(); const c=collector(),checks=c.checks,check=c.check;
    check("Phase 5 Stage A is PASS",preDevice.failed===0&&preDevice.criticalFailed===0,preDevice.status,"Stage A","Critical");
    const userAgent=global.navigator&&global.navigator.userAgent||"";
    check("Android real-device environment is detected",/Android/i.test(userAgent),userAgent,"Android Runtime","Critical");
    check("Web Crypto SHA-256 is available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.TextEncoder==="function"),Boolean(global.crypto&&global.crypto.subtle),"Android Runtime","Critical");
    check("IndexedDB is available",Boolean(global.indexedDB),Boolean(global.indexedDB),"Android Runtime","Critical");
    check("Fetch API is available",typeof global.fetch==="function",typeof global.fetch,"Android Runtime","Critical");
    const loaded=getLoadedScriptPaths(); EXPECTED_PHASE5_SCRIPT_FILES.forEach(function(file){check("Actual script loaded: "+file,loaded.includes(file),loaded.length,"Actual Script Loading","Critical");});
    let manifestLoad=null;if(typeof global.loadStaticScriptManifest==="function"){try{manifestLoad=await global.loadStaticScriptManifest();}catch(error){manifestLoad={ok:false,errors:[error&&error.message?error.message:String(error)]};}}
    check("Static Manifest loader API is available",typeof global.loadStaticScriptManifest==="function",typeof global.loadStaticScriptManifest,"Static Integrity","Critical");
    check("Static Manifest fetch/integrity succeeds",Boolean(manifestLoad&&manifestLoad.ok===true),manifestLoad&&manifestLoad.errors||[],"Static Integrity","Critical");
    if(manifestLoad&&manifestLoad.manifest){const normalized=(manifestLoad.manifest.scripts||[]).map(function(src){return String(src||"").split("?")[0].split("#")[0].replace(/^\.\//,"");});EXPECTED_PHASE5_SCRIPT_FILES.forEach(function(file){check("Static Manifest contains: "+file,normalized.includes(file),normalized.length,"Static Integrity","Critical");const hash=manifestLoad.manifest.hashes&&manifestLoad.manifest.hashes[file];check("Static Manifest has SHA-256: "+file,Boolean(hash&&/^[a-f0-9]{64}$/.test(String(hash.sha256||""))),hash&&hash.sha256,"Static Integrity","Critical");});}
    const latest=namespace.getLatestAutomationExecutionResult();
    check("Latest V5 Result used IDE-160 invocation",Boolean(latest&&latest.ide160InvocationUsed===true),latest&&latest.executionResultId,"IDE-160 Dispatch","Critical");
    check("Latest V5 Result made no direct IDE-150 call",Boolean(latest&&latest.directIDE150Call===false),latest&&latest.directIDE150Call,"Dispatch Boundary","Critical");
    check("Latest V5 Result executed no Mutation Trial",Boolean(latest&&latest.phase6MutationTrialExecuted===false),latest&&latest.phase6MutationTrialExecuted,"Mutation Boundary","Critical");
    check("Latest V5 Result wrote zero Repository records",Boolean(latest&&latest.repositoryMutation===false&&latest.repositoryWriteCount===0&&latest.persistentCommit===false),latest&&latest.repositoryWriteCount,"Mutation Boundary","Critical");
    check("Android platform cannot grant Persistent Commit",namespace.getPlatformProfile().persistentCommitPermission===false,namespace.getPlatformProfile().persistentCommitPermission,"Cross-Device","Critical");
    check("Android platform cannot bypass Approval",namespace.getPlatformProfile().approvalBypassAllowed===false,namespace.getPlatformProfile().approvalBypassAllowed,"Cross-Device","Critical");
    const combined=preDevice.checks.concat(checks);const allPassed=combined.every(function(i){return i.passed;});const result=summarize(combined,"IDE-190-PHASE5-ANDROID-VALIDATION","IDE-190 Phase 5 Android Real Device Gate PASS","IDE-190 Phase 5 Android Real Device Gate FAIL",{stage:"B",stageName:"Phase 5 Android Real Device Validation",preDeviceValidationId:preDevice.id,preDevicePassed:preDevice.failed===0&&preDevice.criticalFailed===0,androidRealDeviceRequired:true,androidRealDevicePassed:allPassed,phaseGatePassed:allPassed,phase5Complete:allPassed,phase6Allowed:allPassed,releaseAllowed:false,ide190Complete:false,userAgent:userAgent});
    internal.markPhase5AndroidValidation(result); namespace.modules.phase5Validation.status=result.phaseGatePassed?"Phase 5 Gate Passed":"Blocked"; return internal.clone(result);
  }

  function getDevelopmentAutomationPhase5ValidationStatus(){return{componentId:"IDE-190",version:VERSION_MANIFEST.release.version,preDevice:internal.clone(state.lastPhase5Validation),android:internal.clone(state.lastPhase5AndroidValidation),phaseGatePassed:state.androidPhase5ValidationPassed===true,phase5Complete:state.androidPhase5ValidationPassed===true,phase6Allowed:state.androidPhase5ValidationPassed===true,releaseAllowed:false,ide190Complete:false};}
  Object.assign(namespace.api,{runDevelopmentAutomationPhase5Validation,runDevelopmentAutomationPhase5AndroidValidation,getDevelopmentAutomationPhase5ValidationStatus});Object.assign(namespace,namespace.api);
  namespace.modules.phase5Validation={id:"IDE-190-PHASE5-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:5,phaseName:"IDE-160 Controlled Dispatch",androidRealDeviceRequired:true,phaseGate:true,releaseGate:false,loadedAt:internal.nowIso()};
  global.runDevelopmentAutomationPhase5Validation=runDevelopmentAutomationPhase5Validation;global.runDevelopmentAutomationPhase5AndroidValidation=runDevelopmentAutomationPhase5AndroidValidation;global.getDevelopmentAutomationPhase5ValidationStatus=getDevelopmentAutomationPhase5ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
