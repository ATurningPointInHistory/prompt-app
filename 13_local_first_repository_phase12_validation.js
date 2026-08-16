/* ============================================================
   FILE: 13_local_first_repository_phase12_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.11.0 / Module: Phase 12 Validation 1.0.0
   Phase 12: Controlled Transaction Trial / Mandatory Rollback
   Required Gate: Android sender + PC real write + normal rollback
                  + forced-failure rollback + final repository restoration
   IMPORTANT: Phase 12 never leaves a persistent Canonical mutation.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 12 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase12Validation");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";

  function collector(group) {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, checkGroup, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: checkGroup || group || "Phase 12", severity: severity || "High" });
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

  async function runLocalFirstRepositoryPhase12Validation() {
    const c = collector("Phase 12 Pre-Device");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;

    check("Prior Phase 11 Cross-device baseline is recorded", Boolean(prior && prior.version === "1.10.1" && Number(prior.phase || 0) === 11 && prior.crossDeviceRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Decision-001..007 are formally frozen", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.length === 7 && /001\.\.007/.test(VERSION_MANIFEST.release.architectureStatus), VERSION_MANIFEST.release, "Architecture", "Critical");
    check("Phase 12 Controlled Transaction Trial is implemented", VERSION_MANIFEST.implementation.phase === 12 && VERSION_MANIFEST.implementation.controlledTransactionTrialImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Persistent Canonical Reflection remains prohibited", VERSION_MANIFEST.implementation.controlledCanonicalTransactionImplemented === false && VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false && VERSION_MANIFEST.implementation.phase12PersistentCanonicalReflectionAllowed === false, VERSION_MANIFEST.implementation, "Boundary", "Critical");
    check("Function-patch remains the only enabled mutation type", JSON.stringify(VERSION_MANIFEST.mutationStrategy.phase12EnabledMutationTypes) === JSON.stringify(["function-patch"]), VERSION_MANIFEST.mutationStrategy, "Strategy", "Critical");
    check("Backup-before-write is required", VERSION_MANIFEST.implementation.functionRollbackBackupImplemented === true && VERSION_MANIFEST.implementation.fullFileEmergencyBackupImplemented === true && VERSION_MANIFEST.safety.controlledTrialWriteRequiresBackup === true, VERSION_MANIFEST.safety, "Backup", "Critical");
    check("Journal-before-write is required", VERSION_MANIFEST.implementation.transactionJournalPersistenceImplemented === true && VERSION_MANIFEST.safety.controlledTrialWriteRequiresJournal === true, VERSION_MANIFEST.safety, "Journal", "Critical");
    check("Acceptance Token consumption is implemented", VERSION_MANIFEST.implementation.acceptanceTokenConsumptionImplemented === true && VERSION_MANIFEST.acceptance.phase12TokenConsumedAtTransactionStart === true, VERSION_MANIFEST.acceptance, "Acceptance", "Critical");
    check("Automatic rollback is implemented", VERSION_MANIFEST.implementation.automaticRollbackImplemented === true && VERSION_MANIFEST.implementation.phase12MandatoryRollback === true, VERSION_MANIFEST.implementation, "Rollback", "Critical");
    check("Reload recovery is implemented", VERSION_MANIFEST.implementation.controlledTransactionReloadRecoveryImplemented === true, VERSION_MANIFEST.implementation, "Recovery", "Critical");
    check("V5 remains unimplemented", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, VERSION_MANIFEST.implementation, "Boundary", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation, "Boundary", "Critical");

    ["acceptanceTokenConsumptionRecord", "controlledTransactionJournalRecord", "functionRollbackBackupRecord", "fullFileEmergencyBackupRecord"].forEach(function contract(key) {
      check("Contract registered: " + key, Boolean(namespace.getContractDefinition && namespace.getContractDefinition(key)), namespace.getContractDefinition && namespace.getContractDefinition(key), "Contract", "Critical");
    });

    const persistenceInit = typeof namespace.initializeControlledTransactionPersistence === "function" ? await namespace.initializeControlledTransactionPersistence() : null;
    const persistence = typeof namespace.getControlledTransactionPersistenceStatus === "function" ? namespace.getControlledTransactionPersistenceStatus() : null;
    check("Controlled Transaction persistence initializes", Boolean(persistenceInit && persistenceInit.ok === true), persistenceInit, "Persistence", "Critical");
    check("Controlled Transaction persistence is separate from Android Replica DB", Boolean(persistence && persistence.separateFromAndroidReplicaPersistence === true), persistence, "Persistence", "Critical");
    check("Transaction persistence has four required stores", Boolean(persistence && Array.isArray(persistence.recordTypes) && ["transactionJournal", "functionBackup", "fullFileBackup", "tokenConsumption"].every(function has(item) { return persistence.recordTypes.indexOf(item) !== -1; })), persistence, "Persistence", "Critical");

    const writeAdapter = typeof namespace.getRestrictedDesktopWriteAdapterStatus === "function" ? namespace.getRestrictedDesktopWriteAdapterStatus() : null;
    check("Restricted Desktop Write Adapter is loaded", Boolean(namespace.modules.desktopWriteAdapter), namespace.modules.desktopWriteAdapter, "Write Adapter", "Critical");
    check("Unrestricted write API is not exposed", Boolean(writeAdapter && writeAdapter.unrestrictedWriteApiExposed === false && writeAdapter.transactionPermitRequired === true && writeAdapter.arbitraryFileCreateAllowed === false && writeAdapter.arbitraryFileDeleteAllowed === false), writeAdapter, "Write Adapter", "Critical");

    const txStatus = typeof namespace.getControlledTransactionStatus === "function" ? namespace.getControlledTransactionStatus() : null;
    check("Controlled Transaction module is loaded", Boolean(namespace.modules.controlledTransaction && txStatus && txStatus.controlledTransactionTrialImplemented === true), txStatus, "Transaction", "Critical");
    check("Mandatory Trial rollback is enforced", Boolean(txStatus && txStatus.mandatoryTrialRollback === true), txStatus, "Transaction", "Critical");

    const ide = global.__IDE150AutoRefactoringInternal;
    check("IDE-150 narrow Function mechanics are available", Boolean(ide && typeof ide.findFunctionBlock === "function" && typeof ide.countFunctionDefinitions === "function" && typeof ide.hashText === "function"), { loaded: Boolean(ide) }, "IDE-150", "Critical");
    const controlledStatus = typeof global.getControlledAutoRefactoringApplicationStatus === "function" ? global.getControlledAutoRefactoringApplicationStatus() : null;
    check("Existing IDE-150 persistent commit remains false", Boolean(controlledStatus && controlledStatus.safety && controlledStatus.safety.persistentCommitAllowed === false && controlledStatus.safety.autoApplyAllowed === false), controlledStatus && controlledStatus.safety, "IDE-150 Safety", "Critical");
    check("Direct Repository mutation remains false", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false && VERSION_MANIFEST.safety.uncontrolledPersistentMutationAllowed === false, VERSION_MANIFEST.safety, "Safety", "Critical");

    const syntheticConsumption = {
      acceptanceTokenId: "REPOSITORY010-PHASE12-PREDEVICE-TOKEN",
      transactionId: "REPOSITORY010-PHASE12-PREDEVICE-TX",
      mutationPackageId: "REPOSITORY010-PHASE12-PREDEVICE-MUTATION",
      candidateId: "REPOSITORY010-PHASE12-PREDEVICE-CANDIDATE",
      candidateRevisionId: "REPOSITORY010-PHASE12-PREDEVICE-REVISION",
      baseRevisionId: "REPOSITORY010-CANONICAL-PHASE12-PREDEVICE",
      canonicalRevisionId: "REPOSITORY010-CANONICAL-PHASE12-PREDEVICE",
      targetNodeId: TARGET_NODE_ID,
      bindingHash: "a".repeat(64),
      allowedMutationSetHashAlgorithm: "SHA-256",
      allowedMutationSetHash: "b".repeat(64),
      oneTimeUseEnforced: true,
      consumedAt: "2026-08-16T06:00:00.000Z",
      consumeReason: "controlled-transaction-trial-start",
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "transaction-start-only",
      immutable: true
    };
    const syntheticFunctionBackup = {
      backupId: "REPOSITORY010-PHASE12-PREDEVICE-FUNCTION-BACKUP",
      transactionId: syntheticConsumption.transactionId,
      mutationPackageId: syntheticConsumption.mutationPackageId,
      mutationId: "REPOSITORY010-PHASE12-PREDEVICE-MUTATION-ID",
      targetFile: "phase12-fixture.js",
      targetFunction: "phase12Fixture",
      beforeFunctionSource: "function phase12Fixture(){return 'before';}",
      beforeFunctionSha256: "c".repeat(64),
      expectedAfterFunctionSha256: "d".repeat(64),
      beforeFileSha256: "e".repeat(64),
      expectedAfterFileSha256: "f".repeat(64),
      backupMode: "function-level-primary",
      createdAt: "2026-08-16T06:00:00.000Z",
      immutable: true
    };
    const syntheticFullBackup = {
      backupId: "REPOSITORY010-PHASE12-PREDEVICE-FULL-BACKUP",
      transactionId: syntheticConsumption.transactionId,
      mutationPackageId: syntheticConsumption.mutationPackageId,
      targetFile: "phase12-fixture.js",
      completeBeforeFileSource: "function phase12Fixture(){return 'before';}",
      beforeFileSha256: "e".repeat(64),
      expectedAfterFileSha256: "f".repeat(64),
      backupMode: "full-file-emergency",
      createdAt: "2026-08-16T06:00:00.000Z",
      immutable: true
    };
    const syntheticJournal = {
      schema: "REPOSITORY-010-CONTROLLED-TRANSACTION-JOURNAL",
      schemaVersion: "1.0.0",
      transactionId: syntheticConsumption.transactionId,
      acceptanceTokenId: syntheticConsumption.acceptanceTokenId,
      mutationPackageId: syntheticConsumption.mutationPackageId,
      candidateId: syntheticConsumption.candidateId,
      candidateRevisionId: syntheticConsumption.candidateRevisionId,
      baseRevisionId: syntheticConsumption.baseRevisionId,
      canonicalRevisionId: syntheticConsumption.canonicalRevisionId,
      targetNodeId: TARGET_NODE_ID,
      targetFile: "phase12-fixture.js",
      targetFunction: "phase12Fixture",
      mutationId: syntheticFunctionBackup.mutationId,
      beforeFunctionSha256: "c".repeat(64),
      afterFunctionSha256: "d".repeat(64),
      beforeFileSha256: "e".repeat(64),
      afterFileSha256: "f".repeat(64),
      functionBackupId: syntheticFunctionBackup.backupId,
      fullFileBackupId: syntheticFullBackup.backupId,
      status: "BACKUP_VERIFIED",
      backupVerified: true,
      journalPersisted: true,
      acceptanceTokenConsumed: false,
      physicalWritePerformed: false,
      readbackVerified: false,
      rollbackAttempted: false,
      rollbackVerified: false,
      emergencyRollbackUsed: false,
      repositoryRestored: false,
      forcedFailureTrial: false,
      canonicalMutationPerformed: false,
      v5PostReflectionVerified: false,
      syncEngineInvoked: false,
      authorityEffect: "controlled-trial-only",
      createdAt: "2026-08-16T06:00:00.000Z",
      updatedAt: "2026-08-16T06:00:00.000Z"
    };
    check("Acceptance Token Consumption contract validates", namespace.validateContract("acceptanceTokenConsumptionRecord", syntheticConsumption).valid === true, namespace.validateContract("acceptanceTokenConsumptionRecord", syntheticConsumption), "Contract Test", "Critical");
    check("Function Backup contract validates", namespace.validateContract("functionRollbackBackupRecord", syntheticFunctionBackup).valid === true, namespace.validateContract("functionRollbackBackupRecord", syntheticFunctionBackup), "Contract Test", "Critical");
    check("Full-File Backup contract validates", namespace.validateContract("fullFileEmergencyBackupRecord", syntheticFullBackup).valid === true, namespace.validateContract("fullFileEmergencyBackupRecord", syntheticFullBackup), "Contract Test", "Critical");
    check("Transaction Journal contract validates", namespace.validateContract("controlledTransactionJournalRecord", syntheticJournal).valid === true, namespace.validateContract("controlledTransactionJournalRecord", syntheticJournal), "Contract Test", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE12-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 12 Pre-Device Validation PASS", "REPOSITORY-010 Phase 12 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase12RequiredGateSet),
      controlledTransactionTrialImplemented: true,
      actualPhysicalWriteExecuted: false,
      realPCWriteValidationRequired: true,
      forcedFailureRealValidationRequired: true,
      canonicalMutationPerformed: false,
      v5PostReflectionVerificationImplemented: false
    });
    internal.markPhase12PreDeviceValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase12CrossDeviceValidation() {
    const c = collector("Phase 12 Cross-device Real");
    const check = c.check;
    const normal = state.lastControlledTransactionTrial;
    const forced = state.lastControlledTransactionForcedFailureTrial;
    const mutation = state.lastMutationPackage;
    const sender = state.lastMutationPackageValidation && state.lastMutationPackageValidation.senderEvidence;
    const baseline = state.lastCanonicalBaseline;
    const v4 = state.lastV4TargetValidationEvidence;
    const pcReal = /Windows/i.test(String(global.navigator && global.navigator.userAgent || ""));
    const androidReal = Boolean(sender && /Android/i.test(String(sender.userAgent || "")) && sender.realDeviceClaim === "android");

    check("Phase 12 pre-device validation passes", Boolean(state.lastPhase12Validation && state.lastPhase12Validation.failed === 0), state.lastPhase12Validation, "Pre-Device", "Critical");
    check("Receiver runtime is PC real environment", pcReal, { userAgent: global.navigator && global.navigator.userAgent, platform: global.navigator && global.navigator.platform }, "PC Real Environment", "Critical");
    check("Android Mutation Package sender evidence is present", androidReal, sender, "Android Real Environment", "Critical");
    check("Explicit Canonical Baseline is current", Boolean(baseline && baseline.explicitlyEstablished === true && baseline.integrityStatus === "verified"), baseline, "Canonical Baseline", "Critical");
    check("V4 Target Environment is stable", Boolean(v4 && v4.v4TargetEnvironmentValidated === true && v4.blockingTargetDrift === false), v4, "V4", "Critical");
    check("Mutation Package remains Function-Level and V2-bound", Boolean(mutation && mutation.mutationCount === 1 && mutation.mutationSet && mutation.mutationSet[0] && mutation.mutationSet[0].mutationType === "function-patch" && state.lastMutationPackageValidation && state.lastMutationPackageValidation.v2LineageMatch === true), { mutationPackage: mutation, validation: state.lastMutationPackageValidation }, "Mutation", "Critical");
    check("IDE-150 read-only Bridge target match remains valid", Boolean(state.lastIDE150BridgeEvidence && state.lastIDE150BridgeEvidence.repositoryWriteAttempted === false && state.lastIDE150BridgeEvidence.targetValidationResults && state.lastIDE150BridgeEvidence.targetValidationResults.every(function each(item) { return item.valid === true; })), state.lastIDE150BridgeEvidence, "IDE-150 Bridge", "Critical");

    check("Normal Controlled Transaction performed a real physical write", Boolean(normal && normal.physicalWritePerformed === true && normal.forcedFailureTrial === false), normal, "Normal Trial", "Critical");
    check("Normal Controlled Transaction read-back verified", Boolean(normal && normal.readbackVerified === true), normal, "Normal Trial", "Critical");
    check("Normal Controlled Transaction rolled back and restored original Repository", Boolean(normal && normal.rollbackVerified === true && normal.repositoryRestored === true && normal.status === "TRIAL_ROLLED_BACK"), normal, "Normal Trial", "Critical");
    check("Normal Trial Acceptance Token was consumed", Boolean(normal && normal.acceptanceTokenConsumed === true && state.acceptanceTokenConsumptionRecords.has(normal.acceptanceTokenId)), normal && state.acceptanceTokenConsumptionRecords.get(normal.acceptanceTokenId), "Token Consumption", "Critical");

    check("Forced Failure Trial performed a real physical write", Boolean(forced && forced.physicalWritePerformed === true && forced.forcedFailureTrial === true), forced, "Forced Failure Trial", "Critical");
    check("Forced Failure was automatically rolled back", Boolean(forced && forced.rollbackVerified === true && forced.repositoryRestored === true && forced.status === "FORCED_FAILURE_ROLLED_BACK"), forced, "Forced Failure Trial", "Critical");
    check("Forced Failure used a different one-time Acceptance Token", Boolean(normal && forced && normal.acceptanceTokenId !== forced.acceptanceTokenId && state.acceptanceTokenConsumptionRecords.has(forced.acceptanceTokenId)), { normalToken: normal && normal.acceptanceTokenId, forcedToken: forced && forced.acceptanceTokenId }, "Token One-Time", "Critical");

    let normalJournal = null;
    let forcedJournal = null;
    let normalFunctionBackup = null;
    let normalFullBackup = null;
    if (normal && typeof namespace.getControlledTransactionRecord === "function") {
      normalJournal = await namespace.getControlledTransactionRecord("transactionJournal", normal.transactionId);
      normalFunctionBackup = await namespace.getControlledTransactionRecord("functionBackup", normal.functionBackupId);
      normalFullBackup = await namespace.getControlledTransactionRecord("fullFileBackup", normal.fullFileBackupId);
    }
    if (forced && typeof namespace.getControlledTransactionRecord === "function") forcedJournal = await namespace.getControlledTransactionRecord("transactionJournal", forced.transactionId);
    check("Normal Trial persistent Journal is terminal and restored", Boolean(normalJournal && normalJournal.status === "TRIAL_ROLLED_BACK" && normalJournal.repositoryRestored === true), normalJournal, "Persistent Journal", "Critical");
    check("Forced Failure persistent Journal is terminal and restored", Boolean(forcedJournal && forcedJournal.status === "FORCED_FAILURE_ROLLED_BACK" && forcedJournal.repositoryRestored === true), forcedJournal, "Persistent Journal", "Critical");
    check("Function-Level Primary Backup persisted", Boolean(normalFunctionBackup && normalFunctionBackup.backupMode === "function-level-primary"), normalFunctionBackup && { backupId: normalFunctionBackup.backupId, targetFile: normalFunctionBackup.targetFile, targetFunction: normalFunctionBackup.targetFunction, beforeFunctionSha256: normalFunctionBackup.beforeFunctionSha256 }, "Backup", "Critical");
    check("Full-File Emergency Backup persisted", Boolean(normalFullBackup && normalFullBackup.backupMode === "full-file-emergency"), normalFullBackup && { backupId: normalFullBackup.backupId, targetFile: normalFullBackup.targetFile, beforeFileSha256: normalFullBackup.beforeFileSha256 }, "Backup", "Critical");

    const writeAdapter = internal.phase12DesktopWriteAdapter;
    const finalRead = normal && writeAdapter ? await writeAdapter.inspectExactTarget(normal.targetFile) : null;
    check("Final actual target file is restored to original Before File SHA-256", Boolean(finalRead && finalRead.ok === true && normal && finalRead.data.sha256 === normal.beforeFileSha256), finalRead && { targetFile: finalRead.data.targetFile, finalSha256: finalRead.data.sha256, expected: normal && normal.beforeFileSha256 }, "Final Repository", "Critical");
    check("No lasting Canonical mutation occurred", Boolean(normal && forced && normal.canonicalMutationPerformed === false && forced.canonicalMutationPerformed === false), { normal: normal && normal.canonicalMutationPerformed, forced: forced && forced.canonicalMutationPerformed }, "Safety", "Critical");
    check("V5 remains pending", VERSION_MANIFEST.implementation.v5PostReflectionVerificationImplemented === false, false, "Boundary", "Critical");
    check("Sync Engine was not invoked", VERSION_MANIFEST.implementation.syncEngineImplemented === false, false, "Safety", "Critical");

    const allPassed = c.checks.every(function pass(item) { return item.passed === true; });
    const result = summarize(c.checks, "REPOSITORY-010-PHASE12-CROSSDEVICE-VALIDATION", "REPOSITORY-010 Phase 12 Controlled Transaction Trial Validation PASS", "REPOSITORY-010 Phase 12 Controlled Transaction Trial Validation FAIL", {
      pcRealDevice: pcReal,
      androidSenderRealDevice: androidReal,
      crossDeviceRealValidation: pcReal && androidReal,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase12RequiredGateSet),
      releaseAllowed: allPassed,
      phase12Complete: allPassed,
      normalTrialRestored: Boolean(normal && normal.repositoryRestored === true && normal.rollbackVerified === true),
      forcedFailureTrialRestored: Boolean(forced && forced.repositoryRestored === true && forced.rollbackVerified === true),
      acceptanceTokenConsumptionImplemented: true,
      backupAndJournalPersistenceVerified: Boolean(normalJournal && forcedJournal && normalFunctionBackup && normalFullBackup),
      canonicalMutationPerformed: false,
      controlledCanonicalTransactionImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    });
    internal.markPhase12CrossDeviceValidation(result);
    return result;
  }

  async function launchLocalFirstRepositoryPhase12Validation() {
    const pre = await runLocalFirstRepositoryPhase12Validation();
    if (!pre || pre.failed > 0 || !global.document || !global.document.body) return internal.buildResult(false, "REPOSITORY010_PHASE12_PREDEVICE_BLOCKED", "Blocked", { preDeviceValidation: pre });
    const old = global.document.getElementById("repository010Phase12Panel");
    if (old) old.remove();

    const panel = global.document.createElement("div");
    panel.id = "repository010Phase12Panel";
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "2147483647";
    panel.style.width = "390px";
    panel.style.maxHeight = "88vh";
    panel.style.overflow = "auto";
    panel.style.background = "#111827";
    panel.style.color = "#f9fafb";
    panel.style.border = "1px solid #374151";
    panel.style.borderRadius = "10px";
    panel.style.padding = "12px";
    panel.style.font = "13px/1.45 sans-serif";
    panel.style.boxShadow = "0 8px 30px rgba(0,0,0,.45)";

    const title = global.document.createElement("div");
    title.textContent = "REPOSITORY-010 Phase 12 Controlled Transaction Trial";
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
      b.style.width = "100%";
      return b;
    }

    const scanButton = button("1. PC RepositoryをRead-only検証");
    const revisionInput = global.document.createElement("input");
    revisionInput.type = "text";
    revisionInput.value = "REPOSITORY010-CANONICAL-REVISION-0006";
    revisionInput.style.width = "100%";
    revisionInput.style.boxSizing = "border-box";
    revisionInput.style.marginBottom = "6px";
    revisionInput.disabled = true;
    const baselineButton = button("2. Project OwnerとしてBaseline 0006を確立"); baselineButton.disabled = true;
    const v2Button = button("3. Android V2 JSON → V2/V3評価"); v2Button.disabled = true;
    const v4Button = button("4. V4 Targetを直前再検証"); v4Button.disabled = true;
    const mutationButton = button("5. Android Mutation JSON → IDE-150 Bridge"); mutationButton.disabled = true;
    const tokenButton = button("6. Project Owner Manual Token発行"); tokenButton.disabled = true;
    const writeDirButton = button("7. 同じPC RepositoryをRestricted Read-Writeで選択"); writeDirButton.disabled = true;
    const normalButton = button("8. REAL Controlled Trial → 必ずRollback"); normalButton.disabled = true;
    const secondTokenButton = button("9. Forced Failure用の新しいManual Token発行"); secondTokenButton.disabled = true;
    const forcedButton = button("10. REAL Forced Failure Trial → Automatic Rollback"); forcedButton.disabled = true;

    const note = global.document.createElement("div");
    note.textContent = "⚠ Step 8/10はPC実ファイルへ一時的にFunctionを書込みます。どちらも元のSHA-256へRollbackできなければCriticalで停止します。";
    note.style.opacity = "0.9";
    note.style.marginTop = "6px";

    const v2Input = global.document.createElement("input"); v2Input.type = "file"; v2Input.accept = ".json,application/json"; v2Input.style.display = "none";
    const mutationInput = global.document.createElement("input"); mutationInput.type = "file"; mutationInput.accept = ".json,application/json"; mutationInput.style.display = "none";

    scanButton.addEventListener("click", async function () {
      status.textContent = "PC RepositoryをRead-only検証中...";
      const scan = await namespace.selectAndScanDesktopRepository();
      if (scan && scan.ok === true) { status.textContent = "Read-only VERIFIED。Step 2へ。"; revisionInput.disabled = false; baselineButton.disabled = false; }
      else { status.textContent = "Read-only BLOCKED: " + (scan && scan.code || "unknown"); console.log(JSON.stringify(scan, null, 2)); }
    });

    baselineButton.addEventListener("click", function () {
      const result = namespace.establishExplicitCanonicalBaseline({ canonicalRevisionId: revisionInput.value, explicitProjectOwnerAction: true });
      console.log(JSON.stringify(result, null, 2));
      if (result && result.ok === true) { status.textContent = "Canonical Baseline ESTABLISHED。Step 3へ。"; revisionInput.disabled = true; baselineButton.disabled = true; v2Button.disabled = false; }
      else status.textContent = "Baseline BLOCKED: " + (result && result.code || "unknown");
    });

    v2Button.addEventListener("click", function () { v2Input.value = ""; v2Input.click(); });
    v2Input.addEventListener("change", async function () {
      const file = v2Input.files && v2Input.files[0]; if (!file) return;
      status.textContent = "V2 → V3評価中...";
      const received = await namespace.receiveV2TransferFile(file, { requireAndroidSender: true });
      if (!received || received.ok !== true) { status.textContent = "V2 BLOCKED"; console.log(JSON.stringify(received, null, 2)); return; }
      const v3 = namespace.evaluateV3BaseRevision(received.data.receipt, state.lastCanonicalBaseline);
      console.log(JSON.stringify({ received: received, v3: v3 }, null, 2));
      if (!v3 || v3.ok !== true || !v3.data || v3.data.baseRevisionMatch !== true || v3.data.blockingConflict === true) { status.textContent = "V3 BLOCKED / CONFLICT"; return; }
      status.textContent = "V3 BASE MATCH。Step 4へ。"; v4Button.disabled = false;
    });

    v4Button.addEventListener("click", async function () {
      status.textContent = "V4 Targetを再検証中...";
      const fresh = await namespace.scanDesktopRepositoryDirectory();
      if (!fresh || fresh.ok !== true) { status.textContent = "V4 Scan BLOCKED"; console.log(JSON.stringify(fresh, null, 2)); return; }
      const v4 = namespace.evaluateV4TargetEnvironment(state.lastV3ConflictEvidence, state.lastCanonicalBaseline, fresh.data);
      console.log(JSON.stringify({ freshScan: fresh, v4: v4 }, null, 2));
      if (!v4 || v4.ok !== true || !v4.data || v4.data.v4TargetEnvironmentValidated !== true || v4.data.blockingTargetDrift === true) { status.textContent = "V4 BLOCKED / DRIFT"; return; }
      status.textContent = "V4 TARGET STABLE。Step 5へ。"; mutationButton.disabled = false;
    });

    mutationButton.addEventListener("click", function () { mutationInput.value = ""; mutationInput.click(); });
    mutationInput.addEventListener("change", async function () {
      const file = mutationInput.files && mutationInput.files[0]; if (!file) return;
      status.textContent = "Mutation Package / IDE-150 Bridge検証中...";
      const received = await namespace.receiveMutationPackageFile(file, { requireAndroidSender: true });
      if (!received || received.ok !== true) { status.textContent = "Mutation BLOCKED"; console.log(JSON.stringify(received, null, 2)); return; }
      const bridge = await namespace.validateMutationPackageAgainstDesktopTarget(received.data.mutationPackage);
      console.log(JSON.stringify({ mutationPackage: received, bridge: bridge }, null, 2));
      if (!bridge || bridge.ok !== true) { status.textContent = "IDE-150 Bridge BLOCKED"; return; }
      status.textContent = "Mutation + Bridge VALID。Step 6へ。"; tokenButton.disabled = false;
    });

    async function issueFreshToken() {
      const pkg = state.lastMutationPackage;
      if (!pkg || !Array.isArray(pkg.allowedMutationSet) || !pkg.allowedMutationSet.length) return null;
      return namespace.issueManualAcceptanceToken({ v4EvidenceId: state.lastV4TargetValidationEvidence && state.lastV4TargetValidationEvidence.v4EvidenceId, allowedMutationSet: pkg.allowedMutationSet, acceptedBy: "Project Owner", explicitProjectOwnerAction: true });
    }

    tokenButton.addEventListener("click", async function () {
      tokenButton.disabled = true; status.textContent = "Manual Acceptance Token発行中...";
      const token = await issueFreshToken(); console.log(JSON.stringify(token, null, 2));
      if (!token || token.ok !== true) { status.textContent = "Token BLOCKED"; tokenButton.disabled = false; return; }
      status.textContent = "Token ISSUED。Step 7で同じRepositoryをRead-Write選択。"; writeDirButton.disabled = false;
    });

    writeDirButton.addEventListener("click", async function () {
      status.textContent = "Restricted Read-Write Repositoryを選択中...";
      const selected = await namespace.selectRestrictedDesktopWriteDirectory(); console.log(JSON.stringify(selected, null, 2));
      if (!selected || selected.ok !== true) { status.textContent = "Read-Write selection BLOCKED"; return; }
      status.textContent = "Restricted Read-Write SELECTED。Step 8は実書込み+Rollback。"; normalButton.disabled = false;
    });

    normalButton.addEventListener("click", async function () {
      normalButton.disabled = true; status.textContent = "REAL Controlled Trial: Backup → Token Consume → Write → Readback → Rollback...";
      const result = await namespace.executeControlledTransactionTrial({ acceptanceTokenId: state.lastAcceptanceToken && state.lastAcceptanceToken.acceptanceTokenId, mutationPackageId: state.lastMutationPackage && state.lastMutationPackage.mutationPackageId, forceFailureAfterWrite: false });
      console.log(JSON.stringify(result, null, 2));
      if (!result || result.ok !== true || !result.data || result.data.repositoryRestored !== true) { status.textContent = "NORMAL TRIAL BLOCKED / CRITICAL。ログ確認。"; return; }
      status.textContent = "NORMAL TRIAL PASS / ORIGINAL RESTORED。Step 9へ。"; secondTokenButton.disabled = false;
    });

    secondTokenButton.addEventListener("click", async function () {
      secondTokenButton.disabled = true; status.textContent = "Forced Failure用の新Token発行中...";
      const token = await issueFreshToken(); console.log(JSON.stringify(token, null, 2));
      if (!token || token.ok !== true) { status.textContent = "Second Token BLOCKED"; secondTokenButton.disabled = false; return; }
      status.textContent = "Second Token ISSUED。Step 10で強制Failure + Auto Rollback。"; forcedButton.disabled = false;
    });

    forcedButton.addEventListener("click", async function () {
      forcedButton.disabled = true; status.textContent = "REAL Forced Failure Trial: 書込み直後に故意Failure → Automatic Rollback...";
      const result = await namespace.executeControlledTransactionTrial({ acceptanceTokenId: state.lastAcceptanceToken && state.lastAcceptanceToken.acceptanceTokenId, mutationPackageId: state.lastMutationPackage && state.lastMutationPackage.mutationPackageId, forceFailureAfterWrite: true });
      console.log(JSON.stringify(result, null, 2));
      if (!result || result.ok !== true || !result.data || result.data.repositoryRestored !== true) { status.textContent = "FORCED FAILURE ROLLBACK BLOCKED / CRITICAL。ログ確認。"; return; }
      const validation = await runLocalFirstRepositoryPhase12CrossDeviceValidation();
      status.textContent = validation.releaseAllowed === true ? "Phase 12 PASS：Normal + Forced Failureとも実書込み後に完全Rollback済み" : "Phase 12 BLOCKED：Final Gate不一致";
      console.log(JSON.stringify({ forcedFailureTrial: result, validation: validation, status: namespace.getStatus() }, null, 2));
    });

    [title, status, scanButton, revisionInput, baselineButton, v2Button, v4Button, mutationButton, tokenButton, writeDirButton, normalButton, secondTokenButton, forcedButton, note, v2Input, mutationInput].forEach(function append(item) { panel.appendChild(item); });
    global.document.body.appendChild(panel);

    return internal.buildResult(true, "REPOSITORY010_PHASE12_VALIDATION_UI_READY", "Ready", {
      preDeviceValidation: pre,
      canonicalRevisionSuggested: "REPOSITORY010-CANONICAL-REVISION-0006",
      requiresFreshAndroidV2AndMutationPackage: true,
      realPhysicalWriteSteps: [8, 10],
      mandatoryRollback: true,
      controlledCanonicalTransactionImplemented: false,
      v5PostReflectionVerificationImplemented: false
    });
  }

  function getLocalFirstRepositoryPhase12ValidationStatus() {
    const complete = state.phase12PreDeviceValidationPassed === true && state.crossDevicePhase12ValidationPassed === true;
    return {
      preDevice: internal.clone(state.lastPhase12Validation),
      crossDeviceReal: internal.clone(state.lastPhase12CrossDeviceValidation),
      phase12PreDeviceValidationPassed: state.phase12PreDeviceValidationPassed === true,
      crossDevicePhase12ValidationPassed: state.crossDevicePhase12ValidationPassed === true,
      phase12Complete: complete,
      releaseAllowed: complete,
      normalTrial: internal.clone(state.lastControlledTransactionTrial),
      forcedFailureTrial: internal.clone(state.lastControlledTransactionForcedFailureTrial),
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase12RequiredGateSet),
      controlledCanonicalTransactionImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase12Validation: runLocalFirstRepositoryPhase12Validation,
    runLocalFirstRepositoryPhase12CrossDeviceValidation: runLocalFirstRepositoryPhase12CrossDeviceValidation,
    launchLocalFirstRepositoryPhase12Validation: launchLocalFirstRepositoryPhase12Validation,
    getLocalFirstRepositoryPhase12ValidationStatus: getLocalFirstRepositoryPhase12ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase12Validation = {
    id: "REPOSITORY-010-PHASE12-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 12,
    androidRealDeviceRequired: true,
    pcRealDeviceRequired: true,
    crossDeviceRealValidationRequired: true,
    realPhysicalWriteRequired: true,
    normalRollbackRequired: true,
    forcedFailureRollbackRequired: true,
    canonicalMutationImplemented: false,
    v5PostReflectionVerificationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase12Validation = runLocalFirstRepositoryPhase12Validation;
  global.runLocalFirstRepositoryPhase12CrossDeviceValidation = runLocalFirstRepositoryPhase12CrossDeviceValidation;
  global.launchLocalFirstRepositoryPhase12Validation = launchLocalFirstRepositoryPhase12Validation;
})(typeof window !== "undefined" ? window : globalThis);
