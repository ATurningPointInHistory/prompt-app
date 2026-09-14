"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function stable(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";}
const sourceRecord={sourceId:"SOURCE-OPENAI",sourceName:"OpenAI Responses API",sourceType:"AI_SERVICE",provider:"OPENAI",category:"AI_PROVIDER",accessMode:"LOCAL_GATEWAY",adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",endpointPolicy:{canonicalHost:"api.openai.com",endpointReference:"OPENAI-RESPONSES-V1",allowRedirects:false},authenticationMode:"BEARER_TOKEN",secretReferenceId:"SECRET-OPENAI-LEGACY",allowedOperations:["INTERNAL_ANALYSIS"],allowedMethods:["POST"],pricingMode:"USAGE_BASED",costCurrency:"USD",enabled:false,lifecycleState:"REGISTERED",version:1,identityState:"VERIFIED",reliabilityState:"UNASSESSED",authorityGranted:false,immutable:true};
const operationRecord={operationContractId:"EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS",sourceId:"SOURCE-OPENAI",operationId:"INTERNAL_ANALYSIS",adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",method:"POST",endpoint:{exactUrl:"https://api.openai.com/v1/responses",canonicalHost:"api.openai.com",endpointReference:"OPENAI-RESPONSES-V1"},bodyPolicy:{mode:"JSON",fixedFields:{store:false}},retryPolicy:{maxAttempts:1},enabled:true,authorityGranted:false,immutable:true};
const budgetMap=new Map();let approvalAdapter=null,authorityActive=false,authorityRevoked=false,budgetCreateCalls=0,budgetActivateCalls=0,paidCalls=0,networkCalls=0,refreshCalls=0;
const ns={api:{},modules:{},__internal:{state:{sourceRegistry:new Map([["SOURCE-OPENAI",sourceRecord]])},isPlainObject:v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)),text:(v,f='')=>String(v==null?f:v),clone,stableStringify:stable,nowIso:()=>new Date().toISOString(),unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),deepFreeze:v=>v,buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null})},
 getExternalIntelligenceGatewayClientState:()=>({healthState:"READY",session:{state:"ACTIVE",expiresAt:new Date(Date.now()+60000).toISOString()},sessionTokenPresentInMemory:true}),
  getExternalIntelligenceSource:id=>id==="SOURCE-OPENAI"?clone(sourceRecord):null,
 getExternalIntelligenceSourceOperationContract:(sourceId,operationId)=>sourceId==="SOURCE-OPENAI"&&operationId==="INTERNAL_ANALYSIS"?clone(operationRecord):null,
 getExternalIntelligenceSecretMetadata:id=>id==="SECRET-OPENAI-LEGACY"?{secretReferenceId:id,secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}:null,
 listExternalIntelligenceSecretMetadata:()=>[{secretReferenceId:"SECRET-OPENAI-LEGACY",secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}],
 validateExternalIntelligenceSecretReference:()=>({ok:true,code:"ACTIVE"}),
 listExternalIntelligenceResourceBudgets:()=>Array.from(budgetMap.values()).map(clone),
 getExternalIntelligenceResourceBudget:id=>budgetMap.has(id)?clone(budgetMap.get(id)):null,
 createExternalIntelligenceResourceBudgetCandidate:input=>{budgetCreateCalls++;const rec={budgetId:input.budgetId,scopeType:input.scopeType,scopeId:input.scopeId,parentBudgetId:null,period:clone(input.period),currency:input.currency,limits:clone(input.limits),consumed:{FINANCIAL_COST:0},state:"CANDIDATE",authorityGranted:false,automaticReallocationAllowed:false,version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),immutable:true};budgetMap.set(rec.budgetId,rec);return {ok:true,code:"EXTERNAL010_RESOURCE_BUDGET_CANDIDATE_CREATED",data:{budget:clone(rec)}};},
 setExternalIntelligenceAuthorityApprovalAdapter:adapter=>{approvalAdapter=adapter;return {ok:true,code:adapter?"SET":"RESET"};},
 createExternalIntelligenceAuthorityEnvelopeCandidate:input=>({ok:true,code:"CANDIDATE",data:{envelope:{authorityEnvelopeId:"AUTH-BUDGET-ONE",action:input.action,target:clone(input.target),purpose:input.purpose,state:"CANDIDATE"}}}),
 activateExternalIntelligenceAuthorityEnvelope:async(id,approvalInput)=>{if(!approvalAdapter)return {ok:false,code:"NO_ADAPTER"};const targetId=Array.from(budgetMap.keys())[0];const envelope={authorityEnvelopeId:id,action:"ACTIVATE_RESOURCE_BUDGET",target:{type:"resource-budget",id:targetId},purpose:"openai-usd-resource-budget"};const v=await approvalAdapter.verifyApproval({envelope,approvalInput});authorityActive=Boolean(v&&v.approved);return authorityActive?{ok:true,code:"ACTIVE",data:{envelope:{...envelope,state:"ACTIVE",approvalEvidenceId:v.interactionEvidenceId}}}:{ok:false,code:"DENIED"};},
 revokeExternalIntelligenceAuthorityEnvelope:()=>{authorityRevoked=true;authorityActive=false;return {ok:true,code:"REVOKED"};},
 activateExternalIntelligenceResourceBudget:async input=>{budgetActivateCalls++;if(!authorityActive)return {ok:false,code:"AUTH_DENIED"};const rec=budgetMap.get(input.budgetId);if(!rec)return {ok:false,code:"NOT_FOUND"};const next={...rec,state:"ACTIVE",version:2,updatedAt:new Date().toISOString()};budgetMap.set(next.budgetId,next);return {ok:true,code:"EXTERNAL010_RESOURCE_BUDGET_ACTIVATED",data:{budget:clone(next),authority:{authorityEnvelopeId:"AUTH-BUDGET-ONE"}}};},
 activateOpenAIGovernedPaidSource:()=>{paidCalls++;return {ok:false}},
 prepareOpenAIResponsesRequest:()=>{networkCalls++;return {ok:false}}
};
const elements={externalOpenAISecretReference:{value:"SECRET-OPENAI-LEGACY"},externalOpenAIModel:{value:"gpt-5.6-luna"},externalOpenAIMaxOutput:{value:"100"},externalOpenAIPerRequestCap:{value:"0.01"},externalOpenAIBudget:{value:""},externalOpenAIBudgetSoftLimit:{value:"4"},externalOpenAIBudgetHardLimit:{value:"5"},externalOpenAIImpact:{textContent:""}};
const store=new Map();store.set("EXTERNAL010_OPENAI_UI_DRAFT_V1",JSON.stringify({model:"gpt-5.6-luna",maxOutputTokens:"100",perRequestHardCapUsd:"0.01",budgetId:"",budgetCandidateId:"",budgetSoftLimitUsd:"4",budgetHardLimitUsd:"5",secretReferenceId:"SECRET-OPENAI-LEGACY"}));
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:ns,EXTERNAL010VersionManifest:{release:{version:"1.20.1"},getModuleVersion:()=>"0.3.3"},TextEncoder,document:{getElementById:id=>elements[id]||null},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},externalConsoleRefresh:()=>{refreshCalls++;},confirm:()=>true,setTimeout,clearTimeout,Date};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const f of ["17_external_intelligence_openai_provider_integration.js","17_external_intelligence_openai_provider_ui.js"]){vm.runInContext(fs.readFileSync(path.join(__dirname,f),"utf8"),context,{filename:f});}
(async()=>{
 const html=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("USD Budget review/candidate/Project Owner controls are visible",html.includes("Budget内容を確認")&&html.includes("Budget候補を作成")&&html.includes("Project OwnerとしてBudget有効化"),"controls-present");
 const review=context.externalOpenAIReviewUsdBudget();
 check("Budget review is mutation-free and explicitly RED / Project Owner governed",review.ok===true&&budgetCreateCalls===0&&review.data&&review.data.currency==="USD"&&review.data.riskLevel==="RED"&&review.data.projectOwnerApprovalRequiredForActivation===true,review);
 check("Budget review binds LEGACY billing profile without secret value",review.data&&review.data.secretReferenceId==="SECRET-OPENAI-LEGACY"&&review.data.billingProfileId==="BILLING-OPENAI-LEGACY"&&!JSON.stringify(review).includes("sk-"),review.data);
 const invalid=ns.buildOpenAIUsdResourceBudgetReview({secretReferenceId:"SECRET-OPENAI-LEGACY",softLimitUsd:6,hardLimitUsd:5,perRequestHardCapUsd:0.01});
 check("Soft limit greater than Hard limit is blocked",invalid.ok===false&&invalid.code==="EXTERNAL010_OPENAI_USD_BUDGET_SOFT_LIMIT_INVALID",invalid);
 const capInvalid=ns.buildOpenAIUsdResourceBudgetReview({secretReferenceId:"SECRET-OPENAI-LEGACY",softLimitUsd:0.5,hardLimitUsd:1,perRequestHardCapUsd:2});
 check("Per-request cap greater than Budget hard limit is blocked",capInvalid.ok===false&&capInvalid.code==="EXTERNAL010_OPENAI_PER_REQUEST_CAP_EXCEEDS_BUDGET",capInvalid);
 const created=context.externalOpenAICreateUsdBudgetCandidate();
 check("Budget Candidate is created without activating paid API",created.ok===true&&created.data&&created.data.budget&&created.data.budget.state==="CANDIDATE"&&created.data.paidActivationPerformed===false&&budgetCreateCalls===1,created);
 const draftAfterCreate=JSON.parse(store.get("EXTERNAL010_OPENAI_UI_DRAFT_V1"));
 check("Candidate ID is retained in UI draft while active Budget remains unset",Boolean(draftAfterCreate.budgetCandidateId)&&!draftAfterCreate.budgetId,{budgetCandidateId:draftAfterCreate.budgetCandidateId,budgetId:draftAfterCreate.budgetId});
 const untrusted=await context.externalOpenAIApproveUsdBudget({isTrusted:false});
 check("Programmatic/untrusted Budget activation is rejected",untrusted.ok===false&&untrusted.code==="EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED"&&budgetActivateCalls===0,untrusted);
 const direct=await ns.activateOpenAIUsdResourceBudgetWithProjectOwnerApproval({budgetId:draftAfterCreate.budgetCandidateId,secretReferenceId:"SECRET-OPENAI-LEGACY",perRequestHardCapUsd:0.01,projectOwnerConfirmed:true,ownerInteractionTrusted:false,interactionEvidenceId:"TEST"});
 check("Integration gate independently requires trusted Project Owner interaction",direct.ok===false&&direct.code==="EXTERNAL010_OPENAI_BUDGET_PROJECT_OWNER_INTERACTION_REQUIRED"&&budgetActivateCalls===0,direct);
 const active=await context.externalOpenAIApproveUsdBudget({isTrusted:true});
 check("Trusted Project Owner activation makes USD Budget ACTIVE",active.ok===true&&active.data&&active.data.budgetActivated===true&&active.data.budget&&active.data.budget.state==="ACTIVE"&&budgetActivateCalls===1,active);
 check("Budget activation authority is one-time and revoked",authorityRevoked===true&&authorityActive===false&&approvalAdapter===null,{authorityRevoked,authorityActive,approvalAdapterReset:approvalAdapter===null});
 check("Budget activation performs no Paid Source activation or real API request",paidCalls===0&&networkCalls===0&&active.data.paidActivationPerformed===false&&active.data.realApiRequestPerformed===false,{paidCalls,networkCalls});
 check("Automatic Budget expansion/recharge remain disabled",active.data.automaticBudgetExpansionPerformed===false&&active.data.automaticRechargePerformed===false,active.data);
 check("Next action is Usage Policy",active.data.nextRequiredAction==="USAGE_POLICY",active.data.nextRequiredAction);
 const draftAfterActive=JSON.parse(store.get("EXTERNAL010_OPENAI_UI_DRAFT_V1"));
 check("Activated Budget is selected and Candidate pointer is cleared",Boolean(draftAfterActive.budgetId)&&draftAfterActive.budgetCandidateId==="",draftAfterActive);
 const htmlAfter=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("UI displays selected active USD Budget",htmlAfter.includes(draftAfterActive.budgetId)&&htmlAfter.includes("$5.00"),"active-budget-visible");
 const failed=checks.filter(x=>!x.passed);const result={id:"OPENAI-API-INTEGRATION-USD-RESOURCE-BUDGET-AUTHORITY-GATE-VALIDATION",candidateVersion:"0.3.3",decisionIds:["EXTERNAL-010-DECISION-055","EXTERNAL-010-DECISION-056"],passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,budgetCandidateCreated:budgetCreateCalls>0,budgetActivationPerformed:budgetActivateCalls>0,paidActivationPerformed:false,realPaidRequestPerformed:false,automaticBudgetExpansionPerformed:false,checks};console.log(JSON.stringify(result,null,2));process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
