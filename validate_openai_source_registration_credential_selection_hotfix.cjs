"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function stable(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";}
const LEGACY="SECRET-OPENAI-LEGACY",PRIMARY="SECRET-OPENAI-PRIMARY";
const store=new Map();
const metadata=new Map();
let refreshCalls=0;
const ns={api:{},modules:{},__internal:{state:{sourceRegistry:new Map()},isPlainObject:v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)),text:(v,f='')=>String(v==null?f:v),clone,stableStringify:stable,nowIso:()=>new Date().toISOString(),unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),deepFreeze:v=>v,buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null})},
 getExternalIntelligenceSource:()=>null,
 listExternalIntelligenceResourceBudgets:()=>[],
 getExternalIntelligenceSecretMetadata:id=>metadata.get(id)||null,
 listExternalIntelligenceSecretMetadata:()=>Array.from(metadata.values()).map(clone),
 validateExternalIntelligenceSecretReference:({secretReferenceId})=>({ok:Boolean(metadata.get(secretReferenceId)&&metadata.get(secretReferenceId).status==="ACTIVE"),code:"SECRET_STATE"}),
 getExternalIntelligenceGatewaySecretMetadataStatus:async({secretReferenceId})=>({ok:secretReferenceId===LEGACY,code:secretReferenceId===LEGACY?"SECRET_ACTIVE":"SECRET_MISSING",status:secretReferenceId===LEGACY?"Ready":"Blocked",data:secretReferenceId===LEGACY?{secretMetadata:{secretReferenceId:LEGACY,secretType:"BEARER_TOKEN",status:"ACTIVE"},secretValueReturned:false}:null}),
 registerExternalIntelligenceSecretMetadata:input=>{const rec={secretReferenceId:input.secretReferenceId,secretType:input.secretType,provider:input.provider,status:input.status};metadata.set(input.secretReferenceId,rec);return {ok:true,code:"EXTERNAL010_SECRET_METADATA_REGISTERED",data:{secretMetadata:clone(rec)}};}
};
const elements={externalOpenAISecretReference:{value:LEGACY},externalOpenAIModel:{value:"gpt-5.6-luna"},externalOpenAIMaxOutput:{value:"100"},externalOpenAIPerRequestCap:{value:"0.01"},externalOpenAIBudget:{value:""},externalOpenAIImpact:{textContent:""}};
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:ns,EXTERNAL010VersionManifest:{release:{version:"1.20.1"},getModuleVersion:()=>"0.3.1"},TextEncoder,document:{getElementById:id=>elements[id]||null},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},externalConsoleRefresh:()=>{refreshCalls++;},setTimeout,clearTimeout,Date};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const f of ["17_external_intelligence_openai_provider_integration.js","17_external_intelligence_openai_provider_ui.js"]){vm.runInContext(fs.readFileSync(path.join(__dirname,f),"utf8"),context,{filename:f});}
(async()=>{
 const profile=ns.getOpenAIProviderIntegrationProfile();
 check("Decision 056 initial OpenAI default credential is LEGACY",profile.defaultSecretReferenceId===LEGACY,profile.defaultSecretReferenceId);
 const prepared=await context.externalOpenAIPrepareSecretReference();
 check("Secret preparation succeeds for selected LEGACY credential",prepared.ok===true&&prepared.secretReferenceId===LEGACY&&prepared.secretSelectionPersisted===true,prepared);
 const saved=JSON.parse(store.get("EXTERNAL010_OPENAI_UI_DRAFT_V1")||"{}");
 check("Successful Secret preparation persists selected Secret Reference",saved.secretReferenceId===LEGACY,saved);
 // Simulate rerender where DOM control is rebuilt from persisted draft.
 elements.externalOpenAISecretReference.value=saved.secretReferenceId||PRIMARY;
 const review=context.externalOpenAIReviewSourceRegistration();
 check("Source registration review remains bound to LEGACY after rerender",review.ok===true&&review.sourceCandidate&&review.sourceCandidate.secretReferenceId===LEGACY&&review.secretReference&&review.secretReference.active===true,review);
 const html=ns.renderOpenAIProviderIntegrationPanelHtml();
 check("UI explains where successful Source registration becomes visible",html.includes('Provider')&&html.includes('REGISTERED')&&html.includes('Sources'),"registration-feedback-present");
 const failed=checks.filter(x=>!x.passed);const result={id:"OPENAI-SOURCE-REGISTRATION-CREDENTIAL-SELECTION-HOTFIX-VALIDATION",candidateVersion:"0.3.1",decisionIds:["EXTERNAL-010-DECISION-055","EXTERNAL-010-DECISION-056"],passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,providerRegistrationPerformed:false,paidActivationPerformed:false,realPaidRequestPerformed:false,checks};console.log(JSON.stringify(result,null,2));process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
