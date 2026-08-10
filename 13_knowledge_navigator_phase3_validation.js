/* ============================================================
   FILE: 13_knowledge_navigator_phase3_validation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Phase 3 Validation 1.0.0
   Phase 3: Basic Navigation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 3 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase3Validation");
  const BASIC_TYPES = ["search", "entity", "repository", "file", "module", "function"];

  async function runKnowledgeNavigatorPhase3Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : String(detail),
        group: group || "Phase 3",
        severity: severity || "High"
      });
    }

    const initialization = namespace.initialize({ requireIDE170: settings.requireIDE170 !== false });
    check("IDE-180 initialization succeeds", initialization.ok === true, initialization.code, "Initialization", "Critical");
    const status = namespace.getStatus();
    check("Release Version is 1.2.0", status.version === "1.2.0", status.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 3", VERSION_MANIFEST.implementation.phase === 3, status.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains 1.0.0", status.designFreezeVersion === "1.0.0", status.designFreezeVersion, "Manifest", "High");
    check("Completed phases include 1 and 2", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1, 2]), JSON.stringify(VERSION_MANIFEST.implementation.completedPhases), "Manifest", "High");

    const safety = namespace.getSafetyStatus();
    Object.keys(VERSION_MANIFEST.safety).forEach(function validateSafetyFlag(key) {
      check("Safety flag remains disabled: " + key, safety[key] === false, safety[key], "Safety", "Critical");
    });

    check("Nine frozen contracts remain registered", namespace.listContractDefinitions().length === 9, namespace.listContractDefinitions().length, "Contracts", "Critical");
    check("All frozen contracts remain read-only", namespace.listContractDefinitions().filter(function mutable(item) { return item.readOnly !== true; }).length === 0, namespace.listContractDefinitions().filter(function mutable(item) { return item.readOnly !== true; }).length, "Contracts", "Critical");
    check("Twenty core navigation types remain registered", namespace.listNavigationTypes().length === 20, namespace.listNavigationTypes().length, "Registry", "Critical");
    const implemented = namespace.listNavigationTypes().filter(function filter(item) { return item.implemented === true; }).map(function id(item) { return item.typeId; }).sort();
    check("Exactly six Phase 3 basic navigation types are implemented", JSON.stringify(implemented) === JSON.stringify(BASIC_TYPES.slice().sort()), implemented.join(","), "Registry", "Critical");
    check("Phase 4 relationship navigation is not overclaimed", namespace.getNavigationType("relationship").implemented === false, namespace.getNavigationType("relationship").implemented, "Registry", "Critical");
    check("Phase 5 authority/evidence navigation is not overclaimed", namespace.getNavigationType("evidence").implemented === false && namespace.getNavigationType("validation").implemented === false, "evidence=" + namespace.getNavigationType("evidence").implemented + ",validation=" + namespace.getNavigationType("validation").implemented, "Registry", "Critical");
    check("Exactly one Phase 3 resolver is registered", namespace.listResolverDefinitions().length === 1, namespace.listResolverDefinitions().length, "Resolver Registry", "Critical");
    check("Basic Navigation resolver is registered", namespace.listResolverDefinitions().some(function match(item) { return item.resolverId === "IDE-180-RESOLVER-BASIC-NAVIGATION"; }), JSON.stringify(namespace.listResolverDefinitions()), "Resolver Registry", "Critical");

    const resolver = namespace.getResolverDefinition("IDE-180-RESOLVER-BASIC-NAVIGATION");
    check("Basic Resolver contract is read-only", Boolean(resolver && resolver.readOnly === true), resolver && resolver.readOnly, "Resolver", "Critical");
    check("Basic Resolver contains six navigation types", Boolean(resolver && resolver.navigationTypes && resolver.navigationTypes.length === 6), resolver && resolver.navigationTypes && resolver.navigationTypes.length, "Resolver", "Critical");
    check("Basic Resolver does not implement relationship navigation", Boolean(resolver && !resolver.navigationTypes.includes("relationship")), resolver && resolver.navigationTypes && resolver.navigationTypes.join(","), "Resolver", "Critical");

    const opened = await namespace.openLatestIntelligencePackageSource({ allowIndexedDB: settings.allowIndexedDB !== false });
    check("IDE-170 Intelligence Package opens", opened && opened.ok === true, opened && opened.code, "Package Intake", "Critical");
    const provider = namespace.getIntelligenceProviderStatus();
    check("Provider remains read-only", provider.readMode === "read-only" && provider.mutationAllowed === false, provider.readMode, "Provider", "Critical");
    check("Provider source origin is explicit", Boolean(provider.activePackage && provider.activePackage.sourceOrigin), provider.activePackage && provider.activePackage.sourceOrigin, "Provider", "High");
    check("Provider package hash remains SHA-256", /^[a-f0-9]{64}$/.test(String(provider.activePackage && provider.activePackage.packageHash || "")), provider.activePackage && provider.activePackage.packageHash, "Provider", "Critical");

    const canonical = namespace.loadKnowledgeNavigatorCanonicalSnapshot();
    check("Canonical Snapshot loads through provider", canonical && canonical.ok === true, canonical && canonical.code, "Identity", "Critical");
    const records = canonical && canonical.data && Array.isArray(canonical.data.records) ? canonical.data.records : [];
    check("Canonical Snapshot contains records", records.length > 0, records.length, "Identity", "Critical");
    const files = records.filter(function file(record) { return record && record.recordType === "file"; });
    const modules = records.filter(function module(record) { return record && record.recordType === "module"; });
    const functions = records.filter(function fn(record) { return record && record.recordType === "function"; });
    check("Canonical Snapshot contains at least one file for Phase 3 fixture", files.length > 0, files.length, "Identity", "Critical");

    const firstFile = files[0] || null;
    const fileId = firstFile && firstFile.identity && firstFile.identity.canonicalId || null;
    const fileName = firstFile && firstFile.identity && (firstFile.identity.name || firstFile.identity.qualifiedName) || null;
    check("Dynamic file fixture has Canonical ID", Boolean(fileId), fileId, "Identity", "Critical");
    check("Dynamic file fixture has display identity", Boolean(fileName), fileName, "Identity", "High");

    const exactIdentity = fileId ? namespace.resolveCanonicalNavigationTarget(fileId, { recordType: "file" }) : null;
    check("Canonical ID exact resolution succeeds", Boolean(exactIdentity && exactIdentity.ok === true), exactIdentity && exactIdentity.code, "Identity", "Critical");
    check("Exact resolution preserves Canonical ID", Boolean(exactIdentity && exactIdentity.data && exactIdentity.data.target && exactIdentity.data.target.canonicalId === fileId), exactIdentity && exactIdentity.data && exactIdentity.data.target && exactIdentity.data.target.canonicalId, "Identity", "Critical");
    check("Identity resolution does not use a score", Boolean(exactIdentity && exactIdentity.data && exactIdentity.data.target && !("score" in exactIdentity.data.target)), JSON.stringify(exactIdentity && exactIdentity.data && exactIdentity.data.target || {}), "Safety", "Critical");

    const fileNavigation = fileId ? await namespace.navigateKnowledge({ navigationType: "file", target: { canonicalId: fileId, recordType: "file" } }) : null;
    check("File navigation completes", Boolean(fileNavigation && fileNavigation.status === "complete"), fileNavigation && fileNavigation.status, "Basic Navigation", "Critical");
    check("File navigation returns requested Canonical ID", Boolean(fileNavigation && fileNavigation.target && fileNavigation.target.canonicalId === fileId), fileNavigation && fileNavigation.target && fileNavigation.target.canonicalId, "Basic Navigation", "Critical");
    check("File navigation path is explicit", Boolean(fileNavigation && Array.isArray(fileNavigation.navigationPath) && fileNavigation.navigationPath.length === 1), fileNavigation && fileNavigation.navigationPath && fileNavigation.navigationPath.length, "Basic Navigation", "Critical");
    check("File navigation source is traceable to active Package", Boolean(fileNavigation && fileNavigation.sources && fileNavigation.sources[0] && fileNavigation.sources[0].packageId === provider.activePackage.packageId), fileNavigation && fileNavigation.sources && fileNavigation.sources[0] && fileNavigation.sources[0].packageId, "Traceability", "Critical");
    check("Phase 3 Authority remains not-applicable", Boolean(fileNavigation && fileNavigation.authority && fileNavigation.authority.status === "not-applicable"), fileNavigation && fileNavigation.authority && fileNavigation.authority.status, "No Overclaim", "Critical");
    check("Phase 3 does not fabricate Evidence", Boolean(fileNavigation && Array.isArray(fileNavigation.evidence) && fileNavigation.evidence.length === 0), fileNavigation && fileNavigation.evidence && fileNavigation.evidence.length, "No Overclaim", "Critical");
    check("Phase 3 does not fabricate Lineage", Boolean(fileNavigation && Array.isArray(fileNavigation.lineage) && fileNavigation.lineage.length === 0), fileNavigation && fileNavigation.lineage && fileNavigation.lineage.length, "No Overclaim", "Critical");
    check("Phase 3 does not fabricate Relationships", Boolean(fileNavigation && Array.isArray(fileNavigation.relationships) && fileNavigation.relationships.length === 0), fileNavigation && fileNavigation.relationships && fileNavigation.relationships.length, "No Overclaim", "Critical");
    check("Navigation Result satisfies frozen contract", Boolean(fileNavigation && namespace.validateContract("navigationResult", fileNavigation).valid === true), fileNavigation && namespace.validateContract("navigationResult", fileNavigation).failed, "Contracts", "Critical");
    check("Structured Explanation satisfies frozen contract", Boolean(fileNavigation && namespace.validateContract("navigationExplanation", fileNavigation.explanation).valid === true), fileNavigation && namespace.validateContract("navigationExplanation", fileNavigation.explanation).failed, "Contracts", "Critical");
    check("Navigation Result is immutable", Boolean(fileNavigation && Object.isFrozen(fileNavigation)), Object.isFrozen(fileNavigation || {}), "Read-Only", "Critical");
    check("Explanation excludes hidden reasoning", Boolean(fileNavigation && fileNavigation.explanation && fileNavigation.explanation.metadata.hiddenReasoningIncluded === false), fileNavigation && fileNavigation.explanation && fileNavigation.explanation.metadata.hiddenReasoningIncluded, "Explanation", "Critical");

    const searchNavigation = fileName ? await namespace.navigateKnowledge({ navigationType: "search", query: fileName, options: { limit: 10 } }) : null;
    check("Basic Search completes", Boolean(searchNavigation && searchNavigation.status === "complete"), searchNavigation && searchNavigation.status, "Search", "Critical");
    check("Basic Search returns candidates", Boolean(searchNavigation && searchNavigation.metadata && searchNavigation.metadata.candidates.length > 0), searchNavigation && searchNavigation.metadata && searchNavigation.metadata.candidates.length, "Search", "Critical");
    check("Basic Search preserves deterministic match kind", Boolean(searchNavigation && ["exact", "contains"].includes(searchNavigation.metadata.matchKind)), searchNavigation && searchNavigation.metadata && searchNavigation.metadata.matchKind, "Search", "High");
    check("Basic Search result contains no relevance score", Boolean(searchNavigation && searchNavigation.metadata && searchNavigation.metadata.candidates.every(function noScore(item) { return !("score" in item); })), JSON.stringify(searchNavigation && searchNavigation.metadata && searchNavigation.metadata.candidates.slice(0, 2) || []), "Safety", "Critical");

    const entityNavigation = fileId ? await namespace.navigateKnowledge({ navigationType: "entity", target: { canonicalId: fileId, recordType: "file" } }) : null;
    check("Entity navigation completes", Boolean(entityNavigation && entityNavigation.status === "complete"), entityNavigation && entityNavigation.status, "Entity", "Critical");
    check("Entity navigation preserves record type", Boolean(entityNavigation && entityNavigation.target && entityNavigation.target.recordType === "file"), entityNavigation && entityNavigation.target && entityNavigation.target.recordType, "Entity", "Critical");

    const repositoryNavigation = await namespace.navigateKnowledge({ navigationType: "repository", query: "repository" });
    check("Repository navigation resolves or explicitly reports ambiguity", Boolean(repositoryNavigation && ["complete", "partial"].includes(repositoryNavigation.status)), repositoryNavigation && repositoryNavigation.status, "Repository", "Critical");
    check("Repository navigation never fabricates a project target", Boolean(repositoryNavigation && (repositoryNavigation.target || repositoryNavigation.metadata.candidates.length > 1)), repositoryNavigation && repositoryNavigation.target && repositoryNavigation.target.canonicalId, "Repository", "Critical");

    const naturalLanguage = fileName ? await namespace.navigateKnowledge(fileName + "とは？") : null;
    check("IDE-170 Japanese Query bridge resolves a Basic Navigation request", Boolean(naturalLanguage && naturalLanguage.status === "complete"), naturalLanguage && naturalLanguage.status, "Query Bridge", "Critical");
    check("Japanese Query bridge resolves the same file", Boolean(naturalLanguage && naturalLanguage.target && naturalLanguage.target.canonicalId === fileId), naturalLanguage && naturalLanguage.target && naturalLanguage.target.canonicalId, "Query Bridge", "Critical");
    check("Japanese Query bridge records IDE-170 typed query metadata", Boolean(naturalLanguage && naturalLanguage.metadata && naturalLanguage.metadata.navigationType), naturalLanguage && naturalLanguage.metadata && naturalLanguage.metadata.navigationType, "Query Bridge", "High");

    const notFound = await namespace.navigateKnowledge({ navigationType: "file", target: { canonicalId: "file:__ide180_missing_fixture__.js", recordType: "file" } });
    check("Unknown file returns not-found", Boolean(notFound && notFound.status === "not-found"), notFound && notFound.status, "Missing Target", "Critical");
    check("Unknown file does not claim missing source", Boolean(notFound && notFound.missingSources.length === 0), notFound && notFound.missingSources && notFound.missingSources.length, "Missing Target", "High");

    const unsupported = await namespace.navigateKnowledge({ navigationType: "relationship", target: { canonicalId: fileId, recordType: "file" } });
    check("Phase 4 relationship request is explicitly unsupported", Boolean(unsupported && unsupported.status === "unsupported"), unsupported && unsupported.status, "No Overclaim", "Critical");
    check("Unsupported relationship request contains no invented relationships", Boolean(unsupported && unsupported.relationships.length === 0), unsupported && unsupported.relationships && unsupported.relationships.length, "No Overclaim", "Critical");

    async function validateCapabilityBackedType(type, recordsOfType, capability) {
      const available = Array.isArray(provider.capabilities) && provider.capabilities.includes(capability);
      if (!available) {
        const result = await namespace.navigateKnowledge({ navigationType: type, target: { canonicalId: type + ":__missing_capability_fixture__", recordType: type } });
        check(type + " navigation reports missing-source when artifact-backed capability is unavailable", result.status === "missing-source", result.status, "Capability Boundary", "Critical");
        check(type + " missing-source identifies required capability", Boolean(result.missingSources[0] && result.missingSources[0].capability === capability), result.missingSources[0] && result.missingSources[0].capability, "Capability Boundary", "Critical");
      } else {
        const record = recordsOfType[0];
        const canonicalId = record && record.identity && record.identity.canonicalId;
        const result = canonicalId ? await namespace.navigateKnowledge({ navigationType: type, target: { canonicalId: canonicalId, recordType: type } }) : null;
        check(type + " capability is backed by at least one Canonical Record", Boolean(record), recordsOfType.length, "Capability Boundary", "Critical");
        check(type + " navigation completes when capability is available", Boolean(result && result.status === "complete"), result && result.status, "Capability Boundary", "Critical");
      }
    }
    await validateCapabilityBackedType("module", modules, "module-navigation");
    await validateCapabilityBackedType("function", functions, "function-navigation");

    const aliasFile = namespace.resolveNavigationType("ファイル");
    check("Japanese alias ファイル resolves to file", aliasFile.ok === true && aliasFile.typeId === "file", aliasFile.typeId, "Registry", "High");
    const aliasSearch = namespace.resolveNavigationType("検索");
    check("Japanese alias 検索 resolves to search", aliasSearch.ok === true && aliasSearch.typeId === "search", aliasSearch.typeId, "Registry", "High");
    const unknownType = await namespace.navigateKnowledge({ navigationType: "__unknown_navigation_type__", query: fileName || "test" });
    check("Unknown Navigation Type remains unsupported", unknownType.status === "unsupported", unknownType.status, "Registry", "Critical");

    check("Identity module is Ready", namespace.modules.identity && namespace.modules.identity.status === "Ready", namespace.modules.identity && namespace.modules.identity.status, "Modules", "Critical");
    check("Query Resolution module is Ready", namespace.modules.queryResolution && namespace.modules.queryResolution.status === "Ready", namespace.modules.queryResolution && namespace.modules.queryResolution.status, "Modules", "Critical");
    check("Basic Resolver module is Ready", namespace.modules.basicResolver && namespace.modules.basicResolver.status === "Ready", namespace.modules.basicResolver && namespace.modules.basicResolver.status, "Modules", "Critical");
    check("Explanation module is Ready", namespace.modules.explanation && namespace.modules.explanation.status === "Ready", namespace.modules.explanation && namespace.modules.explanation.status, "Modules", "Critical");
    check("Orchestrator module is Ready", namespace.modules.orchestrator && namespace.modules.orchestrator.status === "Ready", namespace.modules.orchestrator && namespace.modules.orchestrator.status, "Modules", "Critical");
    check("Phase 3 Validation module is loaded", Boolean(namespace.modules.phase3Validation), namespace.modules.phase3Validation && namespace.modules.phase3Validation.status, "Modules", "Critical");

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    const result = {
      id: internal.nextId("IDE-180-PHASE3-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "IDE-180 Phase 3 Basic Navigation PASS" : "IDE-180 Phase 3 Basic Navigation FAIL",
      releaseAllowed: failed === 0,
      phase4Allowed: failed === 0,
      readOnly: true,
      implementedNavigationTypes: implemented,
      sourceProvider: namespace.getIntelligenceProviderStatus ? namespace.getIntelligenceProviderStatus() : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
    state.lastValidation = internal.clone(result);
    state.lastPhase3Validation = internal.clone(result);
    namespace.modules.phase3Validation.status = failed === 0 ? "Ready" : "Blocked";
    internal.touch();
    return internal.clone(result);
  }

  function getKnowledgeNavigatorPhase3ValidationStatus() {
    return state.lastPhase3Validation ? internal.clone(state.lastPhase3Validation) : {
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      status: "Not Validated",
      releaseAllowed: false,
      phase4Allowed: false
    };
  }

  Object.assign(namespace.api, {
    runKnowledgeNavigatorPhase3Validation: runKnowledgeNavigatorPhase3Validation,
    getKnowledgeNavigatorPhase3ValidationStatus: getKnowledgeNavigatorPhase3ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase3Validation = {
    id: "IDE-180-PHASE3-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    phaseName: "Basic Navigation",
    asynchronous: true,
    realPackageRequired: true,
    androidGateRequired: true,
    releaseGate: true,
    loadedAt: internal.nowIso()
  };

  global.runKnowledgeNavigatorPhase3Validation = runKnowledgeNavigatorPhase3Validation;
  global.getKnowledgeNavigatorPhase3ValidationStatus = getKnowledgeNavigatorPhase3ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
