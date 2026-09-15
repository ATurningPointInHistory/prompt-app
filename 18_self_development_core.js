/* ============================================================
   FILE: 18_self_development_core.js
   EXTERNAL-010 Decision 058 / Self-Development Environment
   Candidate Release: 0.1.0
   ============================================================ */
(function (global) {
  "use strict";

  const VERSION_MANIFEST = global.SELFDEVELOPMENT058VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("SELF-DEVELOPMENT-058 core blocked: Version Manifest is not loaded.");
    return;
  }

  const namespace = global.SELFDEVELOPMENT058Environment && typeof global.SELFDEVELOPMENT058Environment === "object"
    ? global.SELFDEVELOPMENT058Environment : {};
  const previousInternal = namespace.__internal && typeof namespace.__internal === "object" ? namespace.__internal : {};
  const state = previousInternal.state && typeof previousInternal.state === "object" ? previousInternal.state : {
    sequence: 0,
    baselineIdentityRecords: new Map(),
    candidates: new Map(),
    proposals: new Map(),
    evidence: new Map(),
    lineage: new Map(),
    validations: new Map(),
    latestBaselineIdentityId: null,
    latestCandidateId: null,
    latestProposalId: null,
    latestValidationId: null,
    updatedAt: null
  };

  ["baselineIdentityRecords", "candidates", "proposals", "evidence", "lineage", "validations"].forEach(function (key) {
    if (!(state[key] instanceof Map)) state[key] = new Map();
  });
  if (!Number.isInteger(state.sequence)) state.sequence = 0;

  function nowIso() { return new Date().toISOString(); }
  function text(value, fallback) { const v = String(value == null ? "" : value).trim(); return v || String(fallback == null ? "" : fallback); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function unique(values) { return [...new Set(asArray(values).map(function (x) { return text(x, ""); }).filter(Boolean))]; }
  function isPlainObject(value) { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
  function clone(value) {
    if (value == null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Map) { const m = new Map(); value.forEach(function (v, k) { m.set(k, clone(v)); }); return m; }
    const out = {}; Object.keys(value).forEach(function (k) { out[k] = clone(value[k]); }); return out;
  }
  function deepFreeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.keys(value).forEach(function (k) { deepFreeze(value[k]); }); return Object.freeze(value); }
  function nextId(prefix) { state.sequence += 1; return text(prefix, "SELFDEV058") + "-" + Date.now().toString(36).toUpperCase() + "-" + String(state.sequence).padStart(4, "0"); }
  function touch() { state.updatedAt = nowIso(); }
  function buildResult(ok, code, status, data, extra) { return Object.assign({ ok: Boolean(ok), code: text(code, ok ? "SELFDEV058_OK" : "SELFDEV058_BLOCKED"), status: text(status, ok ? "Ready" : "Blocked"), data: data == null ? null : clone(data), at: nowIso() }, extra || {}); }

  function getSafetyStatus() { return clone(VERSION_MANIFEST.safety); }
  function getDependencyStatus() {
    return {
      ide140: Boolean(global.IDE140DevelopmentAnalytics),
      ide170: Boolean(global.IDE170Intelligence),
      ide190: Boolean(global.IDE190DevelopmentAutomation),
      repository010: Boolean(global.REPOSITORY010LocalFirstRepository),
      external010: Boolean(global.EXTERNAL010ExternalIntelligence)
    };
  }
  function getStatus() {
    const latestBaseline = state.latestBaselineIdentityId ? state.baselineIdentityRecords.get(state.latestBaselineIdentityId) : null;
    return {
      componentId: VERSION_MANIFEST.componentId,
      decisionId: VERSION_MANIFEST.decisionId,
      version: VERSION_MANIFEST.version,
      phase: VERSION_MANIFEST.phase,
      status: "Ready",
      candidateCount: state.candidates.size,
      proposalCount: state.proposals.size,
      evidenceCount: state.evidence.size,
      lineageCount: state.lineage.size,
      latestBaselineIdentityId: state.latestBaselineIdentityId,
      baselineIdentityState: latestBaseline && latestBaseline.identityState || "UNKNOWN",
      canonicalMutationImplemented: false,
      directCanonicalRepositoryMutationAllowed: false,
      selfGrantedAuthorityAllowed: false,
      validationEqualsApproval: false,
      updatedAt: state.updatedAt
    };
  }

  const internal = Object.assign(previousInternal, { state, nowIso, text, asArray, unique, isPlainObject, clone, deepFreeze, nextId, touch, buildResult });
  namespace.__internal = internal;
  namespace.api = namespace.api && typeof namespace.api === "object" ? namespace.api : {};
  namespace.modules = namespace.modules && typeof namespace.modules === "object" ? namespace.modules : {};
  Object.assign(namespace.api, { getStatus, getSafetyStatus, getDependencyStatus });
  Object.assign(namespace, namespace.api);
  namespace.modules.core = { id: "SELF-DEVELOPMENT-058-CORE", version: VERSION_MANIFEST.version, status: "Ready", phase: 1, readOnlyFoundation: true, canonicalMutationImplemented: false, loadedAt: nowIso() };

  global.SELFDEVELOPMENT058Environment = namespace;
  global.getSelfDevelopment058Status = getStatus;
  global.getSelfDevelopment058SafetyStatus = getSafetyStatus;
  global.getSelfDevelopment058DependencyStatus = getDependencyStatus;
})(typeof window !== "undefined" ? window : globalThis);
