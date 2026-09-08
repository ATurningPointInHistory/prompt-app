/* ============================================================
   FILE: 17_external_intelligence_contracts.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.9.1
   Phase 10 Hotfix: Contract / Schema Guard Hardening
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

  function compatibleReleaseEnum(values) {
    return Array.from(new Set((values || []).concat([VERSION_MANIFEST.release.version])));
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
        field("version", { required: true, type: "string", enum: compatibleReleaseEnum(["1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"]) }),
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
        field("version", { required: true, type: "string", enum: compatibleReleaseEnum(["1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"]) }),
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
        field("version", { required: true, type: "string", enum: compatibleReleaseEnum(["1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"]) }),
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
    },
    {
      key: "rawEvidenceRecord", id: VERSION_MANIFEST.getContractId("rawEvidenceRecord"), name: "EXTERNAL-010 Raw Evidence Contract", version: VERSION_MANIFEST.getContractVersion("rawEvidenceRecord"), immutable: true,
      fields: [field("rawEvidenceId",{required:true,type:"string"}),field("contentId",{required:true,type:"string"}),field("contentHash",{required:true,type:"string",pattern:/^[a-f0-9]{64}$/}),field("contentType",{required:true,type:"string"}),field("sizeBytes",{required:true,type:"number"}),field("rawDataReference",{required:true,type:["string","null"]}),field("storageClass",{required:true,type:"string"}),field("acquiredAt",{required:true,type:"string"}),field("publishedAt",{required:false,type:["string","null"]}),field("sourceId",{required:true,type:"string"}),field("requestId",{required:true,type:"string"}),field("acquisitionStatus",{required:true,type:"string"}),field("schemaVersion",{required:true,type:"string"}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "acquisitionEvidenceRecord", id: VERSION_MANIFEST.getContractId("acquisitionEvidenceRecord"), name: "EXTERNAL-010 Acquisition Evidence Contract", version: VERSION_MANIFEST.getContractVersion("acquisitionEvidenceRecord"), immutable: true,
      fields: [field("evidenceId",{required:true,type:"string"}),field("requestId",{required:true,type:"string"}),field("sourceId",{required:true,type:"string"}),field("sourceVersion",{required:true,type:"number"}),field("operationId",{required:true,type:"string"}),field("adapterId",{required:true,type:"string"}),field("adapterVersion",{required:true,type:"string"}),field("accessMode",{required:true,type:"string"}),field("acquiredAt",{required:true,type:"string"}),field("status",{required:true,type:"string"}),field("contentHash",{required:true,type:"string",pattern:/^[a-f0-9]{64}$/}),field("contentType",{required:true,type:"string"}),field("rawEvidenceId",{required:true,type:"string"}),field("attemptCount",{required:true,type:"number"}),field("recordHash",{required:true,type:"string",pattern:/^[a-f0-9]{64}$/}),field("schemaVersion",{required:true,type:"string"}),field("recordVersion",{required:true,type:"number"}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "contentObjectMetadata", id: VERSION_MANIFEST.getContractId("contentObjectMetadata"), name: "EXTERNAL-010 Content Object Metadata Contract", version: VERSION_MANIFEST.getContractVersion("contentObjectMetadata"), immutable: true,
      fields: [field("contentId",{required:true,type:"string"}),field("contentHash",{required:true,type:"string",pattern:/^[a-f0-9]{64}$/}),field("storageClass",{required:true,type:"string"}),field("storageProvider",{required:true,type:"string"}),field("storageReference",{required:true,type:["string","null"]}),field("sizeBytes",{required:true,type:"number"}),field("contentType",{required:true,type:"string"}),field("integrityState",{required:true,type:"string"}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "processingCheckpoint", id: VERSION_MANIFEST.getContractId("processingCheckpoint"), name: "EXTERNAL-010 Incremental Processing Checkpoint Contract", version: VERSION_MANIFEST.getContractVersion("processingCheckpoint"), immutable: true,
      fields: [field("checkpointId",{required:true,type:"string"}),field("contentHash",{required:true,type:"string",pattern:/^[a-f0-9]{64}$/}),field("processorId",{required:true,type:"string"}),field("processorVersion",{required:true,type:"string"}),field("parameterHash",{required:true,type:"string"}),field("processingState",{required:true,type:"string"}),field("resumeCursor",{required:false,type:["object","string","number","null"]}),field("supersedesCheckpointId",{required:false,type:["string","null"]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "phase5ValidationResult", id: VERSION_MANIFEST.getContractId("phase5ValidationResult"), name: "EXTERNAL-010 Phase 05 Validation Result Contract", version: VERSION_MANIFEST.getContractVersion("phase5ValidationResult"), immutable: true,
      fields: [field("id",{required:true,type:"string"}),field("componentId",{required:true,type:"string",enum:["EXTERNAL-010"]}),field("version",{required:true,type:"string"}),field("implementationPhase",{required:true,type:"string"}),field("decisionCoverage",{required:true,type:"number",enum:[54]}),field("passed",{required:true,type:"number"}),field("failed",{required:true,type:"number"}),field("total",{required:true,type:"number"}),field("health",{required:true,type:"number"}),field("criticalFailed",{required:true,type:"number"}),field("status",{required:true,type:"string"}),field("releaseAllowed",{required:true,type:"boolean"}),field("phase5Complete",{required:true,type:"boolean"}),field("phase6Allowed",{required:true,type:"boolean"}),field("validatedAt",{required:true,type:"string"})]
    }
    ,{
      key: "secretMetadata", id: VERSION_MANIFEST.getContractId("secretMetadata"), name: "EXTERNAL-010 Secret Metadata Contract", version: VERSION_MANIFEST.getContractVersion("secretMetadata"), immutable: true,
      fields: [field("secretReferenceId",{required:true,type:"string"}),field("secretType",{required:true,type:"string"}),field("provider",{required:true,type:"string"}),field("status",{required:true,type:"string"}),field("createdAt",{required:true,type:"string"}),field("updatedAt",{required:true,type:"string"}),field("expiresAt",{required:false,type:["string","null"]}),field("valueExposed",{required:true,type:"boolean",enum:[false]}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "contentSecurityAssessment", id: VERSION_MANIFEST.getContractId("contentSecurityAssessment"), name: "EXTERNAL-010 External Content Security Assessment Contract", version: VERSION_MANIFEST.getContractVersion("contentSecurityAssessment"), immutable: true,
      fields: [field("securityAssessmentId",{required:true,type:"string"}),field("evidenceId",{required:true,type:["string","null"]}),field("sourceId",{required:true,type:["string","null"]}),field("contentHash",{required:true,type:["string","null"]}),field("trustClass",{required:true,type:"string"}),field("securityState",{required:true,type:"string"}),field("signals",{required:true,type:"array"}),field("instructionAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("toolAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("secretAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("repositoryAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("financialAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("scheduleAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("sanitizedAutomaticallyTrusted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "dataLifecycleRecord", id: VERSION_MANIFEST.getContractId("dataLifecycleRecord"), name: "EXTERNAL-010 Data Lifecycle Contract", version: VERSION_MANIFEST.getContractVersion("dataLifecycleRecord"), immutable: true,
      fields: [field("lifecycleRecordId",{required:true,type:"string"}),field("subjectType",{required:true,type:"string"}),field("subjectId",{required:true,type:"string"}),field("sourceId",{required:false,type:["string","null"]}),field("dataClass",{required:true,type:"string"}),field("purposeId",{required:true,type:"string"}),field("usagePolicyReference",{required:false,type:["string","null"]}),field("retentionPolicyReference",{required:false,type:["string","null"]}),field("policyVersion",{required:true,type:"string"}),field("lifecycleState",{required:true,type:"string"}),field("expiresAt",{required:false,type:["string","null"]}),field("preservationHold",{required:true,type:"boolean"}),field("deletionAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("automaticDeletionPerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("updatedAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "privacyAssessment", id: VERSION_MANIFEST.getContractId("privacyAssessment"), name: "EXTERNAL-010 Privacy Assessment Contract", version: VERSION_MANIFEST.getContractVersion("privacyAssessment"), immutable: true,
      fields: [field("privacyAssessmentId",{required:true,type:"string"}),field("subjectId",{required:true,type:"string"}),field("identityMode",{required:true,type:"string"}),field("purposeId",{required:true,type:"string"}),field("privacyRisk",{required:true,type:"string"}),field("sensitiveInferenceAllowed",{required:true,type:"boolean",enum:[false]}),field("realPersonResolutionAllowed",{required:true,type:"boolean",enum:[false]}),field("crossPlatformLinkConfirmed",{required:true,type:"boolean",enum:[false]}),field("reIdentificationAllowed",{required:true,type:"boolean",enum:[false]}),field("dataMinimized",{required:true,type:"boolean"}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "phase6ValidationResult", id: VERSION_MANIFEST.getContractId("phase6ValidationResult"), name: "EXTERNAL-010 Phase 06 Validation Result Contract", version: VERSION_MANIFEST.getContractVersion("phase6ValidationResult"), immutable: true,
      fields: [field("id",{required:true,type:"string"}),field("componentId",{required:true,type:"string",enum:["EXTERNAL-010"]}),field("version",{required:true,type:"string"}),field("implementationPhase",{required:true,type:"string"}),field("decisionCoverage",{required:true,type:"number",enum:[54]}),field("passed",{required:true,type:"number"}),field("failed",{required:true,type:"number"}),field("total",{required:true,type:"number"}),field("health",{required:true,type:"number"}),field("criticalFailed",{required:true,type:"number"}),field("status",{required:true,type:"string"}),field("releaseAllowed",{required:true,type:"boolean"}),field("phase6Complete",{required:true,type:"boolean"}),field("phase7Allowed",{required:true,type:"boolean"}),field("validatedAt",{required:true,type:"string"})]
    },
    {
      key: "temporalContext", id: VERSION_MANIFEST.getContractId("temporalContext"), name: "EXTERNAL-010 Temporal Context Contract", version: VERSION_MANIFEST.getContractVersion("temporalContext"), immutable: true,
      fields: [field("temporalContextId",{required:true,type:"string"}),field("evidenceId",{required:true,type:["string","null"]}),field("rawEvidenceId",{required:true,type:["string","null"]}),field("publishedAt",{required:true,type:["string","null"]}),field("availableAt",{required:true,type:["string","null"]}),field("effectiveAt",{required:true,type:["string","null"]}),field("acquiredAt",{required:true,type:["string","null"]}),field("temporalIntent",{required:true,type:"string"}),field("historicalMode",{required:true,type:"boolean"}),field("asOfTime",{required:true,type:["string","null"]}),field("freshnessState",{required:true,type:"string"}),field("futureEvidenceBlocked",{required:true,type:"boolean"}),field("eligibilityState",{required:true,type:"string"}),field("newestEvidenceAutomaticallyWins",{required:true,type:"boolean",enum:[false]}),field("freshnessGrantsReliability",{required:true,type:"boolean",enum:[false]}),field("unknownTimestampInvented",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "normalizerDefinition", id: VERSION_MANIFEST.getContractId("normalizerDefinition"), name: "EXTERNAL-010 Normalizer Definition Contract", version: VERSION_MANIFEST.getContractVersion("normalizerDefinition"), immutable: true,
      fields: [field("normalizerId",{required:true,type:"string"}),field("normalizerVersion",{required:true,type:"string"}),field("schemaVersion",{required:true,type:"string"}),field("recordType",{required:true,type:"string"}),field("supportedSourceTypes",{required:true,type:"array"}),field("deterministic",{required:true,type:"boolean"}),field("rawEvidenceMutationAllowed",{required:true,type:"boolean",enum:[false]}),field("historicalOverwriteAllowed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "normalizedRecord", id: VERSION_MANIFEST.getContractId("normalizedRecord"), name: "EXTERNAL-010 Normalized Record Contract", version: VERSION_MANIFEST.getContractVersion("normalizedRecord"), immutable: true,
      fields: [field("normalizedRecordId",{required:true,type:"string"}),field("recordType",{required:true,type:"string"}),field("recordVersion",{required:true,type:"number"}),field("schemaVersion",{required:true,type:"string"}),field("rawEvidenceId",{required:true,type:"string"}),field("sourceEvidenceId",{required:true,type:"string"}),field("sourceContentHash",{required:true,type:"string"}),field("normalizerId",{required:true,type:"string"}),field("normalizerVersion",{required:true,type:"string"}),field("normalizationState",{required:true,type:"string"}),field("resolutionState",{required:true,type:"string"}),field("normalizedData",{required:true,type:["object","array"]}),field("provenanceReference",{required:true,type:"object"}),field("derivedDataBoundary",{required:true,type:"boolean",enum:[true]}),field("rawEvidencePreserved",{required:true,type:"boolean",enum:[true]}),field("rawEvidenceOverwritePerformed",{required:true,type:"boolean",enum:[false]}),field("normalizationReplacesRawEvidence",{required:true,type:"boolean",enum:[false]}),field("historyOverwritePerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "claimCandidate", id: VERSION_MANIFEST.getContractId("claimCandidate"), name: "EXTERNAL-010 Claim Candidate Contract", version: VERSION_MANIFEST.getContractVersion("claimCandidate"), immutable: true,
      fields: [field("claimCandidateId",{required:true,type:"string"}),field("claimId",{required:true,type:"string"}),field("normalizedRecordId",{required:true,type:"string"}),field("sourceEvidenceId",{required:true,type:"string"}),field("rawEvidenceId",{required:true,type:"string"}),field("claimType",{required:true,type:"string"}),field("claimantId",{required:true,type:["string","null"]}),field("publisherId",{required:true,type:["string","null"]}),field("claimExtractorId",{required:true,type:"string"}),field("claimExtractorVersion",{required:true,type:"string"}),field("extractionState",{required:true,type:"string"}),field("atomicClaim",{required:true,type:"object"}),field("rawContextReference",{required:true,type:"string"}),field("lineageReference",{required:true,type:"object"}),field("claimEqualsTruth",{required:true,type:"boolean",enum:[false]}),field("claimExtractionEqualsKnowledgePromotion",{required:true,type:"boolean",enum:[false]}),field("truthVerified",{required:true,type:"boolean",enum:[false]}),field("knowledgePromotionPerformed",{required:true,type:"boolean",enum:[false]}),field("toolAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("repositoryAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "entityRecord", id: VERSION_MANIFEST.getContractId("entityRecord"), name: "EXTERNAL-010 Entity Record Contract", version: VERSION_MANIFEST.getContractVersion("entityRecord"), immutable: true,
      fields: [field("entityId",{required:true,type:"string"}),field("entityType",{required:true,type:"string"}),field("canonicalLabel",{required:true,type:"string"}),field("namespace",{required:true,type:"string"}),field("resolutionState",{required:true,type:"string"}),field("evidenceRefs",{required:true,type:"array"}),field("identityCreatedFromNameMatchOnly",{required:true,type:"boolean",enum:[false]}),field("knowledgeIdentityLinkPerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "entityAliasRecord", id: VERSION_MANIFEST.getContractId("entityAliasRecord"), name: "EXTERNAL-010 Entity Alias Contract", version: VERSION_MANIFEST.getContractVersion("entityAliasRecord"), immutable: true,
      fields: [field("entityAliasId",{required:true,type:"string"}),field("entityId",{required:true,type:"string"}),field("alias",{required:true,type:"string"}),field("namespace",{required:true,type:"string"}),field("evidenceRefs",{required:true,type:"array"}),field("aliasMatchEqualsExactIdentity",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "entityIdentifierRecord", id: VERSION_MANIFEST.getContractId("entityIdentifierRecord"), name: "EXTERNAL-010 Entity Identifier Contract", version: VERSION_MANIFEST.getContractVersion("entityIdentifierRecord"), immutable: true,
      fields: [field("entityIdentifierId",{required:true,type:"string"}),field("entityId",{required:true,type:"string"}),field("namespace",{required:true,type:"string"}),field("identifier",{required:true,type:"string"}),field("evidenceRefs",{required:true,type:"array"}),field("identifierEqualsPermanentIdentity",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "entityMention", id: VERSION_MANIFEST.getContractId("entityMention"), name: "EXTERNAL-010 Entity Mention Contract", version: VERSION_MANIFEST.getContractVersion("entityMention"), immutable: true,
      fields: [field("entityMentionId",{required:true,type:"string"}),field("sourceEvidenceId",{required:true,type:"string"}),field("mentionMode",{required:true,type:"string",enum:["TEXT","VISUAL"]}),field("mentionText",{required:true,type:["string","null"]}),field("visualReference",{required:true,type:["string","null"]}),field("candidateEntityIds",{required:true,type:"array"}),field("resolvedEntityId",{required:true,type:["string","null"],enum:[null]}),field("resolutionState",{required:true,type:"string"}),field("mentionEqualsResolvedEntity",{required:true,type:"boolean",enum:[false]}),field("visualMentionEqualsResolvedEntity",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "entityResolutionCandidate", id: VERSION_MANIFEST.getContractId("entityResolutionCandidate"), name: "EXTERNAL-010 Entity Resolution Candidate Contract", version: VERSION_MANIFEST.getContractVersion("entityResolutionCandidate"), immutable: true,
      fields: [field("entityResolutionCandidateId",{required:true,type:"string"}),field("entityMentionId",{required:true,type:"string"}),field("candidateEntityId",{required:true,type:["string","null"]}),field("resolverId",{required:true,type:"string"}),field("resolverVersion",{required:true,type:"string"}),field("resolutionState",{required:true,type:"string"}),field("evidenceRefs",{required:true,type:"array"}),field("visualSimilarityOnly",{required:true,type:"boolean"}),field("canonicalResolutionPerformed",{required:true,type:"boolean",enum:[false]}),field("destructiveMergePerformed",{required:true,type:"boolean",enum:[false]}),field("knowledgeMutationPerformed",{required:true,type:"boolean",enum:[false]}),field("aiResolutionEqualsCanonicalConfirmation",{required:true,type:"boolean",enum:[false]}),field("visualSimilarityEqualsIdentity",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "entityMergeSplitCandidate", id: VERSION_MANIFEST.getContractId("entityMergeSplitCandidate"), name: "EXTERNAL-010 Entity Merge / Split Candidate Contract", version: VERSION_MANIFEST.getContractVersion("entityMergeSplitCandidate"), immutable: true,
      fields: [field("entityMergeSplitCandidateId",{required:true,type:"string"}),field("operation",{required:true,type:"string",enum:["MERGE","SPLIT"]}),field("entityIds",{required:true,type:"array"}),field("proposedEntityIds",{required:true,type:"array"}),field("evidenceRefs",{required:true,type:"array"}),field("resolverId",{required:true,type:"string"}),field("resolverVersion",{required:true,type:"string"}),field("destructiveOperationPerformed",{required:true,type:"boolean",enum:[false]}),field("canonicalRegistryMutationPerformed",{required:true,type:"boolean",enum:[false]}),field("approvalGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})]
    },
    {
      key: "phase7ValidationResult", id: VERSION_MANIFEST.getContractId("phase7ValidationResult"), name: "EXTERNAL-010 Phase 07 Validation Result Contract", version: VERSION_MANIFEST.getContractVersion("phase7ValidationResult"), immutable: true,
      fields: [field("id",{required:true,type:"string"}),field("componentId",{required:true,type:"string",enum:["EXTERNAL-010"]}),field("version",{required:true,type:"string"}),field("implementationPhase",{required:true,type:"string"}),field("decisionCoverage",{required:true,type:"number",enum:[54]}),field("passed",{required:true,type:"number"}),field("failed",{required:true,type:"number"}),field("total",{required:true,type:"number"}),field("health",{required:true,type:"number"}),field("criticalFailed",{required:true,type:"number"}),field("status",{required:true,type:"string"}),field("releaseAllowed",{required:true,type:"boolean"}),field("phase7Complete",{required:true,type:"boolean"}),field("phase8Allowed",{required:true,type:"boolean"}),field("validatedAt",{required:true,type:"string"})]
    },
    { key:"analyticalCapability", id:VERSION_MANIFEST.getContractId("analyticalCapability"), name:"EXTERNAL-010 Analytical Capability Contract", version:VERSION_MANIFEST.getContractVersion("analyticalCapability"), immutable:true, fields:[field("capabilityId",{required:true,type:"string"}),field("recordVersion",{required:true,type:"string"}),field("capabilityType",{required:true,type:"string"}),field("providerId",{required:true,type:"string"}),field("modelFamily",{required:true,type:"string"}),field("modelVersion",{required:true,type:"string"}),field("algorithmVersion",{required:true,type:"string"}),field("supportedTasks",{required:true,type:"array"}),field("supportedDomains",{required:true,type:"array"}),field("supportedHorizons",{required:true,type:"array"}),field("supportedInputTypes",{required:true,type:"array"}),field("costProfile",{required:true,type:"object"}),field("latencyProfile",{required:true,type:"object"}),field("availabilityState",{required:true,type:"string"}),field("dataHandlingPolicy",{required:true,type:"object"}),field("roles",{required:true,type:"array"}),field("outputClassifications",{required:true,type:"array"}),field("modelNameEqualsStableAnalyticalIdentity",{required:true,type:"boolean",enum:[false]}),field("analysisOutputIsPrimaryEvidence",{required:true,type:"boolean",enum:[false]}),field("highPerformanceGrantsActionAuthority",{required:true,type:"boolean",enum:[false]}),field("automaticPromotionPerformed",{required:true,type:"boolean",enum:[false]}),field("secretValueStored",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("updatedAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"capabilityPerformanceProfile", id:VERSION_MANIFEST.getContractId("capabilityPerformanceProfile"), name:"EXTERNAL-010 Capability Performance Profile Contract", version:VERSION_MANIFEST.getContractVersion("capabilityPerformanceProfile"), immutable:true, fields:[field("performanceProfileId",{required:true,type:"string"}),field("capabilityId",{required:true,type:"string"}),field("capabilityRecordVersion",{required:true,type:"string"}),field("taskType",{required:true,type:"string"}),field("domain",{required:true,type:"string"}),field("horizon",{required:true,type:"string"}),field("evaluationType",{required:true,type:"string"}),field("sampleCount",{required:true,type:"number"}),field("metrics",{required:true,type:"object"}),field("outcomeGrounded",{required:true,type:"boolean"}),field("evaluationEvidenceRefs",{required:true,type:"array"}),field("performanceGrantsRoutingAuthority",{required:true,type:"boolean",enum:[false]}),field("performanceGrantsActionAuthority",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"capabilityRoutingCandidate", id:VERSION_MANIFEST.getContractId("capabilityRoutingCandidate"), name:"EXTERNAL-010 Capability Routing Candidate Contract", version:VERSION_MANIFEST.getContractVersion("capabilityRoutingCandidate"), immutable:true, fields:[field("routingCandidateId",{required:true,type:"string"}),field("taskType",{required:true,type:"string"}),field("domain",{required:true,type:"string"}),field("horizon",{required:true,type:"string"}),field("inputType",{required:true,type:"string"}),field("dataClass",{required:true,type:"string"}),field("eligibleCapabilityIds",{required:true,type:"array"}),field("blockedCapabilityIds",{required:true,type:"array"}),field("candidateDetails",{required:true,type:"array"}),field("automaticWinnerSelected",{required:true,type:"boolean",enum:[false]}),field("routingGrantsExecutionAuthority",{required:true,type:"boolean",enum:[false]}),field("routingGrantsBusinessAuthority",{required:true,type:"boolean",enum:[false]}),field("agreementEqualsTruth",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"analysisExecutionRecord", id:VERSION_MANIFEST.getContractId("analysisExecutionRecord"), name:"EXTERNAL-010 Analysis Execution Record Contract", version:VERSION_MANIFEST.getContractVersion("analysisExecutionRecord"), immutable:true, fields:[field("analysisExecutionId",{required:true,type:"string"}),field("capabilityId",{required:true,type:"string"}),field("capabilityRecordVersion",{required:true,type:"string"}),field("taskType",{required:true,type:"string"}),field("domain",{required:true,type:"string"}),field("horizon",{required:true,type:"string"}),field("inputReferenceIds",{required:true,type:"array"}),field("outputReferenceIds",{required:true,type:"array"}),field("outputClassification",{required:true,type:"string"}),field("executionState",{required:true,type:"string"}),field("aiAnalysisEqualsPrimaryEvidence",{required:true,type:"boolean",enum:[false]}),field("instructionAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("repositoryAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("financialAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"independentReviewPlan", id:VERSION_MANIFEST.getContractId("independentReviewPlan"), name:"EXTERNAL-010 Independent Review Plan Contract", version:VERSION_MANIFEST.getContractVersion("independentReviewPlan"), immutable:true, fields:[field("reviewPlanId",{required:true,type:"string"}),field("primaryCapabilityId",{required:true,type:"string"}),field("reviewerCapabilityIds",{required:true,type:"array"}),field("purpose",{required:true,type:"string"}),field("requestedOutputClassification",{required:true,type:"string"}),field("primaryExcludedFromReviewerSet",{required:true,type:"boolean",enum:[true]}),field("independentReviewRequired",{required:true,type:"boolean",enum:[true]}),field("modelAgreementEqualsTruth",{required:true,type:"boolean",enum:[false]}),field("automaticExecutionGranted",{required:true,type:"boolean",enum:[false]}),field("automaticPromotionGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"shadowEvaluationRecord", id:VERSION_MANIFEST.getContractId("shadowEvaluationRecord"), name:"EXTERNAL-010 Shadow Evaluation Record Contract", version:VERSION_MANIFEST.getContractVersion("shadowEvaluationRecord"), immutable:true, fields:[field("shadowEvaluationId",{required:true,type:"string"}),field("capabilityId",{required:true,type:"string"}),field("taskType",{required:true,type:"string"}),field("domain",{required:true,type:"string"}),field("horizon",{required:true,type:"string"}),field("metrics",{required:true,type:"object"}),field("evaluationEvidenceRefs",{required:true,type:"array"}),field("shadowSuccess",{required:true,type:"boolean"}),field("automaticPromotionPerformed",{required:true,type:"boolean",enum:[false]}),field("actionAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"capabilityFallbackRecord", id:VERSION_MANIFEST.getContractId("capabilityFallbackRecord"), name:"EXTERNAL-010 Capability Fallback Record Contract", version:VERSION_MANIFEST.getContractVersion("capabilityFallbackRecord"), immutable:true, fields:[field("fallbackRecordId",{required:true,type:"string"}),field("requestedCapabilityId",{required:true,type:"string"}),field("executedCapabilityId",{required:true,type:"string"}),field("reason",{required:true,type:"string"}),field("policyRevalidated",{required:true,type:"boolean"}),field("costRevalidated",{required:true,type:"boolean"}),field("dataPolicyRevalidated",{required:true,type:"boolean"}),field("silentFallback",{required:true,type:"boolean",enum:[false]}),field("fallbackCanBypassPolicy",{required:true,type:"boolean",enum:[false]}),field("fallbackResultEqualsRequestedModelResult",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"snapshotManifest", id:VERSION_MANIFEST.getContractId("snapshotManifest"), name:"EXTERNAL-010 Snapshot Manifest Contract", version:VERSION_MANIFEST.getContractVersion("snapshotManifest"), immutable:true, fields:[field("snapshotManifestId",{required:true,type:"string"}),field("purpose",{required:true,type:"string"}),field("references",{required:true,type:"array"}),field("configurationVersion",{required:true,type:"string"}),field("snapshotBasedReproducibility",{required:true,type:"boolean",enum:[true]}),field("currentStateEqualsHistoricalInputState",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"transformationRecord", id:VERSION_MANIFEST.getContractId("transformationRecord"), name:"EXTERNAL-010 Transformation Record Contract", version:VERSION_MANIFEST.getContractVersion("transformationRecord"), immutable:true, fields:[field("transformationId",{required:true,type:"string"}),field("transformationType",{required:true,type:"string"}),field("transformationVersion",{required:true,type:"string"}),field("inputReferenceIds",{required:true,type:"array"}),field("outputReferenceIds",{required:true,type:"array"}),field("status",{required:true,type:"string"}),field("sourceProvenanceEqualsAnalyticalLineage",{required:true,type:"boolean",enum:[false]}),field("auditEqualsLineage",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"lineageRecord", id:VERSION_MANIFEST.getContractId("lineageRecord"), name:"EXTERNAL-010 Lineage Record Contract", version:VERSION_MANIFEST.getContractVersion("lineageRecord"), immutable:true, fields:[field("lineageRecordId",{required:true,type:"string"}),field("inputReferenceId",{required:true,type:"string"}),field("outputReferenceId",{required:true,type:"string"}),field("relationType",{required:true,type:"string"}),field("lineageState",{required:true,type:"string"}),field("affectedEqualsInvalid",{required:true,type:"boolean",enum:[false]}),field("historicalRecordSilentlyRewritten",{required:true,type:"boolean",enum:[false]}),field("automaticRecomputePerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"recomputeCandidate", id:VERSION_MANIFEST.getContractId("recomputeCandidate"), name:"EXTERNAL-010 Recompute Candidate Contract", version:VERSION_MANIFEST.getContractVersion("recomputeCandidate"), immutable:true, fields:[field("recomputeCandidateId",{required:true,type:"string"}),field("outputReferenceId",{required:true,type:"string"}),field("reason",{required:true,type:"string"}),field("triggerReferenceIds",{required:true,type:"array"}),field("recomputeRequiredEqualsKnownIncorrect",{required:true,type:"boolean",enum:[false]}),field("automaticRecomputePerformed",{required:true,type:"boolean",enum:[false]}),field("approvalGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"phase8ValidationResult", id:VERSION_MANIFEST.getContractId("phase8ValidationResult"), name:"EXTERNAL-010 Phase 08 Validation Result Contract", version:VERSION_MANIFEST.getContractVersion("phase8ValidationResult"), immutable:true, fields:[field("id",{required:true,type:"string"}),field("componentId",{required:true,type:"string",enum:["EXTERNAL-010"]}),field("version",{required:true,type:"string",enum:compatibleReleaseEnum(["1.7.0"])}),field("implementationPhase",{required:true,type:"string"}),field("decisionCoverage",{required:true,type:"number",enum:[54]}),field("passed",{required:true,type:"number"}),field("failed",{required:true,type:"number"}),field("total",{required:true,type:"number"}),field("health",{required:true,type:"number"}),field("criticalFailed",{required:true,type:"number"}),field("status",{required:true,type:"string"}),field("releaseAllowed",{required:true,type:"boolean"}),field("phase8Complete",{required:true,type:"boolean"}),field("phase9Allowed",{required:true,type:"boolean"}),field("validatedAt",{required:true,type:"string"})] },
    { key:"temporalRelationRecord", id:VERSION_MANIFEST.getContractId("temporalRelationRecord"), name:"EXTERNAL-010 Temporal Relation Record Contract", version:VERSION_MANIFEST.getContractVersion("temporalRelationRecord"), immutable:true, fields:[
      field("relationRecordId",{required:true,type:"string"}),field("relationId",{required:true,type:"string"}),field("recordVersion",{required:true,type:"number"}),field("subjectEntityId",{required:true,type:"string"}),field("relationType",{required:true,type:"string"}),field("objectEntityId",{required:true,type:"string"}),field("validFrom",{required:false,type:["string","null"]}),field("validUntil",{required:false,type:["string","null"]}),field("relationState",{required:true,type:"string"}),field("supportingEvidenceIds",{required:true,type:"array"}),field("sourceClaimIds",{required:true,type:"array"}),field("linkedEventIds",{required:true,type:"array"}),field("participantResolutionStates",{required:true,type:"object"}),field("generatedByAI",{required:true,type:"boolean"}),field("canonicalRelationConfirmed",{required:true,type:"boolean",enum:[false]}),field("relationCandidateEqualsVerifiedRelationship",{required:true,type:"boolean",enum:[false]}),field("relationExistenceEqualsCausalImpact",{required:true,type:"boolean",enum:[false]}),field("causalImpactGranted",{required:true,type:"boolean",enum:[false]}),field("historicalRecordPreserved",{required:true,type:"boolean",enum:[true]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"eventRecord", id:VERSION_MANIFEST.getContractId("eventRecord"), name:"EXTERNAL-010 Event Record Contract", version:VERSION_MANIFEST.getContractVersion("eventRecord"), immutable:true, fields:[
      field("eventRecordId",{required:true,type:"string"}),field("eventId",{required:true,type:"string"}),field("recordVersion",{required:true,type:"number"}),field("eventType",{required:true,type:"string"}),field("participants",{required:true,type:"array"}),field("participantResolutionStates",{required:true,type:"object"}),field("locationEntityIds",{required:true,type:"array"}),field("relationIds",{required:true,type:"array"}),field("supportingEvidenceIds",{required:true,type:"array"}),field("sourceClaimIds",{required:true,type:"array"}),field("eventTime",{required:false,type:["string","null"]}),field("startTime",{required:false,type:["string","null"]}),field("endTime",{required:false,type:["string","null"]}),field("announcedAt",{required:false,type:["string","null"]}),field("plannedAt",{required:false,type:["string","null"]}),field("completedAt",{required:false,type:["string","null"]}),field("eventState",{required:true,type:"string"}),field("eventSchemaVersion",{required:true,type:"string"}),field("canonicalEventConfirmed",{required:true,type:"boolean",enum:[false]}),field("claimEqualsEventOccurred",{required:true,type:"boolean",enum:[false]}),field("announcementEqualsCompletion",{required:true,type:"boolean",enum:[false]}),field("planEqualsActualEvent",{required:true,type:"boolean",enum:[false]}),field("eventOccurrenceEqualsCausation",{required:true,type:"boolean",enum:[false]}),field("historicalRecordPreserved",{required:true,type:"boolean",enum:[true]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"eventStateTransition", id:VERSION_MANIFEST.getContractId("eventStateTransition"), name:"EXTERNAL-010 Event State Transition Contract", version:VERSION_MANIFEST.getContractVersion("eventStateTransition"), immutable:true, fields:[
      field("eventStateTransitionId",{required:true,type:"string"}),field("eventId",{required:true,type:"string"}),field("fromState",{required:true,type:"string"}),field("toState",{required:true,type:"string"}),field("fromEventRecordId",{required:true,type:"string"}),field("toEventRecordId",{required:true,type:"string"}),field("supportingEvidenceIds",{required:true,type:"array"}),field("transitionedAt",{required:true,type:"string"}),field("historicalEventRewritePerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"impactEdge", id:VERSION_MANIFEST.getContractId("impactEdge"), name:"EXTERNAL-010 Impact Edge Contract", version:VERSION_MANIFEST.getContractVersion("impactEdge"), immutable:true, fields:[
      field("impactEdgeId",{required:true,type:"string"}),field("fromNodeId",{required:true,type:"string"}),field("toNodeId",{required:true,type:"string"}),field("impactType",{required:true,type:"string"}),field("impactDimension",{required:true,type:"string"}),field("direction",{required:true,type:"string"}),field("impactStrength",{required:false,type:["number","null"]}),field("confidence",{required:false,type:["number","null"]}),field("causalState",{required:true,type:"string"}),field("earliestLag",{required:false,type:["object","null"]}),field("expectedLag",{required:false,type:["object","null"]}),field("latestLag",{required:false,type:["object","null"]}),field("lagDistributionReference",{required:false,type:["string","null"]}),field("lagDistributionHook",{required:true,type:"boolean",enum:[true]}),field("supportingEvidenceIds",{required:true,type:"array"}),field("contradictingEvidenceIds",{required:true,type:"array"}),field("historicalEvidenceIds",{required:true,type:"array"}),field("historicalSampleCount",{required:true,type:"number"}),field("candidateConfounders",{required:true,type:"array"}),field("modelId",{required:true,type:"string"}),field("modelVersion",{required:true,type:"string"}),field("evidenceLineagePreserved",{required:true,type:"boolean",enum:[true]}),field("causalTruthConfirmed",{required:true,type:"boolean",enum:[false]}),field("correlationEqualsCausation",{required:true,type:"boolean",enum:[false]}),field("temporalProximityEqualsCausation",{required:true,type:"boolean",enum:[false]}),field("actionAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("financialAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("updatedAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"impactPath", id:VERSION_MANIFEST.getContractId("impactPath"), name:"EXTERNAL-010 Impact Path Contract", version:VERSION_MANIFEST.getContractVersion("impactPath"), immutable:true, fields:[
      field("impactPathId",{required:true,type:"string"}),field("edgeIds",{required:true,type:"array"}),field("stages",{required:true,type:"array"}),field("pathState",{required:true,type:"string"}),field("currentStageIndex",{required:true,type:"number"}),field("pathTiming",{required:true,type:"object"}),field("modelId",{required:true,type:"string"}),field("modelVersion",{required:true,type:"string"}),field("predictionCandidateOnly",{required:true,type:"boolean",enum:[true]}),field("canonicalCausalTruthConfirmed",{required:true,type:"boolean",enum:[false]}),field("automaticActionPerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"impactObservation", id:VERSION_MANIFEST.getContractId("impactObservation"), name:"EXTERNAL-010 Impact Observation Contract", version:VERSION_MANIFEST.getContractVersion("impactObservation"), immutable:true, fields:[
      field("impactObservationId",{required:true,type:"string"}),field("impactPathId",{required:true,type:"string"}),field("stageIndex",{required:true,type:"number"}),field("stageState",{required:true,type:"string"}),field("observedReferenceId",{required:true,type:"string"}),field("observedAt",{required:true,type:"string"}),field("supportingEvidenceIds",{required:true,type:"array"}),field("remainingEdgeIds",{required:true,type:"array"}),field("remainingLagRecalculationPerformed",{required:true,type:"boolean",enum:[true]}),field("finalOutcomeConfirmed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"historicalAnalogCandidate", id:VERSION_MANIFEST.getContractId("historicalAnalogCandidate"), name:"EXTERNAL-010 Historical Analog Candidate Contract", version:VERSION_MANIFEST.getContractVersion("historicalAnalogCandidate"), immutable:true, fields:[
      field("historicalAnalogCandidateId",{required:true,type:"string"}),field("currentEventId",{required:true,type:"string"}),field("historicalEventId",{required:true,type:"string"}),field("similarityScore",{required:false,type:["number","null"]}),field("similarityDimensions",{required:true,type:"array"}),field("differenceDimensions",{required:true,type:"array"}),field("historicalImpactPathIds",{required:true,type:"array"}),field("outcomeReferences",{required:true,type:"array"}),field("supportingEvidenceIds",{required:true,type:"array"}),field("analysisVersion",{required:true,type:"string"}),field("modelId",{required:true,type:"string"}),field("modelVersion",{required:true,type:"string"}),field("historicalAnalogEqualsSameOutcome",{required:true,type:"boolean",enum:[false]}),field("automaticPredictionGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"scenarioCandidate", id:VERSION_MANIFEST.getContractId("scenarioCandidate"), name:"EXTERNAL-010 Scenario Candidate Contract", version:VERSION_MANIFEST.getContractVersion("scenarioCandidate"), immutable:true, fields:[
      field("scenarioCandidateId",{required:true,type:"string"}),field("triggerEventId",{required:true,type:"string"}),field("impactPathIds",{required:true,type:"array"}),field("historicalAnalogIds",{required:true,type:"array"}),field("expectedStages",{required:true,type:"array"}),field("expectedTiming",{required:true,type:"object"}),field("expectedDirection",{required:true,type:"string"}),field("importantAssumptions",{required:true,type:"array"}),field("riskFactors",{required:true,type:"array"}),field("contradictingEvidenceIds",{required:true,type:"array"}),field("modelId",{required:true,type:"string"}),field("modelVersion",{required:true,type:"string"}),field("scenarioCandidateEqualsFutureFact",{required:true,type:"boolean",enum:[false]}),field("actionAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("financialAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"impactOutcomeEvaluationCandidate", id:VERSION_MANIFEST.getContractId("impactOutcomeEvaluationCandidate"), name:"EXTERNAL-010 Impact Outcome Evaluation Candidate Contract", version:VERSION_MANIFEST.getContractVersion("impactOutcomeEvaluationCandidate"), immutable:true, fields:[
      field("impactOutcomeEvaluationCandidateId",{required:true,type:"string"}),field("impactPathId",{required:true,type:"string"}),field("actualOutcomeReferenceId",{required:true,type:"string"}),field("directionAssessment",{required:true,type:"string"}),field("magnitudeAssessment",{required:true,type:"string"}),field("timingAssessment",{required:true,type:"string"}),field("pathAssessment",{required:true,type:"string"}),field("confidenceAssessment",{required:true,type:"string"}),field("failedPredictionPreserved",{required:true,type:"boolean",enum:[true]}),field("modelRecalibrationCandidate",{required:true,type:"boolean",enum:[true]}),field("automaticModelUpdatePerformed",{required:true,type:"boolean",enum:[false]}),field("knowledgePromotionPerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})
    ] },
    { key:"phase9ValidationResult", id:VERSION_MANIFEST.getContractId("phase9ValidationResult"), name:"EXTERNAL-010 Phase 09 Validation Result Contract", version:VERSION_MANIFEST.getContractVersion("phase9ValidationResult"), immutable:true, fields:[field("id",{required:true,type:"string"}),field("componentId",{required:true,type:"string",enum:["EXTERNAL-010"]}),field("version",{required:true,type:"string"}),field("implementationPhase",{required:true,type:"string"}),field("decisionCoverage",{required:true,type:"number",enum:[54]}),field("passed",{required:true,type:"number"}),field("failed",{required:true,type:"number"}),field("total",{required:true,type:"number"}),field("health",{required:true,type:"number"}),field("criticalFailed",{required:true,type:"number"}),field("status",{required:true,type:"string"}),field("releaseAllowed",{required:true,type:"boolean"}),field("phase9Complete",{required:true,type:"boolean"}),field("phase10Allowed",{required:true,type:"boolean"}),field("validatedAt",{required:true,type:"string"})] },
    { key:"reliabilitySignal", id:VERSION_MANIFEST.getContractId("reliabilitySignal"), name:"EXTERNAL-010 Reliability Signal Contract", version:VERSION_MANIFEST.getContractVersion("reliabilitySignal"), immutable:true, fields:[field("reliabilitySignalId",{required:true,type:"string"}),field("sourceId",{required:true,type:"string"}),field("observationWindow",{required:true,type:"string"}),field("requestCount",{required:true,type:"number"}),field("successCount",{required:true,type:"number"}),field("timeoutCount",{required:true,type:"number"}),field("schemaFailureCount",{required:true,type:"number"}),field("averageLatencyMs",{required:true,type:["number","null"]}),field("freshnessState",{required:true,type:"string"}),field("correctionObserved",{required:true,type:"boolean"}),field("operationalReliabilityOnly",{required:true,type:"boolean",enum:[true]}),field("factualReliabilityDetermined",{required:true,type:"boolean",enum:[false]}),field("reliabilityScore",{required:true,type:"null"}),field("authorityScore",{required:true,type:"null"}),field("finalReliabilityAuthority",{required:true,type:"string",enum:["EXTERNAL-020"]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"evidenceQualitySignal", id:VERSION_MANIFEST.getContractId("evidenceQualitySignal"), name:"EXTERNAL-010 Evidence Quality Signal Contract", version:VERSION_MANIFEST.getContractVersion("evidenceQualitySignal"), immutable:true, fields:[field("qualitySignalId",{required:true,type:"string"}),field("evidenceId",{required:true,type:"string"}),field("sourceId",{required:true,type:["string","null"]}),field("sourceRole",{required:true,type:"string",enum:["PRIMARY","OFFICIAL","SECONDARY","AGGREGATOR","COMMUNITY","AI_GENERATED","UNKNOWN"]}),field("contentPresent",{required:true,type:"boolean"}),field("schemaValid",{required:true,type:"boolean"}),field("timestampPresent",{required:true,type:"boolean"}),field("sourceIdentityResolved",{required:true,type:"boolean"}),field("contentHashVerified",{required:true,type:"boolean"}),field("provenanceComplete",{required:true,type:"boolean"}),field("temporalMetadataComplete",{required:true,type:"boolean"}),field("qualityScore",{required:true,type:"null"}),field("authorityScore",{required:true,type:"null"}),field("truthConfirmed",{required:true,type:"boolean",enum:[false]}),field("finalReliabilityAuthority",{required:true,type:"string",enum:["EXTERNAL-020"]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"reliabilityCandidate", id:VERSION_MANIFEST.getContractId("reliabilityCandidate"), name:"EXTERNAL-010 Reliability Candidate Contract", version:VERSION_MANIFEST.getContractVersion("reliabilityCandidate"), immutable:true, fields:[field("candidateId",{required:true,type:"string"}),field("candidateType",{required:true,type:"string",enum:["CONTRADICTION","CONFIRMATION"]}),field("subjectRef",{required:true,type:["string","null"]}),field("field",{required:true,type:["string","null"]}),field("period",{required:true,type:["string","null"]}),field("evidenceIds",{required:true,type:"array"}),field("independenceVerified",{required:true,type:"boolean"}),field("conflictWinner",{required:true,type:"null"}),field("truthConfirmed",{required:true,type:"boolean",enum:[false]}),field("automaticResolutionPerformed",{required:true,type:"boolean",enum:[false]}),field("duplicateEqualsIndependentConfirmation",{required:true,type:"boolean",enum:[false]}),field("finalReliabilityAuthority",{required:true,type:"string",enum:["EXTERNAL-020"]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"reliabilityInputPackage", id:VERSION_MANIFEST.getContractId("reliabilityInputPackage"), name:"EXTERNAL-020 Reliability Input Contract", version:VERSION_MANIFEST.getContractVersion("reliabilityInputPackage"), immutable:true, fields:[field("operationalSignals",{required:true,type:"array"}),field("evidenceQualitySignals",{required:true,type:"array"}),field("contradictionCandidates",{required:true,type:"array"}),field("confirmationCandidates",{required:true,type:"array"}),field("finalReliabilityAuthority",{required:true,type:"string",enum:["EXTERNAL-020"]}),field("generatedAt",{required:true,type:"string"})] },
    { key:"predictionRecord", id:VERSION_MANIFEST.getContractId("predictionRecord"), name:"EXTERNAL-010 Prediction Record Contract", version:VERSION_MANIFEST.getContractVersion("predictionRecord"), immutable:true, fields:[field("predictionId",{required:true,type:"string"}),field("version",{required:true,type:"number"}),field("predictionRecordId",{required:true,type:"string"}),field("subjectRef",{required:true,type:["string","null"]}),field("predictionType",{required:true,type:"string"}),field("targetTime",{required:true,type:["string","null"]}),field("probabilityState",{required:true,type:"string",enum:["NOT_ESTIMATED","QUALITATIVE","RANGE","POINT_ESTIMATE","UNKNOWN"]}),field("probability",{required:true,type:["number","null"]}),field("estimateConfidence",{required:true,type:"string"}),field("evidenceStrength",{required:true,type:"string"}),field("historicalSampleCount",{required:true,type:["number","null"]}),field("predictionInterval",{required:true,type:["object","null"]}),field("uncertaintyFactors",{required:true,type:"array"}),field("modelId",{required:true,type:["string","null"]}),field("modelVersion",{required:true,type:["string","null"]}),field("evidenceIds",{required:true,type:"array"}),field("outcomeReference",{required:true,type:["string","null"]}),field("calibrationState",{required:true,type:"string"}),field("supersedesPredictionRecordId",{required:true,type:["string","null"]}),field("probabilityInvented",{required:true,type:"boolean",enum:[false]}),field("canonicalTruthConfirmed",{required:true,type:"boolean",enum:[false]}),field("actionAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"benchmarkDefinition", id:VERSION_MANIFEST.getContractId("benchmarkDefinition"), name:"EXTERNAL-010 Benchmark Definition Contract", version:VERSION_MANIFEST.getContractVersion("benchmarkDefinition"), immutable:true, fields:[field("benchmarkDefinitionId",{required:true,type:"string"}),field("version",{required:true,type:"number"}),field("targetMetric",{required:true,type:"string"}),field("measurementMethod",{required:true,type:"string"}),field("targetWindow",{required:true,type:["string","null"]}),field("unit",{required:true,type:["string","null"]}),field("currency",{required:true,type:["string","null"]}),field("adjustmentMethod",{required:true,type:["string","null"]}),field("eventCompletionCriteria",{required:true,type:["string","null"]}),field("dataSourcePolicy",{required:true,type:["string","null"]}),field("timezone",{required:true,type:"string"}),field("supersedesBenchmarkVersion",{required:true,type:["number","string","null"]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"outcomeRecord", id:VERSION_MANIFEST.getContractId("outcomeRecord"), name:"EXTERNAL-010 Versioned Outcome Record Contract", version:VERSION_MANIFEST.getContractVersion("outcomeRecord"), immutable:true, fields:[field("outcomeId",{required:true,type:"string"}),field("version",{required:true,type:"number"}),field("outcomeRecordId",{required:true,type:"string"}),field("predictionId",{required:true,type:["string","null"]}),field("benchmarkDefinitionId",{required:true,type:"string"}),field("outcomeType",{required:true,type:"string"}),field("targetEntityId",{required:true,type:["string","null"]}),field("targetMetric",{required:true,type:["string","null"]}),field("observationTime",{required:true,type:["string","null"]}),field("effectiveTime",{required:true,type:["string","null"]}),field("settlementState",{required:true,type:"string"}),field("value",{required:true}),field("unit",{required:true,type:["string","null"]}),field("currency",{required:true,type:["string","null"]}),field("supportingEvidenceIds",{required:true,type:"array"}),field("sourceRole",{required:true,type:"string"}),field("referenceOutcome",{required:true,type:"boolean"}),field("supersedesOutcomeRecordId",{required:true,type:["string","null"]}),field("absoluteTruthClaimed",{required:true,type:"boolean",enum:[false]}),field("historyOverwritePerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"outcomeEvaluation", id:VERSION_MANIFEST.getContractId("outcomeEvaluation"), name:"EXTERNAL-010 Outcome Evaluation Contract", version:VERSION_MANIFEST.getContractVersion("outcomeEvaluation"), immutable:true, fields:[field("evaluationId",{required:true,type:"string"}),field("predictionRecordId",{required:true,type:"string"}),field("referenceOutcomeRecordId",{required:true,type:"string"}),field("benchmarkDefinitionId",{required:true,type:"string"}),field("evaluationState",{required:true,type:"string"}),field("calibrationState",{required:true,type:"string"}),field("truthAuthorityGranted",{required:true,type:"boolean",enum:[false]}),field("automaticActionPerformed",{required:true,type:"boolean",enum:[false]}),field("createdAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] },
    { key:"phase10ValidationResult", id:VERSION_MANIFEST.getContractId("phase10ValidationResult"), name:"EXTERNAL-010 Phase 10 Validation Result Contract", version:VERSION_MANIFEST.getContractVersion("phase10ValidationResult"), immutable:true, fields:[field("id",{required:true,type:"string"}),field("componentId",{required:true,type:"string",enum:["EXTERNAL-010"]}),field("version",{required:true,type:"string"}),field("gatewayVersion",{required:true,type:"string"}),field("implementationPhase",{required:true,type:"string"}),field("decisionCoverage",{required:true,type:"number",enum:[54]}),field("passed",{required:true,type:"number"}),field("failed",{required:true,type:"number"}),field("total",{required:true,type:"number"}),field("health",{required:true,type:"number"}),field("criticalFailed",{required:true,type:"number"}),field("status",{required:true,type:"string"}),field("releaseAllowed",{required:true,type:"boolean"}),field("phase10Complete",{required:true,type:"boolean"}),field("phase11Allowed",{required:true,type:"boolean"}),field("checks",{required:true,type:"array"}),field("validatedAt",{required:true,type:"string"}),field("immutable",{required:true,type:"boolean",enum:[true]})] }

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
