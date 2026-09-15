/* ============================================================
   FILE: 18_self_development_phase3_patch_adapter.js
   Decision 058 Phase 3 / IDE-150 Governed Patch Candidate Adapter
   Patch candidate only. Never applies a patch or writes Repository.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P3 = global.SELFDEVELOPMENT058Phase3VersionManifest;
  if (!namespace || !namespace.__internal || !P3) return;
  const i = namespace.__internal, s = i.state;
  if (!(s.phase3PatchCandidates instanceof Map)) s.phase3PatchCandidates = new Map();

  function prepareSelfDevelopmentPhase3PatchCandidate(input) {
    const x = i.isPlainObject(input) ? input : {};
    const approval = x.approvalValidation;
    if (!approval || approval.ok !== true || !approval.data || approval.data.candidateApprovalGranted !== true || approval.data.patchCandidateGenerationAuthorized !== true) {
      return i.buildResult(false, "SELFDEV058_PHASE3_CANDIDATE_APPROVAL_REQUIRED", "Blocked", { patchGenerated: false });
    }
    if (approval.data.adoptionAuthorizationGranted === true || approval.data.canonicalMutationAuthorized === true) {
      return i.buildResult(false, "SELFDEV058_PHASE3_APPROVAL_SCOPE_INVALID", "Blocked", { patchGenerated: false });
    }
    const fixture = x.fixture || (typeof namespace.getSelfDevelopmentPhase3PatchFixture === "function" ? namespace.getSelfDevelopmentPhase3PatchFixture() : null);
    if (!fixture || fixture.protectedControlPlane === true || fixture.inMemoryOnly !== true) return i.buildResult(false, "SELFDEV058_PHASE3_SAFE_FIXTURE_REQUIRED", "Blocked", null);

    const ide150 = global.IDE150AutoRefactoring;
    let engineResult = null;
    if (ide150 && typeof ide150.generateSelfDevelopmentPatchCandidate === "function") {
      engineResult = ide150.generateSelfDevelopmentPatchCandidate({ fixture: i.clone(fixture), approval: i.clone(approval.data), autoApply: false });
    }
    const record = i.deepFreeze({
      patchCandidateId: i.nextId("SELFDEV058-PHASE3-PATCH-CANDIDATE"),
      adapter: "IDE-150",
      engineApi: engineResult ? "generateSelfDevelopmentPatchCandidate" : "contract-only-compatible",
      approvalId: approval.data.approvalId,
      approvalContextId: approval.data.approvalContextId,
      targetFile: fixture.targetFile,
      targetFunction: fixture.targetFunction,
      operation: "Replace Existing Function",
      beforeFunctionSource: fixture.beforeFunctionSource,
      afterFunctionSource: fixture.afterFunctionSource,
      approvalRequiredForAdoption: true,
      autoApply: false,
      canonicalRepositoryMutationPerformed: false,
      adoptionAuthorizationGranted: false,
      patchGenerationEqualsMutationAuthority: false,
      engineResultSummary: engineResult && typeof engineResult === "object" ? { generated: engineResult.generated === true, verified: engineResult.verified === true, reason: engineResult.reason || null } : null,
      createdAt: i.nowIso(),
      immutable: true
    });
    s.phase3PatchCandidates.set(record.patchCandidateId, record); i.touch();
    return i.buildResult(true, "SELFDEV058_PHASE3_PATCH_CANDIDATE_PREPARED", "Candidate", { patchCandidate: record, engineResult: engineResult, canonicalMutationPerformed: false });
  }
  function verifySelfDevelopmentPhase3PatchCandidate(input) {
    const x = i.isPlainObject(input) ? input : {}, record = s.phase3PatchCandidates.get(i.text(x.patchCandidateId, "")) || null;
    if (!record) return i.buildResult(false, "SELFDEV058_PHASE3_PATCH_CANDIDATE_REQUIRED", "Blocked", null);
    const checks = [
      { name: "Approval bound", passed: Boolean(record.approvalId && record.approvalContextId) },
      { name: "Auto apply disabled", passed: record.autoApply === false },
      { name: "Adoption remains separate", passed: record.adoptionAuthorizationGranted === false },
      { name: "No canonical mutation", passed: record.canonicalRepositoryMutationPerformed === false },
      { name: "Function scope exact", passed: Boolean(record.targetFile && record.targetFunction && record.beforeFunctionSource && record.afterFunctionSource) }
    ];
    const passed = checks.filter(function (c) { return c.passed; }).length;
    return i.buildResult(passed === checks.length, passed === checks.length ? "SELFDEV058_PHASE3_PATCH_CANDIDATE_VERIFIED" : "SELFDEV058_PHASE3_PATCH_CANDIDATE_INVALID", passed === checks.length ? "Verified" : "Blocked", { checks: checks, passed: passed, failed: checks.length - passed, total: checks.length, independentValidatorRequired: true, validationEqualsApproval: false, canonicalMutationPerformed: false });
  }
  function getSelfDevelopmentPhase3PatchCandidate(id) { return i.clone(s.phase3PatchCandidates.get(i.text(id, "")) || null); }
  Object.assign(namespace.api, { prepareSelfDevelopmentPhase3PatchCandidate, verifySelfDevelopmentPhase3PatchCandidate, getSelfDevelopmentPhase3PatchCandidate }); Object.assign(namespace, namespace.api);
  namespace.modules.phase3PatchAdapter = { id: "SELF-DEVELOPMENT-058-PHASE3-PATCH-ADAPTER", version: P3.version, status: "Ready", mutationEngine: "IDE-150", secondMutationEngine: false, autoApply: false, canonicalMutationAllowed: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
