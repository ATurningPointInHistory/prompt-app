/* ============================================================
   FILE: 19_trust_evidence_phase3_android_validation.js
   EXTERNAL-020 Phase 3 Android Real Device Validation
   Candidate Release: 0.3.1
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL020TrustEvidence;
  const P3 = global.EXTERNAL020Phase3VersionManifest;
  if (!namespace || !namespace.__internal || !P3) return;

  const i = namespace.__internal;

  function runExternal020Phase3AndroidValidation() {
    const checks = [];
    function add(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: i.clone(detail),
        group: group || "Android",
        severity: severity || "Critical"
      });
    }

    const ua = global.navigator && global.navigator.userAgent ? String(global.navigator.userAgent) : "";
    const base = typeof namespace.runExternal020Phase3Validation === "function"
      ? namespace.runExternal020Phase3Validation()
      : null;

    add(
      "Phase 3 functional validation remains PASS",
      !!base && base.version === "0.3.1" && base.failed === 0 && base.criticalFailed === 0 && base.phase3TechnicalGateReady === true && base.decision001RequirementsComplete === 17,
      base ? {
        validationId: base.validationId,
        version: base.version,
        passed: base.passed,
        failed: base.failed,
        criticalFailed: base.criticalFailed,
        decision001RequirementsComplete: base.decision001RequirementsComplete
      } : null,
      "Prerequisite"
    );

    add("Android real-device user agent detected", /Android/i.test(ua), ua, "Device");
    add("Browser DOM runtime is available", typeof global.document !== "undefined", { documentType: typeof global.document }, "Runtime");

    const dep = typeof namespace.getExternal020HistoricalOutcomeDependencyStatus === "function"
      ? namespace.getExternal020HistoricalOutcomeDependencyStatus()
      : null;
    add(
      "EXTERNAL-010 historical public read APIs remain available on Android",
      !!dep && dep.external010 === true && dep.allRequiredPublicReadApisAvailable === true && dep.writeApiRequired === false && dep.internalStateAccessAllowed === false,
      dep,
      "Integration"
    );

    const capture = typeof namespace.captureExternal020HistoricalOutcomeInputs === "function"
      ? namespace.captureExternal020HistoricalOutcomeInputs({
          predictionId: "EXTERNAL020-ANDROID-PHASE3-NO-DATA-PREDICTION",
          outcomeId: "EXTERNAL020-ANDROID-PHASE3-NO-DATA-OUTCOME",
          capabilityId: "EXTERNAL020-ANDROID-PHASE3-NO-DATA-CAPABILITY"
        })
      : null;
    const historicalPackage = capture && capture.ok ? capture.data.historicalInputPackage : null;

    add(
      "Android Historical Input Adapter remains read-only with no EXTERNAL-010 write or internal-state access",
      !!historicalPackage && historicalPackage.readOnly === true && historicalPackage.external010WriteApiInvoked === false && historicalPackage.internalStateAccessPerformed === false,
      capture,
      "Safety"
    );

    add(
      "Android historical input capture performs no Raw Evidence mutation, external transmission, or paid API execution",
      !!historicalPackage && historicalPackage.rawEvidenceMutationPerformed === false && historicalPackage.externalTransmissionPerformed === false && historicalPackage.paidApiExecutionPerformed === false,
      historicalPackage,
      "Safety"
    );

    const emptyEval = namespace.evaluateExternal020HistoricalOutcomeSnapshot({
      profile: null,
      historicalInputPackage: historicalPackage || {
        predictionHistory: [],
        outcomeHistory: [],
        capabilityPerformanceProfiles: []
      }
    });
    add(
      "Android missing historical outcomes produce INSUFFICIENT_HISTORY without invented score",
      emptyEval.historicalGroundingState === "INSUFFICIENT_HISTORY" && emptyEval.historicalAccuracyScore === null && emptyEval.reliabilityScore === null && emptyEval.truthConfirmed === false,
      emptyEval,
      "Negative"
    );

    const finalFixture = {
      predictionHistory: [{
        predictionId: "P-ANDROID-HIST-1",
        version: 1,
        evidenceIds: ["EVIDENCE-ANDROID-PRED-1"],
        probabilityState: "QUALITATIVE",
        canonicalTruthConfirmed: false
      }],
      outcomeHistory: [{
        outcomeId: "O-ANDROID-HIST-1",
        version: 1,
        predictionId: "P-ANDROID-HIST-1",
        settlementState: "FINAL",
        supportingEvidenceIds: ["EVIDENCE-ANDROID-OUTCOME-1"],
        absoluteTruthClaimed: false
      }],
      capabilityPerformanceProfiles: [{
        performanceProfileId: "PERF-ANDROID-HIST-1",
        capabilityId: "CAP-ANDROID-HIST-1",
        taskType: "PRICE_DATA_REVIEW",
        domain: "MARKET",
        horizon: "CURRENT",
        outcomeGrounded: true,
        evaluationEvidenceRefs: ["EVIDENCE-ANDROID-PERF-1"],
        performanceGrantsActionAuthority: false
      }]
    };
    const profileFixture = { domain: "MARKET", task: "PRICE_DATA_REVIEW", timeHorizon: "CURRENT" };
    const finalEval = namespace.evaluateExternal020HistoricalOutcomeSnapshot({
      profile: profileFixture,
      historicalInputPackage: finalFixture
    });

    add(
      "Android FINAL historical Outcome produces OUTCOME_GROUNDED assessment",
      finalEval.historicalGroundingState === "OUTCOME_GROUNDED" && finalEval.finalSettlementObserved === true && finalEval.outcomeHistoryCount === 1,
      finalEval,
      "Reliability"
    );

    add(
      "Android historical grounding preserves Prediction / Outcome / Capability evidence references",
      finalEval.historicalEvidenceRefs.includes("EVIDENCE-ANDROID-PRED-1") && finalEval.historicalEvidenceRefs.includes("EVIDENCE-ANDROID-OUTCOME-1") && finalEval.historicalEvidenceRefs.includes("EVIDENCE-ANDROID-PERF-1"),
      finalEval.historicalEvidenceRefs,
      "Lineage",
      "Major"
    );

    add(
      "Android outcome-grounded Capability Performance remains context-scoped evidence, not authority",
      finalEval.outcomeGroundedPerformanceProfileCount === 1 && finalEval.contextMatchingOutcomeGroundedPerformanceProfileCount === 1 && finalEval.actionAuthorityGranted === false,
      finalEval,
      "Authority"
    );

    add(
      "Android Prediction and Outcome are not automatically converted into an accuracy or reliability score",
      finalEval.predictionOutcomeMatchComputed === false && finalEval.historicalAccuracyScore === null && finalEval.calibrationScore === null && finalEval.reliabilityScore === null && finalEval.authorityScore === null,
      finalEval,
      "Safety"
    );

    const conflictEval = namespace.evaluateExternal020HistoricalOutcomeSnapshot({
      profile: profileFixture,
      historicalInputPackage: {
        predictionHistory: finalFixture.predictionHistory,
        outcomeHistory: [{
          outcomeId: "O-ANDROID-HIST-CONFLICT",
          version: 1,
          predictionId: "P-ANDROID-HIST-1",
          settlementState: "DISPUTED",
          supportingEvidenceIds: ["EVIDENCE-ANDROID-CONFLICT-A", "EVIDENCE-ANDROID-CONFLICT-B"]
        }],
        capabilityPerformanceProfiles: []
      }
    });
    add(
      "Android DISPUTED historical Outcome remains CONFLICTED_HISTORY with no automatic winner",
      conflictEval.historicalGroundingState === "CONFLICTED_HISTORY" && conflictEval.conflictWinner === null && conflictEval.automaticConflictResolutionPerformed === false && conflictEval.truthConfirmed === false,
      conflictEval,
      "Negative"
    );

    const partialEval = namespace.evaluateExternal020HistoricalOutcomeSnapshot({
      profile: profileFixture,
      historicalInputPackage: {
        predictionHistory: finalFixture.predictionHistory,
        outcomeHistory: [{
          outcomeId: "O-ANDROID-HIST-PARTIAL",
          version: 1,
          predictionId: "P-ANDROID-HIST-1",
          settlementState: "PROVISIONAL",
          supportingEvidenceIds: ["EVIDENCE-ANDROID-PARTIAL"]
        }],
        capabilityPerformanceProfiles: []
      }
    });
    add(
      "Android PROVISIONAL historical Outcome remains PARTIALLY_GROUNDED",
      partialEval.historicalGroundingState === "PARTIALLY_GROUNDED" && partialEval.truthConfirmed === false,
      partialEval,
      "Reliability",
      "Major"
    );

    const profile = typeof namespace.findExternal020ReliabilityProfile === "function"
      ? namespace.findExternal020ReliabilityProfile({
          subjectType: "SOURCE",
          subjectRef: "SRC-PHASE2",
          domain: "MARKET",
          task: "PRICE_DATA_REVIEW",
          purpose: "PHASE2_VALIDATION",
          timeHorizon: "CURRENT"
        })
      : null;
    const historyBefore = profile && typeof namespace.listExternal020ReliabilityProfileHistory === "function"
      ? namespace.listExternal020ReliabilityProfileHistory(profile.profileId).length
      : 0;
    const assessment = profile && typeof namespace.createExternal020HistoricalOutcomeAssessment === "function"
      ? namespace.createExternal020HistoricalOutcomeAssessment({
          profileId: profile.profileId,
          predictionId: "EXTERNAL020-ANDROID-PHASE3-NO-DATA-PREDICTION",
          outcomeId: "EXTERNAL020-ANDROID-PHASE3-NO-DATA-OUTCOME",
          capabilityId: "EXTERNAL020-ANDROID-PHASE3-NO-DATA-CAPABILITY",
          explanation: "Android Phase 3 read-only Historical Outcome integration validation"
        })
      : null;
    const assessmentRow = assessment && assessment.ok ? assessment.data.assessment : null;

    add(
      "Android Historical Outcome Assessment can link to an existing Reliability Profile",
      !!assessmentRow && !!profile && assessmentRow.profileId === profile.profileId && assessmentRow.profileVersionRef === profile.profileId + "@" + profile.profileVersion,
      assessment,
      "Integration"
    );

    const historyAfter = profile && typeof namespace.listExternal020ReliabilityProfileHistory === "function"
      ? namespace.listExternal020ReliabilityProfileHistory(profile.profileId).length
      : 0;
    add(
      "Android Historical assessment is append-only evidence and does not automatically revise Profile history",
      !!assessmentRow && assessmentRow.automaticProfileRevisionPerformed === false && assessmentRow.profileRevisionCandidateOnly === true && historyBefore === historyAfter,
      { assessment: assessmentRow, historyBefore: historyBefore, historyAfter: historyAfter },
      "Revision"
    );

    add(
      "Android Historical assessment grants no Truth / Knowledge / action authority",
      !!assessmentRow && assessmentRow.truthConfirmed === false && assessmentRow.knowledgePromotionPerformed === false && assessmentRow.actionAuthorityGranted === false,
      assessmentRow,
      "Authority"
    );

    add(
      "Android Phase 3 remains local-only and mutation-free",
      !!assessmentRow && assessmentRow.rawEvidenceMutationPerformed === false && assessmentRow.canonicalRepositoryMutationPerformed === false && assessmentRow.externalTransmissionPerformed === false && assessmentRow.paidApiExecutionPerformed === false,
      assessmentRow,
      "Safety"
    );

    add(
      "IDE-170 Confidence remains untouched on Android",
      !!assessmentRow && assessmentRow.ide170ConfidenceOverwritten === false && P3.safety.ide170ConfidenceOverwriteAllowed === false,
      { ide170ConfidenceOverwritten: assessmentRow && assessmentRow.ide170ConfidenceOverwritten, overwriteAllowed: P3.safety.ide170ConfidenceOverwriteAllowed },
      "Safety"
    );

    const coverage = typeof namespace.getExternal020Phase3Decision001Coverage === "function"
      ? namespace.getExternal020Phase3Decision001Coverage()
      : null;
    add(
      "Android preserves Decision 001 traceability at 17/18 with only REQ-020-015 remaining",
      !!coverage && coverage.totalDecisionRequirements === 18 && coverage.decisionRequirementsFullyImplemented === 17 && coverage.allDecisionRequirementsComplete === false && coverage.remainingRequirementIds.length === 1 && coverage.remainingRequirementIds[0] === "REQ-020-015",
      coverage,
      "Traceability"
    );

    add(
      "External AI Reliability Reasoning remains deferred on Android",
      P3.safety.externalAiReliabilityReasoningImplemented === false && P3.deferredAfterPhase3.length === 1 && P3.deferredAfterPhase3[0] === "REQ-020-015",
      { safety: P3.safety, deferredAfterPhase3: P3.deferredAfterPhase3 },
      "Scope"
    );

    add(
      "Android validation does not equal Project Owner approval",
      global.EXTERNAL020VersionManifest && global.EXTERNAL020VersionManifest.safety.validationEqualsApproval === false,
      { validationEqualsApproval: global.EXTERNAL020VersionManifest && global.EXTERNAL020VersionManifest.safety.validationEqualsApproval },
      "Authority"
    );

    const failedChecks = checks.filter(function (c) { return !c.passed; });
    const criticalFailed = failedChecks.filter(function (c) { return c.severity === "Critical"; }).length;
    const passed = checks.length - failedChecks.length;
    const gatePassed = failedChecks.length === 0;

    return i.deepFreeze({
      validationId: i.nextId("EXTERNAL020-PHASE3-ANDROID-REAL-DEVICE"),
      componentId: P3.componentId,
      decisionId: P3.decisionId,
      version: P3.version,
      phase: 3,
      passed: passed,
      failed: failedChecks.length,
      total: checks.length,
      health: Number((passed / checks.length * 100).toFixed(1)),
      criticalFailed: criticalFailed,
      status: gatePassed ? "EXTERNAL-020 Phase 3 Android Real Device Validation PASS" : "EXTERNAL-020 Phase 3 Android Real Device Validation FAIL",
      androidRealDeviceValidation: { passed: gatePassed, userAgent: ua },
      phase3AndroidRealDeviceComplete: gatePassed,
      phase3ProjectOwnerGateReady: gatePassed,
      decision001RequirementsComplete: coverage ? coverage.decisionRequirementsFullyImplemented : null,
      decision001RequirementsTotal: coverage ? coverage.totalDecisionRequirements : null,
      decision001Complete: false,
      releaseAllowed: false,
      projectOwnerAcceptanceRequired: true,
      validationIsApproval: false,
      canonicalMutationPerformed: false,
      externalTransmissionPerformed: false,
      paidApiExecutionPerformed: false,
      historicalOutcomeGroundedEvaluationPerformed: true,
      externalAiReliabilityReasoningPerformed: false,
      checks: checks,
      validatedAt: i.nowIso(),
      immutable: true
    });
  }

  Object.assign(namespace.api, { runExternal020Phase3AndroidValidation: runExternal020Phase3AndroidValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase3AndroidValidation = {
    id: "EXTERNAL-020-PHASE3-ANDROID-REAL-DEVICE-VALIDATION",
    version: P3.version,
    status: "Ready",
    phase: 3,
    releaseAllowed: false,
    validationIsApproval: false,
    loadedAt: i.nowIso()
  };
  global.runExternal020Phase3AndroidValidation = runExternal020Phase3AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
