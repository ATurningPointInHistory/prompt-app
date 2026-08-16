/* ============================================================
   FILE: 13_local_first_repository_phase11_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.10.0 / Module: Phase 11 Validation 1.0.0
   Phase 11: Hybrid Mutation Package / Smallest Safe Mutation Bridge
   Required Gate: Android sender + PC target + Cross-device lineage + Mutation-bound Token
   IMPORTANT: No Canonical write / no Controlled Transaction / no Token consumption / no V5.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 11 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase11Validation");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";

  function collector(group) {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, checkGroup, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: checkGroup || group || "Phase 11", severity: severity || "High" });
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

  function makeSyntheticLineage(transferPackage) {
    const projectId = transferPackage.projectId;
    const repositoryId = transferPackage.repositoryId;
    const revisionId = transferPackage.revisionId;
    const baseRevisionId = transferPackage.baseRevisionId;
    const receiptId = "REPOSITORY010-PHASE11-PREDEVICE-RECEIPT";
    const v3GateId = "REPOSITORY010-PHASE11-PREDEVICE-V3-GATE";
    const v3EvidenceId = "REPOSITORY010-PHASE11-PREDEVICE-V3-EVIDENCE";
    const v4GateId = "REPOSITORY010-PHASE11-PREDEVICE-V4-GATE";
    const v4EvidenceId = "REPOSITORY010-PHASE11-PREDEVICE-V4-EVIDENCE";
    const baseline = {
      canonicalBaselineDescriptorId: "REPOSITORY010-PHASE11-PREDEVICE-BASELINE",
      projectId: projectId,
      repositoryId: repositoryId,
      canonicalRevisionId: baseRevisionId,
      sourceNodeId: TARGET_NODE_ID,
      directoryName: "AI_Prompt_OS",
      manifestHash: "b".repeat(64),
      scriptSetHash: "c".repeat(64),
      scriptCount: 253,
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
      establishedAt: "2026-08-16T02:30:00.000Z",
      immutable: true
    };
    const receipt = {
      receiptId: receiptId,
      transferPackageId: transferPackage.transferPackageId,
      projectId: projectId,
      repositoryId: repositoryId,
      sourceNodeId: transferPackage.sourceNodeId,
      targetNodeId: TARGET_NODE_ID,
      revisionId: revisionId,
      baseRevisionId: baseRevisionId,
      packageHashAlgorithm: "SHA-256",
      packageHash: transferPackage.packageHash,
      receiverCalculatedPackageHash: transferPackage.packageHash,
      envelopeHash: "d".repeat(64),
      senderRuntimeVersion: "1.10.0",
      senderOrigin: "https://example.invalid",
      senderUserAgent: "Mozilla/5.0 (Linux; Android 10) Mobile",
      transportMode: "explicit-file-transfer",
      sourceFileName: "phase11-predevice-v2.json",
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
      receivedAt: "2026-08-16T02:30:01.000Z",
      immutable: true
    };
    const v3 = {
      conflictEvidenceId: v3EvidenceId,
      v3GateId: v3GateId,
      receiptId: receiptId,
      transferPackageId: transferPackage.transferPackageId,
      projectId: projectId,
      repositoryId: repositoryId,
      sourceNodeId: transferPackage.sourceNodeId,
      targetNodeId: TARGET_NODE_ID,
      candidateRevisionId: revisionId,
      candidateBaseRevisionId: baseRevisionId,
      canonicalRevisionId: baseRevisionId,
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
      validatedAt: "2026-08-16T02:30:02.000Z",
      immutable: true
    };
    const v4 = {
      v4EvidenceId: v4EvidenceId,
      v4GateId: v4GateId,
      v3ConflictEvidenceId: v3EvidenceId,
      v3GateId: v3GateId,
      receiptId: receiptId,
      transferPackageId: transferPackage.transferPackageId,
      projectId: projectId,
      repositoryId: repositoryId,
      sourceNodeId: transferPackage.sourceNodeId,
      targetNodeId: TARGET_NODE_ID,
      candidateRevisionId: revisionId,
      candidateBaseRevisionId: baseRevisionId,
      canonicalRevisionId: baseRevisionId,
      baselineManifestHash: baseline.manifestHash,
      currentManifestHash: baseline.manifestHash,
      manifestHashMatch: true,
      baselineScriptSetHash: baseline.scriptSetHash,
      currentScriptSetHash: baseline.scriptSetHash,
      scriptSetHashMatch: true,
      baselineScriptCount: baseline.scriptCount,
      currentScriptCount: baseline.scriptCount,
      scriptCountMatch: true,
      repositoryIdentityMatch: true,
      targetNodeMatch: true,
      directoryMatch: true,
      integrityVerified: true,
      targetEnvironmentMatch: true,
      targetEnvironmentStatus: "validated-target-environment",
      blockingTargetDrift: false,
      v4TargetEnvironmentValidated: true,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      explicitAcceptanceGranted: false,
      canonicalMutationPerformed: false,
      v5PostReflectionVerified: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      validatedAt: "2026-08-16T02:30:03.000Z",
      immutable: true
    };
    return { baseline: baseline, receipt: receipt, v3: v3, v4: v4 };
  }

  async function runLocalFirstRepositoryPhase11Validation() {
    const c = collector("Phase 11 Pre-Device");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;
    check("Prior Phase 10 Cross-device release baseline is recorded", Boolean(prior && prior.version === "1.9.0" && Number(prior.phase || 0) === 10 && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Decision-001..006 are formally frozen", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.length === 6 && /001\.\.006/.test(VERSION_MANIFEST.release.architectureStatus), VERSION_MANIFEST.release, "Architecture", "Critical");
    check("Phase 11 Hybrid Mutation Package is implemented", VERSION_MANIFEST.implementation.phase === 11 && VERSION_MANIFEST.implementation.hybridMutationPackageImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Smallest Safe Mutation First is default", Boolean(VERSION_MANIFEST.mutationStrategy && VERSION_MANIFEST.mutationStrategy.smallestSafeMutationFirst === true && VERSION_MANIFEST.mutationStrategy.defaultMutationType === "function-patch"), VERSION_MANIFEST.mutationStrategy, "Strategy", "Critical");
    check("Phase 11 enables Function-Level only", JSON.stringify(VERSION_MANIFEST.mutationStrategy.phase11EnabledMutationTypes) === JSON.stringify(["function-patch"]), VERSION_MANIFEST.mutationStrategy, "Strategy", "Critical");
    check("Structured / Full-File / ZIP fallbacks stay disabled", VERSION_MANIFEST.implementation.structuredBlockMutationPreparationImplemented === false && VERSION_MANIFEST.implementation.fullFileMutationPreparationImplemented === false && VERSION_MANIFEST.implementation.multiFileZipMutationPreparationImplemented === false, VERSION_MANIFEST.implementation, "Boundary", "Critical");
    check("Mutation Package contract is registered", Boolean(namespace.getContractDefinition("mutationPackageDescriptor")), namespace.getContractDefinition("mutationPackageDescriptor"), "Contract", "Critical");
    check("Mutation Package module is loaded", Boolean(namespace.modules.mutationPackage && namespace.modules.mutationPackage.status), namespace.modules.mutationPackage, "Module", "Critical");
    check("IDE-150 Bridge module is loaded", Boolean(namespace.modules.ide150Bridge && namespace.modules.ide150Bridge.status), namespace.modules.ide150Bridge, "Module", "Critical");
    check("IDE-150 runtime is present", Boolean(global.IDE150AutoRefactoring && global.__IDE150AutoRefactoringInternal), namespace.getDependencyStatus(), "IDE-150", "Critical");
    const controlledStatus = typeof global.getControlledAutoRefactoringApplicationStatus === "function" ? global.getControlledAutoRefactoringApplicationStatus() : null;
    check("Existing IDE-150 persistent commit remains prohibited", Boolean(controlledStatus && controlledStatus.safety && controlledStatus.safety.persistentCommitAllowed === false), controlledStatus && controlledStatus.safety, "IDE-150 Safety", "Critical");
    check("Canonical mutation remains prohibited", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false && VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false && VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented === false, VERSION_MANIFEST.safety, "Safety", "Critical");

    const saved = {
      transferPackages: new Map(state.transferPackageDescriptors),
      mutationPackages: new Map(state.mutationPackageDescriptors),
      acceptanceTokens: new Map(state.acceptanceTokenDescriptors),
      baseline: internal.clone(state.lastCanonicalBaseline),
      receipt: internal.clone(state.lastV2TransferReceipt),
      envelope: internal.clone(state.lastV2TransferEnvelope),
      v3: internal.clone(state.lastV3ConflictEvidence),
      v4: internal.clone(state.lastV4TargetValidationEvidence),
      token: internal.clone(state.lastAcceptanceToken),
      mutationPackage: internal.clone(state.lastMutationPackage),
      mutationValidation: internal.clone(state.lastMutationPackageValidation),
      bridge: internal.clone(state.lastIDE150BridgeEvidence),
      acceptanceStatus: state.acceptanceStatus,
      mutationStatus: state.mutationPackageStatus,
      acceptanceModuleStatus: namespace.modules.acceptanceToken && namespace.modules.acceptanceToken.status,
      mutationModuleStatus: namespace.modules.mutationPackage && namespace.modules.mutationPackage.status,
      bridgeModuleStatus: namespace.modules.ide150Bridge && namespace.modules.ide150Bridge.status
    };

    try {
      state.transferPackageDescriptors.clear();
      state.mutationPackageDescriptors.clear();
      state.acceptanceTokenDescriptors.clear();
      const transfer = {
        transferPackageId: "REPOSITORY010-PHASE11-PREDEVICE-TRANSFER",
        syncCandidateId: "REPOSITORY010-PHASE11-PREDEVICE-CANDIDATE",
        projectId: "AI-PROMPT-OS-MAIN",
        repositoryId: "AI-PROMPT-OS-REPOSITORY",
        sourceNodeId: "REPOSITORY010-PHASE11-PREDEVICE-ANDROID-NODE",
        revisionId: "REPOSITORY010-PHASE11-PREDEVICE-REVISION",
        baseRevisionId: "REPOSITORY010-CANONICAL-REVISION-PHASE11-PREDEVICE",
        integrityRecordId: "REPOSITORY010-PHASE11-PREDEVICE-INTEGRITY",
        candidateStateRecordId: "REPOSITORY010-PHASE11-PREDEVICE-CANDIDATE-STATE",
        v1GateId: "REPOSITORY010-PHASE11-PREDEVICE-V1-GATE",
        integritySnapshot: {
          hashAlgorithm: "SHA-256", fileHashes: { "phase11-fixture.js": "1".repeat(64) }, manifestHash: "2".repeat(64), scriptSetHash: "3".repeat(64), contentHash: "4".repeat(64), repositoryStateHash: "5".repeat(64), integrityStatus: "verified", hashGeneratedAt: "2026-08-16T02:30:00.000Z"
        },
        packageHashAlgorithm: "SHA-256",
        packageHash: "6".repeat(64),
        integrityPreflightStatus: "verified",
        integrityPreflightPassed: true,
        transferAttempted: false,
        transferCompleted: false,
        v2TransferIntegrityValidated: false,
        syncEngineInvoked: false,
        authorityEffect: "none",
        createdAt: "2026-08-16T02:30:00.000Z",
        immutable: true
      };
      state.transferPackageDescriptors.set(transfer.transferPackageId, internal.deepFreeze(internal.clone(transfer)));
      const before = 'function phase11FixtureTarget() { return "before"; }';
      const after = 'function phase11FixtureTarget() { return "after"; }';
      const currentFileSource = '"use strict";\n' + before + '\n';
      const prepared = await namespace.prepareHybridMutationPackage({
        transferPackageId: transfer.transferPackageId,
        mutationPackageId: "REPOSITORY010-PHASE11-PREDEVICE-MUTATION-PACKAGE",
        mutations: [{ mutationType: "function-patch", mutationId: "REPOSITORY010-PHASE11-PREDEVICE-MUTATION", targetFile: "phase11-fixture.js", targetFunction: "phase11FixtureTarget", beforeFunctionSource: before, afterFunctionSource: after, currentFileSource: currentFileSource }]
      });
      check("Function-Level Mutation Package prepares", Boolean(prepared && prepared.ok === true), prepared, "Preparation", "Critical");
      const record = prepared && prepared.data && prepared.data.mutationPackage;
      const packageValidation = record ? await namespace.validateMutationPackage(record) : null;
      check("Mutation Package integrity validates", Boolean(packageValidation && packageValidation.ok === true), packageValidation, "Integrity", "Critical");
      check("Allowed Mutation Set is compact and non-empty", Boolean(record && record.allowedMutationSet.length === 1 && !Object.prototype.hasOwnProperty.call(record.allowedMutationSet[0], "beforeFunctionSource") && !Object.prototype.hasOwnProperty.call(record.allowedMutationSet[0], "afterFunctionSource")), record && record.allowedMutationSet, "Token Efficiency", "Critical");
      check("Mutation Package keeps actual Function payload separately", Boolean(record && record.mutationSet[0].beforeFunctionSource === before && record.mutationSet[0].afterFunctionSource === after), record && record.mutationSet[0], "Payload", "Critical");
      check("Mutation is Function-Level priority 1", Boolean(record && record.mutationSet[0].mutationType === "function-patch" && record.mutationSet[0].priorityLevel === 1 && record.mutationSet[0].selectionReason === "exact-single-function-smallest-safe-mutation"), record && record.mutationSet[0], "Strategy", "Critical");
      const bridge = record ? await namespace.validateFunctionMutationAgainstSource(record.mutationSet[0], currentFileSource) : null;
      check("IDE-150 read-only Function bridge validates virtual patch", Boolean(bridge && bridge.valid === true && bridge.virtualPatchPrepared === true), bridge, "IDE-150 Bridge", "Critical");
      check("IDE-150 Bridge invokes no approval/apply/write", Boolean(bridge && bridge.ide150ApprovalInvoked === false && bridge.ide150ApplyInvoked === false && bridge.repositoryWriteAttempted === false && bridge.persistentCommitAllowed === false), bridge, "IDE-150 Safety", "Critical");
      const blockedFallback = await namespace.prepareHybridMutationPackage({ transferPackageId: transfer.transferPackageId, mutations: [{ mutationType: "file-replace", targetFile: "phase11-fixture.js" }] });
      check("Full-File fallback is blocked in Phase 11", Boolean(blockedFallback && blockedFallback.ok === false && blockedFallback.code === "REPOSITORY010_PHASE11_MUTATION_TYPE_DISABLED"), blockedFallback, "Fallback Boundary", "Critical");
      const tampered = record ? internal.clone(record) : null;
      if (tampered) tampered.mutationSet[0].afterFunctionSource = 'function phase11FixtureTarget() { return "tampered"; }';
      const tamperedValidation = tampered ? await namespace.validateMutationPackage(tampered) : null;
      check("Mutation payload tamper is detected", Boolean(tamperedValidation && tamperedValidation.ok === false), tamperedValidation, "Integrity Attack", "Critical");

      const lineage = makeSyntheticLineage(transfer);
      state.lastCanonicalBaseline = internal.clone(lineage.baseline);
      state.lastV2TransferReceipt = internal.clone(lineage.receipt);
      state.lastV2TransferEnvelope = { transferPackage: internal.clone(transfer) };
      state.lastV3ConflictEvidence = internal.clone(lineage.v3);
      state.lastV4TargetValidationEvidence = internal.clone(lineage.v4);
      const tokenResult = record ? await namespace.issueManualAcceptanceToken({ v4EvidenceId: lineage.v4.v4EvidenceId, allowedMutationSet: record.allowedMutationSet, acceptedBy: "Project Owner", explicitProjectOwnerAction: true, acceptanceTokenId: "REPOSITORY010-PHASE11-PREDEVICE-TOKEN" }) : null;
      check("Manual Token binds non-empty Allowed Mutation Set", Boolean(tokenResult && tokenResult.ok === true && tokenResult.data.acceptanceToken.allowedMutationSet.length === 1), tokenResult, "Acceptance Binding", "Critical");
      const token = tokenResult && tokenResult.data && tokenResult.data.acceptanceToken;
      const tokenValid = token && record ? await namespace.validateAcceptanceToken(token, { candidateId: record.candidateId, candidateRevisionId: record.candidateRevisionId, baseRevisionId: record.baseRevisionId, targetNodeId: lineage.v4.targetNodeId, canonicalRevisionId: lineage.baseline.canonicalRevisionId, v4EvidenceId: lineage.v4.v4EvidenceId, transferPackageId: transfer.transferPackageId, receiptId: lineage.receipt.receiptId, packageHash: transfer.packageHash, allowedMutationSet: record.allowedMutationSet }, { requireCurrentLineage: true }) : null;
      check("Mutation-bound Token validates", Boolean(tokenValid && tokenValid.ok === true), tokenValid, "Acceptance Binding", "Critical");
      const wrongSet = record ? internal.clone(record.allowedMutationSet) : [];
      if (wrongSet[0]) wrongSet[0].afterSha256 = "f".repeat(64);
      const mismatch = token ? await namespace.validateAcceptanceToken(token, { allowedMutationSet: wrongSet }, { requireCurrentLineage: false }) : null;
      check("Token blocks different Allowed Mutation Set", Boolean(mismatch && mismatch.ok === false && mismatch.data && mismatch.data.reasons.indexOf("allowed-mutation-set-mismatch") !== -1), mismatch, "Binding Attack", "Critical");
      check("Token itself still grants no mutation authority", Boolean(token && token.mutationAuthorityGranted === false && token.controlledTransactionStarted === false && token.canonicalMutationPerformed === false), token, "Authority", "Critical");
    } finally {
      state.transferPackageDescriptors.clear(); saved.transferPackages.forEach(function restore(v, k) { state.transferPackageDescriptors.set(k, v); });
      state.mutationPackageDescriptors.clear(); saved.mutationPackages.forEach(function restore(v, k) { state.mutationPackageDescriptors.set(k, v); });
      state.acceptanceTokenDescriptors.clear(); saved.acceptanceTokens.forEach(function restore(v, k) { state.acceptanceTokenDescriptors.set(k, v); });
      state.lastCanonicalBaseline = saved.baseline;
      state.lastV2TransferReceipt = saved.receipt;
      state.lastV2TransferEnvelope = saved.envelope;
      state.lastV3ConflictEvidence = saved.v3;
      state.lastV4TargetValidationEvidence = saved.v4;
      state.lastAcceptanceToken = saved.token;
      state.lastMutationPackage = saved.mutationPackage;
      state.lastMutationPackageValidation = saved.mutationValidation;
      state.lastIDE150BridgeEvidence = saved.bridge;
      state.acceptanceStatus = saved.acceptanceStatus;
      state.mutationPackageStatus = saved.mutationStatus;
      if (namespace.modules.acceptanceToken) namespace.modules.acceptanceToken.status = saved.acceptanceModuleStatus || "Ready";
      if (namespace.modules.mutationPackage) namespace.modules.mutationPackage.status = saved.mutationModuleStatus || "Ready";
      if (namespace.modules.ide150Bridge) namespace.modules.ide150Bridge.status = saved.bridgeModuleStatus || "Ready";
    }

    const result = summarize(c.checks, "REPOSITORY-010-PHASE11-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 11 Pre-Device Validation PASS", "REPOSITORY-010 Phase 11 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase11RequiredGateSet),
      hybridMutationPackageImplemented: true,
      smallestSafeMutationFirst: true,
      phase11EnabledMutationTypes: ["function-patch"],
      canonicalMutationImplemented: false,
      controlledTransactionImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
    internal.markPhase11PreDeviceValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase11CrossDeviceValidation(tokenResult) {
    const c = collector("Phase 11 Cross-device Real");
    const check = c.check;
    const pre = state.lastPhase11Validation || await runLocalFirstRepositoryPhase11Validation();
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;
    const scan = state.lastDesktopRepositoryScan || null;
    const baseline = state.lastCanonicalBaseline || null;
    const receipt = state.lastV2TransferReceipt || null;
    const v3 = state.lastV3ConflictEvidence || null;
    const v4 = state.lastV4TargetValidationEvidence || null;
    const mutationPackage = state.lastMutationPackage || null;
    const mutationValidation = state.lastMutationPackageValidation || null;
    const bridge = state.lastIDE150BridgeEvidence || null;
    const token = tokenResult && tokenResult.data && tokenResult.data.acceptanceToken ? tokenResult.data.acceptanceToken : state.lastAcceptanceToken;
    const ua = global.navigator && global.navigator.userAgent || "";
    const platform = global.navigator && global.navigator.platform || "";
    const sender = mutationValidation && mutationValidation.senderEvidence || null;

    check("Phase 11 pre-device validation passes", Boolean(pre && pre.failed === 0 && pre.criticalFailed === 0), pre, "Pre-Device", "Critical");
    check("Prior Phase 10 Cross-device baseline remains inherited", Boolean(prior && prior.phase === 10 && prior.version === "1.9.0" && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Receiver runtime is PC real environment", /Windows/i.test(ua) || /Win32/i.test(platform), { userAgent: ua, platform: platform }, "PC Real Environment", "Critical");
    check("Android Mutation Package sender evidence is present", Boolean(sender && /Android/i.test(sender.userAgent || "") && sender.realDeviceClaim === "android"), sender, "Android Real Environment", "Critical");
    check("PC Local Repository remains freshly verified read-only", Boolean(scan && scan.integrity && scan.integrity.status === "verified" && scan.readOnly === true && scan.writeAttempted === false), scan, "PC Repository", "Critical");
    check("Canonical Baseline is explicitly established", Boolean(baseline && baseline.explicitlyEstablished === true && baseline.establishedBy === "Project Owner" && baseline.integrityStatus === "verified"), baseline, "Canonical Baseline", "Critical");
    check("V2 integrity remains validated", Boolean(receipt && receipt.v2TransferIntegrityValidated === true), receipt, "V2 Prerequisite", "Critical");
    check("V3 Base Revision match remains valid", Boolean(v3 && v3.baseRevisionMatch === true && v3.blockingConflict === false), v3, "V3 Prerequisite", "Critical");
    check("V4 Target Environment remains stable", Boolean(v4 && v4.v4TargetEnvironmentValidated === true && v4.targetEnvironmentMatch === true && v4.blockingTargetDrift === false), v4, "V4 Prerequisite", "Critical");
    check("Hybrid Mutation Package was received and V2-bound", Boolean(mutationPackage && mutationValidation && mutationValidation.valid === true && mutationValidation.v2LineageMatch === true && mutationPackage.sourceTransferPackageHash === receipt.packageHash), { mutationPackage: mutationPackage, mutationValidation: mutationValidation }, "Mutation Package", "Critical");
    check("Smallest Safe Mutation selected Function-Level", Boolean(mutationPackage && mutationPackage.smallestSafeMutationFirst === true && mutationPackage.mutationCount > 0 && mutationPackage.mutationSet.every(function each(item) { return item.mutationType === "function-patch" && item.priorityLevel === 1; })), mutationPackage && mutationPackage.mutationSet, "Strategy", "Critical");
    check("IDE-150 Bridge validated exact current target read-only", Boolean(bridge && bridge.targetValidationResults && bridge.targetValidationResults.length === mutationPackage.mutationCount && bridge.targetValidationResults.every(function each(item) { return item.valid === true; }) && bridge.repositoryWriteAttempted === false), bridge, "IDE-150 Bridge", "Critical");
    check("Manual Acceptance Token was issued for Mutation Set", Boolean(token && token.acceptanceMode === "MANUAL" && Array.isArray(token.allowedMutationSet) && token.allowedMutationSet.length === mutationPackage.allowedMutationSet.length && token.allowedMutationSet.length > 0), token, "Acceptance", "Critical");
    let tokenValidation = null;
    if (token && mutationPackage && receipt && v4 && baseline) {
      tokenValidation = await namespace.validateAcceptanceToken(token, {
        candidateId: mutationPackage.candidateId,
        candidateRevisionId: mutationPackage.candidateRevisionId,
        baseRevisionId: mutationPackage.baseRevisionId,
        targetNodeId: v4.targetNodeId,
        canonicalRevisionId: baseline.canonicalRevisionId,
        v4EvidenceId: v4.v4EvidenceId,
        transferPackageId: mutationPackage.transferPackageId,
        receiptId: receipt.receiptId,
        packageHash: receipt.packageHash,
        allowedMutationSet: mutationPackage.allowedMutationSet
      }, { requireCurrentLineage: true });
    }
    check("Acceptance Token validates exact Mutation Set binding", Boolean(tokenValidation && tokenValidation.ok === true), tokenValidation, "Acceptance Binding", "Critical");
    check("Allowed Mutation Set is compact", Boolean(mutationPackage && mutationPackage.allowedMutationSet.every(function each(item) { return !Object.prototype.hasOwnProperty.call(item, "beforeFunctionSource") && !Object.prototype.hasOwnProperty.call(item, "afterFunctionSource"); })), mutationPackage && mutationPackage.allowedMutationSet, "Token Efficiency", "Critical");
    check("No Canonical mutation occurred", Boolean(token && token.mutationAuthorityGranted === false && token.controlledTransactionStarted === false && token.canonicalMutationPerformed === false && bridge.repositoryWriteAttempted === false && scan.canonicalMutationPerformed === false), { token: token, bridge: bridge, scan: scan }, "Safety", "Critical");
    check("Controlled Transaction remains pending", VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented === false, VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented, "Boundary", "Critical");
    check("V5 remains pending", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine was not invoked", Boolean(token && token.syncEngineInvoked === false && VERSION_MANIFEST.implementation.syncEngineImplemented === false), token, "Safety", "Critical");
    check("Phase 11 Gate requires PC + Android + Cross-device real validation", JSON.stringify(VERSION_MANIFEST.validationAuthority.phase11RequiredGateSet) === JSON.stringify({ staticValidation: "required", androidRealValidation: "required", pcRealValidation: "required", crossDeviceRealValidation: "required" }), VERSION_MANIFEST.validationAuthority.phase11RequiredGateSet, "Gate Applicability", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE11-CROSSDEVICE-VALIDATION", "REPOSITORY-010 Phase 11 Hybrid Mutation Package Validation PASS", "REPOSITORY-010 Phase 11 Hybrid Mutation Package Validation FAIL", {
      pcRealDevice: /Windows/i.test(ua) || /Win32/i.test(platform),
      androidSenderRealDevice: Boolean(sender && /Android/i.test(sender.userAgent || "") && sender.realDeviceClaim === "android"),
      crossDeviceRealValidation: true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase11RequiredGateSet),
      releaseAllowed: c.checks.every(function pass(item) { return item.passed === true; }),
      phase11Complete: c.checks.every(function pass(item) { return item.passed === true; }),
      mutationPackageValidated: Boolean(mutationValidation && mutationValidation.valid === true),
      ide150BridgeValidated: Boolean(bridge && bridge.targetValidationResults && bridge.targetValidationResults.every(function each(item) { return item.valid === true; })),
      manualAcceptanceTokenIssued: Boolean(token),
      tokenMutationSetBound: Boolean(tokenValidation && tokenValidation.ok === true),
      smallestSafeMutationFirst: true,
      selectedMutationTypes: mutationPackage ? mutationPackage.mutationSet.map(function type(item) { return item.mutationType; }) : [],
      controlledTransactionImplemented: false,
      canonicalMutationPerformed: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
    internal.markPhase11CrossDeviceValidation(result);
    return result;
  }

  async function launchLocalFirstRepositoryPhase11CrossDeviceValidation() {
    const pre = await runLocalFirstRepositoryPhase11Validation();
    if (!pre || pre.failed > 0 || !global.document || !global.document.body) return internal.buildResult(false, "REPOSITORY010_PHASE11_PREDEVICE_BLOCKED", "Blocked", { preDeviceValidation: pre });
    const old = global.document.getElementById("repository010Phase11Panel");
    if (old) old.remove();

    const panel = global.document.createElement("div");
    panel.id = "repository010Phase11Panel";
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "2147483647";
    panel.style.width = "360px";
    panel.style.maxHeight = "86vh";
    panel.style.overflow = "auto";
    panel.style.background = "#111827";
    panel.style.color = "#f9fafb";
    panel.style.border = "1px solid #374151";
    panel.style.borderRadius = "10px";
    panel.style.padding = "12px";
    panel.style.font = "13px/1.45 sans-serif";
    panel.style.boxShadow = "0 8px 30px rgba(0,0,0,.45)";

    const title = global.document.createElement("div");
    title.textContent = "REPOSITORY-010 Phase 11 Hybrid Mutation Package";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    const status = global.document.createElement("div");
    status.textContent = "Step 1: PC RepositoryをRead-only検証してください。";
    status.style.marginBottom = "8px";

    function button(label) {
      const b = global.document.createElement("button");
      b.textContent = label;
      b.style.display = "block";
      b.style.marginBottom = "8px";
      return b;
    }

    const scanButton = button("1. PC Repositoryを選択・検証");
    const revisionInput = global.document.createElement("input");
    revisionInput.type = "text";
    revisionInput.value = "REPOSITORY010-CANONICAL-REVISION-0004";
    revisionInput.placeholder = "Canonical Revision ID";
    revisionInput.disabled = true;
    revisionInput.style.width = "100%";
    revisionInput.style.boxSizing = "border-box";
    revisionInput.style.marginBottom = "6px";
    const baselineButton = button("2. Project OwnerとしてBaselineを明示確立");
    baselineButton.disabled = true;
    const v2Button = button("3. Android V2 Transfer JSON → V2/V3評価");
    v2Button.disabled = true;
    const v4Button = button("4. V4 Targetを直前再検証");
    v4Button.disabled = true;
    const mutationButton = button("5. Android Mutation Package JSON → Read-only Bridge検証");
    mutationButton.disabled = true;
    const acceptanceButton = button("6. Mutation SetをManual Acceptance TokenへBinding");
    acceptanceButton.disabled = true;

    const note = global.document.createElement("div");
    note.textContent = "Phase 11はFunction-Level Mutation Packageの検証のみ。Canonical書込みは行いません。";
    note.style.opacity = "0.8";
    note.style.marginTop = "4px";

    const v2Input = global.document.createElement("input");
    v2Input.type = "file";
    v2Input.accept = ".json,application/json";
    v2Input.style.display = "none";
    const mutationInput = global.document.createElement("input");
    mutationInput.type = "file";
    mutationInput.accept = ".json,application/json";
    mutationInput.style.display = "none";

    scanButton.addEventListener("click", async function () {
      status.textContent = "PC Repositoryを検証中...";
      const scan = await namespace.selectAndScanDesktopRepository();
      if (scan && scan.ok === true) {
        status.textContent = "PC Repository VERIFIED。Step 2へ。";
        revisionInput.disabled = false;
        baselineButton.disabled = false;
      } else {
        status.textContent = "PC Repository BLOCKED: " + (scan && scan.code || "unknown");
        console.log(JSON.stringify(scan, null, 2));
      }
    });

    baselineButton.addEventListener("click", function () {
      const result = namespace.establishExplicitCanonicalBaseline({ canonicalRevisionId: revisionInput.value, explicitProjectOwnerAction: true });
      if (result && result.ok === true) {
        status.textContent = "Canonical Baseline ESTABLISHED。Step 3へ。";
        revisionInput.disabled = true;
        baselineButton.disabled = true;
        v2Button.disabled = false;
      } else status.textContent = "Baseline BLOCKED: " + (result && result.code || "unknown");
      console.log(JSON.stringify(result, null, 2));
    });

    v2Button.addEventListener("click", function () { v2Input.value = ""; v2Input.click(); });
    v2Input.addEventListener("change", async function () {
      const file = v2Input.files && v2Input.files[0];
      if (!file) return;
      status.textContent = "V2 → V3評価中...";
      const received = await namespace.receiveV2TransferFile(file, { requireAndroidSender: true });
      if (!received || received.ok !== true) { status.textContent = "V2 BLOCKED"; console.log(JSON.stringify(received, null, 2)); return; }
      const v3 = namespace.evaluateV3BaseRevision(received.data.receipt, state.lastCanonicalBaseline);
      if (!v3 || v3.ok !== true || !v3.data || v3.data.baseRevisionMatch !== true || v3.data.blockingConflict === true) {
        status.textContent = "V3 BLOCKED / CONFLICT";
        console.log(JSON.stringify({ received: received, v3: v3 }, null, 2));
        return;
      }
      status.textContent = "V3 BASE MATCH。Step 4へ。";
      v4Button.disabled = false;
      console.log(JSON.stringify({ received: received, v3: v3 }, null, 2));
    });

    v4Button.addEventListener("click", async function () {
      status.textContent = "V4 Targetを再検証中...";
      const freshScan = await namespace.scanDesktopRepositoryDirectory();
      if (!freshScan || freshScan.ok !== true) { status.textContent = "V4 Scan BLOCKED"; console.log(JSON.stringify(freshScan, null, 2)); return; }
      const v4 = namespace.evaluateV4TargetEnvironment(state.lastV3ConflictEvidence, state.lastCanonicalBaseline, freshScan.data);
      if (!v4 || v4.ok !== true || !v4.data || v4.data.v4TargetEnvironmentValidated !== true || v4.data.blockingTargetDrift === true) {
        status.textContent = "V4 BLOCKED / DRIFT";
        console.log(JSON.stringify({ freshScan: freshScan, v4: v4 }, null, 2));
        return;
      }
      status.textContent = "V4 TARGET STABLE。Step 5でMutation Packageを選択してください。";
      mutationButton.disabled = false;
      console.log(JSON.stringify({ freshScan: freshScan, v4: v4 }, null, 2));
    });

    mutationButton.addEventListener("click", function () { mutationInput.value = ""; mutationInput.click(); });
    mutationInput.addEventListener("change", async function () {
      const file = mutationInput.files && mutationInput.files[0];
      if (!file) return;
      status.textContent = "Mutation Package Integrity / V2 Lineage / IDE-150 Bridgeを検証中...";
      const received = await namespace.receiveMutationPackageFile(file, { requireAndroidSender: true });
      if (!received || received.ok !== true) { status.textContent = "Mutation Package BLOCKED: " + (received && received.code || "unknown"); console.log(JSON.stringify(received, null, 2)); return; }
      const bridge = await namespace.validateMutationPackageAgainstDesktopTarget(received.data.mutationPackage);
      if (!bridge || bridge.ok !== true) { status.textContent = "IDE-150 Bridge BLOCKED: " + (bridge && bridge.code || "unknown"); console.log(JSON.stringify({ received: received, bridge: bridge }, null, 2)); return; }
      status.textContent = "Function-Level Mutation Package VALIDATED。Step 6でTokenへBinding。";
      acceptanceButton.disabled = false;
      console.log(JSON.stringify({ mutationPackage: received, bridge: bridge }, null, 2));
    });

    acceptanceButton.addEventListener("click", async function () {
      acceptanceButton.disabled = true;
      const mutationPackage = state.lastMutationPackage;
      if (!mutationPackage || !Array.isArray(mutationPackage.allowedMutationSet) || !mutationPackage.allowedMutationSet.length) {
        status.textContent = "Allowed Mutation Setがありません。";
        return;
      }
      status.textContent = "Manual Acceptance TokenへMutation SetをBinding中...";
      const token = await namespace.issueManualAcceptanceToken({
        v4EvidenceId: state.lastV4TargetValidationEvidence && state.lastV4TargetValidationEvidence.v4EvidenceId,
        allowedMutationSet: mutationPackage.allowedMutationSet,
        acceptedBy: "Project Owner",
        explicitProjectOwnerAction: true
      });
      if (!token || token.ok !== true) {
        status.textContent = "Acceptance BLOCKED: " + (token && token.code || "unknown");
        acceptanceButton.disabled = false;
        console.log(JSON.stringify(token, null, 2));
        return;
      }
      const validation = await runLocalFirstRepositoryPhase11CrossDeviceValidation(token);
      status.textContent = validation.releaseAllowed === true
        ? "Phase 11 PASS：最小Function Mutation + Token Binding確認済み（書込みなし）"
        : "Phase 11 BLOCKED：Gate不一致";
      console.log(JSON.stringify({ acceptance: token, validation: validation, status: namespace.getStatus() }, null, 2));
    });

    [title, status, scanButton, revisionInput, baselineButton, v2Button, v4Button, mutationButton, acceptanceButton, note, v2Input, mutationInput].forEach(function append(item) { panel.appendChild(item); });
    global.document.body.appendChild(panel);

    return internal.buildResult(true, "REPOSITORY010_PHASE11_CROSSDEVICE_UI_READY", "Ready", {
      preDeviceValidation: pre,
      step1: "Select and verify PC Local Repository read-only",
      step2: "Establish Canonical Revision 0004 explicitly",
      step3: "Select Android V2 Transfer JSON and require V3 Base Match",
      step4: "Execute fresh V4 Target drift gate",
      step5: "Select Android Hybrid Mutation Package and validate current target through read-only IDE-150 Bridge",
      step6: "Project Owner issues Manual Acceptance Token bound to non-empty compact Allowed Mutation Set",
      smallestSafeMutationFirst: true,
      phase11EnabledMutationTypes: ["function-patch"],
      canonicalMutationImplemented: false,
      controlledTransactionImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
  }

  function getLocalFirstRepositoryPhase11ValidationStatus() {
    const complete = state.phase11PreDeviceValidationPassed === true && state.crossDevicePhase11ValidationPassed === true;
    return {
      preDevice: internal.clone(state.lastPhase11Validation),
      crossDeviceReal: internal.clone(state.lastPhase11CrossDeviceValidation),
      phase11PreDeviceValidationPassed: state.phase11PreDeviceValidationPassed === true,
      crossDevicePhase11ValidationPassed: state.crossDevicePhase11ValidationPassed === true,
      phase11Complete: complete,
      releaseAllowed: complete,
      mutationPackageStatus: state.mutationPackageStatus,
      lastMutationPackage: internal.clone(state.lastMutationPackage),
      lastIDE150BridgeEvidence: internal.clone(state.lastIDE150BridgeEvidence),
      smallestSafeMutationFirst: true,
      phase11EnabledMutationTypes: ["function-patch"],
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase11RequiredGateSet),
      controlledTransactionImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase11Validation: runLocalFirstRepositoryPhase11Validation,
    runLocalFirstRepositoryPhase11CrossDeviceValidation: runLocalFirstRepositoryPhase11CrossDeviceValidation,
    launchLocalFirstRepositoryPhase11CrossDeviceValidation: launchLocalFirstRepositoryPhase11CrossDeviceValidation,
    getLocalFirstRepositoryPhase11ValidationStatus: getLocalFirstRepositoryPhase11ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase11Validation = {
    id: "REPOSITORY-010-PHASE11-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 11,
    androidRealDeviceRequired: true,
    pcRealDeviceRequired: true,
    crossDeviceRealValidationRequired: true,
    smallestSafeMutationFirst: true,
    phase11EnabledMutationTypes: ["function-patch"],
    controlledTransactionImplemented: false,
    canonicalMutationImplemented: false,
    v5PostReflectionVerificationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase11Validation = runLocalFirstRepositoryPhase11Validation;
  global.runLocalFirstRepositoryPhase11CrossDeviceValidation = runLocalFirstRepositoryPhase11CrossDeviceValidation;
  global.launchLocalFirstRepositoryPhase11CrossDeviceValidation = launchLocalFirstRepositoryPhase11CrossDeviceValidation;
})(typeof window !== "undefined" ? window : globalThis);
