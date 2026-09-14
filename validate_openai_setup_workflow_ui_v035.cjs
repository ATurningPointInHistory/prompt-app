"use strict";
const fs=require("fs"), vm=require("vm"), path=require("path");
const root=__dirname;
const code=fs.readFileSync(path.join(root,"17_external_intelligence_openai_provider_ui.js"),"utf8");
const checks=[];
function check(name,passed,detail){checks.push({name,passed:Boolean(passed),detail});}
const storage=new Map();
const namespace={
  __internal:{clone:v=>v==null?v:JSON.parse(JSON.stringify(v)),nowIso:()=>new Date().toISOString()},
  api:{},modules:{},
  getOpenAIProviderIntegrationProfile:()=>({defaultSecretReferenceId:"SECRET-OPENAI-LEGACY"}),
  listOpenAIModelPricingProfiles:()=>[],
  listExternalIntelligenceResourceBudgets:()=>[],
  listExternalIntelligenceSecretMetadata:()=>[],
  getExternalIntelligenceGatewayClientState:()=>({healthState:"UNKNOWN",session:null,sessionTokenPresentInMemory:false}),
  getExternalIntelligenceSource:()=>null,
  getExternalIntelligenceSourceOperationContract:()=>null,
  getActiveExternalIntelligenceUsagePolicyForSource:()=>null
};
const context={
  console, Date, JSON, Number, String, Boolean, Array, Object, Math,
  localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))},
  EXTERNAL010ExternalIntelligence:namespace,
  EXTERNAL010VersionManifest:{release:{version:"1.20.1"},getModuleVersion:()=>"1.20.1"},
};
context.window=context; context.globalThis=context;
vm.createContext(context); vm.runInContext(code,context,{filename:"17_external_intelligence_openai_provider_ui.js"});
const wf=namespace.getOpenAISetupWorkflowState;
check("Workflow state API is exported",typeof wf==="function",typeof wf);
function snap({runtime=false,source=false,op=false,budget=false,policy=false}={}){
  return {
    gatewayClientState: runtime?{healthState:"READY",session:{state:"ACTIVE",expiresAt:new Date(Date.now()+60000).toISOString()},sessionTokenPresentInMemory:true}:{healthState:"READY",session:null,sessionTokenPresentInMemory:false},
    source: source?{sourceId:"SOURCE-OPENAI",lifecycleState:"REGISTERED"}:null,
    operationContract: op?{operationContractId:"EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS"}:null,
    selectedBudget: budget?{budgetId:"BUDGET",state:"ACTIVE",hardLimit:5,consumed:0}:null,
    activeUsagePolicy: policy?{usagePolicyId:"POLICY",status:"ACTIVE"}:null
  };
}
const s1=wf(snap()); check("Step 1 is current before active Gateway session",s1.currentStep===1&&s1.nextAction.includes("Gateway"),s1);
const s2=wf(snap({runtime:true})); check("Step 2 opens after Runtime completes",s2.currentStep===2&&s2.completed[1]===true,s2);
const s3=wf(snap({runtime:true,source:true})); check("Step 3 opens after Source registration",s3.currentStep===3&&s3.completed[2]===true,s3);
const s4=wf(snap({runtime:true,source:true,op:true})); check("Step 4 opens after Operation registration",s4.currentStep===4&&s4.completed[3]===true,s4);
const s5=wf(snap({runtime:true,source:true,op:true,budget:true})); check("Step 5 opens after Active USD Budget",s5.currentStep===5&&s5.completed[4]===true,s5);
const s6=wf(snap({runtime:true,source:true,op:true,budget:true,policy:true})); check("Step 6 becomes next after Usage Policy ACTIVE",s6.currentStep===6&&s6.completed[5]===true&&s6.nextAction.includes("Paid"),s6);
const expired=wf({gatewayClientState:{healthState:"READY",session:{state:"ACTIVE",expiresAt:new Date(Date.now()-1000).toISOString()},sessionTokenPresentInMemory:true},source:{sourceId:"SOURCE-OPENAI"},operationContract:{},selectedBudget:{},activeUsagePolicy:{status:"ACTIVE"}});
check("Expired session returns workflow to Runtime step",expired.currentStep===1,expired);
check("Execution JSON is moved to collapsed details",code.includes('<summary>実行詳細 / JSON</summary>')&&code.includes('id="externalOpenAIImpact"'),"collapsed-json-detail");
check("Completed steps use collapsed details and current step alone opens",code.includes("const open=current?' open':''"),"current-only-open");
check("Future workflow steps are represented as locked progress chips",code.includes('7,label:"Real API Test"')&&code.includes('8,label:"Final Validation"')&&code.includes('current?"▶":"🔒"'),"future-locks");
const failed=checks.filter(x=>!x.passed).length;
const result={id:"OPENAI-API-SETUP-WORKFLOW-UI-V0.3.5-VALIDATION",candidateVersion:"0.3.5",decisionIds:["EXTERNAL-010-DECISION-055","EXTERNAL-010-DECISION-056"],passed:checks.length-failed,failed,total:checks.length,health:Math.round(((checks.length-failed)/checks.length)*1000)/10,paidActivationPerformed:false,realApiRequestPerformed:false,checks};
console.log(JSON.stringify(result,null,2)); process.exitCode=failed?1:0;
