/* ============================================================
   FILE: 17_external_intelligence_phase7_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.6.0
   Phase 07 Validation: Normalization / Temporal / Claim / Entity Foundation
   Primary Decisions: 009 / 022 / 026 / 027
   Supporting: 008 / 037 / 042 / 050
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 07 validation blocked: dependencies missing.");
    return;
  }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase7Validation");

  function collector(){const checks=[];return{checks,check(name,passed,detail,group,severity){checks.push({name,passed:passed===true,detail:detail==null?"":(typeof detail==="string"?detail:internal.stableStringify(detail)),group:group||"General",severity:severity||"Critical"});}};}
  function summarize(checks){const passed=checks.filter(x=>x.passed).length;const failed=checks.length-passed;const criticalFailed=checks.filter(x=>!x.passed&&x.severity==="Critical").length;return{passed,failed,total:checks.length,criticalFailed,health:checks.length?Math.round(passed/checks.length*1000)/10:0};}
  function latestEvidencePair(){const records=Array.from(state.acquisitionEvidenceRecords.values()).filter(e=>e&&e.rawEvidenceId&&state.rawEvidenceRecords.has(e.rawEvidenceId));records.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));const evidence=records[0]||null;const raw=evidence?state.rawEvidenceRecords.get(evidence.rawEvidenceId):null;return{evidence,raw};}

  async function runExternalIntelligencePhase7Validation(){
    const c=collector(),check=c.check;let normalized1=null,normalized2=null,claim1=null,claim2=null,temporalFuture=null,temporalHistorical=null,visualCandidate=null;
    try{
      check("Release Version is Phase 07 compatible or later",["1.6.0","1.7.0"].includes(VERSION_MANIFEST.release.version),VERSION_MANIFEST.release.version,"Foundation");
      check("Implementation Phase is Phase 07 compatible or later",VERSION_MANIFEST.release.phase>=7,VERSION_MANIFEST.release.implementationPhase,"Foundation");
      check("Phase 07 primary Decisions are 009/022/026/027",internal.stableStringify(namespace.modules.phase7Validation.decisions)===internal.stableStringify(["009","022","026","027"]),namespace.modules.phase7Validation,"Foundation");
      check("Gateway remains unchanged at Phase 06 Gateway 1.4.0",VERSION_MANIFEST.gateway.gatewayVersion==="1.4.0",VERSION_MANIFEST.gateway.gatewayVersion,"Boundary");

      const init=await namespace.initializeExternalIntelligenceFoundation();check("Phase 07 foundation initializes",init&&init.ok===true,init&&init.code,"Initialization");
      const p1=await namespace.runExternalIntelligencePhase1Validation();check("Phase 01 regression remains PASS",p1.failed===0&&p1.health===100,{passed:p1.passed,failed:p1.failed,total:p1.total},"Regression");
      const p2=await namespace.runExternalIntelligencePhase2Validation({requireGateway:false});check("Phase 02 degraded regression remains PASS",p2.failed===0&&p2.health===100,{passed:p2.passed,failed:p2.failed,total:p2.total},"Regression");
      const p3=await namespace.runExternalIntelligencePhase3Validation();check("Phase 03 regression remains PASS",p3.failed===0&&p3.health===100,{passed:p3.passed,failed:p3.failed,total:p3.total},"Regression");
      const p4=await namespace.runExternalIntelligencePhase4Validation();check("Phase 04 regression remains PASS",p4.failed===0&&p4.health===100,{passed:p4.passed,failed:p4.failed,total:p4.total},"Regression");
      const p5=await namespace.runExternalIntelligencePhase5Validation();check("Phase 05 regression remains PASS",p5.failed===0&&p5.health===100&&p5.phase5Complete===true,{passed:p5.passed,failed:p5.failed,total:p5.total},"Regression");
      const p6=await namespace.runExternalIntelligencePhase6Validation();check("Phase 06 regression remains PASS",p6.failed===0&&p6.health===100&&p6.phase6Complete===true,{passed:p6.passed,failed:p6.failed,total:p6.total},"Regression");

      const contractKeys=["temporalContext","normalizerDefinition","normalizedRecord","claimCandidate","entityRecord","entityAliasRecord","entityIdentifierRecord","entityMention","entityResolutionCandidate","entityMergeSplitCandidate","phase7ValidationResult"];
      contractKeys.forEach(key=>check("Contract "+key+" is registered",Boolean(namespace.getExternalIntelligenceContract(key)),key,"Contracts"));
      const schemaIds=["EXTERNAL-010-SCHEMA-TEMPORAL-CONTEXT","EXTERNAL-010-SCHEMA-NORMALIZER-DEFINITION","EXTERNAL-010-SCHEMA-NORMALIZED-RECORD","EXTERNAL-010-SCHEMA-CLAIM-CANDIDATE","EXTERNAL-010-SCHEMA-ENTITY-RECORD","EXTERNAL-010-SCHEMA-ENTITY-ALIAS","EXTERNAL-010-SCHEMA-ENTITY-IDENTIFIER","EXTERNAL-010-SCHEMA-ENTITY-MENTION","EXTERNAL-010-SCHEMA-ENTITY-RESOLUTION-CANDIDATE","EXTERNAL-010-SCHEMA-ENTITY-MERGE-SPLIT-CANDIDATE","EXTERNAL-010-SCHEMA-PHASE7-VALIDATION-RESULT"];
      schemaIds.forEach(id=>check("Schema "+id+" is registered",Boolean(namespace.getExternalIntelligenceSchema(id)),id,"Schemas"));

      const pair=latestEvidencePair();check("Immutable Raw Evidence is available as Phase 07 input",Boolean(pair.evidence&&pair.raw),pair.evidence&&{evidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,contentHash:pair.raw.contentHash},"Evidence Input");
      const rawBefore=pair.raw?internal.stableStringify(namespace.getExternalIntelligenceRawEvidence(pair.raw.rawEvidenceId)):null;

      const policy=namespace.registerExternalIntelligenceFreshnessPolicy({freshnessPolicyId:"EXTERNAL-010-PHASE7-LATEST-POLICY",sourceType:"ANY",operationId:"ANY",temporalIntent:"LATEST",maxAgeMs:86400000,policyVersion:"1.0.0"});
      check("Source/Operation-aware Freshness Policy hook is available",policy.ok===true,policy.data||policy.code,"Temporal");
      const latest=pair.evidence?namespace.evaluateExternalIntelligenceTemporalEvidence({evidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,temporalIntent:"LATEST"}):null;
      check("LATEST temporal context distinguishes Evidence time fields",Boolean(latest&&latest.data&&latest.data.temporalContext&&latest.data.temporalContext.acquiredAt&&latest.data.temporalContext.unknownTimestampInvented===false),latest&&(latest.data||latest.code),"Temporal");
      const beforeMs=pair.evidence&&Date.parse(pair.evidence.acquiredAt);const earlier=Number.isFinite(beforeMs)?new Date(beforeMs-1000).toISOString():"2000-01-01T00:00:00.000Z";
      temporalFuture=pair.evidence?namespace.evaluateExternalIntelligenceTemporalEvidence({evidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,temporalIntent:"BACKTEST",asOfTime:earlier}):null;
      check("Backtest Future Evidence Guard blocks future-available Evidence",Boolean(temporalFuture&&temporalFuture.ok===false&&temporalFuture.code==="EXTERNAL010_TEMPORAL_EVIDENCE_BLOCKED"&&temporalFuture.data.temporalContext.futureEvidenceBlocked===true),temporalFuture&&(temporalFuture.data||temporalFuture.code),"Temporal");
      const later=Number.isFinite(beforeMs)?new Date(beforeMs+1000).toISOString():internal.nowIso();
      temporalHistorical=pair.evidence?namespace.evaluateExternalIntelligenceTemporalEvidence({evidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,temporalIntent:"HISTORICAL",asOfTime:later}):null;
      check("Historical mode is not treated as stale by definition",Boolean(temporalHistorical&&temporalHistorical.ok===true&&temporalHistorical.data.temporalContext.freshnessState==="HISTORICAL_CONTEXT"&&temporalHistorical.data.temporalContext.historicalMode===true),temporalHistorical&&(temporalHistorical.data||temporalHistorical.code),"Temporal");
      check("Freshness does not select a truth/evidence winner",Boolean(latest&&latest.data&&latest.data.evidenceWinnerSelected===false&&latest.data.temporalContext.freshnessGrantsReliability===false),latest&&latest.data,"Temporal");

      const normalizer1=namespace.registerExternalIntelligenceNormalizer({normalizerId:"EXTERNAL-010-NORMALIZER-PHASE7-FIXTURE",normalizerVersion:"1.0.0",schemaVersion:"1.0.0",recordType:"PHASE7_FIXTURE",supportedSourceTypes:["ANY"],deterministic:true,normalize(input){return{metric:"revenue",value:input&&input.value,unit:input&&input.unit,entityText:input&&input.entityText};}});
      check("Versioned Normalizer 1.0.0 registers with Stable ID",normalizer1.ok===true&&normalizer1.data.normalizerDefinition.normalizerId==="EXTERNAL-010-NORMALIZER-PHASE7-FIXTURE",normalizer1.data||normalizer1.code,"Normalization");
      namespace.setExternalIntelligenceNormalizationResolutionHook("ENTITY",async function(){return{resolutionState:"AMBIGUOUS",candidates:[{label:"Toyota",candidateOnly:true}]};});
      normalized1=pair.evidence?await namespace.normalizeExternalIntelligenceEvidence({evidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,normalizerId:"EXTERNAL-010-NORMALIZER-PHASE7-FIXTURE",normalizerVersion:"1.0.0",inputData:{entityText:"Toyota",metric:"revenue",value:100,unit:"JPY"}}):null;
      check("Raw Evidence normalizes into separate immutable Structured Layer",Boolean(normalized1&&normalized1.ok===true&&normalized1.data.normalizedRecord.rawEvidenceId===pair.raw.rawEvidenceId&&normalized1.data.normalizedRecord.rawEvidenceOverwritePerformed===false&&normalized1.data.normalizedRecord.normalizationReplacesRawEvidence===false),normalized1&&(normalized1.data||normalized1.code),"Normalization");
      check("Ambiguous Entity Resolution remains explicitly AMBIGUOUS",Boolean(normalized1&&normalized1.data.normalizedRecord.resolutionState==="AMBIGUOUS"&&normalized1.data.normalizedRecord.entityResolution.exactResolutionPerformed===false),normalized1&&normalized1.data.normalizedRecord,"Resolution Safety");
      const rawAfter1=pair.raw?internal.stableStringify(namespace.getExternalIntelligenceRawEvidence(pair.raw.rawEvidenceId)):null;
      check("Raw Evidence is byte-for-structure unchanged after normalization",rawBefore===rawAfter1,{unchanged:rawBefore===rawAfter1},"Immutability");

      const normalizer2=namespace.registerExternalIntelligenceNormalizer({normalizerId:"EXTERNAL-010-NORMALIZER-PHASE7-FIXTURE",normalizerVersion:"2.0.0",schemaVersion:"2.0.0",recordType:"PHASE7_FIXTURE",supportedSourceTypes:["ANY"],deterministic:true,normalize(input){return{metric:input&&input.metric,value:input&&input.value,unit:input&&input.unit,entityText:input&&input.entityText,normalizedBy:"2.0.0"};}});
      check("Normalizer version can evolve without replacing prior version",normalizer2.ok===true&&state.normalizerDefinitions.has("EXTERNAL-010-NORMALIZER-PHASE7-FIXTURE@1.0.0")&&state.normalizerDefinitions.has("EXTERNAL-010-NORMALIZER-PHASE7-FIXTURE@2.0.0"),{normalizerVersions:Array.from(state.normalizerDefinitions.keys()).filter(x=>x.indexOf("PHASE7-FIXTURE")>=0)},"Normalization");
      normalized2=pair.evidence?await namespace.normalizeExternalIntelligenceEvidence({evidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,normalizerId:"EXTERNAL-010-NORMALIZER-PHASE7-FIXTURE",normalizerVersion:"2.0.0",inputData:{entityText:"Toyota",metric:"revenue",value:100,unit:"JPY"}}):null;
      check("Reprocessing creates new Normalized Record and preserves history",Boolean(normalized2&&normalized2.ok===true&&normalized1&&normalized2.data.normalizedRecord.normalizedRecordId!==normalized1.data.normalizedRecord.normalizedRecordId&&state.normalizedRecords.has(normalized1.data.normalizedRecord.normalizedRecordId)&&normalized2.data.normalizedRecord.historyOverwritePerformed===false),normalized2&&(normalized2.data||normalized2.code),"Reprocessing");

      claim1=normalized2&&normalized2.ok?await namespace.createExternalIntelligenceClaimCandidate({normalizedRecordId:normalized2.data.normalizedRecord.normalizedRecordId,claimType:"FACTUAL",claimantId:"ENTITY-CLAIMANT-PHASE7",publisherId:"ENTITY-PUBLISHER-PHASE7",claimExtractorId:"EXTERNAL-010-CLAIM-EXTRACTOR-PHASE7",claimExtractorVersion:"1.0.0",extractionState:"EXTRACTED",extractionConfidence:"HIGH",atomicClaim:{subject:"Toyota",predicate:"revenue",value:100,unit:"JPY"},rawContextReference:"raw://phase7/context/1",temporalContextId:temporalHistorical&&temporalHistorical.data&&temporalHistorical.data.temporalContext.temporalContextId}):null;
      check("Atomic Claim Candidate links Normalized + Raw + Evidence lineage",Boolean(claim1&&claim1.ok===true&&claim1.data.claimCandidate.sourceEvidenceId===pair.evidence.evidenceId&&claim1.data.claimCandidate.rawEvidenceId===pair.raw.rawEvidenceId&&claim1.data.claimCandidate.rawContextReference),claim1&&(claim1.data||claim1.code),"Claim");
      check("Claimant and Publisher remain separate fields",Boolean(claim1&&claim1.data.claimCandidate.claimantId==="ENTITY-CLAIMANT-PHASE7"&&claim1.data.claimCandidate.publisherId==="ENTITY-PUBLISHER-PHASE7"&&claim1.data.claimCandidate.claimantId!==claim1.data.claimCandidate.publisherId),claim1&&claim1.data.claimCandidate,"Claim");
      check("Claim Candidate is not Truth / Knowledge / Authority",Boolean(claim1&&claim1.data.claimCandidate.claimEqualsTruth===false&&claim1.data.claimCandidate.truthVerified===false&&claim1.data.claimCandidate.knowledgePromotionPerformed===false&&claim1.data.claimCandidate.toolAuthorityGranted===false&&claim1.data.claimCandidate.repositoryAuthorityGranted===false),claim1&&claim1.data.claimCandidate,"Claim Safety");
      claim2=normalized2&&normalized2.ok?await namespace.createExternalIntelligenceClaimCandidate({normalizedRecordId:normalized2.data.normalizedRecord.normalizedRecordId,claimType:"FACTUAL",claimantId:"ENTITY-CLAIMANT-PHASE7",publisherId:"ENTITY-PUBLISHER-PHASE7",claimExtractorId:"EXTERNAL-010-CLAIM-EXTRACTOR-PHASE7",claimExtractorVersion:"2.0.0",extractionState:"EXTRACTED",extractionConfidence:"HIGH",atomicClaim:{subject:"Toyota",predicate:"revenue",value:100,unit:"JPY"},rawContextReference:"raw://phase7/context/1"}):null;
      check("Stable Claim ID survives extractor reprocessing while candidates remain versioned",Boolean(claim1&&claim2&&claim2.ok===true&&claim1.data.claimCandidate.claimId===claim2.data.claimCandidate.claimId&&claim1.data.claimCandidate.claimCandidateId!==claim2.data.claimCandidate.claimCandidateId),claim2&&(claim2.data||claim2.code),"Claim Reprocessing");

      const entity=namespace.registerExternalIntelligenceEntity({entityId:"EXTERNAL-010-ENTITY-TOYOTA-MOTOR-CORP",entityType:"ORGANIZATION",canonicalLabel:"Toyota Motor Corporation",namespace:"GLOBAL",evidenceRefs:[pair.evidence&&pair.evidence.evidenceId].filter(Boolean)});
      check("Stable Entity ID can be explicitly registered without name-match inference",entity.ok===true&&entity.data.entity.identityCreatedFromNameMatchOnly===false,entity.data||entity.code,"Entity");
      const alias=namespace.addExternalIntelligenceEntityAlias({entityId:"EXTERNAL-010-ENTITY-TOYOTA-MOTOR-CORP",alias:"Toyota",namespace:"EN",evidenceRefs:[pair.evidence.evidenceId]});
      const identifier=namespace.addExternalIntelligenceEntityIdentifier({entityId:"EXTERNAL-010-ENTITY-TOYOTA-MOTOR-CORP",namespace:"LEI",identifier:"PHASE7-VALIDATION-IDENTIFIER",evidenceRefs:[pair.evidence.evidenceId]});
      check("Alias / Identifier are evidence records, not automatic identity winners",alias.ok===true&&identifier.ok===true&&alias.data.entityAlias.aliasMatchEqualsExactIdentity===false&&identifier.data.entityIdentifier.identifierEqualsPermanentIdentity===false,{alias:alias.data,identifier:identifier.data},"Entity");
      const mention=namespace.createExternalIntelligenceEntityMention({sourceEvidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,mentionText:"Toyota",candidateEntityIds:["EXTERNAL-010-ENTITY-TOYOTA-MOTOR-CORP"],resolutionState:"AMBIGUOUS",contextReference:"raw://phase7/context/entity"});
      check("Text Entity Mention remains unresolved candidate",mention.ok===true&&mention.data.entityMention.resolvedEntityId===null&&mention.data.entityMention.mentionEqualsResolvedEntity===false,mention.data||mention.code,"Entity Mention");
      const visual=namespace.createExternalIntelligenceVisualEntityMention({sourceEvidenceId:pair.evidence.evidenceId,rawEvidenceId:pair.raw.rawEvidenceId,visualReference:"evidence://phase7/logo-region",candidateEntityIds:["EXTERNAL-010-ENTITY-TOYOTA-MOTOR-CORP"],resolutionState:"AMBIGUOUS"});
      visualCandidate=visual.ok?namespace.createExternalIntelligenceEntityResolutionCandidate({entityMentionId:visual.data.entityMention.entityMentionId,candidateEntityId:"EXTERNAL-010-ENTITY-TOYOTA-MOTOR-CORP",resolverId:"EXTERNAL-010-VISUAL-RESOLVER-HOOK",resolverVersion:"1.0.0",resolutionState:"AMBIGUOUS",confidence:"HIGH",visualSimilarityOnly:true,evidenceRefs:[pair.evidence.evidenceId],multimodalEvidenceRefs:["evidence://phase7/logo-region"]}):null;
      check("Visual similarity never auto-resolves Entity identity",Boolean(visualCandidate&&visualCandidate.ok===true&&visualCandidate.data.resolutionCandidate.visualSimilarityOnly===true&&visualCandidate.data.resolutionCandidate.canonicalResolutionPerformed===false&&visualCandidate.data.canonicalEntityResolved===false),visualCandidate&&(visualCandidate.data||visualCandidate.code),"Multimodal Entity Safety");
      const merge=namespace.createExternalIntelligenceEntityMergeSplitCandidate({operation:"MERGE",entityIds:["EXTERNAL-010-ENTITY-TOYOTA-MOTOR-CORP","EXTERNAL-010-ENTITY-TOYOTA-ALIAS-CANDIDATE"],evidenceRefs:[pair.evidence.evidenceId],resolverId:"PHASE7-VALIDATOR",resolverVersion:"1.0.0"});
      check("Entity Merge remains candidate-only and non-destructive",merge.ok===true&&merge.data.candidate.destructiveOperationPerformed===false&&merge.data.candidate.canonicalRegistryMutationPerformed===false&&merge.data.candidate.approvalGranted===false,merge.data||merge.code,"Entity Safety");

      const rawAfterAll=pair.raw?internal.stableStringify(namespace.getExternalIntelligenceRawEvidence(pair.raw.rawEvidenceId)):null;
      check("Raw Evidence remains unchanged after Temporal/Normalization/Claim/Entity processing",rawBefore===rawAfterAll,{unchanged:rawBefore===rawAfterAll},"Immutability");
      const s=VERSION_MANIFEST.safety;
      check("Phase 07 safety flags are fail-closed",s.rawEvidenceOverwriteAllowed===false&&s.normalizationReplacesRawEvidence===false&&s.normalizerUpgradeMayOverwriteHistory===false&&s.futureEvidenceInBacktestAllowed===false&&s.claimEqualsTruth===false&&s.claimExtractionEqualsKnowledgePromotion===false&&s.visualSimilarityEqualsIdentity===false&&s.ambiguousEntityMayBeSilentlyResolved===false&&s.directRepositoryMutationAllowed===false,s,"Safety");
      ["temporal","normalization","claim","entity","phase7Validation"].forEach(name=>check("Module "+name+" is loaded",Boolean(namespace.modules[name]),namespace.modules[name]&&namespace.modules[name].status,"Modules"));
      const audit=await namespace.verifyExternalIntelligenceAuditChain();check("Phase 07 audit chain remains valid",audit.valid===true,{valid:audit.valid,eventCount:audit.eventCount},"Audit");
    }catch(error){check("Phase 07 validation execution completes without exception",false,{message:error&&error.message||String(error),stack:error&&error.stack||null},"Validation");}
    finally{namespace.setExternalIntelligenceNormalizationResolutionHook("ENTITY",null);namespace.setExternalIntelligenceNormalizationResolutionHook("UNIT",null);namespace.setExternalIntelligenceNormalizationResolutionHook("TEMPORAL",null);}

    const summary=summarize(c.checks),gate=summary.failed===0&&summary.criticalFailed===0;
    const result={id:internal.nextId("EXTERNAL-010-PHASE7-VALIDATION"),componentId:"EXTERNAL-010",version:VERSION_MANIFEST.release.version,implementationPhase:VERSION_MANIFEST.release.implementationPhase,designFreezeId:VERSION_MANIFEST.release.designFreezeId,roadmapId:VERSION_MANIFEST.release.implementationRoadmapId,decisionCoverage:VERSION_MANIFEST.release.decisionCount,passed:summary.passed,failed:summary.failed,total:summary.total,health:summary.health,criticalFailed:summary.criticalFailed,status:gate?"EXTERNAL-010 Phase 07 Validation PASS":"EXTERNAL-010 Phase 07 Validation FAIL",releaseAllowed:gate,phase7Complete:gate,phase8Allowed:gate,checks:c.checks,safety:internal.clone(VERSION_MANIFEST.safety),validatedAt:internal.nowIso()};
    const cv=namespace.validateExternalIntelligenceContract("phase7ValidationResult",result),sv=namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE7-VALIDATION-RESULT",result);
    if(!cv.valid||!sv.valid){result.failed+=1;result.total+=1;result.criticalFailed+=1;result.health=Math.round(result.passed/result.total*1000)/10;result.status="EXTERNAL-010 Phase 07 Validation FAIL";result.releaseAllowed=false;result.phase7Complete=false;result.phase8Allowed=false;result.checks.push({name:"Phase 07 result validates against contract and schema",passed:false,detail:internal.stableStringify({contract:cv,schema:sv}),group:"Validation",severity:"Critical"});}
    else{result.checks.push({name:"Phase 07 result validates against contract and schema",passed:true,detail:"valid",group:"Validation",severity:"Critical"});result.passed+=1;result.total+=1;result.health=Math.round(result.passed/result.total*1000)/10;}
    state.latestPhase7Validation=internal.deepFreeze(internal.clone(result));namespace.modules.phase7Validation.status=result.failed===0?"Passed":"Failed";internal.touch();return internal.clone(result);
  }
  function getLatestExternalIntelligencePhase7Validation(){return state.latestPhase7Validation?internal.clone(state.latestPhase7Validation):null;}
  Object.assign(namespace.api,{runExternalIntelligencePhase7Validation,getLatestExternalIntelligencePhase7Validation});Object.assign(namespace,namespace.api);
  namespace.modules.phase7Validation={id:"EXTERNAL-010-PHASE7-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:7,decisions:["009","022","026","027"],supporting:["008","037","042","050"],loadedAt:internal.nowIso()};
  global.runExternalIntelligencePhase7Validation=runExternalIntelligencePhase7Validation;
})(typeof window!=="undefined"?window:globalThis);
