/* ============================================================
   FILE: 17_external_intelligence_phase2_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 02 Validation
   Decisions: 003 / 011 / 013 / 051 / 053 / 054
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 02 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase2Validation");
  const EXPECTED_BROWSER_FILES = Object.freeze([
    "17_external_intelligence_version_manifest.js",
    "17_external_intelligence_core.js",
    "17_external_intelligence_contracts.js",
    "17_external_intelligence_schema_registry.js",
    "17_external_intelligence_authority.js",
    "17_external_intelligence_audit.js",
    "17_external_intelligence_runtime_coordination.js",
    "17_external_intelligence_software_supply_chain.js",
    "17_external_intelligence_gateway_client.js",
    "17_external_intelligence_source_registry.js",
    "17_external_intelligence_source_discovery.js",
    "17_external_intelligence_resource_budget.js",
    "17_external_intelligence_usage_policy.js",
    "17_external_intelligence_phase1_validation.js",
    "17_external_intelligence_phase2_validation.js"
  ]);

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({
          name: name,
          passed: passed === true,
          detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)),
          group: group || "General",
          severity: severity || "Critical"
        });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function count(item) { return !item.passed && item.severity === "Critical"; }).length;
    return {
      passed: passed,
      failed: failed,
      total: checks.length,
      criticalFailed: criticalFailed,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0
    };
  }

  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

  async function runExternalIntelligencePhase2Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const requireGateway = settings.requireGateway === true;
    const c = collector();
    const check = c.check;

    check("Phase 02 release baseline remains compatible", ["1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"].includes(VERSION_MANIFEST.release.version), VERSION_MANIFEST.release.version, "Foundation");
    check("Implementation phase has not regressed below Phase 02", VERSION_MANIFEST.release.phase >= 2, VERSION_MANIFEST.release.implementationPhase, "Foundation");
    check("Design Freeze remains canonical", VERSION_MANIFEST.release.designFreezeId === "EXTERNAL-010-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Foundation");
    check("Roadmap remains 2.1.0", VERSION_MANIFEST.release.implementationRoadmapId === "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0", VERSION_MANIFEST.release.implementationRoadmapId, "Foundation");
    check("Decision coverage remains 54", VERSION_MANIFEST.release.decisionCount === 54, VERSION_MANIFEST.release.decisionCount, "Foundation");

    const init = await namespace.initializeExternalIntelligenceFoundation();
    check("Phase 02 foundation initializes", init && init.ok === true, init && init.code, "Initialization");
    check("Core remains independent of Gateway availability", VERSION_MANIFEST.compatibility.existingPlatformMutationRequired === false && namespace.getExternalIntelligenceFoundationState().initialized === true, namespace.getExternalIntelligenceFoundationState(), "Regression");

    const phase1 = await namespace.runExternalIntelligencePhase1Validation();
    check("Phase 01 regression remains PASS", phase1 && phase1.failed === 0 && phase1.criticalFailed === 0, phase1 && { passed: phase1.passed, failed: phase1.failed, health: phase1.health }, "Regression");

    Object.keys(VERSION_MANIFEST.safety).forEach(function safetyFlag(key) {
      check("Safety flag " + key + " remains false", (VERSION_MANIFEST.safety[key] === false || (key === "scannerIdentityVerificationRequired" && VERSION_MANIFEST.release.phase >= 6 && VERSION_MANIFEST.safety[key] === true)), VERSION_MANIFEST.safety[key], "Safety");
    });
    check("CORS is not authentication", VERSION_MANIFEST.safety.corsEqualsAuthentication === false, VERSION_MANIFEST.safety.corsEqualsAuthentication, "Gateway Security");
    check("localhost is not trusted caller", VERSION_MANIFEST.safety.localhostAutomaticallyTrusted === false, VERSION_MANIFEST.safety.localhostAutomaticallyTrusted, "Gateway Security");
    check("Gateway session is not business authority", VERSION_MANIFEST.safety.gatewaySessionEqualsBusinessAuthority === false, VERSION_MANIFEST.safety.gatewaySessionEqualsBusinessAuthority, "Gateway Security");
    check("Gateway session token persistence is prohibited", VERSION_MANIFEST.safety.gatewaySessionTokenPersistenceAllowed === false, VERSION_MANIFEST.safety.gatewaySessionTokenPersistenceAllowed, "Gateway Security");
    check("Runtime package install is prohibited", VERSION_MANIFEST.safety.runtimePackageInstallAllowed === false, VERSION_MANIFEST.safety.runtimePackageInstallAllowed, "Supply Chain");
    check("Blind retry of unknown execution is prohibited", VERSION_MANIFEST.safety.blindRetryUnknownExecutionAllowed === false, VERSION_MANIFEST.safety.blindRetryUnknownExecutionAllowed, "Runtime");
    check("Remote Gateway is disabled in Phase 02", VERSION_MANIFEST.safety.remoteGatewayAllowed === false && VERSION_MANIFEST.gateway.loopbackOnly === true, VERSION_MANIFEST.gateway, "Gateway Security");

    const contracts = namespace.listExternalIntelligenceContracts();
    const schemas = namespace.listExternalIntelligenceSchemas();
    check("Phase 02 contracts are registered", contracts.length >= 14, contracts.length, "Contracts");
    check("Phase 02 schemas are registered", schemas.length >= 11, schemas.length, "Schemas");
    ["gatewayRuntimeState", "gatewaySessionMetadata", "runtimeCoordinationRecord", "dependencyCandidate", "runtimeProfile", "phase2ValidationResult"].forEach(function contractPresent(key) {
      check("Contract " + key + " is registered", Boolean(namespace.getExternalIntelligenceContract(key)), key, "Contracts");
    });

    const runtimeCreated = namespace.createExternalIntelligenceRuntimeIdentity({ runtimeType: "TEST_RUNTIME", healthState: "READY", hostIdentity: "phase2-validation" });
    check("Runtime identity can be created", runtimeCreated.ok === true, runtimeCreated.code, "Runtime");
    const runtimeRecord = runtimeCreated.ok ? runtimeCreated.data.runtime : null;
    check("Runtime identity grants no execution authority", runtimeRecord && runtimeRecord.executionAuthorityGranted === false, runtimeRecord, "Runtime");
    check("Runtime identity grants no business authority", runtimeRecord && runtimeRecord.businessAuthorityGranted === false, runtimeRecord, "Runtime");
    check("Runtime identity contract validates", runtimeRecord && namespace.validateExternalIntelligenceContract("gatewayRuntimeState", runtimeRecord).valid === true, runtimeRecord, "Runtime");
    check("Runtime identity schema validates", runtimeRecord && namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-GATEWAY-RUNTIME-STATE", runtimeRecord).valid === true, runtimeRecord, "Runtime");
    const runtimeRegistered = runtimeRecord ? namespace.registerExternalIntelligenceRuntimeIdentity(runtimeRecord) : null;
    check("Runtime identity can be registered", runtimeRegistered && runtimeRegistered.ok === true, runtimeRegistered && runtimeRegistered.code, "Runtime");

    const lease = runtimeRecord ? namespace.createExternalIntelligenceLeaderLeaseCandidate({ holderRuntimeInstanceId: runtimeRecord.runtimeInstanceId, leaseType: "PHASE2_VALIDATION" }) : null;
    check("Leader lease candidate hook works", lease && lease.ok === true && lease.data.lease.state === "CANDIDATE", lease && lease.data, "Runtime");
    check("Leader lease grants no business authority", lease && lease.data.lease.businessAuthorityGranted === false, lease && lease.data.lease, "Runtime");
    check("Leader lease record contract validates", lease && namespace.validateExternalIntelligenceContract("runtimeCoordinationRecord", lease.data.lease).valid === true, lease && lease.data.lease, "Runtime");

    const claim = runtimeRecord ? namespace.createExternalIntelligenceWorkClaimCandidate({ runtimeInstanceId: runtimeRecord.runtimeInstanceId, workItemId: "PHASE2-VALIDATION-WORK" }) : null;
    check("Work claim candidate hook works", claim && claim.ok === true && claim.data.claim.state === "CANDIDATE", claim && claim.data, "Runtime");
    check("Work claim does not grant execution authority", claim && claim.data.claim.executionAuthorityGranted === false, claim && claim.data.claim, "Runtime");
    const unknownExecution = namespace.createExternalIntelligenceUnknownExecutionState({ workItemId: "PHASE2-UNKNOWN", requestId: "REQ-UNKNOWN" });
    check("Unknown execution state forbids blind retry", unknownExecution.state === "UNKNOWN_EXECUTION_STATE" && unknownExecution.blindRetryAllowed === false && unknownExecution.verificationRequiredBeforeRetry === true, unknownExecution, "Runtime");
    const clock = namespace.getExternalIntelligenceClockQuality();
    check("Clock quality is not falsely asserted", clock.clockState === "CLOCK_UNVERIFIED" && clock.temporalCriticalAuthorityGranted === false, clock, "Runtime");
    const pythonWorker = namespace.getExternalIntelligencePythonWorkerCapability();
    check("Python worker is optional and unavailable by default", pythonWorker.configured === false && pythonWorker.state === "UNAVAILABLE", pythonWorker, "Python Worker");
    check("Python worker has no trading / secret / repository authority", pythonWorker.tradingAuthority === false && pythonWorker.secretAuthority === false && pythonWorker.canonicalRepositoryMutationAuthority === false, pythonWorker, "Python Worker");

    const supplyProfile = namespace.getExternalIntelligencePhase2GatewaySupplyChainProfile();
    check("Gateway uses Node built-ins only", supplyProfile.externalDependencyCount === 0 && supplyProfile.dependencyMode === "node-builtins-only", supplyProfile, "Supply Chain");
    check("Gateway requires no npm install", supplyProfile.packageManagerRequired === false && supplyProfile.runtimePackageInstallAllowed === false, supplyProfile, "Supply Chain");

    const dependency = namespace.createExternalIntelligenceDependencyCandidate({ packageName: "example-package", version: "1.0.0", sourceType: "OFFICIAL_REGISTRY", purpose: "phase2-validation", runtimeTarget: "NODE_GATEWAY", externalDependency: true });
    check("Dependency candidate can be created without install", dependency.ok === true && dependency.data.candidate.automaticInstallAllowed === false, dependency.data, "Supply Chain");
    if (dependency.ok) namespace.registerExternalIntelligenceDependencyCandidate(dependency.data.candidate);
    const admission = dependency.ok ? namespace.evaluateExternalIntelligenceDependencyAdmission(dependency.data.candidate.dependencyId) : null;
    check("External dependency without integrity hash requires review", admission && admission.ok === true && admission.data.admissionState === "REVIEW_REQUIRED" && admission.data.missingEvidence.includes("integrityHash"), admission && admission.data, "Supply Chain");
    const install = dependency.ok ? await namespace.requestExternalIntelligenceControlledInstall({ dependencyId: dependency.data.candidate.dependencyId, purpose: "phase2-validation" }) : null;
    check("Missing dependency never triggers automatic install", install && install.ok === false && install.data && install.data.automaticInstallPerformed === false, install && install.code, "Supply Chain");

    const hard = namespace.createExternalIntelligenceDependencyCandidate({ packageName: "blocked-artifact", version: "1.0.0", sourceType: "LOCAL_ARCHIVE", purpose: "negative-test", runtimeTarget: "NODE_GATEWAY", hardSecurityFail: true });
    if (hard.ok) namespace.registerExternalIntelligenceDependencyCandidate(hard.data.candidate);
    const hardAdmission = hard.ok ? namespace.evaluateExternalIntelligenceDependencyAdmission(hard.data.candidate.dependencyId) : null;
    check("Hard security fail remains blocked", hardAdmission && hardAdmission.ok === false && hardAdmission.code === "EXTERNAL010_DEPENDENCY_HARD_SECURITY_FAIL", hardAdmission && hardAdmission.code, "Supply Chain");

    const runtimeProfile = namespace.createExternalIntelligenceRuntimeProfile({ runtimeProfileId: internal.nextId("EXTERNAL-010-PHASE2-PROFILE"), nodeVersion: "captured-by-gateway-at-runtime", pythonVersion: "not-configured", dependencies: [], validationState: "VALID_WITH_BUILTINS_ONLY" });
    check("Runtime profile can be created", runtimeProfile.ok === true, runtimeProfile.code, "Supply Chain");
    check("Runtime profile has zero external dependencies", runtimeProfile.ok && runtimeProfile.data.profile.externalDependencyCount === 0, runtimeProfile.ok && runtimeProfile.data.profile, "Supply Chain");
    check("Runtime profile contract validates", runtimeProfile.ok && namespace.validateExternalIntelligenceContract("runtimeProfile", runtimeProfile.data.profile).valid === true, runtimeProfile.ok && runtimeProfile.data.profile, "Supply Chain");

    const remoteConfig = namespace.configureExternalIntelligenceGatewayClient({ baseUrl: "https://example.com" });
    check("Remote Gateway URL is rejected", remoteConfig.ok === false, remoteConfig.code, "Gateway Security");
    const loopbackConfig = namespace.configureExternalIntelligenceGatewayClient({ baseUrl: VERSION_MANIFEST.gateway.defaultBaseUrl });
    check("Loopback Gateway URL is accepted", loopbackConfig.ok === true, loopbackConfig.code, "Gateway Security");
    const gatewayClientState = namespace.getExternalIntelligenceGatewayClientState();
    check("Gateway token is never exposed by public client state", !hasOwn(gatewayClientState, "sessionToken") && gatewayClientState.sessionTokenPersisted === false, gatewayClientState, "Gateway Security");

    const authorityDenied = await namespace.requestAuthorityGovernedExternalIntelligenceGatewayOperation({ action: "READ_GATEWAY_RUNTIME", target: { type: "gateway", id: "local" }, purpose: "phase2-validation" });
    check("Gateway session layer cannot bypass Decision 039 authority", authorityDenied.ok === false && authorityDenied.code === "EXTERNAL010_GATEWAY_OPERATION_AUTHORITY_DENIED" && authorityDenied.data.gatewayRequestSent === false, authorityDenied.data, "Authority");

    const permission = await namespace.getExternalIntelligenceLoopbackPermissionState();
    check("Local Network Access permission state is handled without crash", permission && typeof permission.permission === "string", permission, "Gateway Browser", "Warning");

    let gatewayValidated = false;
    const health = requireGateway
      ? await namespace.getExternalIntelligenceGatewayHealth()
      : { ok: false, code: "EXTERNAL010_GATEWAY_NOT_REQUIRED_FOR_DEGRADED_GATE", data: null };
    if (requireGateway) {
      check("PC Gateway health is READY", health.ok === true && health.data && health.data.health && health.data.health.gatewayAvailable === true, health.data || health.code, "Gateway Runtime");
      if (health.ok) {
        const opened = await namespace.openExternalIntelligenceGatewaySession({ requestedScope: ["PROBE", "READ_RUNTIME"] });
        check("Ephemeral Gateway session opens", opened.ok === true && opened.data && opened.data.session && opened.data.session.state === "ACTIVE", opened.data || opened.code, "Gateway Session");
        check("Session token is not returned through EXTERNAL public result", opened.ok === true && !hasOwn(opened.data, "sessionToken") && opened.data.tokenReturnedToCaller === false && opened.data.sessionTokenPersisted === false, opened.data, "Gateway Session");
        const publicState = namespace.getExternalIntelligenceGatewayClientState();
        check("Session token remains memory-only", publicState.sessionTokenPresentInMemory === true && publicState.sessionTokenPersisted === false && !hasOwn(publicState, "sessionToken"), publicState, "Gateway Session");

        const replayRequestId = internal.nextId("PHASE2-REPLAY-REQUEST");
        const replayNonce = internal.nextId("PHASE2-REPLAY-NONCE");
        const probe1 = await namespace.probeExternalIntelligenceGateway({ probe: "phase2-browser" }, { requestId: replayRequestId, nonce: replayNonce });
        check("Protected Gateway probe succeeds", probe1.ok === true && probe1.data.response && probe1.data.response.code === "PROBE_ACCEPTED", probe1.data || probe1.code, "Gateway Session");
        check("Gateway probe grants no business authority", probe1.ok === true && probe1.data.response.businessAuthorityGranted === false, probe1.data && probe1.data.response, "Gateway Session");
        const replay = await namespace.probeExternalIntelligenceGateway({ probe: "phase2-browser-replay" }, { requestId: replayRequestId, nonce: replayNonce });
        check("Replay request is rejected", replay.ok === false && replay.data && replay.data.httpStatus === 409 && replay.data.response.code === "REQUEST_REPLAYED", replay.data || replay.code, "Gateway Session");
        const stale = await namespace.probeExternalIntelligenceGateway({ probe: "phase2-stale" }, { createdAt: new Date(Date.now() - 600000).toISOString() });
        check("Stale request is rejected", stale.ok === false && stale.data && stale.data.httpStatus === 408 && stale.data.response.code === "REQUEST_STALE", stale.data || stale.code, "Gateway Session");
        const runtime = await namespace.getProtectedExternalIntelligenceGatewayRuntime();
        check("Protected Gateway runtime is readable with valid session", runtime.ok === true && runtime.data.response && runtime.data.response.runtime.runtimeType === "NODE_GATEWAY", runtime.data || runtime.code, "Gateway Runtime");
        check("Gateway Runtime reports no business authority", runtime.ok === true && runtime.data.response.runtime.businessAuthorityGranted === false, runtime.data && runtime.data.response, "Gateway Runtime");
        check("Gateway Runtime reports zero external dependencies", runtime.ok === true && runtime.data.response.supplyChain.externalDependencyCount === 0, runtime.data && runtime.data.response, "Supply Chain");
        const revoked = await namespace.revokeExternalIntelligenceGatewaySession();
        check("Gateway session revokes", revoked.ok === true, revoked.code, "Gateway Session");
        const afterRevoke = await namespace.probeExternalIntelligenceGateway({ probe: "after-revoke" });
        check("Revoked session cannot be reused", afterRevoke.ok === false && afterRevoke.code === "EXTERNAL010_GATEWAY_SESSION_REQUIRED", afterRevoke.code, "Gateway Session");
        gatewayValidated = c.checks.slice(-10).every(function itemPassed(item) { return item.passed || item.severity !== "Critical"; });
      }
    } else {
      const degradedState = namespace.getExternalIntelligenceGatewayClientState();
      check("Gateway unavailability does not fail Browser Core", namespace.getExternalIntelligenceFoundationState().initialized === true, health.code, "Degraded Mode");
      check("Gateway-required capability can remain independent without network probe", ["UNKNOWN", "PERMISSION_REQUIRED", "UNAVAILABLE", "DEGRADED", "READY"].includes(degradedState.healthState), degradedState, "Degraded Mode");
      gatewayValidated = true;
    }

    EXPECTED_BROWSER_FILES.forEach(function fileMapped(file) {
      check("Browser file mapped: " + file, file === "17_external_intelligence_version_manifest.js" || Boolean(VERSION_MANIFEST.fileModules[file]), file, "Static Integration");
    });
    ["core", "contracts", "schemaRegistry", "authority", "audit", "runtimeCoordination", "softwareSupplyChain", "gatewayClient", "phase1Validation", "phase2Validation"].forEach(function moduleLoaded(name) {
      check("Module " + name + " is loaded", Boolean(namespace.modules[name]), namespace.modules[name] && namespace.modules[name].status, "Modules");
    });

    const summary = summarize(c.checks);
    const passedGate = summary.failed === 0 && summary.criticalFailed === 0 && gatewayValidated;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE2-VALIDATION"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      roadmapId: VERSION_MANIFEST.release.implementationRoadmapId,
      decisionCoverage: VERSION_MANIFEST.release.decisionCount,
      validationMode: requireGateway ? "PC_WITH_LOCAL_GATEWAY" : "BROWSER_DEGRADED_GATE",
      gatewayRequired: requireGateway,
      gatewayValidated: gatewayValidated,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: passedGate ? "EXTERNAL-010 Phase 02 Validation PASS" : "EXTERNAL-010 Phase 02 Validation FAIL",
      releaseAllowed: passedGate,
      phase2Complete: passedGate,
      phase3Allowed: passedGate,
      checks: c.checks,
      safety: internal.clone(VERSION_MANIFEST.safety),
      validatedAt: internal.nowIso()
    };

    const contractValidation = namespace.validateExternalIntelligenceContract("phase2ValidationResult", result);
    const schemaValidation = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE2-VALIDATION-RESULT", result);
    if (!contractValidation.valid || !schemaValidation.valid) {
      result.failed += 1;
      result.total += 1;
      result.criticalFailed += 1;
      result.health = Math.round((result.passed / result.total) * 1000) / 10;
      result.status = "EXTERNAL-010 Phase 02 Validation FAIL";
      result.releaseAllowed = false;
      result.phase2Complete = false;
      result.phase3Allowed = false;
      result.checks.push({ name: "Phase 02 result validates against contract and schema", passed: false, detail: internal.stableStringify({ contract: contractValidation, schema: schemaValidation }), group: "Validation", severity: "Critical" });
    } else {
      result.checks.push({ name: "Phase 02 result validates against contract and schema", passed: true, detail: "valid", group: "Validation", severity: "Critical" });
      result.passed += 1;
      result.total += 1;
      result.health = Math.round((result.passed / result.total) * 1000) / 10;
    }

    state.latestPhase2Validation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase2Validation.status = result.failed === 0 ? "Passed" : "Failed";
    internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase2Validation() {
    return state.latestPhase2Validation ? internal.clone(state.latestPhase2Validation) : null;
  }

  Object.assign(namespace.api, {
    runExternalIntelligencePhase2Validation: runExternalIntelligencePhase2Validation,
    getLatestExternalIntelligencePhase2Validation: getLatestExternalIntelligencePhase2Validation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase2Validation = {
    id: "EXTERNAL-010-PHASE2-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    pcGatewayValidationRequired: true,
    androidDegradedModeValidationRequired: true,
    expectedBrowserFiles: EXPECTED_BROWSER_FILES.slice(),
    loadedAt: internal.nowIso()
  };

  global.runExternalIntelligencePhase2Validation = runExternalIntelligencePhase2Validation;
  global.getLatestExternalIntelligencePhase2Validation = getLatestExternalIntelligencePhase2Validation;
})(typeof window !== "undefined" ? window : globalThis);
