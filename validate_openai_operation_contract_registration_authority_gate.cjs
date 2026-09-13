"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function stable(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";}
const sourceRecord={sourceId:"SOURCE-OPENAI",sourceName:"OpenAI Responses API",sourceType:"AI_SERVICE",provider:"OPENAI",category:"AI_PROVIDER",accessMode:"LOCAL_GATEWAY",adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",endpointPolicy:{canonicalHost:"api.openai.com",endpointReference:"OPENAI-RESPONSES-V1",allowRedirects:false},authenticationMode:"BEARER_TOKEN",secretReferenceId:"SECRET-OPENAI-LEGACY",allowedOperations:["INTERNAL_ANALYSIS"],allowedMethods:["POST"],pricingMode:"USAGE_BASED",costCurrency:"USD",enabled:false,lifecycleState:"REGISTERED",version:1,identityState:"VERIFIED",reliabilityState:"UNASSESSED",authorityGranted:false,immutable:true};
let operationRecord=null,approvalAdapter=null,authorityActive=false,authorityRevoked=false,registrationCalls=0,refreshCalls=0,paidCalls=0,budgetCalls=0,networkCalls=0,sourceEnableCalls=0;
const ns={api:{},modules:{},__internal:{state:{sourceRegistry:new Map([["SOURCE-OPENAI",sourceRecord]])},isPlainObject:v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)),text:(v,f='')=>String(v==null?f:v),clone,stableStringify:stable,nowIso:()=>new Date().toISOString(),unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),deepFreeze:v=>v,buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null})},
 getExternalIntelligenceSource:id=>id==="SOURCE-OPENAI"?clone(sourceRecord):null,
 getExternalIntelligenceSourceOperationContract:(sourceId,operationId)=>sourceId==="SOURCE-OPENAI"&&operationId==="INTERNAL_ANALYSIS"?clone(operationRecord):null,
 listExternalIntelligenceResourceBudgets:()=>[],
 getExternalIntelligenceSecretMetadata:id=>id==="SECRET-OPENAI-LEGACY"?{secretReferenceId:id,secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}:null,
 listExternalIntelligenceSecretMetadata:()=>[{secretReferenceId:"SECRET-OPENAI-LEGACY",secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}],
 validateExternalIntelligenceSecretReference:()=>({ok:true,code:"ACTIVE"}),
 setExternalIntelligenceAuthorityApprovalAdapter:adapter=>{approvalAdapter=adapter;return {ok:true,code:adapter?"SET":"RESET"};},
 createExternalIntelligenceAuthorityEnvelopeCandidate:input=>({ok:true,code:"CANDIDATE",data:{envelope:{authorityEnvelopeId:"AUTH-OP-ONE",action:input.action,target:clone(input.target),purpose:input.purpose,state:"CANDIDATE"}}}),
 activateExternalIntelligenceAuthorityEnvelope:async(id,approvalInput)=>{if(!approvalAdapter)return {ok:false,code:"NO_ADAPTER"};const envelope={authorityEnvelopeId:id,action:"REGISTER_SOURCE_OPERATION_CONTRACT",target:{type:"source-operation",id:"EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS"},purpose:"phase4-operation-contract"};const v=await approvalAdapter.verifyApproval({envelope,approvalInput});authorityActive=Boolean(v&&v.approved);return authorityActive?{ok:true,code:"ACTIVE",data:{envelope:{...envelope,state:"ACTIVE",approvalEvidenceId:v.interactionEvidenceId}}}:{ok:false,code:"DENIED"};},
 revokeExternalIntelligenceAuthorityEnvelope:()=>{authorityRevoked=true;authorityActive=false;return {ok:true,code:"REVOKED"};},
 registerExternalIntelligenceSourceOperationContract:async candidate=>{registrationCalls++;if(!authorityActive)return {ok:false,code:"AUTH_DENIED"};operationRecord={...clone(candidate),authorityGranted:false,immutable:true};return {ok:true,code:"EXTERNAL010_SOURCE_OPERATION_CONTRACT_REGISTERED",data:{operationContract:clone(operationRecord),authority:{authorityEnvelopeId:"AUTH-OP-ONE"}}};},
 enableExternalIntelligenceSource:()=>{sourceEnableCalls++;return {ok:false};},
 checkExternalIntelligenceResourceBudget:()=>{budgetCalls++;return {ok:false};},
 activateOpenAIGovernedPaidSource:()=>{paidCalls++;return {ok:false};}
};
const elements={externalOpenAISecretReference:{value:"SECRET-OPENAI-LEGACY"},externalOpenAIModel:{value:"gpt-5.6-luna"},externalOpenAIMaxOutput:{value:"100"},externalOpenAIPerRequestCap:{value:"0.01"},externalOpenAIBudget:{value:""},externalOpenAIImpact:{textContent:""}};
const store=new Map();
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:ns,EXTERNAL010VersionManifest:{release:{version:"1.20.1"},getModuleVersion:()=>"0.3.2"},TextEncoder,document:{getElementById:id=>elements[id]||null},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},externalConsoleRefresh:()=>{refreshCalls++;},confirm:()=>true,setTimeout,clearTimeout,Date};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const f of ["17_external_intelligence_openai_provider_integration.js","17_external_intelligence_openai_provider_ui.js"]){vm.runInContext(fs.readFileSync(path.join(__dirname,f),"utf8"),context,{filename:f});}
(async()=>{
 const html=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("Operation registration review and Project Owner approval controls are visible",html.includes("Operation登録内容を確認")&&html.includes("Project OwnerとしてOperation登録"),"controls-present");
 const review=context.externalOpenAIReviewOperationContractRegistration();
 check("Operation review is mutation-free and scope-limited",review.ok===true&&registrationCalls===0&&review.effects.operationContractRegistration===true&&review.effects.sourceEnablement===false&&review.effects.paidActivation===false&&review.effects.budgetMutation===false&&review.effects.realApiRequest===false,review);
 const untrusted=await context.externalOpenAIApproveOperationContractRegistration({isTrusted:false});
 check("Untrusted / programmatic UI event is rejected",untrusted.ok===false&&untrusted.code==="EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED"&&registrationCalls===0,untrusted);
 const direct=await ns.registerOpenAIResponsesOperationContractWithProjectOwnerApproval({projectOwnerConfirmed:true,ownerInteractionTrusted:false,interactionEvidenceId:"TEST"});
 check("Integration gate independently requires trusted owner interaction",direct.ok===false&&direct.code==="EXTERNAL010_OPENAI_OPERATION_CONTRACT_PROJECT_OWNER_INTERACTION_REQUIRED"&&registrationCalls===0,direct);
 const registered=await context.externalOpenAIApproveOperationContractRegistration({isTrusted:true});
 check("Trusted Project Owner confirmation registers OpenAI Operation Contract",registered.ok===true&&registered.data&&registered.data.operationContractRegistrationPerformed===true&&operationRecord&&operationRecord.operationContractId==="EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS"&&operationRecord.method==="POST",registered);
 check("Operation registration authority is one-time and revoked after use",authorityRevoked===true&&authorityActive===false&&approvalAdapter===null,{authorityRevoked,authorityActive,approvalAdapterReset:approvalAdapter===null});
 check("Operation registration does not enable Source, activate paid API, mutate Budget, or perform network request",sourceEnableCalls===0&&paidCalls===0&&budgetCalls===0&&networkCalls===0&&registered.data.paidActivationPerformed===false&&registered.data.budgetMutationPerformed===false&&registered.data.realApiRequestPerformed===false,{sourceEnableCalls,paidCalls,budgetCalls,networkCalls});
 check("Next action is USD Resource Budget",registered.data.nextRequiredAction==="USD_RESOURCE_BUDGET",registered.data.nextRequiredAction);
 const htmlAfter=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("UI shows Operation REGISTERED after registration",htmlAfter.includes("<span>Operation</span><strong>REGISTERED</strong>"),"operation-registered-visible");
 const failed=checks.filter(x=>!x.passed);const result={id:"OPENAI-API-INTEGRATION-OPERATION-CONTRACT-REGISTRATION-AUTHORITY-GATE-VALIDATION",candidateVersion:"0.3.2",decisionIds:["EXTERNAL-010-DECISION-055","EXTERNAL-010-DECISION-056"],passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,sourceRegistrationPrecondition:true,operationContractRegistrationPerformed:Boolean(operationRecord),paidActivationPerformed:false,realPaidRequestPerformed:false,checks};console.log(JSON.stringify(result,null,2));process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
