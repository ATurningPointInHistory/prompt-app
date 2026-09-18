/* ============================================================
   FILE: 19_trust_evidence_phase2_version_manifest.js
   EXTERNAL-020 Trust / Evidence Intelligence
   Decision 001 / Candidate Release: 0.2.0
   Phase 2: Multi-Dimensional Reliability Profile + Revision
   ============================================================ */
(function (global) {
  "use strict";
  function deepFreeze(value){if(!value||typeof value!=="object"||Object.isFrozen(value))return value;Object.keys(value).forEach(function(k){deepFreeze(value[k]);});return Object.freeze(value);}
  const manifest=deepFreeze({
    componentId:"EXTERNAL-020",
    decisionId:"EXTERNAL-020-DECISION-001",
    version:"0.2.0",
    status:"IMPLEMENTATION_PHASE2_CANDIDATE",
    phase:2,
    phaseName:"Multi-Dimensional Reliability Profile and Versioned Revision",
    parentPhase1:{
      version:"0.1.1",
      status:"PROJECT_OWNER_ACCEPTED_FROZEN",
      scriptCount:471,
      manifestHash:"ecbb5c7109f97c0195e8279c49d4ae8a6a7b90d5d5f841d1c5b1f3a91111d8b4",
      scriptSetHash:"dd94cd6f4cf1edb66b73a591d1c38fab7a37ccf5578c8233dc96c2f10a24353c",
      freezeRecordSha256:"9eed497455e653aca5e0140b43adfbbc4bd5e6b7128a9080e4cacf3974cfb2d4"
    },
    canonicalParent:{
      revisionId:"REPOSITORY010-CANONICAL-REVISION-0023",
      applicationVersion:"1.20.1",
      scriptCount:462,
      manifestHash:"0673af6e0cff8332cd9322d62b582eea312b549f9f3660f28222a87957c4160b",
      scriptSetHash:"d3121eb588b7c7b332cb86ef66f82fe2f2ecd77bd1be029143ff578f2d0514a3"
    },
    completionTargets:["REQ-020-003","REQ-020-004","REQ-020-005","REQ-020-007","REQ-020-009"],
    deferredAfterPhase2:["REQ-020-008","REQ-020-015"],
    reliabilityDimensions:[
      "OPERATIONAL_RELIABILITY","EVIDENCE_QUALITY","PROVENANCE_COMPLETENESS","TEMPORAL_COMPLETENESS_FRESHNESS",
      "CONTRADICTION_STATE","CONFIRMATION_STATE","INDEPENDENCE_STATE","CONTEXT_COVERAGE","UNCERTAINTY_MISSING_INFORMATION"
    ],
    independenceStates:["VERIFIED_INDEPENDENT","VERIFIED_DEPENDENT","UNKNOWN","NOT_APPLICABLE"],
    profileSubjectTypes:["SOURCE","EVIDENCE","CLAIM","PUBLISHER","MODEL_CAPABILITY","DOMAIN_TASK"],
    safety:{
      universalTrustScoreImplemented:false,
      permanentGlobalSourceRankingImplemented:false,
      automaticConflictResolutionAllowed:false,
      truthConfirmationAllowed:false,
      rawEvidenceMutationAllowed:false,
      automaticKnowledgePromotionAllowed:false,
      canonicalRepositoryMutationAllowed:false,
      externalTransmissionAutomaticallyAllowed:false,
      paidApiExecutionAutomaticallyAllowed:false,
      tradingAuthorityGranted:false,
      financialAuthorityGranted:false,
      businessAuthorityGranted:false,
      selfGrantedAuthorityAllowed:false,
      reliabilityEqualsTruth:false,
      reliabilityEqualsActionAuthority:false,
      historicalOutcomeGroundedEvaluationImplemented:false,
      externalAiReliabilityReasoningImplemented:false,
      ide170ConfidenceOverwriteAllowed:false
    }
  });
  global.EXTERNAL020Phase2VersionManifest=manifest;
})(typeof window!=="undefined"?window:globalThis);
