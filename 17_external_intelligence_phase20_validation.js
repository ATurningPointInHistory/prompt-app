/* ============================================================
   FILE: 17_external_intelligence_phase20_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.19.0
   Phase 20 Functional Validation
   Decisions: 020 / 052
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase20Validation");

  async function runExternalIntelligencePhase20Validation() {
    if (typeof namespace.initializeExternalIntelligenceCapabilityResilience === "function") namespace.initializeExternalIntelligenceCapabilityResilience();
    if (typeof namespace.initializeExternalIntelligenceDisasterRecovery === "function") namespace.initializeExternalIntelligenceDisasterRecovery();
    const checks = [];
    const add = function add(name, passed, detail, group) {
      checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Phase 20", severity: "Critical" });
    };

    add("Release is Phase 20 v1.19.0 compatible", VM.isReleaseCompatibleFrom("1.19.0"), VM.release.version, "Foundation");
    add("Implementation Phase is Phase 20", VM.release.phase >= 20, VM.release, "Foundation");
    add("Gateway target is Phase 20 v1.5.0", VM.gateway.gatewayVersion === "1.5.0", VM.gateway.gatewayVersion, "Foundation");
    add("Decision 020 module is loaded", namespace.modules.capabilityResilience && namespace.modules.capabilityResilience.decisions.includes("020"), namespace.modules.capabilityResilience, "Decision Coverage");
    add("Decision 052 module is loaded", namespace.modules.disasterRecovery && namespace.modules.disasterRecovery.decisions.includes("052"), namespace.modules.disasterRecovery, "Decision Coverage");
    add("Supporting Decisions 013/051/054 remain attached to Phase 20 modules", ["013","051","054"].every(function (id) { return namespace.modules.capabilityResilience.decisions.includes(id) && namespace.modules.disasterRecovery.decisions.includes(id); }), { resilience: namespace.modules.capabilityResilience.decisions, recovery: namespace.modules.disasterRecovery.decisions }, "Decision Coverage");

    const contractKeys = ["componentHealthRecord", "capabilityHealthDefinition", "capabilityHealthRecord", "recoveryActivity", "recoveryPointRecord", "queueRecoveryReconciliation", "watchRecoveryReconciliation", "restoreValidationRecord"];
    add("Phase 20 contracts are registered", contractKeys.every(function exists(k) { return !!namespace.getExternalIntelligenceContract(k); }), contractKeys, "Contract");
    const schemaIds = ["EXTERNAL-010-SCHEMA-COMPONENT-HEALTH", "EXTERNAL-010-SCHEMA-CAPABILITY-HEALTH-DEFINITION", "EXTERNAL-010-SCHEMA-CAPABILITY-HEALTH-RECORD", "EXTERNAL-010-SCHEMA-RECOVERY-ACTIVITY", "EXTERNAL-010-SCHEMA-RECOVERY-POINT", "EXTERNAL-010-SCHEMA-QUEUE-RECOVERY-RECONCILIATION", "EXTERNAL-010-SCHEMA-WATCH-RECOVERY-RECONCILIATION", "EXTERNAL-010-SCHEMA-RESTORE-VALIDATION"];
    add("Phase 20 schemas are registered", schemaIds.every(function exists(id) { return !!namespace.getExternalIntelligenceSchema(id); }), schemaIds, "Schema");

    const componentInputs = [
      { componentId:"GATEWAY", componentType:"GATEWAY", healthState:"READY", criticality:"REQUIRED" },
      { componentId:"SOURCE_ROUTER", componentType:"ROUTER", healthState:"READY", criticality:"REQUIRED" },
      { componentId:"NETWORK", componentType:"NETWORK", healthState:"UNAVAILABLE", criticality:"OPTIONAL", reasonCode:"NETWORK_OFFLINE" },
      { componentId:"SECRET_STORE", componentType:"SECRET_STORE", healthState:"UNKNOWN", criticality:"CRITICAL", securityCritical:true, reasonCode:"SECRET_STATE_UNKNOWN" },
      { componentId:"EVIDENCE_STORE", componentType:"STORAGE", healthState:"READY", criticality:"REQUIRED", offlineAvailable:true },
      { componentId:"MALWARE_SCANNER", componentType:"SCANNER", healthState:"UNAVAILABLE", criticality:"CRITICAL", securityCritical:true, reasonCode:"SCANNER_UNAVAILABLE" },
      { componentId:"PARSER", componentType:"PARSER", healthState:"READY", criticality:"REQUIRED" }
    ].map(namespace.reportExternalIntelligenceComponentHealth);
    add("Component Health contract records explicit failure states", componentInputs.every(function ok(r) { return r.ok; }), componentInputs, "Capability Health");

    const publicAcq = namespace.evaluateExternalIntelligenceCapabilityHealth({ capabilityId:"EXTERNAL-010-CAPABILITY-PUBLIC-EXTERNAL-ACQUISITION" });
    add("Optional Network failure degrades but does not falsely mark capability READY", publicAcq.ok && publicAcq.data.capabilityHealth.healthState === "DEGRADED" && publicAcq.data.capabilityHealth.unknownImpliesReady === false, publicAcq, "Capability Health");
    const authenticated = namespace.evaluateExternalIntelligenceCapabilityHealth({ capabilityId:"EXTERNAL-010-CAPABILITY-AUTHENTICATED-EXTERNAL-ACQUISITION" });
    add("Unknown security-critical Secret Store state fail-closes authenticated acquisition", authenticated.ok && authenticated.data.capabilityHealth.healthState === "BLOCKED", authenticated, "Capability Health");
    const scannedParse = namespace.evaluateExternalIntelligenceCapabilityHealth({ capabilityId:"EXTERNAL-010-CAPABILITY-SECURITY-SCANNED-PARSE" });
    add("Scanner unavailable cannot bypass required security scan", scannedParse.ok && scannedParse.data.capabilityHealth.healthState === "BLOCKED", scannedParse, "Security");
    namespace.reportExternalIntelligenceComponentHealth({ componentId:"GATEWAY", componentType:"GATEWAY", healthState:"UNAVAILABLE", reasonCode:"GATEWAY_OFFLINE", criticality:"OPTIONAL" });
    const historicalRead = namespace.evaluateExternalIntelligenceCapabilityHealth({ capabilityId:"EXTERNAL-010-CAPABILITY-EXISTING-EVIDENCE-READ" });
    add("Gateway failure does not imply existing Evidence/Core failure", historicalRead.ok && historicalRead.data.capabilityHealth.healthState === "DEGRADED" && namespace.modules.capabilityResilience.gatewayFailureImpliesCoreFailure === false, historicalRead, "Degraded Operation");

    const recoveryStarted = await namespace.beginExternalIntelligenceRecoveryActivity({ scope:"GATEWAY", details:{ reasonCode:"GATEWAY_RESTART" } });
    const recoveryCompleted = recoveryStarted.ok ? await namespace.completeExternalIntelligenceRecoveryActivity({ recoveryActivityId: recoveryStarted.data.recoveryActivity.recoveryActivityId, validationState:"PASS", details:{ compatibility:"PASS", integrity:"PASS" } }) : null;
    add("Recovery requires explicit validation before controlled resume", recoveryStarted.ok && recoveryCompleted && recoveryCompleted.ok && recoveryCompleted.data.recoveryActivity.controlledResumeAllowed === true && recoveryCompleted.data.recoveryActivity.authorityEscalationPerformed === false, { recoveryStarted, recoveryCompleted }, "Recovery");

    const syntheticPoint = {
      recoveryPointId:"EXTERNAL-010-RECOVERY-POINT-P20-FUNCTIONAL", recoveryPointType:"CHECKPOINT", createdAt:internal.nowIso(), recoveryPointState:"VALID", manifestHash:"a".repeat(64), applicationConsistentSnapshot:true,
      credentialMaterialPresent:false, secretValuesIncluded:false, gatewaySessionTokensIncluded:false, backupExistsEqualsRecoveryProven:false
    };
    const recordedPoint = namespace.recordExternalIntelligenceRecoveryPointFromGateway(syntheticPoint);
    add("Recovery Point record refuses credential-bearing backup semantics", recordedPoint.ok && recordedPoint.data.recoveryPoint.credentialMaterialPresent === false && recordedPoint.data.recoveryPoint.backupExistsEqualsRecoveryProven === false, recordedPoint, "Recovery Point");
    const badPoint = namespace.recordExternalIntelligenceRecoveryPointFromGateway(Object.assign({}, syntheticPoint, { recoveryPointId:"EXTERNAL-010-RECOVERY-POINT-P20-BAD", gatewaySessionTokensIncluded:true }));
    add("Gateway Session tokens cannot be admitted into Recovery Point metadata", badPoint.ok === false, badPoint, "Session Boundary");

    const queueRecovery = namespace.buildExternalIntelligenceQueueRecoveryReconciliation({ items:[
      { jobId:"JOB-RUNNING", requestId:"REQ-1", status:"RUNNING" },
      { jobId:"JOB-QUEUED", requestId:"REQ-2", status:"QUEUED" },
      { jobId:"JOB-COMPLETE", requestId:"REQ-3", status:"COMPLETED" }
    ]});
    const running = queueRecovery.ok ? queueRecovery.data.reconciliation.items.find(function f(i) { return i.jobId === "JOB-RUNNING"; }) : null;
    add("Restored RUNNING work becomes UNKNOWN_EXECUTION_STATE and is not blindly retried", queueRecovery.ok && running && running.restoredStatus === "UNKNOWN_EXECUTION_STATE" && running.requiresExternalVerification === true && queueRecovery.data.reconciliation.blindRetryAllowed === false, queueRecovery, "Queue Recovery");

    const watchRecovery = namespace.buildExternalIntelligenceWatchRecoveryReconciliation({ restoredAt:"2026-09-12T12:00:00Z", items:[
      { watchId:"WATCH-OVERDUE", watchState:"ACTIVE", nextCheckAt:"2026-09-10T00:00:00Z", catchUpStrategy:"LATEST_ONLY" },
      { watchId:"WATCH-FUTURE", watchState:"ACTIVE", nextCheckAt:"2026-09-13T00:00:00Z", catchUpStrategy:"LATEST_ONLY" }
    ]});
    const overdue = watchRecovery.ok ? watchRecovery.data.reconciliation.items.find(function f(i) { return i.watchId === "WATCH-OVERDUE"; }) : null;
    add("Overdue Watch becomes Monitoring Gap and does not unlimited-catch-up", watchRecovery.ok && overdue && overdue.recoveryState === "MONITORING_GAP" && overdue.noObservationEqualsNoChange === false && watchRecovery.data.reconciliation.unlimitedCatchupAllowed === false, watchRecovery, "Watch Recovery");

    const partialValidation = namespace.validateExternalIntelligenceRestoredState({ recoveryPointId:syntheticPoint.recoveryPointId, recoveryEpoch:"RECOVERY-EPOCH-P20-PARTIAL", physicalIntegrityState:"PASS", policyReconciliationState:"UNKNOWN", queueReconciliationState:"PASS", watchReconciliationState:"PASS", sessionIsolationState:"PASS", secretBoundaryState:"PASS", lineageIntegrityState:"PASS", schemaCompatibilityState:"PASS" });
    const partialRestore = partialValidation && partialValidation.data && partialValidation.data.restoreValidation;
    add("Files restored do not become Platform READY while policy state is unresolved", partialValidation.ok === false && partialRestore && partialRestore.platformReady === false && partialRestore.recoveryState === "PARTIAL_RECOVERY", partialValidation, "Restore Validation");
    const fullValidation = namespace.validateExternalIntelligenceRestoredState({ recoveryPointId:syntheticPoint.recoveryPointId, recoveryEpoch:"RECOVERY-EPOCH-P20", physicalIntegrityState:"PASS", policyReconciliationState:"PASS", queueReconciliationState:"PASS", watchReconciliationState:"PASS", sessionIsolationState:"PASS", secretBoundaryState:"PASS", lineageIntegrityState:"PASS", schemaCompatibilityState:"PASS" });
    add("Platform READY requires physical/policy/queue/watch/session/secret/lineage/schema validation", fullValidation.ok && fullValidation.data.restoreValidation.platformReady === true && fullValidation.data.restoreValidation.filesRestoredEqualsPlatformReady === false && fullValidation.data.restoreValidation.recoveryEqualsAuthority === false, fullValidation, "Restore Validation");

    add("Decision 054 recovery/session rules are encoded in manifest safety", VM.safety.restoredSessionRecordEqualsCurrentAuthentication === false && VM.safety.evidenceBackupMayReconstructCredential === false, VM.safety, "Session Boundary");
    add("Gateway recovery API is session-scoped and memory-only session boundary remains", VM.gateway.recoveryScope === "MANAGE_RECOVERY" && VM.gateway.sessionTokenStorage === "memory-only", VM.gateway, "Session Boundary");
    add("Recovery cannot create Business/Trading/Repository authority", namespace.modules.capabilityResilience.recoveryImpliesAuthorityEscalation === false && namespace.modules.disasterRecovery.recoveryEqualsBusinessAuthority === false && VM.safety.recoveryGrantsBusinessAuthority === false, { resilience:namespace.modules.capabilityResilience, recovery:namespace.modules.disasterRecovery, safety:VM.safety }, "Authority");
    add("Orphan detection does not imply automatic deletion", namespace.modules.disasterRecovery.automaticOrphanDeletionAllowed === false && VM.safety.orphanDetectionGrantsDeletionAuthority === false, { recovery:namespace.modules.disasterRecovery, safety:VM.safety }, "Authority");
    add("Phase 19 FINANCE boundary remains intact", namespace.modules.strategyExperiment && namespace.modules.strategyExperiment.tradingAuthorityGranted === false && namespace.modules.strategyExperiment.realMoneyAuthorityGranted === false && namespace.modules.strategyExperiment.capitalExpansionAuthorityGranted === false, namespace.modules.strategyExperiment, "Regression");
    add("Phase 16 Monitoring Gap semantics remain intact", !!namespace.modules.monitoringWatch && namespace.modules.monitoringWatch.monitoringGapExplicit === true && VM.safety.noObservationEqualsNoChange === false, namespace.modules.monitoringWatch, "Regression");
    add("Phase 06 Secret Reference-only boundary remains intact", namespace.modules.secretGovernance && namespace.modules.secretGovernance.referenceOnly === true && namespace.modules.secretGovernance.secretValueApiAvailable === false, namespace.modules.secretGovernance, "Regression");
    add("Phase 02 Runtime no-blind-retry boundary remains intact", VM.safety.blindRetryUnknownExecutionAllowed === false && !!namespace.modules.runtimeCoordination, namespace.modules.runtimeCoordination, "Regression");

    const failed = checks.filter(function f(c) { return !c.passed; });
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE20-VALIDATION"), componentId:"EXTERNAL-010", version:VM.release.version, gatewayVersion:VM.gateway.gatewayVersion,
      implementationPhase:VM.release.implementationPhase, decisionCoverage:54, requirementCoverage:{ decision020:true, decision052:true, supporting013:true, supporting051:true, supporting054:true },
      passed:checks.length-failed.length, failed:failed.length, total:checks.length, health:checks.length ? Math.round((checks.length-failed.length)*1000/checks.length)/10 : 0,
      criticalFailed:failed.length, status:failed.length ? "EXTERNAL-010 Phase 20 Validation FAILED" : "EXTERNAL-010 Phase 20 Validation PASS",
      releaseAllowed:failed.length===0, phase20Complete:failed.length===0, phase21Allowed:failed.length===0, checks, validatedAt:internal.nowIso(), immutable:true
    };
    state.latestPhase20Validation = internal.deepFreeze(internal.clone(result));
    return result;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase20Validation });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase20Validation = runExternalIntelligencePhase20Validation;
  namespace.modules.phase20Validation = { id:"EXTERNAL-010-PHASE20-VALIDATION", version:MODULE_VERSION, phase:20, decisions:["020","052"], status:"Ready" };
})(typeof window !== "undefined" ? window : globalThis);
