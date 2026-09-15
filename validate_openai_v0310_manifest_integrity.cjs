"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=__dirname,checks=[];const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),detail});
const manifest=JSON.parse(fs.readFileSync(path.join(root,"00_script_manifest.json"),"utf8"));
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const norm=s=>String(s||"").split("#")[0].split("?")[0].replace(/^\.\//,"");
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==="object"){const o={};Object.keys(v).sort().forEach(k=>o[k]=stable(v[k]));return o;}return v;}
check("Manifest keeps 410 scripts",Array.isArray(manifest.scripts)&&manifest.scripts.length===410,manifest.scripts&&manifest.scripts.length);
let fileHashPass=0,cachePass=0,missing=[];
for(const src of manifest.scripts){const f=norm(src),p=path.join(root,f),h=manifest.hashes&&manifest.hashes[f];if(!fs.existsSync(p)||!h){missing.push(f);continue;}const b=fs.readFileSync(p),actual=sha(b);if(actual===h.sha256&&b.length===h.byteSize)fileHashPass++;const m=String(src).match(/[?&]h=([a-f0-9]+)/i);if(m&&m[1]===h.cacheKey&&h.cacheKey===h.sha256.slice(0,12))cachePass++;}
check("All 410 script hashes and byte sizes match",fileHashPass===410&&missing.length===0,{verified:fileHashPass,missing});
check("All 410 manifest cache keys match script URLs",cachePass===410,{verified:cachePass});
const setPayload=manifest.scripts.map(src=>{const f=norm(src);return `${f}:${manifest.hashes[f].sha256}`;}).join("\n");
const setHash=sha(Buffer.from(setPayload));
check("Script Set Hash verifies",setHash===manifest.scriptSetHash,{computed:setHash,stored:manifest.scriptSetHash});
const copy=JSON.parse(JSON.stringify(manifest));delete copy.manifestHash;delete copy.updatedAt;const mh=sha(Buffer.from(JSON.stringify(stable(copy))));
check("Manifest Hash verifies",mh===manifest.manifestHash,{computed:mh,stored:manifest.manifestHash});
const meta=(index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/)||[])[1]||"";
check("index.html Manifest Hash marker matches",meta===manifest.manifestHash,{index:meta,manifest:manifest.manifestHash});
const indexScripts=[];const re=/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;let m;while((m=re.exec(index)))if(/^\.\//.test(m[1])&&/\.js(?:\?|$)/i.test(m[1]))indexScripts.push(m[1]);
check("index.html script sequence matches 410-script manifest",JSON.stringify(indexScripts)===JSON.stringify(manifest.scripts),{indexCount:indexScripts.length,manifestCount:manifest.scripts.length});
const changed=["17_external_intelligence_core.js","17_external_intelligence_openai_provider_integration.js","17_external_intelligence_openai_provider_ui.js","17_external_intelligence_console.js"];
check("v0.3.10 changed files use refreshed cache keys",changed.every(f=>index.includes(`./${f}?h=${manifest.hashes[f].cacheKey}`)),changed.map(f=>({file:f,cacheKey:manifest.hashes[f].cacheKey})));
const failed=checks.filter(x=>!x.passed);console.log(JSON.stringify({id:"OPENAI-V0.3.10-MANIFEST-INTEGRITY",candidateVersion:"0.3.10",passed:checks.length-failed.length,failed:failed.length,total:checks.length,health:Math.round((checks.length-failed.length)/checks.length*100),criticalFailed:failed.length,scriptCount:manifest.scripts.length,manifestHash:manifest.manifestHash,scriptSetHash:manifest.scriptSetHash,checks},null,2));process.exitCode=failed.length?1:0;
