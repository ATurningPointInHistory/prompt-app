/* ============================================================
   FILE: 19_trust_evidence_phase1_validation.js
   EXTERNAL-020 Phase 1 Functional / Safety Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence, VERSION_MANIFEST=global.EXTERNAL020VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST) return;
  const i=namespace.__internal,s=i.state;
  function runExternal020Phase1Validation(){
    const checks=[]; function check(name,passed,detail,group,severity){checks.push({name:name,passed:Boolean(passed),detail:i.clone(detail),group:group||"Functional",severity:severity||"Major"});}
    const deps=namespace.getDependencyStatus(); check("REQ-020-002 EXTERNAL-010 Reliability Input API is available",deps.external010ReliabilityInput===true,deps,"Integration","Critical");
    const compat=namespace.inspectExternal010Compatibility(); check("EXTERNAL-010 adapter is read-only",compat.compatible===true&&compat.mutationApiInvoked===false&&compat.providerNetworkCallPerformed===false,compat,"Safety","Critical");
    const input=namespace.readExternal010ReliabilityInput(); check("Reliability Input Package can be captured read-only",input.ok===true&&input.data.inputPackage.readOnly===true&&input.data.inputPackage.rawEvidenceMutationPerformed===false,input,"Functional","Critical");
    const pkg=input.ok?input.data.inputPackage:null; check("Final Reliability Authority remains EXTERNAL-020",pkg&&pkg.finalReliabilityAuthority==="EXTERNAL-020",pkg,"Authority","Critical");
    const ctx=namespace.createExternal020EvaluationContext({subjectType:"CLAIM",subjectRef:"CLAIM-VALIDATION-001",domain:"GENERAL",task:"EVIDENCE_REVIEW",purpose:"VALIDATION",timeHorizon:"CURRENT",evidenceRefs:["EVIDENCE-A","EVIDENCE-B"],inputPackageId:pkg&&pkg.inputPackageId});
    check("REQ-020-003/004 Context distinguishes Claim and purpose",ctx.ok===true&&ctx.data.context.subjectType==="CLAIM"&&ctx.data.context.contextSpecific===true,ctx,"Functional","Major");
    const ev=namespace.createExternal020ReliabilityEvaluationCandidate({contextId:ctx.ok?ctx.data.context.contextId:"",inputPackageId:pkg&&pkg.inputPackageId,explanation:"Phase 1 validation candidate"});
    check("Reliability Evaluation Candidate can be created",ev.ok===true,ev,"Functional","Critical");
    const r=ev.ok?ev.data.evaluation:null;
    check("REQ-020-006 Contradiction references are preserved",r&&Array.isArray(r.contradictionRefs),r,"Reliability","Major");
    check("REQ-020-007 Unknown independence is not assumed independent",r&&r.duplicateEqualsIndependentConfirmation===false&&r.independenceAssumedWhenUnknown===false,r,"Reliability","Critical");
    check("REQ-020-010 Explicit evaluation state exists",r&&VERSION_MANIFEST.evaluationStates.includes(r.evaluationState),r,"Reliability","Major");
    check("REQ-020-011 Phase 1 creates no false numerical precision",r&&r.reliabilityScore===null&&r.authorityScore===null,r,"Safety","Critical");
    check("REQ-020-012 IDE-170 Confidence is not overwritten",r&&r.ide170ConfidenceOverwritten===false,r,"Safety","Critical");
    check("REQ-020-013 Reliability grants no action authority",r&&r.actionAuthorityGranted===false&&r.businessAuthorityGranted===false&&r.tradingAuthorityGranted===false&&r.financialAuthorityGranted===false,r,"Authority","Critical");
    check("REQ-020-014 Explanation and lineage are present",r&&typeof r.explanation==="string"&&ev.data.lineage&&ev.data.lineage.outputRef===r.evaluationId,ev.data.lineage,"Lineage","Major");
    check("REQ-020-016 Raw Evidence is not mutated",r&&r.rawEvidenceMutationPerformed===false&&pkg.rawEvidenceMutationPerformed===false,{evaluation:r,inputPackage:pkg},"Safety","Critical");
    check("REQ-020-017 Knowledge is not automatically promoted",r&&r.knowledgePromotionPerformed===false,r,"Authority","Critical");
    check("REQ-020-018 No self-granted execution authority",r&&r.actionAuthorityGranted===false&&VERSION_MANIFEST.safety.selfGrantedAuthorityAllowed===false,r,"Authority","Critical");
    const emptyPackage=i.deepFreeze({inputPackageId:i.nextId("EXTERNAL020-INPUT-EMPTY"),sourceComponentId:"EXTERNAL-010",sourceContract:"EXTERNAL-010-CONTRACT-RELIABILITY-INPUT-PACKAGE",operationalSignals:[],evidenceQualitySignals:[],contradictionCandidates:[],confirmationCandidates:[],finalReliabilityAuthority:"EXTERNAL-020",sourceGeneratedAt:"VALIDATION",contractValid:true,readOnly:true,rawEvidenceMutationPerformed:false,externalTransmissionPerformed:false,providerNetworkCallPerformed:false,capturedAt:i.nowIso(),immutable:true});
    s.inputPackages.set(emptyPackage.inputPackageId,emptyPackage);
    const emptyCtx=namespace.createExternal020EvaluationContext({subjectType:"SOURCE",subjectRef:"SOURCE-EMPTY",domain:"UNKNOWN",task:"UNKNOWN",purpose:"UNKNOWN",timeHorizon:"UNKNOWN",evidenceRefs:[],inputPackageId:emptyPackage.inputPackageId});
    const abstain=namespace.createExternal020ReliabilityEvaluationCandidate({contextId:emptyCtx.ok?emptyCtx.data.context.contextId:"",inputPackageId:emptyPackage.inputPackageId});
    check("Missing Evidence yields INSUFFICIENT_EVIDENCE without invented score",abstain.ok===true&&abstain.data.evaluation.evaluationState==="INSUFFICIENT_EVIDENCE"&&abstain.data.evaluation.reliabilityScore===null,abstain,"Negative","Critical");
    const forced=namespace.createExternal020ReliabilityEvaluationCandidate({contextId:ctx.ok?ctx.data.context.contextId:"",inputPackageId:pkg&&pkg.inputPackageId,evaluationState:"UNRESOLVED"});
    check("UNRESOLVED is a valid formal result",forced.ok===true&&forced.data.evaluation.evaluationState==="UNRESOLVED"&&forced.data.evaluation.conflictWinner===null,forced,"Negative","Critical");
    const safety=namespace.getSafetyStatus(); check("Universal trust score / automatic conflict winner remain disabled",safety.universalTrustScoreImplemented===false&&safety.automaticConflictResolutionAllowed===false&&safety.truthConfirmationAllowed===false,safety,"Safety","Critical");
    const coverage=namespace.getExternal020Phase1Coverage(); check("18 Requirement IDs are machine-trackable without false full Decision completion",coverage.totalDecisionRequirements===18&&coverage.phase1ScopeComplete===true&&coverage.allDecisionRequirementsComplete===false&&coverage.falseFullDecisionCompletionClaimed===false,coverage,"Traceability","Critical");
    check("Validation does not equal Project Owner approval",safety.validationEqualsApproval===false,{validationEqualsApproval:safety.validationEqualsApproval},"Authority","Critical");
    const failed=checks.filter(function(c){return !c.passed;}),criticalFailed=failed.filter(function(c){return c.severity==="Critical";}).length;
    const record=i.deepFreeze({validationId:i.nextId("EXTERNAL020-PHASE1-VALIDATION"),componentId:VERSION_MANIFEST.componentId,decisionId:VERSION_MANIFEST.decisionId,version:VERSION_MANIFEST.version,phase:1,passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:criticalFailed,phase1ImplementationComplete:failed.length===0,phase1TechnicalGateReady:failed.length===0,releaseAllowed:false,projectOwnerAcceptanceRequired:true,validationIsApproval:false,canonicalMutationPerformed:false,externalTransmissionPerformed:false,paidApiExecutionPerformed:false,checks:checks,validatedAt:i.nowIso(),immutable:true});
    s.validations.set(record.validationId,record); s.latestValidationId=record.validationId; i.touch(); return i.clone(record);
  }
  Object.assign(namespace.api,{runExternal020Phase1Validation}); Object.assign(namespace,namespace.api);
  namespace.modules.phase1Validation={id:"EXTERNAL-020-PHASE1-VALIDATION",version:VERSION_MANIFEST.version,status:"Ready",releaseAllowed:false,validationIsApproval:false,loadedAt:i.nowIso()};
  global.runExternal020Phase1Validation=runExternal020Phase1Validation;
})(typeof window !== "undefined" ? window : globalThis);
