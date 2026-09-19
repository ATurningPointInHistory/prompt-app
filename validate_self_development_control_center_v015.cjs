"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),cp=require("node:child_process");
const root=__dirname,checks=[];
const check=(name,passed,detail,severity="Critical")=>checks.push({name,passed:Boolean(passed),detail,severity});
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const norm=s=>String(s||"").split("#")[0].split("?")[0].replace(/^\.\//,"");
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==="object"){const o={};Object.keys(v).sort().forEach(k=>o[k]=stable(v[k]));return o;}return v;}
const manifest=JSON.parse(fs.readFileSync(path.join(root,"00_script_manifest.json"),"utf8"));
const projectInfo=JSON.parse(fs.readFileSync(path.join(root,"project_info.json"),"utf8"));
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const ui="18_self_development_control_center.js";
let hashPass=0,cachePass=0,missing=[];
for(const src of manifest.scripts){
  const f=norm(src),p=path.join(root,f),h=manifest.hashes&&manifest.hashes[f];
  if(!fs.existsSync(p)||!h){missing.push(f);continue;}
  const b=fs.readFileSync(p),actual=sha(b);
  if(actual===h.sha256&&b.length===h.byteSize)hashPass++;
  const m=String(src).match(/[?&]h=([a-f0-9]+)/i);if(m&&m[1]===h.cacheKey&&h.cacheKey===h.sha256.slice(0,12))cachePass++;
}
check("All 493 runtime script hashes and byte sizes match",manifest.scripts.length===493&&hashPass===493&&missing.length===0,{verified:hashPass,total:manifest.scripts.length,missing});
check("All 493 runtime cache keys match",cachePass===493,{verified:cachePass,total:manifest.scripts.length});
try{cp.execFileSync(process.execPath,["--check",path.join(root,ui)],{stdio:"pipe"});check("Control Center runtime script parses",true,{file:ui});}catch(error){check("Control Center runtime script parses",false,{file:ui,error:error.message});}
const setPayload=manifest.scripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
const computedSetHash=sha(Buffer.from(setPayload));
check("Current Script Set Hash verifies",computedSetHash===manifest.scriptSetHash,{computed:computedSetHash,stored:manifest.scriptSetHash});
const copy=JSON.parse(JSON.stringify(manifest));delete copy.manifestHash;delete copy.updatedAt;const computedManifestHash=sha(Buffer.from(JSON.stringify(stable(copy))));
check("Current Manifest Hash verifies",computedManifestHash===manifest.manifestHash,{computed:computedManifestHash,stored:manifest.manifestHash});
const meta=(index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/)||[])[1]||"";
check("index manifest marker matches",meta===manifest.manifestHash,{index:meta,manifest:manifest.manifestHash});
const indexScripts=[];const re=/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;let mm;while((mm=re.exec(index)))if(/^\.\//.test(mm[1])&&/\.js(?:\?|$)/i.test(mm[1]))indexScripts.push(mm[1]);
check("index runtime script sequence matches manifest",JSON.stringify(indexScripts)===JSON.stringify(manifest.scripts),{indexCount:indexScripts.length,manifestCount:manifest.scripts.length});
check("project_info identity matches v0.1.5 bounded-evidence hotfix candidate",Number(projectInfo.scriptManifestCount)===493&&projectInfo.scriptManifestHash===manifest.manifestHash&&projectInfo.scriptSetHash===manifest.scriptSetHash&&projectInfo.selfDevelopmentControlCenterVersion==="0.1.5"&&projectInfo.selfDevelopmentControlCenterRelevantContextEnrichmentImplemented===true&&projectInfo.selfDevelopmentControlCenterSelectedFileFunctionEnumerationImplemented===true&&projectInfo.selfDevelopmentControlCenterSelectedFileSourceFallbackImplemented===true&&projectInfo.selfDevelopmentControlCenterProjectSearchFallbackImplemented===true&&projectInfo.selfDevelopmentControlCenterArchitectureRelationshipEnrichmentImplemented===true&&projectInfo.selfDevelopmentControlCenterBoundedFunctionArchitectureEvidenceImplemented===true,{count:projectInfo.scriptManifestCount,status:projectInfo.selfDevelopmentControlCenterStatus,version:projectInfo.selfDevelopmentControlCenterVersion});
const parentScripts=manifest.scripts.filter(src=>norm(src)!==ui);const parentPayload=parentScripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");const parentSetHash=sha(Buffer.from(parentPayload));
check("Frozen EXTERNAL-020 Decision001 / Phase4 parent 492 runtime scripts remain byte/order identical",parentScripts.length===492&&parentSetHash==="891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",{parentCount:parentScripts.length,parentScriptSetHash:parentSetHash});
const uiPos=manifest.scripts.findIndex(src=>norm(src)===ui),p6Pos=manifest.scripts.findIndex(src=>norm(src)==="18_self_development_phase6_validation.js"),p19Pos=manifest.scripts.findIndex(src=>norm(src)==="19_trust_evidence_version_manifest.js");
check("Workspace loads additively after Decision058 Phase6 and before EXTERNAL020",uiPos===p6Pos+1&&uiPos<p19Pos,{p6Pos,uiPos,p19Pos});
const uiSource=fs.readFileSync(path.join(root,ui),"utf8");
check("Formal Decision058 freeze identity remains explicit",uiSource.includes('status: "FINAL_ACCEPTED / FINAL_FROZEN"')&&uiSource.includes('requirementsImplemented: 18'),null);
check("Relevant Scope Resolver remains implemented",uiSource.includes('function resolveRelevantScope(')&&uiSource.includes('resolverVersion: "0.1.5"'),null);
check("Relevant Context Enrichment and source-fallback API are implemented and exported",uiSource.includes('function enrichRelevantContext(')&&uiSource.includes('enrichSelfDevelopment058RelevantContext')&&uiSource.includes('enrichSelfDevelopment058RelevantContextWithSourceFallback'),null);
check("Selected-file Function enumeration reuses Project Search with read-only source fallback",uiSource.includes('global.searchProject("", { file: file, type: "function", limit: 80 })')&&uiSource.includes('async function enrichRelevantFunctionsWithSourceFallback(')&&uiSource.includes('extractFunctionBlocksFromText')&&uiSource.includes('READ_ONLY_FETCH'),null);
check("Architecture enrichment reuses existing Architecture Repository APIs",uiSource.includes('global.searchArchitectureObjects(')&&uiSource.includes('findArchitectureChildren')&&uiSource.includes('findArchitectureParents'),null);
check("Relevant and generic repository findings are separated",uiSource.includes('relevantFindings: relevantFindings')&&uiSource.includes('genericRepositoryFindings: genericRepositoryFindings')&&uiSource.includes('findings: contextEnrichment.relevantFindings || []'),null);
check("Bounded evidence includes Function and Architecture context",uiSource.includes('SDCC-WORKSPACE-FUNCTIONS')&&uiSource.includes('SDCC-WORKSPACE-ARCHITECTURE')&&uiSource.includes('codeExcerpt'),null);
check("Bounded evidence truncation never exceeds the configured excerpt limit",uiSource.includes("function boundedEvidenceText(")&&uiSource.includes("text.slice(0, limit - 1) + \"…\"")&&uiSource.includes("boundedEvidenceText(functionExcerpt, 2400)")&&uiSource.includes("boundedEvidenceText(architectureExcerpt, 2400)"),null);
check("Generic repository findings are excluded from AI repository evidence details",uiSource.includes('genericFindingCount: genericFindings.length')&&!uiSource.includes('genericFindings: genericFindings.slice'),null);
check("External AI remains explicit Project Owner interaction only",uiSource.includes('workspace.readiness.readiness !== "PHASE6_EXTERNAL_AI_READY"')&&uiSource.includes('global.confirm(')&&uiSource.includes('projectOwnerConfirmed: true')&&uiSource.includes('externalTransmissionApproved: true'),null);
check("No automatic approval/adoption/canonical reflection action is added",!uiSource.includes("automaticCandidateApproval: true")&&!uiSource.includes("automaticAdoption: true")&&!uiSource.includes("canonicalMutationAutomatic: true")&&!uiSource.includes("promoteSelfDevelopment"),null);
let decision058=null;try{decision058=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,"validate_self_development_058_phase6.cjs")],{encoding:"utf8",env:{...process.env,TERM:"dumb"}}));}catch(error){try{decision058=JSON.parse(String(error.stdout||""));}catch(_){decision058={failed:1,error:error.message};}}
check("Decision058 Phase6 regression remains 28/28 PASS",decision058&&decision058.passed===28&&decision058.failed===0&&decision058.total===28&&decision058.health===100&&decision058.criticalFailed===0&&decision058.decision058Technical18Of18===true,decision058&&{passed:decision058.passed,failed:decision058.failed,total:decision058.total,health:decision058.health,criticalFailed:decision058.criticalFailed,decision058Technical18Of18:decision058.decision058Technical18Of18});

let executeCalls=0,searchCalls=0,architectureCalls=0,relationshipCalls=0;
const baseline={passed:true,identityState:"IDENTITY_CONFIRMED",baselineIdentityId:"TEST-BASELINE",scriptCount:493,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash};
const fileFunctions={
 "18_self_development_control_center.js":[
  {id:"function:openSelfDevelopment058ControlCenter",type:"function",name:"openSelfDevelopment058ControlCenter",file:"18_self_development_control_center.js",line:1100,summary:"Open Self-Development Workspace",role:"UI entry",called:["render"],calledBy:[],code:"function openSelfDevelopment058ControlCenter(){ return openControlCenter(); }",score:0},
  {id:"function:renderWorkspace",type:"function",name:"renderWorkspace",file:"18_self_development_control_center.js",line:700,summary:"Render improvement workspace",role:"UI rendering",called:[],calledBy:["render"],code:"function renderWorkspace(){ /* workspace rendering */ }",score:0},
  {id:"function:analyzeSelfDevelopment058WorkspaceIntent",type:"function",name:"analyzeSelfDevelopment058WorkspaceIntent",file:"18_self_development_control_center.js",line:790,summary:"Analyze Project Owner improvement intent",role:"Intent analysis",called:[],calledBy:[],code:"async function analyzeWorkspaceIntent(input){ /* bounded local analysis */ }",score:0}
 ],
 "18_self_development_dashboard.js":[{id:"function:getSelfDevelopmentDashboardStatus",type:"function",name:"getSelfDevelopmentDashboardStatus",file:"18_self_development_dashboard.js",line:1,summary:"Self Development dashboard status",role:"Dashboard",called:[],calledBy:[],code:"function getSelfDevelopmentDashboardStatus(){ return {}; }",score:0}]
};
global.searchProject=(query,options={})=>{
 searchCalls++;
 if(!String(query||"").trim()&&options.file)return (fileFunctions[options.file]||[]).slice(0,Number(options.limit||80));
 const q=String(query||"").toLowerCase();
 if(q.includes("control")||q.includes("workspace")||q.includes("render"))return fileFunctions["18_self_development_control_center.js"];
 if(q.includes("dashboard"))return fileFunctions["18_self_development_dashboard.js"];
 return[];
};
global.searchArchitectureObjects=(query)=>{architectureCalls++;const q=String(query||"").toLowerCase();return (q.includes("self")||q.includes("workspace")||q.includes("control_center"))?[{id:"ARCH-SDCC",name:"Self Development Workspace",type:"UI",layer:"Presentation",category:"Self Development",file:"18_self_development_control_center.js"}]:[];};
global.findArchitectureChildren=(id)=>{relationshipCalls++;return id==="ARCH-SDCC"?[{source:"ARCH-SDCC",type:"uses",target:"ARCH-SD058"}]:[];};
global.findArchitectureParents=(id)=>{relationshipCalls++;return[];};
global.findArchitectureCalls=(id)=>{relationshipCalls++;return id==="ARCH-SDCC"?[{source:"ARCH-SDCC",type:"calls",target:"ARCH-PROJECT-SEARCH"}]:[];};
global.findArchitectureCalledBy=(id)=>{relationshipCalls++;return[];};
global.extractFunctionBlocksFromText=(source)=>[
 {name:"openSelfDevelopment058ControlCenter",type:"function",start:0,end:90,block:"function openSelfDevelopment058ControlCenter(){ return openControlCenter(); }"},
 {name:"renderWorkspace",type:"function",start:100,end:180,block:"function renderWorkspace(){ return true; }"},
 {name:"analyzeWorkspaceIntent",type:"function",start:200,end:310,block:"async function analyzeWorkspaceIntent(input){ return input; }"}
];
global.extractCalledFunctions=()=>[];
global.fetch=async(url)=>({ok:true,async text(){return uiSource;}});
global.SELFDEVELOPMENT058Environment={
 __internal:{},api:{},
 getStatus(){return{status:"Ready"};},getSafetyStatus(){return{};},getLatestSelfDevelopmentBaselineIdentity(){return baseline;},
 getSelfDevelopmentDashboardStatus(){return{version:"0.1.0",status:"Ready",implemented:9,total:9};},getSelfDevelopmentPhase2DashboardStatus(){return{version:"0.2.1",status:"Candidate",phase2Implemented:8,phase2Total:8};},
 getSelfDevelopmentPhase3DashboardStatus(){return{version:"0.3.0",status:"Ready",coverage:{implemented:14,total:18}};},getSelfDevelopmentPhase4DashboardStatus(){return{version:"0.4.0",status:"Ready",coverage:{implemented:14,total:18}};},
 getSelfDevelopmentPhase5Dashboard(){return{status:"Ready",lineage:{ready:false},repositoryDirectorySelected:false,readiness:{readyForLiveTrialPreparation:true},coverage:{phase5CompletionStatus:"LIVE_EVIDENCE_PENDING",fullyImplementedDecisionRequirements:14,totalDecisionRequirements:18,liveEvidence:{liveEvidenceComplete:false}}};},
 getSelfDevelopmentPhase6Dashboard(){return{status:"Candidate",readiness:{readiness:"PHASE6_EXTERNAL_AI_NOT_READY"},coverage:{fullyImplementedDecisionRequirements:15,totalDecisionRequirements:18}};},
 listSelfDevelopmentCandidates(){return[];},listSelfDevelopmentProposals(){return[];},
 async inspectSelfDevelopmentRepository(){return{ok:true,data:{inspection:{inspectionId:"TEST-INSPECTION",inventoryCount:603,inspectedFileCount:60,categoryCounts:{js:493},summary:{largeFileCount:1},findings:[{type:"LARGE_SOURCE_FILE",severity:"MEDIUM",summary:"OpenAI provider file exceeds threshold",files:["17_external_intelligence_openai_provider_integration.js"]}],inspectedFiles:[{path:"18_self_development_control_center.js"},{path:"18_self_development_dashboard.js"},{path:"18_self_development_phase5_dashboard.js"},{path:"18_self_development_phase2_repository_inspection.js"},{path:"18_self_development_phase2_candidate_detection.js"},{path:"18_self_development_phase3_approval_policy.js"},{path:"18_self_development_phase4_adoption_policy.js"},{path:"18_self_development_phase6_dashboard.js"},{path:"17_external_intelligence_openai_provider_integration.js"}],sourceDigest:"abc"},evidence:{evidenceId:"TEST-EVIDENCE"}}};},
 inspectSelfDevelopmentPhase6ExternalAiReadiness(){return{readiness:"PHASE6_EXTERNAL_AI_NOT_READY"};},
 async buildSelfDevelopmentPhase6ContextPackage(input){const tooLarge=(input.evidenceItems||[]).some(x=>String(x&&x.excerpt||"").length>2400);const total=(input.evidenceItems||[]).reduce((n,x)=>n+String(x&&x.excerpt||"").length,0);if(tooLarge||total>12000)return{ok:false,code:"SELFDEV058_PHASE6_CONTEXT_BLOCKED",data:{errors:[tooLarge?"EVIDENCE_EXCERPT_TOO_LARGE":"TOTAL_EVIDENCE_LIMIT_EXCEEDED"]}};return{ok:true,data:{contextPackage:{userIntent:input.userIntent,evidenceItems:input.evidenceItems,evidenceItemCount:input.evidenceItems.length,totalEvidenceChars:total,externalTransmissionPerformed:false,providerNetworkCallPerformed:false}}};},
 async prepareSelfDevelopmentPhase6ExternalAiReasoning(){return{ok:false,code:"NOT_READY",data:{providerNetworkCallPerformed:false}};},
 async executeSelfDevelopmentPhase6ExternalAiReasoning(){executeCalls++;return{ok:true,data:{outputText:"test",outputClassification:"AI_PROPOSAL_CANDIDATE_ONLY"}};},
 buildSelfDevelopmentPhase6ReasoningHandoff(){return{ok:true};},
 createSelfDevelopmentCandidate(){return{ok:true,data:{candidate:{candidateId:"C1",affectedFiles:[],affectedFunctions:[],riskLevel:"MEDIUM",impactScope:"ARCHITECTURE_REVIEW",validationRequirements:["SYNTAX"],rollbackStrategy:"REQUIRED"}}};},
 createSelfDevelopmentProposal(){return{ok:true,data:{proposal:{proposalId:"P1"}}};},
 classifySelfDevelopmentChangeScope(){return{classification:"ARCHITECTURE_REVIEW",protectedControlPlaneChange:false};},
 openSelfDevelopmentPhase5TrialUI(){return{ok:true};}
};
delete require.cache[require.resolve(path.join(root,ui))];require(path.join(root,ui));
const runtimeValidation=global.validateSelfDevelopment058ControlCenter();
check("Workspace runtime self-validation passes 23/23",runtimeValidation&&runtimeValidation.passed===23&&runtimeValidation.failed===0&&runtimeValidation.total===23&&runtimeValidation.health===100&&runtimeValidation.criticalFailed===0&&runtimeValidation.formalDecision058FreezeVerified===true,runtimeValidation);
(async()=>{
 const intent="自己改善プログラムをもっと使いやすくして、改善前後の違いが分かるようにしたい";
 const analysis=await global.analyzeSelfDevelopment058WorkspaceIntent({userIntent:intent});
 check("Intent analysis keeps Self-Development Workspace as primary scope",analysis&&analysis.ok===true&&analysis.data&&analysis.data.primaryComponent==="SELF-DEVELOPMENT-058"&&analysis.data.selectedFiles[0]==="18_self_development_control_center.js"&&analysis.data.scopeConfidence==="HIGH",analysis&&analysis.data);
 check("Selected-file Function enrichment is non-empty and starts with Self-Development functions",analysis&&analysis.data&&Array.isArray(analysis.data.relatedFunctions)&&analysis.data.relatedFunctions.length>0&&analysis.data.relatedFunctions.some(x=>x.file==="18_self_development_control_center.js"),analysis&&analysis.data&&analysis.data.relatedFunctions);
 const stateAfterAnalysis=global.SELFDEVELOPMENT058Environment.getSelfDevelopment058WorkspaceState(); const evidenceAfterAnalysis=stateAfterAnalysis&&stateAfterAnalysis.evidenceItems||[];
 check("Bounded Context remains Ready when Function evidence reaches truncation boundary",analysis&&analysis.data&&analysis.data.boundedContextReady===true&&evidenceAfterAnalysis.length===6&&evidenceAfterAnalysis.every(x=>String(x&&x.excerpt||"").length<=2400),{boundedContextReady:analysis&&analysis.data&&analysis.data.boundedContextReady,evidenceLengths:evidenceAfterAnalysis.map(x=>({id:x.evidenceId,len:String(x.excerpt||"").length}))});
 const inspectionForFallback=await global.SELFDEVELOPMENT058Environment.inspectSelfDevelopmentRepository();
 const scopeForFallback=global.resolveSelfDevelopment058RelevantScope(intent,inspectionForFallback);
 const originalSearchProject=global.searchProject;
 global.searchProject=(query,options={})=>{ if(!String(query||"").trim()&&options.file)return[]; return originalSearchProject(query,options); };
 const fallbackEnrichment=await global.enrichSelfDevelopment058RelevantContextWithSourceFallback(intent,inspectionForFallback,scopeForFallback);
 global.searchProject=originalSearchProject;
 check("Read-only source fallback enumerates selected-file functions when Project Search file index is stale",fallbackEnrichment&&Array.isArray(fallbackEnrichment.relatedFunctions)&&fallbackEnrichment.relatedFunctions.some(x=>x.file==="18_self_development_control_center.js"&&x.source==="SELECTED_FILE_SOURCE_FALLBACK"),fallbackEnrichment&&fallbackEnrichment.relatedFunctions);
 check("Architecture context contains actual search result plus formal Decision boundary",analysis&&analysis.data&&Array.isArray(analysis.data.architectureRefs)&&analysis.data.architectureRefs.some(x=>x.id==="ARCH-SDCC")&&analysis.data.architectureRefs.some(x=>x.id==="EXTERNAL-010-DECISION-058"),analysis&&analysis.data&&analysis.data.architectureRefs);
 check("Architecture relationships are expanded locally",analysis&&analysis.data&&Array.isArray(analysis.data.architectureRelationships)&&analysis.data.architectureRelationships.some(x=>x.source==="ARCH-SDCC"),analysis&&analysis.data&&analysis.data.architectureRelationships);
 check("Unrelated OpenAI large-file finding stays Generic and is not duplicated as Relevant",analysis&&analysis.data&&Array.isArray(analysis.data.genericRepositoryFindings)&&analysis.data.genericRepositoryFindings.some(x=>Array.isArray(x.files)&&x.files.includes("17_external_intelligence_openai_provider_integration.js"))&&Array.isArray(analysis.data.relevantFindings)&&analysis.data.relevantFindings.length===0&&Array.isArray(analysis.data.findings)&&analysis.data.findings.length===0,analysis&&{relevant:analysis.data.relevantFindings,generic:analysis.data.genericRepositoryFindings,findings:analysis.data.findings});
 const state=global.SELFDEVELOPMENT058Environment.getSelfDevelopment058WorkspaceState();
 const evidence=state&&state.evidenceItems||[];
 check("Bounded Context carries Function and Architecture evidence",evidence.some(x=>x.evidenceId==="SDCC-WORKSPACE-FUNCTIONS"&&String(x.excerpt||"").includes("openSelfDevelopment058ControlCenter"))&&evidence.some(x=>x.evidenceId==="SDCC-WORKSPACE-ARCHITECTURE"&&String(x.excerpt||"").includes("ARCH-SDCC")),evidence);
 check("Generic unrelated file name is excluded from bounded AI evidence excerpts",!evidence.some(x=>String(x.excerpt||"").includes("17_external_intelligence_openai_provider_integration.js")),evidence.map(x=>({id:x.evidenceId,excerpt:x.excerpt})));
 check("Relevant Context enrichment remains local-only with no provider execution",analysis&&analysis.data&&analysis.data.externalTransmissionPerformed===false&&analysis.data.providerNetworkCallPerformed===false&&analysis.data.canonicalMutationPerformed===false&&executeCalls===0,{executeCalls,searchCalls,architectureCalls,relationshipCalls});
 check("Existing Project Search and Architecture APIs are actually reused",searchCalls>0&&architectureCalls>0&&relationshipCalls>0,{searchCalls,architectureCalls,relationshipCalls});
 const failed=checks.filter(x=>!x.passed),criticalFailed=failed.filter(x=>x.severity==="Critical").length;
 const report={id:"SELF-DEVELOPMENT-058-CONTROL-CENTER-V0.1.5-STATIC-FUNCTIONAL-VALIDATION",decisionId:"EXTERNAL-010-DECISION-058",version:"0.1.5",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,parentFrozenScriptCount:492,parentFrozenScriptSetHash:"891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",relevantContextEnrichmentImplemented:true,selectedFileFunctionEnumerationImplemented:true,selectedFileSourceFallbackImplemented:true,architectureRelationshipEnrichmentImplemented:true,relevantGenericFindingSeparation:true,boundedFunctionArchitectureEvidenceImplemented:true,providerExecutionAutomatic:false,explicitProjectOwnerExternalTransmissionApprovalRequired:true,newAuthorityGranted:false,automaticApprovalEnabled:false,automaticAdoptionEnabled:false,canonicalMutationEnabled:false,releaseAllowed:false,validationIsApproval:false,checks};
 console.log(JSON.stringify(report,null,2));process.exitCode=failed.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
