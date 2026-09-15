/* ============================================================
   FILE: 18_self_development_phase2_evidence_integrity.js
   Decision 058 Phase 2 / Evidence Integrity + Baseline Binding
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;
  const i = namespace.__internal, s = i.state;
  function resolveBaseline(input) { return i.isPlainObject(input && input.baselineIdentity) ? input.baselineIdentity : (s.latestBaselineIdentityId ? s.baselineIdentityRecords.get(s.latestBaselineIdentityId) : null); }
  function validateSelfDevelopmentEvidenceRefs(input) {
    const x = i.isPlainObject(input) ? input : {}, baseline = resolveBaseline(x), refs = i.unique(x.evidenceRefs || []), failures = [], resolved = [];
    if (!baseline || baseline.passed !== true) failures.push("confirmed-baseline-required");
    if (!refs.length) failures.push("evidence-required");
    refs.forEach(function (id) {
      const e = s.evidence.get(id);
      if (!e) { failures.push("missing-evidence:" + id); return; }
      if (e.immutable !== true) failures.push("mutable-evidence:" + id);
      if (e.canonicalMutationPerformed !== false) failures.push("mutation-evidence-invalid:" + id);
      if (i.text(e.authorityEffect, "none") !== "none") failures.push("authority-effect-invalid:" + id);
      if (!e.baselineIdentityId || !baseline || e.baselineIdentityId !== baseline.baselineIdentityId) failures.push("baseline-binding-mismatch:" + id);
      resolved.push(e);
    });
    return i.buildResult(failures.length === 0, failures.length ? "SELFDEV058_EVIDENCE_INTEGRITY_BLOCKED" : "SELFDEV058_EVIDENCE_INTEGRITY_CONFIRMED", failures.length ? "Blocked" : "Confirmed", { baselineIdentityId: baseline && baseline.baselineIdentityId || null, evidenceRefs: refs, resolvedCount: resolved.length, failures: failures, failClosed: true, canonicalMutationPerformed: false });
  }
  function createSelfDevelopmentPhase2Candidate(input) {
    const x = i.isPlainObject(input) ? input : {}, baseline = resolveBaseline(x);
    const integrity = validateSelfDevelopmentEvidenceRefs({ baselineIdentity: baseline, evidenceRefs: x.evidenceRefs });
    if (!integrity.ok) return integrity;
    const risk = i.text(x.riskLevel, "MEDIUM").toUpperCase();
    if (!["LOW", "MEDIUM", "HIGH", "RED"].includes(risk)) return i.buildResult(false, "SELFDEV058_RISK_LEVEL_INVALID", "Blocked", { riskLevel: risk });
    const record = i.deepFreeze({
      candidateId: i.nextId("SELFDEV058-CANDIDATE"), candidateVersion: "2.0.0", phase: 2,
      baselineIdentityId: baseline.baselineIdentityId, opportunityType: i.text(x.opportunityType, "IMPROVEMENT_OPPORTUNITY").toUpperCase(), problemSummary: i.text(x.problemSummary, ""),
      evidenceRefs: integrity.data.evidenceRefs, evidenceIntegrityConfirmed: true, affectedComponent: i.text(x.affectedComponent, "UNKNOWN"), affectedFiles: i.unique(x.affectedFiles || []), affectedFunctions: i.unique(x.affectedFunctions || []),
      expectedBenefit: i.text(x.expectedBenefit, ""), expectedSideEffects: i.unique(x.expectedSideEffects || []), riskLevel: risk, impactScope: i.text(x.impactScope, "LOCAL"), estimatedChangeSize: i.text(x.estimatedChangeSize, "UNKNOWN"),
      rollbackStrategy: i.text(x.rollbackStrategy, "REQUIRED_BEFORE_ADOPTION"), validationRequirements: i.unique(x.validationRequirements || ["SYNTAX", "FUNCTIONAL", "REGRESSION", "AUTHORITY", "INDEPENDENT_VALIDATOR"]),
      externalAiRequirement: i.text(x.externalAiRequirement, "NOT_REQUIRED"), estimatedFinancialCostUsd: Number.isFinite(Number(x.estimatedFinancialCostUsd)) ? Number(x.estimatedFinancialCostUsd) : 0,
      authorityEffect: "none", confidence: Number.isFinite(Number(x.confidence)) ? Math.max(0, Math.min(1, Number(x.confidence))) : null, missingInformation: i.unique(x.missingInformation || []),
      state: "CANDIDATE", candidateApprovalGranted: false, adoptionAuthorizationGranted: false, diffGenerationAuthorized: false, canonicalMutationRequested: false, canonicalMutationPerformed: false, createdAt: i.nowIso(), immutable: true
    });
    if (!record.problemSummary) return i.buildResult(false, "SELFDEV058_PROBLEM_SUMMARY_REQUIRED", "Blocked", null);
    s.candidates.set(record.candidateId, record); s.latestCandidateId = record.candidateId;
    const lineage = i.deepFreeze({ lineageId: i.nextId("SELFDEV058-LINEAGE"), relationType: "SUPPORTED_BY_VERIFIED_EVIDENCE", outputId: record.candidateId, inputIds: record.evidenceRefs, createdAt: i.nowIso(), immutable: true });
    s.lineage.set(lineage.lineageId, lineage); i.touch();
    return i.buildResult(true, "SELFDEV058_PHASE2_CANDIDATE_CREATED", "Candidate", { candidate: record, lineage: lineage, evidenceIntegrity: integrity.data });
  }
  Object.assign(namespace.api, { validateSelfDevelopmentEvidenceRefs, createSelfDevelopmentPhase2Candidate }); Object.assign(namespace, namespace.api);
  namespace.modules.phase2EvidenceIntegrity = { id: "SELF-DEVELOPMENT-058-PHASE2-EVIDENCE-INTEGRITY", version: P2.version, status: "Ready", failClosed: true, baselineBindingRequired: true, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
