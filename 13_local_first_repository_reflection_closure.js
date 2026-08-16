/* ============================================================
   FILE: 13_local_first_repository_reflection_closure.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.12.0 / Module: Reflection Integrity Closure 1.0.0
   Phase 13: System-Generated Reflection Integrity Closure
   Decision-008: deterministic closure for accepted function-patch only
   Read-only planning: this module never writes Repository files.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Reflection Closure blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("reflectionClosure");
  const MANIFEST_FILE = "00_script_manifest.json";
  const INDEX_FILE = "index.html";

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function each(key) { output[key] = stableValue(value[key]); });
    return output;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256(input) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") throw new Error("WebCrypto SHA-256 is required for Reflection Closure.");
    const bytes = new TextEncoder().encode(String(input == null ? "" : input));
    const digest = await global.crypto.subtle.digest("SHA-256", bytes.buffer);
    return Array.from(new Uint8Array(digest)).map(function hex(v) { return v.toString(16).padStart(2, "0"); }).join("");
  }

  function byteSize(text) { return new TextEncoder().encode(String(text == null ? "" : text)).byteLength; }
  function normalizeScriptPath(src) { return String(src || "").split("?")[0].split("#")[0].replace(/^\.\//, ""); }
  function replaceScriptCacheKey(src, cacheKey) {
    const raw = String(src || "");
    const base = raw.split("?")[0].split("#")[0];
    const prefix = /^\.\//.test(base) ? "" : "./";
    return prefix + normalizeScriptPath(base) + "?h=" + cacheKey;
  }
  function manifestHashPayload(manifest) {
    const value = JSON.parse(JSON.stringify(manifest || {}));
    delete value.manifestHash;
    delete value.updatedAt;
    return value;
  }
  function manifestScriptSetPayload(manifest) {
    const hashes = manifest && manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};
    return (manifest && Array.isArray(manifest.scripts) ? manifest.scripts : []).map(function map(src) {
      const path = normalizeScriptPath(src);
      const item = hashes[path] || {};
      return path + ":" + String(item.sha256 || "");
    }).join("\n");
  }
  function replaceIndexCacheKey(indexHtml, targetFile, cacheKey) {
    const target = normalizeScriptPath(targetFile);
    let count = 0;
    const output = String(indexHtml || "").replace(/(<script\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*><\/script>)/gi, function replace(all, open, src, close) {
      if (normalizeScriptPath(src) !== target) return all;
      count += 1;
      return open + replaceScriptCacheKey(src, cacheKey) + close;
    });
    return { source: output, matchCount: count };
  }
  function fail(code, message, data) {
    state.reflectionClosureStatus = "Blocked";
    state.lastReflectionClosureError = { message: String(message || code), at: internal.nowIso() };
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(state.lastReflectionClosureError) });
  }

  async function deriveReflectionIntegrityClosure(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const mutationPackage = source.mutationPackage || null;
    const mutation = source.mutation || (mutationPackage && Array.isArray(mutationPackage.mutationSet) ? mutationPackage.mutationSet[0] : null);
    const beforeManifestSource = typeof source.beforeManifestSource === "string" ? source.beforeManifestSource : "";
    const beforeIndexSource = typeof source.beforeIndexSource === "string" ? source.beforeIndexSource : "";
    const afterFileSource = typeof source.afterFileSource === "string" ? source.afterFileSource : "";
    if (!mutationPackage || !mutation || mutation.mutationType !== "function-patch") return fail("REPOSITORY010_PHASE13_FUNCTION_PATCH_REQUIRED", "Phase 13 Reflection Closure accepts exactly one function-patch mutation.");
    if (!Array.isArray(mutationPackage.mutationSet) || mutationPackage.mutationSet.length !== 1) return fail("REPOSITORY010_PHASE13_SINGLE_MUTATION_REQUIRED", "Phase 13 requires exactly one accepted mutation.");
    if (!beforeManifestSource || !beforeIndexSource || !afterFileSource) return fail("REPOSITORY010_PHASE13_CLOSURE_SOURCE_REQUIRED", "Manifest, index.html, and virtual After File source are required.");

    let manifest;
    try { manifest = JSON.parse(beforeManifestSource); } catch (error) { return fail("REPOSITORY010_PHASE13_MANIFEST_PARSE_FAILED", error.message); }
    if (!Array.isArray(manifest.scripts) || !manifest.hashes || typeof manifest.hashes !== "object") return fail("REPOSITORY010_PHASE13_MANIFEST_INVALID", "Static Script Manifest structure is invalid.");

    const targetFile = normalizeScriptPath(mutation.targetFile);
    const targetIndexes = [];
    manifest.scripts.forEach(function each(src, index) { if (normalizeScriptPath(src) === targetFile) targetIndexes.push(index); });
    if (targetIndexes.length !== 1 || !manifest.hashes[targetFile]) return fail("REPOSITORY010_PHASE13_MANIFEST_TARGET_AMBIGUOUS", "Accepted target must exist exactly once in Static Script Manifest.", { targetFile: targetFile, matchCount: targetIndexes.length });

    const beforeManifestHash = String(manifest.manifestHash || "");
    const beforeScriptSetHash = String(manifest.scriptSetHash || "");
    const beforeCacheKey = String(manifest.hashes[targetFile].cacheKey || "");
    const beforeManifestFileSha256 = await sha256(beforeManifestSource);
    const beforeIndexFileSha256 = await sha256(beforeIndexSource);
    const afterFileSha256 = await sha256(afterFileSource);
    if (mutation.afterFileSha256 && afterFileSha256 !== mutation.afterFileSha256) return fail("REPOSITORY010_PHASE13_AFTER_FILE_HASH_MISMATCH", "Virtual After File SHA-256 differs from accepted Mutation Package.", { expected: mutation.afterFileSha256, actual: afterFileSha256 });

    const cacheKeyLength = Number(manifest.cacheKeyLength) > 0 ? Number(manifest.cacheKeyLength) : 12;
    const expectedAfterCacheKey = afterFileSha256.slice(0, cacheKeyLength);
    manifest.hashes[targetFile] = {
      sha256: afterFileSha256,
      byteSize: byteSize(afterFileSource),
      cacheKey: expectedAfterCacheKey
    };
    manifest.scripts[targetIndexes[0]] = replaceScriptCacheKey(manifest.scripts[targetIndexes[0]], expectedAfterCacheKey);
    manifest.scriptSetHash = await sha256(manifestScriptSetPayload(manifest));
    manifest.manifestHash = await sha256(stableStringify(manifestHashPayload(manifest)));
    const afterManifestSource = JSON.stringify(manifest, null, 2) + "\n";
    const afterManifestFileSha256 = await sha256(afterManifestSource);

    const indexUpdate = replaceIndexCacheKey(beforeIndexSource, targetFile, expectedAfterCacheKey);
    if (indexUpdate.matchCount !== 1) return fail("REPOSITORY010_PHASE13_INDEX_TARGET_AMBIGUOUS", "Accepted target script must exist exactly once in index.html.", { targetFile: targetFile, matchCount: indexUpdate.matchCount });
    const afterIndexSource = indexUpdate.source;
    const afterIndexFileSha256 = await sha256(afterIndexSource);

    const planCore = {
      mutationPackageId: mutationPackage.mutationPackageId,
      mutationPackageHash: mutationPackage.mutationPackageHash || null,
      mutationId: mutation.mutationId,
      targetFile: targetFile,
      targetFunction: mutation.targetFunction,
      beforeFunctionSha256: mutation.beforeSha256,
      afterFunctionSha256: mutation.afterSha256,
      beforeFileSha256: mutation.beforeFileSha256,
      afterFileSha256: afterFileSha256,
      beforeManifestHash: beforeManifestHash,
      expectedAfterManifestHash: manifest.manifestHash,
      beforeScriptSetHash: beforeScriptSetHash,
      expectedAfterScriptSetHash: manifest.scriptSetHash,
      beforeCacheKey: beforeCacheKey,
      expectedAfterCacheKey: expectedAfterCacheKey,
      indexTargetReference: "./" + targetFile + "?h=" + expectedAfterCacheKey,
      closureTargetFiles: [targetFile, MANIFEST_FILE, INDEX_FILE],
      beforeManifestFileSha256: beforeManifestFileSha256,
      afterManifestFileSha256: afterManifestFileSha256,
      beforeIndexFileSha256: beforeIndexFileSha256,
      afterIndexFileSha256: afterIndexFileSha256,
      generatedAt: internal.nowIso(),
      immutable: true
    };
    const closurePlanHash = await sha256(stableStringify(planCore));
    const plan = Object.assign({ closurePlanId: internal.nextId("REPOSITORY010-REFLECTION-CLOSURE") }, planCore, { closurePlanHash: closurePlanHash });
    state.lastReflectionClosurePlan = internal.clone(plan);
    state.lastReflectionClosureMaterial = {
      closurePlanId: plan.closurePlanId,
      afterManifestSource: afterManifestSource,
      afterIndexSource: afterIndexSource
    };
    state.reflectionClosureStatus = "Prepared";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_REFLECTION_CLOSURE_PREPARED", "Prepared", {
      closurePlan: internal.clone(plan),
      afterManifestSource: afterManifestSource,
      afterIndexSource: afterIndexSource,
      applicationLogicChangedByClosure: false,
      arbitraryManifestEditAllowed: false,
      arbitraryIndexEditAllowed: false,
      directRepositoryMutationPerformed: false
    });
  }

  function getReflectionIntegrityClosureStatus() {
    return {
      status: state.reflectionClosureStatus || "Ready",
      phase: 13,
      moduleVersion: MODULE_VERSION,
      decisionId: "REPOSITORY-010-DECISION-008",
      acceptedMutationTypes: ["function-patch"],
      closureFiles: [MANIFEST_FILE, INDEX_FILE],
      deterministicOnly: true,
      timestampWinnerUsed: false,
      authorityScoringUsed: false,
      trustScoringUsed: false,
      conflictScoringUsed: false,
      directRepositoryMutationAllowed: false,
      lastPlan: internal.clone(state.lastReflectionClosurePlan || null)
    };
  }

  internal.phase13ReflectionClosure = {
    sha256: sha256,
    stableStringify: stableStringify,
    normalizeScriptPath: normalizeScriptPath,
    manifestHashPayload: manifestHashPayload,
    manifestScriptSetPayload: manifestScriptSetPayload,
    replaceIndexCacheKey: replaceIndexCacheKey
  };

  Object.assign(namespace.api, {
    deriveReflectionIntegrityClosure: deriveReflectionIntegrityClosure,
    getReflectionIntegrityClosureStatus: getReflectionIntegrityClosureStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.reflectionClosure = {
    id: "REPOSITORY-010-REFLECTION-INTEGRITY-CLOSURE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 13,
    readOnlyPlanning: true,
    deterministicClosure: true,
    functionPatchOnly: true,
    directRepositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
