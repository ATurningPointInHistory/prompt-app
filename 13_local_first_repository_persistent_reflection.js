/* ============================================================
   FILE: 13_local_first_repository_persistent_reflection.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.12.0 / Module: Persistent Canonical Reflection 1.0.0
   Phase 13: Function Patch + exact Reflection Closure + V5
   Decision-008: no automatic Canonical Revision promotion
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Persistent Reflection blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("persistentReflection");
  const MANIFEST_FILE = "00_script_manifest.json";
  const INDEX_FILE = "index.html";

  function fail(code, message, data) {
    state.persistentReflectionStatus = "Blocked";
    state.lastPersistentReflectionError = { message: String(message || code), at: internal.nowIso() };
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(state.lastPersistentReflectionError) });
  }
  function mechanics() { return internal.phase12ControlledTransactionMechanics || null; }
  function adapter() { return internal.phase12DesktopWriteAdapter || null; }
  async function persist(type, record) {
    const result = await namespace.putControlledTransactionRecord(type, record);
    if (!result || result.ok !== true) throw new Error("Persistent record write failed: " + type);
    return result.data.record;
  }

  async function createClosureBackup(transaction, fileName, source, sha256Value, label) {
    const record = {
      backupId: internal.nextId("REPOSITORY010-CLOSURE-BACKUP"),
      transactionId: transaction.transactionId,
      mutationPackageId: transaction.mutationPackageId,
      closurePlanId: transaction.closurePlanId,
      backupMode: "reflection-closure-full-file",
      backupRole: label,
      targetFile: fileName,
      beforeFileSha256: sha256Value,
      source: source,
      verified: true,
      createdAt: internal.nowIso(),
      immutable: true
    };
    await persist("fullFileBackup", record);
    return record;
  }

  async function rollbackAll(transaction, context, reason) {
    const a = adapter();
    const m = mechanics();
    if (!a || !m) throw new Error("Rollback mechanics unavailable.");
    await m.updateJournal(transaction, "ROLLBACK_STARTED", { failureReason: reason || null });
    const manifestRestore = await a.executeBoundClosureRestore({ transactionId: transaction.transactionId, targetFile: MANIFEST_FILE, restoreSource: context.beforeManifestSource, expectedRestoreSha256: transaction.beforeManifestFileSha256 });
    if (!manifestRestore || !manifestRestore.ok) throw new Error("Manifest rollback failed.");
    const indexRestore = await a.executeBoundClosureRestore({ transactionId: transaction.transactionId, targetFile: INDEX_FILE, restoreSource: context.beforeIndexSource, expectedRestoreSha256: transaction.beforeIndexFileSha256 });
    if (!indexRestore || !indexRestore.ok) throw new Error("index.html rollback failed.");
    const targetRestore = await a.executeBoundRestore({ transactionId: transaction.transactionId, targetFile: transaction.targetFile, restoreSource: context.beforeFileSource, expectedRestoreSha256: transaction.beforeFileSha256 });
    if (!targetRestore || !targetRestore.ok) throw new Error("Target file rollback failed.");
    const verify = await a.verifyExactClosureRollback({
      transactionId: transaction.transactionId,
      targetFile: transaction.targetFile,
      targetSha256: transaction.beforeFileSha256,
      manifestSha256: transaction.beforeManifestFileSha256,
      indexSha256: transaction.beforeIndexFileSha256,
      manifestHash: transaction.beforeManifestHash,
      scriptSetHash: transaction.beforeScriptSetHash,
      cacheKey: transaction.beforeCacheKey
    });
    if (!verify || !verify.ok) throw new Error("Rollback integrity verification failed.");
    transaction.rollbackVerified = true;
    transaction.repositoryRestored = true;
    transaction.persistentReflectionPerformed = false;
    transaction.v5PostReflectionVerified = false;
    transaction.canonicalMutationPerformed = false;
    await m.updateJournal(transaction, "V5_FAILED_ROLLED_BACK", { rollbackVerified: true, repositoryRestored: true, failureReason: reason || null });
    return verify;
  }

  async function executePersistentCanonicalReflection(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const m = mechanics();
    const a = adapter();
    let transaction = null;
    let context = null;
    let targetWriteStarted = false;
    try {
      if (!m || !a || !internal.phase13ReflectionClosure) throw new Error("Phase 13 dependencies are unavailable.");
      if (typeof namespace.initializeControlledTransactionPersistence !== "function") throw new Error("Controlled Transaction Persistence is unavailable.");
      const persistence = await namespace.initializeControlledTransactionPersistence();
      if (!persistence || !persistence.ok) throw new Error("Controlled Transaction Persistence initialization failed.");

      context = await m.prepareTransactionContext(source);
      const repositorySnapshot = await a.captureRepositoryFileHashSnapshot();
      if (!repositorySnapshot || !repositorySnapshot.ok) throw new Error("Pre-transaction full Repository hash snapshot failed.");
      context.preTransactionRepositorySnapshot = repositorySnapshot.data;
      const manifestRead = await a.inspectExactClosureFile(MANIFEST_FILE);
      const indexRead = await a.inspectExactClosureFile(INDEX_FILE);
      if (!manifestRead || !manifestRead.ok || !indexRead || !indexRead.ok) throw new Error("Manifest/index pre-read failed.");
      context.beforeManifestSource = manifestRead.data.source;
      context.beforeIndexSource = indexRead.data.source;

      const closure = await namespace.deriveReflectionIntegrityClosure({
        mutationPackage: context.mutationPackage,
        mutation: context.mutation,
        afterFileSource: context.afterFileSource,
        beforeManifestSource: context.beforeManifestSource,
        beforeIndexSource: context.beforeIndexSource
      });
      if (!closure || !closure.ok) throw new Error("Reflection Closure Plan generation failed.");
      const plan = closure.data.closurePlan;
      context.afterManifestSource = closure.data.afterManifestSource;
      context.afterIndexSource = closure.data.afterIndexSource;

      transaction = {
        transactionId: internal.text(source.transactionId, internal.nextId("REPOSITORY010-PERSISTENT-REFLECTION")),
        acceptanceTokenId: context.token.acceptanceTokenId,
        mutationPackageId: context.mutationPackage.mutationPackageId,
        mutationId: context.mutation.mutationId,
        candidateId: context.token.candidateId,
        candidateRevisionId: context.token.candidateRevisionId,
        baseRevisionId: context.token.baseRevisionId,
        canonicalRevisionId: context.token.canonicalRevisionId,
        targetNodeId: context.token.targetNodeId,
        targetFile: context.mutation.targetFile,
        targetFunction: context.mutation.targetFunction,
        beforeFunctionSha256: context.beforeFunctionSha256,
        afterFunctionSha256: context.afterFunctionSha256,
        beforeFileSha256: context.beforeFileSha256,
        afterFileSha256: context.afterFileSha256,
        closurePlanId: plan.closurePlanId,
        closurePlanHash: plan.closurePlanHash,
        closurePlan: internal.clone(plan),
        beforeManifestHash: plan.beforeManifestHash,
        expectedAfterManifestHash: plan.expectedAfterManifestHash,
        beforeScriptSetHash: plan.beforeScriptSetHash,
        expectedAfterScriptSetHash: plan.expectedAfterScriptSetHash,
        beforeCacheKey: plan.beforeCacheKey,
        expectedAfterCacheKey: plan.expectedAfterCacheKey,
        beforeManifestFileSha256: plan.beforeManifestFileSha256,
        afterManifestFileSha256: plan.afterManifestFileSha256,
        beforeIndexFileSha256: plan.beforeIndexFileSha256,
        afterIndexFileSha256: plan.afterIndexFileSha256,
        preTransactionRepositorySnapshot: internal.clone(context.preTransactionRepositorySnapshot),
        preTransactionRepositorySnapshotHash: context.preTransactionRepositorySnapshot.snapshotHash,
        functionBackupId: internal.nextId("REPOSITORY010-FUNCTION-BACKUP"),
        fullFileBackupId: internal.nextId("REPOSITORY010-FULLFILE-BACKUP"),
        manifestBackupId: null,
        indexBackupId: null,
        status: "PREPARED",
        backupVerified: false,
        journalPersisted: false,
        acceptanceTokenConsumed: false,
        physicalWritePerformed: false,
        closureWritePerformed: false,
        readbackVerified: false,
        rollbackAttempted: false,
        rollbackVerified: false,
        repositoryRestored: false,
        persistentReflectionPerformed: false,
        v5PostReflectionVerified: false,
        controlledCanonicalTransactionImplemented: false,
        canonicalRevisionPromoted: false,
        createdAt: internal.nowIso(), updatedAt: internal.nowIso()
      };
      if (!(state.controlledTransactionRecords instanceof Map)) state.controlledTransactionRecords = new Map();
      state.controlledTransactionRecords.set(transaction.transactionId, internal.clone(transaction));
      await m.updateJournal(transaction, "PREPARED", { closurePlanId: plan.closurePlanId, closurePlanHash: plan.closurePlanHash });

      await m.createBackupsAndJournal(transaction, context);
      const manifestBackup = await createClosureBackup(transaction, MANIFEST_FILE, context.beforeManifestSource, plan.beforeManifestFileSha256, "manifest");
      const indexBackup = await createClosureBackup(transaction, INDEX_FILE, context.beforeIndexSource, plan.beforeIndexFileSha256, "index");
      transaction.manifestBackupId = manifestBackup.backupId;
      transaction.indexBackupId = indexBackup.backupId;
      transaction.backupVerified = true;
      await m.updateJournal(transaction, "BACKUP_VERIFIED", { manifestBackupId: transaction.manifestBackupId, indexBackupId: transaction.indexBackupId, closureBackupsVerified: true });

      await m.consumeToken(transaction, context);
      await m.updateJournal(transaction, "TOKEN_CONSUMED", { closurePlanHash: plan.closurePlanHash });
      const permit = a.authorizeBoundTransaction({ transactionId: transaction.transactionId, targetFile: transaction.targetFile, beforeFileSha256: transaction.beforeFileSha256, afterFileSha256: transaction.afterFileSha256 });
      if (!permit) throw new Error("Target write permit authorization failed.");

      await m.updateJournal(transaction, "WRITE_STARTED");
      targetWriteStarted = true;
      const targetWrite = await a.executeBoundWrite(permit, context.afterFileSource);
      if (!targetWrite || !targetWrite.ok) throw new Error("Target Function file write failed.");
      transaction.physicalWritePerformed = true;
      await m.updateJournal(transaction, "TARGET_WRITE_COMPLETED");

      const manifestWrite = await a.executeBoundClosureWrite({ transactionId: transaction.transactionId, targetFile: MANIFEST_FILE, beforeFileSha256: plan.beforeManifestFileSha256, afterFileSha256: plan.afterManifestFileSha256, source: context.afterManifestSource });
      if (!manifestWrite || !manifestWrite.ok) throw new Error("Manifest closure write failed.");
      const indexWrite = await a.executeBoundClosureWrite({ transactionId: transaction.transactionId, targetFile: INDEX_FILE, beforeFileSha256: plan.beforeIndexFileSha256, afterFileSha256: plan.afterIndexFileSha256, source: context.afterIndexSource });
      if (!indexWrite || !indexWrite.ok) throw new Error("index.html closure write failed.");
      transaction.closureWritePerformed = true;
      await m.updateJournal(transaction, "CLOSURE_WRITE_COMPLETED");

      const readback = await a.verifyExactReflectionReadback({ transactionId: transaction.transactionId });
      if (!readback || !readback.ok) throw new Error("Phase 13 read-after-write verification failed.");
      transaction.readbackVerified = true;
      await m.updateJournal(transaction, "READBACK_VERIFIED");
      await m.updateJournal(transaction, "AWAITING_V5");

      const v5 = await a.runV5PostReflectionVerification({ transactionId: transaction.transactionId });
      if (!v5 || !v5.ok) throw new Error("V5 Post-Reflection Verification failed.");
      transaction.persistentReflectionPerformed = true;
      transaction.v5PostReflectionVerified = true;
      transaction.controlledCanonicalTransactionImplemented = true;
      transaction.canonicalMutationPerformed = true;
      transaction.canonicalRevisionPromoted = false;
      transaction.repositoryRestored = false;
      await m.updateJournal(transaction, "V5_VERIFIED_AWAITING_BASELINE_PROMOTION", {
        persistentReflectionPerformed: true,
        v5PostReflectionVerified: true,
        controlledCanonicalTransactionImplemented: true,
        canonicalRevisionPromoted: false
      });
      state.lastPersistentReflection = internal.clone(transaction);
      state.persistentReflectionStatus = "V5 Verified / Awaiting Baseline Promotion";
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_PERSISTENT_REFLECTION_V5_VERIFIED", "V5 Verified / Awaiting Baseline Promotion", {
        transaction: internal.clone(transaction),
        closurePlan: internal.clone(plan),
        v5: internal.clone(v5.data || null),
        persistentReflectionPerformed: true,
        v5PostReflectionVerified: true,
        controlledCanonicalTransactionImplemented: true,
        canonicalRevisionPromoted: false,
        automaticBaselinePromotionPerformed: false,
        syncEngineInvoked: false
      });
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      if (transaction && context && targetWriteStarted) {
        try {
          transaction.rollbackAttempted = true;
          const rollback = await rollbackAll(transaction, context, message);
          state.lastPersistentReflection = internal.clone(transaction);
          state.persistentReflectionStatus = "V5/Write Failure Restored";
          internal.touch();
          return internal.buildResult(false, "REPOSITORY010_PERSISTENT_REFLECTION_FAILED_ROLLED_BACK", "Failed / Restored", {
            transaction: internal.clone(transaction), rollback: internal.clone(rollback.data || null), failureReason: message,
            persistentReflectionPerformed: false, v5PostReflectionVerified: false, canonicalMutationPerformed: false, repositoryRestored: true
          });
        } catch (rollbackError) {
          transaction.status = "MANUAL_RECOVERY_REQUIRED";
          transaction.rollbackVerified = false;
          transaction.repositoryRestored = false;
          transaction.failureReason = message + " | rollback: " + (rollbackError && rollbackError.message ? rollbackError.message : String(rollbackError));
          try { await m.updateJournal(transaction, "MANUAL_RECOVERY_REQUIRED", { failureReason: transaction.failureReason }); } catch (_) {}
          state.persistentReflectionStatus = "CRITICAL / Manual Recovery Required";
          internal.touch();
          return internal.buildResult(false, "REPOSITORY010_PERSISTENT_REFLECTION_ROLLBACK_FAILED", "Critical / Manual Recovery Required", { transaction: internal.clone(transaction) });
        }
      }
      return fail("REPOSITORY010_PERSISTENT_REFLECTION_BLOCKED", message, transaction ? { transaction: internal.clone(transaction) } : null);
    }
  }

  function getPersistentCanonicalReflectionStatus() {
    return {
      status: state.persistentReflectionStatus || "Ready",
      phase: 13,
      moduleVersion: MODULE_VERSION,
      persistentCanonicalReflectionAllowed: true,
      functionPatchOnly: true,
      reflectionClosureRequired: true,
      v5Required: true,
      automaticRollbackOnV5Failure: true,
      automaticBaselinePromotionAllowed: false,
      canonicalRevisionPromoted: false,
      directRepositoryMutationAllowed: false,
      lastTransaction: internal.clone(state.lastPersistentReflection || null)
    };
  }

  Object.assign(namespace.api, {
    executePersistentCanonicalReflection: executePersistentCanonicalReflection,
    getPersistentCanonicalReflectionStatus: getPersistentCanonicalReflectionStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.persistentReflection = {
    id: "REPOSITORY-010-PERSISTENT-CANONICAL-REFLECTION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 13,
    functionPatchOnly: true,
    closureRequired: true,
    v5Required: true,
    automaticBaselinePromotionAllowed: false,
    directRepositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
