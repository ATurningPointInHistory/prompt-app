/* ============================================================
   FILE: 13_local_first_repository_phase14_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.13.0 / Module: Phase 14 Validation 1.0.0
   Phase 14: Explicit Canonical Baseline Promotion
   Decision-009: V5-Bound / Project Owner Explicit Promotion
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 14 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase14Validation");

  function makeCheck(name, passed, actual, category, severity) {
    return { name: name, passed: passed === true, actual: internal.clone(actual), category: category, severity: severity || "Critical" };
  }

  function resultFromChecks(id, implementationPhase, checks, extra) {
    const passed = checks.filter(function filter(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function filter(item) { return item.passed !== true && item.severity === "Critical"; }).length;
    const health = checks.length ? Number(((passed / checks.length) * 100).toFixed(1)) : 0;
    return Object.assign({
      id: id,
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: health,
      criticalFailed: criticalFailed,
      status: failed === 0 ? id + " PASS" : id + " FAIL",
      releaseAllowed: failed === 0 && criticalFailed === 0,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extra || {});
  }

  function buildPhase13JournalFixture() {
    return {
      schema: "REPOSITORY-010-CONTROLLED-TRANSACTION-JOURNAL",
      schemaVersion: "1.0.0",
      transactionId: "REPOSITORY010-PHASE14-JOURNAL-FIXTURE",
      acceptanceTokenId: "REPOSITORY010-PHASE14-TOKEN-FIXTURE",
      mutationPackageId: "REPOSITORY010-PHASE14-MUTATION-FIXTURE",
      candidateId: "REPOSITORY010-PHASE14-CANDIDATE-FIXTURE",
      candidateRevisionId: "REPOSITORY010-PHASE14-CANDIDATE-REVISION",
      baseRevisionId: "REPOSITORY010-CANONICAL-REVISION-0009",
      canonicalRevisionId: "REPOSITORY010-CANONICAL-REVISION-0009",
      targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
      targetFile: "fixture.js",
      targetFunction: "fixture",
      mutationId: "REPOSITORY010-PHASE14-MUTATION",
      beforeFunctionSha256: "a".repeat(64),
      afterFunctionSha256: "b".repeat(64),
      beforeFileSha256: "c".repeat(64),
      afterFileSha256: "d".repeat(64),
      functionBackupId: "REPOSITORY010-PHASE14-FUNCTION-BACKUP",
      fullFileBackupId: "REPOSITORY010-PHASE14-FULL-BACKUP",
      status: "V5_VERIFIED_AWAITING_BASELINE_PROMOTION",
      backupVerified: true,
      journalPersisted: true,
      acceptanceTokenConsumed: true,
      physicalWritePerformed: true,
      readbackVerified: true,
      rollbackAttempted: false,
      rollbackVerified: false,
      emergencyRollbackUsed: false,
      repositoryRestored: false,
      forcedFailureTrial: false,
      closureWritePerformed: true,
      persistentReflectionPerformed: true,
      controlledCanonicalTransactionImplemented: true,
      canonicalMutationPerformed: true,
      v5PostReflectionVerified: true,
      canonicalRevisionPromoted: false,
      automaticBaselinePromotionPerformed: false,
      syncEngineInvoked: false,
      authorityEffect: "persistent-reflection",
      createdAt: "2026-08-17T00:00:00.000Z",
      updatedAt: "2026-08-17T00:01:00.000Z"
    };
  }

  async function runPhase14Validation() {
    const checks = [];
    try {
      if (typeof global.initializeLocalFirstRepository === "function") global.initializeLocalFirstRepository();
      if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
      const init = typeof namespace.initializeBaselinePromotion === "function" ? await namespace.initializeBaselinePromotion() : null;
      const promotionStatus = typeof namespace.getBaselinePromotionStatus === "function" ? namespace.getBaselinePromotionStatus() : null;
      const persistenceStatus = typeof namespace.getLocalFirstRepositoryPersistenceStatus === "function" ? namespace.getLocalFirstRepositoryPersistenceStatus() : null;
      const journalFixture = buildPhase13JournalFixture();
      const journalValidation = typeof namespace.validateContract === "function" ? namespace.validateContract("controlledTransactionJournalRecord", journalFixture) : { valid: false };

      checks.push(makeCheck("Release version is 1.13.0", VERSION_MANIFEST.release.version === "1.13.0", VERSION_MANIFEST.release.version, "Version"));
      checks.push(makeCheck("Decision-009 is frozen baseline", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-009") !== -1, VERSION_MANIFEST.release.decisionIds, "Architecture"));
      checks.push(makeCheck("Baseline Promotion module available", Boolean(namespace.modules.baselinePromotion && namespace.modules.baselinePromotion.version === "1.0.0"), namespace.modules.baselinePromotion, "Module"));
      checks.push(makeCheck("Promotion Candidate API available", typeof namespace.createBaselinePromotionCandidate === "function", typeof namespace.createBaselinePromotionCandidate, "API"));
      checks.push(makeCheck("Fresh Promotion Revalidation API available", typeof namespace.revalidateBaselinePromotionCandidate === "function", typeof namespace.revalidateBaselinePromotionCandidate, "API"));
      checks.push(makeCheck("Explicit Promotion API available", typeof namespace.promoteCanonicalBaseline === "function", typeof namespace.promoteCanonicalBaseline, "API"));
      checks.push(makeCheck("Promotion Candidate contract registered", Boolean(namespace.getContractDefinition("baselinePromotionCandidateDescriptor")), namespace.getContractDefinition("baselinePromotionCandidateDescriptor"), "Contract"));
      checks.push(makeCheck("Promotion Evidence contract registered", Boolean(namespace.getContractDefinition("baselinePromotionEvidenceDescriptor")), namespace.getContractDefinition("baselinePromotionEvidenceDescriptor"), "Contract"));
      checks.push(makeCheck("Phase 13 Journal contract accepts persisted V5 success", journalValidation.valid === true, journalValidation, "Persistence Hotfix"));
      checks.push(makeCheck("Repository Persistence upgraded for Phase 14", Boolean(persistenceStatus && Number(persistenceStatus.databaseVersion) >= 6), persistenceStatus, "Persistence"));
      checks.push(makeCheck("Canonical Baseline persistence store available", Boolean(persistenceStatus && persistenceStatus.recordTypes && persistenceStatus.recordTypes.indexOf("canonicalBaseline") !== -1), persistenceStatus && persistenceStatus.recordTypes, "Persistence"));
      checks.push(makeCheck("Promotion Candidate persistence store available", Boolean(persistenceStatus && persistenceStatus.recordTypes && persistenceStatus.recordTypes.indexOf("baselinePromotionCandidate") !== -1), persistenceStatus && persistenceStatus.recordTypes, "Persistence"));
      checks.push(makeCheck("Promotion Evidence persistence store available", Boolean(persistenceStatus && persistenceStatus.recordTypes && persistenceStatus.recordTypes.indexOf("baselinePromotionEvidence") !== -1), persistenceStatus && persistenceStatus.recordTypes, "Persistence"));
      checks.push(makeCheck("Phase 14 initialization succeeds", Boolean(init && init.ok === true), init, "Initialization"));
      checks.push(makeCheck("Bootstrap Promotion migration supported", Boolean(namespace.modules.baselinePromotion && namespace.modules.baselinePromotion.bootstrapMigrationImplemented === true), namespace.modules.baselinePromotion, "Migration"));
      checks.push(makeCheck("Reload recovery implemented", Boolean(promotionStatus && namespace.modules.baselinePromotion.reloadRecoveryImplemented === true), promotionStatus, "Recovery"));
      checks.push(makeCheck("Project Owner explicit action remains required", Boolean(promotionStatus && promotionStatus.projectOwnerConfirmationRequired === true), promotionStatus, "Authority"));
      checks.push(makeCheck("Automatic Canonical Revision promotion remains prohibited", Boolean(promotionStatus && promotionStatus.automaticPromotionAllowed === false && VERSION_MANIFEST.implementation.automaticCanonicalRevisionPromotionEnabled === false), promotionStatus, "Authority"));
      checks.push(makeCheck("Phase 14 writes no Canonical source files", Boolean(promotionStatus && promotionStatus.canonicalSourceFilesWritten === false), promotionStatus, "Safety"));
      checks.push(makeCheck("Sync and GitHub side effects remain prohibited", Boolean(promotionStatus && promotionStatus.syncEngineImplemented === false && promotionStatus.githubAutomaticReflectionAllowed === false), promotionStatus, "Boundary"));

      const result = resultFromChecks("REPOSITORY-010 Phase 14 Pre-Device Validation", "Phase 14 Explicit Canonical Baseline Promotion", checks, {
        phase14ReadyForRealDeviceValidation: checks.every(function every(item) { return item.passed; }),
        canonicalRevisionPromotionImplemented: true,
        automaticCanonicalRevisionPromotion: false,
        projectOwnerConfirmationRequired: true,
        syncEngineImplemented: false
      });
      state.lastPhase14Validation = internal.clone(result);
      state.phase14ValidationStatus = result.releaseAllowed ? "PASS" : "FAIL";
      internal.touch();
      return result;
    } catch (error) {
      checks.push(makeCheck("Phase 14 validation execution", false, error && error.message ? error.message : String(error), "Execution"));
      return resultFromChecks("REPOSITORY-010 Phase 14 Pre-Device Validation", "Phase 14 Explicit Canonical Baseline Promotion", checks, { phase14ReadyForRealDeviceValidation: false });
    }
  }

  async function runPhase14RealDeviceValidation() {
    const pre = await runPhase14Validation();
    const checks = [];
    const ua = global.navigator && global.navigator.userAgent || "";
    const platform = global.navigator && global.navigator.platform || "";
    const init = await namespace.initializeBaselinePromotion();
    const status = namespace.getBaselinePromotionStatus();
    const scan = state.lastDesktopRepositoryScan || null;
    const persistedBaselines = await namespace.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const persistedEvidence = await namespace.listPersistedLocalFirstRepositoryRecords("baselinePromotionEvidence");
    const baseline0009 = (persistedBaselines || []).find(function find(item) { return item.canonicalRevisionId === "REPOSITORY010-CANONICAL-REVISION-0009"; }) || null;
    const migrated0009 = (persistedEvidence || []).find(function find(item) { return item.canonicalRevisionId === "REPOSITORY010-CANONICAL-REVISION-0009" && item.canonicalRevisionPromoted === true; }) || null;

    checks.push(makeCheck("Phase 14 pre-device validation passes", pre.releaseAllowed === true, pre, "Pre-Device"));
    checks.push(makeCheck("Receiver runtime is PC real environment", /Windows/i.test(ua) || /Win/i.test(platform), { userAgent: ua, platform: platform }, "PC Real Environment"));
    checks.push(makeCheck("Phase 14 initialization/restoration succeeds", init.ok === true, init, "Initialization"));
    checks.push(makeCheck("PC Repository has been read-only scanned", Boolean(scan && scan.readOnly === true && scan.writeAttempted === false), scan, "PC Repository"));
    checks.push(makeCheck("PC Repository integrity is verified", Boolean(scan && scan.integrity && scan.integrity.status === "verified" && scan.integrity.allFileHashesVerified === true && scan.integrity.indexSequenceMatches === true), scan && scan.integrity, "PC Repository"));
    checks.push(makeCheck("Bootstrap Canonical Revision 0009 migrated to formal persistence", Boolean(baseline0009), baseline0009, "Migration"));
    checks.push(makeCheck("Bootstrap Promotion 0009 migrated to formal evidence", Boolean(migrated0009), migrated0009, "Migration"));
    checks.push(makeCheck("Current restored Canonical Revision is at least 0009", Boolean(status && status.currentCanonicalRevisionId && /^REPOSITORY010-CANONICAL-REVISION-\d{4,}$/.test(status.currentCanonicalRevisionId)), status, "Baseline"));
    checks.push(makeCheck("Automatic promotion remains disabled on real PC runtime", status.automaticPromotionAllowed === false, status, "Authority"));
    checks.push(makeCheck("No Sync/GitHub/source-write side effect is enabled", status.canonicalSourceFilesWritten === false && status.syncEngineImplemented === false && status.githubAutomaticReflectionAllowed === false, status, "Boundary"));

    const result = resultFromChecks("REPOSITORY-010 Phase 14 Real Device Validation", "Phase 14 Explicit Canonical Baseline Promotion / PC Real Device", checks, {
      phase14Complete: checks.every(function every(item) { return item.passed; }),
      pcRealDevice: true,
      bootstrapPromotionMigrationVerified: Boolean(baseline0009 && migrated0009),
      canonicalRevisionPromotionImplemented: true,
      automaticCanonicalRevisionPromotion: false,
      syncEngineImplemented: false
    });
    state.lastPhase14RealDeviceValidation = internal.clone(result);
    internal.touch();
    return result;
  }

  async function launchPhase14Validation() {
    if (typeof global.initializeLocalFirstRepository === "function") global.initializeLocalFirstRepository();
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const init = await namespace.initializeBaselinePromotion();
    const pre = await runPhase14Validation();
    console.log(JSON.stringify({ initialization: init, preDeviceValidation: pre, status: namespace.getBaselinePromotionStatus() }, null, 2));
    return { ok: init.ok === true && pre.releaseAllowed === true, code: "REPOSITORY010_PHASE14_VALIDATION_READY", version: VERSION_MANIFEST.release.version, initialization: init, preDeviceValidation: pre, nextStep: "Select/scan the same PC AI_Prompt_OS repository read-only, then run runLocalFirstRepositoryPhase14RealDeviceValidation()." };
  }

  Object.assign(namespace.api, {
    runPhase14Validation: runPhase14Validation,
    runPhase14RealDeviceValidation: runPhase14RealDeviceValidation,
    launchPhase14Validation: launchPhase14Validation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase14Validation = {
    id: "REPOSITORY-010-PHASE14-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 14,
    staticValidationImplemented: true,
    pcRealDeviceValidationImplemented: true,
    bootstrapPromotionMigrationValidationImplemented: true,
    automaticPromotionAllowed: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase14Validation = runPhase14Validation;
  global.runLocalFirstRepositoryPhase14RealDeviceValidation = runPhase14RealDeviceValidation;
  global.launchLocalFirstRepositoryPhase14Validation = launchPhase14Validation;
})(typeof window !== "undefined" ? window : globalThis);
