/* ============================================================
   FILE: 13_knowledge_navigator_phase2_validation.js
   IDE-180 Knowledge Navigator
   Release: 1.1.0 / Module: Phase 2 Validation 1.0.0
   Phase 2: IDE-170 Package Intake / Provider Foundation Validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 2 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase2Validation");

  async function runKnowledgeNavigatorPhase2Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : String(detail),
        group: group || "Phase 2",
        severity: severity || "High"
      });
    }

    try {
      const init = namespace.initialize({ requireIDE170: true });
      check("IDE-180 initialization succeeds", init.ok === true, init.code, "Initialization", "Critical");

      const status = namespace.getStatus();
      const dependency = namespace.getDependencyStatus();
      check("Release Version is 1.1.0", status.version === "1.1.0", status.version, "Manifest", "Critical");
      check("Implementation Phase is Phase 2", /Phase 2/.test(status.implementationPhase || ""), status.implementationPhase, "Manifest", "Critical");
      check("Design Freeze remains 1.0.0", status.designFreezeVersion === "1.0.0", status.designFreezeVersion, "Manifest", "High");
      check("IDE-170 Release remains compatible", dependency.ide170VersionCompatible === true, dependency.ide170ReleaseVersion, "Compatibility", "Critical");
      check("IDE-170 Handoff Contract remains compatible", dependency.ide170HandoffContractCompatible === true, dependency.ide170HandoffContractVersion, "Compatibility", "Critical");

      const safety = namespace.getSafetyStatus();
      Object.keys(VERSION_MANIFEST.safety).forEach(function validateFlag(key) {
        check("Safety flag remains disabled: " + key, safety[key] === false, safety[key], "Safety", "Critical");
      });

      const contracts = namespace.listContractDefinitions();
      check("Nine frozen contracts remain registered", contracts.length === 9, contracts.length, "Contracts", "Critical");
      check("All frozen contracts remain read-only", contracts.every(function readOnly(item) { return item.readOnly === true; }), contracts.filter(function mutable(item) { return item.readOnly !== true; }).length, "Contracts", "Critical");
      const types = namespace.listNavigationTypes();
      check("Twenty core navigation types remain registered", types.length === 20, types.length, "Registry", "Critical");
      const currentPhase = Number(VERSION_MANIFEST.implementation && VERSION_MANIFEST.implementation.phase || 2);
      check("Navigation implementation does not exceed current phase", types.every(function governed(item) { return item.implemented !== true || (Number.isInteger(item.implementationPhase) && item.implementationPhase <= currentPhase); }), "implemented=" + types.filter(function implemented(item) { return item.implemented === true; }).length + ",phase=" + currentPhase, "Registry", "Critical");

      const providers = namespace.listProviderDefinitions();
      check("Exactly one Phase 2 provider is registered", providers.length === 1, providers.length, "Provider Registry", "Critical");
      check("IDE-170 Intelligence Package provider is registered", providers.some(function match(item) { return item.providerId === "IDE-180-PROVIDER-IDE170-INTELLIGENCE-PACKAGE"; }), JSON.stringify(providers), "Provider Registry", "Critical");
      check("Resolver Registry remains compatible with current phase", currentPhase === 2 ? namespace.listResolverDefinitions().length === 0 : namespace.listResolverDefinitions().every(function valid(item) { return Boolean(item.resolverId); }), namespace.listResolverDefinitions().length, "Provider Registry", "High");

      const providerStatusBefore = namespace.getIntelligenceProviderStatus();
      check("Provider module is Ready", namespace.modules.intelligenceProvider && namespace.modules.intelligenceProvider.status === "Ready", namespace.modules.intelligenceProvider && namespace.modules.intelligenceProvider.status, "Provider", "Critical");
      check("Provider is read-only", providerStatusBefore.readMode === "read-only" && providerStatusBefore.mutationAllowed === false, providerStatusBefore.readMode, "Provider", "Critical");
      check("Provider exposes package discovery", providerStatusBefore.discovered && providerStatusBefore.discovered.available === true, JSON.stringify(providerStatusBefore.discovered && providerStatusBefore.discovered.api || {}), "Provider", "Critical");
      check("IDE-170 package validator API is available", providerStatusBefore.discovered && providerStatusBefore.discovered.api.validateIntelligencePackage === true, providerStatusBefore.discovered && providerStatusBefore.discovered.api.validateIntelligencePackage, "Compatibility", "Critical");
      check("IDE-170 handoff validator API is available", providerStatusBefore.discovered && providerStatusBefore.discovered.api.validateIDE180HandoffContract === true, providerStatusBefore.discovered && providerStatusBefore.discovered.api.validateIDE180HandoffContract, "Compatibility", "Critical");
      check("IndexedDB package read API is available", providerStatusBefore.discovered && providerStatusBefore.discovered.api.loadIntelligencePackageFromIndexedDB === true, providerStatusBefore.discovered && providerStatusBefore.discovered.api.loadIntelligencePackageFromIndexedDB, "Compatibility", "Critical");

      const discoveredPackageId = providerStatusBefore.discovered && (
        providerStatusBefore.discovered.runtimePackage && providerStatusBefore.discovered.runtimePackage.packageId ||
        providerStatusBefore.discovered.persistedPackage && providerStatusBefore.discovered.persistedPackage.packageId
      );
      check("IDE-170 Release Package identity is discoverable", Boolean(discoveredPackageId), discoveredPackageId, "Package Discovery", "Critical");

      const openResult = await namespace.openLatestIntelligencePackageSource({ allowIndexedDB: settings.allowIndexedDB !== false });
      check("IDE-170 Intelligence Package opens", openResult && openResult.ok === true, openResult && openResult.code, "Package Intake", "Critical");

      const opened = namespace.getIntelligenceProviderStatus();
      check("Provider availability is available or partial", ["available", "partial"].includes(opened.availability), opened.availability, "Package Intake", "Critical");
      check("Opened Package ID matches discovered identity", opened.activePackage && opened.activePackage.packageId === discoveredPackageId, opened.activePackage && opened.activePackage.packageId, "Package Intake", "Critical");
      check("Opened Package Hash is SHA-256", opened.activePackage && /^[a-f0-9]{64}$/.test(String(opened.activePackage.packageHash || "")), opened.activePackage && opened.activePackage.packageHash, "Package Intake", "Critical");
      check("Source origin is explicit", opened.activePackage && ["runtime", "indexeddb", "explicit"].includes(opened.activePackage.sourceOrigin), opened.activePackage && opened.activePackage.sourceOrigin, "Package Intake", "High");
      check("Artifact index is populated", opened.activePackage && opened.activePackage.artifactCount > 0, opened.activePackage && opened.activePackage.artifactCount, "Artifact Index", "Critical");
      check("Handoff identity is loaded", opened.activePackage && Boolean(opened.activePackage.handoffId), opened.activePackage && opened.activePackage.handoffId, "Handoff", "Critical");

      const openData = openResult && openResult.data || {};
      check("IDE-170 Package Validation PASS", openData.packageValidation && openData.packageValidation.valid === true && openData.packageValidation.failed === 0, openData.packageValidation && openData.packageValidation.status, "Package Validation", "Critical");
      check("Manifest Compatibility PASS", openData.compatibilityValidation && openData.compatibilityValidation.valid === true && openData.compatibilityValidation.failed === 0, openData.compatibilityValidation && openData.compatibilityValidation.health, "Compatibility", "Critical");
      check("IDE-170 Handoff Validation PASS", openData.handoffValidation && openData.handoffValidation.valid === true && openData.handoffValidation.failed === 0, openData.handoffValidation && openData.handoffValidation.status, "Handoff", "Critical");
      check("Handoff consumer is IDE-180", openData.handoff && openData.handoff.consumer && openData.handoff.consumer.componentId === "IDE-180", openData.handoff && openData.handoff.consumer && openData.handoff.consumer.componentId, "Handoff", "Critical");
      check("Handoff package mutation is prohibited", openData.handoff && openData.handoff.policy && openData.handoff.policy.packageMutationAllowed === false, openData.handoff && openData.handoff.policy && openData.handoff.policy.packageMutationAllowed, "Safety", "Critical");
      check("Handoff repository mutation is prohibited", openData.handoff && openData.handoff.policy && openData.handoff.policy.repositoryMutationAllowed === false, openData.handoff && openData.handoff.policy && openData.handoff.policy.repositoryMutationAllowed, "Safety", "Critical");
      check("Handoff is frozen and immutable", openData.handoff && openData.handoff.frozen === true && openData.handoff.immutable === true, openData.handoff && openData.handoff.frozenAt, "Handoff", "Critical");

      const records = namespace.listIntelligencePackageArtifacts({ limit: 500 });
      check("Artifact list matches active artifact count", records.length === opened.activePackage.artifactCount, records.length + "/" + opened.activePackage.artifactCount, "Artifact Index", "Critical");
      check("Artifact list contains no eager payload", records.every(function noPayload(record) { return !(record && record.payload); }), "records=" + records.length, "Lazy Loading", "Critical");
      check("All artifact descriptors are immutable", records.every(function immutable(record) { return record && record.immutable === true; }), records.filter(function mutable(record) { return !record || record.immutable !== true; }).length, "Artifact Index", "Critical");
      check("All artifact descriptors use IDE-170 package source type", records.every(function source(record) { return record.sourceType === "ide170-intelligence-package"; }), records.filter(function source(record) { return record.sourceType !== "ide170-intelligence-package"; }).length, "Artifact Index", "Critical");
      check("All artifact descriptors satisfy Normalized Source Record contract", records.every(function valid(record) { return namespace.validateContract("normalizedSourceRecord", record).valid === true; }), records.filter(function invalid(record) { return namespace.validateContract("normalizedSourceRecord", record).valid !== true; }).length, "Normalization", "Critical");

      const canonicalRecords = namespace.searchIntelligencePackageArtifacts("canonical", { limit: 20 });
      check("Artifact metadata search finds canonical snapshot", canonicalRecords.some(function canonical(record) { return record.recordType === "canonical-snapshot"; }), canonicalRecords.map(function type(record) { return record.recordType; }).join(","), "Artifact Search", "Critical");

      const canonicalLoad = namespace.getIntelligencePackageArtifact({ entryPoint: "canonicalSnapshot" });
      check("Canonical Snapshot lazy artifact load succeeds", canonicalLoad && canonicalLoad.ok === true, canonicalLoad && canonicalLoad.code, "Lazy Loading", "Critical");
      check("Canonical Snapshot payload is returned only on get", canonicalLoad && canonicalLoad.data && canonicalLoad.data.artifact && canonicalLoad.data.artifact.payload != null, canonicalLoad && canonicalLoad.data && canonicalLoad.data.record && canonicalLoad.data.record.recordType, "Lazy Loading", "Critical");
      check("Canonical Snapshot source reference matches active package", canonicalLoad && canonicalLoad.sourceSnapshot && canonicalLoad.sourceSnapshot.packageId === opened.activePackage.packageId, canonicalLoad && canonicalLoad.sourceSnapshot && canonicalLoad.sourceSnapshot.packageId, "Traceability", "Critical");

      const relationshipLoad = namespace.getIntelligencePackageArtifact({ entryPoint: "relationships" });
      check("Relationship Graph entry point resolves", relationshipLoad && relationshipLoad.ok === true, relationshipLoad && relationshipLoad.code, "Entry Points", "Critical");
      check("Relationship Graph artifact type is correct", relationshipLoad && relationshipLoad.data && relationshipLoad.data.record && relationshipLoad.data.record.recordType === "fact-relationship-graph", relationshipLoad && relationshipLoad.data && relationshipLoad.data.record && relationshipLoad.data.record.recordType, "Entry Points", "Critical");

      const missingLoad = namespace.getIntelligencePackageArtifact({ artifactId: "__IDE180_MISSING_ARTIFACT__" });
      check("Unknown Artifact returns not-found", missingLoad && missingLoad.ok === false && missingLoad.status === "not-found", missingLoad && missingLoad.status, "Missing Source", "Critical");

      const supportsEntity = namespace.describeIntelligencePackageProvider().capabilities.includes("entity-navigation")
        ? namespace.__internal.state.providerDefinitions.get("IDE-180-PROVIDER-IDE170-INTELLIGENCE-PACKAGE").supports("entity")
        : true;
      check("Artifact-backed capability mapping does not overclaim entity navigation", supportsEntity === true, supportsEntity, "Capabilities", "High");

      const first = records[0];
      if (first) {
        const firstLoad = namespace.getIntelligencePackageArtifact({ artifactId: first.contentReference.artifactId });
        const originalType = firstLoad && firstLoad.data && firstLoad.data.artifact && firstLoad.data.artifact.artifactType;
        if (firstLoad && firstLoad.data && firstLoad.data.artifact) firstLoad.data.artifact.artifactType = "__MUTATED_COPY__";
        const secondLoad = namespace.getIntelligencePackageArtifact({ artifactId: first.contentReference.artifactId });
        check("Returned Artifact mutation does not mutate provider source", secondLoad && secondLoad.data && secondLoad.data.artifact && secondLoad.data.artifact.artifactType === originalType, secondLoad && secondLoad.data && secondLoad.data.artifact && secondLoad.data.artifact.artifactType, "Read-Only", "Critical");
      } else {
        check("Returned Artifact mutation does not mutate provider source", false, "No artifact available", "Read-Only", "Critical");
      }

      const runtime = global.IDE170Intelligence;
      const packageValidationAfter = runtime && typeof runtime.validateIntelligencePackage === "function"
        ? runtime.validateIntelligencePackage(openData && openData.manifest && opened.activePackage && opened.activePackage.packageId || discoveredPackageId)
        : null;
      const activePackageObject = runtime && typeof runtime.getIntelligencePackage === "function" ? runtime.getIntelligencePackage(discoveredPackageId) : null;
      if (activePackageObject) {
        const post = runtime.validateIntelligencePackage(activePackageObject);
        check("Runtime IDE-170 Package remains valid after navigation reads", post.valid === true && post.failed === 0, post.status, "Read-Only", "Critical");
      } else {
        check("Provider source remains immutable after IndexedDB read", openData.packageValidation && openData.packageValidation.valid === true, openData.packageValidation && openData.packageValidation.status, "Read-Only", "Critical");
      }
      void packageValidationAfter;

      check("Provider does not expose source mutation capability", !opened.capabilities.some(function mutation(cap) { return /write|update|delete|replace|commit|mutat/i.test(cap); }), opened.capabilities.join(","), "Safety", "Critical");
      check("IndexedDB adapter is read-only from IDE-180", opened.readMode === "read-only", opened.readMode, "Safety", "Critical");
      check("Archive automatic import remains disabled", safety.automaticArchiveImportAllowed === false, safety.automaticArchiveImportAllowed, "Safety", "Critical");
      check("Missing Source inference remains disabled", safety.missingSourceInferenceAllowed === false, safety.missingSourceInferenceAllowed, "Safety", "Critical");

      check("Core module remains loaded", Boolean(namespace.modules.core), namespace.modules.core && namespace.modules.core.status, "Modules", "Critical");
      check("Contracts module remains Ready", namespace.modules.contracts && namespace.modules.contracts.status === "Ready", namespace.modules.contracts && namespace.modules.contracts.status, "Modules", "Critical");
      check("Registry module remains Ready", namespace.modules.registry && namespace.modules.registry.status === "Ready", namespace.modules.registry && namespace.modules.registry.status, "Modules", "Critical");
      check("Intelligence Provider module is Ready", namespace.modules.intelligenceProvider && namespace.modules.intelligenceProvider.status === "Ready", namespace.modules.intelligenceProvider && namespace.modules.intelligenceProvider.status, "Modules", "Critical");
      check("Phase 2 Validation module is loaded", Boolean(namespace.modules.phase2Validation), namespace.modules.phase2Validation && namespace.modules.phase2Validation.status, "Modules", "Critical");
    } catch (error) {
      check("Phase 2 Validation completed without exception", false, error && error.message ? error.message : String(error), "Runtime", "Critical");
    }

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    const result = {
      id: internal.nextId("IDE-180-PHASE2-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "IDE-180 Phase 2 Package Intake / Provider PASS" : "IDE-180 Phase 2 Package Intake / Provider FAIL",
      releaseAllowed: failed === 0,
      phase3Allowed: failed === 0,
      readOnly: true,
      sourceProvider: namespace.getIntelligenceProviderStatus ? namespace.getIntelligenceProviderStatus() : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
    state.lastValidation = clone(result);
    state.lastPhase2Validation = clone(result);
    namespace.modules.phase2Validation.status = failed === 0 ? "Ready" : "Blocked";
    internal.touch();
    return clone(result);
  }

  function clone(value) { return internal.clone(value); }

  function getKnowledgeNavigatorPhase2ValidationStatus() {
    return state.lastPhase2Validation ? clone(state.lastPhase2Validation) : {
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      status: "Not Validated",
      releaseAllowed: false,
      phase3Allowed: false
    };
  }

  Object.assign(namespace.api, {
    runKnowledgeNavigatorPhase2Validation: runKnowledgeNavigatorPhase2Validation,
    getKnowledgeNavigatorPhase2ValidationStatus: getKnowledgeNavigatorPhase2ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase2Validation = {
    id: "IDE-180-PHASE2-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    phaseName: "IDE-170 Package Intake / Provider Foundation",
    asynchronous: true,
    indexedDBReadBackRequired: true,
    releaseGate: true,
    loadedAt: internal.nowIso()
  };

  global.runKnowledgeNavigatorPhase2Validation = runKnowledgeNavigatorPhase2Validation;
  global.getKnowledgeNavigatorPhase2ValidationStatus = getKnowledgeNavigatorPhase2ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
