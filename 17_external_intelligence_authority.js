/* ============================================================
   FILE: 17_external_intelligence_authority.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.0.0
   Phase 01: Governance / Contract / Authority Foundation
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 authority blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("authority");
  const HARD_DENIED = Object.freeze(VERSION_MANIFEST.authorityPolicy.hardDeniedActions.slice());

  function normalizeTarget(value) {
    const source = internal.isPlainObject(value) ? value : {};
    return {
      type: internal.text(source.type, "unknown"),
      id: internal.text(source.id, "*") || "*"
    };
  }

  function normalizeScope(value) {
    const source = internal.isPlainObject(value) ? value : {};
    return {
      domain: internal.text(source.domain, "EXTERNAL-010"),
      operation: internal.text(source.operation, "*"),
      constraints: internal.isPlainObject(source.constraints) ? internal.clone(source.constraints) : {}
    };
  }

  function createAuthorityEnvelopeCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const action = internal.text(settings.action, "").toUpperCase();
    const purpose = internal.text(settings.purpose, "");
    if (!action || !purpose) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_CANDIDATE_INVALID", "Blocked", null);
    const envelope = internal.deepFreeze({
      authorityEnvelopeId: internal.nextId("EXTERNAL-010-AUTHORITY"),
      action: action,
      target: normalizeTarget(settings.target),
      purpose: purpose,
      scope: normalizeScope(settings.scope),
      state: HARD_DENIED.includes(action) ? "BLOCKED" : "CANDIDATE",
      approvalEvidenceId: null,
      createdAt: internal.nowIso(),
      expiresAt: settings.expiresAt ? internal.text(settings.expiresAt, "") : null,
      immutable: true
    });
    const contract = namespace.validateExternalIntelligenceContract("authorityEnvelope", envelope);
    if (!contract.valid) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_CONTRACT_INVALID", "Blocked", { validation: contract });
    state.authorityEnvelopes.set(envelope.authorityEnvelopeId, envelope);
    internal.touch();
    return internal.buildResult(true,
      envelope.state === "BLOCKED" ? "EXTERNAL010_AUTHORITY_HARD_DENY_RECORDED" : "EXTERNAL010_AUTHORITY_CANDIDATE_CREATED",
      envelope.state === "BLOCKED" ? "Blocked" : "Candidate",
      { envelope: internal.clone(envelope), authorityGranted: false });
  }

  function setAuthorityApprovalAdapter(adapter) {
    if (adapter == null) {
      state.authorityApprovalAdapter = null;
      internal.touch();
      return internal.buildResult(true, "EXTERNAL010_AUTHORITY_APPROVAL_ADAPTER_RESET", "Ready", { adapterId: null });
    }
    const valid = adapter && typeof adapter.verifyApproval === "function" && adapter.requiresExplicitOwnerInteraction === true;
    if (!valid) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_APPROVAL_ADAPTER_INVALID", "Blocked", null);
    state.authorityApprovalAdapter = adapter;
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_AUTHORITY_APPROVAL_ADAPTER_SET", "Ready", { adapterId: internal.text(adapter.adapterId, "custom") });
  }

  async function activateAuthorityEnvelope(authorityEnvelopeId, approvalInput) {
    const id = internal.text(authorityEnvelopeId, "");
    const existing = state.authorityEnvelopes.get(id);
    if (!existing) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_ENVELOPE_NOT_FOUND", "Blocked", { authorityEnvelopeId: id || null });
    if (HARD_DENIED.includes(existing.action) || existing.state === "BLOCKED") {
      return internal.buildResult(false, "EXTERNAL010_AUTHORITY_HARD_DENY", "Blocked", { action: existing.action, authorityGranted: false });
    }
    if (!state.authorityApprovalAdapter) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_OWNER_APPROVAL_ADAPTER_REQUIRED", "Blocked", { authorityGranted: false });

    let verification;
    try {
      verification = await state.authorityApprovalAdapter.verifyApproval({
        envelope: internal.clone(existing),
        approvalInput: internal.clone(approvalInput || {})
      });
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_AUTHORITY_APPROVAL_VERIFICATION_FAILED", "Failed", null, { error: { message: error && error.message || String(error), category: "Authority Approval" } });
    }
    const approved = Boolean(verification && verification.approved === true && internal.text(verification.actorType, "") === "Project Owner" && internal.text(verification.interactionEvidenceId, ""));
    if (!approved) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_OWNER_APPROVAL_NOT_VERIFIED", "Blocked", { authorityGranted: false, verification: internal.redactSensitive(verification || {}) });

    const activated = internal.deepFreeze(Object.assign({}, internal.clone(existing), {
      state: "ACTIVE",
      approvalEvidenceId: internal.text(verification.interactionEvidenceId, "")
    }));
    state.authorityEnvelopes.set(id, activated);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_AUTHORITY_ENVELOPE_ACTIVATED", "Active", { envelope: internal.clone(activated), authorityGranted: true });
  }

  function revokeAuthorityEnvelope(authorityEnvelopeId, reason) {
    const id = internal.text(authorityEnvelopeId, "");
    const existing = state.authorityEnvelopes.get(id);
    if (!existing) return internal.buildResult(false, "EXTERNAL010_AUTHORITY_ENVELOPE_NOT_FOUND", "Blocked", null);
    const revoked = internal.deepFreeze(Object.assign({}, internal.clone(existing), { state: "REVOKED", revocationReason: internal.text(reason, "Manual revocation") }));
    state.authorityEnvelopes.set(id, revoked);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_AUTHORITY_ENVELOPE_REVOKED", "Revoked", { envelope: internal.clone(revoked), authorityGranted: false });
  }

  function isExpired(envelope, at) {
    if (!envelope || !envelope.expiresAt) return false;
    const expires = Date.parse(envelope.expiresAt);
    const current = Date.parse(at || internal.nowIso());
    return Number.isFinite(expires) && Number.isFinite(current) && current >= expires;
  }

  function targetMatches(allowed, requested) {
    const a = normalizeTarget(allowed);
    const r = normalizeTarget(requested);
    return (a.type === "*" || a.type === r.type) && (a.id === "*" || a.id === r.id);
  }

  function evaluateExternalIntelligenceAuthority(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const action = internal.text(settings.action, "").toUpperCase();
    const target = normalizeTarget(settings.target);
    const purpose = internal.text(settings.purpose, "");
    if (!action) return { allowed: false, decision: "DENY", reason: "ACTION_REQUIRED", authorityEnvelopeId: null, evaluatedAt: internal.nowIso() };
    if (HARD_DENIED.includes(action)) return { allowed: false, decision: "DENY", reason: "HARD_DENY", authorityEnvelopeId: null, evaluatedAt: internal.nowIso() };

    const active = Array.from(state.authorityEnvelopes.values()).filter(function match(envelope) {
      return envelope.state === "ACTIVE" && envelope.action === action && !isExpired(envelope) && targetMatches(envelope.target, target) && (!purpose || envelope.purpose === purpose);
    });
    if (!active.length) return { allowed: false, decision: "DENY", reason: "NO_ACTIVE_AUTHORITY", authorityEnvelopeId: null, evaluatedAt: internal.nowIso() };
    return { allowed: true, decision: "ALLOW", reason: "ACTIVE_SCOPED_AUTHORITY", authorityEnvelopeId: active[0].authorityEnvelopeId, evaluatedAt: internal.nowIso() };
  }

  function getAuthorityEnvelope(id) {
    const value = state.authorityEnvelopes.get(internal.text(id, ""));
    return value ? internal.clone(value) : null;
  }

  function listAuthorityEnvelopes() {
    return Array.from(state.authorityEnvelopes.values()).map(internal.clone);
  }

  function createPromotionBoundaryRecord(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const record = internal.deepFreeze({
      promotionBoundaryId: internal.nextId("EXTERNAL-010-PROMOTION-BOUNDARY"),
      candidateType: internal.text(settings.candidateType, "External Intelligence Candidate"),
      automaticPromotionAllowed: false,
      canonicalMutationPerformed: false,
      validationEqualsApproval: false,
      authorityEffect: "none",
      createdAt: internal.nowIso(),
      immutable: true
    });
    const validation = namespace.validateExternalIntelligenceContract("promotionBoundary", record);
    return internal.buildResult(validation.valid === true,
      validation.valid ? "EXTERNAL010_PROMOTION_BOUNDARY_CREATED" : "EXTERNAL010_PROMOTION_BOUNDARY_INVALID",
      validation.valid ? "Ready" : "Blocked",
      { record: internal.clone(record), validation: validation });
  }

  function initializeExternalIntelligenceAuthority() {
    namespace.modules.authority.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_AUTHORITY_INITIALIZED", "Ready", {
      defaultDecision: VERSION_MANIFEST.authorityPolicy.defaultDecision,
      hardDeniedActions: HARD_DENIED.slice(),
      approvalAdapterConfigured: Boolean(state.authorityApprovalAdapter),
      envelopeCount: state.authorityEnvelopes.size
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceAuthority: initializeExternalIntelligenceAuthority,
    createExternalIntelligenceAuthorityEnvelopeCandidate: createAuthorityEnvelopeCandidate,
    setExternalIntelligenceAuthorityApprovalAdapter: setAuthorityApprovalAdapter,
    activateExternalIntelligenceAuthorityEnvelope: activateAuthorityEnvelope,
    revokeExternalIntelligenceAuthorityEnvelope: revokeAuthorityEnvelope,
    evaluateExternalIntelligenceAuthority: evaluateExternalIntelligenceAuthority,
    getExternalIntelligenceAuthorityEnvelope: getAuthorityEnvelope,
    listExternalIntelligenceAuthorityEnvelopes: listAuthorityEnvelopes,
    createExternalIntelligencePromotionBoundaryRecord: createPromotionBoundaryRecord
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.authority = {
    id: "EXTERNAL-010-UNIFIED-ACTION-AUTHORITY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    defaultDeny: true,
    validationGrantsAuthority: false,
    candidateGrantsAuthority: false,
    ordinaryApprovalOverridesHardDeny: false,
    directRepositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
