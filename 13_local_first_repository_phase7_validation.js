/* ============================================================
   FILE: 13_local_first_repository_phase7_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.6.0 / Module: Phase 7 Validation 1.0.0
   Phase 7: Actual V2 Explicit File Transfer / Integrity Validation
   Required Gate: Android sender + PC receiver + Cross-device real transfer
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 7 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase7Validation");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";

  function collector(group) {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, checkGroup, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: checkGroup || group || "Phase 7", severity: severity || "High" });
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

  function syntheticTransferPackage() {
    return {
      transferPackageId: "REPOSITORY010-PHASE7-PREDEVICE-TRANSFER-PACKAGE",
      syncCandidateId: "REPOSITORY010-PHASE7-PREDEVICE-CANDIDATE",
      projectId: "AI-PROMPT-OS-MAIN",
      repositoryId: "AI-PROMPT-OS-REPOSITORY",
      sourceNodeId: "REPOSITORY010-PHASE7-PREDEVICE-ANDROID-NODE",
      revisionId: "REPOSITORY010-PHASE7-PREDEVICE-REVISION",
      baseRevisionId: "REPOSITORY010-PHASE7-PREDEVICE-BASE",
      integrityRecordId: "REPOSITORY010-PHASE7-PREDEVICE-INTEGRITY",
      candidateStateRecordId: "REPOSITORY010-PHASE7-PREDEVICE-CANDIDATE-STATE",
      v1GateId: "REPOSITORY010-PHASE7-PREDEVICE-V1-GATE",
      integritySnapshot: {
        hashAlgorithm: "SHA-256",
        fileHashes: { "index.html": "a".repeat(64) },
        manifestHash: "b".repeat(64),
        scriptSetHash: "c".repeat(64),
        contentHash: "d".repeat(64),
        repositoryStateHash: "e".repeat(64),
        integrityStatus: "verified",
        hashGeneratedAt: "2026-08-15T00:00:00.000Z"
      },
      packageHashAlgorithm: "SHA-256",
      packageHash: "",
      integrityPreflightStatus: "verified",
      integrityPreflightPassed: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: "2026-08-15T00:00:00.000Z",
      immutable: true
    };
  }

  async function buildSyntheticEnvelope() {
    const pkg = syntheticTransferPackage();
    pkg.packageHash = await namespace.calculateV2TransferPackageHash(pkg);
    const built = await namespace.buildV2TransferEnvelope(pkg, {
      runtimeVersion: "1.4.0",
      sourceNodeId: pkg.sourceNodeId,
      userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36",
      platform: "Linux armv8l",
      origin: "https://phase7-predevice.invalid",
      exportedAt: "2026-08-15T00:00:01.000Z",
      realDeviceClaim: "android"
    });
    return built;
  }

  async function runLocalFirstRepositoryPhase7Validation() {
    const c = collector("Phase 7 Pre-Device");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;

    check("Prior Phase 6 PC release baseline is recorded", Boolean(prior && Number(prior.phase || 0) >= 6 && prior.version === "1.5.1" && prior.pcRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Phase 7 scope is Actual V2 explicit file transfer", VERSION_MANIFEST.implementation.phase === 7 && VERSION_MANIFEST.implementation.explicitFileTransferImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("V2 transfer integrity validation is implemented", VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === true, VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented, "V2", "Critical");
    check("Phase 7 requires Android real validation", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet.androidRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet, "Gate Applicability", "Critical");
    check("Phase 7 requires PC real validation", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet.pcRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet, "Gate Applicability", "Critical");
    check("Phase 7 requires Cross-device real validation", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet.crossDeviceRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet, "Gate Applicability", "Critical");
    check("V2 Transfer module is ready", Boolean(namespace.modules.v2Transfer && namespace.modules.v2Transfer.status), namespace.modules.v2Transfer, "Module", "Critical");
    check("V2 Transfer Receipt contract is registered", Boolean(namespace.getContractDefinition("v2TransferReceiptDescriptor")), namespace.getContractDefinition("v2TransferReceiptDescriptor"), "Contract", "Critical");

    const built = await buildSyntheticEnvelope();
    check("Synthetic Android Transfer Envelope builds", Boolean(built && built.ok === true), built && built.code, "Envelope", "Critical");
    const envelope = built && built.data && built.data.envelope;
    const validated = envelope ? await namespace.validateV2TransferEnvelope(envelope, { requireAndroidSender: true }) : null;
    check("Synthetic Package SHA-256 verifies at receiver", Boolean(validated && validated.packageValidation && validated.packageValidation.packageHashVerified === true), validated && validated.packageValidation, "Integrity", "Critical");
    check("Synthetic Envelope SHA-256 verifies at receiver", Boolean(validated && validated.envelopeHashVerified === true), validated, "Integrity", "Critical");
    check("Synthetic sender is identified as Android", Boolean(validated && validated.senderIsAndroid === true), validated && validated.senderIsAndroid, "Sender", "Critical");
    check("Sender evidence sourceNode matches Transfer Package", Boolean(validated && validated.sourceNodeMatchesSenderEvidence === true), validated && validated.sourceNodeMatchesSenderEvidence, "Lineage", "Critical");

    const tampered = envelope ? internal.clone(envelope) : null;
    if (tampered && tampered.transferPackage) tampered.transferPackage.revisionId = "REPOSITORY010-TAMPERED-REVISION";
    const tamperedValidation = tampered ? await namespace.validateV2TransferEnvelope(tampered, { requireAndroidSender: true }) : null;
    check("Tampered Transfer Package is blocked", Boolean(tamperedValidation && tamperedValidation.valid === false && tamperedValidation.packageValidation.packageHashVerified === false), tamperedValidation, "Tamper", "Critical");

    const status = namespace.getV2TransferStatus();
    check("Transport requires explicit user action", namespace.modules.v2Transfer.explicitUserActionRequired === true && status.transportMode === "explicit-file-transfer", status, "Safety", "Critical");
    check("Canonical mutation remains prohibited", VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, { pcCanonicalMutationImplemented: VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented, directRepositoryMutationAllowed: VERSION_MANIFEST.safety.directRepositoryMutationAllowed }, "Safety", "Critical");
    check("V3 Base/Conflict remains unimplemented", VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === false, VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented, "Boundary", "Critical");
    check("V4 Target Validation remains unimplemented", VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === false, VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented, "Boundary", "Critical");
    check("V5 Post-Reflection remains unimplemented", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");
    check("Automatic Conflict winner remains prohibited", VERSION_MANIFEST.safety.automaticConflictWinnerAllowed === false, VERSION_MANIFEST.safety.automaticConflictWinnerAllowed, "Safety", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE7-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 7 Pre-Device Validation PASS", "REPOSITORY-010 Phase 7 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet),
      releaseAllowed: false,
      phase7Complete: false,
      actualV2TransferImplemented: true,
      crossDeviceRealValidationRequired: true,
      canonicalMutationImplemented: false
    });
    internal.markPhase7PreDeviceValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase7CrossDeviceValidation(receiveResult) {
    const pre = state.lastPhase7Validation && state.phase7PreDeviceValidationPassed === true
      ? internal.clone(state.lastPhase7Validation)
      : await runLocalFirstRepositoryPhase7Validation();
    const c = collector("Phase 7 Cross-device Real");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const platform = global.navigator && global.navigator.platform || "";
    const pcRealDevice = /Windows|Macintosh|Linux x86_64|Win32|Win64/i.test(userAgent + " " + platform) && !/Android|Mobile/i.test(userAgent);
    const receipt = receiveResult && receiveResult.data && receiveResult.data.receipt || null;
    const transferValidation = receiveResult && receiveResult.data && receiveResult.data.validation || null;
    const senderUserAgent = receipt && receipt.senderUserAgent || "";
    const androidSenderRealDevice = /Android/i.test(senderUserAgent);
    const desktopScan = state.lastDesktopRepositoryScan;

    check("Phase 7 pre-device validation passes", Boolean(pre && pre.failed === 0 && pre.criticalFailed === 0), pre && pre.status, "Pre-Device", "Critical");
    check("Prior Phase 6 PC release baseline remains inherited", Boolean(prior && Number(prior.phase || 0) >= 6 && prior.pcRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Receiver runtime is PC real environment", pcRealDevice === true, { userAgent: userAgent, platform: platform }, "PC Real Environment", "Critical");
    check("PC Local Repository was verified read-only in this runtime", Boolean(desktopScan && desktopScan.integrity && desktopScan.integrity.status === "verified" && desktopScan.readOnly === true), desktopScan, "PC Repository", "Critical");
    check("Android sender evidence is present", androidSenderRealDevice === true, senderUserAgent, "Android Real Environment", "Critical");
    check("Transfer was received through explicit file selection", Boolean(receipt && receipt.receivedViaUserSelection === true), receipt && receipt.receivedViaUserSelection, "Cross-device Transfer", "Critical");
    check("Actual V2 receive result succeeds", Boolean(receiveResult && receiveResult.ok === true && receiveResult.code === "REPOSITORY010_V2_TRANSFER_INTEGRITY_VALIDATED"), receiveResult && receiveResult.code, "V2", "Critical");
    check("Sender Package SHA-256 matches PC recalculation", Boolean(receipt && receipt.packageHash === receipt.receiverCalculatedPackageHash), receipt && { sender: receipt.packageHash, receiver: receipt.receiverCalculatedPackageHash }, "Integrity", "Critical");
    check("Transfer Package hash verification passed", Boolean(transferValidation && transferValidation.packageValidation && transferValidation.packageValidation.packageHashVerified === true), transferValidation && transferValidation.packageValidation, "Integrity", "Critical");
    check("Transfer Envelope hash verification passed", Boolean(transferValidation && transferValidation.envelopeHashVerified === true), transferValidation, "Integrity", "Critical");
    check("Sender sourceNode lineage matches Package", Boolean(transferValidation && transferValidation.sourceNodeMatchesSenderEvidence === true), transferValidation, "Lineage", "Critical");
    check("V2 Receipt targets PC Initial Canonical Node identity", Boolean(receipt && receipt.targetNodeId === TARGET_NODE_ID), receipt && receipt.targetNodeId, "Target Identity", "Critical");
    check("V2 Receipt contract validates", Boolean(receipt && namespace.validateContract("v2TransferReceiptDescriptor", receipt).valid === true), receipt && namespace.validateContract("v2TransferReceiptDescriptor", receipt), "Receipt", "Critical");
    check("V2 Validation is not Approval", Boolean(receipt && receipt.validationIsApproval === false && receipt.explicitAcceptanceGranted === false), receipt, "Authority", "Critical");
    check("V2 grants no mutation authority", Boolean(receipt && receipt.mutationAuthorityGranted === false && receipt.authorityEffect === "none"), receipt, "Authority", "Critical");
    check("No Canonical mutation occurred", Boolean(receipt && receipt.canonicalMutationPerformed === false && VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false), receipt, "Safety", "Critical");
    check("V3 Base/Conflict is still pending", Boolean(receipt && receipt.v3BaseConflictValidated === false && VERSION_MANIFEST.implementation.v3BaseConflictValidationImplemented === false), receipt, "Boundary", "Critical");
    check("V4 Target Validation is still pending", Boolean(receipt && receipt.v4TargetEnvironmentValidated === false && VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === false), receipt, "Boundary", "Critical");
    check("Sync Engine was not invoked", Boolean(receipt && receipt.syncEngineInvoked === false && VERSION_MANIFEST.implementation.syncEngineImplemented === false), receipt, "Safety", "Critical");
    check("Phase 7 Gate requires Cross-device real validation", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet.crossDeviceRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet, "Gate Applicability", "Critical");

    const passedAll = c.checks.every(function all(item) { return item.passed; });
    const result = summarize(c.checks, "REPOSITORY-010-PHASE7-CROSSDEVICE-VALIDATION", "REPOSITORY-010 Phase 7 Android-to-PC V2 Transfer Validation PASS", "REPOSITORY-010 Phase 7 Android-to-PC V2 Transfer Validation FAIL", {
      pcRealDevice: pcRealDevice,
      androidSenderRealDevice: androidSenderRealDevice,
      crossDeviceRealValidation: true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet),
      releaseAllowed: passedAll,
      phase7Complete: passedAll,
      v2TransferIntegrityValidated: passedAll,
      receipt: internal.clone(receipt),
      canonicalMutationImplemented: false,
      v3BaseConflictValidationImplemented: false,
      v4TargetEnvironmentValidationImplemented: false,
      syncEngineImplemented: false
    });
    internal.markPhase7CrossDeviceValidation(result);
    return result;
  }

  async function launchLocalFirstRepositoryPhase7CrossDeviceValidation() {
    const pre = await runLocalFirstRepositoryPhase7Validation();
    if (!pre || pre.failed !== 0 || pre.criticalFailed !== 0) return internal.buildResult(false, "REPOSITORY010_PHASE7_PREDEVICE_BLOCKED", "Blocked", pre);
    if (!global.document || !global.document.body) return internal.buildResult(false, "REPOSITORY010_PHASE7_UI_UNAVAILABLE", "Blocked", null);

    const old = global.document.getElementById("repository010Phase7Panel");
    if (old) old.remove();
    const panel = global.document.createElement("div");
    panel.id = "repository010Phase7Panel";
    Object.assign(panel.style, { position: "fixed", right: "18px", bottom: "18px", zIndex: "2147483647", padding: "12px", border: "1px solid currentColor", borderRadius: "8px", background: "Canvas", color: "CanvasText", maxWidth: "360px", fontSize: "13px" });
    const title = global.document.createElement("div");
    title.textContent = "REPOSITORY-010 Phase 7 V2 Cross-device Validation";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    const status = global.document.createElement("div");
    status.textContent = "Step 1: PC RepositoryをRead-only検証してください。";
    status.style.marginBottom = "8px";
    const scanButton = global.document.createElement("button");
    scanButton.textContent = "1. PC Repositoryを選択・検証";
    scanButton.style.display = "block";
    scanButton.style.marginBottom = "8px";
    const fileButton = global.document.createElement("button");
    fileButton.textContent = "2. Android Transfer JSONを選択";
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
        status.textContent = "PC Repository VERIFIED。Step 2へ進めます。";
        fileButton.disabled = false;
      } else {
        status.textContent = "PC Repository検証 BLOCKED: " + (scan && scan.code || "unknown");
        console.log(JSON.stringify(scan, null, 2));
      }
    });

    fileButton.addEventListener("click", function () { input.value = ""; input.click(); });
    input.addEventListener("change", async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      status.textContent = "Android Transfer Packageを受信・再Hash中...";
      const received = await namespace.receiveV2TransferFile(file, { requireAndroidSender: true });
      const validation = await runLocalFirstRepositoryPhase7CrossDeviceValidation(received);
      status.textContent = validation.failed === 0 ? "Phase 7 Cross-device Validation PASS" : "Phase 7 Cross-device Validation FAIL";
      console.log(JSON.stringify({ received: received, validation: validation, status: namespace.getStatus() }, null, 2));
    });

    panel.appendChild(title);
    panel.appendChild(status);
    panel.appendChild(scanButton);
    panel.appendChild(fileButton);
    panel.appendChild(input);
    global.document.body.appendChild(panel);
    return internal.buildResult(true, "REPOSITORY010_PHASE7_CROSSDEVICE_UI_READY", "Ready", {
      preDeviceValidation: pre,
      step1: "Select and verify PC Local Repository read-only",
      step2: "Select Android V2 Transfer JSON",
      canonicalMutationImplemented: false
    });
  }

  function getLocalFirstRepositoryPhase7ValidationStatus() {
    return {
      preDevice: internal.clone(state.lastPhase7Validation),
      crossDeviceReal: internal.clone(state.lastPhase7CrossDeviceValidation),
      phase7PreDeviceValidationPassed: state.phase7PreDeviceValidationPassed === true,
      crossDevicePhase7ValidationPassed: state.crossDevicePhase7ValidationPassed === true,
      phase7Complete: state.phase7PreDeviceValidationPassed === true && state.crossDevicePhase7ValidationPassed === true,
      releaseAllowed: state.phase7PreDeviceValidationPassed === true && state.crossDevicePhase7ValidationPassed === true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase7RequiredGateSet),
      actualV2TransferImplemented: true,
      canonicalMutationImplemented: false
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase7Validation: runLocalFirstRepositoryPhase7Validation,
    runLocalFirstRepositoryPhase7CrossDeviceValidation: runLocalFirstRepositoryPhase7CrossDeviceValidation,
    launchLocalFirstRepositoryPhase7CrossDeviceValidation: launchLocalFirstRepositoryPhase7CrossDeviceValidation,
    getLocalFirstRepositoryPhase7ValidationStatus: getLocalFirstRepositoryPhase7ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase7Validation = {
    id: "REPOSITORY-010-PHASE7-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 7,
    androidRealDeviceRequired: true,
    pcRealDeviceRequired: true,
    crossDeviceRealValidationRequired: true,
    canonicalMutationImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase7Validation = runLocalFirstRepositoryPhase7Validation;
  global.runLocalFirstRepositoryPhase7CrossDeviceValidation = runLocalFirstRepositoryPhase7CrossDeviceValidation;
  global.launchLocalFirstRepositoryPhase7CrossDeviceValidation = launchLocalFirstRepositoryPhase7CrossDeviceValidation;
})(typeof window !== "undefined" ? window : globalThis);
