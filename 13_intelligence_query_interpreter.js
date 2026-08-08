/* ============================================================
   FILE: 13_intelligence_query_interpreter.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: 1.0.0
   Phase 6: Domain-Specific Japanese Query Interpreter
   Architecture Decision: IDE-170-007
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("queryInterpreter");
  const CAPABILITY_ID = "IDE-170-QUERY-INTERPRETER";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const SCHEMA_ID = "IDE-170-SCHEMA-TYPED-QUERY";
  const SCHEMA_VERSION = VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID);
  const ARTIFACT_VERSION = VERSION_MANIFEST.getArtifactVersion("typedQuery");
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;

  if (!(state.typedQueries instanceof Map)) state.typedQueries = new Map();
  if (!Object.prototype.hasOwnProperty.call(state,"latestTypedQueryId")) state.latestTypedQueryId = null;

  const QUERY_TYPES = Object.freeze({
    "entity-lookup": { targetRequired:true, domain:"repository" },
    "entity-summary": { targetRequired:true, domain:"repository" },
    "entity-search": { targetRequired:false, domain:"repository" },
    "member-list": { targetRequired:true, domain:"repository" },
    "ownership-trace": { targetRequired:true, domain:"repository" },
    "dependency-analysis": { targetRequired:true, domain:"repository" },
    "reverse-dependency-analysis": { targetRequired:true, domain:"repository" },
    "relationship-path": { targetRequired:true, secondTargetRequired:true, domain:"repository" },
    "relationship-search": { targetRequired:true, domain:"repository" },
    "change-analysis": { targetRequired:false, domain:"change" },
    "snapshot-diff": { targetRequired:false, domain:"change" },
    "change-history": { targetRequired:false, domain:"change" },
    "impact-candidate-analysis": { targetRequired:true, domain:"change" },
    "rename-candidate-search": { targetRequired:false, domain:"change" },
    "workflow-trace": { targetRequired:false, domain:"workflow" },
    "decision-trace": { targetRequired:false, domain:"workflow" },
    "approval-trace": { targetRequired:false, domain:"workflow" },
    "execution-trace": { targetRequired:false, domain:"workflow" },
    "rollback-trace": { targetRequired:false, domain:"workflow" },
    "deployment-trace": { targetRequired:false, domain:"workflow" },
    "validation-trace": { targetRequired:false, domain:"quality" },
    "diagnostic-trace": { targetRequired:false, domain:"quality" },
    "evidence-trace": { targetRequired:true, domain:"intelligence" },
    "explanation-request": { targetRequired:true, domain:"intelligence" },
    "insight-search": { targetRequired:false, domain:"intelligence" },
    "missing-information-search": { targetRequired:false, domain:"intelligence" }
  });

  function normalizeInput(value) {
    if (typeof namespace.normalizeJapaneseQuery === "function") return namespace.normalizeJapaneseQuery(value);
    let text = String(value == null ? "" : value);
    if (typeof text.normalize === "function") text = text.normalize("NFKC");
    return text.replace(/\s+/g," ").trim();
  }

  function classifyIntent(input) {
    const text = normalizeInput(input);
    const rules = [
      { type:"reverse-dependency-analysis", tests:[/呼び出している/,/呼出している/,/呼び出し元/,/呼出元/,/参照元/,/使っている側/] },
      { type:"dependency-analysis", tests:[/呼び出して(?!いる)/,/呼出先/,/依存先/,/依存している/,/使われている[?？]?$/] },
      { type:"member-list", tests:[/関数一覧/,/メンバー一覧/,/含まれる関数/,/の関数[はを]?一覧/] },
      { type:"snapshot-diff", tests:[/前回から/,/スナップショット.*差分/,/snapshot.*diff/i,/何が変わった/,/変わったファイル/] },
      { type:"workflow-trace", tests:[/IDE-?\d+.*(?:で|が).*(?:変更された|変更した).*ファイル/] },
      { type:"change-analysis", tests:[/変更された/,/変更内容/,/変更を分析/,/修正された/] },
      { type:"rollback-trace", tests:[/ロールバック/,/rollback/i,/巻き戻し/] },
      { type:"approval-trace", tests:[/承認履歴/,/承認.*流れ/,/approval/i] },
      { type:"decision-trace", tests:[/判断履歴/,/決定履歴/,/decision/i] },
      { type:"execution-trace", tests:[/実行履歴/,/execution/i] },
      { type:"deployment-trace", tests:[/デプロイ/,/deployment/i] },
      { type:"workflow-trace", tests:[/workflow/i,/ワークフロー/,/作業履歴/,/で変更されたファイル/] },
      { type:"validation-trace", tests:[/検証.*失敗/,/validation/i,/テスト.*失敗/,/検証結果/] },
      { type:"diagnostic-trace", tests:[/診断/,/diagnostic/i] },
      { type:"evidence-trace", tests:[/根拠/,/evidence/i,/証拠/] },
      { type:"explanation-request", tests:[/説明して/,/なぜ/,/理由は/,/どうして/] },
      { type:"relationship-path", tests:[/関係経路/,/パス/,/つながり.*経路/] },
      { type:"relationship-search", tests:[/関係する/,/関連する/,/関係.*ファイル/,/関連.*ファイル/] },
      { type:"missing-information-search", tests:[/不足情報/,/何が足りない/,/missing information/i] },
      { type:"insight-search", tests:[/insight/i,/インサイト/,/候補を探/] },
      { type:"entity-search", tests:[/似た名前/,/検索して/,/探して/] },
      { type:"entity-summary", tests:[/状態[?？]?$/,/ステータス[?？]?$/,/概要[?？]?$/,/summary/i] },
      { type:"entity-lookup", tests:[/とは[?？]?$/,/どこ[?？]?$/,/教えて/,/確認して/] }
    ];
    const candidates=[];
    rules.forEach(function(rule,index){ if(rule.tests.some(function(re){ return re.test(text); })) candidates.push({queryType:rule.type,rank:index}); });
    if (!candidates.length) return { status:"Needs Resolution", queryType:null, candidates:[], reason:"Intent could not be determined from the governed Query Type Registry." };
    const unique=[]; const seen=new Set();
    candidates.forEach(function(x){ if(!seen.has(x.queryType)){ seen.add(x.queryType); unique.push(x); } });
    return { status:"Resolved", queryType:unique[0].queryType, candidates:unique.map(function(x){return x.queryType;}), alternatives:unique.slice(1).map(function(x){return x.queryType;}) };
  }

  function contextTarget(settings) {
    const t = settings && (settings.contextTarget || settings.target);
    if (!t || typeof t !== "object") return null;
    const canonicalId = internal.text(t.canonicalId || t.id,"");
    if (!canonicalId) return null;
    return { canonicalId:canonicalId, recordType:internal.text(t.recordType,"unknown"), name:internal.text(t.name,canonicalId), resolutionStatus:"Resolved", resolutionSource:"conversation-context" };
  }

  function recordList(settings) {
    if (settings && Array.isArray(settings.records)) return settings.records;
    if (settings && settings.canonicalSnapshot && Array.isArray(settings.canonicalSnapshot.records)) return settings.canonicalSnapshot.records;
    if (settings && settings.snapshotId && typeof namespace.getCanonicalSnapshot === "function") {
      const s=namespace.getCanonicalSnapshot(settings.snapshotId); if(s&&Array.isArray(s.records)) return s.records;
    }
    if (state.latestCanonicalSnapshotId && typeof namespace.getCanonicalSnapshot === "function") {
      const s=namespace.getCanonicalSnapshot(state.latestCanonicalSnapshotId); if(s&&Array.isArray(s.records)) return s.records;
    }
    return [];
  }

  function identityValues(record) {
    const id=record&&record.identity||{};
    return internal.unique([id.canonicalId,id.name,id.qualifiedName].concat(id.aliases||[]));
  }

  function preferredRecordTypes(input, queryType) {
    const normalized=normalizeInput(input);
    const preferred=[];
    const hasFileExtension=/(?:^|[\s\/\\])[^\s]+\.(?:js|mjs|cjs|html?|css|json|md|txt|csv|tsv)(?:$|[\sのはをがと?？])/i.test(normalized) || /\.(?:js|mjs|cjs|html?|css|json|md|txt|csv|tsv)/i.test(normalized);
    if(queryType==="member-list" || hasFileExtension || /ファイル/.test(normalized)) preferred.push("file");
    if(/モジュール/.test(normalized)) preferred.push("module");
    if(queryType!=="member-list" && !hasFileExtension && /関数/.test(normalized)) preferred.push("function");
    return internal.unique(preferred);
  }

  function resolveEntity(input, queryType, settings) {
    const normalized=normalizeInput(input);
    const pronoun=/(この関数|このファイル|この結果|これ|それ|対象)/.test(normalized);
    const contextual=contextTarget(settings||{});
    if(pronoun && contextual) return { status:"Resolved", target:contextual, candidates:[contextual], ambiguities:[], usedContext:true };

    const records=recordList(settings||{});
    const matches=[];
    const lower=normalized.toLowerCase();
    records.forEach(function(record){
      const values=identityValues(record);
      let best=0, matched="";
      values.forEach(function(v){
        const val=String(v||"").trim(); if(!val) return;
        const vl=val.toLowerCase();
        if(lower.includes(vl)) { const score=1000+val.length; if(score>best){best=score;matched=val;} }
      });
      if(best>0){
        const identity=record.identity||{};
        matches.push({ canonicalId:identity.canonicalId, recordType:record.recordType, name:identity.name||identity.qualifiedName||identity.canonicalId, qualifiedName:identity.qualifiedName||"", score:best, matchedTerm:matched, resolutionStatus:"Resolved", resolutionSource:"canonical-snapshot" });
      }
    });
    matches.sort(function(a,b){ return b.score-a.score || String(a.canonicalId).localeCompare(String(b.canonicalId)); });
    const type=QUERY_TYPES[queryType]||{};
    if(!matches.length){
      if(pronoun) return {status:"Needs Resolution",target:null,candidates:[],ambiguities:["Context target is required for pronoun reference."],usedContext:false};
      if(type.targetRequired) return {status:"Needs Resolution",target:null,candidates:[],ambiguities:["Target Entity could not be resolved from the current Canonical Snapshot."],usedContext:false};
      return {status:"Not Required",target:null,candidates:[],ambiguities:[],usedContext:false};
    }
    const top=matches[0];
    let tied=matches.filter(function(x){return x.score===top.score && x.matchedTerm.toLowerCase()===top.matchedTerm.toLowerCase();});
    if(tied.length>1){
      const preferred=preferredRecordTypes(normalized,queryType);
      for(let i=0;i<preferred.length;i+=1){
        const typed=tied.filter(function(x){return x.recordType===preferred[i];});
        if(typed.length===1){
          const resolved=Object.assign({},typed[0],{resolutionSource:"canonical-snapshot-type-preference"});
          return {status:"Resolved",target:resolved,candidates:matches.slice(0,10),ambiguities:[],usedContext:false};
        }
        if(typed.length>1){tied=typed;break;}
      }
      return {status:"Ambiguous",target:null,candidates:tied,ambiguities:["Multiple Canonical Records match the same Entity expression."],usedContext:false};
    }
    return {status:"Resolved",target:top,candidates:matches.slice(0,10),ambiguities:[],usedContext:false};
  }

  function buildScope(queryType, settings) {
    const type=QUERY_TYPES[queryType]||{};
    const snapshotId=internal.text(settings&&settings.snapshotId, state.latestCanonicalSnapshotId||"");
    return {
      projectId: internal.text(settings&&settings.projectId,"project:ai-prompt-os"),
      snapshotId:snapshotId,
      domains:internal.unique(settings&&settings.domains || [type.domain||"repository"]),
      relationshipDepth:Number.isInteger(settings&&settings.relationshipDepth)?Math.max(1,Math.min(5,settings.relationshipDepth)):1,
      includeCandidates:Boolean(settings&&settings.includeCandidates===true),
      defaultScopeUsed:!(settings&&settings.snapshotId)
    };
  }

  function validateTypedQuery(query) {
    const errors=[],warnings=[];
    if(!query||typeof query!=="object") errors.push("Typed Query is missing.");
    else {
      if(!query.queryId) errors.push("queryId is required.");
      if(!QUERY_TYPES[query.queryType]) errors.push("queryType is not registered.");
      const t=QUERY_TYPES[query.queryType]||{};
      if(t.targetRequired && (!query.target || query.target.resolutionStatus!=="Resolved")) errors.push("Required target is unresolved.");
      if(query.interpretation && query.interpretation.ambiguities && query.interpretation.ambiguities.length) warnings.push.apply(warnings,query.interpretation.ambiguities);
      if(query.scope && (!Number.isInteger(query.scope.relationshipDepth)||query.scope.relationshipDepth<1||query.scope.relationshipDepth>5)) errors.push("relationshipDepth is outside the allowed range.");
    }
    return {valid:errors.length===0,status:errors.length?"Invalid":warnings.length?"Partial":"Valid",errors:errors,warnings:internal.unique(warnings),validatedAt:internal.nowIso()};
  }

  function interpretQuery(input, options) {
    const settings=internal.isPlainObject(options)?options:{};
    const original=String(input==null?"":input);
    const normalized=normalizeInput(original);
    if(!normalized) return internal.buildResult(false,"QUERY_EMPTY","Invalid",null,{error:{message:"Query input is empty.",category:"Validation Failure"}});
    const terminology=typeof namespace.resolveTerminology==="function"?namespace.resolveTerminology(normalized):{matches:[],resolvedTerms:[]};
    const intent=classifyIntent(normalized);
    if(!intent.queryType){
      return internal.buildResult(false,"QUERY_INTENT_NEEDS_RESOLUTION","Needs Resolution",{ originalInput:original, normalizedInput:normalized, intent:intent, terminology:terminology },{warnings:[intent.reason]});
    }
    const entity=resolveEntity(normalized,intent.queryType,settings);
    if(entity.status==="Ambiguous" || entity.status==="Needs Resolution"){
      return internal.buildResult(false,entity.status==="Ambiguous"?"QUERY_ENTITY_AMBIGUOUS":"QUERY_ENTITY_NEEDS_RESOLUTION",entity.status,{ originalInput:original, normalizedInput:normalized, queryType:intent.queryType, entityResolution:entity, terminology:terminology },{warnings:entity.ambiguities});
    }
    const now=internal.nowIso();
    const query={
      queryId:internal.nextId("IDE-170-QUERY"), artifactVersion:ARTIFACT_VERSION, schemaVersion:SCHEMA_VERSION, queryType:intent.queryType,
      originalInput:original, normalizedInput:normalized, language:"ja",
      target:entity.target,
      scope:buildScope(intent.queryType,settings),
      requirements:{evidenceRequired:settings.evidenceRequired!==false,explanationRequired:settings.explanationRequired!==false,minimumConfidence:null,confidencePhase:"Deferred to Phase 7"},
      interpretation:{intent:intent.queryType,status:"Resolved",ambiguities:entity.ambiguities||[],intentCandidates:intent.candidates||[],alternativeIntents:intent.alternatives||[],aliasesUsed:terminology.matches||[],usedConversationContext:entity.usedContext===true},
      validation:null,status:"Validating",createdAt:now,frozenAt:null,immutable:false
    };
    query.validation=validateTypedQuery(query);
    query.status=query.validation.valid?"Ready":"Invalid";
    if(!query.validation.valid) return internal.buildResult(false,"TYPED_QUERY_INVALID","Invalid",{query:query},{error:{message:"Typed Query failed validation.",category:"Validation Failure"}});
    query.frozenAt=internal.nowIso(); query.immutable=true; query.status="Ready";
    const frozen=internal.deepFreeze(internal.clone(query));
    state.typedQueries.set(query.queryId,frozen); state.latestTypedQueryId=query.queryId; internal.touch();
    return internal.buildResult(true,"TYPED_QUERY_READY","Ready",{query:internal.clone(frozen),terminology:terminology,entityResolution:entity});
  }

  function getTypedQuery(id){ return internal.clone(state.typedQueries.get(internal.text(id,""))||null); }
  function listTypedQueries(){ return [...state.typedQueries.values()].map(internal.clone); }
  function getQueryTypes(){ return Object.keys(QUERY_TYPES).sort().map(function(id){return Object.assign({queryType:id},QUERY_TYPES[id]);}); }

  function registerSchema(){
    const existing=namespace.getSchema&&namespace.getSchema(SCHEMA_ID);
    if(existing&&existing.version===SCHEMA_VERSION) return internal.buildResult(true,"SCHEMA_EXISTS","Ready",{schema:existing});
    if(existing&&internal.removeSchemaForValidation) internal.removeSchemaForValidation(SCHEMA_ID);
    return namespace.registerSchema({schemaId:SCHEMA_ID,name:"Typed Query",version:SCHEMA_VERSION,type:"object",required:["queryId","schemaVersion","queryType","originalInput","normalizedInput","language","scope","requirements","interpretation","validation","status","createdAt","immutable"],properties:{queryId:{type:"string"},schemaVersion:{type:"string"},queryType:{type:"string"},originalInput:{type:"string"},normalizedInput:{type:"string"},language:{type:"string"},scope:{type:"object"},requirements:{type:"object"},interpretation:{type:"object"},validation:{type:"object"},status:{type:"string"},createdAt:{type:"string"},immutable:{type:"boolean"}},additionalProperties:true,owner:"IDE-170",source:"Architecture Decision 007"});
  }
  function registerCapability(){
    const existing=namespace.getCapability&&namespace.getCapability(CAPABILITY_ID);
    if(existing&&existing.version===CAPABILITY_VERSION) return internal.buildResult(true,"CAPABILITY_EXISTS","Ready",{capability:existing});
    if(existing&&internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({capabilityId:CAPABILITY_ID,name:"Domain-Specific Japanese Query Interpreter",version:CAPABILITY_VERSION,type:"Query",status:"Active",owner:"IDE-170",dependencies:[{capabilityId:"IDE-170-CORE",minimumVersion:MINIMUM_VERSION,optional:false},{capabilityId:"IDE-170-TERMINOLOGY-REGISTRY",minimumVersion:MINIMUM_VERSION,optional:false},{capabilityId:"IDE-170-CANONICAL-MODEL",minimumVersion:MINIMUM_VERSION,optional:false}],schemas:[SCHEMA_ID],provides:["Intent Recognition","Entity Resolution","Scope Resolution","Ambiguity Detection","Typed Query"],source:"Architecture Decision 007"});
  }
  function initializeQueryInterpreter(){
    const sr=registerSchema(),cr=registerCapability();
    const ready=sr.ok===true&&cr.ok===true&&typeof namespace.normalizeJapaneseQuery==="function";
    namespace.modules.queryInterpreter.status=ready?"Ready":"Blocked";
    return internal.buildResult(ready,ready?"QUERY_INTERPRETER_INITIALIZED":"QUERY_INTERPRETER_INITIALIZATION_FAILED",ready?"Ready":"Blocked",{schemaResult:sr,capabilityResult:cr,queryTypeCount:Object.keys(QUERY_TYPES).length});
  }
  function getQueryInterpreterStatus(){return{id:"IDE-170-QUERY-INTERPRETER-STATUS",version:MODULE_VERSION,capabilityVersion:CAPABILITY_VERSION,status:namespace.getCapability&&namespace.getCapability(CAPABILITY_ID)?"Ready":"Loaded",ready:Boolean(namespace.getCapability&&namespace.getCapability(CAPABILITY_ID)),queryTypeCount:Object.keys(QUERY_TYPES).length,typedQueryCount:state.typedQueries.size,latestTypedQueryId:state.latestTypedQueryId,naturalLanguageDirectReasoningAllowed:false};}

  Object.assign(namespace.api,{initializeQueryInterpreter,interpretQuery,getTypedQuery,listTypedQueries,getQueryTypes,validateTypedQuery,getQueryInterpreterStatus});
  Object.assign(namespace,namespace.api);
  namespace.modules.queryInterpreter={id:CAPABILITY_ID,version:MODULE_VERSION,capabilityVersion:CAPABILITY_VERSION,status:"Loaded",typedQuery:true,entityResolution:true,scopeResolution:true,ambiguityDetection:true,naturalLanguageDirectReasoningAllowed:false,loadedAt:internal.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
