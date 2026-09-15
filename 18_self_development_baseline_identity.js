/* ============================================================
   FILE: 18_self_development_baseline_identity.js
   Decision 058 Phase 1 / Canonical Baseline Identity Gate
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  const VERSION_MANIFEST = global.SELFDEVELOPMENT058VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const i = namespace.__internal, s = i.state;

  function normalizeScriptPath(src) { return i.text(src, "").split("#")[0].split("?")[0].replace(/^\.\//, ""); }
  function inspectSelfDevelopmentBaselineIdentity(input) {
    const x = i.isPlainObject(input) ? input : {};
    const manifest = i.isPlainObject(x.manifest) ? x.manifest : null;
    const projectInfo = i.isPlainObject(x.projectInfo) ? x.projectInfo : null;
    const failures = [];
    if (!manifest) failures.push("manifest-missing");
    if (!projectInfo) failures.push("project-info-missing");
    const scripts = manifest && Array.isArray(manifest.scripts) ? manifest.scripts : [];
    const scriptCount = scripts.length;
    const uniqueScriptCount = new Set(scripts.map(normalizeScriptPath)).size;
    if (manifest && uniqueScriptCount !== scriptCount) failures.push("duplicate-script-entry");
    if (manifest && projectInfo) {
      if (i.text(projectInfo.scriptManifestVersion, "") !== i.text(manifest.version, "")) failures.push("manifest-version-mismatch");
      if (i.text(projectInfo.applicationReleaseVersion, "") !== i.text(manifest.applicationReleaseVersion, "")) failures.push("application-release-version-mismatch");
      if (Number(projectInfo.scriptManifestCount) !== scriptCount) failures.push("script-count-mismatch");
      if (i.text(projectInfo.scriptManifestHash, "") !== i.text(manifest.manifestHash, "")) failures.push("manifest-hash-mismatch");
      if (i.text(projectInfo.scriptSetHash, "") !== i.text(manifest.scriptSetHash, "")) failures.push("script-set-hash-mismatch");
    }
    const record = i.deepFreeze({
      baselineIdentityId: i.nextId("SELFDEV058-BASELINE"),
      identityState: failures.length ? "BASELINE_IDENTITY_CONFLICT" : "IDENTITY_CONFIRMED",
      passed: failures.length === 0,
      failures: failures,
      manifestVersion: manifest && manifest.version || null,
      applicationReleaseVersion: manifest && manifest.applicationReleaseVersion || null,
      scriptCount: scriptCount,
      manifestHash: manifest && manifest.manifestHash || null,
      scriptSetHash: manifest && manifest.scriptSetHash || null,
      projectInfoScriptCount: projectInfo && projectInfo.scriptManifestCount != null ? Number(projectInfo.scriptManifestCount) : null,
      projectInfoManifestHash: projectInfo && projectInfo.scriptManifestHash || null,
      projectInfoScriptSetHash: projectInfo && projectInfo.scriptSetHash || null,
      canonicalMutationAuthorized: false,
      authorityEffect: "none",
      createdAt: i.nowIso(),
      immutable: true
    });
    s.baselineIdentityRecords.set(record.baselineIdentityId, record); s.latestBaselineIdentityId = record.baselineIdentityId; i.touch();
    return i.buildResult(record.passed, record.passed ? "SELFDEV058_BASELINE_IDENTITY_CONFIRMED" : "SELFDEV058_BASELINE_IDENTITY_CONFLICT", record.identityState, { baselineIdentity: record });
  }

  async function loadSelfDevelopmentBaselineIdentity() {
    if (typeof global.fetch !== "function") return i.buildResult(false, "SELFDEV058_FETCH_UNAVAILABLE", "Blocked", null);
    try {
      const pair = await Promise.all([global.fetch("./00_script_manifest.json", { cache: "no-store" }), global.fetch("./project_info.json", { cache: "no-store" })]);
      if (!pair[0].ok || !pair[1].ok) return i.buildResult(false, "SELFDEV058_BASELINE_FILES_UNAVAILABLE", "Blocked", { manifestStatus: pair[0].status, projectInfoStatus: pair[1].status });
      return inspectSelfDevelopmentBaselineIdentity({ manifest: await pair[0].json(), projectInfo: await pair[1].json() });
    } catch (error) { return i.buildResult(false, "SELFDEV058_BASELINE_LOAD_FAILED", "Blocked", null, { error: { message: error && error.message ? error.message : String(error) } }); }
  }
  function getLatestSelfDevelopmentBaselineIdentity() { return s.latestBaselineIdentityId ? i.clone(s.baselineIdentityRecords.get(s.latestBaselineIdentityId)) : null; }
  Object.assign(namespace.api, { inspectSelfDevelopmentBaselineIdentity, loadSelfDevelopmentBaselineIdentity, getLatestSelfDevelopmentBaselineIdentity }); Object.assign(namespace, namespace.api);
  namespace.modules.baselineIdentity = { id: "SELF-DEVELOPMENT-058-BASELINE-IDENTITY", version: VERSION_MANIFEST.version, status: "Ready", failClosed: true, canonicalMutationAuthorized: false, loadedAt: i.nowIso() };
  global.inspectSelfDevelopment058BaselineIdentity = inspectSelfDevelopmentBaselineIdentity;
  global.loadSelfDevelopment058BaselineIdentity = loadSelfDevelopmentBaselineIdentity;
})(typeof window !== "undefined" ? window : globalThis);
