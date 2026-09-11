/* ============================================================
   FILE: 17_external_intelligence_phase16_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.15.0
   Phase 16: Adaptive Monitoring / Notification Governance Validation
   Primary Decisions: 045 / 046
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase16Validation");

  async function runExternalIntelligencePhase16Validation() {
    const checks = [];
    function add(name, passed, detail, group, severity) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Phase 16", severity: severity || "Critical" }); }

    add("Release is Phase 16 v1.15.0 compatible", VERSION_MANIFEST.isReleaseCompatibleFrom("1.15.0"), VERSION_MANIFEST.release.version, "Foundation");
    add("Implementation Phase is Phase 16", VERSION_MANIFEST.release.phase === 16, VERSION_MANIFEST.release.implementationPhase, "Foundation");
    add("Phase 16 primary Decisions are 045 / 046", namespace.modules.monitoringWatch.decisions.includes("045") && namespace.modules.notificationGovernance.decisions.includes("046"), { monitoring: namespace.modules.monitoringWatch, notification: namespace.modules.notificationGovernance }, "Foundation");
    add("Gateway remains unchanged at 1.4.0", VERSION_MANIFEST.gateway.gatewayVersion === "1.4.0", VERSION_MANIFEST.gateway.gatewayVersion, "Boundary");
    add("Phase 15 is marked complete and Phase 16 is allowed", VERSION_MANIFEST.implementation.phase15Complete === true && VERSION_MANIFEST.implementation.phase16Allowed === true, VERSION_MANIFEST.implementation, "Progression");

    const phase15 = await namespace.runExternalIntelligencePhase15Validation();
    const expectedFrozenPhaseChecks = new Set(["Implementation Phase is Phase 15", "Phase 14 regression remains PASS except expected frozen Phase identity check"]);
    const unexpected = phase15.checks.filter(function f(c) { return !c.passed && !expectedFrozenPhaseChecks.has(c.name); });
    add("Phase 15 regression remains PASS except expected frozen phase-context checks", unexpected.length === 0, { passed: phase15.passed, failed: phase15.failed, toleratedFrozenChecks: phase15.checks.filter(function f(c){ return !c.passed && expectedFrozenPhaseChecks.has(c.name); }).map(function m(c){ return c.name; }), unexpectedFailures: unexpected.map(function m(c) { return c.name; }) }, "Regression");

    const contracts = ["watchRecord","monitoringBaseline","monitoringObservation","materialChangeCandidate","monitoringGap","monitoringOutcomeEvaluation","notificationCandidate","notificationThread","notificationDelivery","phase16ValidationResult"];
    add("Phase 16 contracts are registered", contracts.every(function has(k) { return Boolean(namespace.getExternalIntelligenceContract(k)); }), contracts, "Contract");
    const schemas = ["EXTERNAL-010-SCHEMA-WATCH-RECORD","EXTERNAL-010-SCHEMA-MONITORING-BASELINE","EXTERNAL-010-SCHEMA-MONITORING-OBSERVATION","EXTERNAL-010-SCHEMA-MATERIAL-CHANGE-CANDIDATE","EXTERNAL-010-SCHEMA-MONITORING-GAP","EXTERNAL-010-SCHEMA-MONITORING-OUTCOME-EVALUATION","EXTERNAL-010-SCHEMA-NOTIFICATION-CANDIDATE","EXTERNAL-010-SCHEMA-NOTIFICATION-THREAD","EXTERNAL-010-SCHEMA-NOTIFICATION-DELIVERY","EXTERNAL-010-SCHEMA-PHASE16-VALIDATION-RESULT"];
    add("Phase 16 schemas are registered", schemas.every(function has(id) { return Boolean(namespace.getExternalIntelligenceSchema(id)); }), schemas, "Schema");

    const framework = namespace.getExternalIntelligenceMonitoringState();
    add("Monitoring uses persistent LocalStorage adapter in browser runtime", !global.localStorage || framework.persistenceAdapterId === "EXTERNAL-010-MONITORING-PERSISTENCE-LOCAL-STORAGE", framework, "Persistence");
    add("Current Phase 16 does not require 24/7 runtime", VERSION_MANIFEST.monitoring.alwaysOnRequired === false && VERSION_MANIFEST.monitoring.initialOperatingMode === "APP_START_DUE_WATCH", VERSION_MANIFEST.monitoring, "Runtime Boundary");

    const watchCandidate = namespace.createExternalIntelligenceWatchCandidate({ watchType: "ENTITY_WATCH", monitoringPurpose: "CURRENT_AWARENESS", targetEntityIds: ["ENTITY-P16"], targetSourceIds: [], monitoringModes: ["SCHEDULED_CHECK","CHANGE_DETECTION"], cadencePolicy: { normalIntervalMs: 3600000, escalatedIntervalMs: 300000, cooldownIntervalMs: 900000 }, nextCheckAt: "2026-09-10T00:00:00.000Z", catchUpStrategy: "MISSING_WINDOW_SUMMARY", createdBy: "PHASE16_VALIDATION" });
    const watch = watchCandidate.data && watchCandidate.data.watch;
    add("Stable Watch candidate is created as DRAFT without authority", watchCandidate.ok === true && watch.watchState === "DRAFT" && watch.researchGoalEqualsMonitoringGoal === false && watch.watchDefinitionEqualsScheduler === false, watchCandidate, "Watch");

    const deniedActivation = namespace.activateExternalIntelligenceWatch({ watchId: watch.watchId, purpose: "monitoring activation" });
    add("Watch activation fails closed without Decision 039 authority", deniedActivation.ok === false && deniedActivation.code === "EXTERNAL010_WATCH_ACTIVATION_AUTHORITY_DENIED", deniedActivation, "Authority");

    const priorApprovalAdapter = state.authorityApprovalAdapter;
    namespace.setExternalIntelligenceAuthorityApprovalAdapter({ adapterId: "PHASE16-VALIDATION-OWNER-APPROVAL", requiresExplicitOwnerInteraction: true, async verifyApproval() { return { approved: true, actorType: "Project Owner", interactionEvidenceId: "P16-VALIDATION-OWNER-EVIDENCE" }; } });
    const envelopeCandidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action: "ACTIVATE_MONITORING_WATCH", target: { type: "monitoring-watch", id: watch.watchId }, purpose: "monitoring activation", scope: { domain: "EXTERNAL-010", operation: "MONITOR" } });
    const envelopeId = envelopeCandidate.data && envelopeCandidate.data.envelope && envelopeCandidate.data.envelope.authorityEnvelopeId;
    const envelopeActive = envelopeId ? await namespace.activateExternalIntelligenceAuthorityEnvelope(envelopeId, { explicitOwnerInteraction: true }) : null;
    const activated = namespace.activateExternalIntelligenceWatch({ watchId: watch.watchId, purpose: "monitoring activation" });
    add("Explicit owner-backed scoped authority activates Watch", envelopeActive && envelopeActive.ok === true && activated.ok === true && activated.data.watch.watchState === "ACTIVE", { envelopeActive: envelopeActive, activated: activated }, "Authority");
    if (envelopeId) namespace.revokeExternalIntelligenceAuthorityEnvelope(envelopeId, "Phase16 validation cleanup");
    namespace.setExternalIntelligenceAuthorityApprovalAdapter(priorApprovalAdapter || null);

    const baseline = namespace.createExternalIntelligenceMonitoringBaseline({ watchId: watch.watchId, snapshotRefs: ["SNAPSHOT-P16-A"], contentHash: "HASH-P16-A" });
    add("Monitoring Baseline is versioned and linked to Watch", baseline.ok === true && baseline.data.baseline.baselineVersion === 1 && baseline.data.watch.baselineId === baseline.data.baseline.baselineId, baseline, "Baseline");

    const due = namespace.listExternalIntelligenceDueWatches("2026-09-11T00:00:00.000Z");
    add("On-demand runtime detects due Watch without requiring background service", due.some(function f(w) { return w.watchId === watch.watchId; }), due.map(function m(w) { return w.watchId; }), "Scheduler Hook");

    const escalated = namespace.applyExternalIntelligenceMonitoringCadence({ watchId: watch.watchId, currentRisk: "HIGH", signalActivity: "SPIKE", materialChangeDetected: true });
    add("Adaptive Cadence can escalate without bypassing policy/budget", escalated.ok === true && escalated.data.evaluation.cadenceState === "ESCALATED" && escalated.data.evaluation.hardBudgetBypassAllowed === false && escalated.data.evaluation.sourceRateLimitBypassAllowed === false, escalated, "Adaptive Cadence");
    const cooldown = namespace.applyExternalIntelligenceMonitoringCadence({ watchId: watch.watchId, currentRisk: "NORMAL", signalActivity: "NORMAL", stabilized: true });
    add("Escalated monitoring enters COOLDOWN instead of remaining high-frequency forever", cooldown.ok === true && cooldown.data.evaluation.cadenceState === "COOLDOWN", cooldown, "Adaptive Cadence");

    const obs1 = namespace.recordExternalIntelligenceMonitoringObservation({ watchId: watch.watchId, contentHash: "HASH-OBS-A", eventFingerprint: "EVENT-P16-1", observedAt: "2026-09-10T10:00:00.000Z", evidenceRefs: [] });
    const obs2 = namespace.recordExternalIntelligenceMonitoringObservation({ watchId: watch.watchId, contentHash: "HASH-OBS-A", eventFingerprint: "EVENT-P16-1", observedAt: "2026-09-10T10:10:00.000Z", evidenceRefs: [] });
    add("Same hash / same event re-observation is not treated as a new event", obs1.ok === true && obs2.ok === true && obs2.data.observation.rawChanged === false && obs2.data.observation.sameEventReobserved === true && obs2.data.observation.newEventCreated === false, obs2, "Change Detection");

    const obs3 = namespace.recordExternalIntelligenceMonitoringObservation({ watchId: watch.watchId, contentHash: "HASH-OBS-B", eventFingerprint: "EVENT-P16-2", observedAt: "2026-09-10T10:20:00.000Z", evidenceRefs: [] });
    const change1 = namespace.createExternalIntelligenceMaterialChangeCandidate({ monitoringObservationId: obs3.data.observation.monitoringObservationId, changeType: "SIGNIFICANT_NEW_EVIDENCE", materiality: "HIGH", semanticChangeDetected: true, changeFingerprint: "P16-MATERIAL-1" });
    const changeDup = namespace.createExternalIntelligenceMaterialChangeCandidate({ monitoringObservationId: obs3.data.observation.monitoringObservationId, changeType: "SIGNIFICANT_NEW_EVIDENCE", materiality: "HIGH", semanticChangeDetected: true, changeFingerprint: "P16-MATERIAL-1" });
    const changeUpdate = namespace.createExternalIntelligenceMaterialChangeCandidate({ monitoringObservationId: obs3.data.observation.monitoringObservationId, changeType: "OFFICIAL_CORRECTION", materiality: "HIGH", semanticChangeDetected: true, changeFingerprint: "P16-MATERIAL-1", materiallyUpdated: true, officialConfirmation: true });
    add("Raw change and Material Change remain separate", obs3.data.observation.rawChanged === true && change1.data.materialChange.materialChangeCandidate === true && VERSION_MANIFEST.safety.dataChangedEqualsMaterialIntelligenceChange === false, { observation: obs3.data.observation, materialChange: change1.data.materialChange }, "Materiality");
    add("Duplicate Material Change alert is suppressed", changeDup.ok === true && changeDup.data.materialChange.alertState === "SUPPRESSED_DUPLICATE", changeDup, "Deduplication");
    add("Material update can re-alert an existing incident", changeUpdate.ok === true && changeUpdate.data.materialChange.alertState === "UPDATED_MATERIALLY", changeUpdate, "Deduplication");

    const gap = namespace.recordExternalIntelligenceMonitoringGap({ watchId: watch.watchId, gapStart: "2026-09-10T11:00:00.000Z", affectedSourceIds: ["SOURCE-P16"], reason: "RUNTIME_UNAVAILABLE", coverageImpact: "PARTIAL", catchUpStrategy: "MISSING_WINDOW_SUMMARY" });
    add("Monitoring Gap explicitly prevents No Observation => No Change", gap.ok === true && gap.data.monitoringGap.noObservationEqualsNoChange === false && gap.data.noChangeClaimed === false, gap, "Monitoring Gap");
    const gapResolved = namespace.resolveExternalIntelligenceMonitoringGap({ monitoringGapId: gap.data.monitoringGap.monitoringGapId, gapEnd: "2026-09-10T12:00:00.000Z", catchUpStrategy: "MISSING_WINDOW_SUMMARY" });
    add("Gap recovery uses bounded Catch-Up strategy", gapResolved.ok === true && gapResolved.data.monitoringGap.recoveryState === "RESOLVED" && gapResolved.data.unlimitedCatchupAllowed === false, gapResolved, "Recovery");

    const changePackage = namespace.createExternalIntelligenceChangePackageCandidate({ materialChangeId: changeUpdate.data.materialChange.materialChangeId, materialDifferences: { officialCorrection: true } });
    add("Change Package grants no action or Knowledge authority", changePackage.ok === true && changePackage.data.changePackage.actionAuthorityGranted === false && changePackage.data.changePackage.knowledgePromotionPerformed === false, changePackage, "Boundary");
    const recompute = namespace.createExternalIntelligenceMonitoringSelectiveRecomputeCandidates({ materialChangeId: changeUpdate.data.materialChange.materialChangeId, outputReferenceIds: ["P16-DERIVED-OUTPUT"] });
    add("Material Change creates Selective Recompute candidate without automatic recompute", recompute.ok === true && recompute.data.automaticRecomputePerformed === false, recompute, "Lineage");

    const persisted = await namespace.persistExternalIntelligenceMonitoringRecord("watch", watch.watchId, namespace.getExternalIntelligenceWatch(watch.watchId));
    const readback = await namespace.readBackExternalIntelligenceMonitoringRecord("watch", watch.watchId);
    add("Watch persistence write/readback succeeds", persisted.ok === true && readback.ok === true && readback.data.record.watchId === watch.watchId, { persisted: persisted, readback: readback }, "Persistence");

    const notification = namespace.createExternalIntelligenceNotificationCandidate({ notificationType: "MATERIAL_CHANGE", level: "N3_IMPORTANT", severity: "HIGH", urgency: "NORMAL", materiality: "HIGH", sourceReferenceType: "MATERIAL_CHANGE", sourceReferenceId: changeUpdate.data.materialChange.materialChangeId, incidentKey: "P16-INCIDENT-1", materialFingerprint: "P16-NOTIFY-1", title: "Phase16 Material Change", message: "Validation notification", requestedChannels: ["IN_APP"] });
    add("Detected Material Change becomes Notification Candidate, not direct execution", notification.ok === true && notification.data.notification.executionAuthorityGranted === false && notification.data.notification.tradingAuthorityGranted === false && notification.data.detectedEqualsShouldNotify === false, notification, "Notification");
    const notificationDup = namespace.createExternalIntelligenceNotificationCandidate({ notificationType: "MATERIAL_CHANGE", level: "N3_IMPORTANT", sourceReferenceType: "MATERIAL_CHANGE", sourceReferenceId: changeUpdate.data.materialChange.materialChangeId, notificationThreadId: notification.data.notification.notificationThreadId, materialFingerprint: "P16-NOTIFY-1", title: "Phase16 Material Change" });
    add("Repeated notification information is suppressed within incident thread", notificationDup.ok === true && notificationDup.data.notification.deliveryState === "SUPPRESSED", notificationDup, "Notification Dedup");
    const notificationUpdate = namespace.createExternalIntelligenceNotificationCandidate({ notificationType: "MATERIAL_CHANGE", level: "N4_URGENT", severity: "CRITICAL", urgency: "HIGH", sourceReferenceType: "MATERIAL_CHANGE", sourceReferenceId: changeUpdate.data.materialChange.materialChangeId, notificationThreadId: notification.data.notification.notificationThreadId, materialFingerprint: "P16-NOTIFY-1", materialUpdate: true, severityChanged: true, title: "Phase16 Material Update", requestedChannels: ["IN_APP"] });
    add("Material notification update remains in same thread and can re-notify", notificationUpdate.ok === true && notificationUpdate.data.notification.notificationThreadId === notification.data.notification.notificationThreadId && notificationUpdate.data.notification.deliveryState === "CANDIDATE", notificationUpdate, "Notification Thread");
    const externalBlocked = namespace.queueExternalIntelligenceNotificationCandidate({ notificationCandidateId: notificationUpdate.data.notification.notificationCandidateId, channels: ["EMAIL"] });
    add("External notification channels are not silently enabled in initial Phase 16", externalBlocked.ok === false && externalBlocked.code === "EXTERNAL010_NOTIFICATION_EXTERNAL_CHANNEL_NOT_ENABLED", externalBlocked, "Channel Boundary");
    const queued = namespace.queueExternalIntelligenceNotificationCandidate({ notificationCandidateId: notificationUpdate.data.notification.notificationCandidateId, channels: ["IN_APP"] });
    const delivered = namespace.recordExternalIntelligenceNotificationDelivery({ notificationCandidateId: notificationUpdate.data.notification.notificationCandidateId, channel: "IN_APP", deliveryState: "DELIVERED" });
    const seen = namespace.markExternalIntelligenceNotificationSeen(notificationUpdate.data.notification.notificationCandidateId);
    const acknowledged = namespace.acknowledgeExternalIntelligenceNotification(notificationUpdate.data.notification.notificationCandidateId);
    add("IN_APP notification tracks Queue -> Delivery -> Seen -> Acknowledged", queued.ok === true && delivered.ok === true && seen.ok === true && acknowledged.ok === true, { queued: queued, delivered: delivered, seen: seen, acknowledged: acknowledged }, "Delivery State");
    add("Acknowledgement does not grant approval or execution authority", acknowledged.data.notification.approvalGranted === false && acknowledged.data.notification.executionAuthorityGranted === false && acknowledged.data.approvalGranted === false, acknowledged, "Authority");
    const inbox = namespace.listExternalIntelligenceNotificationInbox();
    const dashboard = namespace.getExternalIntelligenceNotificationDashboardSummary();
    add("Notification Inbox and Dashboard Hook are available", inbox.length >= 2 && dashboard.total >= 2 && dashboard.notificationIsExecutionAuthority === false, { inboxCount: inbox.length, dashboard: dashboard }, "Attention Surface");

    const outcomeEval = namespace.recordExternalIntelligenceMonitoringOutcomeEvaluation({ watchId: watch.watchId, monitoringCost: 1, usefulSignalCount: 1, falseAlertCount: 1, missedSignalCount: 1, detectionLeadTimeMs: 5000, lateDetection: false, resourceEfficiency: 0.5 });
    add("False Alert / Missed Signal are retained for outcome-grounded learning without auto policy mutation", outcomeEval.ok === true && outcomeEval.data.evaluation.falseAlertCount === 1 && outcomeEval.data.evaluation.missedSignalCount === 1 && outcomeEval.data.futurePolicyChangeRequiresProposalValidationAuthority === true, outcomeEval, "Learning");

    const vprofile = await namespace.runExternalIntelligenceValidation({ targetRecordId: watch.watchId, targetRecordVersion: String(namespace.getExternalIntelligenceWatch(watch.watchId).watchVersion), targetSchemaVersion: "1.15.0", targetRecord: namespace.getExternalIntelligenceWatch(watch.watchId), schemaId: "EXTERNAL-010-SCHEMA-WATCH-RECORD", purpose: "AUDIT_USE", references: [], validationEnvironment: "PHASE16_FUNCTIONAL" });
    add("Phase 15 Multi-Layer Validation Framework validates Phase 16 Watch record", vprofile.ok === true && vprofile.data.validationProfile.overallState !== "FAIL" && vprofile.data.validationProfile.approvalGranted === false, vprofile, "Validation Integration");

    add("Decision 045 safety rules are fixed", ["researchGoalEqualsMonitoringGoal","monitoringEqualsFixedFrequentPolling","monitoringTriggerEqualsEmergencyConfirmed","dataChangedEqualsMaterialIntelligenceChange","sameEventReobservedEqualsNewEvent","noObservationEqualsNoChange","monitoringGapEqualsStableWorld","highPriorityAllowsUnlimitedMonitoringBudget","monitorAuthorityAllowsUnlimitedPaidAPI","watchDefinitionEqualsScheduler","schedulerExecutionEqualsGoalAuthority","changePackageEqualsActionAuthority","marketWatchAuthorityEqualsTradingAuthority","alwaysOnArchitectureRequiresAlwaysOnRuntimeToday"].every(function k(name) { return VERSION_MANIFEST.safety[name] === false; }), VERSION_MANIFEST.safety, "Safety");
    add("Decision 046 safety rules are fixed", ["detectedEqualsShouldNotify","notificationSentEqualsDelivered","deliveredEqualsSeen","seenEqualsAcknowledged","acknowledgedEqualsApproved","criticalNotificationEqualsTradingAuthority","notificationEqualsRecommendation","recommendationEqualsExecution"].every(function k(name) { return VERSION_MANIFEST.safety[name] === false; }), VERSION_MANIFEST.safety, "Safety");

    const auditTypes = Array.from(state.auditEvents.values()).map(function e(a) { return a.eventType; });
    add("Monitoring / Notification audit hooks record key events", ["WATCH_CREATED","WATCH_ACTIVATED","MATERIAL_CHANGE_DETECTED","MONITORING_GAP_STARTED","MONITORING_GAP_RESOLVED","NOTIFICATION_ACKNOWLEDGED"].every(function e(t) { return auditTypes.includes(t); }), auditTypes.slice(-30), "Audit");

    const passed = checks.filter(function p(c) { return c.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function f(c) { return !c.passed && c.severity === "Critical"; }).length;
    const result = internal.deepFreeze({ id: internal.nextId("EXTERNAL-010-PHASE16-VALIDATION"), componentId: "EXTERNAL-010", version: VERSION_MANIFEST.release.version, gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion, implementationPhase: VERSION_MANIFEST.release.implementationPhase, decisionCoverage: 54, requirementCoverage: { primaryDecisions: ["045","046"], stableWatch: true, adaptiveCadence: true, materialChange: true, monitoringGap: true, boundedCatchUp: true, selectiveRecomputeHook: true, outcomeEvaluation: true, notificationCandidate: true, notificationThreading: true, deduplication: true, deliveryState: true, acknowledgement: true, inAppInbox: true, persistenceReadback: true }, passed: passed, failed: failed, total: checks.length, health: Number((passed / checks.length * 100).toFixed(1)), criticalFailed: criticalFailed, status: failed === 0 ? "EXTERNAL-010 Phase 16 Validation PASS" : "EXTERNAL-010 Phase 16 Validation FAIL", releaseAllowed: failed === 0 && criticalFailed === 0, phase16Complete: failed === 0 && criticalFailed === 0, phase17Allowed: failed === 0 && criticalFailed === 0, checks: checks, validatedAt: internal.nowIso(), immutable: true });
    const contractValidation = namespace.validateExternalIntelligenceContract("phase16ValidationResult", result);
    const schemaValidation = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE16-VALIDATION-RESULT", result);
    state.latestPhase16Validation = result;
    return Object.assign({}, internal.clone(result), { validationContractValid: contractValidation.valid === true, validationSchemaValid: schemaValidation.valid === true });
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase16Validation: runExternalIntelligencePhase16Validation }); Object.assign(namespace, namespace.api);
  namespace.modules.phase16Validation = { id: "EXTERNAL-010-PHASE16-VALIDATION", version: MODULE_VERSION, status: "Ready", phase: 16, decisions: ["045","046"], loadedAt: internal.nowIso() };
  global.runExternalIntelligencePhase16Validation = runExternalIntelligencePhase16Validation;
})(typeof window !== "undefined" ? window : globalThis);
