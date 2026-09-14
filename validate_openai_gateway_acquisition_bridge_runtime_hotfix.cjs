"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
let seq=0,bridgeExecutor=null,sessionCalls=0,governedCalls=0,lastRequestedScopes=[];
const state={gatewayClientState:{healthState:"UNKNOWN"}};
const internal={
 state,
 isPlainObject:v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)),
 text:(v,f='')=>String(v==null?f:v),clone,nowIso:()=>new Date().toISOString(),unique:v=>Array.from(new Set(Array.isArray(v)?v:[])),
 nextId:p=>`${p}-TEST-${++seq}`,touch:()=>{},redactSensitive:clone,
 buildResult:(ok,code,status,data,error)=>({ok,code,status,data:data==null?null:data,error:error||null})
};
const ns={api:{},modules:{},__internal:internal,
 validateExternalIntelligenceContract:()=>({valid:true}),
 setExternalIntelligenceGatewayAcquisitionExecutor:fn=>{bridgeExecutor=fn;state.gatewayAcquisitionExecutor=fn;return {ok:true,code:fn?"SET":"CLEARED"};},
 evaluateExternalIntelligenceAuthority:()=>({allowed:true,decision:"ALLOW",reason:"ACTIVE_SCOPED_AUTHORITY",authorityEnvelopeId:"AUTH-TEST",evaluatedAt:new Date().toISOString()})
};
const manifest={release:{version:"1.20.1"},getModuleVersion:()=>"1.4.0",gateway:{contractVersion:"1.0.0",defaultBaseUrl:"http://127.0.0.1:43110",healthEndpoint:"/health",sessionEndpoint:"/v1/session",probeEndpoint:"/v1/probe",runtimeEndpoint:"/v1/runtime",publicAcquisitionEndpoint:"/v1/acquire/public",governedAcquisitionEndpoint:"/v1/acquire/governed",secretStatusEndpoint:"/v1/secret/status",publicAcquisitionScope:"ACQUIRE_PUBLIC",governedAcquisitionScope:"ACQUIRE_EXTERNAL",evidencePersistScope:"PERSIST_EVIDENCE",evidenceReadScope:"READ_EVIDENCE"}};
function response(status,body){return {ok:status>=200&&status<300,status,headers:new Map(),async json(){return clone(body);}};}
async function fetchMock(req){
 const url=typeof req==='string'?req:req.url; const u=new URL(url);
 if(u.pathname==='/health') return response(200,{componentId:"EXTERNAL-010",gatewayAvailable:true,gatewayVersion:"1.5.0",contractVersion:"1.0.0",runtimeState:"READY",recoveryEpochPresent:true,loopbackOnly:true,sessionRequiredForProtectedEndpoints:true});
 if(u.pathname==='/v1/session'){
   sessionCalls++; let body={}; try{body=await req.clone().json();}catch(_){}
   lastRequestedScopes=Array.isArray(body.requestedScope)?body.requestedScope.slice():[];
   return response(201,{sessionToken:`TOKEN-${sessionCalls}`,session:{gatewaySessionId:`SESSION-${sessionCalls}`,runtimeInstanceId:"RUNTIME-1",recoveryEpoch:"RECOVERY-1",issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),state:"ACTIVE",origin:"http://localhost:8000",contractVersion:"1.0.0",scope:lastRequestedScopes.slice(),tokenPersisted:false}});
 }
 if(u.pathname==='/v1/acquire/governed'){
   governedCalls++;
   return response(200,{ok:true,code:"GOVERNED_ACQUISITION_SUCCEEDED",acquisition:{status:200,contentType:"application/json",payload:{id:"resp_test",output_text:"OK"},rawText:'{"id":"resp_test","output_text":"OK"}',responseSize:37,providerRequestId:"req-test",responseMetadata:{status:200,contentType:"application/json",responseSize:37,providerRequestId:"req-test",rateLimitMetadata:{}},temporalMetadata:{observedAt:new Date().toISOString(),publishedAt:null,availableAt:null,effectiveAt:null,providerLastModified:null},observedAt:new Date().toISOString(),gateway:{gatewayVersion:"1.5.0",secretValueReturned:false}}});
 }
 return response(404,{ok:false,code:"NOT_FOUND"});
}
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:ns,EXTERNAL010VersionManifest:manifest,fetch:fetchMock,Request,URL,Date,navigator:null,location:{origin:"http://localhost:8000"},console,setTimeout,clearTimeout};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,"17_external_intelligence_gateway_client.js"),"utf8"),context,{filename:"17_external_intelligence_gateway_client.js"});
(async()=>{
 const opened=await ns.openExternalIntelligenceGatewaySession({requestedScope:["PROBE","READ_RUNTIME"]});
 check("Gateway Session creation succeeds",opened.ok===true,opened);
 check("Successful Session automatically enables acquisition bridge",opened.data&&opened.data.acquisitionBridgeEnabled===true&&typeof bridgeExecutor==='function',opened.data&&opened.data.acquisitionBridge);
 const clientState=ns.getExternalIntelligenceGatewayClientState();
 check("Client state exposes acquisition bridge readiness",clientState.acquisitionBridgeEnabled===true,clientState);
 const contextInput={request:{requestId:"REQ-1",sourceId:"SOURCE-OPENAI",operationId:"INTERNAL_ANALYSIS",purpose:"openai-real-api-test",parameters:{},body:{model:"gpt-5.6-luna",input:"Reply exactly with: OK",store:false,max_output_tokens:64},timeoutPolicy:{timeoutMs:60000}},source:{sourceId:"SOURCE-OPENAI",enabled:true,lifecycleState:"ACTIVE",accessMode:"LOCAL_GATEWAY",authenticationMode:"BEARER_TOKEN",secretReferenceId:"SECRET-OPENAI-LEGACY",allowedOperations:["INTERNAL_ANALYSIS"],adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",endpointPolicy:{canonicalHost:"api.openai.com",endpointReference:"OPENAI-RESPONSES-V1",allowRedirects:false}},operationContract:{operationContractId:"EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS",sourceId:"SOURCE-OPENAI",operationId:"INTERNAL_ANALYSIS",method:"POST",adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",endpoint:{exactUrl:"https://api.openai.com/v1/responses",canonicalHost:"api.openai.com",endpointReference:"OPENAI-RESPONSES-V1"},parameterPolicy:{required:[],optional:[],allowUnknown:false},bodyPolicy:{mode:"JSON",required:["model","input","store","max_output_tokens"],optional:[],fixedFields:{store:false},allowUnknown:false}},route:{routeId:"ROUTE-1",sourceId:"SOURCE-OPENAI",operationId:"INTERNAL_ANALYSIS",runtimeTarget:"LOCAL_GATEWAY",adapterId:"EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001",operationContractId:"EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS",endpointReference:"OPENAI-RESPONSES-V1"}};
 const acquisition=await bridgeExecutor(contextInput);
 check("Bridge re-handshakes for ACQUIRE_EXTERNAL scope",sessionCalls>=2&&lastRequestedScopes.includes("ACQUIRE_EXTERNAL"),{sessionCalls,lastRequestedScopes});
 check("Governed acquisition endpoint is invoked once",governedCalls===1,governedCalls);
 check("Bridge returns governed acquisition payload",acquisition&&acquisition.payload&&acquisition.payload.output_text==="OK",acquisition);
 const finalState=ns.getExternalIntelligenceGatewayClientState();
 check("Re-handshaken Session remains ACTIVE and bridge remains enabled",finalState.session&&finalState.session.state==="ACTIVE"&&finalState.session.scope.includes("ACQUIRE_EXTERNAL")&&finalState.acquisitionBridgeEnabled===true,finalState);
 const providerSource=fs.readFileSync(path.join(__dirname,"17_external_intelligence_openai_provider_integration.js"),"utf8");
 check("Pre-network failure semantics distinguish attempted from provider network call",providerSource.includes("realApiRequestAttempted: true")&&providerSource.includes("providerNetworkCallPerformed: definitelyPreNetwork ? false : null")&&providerSource.includes("realApiRequestPerformed: definitelyPreNetwork ? false : null"),"pre-network-semantics-present");
 const uiSource=fs.readFileSync(path.join(__dirname,"17_external_intelligence_openai_provider_ui.js"),"utf8");
 check("STEP 7 UI exposes Gateway Bridge readiness",uiSource.includes("Gateway Bridge")&&uiSource.includes("acquisitionBridgeEnabled"),"bridge-readiness-visible");
 const failed=checks.filter(x=>!x.passed);const out={id:"OPENAI-GATEWAY-ACQUISITION-BRIDGE-RUNTIME-HOTFIX-VALIDATION",candidateVersion:"0.3.9",decisionIds:["EXTERNAL-010-DECISION-055","EXTERNAL-010-DECISION-056"],passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,realProviderNetworkCallPerformed:false,checks};console.log(JSON.stringify(out,null,2));process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
