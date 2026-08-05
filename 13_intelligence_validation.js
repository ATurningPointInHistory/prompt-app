/* ============================================================
   FILE: 13_intelligence_validation.js
   IDE-170 Intelligence Platform
   Version: 1.0.0
   Phase: 1 Foundation - Independent Validation Gate
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
  const VERSION = "1.0.0";
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
      description: "Validates Phase 1 Foundation independently from Confidence or future Insight output.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-CAPABILITY-REGISTRY", minimumVersion: VERSION, optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-VALIDATION-RESULT"],
      provides: ["Core Validation", "Release Gate", "Regression Validation"],
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
      sessionIds: []
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
        "Required Phase 1 modules are loaded",
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
          "runValidation",
          "getReleaseStatus"
        ].every(function hasApi(apiName) {
          return typeof namespace[apiName] === "function";
        }),
        "Phase 1 APIs",
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
        "Phase 2 remains not started",
        status.phase2Started === false,
        String(status.phase2Started),
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
          namespace.getSchema(testSchemaId) === null,
        "Temporary Capability and Schema removed",
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
        name: "IDE-170 Phase 1 Foundation Validation",
        version: VERSION,
        designFreezeVersion: namespace.designFreezeVersion,
        mode: internal.text(settings.mode, "Phase 1 Foundation Integrated Validation"),
        valid: summary.failed === 0 && summary.total > 0,
        passed: summary.passed,
        failed: summary.failed,
        total: summary.total,
        health: summary.health,
        status: summary.failed === 0 && summary.total > 0 ? "Passed" : "Failed",
        groups: summary.groups,
        checks: checks,
        warnings: internal.unique(warnings),
        androidRealDeviceValidation: {
          required: true,
          passed: settings.androidRealDevicePassed === true,
          device: internal.text(settings.device || settings.androidDevice, settings.androidRealDevicePassed === true ? "Android Chrome" : ""),
          evidence: internal.text(settings.androidEvidence, ""),
          validatedAt: settings.androidRealDevicePassed === true ? internal.nowIso() : null
        },
        phase2Gate: summary.failed === 0 && settings.androidRealDevicePassed === true
          ? "Passed"
          : summary.failed === 0
            ? "Blocked - Android Validation Pending"
            : "Blocked",
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
        name: "IDE-170 Phase 1 Foundation Validation",
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
        phase2Gate: "Blocked",
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
