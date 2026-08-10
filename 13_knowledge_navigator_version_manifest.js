/* ============================================================
   FILE: 13_knowledge_navigator_version_manifest.js
   IDE-180 Knowledge Navigator
   Release: 1.1.0
   Phase 2: IDE-170 Package Intake / Provider Foundation
   Design Freeze: v1.0.0 / 2026-08-10
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.1.0";
  const BASELINE_VERSION = "1.0.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  const moduleVersions = {
    core: "1.1.0",
    contracts: BASELINE_VERSION,
    registry: BASELINE_VERSION,
    intelligenceProvider: BASELINE_VERSION,
    validation: "1.0.1",
    phase2Validation: BASELINE_VERSION
  };

  const fileModules = {
    "13_knowledge_navigator_core.js": "core",
    "13_knowledge_navigator_contracts.js": "contracts",
    "13_knowledge_navigator_registry.js": "registry",
    "13_knowledge_navigator_intelligence_provider.js": "intelligenceProvider",
    "13_knowledge_navigator_validation.js": "validation",
    "13_knowledge_navigator_phase2_validation.js": "phase2Validation"
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
      implementationPhase: "Phase 2 IDE-170 Package Intake / Provider Foundation",
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
      phase: 2,
      phaseName: "IDE-170 Package Intake / Provider Foundation",
      phaseCount: 10,
      contractFirst: true,
      incrementalVerticalSlice: true,
      completedPhases: [1],
      activePhase: 2,
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
