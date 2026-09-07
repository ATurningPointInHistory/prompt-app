/* ============================================================
   FILE: 17_external_intelligence_secret_governance.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.5.0
   Phase 06: Secret Governance / Reference-Only Access
   Decision: 012 / Supporting 054
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("secretGovernance");
  const STATUSES = new Set(VERSION_MANIFEST.secretGovernance.statuses || []);
  const SECRET_TYPES = new Set(["API_KEY","BEARER_TOKEN","ACCESS_TOKEN","REFRESH_TOKEN","CLIENT_SECRET","USERNAME_PASSWORD_REFERENCE","CUSTOM_SECRET"]);
  const VALUE_KEYS = /(secretValue|apiKey|password|accessToken|refreshToken|bearerToken|clientSecret|authorization|credentialValue|tokenValue)/i;

  function containsSecretValueField(value) {
    if (Array.isArray(value)) return value.some(containsSecretValueField);
    if (!internal.isPlainObject(value)) return false;
    return Object.keys(value).some(function (key) { return VALUE_KEYS.test(key) || containsSecretValueField(value[key]); });
  }

  function normalizeMetadata(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const id = internal.text(x.secretReferenceId, "").toUpperCase();
    const type = internal.text(x.secretType, "CUSTOM_SECRET").toUpperCase();
    const status = internal.text(x.status, "UNKNOWN").toUpperCase();
    const now = internal.nowIso();
    return {
      secretReferenceId: id,
      secretType: SECRET_TYPES.has(type) ? type : "CUSTOM_SECRET",
      provider: internal.text(x.provider, "LOCAL_GATEWAY"),
      status: STATUSES.has(status) ? status : "UNKNOWN",
      createdAt: internal.text(x.createdAt, now),
      updatedAt: now,
      expiresAt: x.expiresAt ? internal.text(x.expiresAt, "") : null,
      valueExposed: false,
      immutable: true
    };
  }

  function registerExternalIntelligenceSecretMetadata(input) {
    if (containsSecretValueField(input)) return internal.buildResult(false, "EXTERNAL010_SECRET_VALUE_FIELD_REJECTED", "Blocked", { browserSecretStorageAllowed: false });
    const metadata = normalizeMetadata(input);
    if (!/^SECRET-[A-Z0-9-]+$/.test(metadata.secretReferenceId)) return internal.buildResult(false, "EXTERNAL010_SECRET_REFERENCE_INVALID", "Blocked", null);
    const cv = namespace.validateExternalIntelligenceContract("secretMetadata", metadata);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-SECRET-METADATA", metadata);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_SECRET_METADATA_INVALID", "Blocked", { contract: cv, schema: sv });
    state.secretMetadataRegistry.set(metadata.secretReferenceId, internal.deepFreeze(internal.clone(metadata)));
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SECRET_METADATA_REGISTERED", "Ready", { secretMetadata: internal.clone(metadata), secretValueStored: false });
  }

  function getExternalIntelligenceSecretMetadata(id) {
    const item = state.secretMetadataRegistry.get(internal.text(id, "").toUpperCase());
    return item ? internal.clone(item) : null;
  }

  function listExternalIntelligenceSecretMetadata() {
    return Array.from(state.secretMetadataRegistry.values()).map(internal.clone);
  }

  function validateExternalIntelligenceSecretReference(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const id = internal.text(x.secretReferenceId, "").toUpperCase();
    const metadata = state.secretMetadataRegistry.get(id);
    if (!metadata) return internal.buildResult(false, "EXTERNAL010_SECRET_REFERENCE_MISSING", "Blocked", { secretReferenceId: id || null, secretValueReturned: false });
    if (["EXPIRED","REVOKED","DISABLED","MISSING","UNKNOWN"].includes(metadata.status)) return internal.buildResult(false, "EXTERNAL010_SECRET_REFERENCE_NOT_ACTIVE", "Blocked", { secretMetadata: internal.clone(metadata), secretValueReturned: false });
    if (metadata.expiresAt && Date.parse(metadata.expiresAt) <= Date.now()) return internal.buildResult(false, "EXTERNAL010_SECRET_REFERENCE_EXPIRED", "Blocked", { secretMetadata: internal.clone(metadata), secretValueReturned: false });
    return internal.buildResult(true, "EXTERNAL010_SECRET_REFERENCE_ACTIVE", "Ready", { secretMetadata: internal.clone(metadata), secretValueReturned: false, paidAuthorityGranted: false, financialAuthorityGranted: false });
  }

  function inspectExternalIntelligenceSecretSafety(value) {
    return internal.buildResult(!containsSecretValueField(value), containsSecretValueField(value) ? "EXTERNAL010_SECRET_VALUE_EXPOSURE_CANDIDATE" : "EXTERNAL010_SECRET_REFERENCE_ONLY_SAFE", containsSecretValueField(value) ? "Blocked" : "Ready", {
      secretValueFieldDetected: containsSecretValueField(value),
      browserSecretStorageAllowed: false,
      repositorySecretStorageAllowed: false,
      evidenceSecretStorageAllowed: false,
      secretValueReturnedToBrowserAllowed: false
    });
  }

  function initializeExternalIntelligenceSecretGovernance() {
    namespace.modules.secretGovernance.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_SECRET_GOVERNANCE_INITIALIZED", "Ready", {
      referenceOnly: true,
      localGatewayResolutionRequired: true,
      persistentSecretStorageTechnologyFixed: false,
      browserSecretValueApiAvailable: false,
      secretMetadataCount: state.secretMetadataRegistry.size
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceSecretGovernance,
    registerExternalIntelligenceSecretMetadata,
    getExternalIntelligenceSecretMetadata,
    listExternalIntelligenceSecretMetadata,
    validateExternalIntelligenceSecretReference,
    inspectExternalIntelligenceSecretSafety
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.secretGovernance = { id:"EXTERNAL-010-SECRET-GOVERNANCE", version:MODULE_VERSION, status:"Loaded", phase:6, decision:"012", referenceOnly:true, secretValueApiAvailable:false, loadedAt:internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
