/* ============================================================
   FILE: 18_self_development_phase5_live_trial_bridge.js
   Decision 058 Phase 5A / REPOSITORY-010 Live Trial Readiness Bridge
   Candidate Hotfix: 0.5.7 / Persisted Live Evidence Recovery
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;
  const i = namespace.__internal;
  let recoveredLiveEvidence = null;

  function repo() { return global.REPOSITORY010LocalFirstRepository || null; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function statusCall(r, name) { try { return r && typeof r[name] === "function" ? r[name]() : null; } catch (_) { return null; } }
  function result(ok, code, status, data) { return Object.freeze({ ok: ok === true, code: code, status: status, data: data || null, at: new Date().toISOString() }); }
  function timeValue(value) { const n = Date.parse(String(value || "")); return Number.isFinite(n) ? n : 0; }
  function currentCanonicalRevisionId(r) {
    const state = r && r.__internal && r.__internal.state ? r.__internal.state : null;
    const baseline = state && state.lastCanonicalBaseline || null;
    return baseline && baseline.canonicalRevisionId || null;
  }
  function isExactSuccessfulPhase5TrialJournal(record, policy) {
    return Boolean(record && policy &&
      record.status === "TRIAL_ROLLED_BACK" &&
      record.forcedFailureTrial !== true &&
      record.targetFile === policy.targetFile &&
      record.targetFunction === policy.targetFunction &&
      record.physicalWritePerformed === true &&
      record.readbackVerified === true &&
      record.rollbackVerified === true &&
      record.repositoryRestored === true &&
      record.acceptanceTokenConsumed === true &&
      record.canonicalMutationPerformed === false &&
      record.persistentReflectionPerformed !== true &&
      record.canonicalRevisionPromoted !== true &&
      record.authorityEffect === "controlled-trial-only");
  }

  namespace.recoverSelfDevelopmentPhase5LiveEvidence = async function () {
    const r = repo();
    const policy = typeof namespace.getSelfDevelopmentPhase5LiveTrialPolicy === "function" ? namespace.getSelfDevelopmentPhase5LiveTrialPolicy() : null;
    if (!r || !policy) {
      recoveredLiveEvidence = null;
      return result(false, "SELFDEV058_PHASE5_LIVE_EVIDENCE_RECOVERY_UNAVAILABLE", "Blocked", { recovered: false, authorityEffect: "none" });
    }
    if (typeof r.initializeControlledTransactionPersistence !== "function" || typeof r.listControlledTransactionRecords !== "function") {
      recoveredLiveEvidence = null;
      return result(false, "SELFDEV058_PHASE5_LIVE_EVIDENCE_PERSISTENCE_API_UNAVAILABLE", "Blocked", { recovered: false, authorityEffect: "none" });
    }
    const initialized = await r.initializeControlledTransactionPersistence();
    if (!initialized || initialized.ok !== true) {
      recoveredLiveEvidence = null;
      return result(false, "SELFDEV058_PHASE5_LIVE_EVIDENCE_PERSISTENCE_BLOCKED", "Blocked", { recovered: false, repositoryResult: initialized, authorityEffect: "none" });
    }
    const journals = await r.listControlledTransactionRecords("transactionJournal");
    const eligible = (Array.isArray(journals) ? journals : []).filter(function (record) {
      return isExactSuccessfulPhase5TrialJournal(record, policy);
    }).sort(function (a, b) {
      return timeValue(a.updatedAt || a.rollbackCompletedAt || a.createdAt) - timeValue(b.updatedAt || b.rollbackCompletedAt || b.createdAt);
    });
    const selected = eligible.length ? eligible[eligible.length - 1] : null;
    if (!selected) {
      recoveredLiveEvidence = null;
      return result(true, "SELFDEV058_PHASE5_LIVE_EVIDENCE_NOT_FOUND", "Pending", {
        recovered: false,
        scannedJournalCount: Array.isArray(journals) ? journals.length : 0,
        eligibleJournalCount: 0,
        currentCanonicalRevisionId: currentCanonicalRevisionId(r),
        repositoryWriteAttempted: false,
        canonicalMutationPerformed: false,
        authorityEffect: "none"
      });
    }
    recoveredLiveEvidence = Object.freeze(Object.assign({}, clone(selected), {
      evidenceSource: "REPOSITORY-010_PERSISTED_TRANSACTION_JOURNAL",
      recoveredFromPersistence: true,
      recoveredAt: new Date().toISOString(),
      sourceCanonicalRevisionId: selected.canonicalRevisionId || selected.baseRevisionId || null,
      currentCanonicalRevisionId: currentCanonicalRevisionId(r),
      repositoryWriteAttemptedByRecovery: false,
      canonicalMutationPerformed: false,
      persistentReflectionPerformed: false,
      baselinePromotionPerformed: false,
      authorityEffect: "controlled-trial-only",
      immutable: true
    }));
    return result(true, "SELFDEV058_PHASE5_LIVE_EVIDENCE_RECOVERED", "Recovered / Verified", {
      recovered: true,
      evidence: clone(recoveredLiveEvidence),
      scannedJournalCount: Array.isArray(journals) ? journals.length : 0,
      eligibleJournalCount: eligible.length,
      crossRevisionEvidenceReuse: Boolean(recoveredLiveEvidence.sourceCanonicalRevisionId && recoveredLiveEvidence.currentCanonicalRevisionId && recoveredLiveEvidence.sourceCanonicalRevisionId !== recoveredLiveEvidence.currentCanonicalRevisionId),
      repositoryWriteAttempted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none"
    });
  };

  namespace.getSelfDevelopmentPhase5RecoveredLiveEvidence = function () {
    return recoveredLiveEvidence ? clone(recoveredLiveEvidence) : null;
  };

  namespace.inspectSelfDevelopmentPhase5LiveTrialReadiness = function () {
    const r = repo();
    const ua = global.navigator && global.navigator.userAgent ? String(global.navigator.userAgent) : "";
    const android = /Android/i.test(ua);
    const capabilities = {
      repositoryAvailable: Boolean(r),
      baselineStatusApi: Boolean(r && typeof r.getCanonicalBaselineStatus === "function") || Boolean(r && typeof r.getStatus === "function"),
      mutationPackageApi: Boolean(r && typeof r.prepareHybridMutationPackage === "function"),
      acceptanceTokenIssueApi: Boolean(r && typeof r.issueManualAcceptanceToken === "function"),
      acceptanceTokenValidationApi: Boolean(r && typeof r.validateAcceptanceToken === "function"),
      controlledTransactionTrialApi: Boolean(r && typeof r.executeControlledTransactionTrial === "function"),
      restrictedWriteSelectionApi: Boolean(r && typeof r.selectRestrictedDesktopWriteDirectory === "function"),
      pendingRecoveryApi: Boolean(r && typeof r.listPendingControlledTransactionRecoveries === "function"),
      recoveryApi: Boolean(r && typeof r.recoverControlledTransactionTrial === "function"),
      persistedTrialEvidenceReadApi: Boolean(r && typeof r.initializeControlledTransactionPersistence === "function" && typeof r.listControlledTransactionRecords === "function")
    };
    const s = statusCall(r, "getStatus");
    const tokenStatus = statusCall(r, "getAcceptanceTokenStatus");
    const txStatus = statusCall(r, "getControlledTransactionStatus");
    const writeStatus = statusCall(r, "getRestrictedDesktopWriteAdapterStatus");
    const readyForLiveTrialPreparation = !android && Object.keys(capabilities).every(function (k) { return capabilities[k] === true; });
    return Object.freeze({
      readinessId: i.nextId("SELFDEV058-PHASE5-READINESS"),
      readOnly: true,
      platform: android ? "ANDROID_NO_WRITE" : "PC_DESKTOP_CANDIDATE",
      androidLiveWriteAllowed: false,
      capabilities: capabilities,
      repositoryStatus: s,
      acceptanceTokenStatus: tokenStatus,
      controlledTransactionStatus: txStatus,
      restrictedWriteAdapterStatus: writeStatus,
      recoveredLiveEvidence: recoveredLiveEvidence ? clone(recoveredLiveEvidence) : null,
      readyForLiveTrialPreparation: readyForLiveTrialPreparation,
      acceptanceTokenIssued: false,
      controlledTransactionExecuted: false,
      physicalWritePerformed: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      inspectedAt: new Date().toISOString(),
      immutable: true
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
