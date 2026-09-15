/* ============================================================
   FILE: 18_self_development_phase3_validation.js
   Decision 058 Phase 3 / Runtime Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P3 = global.SELFDEVELOPMENT058Phase3VersionManifest;
  if (!namespace || !namespace.__internal || !P3) return;
  const i = namespace.__internal;
  async function runSelfDevelopment058Phase3Validation() {
    const checks = []; function check(name, passed, detail, group, severity) { checks.push({ name: name, passed: passed === true, detail: detail, group: group || "Functional", severity: severity || "Critical" }); }
    const policy = namespace.getSelfDevelopmentPhase3ApprovalPolicy();
    const guide = namespace.getSelfDevelopmentPhase3RelaxationGuide();
    const policyValidation = namespace.validateSelfDevelopmentPhase3ApprovalPolicy(policy);
    check("REQ-058-007 Strict initial approval policy is explicit", policy.approverMode === "PROJECT_OWNER_ONLY" && policy.expirationMode === "TIME_BOUND" && policy.consumptionMode === "SINGLE_USE" && policy.maxConsumptions === 1, policy, "Policy");
    check("Future relaxation points and exact engine enforcement refs are discoverable", guide && guide.changeEntryPoints.length >= 6 && guide.engineMigrationRequired === true && guide.engineEnforcementRefs.some(function (x) { return /13_development_automation_approval\.js/.test(x); }), guide, "Policy");
    check("Permanent approval hard boundaries cannot be relaxed by policy", policyValidation.valid === true && policy.immutableHardBoundaries.selfApprovalAllowed === false && policy.immutableHardBoundaries.validationEqualsApproval === false && policy.immutableHardBoundaries.hardDenyBypassAllowed === false, policyValidation, "Safety");
    const fixtureValidation = namespace.validateSelfDevelopmentPhase3PatchFixture();
    check("REQ-058-008 Safe patch fixture is non-Protected and memory-only", fixtureValidation.valid === true, fixtureValidation, "Fixture");

    let baseline = null;
    if (global.__SELFDEV058_PHASE3_VALIDATION_MANIFEST && global.__SELFDEV058_PHASE3_VALIDATION_PROJECT_INFO) baseline = namespace.inspectSelfDevelopmentBaselineIdentity({ manifest: global.__SELFDEV058_PHASE3_VALIDATION_MANIFEST, projectInfo: global.__SELFDEV058_PHASE3_VALIDATION_PROJECT_INFO });
    else if (typeof namespace.loadSelfDevelopmentBaselineIdentity === "function") baseline = await namespace.loadSelfDevelopmentBaselineIdentity();
    const baselineRecord = baseline && baseline.data && baseline.data.baselineIdentity || namespace.getLatestSelfDevelopmentBaselineIdentity();
    check("REQ-058-001 Baseline identity remains confirmed", Boolean(baselineRecord && baselineRecord.passed === true), baselineRecord, "Baseline");

    let evidence = null;
    if (baselineRecord) {
      const ev = namespace.createSelfDevelopmentInspectionEvidence({ baselineIdentity: baselineRecord, summary: "Phase 3 approval-boundary fixture evidence", sourceRefs: ["SELF-DEVELOPMENT-058-PHASE3"] });
      evidence = ev && ev.data && ev.data.evidence || null;
    }
    const candidateResult = evidence ? namespace.createSelfDevelopmentCandidate({ baselineIdentity: baselineRecord, evidenceRefs: [evidence.evidenceId], problemSummary: "Validate approval-bound patch candidate generation", affectedComponent: "SELF-DEVELOPMENT-058-TEST-FIXTURE", affectedFiles: ["SELFDEV058_PHASE3_IN_MEMORY_FIXTURE.js"], affectedFunctions: ["selfDevelopmentPhase3Fixture"], riskLevel: "LOW", impactScope: "LOCAL", estimatedChangeSize: "SMALL" }) : null;
    const candidate = candidateResult && candidateResult.data && candidateResult.data.candidate || null;
    const proposalResult = candidate ? namespace.createSelfDevelopmentProposal({ candidateId: candidate.candidateId, changeSummary: "Phase 3 safe in-memory function patch fixture", protectedControlPlaneChange: false }) : null;
    const proposal = proposalResult && proposalResult.data && proposalResult.data.proposal || null;
    const ctxResult = candidate && proposal ? namespace.createSelfDevelopmentPhase3ApprovalContext({ candidateId: candidate.candidateId, proposalId: proposal.proposalId }) : null;
    const ctx = ctxResult && ctxResult.data && ctxResult.data.context || null;
    check("REQ-058-007 Candidate approval context binds candidate/proposal/baseline/evidence", Boolean(ctx && ctx.candidateId === candidate.candidateId && ctx.proposalId === proposal.proposalId && ctx.adoptionAuthorizationGranted === false), ctx, "Approval");

    const protectedProposal = candidate ? namespace.createSelfDevelopmentProposal({ candidateId: candidate.candidateId, changeSummary: "Protected fixture", protectedControlPlaneChange: true }) : null;
    const protectedContext = protectedProposal && protectedProposal.data && protectedProposal.data.proposal ? namespace.createSelfDevelopmentPhase3ApprovalContext({ candidateId: candidate.candidateId, proposalId: protectedProposal.data.proposal.proposalId }) : null;
    check("REQ-058-012 Protected control plane approval context fails closed", Boolean(protectedContext && protectedContext.ok === false), protectedContext, "Negative");

    const noApprovalPatch = namespace.prepareSelfDevelopmentPhase3PatchCandidate({ approvalValidation: null });
    check("REQ-058-008 Patch candidate generation is blocked without approval", noApprovalPatch.ok === false, noApprovalPatch, "Negative");

    let liveApproval = null;
    const ide190 = global.IDE190DevelopmentAutomation;
    if (ctx && ide190 && typeof ide190.validateAutomationApproval === "function" && typeof ide190.getAutomationApprovalStatus === "function") {
      const status = ide190.getAutomationApprovalStatus();
      if (status && status.approval && status.approval.contextHash === ctx.contextHash) liveApproval = namespace.validateIDE190CandidateApproval({ approvalContextId: ctx.approvalContextId, approvalId: status.approval.approvalId });
    }
    const approvalProbe = liveApproval || i.buildResult(false, "SELFDEV058_PHASE3_LIVE_PROJECT_OWNER_APPROVAL_NOT_PRESENT", "Awaiting-Approval", { candidateApprovalGranted: false, validationOnly: true });
    check("REQ-058-007 No approval is fabricated when live IDE-190 approval is absent", liveApproval ? liveApproval.ok === true : approvalProbe.ok === false, approvalProbe, "Approval", "Major");

    const simulatedApproved = i.buildResult(true, "SELFDEV058_PHASE3_VALIDATION_APPROVAL_FIXTURE", "Approved", { approvalContextId: ctx && ctx.approvalContextId || "fixture", approvalId: "VALIDATION-FIXTURE-ONLY", candidateApprovalGranted: true, patchCandidateGenerationAuthorized: true, adoptionAuthorizationGranted: false, canonicalMutationAuthorized: false, validationEqualsApproval: false });
    const patch = namespace.prepareSelfDevelopmentPhase3PatchCandidate({ approvalValidation: simulatedApproved, fixture: namespace.getSelfDevelopmentPhase3PatchFixture() });
    check("REQ-058-008 Approval-scoped patch candidate can be prepared without repository write", patch.ok === true && patch.data.patchCandidate.autoApply === false && patch.data.patchCandidate.canonicalRepositoryMutationPerformed === false, patch, "Patch");
    const patchVerify = patch.ok ? namespace.verifySelfDevelopmentPhase3PatchCandidate({ patchCandidateId: patch.data.patchCandidate.patchCandidateId }) : null;
    check("REQ-058-010 Patch candidate verification preserves adoption boundary", Boolean(patchVerify && patchVerify.ok === true && patchVerify.data.validationEqualsApproval === false && patchVerify.data.canonicalMutationPerformed === false), patchVerify, "Validation");
    const indep = namespace.validateSelfDevelopmentPhase3IndependentPatchEvidence({ patchVerification: patchVerify, changedComponents: ["SELF-DEVELOPMENT-058"], validatorComponents: ["SELF-DEVELOPMENT-058", "PC-STATIC-PACKAGE-VALIDATOR"] });
    check("REQ-058-011 Independent validator evidence is required and accepted", indep.ok === true && indep.data.independentValidatorComponents.length === 1, indep, "Validation");
    const selfOnly = namespace.validateSelfDevelopmentPhase3IndependentPatchEvidence({ patchVerification: patchVerify, changedComponents: ["SELF-DEVELOPMENT-058"], validatorComponents: ["SELF-DEVELOPMENT-058"] });
    check("REQ-058-011 Self-only patch validation fails closed", selfOnly.ok === false, selfOnly, "Negative");
    const coverage = namespace.getSelfDevelopmentPhase3Coverage();
    check("Decision 058 traceability advances Phase 3 without false full completion", coverage.totalDecisionRequirements === 18 && coverage.phase3ScopeComplete === true && coverage.allDecisionRequirementsComplete === false && coverage.falseFullDecisionCompletionClaimed === false, coverage, "Traceability");
    const dashboard = namespace.getSelfDevelopmentPhase3DashboardStatus();
    check("Read-only dashboard exposes relaxation config and no adoption/mutation actions", dashboard.readOnly === true && dashboard.mutationActionsAvailable === false && dashboard.adoptionActionsAvailable === false && dashboard.approvalPolicy && dashboard.approvalPolicy.relaxationConfigFile === "18_self_development_phase3_approval_policy.js", dashboard, "UI");
    check("Phase 3 hard boundaries remain fail-closed", P3.hardBoundaries.selfApprovalAllowed === false && P3.hardBoundaries.approvalBypassAllowed === false && P3.hardBoundaries.candidateApprovalEqualsAdoptionAuthorization === false && P3.hardBoundaries.patchGenerationEqualsMutationAuthority === false && P3.hardBoundaries.canonicalRepositoryMutationAllowed === false && P3.hardBoundaries.validationEqualsApproval === false, P3.hardBoundaries, "Safety");

    const failed = checks.filter(function (c) { return !c.passed; }), criticalFailed = failed.filter(function (c) { return c.severity === "Critical"; }).length;
    const result = i.deepFreeze({ validationId: i.nextId("SELFDEV058-PHASE3-VALIDATION"), componentId: "SELF-DEVELOPMENT-058", decisionId: P3.decisionId, version: P3.version, phase: 3, passed: checks.length - failed.length, failed: failed.length, total: checks.length, health: Math.round((checks.length - failed.length) / checks.length * 100), criticalFailed: criticalFailed, releaseAllowed: false, phase3ImplementationComplete: failed.length === 0, phase3TechnicalGateReady: failed.length === 0, phase3Accepted: false, implementationPhase4Allowed: false, projectOwnerAcceptanceRequired: true, validationIsApproval: false, adoptionAuthorizationGranted: false, canonicalMutationPerformed: false, repository010AcceptanceTokenIssued: false, checks: checks, validatedAt: i.nowIso(), immutable: true });
    return result;
  }
  global.runSelfDevelopment058Phase3Validation = runSelfDevelopment058Phase3Validation;
  Object.assign(namespace.api, { runSelfDevelopment058Phase3Validation }); Object.assign(namespace, namespace.api);
  namespace.modules.phase3Validation = { id: "SELF-DEVELOPMENT-058-PHASE3-VALIDATION", version: P3.version, status: "Ready", validationIsApproval: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
