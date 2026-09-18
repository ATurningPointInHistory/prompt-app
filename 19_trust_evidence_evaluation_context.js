/* ============================================================
   FILE: 19_trust_evidence_evaluation_context.js
   EXTERNAL-020 Phase 1 / Evaluation Context
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence, VERSION_MANIFEST=global.EXTERNAL020VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST) return;
  const i=namespace.__internal,s=i.state, TYPES=VERSION_MANIFEST.subjectTypes;
  function createExternal020EvaluationContext(input){
    const x=i.isPlainObject(input)?input:{};
    const subjectType=i.text(x.subjectType,"UNKNOWN").toUpperCase();
    if(!TYPES.includes(subjectType)) return i.buildResult(false,"EXTERNAL020_SUBJECT_TYPE_INVALID","Blocked",{subjectType:subjectType,allowed:TYPES});
    const subjectRef=i.text(x.subjectRef,""); if(!subjectRef) return i.buildResult(false,"EXTERNAL020_SUBJECT_REFERENCE_REQUIRED","Blocked",null);
    const record=i.deepFreeze({
      contextId:i.nextId("EXTERNAL020-CONTEXT"), contextVersion:"1.0.0", subjectType:subjectType, subjectRef:subjectRef,
      domain:i.text(x.domain,"UNKNOWN").toUpperCase(), task:i.text(x.task||x.purpose,"UNKNOWN").toUpperCase(), purpose:i.text(x.purpose||x.task,"UNKNOWN").toUpperCase(),
      timeHorizon:i.text(x.timeHorizon,"UNKNOWN").toUpperCase(), evidenceRefs:i.unique(x.evidenceRefs||[]), sourceRefs:i.unique(x.sourceRefs||[]),
      inputPackageId:i.text(x.inputPackageId,s.latestInputPackageId||"")||null, contextSpecific:true, globalPermanentScoreContext:false,
      unknownFields:["domain","task","purpose","timeHorizon"].filter(function(k){return i.text(({domain:x.domain,task:x.task||x.purpose,purpose:x.purpose||x.task,timeHorizon:x.timeHorizon})[k],"UNKNOWN").toUpperCase()==="UNKNOWN";}),
      createdAt:i.nowIso(), immutable:true
    });
    s.contexts.set(record.contextId,record); s.latestContextId=record.contextId; i.touch();
    return i.buildResult(true,"EXTERNAL020_CONTEXT_CREATED","Ready",{context:record});
  }
  function getExternal020EvaluationContext(id){ const key=i.text(id,s.latestContextId||""); return key&&s.contexts.has(key)?i.clone(s.contexts.get(key)):null; }
  Object.assign(namespace.api,{createExternal020EvaluationContext,getExternal020EvaluationContext}); Object.assign(namespace,namespace.api);
  namespace.modules.evaluationContext={id:"EXTERNAL-020-EVALUATION-CONTEXT",version:VERSION_MANIFEST.version,status:"Ready",contextSpecific:true,loadedAt:i.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
