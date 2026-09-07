/* ============================================================
   FILE: 17_external_intelligence_software_supply_chain.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.1.0
   Phase 02: Runtime / Gateway / Software Supply Chain Foundation
   Decision: 053
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 software supply chain blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("softwareSupplyChain");
  let controlledInstallAdapter = null;

  function normalizeSourceType(value) {
    const type = internal.text(value, "UNKNOWN").toUpperCase();
    const allowed = ["OFFICIAL_REGISTRY", "OFFICIAL_REPOSITORY", "VENDOR_DOWNLOAD", "LOCAL_OWNER_CODE", "AI_GENERATED_CODE", "TRUSTED_PERSON_CODE", "PRIVATE_PACKAGE", "INTERNAL_TOOL", "LOCAL_ARCHIVE", "EXPERIMENTAL_SOURCE", "NODE_BUILTIN", "UNKNOWN"];
    return allowed.includes(type) ? type : "UNKNOWN";
  }

  function normalizeAdmissionState(value) {
    const stateValue = internal.text(value, "CANDIDATE").toUpperCase();
    const allowed = ["DISCOVERED", "CANDIDATE", "IDENTITY_CHECK", "SCANNING", "QUARANTINED", "SANDBOX_ONLY", "REVIEW_REQUIRED", "APPROVABLE", "APPROVED", "ACTIVE", "BLOCKED", "REVOKED", "RETIRED", "UNKNOWN"];
    return allowed.includes(stateValue) ? stateValue : "UNKNOWN";
  }

  function createDependencyCandidate(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const packageName = internal.text(settings.packageName || settings.programName, "");
    const version = internal.text(settings.version, "");
    const purpose = internal.text(settings.purpose, "");
    const runtimeTarget = internal.text(settings.runtimeTarget, "");
    if (!packageName || !version || !purpose || !runtimeTarget) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_CANDIDATE_REQUIRED_FIELDS", "Blocked", null);
    const sourceType = normalizeSourceType(settings.sourceType);
    const candidate = internal.deepFreeze({
      dependencyId: internal.text(settings.dependencyId, internal.nextId("EXTERNAL-010-DEPENDENCY")),
      packageEcosystem: internal.text(settings.packageEcosystem, sourceType === "NODE_BUILTIN" ? "node-builtin" : "unknown"),
      packageName: packageName,
      version: version,
      sourceType: sourceType,
      sourceLocation: internal.text(settings.sourceLocation, sourceType === "NODE_BUILTIN" ? "node:" + packageName : ""),
      integrityHash: internal.text(settings.integrityHash, ""),
      publisherIdentity: internal.text(settings.publisherIdentity, ""),
      authorIdentity: internal.text(settings.authorIdentity, ""),
      purpose: purpose,
      proposedBy: internal.text(settings.proposedBy, "Project Owner / Implementation"),
      runtimeTarget: runtimeTarget,
      admissionState: normalizeAdmissionState(settings.admissionState),
      externalDependency: settings.externalDependency === true,
      automaticInstallAllowed: false,
      hardSecurityFail: settings.hardSecurityFail === true,
      elevatedSecurityExceptionGranted: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const validation = namespace.validateExternalIntelligenceContract("dependencyCandidate", candidate);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_CANDIDATE_INVALID", "Blocked", { validation: validation });
    return internal.buildResult(true, "EXTERNAL010_DEPENDENCY_CANDIDATE_CREATED", "Candidate", { candidate: candidate });
  }

  function registerDependencyCandidate(input) {
    const created = input && input.dependencyId ? internal.buildResult(true, "EXTERNAL010_DEPENDENCY_CANDIDATE_PROVIDED", "Ready", { candidate: internal.deepFreeze(internal.clone(input)) }) : createDependencyCandidate(input);
    if (!created.ok) return created;
    const candidate = created.data.candidate;
    const existing = state.dependencyCandidates.get(candidate.dependencyId);
    if (existing) {
      const same = internal.stableStringify(existing) === internal.stableStringify(candidate);
      return internal.buildResult(same, same ? "EXTERNAL010_DEPENDENCY_ALREADY_REGISTERED" : "EXTERNAL010_DEPENDENCY_IDENTITY_CONFLICT", same ? "Ready" : "Blocked", { candidate: internal.clone(existing) });
    }
    state.dependencyCandidates.set(candidate.dependencyId, candidate);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_DEPENDENCY_REGISTERED", "Candidate", { candidate: internal.clone(candidate) });
  }

  function evaluateDependencyAdmission(id) {
    const candidate = state.dependencyCandidates.get(internal.text(id, ""));
    if (!candidate) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_NOT_FOUND", "Blocked", null);
    if (candidate.hardSecurityFail) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_HARD_SECURITY_FAIL", "Blocked", { candidate: internal.clone(candidate), ordinaryApprovalOverrides: false });
    const missing = [];
    if (!candidate.version) missing.push("version");
    if (!candidate.sourceType || candidate.sourceType === "UNKNOWN") missing.push("sourceType");
    if (candidate.externalDependency && !candidate.integrityHash) missing.push("integrityHash");
    const approvable = missing.length === 0;
    return internal.buildResult(true, "EXTERNAL010_DEPENDENCY_ADMISSION_EVALUATED", approvable ? "Approvable" : "Review Required", {
      dependencyId: candidate.dependencyId,
      admissionState: approvable ? "APPROVABLE" : "REVIEW_REQUIRED",
      missingEvidence: missing,
      automaticInstallAllowed: false,
      authorityRequiredForPromotion: true
    });
  }

  function setControlledInstallAdapter(adapter) {
    if (adapter == null) {
      controlledInstallAdapter = null;
      return internal.buildResult(true, "EXTERNAL010_CONTROLLED_INSTALL_ADAPTER_RESET", "Ready", { adapterId: null });
    }
    const valid = adapter && typeof adapter.install === "function" && adapter.requiresExplicitOwnerInteraction === true;
    if (!valid) return internal.buildResult(false, "EXTERNAL010_CONTROLLED_INSTALL_ADAPTER_INVALID", "Blocked", null);
    controlledInstallAdapter = adapter;
    return internal.buildResult(true, "EXTERNAL010_CONTROLLED_INSTALL_ADAPTER_SET", "Ready", { adapterId: internal.text(adapter.adapterId, "custom") });
  }

  async function requestControlledInstall(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const dependencyId = internal.text(settings.dependencyId, "");
    const candidate = state.dependencyCandidates.get(dependencyId);
    if (!candidate) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_NOT_FOUND", "Blocked", null);
    if (candidate.hardSecurityFail) return internal.buildResult(false, "EXTERNAL010_DEPENDENCY_HARD_SECURITY_FAIL", "Blocked", { dependencyId: dependencyId });
    if (!controlledInstallAdapter) return internal.buildResult(false, "EXTERNAL010_CONTROLLED_INSTALL_ADAPTER_REQUIRED", "Blocked", { dependencyId: dependencyId, automaticInstallPerformed: false });
    const authority = namespace.evaluateExternalIntelligenceAuthority({
      action: "INSTALL_SOFTWARE",
      target: { type: "dependency", id: dependencyId },
      purpose: internal.text(settings.purpose, candidate.purpose)
    });
    if (!authority.allowed) return internal.buildResult(false, "EXTERNAL010_INSTALL_AUTHORITY_DENIED", "Blocked", { dependencyId: dependencyId, authority: authority, automaticInstallPerformed: false });
    return internal.buildResult(false, "EXTERNAL010_INSTALL_HARD_DENIED_BY_PHASE2_POLICY", "Blocked", { dependencyId: dependencyId, automaticInstallPerformed: false });
  }

  function createRuntimeProfile(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const dependencies = Array.isArray(settings.dependencies) ? settings.dependencies.map(function copy(item) { return internal.clone(item); }) : [];
    const profile = internal.deepFreeze({
      runtimeProfileId: internal.text(settings.runtimeProfileId, internal.nextId("EXTERNAL-010-RUNTIME-PROFILE")),
      osProfile: internal.text(settings.osProfile, "unknown"),
      architecture: internal.text(settings.architecture, "unknown"),
      nodeVersion: internal.text(settings.nodeVersion, "not-configured"),
      pythonVersion: internal.text(settings.pythonVersion, "not-configured"),
      dependencyManifestHash: internal.text(settings.dependencyManifestHash, dependencies.length ? "UNVERIFIED" : "EMPTY"),
      dependencyCount: dependencies.length,
      externalDependencyCount: dependencies.filter(function external(item) { return item && item.externalDependency === true; }).length,
      dependencyVersions: dependencies,
      configurationProfile: internal.isPlainObject(settings.configurationProfile) ? internal.clone(settings.configurationProfile) : {},
      schemaCompatibilityProfile: internal.isPlainObject(settings.schemaCompatibilityProfile) ? internal.clone(settings.schemaCompatibilityProfile) : {},
      validationState: internal.text(settings.validationState, dependencies.length ? "REVIEW_REQUIRED" : "VALID_WITH_BUILTINS_ONLY"),
      automaticInstallAllowed: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const validation = namespace.validateExternalIntelligenceContract("runtimeProfile", profile);
    if (!validation.valid) return internal.buildResult(false, "EXTERNAL010_RUNTIME_PROFILE_INVALID", "Blocked", { validation: validation });
    state.runtimeProfiles.set(profile.runtimeProfileId, profile);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_RUNTIME_PROFILE_CREATED", "Ready", { profile: internal.clone(profile) });
  }

  function getRuntimeProfile(id) {
    const profile = state.runtimeProfiles.get(internal.text(id, ""));
    return profile ? internal.clone(profile) : null;
  }

  function listDependencyCandidates() {
    return Array.from(state.dependencyCandidates.values()).map(internal.clone);
  }

  function listRuntimeProfiles() {
    return Array.from(state.runtimeProfiles.values()).map(internal.clone);
  }

  function getPhase2GatewaySupplyChainProfile() {
    return {
      packageManagerRequired: false,
      externalDependencyCount: 0,
      dependencyMode: "node-builtins-only",
      runtimePackageInstallAllowed: false,
      builtins: ["node:http", "node:crypto", "node:url"],
      exactNodeRuntimeCapturedAtStartup: true,
      controlledInstallHookPresent: true,
      hardSecurityFailOrdinaryOverrideAllowed: false
    };
  }

  function initializeExternalIntelligenceSoftwareSupplyChain() {
    if (!state.runtimeProfiles.size) {
      createRuntimeProfile({
        runtimeProfileId: "EXTERNAL-010-RUNTIME-PROFILE-PHASE2-GATEWAY",
        nodeVersion: "captured-by-gateway-at-runtime",
        pythonVersion: "not-configured",
        dependencies: [],
        configurationProfile: { gateway: "node-builtins-only", port: VERSION_MANIFEST.gateway.defaultPort },
        validationState: "VALID_WITH_BUILTINS_ONLY"
      });
    }
    namespace.modules.softwareSupplyChain.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_SOFTWARE_SUPPLY_CHAIN_INITIALIZED", "Ready", {
      candidateCount: state.dependencyCandidates.size,
      runtimeProfileCount: state.runtimeProfiles.size,
      gatewayProfile: getPhase2GatewaySupplyChainProfile(),
      automaticInstallAllowed: false
    });
  }

  Object.assign(namespace.api, {
    initializeExternalIntelligenceSoftwareSupplyChain: initializeExternalIntelligenceSoftwareSupplyChain,
    createExternalIntelligenceDependencyCandidate: createDependencyCandidate,
    registerExternalIntelligenceDependencyCandidate: registerDependencyCandidate,
    evaluateExternalIntelligenceDependencyAdmission: evaluateDependencyAdmission,
    setExternalIntelligenceControlledInstallAdapter: setControlledInstallAdapter,
    requestExternalIntelligenceControlledInstall: requestControlledInstall,
    createExternalIntelligenceRuntimeProfile: createRuntimeProfile,
    getExternalIntelligenceRuntimeProfile: getRuntimeProfile,
    listExternalIntelligenceDependencyCandidates: listDependencyCandidates,
    listExternalIntelligenceRuntimeProfiles: listRuntimeProfiles,
    getExternalIntelligencePhase2GatewaySupplyChainProfile: getPhase2GatewaySupplyChainProfile
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.softwareSupplyChain = {
    id: "EXTERNAL-010-SOFTWARE-SUPPLY-CHAIN",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    runtimeInstallByDefault: false,
    externalDependencyCount: 0,
    nodeBuiltinsOnlyGateway: true,
    elevatedSecurityExceptionSelfGrantAllowed: false,
    hardSecurityFailOrdinaryOverrideAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
