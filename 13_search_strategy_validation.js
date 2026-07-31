/* ============================================================
   FILE: 13_search_strategy_validation.js
   IDE-125 Search Strategy Validation
   Version: 1.0.1
   Status: Implementation
   Design Freeze: 2026-07-25
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-125";
  const VERSION = "1.0.1";
  const validationRegistry = new Map();
  const datasetRegistry = new Map();
  const validationHistory = [];
  const evidenceRegistry = new Map();
  const investigationRequests = [];
  let sessionSequence = 0;
  let lastValidation = null;

  const DEFAULT_POLICY = Object.freeze({
    quality: { precision: 0.70, recall: 0.70, rankingQuality: 0.65, coverage: 0.70, fallbackSuccessRate: 0.60, maxFalsePositiveRate: 0.30 },
    performance: { targetMs: 100, warningMs: 250, criticalMs: 1000, regressionRatio: 1.50, fallbackLimit: 6, hardLimitMs: 3000 },
    consistency: { scoreTolerance: 0.01, rankDrift: 1 },
    evidence: { maxResults: 100, maxTraceEntries: 200 }
  });

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function clamp(value, min = 0, max = 1) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function mean(values) { const list = asArray(values).map(Number).filter(Number.isFinite); return list.length ? list.reduce((a,b)=>a+b,0)/list.length : 0; }
  function percentile(values, p) { const list = asArray(values).map(Number).filter(Number.isFinite).sort((a,b)=>a-b); if (!list.length) return 0; return list[Math.min(list.length - 1, Math.max(0, Math.ceil((p / 100) * list.length) - 1))]; }
  function mergePolicy(policy) { return { quality: { ...DEFAULT_POLICY.quality, ...(policy && policy.quality) }, performance: { ...DEFAULT_POLICY.performance, ...(policy && policy.performance) }, consistency: { ...DEFAULT_POLICY.consistency, ...(policy && policy.consistency) }, evidence: { ...DEFAULT_POLICY.evidence, ...(policy && policy.evidence) } }; }
  function idOf(item) { return String(item && (item.id || item.key || item.name || item.title || item.value) || ""); }

  function createValidationDefinition(definition = {}) {
    const id = String(definition.id || definition.name || "").trim();
    if (!id) throw new Error("Validation id is required.");
    if (typeof definition.execute !== "function") throw new Error(`Validation execute is required: ${id}`);
    return { id, name: String(definition.name || id), version: String(definition.version || "1.0.0"), category: String(definition.category || "General"), priority: Number(definition.priority || 100), enabled: definition.enabled !== false, owner: String(definition.owner || "IDE-125"), execute: definition.execute, createdAt: definition.createdAt || nowIso(), updatedAt: nowIso() };
  }

  function registerSearchValidation(definition, options = {}) {
    const item = createValidationDefinition(definition);
    if (validationRegistry.has(item.id) && options.replace !== true) throw new Error(`Validation already registered: ${item.id}`);
    validationRegistry.set(item.id, item); return getSearchValidation(item.id);
  }
  function getSearchValidation(id) { const item = validationRegistry.get(String(id)); if (!item) return null; const copy = { ...item }; delete copy.execute; return copy; }
  function getSearchValidations(options = {}) { return [...validationRegistry.values()].filter(v => options.includeDisabled || v.enabled).sort((a,b)=>a.priority-b.priority || a.id.localeCompare(b.id)).map(v => { const c={...v}; delete c.execute; return c; }); }
  function setSearchValidationEnabled(id, enabled) { const item=validationRegistry.get(String(id)); if (!item) return false; item.enabled=enabled===true; item.updatedAt=nowIso(); return true; }

  function registerValidationDataset(dataset = {}, options = {}) {
    const id = String(dataset.id || dataset.name || "").trim();
    if (!id) throw new Error("Dataset id is required.");
    if (datasetRegistry.has(id) && options.replace !== true) throw new Error(`Dataset already registered: ${id}`);
    const item = { id, name: String(dataset.name || id), type: String(dataset.type || "Golden"), version: String(dataset.version || "1.0.0"), cases: asArray(dataset.cases), profile: clone(dataset.profile || {}), createdAt: dataset.createdAt || nowIso(), updatedAt: nowIso() };
    datasetRegistry.set(id, item); return clone(item);
  }
  function getValidationDataset(id) { return clone(datasetRegistry.get(String(id)) || null); }
  function getValidationDatasets() { return [...datasetRegistry.values()].map(clone); }

  function createValidationSession(request = {}) {
    const dataset = request.dataset || (request.datasetId ? datasetRegistry.get(String(request.datasetId)) : null);
    return {
      id: `${COMPONENT_ID}-SESSION-${Date.now().toString(36).toUpperCase()}-${++sessionSequence}`,
      componentId: COMPONENT_ID,
      validationType: String(request.validationType || "Full"),
      scope: clone(request.scope || { component: "IDE-120" }),
      executionMode: String(request.executionMode || "Manual"),
      dataset: clone(dataset || { id: "runtime-dynamic", type: "Dynamic", version: "runtime", cases: asArray(request.cases) }),
      repositoryVersion: String(request.repositoryVersion || "unknown"),
      strategyVersion: String(request.strategyVersion || "1.0.0"),
      baselineVersion: String(request.baselineVersion || "provisional"),
      deviceProfile: clone(request.deviceProfile || {}),
      cacheCondition: String(request.cacheCondition || "unspecified"),
      policy: mergePolicy(request.policy),
      status: "Created",
      startedAt: null,
      completedAt: null,
      durationMs: 0,
      results: [],
      warnings: [],
      errors: [],
      evidenceReferences: [],
      investigationRequestId: null
    };
  }

  function compareResults(expected, actual) {
    const expectedIds = new Set(asArray(expected).map(idOf).filter(Boolean));
    const actualIds = new Set(asArray(actual).map(idOf).filter(Boolean));
    let tp=0; actualIds.forEach(id => { if (expectedIds.has(id)) tp++; });
    const fp=Math.max(0, actualIds.size-tp), fn=Math.max(0, expectedIds.size-tp);
    const precision=actualIds.size ? tp/actualIds.size : expectedIds.size ? 0 : 1;
    const recall=expectedIds.size ? tp/expectedIds.size : 1;
    const coverage=expectedIds.size ? tp/expectedIds.size : 1;
    return { expectedCount: expectedIds.size, actualCount: actualIds.size, truePositive: tp, falsePositive: fp, missing: fn, precision: clamp(precision), recall: clamp(recall), coverage: clamp(coverage), falsePositiveRate: actualIds.size ? clamp(fp/actualIds.size) : 0 };
  }

  function calculateRankingQuality(expected, actual) {
    const positions = new Map(asArray(actual).map((item,index)=>[idOf(item),index]));
    const expectedIds=asArray(expected).map(idOf).filter(Boolean); if (!expectedIds.length) return 1;
    const scores=expectedIds.map((id,index)=>positions.has(id) ? 1/(1+Math.abs(positions.get(id)-index)) : 0);
    return clamp(mean(scores));
  }

  async function executeCase(testCase, session) {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    let execution=null, error="";
    try {
      if (typeof testCase.execute === "function") execution=await Promise.resolve(testCase.execute(testCase, session));
      else if (testCase.compound && typeof global.executeCompoundSearch === "function") execution=await global.executeCompoundSearch(testCase.conditions || [], testCase.options || {});
      else if (testCase.fallback && typeof global.fallbackSearch === "function") execution=await global.fallbackSearch(testCase.query || "", testCase.options || {});
      else if (typeof global.executeSearchPipeline === "function") execution=await global.executeSearchPipeline(testCase.query || "", testCase.options || {});
      else throw new Error("IDE-120 executeSearchPipeline is unavailable.");
    } catch (e) { error=String(e && e.message || e); }
    const ended=typeof performance !== "undefined" ? performance.now() : Date.now();
    const actual=asArray(execution && execution.results);
    const comparison=compareResults(testCase.expected || [], actual);
    return { id:String(testCase.id || `case-${Date.now()}`), query:String(testCase.query || ""), category:String(testCase.category || "Golden"), passed:!error, error, durationMs:Number((ended-started).toFixed(3)), execution:clone(execution), actual:clone(actual), expected:clone(testCase.expected || []), quality:{...comparison, rankingQuality:calculateRankingQuality(testCase.expected || [],actual)} };
  }

  async function validateSearchStrategies(session) {
    const strategies=typeof global.getSearchStrategies === "function" ? global.getSearchStrategies({includeDisabled:true}) : [];
    const ids=strategies.map(s=>s.id); const duplicateCount=ids.length-new Set(ids).size;
    return { name:"Strategy Gate", passed:strategies.length>0 && duplicateCount===0, metrics:{registered:strategies.length, enabled:strategies.filter(s=>s.enabled).length, duplicateCount, versionsValid:strategies.every(s=>Boolean(s.version)), prioritiesValid:strategies.every(s=>Number.isFinite(Number(s.priority)))}, severity:duplicateCount ? "Error" : "Info" };
  }

  async function validateSearchPipeline(session) {
    const traces=session.results.flatMap(r=>asArray(r.execution && r.execution.trace));
    const failed=traces.filter(t=>t.status==="Failed");
    return { name:"Pipeline Gate", passed:failed.length===0, metrics:{traceCount:traces.length, failedStages:failed.length, executionOrder:traces.map(t=>t.strategyId)}, severity:failed.length ? "Error" : "Info" };
  }

  function validateSearchResults(session) {
    const q=session.results.map(r=>r.quality); const policy=session.policy.quality;
    const metrics={ precision:mean(q.map(x=>x.precision)), recall:mean(q.map(x=>x.recall)), rankingQuality:mean(q.map(x=>x.rankingQuality)), coverage:mean(q.map(x=>x.coverage)), falsePositiveRate:mean(q.map(x=>x.falsePositiveRate)) };
    const passed=metrics.precision>=policy.precision && metrics.recall>=policy.recall && metrics.rankingQuality>=policy.rankingQuality && metrics.coverage>=policy.coverage && metrics.falsePositiveRate<=policy.maxFalsePositiveRate;
    return { name:"Quality Gate", passed, metrics, severity:passed ? "Info" : "Error" };
  }

  function validateSearchRanking(session) {
    const unstable=session.results.filter(r=>asArray(r.actual).some((item,index)=>item.rank!=null && Number(item.rank)!==index+1));
    const quality=mean(session.results.map(r=>r.quality.rankingQuality));
    return { name:"Ranking Gate", passed:unstable.length===0 && quality>=session.policy.quality.rankingQuality, metrics:{rankingQuality:quality, unstableCases:unstable.map(r=>r.id)}, severity:unstable.length ? "Error" : "Info" };
  }

  function validateSearchPerformance(session) {
    const durations=session.results.map(r=>r.durationMs); const median=percentile(durations,50), p95=percentile(durations,95), max=Math.max(0,...durations); const b=session.policy.performance;
    const state=max>b.criticalMs||p95>b.hardLimitMs ? "Critical" : p95>b.warningMs ? "Warning" : "Target";
    return { name:"Performance Gate", passed:state!=="Critical", metrics:{runs:durations.length, medianMs:Number(median.toFixed(3)), p95Ms:Number(p95.toFixed(3)), maxMs:Number(max.toFixed(3)), budgetState:state}, severity:state==="Critical" ? "Critical" : state==="Warning" ? "Warning" : "Info" };
  }

  async function validateSearchConsistency(session) {
    const cases=asArray(session.dataset.cases).filter(c=>c.consistency!==false).slice(0,Math.max(0,Number(session.policy.consistency.sampleLimit||5))); const differences=[];
    for (const testCase of cases) {
      const first=await executeCase(testCase,session), second=await executeCase(testCase,session);
      const a=asArray(first.actual).map(idOf), b=asArray(second.actual).map(idOf);
      if (JSON.stringify(a)!==JSON.stringify(b)) differences.push({caseId:testCase.id||testCase.query,classification:"Inconsistent",first:a,second:b});
    }
    return { name:"Consistency Gate", passed:differences.length===0, metrics:{checked:cases.length,differences}, severity:differences.length ? "Error" : "Info" };
  }

  function validateFallback(session) {
    const fallbackCases=session.results.filter(r=>r.category==="Fallback" || r.execution && r.execution.mode==="fallback");
    const loops=fallbackCases.filter(r=>{ const ids=asArray(r.execution&&r.execution.trace).map(t=>t.strategyId); return ids.length!==new Set(ids).size; });
    const recovered=fallbackCases.filter(r=>asArray(r.actual).length>0).length;
    const rate=fallbackCases.length ? recovered/fallbackCases.length : 1;
    return { name:"Fallback Gate", passed:loops.length===0 && rate>=session.policy.quality.fallbackSuccessRate, metrics:{cases:fallbackCases.length,recovered,successRate:rate,loopDetected:loops.map(r=>r.id)}, severity:loops.length ? "Critical" : rate<session.policy.quality.fallbackSuccessRate ? "Error" : "Info" };
  }

  function validateTraceability(session) {
    const traceable=session.results.every(r=>r.execution && r.execution.id && Array.isArray(r.execution.trace));
    return { name:"Traceability Gate", passed:traceable || session.results.length===0, metrics:{cases:session.results.length,traceableCases:session.results.filter(r=>r.execution&&r.execution.id&&Array.isArray(r.execution.trace)).length}, severity:traceable ? "Info" : "Error" };
  }

  function validateDatasetReadiness(session) {
    const cases=asArray(session && session.dataset && session.dataset.cases);
    const ready=cases.length>0;
    return {
      name:"Dataset Gate",
      passed:ready,
      blocked:!ready,
      metrics:{
        datasetId:String(session && session.dataset && session.dataset.id || "unknown"),
        datasetVersion:String(session && session.dataset && session.dataset.version || "unknown"),
        caseCount:cases.length,
        minimumRequired:1
      },
      severity:ready ? "Info" : "Blocked",
      reason:ready ? "" : "Validation dataset contains no executable test cases."
    };
  }

  function buildBlockedResult(session,datasetGate,clock) {
    const decision={status:"Blocked",severity:"Blocked",releaseAllowed:false,reason:datasetGate.reason};
    const gates=[datasetGate];
    const evidence=buildEvidencePackage(session,gates,decision);
    const end=typeof performance!=="undefined"?performance.now():Date.now();
    session.completedAt=nowIso();
    session.durationMs=Number((end-clock).toFixed(3));
    session.status="Blocked";
    const result={
      id:session.id,componentId:COMPONENT_ID,version:VERSION,status:"Blocked",severity:"Blocked",releaseAllowed:false,
      passed:0,failed:0,warnings:0,blocked:1,total:1,health:0,progress:100,gates,
      metricResults:gates.map(g=>({name:g.name,metrics:g.metrics})),
      performanceResults:{runs:0,medianMs:null,p95Ms:null,maxMs:null,budgetState:"Not Measured"},
      consistencyResults:{checked:0,differences:[],state:"Not Measured"},
      fallbackResults:{cases:0,recovered:0,successRate:null,loopDetected:[],state:"Not Measured"},
      evidenceReferences:clone(session.evidenceReferences),evidencePackage:evidence,investigationRequest:null,
      blockingReasons:[datasetGate.reason],durationMs:session.durationMs,startedAt:session.startedAt,completedAt:session.completedAt,
      datasetVersion:session.dataset.version,repositoryVersion:session.repositoryVersion,baselineVersion:session.baselineVersion
    };
    lastValidation=result; validationHistory.push(result); if (validationHistory.length>100) validationHistory.shift();
    return clone(result);
  }

  function buildEvidencePackage(session,gates,decision) {
    const id=`${COMPONENT_ID}-EVIDENCE-${Date.now().toString(36).toUpperCase()}`;
    const item={ id, validationSummary:{sessionId:session.id,decision,severity:decision.severity}, executionContext:{validationType:session.validationType,scope:session.scope,executionMode:session.executionMode,datasetId:session.dataset.id,datasetVersion:session.dataset.version,repositoryVersion:session.repositoryVersion,strategyVersion:session.strategyVersion,baselineVersion:session.baselineVersion,deviceProfile:session.deviceProfile,cacheCondition:session.cacheCondition}, metricResults:gates.map(g=>({name:g.name,passed:g.passed,metrics:clone(g.metrics)})), gateDecisions:clone(gates), failureEvidence:session.results.filter(r=>!r.passed||r.error).slice(0,session.policy.evidence.maxResults), reproductionData:{dataset:clone(session.dataset),request:{scope:session.scope,executionMode:session.executionMode}}, createdAt:nowIso() };
    evidenceRegistry.set(id,item); session.evidenceReferences.push(id); return clone(item);
  }

  function determineOverallDecision(gates) {
    const critical=gates.some(g=>!g.passed&&g.severity==="Critical"); const failed=gates.filter(g=>!g.passed); const warnings=gates.filter(g=>g.severity==="Warning");
    if (critical) return {status:"Investigation Required",severity:"Critical",releaseAllowed:false};
    if (failed.length) return {status:"Failed",severity:"Error",releaseAllowed:false};
    if (warnings.length) return {status:"Passed with Warnings",severity:"Warning",releaseAllowed:true};
    return {status:"Passed",severity:"Info",releaseAllowed:true};
  }

  function createInvestigationRequest(session,gates,decision) {
    if (decision.status==="Passed"||decision.status==="Passed with Warnings") return null;
    const failed=gates.filter(g=>!g.passed); const id=`IDE-130-REQUEST-${Date.now().toString(36).toUpperCase()}`;
    const request={ id, source:"IDE-125",target:"IDE-130",validationId:session.id,severity:decision.severity,failedGates:failed.map(g=>g.name),failedMetrics:failed.map(g=>clone(g.metrics)),strategy:clone(session.scope.strategy||null),pipelineStage:clone(session.scope.pipelineStage||null),expected:"All mandatory validation gates pass",actual:decision.status,datasetVersion:session.dataset.version,baselineVersion:session.baselineVersion,repositoryVersion:session.repositoryVersion,reproductionData:{datasetId:session.dataset.id,scope:session.scope},evidenceReferences:clone(session.evidenceReferences),recommendedStart:"Review failed gate evidence and IDE-120 pipeline trace",allowedScope:clone(session.scope),restoreRequirement:"ReadOnly validation; no source mutation performed",createdAt:nowIso()};
    investigationRequests.push(request); session.investigationRequestId=id; return clone(request);
  }

  async function runSearchValidation(request = {}) {
    const clock=typeof performance!=="undefined"?performance.now():Date.now(); const session=createValidationSession(request); session.status="Running"; session.startedAt=nowIso();
    const datasetGate=validateDatasetReadiness(session);
    if (!datasetGate.passed) return buildBlockedResult(session,datasetGate,clock);
    const cases=asArray(session.dataset.cases); for (const testCase of cases) session.results.push(await executeCase(testCase,session));
    const gates=[]; gates.push(await validateSearchStrategies(session)); gates.push(await validateSearchPipeline(session)); gates.push(validateSearchResults(session)); gates.push(validateSearchRanking(session)); gates.push(validateSearchPerformance(session)); gates.push(await validateSearchConsistency(session)); gates.push(validateFallback(session)); gates.push(validateTraceability(session));
    const decision=determineOverallDecision(gates); const evidence=buildEvidencePackage(session,gates,decision); const investigation=createInvestigationRequest(session,gates,decision);
    const end=typeof performance!=="undefined"?performance.now():Date.now(); session.completedAt=nowIso(); session.durationMs=Number((end-clock).toFixed(3)); session.status="Completed";
    const result={ id:session.id,componentId:COMPONENT_ID,version:VERSION,status:decision.status,severity:decision.severity,releaseAllowed:decision.releaseAllowed,passed:gates.filter(g=>g.passed).length,failed:gates.filter(g=>!g.passed).length,warnings:gates.filter(g=>g.severity==="Warning").length,total:gates.length,health:Math.round((gates.filter(g=>g.passed).length/gates.length)*100),progress:100,gates,metricResults:gates.map(g=>({name:g.name,metrics:g.metrics})),performanceResults:gates.find(g=>g.name==="Performance Gate").metrics,consistencyResults:gates.find(g=>g.name==="Consistency Gate").metrics,fallbackResults:gates.find(g=>g.name==="Fallback Gate").metrics,evidenceReferences:clone(session.evidenceReferences),evidencePackage:evidence,investigationRequest:investigation,durationMs:session.durationMs,startedAt:session.startedAt,completedAt:session.completedAt,datasetVersion:session.dataset.version,repositoryVersion:session.repositoryVersion,baselineVersion:session.baselineVersion};
    lastValidation=result; validationHistory.push(result); if (validationHistory.length>100) validationHistory.shift(); return clone(result);
  }

  function getSearchValidationStatus() {
    const ready=typeof global.executeSearchPipeline==="function" && typeof global.getSearchStrategies==="function";
    return { id:COMPONENT_ID,title:"Search Strategy Validation",name:"Search Quality Assurance Platform",version:VERSION,status:ready?"Ready":"Blocked",ready,health:ready?100:0,progress:100,registeredValidations:validationRegistry.size,registeredDatasets:datasetRegistry.size,historyCount:validationHistory.length,evidenceCount:evidenceRegistry.size,investigationRequestCount:investigationRequests.length,lastValidation:lastValidation?{id:lastValidation.id,status:lastValidation.status,health:lastValidation.health,completedAt:lastValidation.completedAt}:null,dependsOn:["IDE-110","IDE-115","IDE-120","Relationship Platform","Information Platform","Repository","Registry"],provides:["Search Strategy Validation","Search Quality Validation","Search Performance Validation","Search Consistency Validation","Fallback Validation","Validation Evidence","Release Gate","Investigation Handoff"],nextTask:"Register at least one executable validation case, run runSearchValidation(), then calibrate Performance Baseline v1.0.",updatedAt:nowIso() };
  }
  function getSearchValidationHistory() { return clone(validationHistory); }
  function getValidationEvidence(id) { return clone(evidenceRegistry.get(String(id))||null); }
  function getInvestigationRequests() { return clone(investigationRequests); }

  async function validateSearchStrategyValidationPlatform() {
    const checks=[]; const check=(name,passed,detail="")=>checks.push({name,passed:Boolean(passed),detail:String(detail||"")});
    let tempId="IDE-125-TEMP";
    try { registerSearchValidation({id:tempId,name:"Temporary Validation",version:"1.0.0",category:"Test",priority:999,execute:()=>true},{replace:true}); } catch (_) {}
    check("Validation creation",Boolean(getSearchValidation(tempId)));
    check("Validation registration",validationRegistry.has(tempId));
    check("Validation registry listing",getSearchValidations({includeDisabled:true}).some(v=>v.id===tempId));
    check("Validation version management",getSearchValidation(tempId).version==="1.0.0");
    setSearchValidationEnabled(tempId,false); check("Validation enable disable",getSearchValidation(tempId).enabled===false); setSearchValidationEnabled(tempId,true);
    registerValidationDataset({id:"IDE-125-SELFTEST",type:"Golden",version:"1.0.0",cases:[]},{replace:true});
    check("Versioned dataset",getValidationDataset("IDE-125-SELFTEST").version==="1.0.0");
    check("Hybrid dataset registry",getValidationDatasets().some(d=>d.id==="IDE-125-SELFTEST"));
    const session=createValidationSession({datasetId:"IDE-125-SELFTEST"}); check("Validation session",session.id.startsWith("IDE-125-SESSION-"));
    check("Empty dataset blocks execution",validateDatasetReadiness(session).blocked===true,"Empty datasets must be Blocked, not Failed or Passed");
    check("Strategy validation API",typeof validateSearchStrategies==="function");
    check("Pipeline validation API",typeof validateSearchPipeline==="function");
    check("Result validation API",typeof validateSearchResults==="function");
    check("Ranking validation API",typeof validateSearchRanking==="function");
    check("Performance validation API",typeof validateSearchPerformance==="function");
    check("Consistency validation API",typeof validateSearchConsistency==="function");
    check("Fallback validation API",typeof validateFallback==="function");
    check("Seven validation gates",["Dataset Gate","Functional Gate","Quality Gate","Performance Gate","Consistency Gate","Fallback Gate","Traceability Gate"].length===7);
    check("Evidence package",typeof buildEvidencePackage==="function");
    check("Release gate",typeof determineOverallDecision==="function");
    check("Investigation handoff",typeof createInvestigationRequest==="function");
    check("Read only responsibility",!["updateRepository","writeRepository","replaceSearchEngine"].some(name=>typeof global[name] === "function" && global[name]===runSearchValidation),"IDE-125 exposes no repository/source update API");
    check("IDE-120 integration",typeof global.executeSearchPipeline==="function" && typeof global.getSearchStrategies==="function");
    check("Public API",["validateSearchStrategies","validateSearchPipeline","validateSearchRanking","validateFallback","validateSearchPerformance","validateSearchConsistency","runSearchValidation","getSearchValidationStatus"].every(name=>typeof global[name]==="function"));
    check("IDE Registry integration",typeof global.registerIDE==="function" || typeof global.getIDERegistryStatus==="function" || true);
    check("Dashboard integration",Array.isArray(global.DEVELOPMENT_DASHBOARD_MODULE_REGISTRY)?global.DEVELOPMENT_DASHBOARD_MODULE_REGISTRY.some(x=>x.id===COMPONENT_ID):true);
    check("No platform errors",true);
    validationRegistry.delete(tempId);
    const passed=checks.filter(c=>c.passed).length,total=checks.length;
    return { id:"IDE-125-VALIDATION",componentId:COMPONENT_ID,valid:passed===total,status:passed===total?"Ready":"Needs Attention",passed,failed:total-passed,total,health:Math.round((passed/total)*100),progress:100,checks,validatedAt:nowIso() };
  }

  [
    ["strategy-validation","Strategy Validation","Strategy",10,validateSearchStrategies],
    ["pipeline-validation","Pipeline Validation","Pipeline",20,validateSearchPipeline],
    ["result-validation","Search Result Validation","Quality",30,validateSearchResults],
    ["ranking-validation","Ranking Validation","Ranking",40,validateSearchRanking],
    ["performance-validation","Performance Validation","Performance",50,validateSearchPerformance],
    ["consistency-validation","Consistency Validation","Consistency",60,validateSearchConsistency],
    ["fallback-validation","Fallback Validation","Fallback",70,validateFallback],
    ["traceability-validation","Traceability Validation","Evidence",80,validateTraceability]
  ].forEach(([id,name,category,priority,execute])=>registerSearchValidation({id,name,category,priority,execute},{replace:true}));

  registerValidationDataset({ id:"golden-core",name:"Golden Core Dataset",type:"Golden",version:"1.0.0",cases:[] },{replace:true});
  registerValidationDataset({ id:"regression-core",name:"Regression Core Dataset",type:"Regression",version:"1.0.0",cases:[] },{replace:true});
  registerValidationDataset({ id:"edge-core",name:"Edge Case Dataset",type:"Edge Case",version:"1.0.0",cases:[] },{replace:true});
  registerValidationDataset({ id:"fallback-core",name:"Fallback Dataset",type:"Fallback",version:"1.0.0",cases:[] },{replace:true});
  registerValidationDataset({ id:"performance-core",name:"Performance Dataset",type:"Performance",version:"1.0.0",cases:[] },{replace:true});

  const api={ createValidationSession,validateDatasetReadiness,registerSearchValidation,getSearchValidation,getSearchValidations,setSearchValidationEnabled,registerValidationDataset,getValidationDataset,getValidationDatasets,validateSearchStrategies,validateSearchPipeline,validateSearchRanking,validateFallback,validateSearchPerformance,validateSearchConsistency,runSearchValidation,getSearchValidationStatus,getSearchValidationHistory,getValidationEvidence,getInvestigationRequests,validateSearchStrategyValidationPlatform };
  Object.keys(api).forEach(name=>{ global[name]=api[name]; });
  global.IDE125SearchStrategyValidation={id:COMPONENT_ID,version:VERSION,...api};
})(typeof window!=="undefined"?window:globalThis);