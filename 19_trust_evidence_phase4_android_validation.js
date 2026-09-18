/* ============================================================
   FILE: 19_trust_evidence_phase4_android_validation.js
   EXTERNAL-020 Phase 4 / Android Real Device Validation
   NOTE: This validator MUST NOT execute a provider network call.
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P4=global.EXTERNAL020Phase4VersionManifest;
  if(!namespace||!namespace.__internal||!P4)return;
  const i=namespace.__internal;
  async function runExternal020Phase4AndroidValidation(){
    const checks=[];
    function add(name,passed,detail,group,severity){checks.push({name:name,passed:passed===true,detail:i.clone(detail==null?null:detail),group:group||"Functional",severity:severity||"Critical"});}
    const p4=typeof namespace.runExternal020Phase4Validation==="function"?await namespace.runExternal020Phase4Validation():null;
    add("Phase 4 functional validation remains PASS",Boolean(p4&&p4.failed===0&&p4.criticalFailed===0&&p4.passed===20&&p4.decision001RequirementsComplete===18&&p4.decision001Complete===true),p4&&{validationId:p4.validationId,version:p4.version,passed:p4.passed,failed:p4.failed,criticalFailed:p4.criticalFailed,decision001RequirementsComplete:p4.decision001RequirementsComplete,decision001Complete:p4.decision001Complete},"Prerequisite","Critical");
    const ua=global.navigator&&global.navigator.userAgent||"";
    add("Android real-device user agent detected",/Android/i.test(ua),ua,"Device","Critical");
    add("Browser DOM runtime is available",typeof global.document==="object",{documentType:typeof global.document},"Runtime","Critical");

    const ext=global.EXTERNAL010ExternalIntelligence||null;
    const governanceApis=["getOpenAIProviderIntegrationProfile","getOpenAIFinalValidation","getExternalIntelligenceSource","getExternalIntelligenceSourceOperationContract","checkExternalIntelligenceUsagePolicy","validateExternalIntelligenceSecretReference","prepareOpenAIResponsesRequest","setExternalIntelligenceAuthorityApprovalAdapter","createExternalIntelligenceAuthorityEnvelopeCandidate","activateExternalIntelligenceAuthorityEnvelope","revokeExternalIntelligenceAuthorityEnvelope","submitExternalIntelligenceAcquisition"];
    const missingApis=governanceApis.filter(function(name){return !ext||typeof ext[name]!=="function";});
    const readiness=typeof namespace.inspectExternal020ExternalAiGovernanceReadiness==="function"?namespace.inspectExternal020ExternalAiGovernanceReadiness():null;
    const liveReady=Boolean(readiness&&readiness.readiness==="EXTERNAL020_EXTERNAL_AI_READY");
    const failClosed=Boolean(readiness&&readiness.readiness==="EXTERNAL020_EXTERNAL_AI_NOT_READY"&&readiness.providerNetworkCallPerformed===false&&readiness.externalTransmissionPerformed===false&&readiness.paidApiExecutionPerformed===false);
    add("Android reuses EXTERNAL-010 OpenAI governance capability with live readiness fail-closed",!!readiness&&missingApis.length===0&&(liveReady||failClosed),{readiness:readiness,missingGovernanceApis:missingApis,liveProviderReady:liveReady,technicalValidationRequiresLiveProviderReadiness:false},"Integration","Critical");
    add("Android creates no second Provider / Secret / Budget / Gateway engine",!!readiness&&readiness.secondProviderEngineCreated===false&&readiness.secondSecretStoreCreated===false&&readiness.secondBudgetEngineCreated===false&&readiness.secondGatewayCreated===false,readiness,"Architecture","Critical");

    const policy=typeof namespace.getExternal020ExternalAiContextPolicy==="function"?namespace.getExternal020ExternalAiContextPolicy():null;
    add("Android External AI context remains bounded and explicit-evidence only",!!policy&&policy.maxEvidenceItems===8&&policy.maxTotalEvidenceChars===12000&&policy.maxPromptChars===18000&&policy.repositoryWideAutomaticTransmissionAllowed===false&&policy.explicitProjectOwnerTransmissionApprovalRequired===true,policy,"Context","Critical");
    const ctx=await namespace.buildExternal020ExternalAiContextPackage({question:"Assess Android reliability implications without deciding truth.",evidenceItems:[{evidenceId:"P4-ANDROID-E1",evidenceType:"RELIABILITY_PROFILE",sourceRef:"EXTERNAL020-PROFILE-ANDROID",excerpt:"Context-specific profile; universal reliability score remains disabled."},{evidenceId:"P4-ANDROID-E2",evidenceType:"HISTORICAL_ASSESSMENT",sourceRef:"EXTERNAL020-HISTORICAL-ANDROID",excerpt:"Historical grounding informs evidence but does not confirm truth."}]});
    add("Android can build bounded External AI context without transmission",ctx&&ctx.ok===true&&ctx.data.contextPackage.evidenceItemCount===2&&ctx.data.contextPackage.externalTransmissionPerformed===false&&ctx.data.contextPackage.providerNetworkCallPerformed===false&&ctx.data.contextPackage.secretValueIncluded===false,ctx,"Context","Critical");
    const secretBlocked=await namespace.buildExternal020ExternalAiContextPackage({question:"Assess",evidenceItems:[{evidenceId:"P4-ANDROID-SECRET",evidenceType:"EVIDENCE",excerpt:"api_key='sk-12345678901234567890'"}]});
    add("Android blocks secret-like evidence before provider preparation",secretBlocked&&secretBlocked.ok===false&&Array.isArray(secretBlocked.data&&secretBlocked.data.errors)&&secretBlocked.data.errors.some(function(x){return String(x).indexOf("SECRET_LIKE_VALUE_IN_EVIDENCE")===0;}),secretBlocked,"Negative","Critical");

    const providerProfile=ext&&typeof ext.getOpenAIProviderIntegrationProfile==="function"?ext.getOpenAIProviderIntegrationProfile():null;
    const validationBody={model:"gpt-5.6-luna",input:"EXTERNAL-020 Phase 4 Android non-executing validation fixture",store:false,max_output_tokens:64,instructions:"Validation candidate only. Do not execute."};
    const contractPrepared=ext&&typeof ext.prepareOpenAIResponsesRequest==="function"?ext.prepareOpenAIResponsesRequest({body:validationBody,perRequestHardCapUsd:0.05,budgetIds:["EXTERNAL020-ANDROID-VALIDATION-NONEXECUTING-BUDGET-REFERENCE"],purpose:"external020-phase4-android-nonexecuting-validation",requestedBy:"EXTERNAL-020 / Phase 4 Android Validation",timeoutMs:60000}):null;
    const prepared=await namespace.prepareExternal020ExternalAiReliabilityReasoning({question:"Assess reliability and preserve uncertainty on Android.",evidenceItems:[{evidenceId:"P4-ANDROID-E1",evidenceType:"RELIABILITY_PROFILE",excerpt:"Context-specific profile; no universal score."}],model:"gpt-5.6-luna"});
    const preparationState=liveReady?Boolean(prepared&&prepared.ok===true&&prepared.data&&prepared.data.requestCandidate):Boolean(prepared&&prepared.ok===false&&prepared.code==="EXTERNAL020_PHASE4_EXTERNAL_AI_NOT_READY"&&prepared.data&&prepared.data.providerNetworkCallPerformed===false);
    add("Android provider request preparation reuses EXTERNAL-010 contract or safely blocks when LIVE not ready",contractPrepared&&contractPrepared.ok===true&&contractPrepared.data&&contractPrepared.data.requestCandidate&&contractPrepared.data.requestCandidate.sourceId==="SOURCE-OPENAI"&&contractPrepared.data.requestCandidate.operationId==="INTERNAL_ANALYSIS"&&preparationState,{contractPrepared:contractPrepared,external020Preparation:prepared,liveProviderReady:liveReady},"Integration","Critical");
    const body=contractPrepared&&contractPrepared.data&&contractPrepared.data.requestCandidate&&contractPrepared.data.requestCandidate.body||{};
    const cap=providerProfile&&providerProfile.initialCapability||{};
    add("Android provider request keeps store=false and no tool/file/web/computer capability",body.store===false&&!Object.prototype.hasOwnProperty.call(body,"tools")&&!Object.prototype.hasOwnProperty.call(body,"files")&&!Object.prototype.hasOwnProperty.call(body,"web_search")&&!Object.prototype.hasOwnProperty.call(body,"computer_use")&&providerProfile&&providerProfile.storeRequiredValue===false&&cap.tools===false&&cap.files===false&&cap.webSearch===false&&cap.computerUse===false,{bodyKeys:Object.keys(body),providerProfile:providerProfile},"Safety","Critical");

    const denied=await namespace.executeExternal020ExternalAiReliabilityReasoning({question:"Assess",evidenceItems:[{evidenceId:"P4-ANDROID-E1",evidenceType:"EVIDENCE",excerpt:"Evidence"}]});
    add("Android provider execution is blocked without explicit Project Owner external-transmission approval",denied&&denied.ok===false&&denied.code==="EXTERNAL020_PHASE4_EXTERNAL_TRANSMISSION_PROJECT_OWNER_APPROVAL_REQUIRED"&&denied.data.providerNetworkCallPerformed===false&&denied.data.externalTransmissionPerformed===false,denied,"Authority","Critical");

    const normalized=namespace.buildExternal020ExternalAiReasoningCandidate({requestId:"P4-ANDROID-REQ",contextPackageId:"P4-ANDROID-CTX",contextHash:"P4-ANDROID-HASH",providerResponseId:"resp_android_fixture",modelReported:"gpt-5.6-luna",outputClassification:"AI_RELIABILITY_REASONING_CANDIDATE_ONLY",rawProviderPayload:{output:[{content:[{text:"Evidence supports a proposal candidate; truth remains unresolved."}]}]},providerNetworkCallPerformed:true,externalTransmissionPerformed:true,paidApiExecutionPerformed:true,usageReconciliation:{reconciled:true}});
    const rc=normalized&&normalized.ok&&normalized.data&&normalized.data.reasoningCandidate||null;
    add("Android provider output normalizes only as AI_RELIABILITY_REASONING_CANDIDATE_ONLY",!!rc&&rc.outputClassification==="AI_RELIABILITY_REASONING_CANDIDATE_ONLY"&&rc.truthConfirmed===false&&rc.reliabilityScore===null&&rc.authorityScore===null,normalized,"Reasoning","Critical");
    add("Android External AI output cannot auto-resolve conflict, revise Profile, promote Knowledge, or grant authority",!!rc&&rc.automaticConflictResolutionPerformed===false&&rc.profileRevisionPerformed===false&&rc.knowledgePromotionPerformed===false&&rc.actionAuthorityGranted===false&&rc.tradingAuthorityGranted===false&&rc.financialAuthorityGranted===false&&rc.businessAuthorityGranted===false&&rc.canonicalRepositoryMutationPerformed===false,rc,"Authority","Critical");
    add("IDE-170 Confidence remains untouched on Android",!!rc&&rc.ide170ConfidenceOverwritten===false&&P4.safety.ide170ConfidenceOverwriteAllowed===false,{ide170ConfidenceOverwritten:rc&&rc.ide170ConfidenceOverwritten,overwriteAllowed:P4.safety.ide170ConfidenceOverwriteAllowed},"Safety","Critical");
    add("Android validation performs no provider network call, external transmission, paid API, or Canonical mutation",P4.safety.validationMayExecuteProviderNetworkCall===false&&P4.safety.validationMayTransmitExternally===false&&P4.safety.validationMayConsumePaidApi===false&&P4.safety.canonicalRepositoryMutationAllowed===false,{providerNetworkCallPerformed:false,externalTransmissionPerformed:false,paidApiExecutionPerformed:false,canonicalMutationPerformed:false},"Safety","Critical");
    add("Android External AI reuse does not enable universal Trust Score or global source ranking",P4.safety.universalTrustScoreImplemented===false&&P4.safety.permanentGlobalSourceRankingImplemented===false,P4.safety,"Safety","Critical");

    const p3Coverage=typeof namespace.getExternal020Phase3Decision001Coverage==="function"?namespace.getExternal020Phase3Decision001Coverage():null;
    add("Android preserves Frozen Phase 3 coverage at 17/18",!!p3Coverage&&p3Coverage.decisionRequirementsFullyImplemented===17&&p3Coverage.allDecisionRequirementsComplete===false&&p3Coverage.remainingRequirementIds.length===1&&p3Coverage.remainingRequirementIds[0]==="REQ-020-015",p3Coverage,"Regression","Critical");
    const coverage=typeof namespace.getExternal020Phase4Decision001Coverage==="function"?namespace.getExternal020Phase4Decision001Coverage():null;
    add("Android Decision 001 traceability reaches 18/18 through REQ-020-015",!!coverage&&coverage.totalDecisionRequirements===18&&coverage.decisionRequirementsFullyImplemented===18&&coverage.allDecisionRequirementsComplete===true&&coverage.remainingRequirementIds.length===0,coverage,"Traceability","Critical");
    add("Android Decision 001 completion does not equal Project Owner acceptance or release",!!coverage&&coverage.allDecisionRequirementsComplete===true&&P4.status==="IMPLEMENTATION_PHASE4_CANDIDATE",{decisionComplete:coverage&&coverage.allDecisionRequirementsComplete,projectOwnerAcceptanceRequired:true,releaseAllowed:false},"Authority","Critical");
    add("Android External AI reasoning does not equal Truth or action authority",P4.safety.providerOutputMayConfirmTruth===false&&P4.safety.providerOutputMayGrantActionAuthority===false&&P4.safety.reliabilityEqualsTruth===false&&P4.safety.reliabilityEqualsActionAuthority===false&&P4.safety.selfGrantedAuthorityAllowed===false,P4.safety,"Authority","Critical");
    add("Android validation does not equal Project Owner approval",global.EXTERNAL020VersionManifest&&global.EXTERNAL020VersionManifest.safety.validationEqualsApproval===false,{validationEqualsApproval:global.EXTERNAL020VersionManifest&&global.EXTERNAL020VersionManifest.safety.validationEqualsApproval},"Authority","Critical");

    const failedChecks=checks.filter(function(c){return !c.passed;});
    const criticalFailed=failedChecks.filter(function(c){return c.severity==="Critical";}).length;
    const passed=checks.length-failedChecks.length;
    const gatePassed=failedChecks.length===0;
    return i.deepFreeze({
      validationId:i.nextId("EXTERNAL020-PHASE4-ANDROID-REAL-DEVICE"),componentId:P4.componentId,decisionId:P4.decisionId,version:P4.version,phase:4,
      passed:passed,failed:failedChecks.length,total:checks.length,health:Number((passed/checks.length*100).toFixed(1)),criticalFailed:criticalFailed,
      status:gatePassed?"EXTERNAL-020 Phase 4 Android Real Device Validation PASS":"EXTERNAL-020 Phase 4 Android Real Device Validation FAIL",
      androidRealDeviceValidation:{passed:gatePassed,userAgent:ua},phase4AndroidRealDeviceComplete:gatePassed,phase4ProjectOwnerGateReady:gatePassed,
      decision001RequirementsComplete:coverage?coverage.decisionRequirementsFullyImplemented:null,decision001RequirementsTotal:coverage?coverage.totalDecisionRequirements:null,decision001Complete:Boolean(coverage&&coverage.allDecisionRequirementsComplete),
      releaseAllowed:false,projectOwnerAcceptanceRequired:true,validationIsApproval:false,canonicalMutationPerformed:false,externalTransmissionPerformed:false,providerNetworkCallPerformed:false,paidApiExecutionPerformed:false,
      historicalOutcomeGroundedEvaluationPerformed:true,externalAiReliabilityReasoningImplemented:true,externalAiReliabilityReasoningPerformed:false,
      checks:checks,validatedAt:i.nowIso(),immutable:true
    });
  }
  Object.assign(namespace.api,{runExternal020Phase4AndroidValidation:runExternal020Phase4AndroidValidation});Object.assign(namespace,namespace.api);
  namespace.modules.phase4AndroidValidation={id:"EXTERNAL-020-PHASE4-ANDROID-REAL-DEVICE-VALIDATION",version:P4.version,status:"Ready",phase:4,releaseAllowed:false,validationIsApproval:false,loadedAt:i.nowIso()};
  global.runExternal020Phase4AndroidValidation=runExternal020Phase4AndroidValidation;
})(typeof window!=="undefined"?window:globalThis);
