"use strict";
const path=require("path");
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function expect(c,m){if(!c)throw new Error(m);}
const checks=[];
function check(name,fn){return Promise.resolve().then(fn).then(detail=>checks.push({name,passed:true,detail})).catch(e=>checks.push({name,passed:false,detail:e&&e.message||String(e)}));}

async function testGatewayExpiry(){
  const originalFetch=global.fetch, originalNow=Date.now, originalLocation=global.location;
  try {
    const state={};
    const ns={api:{},modules:{},__internal:{state,
      isPlainObject:v=>Boolean(v&&typeof v==="object"&&!Array.isArray(v)),
      text:(v,f="")=>String(v==null?f:v),clone,nowIso:()=>new Date(Date.now()).toISOString(),
      buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null}),
      unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),touch:()=>{},nextId:p=>p+"-TEST",redactSensitive:v=>clone(v),deepFreeze:v=>v
    }};
    ns.validateExternalIntelligenceContract=()=>({valid:true,errors:[]});
    global.EXTERNAL010ExternalIntelligence=ns;
    global.EXTERNAL010VersionManifest={
      getModuleVersion:()=>"1.20.1",release:{version:"1.20.1"},
      gateway:{defaultBaseUrl:"http://127.0.0.1:43110",healthEndpoint:"/health",sessionEndpoint:"/v1/session",contractVersion:"1.0.0"}
    };
    Object.defineProperty(global,"location",{value:{origin:"http://localhost:8000"},configurable:true,writable:true});
    let now=Date.parse("2026-09-14T00:00:00.000Z"); Date.now=()=>now;
    global.fetch=async req=>{
      const u=new URL(req.url);
      if(u.pathname==="/health") return new Response(JSON.stringify({gatewayAvailable:true,runtimeState:"READY"}),{status:200,headers:{"content-type":"application/json"}});
      if(u.pathname==="/v1/session") return new Response(JSON.stringify({sessionToken:"SECRET-SESSION-TOKEN",session:{gatewaySessionId:"S1",runtimeInstanceId:"R1",issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+1000).toISOString(),state:"ACTIVE",origin:"http://localhost:8000",contractVersion:"1.0.0",tokenPersisted:false}}),{status:201,headers:{"content-type":"application/json"}});
      return new Response("{}",{status:404});
    };
    const mod=path.resolve(__dirname,"17_external_intelligence_gateway_client.js"); delete require.cache[mod]; require(mod);
    const opened=await ns.openExternalIntelligenceGatewaySession(); expect(opened.ok===true,"session open failed");
    let before=ns.getExternalIntelligenceGatewayClientState(); expect(before.session.state==="ACTIVE"&&before.sessionTokenPresentInMemory===true,"pre-expiry state invalid");
    now+=2000;
    const after=ns.getExternalIntelligenceGatewayClientState();
    expect(after.session&&after.session.state==="EXPIRED","expired metadata not reflected");
    expect(after.sessionTokenPresentInMemory===false,"expired token still present");
    expect(after.session.localClearReason==="EXPIRED","expiry clear reason missing");
    return {before:before.session.state,after:after.session.state,tokenPresentAfterExpiry:after.sessionTokenPresentInMemory};
  } finally {global.fetch=originalFetch;Date.now=originalNow;if(originalLocation===undefined)delete global.location;else Object.defineProperty(global,"location",{value:originalLocation,configurable:true,writable:true});delete global.EXTERNAL010ExternalIntelligence;delete global.EXTERNAL010VersionManifest;}
}

async function testUiSaveRefresh(){
  const originalDocument=global.document, originalLocalStorage=global.localStorage, originalRefresh=global.externalConsoleRefresh;
  try{
    const store=new Map();
    global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
    const elements={
      externalOpenAIModel:{value:"gpt-5.6-luna"},externalOpenAIMaxOutput:{value:"100"},externalOpenAIPerRequestCap:{value:"0.01"},externalOpenAIBudget:{value:""},externalOpenAIImpact:{textContent:""}
    };
    global.document={getElementById:id=>elements[id]||null};
    let refreshCount=0;
    global.externalConsoleRefresh=()=>{refreshCount++;elements.externalOpenAIImpact={textContent:""};return {};};
    const ns={api:{},modules:{},__internal:{clone,nowIso:()=>new Date().toISOString()},getOpenAIModelPricingProfile:m=>({model:m,inputPerMTokUsd:0.2,outputPerMTokUsd:1.2}),listOpenAIModelPricingProfiles:()=>[{model:"gpt-5.6-luna",inputPerMTokUsd:0.2,outputPerMTokUsd:1.2}],listExternalIntelligenceResourceBudgets:()=>[],getExternalIntelligenceSource:()=>null};
    global.EXTERNAL010ExternalIntelligence=ns;global.EXTERNAL010VersionManifest={getModuleVersion:()=>"1.20.1",release:{version:"1.20.1"}};
    const mod=path.resolve(__dirname,"17_external_intelligence_openai_provider_ui.js");delete require.cache[mod];require(mod);
    const ok=global.externalOpenAISaveDraft(); expect(ok===true,"save failed");expect(refreshCount===1,"console refresh not called exactly once");
    const saved=JSON.parse(store.get("EXTERNAL010_OPENAI_UI_DRAFT_V1"));expect(saved.model==="gpt-5.6-luna"&&saved.maxOutputTokens==="100"&&saved.perRequestHardCapUsd==="0.01","draft not saved");
    expect(elements.externalOpenAIImpact.textContent.includes('"saved": true'),"post-refresh impact not restored");
    return {saved:true,refreshCount,model:saved.model,maxOutputTokens:saved.maxOutputTokens,perRequestHardCapUsd:saved.perRequestHardCapUsd};
  } finally {global.document=originalDocument;global.localStorage=originalLocalStorage;global.externalConsoleRefresh=originalRefresh;delete global.EXTERNAL010ExternalIntelligence;delete global.EXTERNAL010VersionManifest;delete global.externalOpenAIPreviewConfiguration;delete global.externalOpenAISaveDraft;delete global.externalOpenAIShowProviderCandidates;}
}

(async()=>{
 await check("Expired session becomes EXPIRED and token is cleared on state read",testGatewayExpiry);
 await check("OpenAI draft save refreshes Control Center immediately",testUiSaveRefresh);
 const passed=checks.filter(x=>x.passed).length,failed=checks.length-passed;
 const result={id:"OPENAI-API-INTEGRATION-PHASE2-HOTFIX-VALIDATION",candidateVersion:"0.2.1",decisionId:"EXTERNAL-010-DECISION-055",passed,failed,total:checks.length,health:Math.round(passed/checks.length*10000)/100,providerRegistrationPerformed:false,realPaidRequestPerformed:false,checks};
 console.log(JSON.stringify(result,null,2));process.exitCode=failed?1:0;
})();
