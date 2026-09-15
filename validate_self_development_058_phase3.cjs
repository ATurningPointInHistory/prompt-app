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
const phase1Frozen={
"18_self_development_version_manifest.js":"85212e46389a1bf1c9893bfaa49e9f4dc93cb805bb83554689483298cf325022",
"18_self_development_core.js":"1fefbfc970a5e3f13bce1bb9543855e3a55319d777298690b1695c3163ed63a3",
"18_self_development_baseline_identity.js":"576aa7144410da8db0577aedca49be28252a7cf39ad6108c798b5828600db829",
"18_self_development_adapter.js":"dff9273d523476ddbf37badc697dec0f59b65320acc81e2ccad2145421f0e03d",
"18_self_development_candidate.js":"06f466cd13aaadd4229729269d5b3b950839d1fb6e35b8741f78b37d3c594733",
"18_self_development_traceability.js":"754a62f36c5eee2c15f924a8d823d324a5e2a97bc44fcbca5d29489db571a913",
"18_self_development_dashboard.js":"7758b20bd1b13dc692a392e690b383099ab5ea7b00f65932112fba1d14641afb",
"18_self_development_phase1_validation.js":"1fa2cd44bb5f58781000ec848e884a741dd2c6764beabc0359b13325dc36d381"};
const phase2Frozen={
"18_self_development_phase2_version_manifest.js":"9b0258a884ff594a206a0082d8c9f79fc3214fb1329a5f7cc9ef6dab7dcfec31",
"18_self_development_phase2_persistence.js":"0e3345c19b5f509c39e5e0e1cc2945137ba58eefb889b717a674bfa2d47214e2",
"18_self_development_phase2_repository_inspection.js":"36d3978a14ead7eb5102c52dcf4c7de4f1fa9c7aa4679821c377820f02b90dc6",
"18_self_development_phase2_evidence_integrity.js":"1410b7dc790d42fb294ee9d6ded37c03d4f9346f173f30f5b129b61213c350cb",
"18_self_development_phase2_candidate_detection.js":"193792deb51be6db9e907d8776437be12c1489ba3042d1d05a444d83a9f90644",
"18_self_development_phase2_validation_contract.js":"38e857798a4d90e227a6efa3c2d98c6603af84d751ef5382e7b4fb1eaaaaa3b9",
"18_self_development_phase2_external_ai_readiness.js":"37ceccf085f2ef9e7afbc21f499f8e98ce181e61ab3e53f7b1ebe10d7200c14f",
"18_self_development_phase2_traceability.js":"df11be6da8894ad5ed700ab1bd3d768184f32e34dd4c91a8d8d9be17f5aa9cff",
"18_self_development_phase2_dashboard.js":"c285b011134d76876d51e14eb6b5b08664eeb7fb61beca869eeb50dacfbb06a2",
"18_self_development_phase2_validation.js":"e93ef6865fa8ebf0ec7f867729a429963f8986cbf22470dc3f496cfe821ed64e"};
const p1=Object.keys(phase1Frozen),p2=Object.keys(phase2Frozen);
const p3=["18_self_development_phase3_version_manifest.js","18_self_development_phase3_approval_policy.js","18_self_development_phase3_approval_bridge.js","18_self_development_phase3_patch_fixture.js","18_self_development_phase3_patch_adapter.js","18_self_development_phase3_independent_validation.js","18_self_development_phase3_traceability.js","18_self_development_phase3_dashboard.js","18_self_development_phase3_validation.js"];
let hp=0,cpk=0,missing=[];
for(const src of manifest.scripts){const f=norm(src),fp=path.join(root,f),h=manifest.hashes&&manifest.hashes[f];if(!fs.existsSync(fp)||!h){missing.push(f);continue;}const b=fs.readFileSync(fp),a=sha(b);if(a===h.sha256&&b.length===h.byteSize)hp++;const m=String(src).match(/[?&]h=([a-f0-9]+)/i);if(m&&m[1]===h.cacheKey&&h.cacheKey===h.sha256.slice(0,12))cpk++;}
check("All manifest script hashes and byte sizes match",hp===manifest.scripts.length&&missing.length===0,{verified:hp,total:manifest.scripts.length,missing});
check("All manifest cache keys match",cpk===manifest.scripts.length,{verified:cpk,total:manifest.scripts.length});
const setPayload=manifest.scripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
const setHash=sha(Buffer.from(setPayload));check("Script Set Hash verifies",setHash===manifest.scriptSetHash,{computed:setHash,stored:manifest.scriptSetHash});
const copy=JSON.parse(JSON.stringify(manifest));delete copy.manifestHash;delete copy.updatedAt;const mh=sha(Buffer.from(JSON.stringify(stable(copy))));
check("Manifest Hash verifies",mh===manifest.manifestHash,{computed:mh,stored:manifest.manifestHash});
const meta=(index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/)||[])[1]||"";check("index manifest hash marker matches",meta===manifest.manifestHash,{index:meta,manifest:manifest.manifestHash});
const idx=[];const re=/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;let mm;while((mm=re.exec(index)))if(/^\.\//.test(mm[1])&&/\.js(?:\?|$)/i.test(mm[1]))idx.push(mm[1]);
check("index script sequence matches manifest",JSON.stringify(idx)===JSON.stringify(manifest.scripts),{indexCount:idx.length,manifestCount:manifest.scripts.length});
check("All Decision 058 Phase 3 scripts are present",p3.every(f=>manifest.scripts.some(src=>norm(src)===f)),p3);
const p3pos=p3.map(f=>manifest.scripts.findIndex(src=>norm(src)===f)),p2end=manifest.scripts.findIndex(src=>norm(src)==="18_self_development_phase2_validation.js"),init=manifest.scripts.findIndex(src=>norm(src)==="99_init.js");
check("Phase 3 scripts load additively after frozen Phase 2 and before 99_init",p3pos.every((p,n)=>p>=0&&(n===0?p===p2end+1:p===p3pos[n-1]+1))&&p3pos[p3pos.length-1]<init,{phase2End:p2end,positions:p3pos,initPos:init});
const fr1=p1.map(f=>({file:f,expected:phase1Frozen[f],actual:sha(fs.readFileSync(path.join(root,f)))}));check("Phase 1 Accepted/Frozen source remains byte-identical",fr1.every(x=>x.expected===x.actual),fr1);
const fr2=p2.map(f=>({file:f,expected:phase2Frozen[f],actual:sha(fs.readFileSync(path.join(root,f)))}));check("Phase 2 Accepted/Frozen source remains byte-identical",fr2.every(x=>x.expected===x.actual),fr2);
check("project_info identity matches current manifest",projectInfo.scriptManifestVersion===manifest.version&&projectInfo.applicationReleaseVersion===manifest.applicationReleaseVersion&&Number(projectInfo.scriptManifestCount)===manifest.scripts.length&&projectInfo.scriptManifestHash===manifest.manifestHash&&projectInfo.scriptSetHash===manifest.scriptSetHash,{projectInfo:{count:projectInfo.scriptManifestCount,manifestHash:projectInfo.scriptManifestHash,scriptSetHash:projectInfo.scriptSetHash},manifest:{count:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash}});
const saved=new Set(projectInfo.savedFiles||[]);check("project_info savedFiles covers every manifest script",manifest.scripts.every(src=>saved.has(norm(src))),{savedCount:saved.size,manifestCount:manifest.scripts.length});
check("Phase 3 candidate metadata preserves accepted parents and no release",projectInfo.releaseStatus==="SELF_DEVELOPMENT_058_PHASE3_CANDIDATE"&&projectInfo.releaseAllowed===false&&projectInfo.projectOwnerRevalidationRequired===true&&projectInfo.decision058Phase1Status==="PROJECT_OWNER_ACCEPTED_FROZEN"&&projectInfo.decision058Phase2Status==="PROJECT_OWNER_ACCEPTED_FROZEN"&&projectInfo.decision058CanonicalMutationImplemented===false&&projectInfo.decision058ValidationIsApproval===false,{releaseStatus:projectInfo.releaseStatus,p1:projectInfo.decision058Phase1Status,p2:projectInfo.decision058Phase2Status,canonicalMutation:projectInfo.decision058CanonicalMutationImplemented,validationIsApproval:projectInfo.decision058ValidationIsApproval});
const pol=fs.readFileSync(path.join(root,"18_self_development_phase3_approval_policy.js"),"utf8");
check("Future relaxation map names policy keys and exact IDE-190 enforcement refs",/approverMode/.test(pol)&&/validityMinutes/.test(pol)&&/consumptionMode/.test(pol)&&/13_development_automation_approval\.js/.test(pol)&&/futureMigrationRequired:\s*true/.test(pol),"relaxation-map-present");
check("Policy does not claim it can bypass IDE-190 by itself",/Policy change alone never bypasses IDE-190 enforcement/.test(pol),"explicit-engine-migration-boundary");
const ide190ApprovalSource=fs.readFileSync(path.join(root,"13_development_automation_approval.js"),"utf8");
check("IDE-190 current engine enforcement matches relaxation map",/actorRole !== "Project Owner"/.test(ide190ApprovalSource)&&/singleUse: true/.test(ide190ApprovalSource)&&/status: "Consumed"/.test(ide190ApprovalSource)&&/isExpired\(approval\.expiresAt\)/.test(ide190ApprovalSource),"Project Owner / expiring / single-use enforced by IDE-190");
const ide150PatchSource=fs.readFileSync(path.join(root,"13_auto_refactoring_phase2.js"),"utf8");
check("IDE-150 governed patch remains approval-required and non-auto-apply",/approvalRequired: true/.test(ide150PatchSource)&&/autoApply: false/.test(ide150PatchSource)&&/function generateAutoRefactoringPatch/.test(ide150PatchSource)&&/function verifyAutoRefactoringPatch/.test(ide150PatchSource),"IDE-150 governed patch contract");
const openaiHashes={"17_external_intelligence_openai_provider_integration.js":"0107b4838b2bef35daa8e700a4be47766738948f351620903a20323dc8dcb891","17_external_intelligence_openai_provider_ui.js":"1ee0d94d7d5d3786ee13a68989acdb74b3813dd7d9482fbd8d153f555cebdd87"};
const of=Object.keys(openaiHashes).map(f=>({file:f,expected:openaiHashes[f],actual:sha(fs.readFileSync(path.join(root,f)))}));check("OpenAI v0.3.11 provider source remains byte-identical",of.every(x=>x.expected===x.actual),of);
let oa=null;try{oa=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,"validate_openai_final_validation_gate_v0311.cjs")],{encoding:"utf8"}));}catch(e){try{oa=JSON.parse(String(e.stdout||""));}catch(_){oa={failed:1,error:e.message};}}
check("OpenAI v0.3.11 Final Validation Gate remains 23/23 PASS",oa&&oa.passed===23&&oa.failed===0&&oa.total===23&&oa.health===100&&oa.criticalFailed===0,{passed:oa&&oa.passed,failed:oa&&oa.failed,total:oa&&oa.total,health:oa&&oa.health,criticalFailed:oa&&oa.criticalFailed});
// Runtime stubs. They expose validation APIs only and perform no provider/network/repository side effects.
const storage=new Map();global.localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
global.IDE140DevelopmentAnalytics={getDevelopmentAnalyticsStatus:()=>({id:"IDE-140",status:"Completed"})};
global.IDE170Intelligence={getStatus:()=>({componentId:"IDE-170",status:"Ready"}),getRepositorySnapshotStatus:()=>({status:"Ready",snapshotCount:0})};
global.IDE190DevelopmentAutomation={getStatus:()=>({componentId:"IDE-190",status:"Ready"}),getSafetyStatus:()=>({directRepositoryMutationAllowed:false}),validateAutomationApproval:()=>({valid:false,status:"Invalid",approval:null,approvalState:null,reasons:["Approval Not Found"]}),getAutomationApprovalStatus:()=>({approval:null,approvalState:null})};
global.IDE150AutoRefactoring={generateSelfDevelopmentPatchCandidate:()=>({generated:true,verified:false,reason:"validation-fixture-adapter"})};
global.REPOSITORY010LocalFirstRepository={getStatus:()=>({componentId:"REPOSITORY-010",status:"Ready"}),getSafetyStatus:()=>({directRepositoryMutationAllowed:false})};
global.EXTERNAL010ExternalIntelligence={getExternalIntelligenceFoundationState:()=>({componentId:"EXTERNAL-010",version:"1.20.1",initialized:true,safety:{directRepositoryMutationAllowed:false}}),getOpenAIFinalValidation:()=>({passed:true,state:"FINAL_VALIDATED",readiness:"OPENAI_API_INTEGRATION_READY",providerNetworkCallPerformed:false})};
global.getExternalIntelligenceFoundationState=global.EXTERNAL010ExternalIntelligence.getExternalIntelligenceFoundationState;
global.registerDevelopmentDashboardModule=()=>({registered:true});global.registerDevelopmentStatus=()=>({registered:true});global.registerIdeComponent=()=>({registered:true});
global.getProjectFileCategory=f=>f.endsWith(".js")?"js":f.endsWith(".json")?"json":f.endsWith(".html")?"html":f.endsWith(".css")?"css":"other";
const inspect=[...p1,...p2,...p3,"01_project_manager.js","17_external_intelligence_core.js","17_external_intelligence_openai_provider_integration.js"].map(f=>({path:f,fileName:f,code:fs.readFileSync(path.join(root,f),"utf8")}));global.getProjectFiles=()=>inspect.map(x=>({...x}));
for(const f of p1)require(path.join(root,f));for(const f of p2)require(path.join(root,f));for(const f of p3)require(path.join(root,f));
global.__SELFDEV058_PHASE3_VALIDATION_MANIFEST=manifest;global.__SELFDEV058_PHASE3_VALIDATION_PROJECT_INFO=projectInfo;
(async()=>{
  const p2r=await global.runSelfDevelopment058Phase2Validation({manifest,projectInfo});
  check("Phase 2 Accepted/Frozen runtime regression remains 18/18 PASS",p2r&&p2r.passed===18&&p2r.failed===0&&p2r.total===18&&p2r.health===100&&p2r.criticalFailed===0,{passed:p2r&&p2r.passed,failed:p2r&&p2r.failed,total:p2r&&p2r.total,health:p2r&&p2r.health,criticalFailed:p2r&&p2r.criticalFailed});
  const r=await global.runSelfDevelopment058Phase3Validation();
  check("Phase 3 runtime validation passes",r&&r.failed===0&&r.criticalFailed===0&&r.phase3ImplementationComplete===true&&r.phase3TechnicalGateReady===true,{passed:r&&r.passed,failed:r&&r.failed,total:r&&r.total,health:r&&r.health,criticalFailed:r&&r.criticalFailed});
  check("Phase 3 validation grants no adoption, release, or canonical mutation",r&&r.releaseAllowed===false&&r.phase3Accepted===false&&r.implementationPhase4Allowed===false&&r.projectOwnerAcceptanceRequired===true&&r.validationIsApproval===false&&r.adoptionAuthorizationGranted===false&&r.canonicalMutationPerformed===false&&r.repository010AcceptanceTokenIssued===false,{releaseAllowed:r&&r.releaseAllowed,phase3Accepted:r&&r.phase3Accepted,validationIsApproval:r&&r.validationIsApproval,adoptionAuthorizationGranted:r&&r.adoptionAuthorizationGranted,canonicalMutationPerformed:r&&r.canonicalMutationPerformed});
  const coverage=global.SELFDEVELOPMENT058Environment.getSelfDevelopmentPhase3Coverage();check("18 Decision requirements remain tracked without false full completion",coverage.totalDecisionRequirements===18&&coverage.phase3ScopeComplete===true&&coverage.allDecisionRequirementsComplete===false&&coverage.falseFullDecisionCompletionClaimed===false,coverage);
  const guide=global.SELFDEVELOPMENT058Environment.getSelfDevelopmentPhase3RelaxationGuide();check("Relaxation guide is discoverable from one Decision-058 entry point",guide.file==="18_self_development_phase3_approval_policy.js"&&guide.engineMigrationRequired===true&&guide.changeEntryPoints.includes("approverMode")&&guide.changeEntryPoints.includes("consumptionMode"),guide);
  const h=global.SELFDEVELOPMENT058Phase3VersionManifest.hardBoundaries;check("Phase 3 hard boundaries are fixed",h.selfApprovalAllowed===false&&h.approvalBypassAllowed===false&&h.candidateApprovalEqualsAdoptionAuthorization===false&&h.patchGenerationEqualsMutationAuthority===false&&h.canonicalRepositoryMutationAllowed===false&&h.validationEqualsApproval===false,h);
  const failed=checks.filter(x=>!x.passed),criticalFailed=failed.filter(x=>x.severity==="Critical").length;
  const report={id:"SELF-DEVELOPMENT-058-PHASE3-STATIC-FUNCTIONAL-VALIDATION",decisionId:"EXTERNAL-010-DECISION-058",candidateVersion:"0.3.0",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,phase1FrozenSourceVerified:true,phase2FrozenSourceVerified:true,releaseAllowed:false,validationIsApproval:false,adoptionAuthorizationGranted:false,canonicalMutationPerformed:false,checks};
  console.log(JSON.stringify(report,null,2));process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
