/* ============================================================
   FILE: 17_external_intelligence_cross_platform_final_gate_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.20.1
   HF13 Cross-Platform Final Gate Contract Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal;
  const MODULE_VERSION = VM.getModuleVersion("crossPlatformFinalGateValidation") || VM.release.version;

  function fakeIdentity(suffix) {
    const token = String(suffix || "a").slice(0, 1);
    return {
      componentId: "EXTERNAL-010",
      packageId: "AI-PROMPT-OS-EXTERNAL-010-1.20.1-" + token.repeat(16),
      version: "1.20.1",
      parentVersion: "1.20.0",
      manifestHash: token.repeat(64),
      scriptSetHash: token === "a" ? "b".repeat(64) : "c".repeat(64),
      immutable: true
    };
  }

  function fakeEvidence(platform, identity, pass) {
    const ok = pass !== false;
    return {
      evidenceId: "EVIDENCE-" + platform + "-" + identity.packageId,
      platform: platform,
      packageIdentity: internal.clone(identity),
      validationPassed: ok,
      validation: {
        validationId: platform === "PC" ? "EXTERNAL-010-PHASE21-PC-REAL-RUNTIME-FIXTURE" : "EXTERNAL-010-PHASE21-ANDROID-REAL-DEVICE-FIXTURE",
        passed: ok ? (platform === "PC" ? 10 : 9) : 0,
        failed: ok ? 0 : 1,
        total: platform === "PC" ? 10 : 9,
        health: ok ? 100 : 0,
        criticalFailed: ok ? 0 : 1
      },
      immutable: true
    };
  }

  async function runExternalIntelligenceCrossPlatformFinalGateValidation() {
    const checks = [];
    const add = function (name, passed, detail, group) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "HF13", severity: "Critical" }); };
    const evalSet = internal.evaluateExternalIntelligenceCrossPlatformEvidenceSet;
    add("Cross-platform Final Gate evaluator is available", typeof evalSet === "function", typeof evalSet, "Foundation");
    add("Repository / Package is SoT; PC is not canonical master", namespace.modules.crossPlatformFinalGate && namespace.modules.crossPlatformFinalGate.sourceOfTruth === "REPOSITORY_OR_VALIDATED_PACKAGE" && namespace.modules.crossPlatformFinalGate.pcIsCanonicalMaster === false, namespace.modules.crossPlatformFinalGate, "Architecture");
    add("Android is not constrained to execution-only role", namespace.modules.crossPlatformFinalGate && namespace.modules.crossPlatformFinalGate.androidIsExecutionOnly === false, namespace.modules.crossPlatformFinalGate, "Architecture");

    const a = fakeIdentity("a"), d = fakeIdentity("d"), e = fakeIdentity("e");
    const pcA = fakeEvidence("PC", a, true), androidA = fakeEvidence("ANDROID", a, true);
    const pcD = fakeEvidence("PC", d, true), androidD = fakeEvidence("ANDROID", d, true), androidE = fakeEvidence("ANDROID", e, true);
    const both = evalSet(a, pcA, androidA);
    add("Same Package Identity PC + Android evidence becomes platform READY", both.status === "READY" && both.finalPlatformGateReady === true, both, "Baseline");
    const androidOld = evalSet(a, pcA, androidD);
    add("Current PC plus stale/different Android requires Android revalidation", androidOld.status === "ANDROID_REVALIDATION_REQUIRED", androidOld, "Stale Detection");
    const pcOld = evalSet(a, pcD, androidA);
    add("Stale/different PC plus current Android requires PC revalidation", pcOld.status === "PC_REVALIDATION_REQUIRED", pcOld, "Stale Detection");
    const diverged = evalSet(a, pcD, androidE);
    add("Same-parent PC/Android branches are detected as BASELINE_DIVERGED / MERGE_REQUIRED", diverged.status === "BASELINE_DIVERGED" && diverged.mergeRequired === true, diverged, "Divergence");
    const separateBranches = evalSet(a, pcA, androidD);
    add("Different PC/Android package identities never report READY", separateBranches.finalPlatformGateReady === false && separateBranches.pcAndroidPackageMatch === false, separateBranches, "Divergence");
    add("Silent overwrite and automatic merge remain prohibited", both.silentOverwriteAllowed === false && namespace.modules.crossPlatformFinalGate.automaticMergeAllowed === false, { both: both, module: namespace.modules.crossPlatformFinalGate }, "Safety");
    add("Validation evidence does not grant Project Owner Approval", namespace.modules.crossPlatformFinalGate.projectOwnerAcceptanceRequired === true && VM.safety.validationPassEqualsApproval === false && VM.safety.validationPassEqualsAuthorityGrant === false, VM.safety, "Authority");

    let currentIdentity = null;
    try { currentIdentity = await namespace.getExternalIntelligenceCrossPlatformPackageIdentity(); } catch (error) { currentIdentity = { error: error && error.message || String(error) }; }
    add("Current Package Identity binds version + parentVersion + Manifest + Script Set", Boolean(currentIdentity && currentIdentity.version === VM.release.version && currentIdentity.parentVersion === VM.release.parentVersion && /^[a-f0-9]{64}$/i.test(String(currentIdentity.manifestHash || "")) && /^[a-f0-9]{64}$/i.test(String(currentIdentity.scriptSetHash || "")) && currentIdentity.packageId), currentIdentity, "Package Identity");

    const failed = checks.filter(function (item) { return !item.passed; });
    const result = {
      id: internal.nextId("EXTERNAL-010-CROSS-PLATFORM-FINAL-GATE-VALIDATION"),
      componentId: "EXTERNAL-010",
      version: VM.release.version,
      passed: checks.length - failed.length,
      failed: failed.length,
      total: checks.length,
      health: checks.length ? Math.round((checks.length - failed.length) * 1000 / checks.length) / 10 : 0,
      criticalFailed: failed.length,
      status: failed.length ? "EXTERNAL-010 Cross-Platform Final Gate Validation FAILED" : "EXTERNAL-010 Cross-Platform Final Gate Validation PASS",
      releaseAllowed: false,
      projectOwnerAcceptanceRequired: true,
      checks: checks,
      validatedAt: internal.nowIso(),
      immutable: true
    };
    internal.state.latestCrossPlatformFinalGateValidation = internal.deepFreeze(internal.clone(result));
    return result;
  }

  Object.assign(namespace.api, { runExternalIntelligenceCrossPlatformFinalGateValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.crossPlatformFinalGateValidation = { id: "EXTERNAL-010-CROSS-PLATFORM-FINAL-GATE-VALIDATION", version: MODULE_VERSION, phase: 21, status: "Ready", loadedAt: internal.nowIso() };
  global.runExternalIntelligenceCrossPlatformFinalGateValidation = runExternalIntelligenceCrossPlatformFinalGateValidation;
})(typeof window !== "undefined" ? window : globalThis);
