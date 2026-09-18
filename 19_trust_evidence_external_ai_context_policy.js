/* ============================================================
   FILE: 19_trust_evidence_external_ai_context_policy.js
   EXTERNAL-020 Phase 4 / Bounded External AI Context Policy
   ============================================================ */
(function(global){
  "use strict";
  const namespace=global.EXTERNAL020TrustEvidence,P4=global.EXTERNAL020Phase4VersionManifest;if(!namespace||!namespace.__internal||!P4)return;
  const i=namespace.__internal;
  const POLICY=i.deepFreeze({
    policyId:"EXTERNAL020-PHASE4-EXTERNAL-AI-CONTEXT-POLICY",
    policyVersion:"1.0.0",
    provider:"OPENAI",
    sourceId:"SOURCE-OPENAI",
    operationId:"INTERNAL_ANALYSIS",
    purpose:"external020-governed-reliability-reasoning",
    defaultModel:"gpt-5.6-luna",
    maxQuestionChars:4000,
    maxEvidenceItems:8,
    maxEvidenceExcerptChars:2400,
    maxTotalEvidenceChars:12000,
    maxPromptChars:18000,
    maxOutputTokens:4096,
    allowedEvidenceTypes:["RELIABILITY_PROFILE","HISTORICAL_ASSESSMENT","EVIDENCE","CLAIM","SOURCE_METADATA","USER_SUPPLIED"],
    prohibitedTopLevelFields:["repositorySnapshot","allRepositoryFiles","rawRepository","secretValue","apiKey","password","credential"],
    storeRequiredValue:false,
    toolsAllowed:false,
    filesAllowed:false,
    webSearchAllowed:false,
    computerUseAllowed:false,
    automaticProfileRevisionAllowed:false,
    automaticKnowledgePromotionAllowed:false,
    automaticRepositoryMutationAllowed:false,
    repositoryWideAutomaticTransmissionAllowed:false,
    explicitProjectOwnerTransmissionApprovalRequired:true
  });
  function stableStringify(value){if(Array.isArray(value))return "["+value.map(stableStringify).join(",")+"]";if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(function(k){return JSON.stringify(k)+":"+stableStringify(value[k]);}).join(",")+"}";return JSON.stringify(value);}
  async function sha256Hex(text){const value=String(text==null?"":text);if(global.crypto&&global.crypto.subtle&&typeof global.TextEncoder==="function"){const d=await global.crypto.subtle.digest("SHA-256",new global.TextEncoder().encode(value));return Array.from(new Uint8Array(d)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");}let h=0x811c9dc5;for(let x=0;x<value.length;x+=1){h^=value.charCodeAt(x);h=Math.imul(h,0x01000193)>>>0;}return "fnv32-"+h.toString(16).padStart(8,"0");}
  function hasSecretLikeValue(text){const v=String(text==null?"":text);return /\bsk-[A-Za-z0-9_-]{12,}\b/.test(v)||/\bBearer\s+[A-Za-z0-9._~+\/=\-]{12,}\b/i.test(v)||/(?:api[_-]?key|access[_-]?token|password|secret(?:_?value)?)\s*[:=]\s*["'][^"']{6,}["']/i.test(v)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(v);}
  function normalizeEvidence(item,index){const x=i.isPlainObject(item)?item:{};const excerpt=String(x.excerpt==null?"":x.excerpt);return {evidenceId:i.text(x.evidenceId,"P4-EVIDENCE-"+String(index+1).padStart(2,"0")),evidenceType:i.text(x.evidenceType,"").toUpperCase(),sourceRef:i.text(x.sourceRef||x.sourceId,"")||null,locator:i.text(x.locator,"")||null,excerpt:excerpt,excerptChars:excerpt.length};}
  function validateInput(input){const x=i.isPlainObject(input)?input:{},errors=[];POLICY.prohibitedTopLevelFields.forEach(function(k){if(Object.prototype.hasOwnProperty.call(x,k))errors.push("PROHIBITED_FIELD:"+k);});const question=String(x.question==null?"":x.question).trim();if(!question)errors.push("QUESTION_REQUIRED");if(question.length>POLICY.maxQuestionChars)errors.push("QUESTION_TOO_LARGE");if(hasSecretLikeValue(question))errors.push("SECRET_LIKE_VALUE_IN_QUESTION");const raw=Array.isArray(x.evidenceItems)?x.evidenceItems:[];if(raw.length>POLICY.maxEvidenceItems)errors.push("EVIDENCE_ITEM_LIMIT_EXCEEDED");const items=raw.map(normalizeEvidence);let total=0;items.forEach(function(e){if(POLICY.allowedEvidenceTypes.indexOf(e.evidenceType)<0)errors.push("EVIDENCE_TYPE_NOT_ALLOWED:"+e.evidenceId);if(!e.excerpt)errors.push("EVIDENCE_EXCERPT_REQUIRED:"+e.evidenceId);if(e.excerptChars>POLICY.maxEvidenceExcerptChars)errors.push("EVIDENCE_EXCERPT_TOO_LARGE:"+e.evidenceId);if(hasSecretLikeValue(e.excerpt))errors.push("SECRET_LIKE_VALUE_IN_EVIDENCE:"+e.evidenceId);total+=e.excerptChars;});if(total>POLICY.maxTotalEvidenceChars)errors.push("TOTAL_EVIDENCE_LIMIT_EXCEEDED");return {valid:errors.length===0,errors:errors,question:question,evidenceItems:items,totalEvidenceChars:total};}
  function promptText(question,items){const lines=["EXTERNAL-020 governed reliability reasoning request.","Use only the supplied evidence and reliability context.","Treat your answer as a non-authoritative proposal candidate.","Do not confirm truth, resolve contradictions automatically, assign execution authority, promote Knowledge, revise a Reliability Profile, mutate a repository, or infer missing evidence.","Distinguish FACT / DERIVED / UNKNOWN / PROPOSAL.","If evidence is insufficient or conflicted, say so explicitly.","", "QUESTION:",question,"","EVIDENCE:"];items.forEach(function(e,n){lines.push("["+(n+1)+"] "+e.evidenceType+" | "+(e.sourceRef||"UNSPECIFIED")+(e.locator?" | "+e.locator:""));lines.push(e.excerpt);});return lines.join("\n");}
  async function buildExternal020ExternalAiContextPackage(input){const v=validateInput(input);if(!v.valid)return i.buildResult(false,"EXTERNAL020_PHASE4_CONTEXT_BLOCKED","Blocked",{errors:v.errors,externalTransmissionPerformed:false,secretValueTransmitted:false});const prompt=promptText(v.question,v.evidenceItems);if(prompt.length>POLICY.maxPromptChars)return i.buildResult(false,"EXTERNAL020_PHASE4_PROMPT_LIMIT_EXCEEDED","Blocked",{promptChars:prompt.length,maxPromptChars:POLICY.maxPromptChars,externalTransmissionPerformed:false});const lineage=v.evidenceItems.map(function(e){return {evidenceId:e.evidenceId,evidenceType:e.evidenceType,sourceRef:e.sourceRef,locator:e.locator,excerptChars:e.excerptChars};});const contextHash=await sha256Hex(stableStringify({policyId:POLICY.policyId,question:v.question,evidence:v.evidenceItems}));const pkg=i.deepFreeze({contextPackageId:i.nextId("EXTERNAL020-PHASE4-CONTEXT"),contextHash:contextHash,contextHashAlgorithm:contextHash.indexOf("fnv32-")===0?"FNV32-FALLBACK":"SHA-256",purpose:POLICY.purpose,question:v.question,evidenceItems:v.evidenceItems,evidenceLineage:lineage,evidenceItemCount:v.evidenceItems.length,totalEvidenceChars:v.totalEvidenceChars,promptText:prompt,promptChars:prompt.length,explicitEvidenceBounded:true,repositoryWideTransmission:false,secretValueIncluded:false,externalTransmissionPerformed:false,providerNetworkCallPerformed:false,canonicalMutationPerformed:false,profileRevisionPerformed:false,knowledgePromotionPerformed:false,createdAt:i.nowIso(),immutable:true});return i.buildResult(true,"EXTERNAL020_PHASE4_CONTEXT_READY","Ready",{contextPackage:pkg,externalTransmissionPerformed:false,providerNetworkCallPerformed:false,authorityEffect:"none"});}
  function getExternal020ExternalAiContextPolicy(){return i.clone(POLICY);}
  Object.assign(namespace.api,{getExternal020ExternalAiContextPolicy,buildExternal020ExternalAiContextPackage});Object.assign(namespace,namespace.api);namespace.modules.phase4ContextPolicy={id:"EXTERNAL-020-PHASE4-EXTERNAL-AI-CONTEXT-POLICY",version:P4.version,status:"Ready",loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
