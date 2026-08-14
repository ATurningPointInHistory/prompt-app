
/* ============================================================
   FILE: 13_local_first_repository_persistence.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.3.0 / Module: Persistence 1.2.0
   Phase 2: Android Replica Persistence / IndexedDB Adapter
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Persistence blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("persistence");
  const DB_NAME = "AI_PROMPT_OS_REPOSITORY010_LOCAL_FIRST_V1";
  const DB_VERSION = 3;
  const STORE_DEFINITIONS = Object.freeze({
    nodeIdentity: Object.freeze({ storeName: "node_identities", keyPath: "nodeId", contractKey: "repositoryNodeIdentity" }),
    revision: Object.freeze({ storeName: "revisions", keyPath: "revisionId", contractKey: "repositoryRevision" }),
    integrityRecord: Object.freeze({ storeName: "integrity_records", keyPath: "integrityRecordId", contractKey: "repositoryIntegrityRecord" }),
    stateRecord: Object.freeze({ storeName: "state_records", keyPath: "stateRecordId", contractKey: "repositoryStateRecord" }),
    validationGate: Object.freeze({ storeName: "validation_gates", keyPath: "gateId", contractKey: "validationGateDescriptor" }),
    offlineStaging: Object.freeze({ storeName: "offline_staging", keyPath: "stagingId", contractKey: "offlineStagingDescriptor" }),
    syncCandidate: Object.freeze({ storeName: "sync_candidates", keyPath: "syncCandidateId", contractKey: "syncCandidateDescriptor" })
  });

  let adapterOverride = null;
  let dbPromise = null;

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  function definition(recordType) { return STORE_DEFINITIONS[String(recordType || "")] || null; }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    if (!global.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable."));
    dbPromise = new Promise(function executor(resolve, reject) {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function upgrade(event) {
        const db = event.target.result;
        Object.keys(STORE_DEFINITIONS).forEach(function ensureStore(recordType) {
          const def = STORE_DEFINITIONS[recordType];
          if (!db.objectStoreNames.contains(def.storeName)) db.createObjectStore(def.storeName, { keyPath: def.keyPath });
        });
      };
      request.onsuccess = function success() { resolve(request.result); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB open failed.")); };
    });
    return dbPromise;
  }

  async function nativePut(recordType, record) {
    const def = definition(recordType);
    if (!def) throw new Error("Unknown repository record type: " + recordType);
    const db = await openDatabase();
    return new Promise(function executor(resolve, reject) {
      const tx = db.transaction(def.storeName, "readwrite");
      tx.objectStore(def.storeName).put(internal.clone(record));
      tx.oncomplete = function complete() { resolve(true); };
      tx.onerror = function error() { reject(tx.error || new Error("IndexedDB write failed.")); };
    });
  }

  async function nativeGet(recordType, id) {
    const def = definition(recordType);
    if (!def) throw new Error("Unknown repository record type: " + recordType);
    const db = await openDatabase();
    return new Promise(function executor(resolve, reject) {
      const tx = db.transaction(def.storeName, "readonly");
      const request = tx.objectStore(def.storeName).get(String(id || ""));
      request.onsuccess = function success() { resolve(request.result ? internal.clone(request.result) : null); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB read failed.")); };
    });
  }

  async function nativeList(recordType) {
    const def = definition(recordType);
    if (!def) throw new Error("Unknown repository record type: " + recordType);
    const db = await openDatabase();
    return new Promise(function executor(resolve, reject) {
      const tx = db.transaction(def.storeName, "readonly");
      const request = tx.objectStore(def.storeName).getAll();
      request.onsuccess = function success() { resolve((request.result || []).map(internal.clone)); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB list failed.")); };
    });
  }

  async function nativeDelete(recordType, id) {
    const def = definition(recordType);
    if (!def) throw new Error("Unknown repository record type: " + recordType);
    const recordId = String(id || "");
    if (!recordId) throw new Error("Repository record id is required for delete.");
    const db = await openDatabase();
    return new Promise(function executor(resolve, reject) {
      const tx = db.transaction(def.storeName, "readwrite");
      tx.objectStore(def.storeName).delete(recordId);
      tx.oncomplete = function complete() { resolve(true); };
      tx.onerror = function error() { reject(tx.error || new Error("IndexedDB delete failed.")); };
    });
  }

  const nativeAdapter = {
    adapterId: "REPOSITORY-010-ANDROID-INDEXEDDB-REPLICA-PERSISTENCE",
    role: "validated-working-replica-offline-staging",
    readMode: "validated-record-read-write-no-canonical-authority",
    async put(recordType, record) { return nativePut(recordType, record); },
    async get(recordType, id) { return nativeGet(recordType, id); },
    async list(recordType) { return nativeList(recordType); },
    async delete(recordType, id) { return nativeDelete(recordType, id); }
  };

  function createMemoryLocalFirstRepositoryPersistenceAdapter() {
    const stores = {};
    Object.keys(STORE_DEFINITIONS).forEach(function createStore(recordType) { stores[recordType] = new Map(); });
    return {
      adapterId: "REPOSITORY-010-MEMORY-REPLICA-PERSISTENCE",
      role: "deterministic-validation-replica",
      readMode: "validated-record-read-write-no-canonical-authority",
      async put(recordType, record) {
        const def = definition(recordType);
        if (!def) throw new Error("Unknown repository record type: " + recordType);
        stores[recordType].set(String(record[def.keyPath]), internal.clone(record));
        return true;
      },
      async get(recordType, id) {
        const def = definition(recordType);
        if (!def) throw new Error("Unknown repository record type: " + recordType);
        return stores[recordType].has(String(id)) ? internal.clone(stores[recordType].get(String(id))) : null;
      },
      async list(recordType) {
        const def = definition(recordType);
        if (!def) throw new Error("Unknown repository record type: " + recordType);
        return Array.from(stores[recordType].values()).map(internal.clone);
      },
      async delete(recordType, id) {
        const def = definition(recordType);
        if (!def) throw new Error("Unknown repository record type: " + recordType);
        const recordId = String(id || "");
        if (!recordId) throw new Error("Repository record id is required for delete.");
        stores[recordType].delete(recordId);
        return true;
      },
      exportRecords: function exportRecords() {
        const output = {};
        Object.keys(stores).forEach(function exportStore(recordType) { output[recordType] = Array.from(stores[recordType].values()).map(internal.clone); });
        return output;
      }
    };
  }

  function currentAdapter() { return adapterOverride || nativeAdapter; }

  function setLocalFirstRepositoryPersistenceAdapter(adapter) {
    if (adapter == null) {
      adapterOverride = null;
      state.persistenceStatus = "Not Initialized";
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_PERSISTENCE_ADAPTER_RESET", "Ready", { adapterId: nativeAdapter.adapterId });
    }
    const valid = adapter && typeof adapter.put === "function" && typeof adapter.get === "function" && typeof adapter.list === "function" && typeof adapter.delete === "function";
    if (!valid) return internal.buildResult(false, "REPOSITORY010_PERSISTENCE_ADAPTER_INVALID", "Blocked", null);
    adapterOverride = adapter;
    state.persistenceStatus = "Ready";
    state.lastPersistenceError = null;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_PERSISTENCE_ADAPTER_SET", "Ready", { adapterId: adapter.adapterId || "custom" });
  }

  async function initializeLocalFirstRepositoryPersistence() {
    try {
      if (!adapterOverride) await openDatabase();
      state.persistenceStatus = "Ready";
      state.lastPersistenceError = null;
      namespace.modules.persistence.status = "Ready";
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_PERSISTENCE_INITIALIZED", "Ready", getLocalFirstRepositoryPersistenceStatus());
    } catch (error) {
      state.persistenceStatus = "Unavailable";
      state.lastPersistenceError = error && error.message ? error.message : String(error);
      namespace.modules.persistence.status = "Blocked";
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_PERSISTENCE_UNAVAILABLE", "Blocked", getLocalFirstRepositoryPersistenceStatus(), { error: { message: state.lastPersistenceError, category: "Persistence" } });
    }
  }

  async function persistLocalFirstRepositoryRecord(recordType, record) {
    const def = definition(recordType);
    if (!def) return internal.buildResult(false, "REPOSITORY010_PERSISTENCE_RECORD_TYPE_INVALID", "Blocked", { recordType: recordType || null });
    const validation = typeof namespace.validateContract === "function" ? namespace.validateContract(def.contractKey, record) : { valid: false };
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_PERSISTENCE_CONTRACT_INVALID", "Blocked", { recordType: recordType, validation: validation });
    const id = record && record[def.keyPath];
    if (!id) return internal.buildResult(false, "REPOSITORY010_PERSISTENCE_RECORD_ID_MISSING", "Blocked", { recordType: recordType, keyPath: def.keyPath });
    try {
      await currentAdapter().put(recordType, record);
      const readBack = await currentAdapter().get(recordType, id);
      const readBackValidation = readBack && typeof namespace.validateContract === "function" ? namespace.validateContract(def.contractKey, readBack) : { valid: false };
      const same = Boolean(readBack && readBackValidation.valid === true && stableStringify(readBack) === stableStringify(record));
      if (!same) throw new Error("Persistence read-back verification failed.");
      state.persistenceStatus = "Verified";
      state.lastPersistenceError = null;
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_RECORD_PERSISTED", "Verified", {
        recordType: recordType,
        recordId: String(id),
        adapterId: currentAdapter().adapterId || "custom",
        readBackVerified: true,
        authorityEffect: "none",
        canonicalMutationPerformed: false
      });
    } catch (error) {
      state.persistenceStatus = "Failed";
      state.lastPersistenceError = error && error.message ? error.message : String(error);
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_RECORD_PERSISTENCE_FAILED", "Failed", { recordType: recordType, recordId: String(id) }, { error: { message: state.lastPersistenceError, category: "Persistence" } });
    }
  }

  async function getPersistedLocalFirstRepositoryRecord(recordType, id) { return currentAdapter().get(recordType, id); }
  async function listPersistedLocalFirstRepositoryRecords(recordType) { return currentAdapter().list(recordType); }

  async function deletePersistedLocalFirstRepositoryRecord(recordType, id) {
    const def = definition(recordType);
    const recordId = String(id || "");
    if (!def) return internal.buildResult(false, "REPOSITORY010_PERSISTENCE_RECORD_TYPE_INVALID", "Blocked", { recordType: recordType || null });
    if (!recordId) return internal.buildResult(false, "REPOSITORY010_PERSISTENCE_RECORD_ID_MISSING", "Blocked", { recordType: recordType, keyPath: def.keyPath });
    try {
      await currentAdapter().delete(recordType, recordId);
      const readBack = await currentAdapter().get(recordType, recordId);
      if (readBack !== null) throw new Error("Persistence delete read-back verification failed.");
      state.persistenceStatus = "Verified";
      state.lastPersistenceError = null;
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_RECORD_DELETED", "Verified", {
        recordType: recordType,
        recordId: recordId,
        adapterId: currentAdapter().adapterId || "custom",
        deleteReadBackVerified: true,
        exactIdDelete: true,
        broadClearPerformed: false,
        authorityEffect: "none",
        canonicalMutationPerformed: false
      });
    } catch (error) {
      state.persistenceStatus = "Failed";
      state.lastPersistenceError = error && error.message ? error.message : String(error);
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_RECORD_DELETE_FAILED", "Failed", { recordType: recordType, recordId: recordId }, { error: { message: state.lastPersistenceError, category: "Persistence" } });
    }
  }

  function getLocalFirstRepositoryPersistenceStatus() {
    return {
      status: state.persistenceStatus || "Not Initialized",
      adapterId: currentAdapter().adapterId || "custom",
      role: currentAdapter().role || "validated-working-replica-offline-staging",
      readMode: currentAdapter().readMode || "validated-record-read-write-no-canonical-authority",
      indexedDBAvailable: Boolean(global.indexedDB),
      databaseName: DB_NAME,
      databaseVersion: DB_VERSION,
      recordTypes: Object.keys(STORE_DEFINITIONS),
      androidRole: VERSION_MANIFEST.authority.androidIndexedDBRole,
      persistenceImplemented: true,
      syncEngineImplemented: false,
      directRepositoryMutationAllowed: false,
      canonicalMutationAuthority: false,
      authorityPromotionAllowed: false,
      readBackVerificationRequired: true,
      exactIdDeleteSupported: true,
      broadClearSupported: false,
      lastError: state.lastPersistenceError || null
    };
  }

  Object.assign(namespace.api, {
    initializeLocalFirstRepositoryPersistence: initializeLocalFirstRepositoryPersistence,
    createMemoryLocalFirstRepositoryPersistenceAdapter: createMemoryLocalFirstRepositoryPersistenceAdapter,
    setLocalFirstRepositoryPersistenceAdapter: setLocalFirstRepositoryPersistenceAdapter,
    persistLocalFirstRepositoryRecord: persistLocalFirstRepositoryRecord,
    getPersistedLocalFirstRepositoryRecord: getPersistedLocalFirstRepositoryRecord,
    listPersistedLocalFirstRepositoryRecords: listPersistedLocalFirstRepositoryRecords,
    deletePersistedLocalFirstRepositoryRecord: deletePersistedLocalFirstRepositoryRecord,
    getLocalFirstRepositoryPersistenceStatus: getLocalFirstRepositoryPersistenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.persistence = {
    id: "REPOSITORY-010-ANDROID-REPLICA-PERSISTENCE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    adapterId: nativeAdapter.adapterId,
    indexedDBRequiredForAndroidGate: true,
    persistentCanonicalMutationImplemented: false,
    syncEngineImplemented: false,
    exactIdDeleteSupported: true,
    broadClearSupported: false,
    validationFixtureCleanupSupported: true,
    offlineStagingStoreImplemented: true,
    databaseMigration: "1->2-add-offline-staging / 2->3-add-sync-candidate",
    loadedAt: internal.nowIso()
  };

  global.initializeLocalFirstRepositoryPersistence = initializeLocalFirstRepositoryPersistence;
  global.getLocalFirstRepositoryPersistenceStatus = getLocalFirstRepositoryPersistenceStatus;
})(typeof window !== "undefined" ? window : globalThis);
