"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
const elements={
 externalOpenAISecretReference:{value:"SECRET-OPENAI-LEGACY"},externalOpenAIModel:{value:"gpt-5.6-luna"},externalOpenAIMaxOutput:{value:"100"},externalOpenAIPerRequestCap:{value:"0.10"},externalOpenAIBudget:{value:"BUDGET-1"},externalOpenAIBudgetSoftLimit:{value:"3"},externalOpenAIBudgetHardLimit:{value:"5"},externalOpenAIImpact:{textContent:""}
};
const body={appendChild(node){elements[node.id]=node;node.parentNode=this;}};
const document={getElementById:id=>elements[id]||null,createElement:tag=>({tagName:String(tag).toUpperCase(),id:"",style:{},innerHTML:"",parentNode:null}),body,querySelector:()=>({open:false})};
const store=new Map();store.set("EXTERNAL010_OPENAI_UI_DRAFT_V1",JSON.stringify({model:"gpt-5.6-luna",maxOutputTokens:"100",perRequestHardCapUsd:"0.01",budgetId:"BUDGET-1",budgetCandidateId:"",budgetSoftLimitUsd:"3",budgetHardLimitUsd:"5",usagePolicyCandidateId:"",secretReferenceId:"SECRET-OPENAI-LEGACY"}));
const pricing={model:"gpt-5.6-luna",inputPerMTokUsd:0.2,outputPerMTokUsd:1.2};
const ns={api:{},modules:{},__internal:{clone:v=>v==null?v:JSON.parse(JSON.stringify(v)),nowIso:()=>new Date().toISOString(),isPlainObject:v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v))},getOpenAIProviderIntegrationProfile:()=>({defaultSecretReferenceId:"SECRET-OPENAI-LEGACY"}),getOpenAIModelPricingProfile:()=>pricing,listOpenAIModelPricingProfiles:()=>[pricing],listExternalIntelligenceResourceBudgets:()=>[],listExternalIntelligenceSecretMetadata:()=>[]};
const manifest={release:{version:"1.20.1"},getModuleVersion:()=>"0.3.10"};
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:ns,EXTERNAL010VersionManifest:manifest,document,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},Date,console};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,"17_external_intelligence_openai_provider_ui.js"),"utf8"),context,{filename:"17_external_intelligence_openai_provider_ui.js"});
const preview=context.externalOpenAIPreviewConfiguration();
const modal=elements.externalOpenAIReviewFeedbackModal;
check("High-impact configuration preview is detected",preview.riskLevel==="RED"&&preview.reasons.some(x=>String(x).includes("1回上限")),preview);
check("Problem/impact review opens Human-Centered feedback modal",modal&&modal.style.display==="flex",modal&&modal.style);
const src=fs.readFileSync(path.join(__dirname,"17_external_intelligence_openai_provider_ui.js"),"utf8");
check("Modal exposes dismiss, details, and approve-candidate controls",src.includes("変更しない")&&src.includes("詳細を見る")&&src.includes("修正候補を了承"),"controls-present");
check("Review feedback explicitly states no automatic Repository mutation",src.includes("自動でプログラムやRepositoryを書き換えません")&&src.includes("automaticRepositoryMutationPerformed:false"),"no-auto-mutation");
const approval=context.externalOpenAIReviewFeedbackAction("approve");
check("Project Owner acknowledgement approves only a repair candidate",approval&&approval.ok===true&&approval.code==="EXTERNAL010_OPENAI_REVIEW_CHANGE_CANDIDATE_APPROVED"&&approval.data.projectOwnerAcknowledged===true,approval);
check("Acknowledgement does not grant direct Repository mutation",approval.data.automaticRepositoryMutationPerformed===false&&approval.data.directRepositoryMutationAllowed===false,approval.data);
check("Issue classifier covers Usage reconciliation failure",src.includes("USAGE_RECONCILIATION")&&src.includes("Usage MetricとSecret情報を分離"),"usage-reconciliation-feedback");
check("Existing review details remain available in JSON output",elements.externalOpenAIImpact.textContent.includes("EXTERNAL010_OPENAI_REVIEW_CHANGE_CANDIDATE_APPROVED"),elements.externalOpenAIImpact.textContent);
const failed=checks.filter(x=>!x.passed);console.log(JSON.stringify({id:"OPENAI-HUMAN-CENTERED-REVIEW-FEEDBACK-V0.3.10",candidateVersion:"0.3.10",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,checks},null,2));process.exitCode=failed.length?1:0;
