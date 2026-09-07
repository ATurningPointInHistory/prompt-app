/* ============================================================
   FILE: 17_external_intelligence_schema_registry.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.7.0
   Phase 08: Analytical Capability Registry / Unified Lineage
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 schema registry blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("schemaRegistry");

  function schema(id, name, required, properties) {
    return Object.freeze({
      schemaId: id,
      name: name,
      version: "1.0.0",
      type: "object",
      required: Object.freeze(required.slice()),
      properties: Object.freeze(properties),
      additionalProperties: true,
      immutable: true,
      owner: "EXTERNAL-010",
      source: "built-in"
    });
  }

  const BUILT_IN_SCHEMAS = Object.freeze([
    schema("EXTERNAL-010-SCHEMA-FOUNDATION-STATE", "External Intelligence Foundation State",
      ["componentId", "componentName", "version", "implementationPhase", "designFreezeId", "decisionRange", "decisionCount", "initialized", "safety"], {
        componentId: { type: "string", enum: ["EXTERNAL-010"] },
        componentName: { type: "string" },
        version: { type: "string" },
        implementationPhase: { type: "string" },
        designFreezeId: { type: "string" },
        decisionRange: { type: "string" },
        decisionCount: { type: "number", enum: [54] },
        initialized: { type: "boolean" },
        safety: { type: "object" }
      }),
    schema("EXTERNAL-010-SCHEMA-AUTHORITY-ENVELOPE", "External Intelligence Authority Envelope",
      ["authorityEnvelopeId", "action", "target", "purpose", "scope", "state", "createdAt", "immutable"], {
        authorityEnvelopeId: { type: "string" }, action: { type: "string" }, target: { type: "object" }, purpose: { type: "string" }, scope: { type: "object" },
        state: { type: "string", enum: ["CANDIDATE", "ACTIVE", "EXPIRED", "REVOKED", "BLOCKED"] }, approvalEvidenceId: { type: ["string", "null"] },
        createdAt: { type: "string" }, expiresAt: { type: ["string", "null"] }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-AUDIT-EVENT", "External Intelligence Audit Event",
      ["auditEventId", "componentId", "sequence", "eventType", "actor", "outcome", "details", "eventHash", "appendOnly", "immutable", "createdAt"], {
        auditEventId: { type: "string" }, componentId: { type: "string", enum: ["EXTERNAL-010"] }, sequence: { type: "number" }, eventType: { type: "string" },
        actor: { type: "string" }, outcome: { type: "string" }, details: { type: "object" }, previousEventHash: { type: ["string", "null"] },
        eventHash: { type: "string", pattern: "^[a-f0-9]{64}$" }, appendOnly: { type: "boolean", enum: [true] }, immutable: { type: "boolean", enum: [true] }, createdAt: { type: "string" }
      }),
    schema("EXTERNAL-010-SCHEMA-VALIDATION-RESULT", "External Intelligence Phase Validation Result",
      ["id", "componentId", "version", "passed", "failed", "total", "health", "criticalFailed", "status", "releaseAllowed", "phase2Allowed", "validatedAt"], {
        id: { type: "string" }, componentId: { type: "string", enum: ["EXTERNAL-010"] }, version: { type: "string" }, passed: { type: "number" }, failed: { type: "number" }, total: { type: "number" },
        health: { type: "number" }, criticalFailed: { type: "number" }, status: { type: "string" }, releaseAllowed: { type: "boolean" }, phase2Allowed: { type: "boolean" }, validatedAt: { type: "string" }
      }),
    schema("EXTERNAL-010-SCHEMA-PROMOTION-BOUNDARY", "External Intelligence Promotion Boundary",
      ["promotionBoundaryId", "candidateType", "automaticPromotionAllowed", "canonicalMutationPerformed", "validationEqualsApproval", "authorityEffect", "createdAt", "immutable"], {
        promotionBoundaryId: { type: "string" }, candidateType: { type: "string" }, automaticPromotionAllowed: { type: "boolean", enum: [false] }, canonicalMutationPerformed: { type: "boolean", enum: [false] },
        validationEqualsApproval: { type: "boolean", enum: [false] }, authorityEffect: { type: "string", enum: ["none"] }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-GATEWAY-RUNTIME-STATE", "External Intelligence Gateway Runtime State",
      ["runtimeInstanceId", "runtimeType", "runtimeVersion", "startupEpoch", "startedAt", "healthState", "executionAuthorityGranted", "businessAuthorityGranted", "immutable"], {
        runtimeInstanceId: { type: "string" }, runtimeType: { type: "string" }, runtimeVersion: { type: "string" }, startupEpoch: { type: "string" }, startedAt: { type: "string" },
        healthState: { type: "string" }, executionAuthorityGranted: { type: "boolean", enum: [false] }, businessAuthorityGranted: { type: "boolean", enum: [false] }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-GATEWAY-SESSION-METADATA", "External Intelligence Gateway Session Metadata",
      ["gatewaySessionId", "runtimeInstanceId", "issuedAt", "expiresAt", "state", "origin", "contractVersion", "tokenPersisted"], {
        gatewaySessionId: { type: "string" }, runtimeInstanceId: { type: "string" }, issuedAt: { type: "string" }, expiresAt: { type: "string" },
        state: { type: "string", enum: ["ACTIVE", "EXPIRING", "EXPIRED", "REVOKED", "INVALID", "RUNTIME_INVALIDATED"] }, origin: { type: "string" }, contractVersion: { type: "string" }, tokenPersisted: { type: "boolean", enum: [false] }
      }),
    schema("EXTERNAL-010-SCHEMA-RUNTIME-COORDINATION-RECORD", "External Intelligence Runtime Coordination Record",
      ["coordinationRecordId", "recordType", "state", "createdAt", "immutable"], {
        coordinationRecordId: { type: "string" }, recordType: { type: "string" }, state: { type: "string" }, executionAuthorityGranted: { type: "boolean" }, businessAuthorityGranted: { type: "boolean" },
        createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-DEPENDENCY-CANDIDATE", "External Intelligence Dependency Candidate",
      ["dependencyId", "packageEcosystem", "packageName", "version", "sourceType", "purpose", "runtimeTarget", "admissionState", "automaticInstallAllowed", "hardSecurityFail", "elevatedSecurityExceptionGranted", "createdAt", "immutable"], {
        dependencyId: { type: "string" }, packageEcosystem: { type: "string" }, packageName: { type: "string" }, version: { type: "string" }, sourceType: { type: "string" }, purpose: { type: "string" }, runtimeTarget: { type: "string" },
        admissionState: { type: "string" }, automaticInstallAllowed: { type: "boolean", enum: [false] }, hardSecurityFail: { type: "boolean" }, elevatedSecurityExceptionGranted: { type: "boolean", enum: [false] }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-RUNTIME-PROFILE", "External Intelligence Runtime Profile",
      ["runtimeProfileId", "nodeVersion", "pythonVersion", "dependencyManifestHash", "dependencyCount", "externalDependencyCount", "validationState", "automaticInstallAllowed", "createdAt", "immutable"], {
        runtimeProfileId: { type: "string" }, nodeVersion: { type: "string" }, pythonVersion: { type: "string" }, dependencyManifestHash: { type: "string" }, dependencyCount: { type: "number" }, externalDependencyCount: { type: "number" },
        validationState: { type: "string" }, automaticInstallAllowed: { type: "boolean", enum: [false] }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-PHASE2-VALIDATION-RESULT", "External Intelligence Phase 02 Validation Result",
      ["id", "componentId", "version", "implementationPhase", "passed", "failed", "total", "health", "criticalFailed", "status", "releaseAllowed", "phase2Complete", "phase3Allowed", "validatedAt"], {
        id: { type: "string" }, componentId: { type: "string", enum: ["EXTERNAL-010"] }, version: { type: "string", enum: ["1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"] }, implementationPhase: { type: "string" },
        passed: { type: "number" }, failed: { type: "number" }, total: { type: "number" }, health: { type: "number" }, criticalFailed: { type: "number" }, status: { type: "string" },
        releaseAllowed: { type: "boolean" }, phase2Complete: { type: "boolean" }, phase3Allowed: { type: "boolean" }, validatedAt: { type: "string" }
      }),
    schema("EXTERNAL-010-SCHEMA-SOURCE-RECORD", "External Intelligence Governed Source Record",
      ["sourceId", "sourceName", "sourceType", "provider", "accessMode", "adapterId", "endpointPolicy", "authenticationMode", "allowedOperations", "allowedMethods", "pricingMode", "enabled", "lifecycleState", "version", "identityState", "reliabilityState", "authorityGranted", "createdAt", "updatedAt", "immutable"], {
        sourceId: { type: "string", pattern: "^SOURCE-[A-Z0-9-]+$" }, sourceName: { type: "string" }, sourceType: { type: "string" }, provider: { type: "string" }, category: { type: "string" }, accessMode: { type: "string" }, adapterId: { type: "string" },
        endpointPolicy: { type: "object" }, authenticationMode: { type: "string" }, secretReferenceId: { type: ["string", "null"] }, allowedOperations: { type: "array" }, allowedMethods: { type: "array" }, pricingMode: { type: "string" }, costCurrency: { type: "string" },
        enabled: { type: "boolean" }, lifecycleState: { type: "string" }, version: { type: "number" }, identityState: { type: "string" }, reliabilityState: { type: "string" }, authorityGranted: { type: "boolean", enum: [false] }, discoveryId: { type: ["string", "null"] }, createdAt: { type: "string" }, updatedAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-SOURCE-DISCOVERY-RECORD", "External Intelligence Source Discovery Record",
      ["discoveryId", "candidateLocation", "discoveredAt", "discoveredBy", "discoveryReason", "sourceTypeCandidate", "lifecycleState", "identityState", "riskClassification", "costClassification", "authenticationRequirement", "operationRisk", "activationAuthorityGranted", "registrationAuthorityGranted", "provenance", "createdAt", "updatedAt", "immutable"], {
        discoveryId: { type: "string" }, candidateLocation: { type: "string" }, discoveredAt: { type: "string" }, discoveredBy: { type: "string" }, discoveryReason: { type: "string" }, goalId: { type: ["string", "null"] }, planId: { type: ["string", "null"] }, sourceTypeCandidate: { type: "string" }, lifecycleState: { type: "string" },
        identityState: { type: "string" }, riskClassification: { type: "string" }, costClassification: { type: "string" }, authenticationRequirement: { type: "string" }, operationRisk: { type: "string" }, activationAuthorityGranted: { type: "boolean", enum: [false] }, registrationAuthorityGranted: { type: "boolean", enum: [false] }, sourceId: { type: ["string", "null"] }, provenance: { type: "object" }, createdAt: { type: "string" }, updatedAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-CONTROLLED-INSPECTION-RECORD", "External Intelligence Controlled Inspection Record",
      ["inspectionId", "discoveryId", "inspectionPurpose", "networkAuthorityGranted", "activationAuthorityGranted", "contentInstructionAuthorityGranted", "securityBoundaryRequired", "state", "createdAt", "immutable"], {
        inspectionId: { type: "string" }, discoveryId: { type: "string" }, inspectionPurpose: { type: "string" }, networkAuthorityGranted: { type: "boolean", enum: [false] }, activationAuthorityGranted: { type: "boolean", enum: [false] }, contentInstructionAuthorityGranted: { type: "boolean", enum: [false] }, securityBoundaryRequired: { type: "boolean", enum: [true] }, state: { type: "string" }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-RESOURCE-BUDGET", "External Intelligence Resource Budget",
      ["budgetId", "scopeType", "scopeId", "period", "currency", "limits", "consumed", "state", "authorityGranted", "automaticReallocationAllowed", "version", "createdAt", "updatedAt", "immutable"], {
        budgetId: { type: "string" }, scopeType: { type: "string" }, scopeId: { type: "string" }, parentBudgetId: { type: ["string", "null"] }, period: { type: "object" }, currency: { type: "string" }, limits: { type: "object" }, consumed: { type: "object" }, state: { type: "string" }, authorityGranted: { type: "boolean", enum: [false] }, automaticReallocationAllowed: { type: "boolean", enum: [false] }, version: { type: "number" }, createdAt: { type: "string" }, updatedAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-RESOURCE-USAGE-RECORD", "External Intelligence Resource Usage Record",
      ["usageRecordId", "operationId", "budgetIds", "estimatedUsage", "actualUsage", "reconciled", "createdAt", "immutable"], {
        usageRecordId: { type: "string" }, operationId: { type: "string" }, budgetIds: { type: "array" }, estimatedUsage: { type: "object" }, actualUsage: { type: "object" }, sourceId: { type: ["string", "null"] }, goalId: { type: ["string", "null"] }, planId: { type: ["string", "null"] }, reconciled: { type: "boolean" }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-USAGE-POLICY", "External Intelligence Usage Policy",
      ["usagePolicyId", "sourceId", "policyVersion", "observedAt", "policyEvidenceIds", "analysisVersion", "status", "rights", "policyCompleteness", "interpretationConfidence", "aiInterpretationEqualsLegalAuthority", "policyChangeDetected", "createdAt", "updatedAt", "immutable"], {
        usagePolicyId: { type: "string" }, sourceId: { type: "string" }, policyVersion: { type: "string" }, effectiveAt: { type: ["string", "null"] }, observedAt: { type: "string" }, policyEvidenceIds: { type: "array" }, analysisVersion: { type: "string" }, status: { type: "string" }, rights: { type: "object" }, policyCompleteness: { type: "string" }, interpretationConfidence: { type: "string" }, aiInterpretationEqualsLegalAuthority: { type: "boolean", enum: [false] }, previousPolicyId: { type: ["string", "null"] }, policyChangeDetected: { type: "boolean" }, createdAt: { type: "string" }, updatedAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-PHASE3-VALIDATION-RESULT", "External Intelligence Phase 03 Validation Result",
      ["id", "componentId", "version", "implementationPhase", "decisionCoverage", "passed", "failed", "total", "health", "criticalFailed", "status", "releaseAllowed", "phase3Complete", "phase4Allowed", "validatedAt"], {
        id: { type: "string" }, componentId: { type: "string", enum: ["EXTERNAL-010"] }, version: { type: "string", enum: ["1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"] }, implementationPhase: { type: "string" }, decisionCoverage: { type: "number", enum: [54] }, passed: { type: "number" }, failed: { type: "number" }, total: { type: "number" }, health: { type: "number" }, criticalFailed: { type: "number" }, status: { type: "string" }, releaseAllowed: { type: "boolean" }, phase3Complete: { type: "boolean" }, phase4Allowed: { type: "boolean" }, validatedAt: { type: "string" }
      }),
    schema("EXTERNAL-010-SCHEMA-SOURCE-OPERATION-CONTRACT", "External Intelligence Source Operation Contract",
      ["operationContractId", "sourceId", "operationId", "adapterId", "method", "endpoint", "parameterPolicy", "timeoutPolicy", "retryPolicy", "responseMode", "executionHints", "estimatedUsage", "enabled", "authorityGranted", "createdAt", "updatedAt", "immutable"], {
        operationContractId: { type: "string" }, sourceId: { type: "string" }, operationId: { type: "string" }, adapterId: { type: "string" }, method: { type: "string", enum: ["GET"] },
        endpoint: { type: "object" }, parameterPolicy: { type: "object" }, timeoutPolicy: { type: "object" }, retryPolicy: { type: "object" }, responseMode: { type: "string" }, executionHints: { type: "object" }, estimatedUsage: { type: "object" },
        enabled: { type: "boolean" }, authorityGranted: { type: "boolean", enum: [false] }, createdAt: { type: "string" }, updatedAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-ACQUISITION-REQUEST", "External Intelligence Unified Acquisition Request",
      ["requestId", "sourceId", "operationId", "parameters", "requestedAt", "priority", "executionPreference", "timeoutPolicy", "retryPolicy", "requestContext", "purpose", "requestedBy", "budgetIds", "status", "executionAuthorityGranted", "validationGrantsExecutionAuthority", "immutable"], {
        requestId: { type: "string" }, sourceId: { type: "string" }, operationId: { type: "string" }, parameters: { type: "object" }, requestedAt: { type: "string" }, priority: { type: "string" }, executionPreference: { type: "string" },
        timeoutPolicy: { type: "object" }, retryPolicy: { type: "object" }, idempotencyKey: { type: ["string", "null"] }, requestContext: { type: "object" }, purpose: { type: "string" }, requestedBy: { type: "string" },
        correlationId: { type: ["string", "null"] }, budgetIds: { type: "array" }, acquisitionPlanId: { type: ["string", "null"] }, researchGoalId: { type: ["string", "null"] }, status: { type: "string" },
        executionAuthorityGranted: { type: "boolean", enum: [false] }, validationGrantsExecutionAuthority: { type: "boolean", enum: [false] }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-ACQUISITION-ATTEMPT", "External Intelligence Acquisition Attempt",
      ["attemptId", "requestId", "sourceId", "operationId", "attemptNumber", "adapterId", "adapterVersion", "startedAt", "status", "retryable", "immutable"], {
        attemptId: { type: "string" }, requestId: { type: "string" }, sourceId: { type: "string" }, operationId: { type: "string" }, attemptNumber: { type: "number" }, adapterId: { type: "string" }, adapterVersion: { type: "string" },
        routeId: { type: ["string", "null"] }, startedAt: { type: "string" }, completedAt: { type: ["string", "null"] }, status: { type: "string" }, retryable: { type: "boolean" }, errorId: { type: ["string", "null"] }, responseId: { type: ["string", "null"] }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-ACQUISITION-RESPONSE", "External Intelligence Acquisition Response",
      ["responseId", "requestId", "attemptId", "sourceId", "operationId", "status", "responseMetadata", "temporalMetadata", "evidenceInput", "externalResponseGrantsAuthority", "knowledgePromotionPerformed", "canonicalRepositoryMutationPerformed", "createdAt", "immutable"], {
        responseId: { type: "string" }, requestId: { type: "string" }, attemptId: { type: "string" }, sourceId: { type: "string" }, operationId: { type: "string" }, status: { type: "string" },
        responseMetadata: { type: "object" }, temporalMetadata: { type: "object" }, evidenceInput: { type: "object" }, externalResponseGrantsAuthority: { type: "boolean", enum: [false] },
        knowledgePromotionPerformed: { type: "boolean", enum: [false] }, canonicalRepositoryMutationPerformed: { type: "boolean", enum: [false] }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-ACQUISITION-ERROR", "External Intelligence Acquisition Error",
      ["errorId", "errorCode", "category", "message", "retryable", "sourceId", "operationId", "requestId", "attemptId", "occurredAt", "secretRedacted", "immutable"], {
        errorId: { type: "string" }, errorCode: { type: "string" }, category: { type: "string" }, message: { type: "string" }, retryable: { type: "boolean" }, sourceId: { type: "string" }, operationId: { type: "string" },
        requestId: { type: "string" }, attemptId: { type: "string" }, occurredAt: { type: "string" }, rawProviderStatus: { type: ["string", "null"] }, secretRedacted: { type: "boolean", enum: [true] }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-SOURCE-ADAPTER-DEFINITION", "External Intelligence Source Adapter Definition",
      ["adapterId", "adapterVersion", "adapterType", "supportedSourceTypes", "supportedOperations", "runtimeTargets", "status", "testOnly", "sourceAuthorityGranted", "repositoryAuthorityGranted", "financialAuthorityGranted", "reliabilityAuthorityGranted", "automaticRetryAllowed", "arbitraryUrlAllowed", "createdAt", "immutable"], {
        adapterId: { type: "string" }, adapterVersion: { type: "string" }, adapterType: { type: "string" }, supportedSourceTypes: { type: "array" }, supportedOperations: { type: "array" }, runtimeTargets: { type: "array" }, status: { type: "string" }, testOnly: { type: "boolean" },
        sourceAuthorityGranted: { type: "boolean", enum: [false] }, repositoryAuthorityGranted: { type: "boolean", enum: [false] }, financialAuthorityGranted: { type: "boolean", enum: [false] }, reliabilityAuthorityGranted: { type: "boolean", enum: [false] },
        automaticRetryAllowed: { type: "boolean", enum: [false] }, arbitraryUrlAllowed: { type: "boolean", enum: [false] }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-SOURCE-ROUTE-DECISION", "External Intelligence Source Route Decision",
      ["routeId", "requestId", "sourceId", "sourceVersion", "operationId", "operationContractId", "adapterId", "adapterVersion", "accessMode", "runtimeTarget", "fallbackPerformed", "fallbackCanBypassPolicy", "sourceAuthorityGranted", "economicAuthorityGranted", "createdAt", "immutable"], {
        routeId: { type: "string" }, requestId: { type: "string" }, sourceId: { type: "string" }, sourceVersion: { type: "number" }, operationId: { type: "string" }, operationContractId: { type: "string" },
        adapterId: { type: "string" }, adapterVersion: { type: "string" }, accessMode: { type: "string" }, runtimeTarget: { type: "string" }, endpointReference: { type: ["string", "null"] },
        fallbackPerformed: { type: "boolean", enum: [false] }, fallbackCanBypassPolicy: { type: "boolean", enum: [false] }, sourceAuthorityGranted: { type: "boolean", enum: [false] }, economicAuthorityGranted: { type: "boolean", enum: [false] }, createdAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-ACQUISITION-JOB", "External Intelligence Acquisition Job",
      ["jobId", "requestId", "priority", "status", "scheduledAt", "attemptCount", "maxAttempts", "cancellationRequested", "executionAuthorityGranted", "researchGoalAuthorityGranted", "paidAuthorityGranted", "financialAuthorityGranted", "createdAt", "updatedAt", "immutable"], {
        jobId: { type: "string" }, requestId: { type: "string" }, priority: { type: "string" }, status: { type: "string" }, scheduledAt: { type: "string" }, attemptCount: { type: "number" }, maxAttempts: { type: "number" },
        checkpointId: { type: ["string", "null"] }, cancellationRequested: { type: "boolean" }, executionAuthorityGranted: { type: "boolean", enum: [false] }, researchGoalAuthorityGranted: { type: "boolean", enum: [false] },
        paidAuthorityGranted: { type: "boolean", enum: [false] }, financialAuthorityGranted: { type: "boolean", enum: [false] }, createdAt: { type: "string" }, updatedAt: { type: "string" }, immutable: { type: "boolean", enum: [true] }
      }),
    schema("EXTERNAL-010-SCHEMA-PHASE4-VALIDATION-RESULT", "External Intelligence Phase 04 Validation Result",
      ["id", "componentId", "version", "implementationPhase", "decisionCoverage", "passed", "failed", "total", "health", "criticalFailed", "status", "releaseAllowed", "phase4Complete", "phase5Allowed", "validatedAt"], {
        id: { type: "string" }, componentId: { type: "string", enum: ["EXTERNAL-010"] }, version: { type: "string", enum: ["1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"] }, implementationPhase: { type: "string" }, decisionCoverage: { type: "number", enum: [54] },
        passed: { type: "number" }, failed: { type: "number" }, total: { type: "number" }, health: { type: "number" }, criticalFailed: { type: "number" }, status: { type: "string" }, releaseAllowed: { type: "boolean" }, phase4Complete: { type: "boolean" }, phase5Allowed: { type: "boolean" }, validatedAt: { type: "string" }
      })
,
    schema("EXTERNAL-010-SCHEMA-RAW-EVIDENCE", "External Intelligence Raw Evidence", ["rawEvidenceId","contentId","contentHash","contentType","sizeBytes","rawDataReference","storageClass","acquiredAt","sourceId","requestId","acquisitionStatus","schemaVersion","createdAt","immutable"], {
      rawEvidenceId:{type:"string"},contentId:{type:"string"},contentHash:{type:"string"},contentType:{type:"string"},sizeBytes:{type:"number"},rawDataReference:{type:["string","null"]},storageClass:{type:"string"},acquiredAt:{type:"string"},publishedAt:{type:["string","null"]},sourceId:{type:"string"},requestId:{type:"string"},acquisitionStatus:{type:"string"},schemaVersion:{type:"string"},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}
    }),
    schema("EXTERNAL-010-SCHEMA-ACQUISITION-EVIDENCE", "External Intelligence Acquisition Evidence", ["evidenceId","requestId","sourceId","sourceVersion","operationId","adapterId","adapterVersion","accessMode","acquiredAt","status","contentHash","contentType","rawEvidenceId","attemptCount","recordHash","schemaVersion","recordVersion","createdAt","immutable"], {
      evidenceId:{type:"string"},requestId:{type:"string"},sourceId:{type:"string"},sourceVersion:{type:"number"},operationId:{type:"string"},adapterId:{type:"string"},adapterVersion:{type:"string"},accessMode:{type:"string"},acquiredAt:{type:"string"},publishedAt:{type:["string","null"]},status:{type:"string"},contentHash:{type:"string"},contentType:{type:"string"},rawEvidenceId:{type:"string"},attemptCount:{type:"number"},correlationId:{type:["string","null"]},acquisitionPlanId:{type:["string","null"]},researchGoalId:{type:["string","null"]},responseId:{type:["string","null"]},attemptId:{type:["string","null"]},routeId:{type:["string","null"]},runtimeVersion:{type:["string","null"]},gatewayVersion:{type:["string","null"]},schemaVersion:{type:"string"},recordVersion:{type:"number"},recordHash:{type:"string"},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}
    }),
    schema("EXTERNAL-010-SCHEMA-CONTENT-OBJECT", "External Intelligence Content Object Metadata", ["contentId","contentHash","storageClass","storageProvider","storageReference","sizeBytes","contentType","integrityState","createdAt","immutable"], {
      contentId:{type:"string"},contentHash:{type:"string"},storageClass:{type:"string"},storageProvider:{type:"string"},storageReference:{type:["string","null"]},sizeBytes:{type:"number"},contentType:{type:"string"},integrityState:{type:"string"},createdAt:{type:"string"},verifiedAt:{type:["string","null"]},immutable:{type:"boolean",enum:[true]}
    }),
    schema("EXTERNAL-010-SCHEMA-PROCESSING-CHECKPOINT", "External Intelligence Incremental Processing Checkpoint", ["checkpointId","contentHash","processorId","processorVersion","parameterHash","processingState","createdAt","immutable"], {
      checkpointId:{type:"string"},contentHash:{type:"string"},processorId:{type:"string"},processorVersion:{type:"string"},parameterHash:{type:"string"},processingState:{type:"string"},resumeCursor:{type:["object","string","number","null"]},supersedesCheckpointId:{type:["string","null"]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}
    }),
    schema("EXTERNAL-010-SCHEMA-PHASE5-VALIDATION-RESULT", "External Intelligence Phase 05 Validation Result", ["id","componentId","version","implementationPhase","decisionCoverage","passed","failed","total","health","criticalFailed","status","releaseAllowed","phase5Complete","phase6Allowed","validatedAt"], {
      id:{type:"string"},componentId:{type:"string",enum:["EXTERNAL-010"]},version:{type:"string",enum:["1.4.0","1.5.0","1.6.0","1.7.0"]},implementationPhase:{type:"string"},decisionCoverage:{type:"number",enum:[54]},passed:{type:"number"},failed:{type:"number"},total:{type:"number"},health:{type:"number"},criticalFailed:{type:"number"},status:{type:"string"},releaseAllowed:{type:"boolean"},phase5Complete:{type:"boolean"},phase6Allowed:{type:"boolean"},validatedAt:{type:"string"}
    }),
    schema("EXTERNAL-010-SCHEMA-SECRET-METADATA", "External Intelligence Secret Metadata",
      ["secretReferenceId","secretType","provider","status","createdAt","updatedAt","valueExposed","immutable"], {
        secretReferenceId:{type:"string"}, secretType:{type:"string"}, provider:{type:"string"}, status:{type:"string"}, createdAt:{type:"string"}, updatedAt:{type:"string"}, expiresAt:{type:["string","null"]}, valueExposed:{type:"boolean",enum:[false]}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-CONTENT-SECURITY-ASSESSMENT", "External Content Security Assessment",
      ["securityAssessmentId","evidenceId","sourceId","contentHash","trustClass","securityState","signals","instructionAuthorityGranted","toolAuthorityGranted","secretAuthorityGranted","repositoryAuthorityGranted","financialAuthorityGranted","scheduleAuthorityGranted","sanitizedAutomaticallyTrusted","createdAt","immutable"], {
        securityAssessmentId:{type:"string"}, evidenceId:{type:["string","null"]}, sourceId:{type:["string","null"]}, contentHash:{type:["string","null"]}, trustClass:{type:"string"}, securityState:{type:"string"}, signals:{type:"array"}, instructionAuthorityGranted:{type:"boolean",enum:[false]}, toolAuthorityGranted:{type:"boolean",enum:[false]}, secretAuthorityGranted:{type:"boolean",enum:[false]}, repositoryAuthorityGranted:{type:"boolean",enum:[false]}, financialAuthorityGranted:{type:"boolean",enum:[false]}, scheduleAuthorityGranted:{type:"boolean",enum:[false]}, sanitizedAutomaticallyTrusted:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-DATA-LIFECYCLE", "External Intelligence Data Lifecycle Record",
      ["lifecycleRecordId","subjectType","subjectId","dataClass","purposeId","policyVersion","lifecycleState","preservationHold","deletionAuthorityGranted","automaticDeletionPerformed","createdAt","updatedAt","immutable"], {
        lifecycleRecordId:{type:"string"}, subjectType:{type:"string"}, subjectId:{type:"string"}, sourceId:{type:["string","null"]}, dataClass:{type:"string"}, purposeId:{type:"string"}, usagePolicyReference:{type:["string","null"]}, retentionPolicyReference:{type:["string","null"]}, policyVersion:{type:"string"}, lifecycleState:{type:"string"}, expiresAt:{type:["string","null"]}, preservationHold:{type:"boolean"}, deletionAuthorityGranted:{type:"boolean",enum:[false]}, automaticDeletionPerformed:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, updatedAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-PRIVACY-ASSESSMENT", "External Intelligence Privacy Assessment",
      ["privacyAssessmentId","subjectId","identityMode","purposeId","privacyRisk","sensitiveInferenceAllowed","realPersonResolutionAllowed","crossPlatformLinkConfirmed","reIdentificationAllowed","dataMinimized","createdAt","immutable"], {
        privacyAssessmentId:{type:"string"}, subjectId:{type:"string"}, identityMode:{type:"string"}, purposeId:{type:"string"}, privacyRisk:{type:"string"}, sensitiveInferenceAllowed:{type:"boolean",enum:[false]}, realPersonResolutionAllowed:{type:"boolean",enum:[false]}, crossPlatformLinkConfirmed:{type:"boolean",enum:[false]}, reIdentificationAllowed:{type:"boolean",enum:[false]}, dataMinimized:{type:"boolean"}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-PHASE6-VALIDATION-RESULT", "External Intelligence Phase 06 Validation Result",
      ["id","componentId","version","implementationPhase","decisionCoverage","passed","failed","total","health","criticalFailed","status","releaseAllowed","phase6Complete","phase7Allowed","validatedAt"], {
        id:{type:"string"}, componentId:{type:"string",enum:["EXTERNAL-010"]}, version:{type:"string"}, implementationPhase:{type:"string"}, decisionCoverage:{type:"number",enum:[54]}, passed:{type:"number"}, failed:{type:"number"}, total:{type:"number"}, health:{type:"number"}, criticalFailed:{type:"number"}, status:{type:"string"}, releaseAllowed:{type:"boolean"}, phase6Complete:{type:"boolean"}, phase7Allowed:{type:"boolean"}, validatedAt:{type:"string"}
      }),
    schema("EXTERNAL-010-SCHEMA-TEMPORAL-CONTEXT", "External Intelligence Temporal Context",
      ["temporalContextId","evidenceId","rawEvidenceId","publishedAt","availableAt","effectiveAt","acquiredAt","temporalIntent","historicalMode","asOfTime","freshnessState","futureEvidenceBlocked","eligibilityState","newestEvidenceAutomaticallyWins","freshnessGrantsReliability","unknownTimestampInvented","createdAt","immutable"], {
        temporalContextId:{type:"string"}, evidenceId:{type:["string","null"]}, rawEvidenceId:{type:["string","null"]}, publishedAt:{type:["string","null"]}, availableAt:{type:["string","null"]}, effectiveAt:{type:["string","null"]}, acquiredAt:{type:["string","null"]}, observedAt:{type:["string","null"]}, temporalIntent:{type:"string"}, historicalMode:{type:"boolean"}, asOfTime:{type:["string","null"]}, evaluationTime:{type:"string"}, freshnessPolicyId:{type:["string","null"]}, freshnessState:{type:"string"}, temporalAmbiguity:{type:"boolean"}, futureEvidenceBlocked:{type:"boolean"}, eligibilityState:{type:"string"}, newestEvidenceAutomaticallyWins:{type:"boolean",enum:[false]}, freshnessGrantsReliability:{type:"boolean",enum:[false]}, unknownTimestampInvented:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-NORMALIZER-DEFINITION", "External Intelligence Normalizer Definition",
      ["normalizerId","normalizerVersion","schemaVersion","recordType","supportedSourceTypes","deterministic","rawEvidenceMutationAllowed","historicalOverwriteAllowed","createdAt","immutable"], {
        normalizerId:{type:"string"}, normalizerVersion:{type:"string"}, schemaVersion:{type:"string"}, recordType:{type:"string"}, supportedSourceTypes:{type:"array"}, deterministic:{type:"boolean"}, rawEvidenceMutationAllowed:{type:"boolean",enum:[false]}, historicalOverwriteAllowed:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-NORMALIZED-RECORD", "External Intelligence Normalized Record",
      ["normalizedRecordId","recordType","recordVersion","schemaVersion","rawEvidenceId","sourceEvidenceId","sourceContentHash","normalizerId","normalizerVersion","normalizationState","resolutionState","normalizedData","provenanceReference","derivedDataBoundary","rawEvidencePreserved","rawEvidenceOverwritePerformed","normalizationReplacesRawEvidence","historyOverwritePerformed","createdAt","immutable"], {
        normalizedRecordId:{type:"string"}, recordType:{type:"string"}, recordVersion:{type:"number"}, schemaVersion:{type:"string"}, rawEvidenceId:{type:"string"}, sourceEvidenceId:{type:"string"}, sourceContentHash:{type:"string"}, normalizerId:{type:"string"}, normalizerVersion:{type:"string"}, normalizationState:{type:"string"}, resolutionState:{type:"string"}, normalizedData:{type:["object","array"]}, unitResolution:{type:"object"}, temporalResolution:{type:"object"}, entityResolution:{type:"object"}, provenanceReference:{type:"object"}, derivedDataBoundary:{type:"boolean",enum:[true]}, rawEvidencePreserved:{type:"boolean",enum:[true]}, rawEvidenceOverwritePerformed:{type:"boolean",enum:[false]}, normalizationReplacesRawEvidence:{type:"boolean",enum:[false]}, normalizationEqualsInterpretation:{type:"boolean",enum:[false]}, supersedesNormalizedRecordId:{type:["string","null"]}, historyOverwritePerformed:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-CLAIM-CANDIDATE", "External Intelligence Claim Candidate",
      ["claimCandidateId","claimId","normalizedRecordId","sourceEvidenceId","rawEvidenceId","claimType","claimantId","publisherId","claimExtractorId","claimExtractorVersion","extractionState","atomicClaim","rawContextReference","lineageReference","claimEqualsTruth","claimExtractionEqualsKnowledgePromotion","truthVerified","knowledgePromotionPerformed","toolAuthorityGranted","repositoryAuthorityGranted","createdAt","immutable"], {
        claimCandidateId:{type:"string"}, claimId:{type:"string"}, normalizedRecordId:{type:"string"}, sourceEvidenceId:{type:"string"}, rawEvidenceId:{type:"string"}, claimType:{type:"string"}, claimantId:{type:["string","null"]}, publisherId:{type:["string","null"]}, claimantPublisherSeparated:{type:"boolean"}, claimExtractorId:{type:"string"}, claimExtractorVersion:{type:"string"}, extractionState:{type:"string"}, extractionConfidence:{type:"string"}, assertedAt:{type:["string","null"]}, targetTime:{type:["string","null"]}, temporalContextId:{type:["string","null"]}, atomicClaim:{type:"object"}, rawContextReference:{type:"string"}, lineageReference:{type:"object"}, supersedesClaimCandidateId:{type:["string","null"]}, evidenceEqualsClaim:{type:"boolean",enum:[false]}, claimEqualsTruth:{type:"boolean",enum:[false]}, claimExtractionEqualsKnowledgePromotion:{type:"boolean",enum:[false]}, truthVerified:{type:"boolean",enum:[false]}, knowledgePromotionPerformed:{type:"boolean",enum:[false]}, toolAuthorityGranted:{type:"boolean",enum:[false]}, repositoryAuthorityGranted:{type:"boolean",enum:[false]}, historicalClaimCandidatePreserved:{type:"boolean",enum:[true]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-ENTITY-RECORD", "External Intelligence Entity Record",
      ["entityId","entityType","canonicalLabel","namespace","resolutionState","evidenceRefs","identityCreatedFromNameMatchOnly","knowledgeIdentityLinkPerformed","createdAt","immutable"], {
        entityId:{type:"string"}, entityType:{type:"string"}, canonicalLabel:{type:"string"}, namespace:{type:"string"}, validFrom:{type:["string","null"]}, validUntil:{type:["string","null"]}, resolutionState:{type:"string"}, evidenceRefs:{type:"array"}, aliasCount:{type:"number"}, identifierCount:{type:"number"}, identityCreatedFromNameMatchOnly:{type:"boolean",enum:[false]}, knowledgeIdentityLinkPerformed:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-ENTITY-ALIAS", "External Intelligence Entity Alias",
      ["entityAliasId","entityId","alias","namespace","evidenceRefs","aliasMatchEqualsExactIdentity","createdAt","immutable"], {
        entityAliasId:{type:"string"}, entityId:{type:"string"}, alias:{type:"string"}, namespace:{type:"string"}, language:{type:["string","null"]}, validFrom:{type:["string","null"]}, validUntil:{type:["string","null"]}, evidenceRefs:{type:"array"}, aliasMatchEqualsExactIdentity:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-ENTITY-IDENTIFIER", "External Intelligence Entity Identifier",
      ["entityIdentifierId","entityId","namespace","identifier","evidenceRefs","identifierEqualsPermanentIdentity","createdAt","immutable"], {
        entityIdentifierId:{type:"string"}, entityId:{type:"string"}, namespace:{type:"string"}, identifier:{type:"string"}, validFrom:{type:["string","null"]}, validUntil:{type:["string","null"]}, evidenceRefs:{type:"array"}, identifierEqualsPermanentIdentity:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-ENTITY-MENTION", "External Intelligence Entity Mention",
      ["entityMentionId","sourceEvidenceId","mentionMode","mentionText","visualReference","candidateEntityIds","resolvedEntityId","resolutionState","mentionEqualsResolvedEntity","visualMentionEqualsResolvedEntity","createdAt","immutable"], {
        entityMentionId:{type:"string"}, sourceEvidenceId:{type:"string"}, rawEvidenceId:{type:["string","null"]}, mentionMode:{type:"string",enum:["TEXT","VISUAL"]}, mentionText:{type:["string","null"]}, visualReference:{type:["string","null"]}, contextReference:{type:["string","null"]}, candidateEntityIds:{type:"array"}, resolvedEntityId:{type:["string","null"],enum:[null]}, resolutionState:{type:"string"}, mentionEqualsResolvedEntity:{type:"boolean",enum:[false]}, visualMentionEqualsResolvedEntity:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-ENTITY-RESOLUTION-CANDIDATE", "External Intelligence Entity Resolution Candidate",
      ["entityResolutionCandidateId","entityMentionId","candidateEntityId","resolverId","resolverVersion","resolutionState","evidenceRefs","visualSimilarityOnly","canonicalResolutionPerformed","destructiveMergePerformed","knowledgeMutationPerformed","aiResolutionEqualsCanonicalConfirmation","visualSimilarityEqualsIdentity","createdAt","immutable"], {
        entityResolutionCandidateId:{type:"string"}, entityMentionId:{type:"string"}, candidateEntityId:{type:["string","null"]}, resolverId:{type:"string"}, resolverVersion:{type:"string"}, resolutionState:{type:"string"}, confidence:{type:"string"}, evidenceRefs:{type:"array"}, contextEvidenceRefs:{type:"array"}, multimodalEvidenceRefs:{type:"array"}, visualSimilarityOnly:{type:"boolean"}, canonicalResolutionPerformed:{type:"boolean",enum:[false]}, destructiveMergePerformed:{type:"boolean",enum:[false]}, knowledgeMutationPerformed:{type:"boolean",enum:[false]}, aiResolutionEqualsCanonicalConfirmation:{type:"boolean",enum:[false]}, visualSimilarityEqualsIdentity:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-ENTITY-MERGE-SPLIT-CANDIDATE", "External Intelligence Entity Merge / Split Candidate",
      ["entityMergeSplitCandidateId","operation","entityIds","proposedEntityIds","evidenceRefs","resolverId","resolverVersion","destructiveOperationPerformed","canonicalRegistryMutationPerformed","approvalGranted","createdAt","immutable"], {
        entityMergeSplitCandidateId:{type:"string"}, operation:{type:"string",enum:["MERGE","SPLIT"]}, entityIds:{type:"array"}, proposedEntityIds:{type:"array"}, evidenceRefs:{type:"array"}, resolverId:{type:"string"}, resolverVersion:{type:"string"}, destructiveOperationPerformed:{type:"boolean",enum:[false]}, canonicalRegistryMutationPerformed:{type:"boolean",enum:[false]}, approvalGranted:{type:"boolean",enum:[false]}, createdAt:{type:"string"}, immutable:{type:"boolean",enum:[true]}
      }),
    schema("EXTERNAL-010-SCHEMA-PHASE7-VALIDATION-RESULT", "External Intelligence Phase 07 Validation Result",
      ["id","componentId","version","implementationPhase","decisionCoverage","passed","failed","total","health","criticalFailed","status","releaseAllowed","phase7Complete","phase8Allowed","validatedAt"], {
        id:{type:"string"}, componentId:{type:"string",enum:["EXTERNAL-010"]}, version:{type:"string",enum:["1.6.0","1.7.0"]}, implementationPhase:{type:"string"}, decisionCoverage:{type:"number",enum:[54]}, passed:{type:"number"}, failed:{type:"number"}, total:{type:"number"}, health:{type:"number"}, criticalFailed:{type:"number"}, status:{type:"string"}, releaseAllowed:{type:"boolean"}, phase7Complete:{type:"boolean"}, phase8Allowed:{type:"boolean"}, validatedAt:{type:"string"}
      }),
    schema("EXTERNAL-010-SCHEMA-ANALYTICAL-CAPABILITY","External Intelligence Analytical Capability",["capabilityId","recordVersion","capabilityType","providerId","modelFamily","modelVersion","algorithmVersion","supportedTasks","supportedDomains","supportedHorizons","supportedInputTypes","costProfile","latencyProfile","availabilityState","dataHandlingPolicy","roles","outputClassifications","modelNameEqualsStableAnalyticalIdentity","analysisOutputIsPrimaryEvidence","highPerformanceGrantsActionAuthority","automaticPromotionPerformed","secretValueStored","createdAt","updatedAt","immutable"],{capabilityId:{type:"string"},recordVersion:{type:"string"},capabilityType:{type:"string"},providerId:{type:"string"},modelFamily:{type:"string"},modelVersion:{type:"string"},algorithmVersion:{type:"string"},supportedTasks:{type:"array"},supportedDomains:{type:"array"},supportedHorizons:{type:"array"},supportedInputTypes:{type:"array"},costProfile:{type:"object"},latencyProfile:{type:"object"},availabilityState:{type:"string"},dataHandlingPolicy:{type:"object"},roles:{type:"array"},outputClassifications:{type:"array"},modelNameEqualsStableAnalyticalIdentity:{type:"boolean",enum:[false]},analysisOutputIsPrimaryEvidence:{type:"boolean",enum:[false]},highPerformanceGrantsActionAuthority:{type:"boolean",enum:[false]},automaticPromotionPerformed:{type:"boolean",enum:[false]},secretValueStored:{type:"boolean",enum:[false]},createdAt:{type:"string"},updatedAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-CAPABILITY-PERFORMANCE-PROFILE","External Intelligence Capability Performance Profile",["performanceProfileId","capabilityId","capabilityRecordVersion","taskType","domain","horizon","evaluationType","sampleCount","metrics","outcomeGrounded","evaluationEvidenceRefs","performanceGrantsRoutingAuthority","performanceGrantsActionAuthority","createdAt","immutable"],{performanceProfileId:{type:"string"},capabilityId:{type:"string"},capabilityRecordVersion:{type:"string"},taskType:{type:"string"},domain:{type:"string"},horizon:{type:"string"},evaluationType:{type:"string"},sampleCount:{type:"number"},metrics:{type:"object"},outcomeGrounded:{type:"boolean"},evaluationEvidenceRefs:{type:"array"},performanceGrantsRoutingAuthority:{type:"boolean",enum:[false]},performanceGrantsActionAuthority:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-CAPABILITY-ROUTING-CANDIDATE","External Intelligence Capability Routing Candidate",["routingCandidateId","taskType","domain","horizon","inputType","dataClass","eligibleCapabilityIds","blockedCapabilityIds","candidateDetails","automaticWinnerSelected","routingGrantsExecutionAuthority","routingGrantsBusinessAuthority","agreementEqualsTruth","createdAt","immutable"],{routingCandidateId:{type:"string"},taskType:{type:"string"},domain:{type:"string"},horizon:{type:"string"},inputType:{type:"string"},dataClass:{type:"string"},eligibleCapabilityIds:{type:"array"},blockedCapabilityIds:{type:"array"},candidateDetails:{type:"array"},automaticWinnerSelected:{type:"boolean",enum:[false]},routingGrantsExecutionAuthority:{type:"boolean",enum:[false]},routingGrantsBusinessAuthority:{type:"boolean",enum:[false]},agreementEqualsTruth:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-ANALYSIS-EXECUTION-RECORD","External Intelligence Analysis Execution Record",["analysisExecutionId","capabilityId","capabilityRecordVersion","taskType","domain","horizon","inputReferenceIds","outputReferenceIds","outputClassification","executionState","aiAnalysisEqualsPrimaryEvidence","instructionAuthorityGranted","repositoryAuthorityGranted","financialAuthorityGranted","createdAt","immutable"],{analysisExecutionId:{type:"string"},capabilityId:{type:"string"},capabilityRecordVersion:{type:"string"},taskType:{type:"string"},domain:{type:"string"},horizon:{type:"string"},inputReferenceIds:{type:"array"},outputReferenceIds:{type:"array"},outputClassification:{type:"string"},executionState:{type:"string"},aiAnalysisEqualsPrimaryEvidence:{type:"boolean",enum:[false]},instructionAuthorityGranted:{type:"boolean",enum:[false]},repositoryAuthorityGranted:{type:"boolean",enum:[false]},financialAuthorityGranted:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-INDEPENDENT-REVIEW-PLAN","External Intelligence Independent Review Plan",["reviewPlanId","primaryCapabilityId","reviewerCapabilityIds","purpose","requestedOutputClassification","primaryExcludedFromReviewerSet","independentReviewRequired","modelAgreementEqualsTruth","automaticExecutionGranted","automaticPromotionGranted","createdAt","immutable"],{reviewPlanId:{type:"string"},primaryCapabilityId:{type:"string"},reviewerCapabilityIds:{type:"array"},purpose:{type:"string"},requestedOutputClassification:{type:"string"},primaryExcludedFromReviewerSet:{type:"boolean",enum:[true]},independentReviewRequired:{type:"boolean",enum:[true]},modelAgreementEqualsTruth:{type:"boolean",enum:[false]},automaticExecutionGranted:{type:"boolean",enum:[false]},automaticPromotionGranted:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-SHADOW-EVALUATION-RECORD","External Intelligence Shadow Evaluation Record",["shadowEvaluationId","capabilityId","taskType","domain","horizon","metrics","evaluationEvidenceRefs","shadowSuccess","automaticPromotionPerformed","actionAuthorityGranted","createdAt","immutable"],{shadowEvaluationId:{type:"string"},capabilityId:{type:"string"},taskType:{type:"string"},domain:{type:"string"},horizon:{type:"string"},metrics:{type:"object"},evaluationEvidenceRefs:{type:"array"},shadowSuccess:{type:"boolean"},automaticPromotionPerformed:{type:"boolean",enum:[false]},actionAuthorityGranted:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-CAPABILITY-FALLBACK-RECORD","External Intelligence Capability Fallback Record",["fallbackRecordId","requestedCapabilityId","executedCapabilityId","reason","policyRevalidated","costRevalidated","dataPolicyRevalidated","silentFallback","fallbackCanBypassPolicy","fallbackResultEqualsRequestedModelResult","createdAt","immutable"],{fallbackRecordId:{type:"string"},requestedCapabilityId:{type:"string"},executedCapabilityId:{type:"string"},reason:{type:"string"},policyRevalidated:{type:"boolean"},costRevalidated:{type:"boolean"},dataPolicyRevalidated:{type:"boolean"},silentFallback:{type:"boolean",enum:[false]},fallbackCanBypassPolicy:{type:"boolean",enum:[false]},fallbackResultEqualsRequestedModelResult:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-SNAPSHOT-MANIFEST","External Intelligence Snapshot Manifest",["snapshotManifestId","purpose","references","configurationVersion","snapshotBasedReproducibility","currentStateEqualsHistoricalInputState","createdAt","immutable"],{snapshotManifestId:{type:"string"},purpose:{type:"string"},references:{type:"array"},configurationVersion:{type:"string"},snapshotBasedReproducibility:{type:"boolean",enum:[true]},currentStateEqualsHistoricalInputState:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-TRANSFORMATION-RECORD","External Intelligence Transformation Record",["transformationId","transformationType","transformationVersion","inputReferenceIds","outputReferenceIds","status","sourceProvenanceEqualsAnalyticalLineage","auditEqualsLineage","createdAt","immutable"],{transformationId:{type:"string"},transformationType:{type:"string"},transformationVersion:{type:"string"},inputReferenceIds:{type:"array"},outputReferenceIds:{type:"array"},status:{type:"string"},sourceProvenanceEqualsAnalyticalLineage:{type:"boolean",enum:[false]},auditEqualsLineage:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-LINEAGE-RECORD","External Intelligence Lineage Record",["lineageRecordId","inputReferenceId","outputReferenceId","relationType","lineageState","affectedEqualsInvalid","historicalRecordSilentlyRewritten","automaticRecomputePerformed","createdAt","immutable"],{lineageRecordId:{type:"string"},inputReferenceId:{type:"string"},outputReferenceId:{type:"string"},relationType:{type:"string"},lineageState:{type:"string"},affectedEqualsInvalid:{type:"boolean",enum:[false]},historicalRecordSilentlyRewritten:{type:"boolean",enum:[false]},automaticRecomputePerformed:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-RECOMPUTE-CANDIDATE","External Intelligence Recompute Candidate",["recomputeCandidateId","outputReferenceId","reason","triggerReferenceIds","recomputeRequiredEqualsKnownIncorrect","automaticRecomputePerformed","approvalGranted","createdAt","immutable"],{recomputeCandidateId:{type:"string"},outputReferenceId:{type:"string"},reason:{type:"string"},triggerReferenceIds:{type:"array"},recomputeRequiredEqualsKnownIncorrect:{type:"boolean",enum:[false]},automaticRecomputePerformed:{type:"boolean",enum:[false]},approvalGranted:{type:"boolean",enum:[false]},createdAt:{type:"string"},immutable:{type:"boolean",enum:[true]}}),
    schema("EXTERNAL-010-SCHEMA-PHASE8-VALIDATION-RESULT","External Intelligence Phase 08 Validation Result",["id","componentId","version","implementationPhase","decisionCoverage","passed","failed","total","health","criticalFailed","status","releaseAllowed","phase8Complete","phase9Allowed","validatedAt"],{id:{type:"string"},componentId:{type:"string",enum:["EXTERNAL-010"]},version:{type:"string",enum:["1.7.0"]},implementationPhase:{type:"string"},decisionCoverage:{type:"number",enum:[54]},passed:{type:"number"},failed:{type:"number"},total:{type:"number"},health:{type:"number"},criticalFailed:{type:"number"},status:{type:"string"},releaseAllowed:{type:"boolean"},phase8Complete:{type:"boolean"},phase9Allowed:{type:"boolean"},validatedAt:{type:"string"}})  ]);

  function normalizeSchema(input) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      schemaId: internal.text(source.schemaId || source.id, ""),
      name: internal.text(source.name, ""),
      version: internal.text(source.version, ""),
      type: internal.text(source.type, "object"),
      required: internal.unique(source.required),
      properties: internal.isPlainObject(source.properties) ? internal.clone(source.properties) : {},
      additionalProperties: source.additionalProperties !== false,
      immutable: source.immutable !== false,
      owner: internal.text(source.owner, "EXTERNAL-010"),
      source: internal.text(source.source, "runtime")
    };
  }

  function findSchema(schemaId) {
    const id = internal.text(schemaId, "");
    return id && state.schemas.has(id) ? state.schemas.get(id) : null;
  }

  function registerSchema(input) {
    const definition = normalizeSchema(input);
    if (!/^EXTERNAL-010-SCHEMA-[A-Z0-9-]+$/.test(definition.schemaId) || !definition.name || !definition.version || definition.type !== "object") {
      return internal.buildResult(false, "EXTERNAL010_SCHEMA_DEFINITION_INVALID", "Blocked", { schema: definition });
    }
    const contractValidation = namespace.validateExternalIntelligenceContract && namespace.validateExternalIntelligenceContract("schemaDefinition", definition);
    if (contractValidation && contractValidation.valid !== true) {
      return internal.buildResult(false, "EXTERNAL010_SCHEMA_CONTRACT_INVALID", "Blocked", { schema: definition, validation: contractValidation });
    }
    const existing = findSchema(definition.schemaId);
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(internal.deepFreeze(internal.clone(definition)));
      return internal.buildResult(same, same ? "EXTERNAL010_SCHEMA_ALREADY_REGISTERED" : "EXTERNAL010_SCHEMA_DUPLICATE_CONFLICT", same ? "Ready" : "Blocked", { schema: internal.clone(existing) });
    }
    const frozen = internal.deepFreeze(internal.clone(definition));
    state.schemas.set(frozen.schemaId, frozen);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_SCHEMA_REGISTERED", "Ready", { schema: internal.clone(frozen) });
  }

  function typeMatches(value, expected) {
    const types = Array.isArray(expected) ? expected : [expected];
    return types.some(function matches(type) {
      if (type === "null") return value === null;
      if (type === "array") return Array.isArray(value);
      if (type === "object") return internal.isPlainObject(value);
      if (type === "number") return typeof value === "number" && Number.isFinite(value);
      if (type === "integer") return Number.isInteger(value);
      if (type === "boolean") return typeof value === "boolean";
      if (type === "string") return typeof value === "string";
      return true;
    });
  }

  function validateRule(value, rule, path, errors) {
    if (!rule || typeof rule !== "object") return;
    if (rule.type && !typeMatches(value, rule.type)) {
      errors.push({ path: path, code: "TYPE_MISMATCH", expected: rule.type, actual: value === null ? "null" : Array.isArray(value) ? "array" : typeof value });
      return;
    }
    if (rule.enum && !rule.enum.includes(value)) errors.push({ path: path, code: "ENUM_MISMATCH", value: value });
    if (rule.pattern && typeof value === "string") {
      let regex = null;
      try { regex = new RegExp(rule.pattern); } catch (_) { regex = null; }
      if (!regex || !regex.test(value)) errors.push({ path: path, code: "PATTERN_MISMATCH", value: value });
    }
  }

  function validateAgainstSchema(schemaId, value) {
    const definition = findSchema(schemaId);
    if (!definition) return { valid: false, schemaId: schemaId || null, errors: [{ path: "$", code: "SCHEMA_NOT_FOUND" }], validatedAt: internal.nowIso() };
    const errors = [];
    if (!internal.isPlainObject(value)) errors.push({ path: "$", code: "TYPE_MISMATCH", expected: "object" });
    const object = internal.isPlainObject(value) ? value : {};
    definition.required.forEach(function requiredKey(key) {
      if (!Object.prototype.hasOwnProperty.call(object, key)) errors.push({ path: "$." + key, code: "REQUIRED_MISSING" });
    });
    Object.keys(definition.properties).forEach(function validateProperty(key) {
      if (Object.prototype.hasOwnProperty.call(object, key)) validateRule(object[key], definition.properties[key], "$." + key, errors);
    });
    if (!definition.additionalProperties) {
      Object.keys(object).forEach(function unknownProperty(key) {
        if (!Object.prototype.hasOwnProperty.call(definition.properties, key)) errors.push({ path: "$." + key, code: "ADDITIONAL_PROPERTY" });
      });
    }
    return { valid: errors.length === 0, schemaId: definition.schemaId, schemaVersion: definition.version, errors: errors, validatedAt: internal.nowIso() };
  }

  function getSchema(schemaId) {
    const definition = findSchema(schemaId);
    return definition ? internal.clone(definition) : null;
  }

  function listSchemas() {
    return Array.from(state.schemas.values()).map(internal.clone);
  }

  function registerProjectionAdapter(input) {
    const adapter = input && typeof input === "object" ? input : null;
    const adapterId = adapter && internal.text(adapter.adapterId, "");
    if (!adapterId || typeof adapter.project !== "function") return internal.buildResult(false, "EXTERNAL010_PROJECTION_ADAPTER_INVALID", "Blocked", null);
    if (state.projectionAdapters.has(adapterId)) return internal.buildResult(false, "EXTERNAL010_PROJECTION_ADAPTER_DUPLICATE", "Blocked", { adapterId: adapterId });
    state.projectionAdapters.set(adapterId, adapter);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_PROJECTION_ADAPTER_REGISTERED", "Ready", { adapterId: adapterId });
  }

  async function projectRecord(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const adapterId = internal.text(settings.adapterId, "");
    const adapter = state.projectionAdapters.get(adapterId);
    if (!adapter) return internal.buildResult(false, "EXTERNAL010_PROJECTION_ADAPTER_REQUIRED", "Blocked", { adapterId: adapterId || null });
    try {
      const output = await adapter.project(internal.clone(settings.record), internal.clone(settings));
      return internal.buildResult(true, "EXTERNAL010_RECORD_PROJECTED", "Ready", { adapterId: adapterId, output: output });
    } catch (error) {
      return internal.buildResult(false, "EXTERNAL010_RECORD_PROJECTION_FAILED", "Failed", null, { error: { message: error && error.message || String(error), category: "Projection" } });
    }
  }

  function getCompatibilityProfile(recordType, versions) {
    const list = internal.unique(versions || ["1.0.0"]);
    return internal.deepFreeze({
      compatibilityProfileId: "EXTERNAL-010-COMPAT-" + internal.text(recordType, "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]+/g, "-"),
      recordType: internal.text(recordType, "unknown"),
      readVersions: list,
      writeVersion: list[list.length - 1] || "1.0.0",
      readOldWriteCurrent: true,
      silentUpgradeAllowed: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
  }

  function initializeExternalIntelligenceSchemaRegistry() {
    const results = BUILT_IN_SCHEMAS.map(function add(definition) { return registerSchema(definition); });
    const failed = results.filter(function failed(item) { return !item.ok; });
    namespace.modules.schemaRegistry.status = failed.length ? "Blocked" : "Ready";
    return internal.buildResult(failed.length === 0,
      failed.length ? "EXTERNAL010_SCHEMA_REGISTRY_INITIALIZATION_FAILED" : "EXTERNAL010_SCHEMA_REGISTRY_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      { builtInCount: BUILT_IN_SCHEMAS.length, registeredCount: state.schemas.size, results: results });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceSchemaRegistry: initializeExternalIntelligenceSchemaRegistry,
    registerExternalIntelligenceSchema: registerSchema,
    getExternalIntelligenceSchema: getSchema,
    listExternalIntelligenceSchemas: listSchemas,
    validateExternalIntelligenceRecord: validateAgainstSchema,
    registerExternalIntelligenceProjectionAdapter: registerProjectionAdapter,
    projectExternalIntelligenceRecord: projectRecord,
    getExternalIntelligenceCompatibilityProfile: getCompatibilityProfile
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.schemaRegistry = {
    id: "EXTERNAL-010-SCHEMA-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    immutableSchemas: true,
    unknownSchemaWriteAllowed: false,
    readOldWriteCurrent: true,
    projectionAdapterRequired: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
