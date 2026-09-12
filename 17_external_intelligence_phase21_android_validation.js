/* ============================================================
   FILE: 17_external_intelligence_phase21_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.20.0
   Phase 21 Android Real Device Final Validation
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence, VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase21AndroidValidation");

  async function runExternalIntelligencePhase21AndroidValidation() {
    const base = await namespace.runExternalIntelligencePhase21Validation();
    const checks = [];
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const add = function add(name, passed, detail, group) { checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Phase 21 Android", severity: "Critical" }); };

    add("Phase 21 Integrated Functional Validation remains PASS on Android build", base.failed === 0 && base.criticalFailed === 0, { passed: base.passed, failed: base.failed, total: base.total }, "Regression");
    add("Android/browser runtime is active", typeof global !== "undefined" && /Android|Mobile/i.test(ua), ua, "Runtime");
    add("Application can operate with Gateway unavailable", namespace.modules.gatewayClient && namespace.modules.gatewayClient.gatewayFailureBreaksCore === false && namespace.modules.capabilityResilience && namespace.modules.capabilityResilience.gatewayFailureImpliesCoreFailure === false, { gatewayClient: namespace.modules.gatewayClient, resilience: namespace.modules.capabilityResilience }, "Offline");

    namespace.reportExternalIntelligenceComponentHealth({ componentId: "GATEWAY", componentType: "GATEWAY", healthState: "UNAVAILABLE", offlineAvailable: false });
    namespace.reportExternalIntelligenceComponentHealth({ componentId: "EVIDENCE_STORE", componentType: "STORAGE", healthState: "READY", offlineAvailable: true });
    const degraded = namespace.evaluateExternalIntelligenceCapabilityHealth({ capabilityId: "EXTERNAL-010-CAPABILITY-EXISTING-EVIDENCE-READ" });
    add("Gateway outage is visible as governed DEGRADED state rather than false Core failure", degraded && degraded.ok === true && degraded.data && degraded.data.capabilityHealth && degraded.data.capabilityHealth.healthState === "DEGRADED", degraded, "Offline");

    add("External state remains inspectable through governed read APIs", typeof namespace.getExternalIntelligenceGatewayClientState === "function" && typeof namespace.getExternalIntelligenceValidationFrameworkState === "function" && typeof namespace.listExternalIntelligenceRecoveryPoints === "function", { gateway: namespace.getExternalIntelligenceGatewayClientState(), validation: namespace.getExternalIntelligenceValidationFrameworkState() }, "Read-only");
    add("No Secret exposure to Browser/Android state", namespace.modules.secretGovernance && namespace.modules.secretGovernance.referenceOnly === true && namespace.modules.secretGovernance.secretValueApiAvailable === false && namespace.modules.gatewayClient && namespace.modules.gatewayClient.secretValueReturnedToBrowser === false, { secret: namespace.modules.secretGovernance, gateway: namespace.modules.gatewayClient }, "Security");
    add("No unauthorized Repository / Knowledge / Trading mutation authority", VM.safety.directRepositoryMutationAllowed === false && VM.safety.automaticKnowledgePromotionAllowed === false && VM.safety.automaticTradeExecutionAllowed === false, VM.safety, "Authority");
    add("No automatic approval / promotion from validation success", VM.safety.validationPassEqualsApproval === false && VM.safety.validationPassEqualsAuthorityGrant === false && VM.safety.validationPassEqualsKnowledgePromotion === false, VM.safety, "Authority");
    add("Recovery/session credentials cannot be reconstructed or restored ACTIVE", VM.safety.restoredSessionRecordEqualsCurrentAuthentication === false && VM.safety.evidenceBackupMayReconstructCredential === false && namespace.modules.disasterRecovery && namespace.modules.disasterRecovery.secretReconstructionAllowed === false, { safety: VM.safety, recovery: namespace.modules.disasterRecovery }, "Recovery / Session");

    const failed = checks.filter(function fail(item) { return !item.passed; });
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE21-ANDROID-REAL-DEVICE"), componentId: "EXTERNAL-010", version: VM.release.version, gatewayVersion: VM.gateway.gatewayVersion,
      implementationPhase: VM.release.implementationPhase, passed: checks.length - failed.length, failed: failed.length, total: checks.length,
      health: checks.length ? Math.round((checks.length - failed.length) * 1000 / checks.length) / 10 : 0, criticalFailed: failed.length,
      status: failed.length ? "EXTERNAL-010 Phase 21 Android Real Device Validation FAILED" : "EXTERNAL-010 Phase 21 Android Real Device Validation PASS",
      releaseAllowed: failed.length === 0, phase21AndroidRealDeviceComplete: failed.length === 0, phase21FinalGateReady: failed.length === 0,
      projectOwnerAcceptanceRequired: true, automaticAcceptancePerformed: false, automaticPromotionPerformed: false,
      androidRealDeviceValidation: { passed: failed.length === 0, userAgent: ua, gatewayRequiredForCore: false, staticIntegrityPassed: base.staticIntegrity && base.staticIntegrity.ok === true },
      checks, validatedAt: internal.nowIso(), immutable: true
    };
    state.latestPhase21AndroidValidation = internal.deepFreeze(internal.clone(result));
    return result;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase21AndroidValidation });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase21AndroidValidation = runExternalIntelligencePhase21AndroidValidation;
  namespace.modules.phase21AndroidValidation = { id: "EXTERNAL-010-PHASE21-ANDROID-REAL-DEVICE", version: MODULE_VERSION, phase: 21, status: "Ready" };
})(typeof window !== "undefined" ? window : globalThis);
