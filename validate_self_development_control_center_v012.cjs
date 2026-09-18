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
for(const src of manifest.scripts){const f=norm(src),p=path.join(root,f),h=manifest.hashes&&manifest.hashes[f];if(!fs.existsSync(p)||!h){missing.push(f);continue;}const b=fs.readFileSync(p),actual=sha(b);if(actual===h.sha256&&b.length===h.byteSize)hashPass++;const m=String(src).match(/[?&]h=([a-f0-9]+)/i);if(m&&m[1]===h.cacheKey&&h.cacheKey===h.sha256.slice(0,12))cachePass++;}
check("All 493 runtime script hashes and byte sizes match",manifest.scripts.length===493&&hashPass===493&&missing.length===0,{verified:hashPass,total:manifest.scripts.length,missing});
check("All 493 runtime cache keys match",cachePass===493,{verified:cachePass,total:manifest.scripts.length});
const setPayload=manifest.scripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
const computedSetHash=sha(Buffer.from(setPayload));
check("Current Script Set Hash verifies",computedSetHash===manifest.scriptSetHash,{computed:computedSetHash,stored:manifest.scriptSetHash});
const copy=JSON.parse(JSON.stringify(manifest));delete copy.manifestHash;delete copy.updatedAt;const computedManifestHash=sha(Buffer.from(JSON.stringify(stable(copy))));
check("Current Manifest Hash verifies",computedManifestHash===manifest.manifestHash,{computed:computedManifestHash,stored:manifest.manifestHash});
const meta=(index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/)||[])[1]||"";
check("index manifest marker matches",meta===manifest.manifestHash,{index:meta,manifest:manifest.manifestHash});
const indexScripts=[];const re=/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;let m;while((m=re.exec(index)))if(/^\.\//.test(m[1])&&/\.js(?:\?|$)/i.test(m[1]))indexScripts.push(m[1]);
check("index runtime script sequence matches manifest",JSON.stringify(indexScripts)===JSON.stringify(manifest.scripts),{indexCount:indexScripts.length,manifestCount:manifest.scripts.length});
check("project_info identity matches v0.1.2 relevant-scope workspace candidate",Number(projectInfo.scriptManifestCount)===493&&projectInfo.scriptManifestHash===manifest.manifestHash&&projectInfo.scriptSetHash===manifest.scriptSetHash&&projectInfo.selfDevelopmentControlCenterVersion==="0.1.2"&&projectInfo.selfDevelopmentControlCenterRelevantScopeResolverImplemented===true&&projectInfo.selfDevelopmentControlCenterProjectSearchReuse===true&&projectInfo.selfDevelopmentControlCenterArchitectureSearchReuse===true,{count:projectInfo.scriptManifestCount,status:projectInfo.selfDevelopmentControlCenterStatus,version:projectInfo.selfDevelopmentControlCenterVersion});
const parentScripts=manifest.scripts.filter(src=>norm(src)!==ui);const parentPayload=parentScripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");const parentSetHash=sha(Buffer.from(parentPayload));
check("Frozen EXTERNAL-020 Decision001 / Phase4 parent 492 runtime scripts remain byte/order identical",parentScripts.length===492&&parentSetHash==="891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",{parentCount:parentScripts.length,parentScriptSetHash:parentSetHash});
const uiHash=manifest.hashes[ui]&&manifest.hashes[ui].sha256;
check("v0.1.2 runtime delta remains confined to Control Center UI file",uiHash!=="746c55e56558d25e8b5bad444f44e32b5ab6661d47a56cb81f1eec91d9c8e423",{v011UiHash:"746c55e56558d25e8b5bad444f44e32b5ab6661d47a56cb81f1eec91d9c8e423",v012UiHash:uiHash});
const uiPos=manifest.scripts.findIndex(src=>norm(src)===ui),p6Pos=manifest.scripts.findIndex(src=>norm(src)==="18_self_development_phase6_validation.js"),p19Pos=manifest.scripts.findIndex(src=>norm(src)==="19_trust_evidence_version_manifest.js");
check("Workspace loads additively after Decision058 Phase6 and before EXTERNAL020",uiPos===p6Pos+1&&uiPos<p19Pos,{p6Pos,uiPos,p19Pos});
const uiSource=fs.readFileSync(path.join(root,ui),"utf8");
check("Formal Decision058 freeze identity remains explicit",uiSource.includes('status: "FINAL_ACCEPTED / FINAL_FROZEN"')&&uiSource.includes('requirementsImplemented: 18'),null);
check("Relevant Scope Resolver is implemented and exported",uiSource.includes('function resolveRelevantScope(')&&uiSource.includes('resolveSelfDevelopment058RelevantScope'),null);
check("Resolver reuses existing Project Search and Architecture Search",uiSource.includes('global.searchProject(')&&uiSource.includes('global.searchArchitectureObjects('),null);
check("Resolver separates generic repository findings from intent scope",uiSource.includes('genericRepositoryFindings')&&uiSource.includes('if (scores.has(file)) addFile(file, 12, \"Repository finding reinforces selected scope\")'),null);
check("Resolver keeps local-only safety boundary",uiSource.includes('externalTransmissionPerformed: false')&&uiSource.includes('providerNetworkCallPerformed: false')&&uiSource.includes('canonicalMutationPerformed: false'),null);
check("External AI remains explicit Project Owner interaction only",uiSource.includes('workspace.readiness.readiness !== "PHASE6_EXTERNAL_AI_READY"')&&uiSource.includes('global.confirm(')&&uiSource.includes('projectOwnerConfirmed: true')&&uiSource.includes('externalTransmissionApproved: true'),null);
check("No automatic approval/adoption/canonical reflection action is added",!uiSource.includes("automaticCandidateApproval: true")&&!uiSource.includes("automaticAdoption: true")&&!uiSource.includes("canonicalMutationAutomatic: true")&&!uiSource.includes("promoteSelfDevelopment"),null);
let decision058=null;try{decision058=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,"validate_self_development_058_phase6.cjs")],{encoding:"utf8",env:{...process.env,TERM:"dumb"}}));}catch(error){try{decision058=JSON.parse(String(error.stdout||""));}catch(_){decision058={failed:1,error:error.message};}}
check("Decision058 Phase6 regression remains 28/28 PASS",decision058&&decision058.passed===28&&decision058.failed===0&&decision058.total===28&&decision058.health===100&&decision058.criticalFailed===0&&decision058.decision058Technical18Of18===true,decision058&&{passed:decision058.passed,failed:decision058.failed,total:decision058.total,health:decision058.health,criticalFailed:decision058.criticalFailed,decision058Technical18Of18:decision058.decision058Technical18Of18});

// Headless runtime validation.
let executeCalls=0,searchCalls=0,architectureCalls=0;
const baseline={passed:true,identityState:"IDENTITY_CONFIRMED",baselineIdentityId:"TEST-BASELINE",scriptCount:493,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash};
global.searchProject=(query)=>{searchCalls++;if(String(query).toLowerCase().includes("control"))return[{id:"function:openSelfDevelopment058ControlCenter",name:"openSelfDevelopment058ControlCenter",file:"18_self_development_control_center.js",line:900,summary:"Self-Development Workspace UI",score:90}];if(String(query).toLowerCase().includes("dashboard"))return[{id:"function:getSelfDevelopmentDashboardStatus",name:"getSelfDevelopmentDashboardStatus",file:"18_self_development_dashboard.js",line:1,summary:"Self Development dashboard",score:70}];return[];};
global.searchArchitectureObjects=(query)=>{architectureCalls++;return String(query).toLowerCase().includes("workspace")?[{id:"ARCH-SDCC",name:"Self Development Workspace",type:"UI",layer:"Presentation",file:"18_self_development_control_center.js"}]:[];};
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
 async buildSelfDevelopmentPhase6ContextPackage(input){return{ok:true,data:{contextPackage:{userIntent:input.userIntent,evidenceItems:input.evidenceItems,externalTransmissionPerformed:false,providerNetworkCallPerformed:false}}};},
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
check("Workspace runtime self-validation passes 18/18",runtimeValidation&&runtimeValidation.passed===18&&runtimeValidation.failed===0&&runtimeValidation.total===18&&runtimeValidation.health===100&&runtimeValidation.criticalFailed===0&&runtimeValidation.formalDecision058FreezeVerified===true,runtimeValidation);
(async()=>{
 const intent="自己改善プログラムをもっと使いやすくして、改善前後の違いが分かるようにしたい";
 const analysis=await global.analyzeSelfDevelopment058WorkspaceIntent({userIntent:intent});
 check("Intent analysis resolves Self-Development Workspace as primary scope",analysis&&analysis.ok===true&&analysis.data&&analysis.data.primaryComponent==="SELF-DEVELOPMENT-058"&&analysis.data.selectedFiles[0]==="18_self_development_control_center.js"&&analysis.data.scopeConfidence==="HIGH",analysis&&analysis.data);
 check("Unrelated generic OpenAI large-file finding is separated from selected intent scope",analysis&&analysis.data&&Array.isArray(analysis.data.genericRepositoryFindings)&&analysis.data.genericRepositoryFindings.some(x=>Array.isArray(x.files)&&x.files.includes("17_external_intelligence_openai_provider_integration.js"))&&!analysis.data.selectedFiles.slice(0,4).includes("17_external_intelligence_openai_provider_integration.js"),analysis&&{selectedFiles:analysis.data.selectedFiles,genericRepositoryFindings:analysis.data.genericRepositoryFindings});
 check("Relevant scope reuses Project Search and Architecture Search",searchCalls>0&&architectureCalls>0,{searchCalls,architectureCalls});
 check("Local intent analysis builds bounded context without provider execution",analysis&&analysis.data&&analysis.data.boundedContextReady===true&&analysis.data.externalTransmissionPerformed===false&&analysis.data.providerNetworkCallPerformed===false&&executeCalls===0,{boundedContextReady:analysis&&analysis.data&&analysis.data.boundedContextReady,executeCalls});
 const scope=global.resolveSelfDevelopment058RelevantScope(intent,{data:{inspection:{inspectedFiles:[{path:"18_self_development_control_center.js"},{path:"17_external_intelligence_openai_provider_integration.js"}],findings:[{type:"LARGE_SOURCE_FILE",files:["17_external_intelligence_openai_provider_integration.js"]}]}}});
 check("Direct resolver remains deterministic enough for current UI intent",scope&&scope.primaryComponent==="SELF-DEVELOPMENT-058"&&scope.selectedFiles[0]==="18_self_development_control_center.js"&&scope.externalTransmissionPerformed===false&&scope.providerNetworkCallPerformed===false,scope);
 const snap=global.SELFDEVELOPMENT058Environment.getSelfDevelopment058ControlCenterSnapshot();
 check("Formal 18/18 Frozen remains separated from operational NOT_READY",snap&&snap.decision058.complete===true&&snap.formalDecisionStatus.status==="FINAL_ACCEPTED / FINAL_FROZEN"&&snap.operationalReadiness.phase6.readiness==="PHASE6_EXTERNAL_AI_NOT_READY",{decision058:snap&&snap.decision058,operational:snap&&snap.operationalReadiness});
 const failed=checks.filter(x=>!x.passed),criticalFailed=failed.filter(x=>x.severity==="Critical").length;
 const report={id:"SELF-DEVELOPMENT-058-CONTROL-CENTER-V0.1.2-STATIC-FUNCTIONAL-VALIDATION",decisionId:"EXTERNAL-010-DECISION-058",version:"0.1.2",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,parentFrozenScriptCount:492,parentFrozenScriptSetHash:"891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",relevantScopeResolverImplemented:true,projectSearchReuse:true,architectureSearchReuse:true,genericFindingSeparation:true,providerExecutionAutomatic:false,explicitProjectOwnerExternalTransmissionApprovalRequired:true,newAuthorityGranted:false,automaticApprovalEnabled:false,automaticAdoptionEnabled:false,canonicalMutationEnabled:false,releaseAllowed:false,validationIsApproval:false,checks};
 console.log(JSON.stringify(report,null,2));process.exitCode=failed.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
