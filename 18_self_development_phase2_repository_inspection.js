/* ============================================================
   FILE: 18_self_development_phase2_repository_inspection.js
   Decision 058 Phase 2 / Read-Only Repository + Source Inspection
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  const P2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;
  const i = namespace.__internal, s = i.state;

  function fnv1a32(text) {
    let hash = 0x811c9dc5;
    const str = String(text || "");
    for (let n = 0; n < str.length; n += 1) {
      hash ^= str.charCodeAt(n);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }
  function categoryOf(path) {
    if (typeof global.getProjectFileCategory === "function") {
      try { return global.getProjectFileCategory(path); } catch (_) {}
    }
    const name = String(path || "").toLowerCase().split("?")[0];
    if (name.endsWith(".js")) return "js";
    if (name.endsWith(".html")) return "html";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".json")) return "json";
    return "other";
  }
  function normalizeFile(file) {
    const path = i.text(file && (file.path || file.fileName || file.name), "");
    const code = String(file && (file.code != null ? file.code : file.text != null ? file.text : file.content != null ? file.content : "") || "");
    return { path: path, code: code, category: categoryOf(path) };
  }
  function collectMemoryFiles() {
    try {
      if (typeof global.getProjectFiles === "function") {
        const files = global.getProjectFiles();
        if (Array.isArray(files)) return files.map(normalizeFile).filter(function (f) { return f.path; });
      }
    } catch (_) {}
    return [];
  }
  async function fetchJson(path) {
    if (typeof global.fetch !== "function") return null;
    try { const r = await global.fetch(path, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch (_) { return null; }
  }
  async function fetchText(path) {
    if (typeof global.fetch !== "function") return null;
    try { const r = await global.fetch(path, { cache: "no-store" }); return r.ok ? await r.text() : null; } catch (_) { return null; }
  }
  function selectFocusFiles(paths, maxFiles) {
    const focus = /^(18_self_development_|01_project_manager\.js$|13_intelligence_repository_|13_development_analytics\.js$|13_development_automation_version_manifest\.js$|13_local_first_repository_version_manifest\.js$|17_external_intelligence_core\.js$|17_external_intelligence_openai_provider_integration\.js$)/;
    const selected = paths.filter(function (p) { return focus.test(String(p)); });
    return selected.slice(0, Math.max(1, Number(maxFiles) || 64));
  }
  function countDeferredMarkersInComments(code) {
    const text = String(code || "");
    let n = 0, pos = 0, state = "code", quote = "", escaped = false;
    let commentText = "";
    while (pos < text.length) {
      const ch = text[pos], next = text[pos + 1] || "";
      if (state === "code") {
        if (ch === "'" || ch === '"' || ch === "`") { state = "string"; quote = ch; escaped = false; pos += 1; continue; }
        if (ch === "/" && next === "/") { state = "line-comment"; commentText = ""; pos += 2; continue; }
        if (ch === "/" && next === "*") { state = "block-comment"; commentText = ""; pos += 2; continue; }
        pos += 1; continue;
      }
      if (state === "string") {
        if (escaped) { escaped = false; pos += 1; continue; }
        if (ch === "\\") { escaped = true; pos += 1; continue; }
        if (ch === quote) { state = "code"; quote = ""; pos += 1; continue; }
        pos += 1; continue;
      }
      if (state === "line-comment") {
        if (ch === "\n" || ch === "\r") {
          n += (commentText.match(/\b(?:TODO|FIXME|HACK)\b/g) || []).length;
          state = "code"; commentText = ""; pos += 1; continue;
        }
        commentText += ch; pos += 1; continue;
      }
      if (state === "block-comment") {
        if (ch === "*" && next === "/") {
          n += (commentText.match(/\b(?:TODO|FIXME|HACK)\b/g) || []).length;
          state = "code"; commentText = ""; pos += 2; continue;
        }
        commentText += ch; pos += 1; continue;
      }
    }
    if (state === "line-comment" || state === "block-comment") n += (commentText.match(/\b(?:TODO|FIXME|HACK)\b/g) || []).length;
    return n;
  }
  function analyzeFiles(files) {
    const inventory = [];
    let todoCount = 0, largeFileCount = 0, emptyFileCount = 0;
    const digestParts = [];
    const duplicateMap = new Map();
    files.forEach(function (file) {
      const code = String(file.code || "");
      const hash = fnv1a32(code);
      const byteSize = typeof TextEncoder === "function" ? new TextEncoder().encode(code).length : code.length;
      const lineCount = code ? code.split(/\r?\n/).length : 0;
      const markers = countDeferredMarkersInComments(code);
      todoCount += markers;
      if (byteSize >= 100000) largeFileCount += 1;
      if (!code.trim()) emptyFileCount += 1;
      if (code.trim()) {
        if (!duplicateMap.has(hash)) duplicateMap.set(hash, []);
        duplicateMap.get(hash).push(file.path);
      }
      digestParts.push(file.path + ":" + hash + ":" + byteSize);
      inventory.push({ path: file.path, category: file.category, byteSize: byteSize, lineCount: lineCount, contentFingerprint: hash, markerCount: markers });
    });
    const duplicateGroups = Array.from(duplicateMap.entries()).filter(function (x) { return x[1].length > 1; }).map(function (x) { return { fingerprint: x[0], files: x[1].slice() }; });
    return {
      inspectedFileCount: files.length,
      inventory: inventory,
      summary: { todoFixmeHackCount: todoCount, largeFileCount: largeFileCount, emptyFileCount: emptyFileCount, duplicateContentGroupCount: duplicateGroups.length },
      duplicateGroups: duplicateGroups,
      sourceDigestAlgorithm: "FNV-1A-32-SUMMARY",
      sourceDigest: fnv1a32(digestParts.sort().join("\n"))
    };
  }
  function buildFindings(analysis, inventoryMeta) {
    const findings = [];
    if (!analysis.inspectedFileCount) findings.push({ findingId: "SELFDEV058-SOURCE-CONTENT-UNAVAILABLE", severity: "MAJOR", type: "SOURCE_CONTENT_UNAVAILABLE", summary: "Read-only source content was unavailable; inventory metadata only was available.", autoCandidateEligible: false });
    if (analysis.summary.emptyFileCount > 0) findings.push({ findingId: "SELFDEV058-EMPTY-SOURCE", severity: "MAJOR", type: "EMPTY_SOURCE_FILE", summary: analysis.summary.emptyFileCount + " inspected source file(s) are empty.", files: analysis.inventory.filter(function (f) { return f.byteSize === 0; }).map(function (f) { return f.path; }), autoCandidateEligible: true });
    if (analysis.summary.largeFileCount > 0) findings.push({ findingId: "SELFDEV058-LARGE-SOURCE", severity: "MEDIUM", type: "LARGE_SOURCE_FILE", summary: analysis.summary.largeFileCount + " inspected source file(s) exceed the 100KB review threshold.", files: analysis.inventory.filter(function (f) { return f.byteSize >= 100000; }).map(function (f) { return f.path; }), autoCandidateEligible: true });
    if (analysis.summary.todoFixmeHackCount > 0) findings.push({ findingId: "SELFDEV058-DEFERRED-MARKER", severity: "LOW", type: "EXPLICIT_DEFERRED_MARKER", summary: analysis.summary.todoFixmeHackCount + " TODO/FIXME/HACK marker(s) were found in inspected source.", files: analysis.inventory.filter(function (f) { return f.markerCount > 0; }).map(function (f) { return f.path; }), autoCandidateEligible: true });
    if (analysis.summary.duplicateContentGroupCount > 0) findings.push({ findingId: "SELFDEV058-DUPLICATE-CONTENT", severity: "MEDIUM", type: "DUPLICATE_SOURCE_CONTENT", summary: analysis.summary.duplicateContentGroupCount + " duplicate source-content group(s) were detected.", files: analysis.duplicateGroups.reduce(function (out, g) { return out.concat(g.files || []); }, []), autoCandidateEligible: true });
    if (inventoryMeta && inventoryMeta.inventorySource === "project_info" && Number(inventoryMeta.inventoryCount || 0) > 0 && analysis.inspectedFileCount === 0) {
      findings.push({ findingId: "SELFDEV058-INVENTORY-FALLBACK", severity: "INFO", type: "INVENTORY_FALLBACK", summary: "Project inventory is available from project_info, but source content inspection is not yet loaded in Project Manager.", autoCandidateEligible: false });
    }
    return findings;
  }
  async function inspectSelfDevelopmentRepository(input) {
    const x = i.isPlainObject(input) ? input : {};
    const baseline = x.baselineIdentity || (s.latestBaselineIdentityId ? s.baselineIdentityRecords.get(s.latestBaselineIdentityId) : null);
    if (!baseline || baseline.passed !== true) return i.buildResult(false, "SELFDEV058_CONFIRMED_BASELINE_REQUIRED", "Blocked", null);

    let memoryFiles = collectMemoryFiles();
    let inventoryPaths = memoryFiles.map(function (f) { return f.path; });
    let inventorySource = memoryFiles.length ? "project_manager" : "none";
    const projectInfo = !memoryFiles.length ? await fetchJson("./project_info.json") : null;
    if (!memoryFiles.length && projectInfo && Array.isArray(projectInfo.savedFiles)) {
      inventoryPaths = projectInfo.savedFiles.map(function (p) { return i.text(p, ""); }).filter(Boolean);
      inventorySource = "project_info";
      const selected = selectFocusFiles(inventoryPaths, x.maxFetchedFiles || 64);
      const fetched = [];
      for (const path of selected) {
        const code = await fetchText("./" + path.replace(/^\.\//, ""));
        if (typeof code === "string") fetched.push({ path: path, code: code, category: categoryOf(path) });
      }
      memoryFiles = fetched;
    }
    const analysis = analyzeFiles(memoryFiles);
    const inventoryMeta = {
      inventorySource: inventorySource,
      inventoryCount: inventoryPaths.length,
      categoryCounts: inventoryPaths.reduce(function (acc, p) { const c = categoryOf(p); acc[c] = (acc[c] || 0) + 1; return acc; }, {})
    };
    const findings = buildFindings(analysis, inventoryMeta);
    const record = i.deepFreeze({
      inspectionId: i.nextId("SELFDEV058-REPOSITORY-INSPECTION"),
      baselineIdentityId: baseline.baselineIdentityId,
      readOnly: true,
      inventorySource: inventorySource,
      inventoryCount: inventoryPaths.length,
      inspectedFileCount: analysis.inspectedFileCount,
      categoryCounts: inventoryMeta.categoryCounts,
      sourceDigestAlgorithm: analysis.sourceDigestAlgorithm,
      sourceDigest: analysis.sourceDigest,
      summary: analysis.summary,
      inspectedFiles: analysis.inventory,
      duplicateGroups: analysis.duplicateGroups,
      findings: findings,
      sourceCodePersisted: false,
      mutationApiInvoked: false,
      providerNetworkCallPerformed: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      createdAt: i.nowIso(),
      immutable: true
    });
    const evidence = i.deepFreeze({
      evidenceId: i.nextId("SELFDEV058-EVIDENCE"),
      evidenceType: "READ_ONLY_REPOSITORY_INSPECTION",
      baselineIdentityId: baseline.baselineIdentityId,
      summary: "Read-only repository/source inspection completed.",
      sourceRefs: i.unique(["PROJECT-MANAGER", "PROJECT-INFO", "IDE-170"]),
      snapshot: record,
      persistable: true,
      sourceCodePersisted: false,
      secretValuePersisted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      createdAt: i.nowIso(),
      immutable: true
    });
    s.evidence.set(evidence.evidenceId, evidence);
    s.latestRepositoryInspectionId = record.inspectionId;
    s.latestRepositoryInspectionEvidenceId = evidence.evidenceId;
    i.touch();
    if (typeof namespace.persistSelfDevelopmentPhase2Evidence === "function") namespace.persistSelfDevelopmentPhase2Evidence(evidence.evidenceId);
    return i.buildResult(true, "SELFDEV058_REPOSITORY_INSPECTION_COMPLETE", "Completed", { inspection: record, evidence: evidence });
  }

  function inspectSelfDevelopmentPhase2ExistingCapabilities() {
    const base = typeof namespace.inspectSelfDevelopmentExistingCapabilities === "function" ? namespace.inspectSelfDevelopmentExistingCapabilities() : { components: {} };
    const external = global.EXTERNAL010ExternalIntelligence || null;
    let foundation = null;
    try {
      const fn = external && (external.getExternalIntelligenceFoundationState || external.getStatus) || global.getExternalIntelligenceFoundationState;
      foundation = typeof fn === "function" ? fn.call(external || global) : null;
    } catch (error) { foundation = { status: "ERROR", message: error && error.message ? error.message : String(error) }; }
    const out = i.clone(base || {});
    out.phase2ReadOnly = true;
    out.components = out.components || {};
    out.components.external010 = { available: Boolean(external), status: foundation };
    out.providerNetworkCallPerformed = false;
    out.mutationApiInvoked = false;
    out.approvalApiInvoked = false;
    return out;
  }

  Object.assign(namespace.api, { inspectSelfDevelopmentRepository, inspectSelfDevelopmentPhase2ExistingCapabilities });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase2RepositoryInspection = { id: "SELF-DEVELOPMENT-058-PHASE2-REPOSITORY-INSPECTION", version: P2.version, status: "Ready", readOnly: true, sourceCodePersistenceAllowed: false, canonicalMutationImplemented: false, loadedAt: i.nowIso() };
  global.inspectSelfDevelopment058Repository = inspectSelfDevelopmentRepository;
})(typeof window !== "undefined" ? window : globalThis);
