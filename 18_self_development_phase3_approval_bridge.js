/* ============================================================
   FILE: 18_self_development_phase3_approval_bridge.js
   Decision 058 Phase 3 / IDE-190 Approval Bridge
   No second approval engine. No self-issued approval.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  const P3 = global.SELFDEVELOPMENT058Phase3VersionManifest;
  if (!namespace || !namespace.__internal || !P3) return;
  const i = namespace.__internal, s = i.state;
  if (!(s.phase3ApprovalContexts instanceof Map)) s.phase3ApprovalContexts = new Map();

  function hashText(value) {
    const source = String(value == null ? "" : value); let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function createSelfDevelopmentPhase3ApprovalContext(input) {
    const x = i.isPlainObject(input) ? input : {};
    const candidate = typeof namespace.getSelfDevelopmentCandidate === "function" ? namespace.getSelfDevelopmentCandidate(x.candidateId) : null;
    const proposal = typeof namespace.getSelfDevelopmentProposal === "function" ? namespace.getSelfDevelopmentProposal(x.proposalId) : null;
    if (!candidate || !proposal || proposal.candidateId !== candidate.candidateId) return i.buildResult(false, "SELFDEV058_PHASE3_CANDIDATE_PROPOSAL_BINDING_REQUIRED", "Blocked", null);
    if (proposal.protectedControlPlaneChange === true) return i.buildResult(false, "SELFDEV058_PHASE3_PROTECTED_CONTROL_PLANE_BLOCKED", "Blocked", { candidateId: candidate.candidateId, architectureReviewRequired: true });
    const contextPayload = {
      decisionId: P3.decisionId,
      candidateId: candidate.candidateId,
      proposalId: proposal.proposalId,
      baselineIdentityId: candidate.baselineIdentityId,
      evidenceRefs: i.unique(candidate.evidenceRefs || []),
      affectedFiles: i.unique(candidate.affectedFiles || []),
      affectedFunctions: i.unique(candidate.affectedFunctions || []),
      riskLevel: candidate.riskLevel,
      purpose: "AUTHORIZE_PATCH_CANDIDATE_GENERATION_ONLY"
    };
    const record = i.deepFreeze({
      approvalContextId: i.nextId("SELFDEV058-PHASE3-APPROVAL-CONTEXT"),
      contextHash: hashText(JSON.stringify(contextPayload)),
      approvalClass: "P2",
      candidateId: candidate.candidateId,
      proposalId: proposal.proposalId,
      baselineIdentityId: candidate.baselineIdentityId,
      evidenceRefs: contextPayload.evidenceRefs,
      purpose: contextPayload.purpose,
      candidateApprovalRequired: true,
      adoptionAuthorizationGranted: false,
      diffGenerationAuthorized: false,
      canonicalMutationAuthorized: false,
      authorityEffect: "none",
      createdAt: i.nowIso(),
      immutable: true
    });
    s.phase3ApprovalContexts.set(record.approvalContextId, record); i.touch();
    return i.buildResult(true, "SELFDEV058_PHASE3_APPROVAL_CONTEXT_CREATED", "Awaiting-Approval", { context: record });
  }
  function validateIDE190CandidateApproval(input) {
    const x = i.isPlainObject(input) ? input : {};
    const context = s.phase3ApprovalContexts.get(i.text(x.approvalContextId, "")) || null;
    if (!context) return i.buildResult(false, "SELFDEV058_PHASE3_APPROVAL_CONTEXT_REQUIRED", "Blocked", null);
    const ide190 = global.IDE190DevelopmentAutomation;
    if (!ide190 || typeof ide190.validateAutomationApproval !== "function") return i.buildResult(false, "SELFDEV058_PHASE3_IDE190_APPROVAL_API_REQUIRED", "Blocked", { approvalContextId: context.approvalContextId });
    const validation = ide190.validateAutomationApproval(i.text(x.approvalId, ""), context.contextHash, context.approvalClass);
    if (!validation || validation.valid !== true) return i.buildResult(false, "SELFDEV058_PHASE3_IDE190_APPROVAL_INVALID", "Blocked", { validation: validation || null, candidateApprovalGranted: false });
    const approval = validation.approval || {};
    const policy = typeof namespace.getSelfDevelopmentPhase3ApprovalPolicy === "function" ? namespace.getSelfDevelopmentPhase3ApprovalPolicy() : null;
    if (!policy) return i.buildResult(false, "SELFDEV058_PHASE3_APPROVAL_POLICY_REQUIRED", "Blocked", null);
    if (policy.approverMode === "PROJECT_OWNER_ONLY" && approval.actorRole !== "Project Owner") return i.buildResult(false, "SELFDEV058_PHASE3_PROJECT_OWNER_REQUIRED", "Blocked", { actorRole: approval.actorRole || null });
    if (approval.explicitApproval !== true) return i.buildResult(false, "SELFDEV058_PHASE3_EXPLICIT_APPROVAL_REQUIRED", "Blocked", null);
    return i.buildResult(true, "SELFDEV058_PHASE3_CANDIDATE_APPROVAL_CONFIRMED", "Approved", {
      approvalContextId: context.approvalContextId,
      approvalId: approval.approvalId || i.text(x.approvalId, ""),
      approvalClass: context.approvalClass,
      actorRole: approval.actorRole,
      candidateApprovalGranted: true,
      patchCandidateGenerationAuthorized: true,
      adoptionAuthorizationGranted: false,
      canonicalMutationAuthorized: false,
      validationEqualsApproval: false,
      authorityEffect: "patch-candidate-generation-only"
    });
  }
  function getSelfDevelopmentPhase3ApprovalContext(id) { return i.clone(s.phase3ApprovalContexts.get(i.text(id, "")) || null); }

  Object.assign(namespace.api, { createSelfDevelopmentPhase3ApprovalContext, validateIDE190CandidateApproval, getSelfDevelopmentPhase3ApprovalContext });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase3ApprovalBridge = { id: "SELF-DEVELOPMENT-058-PHASE3-APPROVAL-BRIDGE", version: P3.version, status: "Ready", approvalEngine: "IDE-190", secondApprovalEngine: false, selfApprovalAllowed: false, canonicalMutationAllowed: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
