/* ============================================================
   FILE: 13_auto_refactoring_controlled_application.js
   IDE-150 Controlled Application Trial
   Version: 1.0.0
   Status: Controlled Application Trial
   ============================================================ */
(function (global) {
  "use strict";

  const internal = global.__IDE150AutoRefactoringInternal;
  if (!internal) throw new Error("IDE-150 Core must be loaded before Controlled Application.");

  const COMPONENT_ID = internal.COMPONENT_ID;
  const VERSION = internal.VERSION;
  const CONTROLLED_VERSION = "1.0.0";
  const STORAGE_KEY = "AI_PROMPT_OS_IDE150_CONTROLLED_APPLICATION_V1";
  const MAX_SESSIONS = 20;
  const nowIso = internal.nowIso;
  const clone = internal.clone;
  const text = internal.text;
  const finite = internal.finite;
  const hashText = internal.hashText;
  const findFunctionBlock = internal.findFunctionBlock;

  const sessions = new Map();
  let lastValidation = null;
  let loaded = false;

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function trimSessions() {
    while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
  }

  function compactSession(item) {
    if (!item) return null;
    return {
      id: item.id,
      componentId: COMPONENT_ID,
      version: VERSION,
      controlledVersion: CONTROLLED_VERSION,
      status: item.status,
      target: clone(item.target),
      candidateId: item.candidateId,
      patchId: item.patchId,
      approvalId: item.approvalId || "",
      approvalActor: item.approvalActor || "",
      transactionId: item.transactionId || "",
      rollbackId: item.rollbackId || "",
      beforeHash: item.beforeHash,
      afterHash: item.afterHash,
      approvalStatus: item.approvalStatus,
      executionStatus: item.executionStatus,
      rollbackStatus: item.rollbackStatus,
      postValidationStatus: item.postValidationStatus,
      trialRollbackRequired: true,
      persistentCommitAllowed: false,
      repositoryMutationExpected: item.status === "Approved" || item.status === "Executing Trial",
      writeCount: finite(item.writeCount, 0),
      sourceRestored: item.sourceRestored === true,
      challenge: item.challenge,
      executionChallenge: item.executionChallenge,
      diffSummary: clone(item.diffSummary),
      dependencySummary: clone(item.dependencySummary),
      policySummary: clone(item.policySummary),
      sandboxSummary: clone(item.sandboxSummary),
      preparedAt: item.preparedAt,
      approvedAt: item.approvedAt || "",
      executedAt: item.executedAt || "",
      completedAt: item.completedAt || "",
      lastError: item.lastError || ""
    };
  }

  function persistSessions() {
    if (!global.localStorage || typeof global.localStorage.setItem !== "function") {
      return { persisted: false, reason: "localStorage is unavailable." };
    }
    try {
      const payload = {
        schemaVersion: 1,
        componentId: COMPONENT_ID,
        version: VERSION,
        controlledVersion: CONTROLLED_VERSION,
        sessions: [...sessions.values()].slice(-MAX_SESSIONS).map(compactSession),
        updatedAt: nowIso()
      };
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return { persisted: true, storageKey: STORAGE_KEY, sessionCount: payload.sessions.length };
    } catch (error) {
      return { persisted: false, reason: error && error.message ? error.message : String(error) };
    }
  }

  function loadSessions() {
    if (loaded) return { loaded: true, sessionCount: sessions.size };
    loaded = true;
    if (!global.localStorage || typeof global.localStorage.getItem !== "function") return { loaded: false, reason: "localStorage is unavailable." };
    try {
      const payload = safeParse(global.localStorage.getItem(STORAGE_KEY), null);
      if (!payload || payload.schemaVersion !== 1) return { loaded: true, sessionCount: 0 };
      (Array.isArray(payload.sessions) ? payload.sessions : []).forEach(function restore(item) {
        if (item && item.id) sessions.set(String(item.id), Object.assign({}, item));
      });
      trimSessions();
      return { loaded: true, sessionCount: sessions.size };
    } catch (error) {
      return { loaded: false, reason: error && error.message ? error.message : String(error) };
    }
  }

  function resolveSources(options) {
    const settings = options && typeof options === "object" ? options : {};
    if (Array.isArray(settings.sources) && settings.sources.length) {
      return settings.sources.map(function normalize(item) {
        return {
          fileName: text(item && (item.fileName || item.name || item.path), "unknown"),
          code: String(item && (item.code || item.text || item.content) || "")
        };
      });
    }
    if (typeof global.getProjectAnalyzeSources === "function") {
      const sources = global.getProjectAnalyzeSources("currentProject");
      if (Array.isArray(sources)) return sources;
    }
    if (typeof global.getProjectFiles === "function") {
      const files = global.getProjectFiles();
      if (Array.isArray(files)) return files;
    }
    return [];
  }

  function getControlledProjectFileStoreStatus() {
    const available = typeof global.getProjectFile === "function" && typeof global.updateProjectFile === "function";
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      controlledVersion: CONTROLLED_VERSION,
      available: available,
      status: available ? "Ready" : "Unavailable",
      adapter: "Current Project Runtime File Store Adapter",
      targetScope: "One existing JavaScript function in one loaded Project file",
      readAfterWriteVerification: true,
      targetOnlyWriteGuard: true,
      rollbackSnapshotRequired: true,
      automaticTrialRollback: true,
      persistentCommitEnabled: false,
      zipFileMutation: false,
      physicalFileMutation: false
    };
  }

  function createTrackedAdapter(targetFile, options) {
    const settings = options && typeof options === "object" ? options : {};
    const supplied = settings.adapter;
    let base = null;
    if (supplied && typeof supplied.getFileText === "function" && typeof supplied.setFileText === "function") {
      base = supplied;
    } else if (typeof global.getProjectFile === "function" && typeof global.updateProjectFile === "function") {
      base = {
        name: "Current Project Runtime File Store Adapter",
        getFileText: function getFileText(fileName) {
          const file = global.getProjectFile(fileName);
          if (!file) return null;
          return String(file.code || file.text || file.content || file.value || "");
        },
        setFileText: function setFileText(fileName, value) {
          return global.updateProjectFile(fileName, value) === true;
        }
      };
    }
    if (!base) return null;

    const writes = [];
    return {
      name: text(base.name, "IDE-150 Controlled Application Adapter"),
      getFileText: function getFileText(fileName) { return base.getFileText(fileName); },
      setFileText: function setFileText(fileName, value) {
        if (String(fileName || "") !== String(targetFile || "")) return false;
        const before = base.getFileText(fileName);
        const accepted = base.setFileText(fileName, String(value)) === true;
        const after = accepted ? base.getFileText(fileName) : null;
        writes.push({
          fileName: String(fileName || ""),
          accepted: accepted,
          beforeHash: hashText(before || ""),
          requestedHash: hashText(String(value)),
          afterHash: hashText(after || ""),
          verified: accepted && typeof after === "string" && after === String(value),
          at: nowIso()
        });
        return accepted;
      },
      getWriteLog: function getWriteLog() { return clone(writes); },
      getWriteCount: function getWriteCount() { return writes.length; }
    };
  }

  function getSession(id) {
    loadSessions();
    return sessions.get(String(id || "")) || null;
  }

  function prepareControlledAutoRefactoringApplication(options) {
    loadSessions();
    const settings = options && typeof options === "object" ? options : {};
    if (typeof global.runPracticalAutoRefactoringDryRun !== "function") {
      return { prepared: false, status: "Blocked", reason: "Practical Governed Dry Run API is unavailable." };
    }
    const sources = resolveSources(settings);
    const dryRun = global.runPracticalAutoRefactoringDryRun(Object.assign({}, settings, { sources: sources }));
    if (!dryRun || dryRun.completed !== true) {
      return { prepared: false, status: dryRun && dryRun.status || "Blocked", reason: text(dryRun && dryRun.reason, "Practical Governed Dry Run failed."), dryRun: dryRun || null };
    }
    const patch = typeof global.getAutoRefactoringPatch === "function" ? global.getAutoRefactoringPatch(dryRun.patch && dryRun.patch.id) : null;
    if (!patch || !patch.candidateId) return { prepared: false, status: "Blocked", reason: "Verified Governed Patch detail is unavailable." };
    const candidate = typeof global.getAutoRefactoringCandidate === "function" ? global.getAutoRefactoringCandidate(patch.candidateId) : null;
    if (!candidate) return { prepared: false, status: "Blocked", reason: "Refactoring Candidate detail is unavailable." };
    if (candidate.sandboxStatus !== "Passed" || candidate.patchStatus !== "Verified") {
      return { prepared: false, status: "Blocked", reason: "Passed Sandbox and Verified Patch are required." };
    }

    const id = "IDE-150-CONTROLLED-APPLICATION-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000));
    const challenge = "APPROVE " + candidate.targetFile + "::" + candidate.targetFunction + " @" + candidate.afterHash;
    const executionChallenge = "EXECUTE-AND-ROLLBACK " + id;
    const session = {
      id: id,
      componentId: COMPONENT_ID,
      version: VERSION,
      controlledVersion: CONTROLLED_VERSION,
      status: "Awaiting Explicit Approval",
      target: { file: candidate.targetFile, function: candidate.targetFunction },
      candidateId: candidate.id,
      patchId: patch.id,
      beforeHash: candidate.beforeHash,
      afterHash: candidate.afterHash,
      beforeFileHash: dryRun.patch && dryRun.patch.beforeFileHash || "",
      approvalStatus: "Required",
      executionStatus: "Not Started",
      rollbackStatus: "Required",
      postValidationStatus: "Not Run",
      trialRollbackRequired: true,
      persistentCommitAllowed: false,
      challenge: challenge,
      executionChallenge: executionChallenge,
      diffSummary: {
        changedLines: finite(dryRun.diff && dryRun.diff.changedLines, 0),
        addedLines: finite(dryRun.diff && dryRun.diff.addedLineCount, 0),
        removedLines: finite(dryRun.diff && dryRun.diff.removedLineCount, 0),
        truncated: Boolean(dryRun.diff && dryRun.diff.truncated),
        text: text(dryRun.diff && dryRun.diff.text, "")
      },
      dependencySummary: {
        status: dryRun.dependencyImpact && dryRun.dependencyImpact.status,
        riskLevel: dryRun.dependencyImpact && dryRun.dependencyImpact.riskLevel,
        riskScore: finite(dryRun.dependencyImpact && dryRun.dependencyImpact.riskScore, 0),
        inboundReferenceCount: Array.isArray(dryRun.dependencyImpact && dryRun.dependencyImpact.inboundReferences) ? dryRun.dependencyImpact.inboundReferences.length : 0,
        impactedFileCount: Array.isArray(dryRun.dependencyImpact && dryRun.dependencyImpact.impactedFiles) ? dryRun.dependencyImpact.impactedFiles.length : 0
      },
      policySummary: {
        status: dryRun.policyEvaluation && dryRun.policyEvaluation.status,
        allowed: Boolean(dryRun.policyEvaluation && dryRun.policyEvaluation.allowed),
        passedRules: finite(dryRun.policyEvaluation && dryRun.policyEvaluation.passedRules, 0),
        failedRuleCount: Array.isArray(dryRun.policyEvaluation && dryRun.policyEvaluation.failedRules) ? dryRun.policyEvaluation.failedRules.length : 0
      },
      sandboxSummary: clone(dryRun.sandbox || {}),
      writeCount: 0,
      sourceRestored: false,
      preparedAt: nowIso(),
      approvedAt: "",
      executedAt: "",
      completedAt: "",
      lastError: ""
    };
    sessions.set(session.id, session);
    trimSessions();
    const persistence = persistSessions();
    return {
      prepared: true,
      status: session.status,
      reason: "",
      session: compactSession(session),
      approvalRequirements: {
        actorRequired: true,
        reasonRequired: true,
        confirmationText: challenge,
        acknowledgeRuntimeMutation: true,
        acknowledgeAutomaticRollback: true
      },
      executionRequirements: {
        confirmationText: executionChallenge,
        executeAndRollbackOnly: true,
        persistentCommitAllowed: false
      },
      persistence: persistence
    };
  }

  function approveControlledAutoRefactoringApplication(sessionId, input) {
    const session = getSession(sessionId);
    if (!session) return { approved: false, reason: "Controlled Application Session not found." };
    if (session.status !== "Awaiting Explicit Approval") return { approved: false, reason: "Session is not awaiting Approval." };
    const source = input && typeof input === "object" ? input : {};
    const actor = text(source.actor, "");
    const reason = text(source.reason, "");
    if (!actor || !reason) return { approved: false, reason: "Approval actor and reason are required." };
    if (text(source.confirmationText, "") !== session.challenge) return { approved: false, reason: "Approval confirmation text does not match the required challenge." };
    if (source.acknowledgeRuntimeMutation !== true) return { approved: false, reason: "Runtime Project mutation acknowledgement is required." };
    if (source.acknowledgeAutomaticRollback !== true) return { approved: false, reason: "Automatic Rollback acknowledgement is required." };
    const approval = global.approveAutoRefactoringCandidate(session.candidateId, {
      approved: true,
      actor: actor,
      reason: reason
    });
    if (!approval || approval.approved !== true) return { approved: false, reason: text(approval && approval.reason, "Candidate Approval failed.") };
    session.status = "Approved";
    session.approvalStatus = "Approved";
    session.approvalId = approval.approval && approval.approval.id || "";
    session.approvalActor = actor;
    session.approvalReason = reason;
    session.approvedAt = nowIso();
    sessions.set(session.id, session);
    persistSessions();
    return {
      approved: true,
      reason: "",
      session: compactSession(session),
      approval: clone(approval.approval),
      executionConfirmationText: session.executionChallenge
    };
  }

  function validateAppliedFunction(session, adapter, options) {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    const fileSource = adapter.getFileText(session.target.file);
    check("Applied source available", typeof fileSource === "string");
    const block = typeof fileSource === "string" ? findFunctionBlock(fileSource, session.target.function) : null;
    check("Target function present", Boolean(block));
    check("Applied function hash", Boolean(block && hashText(block.block.trim()) === session.afterHash), block ? hashText(block.block.trim()) : "missing");
    check("Target-only Repository writes", adapter.getWriteLog().every(function targetOnly(item) { return item.fileName === session.target.file && item.verified === true; }));
    if (options && typeof options.validator === "function") {
      try {
        const custom = options.validator({ session: compactSession(session), fileSource: fileSource, functionSource: block && block.block.trim() });
        check("Custom Post-Application Validator", custom === true || Boolean(custom && custom.valid === true), custom && (custom.reason || custom.error));
      } catch (error) {
        check("Custom Post-Application Validator", false, error && error.message ? error.message : String(error));
      }
    }
    const passed = checks.filter(function ok(item) { return item.passed; }).length;
    return {
      passed: checks.length > 0 && passed === checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      passedChecks: passed,
      failedChecks: checks.length - passed,
      totalChecks: checks.length,
      checks: checks,
      validatedAt: nowIso()
    };
  }

  function executeControlledAutoRefactoringApplication(sessionId, input, options) {
    const session = getSession(sessionId);
    if (!session) return { executed: false, reason: "Controlled Application Session not found." };
    if (session.status !== "Approved" || session.approvalStatus !== "Approved") return { executed: false, reason: "Explicit Controlled Application Approval is required." };
    const source = input && typeof input === "object" ? input : {};
    if (source.execute !== true) return { executed: false, reason: "Explicit execute:true is required." };
    if (source.retainCommit === true || source.rollbackAfterValidation === false) {
      return { executed: false, reason: "Persistent Commit is prohibited in Controlled Application Trial. Automatic Rollback is mandatory." };
    }
    const actor = text(source.actor, "");
    if (!actor || actor !== session.approvalActor) return { executed: false, reason: "Execution actor must match the explicit Approval actor." };
    if (text(source.confirmationText, "") !== session.executionChallenge) return { executed: false, reason: "Execution confirmation text does not match the required challenge." };

    const adapter = createTrackedAdapter(session.target.file, options);
    if (!adapter) return { executed: false, reason: "Current Project Runtime File Store Adapter is unavailable." };
    const originalSource = adapter.getFileText(session.target.file);
    if (typeof originalSource !== "string") return { executed: false, reason: "Target Project source is unavailable." };
    const originalHash = hashText(originalSource);

    session.status = "Executing Trial";
    session.executionStatus = "Applying";
    session.executedAt = nowIso();
    sessions.set(session.id, session);
    persistSessions();

    let applied = null;
    let postValidation = null;
    let rollback = null;
    let errorMessage = "";
    try {
      applied = global.applyAutoRefactoringCandidate(session.candidateId, { adapter: adapter });
      if (!applied || applied.applied !== true) throw new Error(text(applied && applied.reason, "Controlled Application Transaction failed."));
      session.transactionId = applied.transaction && applied.transaction.id || "";
      session.executionStatus = "Committed for Trial Validation";
      postValidation = validateAppliedFunction(session, adapter, options);
      session.postValidationStatus = postValidation.passed ? "Passed" : "Failed";
      if (!postValidation.passed) errorMessage = "Post-Application Validation failed.";
    } catch (error) {
      errorMessage = error && error.message ? error.message : String(error);
    } finally {
      if (session.transactionId) {
        rollback = global.rollbackAutoRefactoringTransaction(session.transactionId, {
          actor: actor,
          reason: text(source.rollbackReason, "Mandatory Controlled Application Trial Rollback")
        }, { adapter: adapter });
      }
    }

    const restoredSource = adapter.getFileText(session.target.file);
    const restored = typeof restoredSource === "string" && hashText(restoredSource) === originalHash && restoredSource === originalSource;
    session.writeCount = adapter.getWriteCount();
    session.sourceRestored = restored;
    session.rollbackId = rollback && rollback.rollback && rollback.rollback.id || "";
    session.rollbackStatus = rollback && rollback.rolledBack === true && restored ? "Verified" : "Failed";
    session.executionStatus = applied && applied.applied === true ? "Trial Applied" : "Application Failed";
    const completed = Boolean(applied && applied.applied === true && postValidation && postValidation.passed === true && rollback && rollback.rolledBack === true && restored);
    session.status = completed ? "Trial Completed and Rolled Back" : "Manual Review Required";
    session.completedAt = nowIso();
    session.lastError = completed ? "" : text(errorMessage, "Controlled Application Trial did not complete safely.");
    sessions.set(session.id, session);
    const persistence = persistSessions();

    return {
      executed: completed,
      status: session.status,
      reason: completed ? "" : session.lastError,
      session: compactSession(session),
      application: applied ? {
        applied: applied.applied === true,
        transactionId: applied.transaction && applied.transaction.id,
        transactionStatus: applied.transaction && applied.transaction.status,
        repositoryValidation: clone(applied.validation || null),
        implementationPackageId: applied.implementationPackage && applied.implementationPackage.id
      } : null,
      postValidation: clone(postValidation),
      rollback: rollback ? {
        rolledBack: rollback.rolledBack === true,
        rollbackId: rollback.rollback && rollback.rollback.id,
        verified: Boolean(rollback.rollback && rollback.rollback.verified === true),
        transactionStatus: rollback.transaction && rollback.transaction.status
      } : null,
      repository: {
        adapter: adapter.name,
        writeCount: adapter.getWriteCount(),
        writes: adapter.getWriteLog(),
        originalHash: originalHash,
        restoredHash: hashText(restoredSource || ""),
        sourceRestored: restored,
        persistentCommit: false,
        zipFileMutation: false
      },
      persistence: persistence
    };
  }

  function getControlledAutoRefactoringApplicationSession(id) {
    return compactSession(getSession(id));
  }

  function getControlledAutoRefactoringApplicationStatus() {
    loadSessions();
    const values = [...sessions.values()];
    const latest = values.length ? values[values.length - 1] : null;
    const store = getControlledProjectFileStoreStatus();
    return {
      componentId: COMPONENT_ID,
      version: VERSION,
      controlledVersion: CONTROLLED_VERSION,
      status: store.available ? "Ready" : "Adapter Unavailable",
      implementationPhase: "Controlled Application Trial",
      ready: store.available,
      sessionCount: sessions.size,
      awaitingApprovalCount: values.filter(function count(item) { return item.status === "Awaiting Explicit Approval"; }).length,
      approvedCount: values.filter(function count(item) { return item.status === "Approved"; }).length,
      completedTrialCount: values.filter(function count(item) { return item.status === "Trial Completed and Rolled Back"; }).length,
      manualReviewCount: values.filter(function count(item) { return item.status === "Manual Review Required"; }).length,
      latestSession: compactSession(latest),
      projectFileStore: store,
      safety: {
        explicitTwoStepConfirmation: true,
        approvalActorAndReasonRequired: true,
        functionLevelOnly: true,
        targetOnlyWriteGuard: true,
        rollbackSnapshotPersistedBeforeWrite: true,
        readAfterWriteVerification: true,
        postApplicationValidation: true,
        automaticRollbackRequired: true,
        persistentCommitAllowed: false,
        autoApplyAllowed: false
      },
      validation: clone(lastValidation || { status: "Not Run", valid: null }),
      storageKey: STORAGE_KEY,
      updatedAt: nowIso()
    };
  }

  function validateControlledAutoRefactoringApplication() {
    const beforeSessions = [...sessions.entries()].map(function copy(entry) { return [entry[0], clone(entry[1])]; });
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: text(detail, "") }); }
    try {
      const repository = {
        "controlled-validation.js": [
          "function controlledTarget(value) {",
          "  return value + 1;",
          "}",
          "function controlledCaller(value) { return controlledTarget(value); }"
        ].join("\n")
      };
      const sources = [{ fileName: "controlled-validation.js", code: repository["controlled-validation.js"] }];
      const before = [
        "function controlledTarget(value) {",
        "  return value + 1;",
        "}"
      ].join("\n");
      const after = [
        "function controlledTarget(value) {",
        "  const result = value + 1;",
        "  return result;",
        "}"
      ].join("\n");
      const adapter = {
        name: "Controlled Application Validation Adapter",
        getFileText: function getFileText(name) { return Object.prototype.hasOwnProperty.call(repository, name) ? repository[name] : null; },
        setFileText: function setFileText(name, value) { if (!Object.prototype.hasOwnProperty.call(repository, name)) return false; repository[name] = String(value); return true; }
      };
      const original = repository["controlled-validation.js"];
      const prepared = prepareControlledAutoRefactoringApplication({
        sources: sources,
        targetFile: "controlled-validation.js",
        targetFunction: "controlledTarget",
        beforeFunctionSource: before,
        afterFunctionSource: after,
        recommendationId: "IDE-150-CONTROLLED-VALIDATION",
        recommendationSummary: "Validate controlled trial application.",
        objective: "Apply, validate and automatically roll back the isolated function candidate.",
        actor: "Validator"
      });
      check("Controlled preparation", prepared.prepared === true && prepared.session.status === "Awaiting Explicit Approval");
      check("Persistent Commit prohibited", prepared.executionRequirements && prepared.executionRequirements.persistentCommitAllowed === false);
      const executionBeforeApproval = executeControlledAutoRefactoringApplication(prepared.session.id, {
        execute: true,
        actor: "Validator",
        confirmationText: prepared.executionRequirements.confirmationText
      }, { adapter: adapter });
      check("Execution blocked before Approval", executionBeforeApproval.executed === false && /Approval/.test(executionBeforeApproval.reason));
      const wrongApproval = approveControlledAutoRefactoringApplication(prepared.session.id, {
        actor: "Validator",
        reason: "Validation",
        confirmationText: "WRONG",
        acknowledgeRuntimeMutation: true,
        acknowledgeAutomaticRollback: true
      });
      check("Approval challenge guard", wrongApproval.approved === false);
      const approved = approveControlledAutoRefactoringApplication(prepared.session.id, {
        actor: "Validator",
        reason: "Controlled validation approval",
        confirmationText: prepared.approvalRequirements.confirmationText,
        acknowledgeRuntimeMutation: true,
        acknowledgeAutomaticRollback: true
      });
      check("Explicit Approval", approved.approved === true);
      const wrongExecution = executeControlledAutoRefactoringApplication(prepared.session.id, {
        execute: true,
        actor: "Validator",
        confirmationText: "WRONG"
      }, { adapter: adapter });
      check("Execution challenge guard", wrongExecution.executed === false && /confirmation text/.test(wrongExecution.reason));
      const blockedPersistent = executeControlledAutoRefactoringApplication(prepared.session.id, {
        execute: true,
        actor: "Validator",
        confirmationText: approved.executionConfirmationText,
        retainCommit: true
      }, { adapter: adapter });
      check("Persistent execution blocked", blockedPersistent.executed === false && /Persistent Commit/.test(blockedPersistent.reason));
      const executed = executeControlledAutoRefactoringApplication(prepared.session.id, {
        execute: true,
        actor: "Validator",
        confirmationText: approved.executionConfirmationText,
        rollbackReason: "Controlled validation rollback"
      }, { adapter: adapter });
      check("Controlled transaction applied", executed.application && executed.application.applied === true);
      check("Post-Application Validation", executed.postValidation && executed.postValidation.passed === true);
      check("Mandatory Rollback", executed.rollback && executed.rollback.rolledBack === true && executed.rollback.verified === true);
      check("Source restored", executed.repository && executed.repository.sourceRestored === true && repository["controlled-validation.js"] === original);
      check("Exactly apply and rollback writes", executed.repository && executed.repository.writeCount === 2);
      check("Controlled trial completed", executed.executed === true && executed.status === "Trial Completed and Rolled Back");
      const compact = getControlledAutoRefactoringApplicationSession(prepared.session.id);
      check("Compact Session status", compact && compact.sourceRestored === true && compact.persistentCommitAllowed === false);

      const concurrentPrepared = prepareControlledAutoRefactoringApplication({
        sources: sources,
        targetFile: "controlled-validation.js",
        targetFunction: "controlledTarget",
        beforeFunctionSource: before,
        afterFunctionSource: after,
        recommendationId: "IDE-150-CONTROLLED-CONCURRENT-VALIDATION",
        recommendationSummary: "Validate concurrent-change protection.",
        actor: "Validator"
      });
      const concurrentApproval = approveControlledAutoRefactoringApplication(concurrentPrepared.session.id, {
        actor: "Validator",
        reason: "Concurrent validation approval",
        confirmationText: concurrentPrepared.approvalRequirements.confirmationText,
        acknowledgeRuntimeMutation: true,
        acknowledgeAutomaticRollback: true
      });
      repository["controlled-validation.js"] = original.replace("return value + 1;", "return value + 2;");
      const concurrentExecution = executeControlledAutoRefactoringApplication(concurrentPrepared.session.id, {
        execute: true,
        actor: "Validator",
        confirmationText: concurrentApproval.executionConfirmationText
      }, { adapter: adapter });
      check("Concurrent Change blocks application", concurrentExecution.executed === false && /Concurrent Change/.test(concurrentExecution.reason));
      repository["controlled-validation.js"] = original;

      const validatorPrepared = prepareControlledAutoRefactoringApplication({
        sources: sources,
        targetFile: "controlled-validation.js",
        targetFunction: "controlledTarget",
        beforeFunctionSource: before,
        afterFunctionSource: after,
        recommendationId: "IDE-150-CONTROLLED-POST-VALIDATION",
        recommendationSummary: "Validate rollback after a failed custom post-validator.",
        actor: "Validator"
      });
      const validatorApproval = approveControlledAutoRefactoringApplication(validatorPrepared.session.id, {
        actor: "Validator",
        reason: "Post-validator rollback validation",
        confirmationText: validatorPrepared.approvalRequirements.confirmationText,
        acknowledgeRuntimeMutation: true,
        acknowledgeAutomaticRollback: true
      });
      const validatorExecution = executeControlledAutoRefactoringApplication(validatorPrepared.session.id, {
        execute: true,
        actor: "Validator",
        confirmationText: validatorApproval.executionConfirmationText
      }, { adapter: adapter, validator: function rejectPostValidation() { return { valid: false, reason: "Expected validation rejection" }; } });
      check("Failed Post-Validator blocks completion", validatorExecution.executed === false && validatorExecution.postValidation && validatorExecution.postValidation.passed === false);
      check("Failed Post-Validator still rolls back", validatorExecution.rollback && validatorExecution.rollback.rolledBack === true && validatorExecution.repository.sourceRestored === true && repository["controlled-validation.js"] === original);
    } catch (error) {
      check("Unexpected exception", false, error && error.stack ? error.stack : String(error));
    }

    sessions.clear();
    beforeSessions.forEach(function restore(entry) { sessions.set(entry[0], entry[1]); });
    persistSessions();
    const passed = checks.filter(function ok(item) { return item.passed; }).length;
    lastValidation = {
      id: "IDE-150-CONTROLLED-APPLICATION-VALIDATION",
      componentId: COMPONENT_ID,
      version: VERSION,
      controlledVersion: CONTROLLED_VERSION,
      valid: checks.length > 0 && passed === checks.length,
      status: passed === checks.length ? "Ready" : "Attention",
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 100) : 0,
      checks: checks,
      validatedAt: nowIso()
    };
    return clone(lastValidation);
  }

  function closeControlledPanel() {
    if (!global.document) return false;
    const current = global.document.getElementById("ide150ControlledApplicationPanel");
    if (current && current.parentNode) current.parentNode.removeChild(current);
    return true;
  }

  function openControlledAutoRefactoringApprovalPanel(sessionId) {
    if (!global.document || typeof global.document.createElement !== "function") return { opened: false, reason: "Document UI is unavailable." };
    const session = getSession(sessionId);
    if (!session) return { opened: false, reason: "Controlled Application Session not found." };
    closeControlledPanel();
    const overlay = global.document.createElement("div");
    overlay.id = "ide150ControlledApplicationPanel";
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.72);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;box-sizing:border-box;";
    const panel = global.document.createElement("div");
    panel.style.cssText = "width:min(760px,100%);background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:14px;padding:16px;box-sizing:border-box;font-family:system-ui,sans-serif;";
    const title = global.document.createElement("h2");
    title.textContent = "IDE-150 Controlled Application Trial";
    title.style.margin = "0 0 12px";
    panel.appendChild(title);
    const summary = global.document.createElement("pre");
    summary.textContent = [
      "Target: " + session.target.file + " :: " + session.target.function,
      "Risk: " + text(session.dependencySummary && session.dependencySummary.riskLevel, "Unknown"),
      "Changed Lines: " + finite(session.diffSummary && session.diffSummary.changedLines, 0),
      "Policy: " + text(session.policySummary && session.policySummary.status, "Unknown"),
      "Sandbox: " + (session.sandboxSummary && session.sandboxSummary.passed ? "Passed" : "Not Passed"),
      "Mode: Temporary Runtime Application + Mandatory Rollback",
      "Persistent Commit: Prohibited",
      "Approval Challenge: " + session.challenge,
      "Execution Challenge: " + session.executionChallenge
    ].join("\n");
    summary.style.cssText = "white-space:pre-wrap;background:#0b1220;padding:12px;border-radius:10px;";
    panel.appendChild(summary);
    const diff = global.document.createElement("pre");
    diff.textContent = text(session.diffSummary && session.diffSummary.text, "No diff available.");
    diff.style.cssText = "white-space:pre-wrap;max-height:240px;overflow:auto;background:#030712;padding:12px;border-radius:10px;";
    panel.appendChild(diff);

    function field(labelText, value) {
      const wrap = global.document.createElement("label");
      wrap.style.cssText = "display:block;margin:10px 0;";
      const label = global.document.createElement("div");
      label.textContent = labelText;
      label.style.marginBottom = "4px";
      const input = global.document.createElement("input");
      input.value = value || "";
      input.style.cssText = "width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #4b5563;background:#111827;color:#fff;";
      wrap.appendChild(label);
      wrap.appendChild(input);
      panel.appendChild(wrap);
      return input;
    }

    const actor = field("Approval actor", "Project Owner");
    const reason = field("Approval reason", "Controlled application trial with mandatory rollback");
    const confirmation = field("Type the exact Approval challenge", "");
    const execution = field("Type the exact Execution challenge", "");
    const mutationAck = global.document.createElement("input"); mutationAck.type = "checkbox";
    const rollbackAck = global.document.createElement("input"); rollbackAck.type = "checkbox";
    const ackWrap = global.document.createElement("div");
    ackWrap.style.margin = "12px 0";
    const m = global.document.createElement("label"); m.appendChild(mutationAck); m.appendChild(global.document.createTextNode(" I understand the Runtime Project source is temporarily modified."));
    const r = global.document.createElement("label"); r.style.display = "block"; r.appendChild(rollbackAck); r.appendChild(global.document.createTextNode(" I understand automatic Rollback is mandatory."));
    ackWrap.appendChild(m); ackWrap.appendChild(r); panel.appendChild(ackWrap);
    const output = global.document.createElement("pre"); output.style.cssText = "white-space:pre-wrap;background:#0b1220;padding:10px;border-radius:8px;"; panel.appendChild(output);
    const buttons = global.document.createElement("div"); buttons.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;";
    const approveButton = global.document.createElement("button"); approveButton.textContent = "Approve Trial";
    const executeButton = global.document.createElement("button"); executeButton.textContent = "Apply, Validate & Roll Back"; executeButton.disabled = session.status !== "Approved";
    const closeButton = global.document.createElement("button"); closeButton.textContent = "Close";
    [approveButton, executeButton, closeButton].forEach(function style(button) { button.style.cssText = "padding:10px 14px;border-radius:8px;border:1px solid #4b5563;background:#1f2937;color:#fff;"; buttons.appendChild(button); });
    panel.appendChild(buttons);
    approveButton.onclick = function approveClick() {
      const result = approveControlledAutoRefactoringApplication(session.id, {
        actor: actor.value,
        reason: reason.value,
        confirmationText: confirmation.value,
        acknowledgeRuntimeMutation: mutationAck.checked,
        acknowledgeAutomaticRollback: rollbackAck.checked
      });
      output.textContent = JSON.stringify(result, null, 2);
      executeButton.disabled = result.approved !== true;
    };
    executeButton.onclick = function executeClick() {
      const result = executeControlledAutoRefactoringApplication(session.id, {
        execute: true,
        actor: actor.value,
        confirmationText: execution.value,
        rollbackReason: "Mandatory rollback from Controlled Application UI"
      });
      output.textContent = JSON.stringify(result, null, 2);
    };
    closeButton.onclick = closeControlledPanel;
    overlay.appendChild(panel);
    global.document.body.appendChild(overlay);
    return { opened: true, session: compactSession(session) };
  }

  loadSessions();

  const api = {
    prepareControlledAutoRefactoringApplication: prepareControlledAutoRefactoringApplication,
    approveControlledAutoRefactoringApplication: approveControlledAutoRefactoringApplication,
    executeControlledAutoRefactoringApplication: executeControlledAutoRefactoringApplication,
    getControlledAutoRefactoringApplicationSession: getControlledAutoRefactoringApplicationSession,
    getControlledAutoRefactoringApplicationStatus: getControlledAutoRefactoringApplicationStatus,
    getControlledProjectFileStoreStatus: getControlledProjectFileStoreStatus,
    validateControlledAutoRefactoringApplication: validateControlledAutoRefactoringApplication,
    openControlledAutoRefactoringApprovalPanel: openControlledAutoRefactoringApprovalPanel,
    closeControlledAutoRefactoringApprovalPanel: closeControlledPanel
  };

  Object.keys(api).forEach(function expose(name) { global[name] = api[name]; });
  global.IDE150AutoRefactoring = Object.assign(global.IDE150AutoRefactoring || {}, api, {
    controlledApplicationVersion: CONTROLLED_VERSION
  });
})(typeof window !== "undefined" ? window : globalThis);