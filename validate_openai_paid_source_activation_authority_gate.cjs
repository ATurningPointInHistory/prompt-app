"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function stable(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";}
let source={sourceId:"SOURCE-OPENAI",sourceName:"OpenAI Responses API",sourceType:"AI_SERVICE",provider:"OPENAI",category:"AI_PROVIDER",accessMode:"LOCAL_GATEWAY",adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",endpointPolicy:{canonicalHost:"api.openai.com",endpointReference:"OPENAI-RESPONSES-V1",allowRedirects:false},authenticationMode:"BEARER_TOKEN",secretReferenceId:"SECRET-OPENAI-LEGACY",allowedOperations:["INTERNAL_ANALYSIS"],allowedMethods:["POST"],pricingMode:"USAGE_BASED",costCurrency:"USD",enabled:false,lifecycleState:"REGISTERED",version:1,identityState:"VERIFIED",reliabilityState:"UNASSESSED",authorityGranted:false,immutable:true};
const op={operationContractId:"EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS",sourceId:"SOURCE-OPENAI",operationId:"INTERNAL_ANALYSIS",adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",method:"POST",endpoint:{exactUrl:"https://api.openai.com/v1/responses",canonicalHost:"api.openai.com",endpointReference:"OPENAI-RESPONSES-V1"},bodyPolicy:{mode:"JSON",fixedFields:{store:false}},retryPolicy:{maxAttempts:1},enabled:true,authorityGranted:false,immutable:true};
const budget={budgetId:"EXTERNAL-010-BUDGET-OPENAI-LEGACY-TEST",scopeType:"SOURCE",scopeId:"SOURCE-OPENAI",period:{type:"CURRENT_ALLOCATION"},currency:"USD",limits:{FINANCIAL_COST:{softLimit:3,hardLimit:5}},consumed:{FINANCIAL_COST:0},state:"ACTIVE",version:2,immutable:true};
const policy={usagePolicyId:"EXTERNAL-010-USAGE-POLICY-OPENAI-TEST",sourceId:"SOURCE-OPENAI",status:"ACTIVE",rights:{INTERNAL_ANALYSIS:{state:"ALLOWED_WITH_CONDITIONS",conditions:["TEST"],confidence:"MEDIUM"}},immutable:true};
let approvalAdapter=null,authorityEnvelope=null,authorityRevoked=false,commitCalls=0,auditCalls=0,networkCalls=0,refreshCalls=0;
const internal={state:{},isPlainObject:v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)),text:(v,f='')=>String(v==null?f:v),clone,stableStringify:stable,nowIso:()=>new Date().toISOString(),unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),deepFreeze:v=>v,buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null}),commitExternalIntelligenceSourceVersion:(id,patch)=>{if(id!=="SOURCE-OPENAI")return null;commitCalls++;source={...source,...clone(patch),version:(source.version||1)+1,updatedAt:new Date().toISOString()};return clone(source);}};
const ns={api:{},modules:{},__internal:internal,
 getExternalIntelligenceGatewayClientState:()=>({healthState:"READY",session:{state:"ACTIVE",expiresAt:new Date(Date.now()+60000).toISOString()},sessionTokenPresentInMemory:true}),
 getExternalIntelligenceSource:id=>id==="SOURCE-OPENAI"?clone(source):null,
 getExternalIntelligenceSourceOperationContract:(sid,oid)=>sid==="SOURCE-OPENAI"&&oid==="INTERNAL_ANALYSIS"?clone(op):null,
 getExternalIntelligenceSecretMetadata:id=>id==="SECRET-OPENAI-LEGACY"?{secretReferenceId:id,secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}:null,
 listExternalIntelligenceSecretMetadata:()=>[{secretReferenceId:"SECRET-OPENAI-LEGACY",secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}],
 validateExternalIntelligenceSecretReference:()=>({ok:true,code:"ACTIVE",data:{secretValueReturned:false}}),
 listExternalIntelligenceResourceBudgets:()=>[clone(budget)],
 getExternalIntelligenceResourceBudget:id=>id===budget.budgetId?clone(budget):null,
 checkExternalIntelligenceResourceBudget:input=>input.budgetIds&&input.budgetIds.includes(budget.budgetId)&&input.estimatedUsage&&Number(input.estimatedUsage.FINANCIAL_COST)<=5?{ok:true,code:"EXTERNAL010_RESOURCE_BUDGET_CHECK_PASS",data:{budgetIds:[budget.budgetId],estimatedUsage:clone(input.estimatedUsage),hardLimitExceeded:false}}:{ok:false,code:"EXTERNAL010_RESOURCE_BUDGET_HARD_LIMIT_EXCEEDED",data:{}},
 getActiveExternalIntelligenceUsagePolicyForSource:id=>id==="SOURCE-OPENAI"?clone(policy):null,
 checkExternalIntelligenceUsagePolicy:input=>input.sourceId==="SOURCE-OPENAI"&&input.operation==="INTERNAL_ANALYSIS"?{ok:true,code:"EXTERNAL010_USAGE_POLICY_OPERATION_ALLOWED",data:{usagePolicyId:policy.usagePolicyId,allowed:true,right:clone(policy.rights.INTERNAL_ANALYSIS),legalAuthorityGranted:false}}:{ok:false,code:"BLOCKED"},
 setExternalIntelligenceAuthorityApprovalAdapter:adapter=>{approvalAdapter=adapter;return {ok:true,code:adapter?"SET":"RESET"};},
 createExternalIntelligenceAuthorityEnvelopeCandidate:input=>{authorityEnvelope={authorityEnvelopeId:"AUTH-PAID-ONE",action:input.action,target:clone(input.target),purpose:input.purpose,state:"CANDIDATE",approvalEvidenceId:null};return {ok:true,code:"CANDIDATE",data:{envelope:clone(authorityEnvelope)}};},
 activateExternalIntelligenceAuthorityEnvelope:async(id,approvalInput)=>{if(!approvalAdapter||!authorityEnvelope||id!==authorityEnvelope.authorityEnvelopeId)return {ok:false,code:"NO_ADAPTER"};const v=await approvalAdapter.verifyApproval({envelope:clone(authorityEnvelope),approvalInput});if(!v||!v.approved)return {ok:false,code:"DENIED"};authorityEnvelope={...authorityEnvelope,state:"ACTIVE",approvalEvidenceId:v.interactionEvidenceId};return {ok:true,code:"ACTIVE",data:{envelope:clone(authorityEnvelope)}};},
 evaluateExternalIntelligenceAuthority:input=>authorityEnvelope&&authorityEnvelope.state==="ACTIVE"&&authorityEnvelope.action===input.action&&authorityEnvelope.target.type===input.target.type&&authorityEnvelope.target.id===input.target.id&&authorityEnvelope.purpose===input.purpose?{allowed:true,decision:"ALLOW",reason:"ACTIVE_SCOPED_AUTHORITY",authorityEnvelopeId:authorityEnvelope.authorityEnvelopeId}:{allowed:false,decision:"DENY",reason:"NO_ACTIVE_AUTHORITY",authorityEnvelopeId:null},
 getExternalIntelligenceAuthorityEnvelope:id=>authorityEnvelope&&id===authorityEnvelope.authorityEnvelopeId?clone(authorityEnvelope):null,
 revokeExternalIntelligenceAuthorityEnvelope:()=>{authorityRevoked=true;if(authorityEnvelope)authorityEnvelope={...authorityEnvelope,state:"REVOKED"};return {ok:true,code:"REVOKED"};},
 appendExternalIntelligenceAuditEvent:async()=>{auditCalls++;return {ok:true};},
 prepareExternalIntelligenceAcquisitionRequest:()=>{networkCalls++;return {ok:false}}
};
const elements={externalOpenAISecretReference:{value:"SECRET-OPENAI-LEGACY"},externalOpenAIModel:{value:"gpt-5.6-luna"},externalOpenAIMaxOutput:{value:"100"},externalOpenAIPerRequestCap:{value:"0.01"},externalOpenAIBudget:{value:budget.budgetId},externalOpenAIBudgetSoftLimit:{value:"3"},externalOpenAIBudgetHardLimit:{value:"5"},externalOpenAIImpact:{textContent:""}};
const store=new Map();store.set("EXTERNAL010_OPENAI_UI_DRAFT_V1",JSON.stringify({model:"gpt-5.6-luna",maxOutputTokens:"100",perRequestHardCapUsd:"0.01",budgetId:budget.budgetId,budgetCandidateId:"",budgetSoftLimitUsd:"3",budgetHardLimitUsd:"5",usagePolicyCandidateId:"",secretReferenceId:"SECRET-OPENAI-LEGACY"}));
const manifest={release:{version:"1.20.1"},authorityPolicy:{hardDeniedActions:["DIRECT_REPOSITORY_MUTATION","AUTOMATIC_KNOWLEDGE_PROMOTION","ACTIVATE_PAID_API","EXECUTE_TRADE"]},getModuleVersion:()=>"0.3.6"};
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:ns,EXTERNAL010VersionManifest:manifest,TextEncoder,document:{getElementById:id=>elements[id]||null},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},externalConsoleRefresh:()=>{refreshCalls++;},confirm:()=>true,setTimeout,clearTimeout,Date};context.window=context;context.globalThis=context;vm.createContext(context);
for(const f of ["17_external_intelligence_openai_provider_integration.js","17_external_intelligence_openai_provider_ui.js"]){vm.runInContext(fs.readFileSync(path.join(__dirname,f),"utf8"),context,{filename:f});}
(async()=>{
 const html=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("STEP 6 exposes Paid Activation review and approval controls",html.includes("Paid Activation内容を確認")&&html.includes("Project OwnerとしてPaid Source有効化"),"controls-present");
 const before=clone(source);
 const review=context.externalOpenAIReviewPaidActivation();
 check("Paid Activation review is mutation-free",review.ok===true&&review.code==="EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATION_REVIEW_READY"&&commitCalls===0&&source.lifecycleState===before.lifecycleState,review);
 check("Review requires RED risk and explicit Project Owner approval",review.data&&review.data.riskLevel==="RED"&&review.data.projectOwnerApprovalRequired===true,review.data);
 check("Generic ACTIVATE_PAID_API Hard Deny remains preserved",review.data&&review.data.genericActivatePaidApiHardDenyPreserved===true&&manifest.authorityPolicy.hardDeniedActions.includes("ACTIVATE_PAID_API"),manifest.authorityPolicy.hardDeniedActions);
 check("Review binds active USD Budget, Usage Policy, and per-request cap",review.data&&review.data.budgetIds.includes(budget.budgetId)&&review.data.usagePolicyId===policy.usagePolicyId&&review.data.perRequestHardCapUsd===0.01,review.data);
 const noBudget=ns.buildOpenAIPaidSourceActivationReview({budgetIds:[],perRequestHardCapUsd:0.01});
 check("Paid Activation fails closed without USD Budget",noBudget.ok===false&&noBudget.code==="EXTERNAL010_OPENAI_PAID_ACTIVATION_BUDGET_BLOCKED",noBudget);
 const untrusted=await context.externalOpenAIApprovePaidActivation({isTrusted:false});
 check("Programmatic/untrusted Paid Activation is rejected",untrusted.ok===false&&untrusted.code==="EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED"&&commitCalls===0,untrusted);
 const direct=await ns.activateOpenAIPaidSourceWithProjectOwnerApproval({budgetIds:[budget.budgetId],perRequestHardCapUsd:0.01,projectOwnerConfirmed:true,ownerInteractionTrusted:false,interactionEvidenceId:"TEST"});
 check("Integration gate independently requires trusted Project Owner interaction",direct.ok===false&&direct.code==="EXTERNAL010_OPENAI_PAID_SOURCE_PROJECT_OWNER_INTERACTION_REQUIRED"&&commitCalls===0,direct);
 const active=await context.externalOpenAIApprovePaidActivation({isTrusted:true});
 check("Trusted Project Owner activation makes SOURCE-OPENAI ACTIVE",active.ok===true&&active.data&&active.data.paidActivationPerformed===true&&source.lifecycleState==="ACTIVE"&&source.enabled===true&&commitCalls===1,active);
 check("Paid activation stores scoped Budget and cap policy",source.paidActivationPolicy&&source.paidActivationPolicy.budgetIds.includes(budget.budgetId)&&source.paidActivationPolicy.perRequestHardCapUsd===0.01&&source.paidActivationPolicy.currency==="USD",source.paidActivationPolicy);
 check("Paid Activation Authority is one-time and revoked",authorityRevoked===true&&approvalAdapter===null&&authorityEnvelope&&authorityEnvelope.state==="REVOKED",{authorityRevoked,approvalAdapterReset:approvalAdapter===null,envelopeState:authorityEnvelope&&authorityEnvelope.state});
 check("Activation preserves no-per-request approval inside approved scope",active.data&&active.data.noPerRequestHumanApprovalInsideApprovedScope===true,active.data);
 check("Activation performs no automatic Budget expansion/recharge/failover",active.data&&active.data.automaticBudgetExpansionPerformed===false&&active.data.automaticRechargePerformed===false&&active.data.automaticCredentialFailoverPerformed===false,active.data);
 check("Paid Activation performs no real OpenAI request",networkCalls===0&&active.data.realApiRequestPerformed===false,{networkCalls,realApiRequestPerformed:active.data.realApiRequestPerformed});
 check("Next action advances to Real API Test",active.data.nextRequiredAction==="REAL_API_TEST",active.data.nextRequiredAction);
 const workflow=ns.getOpenAISetupWorkflowState();
 check("Stepper advances to STEP 7 after Paid Activation",workflow.currentStep===7&&workflow.completed[6]===true&&workflow.nextAction==="Real API Test",workflow);
 const htmlAfter=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("STEP 6 collapses complete and STEP 7 becomes current",htmlAfter.includes("✅ STEP 6 · Paid Source Activation · 完了")&&htmlAfter.includes("▶ STEP 7 · Real API Test · 現在"),"stepper-advanced");
 check("Audit evidence is recorded without executing provider request",auditCalls===1&&networkCalls===0,{auditCalls,networkCalls});
 const failed=checks.filter(x=>!x.passed);const result={id:"OPENAI-API-INTEGRATION-PAID-SOURCE-ACTIVATION-AUTHORITY-GATE-VALIDATION",candidateVersion:"0.3.6",decisionIds:["EXTERNAL-010-DECISION-055","EXTERNAL-010-DECISION-056"],passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,paidActivationPerformed:source.lifecycleState==="ACTIVE",realPaidRequestPerformed:false,genericActivatePaidApiHardDenyPreserved:true,checks};console.log(JSON.stringify(result,null,2));process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
