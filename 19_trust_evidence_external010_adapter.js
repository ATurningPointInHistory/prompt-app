/* ============================================================
   FILE: 19_trust_evidence_external010_adapter.js
   EXTERNAL-020 Phase 1 / EXTERNAL-010 Read-Only Reliability Adapter
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence, VERSION_MANIFEST=global.EXTERNAL020VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST) return;
  const i=namespace.__internal,s=i.state;

  function inspectExternal010Compatibility(){
    const e=global.EXTERNAL010ExternalIntelligence;
    const compatible=Boolean(e && typeof e.getExternalIntelligenceReliabilityInputPackage === "function");
    return {compatible:compatible, external010Present:Boolean(e), reliabilityInputApiPresent:compatible, expectedFinalReliabilityAuthority:"EXTERNAL-020", mutationApiInvoked:false, providerNetworkCallPerformed:false};
  }
  function readExternal010ReliabilityInput(){
    const compat=inspectExternal010Compatibility();
    if(!compat.compatible) return i.buildResult(false,"EXTERNAL020_EXTERNAL010_INPUT_UNAVAILABLE","Blocked",compat);
    const raw=global.EXTERNAL010ExternalIntelligence.getExternalIntelligenceReliabilityInputPackage();
    if(!i.isPlainObject(raw)) return i.buildResult(false,"EXTERNAL020_EXTERNAL010_INPUT_INVALID","Blocked",null);
    if(raw.finalReliabilityAuthority!=="EXTERNAL-020") return i.buildResult(false,"EXTERNAL020_AUTHORITY_BOUNDARY_MISMATCH","Blocked",{finalReliabilityAuthority:raw.finalReliabilityAuthority||null});
    if(raw.contractValid===false) return i.buildResult(false,"EXTERNAL020_EXTERNAL010_CONTRACT_INVALID","Blocked",{contractValid:false});
    const record=i.deepFreeze({
      inputPackageId:i.nextId("EXTERNAL020-INPUT"), sourceComponentId:"EXTERNAL-010", sourceContract:"EXTERNAL-010-CONTRACT-RELIABILITY-INPUT-PACKAGE",
      operationalSignals:Array.isArray(raw.operationalSignals)?i.clone(raw.operationalSignals):[], evidenceQualitySignals:Array.isArray(raw.evidenceQualitySignals)?i.clone(raw.evidenceQualitySignals):[],
      contradictionCandidates:Array.isArray(raw.contradictionCandidates)?i.clone(raw.contradictionCandidates):[], confirmationCandidates:Array.isArray(raw.confirmationCandidates)?i.clone(raw.confirmationCandidates):[],
      finalReliabilityAuthority:"EXTERNAL-020", sourceGeneratedAt:i.text(raw.generatedAt,"UNKNOWN"), contractValid:raw.contractValid!==false,
      readOnly:true, rawEvidenceMutationPerformed:false, externalTransmissionPerformed:false, providerNetworkCallPerformed:false, capturedAt:i.nowIso(), immutable:true
    });
    s.inputPackages.set(record.inputPackageId,record); s.latestInputPackageId=record.inputPackageId; i.touch();
    return i.buildResult(true,"EXTERNAL020_EXTERNAL010_INPUT_CAPTURED","Ready",{inputPackage:record});
  }
  function getExternal020ReliabilityInputPackage(id){ const key=i.text(id,s.latestInputPackageId||""); return key&&s.inputPackages.has(key)?i.clone(s.inputPackages.get(key)):null; }
  Object.assign(namespace.api,{inspectExternal010Compatibility,readExternal010ReliabilityInput,getExternal020ReliabilityInputPackage}); Object.assign(namespace,namespace.api);
  namespace.modules.external010Adapter={id:"EXTERNAL-020-EXTERNAL010-ADAPTER",version:VERSION_MANIFEST.version,status:"Ready",readOnly:true,mutationApiInvoked:false,loadedAt:i.nowIso()};
})(typeof window !== "undefined" ? window : globalThis);
