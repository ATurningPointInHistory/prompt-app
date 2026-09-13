/* ============================================================
   FILE: 17_external_intelligence_cross_platform_final_gate.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.20.1
   HF13: Cross-Platform Package Identity / Final Gate Evidence
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("crossPlatformFinalGate") || VM.release.version;
  const HASH64 = /^[a-f0-9]{64}$/i;

  if (!(state.crossPlatformFinalGateEvidence instanceof Map)) state.crossPlatformFinalGateEvidence = new Map();
  if (!state.crossPlatformRuntimeId) state.crossPlatformRuntimeId = internal.nextId("EXTERNAL-010-RUNTIME");

  function detectRuntimeType() {
    const ua = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
    if (/Android/i.test(ua)) return "ANDROID";
    if (/Windows NT|Macintosh|X11|CrOS|Linux x86_64/i.test(ua)) return "PC";
    return "OTHER";
  }

  function runtimeProvenance() {
    const ua = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
    let origin = null;
    try { origin = global.location && global.location.origin ? String(global.location.origin) : null; } catch (_) {}
    return {
      runtimeId: state.crossPlatformRuntimeId,
      runtimeType: detectRuntimeType(),
      userAgent: ua,
      origin: origin,
      capturedAt: internal.nowIso(),
      canonicalSourceOfTruth: false,
      immutable: true
    };
  }

  async function loadCurrentStaticManifest() {
    if (typeof global.fetch !== "function") throw new Error("Static Manifest fetch is unavailable.");
    const response = await global.fetch("./00_script_manifest.json?crossPlatformGate=" + Date.now(), { cache: "no-store" });
    if (!response || response.ok !== true) throw new Error("Static Manifest fetch failed: " + (response && response.status));
    const manifest = await response.json();
    if (!manifest || manifest.applicationReleaseVersion !== VM.release.version) throw new Error("Static Manifest release version mismatch.");
    if (!HASH64.test(String(manifest.manifestHash || "")) || !HASH64.test(String(manifest.scriptSetHash || ""))) throw new Error("Static Manifest identity is invalid.");
    return manifest;
  }

  function buildPackageIdentityFromManifest(manifest) {
    const manifestHash = String(manifest.manifestHash || "");
    const scriptSetHash = String(manifest.scriptSetHash || "");
    return internal.deepFreeze({
      componentId: "EXTERNAL-010",
      packageId: "AI-PROMPT-OS-EXTERNAL-010-" + VM.release.version + "-" + manifestHash.slice(0, 16),
      version: VM.release.version,
      parentVersion: VM.release.parentVersion || null,
      manifestHash: manifestHash,
      scriptSetHash: scriptSetHash,
      scriptCount: Array.isArray(manifest.scripts) ? manifest.scripts.length : 0,
      packageCreatedAt: manifest.updatedAt || null,
      createdByRuntime: "BUILD_ENVIRONMENT",
      sourceOfTruth: "REPOSITORY_OR_VALIDATED_PACKAGE",
      volatileRuntimeMemoryIsCanonical: false,
      immutable: true
    });
  }

  async function getExternalIntelligenceCrossPlatformPackageIdentity() {
    return buildPackageIdentityFromManifest(await loadCurrentStaticManifest());
  }

  function summarizeValidation(validation) {
    if (!validation || typeof validation !== "object") return null;
    return {
      validationId: validation.id || null,
      status: validation.status || null,
      passed: Number(validation.passed || 0),
      failed: Number(validation.failed || 0),
      total: Number(validation.total || 0),
      health: Number(validation.health || 0),
      criticalFailed: Number(validation.criticalFailed || 0),
      validatedAt: validation.validatedAt || null,
      immutable: validation.immutable === true
    };
  }

  function validationMatchesPlatform(platform, validation) {
    const id = String(validation && validation.id || "");
    if (platform === "PC") return /^EXTERNAL-010-PHASE21-PC-REAL-RUNTIME-/i.test(id) && Number(validation.total) === 10;
    if (platform === "ANDROID") return /^EXTERNAL-010-PHASE21-ANDROID-REAL-DEVICE-/i.test(id) && Number(validation.total) === 9;
    return false;
  }

  function createEvidence(platform, validation, packageIdentity, provenance) {
    const validPlatform = platform === "PC" || platform === "ANDROID";
    const validationPassed = Boolean(validation && Number(validation.failed) === 0 && Number(validation.criticalFailed) === 0 && validationMatchesPlatform(platform, validation));
    return internal.deepFreeze({
      evidenceId: internal.nextId("EXTERNAL-010-CROSS-PLATFORM-" + platform + "-EVIDENCE"),
      evidenceType: "CROSS_PLATFORM_RUNTIME_VALIDATION",
      componentId: "EXTERNAL-010",
      platform: platform,
      packageIdentity: internal.clone(packageIdentity),
      runtimeProvenance: internal.clone(provenance),
      validation: summarizeValidation(validation),
      platformRecognized: validPlatform,
      validationPassed: validationPassed,
      packageBaselineCaptured: Boolean(packageIdentity && HASH64.test(String(packageIdentity.manifestHash || "")) && HASH64.test(String(packageIdentity.scriptSetHash || ""))),
      approvalGranted: false,
      authorityGranted: false,
      canonicalRepositoryMutationPerformed: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
  }

  function registerExternalIntelligenceCrossPlatformGateEvidence(evidence) {
    const record = internal.clone(evidence || {});
    const platform = String(record.platform || "").toUpperCase();
    const identity = record.packageIdentity || {};
    const validation = record.validation || {};
    const platformValidation = { id: validation.validationId || validation.id || "", total: Number(validation.total || 0) };
    const acceptable = (platform === "PC" || platform === "ANDROID") &&
      HASH64.test(String(identity.manifestHash || "")) && HASH64.test(String(identity.scriptSetHash || "")) &&
      String(identity.packageId || "").length > 0 && String(identity.version || "").length > 0 &&
      record.validationPassed === true && Number(validation.failed || 0) === 0 && Number(validation.criticalFailed || 0) === 0 &&
      validationMatchesPlatform(platform, platformValidation) && record.immutable === true;
    if (!acceptable) return internal.buildResult(false, "EXTERNAL010_CROSS_PLATFORM_EVIDENCE_INVALID", "Blocked", { platform: platform });
    state.crossPlatformFinalGateEvidence.set(platform, internal.deepFreeze(record));
    return internal.buildResult(true, "EXTERNAL010_CROSS_PLATFORM_EVIDENCE_REGISTERED", "Ready", { platform: platform, evidenceId: record.evidenceId || null, packageId: identity.packageId });
  }

  function evidenceMatchesIdentity(evidence, identity) {
    const p = evidence && evidence.packageIdentity || {};
    return Boolean(evidence && evidence.validationPassed === true &&
      p.version === identity.version && p.packageId === identity.packageId &&
      p.manifestHash === identity.manifestHash && p.scriptSetHash === identity.scriptSetHash);
  }

  function samePackage(left, right) {
    const a = left && left.packageIdentity || {}, b = right && right.packageIdentity || {};
    return Boolean(a.packageId && a.packageId === b.packageId && a.version === b.version && a.manifestHash === b.manifestHash && a.scriptSetHash === b.scriptSetHash);
  }

  function evaluateEvidenceSet(identity, pcEvidence, androidEvidence) {
    const pcPresent = Boolean(pcEvidence), androidPresent = Boolean(androidEvidence);
    const pcCurrent = evidenceMatchesIdentity(pcEvidence, identity);
    const androidCurrent = evidenceMatchesIdentity(androidEvidence, identity);
    const packagesMatch = pcPresent && androidPresent ? samePackage(pcEvidence, androidEvidence) : false;
    let status = "READY";

    if (!pcPresent && !androidPresent) status = "BOTH_REVALIDATION_REQUIRED";
    else if (!pcPresent) status = "PC_REVALIDATION_REQUIRED";
    else if (!androidPresent) status = "ANDROID_REVALIDATION_REQUIRED";
    else if (pcCurrent && !androidCurrent) status = "ANDROID_REVALIDATION_REQUIRED";
    else if (!pcCurrent && androidCurrent) status = "PC_REVALIDATION_REQUIRED";
    else if (!pcCurrent && !androidCurrent) {
      const pp = pcEvidence.packageIdentity || {}, ap = androidEvidence.packageIdentity || {};
      status = pp.parentVersion && pp.parentVersion === ap.parentVersion && !packagesMatch ? "BASELINE_DIVERGED" : "BOTH_REVALIDATION_REQUIRED";
    } else if (!packagesMatch) status = "BASELINE_MISMATCH";

    return {
      status: status,
      currentPackageId: identity.packageId,
      pcEvidencePresent: pcPresent,
      androidEvidencePresent: androidPresent,
      pcMatchesCurrentBaseline: pcCurrent,
      androidMatchesCurrentBaseline: androidCurrent,
      pcAndroidPackageMatch: packagesMatch,
      mergeRequired: status === "BASELINE_DIVERGED",
      silentOverwriteAllowed: false,
      finalPlatformGateReady: status === "READY"
    };
  }

  async function evaluateExternalIntelligenceCrossPlatformFinalGate() {
    const identity = await getExternalIntelligenceCrossPlatformPackageIdentity();
    const pc = state.crossPlatformFinalGateEvidence.get("PC") || null;
    const android = state.crossPlatformFinalGateEvidence.get("ANDROID") || null;
    const platformGate = evaluateEvidenceSet(identity, pc, android);
    const semantic = state.latestSemanticVerification || null;
    const audit = state.latestFullMemoAudit || null;
    const phase21 = state.latestPhase21Validation || null;
    const semanticReady = Boolean(semantic && semantic.semanticConformanceGranted === true && Number(semantic.verifiedRequirementCount) === 803);
    const auditReady = Boolean(audit && audit.conformanceComplete === true && Number(audit.semanticVerifiedRequirementCount) === 803 && audit.exactCatalogMemoHashMatch === true);
    const phase21Ready = Boolean(phase21 && Number(phase21.failed) === 0 && Number(phase21.criticalFailed) === 0 && Number(phase21.total) === 31);
    let status = platformGate.status;
    if (status === "READY" && !semanticReady) status = "SEMANTIC_REVALIDATION_REQUIRED";
    if (status === "READY" && !auditReady) status = "FULL_MEMO_AUDIT_REQUIRED";
    if (status === "READY" && !phase21Ready) status = "PHASE21_REVALIDATION_REQUIRED";
    const finalGateReady = status === "READY";

    return internal.deepFreeze({
      componentId: "EXTERNAL-010",
      packageIdentity: internal.clone(identity),
      platformGate: platformGate,
      semanticConformance: { ready: semanticReady, validationId: semantic && semantic.id || null, verifiedRequirementCount: semantic && semantic.verifiedRequirementCount || 0 },
      fullMemoAudit: { ready: auditReady, auditId: audit && audit.id || null, semanticVerifiedRequirementCount: audit && audit.semanticVerifiedRequirementCount || 0 },
      phase21: { ready: phase21Ready, validationId: phase21 && phase21.id || null, passed: phase21 && phase21.passed || 0, total: phase21 && phase21.total || 0 },
      pcEvidence: pc ? internal.clone(pc) : null,
      androidEvidence: android ? internal.clone(android) : null,
      status: status,
      finalGateReady: finalGateReady,
      projectOwnerAcceptanceRequired: true,
      approvalGranted: false,
      releaseAuthorityGranted: false,
      automaticMergePerformed: false,
      automaticPromotionPerformed: false,
      evaluatedAt: internal.nowIso(),
      immutable: true
    });
  }

  async function createExternalIntelligenceConsolidatedFinalGateRecord() {
    const evaluated = await evaluateExternalIntelligenceCrossPlatformFinalGate();
    const record = internal.deepFreeze(Object.assign({}, internal.clone(evaluated), {
      finalGateRecordId: internal.nextId("EXTERNAL-010-CONSOLIDATED-FINAL-GATE"),
      recordType: "CONSOLIDATED_CROSS_PLATFORM_FINAL_GATE",
      finalReleaseAllowed: false,
      createdAt: internal.nowIso(),
      immutable: true
    }));
    state.latestConsolidatedFinalGateRecord = record;
    return internal.clone(record);
  }

  async function runExternalIntelligenceCurrentRuntimeFinalGateEvidence() {
    const platform = detectRuntimeType();
    if (platform !== "PC" && platform !== "ANDROID") {
      return internal.buildResult(false, "EXTERNAL010_UNSUPPORTED_FINAL_GATE_RUNTIME", "Blocked", { runtimeType: platform });
    }
    const identity = await getExternalIntelligenceCrossPlatformPackageIdentity();
    let validation;
    if (platform === "PC") {
      if (typeof namespace.runExternalIntelligencePhase21RealRuntimeValidation !== "function") return internal.buildResult(false, "EXTERNAL010_PC_FINAL_GATE_VALIDATOR_UNAVAILABLE", "Blocked", null);
      validation = await namespace.runExternalIntelligencePhase21RealRuntimeValidation();
    } else {
      if (typeof namespace.runExternalIntelligencePhase21AndroidValidation !== "function") return internal.buildResult(false, "EXTERNAL010_ANDROID_FINAL_GATE_VALIDATOR_UNAVAILABLE", "Blocked", null);
      validation = await namespace.runExternalIntelligencePhase21AndroidValidation();
    }
    const evidence = createEvidence(platform, validation, identity, runtimeProvenance());
    if (evidence.validationPassed) state.crossPlatformFinalGateEvidence.set(platform, evidence);
    state.latestCrossPlatformPlatformEvidence = evidence;
    return {
      ok: evidence.validationPassed === true,
      code: evidence.validationPassed ? "EXTERNAL010_CURRENT_RUNTIME_FINAL_GATE_EVIDENCE_PASS" : "EXTERNAL010_CURRENT_RUNTIME_FINAL_GATE_EVIDENCE_FAILED",
      status: evidence.validationPassed ? "PASS" : "FAILED",
      componentId: "EXTERNAL-010",
      version: VM.release.version,
      platform: platform,
      packageIdentity: internal.clone(identity),
      evidence: internal.clone(evidence),
      note: "This is platform-specific evidence only. PC and Android evidence must match the same Package Identity before a Consolidated Final Gate can become READY. Validation does not grant Project Owner Approval or Release Authority."
    };
  }

  function getExternalIntelligenceCrossPlatformGateEvidence(platform) {
    if (platform) return internal.clone(state.crossPlatformFinalGateEvidence.get(String(platform).toUpperCase()) || null);
    return {
      PC: internal.clone(state.crossPlatformFinalGateEvidence.get("PC") || null),
      ANDROID: internal.clone(state.crossPlatformFinalGateEvidence.get("ANDROID") || null)
    };
  }

  Object.assign(namespace.api, {
    getExternalIntelligenceCrossPlatformPackageIdentity,
    runExternalIntelligenceCurrentRuntimeFinalGateEvidence,
    registerExternalIntelligenceCrossPlatformGateEvidence,
    evaluateExternalIntelligenceCrossPlatformFinalGate,
    createExternalIntelligenceConsolidatedFinalGateRecord,
    getExternalIntelligenceCrossPlatformGateEvidence
  });
  Object.assign(namespace, namespace.api);

  namespace.__internal.evaluateExternalIntelligenceCrossPlatformEvidenceSet = evaluateEvidenceSet;
  namespace.modules.crossPlatformFinalGate = {
    id: "EXTERNAL-010-CROSS-PLATFORM-FINAL-GATE",
    version: MODULE_VERSION,
    phase: 21,
    status: "Ready",
    sourceOfTruth: "REPOSITORY_OR_VALIDATED_PACKAGE",
    pcIsCanonicalMaster: false,
    androidIsExecutionOnly: false,
    volatileMemoryCanonical: false,
    silentOverwriteAllowed: false,
    automaticMergeAllowed: false,
    projectOwnerAcceptanceRequired: true,
    loadedAt: internal.nowIso()
  };

  global.runExternalIntelligenceCurrentRuntimeFinalGateEvidence = runExternalIntelligenceCurrentRuntimeFinalGateEvidence;
})(typeof window !== "undefined" ? window : globalThis);
