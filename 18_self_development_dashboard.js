/* ============================================================
   FILE: 18_self_development_dashboard.js
   Decision 058 Phase 1 / Read-Only Dashboard Surface
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, VERSION_MANIFEST = global.SELFDEVELOPMENT058VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const i = namespace.__internal;
  function getSelfDevelopmentDashboardStatus() {
    const status = namespace.getStatus(), coverage = typeof namespace.getSelfDevelopmentPhase1Coverage === "function" ? namespace.getSelfDevelopmentPhase1Coverage() : null;
    return { id:"SELF-DEVELOPMENT-058", name:"Self-Development Environment", version:VERSION_MANIFEST.version, status:status.status, health: status.baselineIdentityState === "BASELINE_IDENTITY_CONFLICT" ? 70 : 100, implemented: coverage ? coverage.phase1ScopeImplemented : 0, total: coverage ? coverage.phase1ScopeTotal : 0, capabilities:["Baseline Identity Gate","Read-Only Existing Capability Adapter","Improvement Candidate Registry","Structured Change Proposal","Impact / Risk / Cost Model","Requirement Traceability"], warnings:status.baselineIdentityState === "BASELINE_IDENTITY_CONFLICT" ? ["Canonical baseline identity conflict detected"] : [], errors:[], readOnly:true, mutationActionsAvailable:false, approvalActionsAvailable:false, canonicalMutationImplemented:false, updatedAt:Date.now() };
  }
  function registerDashboard() {
    const results = {};
    if (typeof global.registerDevelopmentDashboardModule === "function") results.dashboard = global.registerDevelopmentDashboardModule({ id:"SELF-DEVELOPMENT-058", title:"Self-Development Environment", statusApi:"getSelfDevelopment058DashboardStatus", validator:"runSelfDevelopment058Phase1Validation" });
    if (typeof global.registerDevelopmentStatus === "function") results.status = global.registerDevelopmentStatus({ id:"SELF-DEVELOPMENT-058", statusApi:"getSelfDevelopment058DashboardStatus", validator:"runSelfDevelopment058Phase1Validation" }, { source:"runtime", persist:false });
    if (typeof global.registerIdeComponent === "function") results.ide = global.registerIdeComponent({ id:"SELF-DEVELOPMENT-058", title:"Self-Development Environment", summary:"Evidence-grounded self-development proposal environment with no canonical mutation in Phase 1.", icon:"🧩", version:VERSION_MANIFEST.version, status:"Candidate", ready:true, progress:100, health:100, validator:"runSelfDevelopment058Phase1Validation", probe:"getSelfDevelopment058DashboardStatus", category:"Development IDE" });
    return results;
  }
  Object.assign(namespace.api, { getSelfDevelopmentDashboardStatus, registerSelfDevelopmentDashboard:registerDashboard }); Object.assign(namespace, namespace.api);
  namespace.modules.dashboard = { id:"SELF-DEVELOPMENT-058-DASHBOARD", version:VERSION_MANIFEST.version, status:"Ready", readOnly:true, mutationActionsAvailable:false, loadedAt:i.nowIso() };
  global.getSelfDevelopment058DashboardStatus = getSelfDevelopmentDashboardStatus;
  registerDashboard();
})(typeof window !== "undefined" ? window : globalThis);
