/* ============================================================
   FILE: 17_external_intelligence_reliability_signals.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.9.0
   Phase 10: Reliability Signals / Uncertainty / Outcome Foundation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("reliabilitySignals");

  const SOURCE_ROLES = ["PRIMARY","OFFICIAL","SECONDARY","AGGREGATOR","COMMUNITY","AI_GENERATED","UNKNOWN"];
  function immutableRecord(input) { return internal.deepFreeze(internal.clone(input)); }
  function recordExternalIntelligenceReliabilitySignal(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const sourceId = internal.text(x.sourceId, "");
    if (!sourceId) return internal.buildResult(false,"EXTERNAL010_RELIABILITY_SOURCE_REQUIRED","Blocked",null);
    const record = immutableRecord({
      reliabilitySignalId: internal.text(x.reliabilitySignalId, internal.nextId("EXTERNAL-010-RELIABILITY-SIGNAL")), sourceId,
      observationWindow: internal.text(x.observationWindow,"UNSPECIFIED"), requestCount: Math.max(0,Number(x.requestCount)||0),
      successCount: Math.max(0,Number(x.successCount)||0), timeoutCount: Math.max(0,Number(x.timeoutCount)||0),
      schemaFailureCount: Math.max(0,Number(x.schemaFailureCount)||0), averageLatencyMs: x.averageLatencyMs == null ? null : Math.max(0,Number(x.averageLatencyMs)||0),
      freshnessState: internal.text(x.freshnessState,"UNKNOWN").toUpperCase(), correctionObserved: x.correctionObserved === true,
      operationalReliabilityOnly: true, factualReliabilityDetermined: false, reliabilityScore: null, authorityScore: null,
      finalReliabilityAuthority: "EXTERNAL-020", createdAt: internal.nowIso(), immutable: true
    });
    state.reliabilitySignalRecords.set(record.reliabilitySignalId,record); internal.touch();
    return internal.buildResult(true,"EXTERNAL010_RELIABILITY_SIGNAL_RECORDED","Ready",{reliabilitySignal:internal.clone(record)});
  }
  function recordExternalIntelligenceEvidenceQualitySignal(input) {
    const x=internal.isPlainObject(input)?input:{}; const evidenceId=internal.text(x.evidenceId,""); if(!evidenceId)return internal.buildResult(false,"EXTERNAL010_EVIDENCE_ID_REQUIRED","Blocked",null);
    const role=internal.text(x.sourceRole,"UNKNOWN").toUpperCase(); if(!SOURCE_ROLES.includes(role))return internal.buildResult(false,"EXTERNAL010_SOURCE_ROLE_INVALID","Blocked",{sourceRole:role});
    const record=immutableRecord({qualitySignalId:internal.text(x.qualitySignalId,internal.nextId("EXTERNAL-010-EVIDENCE-QUALITY")),evidenceId,sourceId:internal.text(x.sourceId,"")||null,sourceRole:role,
      contentPresent:x.contentPresent===true,schemaValid:x.schemaValid===true,timestampPresent:x.timestampPresent===true,sourceIdentityResolved:x.sourceIdentityResolved===true,contentHashVerified:x.contentHashVerified===true,provenanceComplete:x.provenanceComplete===true,temporalMetadataComplete:x.temporalMetadataComplete===true,
      qualityScore:null,authorityScore:null,truthConfirmed:false,finalReliabilityAuthority:"EXTERNAL-020",createdAt:internal.nowIso(),immutable:true});
    state.evidenceQualitySignals.set(record.qualitySignalId,record); internal.touch(); return internal.buildResult(true,"EXTERNAL010_EVIDENCE_QUALITY_RECORDED","Ready",{evidenceQualitySignal:internal.clone(record)});
  }
  function recordCandidate(kind,input){ const x=internal.isPlainObject(input)?input:{}; const ids=internal.unique(x.evidenceIds||[]); if(ids.length<2)return internal.buildResult(false,"EXTERNAL010_RELIABILITY_CANDIDATE_EVIDENCE_REQUIRED","Blocked",{evidenceIds:ids});
    const isContradiction=kind==="CONTRADICTION"; const id=internal.text(x.candidateId,internal.nextId("EXTERNAL-010-"+kind+"-CANDIDATE"));
    const rec=immutableRecord({candidateId:id,candidateType:kind,subjectRef:internal.text(x.subjectRef,"")||null,field:internal.text(x.field,"")||null,period:internal.text(x.period,"")||null,evidenceIds:ids,independenceVerified:x.independenceVerified===true,
      conflictWinner:null,truthConfirmed:false,automaticResolutionPerformed:false,duplicateEqualsIndependentConfirmation:false,finalReliabilityAuthority:"EXTERNAL-020",createdAt:internal.nowIso(),immutable:true});
    (isContradiction?state.contradictionCandidates:state.confirmationCandidates).set(id,rec); internal.touch(); return internal.buildResult(true,"EXTERNAL010_"+kind+"_CANDIDATE_RECORDED","Ready",{candidate:internal.clone(rec)}); }
  function getReliabilityInputPackage(){return {operationalSignals:Array.from(state.reliabilitySignalRecords.values()).map(internal.clone),evidenceQualitySignals:Array.from(state.evidenceQualitySignals.values()).map(internal.clone),contradictionCandidates:Array.from(state.contradictionCandidates.values()).map(internal.clone),confirmationCandidates:Array.from(state.confirmationCandidates.values()).map(internal.clone),finalReliabilityAuthority:"EXTERNAL-020",generatedAt:internal.nowIso()};}
  Object.assign(namespace.api,{recordExternalIntelligenceReliabilitySignal,recordExternalIntelligenceEvidenceQualitySignal,recordExternalIntelligenceContradictionCandidate:function(x){return recordCandidate("CONTRADICTION",x);},recordExternalIntelligenceConfirmationCandidate:function(x){return recordCandidate("CONFIRMATION",x);},getExternalIntelligenceReliabilityInputPackage:getReliabilityInputPackage}); Object.assign(namespace,namespace.api);
  namespace.modules.reliabilitySignals={id:"EXTERNAL-010-RELIABILITY-SIGNALS",version:MODULE_VERSION,status:"Ready",phase:10,decisions:["010"],finalReliabilityAuthority:"EXTERNAL-020",loadedAt:internal.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
