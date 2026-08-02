/* ============================================================
   FILE: 13_auto_refactoring_transaction.js
   IDE-150 Auto Refactoring Transaction Extension
   Version: 1.2.0
   Status: Controlled Application Trial Completed
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
        targetFile: candidate.targetFile,
        source: virtual.fileSource,
        sourceHash: virtual.beforeFileHash,
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
    const snapshotPersistence = persistAutoRefactoringState();
    if (!snapshotPersistence.persisted || snapshotPersistence.transactionArtifactCount < 1) {
      state.transactions.delete(transaction.id);
      if (request) { request.status = "Approved"; request.updatedAt = nowIso(); state.requests.set(request.id, request); }
      recordEvent("Transaction Blocked", { requestId: candidate.requestId, candidateId: candidate.id, reason: "Rollback Snapshot persistence failed." });
      persistAutoRefactoringState();
      return { applied: false, reason: "Rollback Snapshot must be persisted before Repository modification.", persistence: snapshotPersistence };
    }

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
      const persistence = persistAutoRefactoringState();
      return { applied: true, transaction: compactTransaction(transaction), validation: clone(validation), report: clone(report), implementationPackage: clone(implementationPackage), persistence: persistence };
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
      persistAutoRefactoringState();
      return { applied: false, reason: transaction.error, restored: restored, transaction: compactTransaction(transaction) };
    }
  }

  function rollbackAutoRefactoringTransaction(transactionId, input, options) {
    const transaction = getTransactionRecord(transactionId);
    if (!transaction) return { rolledBack: false, reason: "Transaction not found." };
    if (!transaction.rollbackSnapshot || !transaction.rollbackSnapshot.source) return { rolledBack: false, reason: "Rollback Snapshot is unavailable." };
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
    const written = adapter.setFileText(transaction.targetFile, transaction.rollbackSnapshot.source) === true;
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
    persistAutoRefactoringState();
    return { rolledBack: verified, rollback: clone(rollback), transaction: compactTransaction(transaction) };
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
    getAutoRefactoringRecords: getAutoRefactoringRecords
  };

  Object.keys(transactionApi).forEach(function expose(name) { global[name] = transactionApi[name]; });
  global.IDE150AutoRefactoring = Object.assign(global.IDE150AutoRefactoring || {}, transactionApi);
})(typeof window !== "undefined" ? window : globalThis);