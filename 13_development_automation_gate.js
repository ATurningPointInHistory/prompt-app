/* ============================================================
   FILE: 13_development_automation_gate.js
   IDE-190 Development Automation
   Release: 1.3.0 / Module: Authorization Gate 1.0.0
   Phase 4: Gate / Approval / Consent
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 authorization gate blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("gate");

  function stableValue(value) { if (Array.isArray(value)) return value.map(stableValue); if (!value || typeof value !== "object") return value; const output = {}; Object.keys(value).sort().forEach(function sortKey(key){ output[key] = stableValue(value[key]); }); return output; }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  async function sha256Text(value) { if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return null; const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(String(value))); return Array.from(new Uint8Array(digest)).map(function toHex(byte){return byte.toString(16).padStart(2,"0");}).join(""); }
  function hardDenied(plan, approvalClass) { return Boolean(plan && (plan.automationLevel === "L5" || plan.mutationLevel === "M3" || plan.requestedExecutionMode === "E2" || plan.externalEffectLevel === "X2" || plan.externalEffectLevel === "X3")) || approvalClass === "P4"; }

  async function buildAuthorizationBinding(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const preflightId = internal.text(settings.preflightId, state.latestPreflightId || "");
    const preflight = state.preflights.get(preflightId) || null;
    const dryRun = preflight && state.dryRuns.get(preflight.dryRunId) || null;
    const proposal = preflight && state.proposals.get(preflight.proposalId) || null;
    const plan = preflight && state.plans.get(preflight.planId) || null;
    const grounding = plan && state.groundings.get(plan.groundingId) || null;
    if (!preflight || !plan || !proposal || !dryRun || !grounding) return internal.buildResult(false, "IDE190_GATE_CONTEXT_REQUIRED", "Blocked", { preflightId: preflightId });
    const approvalClassRequired = internal.text(preflight.approvalClassRequired, "P4");
    const rollbackRequired = plan.mutationLevel === "M2" || plan.automationLevel === "L4" || plan.requestedExecutionMode === "E1";
    const binding = {
      operation: internal.clone(plan.operation || {}),
      scope: internal.clone(plan.operation && plan.operation.scope || {}),
      target: internal.clone(plan.operation && plan.operation.target || {}),
      context: {
        groundingId: grounding.groundingId,
        intakeId: grounding.intakeId,
        packageId: grounding.packageId,
        packageHash: grounding.packageHash,
        handoffId: grounding.handoffId,
        handoffHash: grounding.handoffHash,
        planId: plan.planId,
        planHash: plan.planHash,
        proposalId: proposal.proposalId,
        dryRunId: dryRun.dryRunId,
        preflightId: preflight.preflightId
      },
      repositoryBaseline: internal.clone(plan.repositoryBaseline),
      evidence: internal.clone(plan.evidenceBinding || {}),
      sideEffect: {
        automationLevel: plan.automationLevel,
        mutationLevel: plan.mutationLevel,
        executionMode: plan.requestedExecutionMode,
        externalEffectLevel: plan.externalEffectLevel
      },
      validation: {
        dryRunStatus: dryRun.dryRunStatus,
        preflightStatus: preflight.preflightStatus,
        preflightLayer: preflight.validationLayer,
        repositoryWriteCount: preflight.repositoryWriteCount
      },
      rollback: {
        required: rollbackRequired,
        mandatory: rollbackRequired,
        restorationVerificationRequired: rollbackRequired
      }
    };
    const contextHash = await sha256Text(stableStringify(binding));
    if (!contextHash) return internal.buildResult(false, "IDE190_GATE_CONTEXT_HASH_UNAVAILABLE", "Blocked", null);
    return internal.buildResult(true, "IDE190_AUTHORIZATION_BINDING_READY", "Ready", { preflightId: preflight.preflightId, planId: plan.planId, planHash: plan.planHash, approvalClassRequired: approvalClassRequired, hardDeny: hardDenied(plan, approvalClassRequired), contextHash: contextHash, authorizationBinding: binding });
  }

  async function evaluateAuthorizationGate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const bindingResult = await buildAuthorizationBinding({ preflightId: settings.preflightId });
    if (!bindingResult || bindingResult.ok !== true) return bindingResult;
    const data = bindingResult.data;
    const preflight = state.preflights.get(data.preflightId) || null;
    const plan = state.plans.get(data.planId) || null;
    const safety = namespace.getSafetyStatus();
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) }); }
    check("Preflight exists and passed", Boolean(preflight && preflight.preflightStatus === "Passed"), preflight && preflight.preflightStatus);
    check("Preflight is V3 and requires Gate", Boolean(preflight && preflight.validationLayer === "V3" && preflight.gateRequired === true && preflight.gatePassed === false), preflight && preflight.validationLayer);
    check("Plan exists and remains immutable input", Boolean(plan && plan.readOnly === true && plan.immutable === true), plan && plan.planId);
    const planHash = plan && typeof namespace.verifyAutomationPlanHash === "function" ? await namespace.verifyAutomationPlanHash(plan) : { valid: false };
    check("Plan hash remains valid", planHash.valid === true, plan && plan.planHash);
    check("Direct Repository Mutation remains disabled", safety.directRepositoryMutationAllowed === false, safety.directRepositoryMutationAllowed);
    check("Automatic Workflow Execution remains disabled", safety.automaticWorkflowExecutionAllowed === false, safety.automaticWorkflowExecutionAllowed);
    check("Human Approval cannot override Hard Deny", data.hardDeny === false, data.hardDeny);
    check("P4 Persistent Commit Authorization remains prohibited", data.approvalClassRequired !== "P4", data.approvalClassRequired);
    check("Consent is not Approval", true, false);

    let approvalSatisfied = data.approvalClassRequired === "P0";
    let approvalConsumed = false;
    let approvalId = null;
    let approvalReason = null;
    if (["P1", "P2", "P3"].includes(data.approvalClassRequired)) {
      approvalId = internal.text(settings.approvalId, "") || null;
      if (!approvalId) {
        approvalReason = "Human Approval Required";
        check("Required Human Approval is present", false, data.approvalClassRequired);
      } else if (typeof namespace.validateAutomationApproval !== "function" || typeof internal.consumeApprovalForGate !== "function") {
        approvalReason = "Approval API Missing";
        check("Required Human Approval API is available", false, approvalReason);
      } else {
        const validation = namespace.validateAutomationApproval(approvalId, data.contextHash, data.approvalClassRequired);
        check("Approval is bound to exact Gate context", validation.valid === true, validation.reasons && validation.reasons.join(" | "));
        if (validation.valid) {
          const consumed = internal.consumeApprovalForGate(approvalId, data.contextHash, data.approvalClassRequired);
          approvalConsumed = consumed && consumed.consumed === true;
          approvalSatisfied = approvalConsumed;
          check("Approval is consumed exactly once at Gate", approvalConsumed, approvalId);
        } else approvalReason = validation.reasons && validation.reasons.join(" | ") || "Invalid Approval";
      }
    }

    const consentReference = internal.text(settings.consentId, "") || null;
    const basePassed = checks.every(function every(item){return item.passed;});
    let gateStatus = "Blocked";
    if (!data.hardDeny && preflight && preflight.preflightStatus === "Passed" && planHash.valid === true) {
      if (data.approvalClassRequired === "P0") gateStatus = basePassed ? "Passed" : "Blocked";
      else if (!approvalId) gateStatus = "Awaiting-Approval";
      else gateStatus = basePassed && approvalSatisfied ? "Passed" : "Blocked";
    }
    const passed = gateStatus === "Passed";
    const gate = {
      gateId: internal.nextId("IDE-190-AUTH-GATE"),
      preflightId: data.preflightId,
      planId: data.planId,
      planHash: data.planHash,
      validationLayer: "V4",
      gateStatus: gateStatus,
      approvalClassRequired: data.approvalClassRequired,
      approvalSatisfied: approvalSatisfied,
      approvalId: approvalId,
      approvalConsumed: approvalConsumed,
      hardDeny: data.hardDeny,
      contextHash: data.contextHash,
      authorizationBinding: internal.clone(data.authorizationBinding),
      consentReference: consentReference,
      consentUsedAsApproval: false,
      dispatchEligible: passed,
      dispatchExecuted: false,
      repositoryMutation: false,
      repositoryWriteCount: 0,
      checks: checks,
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("authorizationGate", gate);
    if (!contract.valid) return internal.buildResult(false, "IDE190_AUTHORIZATION_GATE_CONTRACT_INVALID", "Blocked", { gate: gate, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(gate));
    state.authorizationGates.set(frozen.gateId, frozen);
    state.latestAuthorizationGateId = frozen.gateId;
    internal.touch();
    const code = passed ? "IDE190_AUTHORIZATION_GATE_PASSED" : gateStatus === "Awaiting-Approval" ? "IDE190_AUTHORIZATION_GATE_AWAITING_APPROVAL" : "IDE190_AUTHORIZATION_GATE_BLOCKED";
    return internal.buildResult(passed, code, gateStatus, { gate: internal.clone(frozen), validation: contract, approvalReason: approvalReason });
  }

  function getAuthorizationGate(gateId) { return internal.clone(state.authorizationGates.get(internal.text(gateId, "")) || null); }
  function getLatestAuthorizationGate() { return state.latestAuthorizationGateId ? getAuthorizationGate(state.latestAuthorizationGateId) : null; }
  function listAuthorizationGates() { return Array.from(state.authorizationGates.values()).map(function copy(item){return internal.clone(item);}); }
  function initializeAuthorizationGate() { namespace.modules.gate.status = "Ready"; return internal.buildResult(true, "IDE190_AUTHORIZATION_GATE_INITIALIZED", "Ready", { gateCount: state.authorizationGates.size, validationLayer: "V4" }); }

  Object.assign(namespace.api, { initializeAuthorizationGate, buildAuthorizationBinding, evaluateAuthorizationGate, getAuthorizationGate, getLatestAuthorizationGate, listAuthorizationGates });
  Object.assign(namespace, namespace.api);
  namespace.modules.gate = { id: "IDE-190-AUTHORIZATION-GATE", version: MODULE_VERSION, status: "Loaded", phase: 4, validationLayer: "V4", hardDenyOverridesApproval: true, consentIsApproval: false, dispatchImplemented: false, repositoryMutationAllowed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
