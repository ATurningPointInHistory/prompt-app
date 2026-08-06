/* ============================================================
   FILE: 13_intelligence_validation.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Phase: 4 Evidence Graph - Independent Validation Gate
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Validation blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.6.0";
  const VALIDATION_CAPABILITY_ID = "IDE-170-VALIDATION";

  function buildCheck(name, passed, detail, group, severity) {
    return {
      name: name,
      passed: passed === true,
      detail: internal.text(detail, ""),
      group: internal.text(group, "General"),
      severity: internal.text(severity, "High")
    };
  }

  function summarizeChecks(checks) {
    const groups = {};
    checks.forEach(function groupCheck(check) {
      if (!groups[check.group]) {
        groups[check.group] = { passed: 0, failed: 0, total: 0 };
      }
      groups[check.group].total += 1;
      if (check.passed) groups[check.group].passed += 1;
      else groups[check.group].failed += 1;
    });

    const passed = checks.filter(function countPassed(check) {
      return check.passed;
    }).length;
    const total = checks.length;
    return {
      passed: passed,
      failed: total - passed,
      total: total,
      health: total ? Number(((passed / total) * 100).toFixed(2)) : null,
      groups: groups
    };
  }

  function registerValidationCapability() {
    if (state.capabilities.has(VALIDATION_CAPABILITY_ID)) {
      return internal.buildResult(true, "VALIDATION_CAPABILITY_EXISTS", "Ready", {
        capability: namespace.getCapability(VALIDATION_CAPABILITY_ID)
      });
    }

    return namespace.registerCapability({
      capabilityId: VALIDATION_CAPABILITY_ID,
      name: "Independent Intelligence Validation Gate",
      version: VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      description: "Validates Phase 1-4, including the Immutable Layered Evidence Graph, independently from future Understanding output.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: "1.0.0", optional: false },
        { capabilityId: "IDE-170-CAPABILITY-REGISTRY", minimumVersion: "1.0.0", optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: "1.0.0", optional: false },
        { capabilityId: "IDE-170-SOURCE-ADAPTER-FRAMEWORK", minimumVersion: "1.0.0", optional: false },
        { capabilityId: "IDE-170-CANONICAL-MODEL", minimumVersion: "1.2.0", optional: false },
        { capabilityId: "IDE-170-REPOSITORY-SNAPSHOT", minimumVersion: "1.2.0", optional: false },
        { capabilityId: "IDE-170-TEST-PROCEDURE-INTAKE", minimumVersion: "1.6.0", optional: false },
        { capabilityId: "IDE-170-TEST-PROCEDURE-PARSER", minimumVersion: "1.6.0", optional: false },
        { capabilityId: "IDE-170-VALIDATION-COMPILER", minimumVersion: "1.6.0", optional: false },
        { capabilityId: "IDE-170-RELATIONSHIP-TYPE-REGISTRY", minimumVersion: "1.6.0", optional: false },
        { capabilityId: "IDE-170-EVIDENCE-GRAPH", minimumVersion: "1.6.0", optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-VALIDATION-RESULT"],
      provides: ["Core Validation", "Source Intake Validation", "Canonical Model Validation", "Repository Snapshot Validation", "Snapshot Chain Validation", "Release Gate", "Regression Validation"],
      source: "built-in"
    });
  }

  function runValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    const warnings = [];
    const validationArtifacts = {
      capabilityIds: [],
      schemaIds: [],
      sessionIds: [],
      adapterIds: [],
      intakeIds: [],
      snapshotIds: [],
      repositorySnapshotIds: [],
      evidenceGraphIds: []
    };

    function check(name, passed, detail, group, severity) {
      checks.push(buildCheck(name, passed, detail, group, severity));
    }

    function cleanupValidationArtifacts() {
      validationArtifacts.sessionIds.forEach(function removeSession(sessionId) {
        if (typeof internal.removeSessionForValidation === "function") {
          internal.removeSessionForValidation(sessionId);
        }
      });
      validationArtifacts.capabilityIds.forEach(function removeCapability(capabilityId) {
        if (typeof internal.removeCapabilityForValidation === "function") {
          internal.removeCapabilityForValidation(capabilityId);
        }
      });
      validationArtifacts.evidenceGraphIds.forEach(function removeEvidenceGraph(graphId) {
        if (typeof internal.removeEvidenceGraphForValidation === "function") {
          internal.removeEvidenceGraphForValidation(graphId);
        }
      });
      validationArtifacts.repositorySnapshotIds.forEach(function removeRepositorySnapshot(snapshotId) {
        if (typeof internal.removeRepositorySnapshotForValidation === "function") {
          internal.removeRepositorySnapshotForValidation(snapshotId);
        }
      });
      validationArtifacts.snapshotIds.forEach(function removeSnapshot(snapshotId) {
        if (typeof internal.removeCanonicalSnapshotForValidation === "function") {
          internal.removeCanonicalSnapshotForValidation(snapshotId);
        }
      });
      validationArtifacts.intakeIds.forEach(function removeIntake(intakeId) {
        if (typeof internal.removeSourceIntakeForValidation === "function") {
          internal.removeSourceIntakeForValidation(intakeId);
        }
      });
      validationArtifacts.adapterIds.forEach(function removeAdapter(adapterId) {
        if (typeof internal.removeSourceAdapterForValidation === "function") {
          internal.removeSourceAdapterForValidation(adapterId);
        }
      });
      validationArtifacts.schemaIds.forEach(function removeSchema(schemaId) {
        if (typeof internal.removeSchemaForValidation === "function") {
          internal.removeSchemaForValidation(schemaId);
        }
      });
      internal.touch();
    }

    try {
      const initialization = namespace.initialize({
        actor: "IDE-170 Validation",
        registerIntegration: true
      });
      check(
        "Core initialization succeeds",
        initialization.ok === true,
        initialization.code,
        "Foundation"
      );

      const duplicateInitialization = namespace.initialize({
        actor: "IDE-170 Validation",
        registerIntegration: true
      });
      check(
        "Duplicate initialization is protected",
        duplicateInitialization.ok === true && duplicateInitialization.code === "IDE170_ALREADY_INITIALIZED",
        duplicateInitialization.code,
        "Foundation"
      );

      const dependencyStatus = namespace.getDependencyStatus();
      check(
        "Required Phase 4 Evidence Graph modules are loaded",
        dependencyStatus.requiredReady === true,
        JSON.stringify(dependencyStatus.required),
        "Foundation"
      );
      check(
        "Core version can be retrieved",
        namespace.getStatus().version === VERSION,
        namespace.getStatus().version,
        "Foundation"
      );
      check(
        "Global entry is available",
        global.IDE170Intelligence === namespace,
        "window.IDE170Intelligence",
        "Foundation"
      );
      check(
        "Initial public API is available",
        [
          "initialize",
          "getStatus",
          "getCapabilities",
          "getCapability",
          "registerCapability",
          "validateCapability",
          "startSession",
          "getSession",
          "cancelSession",
          "freezeSession",
          "getAuditRecords",
          "validateSourceAdapter",
          "registerSourceAdapter",
          "getSourceAdapters",
          "captureSources",
          "getSourceIntake",
          "createCanonicalRecord",
          "buildCanonicalSnapshot",
          "getCanonicalSnapshot",
          "validateCanonicalSnapshot",
          "buildRepositoryBaseline",
          "buildRepositoryIncrement",
          "getRepositorySnapshot",
          "materializeRepositoryState",
          "validateRepositorySnapshot",
          "validateSnapshotChain",
          "calculateSHA256",
          "getRelationshipTypes",
          "buildEvidenceGraph",
          "getEvidenceGraph",
          "validateEvidenceGraph",
          "getRelationshipPath",
          "runEvidenceGraphPhaseValidation",
          "importTestProcedure",
          "parseTestProcedure",
          "compileTestProcedure",
          "updateProcedureStepSelection",
          "approveValidationDatasetCandidate",
          "runImportedTestProcedure",
          "runCurrentPhaseValidation",
          "runTestProcedureCompilerValidation",
          "retryEvidenceDownload",
          "runValidation",
          "getReleaseStatus"
        ].every(function hasApi(apiName) {
          return typeof namespace[apiName] === "function";
        }),
        "Phase 1-4 and Decision 011 v1.1.0 APIs",
        "Foundation"
      );

      const validationCapability = registerValidationCapability();
      check(
        "Validation Capability is registered",
        validationCapability.ok === true,
        validationCapability.code,
        "Capability Registry"
      );

      const testCapabilityId = "IDE-170-VALIDATION-CAPABILITY";
      const validCapabilityDefinition = {
        capabilityId: testCapabilityId,
        name: "Validation Test Capability",
        version: "1.2.3",
        type: "Service",
        status: "Experimental",
        owner: "IDE-170 Validation",
        description: "Temporary validation Capability.",
        dependencies: [
          { capabilityId: "IDE-170-CORE", minimumVersion: "1.0.0", optional: false }
        ],
        schemas: [],
        provides: ["Validation Test"],
        source: "validation"
      };

      const capabilityDefinitionValidation = namespace.validateCapability(validCapabilityDefinition);
      check(
        "Valid Capability definition passes",
        capabilityDefinitionValidation.valid === true,
        "passed=" + capabilityDefinitionValidation.passed + "/" + capabilityDefinitionValidation.total,
        "Capability Registry"
      );

      const capabilityRegistration = namespace.registerCapability(validCapabilityDefinition);
      if (capabilityRegistration.ok) validationArtifacts.capabilityIds.push(testCapabilityId);
      check(
        "Capability can be registered",
        capabilityRegistration.ok === true,
        capabilityRegistration.code,
        "Capability Registry"
      );

      const duplicateCapability = namespace.registerCapability(validCapabilityDefinition);
      check(
        "Duplicate Capability is blocked",
        duplicateCapability.ok === false && duplicateCapability.code === "CAPABILITY_DUPLICATE",
        duplicateCapability.code,
        "Capability Registry"
      );

      const invalidCapability = namespace.registerCapability({
        capabilityId: "invalid capability",
        name: "",
        version: "latest",
        type: "Unknown",
        status: "Unknown",
        owner: ""
      });
      check(
        "Invalid Capability is blocked",
        invalidCapability.ok === false && invalidCapability.code === "CAPABILITY_INVALID",
        invalidCapability.code,
        "Capability Registry"
      );

      const retrievedCapability = namespace.getCapability(testCapabilityId);
      check(
        "Capability Version can be retrieved",
        Boolean(retrievedCapability && retrievedCapability.version === "1.2.3"),
        retrievedCapability && retrievedCapability.version,
        "Capability Registry"
      );
      check(
        "Capability dependency status can be checked",
        Boolean(retrievedCapability && retrievedCapability.dependencyStatus && retrievedCapability.dependencyStatus.ready === true),
        JSON.stringify(retrievedCapability && retrievedCapability.dependencyStatus),
        "Capability Registry"
      );

      const missingDependencyCapability = namespace.registerCapability({
        capabilityId: "IDE-170-MISSING-DEPENDENCY-TEST",
        name: "Missing Dependency Test",
        version: "1.0.0",
        type: "Service",
        status: "Experimental",
        owner: "IDE-170 Validation",
        dependencies: [
          { capabilityId: "IDE-999-NOT-REGISTERED", minimumVersion: "1.0.0", optional: false }
        ]
      });
      check(
        "Missing Capability dependency is blocked",
        missingDependencyCapability.ok === false && missingDependencyCapability.code === "CAPABILITY_DEPENDENCY_INVALID",
        missingDependencyCapability.code,
        "Capability Registry"
      );

      const schemaIds = namespace.getSchemas().map(function mapSchema(schema) {
        return schema.schemaId;
      });
      check(
        "Built-in Schemas are registered",
        [
          "IDE-170-SCHEMA-CAPABILITY-DEFINITION",
          "IDE-170-SCHEMA-INTELLIGENCE-SESSION",
          "IDE-170-SCHEMA-AUDIT-RECORD",
          "IDE-170-SCHEMA-VALIDATION-RESULT"
        ].every(function hasSchema(schemaId) {
          return schemaIds.includes(schemaId);
        }),
        "count=" + schemaIds.length,
        "Schema Registry"
      );

      const testSchemaId = "IDE-170-SCHEMA-VALIDATION-TEMP";
      const testSchemaDefinition = {
        schemaId: testSchemaId,
        name: "Validation Temporary Schema",
        version: "1.0.0",
        type: "object",
        required: ["id", "version"],
        properties: {
          id: { type: "string", minLength: 1 },
          version: { type: "string", format: "semver" }
        },
        additionalProperties: false,
        owner: "IDE-170 Validation",
        source: "validation"
      };

      const schemaDefinitionValidation = namespace.validateSchemaDefinition(testSchemaDefinition);
      check(
        "Valid Schema definition passes",
        schemaDefinitionValidation.valid === true,
        "passed=" + schemaDefinitionValidation.passed + "/" + schemaDefinitionValidation.total,
        "Schema Registry"
      );

      const schemaRegistration = namespace.registerSchema(testSchemaDefinition);
      if (schemaRegistration.ok) validationArtifacts.schemaIds.push(testSchemaId);
      check(
        "Schema can be registered",
        schemaRegistration.ok === true,
        schemaRegistration.code,
        "Schema Registry"
      );

      const duplicateSchema = namespace.registerSchema(testSchemaDefinition);
      check(
        "Duplicate Schema is blocked",
        duplicateSchema.ok === false && duplicateSchema.code === "SCHEMA_DUPLICATE",
        duplicateSchema.code,
        "Schema Registry"
      );

      const invalidSchema = namespace.registerSchema({
        schemaId: "invalid schema",
        name: "",
        version: "1",
        type: "unknown"
      });
      check(
        "Invalid Schema is blocked",
        invalidSchema.ok === false && invalidSchema.code === "SCHEMA_INVALID",
        invalidSchema.code,
        "Schema Registry"
      );

      const schemaPass = namespace.validateAgainstSchema(testSchemaId, {
        id: "VALID",
        version: "1.0.0"
      });
      const schemaFail = namespace.validateAgainstSchema(testSchemaId, {
        id: "",
        version: "latest",
        extra: true
      });
      check(
        "Registered Schema validates a valid record",
        schemaPass.valid === true,
        "errors=" + schemaPass.errors.length,
        "Schema Registry"
      );
      check(
        "Registered Schema rejects an invalid record",
        schemaFail.valid === false && schemaFail.errors.length >= 2,
        "errors=" + schemaFail.errors.length,
        "Schema Registry"
      );

      const sessionOneResult = namespace.startSession({
        purpose: "IDE-170 Phase 1 Validation Session 1",
        requiredCapabilities: [testCapabilityId],
        actor: "IDE-170 Validation",
        metadata: { validation: true }
      });
      const sessionTwoResult = namespace.startSession({
        purpose: "IDE-170 Phase 1 Validation Session 2",
        requiredCapabilities: [testCapabilityId],
        actor: "IDE-170 Validation",
        metadata: { validation: true }
      });

      const sessionOne = sessionOneResult.data && sessionOneResult.data.session;
      const sessionTwo = sessionTwoResult.data && sessionTwoResult.data.session;
      if (sessionOne && sessionOne.sessionId) validationArtifacts.sessionIds.push(sessionOne.sessionId);
      if (sessionTwo && sessionTwo.sessionId) validationArtifacts.sessionIds.push(sessionTwo.sessionId);

      check(
        "Session can be created",
        sessionOneResult.ok === true && sessionOne && sessionOne.state === "Active",
        sessionOneResult.code,
        "Session Lifecycle"
      );
      check(
        "Session ID is unique",
        Boolean(sessionOne && sessionTwo && sessionOne.sessionId !== sessionTwo.sessionId),
        (sessionOne && sessionOne.sessionId) + " / " + (sessionTwo && sessionTwo.sessionId),
        "Session Lifecycle"
      );

      const duplicateSessionId = sessionOne && namespace.startSession({
        sessionId: sessionOne.sessionId,
        purpose: "Duplicate Session Test",
        actor: "IDE-170 Validation"
      });
      check(
        "Duplicate Session ID is blocked",
        Boolean(duplicateSessionId && duplicateSessionId.ok === false && duplicateSessionId.code === "SESSION_ID_DUPLICATE"),
        duplicateSessionId && duplicateSessionId.code,
        "Session Lifecycle"
      );

      const sessionSchemaValidation = sessionOne
        ? namespace.validateAgainstSchema("IDE-170-SCHEMA-INTELLIGENCE-SESSION", sessionOne)
        : { valid: false, errors: [{ code: "SESSION_NOT_CREATED" }] };
      check(
        "Session conforms to the registered Session Schema",
        sessionSchemaValidation.valid === true,
        "errors=" + sessionSchemaValidation.errors.length,
        "Session Lifecycle"
      );

      const cancellation = sessionOne
        ? namespace.cancelSession(sessionOne.sessionId, {
            actor: "IDE-170 Validation",
            reason: "Cancellation Validation"
          })
        : { ok: false, code: "SESSION_NOT_CREATED" };
      check(
        "Session cancellation succeeds",
        cancellation.ok === true && cancellation.status === "Cancelled",
        cancellation.code,
        "Session Lifecycle"
      );

      const freezeCancelled = sessionOne
        ? namespace.freezeSession(sessionOne.sessionId, {
            actor: "IDE-170 Validation",
            reason: "Freeze Validation"
          })
        : { ok: false, code: "SESSION_NOT_CREATED" };
      check(
        "Cancelled Session can be frozen",
        freezeCancelled.ok === true && freezeCancelled.status === "Frozen",
        freezeCancelled.code,
        "Session Lifecycle"
      );

      const frozenMutation = sessionOne
        ? namespace.cancelSession(sessionOne.sessionId, {
            actor: "IDE-170 Validation",
            reason: "Frozen Mutation Test"
          })
        : { ok: true, code: "SESSION_NOT_CREATED" };
      check(
        "Frozen Session cannot be modified",
        frozenMutation.ok === false && frozenMutation.code === "SESSION_FROZEN",
        frozenMutation.code,
        "Session Lifecycle"
      );

      const freezeActive = sessionTwo
        ? namespace.freezeSession(sessionTwo.sessionId, {
            actor: "IDE-170 Validation",
            reason: "Active Freeze Validation"
          })
        : { ok: false, code: "SESSION_NOT_CREATED" };
      check(
        "Active Session can be frozen",
        freezeActive.ok === true && freezeActive.status === "Frozen",
        freezeActive.code,
        "Session Lifecycle"
      );

      check(
        "Invalid Session transition is rejected",
        internal.isSessionTransitionAllowed("Frozen", "Active") === false &&
          internal.isSessionTransitionAllowed("Active", "Created") === false,
        "Frozen->Active=false / Active->Created=false",
        "Session Lifecycle"
      );

      const auditRecords = namespace.getAuditRecords({ limit: 500 });
      const sessionAudits = sessionOne
        ? namespace.getAuditRecords({ sessionId: sessionOne.sessionId, limit: 100 })
        : [];
      check(
        "Basic Audit Records are generated",
        auditRecords.length > 0 && sessionAudits.length >= 3,
        "all=" + auditRecords.length + ", session=" + sessionAudits.length,
        "Audit"
      );
      check(
        "Audit Records are marked immutable",
        auditRecords.every(function immutableAudit(record) {
          return record.immutable === true;
        }),
        "count=" + auditRecords.length,
        "Audit"
      );

      const auditSchemaValidation = auditRecords.length
        ? namespace.validateAgainstSchema("IDE-170-SCHEMA-AUDIT-RECORD", auditRecords[auditRecords.length - 1])
        : { valid: false, errors: [{ code: "AUDIT_NOT_FOUND" }] };
      check(
        "Audit Record conforms to the registered Audit Schema",
        auditSchemaValidation.valid === true,
        "errors=" + auditSchemaValidation.errors.length,
        "Audit"
      );

      const status = namespace.getStatus();
      check(
        "Status API is consistent",
        status.componentId === "IDE-170" &&
          status.version === VERSION &&
          status.initialized === true &&
          status.ready === true &&
          status.capabilityCount === state.capabilities.size &&
          status.schemaCount === state.schemas.size,
        JSON.stringify({
          componentId: status.componentId,
          version: status.version,
          initialized: status.initialized,
          ready: status.ready,
          capabilityCount: status.capabilityCount,
          schemaCount: status.schemaCount
        }),
        "Status and Release"
      );
      check(
        "Status API does not execute Validation",
        !/runValidation\s*\(/.test(namespace.getStatus.toString()),
        "getStatus is lightweight",
        "Status and Release"
      );
      check(
        "Phase 5 Repository and Workflow Understanding is implemented",
        status.phase4Started === true &&
          status.phase4Complete === true &&
          status.phase5Started === true &&
          status.phase5Complete === true &&
          status.phase6Started === false &&
          status.progress === 62.5,
        JSON.stringify({
          phase4Started: status.phase4Started,
          phase4Complete: status.phase4Complete,
          phase5Started: status.phase5Started,
          phase5Complete: status.phase5Complete,
          phase6Started: status.phase6Started,
          progress: status.progress
        }),
        "Status and Release"
      );
      check(
        "Phase 6 remains not started",
        status.phase6Started === false,
        String(status.phase6Started),
        "Status and Release"
      );
      check(
        "Repository direct mutation remains prohibited",
        status.directRepositoryMutationAllowed === false,
        String(status.directRepositoryMutationAllowed),
        "Safety"
      );
      check(
        "Automatic Workflow execution remains prohibited",
        status.automaticWorkflowExecutionAllowed === false,
        String(status.automaticWorkflowExecutionAllowed),
        "Safety"
      );
      check(
        "GitHub automatic reflection remains prohibited",
        status.githubAutomaticReflectionAllowed === false,
        String(status.githubAutomaticReflectionAllowed),
        "Safety"
      );

      const globalApiChecks = [
        ["Project ZIP save API", "saveProjectPackage"],
        ["Static Script Manifest build API", "buildProjectIndexFromStaticManifest"],
        ["IDE-160 Status API", "getAIDevelopmentWorkflowStatus"],
        ["IDE-160 Validation API", "validateAIDevelopmentWorkflow"],
        ["Development Status Registry API", "registerDevelopmentStatus"],
        ["IDE Registry API", "registerIdeComponent"],
        ["Dashboard Registry API", "registerDevelopmentDashboardModule"]
      ];
      globalApiChecks.forEach(function checkGlobalApi(item) {
        check(
          item[0] + " remains available",
          typeof global[item[1]] === "function",
          typeof global[item[1]],
          "Existing Global API Regression"
        );
      });

      if (typeof global.getAIDevelopmentWorkflowStatus === "function") {
        const ide160Status = global.getAIDevelopmentWorkflowStatus();
        const requiredIde160Modules = [
          "core", "storage", "state", "planning", "adapter", "execution",
          "decision", "approval", "monitoring", "package", "completion",
          "integration", "validation"
        ];
        check(
          "IDE-160 runtime is fully Ready",
          Boolean(
            ide160Status &&
            ide160Status.available === true &&
            ide160Status.initialized === true &&
            ide160Status.ready === true &&
            ide160Status.status === "Ready" &&
            Number(ide160Status.progress) === 100 &&
            ide160Status.modules &&
            requiredIde160Modules.every(function moduleReady(moduleId) {
              return ide160Status.modules[moduleId] === true;
            })
          ),
          JSON.stringify(ide160Status),
          "Existing Global API Regression"
        );
      }

      if (typeof global.getDevelopmentStatus === "function") {
        const developmentStatus = global.getDevelopmentStatus("IDE-170");
        check(
          "Development Status Registry resolves IDE-170",
          Boolean(developmentStatus && (developmentStatus.id === "IDE-170" || developmentStatus.componentId === "IDE-170")),
          JSON.stringify(developmentStatus),
          "Application Integration"
        );
      } else {
        warnings.push("Development Status Registry resolution was not executed in standalone mode.");
        check(
          "Development Status Registry is optional in standalone mode",
          true,
          "Standalone",
          "Application Integration",
          "Low"
        );
      }

      if (typeof global.getIdeComponent === "function") {
        const ideComponent = global.getIdeComponent("IDE-170");
        check(
          "IDE Registry resolves IDE-170",
          Boolean(ideComponent && ideComponent.id === "IDE-170"),
          JSON.stringify(ideComponent),
          "Application Integration"
        );
      } else {
        warnings.push("IDE Registry resolution was not executed in standalone mode.");
        check(
          "IDE Registry is optional in standalone mode",
          true,
          "Standalone",
          "Application Integration",
          "Low"
        );
      }

      if (typeof global.getDevelopmentDashboardModuleRegistry === "function") {
        const dashboardDefinitions = global.getDevelopmentDashboardModuleRegistry();
        check(
          "Dashboard Registry resolves IDE-170",
          Array.isArray(dashboardDefinitions) && dashboardDefinitions.some(function findDefinition(item) {
            return item.id === "IDE-170";
          }),
          "count=" + (Array.isArray(dashboardDefinitions) ? dashboardDefinitions.length : 0),
          "Application Integration"
        );
      } else {
        warnings.push("Dashboard Registry resolution was not executed in standalone mode.");
        check(
          "Dashboard Registry is optional in standalone mode",
          true,
          "Standalone",
          "Application Integration",
          "Low"
        );
      }

      check(
        "Source Adapter Framework module is loaded",
        Boolean(namespace.modules.sourceAdapterFramework && namespace.modules.sourceAdapterFramework.status === "Ready"),
        JSON.stringify(namespace.modules.sourceAdapterFramework),
        "Phase 2 Foundation"
      );
      check(
        "Repository Source Adapter module is loaded",
        Boolean(namespace.modules.repositorySourceAdapters && namespace.modules.repositorySourceAdapters.status === "Ready"),
        JSON.stringify(namespace.modules.repositorySourceAdapters),
        "Phase 2 Foundation"
      );
      check(
        "Platform Source Adapter module is loaded",
        Boolean(namespace.modules.platformSourceAdapters && namespace.modules.platformSourceAdapters.status === "Ready"),
        JSON.stringify(namespace.modules.platformSourceAdapters),
        "Phase 2 Foundation"
      );
      check(
        "Canonical Model module is loaded",
        Boolean(namespace.modules.canonicalModel && namespace.modules.canonicalModel.status === "Ready"),
        JSON.stringify(namespace.modules.canonicalModel),
        "Phase 2 Foundation"
      );

      const builtInAdapterIds = [
        "IDE-170-ADAPTER-REPOSITORY",
        "IDE-170-ADAPTER-PROJECT",
        "IDE-170-ADAPTER-FUNCTION",
        "IDE-170-ADAPTER-MODULE",
        "IDE-170-ADAPTER-ARCHITECTURE",
        "IDE-170-ADAPTER-WORKFLOW",
        "IDE-170-ADAPTER-RELATIONSHIP"
      ];
      const builtInAdapters = namespace.getSourceAdapters({});
      check(
        "Seven official Source Adapters are registered",
        builtInAdapterIds.every(function hasAdapter(adapterId) {
          return Boolean(namespace.getSourceAdapter(adapterId));
        }),
        "count=" + builtInAdapters.length,
        "Source Adapter Registry"
      );
      check(
        "Source Adapter Capabilities are governed",
        builtInAdapterIds.every(function governed(adapterId) {
          const adapter = namespace.getSourceAdapter(adapterId);
          return adapter && namespace.getCapability(adapter.capabilityId);
        }),
        "Governed Capability Registry",
        "Source Adapter Registry"
      );
      const frameworkDependencyStatus = namespace.checkCapabilityDependencies(
        "IDE-170-SOURCE-ADAPTER-FRAMEWORK"
      );
      check(
        "Source Adapter Framework dependencies are ready",
        frameworkDependencyStatus.ready === true,
        JSON.stringify(frameworkDependencyStatus),
        "Source Adapter Registry"
      );
      const phase2SchemaIds = [
        "IDE-170-SCHEMA-SOURCE-ADAPTER-DEFINITION",
        "IDE-170-SCHEMA-SOURCE-RECORD",
        "IDE-170-SCHEMA-SOURCE-INTAKE",
        "IDE-170-SCHEMA-CANONICAL-RECORD",
        "IDE-170-SCHEMA-CANONICAL-SNAPSHOT"
      ];
      check(
        "Phase 2 Schemas are registered",
        phase2SchemaIds.every(function hasSchema(schemaId) {
          return Boolean(namespace.getSchema(schemaId));
        }),
        phase2SchemaIds.join(", "),
        "Phase 2 Schema"
      );

      const testAdapterId = "IDE-170-ADAPTER-VALIDATION-SOURCE";
      const sourceFixture = [
        {
          recordType: "project",
          sourceType: "validation-source",
          sourceId: "project:validation",
          sourceVersion: "1.0.0",
          identity: {
            sourceId: "project:validation",
            name: "Validation Project",
            qualifiedName: "Validation Project",
            aliases: []
          },
          classification: {
            domain: "repository",
            category: "project",
            subtype: "test",
            lifecycle: "Active"
          },
          payload: {
            name: "Validation Project",
            version: "1.0.0"
          },
          metadata: { fixture: true },
          quality: { missingFields: [], warnings: [], errors: [] }
        },
        {
          recordType: "file",
          sourceType: "validation-source",
          sourceId: "src/unchanged.js",
          sourceVersion: "1.0.0",
          identity: {
            sourceId: "src/unchanged.js",
            name: "unchanged.js",
            qualifiedName: "src/unchanged.js",
            aliases: []
          },
          classification: {
            domain: "repository",
            category: "file",
            subtype: "js",
            lifecycle: "Active"
          },
          payload: {
            path: "src/unchanged.js",
            fileName: "unchanged.js",
            fileType: "js",
            content: "function unchangedFixture() { return true; }"
          },
          metadata: { fixture: true },
          quality: { missingFields: [], warnings: [], errors: [] }
        },
        {
          recordType: "file",
          sourceType: "validation-source",
          sourceId: "src/modified.js",
          sourceVersion: "1.0.0",
          identity: {
            sourceId: "src/modified.js",
            name: "modified.js",
            qualifiedName: "src/modified.js",
            aliases: []
          },
          classification: {
            domain: "repository",
            category: "file",
            subtype: "js",
            lifecycle: "Active"
          },
          payload: {
            path: "src/modified.js",
            fileName: "modified.js",
            fileType: "js",
            content: "function modifiedFixture() { return 1; }"
          },
          metadata: { fixture: true },
          quality: { missingFields: [], warnings: [], errors: [] }
        },
        {
          recordType: "file",
          sourceType: "validation-source",
          sourceId: "src/rename-old.js",
          sourceVersion: "1.0.0",
          identity: {
            sourceId: "src/rename-old.js",
            name: "rename-old.js",
            qualifiedName: "src/rename-old.js",
            aliases: []
          },
          classification: {
            domain: "repository",
            category: "file",
            subtype: "js",
            lifecycle: "Active"
          },
          payload: {
            path: "src/rename-old.js",
            fileName: "rename-old.js",
            fileType: "js",
            content: "function renameFixture() { return 'same'; }"
          },
          metadata: { fixture: true },
          quality: { missingFields: [], warnings: [], errors: [] }
        }
      ];
      const sourceFixtureBefore = JSON.stringify(sourceFixture);
      const validAdapterDefinition = {
        adapterId: testAdapterId,
        capabilityId: testAdapterId,
        name: "Validation Source Adapter",
        version: VERSION,
        status: "Experimental",
        sourceType: "validation-source",
        recordTypes: ["project", "file"],
        domains: ["repository"],
        required: false,
        priority: 900,
        owner: "IDE-170 Validation",
        description: "Temporary Source Adapter for isolated Phase 2 Validation.",
        isAvailable: function validationSourceAvailable() {
          return { available: true, status: "Ready" };
        },
        read: function readValidationSource() {
          return {
            status: "Ready",
            sourceVersion: "1.0.0",
            records: sourceFixture,
            metadata: { fixture: true }
          };
        }
      };
      const adapterDefinitionValidation = namespace.validateSourceAdapter(validAdapterDefinition);
      check(
        "Valid Source Adapter definition passes",
        adapterDefinitionValidation.valid === true,
        "passed=" + adapterDefinitionValidation.passed + "/" + adapterDefinitionValidation.total,
        "Source Adapter Registry"
      );
      const adapterRegistration = namespace.registerSourceAdapter(validAdapterDefinition);
      if (adapterRegistration.ok) {
        validationArtifacts.adapterIds.push(testAdapterId);
        validationArtifacts.capabilityIds.push(testAdapterId);
      }
      check(
        "Source Adapter can be registered",
        adapterRegistration.ok === true,
        adapterRegistration.code,
        "Source Adapter Registry"
      );
      const duplicateAdapter = namespace.registerSourceAdapter(validAdapterDefinition);
      check(
        "Duplicate Source Adapter is blocked",
        duplicateAdapter.ok === false && duplicateAdapter.code === "SOURCE_ADAPTER_DUPLICATE",
        duplicateAdapter.code,
        "Source Adapter Registry"
      );
      const invalidAdapter = namespace.registerSourceAdapter({
        adapterId: "invalid source adapter",
        name: "",
        version: "latest",
        sourceType: "",
        recordTypes: [],
        write: function prohibitedWrite() {},
        read: null
      });
      check(
        "Invalid or writable Source Adapter is blocked",
        invalidAdapter.ok === false && invalidAdapter.code === "SOURCE_ADAPTER_INVALID",
        invalidAdapter.code,
        "Source Adapter Registry"
      );
      const adapterAvailability = namespace.getSourceAvailability(testAdapterId);
      check(
        "Source availability can be checked",
        adapterAvailability.available === true && adapterAvailability.status === "Ready",
        JSON.stringify(adapterAvailability),
        "Source Adapter Registry"
      );

      const sourceSessionResult = namespace.startSession({
        purpose: "Phase 2 Source Intake Validation",
        actor: "IDE-170 Validation",
        requiredCapabilities: [testAdapterId]
      });
      const sourceSession = sourceSessionResult.ok && sourceSessionResult.data
        ? sourceSessionResult.data.session
        : null;
      if (sourceSession) validationArtifacts.sessionIds.push(sourceSession.sessionId);
      check(
        "Source Intake Session can bind registered Adapter Capability",
        Boolean(sourceSession && sourceSession.capabilityBindings.some(function bound(item) {
          return item.capabilityId === testAdapterId;
        })),
        sourceSessionResult.code,
        "Source Intake"
      );

      const intakeResult = sourceSession
        ? namespace.captureSources(sourceSession.sessionId, {
            adapterIds: [testAdapterId],
            requiredAdapterIds: [testAdapterId],
            actor: "IDE-170 Validation"
          })
        : { ok: false, code: "SESSION_NOT_CREATED" };
      const intake = intakeResult.ok && intakeResult.data ? intakeResult.data.intake : null;
      if (intake) validationArtifacts.intakeIds.push(intake.intakeId);
      check(
        "Source Intake captures registered Source",
        Boolean(intakeResult.ok && intake && intake.status === "Ready"),
        intakeResult.code,
        "Source Intake"
      );
      check(
        "Source Intake records retain provenance",
        Boolean(intake && intake.adapterResults[0].records.every(function provenance(record) {
          return record.adapterId === testAdapterId &&
            record.adapterVersion === VERSION &&
            record.sourceId && record.sourceType;
        })),
        intake && intake.adapterResults[0].recordCount,
        "Source Intake"
      );
      check(
        "Source Adapter does not mutate Source input",
        JSON.stringify(sourceFixture) === sourceFixtureBefore &&
          intake && intake.adapterResults[0].sourceReadOnly === true,
        "Source fixture unchanged",
        "Source Intake"
      );
      const intakeValidation = intake
        ? namespace.validateSourceIntake(intake.intakeId)
        : { valid: false, errors: [{ code: "INTAKE_NOT_FOUND" }] };
      check(
        "Source Intake passes independent Validation",
        intakeValidation.valid === true,
        "passed=" + intakeValidation.passed + "/" + intakeValidation.total,
        "Source Intake"
      );
      check(
        "Source Intake is frozen and immutable",
        Boolean(intake && intake.frozen === true && intake.immutable === true),
        intake && intake.status,
        "Source Intake"
      );
      check(
        "Source Intake contains no inferred fields",
        Boolean(intake && intake.adapterResults[0].records.every(function noInference(record) {
          return record.quality.inferredFields.length === 0;
        })),
        "Source-derived Fact only",
        "Source Intake"
      );

      const firstSourceRecord = intake && intake.adapterResults[0].records[0];
      const canonicalRecordResult = firstSourceRecord
        ? namespace.createCanonicalRecord(firstSourceRecord)
        : { ok: false, code: "SOURCE_RECORD_NOT_FOUND" };
      const canonicalRecord = canonicalRecordResult.ok && canonicalRecordResult.data
        ? canonicalRecordResult.data.record
        : null;
      check(
        "Canonical Record can be created",
        Boolean(canonicalRecordResult.ok && canonicalRecord),
        canonicalRecordResult.code,
        "Canonical Model"
      );
      check(
        "Canonical ID is deterministic and typed",
        Boolean(canonicalRecord && canonicalRecord.identity.canonicalId === "project:project:validation"),
        canonicalRecord && canonicalRecord.identity.canonicalId,
        "Canonical Model"
      );
      check(
        "Canonical Record retains Source reference",
        Boolean(canonicalRecord &&
          canonicalRecord.source.sourceId === firstSourceRecord.sourceId &&
          canonicalRecord.source.adapterId === testAdapterId),
        canonicalRecord && JSON.stringify(canonicalRecord.source),
        "Canonical Model"
      );
      check(
        "Canonical Record separates Fact from inference",
        Boolean(canonicalRecord &&
          canonicalRecord.metadata.sourceDerivedFactOnly === true &&
          canonicalRecord.quality.inferredFields.length === 0),
        "inferredFields=0",
        "Canonical Model"
      );

      const snapshotResult = sourceSession && intake
        ? namespace.buildCanonicalSnapshot(sourceSession.sessionId, {
            intakeId: intake.intakeId,
            actor: "IDE-170 Validation"
          })
        : { ok: false, code: "SOURCE_INTAKE_NOT_FOUND" };
      const snapshot = snapshotResult.ok && snapshotResult.data
        ? snapshotResult.data.snapshot
        : null;
      if (snapshot) validationArtifacts.snapshotIds.push(snapshot.snapshotId);
      check(
        "Canonical Snapshot can be built and frozen",
        Boolean(snapshotResult.ok && snapshot && snapshot.status === "Frozen"),
        snapshotResult.code,
        "Canonical Snapshot"
      );
      check(
        "Canonical Snapshot preserves all Source Records",
        Boolean(snapshot && snapshot.summary.recordCount === sourceFixture.length),
        snapshot && snapshot.summary.recordCount,
        "Canonical Snapshot"
      );
      const snapshotValidation = snapshot
        ? namespace.validateCanonicalSnapshot(snapshot.snapshotId)
        : { valid: false, passed: 0, total: 0 };
      check(
        "Canonical Snapshot passes independent Validation",
        snapshotValidation.valid === true,
        "passed=" + snapshotValidation.passed + "/" + snapshotValidation.total,
        "Canonical Snapshot"
      );
      const snapshotSchemaValidation = snapshot
        ? namespace.validateAgainstSchema("IDE-170-SCHEMA-CANONICAL-SNAPSHOT", snapshot)
        : { valid: false, errors: [{ code: "SNAPSHOT_NOT_FOUND" }] };
      check(
        "Canonical Snapshot conforms to registered Schema",
        snapshotSchemaValidation.valid === true,
        "errors=" + snapshotSchemaValidation.errors.length,
        "Canonical Snapshot"
      );
      if (snapshot) {
        const externalCopy = namespace.getCanonicalSnapshot(snapshot.snapshotId);
        externalCopy.records[0].identity.name = "MUTATED";
        const protectedSnapshot = namespace.getCanonicalSnapshot(snapshot.snapshotId);
        check(
          "Frozen Canonical Snapshot is protected from external mutation",
          protectedSnapshot.records[0].identity.name !== "MUTATED",
          protectedSnapshot.records[0].identity.name,
          "Canonical Snapshot"
        );
      } else {
        check(
          "Frozen Canonical Snapshot is protected from external mutation",
          false,
          "Snapshot not created",
          "Canonical Snapshot"
        );
      }

      const duplicateAdapterId = "IDE-170-ADAPTER-VALIDATION-DUPLICATE";
      const duplicateAdapterRegistration = namespace.registerSourceAdapter({
        adapterId: duplicateAdapterId,
        capabilityId: duplicateAdapterId,
        name: "Duplicate Canonical ID Validation Adapter",
        version: VERSION,
        status: "Experimental",
        sourceType: "validation-duplicate-source",
        recordTypes: ["file"],
        domains: ["repository"],
        owner: "IDE-170 Validation",
        isAvailable: function duplicateSourceAvailable() { return true; },
        read: function readDuplicateSource() {
          function duplicateRecord(name) {
            return {
              recordType: "file",
              sourceType: "validation-duplicate-source",
              sourceId: "duplicate.js",
              identity: {
                sourceId: "duplicate.js",
                name: name,
                qualifiedName: "duplicate.js",
                aliases: []
              },
              classification: {
                domain: "repository",
                category: "file",
                subtype: "js",
                lifecycle: "Active"
              },
              payload: { path: "duplicate.js", fileName: name },
              metadata: {},
              quality: { missingFields: [], warnings: [], errors: [] }
            };
          }
          return { records: [duplicateRecord("one.js"), duplicateRecord("two.js")] };
        }
      });
      if (duplicateAdapterRegistration.ok) {
        validationArtifacts.adapterIds.push(duplicateAdapterId);
        validationArtifacts.capabilityIds.push(duplicateAdapterId);
      }
      const duplicateSessionResult = namespace.startSession({
        purpose: "Duplicate Canonical ID Validation",
        actor: "IDE-170 Validation",
        requiredCapabilities: [duplicateAdapterId]
      });
      const duplicateSession = duplicateSessionResult.ok && duplicateSessionResult.data
        ? duplicateSessionResult.data.session
        : null;
      if (duplicateSession) validationArtifacts.sessionIds.push(duplicateSession.sessionId);
      const duplicateIntakeResult = duplicateSession
        ? namespace.captureSources(duplicateSession.sessionId, {
            adapterIds: [duplicateAdapterId],
            requiredAdapterIds: [duplicateAdapterId]
          })
        : { ok: false };
      const duplicateIntake = duplicateIntakeResult.ok && duplicateIntakeResult.data
        ? duplicateIntakeResult.data.intake
        : null;
      if (duplicateIntake) validationArtifacts.intakeIds.push(duplicateIntake.intakeId);
      const duplicateSnapshotResult = duplicateSession && duplicateIntake
        ? namespace.buildCanonicalSnapshot(duplicateSession.sessionId, {
            intakeId: duplicateIntake.intakeId
          })
        : { ok: true, code: "SETUP_FAILED" };
      check(
        "Duplicate Canonical ID is blocked",
        duplicateSnapshotResult.ok === false &&
          duplicateSnapshotResult.code === "CANONICAL_SNAPSHOT_VALIDATION_BLOCKED",
        duplicateSnapshotResult.code,
        "Canonical Integrity"
      );

      const unavailableAdapterId = "IDE-170-ADAPTER-VALIDATION-UNAVAILABLE";
      const unavailableRegistration = namespace.registerSourceAdapter({
        adapterId: unavailableAdapterId,
        capabilityId: unavailableAdapterId,
        name: "Unavailable Source Validation Adapter",
        version: VERSION,
        status: "Experimental",
        sourceType: "validation-unavailable-source",
        recordTypes: ["project"],
        domains: ["repository"],
        owner: "IDE-170 Validation",
        isAvailable: function unavailableSource() {
          return { available: false, status: "Unavailable", reason: "Validation fixture" };
        },
        read: function noRead() { return []; }
      });
      if (unavailableRegistration.ok) {
        validationArtifacts.adapterIds.push(unavailableAdapterId);
        validationArtifacts.capabilityIds.push(unavailableAdapterId);
      }
      const unavailableSessionResult = namespace.startSession({
        purpose: "Unavailable Source Validation",
        actor: "IDE-170 Validation",
        requiredCapabilities: [unavailableAdapterId]
      });
      const unavailableSession = unavailableSessionResult.ok && unavailableSessionResult.data
        ? unavailableSessionResult.data.session
        : null;
      if (unavailableSession) validationArtifacts.sessionIds.push(unavailableSession.sessionId);
      const unavailableIntakeResult = unavailableSession
        ? namespace.captureSources(unavailableSession.sessionId, {
            adapterIds: [unavailableAdapterId],
            requiredAdapterIds: [unavailableAdapterId]
          })
        : { ok: true, code: "SETUP_FAILED" };
      const unavailableIntake = unavailableIntakeResult.data && unavailableIntakeResult.data.intake;
      if (unavailableIntake) validationArtifacts.intakeIds.push(unavailableIntake.intakeId);
      check(
        "Unavailable required Source is blocked without inference",
        unavailableIntakeResult.ok === false &&
          unavailableIntakeResult.code === "SOURCE_INTAKE_BLOCKED" &&
          unavailableIntake && unavailableIntake.status === "Blocked",
        unavailableIntakeResult.code,
        "Source Governance"
      );
      check(
        "Missing information inference remains prohibited",
        namespace.getStatus().missingInformationInferenceAllowed === false &&
          namespace.getStatus().canonicalFactInferenceAllowed === false,
        "false / false",
        "Source Governance"
      );

      const repositorySnapshotModule = namespace.modules.repositorySnapshot;
      check(
        "Repository Snapshot module is loaded",
        Boolean(repositorySnapshotModule && repositorySnapshotModule.status === "Ready"),
        JSON.stringify(repositorySnapshotModule),
        "Phase 3 Foundation"
      );
      check(
        "Repository Snapshot Capability is governed",
        Boolean(namespace.getCapability("IDE-170-REPOSITORY-SNAPSHOT")),
        "IDE-170-REPOSITORY-SNAPSHOT",
        "Phase 3 Foundation"
      );
      const repositorySnapshotDependencies = namespace.checkCapabilityDependencies(
        "IDE-170-REPOSITORY-SNAPSHOT"
      );
      check(
        "Repository Snapshot dependencies are ready",
        repositorySnapshotDependencies.ready === true,
        JSON.stringify(repositorySnapshotDependencies),
        "Phase 3 Foundation"
      );
      const phase3SchemaIds = [
        "IDE-170-SCHEMA-REPOSITORY-CHANGE",
        "IDE-170-SCHEMA-REPOSITORY-SNAPSHOT"
      ];
      check(
        "Phase 3 Schemas are registered",
        phase3SchemaIds.every(function hasSchema(schemaId) {
          return Boolean(namespace.getSchema(schemaId));
        }),
        phase3SchemaIds.join(", "),
        "Phase 3 Schema"
      );
      check(
        "SHA-256 implementation matches known vector",
        namespace.calculateSHA256("abc") ===
          "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        namespace.calculateSHA256("abc"),
        "Repository Hash"
      );

      const cancelledBaselineResult = sourceSession && snapshot
        ? namespace.buildRepositoryBaseline(sourceSession.sessionId, {
            canonicalSnapshotId: snapshot.snapshotId,
            actor: "IDE-170 Validation",
            cancelled: true
          })
        : { ok: true, code: "SETUP_FAILED" };
      check(
        "Repository Snapshot build can be cancelled",
        cancelledBaselineResult.ok === false &&
          cancelledBaselineResult.code === "REPOSITORY_BASELINE_CANCELLED" &&
          cancelledBaselineResult.status === "Cancelled",
        cancelledBaselineResult.code,
        "Repository Performance"
      );

      const baselineResult = sourceSession && snapshot
        ? namespace.buildRepositoryBaseline(sourceSession.sessionId, {
            canonicalSnapshotId: snapshot.snapshotId,
            actor: "IDE-170 Validation"
          })
        : { ok: false, code: "CANONICAL_SNAPSHOT_NOT_FOUND" };
      const baseline = baselineResult.ok && baselineResult.data
        ? baselineResult.data.snapshot
        : null;
      if (baseline) validationArtifacts.repositorySnapshotIds.push(baseline.snapshotId);
      check(
        "Repository Baseline can be built and frozen",
        Boolean(baselineResult.ok && baseline && baseline.snapshotType === "baseline" && baseline.status === "Frozen"),
        baselineResult.code,
        "Repository Baseline"
      );
      check(
        "Repository Baseline preserves complete current state",
        Boolean(baseline && baseline.summary.recordCount === sourceFixture.length && baseline.summary.fileCount === 3),
        baseline && JSON.stringify(baseline.summary),
        "Repository Baseline"
      );
      check(
        "Repository Baseline File records use SHA-256 content Hash",
        Boolean(baseline && baseline.state.files.every(function hashed(file) {
          return typeof file.hashes.contentHash === "string" && /^[a-f0-9]{64}$/.test(file.hashes.contentHash);
        })),
        baseline && baseline.state.files.length,
        "Repository Hash"
      );
      const baselineValidation = baseline
        ? namespace.validateRepositorySnapshot(baseline.snapshotId)
        : { valid: false, passed: 0, total: 0 };
      check(
        "Repository Baseline passes independent Validation",
        baselineValidation.valid === true,
        "passed=" + baselineValidation.passed + "/" + baselineValidation.total,
        "Repository Baseline"
      );
      if (baseline) {
        const baselineCopy = namespace.getRepositorySnapshot(baseline.snapshotId);
        baselineCopy.state.files[0].identity.name = "MUTATED";
        const protectedBaseline = namespace.getRepositorySnapshot(baseline.snapshotId);
        check(
          "Frozen Repository Baseline is protected from external mutation",
          protectedBaseline.state.files[0].identity.name !== "MUTATED",
          protectedBaseline.state.files[0].identity.name,
          "Repository Baseline"
        );
      } else {
        check(
          "Frozen Repository Baseline is protected from external mutation",
          false,
          "Baseline not created",
          "Repository Baseline"
        );
      }

      function phase3FileRecord(path, content, sourceVersion) {
        const fileName = path.split("/").pop();
        return {
          recordType: "file",
          sourceType: "validation-source",
          sourceId: path,
          sourceVersion: internal.text(sourceVersion, "1.1.0"),
          identity: {
            sourceId: path,
            name: fileName,
            qualifiedName: path,
            aliases: []
          },
          classification: {
            domain: "repository",
            category: "file",
            subtype: "js",
            lifecycle: "Active"
          },
          payload: {
            path: path,
            fileName: fileName,
            fileType: "js",
            content: content
          },
          metadata: { fixture: true },
          quality: { missingFields: [], warnings: [], errors: [] }
        };
      }

      const incrementAdapterId = "IDE-170-ADAPTER-VALIDATION-INCREMENT";
      const incrementFixture = [
        {
          recordType: "project",
          sourceType: "validation-source",
          sourceId: "project:validation",
          sourceVersion: "1.1.0",
          identity: {
            sourceId: "project:validation",
            name: "Validation Project",
            qualifiedName: "Validation Project",
            aliases: []
          },
          classification: {
            domain: "repository",
            category: "project",
            subtype: "test",
            lifecycle: "Active"
          },
          payload: { name: "Validation Project", version: "1.1.0" },
          metadata: { fixture: true },
          quality: { missingFields: [], warnings: [], errors: [] }
        },
        phase3FileRecord("src/unchanged.js", "function unchangedFixture() { return true; }", "1.0.0"),
        phase3FileRecord("src/modified.js", "function modifiedFixture() { return 2; }"),
        phase3FileRecord("src/rename-new.js", "function renameFixture() { return 'same'; }"),
        phase3FileRecord("src/added.js", "function addedFixture() { return true; }")
      ];
      const incrementAdapterRegistration = namespace.registerSourceAdapter({
        adapterId: incrementAdapterId,
        capabilityId: incrementAdapterId,
        name: "Repository Increment Validation Adapter",
        version: VERSION,
        status: "Experimental",
        sourceType: "validation-source",
        recordTypes: ["project", "file"],
        domains: ["repository"],
        owner: "IDE-170 Validation",
        isAvailable: function incrementSourceAvailable() {
          return { available: true, status: "Ready" };
        },
        read: function readIncrementSource() {
          return {
            status: "Ready",
            sourceVersion: "1.1.0",
            records: incrementFixture,
            metadata: { fixture: true }
          };
        }
      });
      if (incrementAdapterRegistration.ok) {
        validationArtifacts.adapterIds.push(incrementAdapterId);
        validationArtifacts.capabilityIds.push(incrementAdapterId);
      }
      check(
        "Incremental Source Adapter can be registered",
        incrementAdapterRegistration.ok === true,
        incrementAdapterRegistration.code,
        "Repository Incremental"
      );

      const incrementIntakeResult = sourceSession
        ? namespace.captureSources(sourceSession.sessionId, {
            adapterIds: [incrementAdapterId],
            requiredAdapterIds: [incrementAdapterId],
            actor: "IDE-170 Validation"
          })
        : { ok: false, code: "SESSION_NOT_CREATED" };
      const incrementIntake = incrementIntakeResult.ok && incrementIntakeResult.data
        ? incrementIntakeResult.data.intake
        : null;
      if (incrementIntake) validationArtifacts.intakeIds.push(incrementIntake.intakeId);
      const incrementCanonicalResult = sourceSession && incrementIntake
        ? namespace.buildCanonicalSnapshot(sourceSession.sessionId, {
            intakeId: incrementIntake.intakeId,
            actor: "IDE-170 Validation"
          })
        : { ok: false, code: "INCREMENT_INTAKE_NOT_FOUND" };
      const incrementCanonical = incrementCanonicalResult.ok && incrementCanonicalResult.data
        ? incrementCanonicalResult.data.snapshot
        : null;
      if (incrementCanonical) validationArtifacts.snapshotIds.push(incrementCanonical.snapshotId);
      check(
        "Incremental Canonical Snapshot can be built",
        Boolean(incrementCanonicalResult.ok && incrementCanonical && incrementCanonical.status === "Frozen"),
        incrementCanonicalResult.code,
        "Repository Incremental"
      );

      const incrementalResult = sourceSession && baseline && incrementCanonical
        ? namespace.buildRepositoryIncrement(sourceSession.sessionId, baseline.snapshotId, {
            canonicalSnapshotId: incrementCanonical.snapshotId,
            actor: "IDE-170 Validation"
          })
        : { ok: false, code: "INCREMENT_SETUP_FAILED" };
      const incremental = incrementalResult.ok && incrementalResult.data
        ? incrementalResult.data.snapshot
        : null;
      if (incremental) validationArtifacts.repositorySnapshotIds.push(incremental.snapshotId);
      check(
        "Repository Incremental Snapshot can be built and frozen",
        Boolean(incrementalResult.ok && incremental && incremental.snapshotType === "incremental" && incremental.status === "Frozen"),
        incrementalResult.code,
        "Repository Incremental"
      );
      check(
        "Added, Modified, Removed and Unchanged are classified",
        Boolean(incremental &&
          incremental.summary.changeCounts.Added === 2 &&
          incremental.summary.changeCounts.Modified === 2 &&
          incremental.summary.changeCounts.Removed === 1 &&
          incremental.summary.changeCounts.Unchanged === 1),
        incremental && JSON.stringify(incremental.summary.changeCounts),
        "Repository Change Detection"
      );
      const modifiedFileChange = incremental && incremental.changes.find(function findModified(change) {
        return change.canonicalId === "file:src/modified.js";
      });
      check(
        "File content and Metadata changes are separated",
        Boolean(modifiedFileChange && modifiedFileChange.changeType === "Modified" &&
          modifiedFileChange.contentChange === "Modified" &&
          modifiedFileChange.metadataChange === "Modified"),
        modifiedFileChange && JSON.stringify({
          contentChange: modifiedFileChange.contentChange,
          metadataChange: modifiedFileChange.metadataChange,
          detectionMethod: modifiedFileChange.detectionMethod
        }),
        "Repository Change Detection"
      );
      check(
        "Rename remains an Insight Candidate and is not promoted to Fact",
        Boolean(incremental && incremental.renameCandidates.length === 1 &&
          incremental.renameCandidates[0].layer === "Insight Candidate" &&
          incremental.renameCandidates[0].factPromotionAllowed === false),
        incremental && JSON.stringify(incremental.renameCandidates),
        "Rename Governance"
      );
      const chainValidation = incremental
        ? namespace.validateSnapshotChain(incremental.snapshotId)
        : { valid: false, passed: 0, total: 0 };
      check(
        "Repository Snapshot Chain passes Validation",
        chainValidation.valid === true,
        "passed=" + chainValidation.passed + "/" + chainValidation.total,
        "Snapshot Chain"
      );
      const materializedIncremental = incremental
        ? namespace.materializeRepositoryState(incremental.snapshotId)
        : null;
      const materializedFileIds = materializedIncremental
        ? materializedIncremental.files.map(function fileId(file) { return file.canonicalId; })
        : [];
      check(
        "Incremental Chain materializes the current Repository state",
        Boolean(materializedIncremental && materializedIncremental.files.length === 4 &&
          materializedFileIds.includes("file:src/rename-new.js") &&
          !materializedFileIds.includes("file:src/rename-old.js")),
        JSON.stringify(materializedFileIds),
        "Snapshot Chain"
      );
      const incrementalValidation = incremental
        ? namespace.validateRepositorySnapshot(incremental.snapshotId)
        : { valid: false, passed: 0, total: 0 };
      check(
        "Repository Incremental Snapshot passes independent Validation",
        incrementalValidation.valid === true,
        "passed=" + incrementalValidation.passed + "/" + incrementalValidation.total,
        "Repository Incremental"
      );
      const missingParentIncrement = sourceSession && incrementCanonical
        ? namespace.buildRepositoryIncrement(sourceSession.sessionId, "IDE-170-MISSING-PARENT", {
            canonicalSnapshotId: incrementCanonical.snapshotId
          })
        : { ok: true, code: "SETUP_FAILED" };
      check(
        "Missing parent Snapshot is blocked",
        missingParentIncrement.ok === false && missingParentIncrement.code === "PARENT_REPOSITORY_SNAPSHOT_NOT_READY",
        missingParentIncrement.code,
        "Snapshot Chain"
      );
      if (incremental) {
        const tamperedSnapshot = internal.clone(incremental);
        tamperedSnapshot.summary.recordCount += 1;
        const tamperedValidation = namespace.validateRepositorySnapshot(tamperedSnapshot);
        check(
          "Frozen Repository Snapshot tampering is detected",
          tamperedValidation.valid === false,
          "failed=" + tamperedValidation.failed,
          "Repository Integrity"
        );
      } else {
        check(
          "Frozen Repository Snapshot tampering is detected",
          false,
          "Incremental Snapshot not created",
          "Repository Integrity"
        );
      }

      cleanupValidationArtifacts();

      const cleanedStatus = namespace.getStatus();
      check(
        "Validation artifacts are removed from live Session state",
        validationArtifacts.sessionIds.every(function sessionRemoved(sessionId) {
          return namespace.getSession(sessionId) === null;
        }) && cleanedStatus.sessionCount === state.sessions.size,
        "sessionCount=" + cleanedStatus.sessionCount,
        "Validation Isolation"
      );
      check(
        "Validation artifacts are removed from governed registries",
        namespace.getCapability(testCapabilityId) === null &&
          namespace.getSchema(testSchemaId) === null &&
          validationArtifacts.adapterIds.every(function adapterRemoved(adapterId) {
            return namespace.getSourceAdapter(adapterId) === null &&
              namespace.getCapability(adapterId) === null;
          }),
        "Temporary Capability, Schema and Source Adapter removed",
        "Validation Isolation"
      );
      check(
        "Validation Source Intakes and Canonical Snapshots are removed",
        validationArtifacts.intakeIds.every(function intakeRemoved(intakeId) {
          return namespace.getSourceIntake(intakeId) === null;
        }) && validationArtifacts.snapshotIds.every(function snapshotRemoved(snapshotId) {
          return namespace.getCanonicalSnapshot(snapshotId) === null;
        }),
        "Temporary Intake and Snapshot removed",
        "Validation Isolation"
      );
      check(
        "Validation Repository Snapshots are removed",
        validationArtifacts.repositorySnapshotIds.every(function repositorySnapshotRemoved(snapshotId) {
          return namespace.getRepositorySnapshot(snapshotId) === null;
        }),
        "Temporary Baseline and Incremental Snapshots removed",
        "Validation Isolation"
      );

      const provisionalSummary = summarizeChecks(checks);
      const provisionalResult = {
        id: internal.nextId("IDE-170-VALIDATION"),
        componentId: namespace.componentId,
        version: VERSION,
        valid: provisionalSummary.failed === 0 && provisionalSummary.total > 0,
        passed: provisionalSummary.passed,
        failed: provisionalSummary.failed,
        total: provisionalSummary.total,
        health: provisionalSummary.health,
        status: provisionalSummary.failed === 0 ? "Passed" : "Failed"
      };
      const resultSchemaValidation = namespace.validateAgainstSchema(
        "IDE-170-SCHEMA-VALIDATION-RESULT",
        provisionalResult
      );
      check(
        "Validation Result conforms to the registered Validation Schema",
        resultSchemaValidation.valid === true,
        "errors=" + resultSchemaValidation.errors.length,
        "Independent Validation Gate"
      );

      const summary = summarizeChecks(checks);
      const result = {
        id: provisionalResult.id,
        componentId: namespace.componentId,
        name: "IDE-170 Phase 4 Evidence Graph Regression Validation",
        version: VERSION,
        designFreezeVersion: namespace.designFreezeVersion,
        mode: internal.text(settings.mode, "Phase 4 Evidence Graph Integrated Regression Validation"),
        valid: summary.failed === 0 && summary.total > 0,
        passed: summary.passed,
        failed: summary.failed,
        total: summary.total,
        health: summary.health,
        status: summary.failed === 0 && summary.total > 0 ? "Passed" : "Failed",
        groups: summary.groups,
        checks: checks,
        warnings: internal.unique(warnings),
        phase2Gate: "Passed - Phase 1 Release Frozen",
        phase3Gate: "Passed - Phase 2 Release Frozen",
        phase4Gate: "Passed - Procedure Compiler Release Frozen",
        phase5Gate: summary.failed === 0 && settings.androidRealDevicePassed === true
          ? "Passed"
          : summary.failed === 0
            ? "Blocked - Phase 4 Android Validation Pending"
            : "Blocked",
        androidRealDeviceValidation: {
          required: true,
          passed: settings.androidRealDevicePassed === true,
          device: internal.text(settings.device || settings.androidDevice, settings.androidRealDevicePassed === true ? "Android Chrome" : ""),
          evidence: internal.text(settings.androidEvidence, ""),
          validatedAt: settings.androidRealDevicePassed === true ? internal.nowIso() : null
        },
        executedAt: internal.nowIso()
      };

      state.lastValidation = internal.clone(result);
      internal.touch();
      internal.appendAudit({
        action: "PLATFORM_VALIDATION_COMPLETED",
        actor: internal.text(settings.actor, "IDE-170 Validation"),
        targetType: "Validation",
        targetId: result.id,
        outcome: result.valid ? "Passed" : "Failed",
        detail: {
          passed: result.passed,
          failed: result.failed,
          total: result.total,
          health: result.health
        }
      });

      if (typeof internal.registerExternalIntegration === "function") {
        internal.registerExternalIntegration();
      }

      result.releaseStatus = namespace.getReleaseStatus();
      state.lastValidation = internal.clone(result);
      return internal.clone(result);
    } catch (error) {
      cleanupValidationArtifacts();
      const errorRecord = internal.setError(error, "IDE170_VALIDATION_FAILED");
      const summary = summarizeChecks(checks);
      const result = {
        id: internal.nextId("IDE-170-VALIDATION"),
        componentId: namespace.componentId,
        name: "IDE-170 Phase 4 Evidence Graph Regression Validation",
        version: VERSION,
        valid: false,
        passed: summary.passed,
        failed: summary.failed + 1,
        total: summary.total + 1,
        health: summary.total + 1
          ? Number(((summary.passed / (summary.total + 1)) * 100).toFixed(2))
          : 0,
        status: "Failed",
        groups: summary.groups,
        checks: checks.concat([
          buildCheck("Validation execution completed without exception", false, errorRecord.message, "Validation Runtime", "Critical")
        ]),
        warnings: internal.unique(warnings),
        error: errorRecord,
        androidRealDeviceValidation: {
          required: true,
          passed: false,
          device: "",
          evidence: "",
          validatedAt: null
        },
        phase2Gate: "Passed - Phase 1 Release Frozen",
        phase3Gate: "Passed - Phase 2 Release Frozen",
        phase4Gate: "Passed - Procedure Compiler Release Frozen",
        phase5Gate: "Blocked",
        executedAt: internal.nowIso()
      };
      state.lastValidation = internal.clone(result);
      internal.touch();
      return result;
    }
  }

  function getValidationStatus() {
    return state.lastValidation
      ? internal.clone(state.lastValidation)
      : {
          id: "IDE-170-VALIDATION-STATUS",
          componentId: namespace.componentId,
          version: VERSION,
          valid: false,
          passed: 0,
          failed: 0,
          total: 0,
          health: null,
          status: "Not Run",
          executedAt: null
        };
  }

  Object.assign(namespace.api, {
    runValidation: runValidation,
    getValidationStatus: getValidationStatus,
    registerValidationCapability: registerValidationCapability
  });

  Object.assign(namespace, {
    runValidation: runValidation,
    getValidationStatus: getValidationStatus
  });

  namespace.modules.validation = {
    id: VALIDATION_CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    independentGate: true,
    validationIsolation: true,
    regressionValidation: true,
    sourceIntakeValidation: true,
    canonicalModelValidation: true,
    repositorySnapshotValidation: true,
    snapshotChainValidation: true,
    loadedAt: internal.nowIso()
  };

  global.validateIntelligencePlatform = runValidation;
  global.getIntelligencePlatformValidationStatus = getValidationStatus;

  const initializationResult = namespace.initialize({
    actor: "IDE-170 Bootstrap",
    registerIntegration: true
  });
  if (initializationResult.ok) {
    registerValidationCapability();
    runValidation({ actor: "IDE-170 Bootstrap Validation" });
  }
})(typeof window !== "undefined" ? window : globalThis);
