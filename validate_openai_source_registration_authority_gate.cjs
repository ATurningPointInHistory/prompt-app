"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function stable(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";}
const secretRef="SECRET-OPENAI-LEGACY";
let approvalAdapter=null, authorityActive=false, authorityRevoked=false, sourceRecord=null, registrationCalls=0, refreshCalls=0, confirmCalls=0, paidCalls=0, budgetCalls=0, networkCalls=0;
const state={sourceRegistry:new Map()};
const ns={api:{},modules:{},__internal:{state,isPlainObject:v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)),text:(v,f='')=>String(v==null?f:v),clone,stableStringify:stable,nowIso:()=>new Date().toISOString(),unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),deepFreeze:v=>v,buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null})},
 getExternalIntelligenceGatewayClientState:()=>({healthState:"READY",session:{state:"ACTIVE",expiresAt:new Date(Date.now()+60000).toISOString()},sessionTokenPresentInMemory:true}),
  getExternalIntelligenceSecretMetadata:id=>id===secretRef?{secretReferenceId:id,secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}:null,
 listExternalIntelligenceSecretMetadata:()=>[{secretReferenceId:secretRef,secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}],
 validateExternalIntelligenceSecretReference:({secretReferenceId})=>({ok:secretReferenceId===secretRef,code:"EXTERNAL010_SECRET_REFERENCE_ACTIVE",data:{secretValueReturned:false}}),
 getExternalIntelligenceSource:id=>id==="SOURCE-OPENAI"?clone(sourceRecord):null,
 listExternalIntelligenceResourceBudgets:()=>[],
 setExternalIntelligenceAuthorityApprovalAdapter:adapter=>{approvalAdapter=adapter;return {ok:true,code:adapter?"SET":"RESET"};},
 createExternalIntelligenceAuthorityEnvelopeCandidate:input=>({ok:true,code:"CANDIDATE",data:{envelope:{authorityEnvelopeId:"AUTH-ONE",action:input.action,target:clone(input.target),purpose:input.purpose,state:"CANDIDATE"}}}),
 activateExternalIntelligenceAuthorityEnvelope:async(id,approvalInput)=>{if(!approvalAdapter)return {ok:false,code:"NO_ADAPTER"};const v=await approvalAdapter.verifyApproval({envelope:{authorityEnvelopeId:id,action:"REGISTER_EXTERNAL_SOURCE",target:{type:"source",id:"SOURCE-OPENAI"},purpose:"openai-provider-registration"},approvalInput});authorityActive=Boolean(v&&v.approved);return authorityActive?{ok:true,code:"ACTIVE",data:{envelope:{authorityEnvelopeId:id,state:"ACTIVE",approvalEvidenceId:v.interactionEvidenceId}}}:{ok:false,code:"DENIED"};},
 revokeExternalIntelligenceAuthorityEnvelope:(id)=>{authorityRevoked=true;authorityActive=false;return {ok:true,code:"REVOKED",data:{authorityEnvelopeId:id}};},
 registerExternalIntelligenceSource:async candidate=>{registrationCalls++;if(!authorityActive)return {ok:false,code:"AUTH_DENIED"};sourceRecord={...clone(candidate),enabled:false,lifecycleState:"REGISTERED",version:1,authorityGranted:false,immutable:true};state.sourceRegistry.set("SOURCE-OPENAI",sourceRecord);return {ok:true,code:"EXTERNAL010_SOURCE_REGISTERED",data:{source:clone(sourceRecord),secretValueStored:false}};},
 checkExternalIntelligenceResourceBudget:()=>{budgetCalls++;return {ok:false};},
 activateOpenAIGovernedPaidSource:()=>{paidCalls++;return {ok:false};}
};
const elements={externalOpenAISecretReference:{value:secretRef},externalOpenAIModel:{value:"gpt-5.6-luna"},externalOpenAIMaxOutput:{value:"100"},externalOpenAIPerRequestCap:{value:"0.01"},externalOpenAIBudget:{value:""},externalOpenAIImpact:{textContent:""}};
const store=new Map();
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:ns,EXTERNAL010VersionManifest:{release:{version:"1.20.1"},getModuleVersion:()=>"0.3.0"},TextEncoder,document:{getElementById:id=>elements[id]||null},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},externalConsoleRefresh:()=>{refreshCalls++;},confirm:()=>{confirmCalls++;return true;},setTimeout,clearTimeout,Date};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const f of ["17_external_intelligence_openai_provider_integration.js","17_external_intelligence_openai_provider_ui.js"]){vm.runInContext(fs.readFileSync(path.join(__dirname,f),"utf8"),context,{filename:f});}
(async()=>{
 const html=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("Source registration review and Project Owner approval controls are visible",html.includes("Source登録内容を確認")&&html.includes("Project OwnerとしてSource登録"),"controls-present");
 const review=context.externalOpenAIReviewSourceRegistration();
 check("Review is mutation-free and scope-limited",review.ok===true&&registrationCalls===0&&review.effects.sourceRegistration===true&&review.effects.paidActivation===false&&review.effects.budgetMutation===false&&review.effects.realApiRequest===false,review);
 const untrusted=await context.externalOpenAIApproveSourceRegistration({isTrusted:false});
 check("Untrusted / programmatic UI event is rejected",untrusted.ok===false&&untrusted.code==="EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED"&&registrationCalls===0,untrusted);
 const direct=await ns.registerOpenAIProviderSourceWithProjectOwnerApproval({secretReferenceId:secretRef,projectOwnerConfirmed:true,ownerInteractionTrusted:false,interactionEvidenceId:"TEST"});
 check("Integration gate independently requires trusted owner interaction",direct.ok===false&&direct.code==="EXTERNAL010_OPENAI_PROJECT_OWNER_INTERACTION_REQUIRED"&&registrationCalls===0,direct);
 const registered=await context.externalOpenAIApproveSourceRegistration({isTrusted:true});
 check("Trusted Project Owner confirmation registers SOURCE-OPENAI",registered.ok===true&&registered.data&&registered.data.registrationPerformed===true&&sourceRecord&&sourceRecord.lifecycleState==="REGISTERED"&&sourceRecord.enabled===false,registered);
 check("Registration authority is one-time and revoked after use",authorityRevoked===true&&authorityActive===false&&approvalAdapter===null,{authorityRevoked,authorityActive,approvalAdapterReset:approvalAdapter===null});
 check("Source registration does not activate paid API, mutate Budget, or perform network request",paidCalls===0&&budgetCalls===0&&networkCalls===0&&registered.data.paidActivationPerformed===false&&registered.data.budgetMutationPerformed===false,{paidCalls,budgetCalls,networkCalls,nextRequiredAction:registered.data.nextRequiredAction});
 check("Next action is Operation Contract registration authority",registered.data.nextRequiredAction==="REGISTER_SOURCE_OPERATION_CONTRACT_AUTHORITY",registered.data.nextRequiredAction);
 const failed=checks.filter(x=>!x.passed);const result={id:"OPENAI-API-INTEGRATION-SOURCE-REGISTRATION-AUTHORITY-GATE-VALIDATION",candidateVersion:"0.3.0",decisionIds:["EXTERNAL-010-DECISION-055","EXTERNAL-010-DECISION-056"],passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,sourceRegistrationPerformed:Boolean(sourceRecord),operationContractRegistrationPerformed:false,paidActivationPerformed:false,realPaidRequestPerformed:false,checks};console.log(JSON.stringify(result,null,2));process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
