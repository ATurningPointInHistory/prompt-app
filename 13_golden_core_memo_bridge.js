/* ============================================================
   FILE: 13_golden_core_memo_bridge.js
   IDE-125 Golden Core Memo Bridge
   Version: 1.1.0
   Status: Implementation
   ============================================================ */
(function (global) {
  "use strict";

  const COMPONENT_ID = "IDE-125-GOLDEN-CORE-BRIDGE";
  const VERSION = "1.1.0";
  const DATASET_ID = "golden-core";
  const DEFAULT_DEBOUNCE_MS = 150;
  const DEFAULT_WATCH_INTERVAL_MS = 1000;

  const state = {
    installed: false,
    enabled: true,
    wrappedApis: [],
    lastSignature: "",
    lastSyncAt: null,
    lastSyncReason: "",
    lastCaseCount: 0,
    lastStatus: "Not Synced",
    lastError: "",
    syncCount: 0,
    skippedSyncCount: 0,
    pending: false,
    timer: null,
    watchTimer: null
  };

  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function escapeRegExp(value) { return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function field(text, name) {
    const pattern = new RegExp(`(?:^|\\n)${escapeRegExp(name)}:\\s*(?:\\n\\s*)?([^\\n]+)`, "i");
    const match = String(text || "").match(pattern);
    return match ? match[1].trim() : "";
  }

  function parseMemo(memo) {
    const text = String(memo && memo.text || "");
    const id = field(text, "CaseId") || String(memo && memo.id || "").trim();
    const query = field(text, "Query");
    const expected = field(text, "ExpectedIds").split(",").map(value => value.trim()).filter(Boolean);
    if (!id || !query || !expected.length) return null;
    return {
      id,
      query,
      expected,
      category: field(text, "Category") || "Golden",
      consistency: field(text, "Consistency").toLowerCase() !== "false",
      allowAdditionalResults: field(text, "AllowAdditionalResults").toLowerCase() === "true",
      metadata: {
        memoId: memo.id || id,
        memoTitle: memo.name || "",
        datasetId: field(text, "DatasetId") || memo.series || DATASET_ID
      }
    };
  }

  function collectGoldenCoreCases() {
    const list = typeof global.getMemoBoxList === "function" ? global.getMemoBoxList() : [];
    return asArray(list)
      .filter(memo => String(memo && memo.knowledgeType || "").toLowerCase() === "goldentestcase")
      .filter(memo => String(memo.series || field(memo.text, "DatasetId") || "").toLowerCase() === DATASET_ID)
      .filter(memo => !["deprecated", "deleted", "archived"].includes(String(memo.status || "").toLowerCase()))
      .map(parseMemo)
      .filter(Boolean)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  function buildCaseSignature(cases) {
    return JSON.stringify(asArray(cases).map(testCase => ({
      id: testCase.id,
      query: testCase.query,
      expected: asArray(testCase.expected),
      category: testCase.category,
      consistency: testCase.consistency,
      allowAdditionalResults: testCase.allowAdditionalResults
    })));
  }

  function getGoldenCoreSyncStatus() {
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      datasetId: DATASET_ID,
      installed: state.installed,
      enabled: state.enabled,
      status: state.lastStatus,
      caseCount: state.lastCaseCount,
      syncCount: state.syncCount,
      skippedSyncCount: state.skippedSyncCount,
      pending: state.pending,
      wrappedApis: clone(state.wrappedApis),
      lastSyncAt: state.lastSyncAt,
      lastSyncReason: state.lastSyncReason,
      lastError: state.lastError
    };
  }

  function syncGoldenCoreFromMemos(options = {}) {
    if (typeof global.registerValidationDataset !== "function") {
      throw new Error("IDE-125 registerValidationDataset is unavailable.");
    }

    const cases = collectGoldenCoreCases();
    const signature = buildCaseSignature(cases);
    const syncedAt = nowIso();
    const dataset = global.registerValidationDataset({
      id: DATASET_ID,
      name: "Golden Core Dataset",
      type: "Golden",
      version: String(options.version || "1.0.0"),
      cases,
      profile: {
        source: "MemoBox",
        knowledgeType: "GoldenTestCase",
        autoSync: options.autoSync === true,
        syncReason: String(options.reason || "Manual"),
        syncedAt
      }
    }, { replace: true });

    state.lastSignature = signature;
    state.lastSyncAt = syncedAt;
    state.lastSyncReason = String(options.reason || "Manual");
    state.lastCaseCount = cases.length;
    state.lastStatus = cases.length ? "Ready" : "Blocked";
    state.lastError = "";
    state.syncCount++;
    state.pending = false;

    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      status: state.lastStatus,
      caseCount: cases.length,
      autoSync: options.autoSync === true,
      reason: state.lastSyncReason,
      dataset
    };
  }

  function syncIfChanged(reason = "Change Detection", options = {}) {
    if (!state.enabled) return { ...getGoldenCoreSyncStatus(), skipped: true, reason: "Auto sync disabled" };
    const cases = collectGoldenCoreCases();
    const signature = buildCaseSignature(cases);
    if (!options.force && signature === state.lastSignature) {
      state.pending = false;
      state.skippedSyncCount++;
      return { ...getGoldenCoreSyncStatus(), skipped: true, reason: "No GoldenTestCase changes" };
    }
    return syncGoldenCoreFromMemos({ ...options, autoSync: true, reason });
  }

  function scheduleGoldenCoreSync(reason = "Memo Mutation", options = {}) {
    if (!state.enabled) return getGoldenCoreSyncStatus();
    state.pending = true;
    if (state.timer) global.clearTimeout(state.timer);
    const delay = Math.max(0, Number(options.debounceMs ?? DEFAULT_DEBOUNCE_MS));
    state.timer = global.setTimeout(() => {
      state.timer = null;
      try {
        syncIfChanged(reason, options);
      } catch (error) {
        state.pending = false;
        state.lastStatus = "Error";
        state.lastError = String(error && error.message || error);
      }
    }, delay);
    return getGoldenCoreSyncStatus();
  }

  function wrapMutationApi(name) {
    const original = global[name];
    if (typeof original !== "function" || original.__goldenCoreAutoSyncWrapped === true) return false;

    function wrappedGoldenCoreMutationApi(...args) {
      let result;
      try {
        result = original.apply(this, args);
      } catch (error) {
        scheduleGoldenCoreSync(`${name}:error`);
        throw error;
      }

      if (result && typeof result.then === "function") {
        return result.then(value => {
          scheduleGoldenCoreSync(name);
          return value;
        }, error => {
          scheduleGoldenCoreSync(`${name}:error`);
          throw error;
        });
      }

      scheduleGoldenCoreSync(name);
      return result;
    }

    wrappedGoldenCoreMutationApi.__goldenCoreAutoSyncWrapped = true;
    wrappedGoldenCoreMutationApi.__goldenCoreOriginal = original;
    global[name] = wrappedGoldenCoreMutationApi;
    state.wrappedApis.push(name);
    return true;
  }

  function installGoldenCoreAutoSync(options = {}) {
    if (state.installed) return getGoldenCoreSyncStatus();
    state.installed = true;
    state.enabled = options.enabled !== false;

    [
      "saveMemoBoxes",
      "saveMemoBoxCurrent",
      "saveMemoEditor",
      "importMemoBoxes",
      "loadMemoBoxesFile",
      "deleteMemoBox",
      "deleteSelectedMemoBoxes",
      "archiveSelectedMemoBoxes",
      "batchEditSelectedMemoMetadata",
      "convertSelectedMemoMode",
      "duplicateSelectedMemoBoxes",
      "mergeSelectedMemoBoxes",
      "undoLastMemoImport",
      "restoreMemoAutoBackup",
      "applyMemoRepairPlans"
    ].forEach(wrapMutationApi);

    const watchIntervalMs = Math.max(250, Number(options.watchIntervalMs || DEFAULT_WATCH_INTERVAL_MS));
    if (typeof global.setInterval === "function") {
      state.watchTimer = global.setInterval(() => {
        try { syncIfChanged("Memo Watcher"); }
        catch (error) {
          state.lastStatus = "Error";
          state.lastError = String(error && error.message || error);
        }
      }, watchIntervalMs);
      if (state.watchTimer && typeof state.watchTimer.unref === "function") state.watchTimer.unref();
    }

    scheduleGoldenCoreSync("Bridge Initialization", { force: true, debounceMs: 0 });
    return getGoldenCoreSyncStatus();
  }

  function stopGoldenCoreAutoSync() {
    state.enabled = false;
    state.pending = false;
    if (state.timer) global.clearTimeout(state.timer);
    if (state.watchTimer) global.clearInterval(state.watchTimer);
    state.timer = null;
    state.watchTimer = null;
    return getGoldenCoreSyncStatus();
  }

  function startGoldenCoreAutoSync(options = {}) {
    state.enabled = true;
    if (!state.installed) return installGoldenCoreAutoSync(options);
    scheduleGoldenCoreSync("Auto Sync Restart", { force: true, debounceMs: 0 });
    return getGoldenCoreSyncStatus();
  }

  async function syncAndRunGoldenCore(options = {}) {
    const sync = syncGoldenCoreFromMemos({ ...options, reason: options.reason || "Manual Validation" });
    if (!sync.caseCount) return { sync, validation: null };
    if (typeof global.runSearchValidation !== "function") throw new Error("IDE-125 runSearchValidation is unavailable.");
    const validation = await global.runSearchValidation({
      datasetId: DATASET_ID,
      executionMode: String(options.executionMode || "Manual"),
      repositoryVersion: String(options.repositoryVersion || "memo-current"),
      baselineVersion: String(options.baselineVersion || "golden-core-v1.0.0"),
      policy: options.policy
    });
    return { sync, validation };
  }

  global.collectGoldenCoreCases = collectGoldenCoreCases;
  global.syncGoldenCoreFromMemos = syncGoldenCoreFromMemos;
  global.syncGoldenCoreIfChanged = syncIfChanged;
  global.scheduleGoldenCoreSync = scheduleGoldenCoreSync;
  global.installGoldenCoreAutoSync = installGoldenCoreAutoSync;
  global.startGoldenCoreAutoSync = startGoldenCoreAutoSync;
  global.stopGoldenCoreAutoSync = stopGoldenCoreAutoSync;
  global.getGoldenCoreSyncStatus = getGoldenCoreSyncStatus;
  global.syncAndRunGoldenCore = syncAndRunGoldenCore;
  global.IDE125GoldenCoreMemoBridge = {
    id: COMPONENT_ID,
    version: VERSION,
    collectGoldenCoreCases,
    syncGoldenCoreFromMemos,
    syncGoldenCoreIfChanged: syncIfChanged,
    scheduleGoldenCoreSync,
    installGoldenCoreAutoSync,
    startGoldenCoreAutoSync,
    stopGoldenCoreAutoSync,
    getGoldenCoreSyncStatus,
    syncAndRunGoldenCore
  };

  installGoldenCoreAutoSync();
})(typeof window !== "undefined" ? window : globalThis);