/* ============================================================
   FILE: 19_trust_evidence_core.js
   EXTERNAL-020 Phase 1 Core
   ============================================================ */
(function (global) {
  "use strict";
  const VERSION_MANIFEST = global.EXTERNAL020VersionManifest;
  if (!VERSION_MANIFEST) { console.warn("EXTERNAL-020 core blocked: Version Manifest missing."); return; }

  const namespace = global.EXTERNAL020TrustEvidence && typeof global.EXTERNAL020TrustEvidence === "object" ? global.EXTERNAL020TrustEvidence : {};
  const previousInternal = namespace.__internal && typeof namespace.__internal === "object" ? namespace.__internal : {};
  const state = previousInternal.state && typeof previousInternal.state === "object" ? previousInternal.state : {
    sequence:0, inputPackages:new Map(), contexts:new Map(), evaluations:new Map(), lineage:new Map(), validations:new Map(),
    latestInputPackageId:null, latestContextId:null, latestEvaluationId:null, latestValidationId:null, updatedAt:null
  };
  ["inputPackages","contexts","evaluations","lineage","validations"].forEach(function(k){ if(!(state[k] instanceof Map)) state[k]=new Map(); });
  if (!Number.isInteger(state.sequence)) state.sequence = 0;

  function nowIso(){ return new Date().toISOString(); }
  function text(v,f){ const s=String(v==null?"":v).trim(); return s || String(f==null?"":f); }
  function asArray(v){ return Array.isArray(v)?v:(v==null?[]:[v]); }
  function unique(v){ return [...new Set(asArray(v).map(function(x){return text(x,"");}).filter(Boolean))]; }
  function isPlainObject(v){ return Boolean(v && typeof v === "object" && !Array.isArray(v)); }
  function clone(v){ if(v==null||typeof v!=="object") return v; if(Array.isArray(v)) return v.map(clone); if(v instanceof Map){ const m=new Map(); v.forEach(function(x,k){m.set(k,clone(x));}); return m; } const o={}; Object.keys(v).forEach(function(k){o[k]=clone(v[k]);}); return o; }
  function deepFreeze(v){ if(!v||typeof v!=="object"||Object.isFrozen(v)) return v; Object.keys(v).forEach(function(k){deepFreeze(v[k]);}); return Object.freeze(v); }
  function nextId(prefix){ state.sequence += 1; return text(prefix,"EXTERNAL020")+"-"+Date.now().toString(36).toUpperCase()+"-"+String(state.sequence).padStart(4,"0"); }
  function touch(){ state.updatedAt=nowIso(); }
  function buildResult(ok,code,status,data,extra){ return Object.assign({ok:Boolean(ok),code:text(code,ok?"EXTERNAL020_OK":"EXTERNAL020_BLOCKED"),status:text(status,ok?"Ready":"Blocked"),data:data==null?null:clone(data),at:nowIso()},extra||{}); }

  function getSafetyStatus(){ return clone(VERSION_MANIFEST.safety); }
  function getDependencyStatus(){
    const e=global.EXTERNAL010ExternalIntelligence;
    return {
      external010:Boolean(e),
      external010ReliabilityInput:Boolean(e && typeof e.getExternalIntelligenceReliabilityInputPackage === "function"),
      ide170:Boolean(global.IDE170Intelligence),
      ide180:Boolean(global.IDE180KnowledgeNavigator || global.KNOWLEDGENAVIGATOR180Environment)
    };
  }
  function getStatus(){ return {
    componentId:VERSION_MANIFEST.componentId, decisionId:VERSION_MANIFEST.decisionId, version:VERSION_MANIFEST.version, phase:1, status:"Ready",
    inputPackageCount:state.inputPackages.size, contextCount:state.contexts.size, evaluationCount:state.evaluations.size, lineageCount:state.lineage.size,
    latestInputPackageId:state.latestInputPackageId, latestContextId:state.latestContextId, latestEvaluationId:state.latestEvaluationId,
    universalTrustScoreImplemented:false, automaticConflictResolutionAllowed:false, truthConfirmationAllowed:false,
    canonicalRepositoryMutationAllowed:false, selfGrantedAuthorityAllowed:false, validationEqualsApproval:false, updatedAt:state.updatedAt
  }; }

  const internal=Object.assign(previousInternal,{state,nowIso,text,asArray,unique,isPlainObject,clone,deepFreeze,nextId,touch,buildResult});
  namespace.__internal=internal; namespace.api=namespace.api&&typeof namespace.api==="object"?namespace.api:{}; namespace.modules=namespace.modules&&typeof namespace.modules==="object"?namespace.modules:{};
  Object.assign(namespace.api,{getStatus,getSafetyStatus,getDependencyStatus}); Object.assign(namespace,namespace.api);
  namespace.modules.core={id:"EXTERNAL-020-CORE",version:VERSION_MANIFEST.version,status:"Ready",phase:1,readOnlyFoundation:true,loadedAt:nowIso()};
  global.EXTERNAL020TrustEvidence=namespace;
  global.getExternal020Status=getStatus; global.getExternal020SafetyStatus=getSafetyStatus;
})(typeof window !== "undefined" ? window : globalThis);
