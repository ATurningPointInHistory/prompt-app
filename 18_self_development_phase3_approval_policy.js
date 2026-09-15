/* ============================================================
   FILE: 18_self_development_phase3_approval_policy.js
   Decision 058 Phase 3 / Approval Policy + Future Relaxation Map

   CURRENT STRICT DEFAULTS:
   - Project Owner only
   - Expiring approval
   - Single-use approval

   FUTURE RELAXATION ENTRY POINTS:
   - approverMode / allowedApproverRoles
   - expirationMode / validityMinutes
   - consumptionMode / maxConsumptions

   IMPORTANT:
   IDE-190 currently also enforces these semantics internally.
   Changing only this file MUST NOT bypass IDE-190. The migration map below
   identifies the exact engine enforcement points that must be deliberately
   revised in a future accepted Decision/Phase.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  const P3 = global.SELFDEVELOPMENT058Phase3VersionManifest;
  if (!namespace || !namespace.__internal || !P3) return;
  const i = namespace.__internal;

  function freeze(value) { return i.deepFreeze(i.clone(value)); }

  const policy = freeze({
    policyId: "SELFDEV058-PHASE3-APPROVAL-POLICY",
    policyVersion: "1.0.0",
    currentMode: "STRICT_INITIAL",
    approverMode: "PROJECT_OWNER_ONLY",
    allowedApproverRoles: ["Project Owner"],
    expirationMode: "TIME_BOUND",
    validityMinutes: 5,
    consumptionMode: "SINGLE_USE",
    maxConsumptions: 1,
    contextBindingRequired: true,
    explicitHumanConfirmationRequired: true,
    relaxationPoints: [
      {
        key: "approverMode",
        current: "PROJECT_OWNER_ONLY",
        futureExamples: ["DELEGATED_ROLE_LIST"],
        engineEnforcementRefs: [
          "13_development_automation_approval.js#grantAutomationApproval:P2 Project Owner role check"
        ],
        futureMigrationRequired: true
      },
      {
        key: "expirationMode",
        current: "TIME_BOUND",
        futureExamples: ["LONGER_TIME_BOUND"],
        engineEnforcementRefs: [
          "13_development_automation_approval.js#DEFAULT_TTL_MS",
          "13_development_automation_approval.js#requestAutomationApproval:expiresAt",
          "13_development_automation_approval.js#validateAutomationApproval:isExpired"
        ],
        futureMigrationRequired: true
      },
      {
        key: "consumptionMode",
        current: "SINGLE_USE",
        futureExamples: ["BOUNDED_REUSE"],
        engineEnforcementRefs: [
          "13_development_automation_approval.js#requestAutomationApproval:singleUse",
          "13_development_automation_approval.js#consumeApprovalForGate:Consumed state"
        ],
        futureMigrationRequired: true
      }
    ],
    immutableHardBoundaries: {
      selfApprovalAllowed: false,
      validationEqualsApproval: false,
      hardDenyBypassAllowed: false,
      contextBindingRequired: true,
      candidateApprovalEqualsAdoptionAuthorization: false,
      approvalAloneGrantsCanonicalMutation: false,
      automatedProjectOwnerImpersonationAllowed: false
    }
  });

  function getSelfDevelopmentPhase3ApprovalPolicy() { return i.clone(policy); }
  function getSelfDevelopmentPhase3RelaxationGuide() {
    return {
      file: "18_self_development_phase3_approval_policy.js",
      changeEntryPoints: ["approverMode", "allowedApproverRoles", "expirationMode", "validityMinutes", "consumptionMode", "maxConsumptions"],
      currentStrictDefaults: { approver: "Project Owner", validityMinutes: policy.validityMinutes, consumption: "SINGLE_USE" },
      engineMigrationRequired: true,
      engineEnforcementRefs: policy.relaxationPoints.reduce(function (out, item) { return out.concat(item.engineEnforcementRefs); }, []),
      immutableHardBoundaries: i.clone(policy.immutableHardBoundaries),
      note: "Relaxation requires an explicit future Decision/Phase. Policy change alone never bypasses IDE-190 enforcement."
    };
  }
  function validateSelfDevelopmentPhase3ApprovalPolicy(candidate) {
    const p = candidate && typeof candidate === "object" ? candidate : policy;
    const failures = [];
    if (p.immutableHardBoundaries && p.immutableHardBoundaries.selfApprovalAllowed !== false) failures.push("self-approval-must-remain-false");
    if (p.immutableHardBoundaries && p.immutableHardBoundaries.validationEqualsApproval !== false) failures.push("validation-equals-approval-must-remain-false");
    if (p.immutableHardBoundaries && p.immutableHardBoundaries.hardDenyBypassAllowed !== false) failures.push("hard-deny-bypass-must-remain-false");
    if (p.immutableHardBoundaries && p.immutableHardBoundaries.contextBindingRequired !== true) failures.push("context-binding-must-remain-required");
    if (p.immutableHardBoundaries && p.immutableHardBoundaries.candidateApprovalEqualsAdoptionAuthorization !== false) failures.push("candidate-approval-must-not-equal-adoption");
    return { valid: failures.length === 0, failures: failures, policyVersion: p.policyVersion || null, checkedAt: i.nowIso() };
  }

  Object.assign(namespace.api, { getSelfDevelopmentPhase3ApprovalPolicy, getSelfDevelopmentPhase3RelaxationGuide, validateSelfDevelopmentPhase3ApprovalPolicy });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase3ApprovalPolicy = { id: "SELF-DEVELOPMENT-058-PHASE3-APPROVAL-POLICY", version: P3.version, status: "Ready", strictInitial: true, futureRelaxationDocumented: true, engineMigrationRequiredForRelaxation: true, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
