/* ============================================================
   FILE: 13_development_automation_phase6_validation.js
   IDE-190 Development Automation
   Release: 1.5.0 / Module: Phase 6 Validation 1.0.0
   Phase 6: IDE-150 Controlled Mutation Trial
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 Phase 6 validation blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase6Validation");
  const EXPECTED_PHASE6_SCRIPT_FILES = ["13_development_automation_mutation_trial.js", "13_development_automation_phase6_validation.js"];

  function ide190Phase6AndroidTrialTarget(value) {
    return value + 190;
  }

  function collector(){const checks=[];return{checks:checks,check:function(name,passed,detail,group,severity){checks.push({name:name,passed:passed===true,detail:detail==null?"":String(detail),group:group||"General",severity:severity||"Critical"});}};}
  function summarize(checks,idPrefix,passStatus,failStatus,extras){const passed=checks.filter(function(i){return i.passed;}).length;const failed=checks.length-passed;const criticalFailed=checks.filter(function(i){return !i.passed&&i.severity==="Critical";}).length;return Object.assign({id:internal.nextId(idPrefix),componentId:"IDE-190",version:VERSION_MANIFEST.release.version,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:passed,failed:failed,total:checks.length,health:checks.length?Number(((passed/checks.length)*100).toFixed(2)):0,criticalFailed:criticalFailed,status:failed===0?passStatus:failStatus,checks:checks,validatedAt:internal.nowIso()},extras||{});}
  function getLoadedScriptPaths(){if(!global.document||!global.document.scripts)return[];return Array.from(global.document.scripts).map(function(script){const src=String(script&&script.src||"");if(!src)return"";try{return new URL(src,global.document.baseURI).pathname.split("/").pop()||"";}catch(_){return src.split("?")[0].split("#")[0].split("/").pop()||"";}}).filter(Boolean);}

  async function buildMutationFlow(grounding, options){
    const settings=internal.isPlainObject(options)?options:{};
    const baseline=settings.repositoryBaseline||{repositoryBaselineId:"IDE-190-PHASE6-BASELINE",repositoryHash:"IDE-190-PHASE6-BASELINE-HASH"};
    const plan=await namespace.createAutomationPlan({
      groundingId:grounding.groundingId,
      objective:internal.text(settings.objective,"IDE-190 Phase 6 Controlled Mutation Trial"),
      operation:{
        operationType:"Controlled Mutation Trial",
        capabilityId:"IDE-150-CONTROLLED-MUTATION",
        target:grounding.canonicalTarget,
        scope:{type:"controlled-function-trial",targetFile:settings.targetFile,targetFunction:settings.targetFunction},
        parameters:{
          targetComponentId:"IDE-150",
          adapterId:"IDE-160-ADAPTER-IDE-150",
          adapterOperation:internal.text(settings.prepareOperation,"Prepare Controlled Application"),
          adapterInput:internal.clone(settings.prepareInput||{})
        }
      },
      automationLevel:"L4",
      mutationLevel:"M2",
      requestedExecutionMode:"E1",
      externalEffectLevel:"X0",
      repositoryBaseline:baseline
    });
    const proposal=plan&&plan.ok?await namespace.createAutomationProposal({planId:plan.data.plan.planId,summary:"Controlled Mutation Trial with mandatory rollback"}):null;
    const dryRun=proposal&&proposal.ok?await namespace.runAutomationDryRun({proposalId:proposal.data.proposal.proposalId}):null;
    const preflight=dryRun&&dryRun.ok?await namespace.runAutomationPreflight({dryRunId:dryRun.data.dryRun.dryRunId}):null;
    let approvalRequest=null,approval=null,gate=null,dispatch=null;
    if(preflight&&preflight.ok){
      const pre=preflight.data.preflight;
      approvalRequest=await namespace.requestAutomationApproval({preflightId:pre.preflightId,expiresInMs:120000});
      if(approvalRequest&&approvalRequest.ok){
        approval=namespace.grantAutomationApproval({approvalRequestId:approvalRequest.data.request.approvalRequestId,actor:internal.text(settings.actor,"Phase 6 Project Owner Validator"),actorRole:"Project Owner",reason:internal.text(settings.reason,"Explicit Phase 6 controlled mutation trial validation"),explicitApproval:true});
        if(approval&&approval.ok) gate=await namespace.evaluateAuthorizationGate({preflightId:pre.preflightId,approvalId:approval.data.approval.approvalId});
      }
    }
    if(gate&&gate.ok) dispatch=await namespace.dispatchAutomationFromGate({gateId:gate.data.gate.gateId});
    return {
      plan:plan&&plan.data&&plan.data.plan||null,
      preflight:preflight&&preflight.data&&preflight.data.preflight||null,
      approval:approval&&approval.data&&approval.data.approval||null,
      gate:gate&&gate.data&&gate.data.gate||null,
      dispatchResult:dispatch,
      executionResult:dispatch&&dispatch.data&&dispatch.data.executionResult||null
    };
  }

  function buildInMemoryTrialFixture(){
    const before=["function phase6ControlledTarget(value) {","  return value + 6;","}"].join("\n");
    const after=["function phase6ControlledTarget(value) {","  const result = value + 6;","  return result;","}"].join("\n");
    const repository={"phase6-controlled-validation.js":before};
    const adapter={
      name:"IDE-190 Phase 6 In-Memory Trial Adapter",
      getFileText:function(name){return Object.prototype.hasOwnProperty.call(repository,name)?repository[name]:null;},
      setFileText:function(name,value){if(!Object.prototype.hasOwnProperty.call(repository,name))return false;repository[name]=String(value);return true;}
    };
    return {
      fileName:"phase6-controlled-validation.js",
      functionName:"phase6ControlledTarget",
      before:before,
      after:after,
      original:before,
      repository:repository,
      adapter:adapter,
      prepareInput:{sources:[{fileName:"phase6-controlled-validation.js",code:before}],targetFile:"phase6-controlled-validation.js",targetFunction:"phase6ControlledTarget",beforeFunctionSource:before,afterFunctionSource:after,recommendationId:"IDE-190-PHASE6-CONTROLLED-VALIDATION",recommendationSummary:"Validate IDE-190 Phase 6 controlled mutation trial.",objective:"Temporarily mutate, validate, and mandatorily roll back an isolated function.",actor:"Phase 6 Project Owner Validator"}
    };
  }

  async function runDevelopmentAutomationPhase6Validation(){
    const c=collector(),checks=c.checks,check=c.check;
    const init=namespace.initialize({requireIDE180:true,requireIDE160:true});
    check("Foundation initialization succeeds",init&&init.ok===true,init&&init.code,"Initialization","Critical");
    check("Release Version is 1.5.0",VERSION_MANIFEST.release.version==="1.5.0",VERSION_MANIFEST.release.version,"Manifest","Critical");
    check("Implementation Phase is Phase 6",VERSION_MANIFEST.implementation.phase===6,VERSION_MANIFEST.release.implementationPhase,"Manifest","Critical");
    check("Design Freeze remains exact",VERSION_MANIFEST.release.designFreezeId==="IDE-190-DESIGN-FREEZE-1.0.0",VERSION_MANIFEST.release.designFreezeId,"Manifest","Critical");
    check("Phases 1 through 5 are recorded complete",JSON.stringify(VERSION_MANIFEST.implementation.completedPhases)===JSON.stringify([1,2,3,4,5]),VERSION_MANIFEST.implementation.completedPhases,"Phase Gate","Critical");
    Object.keys(VERSION_MANIFEST.safety).forEach(function(key){check("Safety flag remains disabled: "+key,VERSION_MANIFEST.safety[key]===false,VERSION_MANIFEST.safety[key],"Safety","Critical");});
    check("Persistent Commit remains prohibited",VERSION_MANIFEST.initialPolicy.persistentCommitAllowed===false,VERSION_MANIFEST.initialPolicy.persistentCommitAllowed,"Safety","Critical");
    check("Controlled Mutation requires Project Owner Approval",VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresProjectOwnerApproval===true,VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresProjectOwnerApproval,"Safety","Critical");
    check("Mandatory Rollback remains required",VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresMandatoryRollback===true,VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresMandatoryRollback,"Safety","Critical");
    check("Restoration Verification remains required",VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresRestorationVerification===true,VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresRestorationVerification,"Safety","Critical");
    check("Concurrent Mutation limit remains one",VERSION_MANIFEST.initialPolicy.concurrentMutationLimit===1,VERSION_MANIFEST.initialPolicy.concurrentMutationLimit,"Safety","Critical");

    const dependency=namespace.getDependencyStatus();
    check("IDE-160 Adapter Registry API is available",dependency.ide160AdapterRegistryApiAvailable===true,dependency.ide160AdapterRegistryApiAvailable,"IDE-160 Dependency","Critical");
    check("IDE-160 Adapter Invocation API is available",dependency.ide160AdapterInvocationApiAvailable===true,dependency.ide160AdapterInvocationApiAvailable,"IDE-160 Dependency","Critical");
    check("IDE-150 Adapter remains registered in IDE-160",dependency.ide150AdapterRegisteredInIDE160===true,dependency.ide150AdapterRegisteredInIDE160,"IDE-160 Dependency","Critical");
    check("IDE-150 Adapter remains Controlled Mutation classified",dependency.ide150ControlledMutationAdapter===true,dependency.ide150ControlledMutationAdapter,"IDE-160 Dependency","Critical");
    const ide160=global.AIPromptOSIDE160&&global.AIPromptOSIDE160.api;
    const ide150Adapter=ide160&&typeof ide160.getIDE160ComponentAdapter==="function"?ide160.getIDE160ComponentAdapter("IDE-160-ADAPTER-IDE-150"):null;
    ["Prepare Controlled Application","Approve Controlled Application","Execute Controlled Application"].forEach(function(op){check("IDE-160 IDE-150 Adapter operation exists: "+op,Boolean(ide150Adapter&&ide150Adapter.operations&&Object.prototype.hasOwnProperty.call(ide150Adapter.operations,op)),ide150Adapter&&ide150Adapter.operations&&ide150Adapter.operations[op],"IDE-160 Dependency","Critical");});
    check("IDE-150 Adapter exposes Mandatory Rollback capability",Boolean(ide150Adapter&&ide150Adapter.rollbackCapability===true&&ide150Adapter.controlledMutation===true),ide150Adapter&&ide150Adapter.rollbackCapability,"IDE-160 Dependency","Critical");

    const requiredContracts=["foundation","foundationState","capabilityDescriptor","platformProfile","navigationIntake","groundingContext","automationPlan","automationProposal","dryRunRecord","preflightRecord","authorizationGate","approvalRequest","approvalRecord","consentRecord","dispatchRequest","executionResult","mutationTrialRecord","repositoryIntegrityRecord","rollbackRestorationRecord"];
    check("All Phase 1-6 contracts are registered",requiredContracts.every(function(key){return Boolean(namespace.getContractDefinition(key));}),namespace.listContractDefinitions().length,"Contracts","Critical");
    ["mutationTrialRecord","repositoryIntegrityRecord","rollbackRestorationRecord"].forEach(function(key){const d=namespace.getContractDefinition(key);check("Phase 6 contract exists: "+key,Boolean(d&&d.version==="1.0.0"&&d.readOnly===true),d&&d.version,"Contracts","Critical");});
    check("Mutation Trial module is Ready",namespace.modules.mutationTrial&&namespace.modules.mutationTrial.status==="Ready",namespace.modules.mutationTrial&&namespace.modules.mutationTrial.status,"Modules","Critical");
    check("Phase 6 Validation module is loaded",Boolean(namespace.modules.phase6Validation),namespace.modules.phase6Validation&&namespace.modules.phase6Validation.status,"Modules","Critical");
    const api=namespace.getPublicApiDescription();
    check("Controlled Mutation Trial is implemented",api.mutationImplemented===true,api.mutationImplemented,"Scope","Critical");
    check("Persistent Mutation is still not implemented",api.persistentMutationImplemented===false,api.persistentMutationImplemented,"Scope","Critical");
    check("Recovery is still deferred to Phase 7",api.recoveryImplemented===false,api.recoveryImplemented,"Scope","Critical");
    check("Persistence is still not implemented",api.persistenceImplemented===false,api.persistenceImplemented,"Scope","Critical");
    check("Direct IDE-150 calls remain prohibited",namespace.modules.mutationTrial.directIDE150CallAllowed===false,namespace.modules.mutationTrial.directIDE150CallAllowed,"Mutation Boundary","Critical");

    const grounded=await namespace.intakeAndGroundLatestIDE180Navigation();
    const grounding=grounded&&grounded.ok&&grounded.data&&grounded.data.grounding||null;
    check("V0 Grounding is available",Boolean(grounding&&grounding.groundingStatus==="Grounded"),grounding&&grounding.groundingStatus,"Grounding","Critical");

    const fixture=buildInMemoryTrialFixture();
    const flow=grounding?await buildMutationFlow(grounding,{objective:"Phase 6 in-memory Controlled Mutation Trial fixture",targetFile:fixture.fileName,targetFunction:fixture.functionName,prepareInput:fixture.prepareInput,actor:"Phase 6 Project Owner Validator",repositoryBaseline:{repositoryBaselineId:"IDE-190-PHASE6-INMEMORY-BASELINE",repositoryHash:"IDE-190-PHASE6-INMEMORY-HASH"}}):{};
    check("P2 Preflight passes for L4/M2/E1",Boolean(flow.preflight&&flow.preflight.preflightStatus==="Passed"&&flow.preflight.approvalClassRequired==="P2"),flow.preflight&&flow.preflight.approvalClassRequired,"P2 Binding","Critical");
    check("Project Owner P2 Approval is bound",Boolean(flow.approval&&flow.approval.actorRole==="Project Owner"&&flow.approval.explicitApproval===true),flow.approval&&flow.approval.actorRole,"P2 Binding","Critical");
    check("V4 Gate passes with Mandatory Rollback binding",Boolean(flow.gate&&flow.gate.gateStatus==="Passed"&&flow.gate.authorizationBinding&&flow.gate.authorizationBinding.rollback&&flow.gate.authorizationBinding.rollback.mandatory===true),flow.gate&&flow.gate.gateStatus,"P2 Binding","Critical");
    check("Phase 5 dispatch prepares IDE-150 session through IDE-160",Boolean(flow.executionResult&&flow.executionResult.dispatchStatus==="Succeeded"&&flow.executionResult.phase6Required===true&&flow.executionResult.adapterOutput&&flow.executionResult.adapterOutput.prepared===true),flow.executionResult&&flow.executionResult.adapterOperation,"Phase 5 Continuation","Critical");
    check("Phase 5 Prepare performs zero Repository writes",Boolean(flow.executionResult&&flow.executionResult.repositoryWriteCount===0&&flow.executionResult.repositoryMutation===false),flow.executionResult&&flow.executionResult.repositoryWriteCount,"Phase 5 Continuation","Critical");
    const contextValidation=flow.executionResult?namespace.validateAutomationMutationTrialContext({executionResultId:flow.executionResult.executionResultId}):null;
    check("Phase 6 accepts exact V5 Prepare + P2 Gate context",Boolean(contextValidation&&contextValidation.valid===true),contextValidation&&contextValidation.reasons&&contextValidation.reasons.join(" | "),"Context Binding","Critical");

    const beforeRepository=fixture.repository[fixture.fileName];
    const trial=flow.executionResult?await namespace.executeAutomationControlledMutationTrial({executionResultId:flow.executionResult.executionResultId,executeTrial:true,adapter:fixture.adapter,rollbackReason:"Phase 6 deterministic mandatory rollback",validator:function(info){return Boolean(info&&typeof info.functionSource==="string"&&info.functionSource.includes("const result = value + 6;"));}}):null;
    const trialRecord=trial&&trial.data&&trial.data.mutationTrial||null;
    const v6=trial&&trial.data&&trial.data.repositoryIntegrity||null;
    const v7=trial&&trial.data&&trial.data.rollbackRestoration||null;
    check("Controlled Mutation Trial completes through IDE-160",Boolean(trial&&trial.ok===true&&trial.code==="IDE190_CONTROLLED_MUTATION_TRIAL_COMPLETED"),trial&&trial.code,"Mutation Trial","Critical");
    check("IDE-150 Component Approval succeeds from exact P2 actor/reason",Boolean(trial&&trial.data&&trial.data.componentApprovalOutput&&trial.data.componentApprovalOutput.approved===true),trial&&trial.data&&trial.data.componentApprovalOutput&&trial.data.componentApprovalOutput.approved,"Component Approval","Critical");
    check("Temporary Mutation is actually applied",Boolean(trialRecord&&trialRecord.temporaryMutationApplied===true&&v6&&v6.repositoryWriteCount>=2),v6&&v6.repositoryWriteCount,"Mutation Trial","Critical");
    check("Post-Application Validation passes",Boolean(trialRecord&&trialRecord.postValidationPassed===true),trialRecord&&trialRecord.postValidationPassed,"Validation","Critical");
    check("V6 Repository Integrity is Verified",Boolean(v6&&v6.validationLayer==="V6"&&v6.integrityStatus==="Verified"&&v6.targetOnlyWritesVerified===true),v6&&v6.integrityStatus,"V6 Repository Integrity","Critical");
    check("V6 original/restored hash is exact",Boolean(v6&&v6.originalHash&&v6.originalHash===v6.restoredHash&&v6.sourceRestored===true),v6&&v6.restoredHash,"V6 Repository Integrity","Critical");
    check("V6 has no Persistent Commit or ZIP mutation",Boolean(v6&&v6.persistentCommit===false&&v6.zipFileMutation===false),v6&&v6.persistentCommit,"V6 Repository Integrity","Critical");
    check("V7 Mandatory Rollback executes",Boolean(v7&&v7.validationLayer==="V7"&&v7.mandatoryRollback===true&&v7.rollbackExecuted===true),v7&&v7.rollbackId,"V7 Rollback","Critical");
    check("V7 Rollback is verified",Boolean(v7&&v7.rollbackVerified===true&&v7.restorationStatus==="Verified"),v7&&v7.restorationStatus,"V7 Rollback","Critical");
    check("V7 Source restoration is exact",Boolean(v7&&v7.sourceRestored===true&&v7.originalHash&&v7.originalHash===v7.restoredHash),v7&&v7.restoredHash,"V7 Restoration","Critical");
    check("In-memory Repository source is exactly restored",fixture.repository[fixture.fileName]===beforeRepository,fixture.repository[fixture.fileName]===beforeRepository,"V7 Restoration","Critical");
    check("Repository remains Trusted after verified restoration",namespace.getAutomationMutationTrustStatus().status==="Trusted",namespace.getAutomationMutationTrustStatus().status,"Repository Trust","Critical");
    check("Mutation Lock is released after verified restoration",namespace.getAutomationMutationLockStatus().active===false,namespace.getAutomationMutationLockStatus().active,"Mutation Lock","Critical");
    check("Completed Trial never Persistent Commits",Boolean(trialRecord&&trialRecord.persistentCommit===false&&trialRecord.status==="Trial Completed and Rolled Back"),trialRecord&&trialRecord.status,"Persistent Commit","Critical");
    check("Mutation Trial uses IDE-160 and no direct IDE-150 call",Boolean(trialRecord&&trialRecord.ide160InvocationUsed===true&&trialRecord.directIDE150Call===false),trialRecord&&trialRecord.directIDE150Call,"Dispatch Boundary","Critical");

    const reused=flow.executionResult?await namespace.executeAutomationControlledMutationTrial({executionResultId:flow.executionResult.executionResultId,executeTrial:true,adapter:fixture.adapter}):null;
    check("V5 Prepare Result is Single-Use for Mutation Trial",Boolean(reused&&reused.ok===false&&reused.code==="IDE190_MUTATION_TRIAL_ALREADY_USED"),reused&&reused.code,"Single-Use","Critical");
    const persistent=await namespace.executeAutomationControlledMutationTrial({executionResultId:"ANY",executeTrial:true,retainCommit:true});
    check("Caller cannot request Persistent Commit",Boolean(persistent&&persistent.ok===false&&persistent.code==="IDE190_PERSISTENT_COMMIT_PROHIBITED"),persistent&&persistent.code,"Hard Deny","Critical");
    const missing=await namespace.executeAutomationControlledMutationTrial({executionResultId:"IDE-190-MISSING-V5",executeTrial:true});
    check("Mutation Trial cannot bypass Phase 5 V5 Prepare",Boolean(missing&&missing.ok===false&&missing.code==="IDE190_MUTATION_TRIAL_CONTEXT_BLOCKED"),missing&&missing.code,"Phase Boundary","Critical");
    const originalTrust=internal.clone(state.repositoryMutationTrust);
    state.repositoryMutationTrust={status:"Untrusted",reason:"Phase 6 validation simulated rollback failure",mutationTrialId:"SIMULATED",rollbackId:"SIMULATED",markedAt:internal.nowIso()};
    const blockedUntrusted=await namespace.executeAutomationControlledMutationTrial({executionResultId:"IDE-190-MISSING-V5",executeTrial:true});
    check("Repository Untrusted state blocks further Mutation",Boolean(blockedUntrusted&&blockedUntrusted.ok===false&&blockedUntrusted.code==="IDE190_REPOSITORY_UNTRUSTED"),blockedUntrusted&&blockedUntrusted.code,"Repository Trust","Critical");
    state.repositoryMutationTrust=originalTrust;
    const mutationSource=String(namespace.executeAutomationControlledMutationTrial);
    check("Phase 6 implementation invokes IDE-160 Adapter API",mutationSource.includes("invokeIDE160ComponentAdapter"),mutationSource.includes("invokeIDE160ComponentAdapter"),"Dispatch Boundary","Critical");
    check("Phase 6 implementation contains no direct IDE-150 execution Global call",!mutationSource.includes("executeControlledAutoRefactoringApplication("),mutationSource.includes("executeControlledAutoRefactoringApplication("),"Dispatch Boundary","Critical");
    check("Mutation Trial Contract validates completed record",Boolean(trialRecord&&namespace.validateContract("mutationTrialRecord",trialRecord).valid===true),trialRecord&&trialRecord.mutationTrialId,"Contracts","Critical");
    check("V6 Contract validates Repository Integrity record",Boolean(v6&&namespace.validateContract("repositoryIntegrityRecord",v6).valid===true),v6&&v6.repositoryIntegrityRecordId,"Contracts","Critical");
    check("V7 Contract validates Rollback Restoration record",Boolean(v7&&namespace.validateContract("rollbackRestorationRecord",v7).valid===true),v7&&v7.rollbackRestorationRecordId,"Contracts","Critical");

    const result=summarize(checks,"IDE-190-PHASE6-STAGE-A-VALIDATION","IDE-190 Phase 6 Stage A IDE-150 Controlled Mutation Trial PASS","IDE-190 Phase 6 Stage A IDE-150 Controlled Mutation Trial FAIL",{stage:"A",stageName:"Phase 6 Deterministic / Pre-Android Validation",phase6Complete:false,phase7Allowed:false,androidRealDeviceRequired:true,androidRealDevicePassed:false,releaseAllowed:false,ide190Complete:false,latestMutationTrialId:state.latestMutationTrialId,repositoryTrustStatus:namespace.getAutomationMutationTrustStatus().status,mutationLockActive:namespace.getAutomationMutationLockStatus().active});
    internal.markPhase6Validation(result); namespace.modules.phase6Validation.status=result.failed===0?"Pre-Device Ready":"Blocked"; return internal.clone(result);
  }

  async function runAndroidRuntimeRepositoryTrial(check){
    if(typeof global.getProjectFile!=="function"||typeof global.updateProjectFile!=="function"){
      check("Current Project Runtime File Store API is available",false,"getProjectFile/updateProjectFile unavailable","Android Repository Trial","Critical");
      return null;
    }
    const fileName="13_development_automation_phase6_validation.js";
    const targetFunctionName=ide190Phase6AndroidTrialTarget.name;
    const beforeFunctionSource=Function.prototype.toString.call(ide190Phase6AndroidTrialTarget);
    const afterFunctionSource=beforeFunctionSource.replace("return value + 190;","const result = value + 190;\n    return result;");
    let fileBefore=global.getProjectFile(fileName);
    let sourceBefore=fileBefore?String(fileBefore.code||fileBefore.text||fileBefore.content||fileBefore.value||""):"";
    let runtimeSourceRefresh="Not Required";
    if((!sourceBefore||!sourceBefore.includes(beforeFunctionSource))&&typeof global.loadCurrentProjectFileByFetch==="function"){
      const scriptElement=global.document?Array.from(global.document.querySelectorAll("script[src]")).find(function(script){const src=String(script&&script.getAttribute("src")||"");return src.split("?")[0].split("#")[0].replace(/^\.\//,"").split("/").pop()===fileName;}):null;
      const runtimeSourcePath=scriptElement?scriptElement.getAttribute("src"):fileName;
      const loaded=await global.loadCurrentProjectFileByFetch(runtimeSourcePath);
      runtimeSourceRefresh=loaded===true?"Refreshed: "+runtimeSourcePath:"Refresh Failed: "+runtimeSourcePath;
      fileBefore=global.getProjectFile(fileName);
      sourceBefore=fileBefore?String(fileBefore.code||fileBefore.text||fileBefore.content||fileBefore.value||""):"";
    }
    check("Current Phase 6 validation source is available in Runtime File Store",Boolean(sourceBefore&&sourceBefore.includes(beforeFunctionSource)),sourceBefore.length+" | "+runtimeSourceRefresh,"Android Repository Trial","Critical");
    if(!sourceBefore||!sourceBefore.includes(beforeFunctionSource)) return null;

    const grounded=await namespace.intakeAndGroundLatestIDE180Navigation();
    const grounding=grounded&&grounded.ok&&grounded.data&&grounded.data.grounding||null;
    check("Android Runtime Trial obtains fresh V0 Grounding",Boolean(grounding&&grounding.groundingStatus==="Grounded"),grounding&&grounding.groundingStatus,"Android Repository Trial","Critical");
    if(!grounding)return null;
    const flow=await buildMutationFlow(grounding,{objective:"Phase 6 Android Current Project Runtime Controlled Mutation Trial",targetFile:fileName,targetFunction:targetFunctionName,prepareOperation:"Prepare Controlled Application Async",prepareInput:{targetFile:fileName,targetFunction:targetFunctionName,beforeFunctionSource:beforeFunctionSource,afterFunctionSource:afterFunctionSource,recommendationId:"IDE-190-PHASE6-ANDROID-RUNTIME-TRIAL",recommendationSummary:"Android real-device runtime Repository mutation/rollback verification.",objective:"Temporarily mutate the dedicated Phase 6 validation function and restore it exactly.",actor:"Phase 6 Android Project Owner"},actor:"Phase 6 Android Project Owner",reason:"Explicit Android real-device controlled mutation trial with mandatory rollback",repositoryBaseline:{repositoryBaselineId:"IDE-190-PHASE6-ANDROID-RUNTIME-BASELINE",repositoryHash:"IDE-190-PHASE6-ANDROID-RUNTIME-HASH"}});
    check("Android Runtime Trial Phase 5 Prepare succeeds through IDE-160",Boolean(flow.executionResult&&flow.executionResult.executionSucceeded===true&&flow.executionResult.adapterOutput&&flow.executionResult.adapterOutput.prepared===true),flow.executionResult&&flow.executionResult.adapterOperation,"Android Repository Trial","Critical");
    if(!flow.executionResult)return null;
    const trial=await namespace.executeAutomationControlledMutationTrial({executionResultId:flow.executionResult.executionResultId,executeTrial:true,rollbackReason:"IDE-190 Phase 6 Android mandatory rollback",validator:function(info){return Boolean(info&&typeof info.functionSource==="string"&&info.functionSource.includes("const result = value + 190;"));}});
    const fileAfter=global.getProjectFile(fileName);
    const sourceAfter=fileAfter?String(fileAfter.code||fileAfter.text||fileAfter.content||fileAfter.value||""):"";
    const tr=trial&&trial.data&&trial.data.mutationTrial||null;
    const v6=trial&&trial.data&&trial.data.repositoryIntegrity||null;
    const v7=trial&&trial.data&&trial.data.rollbackRestoration||null;
    check("Android Runtime Controlled Mutation Trial completes",Boolean(trial&&trial.ok===true&&tr&&tr.status==="Trial Completed and Rolled Back"),trial&&trial.code,"Android Repository Trial","Critical");
    check("Android Runtime Trial performs temporary Repository writes",Boolean(v6&&v6.temporaryMutationApplied===true&&v6.repositoryWriteCount>=2),v6&&v6.repositoryWriteCount,"Android Repository Trial","Critical");
    check("Android Runtime V6 Integrity is Verified",Boolean(v6&&v6.integrityStatus==="Verified"&&v6.sourceRestored===true),v6&&v6.integrityStatus,"Android Repository Trial","Critical");
    check("Android Runtime V7 Rollback is Verified",Boolean(v7&&v7.rollbackVerified===true&&v7.sourceRestored===true&&v7.restorationStatus==="Verified"),v7&&v7.restorationStatus,"Android Repository Trial","Critical");
    check("Android Runtime File Store source is byte-for-byte restored",sourceAfter===sourceBefore,sourceAfter===sourceBefore,"Android Repository Trial","Critical");
    check("Android Runtime Repository remains Trusted",namespace.getAutomationMutationTrustStatus().status==="Trusted",namespace.getAutomationMutationTrustStatus().status,"Android Repository Trial","Critical");
    check("Android Runtime Mutation Lock is released",namespace.getAutomationMutationLockStatus().active===false,namespace.getAutomationMutationLockStatus().active,"Android Repository Trial","Critical");
    return trial;
  }

  async function runDevelopmentAutomationPhase6AndroidValidation(){
    const preDevice=await runDevelopmentAutomationPhase6Validation(); const c=collector(),checks=c.checks,check=c.check;
    check("Phase 6 Stage A is PASS",preDevice.failed===0&&preDevice.criticalFailed===0,preDevice.status,"Stage A","Critical");
    const userAgent=global.navigator&&global.navigator.userAgent||"";
    check("Android real-device environment is detected",/Android/i.test(userAgent),userAgent,"Android Runtime","Critical");
    check("Web Crypto SHA-256 is available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.TextEncoder==="function"),Boolean(global.crypto&&global.crypto.subtle),"Android Runtime","Critical");
    check("IndexedDB is available",Boolean(global.indexedDB),Boolean(global.indexedDB),"Android Runtime","Critical");
    check("Fetch API is available",typeof global.fetch==="function",typeof global.fetch,"Android Runtime","Critical");
    const loaded=getLoadedScriptPaths(); EXPECTED_PHASE6_SCRIPT_FILES.forEach(function(file){check("Actual script loaded: "+file,loaded.includes(file),loaded.length,"Actual Script Loading","Critical");});
    let manifestLoad=null;if(typeof global.loadStaticScriptManifest==="function"){try{manifestLoad=await global.loadStaticScriptManifest();}catch(error){manifestLoad={ok:false,errors:[error&&error.message?error.message:String(error)]};}}
    check("Static Manifest loader API is available",typeof global.loadStaticScriptManifest==="function",typeof global.loadStaticScriptManifest,"Static Integrity","Critical");
    check("Static Manifest fetch/integrity succeeds",Boolean(manifestLoad&&manifestLoad.ok===true),manifestLoad&&manifestLoad.errors||[],"Static Integrity","Critical");
    if(manifestLoad&&manifestLoad.manifest){const normalized=(manifestLoad.manifest.scripts||[]).map(function(src){return String(src||"").split("?")[0].split("#")[0].replace(/^\.\//,"");});EXPECTED_PHASE6_SCRIPT_FILES.forEach(function(file){check("Static Manifest contains: "+file,normalized.includes(file),normalized.length,"Static Integrity","Critical");const hash=manifestLoad.manifest.hashes&&manifestLoad.manifest.hashes[file];check("Static Manifest has SHA-256: "+file,Boolean(hash&&/^[a-f0-9]{64}$/.test(String(hash.sha256||""))),hash&&hash.sha256,"Static Integrity","Critical");});}
    const runtimeTrial=await runAndroidRuntimeRepositoryTrial(check);
    const latest=namespace.getLatestAutomationMutationTrial();
    check("Latest Phase 6 Trial used IDE-160 invocation",Boolean(latest&&latest.ide160InvocationUsed===true),latest&&latest.mutationTrialId,"IDE-160 Dispatch","Critical");
    check("Latest Phase 6 Trial made no direct IDE-150 call",Boolean(latest&&latest.directIDE150Call===false),latest&&latest.directIDE150Call,"Dispatch Boundary","Critical");
    check("Latest Phase 6 Trial never Persistent Committed",Boolean(latest&&latest.persistentCommit===false),latest&&latest.persistentCommit,"Persistent Commit","Critical");
    check("Latest Phase 6 Trial finished Rolled Back",Boolean(runtimeTrial&&latest&&latest.status==="Trial Completed and Rolled Back"&&latest.rollbackVerified===true&&latest.sourceRestored===true),latest&&latest.status,"Rollback","Critical");
    check("Android platform cannot grant Persistent Commit",namespace.getPlatformProfile().persistentCommitPermission===false,namespace.getPlatformProfile().persistentCommitPermission,"Cross-Device","Critical");
    check("Android platform cannot bypass Approval",namespace.getPlatformProfile().approvalBypassAllowed===false,namespace.getPlatformProfile().approvalBypassAllowed,"Cross-Device","Critical");
    const combined=preDevice.checks.concat(checks);const allPassed=combined.every(function(i){return i.passed;});const result=summarize(combined,"IDE-190-PHASE6-ANDROID-VALIDATION","IDE-190 Phase 6 Android Real Device Gate PASS","IDE-190 Phase 6 Android Real Device Gate FAIL",{stage:"B",stageName:"Phase 6 Android Real Device Validation",preDeviceValidationId:preDevice.id,preDevicePassed:preDevice.failed===0&&preDevice.criticalFailed===0,androidRealDeviceRequired:true,androidRealDevicePassed:allPassed,phaseGatePassed:allPassed,phase6Complete:allPassed,phase7Allowed:allPassed,releaseAllowed:false,ide190Complete:false,repositoryTrustStatus:namespace.getAutomationMutationTrustStatus().status,mutationLockActive:namespace.getAutomationMutationLockStatus().active,userAgent:userAgent});
    internal.markPhase6AndroidValidation(result); namespace.modules.phase6Validation.status=result.phaseGatePassed?"Phase 6 Gate Passed":"Blocked"; return internal.clone(result);
  }

  function getDevelopmentAutomationPhase6ValidationStatus(){return{componentId:"IDE-190",version:VERSION_MANIFEST.release.version,preDevice:internal.clone(state.lastPhase6Validation),android:internal.clone(state.lastPhase6AndroidValidation),phaseGatePassed:state.androidPhase6ValidationPassed===true,phase6Complete:state.androidPhase6ValidationPassed===true,phase7Allowed:state.androidPhase6ValidationPassed===true,releaseAllowed:false,ide190Complete:false,repositoryTrustStatus:namespace.getAutomationMutationTrustStatus().status,mutationLockActive:namespace.getAutomationMutationLockStatus().active};}
  Object.assign(namespace.api,{runDevelopmentAutomationPhase6Validation:runDevelopmentAutomationPhase6Validation,runDevelopmentAutomationPhase6AndroidValidation:runDevelopmentAutomationPhase6AndroidValidation,getDevelopmentAutomationPhase6ValidationStatus:getDevelopmentAutomationPhase6ValidationStatus});Object.assign(namespace,namespace.api);
  namespace.modules.phase6Validation={id:"IDE-190-PHASE6-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:6,phaseName:"IDE-150 Controlled Mutation Trial",androidRealDeviceRequired:true,actualRuntimeRepositoryTrialRequired:true,phaseGate:true,releaseGate:false,loadedAt:internal.nowIso()};
  global.runDevelopmentAutomationPhase6Validation=runDevelopmentAutomationPhase6Validation;global.runDevelopmentAutomationPhase6AndroidValidation=runDevelopmentAutomationPhase6AndroidValidation;global.getDevelopmentAutomationPhase6ValidationStatus=getDevelopmentAutomationPhase6ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
