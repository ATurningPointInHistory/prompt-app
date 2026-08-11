/* ============================================================
   FILE: 13_development_automation_approval.js
   IDE-190 Development Automation
   Release: 1.3.0 / Module: Approval 1.0.0
   Phase 4: Gate / Approval / Consent
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 approval blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("approval");
  const DEFAULT_TTL_MS = 5 * 60 * 1000;

  function positiveTtl(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : DEFAULT_TTL_MS;
  }

  function runtimeStatus(approvalId) {
    const existing = state.approvalStates.get(approvalId);
    return existing ? internal.clone(existing) : null;
  }

  function isExpired(expiresAt) {
    const time = new Date(expiresAt).getTime();
    return !Number.isFinite(time) || Date.now() >= time;
  }

  async function requestAutomationApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    if (typeof namespace.buildAuthorizationBinding !== "function") return internal.buildResult(false, "IDE190_GATE_BINDING_API_REQUIRED", "Blocked", null);
    const bindingResult = await namespace.buildAuthorizationBinding({ preflightId: settings.preflightId });
    if (!bindingResult || bindingResult.ok !== true) return internal.buildResult(false, "IDE190_APPROVAL_BINDING_BLOCKED", "Blocked", bindingResult && bindingResult.data || null);
    const binding = bindingResult.data;
    const approvalClass = binding.approvalClassRequired;
    const requestedClass = internal.text(settings.approvalClass, "");
    if (requestedClass && requestedClass !== approvalClass) return internal.buildResult(false, "IDE190_APPROVAL_CLASS_CONTEXT_MISMATCH", "Blocked", { requiredApprovalClass: approvalClass, requestedApprovalClass: requestedClass });
    if (approvalClass === "P0") return internal.buildResult(false, "IDE190_APPROVAL_NOT_REQUIRED", "Not-Required", { approvalClass: approvalClass, contextHash: binding.contextHash });
    if (approvalClass === "P4" || binding.hardDeny === true) return internal.buildResult(false, "IDE190_APPROVAL_HARD_DENY", "Blocked", { approvalClass: approvalClass, hardDeny: true });
    if (!["P1", "P2", "P3"].includes(approvalClass)) return internal.buildResult(false, "IDE190_APPROVAL_CLASS_INVALID", "Blocked", { approvalClass: approvalClass });

    const requestedAt = internal.nowIso();
    const expiresAt = new Date(Date.now() + positiveTtl(settings.expiresInMs)).toISOString();
    const request = {
      approvalRequestId: internal.nextId("IDE-190-APPROVAL-REQUEST"),
      preflightId: binding.preflightId,
      approvalClass: approvalClass,
      contextHash: binding.contextHash,
      authorizationBinding: internal.clone(binding.authorizationBinding),
      status: "Requested",
      singleUse: true,
      requestedAt: requestedAt,
      expiresAt: expiresAt,
      readOnly: true,
      immutable: true
    };
    const contract = namespace.validateContract("approvalRequest", request);
    if (!contract.valid) return internal.buildResult(false, "IDE190_APPROVAL_REQUEST_CONTRACT_INVALID", "Blocked", { request: request, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(request));
    state.approvalRequests.set(frozen.approvalRequestId, frozen);
    state.latestApprovalRequestId = frozen.approvalRequestId;
    internal.touch();
    return internal.buildResult(true, "IDE190_APPROVAL_REQUESTED", "Awaiting-Approval", { request: internal.clone(frozen), validation: contract });
  }

  function grantAutomationApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const requestId = internal.text(settings.approvalRequestId, state.latestApprovalRequestId || "");
    const request = state.approvalRequests.get(requestId) || null;
    if (!request) return internal.buildResult(false, "IDE190_APPROVAL_REQUEST_REQUIRED", "Blocked", null);
    if (isExpired(request.expiresAt)) return internal.buildResult(false, "IDE190_APPROVAL_REQUEST_EXPIRED", "Expired", { request: internal.clone(request) });
    const actor = internal.text(settings.actor, "");
    const actorRole = internal.text(settings.actorRole, "");
    const reason = internal.text(settings.reason, "");
    if (!actor || !actorRole || !reason || settings.explicitApproval !== true) return internal.buildResult(false, "IDE190_EXPLICIT_HUMAN_APPROVAL_REQUIRED", "Blocked", null);
    if (request.approvalClass === "P2" && actorRole !== "Project Owner") return internal.buildResult(false, "IDE190_P2_PROJECT_OWNER_REQUIRED", "Blocked", { actorRole: actorRole });

    const approval = {
      approvalId: internal.nextId("IDE-190-APPROVAL"),
      approvalRequestId: request.approvalRequestId,
      preflightId: request.preflightId,
      approvalClass: request.approvalClass,
      contextHash: request.contextHash,
      authorizationBinding: internal.clone(request.authorizationBinding),
      actor: actor,
      actorRole: actorRole,
      reason: reason,
      explicitApproval: true,
      singleUse: true,
      approvedAt: internal.nowIso(),
      expiresAt: request.expiresAt,
      initialStatus: "Approved",
      dispatchPermissionGranted: false,
      mutationApplied: false,
      readOnly: true,
      immutable: true
    };
    const contract = namespace.validateContract("approvalRecord", approval);
    if (!contract.valid) return internal.buildResult(false, "IDE190_APPROVAL_CONTRACT_INVALID", "Blocked", { approval: approval, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(approval));
    state.approvals.set(frozen.approvalId, frozen);
    state.approvalStates.set(frozen.approvalId, { status: "Approved", consumedAt: null, invalidatedAt: null, invalidationReason: null, updatedAt: frozen.approvedAt });
    state.latestApprovalId = frozen.approvalId;
    internal.touch();
    return internal.buildResult(true, "IDE190_APPROVAL_GRANTED", "Approved", { approval: internal.clone(frozen), approvalState: runtimeStatus(frozen.approvalId), validation: contract });
  }

  function validateAutomationApproval(approvalId, contextHash, approvalClass) {
    const id = internal.text(approvalId, "");
    const approval = state.approvals.get(id) || null;
    const status = approval ? runtimeStatus(id) : null;
    const reasons = [];
    if (!approval) reasons.push("Approval Not Found");
    if (approval && !["P1", "P2", "P3"].includes(approval.approvalClass)) reasons.push("Approval Class Not Permitted");
    if (approval && approval.approvalClass !== internal.text(approvalClass, approval.approvalClass)) reasons.push("Approval Class Mismatch");
    if (approval && approval.contextHash !== internal.text(contextHash, "")) reasons.push("Approval Context Mismatch");
    if (approval && isExpired(approval.expiresAt)) reasons.push("Approval Expired");
    if (status && status.status === "Consumed") reasons.push("Approval Consumed");
    if (status && status.status === "Invalidated") reasons.push("Approval Invalidated");
    if (status && status.status !== "Approved") reasons.push("Approval Not Active");
    return { valid: reasons.length === 0, status: reasons.length === 0 ? "Valid" : "Invalid", approval: internal.clone(approval), approvalState: status, reasons: reasons, checkedAt: internal.nowIso() };
  }

  function consumeApprovalForGate(approvalId, contextHash, approvalClass) {
    const validation = validateAutomationApproval(approvalId, contextHash, approvalClass);
    if (!validation.valid) return { consumed: false, validation: validation };
    const now = internal.nowIso();
    state.approvalStates.set(approvalId, { status: "Consumed", consumedAt: now, invalidatedAt: null, invalidationReason: null, updatedAt: now });
    internal.touch();
    return { consumed: true, validation: validateAutomationApproval(approvalId, contextHash, approvalClass), consumedAt: now };
  }

  function invalidateAutomationApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const approvalId = internal.text(settings.approvalId, state.latestApprovalId || "");
    const approval = state.approvals.get(approvalId) || null;
    if (!approval) return internal.buildResult(false, "IDE190_APPROVAL_NOT_FOUND", "Blocked", null);
    const current = runtimeStatus(approvalId);
    if (current && current.status === "Consumed") return internal.buildResult(false, "IDE190_APPROVAL_ALREADY_CONSUMED", "Blocked", { approvalId: approvalId });
    const reason = internal.text(settings.reason, "");
    const actor = internal.text(settings.actor, "");
    if (!reason || !actor) return internal.buildResult(false, "IDE190_APPROVAL_INVALIDATION_CONTEXT_REQUIRED", "Blocked", null);
    const now = internal.nowIso();
    state.approvalStates.set(approvalId, { status: "Invalidated", consumedAt: null, invalidatedAt: now, invalidationReason: reason, invalidatedBy: actor, updatedAt: now });
    internal.touch();
    return internal.buildResult(true, "IDE190_APPROVAL_INVALIDATED", "Invalidated", { approvalId: approvalId, approvalState: runtimeStatus(approvalId) });
  }

  function getAutomationApprovalRequest(requestId) { return internal.clone(state.approvalRequests.get(internal.text(requestId, "")) || null); }
  function getAutomationApproval(approvalId) { return internal.clone(state.approvals.get(internal.text(approvalId, "")) || null); }
  function getAutomationApprovalStatus(approvalId) { const id = internal.text(approvalId, state.latestApprovalId || ""); return { approval: getAutomationApproval(id), approvalState: runtimeStatus(id) }; }
  function listAutomationApprovals() { return Array.from(state.approvals.values()).map(function copy(item) { return { approval: internal.clone(item), approvalState: runtimeStatus(item.approvalId) }; }); }
  function initializeApproval() { namespace.modules.approval.status = "Ready"; return internal.buildResult(true, "IDE190_APPROVAL_INITIALIZED", "Ready", { approvalCount: state.approvals.size, approvalRequestCount: state.approvalRequests.size }); }

  internal.consumeApprovalForGate = consumeApprovalForGate;
  Object.assign(namespace.api, { initializeApproval, requestAutomationApproval, grantAutomationApproval, validateAutomationApproval, invalidateAutomationApproval, getAutomationApprovalRequest, getAutomationApproval, getAutomationApprovalStatus, listAutomationApprovals });
  Object.assign(namespace, namespace.api);
  namespace.modules.approval = { id: "IDE-190-APPROVAL", version: MODULE_VERSION, status: "Loaded", phase: 4, bound: true, contextSpecific: true, singleUse: true, expiring: true, invalidatable: true, p4Allowed: false, dispatchImplemented: false, repositoryMutationAllowed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
