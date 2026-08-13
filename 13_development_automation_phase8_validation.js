/* ============================================================
   FILE: 13_development_automation_phase8_validation.js
   IDE-190 Development Automation
   Release: 1.7.0
   Phase 8: Audit / Session / Persistence / Receipt Validation
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Phase 8 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase8Validation");
  const PHASE8_FILES = [
    "13_development_automation_session.js",
    "13_development_automation_audit.js",
    "13_development_automation_persistence.js",
    "13_development_automation_receipt.js",
    "13_development_automation_phase8_validation.js"
  ];

  function checkCollector() {
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), group: group || "General", severity: severity || "Critical" });
    }
    return { checks: checks, check: check };
  }

  function finish(checks, stage, stageName, extras) {
    const passed = checks.filter(function item(entry) { return entry.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function item(entry) { return !entry.passed && entry.severity === "Critical"; }).length;
    const result = Object.assign({
      id: internal.nextId(stage === "B" ? "IDE-190-PHASE8-ANDROID-VALIDATION" : "IDE-190-PHASE8-STAGE-A-VALIDATION"),
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? (stage === "B" ? "IDE-190 Phase 8 Android Full Reload Gate PASS" : "IDE-190 Phase 8 Stage A Audit / Session / Persistence / Receipt PASS - Full Reload Pending") : (stage === "B" ? "IDE-190 Phase 8 Android Full Reload Gate FAIL" : "IDE-190 Phase 8 Stage A Audit / Session / Persistence / Receipt FAIL"),
      checks: checks,
      validatedAt: internal.nowIso(),
      stage: stage,
      stageName: stageName
    }, extras || {});
    return result;
  }

  async function appendAudit(sessionId, eventType, summary, outcome, refs) {
    return namespace.appendAutomationAuditEvent({
      automationSessionId: sessionId,
      eventType: eventType,
      summary: summary,
      outcome: outcome || "Recorded",
      actor: "Project Owner",
      sourceComponentId: "IDE-190",
      federatedReferences: refs || []
    });
  }

  function receiptExclusionProof(receipt) {
    const text = JSON.stringify(receipt || {}).toLowerCase();
    const banned = ["providerhandle", "sourcepayload", "sourcecache", "runtimequeue", "runtimestack", "hiddenlearningstate", "approvalchallenge", "executionchallenge", "temporarysourcepayload"];
    return { clean: banned.every(function absent(key) { return text.indexOf(key) < 0; }), found: banned.filter(function present(key) { return text.indexOf(key) >= 0; }) };
  }

  async function createReloadGateReceipt() {
    if (global.indexedDB) namespace.setAutomationPersistenceAdapter(null);
    const sessionResult = namespace.createAutomationSession({ actor: "Project Owner" });
    if (!sessionResult || sessionResult.ok !== true) return { ok: false, reason: "session-create", detail: sessionResult };
    const session = sessionResult.data.session;
    await appendAudit(session.automationSessionId, "Session-Created", "Phase 8 Android full reload proof session created.", "Active");
    const phase7Ref = state.lastPhase7AndroidValidation && state.lastPhase7AndroidValidation.id ? {
      ownerComponentId: "IDE-190", recordType: "phase7-validation", recordId: state.lastPhase7AndroidValidation.id, authoritative: true
    } : {
      ownerComponentId: "IDE-190", recordType: "phase7-release", recordId: "IDE-190-1.6.0-PHASE7-COMPLETE", authoritative: true
    };
    namespace.bindAutomationSessionReference({ automationSessionId: session.automationSessionId, reference: phase7Ref });
    await appendAudit(session.automationSessionId, "Functional-Gate-Passed", "Phase 8 functional validation completed; browser full reload remains required.", "Completed", [phase7Ref]);
    namespace.closeAutomationSession({ automationSessionId: session.automationSessionId, outcome: "Completed" });
    const built = await namespace.buildAutomationReceipt({ automationSessionId: session.automationSessionId, phase8ReloadGate: true, functionalValidationPassed: true });
    if (!built || built.ok !== true) return { ok: false, reason: "receipt-build", detail: built };
    const persisted = await namespace.persistFinalAutomationReceipt({ receipt: built.data.receipt });
    if (!persisted || persisted.ok !== true) return { ok: false, reason: "receipt-persist", detail: persisted };
    return { ok: true, receipt: built.data.receipt, persistence: persisted.data };
  }

  async function runDevelopmentAutomationPhase8Validation() {
    const collector = checkCollector();
    const check = collector.check;

    const init = typeof namespace.initialize === "function" ? namespace.initialize() : null;
    check("Foundation initialization succeeds", init && init.ok === true, init && init.code, "Initialization", "Critical");
    check("Release Version is 1.7.0", VERSION_MANIFEST.release.version === "1.7.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 8", VERSION_MANIFEST.release.phase === 8 && VERSION_MANIFEST.release.implementationPhase === "Phase 8 Audit / Session / Persistence / Receipt", VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains exact", VERSION_MANIFEST.release.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Manifest", "Critical");
    check("Phases 1 through 7 are recorded complete", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6,7]), VERSION_MANIFEST.implementation.completedPhases, "Phase Gate", "Critical");

    Object.keys(VERSION_MANIFEST.safety).forEach(function safety(key) { check("Safety flag remains disabled: " + key, VERSION_MANIFEST.safety[key] === false, VERSION_MANIFEST.safety[key], "Safety", "Critical"); });
    check("Persistent Commit remains prohibited", VERSION_MANIFEST.initialPolicy.persistentCommitAllowed === false, VERSION_MANIFEST.initialPolicy.persistentCommitAllowed, "Safety", "Critical");
    check("Repository starts Trusted", state.repositoryMutationTrust && state.repositoryMutationTrust.status === "Trusted", state.repositoryMutationTrust && state.repositoryMutationTrust.status, "Repository Trust", "Critical");
    check("Mutation Lock starts released", Boolean(state.mutationTrialLock && state.mutationTrialLock.active) === false, state.mutationTrialLock && state.mutationTrialLock.active, "Mutation Lock", "Critical");

    const contracts = namespace.listContractDefinitions ? namespace.listContractDefinitions() : [];
    check("All Phase 1-8 contracts are registered", contracts.length === 26, contracts.length, "Contracts", "Critical");
    ["automationSession","auditEvent","automationReceipt"].forEach(function contract(key) {
      const definition = namespace.getContractDefinition && namespace.getContractDefinition(key);
      check("Phase 8 contract exists: " + key, Boolean(definition && definition.version === "1.0.0"), definition && definition.version, "Contracts", "Critical");
    });

    ["session","audit","persistence","receipt"].forEach(function module(key) {
      check("Module is Ready: " + key, namespace.modules[key] && ["Loaded","Ready"].includes(namespace.modules[key].status), namespace.modules[key] && namespace.modules[key].status, "Modules", "Critical");
    });
    check("Phase 8 Validation module is loaded", namespace.modules.phase8Validation && ["Loaded","Ready"].includes(namespace.modules.phase8Validation.status), namespace.modules.phase8Validation && namespace.modules.phase8Validation.status, "Modules", "Critical");

    const api = namespace.getPublicApiDescription();
    check("Automation Session is implemented", api.sessionImplemented === true, api.sessionImplemented, "Scope", "Critical");
    check("Append-only Audit is implemented", api.auditImplemented === true, api.auditImplemented, "Scope", "Critical");
    check("Selective Persistence is implemented", api.persistenceImplemented === true, api.persistenceImplemented, "Scope", "Critical");
    check("Final Automation Receipt is implemented", api.receiptImplemented === true, api.receiptImplemented, "Scope", "Critical");
    check("Phase 9 UI / Reflection remains not implemented", api.reflectionPackageImplemented === false, api.reflectionPackageImplemented, "Scope", "Critical");

    const memory = namespace.createMemoryAutomationPersistenceAdapter();
    const adapterSet = namespace.setAutomationPersistenceAdapter(memory);
    check("Memory persistence fixture can be installed", adapterSet && adapterSet.ok === true, adapterSet && adapterSet.code, "Persistence", "Critical");

    const sessionResult = namespace.createAutomationSession({ actor: "Project Owner" });
    const session = sessionResult && sessionResult.data && sessionResult.data.session;
    check("Automation Session creates", sessionResult && sessionResult.ok === true && Boolean(session), sessionResult && sessionResult.code, "Session", "Critical");
    check("Session has automationRequestId", Boolean(session && session.automationRequestId), session && session.automationRequestId, "Identity", "Critical");
    check("Session has automationSessionId", Boolean(session && session.automationSessionId), session && session.automationSessionId, "Identity", "Critical");
    check("Session has automationAttemptId", Boolean(session && session.automationAttemptId), session && session.automationAttemptId, "Identity", "Critical");
    check("Session has automationOperationId", Boolean(session && session.automationOperationId), session && session.automationOperationId, "Identity", "Critical");
    check("Session does not synthesize global transactionId", session && session.globalTransactionId === null && session.falseGlobalTransactionSynthesized === false, session && session.globalTransactionId, "Identity", "Critical");
    check("Automation Session is runtime-only", session && session.runtimeOnly === true && session.persisted === false, session && session.persisted, "Selective Persistence", "Critical");

    const navRef = { ownerComponentId: "IDE-180", recordType: "navigation", recordId: "IDE-180-NAVIGATION-PHASE8-FIXTURE", recordHash: "a".repeat(64), authoritative: true };
    const workflowRef = { ownerComponentId: "IDE-160", recordType: "workflow", recordId: "IDE-160-WORKFLOW-PHASE8-FIXTURE", authoritative: true };
    const mutationRef = { ownerComponentId: "IDE-150", recordType: "controlled-mutation", recordId: "IDE-150-MUTATION-PHASE8-FIXTURE", authoritative: true };
    [navRef, workflowRef, mutationRef].forEach(function bind(reference) { namespace.bindAutomationSessionReference({ automationSessionId: session.automationSessionId, reference: reference }); });
    const bound = namespace.getAutomationSession(session.automationSessionId);
    check("Federated authoritative references are bound", bound && bound.federatedReferences.length === 3, bound && bound.federatedReferences.length, "Federated Audit", "Critical");
    check("Authority boundaries remain federated", bound && bound.federatedReferences.some(function x(i){return i.ownerComponentId==="IDE-180";}) && bound.federatedReferences.some(function x(i){return i.ownerComponentId==="IDE-160";}) && bound.federatedReferences.some(function x(i){return i.ownerComponentId==="IDE-150";}), JSON.stringify(bound && bound.federatedReferences), "Federated Audit", "Critical");

    const auditOne = await appendAudit(session.automationSessionId, "Session-Created", "Automation session created.", "Active", [navRef]);
    const auditTwo = await appendAudit(session.automationSessionId, "Controlled-Path-Observed", "Federated ownership references recorded without a global transaction.", "Recorded", [workflowRef, mutationRef]);
    check("First Audit Event appends and persists", auditOne && auditOne.ok === true && auditOne.data && auditOne.data.persistence && auditOne.data.persistence.ok === true, auditOne && auditOne.code, "Audit", "Critical");
    check("Second Audit Event appends and persists", auditTwo && auditTwo.ok === true && auditTwo.data && auditTwo.data.persistence && auditTwo.data.persistence.ok === true, auditTwo && auditTwo.code, "Audit", "Critical");
    const auditEvents = namespace.listAutomationAuditEvents({ automationSessionId: session.automationSessionId });
    check("Audit Events are append-only ordered", auditEvents.length === 2 && auditEvents[0].sequence === 1 && auditEvents[1].sequence === 2, auditEvents.map(function e(x){return x.sequence;}).join(","), "Audit", "Critical");
    check("Audit Events persist only references/summaries", auditEvents.every(function safe(item){ return item.containsSourcePayload === false && item.containsProviderHandle === false && item.containsRuntimeQueueOrStack === false && item.containsHiddenLearningState === false; }), JSON.stringify(auditEvents.map(function s(x){return [x.containsSourcePayload,x.containsProviderHandle,x.containsRuntimeQueueOrStack,x.containsHiddenLearningState];})), "Selective Persistence", "Critical");
    const chain = await namespace.verifyAutomationAuditChain(session.automationSessionId);
    check("Audit hash chain verifies", chain && chain.valid === true && chain.eventCount === 2, chain && chain.lastEventHash, "Audit", "Critical");
    const persistedAudits = await namespace.listPersistedAutomationAuditEvents();
    check("Audit Events read back from persistence", persistedAudits.length === 2, persistedAudits.length, "Persistence", "Critical");

    let duplicateBlocked = false;
    try { await memory.addAuditEvent(persistedAudits[0]); } catch (_) { duplicateBlocked = true; }
    check("Append-only Audit rejects overwrite/duplicate key", duplicateBlocked === true, duplicateBlocked, "Audit", "Critical");

    const closeResult = namespace.closeAutomationSession({ automationSessionId: session.automationSessionId, outcome: "Completed" });
    check("Automation Session closes with governed outcome", closeResult && closeResult.ok === true, closeResult && closeResult.code, "Session", "Critical");
    const built = await namespace.buildAutomationReceipt({ automationSessionId: session.automationSessionId });
    const receipt = built && built.data && built.data.receipt;
    check("Final Automation Receipt builds", built && built.ok === true && Boolean(receipt), built && built.code, "Receipt", "Critical");
    check("Receipt is V8 Finalized record", receipt && receipt.validationLayer === "V8" && receipt.status === "Finalized", receipt && receipt.validationLayer, "Receipt", "Critical");
    check("Receipt preserves federated identities", receipt && receipt.automationRequestId === session.automationRequestId && receipt.automationSessionId === session.automationSessionId && receipt.automationAttemptId === session.automationAttemptId && receipt.automationOperationId === session.automationOperationId, receipt && receipt.automationSessionId, "Identity", "Critical");
    check("Receipt does not synthesize global transaction", receipt && receipt.globalTransactionId === null && receipt.falseGlobalTransactionSynthesized === false, receipt && receipt.globalTransactionId, "Identity", "Critical");
    check("Receipt contains verified Audit summary", receipt && receipt.auditSummary && receipt.auditSummary.chainVerified === true && receipt.auditSummary.eventCount === 2, receipt && receipt.auditSummary && receipt.auditSummary.eventCount, "Audit", "Critical");
    check("Receipt safety summary prohibits Persistent Commit", receipt && receipt.safetyEvidenceSummary && receipt.safetyEvidenceSummary.persistentCommit === false, receipt && receipt.safetyEvidenceSummary && receipt.safetyEvidenceSummary.persistentCommit, "Safety", "Critical");
    check("Receipt records Repository Trusted / unlocked", receipt && receipt.safetyEvidenceSummary.repositoryTrustStatus === "Trusted" && receipt.safetyEvidenceSummary.mutationLockActive === false, receipt && receipt.safetyEvidenceSummary && receipt.safetyEvidenceSummary.repositoryTrustStatus, "Safety", "Critical");
    const exclusion = receiptExclusionProof(receipt);
    check("Receipt excludes Runtime/Source payload objects", exclusion.clean === true, exclusion.found.join(","), "Selective Persistence", "Critical");
    check("Receipt explicitly excludes Automation Session persistence", receipt && receipt.selectivePersistence && receipt.selectivePersistence.excluded.includes("automation-session") && receipt.selectivePersistence.sessionRecreatedOnRestore === false, JSON.stringify(receipt && receipt.selectivePersistence), "Selective Persistence", "Critical");
    const receiptVerify = receipt ? await namespace.verifyAutomationReceipt(receipt) : null;
    check("Receipt Contract + SHA-256 integrity verifies", receiptVerify && receiptVerify.valid === true, receiptVerify && receiptVerify.state, "Integrity", "Critical");
    const persistedReceipt = receipt ? await namespace.persistFinalAutomationReceipt({ receipt: receipt }) : null;
    check("Receipt persists with read-back verification", persistedReceipt && persistedReceipt.ok === true, persistedReceipt && persistedReceipt.code, "Persistence", "Critical");
    const readBack = receipt ? await namespace.getPersistedAutomationReceipt(receipt.automationReceiptId) : null;
    check("Persisted Receipt reads back by automationReceiptId", readBack && readBack.automationReceiptId === receipt.automationReceiptId, readBack && readBack.automationReceiptId, "Persistence", "Critical");

    const sessionCountBeforeClear = namespace.getAutomationSessionStatus().sessionCount;
    namespace.clearAutomationRuntimeSessions();
    check("Runtime Automation Session clears independently", sessionCountBeforeClear > 0 && namespace.getAutomationSessionStatus().sessionCount === 0, namespace.getAutomationSessionStatus().sessionCount, "Reload", "Critical");
    const persistedAfterClear = receipt ? await namespace.getPersistedAutomationReceipt(receipt.automationReceiptId) : null;
    check("Clearing Runtime Session does not delete Receipt", Boolean(persistedAfterClear), persistedAfterClear && persistedAfterClear.automationReceiptId, "Reload", "Critical");
    const restoreSameRuntime = receipt ? await namespace.restoreAutomationReceipt(receipt.automationReceiptId) : null;
    check("Receipt restores after Runtime Session reset", restoreSameRuntime && restoreSameRuntime.ok === true && restoreSameRuntime.data && restoreSameRuntime.data.state === "restored", restoreSameRuntime && restoreSameRuntime.code, "Reload", "Critical");
    check("Receipt restore never recreates Automation Session", namespace.getAutomationSessionStatus().sessionCount === 0 && restoreSameRuntime && restoreSameRuntime.data && restoreSameRuntime.data.sessionRecreated === false, namespace.getAutomationSessionStatus().sessionCount, "Selective Persistence", "Critical");

    if (receipt) {
      const tampered = internal.clone(receipt);
      tampered.outcome = "Failed";
      const tamperedVerification = await namespace.verifyAutomationReceipt(tampered);
      check("Tampered Receipt is classified corrupted", tamperedVerification && tamperedVerification.valid === false && tamperedVerification.state === "corrupted", tamperedVerification && tamperedVerification.reason, "Integrity", "Critical");
    }

    const persistenceStatus = namespace.getAutomationPersistenceStatus();
    check("Persistence stores no Session object", persistenceStatus.sessionPersisted === false, persistenceStatus.sessionPersisted, "Selective Persistence", "Critical");
    check("Persistence stores no Source Payload", persistenceStatus.sourcePayloadPersisted === false, persistenceStatus.sourcePayloadPersisted, "Selective Persistence", "Critical");
    check("Persistence stores no Provider Handles", persistenceStatus.providerHandlesPersisted === false, persistenceStatus.providerHandlesPersisted, "Selective Persistence", "Critical");
    check("Persistence stores no Runtime Queue/Stack", persistenceStatus.runtimeQueueOrStackPersisted === false, persistenceStatus.runtimeQueueOrStackPersisted, "Selective Persistence", "Critical");
    check("Persistence stores no Hidden Learning State", persistenceStatus.hiddenLearningStatePersisted === false, persistenceStatus.hiddenLearningStatePersisted, "Selective Persistence", "Critical");

    const functionalPassed = collector.checks.every(function pass(item) { return item.passed; });
    let reloadGate = null;
    if (functionalPassed) reloadGate = await createReloadGateReceipt();
    check("Phase 8 Reload Gate Receipt is prepared for Full Reload", reloadGate && reloadGate.ok === true, reloadGate && reloadGate.receipt && reloadGate.receipt.automationReceiptId || reloadGate && reloadGate.reason, "Full Reload", "Critical");

    const allFunctional = collector.checks.every(function pass(item) { return item.passed; });
    const result = finish(collector.checks, "A", "Phase 8 Deterministic / Persistence Functional Validation", {
      functionalValidationPassed: allFunctional,
      fullReloadValidationRequired: true,
      reloadValidationPending: allFunctional,
      phase8Complete: false,
      phase9Allowed: false,
      androidRealDeviceRequired: true,
      androidRealDevicePassed: false,
      releaseAllowed: false,
      ide190Complete: false,
      reloadReceiptId: reloadGate && reloadGate.receipt && reloadGate.receipt.automationReceiptId || null,
      repositoryTrustStatus: state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted",
      mutationLockActive: Boolean(state.mutationTrialLock && state.mutationTrialLock.active)
    });
    internal.markPhase8Validation(result);
    return result;
  }

  async function findReloadGateReceipt() {
    const receipts = await namespace.listPersistedAutomationReceipts();
    return receipts.filter(function match(item) { return item && item.phase8ReloadGate === true && item.functionalValidationPassed === true; }).sort(function newest(a,b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })[0] || null;
  }

  function actualLoadedScriptCount() {
    if (!global.document || typeof global.document.querySelectorAll !== "function") return 0;
    return Array.from(global.document.querySelectorAll('script[src]')).filter(function local(script) {
      const src = String(script.getAttribute("src") || "");
      return src.indexOf("./") === 0 || (!/^https?:/i.test(src) && src.indexOf("//") !== 0);
    }).length;
  }

  async function runDevelopmentAutomationPhase8AndroidValidation() {
    const collector = checkCollector();
    const check = collector.check;

    const reloadInit = typeof namespace.initialize === "function" ? namespace.initialize() : null;
    check("IDE-190 foundation re-initializes after Full Reload", reloadInit && reloadInit.ok === true, reloadInit && reloadInit.code, "Full Reload Initialization", "Critical");
    check("Release Version is 1.7.0", VERSION_MANIFEST.release.version === "1.7.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 8", VERSION_MANIFEST.release.phase === 8, VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Android real-device environment is detected", /Android/i.test(String(global.navigator && global.navigator.userAgent || "")), global.navigator && global.navigator.userAgent, "Android Runtime", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle), Boolean(global.crypto && global.crypto.subtle), "Android Runtime", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android Runtime", "Critical");
    check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android Runtime", "Critical");

    PHASE8_FILES.forEach(function loaded(file) {
      const scripts = global.document ? Array.from(global.document.querySelectorAll('script[src]')) : [];
      const found = scripts.some(function match(script) { return String(script.getAttribute("src") || "").indexOf("./" + file) === 0; });
      check("Actual script loaded: " + file, found, actualLoadedScriptCount(), "Actual Script Loading", "Critical");
    });

    check("Static Manifest loader API is available", typeof global.loadStaticScriptManifest === "function", typeof global.loadStaticScriptManifest, "Static Integrity", "Critical");
    let staticLoad = null;
    if (typeof global.loadStaticScriptManifest === "function") staticLoad = await global.loadStaticScriptManifest();
    check("Static Manifest fetch/integrity succeeds", staticLoad && staticLoad.ok === true, staticLoad && staticLoad.errors && staticLoad.errors.join(","), "Static Integrity", "Critical");
    const manifest = staticLoad && staticLoad.manifest || null;
    PHASE8_FILES.forEach(function manifestFile(file) {
      const entry = manifest && manifest.hashes && manifest.hashes[file];
      check("Static Manifest contains SHA-256: " + file, Boolean(entry && /^[a-f0-9]{64}$/.test(String(entry.sha256 || ""))), entry && entry.sha256, "Static Integrity", "Critical");
    });

    let receipt = null;
    try { receipt = await findReloadGateReceipt(); } catch (_) { receipt = null; }
    check("Phase 8 Reload Gate Receipt exists in IndexedDB", Boolean(receipt), receipt && receipt.automationReceiptId, "Full Reload", "Critical");
    const receiptCreatedAt = receipt && receipt.createdAt || null;
    const moduleLoadedAts = ["session","audit","persistence","receipt","phase8Validation"].map(function module(key) { return namespace.modules[key] && namespace.modules[key].loadedAt || null; });
    const fullReloadProof = Boolean(receiptCreatedAt && moduleLoadedAts.every(function later(value) { return value && new Date(value).getTime() > new Date(receiptCreatedAt).getTime(); }));
    check("Phase 8 modules loaded after persisted Receipt was created", fullReloadProof, JSON.stringify({ receiptCreatedAt: receiptCreatedAt, moduleLoadedAts: moduleLoadedAts }), "Full Reload Proof", "Critical");

    const receiptVerification = receipt ? await namespace.verifyAutomationReceipt(receipt) : null;
    check("Reloaded Automation Receipt integrity is valid", receiptVerification && receiptVerification.valid === true, receiptVerification && receiptVerification.state, "Integrity", "Critical");
    const persistedAudits = receipt ? (await namespace.listPersistedAutomationAuditEvents()).filter(function session(item) { return item.automationSessionId === receipt.automationSessionId; }) : [];
    check("Persisted Audit Events survive Full Reload", receipt && persistedAudits.length === receipt.auditSummary.eventCount && persistedAudits.length > 0, persistedAudits.length, "Audit", "Critical");
    const auditChain = receipt ? await namespace.verifyAutomationAuditChain(receipt.automationSessionId, persistedAudits) : null;
    check("Persisted Audit hash chain verifies after Full Reload", auditChain && auditChain.valid === true && auditChain.lastEventHash === receipt.auditSummary.lastEventHash, auditChain && auditChain.lastEventHash, "Audit", "Critical");

    const sessionCountBeforeRestore = namespace.getAutomationSessionStatus().sessionCount;
    check("No Runtime Automation Session exists after Full Reload", sessionCountBeforeRestore === 0, sessionCountBeforeRestore, "Selective Persistence", "Critical");
    const restored = receipt ? await namespace.restoreAutomationReceipt(receipt.automationReceiptId) : null;
    check("Automation Receipt restores after Full Reload", restored && restored.ok === true && restored.data && restored.data.state === "restored", restored && restored.code, "Full Reload", "Critical");
    check("Restored Receipt is not stale", restored && restored.data && restored.data.stale === false, restored && restored.data && restored.data.reasons, "Full Reload", "Critical");
    check("Restored Receipt is not incompatible", restored && restored.data && restored.data.incompatible === false, restored && restored.data && restored.data.incompatible, "Full Reload", "Critical");
    check("Restored Receipt is not corrupted", restored && restored.data && restored.data.corrupted === false, restored && restored.data && restored.data.corrupted, "Full Reload", "Critical");
    check("Receipt restore does not recreate Runtime Session", namespace.getAutomationSessionStatus().sessionCount === 0 && restored && restored.data && restored.data.sessionRecreated === false, namespace.getAutomationSessionStatus().sessionCount, "Selective Persistence", "Critical");

    const exclusion = receiptExclusionProof(receipt);
    check("Persisted Receipt excludes Runtime/Source payload state", exclusion.clean === true, exclusion.found.join(","), "Selective Persistence", "Critical");
    check("Persisted Receipt keeps no global transaction identity", receipt && receipt.globalTransactionId === null && receipt.falseGlobalTransactionSynthesized === false, receipt && receipt.globalTransactionId, "Federated Identity", "Critical");
    check("Persisted Receipt keeps federated authority boundaries", receipt && receipt.authorityBoundary && receipt.authorityBoundary.navigation === "IDE-180" && receipt.authorityBoundary.workflow === "IDE-160" && receipt.authorityBoundary.controlledMutation === "IDE-150" && receipt.authorityBoundary.automationOrchestration === "IDE-190", JSON.stringify(receipt && receipt.authorityBoundary), "Federated Identity", "Critical");
    check("Repository remains Trusted after reload/restore", state.repositoryMutationTrust && state.repositoryMutationTrust.status === "Trusted", state.repositoryMutationTrust && state.repositoryMutationTrust.status, "Repository Trust", "Critical");
    check("Mutation Lock remains released after reload/restore", Boolean(state.mutationTrialLock && state.mutationTrialLock.active) === false, state.mutationTrialLock && state.mutationTrialLock.active, "Mutation Lock", "Critical");
    check("Persistent Commit remains prohibited after reload", VERSION_MANIFEST.initialPolicy.persistentCommitAllowed === false && receipt && receipt.safetyEvidenceSummary && receipt.safetyEvidenceSummary.persistentCommit === false, receipt && receipt.safetyEvidenceSummary && receipt.safetyEvidenceSummary.persistentCommit, "Safety", "Critical");
    check("Android cannot auto-repair Repository", receipt && receipt.safetyEvidenceSummary && receipt.safetyEvidenceSummary.automaticRepositoryRepair === false, receipt && receipt.safetyEvidenceSummary && receipt.safetyEvidenceSummary.automaticRepositoryRepair, "Safety", "Critical");

    const phaseGatePassed = collector.checks.every(function pass(item) { return item.passed; });
    const result = finish(collector.checks, "B", "Phase 8 Android Full Reload / Selective Persistence Validation", {
      preDevicePassed: Boolean(receipt && receipt.functionalValidationPassed === true),
      fullReloadValidated: phaseGatePassed,
      androidRealDeviceRequired: true,
      androidRealDevicePassed: phaseGatePassed,
      phaseGatePassed: phaseGatePassed,
      phase8Complete: phaseGatePassed,
      phase9Allowed: phaseGatePassed,
      releaseAllowed: false,
      ide190Complete: false,
      reloadReceiptId: receipt && receipt.automationReceiptId || null,
      restoreState: restored && restored.data && restored.data.state || null,
      repositoryTrustStatus: state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted",
      mutationLockActive: Boolean(state.mutationTrialLock && state.mutationTrialLock.active),
      userAgent: String(global.navigator && global.navigator.userAgent || "")
    });
    internal.markPhase8AndroidValidation(result);
    return result;
  }

  function initializePhase8Validation() {
    namespace.modules.phase8Validation.status = "Ready";
    return internal.buildResult(true, "IDE190_PHASE8_VALIDATION_INITIALIZED", "Ready", { fullReloadRequired: true, phase9AllowedBeforeAndroidGate: false });
  }

  Object.assign(namespace.api, {
    initializePhase8Validation: initializePhase8Validation,
    runDevelopmentAutomationPhase8Validation: runDevelopmentAutomationPhase8Validation,
    runDevelopmentAutomationPhase8AndroidValidation: runDevelopmentAutomationPhase8AndroidValidation
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase8Validation = {
    id: "IDE-190-PHASE8-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    fullReloadRequired: true,
    androidReleaseAuthority: true,
    loadedAt: internal.nowIso()
  };

  global.runDevelopmentAutomationPhase8Validation = runDevelopmentAutomationPhase8Validation;
  global.runDevelopmentAutomationPhase8AndroidValidation = runDevelopmentAutomationPhase8AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
