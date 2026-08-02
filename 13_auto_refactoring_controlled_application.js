/* ============================================================
   FILE: 13_auto_refactoring_controlled_application.js
   IDE-150 Controlled Application Trial
   Version: 1.0.3
   Status: Controlled Application Trial
   ============================================================ */
(function (global) {
  "use strict";

  const internal = global.__IDE150AutoRefactoringInternal;
  if (!internal) throw new Error("IDE-150 Core must be loaded before Controlled Application.");

  const COMPONENT_ID = internal.COMPONENT_ID;
  const VERSION = internal.VERSION;
  const CONTROLLED_VERSION = "1.0.3";
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

  async function prepareControlledAutoRefactoringApplicationAsync(options) {
    const settings = options && typeof options === "object" ? options : {};
    let sources = resolveSources(settings);
    let sourceLoad = {
      ready: sources.length > 0,
      loadedNow: false,
      sourceCount: sources.length,
      failedFileCount: 0,
      failedFiles: [],
      reason: ""
    };

    if (!sources.length && typeof global.ensureCurrentProjectAnalyzeSources === "function") {
      const loaded = await global.ensureCurrentProjectAnalyzeSources({ silent: true });
      sources = Array.isArray(loaded && loaded.sources) ? loaded.sources : [];
      sourceLoad = {
        ready: sources.length > 0,
        loadedNow: Boolean(loaded && loaded.loadedNow),
        sourceCount: sources.length,
        failedFileCount: finite(loaded && loaded.failedFileCount, 0),
        failedFiles: clone(loaded && loaded.failedFiles || []),
        reason: text(loaded && loaded.reason, sources.length ? "" : "現在プロジェクトのソースを読込めませんでした。")
      };
    }

    if (!sources.length) {
      return {
        prepared: false,
        status: "Blocked",
        reason: sourceLoad.reason || "Project sources are unavailable. Controlled Application is fail-closed.",
        sourceLoad: sourceLoad
      };
    }

    const result = prepareControlledAutoRefactoringApplication(Object.assign({}, settings, { sources: sources }));
    result.sourceLoad = sourceLoad;
    return result;
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
      const transactionId = executed.application && executed.application.transactionId;
      let transactionArtifact = null;
      let rollbackSnapshotArtifact = null;
      let rollbackSnapshotKey = "";
      try {
        const corePayload = global.localStorage ? safeParse(global.localStorage.getItem(internal.STORAGE_KEY), null) : null;
        const compactTransaction = corePayload && Array.isArray(corePayload.transactions)
          ? corePayload.transactions.find(function find(item) { return item && item.id === transactionId; })
          : null;
        transactionArtifact = compactTransaction && compactTransaction.artifactKey && global.localStorage
          ? safeParse(global.localStorage.getItem(compactTransaction.artifactKey), null)
          : null;
        rollbackSnapshotKey = text(transactionArtifact && transactionArtifact.rollbackSnapshot && transactionArtifact.rollbackSnapshot.storageKey, "");
        rollbackSnapshotArtifact = rollbackSnapshotKey && global.localStorage
          ? safeParse(global.localStorage.getItem(rollbackSnapshotKey), null)
          : null;
      } catch (_) {}
      check("Dedicated Rollback Snapshot reference", Boolean(rollbackSnapshotKey));
      check("Rollback Snapshot read-back verified", Boolean(rollbackSnapshotArtifact && rollbackSnapshotArtifact.transactionId === transactionId && typeof rollbackSnapshotArtifact.source === "string" && rollbackSnapshotArtifact.source.length > 0 && hashText(rollbackSnapshotArtifact.source) === rollbackSnapshotArtifact.sourceHash));
      check("Transaction Artifact excludes duplicate Snapshot source", Boolean(transactionArtifact && transactionArtifact.rollbackSnapshot && transactionArtifact.rollbackSnapshot.source === "" && transactionArtifact.rollbackSnapshot.sourceStoredSeparately === true));
      const rollbackSnapshotKeyCount = global.localStorage
        ? Array.from({ length: global.localStorage.length }, function key(_, index) { return global.localStorage.key(index); }).filter(function filter(key) { return key && key.indexOf("AI_PROMPT_OS_IDE150_ROLLBACK_SNAPSHOT_V1:") === 0; }).length
        : 0;
      check("Rollback Snapshot retention limit", rollbackSnapshotKeyCount <= 10, "count=" + rollbackSnapshotKeyCount);
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
    if (!global.document || typeof global.document.createElement !== "function") {
      return { opened: false, reason: "Document UI is unavailable." };
    }
    const session = getSession(sessionId);
    if (!session) return { opened: false, reason: "Controlled Application Session not found." };

    closeControlledPanel();

    const STATUS_JA = {
      "Awaiting Explicit Approval": "明示承認待ち",
      "Approved": "承認済み",
      "Executing Trial": "トライアル実行中",
      "Trial Completed and Rolled Back": "トライアル完了・ロールバック確認済み",
      "Manual Review Required": "手動確認が必要",
      "Passed": "合格",
      "Allowed": "許可",
      "Verified": "確認済み",
      "Low": "低",
      "Medium": "中",
      "High": "高",
      "Critical": "重大",
      "Unknown": "不明"
    };

    const REASON_JA = {
      "Controlled Application Session not found.": "制御適用セッションが見つかりません。",
      "Session is not awaiting Approval.": "このセッションは承認待ち状態ではありません。",
      "Approval actor and reason are required.": "承認者と承認理由を入力してください。",
      "Approval confirmation text does not match the required challenge.": "承認用確認文字列が一致しません。",
      "Runtime Project mutation acknowledgement is required.": "実行時プロジェクトが一時変更されることへの確認が必要です。",
      "Automatic Rollback acknowledgement is required.": "自動ロールバックへの確認が必要です。",
      "Explicit Controlled Application Approval is required.": "明示的な制御適用承認が必要です。",
      "Explicit execute:true is required.": "明示的な実行指定が必要です。",
      "Persistent Commit is prohibited in Controlled Application Trial. Automatic Rollback is mandatory.": "このトライアルでは永続コミットは禁止されています。自動ロールバックが必須です。",
      "Execution actor must match the explicit Approval actor.": "実行者は承認者と一致する必要があります。",
      "Execution confirmation text does not match the required challenge.": "実行用確認文字列が一致しません。",
      "Current Project Runtime File Store Adapter is unavailable.": "現在のプロジェクト実行時ファイルストアを利用できません。",
      "Target Project source is unavailable.": "対象プロジェクトのソースを取得できません。"
    };

    function ja(value, fallback) {
      const key = text(value, "");
      return STATUS_JA[key] || key || fallback || "";
    }

    function jaReason(value) {
      const key = text(value, "");
      return REASON_JA[key] || key;
    }

    function buttonStyle(button, emphasized) {
      button.style.cssText = [
        "padding:10px 14px",
        "border-radius:8px",
        "border:1px solid #4b5563",
        emphasized ? "background:#1d4ed8" : "background:#1f2937",
        "color:#fff",
        "font-weight:700",
        "cursor:pointer"
      ].join(";");
    }

    function setDisabled(button, disabled) {
      button.disabled = disabled === true;
      button.style.opacity = button.disabled ? ".5" : "1";
      button.style.cursor = button.disabled ? "not-allowed" : "pointer";
    }

    function copyTextValue(value, button, successLabel) {
      const source = String(value || "");
      function done(ok) {
        const original = button.dataset.originalLabel || button.textContent;
        button.dataset.originalLabel = original;
        button.textContent = ok ? successLabel : "コピー失敗";
        global.setTimeout(function restoreLabel() { button.textContent = original; }, 1400);
      }
      if (global.navigator && global.navigator.clipboard && typeof global.navigator.clipboard.writeText === "function") {
        global.navigator.clipboard.writeText(source).then(function success() { done(true); }).catch(function fallbackCopy() {
          try {
            const area = global.document.createElement("textarea");
            area.value = source;
            area.style.position = "fixed";
            area.style.opacity = "0";
            global.document.body.appendChild(area);
            area.focus();
            area.select();
            const copied = global.document.execCommand("copy");
            area.remove();
            done(copied === true);
          } catch (_) { done(false); }
        });
        return;
      }
      try {
        const area = global.document.createElement("textarea");
        area.value = source;
        area.style.position = "fixed";
        area.style.opacity = "0";
        global.document.body.appendChild(area);
        area.focus();
        area.select();
        const copied = global.document.execCommand("copy");
        area.remove();
        done(copied === true);
      } catch (_) { done(false); }
    }

    function resultSummary(result, type) {
      if (type === "approval") {
        if (result && result.approved === true) {
          return [
            "承認が完了しました。",
            "次に実行用確認文字列を入力し、［一時適用・検証・ロールバック］を押してください。",
            "状態: " + ja(result.session && result.session.status, "承認済み")
          ].join("\n");
        }
        return "承認できませんでした。\n理由: " + jaReason(result && result.reason);
      }
      if (result && result.executed === true) {
        return [
          "トライアルが正常に完了しました。",
          "一時適用: 完了",
          "適用後検証: " + (result.postValidation && result.postValidation.passed ? "合格" : "不合格"),
          "ロールバック: " + (result.rollback && result.rollback.verified ? "確認済み" : "未確認"),
          "元ソース復元: " + (result.repository && result.repository.sourceRestored ? "はい" : "いいえ"),
          "永続コミット: なし",
          "書込み回数: " + finite(result.repository && result.repository.writeCount, 0)
        ].join("\n");
      }
      const writeCount = finite(result && result.repository && result.repository.writeCount, 0);
      const restored = Boolean(result && result.repository && result.repository.sourceRestored);
      return [
        "安全のためトライアルを停止しました。",
        "理由: " + jaReason(result && result.reason),
        writeCount === 0 ? "実行時プロジェクトの変更: なし" : "一時書込み回数: " + writeCount,
        restored ? "元ソースの状態: 復元確認済み" : "元ソースの状態: 手動確認が必要",
        "このセッションは再実行せず、パネルを閉じて新しいトライアルを作成してください。"
      ].join("\n");
    }

    const overlay = global.document.createElement("div");
    overlay.id = "ide150ControlledApplicationPanel";
    overlay.lang = "ja";
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.72);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;box-sizing:border-box;";

    const panel = global.document.createElement("div");
    panel.style.cssText = "width:min(760px,100%);background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:14px;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,'Noto Sans JP',sans-serif;";

    const title = global.document.createElement("h2");
    title.textContent = "IDE-150 制御適用トライアル";
    title.style.margin = "0 0 4px";
    panel.appendChild(title);

    const subtitle = global.document.createElement("div");
    subtitle.textContent = "一時適用・検証・必須ロールバック";
    subtitle.style.cssText = "color:#93c5fd;margin:0 0 12px;font-weight:700;";
    panel.appendChild(subtitle);

    const summary = global.document.createElement("pre");
    summary.textContent = [
      "対象: " + session.target.file + " :: " + session.target.function,
      "リスク: " + ja(session.dependencySummary && session.dependencySummary.riskLevel, "不明"),
      "変更行数: " + finite(session.diffSummary && session.diffSummary.changedLines, 0),
      "ポリシー判定: " + ja(session.policySummary && session.policySummary.status, "不明"),
      "サンドボックス: " + (session.sandboxSummary && session.sandboxSummary.passed ? "合格" : "未合格"),
      "実行方式: 実行時プロジェクトへの一時適用 + 必須ロールバック",
      "永続コミット: 禁止",
      "現在の状態: " + ja(session.status, session.status)
    ].join("\n");
    summary.style.cssText = "white-space:pre-wrap;background:#0b1220;padding:12px;border-radius:10px;line-height:1.5;";
    panel.appendChild(summary);

    const notice = global.document.createElement("div");
    notice.textContent = "安全確認用の英字Challenge文字列は内部契約のため翻訳しません。表示された文字列を完全一致で入力してください。";
    notice.style.cssText = "margin:10px 0;padding:10px 12px;border-left:4px solid #f59e0b;background:#1f2937;border-radius:6px;line-height:1.5;";
    panel.appendChild(notice);

    function challengeBox(labelText, value, copyLabel) {
      const wrap = global.document.createElement("div");
      wrap.style.cssText = "margin:10px 0;padding:10px;background:#0b1220;border-radius:10px;";
      const label = global.document.createElement("div");
      label.textContent = labelText;
      label.style.cssText = "font-weight:700;margin-bottom:6px;";
      const code = global.document.createElement("code");
      code.textContent = value;
      code.style.cssText = "display:block;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px;background:#030712;border-radius:6px;user-select:text;";
      const copyButton = global.document.createElement("button");
      copyButton.textContent = copyLabel;
      buttonStyle(copyButton, false);
      copyButton.style.marginTop = "8px";
      copyButton.onclick = function copyChallenge() { copyTextValue(value, copyButton, "コピーしました"); };
      wrap.appendChild(label);
      wrap.appendChild(code);
      wrap.appendChild(copyButton);
      panel.appendChild(wrap);
    }

    challengeBox("承認用確認文字列", session.challenge, "承認用文字列をコピー");
    challengeBox("実行用確認文字列（承認後に入力）", session.executionChallenge, "実行用文字列をコピー");

    const diffHeading = global.document.createElement("h3");
    diffHeading.textContent = "変更差分";
    diffHeading.style.margin = "16px 0 8px";
    panel.appendChild(diffHeading);

    const diff = global.document.createElement("pre");
    diff.textContent = text(session.diffSummary && session.diffSummary.text, "差分を取得できませんでした。");
    diff.style.cssText = "white-space:pre-wrap;max-height:240px;overflow:auto;background:#030712;padding:12px;border-radius:10px;";
    panel.appendChild(diff);

    function field(labelText, value, placeholder) {
      const wrap = global.document.createElement("label");
      wrap.style.cssText = "display:block;margin:12px 0;";
      const label = global.document.createElement("div");
      label.textContent = labelText;
      label.style.cssText = "margin-bottom:6px;font-weight:700;";
      const input = global.document.createElement("input");
      input.value = value || "";
      input.placeholder = placeholder || "";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.style.cssText = "width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:1px solid #4b5563;background:#111827;color:#fff;font-size:16px;";
      wrap.appendChild(label);
      wrap.appendChild(input);
      panel.appendChild(wrap);
      return input;
    }

    const actor = field("承認者", "Project Owner", "承認者を入力");
    const reason = field("承認理由", "必須ロールバック付き制御適用トライアル", "承認理由を入力");
    const confirmation = field("承認用確認文字列を入力", "", "APPROVE ...");
    const execution = field("実行用確認文字列を入力（承認後）", "", "EXECUTE-AND-ROLLBACK ...");

    const mutationAck = global.document.createElement("input");
    mutationAck.type = "checkbox";
    mutationAck.style.cssText = "width:22px;height:22px;flex:0 0 auto;margin-top:2px;";
    const rollbackAck = global.document.createElement("input");
    rollbackAck.type = "checkbox";
    rollbackAck.style.cssText = mutationAck.style.cssText;

    const ackWrap = global.document.createElement("div");
    ackWrap.style.margin = "14px 0";
    function ackLabel(input, labelText) {
      const label = global.document.createElement("label");
      label.style.cssText = "display:flex;gap:8px;align-items:flex-start;margin:10px 0;line-height:1.45;font-weight:700;";
      label.appendChild(input);
      label.appendChild(global.document.createTextNode(labelText));
      return label;
    }
    ackWrap.appendChild(ackLabel(mutationAck, "実行時プロジェクトのソースが一時的に変更されることを理解しました。"));
    ackWrap.appendChild(ackLabel(rollbackAck, "検証後に自動ロールバックが必ず実行されることを理解しました。"));
    panel.appendChild(ackWrap);

    const resultHeading = global.document.createElement("h3");
    resultHeading.textContent = "実行結果";
    resultHeading.style.margin = "16px 0 8px";
    panel.appendChild(resultHeading);

    const output = global.document.createElement("pre");
    output.textContent = session.status === "Trial Completed and Rolled Back"
      ? "トライアル完了・ロールバック確認済みです。"
      : session.status === "Manual Review Required"
        ? "このトライアルは安全停止済みです。再実行せず、新しいトライアルを作成してください。"
        : "まだ実行されていません。";
    output.style.cssText = "white-space:pre-wrap;background:#0b1220;padding:12px;border-radius:8px;line-height:1.5;";
    panel.appendChild(output);

    const rawDetails = global.document.createElement("details");
    rawDetails.style.marginTop = "10px";
    const rawSummary = global.document.createElement("summary");
    rawSummary.textContent = "詳細JSONを表示";
    rawSummary.style.cssText = "cursor:pointer;font-weight:700;";
    const rawOutput = global.document.createElement("pre");
    rawOutput.textContent = "";
    rawOutput.style.cssText = "white-space:pre-wrap;max-height:360px;overflow:auto;background:#030712;padding:10px;border-radius:8px;";
    rawDetails.appendChild(rawSummary);
    rawDetails.appendChild(rawOutput);
    panel.appendChild(rawDetails);

    const buttons = global.document.createElement("div");
    buttons.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;";
    const approveButton = global.document.createElement("button");
    approveButton.textContent = "トライアルを承認";
    const executeButton = global.document.createElement("button");
    executeButton.textContent = "一時適用・検証・ロールバック";
    const closeButton = global.document.createElement("button");
    closeButton.textContent = "閉じる";
    buttonStyle(approveButton, false);
    buttonStyle(executeButton, true);
    buttonStyle(closeButton, false);
    buttons.appendChild(approveButton);
    buttons.appendChild(executeButton);
    buttons.appendChild(closeButton);
    panel.appendChild(buttons);

    function lockCompletedUi() {
      approveButton.textContent = "承認済み";
      executeButton.textContent = "完了・ロールバック確認済み";
      setDisabled(approveButton, true);
      setDisabled(executeButton, true);
      [actor, reason, confirmation, execution].forEach(function lock(input) { input.readOnly = true; });
      mutationAck.disabled = true;
      rollbackAck.disabled = true;
    }

    function lockFailedUi() {
      approveButton.textContent = "承認済み";
      executeButton.textContent = "安全停止・新規トライアルが必要";
      setDisabled(approveButton, true);
      setDisabled(executeButton, true);
      [actor, reason, confirmation, execution].forEach(function lock(input) { input.readOnly = true; });
      mutationAck.disabled = true;
      rollbackAck.disabled = true;
    }

    setDisabled(approveButton, session.status !== "Awaiting Explicit Approval");
    setDisabled(executeButton, session.status !== "Approved");
    if (session.status === "Trial Completed and Rolled Back") lockCompletedUi();
    if (session.status === "Manual Review Required") lockFailedUi();

    approveButton.onclick = function approveClick() {
      const result = approveControlledAutoRefactoringApplication(session.id, {
        actor: actor.value,
        reason: reason.value,
        confirmationText: confirmation.value,
        acknowledgeRuntimeMutation: mutationAck.checked,
        acknowledgeAutomaticRollback: rollbackAck.checked
      });
      output.textContent = resultSummary(result, "approval");
      rawOutput.textContent = JSON.stringify(result, null, 2);
      if (result.approved === true) {
        setDisabled(approveButton, true);
        approveButton.textContent = "承認済み";
        setDisabled(executeButton, false);
        execution.focus();
      }
    };

    executeButton.onclick = function executeClick() {
      setDisabled(executeButton, true);
      executeButton.textContent = "実行中…";
      const result = executeControlledAutoRefactoringApplication(session.id, {
        execute: true,
        actor: actor.value,
        confirmationText: execution.value,
        rollbackReason: "制御適用UIからの必須ロールバック"
      });
      output.textContent = resultSummary(result, "execution");
      rawOutput.textContent = JSON.stringify(result, null, 2);
      if (result.executed === true) {
        lockCompletedUi();
      } else if (result.session && result.session.status === "Manual Review Required") {
        lockFailedUi();
      } else {
        executeButton.textContent = "一時適用・検証・ロールバック";
        setDisabled(executeButton, false);
      }
    };

    closeButton.onclick = closeControlledPanel;
    overlay.appendChild(panel);
    global.document.body.appendChild(overlay);
    return { opened: true, session: compactSession(session), locale: "ja-JP" };
  }

  loadSessions();

  const api = {
    prepareControlledAutoRefactoringApplication: prepareControlledAutoRefactoringApplication,
    prepareControlledAutoRefactoringApplicationAsync: prepareControlledAutoRefactoringApplicationAsync,
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