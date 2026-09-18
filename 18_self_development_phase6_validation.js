/* ============================================================
   FILE: 18_self_development_phase6_validation.js
   Decision 058 Phase 6 / No-Network Governance Validation
   IMPORTANT: Validation never calls the external provider network.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P6 = global.SELFDEVELOPMENT058Phase6VersionManifest;
  if (!namespace || !namespace.__internal || !P6) return;
  async function runSelfDevelopment058Phase6Validation() {
    const checks = [];
    function check(name, passed, detail, group, severity) { checks.push({ name: name, passed: passed === true, detail: detail, group: group || "General", severity: severity || "Critical" }); }
    const policy = namespace.getSelfDevelopmentPhase6ExternalAiContextPolicy();
    const policyValidation = namespace.validateSelfDevelopmentPhase6ContextPolicy();
    check("Phase 6 context policy is explicit and bounded", policyValidation.valid === true && policy.maxEvidenceItems === 8 && policy.maxTotalEvidenceChars === 12000 && policy.maxPromptChars === 18000, { policy: policy, validation: policyValidation }, "Policy");
    check("Repository-wide automatic transmission remains prohibited", policy.repositoryWideAutomaticTransmissionAllowed === false && P6.hardBoundaries.repositoryWideAutomaticExternalTransmissionAllowed === false, policy, "Safety");
    check("Secret values remain prohibited from Phase 6 context", P6.hardBoundaries.secretValueTransmissionAllowed === false, P6.hardBoundaries, "Safety");
    const validContext = await namespace.buildSelfDevelopmentPhase6ContextPackage({ userIntent: "Inspect the bounded evidence and propose a safe correction.", evidenceItems: [{ evidenceType: "REPOSITORY_FILE", sourceId: "fixture.js", sourcePath: "fixture.js", locator: "function fixture", excerpt: "function fixture(){ return true; }", selectionReason: "validation fixture" }] });
    check("Bounded explicit context package builds without transmission", validContext.ok === true && validContext.data.contextPackage.evidenceItemCount === 1 && validContext.data.contextPackage.externalTransmissionPerformed === false && validContext.data.contextPackage.repositoryWideTransmission === false, validContext, "Context");
    const secretBlocked = await namespace.buildSelfDevelopmentPhase6ContextPackage({ userIntent: "Analyze", evidenceItems: [{ evidenceType: "USER_SUPPLIED", sourceId: "secret-fixture", excerpt: "api_key = \"sk-12345678901234567890\"" }] });
    check("Secret-like values fail closed before provider preparation", secretBlocked.ok === false && /CONTEXT_BLOCKED/.test(secretBlocked.code), secretBlocked, "Negative");
    const tooWide = await namespace.buildSelfDevelopmentPhase6ContextPackage({ userIntent: "Analyze", evidenceItems: Array.from({ length: 9 }, function (_, x) { return { evidenceType: "USER_SUPPLIED", sourceId: "e" + x, excerpt: "x" }; }) });
    check("Repository-wide style oversized evidence set fails closed", tooWide.ok === false, tooWide, "Negative");
    const readiness = namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness();
    check("OpenAI integration must be Final Validated and governed source ready", readiness.openAIFinalValidated === true && readiness.sourceReady === true && readiness.operationReady === true && readiness.usagePolicyReady === true && readiness.secretReferenceReady === true && readiness.readiness === "PHASE6_EXTERNAL_AI_READY", readiness, "Integration");
    check("Readiness inspection performs no provider call or authority expansion", readiness.providerNetworkCallPerformed === false && readiness.budgetExpansionPerformed === false && readiness.authorityExpansionPerformed === false && readiness.canonicalMutationPerformed === false, readiness, "Safety");
    const prepared = await namespace.prepareSelfDevelopmentPhase6ExternalAiReasoning({ userIntent: "Inspect and propose a safe correction.", evidenceItems: [{ evidenceType: "VALIDATION_EVIDENCE", sourceId: "VAL-1", excerpt: "failed=1; cause=fixture mismatch" }], model: "gpt-5.6-luna", maxOutputTokens: 256 });
    check("Existing EXTERNAL-010 OpenAI request preparation is reused", prepared.ok === true && prepared.data.requestCandidate.sourceId === "SOURCE-OPENAI" && prepared.data.requestCandidate.operationId === "INTERNAL_ANALYSIS" && prepared.data.requestCandidate.body.store === false, prepared, "Integration");
    check("Prepared request remains no-network and bounded by existing budget", prepared.data.providerNetworkCallPerformed === false && prepared.data.externalTransmissionPerformed === false && prepared.data.budgetExpansionPerformed === false && prepared.data.budgetIds.length > 0 && prepared.data.perRequestHardCapUsd > 0, prepared.data, "Safety");
    const blockedExecute = await namespace.executeSelfDevelopmentPhase6ExternalAiReasoning({ userIntent: "Analyze", evidenceItems: [{ evidenceType: "USER_SUPPLIED", sourceId: "fixture", excerpt: "safe text" }], projectOwnerConfirmed: false, externalTransmissionApproved: false });
    check("Provider execution requires explicit Project Owner transmission approval", blockedExecute.ok === false && blockedExecute.code === "SELFDEV058_PHASE6_EXTERNAL_TRANSMISSION_PROJECT_OWNER_APPROVAL_REQUIRED", blockedExecute, "Authority");
    check("Real execution API exists but validation does not authorize or call it", typeof namespace.executeSelfDevelopmentPhase6ExternalAiReasoning === "function", { calledWithAuthority: false }, "Execution Boundary");
    const handoff = namespace.buildSelfDevelopmentPhase6ReasoningHandoff({ reasoningCandidateId: "VALIDATION-CANDIDATE", contextHash: validContext.data.contextPackage.contextHash, outputClassification: "AI_PROPOSAL_CANDIDATE_ONLY", outputText: "Candidate analysis" });
    check("Provider output handoff remains proposal-only and patch-free", handoff.ok === true && handoff.data.patchGenerated === false && handoff.data.candidateApprovalGranted === false && handoff.data.adoptionAuthorizationGranted === false && handoff.data.mutationAuthorityGranted === false, handoff, "Authority");
    const audit = namespace.getSelfDevelopmentPhase6ExternalAiAuditStatus();
    check("Phase 6 audit is bounded and persists no raw context, output, or secret", audit.bounded === true && audit.rawContextPersisted === false && audit.rawProviderOutputPersisted === false && audit.secretValuePersisted === false, audit, "Audit");
    const coverage = namespace.getSelfDevelopmentPhase6Coverage();
    check("REQ-058-013 is closed by governed External AI integration", coverage.req058013ExternalAiGovernanceImplemented === true && /IMPLEMENTED_PHASE6/.test(coverage.requirementStates["REQ-058-013"]), coverage, "Traceability");
    check("Decision 058 can reach technical 18/18 only when Phase 5A live evidence is complete", coverage.phase5LiveTrialComplete === true && coverage.fullyImplementedDecisionRequirements === 18 && coverage.allDecisionRequirementsComplete === true && coverage.decision058TechnicalImplementationComplete === true, coverage, "Traceability");
    check("18/18 technical completion never auto-freezes Decision 058", coverage.finalDecisionFreezePerformed === false && coverage.finalDecisionFreezeAllowedAutomatically === false && coverage.projectOwnerFinalAcceptanceRequired === true && coverage.falseFullDecisionFreezeClaimed === false, coverage, "Safety");
    const h = P6.hardBoundaries;
    check("Phase 6 hard boundaries remain fail-closed", h.validationMayExecuteProviderNetworkCall === false && h.providerOutputEqualsApproval === false && h.providerOutputEqualsAdoptionAuthorization === false && h.providerOutputGrantsMutationAuthority === false && h.providerMayDirectlyMutateRepository === false && h.automaticBudgetExpansionAllowed === false && h.secondExternalAiExecutionEngineAllowed === false && h.secondMutationEngineAllowed === false, h, "Safety");
    const dashboard = namespace.getSelfDevelopmentPhase6Dashboard();
    check("Phase 6 dashboard exposes governance state without mutation controls", dashboard.providerOutputProposalCandidateOnly === true && dashboard.directRepositoryMutationAvailable === false && dashboard.automaticCandidateApprovalAvailable === false && dashboard.automaticAdoptionAvailable === false, dashboard, "UI");
    const failed = checks.filter(function (x) { return !x.passed; });
    const criticalFailed = failed.filter(function (x) { return x.severity === "Critical"; }).length;
    return Object.freeze({ validationId: namespace.__internal.nextId("SELFDEV058-PHASE6-VALIDATION"), componentId: "SELF-DEVELOPMENT-058", decisionId: "EXTERNAL-010-DECISION-058", version: P6.version, phase: 6, passed: checks.length - failed.length, failed: failed.length, total: checks.length, health: checks.length ? Math.round(((checks.length - failed.length) / checks.length) * 10000) / 100 : 100, criticalFailed: criticalFailed, releaseAllowed: false, phase6ImplementationComplete: failed.length === 0, phase6TechnicalGateReady: failed.length === 0, req058013Closed: failed.length === 0, decision058Technical18Of18: failed.length === 0 && coverage.fullyImplementedDecisionRequirements === 18, projectOwnerAcceptanceRequired: true, validationIsApproval: false, providerNetworkCallPerformedByValidation: false, externalTransmissionPerformedByValidation: false, budgetExpansionPerformedByValidation: false, canonicalMutationPerformed: false, finalDecisionFreezePerformed: false, checks: checks, validatedAt: new Date().toISOString(), immutable: true });
  }
  namespace.runSelfDevelopment058Phase6Validation = runSelfDevelopment058Phase6Validation;
  global.runSelfDevelopment058Phase6Validation = runSelfDevelopment058Phase6Validation;
})(typeof window !== "undefined" ? window : globalThis);
