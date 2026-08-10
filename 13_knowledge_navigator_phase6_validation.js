/* ============================================================
   FILE: 13_knowledge_navigator_phase6_validation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Phase 6 Validation 1.0.0
   Phase 6: Federation / Conflict
   ============================================================ */
(function (global) {
  "use strict";
  const namespace=global.IDE180KnowledgeNavigator; const VERSION_MANIFEST=global.IDE180VersionManifest;
  if(!namespace||!namespace.__internal||!VERSION_MANIFEST){console.warn("IDE-180 Phase 6 validation blocked.");return;}
  const internal=namespace.__internal; const state=internal.state; const MODULE_VERSION=VERSION_MANIFEST.getModuleVersion("phase6Validation");
  const IMPLEMENTED_TYPES=["architecture","decision","dependency","entity","evidence","explanation","file","function","insight","knowledge","lineage","module","relationship","repository","reverse-dependency","search","timeline","validation","version","workflow"].sort();
  const PROVIDERS=["IDE-180-PROVIDER-IDE170-INTELLIGENCE-PACKAGE","IDE-180-PROVIDER-CURRENT-MEMO","IDE-180-PROVIDER-CURRENT-KNOWLEDGE","IDE-180-PROVIDER-ARCHITECTURE","IDE-180-PROVIDER-VALIDATION-RESULTS"].sort();
  function arr(v){return Array.isArray(v)?v:[];} function hasScore(v){if(v==null)return false;if(Array.isArray(v))return v.some(hasScore);if(typeof v!=="object")return false;return Object.keys(v).some(function(k){return /score$/i.test(k)||/authorityScore|trustScore|conflictScore/i.test(k)||hasScore(v[k]);});}
  function fixture(overrides){return Object.assign({recordId:"REC-A",canonicalEntityId:"entity:IDE-180",providerId:"P-A",sourceId:"S-A",sourceType:"memo-current",recordType:"knowledge",title:"IDE-180",summary:"",contentReference:null,version:"1.0.0",lifecycle:"active",officialState:"unknown",validationState:"unknown",scope:{project:"AI-Prompt-OS"},relationships:[],lineage:[],evidenceReferences:[],trust:"not-applicable",timestamps:{},sourceMetadata:{comparable:{}},immutable:true},overrides||{});}
  async function runKnowledgeNavigatorPhase6Validation(options){
    const settings=internal.isPlainObject(options)?options:{}; const checks=[];
    function check(name,passed,detail,group,severity){checks.push({name:name,passed:passed===true,detail:detail==null?"":String(detail),group:group||"Phase 6",severity:severity||"High"});}
    const initialization=namespace.initialize({requireIDE170:settings.requireIDE170!==false});
    check("IDE-180 initialization succeeds",initialization.ok===true,initialization.code,"Initialization","Critical");
    const status=namespace.getStatus();
    check("Release Version is 1.5.0",status.version==="1.5.0",status.version,"Manifest","Critical");
    check("Implementation Phase is Phase 6",VERSION_MANIFEST.implementation.phase===6,status.implementationPhase,"Manifest","Critical");
    check("Design Freeze remains 1.0.0",status.designFreezeVersion==="1.0.0",status.designFreezeVersion,"Manifest","High");
    check("Completed phases include 1 through 5",JSON.stringify(VERSION_MANIFEST.implementation.completedPhases)===JSON.stringify([1,2,3,4,5]),JSON.stringify(VERSION_MANIFEST.implementation.completedPhases),"Manifest","High");
    const safety=namespace.getSafetyStatus(); Object.keys(VERSION_MANIFEST.safety).forEach(function(k){check("Safety flag remains disabled: "+k,safety[k]===false,safety[k],"Safety","Critical");});
    check("Nine frozen contracts remain registered",namespace.listContractDefinitions().length===9,namespace.listContractDefinitions().length,"Contracts","Critical");
    check("All frozen contracts remain read-only",namespace.listContractDefinitions().every(function(x){return x.readOnly===true;}),namespace.listContractDefinitions().filter(function(x){return x.readOnly!==true;}).length,"Contracts","Critical");
    const implemented=namespace.listNavigationTypes().filter(function(x){return x.implemented===true;}).map(function(x){return x.typeId;}).sort();
    check("All twenty core navigation types are implemented by Phase 6",JSON.stringify(implemented)===JSON.stringify(IMPLEMENTED_TYPES),implemented.join(","),"Registry","Critical");
    ["architecture","knowledge","decision","insight","explanation"].forEach(function(type){const d=namespace.getNavigationType(type);check("Phase 6 type uses Federated Resolver: "+type,Boolean(d&&d.implemented===true&&d.resolverId==="IDE-180-RESOLVER-FEDERATED-SOURCE"),d&&d.resolverId,"Registry","Critical");check("Phase 6 type implementation phase is 6: "+type,Boolean(d&&d.implementationPhase===6),d&&d.implementationPhase,"Registry","High");});
    const providerIds=namespace.listProviderDefinitions().map(function(x){return x.providerId;}).sort();
    check("Exactly five initial Source Providers are registered",JSON.stringify(providerIds)===JSON.stringify(PROVIDERS),JSON.stringify(providerIds),"Providers","Critical");
    PROVIDERS.forEach(function(id){const p=namespace.getProviderDefinition(id);check("Provider is registered: "+id,Boolean(p),p&&p.providerId,"Providers","Critical");check("Provider is read-only: "+id,Boolean(p&&p.readMode==="read-only"),p&&p.readMode,"Safety","Critical");check("Provider satisfies frozen Source Provider Contract: "+id,Boolean(p&&namespace.validateContract("sourceProvider",p).valid===true),p&&namespace.validateContract("sourceProvider",p).failed,"Contracts","Critical");});
    check("Exactly six resolvers are registered",namespace.listResolverDefinitions().length===6,JSON.stringify(namespace.listResolverDefinitions()),"Resolvers","Critical");
    const fedResolver=namespace.getResolverDefinition("IDE-180-RESOLVER-FEDERATED-SOURCE");
    check("Federated Resolver is registered",Boolean(fedResolver),fedResolver&&fedResolver.resolverId,"Resolvers","Critical");
    check("Federated Resolver is read-only",Boolean(fedResolver&&fedResolver.readOnly===true),fedResolver&&fedResolver.readOnly,"Resolvers","Critical");
    check("Federated Resolver owns exactly five Phase 6 types",Boolean(fedResolver&&JSON.stringify(fedResolver.navigationTypes.slice().sort())===JSON.stringify(["architecture","decision","explanation","insight","knowledge"])),fedResolver&&fedResolver.navigationTypes&&fedResolver.navigationTypes.join(","),"Resolvers","Critical");

    const official=fixture({recordId:"REC-OFFICIAL",sourceId:"S-OFFICIAL",providerId:"P-MEMO",sourceType:"memo-current",officialState:"official",validationState:"validated",lifecycle:"current-official",evidenceReferences:[{evidenceId:"EV-1"}]});
    const draft=fixture({recordId:"REC-DRAFT",sourceId:"S-DRAFT",providerId:"P-KNOW",sourceType:"knowledge-current",officialState:"non-official",validationState:"not-validated",lifecycle:"draft"});
    const fed=namespace.federateKnowledgeSourceRecords([official,draft],{evidenceRequired:false});
    check("Synthetic Federation creates one Canonical Entity",fed.entityCount===1,fed.entityCount,"Federation","Critical");
    check("Synthetic Federation preserves two Source Records",fed.sourceRecordCount===2,fed.sourceRecordCount,"Federation","Critical");
    check("Federation is explicitly non-destructive",fed.nonDestructive===true&&fed.physicalMergePerformed===false,JSON.stringify({nonDestructive:fed.nonDestructive,physicalMergePerformed:fed.physicalMergePerformed}),"Federation","Critical");
    check("Federation uses no score",hasScore(fed)===false&&fed.scoringUsed===false,JSON.stringify({scoringUsed:fed.scoringUsed}),"Safety","Critical");
    const entity=fed.entities[0];
    check("Federation exposes Source Facets",arr(entity.sourceFacets).length===2,arr(entity.sourceFacets).map(function(x){return x.facetType;}).join(","),"Federation","Critical");
    check("Authority resolves Official Source without merge",entity.authority&&entity.authority.status==="resolved"&&entity.canonicalResult&&entity.canonicalResult.recordId==="REC-OFFICIAL",entity.authority&&entity.authority.status,"Authority","Critical");
    check("Related Sources remain independently present",arr(entity.relatedSources).length===2,arr(entity.relatedSources).length,"Federation","Critical");
    const ambiguousFed=namespace.federateKnowledgeSourceRecords([fixture({recordId:"AMB-A",sourceId:"AMB-A"}),fixture({recordId:"AMB-B",sourceId:"AMB-B"})]);
    check("Ambiguous Authority does not force Canonical Result",ambiguousFed.entities[0].authority.status==="ambiguous"&&ambiguousFed.entities[0].canonicalResult===null,ambiguousFed.entities[0].authority.status,"Authority","Critical");

    const explicitA=fixture({recordId:"EXP-A",sourceId:"EXP-A",relationships:[{type:"conflicts-with",targetId:"EXP-B",explicit:true}]});
    const explicitB=fixture({recordId:"EXP-B",sourceId:"EXP-B"});
    const explicitConflicts=namespace.detectKnowledgeConflicts([explicitA,explicitB]);
    check("Explicit conflicts-with becomes Confirmed Conflict",explicitConflicts.length===1&&explicitConflicts[0].status==="confirmed"&&explicitConflicts[0].conflictType==="explicit-conflict",explicitConflicts[0]&&explicitConflicts[0].status,"Conflict","Critical");
    const derivedA=fixture({recordId:"DER-A",sourceId:"DER-A",sourceMetadata:{comparable:{enabled:true}}});
    const derivedB=fixture({recordId:"DER-B",sourceId:"DER-B",sourceMetadata:{comparable:{enabled:false}}});
    const derived=namespace.detectKnowledgeConflicts([derivedA,derivedB]);
    check("Structured value difference becomes Conflict Candidate",derived.length===1&&derived[0].status==="candidate"&&derived[0].comparedField==="enabled",derived[0]&&derived[0].status,"Conflict","Critical");
    check("Derived Candidate is not Confirmed",derived.every(function(x){return x.status!=="confirmed";}),derived.map(function(x){return x.status;}).join(","),"Conflict","Critical");
    check("Conflict detection uses no numeric score",hasScore(derived)===false&&derived[0].metadata.scoringUsed===false,JSON.stringify(derived[0].metadata),"Safety","Critical");
    check("Free-text semantic confirmation is disabled",derived[0].metadata.semanticFreeTextConfirmationUsed===false,derived[0].metadata.semanticFreeTextConfirmationUsed,"Safety","Critical");
    const lineageA=fixture({recordId:"LIN-A",sourceId:"LIN-A",relationships:[{type:"supersedes",targetId:"LIN-B"}]});
    const lineageB=fixture({recordId:"LIN-B",sourceId:"LIN-B"});
    const lineageDiff=namespace.detectKnowledgeConflicts([lineageA,lineageB]);
    check("Explicit supersedes resolves difference by lineage",lineageDiff.length===1&&lineageDiff[0].status==="resolved-by-lineage",lineageDiff[0]&&lineageDiff[0].status,"Conflict Lifecycle","Critical");
    const hist=namespace.detectKnowledgeConflicts([fixture({recordId:"H-A",sourceId:"H-A",lifecycle:"historical"}),fixture({recordId:"H-B",sourceId:"H-B",sourceMetadata:{comparable:{enabled:false}}})]);
    check("Historical Source difference is classified historical",hist.length===1&&hist[0].status==="historical",hist[0]&&hist[0].status,"Conflict Lifecycle","Critical");
    const proposal=namespace.detectKnowledgeConflicts([fixture({recordId:"P-A",sourceId:"P-A",lifecycle:"proposal"}),fixture({recordId:"P-B",sourceId:"P-B"})]);
    check("Proposal Source difference is classified proposal",proposal.length===1&&proposal[0].status==="proposal",proposal[0]&&proposal[0].status,"Conflict Lifecycle","Critical");
    const scoped=namespace.detectKnowledgeConflicts([fixture({recordId:"S-A",sourceId:"S-A",scope:{platform:"android"}}),fixture({recordId:"S-B",sourceId:"S-B",scope:{platform:"desktop"}})]);
    check("Different Scope is classified scope-specific",scoped.length===1&&scoped[0].status==="scope-specific",scoped[0]&&scoped[0].status,"Conflict Lifecycle","Critical");
    const reevaluated=namespace.reEvaluateKnowledgeConflict(derived[0],[derivedA,fixture({recordId:"DER-B",sourceId:"DER-B",sourceMetadata:{comparable:{enabled:true}}})]);
    check("Conflict Candidate can re-evaluate to resolved without Source mutation",reevaluated.status==="resolved"&&reevaluated.sourceMutationPerformed===false,reevaluated.status,"Conflict Lifecycle","Critical");

    const memoStatus=namespace.getMemoProviderStatus(); const knowledgeStatus=namespace.getKnowledgeProviderStatus(); const archStatus=namespace.getArchitectureProviderStatus(); const validationStatus=namespace.getValidationProviderStatus();
    [memoStatus,knowledgeStatus,archStatus,validationStatus].forEach(function(ps){check("Current Source Provider availability is explicit: "+ps.providerId,["available","partial","unavailable"].includes(ps.availability),ps.availability,"Providers","Critical");check("Current Source Provider forbids mutation: "+ps.providerId,ps.mutationAllowed===false,ps.mutationAllowed,"Safety","Critical");});
    check("Knowledge Provider explicitly avoids score-based deduplication",knowledgeStatus.scoreBasedDeduplicationUsed===false,knowledgeStatus.scoreBasedDeduplicationUsed,"Safety","Critical");
    const memoRecords=namespace.listMemoSourceRecords(); const knowledgeRecords=namespace.listKnowledgeSourceRecords(); const archRecords=namespace.listArchitectureSourceRecords(); const validationRecords=namespace.listValidationSourceRecords();
    [memoRecords,knowledgeRecords,archRecords,validationRecords].forEach(function(records,index){const name=["Memo","Knowledge","Architecture","Validation"][index];check(name+" Provider returns only valid Normalized Source Records",records.every(function(r){return namespace.validateContract("normalizedSourceRecord",r).valid===true;}),records.length,"Normalization","Critical");check(name+" Provider records are immutable",records.every(function(r){return r.immutable===true;}),records.length,"Read-Only","Critical");});
    check("Knowledge Provider records declare score dedup was not used",knowledgeRecords.every(function(r){return r.sourceMetadata&&r.sourceMetadata.scoreBasedDeduplicationUsed===false;}),knowledgeRecords.length,"Safety","Critical");
    const fedSnapshot=namespace.getKnowledgeNavigatorFederationSnapshot();
    check("Federation Snapshot includes all five Providers",arr(fedSnapshot.providers).length===5,arr(fedSnapshot.providers).length,"Federation","Critical");
    check("Federation Snapshot is read-only",fedSnapshot.readOnly===true,fedSnapshot.readOnly,"Read-Only","Critical");

    const sourceOpen=await namespace.openLatestIntelligencePackageSource({allowIndexedDB:true});
    check("IDE-170 Intelligence Package remains readable",sourceOpen&&sourceOpen.ok===true,sourceOpen&&sourceOpen.code,"Regression","Critical");
    const providerStatus=namespace.getIntelligenceProviderStatus();
    check("IDE-170 Provider remains read-only",providerStatus.readMode==="read-only"&&providerStatus.mutationAllowed===false,providerStatus.readMode,"Regression","Critical");
    const canonical=namespace.loadKnowledgeNavigatorCanonicalSnapshot(); const canonicalRecords=canonical&&canonical.ok===true&&canonical.data?canonical.data.records:[]; const fileRecord=arr(canonicalRecords).find(function(r){return r&&r.recordType==="file";})||null; const fileId=fileRecord&&fileRecord.identity&&fileRecord.identity.canonicalId||"";
    check("Regression fixture file is available",Boolean(fileId),fileId,"Regression","Critical");
    if(fileId){const fileNav=await namespace.navigate({navigationType:"file",target:fileId}); check("Phase 3 File Navigation still completes",fileNav.status==="complete",fileNav.status,"Regression","Critical"); check("Phase 5 Authority still applies to File Navigation",fileNav.authority&&fileNav.authority.status==="resolved",fileNav.authority&&fileNav.authority.status,"Regression","Critical"); check("File Navigation Result remains immutable",Object.isFrozen(fileNav),Object.isFrozen(fileNav),"Read-Only","Critical");}

    async function validateFederatedType(type,records,query){
      const has=records.length>0; const q=query|| (has?(records[0].sourceId||records[0].title):type); const result=await namespace.navigate({navigationType:type,query:q,target:has?{canonicalId:records[0].canonicalEntityId||null,id:records[0].sourceId||null,title:records[0].title||null}:null});
      check(type+" Navigation returns governed status",["complete","partial","missing-source","not-found"].includes(result.status),result.status,"Federated Navigation","Critical");
      if(has){check(type+" Navigation does not report unsupported when Source exists",result.status!=="unsupported",result.status,"Federated Navigation","Critical"); if(["complete","partial"].includes(result.status)){check(type+" Navigation exposes Source Facets",arr(result.metadata&&result.metadata.sourceFacets).length>0,arr(result.metadata&&result.metadata.sourceFacets).length,"Federated Navigation","Critical");check(type+" Navigation returns Conflict array",Array.isArray(result.conflicts),arr(result.conflicts).length,"Conflict Integration","Critical");check(type+" Navigation Result satisfies frozen contract",namespace.validateContract("navigationResult",result).valid===true,namespace.validateContract("navigationResult",result).failed,"Contracts","Critical");check(type+" Explanation satisfies frozen contract",namespace.validateContract("navigationExplanation",result.explanation).valid===true,namespace.validateContract("navigationExplanation",result.explanation).failed,"Explanation","Critical");}}
      else{check(type+" Navigation reports missing Source rather than fabricating target",result.status==="missing-source"||result.status==="not-found",result.status,"No Inference","Critical");}
      return result;
    }
    await validateFederatedType("knowledge",knowledgeRecords);
    await validateFederatedType("architecture",archRecords);
    const decisionRecords=typeof namespace.searchMemoSourceRecords==="function"?namespace.searchMemoSourceRecords("",{kind:"decision"}):[];
    await validateFederatedType("decision",decisionRecords);
    const insightResult=await namespace.navigate({navigationType:"insight",query:"insight"});
    check("Insight Navigation is implemented and Source-bounded",["complete","partial","missing-source","not-found"].includes(insightResult.status),insightResult.status,"Federated Navigation","Critical");
    check("Insight Navigation never fabricates Source on missing artifact",insightResult.status!=="missing-source"||arr(insightResult.sources).length===0,arr(insightResult.sources).length,"No Inference","Critical");
    const explanationResult=await namespace.navigate({navigationType:"explanation",query:"explanation"});
    check("Explanation Navigation is implemented and Source-bounded",["complete","partial","missing-source","not-found"].includes(explanationResult.status),explanationResult.status,"Federated Navigation","Critical");
    check("Explanation Navigation never fabricates Source on missing artifact",explanationResult.status!=="missing-source"||arr(explanationResult.sources).length===0,arr(explanationResult.sources).length,"No Inference","Critical");

    check("Conflict module is Ready",namespace.modules.conflict&&namespace.modules.conflict.status==="Ready",namespace.modules.conflict&&namespace.modules.conflict.status,"Modules","Critical");
    check("Federation module is Ready",namespace.modules.federation&&namespace.modules.federation.status==="Ready",namespace.modules.federation&&namespace.modules.federation.status,"Modules","Critical");
    check("Memo Provider module is Ready",namespace.modules.memoProvider&&namespace.modules.memoProvider.status==="Ready",namespace.modules.memoProvider&&namespace.modules.memoProvider.status,"Modules","Critical");
    check("Knowledge Provider module is Ready",namespace.modules.knowledgeProvider&&namespace.modules.knowledgeProvider.status==="Ready",namespace.modules.knowledgeProvider&&namespace.modules.knowledgeProvider.status,"Modules","Critical");
    check("Architecture Provider module is Ready",namespace.modules.architectureProvider&&namespace.modules.architectureProvider.status==="Ready",namespace.modules.architectureProvider&&namespace.modules.architectureProvider.status,"Modules","Critical");
    check("Validation Provider module is Ready",namespace.modules.validationProvider&&namespace.modules.validationProvider.status==="Ready",namespace.modules.validationProvider&&namespace.modules.validationProvider.status,"Modules","Critical");
    check("Federated Resolver module is Ready",namespace.modules.federatedResolver&&namespace.modules.federatedResolver.status==="Ready",namespace.modules.federatedResolver&&namespace.modules.federatedResolver.status,"Modules","Critical");
    check("Orchestrator remains Ready",namespace.modules.orchestrator&&namespace.modules.orchestrator.status==="Ready",namespace.modules.orchestrator&&namespace.modules.orchestrator.status,"Modules","Critical");
    check("Phase 6 Validation module is loaded",Boolean(namespace.modules.phase6Validation),namespace.modules.phase6Validation&&namespace.modules.phase6Validation.status,"Modules","Critical");

    const passed=checks.filter(function(x){return x.passed;}).length; const failed=checks.length-passed; const criticalFailed=checks.filter(function(x){return !x.passed&&x.severity==="Critical";}).length;
    const result={id:internal.nextId("IDE-180-PHASE6-VALIDATION"),componentId:"IDE-180",version:VERSION_MANIFEST.release.version,implementationPhase:VERSION_MANIFEST.release.implementationPhase,passed:passed,failed:failed,total:checks.length,health:checks.length?Number(((passed/checks.length)*100).toFixed(2)):null,criticalFailed:criticalFailed,status:failed===0?"IDE-180 Phase 6 Federation / Conflict PASS":"IDE-180 Phase 6 Federation / Conflict FAIL",releaseAllowed:failed===0,phase7Allowed:failed===0,readOnly:true,authorityScoringAllowed:false,conflictScoringAllowed:false,allCoreNavigationTypesImplemented:implemented.length===20,sourceProviders:{memo:memoStatus,knowledge:knowledgeStatus,architecture:archStatus,validation:validationStatus,intelligence:providerStatus},checks:checks,validatedAt:internal.nowIso()};
    state.lastValidation=internal.clone(result); namespace.modules.phase6Validation.status=failed===0?"Ready":"Blocked"; internal.touch(); return internal.clone(result);
  }
  function getStatus(){return state.lastValidation?internal.clone(state.lastValidation):{componentId:"IDE-180",version:VERSION_MANIFEST.release.version,status:"Not Validated",releaseAllowed:false,phase7Allowed:false};}
  Object.assign(namespace.api,{runKnowledgeNavigatorPhase6Validation:runKnowledgeNavigatorPhase6Validation,getKnowledgeNavigatorPhase6ValidationStatus:getStatus}); Object.assign(namespace,namespace.api);
  namespace.modules.phase6Validation={id:"IDE-180-PHASE6-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:6,readOnly:true,loadedAt:internal.nowIso()};
  global.runKnowledgeNavigatorPhase6Validation=runKnowledgeNavigatorPhase6Validation;
})(typeof window!=="undefined"?window:globalThis);
