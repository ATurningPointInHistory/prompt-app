"use strict";
const fs=require('node:fs'); const vm=require('node:vm'); const path=require('node:path');
const file=path.join(__dirname,'17_external_intelligence_openai_provider_ui.js');
const src=fs.readFileSync(file,'utf8');
const checks=[]; const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
let gatewayMode='missing', registerCalls=0, refreshCalls=0;
const elements={
 externalOpenAISecretReference:{value:'SECRET-OPENAI-PRIMARY'}, externalOpenAIModel:{value:'gpt-5.6-luna'}, externalOpenAIMaxOutput:{value:'100'}, externalOpenAIPerRequestCap:{value:'0.01'}, externalOpenAIBudget:{value:''}, externalOpenAIImpact:{textContent:''}
};
const namespace={
 __internal:{nowIso:()=>new Date().toISOString(),clone:v=>JSON.parse(JSON.stringify(v||{}))},
 api:{},modules:{},
 getOpenAIProviderIntegrationProfile:()=>({defaultSecretReferenceId:'SECRET-OPENAI-PRIMARY'}),
 getExternalIntelligenceSource:()=>null,
 listExternalIntelligenceResourceBudgets:()=>[],
 listExternalIntelligenceSecretMetadata:()=>[],
 getExternalIntelligenceSecretMetadata:()=>null,
 validateExternalIntelligenceSecretReference:()=>({ok:false}),
 listOpenAIModelPricingProfiles:()=>[],
 getExternalIntelligenceGatewaySecretMetadataStatus:async ({secretReferenceId,secretType})=> gatewayMode==='active' ? {ok:true,code:'SECRET_ACTIVE',data:{secretMetadata:{secretReferenceId,secretType,status:'ACTIVE'},secretValueReturned:false}} : {ok:false,code:'SECRET_MISSING',data:{secretValueReturned:false}},
 registerExternalIntelligenceSecretMetadata:(input)=>{registerCalls++; return {ok:true,code:'EXTERNAL010_SECRET_METADATA_REGISTERED',data:{secretMetadata:{...input,valueExposed:false},secretValueStored:false}};}
};
const context={window:null,globalThis:null,EXTERNAL010ExternalIntelligence:namespace,EXTERNAL010VersionManifest:{release:{version:'1.20.1'},getModuleVersion:()=> '0.2.3'},localStorage:{getItem:()=>null,setItem:()=>{}},document:{getElementById:id=>elements[id]||null},externalConsoleRefresh:()=>{refreshCalls++;}};
context.window=context; context.globalThis=context; vm.createContext(context); vm.runInContext(src,context,{filename:file});
check('Secret preparation button is present',src.includes('Secret準備確認')&&src.includes('externalOpenAIPrepareSecretReference()'),'button/function present');
(async()=>{
  gatewayMode='missing'; registerCalls=0; refreshCalls=0;
  const missing=await context.externalOpenAIPrepareSecretReference();
  check('Missing Gateway secret fails closed without metadata registration',missing.ok===false&&missing.code==='SECRET_MISSING'&&registerCalls===0&&missing.nextRequiredAction==='SET_GATEWAY_SECRET_ENVIRONMENT_AND_RESTART_GATEWAY',missing);
  gatewayMode='active'; registerCalls=0; refreshCalls=0;
  const active=await context.externalOpenAIPrepareSecretReference();
  check('Active Gateway secret registers reference-only Browser metadata',active.ok===true&&registerCalls===1&&active.secretValueStored===false&&active.secretValueRequested===false&&active.nextRequiredAction==='SOURCE_REGISTRATION_AUTHORITY',active);
  check('Secret value is never accepted by UI workflow',!src.includes('apiKey')&&!src.includes('secretValue=')&&active.secretValueRequested===false,'reference-only');
  const failed=checks.filter(c=>!c.passed); const result={id:'OPENAI-API-INTEGRATION-SECRET-SETUP-UI-HOTFIX-VALIDATION',candidateVersion:'0.2.3',passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),providerRegistrationPerformed:false,realPaidRequestPerformed:false,checks};
  console.log(JSON.stringify(result,null,2)); process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
