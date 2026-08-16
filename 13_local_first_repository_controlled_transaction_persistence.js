/* ============================================================
   FILE: 13_local_first_repository_controlled_transaction_persistence.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.11.0 / Module: Controlled Transaction Persistence 1.0.0
   Phase 12: PC Controlled Transaction Trial Persistence
   Decision-007: Backup Before Write / Journal Before Write
   IMPORTANT: Separate from Android Replica persistence.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Controlled Transaction Persistence blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("controlledTransactionPersistence");
  const DB_NAME = "AI_PROMPT_OS_REPOSITORY010_CONTROLLED_TRANSACTION_V1";
  const DB_VERSION = 1;
  const STORE_DEFINITIONS = Object.freeze({
    transactionJournal: { storeName: "transaction_journals", keyPath: "transactionId" },
    functionBackup: { storeName: "function_backups", keyPath: "backupId" },
    fullFileBackup: { storeName: "full_file_backups", keyPath: "backupId" },
    tokenConsumption: { storeName: "token_consumptions", keyPath: "acceptanceTokenId" }
  });

  let database = null;
  let opening = null;
  let lastError = null;

  function fail(code, message, data) {
    lastError = { message: String(message || code || "Controlled Transaction Persistence failed."), at: internal.nowIso() };
    state.controlledTransactionPersistenceStatus = "Blocked";
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(lastError) });
  }

  function hasIndexedDB() { return Boolean(global.indexedDB && typeof global.indexedDB.open === "function"); }

  function resolveDefinition(recordType) {
    return STORE_DEFINITIONS[internal.text(recordType, "")] || null;
  }

  function requestResult(request) {
    return new Promise(function executor(resolve, reject) {
      request.onsuccess = function success() { resolve(request.result); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB request failed.")); };
    });
  }

  function transactionDone(transaction) {
    return new Promise(function executor(resolve, reject) {
      transaction.oncomplete = function complete() { resolve(true); };
      transaction.onerror = function error() { reject(transaction.error || new Error("IndexedDB transaction failed.")); };
      transaction.onabort = function abort() { reject(transaction.error || new Error("IndexedDB transaction aborted.")); };
    });
  }

  function openDatabase() {
    if (database) return Promise.resolve(database);
    if (opening) return opening;
    if (!hasIndexedDB()) return Promise.reject(new Error("IndexedDB is unavailable."));

    opening = new Promise(function executor(resolve, reject) {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function upgrade() {
        const db = request.result;
        Object.keys(STORE_DEFINITIONS).forEach(function each(key) {
          const definition = STORE_DEFINITIONS[key];
          if (!db.objectStoreNames.contains(definition.storeName)) {
            db.createObjectStore(definition.storeName, { keyPath: definition.keyPath });
          }
        });
      };
      request.onsuccess = function success() {
        database = request.result;
        database.onversionchange = function versionchange() {
          try { database.close(); } catch (_) {}
          database = null;
        };
        resolve(database);
      };
      request.onerror = function error() { reject(request.error || new Error("Controlled Transaction IndexedDB open failed.")); };
      request.onblocked = function blocked() { reject(new Error("Controlled Transaction IndexedDB open was blocked.")); };
    }).finally(function clear() { opening = null; });

    return opening;
  }

  async function putRecord(recordType, record) {
    const definition = resolveDefinition(recordType);
    if (!definition) return fail("REPOSITORY010_CONTROLLED_PERSISTENCE_RECORD_TYPE_INVALID", "Unknown Controlled Transaction record type.", { recordType: recordType });
    if (!internal.isPlainObject(record)) return fail("REPOSITORY010_CONTROLLED_PERSISTENCE_RECORD_INVALID", "Controlled Transaction record must be an object.", { recordType: recordType });
    const key = internal.text(record[definition.keyPath], "");
    if (!key) return fail("REPOSITORY010_CONTROLLED_PERSISTENCE_RECORD_ID_REQUIRED", "Controlled Transaction persistence key is required.", { recordType: recordType, keyPath: definition.keyPath });
    try {
      const db = await openDatabase();
      const tx = db.transaction(definition.storeName, "readwrite");
      tx.objectStore(definition.storeName).put(internal.clone(record));
      await transactionDone(tx);
      const stored = await getRecord(recordType, key);
      if (!stored || internal.text(stored[definition.keyPath], "") !== key) throw new Error("Controlled Transaction persistence read-back verification failed.");
      return internal.buildResult(true, "REPOSITORY010_CONTROLLED_PERSISTENCE_RECORD_STORED", "Stored", {
        recordType: recordType,
        recordId: key,
        verified: true,
        record: internal.clone(stored)
      });
    } catch (error) {
      return fail("REPOSITORY010_CONTROLLED_PERSISTENCE_WRITE_FAILED", error && error.message ? error.message : String(error), { recordType: recordType, recordId: key });
    }
  }

  async function getRecord(recordType, recordId) {
    const definition = resolveDefinition(recordType);
    if (!definition) return null;
    const id = internal.text(recordId, "");
    if (!id) return null;
    try {
      const db = await openDatabase();
      const tx = db.transaction(definition.storeName, "readonly");
      const result = await requestResult(tx.objectStore(definition.storeName).get(id));
      await transactionDone(tx);
      return result ? internal.clone(result) : null;
    } catch (error) {
      lastError = { message: error && error.message ? error.message : String(error), at: internal.nowIso() };
      return null;
    }
  }

  async function listRecords(recordType) {
    const definition = resolveDefinition(recordType);
    if (!definition) return [];
    try {
      const db = await openDatabase();
      const tx = db.transaction(definition.storeName, "readonly");
      const store = tx.objectStore(definition.storeName);
      const request = typeof store.getAll === "function" ? store.getAll() : null;
      if (request) {
        const values = await requestResult(request);
        await transactionDone(tx);
        return Array.isArray(values) ? values.map(internal.clone) : [];
      }
      const values = [];
      await new Promise(function cursorPromise(resolve, reject) {
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = function success() {
          const cursor = cursorRequest.result;
          if (!cursor) { resolve(true); return; }
          values.push(internal.clone(cursor.value));
          cursor.continue();
        };
        cursorRequest.onerror = function error() { reject(cursorRequest.error || new Error("IndexedDB cursor failed.")); };
      });
      await transactionDone(tx);
      return values;
    } catch (_) { return []; }
  }

  async function restoreTokenConsumptionRecords() {
    const records = await listRecords("tokenConsumption");
    if (!(state.acceptanceTokenConsumptionRecords instanceof Map)) state.acceptanceTokenConsumptionRecords = new Map();
    records.forEach(function each(record) {
      const tokenId = internal.text(record && record.acceptanceTokenId, "");
      if (tokenId) state.acceptanceTokenConsumptionRecords.set(tokenId, internal.clone(record));
    });
    return records.length;
  }

  async function initializeControlledTransactionPersistence() {
    if (!hasIndexedDB()) return fail("REPOSITORY010_CONTROLLED_PERSISTENCE_UNAVAILABLE", "IndexedDB is unavailable for PC Controlled Transaction persistence.");
    try {
      await openDatabase();
      const restoredConsumptionCount = await restoreTokenConsumptionRecords();
      state.controlledTransactionPersistenceStatus = "Ready";
      state.lastControlledTransactionPersistenceError = null;
      internal.touch();
      namespace.modules.controlledTransactionPersistence.status = "Ready";
      return internal.buildResult(true, "REPOSITORY010_CONTROLLED_PERSISTENCE_INITIALIZED", "Ready", {
        databaseName: DB_NAME,
        databaseVersion: DB_VERSION,
        recordTypes: Object.keys(STORE_DEFINITIONS),
        restoredTokenConsumptionCount: restoredConsumptionCount,
        separateFromAndroidReplicaPersistence: true,
        canonicalAuthorityGranted: false
      });
    } catch (error) {
      return fail("REPOSITORY010_CONTROLLED_PERSISTENCE_INITIALIZATION_FAILED", error && error.message ? error.message : String(error));
    }
  }

  async function deleteExactRecord(recordType, recordId) {
    const definition = resolveDefinition(recordType);
    const id = internal.text(recordId, "");
    if (!definition || !id) return false;
    try {
      const db = await openDatabase();
      const tx = db.transaction(definition.storeName, "readwrite");
      tx.objectStore(definition.storeName).delete(id);
      await transactionDone(tx);
      return (await getRecord(recordType, id)) === null;
    } catch (_) { return false; }
  }

  function getControlledTransactionPersistenceStatus() {
    return {
      status: state.controlledTransactionPersistenceStatus || (database ? "Ready" : "Not Initialized"),
      moduleVersion: MODULE_VERSION,
      databaseName: DB_NAME,
      databaseVersion: DB_VERSION,
      indexedDBAvailable: hasIndexedDB(),
      recordTypes: Object.keys(STORE_DEFINITIONS),
      stores: Object.keys(STORE_DEFINITIONS).reduce(function map(out, key) {
        out[key] = STORE_DEFINITIONS[key].storeName;
        return out;
      }, {}),
      separateFromAndroidReplicaPersistence: true,
      broadClearSupported: false,
      exactIdDeleteSupported: true,
      fullFileEmergencyBackupSupported: true,
      functionRollbackBackupSupported: true,
      persistentTransactionJournalSupported: true,
      tokenConsumptionPersistenceSupported: true,
      directRepositoryMutationAllowed: false,
      lastError: internal.clone(lastError)
    };
  }

  Object.assign(namespace.api, {
    initializeControlledTransactionPersistence: initializeControlledTransactionPersistence,
    putControlledTransactionRecord: putRecord,
    getControlledTransactionRecord: getRecord,
    listControlledTransactionRecords: listRecords,
    deleteExactControlledTransactionRecord: deleteExactRecord,
    getControlledTransactionPersistenceStatus: getControlledTransactionPersistenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.controlledTransactionPersistence = {
    id: "REPOSITORY-010-CONTROLLED-TRANSACTION-PERSISTENCE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 12,
    databaseName: DB_NAME,
    databaseVersion: DB_VERSION,
    separateFromAndroidReplicaPersistence: true,
    transactionJournalPersistenceImplemented: true,
    functionBackupPersistenceImplemented: true,
    fullFileEmergencyBackupPersistenceImplemented: true,
    tokenConsumptionPersistenceImplemented: true,
    broadClearSupported: false,
    canonicalAuthorityGranted: false,
    loadedAt: internal.nowIso()
  };

  global.initializeLocalFirstRepositoryControlledTransactionPersistence = initializeControlledTransactionPersistence;
  global.getLocalFirstRepositoryControlledTransactionPersistenceStatus = getControlledTransactionPersistenceStatus;
})(typeof window !== "undefined" ? window : globalThis);
