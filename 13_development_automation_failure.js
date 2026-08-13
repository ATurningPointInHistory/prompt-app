/* ============================================================
   FILE: 13_development_automation_failure.js
   IDE-190 Development Automation
   Release: 1.6.0 / Module: Failure 1.0.0
   Phase 7: Failure / Timeout / Recovery
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 failure module blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("failure");
  const CATEGORIES = VERSION_MANIFEST.failureCategories.slice();
  const OUTCOMES = VERSION_MANIFEST.outcomes.slice();
  const SEVERITIES = ["Critical", "High", "Medium", "Low"];
  const RETRY = ["Retryable", "Conditionally Retryable", "Non-Retryable"];

  function ensureRuntimeState() {
    if (!(state.failureRecords instanceof Map)) state.failureRecords = new Map();
    if (!Object.prototype.hasOwnProperty.call(state, "latestFailureRecordId")) state.latestFailureRecordId = null;
  }
  ensureRuntimeState();

  function normalizeCategory(value) {
    const source = internal.text(value, "");
    return CATEGORIES.includes(source) ? source : "Unknown";
  }

  function derivePolicy(category, input) {
    const source = internal.isPlainObject(input) ? input : {};
    const mutationStarted = source.mutationStarted === true;
    const rollbackVerified = source.rollbackVerified === true;
    const sourceRestored = source.sourceRestored === true;
    const evidencePresent = Array.isArray(source.evidence) && source.evidence.length > 0;
    const explicitRootCause = internal.text(source.directCause, "");

    if (["Repository Integrity", "Rollback"].includes(category)) {
      return { severity: "Critical", retryEligibility: "Non-Retryable", recoveryRequired: true, automaticRetryAllowed: false };
    }
    if (category === "Policy" || category === "Approval") {
      return { severity: "High", retryEligibility: "Non-Retryable", recoveryRequired: false, automaticRetryAllowed: false };
    }
    if (category === "Unknown" || !evidencePresent || !explicitRootCause) {
      return { severity: category === "Unknown" ? "High" : "Medium", retryEligibility: "Non-Retryable", recoveryRequired: mutationStarted && (!rollbackVerified || !sourceRestored), automaticRetryAllowed: false };
    }
    if (category === "Execution" && mutationStarted && (!rollbackVerified || !sourceRestored)) {
      return { severity: "Critical", retryEligibility: "Non-Retryable", recoveryRequired: true, automaticRetryAllowed: false };
    }
    if (category === "Validation" && mutationStarted) {
      return { severity: "High", retryEligibility: rollbackVerified && sourceRestored ? "Conditionally Retryable" : "Non-Retryable", recoveryRequired: !rollbackVerified || !sourceRestored, automaticRetryAllowed: false };
    }
    if (category === "Dependency" || category === "Input" || category === "Persistence" || category === "System") {
      return { severity: "Medium", retryEligibility: mutationStarted ? "Conditionally Retryable" : "Retryable", recoveryRequired: mutationStarted && (!rollbackVerified || !sourceRestored), automaticRetryAllowed: false };
    }
    return { severity: "Medium", retryEligibility: "Conditionally Retryable", recoveryRequired: false, automaticRetryAllowed: false };
  }

  function createAutomationFailureRecord(input) {
    ensureRuntimeState();
    const source = internal.isPlainObject(input) ? input : {};
    const category = normalizeCategory(source.category);
    const evidence = Array.isArray(source.evidence) ? source.evidence.filter(Boolean).map(internal.clone) : [];
    if (!evidence.length) {
      return internal.buildResult(false, "IDE190_FAILURE_EVIDENCE_REQUIRED", "Blocked", null, {
        error: { message: "Failure Evidence is required. Root cause must not be inferred.", category: "Input" }
      });
    }
    const policy = derivePolicy(category, Object.assign({}, source, { evidence: evidence }));
    const requestedSeverity = internal.text(source.severity, "");
    const severity = SEVERITIES.includes(requestedSeverity) && SEVERITIES.indexOf(requestedSeverity) <= SEVERITIES.indexOf(policy.severity)
      ? requestedSeverity
      : policy.severity;
    const requestedRetry = internal.text(source.retryEligibility, "");
    const retryEligibility = RETRY.includes(requestedRetry) && policy.retryEligibility !== "Non-Retryable"
      ? requestedRetry
      : policy.retryEligibility;
    const requestedOutcome = internal.text(source.outcome, policy.recoveryRequired ? "Recovery-Required" : "Failed");
    const outcome = OUTCOMES.includes(requestedOutcome) ? requestedOutcome : "Failed";
    const directCause = internal.text(source.directCause, "");

    const record = {
      failureRecordId: internal.nextId("IDE-190-FAILURE"),
      sourcePhase: Number.isInteger(source.sourcePhase) ? source.sourcePhase : VERSION_MANIFEST.implementation.phase,
      sourceRecordId: internal.text(source.sourceRecordId, "") || null,
      category: category,
      severity: severity,
      retryEligibility: retryEligibility,
      outcome: outcome,
      mutationStarted: source.mutationStarted === true,
      rollbackVerified: source.rollbackVerified === true,
      sourceRestored: source.sourceRestored === true,
      repositoryTrustStatus: state.repositoryMutationTrust && state.repositoryMutationTrust.status || "Trusted",
      recoveryRequired: policy.recoveryRequired === true,
      automaticRetryAllowed: false,
      directCause: directCause || null,
      rootCauseStatus: "Not Determined",
      rootCauseInferred: false,
      evidence: evidence,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("failureRecord", record);
    if (!contract.valid) {
      return internal.buildResult(false, "IDE190_FAILURE_CONTRACT_INVALID", "Blocked", { validation: contract });
    }
    const frozen = internal.deepFreeze(internal.clone(record));
    state.failureRecords.set(frozen.failureRecordId, frozen);
    state.latestFailureRecordId = frozen.failureRecordId;
    internal.touch();
    return internal.buildResult(true, "IDE190_FAILURE_RECORDED", outcome, { failure: internal.clone(frozen), validation: contract });
  }

  function getAutomationFailureRecord(id) {
    ensureRuntimeState();
    const key = internal.text(id, state.latestFailureRecordId || "");
    return internal.clone(state.failureRecords.get(key) || null);
  }
  function getLatestAutomationFailureRecord() { return getAutomationFailureRecord(state.latestFailureRecordId); }
  function listAutomationFailureRecords() {
    ensureRuntimeState();
    return Array.from(state.failureRecords.values()).map(internal.clone);
  }

  function initializeFailure() {
    ensureRuntimeState();
    namespace.modules.failure.status = "Ready";
    return internal.buildResult(true, "IDE190_FAILURE_INITIALIZED", "Ready", {
      categoryCount: CATEGORIES.length,
      automaticRetryDefault: false,
      rootCauseInferenceAllowed: false
    });
  }

  Object.assign(namespace.api, {
    initializeFailure: initializeFailure,
    createAutomationFailureRecord: createAutomationFailureRecord,
    getAutomationFailureRecord: getAutomationFailureRecord,
    getLatestAutomationFailureRecord: getLatestAutomationFailureRecord,
    listAutomationFailureRecords: listAutomationFailureRecords
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.failure = {
    id: "IDE-190-FAILURE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 7,
    rootCauseInferenceAllowed: false,
    automaticRetryImplemented: false,
    immutableFailureRecords: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
