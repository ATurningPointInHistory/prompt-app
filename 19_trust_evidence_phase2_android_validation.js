/* ============================================================
   FILE: 19_trust_evidence_phase2_android_validation.js
   EXTERNAL-020 Phase 2 Android Real Device Validation
   Candidate Release: 0.2.1
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL020TrustEvidence;
  const P2 = global.EXTERNAL020Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;

  const i = namespace.__internal;
  const s = i.state;

  function runExternal020Phase2AndroidValidation() {
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
    const base = typeof namespace.runExternal020Phase2Validation === "function"
      ? namespace.runExternal020Phase2Validation()
      : null;

    add(
      "Phase 2 functional validation remains PASS",
      !!base && base.version === "0.2.1" && base.failed === 0 && base.criticalFailed === 0 && base.phase2TechnicalGateReady === true,
      base ? { validationId: base.validationId, version: base.version, passed: base.passed, failed: base.failed, criticalFailed: base.criticalFailed, decision001RequirementsComplete: base.decision001RequirementsComplete } : null,
      "Prerequisite"
    );

    add("Android real-device user agent detected", /Android/i.test(ua), ua, "Device");
    add("Browser DOM runtime is available", typeof global.document !== "undefined", { documentType: typeof global.document }, "Runtime");

    const deps = namespace.getDependencyStatus();
    add(
      "EXTERNAL-010 Reliability Input API remains available on Android",
      deps.external010 === true && deps.external010ReliabilityInput === true,
      deps,
      "Integration"
    );

    const compatibility = namespace.inspectExternal010Compatibility();
    add(
      "Android EXTERNAL-010 integration remains read-only and local",
      compatibility.compatible === true && compatibility.mutationApiInvoked === false && compatibility.providerNetworkCallPerformed === false,
      compatibility,
      "Safety"
    );

    const input = namespace.readExternal010ReliabilityInput();
    const pkg = input && input.ok ? input.data.inputPackage : null;
    add(
      "Android can capture Reliability Input Package read-only",
      !!pkg && pkg.readOnly === true && pkg.rawEvidenceMutationPerformed === false && pkg.externalTransmissionPerformed === false,
      input,
      "Functional"
    );

    const sourceCtx = namespace.createExternal020EvaluationContext({
      subjectType: "SOURCE",
      subjectRef: "SRC-ANDROID-PHASE2",
      domain: "GENERAL",
      task: "EVIDENCE_REVIEW",
      purpose: "ANDROID_PHASE2_REAL_DEVICE_VALIDATION",
      timeHorizon: "CURRENT",
      sourceRefs: ["SRC-ANDROID-PHASE2"],
      evidenceRefs: ["EVIDENCE-ANDROID-P2-A"],
      inputPackageId: pkg && pkg.inputPackageId
    });
    const sourceEv = namespace.createExternal020ReliabilityEvaluationCandidate({
      contextId: sourceCtx.ok ? sourceCtx.data.context.contextId : "",
      inputPackageId: pkg && pkg.inputPackageId,
      evaluationState: "ASSESSABLE",
      explanation: "Android Phase 2 source profile validation"
    });
    const sourceProfile = namespace.createExternal020ReliabilityProfile({
      evaluationId: sourceEv.ok ? sourceEv.data.evaluation.evaluationId : ""
    });
    const sourceProfileRow = sourceProfile && sourceProfile.ok ? sourceProfile.data.profile : null;

    add(
      "Android can create context-specific SOURCE Reliability Profile",
      !!sourceProfileRow && sourceProfileRow.subjectType === "SOURCE" && sourceProfileRow.reliabilityScore === null && sourceProfileRow.truthConfirmed === false,
      sourceProfile,
      "Reliability"
    );

    const claimCtx = namespace.createExternal020EvaluationContext({
      subjectType: "CLAIM",
      subjectRef: "CLAIM-ANDROID-PHASE2",
      domain: "GENERAL",
      task: "EVIDENCE_REVIEW",
      purpose: "ANDROID_PHASE2_REAL_DEVICE_VALIDATION",
      timeHorizon: "CURRENT",
      sourceRefs: ["SRC-ANDROID-PHASE2"],
      evidenceRefs: ["EVIDENCE-ANDROID-P2-A"],
      inputPackageId: pkg && pkg.inputPackageId
    });
    const claimEv = namespace.createExternal020ReliabilityEvaluationCandidate({
      contextId: claimCtx.ok ? claimCtx.data.context.contextId : "",
      inputPackageId: pkg && pkg.inputPackageId,
      evaluationState: "UNRESOLVED",
      explanation: "Android Phase 2 claim separation validation"
    });
    const claimProfile = namespace.createExternal020ReliabilityProfile({
      evaluationId: claimEv.ok ? claimEv.data.evaluation.evaluationId : ""
    });
    const claimProfileRow = claimProfile && claimProfile.ok ? claimProfile.data.profile : null;

    add(
      "Android keeps SOURCE and CLAIM Reliability Profiles separate",
      !!sourceProfileRow && !!claimProfileRow && sourceProfileRow.profileId !== claimProfileRow.profileId && sourceProfileRow.subjectType === "SOURCE" && claimProfileRow.subjectType === "CLAIM",
      { sourceProfile: sourceProfileRow, claimProfile: claimProfileRow },
      "Reliability"
    );

    const otherCtx = namespace.createExternal020EvaluationContext({
      subjectType: "SOURCE",
      subjectRef: "SRC-ANDROID-PHASE2",
      domain: "NEWS",
      task: "BREAKING_NEWS_REVIEW",
      purpose: "ANDROID_PHASE2_REAL_DEVICE_VALIDATION",
      timeHorizon: "SHORT",
      sourceRefs: ["SRC-ANDROID-PHASE2"],
      evidenceRefs: ["EVIDENCE-ANDROID-P2-A"],
      inputPackageId: pkg && pkg.inputPackageId
    });
    const otherEv = namespace.createExternal020ReliabilityEvaluationCandidate({
      contextId: otherCtx.ok ? otherCtx.data.context.contextId : "",
      inputPackageId: pkg && pkg.inputPackageId,
      evaluationState: "ASSESSABLE",
      explanation: "Android Phase 2 alternate context validation"
    });
    const otherProfile = namespace.createExternal020ReliabilityProfile({
      evaluationId: otherEv.ok ? otherEv.data.evaluation.evaluationId : ""
    });
    const otherProfileRow = otherProfile && otherProfile.ok ? otherProfile.data.profile : null;

    add(
      "Android supports separate Domain / Task profiles for the same Source",
      !!sourceProfileRow && !!otherProfileRow && sourceProfileRow.profileId !== otherProfileRow.profileId && sourceProfileRow.contextIdentity !== otherProfileRow.contextIdentity,
      { primary: sourceProfileRow && sourceProfileRow.contextIdentity, alternate: otherProfileRow && otherProfileRow.contextIdentity },
      "Reliability"
    );

    add(
      "Android preserves all Phase 2 reliability dimensions without universal score",
      !!sourceProfileRow && P2.reliabilityDimensions.every(function (key) { return Object.prototype.hasOwnProperty.call(sourceProfileRow.dimensions || {}, key); }) && sourceProfileRow.reliabilityScore === null && sourceProfileRow.authorityScore === null,
      sourceProfileRow ? { dimensions: sourceProfileRow.dimensions, reliabilityScore: sourceProfileRow.reliabilityScore, authorityScore: sourceProfileRow.authorityScore } : null,
      "Reliability"
    );

    const independence = sourceEv.ok ? namespace.assessExternal020IndependentConfirmation({ evaluationId: sourceEv.data.evaluation.evaluationId }) : null;
    add(
      "Android independence assessment is explicit and does not invent independence",
      !!independence && independence.ok === true && P2.independenceStates.includes(independence.data.assessment.state) && independence.data.assessment.unknownTreatedAsIndependent === false && independence.data.assessment.dependencyInferred === false,
      independence,
      "Reliability"
    );

    const revisionCtx = namespace.createExternal020EvaluationContext({
      subjectType: "SOURCE",
      subjectRef: "SRC-ANDROID-PHASE2",
      domain: "GENERAL",
      task: "EVIDENCE_REVIEW",
      purpose: "ANDROID_PHASE2_REAL_DEVICE_VALIDATION",
      timeHorizon: "CURRENT",
      sourceRefs: ["SRC-ANDROID-PHASE2"],
      evidenceRefs: ["EVIDENCE-ANDROID-P2-A", "EVIDENCE-ANDROID-P2-B"],
      inputPackageId: pkg && pkg.inputPackageId
    });
    const revisionEv = namespace.createExternal020ReliabilityEvaluationCandidate({
      contextId: revisionCtx.ok ? revisionCtx.data.context.contextId : "",
      inputPackageId: pkg && pkg.inputPackageId,
      evaluationState: "ASSESSABLE",
      explanation: "Android Phase 2 append-only revision validation"
    });
    const revised = namespace.reviseExternal020ReliabilityProfile({
      profileId: sourceProfileRow ? sourceProfileRow.profileId : "",
      evaluationId: revisionEv.ok ? revisionEv.data.evaluation.evaluationId : "",
      revisionReason: "ANDROID_REAL_DEVICE_VALIDATION_REVISION"
    });
    const revisedRow = revised && revised.ok ? revised.data.profile : null;
    const history = revisedRow ? namespace.listExternal020ReliabilityProfileHistory(revisedRow.profileId) : [];

    add(
      "Android can append a new Reliability Profile revision",
      !!revisedRow && revisedRow.revisionNumber === 2 && !!revisedRow.previousVersionRef,
      revised,
      "Revision"
    );

    add(
      "Android keeps previous Reliability Profile version retrievable",
      history.length === 2 && history[0].historyState === "SUPERSEDED" && history[1].historyState === "CURRENT" && history[0].profileVersion !== history[1].profileVersion,
      history,
      "Revision"
    );

    add(
      "Android revision preserves lineage and explicit uncertainty fields",
      !!revisedRow && revisedRow.supersedesVersionRef === revisedRow.previousVersionRef && Array.isArray(revisedRow.contradictionRefs) && Array.isArray(revisedRow.missingInformation),
      revisedRow,
      "Lineage",
      "Major"
    );

    const mismatch = namespace.reviseExternal020ReliabilityProfile({
      profileId: sourceProfileRow ? sourceProfileRow.profileId : "",
      evaluationId: claimEv.ok ? claimEv.data.evaluation.evaluationId : "",
      revisionReason: "INVALID_ANDROID_SUBJECT_REUSE"
    });
    add(
      "Android rejects SOURCE profile revision using CLAIM evaluation",
      !!mismatch && mismatch.ok === false && mismatch.code === "EXTERNAL020_PROFILE_CONTEXT_IDENTITY_MISMATCH",
      mismatch,
      "Negative"
    );

    const coverage = namespace.getExternal020Decision001Coverage();
    add(
      "Android preserves Decision 001 traceability at 16/18 without false completion",
      coverage.totalDecisionRequirements === 18 && coverage.decisionRequirementsFullyImplemented === 16 && coverage.allDecisionRequirementsComplete === false && coverage.remainingRequirementIds.includes("REQ-020-008") && coverage.remainingRequirementIds.includes("REQ-020-015"),
      coverage,
      "Traceability"
    );

    add(
      "Android Reliability Profile grants no Truth / Knowledge / action authority",
      !!revisedRow && revisedRow.truthConfirmed === false && revisedRow.knowledgePromotionPerformed === false && revisedRow.actionAuthorityGranted === false && revisedRow.canonicalRepositoryMutationPerformed === false,
      revisedRow,
      "Authority"
    );

    add(
      "Android Phase 2 remains local-only with no paid API or external transmission",
      !!revisedRow && revisedRow.externalTransmissionPerformed === false && revisedRow.paidApiExecutionPerformed === false && P2.safety.externalAiReliabilityReasoningImplemented === false,
      revisedRow,
      "Safety"
    );

    add(
      "IDE-170 Confidence remains untouched on Android",
      !!revisedRow && revisedRow.ide170ConfidenceOverwritten === false && P2.safety.ide170ConfidenceOverwriteAllowed === false,
      revisedRow ? { ide170ConfidenceOverwritten: revisedRow.ide170ConfidenceOverwritten, overwriteAllowed: P2.safety.ide170ConfidenceOverwriteAllowed } : null,
      "Safety"
    );

    add(
      "Historical Outcome and External AI remain deferred on Android",
      P2.safety.historicalOutcomeGroundedEvaluationImplemented === false && P2.safety.externalAiReliabilityReasoningImplemented === false,
      P2.safety,
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
      validationId: i.nextId("EXTERNAL020-PHASE2-ANDROID-REAL-DEVICE"),
      componentId: P2.componentId,
      decisionId: P2.decisionId,
      version: P2.version,
      phase: 2,
      passed: passed,
      failed: failedChecks.length,
      total: checks.length,
      health: Number((passed / checks.length * 100).toFixed(1)),
      criticalFailed: criticalFailed,
      status: gatePassed ? "EXTERNAL-020 Phase 2 Android Real Device Validation PASS" : "EXTERNAL-020 Phase 2 Android Real Device Validation FAIL",
      androidRealDeviceValidation: { passed: gatePassed, userAgent: ua },
      phase2AndroidRealDeviceComplete: gatePassed,
      phase2ProjectOwnerGateReady: gatePassed,
      decision001RequirementsComplete: coverage.decisionRequirementsFullyImplemented,
      decision001RequirementsTotal: coverage.totalDecisionRequirements,
      decision001Complete: false,
      releaseAllowed: false,
      projectOwnerAcceptanceRequired: true,
      validationIsApproval: false,
      canonicalMutationPerformed: false,
      externalTransmissionPerformed: false,
      paidApiExecutionPerformed: false,
      historicalOutcomeGroundedEvaluationPerformed: false,
      externalAiReliabilityReasoningPerformed: false,
      checks: checks,
      validatedAt: i.nowIso(),
      immutable: true
    });
  }

  Object.assign(namespace.api, { runExternal020Phase2AndroidValidation: runExternal020Phase2AndroidValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase2AndroidValidation = {
    id: "EXTERNAL-020-PHASE2-ANDROID-REAL-DEVICE-VALIDATION",
    version: P2.version,
    status: "Ready",
    phase: 2,
    releaseAllowed: false,
    validationIsApproval: false,
    loadedAt: i.nowIso()
  };
  global.runExternal020Phase2AndroidValidation = runExternal020Phase2AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
