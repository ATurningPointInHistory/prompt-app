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
check("project_info identity matches current UI candidate",Number(projectInfo.scriptManifestCount)===493&&projectInfo.scriptManifestHash===manifest.manifestHash&&projectInfo.scriptSetHash===manifest.scriptSetHash&&projectInfo.selfDevelopmentControlCenterVersion==="0.1.0",{count:projectInfo.scriptManifestCount,status:projectInfo.selfDevelopmentControlCenterStatus});
const parentScripts=manifest.scripts.filter(src=>norm(src)!==ui);const parentPayload=parentScripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");const parentSetHash=sha(Buffer.from(parentPayload));
check("Frozen EXTERNAL-020 Decision001 / Phase4 parent 492 runtime scripts remain byte/order identical",parentScripts.length===492&&parentSetHash==="891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",{parentCount:parentScripts.length,parentScriptSetHash:parentSetHash});
const uiPos=manifest.scripts.findIndex(src=>norm(src)===ui),p6Pos=manifest.scripts.findIndex(src=>norm(src)==="18_self_development_phase6_validation.js"),p19Pos=manifest.scripts.findIndex(src=>norm(src)==="19_trust_evidence_version_manifest.js");
check("Control Center loads additively after Decision058 Phase6 and before EXTERNAL020",uiPos===p6Pos+1&&uiPos<p19Pos,{p6Pos,uiPos,p19Pos});
const uiSource=fs.readFileSync(path.join(root,ui),"utf8");
check("Control Center exposes no direct External AI execution call",!uiSource.includes("executeSelfDevelopmentPhase6ExternalAiReasoning"),null);
check("Control Center exposes no automatic approval/adoption/canonical reflection action",!uiSource.includes("adoptSelfDevelopment")&&!uiSource.includes("reflectSelfDevelopment")&&!uiSource.includes("promoteSelfDevelopment"),null);
let decision058=null;try{decision058=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,"validate_self_development_058_phase6.cjs")],{encoding:"utf8"}));}catch(error){try{decision058=JSON.parse(String(error.stdout||""));}catch(_){decision058={failed:1,error:error.message};}}
check("Decision058 Phase6 regression remains 28/28 PASS",decision058&&decision058.passed===28&&decision058.failed===0&&decision058.total===28&&decision058.health===100&&decision058.criticalFailed===0&&decision058.decision058Technical18Of18===true,decision058&&{passed:decision058.passed,failed:decision058.failed,total:decision058.total,health:decision058.health,criticalFailed:decision058.criticalFailed,decision058Technical18Of18:decision058.decision058Technical18Of18});
// Runtime API validation with a safe stub. No DOM, repository write, provider call, approval or adoption.
global.SELFDEVELOPMENT058Environment={__internal:{},getSelfDevelopmentDashboardStatus(){return{};},inspectSelfDevelopmentRepository(){return{};},detectSelfDevelopmentPhase2Candidates(){return{};},createSelfDevelopmentProposal(){return{};},openSelfDevelopmentPhase5TrialUI(){return{};},inspectSelfDevelopmentPhase6ExternalAiReadiness(){return{};}};
delete require.cache[require.resolve(path.join(root,ui))];require(path.join(root,ui));const rv=global.validateSelfDevelopment058ControlCenter();
check("Control Center runtime self-validation passes 12/12",rv&&rv.passed===12&&rv.failed===0&&rv.total===12&&rv.health===100&&rv.criticalFailed===0,rv);
const failed=checks.filter(x=>!x.passed),criticalFailed=failed.filter(x=>x.severity==="Critical").length;
const report={id:"SELF-DEVELOPMENT-058-CONTROL-CENTER-V0.1.0-STATIC-FUNCTIONAL-VALIDATION",decisionId:"EXTERNAL-010-DECISION-058",version:"0.1.0",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,parentFrozenScriptCount:492,parentFrozenScriptSetHash:"891ef4dad32e25a896baf7f38b24717680c357c2adeabcc719d6e2fc35cf9c30",newAuthorityGranted:false,automaticApprovalEnabled:false,automaticAdoptionEnabled:false,canonicalMutationEnabled:false,providerExecutionEnabled:false,releaseAllowed:false,validationIsApproval:false,checks};
console.log(JSON.stringify(report,null,2));process.exitCode=failed.length?1:0;
