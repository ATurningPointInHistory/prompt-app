/* ============================================================
   FILE: 13_knowledge_navigator_architecture_provider.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Architecture Provider 1.0.0
   Phase 6: Federation / Conflict
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-180 Architecture Provider blocked."); return; }
  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("architectureProvider");
  const PROVIDER_ID = "IDE-180-PROVIDER-ARCHITECTURE";
  const SOURCE_TYPE = "architecture-database";
  function text(value, fallback) { return internal.text(value, fallback); }
  function lower(value) { return text(value, "").normalize("NFKC").toLowerCase(); }
  function arr(value) { return Array.isArray(value) ? value : []; }
  function database() { try { return typeof global.getArchitectureDatabase === "function" ? internal.clone(global.getArchitectureDatabase()) : null; } catch (_) { return null; } }
  function lifecycle(value) { const s=lower(value); if (["active","ready"].includes(s)) return "active"; if (["deprecated","retired"].includes(s)) return "deprecated"; if (["draft","proposal"].includes(s)) return s; return s || "unknown"; }
  function comparable(metadata) { const out={}; const m=metadata&&typeof metadata==="object"?metadata:{}; Object.keys(m).sort().forEach(function(k){ const v=m[k]; if (["string","number","boolean"].includes(typeof v) && v!=="") out[k]=v; }); return out; }
  function relationshipsFor(id, db) { return arr(db && db.relationships).filter(function(r){return r && (r.source===id || r.target===id);}).map(function(r){return {type:text(r.type,"related-to").toLowerCase(),sourceId:text(r.source,""),targetId:text(r.target,""),explicit:true,metadata:internal.clone(r.metadata||{})};}); }
  function normalize(object, db) {
    const id=text(object&&object.id,"");
    return internal.deepFreeze({recordId:"IDE180-ARCH:"+id,canonicalEntityId:id?(id.includes(":")?id:"entity:"+id):null,providerId:PROVIDER_ID,sourceId:id,sourceType:SOURCE_TYPE,recordType:lower(object&&object.type)||"architecture",title:text(object&&object.title,id),summary:text(object&&object.summary||object&&object.description,""),contentReference:{architectureObjectId:id,readOnly:true},version:text(object&&object.version,""),lifecycle:lifecycle(object&&object.status),officialState:lower(object&&object.status)==="official"?"official":"unknown",validationState:"unknown",scope:object&&object.layer?{layer:object.layer}:null,relationships:relationshipsFor(id,db),lineage:arr(object&&object.lineage).map(internal.clone),evidenceReferences:arr(object&&object.evidenceReferences).map(internal.clone),trust:"not-applicable",timestamps:{createdAt:object&&object.createdAt||null,updatedAt:object&&object.updatedAt||null},sourceMetadata:{type:text(object&&object.type,""),category:text(object&&object.category,""),layer:text(object&&object.layer,""),priority:text(object&&object.priority,""),status:text(object&&object.status,""),tags:arr(object&&object.tags).map(String),comparable:comparable(object&&object.metadata)},immutable:true});
  }
  function all() { const db=database(); if(!db) return []; return Object.values(db.objects||{}).map(function(o){return normalize(o,db);}); }
  function describe(){const list=all(); const db=database(); return {providerId:PROVIDER_ID,providerVersion:MODULE_VERSION,sourceType:SOURCE_TYPE,readMode:"read-only",availability:!db?"unavailable":(list.length?"available":"partial"),capabilities:["architecture-navigation","architecture-relationship-read","federation-source"],recordCount:list.length,relationshipCount:arr(db&&db.relationships).length,mutationAllowed:false};}
  function supports(c){return describe().capabilities.includes(text(c,""));}
  function list(){return all().map(internal.clone);}
  function get(selector){const s=internal.isPlainObject(selector)?selector:{id:selector}; const id=text(s.recordId||s.canonicalEntityId||s.sourceId||s.id,""); return internal.clone(all().find(function(i){return [i.recordId,i.canonicalEntityId,i.sourceId].includes(id);})||null);}
  function search(query){const q=lower(query); if(!q)return list(); return all().filter(function(i){return [i.recordId,i.canonicalEntityId,i.sourceId,i.recordType,i.title,i.summary,i.sourceMetadata.category,i.sourceMetadata.layer].concat(i.sourceMetadata.tags||[]).map(lower).join(" ").includes(q);}).map(internal.clone);}
  const providerDefinition={providerId:PROVIDER_ID,providerVersion:MODULE_VERSION,sourceType:SOURCE_TYPE,readMode:"read-only",availability:"not-loaded",capabilities:["architecture-navigation","architecture-relationship-read","federation-source"],supports:supports,describe:describe,get:get,search:search,list:list};
  function initializeArchitectureProvider(){providerDefinition.availability=describe().availability; const existing=namespace.getProviderDefinition&&namespace.getProviderDefinition(PROVIDER_ID); const registration=existing?internal.buildResult(true,"IDE180_PROVIDER_EXISTS","Ready",{providerId:PROVIDER_ID}):namespace.registerProviderDefinition(providerDefinition); namespace.modules.architectureProvider.status=registration&&registration.ok===true?"Ready":"Blocked"; return internal.buildResult(registration&&registration.ok===true,registration&&registration.ok===true?"IDE180_ARCHITECTURE_PROVIDER_INITIALIZED":"IDE180_ARCHITECTURE_PROVIDER_INITIALIZATION_FAILED",registration&&registration.ok===true?"Ready":"Blocked",{registration:registration,provider:describe()});}
  Object.assign(namespace.api,{initializeArchitectureProvider:initializeArchitectureProvider,getArchitectureProviderStatus:describe,listArchitectureSourceRecords:list,searchArchitectureSourceRecords:search,getArchitectureSourceRecord:get}); Object.assign(namespace,namespace.api);
  namespace.modules.architectureProvider={id:"IDE-180-ARCHITECTURE-PROVIDER",version:MODULE_VERSION,status:"Loaded",phase:6,providerId:PROVIDER_ID,sourceType:SOURCE_TYPE,readOnly:true,loadedAt:internal.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
