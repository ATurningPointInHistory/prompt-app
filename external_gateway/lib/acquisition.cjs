"use strict";

const SOURCE_ID = /^SOURCE-[A-Z0-9-]+$/;
const OPERATION_ID = /^[A-Z][A-Z0-9_:-]*$/;
const SECRET_REFERENCE = /^SECRET-[A-Z0-9-]+$/;
const SENSITIVE_KEY = /(password|api[_-]?key|bearer[_-]?token|access[_-]?token|refresh[_-]?token|private[_-]?key|authorization|credential|cookie|secretValue|tokenValue)/i;
const REFERENCE_KEY = /^(secretReferenceId)$/i;

function isPlainObject(value) { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function containsSensitiveKey(value) {
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  if (!isPlainObject(value)) return false;
  return Object.keys(value).some((key) => (!REFERENCE_KEY.test(key) && SENSITIVE_KEY.test(key)) || containsSensitiveKey(value[key]));
}
function safeText(value, max = 256) { return String(value == null ? "" : value).slice(0, max); }
function buildError(code, category, status, retryable, message, providerStatus) { const e=new Error(message||code); e.code=code; e.category=category||"BLOCKED"; e.status=status||400; e.retryable=retryable===true; e.providerStatus=providerStatus==null?null:providerStatus; return e; }
function canonicalHost(url) { return String(url.hostname || "").toLowerCase(); }
function exactTargetKey(url) { const port=url.port?`:${url.port}`:""; return `${url.protocol}//${canonicalHost(url)}${port}${url.pathname}`; }
function targetAllowed(config,url) { const host=canonicalHost(url); if(!config.acquisitionAllowedHosts.has(host)) return false; if(url.protocol==="https:") return true; return url.protocol==="http:" && config.allowHttpAcquisition===true; }

function validateContext(config, body, options) {
  const settings = options && typeof options === "object" ? options : {};
  if (!isPlainObject(body) || containsSensitiveKey(body)) throw buildError("ACQUISITION_REQUEST_REJECTED","BLOCKED",400,false,"Sensitive or invalid acquisition request");
  const request=isPlainObject(body.request)?body.request:null, source=isPlainObject(body.source)?body.source:null, operation=isPlainObject(body.operationContract)?body.operationContract:null, route=isPlainObject(body.route)?body.route:null, authority=isPlainObject(body.authority)?body.authority:null;
  if(!request||!source||!operation||!route||!authority) throw buildError("ACQUISITION_CONTEXT_REQUIRED","INVALID_REQUEST",400,false);
  const sourceId=String(request.sourceId||"").toUpperCase(), operationId=String(request.operationId||"").toUpperCase();
  if(!SOURCE_ID.test(sourceId)||!OPERATION_ID.test(operationId)) throw buildError("ACQUISITION_ID_INVALID","INVALID_REQUEST",400,false);
  if(source.sourceId!==sourceId||operation.sourceId!==sourceId||route.sourceId!==sourceId) throw buildError("ACQUISITION_SOURCE_BINDING_MISMATCH","BLOCKED",409,false);
  if(operation.operationId!==operationId||route.operationId!==operationId) throw buildError("ACQUISITION_OPERATION_BINDING_MISMATCH","BLOCKED",409,false);
  if(route.runtimeTarget!=="LOCAL_GATEWAY") throw buildError("LOCAL_GATEWAY_ROUTE_REQUIRED","BLOCKED",409,false);
  if(source.enabled!==true||source.lifecycleState!=="ACTIVE") throw buildError("SOURCE_NOT_ACTIVE","BLOCKED",403,false);
  if(!["LOCAL_GATEWAY","AUTO_ROUTE"].includes(source.accessMode)) throw buildError("SOURCE_GATEWAY_ACCESS_NOT_ALLOWED","BLOCKED",403,false);
  const authMode=String(source.authenticationMode||"NONE").toUpperCase();
  if(settings.publicOnly===true && authMode!=="NONE") throw buildError("PHASE4_PUBLIC_ACQUISITION_ONLY","AUTHENTICATION_FAILED",403,false);
  if(settings.allowAuthentication===true && authMode!=="NONE" && !SECRET_REFERENCE.test(String(source.secretReferenceId||"").toUpperCase())) throw buildError("SECRET_REFERENCE_REQUIRED","AUTHENTICATION_FAILED",403,false);
  if(!Array.isArray(source.allowedOperations)||!source.allowedOperations.includes(operationId)) throw buildError("SOURCE_OPERATION_NOT_ALLOWED","BLOCKED",403,false);
  if(operation.method!=="GET") throw buildError("PHASE6_GET_ONLY","BLOCKED",405,false);
  if(!operation.endpoint||!operation.endpoint.exactUrl||!operation.endpoint.canonicalHost) throw buildError("REGISTERED_EXACT_ENDPOINT_REQUIRED","INVALID_REQUEST",400,false);
  if(route.endpointReference!==operation.endpoint.endpointReference) throw buildError("ENDPOINT_REFERENCE_MISMATCH","BLOCKED",409,false);
  if(route.operationContractId!==operation.operationContractId) throw buildError("OPERATION_CONTRACT_BINDING_MISMATCH","BLOCKED",409,false);
  if(route.adapterId!==operation.adapterId||route.adapterId!==source.adapterId) throw buildError("ADAPTER_BINDING_MISMATCH","BLOCKED",409,false);
  if(authority.action!=="EXECUTE_EXTERNAL_ACQUISITION"||authority.allowed!==true||!authority.authorityEnvelopeId) throw buildError("BUSINESS_AUTHORITY_REVALIDATION_REQUIRED","BLOCKED",403,false);
  let url; try{url=new URL(String(operation.endpoint.exactUrl));}catch(_){throw buildError("ENDPOINT_URL_INVALID","INVALID_REQUEST",400,false);}
  if(canonicalHost(url)!==String(operation.endpoint.canonicalHost||"").toLowerCase()) throw buildError("ENDPOINT_CANONICAL_HOST_MISMATCH","BLOCKED",409,false);
  if(source.endpointPolicy&&source.endpointPolicy.canonicalHost&&canonicalHost(url)!==String(source.endpointPolicy.canonicalHost).toLowerCase()) throw buildError("SOURCE_CANONICAL_HOST_MISMATCH","BLOCKED",409,false);
  if(!targetAllowed(config,url)) throw buildError("GATEWAY_TARGET_NOT_ALLOWLISTED","BLOCKED",403,false);
  if(url.username||url.password||url.hash) throw buildError("ENDPOINT_CREDENTIAL_OR_FRAGMENT_BLOCKED","BLOCKED",400,false);
  const parameters=isPlainObject(request.parameters)?request.parameters:{}, policy=isPlainObject(operation.parameterPolicy)?operation.parameterPolicy:{required:[],optional:[],allowUnknown:false,maxParameterCount:32}, keys=Object.keys(parameters);
  if(keys.length>Math.min(Number(policy.maxParameterCount)||32,100)) throw buildError("PARAMETER_COUNT_EXCEEDED","INVALID_REQUEST",400,false);
  for(const key of Array.isArray(policy.required)?policy.required:[]) if(!Object.prototype.hasOwnProperty.call(parameters,key)) throw buildError("PARAMETER_REQUIRED","INVALID_REQUEST",400,false,key);
  if(policy.allowUnknown!==true){const allowed=new Set([...(Array.isArray(policy.required)?policy.required:[]),...(Array.isArray(policy.optional)?policy.optional:[])]); for(const key of keys) if(!allowed.has(key)) throw buildError("PARAMETER_UNKNOWN","INVALID_REQUEST",400,false,key);}
  for(const key of keys.sort()){const value=parameters[key]; if(value!=null) url.searchParams.set(key,String(value));}
  const timeoutMs=Math.max(250,Math.min(Number(request.timeoutPolicy&&request.timeoutPolicy.timeoutMs)||config.acquisitionDefaultTimeoutMs,config.acquisitionMaxTimeoutMs));
  return {request,source,operation,route,authority,url,timeoutMs,targetKey:exactTargetKey(url),authenticationMode:authMode};
}

async function readJsonResponse(config,response){const reader=response.body&&response.body.getReader?response.body.getReader():null;if(!reader){const text=await response.text();if(Buffer.byteLength(text)>config.acquisitionMaxResponseBytes)throw buildError("RESPONSE_TOO_LARGE","INVALID_RESPONSE",413,false,"Response exceeded limit",response.status);try{return{payload:text?JSON.parse(text):null,rawText:text,bytes:Buffer.byteLength(text)}}catch(_){throw buildError("INVALID_JSON_RESPONSE","INVALID_RESPONSE",502,false,"External response was not valid JSON",response.status)}}const chunks=[];let bytes=0;while(true){const{done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>config.acquisitionMaxResponseBytes){try{await reader.cancel()}catch(_){}throw buildError("RESPONSE_TOO_LARGE","INVALID_RESPONSE",413,false,"Response exceeded limit",response.status)}chunks.push(Buffer.from(value))}const text=Buffer.concat(chunks).toString("utf8");try{return{payload:text?JSON.parse(text):null,rawText:text,bytes}}catch(_){throw buildError("INVALID_JSON_RESPONSE","INVALID_RESPONSE",502,false,"External response was not valid JSON",response.status)}}

function createAcquisition(config,audit,secretStore){
  function authMaterial(context){
    if(context.authenticationMode==="NONE") return { headers:{}, secretValue:null, secretMetadata:null };
    if(!secretStore) throw buildError("SECRET_STORE_UNAVAILABLE","AUTHENTICATION_FAILED",503,false);
    const expected=context.authenticationMode==="BEARER_TOKEN"?"BEARER_TOKEN":context.authenticationMode==="API_KEY"?"API_KEY":context.authenticationMode;
    const resolved=secretStore.resolve(context.source.secretReferenceId,expected);
    if(!resolved.ok) throw buildError(resolved.code||"SECRET_MISSING","AUTHENTICATION_FAILED",401,false);
    if(context.authenticationMode==="BEARER_TOKEN") return { headers:{Authorization:`Bearer ${resolved.value}`}, secretValue:resolved.value, secretMetadata:resolved.metadata };
    if(context.authenticationMode==="API_KEY") return { headers:{"x-api-key":resolved.value}, secretValue:resolved.value, secretMetadata:resolved.metadata };
    throw buildError("AUTH_ADAPTER_UNAVAILABLE","AUTHENTICATION_FAILED",501,false);
  }

  function redactSecretValue(value, secretValue) {
    if (!secretValue) return value;
    if (typeof value === "string") return value.split(secretValue).join("[REDACTED]");
    if (Array.isArray(value)) return value.map((item)=>redactSecretValue(item, secretValue));
    if (isPlainObject(value)) { const out={}; for (const [k,v] of Object.entries(value)) out[k]=redactSecretValue(v, secretValue); return out; }
    return value;
  }

  async function perform(body,integrity,settings){
    const context=validateContext(config,body,settings); const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),context.timeoutMs); const startedAt=Date.now(); const label=settings&&settings.publicOnly?"PUBLIC":"GOVERNED";
    audit.append(`GATEWAY_${label}_ACQUISITION_STARTED`,"Started",{requestId:context.request.requestId,gatewayRequestId:integrity.requestId,sourceId:context.source.sourceId,operationId:context.operation.operationId,targetHost:canonicalHost(context.url),authorityEnvelopeId:context.authority.authorityEnvelopeId,authenticationMode:context.authenticationMode,secretReferenceId:context.source.secretReferenceId||null,secretValueLogged:false});
    try{
      const auth=authMaterial(context);
      const headers={Accept:"application/json","User-Agent":`AI-Prompt-OS-EXTERNAL-010-Gateway/${config.gatewayVersion}`,...auth.headers};
      const response=await fetch(context.url,{method:"GET",redirect:"error",cache:"no-store",credentials:"omit",signal:controller.signal,headers});
      const parsedRaw=await readJsonResponse(config,response);
      const parsed={ payload:redactSecretValue(parsedRaw.payload,auth.secretValue), rawText:redactSecretValue(parsedRaw.rawText,auth.secretValue), bytes:Buffer.byteLength(redactSecretValue(parsedRaw.rawText,auth.secretValue)) };
      if(!response.ok){const category=response.status===429?"RATE_LIMITED":response.status>=500?"TEMPORARY_SOURCE_UNAVAILABLE":response.status===401||response.status===403?"AUTHENTICATION_FAILED":"INVALID_RESPONSE";throw buildError(`HTTP_${response.status}`,category,502,response.status===429||response.status>=500,`External HTTP ${response.status}`,response.status);}
      const acquisition={status:response.status,contentType:safeText(response.headers.get("content-type")||"application/json",128),payload:parsed.payload,rawText:parsed.rawText,responseSize:parsed.bytes,providerRequestId:safeText(response.headers.get("x-request-id")||"",256)||null,responseMetadata:{status:response.status,contentType:safeText(response.headers.get("content-type")||"application/json",128),responseSize:parsed.bytes,providerRequestId:safeText(response.headers.get("x-request-id")||"",256)||null,rateLimitMetadata:{}},temporalMetadata:{observedAt:new Date().toISOString(),publishedAt:null,availableAt:null,effectiveAt:null,providerLastModified:safeText(response.headers.get("last-modified")||"",128)||null},observedAt:new Date().toISOString(),gateway:{gatewayVersion:config.gatewayVersion,gatewayRequestId:integrity.requestId,gatewaySessionId:integrity.session.gatewaySessionId,businessAuthorityGrantedBySession:false,businessAuthorityRevalidatedByCaller:true,targetAllowlistEnforced:true,arbitraryUrlProxyEnabled:false,authenticationMode:context.authenticationMode,secretReferenceId:context.source.secretReferenceId||null,secretValueReturned:false,secretValueRedactionApplied:Boolean(auth.secretValue)}};
      audit.append(`GATEWAY_${label}_ACQUISITION_SUCCEEDED`,"Succeeded",{requestId:context.request.requestId,gatewayRequestId:integrity.requestId,sourceId:context.source.sourceId,operationId:context.operation.operationId,responseStatus:response.status,responseSize:parsed.bytes,elapsedMs:Date.now()-startedAt,secretValueLogged:false});
      return acquisition;
    }catch(error){let mapped=error;if(error&&error.name==="AbortError")mapped=buildError("ACQUISITION_TIMEOUT","TIMEOUT",504,true,"External acquisition timed out");else if(!error||!error.code)mapped=buildError("SOURCE_UNAVAILABLE","SOURCE_UNAVAILABLE",502,true,error&&error.message||"External source unavailable");audit.append(`GATEWAY_${label}_ACQUISITION_FAILED`,"Failed",{requestId:context.request.requestId,gatewayRequestId:integrity.requestId,sourceId:context.source.sourceId,operationId:context.operation.operationId,code:mapped.code||"SOURCE_UNAVAILABLE",category:mapped.category||"SOURCE_UNAVAILABLE",providerStatus:mapped.providerStatus||null,elapsedMs:Date.now()-startedAt,secretValueLogged:false});throw mapped;}finally{clearTimeout(timer)}
  }
  return { acquirePublic:(body,integrity)=>perform(body,integrity,{publicOnly:true}), acquireGoverned:(body,integrity)=>perform(body,integrity,{allowAuthentication:true}), validateContext:(body,opts)=>validateContext(config,body,opts) };
}

module.exports={createAcquisition,validateContext,containsSensitiveKey};
