/* ============================================================
   FILE: 13_intelligence_version_manifest.js
   IDE-170 Intelligence Platform
   Release: 1.7.0
   Module: 1.0.0
   Purpose: Independent Version Architecture Contract
   Architecture Decision: IDE-170-012
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.7.0";
  const BASELINE_VERSION = "1.0.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  const moduleVersions = {
    platformCore: BASELINE_VERSION,
    capabilityRegistry: BASELINE_VERSION,
    schemaRegistry: BASELINE_VERSION,
    sourceAdapter: BASELINE_VERSION,
    sourceAdaptersRepository: BASELINE_VERSION,
    sourceAdaptersPlatform: BASELINE_VERSION,
    sourceAdapterRelationship: BASELINE_VERSION,
    canonicalModel: BASELINE_VERSION,
    repositorySnapshot: BASELINE_VERSION,
    relationshipRegistry: BASELINE_VERSION,
    evidenceGraph: BASELINE_VERSION,
    repositoryUnderstanding: BASELINE_VERSION,
    workflowUnderstanding: BASELINE_VERSION,
    understandingPipeline: BASELINE_VERSION,
    terminologyRegistry: BASELINE_VERSION,
    queryInterpreter: BASELINE_VERSION,
    queryEngine: BASELINE_VERSION,
    testDatasetRegistry: BASELINE_VERSION,
    validationAutomation: BASELINE_VERSION,
    validationEvidence: BASELINE_VERSION,
    testProcedureIntake: BASELINE_VERSION,
    testProcedureParser: BASELINE_VERSION,
    validationCompiler: BASELINE_VERSION,
    testProcedureUI: BASELINE_VERSION,
    versionValidation: BASELINE_VERSION,
    validation: BASELINE_VERSION
  };

  const fileModules = {
    "13_intelligence_platform_core.js": "platformCore",
    "13_intelligence_capability_registry.js": "capabilityRegistry",
    "13_intelligence_schema_registry.js": "schemaRegistry",
    "13_intelligence_source_adapter.js": "sourceAdapter",
    "13_intelligence_source_adapters_repository.js": "sourceAdaptersRepository",
    "13_intelligence_source_adapters_platform.js": "sourceAdaptersPlatform",
    "13_intelligence_source_adapter_relationship.js": "sourceAdapterRelationship",
    "13_intelligence_canonical_model.js": "canonicalModel",
    "13_intelligence_repository_snapshot.js": "repositorySnapshot",
    "13_intelligence_relationship_registry.js": "relationshipRegistry",
    "13_intelligence_evidence_graph.js": "evidenceGraph",
    "13_intelligence_repository_understanding.js": "repositoryUnderstanding",
    "13_intelligence_workflow_understanding.js": "workflowUnderstanding",
    "13_intelligence_understanding_pipeline.js": "understandingPipeline",
    "13_intelligence_terminology_registry.js": "terminologyRegistry",
    "13_intelligence_query_interpreter.js": "queryInterpreter",
    "13_intelligence_query_engine.js": "queryEngine",
    "13_intelligence_test_dataset_registry.js": "testDatasetRegistry",
    "13_intelligence_validation_automation.js": "validationAutomation",
    "13_intelligence_validation_evidence.js": "validationEvidence",
    "13_intelligence_test_procedure_intake.js": "testProcedureIntake",
    "13_intelligence_test_procedure_parser.js": "testProcedureParser",
    "13_intelligence_validation_compiler.js": "validationCompiler",
    "13_intelligence_test_procedure_ui.js": "testProcedureUI",
    "13_intelligence_version_validation.js": "versionValidation",
    "13_intelligence_validation.js": "validation"
  };


  const runtimeModuleKeys = {
    platformCore: "core",
    capabilityRegistry: "capabilityRegistry",
    schemaRegistry: "schemaRegistry",
    sourceAdapter: "sourceAdapterFramework",
    sourceAdaptersRepository: "repositorySourceAdapters",
    sourceAdaptersPlatform: "platformSourceAdapters",
    sourceAdapterRelationship: "relationshipSourceAdapter",
    canonicalModel: "canonicalModel",
    repositorySnapshot: "repositorySnapshot",
    relationshipRegistry: "relationshipRegistry",
    evidenceGraph: "evidenceGraph",
    repositoryUnderstanding: "repositoryUnderstanding",
    workflowUnderstanding: "workflowUnderstanding",
    understandingPipeline: "understandingPipeline",
    terminologyRegistry: "terminologyRegistry",
    queryInterpreter: "queryInterpreter",
    queryEngine: "queryEngine",
    testDatasetRegistry: "testDatasetRegistry",
    validationAutomation: "validationAutomation",
    validationEvidence: "validationEvidence",
    testProcedureIntake: "testProcedureIntake",
    testProcedureParser: "testProcedureParser",
    validationCompiler: "validationCompiler",
    testProcedureUI: "testProcedureUI",
    versionValidation: "versionValidation",
    validation: "validation"
  };

  const capabilityIds = [
    "IDE-170-CORE",
    "IDE-170-CAPABILITY-REGISTRY",
    "IDE-170-SCHEMA-REGISTRY",
    "IDE-170-SOURCE-ADAPTER-FRAMEWORK",
    "IDE-170-ADAPTER-REPOSITORY",
    "IDE-170-ADAPTER-PROJECT",
    "IDE-170-ADAPTER-FUNCTION",
    "IDE-170-ADAPTER-MODULE",
    "IDE-170-ADAPTER-ARCHITECTURE",
    "IDE-170-ADAPTER-WORKFLOW",
    "IDE-170-ADAPTER-RELATIONSHIP",
    "IDE-170-CANONICAL-MODEL",
    "IDE-170-REPOSITORY-SNAPSHOT",
    "IDE-170-RELATIONSHIP-TYPE-REGISTRY",
    "IDE-170-EVIDENCE-GRAPH",
    "IDE-170-REPOSITORY-UNDERSTANDING",
    "IDE-170-WORKFLOW-UNDERSTANDING",
    "IDE-170-UNDERSTANDING-PIPELINE",
    "IDE-170-TERMINOLOGY-REGISTRY",
    "IDE-170-QUERY-INTERPRETER",
    "IDE-170-QUERY-ENGINE",
    "IDE-170-TEST-DATASET-REGISTRY",
    "IDE-170-VALIDATION-AUTOMATION",
    "IDE-170-VALIDATION-EVIDENCE-PACKAGE",
    "IDE-170-TEST-PROCEDURE-INTAKE",
    "IDE-170-TEST-PROCEDURE-PARSER",
    "IDE-170-VALIDATION-COMPILER",
    "IDE-170-TEST-PROCEDURE-UI",
    "IDE-170-VERSION-VALIDATION",
    "IDE-170-VALIDATION",
    "IDE-170-RULE-REPOSITORY-STRUCTURE",
    "IDE-170-RULE-DIRECT-DEPENDENCY",
    "IDE-170-RULE-REVERSE-DEPENDENCY",
    "IDE-170-RULE-TRANSITIVE-DEPENDENCY",
    "IDE-170-RULE-ISOLATED-RECORD-CANDIDATE",
    "IDE-170-RULE-CIRCULAR-DEPENDENCY-CANDIDATE",
    "IDE-170-RULE-CHANGE-TRACE",
    "IDE-170-RULE-CHANGE-IMPACT-CANDIDATE",
    "IDE-170-RULE-WORKFLOW-TRACE",
    "IDE-170-RULE-WORKFLOW-STATE-SEQUENCE",
    "IDE-170-RULE-WORKFLOW-REPOSITORY-MAPPING",
    "IDE-170-RULE-CROSS-DOMAIN-PATH",
    "IDE-170-RULE-INCOMPLETE-WORKFLOW-CANDIDATE",
    "IDE-170-RULE-EXECUTION-WITHOUT-APPROVAL-CANDIDATE",
    "IDE-170-RULE-CHANGE-WITHOUT-VALIDATION-CANDIDATE",
    "IDE-170-RULE-ROLLBACK-PATTERN-CANDIDATE"
  ];

  const capabilityVersions = capabilityIds.reduce(function buildCapabilityMap(out, id) {
    out[id] = BASELINE_VERSION;
    return out;
  }, {});

  const schemaIds = [
    "IDE-170-SCHEMA-CAPABILITY-DEFINITION",
    "IDE-170-SCHEMA-INTELLIGENCE-SESSION",
    "IDE-170-SCHEMA-AUDIT-RECORD",
    "IDE-170-SCHEMA-VALIDATION-RESULT",
    "IDE-170-SCHEMA-SOURCE-ADAPTER-DEFINITION",
    "IDE-170-SCHEMA-SOURCE-RECORD",
    "IDE-170-SCHEMA-SOURCE-INTAKE",
    "IDE-170-SCHEMA-CANONICAL-RECORD",
    "IDE-170-SCHEMA-CANONICAL-SNAPSHOT",
    "IDE-170-SCHEMA-REPOSITORY-CHANGE",
    "IDE-170-SCHEMA-REPOSITORY-SNAPSHOT",
    "IDE-170-SCHEMA-RELATIONSHIP-TYPE",
    "IDE-170-SCHEMA-RELATIONSHIP-EDGE",
    "IDE-170-SCHEMA-EVIDENCE-GRAPH-SNAPSHOT",
    "IDE-170-SCHEMA-TEST-DATASET",
    "IDE-170-SCHEMA-TEST-CASE",
    "IDE-170-SCHEMA-TEST-PROCEDURE",
    "IDE-170-SCHEMA-PARSED-TEST-PROCEDURE",
    "IDE-170-SCHEMA-VALIDATION-DATASET-CANDIDATE",
    "IDE-170-SCHEMA-OWNER-SELECTION",
    "IDE-170-SCHEMA-VALIDATION-RUN",
    "IDE-170-SCHEMA-CASE-RESULT",
    "IDE-170-SCHEMA-VALIDATION-EVIDENCE-MANIFEST",
    "IDE-170-SCHEMA-UNDERSTANDING-RESULT",
    "IDE-170-SCHEMA-TERMINOLOGY-RECORD",
    "IDE-170-SCHEMA-TYPED-QUERY",
    "IDE-170-SCHEMA-QUERY-RESULT",
    "IDE-170-SCHEMA-EXPLAINABLE-INSIGHT-ENVELOPE"
  ];

  const schemaVersions = schemaIds.reduce(function buildSchemaMap(out, id) {
    out[id] = BASELINE_VERSION;
    return out;
  }, {});

  const artifactVersions = {
    sourceIntake: BASELINE_VERSION,
    canonicalRecord: BASELINE_VERSION,
    canonicalSnapshot: BASELINE_VERSION,
    repositoryChange: BASELINE_VERSION,
    repositorySnapshot: BASELINE_VERSION,
    relationshipEdge: BASELINE_VERSION,
    evidenceGraph: BASELINE_VERSION,
    understandingResult: BASELINE_VERSION,
    typedQuery: BASELINE_VERSION,
    queryResult: BASELINE_VERSION,
    explainableInsightEnvelope: BASELINE_VERSION,
    validationRun: BASELINE_VERSION,
    caseResult: BASELINE_VERSION,
    validationEvidenceManifest: BASELINE_VERSION
  };

  const datasetVersions = {
    phase1Foundation: BASELINE_VERSION,
    phase2SourceCanonical: BASELINE_VERSION,
    phase3RepositorySnapshot: BASELINE_VERSION,
    validationAutomationFoundation: BASELINE_VERSION,
    phase4EvidenceGraph: BASELINE_VERSION,
    phase5Understanding: BASELINE_VERSION,
    phase6QueryExplanation: BASELINE_VERSION,
    versionArchitecture: BASELINE_VERSION
  };

  const manifest = {
    componentId: "IDE-170",
    versionArchitecture: "independent-version-v1",
    manifestContractVersion: BASELINE_VERSION,
    release: {
      version: RELEASE_VERSION,
      implementationPhase: "Phase 6 Insight, Query and Explanation",
      designFreezeVersion: "1.0.0",
      architectureDecisionVersion: "1.0.0",
      architectureDecisionId: "IDE-170-007"
    },
    moduleVersions: moduleVersions,
    fileModules: fileModules,
    runtimeModuleKeys: runtimeModuleKeys,
    capabilityVersions: capabilityVersions,
    schemaVersions: schemaVersions,
    artifactVersions: artifactVersions,
    datasetVersions: datasetVersions,
    contractVersions: {
      coreApi: BASELINE_VERSION,
      staticScriptManifest: "2.0.0"
    },
    definitionVersions: {
      relationshipType: BASELINE_VERSION
    },
    compatibility: {
      internalBaselineVersion: BASELINE_VERSION,
      minimumInternalCapabilityVersion: BASELINE_VERSION,
      legacyVersionArchitecture: "release-coupled-version",
      migrationBoundaryRelease: "1.6.1"
    },
    getModuleVersion: function getModuleVersion(moduleOrFile) {
      const key = fileModules[moduleOrFile] || moduleOrFile;
      return moduleVersions[key] || null;
    },
    getCapabilityVersion: function getCapabilityVersion(capabilityId) {
      return capabilityVersions[capabilityId] || null;
    },
    getSchemaVersion: function getSchemaVersion(schemaId) {
      return schemaVersions[schemaId] || null;
    },
    getArtifactVersion: function getArtifactVersion(artifactType) {
      return artifactVersions[artifactType] || null;
    },
    getDatasetVersion: function getDatasetVersion(datasetType) {
      return datasetVersions[datasetType] || null;
    },
    getMinimumInternalVersion: function getMinimumInternalVersion() {
      return BASELINE_VERSION;
    }
  };

  global.IDE170VersionManifest = deepFreeze(manifest);
})(typeof window !== "undefined" ? window : globalThis);
