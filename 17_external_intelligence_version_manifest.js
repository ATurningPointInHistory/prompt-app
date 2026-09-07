/* ============================================================
   FILE: 17_external_intelligence_version_manifest.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 04: Acquisition Contract / Router / Adapter / Queue
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.3.0";
  const PHASE1_VERSION = "1.0.0";
  const PHASE2_VERSION = "1.1.0";
  const PHASE3_VERSION = "1.2.0";
  const PHASE4_VERSION = "1.3.0";
  const GATEWAY_PHASE4_VERSION = "1.2.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  const moduleVersions = {
    core: PHASE3_VERSION,
    contracts: PHASE3_VERSION,
    schemaRegistry: PHASE3_VERSION,
    authority: PHASE1_VERSION,
    audit: PHASE1_VERSION,
    runtimeCoordination: PHASE2_VERSION,
    softwareSupplyChain: PHASE2_VERSION,
    gatewayClient: PHASE4_VERSION,
    sourceRegistry: PHASE3_VERSION,
    sourceDiscovery: PHASE3_VERSION,
    resourceBudget: PHASE3_VERSION,
    usagePolicy: PHASE3_VERSION,
    acquisitionContract: PHASE4_VERSION,
    adapterRegistry: PHASE4_VERSION,
    sourceRouter: PHASE4_VERSION,
    acquisitionQueue: PHASE4_VERSION,
    phase1Validation: PHASE4_VERSION,
    phase2Validation: PHASE4_VERSION,
    phase3Validation: PHASE4_VERSION,
    phase4Validation: PHASE4_VERSION,
    phase4RealRuntimeValidation: PHASE4_VERSION
  };

  const fileModules = {
    "17_external_intelligence_core.js": "core",
    "17_external_intelligence_contracts.js": "contracts",
    "17_external_intelligence_schema_registry.js": "schemaRegistry",
    "17_external_intelligence_authority.js": "authority",
    "17_external_intelligence_audit.js": "audit",
    "17_external_intelligence_runtime_coordination.js": "runtimeCoordination",
    "17_external_intelligence_software_supply_chain.js": "softwareSupplyChain",
    "17_external_intelligence_gateway_client.js": "gatewayClient",
    "17_external_intelligence_source_registry.js": "sourceRegistry",
    "17_external_intelligence_source_discovery.js": "sourceDiscovery",
    "17_external_intelligence_resource_budget.js": "resourceBudget",
    "17_external_intelligence_usage_policy.js": "usagePolicy",
    "17_external_intelligence_acquisition_contract.js": "acquisitionContract",
    "17_external_intelligence_adapter_registry.js": "adapterRegistry",
    "17_external_intelligence_source_router.js": "sourceRouter",
    "17_external_intelligence_acquisition_queue.js": "acquisitionQueue",
    "17_external_intelligence_phase1_validation.js": "phase1Validation",
    "17_external_intelligence_phase2_validation.js": "phase2Validation",
    "17_external_intelligence_phase3_validation.js": "phase3Validation",
    "17_external_intelligence_phase4_validation.js": "phase4Validation",
    "17_external_intelligence_phase4_real_runtime_validation.js": "phase4RealRuntimeValidation"
  };

  const contractVersions = {
    foundationState: PHASE3_VERSION,
    contractDefinition: PHASE1_VERSION,
    schemaDefinition: PHASE1_VERSION,
    compatibilityProfile: PHASE1_VERSION,
    authorityEnvelope: PHASE1_VERSION,
    auditEvent: PHASE1_VERSION,
    validationResult: PHASE3_VERSION,
    promotionBoundary: PHASE1_VERSION,
    gatewayRuntimeState: PHASE2_VERSION,
    gatewaySessionMetadata: PHASE2_VERSION,
    runtimeCoordinationRecord: PHASE2_VERSION,
    dependencyCandidate: PHASE2_VERSION,
    runtimeProfile: PHASE2_VERSION,
    phase2ValidationResult: PHASE3_VERSION,
    sourceRecord: PHASE3_VERSION,
    sourceDiscoveryRecord: PHASE3_VERSION,
    controlledInspectionRecord: PHASE3_VERSION,
    resourceBudget: PHASE3_VERSION,
    resourceUsageRecord: PHASE3_VERSION,
    usagePolicy: PHASE3_VERSION,
    phase3ValidationResult: PHASE3_VERSION,
    sourceOperationContract: PHASE4_VERSION,
    externalAcquisitionRequest: PHASE4_VERSION,
    externalAcquisitionAttempt: PHASE4_VERSION,
    externalAcquisitionResponse: PHASE4_VERSION,
    externalAcquisitionError: PHASE4_VERSION,
    sourceAdapterDefinition: PHASE4_VERSION,
    sourceRouteDecision: PHASE4_VERSION,
    acquisitionJob: PHASE4_VERSION,
    phase4ValidationResult: PHASE4_VERSION
  };

  const contractIds = {
    foundationState: "EXTERNAL-010-CONTRACT-FOUNDATION-STATE",
    contractDefinition: "EXTERNAL-010-CONTRACT-DEFINITION",
    schemaDefinition: "EXTERNAL-010-CONTRACT-SCHEMA-DEFINITION",
    compatibilityProfile: "EXTERNAL-010-CONTRACT-COMPATIBILITY-PROFILE",
    authorityEnvelope: "EXTERNAL-010-CONTRACT-AUTHORITY-ENVELOPE",
    auditEvent: "EXTERNAL-010-CONTRACT-AUDIT-EVENT",
    validationResult: "EXTERNAL-010-CONTRACT-VALIDATION-RESULT",
    promotionBoundary: "EXTERNAL-010-CONTRACT-PROMOTION-BOUNDARY",
    gatewayRuntimeState: "EXTERNAL-010-CONTRACT-GATEWAY-RUNTIME-STATE",
    gatewaySessionMetadata: "EXTERNAL-010-CONTRACT-GATEWAY-SESSION-METADATA",
    runtimeCoordinationRecord: "EXTERNAL-010-CONTRACT-RUNTIME-COORDINATION-RECORD",
    dependencyCandidate: "EXTERNAL-010-CONTRACT-DEPENDENCY-CANDIDATE",
    runtimeProfile: "EXTERNAL-010-CONTRACT-RUNTIME-PROFILE",
    phase2ValidationResult: "EXTERNAL-010-CONTRACT-PHASE2-VALIDATION-RESULT",
    sourceRecord: "EXTERNAL-010-CONTRACT-SOURCE-RECORD",
    sourceDiscoveryRecord: "EXTERNAL-010-CONTRACT-SOURCE-DISCOVERY-RECORD",
    controlledInspectionRecord: "EXTERNAL-010-CONTRACT-CONTROLLED-INSPECTION-RECORD",
    resourceBudget: "EXTERNAL-010-CONTRACT-RESOURCE-BUDGET",
    resourceUsageRecord: "EXTERNAL-010-CONTRACT-RESOURCE-USAGE-RECORD",
    usagePolicy: "EXTERNAL-010-CONTRACT-USAGE-POLICY",
    phase3ValidationResult: "EXTERNAL-010-CONTRACT-PHASE3-VALIDATION-RESULT",
    sourceOperationContract: "EXTERNAL-010-CONTRACT-SOURCE-OPERATION",
    externalAcquisitionRequest: "EXTERNAL-010-CONTRACT-ACQUISITION-REQUEST",
    externalAcquisitionAttempt: "EXTERNAL-010-CONTRACT-ACQUISITION-ATTEMPT",
    externalAcquisitionResponse: "EXTERNAL-010-CONTRACT-ACQUISITION-RESPONSE",
    externalAcquisitionError: "EXTERNAL-010-CONTRACT-ACQUISITION-ERROR",
    sourceAdapterDefinition: "EXTERNAL-010-CONTRACT-SOURCE-ADAPTER-DEFINITION",
    sourceRouteDecision: "EXTERNAL-010-CONTRACT-SOURCE-ROUTE-DECISION",
    acquisitionJob: "EXTERNAL-010-CONTRACT-ACQUISITION-JOB",
    phase4ValidationResult: "EXTERNAL-010-CONTRACT-PHASE4-VALIDATION-RESULT"
  };

  const safety = {
    directRepositoryMutationAllowed: false,
    automaticKnowledgePromotionAllowed: false,
    automaticPaidApiActivationAllowed: false,
    automaticSoftwareInstallAllowed: false,
    automaticTradeExecutionAllowed: false,
    automaticAuthorityExpansionAllowed: false,
    authorityBypassAllowed: false,
    externalContentInstructionAuthorityAllowed: false,
    validationEqualsApproval: false,
    localhostAutomaticallyTrusted: false,
    corsEqualsAuthentication: false,
    gatewaySessionEqualsBusinessAuthority: false,
    gatewaySessionTokenPersistenceAllowed: false,
    runtimePackageInstallAllowed: false,
    blindRetryUnknownExecutionAllowed: false,
    remoteGatewayAllowed: false,

    arbitraryUnregisteredSourceAccessAllowed: false,
    automaticSourceActivationAllowed: false,
    automaticPaidSourceActivationAllowed: false,
    automaticSecretBindingAllowed: false,
    automaticProviderSubscriptionAllowed: false,
    sourceIdentityGrantsReliability: false,
    sourceIdentityGrantsAuthority: false,
    externalSourceGrantsEconomicAuthority: false,

    sourceDiscoveryEqualsRegistration: false,
    sourceRegistrationEqualsEnablement: false,
    sourceEnablementEqualsTrust: false,
    sourceEnablementGrantsAllOperations: false,
    sourceDiscoveryGrantsUnlimitedNetworkAuthority: false,
    sourceDiscoveryGrantsSecretAuthority: false,
    sourceDiscoveryGrantsSubscriptionAuthority: false,
    sourceDiscoveryGrantsFinancialAuthority: false,
    searchRankingGrantsSourceTrust: false,
    externalLinkGrantsSourceTrust: false,
    controlledInspectionGrantsActivation: false,
    automaticSubscriptionAllowed: false,
    unknownHighRiskSourceAutoEnableAllowed: false,
    aiSourceDiscoveryGrantsActivationAuthority: false,
    sourceDisableDeletesHistoricalEvidence: false,

    sourceEnabledMeansUnlimitedUsage: false,
    secretAvailableMeansPaidAuthority: false,
    freeSourceMeansUnlimitedUsage: false,
    budgetAvailableMeansMustSpend: false,
    hardBudgetLimitMayBeSilentlyExceeded: false,
    paidRequestMayBypassBudgetCheck: false,
    priorityMayBypassHardLimit: false,
    unknownCostMayBeAssumedZero: false,
    schedulerMayBypassBudgetCheck: false,
    queueMayBypassBudgetCheck: false,
    unusedBudgetMayBeSilentlyReallocated: false,
    budgetProposalGrantsBudgetAuthority: false,
    resourceBudgetGrantsSubscriptionAuthority: false,
    resourceBudgetGrantsFinancialTradingAuthority: false,
    storagePressureGrantsEvidenceDeletionAuthority: false,

    technicalAccessEqualsPermission: false,
    publicVisibilityEqualsUnlimitedReuse: false,
    readPermissionGrantsStoragePermission: false,
    readPermissionGrantsRedistributionPermission: false,
    internalAnalysisGrantsCommercialUse: false,
    noProhibitionFoundEqualsPermission: false,
    unknownUsagePolicyEqualsAllowed: false,
    ambiguousUsagePolicyEqualsAllowed: false,
    aiInterpretationEqualsLegalAuthority: false,
    termsLocatedEqualsFullyUnderstood: false,
    parserFailureEqualsNoRestriction: false,
    policyUnavailableEqualsPermission: false,
    freeSourceEqualsOpenLicense: false,
    paidSourceEqualsUnlimitedRights: false,
    derivedDataEqualsUnrestrictedData: false,

    arbitraryExternalRequestAllowed: false,
    browserSecretStorageAllowed: false,
    gatewaySecretExposureAllowed: false,
    automaticPaidApiSubscriptionAllowed: false,
    automaticPurchaseAllowed: false,
    automaticFinancialTransactionAllowed: false,
    externalResponseGrantsAuthority: false,
    gatewayGrantsEconomicAuthority: false,
    adapterDirectInvocationAsNormalFlow: false,
    unregisteredSourceAccessAllowed: false,
    unknownOperationExecutionAllowed: false,
    secretInRequestContractAllowed: false,
    automaticPaidRequestAuthorityAllowed: false,
    requestValidationGrantsExecutionAuthority: false,
    retryCanBypassPolicy: false,
    fallbackCanBypassPolicy: false,
    adapterGrantsSourceAuthority: false,
    adapterMayUseArbitraryUrlByDefault: false,
    adapterMayExposeSecret: false,
    adapterMayAutoPromoteKnowledge: false,
    adapterDeterminesFinalReliability: false,
    adapterMayMutateCanonicalRepository: false,
    adapterMayExecuteFinancialTransaction: false,
    adapterMayIgnoreRetryPolicy: false,
    adapterMayIgnoreSourcePolicy: false,
    unlimitedRetryAllowed: false,
    unlimitedConcurrencyAllowed: false,
    schedulerMayInventResearchGoal: false,
    schedulerMayInventAcquisitionPurpose: false,
    schedulerMayDiscoverSource: false,
    schedulerMayExpandAcquisitionScope: false,
    schedulerMayCreateUnknownSource: false,
    schedulerMayCreateUnknownOperation: false,
    scheduleGrantsPaidAuthority: false,
    scheduleGrantsFinancialAuthority: false,
    queueBypassesSourcePolicy: false,
    queueBypassesSecretPolicy: false,
    queueBypassesBudgetPolicy: false,
    gatewayRestartImpliesJobSuccess: false,
    missedScheduleUnlimitedCatchupAllowed: false,
    backgroundProcessingGrantsRepositoryAuthority: false,
    aiGoalGenerationGrantsExecutionAuthority: false,
    aiGoalGenerationGrantsPaidAuthority: false,
    aiGoalGenerationGrantsFinancialAuthority: false,
    aiGoalGenerationGrantsRepositoryAuthority: false
  };

  const authorityPolicy = {
    defaultDecision: "DENY",
    candidateGrantsAuthority: false,
    validationGrantsAuthority: false,
    approvalEvidenceRequiredForActivation: true,
    ordinaryApprovalOverridesHardDeny: false,
    hardDeniedActions: [
      "DIRECT_REPOSITORY_MUTATION",
      "AUTOMATIC_KNOWLEDGE_PROMOTION",
      "ACTIVATE_PAID_API",
      "INSTALL_SOFTWARE",
      "EXECUTE_TRADE",
      "EXPAND_AUTHORITY",
      "AUTO_SUBSCRIBE_EXTERNAL_SOURCE",
      "AUTO_BIND_EXTERNAL_SECRET"
    ]
  };

  const compatibility = {
    readOldWriteCurrent: true,
    unknownSchemaWriteAllowed: false,
    unknownContractAllowed: false,
    silentSchemaUpgradeAllowed: false,
    projectionRequiresRegisteredAdapter: true,
    minimumBrowserPlatform: "Current Common Web Runtime",
    existingPlatformMutationRequired: false
  };

  const gateway = {
    contractVersion: "1.0.0",
    gatewayVersion: GATEWAY_PHASE4_VERSION,
    defaultBaseUrl: "http://127.0.0.1:43110",
    loopbackOnly: true,
    defaultPort: 43110,
    defaultAllowedOrigins: ["https://aturningpointinhistory.github.io"],
    sessionTokenStorage: "memory-only",
    sessionTtlMs: 300000,
    requestFreshnessMs: 60000,
    customHeadersRequiredForStateChange: true,
    healthEndpoint: "/health",
    sessionEndpoint: "/v1/session",
    revokeEndpoint: "/v1/session/revoke",
    probeEndpoint: "/v1/probe",
    runtimeEndpoint: "/v1/runtime",
    publicAcquisitionEndpoint: "/v1/acquire/public",
    localNetworkAddressSpace: "loopback",
    publicAcquisitionScope: "ACQUIRE_PUBLIC",
    governedTargetAllowlistRequired: true
  };

  const supplyChain = {
    runtimeInstallByDefault: false,
    exactVersionPreferred: true,
    integrityHashPreferred: true,
    transitiveInventoryRequiredWhereAvailable: true,
    hardSecurityFailOrdinaryOverrideAllowed: false,
    elevatedExceptionSelfGrantAllowed: false,
    phase2GatewayExternalDependencyCount: 0,
    phase2GatewayDependencyMode: "node-builtins-only"
  };

  const sourceGovernance = {
    registryFirst: true,
    sourceIdentityType: "stable-source-id",
    arbitraryDirectUrlNormalOperation: false,
    sourceTypes: ["PUBLIC_API", "MARKET_DATA", "FINANCIAL_DATA", "NEWS", "RSS", "WEB_PAGE", "SEARCH", "GITHUB", "GOVERNMENT_DATA", "TECHNICAL_DOCUMENTATION", "AI_SERVICE", "DATASET", "OTHER"],
    accessModes: ["BROWSER_DIRECT", "LOCAL_GATEWAY", "AUTO_ROUTE", "DISABLED"],
    authenticationModes: ["NONE", "API_KEY", "BEARER_TOKEN", "OAUTH", "CUSTOM"],
    pricingModes: ["FREE", "FIXED_MONTHLY", "USAGE_BASED", "TIERED", "UNKNOWN"],
    initialAllowedHttpMethods: ["GET"],
    secretValuesStoredInRegistry: false
  };

  const discovery = {
    lifecycle: ["DISCOVERED", "IDENTIFIED", "ASSESSED", "REGISTERED", "ENABLED", "ACTIVE", "REJECTED", "QUARANTINED", "DISABLED", "DEPRECATED", "REVOKED", "UNKNOWN"],
    riskClasses: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"],
    aiMayDiscoverSourceCandidate: true,
    aiMayAssessSourceCandidate: true,
    controlledInspectionAvailable: true,
    controlledInspectionGrantsActivation: false
  };

  const resourceBudget = {
    hierarchy: ["GLOBAL", "CATEGORY", "SOURCE", "GOAL", "PLAN", "REQUEST"],
    resourceDimensions: ["FINANCIAL_COST", "REQUEST_COUNT", "NETWORK_BYTES", "STORAGE_BYTES", "CPU_TIME", "MEMORY", "PROCESSING_TIME", "AI_TOKEN_USAGE", "PROVIDER_QUOTA"],
    softLimitBlocksExecution: false,
    hardLimitBlocksExecution: true,
    aiMayOptimizeResourceUsage: true,
    aiMayProposeAdditionalBudget: true,
    aiMayCompareCostVsValue: true,
    aiMayGenerateResourceAllocationCandidate: true
  };

  const usagePolicy = {
    operations: ["READ", "TEMPORARY_CACHE", "LONG_TERM_STORAGE", "INTERNAL_ANALYSIS", "DERIVED_ANALYSIS", "EXPORT", "FULL_CONTENT_EXPORT", "REDISTRIBUTION", "COMMERCIAL_USE", "MODEL_TRAINING", "INDEXING", "ARCHIVING"],
    states: ["ALLOWED", "ALLOWED_WITH_CONDITIONS", "RESTRICTED", "BLOCKED", "UNKNOWN", "AMBIGUOUS", "REVIEW_REQUIRED"],
    aiMayReadTerms: true,
    aiMayExtractPolicyClauses: true,
    aiMayGenerateUsagePolicyCandidate: true,
    aiMayDetectPolicyChanges: true,
    aiMayGenerateTermsResearchGoal: true,
    aiPolicyInterpretationEqualsLegalAuthority: false,
    unknownDefaultsToAllowed: false
  };

  const acquisition = {
    executionPreferences: ["AUTO", "IMMEDIATE", "BACKGROUND"],
    executionDecisions: ["IMMEDIATE", "QUEUE", "BLOCKED"],
    priorities: ["CRITICAL", "HIGH", "NORMAL", "LOW", "BACKGROUND"],
    jobStatuses: ["QUEUED", "WAITING", "RUNNING", "RETRY_PENDING", "COMPLETED", "FAILED", "BLOCKED", "CANCELLED", "PAUSED", "RECOVERING", "UNKNOWN_EXECUTION_STATE"],
    errorCategories: ["AUTHENTICATION_FAILED", "RATE_LIMITED", "TIMEOUT", "SOURCE_UNAVAILABLE", "TEMPORARY_SOURCE_UNAVAILABLE", "INVALID_REQUEST", "INVALID_RESPONSE", "SCHEMA_MISMATCH", "BLOCKED", "UNKNOWN"],
    defaultTimeoutMs: 15000,
    maxTimeoutMs: 120000,
    maxRetryAttempts: 5,
    concurrencyLimit: 2,
    defaultRetryPolicy: {
      maxAttempts: 3,
      initialDelayMs: 0,
      maxDelayMs: 5000,
      backoffPolicy: "EXPONENTIAL",
      retryableCategories: ["TIMEOUT", "RATE_LIMITED", "SOURCE_UNAVAILABLE", "TEMPORARY_SOURCE_UNAVAILABLE"]
    },
    adapterIds: {
      mock: "EXTERNAL-010-ADAPTER-MOCK-001",
      browserHttpJson: "EXTERNAL-010-ADAPTER-HTTP-JSON-BROWSER-001",
      localGateway: "EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001"
    },
    commonAdapterMethods: ["validateRequest", "acquire", "normalizeResponseMetadata", "extractTemporalMetadata", "sanitize", "buildEvidenceInput"],
    persistentQueueMetadataRequired: true,
    preExecutionRevalidationRequired: true,
    arbitraryUrlProxyAllowed: false,
    gatewayPublicJsonAcquisitionEnabled: true,
    gatewayTargetAllowlistRequired: true
  };

  const manifest = {
    componentId: "EXTERNAL-010",
    componentName: "External Intelligence Platform",
    namespace: "EXTERNAL010ExternalIntelligence",
    mission: "Evidence-Grounded External Intelligence Platform",
    versionArchitecture: "independent-version-v1",
    release: {
      version: RELEASE_VERSION,
      implementationPhase: "Phase 04 Acquisition Contract / Router / Adapter / Queue",
      phase: 4,
      phaseCount: 21,
      designFreezeId: "EXTERNAL-010-DESIGN-FREEZE-1.0.0",
      designFreezeVersion: "1.0.0",
      designFreezePackageId: "EXTERNAL-010-DESIGN-FREEZE-PACKAGE-1.1.0",
      implementationRoadmapId: "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0",
      decisionRange: "EXTERNAL-010-DECISION-001..054",
      decisionCount: 54,
      architectureStatus: "DESIGN COMPLETE / FROZEN",
      status: "Phase 04 Acquisition Contract / Router / Adapter / Queue Implementation"
    },
    moduleVersions: moduleVersions,
    fileModules: fileModules,
    contractVersions: contractVersions,
    contractIds: contractIds,
    safety: safety,
    authorityPolicy: authorityPolicy,
    compatibility: compatibility,
    gateway: gateway,
    supplyChain: supplyChain,
    sourceGovernance: sourceGovernance,
    discovery: discovery,
    resourceBudget: resourceBudget,
    usagePolicy: usagePolicy,
    acquisition: acquisition,
    implementation: {
      inspectBeforeImplement: true,
      contractFirst: true,
      phase1Complete: true,
      phase2Complete: true,
      phase3Allowed: true,
      phase3Complete: true,
      phase4Allowed: true,
      phase4Complete: false,
      phase5Allowed: false,
      releaseAllowed: false,
      androidRealDeviceGateRequired: true,
      pcRealRuntimeGateRequiredWhereApplicable: true
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

  global.EXTERNAL010VersionManifest = deepFreeze(manifest);
})(typeof window !== "undefined" ? window : globalThis);
