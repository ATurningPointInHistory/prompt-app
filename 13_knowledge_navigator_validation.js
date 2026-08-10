/* ============================================================
   FILE: 13_knowledge_navigator_validation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Validation 1.0.0
   Phase 1: Foundation / Contracts Validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("validation");

  function validFixtures() {
    const contractVersion = "1.0.0";
    return {
      navigationRequest: {
        requestId: "IDE-180-REQ-TEST",
        contractVersion: contractVersion,
        query: "IDE-170の根拠",
        target: null,
        navigationType: "evidence",
        scope: null,
        sourcePreference: [],
        evidenceRequirement: null,
        maxDepth: 1,
        options: {}
      },
      navigationResult: {
        resultId: "IDE-180-RESULT-TEST",
        requestId: "IDE-180-REQ-TEST",
        contractVersion: contractVersion,
        status: "complete",
        target: { id: "IDE-170" },
        navigationPath: [],
        sources: [],
        relationships: [],
        authority: { status: "not-applicable" },
        evidence: [],
        lineage: [],
        version: null,
        validation: {},
        conflicts: [],
        missingSources: [],
        partialReason: null,
        explanation: {},
        metadata: {}
      },
      navigationContext: {
        contextId: "IDE-180-CONTEXT-TEST",
        requestId: "IDE-180-REQ-TEST",
        sourceSnapshot: {},
        visitedNodes: [],
        visitedRelationships: [],
        candidateTargets: [],
        resolvedTargets: [],
        partialPaths: [],
        missingSources: [],
        authorityState: null,
        evidenceState: null,
        budgetState: null,
        warnings: []
      },
      sourceProvider: {
        providerId: "IDE-180-PROVIDER-TEST",
        providerVersion: "1.0.0",
        sourceType: "test-source",
        readMode: "read-only",
        availability: "available",
        capabilities: ["get", "search", "list"],
        supports: function supports() { return true; },
        describe: function describe() { return {}; },
        get: function get() { return null; },
        search: function search() { return []; },
        list: function list() { return []; }
      },
      resolver: {
        resolverId: "IDE-180-RESOLVER-TEST",
        version: "1.0.0",
        navigationTypes: ["search"],
        readOnly: true,
        resolve: function resolve() { return null; }
      },
      normalizedSourceRecord: {
        recordId: "REC-TEST",
        canonicalEntityId: "ENTITY-TEST",
        providerId: "IDE-180-PROVIDER-TEST",
        sourceId: "SOURCE-TEST",
        sourceType: "test-source",
        recordType: "test-record",
        title: "Test",
        summary: "",
        contentReference: null,
        version: "1.0.0",
        lifecycle: "active",
        officialState: "unknown",
        validationState: "unknown",
        scope: null,
        relationships: [],
        lineage: [],
        evidenceReferences: [],
        trust: "not-applicable",
        timestamps: {},
        sourceMetadata: {},
        immutable: true
      },
      navigationExplanation: {
        explanationId: "IDE-180-EXPLANATION-TEST",
        version: "1.0.0",
        resultId: "IDE-180-RESULT-TEST",
        conclusion: "Test conclusion",
        appliedRules: [],
        navigationPath: [],
        sources: [],
        authority: { status: "not-applicable" },
        evidence: [],
        validation: {},
        missingSources: [],
        limitations: [],
        truncation: { truncated: false },
        ambiguity: { status: "none" },
        humanReadable: "Test conclusion",
        metadata: {}
      },
      navigationReceipt: {
        receiptId: "IDE-180-RECEIPT-TEST",
        version: "1.0.0",
        sessionId: "IDE-180-SESSION-TEST",
        requestId: "IDE-180-REQ-TEST",
        resultId: "IDE-180-RESULT-TEST",
        status: "complete",
        sourceSnapshot: {},
        navigationSummary: {},
        path: [],
        authoritySummary: {},
        evidenceRefs: [],
        missing: [],
        budget: {},
        versions: {},
        createdAt: new Date(0).toISOString(),
        integrity: {}
      },
      ide190Handoff: {
        packageId: "IDE-180-PACKAGE-TEST",
        packageVersion: "1.0.0",
        contractVersion: "1.0.0",
        canonicalTarget: {},
        navigationPath: [],
        authority: {},
        evidence: [],
        lineage: [],
        validation: {},
        conflicts: [],
        missingSources: [],
        structuredExplanation: {},
        sourceSnapshot: {},
        manifest: {},
        integrity: {}
      }
    };
  }

  function runKnowledgeNavigatorPhase1Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];

    function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : String(detail),
        group: group || "Foundation",
        severity: severity || "High"
      });
    }

    const initialization = namespace.initialize({ requireIDE170: settings.requireIDE170 !== false });
    check("Foundation initialization succeeds", initialization.ok === true, initialization.code, "Initialization", "Critical");

    const status = namespace.getStatus();
    const dependency = namespace.getDependencyStatus();

    check("Component is IDE-180", status.componentId === "IDE-180", status.componentId, "Manifest", "Critical");
    check("Release Version is 1.0.0", status.version === "1.0.0", status.version, "Manifest", "Critical");
    check("Design Freeze is 1.0.0", status.designFreezeVersion === "1.0.0", status.designFreezeVersion, "Manifest", "Critical");
    check("Implementation Phase is Phase 1", /Phase 1/.test(status.implementationPhase || ""), status.implementationPhase, "Manifest", "High");

    check("IDE-170 Manifest is loaded", dependency.ide170ManifestLoaded === true, dependency.ide170ReleaseVersion, "Compatibility", "Critical");
    check("IDE-170 Release is compatible", dependency.ide170VersionCompatible === true, dependency.ide170ReleaseVersion + " >= " + dependency.minimumIDE170Version, "Compatibility", "Critical");
    check("IDE-170 Handoff Contract is compatible", dependency.ide170HandoffContractCompatible === true, dependency.ide170HandoffContractVersion, "Compatibility", "Critical");
    check("IDE-170 Handoff Public API is available", dependency.ide170HandoffApiAvailable === true, dependency.ide170HandoffApiAvailable, "Compatibility", "High");
    check("IDE-170 Query Interpreter Public API is available", dependency.ide170QueryInterpreterAvailable === true, dependency.ide170QueryInterpreterAvailable, "Compatibility", "High");

    const safety = namespace.getSafetyStatus();
    Object.keys(VERSION_MANIFEST.safety).forEach(function validateSafetyFlag(key) {
      check("Safety flag disabled: " + key, safety[key] === false, safety[key], "Safety", "Critical");
    });

    const contracts = namespace.listContractDefinitions();
    check("All Phase 1 contracts are registered", contracts.length === 9, contracts.length, "Contracts", "Critical");
    const contractIds = contracts.map(function mapContract(item) { return item.contractId; });
    check("Contract IDs are unique", new Set(contractIds).size === contractIds.length, contractIds.length, "Contracts", "Critical");
    contracts.forEach(function validateDefinition(definition) {
      check("Contract version is 1.0.0: " + definition.key, definition.version === "1.0.0", definition.version, "Contracts", "High");
      check("Contract is read-only: " + definition.key, definition.readOnly === true, definition.readOnly, "Contracts", "Critical");
    });

    const fixtures = validFixtures();
    Object.keys(fixtures).forEach(function validateFixture(key) {
      const result = namespace.validateContract(key, fixtures[key]);
      check("Valid fixture passes: " + key, result.valid === true, "failed=" + result.failed, "Contracts", "Critical");
    });

    const invalidRequest = Object.assign({}, fixtures.navigationRequest);
    delete invalidRequest.requestId;
    const invalidRequestValidation = namespace.validateContract("navigationRequest", invalidRequest);
    check("Invalid request is rejected", invalidRequestValidation.valid === false, "failed=" + invalidRequestValidation.failed, "Contracts", "Critical");

    const mutableProvider = Object.assign({}, fixtures.sourceProvider, { readMode: "read-write" });
    const mutableProviderValidation = namespace.validateContract("sourceProvider", mutableProvider);
    check("Mutable provider is rejected", mutableProviderValidation.valid === false, "failed=" + mutableProviderValidation.failed, "Safety", "Critical");

    const scoringSafety = safety.authorityScoringAllowed === false && safety.trustScoringAllowed === false && safety.conflictScoringAllowed === false;
    check("Scoring is disabled for authority/trust/conflict", scoringSafety, JSON.stringify({ authority: safety.authorityScoringAllowed, trust: safety.trustScoringAllowed, conflict: safety.conflictScoringAllowed }), "Safety", "Critical");

    const navigationTypes = namespace.listNavigationTypes();
    check("All 20 core navigation types are registered", navigationTypes.length === 20, navigationTypes.length, "Registry", "Critical");
    const typeIds = navigationTypes.map(function mapType(item) { return item.typeId; });
    check("Navigation Type IDs are unique", new Set(typeIds).size === typeIds.length, typeIds.length, "Registry", "Critical");
    check("Phase 1 does not overclaim implemented navigation types", navigationTypes.every(function notImplemented(item) { return item.implemented === false; }), "implemented=" + navigationTypes.filter(function implemented(item) { return item.implemented === true; }).length, "Registry", "Critical");

    const evidenceAlias = namespace.resolveNavigationType("根拠");
    check("Japanese alias 根拠 resolves to evidence", evidenceAlias.ok === true && evidenceAlias.typeId === "evidence", evidenceAlias.typeId, "Registry", "High");
    const reverseAlias = namespace.resolveNavigationType("何が依存している");
    check("Japanese reverse dependency alias resolves", reverseAlias.ok === true && reverseAlias.typeId === "reverse-dependency", reverseAlias.typeId, "Registry", "High");
    const unknownAlias = namespace.resolveNavigationType("__unknown_navigation_type__");
    check("Unknown navigation type is unsupported", unknownAlias.ok === false && unknownAlias.status === "unsupported", unknownAlias.status, "Registry", "Critical");

    check("Provider Registry is empty in Phase 1", namespace.listProviderDefinitions().length === 0, namespace.listProviderDefinitions().length, "Registry", "High");
    check("Resolver Registry is empty in Phase 1", namespace.listResolverDefinitions().length === 0, namespace.listResolverDefinitions().length, "Registry", "High");

    check("Core module is loaded", Boolean(namespace.modules.core), namespace.modules.core && namespace.modules.core.status, "Modules", "Critical");
    check("Contracts module is Ready", namespace.modules.contracts && namespace.modules.contracts.status === "Ready", namespace.modules.contracts && namespace.modules.contracts.status, "Modules", "Critical");
    check("Registry module is Ready", namespace.modules.registry && namespace.modules.registry.status === "Ready", namespace.modules.registry && namespace.modules.registry.status, "Modules", "Critical");
    check("Validation module is loaded", Boolean(namespace.modules.validation), namespace.modules.validation && namespace.modules.validation.status, "Modules", "Critical");

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    const result = {
      id: internal.nextId("IDE-180-PHASE1-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "IDE-180 Phase 1 Foundation PASS" : "IDE-180 Phase 1 Foundation FAIL",
      releaseAllowed: failed === 0,
      phase2Allowed: failed === 0,
      readOnly: true,
      checks: checks,
      validatedAt: internal.nowIso()
    };

    state.lastValidation = internal.clone(result);
    namespace.modules.validation.status = failed === 0 ? "Ready" : "Blocked";
    internal.touch();
    return internal.clone(result);
  }

  function getKnowledgeNavigatorPhase1ValidationStatus() {
    return state.lastValidation ? internal.clone(state.lastValidation) : {
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      status: "Not Validated",
      releaseAllowed: false,
      phase2Allowed: false
    };
  }

  Object.assign(namespace.api, {
    runKnowledgeNavigatorPhase1Validation: runKnowledgeNavigatorPhase1Validation,
    getKnowledgeNavigatorPhase1ValidationStatus: getKnowledgeNavigatorPhase1ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.validation = {
    id: "IDE-180-PHASE1-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    phaseName: "Foundation / Contracts",
    releaseGate: true,
    androidRequiredForFinalRelease: true,
    loadedAt: internal.nowIso()
  };

  global.runKnowledgeNavigatorPhase1Validation = runKnowledgeNavigatorPhase1Validation;
  global.getKnowledgeNavigatorPhase1ValidationStatus = getKnowledgeNavigatorPhase1ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
