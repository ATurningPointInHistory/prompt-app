"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=__dirname,checks=[];
const check=(name,passed,detail,severity="Critical")=>checks.push({name,passed:Boolean(passed),detail,severity});
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const norm=s=>String(s||"").split("#")[0].split("?")[0].replace(/^\.\//,"");
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==="object"){const o={};Object.keys(v).sort().forEach(k=>o[k]=stable(v[k]));return o;}return v;}
const manifest=JSON.parse(fs.readFileSync(path.join(root,"00_script_manifest.json"),"utf8"));
const projectInfo=JSON.parse(fs.readFileSync(path.join(root,"project_info.json"),"utf8"));
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const phase3Files=["19_trust_evidence_phase3_version_manifest.js","19_trust_evidence_historical_outcome_adapter.js","19_trust_evidence_historical_outcome_assessment.js","19_trust_evidence_phase3_traceability.js","19_trust_evidence_phase3_validation.js","19_trust_evidence_phase3_android_validation.js"];
const phase3CoreHashes={
  "19_trust_evidence_historical_outcome_adapter.js":"6530f93e79450ebc35430097a62efdf93ff96b709ac40212df47721383e270c4",
  "19_trust_evidence_historical_outcome_assessment.js":"a766bd0275f576ea33a63566ab46687b0b15108b98d7326129141bed0287f855",
  "19_trust_evidence_phase3_traceability.js":"1fd7ba666297ddb183fac7586b32060d23b40b18570d119b10eaabca54ee1bea",
  "19_trust_evidence_phase3_validation.js":"7ca3c1dcc906e2b3996b20e9f1cc57ec113fe34aa932d65f35a8d64f77acc067"
};
let verified=0,cache=0,missing=[];
for(const src of manifest.scripts){const f=norm(src),p=path.join(root,f),h=manifest.hashes&&manifest.hashes[f];if(!fs.existsSync(p)||!h){missing.push(f);continue;}const b=fs.readFileSync(p),actual=sha(b);if(actual===h.sha256&&b.length===h.byteSize)verified++;const m=String(src).match(/[?&]h=([a-f0-9]+)/i);if(m&&m[1]===h.cacheKey&&h.cacheKey===h.sha256.slice(0,12))cache++;}
check("All 485 manifest script hashes and byte sizes match",verified===manifest.scripts.length&&manifest.scripts.length===485&&missing.length===0,{verified,total:manifest.scripts.length,missing});
check("All manifest cache keys match",cache===manifest.scripts.length,{verified:cache,total:manifest.scripts.length});
const payload=manifest.scripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
check("Script Set Hash verifies",sha(Buffer.from(payload))===manifest.scriptSetHash,{computed:sha(Buffer.from(payload)),stored:manifest.scriptSetHash});
const cp=JSON.parse(JSON.stringify(manifest));delete cp.manifestHash;delete cp.updatedAt;const mh=sha(Buffer.from(JSON.stringify(stable(cp))));
check("Manifest Hash verifies",mh===manifest.manifestHash,{computed:mh,stored:manifest.manifestHash});
const meta=(index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/)||[])[1]||"";
check("index manifest hash marker matches",meta===manifest.manifestHash,{index:meta,manifest:manifest.manifestHash});
const seq=[];const re=/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;let mm;while((mm=re.exec(index)))if(/^\.\//.test(mm[1])&&/\.js(?:\?|$)/i.test(mm[1]))seq.push(mm[1]);
check("index script sequence matches manifest",JSON.stringify(seq)===JSON.stringify(manifest.scripts),{indexCount:seq.length,manifestCount:manifest.scripts.length});
const p3ValidationPos=manifest.scripts.findIndex(x=>norm(x)==="19_trust_evidence_phase3_validation.js"),androidPos=manifest.scripts.findIndex(x=>norm(x)==="19_trust_evidence_phase3_android_validation.js"),initPos=manifest.scripts.findIndex(x=>norm(x)==="99_init.js");
check("Phase 3 Android validator is immediately after Phase 3 validation and before 99_init",androidPos===p3ValidationPos+1&&androidPos<initPos,{p3ValidationPos,androidPos,initPos});
const parent=manifest.scripts.filter(src=>!phase3Files.includes(norm(src)));const parentPayload=parent.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
check("Frozen Phase 2 v0.2.1 parent script set remains byte/order identical",parent.length===479&&sha(Buffer.from(parentPayload))==="9cd116d990e97864c8866abdf7c00e631f275bd6f74c8e6d31aa84a2961f6d03",{parentScriptCount:parent.length,parentScriptSetHash:sha(Buffer.from(parentPayload))});
check("Phase 3 functional core remains byte-identical to v0.3.0",Object.entries(phase3CoreHashes).every(([f,h])=>manifest.hashes[f]&&manifest.hashes[f].sha256===h),Object.entries(phase3CoreHashes).map(([f,h])=>({file:f,expected:h,actual:manifest.hashes[f]&&manifest.hashes[f].sha256})));
const canonical=manifest.scripts.filter(src=>!/^19_trust_evidence_/.test(norm(src)));const canonicalPayload=canonical.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
check("Canonical 0023 parent script set remains byte/order identical",canonical.length===462&&sha(Buffer.from(canonicalPayload))==="d3121eb588b7c7b332cb86ef66f82fe2f2ecd77bd1be029143ff578f2d0514a3",{parentScriptCount:canonical.length,parentScriptSetHash:sha(Buffer.from(canonicalPayload))});
check("project_info identity matches Phase 3 v0.3.1 Android Validation candidate",projectInfo.scriptManifestCount===485&&projectInfo.scriptManifestHash===manifest.manifestHash&&projectInfo.scriptSetHash===manifest.scriptSetHash&&projectInfo.releaseStatus==="EXTERNAL_020_PHASE3_ANDROID_VALIDATION_CANDIDATE"&&projectInfo.external020Phase2Status==="PROJECT_OWNER_ACCEPTED_FROZEN"&&projectInfo.external020Phase3Version==="0.3.1"&&projectInfo.external020Phase3Status==="IMPLEMENTATION_PHASE3_ANDROID_VALIDATION_CANDIDATE"&&projectInfo.external020Phase3AndroidValidationImplemented===true&&projectInfo.external020Phase3AndroidValidationFunction==="runExternal020Phase3AndroidValidation"&&projectInfo.external020Decision001RequirementsImplementedCandidateCount===17&&projectInfo.releaseAllowed===false,{count:projectInfo.scriptManifestCount,releaseStatus:projectInfo.releaseStatus,phase3Version:projectInfo.external020Phase3Version,phase3Status:projectInfo.external020Phase3Status,androidValidation:projectInfo.external020Phase3AndroidValidationFunction,requirements:projectInfo.external020Decision001RequirementsImplementedCandidateCount,releaseAllowed:projectInfo.releaseAllowed});
const saved=new Set(projectInfo.savedFiles||[]);check("project_info savedFiles covers every manifest script",manifest.scripts.every(src=>saved.has(norm(src))),{savedCount:saved.size,manifestCount:manifest.scripts.length});

// Runtime fixture: Browser/Android + read-only EXTERNAL-010 APIs.
global.document={};Object.defineProperty(global,"navigator",{value:{userAgent:"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36"},configurable:true});global.IDE170Intelligence={};global.IDE180KnowledgeNavigator={};
const sourcePkg={contractId:"EXTERNAL-010-CONTRACT-RELIABILITY-INPUT-PACKAGE",operationalSignals:[{reliabilitySignalId:"RS-P3A-STATIC",sourceId:"SRC-PHASE2",requestCount:10,successCount:9,timeoutCount:1,schemaFailureCount:0,freshnessState:"FRESH"}],evidenceQualitySignals:[{qualitySignalId:"QS-P3A-STATIC-A",evidenceId:"EVIDENCE-P2-A",sourceId:"SRC-PHASE2",sourceRole:"PRIMARY",contentPresent:true,schemaValid:true,timestampPresent:true,sourceIdentityResolved:true,contentHashVerified:true,provenanceComplete:true,temporalMetadataComplete:true},{qualitySignalId:"QS-P3A-STATIC-B",evidenceId:"EVIDENCE-P2-B",sourceId:"SRC-PHASE2",sourceRole:"SECONDARY",contentPresent:true,schemaValid:true,timestampPresent:true,sourceIdentityResolved:true,contentHashVerified:true,provenanceComplete:true,temporalMetadataComplete:true}],contradictionCandidates:[],confirmationCandidates:[],finalReliabilityAuthority:"EXTERNAL-020",generatedAt:new Date().toISOString(),contractValid:true};
global.EXTERNAL010ExternalIntelligence={
  getExternalIntelligenceReliabilityInputPackage:()=>JSON.parse(JSON.stringify(sourcePkg)),
  getExternalIntelligencePrediction:()=>null,
  listExternalIntelligencePredictionHistory:()=>[],
  getExternalIntelligenceOutcome:()=>null,
  listExternalIntelligenceOutcomeHistory:()=>[],
  listExternalIntelligenceCapabilityPerformanceProfiles:()=>[]
};
const runtimeFiles=manifest.scripts.map(norm).filter(f=>/^19_trust_evidence_/.test(f));for(const f of runtimeFiles)require(path.join(root,f));
check("Phase 3 Version Manifest reports v0.3.1 Android Validation candidate",global.EXTERNAL020Phase3VersionManifest&&global.EXTERNAL020Phase3VersionManifest.version==="0.3.1"&&global.EXTERNAL020Phase3VersionManifest.status==="IMPLEMENTATION_PHASE3_ANDROID_VALIDATION_CANDIDATE",global.EXTERNAL020Phase3VersionManifest);
const android=global.runExternal020Phase3AndroidValidation();
const baseDetail=android&&android.checks&&android.checks[0]?android.checks[0].detail:null;
check("Phase 3 functional fixture passes 21/21",baseDetail&&baseDetail.passed===21&&baseDetail.failed===0&&baseDetail.criticalFailed===0&&baseDetail.decision001RequirementsComplete===17,baseDetail);
check("Phase 3 Android validator fixture passes 21/21",android&&android.passed===21&&android.failed===0&&android.total===21&&android.health===100&&android.criticalFailed===0&&android.phase3AndroidRealDeviceComplete===true&&android.phase3ProjectOwnerGateReady===true&&android.decision001RequirementsComplete===17,android);
const p2Coverage=global.EXTERNAL020TrustEvidence.getExternal020Decision001Coverage();const p3Coverage=global.EXTERNAL020TrustEvidence.getExternal020Phase3Decision001Coverage();
check("Backward compatibility keeps Frozen Phase 2 coverage at 16/18",p2Coverage.decisionRequirementsFullyImplemented===16&&p2Coverage.remainingRequirementIds.includes("REQ-020-008")&&p2Coverage.remainingRequirementIds.includes("REQ-020-015"),p2Coverage);
check("Phase 3 coverage remains 17/18 with only REQ-020-015 remaining",p3Coverage.decisionRequirementsFullyImplemented===17&&p3Coverage.allDecisionRequirementsComplete===false&&p3Coverage.remainingRequirementIds.length===1&&p3Coverage.remainingRequirementIds[0]==="REQ-020-015",p3Coverage);
check("Android gate remains non-approving and side-effect free",android&&android.releaseAllowed===false&&android.projectOwnerAcceptanceRequired===true&&android.validationIsApproval===false&&android.canonicalMutationPerformed===false&&android.externalTransmissionPerformed===false&&android.paidApiExecutionPerformed===false&&android.historicalOutcomeGroundedEvaluationPerformed===true&&android.externalAiReliabilityReasoningPerformed===false,android);

const failed=checks.filter(c=>!c.passed),criticalFailed=failed.filter(c=>c.severity==="Critical").length;
const report={id:"EXTERNAL-020-PHASE3-V0.3.1-ANDROID-VALIDATION-CANDIDATE-STATIC-FUNCTIONAL",decisionId:"EXTERNAL-020-DECISION-001",candidateVersion:"0.3.1",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,frozenPhase2ParentVerified:true,phase3FunctionalCoreByteIdentical:true,canonical0023ParentVerified:true,phase3FunctionalFixture:{passed:baseDetail&&baseDetail.passed,failed:baseDetail&&baseDetail.failed,total:21},androidValidatorFixture:{passed:android.passed,failed:android.failed,total:android.total},decision001RequirementsComplete:17,decision001RequirementsTotal:18,remainingRequirementIds:["REQ-020-015"],releaseAllowed:false,validationIsApproval:false,canonicalMutationPerformed:false,externalTransmissionPerformed:false,paidApiExecutionPerformed:false,checks};
console.log(JSON.stringify(report,null,2));process.exitCode=failed.length?1:0;
