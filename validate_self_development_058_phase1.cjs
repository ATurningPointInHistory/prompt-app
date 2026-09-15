"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = __dirname, checks = [];
const check = (name, passed, detail, severity="Critical") => checks.push({name, passed:Boolean(passed), detail, severity});
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const norm = s => String(s||"").split("#")[0].split("?")[0].replace(/^\.\//,"");
function stable(v){ if(Array.isArray(v)) return v.map(stable); if(v&&typeof v==="object"){ const o={}; Object.keys(v).sort().forEach(k=>o[k]=stable(v[k])); return o; } return v; }
const manifest = JSON.parse(fs.readFileSync(path.join(root,"00_script_manifest.json"),"utf8"));
const projectInfo = JSON.parse(fs.readFileSync(path.join(root,"project_info.json"),"utf8"));
const index = fs.readFileSync(path.join(root,"index.html"),"utf8");
const selfFiles = [
  "18_self_development_version_manifest.js",
  "18_self_development_core.js",
  "18_self_development_baseline_identity.js",
  "18_self_development_adapter.js",
  "18_self_development_candidate.js",
  "18_self_development_traceability.js",
  "18_self_development_dashboard.js",
  "18_self_development_phase1_validation.js"
];
let hashPass=0, cachePass=0, missing=[];
for(const src of manifest.scripts){ const f=norm(src), p=path.join(root,f), h=manifest.hashes&&manifest.hashes[f]; if(!fs.existsSync(p)||!h){missing.push(f);continue;} const b=fs.readFileSync(p), actual=sha(b); if(actual===h.sha256&&b.length===h.byteSize) hashPass++; const m=String(src).match(/[?&]h=([a-f0-9]+)/i); if(m&&m[1]===h.cacheKey&&h.cacheKey===h.sha256.slice(0,12)) cachePass++; }
check("All manifest script hashes and byte sizes match", hashPass===manifest.scripts.length&&missing.length===0,{verified:hashPass,total:manifest.scripts.length,missing});
check("All manifest cache keys match", cachePass===manifest.scripts.length,{verified:cachePass,total:manifest.scripts.length});
const setPayload=manifest.scripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
const computedSetHash=sha(Buffer.from(setPayload));
check("Script Set Hash verifies",computedSetHash===manifest.scriptSetHash,{computed:computedSetHash,stored:manifest.scriptSetHash});
const copy=JSON.parse(JSON.stringify(manifest)); delete copy.manifestHash; delete copy.updatedAt;
const computedManifestHash=sha(Buffer.from(JSON.stringify(stable(copy))));
check("Manifest Hash verifies",computedManifestHash===manifest.manifestHash,{computed:computedManifestHash,stored:manifest.manifestHash});
const meta=(index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/)||[])[1]||"";
check("index manifest hash marker matches",meta===manifest.manifestHash,{index:meta,manifest:manifest.manifestHash});
const indexScripts=[]; const re=/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi; let m; while((m=re.exec(index))) if(/^\.\//.test(m[1])&&/\.js(?:\?|$)/i.test(m[1])) indexScripts.push(m[1]);
check("index script sequence matches manifest",JSON.stringify(indexScripts)===JSON.stringify(manifest.scripts),{indexCount:indexScripts.length,manifestCount:manifest.scripts.length});
check("All Decision 058 Phase 1 scripts are present",selfFiles.every(f=>manifest.scripts.some(src=>norm(src)===f)),selfFiles);
const positions=selfFiles.map(f=>manifest.scripts.findIndex(src=>norm(src)===f)); const initPos=manifest.scripts.findIndex(src=>norm(src)==="99_init.js");
check("Decision 058 scripts load in defined order before 99_init",positions.every((p,idx)=>p>=0&&(idx===0||p===positions[idx-1]+1))&&positions[positions.length-1]<initPos,{positions,initPos});
check("project_info identity matches current manifest",projectInfo.scriptManifestVersion===manifest.version&&projectInfo.applicationReleaseVersion===manifest.applicationReleaseVersion&&Number(projectInfo.scriptManifestCount)===manifest.scripts.length&&projectInfo.scriptManifestHash===manifest.manifestHash&&projectInfo.scriptSetHash===manifest.scriptSetHash,{projectInfo:{count:projectInfo.scriptManifestCount,manifestHash:projectInfo.scriptManifestHash,scriptSetHash:projectInfo.scriptSetHash},manifest:{count:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash}});
const saved=new Set(projectInfo.savedFiles||[]); check("project_info savedFiles covers every manifest script",manifest.scripts.every(src=>saved.has(norm(src))),{savedCount:saved.size,manifestCount:manifest.scripts.length});
check("Candidate release does not claim releaseAllowed",projectInfo.releaseAllowed===false&&projectInfo.projectOwnerRevalidationRequired===true,{releaseStatus:projectInfo.releaseStatus,releaseAllowed:projectInfo.releaseAllowed,projectOwnerRevalidationRequired:projectInfo.projectOwnerRevalidationRequired});

// Functional validation in Node using read-only dependency stubs.
global.IDE140DevelopmentAnalytics={getDevelopmentAnalyticsStatus:()=>({id:"IDE-140",status:"Completed"})};
global.IDE170Intelligence={getStatus:()=>({componentId:"IDE-170",status:"Ready"}),getRepositorySnapshotStatus:()=>({status:"Ready"})};
global.IDE190DevelopmentAutomation={getStatus:()=>({componentId:"IDE-190",status:"Ready"}),getSafetyStatus:()=>({persistentCommitAllowed:false,directMutation:false})};
global.REPOSITORY010LocalFirstRepository={getStatus:()=>({componentId:"REPOSITORY-010",status:"Ready"}),getSafetyStatus:()=>({directRepositoryMutationAllowed:false})};
global.EXTERNAL010ExternalIntelligence={getStatus:()=>({componentId:"EXTERNAL-010",status:"FINAL_RELEASE"})};
global.registerDevelopmentDashboardModule=()=>({registered:true});
global.registerDevelopmentStatus=()=>({registered:true});
global.registerIdeComponent=()=>({registered:true});
for(const f of selfFiles) require(path.join(root,f));
(async()=>{
  const result=await global.runSelfDevelopment058Phase1Validation({manifest,projectInfo});
  check("Phase 1 functional validation passes",result&&result.failed===0&&result.criticalFailed===0&&result.phase1ImplementationComplete===true&&result.phase1TechnicalGateReady===true,result);
  check("Phase 1 validation does not grant release or approval",result&&result.releaseAllowed===false&&result.implementationPhase2Allowed===false&&result.projectOwnerAcceptanceRequired===true&&result.validationIsApproval===false&&result.canonicalMutationPerformed===false,{releaseAllowed:result&&result.releaseAllowed,validationIsApproval:result&&result.validationIsApproval,canonicalMutationPerformed:result&&result.canonicalMutationPerformed});
  const safety=global.getSelfDevelopment058SafetyStatus();
  check("Self-development hard denies remain fixed",safety&&safety.directCanonicalRepositoryMutationAllowed===false&&safety.automaticCandidateApprovalAllowed===false&&safety.automaticAdoptionApprovalAllowed===false&&safety.selfGrantedAuthorityAllowed===false&&safety.automaticBudgetExpansionAllowed===false,safety);
  const coverage=global.SELFDEVELOPMENT058Environment.getSelfDevelopmentPhase1Coverage();
  check("18 Requirement IDs tracked without false full-decision PASS",coverage.totalDecisionRequirements===18&&coverage.phase1ScopeComplete===true&&coverage.allDecisionRequirementsComplete===false,coverage);
  const failed=checks.filter(x=>!x.passed), criticalFailed=failed.filter(x=>x.severity==="Critical").length;
  const report={id:"SELF-DEVELOPMENT-058-PHASE1-STATIC-FUNCTIONAL-VALIDATION",decisionId:"EXTERNAL-010-DECISION-058",candidateVersion:"0.1.0",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,releaseAllowed:false,validationIsApproval:false,checks};
  console.log(JSON.stringify(report,null,2)); process.exitCode=failed.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
