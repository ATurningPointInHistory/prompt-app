/* ============================================================
   FILE: 18_self_development_phase5_live_trial_controller.js
   Decision 058 Phase 5A / Explicitly Armed Controlled Live Trial
   IMPORTANT: Validation never calls side-effecting functions in this file.
   Persistent reflection and baseline promotion are prohibited in Phase 5A.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;
  const i = namespace.__internal;
  let arm = null;
  let localLineagePending = null;
  function policy() { return namespace.getSelfDevelopmentPhase5LiveTrialPolicy(); }
  function repo() { return global.REPOSITORY010LocalFirstRepository || null; }
  function result(ok, code, status, data) { return { ok: ok === true, code: code, status: status, data: data || null, at: new Date().toISOString() }; }
  function activeArm() {
    if (!arm) return null;
    if (arm.used === true || Date.now() >= arm.expiresAtMs) return null;
    return arm;
  }
  namespace.armSelfDevelopmentPhase5LiveTrial = function (input) {
    const p = policy(), source = input && typeof input === "object" ? input : {};
    if (source.actorRole !== p.actorRoleRequired || source.explicitProjectOwnerAction !== true || source.confirmationPhrase !== p.armPhrase) {
      return result(false, "SELFDEV058_PHASE5_TRIAL_ARM_BLOCKED", "Blocked", { armed: false, mutationAuthorityGranted: false });
    }
    const readiness = namespace.inspectSelfDevelopmentPhase5LiveTrialReadiness();
    if (!readiness || readiness.platform !== "PC_DESKTOP_CANDIDATE" || readiness.readyForLiveTrialPreparation !== true) {
      return result(false, "SELFDEV058_PHASE5_PC_LIVE_TRIAL_NOT_READY", "Blocked", { armed: false, readiness: readiness, mutationAuthorityGranted: false });
    }
    arm = Object.freeze({
      armId: i.nextId("SELFDEV058-PHASE5-TRIAL-ARM"),
      actorRole: p.actorRoleRequired,
      purpose: "AUTHORIZE_REPOSITORY010_CONTROLLED_TRIAL_ONLY",
      issuedAt: new Date().toISOString(),
      expiresAtMs: Date.now() + p.armValidityMinutes * 60 * 1000,
      used: false,
      adoptionAuthorizationGranted: false,
      persistentReflectionAuthorized: false,
      baselinePromotionAuthorized: false,
      mutationAuthorityGranted: false
    });
    return result(true, "SELFDEV058_PHASE5_TRIAL_ARMED", "Armed", { arm: arm, mutationAuthorityGranted: false });
  };
  namespace.getSelfDevelopmentPhase5TrialArmStatus = function () {
    const current = activeArm();
    return { armed: Boolean(current), arm: current ? JSON.parse(JSON.stringify(current)) : null, persistentReflectionAuthorized: false, baselinePromotionAuthorized: false, mutationAuthorityGranted: false };
  };
  namespace.prepareSelfDevelopmentPhase5SafeMutationPackage = async function (input) {
    const r = repo(), p = policy(), source = input && typeof input === "object" ? input : {};
    if (!r || typeof r.prepareHybridMutationPackage !== "function") return result(false, "SELFDEV058_PHASE5_REPOSITORY_MUTATION_API_UNAVAILABLE", "Blocked");
    const currentArm = activeArm();
    if (!currentArm || source.armId !== currentArm.armId) return result(false, "SELFDEV058_PHASE5_ACTIVE_ARM_REQUIRED", "Blocked", { mutationPackagePrepared: false });
    const beforeSource = `function selfDevelopment058Phase5LiveTrialFixture(value) {\n    return String(value || "").trim();\n  }`;
    const afterSource = `function selfDevelopment058Phase5LiveTrialFixture(value) {\n    return String(value == null ? "" : value).trim();\n  }`;
    const prepared = await r.prepareHybridMutationPackage({
      transferPackageId: source.transferPackageId,
      mutations: [{ mutationType: "function-patch", targetFile: p.targetFile, targetFunction: p.targetFunction, beforeFunctionSource: beforeSource, afterFunctionSource: afterSource }]
    });
    if (!prepared || prepared.ok !== true) {
      return result(false, prepared && prepared.code || "SELFDEV058_PHASE5_MUTATION_PACKAGE_RESULT", prepared && prepared.status || "Blocked", { repositoryResult: prepared, targetFile: p.targetFile, targetFunction: p.targetFunction, canonicalMutationPerformed: false });
    }
    if (typeof r.validateMutationPackageAgainstDesktopTarget !== "function") {
      return result(false, "SELFDEV058_PHASE5_IDE150_TARGET_BRIDGE_UNAVAILABLE", "Blocked", { repositoryResult: prepared, canonicalMutationPerformed: false });
    }
    const pkg = prepared.data && prepared.data.mutationPackage || null;
    const bridge = pkg ? await r.validateMutationPackageAgainstDesktopTarget(pkg) : null;
    const ok = Boolean(pkg && bridge && bridge.ok === true);
    return result(ok, ok ? "SELFDEV058_PHASE5_MUTATION_PACKAGE_AND_TARGET_BRIDGE_READY" : "SELFDEV058_PHASE5_IDE150_TARGET_BRIDGE_BLOCKED", ok ? "Ready" : "Blocked", {
      repositoryResult: prepared,
      targetBridgeResult: bridge,
      mutationPackage: pkg,
      targetFile: p.targetFile,
      targetFunction: p.targetFunction,
      protectedControlPlane: false,
      persistentReflectionAuthorized: false,
      canonicalMutationPerformed: false
    });
  };
  namespace.issueSelfDevelopmentPhase5TrialAcceptanceToken = async function (input) {
    const r = repo(), source = input && typeof input === "object" ? input : {}, currentArm = activeArm();
    if (!currentArm || source.armId !== currentArm.armId) return result(false, "SELFDEV058_PHASE5_ACTIVE_ARM_REQUIRED", "Blocked", { tokenIssued: false });
    if (!r || typeof r.issueManualAcceptanceToken !== "function") return result(false, "SELFDEV058_PHASE5_ACCEPTANCE_API_UNAVAILABLE", "Blocked", { tokenIssued: false });
    const pkg = source.mutationPackage || (r.__internal && r.__internal.state && r.__internal.state.lastMutationPackage) || null;
    if (!pkg || !Array.isArray(pkg.allowedMutationSet) || pkg.allowedMutationSet.length !== 1) return result(false, "SELFDEV058_PHASE5_SINGLE_MUTATION_PACKAGE_REQUIRED", "Blocked", { tokenIssued: false });
    const token = await r.issueManualAcceptanceToken({ v4EvidenceId: source.v4EvidenceId, allowedMutationSet: pkg.allowedMutationSet, acceptedBy: "Project Owner", explicitProjectOwnerAction: true });
    return result(Boolean(token && token.ok === true), token && token.code || "SELFDEV058_PHASE5_TOKEN_RESULT", token && token.status || "Completed", { repositoryResult: token, tokenIssued: Boolean(token && token.ok === true), mutationAuthorityGranted: false, persistentReflectionAuthorized: false });
  };
  namespace.executeSelfDevelopmentPhase5ControlledTrial = async function (input) {
    const r = repo(), source = input && typeof input === "object" ? input : {}, currentArm = activeArm();
    if (!currentArm || source.armId !== currentArm.armId) return result(false, "SELFDEV058_PHASE5_ACTIVE_ARM_REQUIRED", "Blocked", { controlledTrialExecuted: false });
    if (!r || typeof r.executeControlledTransactionTrial !== "function") return result(false, "SELFDEV058_PHASE5_TRIAL_API_UNAVAILABLE", "Blocked", { controlledTrialExecuted: false });
    if (source.forceFailureAfterWrite === true) return result(false, "SELFDEV058_PHASE5_NORMAL_TRIAL_ONLY", "Blocked", { controlledTrialExecuted: false });
    const trial = await r.executeControlledTransactionTrial({ acceptanceTokenId: source.acceptanceTokenId, mutationPackageId: source.mutationPackageId, forceFailureAfterWrite: false });
    const d = trial && trial.data || {};
    const pass = Boolean(trial && trial.ok === true && d.physicalWritePerformed === true && d.readbackVerified === true && d.rollbackVerified === true && d.repositoryRestored === true && d.acceptanceTokenConsumed === true && d.canonicalMutationPerformed === false);
    arm = Object.freeze(Object.assign({}, currentArm, { used: true, usedAt: new Date().toISOString() }));
    const transaction = d.transaction || null;
    if (typeof namespace.recordSelfDevelopmentPhase5TrialAudit === "function") {
      namespace.recordSelfDevelopmentPhase5TrialAudit({
        eventType: pass ? "PHASE5A_CONTROLLED_LIVE_TRIAL_RESTORED" : "PHASE5A_CONTROLLED_LIVE_TRIAL_FAILED",
        armId: currentArm.armId,
        mutationPackageId: source.mutationPackageId || null,
        acceptanceTokenId: source.acceptanceTokenId || null,
        controlledTransactionId: transaction && transaction.transactionId || null,
        physicalWritePerformed: d.physicalWritePerformed === true,
        readbackVerified: d.readbackVerified === true,
        rollbackVerified: d.rollbackVerified === true,
        repositoryRestored: d.repositoryRestored === true,
        tokenConsumed: d.acceptanceTokenConsumed === true
      });
    }
    return result(pass, pass ? "SELFDEV058_PHASE5_CONTROLLED_LIVE_TRIAL_RESTORED" : "SELFDEV058_PHASE5_CONTROLLED_LIVE_TRIAL_FAILED", pass ? "Verified / Restored" : "Blocked", {
      repositoryResult: trial,
      physicalWritePerformed: d.physicalWritePerformed === true,
      readbackVerified: d.readbackVerified === true,
      rollbackVerified: d.rollbackVerified === true,
      repositoryRestored: d.repositoryRestored === true,
      acceptanceTokenConsumed: d.acceptanceTokenConsumed === true,
      persistentReflectionPerformed: false,
      baselinePromotionPerformed: false,
      canonicalMutationPerformed: false
    });
  };


  function cloneValue(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }
  function parseRevisionSequence(value) {
    const match = String(value || "").match(/REPOSITORY010-CANONICAL-REVISION-(\d+)$/);
    return match ? Number(match[1]) : -1;
  }
  async function latestCanonicalBaselineRecord(r) {
    if (!r || typeof r.listPersistedLocalFirstRepositoryRecords !== "function") return null;
    const list = await r.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const valid = (Array.isArray(list) ? list : []).filter(function (item) {
      return item && item.explicitlyEstablished === true && item.establishedBy === "Project Owner" && item.integrityStatus === "verified";
    }).sort(function (a, b) {
      const ar = parseRevisionSequence(a.canonicalRevisionId), br = parseRevisionSequence(b.canonicalRevisionId);
      if (ar !== br) return ar - br;
      return String(a.establishedAt || "").localeCompare(String(b.establishedAt || ""));
    });
    return valid.length ? cloneValue(valid[valid.length - 1]) : null;
  }
  async function canonicalIntegrityRecord(r, revisionId) {
    if (!r || typeof r.listPersistedLocalFirstRepositoryRecords !== "function") return null;
    const list = await r.listPersistedLocalFirstRepositoryRecords("integrityRecord");
    const matches = (Array.isArray(list) ? list : []).filter(function (item) {
      return item && item.revisionId === revisionId && item.integrityStatus === "verified";
    }).sort(function (a, b) { return String(a.hashGeneratedAt || "").localeCompare(String(b.hashGeneratedAt || "")); });
    return matches.length ? cloneValue(matches[matches.length - 1]) : null;
  }
  function pcScanMatchesBaseline(scan, baseline) {
    return Boolean(scan && baseline && scan.readOnly === true && scan.writeAttempted === false && scan.canonicalMutationPerformed === false &&
      scan.descriptor && scan.descriptor.projectId === baseline.projectId && scan.descriptor.repositoryId === baseline.repositoryId && scan.descriptor.nodeId === baseline.sourceNodeId &&
      scan.directoryName === baseline.directoryName && scan.staticManifest && scan.staticManifest.manifestHash === baseline.manifestHash &&
      scan.staticManifest.scriptSetHash === baseline.scriptSetHash && Number(scan.staticManifest.scriptCount || 0) === Number(baseline.scriptCount || 0) &&
      scan.integrity && scan.integrity.status === "verified" && scan.integrity.allFileHashesVerified === true && scan.integrity.scriptSetVerified === true &&
      scan.integrity.manifestHashVerified === true && scan.integrity.indexSequenceMatches === true);
  }

  namespace.prepareSelfDevelopmentPhase5LocalTrialLineage = async function () {
    const r = repo();
    if (!r || !r.__internal || !r.__internal.state) return result(false, "SELFDEV058_PHASE5_REPOSITORY_UNAVAILABLE", "Blocked", { localLineagePrepared: false });
    const required = ["initializeLocalFirstRepositoryPersistence", "listPersistedLocalFirstRepositoryRecords", "stageOfflineRepositoryWork", "prepareLocalSyncCandidate", "prepareLocalTransferPackage", "downloadV2TransferEnvelope"];
    const missing = required.filter(function (name) { return typeof r[name] !== "function"; });
    if (missing.length) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_API_UNAVAILABLE", "Blocked", { missing: missing, localLineagePrepared: false });

    const persistence = await r.initializeLocalFirstRepositoryPersistence();
    if (!persistence || persistence.ok !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_PERSISTENCE_BLOCKED", "Blocked", { repositoryResult: persistence, localLineagePrepared: false });
    const baseline = await latestCanonicalBaselineRecord(r);
    if (!baseline) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_BASELINE_REQUIRED", "Blocked", { localLineagePrepared: false });
    const integrity = await canonicalIntegrityRecord(r, baseline.canonicalRevisionId);
    if (!integrity) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_CANONICAL_INTEGRITY_REQUIRED", "Blocked", { canonicalRevisionId: baseline.canonicalRevisionId, localLineagePrepared: false });

    let scan = r.__internal.state.lastDesktopRepositoryScan ? cloneValue(r.__internal.state.lastDesktopRepositoryScan) : null;
    if (!pcScanMatchesBaseline(scan, baseline)) {
      if (typeof r.selectAndScanDesktopRepository !== "function") return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_PC_SCAN_API_UNAVAILABLE", "Blocked", { localLineagePrepared: false });
      const selected = await r.selectAndScanDesktopRepository();
      if (!selected || selected.ok !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_PC_SCAN_BLOCKED", "Blocked", { repositoryResult: selected, localLineagePrepared: false });
      scan = selected.data;
    }
    if (!pcScanMatchesBaseline(scan, baseline)) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_PC_BASELINE_MISMATCH", "Blocked", { baseline: baseline, scan: scan, localLineagePrepared: false });

    r.__internal.state.lastCanonicalBaseline = cloneValue(baseline);
    const stamp = String(Date.now());
    const replicaNodeId = "SELFDEV058-PC-LOCAL-TRIAL-REPLICA";
    const revisionId = "SELFDEV058-PC-LOCAL-TRIAL-REVISION-" + stamp;
    const stagingId = "SELFDEV058-PC-LOCAL-TRIAL-STAGING-" + stamp;
    const staged = await r.stageOfflineRepositoryWork({
      nodeIdentity: { projectId: baseline.projectId, repositoryId: baseline.repositoryId, nodeId: replicaNodeId, nodeType: "replica" },
      revision: { revisionId: revisionId, baseRevisionId: baseline.canonicalRevisionId, parentRevisionId: baseline.canonicalRevisionId, sourceNodeId: replicaNodeId },
      integrityRecord: {
        integrityRecordId: "SELFDEV058-PC-LOCAL-TRIAL-INTEGRITY-" + stamp,
        revisionId: revisionId,
        fileHashes: cloneValue(integrity.fileHashes || {}),
        manifestHash: baseline.manifestHash,
        scriptSetHash: baseline.scriptSetHash,
        contentHash: integrity.contentHash || "",
        repositoryStateHash: integrity.repositoryStateHash || "",
        integrityStatus: "verified"
      },
      stagingDescriptor: { stagingId: stagingId, repositoryId: baseline.repositoryId },
      stateRecordId: "SELFDEV058-PC-LOCAL-TRIAL-STAGED-STATE-" + stamp
    });
    if (!staged || staged.ok !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_STAGING_BLOCKED", "Blocked", { repositoryResult: staged, localLineagePrepared: false });

    const candidateResult = await r.prepareLocalSyncCandidate(stagingId, { syncCandidateId: "SELFDEV058-PC-LOCAL-TRIAL-CANDIDATE-" + stamp });
    if (!candidateResult || candidateResult.ok !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_CANDIDATE_BLOCKED", "Blocked", { repositoryResult: candidateResult, localLineagePrepared: false });
    const candidate = candidateResult.data && candidateResult.data.syncCandidate;
    const transferResult = await r.prepareLocalTransferPackage(candidate && candidate.syncCandidateId, { transferPackageId: "SELFDEV058-PC-LOCAL-TRIAL-TRANSFER-" + stamp });
    if (!transferResult || transferResult.ok !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_TRANSFER_BLOCKED", "Blocked", { repositoryResult: transferResult, localLineagePrepared: false });
    const transferPackage = transferResult.data && transferResult.data.transferPackage;

    const exported = await r.downloadV2TransferEnvelope(transferPackage, {
      sourceNodeId: replicaNodeId,
      userAgent: "SELF-DEVELOPMENT-058 PC Local Trial",
      platform: "PC_LOCAL_USER_SELECTED_LOOPBACK",
      origin: global.location && global.location.origin || "local",
      realDeviceClaim: "pc-local-trial"
    });
    if (!exported || exported.ok !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_EXPORT_BLOCKED", "Blocked", { repositoryResult: exported, localLineagePrepared: false });

    localLineagePending = Object.freeze({
      baseline: cloneValue(baseline),
      scan: cloneValue(scan),
      stagingId: stagingId,
      syncCandidateId: candidate && candidate.syncCandidateId || null,
      transferPackageId: transferPackage && transferPackage.transferPackageId || null,
      expectedPackageHash: transferPackage && transferPackage.packageHash || null,
      exportedFilename: exported.data && exported.data.filename || null,
      preparedAt: new Date().toISOString()
    });
    return result(true, "SELFDEV058_PHASE5_PC_LOCAL_TRIAL_PACKAGE_EXPORTED", "Awaiting User Selection", {
      lineageMode: "PC_LOCAL_USER_SELECTED_LOOPBACK",
      localOnly: true,
      androidSyncRequired: false,
      physicalCrossDeviceTransferPerformed: false,
      v2UserSelectionRequired: true,
      exportedFilename: localLineagePending.exportedFilename,
      baselineId: baseline.canonicalBaselineDescriptorId || null,
      canonicalRevisionId: baseline.canonicalRevisionId,
      transferPackageId: localLineagePending.transferPackageId,
      localLineagePrepared: false,
      nextAction: "Select the exported JSON with ②B to satisfy the frozen V2 user-selection boundary.",
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false
    });
  };

  namespace.receiveSelfDevelopmentPhase5LocalTrialLineage = async function () {
    const r = repo();
    if (!localLineagePending) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_EXPORT_REQUIRED", "Blocked", { localLineagePrepared: false });
    const required = ["receiveV2TransferFile", "evaluateV3BaseRevision", "evaluateV4TargetEnvironment", "persistLocalFirstRepositoryRecord"];
    const missing = required.filter(function (name) { return !r || typeof r[name] !== "function"; });
    if (missing.length) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_RECEIVE_API_UNAVAILABLE", "Blocked", { missing: missing, localLineagePrepared: false });
    if (typeof global.showOpenFilePicker !== "function") return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_FILE_PICKER_UNAVAILABLE", "Blocked", { localLineagePrepared: false });

    let file;
    try {
      const handles = await global.showOpenFilePicker({ multiple: false, types: [{ description: "SELF-DEVELOPMENT-058 PC Local Trial V2 Package", accept: { "application/json": [".json"] } }] });
      if (!handles || !handles[0]) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_FILE_SELECTION_REQUIRED", "Blocked", { localLineagePrepared: false });
      file = await handles[0].getFile();
    } catch (error) {
      return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_FILE_SELECTION_CANCELLED", "Blocked", { localLineagePrepared: false, message: error && error.message ? error.message : String(error) });
    }

    const received = await r.receiveV2TransferFile(file, { requireAndroidSender: false });
    if (!received || received.ok !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_V2_BLOCKED", "Blocked", { repositoryResult: received, localLineagePrepared: false });
    const receipt = received.data && received.data.receipt;
    const receivedPackage = received.data && received.data.transferPackage;
    if (!receivedPackage || receivedPackage.transferPackageId !== localLineagePending.transferPackageId || receivedPackage.packageHash !== localLineagePending.expectedPackageHash) {
      return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_SELECTED_PACKAGE_MISMATCH", "Blocked", {
        expectedTransferPackageId: localLineagePending.transferPackageId,
        actualTransferPackageId: receivedPackage && receivedPackage.transferPackageId || null,
        localLineagePrepared: false
      });
    }
    if (!receipt || receipt.receivedViaUserSelection !== true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_USER_SELECTION_PROOF_REQUIRED", "Blocked", { receipt: receipt || null, localLineagePrepared: false });
    await r.persistLocalFirstRepositoryRecord("v2TransferReceipt", receipt);

    const baseline = cloneValue(localLineagePending.baseline);
    const v3 = r.evaluateV3BaseRevision(receipt, baseline, { conflictEvidenceId: "SELFDEV058-PC-LOCAL-TRIAL-V3-" + Date.now(), v3GateId: "SELFDEV058-PC-LOCAL-TRIAL-V3-GATE-" + Date.now() });
    if (!v3 || v3.ok !== true || !v3.data || v3.data.blockingConflict === true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_V3_BLOCKED", "Blocked", { repositoryResult: v3, localLineagePrepared: false });
    if (v3.data.evidence) await r.persistLocalFirstRepositoryRecord("v3ConflictEvidence", v3.data.evidence);

    let freshScan = localLineagePending.scan;
    if (typeof r.scanDesktopRepositoryDirectory === "function") {
      const rescanned = await r.scanDesktopRepositoryDirectory();
      if (rescanned && rescanned.ok === true) freshScan = rescanned.data;
    }
    if (!pcScanMatchesBaseline(freshScan, baseline)) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_FRESH_SCAN_BLOCKED", "Blocked", { baseline: baseline, scan: freshScan, localLineagePrepared: false });
    const stamp = String(Date.now());
    const v4 = r.evaluateV4TargetEnvironment(v3.data.evidence, baseline, freshScan, { v4EvidenceId: "SELFDEV058-PC-LOCAL-TRIAL-V4-" + stamp, v4GateId: "SELFDEV058-PC-LOCAL-TRIAL-V4-GATE-" + stamp });
    if (!v4 || v4.ok !== true || !v4.data || v4.data.v4TargetEnvironmentValidated !== true || v4.data.blockingTargetDrift === true) return result(false, "SELFDEV058_PHASE5_LOCAL_LINEAGE_V4_BLOCKED", "Blocked", { repositoryResult: v4, localLineagePrepared: false });
    if (v4.data.evidence) await r.persistLocalFirstRepositoryRecord("v4TargetValidationEvidence", v4.data.evidence);

    r.__internal.state.lastCanonicalBaseline = cloneValue(baseline);
    const ready = {
      lineageMode: "PC_LOCAL_USER_SELECTED_LOOPBACK",
      localOnly: true,
      androidSyncRequired: false,
      physicalCrossDeviceTransferPerformed: false,
      v2UserSelectionVerified: true,
      baselineId: baseline.canonicalBaselineDescriptorId || null,
      canonicalRevisionId: baseline.canonicalRevisionId,
      stagingId: localLineagePending.stagingId,
      syncCandidateId: localLineagePending.syncCandidateId,
      transferPackageId: receivedPackage.transferPackageId,
      receiptId: receipt.receiptId,
      v3EvidenceId: v3.data.evidence && v3.data.evidence.conflictEvidenceId || null,
      v4EvidenceId: v4.data.evidence && v4.data.evidence.v4EvidenceId || null,
      localLineagePrepared: true,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false
    };
    localLineagePending = null;
    return result(true, "SELFDEV058_PHASE5_PC_LOCAL_TRIAL_LINEAGE_READY", "Ready", ready);
  };

  namespace.exportSelfDevelopmentPhase5AndroidPcVerificationPackage = async function () {
    const r = repo();
    const ua = global.navigator && global.navigator.userAgent || "";
    if (!/Android/i.test(ua)) return result(false, "SELFDEV058_PHASE5_ANDROID_DEVICE_REQUIRED", "Blocked", { packageExported: false, androidOnly: true });
    if (!r || typeof r.getCurrentLocalFirstRepositoryReplicaBaselineReference !== "function" || typeof r.listOfflineStagedRepositoryWork !== "function" || typeof r.prepareLocalFirstRepositoryAndroidToPcSyncExport !== "function") {
      return result(false, "SELFDEV058_PHASE5_ANDROID_PC_VERIFY_API_UNAVAILABLE", "Blocked", { packageExported: false });
    }
    const baseline = await r.getCurrentLocalFirstRepositoryReplicaBaselineReference();
    if (!baseline) return result(false, "SELFDEV058_PHASE5_ANDROID_REPLICA_BASELINE_REQUIRED", "Blocked", { packageExported: false });
    const staged = await r.listOfflineStagedRepositoryWork();
    const compatible = (Array.isArray(staged) ? staged : []).filter(function (item) {
      return item && item.lifecycleStatus === "staged" && item.baseRevisionId === baseline.canonicalRevisionId;
    }).sort(function (a, b) { return String(a.createdAt || "").localeCompare(String(b.createdAt || "")); });
    if (!compatible.length) return result(false, "SELFDEV058_PHASE5_ANDROID_CURRENT_STAGING_REQUIRED", "Blocked", {
      packageExported: false,
      currentReplicaBaselineRevisionId: baseline.canonicalRevisionId,
      message: "現在のReplica Baselineを基準にしたAndroid Stagingがありません。古いStagingを自動流用しません。"
    });
    const latest = compatible[compatible.length - 1];
    const exported = await r.prepareLocalFirstRepositoryAndroidToPcSyncExport({ stagingId: latest.stagingId, download: true });
    if (exported && exported.ok === true && exported.code === "REPOSITORY010_SYNC_ENGINE_NO_CHANGE") {
      return result(true, "SELFDEV058_PHASE5_ANDROID_PC_VERIFY_NO_CHANGE", "Matched / Package Not Required", {
        packageExported: false,
        noChange: true,
        stagingId: latest.stagingId,
        baseCanonicalRevisionId: baseline.canonicalRevisionId,
        repositoryMatchIndicated: true,
        repositoryResult: exported,
        authorityEffect: "none"
      });
    }
    return result(Boolean(exported && exported.ok === true), exported && exported.code || "SELFDEV058_PHASE5_ANDROID_PC_VERIFY_EXPORT_RESULT", exported && exported.status || "Completed", {
      packageExported: Boolean(exported && exported.ok === true),
      stagingId: latest.stagingId,
      baseCanonicalRevisionId: baseline.canonicalRevisionId,
      repositoryResult: exported,
      authorityEffect: "none"
    });
  };

})(typeof window !== "undefined" ? window : globalThis);
