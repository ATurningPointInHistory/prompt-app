/* ============================================================
   FILE: 13_development_automation_dispatch.js
   IDE-190 Development Automation
   Release: 1.4.0 / Module: Controlled Dispatch 1.0.0
   Phase 5: IDE-160 Controlled Dispatch
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 controlled dispatch blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("dispatch");
  const PHASE6_ONLY_OPERATIONS = Object.freeze([
    "Approve Controlled Application",
    "Execute Controlled Application"
  ]);
  const PREPARE_OPERATIONS = Object.freeze([
    "Prepare Controlled Application",
    "Prepare Controlled Application Async"
  ]);

  function getIDE160Api() {
    const ide160 = global.AIPromptOSIDE160;
    return ide160 && ide160.api && typeof ide160.api === "object" ? ide160.api : null;
  }

  function getGate(gateId) {
    const id = internal.text(gateId, state.latestAuthorizationGateId || "");
    return state.authorizationGates.get(id) || null;
  }

  function getPlan(gate) {
    return gate ? state.plans.get(gate.planId) || null : null;
  }

  function getDispatchState(gateId) {
    return internal.clone(state.gateDispatchStates.get(internal.text(gateId, "")) || null);
  }

  function explicitDispatchTarget(plan) {
    const parameters = plan && plan.operation && internal.isPlainObject(plan.operation.parameters)
      ? plan.operation.parameters
      : {};
    return {
      targetComponentId: internal.text(parameters.targetComponentId, ""),
      adapterId: internal.text(parameters.adapterId, ""),
      adapterOperation: internal.text(parameters.adapterOperation || (plan && plan.operation && plan.operation.operationType), ""),
      adapterInput: internal.clone(parameters.adapterInput == null ? {} : parameters.adapterInput)
    };
  }

  function phase6Only(adapter, operation, plan) {
    if (PHASE6_ONLY_OPERATIONS.includes(operation)) return true;
    if (!adapter || adapter.controlledMutation !== true) return false;
    if (operation === "Execute Controlled Application") return true;
    return Boolean(plan && (plan.mutationLevel === "M2" || plan.automationLevel === "L4" || plan.requestedExecutionMode === "E1") && !PREPARE_OPERATIONS.includes(operation));
  }

  async function buildDispatchRequest(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const gate = getGate(settings.gateId);
    if (!gate) return internal.buildResult(false, "IDE190_DISPATCH_GATE_REQUIRED", "Blocked", null);
    if (gate.gateStatus !== "Passed" || gate.dispatchEligible !== true || gate.hardDeny === true) {
      return internal.buildResult(false, "IDE190_DISPATCH_GATE_NOT_PASSED", "Blocked", { gateId: gate.gateId, gateStatus: gate.gateStatus, hardDeny: gate.hardDeny });
    }
    if (state.gateDispatchStates.has(gate.gateId)) {
      return internal.buildResult(false, "IDE190_DISPATCH_GATE_ALREADY_USED", "Blocked", { gateId: gate.gateId, dispatchState: getDispatchState(gate.gateId) });
    }

    const plan = getPlan(gate);
    if (!plan) return internal.buildResult(false, "IDE190_DISPATCH_PLAN_REQUIRED", "Blocked", { gateId: gate.gateId });
    const planHashValidation = typeof namespace.verifyAutomationPlanHash === "function" ? await namespace.verifyAutomationPlanHash(plan) : { valid: false };
    if (!planHashValidation.valid || plan.planHash !== gate.planHash) {
      return internal.buildResult(false, "IDE190_DISPATCH_PLAN_HASH_MISMATCH", "Blocked", { gateId: gate.gateId, planId: plan.planId });
    }

    const bindingResult = typeof namespace.buildAuthorizationBinding === "function"
      ? await namespace.buildAuthorizationBinding({ preflightId: gate.preflightId })
      : null;
    if (!bindingResult || bindingResult.ok !== true || !bindingResult.data || bindingResult.data.contextHash !== gate.contextHash) {
      return internal.buildResult(false, "IDE190_DISPATCH_CONTEXT_MISMATCH", "Blocked", { gateId: gate.gateId });
    }

    if (["P1", "P2", "P3"].includes(gate.approvalClassRequired) && !(gate.approvalSatisfied === true && gate.approvalConsumed === true && gate.approvalId)) {
      return internal.buildResult(false, "IDE190_DISPATCH_APPROVAL_NOT_BOUND", "Blocked", { gateId: gate.gateId, approvalClass: gate.approvalClassRequired });
    }
    if (gate.approvalClassRequired === "P4") {
      return internal.buildResult(false, "IDE190_DISPATCH_P4_PROHIBITED", "Blocked", { gateId: gate.gateId });
    }

    const target = explicitDispatchTarget(plan);
    if (!target.targetComponentId || !target.adapterOperation) {
      return internal.buildResult(false, "IDE190_DISPATCH_EXPLICIT_TARGET_REQUIRED", "Blocked", {
        gateId: gate.gateId,
        required: ["operation.parameters.targetComponentId", "operation.parameters.adapterOperation or operation.operationType"]
      });
    }

    const ide160Api = getIDE160Api();
    if (!ide160Api || typeof ide160Api.listIDE160ComponentAdapters !== "function" || typeof ide160Api.invokeIDE160ComponentAdapter !== "function" || typeof ide160Api.checkIDE160ComponentCompatibility !== "function") {
      return internal.buildResult(false, "IDE190_IDE160_DISPATCH_API_REQUIRED", "Blocked", null);
    }

    let adapter = null;
    if (target.adapterId && typeof ide160Api.getIDE160ComponentAdapter === "function") {
      adapter = ide160Api.getIDE160ComponentAdapter(target.adapterId);
      if (adapter && adapter.componentId !== target.targetComponentId) adapter = null;
    } else {
      const matches = ide160Api.listIDE160ComponentAdapters({ componentId: target.targetComponentId, enabledOnly: true });
      if (Array.isArray(matches) && matches.length === 1) adapter = matches[0];
      else if (Array.isArray(matches) && matches.length > 1) {
        return internal.buildResult(false, "IDE190_DISPATCH_ADAPTER_AMBIGUOUS", "Blocked", { targetComponentId: target.targetComponentId, adapterCount: matches.length });
      }
    }
    if (!adapter || adapter.enabled !== true || !adapter.availability || adapter.availability.available !== true) {
      return internal.buildResult(false, "IDE190_DISPATCH_ADAPTER_REQUIRED", "Blocked", { targetComponentId: target.targetComponentId, adapterId: target.adapterId || null });
    }
    if (!adapter.operations || !Object.prototype.hasOwnProperty.call(adapter.operations, target.adapterOperation)) {
      return internal.buildResult(false, "IDE190_DISPATCH_OPERATION_NOT_REGISTERED", "Blocked", { adapterId: adapter.adapterId, adapterOperation: target.adapterOperation });
    }
    if (phase6Only(adapter, target.adapterOperation, plan)) {
      return internal.buildResult(false, "IDE190_PHASE6_MUTATION_TRIAL_REQUIRED", "Blocked", {
        gateId: gate.gateId,
        adapterId: adapter.adapterId,
        adapterOperation: target.adapterOperation,
        phase6Required: true
      });
    }

    const compatibility = ide160Api.checkIDE160ComponentCompatibility(adapter.adapterId, { operation: target.adapterOperation });
    if (!compatibility || compatibility.ok !== true) {
      return internal.buildResult(false, "IDE190_DISPATCH_ADAPTER_INCOMPATIBLE", "Blocked", { adapterId: adapter.adapterId, adapterOperation: target.adapterOperation, compatibility: compatibility });
    }

    const request = {
      dispatchRequestId: internal.nextId("IDE-190-DISPATCH-REQUEST"),
      gateId: gate.gateId,
      preflightId: gate.preflightId,
      planId: plan.planId,
      planHash: plan.planHash,
      contextHash: gate.contextHash,
      validationLayer: "V5",
      gateStatus: gate.gateStatus,
      gateDispatchEligible: gate.dispatchEligible,
      approvalClass: gate.approvalClassRequired,
      approvalId: gate.approvalId,
      dispatchMode: "IDE-160-Adapter-Registry",
      targetComponentId: target.targetComponentId,
      adapterId: adapter.adapterId,
      adapterOperation: target.adapterOperation,
      adapterInput: target.adapterInput,
      directIDE150Call: false,
      phase6MutationTrialExecutionAllowed: false,
      repositoryMutation: false,
      repositoryWriteCount: 0,
      singleUse: true,
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("dispatchRequest", request);
    if (!contract.valid) return internal.buildResult(false, "IDE190_DISPATCH_REQUEST_CONTRACT_INVALID", "Blocked", { request: request, validation: contract });
    return internal.buildResult(true, "IDE190_DISPATCH_REQUEST_READY", "Ready", { request: internal.deepFreeze(internal.clone(request)), adapter: internal.clone(adapter), compatibility: internal.clone(compatibility), validation: contract });
  }

  async function dispatchAutomationFromGate(input) {
    const prepared = await buildDispatchRequest(input);
    if (!prepared || prepared.ok !== true) return prepared;
    const request = prepared.data.request;
    const adapter = prepared.data.adapter;
    const ide160Api = getIDE160Api();

    state.gateDispatchStates.set(request.gateId, {
      status: "Dispatching",
      dispatchRequestId: request.dispatchRequestId,
      executionResultId: null,
      updatedAt: internal.nowIso()
    });
    state.dispatchRequests.set(request.dispatchRequestId, internal.deepFreeze(internal.clone(request)));
    state.latestDispatchRequestId = request.dispatchRequestId;
    internal.touch();

    const invocationOptions = {
      ide190Dispatch: true,
      gateReference: {
        gateId: request.gateId,
        contextHash: request.contextHash,
        approvalClass: request.approvalClass,
        approvalId: request.approvalId
      },
      approvalReference: request.approvalClass === "P0" ? null : {
        approved: true,
        source: "IDE-190-V4-Gate",
        gateId: request.gateId,
        approvalId: request.approvalId,
        contextHash: request.contextHash
      }
    };

    let invocation = null;
    try {
      invocation = ide160Api.invokeIDE160ComponentAdapter(adapter.adapterId, request.adapterOperation, request.adapterInput, invocationOptions);
      if (invocation && typeof invocation.then === "function") invocation = await invocation;
    } catch (error) {
      invocation = { ok: false, code: "IDE190_IDE160_INVOCATION_EXCEPTION", status: "Failed", error: { message: error && error.message ? error.message : String(error) } };
    }

    const adapterOutput = invocation && invocation.data && Object.prototype.hasOwnProperty.call(invocation.data, "output")
      ? invocation.data.output
      : invocation && invocation.data && Object.prototype.hasOwnProperty.call(invocation.data, "rawResult")
        ? invocation.data.rawResult
        : null;
    const outputStatus = internal.text(adapterOutput && (adapterOutput.status || adapterOutput.lifecycleStatus || adapterOutput.executionStatus), "");
    const semanticFailure = Boolean(adapterOutput && (
      adapterOutput.valid === false ||
      adapterOutput.passed === false ||
      adapterOutput.prepared === false ||
      adapterOutput.approved === false ||
      adapterOutput.executed === false ||
      (Number.isFinite(Number(adapterOutput.failed)) && Number(adapterOutput.failed) > 0) ||
      outputStatus === "Failed" ||
      outputStatus === "Blocked"
    ));
    const succeeded = Boolean(invocation && invocation.ok === true && semanticFailure === false);
    const prepareOnly = PREPARE_OPERATIONS.includes(request.adapterOperation);
    const result = {
      executionResultId: internal.nextId("IDE-190-EXECUTION-RESULT"),
      dispatchRequestId: request.dispatchRequestId,
      gateId: request.gateId,
      planId: request.planId,
      planHash: request.planHash,
      contextHash: request.contextHash,
      validationLayer: "V5",
      dispatchStatus: succeeded ? "Succeeded" : "Failed",
      executionSucceeded: succeeded,
      ide160InvocationUsed: true,
      dispatchMode: request.dispatchMode,
      targetComponentId: request.targetComponentId,
      adapterId: request.adapterId,
      adapterOperation: request.adapterOperation,
      adapterInvocationCode: internal.text(invocation && invocation.code, ""),
      adapterInvocationStatus: internal.text(invocation && invocation.status, ""),
      adapterOutput: internal.clone(adapterOutput),
      directIDE150Call: false,
      phase6Required: prepareOnly,
      phase6MutationTrialExecuted: false,
      repositoryMutation: false,
      repositoryWriteCount: 0,
      persistentCommit: false,
      verificationRequired: true,
      readOnly: true,
      immutable: true,
      completedAt: internal.nowIso()
    };
    const contract = namespace.validateContract("executionResult", result);
    if (!contract.valid) {
      state.gateDispatchStates.set(request.gateId, { status: "Failed", dispatchRequestId: request.dispatchRequestId, executionResultId: null, updatedAt: internal.nowIso() });
      internal.touch();
      return internal.buildResult(false, "IDE190_EXECUTION_RESULT_CONTRACT_INVALID", "Failed", { request: request, result: result, validation: contract, invocation: invocation });
    }

    const frozen = internal.deepFreeze(internal.clone(result));
    state.executionResults.set(frozen.executionResultId, frozen);
    state.latestExecutionResultId = frozen.executionResultId;
    state.gateDispatchStates.set(request.gateId, {
      status: succeeded ? "Succeeded" : "Failed",
      dispatchRequestId: request.dispatchRequestId,
      executionResultId: frozen.executionResultId,
      updatedAt: frozen.completedAt
    });
    internal.touch();
    return internal.buildResult(succeeded, succeeded ? "IDE190_CONTROLLED_DISPATCH_SUCCEEDED" : "IDE190_CONTROLLED_DISPATCH_FAILED", succeeded ? "Succeeded" : "Failed", {
      request: internal.clone(request),
      executionResult: internal.clone(frozen),
      gateDispatchState: getDispatchState(request.gateId),
      invocation: internal.clone(invocation),
      validation: contract
    });
  }

  function getAutomationDispatchRequest(requestId) {
    const id = internal.text(requestId, state.latestDispatchRequestId || "");
    return internal.clone(state.dispatchRequests.get(id) || null);
  }
  function getAutomationExecutionResult(resultId) {
    const id = internal.text(resultId, state.latestExecutionResultId || "");
    return internal.clone(state.executionResults.get(id) || null);
  }
  function getLatestAutomationExecutionResult() { return getAutomationExecutionResult(state.latestExecutionResultId); }
  function getAutomationGateDispatchState(gateId) { return getDispatchState(gateId); }
  function listAutomationExecutionResults() { return Array.from(state.executionResults.values()).map(function copy(item){ return internal.clone(item); }); }
  function initializeDispatch() {
    namespace.modules.dispatch.status = "Ready";
    return internal.buildResult(true, "IDE190_DISPATCH_INITIALIZED", "Ready", { dispatchRequestCount: state.dispatchRequests.size, executionResultCount: state.executionResults.size, validationLayer: "V5" });
  }

  Object.assign(namespace.api, {
    initializeDispatch: initializeDispatch,
    buildDispatchRequest: buildDispatchRequest,
    dispatchAutomationFromGate: dispatchAutomationFromGate,
    getAutomationDispatchRequest: getAutomationDispatchRequest,
    getAutomationExecutionResult: getAutomationExecutionResult,
    getLatestAutomationExecutionResult: getLatestAutomationExecutionResult,
    getAutomationGateDispatchState: getAutomationGateDispatchState,
    listAutomationExecutionResults: listAutomationExecutionResults
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.dispatch = {
    id: "IDE-190-DISPATCH",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 5,
    validationLayer: "V5",
    ide160AdapterRegistryRequired: true,
    directIDE150CallAllowed: false,
    phase6MutationTrialExecutionAllowed: false,
    gateSingleUse: true,
    repositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
