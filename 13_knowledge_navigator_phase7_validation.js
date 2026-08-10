/* ============================================================
   FILE: 13_knowledge_navigator_phase7_validation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Phase 7 Validation 1.0.0
   Phase 7: Session / Persistence / Reload
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 7 Validation blocked.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase7Validation");

  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase7Validation")) state.lastPhase7Validation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPhase7ReloadValidation")) state.lastPhase7ReloadValidation = null;

  function arr(value) { return Array.isArray(value) ? value : []; }
  function clone(value) { return internal.clone(value); }

  function checkFactory(checks) {
    return function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : (typeof detail === "string" ? detail : JSON.stringify(detail)),
        group: group || "Phase 7",
        severity: severity || "High"
      });
    };
  }

  function summarize(checks, label) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return item.passed !== true && item.severity === "Critical"; }).length;
    return {
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? label + " PASS" : label + " FAIL"
    };
  }

  async function ensureFileFixture(check) {
    const opened = typeof namespace.openLatestIntelligencePackageSource === "function"
      ? await namespace.openLatestIntelligencePackageSource({ allowIndexedDB: true })
      : null;
    check("IDE-170 Intelligence Package opens for Phase 7", opened && opened.ok === true, opened && opened.code, "Package Intake", "Critical");
    const canonical = typeof namespace.loadKnowledgeNavigatorCanonicalSnapshot === "function" ? namespace.loadKnowledgeNavigatorCanonicalSnapshot() : null;
    check("Canonical Snapshot loads for Phase 7", canonical && canonical.ok === true, canonical && canonical.code, "Package Intake", "Critical");
    const records = canonical && canonical.ok === true && canonical.data ? arr(canonical.data.records) : [];
    const fileRecord = records.find(function findFile(record) { return record && record.recordType === "file"; }) || null;
    const canonicalId = fileRecord && fileRecord.identity && fileRecord.identity.canonicalId || null;
    check("Phase 7 file fixture exists", Boolean(canonicalId), canonicalId, "Package Intake", "Critical");
    return canonicalId;
  }

  function verifySelectiveReceiptFields(check, receipt) {
    check("Navigation Receipt satisfies frozen contract", namespace.validateContract("navigationReceipt", receipt).valid === true, namespace.validateContract("navigationReceipt", receipt).failed, "Contracts", "Critical");
    check("Navigation Receipt stores Source Snapshot", Boolean(receipt && receipt.sourceSnapshot), receipt && receipt.sourceSnapshot && receipt.sourceSnapshot.snapshotVersion, "Persistence", "Critical");
    check("Navigation Receipt stores path, not traversal queue", Array.isArray(receipt && receipt.path), arr(receipt && receipt.path).length, "Selective Persistence", "Critical");
    check("Navigation Receipt excludes visitedNodes runtime state", !Object.prototype.hasOwnProperty.call(receipt || {}, "visitedNodes"), "not persisted", "Selective Persistence", "Critical");
    check("Navigation Receipt excludes visitedRelationships runtime state", !Object.prototype.hasOwnProperty.call(receipt || {}, "visitedRelationships"), "not persisted", "Selective Persistence", "Critical");
    check("Navigation Receipt excludes traversal queue", !Object.prototype.hasOwnProperty.call(receipt || {}, "traversalQueue"), "not persisted", "Selective Persistence", "Critical");
    check("Navigation Receipt excludes traversal stack", !Object.prototype.hasOwnProperty.call(receipt || {}, "traversalStack"), "not persisted", "Selective Persistence", "Critical");
    check("Navigation Receipt excludes Provider handles", !Object.prototype.hasOwnProperty.call(receipt || {}, "providerHandles"), "not persisted", "Selective Persistence", "Critical");
    check("Navigation Receipt excludes Source payloads", !Object.prototype.hasOwnProperty.call(receipt || {}, "sourcePayloads"), "not persisted", "Selective Persistence", "Critical");
    check("Navigation Receipt integrity algorithm is governed", Boolean(receipt && receipt.integrity && ["SHA-256", "FNV-1A-32"].includes(receipt.integrity.algorithm)), receipt && receipt.integrity, "Integrity", "Critical");
  }

  async function runKnowledgeNavigatorPhase7Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    const check = checkFactory(checks);

    const initialized = namespace.initialize({ requireIDE170: true });
    check("IDE-180 initialization succeeds", initialized && initialized.ok === true, initialized && initialized.code, "Initialization", "Critical");
    check("Release Version is 1.6.0", VERSION_MANIFEST.release.version === "1.6.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 7", VERSION_MANIFEST.implementation.phase === 7 && /Phase 7/.test(VERSION_MANIFEST.release.implementationPhase), VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains 1.0.0", VERSION_MANIFEST.release.designFreezeVersion === "1.0.0", VERSION_MANIFEST.release.designFreezeVersion, "Manifest", "High");
    check("Completed phases include 1 through 6", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6]), VERSION_MANIFEST.implementation.completedPhases, "Manifest", "High");

    Object.keys(VERSION_MANIFEST.safety || {}).forEach(function safetyFlag(name) {
      check("Safety flag remains disabled: " + name, VERSION_MANIFEST.safety[name] === false, VERSION_MANIFEST.safety[name], "Safety", "Critical");
    });
    check("Navigation Receipt Contract remains 1.0.0", VERSION_MANIFEST.getContractVersion("navigationReceipt") === "1.0.0", VERSION_MANIFEST.getContractVersion("navigationReceipt"), "Contracts", "Critical");
    check("Session module is Ready", namespace.modules.session && namespace.modules.session.status === "Ready", namespace.modules.session && namespace.modules.session.status, "Modules", "Critical");
    check("Persistence module is Ready", namespace.modules.persistence && namespace.modules.persistence.status === "Ready", namespace.modules.persistence && namespace.modules.persistence.status, "Modules", "Critical");
    check("Session is runtime-only", namespace.modules.session && namespace.modules.session.runtimeOnly === true, namespace.modules.session && namespace.modules.session.runtimeOnly, "Session", "Critical");
    const persistenceStatus = namespace.getKnowledgeNavigatorPersistenceStatus();
    check("Persistence is selective", persistenceStatus.selectivePersistence === true, persistenceStatus.selectivePersistence, "Persistence", "Critical");
    check("Persistence never stores runtime queues", persistenceStatus.persistedRuntimeQueues === false, persistenceStatus.persistedRuntimeQueues, "Selective Persistence", "Critical");
    check("Persistence never stores Provider handles", persistenceStatus.persistedProviderHandles === false, persistenceStatus.persistedProviderHandles, "Selective Persistence", "Critical");
    check("Persistence never stores Source payloads", persistenceStatus.persistedSourcePayloads === false, persistenceStatus.persistedSourcePayloads, "Selective Persistence", "Critical");

    if (settings.useMemoryAdapter === true) {
      const memory = namespace.createMemoryNavigationPersistenceAdapter();
      const adapterSet = namespace.setNavigationPersistenceAdapter(memory);
      check("Memory Persistence adapter can be injected for deterministic pre-Android validation", adapterSet && adapterSet.ok === true, adapterSet && adapterSet.code, "Fixture", "High");
    } else {
      namespace.setNavigationPersistenceAdapter(null);
      check("IndexedDB is available on real-device gate", Boolean(global.indexedDB), Boolean(global.indexedDB), "IndexedDB", "Critical");
    }

    const fileId = await ensureFileFixture(check);
    let sessionId = null;
    let navigationResult = null;
    let receipt = null;
    let persisted = null;

    if (fileId) {
      const created = namespace.createNavigationSession({ metadata: { purpose: "IDE-180 Phase 7 Validation", validation: true } });
      check("Navigation Session creates", created && created.ok === true, created && created.code, "Session", "Critical");
      sessionId = created && created.data && created.data.session && created.data.session.sessionId || null;
      check("Session has stable identity", Boolean(sessionId), sessionId, "Session", "Critical");
      const sessionBefore = namespace.getNavigationSession(sessionId);
      check("Session starts with Source Snapshot", Boolean(sessionBefore && sessionBefore.sourceSnapshot), sessionBefore && sessionBefore.sourceSnapshot && sessionBefore.sourceSnapshot.snapshotVersion, "Session", "Critical");
      check("Session history starts empty", arr(sessionBefore && sessionBefore.navigationHistory).length === 0, arr(sessionBefore && sessionBefore.navigationHistory).length, "Session", "High");

      const navigated = await namespace.navigateKnowledgeInSession(sessionId, { navigationType: "file", target: fileId });
      check("Session Navigation executes existing Navigator", navigated && navigated.ok === true, navigated && navigated.code, "Session", "Critical");
      navigationResult = navigated && navigated.data && navigated.data.result || null;
      check("Session Navigation returns complete Result", navigationResult && navigationResult.status === "complete", navigationResult && navigationResult.status, "Session", "Critical");
      const sessionAfter = namespace.getNavigationSession(sessionId);
      check("Session history records Navigation summary", arr(sessionAfter && sessionAfter.navigationHistory).length === 1, arr(sessionAfter && sessionAfter.navigationHistory).length, "Session", "Critical");
      check("Session history is not Source Lineage", !Object.prototype.hasOwnProperty.call(sessionAfter || {}, "lineage"), "separate", "Session", "Critical");
      check("Session remains read-only", sessionAfter && sessionAfter.readOnly === true, sessionAfter && sessionAfter.readOnly, "Safety", "Critical");

      const built = await namespace.buildNavigationReceipt(sessionId, navigationResult, { phase7ReloadGate: true });
      check("Navigation Receipt builds", built && built.ok === true, built && built.code, "Persistence", "Critical");
      receipt = built && built.data && built.data.receipt || null;
      if (receipt) verifySelectiveReceiptFields(check, receipt);
      check("Phase 7 Reload Gate marker is persisted in summary", receipt && receipt.navigationSummary && receipt.navigationSummary.phase7ReloadGate === true, receipt && receipt.navigationSummary && receipt.navigationSummary.phase7ReloadGate, "Reload Gate", "Critical");

      const verified = receipt ? await namespace.verifyNavigationReceipt(receipt) : null;
      check("Receipt verifies before write", verified && verified.valid === true, verified && verified.state, "Integrity", "Critical");
      persisted = receipt ? await namespace.persistNavigationReceipt(receipt) : null;
      check("Receipt persists with read-back verification", persisted && persisted.ok === true && persisted.data && persisted.data.readBackVerified === true, persisted && persisted.code, "IndexedDB", "Critical");
      const readBack = receipt ? await namespace.getNavigationReceipt(receipt.receiptId) : null;
      check("Persisted Receipt reads back by receiptId", readBack && readBack.receiptId === receipt.receiptId, readBack && readBack.receiptId, "IndexedDB", "Critical");
      const readBackVerified = readBack ? await namespace.verifyNavigationReceipt(readBack) : null;
      check("Read-back Receipt integrity verifies", readBackVerified && readBackVerified.valid === true, readBackVerified && readBackVerified.state, "Integrity", "Critical");

      const runtimeCleared = namespace.clearNavigationRuntimeSessions();
      check("Runtime Session state can be cleared independently", runtimeCleared && runtimeCleared.ok === true, runtimeCleared && runtimeCleared.data && runtimeCleared.data.cleared, "Reload", "Critical");
      check("Clearing Runtime Sessions does not delete Receipt", receipt && Boolean(await namespace.getNavigationReceipt(receipt.receiptId)), receipt && receipt.receiptId, "Reload", "Critical");
      const restoredSameRuntime = receipt ? await namespace.restoreNavigationReceipt(receipt.receiptId) : null;
      check("Receipt can restore after Runtime Session reset", restoredSameRuntime && restoredSameRuntime.data && restoredSameRuntime.data.state === "restored", restoredSameRuntime && restoredSameRuntime.data && restoredSameRuntime.data.state, "Reload", "Critical");

      if (receipt) {
        const staleSnapshot = clone(receipt.sourceSnapshot);
        if (staleSnapshot.providers && staleSnapshot.providers.length) {
          staleSnapshot.providers[0].recordCount = Number(staleSnapshot.providers[0].recordCount || 0) + 1;
        } else if (staleSnapshot.ide170Package) {
          staleSnapshot.ide170Package.packageHash = "changed";
        }
        const staleComparison = namespace.compareKnowledgeNavigatorSourceSnapshot(receipt.sourceSnapshot, staleSnapshot);
        check("Changed Source Snapshot is classified stale", staleComparison && staleComparison.state === "stale", staleComparison, "Stale Detection", "Critical");

        const incompatibleSnapshot = clone(receipt.sourceSnapshot);
        incompatibleSnapshot.ide180 = incompatibleSnapshot.ide180 || {};
        incompatibleSnapshot.ide180.contractVersions = incompatibleSnapshot.ide180.contractVersions || {};
        incompatibleSnapshot.ide180.contractVersions.navigationReceipt = "9.9.9";
        const incompatibleComparison = namespace.compareKnowledgeNavigatorSourceSnapshot(incompatibleSnapshot, receipt.sourceSnapshot);
        check("Changed Receipt Contract is classified incompatible", incompatibleComparison && incompatibleComparison.state === "incompatible", incompatibleComparison, "Compatibility", "Critical");

        const missingSnapshot = clone(receipt.sourceSnapshot);
        missingSnapshot.ide170Package = null;
        const missingComparison = namespace.compareKnowledgeNavigatorSourceSnapshot(receipt.sourceSnapshot, missingSnapshot);
        check("Missing required IDE-170 Package is classified missing-source", missingComparison && missingComparison.state === "missing-source", missingComparison, "Missing Source", "Critical");

        const corruptedReceipt = clone(receipt);
        corruptedReceipt.navigationSummary.resultStatus = "tampered";
        const corruptedVerification = await namespace.verifyNavigationReceipt(corruptedReceipt);
        check("Tampered Receipt is classified corrupted", corruptedVerification && corruptedVerification.valid === false && corruptedVerification.state === "corrupted", corruptedVerification && corruptedVerification.reason, "Integrity", "Critical");
      }
    }

    const sessionStatus = namespace.getKnowledgeNavigatorSessionStatus();
    check("Runtime Session reset leaves zero active Sessions", sessionStatus.sessionCount === 0, sessionStatus.sessionCount, "Reload", "Critical");
    check("Hidden Session learning remains disabled", sessionStatus.hiddenLearningAllowed === false, sessionStatus.hiddenLearningAllowed, "Safety", "Critical");
    check("All twenty Navigation Types remain implemented", namespace.listNavigationTypes().filter(function item(t) { return t.implemented === true; }).length === 20, namespace.listNavigationTypes().filter(function item(t) { return t.implemented === true; }).length, "Regression", "Critical");
    check("Five Source Providers remain registered", namespace.listProviderDefinitions().length === 5, namespace.listProviderDefinitions().length, "Regression", "Critical");
    check("Six Resolvers remain registered", namespace.listResolverDefinitions().length === 6, namespace.listResolverDefinitions().length, "Regression", "Critical");
    check("Authority scoring remains disabled", VERSION_MANIFEST.safety.authorityScoringAllowed === false, VERSION_MANIFEST.safety.authorityScoringAllowed, "Regression", "Critical");
    check("Conflict scoring remains disabled", VERSION_MANIFEST.safety.conflictScoringAllowed === false, VERSION_MANIFEST.safety.conflictScoringAllowed, "Regression", "Critical");
    check("Source mutation remains disabled", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Regression", "Critical");
    check("Phase 7 Validation module is loaded", Boolean(namespace.modules.phase7Validation), namespace.modules.phase7Validation && namespace.modules.phase7Validation.status, "Modules", "Critical");

    const summary = summarize(checks, "IDE-180 Phase 7 Session / Persistence");
    const result = Object.assign({
      id: internal.nextId("IDE-180-PHASE7-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      releaseAllowed: false,
      phase8Allowed: false,
      functionalValidationPassed: summary.failed === 0,
      fullReloadValidationRequired: true,
      reloadValidationPending: summary.failed === 0,
      reloadReceiptId: receipt && receipt.receiptId || null,
      readOnly: true,
      persistence: namespace.getKnowledgeNavigatorPersistenceStatus(),
      checks: checks,
      validatedAt: internal.nowIso()
    }, summary);
    if (summary.failed === 0) result.status = "IDE-180 Phase 7 Session / Persistence PASS - Full Reload Pending";
    state.lastPhase7Validation = clone(result);
    namespace.modules.phase7Validation.status = summary.failed === 0 ? "Reload Pending" : "Blocked";
    internal.touch();
    return clone(result);
  }

  async function findReloadGateReceipt() {
    const receipts = await namespace.listNavigationReceipts();
    return receipts.find(function gate(item) { return item && item.navigationSummary && item.navigationSummary.phase7ReloadGate === true; }) || null;
  }

  async function runKnowledgeNavigatorPhase7ReloadValidation() {
    namespace.setNavigationPersistenceAdapter(null);
    const checks = [];
    const check = checkFactory(checks);
    const initialized = namespace.initialize({ requireIDE170: true });
    check("IDE-180 initializes after browser reload", initialized && initialized.ok === true, initialized && initialized.code, "Reload", "Critical");
    check("IndexedDB is available after browser reload", Boolean(global.indexedDB), Boolean(global.indexedDB), "Reload", "Critical");

    const receipt = await findReloadGateReceipt();
    check("Phase 7 Reload Gate Receipt exists in IndexedDB", Boolean(receipt), receipt && receipt.receiptId, "Reload", "Critical");
    const sessionLoadedAt = namespace.modules.session && namespace.modules.session.loadedAt || null;
    const persistenceLoadedAt = namespace.modules.persistence && namespace.modules.persistence.loadedAt || null;
    const receiptCreatedAt = receipt && receipt.createdAt || null;
    const sessionLoadedAfterReceipt = Boolean(sessionLoadedAt && receiptCreatedAt && new Date(sessionLoadedAt).getTime() > new Date(receiptCreatedAt).getTime());
    const persistenceLoadedAfterReceipt = Boolean(persistenceLoadedAt && receiptCreatedAt && new Date(persistenceLoadedAt).getTime() > new Date(receiptCreatedAt).getTime());
    check("Session module loaded after persisted Receipt was created", sessionLoadedAfterReceipt, (sessionLoadedAt || "") + " > " + (receiptCreatedAt || ""), "Full Reload Proof", "Critical");
    check("Persistence module loaded after persisted Receipt was created", persistenceLoadedAfterReceipt, (persistenceLoadedAt || "") + " > " + (receiptCreatedAt || ""), "Full Reload Proof", "Critical");

    const sessionStatusBefore = namespace.getKnowledgeNavigatorSessionStatus();
    check("Runtime Session was not silently persisted/restored as Knowledge", sessionStatusBefore.sessionCount === 0, sessionStatusBefore.sessionCount, "Selective Persistence", "Critical");

    const verification = receipt ? await namespace.verifyNavigationReceipt(receipt) : null;
    check("Reloaded Receipt integrity is valid", verification && verification.valid === true, verification && verification.state, "Integrity", "Critical");
    const restored = receipt ? await namespace.restoreNavigationReceipt(receipt.receiptId) : null;
    check("Full Reload Restore resolves as restored", restored && restored.data && restored.data.state === "restored", restored && restored.data && restored.data.state, "Full Reload", "Critical");
    check("Restored Receipt is not stale", restored && restored.data && restored.data.stale === false, restored && restored.data && restored.data.reasons, "Full Reload", "Critical");
    check("Restored Receipt is not incompatible", restored && restored.data && restored.data.incompatible === false, restored && restored.data && restored.data.incompatible, "Full Reload", "Critical");
    check("Restored Receipt is not corrupted", restored && restored.data && restored.data.corrupted === false, restored && restored.data && restored.data.corrupted, "Full Reload", "Critical");
    check("Restored Receipt is not missing-source", restored && restored.data && restored.data.missingSource === false, restored && restored.data && restored.data.missingSource, "Full Reload", "Critical");
    check("Restored Receipt keeps Source Snapshot", restored && restored.data && restored.data.receipt && restored.data.receipt.sourceSnapshot, restored && restored.data && restored.data.receipt && restored.data.receipt.sourceSnapshot && restored.data.receipt.sourceSnapshot.snapshotVersion, "Traceability", "Critical");
    check("Restored Receipt keeps Authority summary", restored && restored.data && restored.data.receipt && restored.data.receipt.authoritySummary, restored && restored.data && restored.data.receipt && restored.data.receipt.authoritySummary && restored.data.receipt.authoritySummary.status, "Traceability", "High");
    check("Restored Receipt keeps Evidence references", restored && restored.data && restored.data.receipt && Array.isArray(restored.data.receipt.evidenceRefs), restored && restored.data && restored.data.receipt && arr(restored.data.receipt.evidenceRefs).length, "Traceability", "High");
    check("No active Runtime Session is recreated by Receipt restore", namespace.getKnowledgeNavigatorSessionStatus().sessionCount === 0, namespace.getKnowledgeNavigatorSessionStatus().sessionCount, "Selective Persistence", "Critical");
    check("Persistence remains Source read-only boundary", namespace.getKnowledgeNavigatorPersistenceStatus().readOnlySourceBoundary === true, namespace.getKnowledgeNavigatorPersistenceStatus().readOnlySourceBoundary, "Safety", "Critical");
    check("Authority scoring remains disabled after reload", VERSION_MANIFEST.safety.authorityScoringAllowed === false, VERSION_MANIFEST.safety.authorityScoringAllowed, "Safety", "Critical");
    check("Missing Source inference remains disabled after reload", VERSION_MANIFEST.safety.missingSourceInferenceAllowed === false, VERSION_MANIFEST.safety.missingSourceInferenceAllowed, "Safety", "Critical");

    const summary = summarize(checks, "IDE-180 Phase 7 Full Reload Restore");
    const result = Object.assign({
      id: internal.nextId("IDE-180-PHASE7-RELOAD-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      releaseAllowed: summary.failed === 0,
      phase8Allowed: summary.failed === 0,
      fullReloadValidated: summary.failed === 0,
      reloadReceiptId: receipt && receipt.receiptId || null,
      restoreState: restored && restored.data && restored.data.state || null,
      readOnly: true,
      checks: checks,
      validatedAt: internal.nowIso()
    }, summary);
    state.lastPhase7ReloadValidation = clone(result);
    state.lastValidation = clone(result);
    namespace.modules.phase7Validation.status = summary.failed === 0 ? "Ready" : "Blocked";
    internal.touch();
    return clone(result);
  }

  function getKnowledgeNavigatorPhase7ValidationStatus() {
    return {
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      phase7: clone(state.lastPhase7Validation),
      reload: clone(state.lastPhase7ReloadValidation),
      phase8Allowed: Boolean(state.lastPhase7ReloadValidation && state.lastPhase7ReloadValidation.phase8Allowed === true)
    };
  }

  Object.assign(namespace.api, {
    runKnowledgeNavigatorPhase7Validation: runKnowledgeNavigatorPhase7Validation,
    runKnowledgeNavigatorPhase7ReloadValidation: runKnowledgeNavigatorPhase7ReloadValidation,
    getKnowledgeNavigatorPhase7ValidationStatus: getKnowledgeNavigatorPhase7ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase7Validation = {
    id: "IDE-180-PHASE7-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 7,
    fullReloadRequired: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };

  global.runKnowledgeNavigatorPhase7Validation = runKnowledgeNavigatorPhase7Validation;
  global.runKnowledgeNavigatorPhase7ReloadValidation = runKnowledgeNavigatorPhase7ReloadValidation;
})(typeof window !== "undefined" ? window : globalThis);
