/* ============================================================
   FILE: 18_self_development_adapter.js
   Decision 058 Phase 1 / Existing Capability Read-Only Adapter
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, VERSION_MANIFEST = global.SELFDEVELOPMENT058VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const i = namespace.__internal, s = i.state;
  function safeCall(fn, fallback) { try { return typeof fn === "function" ? fn() : fallback; } catch (error) { return { status: "ERROR", message: error && error.message ? error.message : String(error) }; } }
  function inspectSelfDevelopmentExistingCapabilities() {
    const analytics = global.IDE140DevelopmentAnalytics || null;
    const intelligence = global.IDE170Intelligence || null;
    const automation = global.IDE190DevelopmentAutomation || null;
    const repository = global.REPOSITORY010LocalFirstRepository || null;
    const external = global.EXTERNAL010ExternalIntelligence || null;
    return {
      inspectedAt: i.nowIso(),
      readOnly: true,
      components: {
        ide140: { available: Boolean(analytics), status: safeCall(analytics && analytics.getDevelopmentAnalyticsStatus, null) },
        ide170: { available: Boolean(intelligence), status: safeCall(intelligence && intelligence.getStatus, null), repositorySnapshotStatus: safeCall(intelligence && intelligence.getRepositorySnapshotStatus, null) },
        ide190: { available: Boolean(automation), status: safeCall(automation && automation.getStatus, null), safety: safeCall(automation && automation.getSafetyStatus, null) },
        repository010: { available: Boolean(repository), status: safeCall(repository && repository.getStatus, null), safety: safeCall(repository && repository.getSafetyStatus, null) },
        external010: { available: Boolean(external), status: safeCall(external && external.getStatus, null) }
      },
      mutationApiInvoked: false,
      approvalApiInvoked: false,
      providerNetworkCallPerformed: false
    };
  }
  function createSelfDevelopmentInspectionEvidence(input) {
    const x = i.isPlainObject(input) ? input : {};
    const snapshot = inspectSelfDevelopmentExistingCapabilities();
    const evidence = i.deepFreeze({ evidenceId: i.nextId("SELFDEV058-EVIDENCE"), evidenceType: "READ_ONLY_CAPABILITY_INSPECTION", summary: i.text(x.summary, "Existing development capabilities inspected without mutation."), sourceRefs: i.unique(x.sourceRefs || ["IDE-140", "IDE-170", "IDE-190", "REPOSITORY-010", "EXTERNAL-010"]), snapshot: snapshot, canonicalMutationPerformed: false, authorityEffect: "none", createdAt: i.nowIso(), immutable: true });
    s.evidence.set(evidence.evidenceId, evidence); i.touch();
    return i.buildResult(true, "SELFDEV058_INSPECTION_EVIDENCE_CREATED", "Ready", { evidence: evidence });
  }
  Object.assign(namespace.api, { inspectSelfDevelopmentExistingCapabilities, createSelfDevelopmentInspectionEvidence }); Object.assign(namespace, namespace.api);
  namespace.modules.adapter = { id: "SELF-DEVELOPMENT-058-ADAPTER", version: VERSION_MANIFEST.version, status: "Ready", readOnly: true, mutationApiInvoked: false, loadedAt: i.nowIso() };
  global.inspectSelfDevelopment058ExistingCapabilities = inspectSelfDevelopmentExistingCapabilities;
})(typeof window !== "undefined" ? window : globalThis);
