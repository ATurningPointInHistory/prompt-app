/* ============================================================
   FILE: 13_ai_development_workflow_storage.js
   IDE-160 AI Development Workflow Storage
   Version: 1.1.0
   Phase: 2 - Workflow Planning Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const SCHEMA_VERSION = namespace.schemaVersion;

  const STORAGE_KEYS = Object.freeze({
    runtime: "AI_PROMPT_OS_IDE160_RUNTIME_V1",
    transitionJournal: "AI_PROMPT_OS_IDE160_TRANSITION_JOURNAL_V1",
    recordStore: "AI_PROMPT_OS_IDE160_RECORD_STORE_V1",
    packageStore: "AI_PROMPT_OS_IDE160_PACKAGE_STORE_V1",
    baselineStore: "AI_PROMPT_OS_IDE160_BASELINE_STORE_V1",
    settings: "AI_PROMPT_OS_IDE160_SETTINGS_V1"
  });

  const RETENTION = Object.freeze({
    transitionJournal: 300,
    executionRecords: 100,
    decisionRecords: 50,
    approvalRecords: 50,
    monitoringRecords: 100,
    failureRecoveryRecords: 100,
    packages: 10,
    baselines: 10,
    contextRevisions: 50
  });

  const STORAGE_BUDGET = Object.freeze({
    softWarningBytes: 512 * 1024,
    hardGuardBytes: 768 * 1024
  });

  let storageOverride = null;

  function getStorage() {
    if (storageOverride) return storageOverride;
    try {
      return global.localStorage || null;
    } catch (_) {
      return null;
    }
  }

  function createMemoryStorage(seed) {
    const records = new Map();
    const source = seed && typeof seed === "object" ? seed : {};
    Object.keys(source).forEach(function add(key) {
      records.set(String(key), String(source[key]));
    });
    return {
      get length() { return records.size; },
      key: function key(index) { return [...records.keys()][Number(index)] || null; },
      getItem: function getItem(key) {
        const name = String(key);
        return records.has(name) ? records.get(name) : null;
      },
      setItem: function setItem(key, value) { records.set(String(key), String(value)); },
      removeItem: function removeItem(key) { records.delete(String(key)); },
      clear: function clear() { records.clear(); },
      export: function exportRecords() { return Object.fromEntries(records.entries()); }
    };
  }

  function runWithWorkflowStorage(storage, callback) {
    if (typeof callback !== "function") throw new TypeError("Storage callback is required.");
    const previous = storageOverride;
    storageOverride = storage || null;
    try {
      return callback();
    } finally {
      storageOverride = previous;
    }
  }

  function normalizeCanonicalValue(value, seen) {
    if (value === undefined) return undefined;
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new TypeError("Canonical serialization does not allow NaN or Infinity.");
      return value;
    }
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") return undefined;
    if (seen.has(value)) throw new TypeError("Canonical serialization does not allow circular references.");
    seen.add(value);

    let normalized;
    if (Array.isArray(value)) {
      normalized = value.map(function mapArray(item) {
        const result = normalizeCanonicalValue(item, seen);
        return result === undefined ? null : result;
      });
    } else if (value instanceof Map) {
      normalized = [...value.entries()].sort(function sortMap(a, b) {
        return String(a[0]).localeCompare(String(b[0]));
      }).map(function mapEntry(entry) {
        return [String(entry[0]), normalizeCanonicalValue(entry[1], seen)];
      });
    } else if (value instanceof Set) {
      normalized = [...value.values()].map(function mapSet(item) {
        return normalizeCanonicalValue(item, seen);
      });
    } else {
      normalized = {};
      Object.keys(value).sort().forEach(function addKey(key) {
        const item = normalizeCanonicalValue(value[key], seen);
        if (item !== undefined) normalized[key] = item;
      });
    }
    seen.delete(value);
    return normalized;
  }

  function canonicalStringify(value) {
    return JSON.stringify(normalizeCanonicalValue(value, new WeakSet()));
  }

  function hashTextFNV1A32(value) {
    const source = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function hashCanonicalSync(value) {
    return {
      algorithm: "FNV-1A-32",
      hash: hashTextFNV1A32(canonicalStringify(value))
    };
  }

  async function hashCanonical(value) {
    const source = canonicalStringify(value);
    if (global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function") {
      const bytes = new global.TextEncoder().encode(source);
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      const hash = [...new Uint8Array(digest)].map(function toHex(item) {
        return item.toString(16).padStart(2, "0");
      }).join("");
      return { algorithm: "SHA-256", hash: hash };
    }
    return { algorithm: "FNV-1A-32", hash: hashTextFNV1A32(source) };
  }

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function estimateStorageUsage(storage) {
    const target = storage || getStorage();
    if (!target) return { available: false, bytes: 0, kib: 0, keyCount: 0 };
    let bytes = 0;
    let keyCount = 0;
    try {
      for (let index = 0; index < target.length; index += 1) {
        const key = target.key(index);
        if (key == null) continue;
        const value = target.getItem(key) || "";
        bytes += (String(key).length + String(value).length) * 2;
        keyCount += 1;
      }
    } catch (_) {
      return { available: false, bytes: bytes, kib: bytes / 1024, keyCount: keyCount };
    }
    return { available: true, bytes: bytes, kib: Number((bytes / 1024).toFixed(3)), keyCount: keyCount };
  }

  function estimateIDE160StorageUsage(storage) {
    const target = storage || getStorage();
    if (!target) return { available: false, bytes: 0, kib: 0, keyCount: 0, status: "Unavailable" };
    let bytes = 0;
    let keyCount = 0;
    Object.keys(STORAGE_KEYS).forEach(function inspect(name) {
      const key = STORAGE_KEYS[name];
      try {
        const value = target.getItem(key);
        if (value != null) {
          bytes += (key.length + String(value).length) * 2;
          keyCount += 1;
        }
      } catch (_) {
        // Report through available/status below.
      }
    });
    let status = "Ready";
    if (bytes >= STORAGE_BUDGET.hardGuardBytes) status = "Hard Guard";
    else if (bytes >= STORAGE_BUDGET.softWarningBytes) status = "Soft Warning";
    return { available: true, bytes: bytes, kib: Number((bytes / 1024).toFixed(3)), keyCount: keyCount, status: status };
  }

  function writeVerified(key, payload) {
    const storage = getStorage();
    if (!storage) {
      return internal.buildResult(false, "STORAGE_UNAVAILABLE", "Blocked", null, {
        error: { message: "Storage is unavailable.", category: "Persistence Failure", severity: "High" }
      });
    }
    const envelope = {
      schemaVersion: SCHEMA_VERSION,
      componentId: namespace.componentId,
      version: VERSION,
      key: key,
      payload: payload,
      persistedAt: internal.nowIso()
    };
    const integrity = hashCanonicalSync(envelope.payload);
    envelope.integrity = integrity;
    const serialized = canonicalStringify(envelope);
    const usageBefore = estimateIDE160StorageUsage(storage);
    const projectedBytes = usageBefore.bytes + (String(key).length + serialized.length) * 2;
    if (projectedBytes >= STORAGE_BUDGET.hardGuardBytes && storage.getItem(key) == null) {
      return internal.buildResult(false, "STORAGE_HARD_GUARD", "Blocked", {
        projectedBytes: projectedBytes,
        hardGuardBytes: STORAGE_BUDGET.hardGuardBytes
      }, {
        error: { message: "IDE-160 storage hard guard reached.", category: "Persistence Failure", severity: "High" }
      });
    }

    try {
      storage.setItem(key, serialized);
      const readRaw = storage.getItem(key);
      const readEnvelope = safeParse(readRaw, null);
      const readIntegrity = readEnvelope && readEnvelope.integrity;
      const recalculated = readEnvelope ? hashCanonicalSync(readEnvelope.payload) : null;
      const verified = Boolean(
        readEnvelope &&
        readEnvelope.key === key &&
        readIntegrity &&
        recalculated &&
        readIntegrity.algorithm === recalculated.algorithm &&
        readIntegrity.hash === recalculated.hash
      );
      if (!verified) {
        return internal.buildResult(false, "STORAGE_READBACK_FAILED", "Failed", {
          key: key,
          integrity: readIntegrity,
          recalculated: recalculated
        }, {
          error: { message: "Storage read-back verification failed.", category: "Persistence Failure", severity: "Critical" }
        });
      }
      const usageAfter = estimateIDE160StorageUsage(storage);
      return internal.buildResult(true, "STORAGE_WRITE_VERIFIED", "Verified", {
        key: key,
        integrity: recalculated,
        bytes: serialized.length * 2,
        storageUsage: usageAfter
      }, {
        warnings: usageAfter.status === "Soft Warning" ? ["IDE-160 storage soft warning reached."] : []
      });
    } catch (error) {
      return internal.buildResult(false, "STORAGE_WRITE_FAILED", "Failed", { key: key }, {
        error: {
          message: error && error.message ? error.message : String(error),
          category: "Persistence Failure",
          severity: "Critical"
        }
      });
    }
  }

  function readVerified(key) {
    const storage = getStorage();
    if (!storage) {
      return internal.buildResult(false, "STORAGE_UNAVAILABLE", "Blocked", null, {
        error: { message: "Storage is unavailable.", category: "Persistence Failure", severity: "High" }
      });
    }
    try {
      const raw = storage.getItem(key);
      if (!raw) return internal.buildResult(true, "STORAGE_RECORD_NOT_FOUND", "Empty", { key: key, payload: null });
      const envelope = safeParse(raw, null);
      if (!envelope || envelope.key !== key || envelope.componentId !== namespace.componentId) {
        return internal.buildResult(false, "STORAGE_RECORD_INVALID", "Failed", { key: key }, {
          error: { message: "Storage envelope is invalid.", category: "Persistence Failure", severity: "High" }
        });
      }
      const recalculated = hashCanonicalSync(envelope.payload);
      const verified = Boolean(
        envelope.integrity &&
        envelope.integrity.algorithm === recalculated.algorithm &&
        envelope.integrity.hash === recalculated.hash
      );
      if (!verified) {
        return internal.buildResult(false, "STORAGE_INTEGRITY_FAILED", "Failed", {
          key: key,
          storedIntegrity: envelope.integrity,
          recalculated: recalculated
        }, {
          error: { message: "Stored IDE-160 record failed integrity validation.", category: "Persistence Failure", severity: "Critical" }
        });
      }
      return internal.buildResult(true, "STORAGE_READ_VERIFIED", "Verified", {
        key: key,
        payload: internal.clone(envelope.payload),
        integrity: recalculated,
        persistedAt: envelope.persistedAt
      });
    } catch (error) {
      return internal.buildResult(false, "STORAGE_READ_FAILED", "Failed", { key: key }, {
        error: { message: error && error.message ? error.message : String(error), category: "Persistence Failure", severity: "High" }
      });
    }
  }

  function persistWorkflowRuntime() {
    return writeVerified(STORAGE_KEYS.runtime, internal.exportRuntimeState());
  }

  function loadWorkflowRuntime() {
    const result = readVerified(STORAGE_KEYS.runtime);
    if (!result.ok || !result.data || !result.data.payload) return result;
    return internal.importRuntimeState(result.data.payload);
  }

  function loadJournalPayload() {
    const result = readVerified(STORAGE_KEYS.transitionJournal);
    if (!result.ok || !result.data || !result.data.payload) {
      return { records: [], readResult: result };
    }
    return {
      records: Array.isArray(result.data.payload.records) ? result.data.payload.records : [],
      readResult: result
    };
  }

  function persistTransitionJournal(records) {
    const source = Array.isArray(records) ? records.slice(-RETENTION.transitionJournal) : [];
    return writeVerified(STORAGE_KEYS.transitionJournal, {
      records: source,
      count: source.length,
      updatedAt: internal.nowIso()
    });
  }

  function loadTransitionJournal() {
    return loadJournalPayload();
  }

  function loadRecordStorePayload() {
    const result = readVerified(STORAGE_KEYS.recordStore);
    const empty = { failures: [], recoveries: [], attempts: [] };
    if (!result.ok || !result.data || !result.data.payload) return { store: empty, readResult: result };
    const source = result.data.payload;
    return {
      store: {
        failures: Array.isArray(source.failures) ? source.failures : [],
        recoveries: Array.isArray(source.recoveries) ? source.recoveries : [],
        attempts: Array.isArray(source.attempts) ? source.attempts : []
      },
      readResult: result
    };
  }

  function persistFoundationRecordStore(store) {
    const source = store && typeof store === "object" ? store : {};
    return writeVerified(STORAGE_KEYS.recordStore, {
      failures: Array.isArray(source.failures) ? source.failures.slice(-RETENTION.failureRecoveryRecords) : [],
      recoveries: Array.isArray(source.recoveries) ? source.recoveries.slice(-RETENTION.failureRecoveryRecords) : [],
      attempts: Array.isArray(source.attempts) ? source.attempts.slice(-RETENTION.failureRecoveryRecords) : [],
      updatedAt: internal.nowIso()
    });
  }

  function clearIDE160Storage(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (settings.confirm !== true) {
      return internal.buildResult(false, "STORAGE_CLEAR_CONFIRMATION_REQUIRED", "Blocked", null, {
        error: { message: "Explicit confirmation is required.", category: "Policy Failure", severity: "High" }
      });
    }
    if (state.activeWorkflowId && settings.force !== true) {
      return internal.buildResult(false, "ACTIVE_WORKFLOW_PROTECTED", "Blocked", {
        activeWorkflowId: state.activeWorkflowId
      }, {
        error: { message: "Active Workflow records are protected.", category: "Policy Failure", severity: "Critical" }
      });
    }
    const storage = getStorage();
    if (!storage) return internal.buildResult(false, "STORAGE_UNAVAILABLE", "Blocked", null);
    Object.keys(STORAGE_KEYS).forEach(function remove(name) {
      storage.removeItem(STORAGE_KEYS[name]);
    });
    return internal.buildResult(true, "IDE160_STORAGE_CLEARED", "Cleared", {
      keys: Object.values(STORAGE_KEYS)
    });
  }

  function getIDE160StorageStatus() {
    return {
      componentId: namespace.componentId,
      version: VERSION,
      available: Boolean(getStorage()),
      keys: internal.clone(STORAGE_KEYS),
      retention: internal.clone(RETENTION),
      budget: internal.clone(STORAGE_BUDGET),
      usage: estimateIDE160StorageUsage(),
      totalStorage: estimateStorageUsage(),
      updatedAt: internal.nowIso()
    };
  }

  namespace.constants.STORAGE_KEYS = STORAGE_KEYS;
  namespace.constants.RETENTION = RETENTION;
  namespace.constants.STORAGE_BUDGET = STORAGE_BUDGET;

  Object.assign(internal, {
    getStorage: getStorage,
    createMemoryStorage: createMemoryStorage,
    runWithWorkflowStorage: runWithWorkflowStorage,
    canonicalStringify: canonicalStringify,
    hashTextFNV1A32: hashTextFNV1A32,
    hashCanonicalSync: hashCanonicalSync,
    hashCanonical: hashCanonical,
    writeVerified: writeVerified,
    readVerified: readVerified,
    estimateStorageUsage: estimateStorageUsage,
    estimateIDE160StorageUsage: estimateIDE160StorageUsage
  });

  Object.assign(namespace.api, {
    createIDE160MemoryStorage: createMemoryStorage,
    runWithIDE160Storage: runWithWorkflowStorage,
    canonicalStringifyIDE160: canonicalStringify,
    hashIDE160CanonicalSync: hashCanonicalSync,
    hashIDE160Canonical: hashCanonical,
    persistWorkflowRuntime: persistWorkflowRuntime,
    loadWorkflowRuntime: loadWorkflowRuntime,
    persistTransitionJournal: persistTransitionJournal,
    loadTransitionJournal: loadTransitionJournal,
    loadFoundationRecordStore: loadRecordStorePayload,
    persistFoundationRecordStore: persistFoundationRecordStore,
    clearIDE160Storage: clearIDE160Storage,
    getIDE160StorageStatus: getIDE160StorageStatus
  });

  namespace.modules.storage = {
    id: "IDE-160-STORAGE",
    version: VERSION,
    status: "Ready",
    storageKeys: Object.values(STORAGE_KEYS),
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);