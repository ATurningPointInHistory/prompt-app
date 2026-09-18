/* ============================================================
   FILE: 19_trust_evidence_phase1_android_validation.js
   EXTERNAL-020 Phase 1 Android Real Device Validation
   Candidate Release: 0.1.1
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL020TrustEvidence;
  const VERSION_MANIFEST = global.EXTERNAL020VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const i = namespace.__internal;

  function runExternal020Phase1AndroidValidation() {
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
    const base = typeof namespace.runExternal020Phase1Validation === "function"
      ? namespace.runExternal020Phase1Validation()
      : null;

    add(
      "Phase 1 functional validation remains PASS",
      !!base && base.failed === 0 && base.criticalFailed === 0 && base.phase1TechnicalGateReady === true,
      base ? { validationId: base.validationId, passed: base.passed, failed: base.failed, criticalFailed: base.criticalFailed } : null,
      "Prerequisite"
    );

    add(
      "Android real-device user agent detected",
      /Android/i.test(ua),
      ua,
      "Device"
    );

    add(
      "Browser DOM runtime is available",
      typeof global.document !== "undefined",
      { documentType: typeof global.document },
      "Runtime"
    );

    const deps = namespace.getDependencyStatus();
    add(
      "EXTERNAL-010 Reliability Input API is available on Android",
      deps.external010 === true && deps.external010ReliabilityInput === true,
      deps,
      "Integration"
    );

    const compatibility = namespace.inspectExternal010Compatibility();
    add(
      "Android EXTERNAL-010 adapter remains read-only and local",
      compatibility.compatible === true &&
        compatibility.mutationApiInvoked === false &&
        compatibility.providerNetworkCallPerformed === false,
      compatibility,
      "Safety"
    );

    const input = namespace.readExternal010ReliabilityInput();
    const pkg = input && input.ok ? input.data.inputPackage : null;
    add(
      "Android can capture Reliability Input Package read-only",
      !!pkg && pkg.readOnly === true && pkg.rawEvidenceMutationPerformed === false,
      input,
      "Functional"
    );

    add(
      "Final Reliability Authority remains EXTERNAL-020 on Android",
      !!pkg && pkg.finalReliabilityAuthority === "EXTERNAL-020",
      pkg ? { inputPackageId: pkg.inputPackageId, finalReliabilityAuthority: pkg.finalReliabilityAuthority } : null,
      "Authority"
    );

    const ctx = namespace.createExternal020EvaluationContext({
      subjectType: "CLAIM",
      subjectRef: "CLAIM-ANDROID-VALIDATION-001",
      domain: "GENERAL",
      task: "EVIDENCE_REVIEW",
      purpose: "ANDROID_REAL_DEVICE_VALIDATION",
      timeHorizon: "CURRENT",
      evidenceRefs: ["EVIDENCE-ANDROID-A", "EVIDENCE-ANDROID-B"],
      inputPackageId: pkg && pkg.inputPackageId
    });

    add(
      "Android can create context-specific Evaluation Context",
      ctx.ok === true && ctx.data.context.subjectType === "CLAIM" && ctx.data.context.contextSpecific === true,
      ctx,
      "Functional",
      "Major"
    );

    const evaluation = namespace.createExternal020ReliabilityEvaluationCandidate({
      contextId: ctx.ok ? ctx.data.context.contextId : "",
      inputPackageId: pkg && pkg.inputPackageId,
      evaluationState: "UNRESOLVED",
      explanation: "Android real-device validation candidate"
    });
    const result = evaluation && evaluation.ok ? evaluation.data.evaluation : null;

    add(
      "Android can create Reliability Evaluation Candidate",
      !!result,
      evaluation,
      "Functional"
    );

    add(
      "Android preserves contradiction / abstention without automatic winner",
      !!result && result.evaluationState === "UNRESOLVED" && result.conflictWinner === null && result.automaticConflictResolutionPerformed === false,
      result,
      "Reliability"
    );

    add(
      "Android creates no false numerical reliability precision",
      !!result && result.reliabilityScore === null && result.authorityScore === null,
      result ? { reliabilityScore: result.reliabilityScore, authorityScore: result.authorityScore } : null,
      "Safety"
    );

    add(
      "Android Reliability evaluation grants no action / business / trading / financial authority",
      !!result && result.actionAuthorityGranted === false && result.businessAuthorityGranted === false && result.tradingAuthorityGranted === false && result.financialAuthorityGranted === false,
      result,
      "Authority"
    );

    add(
      "IDE-170 Confidence remains separate on Android",
      !!result && result.ide170ConfidenceOverwritten === false && VERSION_MANIFEST.safety.ide170ConfidenceOverwriteAllowed === false,
      result ? { ide170ConfidenceOverwritten: result.ide170ConfidenceOverwritten, overwriteAllowed: VERSION_MANIFEST.safety.ide170ConfidenceOverwriteAllowed } : null,
      "Safety"
    );

    add(
      "Android performs no Raw Evidence mutation or automatic Knowledge promotion",
      !!result && result.rawEvidenceMutationPerformed === false && result.knowledgePromotionPerformed === false,
      result ? { rawEvidenceMutationPerformed: result.rawEvidenceMutationPerformed, knowledgePromotionPerformed: result.knowledgePromotionPerformed } : null,
      "Safety"
    );

    const safety = namespace.getSafetyStatus();
    add(
      "Android safety boundary grants no Canonical mutation, paid API, external transmission, or self-granted authority",
      safety.canonicalRepositoryMutationAllowed === false &&
        safety.externalTransmissionAutomaticallyAllowed === false &&
        safety.paidApiExecutionAutomaticallyAllowed === false &&
        safety.selfGrantedAuthorityAllowed === false &&
        safety.validationEqualsApproval === false,
      safety,
      "Authority"
    );

    const coverage = namespace.getExternal020Phase1Coverage();
    add(
      "Android preserves 18 Requirement traceability without false full Decision completion",
      coverage.totalDecisionRequirements === 18 &&
        coverage.phase1ScopeComplete === true &&
        coverage.allDecisionRequirementsComplete === false &&
        coverage.falseFullDecisionCompletionClaimed === false,
      coverage,
      "Traceability"
    );

    add(
      "Android validation does not equal Project Owner approval",
      VERSION_MANIFEST.safety.validationEqualsApproval === false,
      { validationEqualsApproval: VERSION_MANIFEST.safety.validationEqualsApproval },
      "Authority"
    );

    const failedChecks = checks.filter(function (c) { return !c.passed; });
    const criticalFailed = failedChecks.filter(function (c) { return c.severity === "Critical"; }).length;
    const passed = checks.length - failedChecks.length;
    const gatePassed = failedChecks.length === 0;

    return i.deepFreeze({
      validationId: i.nextId("EXTERNAL020-PHASE1-ANDROID-REAL-DEVICE"),
      componentId: VERSION_MANIFEST.componentId,
      decisionId: VERSION_MANIFEST.decisionId,
      version: VERSION_MANIFEST.version,
      phase: 1,
      passed: passed,
      failed: failedChecks.length,
      total: checks.length,
      health: Number((passed / checks.length * 100).toFixed(1)),
      criticalFailed: criticalFailed,
      status: gatePassed ? "EXTERNAL-020 Phase 1 Android Real Device Validation PASS" : "EXTERNAL-020 Phase 1 Android Real Device Validation FAIL",
      androidRealDeviceValidation: {
        passed: gatePassed,
        userAgent: ua
      },
      phase1AndroidRealDeviceComplete: gatePassed,
      phase1ProjectOwnerGateReady: gatePassed,
      releaseAllowed: false,
      projectOwnerAcceptanceRequired: true,
      validationIsApproval: false,
      canonicalMutationPerformed: false,
      externalTransmissionPerformed: false,
      paidApiExecutionPerformed: false,
      checks: checks,
      validatedAt: i.nowIso(),
      immutable: true
    });
  }

  Object.assign(namespace.api, { runExternal020Phase1AndroidValidation: runExternal020Phase1AndroidValidation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase1AndroidValidation = {
    id: "EXTERNAL-020-PHASE1-ANDROID-REAL-DEVICE-VALIDATION",
    version: VERSION_MANIFEST.version,
    status: "Ready",
    phase: 1,
    releaseAllowed: false,
    validationIsApproval: false,
    loadedAt: i.nowIso()
  };
  global.runExternal020Phase1AndroidValidation = runExternal020Phase1AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
