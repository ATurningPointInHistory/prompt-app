/* ============================================================
   FILE: 13_local_first_repository_phase15_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.14.0 / Module: Phase 15 Validation 1.0.0
   Phase 15: Controlled Sync Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 15 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase15Validation");
  const RELOAD_SESSION_ID = "REPOSITORY010-PHASE15-RELOAD-SESSION";
  const RELOAD_DIFFERENCE_ID = "REPOSITORY010-PHASE15-RELOAD-DIFFERENCE";
  const RELOAD_EVIDENCE_ID = "REPOSITORY010-PHASE15-RELOAD-EVIDENCE";
  const BASE_REVISION = "REPOSITORY010-CANONICAL-REVISION-0009";

  function validationResult(id, checks, extras) {
    const passed = checks.filter(function (item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function (item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: id,
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: "Phase 15 Controlled Sync Foundation",
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? id + " PASS" : id + " FAIL",
      releaseAllowed: failed === 0 && criticalFailed === 0,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  function add(checks, name, passed, actual, category, severity) {
    checks.push({ name: name, passed: passed === true, actual: internal.clone(actual), category: category || "General", severity: severity || "Critical" });
  }

  async function runPhase15Validation() {
    const checks = [];
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const init = await namespace.initializeLocalFirstRepositorySyncCoordinatorFoundation();
    const persistence = namespace.getLocalFirstRepositoryPersistenceStatus();
    const coordinator = namespace.getLocalFirstRepositorySyncCoordinatorStatus();
    const sessionStatus = namespace.getLocalFirstRepositorySyncSessionStatus();
    const differenceStatus = namespace.getLocalFirstRepositorySyncDifferenceStatus();
    const evidenceStatus = namespace.getLocalFirstRepositorySyncEvidenceStatus();

    add(checks, "Release version is 1.14.0", VERSION_MANIFEST.release.version === "1.14.0", VERSION_MANIFEST.release.version, "Version");
    add(checks, "Decision-010 is frozen baseline", VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-010") !== -1 && VERSION_MANIFEST.release.architectureStatus.indexOf("001..010") !== -1, VERSION_MANIFEST.release, "Architecture");
    add(checks, "Controlled Sync Foundation initializes", init && init.ok === true, init, "Initialization");
    add(checks, "Sync Session module available", sessionStatus.syncSessionImplemented === true && typeof namespace.createLocalFirstRepositorySyncSession === "function", sessionStatus, "Module");
    add(checks, "Difference Detection module available", differenceStatus.differenceDetectionImplemented === true && differenceStatus.revisionComparisonImplemented === true, differenceStatus, "Module");
    add(checks, "Sync Evidence module available", evidenceStatus.syncEvidenceImplemented === true && typeof namespace.createLocalFirstRepositorySyncEvidence === "function", evidenceStatus, "Module");
    add(checks, "Sync Coordinator Foundation available", coordinator.syncCoordinatorFoundationImplemented === true, coordinator, "Module");
    add(checks, "Sync Session contract registered", !!namespace.getContractDefinition("syncSessionDescriptor"), namespace.getContractDefinition("syncSessionDescriptor"), "Contract");
    add(checks, "Sync Difference contract registered", !!namespace.getContractDefinition("syncDifferenceDescriptor"), namespace.getContractDefinition("syncDifferenceDescriptor"), "Contract");
    add(checks, "Sync Evidence contract registered", !!namespace.getContractDefinition("syncEvidenceDescriptor"), namespace.getContractDefinition("syncEvidenceDescriptor"), "Contract");
    add(checks, "Repository Persistence upgraded to DB v7", persistence.databaseVersion === 7, persistence, "Persistence");
    add(checks, "Sync Session persistence store available", persistence.recordTypes.indexOf("syncSession") !== -1, persistence.recordTypes, "Persistence");
    add(checks, "Sync Difference persistence store available", persistence.recordTypes.indexOf("syncDifference") !== -1, persistence.recordTypes, "Persistence");
    add(checks, "Sync Evidence persistence store available", persistence.recordTypes.indexOf("syncEvidence") !== -1, persistence.recordTypes, "Persistence");
    add(checks, "Existing Sync Candidate API is reused", typeof namespace.prepareLocalSyncCandidate === "function", typeof namespace.prepareLocalSyncCandidate, "Reuse");
    add(checks, "Existing Transfer Package API is reused", typeof namespace.prepareLocalTransferPackage === "function", typeof namespace.prepareLocalTransferPackage, "Reuse");
    add(checks, "Existing V2 Transfer API is reused", typeof namespace.receiveV2TransferEnvelope === "function", typeof namespace.receiveV2TransferEnvelope, "Reuse");
    add(checks, "Existing V3 Conflict API is reused", typeof namespace.evaluateV3BaseRevision === "function", typeof namespace.evaluateV3BaseRevision, "Reuse");
    add(checks, "Existing V4 Target Validation API is reused", typeof namespace.evaluateV4TargetEnvironment === "function", typeof namespace.evaluateV4TargetEnvironment, "Reuse");
    add(checks, "Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false && coordinator.syncEngineImplemented === false, coordinator, "Authority");
    add(checks, "Cross-device real sync remains unimplemented", VERSION_MANIFEST.implementation.crossDeviceRealSyncImplemented === false && coordinator.crossDeviceRealSyncImplemented === false, coordinator, "Boundary");
    add(checks, "Automatic acceptance remains prohibited", coordinator.automaticAcceptanceAllowed === false, coordinator, "Authority");
    add(checks, "Automatic conflict winner remains prohibited", coordinator.automaticConflictWinnerAllowed === false, coordinator, "Authority");
    add(checks, "Automatic baseline promotion remains prohibited", coordinator.automaticBaselinePromotionAllowed === false, coordinator, "Authority");
    add(checks, "Coordinator has no Canonical mutation authority", coordinator.canonicalMutationAuthority === false && VERSION_MANIFEST.authority.syncGrantsMutationAuthority === false, coordinator, "Safety");
    add(checks, "GitHub automatic reflection remains prohibited", coordinator.automaticGitHubReflectionAllowed === false && VERSION_MANIFEST.safety.githubAutomaticReflectionAllowed === false, coordinator, "Boundary");

    const result = validationResult("REPOSITORY-010 Phase 15 Pre-Device Validation", checks, {
      phase15ReadyForPersistenceReloadValidation: checks.every(function (item) { return item.passed; }),
      syncCoordinatorFoundationImplemented: true,
      syncEngineImplemented: false,
      crossDeviceRealSyncImplemented: false,
      canonicalRevisionPromotionPerformed: false
    });
    state.lastPhase15Validation = internal.clone(result);
    state.phase15PreDeviceValidationPassed = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  async function cleanupReloadFixture() {
    for (const pair of [["syncEvidence", RELOAD_EVIDENCE_ID], ["syncDifference", RELOAD_DIFFERENCE_ID], ["syncSession", RELOAD_SESSION_ID]]) {
      try { await namespace.deletePersistedLocalFirstRepositoryRecord(pair[0], pair[1]); } catch (_) {}
    }
  }

  async function preparePhase15ReloadValidation() {
    const pre = await runPhase15Validation();
    if (!pre.releaseAllowed) return internal.buildResult(false, "REPOSITORY010_PHASE15_PREVALIDATION_REQUIRED", "Blocked", { preDeviceValidation: pre });
    await cleanupReloadFixture();
    const session = await namespace.createLocalFirstRepositorySyncSession({
      syncSessionId: RELOAD_SESSION_ID,
      sourceNodeId: "REPOSITORY010-ANDROID-VALIDATED-REPLICA",
      targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
      direction: "push",
      baseRevisionId: BASE_REVISION,
      sourceRevisionId: "REPOSITORY010-PHASE15-RELOAD-CANDIDATE",
      targetRevisionId: BASE_REVISION,
      sessionStatus: "CREATED"
    });
    if (!session || session.ok !== true) return session;
    const difference = await namespace.detectLocalFirstRepositorySyncDifference(RELOAD_SESSION_ID,
      { revisionId: "REPOSITORY010-PHASE15-RELOAD-CANDIDATE", manifestHash: "phase15-source-manifest", scriptSetHash: "phase15-source-script-set", repositoryStateHash: "phase15-source-state", fileHashes: { "fixture.js": { sha256: "source" } } },
      { revisionId: BASE_REVISION, manifestHash: "phase15-target-manifest", scriptSetHash: "phase15-target-script-set", repositoryStateHash: "phase15-target-state", fileHashes: { "fixture.js": { sha256: "target" } } },
      { differenceId: RELOAD_DIFFERENCE_ID, baseRevisionId: BASE_REVISION }
    );
    if (!difference || difference.ok !== true) return difference;
    const evidence = await namespace.createLocalFirstRepositorySyncEvidence({
      syncEvidenceId: RELOAD_EVIDENCE_ID,
      syncSessionId: RELOAD_SESSION_ID,
      evidenceType: "difference",
      sessionStatus: "DIFFERENCE_DETECTED",
      relatedRecordId: RELOAD_DIFFERENCE_ID,
      validationPassed: true,
      detail: { purpose: "Phase 15 persistence reload validation", differenceType: difference.data.syncDifference.differenceType }
    });
    if (!evidence || evidence.ok !== true) return evidence;
    const sessionRead = await namespace.getPersistedLocalFirstRepositoryRecord("syncSession", RELOAD_SESSION_ID);
    const diffRead = await namespace.getPersistedLocalFirstRepositoryRecord("syncDifference", RELOAD_DIFFERENCE_ID);
    const evidenceRead = await namespace.getPersistedLocalFirstRepositoryRecord("syncEvidence", RELOAD_EVIDENCE_ID);
    const ok = !!sessionRead && !!diffRead && !!evidenceRead;
    state.phase15ReloadPrepared = ok;
    internal.touch();
    return internal.buildResult(ok, ok ? "REPOSITORY010_PHASE15_RELOAD_FIXTURE_PREPARED" : "REPOSITORY010_PHASE15_RELOAD_FIXTURE_FAILED", ok ? "Reload Required" : "Failed", {
      syncSessionId: RELOAD_SESSION_ID,
      differenceId: RELOAD_DIFFERENCE_ID,
      syncEvidenceId: RELOAD_EVIDENCE_ID,
      sourceNodeId: "REPOSITORY010-ANDROID-VALIDATED-REPLICA",
      targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL",
      baseRevisionId: BASE_REVISION,
      persistenceReadbackVerified: ok,
      reloadRequired: true,
      canonicalMutationPerformed: false,
      syncEngineInvoked: false,
      automaticAcceptancePerformed: false,
      automaticBaselinePromotionPerformed: false
    });
  }

  async function runPhase15ReloadRecoveryValidation() {
    const checks = [];
    const init = await namespace.initializeLocalFirstRepositorySyncCoordinatorFoundation();
    const session = await namespace.restoreLocalFirstRepositorySyncSession(RELOAD_SESSION_ID);
    const difference = await namespace.restoreLocalFirstRepositorySyncDifference(RELOAD_DIFFERENCE_ID);
    const evidence = await namespace.restoreLocalFirstRepositorySyncEvidence(RELOAD_EVIDENCE_ID);
    add(checks, "Coordinator initializes after reload", init && init.ok === true, init, "Initialization");
    add(checks, "Sync Session restores from IndexedDB", session && session.ok === true && session.data.reloadRecoveryVerified === true, session, "Reload Recovery");
    add(checks, "Sync Difference restores from IndexedDB", difference && difference.ok === true && difference.data.reloadRecoveryVerified === true, difference, "Reload Recovery");
    add(checks, "Sync Evidence restores from IndexedDB", evidence && evidence.ok === true && evidence.data.reloadRecoveryVerified === true, evidence, "Reload Recovery");
    add(checks, "Recovered Session remains non-authoritative", session && session.data.syncSession.canonicalMutationPerformed === false && session.data.syncSession.syncEngineInvoked === false, session && session.data.syncSession, "Authority");
    add(checks, "Recovered Difference detects source-ahead without winner", difference && difference.data.syncDifference.differenceType === "source-ahead" && difference.data.syncDifference.conflictCandidate === false, difference && difference.data.syncDifference, "Difference");
    add(checks, "Recovered Evidence grants no authority", evidence && evidence.data.syncEvidence.authorityEffect === "none" && evidence.data.syncEvidence.canonicalMutationPerformed === false, evidence && evidence.data.syncEvidence, "Authority");
    const result = validationResult("REPOSITORY-010 Phase 15 Persistence Reload Validation", checks, { reloadRecoveryVerified: checks.every(function (item) { return item.passed; }), syncEngineImplemented: false, canonicalMutationPerformed: false });
    state.lastPhase15ReloadValidation = internal.clone(result);
    state.phase15ReloadValidationPassed = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  async function runPhase15RealDeviceValidation() {
    const checks = [];
    const pre = await runPhase15Validation();
    const reload = await runPhase15ReloadRecoveryValidation();
    const scan = state.lastDesktopRepositoryScan || null;
    const coordinator = namespace.getLocalFirstRepositorySyncCoordinatorStatus();
    const ua = global.navigator && global.navigator.userAgent || "";
    const platform = global.navigator && global.navigator.platform || "";
    add(checks, "Phase 15 pre-device validation passes", pre.releaseAllowed === true, pre, "Pre-Device");
    add(checks, "Phase 15 persistence reload validation passes", reload.releaseAllowed === true, reload, "Reload Recovery");
    add(checks, "Receiver runtime is PC real environment", /Windows|Macintosh|Linux/i.test(ua) && !/Android|iPhone|iPad/i.test(ua), { userAgent: ua, platform: platform }, "PC Real Environment");
    add(checks, "PC Repository has been read-only scanned", !!scan && scan.readOnly === true && scan.writeAttempted === false, scan, "PC Repository");
    add(checks, "PC Repository integrity is verified", !!scan && scan.integrity && scan.integrity.status === "verified" && scan.integrity.allFileHashesVerified === true && scan.integrity.scriptSetVerified === true && scan.integrity.manifestHashVerified === true && scan.integrity.indexSequenceMatches === true, scan && scan.integrity, "PC Repository");
    add(checks, "Decision-010 coordinator remains foundation-only", coordinator.syncCoordinatorFoundationImplemented === true && coordinator.syncEngineImplemented === false, coordinator, "Architecture");
    add(checks, "No automatic acceptance/conflict winner/promotion enabled", coordinator.automaticAcceptanceAllowed === false && coordinator.automaticConflictWinnerAllowed === false && coordinator.automaticBaselinePromotionAllowed === false, coordinator, "Authority");
    add(checks, "No Canonical mutation authority is granted to Sync", coordinator.canonicalMutationAuthority === false, coordinator, "Safety");
    add(checks, "Cross-device real sync remains deferred", coordinator.crossDeviceRealSyncImplemented === false, coordinator, "Boundary");
    add(checks, "GitHub automatic reflection remains disabled", coordinator.automaticGitHubReflectionAllowed === false, coordinator, "Boundary");
    const result = validationResult("REPOSITORY-010 Phase 15 Real Device Validation", checks, { phase15Complete: checks.every(function (item) { return item.passed; }), pcRealDevice: true, persistenceReloadVerified: reload.releaseAllowed === true, controlledSyncFoundationImplemented: true, syncEngineImplemented: false, crossDeviceRealSyncImplemented: false, canonicalRevisionPromoted: false });
    state.lastPhase15RealDeviceValidation = internal.clone(result);
    state.phase15RealDeviceValidationPassed = result.releaseAllowed === true;
    internal.touch();
    return result;
  }

  async function launchPhase15Validation() {
    const init = await namespace.initializeLocalFirstRepositorySyncCoordinatorFoundation();
    const pre = await runPhase15Validation();
    return { ok: init.ok === true && pre.releaseAllowed === true, code: "REPOSITORY010_PHASE15_VALIDATION_READY", version: VERSION_MANIFEST.release.version, initialization: init, preDeviceValidation: pre, nextStep: "Run prepareLocalFirstRepositoryPhase15ReloadValidation(), reload the page, scan the PC AI_Prompt_OS repository read-only, then run runLocalFirstRepositoryPhase15RealDeviceValidation()." };
  }

  Object.assign(namespace.api, {
    runPhase15Validation: runPhase15Validation,
    preparePhase15ReloadValidation: preparePhase15ReloadValidation,
    runPhase15ReloadRecoveryValidation: runPhase15ReloadRecoveryValidation,
    runPhase15RealDeviceValidation: runPhase15RealDeviceValidation,
    launchPhase15Validation: launchPhase15Validation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase15Validation = { id: "REPOSITORY-010-PHASE15-VALIDATION", version: MODULE_VERSION, status: "Ready", phase: 15, persistenceReloadValidationImplemented: true, pcRealDeviceValidationImplemented: true, crossDeviceRealSyncValidationDeferred: true, syncEngineImplemented: false, loadedAt: internal.nowIso() };

  global.launchLocalFirstRepositoryPhase15Validation = launchPhase15Validation;
  global.runLocalFirstRepositoryPhase15Validation = runPhase15Validation;
  global.prepareLocalFirstRepositoryPhase15ReloadValidation = preparePhase15ReloadValidation;
  global.runLocalFirstRepositoryPhase15ReloadRecoveryValidation = runPhase15ReloadRecoveryValidation;
  global.runLocalFirstRepositoryPhase15RealDeviceValidation = runPhase15RealDeviceValidation;
})(typeof window !== "undefined" ? window : globalThis);
