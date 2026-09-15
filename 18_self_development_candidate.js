/* ============================================================
   FILE: 18_self_development_candidate.js
   Decision 058 Phase 1 / Candidate + Proposal Model
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, VERSION_MANIFEST = global.SELFDEVELOPMENT058VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const i = namespace.__internal, s = i.state;
  const RISK = ["LOW", "MEDIUM", "HIGH", "RED"];

  function resolveBaseline(input) {
    if (i.isPlainObject(input && input.baselineIdentity)) return input.baselineIdentity;
    return s.latestBaselineIdentityId ? s.baselineIdentityRecords.get(s.latestBaselineIdentityId) : null;
  }
  function createSelfDevelopmentCandidate(input) {
    const x = i.isPlainObject(input) ? input : {}, baseline = resolveBaseline(x);
    if (!baseline || baseline.passed !== true) return i.buildResult(false, "SELFDEV058_CONFIRMED_BASELINE_REQUIRED", "Blocked", null);
    const evidenceRefs = i.unique(x.evidenceRefs || []); if (!evidenceRefs.length) return i.buildResult(false, "SELFDEV058_EVIDENCE_REQUIRED", "Blocked", null);
    const riskLevel = i.text(x.riskLevel, "MEDIUM").toUpperCase(); if (!RISK.includes(riskLevel)) return i.buildResult(false, "SELFDEV058_RISK_LEVEL_INVALID", "Blocked", { riskLevel: riskLevel });
    const record = i.deepFreeze({
      candidateId: i.nextId("SELFDEV058-CANDIDATE"), candidateVersion: "1.0.0", baselineIdentityId: baseline.baselineIdentityId,
      opportunityType: i.text(x.opportunityType, "IMPROVEMENT_OPPORTUNITY").toUpperCase(), problemSummary: i.text(x.problemSummary, ""), evidenceRefs: evidenceRefs,
      affectedComponent: i.text(x.affectedComponent, "UNKNOWN"), affectedFiles: i.unique(x.affectedFiles || []), affectedFunctions: i.unique(x.affectedFunctions || []),
      expectedBenefit: i.text(x.expectedBenefit, ""), expectedSideEffects: i.unique(x.expectedSideEffects || []), riskLevel: riskLevel, impactScope: i.text(x.impactScope, "LOCAL"),
      estimatedChangeSize: i.text(x.estimatedChangeSize, "UNKNOWN"), rollbackStrategy: i.text(x.rollbackStrategy, "REQUIRED_BEFORE_ADOPTION"), validationRequirements: i.unique(x.validationRequirements || ["SYNTAX", "FUNCTIONAL", "REGRESSION", "AUTHORITY"]),
      externalAiRequirement: i.text(x.externalAiRequirement, "NOT_REQUIRED"), estimatedFinancialCostUsd: Number.isFinite(Number(x.estimatedFinancialCostUsd)) ? Number(x.estimatedFinancialCostUsd) : 0,
      authorityEffect: "none", confidence: Number.isFinite(Number(x.confidence)) ? Math.max(0, Math.min(1, Number(x.confidence))) : null, missingInformation: i.unique(x.missingInformation || []),
      state: "CANDIDATE", candidateApprovalGranted: false, adoptionAuthorizationGranted: false, diffGenerationAuthorized: false, canonicalMutationRequested: false, canonicalMutationPerformed: false,
      createdAt: i.nowIso(), immutable: true
    });
    if (!record.problemSummary) return i.buildResult(false, "SELFDEV058_PROBLEM_SUMMARY_REQUIRED", "Blocked", null);
    s.candidates.set(record.candidateId, record); s.latestCandidateId = record.candidateId;
    const lineage = i.deepFreeze({ lineageId: i.nextId("SELFDEV058-LINEAGE"), relationType: "SUPPORTED_BY", outputId: record.candidateId, inputIds: evidenceRefs, createdAt: i.nowIso(), immutable: true }); s.lineage.set(lineage.lineageId, lineage); i.touch();
    return i.buildResult(true, "SELFDEV058_CANDIDATE_CREATED", "Candidate", { candidate: record, lineage: lineage });
  }
  function detectSelfDevelopmentImprovementCandidates(input) {
    const x = i.isPlainObject(input) ? input : {}, observations = Array.isArray(x.observations) ? x.observations : [];
    const results = [];
    observations.forEach(function (obs) {
      const o = i.isPlainObject(obs) ? obs : {};
      const result = createSelfDevelopmentCandidate(Object.assign({}, o, { baselineIdentity: x.baselineIdentity || o.baselineIdentity }));
      results.push({ ok: result.ok, code: result.code, candidateId: result.ok && result.data.candidate.candidateId || null });
    });
    return i.buildResult(results.every(function (r) { return r.ok; }), "SELFDEV058_CANDIDATE_DETECTION_COMPLETE", "Completed", { results: results, detected: results.filter(function (r) { return r.ok; }).length, canonicalMutationPerformed: false });
  }
  function createSelfDevelopmentProposal(input) {
    const x = i.isPlainObject(input) ? input : {}, candidateId = i.text(x.candidateId, s.latestCandidateId || ""), candidate = s.candidates.get(candidateId);
    if (!candidate) return i.buildResult(false, "SELFDEV058_CANDIDATE_REQUIRED", "Blocked", null);
    const proposal = i.deepFreeze({
      proposalId: i.nextId("SELFDEV058-PROPOSAL"), candidateId: candidateId, baselineIdentityId: candidate.baselineIdentityId,
      changeSummary: i.text(x.changeSummary, candidate.problemSummary), recommendedApproach: i.text(x.recommendedApproach, "Smallest safe change consistent with existing architecture."), alternatives: i.unique(x.alternatives || []),
      impact: i.text(x.impact, candidate.impactScope), risk: i.text(x.risk, candidate.riskLevel), estimatedFinancialCostUsd: Number.isFinite(Number(x.estimatedFinancialCostUsd)) ? Number(x.estimatedFinancialCostUsd) : candidate.estimatedFinancialCostUsd,
      affectedFiles: i.unique(x.affectedFiles || candidate.affectedFiles), affectedFunctions: i.unique(x.affectedFunctions || candidate.affectedFunctions), validationRequirements: i.unique(x.validationRequirements || candidate.validationRequirements), rollbackStrategy: i.text(x.rollbackStrategy, candidate.rollbackStrategy),
      candidateApprovalRequired: true, candidateApprovalGranted: false, adoptionApprovalRequired: true, adoptionAuthorizationGranted: false, diffGenerationAuthorized: false,
      protectedControlPlaneChange: Boolean(x.protectedControlPlaneChange), architectureReviewRequired: Boolean(x.protectedControlPlaneChange), canonicalMutationPerformed: false, authorityEffect: "none", createdAt: i.nowIso(), immutable: true
    });
    s.proposals.set(proposal.proposalId, proposal); s.latestProposalId = proposal.proposalId;
    const lineage = i.deepFreeze({ lineageId: i.nextId("SELFDEV058-LINEAGE"), relationType: "PROPOSES_CHANGE_FOR", outputId: proposal.proposalId, inputIds: [candidateId], createdAt: i.nowIso(), immutable: true }); s.lineage.set(lineage.lineageId, lineage); i.touch();
    return i.buildResult(true, "SELFDEV058_PROPOSAL_CREATED", "Proposal", { proposal: proposal, lineage: lineage });
  }
  function getSelfDevelopmentCandidate(id) { return i.clone(s.candidates.get(i.text(id, "")) || null); }
  function getSelfDevelopmentProposal(id) { return i.clone(s.proposals.get(i.text(id, "")) || null); }
  function listSelfDevelopmentCandidates() { return Array.from(s.candidates.values()).map(i.clone); }
  function listSelfDevelopmentProposals() { return Array.from(s.proposals.values()).map(i.clone); }
  Object.assign(namespace.api, { createSelfDevelopmentCandidate, detectSelfDevelopmentImprovementCandidates, createSelfDevelopmentProposal, getSelfDevelopmentCandidate, getSelfDevelopmentProposal, listSelfDevelopmentCandidates, listSelfDevelopmentProposals }); Object.assign(namespace, namespace.api);
  namespace.modules.candidate = { id: "SELF-DEVELOPMENT-058-CANDIDATE", version: VERSION_MANIFEST.version, status: "Ready", smallestSafeMutationFirst: true, approvalImplemented: false, diffGenerationImplemented: false, canonicalMutationImplemented: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
