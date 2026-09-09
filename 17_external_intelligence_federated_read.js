/* ============================================================
   FILE: 17_external_intelligence_federated_read.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.13.0
   Phase 14: Federated Evidence Read / Intelligence Package / Knowledge Boundary
   Primary Decisions: 021 / 043
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("federatedRead");

  if (!(state.externalEvidenceReferences instanceof Map)) state.externalEvidenceReferences = new Map();
  if (!(state.federatedReadRequests instanceof Map)) state.federatedReadRequests = new Map();
  if (!(state.federatedReadResults instanceof Map)) state.federatedReadResults = new Map();

  const PROMOTION_STATES = ["NOT_EVALUATED","EVALUATED","CANDIDATE","VALIDATED","REJECTED","PROMOTED","SUPERSEDED"];
  const NO_RESULT_STATES = ["MATCHED","NO_MATCH","NO_ACCESSIBLE_SOURCE","POLICY_BLOCKED","SOURCE_UNAVAILABLE","INSUFFICIENT_INDEX","NOT_RESEARCHED","UNKNOWN"];
  const TEMPORAL_INTENTS = ["LATEST","CURRENT","AS_OF","HISTORICAL","RANGE","BACKTEST","OFFICIAL_EFFECTIVE","LONG_TERM","UNSPECIFIED"];

  function validateRecord(contractKey, schemaId, record) {
    const cv = namespace.validateExternalIntelligenceContract(contractKey, record);
    const sv = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return { valid: cv.valid === true && sv.valid === true, contract: cv, schema: sv };
  }
  function getRef(id) { const r=state.externalEvidenceReferences.get(internal.text(id,"")); return r?internal.clone(r):null; }

  function registerExternalIntelligenceEvidenceReference(input) {
    const x=internal.isPlainObject(input)?input:{};
    const evidenceId=internal.text(x.evidenceId,"");
    if(!evidenceId) return internal.buildResult(false,"EXTERNAL010_PHASE14_EVIDENCE_ID_REQUIRED","Blocked",null);
    const evidenceReferenceId=internal.text(x.evidenceReferenceId,"EXTERNAL-010-EVIDENCE-REF-"+evidenceId.replace(/[^A-Za-z0-9_-]/g,"-"));
    const existing=state.externalEvidenceReferences.get(evidenceReferenceId);
    if(existing) return internal.buildResult(true,"EXTERNAL010_PHASE14_EVIDENCE_REFERENCE_EXISTS","Ready",{evidenceReference:internal.clone(existing)});
    const promotionStatus=internal.text(x.promotionStatus,"NOT_EVALUATED").toUpperCase();
    if(!PROMOTION_STATES.includes(promotionStatus)) return internal.buildResult(false,"EXTERNAL010_PHASE14_PROMOTION_STATE_INVALID","Blocked",{promotionStatus});
    const record=internal.deepFreeze({
      evidenceReferenceId,
      origin:"EXTERNAL",
      sourceId:internal.text(x.sourceId,"")||null,
      evidenceId,
      contentId:internal.text(x.contentId,"")||null,
      acquiredAt:internal.text(x.acquiredAt,"")||null,
      publishedAt:internal.text(x.publishedAt,"")||null,
      freshnessState:internal.text(x.freshnessState,"UNKNOWN").toUpperCase(),
      reliabilityState:internal.text(x.reliabilityState,"UNASSESSED").toUpperCase(),
      promotionStatus,
      evidenceStatus:internal.text(x.evidenceStatus,"AVAILABLE").toUpperCase(),
      referenceType:internal.text(x.referenceType,"EVIDENCE_REFERENCE").toUpperCase(),
      rawContentIncluded:false,
      knowledgeIdentityAssigned:false,
      canonicalKnowledgeMutationPerformed:false,
      createdAt:internal.nowIso(), immutable:true
    });
    const validity=validateRecord("externalEvidenceReference","EXTERNAL-010-SCHEMA-EXTERNAL-EVIDENCE-REFERENCE",record);
    if(!validity.valid) return internal.buildResult(false,"EXTERNAL010_PHASE14_EVIDENCE_REFERENCE_INVALID","Blocked",validity);
    state.externalEvidenceReferences.set(evidenceReferenceId,record); internal.touch();
    return internal.buildResult(true,"EXTERNAL010_PHASE14_EVIDENCE_REFERENCE_REGISTERED","Ready",{evidenceReference:internal.clone(record)});
  }

  function createExternalIntelligenceFederatedReadRequest(input) {
    const x=internal.isPlainObject(input)?input:{};
    const temporalIntent=internal.text(x.temporalIntent,"UNSPECIFIED").toUpperCase();
    if(!TEMPORAL_INTENTS.includes(temporalIntent)) return internal.buildResult(false,"EXTERNAL010_PHASE14_TEMPORAL_INTENT_INVALID","Blocked",{temporalIntent});
    const record=internal.deepFreeze({
      federatedReadRequestId:internal.text(x.federatedReadRequestId,internal.nextId("EXTERNAL-010-FEDERATED-READ")),
      evidenceReferenceIds:internal.unique(x.evidenceReferenceIds||[]),
      queryText:internal.text(x.queryText,""), temporalIntent,
      asOfTime:internal.text(x.asOfTime,"")||null,
      purposeId:internal.text(x.purposeId,"GENERAL_RESEARCH"),
      recipientCapabilityId:internal.text(x.recipientCapabilityId,"AI-PROMPT-OS"),
      readOnly:true, knowledgeWriteRequested:false, promotionAuthorityRequested:false,
      createdAt:internal.nowIso(), immutable:true
    });
    const validity=validateRecord("federatedReadRequest","EXTERNAL-010-SCHEMA-FEDERATED-READ-REQUEST",record);
    if(!validity.valid) return internal.buildResult(false,"EXTERNAL010_PHASE14_FEDERATED_READ_REQUEST_INVALID","Blocked",validity);
    state.federatedReadRequests.set(record.federatedReadRequestId,record); internal.touch();
    return internal.buildResult(true,"EXTERNAL010_PHASE14_FEDERATED_READ_REQUEST_CREATED","Ready",{request:internal.clone(record)});
  }

  function readExternalIntelligenceFederated(input) {
    const x=internal.isPlainObject(input)?input:{};
    let request=null;
    if(x.federatedReadRequestId) request=state.federatedReadRequests.get(internal.text(x.federatedReadRequestId,""))||null;
    if(!request){ const r=createExternalIntelligenceFederatedReadRequest(x); if(!r.ok)return r; request=state.federatedReadRequests.get(r.data.request.federatedReadRequestId); }
    const requested=internal.unique(request.evidenceReferenceIds||[]);
    let refs=requested.length?requested.map(getRef).filter(Boolean):Array.from(state.externalEvidenceReferences.values()).map(internal.clone);
    if(x.sourceId) refs=refs.filter(r=>r.sourceId===internal.text(x.sourceId,""));
    const missing=requested.filter(id=>!state.externalEvidenceReferences.has(id));
    const noResultState=refs.length?"MATCHED":(missing.length?"INSUFFICIENT_INDEX":"NO_MATCH");
    const record=internal.deepFreeze({
      federatedReadResultId:internal.nextId("EXTERNAL-010-FEDERATED-READ-RESULT"), requestId:request.federatedReadRequestId,
      evidenceRefs:refs, coverageProfile:{coverageState:refs.length?(missing.length?"PARTIAL":"COMPLETE_FOR_REQUEST"):"INSUFFICIENT_EVIDENCE",requestedCount:requested.length,returnedCount:refs.length,knownMissingEvidence:missing,retrievalLimitations:missing.length?["MISSING_EVIDENCE_REFERENCE"]:[]},
      noResultState:NO_RESULT_STATES.includes(noResultState)?noResultState:"UNKNOWN",
      readOnly:true, knowledgeWritePerformed:false, canonicalMergePerformed:false,
      createdAt:internal.nowIso(), immutable:true
    });
    const validity=validateRecord("federatedReadResult","EXTERNAL-010-SCHEMA-FEDERATED-READ-RESULT",record);
    if(!validity.valid) return internal.buildResult(false,"EXTERNAL010_PHASE14_FEDERATED_READ_RESULT_INVALID","Blocked",validity);
    state.federatedReadResults.set(record.federatedReadResultId,record); internal.touch();
    return internal.buildResult(true,"EXTERNAL010_PHASE14_FEDERATED_READ_COMPLETE",refs.length?"Ready":"Partial",{result:internal.clone(record)});
  }

  function listExternalIntelligenceEvidenceReferences(){return Array.from(state.externalEvidenceReferences.values()).map(internal.clone);}
  Object.assign(namespace.api,{registerExternalIntelligenceEvidenceReference,createExternalIntelligenceFederatedReadRequest,readExternalIntelligenceFederated,getExternalIntelligenceEvidenceReference:getRef,listExternalIntelligenceEvidenceReferences});
  Object.assign(namespace,namespace.api);
  namespace.modules.federatedRead={id:"EXTERNAL-010-FEDERATED-EVIDENCE-READ",version:MODULE_VERSION,status:"Ready",phase:14,decisions:["021","043"],readOnly:true,canonicalMergeAllowed:false,loadedAt:internal.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
