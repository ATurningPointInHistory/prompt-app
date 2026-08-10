/* ============================================================
   FILE: 13_knowledge_navigator_federation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Federation 1.0.0
   Phase 6: Federation / Conflict
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.IDE180KnowledgeNavigator; const VERSION_MANIFEST=global.IDE180VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST){console.warn("IDE-180 Federation blocked.");return;}
  const internal=namespace.__internal; const MODULE_VERSION=VERSION_MANIFEST.getModuleVersion("federation");
  function arr(v){return Array.isArray(v)?v:[];} function text(v,f){return internal.text(v,f);}
  function facetType(record){const s=record&&record.sourceType||"unknown"; if(s==="memo-current")return "memo"; if(s==="knowledge-current")return "knowledge"; if(s==="architecture-database")return "architecture"; if(s==="validation-result-repository")return "validation"; if(s==="ide170-intelligence-package")return "package"; if(s==="memo-archive-zip")return "archive"; return s;}
  function normalizedValid(record){return namespace.validateContract&&namespace.validateContract("normalizedSourceRecord",record).valid===true;}
  function uniqueRecords(records){const map=new Map(); arr(records).forEach(function(r){if(!r||!r.recordId||!normalizedValid(r))return; if(!map.has(r.recordId))map.set(r.recordId,internal.clone(r));}); return Array.from(map.values());}
  function sourceCandidate(record){return {candidateId:record.recordId,providerId:record.providerId,sourceType:record.sourceType,sourceId:record.sourceId,recordId:record.recordId,canonicalEntityId:record.canonicalEntityId,version:record.version,lifecycle:record.lifecycle,officialState:record.officialState,validationState:record.validationState,scope:internal.clone(record.scope),lineage:internal.clone(record.lineage||[]),evidenceReferences:internal.clone(record.evidenceReferences||[]),lineageContinuous:arr(record.lineage).length>0,immutable:true,sourceMetadata:internal.clone(record.sourceMetadata||{})};}
  function groupFacets(records){const groups={}; records.forEach(function(r){const key=facetType(r); if(!groups[key])groups[key]=[]; groups[key].push(internal.clone(r));}); return Object.keys(groups).sort().map(function(k){return {facetType:k,recordCount:groups[k].length,records:groups[k]};});}
  function federate(recordsInput,options){
    const settings=internal.isPlainObject(options)?options:{}; const records=uniqueRecords(recordsInput); const byCanonical={};
    records.forEach(function(r){const id=text(r.canonicalEntityId,r.sourceId||r.recordId); if(!byCanonical[id])byCanonical[id]=[]; byCanonical[id].push(r);});
    const entities=Object.keys(byCanonical).sort().map(function(id){
      const sourceRecords=byCanonical[id]; const authority=typeof namespace.resolveKnowledgeAuthority==="function"?namespace.resolveKnowledgeAuthority(sourceRecords.map(sourceCandidate),{scope:settings.scope,evidenceRequired:settings.evidenceRequired===true}):{status:"not-applicable",selectedSource:null,candidates:[]};
      const selected=authority&&authority.status==="resolved"&&authority.selectedSource?sourceRecords.find(function(r){return r.recordId===authority.selectedSource.recordId;})||null:null;
      const conflicts=typeof namespace.detectKnowledgeConflicts==="function"?namespace.detectKnowledgeConflicts(sourceRecords):[];
      const conflictStatus=conflicts.some(function(c){return c.status==="confirmed";})?"confirmed":(conflicts.some(function(c){return c.status==="candidate";})?"candidate":(conflicts.length?"classified-difference":"none"));
      return internal.deepFreeze({canonicalEntityId:id,canonicalResult:selected?internal.clone(selected):null,authority:internal.clone(authority),sourceFacets:groupFacets(sourceRecords),relatedSources:sourceRecords.map(internal.clone),conflicts:internal.clone(conflicts),conflictStatus:conflictStatus,sourceRecordCount:sourceRecords.length,nonDestructive:true,physicalMergePerformed:false,scoringUsed:false});
    });
    return internal.deepFreeze({federationId:internal.nextId("IDE-180-FEDERATION"),entityCount:entities.length,sourceRecordCount:records.length,entities:entities,nonDestructive:true,physicalMergePerformed:false,scoringUsed:false,createdAt:internal.nowIso()});
  }
  function providers(){return ["IDE-180-PROVIDER-IDE170-INTELLIGENCE-PACKAGE","IDE-180-PROVIDER-CURRENT-MEMO","IDE-180-PROVIDER-CURRENT-KNOWLEDGE","IDE-180-PROVIDER-ARCHITECTURE","IDE-180-PROVIDER-VALIDATION-RESULTS"].map(function(id){return namespace.getProviderDefinition&&namespace.getProviderDefinition(id);}).filter(Boolean);}
  function snapshot(){return {providers:providers().map(function(p){let d={};try{d=p.describe();}catch(_){d={providerId:p.providerId,availability:"unavailable"};}return {providerId:p.providerId,providerVersion:p.providerVersion,sourceType:p.sourceType,availability:d.availability||p.availability||"unavailable",recordCount:d.recordCount==null?null:d.recordCount,readMode:p.readMode};}),readOnly:true,capturedAt:internal.nowIso()};}
  function initializeFederation(){namespace.modules.federation.status="Ready"; return internal.buildResult(true,"IDE180_FEDERATION_INITIALIZED","Ready",{providerCount:providers().length,nonDestructive:true,physicalMergeAllowed:false,scoringAllowed:false,readOnly:true});}
  Object.assign(namespace.api,{initializeFederation:initializeFederation,federateKnowledgeSourceRecords:federate,getKnowledgeNavigatorFederationSnapshot:snapshot}); Object.assign(namespace,namespace.api);
  namespace.modules.federation={id:"IDE-180-FEDERATION",version:MODULE_VERSION,status:"Loaded",phase:6,nonDestructive:true,physicalMergeAllowed:false,scoringAllowed:false,readOnly:true,loadedAt:internal.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
