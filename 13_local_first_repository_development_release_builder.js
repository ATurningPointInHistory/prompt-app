/* ============================================================
   FILE: 13_local_first_repository_development_release_builder.js
   REPOSITORY-010 Local-First Repository Coordination
   Additive Module: Development Release Package Builder 1.0.0
   Purpose: Canonical -> current PC Repository -> Release Plan + Diff ZIP
   Authority: NONE / No approval / No promotion / No source write
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  if (!namespace || !namespace.__internal) {
    console.warn("REPOSITORY-010 Development Release Builder blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = "1.0.0";
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  let buildSession = null;

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function (key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256Bytes(input) {
    if (!global.crypto || !global.crypto.subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
    let buffer = input;
    if (ArrayBuffer.isView(buffer)) buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const digest = await global.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function sha256Text(value) {
    if (typeof TextEncoder === "undefined") throw new Error("TextEncoder is unavailable.");
    return sha256Bytes(new TextEncoder().encode(String(value == null ? "" : value)).buffer);
  }

  function hashValue(value) {
    if (internal.isPlainObject(value)) return internal.text(value.sha256, "");
    return value == null ? null : internal.text(value, "");
  }

  function parseRevisionSequence(value) {
    const match = String(value || "").match(/REPOSITORY010-CANONICAL-REVISION-(\d+)$/);
    return match ? Number(match[1]) : -1;
  }

  async function latestCanonicalBaseline() {
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const valid = (Array.isArray(records) ? records : []).filter(function (record) {
      return record && record.explicitlyEstablished === true && namespace.validateContract("canonicalBaselineDescriptor", record).valid === true;
    }).sort(function (a, b) { return parseRevisionSequence(a.canonicalRevisionId) - parseRevisionSequence(b.canonicalRevisionId); });
    return valid.length ? valid[valid.length - 1] : null;
  }

  async function integrityForRevision(revisionId) {
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("integrityRecord");
    const valid = (Array.isArray(records) ? records : []).filter(function (record) {
      return record && record.revisionId === revisionId && record.integrityStatus === "verified" && namespace.validateContract("repositoryIntegrityRecord", record).valid === true;
    }).sort(function (a, b) { return String(a.hashGeneratedAt || "").localeCompare(String(b.hashGeneratedAt || "")); });
    return valid.length ? valid[valid.length - 1] : null;
  }

  async function promotionEvidenceForRevision(revisionId) {
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("baselinePromotionEvidence");
    const valid = (Array.isArray(records) ? records : []).filter(function (record) {
      return record && record.canonicalRevisionId === revisionId && record.canonicalRevisionPromoted === true && record.explicitProjectOwnerAction === true && namespace.validateContract("baselinePromotionEvidenceDescriptor", record).valid === true;
    }).sort(function (a, b) { return String(a.promotedAt || "").localeCompare(String(b.promotedAt || "")); });
    return valid.length ? valid[valid.length - 1] : null;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  }

  function fileNameSafeRevision(revisionId) {
    const match = String(revisionId || "").match(/(\d+)$/);
    return match ? match[1] : String(revisionId || "UNKNOWN").replace(/[^A-Za-z0-9_-]+/g, "_");
  }

  async function readCurrentManifest() {
    const manifestRead = await namespace.readDesktopRepositoryFileText("00_script_manifest.json");
    if (!manifestRead || manifestRead.ok !== true) throw new Error("Current 00_script_manifest.json could not be read.");
    const manifest = JSON.parse(manifestRead.data.text);
    if (!manifest || !Array.isArray(manifest.scripts) || !internal.isPlainObject(manifest.hashes)) throw new Error("Current Script Manifest is invalid.");
    return { manifest: manifest, read: manifestRead.data };
  }

  async function readProjectInfo() {
    const result = await namespace.readDesktopRepositoryFileText("project_info.json");
    if (!result || result.ok !== true) return {};
    try { return JSON.parse(result.data.text); } catch (_) { return {}; }
  }

  async function createDevelopmentReleasePackage(options) {
    const opts = internal.isPlainObject(options) ? options : {};
    try {
      if (typeof global.JSZip !== "function") throw new Error("JSZip is required.");
      if (typeof namespace.selectAndScanDesktopRepository !== "function") throw new Error("Desktop Repository scanner is unavailable.");
      if (typeof namespace.readDesktopRepositoryFileText !== "function") throw new Error("Desktop Repository read API is unavailable.");
      if (typeof namespace.getCanonicalRevisionSuggestion !== "function") throw new Error("Canonical Revision suggestion API is unavailable.");

      const baseline = await latestCanonicalBaseline();
      if (!baseline) throw new Error("Explicit Canonical Baseline is not established.");
      const baselineIntegrity = await integrityForRevision(baseline.canonicalRevisionId);
      if (!baselineIntegrity) throw new Error("Canonical Integrity Record is unavailable.");
      const baselinePromotion = await promotionEvidenceForRevision(baseline.canonicalRevisionId);
      if (!baselinePromotion || !baselinePromotion.manifestFileSha256 || !baselinePromotion.indexFileSha256) {
        throw new Error("Exact Canonical manifest/index file hashes require Baseline Promotion Evidence.");
      }

      const scanResult = await namespace.selectAndScanDesktopRepository();
      if (!scanResult || scanResult.ok !== true) return scanResult;
      const scan = scanResult.data;
      if (!scan || !scan.descriptor || scan.descriptor.nodeId !== TARGET_NODE_ID) throw new Error("Desktop Repository target node mismatch.");
      if (!scan.integrity || scan.integrity.status !== "verified" || scan.integrity.allFileHashesVerified !== true || scan.integrity.scriptSetVerified !== true || scan.integrity.manifestHashVerified !== true || scan.integrity.indexSequenceMatches !== true) {
        throw new Error("Current Desktop Repository integrity is not verified.");
      }

      const currentManifestData = await readCurrentManifest();
      const currentManifest = currentManifestData.manifest;
      const currentProjectInfo = await readProjectInfo();
      const indexRead = await namespace.readDesktopRepositoryFileText("index.html");
      if (!indexRead || indexRead.ok !== true) throw new Error("Current index.html could not be read.");

      const beforeScriptHashes = internal.isPlainObject(baselineIntegrity.fileHashes) ? baselineIntegrity.fileHashes : {};
      const afterScriptHashes = internal.isPlainObject(currentManifest.hashes) ? currentManifest.hashes : {};
      const beforeNames = Object.keys(beforeScriptHashes).sort();
      const afterNames = Object.keys(afterScriptHashes).sort();
      const allNames = Array.from(new Set(beforeNames.concat(afterNames))).sort();
      const addedFiles = [];
      const modifiedScriptFiles = [];
      const removedFiles = [];
      allNames.forEach(function (fileName) {
        const before = hashValue(beforeScriptHashes[fileName]);
        const after = hashValue(afterScriptHashes[fileName]);
        if (!before && after) addedFiles.push(fileName);
        else if (before && !after) removedFiles.push(fileName);
        else if (before && after && before !== after) modifiedScriptFiles.push(fileName);
      });

      const specialModified = [];
      if (baselinePromotion.manifestFileSha256 !== currentManifestData.read.sha256) specialModified.push("00_script_manifest.json");
      if (baselinePromotion.indexFileSha256 !== indexRead.data.sha256) specialModified.push("index.html");
      const changedFiles = Array.from(new Set(specialModified.concat(addedFiles, modifiedScriptFiles, removedFiles))).sort();
      if (!changedFiles.length) {
        return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_BUILDER_NO_CHANGES", "No Changes", {
          baseCanonicalRevisionId: baseline.canonicalRevisionId,
          currentManifestHash: scan.staticManifest.manifestHash,
          currentScriptSetHash: scan.staticManifest.scriptSetHash,
          currentScriptCount: scan.staticManifest.scriptCount,
          authorityEffect: "none"
        });
      }

      const suggestionResult = await namespace.getCanonicalRevisionSuggestion();
      const suggestedRevision = internal.text(suggestionResult && suggestionResult.data && suggestionResult.data.nextCanonicalRevisionCandidate, "");
      if (!suggestedRevision) throw new Error("Next Canonical Revision candidate is unavailable.");
      if (suggestionResult.data.lastEstablishedCanonicalRevisionId !== baseline.canonicalRevisionId) throw new Error("Canonical Revision suggestion is stale.");

      const beforeFileHashes = {};
      const expectedAfterFileHashes = {};
      changedFiles.forEach(function (fileName) {
        let before = hashValue(beforeScriptHashes[fileName]);
        if (fileName === "00_script_manifest.json") before = baselinePromotion.manifestFileSha256;
        if (fileName === "index.html") before = baselinePromotion.indexFileSha256;
        beforeFileHashes[fileName] = before || null;

        let after = hashValue(afterScriptHashes[fileName]);
        if (fileName === "00_script_manifest.json") after = currentManifestData.read.sha256;
        if (fileName === "index.html") after = indexRead.data.sha256;
        if (after) expectedAfterFileHashes[fileName] = after;
      });

      const zip = new global.JSZip();
      const zipDate = new Date("2000-01-01T00:00:00.000Z");
      for (const fileName of changedFiles) {
        if (removedFiles.indexOf(fileName) >= 0) continue;
        const read = await namespace.readDesktopRepositoryFileText(fileName);
        if (!read || read.ok !== true) throw new Error("Changed file could not be read: " + fileName);
        zip.file(fileName, read.data.text, { date: zipDate });
      }
      if (removedFiles.length) zip.file("__REPOSITORY010_REMOVED_FILES__.json", JSON.stringify({ removedFiles: removedFiles }, null, 2) + "\n", { date: zipDate });
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 }, platform: "DOS" });
      const releasePackageHash = await sha256Bytes(await zipBlob.arrayBuffer());

      const afterRepositoryStateHash = await sha256Text(stableStringify({
        projectId: scan.descriptor.projectId,
        repositoryId: scan.descriptor.repositoryId,
        nodeId: scan.descriptor.nodeId,
        baseCanonicalRevisionId: baseline.canonicalRevisionId,
        suggestedCanonicalRevisionId: suggestedRevision,
        manifestHash: scan.staticManifest.manifestHash,
        scriptSetHash: scan.staticManifest.scriptSetHash,
        scriptCount: Number(scan.staticManifest.scriptCount),
        manifestFileSha256: currentManifestData.read.sha256,
        indexFileSha256: indexRead.data.sha256,
        fileHashes: currentManifest.hashes
      }));

      const version = internal.text(opts.version,
        internal.text(currentProjectInfo.decision058CandidateVersion,
          internal.text(currentProjectInfo.version, "CURRENT")));
      const phase = Number.isFinite(Number(opts.phase)) ? Number(opts.phase) : Number(currentProjectInfo.decision058Phase || 0);
      const baseShort = fileNameSafeRevision(baseline.canonicalRevisionId);
      const nextShort = fileNameSafeRevision(suggestedRevision);
      const planId = internal.text(opts.developmentReleasePlanId, "REPOSITORY010-DEVELOPMENT-RELEASE-PLAN-" + baseShort + "-" + nextShort + "-" + Date.now());
      const plan = {
        schema: "REPOSITORY-010-DEVELOPMENT-RELEASE-PLAN",
        schemaVersion: "1.0.0",
        developmentReleasePlanId: planId,
        componentId: "REPOSITORY-010",
        phase: Number.isFinite(phase) ? phase : 0,
        version: version,
        baseCanonicalRevisionId: baseline.canonicalRevisionId,
        suggestedCanonicalRevisionId: suggestedRevision,
        projectId: scan.descriptor.projectId,
        repositoryId: scan.descriptor.repositoryId,
        targetNodeId: scan.descriptor.nodeId,
        changedFiles: changedFiles,
        addedFiles: addedFiles,
        modifiedFiles: Array.from(new Set(specialModified.concat(modifiedScriptFiles))).sort(),
        removedFiles: removedFiles,
        beforeFileHashes: beforeFileHashes,
        expectedAfterFileHashes: expectedAfterFileHashes,
        beforeManifestHash: baseline.manifestHash,
        expectedAfterManifestHash: scan.staticManifest.manifestHash,
        beforeScriptSetHash: baseline.scriptSetHash,
        expectedAfterScriptSetHash: scan.staticManifest.scriptSetHash,
        beforeScriptCount: Number(baseline.scriptCount),
        expectedAfterScriptCount: Number(scan.staticManifest.scriptCount),
        beforeRepositoryStateHash: baselineIntegrity.repositoryStateHash,
        expectedAfterRepositoryStateHash: afterRepositoryStateHash,
        expectedIndexFileHash: indexRead.data.sha256,
        releasePackageHash: releasePackageHash,
        createdAt: internal.nowIso(),
        immutable: true
      };
      plan.releasePlanHash = await sha256Text(stableStringify(plan));
      const contract = namespace.validateContract("developmentReleasePlanDescriptor", plan);
      if (!contract.valid) throw new Error("Generated Development Release Plan failed contract validation.");

      const prefix = "REPOSITORY010_CANONICAL" + baseShort + "_TO_" + nextShort;
      const planFileName = prefix + "_RELEASE_PLAN.json";
      const zipFileName = prefix + "_RELEASE_DIFF.zip";
      const planBlob = new Blob([JSON.stringify(plan, null, 2) + "\n"], { type: "application/json" });

      buildSession = {
        plan: internal.clone(plan),
        packageBlob: zipBlob,
        planBlob: planBlob,
        planFileName: planFileName,
        zipFileName: zipFileName,
        builtAgainstDirectoryName: scan.directoryName,
        builtAt: internal.nowIso(),
        verified: false
      };
      state.lastDevelopmentReleaseBuilderSession = {
        developmentReleasePlanId: plan.developmentReleasePlanId,
        baseCanonicalRevisionId: plan.baseCanonicalRevisionId,
        suggestedCanonicalRevisionId: plan.suggestedCanonicalRevisionId,
        changedFileCount: changedFiles.length,
        addedFileCount: addedFiles.length,
        modifiedFileCount: plan.modifiedFiles.length,
        removedFileCount: removedFiles.length,
        releasePlanHash: plan.releasePlanHash,
        releasePackageHash: plan.releasePackageHash,
        builtAt: buildSession.builtAt,
        authorityEffect: "none"
      };
      internal.touch();

      if (opts.download !== false) {
        downloadBlob(planBlob, planFileName);
        downloadBlob(zipBlob, zipFileName);
      }

      return internal.buildResult(true, "REPOSITORY010_DEVELOPMENT_RELEASE_PACKAGE_BUILT", "Built", {
        plan: internal.clone(plan),
        planFileName: planFileName,
        diffFileName: zipFileName,
        changedFileCount: changedFiles.length,
        addedFileCount: addedFiles.length,
        modifiedFileCount: plan.modifiedFiles.length,
        removedFileCount: removedFiles.length,
        filesDownloaded: opts.download !== false,
        readyForSessionV5Verification: true,
        approvalGranted: false,
        promotionPerformed: false,
        canonicalMutationPerformed: false,
        authorityEffect: "none"
      });
    } catch (error) {
      return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_BUILDER_FAILED", "Blocked", null, {
        error: { message: error && error.message ? error.message : String(error), category: "Development Release Builder" }
      });
    }
  }

  async function verifyBuiltDevelopmentReleaseV5() {
    if (!buildSession || !buildSession.plan || !buildSession.packageBlob) {
      return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_BUILDER_SESSION_REQUIRED", "Blocked", {
        instruction: "Create a Release Package first, or use the saved Plan + Diff verification path after reload."
      });
    }
    if (typeof namespace.scanDesktopRepositoryDirectory !== "function" || typeof namespace.verifyDevelopmentReleaseV5 !== "function") {
      return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_BUILDER_VERIFY_API_UNAVAILABLE", "Blocked", null);
    }
    const fresh = await namespace.scanDesktopRepositoryDirectory();
    if (!fresh || fresh.ok !== true) return fresh;
    const result = await namespace.verifyDevelopmentReleaseV5(buildSession.plan, buildSession.packageBlob, { desktopScanResult: fresh });
    if (result && result.ok === true) buildSession.verified = true;
    return result;
  }

  function getDevelopmentReleaseBuilderStatus() {
    return {
      status: "Ready",
      moduleVersion: MODULE_VERSION,
      additiveOnly: true,
      automaticApprovalAllowed: false,
      automaticPromotionAllowed: false,
      canonicalSourceWriteAllowed: false,
      buildSession: buildSession ? {
        developmentReleasePlanId: buildSession.plan.developmentReleasePlanId,
        baseCanonicalRevisionId: buildSession.plan.baseCanonicalRevisionId,
        suggestedCanonicalRevisionId: buildSession.plan.suggestedCanonicalRevisionId,
        planFileName: buildSession.planFileName,
        diffFileName: buildSession.zipFileName,
        builtAt: buildSession.builtAt,
        verified: buildSession.verified === true
      } : null,
      authorityEffect: "none"
    };
  }

  function injectGuidedUi() {
    const panel = global.document && document.getElementById("repository010-guided-panel");
    if (!panel || panel.querySelector('[data-operation="release-build"]')) return false;
    const updateCards = Array.from(panel.querySelectorAll(".repository010-guided-card"));
    const card = updateCards.find(function (node) { return /Development Update/.test(node.textContent || ""); });
    if (!card) return false;
    const actions = card.querySelector(".repository010-guided-actions");
    if (!actions) return false;

    const existingVerify = actions.querySelector('[data-operation="release-v5"]');
    const existingPromote = actions.querySelector('[data-operation="release-promote"]');
    if (existingVerify) existingVerify.textContent = "③ 保存済みPlan + Diffを検証";
    if (existingPromote) existingPromote.textContent = "④ UpdateをCanonicalへ昇格";

    const build = document.createElement("button");
    build.type = "button";
    build.setAttribute("data-operation", "release-build");
    build.textContent = "① Release Packageを作成";
    const verify = document.createElement("button");
    verify.type = "button";
    verify.setAttribute("data-operation", "release-built-v5");
    verify.textContent = "② 作成済みPackageをV5検証";
    actions.insertBefore(build, existingVerify || actions.firstChild);
    actions.insertBefore(verify, existingVerify || actions.firstChild);

    build.addEventListener("click", async function () {
      build.disabled = true;
      try {
        const result = await createDevelopmentReleasePackage({ download: true });
        const log = document.getElementById("repository010-guided-log");
        if (log) log.textContent = "Development Release Package Builder\n" + JSON.stringify(result, null, 2);
      } finally { build.disabled = false; }
    });
    verify.addEventListener("click", async function () {
      verify.disabled = true;
      try {
        const result = await verifyBuiltDevelopmentReleaseV5();
        const log = document.getElementById("repository010-guided-log");
        if (log) log.textContent = "Built Package V5\n" + JSON.stringify(result, null, 2);
      } finally { verify.disabled = false; }
    });
    return true;
  }

  Object.assign(namespace.api, {
    createLocalFirstRepositoryDevelopmentReleasePackage: createDevelopmentReleasePackage,
    verifyBuiltLocalFirstRepositoryDevelopmentReleaseV5: verifyBuiltDevelopmentReleaseV5,
    getLocalFirstRepositoryDevelopmentReleaseBuilderStatus: getDevelopmentReleaseBuilderStatus,
    injectLocalFirstRepositoryDevelopmentReleaseBuilderUi: injectGuidedUi
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.developmentReleaseBuilder = {
    id: "REPOSITORY-010-DEVELOPMENT-RELEASE-BUILDER",
    version: MODULE_VERSION,
    status: "Ready",
    additiveOnly: true,
    canonicalMutationAuthority: false,
    automaticApprovalAllowed: false,
    automaticPromotionAllowed: false,
    loadedAt: internal.nowIso()
  };

  if (global.document) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectGuidedUi, 0); }, { once: true });
    else setTimeout(injectGuidedUi, 0);
    setTimeout(injectGuidedUi, 500);
  }
})(typeof window !== "undefined" ? window : globalThis);
