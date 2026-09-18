/* ============================================================
   FILE: 19_trust_evidence_lineage.js
   EXTERNAL-020 Phase 1 / Explanation + Lineage Foundation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence, VERSION_MANIFEST=global.EXTERNAL020VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST) return;
  const i=namespace.__internal,s=i.state;
  function createExternal020Lineage(input){
    const x=i.isPlainObject(input)?input:{}; const outputRef=i.text(x.outputRef,""); if(!outputRef) return i.buildResult(false,"EXTERNAL020_LINEAGE_OUTPUT_REQUIRED","Blocked",null);
    const record=i.deepFreeze({lineageId:i.nextId("EXTERNAL020-LINEAGE"), relationType:i.text(x.relationType,"EVALUATED_FROM").toUpperCase(), outputRef:outputRef,
      inputPackageId:i.text(x.inputPackageId,"")||null, contextId:i.text(x.contextId,"")||null, evidenceRefs:i.unique(x.evidenceRefs||[]), contradictionRefs:i.unique(x.contradictionRefs||[]), confirmationRefs:i.unique(x.confirmationRefs||[]),
      explanation:i.text(x.explanation,"Evidence-grounded reliability candidate; no truth or action authority granted."), createdAt:i.nowIso(), immutable:true});
    s.lineage.set(record.lineageId,record); i.touch(); return i.buildResult(true,"EXTERNAL020_LINEAGE_RECORDED","Ready",{lineage:record});
  }
  function getExternal020LineageFor(outputRef){ const id=i.text(outputRef,""); return Array.from(s.lineage.values()).filter(function(r){return r.outputRef===id;}).map(i.clone); }
  Object.assign(namespace.api,{createExternal020Lineage,getExternal020LineageFor}); Object.assign(namespace,namespace.api);
  namespace.modules.lineage={id:"EXTERNAL-020-LINEAGE",version:VERSION_MANIFEST.version,status:"Ready",explanationRequired:true,loadedAt:i.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
