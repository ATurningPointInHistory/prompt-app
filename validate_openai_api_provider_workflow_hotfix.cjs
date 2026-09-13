"use strict";
const path=require("path");
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function stable(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";}
function expect(c,m){if(!c)throw new Error(m);}
const checks=[];
function check(name,fn){try{checks.push({name,passed:true,detail:fn()});}catch(e){checks.push({name,passed:false,detail:e&&e.message||String(e)});}}
const store=new Map();
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
const elements={
  externalOpenAISecretReference:{value:"SECRET-OPENAI-PRIMARY"},
  externalOpenAIModel:{value:"gpt-5.6-luna"},
  externalOpenAIMaxOutput:{value:"100"},
  externalOpenAIPerRequestCap:{value:"0.01"},
  externalOpenAIBudget:{value:""},
  externalOpenAIImpact:{textContent:""}
};
global.document={getElementById:id=>elements[id]||null};
const state={sourceRegistry:new Map()};
const ns={api:{},modules:{},__internal:{state,
  isPlainObject:v=>Boolean(v&&typeof v==="object"&&!Array.isArray(v)),text:(v,f="")=>String(v==null?f:v),clone,stableStringify:stable,nowIso:()=>new Date().toISOString(),
  buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null}),unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),deepFreeze:v=>v,commitExternalIntelligenceSourceVersion:()=>null
}};
global.EXTERNAL010ExternalIntelligence=ns;
global.EXTERNAL010VersionManifest={getModuleVersion:()=>"1.20.1",release:{version:"1.20.1"}};
require(path.resolve(__dirname,"17_external_intelligence_openai_provider_integration.js"));
require(path.resolve(__dirname,"17_external_intelligence_openai_provider_ui.js"));
check("OpenAI provider profile declares canonical default Secret Reference",()=>{const p=ns.getOpenAIProviderIntegrationProfile();expect(p.defaultSecretReferenceId==="SECRET-OPENAI-PRIMARY","default ref");return p.defaultSecretReferenceId;});
check("Source candidate can be built before Source registration without secret value",()=>{const r=ns.buildOpenAIProviderSourceRegistration({});expect(r.ok===true,"candidate blocked");expect(r.data.sourceCandidate.secretReferenceId==="SECRET-OPENAI-PRIMARY","ref missing");expect(r.data.secretReference.metadataRegistered===false,"unexpected metadata");expect(r.data.sourceRegistrationReady===false,"should await metadata");expect(r.data.secretReference.nextRequiredAction==="SET_GATEWAY_SECRET_AND_REGISTER_REFERENCE_METADATA","next action");return r.data;});
check("Provider candidate UI no longer requires already-registered Source",()=>{const r=global.externalOpenAIShowProviderCandidates();expect(r.sourceCandidate&&r.sourceCandidate.ok===true,"source candidate failed");expect(r.operationCandidate&&r.operationCandidate.ok===true,"operation candidate failed");expect(r.secretReference.secretReferenceId==="SECRET-OPENAI-PRIMARY","ui ref");expect(r.secretReference.metadataRegistered===false,"metadata state");expect(r.secretValueRequested===false,"secret value requested");return {sourceCode:r.sourceCandidate.code,operationCode:r.operationCandidate.code,secretReference:r.secretReference};});
check("UI clearly exposes reference-only Secret state",()=>{const html=ns.renderOpenAIProviderIntegrationPanelHtml();expect(html.includes("Secret Reference"),"secret ref UI missing");expect(html.includes("SECRET-OPENAI-PRIMARY"),"default ref missing");expect(html.includes("Metadata未登録")||html.includes("未準備"),"readiness missing");expect(!/type=\"password\"/i.test(html),"secret value input present");return "reference-only-visible";});
check("Active Secret metadata advances next action without registering Provider",()=>{
  ns.getExternalIntelligenceSecretMetadata=id=>id==="SECRET-OPENAI-PRIMARY"?{secretReferenceId:id,secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}:null;
  ns.listExternalIntelligenceSecretMetadata=()=>[{secretReferenceId:"SECRET-OPENAI-PRIMARY",secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"}];
  ns.validateExternalIntelligenceSecretReference=({secretReferenceId})=>({ok:secretReferenceId==="SECRET-OPENAI-PRIMARY",code:"EXTERNAL010_SECRET_REFERENCE_ACTIVE",data:{secretValueReturned:false}});
  const r=global.externalOpenAIShowProviderCandidates();expect(r.sourceCandidate.ok===true,"candidate");expect(r.sourceCandidate.data.sourceRegistrationReady===true,"registration readiness");expect(r.secretReference.active===true,"ui active");expect(r.secretReference.nextRequiredAction==="SOURCE_REGISTRATION_AUTHORITY","next action");expect(state.sourceRegistry.size===0,"provider registered unexpectedly");return {sourceRegistrationReady:r.sourceCandidate.data.sourceRegistrationReady,nextRequiredAction:r.secretReference.nextRequiredAction,providerRegistrationPerformed:false};
});
const passed=checks.filter(x=>x.passed).length,failed=checks.length-passed;
const result={id:"OPENAI-API-INTEGRATION-PROVIDER-WORKFLOW-HOTFIX-VALIDATION",candidateVersion:"0.2.2",decisionId:"EXTERNAL-010-DECISION-055",passed,failed,total:checks.length,health:Math.round(passed/checks.length*10000)/100,providerRegistrationPerformed:false,realPaidRequestPerformed:false,checks};
console.log(JSON.stringify(result,null,2));process.exitCode=failed?1:0;
