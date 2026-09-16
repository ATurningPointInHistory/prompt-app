/* ============================================================
   FILE: 18_self_development_phase5_live_trial_bridge.js
   Decision 058 Phase 5A / REPOSITORY-010 Live Trial Readiness Bridge
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;
  const i = namespace.__internal;
  function repo() { return global.REPOSITORY010LocalFirstRepository || null; }
  function statusCall(r, name) { try { return r && typeof r[name] === "function" ? r[name]() : null; } catch (_) { return null; } }
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
      recoveryApi: Boolean(r && typeof r.recoverControlledTransactionTrial === "function")
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
