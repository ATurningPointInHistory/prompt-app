/* ============================================================
   FILE: 13_knowledge_navigator_persistence.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Persistence 1.0.0
   Phase 7: Session / Persistence / Reload
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Persistence blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("persistence");
  const RECEIPT_VERSION = VERSION_MANIFEST.getContractVersion("navigationReceipt");
  const DB_NAME = "AI_PROMPT_OS_IDE180_NAVIGATION_V1";
  const DB_VERSION = 1;
  const STORE = "navigation_receipts";
  let adapterOverride = null;
  let dbPromise = null;

  if (!Object.prototype.hasOwnProperty.call(state, "lastNavigationReceipt")) state.lastNavigationReceipt = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastNavigationRestore")) state.lastNavigationRestore = null;
  if (!Object.prototype.hasOwnProperty.call(state, "navigationPersistenceStatus")) state.navigationPersistenceStatus = "Not Initialized";

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  async function sha256Text(value) {
    if (global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function") {
      const bytes = new global.TextEncoder().encode(String(value == null ? "" : value));
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    }
    let hash = 2166136261;
    const source = String(value == null ? "" : value);
    for (let i = 0; i < source.length; i += 1) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function integrityPayload(receipt) {
    const copy = internal.clone(receipt || {});
    delete copy.integrity;
    return copy;
  }

  async function computeIntegrity(receipt) {
    const hash = await sha256Text(stableStringify(integrityPayload(receipt)));
    return { algorithm: hash.length === 64 ? "SHA-256" : "FNV-1A-32", hash: hash };
  }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    if (!global.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable."));
    dbPromise = new Promise(function executor(resolve, reject) {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function upgrade(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "receiptId" });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("sessionId", "sessionId", { unique: false });
          store.createIndex("requestId", "requestId", { unique: false });
          store.createIndex("resultId", "resultId", { unique: false });
        }
      };
      request.onsuccess = function success() { resolve(request.result); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB open failed.")); };
    });
    return dbPromise;
  }

  const nativeAdapter = {
    adapterId: "IDE-180-INDEXEDDB-RECEIPT-ADAPTER",
    readMode: "receipt-read-write",
    async put(receipt) {
      const db = await openDatabase();
      return new Promise(function executor(resolve, reject) {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(internal.clone(receipt));
        tx.oncomplete = function complete() { resolve(true); };
        tx.onerror = function error() { reject(tx.error || new Error("Receipt write failed.")); };
      });
    },
    async get(receiptId) {
      const db = await openDatabase();
      return new Promise(function executor(resolve, reject) {
        const tx = db.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).get(String(receiptId || ""));
        request.onsuccess = function success() { resolve(request.result ? internal.clone(request.result) : null); };
        request.onerror = function error() { reject(request.error || new Error("Receipt read failed.")); };
      });
    },
    async list() {
      const db = await openDatabase();
      return new Promise(function executor(resolve, reject) {
        const tx = db.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).getAll();
        request.onsuccess = function success() { resolve((request.result || []).map(internal.clone)); };
        request.onerror = function error() { reject(request.error || new Error("Receipt list failed.")); };
      });
    }
  };

  function createMemoryNavigationPersistenceAdapter() {
    const records = new Map();
    return {
      adapterId: "IDE-180-MEMORY-RECEIPT-ADAPTER",
      readMode: "receipt-read-write",
      async put(receipt) { records.set(String(receipt.receiptId), internal.clone(receipt)); return true; },
      async get(receiptId) { return records.has(String(receiptId)) ? internal.clone(records.get(String(receiptId))) : null; },
      async list() { return Array.from(records.values()).map(internal.clone); },
      exportRecords: function exportRecords() { return Array.from(records.values()).map(internal.clone); },
      replace: function replace(receiptId, receipt) { records.set(String(receiptId), internal.clone(receipt)); }
    };
  }

  function setNavigationPersistenceAdapter(adapter) {
    if (adapter == null) { adapterOverride = null; return internal.buildResult(true, "IDE180_PERSISTENCE_ADAPTER_RESET", "Ready", { adapterId: nativeAdapter.adapterId }); }
    const valid = adapter && typeof adapter.put === "function" && typeof adapter.get === "function" && typeof adapter.list === "function";
    if (!valid) return internal.buildResult(false, "IDE180_PERSISTENCE_ADAPTER_INVALID", "Blocked", null);
    adapterOverride = adapter;
    return internal.buildResult(true, "IDE180_PERSISTENCE_ADAPTER_SET", "Ready", { adapterId: adapter.adapterId || "custom" });
  }

  function adapter() { return adapterOverride || nativeAdapter; }

  function sourceSnapshot() {
    return typeof namespace.captureKnowledgeNavigatorSourceSnapshot === "function" ? namespace.captureKnowledgeNavigatorSourceSnapshot() : { snapshotVersion: "1.0.0", capturedAt: internal.nowIso(), ide170Package: null, providers: [], ide180: { releaseVersion: VERSION_MANIFEST.release.version, contractVersions: internal.clone(VERSION_MANIFEST.contractVersions || {}) } };
  }

  function providerVersions(snapshot) {
    const out = {};
    (Array.isArray(snapshot && snapshot.providers) ? snapshot.providers : []).forEach(function item(provider) {
      if (provider && provider.providerId) out[provider.providerId] = provider.providerVersion || null;
    });
    return out;
  }

  function resolverVersions() {
    const out = {};
    (typeof namespace.listResolverDefinitions === "function" ? namespace.listResolverDefinitions() : []).forEach(function item(entry) {
      const def = typeof namespace.getResolverDefinition === "function" ? namespace.getResolverDefinition(entry.resolverId) : null;
      if (entry && entry.resolverId) out[entry.resolverId] = def && def.version || null;
    });
    return out;
  }

  function evidenceRefs(result) {
    const ids = [];
    (Array.isArray(result && result.evidence) ? result.evidence : []).forEach(function item(evidence) {
      const id = evidence && (evidence.evidenceId || evidence.id || evidence.recordId);
      if (id && !ids.includes(String(id))) ids.push(String(id));
    });
    return ids;
  }

  async function buildNavigationReceipt(sessionId, result, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = typeof namespace.getNavigationSession === "function" ? namespace.getNavigationSession(sessionId) : null;
    if (!session) return internal.buildResult(false, "IDE180_RECEIPT_SESSION_NOT_FOUND", "not-found", { sessionId: sessionId });
    if (!result || !result.resultId || !result.requestId) return internal.buildResult(false, "IDE180_RECEIPT_RESULT_INVALID", "Blocked", null);

    const snapshot = sourceSnapshot();
    const receipt = {
      receiptId: internal.nextId("IDE-180-NAV-RECEIPT"),
      version: RECEIPT_VERSION,
      sessionId: session.sessionId,
      requestId: result.requestId,
      resultId: result.resultId,
      status: result.status,
      sourceSnapshot: internal.clone(snapshot),
      navigationSummary: {
        navigationType: result.metadata && result.metadata.navigationType || null,
        target: result.target ? internal.clone(result.target) : null,
        sourceCount: Array.isArray(result.sources) ? result.sources.length : 0,
        relationshipCount: Array.isArray(result.relationships) ? result.relationships.length : 0,
        conflictCount: Array.isArray(result.conflicts) ? result.conflicts.length : 0,
        partialReason: result.partialReason || null,
        request: internal.clone(session.currentRequest || session.rootRequest || null),
        resultStatus: result.status,
        phase7ReloadGate: settings.phase7ReloadGate === true
      },
      path: internal.clone(result.navigationPath || []),
      authoritySummary: internal.clone(result.authority || { status: "not-applicable" }),
      evidenceRefs: evidenceRefs(result),
      missing: internal.clone(result.missingSources || []),
      budget: internal.clone(result.metadata && result.metadata.budget || {}),
      versions: {
        ide180Release: VERSION_MANIFEST.release.version,
        navigationReceiptContract: RECEIPT_VERSION,
        contracts: internal.clone(VERSION_MANIFEST.contractVersions || {}),
        providers: providerVersions(snapshot),
        resolvers: resolverVersions()
      },
      createdAt: internal.nowIso(),
      integrity: {}
    };
    receipt.integrity = await computeIntegrity(receipt);
    const contractValidation = namespace.validateContract("navigationReceipt", receipt);
    if (!contractValidation.valid) return internal.buildResult(false, "IDE180_RECEIPT_CONTRACT_INVALID", "Blocked", { validation: contractValidation });
    return internal.buildResult(true, "IDE180_RECEIPT_BUILT", "Ready", { receipt: internal.deepFreeze(receipt) });
  }

  async function verifyNavigationReceipt(receipt) {
    if (!receipt || typeof receipt !== "object") return { valid: false, state: "corrupted", reason: "receipt-missing", contractValid: false, integrityValid: false };
    const contractValidation = namespace.validateContract("navigationReceipt", receipt);
    const expected = await computeIntegrity(receipt);
    const integrityValid = Boolean(receipt.integrity && receipt.integrity.algorithm === expected.algorithm && receipt.integrity.hash === expected.hash);
    return {
      valid: contractValidation.valid === true && integrityValid,
      state: contractValidation.valid === true && integrityValid ? "valid" : "corrupted",
      reason: contractValidation.valid !== true ? "contract-invalid" : (integrityValid ? null : "integrity-mismatch"),
      contractValid: contractValidation.valid === true,
      integrityValid: integrityValid,
      expectedIntegrity: expected,
      contractValidation: contractValidation
    };
  }

  async function persistNavigationReceipt(receipt) {
    const verification = await verifyNavigationReceipt(receipt);
    if (!verification.valid) return internal.buildResult(false, "IDE180_RECEIPT_INVALID_BEFORE_PERSIST", "corrupted", { verification: verification });
    try {
      await adapter().put(receipt);
      const readBack = await adapter().get(receipt.receiptId);
      const readVerification = await verifyNavigationReceipt(readBack);
      if (!readVerification.valid) return internal.buildResult(false, "IDE180_RECEIPT_READBACK_FAILED", "corrupted", { verification: readVerification });
      state.lastNavigationReceipt = internal.clone(readBack);
      state.navigationPersistenceStatus = "Ready";
      internal.touch();
      return internal.buildResult(true, "IDE180_RECEIPT_PERSISTED", "Verified", { receipt: internal.clone(readBack), readBackVerified: true, adapterId: adapter().adapterId || "custom" });
    } catch (error) {
      state.navigationPersistenceStatus = "Blocked";
      return internal.buildResult(false, "IDE180_RECEIPT_PERSIST_FAILED", "Blocked", null, { error: { message: error && error.message || String(error), category: "Persistence Failure" } });
    }
  }

  async function buildAndPersistNavigationReceipt(sessionId, result, options) {
    const built = await buildNavigationReceipt(sessionId, result, options);
    if (!built.ok) return built;
    return persistNavigationReceipt(built.data.receipt);
  }

  async function listNavigationReceipts() {
    try {
      const list = await adapter().list();
      return (list || []).sort(function sort(a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); }).map(internal.clone);
    } catch (_) { return []; }
  }

  async function getNavigationReceipt(receiptId) {
    try { return await adapter().get(receiptId); } catch (_) { return null; }
  }

  async function getLatestNavigationReceipt() {
    const list = await listNavigationReceipts();
    return list.length ? internal.clone(list[0]) : null;
  }

  function compareSnapshot(saved, current) {
    if (!saved || !current) return { state: "missing-source", reasons: ["source-snapshot-unavailable"] };
    const savedContract = saved.ide180 && saved.ide180.contractVersions && saved.ide180.contractVersions.navigationReceipt;
    const currentContract = current.ide180 && current.ide180.contractVersions && current.ide180.contractVersions.navigationReceipt;
    if (savedContract && currentContract && savedContract !== currentContract) return { state: "incompatible", reasons: ["navigation-receipt-contract-version-changed"] };

    const reasons = [];
    const savedPackage = saved.ide170Package || null;
    const currentPackage = current.ide170Package || null;
    if (savedPackage && !currentPackage) return { state: "missing-source", reasons: ["ide170-package-missing"] };
    if (savedPackage && currentPackage) {
      if (savedPackage.packageId !== currentPackage.packageId) reasons.push("package-id-changed");
      if (savedPackage.packageHash !== currentPackage.packageHash) reasons.push("package-hash-changed");
    }

    const currentProviders = new Map((current.providers || []).map(function pair(item) { return [item.providerId, item]; }));
    (saved.providers || []).forEach(function compareProvider(item) {
      const now = currentProviders.get(item.providerId);
      if (!now) { reasons.push("provider-missing:" + item.providerId); return; }
      if (item.providerVersion !== now.providerVersion) reasons.push("provider-version-changed:" + item.providerId);
      if (item.availability !== now.availability) reasons.push("provider-availability-changed:" + item.providerId);
      if (item.recordCount != null && now.recordCount != null && item.recordCount !== now.recordCount) reasons.push("provider-record-count-changed:" + item.providerId);
      if (item.relationshipCount != null && now.relationshipCount != null && item.relationshipCount !== now.relationshipCount) reasons.push("provider-relationship-count-changed:" + item.providerId);
    });
    return reasons.length ? { state: "stale", reasons: reasons } : { state: "restored", reasons: [] };
  }

  async function restoreNavigationReceipt(receiptId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const receipt = await getNavigationReceipt(receiptId);
    if (!receipt) {
      const result = { state: "not-found", receiptId: receiptId || null, restored: false, reasons: ["receipt-not-found"], validatedAt: internal.nowIso() };
      state.lastNavigationRestore = internal.clone(result); return internal.buildResult(false, "IDE180_RECEIPT_NOT_FOUND", "not-found", result);
    }
    const verification = await verifyNavigationReceipt(receipt);
    if (!verification.valid) {
      const result = { state: "corrupted", receiptId: receipt.receiptId, restored: false, reasons: [verification.reason || "receipt-corrupted"], verification: verification, validatedAt: internal.nowIso() };
      state.lastNavigationRestore = internal.clone(result); return internal.buildResult(false, "IDE180_RECEIPT_CORRUPTED", "corrupted", result);
    }
    if (receipt.version !== RECEIPT_VERSION || receipt.versions && receipt.versions.navigationReceiptContract !== RECEIPT_VERSION) {
      const result = { state: "incompatible", receiptId: receipt.receiptId, restored: false, reasons: ["receipt-contract-incompatible"], validatedAt: internal.nowIso() };
      state.lastNavigationRestore = internal.clone(result); return internal.buildResult(false, "IDE180_RECEIPT_INCOMPATIBLE", "incompatible", result);
    }

    if (typeof namespace.openLatestIntelligencePackageSource === "function") {
      try { await namespace.openLatestIntelligencePackageSource({ allowIndexedDB: true }); } catch (_) {}
    }
    const current = settings.currentSnapshot || sourceSnapshot();
    const comparison = compareSnapshot(receipt.sourceSnapshot, current);
    const result = {
      state: comparison.state,
      receiptId: receipt.receiptId,
      sessionId: receipt.sessionId,
      requestId: receipt.requestId,
      resultId: receipt.resultId,
      restored: comparison.state === "restored",
      stale: comparison.state === "stale",
      incompatible: comparison.state === "incompatible",
      missingSource: comparison.state === "missing-source",
      corrupted: false,
      reasons: comparison.reasons,
      receipt: internal.clone(receipt),
      currentSourceSnapshot: internal.clone(current),
      validatedAt: internal.nowIso()
    };
    state.lastNavigationRestore = internal.clone(result);
    state.navigationPersistenceStatus = comparison.state === "restored" ? "Ready" : "Review";
    internal.touch();
    return internal.buildResult(comparison.state === "restored", "IDE180_RECEIPT_RESTORE_" + comparison.state.toUpperCase().replace(/-/g, "_"), comparison.state, result);
  }

  async function restoreLatestNavigationReceipt(options) {
    const latest = await getLatestNavigationReceipt();
    return latest ? restoreNavigationReceipt(latest.receiptId, options) : internal.buildResult(false, "IDE180_RECEIPT_NOT_FOUND", "not-found", { state: "not-found", restored: false });
  }

  function getPersistenceStatus() {
    return {
      id: "IDE-180-PERSISTENCE-STATUS",
      version: MODULE_VERSION,
      status: state.navigationPersistenceStatus,
      database: DB_NAME,
      databaseVersion: DB_VERSION,
      store: STORE,
      indexedDBAvailable: Boolean(global.indexedDB),
      adapterId: adapter().adapterId || "custom",
      selectivePersistence: true,
      persistedRuntimeQueues: false,
      persistedProviderHandles: false,
      persistedSourcePayloads: false,
      lastReceipt: internal.clone(state.lastNavigationReceipt),
      lastRestore: internal.clone(state.lastNavigationRestore),
      readOnlySourceBoundary: true
    };
  }

  function initializePersistence() {
    state.navigationPersistenceStatus = global.indexedDB || adapterOverride ? "Ready" : "Unavailable";
    namespace.modules.persistence.status = "Ready";
    return internal.buildResult(true, "IDE180_PERSISTENCE_INITIALIZED", "Ready", getPersistenceStatus());
  }

  Object.assign(namespace.api, {
    initializePersistence: initializePersistence,
    createMemoryNavigationPersistenceAdapter: createMemoryNavigationPersistenceAdapter,
    setNavigationPersistenceAdapter: setNavigationPersistenceAdapter,
    buildNavigationReceipt: buildNavigationReceipt,
    verifyNavigationReceipt: verifyNavigationReceipt,
    persistNavigationReceipt: persistNavigationReceipt,
    buildAndPersistNavigationReceipt: buildAndPersistNavigationReceipt,
    listNavigationReceipts: listNavigationReceipts,
    getNavigationReceipt: getNavigationReceipt,
    getLatestNavigationReceipt: getLatestNavigationReceipt,
    restoreNavigationReceipt: restoreNavigationReceipt,
    restoreLatestNavigationReceipt: restoreLatestNavigationReceipt,
    compareKnowledgeNavigatorSourceSnapshot: compareSnapshot,
    getKnowledgeNavigatorPersistenceStatus: getPersistenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.persistence = {
    id: "IDE-180-PERSISTENCE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 7,
    database: DB_NAME,
    selectivePersistence: true,
    sourceMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
