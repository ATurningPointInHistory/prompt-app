/* ============================================================
   FILE: 13_local_first_repository_phase9_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.8.0 / Module: Phase 9 Validation 1.0.0
   Phase 9: V4 Target Environment Revalidation / Drift Gate
   Required Gate: PC + Android sender lineage + Cross-device V4
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 9 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase9Validation");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";

  function collector(group) {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, checkGroup, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: checkGroup || group || "Phase 9", severity: severity || "High" });
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

  function syntheticBaseline() {
    return {
      canonicalBaselineDescriptorId: "REPOSITORY010-PHASE9-PREDEVICE-BASELINE",
      projectId: "AI-PROMPT-OS-MAIN",
      repositoryId: "AI-PROMPT-OS-REPOSITORY",
      canonicalRevisionId: "REPOSITORY010-CANONICAL-REVISION-PHASE9-PREDEVICE",
      sourceNodeId: TARGET_NODE_ID,
      directoryName: "AI_Prompt_OS",
      manifestHash: "c".repeat(64),
      scriptSetHash: "d".repeat(64),
      scriptCount: 248,
      integrityStatus: "verified",
      baselineMode: "explicit-project-owner",
      explicitlyEstablished: true,
      establishedBy: "Project Owner",
      revisionDerivedFromHash: false,
      revisionDerivedFromVersion: false,
      identityGrantsAuthority: false,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      establishedAt: "2026-08-16T00:00:00.000Z",
      immutable: true
    };
  }

  function syntheticV3Evidence(baseline) {
    return {
      conflictEvidenceId: "REPOSITORY010-PHASE9-PREDEVICE-V3-EVIDENCE",
      v3GateId: "REPOSITORY010-PHASE9-PREDEVICE-V3-GATE",
      receiptId: "REPOSITORY010-PHASE9-PREDEVICE-RECEIPT",
      transferPackageId: "REPOSITORY010-PHASE9-PREDEVICE-TRANSFER",
      projectId: baseline.projectId,
      repositoryId: baseline.repositoryId,
      sourceNodeId: "REPOSITORY010-PHASE9-PREDEVICE-ANDROID-NODE",
      targetNodeId: baseline.sourceNodeId,
      candidateRevisionId: "REPOSITORY010-PHASE9-PREDEVICE-CANDIDATE-REVISION",
      candidateBaseRevisionId: baseline.canonicalRevisionId,
      canonicalRevisionId: baseline.canonicalRevisionId,
      baseRevisionMatch: true,
      conflictDetected: false,
      candidateState: "validated-base-match",
      blockingConflict: false,
      resolutionStatus: "not-required",
      automaticWinnerSelected: false,
      timestampWinnerUsed: false,
      hashWinnerUsed: false,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      explicitAcceptanceGranted: false,
      canonicalMutationPerformed: false,
      v4TargetEnvironmentValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      validatedAt: "2026-08-16T00:00:01.000Z",
      immutable: true
    };
  }

  function syntheticScan(baseline) {
    return {
      directoryName: baseline.directoryName,
      permission: "granted",
      projectInfo: { project: "AIプロンプト生成Pro", version: "v6.0", entryFile: "index.html", complete: true },
      staticManifest: { scriptCount: baseline.scriptCount, manifestHash: baseline.manifestHash, scriptSetHash: baseline.scriptSetHash },
      integrity: { status: "verified", allFileHashesVerified: true, scriptSetVerified: true, manifestHashVerified: true, indexSequenceMatches: true },
      descriptor: {
        desktopRepositoryDescriptorId: "REPOSITORY010-PC-LOCAL-REPOSITORY-DESCRIPTOR",
        projectId: baseline.projectId,
        repositoryId: baseline.repositoryId,
        nodeId: baseline.sourceNodeId,
        nodeType: "canonical",
        directoryName: baseline.directoryName,
        entryFile: "index.html",
        projectVersion: "v6.0",
        manifestHash: baseline.manifestHash,
        scriptSetHash: baseline.scriptSetHash,
        scriptCount: baseline.scriptCount,
        integrityStatus: "verified",
        scanMode: "read-only",
        initialCanonicalNodeObserved: true,
        identityGrantsAuthority: false,
        mutationAuthorityGranted: false,
        writeAttempted: false,
        authorityEffect: "none",
        scannedAt: "2026-08-16T00:00:02.000Z",
        immutable: true
      },
      readOnly: true,
      writePermissionRequested: false,
      writeAttempted: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      actualTransferAttempted: false,
      syncEngineInvoked: false,
      scannedAt: "2026-08-16T00:00:02.000Z"
    };
  }

  async function runLocalFirstRepositoryPhase9Validation() {
    const c = collector("Phase 9 Pre-Device");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;

    check("Prior Phase 8 Cross-device release baseline is recorded", Boolean(prior && Number(prior.phase || 0) >= 8 && prior.version === "1.7.0" && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Decision-001..004 remain formally frozen", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.length === 4 && /001\.\.004/.test(VERSION_MANIFEST.release.architectureStatus), VERSION_MANIFEST.release, "Architecture", "Critical");
    check("Phase 9 implements V4 Target Environment Validation", VERSION_MANIFEST.implementation.phase === 9 && VERSION_MANIFEST.implementation.v4TargetEnvironmentValidationImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("V4 Target Evidence contract is registered", Boolean(namespace.getContractDefinition("v4TargetValidationEvidenceDescriptor")), namespace.getContractDefinition("v4TargetValidationEvidenceDescriptor"), "Contract", "Critical");
    check("V4 Target Validation module is loaded", Boolean(namespace.modules.v4TargetValidation), namespace.modules.v4TargetValidation, "Module", "Critical");
    check("Explicit Acceptance is not implemented in Phase 9", VERSION_MANIFEST.implementation.explicitAcceptanceImplemented === false, VERSION_MANIFEST.implementation.explicitAcceptanceImplemented, "Boundary", "Critical");
    check("Canonical mutation remains prohibited", VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety, "Safety", "Critical");
    check("V5 remains pending", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");

    const savedGates = new Map(state.validationGates);
    const savedV4 = new Map(state.v4TargetValidationEvidenceDescriptors);
    const savedEvidence = internal.clone(state.lastV4TargetValidationEvidence);
    const savedEval = internal.clone(state.lastV4Evaluation);
    const savedStatus = state.v4TargetStatus;
    const savedModuleStatus = namespace.modules.v4TargetValidation && namespace.modules.v4TargetValidation.status;

    try {
      const baseline = syntheticBaseline();
      const v3 = syntheticV3Evidence(baseline);
      const scan = syntheticScan(baseline);
      namespace.createCanonicalBaselineDescriptor(baseline);
      namespace.createV3ConflictEvidenceDescriptor(v3);
      const match = namespace.evaluateV4TargetEnvironment(v3, baseline, scan, {
        v4GateId: "REPOSITORY010-PHASE9-PREDEVICE-MATCH-GATE",
        v4EvidenceId: "REPOSITORY010-PHASE9-PREDEVICE-MATCH-EVIDENCE"
      });
      check("Stable target environment passes V4", Boolean(match && match.ok === true && match.code === "REPOSITORY010_V4_TARGET_ENVIRONMENT_VALIDATED" && match.data.v4TargetEnvironmentValidated === true && match.data.blockingTargetDrift === false), match, "V4 Stable", "Critical");
      check("Stable V4 binds Manifest Hash to Canonical Baseline", Boolean(match && match.data.manifestHashMatch === true), match, "Integrity", "Critical");
      check("Stable V4 binds Script Set Hash to Canonical Baseline", Boolean(match && match.data.scriptSetHashMatch === true), match, "Integrity", "Critical");
      check("Stable V4 binds Script Count to Canonical Baseline", Boolean(match && match.data.scriptCountMatch === true), match, "Integrity", "Critical");
      check("Stable V4 verifies repository and target node identity", Boolean(match && match.data.repositoryIdentityMatch === true && match.data.targetNodeMatch === true && match.data.directoryMatch === true), match, "Identity", "Critical");

      const driftScan = syntheticScan(baseline);
      driftScan.staticManifest.manifestHash = "e".repeat(64);
      driftScan.descriptor.manifestHash = driftScan.staticManifest.manifestHash;
      const drift = namespace.evaluateV4TargetEnvironment(v3, baseline, driftScan, {
        v4GateId: "REPOSITORY010-PHASE9-PREDEVICE-DRIFT-GATE",
        v4EvidenceId: "REPOSITORY010-PHASE9-PREDEVICE-DRIFT-EVIDENCE"
      });
      check("Target drift is detected and blocked", Boolean(drift && drift.ok === true && drift.code === "REPOSITORY010_V4_TARGET_DRIFT_DETECTED" && drift.data.v4TargetEnvironmentValidated === false && drift.data.blockingTargetDrift === true), drift, "V4 Drift", "Critical");
      check("Target drift never becomes approval", Boolean(drift && drift.data.validationIsApproval === false && drift.data.explicitAcceptanceGranted === false), drift, "Authority", "Critical");
      check("Target drift performs no Canonical mutation", Boolean(drift && drift.data.mutationAuthorityGranted === false && drift.data.canonicalMutationPerformed === false && drift.data.authorityEffect === "none"), drift, "Safety", "Critical");
      check("V4 never invokes V5 or Sync Engine", Boolean(match && drift && match.data.v5PostReflectionVerified === false && drift.data.v5PostReflectionVerified === false && match.data.syncEngineInvoked === false && drift.data.syncEngineInvoked === false), { match: match, drift: drift }, "Boundary", "Critical");
    } finally {
      state.validationGates = savedGates;
      state.v4TargetValidationEvidenceDescriptors = savedV4;
      state.lastV4TargetValidationEvidence = savedEvidence;
      state.lastV4Evaluation = savedEval;
      state.v4TargetStatus = savedStatus;
      if (namespace.modules.v4TargetValidation) namespace.modules.v4TargetValidation.status = savedModuleStatus || "Ready";
    }

    check("Phase 9 Gate requires PC real validation", VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet.pcRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet, "Gate Applicability", "Critical");
    check("Phase 9 Gate requires Cross-device real validation", VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet.crossDeviceRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet, "Gate Applicability", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE9-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 9 Pre-Device Validation PASS", "REPOSITORY-010 Phase 9 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet),
      releaseAllowed: false,
      phase9Complete: false,
      v4TargetEnvironmentValidationImplemented: true,
      explicitAcceptanceImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
    internal.markPhase9PreDeviceValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase9CrossDeviceValidation(v4Result) {
    const c = collector("Phase 9 Cross-device");
    const check = c.check;
    const pre = state.lastPhase9Validation && state.phase9PreDeviceValidationPassed === true
      ? state.lastPhase9Validation
      : await runLocalFirstRepositoryPhase9Validation();
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;
    const scan = state.lastDesktopRepositoryScan || null;
    const baseline = state.lastCanonicalBaseline || null;
    const v3Evidence = state.lastV3ConflictEvidence || null;
    const receipt = state.lastV2TransferReceipt || null;
    const evidence = v4Result && v4Result.data ? v4Result.data.evidence : state.lastV4TargetValidationEvidence;
    const pcRealDevice = /Windows/i.test(global.navigator && global.navigator.userAgent || "") && /Win/i.test(global.navigator && global.navigator.platform || "");
    const androidSenderRealDevice = Boolean(receipt && /Android/i.test(receipt.senderUserAgent || ""));

    check("Phase 9 pre-device validation passes", Boolean(pre && pre.failed === 0 && pre.criticalFailed === 0), pre && pre.status, "Pre-Device", "Critical");
    check("Prior Phase 8 Cross-device baseline remains inherited", Boolean(prior && prior.version === "1.7.0" && Number(prior.phase || 0) >= 8 && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Receiver runtime is PC real environment", pcRealDevice, { userAgent: global.navigator && global.navigator.userAgent, platform: global.navigator && global.navigator.platform }, "PC Real Environment", "Critical");
    check("Android sender lineage evidence is present", androidSenderRealDevice, receipt && receipt.senderUserAgent, "Android Real Environment", "Critical");
    check("PC Local Repository was freshly verified read-only", Boolean(scan && scan.integrity && scan.integrity.status === "verified" && scan.readOnly === true && scan.writeAttempted === false && scan.canonicalMutationPerformed === false), scan, "PC Repository", "Critical");
    check("Canonical Baseline is explicitly established", Boolean(baseline && baseline.explicitlyEstablished === true && baseline.baselineMode === "explicit-project-owner"), baseline, "Canonical Baseline", "Critical");
    check("V2 integrity remains validated", Boolean(receipt && receipt.v2TransferIntegrityValidated === true && receipt.packageHash === receipt.receiverCalculatedPackageHash), receipt, "V2 Prerequisite", "Critical");
    check("V3 Base Revision match remains valid", Boolean(v3Evidence && v3Evidence.baseRevisionMatch === true && v3Evidence.conflictDetected === false && v3Evidence.blockingConflict === false), v3Evidence, "V3 Prerequisite", "Critical");
    check("V4 evaluation completed", Boolean(v4Result && v4Result.ok === true), v4Result && v4Result.code, "V4", "Critical");
    check("V4 Target Evidence contract validates", Boolean(evidence && namespace.validateContract("v4TargetValidationEvidenceDescriptor", evidence).valid === true), evidence ? namespace.validateContract("v4TargetValidationEvidenceDescriptor", evidence) : null, "Evidence", "Critical");
    check("Target Manifest Hash still matches Canonical Baseline", Boolean(evidence && evidence.manifestHashMatch === true), evidence, "Integrity", "Critical");
    check("Target Script Set Hash still matches Canonical Baseline", Boolean(evidence && evidence.scriptSetHashMatch === true), evidence, "Integrity", "Critical");
    check("Target Script Count still matches Canonical Baseline", Boolean(evidence && evidence.scriptCountMatch === true), evidence, "Integrity", "Critical");
    check("Target repository identity and node remain unchanged", Boolean(evidence && evidence.repositoryIdentityMatch === true && evidence.targetNodeMatch === true && evidence.directoryMatch === true), evidence, "Identity", "Critical");
    check("Target integrity is verified immediately before reflection boundary", Boolean(evidence && evidence.integrityVerified === true && evidence.v4TargetEnvironmentValidated === true && evidence.blockingTargetDrift === false), evidence, "V4 Gate", "Critical");
    check("V4 Validation is not Approval", Boolean(evidence && evidence.validationIsApproval === false && evidence.explicitAcceptanceGranted === false), evidence, "Authority", "Critical");
    check("V4 grants no mutation authority", Boolean(evidence && evidence.mutationAuthorityGranted === false && evidence.canonicalMutationPerformed === false && evidence.authorityEffect === "none"), evidence, "Authority", "Critical");
    check("V5 Post-Reflection Verification remains pending", Boolean(evidence && evidence.v5PostReflectionVerified === false && VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false), evidence, "Boundary", "Critical");
    check("Sync Engine was not invoked", Boolean(evidence && evidence.syncEngineInvoked === false && VERSION_MANIFEST.implementation.syncEngineImplemented === false), evidence, "Safety", "Critical");
    check("Phase 9 Gate requires Cross-device real validation", VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet.crossDeviceRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet, "Gate Applicability", "Critical");

    const checksPassed = c.checks.every(function all(item) { return item.passed; });
    const releaseAllowed = checksPassed && evidence && evidence.v4TargetEnvironmentValidated === true && evidence.blockingTargetDrift === false;
    const result = summarize(c.checks, "REPOSITORY-010-PHASE9-CROSSDEVICE-VALIDATION",
      releaseAllowed ? "REPOSITORY-010 Phase 9 V4 Target Environment Validation PASS" : "REPOSITORY-010 Phase 9 V4 Target Environment BLOCKED",
      "REPOSITORY-010 Phase 9 V4 Validation FAIL", {
        pcRealDevice: pcRealDevice,
        androidSenderRealDevice: androidSenderRealDevice,
        crossDeviceRealValidation: true,
        requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet),
        releaseAllowed: releaseAllowed,
        phase9Complete: releaseAllowed,
        v4TargetEnvironmentValidated: Boolean(evidence && evidence.v4TargetEnvironmentValidated === true),
        targetEnvironmentMatch: Boolean(evidence && evidence.targetEnvironmentMatch === true),
        blockingTargetDrift: Boolean(evidence && evidence.blockingTargetDrift === true),
        evidence: internal.clone(evidence),
        explicitAcceptanceImplemented: false,
        canonicalMutationImplemented: false,
        v5PostReflectionVerificationImplemented: false,
        syncEngineImplemented: false
      });
    internal.markPhase9CrossDeviceValidation(result);
    return result;
  }

  async function launchLocalFirstRepositoryPhase9CrossDeviceValidation() {
    const pre = await runLocalFirstRepositoryPhase9Validation();
    if (!pre || pre.failed !== 0 || pre.criticalFailed !== 0) return internal.buildResult(false, "REPOSITORY010_PHASE9_PREDEVICE_BLOCKED", "Blocked", pre);
    if (!global.document || !global.document.body) return internal.buildResult(false, "REPOSITORY010_PHASE9_UI_UNAVAILABLE", "Blocked", null);

    const old = global.document.getElementById("repository010Phase9Panel");
    if (old) old.remove();
    const panel = global.document.createElement("div");
    panel.id = "repository010Phase9Panel";
    Object.assign(panel.style, { position: "fixed", right: "18px", bottom: "18px", zIndex: "2147483647", padding: "12px", border: "1px solid currentColor", borderRadius: "8px", background: "Canvas", color: "CanvasText", maxWidth: "410px", fontSize: "13px" });
    const title = global.document.createElement("div");
    title.textContent = "REPOSITORY-010 Phase 9 V4 Target Environment Validation";
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
    revisionInput.value = "REPOSITORY010-CANONICAL-REVISION-0002";
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
    fileButton.textContent = "3. Android Transfer JSONを選択 → V2/V3評価";
    fileButton.disabled = true;
    fileButton.style.display = "block";
    fileButton.style.marginBottom = "8px";
    const v4Button = global.document.createElement("button");
    v4Button.textContent = "4. V4 Targetを直前再検証";
    v4Button.disabled = true;
    v4Button.style.display = "block";
    const input = global.document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    scanButton.addEventListener("click", async function () {
      status.textContent = "PC Repositoryを検証中...";
      const scan = await namespace.selectAndScanDesktopRepository();
      if (scan && scan.ok === true) {
        status.textContent = "PC Repository VERIFIED。Step 2で新Canonical Revisionを明示確立してください。";
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
      if (!v3 || v3.ok !== true || !v3.data || v3.data.baseRevisionMatch !== true || v3.data.blockingConflict === true) {
        status.textContent = "V3 BLOCKED / CONFLICT：V4へ進めません。";
        v4Button.disabled = true;
        console.log(JSON.stringify({ received: received, v3: v3, status: namespace.getStatus() }, null, 2));
        return;
      }
      status.textContent = "V3 BASE MATCH。Step 4でTargetを直前再検証してください。";
      v4Button.disabled = false;
      console.log(JSON.stringify({ received: received, v3: v3, status: namespace.getStatus() }, null, 2));
    });

    v4Button.addEventListener("click", async function () {
      status.textContent = "V4 Target Environmentを再スキャン中...";
      const freshScan = await namespace.scanDesktopRepositoryDirectory();
      if (!freshScan || freshScan.ok !== true) {
        status.textContent = "V4 Fresh Scan BLOCKED: " + (freshScan && freshScan.code || "unknown");
        console.log(JSON.stringify(freshScan, null, 2));
        return;
      }
      const v4 = namespace.evaluateV4TargetEnvironment(state.lastV3ConflictEvidence, state.lastCanonicalBaseline, freshScan.data);
      const validation = await runLocalFirstRepositoryPhase9CrossDeviceValidation(v4);
      status.textContent = validation.releaseAllowed === true
        ? "Phase 9 V4 Validation PASS（Acceptance / Canonical変更は未実行）"
        : "Phase 9 V4 BLOCKED：Target DriftまたはGate不一致";
      console.log(JSON.stringify({ freshScan: freshScan, v4: v4, validation: validation, status: namespace.getStatus() }, null, 2));
    });

    panel.appendChild(title);
    panel.appendChild(status);
    panel.appendChild(scanButton);
    panel.appendChild(revisionInput);
    panel.appendChild(baselineButton);
    panel.appendChild(fileButton);
    panel.appendChild(v4Button);
    panel.appendChild(input);
    global.document.body.appendChild(panel);
    return internal.buildResult(true, "REPOSITORY010_PHASE9_CROSSDEVICE_UI_READY", "Ready", {
      preDeviceValidation: pre,
      step1: "Select and verify PC Local Repository read-only",
      step2: "Project Owner explicitly establishes current Canonical Revision ID",
      step3: "Select Android V2 Transfer JSON and require V3 Base Match",
      step4: "Freshly rescan target environment and execute V4 drift gate",
      explicitAcceptanceImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
  }

  function getLocalFirstRepositoryPhase9ValidationStatus() {
    const evidence = state.lastV4TargetValidationEvidence;
    const complete = state.phase9PreDeviceValidationPassed === true && state.crossDevicePhase9ValidationPassed === true && Boolean(evidence && evidence.v4TargetEnvironmentValidated === true && evidence.blockingTargetDrift === false);
    return {
      preDevice: internal.clone(state.lastPhase9Validation),
      crossDeviceReal: internal.clone(state.lastPhase9CrossDeviceValidation),
      phase9PreDeviceValidationPassed: state.phase9PreDeviceValidationPassed === true,
      crossDevicePhase9ValidationPassed: state.crossDevicePhase9ValidationPassed === true,
      phase9Complete: complete,
      releaseAllowed: complete,
      v4TargetEnvironmentValidated: Boolean(evidence && evidence.v4TargetEnvironmentValidated === true),
      blockingTargetDrift: Boolean(evidence && evidence.blockingTargetDrift === true),
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase9RequiredGateSet),
      explicitAcceptanceImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase9Validation: runLocalFirstRepositoryPhase9Validation,
    runLocalFirstRepositoryPhase9CrossDeviceValidation: runLocalFirstRepositoryPhase9CrossDeviceValidation,
    launchLocalFirstRepositoryPhase9CrossDeviceValidation: launchLocalFirstRepositoryPhase9CrossDeviceValidation,
    getLocalFirstRepositoryPhase9ValidationStatus: getLocalFirstRepositoryPhase9ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase9Validation = {
    id: "REPOSITORY-010-PHASE9-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    androidRealDeviceRequired: true,
    pcRealDeviceRequired: true,
    crossDeviceRealValidationRequired: true,
    v4TargetEnvironmentValidationImplemented: true,
    explicitAcceptanceImplemented: false,
    canonicalMutationImplemented: false,
    v5PostReflectionVerificationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase9Validation = runLocalFirstRepositoryPhase9Validation;
  global.runLocalFirstRepositoryPhase9CrossDeviceValidation = runLocalFirstRepositoryPhase9CrossDeviceValidation;
  global.launchLocalFirstRepositoryPhase9CrossDeviceValidation = launchLocalFirstRepositoryPhase9CrossDeviceValidation;
})(typeof window !== "undefined" ? window : globalThis);
