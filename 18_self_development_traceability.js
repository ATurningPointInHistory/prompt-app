/* ============================================================
   FILE: 18_self_development_traceability.js
   Decision 058 Phase 1 / Requirement Traceability
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, VERSION_MANIFEST = global.SELFDEVELOPMENT058VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const i = namespace.__internal;
  const stateById = {
    "REQ-058-001":"IMPLEMENTED_PHASE1", "REQ-058-002":"FOUNDATION_ONLY", "REQ-058-003":"FOUNDATION_ONLY", "REQ-058-004":"FOUNDATION_ONLY", "REQ-058-005":"IMPLEMENTED_PHASE1", "REQ-058-006":"IMPLEMENTED_PHASE1",
    "REQ-058-007":"DEFERRED_LATER_PHASE", "REQ-058-008":"DEFERRED_LATER_PHASE", "REQ-058-009":"FOUNDATION_ONLY", "REQ-058-010":"FOUNDATION_ONLY", "REQ-058-011":"FOUNDATION_ONLY", "REQ-058-012":"IMPLEMENTED_PHASE1", "REQ-058-013":"FOUNDATION_ONLY", "REQ-058-014":"DEFERRED_LATER_PHASE", "REQ-058-015":"FOUNDATION_ONLY", "REQ-058-016":"DEFERRED_LATER_PHASE", "REQ-058-017":"FOUNDATION_ONLY", "REQ-058-018":"IMPLEMENTED_PHASE1"
  };
  const implementationRefById = {
    "REQ-058-001":["18_self_development_baseline_identity.js"], "REQ-058-002":["18_self_development_adapter.js"], "REQ-058-003":["18_self_development_candidate.js"], "REQ-058-004":["18_self_development_candidate.js"], "REQ-058-005":["18_self_development_candidate.js"], "REQ-058-006":["18_self_development_candidate.js"], "REQ-058-012":["18_self_development_version_manifest.js","18_self_development_core.js"], "REQ-058-017":["18_self_development_core.js","18_self_development_candidate.js"], "REQ-058-018":["18_self_development_version_manifest.js","18_self_development_core.js"]
  };
  function getSelfDevelopmentRequirementTraceability() {
    return VERSION_MANIFEST.requirements.map(function (r) { return { requirementId:r.requirementId, title:r.title, phase1Disposition:r.phase1Disposition, verificationState:stateById[r.requirementId] || "UNKNOWN", implementationRefs:i.clone(implementationRefById[r.requirementId] || []), validationRefs:["18_self_development_phase1_validation.js#" + r.requirementId] }; });
  }
  function getSelfDevelopmentPhase1Coverage() {
    const rows = getSelfDevelopmentRequirementTraceability();
    const decisionImplemented = rows.filter(function (r) { return r.verificationState === "IMPLEMENTED_PHASE1"; }).length;
    const scope = (VERSION_MANIFEST.phase1ImplementationRequirements || []).map(function (r) { return i.clone(r); });
    const scopeImplemented = scope.filter(function (r) { return r.implemented === true; }).length;
    return {
      decisionId: VERSION_MANIFEST.decisionId,
      totalDecisionRequirements: rows.length,
      decisionRequirementsImplemented: decisionImplemented,
      allDecisionRequirementsComplete: decisionImplemented === rows.length,
      phase1ScopeTotal: scope.length,
      phase1ScopeImplemented: scopeImplemented,
      phase1ScopeComplete: scope.length > 0 && scopeImplemented === scope.length,
      falseFullDecisionCompletionClaimed: false,
      phase1Scope: scope,
      rows: rows
    };
  }
  Object.assign(namespace.api, { getSelfDevelopmentRequirementTraceability, getSelfDevelopmentPhase1Coverage }); Object.assign(namespace, namespace.api);
  namespace.modules.traceability = { id:"SELF-DEVELOPMENT-058-TRACEABILITY", version:VERSION_MANIFEST.version, status:"Ready", machineTrackableRequirementIds:true, decisionCoverageAloneIsConformance:false, loadedAt:i.nowIso() };
  global.getSelfDevelopment058RequirementTraceability = getSelfDevelopmentRequirementTraceability;
})(typeof window !== "undefined" ? window : globalThis);
