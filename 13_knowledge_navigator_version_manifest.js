/* ============================================================
   FILE: 13_knowledge_navigator_version_manifest.js
   IDE-180 Knowledge Navigator
   Release: 1.4.0
   Phase 5: Authority / Evidence / Lineage
   Design Freeze: v1.0.0 / 2026-08-10
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.4.0";
  const BASELINE_VERSION = "1.0.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  const moduleVersions = {
    core: "1.4.0",
    contracts: BASELINE_VERSION,
    registry: "1.2.0",
    intelligenceProvider: BASELINE_VERSION,
    identity: BASELINE_VERSION,
    queryResolution: BASELINE_VERSION,
    basicResolver: BASELINE_VERSION,
    budget: BASELINE_VERSION,
    traversal: BASELINE_VERSION,
    relationshipResolver: BASELINE_VERSION,
    authority: BASELINE_VERSION,
    evidence: BASELINE_VERSION,
    lineage: BASELINE_VERSION,
    validationResolver: BASELINE_VERSION,
    explanation: "1.2.0",
    orchestrator: "1.2.0",
    validation: "1.0.4",
    phase2Validation: BASELINE_VERSION,
    phase3Validation: BASELINE_VERSION,
    phase4Validation: BASELINE_VERSION,
    phase5Validation: BASELINE_VERSION
  };

  const fileModules = {
    "13_knowledge_navigator_core.js": "core",
    "13_knowledge_navigator_contracts.js": "contracts",
    "13_knowledge_navigator_registry.js": "registry",
    "13_knowledge_navigator_intelligence_provider.js": "intelligenceProvider",
    "13_knowledge_navigator_identity.js": "identity",
    "13_knowledge_navigator_query_resolution.js": "queryResolution",
    "13_knowledge_navigator_basic_resolver.js": "basicResolver",
    "13_knowledge_navigator_budget.js": "budget",
    "13_knowledge_navigator_traversal.js": "traversal",
    "13_knowledge_navigator_relationship_resolver.js": "relationshipResolver",
    "13_knowledge_navigator_authority.js": "authority",
    "13_knowledge_navigator_evidence.js": "evidence",
    "13_knowledge_navigator_lineage.js": "lineage",
    "13_knowledge_navigator_validation_resolver.js": "validationResolver",
    "13_knowledge_navigator_explanation.js": "explanation",
    "13_knowledge_navigator_orchestrator.js": "orchestrator",
    "13_knowledge_navigator_validation.js": "validation",
    "13_knowledge_navigator_phase2_validation.js": "phase2Validation",
    "13_knowledge_navigator_phase3_validation.js": "phase3Validation",
    "13_knowledge_navigator_phase4_validation.js": "phase4Validation",
    "13_knowledge_navigator_phase5_validation.js": "phase5Validation"
  };

  const contractVersions = {
    navigationRequest: BASELINE_VERSION,
    navigationResult: BASELINE_VERSION,
    navigationContext: BASELINE_VERSION,
    sourceProvider: BASELINE_VERSION,
    resolver: BASELINE_VERSION,
    normalizedSourceRecord: BASELINE_VERSION,
    navigationExplanation: BASELINE_VERSION,
    navigationReceipt: BASELINE_VERSION,
    ide190Handoff: BASELINE_VERSION
  };

  const contractIds = {
    navigationRequest: "IDE-180-CONTRACT-NAVIGATION-REQUEST",
    navigationResult: "IDE-180-CONTRACT-NAVIGATION-RESULT",
    navigationContext: "IDE-180-CONTRACT-NAVIGATION-CONTEXT",
    sourceProvider: "IDE-180-CONTRACT-SOURCE-PROVIDER",
    resolver: "IDE-180-CONTRACT-RESOLVER",
    normalizedSourceRecord: "IDE-180-CONTRACT-NORMALIZED-SOURCE-RECORD",
    navigationExplanation: "IDE-180-CONTRACT-NAVIGATION-EXPLANATION",
    navigationReceipt: "IDE-180-CONTRACT-NAVIGATION-RECEIPT",
    ide190Handoff: "IDE-180-CONTRACT-IDE190-HANDOFF"
  };

  const navigationTypes = [
    "search",
    "entity",
    "repository",
    "file",
    "module",
    "function",
    "architecture",
    "knowledge",
    "relationship",
    "dependency",
    "reverse-dependency",
    "workflow",
    "decision",
    "evidence",
    "lineage",
    "version",
    "timeline",
    "validation",
    "insight",
    "explanation"
  ];

  const safety = {
    directRepositoryMutationAllowed: false,
    automaticRecommendationApplicationAllowed: false,
    automaticWorkflowExecutionAllowed: false,
    githubAutomaticReflectionAllowed: false,
    candidateAutomaticFactPromotionAllowed: false,
    automaticArchiveImportAllowed: false,
    missingSourceInferenceAllowed: false,
    authorityScoringAllowed: false,
    trustScoringAllowed: false,
    conflictScoringAllowed: false
  };

  const manifest = {
    componentId: "IDE-180",
    componentName: "Knowledge Navigator",
    versionArchitecture: "independent-version-v1",
    release: {
      version: RELEASE_VERSION,
      implementationPhase: "Phase 5 Authority / Evidence / Lineage",
      designFreezeVersion: "1.0.0",
      architectureSpecificationVersion: "1.0.0",
      decisionRange: "IDE-180-DECISION-001..029",
      status: "Implementation"
    },
    moduleVersions: moduleVersions,
    fileModules: fileModules,
    contractVersions: contractVersions,
    contractIds: contractIds,
    navigationTypes: navigationTypes,
    safety: safety,
    compatibility: {
      minimumIDE170Version: "1.9.2",
      requiredIDE170HandoffContractVersion: "1.0.0",
      minimumIDE190Version: "1.0.0",
      sourceContractVersion: BASELINE_VERSION,
      resolverContractVersion: BASELINE_VERSION
    },
    implementation: {
      phase: 5,
      phaseName: "Authority / Evidence / Lineage",
      phaseCount: 10,
      contractFirst: true,
      incrementalVerticalSlice: true,
      completedPhases: [1, 2, 3, 4],
      activePhase: 5,
      readOnly: true
    },
    getModuleVersion: function getModuleVersion(moduleOrFile) {
      const key = fileModules[moduleOrFile] || moduleOrFile;
      return moduleVersions[key] || null;
    },
    getContractVersion: function getContractVersion(contractKeyOrId) {
      if (contractVersions[contractKeyOrId]) return contractVersions[contractKeyOrId];
      const key = Object.keys(contractIds).find(function findKey(candidate) {
        return contractIds[candidate] === contractKeyOrId;
      });
      return key ? contractVersions[key] : null;
    },
    getContractId: function getContractId(contractKey) {
      return contractIds[contractKey] || null;
    }
  };

  global.IDE180VersionManifest = deepFreeze(manifest);
})(typeof window !== "undefined" ? window : globalThis);
