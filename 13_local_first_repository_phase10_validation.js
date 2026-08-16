/* ============================================================
   FILE: 13_local_first_repository_phase10_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.9.0 / Module: Phase 10 Validation 1.0.0
   Phase 10: Manual Acceptance Token / Authority Gate
   Required Gate: PC + Android sender lineage + Cross-device V4 + Manual Token
   IMPORTANT: No Canonical write / no Controlled Transaction / no V5.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 10 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase10Validation");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const TOKEN_TTL_SECONDS = 900;

  function collector(group) {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, checkGroup, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: checkGroup || group || "Phase 10", severity: severity || "High" });
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

  function syntheticFixture() {
    const projectId = "AI-PROMPT-OS-MAIN";
    const repositoryId = "AI-PROMPT-OS-REPOSITORY";
    const sourceNodeId = "REPOSITORY010-PHASE10-PREDEVICE-ANDROID-NODE";
    const canonicalRevisionId = "REPOSITORY010-CANONICAL-REVISION-PHASE10-PREDEVICE";
    const candidateRevisionId = "REPOSITORY010-PHASE10-PREDEVICE-CANDIDATE-REVISION";
    const candidateId = "REPOSITORY010-PHASE10-PREDEVICE-CANDIDATE";
    const transferPackageId = "REPOSITORY010-PHASE10-PREDEVICE-TRANSFER";
    const receiptId = "REPOSITORY010-PHASE10-PREDEVICE-RECEIPT";
    const v3GateId = "REPOSITORY010-PHASE10-PREDEVICE-V3-GATE";
    const v3EvidenceId = "REPOSITORY010-PHASE10-PREDEVICE-V3-EVIDENCE";
    const v4GateId = "REPOSITORY010-PHASE10-PREDEVICE-V4-GATE";
    const v4EvidenceId = "REPOSITORY010-PHASE10-PREDEVICE-V4-EVIDENCE";
    const packageHash = "a".repeat(64);

    const baseline = {
      canonicalBaselineDescriptorId: "REPOSITORY010-PHASE10-PREDEVICE-BASELINE",
      projectId: projectId,
      repositoryId: repositoryId,
      canonicalRevisionId: canonicalRevisionId,
      sourceNodeId: TARGET_NODE_ID,
      directoryName: "AI_Prompt_OS",
      manifestHash: "b".repeat(64),
      scriptSetHash: "c".repeat(64),
      scriptCount: 250,
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
      establishedAt: "2026-08-16T01:30:00.000Z",
      immutable: true
    };

    const receipt = {
      receiptId: receiptId,
      transferPackageId: transferPackageId,
      projectId: projectId,
      repositoryId: repositoryId,
      sourceNodeId: sourceNodeId,
      targetNodeId: TARGET_NODE_ID,
      revisionId: candidateRevisionId,
      baseRevisionId: canonicalRevisionId,
      packageHashAlgorithm: "SHA-256",
      packageHash: packageHash,
      receiverCalculatedPackageHash: packageHash,
      envelopeHash: "d".repeat(64),
      senderRuntimeVersion: "1.9.0",
      senderOrigin: "https://example.invalid",
      senderUserAgent: "Mozilla/5.0 (Linux; Android 10) Mobile",
      transportMode: "explicit-file-transfer",
      sourceFileName: "phase10-predevice.json",
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
      receivedAt: "2026-08-16T01:30:01.000Z",
      immutable: true
    };

    const v3 = {
      conflictEvidenceId: v3EvidenceId,
      v3GateId: v3GateId,
      receiptId: receiptId,
      transferPackageId: transferPackageId,
      projectId: projectId,
      repositoryId: repositoryId,
      sourceNodeId: sourceNodeId,
      targetNodeId: TARGET_NODE_ID,
      candidateRevisionId: candidateRevisionId,
      candidateBaseRevisionId: canonicalRevisionId,
      canonicalRevisionId: canonicalRevisionId,
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
      validatedAt: "2026-08-16T01:30:02.000Z",
      immutable: true
    };

    const v4 = {
      v4EvidenceId: v4EvidenceId,
      v4GateId: v4GateId,
      v3ConflictEvidenceId: v3EvidenceId,
      v3GateId: v3GateId,
      receiptId: receiptId,
      transferPackageId: transferPackageId,
      projectId: projectId,
      repositoryId: repositoryId,
      sourceNodeId: sourceNodeId,
      targetNodeId: TARGET_NODE_ID,
      candidateRevisionId: candidateRevisionId,
      candidateBaseRevisionId: canonicalRevisionId,
      canonicalRevisionId: canonicalRevisionId,
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
      validatedAt: "2026-08-16T01:30:03.000Z",
      immutable: true
    };

    const transferPackage = {
      transferPackageId: transferPackageId,
      syncCandidateId: candidateId,
      projectId: projectId,
      repositoryId: repositoryId,
      sourceNodeId: sourceNodeId,
      revisionId: candidateRevisionId,
      baseRevisionId: canonicalRevisionId,
      integrityRecordId: "REPOSITORY010-PHASE10-PREDEVICE-INTEGRITY",
      candidateStateRecordId: "REPOSITORY010-PHASE10-PREDEVICE-CANDIDATE-STATE",
      v1GateId: "REPOSITORY010-PHASE10-PREDEVICE-V1-GATE",
      integritySnapshot: {
        hashAlgorithm: "SHA-256",
        fileHashes: { "index.html": "e".repeat(64) },
        manifestHash: baseline.manifestHash,
        scriptSetHash: baseline.scriptSetHash,
        contentHash: "f".repeat(64),
        repositoryStateHash: "1".repeat(64),
        integrityStatus: "verified",
        hashGeneratedAt: "2026-08-16T01:30:00.500Z"
      },
      packageHashAlgorithm: "SHA-256",
      packageHash: packageHash,
      integrityPreflightStatus: "verified",
      integrityPreflightPassed: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: "2026-08-16T01:30:00.700Z",
      immutable: true
    };

    return {
      baseline: baseline,
      receipt: receipt,
      v3: v3,
      v4: v4,
      envelope: { transferPackage: transferPackage },
      candidateId: candidateId
    };
  }

  async function runLocalFirstRepositoryPhase10Validation() {
    const c = collector("Phase 10 Pre-Device");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;

    check("Prior Phase 9 Cross-device release baseline is recorded", Boolean(prior && Number(prior.phase || 0) >= 9 && prior.version === "1.8.0" && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Decision-001..005 are formally frozen", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.length === 5 && /001\.\.005/.test(VERSION_MANIFEST.release.architectureStatus), VERSION_MANIFEST.release, "Architecture", "Critical");
    check("Phase 10 implements Manual Acceptance Token", VERSION_MANIFEST.implementation.phase === 10 && VERSION_MANIFEST.implementation.explicitAcceptanceImplemented === true && VERSION_MANIFEST.implementation.manualAcceptanceTokenImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Acceptance Token contract is registered", Boolean(namespace.getContractDefinition("acceptanceTokenDescriptor")), namespace.getContractDefinition("acceptanceTokenDescriptor"), "Contract", "Critical");
    check("Acceptance Token module is loaded", Boolean(namespace.modules.acceptanceToken), namespace.modules.acceptanceToken, "Module", "Critical");
    check("Initial Token TTL is exactly 15 minutes", VERSION_MANIFEST.acceptance && VERSION_MANIFEST.acceptance.tokenLifetimeSeconds === TOKEN_TTL_SECONDS, VERSION_MANIFEST.acceptance, "Decision-005 Profile", "Critical");
    check("Delegated Acceptance remains disabled by default", VERSION_MANIFEST.acceptance && VERSION_MANIFEST.acceptance.delegatedAcceptanceEnabled === false && VERSION_MANIFEST.safety.delegatedAcceptanceDefaultEnabled === false, VERSION_MANIFEST.acceptance, "Automation Boundary", "Critical");
    check("Canonical mutation remains prohibited", VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety, "Safety", "Critical");
    check("Controlled Transaction remains pending", VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented === false, VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented, "Boundary", "Critical");
    check("V5 remains pending", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");

    const saved = {
      acceptanceTokens: new Map(state.acceptanceTokenDescriptors),
      consumptions: new Map(state.acceptanceTokenConsumptionRecords),
      revocations: new Map(state.acceptanceTokenRevocationRecords),
      lastToken: internal.clone(state.lastAcceptanceToken),
      acceptanceStatus: state.acceptanceStatus,
      baseline: internal.clone(state.lastCanonicalBaseline),
      v3: internal.clone(state.lastV3ConflictEvidence),
      receipt: internal.clone(state.lastV2TransferReceipt),
      envelope: internal.clone(state.lastV2TransferEnvelope),
      v4: internal.clone(state.lastV4TargetValidationEvidence),
      moduleStatus: namespace.modules.acceptanceToken && namespace.modules.acceptanceToken.status
    };

    try {
      state.acceptanceTokenDescriptors.clear();
      state.acceptanceTokenConsumptionRecords.clear();
      state.acceptanceTokenRevocationRecords.clear();
      state.lastAcceptanceToken = null;
      const fixture = syntheticFixture();
      state.lastCanonicalBaseline = internal.clone(fixture.baseline);
      state.lastV3ConflictEvidence = internal.clone(fixture.v3);
      state.lastV2TransferReceipt = internal.clone(fixture.receipt);
      state.lastV2TransferEnvelope = internal.clone(fixture.envelope);
      state.lastV4TargetValidationEvidence = internal.clone(fixture.v4);

      const tokenResult = await namespace.issueManualAcceptanceToken({
        v4EvidenceId: fixture.v4.v4EvidenceId,
        allowedMutationSet: [],
        acceptedBy: "Project Owner",
        explicitProjectOwnerAction: true,
        acceptanceTokenId: "REPOSITORY010-PHASE10-PREDEVICE-TOKEN"
      });
      const token = tokenResult && tokenResult.data && tokenResult.data.acceptanceToken;
      check("Project Owner explicit action issues Manual Acceptance Token", Boolean(tokenResult && tokenResult.ok === true && tokenResult.code === "REPOSITORY010_MANUAL_ACCEPTANCE_TOKEN_ISSUED" && token), tokenResult, "Manual Acceptance", "Critical");
      check("Token binds exact Candidate / Revision / Base / Target / Canonical", Boolean(token && token.candidateId === fixture.candidateId && token.candidateRevisionId === fixture.v4.candidateRevisionId && token.baseRevisionId === fixture.v4.candidateBaseRevisionId && token.targetNodeId === fixture.v4.targetNodeId && token.canonicalRevisionId === fixture.baseline.canonicalRevisionId), token, "Token Binding", "Critical");
      check("Token binds V4 / Transfer / Receipt lineage", Boolean(token && token.v4EvidenceId === fixture.v4.v4EvidenceId && token.transferPackageId === fixture.v4.transferPackageId && token.receiptId === fixture.receipt.receiptId && token.packageHash === fixture.receipt.packageHash), token, "Token Binding", "Critical");
      check("Phase 10 Token explicitly authorizes no mutation set", Boolean(token && Array.isArray(token.allowedMutationSet) && token.allowedMutationSet.length === 0), token && token.allowedMutationSet, "Authority Gate", "Critical");
      check("Token is One-Time and expires in 900 seconds", Boolean(token && token.oneTimeUse === true && Number(token.tokenTtlSeconds) === TOKEN_TTL_SECONDS && Date.parse(token.expiresAt) - Date.parse(token.issuedAt) === TOKEN_TTL_SECONDS * 1000), token, "TTL / Replay", "Critical");
      check("Token is Explicit Acceptance but not Mutation Authority", Boolean(token && token.explicitAcceptanceGranted === true && token.validationIsApproval === false && token.mutationAuthorityGranted === false && token.canonicalMutationPerformed === false && token.controlledTransactionStarted === false), token, "Authority Boundary", "Critical");

      const valid = token ? await namespace.validateAcceptanceToken(token.acceptanceTokenId, {
        candidateId: token.candidateId,
        candidateRevisionId: token.candidateRevisionId,
        baseRevisionId: token.baseRevisionId,
        targetNodeId: token.targetNodeId,
        canonicalRevisionId: token.canonicalRevisionId,
        v4EvidenceId: token.v4EvidenceId,
        transferPackageId: token.transferPackageId,
        receiptId: token.receiptId,
        packageHash: token.packageHash,
        allowedMutationSet: []
      }) : null;
      check("Correctly bound Token validates for future Controlled Transaction start", Boolean(valid && valid.ok === true && valid.data.validForControlledTransactionStart === true), valid, "Token Validation", "Critical");

      const wrongCandidate = token ? await namespace.validateAcceptanceToken(token.acceptanceTokenId, { candidateId: "DIFFERENT-CANDIDATE" }) : null;
      check("Token cannot be reused for a different Candidate", Boolean(wrongCandidate && wrongCandidate.ok === false && wrongCandidate.data && wrongCandidate.data.reasons.indexOf("candidateId-mismatch") !== -1), wrongCandidate, "Binding Attack", "Critical");

      const wrongTarget = token ? await namespace.validateAcceptanceToken(token.acceptanceTokenId, { targetNodeId: "DIFFERENT-TARGET" }) : null;
      check("Token cannot be reused for a different Target", Boolean(wrongTarget && wrongTarget.ok === false && wrongTarget.data && wrongTarget.data.reasons.indexOf("targetNodeId-mismatch") !== -1), wrongTarget, "Binding Attack", "Critical");

      const expired = token ? await namespace.validateAcceptanceToken(token.acceptanceTokenId, {}, { nowMs: Date.parse(token.expiresAt) + 1 }) : null;
      check("Expired Token is blocked", Boolean(expired && expired.ok === false && expired.data && expired.data.reasons.indexOf("token-expired") !== -1), expired, "TTL", "Critical");

      if (token) state.acceptanceTokenConsumptionRecords.set(token.acceptanceTokenId, internal.deepFreeze({ acceptanceTokenId: token.acceptanceTokenId, transactionId: "PHASE10-SYNTHETIC-CONSUMED", consumedAt: internal.nowIso(), immutable: true }));
      const replay = token ? await namespace.validateAcceptanceToken(token.acceptanceTokenId) : null;
      check("Consumed Token replay is blocked", Boolean(replay && replay.ok === false && replay.data && replay.data.reasons.indexOf("token-already-consumed") !== -1), replay, "Replay", "Critical");
      if (token) state.acceptanceTokenConsumptionRecords.delete(token.acceptanceTokenId);

      const noExplicit = await namespace.issueManualAcceptanceToken({ v4EvidenceId: fixture.v4.v4EvidenceId, allowedMutationSet: [], acceptedBy: "Project Owner", explicitProjectOwnerAction: false });
      check("Manual Token cannot issue without explicit Project Owner action", Boolean(noExplicit && noExplicit.ok === false && noExplicit.code === "REPOSITORY010_MANUAL_ACCEPTANCE_EXPLICIT_ACTION_REQUIRED"), noExplicit, "Authority", "Critical");

      const impersonated = await namespace.issueManualAcceptanceToken({ v4EvidenceId: fixture.v4.v4EvidenceId, allowedMutationSet: [], acceptedBy: "Automation", explicitProjectOwnerAction: true });
      check("Automated process cannot impersonate Project Owner", Boolean(impersonated && impersonated.ok === false && impersonated.code === "REPOSITORY010_MANUAL_ACCEPTANCE_PROJECT_OWNER_REQUIRED"), impersonated, "Authority", "Critical");
    } finally {
      state.acceptanceTokenDescriptors.clear(); saved.acceptanceTokens.forEach(function restore(v, k) { state.acceptanceTokenDescriptors.set(k, v); });
      state.acceptanceTokenConsumptionRecords.clear(); saved.consumptions.forEach(function restore(v, k) { state.acceptanceTokenConsumptionRecords.set(k, v); });
      state.acceptanceTokenRevocationRecords.clear(); saved.revocations.forEach(function restore(v, k) { state.acceptanceTokenRevocationRecords.set(k, v); });
      state.lastAcceptanceToken = saved.lastToken;
      state.acceptanceStatus = saved.acceptanceStatus;
      state.lastCanonicalBaseline = saved.baseline;
      state.lastV3ConflictEvidence = saved.v3;
      state.lastV2TransferReceipt = saved.receipt;
      state.lastV2TransferEnvelope = saved.envelope;
      state.lastV4TargetValidationEvidence = saved.v4;
      if (namespace.modules.acceptanceToken) namespace.modules.acceptanceToken.status = saved.moduleStatus || "Ready";
      internal.touch();
    }

    const result = summarize(c.checks, "REPOSITORY-010-PHASE10-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 10 Pre-Device Validation PASS", "REPOSITORY-010 Phase 10 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet),
      tokenTtlSeconds: TOKEN_TTL_SECONDS,
      manualAcceptanceImplemented: true,
      delegatedAcceptanceEnabled: false,
      controlledTransactionImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
    internal.markPhase10PreDeviceValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase10CrossDeviceValidation(tokenResult) {
    if (state.phase10PreDeviceValidationPassed !== true) await runLocalFirstRepositoryPhase10Validation();
    const c = collector("Phase 10 PC / Cross-device Real");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;
    const token = tokenResult && tokenResult.data && tokenResult.data.acceptanceToken
      ? tokenResult.data.acceptanceToken
      : (state.lastAcceptanceToken || null);
    const v4 = state.lastV4TargetValidationEvidence || null;
    const v3 = state.lastV3ConflictEvidence || null;
    const receipt = state.lastV2TransferReceipt || null;
    const baseline = state.lastCanonicalBaseline || null;
    const scan = state.lastDesktopRepositoryScan || null;

    const ua = String(global.navigator && global.navigator.userAgent || "");
    const platform = String(global.navigator && global.navigator.platform || "");
    const pcReal = /Windows NT/i.test(ua) && /Win/i.test(platform || ua);
    const androidSender = Boolean(receipt && /Android/i.test(String(receipt.senderUserAgent || "")));
    const tokenValidation = token ? await namespace.validateAcceptanceToken(token.acceptanceTokenId, {
      candidateRevisionId: v4 && v4.candidateRevisionId,
      baseRevisionId: v4 && v4.candidateBaseRevisionId,
      targetNodeId: v4 && v4.targetNodeId,
      canonicalRevisionId: baseline && baseline.canonicalRevisionId,
      v4EvidenceId: v4 && v4.v4EvidenceId,
      transferPackageId: v4 && v4.transferPackageId,
      receiptId: receipt && receipt.receiptId,
      packageHash: receipt && receipt.packageHash,
      allowedMutationSet: []
    }) : null;

    check("Phase 10 pre-device validation passes", state.phase10PreDeviceValidationPassed === true, state.lastPhase10Validation, "Pre-Device", "Critical");
    check("Prior Phase 9 Cross-device baseline remains inherited", Boolean(prior && Number(prior.phase || 0) >= 9 && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Receiver runtime is PC real environment", pcReal, { userAgent: ua, platform: platform }, "PC Real Environment", "Critical");
    check("Android sender lineage evidence is present", androidSender, receipt && receipt.senderUserAgent, "Android Real Environment", "Critical");
    check("PC Local Repository was freshly verified read-only", Boolean(scan && scan.readOnly === true && scan.writeAttempted === false && scan.integrity && scan.integrity.status === "verified"), scan, "PC Repository", "Critical");
    check("Canonical Baseline is explicitly established", Boolean(baseline && baseline.explicitlyEstablished === true && baseline.establishedBy === "Project Owner" && baseline.integrityStatus === "verified"), baseline, "Canonical Baseline", "Critical");
    check("V2 integrity remains validated", Boolean(receipt && receipt.v2TransferIntegrityValidated === true && receipt.packageHash === receipt.receiverCalculatedPackageHash), receipt, "V2 Prerequisite", "Critical");
    check("V3 Base Revision match remains valid", Boolean(v3 && v3.baseRevisionMatch === true && v3.blockingConflict === false && v3.conflictDetected === false), v3, "V3 Prerequisite", "Critical");
    check("V4 Target Environment remains stable", Boolean(v4 && v4.v4TargetEnvironmentValidated === true && v4.targetEnvironmentMatch === true && v4.blockingTargetDrift === false), v4, "V4 Prerequisite", "Critical");
    check("Manual Acceptance Token was issued", Boolean(tokenResult && tokenResult.ok === true && token && token.acceptanceMode === "MANUAL"), tokenResult, "Acceptance", "Critical");
    check("Acceptance Token validates against current lineage", Boolean(tokenValidation && tokenValidation.ok === true && tokenValidation.data.validForControlledTransactionStart === true), tokenValidation, "Acceptance", "Critical");
    check("Token is bound to Project Owner explicit action", Boolean(token && token.acceptedBy === "Project Owner" && token.issuerIdentity === "Project Owner" && token.explicitProjectOwnerAction === true), token, "Authority", "Critical");
    check("Token lifetime is 15 minutes", Boolean(token && Number(token.tokenTtlSeconds) === TOKEN_TTL_SECONDS && Date.parse(token.expiresAt) - Date.parse(token.issuedAt) === TOKEN_TTL_SECONDS * 1000), token, "TTL", "Critical");
    check("Token is One-Time and not consumed or revoked", Boolean(token && token.oneTimeUse === true && token.consumedAt == null && token.revokedAt == null && !(state.acceptanceTokenConsumptionRecords instanceof Map && state.acceptanceTokenConsumptionRecords.has(token.acceptanceTokenId)) && !(state.acceptanceTokenRevocationRecords instanceof Map && state.acceptanceTokenRevocationRecords.has(token.acceptanceTokenId))), token, "Replay", "Critical");
    check("Phase 10 Authority Gate grants no mutation set", Boolean(token && Array.isArray(token.allowedMutationSet) && token.allowedMutationSet.length === 0), token && token.allowedMutationSet, "Phase Boundary", "Critical");
    check("Validation is not Approval", Boolean(token && token.validationIsApproval === false), token, "Authority", "Critical");
    check("Acceptance Token itself grants no mutation authority", Boolean(token && token.explicitAcceptanceGranted === true && token.mutationAuthorityGranted === false && token.controlledTransactionStarted === false), token, "Authority", "Critical");
    check("No Canonical mutation occurred", Boolean(token && token.canonicalMutationPerformed === false && scan && scan.canonicalMutationPerformed === false && VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false), { token: token, scan: scan }, "Safety", "Critical");
    check("Controlled Transaction remains pending", VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented === false, VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented, "Boundary", "Critical");
    check("Delegated Acceptance remains disabled", VERSION_MANIFEST.acceptance.delegatedAcceptanceEnabled === false, VERSION_MANIFEST.acceptance, "Automation Boundary", "Critical");
    check("V5 remains pending", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented, "Boundary", "Critical");
    check("Sync Engine was not invoked", Boolean(token && token.syncEngineInvoked === false && VERSION_MANIFEST.implementation.syncEngineImplemented === false), token, "Safety", "Critical");
    check("Phase 10 Gate requires PC + Android lineage + Cross-device real validation", VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet.pcRealValidation === "required" && VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet.androidRealValidation === "required" && VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet.crossDeviceRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet, "Gate Applicability", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE10-CROSSDEVICE-VALIDATION", "REPOSITORY-010 Phase 10 Manual Acceptance Token Validation PASS", "REPOSITORY-010 Phase 10 Manual Acceptance Token Validation FAIL", {
      pcRealDevice: pcReal,
      androidSenderRealDevice: androidSender,
      crossDeviceRealValidation: pcReal && androidSender,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet),
      releaseAllowed: c.checks.every(function all(item) { return item.passed; }),
      phase10Complete: c.checks.every(function all(item) { return item.passed; }),
      manualAcceptanceTokenIssued: Boolean(token),
      acceptanceTokenId: token && token.acceptanceTokenId || null,
      tokenTtlSeconds: TOKEN_TTL_SECONDS,
      tokenValidForControlledTransactionStart: Boolean(tokenValidation && tokenValidation.ok === true),
      delegatedAcceptanceEnabled: false,
      controlledTransactionImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
    internal.markPhase10CrossDeviceValidation(result);
    return result;
  }

  async function launchLocalFirstRepositoryPhase10CrossDeviceValidation() {
    const pre = await runLocalFirstRepositoryPhase10Validation();
    if (!pre || pre.failed !== 0) return internal.buildResult(false, "REPOSITORY010_PHASE10_PREDEVICE_BLOCKED", "Blocked", pre);
    if (!global.document || !global.document.body) return internal.buildResult(false, "REPOSITORY010_PHASE10_UI_UNAVAILABLE", "Blocked", pre);

    const old = global.document.getElementById("repository010-phase10-panel");
    if (old) old.remove();
    const panel = global.document.createElement("div");
    panel.id = "repository010-phase10-panel";
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "2147483647";
    panel.style.width = "min(430px, calc(100vw - 24px))";
    panel.style.maxHeight = "80vh";
    panel.style.overflow = "auto";
    panel.style.background = "#111";
    panel.style.color = "#fff";
    panel.style.border = "1px solid #555";
    panel.style.borderRadius = "10px";
    panel.style.padding = "12px";
    panel.style.font = "13px/1.45 sans-serif";
    panel.style.boxShadow = "0 8px 30px rgba(0,0,0,.45)";

    const title = global.document.createElement("div");
    title.textContent = "REPOSITORY-010 Phase 10 Manual Acceptance Token";
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
    revisionInput.value = "REPOSITORY010-CANONICAL-REVISION-0003";
    revisionInput.placeholder = "Canonical Revision ID";
    revisionInput.disabled = true;
    revisionInput.style.width = "100%";
    revisionInput.style.boxSizing = "border-box";
    revisionInput.style.marginBottom = "6px";
    const baselineButton = button("2. Project OwnerとしてBaselineを明示確立");
    baselineButton.disabled = true;
    const fileButton = button("3. Android Transfer JSONを選択 → V2/V3評価");
    fileButton.disabled = true;
    const v4Button = button("4. V4 Targetを直前再検証");
    v4Button.disabled = true;
    const acceptanceButton = button("5. Project Owner Manual Acceptance Token発行（15分）");
    acceptanceButton.disabled = true;

    const note = global.document.createElement("div");
    note.textContent = "Phase 10はAuthority Gateのみ。allowedMutationSet=[]、Canonical書込みは行いません。";
    note.style.opacity = "0.8";
    note.style.marginTop = "4px";

    const input = global.document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    scanButton.addEventListener("click", async function () {
      status.textContent = "PC Repositoryを検証中...";
      const scan = await namespace.selectAndScanDesktopRepository();
      if (scan && scan.ok === true) {
        status.textContent = "PC Repository VERIFIED。Step 2でCanonical Revisionを明示確立してください。";
        revisionInput.disabled = false;
        baselineButton.disabled = false;
      } else {
        status.textContent = "PC Repository検証 BLOCKED: " + (scan && scan.code || "unknown");
        console.log(JSON.stringify(scan, null, 2));
      }
    });

    baselineButton.addEventListener("click", function () {
      const result = namespace.establishExplicitCanonicalBaseline({ canonicalRevisionId: revisionInput.value, explicitProjectOwnerAction: true });
      if (result && result.ok === true) {
        status.textContent = "Canonical Baseline ESTABLISHED: " + result.data.baseline.canonicalRevisionId + "。Step 3へ進めます。";
        revisionInput.disabled = true;
        baselineButton.disabled = true;
        fileButton.disabled = false;
      } else status.textContent = "Canonical Baseline BLOCKED: " + (result && result.code || "unknown");
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
        acceptanceButton.disabled = true;
        console.log(JSON.stringify({ received: received, v3: v3, status: namespace.getStatus() }, null, 2));
        return;
      }
      status.textContent = "V3 BASE MATCH。Step 4でTargetを直前再検証してください。";
      v4Button.disabled = false;
      acceptanceButton.disabled = true;
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
      if (!v4 || v4.ok !== true || !v4.data || v4.data.v4TargetEnvironmentValidated !== true || v4.data.blockingTargetDrift === true) {
        status.textContent = "V4 BLOCKED：Target DriftまたはGate不一致";
        acceptanceButton.disabled = true;
      } else {
        status.textContent = "V4 TARGET STABLE。Step 5でProject Owner Manual Acceptanceを実行してください。";
        acceptanceButton.disabled = false;
      }
      console.log(JSON.stringify({ freshScan: freshScan, v4: v4, status: namespace.getStatus() }, null, 2));
    });

    acceptanceButton.addEventListener("click", async function () {
      acceptanceButton.disabled = true;
      status.textContent = "Manual Acceptance Tokenを発行中...";
      const token = await namespace.issueManualAcceptanceToken({
        v4EvidenceId: state.lastV4TargetValidationEvidence && state.lastV4TargetValidationEvidence.v4EvidenceId,
        allowedMutationSet: [],
        acceptedBy: "Project Owner",
        explicitProjectOwnerAction: true
      });
      if (!token || token.ok !== true) {
        status.textContent = "Acceptance BLOCKED: " + (token && token.code || "unknown");
        acceptanceButton.disabled = false;
        console.log(JSON.stringify(token, null, 2));
        return;
      }
      const validation = await runLocalFirstRepositoryPhase10CrossDeviceValidation(token);
      status.textContent = validation.releaseAllowed === true
        ? "Phase 10 PASS：Manual Acceptance Token発行済み（15分 / One-Time / Canonical変更なし）"
        : "Phase 10 BLOCKED：Acceptance Gate不一致";
      console.log(JSON.stringify({ acceptance: token, validation: validation, status: namespace.getStatus() }, null, 2));
    });

    [title, status, scanButton, revisionInput, baselineButton, fileButton, v4Button, acceptanceButton, note, input].forEach(function append(item) { panel.appendChild(item); });
    global.document.body.appendChild(panel);

    return internal.buildResult(true, "REPOSITORY010_PHASE10_CROSSDEVICE_UI_READY", "Ready", {
      preDeviceValidation: pre,
      step1: "Select and verify PC Local Repository read-only",
      step2: "Project Owner explicitly establishes current Canonical Revision ID",
      step3: "Select Android V2 Transfer JSON and require V3 Base Match",
      step4: "Freshly rescan target environment and execute V4 drift gate",
      step5: "Project Owner explicitly issues 15-minute One-Time Manual Acceptance Token",
      phase10AllowedMutationSet: [],
      manualAcceptanceImplemented: true,
      delegatedAcceptanceEnabled: false,
      controlledTransactionImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
  }

  function getLocalFirstRepositoryPhase10ValidationStatus() {
    const complete = state.phase10PreDeviceValidationPassed === true && state.crossDevicePhase10ValidationPassed === true;
    return {
      preDevice: internal.clone(state.lastPhase10Validation),
      crossDeviceReal: internal.clone(state.lastPhase10CrossDeviceValidation),
      phase10PreDeviceValidationPassed: state.phase10PreDeviceValidationPassed === true,
      crossDevicePhase10ValidationPassed: state.crossDevicePhase10ValidationPassed === true,
      phase10Complete: complete,
      releaseAllowed: complete,
      manualAcceptanceTokenIssued: Boolean(state.lastAcceptanceToken),
      lastAcceptanceToken: internal.clone(state.lastAcceptanceToken),
      tokenTtlSeconds: TOKEN_TTL_SECONDS,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase10RequiredGateSet),
      delegatedAcceptanceEnabled: false,
      controlledTransactionImplemented: false,
      canonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase10Validation: runLocalFirstRepositoryPhase10Validation,
    runLocalFirstRepositoryPhase10CrossDeviceValidation: runLocalFirstRepositoryPhase10CrossDeviceValidation,
    launchLocalFirstRepositoryPhase10CrossDeviceValidation: launchLocalFirstRepositoryPhase10CrossDeviceValidation,
    getLocalFirstRepositoryPhase10ValidationStatus: getLocalFirstRepositoryPhase10ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase10Validation = {
    id: "REPOSITORY-010-PHASE10-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 10,
    androidRealDeviceRequired: true,
    pcRealDeviceRequired: true,
    crossDeviceRealValidationRequired: true,
    manualAcceptanceTokenImplemented: true,
    delegatedAcceptanceEnabled: false,
    controlledTransactionImplemented: false,
    canonicalMutationImplemented: false,
    v5PostReflectionVerificationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase10Validation = runLocalFirstRepositoryPhase10Validation;
  global.runLocalFirstRepositoryPhase10CrossDeviceValidation = runLocalFirstRepositoryPhase10CrossDeviceValidation;
  global.launchLocalFirstRepositoryPhase10CrossDeviceValidation = launchLocalFirstRepositoryPhase10CrossDeviceValidation;
})(typeof window !== "undefined" ? window : globalThis);
