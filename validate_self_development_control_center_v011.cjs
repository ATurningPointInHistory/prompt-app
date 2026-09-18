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
check("Current Script Set Hash verifies",sha(Buffer.from(setPayload))===manifest.scriptSetHash,{computed:sha(Buffer.from(setPayload)),stored:manifest.scriptSetHash});
const copy=JSON.parse(JSON.stringify(manifest));delete copy.manifestHash;delete copy.updatedAt;const computedManifestHash=sha(Buffer.from(JSON.stringify(stable(copy))));
check("Current Manifest Hash verifies",computedManifestHash===manifest.manifestHash,{computed:computedManifestHash,stored:manifest.manifestHash});
const meta=(index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/)||[])[1]||"";
check("index manifest marker matches",meta===manifest.manifestHash,{index:meta,manifest:manifest.manifestHash});
const indexScripts=[];const re=/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;let m;while((m=re.exec(index)))if(/^\.\//.test(m[1])&&/\.js(?:\?|$)/i.test(m[1]))indexScripts.push(m[1]);
check("index runtime script sequence matches manifest",JSON.stringify(indexScripts)===JSON.stringify(manifest.scripts),{indexCount:indexScripts.length,manifestCount:manifest.scripts.length});
check("project_info identity matches v0.1.1 workspace candidate",Number(projectInfo.scriptManifestCount)===493&&projectInfo.scriptManifestHash===manifest.manifestHash&&projectInfo.scriptSetHash===manifest.scriptSetHash&&projectInfo.selfDevelopmentControlCenterVersion==="0.1.1"&&projectInfo.selfDevelopmentControlCenterFormFirstWorkflowImplemented===true,{count:projectInfo.scriptManifestCount,status:projectInfo.selfDevelopmentControlCenterStatus,version:projectInfo.selfDevelopmentControlCenterVersion});
const parentScripts=manifest.scripts.filter(src=>norm(src)!==ui);const parentPayload=parentScripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");const parentSetHash=sha(Buffer.from(parentPayload));
check("Frozen EXTERNAL-020 Decision001 / Phase4 parent 492 runtime scripts remain byte/order identical",parentScripts.length===492&&parentSetHash==="891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",{parentCount:parentScripts.length,parentScriptSetHash:parentSetHash});
const v010=path.resolve(root,"../../sdcenter_v010/AI_Prompt_OS/18_self_development_control_center.js");
check("v0.1.1 runtime delta is confined to Control Center UI file",fs.existsSync(v010)&&sha(fs.readFileSync(v010))!==manifest.hashes[ui].sha256,{v010Exists:fs.existsSync(v010),v011UiHash:manifest.hashes[ui].sha256});
const uiPos=manifest.scripts.findIndex(src=>norm(src)===ui),p6Pos=manifest.scripts.findIndex(src=>norm(src)==="18_self_development_phase6_validation.js"),p19Pos=manifest.scripts.findIndex(src=>norm(src)==="19_trust_evidence_version_manifest.js");
check("Workspace loads additively after Decision058 Phase6 and before EXTERNAL020",uiPos===p6Pos+1&&uiPos<p19Pos,{p6Pos,uiPos,p19Pos});
const uiSource=fs.readFileSync(path.join(root,ui),"utf8");
check("Formal Decision058 freeze identity is explicit in UI source",uiSource.includes('status: "FINAL_ACCEPTED / FINAL_FROZEN"')&&uiSource.includes('requirementsImplemented: 18')&&uiSource.includes('freezeRecordSha256: "f89eb2f0d317cb2f544587480c6e23ec8a018c8a4abc282f62d35e6925a11daa"'),null);
check("Form-first workspace is implemented",uiSource.includes('何を改善したいですか？')&&uiSource.includes('analyzeSelfDevelopment058WorkspaceIntent')&&uiSource.includes('Bounded Context'),null);
check("External AI is guarded by current readiness and explicit Project Owner confirmation",uiSource.includes('workspace.readiness.readiness !== "PHASE6_EXTERNAL_AI_READY"')&&uiSource.includes('global.confirm(')&&uiSource.includes('projectOwnerConfirmed: true')&&uiSource.includes('externalTransmissionApproved: true'),null);
check("No automatic approval/adoption/canonical reflection action is added",!uiSource.includes("automaticCandidateApproval: true")&&!uiSource.includes("automaticAdoption: true")&&!uiSource.includes("canonicalMutationAutomatic: true")&&!uiSource.includes("promoteSelfDevelopment"),null);
let decision058=null;try{decision058=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,"validate_self_development_058_phase6.cjs")],{encoding:"utf8",env:{...process.env,TERM:"dumb"}}));}catch(error){try{decision058=JSON.parse(String(error.stdout||""));}catch(_){decision058={failed:1,error:error.message};}}
check("Decision058 Phase6 regression remains 28/28 PASS",decision058&&decision058.passed===28&&decision058.failed===0&&decision058.total===28&&decision058.health===100&&decision058.criticalFailed===0&&decision058.decision058Technical18Of18===true,decision058&&{passed:decision058.passed,failed:decision058.failed,total:decision058.total,health:decision058.health,criticalFailed:decision058.criticalFailed,decision058Technical18Of18:decision058.decision058Technical18Of18});

// Headless runtime validation: local analysis must not call external provider execution.
let executeCalls=0;
const baseline={passed:true,identityState:"IDENTITY_CONFIRMED",baselineIdentityId:"TEST-BASELINE",scriptCount:493,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash};
global.SELFDEVELOPMENT058Environment={
 __internal:{},api:{},
 getStatus(){return{status:"Ready"};},getSafetyStatus(){return{};},getLatestSelfDevelopmentBaselineIdentity(){return baseline;},
 getSelfDevelopmentDashboardStatus(){return{version:"0.1.0",status:"Ready",implemented:9,total:9};},getSelfDevelopmentPhase2DashboardStatus(){return{version:"0.2.1",status:"Candidate",phase2Implemented:8,phase2Total:8};},
 getSelfDevelopmentPhase3DashboardStatus(){return{version:"0.3.0",status:"Ready",coverage:{implemented:14,total:18}};},getSelfDevelopmentPhase4DashboardStatus(){return{version:"0.4.0",status:"Ready",coverage:{implemented:14,total:18}};},
 getSelfDevelopmentPhase5Dashboard(){return{status:"Ready",lineage:{ready:false},repositoryDirectorySelected:false,readiness:{readyForLiveTrialPreparation:true},coverage:{phase5CompletionStatus:"LIVE_EVIDENCE_PENDING",fullyImplementedDecisionRequirements:14,totalDecisionRequirements:18,liveEvidence:{liveEvidenceComplete:false}}};},
 getSelfDevelopmentPhase6Dashboard(){return{status:"Candidate",readiness:{readiness:"PHASE6_EXTERNAL_AI_NOT_READY"},coverage:{fullyImplementedDecisionRequirements:15,totalDecisionRequirements:18}};},
 listSelfDevelopmentCandidates(){return[];},listSelfDevelopmentProposals(){return[];},
 async inspectSelfDevelopmentRepository(){return{ok:true,data:{inspection:{inspectionId:"TEST-INSPECTION",inventoryCount:603,inspectedFileCount:60,categoryCounts:{js:493},summary:{largeFileCount:1},findings:[{type:"LARGE_SOURCE_FILE",severity:"MEDIUM",summary:"test",files:["17_external_intelligence_openai_provider_integration.js"]}],inspectedFiles:[{path:"17_external_intelligence_openai_provider_integration.js"}],sourceDigest:"abc"},evidence:{evidenceId:"TEST-EVIDENCE"}}};},
 inspectSelfDevelopmentPhase6ExternalAiReadiness(){return{readiness:"PHASE6_EXTERNAL_AI_NOT_READY"};},
 async buildSelfDevelopmentPhase6ContextPackage(input){return{ok:true,data:{contextPackage:{userIntent:input.userIntent,evidenceItems:input.evidenceItems,externalTransmissionPerformed:false,providerNetworkCallPerformed:false}}};},
 async prepareSelfDevelopmentPhase6ExternalAiReasoning(){return{ok:false,code:"NOT_READY",data:{providerNetworkCallPerformed:false}};},
 async executeSelfDevelopmentPhase6ExternalAiReasoning(){executeCalls++;return{ok:true,data:{outputText:"test",outputClassification:"AI_PROPOSAL_CANDIDATE_ONLY"}};},
 buildSelfDevelopmentPhase6ReasoningHandoff(){return{ok:true};},createSelfDevelopmentCandidate(){return{ok:true,data:{candidate:{candidateId:"C1",affectedFiles:[],affectedFunctions:[],riskLevel:"MEDIUM",impactScope:"ARCHITECTURE_REVIEW",validationRequirements:["SYNTAX"],rollbackStrategy:"REQUIRED"}}};},
 createSelfDevelopmentProposal(){return{ok:true,data:{proposal:{proposalId:"P1"}}};},classifySelfDevelopmentChangeScope(){return{classification:"ARCHITECTURE_REVIEW",protectedControlPlaneChange:false};},openSelfDevelopmentPhase5TrialUI(){return{ok:true};}
};
delete require.cache[require.resolve(path.join(root,ui))];require(path.join(root,ui));
const runtimeValidation=global.validateSelfDevelopment058ControlCenter();
check("Workspace runtime self-validation passes 14/14",runtimeValidation&&runtimeValidation.passed===14&&runtimeValidation.failed===0&&runtimeValidation.total===14&&runtimeValidation.health===100&&runtimeValidation.criticalFailed===0&&runtimeValidation.formalDecision058FreezeVerified===true,runtimeValidation);
(async()=>{
 const analysis=await global.analyzeSelfDevelopment058WorkspaceIntent({userIntent:"OpenAI provider integrationを安全に改善したい"});
 check("Local intent analysis builds bounded context without provider execution",analysis&&analysis.ok===true&&analysis.data&&analysis.data.boundedContextReady===true&&analysis.data.externalTransmissionPerformed===false&&analysis.data.providerNetworkCallPerformed===false&&executeCalls===0,{analysis,executeCalls});
 const snap=global.SELFDEVELOPMENT058Environment.getSelfDevelopment058ControlCenterSnapshot();
 check("Runtime snapshot shows formal 18/18 frozen separately from operational NOT_READY",snap&&snap.decision058.complete===true&&snap.decision058.requirementsImplemented===18&&snap.formalDecisionStatus.status==="FINAL_ACCEPTED / FINAL_FROZEN"&&snap.operationalReadiness.phase6.readiness==="PHASE6_EXTERNAL_AI_NOT_READY",{decision058:snap&&snap.decision058,operational:snap&&snap.operationalReadiness});
 const failed=checks.filter(x=>!x.passed),criticalFailed=failed.filter(x=>x.severity==="Critical").length;
 const report={id:"SELF-DEVELOPMENT-058-CONTROL-CENTER-V0.1.1-STATIC-FUNCTIONAL-VALIDATION",decisionId:"EXTERNAL-010-DECISION-058",version:"0.1.1",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,parentFrozenScriptCount:492,parentFrozenScriptSetHash:"891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",formalDecision058Status:"FINAL_ACCEPTED / FINAL_FROZEN",formalDecision058Requirements:"18/18 COMPLETE",formFirstWorkspaceImplemented:true,boundedContextPreviewImplemented:true,providerExecutionAutomatic:false,explicitProjectOwnerExternalTransmissionApprovalRequired:true,newAuthorityGranted:false,automaticApprovalEnabled:false,automaticAdoptionEnabled:false,canonicalMutationEnabled:false,releaseAllowed:false,validationIsApproval:false,checks};
 console.log(JSON.stringify(report,null,2));process.exitCode=failed.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
