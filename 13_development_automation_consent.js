/* ============================================================
   FILE: 13_development_automation_consent.js
   IDE-190 Development Automation
   Release: 1.3.0 / Module: Consent 1.0.0
   Phase 4: Gate / Approval / Consent
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 consent blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("consent");

  function stableValue(value) { if (Array.isArray(value)) return value.map(stableValue); if (!value || typeof value !== "object") return value; const output = {}; Object.keys(value).sort().forEach(function sortKey(key){ output[key] = stableValue(value[key]); }); return output; }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  async function sha256Text(value) { if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return null; const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(String(value))); return Array.from(new Uint8Array(digest)).map(function toHex(byte){return byte.toString(16).padStart(2,"0");}).join(""); }

  async function recordAutomationConsent(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const consentType = internal.text(settings.consentType, "");
    if (!["Read-Only Recovery", "Archive Search"].includes(consentType)) return internal.buildResult(false, "IDE190_CONSENT_TYPE_NOT_ALLOWED", "Blocked", { consentType: consentType });
    const actor = internal.text(settings.actor, "");
    if (!actor) return internal.buildResult(false, "IDE190_CONSENT_ACTOR_REQUIRED", "Blocked", null);
    const scope = internal.isPlainObject(settings.scope) ? internal.clone(settings.scope) : {};
    const target = internal.isPlainObject(settings.target) ? internal.clone(settings.target) : {};
    const context = internal.isPlainObject(settings.context) ? internal.clone(settings.context) : {};
    const contextHash = await sha256Text(stableStringify({ consentType: consentType, scope: scope, target: target, context: context }));
    if (!contextHash) return internal.buildResult(false, "IDE190_CONSENT_HASH_UNAVAILABLE", "Blocked", null);
    const consent = {
      consentId: internal.nextId("IDE-190-CONSENT"),
      consentType: consentType,
      actor: actor,
      scope: scope,
      target: target,
      context: context,
      contextHash: contextHash,
      status: "Active",
      isApproval: false,
      importAuthorizationGranted: false,
      mutationApprovalGranted: false,
      dispatchPermissionGranted: false,
      automaticImportAllowed: false,
      readOnly: true,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const contract = namespace.validateContract("consentRecord", consent);
    if (!contract.valid) return internal.buildResult(false, "IDE190_CONSENT_CONTRACT_INVALID", "Blocked", { consent: consent, validation: contract });
    const frozen = internal.deepFreeze(internal.clone(consent));
    state.consents.set(frozen.consentId, frozen);
    state.consentStates.set(frozen.consentId, { status: "Active", invalidatedAt: null, invalidationReason: null });
    state.latestConsentId = frozen.consentId;
    internal.touch();
    return internal.buildResult(true, "IDE190_CONSENT_RECORDED", "Active", { consent: internal.clone(frozen), validation: contract });
  }

  function invalidateAutomationConsent(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const consentId = internal.text(settings.consentId, state.latestConsentId || "");
    if (!state.consents.has(consentId)) return internal.buildResult(false, "IDE190_CONSENT_NOT_FOUND", "Blocked", null);
    const actor = internal.text(settings.actor, "");
    const reason = internal.text(settings.reason, "");
    if (!actor || !reason) return internal.buildResult(false, "IDE190_CONSENT_INVALIDATION_CONTEXT_REQUIRED", "Blocked", null);
    const now = internal.nowIso();
    state.consentStates.set(consentId, { status: "Invalidated", invalidatedAt: now, invalidationReason: reason, invalidatedBy: actor });
    internal.touch();
    return internal.buildResult(true, "IDE190_CONSENT_INVALIDATED", "Invalidated", { consentId: consentId, state: internal.clone(state.consentStates.get(consentId)) });
  }

  function getAutomationConsent(consentId) { const id = internal.text(consentId, state.latestConsentId || ""); const consent = state.consents.get(id) || null; return consent ? { consent: internal.clone(consent), state: internal.clone(state.consentStates.get(id) || null) } : null; }
  function listAutomationConsents() { return Array.from(state.consents.values()).map(function copy(item){return { consent: internal.clone(item), state: internal.clone(state.consentStates.get(item.consentId) || null) };}); }
  function initializeConsent() { namespace.modules.consent.status = "Ready"; return internal.buildResult(true, "IDE190_CONSENT_INITIALIZED", "Ready", { consentCount: state.consents.size }); }

  Object.assign(namespace.api, { initializeConsent, recordAutomationConsent, invalidateAutomationConsent, getAutomationConsent, listAutomationConsents });
  Object.assign(namespace, namespace.api);
  namespace.modules.consent = { id: "IDE-190-CONSENT", version: MODULE_VERSION, status: "Loaded", phase: 4, consentIsApproval: false, archiveSearchConsentIsImportAuthorization: false, mutationApprovalGranted: false, dispatchImplemented: false, repositoryMutationAllowed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
