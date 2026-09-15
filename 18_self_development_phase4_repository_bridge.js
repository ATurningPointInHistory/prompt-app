/* ============================================================
   FILE: 18_self_development_phase4_repository_bridge.js
   Decision 058 Phase 4 / REPOSITORY-010 Read-Only Capability Bridge
   No acceptance token is issued and no repository mutation API is invoked.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P4 = global.SELFDEVELOPMENT058Phase4VersionManifest;
  if (!namespace || !namespace.__internal || !P4) return;
  const i = namespace.__internal;

  function resolveRepository() { return global.REPOSITORY010LocalFirstRepository || null; }
  function functionAvailable(repo, name) { return Boolean(repo && typeof repo[name] === "function"); }

  function inspectSelfDevelopmentPhase4RepositoryCapabilities() {
    const repo = resolveRepository();
    const status = repo && typeof repo.getStatus === "function" ? repo.getStatus() : null;
    const safety = repo && typeof repo.getSafetyStatus === "function" ? repo.getSafetyStatus() : null;
    const capabilities = {
      repositoryAvailable: Boolean(repo),
      statusAvailable: Boolean(status),
      acceptanceTokenIssueApiAvailable: functionAvailable(repo, "issueManualAcceptanceToken"),
      acceptanceTokenValidationApiAvailable: functionAvailable(repo, "validateAcceptanceToken"),
      acceptanceTokenStatusApiAvailable: functionAvailable(repo, "getAcceptanceTokenStatus"),
      controlledTransactionApiAvailable: functionAvailable(repo, "executeControlledTransactionTrial"),
      pendingRecoveryApiAvailable: functionAvailable(repo, "listPendingControlledTransactionRecoveries"),
      recoveryApiAvailable: functionAvailable(repo, "recoverControlledTransactionTrial"),
      transactionStatusApiAvailable: functionAvailable(repo, "getControlledTransactionStatus"),
      reflectionClosureApiAvailable: functionAvailable(repo, "deriveReflectionIntegrityClosure"),
      baselinePromotionCandidateApiAvailable: functionAvailable(repo, "createBaselinePromotionCandidate"),
      baselinePromotionApiAvailable: functionAvailable(repo, "promoteCanonicalBaseline"),
      baselinePromotionStatusApiAvailable: functionAvailable(repo, "getBaselinePromotionStatus")
    };
    return i.deepFreeze({
      bridgeId: i.nextId("SELFDEV058-PHASE4-REPOSITORY-BRIDGE"),
      readOnly: true,
      capabilities: capabilities,
      status: status ? i.clone(status) : null,
      safety: safety ? i.clone(safety) : null,
      acceptanceTokenIssued: false,
      controlledTransactionExecuted: false,
      persistentReflectionPerformed: false,
      rollbackExecuted: false,
      baselinePromotionPerformed: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      inspectedAt: i.nowIso(),
      immutable: true
    });
  }

  function buildSelfDevelopmentPhase4AdoptionDecisionContract(input) {
    const source = input && typeof input === "object" ? input : {};
    const required = ["candidateId", "patchCandidateId", "baselineIdentityId", "independentValidationEvidenceId"];
    const missing = required.filter(function (key) { return !source[key]; });
    if (missing.length) return i.buildResult(false, "SELFDEV058_PHASE4_ADOPTION_CONTEXT_INCOMPLETE", "Blocked", { missing: missing, adoptionAuthorized: false, acceptanceTokenIssueAuthorized: false });
    const contract = i.deepFreeze({
      adoptionDecisionId: i.nextId("SELFDEV058-PHASE4-ADOPTION-DECISION"),
      candidateId: source.candidateId,
      patchCandidateId: source.patchCandidateId,
      baselineIdentityId: source.baselineIdentityId,
      independentValidationEvidenceId: source.independentValidationEvidenceId,
      actorRoleRequired: "Project Owner",
      decision: "AWAITING_PROJECT_OWNER",
      acceptanceTokenIssueAuthorized: false,
      controlledReflectionAuthorized: false,
      canonicalMutationAuthorized: false,
      validationEqualsAdoption: false,
      createdAt: i.nowIso(),
      immutable: true
    });
    return i.buildResult(true, "SELFDEV058_PHASE4_ADOPTION_DECISION_CONTRACT_READY", "Ready", { contract: contract });
  }

  Object.assign(namespace.api, { inspectSelfDevelopmentPhase4RepositoryCapabilities, buildSelfDevelopmentPhase4AdoptionDecisionContract });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase4RepositoryBridge = { id: "SELF-DEVELOPMENT-058-PHASE4-REPOSITORY-BRIDGE", version: P4.version, status: "Ready", readOnly: true, mutationApiInvoked: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
