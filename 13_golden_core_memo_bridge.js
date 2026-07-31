(function(global){
  "use strict";
  const COMPONENT_ID="IDE-125-GOLDEN-CORE-BRIDGE";
  const VERSION="1.0.0";
  function asArray(v){ return Array.isArray(v)?v:(v==null?[]:[v]); }
  function field(text,name){
    const re=new RegExp("(?:^|\\n)"+name.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")+":\\s*\\n?([^\\n]+)","i");
    const m=String(text||"").match(re); return m?m[1].trim():"";
  }
  function parseMemo(memo){
    const text=String(memo&&memo.text||"");
    const id=field(text,"CaseId")||String(memo&&memo.id||"").trim();
    const query=field(text,"Query");
    const expected=field(text,"ExpectedIds").split(",").map(v=>v.trim()).filter(Boolean);
    if(!id||!query||!expected.length) return null;
    return {id,query,expected,category:field(text,"Category")||"Golden",consistency:field(text,"Consistency").toLowerCase()!=="false",metadata:{memoId:memo.id||id,memoTitle:memo.name||"",datasetId:field(text,"DatasetId")||memo.series||"golden-core"}};
  }
  function collectGoldenCoreCases(){
    const list=typeof global.getMemoBoxList==="function"?global.getMemoBoxList():[];
    return asArray(list).filter(m=>String(m&&m.knowledgeType||"").toLowerCase()==="goldentestcase" && String(m.series||field(m.text,"DatasetId")||"").toLowerCase()==="golden-core" && String(m.status||"").toLowerCase()!=="deprecated").map(parseMemo).filter(Boolean);
  }
  function syncGoldenCoreFromMemos(options={}){
    if(typeof global.registerValidationDataset!=="function") throw new Error("IDE-125 registerValidationDataset is unavailable.");
    const cases=collectGoldenCoreCases();
    const dataset=global.registerValidationDataset({id:"golden-core",name:"Golden Core Dataset",type:"Golden",version:String(options.version||"1.0.0"),cases,profile:{source:"MemoBox",knowledgeType:"GoldenTestCase",syncedAt:new Date().toISOString()}},{replace:true});
    return {componentId:COMPONENT_ID,version:VERSION,status:cases.length?"Ready":"Blocked",caseCount:cases.length,dataset};
  }
  async function syncAndRunGoldenCore(options={}){
    const sync=syncGoldenCoreFromMemos(options);
    if(!sync.caseCount) return sync;
    const validation=await global.runSearchValidation({datasetId:"golden-core",executionMode:"Manual",repositoryVersion:String(options.repositoryVersion||"memo-current"),baselineVersion:String(options.baselineVersion||"golden-core-v1.0.0")});
    return {sync,validation};
  }
  global.collectGoldenCoreCases=collectGoldenCoreCases;
  global.syncGoldenCoreFromMemos=syncGoldenCoreFromMemos;
  global.syncAndRunGoldenCore=syncAndRunGoldenCore;
  global.IDE125GoldenCoreMemoBridge={id:COMPONENT_ID,version:VERSION,collectGoldenCoreCases,syncGoldenCoreFromMemos,syncAndRunGoldenCore};
})(typeof window!=="undefined"?window:globalThis);