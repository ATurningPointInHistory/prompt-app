/* ============================================================
   FILE: 13_development_automation_persistence.js
   IDE-190 Development Automation
   Release: 1.7.0 / Module: Selective Persistence 1.0.0
   Phase 8: Audit / Session / Persistence / Receipt
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Persistence blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("persistence");
  const DB_NAME = "AI_PROMPT_OS_IDE190_AUTOMATION_V1";
  const DB_VERSION = 1;
  const AUDIT_STORE = "automation_audit_events";
  const RECEIPT_STORE = "automation_receipts";
  let dbPromise = null;
  let adapterOverride = null;

  function ensureState() {
    if (!Object.prototype.hasOwnProperty.call(state, "automationPersistenceStatus")) state.automationPersistenceStatus = "Not Initialized";
    if (!Object.prototype.hasOwnProperty.call(state, "lastAutomationPersistenceError")) state.lastAutomationPersistenceError = null;
  }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    if (!global.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable."));
    dbPromise = new Promise(function executor(resolve, reject) {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function upgrade(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(AUDIT_STORE)) {
          const audit = db.createObjectStore(AUDIT_STORE, { keyPath: "auditEventId" });
          audit.createIndex("automationSessionId", "automationSessionId", { unique: false });
          audit.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(RECEIPT_STORE)) {
          const receipt = db.createObjectStore(RECEIPT_STORE, { keyPath: "automationReceiptId" });
          receipt.createIndex("automationSessionId", "automationSessionId", { unique: false });
          receipt.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = function success() { resolve(request.result); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB open failed.")); };
    });
    return dbPromise;
  }

  async function addRecord(storeName, value) {
    const db = await openDatabase();
    return new Promise(function executor(resolve, reject) {
      const tx = db.transaction(storeName, "readwrite");
      const request = tx.objectStore(storeName).add(internal.clone(value));
      request.onsuccess = function success() { resolve(true); };
      request.onerror = function error() { reject(request.error || new Error("Append-only write failed.")); };
      tx.onerror = function error() { reject(tx.error || new Error("IndexedDB transaction failed.")); };
    });
  }

  async function getRecord(storeName, key) {
    const db = await openDatabase();
    return new Promise(function executor(resolve, reject) {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).get(String(key || ""));
      request.onsuccess = function success() { resolve(request.result ? internal.clone(request.result) : null); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB read failed.")); };
    });
  }

  async function listRecords(storeName) {
    const db = await openDatabase();
    return new Promise(function executor(resolve, reject) {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = function success() { resolve((request.result || []).map(internal.clone)); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB list failed.")); };
    });
  }

  const nativeAdapter = {
    adapterId: "IDE-190-INDEXEDDB-AUTOMATION-PERSISTENCE",
    readMode: "append-only-audit-immutable-receipt",
    async addAuditEvent(event) { return addRecord(AUDIT_STORE, event); },
    async getAuditEvent(id) { return getRecord(AUDIT_STORE, id); },
    async listAuditEvents() { return listRecords(AUDIT_STORE); },
    async addReceipt(receipt) { return addRecord(RECEIPT_STORE, receipt); },
    async getReceipt(id) { return getRecord(RECEIPT_STORE, id); },
    async listReceipts() { return listRecords(RECEIPT_STORE); }
  };

  function createMemoryAutomationPersistenceAdapter() {
    const auditEvents = new Map();
    const receipts = new Map();
    return {
      adapterId: "IDE-190-MEMORY-AUTOMATION-PERSISTENCE",
      readMode: "append-only-audit-immutable-receipt",
      async addAuditEvent(event) {
        if (auditEvents.has(String(event.auditEventId))) throw new Error("Duplicate audit event is prohibited.");
        auditEvents.set(String(event.auditEventId), internal.clone(event));
        return true;
      },
      async getAuditEvent(id) { return auditEvents.has(String(id)) ? internal.clone(auditEvents.get(String(id))) : null; },
      async listAuditEvents() { return Array.from(auditEvents.values()).map(internal.clone); },
      async addReceipt(receipt) {
        if (receipts.has(String(receipt.automationReceiptId))) throw new Error("Duplicate receipt is prohibited.");
        receipts.set(String(receipt.automationReceiptId), internal.clone(receipt));
        return true;
      },
      async getReceipt(id) { return receipts.has(String(id)) ? internal.clone(receipts.get(String(id))) : null; },
      async listReceipts() { return Array.from(receipts.values()).map(internal.clone); },
      exportRecords: function exportRecords() { return { auditEvents: Array.from(auditEvents.values()).map(internal.clone), receipts: Array.from(receipts.values()).map(internal.clone) }; },
      importRecords: function importRecords(records) {
        auditEvents.clear(); receipts.clear();
        (records && Array.isArray(records.auditEvents) ? records.auditEvents : []).forEach(function add(item) { auditEvents.set(String(item.auditEventId), internal.clone(item)); });
        (records && Array.isArray(records.receipts) ? records.receipts : []).forEach(function add(item) { receipts.set(String(item.automationReceiptId), internal.clone(item)); });
      }
    };
  }

  function currentAdapter() { return adapterOverride || nativeAdapter; }

  function setAutomationPersistenceAdapter(adapter) {
    ensureState();
    if (adapter == null) {
      adapterOverride = null;
      state.automationPersistenceStatus = "Ready";
      return internal.buildResult(true, "IDE190_PERSISTENCE_ADAPTER_RESET", "Ready", { adapterId: nativeAdapter.adapterId });
    }
    const valid = adapter && typeof adapter.addAuditEvent === "function" && typeof adapter.getAuditEvent === "function" && typeof adapter.listAuditEvents === "function" && typeof adapter.addReceipt === "function" && typeof adapter.getReceipt === "function" && typeof adapter.listReceipts === "function";
    if (!valid) return internal.buildResult(false, "IDE190_PERSISTENCE_ADAPTER_INVALID", "Blocked", null);
    adapterOverride = adapter;
    state.automationPersistenceStatus = "Ready";
    internal.touch();
    return internal.buildResult(true, "IDE190_PERSISTENCE_ADAPTER_SET", "Ready", { adapterId: adapter.adapterId || "custom" });
  }

  async function persistAutomationAuditEvent(event) {
    ensureState();
    const contract = namespace.validateContract("auditEvent", event);
    const verification = typeof namespace.verifyAutomationAuditEvent === "function" ? await namespace.verifyAutomationAuditEvent(event) : { valid: false };
    if (!contract.valid || verification.valid !== true) return internal.buildResult(false, "IDE190_AUDIT_PERSISTENCE_VERIFICATION_FAILED", "Blocked", { contract: contract, verification: verification });
    try {
      await currentAdapter().addAuditEvent(event);
      const readBack = await currentAdapter().getAuditEvent(event.auditEventId);
      const readBackVerification = readBack && typeof namespace.verifyAutomationAuditEvent === "function" ? await namespace.verifyAutomationAuditEvent(readBack) : { valid: false };
      if (!readBack || readBackVerification.valid !== true || readBack.eventHash !== event.eventHash) throw new Error("Audit read-back verification failed.");
      state.automationPersistenceStatus = "Verified";
      state.lastAutomationPersistenceError = null;
      internal.touch();
      return internal.buildResult(true, "IDE190_AUDIT_EVENT_PERSISTED", "Verified", { auditEventId: event.auditEventId, adapterId: currentAdapter().adapterId || "custom", readBackVerified: true });
    } catch (error) {
      state.automationPersistenceStatus = "Failed";
      state.lastAutomationPersistenceError = error && error.message ? error.message : String(error);
      internal.touch();
      return internal.buildResult(false, "IDE190_AUDIT_PERSISTENCE_FAILED", "Failed", null, { error: { message: state.lastAutomationPersistenceError, category: "Persistence" } });
    }
  }

  async function persistAutomationReceipt(receipt) {
    ensureState();
    const contract = namespace.validateContract("automationReceipt", receipt);
    const verification = typeof namespace.verifyAutomationReceipt === "function" ? await namespace.verifyAutomationReceipt(receipt) : { valid: false };
    if (!contract.valid || verification.valid !== true) return internal.buildResult(false, "IDE190_RECEIPT_PERSISTENCE_VERIFICATION_FAILED", "Blocked", { contract: contract, verification: verification });
    try {
      await currentAdapter().addReceipt(receipt);
      const readBack = await currentAdapter().getReceipt(receipt.automationReceiptId);
      const readBackVerification = readBack && typeof namespace.verifyAutomationReceipt === "function" ? await namespace.verifyAutomationReceipt(readBack) : { valid: false };
      if (!readBack || readBackVerification.valid !== true || readBack.integrity.hash !== receipt.integrity.hash) throw new Error("Receipt read-back verification failed.");
      state.automationPersistenceStatus = "Verified";
      state.lastAutomationPersistenceError = null;
      internal.touch();
      return internal.buildResult(true, "IDE190_AUTOMATION_RECEIPT_PERSISTED", "Verified", { automationReceiptId: receipt.automationReceiptId, adapterId: currentAdapter().adapterId || "custom", readBackVerified: true });
    } catch (error) {
      state.automationPersistenceStatus = "Failed";
      state.lastAutomationPersistenceError = error && error.message ? error.message : String(error);
      internal.touch();
      return internal.buildResult(false, "IDE190_RECEIPT_PERSISTENCE_FAILED", "Failed", null, { error: { message: state.lastAutomationPersistenceError, category: "Persistence" } });
    }
  }

  async function getPersistedAutomationAuditEvent(id) { return currentAdapter().getAuditEvent(id); }
  async function listPersistedAutomationAuditEvents() { return currentAdapter().listAuditEvents(); }
  async function getPersistedAutomationReceipt(id) { return currentAdapter().getReceipt(id); }
  async function listPersistedAutomationReceipts() { return currentAdapter().listReceipts(); }

  function getAutomationPersistenceStatus() {
    ensureState();
    return {
      status: state.automationPersistenceStatus,
      adapterId: currentAdapter().adapterId || "custom",
      readMode: currentAdapter().readMode || "append-only-audit-immutable-receipt",
      indexedDBAvailable: Boolean(global.indexedDB),
      sessionPersisted: false,
      auditEventsPersisted: true,
      finalReceiptPersisted: true,
      sourcePayloadPersisted: false,
      providerHandlesPersisted: false,
      runtimeQueueOrStackPersisted: false,
      hiddenLearningStatePersisted: false,
      lastError: state.lastAutomationPersistenceError
    };
  }

  function initializeAutomationPersistence() {
    ensureState();
    const ready = Boolean(adapterOverride || global.indexedDB);
    state.automationPersistenceStatus = ready ? "Ready" : "Unavailable";
    namespace.modules.persistence.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "IDE190_AUTOMATION_PERSISTENCE_INITIALIZED" : "IDE190_AUTOMATION_PERSISTENCE_UNAVAILABLE", ready ? "Ready" : "Blocked", getAutomationPersistenceStatus());
  }

  Object.assign(namespace.api, {
    initializeAutomationPersistence: initializeAutomationPersistence,
    createMemoryAutomationPersistenceAdapter: createMemoryAutomationPersistenceAdapter,
    setAutomationPersistenceAdapter: setAutomationPersistenceAdapter,
    persistAutomationAuditEvent: persistAutomationAuditEvent,
    persistAutomationReceipt: persistAutomationReceipt,
    getPersistedAutomationAuditEvent: getPersistedAutomationAuditEvent,
    listPersistedAutomationAuditEvents: listPersistedAutomationAuditEvents,
    getPersistedAutomationReceipt: getPersistedAutomationReceipt,
    listPersistedAutomationReceipts: listPersistedAutomationReceipts,
    getAutomationPersistenceStatus: getAutomationPersistenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.persistence = {
    id: "IDE-190-SELECTIVE-PERSISTENCE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    adapterId: nativeAdapter.adapterId,
    sessionPersisted: false,
    appendOnlyAudit: true,
    immutableReceipt: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
