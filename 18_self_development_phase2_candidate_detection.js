/* ============================================================
   FILE: 18_self_development_phase2_candidate_detection.js
   Decision 058 Phase 2 / Deterministic Candidate Detection + Scope Classification
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;
  const i = namespace.__internal, s = i.state;
  const protectedPattern = /^(00_script_manifest\.json|project_info\.json|index\.html|13_development_automation_|13_local_first_repository_|17_external_intelligence_(authority|secret|resource_budget|usage_policy|openai_provider_integration)|18_self_development_phase2_validation_contract|18_self_development_phase2_evidence_integrity)/;
  function classifySelfDevelopmentChangeScope(input) {
    const x = i.isPlainObject(input) ? input : {}, files = i.unique(x.affectedFiles || []), funcs = i.unique(x.affectedFunctions || []);
    const protectedFiles = files.filter(function (f) { return protectedPattern.test(String(f)); });
    let classification = "ARCHITECTURE_REVIEW", recommendedMutation = "NONE";
    if (!protectedFiles.length && files.length === 1 && funcs.length > 0) { classification = "FUNCTION_PATCH"; recommendedMutation = "FUNCTION_PATCH"; }
    else if (!protectedFiles.length && files.length === 1) { classification = "FILE_PATCH"; recommendedMutation = "FILE_PATCH"; }
    else if (!protectedFiles.length && files.length > 1 && files.length <= 3) { classification = "MULTI_FILE_PATCH"; recommendedMutation = "MULTI_FILE_PATCH"; }
    return {
      classification: classification, recommendedMutation: recommendedMutation, smallestSafeMutationFirst: true,
      protectedControlPlaneChange: protectedFiles.length > 0, protectedFiles: protectedFiles, architectureReviewRequired: protectedFiles.length > 0 || classification === "ARCHITECTURE_REVIEW",
      diffGenerationAuthorized: false, canonicalMutationAuthorized: false, authorityEffect: "none"
    };
  }
  function evaluateSelfDevelopmentInspectionFindings(input) {
    const x = i.isPlainObject(input) ? input : {}, findings = Array.isArray(x.findings) ? x.findings : [], output = [];
    findings.forEach(function (f) {
      if (!f || f.autoCandidateEligible !== true) return;
      const type = i.text(f.type, "IMPROVEMENT_OPPORTUNITY"), severity = i.text(f.severity, "MEDIUM").toUpperCase();
      output.push({
        detectionRuleId: "P2-DETECT-" + type,
        opportunityType: type,
        problemSummary: i.text(f.summary, type),
        riskLevel: severity === "CRITICAL" ? "RED" : severity === "HIGH" ? "HIGH" : severity === "LOW" ? "LOW" : "MEDIUM",
        affectedComponent: "AI-PROMPT-OS",
        affectedFiles: i.unique(f.files || []),
        affectedFunctions: [],
        expectedBenefit: "Resolve evidence-grounded repository inspection finding.",
        confidence: 1,
        deterministic: true,
        aiGenerated: false
      });
    });
    return output;
  }
  async function detectSelfDevelopmentPhase2Candidates(input) {
    const x = i.isPlainObject(input) ? input : {};
    let inspectionResult = x.inspectionResult || null;
    if (!inspectionResult && typeof namespace.inspectSelfDevelopmentRepository === "function") inspectionResult = await namespace.inspectSelfDevelopmentRepository({ baselineIdentity: x.baselineIdentity });
    if (!inspectionResult || inspectionResult.ok !== true || !inspectionResult.data || !inspectionResult.data.inspection || !inspectionResult.data.evidence) return i.buildResult(false, "SELFDEV058_REPOSITORY_INSPECTION_REQUIRED", "Blocked", null);
    const inspection = inspectionResult.data.inspection, evidence = inspectionResult.data.evidence;
    const opportunities = evaluateSelfDevelopmentInspectionFindings({ findings: inspection.findings });
    const results = [];
    opportunities.forEach(function (op) {
      const candidateResult = namespace.createSelfDevelopmentPhase2Candidate(Object.assign({}, op, { baselineIdentity: x.baselineIdentity, evidenceRefs: [evidence.evidenceId] }));
      if (candidateResult.ok) {
        const c = candidateResult.data.candidate;
        const scope = classifySelfDevelopmentChangeScope({ affectedFiles: c.affectedFiles, affectedFunctions: c.affectedFunctions });
        results.push({ ok: true, candidateId: c.candidateId, scope: scope, rule: op.detectionRuleId });
      } else results.push({ ok: false, code: candidateResult.code, candidateId: null, rule: op.detectionRuleId });
    });
    const record = i.deepFreeze({ detectionId: i.nextId("SELFDEV058-DETECTION"), baselineIdentityId: inspection.baselineIdentityId, inspectionId: inspection.inspectionId, evidenceId: evidence.evidenceId, deterministic: true, aiGenerated: false, opportunityCount: opportunities.length, candidateCount: results.filter(function (r) { return r.ok; }).length, results: results, providerNetworkCallPerformed: false, canonicalMutationPerformed: false, createdAt: i.nowIso(), immutable: true });
    s.latestPhase2Detection = record; i.touch();
    return i.buildResult(results.every(function (r) { return r.ok; }), "SELFDEV058_PHASE2_CANDIDATE_DETECTION_COMPLETE", "Completed", { detection: record, opportunities: opportunities, zeroFindingsIsValid: true });
  }
  Object.assign(namespace.api, { classifySelfDevelopmentChangeScope, evaluateSelfDevelopmentInspectionFindings, detectSelfDevelopmentPhase2Candidates }); Object.assign(namespace, namespace.api);
  namespace.modules.phase2CandidateDetection = { id: "SELF-DEVELOPMENT-058-PHASE2-CANDIDATE-DETECTION", version: P2.version, status: "Ready", deterministic: true, aiGenerated: false, diffGenerationImplemented: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
