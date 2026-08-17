/* ============================================================
   FILE: 13_local_first_repository_development_release.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.15.0 / Module: Development Release 1.0.0
   Phase 16: Evidence-Bound Development Release
   Decision-014
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Development Release blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("developmentRelease");

  if (!(state.developmentReleasePlans instanceof Map)) state.developmentReleasePlans = new Map();
  if (!(state.developmentReleaseV5Evidence instanceof Map)) state.developmentReleaseV5Evidence = new Map();
  if (!state.developmentReleaseStatus) state.developmentReleaseStatus = "Ready";

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function (key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  async function sha256Bytes(buffer) {
    if (!global.crypto || !global.crypto.subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
    const digest = await global.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }
  async function sha256Text(value) {
    if (typeof TextEncoder === "undefined") throw new Error("TextEncoder is unavailable.");
    return sha256Bytes(new TextEncoder().encode(String(value == null ? "" : value)).buffer);
  }

  function parseRevisionSequence(value) {
    const match = String(value || "").match(/REPOSITORY010-CANONICAL-REVISION-(\d+)$/);
    return match ? Number(match[1]) : -1;
  }

  async function latestCanonicalBaseline() {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const valid = (Array.isArray(list) ? list : []).filter(function (record) {
      return namespace.validateContract("canonicalBaselineDescriptor", record).valid === true && record.explicitlyEstablished === true;
    }).sort(function (a, b) { return parseRevisionSequence(a.canonicalRevisionId) - parseRevisionSequence(b.canonicalRevisionId); });
    return valid.length ? valid[valid.length - 1] : null;
  }

  async function canonicalIntegrityForRevision(revisionId) {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords("integrityRecord");
    const matches = (Array.isArray(list) ? list : []).filter(function (record) {
      return record && record.revisionId === revisionId && record.integrityStatus === "verified" && namespace.validateContract("repositoryIntegrityRecord", record).valid === true;
    }).sort(function (a, b) { return String(a.hashGeneratedAt || "").localeCompare(String(b.hashGeneratedAt || "")); });
    return matches.length ? matches[matches.length - 1] : null;
  }

  function hashValue(value) {
    if (internal.isPlainObject(value)) return internal.text(value.sha256, "");
    return value == null ? null : internal.text(value, "");
  }

  async function promotionEvidenceForRevision(revisionId) {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords("baselinePromotionEvidence");
    const matches = (Array.isArray(list) ? list : []).filter(function (record) {
      return record && record.canonicalRevisionId === revisionId && record.canonicalRevisionPromoted === true && record.explicitProjectOwnerAction === true && namespace.validateContract("baselinePromotionEvidenceDescriptor", record).valid === true;
    }).sort(function (a, b) { return String(a.promotedAt || "").localeCompare(String(b.promotedAt || "")); });
    return matches.length ? matches[matches.length - 1] : null;
  }

  async function persistPlan(plan) {
    const validation = namespace.validateContract("developmentReleasePlanDescriptor", plan);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_PLAN_INVALID", "Blocked", { validation: validation, plan: plan });
    const saved = await namespace.persistLocalFirstRepositoryRecord("developmentReleasePlan", plan);
    if (!saved || saved.ok !== true) return saved;
    state.developmentReleasePlans.set(plan.developmentReleasePlanId, internal.deepFreeze(internal.clone(plan)));
    return internal.buildResult(true, "REPOSITORY010_DEVELOPMENT_RELEASE_PLAN_PERSISTED", "Ready", { plan: internal.clone(plan), validation: validation });
  }

  async function verifyPlanHash(plan) {
    const source = internal.clone(plan || {});
    const expected = source.releasePlanHash;
    delete source.releasePlanHash;
    const calculated = await sha256Text(stableStringify(source));
    return { valid: typeof expected === "string" && expected === calculated, expected: expected || null, calculated: calculated };
  }

  async function hashFile(file) {
    return sha256Bytes(await file.arrayBuffer());
  }

  async function verifyDevelopmentReleaseV5(planInput, packageFile, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const plan = internal.isPlainObject(planInput) ? internal.clone(planInput) : null;
    if (!plan) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_PLAN_REQUIRED", "Blocked", null);

    const contract = namespace.validateContract("developmentReleasePlanDescriptor", plan);
    if (!contract.valid) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_PLAN_INVALID", "Blocked", { validation: contract });
    const planHash = await verifyPlanHash(plan);
    if (!planHash.valid) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_PLAN_HASH_MISMATCH", "Blocked", planHash);

    const baseline = await latestCanonicalBaseline();
    if (!baseline || baseline.canonicalRevisionId !== plan.baseCanonicalRevisionId) {
      return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_BASELINE_MISMATCH", "Blocked", { expectedBaseRevisionId: plan.baseCanonicalRevisionId, currentCanonicalRevisionId: baseline && baseline.canonicalRevisionId || null });
    }
    const baselineIntegrity = await canonicalIntegrityForRevision(baseline.canonicalRevisionId);
    if (!baselineIntegrity) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_BASELINE_INTEGRITY_REQUIRED", "Blocked", { canonicalRevisionId: baseline.canonicalRevisionId });
    const baselinePromotionEvidence = await promotionEvidenceForRevision(baseline.canonicalRevisionId);
    const beforeHashChecks = [];
    const beforeFileHashes = internal.isPlainObject(plan.beforeFileHashes) ? plan.beforeFileHashes : {};
    Object.keys(beforeFileHashes).sort().forEach(function (fileName) {
      const expectedHash = hashValue(beforeFileHashes[fileName]);
      let actualHash = hashValue(baselineIntegrity.fileHashes && baselineIntegrity.fileHashes[fileName]);
      let anchor = "canonical-integrity-file-hash";
      if (fileName === "index.html") { actualHash = internal.text(baselineIntegrity.contentHash, ""); anchor = "canonical-integrity-content-hash"; }
      if (fileName === "00_script_manifest.json") {
        actualHash = internal.text(baselinePromotionEvidence && baselinePromotionEvidence.manifestFileSha256, "");
        anchor = actualHash ? "baseline-promotion-exact-manifest-file-hash" : "legacy-baseline-semantic-manifest-hash";
      }
      const legacyManifestFallback = fileName === "00_script_manifest.json" && !actualHash && baseline.manifestHash === plan.beforeManifestHash;
      beforeHashChecks.push({ file: fileName, expectedSha256: expectedHash, canonicalSha256: actualHash || null, anchor: anchor, passed: legacyManifestFallback || (expectedHash ? actualHash === expectedHash : !actualHash) });
    });
    const beforeFileHashesMatch = beforeHashChecks.every(function (item) { return item.passed; });
    const beforeMatches = baseline.manifestHash === plan.beforeManifestHash && baseline.scriptSetHash === plan.beforeScriptSetHash && Number(baseline.scriptCount) === Number(plan.beforeScriptCount) && baselineIntegrity.repositoryStateHash === plan.beforeRepositoryStateHash && beforeFileHashesMatch;
    if (!beforeMatches) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_BEFORE_STATE_MISMATCH", "Blocked", { baseline: baseline, baselineIntegrity: baselineIntegrity, beforeFileHashesMatch: beforeFileHashesMatch, beforeHashChecks: beforeHashChecks, planBefore: { manifestHash: plan.beforeManifestHash, scriptSetHash: plan.beforeScriptSetHash, scriptCount: plan.beforeScriptCount, repositoryStateHash: plan.beforeRepositoryStateHash } });

    let packageHashVerified = false;
    let actualPackageHash = null;
    if (packageFile && typeof packageFile.arrayBuffer === "function") {
      actualPackageHash = await hashFile(packageFile);
      packageHashVerified = actualPackageHash === plan.releasePackageHash;
    } else if (opts.allowMissingPackageFile === true) {
      packageHashVerified = false;
    } else {
      return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_PACKAGE_REQUIRED", "Blocked", { expectedReleasePackageHash: plan.releasePackageHash });
    }
    if (!packageHashVerified && opts.allowMissingPackageFile !== true) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_PACKAGE_HASH_MISMATCH", "Blocked", { expected: plan.releasePackageHash, actual: actualPackageHash });

    let scanResult = opts.desktopScanResult;
    if (!scanResult) {
      if (typeof namespace.selectAndScanDesktopRepository !== "function") return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_DESKTOP_SCAN_API_UNAVAILABLE", "Blocked", null);
      scanResult = await namespace.selectAndScanDesktopRepository();
    }
    if (!scanResult || scanResult.ok !== true) return scanResult || internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_SCAN_FAILED", "Blocked", null);
    const scan = scanResult.data;
    const manifestMatch = scan.staticManifest && scan.staticManifest.manifestHash === plan.expectedAfterManifestHash;
    const scriptSetMatch = scan.staticManifest && scan.staticManifest.scriptSetHash === plan.expectedAfterScriptSetHash;
    const scriptCountMatch = scan.staticManifest && Number(scan.staticManifest.scriptCount) === Number(plan.expectedAfterScriptCount);
    const integrityVerified = Boolean(scan.integrity && scan.integrity.status === "verified" && scan.integrity.allFileHashesVerified === true && scan.integrity.scriptSetVerified === true && scan.integrity.manifestHashVerified === true && scan.integrity.indexSequenceMatches === true);

    const actualChangedFileHashes = {};
    const fileHashChecks = [];
    const expectedAfter = internal.isPlainObject(plan.expectedAfterFileHashes) ? plan.expectedAfterFileHashes : {};
    for (const fileName of Object.keys(expectedAfter).sort()) {
      const read = await namespace.readDesktopRepositoryFileText(fileName);
      const expectedHash = internal.isPlainObject(expectedAfter[fileName]) ? expectedAfter[fileName].sha256 : expectedAfter[fileName];
      const actualHash = read && read.ok === true ? read.data.sha256 : null;
      actualChangedFileHashes[fileName] = actualHash;
      fileHashChecks.push({ file: fileName, expectedSha256: expectedHash || null, actualSha256: actualHash, passed: Boolean(read && read.ok === true && actualHash === expectedHash) });
    }
    const changedFilesMatched = fileHashChecks.length === Object.keys(expectedAfter).length && fileHashChecks.every(function (item) { return item.passed; });

    const indexRead = await namespace.readDesktopRepositoryFileText("index.html");
    const indexHashMatch = Boolean(indexRead && indexRead.ok === true && indexRead.data.sha256 === plan.expectedIndexFileHash);
    const fullRepositoryIntegrityVerified = manifestMatch && scriptSetMatch && scriptCountMatch && integrityVerified && changedFilesMatched && indexHashMatch;
    if (!fullRepositoryIntegrityVerified) {
      state.developmentReleaseStatus = "Blocked";
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_V5_BLOCKED", "Blocked", {
        manifestMatch: manifestMatch,
        scriptSetMatch: scriptSetMatch,
        scriptCountMatch: scriptCountMatch,
        integrityVerified: integrityVerified,
        changedFilesMatched: changedFilesMatched,
        indexHashMatch: indexHashMatch,
        fileHashChecks: fileHashChecks,
        unexpectedFileDifferenceDetected: !changedFilesMatched || !manifestMatch || !scriptSetMatch || !scriptCountMatch
      });
    }

    const persistedPlan = await persistPlan(plan);
    if (!persistedPlan || persistedPlan.ok !== true) return persistedPlan;

    const evidence = {
      developmentReleaseV5EvidenceId: internal.text(opts.developmentReleaseV5EvidenceId, internal.nextId("REPOSITORY010-DEVELOPMENT-RELEASE-V5")),
      developmentReleasePlanId: plan.developmentReleasePlanId,
      baseCanonicalRevisionId: plan.baseCanonicalRevisionId,
      suggestedCanonicalRevisionId: plan.suggestedCanonicalRevisionId,
      projectId: plan.projectId,
      repositoryId: plan.repositoryId,
      targetNodeId: plan.targetNodeId,
      directoryName: scan.directoryName,
      releasePlanHash: plan.releasePlanHash,
      releasePackageHash: plan.releasePackageHash,
      actualReleasePackageHash: actualPackageHash,
      releasePackageHashVerified: packageHashVerified,
      actualManifestHash: scan.staticManifest.manifestHash,
      actualScriptSetHash: scan.staticManifest.scriptSetHash,
      actualScriptCount: scan.staticManifest.scriptCount,
      actualFileHashes: actualChangedFileHashes,
      indexFileSha256: indexRead.data.sha256,
      repositoryStateHash: plan.expectedAfterRepositoryStateHash,
      freshReadOnlyScanPassed: true,
      fullRepositoryIntegrityVerified: true,
      releasePlanMatched: true,
      unexpectedFileDifferenceDetected: false,
      developmentReleaseV5Passed: true,
      canonicalSourceFilesWrittenByEngine: false,
      canonicalMutationPerformedByEngine: false,
      automaticAcceptancePerformed: false,
      automaticPromotionPerformed: false,
      syncEngineInvoked: false,
      githubReflectionPerformed: false,
      authorityEffect: "none",
      createdAt: internal.nowIso(),
      immutable: true
    };
    const evidenceValidation = namespace.validateContract("developmentReleaseV5EvidenceDescriptor", evidence);
    if (!evidenceValidation.valid) return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_V5_CONTRACT_INVALID", "Blocked", { evidence: evidence, validation: evidenceValidation });
    const savedEvidence = await namespace.persistLocalFirstRepositoryRecord("developmentReleaseV5Evidence", evidence);
    if (!savedEvidence || savedEvidence.ok !== true) return savedEvidence;
    state.developmentReleaseV5Evidence.set(evidence.developmentReleaseV5EvidenceId, internal.deepFreeze(internal.clone(evidence)));
    state.lastDevelopmentReleaseV5EvidenceId = evidence.developmentReleaseV5EvidenceId;
    state.developmentReleaseStatus = "V5 Verified";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_DEVELOPMENT_RELEASE_V5_VERIFIED", "V5 Verified", {
      developmentReleasePlan: plan,
      developmentReleaseV5Evidence: evidence,
      releasePlanHashVerified: true,
      releasePackageHashVerified: packageHashVerified,
      fullRepositoryIntegrityVerified: true,
      baselinePromotionAllowedAutomatically: false,
      projectOwnerExplicitPromotionRequired: true,
      canonicalMutationPerformed: false,
      authorityEffect: "none"
    });
  }

  async function pickSingleFile(types) {
    if (typeof global.showOpenFilePicker !== "function") throw new Error("File picker is unavailable.");
    const handles = await global.showOpenFilePicker({ multiple: false, types: types || undefined });
    if (!handles || !handles.length) throw new Error("No file was selected.");
    return handles[0].getFile();
  }

  async function selectAndVerifyDevelopmentReleaseV5() {
    try {
      const planFile = await pickSingleFile([{ description: "Development Release Plan", accept: { "application/json": [".json"] } }]);
      const plan = JSON.parse(await planFile.text());
      const packageFile = await pickSingleFile([{ description: "Development Release Diff ZIP", accept: { "application/zip": [".zip"] } }]);
      return verifyDevelopmentReleaseV5(plan, packageFile, {});
    } catch (error) {
      if (error && error.name === "AbortError") return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_SELECTION_CANCELLED", "Cancelled", null);
      return internal.buildResult(false, "REPOSITORY010_DEVELOPMENT_RELEASE_SELECTION_FAILED", "Blocked", null, { error: { message: error && error.message ? error.message : String(error), category: "Development Release" } });
    }
  }

  async function restoreDevelopmentReleaseRecords() {
    const plans = await namespace.listPersistedLocalFirstRepositoryRecords("developmentReleasePlan");
    const evidence = await namespace.listPersistedLocalFirstRepositoryRecords("developmentReleaseV5Evidence");
    state.developmentReleasePlans.clear();
    state.developmentReleaseV5Evidence.clear();
    (Array.isArray(plans) ? plans : []).forEach(function (record) { if (namespace.validateContract("developmentReleasePlanDescriptor", record).valid) state.developmentReleasePlans.set(record.developmentReleasePlanId, internal.deepFreeze(internal.clone(record))); });
    (Array.isArray(evidence) ? evidence : []).forEach(function (record) { if (namespace.validateContract("developmentReleaseV5EvidenceDescriptor", record).valid) state.developmentReleaseV5Evidence.set(record.developmentReleaseV5EvidenceId, internal.deepFreeze(internal.clone(record))); });
    return internal.buildResult(true, "REPOSITORY010_DEVELOPMENT_RELEASE_RECORDS_RESTORED", "Ready", { planCount: state.developmentReleasePlans.size, v5EvidenceCount: state.developmentReleaseV5Evidence.size, reloadRecoveryVerified: true });
  }

  function getDevelopmentReleaseStatus() {
    return {
      status: state.developmentReleaseStatus || "Ready",
      phase: 16,
      moduleVersion: MODULE_VERSION,
      decisionId: "REPOSITORY-010-DECISION-014",
      developmentReleasePlanImplemented: true,
      developmentReleaseV5Implemented: true,
      baselineDriftPreventionImplemented: true,
      developmentReleaseGrantsAuthority: false,
      developmentReleaseV5GrantsAuthority: false,
      automaticSourceWrite: false,
      automaticPromotionAllowed: false,
      runtimePlanCount: state.developmentReleasePlans.size,
      runtimeV5EvidenceCount: state.developmentReleaseV5Evidence.size,
      lastDevelopmentReleaseV5EvidenceId: state.lastDevelopmentReleaseV5EvidenceId || null
    };
  }

  Object.assign(namespace.api, {
    verifyLocalFirstRepositoryDevelopmentReleaseV5: verifyDevelopmentReleaseV5,
    selectAndVerifyLocalFirstRepositoryDevelopmentReleaseV5: selectAndVerifyDevelopmentReleaseV5,
    restoreLocalFirstRepositoryDevelopmentReleaseRecords: restoreDevelopmentReleaseRecords,
    getLocalFirstRepositoryDevelopmentReleaseStatus: getDevelopmentReleaseStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.developmentRelease = {
    id: "REPOSITORY-010-DEVELOPMENT-RELEASE",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 16,
    decisionId: "REPOSITORY-010-DECISION-014",
    developmentReleaseV5Implemented: true,
    automaticSourceWrite: false,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
