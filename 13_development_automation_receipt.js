/* ============================================================
   FILE: 13_development_automation_receipt.js
   IDE-190 Development Automation
   Release: 1.7.0 / Module: Automation Receipt 1.0.0
   Phase 8: Audit / Session / Persistence / Receipt
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Automation Receipt blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("receipt");

  function ensureState() {
    if (!(state.automationReceipts instanceof Map)) state.automationReceipts = new Map();
    if (!Object.prototype.hasOwnProperty.call(state, "latestAutomationReceiptId")) state.latestAutomationReceiptId = null;
    if (!Object.prototype.hasOwnProperty.call(state, "lastAutomationReceiptRestore")) state.lastAutomationReceiptRestore = null;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  async function sha256Text(value) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return null;
    const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(String(value == null ? "" : value)));
    return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }
  function integrityPayload(receipt) { const copy = internal.clone(receipt || {}); delete copy.integrity; return copy; }
  async function computeReceiptIntegrity(receipt) {
    const hash = await sha256Text(stableStringify(integrityPayload(receipt)));
    return { algorithm: "SHA-256", hash: hash || "" };
  }

  async function fetchStaticIdentity() {
    const response = await global.fetch("./00_script_manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Static Manifest fetch failed: " + response.status);
    const manifest = await response.json();
    return {
      manifestHash: internal.text(manifest.manifestHash, ""),
      scriptSetHash: internal.text(manifest.scriptSetHash, ""),
      scriptCount: Array.isArray(manifest.scripts) ? manifest.scripts.length : Number(manifest.scriptCount || 0),
      manifestSchemaVersion: internal.text(manifest.manifestSchemaVersion, ""),
      hashAlgorithm: internal.text(manifest.hashAlgorithm, "")
    };
  }

  function contractVersionSnapshot() {
    const out = {};
    Object.keys(VERSION_MANIFEST.contractVersions || {}).sort().forEach(function add(key) { out[key] = VERSION_MANIFEST.contractVersions[key]; });
    return out;
  }

  function safetyEvidenceSummary() {
    const latestRollback = typeof namespace.getAutomationRollbackRestorationRecord === "function" ? namespace.getAutomationRollbackRestorationRecord() : null;
    return {
      globalSafetyDefaults: internal.clone(VERSION_MANIFEST.safety),
      persistentCommit: false,
      automaticWorkflowExecution: false,
      automaticRepositoryRepair: false,
      repositoryTrustStatus: state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted",
      mutationLockActive: Boolean(state.mutationTrialLock && state.mutationTrialLock.active),
      latestRollbackVerification: latestRollback ? {
        rollbackRestorationRecordId: latestRollback.rollbackRestorationRecordId,
        rollbackVerified: latestRollback.rollbackVerified === true,
        sourceRestored: latestRollback.sourceRestored === true,
        repositoryTrustStatus: latestRollback.repositoryTrustStatus
      } : null
    };
  }

  function selectivePersistenceBoundary() {
    return {
      persisted: ["audit-events", "final-automation-receipt", "minimum-identities", "federated-record-references", "safety-evidence-summary", "static-integrity-identity"],
      excluded: ["automation-session", "runtime-queue", "runtime-stack", "provider-handle", "source-payload", "source-cache", "temporary-source-payload", "hidden-learning-state", "transient-adapter-object", "approval-challenge", "execution-challenge", "unnecessary-source-copy"],
      sessionRecreatedOnRestore: false
    };
  }

  async function buildAutomationReceipt(input) {
    ensureState();
    const settings = internal.isPlainObject(input) ? input : {};
    const session = typeof namespace.getAutomationSession === "function" ? namespace.getAutomationSession(settings.automationSessionId) : null;
    if (!session) return internal.buildResult(false, "IDE190_RECEIPT_SESSION_NOT_FOUND", "not-found", null);
    if (session.status !== "Closed") return internal.buildResult(false, "IDE190_RECEIPT_SESSION_NOT_CLOSED", "Blocked", { sessionStatus: session.status });
    const auditEvents = typeof namespace.listAutomationAuditEvents === "function" ? namespace.listAutomationAuditEvents({ automationSessionId: session.automationSessionId }) : [];
    const auditChain = typeof namespace.verifyAutomationAuditChain === "function" ? await namespace.verifyAutomationAuditChain(session.automationSessionId, auditEvents) : { valid: false };
    if (auditChain.valid !== true) return internal.buildResult(false, "IDE190_RECEIPT_AUDIT_CHAIN_INVALID", "Blocked", { auditChain: auditChain });
    let staticIdentity;
    try { staticIdentity = await fetchStaticIdentity(); }
    catch (error) { return internal.buildResult(false, "IDE190_RECEIPT_STATIC_IDENTITY_UNAVAILABLE", "Blocked", null, { error: { message: error && error.message || String(error), category: "Persistence" } }); }

    const receipt = {
      automationReceiptId: internal.nextId("IDE-190-AUTOMATION-RECEIPT"),
      receiptVersion: VERSION_MANIFEST.getContractVersion("automationReceipt"),
      componentId: "IDE-190",
      componentVersion: VERSION_MANIFEST.release.version,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      versionArchitecture: VERSION_MANIFEST.versionArchitecture,
      automationRequestId: session.automationRequestId,
      automationSessionId: session.automationSessionId,
      automationAttemptId: session.automationAttemptId,
      automationOperationId: session.automationOperationId,
      dispatchId: session.dispatchId || null,
      globalTransactionId: null,
      falseGlobalTransactionSynthesized: false,
      outcome: session.outcome,
      validationLayer: "V8",
      status: "Finalized",
      federatedReferences: internal.clone(session.federatedReferences || []),
      auditSummary: {
        eventCount: auditEvents.length,
        auditEventIds: auditEvents.map(function id(item) { return item.auditEventId; }),
        firstEventHash: auditChain.firstEventHash,
        lastEventHash: auditChain.lastEventHash,
        chainVerified: true
      },
      safetyEvidenceSummary: safetyEvidenceSummary(),
      staticIdentity: staticIdentity,
      contractVersions: contractVersionSnapshot(),
      selectivePersistence: selectivePersistenceBoundary(),
      authorityBoundary: {
        navigation: "IDE-180",
        workflow: "IDE-160",
        controlledMutation: "IDE-150",
        automationOrchestration: "IDE-190"
      },
      phase8ReloadGate: settings.phase8ReloadGate === true,
      functionalValidationPassed: settings.functionalValidationPassed === true,
      immutable: true,
      createdAt: internal.nowIso(),
      integrity: { algorithm: "SHA-256", hash: "" }
    };
    receipt.integrity = await computeReceiptIntegrity(receipt);
    const contract = namespace.validateContract("automationReceipt", receipt);
    if (!contract.valid) return internal.buildResult(false, "IDE190_AUTOMATION_RECEIPT_CONTRACT_INVALID", "Blocked", { receipt: receipt, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(receipt));
    state.automationReceipts.set(frozen.automationReceiptId, frozen);
    state.latestAutomationReceiptId = frozen.automationReceiptId;
    if (typeof internal.attachReceiptIdentity === "function") internal.attachReceiptIdentity(session.automationSessionId, frozen.automationReceiptId);
    internal.touch();
    return internal.buildResult(true, "IDE190_AUTOMATION_RECEIPT_BUILT", "Ready", { receipt: internal.clone(frozen), validation: contract });
  }

  async function verifyAutomationReceipt(receipt) {
    if (!receipt || typeof receipt !== "object") return { valid: false, state: "corrupted", reason: "receipt-missing", contractValid: false, integrityValid: false };
    const contract = namespace.validateContract("automationReceipt", receipt);
    const expected = await computeReceiptIntegrity(receipt);
    const integrityValid = Boolean(receipt.integrity && receipt.integrity.algorithm === "SHA-256" && receipt.integrity.hash === expected.hash && /^[a-f0-9]{64}$/.test(String(receipt.integrity.hash || "")));
    return { valid: contract.valid === true && integrityValid, state: contract.valid === true && integrityValid ? "verified" : "corrupted", reason: contract.valid !== true ? "contract-invalid" : integrityValid ? null : "integrity-mismatch", contractValid: contract.valid === true, integrityValid: integrityValid, expectedIntegrity: expected, checkedAt: internal.nowIso() };
  }

  async function persistFinalAutomationReceipt(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    let receipt = settings.receipt || null;
    if (!receipt) {
      const built = await buildAutomationReceipt(settings);
      if (!built || built.ok !== true) return built;
      receipt = built.data.receipt;
    }
    if (typeof namespace.persistAutomationReceipt !== "function") return internal.buildResult(false, "IDE190_RECEIPT_PERSISTENCE_API_REQUIRED", "Blocked", null);
    const persisted = await namespace.persistAutomationReceipt(receipt);
    if (!persisted || persisted.ok !== true) return persisted;
    return internal.buildResult(true, "IDE190_FINAL_AUTOMATION_RECEIPT_PERSISTED", "Verified", { receipt: internal.clone(receipt), persistence: persisted.data });
  }

  async function compareReceiptToCurrent(receipt) {
    let currentStatic;
    try { currentStatic = await fetchStaticIdentity(); }
    catch (error) { return { state: "missing-source", reasons: ["static-manifest-unavailable"], currentStatic: null }; }
    const reasons = [];
    let incompatible = false;
    if (receipt.designFreezeId !== VERSION_MANIFEST.release.designFreezeId) { reasons.push("design-freeze-mismatch"); incompatible = true; }
    if (receipt.versionArchitecture !== VERSION_MANIFEST.versionArchitecture) { reasons.push("version-architecture-mismatch"); incompatible = true; }
    const currentContracts = contractVersionSnapshot();
    Object.keys(receipt.contractVersions || {}).forEach(function compare(key) {
      if (currentContracts[key] && currentContracts[key] !== receipt.contractVersions[key]) { reasons.push("contract-version-mismatch:" + key); incompatible = true; }
    });
    if (incompatible) return { state: "incompatible", reasons: reasons, currentStatic: currentStatic };
    if (receipt.componentVersion !== VERSION_MANIFEST.release.version) reasons.push("component-version-mismatch");
    if (!receipt.staticIdentity || receipt.staticIdentity.manifestHash !== currentStatic.manifestHash) reasons.push("manifest-hash-mismatch");
    if (!receipt.staticIdentity || receipt.staticIdentity.scriptSetHash !== currentStatic.scriptSetHash) reasons.push("script-set-hash-mismatch");
    if (!receipt.staticIdentity || Number(receipt.staticIdentity.scriptCount) !== Number(currentStatic.scriptCount)) reasons.push("script-count-mismatch");
    return { state: reasons.length ? "stale" : "restored", reasons: reasons, currentStatic: currentStatic };
  }

  async function restoreAutomationReceipt(automationReceiptId) {
    ensureState();
    if (typeof namespace.getPersistedAutomationReceipt !== "function") return internal.buildResult(false, "IDE190_RECEIPT_PERSISTENCE_API_REQUIRED", "Blocked", null);
    const id = internal.text(automationReceiptId, state.latestAutomationReceiptId || "");
    const receipt = await namespace.getPersistedAutomationReceipt(id);
    if (!receipt) {
      const notFound = { state: "not-found", automationReceiptId: id, restored: false, stale: false, incompatible: false, missingSource: false, corrupted: false, sessionRecreated: false };
      state.lastAutomationReceiptRestore = internal.clone(notFound);
      return internal.buildResult(false, "IDE190_AUTOMATION_RECEIPT_NOT_FOUND", "not-found", notFound);
    }
    const verification = await verifyAutomationReceipt(receipt);
    if (!verification.valid) {
      const corrupted = { state: "corrupted", automationReceiptId: id, restored: false, stale: false, incompatible: false, missingSource: false, corrupted: true, sessionRecreated: false, verification: verification };
      state.lastAutomationReceiptRestore = internal.clone(corrupted);
      return internal.buildResult(false, "IDE190_AUTOMATION_RECEIPT_CORRUPTED", "corrupted", corrupted);
    }
    const comparison = await compareReceiptToCurrent(receipt);
    const result = {
      state: comparison.state,
      automationReceiptId: id,
      restored: comparison.state === "restored",
      stale: comparison.state === "stale",
      incompatible: comparison.state === "incompatible",
      missingSource: comparison.state === "missing-source",
      corrupted: false,
      reasons: comparison.reasons || [],
      receipt: internal.clone(receipt),
      sessionRecreated: false,
      runtimeSessionCount: typeof namespace.getAutomationSessionStatus === "function" ? namespace.getAutomationSessionStatus().sessionCount : 0,
      checkedAt: internal.nowIso()
    };
    state.lastAutomationReceiptRestore = internal.clone(result);
    internal.touch();
    const ok = comparison.state === "restored";
    const code = ok ? "IDE190_AUTOMATION_RECEIPT_RESTORED" : comparison.state === "stale" ? "IDE190_AUTOMATION_RECEIPT_STALE" : comparison.state === "incompatible" ? "IDE190_AUTOMATION_RECEIPT_INCOMPATIBLE" : "IDE190_AUTOMATION_RECEIPT_MISSING_SOURCE";
    return internal.buildResult(ok, code, comparison.state, result);
  }

  function getAutomationReceipt(id) {
    ensureState();
    const key = internal.text(id, state.latestAutomationReceiptId || "");
    return internal.clone(state.automationReceipts.get(key) || null);
  }

  function getAutomationReceiptStatus() {
    ensureState();
    return {
      latestAutomationReceiptId: state.latestAutomationReceiptId,
      runtimeReceiptCount: state.automationReceipts.size,
      lastRestore: internal.clone(state.lastAutomationReceiptRestore),
      sessionRecreatedOnRestore: false,
      selectivePersistence: selectivePersistenceBoundary()
    };
  }

  function initializeAutomationReceipt() {
    ensureState();
    namespace.modules.receipt.status = "Ready";
    return internal.buildResult(true, "IDE190_AUTOMATION_RECEIPT_INITIALIZED", "Ready", getAutomationReceiptStatus());
  }

  internal.computeAutomationReceiptIntegrity = computeReceiptIntegrity;
  internal.fetchAutomationStaticIdentity = fetchStaticIdentity;

  Object.assign(namespace.api, {
    initializeAutomationReceipt: initializeAutomationReceipt,
    buildAutomationReceipt: buildAutomationReceipt,
    verifyAutomationReceipt: verifyAutomationReceipt,
    persistFinalAutomationReceipt: persistFinalAutomationReceipt,
    restoreAutomationReceipt: restoreAutomationReceipt,
    getAutomationReceipt: getAutomationReceipt,
    getAutomationReceiptStatus: getAutomationReceiptStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.receipt = {
    id: "IDE-190-AUTOMATION-RECEIPT",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    validationLayer: "V8",
    selectivePersistence: true,
    sessionRecreatedOnRestore: false,
    falseGlobalTransaction: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
