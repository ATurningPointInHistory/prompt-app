/* ============================================================
   FILE: 17_external_intelligence_version_manifest.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.1.0
   Phase 02: Runtime / Gateway / Software Supply Chain Foundation
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const RELEASE_VERSION = "1.1.0";
  const BASELINE_VERSION = "1.0.0";
  const PHASE2_VERSION = "1.1.0";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  const moduleVersions = {
    core: PHASE2_VERSION,
    contracts: PHASE2_VERSION,
    schemaRegistry: PHASE2_VERSION,
    authority: BASELINE_VERSION,
    audit: BASELINE_VERSION,
    runtimeCoordination: PHASE2_VERSION,
    softwareSupplyChain: PHASE2_VERSION,
    gatewayClient: PHASE2_VERSION,
    phase1Validation: PHASE2_VERSION,
    phase2Validation: PHASE2_VERSION
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
    "17_external_intelligence_phase1_validation.js": "phase1Validation",
    "17_external_intelligence_phase2_validation.js": "phase2Validation"
  };

  const contractVersions = {
    foundationState: BASELINE_VERSION,
    contractDefinition: BASELINE_VERSION,
    schemaDefinition: BASELINE_VERSION,
    compatibilityProfile: BASELINE_VERSION,
    authorityEnvelope: BASELINE_VERSION,
    auditEvent: BASELINE_VERSION,
    validationResult: BASELINE_VERSION,
    promotionBoundary: BASELINE_VERSION,
    gatewayRuntimeState: PHASE2_VERSION,
    gatewaySessionMetadata: PHASE2_VERSION,
    runtimeCoordinationRecord: PHASE2_VERSION,
    dependencyCandidate: PHASE2_VERSION,
    runtimeProfile: PHASE2_VERSION,
    phase2ValidationResult: PHASE2_VERSION
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
    phase2ValidationResult: "EXTERNAL-010-CONTRACT-PHASE2-VALIDATION-RESULT"
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
    remoteGatewayAllowed: false
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
      "EXPAND_AUTHORITY"
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
    localNetworkAddressSpace: "loopback"
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

  const manifest = {
    componentId: "EXTERNAL-010",
    componentName: "External Intelligence Platform",
    namespace: "EXTERNAL010ExternalIntelligence",
    mission: "Evidence-Grounded External Intelligence Platform",
    versionArchitecture: "independent-version-v1",
    release: {
      version: RELEASE_VERSION,
      implementationPhase: "Phase 02 Runtime / Gateway / Software Supply Chain Foundation",
      phase: 2,
      phaseCount: 21,
      designFreezeId: "EXTERNAL-010-DESIGN-FREEZE-1.0.0",
      designFreezeVersion: "1.0.0",
      designFreezePackageId: "EXTERNAL-010-DESIGN-FREEZE-PACKAGE-1.1.0",
      implementationRoadmapId: "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0",
      decisionRange: "EXTERNAL-010-DECISION-001..054",
      decisionCount: 54,
      architectureStatus: "DESIGN COMPLETE / FROZEN",
      status: "Phase 02 Runtime / Gateway / Software Supply Chain Implementation"
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
    implementation: {
      inspectBeforeImplement: true,
      contractFirst: true,
      phase1Complete: true,
      phase2Allowed: true,
      phase2Complete: false,
      phase3Allowed: false,
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
