/* ============================================================
   FILE: 13_auto_refactoring_transaction.js
   IDE-150 Auto Refactoring Transaction Extension
   Version: 1.2.5
   Status: Dedicated Transaction Journal + Function-Level Rollback Snapshot
   ============================================================ */
(function (global) {
  "use strict";

  const internal = global.__IDE150AutoRefactoringInternal;
  if (!internal) throw new Error("IDE-150 Core must be loaded before Transaction Extension.");

  const COMPONENT_ID = internal.COMPONENT_ID;
  const VERSION = internal.VERSION;
  const MAX_RECORDS = internal.MAX_RECORDS;
  const MAX_ROLLBACK_SNAPSHOTS = internal.MAX_ROLLBACK_SNAPSHOTS;
  const DEFAULT_BUDGET = internal.DEFAULT_BUDGET;
  const state = internal.state;
  const nowIso = internal.nowIso;
  const clone = internal.clone;
  const text = internal.text;
  const finite = internal.finite;
  const nextId = internal.nextId;
  const trimMap = internal.trimMap;
  const hashText = internal.hashText;
  const recordEvent = internal.recordEvent;
  const compactRequest = internal.compactRequest;
  const compactPlan = internal.compactPlan;
  const compactCandidate = internal.compactCandidate;
  const compactTransaction = internal.compactTransaction;
  const getCandidateRecord = internal.getCandidateRecord;
  const getTransactionRecord = internal.getTransactionRecord;
  const persistAutoRefactoringState = internal.persistAutoRefactoringState;
  const findFunctionBlock = internal.findFunctionBlock;
  const countFunctionDefinitions = internal.countFunctionDefinitions;
  const getStorage = typeof internal.getStorage === "function"
    ? internal.getStorage
    : function fallbackStorage() { try { return global.localStorage || null; } catch (_) { return null; } };
  const ROLLBACK_SNAPSHOT_PREFIX = "AI_PROMPT_OS_IDE150_ROLLBACK_SNAPSHOT_V1:";
  const ROLLBACK_SNAPSHOT_LIMIT = Math.max(3, Number(MAX_ROLLBACK_SNAPSHOTS) || 10);
  const TRANSACTION_JOURNAL_PREFIX = "AI_PROMPT_OS_IDE150_TRANSACTION_JOURNAL_V1:";
  const TRANSACTION_JOURNAL_LIMIT = Math.max(3, Number(MAX_ROLLBACK_SNAPSHOTS) || 10);

  function listRollbackSnapshotRecords() {
    const records = [];
    const storage = getStorage();
    if (!storage) return records;
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || key.indexOf(ROLLBACK_SNAPSHOT_PREFIX) !== 0) continue;
        let payload = null;
        try {
          const raw = storage.getItem(key);
          payload = raw ? JSON.parse(raw) : null;
        } catch (_) {}
        records.push({
          key: key,
          transactionId: text(payload && payload.transactionId, ""),
          capturedAt: text(payload && payload.capturedAt, ""),
          verifiedAt: text(payload && payload.verifiedAt, "")
        });
      }
    } catch (_) {}
    records.sort(function order(left, right) {
      return String(left.capturedAt || left.verifiedAt || "").localeCompare(String(right.capturedAt || right.verifiedAt || ""));
    });
    return records;
  }

  function pruneRollbackSnapshots(protectedKey) {
    const records = listRollbackSnapshotRecords().filter(function keep(item) { return item.key !== protectedKey; });
    const removeCount = Math.max(0, records.length - (ROLLBACK_SNAPSHOT_LIMIT - 1));
    const removed = [];
    for (let index = 0; index < removeCount; index += 1) {
      try {
        const storage = getStorage();
        if (storage) storage.removeItem(records[index].key);
        removed.push(records[index].key);
      } catch (_) {}
    }
    return removed;
  }

  function isQuotaError(error) {
    if (!error) return false;
    return error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 || error.code === 1014 ||
      /quota|storage.*full|exceeded/i.test(String(error.message || ""));
  }

  function pruneRollbackSnapshotsForCapacity(protectedKey, keepCount) {
    const records = listRollbackSnapshotRecords().filter(function keep(item) { return item.key !== protectedKey; });
    const keep = Math.max(0, Number(keepCount) || 0);
    const removeCount = Math.max(0, records.length - keep);
    const removed = [];
    for (let index = 0; index < removeCount; index += 1) {
      try {
        const storage = getStorage();
        if (storage) storage.removeItem(records[index].key);
        removed.push(records[index].key);
      } catch (_) {}
    }
    return removed;
  }

  function buildRollbackSnapshotPayload(transaction) {
    const snapshot = transaction && transaction.rollbackSnapshot || null;
    if (!snapshot) return null;
    const beforeFunctionSource = typeof snapshot.beforeFunctionSource === "string"
      ? snapshot.beforeFunctionSource
      : "";
    if (beforeFunctionSource) {
      return {
        schemaVersion: 2,
        componentId: COMPONENT_ID,
        version: VERSION,
        mode: "Function-Level",
        transactionId: transaction.id,
        candidateId: transaction.candidateId,
        targetFile: transaction.targetFile,
        targetFunction: transaction.targetFunction,
        beforeFunctionSource: beforeFunctionSource,
        beforeFunctionHash: snapshot.beforeFunctionHash || hashText(beforeFunctionSource),
        afterFunctionHash: snapshot.afterFunctionHash || "",
        beforeFileHash: transaction.beforeFileHash,
        afterFileHash: transaction.afterFileHash,
        capturedAt: snapshot.capturedAt || nowIso(),
        verifiedAt: nowIso()
      };
    }
    if (typeof snapshot.source !== "string") return null;
    return {
      schemaVersion: 1,
      componentId: COMPONENT_ID,
      version: VERSION,
      mode: "Full-File",
      transactionId: transaction.id,
      candidateId: transaction.candidateId,
      targetFile: transaction.targetFile,
      targetFunction: transaction.targetFunction,
      source: snapshot.source,
      sourceHash: snapshot.sourceHash || hashText(snapshot.source),
      beforeFileHash: transaction.beforeFileHash,
      afterFileHash: transaction.afterFileHash,
      capturedAt: snapshot.capturedAt || nowIso(),
      verifiedAt: nowIso()
    };
  }

  function verifyRollbackSnapshotPayload(stored, transaction) {
    if (!stored || stored.transactionId !== transaction.id || stored.targetFile !== transaction.targetFile) {
      return { verified: false, reason: "Rollback Snapshot identity verification failed." };
    }
    if (stored.mode === "Function-Level" || stored.schemaVersion === 2) {
      const source = typeof stored.beforeFunctionSource === "string" ? stored.beforeFunctionSource : "";
      const expectedHash = text(stored.beforeFunctionHash, "");
      const verified = Boolean(
        source &&
        stored.targetFunction === transaction.targetFunction &&
        expectedHash &&
        hashText(source) === expectedHash &&
        stored.beforeFileHash === transaction.beforeFileHash &&
        stored.afterFileHash === transaction.afterFileHash
      );
      return { verified: verified, reason: verified ? "" : "Function-level Rollback Snapshot verification failed." };
    }
    const source = typeof stored.source === "string" ? stored.source : "";
    const expectedHash = text(stored.sourceHash, "");
    const verified = Boolean(source && expectedHash && hashText(source) === expectedHash);
    return { verified: verified, reason: verified ? "" : "Full-file Rollback Snapshot verification failed." };
  }

  function persistRollbackSnapshot(transaction) {
    const storage = getStorage();
    if (!storage) return { persisted: false, reason: "Storage is unavailable." };
    const payload = buildRollbackSnapshotPayload(transaction);
    if (!payload) return { persisted: false, reason: "Rollback Snapshot source is unavailable." };
    const storageKey = ROLLBACK_SNAPSHOT_PREFIX + transaction.id;
    const raw = JSON.stringify(payload);
    let lastError = "";
    let reclaimedKeys = [];

    // Retention cleanup happens before the first write, not only after failure.
    pruneRollbackSnapshots(storageKey);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (attempt === 1) {
          reclaimedKeys = reclaimedKeys.concat(pruneRollbackSnapshotsForCapacity(storageKey, 2));
          // Development-console input is a rebuildable cache, never Project data.
          try { storage.removeItem("devConsoleLastInput"); } catch (_) {}
        }
        if (attempt === 2) {
          reclaimedKeys = reclaimedKeys.concat(pruneRollbackSnapshotsForCapacity(storageKey, 0));
          try { storage.removeItem("devConsoleHistory"); } catch (_) {}
        }
        storage.setItem(storageKey, raw);
        const storedRaw = storage.getItem(storageKey);
        const stored = storedRaw ? JSON.parse(storedRaw) : null;
        const verification = verifyRollbackSnapshotPayload(stored, transaction);
        if (!verification.verified) throw new Error(verification.reason || "Rollback Snapshot read-back verification failed.");

        transaction.rollbackSnapshot.storageKey = storageKey;
        transaction.rollbackSnapshot.persisted = true;
        transaction.rollbackSnapshot.persistenceMode = payload.mode;
        transaction.rollbackSnapshot.schemaVersion = payload.schemaVersion;
        transaction.rollbackSnapshot.verifiedAt = stored.verifiedAt || payload.verifiedAt;
        transaction.rollbackSnapshot.estimatedBytes = raw.length * 2;
        pruneRollbackSnapshots(storageKey);
        return {
          persisted: true,
          verified: true,
          storageKey: storageKey,
          mode: payload.mode,
          schemaVersion: payload.schemaVersion,
          sourceHash: payload.sourceHash || payload.beforeFunctionHash,
          estimatedBytes: raw.length * 2,
          reclaimedKeys: Array.from(new Set(reclaimedKeys)),
          verifiedAt: transaction.rollbackSnapshot.verifiedAt
        };
      } catch (error) {
        lastError = error && error.message ? error.message : String(error);
        if (!isQuotaError(error) && attempt === 0) break;
      }
    }
    return {
      persisted: false,
      verified: false,
      storageKey: storageKey,
      mode: payload.mode,
      schemaVersion: payload.schemaVersion,
      estimatedBytes: raw.length * 2,
      reclaimedKeys: Array.from(new Set(reclaimedKeys)),
      quotaError: /quota|storage.*full|exceeded/i.test(lastError),
      reason: lastError || "Rollback Snapshot persistence failed."
    };
  }

  function removeRollbackSnapshot(storageKey) {
    const storage = getStorage();
    if (!storage || !storageKey) return false;
    try {
      storage.removeItem(storageKey);
      return storage.getItem(storageKey) === null;
    } catch (_) { return false; }
  }


  function listTransactionJournalRecords() {
    const records = [];
    const storage = getStorage();
    if (!storage) return records;
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || key.indexOf(TRANSACTION_JOURNAL_PREFIX) !== 0) continue;
        const raw = storage.getItem(key);
        const payload = raw ? JSON.parse(raw) : null;
        records.push({
          key: key,
          transactionId: text(payload && payload.transactionId, ""),
          status: text(payload && payload.status, ""),
          updatedAt: text(payload && payload.updatedAt, payload && payload.startedAt)
        });
      }
    } catch (_) {}
    records.sort(function order(left, right) {
      return String(left.updatedAt || "").localeCompare(String(right.updatedAt || ""));
    });
    return records;
  }

  function pruneTransactionJournals(protectedKey, keepCount) {
    const storage = getStorage();
    if (!storage) return [];
    const keep = Math.max(0, Number(keepCount) || (TRANSACTION_JOURNAL_LIMIT - 1));
    const records = listTransactionJournalRecords().filter(function keepItem(item) { return item.key !== protectedKey; });
    const removeCount = Math.max(0, records.length - keep);
    const removed = [];
    for (let index = 0; index < removeCount; index += 1) {
      try {
        storage.removeItem(records[index].key);
        removed.push(records[index].key);
      } catch (_) {}
    }
    return removed;
  }

  function buildTransactionJournalPayload(transaction, snapshotPersistence) {
    return {
      schemaVersion: 1,
      componentId: COMPONENT_ID,
      version: VERSION,
      transactionId: transaction.id,
      requestId: transaction.requestId,
      candidateId: transaction.candidateId,
      approvalId: transaction.approvalId,
      status: text(transaction.status, "Applying"),
      targetFile: transaction.targetFile,
      targetFunction: transaction.targetFunction,
      beforeFileHash: transaction.beforeFileHash,
      afterFileHash: transaction.afterFileHash,
      beforeFunctionHash: text(transaction.rollbackSnapshot && transaction.rollbackSnapshot.beforeFunctionHash, ""),
      afterFunctionHash: text(transaction.rollbackSnapshot && transaction.rollbackSnapshot.afterFunctionHash, ""),
      rollbackSnapshot: {
        storageKey: text(snapshotPersistence && snapshotPersistence.storageKey, ""),
        mode: text(snapshotPersistence && snapshotPersistence.mode, ""),
        schemaVersion: finite(snapshotPersistence && snapshotPersistence.schemaVersion, 0),
        sourceHash: text(snapshotPersistence && snapshotPersistence.sourceHash, "")
      },
      startedAt: text(transaction.startedAt, nowIso()),
      updatedAt: nowIso()
    };
  }

  function verifyTransactionJournalPayload(stored, transaction, snapshotPersistence) {
    const verified = Boolean(
      stored &&
      stored.transactionId === transaction.id &&
      stored.candidateId === transaction.candidateId &&
      stored.targetFile === transaction.targetFile &&
      stored.targetFunction === transaction.targetFunction &&
      stored.beforeFileHash === transaction.beforeFileHash &&
      stored.afterFileHash === transaction.afterFileHash &&
      stored.rollbackSnapshot &&
      stored.rollbackSnapshot.storageKey === text(snapshotPersistence && snapshotPersistence.storageKey, "")
    );
    return { verified: verified, reason: verified ? "" : "Transaction Journal read-back verification failed." };
  }

  function persistTransactionJournal(transaction, snapshotPersistence) {
    const storage = getStorage();
    if (!storage) return { persisted: false, verified: false, reason: "Storage is unavailable." };
    const storageKey = TRANSACTION_JOURNAL_PREFIX + transaction.id;
    const payload = buildTransactionJournalPayload(transaction, snapshotPersistence);
    const raw = JSON.stringify(payload);
    let lastError = "";
    let reclaimedKeys = [];
    pruneTransactionJournals(storageKey, TRANSACTION_JOURNAL_LIMIT - 1);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (attempt === 1) {
          reclaimedKeys = reclaimedKeys.concat(pruneTransactionJournals(storageKey, 2));
          try { storage.removeItem("devConsoleLastInput"); } catch (_) {}
        }
        if (attempt === 2) {
          reclaimedKeys = reclaimedKeys.concat(pruneTransactionJournals(storageKey, 0));
          try { storage.removeItem("devConsoleHistory"); } catch (_) {}
        }
        storage.setItem(storageKey, raw);
        const storedRaw = storage.getItem(storageKey);
        const stored = storedRaw ? JSON.parse(storedRaw) : null;
        const verification = verifyTransactionJournalPayload(stored, transaction, snapshotPersistence);
        if (!verification.verified) throw new Error(verification.reason);
        transaction.transactionJournal = {
          storageKey: storageKey,
          persisted: true,
          verifiedAt: nowIso(),
          estimatedBytes: raw.length * 2
        };
        return {
          persisted: true,
          verified: true,
          storageKey: storageKey,
          estimatedBytes: raw.length * 2,
          reclaimedKeys: Array.from(new Set(reclaimedKeys)),
          verifiedAt: transaction.transactionJournal.verifiedAt
        };
      } catch (error) {
        lastError = error && error.message ? error.message : String(error);
        if (!isQuotaError(error) && attempt === 0) break;
      }
    }
    return {
      persisted: false,
      verified: false,
      storageKey: storageKey,
      estimatedBytes: raw.length * 2,
      reclaimedKeys: Array.from(new Set(reclaimedKeys)),
      quotaError: /quota|storage.*full|exceeded/i.test(lastError),
      reason: lastError || "Transaction Journal persistence failed."
    };
  }

  function updateTransactionJournal(transactionId, updates) {
    const storage = getStorage();
    const storageKey = TRANSACTION_JOURNAL_PREFIX + String(transactionId || "");
    if (!storage || !transactionId) return { persisted: false, verified: false, reason: "Transaction Journal is unavailable." };
    try {
      const raw = storage.getItem(storageKey);
      const current = raw ? JSON.parse(raw) : null;
      if (!current || current.transactionId !== transactionId) return { persisted: false, verified: false, reason: "Transaction Journal record was not found." };
      const next = Object.assign({}, current, updates || {}, { updatedAt: nowIso() });
      storage.setItem(storageKey, JSON.stringify(next));
      const stored = JSON.parse(storage.getItem(storageKey));
      const verified = Boolean(stored && stored.transactionId === transactionId && stored.status === next.status);
      return { persisted: verified, verified: verified, storageKey: storageKey, status: stored && stored.status, reason: verified ? "" : "Transaction Journal update verification failed." };
    } catch (error) {
      return { persisted: false, verified: false, storageKey: storageKey, reason: error && error.message ? error.message : String(error) };
    }
  }

  function getAutoRefactoringTransactionJournal(transactionId) {
    const storage = getStorage();
    if (!storage || !transactionId) return null;
    try {
      const raw = storage.getItem(TRANSACTION_JOURNAL_PREFIX + String(transactionId));
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function resolveTransactionRecord(transactionId) {
    const current = getTransactionRecord(transactionId);
    if (current) return current;
    const journal = getAutoRefactoringTransactionJournal(transactionId);
    if (!journal) return null;
    const snapshotKey = text(journal.rollbackSnapshot && journal.rollbackSnapshot.storageKey, "");
    const storage = getStorage();
    let snapshot = null;
    try {
      const raw = storage && snapshotKey ? storage.getItem(snapshotKey) : null;
      snapshot = raw ? JSON.parse(raw) : null;
    } catch (_) {}
    return {
      id: journal.transactionId,
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: journal.requestId,
      candidateId: journal.candidateId,
      approvalId: journal.approvalId,
      status: journal.status,
      targetFile: journal.targetFile,
      targetFunction: journal.targetFunction,
      beforeFileHash: journal.beforeFileHash,
      afterFileHash: journal.afterFileHash,
      rollbackStatus: "Available",
      rollbackSnapshot: snapshot && (snapshot.mode === "Function-Level" || snapshot.schemaVersion === 2)
        ? {
            mode: "Function-Level",
            storageKey: snapshotKey,
            beforeFunctionSource: snapshot.beforeFunctionSource,
            beforeFunctionHash: snapshot.beforeFunctionHash,
            afterFunctionHash: snapshot.afterFunctionHash,
            beforeFileHash: snapshot.beforeFileHash,
            afterFileHash: snapshot.afterFileHash,
            persisted: true
          }
        : snapshot && typeof snapshot.source === "string"
          ? { mode: "Full-File", storageKey: snapshotKey, source: snapshot.source, sourceHash: snapshot.sourceHash, persisted: true }
          : null,
      transactionJournal: { storageKey: TRANSACTION_JOURNAL_PREFIX + journal.transactionId, persisted: true },
      startedAt: journal.startedAt,
      committedAt: journal.committedAt || ""
    };
  }

  function verifyPersistedTransaction(transaction) {
    const storage = getStorage();
    if (!transaction || !storage) return { verified: false, reason: "Transaction persistence cannot be verified." };
    try {
      const coreRaw = storage.getItem(internal.STORAGE_KEY);
      const core = coreRaw ? JSON.parse(coreRaw) : null;
      const compact = core && Array.isArray(core.transactions)
        ? core.transactions.find(function find(item) { return item && item.id === transaction.id; })
        : null;
      if (!compact || !compact.artifactKey) return { verified: false, reason: "Compact Transaction record is unavailable." };
      const artifactRaw = storage.getItem(compact.artifactKey);
      const artifact = artifactRaw ? JSON.parse(artifactRaw) : null;
      if (!artifact || artifact.id !== transaction.id) return { verified: false, reason: "Transaction Artifact read-back failed." };
      const snapshotKey = text(artifact.rollbackSnapshot && artifact.rollbackSnapshot.storageKey, "");
      if (!snapshotKey || snapshotKey !== text(transaction.rollbackSnapshot && transaction.rollbackSnapshot.storageKey, "")) {
        return { verified: false, reason: "Transaction Artifact does not reference the persisted Rollback Snapshot." };
      }
      const snapshotRaw = storage.getItem(snapshotKey);
      const snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : null;
      const verification = verifyRollbackSnapshotPayload(snapshot, transaction);
      if (!verification.verified) return { verified: false, reason: verification.reason || "Rollback Snapshot read-back failed." };
      return {
        verified: true,
        artifactKey: compact.artifactKey,
        snapshotKey: snapshotKey,
        snapshotMode: snapshot.mode || (snapshot.schemaVersion === 2 ? "Function-Level" : "Full-File")
      };
    } catch (error) {
      return { verified: false, reason: error && error.message ? error.message : String(error) };
    }
  }

  function resolveRepositoryAdapter(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (settings.adapter && typeof settings.adapter.getFileText === "function" && typeof settings.adapter.setFileText === "function") return settings.adapter;
    if (typeof global.getProjectFile === "function" && typeof global.updateProjectFile === "function") {
      return {
        name: "Current Project File Store",
        getFileText: function get(fileName) {
          const file = global.getProjectFile(fileName);
          if (!file) return null;
          return String(file.code || file.text || file.content || file.value || "");
        },
        setFileText: function set(fileName, value) { return global.updateProjectFile(fileName, value) === true; }
      };
    }
    return null;
  }

  function compileJavaScript(source, fileName) {
    try {
      Function(String(source || "") + "\n//# sourceURL=" + String(fileName || "IDE-150-sandbox.js"));
      return { valid: true, error: "" };
    } catch (error) {
      return { valid: false, error: error && error.message ? error.message : String(error) };
    }
  }

  function buildVirtualFile(candidate, adapter) {
    const fileSource = adapter.getFileText(candidate.targetFile);
    if (typeof fileSource !== "string") return { valid: false, reason: "Target file is unavailable in the Repository Adapter." };
    const currentBlock = findFunctionBlock(fileSource, candidate.targetFunction);
    if (!currentBlock) return { valid: false, reason: "Target function is unavailable in the current Repository source." };
    if (countFunctionDefinitions(fileSource, candidate.targetFunction) !== 1) return { valid: false, reason: "Target function definition is ambiguous in the current Repository source." };
    const currentFunction = currentBlock.block.trim();
    if (hashText(currentFunction) !== candidate.beforeHash || currentFunction !== candidate.beforeFunctionSource) {
      return { valid: false, reason: "Concurrent Change detected: current function no longer matches Candidate beforeSource.", currentHash: hashText(currentFunction), expectedHash: candidate.beforeHash };
    }
    if (fileSource.length > DEFAULT_BUDGET.fileSourceCharLimit) return { valid: false, reason: "Target file exceeds the Core Phase 1 source-size budget." };
    const virtualSource = fileSource.slice(0, currentBlock.start) + candidate.afterFunctionSource + fileSource.slice(currentBlock.end);
    return {
      valid: true,
      fileSource: fileSource,
      virtualSource: virtualSource,
      currentBlock: currentBlock,
      beforeFileHash: hashText(fileSource),
      afterFileHash: hashText(virtualSource)
    };
  }

  function runAutoRefactoringSandbox(candidateId, options) {
    const candidate = getCandidateRecord(candidateId);
    if (!candidate) return { passed: false, reason: "Refactoring Candidate not found." };
    if (candidate.governanceMode === "Core Phase 2") {
      if (candidate.dependencyAnalysisStatus !== "Passed") return { passed: false, reason: "Passed Full Dependency Analysis is required." };
      if (candidate.externalPolicyStatus !== "Allowed") return { passed: false, reason: "Allowed external Policy Decision is required." };
      if (candidate.patchStatus !== "Verified") return { passed: false, reason: "Verified Governed Patch is required." };
    }
    const adapter = resolveRepositoryAdapter(options);
    if (!adapter) return { passed: false, reason: "Repository Adapter is unavailable." };
    const virtual = buildVirtualFile(candidate, adapter);
    const checks = [];
    const check = function add(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); };
    check("Repository source resolved", virtual.valid === true, virtual.reason);
    if (virtual.valid) {
      check("Concurrent Change guard", virtual.beforeFileHash !== "" && virtual.beforeFileHash !== virtual.afterFileHash);
      const syntax = compileJavaScript(virtual.virtualSource, candidate.targetFile);
      check("JavaScript syntax", syntax.valid, syntax.error);
      const afterBlock = findFunctionBlock(virtual.virtualSource, candidate.targetFunction);
      check("Target function present after patch", Boolean(afterBlock));
      check("Target function identity preserved", Boolean(afterBlock) && hashText(afterBlock.block.trim()) === candidate.afterHash);
      check("Single function definition preserved", countFunctionDefinitions(virtual.virtualSource, candidate.targetFunction) === 1);
      if (options && typeof options.validator === "function") {
        try {
          const custom = options.validator({ candidate: clone(candidate), beforeFileSource: virtual.fileSource, virtualFileSource: virtual.virtualSource });
          check("Custom Sandbox Validator", custom === true || Boolean(custom && custom.valid === true), custom && (custom.reason || custom.error));
        } catch (error) {
          check("Custom Sandbox Validator", false, error && error.message ? error.message : String(error));
        }
      }
    }
    const passedCount = checks.filter(function pass(item) { return item.passed; }).length;
    const passed = checks.length > 0 && passedCount === checks.length;
    const validation = {
      id: nextId("IDE-150-VALIDATION"),
      componentId: COMPONENT_ID,
      version: VERSION,
      type: "Sandbox",
      candidateId: candidate.id,
      requestId: candidate.requestId,
      passed: passed,
      status: passed ? "Passed" : "Failed",
      health: checks.length ? Math.round((passedCount / checks.length) * 100) : 0,
      passedChecks: passedCount,
      failedChecks: checks.length - passedCount,
      totalChecks: checks.length,
      beforeFileHash: virtual.beforeFileHash || "",
      afterFileHash: virtual.afterFileHash || "",
      checks: checks,
      validatedAt: nowIso()
    };
    state.validations.set(validation.id, validation);
    trimMap(state.validations, MAX_RECORDS);
    candidate.sandboxStatus = passed ? "Passed" : "Failed";
    candidate.sandboxValidationId = validation.id;
    candidate.status = passed ? "Awaiting Approval" : "Blocked";
    candidate.updatedAt = nowIso();
    state.candidates.set(candidate.id, candidate);
    const request = state.requests.get(candidate.requestId);
    if (request) {
      request.status = passed ? "Awaiting Approval" : "Blocked";
      request.updatedAt = nowIso();
      state.requests.set(request.id, request);
    }
    recordEvent("Sandbox Validation", { requestId: candidate.requestId, candidateId: candidate.id, validationId: validation.id, passed: passed });
    persistAutoRefactoringState();
    return { passed: passed, validation: clone(validation), virtualSummary: virtual.valid ? { targetFile: candidate.targetFile, targetFunction: candidate.targetFunction, beforeFileHash: virtual.beforeFileHash, afterFileHash: virtual.afterFileHash } : null };
  }

  function approveAutoRefactoringCandidate(candidateId, input) {
    const candidate = getCandidateRecord(candidateId);
    if (!candidate) return { approved: false, reason: "Refactoring Candidate not found." };
    if (candidate.sandboxStatus !== "Passed") return { approved: false, reason: "Sandbox Validation must pass before Approval." };
    const source = input && typeof input === "object" ? input : {};
    if (source.approved !== true) return { approved: false, reason: "Explicit approved:true is required." };
    const actor = text(source.actor, "");
    const reason = text(source.reason, "");
    if (!actor || !reason) return { approved: false, reason: "Approval actor and reason are required." };
    const approval = {
      id: nextId("IDE-150-APPROVAL"),
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: candidate.requestId,
      candidateId: candidate.id,
      status: "Approved",
      approved: true,
      actor: actor,
      reason: reason,
      riskLevel: candidate.riskLevel,
      candidateHash: candidate.afterHash,
      approvedAt: nowIso()
    };
    state.approvals.set(approval.id, approval);
    trimMap(state.approvals, MAX_RECORDS);
    candidate.approvalStatus = "Approved";
    candidate.approvalId = approval.id;
    candidate.status = "Approved";
    candidate.updatedAt = nowIso();
    state.candidates.set(candidate.id, candidate);
    const request = state.requests.get(candidate.requestId);
    if (request) { request.status = "Approved"; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
    recordEvent("Candidate Approved", { requestId: candidate.requestId, candidateId: candidate.id, approvalId: approval.id, actor: actor });
    persistAutoRefactoringState();
    return { approved: true, approval: clone(approval), candidate: compactCandidate(candidate) };
  }

  function createChangeReport(transaction, candidate, validation, rollback) {
    const report = {
      id: nextId("IDE-150-CHANGE-REPORT"),
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: candidate.requestId,
      planId: candidate.planId,
      candidateId: candidate.id,
      transactionId: transaction.id,
      status: rollback ? "Rolled Back" : transaction.status,
      targetFile: candidate.targetFile,
      targetFunction: candidate.targetFunction,
      operation: candidate.operation,
      riskLevel: candidate.riskLevel,
      diffSummary: {
        addedLines: candidate.diff.addedLineCount,
        removedLines: candidate.diff.removedLineCount,
        changedLines: candidate.diff.changedLines,
        truncated: candidate.diff.truncated === true
      },
      validationSummary: validation ? { id: validation.id, type: validation.type, passed: validation.passed, health: validation.health } : null,
      rollbackSummary: rollback ? { id: rollback.id, status: rollback.status, verified: rollback.verified === true } : null,
      governance: {
        mode: candidate.governanceMode || "Core Phase 1",
        dependencyAnalysisId: candidate.dependencyAnalysisId || "",
        policyDecisionId: candidate.externalPolicyDecisionId || "",
        patchId: candidate.patchId || "",
        patchStatus: candidate.patchStatus || "Not Required"
      },
      traceability: clone(candidate.traceability),
      beforeFunctionHash: candidate.beforeHash,
      afterFunctionHash: candidate.afterHash,
      beforeFileHash: transaction.beforeFileHash,
      afterFileHash: transaction.afterFileHash,
      generatedAt: nowIso()
    };
    state.reports.set(report.id, report);
    trimMap(state.reports, MAX_RECORDS);
    return report;
  }

  function buildImplementationPackage(transaction, candidate, validation, report) {
    const implementationPackage = {
      id: nextId("IDE-150-IMPLEMENTATION-PACKAGE"),
      componentId: COMPONENT_ID,
      version: VERSION,
      status: transaction.status === "Committed" ? "Completed" : transaction.status,
      requestId: candidate.requestId,
      planId: candidate.planId,
      candidateId: candidate.id,
      transactionId: transaction.id,
      reportId: report.id,
      validationId: validation && validation.id,
      targetFile: candidate.targetFile,
      targetFunction: candidate.targetFunction,
      patchPackage: {
        operation: candidate.operation,
        beforeFunctionHash: candidate.beforeHash,
        afterFunctionHash: candidate.afterHash,
        diffSummary: clone(report.diffSummary)
      },
      repositorySnapshot: {
        beforeFileHash: transaction.beforeFileHash,
        afterFileHash: transaction.afterFileHash,
        rollbackAvailable: Boolean(transaction.rollbackSnapshot && transaction.rollbackSnapshot.source)
      },
      approvalId: candidate.approvalId,
      governance: {
        mode: candidate.governanceMode || "Core Phase 1",
        dependencyAnalysisId: candidate.dependencyAnalysisId || "",
        policyDecisionId: candidate.externalPolicyDecisionId || "",
        patchId: candidate.patchId || "",
        patchVerified: candidate.patchStatus === "Verified"
      },
      traceability: clone(candidate.traceability),
      safety: {
        evidenceFirst: true,
        transactionFirst: true,
        rollbackAlways: true,
        explicitApprovalPresent: true,
        recommendationAutoApply: false,
        rootCauseAuthority: "IDE-130",
        sourceMutatedOutsideScope: false
      },
      generatedAt: nowIso()
    };
    state.packages.set(implementationPackage.id, implementationPackage);
    trimMap(state.packages, MAX_RECORDS);
    return implementationPackage;
  }

  function applyAutoRefactoringCandidate(candidateId, options) {
    const candidate = getCandidateRecord(candidateId);
    if (!candidate) return { applied: false, reason: "Refactoring Candidate not found." };
    if (candidate.governanceMode === "Core Phase 2") {
      if (candidate.dependencyAnalysisStatus !== "Passed") return { applied: false, reason: "Passed Full Dependency Analysis is required." };
      if (candidate.externalPolicyStatus !== "Allowed") return { applied: false, reason: "Allowed external Policy Decision is required." };
      if (candidate.patchStatus !== "Verified") return { applied: false, reason: "Verified Governed Patch is required." };
    }
    if (candidate.sandboxStatus !== "Passed") return { applied: false, reason: "Sandbox Validation has not passed." };
    if (candidate.approvalStatus !== "Approved" || !candidate.approvalId) return { applied: false, reason: "Explicit Approval is required." };
    const adapter = resolveRepositoryAdapter(options);
    if (!adapter) return { applied: false, reason: "Repository Adapter is unavailable." };
    const virtual = buildVirtualFile(candidate, adapter);
    if (!virtual.valid) return { applied: false, reason: virtual.reason, details: virtual };
    const transaction = {
      id: nextId("IDE-150-TRANSACTION"),
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: candidate.requestId,
      candidateId: candidate.id,
      approvalId: candidate.approvalId,
      status: "Applying",
      targetFile: candidate.targetFile,
      targetFunction: candidate.targetFunction,
      beforeFileHash: virtual.beforeFileHash,
      afterFileHash: virtual.afterFileHash,
      rollbackStatus: "Available",
      rollbackSnapshot: {
        id: nextId("IDE-150-SNAPSHOT"),
        mode: "Function-Level",
        targetFile: candidate.targetFile,
        targetFunction: candidate.targetFunction,
        beforeFunctionSource: candidate.beforeFunctionSource,
        beforeFunctionHash: candidate.beforeHash,
        afterFunctionHash: candidate.afterHash,
        beforeFileHash: virtual.beforeFileHash,
        afterFileHash: virtual.afterFileHash,
        capturedAt: nowIso()
      },
      startedAt: nowIso(),
      committedAt: ""
    };
    state.transactions.set(transaction.id, transaction);
    trimMap(state.transactions, MAX_ROLLBACK_SNAPSHOTS);
    const request = state.requests.get(candidate.requestId);
    if (request) { request.status = "Applying"; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
    recordEvent("Transaction Started", { requestId: candidate.requestId, candidateId: candidate.id, transactionId: transaction.id });

    const rollbackSnapshotPersistence = persistRollbackSnapshot(transaction);
    if (!rollbackSnapshotPersistence.persisted || rollbackSnapshotPersistence.verified !== true) {
      state.transactions.delete(transaction.id);
      if (request) { request.status = "Approved"; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
      recordEvent("Transaction Blocked", { requestId: candidate.requestId, candidateId: candidate.id, reason: "Dedicated Rollback Snapshot persistence failed." });
      persistAutoRefactoringState();
      return {
        applied: false,
        reason: "Rollback Snapshot must be persisted and verified before Repository modification.",
        rollbackSnapshotPersistence: rollbackSnapshotPersistence
      };
    }

    state.transactions.set(transaction.id, transaction);
    const transactionJournalPersistence = persistTransactionJournal(transaction, rollbackSnapshotPersistence);
    if (!transactionJournalPersistence.persisted || transactionJournalPersistence.verified !== true) {
      state.transactions.delete(transaction.id);
      removeRollbackSnapshot(rollbackSnapshotPersistence.storageKey);
      if (request) { request.status = "Approved"; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
      recordEvent("Transaction Blocked", { requestId: candidate.requestId, candidateId: candidate.id, reason: "Dedicated Transaction Journal persistence failed." });
      persistAutoRefactoringState();
      return {
        applied: false,
        reason: "Rollback Snapshot and Transaction Journal must be persisted and verified before Repository modification.",
        rollbackSnapshotPersistence: rollbackSnapshotPersistence,
        transactionJournalPersistence: transactionJournalPersistence,
        persistenceVerification: { verified: false, reason: transactionJournalPersistence.reason }
      };
    }

    // The dedicated Snapshot + Transaction Journal are the authoritative pre-write safety evidence.
    // Full Core persistence is best-effort here because it may be much larger than the journal.
    const preWriteCorePersistence = persistAutoRefactoringState();
    const persistenceVerification = {
      verified: true,
      mode: "Dedicated Snapshot + Transaction Journal",
      snapshotKey: rollbackSnapshotPersistence.storageKey,
      journalKey: transactionJournalPersistence.storageKey,
      corePersistence: preWriteCorePersistence
    };

    let writeSucceeded = false;
    try {
      writeSucceeded = adapter.setFileText(candidate.targetFile, virtual.virtualSource) === true;
      if (!writeSucceeded) throw new Error("Repository Adapter rejected the write.");
      const written = adapter.getFileText(candidate.targetFile);
      if (typeof written !== "string" || hashText(written) !== virtual.afterFileHash) throw new Error("Repository write verification failed.");
      const syntax = compileJavaScript(written, candidate.targetFile);
      if (!syntax.valid) throw new Error("Post-write JavaScript validation failed: " + syntax.error);
      const block = findFunctionBlock(written, candidate.targetFunction);
      if (!block || hashText(block.block.trim()) !== candidate.afterHash) throw new Error("Post-write function identity validation failed.");
      const validation = {
        id: nextId("IDE-150-VALIDATION"),
        componentId: COMPONENT_ID,
        version: VERSION,
        type: "Post-Write Repository Validation",
        requestId: candidate.requestId,
        candidateId: candidate.id,
        transactionId: transaction.id,
        passed: true,
        status: "Passed",
        health: 100,
        passedChecks: 4,
        failedChecks: 0,
        totalChecks: 4,
        checks: [
          { name: "Repository write", passed: true },
          { name: "File hash", passed: true, detail: virtual.afterFileHash },
          { name: "JavaScript syntax", passed: true },
          { name: "Function identity", passed: true, detail: candidate.afterHash }
        ],
        validatedAt: nowIso()
      };
      state.validations.set(validation.id, validation);
      trimMap(state.validations, MAX_RECORDS);
      transaction.status = "Committed";
      transaction.validationId = validation.id;
      transaction.committedAt = nowIso();
      state.transactions.set(transaction.id, transaction);
      candidate.status = "Committed";
      candidate.transactionId = transaction.id;
      candidate.updatedAt = nowIso();
      state.candidates.set(candidate.id, candidate);
      if (request) { request.status = "Committed"; request.transactionId = transaction.id; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
      const report = createChangeReport(transaction, candidate, validation, null);
      const implementationPackage = buildImplementationPackage(transaction, candidate, validation, report);
      recordEvent("Transaction Committed", { requestId: candidate.requestId, candidateId: candidate.id, transactionId: transaction.id, reportId: report.id, packageId: implementationPackage.id });
      const transactionJournalPersistenceAfterCommit = updateTransactionJournal(transaction.id, {
        status: "Committed",
        validationId: validation.id,
        reportId: report.id,
        implementationPackageId: implementationPackage.id,
        committedAt: transaction.committedAt
      });
      const persistence = persistAutoRefactoringState();
      return {
        applied: true,
        transaction: compactTransaction(transaction),
        validation: clone(validation),
        report: clone(report),
        implementationPackage: clone(implementationPackage),
        rollbackSnapshotPersistence: rollbackSnapshotPersistence,
        transactionJournalPersistence: transactionJournalPersistenceAfterCommit,
        persistenceVerification: persistenceVerification,
        persistence: persistence
      };
    } catch (error) {
      let restored = false;
      if (writeSucceeded) {
        try { restored = adapter.setFileText(candidate.targetFile, virtual.fileSource) === true && hashText(adapter.getFileText(candidate.targetFile)) === virtual.beforeFileHash; }
        catch (_) { restored = false; }
      }
      transaction.status = restored ? "Rolled Back After Failure" : "Manual Recovery Required";
      transaction.rollbackStatus = restored ? "Verified" : "Failed";
      transaction.error = error && error.message ? error.message : String(error);
      transaction.failedAt = nowIso();
      state.transactions.set(transaction.id, transaction);
      candidate.status = restored ? "Rolled Back" : "Failed";
      candidate.updatedAt = nowIso();
      state.candidates.set(candidate.id, candidate);
      if (request) { request.status = restored ? "Rolled Back" : "Failed"; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
      state.lastError = { operation: "Apply", message: transaction.error, transactionId: transaction.id, at: nowIso() };
      recordEvent("Transaction Failed", { requestId: candidate.requestId, candidateId: candidate.id, transactionId: transaction.id, restored: restored, error: transaction.error });
      const transactionJournalFailure = updateTransactionJournal(transaction.id, {
        status: transaction.status,
        rollbackStatus: transaction.rollbackStatus,
        error: transaction.error,
        failedAt: transaction.failedAt
      });
      persistAutoRefactoringState();
      return { applied: false, reason: transaction.error, restored: restored, transaction: compactTransaction(transaction), transactionJournalPersistence: transactionJournalFailure };
    }
  }

  function rollbackAutoRefactoringTransaction(transactionId, input, options) {
    const transaction = resolveTransactionRecord(transactionId);
    if (!transaction) return { rolledBack: false, reason: "Transaction not found." };
    if (!transaction.rollbackSnapshot) return { rolledBack: false, reason: "Rollback Snapshot is unavailable." };
    const source = input && typeof input === "object" ? input : {};
    const actor = text(source.actor, "");
    const reason = text(source.reason, "");
    if (!actor || !reason) return { rolledBack: false, reason: "Rollback actor and reason are required." };
    const adapter = resolveRepositoryAdapter(options);
    if (!adapter) return { rolledBack: false, reason: "Repository Adapter is unavailable." };
    const currentSource = adapter.getFileText(transaction.targetFile);
    if (typeof currentSource !== "string") return { rolledBack: false, reason: "Current Repository source is unavailable." };
    if (hashText(currentSource) !== transaction.afterFileHash && source.force !== true) {
      return { rolledBack: false, reason: "Concurrent Change detected after Commit. force:true and explicit review are required." };
    }
    let rollbackSource = "";
    const snapshot = transaction.rollbackSnapshot;
    if (typeof snapshot.source === "string" && snapshot.source.length > 0) {
      rollbackSource = snapshot.source;
    } else if (typeof snapshot.beforeFunctionSource === "string" && snapshot.beforeFunctionSource.length > 0) {
      const currentBlock = findFunctionBlock(currentSource, transaction.targetFunction);
      if (!currentBlock) return { rolledBack: false, reason: "Current target function is unavailable for function-level Rollback." };
      const currentFunctionHash = hashText(currentBlock.block.trim());
      const expectedAfterHash = text(snapshot.afterFunctionHash, "");
      if (expectedAfterHash && currentFunctionHash !== expectedAfterHash && source.force !== true) {
        return { rolledBack: false, reason: "Concurrent Change detected in target function after Commit." };
      }
      rollbackSource = currentSource.slice(0, currentBlock.start) + snapshot.beforeFunctionSource + currentSource.slice(currentBlock.end);
    } else {
      return { rolledBack: false, reason: "Rollback Snapshot content is unavailable." };
    }
    const reconstructedHash = hashText(rollbackSource);
    if (reconstructedHash !== transaction.beforeFileHash && source.force !== true) {
      return { rolledBack: false, reason: "Function-level Rollback reconstruction Hash verification failed." };
    }
    const written = adapter.setFileText(transaction.targetFile, rollbackSource) === true;
    const restoredSource = written ? adapter.getFileText(transaction.targetFile) : null;
    const verified = typeof restoredSource === "string" && hashText(restoredSource) === transaction.beforeFileHash;
    const rollback = {
      id: nextId("IDE-150-ROLLBACK"),
      componentId: COMPONENT_ID,
      version: VERSION,
      requestId: transaction.requestId,
      candidateId: transaction.candidateId,
      transactionId: transaction.id,
      status: verified ? "Completed" : "Failed",
      verified: verified,
      actor: actor,
      reason: reason,
      restoredFileHash: verified ? transaction.beforeFileHash : hashText(restoredSource || ""),
      rolledBackAt: nowIso()
    };
    state.rollbacks.set(rollback.id, rollback);
    trimMap(state.rollbacks, MAX_ROLLBACK_SNAPSHOTS);
    transaction.rollbackStatus = verified ? "Verified" : "Failed";
    transaction.rollbackId = rollback.id;
    transaction.status = verified ? "Rolled Back" : "Manual Recovery Required";
    state.transactions.set(transaction.id, transaction);
    const candidate = state.candidates.get(transaction.candidateId);
    if (candidate) { candidate.status = verified ? "Rolled Back" : "Failed"; candidate.updatedAt = nowIso(); state.candidates.set(candidate.id, candidate); }
    const request = state.requests.get(transaction.requestId);
    if (request) { request.status = verified ? "Rolled Back" : "Failed"; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
    const validation = transaction.validationId ? state.validations.get(transaction.validationId) : null;
    if (candidate) createChangeReport(transaction, candidate, validation, rollback);
    recordEvent("Rollback", { requestId: transaction.requestId, candidateId: transaction.candidateId, transactionId: transaction.id, rollbackId: rollback.id, verified: verified });
    const transactionJournalPersistence = updateTransactionJournal(transaction.id, {
      status: transaction.status,
      rollbackStatus: transaction.rollbackStatus,
      rollbackId: rollback.id,
      rollbackVerified: verified,
      rolledBackAt: rollback.rolledBackAt
    });
    persistAutoRefactoringState();
    return { rolledBack: verified, rollback: clone(rollback), transaction: compactTransaction(transaction), transactionJournalPersistence: transactionJournalPersistence };
  }

  function getAutoRefactoringRequest(id) { return clone(state.requests.get(String(id || "")) || null); }
  function getAutoRefactoringPlan(id) { return clone(state.plans.get(String(id || "")) || null); }
  function getAutoRefactoringCandidate(id) { return clone(getCandidateRecord(id)); }
  function getAutoRefactoringTransaction(id) { return clone(getTransactionRecord(id)); }
  function getAutoRefactoringImplementationPackage(id) { return clone(state.packages.get(String(id || "")) || null); }
  function getAutoRefactoringPreview(candidateId) {
    const candidate = getCandidateRecord(candidateId);
    if (!candidate) return null;
    return { candidate: compactCandidate(candidate), diff: clone(candidate.diff), policy: clone(candidate.policy), traceability: clone(candidate.traceability) };
  }

  function getAutoRefactoringRecords(options) {
    const settings = options && typeof options === "object" ? options : {};
    const limit = Math.max(1, Math.min(MAX_RECORDS, finite(settings.limit, 20)));
    return {
      requests: [...state.requests.values()].slice(-limit).map(compactRequest),
      plans: [...state.plans.values()].slice(-limit).map(compactPlan),
      candidates: [...state.candidates.values()].slice(-limit).map(compactCandidate),
      transactions: [...state.transactions.values()].slice(-limit).map(compactTransaction)
    };
  }


  const transactionApi = {
    getAutoRefactoringPreview: getAutoRefactoringPreview,
    runAutoRefactoringSandbox: runAutoRefactoringSandbox,
    approveAutoRefactoringCandidate: approveAutoRefactoringCandidate,
    applyAutoRefactoringCandidate: applyAutoRefactoringCandidate,
    rollbackAutoRefactoringTransaction: rollbackAutoRefactoringTransaction,
    getAutoRefactoringRequest: getAutoRefactoringRequest,
    getAutoRefactoringPlan: getAutoRefactoringPlan,
    getAutoRefactoringCandidate: getAutoRefactoringCandidate,
    getAutoRefactoringTransaction: getAutoRefactoringTransaction,
    getAutoRefactoringImplementationPackage: getAutoRefactoringImplementationPackage,
    getAutoRefactoringRecords: getAutoRefactoringRecords,
    getAutoRefactoringTransactionJournal: getAutoRefactoringTransactionJournal,
    listAutoRefactoringTransactionJournals: function listAutoRefactoringTransactionJournals() { return clone(listTransactionJournalRecords()); }
  };

  Object.keys(transactionApi).forEach(function expose(name) { global[name] = transactionApi[name]; });
  global.IDE150AutoRefactoring = Object.assign(global.IDE150AutoRefactoring || {}, transactionApi);
})(typeof window !== "undefined" ? window : globalThis);