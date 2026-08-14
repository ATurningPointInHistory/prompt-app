/* ============================================================
   FILE: 13_local_first_repository_phase1_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.0.0 / Module: Phase 1 Validation 1.0.0
   Phase 1: Foundation / Contracts / Metadata Model
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 1 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("validation");

  function collector() {
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : typeof detail === "string" ? detail : JSON.stringify(detail),
        group: group || "Foundation",
        severity: severity || "High"
      });
    }
    return { checks: checks, check: check };
  }

  function summarize(checks, idPrefix, statusPass, statusFail, extras) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(idPrefix),
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      criticalFailed: criticalFailed,
      status: failed === 0 ? statusPass : statusFail,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  function hash64(char) { return String(char || "a").repeat(64); }

  function fixtures() {
    return {
      node: { projectId: "AI-PROMPT-OS-MAIN", repositoryId: "AI-PROMPT-OS-REPOSITORY", nodeId: "ANDROID-TEST-NODE", nodeType: "replica" },
      revision: { revisionId: "R-PHASE1-TEST", baseRevisionId: "R-BASE", parentRevisionId: "R-BASE", sourceNodeId: "ANDROID-TEST-NODE" },
      integrity: { revisionId: "R-PHASE1-TEST", fileHashes: { "fixture.js": hash64("a") }, manifestHash: hash64("b"), scriptSetHash: hash64("c"), contentHash: hash64("d"), repositoryStateHash: hash64("e"), integrityStatus: "verified" },
      state: { repositoryId: "AI-PROMPT-OS-REPOSITORY", nodeId: "ANDROID-TEST-NODE", revisionId: "R-PHASE1-TEST", state: "replica", integrityStatus: "verified" },
      canonicalState: { repositoryId: "AI-PROMPT-OS-REPOSITORY", nodeId: "PC-TEST-NODE", revisionId: "R-PHASE1-CANONICAL", state: "canonical", integrityStatus: "verified" },
      gate: { gateId: "REPOSITORY-010-PHASE1-ANDROID-GATE", capabilityId: "REPOSITORY-010-PHASE1", gateType: "android-real", applicability: "required", result: "pending" }
    };
  }

  function runLocalFirstRepositoryPhase1Validation() {
    const c = collector();
    const checks = c.checks;
    const check = c.check;

    const initialization = namespace.initialize();
    check("Foundation initialization succeeds", initialization.ok === true, initialization.code, "Initialization", "Critical");

    const status = namespace.getStatus();
    const dependency = namespace.getDependencyStatus();
    const safety = namespace.getSafetyStatus();
    const authority = namespace.getAuthorityBoundaryStatus();
    const validationAuthority = namespace.getValidationAuthorityStatus();
    const metadata = namespace.getMetadataModelStatus();

    check("Component ID is REPOSITORY-010", status.componentId === "REPOSITORY-010", status.componentId, "Manifest", "Critical");
    check("Release Version is 1.0.0", status.version === "1.0.0", status.version, "Manifest", "Critical");
    check("Decision 001 is frozen baseline", VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-001") !== -1, VERSION_MANIFEST.release.decisionIds, "Architecture", "Critical");
    check("Decision 002 is frozen baseline", VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-002") !== -1, VERSION_MANIFEST.release.decisionIds, "Architecture", "Critical");
    check("Decision 003 is frozen baseline", VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-003") !== -1, VERSION_MANIFEST.release.decisionIds, "Architecture", "Critical");
    check("IDE-190 final manifest is available", dependency.ide190ManifestLoaded === true, dependency.ide190ReleaseVersion, "Baseline", "Critical");
    check("IDE-190 final frozen baseline is compatible", dependency.ide190FrozenBaselineCompatible === true, dependency.ide190ReleaseVersion, "Baseline", "Critical");
    check("Phase 1 has no direct runtime dependency on IDE-150..190", dependency.phase1DirectDependencyRequired === false, dependency.phase1DirectDependencyRequired, "Independence", "Critical");

    check("Logical Authority is AI Prompt OS Repository", authority.logicalAuthority === "AI Prompt OS Repository", authority.logicalAuthority, "Authority", "Critical");
    check("Initial Canonical Node is PC Local Repository", authority.initialCanonicalNode === "PC Local Repository", authority.initialCanonicalNode, "Authority", "Critical");
    check("Sync mode is controlled two-way", authority.syncMode === "controlled-two-way", authority.syncMode, "Authority", "Critical");
    check("Identity does not grant Authority", authority.identityGrantsAuthority === false, authority.identityGrantsAuthority, "Authority", "Critical");
    check("State does not grant Authority", authority.stateGrantsAuthority === false, authority.stateGrantsAuthority, "Authority", "Critical");
    check("Validation does not grant Approval", authority.validationGrantsApproval === false, authority.validationGrantsApproval, "Authority", "Critical");
    check("Sync does not grant Mutation Authority", authority.syncGrantsMutationAuthority === false, authority.syncGrantsMutationAuthority, "Authority", "Critical");

    Object.keys(VERSION_MANIFEST.safety).forEach(function validateSafety(key) {
      check("Safety disabled: " + key, safety[key] === false, safety[key], "Safety", "Critical");
    });

    check("Repository State vocabulary is exact", JSON.stringify(metadata.repositoryStates) === JSON.stringify(["canonical","replica","staged","sync-candidate","conflicted","stale","invalid","corrupted","incompatible"]), metadata.repositoryStates, "State Model", "Critical");
    check("Integrity statuses are exact", JSON.stringify(metadata.integrityStatuses) === JSON.stringify(["verified","unverified","mismatch","corrupted"]), metadata.integrityStatuses, "Integrity", "Critical");
    check("Hash algorithm is SHA-256", metadata.hashAlgorithm === "SHA-256", metadata.hashAlgorithm, "Integrity", "Critical");
    check("Layered Hash Model is present", JSON.stringify(metadata.hashLayers) === JSON.stringify(["file","manifest","script-set","content","repository-state"]), metadata.hashLayers, "Integrity", "Critical");
    check("Gate applicability model is exact", JSON.stringify(metadata.gateApplicability) === JSON.stringify(["required","not-required","deferred"]), metadata.gateApplicability, "Validation Authority", "Critical");
    check("Gate result model is exact", JSON.stringify(metadata.gateResults) === JSON.stringify(["pending","passed","failed","blocked"]), metadata.gateResults, "Validation Authority", "Critical");
    check("Phase 1 Android gate is required", validationAuthority.phase1RequiredGateSet.androidRealValidation === "required", validationAuthority.phase1RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 1 PC gate is not required", validationAuthority.phase1RequiredGateSet.pcRealValidation === "not-required", validationAuthority.phase1RequiredGateSet, "Validation Authority", "Critical");
    check("Phase 1 Cross-device gate is not required", validationAuthority.phase1RequiredGateSet.crossDeviceRealValidation === "not-required", validationAuthority.phase1RequiredGateSet, "Validation Authority", "Critical");

    const definitions = namespace.listContractDefinitions();
    check("Six Phase 1 contracts are registered", definitions.length === 6, definitions.length, "Contracts", "Critical");
    check("Foundation contract validates", namespace.validateContract("foundation", namespace.buildFoundationSnapshot()).valid === true, "foundation", "Contracts", "Critical");

    const f = fixtures();
    const node = namespace.createRepositoryNodeIdentity(f.node);
    const revision = namespace.createRepositoryRevision(f.revision);
    const integrity = namespace.createRepositoryIntegrityRecord(f.integrity);
    const stateRecord = namespace.createRepositoryStateRecord(f.state);
    const canonicalState = namespace.createRepositoryStateRecord(f.canonicalState);
    const gate = namespace.createValidationGateDescriptor(f.gate);

    check("Node Identity metadata validates", node.ok === true && node.data.record.identityGrantsAuthority === false, node.code, "Metadata", "Critical");
    check("Revision metadata validates", revision.ok === true && revision.data.record.baseRevisionId === "R-BASE", revision.code, "Metadata", "Critical");
    check("Integrity metadata validates", integrity.ok === true && integrity.data.record.hashAlgorithm === "SHA-256", integrity.code, "Metadata", "Critical");
    check("Repository State metadata validates", stateRecord.ok === true && stateRecord.data.record.state === "replica", stateRecord.code, "Metadata", "Critical");
    check("Canonical State metadata grants no Authority", canonicalState.ok === true && canonicalState.data.record.authorityEffect === "none", canonicalState.code, "Authority", "Critical");
    check("Validation Gate metadata grants no Approval", gate.ok === true && gate.data.record.validationIsApproval === false, gate.code, "Validation Authority", "Critical");
    check("Validation Gate metadata grants no Mutation Authority", gate.ok === true && gate.data.record.mutationAuthorityGranted === false, gate.code, "Validation Authority", "Critical");

    const api = namespace.getPublicApiDescription();
    check("Persistence is not implemented in Phase 1", api.persistenceImplemented === false, api.persistenceImplemented, "Scope", "Critical");
    check("Sync Engine is not implemented in Phase 1", api.syncEngineImplemented === false, api.syncEngineImplemented, "Scope", "Critical");
    check("Mutation Engine is not implemented in Phase 1", api.mutationEngineImplemented === false, api.mutationEngineImplemented, "Scope", "Critical");

    const result = summarize(checks, "REPOSITORY-010-PHASE1-VALIDATION", "REPOSITORY-010 Phase 1 Pre-Device Validation PASS", "REPOSITORY-010 Phase 1 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet),
      releaseAllowed: false,
      phase1Complete: false,
      androidRealDeviceRequired: true,
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false
    });
    internal.markPhase1PreDeviceValidation(result);
    return result;
  }

  function runLocalFirstRepositoryPhase1AndroidValidation() {
    const pre = runLocalFirstRepositoryPhase1Validation();
    const c = collector();
    const checks = c.checks;
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "";
    const androidRealDevice = /Android/i.test(userAgent);

    check("Pre-device validation passes", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Pre-Device", "Critical");
    check("Runtime is Android", androidRealDevice === true, userAgent || "navigator.userAgent unavailable", "Android Real Device", "Critical");
    check("REPOSITORY-010 namespace is loaded", Boolean(global.REPOSITORY010LocalFirstRepository), typeof global.REPOSITORY010LocalFirstRepository, "Android Runtime", "Critical");
    check("Contracts API is available", typeof namespace.validateContract === "function", typeof namespace.validateContract, "Android Runtime", "Critical");
    check("Metadata API is available", typeof namespace.createRepositoryNodeIdentity === "function", typeof namespace.createRepositoryNodeIdentity, "Android Runtime", "Critical");
    check("IndexedDB is not required by Phase 1", VERSION_MANIFEST.implementation.persistenceImplemented === false, Boolean(global.indexedDB), "Gate Applicability", "High");
    check("PC Real Validation is not required by Phase 1", VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet.pcRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not required by Phase 1", VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");

    const f = fixtures();
    const node = namespace.createRepositoryNodeIdentity(Object.assign({}, f.node, { nodeId: "ANDROID-REAL-PHASE1-NODE" }));
    const revision = namespace.createRepositoryRevision(Object.assign({}, f.revision, { revisionId: "R-ANDROID-REAL-PHASE1", sourceNodeId: "ANDROID-REAL-PHASE1-NODE" }));
    check("Android runtime creates Node Identity metadata", node.ok === true, node.code, "Android Runtime", "Critical");
    check("Android runtime creates Revision metadata", revision.ok === true, revision.code, "Android Runtime", "Critical");

    const result = summarize(checks, "REPOSITORY-010-PHASE1-ANDROID-VALIDATION", "REPOSITORY-010 Phase 1 Android Real Device Validation PASS", "REPOSITORY-010 Phase 1 Android Real Device Validation FAIL", {
      androidRealDevice: androidRealDevice,
      userAgent: userAgent,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet),
      releaseAllowed: checks.every(function all(item) { return item.passed; }),
      phase1Complete: checks.every(function all(item) { return item.passed; }),
      pcRealValidationRequired: false,
      crossDeviceRealValidationRequired: false
    });
    internal.markPhase1AndroidValidation(result);
    return result;
  }

  function getLocalFirstRepositoryPhase1ValidationStatus() {
    return {
      preDevice: internal.clone(state.lastPhase1Validation),
      androidRealDevice: internal.clone(state.lastPhase1AndroidValidation),
      phase1PreDeviceValidationPassed: state.phase1PreDeviceValidationPassed === true,
      androidPhase1ValidationPassed: state.androidPhase1ValidationPassed === true,
      phase1Complete: state.phase1PreDeviceValidationPassed === true && state.androidPhase1ValidationPassed === true,
      releaseAllowed: state.phase1PreDeviceValidationPassed === true && state.androidPhase1ValidationPassed === true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase1RequiredGateSet)
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase1Validation: runLocalFirstRepositoryPhase1Validation,
    runLocalFirstRepositoryPhase1AndroidValidation: runLocalFirstRepositoryPhase1AndroidValidation,
    getLocalFirstRepositoryPhase1ValidationStatus: getLocalFirstRepositoryPhase1ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.validation = {
    id: "REPOSITORY-010-PHASE1-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    androidRealDeviceRequired: true,
    pcRealValidationRequired: false,
    crossDeviceRealValidationRequired: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase1Validation = runLocalFirstRepositoryPhase1Validation;
  global.runLocalFirstRepositoryPhase1AndroidValidation = runLocalFirstRepositoryPhase1AndroidValidation;
  global.getLocalFirstRepositoryPhase1ValidationStatus = getLocalFirstRepositoryPhase1ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
