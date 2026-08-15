/* ============================================================
   FILE: 13_local_first_repository_phase8_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.7.0 / Module: Phase 8 Validation 1.0.0
   Phase 8: Explicit Canonical Baseline / V3 Base Revision / Conflict Validation
   Required Gate: PC + Android sender evidence + Cross-device V3 validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 8 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase8Validation");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const TEST_BASELINE_ID = "REPOSITORY010-PHASE8-PREDEVICE-BASELINE";

  function collector(group) {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, checkGroup, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: checkGroup || group || "Phase 8", severity: severity || "High" });
      }
    };
  }

  function summarize(checks, idPrefix, passStatus, failStatus, extras) {
    const passed = checks.filter(function p(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function c(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(idPrefix),
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 10000) / 100 : 100,
      criticalFailed: criticalFailed,
      status: failed === 0 ? passStatus : failStatus,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  function syntheticReceipt(id, baseRevisionId) {
    return {
      receiptId: id,
      transferPackageId: id + "-TRANSFER",
      projectId: "AI-PROMPT-OS-MAIN",
      repositoryId: "AI-PROMPT-OS-REPOSITORY",
      sourceNodeId: id + "-ANDROID-NODE",
      targetNodeId: TARGET_NODE_ID,
      revisionId: id + "-REVISION",
      baseRevisionId: baseRevisionId,
      packageHashAlgorithm: "SHA-256",
      packageHash: "a".repeat(64),
      receiverCalculatedPackageHash: "a".repeat(64),
      envelopeHash: "b".repeat(64),
      senderRuntimeVersion: "1.6.0",
      senderOrigin: "https://phase8-predevice.invalid",
      senderUserAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36",
      transportMode: "explicit-file-transfer",
      sourceFileName: id + ".json",
      receivedViaUserSelection: true,
      v2TransferIntegrityValidated: true,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      explicitAcceptanceGranted: false,
      canonicalMutationPerformed: false,
      v3BaseConflictValidated: false,
      v4TargetEnvironmentValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      receivedAt: "2026-08-15T00:00:00.000Z",
      immutable: true
    };
  }

  async function runLocalFirstRepositoryPhase8Validation() {
    const c = collector("Phase 8 Pre-Device");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;

    check("Prior Phase 7 Cross-device release baseline is recorded", Boolean(prior && Number(prior.phase || 0) >= 7 && prior.version === "1.6.0" && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Decision-004 is formally frozen", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-004") >= 0 && /001\.\.004/.test(VERSION_MANIFEST.release.architectureStatus), VERSION_MANIFEST.release, "Architecture", "Critical");
    check("Phase 8 implements V3 Base/Conflict validation", VERSION_MANIFEST.implementation.phase === 8 && VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Explicit Canonical Baseline is implemented", VERSION_MANIFEST.implementation.explicitCanonicalBaselineImplemented === true, VERSION_MANIFEST.implementation.explicitCanonicalBaselineImplemented, "Baseline", "Critical");
    check("Canonical Revision is not derived from Hash", VERSION_MANIFEST.implementation.canonicalRevisionDerivedFromHash === false, VERSION_MANIFEST.implementation.canonicalRevisionDerivedFromHash, "Decision-004", "Critical");
    check("Canonical Revision is not derived from Version", VERSION_MANIFEST.implementation.canonicalRevisionDerivedFromVersion === false, VERSION_MANIFEST.implementation.canonicalRevisionDerivedFromVersion, "Decision-004", "Critical");
    check("Canonical Baseline contract is registered", Boolean(namespace.getContractDefinition("canonicalBaselineDescriptor")), namespace.getContractDefinition("canonicalBaselineDescriptor"), "Contract", "Critical");
    check("V3 Conflict Evidence contract is registered", Boolean(namespace.getContractDefinition("v3ConflictEvidenceDescriptor")), namespace.getContractDefinition("v3ConflictEvidenceDescriptor"), "Contract", "Critical");
    check("V3 Conflict module is loaded", Boolean(namespace.modules.v3Conflict), namespace.modules.v3Conflict, "Module", "Critical");

    const savedScan = internal.clone(state.lastDesktopRepositoryScan);
    const savedBaseline = internal.clone(state.lastCanonicalBaseline);
    const savedBaselineStatus = state.canonicalBaselineStatus;
    const savedV3Evidence = internal.clone(state.lastV3ConflictEvidence);
    const savedV3Status = state.v3ConflictStatus;
    const savedV3ModuleStatus = namespace.modules.v3Conflict && namespace.modules.v3Conflict.status;
    const savedBaselines = new Map(state.canonicalBaselineDescriptors);
    const savedEvidence = new Map(state.v3ConflictEvidenceDescriptors);
    const savedReceipts = new Map(state.v2TransferReceipts);
    const savedGates = new Map(state.validationGates);

    try {
      state.lastDesktopRepositoryScan = {
        directoryName: "AI_Prompt_OS",
        staticManifest: { scriptCount: 1, manifestHash: "c".repeat(64), scriptSetHash: "d".repeat(64) },
        integrity: { status: "verified", allFileHashesVerified: true, scriptSetVerified: true, manifestHashVerified: true, indexSequenceMatches: true },
        descriptor: { projectId: "AI-PROMPT-OS-MAIN", repositoryId: "AI-PROMPT-OS-REPOSITORY", nodeId: TARGET_NODE_ID, integrityStatus: "verified" },
        readOnly: true,
        writeAttempted: false,
        canonicalMutationPerformed: false
      };
      const baselineResult = namespace.establishExplicitCanonicalBaseline({
        canonicalBaselineDescriptorId: TEST_BASELINE_ID,
        canonicalRevisionId: "REPOSITORY010-CANONICAL-REVISION-PREDEVICE",
        explicitProjectOwnerAction: true
      });
      const baseline = baselineResult && baselineResult.data && baselineResult.data.baseline;
      check("Explicit Project Owner action establishes Canonical Baseline", Boolean(baselineResult && baselineResult.ok === true && baseline && baseline.explicitlyEstablished === true), baselineResult, "Baseline", "Critical");
      check("Baseline preserves Revision / Hash / Version separation", Boolean(baseline && baseline.revisionDerivedFromHash === false && baseline.revisionDerivedFromVersion === false), baseline, "Decision-004", "Critical");
      check("Baseline establishment performs no Canonical mutation", Boolean(baseline && baseline.canonicalMutationPerformed === false && baseline.mutationAuthorityGranted === false && baseline.authorityEffect === "none"), baseline, "Safety", "Critical");

      const matchReceipt = syntheticReceipt("REPOSITORY010-PHASE8-PREDEVICE-MATCH", baseline.canonicalRevisionId);
      const mismatchReceipt = syntheticReceipt("REPOSITORY010-PHASE8-PREDEVICE-MISMATCH", "REPOSITORY010-OTHER-BASE");
      namespace.createV2TransferReceiptDescriptor(matchReceipt);
      namespace.createV2TransferReceiptDescriptor(mismatchReceipt);
      const matchResult = namespace.evaluateV3BaseRevision(matchReceipt.receiptId, baseline.canonicalBaselineDescriptorId, { conflictEvidenceId: "REPOSITORY010-PHASE8-PREDEVICE-MATCH-EVIDENCE", v3GateId: "REPOSITORY010-PHASE8-PREDEVICE-MATCH-GATE" });
      const mismatchResult = namespace.evaluateV3BaseRevision(mismatchReceipt.receiptId, baseline.canonicalBaselineDescriptorId, { conflictEvidenceId: "REPOSITORY010-PHASE8-PREDEVICE-MISMATCH-EVIDENCE", v3GateId: "REPOSITORY010-PHASE8-PREDEVICE-MISMATCH-GATE" });
      check("Matching Base Revision passes V3 without conflict", Boolean(matchResult && matchResult.ok === true && matchResult.data.baseRevisionMatch === true && matchResult.data.blockingConflict === false), matchResult, "V3 Match", "Critical");
      check("Mismatching Base Revision is detected as conflict", Boolean(mismatchResult && mismatchResult.ok === true && mismatchResult.data.conflictDetected === true && mismatchResult.data.blockingConflict === true), mismatchResult, "V3 Conflict", "Critical");
      check("Conflict requires manual resolution", Boolean(mismatchResult && mismatchResult.data.resolutionStatus === "manual-resolution-required"), mismatchResult, "Conflict Resolution", "Critical");
      check("V3 never chooses an automatic winner", Boolean(matchResult && mismatchResult && matchResult.data.automaticWinnerSelected === false && mismatchResult.data.automaticWinnerSelected === false), { match: matchResult && matchResult.data, mismatch: mismatchResult && mismatchResult.data }, "Safety", "Critical");
      check("Timestamp is never used as winner", Boolean(mismatchResult && mismatchResult.data.timestampWinnerUsed === false), mismatchResult, "Safety", "Critical");
      check("Hash is never used as winner", Boolean(mismatchResult && mismatchResult.data.hashWinnerUsed === false), mismatchResult, "Safety", "Critical");
    } finally {
      state.lastDesktopRepositoryScan = savedScan;
      state.lastCanonicalBaseline = savedBaseline;
      state.canonicalBaselineStatus = savedBaselineStatus;
      state.lastV3ConflictEvidence = savedV3Evidence;
      state.v3ConflictStatus = savedV3Status;
      if (namespace.modules.v3Conflict) namespace.modules.v3Conflict.status = savedV3ModuleStatus || "Ready";
      state.canonicalBaselineDescriptors = savedBaselines;
      state.v3ConflictEvidenceDescriptors = savedEvidence;
      state.v2TransferReceipts = savedReceipts;
      state.validationGates = savedGates;
    }

    check("Phase 8 requires PC real validation", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet.pcRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet, "Gate Applicability", "Critical");
    check("Phase 8 requires Android sender evidence", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet.androidRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet, "Gate Applicability", "Critical");
    check("Phase 8 requires Cross-device real validation", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet.crossDeviceRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet, "Gate Applicability", "Critical");
    check("V4 Target Validation remains unimplemented", VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === false, VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented, "Boundary", "Critical");
    check("Explicit Acceptance remains unimplemented", VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false, VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");
    check("Automatic Conflict winner remains prohibited", VERSION_MANIFEST.safety.automaticConflictWinnerAllowed === false, VERSION_MANIFEST.safety.automaticConflictWinnerAllowed, "Safety", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE8-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 8 Pre-Device Validation PASS", "REPOSITORY-010 Phase 8 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet),
      releaseAllowed: false,
      phase8Complete: false,
      v3BaseConflictValidationImplemented: true,
      explicitCanonicalBaselineImplemented: true,
      crossDeviceRealValidationRequired: true,
      canonicalMutationImplemented: false
    });
    internal.markPhase8PreDeviceValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase8CrossDeviceValidation(v3Result) {
    const pre = state.lastPhase8Validation && state.phase8PreDeviceValidationPassed === true
      ? internal.clone(state.lastPhase8Validation)
      : await runLocalFirstRepositoryPhase8Validation();
    const c = collector("Phase 8 Cross-device Real");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const platform = global.navigator && global.navigator.platform || "";
    const pcRealDevice = /Windows|Macintosh|Linux x86_64|Win32|Win64/i.test(userAgent + " " + platform) && !/Android|Mobile/i.test(userAgent);
    const receipt = v3Result && v3Result.data && v3Result.data.receipt || state.lastV2TransferReceipt || null;
    const baseline = v3Result && v3Result.data && v3Result.data.baseline || state.lastCanonicalBaseline || null;
    const evidence = v3Result && v3Result.data && v3Result.data.evidence || state.lastV3ConflictEvidence || null;
    const senderUserAgent = receipt && receipt.senderUserAgent || "";
    const androidSenderRealDevice = /Android/i.test(senderUserAgent);
    const desktopScan = state.lastDesktopRepositoryScan;
    const blockingConflict = Boolean(evidence && evidence.blockingConflict === true);

    check("Phase 8 pre-device validation passes", Boolean(pre && pre.failed === 0 && pre.criticalFailed === 0), pre && pre.status, "Pre-Device", "Critical");
    check("Prior Phase 7 Cross-device baseline remains inherited", Boolean(prior && Number(prior.phase || 0) >= 7 && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Receiver runtime is PC real environment", pcRealDevice === true, { userAgent: userAgent, platform: platform }, "PC Real Environment", "Critical");
    check("PC Local Repository is verified read-only", Boolean(desktopScan && desktopScan.integrity && desktopScan.integrity.status === "verified" && desktopScan.readOnly === true), desktopScan, "PC Repository", "Critical");
    check("Canonical Baseline is explicitly established", Boolean(baseline && baseline.explicitlyEstablished === true && baseline.establishedBy === "Project Owner" && baseline.baselineMode === "explicit-project-owner"), baseline, "Canonical Baseline", "Critical");
    check("Canonical Revision is independent from Hash and Version", Boolean(baseline && baseline.revisionDerivedFromHash === false && baseline.revisionDerivedFromVersion === false), baseline, "Decision-004", "Critical");
    check("Android sender evidence is present", androidSenderRealDevice === true, senderUserAgent, "Android Real Environment", "Critical");
    check("V2 integrity was validated before V3", Boolean(receipt && receipt.v2TransferIntegrityValidated === true && receipt.packageHash === receipt.receiverCalculatedPackageHash), receipt, "V2 Prerequisite", "Critical");
    check("V3 evaluation succeeded", Boolean(v3Result && v3Result.ok === true && v3Result.data && v3Result.data.v3BaseConflictValidated === true), v3Result && v3Result.code, "V3", "Critical");
    check("V3 evidence contract validates", Boolean(evidence && namespace.validateContract("v3ConflictEvidenceDescriptor", evidence).valid === true), evidence && namespace.validateContract("v3ConflictEvidenceDescriptor", evidence), "Evidence", "Critical");
    check("Candidate Base Revision is compared to Canonical Revision", Boolean(evidence && evidence.candidateBaseRevisionId && evidence.canonicalRevisionId), evidence && { candidateBaseRevisionId: evidence.candidateBaseRevisionId, canonicalRevisionId: evidence.canonicalRevisionId, match: evidence.baseRevisionMatch }, "V3", "Critical");
    check("No automatic conflict winner is selected", Boolean(evidence && evidence.automaticWinnerSelected === false && VERSION_MANIFEST.safety.automaticConflictWinnerAllowed === false), evidence, "Safety", "Critical");
    check("Timestamp is not a winner rule", Boolean(evidence && evidence.timestampWinnerUsed === false), evidence, "Safety", "Critical");
    check("Hash is not a winner rule", Boolean(evidence && evidence.hashWinnerUsed === false), evidence, "Safety", "Critical");
    check("V3 Validation is not Approval", Boolean(evidence && evidence.validationIsApproval === false && evidence.explicitAcceptanceGranted === false), evidence, "Authority", "Critical");
    check("V3 grants no mutation authority", Boolean(evidence && evidence.mutationAuthorityGranted === false && evidence.authorityEffect === "none"), evidence, "Authority", "Critical");
    check("No Canonical mutation occurred", Boolean(evidence && evidence.canonicalMutationPerformed === false && VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false), evidence, "Safety", "Critical");
    check("V4 Target Validation remains pending", Boolean(evidence && evidence.v4TargetEnvironmentValidated === false && VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === false), evidence, "Boundary", "Critical");
    check("Sync Engine was not invoked", Boolean(evidence && evidence.syncEngineInvoked === false && VERSION_MANIFEST.implementation.syncEngineImplemented === false), evidence, "Safety", "Critical");
    check("Phase 8 Gate requires Cross-device real validation", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet.crossDeviceRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet, "Gate Applicability", "Critical");

    const checksPassed = c.checks.every(function all(item) { return item.passed; });
    const releaseAllowed = checksPassed && blockingConflict === false && evidence && evidence.baseRevisionMatch === true;
    const result = summarize(c.checks, "REPOSITORY-010-PHASE8-CROSSDEVICE-VALIDATION",
      blockingConflict ? "REPOSITORY-010 Phase 8 V3 Conflict Detected / Manual Resolution Required" : "REPOSITORY-010 Phase 8 V3 Base Revision Validation PASS",
      "REPOSITORY-010 Phase 8 V3 Validation FAIL", {
        pcRealDevice: pcRealDevice,
        androidSenderRealDevice: androidSenderRealDevice,
        crossDeviceRealValidation: true,
        requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet),
        releaseAllowed: releaseAllowed,
        phase8Complete: releaseAllowed,
        v3BaseConflictValidated: checksPassed,
        baseRevisionMatch: evidence ? evidence.baseRevisionMatch === true : false,
        conflictDetected: evidence ? evidence.conflictDetected === true : false,
        blockingConflict: blockingConflict,
        resolutionStatus: evidence ? evidence.resolutionStatus : "unknown",
        baseline: internal.clone(baseline),
        evidence: internal.clone(evidence),
        canonicalMutationImplemented: false,
        v4TargetEnvironmentValidationImplemented: false,
        syncEngineImplemented: false
      });
    internal.markPhase8CrossDeviceValidation(result);
    return result;
  }

  async function launchLocalFirstRepositoryPhase8CrossDeviceValidation() {
    const pre = await runLocalFirstRepositoryPhase8Validation();
    if (!pre || pre.failed !== 0 || pre.criticalFailed !== 0) return internal.buildResult(false, "REPOSITORY010_PHASE8_PREDEVICE_BLOCKED", "Blocked", pre);
    if (!global.document || !global.document.body) return internal.buildResult(false, "REPOSITORY010_PHASE8_UI_UNAVAILABLE", "Blocked", null);

    const old = global.document.getElementById("repository010Phase8Panel");
    if (old) old.remove();
    const panel = global.document.createElement("div");
    panel.id = "repository010Phase8Panel";
    Object.assign(panel.style, { position: "fixed", right: "18px", bottom: "18px", zIndex: "2147483647", padding: "12px", border: "1px solid currentColor", borderRadius: "8px", background: "Canvas", color: "CanvasText", maxWidth: "390px", fontSize: "13px" });
    const title = global.document.createElement("div");
    title.textContent = "REPOSITORY-010 Phase 8 V3 Base / Conflict Validation";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    const status = global.document.createElement("div");
    status.textContent = "Step 1: PC RepositoryをRead-only検証してください。";
    status.style.marginBottom = "8px";
    const scanButton = global.document.createElement("button");
    scanButton.textContent = "1. PC Repositoryを選択・検証";
    scanButton.style.display = "block";
    scanButton.style.marginBottom = "8px";
    const revisionInput = global.document.createElement("input");
    revisionInput.type = "text";
    revisionInput.value = "REPOSITORY010-CANONICAL-REVISION-0001";
    revisionInput.placeholder = "Canonical Revision ID";
    revisionInput.disabled = true;
    revisionInput.style.width = "100%";
    revisionInput.style.boxSizing = "border-box";
    revisionInput.style.marginBottom = "6px";
    const baselineButton = global.document.createElement("button");
    baselineButton.textContent = "2. Project OwnerとしてBaselineを明示確立";
    baselineButton.disabled = true;
    baselineButton.style.display = "block";
    baselineButton.style.marginBottom = "8px";
    const fileButton = global.document.createElement("button");
    fileButton.textContent = "3. Android Transfer JSONを選択 → V3評価";
    fileButton.disabled = true;
    fileButton.style.display = "block";
    const input = global.document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    scanButton.addEventListener("click", async function () {
      status.textContent = "PC Repositoryを検証中...";
      const scan = await namespace.selectAndScanDesktopRepository();
      if (scan && scan.ok === true) {
        status.textContent = "PC Repository VERIFIED。Step 2でRevision IDを確認して明示確立してください。";
        revisionInput.disabled = false;
        baselineButton.disabled = false;
      } else {
        status.textContent = "PC Repository検証 BLOCKED: " + (scan && scan.code || "unknown");
        console.log(JSON.stringify(scan, null, 2));
      }
    });

    baselineButton.addEventListener("click", function () {
      const result = namespace.establishExplicitCanonicalBaseline({
        canonicalRevisionId: revisionInput.value,
        explicitProjectOwnerAction: true
      });
      if (result && result.ok === true) {
        status.textContent = "Canonical Baseline ESTABLISHED: " + result.data.baseline.canonicalRevisionId + "。Step 3へ進めます。";
        revisionInput.disabled = true;
        baselineButton.disabled = true;
        fileButton.disabled = false;
      } else {
        status.textContent = "Canonical Baseline BLOCKED: " + (result && result.code || "unknown");
      }
      console.log(JSON.stringify(result, null, 2));
    });

    fileButton.addEventListener("click", function () { input.value = ""; input.click(); });
    input.addEventListener("change", async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      status.textContent = "V2再検証 → V3 Base Revision比較中...";
      const received = await namespace.receiveV2TransferFile(file, { requireAndroidSender: true });
      if (!received || received.ok !== true) {
        status.textContent = "V2受信 BLOCKED: " + (received && received.code || "unknown");
        console.log(JSON.stringify(received, null, 2));
        return;
      }
      const v3 = namespace.evaluateV3BaseRevision(received.data.receipt, state.lastCanonicalBaseline);
      const validation = await runLocalFirstRepositoryPhase8CrossDeviceValidation(v3);
      status.textContent = validation.blockingConflict === true
        ? "V3 CONFLICT DETECTED：Manual Resolution Required（Canonical変更なし）"
        : (validation.failed === 0 && validation.releaseAllowed === true ? "Phase 8 V3 Validation PASS" : "Phase 8 V3 Validation FAIL");
      console.log(JSON.stringify({ received: received, v3: v3, validation: validation, status: namespace.getStatus() }, null, 2));
    });

    panel.appendChild(title);
    panel.appendChild(status);
    panel.appendChild(scanButton);
    panel.appendChild(revisionInput);
    panel.appendChild(baselineButton);
    panel.appendChild(fileButton);
    panel.appendChild(input);
    global.document.body.appendChild(panel);
    return internal.buildResult(true, "REPOSITORY010_PHASE8_CROSSDEVICE_UI_READY", "Ready", {
      preDeviceValidation: pre,
      step1: "Select and verify PC Local Repository read-only",
      step2: "Project Owner explicitly establishes Canonical Revision ID",
      step3: "Select Android V2 Transfer JSON and evaluate V3 Base Revision",
      automaticConflictWinnerAllowed: false,
      canonicalMutationImplemented: false
    });
  }

  function getLocalFirstRepositoryPhase8ValidationStatus() {
    const conflict = state.lastV3ConflictEvidence;
    const complete = state.phase8PreDeviceValidationPassed === true && state.crossDevicePhase8ValidationPassed === true && !(conflict && conflict.blockingConflict === true);
    return {
      preDevice: internal.clone(state.lastPhase8Validation),
      crossDeviceReal: internal.clone(state.lastPhase8CrossDeviceValidation),
      phase8PreDeviceValidationPassed: state.phase8PreDeviceValidationPassed === true,
      crossDevicePhase8ValidationPassed: state.crossDevicePhase8ValidationPassed === true,
      phase8Complete: complete,
      releaseAllowed: complete,
      blockingConflict: Boolean(conflict && conflict.blockingConflict === true),
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase8RequiredGateSet),
      v3BaseConflictValidationImplemented: true,
      automaticConflictWinnerAllowed: false,
      canonicalMutationImplemented: false
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase8Validation: runLocalFirstRepositoryPhase8Validation,
    runLocalFirstRepositoryPhase8CrossDeviceValidation: runLocalFirstRepositoryPhase8CrossDeviceValidation,
    launchLocalFirstRepositoryPhase8CrossDeviceValidation: launchLocalFirstRepositoryPhase8CrossDeviceValidation,
    getLocalFirstRepositoryPhase8ValidationStatus: getLocalFirstRepositoryPhase8ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase8Validation = {
    id: "REPOSITORY-010-PHASE8-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    androidRealDeviceRequired: true,
    pcRealDeviceRequired: true,
    crossDeviceRealValidationRequired: true,
    automaticConflictWinnerAllowed: false,
    canonicalMutationImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase8Validation = runLocalFirstRepositoryPhase8Validation;
  global.runLocalFirstRepositoryPhase8CrossDeviceValidation = runLocalFirstRepositoryPhase8CrossDeviceValidation;
  global.launchLocalFirstRepositoryPhase8CrossDeviceValidation = launchLocalFirstRepositoryPhase8CrossDeviceValidation;
})(typeof window !== "undefined" ? window : globalThis);
