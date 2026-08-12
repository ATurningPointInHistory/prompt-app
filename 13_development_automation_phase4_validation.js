/* ============================================================
   FILE: 13_development_automation_phase4_validation.js
   IDE-190 Development Automation
   Release: 1.3.0 / Module: Phase 4 Validation 1.0.0
   Phase 4: Gate / Approval / Consent
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 Phase 4 validation blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase4Validation");
  const EXPECTED_PHASE4_SCRIPT_FILES = ["13_development_automation_gate.js","13_development_automation_approval.js","13_development_automation_consent.js","13_development_automation_phase4_validation.js"];

  function collector() { const checks=[]; return {checks:checks, check:function(name,passed,detail,group,severity){checks.push({name:name,passed:passed===true,detail:detail==null?"":String(detail),group:group||"General",severity:severity||"Critical"});}}; }
  function summarize(checks,idPrefix,passStatus,failStatus,extras){const passed=checks.filter(function(i){return i.passed;}).length;const failed=checks.length-passed;const criticalFailed=checks.filter(function(i){return !i.passed&&i.severity==="Critical";}).length;return Object.assign({id:internal.nextId(idPrefix),componentId:"IDE-190",version:VERSION_MANIFEST.release.version,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:passed,failed:failed,total:checks.length,health:checks.length?Number(((passed/checks.length)*100).toFixed(2)):0,criticalFailed:criticalFailed,status:failed===0?passStatus:failStatus,checks:checks,validatedAt:internal.nowIso()},extras||{});}
  function getLoadedScriptPaths(){if(!global.document||!global.document.scripts)return[];return Array.from(global.document.scripts).map(function(script){const src=String(script&&script.src||"");if(!src)return"";try{return new URL(src,global.document.baseURI).pathname.split("/").pop()||"";}catch(_){return src.split("?")[0].split("#")[0].split("/").pop()||"";}}).filter(Boolean);}

  async function buildFlow(grounding, spec) {
    const plan = await namespace.createAutomationPlan({ groundingId: grounding.groundingId, objective: spec.objective, operation: { operationType: spec.operationType, capabilityId: spec.capabilityId, target: grounding.canonicalTarget, scope: spec.scope || { type:"canonical-target", canonicalId: grounding.canonicalTarget && grounding.canonicalTarget.canonicalId || null }, parameters: spec.parameters || {} }, automationLevel: spec.automationLevel, mutationLevel: spec.mutationLevel, requestedExecutionMode: spec.executionMode, externalEffectLevel: spec.externalEffectLevel || "X0", repositoryBaseline: spec.repositoryBaseline || null });
    const proposal = plan && plan.ok ? await namespace.createAutomationProposal({ planId: plan.data.plan.planId, summary: spec.objective }) : null;
    const dryRun = proposal && proposal.ok ? await namespace.runAutomationDryRun({ proposalId: proposal.data.proposal.proposalId }) : null;
    const preflight = dryRun && dryRun.ok ? await namespace.runAutomationPreflight({ dryRunId: dryRun.data.dryRun.dryRunId }) : null;
    return { planResult:plan, plan:plan&&plan.data&&plan.data.plan||null, proposalResult:proposal, proposal:proposal&&proposal.data&&proposal.data.proposal||null, dryRunResult:dryRun, dryRun:dryRun&&dryRun.data&&dryRun.data.dryRun||null, preflightResult:preflight, preflight:preflight&&preflight.data&&preflight.data.preflight||null };
  }

  async function runDevelopmentAutomationPhase4Validation() {
    const c=collector(), checks=c.checks, check=c.check;
    const init=namespace.initialize({requireIDE180:true,requireIDE160:true});
    check("Foundation initialization succeeds",init&&init.ok===true,init&&init.code,"Initialization","Critical");
    check("Release Version is 1.3.0",VERSION_MANIFEST.release.version==="1.3.0",VERSION_MANIFEST.release.version,"Manifest","Critical");
    check("Implementation Phase is Phase 4",VERSION_MANIFEST.implementation.phase===4,VERSION_MANIFEST.release.implementationPhase,"Manifest","Critical");
    check("Design Freeze remains exact",VERSION_MANIFEST.release.designFreezeId==="IDE-190-DESIGN-FREEZE-1.0.0",VERSION_MANIFEST.release.designFreezeId,"Manifest","Critical");
    check("Phases 1 through 3 are recorded complete",JSON.stringify(VERSION_MANIFEST.implementation.completedPhases)===JSON.stringify([1,2,3]),VERSION_MANIFEST.implementation.completedPhases,"Phase Gate","Critical");
    Object.keys(VERSION_MANIFEST.safety).forEach(function(key){check("Safety flag remains disabled: "+key,VERSION_MANIFEST.safety[key]===false,VERSION_MANIFEST.safety[key],"Safety","Critical");});
    check("Consent is not Approval",VERSION_MANIFEST.initialPolicy.consentIsApproval===false,VERSION_MANIFEST.initialPolicy.consentIsApproval,"Approval Boundary","Critical");
    check("Human Approval cannot override Hard Deny",VERSION_MANIFEST.initialPolicy.humanApprovalOverridesHardDeny===false,VERSION_MANIFEST.initialPolicy.humanApprovalOverridesHardDeny,"Approval Boundary","Critical");
    check("P4 remains prohibited",VERSION_MANIFEST.approvalClasses.find(function(x){return x.id==="P4";}).initialPolicy==="PROHIBITED","P4","Approval Boundary","Critical");

    const requiredContracts=["foundation","foundationState","capabilityDescriptor","platformProfile","navigationIntake","groundingContext","automationPlan","automationProposal","dryRunRecord","preflightRecord","authorizationGate","approvalRequest","approvalRecord","consentRecord"];
    const contracts=namespace.listContractDefinitions();
    check("All Phase 1-4 contracts are registered",requiredContracts.every(function(key){return Boolean(namespace.getContractDefinition(key));}),contracts.length,"Contracts","Critical");
    ["authorizationGate","approvalRequest","approvalRecord","consentRecord"].forEach(function(key){const d=namespace.getContractDefinition(key);check("Phase 4 contract exists: "+key,Boolean(d&&d.version==="1.0.0"&&d.readOnly===true),d&&d.version,"Contracts","Critical");});
    ["gate","approval","consent"].forEach(function(key){check("Module is Ready: "+key,namespace.modules[key]&&namespace.modules[key].status==="Ready",namespace.modules[key]&&namespace.modules[key].status,"Modules","Critical");});
    check("Phase 4 Validation module is loaded",Boolean(namespace.modules.phase4Validation),namespace.modules.phase4Validation&&namespace.modules.phase4Validation.status,"Modules","Critical");
    const api=namespace.getPublicApiDescription();
    check("Gate is implemented",api.gateImplemented===true,api.gateImplemented,"Scope","Critical");
    check("Approval is implemented",api.approvalImplemented===true,api.approvalImplemented,"Scope","Critical");
    check("Consent is implemented",api.consentImplemented===true,api.consentImplemented,"Scope","Critical");
    check("Dispatch is still not implemented",api.dispatchImplemented===false,api.dispatchImplemented,"Scope","Critical");
    check("Mutation is still not implemented",api.mutationImplemented===false,api.mutationImplemented,"Scope","Critical");
    check("Persistence is still not implemented",api.persistenceImplemented===false,api.persistenceImplemented,"Scope","Critical");

    const grounded=await namespace.intakeAndGroundLatestIDE180Navigation();
    const grounding=grounded&&grounded.ok&&grounded.data&&grounded.data.grounding||null;
    check("V0 Grounding is available",Boolean(grounding&&grounding.groundingStatus==="Grounded"),grounding&&grounding.groundingStatus,"Grounding","Critical");

    const p0=grounding?await buildFlow(grounding,{objective:"Phase 4 P0 read-only gate fixture",operationType:"Read-Only Authorized Validation",capabilityId:"IDE-190-PHASE4-P0",automationLevel:"L2",mutationLevel:"M0",executionMode:"E0"}):{};
    check("P0 Preflight passes",Boolean(p0.preflight&&p0.preflight.preflightStatus==="Passed"&&p0.preflight.approvalClassRequired==="P0"),p0.preflight&&p0.preflight.approvalClassRequired,"P0 Gate","Critical");
    const p0Gate=p0.preflight?await namespace.evaluateAuthorizationGate({preflightId:p0.preflight.preflightId}):null;
    const p0Record=p0Gate&&p0Gate.data&&p0Gate.data.gate||null;
    check("P0 V4 Gate passes without Human Approval",Boolean(p0Gate&&p0Gate.ok===true&&p0Record&&p0Record.gateStatus==="Passed"),p0Gate&&p0Gate.code,"P0 Gate","Critical");
    check("P0 Gate has no Approval ID",p0Record&&p0Record.approvalId===null,p0Record&&p0Record.approvalId,"P0 Gate","Critical");
    check("Passed P0 Gate only enables later Dispatch eligibility",p0Record&&p0Record.dispatchEligible===true&&p0Record.dispatchExecuted===false,p0Record&&p0Record.dispatchEligible,"Dispatch Boundary","Critical");
    check("V4 Gate writes zero Repository records",p0Record&&p0Record.repositoryMutation===false&&p0Record.repositoryWriteCount===0,p0Record&&p0Record.repositoryWriteCount,"Mutation Boundary","Critical");

    const p1=grounding?await buildFlow(grounding,{objective:"Phase 4 P1 runtime approval fixture",operationType:"Controlled Runtime Execution",capabilityId:"IDE-190-PHASE4-P1",automationLevel:"L3",mutationLevel:"M1",executionMode:"E0"}):{};
    check("P1 Preflight classifies Runtime Approval",p1.preflight&&p1.preflight.approvalClassRequired==="P1",p1.preflight&&p1.preflight.approvalClassRequired,"P1 Approval","Critical");
    const p1Await=p1.preflight?await namespace.evaluateAuthorizationGate({preflightId:p1.preflight.preflightId}):null;
    check("P1 Gate waits for Approval",p1Await&&p1Await.ok===false&&p1Await.data&&p1Await.data.gate&&p1Await.data.gate.gateStatus==="Awaiting-Approval",p1Await&&p1Await.code,"P1 Approval","Critical");
    const p1Req=p1.preflight?await namespace.requestAutomationApproval({preflightId:p1.preflight.preflightId,expiresInMs:60000}):null;
    const p1Approval=p1Req&&p1Req.ok?namespace.grantAutomationApproval({approvalRequestId:p1Req.data.request.approvalRequestId,actor:"Phase4 Human Validator",actorRole:"Reviewer",reason:"Explicit P1 runtime validation approval",explicitApproval:true}):null;
    check("P1 Human Approval is granted",p1Approval&&p1Approval.ok===true,p1Approval&&p1Approval.code,"P1 Approval","Critical");
    const p1ApprovalRecord=p1Approval&&p1Approval.data&&p1Approval.data.approval||null;
    const p1Gate=p1ApprovalRecord?await namespace.evaluateAuthorizationGate({preflightId:p1.preflight.preflightId,approvalId:p1ApprovalRecord.approvalId}):null;
    check("P1 Gate passes with exact bound Approval",p1Gate&&p1Gate.ok===true&&p1Gate.data.gate.approvalConsumed===true,p1Gate&&p1Gate.code,"P1 Approval","Critical");
    const p1Reuse=p1ApprovalRecord?await namespace.evaluateAuthorizationGate({preflightId:p1.preflight.preflightId,approvalId:p1ApprovalRecord.approvalId}):null;
    check("Approval is Single-Use and cannot be reused",p1Reuse&&p1Reuse.ok===false&&p1Reuse.data&&p1Reuse.data.gate&&p1Reuse.data.gate.gateStatus==="Blocked",p1Reuse&&p1Reuse.data&&p1Reuse.data.approvalReason,"Single-Use","Critical");
    const p1Status=p1ApprovalRecord?namespace.getAutomationApprovalStatus(p1ApprovalRecord.approvalId):null;
    check("Consumed Approval state is explicit",p1Status&&p1Status.approvalState&&p1Status.approvalState.status==="Consumed",p1Status&&p1Status.approvalState&&p1Status.approvalState.status,"Single-Use","Critical");

    const contextA=grounding?await buildFlow(grounding,{objective:"Context A",operationType:"Runtime Context A",capabilityId:"IDE-190-PHASE4-CONTEXT-A",automationLevel:"L3",mutationLevel:"M1",executionMode:"E0",scope:{type:"fixture",id:"A"}}):{};
    const contextB=grounding?await buildFlow(grounding,{objective:"Context B",operationType:"Runtime Context B",capabilityId:"IDE-190-PHASE4-CONTEXT-B",automationLevel:"L3",mutationLevel:"M1",executionMode:"E0",scope:{type:"fixture",id:"B"}}):{};
    const ctxReq=contextA.preflight?await namespace.requestAutomationApproval({preflightId:contextA.preflight.preflightId,expiresInMs:60000}):null;
    const ctxApproval=ctxReq&&ctxReq.ok?namespace.grantAutomationApproval({approvalRequestId:ctxReq.data.request.approvalRequestId,actor:"Context Validator",actorRole:"Reviewer",reason:"Bound to context A",explicitApproval:true}):null;
    const ctxRecord=ctxApproval&&ctxApproval.data&&ctxApproval.data.approval||null;
    const ctxMismatch=ctxRecord&&contextB.preflight?await namespace.evaluateAuthorizationGate({preflightId:contextB.preflight.preflightId,approvalId:ctxRecord.approvalId}):null;
    check("Approval is Context-Specific and rejects different target/scope",ctxMismatch&&ctxMismatch.ok===false&&ctxMismatch.data&&String(ctxMismatch.data.approvalReason||"").includes("Context Mismatch"),ctxMismatch&&ctxMismatch.data&&ctxMismatch.data.approvalReason,"Context Binding","Critical");

    const invFlow=grounding?await buildFlow(grounding,{objective:"Invalidation fixture",operationType:"Runtime Invalidation",capabilityId:"IDE-190-PHASE4-INVALIDATE",automationLevel:"L3",mutationLevel:"M1",executionMode:"E0"}):{};
    const invReq=invFlow.preflight?await namespace.requestAutomationApproval({preflightId:invFlow.preflight.preflightId,expiresInMs:60000}):null;
    const invApproval=invReq&&invReq.ok?namespace.grantAutomationApproval({approvalRequestId:invReq.data.request.approvalRequestId,actor:"Invalidation Validator",actorRole:"Reviewer",reason:"Will invalidate",explicitApproval:true}):null;
    const invRecord=invApproval&&invApproval.data&&invApproval.data.approval||null;
    const invalidated=invRecord?namespace.invalidateAutomationApproval({approvalId:invRecord.approvalId,actor:"Invalidation Validator",reason:"Material context change"}):null;
    check("Approval can be Invalidated",invalidated&&invalidated.ok===true,invalidated&&invalidated.code,"Invalidation","Critical");
    const invGate=invRecord?await namespace.evaluateAuthorizationGate({preflightId:invFlow.preflight.preflightId,approvalId:invRecord.approvalId}):null;
    check("Invalidated Approval cannot pass Gate",invGate&&invGate.ok===false&&invGate.data&&String(invGate.data.approvalReason||"").includes("Invalidated"),invGate&&invGate.data&&invGate.data.approvalReason,"Invalidation","Critical");

    const expFlow=grounding?await buildFlow(grounding,{objective:"Expiration fixture",operationType:"Runtime Expiration",capabilityId:"IDE-190-PHASE4-EXPIRE",automationLevel:"L3",mutationLevel:"M1",executionMode:"E0"}):{};
    const expReq=expFlow.preflight?await namespace.requestAutomationApproval({preflightId:expFlow.preflight.preflightId,expiresInMs:25}):null;
    const expApproval=expReq&&expReq.ok?namespace.grantAutomationApproval({approvalRequestId:expReq.data.request.approvalRequestId,actor:"Expiration Validator",actorRole:"Reviewer",reason:"Short-lived validation approval",explicitApproval:true}):null;
    const expRecord=expApproval&&expApproval.data&&expApproval.data.approval||null;
    if (expRecord) await new Promise(function(resolve){global.setTimeout(resolve,40);});
    const expGate=expRecord?await namespace.evaluateAuthorizationGate({preflightId:expFlow.preflight.preflightId,approvalId:expRecord.approvalId}):null;
    check("Expired Approval cannot pass Gate",expGate&&expGate.ok===false&&expGate.data&&String(expGate.data.approvalReason||"").includes("Expired"),expGate&&expGate.data&&expGate.data.approvalReason,"Expiration","Critical");

    const baseline={repositoryBaselineId:"IDE-190-PHASE4-BASELINE",repositoryHash:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"};
    const p2=grounding?await buildFlow(grounding,{objective:"P2 controlled mutation trial authorization only",operationType:"Controlled Mutation Trial",capabilityId:"IDE-150-CONTROLLED-MUTATION",automationLevel:"L4",mutationLevel:"M2",executionMode:"E1",repositoryBaseline:baseline}):{};
    check("P2 Preflight passes only with explicit Repository Baseline",p2.preflight&&p2.preflight.preflightStatus==="Passed"&&p2.preflight.approvalClassRequired==="P2",p2.preflight&&p2.preflight.preflightStatus+"/"+p2.preflight.approvalClassRequired,"P2 Approval","Critical");
    const p2Req=p2.preflight?await namespace.requestAutomationApproval({preflightId:p2.preflight.preflightId,expiresInMs:60000}):null;
    const p2Wrong=p2Req&&p2Req.ok?namespace.grantAutomationApproval({approvalRequestId:p2Req.data.request.approvalRequestId,actor:"Reviewer",actorRole:"Reviewer",reason:"Wrong role",explicitApproval:true}):null;
    check("P2 rejects non-Project-Owner Approval",p2Wrong&&p2Wrong.ok===false&&p2Wrong.code==="IDE190_P2_PROJECT_OWNER_REQUIRED",p2Wrong&&p2Wrong.code,"P2 Approval","Critical");
    const p2Approval=p2Req&&p2Req.ok?namespace.grantAutomationApproval({approvalRequestId:p2Req.data.request.approvalRequestId,actor:"Project Owner",actorRole:"Project Owner",reason:"Explicit controlled mutation trial approval for validation only",explicitApproval:true}):null;
    check("P2 accepts explicit Project Owner Approval",p2Approval&&p2Approval.ok===true,p2Approval&&p2Approval.code,"P2 Approval","Critical");
    const p2Record=p2Approval&&p2Approval.data&&p2Approval.data.approval||null;
    const p2Gate=p2Record?await namespace.evaluateAuthorizationGate({preflightId:p2.preflight.preflightId,approvalId:p2Record.approvalId}):null;
    check("P2 V4 Gate passes without executing Mutation",p2Gate&&p2Gate.ok===true&&p2Gate.data.gate.repositoryMutation===false&&p2Gate.data.gate.dispatchExecuted===false,p2Gate&&p2Gate.code,"P2 Approval","Critical");
    check("P2 Gate binds Repository Baseline",p2Gate&&p2Gate.data.gate.authorizationBinding.repositoryBaseline&&p2Gate.data.gate.authorizationBinding.repositoryBaseline.repositoryBaselineId===baseline.repositoryBaselineId,p2Gate&&p2Gate.data.gate.authorizationBinding.repositoryBaseline&&p2Gate.data.gate.authorizationBinding.repositoryBaseline.repositoryBaselineId,"Context Binding","Critical");
    check("P2 Gate requires Mandatory Rollback binding",p2Gate&&p2Gate.data.gate.authorizationBinding.rollback.required===true&&p2Gate.data.gate.authorizationBinding.rollback.mandatory===true&&p2Gate.data.gate.authorizationBinding.rollback.restorationVerificationRequired===true,JSON.stringify(p2Gate&&p2Gate.data.gate.authorizationBinding.rollback),"Rollback Binding","Critical");

    const p3=grounding?await buildFlow(grounding,{objective:"P3 IDE-160 workflow continuation authorization",operationType:"IDE-160 Workflow Continuation",capabilityId:"IDE-160-WORKFLOW-CONTINUATION",automationLevel:"L3",mutationLevel:"M0",executionMode:"E0"}):{};
    check("Explicit IDE-160 continuation is classified P3",p3.preflight&&p3.preflight.approvalClassRequired==="P3",p3.preflight&&p3.preflight.approvalClassRequired,"P3 Approval","Critical");
    const p3Req=p3.preflight?await namespace.requestAutomationApproval({preflightId:p3.preflight.preflightId,expiresInMs:60000}):null;
    const p3Approval=p3Req&&p3Req.ok?namespace.grantAutomationApproval({approvalRequestId:p3Req.data.request.approvalRequestId,actor:"Workflow Approver",actorRole:"Workflow Operator",reason:"Explicit IDE-160 continuation approval",explicitApproval:true}):null;
    const p3Record=p3Approval&&p3Approval.data&&p3Approval.data.approval||null;
    const p3Gate=p3Record?await namespace.evaluateAuthorizationGate({preflightId:p3.preflight.preflightId,approvalId:p3Record.approvalId}):null;
    check("P3 Gate passes with bound continuation Approval",p3Gate&&p3Gate.ok===true,p3Gate&&p3Gate.code,"P3 Approval","Critical");

    const consent=await namespace.recordAutomationConsent({consentType:"Archive Search",actor:"Project Owner",scope:{mode:"read-only"},target:{source:"memo-archive-zip"},context:{purpose:"Phase 4 consent separation validation"}});
    const consentRecord=consent&&consent.data&&consent.data.consent||null;
    check("Archive Search Consent can be recorded",consent&&consent.ok===true,consent&&consent.code,"Consent","Critical");
    check("Consent is not Approval / Import Authorization / Mutation Approval",consentRecord&&consentRecord.isApproval===false&&consentRecord.importAuthorizationGranted===false&&consentRecord.mutationApprovalGranted===false&&consentRecord.dispatchPermissionGranted===false,consentRecord&&consentRecord.contextHash,"Consent","Critical");
    check("Consent keeps automatic Archive Import disabled",consentRecord&&consentRecord.automaticImportAllowed===false,consentRecord&&consentRecord.automaticImportAllowed,"Consent","Critical");
    const consentAsApproval=p1.preflight&&consentRecord?await namespace.evaluateAuthorizationGate({preflightId:p1.preflight.preflightId,approvalId:consentRecord.consentId,consentId:consentRecord.consentId}):null;
    check("Consent ID cannot satisfy Human Approval",consentAsApproval&&consentAsApproval.ok===false&&consentAsApproval.data&&consentAsApproval.data.gate&&consentAsApproval.data.gate.consentUsedAsApproval===false,consentAsApproval&&consentAsApproval.data&&consentAsApproval.data.approvalReason,"Consent","Critical");

    const p4Req=p1.preflight?await namespace.requestAutomationApproval({preflightId:p1.preflight.preflightId,approvalClass:"P4"}):null;
    check("Caller cannot override required Approval Class to P4",p4Req&&p4Req.ok===false&&p4Req.code==="IDE190_APPROVAL_CLASS_CONTEXT_MISMATCH",p4Req&&p4Req.code,"Hard Deny","Critical");
    const hardPlan=grounding?await namespace.createAutomationPlan({groundingId:grounding.groundingId,operationType:"Persistent Commit",capabilityId:"IDE-190-P4-FORBIDDEN",automationLevel:"L5",mutationLevel:"M3",requestedExecutionMode:"E2",externalEffectLevel:"X3"}):null;
    check("Persistent Commit remains Hard Deny before Approval",hardPlan&&hardPlan.ok===false&&hardPlan.code==="IDE190_PLAN_HARD_DENY",hardPlan&&hardPlan.code,"Hard Deny","Critical");

    const unsafeConsent=consentRecord?Object.assign({},consentRecord,{isApproval:true,mutationApprovalGranted:true}):null;
    const unsafeConsentValidation=unsafeConsent?namespace.validateContract("consentRecord",unsafeConsent):null;
    check("Consent Contract rejects Approval escalation",unsafeConsentValidation&&unsafeConsentValidation.valid===false,unsafeConsentValidation&&unsafeConsentValidation.failed,"Negative Contract","Critical");
    const unsafeGate=p0Record?Object.assign({},p0Record,{dispatchExecuted:true,repositoryWriteCount:1}):null;
    const unsafeGateValidation=unsafeGate?namespace.validateContract("authorizationGate",unsafeGate):null;
    check("Gate Contract rejects Dispatch execution / Repository write",unsafeGateValidation&&unsafeGateValidation.valid===false,unsafeGateValidation&&unsafeGateValidation.failed,"Negative Contract","Critical");
    const noBypassFixture=grounding?Object.assign({},grounding,{providerCompositionUsed:true}):null;
    const noBypassValidation=noBypassFixture?namespace.validateContract("groundingContext",noBypassFixture):null;
    check("Fixed Contract Validator now enforces No-Bypass on object payload",noBypassValidation&&noBypassValidation.valid===false,noBypassValidation&&noBypassValidation.failed,"Contract Regression","Critical");
    check("Phase 4 never invokes IDE-160 Adapter as Dispatch",namespace.modules.gate&&namespace.modules.gate.dispatchImplemented===false,namespace.modules.gate&&namespace.modules.gate.dispatchImplemented,"Dispatch Boundary","Critical");
    check("Phase 4 never mutates Repository",namespace.modules.gate&&namespace.modules.gate.repositoryMutationAllowed===false&&namespace.modules.approval.repositoryMutationAllowed===false,namespace.modules.gate&&namespace.modules.gate.repositoryMutationAllowed,"Mutation Boundary","Critical");

    const result=summarize(checks,"IDE-190-PHASE4-STAGE-A-VALIDATION","IDE-190 Phase 4 Stage A Gate / Approval / Consent PASS","IDE-190 Phase 4 Stage A Gate / Approval / Consent FAIL",{stage:"A",stageName:"Phase 4 Deterministic / Pre-Android Validation",phase4Complete:false,phase5Allowed:false,androidRealDeviceRequired:true,androidRealDevicePassed:false,releaseAllowed:false,ide190Complete:false,latestGateId:state.latestAuthorizationGateId,latestApprovalId:state.latestApprovalId,latestConsentId:state.latestConsentId});
    internal.markPhase4Validation(result); namespace.modules.phase4Validation.status=result.failed===0?"Pre-Device Ready":"Blocked"; return internal.clone(result);
  }

  async function runDevelopmentAutomationPhase4AndroidValidation(){
    const preDevice=await runDevelopmentAutomationPhase4Validation(); const c=collector(),checks=c.checks,check=c.check;
    check("Phase 4 Stage A is PASS",preDevice.failed===0&&preDevice.criticalFailed===0,preDevice.status,"Stage A","Critical");
    const userAgent=global.navigator&&global.navigator.userAgent||"";
    check("Android real-device environment is detected",/Android/i.test(userAgent),userAgent,"Android Runtime","Critical");
    check("Web Crypto SHA-256 is available",Boolean(global.crypto&&global.crypto.subtle&&typeof global.TextEncoder==="function"),Boolean(global.crypto&&global.crypto.subtle),"Android Runtime","Critical");
    check("IndexedDB is available",Boolean(global.indexedDB),Boolean(global.indexedDB),"Android Runtime","Critical");
    check("Fetch API is available",typeof global.fetch==="function",typeof global.fetch,"Android Runtime","Critical");
    const loaded=getLoadedScriptPaths(); EXPECTED_PHASE4_SCRIPT_FILES.forEach(function(file){check("Actual script loaded: "+file,loaded.includes(file),loaded.length,"Actual Script Loading","Critical");});
    let manifestLoad=null; if(typeof global.loadStaticScriptManifest==="function"){try{manifestLoad=await global.loadStaticScriptManifest();}catch(error){manifestLoad={ok:false,errors:[error&&error.message?error.message:String(error)]};}}
    check("Static Manifest loader API is available",typeof global.loadStaticScriptManifest==="function",typeof global.loadStaticScriptManifest,"Static Integrity","Critical");
    check("Static Manifest fetch/integrity succeeds",Boolean(manifestLoad&&manifestLoad.ok===true),manifestLoad&&manifestLoad.errors||[],"Static Integrity","Critical");
    if(manifestLoad&&manifestLoad.manifest){const normalized=(manifestLoad.manifest.scripts||[]).map(function(src){return String(src||"").split("?")[0].split("#")[0].replace(/^\.\//,"");});EXPECTED_PHASE4_SCRIPT_FILES.forEach(function(file){check("Static Manifest contains: "+file,normalized.includes(file),normalized.length,"Static Integrity","Critical");const hash=manifestLoad.manifest.hashes&&manifestLoad.manifest.hashes[file];check("Static Manifest has SHA-256: "+file,Boolean(hash&&/^[a-f0-9]{64}$/.test(String(hash.sha256||""))),hash&&hash.sha256,"Static Integrity","Critical");});}
    const gate=namespace.getLatestAuthorizationGate(); const approval=namespace.getAutomationApprovalStatus(); const consent=namespace.getAutomationConsent();
    check("Latest V4 Gate never executed Dispatch",Boolean(gate&&gate.dispatchExecuted===false),gate&&gate.gateId,"Dispatch Boundary","Critical");
    check("Latest V4 Gate wrote zero Repository records",Boolean(gate&&gate.repositoryMutation===false&&gate.repositoryWriteCount===0),gate&&gate.repositoryWriteCount,"Mutation Boundary","Critical");
    check("Approval runtime state is explicit",Boolean(approval&&approval.approval&&approval.approvalState),approval&&approval.approvalState&&approval.approvalState.status,"Approval","Critical");
    check("Consent remains separate from Approval",Boolean(consent&&consent.consent&&consent.consent.isApproval===false),consent&&consent.consent&&consent.consent.isApproval,"Consent","Critical");
    check("Android platform cannot grant Persistent Commit",namespace.getPlatformProfile().persistentCommitPermission===false,namespace.getPlatformProfile().persistentCommitPermission,"Cross-Device","Critical");
    check("Android platform cannot bypass Approval",namespace.getPlatformProfile().approvalBypassAllowed===false,namespace.getPlatformProfile().approvalBypassAllowed,"Cross-Device","Critical");
    const combined=preDevice.checks.concat(checks);const allPassed=combined.every(function(i){return i.passed;});const result=summarize(combined,"IDE-190-PHASE4-ANDROID-VALIDATION","IDE-190 Phase 4 Android Real Device Gate PASS","IDE-190 Phase 4 Android Real Device Gate FAIL",{stage:"B",stageName:"Phase 4 Android Real Device Validation",preDeviceValidationId:preDevice.id,preDevicePassed:preDevice.failed===0&&preDevice.criticalFailed===0,androidRealDeviceRequired:true,androidRealDevicePassed:allPassed,phaseGatePassed:allPassed,phase4Complete:allPassed,phase5Allowed:allPassed,releaseAllowed:false,ide190Complete:false,userAgent:userAgent});
    internal.markPhase4AndroidValidation(result); namespace.modules.phase4Validation.status=result.phaseGatePassed?"Phase 4 Gate Passed":"Blocked"; return internal.clone(result);
  }

  function getDevelopmentAutomationPhase4ValidationStatus(){return{componentId:"IDE-190",version:VERSION_MANIFEST.release.version,preDevice:internal.clone(state.lastPhase4Validation),android:internal.clone(state.lastPhase4AndroidValidation),phaseGatePassed:state.androidPhase4ValidationPassed===true,phase4Complete:state.androidPhase4ValidationPassed===true,phase5Allowed:state.androidPhase4ValidationPassed===true,releaseAllowed:false,ide190Complete:false};}
  Object.assign(namespace.api,{runDevelopmentAutomationPhase4Validation,runDevelopmentAutomationPhase4AndroidValidation,getDevelopmentAutomationPhase4ValidationStatus});Object.assign(namespace,namespace.api);
  namespace.modules.phase4Validation={id:"IDE-190-PHASE4-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:4,phaseName:"Gate / Approval / Consent",androidRealDeviceRequired:true,phaseGate:true,releaseGate:false,loadedAt:internal.nowIso()};
  global.runDevelopmentAutomationPhase4Validation=runDevelopmentAutomationPhase4Validation;global.runDevelopmentAutomationPhase4AndroidValidation=runDevelopmentAutomationPhase4AndroidValidation;global.getDevelopmentAutomationPhase4ValidationStatus=getDevelopmentAutomationPhase4ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
