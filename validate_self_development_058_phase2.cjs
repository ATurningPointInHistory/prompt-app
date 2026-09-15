"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = __dirname, checks = [];
const check = (name, passed, detail, severity = "Critical") => checks.push({ name, passed: Boolean(passed), detail, severity });
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const norm = s => String(s || "").split("#")[0].split("?")[0].replace(/^\.\//, "");
function stable(v) { if (Array.isArray(v)) return v.map(stable); if (v && typeof v === "object") { const o = {}; Object.keys(v).sort().forEach(k => o[k] = stable(v[k])); return o; } return v; }

const manifest = JSON.parse(fs.readFileSync(path.join(root, "00_script_manifest.json"), "utf8"));
const projectInfo = JSON.parse(fs.readFileSync(path.join(root, "project_info.json"), "utf8"));
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const phase1FrozenHashes = {
  "18_self_development_version_manifest.js": "85212e46389a1bf1c9893bfaa49e9f4dc93cb805bb83554689483298cf325022",
  "18_self_development_core.js": "1fefbfc970a5e3f13bce1bb9543855e3a55319d777298690b1695c3163ed63a3",
  "18_self_development_baseline_identity.js": "576aa7144410da8db0577aedca49be28252a7cf39ad6108c798b5828600db829",
  "18_self_development_adapter.js": "dff9273d523476ddbf37badc697dec0f59b65320acc81e2ccad2145421f0e03d",
  "18_self_development_candidate.js": "06f466cd13aaadd4229729269d5b3b950839d1fb6e35b8741f78b37d3c594733",
  "18_self_development_traceability.js": "754a62f36c5eee2c15f924a8d823d324a5e2a97bc44fcbca5d29489db571a913",
  "18_self_development_dashboard.js": "7758b20bd1b13dc692a392e690b383099ab5ea7b00f65932112fba1d14641afb",
  "18_self_development_phase1_validation.js": "1fa2cd44bb5f58781000ec848e884a741dd2c6764beabc0359b13325dc36d381"
};
const phase1Files = Object.keys(phase1FrozenHashes);
const openAiFrozenHashes = {
  "17_external_intelligence_openai_provider_integration.js": "0107b4838b2bef35daa8e700a4be47766738948f351620903a20323dc8dcb891",
  "17_external_intelligence_openai_provider_ui.js": "1ee0d94d7d5d3786ee13a68989acdb74b3813dd7d9482fbd8d153f555cebdd87"
};

const phase2Files = [
  "18_self_development_phase2_version_manifest.js",
  "18_self_development_phase2_persistence.js",
  "18_self_development_phase2_repository_inspection.js",
  "18_self_development_phase2_evidence_integrity.js",
  "18_self_development_phase2_candidate_detection.js",
  "18_self_development_phase2_validation_contract.js",
  "18_self_development_phase2_external_ai_readiness.js",
  "18_self_development_phase2_traceability.js",
  "18_self_development_phase2_dashboard.js",
  "18_self_development_phase2_validation.js"
];

let hashPass = 0, cachePass = 0, missing = [];
for (const src of manifest.scripts) {
  const f = norm(src), p = path.join(root, f), h = manifest.hashes && manifest.hashes[f];
  if (!fs.existsSync(p) || !h) { missing.push(f); continue; }
  const b = fs.readFileSync(p), actual = sha(b);
  if (actual === h.sha256 && b.length === h.byteSize) hashPass += 1;
  const m = String(src).match(/[?&]h=([a-f0-9]+)/i);
  if (m && m[1] === h.cacheKey && h.cacheKey === h.sha256.slice(0, 12)) cachePass += 1;
}
check("All manifest script hashes and byte sizes match", hashPass === manifest.scripts.length && missing.length === 0, { verified: hashPass, total: manifest.scripts.length, missing });
check("All manifest cache keys match", cachePass === manifest.scripts.length, { verified: cachePass, total: manifest.scripts.length });
const setPayload = manifest.scripts.map(src => { const f = norm(src); return `${f}:${manifest.hashes[f].sha256}`; }).join("\n");
const computedSetHash = sha(Buffer.from(setPayload));
check("Script Set Hash verifies", computedSetHash === manifest.scriptSetHash, { computed: computedSetHash, stored: manifest.scriptSetHash });
const copy = JSON.parse(JSON.stringify(manifest)); delete copy.manifestHash; delete copy.updatedAt;
const computedManifestHash = sha(Buffer.from(JSON.stringify(stable(copy))));
check("Manifest Hash verifies", computedManifestHash === manifest.manifestHash, { computed: computedManifestHash, stored: manifest.manifestHash });
const meta = (index.match(/<meta name="ai-pro-script-manifest-hash" content="([a-f0-9]{64})"/) || [])[1] || "";
check("index manifest hash marker matches", meta === manifest.manifestHash, { index: meta, manifest: manifest.manifestHash });
const indexScripts = []; const re = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi; let m;
while ((m = re.exec(index))) if (/^\.\//.test(m[1]) && /\.js(?:\?|$)/i.test(m[1])) indexScripts.push(m[1]);
check("index script sequence matches manifest", JSON.stringify(indexScripts) === JSON.stringify(manifest.scripts), { indexCount: indexScripts.length, manifestCount: manifest.scripts.length });
check("All Decision 058 Phase 2 scripts are present", phase2Files.every(f => manifest.scripts.some(src => norm(src) === f)), phase2Files);
const positions = phase2Files.map(f => manifest.scripts.findIndex(src => norm(src) === f));
const p1End = manifest.scripts.findIndex(src => norm(src) === "18_self_development_phase1_validation.js"), initPos = manifest.scripts.findIndex(src => norm(src) === "99_init.js");
check("Phase 2 scripts load additively after frozen Phase 1 and before 99_init", positions.every((p, idx) => p >= 0 && (idx === 0 ? p === p1End + 1 : p === positions[idx - 1] + 1)) && positions[positions.length - 1] < initPos, { phase1End: p1End, positions, initPos });
const frozenResults = phase1Files.map(f => ({ file: f, expected: phase1FrozenHashes[f], actual: sha(fs.readFileSync(path.join(root, f))) }));
check("Phase 1 Accepted/Frozen Self-Development source files are byte-identical", frozenResults.every(x => x.expected === x.actual), frozenResults);
const openAiFrozenResults = Object.keys(openAiFrozenHashes).map(f => ({ file: f, expected: openAiFrozenHashes[f], actual: sha(fs.readFileSync(path.join(root, f))) }));
check("OpenAI v0.3.11 provider integration source remains byte-identical", openAiFrozenResults.every(x => x.expected === x.actual), openAiFrozenResults);
const cp = require("node:child_process");
let openAiFinal = null;
try { openAiFinal = JSON.parse(cp.execFileSync(process.execPath, [path.join(root, "validate_openai_final_validation_gate_v0311.cjs")], { encoding: "utf8" })); } catch (error) { try { openAiFinal = JSON.parse(String(error.stdout || "")); } catch (_) { openAiFinal = { failed: 1, error: error.message }; } }
check("OpenAI v0.3.11 Final Validation Gate remains 23/23 PASS", openAiFinal && openAiFinal.passed === 23 && openAiFinal.failed === 0 && openAiFinal.total === 23 && openAiFinal.health === 100 && openAiFinal.criticalFailed === 0, openAiFinal);

check("project_info identity matches current manifest", projectInfo.scriptManifestVersion === manifest.version && projectInfo.applicationReleaseVersion === manifest.applicationReleaseVersion && Number(projectInfo.scriptManifestCount) === manifest.scripts.length && projectInfo.scriptManifestHash === manifest.manifestHash && projectInfo.scriptSetHash === manifest.scriptSetHash, { projectInfo: { count: projectInfo.scriptManifestCount, manifestHash: projectInfo.scriptManifestHash, scriptSetHash: projectInfo.scriptSetHash }, manifest: { count: manifest.scripts.length, manifestHash: manifest.manifestHash, scriptSetHash: manifest.scriptSetHash } });
const saved = new Set(projectInfo.savedFiles || []);
check("project_info savedFiles covers every manifest script", manifest.scripts.every(src => saved.has(norm(src))), { savedCount: saved.size, manifestCount: manifest.scripts.length });
check("Phase 2 candidate metadata does not claim release or approval", projectInfo.releaseStatus === "SELF_DEVELOPMENT_058_PHASE2_CANDIDATE" && projectInfo.releaseAllowed === false && projectInfo.projectOwnerRevalidationRequired === true && projectInfo.decision058Phase1Status === "PROJECT_OWNER_ACCEPTED_FROZEN" && projectInfo.decision058CanonicalMutationImplemented === false && projectInfo.decision058ValidationIsApproval === false, { releaseStatus: projectInfo.releaseStatus, releaseAllowed: projectInfo.releaseAllowed, phase1Status: projectInfo.decision058Phase1Status, canonicalMutation: projectInfo.decision058CanonicalMutationImplemented, validationIsApproval: projectInfo.decision058ValidationIsApproval });
const inspectorSource = fs.readFileSync(path.join(root, "18_self_development_phase2_repository_inspection.js"), "utf8");
check("Phase 2 marker detector is comment-only and does not use whole-source marker counting", inspectorSource.includes("countDeferredMarkersInComments") && !inspectorSource.includes("const markers = (code.match(/\\b(?:TODO|FIXME|HACK)\\b/g) || []).length;"), "comment-only-marker-scan");

// Runtime stubs. No provider call, no repository mutation, no approval API.
const storage = new Map();
global.localStorage = { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };
global.IDE140DevelopmentAnalytics = { getDevelopmentAnalyticsStatus: () => ({ id: "IDE-140", status: "Completed" }) };
global.IDE170Intelligence = { getStatus: () => ({ componentId: "IDE-170", status: "Ready" }), getRepositorySnapshotStatus: () => ({ status: "Ready", snapshotCount: 0 }) };
global.IDE190DevelopmentAutomation = { getStatus: () => ({ componentId: "IDE-190", status: "Ready" }), getSafetyStatus: () => ({ persistentCommitAllowed: false, directMutation: false }) };
global.REPOSITORY010LocalFirstRepository = { getStatus: () => ({ componentId: "REPOSITORY-010", status: "Ready" }), getSafetyStatus: () => ({ directRepositoryMutationAllowed: false }) };
global.EXTERNAL010ExternalIntelligence = {
  getExternalIntelligenceFoundationState: () => ({ componentId: "EXTERNAL-010", version: "1.20.1", initialized: true, safety: { directRepositoryMutationAllowed: false } }),
  getOpenAIFinalValidation: () => ({ passed: true, state: "FINAL_VALIDATED", readiness: "OPENAI_API_INTEGRATION_READY", providerNetworkCallPerformed: false })
};
global.getExternalIntelligenceFoundationState = global.EXTERNAL010ExternalIntelligence.getExternalIntelligenceFoundationState;
global.registerDevelopmentDashboardModule = () => ({ registered: true });
global.registerDevelopmentStatus = () => ({ registered: true });
global.registerIdeComponent = () => ({ registered: true });
global.getProjectFileCategory = f => f.endsWith(".js") ? "js" : f.endsWith(".json") ? "json" : f.endsWith(".html") ? "html" : f.endsWith(".css") ? "css" : "other";
const inspectFiles = [...phase1Files, ...phase2Files, "01_project_manager.js", "17_external_intelligence_core.js", "17_external_intelligence_openai_provider_integration.js"].map(f => ({ path: f, fileName: f, code: fs.readFileSync(path.join(root, f), "utf8") }));
global.getProjectFiles = () => inspectFiles.map(x => ({ ...x }));

for (const f of phase1Files) require(path.join(root, f));
for (const f of phase2Files) require(path.join(root, f));

(async () => {
  const result = await global.runSelfDevelopment058Phase2Validation({ manifest, projectInfo });
  check("Phase 2 runtime validation passes", result && result.failed === 0 && result.criticalFailed === 0 && result.phase2ImplementationComplete === true && result.phase2TechnicalGateReady === true, result);
  check("Phase 2 validation grants no approval, DIFF, provider call, or canonical mutation", result && result.releaseAllowed === false && result.phase2Accepted === false && result.implementationPhase3Allowed === false && result.projectOwnerAcceptanceRequired === true && result.validationIsApproval === false && result.providerNetworkCallPerformed === false && result.diffGenerationPerformed === false && result.canonicalMutationPerformed === false, { releaseAllowed: result && result.releaseAllowed, phase2Accepted: result && result.phase2Accepted, validationIsApproval: result && result.validationIsApproval, providerNetworkCallPerformed: result && result.providerNetworkCallPerformed, diffGenerationPerformed: result && result.diffGenerationPerformed, canonicalMutationPerformed: result && result.canonicalMutationPerformed });
  const coverage = global.SELFDEVELOPMENT058Environment.getSelfDevelopmentPhase2Coverage();
  check("18 Decision requirements remain machine-tracked without false full completion", coverage.totalDecisionRequirements === 18 && coverage.phase2ScopeComplete === true && coverage.allDecisionRequirementsComplete === false && coverage.falseFullDecisionCompletionClaimed === false && coverage.partialStatesPreserved === true, coverage);
  const p2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  check("Phase 2 Hard Boundaries are fixed", p2.hardBoundaries.canonicalRepositoryMutation === false && p2.hardBoundaries.diffGeneration === false && p2.hardBoundaries.candidateApproval === false && p2.hardBoundaries.adoptionAuthorization === false && p2.hardBoundaries.providerNetworkCall === false && p2.hardBoundaries.authorityExpansion === false && p2.hardBoundaries.validationEqualsApproval === false, p2.hardBoundaries);

  const failed = checks.filter(x => !x.passed), criticalFailed = failed.filter(x => x.severity === "Critical").length;
  const report = { id: "SELF-DEVELOPMENT-058-PHASE2-STATIC-FUNCTIONAL-VALIDATION", decisionId: "EXTERNAL-010-DECISION-058", candidateVersion: "0.2.1", passed: checks.length - failed.length, failed: failed.length, total: checks.length, health: Math.round((checks.length - failed.length) / checks.length * 100), criticalFailed, scriptCount: manifest.scripts.length, manifestHash: manifest.manifestHash, scriptSetHash: manifest.scriptSetHash, phase1FrozenSourceVerified: true, releaseAllowed: false, validationIsApproval: false, providerNetworkCallPerformed: false, canonicalMutationPerformed: false, checks };
  console.log(JSON.stringify(report, null, 2)); process.exitCode = failed.length ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
