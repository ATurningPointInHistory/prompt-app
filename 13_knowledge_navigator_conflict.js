/* ============================================================
   FILE: 13_knowledge_navigator_conflict.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Conflict 1.0.0
   Phase 6: Federation / Conflict
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.IDE180KnowledgeNavigator; const VERSION_MANIFEST=global.IDE180VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST){console.warn("IDE-180 Conflict blocked.");return;}
  const internal=namespace.__internal; const MODULE_VERSION=VERSION_MANIFEST.getModuleVersion("conflict");
  function arr(v){return Array.isArray(v)?v:[];} function text(v,f){return internal.text(v,f);} function lower(v){return text(v,"").normalize("NFKC").toLowerCase();}
  function sameScope(a,b){
    if(a==null&&b==null)return true; if(a==null||b==null)return false;
    try{return JSON.stringify(a)===JSON.stringify(b);}catch(_){return false;}
  }
  function refs(record){return [record&&record.recordId,record&&record.sourceId,record&&record.canonicalEntityId].filter(Boolean);}
  function relationshipType(r){return lower(r&&(r.type||r.relationshipType||r.relation));}
  function relationshipTarget(r){return text(r&&(r.targetId||r.targetSourceId||r.target||r.recordId),"");}
  function explicitConflict(left,right){
    const rightRefs=refs(right), leftRefs=refs(left);
    const lr=arr(left&&left.relationships).some(function(r){return relationshipType(r)==="conflicts-with"&&rightRefs.includes(relationshipTarget(r));});
    const rl=arr(right&&right.relationships).some(function(r){return relationshipType(r)==="conflicts-with"&&leftRefs.includes(relationshipTarget(r));});
    return lr||rl;
  }
  function supersedes(left,right){
    const rightRefs=refs(right);
    return arr(left&&left.relationships).concat(arr(left&&left.lineage)).some(function(r){return ["supersedes","replaces"].includes(relationshipType(r))&&rightRefs.includes(relationshipTarget(r));});
  }
  function lifecycleClass(record){const s=lower(record&&record.lifecycle); if(["historical","archived","deprecated","superseded","retired"].includes(s))return "historical"; if(["proposal","draft","candidate"].includes(s))return "proposal"; return "current";}
  function comparable(record){const v=record&&record.sourceMetadata&&record.sourceMetadata.comparable; return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}
  function evidence(record){return arr(record&&record.evidenceReferences).map(internal.clone);}
  function make(type,status,left,right,field,leftValue,rightValue,reason){
    return internal.deepFreeze({conflictId:internal.nextId("IDE-180-CONFLICT"),conflictType:type,status:status,canonicalEntityId:left&&left.canonicalEntityId||right&&right.canonicalEntityId||null,leftSource:{recordId:left&&left.recordId||null,providerId:left&&left.providerId||null,sourceType:left&&left.sourceType||null,sourceId:left&&left.sourceId||null},rightSource:{recordId:right&&right.recordId||null,providerId:right&&right.providerId||null,sourceType:right&&right.sourceType||null,sourceId:right&&right.sourceId||null},comparedField:field||null,leftValue:leftValue===undefined?null:internal.clone(leftValue),rightValue:rightValue===undefined?null:internal.clone(rightValue),scope:left&&left.scope!=null?internal.clone(left.scope):right&&right.scope!=null?internal.clone(right.scope):null,lifecycleContext:{left:left&&left.lifecycle||"unknown",right:right&&right.lifecycle||"unknown"},evidence:evidence(left).concat(evidence(right)),authorityState:"not-evaluated",explanation:reason,metadata:{scoringUsed:false,semanticFreeTextConfirmationUsed:false,readOnly:true,createdAt:internal.nowIso()}});
  }
  function detect(recordsInput){
    const records=arr(recordsInput).filter(Boolean); const out=[];
    for(let i=0;i<records.length;i+=1){for(let j=i+1;j<records.length;j+=1){
      const left=records[i],right=records[j]; if(!left.canonicalEntityId||left.canonicalEntityId!==right.canonicalEntityId)continue;
      if(explicitConflict(left,right)){out.push(make("explicit-conflict","confirmed",left,right,null,null,null,"An explicit conflicts-with relationship confirms this conflict."));continue;}
      if(supersedes(left,right)||supersedes(right,left)){out.push(make("lineage-difference","resolved-by-lineage",left,right,null,null,null,"Explicit supersedes/replaces lineage resolves the difference as a lineage transition."));continue;}
      const lc=lifecycleClass(left),rc=lifecycleClass(right);
      if(lc==="historical"||rc==="historical"){out.push(make("historical-difference","historical",left,right,null,null,null,"At least one Source is historical/archived/deprecated; the difference is classified as historical."));continue;}
      if(lc==="proposal"||rc==="proposal"){out.push(make("proposal-difference","proposal",left,right,null,null,null,"At least one Source is draft/proposal/candidate; the difference is classified as proposal."));continue;}
      if(!sameScope(left.scope,right.scope)){out.push(make("scope-difference","scope-specific",left,right,null,null,null,"Source scopes are not the same, so the difference is scope-specific rather than confirmed conflict."));continue;}
      const a=comparable(left),b=comparable(right); const shared=Object.keys(a).filter(function(k){return Object.prototype.hasOwnProperty.call(b,k);}).sort();
      shared.forEach(function(field){
        let equal=false; try{equal=JSON.stringify(a[field])===JSON.stringify(b[field]);}catch(_){equal=String(a[field])===String(b[field]);}
        if(!equal)out.push(make("deterministic-derived","candidate",left,right,field,a[field],b[field],"The same structured field has conflicting explicit values under the same Canonical Entity and scope. Candidate is not Confirmed."));
      });
    }}
    return internal.deepFreeze(out);
  }
  function reEvaluate(conflict,records){
    const current=detect(records); const id=conflict&&conflict.conflictId; const match=current.find(function(c){return c.canonicalEntityId===conflict.canonicalEntityId&&c.comparedField===conflict.comparedField&&c.leftSource.recordId===conflict.leftSource.recordId&&c.rightSource.recordId===conflict.rightSource.recordId;});
    return internal.deepFreeze({previousConflictId:id||null,status:match?match.status:"resolved",current:match?internal.clone(match):null,reevaluatedAt:internal.nowIso(),sourceMutationPerformed:false});
  }
  function initializeConflict(){namespace.modules.conflict.status="Ready"; return internal.buildResult(true,"IDE180_CONFLICT_INITIALIZED","Ready",{scoringAllowed:false,semanticFreeTextConfirmationAllowed:false,candidateAutomaticPromotionAllowed:false,readOnly:true});}
  Object.assign(namespace.api,{initializeConflict:initializeConflict,detectKnowledgeConflicts:detect,reEvaluateKnowledgeConflict:reEvaluate}); Object.assign(namespace,namespace.api);
  namespace.modules.conflict={id:"IDE-180-CONFLICT",version:MODULE_VERSION,status:"Loaded",phase:6,scoringAllowed:false,candidateAutomaticPromotionAllowed:false,semanticFreeTextConfirmationAllowed:false,readOnly:true,loadedAt:internal.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
