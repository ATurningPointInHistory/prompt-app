/* ============================================================
   FILE: 17_external_intelligence_contracts.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 04: Acquisition Contract / Router / Adapter / Queue
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 contracts blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("contracts");

  function field(name, options) {
    return Object.assign({ name: name, required: false }, options || {});
  }

  const BUILT_IN_CONTRACTS = Object.freeze([
    {
      key: "foundationState",
      id: VERSION_MANIFEST.getContractId("foundationState"),
      name: "EXTERNAL-010 Foundation State Contract",
      version: VERSION_MANIFEST.getContractVersion("foundationState"),
      immutable: true,
      fields: [
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("componentName", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("implementationPhase", { required: true, type: "string" }),
        field("designFreezeId", { required: true, type: "string" }),
        field("decisionRange", { required: true, type: "string" }),
        field("decisionCount", { required: true, type: "number", enum: [54] }),
        field("initialized", { required: true, type: "boolean" }),
        field("safety", { required: true, type: "object" })
      ]
    },
    {
      key: "contractDefinition",
      id: VERSION_MANIFEST.getContractId("contractDefinition"),
      name: "EXTERNAL-010 Contract Definition Contract",
      version: VERSION_MANIFEST.getContractVersion("contractDefinition"),
      immutable: true,
      fields: [
        field("contractId", { required: true, type: "string", pattern: /^EXTERNAL-010-CONTRACT-[A-Z0-9-]+$/ }),
        field("key", { required: true, type: "string" }),
        field("name", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("fields", { required: true, type: "array" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "schemaDefinition",
      id: VERSION_MANIFEST.getContractId("schemaDefinition"),
      name: "EXTERNAL-010 Schema Definition Contract",
      version: VERSION_MANIFEST.getContractVersion("schemaDefinition"),
      immutable: true,
      fields: [
        field("schemaId", { required: true, type: "string", pattern: /^EXTERNAL-010-SCHEMA-[A-Z0-9-]+$/ }),
        field("name", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("type", { required: true, type: "string", enum: ["object"] }),
        field("required", { required: true, type: "array" }),
        field("properties", { required: true, type: "object" }),
        field("additionalProperties", { required: true, type: "boolean" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "compatibilityProfile",
      id: VERSION_MANIFEST.getContractId("compatibilityProfile"),
      name: "EXTERNAL-010 Compatibility Profile Contract",
      version: VERSION_MANIFEST.getContractVersion("compatibilityProfile"),
      immutable: true,
      fields: [
        field("compatibilityProfileId", { required: true, type: "string" }),
        field("recordType", { required: true, type: "string" }),
        field("readVersions", { required: true, type: "array" }),
        field("writeVersion", { required: true, type: "string" }),
        field("readOldWriteCurrent", { required: true, type: "boolean", enum: [true] }),
        field("silentUpgradeAllowed", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "authorityEnvelope",
      id: VERSION_MANIFEST.getContractId("authorityEnvelope"),
      name: "EXTERNAL-010 Authority Envelope Contract",
      version: VERSION_MANIFEST.getContractVersion("authorityEnvelope"),
      immutable: true,
      fields: [
        field("authorityEnvelopeId", { required: true, type: "string" }),
        field("action", { required: true, type: "string" }),
        field("target", { required: true, type: "object" }),
        field("purpose", { required: true, type: "string" }),
        field("scope", { required: true, type: "object" }),
        field("state", { required: true, type: "string", enum: ["CANDIDATE", "ACTIVE", "EXPIRED", "REVOKED", "BLOCKED"] }),
        field("approvalEvidenceId", { required: false, type: ["string", "null"] }),
        field("createdAt", { required: true, type: "string" }),
        field("expiresAt", { required: false, type: ["string", "null"] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "auditEvent",
      id: VERSION_MANIFEST.getContractId("auditEvent"),
      name: "EXTERNAL-010 Audit Event Contract",
      version: VERSION_MANIFEST.getContractVersion("auditEvent"),
      immutable: true,
      fields: [
        field("auditEventId", { required: true, type: "string" }),
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("sequence", { required: true, type: "number" }),
        field("eventType", { required: true, type: "string" }),
        field("actor", { required: true, type: "string" }),
        field("outcome", { required: true, type: "string" }),
        field("details", { required: true, type: "object" }),
        field("previousEventHash", { required: false, type: ["string", "null"] }),
        field("eventHash", { required: true, type: "string", pattern: /^[a-f0-9]{64}$/ }),
        field("appendOnly", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "validationResult",
      id: VERSION_MANIFEST.getContractId("validationResult"),
      name: "EXTERNAL-010 Validation Result Contract",
      version: VERSION_MANIFEST.getContractVersion("validationResult"),
      immutable: true,
      fields: [
        field("id", { required: true, type: "string" }),
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("version", { required: true, type: "string" }),
        field("passed", { required: true, type: "number" }),
        field("failed", { required: true, type: "number" }),
        field("total", { required: true, type: "number" }),
        field("health", { required: true, type: "number" }),
        field("criticalFailed", { required: true, type: "number" }),
        field("status", { required: true, type: "string" }),
        field("releaseAllowed", { required: true, type: "boolean" }),
        field("phase2Allowed", { required: true, type: "boolean" }),
        field("validatedAt", { required: true, type: "string" })
      ]
    },
    {
      key: "promotionBoundary",
      id: VERSION_MANIFEST.getContractId("promotionBoundary"),
      name: "EXTERNAL-010 Promotion Boundary Contract",
      version: VERSION_MANIFEST.getContractVersion("promotionBoundary"),
      immutable: true,
      fields: [
        field("promotionBoundaryId", { required: true, type: "string" }),
        field("candidateType", { required: true, type: "string" }),
        field("automaticPromotionAllowed", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("validationEqualsApproval", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "gatewayRuntimeState",
      id: VERSION_MANIFEST.getContractId("gatewayRuntimeState"),
      name: "EXTERNAL-010 Gateway Runtime State Contract",
      version: VERSION_MANIFEST.getContractVersion("gatewayRuntimeState"),
      immutable: true,
      fields: [
        field("runtimeInstanceId", { required: true, type: "string" }),
        field("runtimeType", { required: true, type: "string" }),
        field("runtimeVersion", { required: true, type: "string" }),
        field("startupEpoch", { required: true, type: "string" }),
        field("startedAt", { required: true, type: "string" }),
        field("healthState", { required: true, type: "string" }),
        field("executionAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("businessAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "gatewaySessionMetadata",
      id: VERSION_MANIFEST.getContractId("gatewaySessionMetadata"),
      name: "EXTERNAL-010 Gateway Session Metadata Contract",
      version: VERSION_MANIFEST.getContractVersion("gatewaySessionMetadata"),
      immutable: true,
      fields: [
        field("gatewaySessionId", { required: true, type: "string" }),
        field("runtimeInstanceId", { required: true, type: "string" }),
        field("issuedAt", { required: true, type: "string" }),
        field("expiresAt", { required: true, type: "string" }),
        field("state", { required: true, type: "string", enum: ["ACTIVE", "EXPIRING", "EXPIRED", "REVOKED", "INVALID", "RUNTIME_INVALIDATED"] }),
        field("origin", { required: true, type: "string" }),
        field("contractVersion", { required: true, type: "string" }),
        field("tokenPersisted", { required: true, type: "boolean", enum: [false] })
      ]
    },
    {
      key: "runtimeCoordinationRecord",
      id: VERSION_MANIFEST.getContractId("runtimeCoordinationRecord"),
      name: "EXTERNAL-010 Runtime Coordination Record Contract",
      version: VERSION_MANIFEST.getContractVersion("runtimeCoordinationRecord"),
      immutable: true,
      fields: [
        field("coordinationRecordId", { required: true, type: "string" }),
        field("recordType", { required: true, type: "string" }),
        field("state", { required: true, type: "string" }),
        field("executionAuthorityGranted", { required: false, type: "boolean" }),
        field("businessAuthorityGranted", { required: false, type: "boolean" }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "dependencyCandidate",
      id: VERSION_MANIFEST.getContractId("dependencyCandidate"),
      name: "EXTERNAL-010 Dependency Candidate Contract",
      version: VERSION_MANIFEST.getContractVersion("dependencyCandidate"),
      immutable: true,
      fields: [
        field("dependencyId", { required: true, type: "string" }),
        field("packageEcosystem", { required: true, type: "string" }),
        field("packageName", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("sourceType", { required: true, type: "string" }),
        field("purpose", { required: true, type: "string" }),
        field("runtimeTarget", { required: true, type: "string" }),
        field("admissionState", { required: true, type: "string" }),
        field("automaticInstallAllowed", { required: true, type: "boolean", enum: [false] }),
        field("hardSecurityFail", { required: true, type: "boolean" }),
        field("elevatedSecurityExceptionGranted", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "runtimeProfile",
      id: VERSION_MANIFEST.getContractId("runtimeProfile"),
      name: "EXTERNAL-010 Runtime Profile Contract",
      version: VERSION_MANIFEST.getContractVersion("runtimeProfile"),
      immutable: true,
      fields: [
        field("runtimeProfileId", { required: true, type: "string" }),
        field("nodeVersion", { required: true, type: "string" }),
        field("pythonVersion", { required: true, type: "string" }),
        field("dependencyManifestHash", { required: true, type: "string" }),
        field("dependencyCount", { required: true, type: "number" }),
        field("externalDependencyCount", { required: true, type: "number" }),
        field("validationState", { required: true, type: "string" }),
        field("automaticInstallAllowed", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "phase2ValidationResult",
      id: VERSION_MANIFEST.getContractId("phase2ValidationResult"),
      name: "EXTERNAL-010 Phase 02 Validation Result Contract",
      version: VERSION_MANIFEST.getContractVersion("phase2ValidationResult"),
      immutable: true,
      fields: [
        field("id", { required: true, type: "string" }),
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("version", { required: true, type: "string", enum: ["1.1.0", "1.2.0", "1.3.0"] }),
        field("implementationPhase", { required: true, type: "string" }),
        field("passed", { required: true, type: "number" }),
        field("failed", { required: true, type: "number" }),
        field("total", { required: true, type: "number" }),
        field("health", { required: true, type: "number" }),
        field("criticalFailed", { required: true, type: "number" }),
        field("status", { required: true, type: "string" }),
        field("releaseAllowed", { required: true, type: "boolean" }),
        field("phase2Complete", { required: true, type: "boolean" }),
        field("phase3Allowed", { required: true, type: "boolean" }),
        field("validatedAt", { required: true, type: "string" })
      ]
    },
    {
      key: "sourceRecord",
      id: VERSION_MANIFEST.getContractId("sourceRecord"),
      name: "EXTERNAL-010 Governed Source Record Contract",
      version: VERSION_MANIFEST.getContractVersion("sourceRecord"),
      immutable: true,
      fields: [
        field("sourceId", { required: true, type: "string", pattern: /^SOURCE-[A-Z0-9-]+$/ }),
        field("sourceName", { required: true, type: "string" }),
        field("sourceType", { required: true, type: "string" }),
        field("provider", { required: true, type: "string" }),
        field("accessMode", { required: true, type: "string" }),
        field("adapterId", { required: true, type: "string" }),
        field("endpointPolicy", { required: true, type: "object" }),
        field("authenticationMode", { required: true, type: "string" }),
        field("secretReferenceId", { required: false, type: ["string", "null"] }),
        field("allowedOperations", { required: true, type: "array" }),
        field("allowedMethods", { required: true, type: "array" }),
        field("pricingMode", { required: true, type: "string" }),
        field("enabled", { required: true, type: "boolean" }),
        field("lifecycleState", { required: true, type: "string" }),
        field("version", { required: true, type: "number" }),
        field("identityState", { required: true, type: "string" }),
        field("reliabilityState", { required: true, type: "string" }),
        field("authorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "sourceDiscoveryRecord",
      id: VERSION_MANIFEST.getContractId("sourceDiscoveryRecord"),
      name: "EXTERNAL-010 Source Discovery Record Contract",
      version: VERSION_MANIFEST.getContractVersion("sourceDiscoveryRecord"),
      immutable: true,
      fields: [
        field("discoveryId", { required: true, type: "string" }),
        field("candidateLocation", { required: true, type: "string" }),
        field("discoveredAt", { required: true, type: "string" }),
        field("discoveredBy", { required: true, type: "string" }),
        field("discoveryReason", { required: true, type: "string" }),
        field("sourceTypeCandidate", { required: true, type: "string" }),
        field("lifecycleState", { required: true, type: "string" }),
        field("identityState", { required: true, type: "string" }),
        field("riskClassification", { required: true, type: "string" }),
        field("costClassification", { required: true, type: "string" }),
        field("authenticationRequirement", { required: true, type: "string" }),
        field("operationRisk", { required: true, type: "string" }),
        field("activationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("registrationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("sourceId", { required: false, type: ["string", "null"] }),
        field("provenance", { required: true, type: "object" }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "controlledInspectionRecord",
      id: VERSION_MANIFEST.getContractId("controlledInspectionRecord"),
      name: "EXTERNAL-010 Controlled Source Inspection Contract",
      version: VERSION_MANIFEST.getContractVersion("controlledInspectionRecord"),
      immutable: true,
      fields: [
        field("inspectionId", { required: true, type: "string" }),
        field("discoveryId", { required: true, type: "string" }),
        field("inspectionPurpose", { required: true, type: "string" }),
        field("networkAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("activationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("contentInstructionAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("securityBoundaryRequired", { required: true, type: "boolean", enum: [true] }),
        field("state", { required: true, type: "string" }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "resourceBudget",
      id: VERSION_MANIFEST.getContractId("resourceBudget"),
      name: "EXTERNAL-010 Resource Budget Contract",
      version: VERSION_MANIFEST.getContractVersion("resourceBudget"),
      immutable: true,
      fields: [
        field("budgetId", { required: true, type: "string" }),
        field("scopeType", { required: true, type: "string" }),
        field("scopeId", { required: true, type: "string" }),
        field("parentBudgetId", { required: false, type: ["string", "null"] }),
        field("period", { required: true, type: "object" }),
        field("currency", { required: true, type: "string" }),
        field("limits", { required: true, type: "object" }),
        field("consumed", { required: true, type: "object" }),
        field("state", { required: true, type: "string" }),
        field("authorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("automaticReallocationAllowed", { required: true, type: "boolean", enum: [false] }),
        field("version", { required: true, type: "number" }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "resourceUsageRecord",
      id: VERSION_MANIFEST.getContractId("resourceUsageRecord"),
      name: "EXTERNAL-010 Resource Usage Record Contract",
      version: VERSION_MANIFEST.getContractVersion("resourceUsageRecord"),
      immutable: true,
      fields: [
        field("usageRecordId", { required: true, type: "string" }),
        field("operationId", { required: true, type: "string" }),
        field("budgetIds", { required: true, type: "array" }),
        field("estimatedUsage", { required: true, type: "object" }),
        field("actualUsage", { required: true, type: "object" }),
        field("sourceId", { required: false, type: ["string", "null"] }),
        field("goalId", { required: false, type: ["string", "null"] }),
        field("planId", { required: false, type: ["string", "null"] }),
        field("reconciled", { required: true, type: "boolean" }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "usagePolicy",
      id: VERSION_MANIFEST.getContractId("usagePolicy"),
      name: "EXTERNAL-010 Usage Policy Contract",
      version: VERSION_MANIFEST.getContractVersion("usagePolicy"),
      immutable: true,
      fields: [
        field("usagePolicyId", { required: true, type: "string" }),
        field("sourceId", { required: true, type: "string" }),
        field("policyVersion", { required: true, type: "string" }),
        field("effectiveAt", { required: false, type: ["string", "null"] }),
        field("observedAt", { required: true, type: "string" }),
        field("policyEvidenceIds", { required: true, type: "array" }),
        field("analysisVersion", { required: true, type: "string" }),
        field("status", { required: true, type: "string" }),
        field("rights", { required: true, type: "object" }),
        field("policyCompleteness", { required: true, type: "string" }),
        field("interpretationConfidence", { required: true, type: "string" }),
        field("aiInterpretationEqualsLegalAuthority", { required: true, type: "boolean", enum: [false] }),
        field("previousPolicyId", { required: false, type: ["string", "null"] }),
        field("policyChangeDetected", { required: true, type: "boolean" }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "phase3ValidationResult",
      id: VERSION_MANIFEST.getContractId("phase3ValidationResult"),
      name: "EXTERNAL-010 Phase 03 Validation Result Contract",
      version: VERSION_MANIFEST.getContractVersion("phase3ValidationResult"),
      immutable: true,
      fields: [
        field("id", { required: true, type: "string" }),
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("version", { required: true, type: "string", enum: ["1.2.0", "1.3.0"] }),
        field("implementationPhase", { required: true, type: "string" }),
        field("decisionCoverage", { required: true, type: "number", enum: [54] }),
        field("passed", { required: true, type: "number" }),
        field("failed", { required: true, type: "number" }),
        field("total", { required: true, type: "number" }),
        field("health", { required: true, type: "number" }),
        field("criticalFailed", { required: true, type: "number" }),
        field("status", { required: true, type: "string" }),
        field("releaseAllowed", { required: true, type: "boolean" }),
        field("phase3Complete", { required: true, type: "boolean" }),
        field("phase4Allowed", { required: true, type: "boolean" }),
        field("validatedAt", { required: true, type: "string" })
      ]
    },
    {
      key: "sourceOperationContract",
      id: VERSION_MANIFEST.getContractId("sourceOperationContract"),
      name: "EXTERNAL-010 Source Operation Contract",
      version: VERSION_MANIFEST.getContractVersion("sourceOperationContract"),
      immutable: true,
      fields: [
        field("operationContractId", { required: true, type: "string" }),
        field("sourceId", { required: true, type: "string" }),
        field("operationId", { required: true, type: "string" }),
        field("adapterId", { required: true, type: "string" }),
        field("method", { required: true, type: "string", enum: ["GET"] }),
        field("endpoint", { required: true, type: "object" }),
        field("parameterPolicy", { required: true, type: "object" }),
        field("timeoutPolicy", { required: true, type: "object" }),
        field("retryPolicy", { required: true, type: "object" }),
        field("responseMode", { required: true, type: "string" }),
        field("executionHints", { required: true, type: "object" }),
        field("estimatedUsage", { required: true, type: "object" }),
        field("enabled", { required: true, type: "boolean" }),
        field("authorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "externalAcquisitionRequest",
      id: VERSION_MANIFEST.getContractId("externalAcquisitionRequest"),
      name: "EXTERNAL-010 Unified External Acquisition Request Contract",
      version: VERSION_MANIFEST.getContractVersion("externalAcquisitionRequest"),
      immutable: true,
      fields: [
        field("requestId", { required: true, type: "string" }),
        field("sourceId", { required: true, type: "string" }),
        field("operationId", { required: true, type: "string" }),
        field("parameters", { required: true, type: "object" }),
        field("requestedAt", { required: true, type: "string" }),
        field("priority", { required: true, type: "string" }),
        field("executionPreference", { required: true, type: "string" }),
        field("timeoutPolicy", { required: true, type: "object" }),
        field("retryPolicy", { required: true, type: "object" }),
        field("idempotencyKey", { required: false, type: ["string", "null"] }),
        field("requestContext", { required: true, type: "object" }),
        field("purpose", { required: true, type: "string" }),
        field("requestedBy", { required: true, type: "string" }),
        field("correlationId", { required: false, type: ["string", "null"] }),
        field("budgetIds", { required: true, type: "array" }),
        field("acquisitionPlanId", { required: false, type: ["string", "null"] }),
        field("researchGoalId", { required: false, type: ["string", "null"] }),
        field("status", { required: true, type: "string" }),
        field("executionAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("validationGrantsExecutionAuthority", { required: true, type: "boolean", enum: [false] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "externalAcquisitionAttempt",
      id: VERSION_MANIFEST.getContractId("externalAcquisitionAttempt"),
      name: "EXTERNAL-010 External Acquisition Attempt Contract",
      version: VERSION_MANIFEST.getContractVersion("externalAcquisitionAttempt"),
      immutable: true,
      fields: [
        field("attemptId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("sourceId", { required: true, type: "string" }),
        field("operationId", { required: true, type: "string" }),
        field("attemptNumber", { required: true, type: "number" }),
        field("adapterId", { required: true, type: "string" }),
        field("adapterVersion", { required: true, type: "string" }),
        field("routeId", { required: false, type: ["string", "null"] }),
        field("startedAt", { required: true, type: "string" }),
        field("completedAt", { required: false, type: ["string", "null"] }),
        field("status", { required: true, type: "string" }),
        field("retryable", { required: true, type: "boolean" }),
        field("errorId", { required: false, type: ["string", "null"] }),
        field("responseId", { required: false, type: ["string", "null"] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "externalAcquisitionResponse",
      id: VERSION_MANIFEST.getContractId("externalAcquisitionResponse"),
      name: "EXTERNAL-010 External Acquisition Response Contract",
      version: VERSION_MANIFEST.getContractVersion("externalAcquisitionResponse"),
      immutable: true,
      fields: [
        field("responseId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("attemptId", { required: true, type: "string" }),
        field("sourceId", { required: true, type: "string" }),
        field("operationId", { required: true, type: "string" }),
        field("status", { required: true, type: "string" }),
        field("responseMetadata", { required: true, type: "object" }),
        field("temporalMetadata", { required: true, type: "object" }),
        field("payload", { required: false }),
        field("evidenceInput", { required: true, type: "object" }),
        field("externalResponseGrantsAuthority", { required: true, type: "boolean", enum: [false] }),
        field("knowledgePromotionPerformed", { required: true, type: "boolean", enum: [false] }),
        field("canonicalRepositoryMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "externalAcquisitionError",
      id: VERSION_MANIFEST.getContractId("externalAcquisitionError"),
      name: "EXTERNAL-010 External Acquisition Error Contract",
      version: VERSION_MANIFEST.getContractVersion("externalAcquisitionError"),
      immutable: true,
      fields: [
        field("errorId", { required: true, type: "string" }),
        field("errorCode", { required: true, type: "string" }),
        field("category", { required: true, type: "string" }),
        field("message", { required: true, type: "string" }),
        field("retryable", { required: true, type: "boolean" }),
        field("sourceId", { required: true, type: "string" }),
        field("operationId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("attemptId", { required: true, type: "string" }),
        field("occurredAt", { required: true, type: "string" }),
        field("rawProviderStatus", { required: false, type: ["string", "null"] }),
        field("secretRedacted", { required: true, type: "boolean", enum: [true] }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "sourceAdapterDefinition",
      id: VERSION_MANIFEST.getContractId("sourceAdapterDefinition"),
      name: "EXTERNAL-010 Source Adapter Definition Contract",
      version: VERSION_MANIFEST.getContractVersion("sourceAdapterDefinition"),
      immutable: true,
      fields: [
        field("adapterId", { required: true, type: "string" }),
        field("adapterVersion", { required: true, type: "string" }),
        field("adapterType", { required: true, type: "string" }),
        field("supportedSourceTypes", { required: true, type: "array" }),
        field("supportedOperations", { required: true, type: "array" }),
        field("runtimeTargets", { required: true, type: "array" }),
        field("status", { required: true, type: "string" }),
        field("testOnly", { required: true, type: "boolean" }),
        field("sourceAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("repositoryAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("financialAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("reliabilityAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("automaticRetryAllowed", { required: true, type: "boolean", enum: [false] }),
        field("arbitraryUrlAllowed", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "sourceRouteDecision",
      id: VERSION_MANIFEST.getContractId("sourceRouteDecision"),
      name: "EXTERNAL-010 Source Route Decision Contract",
      version: VERSION_MANIFEST.getContractVersion("sourceRouteDecision"),
      immutable: true,
      fields: [
        field("routeId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("sourceId", { required: true, type: "string" }),
        field("sourceVersion", { required: true, type: "number" }),
        field("operationId", { required: true, type: "string" }),
        field("operationContractId", { required: true, type: "string" }),
        field("adapterId", { required: true, type: "string" }),
        field("adapterVersion", { required: true, type: "string" }),
        field("accessMode", { required: true, type: "string" }),
        field("runtimeTarget", { required: true, type: "string" }),
        field("endpointReference", { required: false, type: ["string", "null"] }),
        field("fallbackPerformed", { required: true, type: "boolean", enum: [false] }),
        field("fallbackCanBypassPolicy", { required: true, type: "boolean", enum: [false] }),
        field("sourceAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("economicAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "acquisitionJob",
      id: VERSION_MANIFEST.getContractId("acquisitionJob"),
      name: "EXTERNAL-010 Acquisition Job Contract",
      version: VERSION_MANIFEST.getContractVersion("acquisitionJob"),
      immutable: true,
      fields: [
        field("jobId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("priority", { required: true, type: "string" }),
        field("status", { required: true, type: "string" }),
        field("scheduledAt", { required: true, type: "string" }),
        field("attemptCount", { required: true, type: "number" }),
        field("maxAttempts", { required: true, type: "number" }),
        field("checkpointId", { required: false, type: ["string", "null"] }),
        field("cancellationRequested", { required: true, type: "boolean" }),
        field("executionAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("researchGoalAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("paidAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("financialAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("updatedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "phase4ValidationResult",
      id: VERSION_MANIFEST.getContractId("phase4ValidationResult"),
      name: "EXTERNAL-010 Phase 04 Validation Result Contract",
      version: VERSION_MANIFEST.getContractVersion("phase4ValidationResult"),
      immutable: true,
      fields: [
        field("id", { required: true, type: "string" }),
        field("componentId", { required: true, type: "string", enum: ["EXTERNAL-010"] }),
        field("version", { required: true, type: "string", enum: ["1.3.0"] }),
        field("implementationPhase", { required: true, type: "string" }),
        field("decisionCoverage", { required: true, type: "number", enum: [54] }),
        field("passed", { required: true, type: "number" }),
        field("failed", { required: true, type: "number" }),
        field("total", { required: true, type: "number" }),
        field("health", { required: true, type: "number" }),
        field("criticalFailed", { required: true, type: "number" }),
        field("status", { required: true, type: "string" }),
        field("releaseAllowed", { required: true, type: "boolean" }),
        field("phase4Complete", { required: true, type: "boolean" }),
        field("phase5Allowed", { required: true, type: "boolean" }),
        field("validatedAt", { required: true, type: "string" })
      ]
    }
  ]);

  function typeMatches(value, expected) {
    const types = Array.isArray(expected) ? expected : [expected];
    return types.some(function matches(type) {
      if (type === "null") return value === null;
      if (type === "array") return Array.isArray(value);
      if (type === "object") return internal.isPlainObject(value);
      if (type === "number") return typeof value === "number" && Number.isFinite(value);
      if (type === "boolean") return typeof value === "boolean";
      if (type === "string") return typeof value === "string";
      return true;
    });
  }

  function normalizeDefinition(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const fields = Array.isArray(source.fields) ? source.fields.map(function normalizeField(rule) {
      const copy = internal.clone(rule || {});
      copy.name = internal.text(copy.name, "");
      return copy;
    }) : [];
    return {
      contractId: internal.text(source.contractId || source.id, ""),
      key: internal.text(source.key, ""),
      name: internal.text(source.name, ""),
      version: internal.text(source.version, ""),
      fields: fields,
      immutable: source.immutable !== false,
      source: internal.text(source.source, "runtime")
    };
  }

  function findContract(contractIdOrKey) {
    const value = internal.text(contractIdOrKey, "");
    if (!value) return null;
    if (state.contracts.has(value)) return state.contracts.get(value);
    for (const item of state.contracts.values()) {
      if (item.key === value || item.contractId === value) return item;
    }
    return null;
  }

  function registerContract(input) {
    const definition = normalizeDefinition(input);
    if (!definition.contractId || !definition.key || !definition.name || !definition.version || !definition.fields.length) {
      return internal.buildResult(false, "EXTERNAL010_CONTRACT_DEFINITION_INVALID", "Blocked", { definition: definition });
    }
    if (!/^EXTERNAL-010-CONTRACT-[A-Z0-9-]+$/.test(definition.contractId)) {
      return internal.buildResult(false, "EXTERNAL010_CONTRACT_ID_INVALID", "Blocked", { contractId: definition.contractId });
    }
    const existing = findContract(definition.contractId) || findContract(definition.key);
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(internal.deepFreeze(internal.clone(definition)));
      return internal.buildResult(same, same ? "EXTERNAL010_CONTRACT_ALREADY_REGISTERED" : "EXTERNAL010_CONTRACT_DUPLICATE_CONFLICT", same ? "Ready" : "Blocked", { contract: internal.clone(existing) });
    }
    const frozen = internal.deepFreeze(internal.clone(definition));
    state.contracts.set(frozen.contractId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CONTRACT_REGISTERED", "Ready", { contract: internal.clone(frozen) });
  }

  function validateContract(contractIdOrKey, payload) {
    const definition = findContract(contractIdOrKey);
    const checks = [];
    if (!definition) {
      return { valid: false, contractId: contractIdOrKey || null, checks: [{ name: "Contract is registered", passed: false, detail: "not-found" }], validatedAt: internal.nowIso() };
    }
    const object = internal.isPlainObject(payload) ? payload : {};
    definition.fields.forEach(function validateField(rule) {
      const present = Object.prototype.hasOwnProperty.call(object, rule.name);
      checks.push({ name: rule.name + " presence", passed: rule.required !== true || present, detail: present ? "present" : "missing" });
      if (!present) return;
      const value = object[rule.name];
      if (rule.type) checks.push({ name: rule.name + " type", passed: typeMatches(value, rule.type), detail: typeof value });
      if (rule.enum) checks.push({ name: rule.name + " enum", passed: rule.enum.includes(value), detail: String(value) });
      if (rule.pattern && typeof value === "string") checks.push({ name: rule.name + " pattern", passed: rule.pattern.test(value), detail: value });
    });
    const valid = checks.every(function pass(item) { return item.passed; });
    return { valid: valid, contractId: definition.contractId, contractKey: definition.key, contractVersion: definition.version, checks: checks, validatedAt: internal.nowIso() };
  }

  function getContract(contractIdOrKey) {
    const definition = findContract(contractIdOrKey);
    return definition ? internal.clone(definition) : null;
  }

  function listContracts() {
    return Array.from(state.contracts.values()).map(internal.clone);
  }

  function initializeExternalIntelligenceContracts() {
    const results = BUILT_IN_CONTRACTS.map(function add(definition) {
      return registerContract(Object.assign({}, definition, { contractId: definition.id, source: "built-in" }));
    });
    const failed = results.filter(function failed(item) { return !item.ok; });
    namespace.modules.contracts.status = failed.length ? "Blocked" : "Ready";
    return internal.buildResult(failed.length === 0,
      failed.length ? "EXTERNAL010_CONTRACTS_INITIALIZATION_FAILED" : "EXTERNAL010_CONTRACTS_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      { builtInCount: BUILT_IN_CONTRACTS.length, registeredCount: state.contracts.size, results: results });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceContracts: initializeExternalIntelligenceContracts,
    registerExternalIntelligenceContract: registerContract,
    getExternalIntelligenceContract: getContract,
    listExternalIntelligenceContracts: listContracts,
    validateExternalIntelligenceContract: validateContract
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.contracts = {
    id: "EXTERNAL-010-CONTRACT-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    immutableDefinitions: true,
    duplicateProtection: true,
    unknownContractAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.validateExternalIntelligenceContract = validateContract;
  global.getExternalIntelligenceContracts = listContracts;
})(typeof window !== "undefined" ? window : globalThis);
