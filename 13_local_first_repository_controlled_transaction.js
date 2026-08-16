/* ============================================================
   FILE: 13_local_first_repository_controlled_transaction.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.11.0 / Module: Controlled Transaction Trial 1.0.0
   Phase 12: Backup -> Journal -> Token Consume -> Function Write
             -> Read-back -> Mandatory Rollback
   Decision-007: Controlled Canonical Transaction Responsibility Boundary
   IMPORTANT: Phase 12 never leaves the Canonical Repository mutated.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Controlled Transaction blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("controlledTransaction");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const TERMINAL_STATES = ["TRIAL_ROLLED_BACK", "FORCED_FAILURE_ROLLED_BACK", "RECOVERED_AFTER_RELOAD", "MANUAL_RECOVERY_REQUIRED"];

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function each(key) { output[key] = stableValue(value[key]); });
    return output;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256(text) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") throw new Error("WebCrypto SHA-256 is required for Controlled Transaction.");
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text == null ? "" : text)));
    return Array.from(new Uint8Array(digest)).map(function hex(value) { return value.toString(16).padStart(2, "0"); }).join("");
  }

  function compileJavaScript(source, fileName) {
    try {
      Function(String(source || "") + "\n//# sourceURL=" + String(fileName || "REPOSITORY010-phase12.js"));
      return { valid: true, error: "" };
    } catch (error) {
      return { valid: false, error: error && error.message ? error.message : String(error) };
    }
  }

  function fail(code, message, data) {
    state.controlledTransactionStatus = "Blocked";
    state.lastControlledTransactionError = { message: String(message || code || "Controlled Transaction blocked."), at: internal.nowIso() };
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(state.lastControlledTransactionError) });
  }

  function getMutationPackage(id) {
    const requested = internal.text(id, "");
    if (requested && typeof namespace.getMutationPackageDescriptor === "function") {
      const found = namespace.getMutationPackageDescriptor(requested);
      if (found) return found;
    }
    if (state.lastMutationPackage && (!requested || state.lastMutationPackage.mutationPackageId === requested)) return internal.clone(state.lastMutationPackage);
    return null;
  }

  function getAcceptanceToken(id) {
    const requested = internal.text(id, "");
    if (requested && typeof namespace.getAcceptanceTokenDescriptor === "function") {
      const found = namespace.getAcceptanceTokenDescriptor(requested);
      if (found) return found;
    }
    if (state.lastAcceptanceToken && (!requested || state.lastAcceptanceToken.acceptanceTokenId === requested)) return internal.clone(state.lastAcceptanceToken);
    return null;
  }

  function getIde150Mechanics() {
    const ide = global.__IDE150AutoRefactoringInternal;
    if (!ide || typeof ide.findFunctionBlock !== "function" || typeof ide.countFunctionDefinitions !== "function" || typeof ide.hashText !== "function") return null;
    return ide;
  }

  function getWriteAdapter() {
    const adapter = internal.phase12DesktopWriteAdapter;
    if (!adapter || typeof adapter.inspectExactTarget !== "function" || typeof adapter.executeBoundWrite !== "function" || typeof adapter.executeBoundRestore !== "function") return null;
    return adapter;
  }

  function sameMutationSet(left, right) {
    return stableStringify(Array.isArray(left) ? left : []) === stableStringify(Array.isArray(right) ? right : []);
  }

  async function persistRecord(type, record) {
    if (typeof namespace.putControlledTransactionRecord !== "function") throw new Error("Controlled Transaction Persistence API is unavailable.");
    const result = await namespace.putControlledTransactionRecord(type, record);
    if (!result || result.ok !== true || !result.data || result.data.verified !== true) throw new Error("Failed to persist and verify " + type + ".");
    return result.data.record;
  }

  async function updateJournal(transaction, status, extras) {
    transaction.status = status;
    transaction.updatedAt = internal.nowIso();
    Object.assign(transaction, extras || {});
    const journal = {
      schema: "REPOSITORY-010-CONTROLLED-TRANSACTION-JOURNAL",
      schemaVersion: "1.0.0",
      transactionId: transaction.transactionId,
      acceptanceTokenId: transaction.acceptanceTokenId,
      mutationPackageId: transaction.mutationPackageId,
      candidateId: transaction.candidateId,
      candidateRevisionId: transaction.candidateRevisionId,
      baseRevisionId: transaction.baseRevisionId,
      canonicalRevisionId: transaction.canonicalRevisionId,
      targetNodeId: transaction.targetNodeId,
      targetFile: transaction.targetFile,
      targetFunction: transaction.targetFunction,
      mutationId: transaction.mutationId,
      beforeFunctionSha256: transaction.beforeFunctionSha256,
      afterFunctionSha256: transaction.afterFunctionSha256,
      beforeFileSha256: transaction.beforeFileSha256,
      afterFileSha256: transaction.afterFileSha256,
      functionBackupId: transaction.functionBackupId,
      fullFileBackupId: transaction.fullFileBackupId,
      status: status,
      backupVerified: transaction.backupVerified === true,
      journalPersisted: true,
      acceptanceTokenConsumed: transaction.acceptanceTokenConsumed === true,
      physicalWritePerformed: transaction.physicalWritePerformed === true,
      readbackVerified: transaction.readbackVerified === true,
      rollbackAttempted: transaction.rollbackAttempted === true,
      rollbackVerified: transaction.rollbackVerified === true,
      emergencyRollbackUsed: transaction.emergencyRollbackUsed === true,
      repositoryRestored: transaction.repositoryRestored === true,
      forcedFailureTrial: transaction.forcedFailureTrial === true,
      canonicalMutationPerformed: false,
      v5PostReflectionVerified: false,
      syncEngineInvoked: false,
      authorityEffect: "controlled-trial-only",
      startedAt: transaction.startedAt || null,
      writeStartedAt: transaction.writeStartedAt || null,
      writeCompletedAt: transaction.writeCompletedAt || null,
      rollbackCompletedAt: transaction.rollbackCompletedAt || null,
      failureReason: transaction.failureReason || null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };
    if (typeof namespace.validateContract === "function") {
      const journalValidation = namespace.validateContract("controlledTransactionJournalRecord", journal);
      if (!journalValidation.valid) throw new Error("Controlled Transaction Journal contract validation failed.");
    }
    const stored = await persistRecord("transactionJournal", journal);
    transaction.journalPersisted = true;
    if (!(state.controlledTransactionRecords instanceof Map)) state.controlledTransactionRecords = new Map();
    state.controlledTransactionRecords.set(transaction.transactionId, internal.clone(transaction));
    state.lastControlledTransactionJournal = internal.clone(stored);
    internal.touch();
    return stored;
  }

  async function prepareTransactionContext(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const mutationPackage = getMutationPackage(source.mutationPackageId);
    const token = getAcceptanceToken(source.acceptanceTokenId);
    const baseline = internal.clone(state.lastCanonicalBaseline || null);
    const v4 = internal.clone(state.lastV4TargetValidationEvidence || null);
    const bridge = internal.clone(state.lastIDE150BridgeEvidence || null);
    const adapter = getWriteAdapter();
    const ide = getIde150Mechanics();

    if (!mutationPackage) throw new Error("Hybrid Mutation Package is required.");
    if (!token) throw new Error("Manual Acceptance Token is required.");
    if (!baseline || baseline.explicitlyEstablished !== true) throw new Error("Explicit Canonical Baseline is required.");
    if (!v4 || v4.v4TargetEnvironmentValidated !== true || v4.blockingTargetDrift === true) throw new Error("Fresh V4 Target Environment validation is required.");
    if (!bridge || bridge.repositoryWriteAttempted !== false) throw new Error("IDE-150 read-only bridge evidence is required.");
    if (!adapter) throw new Error("Restricted Desktop Write Adapter is unavailable.");
    if (!ide) throw new Error("IDE-150 narrow mechanics are unavailable.");
    if (!Array.isArray(mutationPackage.mutationSet) || mutationPackage.mutationSet.length !== 1) throw new Error("Phase 12 requires exactly one Function-Level mutation.");
    if (!Array.isArray(mutationPackage.allowedMutationSet) || mutationPackage.allowedMutationSet.length !== 1) throw new Error("Phase 12 requires exactly one compact Allowed Mutation Set entry.");

    const mutation = mutationPackage.mutationSet[0];
    const allowed = mutationPackage.allowedMutationSet[0];
    if (mutation.mutationType !== "function-patch" || allowed.mutationType !== "function-patch") throw new Error("Phase 12 enables function-patch only.");
    if (mutation.mutationId !== allowed.mutationId || mutation.targetFile !== allowed.targetFile || mutation.targetFunction !== allowed.targetFunction) throw new Error("Mutation payload and Allowed Mutation Set identity mismatch.");
    if (!sameMutationSet(token.allowedMutationSet, mutationPackage.allowedMutationSet)) throw new Error("Acceptance Token Allowed Mutation Set mismatch.");
    if (mutationPackage.baseRevisionId !== baseline.canonicalRevisionId || token.baseRevisionId !== baseline.canonicalRevisionId || token.canonicalRevisionId !== baseline.canonicalRevisionId) throw new Error("Canonical Revision binding mismatch.");
    if (token.targetNodeId !== TARGET_NODE_ID || v4.targetNodeId !== TARGET_NODE_ID) throw new Error("Target Node binding mismatch.");
    if (mutationPackage.transferPackageId !== token.transferPackageId || mutationPackage.sourceTransferPackageHash !== token.packageHash) throw new Error("Mutation Package transfer lineage mismatch.");
    if (!bridge.targetValidationResults || !bridge.targetValidationResults.length || bridge.targetValidationResults[0].valid !== true) throw new Error("IDE-150 target validation evidence is not valid.");

    const tokenValidation = await namespace.validateAcceptanceToken(token.acceptanceTokenId, {
      candidateId: token.candidateId,
      candidateRevisionId: mutationPackage.candidateRevisionId,
      baseRevisionId: mutationPackage.baseRevisionId,
      targetNodeId: TARGET_NODE_ID,
      canonicalRevisionId: baseline.canonicalRevisionId,
      v4EvidenceId: v4.v4EvidenceId,
      transferPackageId: mutationPackage.transferPackageId,
      packageHash: mutationPackage.sourceTransferPackageHash,
      allowedMutationSet: mutationPackage.allowedMutationSet
    }, { requireCurrentLineage: true });
    if (!tokenValidation || tokenValidation.ok !== true) throw new Error("Acceptance Token is not valid for Controlled Transaction start: " + stableStringify(tokenValidation && tokenValidation.data && tokenValidation.data.reasons || []));

    const freshScan = await adapter.verifySelectedWriteRepositoryFresh();
    if (!freshScan || freshScan.ok !== true) throw new Error("Fresh target Repository verification failed.");
    if (freshScan.data.manifestHash !== baseline.manifestHash || freshScan.data.scriptSetHash !== baseline.scriptSetHash || Number(freshScan.data.scriptCount) !== Number(baseline.scriptCount)) throw new Error("Fresh target Repository no longer matches Canonical Baseline.");

    const targetRead = await adapter.inspectExactTarget(mutation.targetFile);
    if (!targetRead || targetRead.ok !== true) throw new Error("Exact target file read failed.");
    const beforeFileSource = targetRead.data.source;
    const beforeFileSha256 = targetRead.data.sha256;
    if (beforeFileSha256 !== mutation.beforeFileSha256 || beforeFileSha256 !== allowed.beforeFileSha256) throw new Error("Current target file SHA-256 does not match accepted Before File SHA-256.");

    const block = ide.findFunctionBlock(beforeFileSource, mutation.targetFunction);
    if (!block || ide.countFunctionDefinitions(beforeFileSource, mutation.targetFunction) !== 1) throw new Error("Exact target function is missing or ambiguous.");
    const beforeFunctionSource = String(block.block || "").trim();
    const beforeFunctionSha256 = await sha256(beforeFunctionSource);
    if (beforeFunctionSource !== mutation.beforeFunctionSource || beforeFunctionSha256 !== mutation.beforeSha256 || beforeFunctionSha256 !== allowed.beforeSha256) throw new Error("Current target function no longer matches accepted Before Function source/hash.");
    if (ide.hashText(beforeFunctionSource) !== mutation.ide150BeforeHash || mutation.ide150BeforeHash !== allowed.ide150BeforeHash) throw new Error("IDE-150 Before Function compatibility hash mismatch.");

    const afterFunctionSource = String(mutation.afterFunctionSource || "").trim();
    const afterFunctionSha256 = await sha256(afterFunctionSource);
    if (afterFunctionSha256 !== mutation.afterSha256 || afterFunctionSha256 !== allowed.afterSha256) throw new Error("After Function SHA-256 binding mismatch.");
    if (ide.hashText(afterFunctionSource) !== mutation.ide150AfterHash || mutation.ide150AfterHash !== allowed.ide150AfterHash) throw new Error("IDE-150 After Function compatibility hash mismatch.");

    const afterFileSource = beforeFileSource.slice(0, block.start) + afterFunctionSource + beforeFileSource.slice(block.end);
    const afterFileSha256 = await sha256(afterFileSource);
    if (afterFileSha256 !== mutation.afterFileSha256 || afterFileSha256 !== allowed.afterFileSha256) throw new Error("Virtual After File SHA-256 does not match Mutation Package.");
    const syntax = compileJavaScript(afterFileSource, mutation.targetFile);
    if (!syntax.valid) throw new Error("Virtual After File JavaScript syntax failed: " + syntax.error);
    const afterBlock = ide.findFunctionBlock(afterFileSource, mutation.targetFunction);
    if (!afterBlock || ide.countFunctionDefinitions(afterFileSource, mutation.targetFunction) !== 1) throw new Error("Virtual After Function identity is invalid.");
    const virtualAfterFunctionSha256 = await sha256(String(afterBlock.block || "").trim());
    if (virtualAfterFunctionSha256 !== mutation.afterSha256) throw new Error("Virtual After Function SHA-256 mismatch.");

    return {
      mutationPackage: mutationPackage,
      mutation: mutation,
      allowedMutationSet: mutationPackage.allowedMutationSet,
      token: token,
      baseline: baseline,
      v4: v4,
      bridge: bridge,
      adapter: adapter,
      ide: ide,
      beforeFileSource: beforeFileSource,
      afterFileSource: afterFileSource,
      beforeFileSha256: beforeFileSha256,
      afterFileSha256: afterFileSha256,
      beforeFunctionSource: beforeFunctionSource,
      afterFunctionSource: afterFunctionSource,
      beforeFunctionSha256: beforeFunctionSha256,
      afterFunctionSha256: afterFunctionSha256,
      freshScan: freshScan.data
    };
  }

  async function consumeToken(transaction, context) {
    const revalidation = await namespace.validateAcceptanceToken(context.token.acceptanceTokenId, {
      candidateId: context.token.candidateId,
      candidateRevisionId: context.mutationPackage.candidateRevisionId,
      baseRevisionId: context.mutationPackage.baseRevisionId,
      targetNodeId: TARGET_NODE_ID,
      canonicalRevisionId: context.baseline.canonicalRevisionId,
      v4EvidenceId: context.v4.v4EvidenceId,
      transferPackageId: context.mutationPackage.transferPackageId,
      packageHash: context.mutationPackage.sourceTransferPackageHash,
      allowedMutationSet: context.allowedMutationSet
    }, { requireCurrentLineage: true, nowMs: Date.now() });
    if (!revalidation || revalidation.ok !== true) throw new Error("Acceptance Token failed immediate pre-consumption validation.");

    const consumedAt = internal.nowIso();
    const allowedMutationSetHash = await sha256(stableStringify(context.allowedMutationSet));
    const record = {
      acceptanceTokenId: context.token.acceptanceTokenId,
      transactionId: transaction.transactionId,
      mutationPackageId: context.mutationPackage.mutationPackageId,
      candidateId: context.token.candidateId,
      candidateRevisionId: context.token.candidateRevisionId,
      baseRevisionId: context.token.baseRevisionId,
      canonicalRevisionId: context.token.canonicalRevisionId,
      targetNodeId: context.token.targetNodeId,
      bindingHash: context.token.bindingHash,
      allowedMutationSetHashAlgorithm: "SHA-256",
      allowedMutationSetHash: allowedMutationSetHash,
      oneTimeUseEnforced: true,
      consumedAt: consumedAt,
      consumeReason: "controlled-transaction-trial-start",
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "transaction-start-only",
      immutable: true
    };
    if (typeof namespace.validateContract === "function") {
      const consumptionValidation = namespace.validateContract("acceptanceTokenConsumptionRecord", record);
      if (!consumptionValidation.valid) throw new Error("Acceptance Token Consumption contract validation failed.");
    }
    const stored = await persistRecord("tokenConsumption", record);
    if (typeof namespace.createAcceptanceTokenConsumptionRecord === "function") {
      const created = namespace.createAcceptanceTokenConsumptionRecord(record);
      if (!created || created.ok !== true) throw new Error("Acceptance Token Consumption metadata rejected the persisted record.");
    } else {
      if (!(state.acceptanceTokenConsumptionRecords instanceof Map)) state.acceptanceTokenConsumptionRecords = new Map();
      state.acceptanceTokenConsumptionRecords.set(record.acceptanceTokenId, internal.clone(stored));
    }
    transaction.acceptanceTokenConsumed = true;
    transaction.tokenConsumedAt = consumedAt;
    transaction.startedAt = consumedAt;
    return stored;
  }

  async function createBackupsAndJournal(transaction, context) {
    const functionBackup = {
      backupId: transaction.functionBackupId,
      transactionId: transaction.transactionId,
      mutationPackageId: transaction.mutationPackageId,
      mutationId: transaction.mutationId,
      targetFile: transaction.targetFile,
      targetFunction: transaction.targetFunction,
      beforeFunctionSource: context.beforeFunctionSource,
      beforeFunctionSha256: context.beforeFunctionSha256,
      expectedAfterFunctionSha256: context.afterFunctionSha256,
      beforeFileSha256: context.beforeFileSha256,
      expectedAfterFileSha256: context.afterFileSha256,
      backupMode: "function-level-primary",
      createdAt: internal.nowIso(),
      immutable: true
    };
    const fullFileBackup = {
      backupId: transaction.fullFileBackupId,
      transactionId: transaction.transactionId,
      mutationPackageId: transaction.mutationPackageId,
      targetFile: transaction.targetFile,
      completeBeforeFileSource: context.beforeFileSource,
      beforeFileSha256: context.beforeFileSha256,
      expectedAfterFileSha256: context.afterFileSha256,
      backupMode: "full-file-emergency",
      createdAt: internal.nowIso(),
      immutable: true
    };
    if (typeof namespace.validateContract === "function") {
      const functionValidation = namespace.validateContract("functionRollbackBackupRecord", functionBackup);
      const fullValidation = namespace.validateContract("fullFileEmergencyBackupRecord", fullFileBackup);
      if (!functionValidation.valid || !fullValidation.valid) throw new Error("Controlled Transaction Backup contract validation failed.");
    }
    const storedFunction = await persistRecord("functionBackup", functionBackup);
    const storedFull = await persistRecord("fullFileBackup", fullFileBackup);
    if (await sha256(storedFunction.beforeFunctionSource) !== context.beforeFunctionSha256) throw new Error("Function Backup read-back hash verification failed.");
    if (await sha256(storedFull.completeBeforeFileSource) !== context.beforeFileSha256) throw new Error("Full-File Emergency Backup read-back hash verification failed.");
    transaction.backupVerified = true;
    await updateJournal(transaction, "BACKUP_VERIFIED");
    return { functionBackup: storedFunction, fullFileBackup: storedFull };
  }

  async function rollbackTransaction(transaction, context, reason) {
    transaction.rollbackAttempted = true;
    transaction.failureReason = reason || transaction.failureReason || null;
    let primaryVerified = false;
    let emergencyUsed = false;
    let primaryError = null;
    try {
      const currentRead = await context.adapter.inspectExactTarget(transaction.targetFile);
      if (!currentRead || currentRead.ok !== true) throw new Error("Rollback could not read current target file.");
      const currentSource = currentRead.data.source;
      const currentBlock = context.ide.findFunctionBlock(currentSource, transaction.targetFunction);
      if (!currentBlock || context.ide.countFunctionDefinitions(currentSource, transaction.targetFunction) !== 1) throw new Error("Rollback target function is missing or ambiguous.");
      const currentFunction = String(currentBlock.block || "").trim();
      const currentFunctionHash = await sha256(currentFunction);
      if (currentFunctionHash !== transaction.afterFunctionSha256) throw new Error("Current Function does not match expected After Function for primary rollback.");
      const reconstructed = currentSource.slice(0, currentBlock.start) + context.beforeFunctionSource + currentSource.slice(currentBlock.end);
      const reconstructedHash = await sha256(reconstructed);
      if (reconstructedHash !== transaction.beforeFileSha256) throw new Error("Primary Function rollback reconstruction does not match Before File SHA-256.");
      await updateJournal(transaction, "ROLLBACK_STARTED");
      const restored = await context.adapter.executeBoundRestore({
        transactionId: transaction.transactionId,
        targetFile: transaction.targetFile,
        restoreSource: reconstructed,
        expectedRestoreSha256: transaction.beforeFileSha256
      });
      primaryVerified = Boolean(restored && restored.ok === true && restored.data && restored.data.verified === true);
      if (!primaryVerified) throw new Error("Primary Function rollback physical restore failed.");
    } catch (error) {
      primaryError = error && error.message ? error.message : String(error);
    }

    if (!primaryVerified) {
      emergencyUsed = true;
      transaction.emergencyRollbackUsed = true;
      await updateJournal(transaction, "EMERGENCY_ROLLBACK_STARTED", { primaryRollbackError: primaryError });
      const fullBackup = await namespace.getControlledTransactionRecord("fullFileBackup", transaction.fullFileBackupId);
      if (!fullBackup || typeof fullBackup.completeBeforeFileSource !== "string") throw new Error("Full-File Emergency Backup is unavailable.");
      if (await sha256(fullBackup.completeBeforeFileSource) !== transaction.beforeFileSha256) throw new Error("Full-File Emergency Backup hash verification failed.");
      const restored = await context.adapter.executeBoundRestore({
        transactionId: transaction.transactionId,
        targetFile: transaction.targetFile,
        restoreSource: fullBackup.completeBeforeFileSource,
        expectedRestoreSha256: transaction.beforeFileSha256
      });
      if (!restored || restored.ok !== true || !restored.data || restored.data.verified !== true) throw new Error("Emergency Full-File rollback failed.");
    }

    const finalRead = await context.adapter.inspectExactTarget(transaction.targetFile);
    if (!finalRead || finalRead.ok !== true || finalRead.data.sha256 !== transaction.beforeFileSha256) throw new Error("Final repository restoration hash verification failed.");
    const finalBlock = context.ide.findFunctionBlock(finalRead.data.source, transaction.targetFunction);
    if (!finalBlock || await sha256(String(finalBlock.block || "").trim()) !== transaction.beforeFunctionSha256) throw new Error("Final Function restoration verification failed.");
    transaction.rollbackVerified = true;
    transaction.repositoryRestored = true;
    transaction.rollbackCompletedAt = internal.nowIso();
    transaction.emergencyRollbackUsed = emergencyUsed;
    return { verified: true, emergencyRollbackUsed: emergencyUsed, primaryRollbackError: primaryError };
  }

  async function executeControlledTransactionTrial(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const forcedFailure = source.forceFailureAfterWrite === true;
    let context = null;
    let transaction = null;
    let writePerformed = false;
    try {
      if (typeof namespace.initializeControlledTransactionPersistence !== "function") throw new Error("Controlled Transaction Persistence is unavailable.");
      const persistence = await namespace.initializeControlledTransactionPersistence();
      if (!persistence || persistence.ok !== true) throw new Error("Controlled Transaction Persistence initialization failed.");
      context = await prepareTransactionContext(source);

      transaction = {
        transactionId: internal.text(source.transactionId, internal.nextId("REPOSITORY010-CONTROLLED-TRIAL")),
        acceptanceTokenId: context.token.acceptanceTokenId,
        mutationPackageId: context.mutationPackage.mutationPackageId,
        candidateId: context.token.candidateId,
        candidateRevisionId: context.token.candidateRevisionId,
        baseRevisionId: context.token.baseRevisionId,
        canonicalRevisionId: context.token.canonicalRevisionId,
        targetNodeId: TARGET_NODE_ID,
        mutationId: context.mutation.mutationId,
        targetFile: context.mutation.targetFile,
        targetFunction: context.mutation.targetFunction,
        beforeFunctionSha256: context.beforeFunctionSha256,
        afterFunctionSha256: context.afterFunctionSha256,
        beforeFileSha256: context.beforeFileSha256,
        afterFileSha256: context.afterFileSha256,
        functionBackupId: internal.nextId("REPOSITORY010-FUNCTION-BACKUP"),
        fullFileBackupId: internal.nextId("REPOSITORY010-FULLFILE-BACKUP"),
        status: "PREPARED",
        backupVerified: false,
        journalPersisted: false,
        acceptanceTokenConsumed: false,
        physicalWritePerformed: false,
        readbackVerified: false,
        rollbackAttempted: false,
        rollbackVerified: false,
        emergencyRollbackUsed: false,
        repositoryRestored: false,
        forcedFailureTrial: forcedFailure,
        canonicalMutationPerformed: false,
        v5PostReflectionVerified: false,
        syncEngineInvoked: false,
        createdAt: internal.nowIso(),
        updatedAt: internal.nowIso()
      };
      if (!(state.controlledTransactionRecords instanceof Map)) state.controlledTransactionRecords = new Map();
      state.controlledTransactionRecords.set(transaction.transactionId, internal.clone(transaction));
      await updateJournal(transaction, "PREPARED");
      await createBackupsAndJournal(transaction, context);
      await consumeToken(transaction, context);
      await updateJournal(transaction, "TOKEN_CONSUMED");

      const permit = context.adapter.authorizeBoundTransaction({
        transactionId: transaction.transactionId,
        targetFile: transaction.targetFile,
        beforeFileSha256: transaction.beforeFileSha256,
        afterFileSha256: transaction.afterFileSha256
      });
      if (!permit) throw new Error("Restricted Desktop Write Adapter refused transaction-bound authorization.");

      transaction.writeStartedAt = internal.nowIso();
      await updateJournal(transaction, "WRITE_STARTED");
      const writeResult = await context.adapter.executeBoundWrite(permit, context.afterFileSource);
      if (!writeResult || writeResult.ok !== true) {
        const writeData = writeResult && writeResult.data ? writeResult.data : null;
        const writeMayHaveOccurred = Boolean(writeData && (writeData.physicalWritePerformed === true || writeData.physicalWriteMayHaveOccurred === true || writeData.physicalWriteInvocationStarted === true));
        if (writeMayHaveOccurred) {
          writePerformed = true;
          transaction.physicalWritePerformed = true;
        }
        throw new Error("Controlled physical Function write failed" + (writeMayHaveOccurred ? " after write invocation; rollback required." : " before physical write."));
      }
      writePerformed = true;
      transaction.physicalWritePerformed = true;
      transaction.writeCompletedAt = internal.nowIso();
      await updateJournal(transaction, "WRITE_COMPLETED");

      if (forcedFailure) throw new Error("REPOSITORY010_PHASE12_FORCED_FAILURE_AFTER_WRITE");

      const readback = await context.adapter.inspectExactTarget(transaction.targetFile);
      if (!readback || readback.ok !== true || readback.data.sha256 !== transaction.afterFileSha256) throw new Error("Read-after-write File SHA-256 verification failed.");
      const syntax = compileJavaScript(readback.data.source, transaction.targetFile);
      if (!syntax.valid) throw new Error("Read-after-write JavaScript syntax validation failed: " + syntax.error);
      const block = context.ide.findFunctionBlock(readback.data.source, transaction.targetFunction);
      if (!block || context.ide.countFunctionDefinitions(readback.data.source, transaction.targetFunction) !== 1) throw new Error("Read-after-write target Function identity failed.");
      const readbackFunctionHash = await sha256(String(block.block || "").trim());
      if (readbackFunctionHash !== transaction.afterFunctionSha256) throw new Error("Read-after-write Function SHA-256 verification failed.");
      transaction.readbackVerified = true;
      await updateJournal(transaction, "READBACK_VERIFIED");

      const rollback = await rollbackTransaction(transaction, context, "Phase 12 mandatory Controlled Trial rollback");
      const terminal = "TRIAL_ROLLED_BACK";
      await updateJournal(transaction, terminal, { rollbackVerified: rollback.verified === true, repositoryRestored: true });
      state.lastControlledTransactionTrial = internal.clone(transaction);
      state.controlledTransactionStatus = "Trial Restored / PASS";
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_CONTROLLED_TRANSACTION_TRIAL_ROLLED_BACK", "Verified / Restored", {
        transaction: internal.clone(transaction),
        freshTarget: internal.clone(context.freshScan),
        physicalWritePerformed: true,
        readbackVerified: true,
        rollbackVerified: true,
        emergencyRollbackUsed: transaction.emergencyRollbackUsed === true,
        repositoryRestored: true,
        acceptanceTokenConsumed: true,
        canonicalMutationPerformed: false,
        v5PostReflectionVerified: false,
        authorityEffect: "controlled-trial-restored"
      });
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      if (transaction) transaction.failureReason = message;
      if (transaction && context && writePerformed) {
        try {
          const rollback = await rollbackTransaction(transaction, context, message);
          const terminal = forcedFailure ? "FORCED_FAILURE_ROLLED_BACK" : "TRIAL_ROLLED_BACK";
          await updateJournal(transaction, terminal, { rollbackVerified: rollback.verified === true, repositoryRestored: true, failureReason: message });
          if (forcedFailure) state.lastControlledTransactionForcedFailureTrial = internal.clone(transaction);
          else state.lastControlledTransactionTrial = internal.clone(transaction);
          state.controlledTransactionStatus = forcedFailure ? "Forced Failure Restored / PASS" : "Failure Restored";
          internal.touch();
          return internal.buildResult(forcedFailure, forcedFailure ? "REPOSITORY010_FORCED_FAILURE_ROLLBACK_VERIFIED" : "REPOSITORY010_CONTROLLED_TRANSACTION_FAILED_BUT_ROLLED_BACK", forcedFailure ? "Verified / Restored" : "Rolled Back", {
            transaction: internal.clone(transaction),
            expectedForcedFailure: forcedFailure,
            failureReason: message,
            physicalWritePerformed: true,
            rollbackVerified: true,
            emergencyRollbackUsed: transaction.emergencyRollbackUsed === true,
            repositoryRestored: true,
            acceptanceTokenConsumed: transaction.acceptanceTokenConsumed === true,
            canonicalMutationPerformed: false,
            v5PostReflectionVerified: false,
            authorityEffect: "controlled-trial-restored"
          });
        } catch (rollbackError) {
          transaction.status = "MANUAL_RECOVERY_REQUIRED";
          transaction.rollbackVerified = false;
          transaction.repositoryRestored = false;
          transaction.failureReason = message + " | rollback: " + (rollbackError && rollbackError.message ? rollbackError.message : String(rollbackError));
          try { await updateJournal(transaction, "MANUAL_RECOVERY_REQUIRED", { failureReason: transaction.failureReason }); } catch (_) {}
          state.controlledTransactionStatus = "CRITICAL / Manual Recovery Required";
          state.lastControlledTransactionError = { message: transaction.failureReason, transactionId: transaction.transactionId, at: internal.nowIso() };
          internal.touch();
          return internal.buildResult(false, "REPOSITORY010_CONTROLLED_TRANSACTION_ROLLBACK_FAILED", "Critical / Manual Recovery Required", {
            transaction: internal.clone(transaction),
            physicalWritePerformed: true,
            repositoryRestored: false,
            canonicalMutationPerformed: false
          }, { error: internal.clone(state.lastControlledTransactionError) });
        }
      }
      if (transaction) {
        try { await updateJournal(transaction, "TRANSACTION_FAILED", { failureReason: message }); } catch (_) {}
      }
      return fail("REPOSITORY010_CONTROLLED_TRANSACTION_BLOCKED", message, transaction ? { transaction: internal.clone(transaction), physicalWritePerformed: false } : null);
    }
  }

  async function listPendingControlledTransactionRecoveries() {
    if (typeof namespace.initializeControlledTransactionPersistence !== "function") return [];
    const initialized = await namespace.initializeControlledTransactionPersistence();
    if (!initialized || initialized.ok !== true) return [];
    const journals = await namespace.listControlledTransactionRecords("transactionJournal");
    return journals.filter(function pending(item) { return item && TERMINAL_STATES.indexOf(item.status) === -1; });
  }

  async function recoverControlledTransactionTrial(transactionId) {
    const id = internal.text(transactionId, "");
    if (!id) return fail("REPOSITORY010_RECOVERY_TRANSACTION_ID_REQUIRED", "Transaction ID is required for recovery.");
    const adapter = getWriteAdapter();
    if (!adapter) return fail("REPOSITORY010_RECOVERY_WRITE_ADAPTER_REQUIRED", "Restricted Desktop Write Adapter is unavailable.");
    const journal = await namespace.getControlledTransactionRecord("transactionJournal", id);
    if (!journal) return fail("REPOSITORY010_RECOVERY_JOURNAL_NOT_FOUND", "Controlled Transaction Journal was not found.", { transactionId: id });
    const fullBackup = await namespace.getControlledTransactionRecord("fullFileBackup", journal.fullFileBackupId);
    if (!fullBackup || typeof fullBackup.completeBeforeFileSource !== "string") return fail("REPOSITORY010_RECOVERY_FULLFILE_BACKUP_NOT_FOUND", "Full-File Emergency Backup was not found.", { transactionId: id });
    const currentRead = await adapter.inspectExactTarget(journal.targetFile);
    if (!currentRead || currentRead.ok !== true) return fail("REPOSITORY010_RECOVERY_TARGET_READ_FAILED", "Recovery could not read the target file.", { transactionId: id });
    if (currentRead.data.sha256 === journal.beforeFileSha256) {
      const recovered = Object.assign({}, journal, { status: "RECOVERED_AFTER_RELOAD", repositoryRestored: true, rollbackVerified: true, canonicalMutationPerformed: false, updatedAt: internal.nowIso() });
      await persistRecord("transactionJournal", recovered);
      state.lastControlledTransactionRecovery = internal.clone(recovered);
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_RECOVERY_ALREADY_ORIGINAL", "Recovered", { transactionId: id, repositoryRestored: true, writeRequired: false, canonicalMutationPerformed: false });
    }
    if (await sha256(fullBackup.completeBeforeFileSource) !== journal.beforeFileSha256) return fail("REPOSITORY010_RECOVERY_BACKUP_HASH_MISMATCH", "Full-File Emergency Backup failed SHA-256 verification.", { transactionId: id });
    const transaction = {
      transactionId: id,
      acceptanceTokenId: journal.acceptanceTokenId,
      mutationPackageId: journal.mutationPackageId,
      targetFile: journal.targetFile,
      targetFunction: journal.targetFunction,
      beforeFileSha256: journal.beforeFileSha256,
      afterFileSha256: journal.afterFileSha256,
      status: "EMERGENCY_ROLLBACK_STARTED",
      backupVerified: true,
      journalPersisted: true,
      acceptanceTokenConsumed: journal.acceptanceTokenConsumed === true,
      physicalWritePerformed: true,
      rollbackAttempted: true,
      canonicalMutationPerformed: false
    };
    if (!(state.controlledTransactionRecords instanceof Map)) state.controlledTransactionRecords = new Map();
    state.controlledTransactionRecords.set(id, internal.clone(transaction));
    const restored = await adapter.executeBoundRestore({ transactionId: id, targetFile: journal.targetFile, restoreSource: fullBackup.completeBeforeFileSource, expectedRestoreSha256: journal.beforeFileSha256 });
    if (!restored || restored.ok !== true) return fail("REPOSITORY010_RECOVERY_EMERGENCY_RESTORE_FAILED", "Emergency recovery write failed.", { transactionId: id });
    const recovered = Object.assign({}, journal, {
      status: "RECOVERED_AFTER_RELOAD",
      rollbackAttempted: true,
      rollbackVerified: true,
      emergencyRollbackUsed: true,
      repositoryRestored: true,
      canonicalMutationPerformed: false,
      rollbackCompletedAt: internal.nowIso(),
      updatedAt: internal.nowIso()
    });
    await persistRecord("transactionJournal", recovered);
    state.lastControlledTransactionRecovery = internal.clone(recovered);
    state.controlledTransactionStatus = "Recovered After Reload";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_CONTROLLED_TRANSACTION_RECOVERED_AFTER_RELOAD", "Recovered", {
      transactionId: id,
      repositoryRestored: true,
      emergencyRollbackUsed: true,
      canonicalMutationPerformed: false
    });
  }

  function getControlledTransactionStatus() {
    return {
      status: state.controlledTransactionStatus || "Ready",
      phase: 12,
      moduleVersion: MODULE_VERSION,
      controlledTransactionTrialImplemented: true,
      controlledCanonicalTransactionImplemented: false,
      acceptanceTokenConsumptionImplemented: true,
      functionPatchOnly: true,
      mandatoryTrialRollback: true,
      readAfterWriteVerificationImplemented: true,
      automaticRollbackImplemented: true,
      reloadRecoveryImplemented: true,
      v5PostReflectionVerificationImplemented: false,
      pcCanonicalMutationImplemented: false,
      directRepositoryMutationAllowed: false,
      transactionCount: state.controlledTransactionRecords instanceof Map ? state.controlledTransactionRecords.size : 0,
      lastTrial: internal.clone(state.lastControlledTransactionTrial || null),
      lastForcedFailureTrial: internal.clone(state.lastControlledTransactionForcedFailureTrial || null),
      lastRecovery: internal.clone(state.lastControlledTransactionRecovery || null),
      lastError: internal.clone(state.lastControlledTransactionError || null)
    };
  }

  Object.assign(namespace.api, {
    executeControlledTransactionTrial: executeControlledTransactionTrial,
    listPendingControlledTransactionRecoveries: listPendingControlledTransactionRecoveries,
    recoverControlledTransactionTrial: recoverControlledTransactionTrial,
    getControlledTransactionStatus: getControlledTransactionStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.controlledTransaction = {
    id: "REPOSITORY-010-CONTROLLED-TRANSACTION-TRIAL",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 12,
    functionPatchOnly: true,
    acceptanceTokenConsumptionImplemented: true,
    backupBeforeWriteRequired: true,
    journalBeforeWriteRequired: true,
    mandatoryTrialRollback: true,
    forcedFailureTrialSupported: true,
    reloadRecoveryImplemented: true,
    controlledCanonicalTransactionImplemented: false,
    v5PostReflectionVerificationImplemented: false,
    pcCanonicalMutationImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.executeLocalFirstRepositoryControlledTransactionTrial = executeControlledTransactionTrial;
  global.listLocalFirstRepositoryPendingControlledTransactionRecoveries = listPendingControlledTransactionRecoveries;
  global.recoverLocalFirstRepositoryControlledTransactionTrial = recoverControlledTransactionTrial;
  global.getLocalFirstRepositoryControlledTransactionStatus = getControlledTransactionStatus;
})(typeof window !== "undefined" ? window : globalThis);
