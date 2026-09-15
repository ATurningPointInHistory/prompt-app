/* ============================================================
   FILE: 18_self_development_phase1_validation.js
   Decision 058 Phase 1 Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, VERSION_MANIFEST = global.SELFDEVELOPMENT058VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const i = namespace.__internal, s = i.state;
  async function runSelfDevelopmentPhase1Validation(input) {
    const x = i.isPlainObject(input) ? input : {}, checks = [];
    function check(name, passed, detail, group, severity) { checks.push({ name:name, passed:Boolean(passed), detail:i.clone(detail), group:group || "Functional", severity:severity || "Major" }); }
    let baselineResult = null;
    if (x.manifest && x.projectInfo) baselineResult = namespace.inspectSelfDevelopmentBaselineIdentity({ manifest:x.manifest, projectInfo:x.projectInfo });
    else if (typeof namespace.loadSelfDevelopmentBaselineIdentity === "function") baselineResult = await namespace.loadSelfDevelopmentBaselineIdentity();
    const baseline = baselineResult && baselineResult.data && baselineResult.data.baselineIdentity || namespace.getLatestSelfDevelopmentBaselineIdentity();
    check("REQ-058-001 Canonical Baseline Identity Gate passes", baseline && baseline.passed === true, baseline, "Baseline", "Critical");
    const deps = namespace.getDependencyStatus(); check("Phase1 scope Existing component inspection dependencies are visible", deps.ide140 && deps.ide170 && deps.ide190 && deps.repository010 && deps.external010, deps, "Integration", "Major");
    const inspect = namespace.inspectSelfDevelopmentExistingCapabilities(); check("Read-only adapter invokes no mutation/approval/provider call", inspect.readOnly === true && inspect.mutationApiInvoked === false && inspect.approvalApiInvoked === false && inspect.providerNetworkCallPerformed === false, inspect, "Safety", "Critical");
    const ev = namespace.createSelfDevelopmentInspectionEvidence({ summary:"Phase 1 validation evidence" }); check("Phase1 scope Inspection evidence foundation can be recorded", ev.ok === true && ev.data.evidence.canonicalMutationPerformed === false, ev, "Evidence", "Major");
    const noEvidence = namespace.createSelfDevelopmentCandidate({ baselineIdentity:baseline, problemSummary:"Must fail without evidence" }); check("Candidate without evidence is rejected", noEvidence.ok === false, noEvidence, "Negative", "Critical");
    const cand = namespace.createSelfDevelopmentCandidate({ baselineIdentity:baseline, problemSummary:"Validation candidate", evidenceRefs:ev.ok ? [ev.data.evidence.evidenceId] : [], affectedComponent:"SELF-DEVELOPMENT-058", affectedFiles:["18_self_development_candidate.js"], expectedBenefit:"Validate candidate contract", riskLevel:"LOW", impactScope:"LOCAL", estimatedChangeSize:"SMALL", confidence:1 });
    check("Phase1 scope Candidate registry can create an evidence-linked candidate", cand.ok === true, cand, "Functional", "Major");
    check("REQ-058-018 Candidate grants no authority or mutation", cand.ok === true && cand.data.candidate.candidateApprovalGranted === false && cand.data.candidate.adoptionAuthorizationGranted === false && cand.data.candidate.canonicalMutationPerformed === false && cand.data.candidate.authorityEffect === "none", cand.ok && cand.data.candidate, "Safety", "Critical");
    const prop = namespace.createSelfDevelopmentProposal({ candidateId:cand.ok ? cand.data.candidate.candidateId : "", changeSummary:"Validation proposal", recommendedApproach:"No-op validation proposal", estimatedFinancialCostUsd:0 });
    check("REQ-058-005 Structured proposal can be created", prop.ok === true, prop, "Functional", "Major");
    check("REQ-058-006 Proposal includes impact/risk/cost", prop.ok === true && typeof prop.data.proposal.impact === "string" && typeof prop.data.proposal.risk === "string" && Number.isFinite(prop.data.proposal.estimatedFinancialCostUsd), prop.ok && prop.data.proposal, "Functional", "Major");
    check("Candidate approval != adoption authorization", prop.ok === true && prop.data.proposal.candidateApprovalRequired === true && prop.data.proposal.candidateApprovalGranted === false && prop.data.proposal.adoptionApprovalRequired === true && prop.data.proposal.adoptionAuthorizationGranted === false, prop.ok && prop.data.proposal, "Safety", "Critical");
    const safety = namespace.getSafetyStatus(); check("Protected control plane hard denies remain fail-closed", safety.directCanonicalRepositoryMutationAllowed === false && safety.automaticAuthorityExpansionAllowed === false && safety.automaticBudgetExpansionAllowed === false && safety.automaticKnowledgePromotionAllowed === false && safety.selfGrantedAuthorityAllowed === false, safety, "Safety", "Critical");
    check("Validation != Approval is fixed", safety.validationEqualsApproval === false && safety.candidateApprovalEqualsAdoptionAuthorization === false, safety, "Safety", "Critical");
    const coverage = namespace.getSelfDevelopmentPhase1Coverage(); check("Requirement traceability uses 18 stable Decision IDs", coverage.totalDecisionRequirements === 18 && coverage.rows.every(function (r) { return /^REQ-058-\d{3}$/.test(r.requirementId); }), coverage, "Traceability", "Critical");
    check("Phase 1 scope is complete without false full-Decision completion", coverage.phase1ScopeComplete === true && coverage.allDecisionRequirementsComplete === false && coverage.falseFullDecisionCompletionClaimed === false, coverage, "Traceability", "Critical");
    const dashboard = namespace.getSelfDevelopmentDashboardStatus(); check("Read-only dashboard exposes no mutation actions", dashboard.readOnly === true && dashboard.mutationActionsAvailable === false && dashboard.approvalActionsAvailable === false && dashboard.canonicalMutationImplemented === false, dashboard, "UI", "Critical");
    check("No Phase 1 persistent commit implementation", namespace.modules.candidate.diffGenerationImplemented === false && namespace.modules.candidate.canonicalMutationImplemented === false && namespace.modules.core.canonicalMutationImplemented === false, { core:namespace.modules.core, candidate:namespace.modules.candidate }, "Safety", "Critical");
    const failed = checks.filter(function (c) { return !c.passed; }), criticalFailed = failed.filter(function (c) { return c.severity === "Critical"; }).length;
    const record = i.deepFreeze({ validationId:i.nextId("SELFDEV058-PHASE1-VALIDATION"), componentId:VERSION_MANIFEST.componentId, decisionId:VERSION_MANIFEST.decisionId, version:VERSION_MANIFEST.version, phase:1, passed:checks.length-failed.length, failed:failed.length, total:checks.length, health:Math.round((checks.length-failed.length)/checks.length*100), criticalFailed:criticalFailed, releaseAllowed:false, phase1ImplementationComplete:failed.length===0, phase1TechnicalGateReady:failed.length===0, phase1Accepted:false, implementationPhase2Allowed:false, projectOwnerAcceptanceRequired:true, validationIsApproval:false, canonicalMutationPerformed:false, checks:checks, validatedAt:i.nowIso(), immutable:true });
    s.validations.set(record.validationId, record); s.latestValidationId = record.validationId; i.touch();
    return i.clone(record);
  }
  function getLatestSelfDevelopmentPhase1Validation() { return s.latestValidationId ? i.clone(s.validations.get(s.latestValidationId)) : null; }
  Object.assign(namespace.api, { runSelfDevelopmentPhase1Validation, getLatestSelfDevelopmentPhase1Validation }); Object.assign(namespace, namespace.api);
  namespace.modules.phase1Validation = { id:"SELF-DEVELOPMENT-058-PHASE1-VALIDATION", version:VERSION_MANIFEST.version, status:"Ready", validationIsApproval:false, releaseAllowed:false, loadedAt:i.nowIso() };
  global.runSelfDevelopment058Phase1Validation = runSelfDevelopmentPhase1Validation;
})(typeof window !== "undefined" ? window : globalThis);
