/* ============================================================
   FILE: 18_self_development_phase2_validation.js
   Decision 058 Phase 2 Runtime Validation
   Validation != Approval / No Provider Call / No Canonical Mutation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;
  const i = namespace.__internal, s = i.state;
  async function runSelfDevelopmentPhase2Validation(input) {
    const x = i.isPlainObject(input) ? input : {}, checks = [];
    function check(name, passed, detail, group, severity) { checks.push({ name: name, passed: Boolean(passed), detail: i.clone(detail), group: group || "Functional", severity: severity || "Major" }); }
    let baselineResult = null;
    if (x.manifest && x.projectInfo) baselineResult = namespace.inspectSelfDevelopmentBaselineIdentity({ manifest: x.manifest, projectInfo: x.projectInfo });
    else baselineResult = await namespace.loadSelfDevelopmentBaselineIdentity();
    const baseline = baselineResult && baselineResult.data && baselineResult.data.baselineIdentity || namespace.getLatestSelfDevelopmentBaselineIdentity();
    check("REQ-058-001 Phase 1 frozen baseline identity remains confirmed", baseline && baseline.passed === true, baseline, "Baseline", "Critical");

    const deps = namespace.inspectSelfDevelopmentPhase2ExistingCapabilities();
    check("REQ-058-002 Phase 2 capability adapter uses supported External status API without side effects", deps && deps.readOnly === true && deps.components && deps.components.external010 && deps.components.external010.available === true && deps.components.external010.status != null && deps.providerNetworkCallPerformed === false && deps.mutationApiInvoked === false, deps, "Integration", "Critical");

    const inspectionResult = await namespace.inspectSelfDevelopmentRepository({ baselineIdentity: baseline, maxFetchedFiles: 64 });
    const inspection = inspectionResult && inspectionResult.data && inspectionResult.data.inspection;
    const evidence = inspectionResult && inspectionResult.data && inspectionResult.data.evidence;
    check("REQ-058-002 Read-only repository/source inspection completes", inspectionResult && inspectionResult.ok === true && inspection && inspection.readOnly === true && inspection.canonicalMutationPerformed === false && inspection.sourceCodePersisted === false, inspection, "Inspection", "Critical");
    check("REQ-058-017 Repository inspection produces immutable baseline-bound evidence", evidence && evidence.immutable === true && evidence.baselineIdentityId === baseline.baselineIdentityId && evidence.persistable === true && evidence.sourceCodePersisted === false, evidence, "Evidence", "Critical");

    const missingIntegrity = namespace.validateSelfDevelopmentEvidenceRefs({ baselineIdentity: baseline, evidenceRefs: ["SELFDEV058-MISSING-EVIDENCE"] });
    check("REQ-058-004 Missing evidence reference fails closed", missingIntegrity && missingIntegrity.ok === false && missingIntegrity.code === "SELFDEV058_EVIDENCE_INTEGRITY_BLOCKED", missingIntegrity, "Negative", "Critical");
    const goodIntegrity = namespace.validateSelfDevelopmentEvidenceRefs({ baselineIdentity: baseline, evidenceRefs: evidence ? [evidence.evidenceId] : [] });
    check("REQ-058-004 Existing evidence resolves and baseline binding verifies", goodIntegrity && goodIntegrity.ok === true && goodIntegrity.data.resolvedCount === 1, goodIntegrity, "Evidence", "Critical");

    const syntheticOpportunities = namespace.evaluateSelfDevelopmentInspectionFindings({ findings: [{ type: "LARGE_SOURCE_FILE", severity: "MEDIUM", summary: "Synthetic deterministic detector contract test", autoCandidateEligible: true }] });
    check("REQ-058-003 Deterministic detector derives opportunity from inspection finding without AI", syntheticOpportunities.length === 1 && syntheticOpportunities[0].deterministic === true && syntheticOpportunities[0].aiGenerated === false, syntheticOpportunities, "Detection", "Critical");
    const detection = await namespace.detectSelfDevelopmentPhase2Candidates({ baselineIdentity: baseline, inspectionResult: inspectionResult });
    check("REQ-058-003 Actual repository detection completes and zero findings is valid", detection && detection.ok === true && detection.data && detection.data.detection && detection.data.detection.deterministic === true && detection.data.detection.providerNetworkCallPerformed === false, detection, "Detection", "Major");

    const functionScope = namespace.classifySelfDevelopmentChangeScope({ affectedFiles: ["18_self_development_phase2_candidate_detection.js"], affectedFunctions: ["evaluateSelfDevelopmentInspectionFindings"] });
    const protectedScope = namespace.classifySelfDevelopmentChangeScope({ affectedFiles: ["17_external_intelligence_openai_provider_integration.js"], affectedFunctions: ["prepareOpenAIResponsesRequest"] });
    check("REQ-058-009 Smallest safe change classifier prefers function patch when safe", functionScope.classification === "FUNCTION_PATCH" && functionScope.canonicalMutationAuthorized === false, functionScope, "Scope", "Critical");
    check("REQ-058-012 Protected control plane is escalated to architecture review", protectedScope.protectedControlPlaneChange === true && protectedScope.architectureReviewRequired === true && protectedScope.recommendedMutation === "NONE", protectedScope, "Safety", "Critical");

    const separationContract = namespace.buildSelfDevelopmentValidationSeparationContract({ changedComponents: ["SELF-DEVELOPMENT-058"], validatorComponents: ["SELF-DEVELOPMENT-058", "PC-STATIC-PACKAGE-VALIDATOR"] });
    const separation = namespace.validateSelfDevelopmentValidatorSeparation(separationContract);
    const badSeparation = namespace.validateSelfDevelopmentValidatorSeparation(namespace.buildSelfDevelopmentValidationSeparationContract({ changedComponents: ["SELF-DEVELOPMENT-058"], validatorComponents: ["SELF-DEVELOPMENT-058"] }));
    check("REQ-058-011 Independent validator separation contract accepts external validator", separation.ok === true && separation.data.independentValidatorComponents.includes("PC-STATIC-PACKAGE-VALIDATOR"), separation, "Validation", "Critical");
    check("REQ-058-011 Self-only validation fails closed", badSeparation.ok === false, badSeparation, "Negative", "Critical");

    const pipeline = namespace.getSelfDevelopmentPhase2ValidationPipeline();
    check("REQ-058-010 Phase 2 validation pipeline preserves Validation != Approval", pipeline.validationEqualsApproval === false && pipeline.projectOwnerAcceptanceRequired === true && pipeline.canonicalMutationAuthorized === false, pipeline, "Validation", "Critical");

    const external = namespace.inspectSelfDevelopmentExternalAiReadiness();
    check("REQ-058-013 External AI readiness inspection performs no provider call or source transmission", external.externalComponentAvailable === true && external.foundationStatusAvailable === true && external.providerNetworkCallPerformed === false && external.realApiRequestPerformed === false && external.sourceCodeTransmitted === false && external.authorityExpansionPerformed === false && external.budgetExpansionPerformed === false, external, "ExternalAI", "Critical");

    const persistenceResult = evidence ? namespace.persistSelfDevelopmentPhase2Evidence(evidence.evidenceId) : null;
    const persistenceStatus = namespace.getSelfDevelopmentPhase2PersistenceStatus();
    check("REQ-058-017 Bounded local persistence stores no source code/secrets and grants no authority", persistenceResult && persistenceResult.ok === true && persistenceStatus.bounded === true && persistenceStatus.sourceCodePersistenceAllowed === false && persistenceStatus.secretPersistenceAllowed === false && persistenceStatus.canonicalKnowledgePromotionAllowed === false, { result: persistenceResult, status: persistenceStatus }, "Persistence", "Critical");

    const coverage = namespace.getSelfDevelopmentPhase2Coverage();
    check("Decision 058 traceability preserves partial states and does not claim full completion", coverage.phase2ScopeComplete === true && coverage.totalDecisionRequirements === 18 && coverage.allDecisionRequirementsComplete === false && coverage.falseFullDecisionCompletionClaimed === false && coverage.partialStatesPreserved === true, coverage, "Traceability", "Critical");

    const hard = P2.hardBoundaries;
    check("Phase 2 hard boundaries remain fail-closed", hard.canonicalRepositoryMutation === false && hard.diffGeneration === false && hard.candidateApproval === false && hard.adoptionAuthorization === false && hard.providerNetworkCall === false && hard.authorityExpansion === false && hard.validationEqualsApproval === false, hard, "Safety", "Critical");

    const failed = checks.filter(function (c) { return !c.passed; }), criticalFailed = failed.filter(function (c) { return c.severity === "Critical"; }).length;
    const record = i.deepFreeze({ validationId: i.nextId("SELFDEV058-PHASE2-VALIDATION"), componentId: "SELF-DEVELOPMENT-058", decisionId: "EXTERNAL-010-DECISION-058", version: P2.version, phase: 2, passed: checks.length - failed.length, failed: failed.length, total: checks.length, health: Math.round((checks.length - failed.length) / checks.length * 100), criticalFailed: criticalFailed, releaseAllowed: false, phase2ImplementationComplete: failed.length === 0, phase2TechnicalGateReady: failed.length === 0, phase2Accepted: false, implementationPhase3Allowed: false, projectOwnerAcceptanceRequired: true, validationIsApproval: false, providerNetworkCallPerformed: false, diffGenerationPerformed: false, canonicalMutationPerformed: false, checks: checks, validatedAt: i.nowIso(), immutable: true });
    s.validations.set(record.validationId, record); s.latestPhase2ValidationId = record.validationId; i.touch();
    return i.clone(record);
  }
  function getLatestSelfDevelopmentPhase2Validation() { return s.latestPhase2ValidationId ? i.clone(s.validations.get(s.latestPhase2ValidationId)) : null; }
  Object.assign(namespace.api, { runSelfDevelopmentPhase2Validation, getLatestSelfDevelopmentPhase2Validation }); Object.assign(namespace, namespace.api);
  namespace.modules.phase2Validation = { id: "SELF-DEVELOPMENT-058-PHASE2-VALIDATION", version: P2.version, status: "Ready", validationIsApproval: false, releaseAllowed: false, providerNetworkCallPerformed: false, canonicalMutationPerformed: false, loadedAt: i.nowIso() };
  global.runSelfDevelopment058Phase2Validation = runSelfDevelopmentPhase2Validation;
})(typeof window !== "undefined" ? window : globalThis);
