/* ============================================================
   FILE: 13_development_automation_phase7_validation.js
   IDE-190 Development Automation
   Release: 1.6.0 / Module: Phase 7 Validation 1.0.0
   Phase 7: Failure / Timeout / Recovery
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase7Validation");
  const EXPECTED_PHASE7_SCRIPT_FILES = Object.freeze([
    "13_development_automation_failure.js",
    "13_development_automation_timeout.js",
    "13_development_automation_recovery.js",
    "13_development_automation_phase7_validation.js"
  ]);

  function collector() {
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), group: group || "General", severity: severity || "Critical" });
    }
    return { checks: checks, check: check };
  }

  function summarize(checks, idPrefix, passStatus, failStatus, extras) {
    const passed = checks.filter(function(item){ return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function(item){ return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(idPrefix),
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? passStatus : failStatus,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  function hashIDE150Source(value) {
    const source = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function getProjectSource(fileName) {
    if (typeof global.getProjectFile !== "function") return "";
    const file = global.getProjectFile(fileName);
    return file ? String(file.code || file.text || file.content || file.value || "") : "";
  }

  function getLoadedScriptPaths() {
    if (!global.document || typeof global.document.querySelectorAll !== "function") return [];
    return Array.from(global.document.querySelectorAll("script[src]")).map(function(script){
      const src = String(script.getAttribute("src") || "");
      return src.split("?")[0].split("#")[0].replace(/^\.\//, "");
    });
  }

  function capturePhase7RuntimeState() {
    return {
      failureRecords: new Map(state.failureRecords || []),
      timeoutWatches: new Map(state.timeoutWatches || []),
      timeoutRecords: new Map(state.timeoutRecords || []),
      recoveryDecisions: new Map(state.recoveryDecisions || []),
      recoveryVerifications: new Map(state.recoveryVerifications || []),
      repositoryIntegrityRecords: new Map(state.repositoryIntegrityRecords || []),
      rollbackRestorationRecords: new Map(state.rollbackRestorationRecords || []),
      mutationTrials: new Map(state.mutationTrials || []),
      repositoryMutationTrust: internal.clone(state.repositoryMutationTrust),
      mutationTrialLock: internal.clone(state.mutationTrialLock),
      latestFailureRecordId: state.latestFailureRecordId || null,
      latestTimeoutWatchId: state.latestTimeoutWatchId || null,
      latestTimeoutRecordId: state.latestTimeoutRecordId || null,
      latestRecoveryDecisionId: state.latestRecoveryDecisionId || null,
      latestRecoveryVerificationId: state.latestRecoveryVerificationId || null
    };
  }

  function restorePhase7RuntimeState(snapshot) {
    state.failureRecords = snapshot.failureRecords;
    state.timeoutWatches = snapshot.timeoutWatches;
    state.timeoutRecords = snapshot.timeoutRecords;
    state.recoveryDecisions = snapshot.recoveryDecisions;
    state.recoveryVerifications = snapshot.recoveryVerifications;
    state.repositoryIntegrityRecords = snapshot.repositoryIntegrityRecords;
    state.rollbackRestorationRecords = snapshot.rollbackRestorationRecords;
    state.mutationTrials = snapshot.mutationTrials;
    state.repositoryMutationTrust = snapshot.repositoryMutationTrust;
    state.mutationTrialLock = snapshot.mutationTrialLock;
    state.latestFailureRecordId = snapshot.latestFailureRecordId;
    state.latestTimeoutWatchId = snapshot.latestTimeoutWatchId;
    state.latestTimeoutRecordId = snapshot.latestTimeoutRecordId;
    state.latestRecoveryDecisionId = snapshot.latestRecoveryDecisionId;
    state.latestRecoveryVerificationId = snapshot.latestRecoveryVerificationId;
    internal.touch();
  }

  async function ensureProjectSource(fileName) {
    let source = getProjectSource(fileName);
    let refresh = "Not Required";
    if (!source && typeof global.loadCurrentProjectFileByFetch === "function") {
      const scriptElement = global.document ? Array.from(global.document.querySelectorAll("script[src]")).find(function(script){
        const src = String(script && script.getAttribute("src") || "");
        return src.split("?")[0].split("#")[0].replace(/^\.\//, "").split("/").pop() === fileName;
      }) : null;
      const runtimeSourcePath = scriptElement ? scriptElement.getAttribute("src") : fileName;
      const loaded = await global.loadCurrentProjectFileByFetch(runtimeSourcePath);
      refresh = loaded === true ? "Refreshed: " + runtimeSourcePath : "Refresh Failed: " + runtimeSourcePath;
      source = getProjectSource(fileName);
    }
    return { source: source, refresh: refresh };
  }

  async function validateRecoveryIsolation(check) {
    const snapshot = capturePhase7RuntimeState();
    try {
      const targetFile = "00_core.js";
      const sourceResult = await ensureProjectSource(targetFile);
      const originalSource = sourceResult.source;
      check("Recovery validation source is available", Boolean(originalSource), originalSource.length + " | " + sourceResult.refresh, "Recovery", "Critical");
      if (!originalSource) return;
      const sourceKey = "IDE-190-PHASE7-RECOVERY-SOURCE";
      const originalHash = hashIDE150Source(originalSource);
      state.repositoryIntegrityRecords.set(sourceKey, {
        repositoryIntegrityRecordId: "IDE-190-PHASE7-SYNTHETIC-V6",
        mutationTrialId: "IDE-190-PHASE7-SYNTHETIC-TRIAL",
        targetFile: targetFile,
        targetFunction: "synthetic",
        originalHash: originalHash,
        restoredHash: "mismatch",
        sourceRestored: false,
        integrityStatus: "Failed"
      });
      state.rollbackRestorationRecords.set(sourceKey, {
        rollbackRestorationRecordId: "IDE-190-PHASE7-SYNTHETIC-V7",
        mutationTrialId: "IDE-190-PHASE7-SYNTHETIC-TRIAL",
        rollbackId: "IDE-190-PHASE7-SYNTHETIC-ROLLBACK",
        restorationStatus: "Recovery-Required",
        repositoryTrustStatus: "Untrusted"
      });
      state.repositoryMutationTrust = { status: "Untrusted", reason: "Synthetic Phase 7 verification fixture", mutationTrialId: sourceKey, rollbackId: "IDE-190-PHASE7-SYNTHETIC-ROLLBACK", markedAt: internal.nowIso() };
      state.mutationTrialLock = { active: false, mutationTrialId: null, acquiredAt: null, releasedAt: internal.nowIso() };

      const failureResult = namespace.createAutomationFailureRecord({
        sourcePhase: 6,
        sourceRecordId: sourceKey,
        category: "Rollback",
        directCause: "Rollback verification did not prove exact restoration.",
        mutationStarted: true,
        rollbackVerified: false,
        sourceRestored: false,
        outcome: "Recovery-Required",
        evidence: [{ type: "V7", id: "IDE-190-PHASE7-SYNTHETIC-V7" }]
      });
      const failure = failureResult && failureResult.data && failureResult.data.failure;
      check("Rollback Failure is recorded", Boolean(failureResult && failureResult.ok && failure), failureResult && failureResult.code, "Failure", "Critical");
      check("Rollback Failure is Critical Non-Retryable", Boolean(failure && failure.severity === "Critical" && failure.retryEligibility === "Non-Retryable" && failure.recoveryRequired === true), failure && failure.retryEligibility, "Failure", "Critical");
      check("Failure Root Cause is not inferred", Boolean(failure && failure.rootCauseStatus === "Not Determined" && failure.rootCauseInferred === false), failure && failure.rootCauseStatus, "Failure", "Critical");
      check("Failure automatic Retry remains disabled", Boolean(failure && failure.automaticRetryAllowed === false), failure && failure.automaticRetryAllowed, "Failure", "Critical");

      const retryBlocked = namespace.createAutomationRecoveryDecision({
        failureRecordId: failure.failureRecordId,
        action: "Retry-Later",
        actorRole: "Project Owner",
        explicitDecision: true,
        evidence: [{ type: "Owner Decision", id: "PHASE7-RETRY-BLOCK" }]
      });
      check("Rollback Failure cannot be retried", Boolean(retryBlocked && retryBlocked.ok === false && retryBlocked.code === "IDE190_RECOVERY_RETRY_PROHIBITED"), retryBlocked && retryBlocked.code, "Recovery", "Critical");

      const nonOwner = namespace.createAutomationRecoveryDecision({
        failureRecordId: failure.failureRecordId,
        action: "Verify-Restoration",
        actorRole: "Operator",
        explicitDecision: true,
        evidence: [{ type: "Evidence", id: "PHASE7-NONOWNER" }]
      });
      check("Critical Recovery requires Project Owner", Boolean(nonOwner && nonOwner.ok === false && nonOwner.code === "IDE190_RECOVERY_PROJECT_OWNER_REQUIRED"), nonOwner && nonOwner.code, "Recovery", "Critical");

      const decisionResult = namespace.createAutomationRecoveryDecision({
        failureRecordId: failure.failureRecordId,
        action: "Verify-Restoration",
        actorRole: "Project Owner",
        explicitDecision: true,
        evidence: [{ type: "Manual Restoration Evidence", id: "PHASE7-RESTORATION-EVIDENCE" }]
      });
      const decision = decisionResult && decisionResult.data && decisionResult.data.recoveryDecision;
      check("Project Owner Restoration Verification Decision is recorded", Boolean(decisionResult && decisionResult.ok && decision), decisionResult && decisionResult.code, "Recovery", "Critical");
      check("Recovery Decision performs no Repository write", Boolean(decision && decision.automaticRepositoryWrite === false && decision.automaticRetry === false), decision && decision.automaticRepositoryWrite, "Recovery", "Critical");

      const wrongVerification = namespace.verifyAutomationRepositoryRecovery({
        recoveryDecisionId: decision.recoveryDecisionId,
        explicitVerification: true,
        targetFile: targetFile,
        expectedOriginalSource: originalSource + "\n// wrong"
      });
      check("Recovery rejects mismatched expected source", Boolean(wrongVerification && wrongVerification.ok === false && wrongVerification.code === "IDE190_RECOVERY_EXPECTED_SOURCE_HASH_MISMATCH"), wrongVerification && wrongVerification.code, "Recovery", "Critical");
      check("Repository remains Untrusted after failed verification", state.repositoryMutationTrust.status === "Untrusted", state.repositoryMutationTrust.status, "Recovery", "Critical");

      const verified = namespace.verifyAutomationRepositoryRecovery({
        recoveryDecisionId: decision.recoveryDecisionId,
        explicitVerification: true,
        targetFile: targetFile,
        expectedOriginalSource: originalSource
      });
      const proof = verified && verified.data && verified.data.recoveryVerification;
      check("Exact Restoration Verification restores Repository Trust", Boolean(verified && verified.ok === true && state.repositoryMutationTrust.status === "Trusted"), verified && verified.code, "Recovery", "Critical");
      check("Recovery proof is exact source/hash", Boolean(proof && proof.sourceExact === true && proof.hashExact === true && proof.expectedOriginalHash === proof.currentHash), proof && proof.currentHash, "Recovery", "Critical");
      check("Recovery proof writes zero Repository records", Boolean(proof && proof.repositoryWriteCount === 0 && proof.persistentCommit === false), proof && proof.repositoryWriteCount, "Recovery", "Critical");
      check("Recovery Verification Contract validates", Boolean(proof && namespace.validateContract("recoveryVerification", proof).valid), proof && proof.recoveryVerificationId, "Contracts", "Critical");
    } finally {
      restorePhase7RuntimeState(snapshot);
    }
  }

  function validateInterruptedLockRecovery(check) {
    const snapshot = capturePhase7RuntimeState();
    try {
      state.mutationTrialLock = { active: true, mutationTrialId: "IDE-190-PHASE7-INTERRUPTED", acquiredAt: internal.nowIso(), releasedAt: null };
      const unsafe = namespace.recoverInterruptedPreMutationLock({ actorRole: "Project Owner", explicitRecovery: true, executionConfirmedStopped: true, mutationStarted: true });
      check("Interrupted Mutation lock cannot be released when Mutation may have started", Boolean(unsafe && unsafe.ok === false && unsafe.code === "IDE190_INTERRUPTED_MUTATION_REQUIRES_RESTORATION_VERIFICATION"), unsafe && unsafe.code, "Interrupted", "Critical");
      check("Mutation Lock remains active after unsafe recovery request", state.mutationTrialLock.active === true, state.mutationTrialLock.active, "Interrupted", "Critical");
      const safe = namespace.recoverInterruptedPreMutationLock({ actorRole: "Project Owner", explicitRecovery: true, executionConfirmedStopped: true, mutationStarted: false });
      check("Interrupted pre-Mutation lock can be explicitly recovered", Boolean(safe && safe.ok === true && safe.code === "IDE190_INTERRUPTED_PRE_MUTATION_LOCK_RELEASED"), safe && safe.code, "Interrupted", "Critical");
      check("Recovered pre-Mutation lock is released", state.mutationTrialLock.active === false, state.mutationTrialLock.active, "Interrupted", "Critical");
    } finally {
      restorePhase7RuntimeState(snapshot);
    }
  }

  async function runDevelopmentAutomationPhase7Validation() {
    const c = collector(), checks = c.checks, check = c.check;
    const init = namespace.initialize({ requireIDE180: true, requireIDE160: true });
    check("Foundation initialization succeeds", Boolean(init && init.ok), init && init.code, "Initialization", "Critical");
    check("Release Version is 1.6.0", VERSION_MANIFEST.release.version === "1.6.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 7", VERSION_MANIFEST.implementation.phase === 7 && VERSION_MANIFEST.release.implementationPhase === "Phase 7 Failure / Timeout / Recovery", VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains exact", VERSION_MANIFEST.release.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Manifest", "Critical");
    check("Phases 1 through 6 are recorded complete", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6]), VERSION_MANIFEST.implementation.completedPhases, "Phase Gate", "Critical");
    check("Phase 6 completion is recorded in Phase 7 release", VERSION_MANIFEST.implementation.completedPhases.includes(6) && VERSION_MANIFEST.implementation.phase === 7, JSON.stringify({ completedPhases: VERSION_MANIFEST.implementation.completedPhases, priorRuntimeGateState: state.androidPhase6ValidationPassed === true }), "Phase Gate", "Critical");

    Object.keys(VERSION_MANIFEST.safety).forEach(function(key){ check("Safety flag remains disabled: "+key, VERSION_MANIFEST.safety[key] === false, VERSION_MANIFEST.safety[key], "Safety", "Critical"); });
    check("Persistent Commit remains prohibited", VERSION_MANIFEST.initialPolicy.persistentCommitAllowed === false, VERSION_MANIFEST.initialPolicy.persistentCommitAllowed, "Safety", "Critical");
    check("Mandatory Rollback remains required", VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresMandatoryRollback === true, VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresMandatoryRollback, "Safety", "Critical");
    check("Human Approval cannot override Hard Deny", VERSION_MANIFEST.initialPolicy.humanApprovalOverridesHardDeny === false, VERSION_MANIFEST.initialPolicy.humanApprovalOverridesHardDeny, "Safety", "Critical");

    const ide160Recovery = namespace.getIDE160RecoveryCapabilityStatus();
    check("IDE-160 Failure API is available", ide160Recovery.createWorkflowFailure === true, ide160Recovery.createWorkflowFailure, "IDE-160 Recovery", "Critical");
    check("IDE-160 Recovery Decision API is available", ide160Recovery.createWorkflowRecoveryDecision === true, ide160Recovery.createWorkflowRecoveryDecision, "IDE-160 Recovery", "Critical");
    check("IDE-160 Retry Attempt API is available", ide160Recovery.createWorkflowRetryAttempt === true, ide160Recovery.createWorkflowRetryAttempt, "IDE-160 Recovery", "Critical");
    check("IDE-190 does not automatically bridge/retry IDE-160 Workflow", ide160Recovery.automaticBridgeUsed === false, ide160Recovery.automaticBridgeUsed, "IDE-160 Recovery", "Critical");

    check("All Phase 1-7 contracts are registered", namespace.listContractDefinitions().length === 23, namespace.listContractDefinitions().length, "Contracts", "Critical");
    ["failureRecord","timeoutRecord","recoveryDecision","recoveryVerification"].forEach(function(key){ const def=namespace.getContractDefinition(key); check("Phase 7 contract exists: "+key, Boolean(def&&def.version==="1.0.0"), def&&def.version, "Contracts", "Critical"); });
    ["failure","timeout","recovery"].forEach(function(key){ check("Module is Ready: "+key, namespace.modules[key]&&namespace.modules[key].status==="Ready", namespace.modules[key]&&namespace.modules[key].status, "Modules", "Critical"); });
    check("Phase 7 Validation module is loaded", Boolean(namespace.modules.phase7Validation), namespace.modules.phase7Validation&&namespace.modules.phase7Validation.status, "Modules", "Critical");

    const noEvidence = namespace.createAutomationFailureRecord({ category:"Execution", directCause:"Runtime Error", evidence:[] });
    check("Failure without Evidence is blocked", Boolean(noEvidence&&noEvidence.ok===false&&noEvidence.code==="IDE190_FAILURE_EVIDENCE_REQUIRED"), noEvidence&&noEvidence.code, "Failure", "Critical");
    const policyFailure = namespace.createAutomationFailureRecord({ sourcePhase:7, category:"Policy", directCause:"Persistent Commit Requested", mutationStarted:false, rollbackVerified:false, sourceRestored:false, evidence:[{type:"Policy",id:"P4"}] });
    const policyRecord = policyFailure&&policyFailure.data&&policyFailure.data.failure;
    check("Policy Failure is Non-Retryable", Boolean(policyRecord&&policyRecord.retryEligibility==="Non-Retryable"&&policyRecord.automaticRetryAllowed===false), policyRecord&&policyRecord.retryEligibility, "Failure", "Critical");
    check("Policy Failure Root Cause is not inferred", Boolean(policyRecord&&policyRecord.rootCauseInferred===false), policyRecord&&policyRecord.rootCauseInferred, "Failure", "Critical");

    const missingTimeout = namespace.startAutomationTimeoutWatch({operationId:"PHASE7-NO-TIMEOUT",operationType:"Validation"});
    check("Timeout duration has no hidden default", Boolean(missingTimeout&&missingTimeout.ok===false&&missingTimeout.code==="IDE190_TIMEOUT_EXPLICIT_DURATION_REQUIRED"), missingTimeout&&missingTimeout.code, "Timeout", "Critical");
    const watchResult = namespace.startAutomationTimeoutWatch({operationId:"PHASE7-PRE-MUTATION",operationType:"Read-Only Operation",timeoutMs:20,startedAtMs:1000,mutationPossible:false});
    const watch = watchResult&&watchResult.data&&watchResult.data.timeoutWatch;
    check("Explicit Timeout Watch starts", Boolean(watchResult&&watchResult.ok&&watch&&watch.defaultTimeoutUsed===false), watchResult&&watchResult.code, "Timeout", "Critical");
    const beforeDeadline = namespace.evaluateAutomationTimeoutWatch(watch.timeoutWatchId,{nowMs:1010,mutationStarted:false});
    check("Timeout Watch remains active before deadline", Boolean(beforeDeadline&&beforeDeadline.ok&&beforeDeadline.code==="IDE190_TIMEOUT_NOT_EXPIRED"), beforeDeadline&&beforeDeadline.code, "Timeout", "Critical");
    const trustBeforePreTimeout = internal.clone(state.repositoryMutationTrust);
    const timedOut = namespace.evaluateAutomationTimeoutWatch(watch.timeoutWatchId,{nowMs:1025,mutationStarted:false});
    const timeoutRecord = timedOut&&timedOut.data&&timedOut.data.timeoutRecord;
    check("Pre-Mutation operation becomes Timed-Out", Boolean(timeoutRecord&&timeoutRecord.outcome==="Timed-Out"&&timeoutRecord.recoveryRequired===false), timeoutRecord&&timeoutRecord.outcome, "Timeout", "Critical");
    check("Pre-Mutation Timeout never auto-retries", Boolean(timeoutRecord&&timeoutRecord.automaticRetryAllowed===false), timeoutRecord&&timeoutRecord.automaticRetryAllowed, "Timeout", "Critical");
    check("Pre-Mutation Timeout does not mark Repository Untrusted", state.repositoryMutationTrust.status === trustBeforePreTimeout.status, state.repositoryMutationTrust.status, "Timeout", "Critical");
    check("Timeout Record Contract validates", Boolean(timeoutRecord&&namespace.validateContract("timeoutRecord",timeoutRecord).valid), timeoutRecord&&timeoutRecord.timeoutRecordId, "Contracts", "Critical");

    const timeoutStateSnapshot = capturePhase7RuntimeState();
    try {
      state.repositoryMutationTrust = {status:"Trusted",reason:"",mutationTrialId:null,rollbackId:null,markedAt:null};
      const mutationWatchResult = namespace.startAutomationTimeoutWatch({operationId:"PHASE7-MUTATION-TIMEOUT",operationType:"Controlled Mutation Trial",timeoutMs:10,startedAtMs:2000,mutationPossible:true});
      const mutationWatch = mutationWatchResult.data.timeoutWatch;
      const mutationTimeout = namespace.evaluateAutomationTimeoutWatch(mutationWatch.timeoutWatchId,{nowMs:2015,mutationStarted:true,rollbackVerified:false,sourceRestored:false,sourceRecordId:"PHASE7-MUTATION-TIMEOUT"});
      const mutationTimeoutRecord = mutationTimeout&&mutationTimeout.data&&mutationTimeout.data.timeoutRecord;
      check("Timed-out Mutation requires Recovery", Boolean(mutationTimeoutRecord&&mutationTimeoutRecord.recoveryRequired===true), mutationTimeoutRecord&&mutationTimeoutRecord.recoveryRequired, "Timeout", "Critical");
      check("Timed-out unverified Mutation marks Repository Untrusted", state.repositoryMutationTrust.status==="Untrusted", state.repositoryMutationTrust.status, "Timeout", "Critical");
      check("Timed-out Mutation remains non-automatic Retry", Boolean(mutationTimeoutRecord&&mutationTimeoutRecord.automaticRetryAllowed===false), mutationTimeoutRecord&&mutationTimeoutRecord.automaticRetryAllowed, "Timeout", "Critical");
    } finally {
      restorePhase7RuntimeState(timeoutStateSnapshot);
    }

    await validateRecoveryIsolation(check);
    validateInterruptedLockRecovery(check);

    check("Repository is Trusted after isolated recovery validation", namespace.getAutomationMutationTrustStatus().status === "Trusted", namespace.getAutomationMutationTrustStatus().status, "Repository Trust", "Critical");
    check("Mutation Lock is inactive after isolated recovery validation", namespace.getAutomationMutationLockStatus().active === false, namespace.getAutomationMutationLockStatus().active, "Mutation Lock", "Critical");
    check("Phase 7 performs no automatic Repository repair", namespace.modules.recovery.automaticRepairImplemented === false, namespace.modules.recovery.automaticRepairImplemented, "Recovery Boundary", "Critical");
    check("Phase 7 permits no direct IDE-150 Recovery call", namespace.modules.recovery.directIDE150RecoveryCallAllowed === false, namespace.modules.recovery.directIDE150RecoveryCallAllowed, "Recovery Boundary", "Critical");
    check("Phase 7 Timeout has no default duration", namespace.modules.timeout.defaultTimeoutMs === null && namespace.modules.timeout.explicitTimeoutRequired === true, namespace.modules.timeout.defaultTimeoutMs, "Timeout", "Critical");

    const result = summarize(checks,"IDE-190-PHASE7-STAGE-A-VALIDATION","IDE-190 Phase 7 Stage A Failure / Timeout / Recovery PASS","IDE-190 Phase 7 Stage A Failure / Timeout / Recovery FAIL",{
      stage:"A",stageName:"Phase 7 Deterministic / Pre-Android Validation",phase7Complete:false,phase8Allowed:false,androidRealDeviceRequired:true,androidRealDevicePassed:false,releaseAllowed:false,ide190Complete:false,repositoryTrustStatus:namespace.getAutomationMutationTrustStatus().status,mutationLockActive:namespace.getAutomationMutationLockStatus().active,defaultTimeoutConfigured:false
    });
    internal.markPhase7Validation(result);
    return internal.clone(result);
  }

  async function runDevelopmentAutomationPhase7AndroidValidation() {
    const preDevice = await runDevelopmentAutomationPhase7Validation();
    const c = collector(), checks = c.checks, check = c.check;
    check("Phase 7 Stage A is PASS", preDevice.failed===0&&preDevice.criticalFailed===0, preDevice.status, "Stage A", "Critical");
    const userAgent = global.navigator&&global.navigator.userAgent||"";
    check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Runtime", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto&&global.crypto.subtle&&typeof global.TextEncoder==="function"), Boolean(global.crypto&&global.crypto.subtle), "Android Runtime", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android Runtime", "Critical");
    check("Fetch API is available", typeof global.fetch==="function", typeof global.fetch, "Android Runtime", "Critical");
    const loaded=getLoadedScriptPaths();
    EXPECTED_PHASE7_SCRIPT_FILES.forEach(function(file){ check("Actual script loaded: "+file, loaded.includes(file), loaded.length, "Actual Script Loading", "Critical"); });
    let manifestLoad=null;
    if(typeof global.loadStaticScriptManifest==="function"){try{manifestLoad=await global.loadStaticScriptManifest();}catch(error){manifestLoad={ok:false,errors:[error&&error.message?error.message:String(error)]};}}
    check("Static Manifest loader API is available", typeof global.loadStaticScriptManifest==="function", typeof global.loadStaticScriptManifest, "Static Integrity", "Critical");
    check("Static Manifest fetch/integrity succeeds", Boolean(manifestLoad&&manifestLoad.ok===true), manifestLoad&&manifestLoad.errors||[], "Static Integrity", "Critical");
    if(manifestLoad&&manifestLoad.manifest){
      const normalized=(manifestLoad.manifest.scripts||[]).map(function(src){return String(src||"").split("?")[0].split("#")[0].replace(/^\.\//,"");});
      EXPECTED_PHASE7_SCRIPT_FILES.forEach(function(file){
        check("Static Manifest contains: "+file, normalized.includes(file), normalized.length, "Static Integrity", "Critical");
        const hash=manifestLoad.manifest.hashes&&manifestLoad.manifest.hashes[file];
        check("Static Manifest has SHA-256: "+file, Boolean(hash&&/^[a-f0-9]{64}$/.test(String(hash.sha256||""))), hash&&hash.sha256, "Static Integrity", "Critical");
      });
    }
    const androidWatchResult=namespace.startAutomationTimeoutWatch({operationId:"PHASE7-ANDROID-TIMEOUT",operationType:"Android Timeout Observation",timeoutMs:5,startedAtMs:100,mutationPossible:false});
    const androidWatch=androidWatchResult&&androidWatchResult.data&&androidWatchResult.data.timeoutWatch;
    const androidTimeout=androidWatch?namespace.evaluateAutomationTimeoutWatch(androidWatch.timeoutWatchId,{nowMs:106,mutationStarted:false}):null;
    check("Android explicit Timeout observation works", Boolean(androidTimeout&&androidTimeout.ok&&androidTimeout.code==="IDE190_OPERATION_TIMED_OUT"), androidTimeout&&androidTimeout.code, "Timeout", "Critical");
    check("Android Timeout does not escalate device permission", namespace.getPlatformProfile().approvalBypassAllowed===false&&namespace.getPlatformProfile().persistentCommitPermission===false, namespace.getPlatformProfile().approvalBypassAllowed, "Cross-Device", "Critical");
    check("Android Repository remains Trusted", namespace.getAutomationMutationTrustStatus().status==="Trusted", namespace.getAutomationMutationTrustStatus().status, "Repository Trust", "Critical");
    check("Android Mutation Lock remains released", namespace.getAutomationMutationLockStatus().active===false, namespace.getAutomationMutationLockStatus().active, "Mutation Lock", "Critical");
    const ide160Recovery=namespace.getIDE160RecoveryCapabilityStatus();
    check("Android sees IDE-160 Failure/Recovery APIs", ide160Recovery.createWorkflowFailure&&ide160Recovery.createWorkflowRecoveryDecision&&ide160Recovery.createWorkflowRetryAttempt, JSON.stringify(ide160Recovery), "IDE-160 Recovery", "Critical");
    check("Android cannot auto-repair Repository", namespace.modules.recovery.automaticRepairImplemented===false, namespace.modules.recovery.automaticRepairImplemented, "Recovery Boundary", "Critical");

    const combined=preDevice.checks.concat(checks);
    const allPassed=combined.every(function(item){return item.passed;});
    const result=summarize(combined,"IDE-190-PHASE7-ANDROID-VALIDATION","IDE-190 Phase 7 Android Real Device Gate PASS","IDE-190 Phase 7 Android Real Device Gate FAIL",{
      stage:"B",stageName:"Phase 7 Android Real Device Validation",preDeviceValidationId:preDevice.id,preDevicePassed:preDevice.failed===0&&preDevice.criticalFailed===0,androidRealDeviceRequired:true,androidRealDevicePassed:allPassed,phaseGatePassed:allPassed,phase7Complete:allPassed,phase8Allowed:allPassed,releaseAllowed:false,ide190Complete:false,repositoryTrustStatus:namespace.getAutomationMutationTrustStatus().status,mutationLockActive:namespace.getAutomationMutationLockStatus().active,defaultTimeoutConfigured:false,userAgent:userAgent
    });
    internal.markPhase7AndroidValidation(result);
    namespace.modules.phase7Validation.status=result.phaseGatePassed?"Phase 7 Gate Passed":"Blocked";
    return internal.clone(result);
  }

  function getDevelopmentAutomationPhase7ValidationStatus(){
    return {componentId:"IDE-190",version:VERSION_MANIFEST.release.version,preDevice:internal.clone(state.lastPhase7Validation),android:internal.clone(state.lastPhase7AndroidValidation),phaseGatePassed:state.androidPhase7ValidationPassed===true,phase7Complete:state.androidPhase7ValidationPassed===true,phase8Allowed:state.androidPhase7ValidationPassed===true,releaseAllowed:false,ide190Complete:false,repositoryTrustStatus:namespace.getAutomationMutationTrustStatus().status,mutationLockActive:namespace.getAutomationMutationLockStatus().active,defaultTimeoutConfigured:false};
  }

  Object.assign(namespace.api,{runDevelopmentAutomationPhase7Validation:runDevelopmentAutomationPhase7Validation,runDevelopmentAutomationPhase7AndroidValidation:runDevelopmentAutomationPhase7AndroidValidation,getDevelopmentAutomationPhase7ValidationStatus:getDevelopmentAutomationPhase7ValidationStatus});
  Object.assign(namespace,namespace.api);
  namespace.modules.phase7Validation={id:"IDE-190-PHASE7-VALIDATION",version:MODULE_VERSION,status:"Loaded",phase:7,phaseName:"Failure / Timeout / Recovery",androidRealDeviceRequired:true,repositoryRecoveryVerificationRequired:true,automaticRepairImplemented:false,phaseGate:true,releaseGate:false,loadedAt:internal.nowIso()};
  global.runDevelopmentAutomationPhase7Validation=runDevelopmentAutomationPhase7Validation;
  global.runDevelopmentAutomationPhase7AndroidValidation=runDevelopmentAutomationPhase7AndroidValidation;
  global.getDevelopmentAutomationPhase7ValidationStatus=getDevelopmentAutomationPhase7ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
