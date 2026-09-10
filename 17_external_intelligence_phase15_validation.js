/* ============================================================
   FILE: 17_external_intelligence_phase15_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.14.1
   Phase 15: Multi-Layer Validation Framework Validation
   Primary Decision: 044
   Supporting Decision: 054
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase15Validation");

  function installFixtureSource(sourceId) {
    const now = internal.nowIso();
    state.sourceRegistry.set(sourceId, internal.deepFreeze({
      sourceId: sourceId, sourceName: "Phase 15 Validation Source", sourceType: "PUBLIC_API", provider: "Validation",
      category: "PUBLIC", accessMode: "BROWSER_DIRECT", adapterId: "EXTERNAL-010-ADAPTER-MOCK-001",
      endpointPolicy: { canonicalHost: "example.invalid", endpointReference: "validation://phase15", directUrlAccessAllowed: false, arbitraryPathAllowed: false, allowRedirects: false, operationResolutionRequired: true },
      authenticationMode: "NONE", secretReferenceId: null, allowedOperations: ["READ", "INTERNAL_ANALYSIS"], allowedMethods: ["GET"],
      pricingMode: "FREE", costCurrency: "JPY", enabled: true, lifecycleState: "ACTIVE", version: 1, identityState: "VERIFIED",
      reliabilityState: "UNASSESSED", authorityGranted: false, discoveryId: null, createdAt: now, updatedAt: now, immutable: true
    }));
    const policyId = "POLICY-P15-VALIDATION";
    const right = { state: "ALLOWED", conditions: [], evidenceIds: ["TERMS-P15"], clauseReference: "VALIDATION", confidence: "HIGH" };
    state.usagePolicies.set(policyId, internal.deepFreeze({ usagePolicyId: policyId, sourceId: sourceId, policyVersion: "1", status: "ACTIVE", rights: { READ: right, INTERNAL_ANALYSIS: right }, policyCompleteness: "COMPLETE", interpretationConfidence: "HIGH", immutable: true }));
    state.activeUsagePolicyBySource.set(sourceId, policyId);
  }

  async function runExternalIntelligencePhase15Validation() {
    const checks = [];
    function add(name, passed, detail, group, severity) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "Phase 15", severity: severity || "Critical" });
    }

    add("Release is Phase 15 v1.14.1 compatible", VERSION_MANIFEST.isReleaseCompatibleFrom("1.14.1"), VERSION_MANIFEST.release.version, "Foundation");
    add("Implementation Phase is Phase 15", VERSION_MANIFEST.release.phase === 15, VERSION_MANIFEST.release.implementationPhase, "Foundation");
    add("Phase 15 primary/supporting Decisions are 044 / 054", namespace.modules.phase15Validation.primaryDecision === "044" && namespace.modules.phase15Validation.supportingDecision === "054", namespace.modules.phase15Validation, "Foundation");
    add("Gateway remains unchanged at 1.4.0", VERSION_MANIFEST.gateway.gatewayVersion === "1.4.0", VERSION_MANIFEST.gateway.gatewayVersion, "Boundary");
    add("Phase 14 is marked complete and Phase 15 is allowed", VERSION_MANIFEST.implementation.phase14Complete === true && VERSION_MANIFEST.implementation.phase15Allowed === true, VERSION_MANIFEST.implementation, "Progression");

    const phase14 = await namespace.runExternalIntelligencePhase14Validation();
    const unexpectedPhase14Failures = phase14.checks.filter(function unexpected(item) { return !item.passed && item.name !== "Implementation Phase is Phase 14"; });
    add("Phase 14 regression remains PASS except expected frozen Phase identity check", unexpectedPhase14Failures.length === 0, { passed: phase14.passed, failed: phase14.failed, total: phase14.total, unexpectedFailures: unexpectedPhase14Failures.map(function map(item) { return item.name; }) }, "Regression");

    const init = namespace.initializeExternalIntelligenceValidationFramework();
    add("Validation Framework initializes", init.ok === true, init, "Framework");
    const framework = namespace.getExternalIntelligenceValidationFrameworkState();
    add("Decision 044 exposes 14 multi-layer validation dimensions", framework.dimensions.length === 14 && ["STRUCTURAL","SEMANTIC","REFERENCE","LINEAGE","TEMPORAL","EVIDENCE","POLICY","SECURITY","FRESHNESS","COVERAGE","CONSISTENCY","CALIBRATION","OUTCOME","INTEGRATION"].every(function has(d) { return framework.dimensions.indexOf(d) >= 0; }), framework.dimensions, "Dimensions");
    add("Purpose-specific validation suites cover initial Decision 044 purposes", framework.validationSuiteCount >= 8 && ["RESEARCH_USE","NAVIGATION_USE","PREDICTION_USE","BACKTEST_USE","EMERGENCY_USE","TRADING_CANDIDATE_USE","KNOWLEDGE_CANDIDATE_USE","AUDIT_USE"].every(function has(purpose) { return namespace.listExternalIntelligenceValidationSuites().some(function match(suite) { return suite.purpose === purpose; }); }), namespace.listExternalIntelligenceValidationSuites().map(function map(s) { return s.purpose; }), "Purpose Gate");
    add("Golden Dataset contains positive, failure, ambiguity, and Decision 054 security cases", framework.goldenCaseCount >= 13, namespace.listExternalIntelligenceGoldenValidationCases().map(function map(c) { return c.goldenCaseId; }), "Golden");

    const contracts = ["validationSuite","goldenValidationCase","validationProfile","validationEvidence","releaseGate","phase15ValidationResult"];
    add("Phase 15 contracts are registered", contracts.every(function has(key) { return Boolean(namespace.getExternalIntelligenceContract(key)); }), contracts, "Contract");
    const schemas = [
      "EXTERNAL-010-SCHEMA-VALIDATION-SUITE", "EXTERNAL-010-SCHEMA-GOLDEN-VALIDATION-CASE", "EXTERNAL-010-SCHEMA-VALIDATION-PROFILE",
      "EXTERNAL-010-SCHEMA-VALIDATION-EVIDENCE", "EXTERNAL-010-SCHEMA-RELEASE-GATE", "EXTERNAL-010-SCHEMA-PHASE15-VALIDATION-RESULT"
    ];
    add("Phase 15 schemas are registered", schemas.every(function has(id) { return Boolean(namespace.getExternalIntelligenceSchema(id)); }), schemas, "Schema");

    const sourceId = "SOURCE-P15-VALIDATION";
    installFixtureSource(sourceId);
    const evidenceRef = namespace.registerExternalIntelligenceEvidenceReference({ evidenceReferenceId: "EVIDENCE-REF-P15", sourceId: sourceId, evidenceId: "EVIDENCE-P15", contentId: "CONTENT-P15", acquiredAt: internal.nowIso(), availableAt: "2026-09-10T10:00:00.000Z", freshnessState: "FRESH", reliabilityState: "UNASSESSED" });
    add("Phase 15 fixture Evidence Reference is available without becoming Knowledge", evidenceRef.ok === true && evidenceRef.data.evidenceReference.knowledgeIdentityAssigned === false, evidenceRef, "Fixture");

    const originalPersistenceAdapter = state.validationPersistence.adapter;
    const originalPersistenceAdapterId = state.validationPersistence.adapterId;
    add("Default browser Validation persistence is not the temporary Memory adapter", !global.localStorage || originalPersistenceAdapterId === "EXTERNAL-010-VALIDATION-PERSISTENCE-LOCAL-STORAGE", { adapterId: originalPersistenceAdapterId }, "Persistence");

    const memoryPersistence = namespace.createExternalIntelligenceMemoryValidationPersistenceAdapter();
    let validResult = null;
    let validProfile = null;
    let readback = null;
    try {
      const persistenceSet = namespace.setExternalIntelligenceValidationPersistenceAdapter(memoryPersistence);
      add("Temporary Memory persistence adapter can be explicitly configured for isolated validation", persistenceSet.ok === true && state.validationPersistence.adapterId === "EXTERNAL-010-VALIDATION-PERSISTENCE-MEMORY", persistenceSet, "Persistence");

      validResult = await namespace.runExternalIntelligenceValidation({
        targetRecordId: "EVIDENCE-REF-P15", targetRecordVersion: "1", targetSchemaVersion: "1.13.0",
        targetRecord: evidenceRef.data.evidenceReference, schemaId: "EXTERNAL-010-SCHEMA-EXTERNAL-EVIDENCE-REFERENCE",
        purpose: "RESEARCH_USE", references: [{ type: "SOURCE", id: sourceId }, { type: "EVIDENCE", id: "EVIDENCE-REF-P15" }],
        evidenceIds: ["EVIDENCE-REF-P15"], sourceId: sourceId, policyOperation: "READ", securityState: "CLEAN",
        freshnessState: "FRESH", coverageState: "COMPLETE", temporalIntent: "AS_OF", decisionTime: "2026-09-10T12:00:00.000Z", availableAt: "2026-09-10T10:00:00.000Z",
        dimensionOverrides: [{ dimension: "LINEAGE", state: "PASS", severity: "INFO", code: "FIXTURE_LINEAGE_VALID", details: { validationFixture: true } }],
        validationEnvironment: "PHASE15_FUNCTIONAL"
      });
      validProfile = validResult.data && validResult.data.validationProfile;
      readback = validProfile ? await namespace.readBackExternalIntelligenceValidationRecord(validProfile.validationProfileId) : null;
    } finally {
      if (originalPersistenceAdapter) {
        namespace.setExternalIntelligenceValidationPersistenceAdapter(originalPersistenceAdapter);
      } else if (global.localStorage) {
        namespace.setExternalIntelligenceValidationPersistenceAdapter(namespace.createExternalIntelligenceLocalStorageValidationPersistenceAdapter());
      }
    }

    add("Multi-layer validation creates an immutable purpose-specific profile", validResult && validResult.ok === true && validProfile && validProfile.purpose === "RESEARCH_USE" && validProfile.immutable === true, validProfile, "Validation Profile");
    add("Validation PASS grants neither approval, authority, truth authority, nor promotion", validProfile && validProfile.approvalGranted === false && validProfile.authorityGranted === false && validProfile.truthAuthorityGranted === false && validProfile.canonicalPromotionPerformed === false, validProfile, "Authority");
    const validationLineage = namespace.traceExternalIntelligenceReverseProvenance(validProfile.validationProfileId);
    add("Validation Result is linked to target through immutable analytical lineage", validResult.data.lineage && validResult.data.lineage.ok === true && validationLineage.references.some(function has(item) { return item.referenceId === "EVIDENCE-REF-P15"; }), { lineage: validResult.data.lineage, trace: validationLineage }, "Lineage");
    add("Temporary Memory validation persists and reads back without mutating historical result", readback && readback.ok === true && readback.data.record.validationProfileId === validProfile.validationProfileId && readback.data.record.immutable === true, readback, "Persistence");
    add("Temporary Memory adapter is restored after isolated validation", state.validationPersistence.adapterId === originalPersistenceAdapterId && state.validationPersistence.adapter === originalPersistenceAdapter, { before: originalPersistenceAdapterId, after: state.validationPersistence.adapterId }, "Persistence");

    let localStoragePersistenceCheck = { supported: Boolean(global.localStorage), persisted: false, readBack: false, rawStored: false, restored: false, error: null };
    if (global.localStorage) {
      const probeStorageKey = "EXTERNAL010_VALIDATION_RESULTS_PHASE15_V1141_PROBE";
      const restoreAdapter = state.validationPersistence.adapter;
      const restoreAdapterId = state.validationPersistence.adapterId;
      try {
        global.localStorage.removeItem(probeStorageKey);
        const localStorageAdapter = namespace.createExternalIntelligenceLocalStorageValidationPersistenceAdapter(probeStorageKey);
        const localSet = namespace.setExternalIntelligenceValidationPersistenceAdapter(localStorageAdapter);
        const persisted = await namespace.persistExternalIntelligenceValidationRecord(validProfile);
        const localReadback = await namespace.readBackExternalIntelligenceValidationRecord(validProfile.validationProfileId);
        const rawStored = global.localStorage.getItem(probeStorageKey);
        localStoragePersistenceCheck.persisted = localSet.ok === true && persisted.ok === true;
        localStoragePersistenceCheck.readBack = localReadback.ok === true && localReadback.data && localReadback.data.record && localReadback.data.record.validationProfileId === validProfile.validationProfileId;
        localStoragePersistenceCheck.rawStored = typeof rawStored === "string" && rawStored.indexOf(validProfile.validationProfileId) >= 0;
      } catch (error) {
        localStoragePersistenceCheck.error = error && error.message || String(error);
      } finally {
        try { global.localStorage.removeItem(probeStorageKey); } catch (_) { /* cleanup best effort */ }
        if (restoreAdapter) namespace.setExternalIntelligenceValidationPersistenceAdapter(restoreAdapter);
        localStoragePersistenceCheck.restored = state.validationPersistence.adapter === restoreAdapter && state.validationPersistence.adapterId === restoreAdapterId;
      }
    }
    add("Real LocalStorage persistence performs write/readback and restores production adapter", localStoragePersistenceCheck.supported && localStoragePersistenceCheck.persisted && localStoragePersistenceCheck.readBack && localStoragePersistenceCheck.rawStored && localStoragePersistenceCheck.restored, localStoragePersistenceCheck, "Persistence");
    add("Production Validation persistence remains non-Memory after functional validation", state.validationPersistence.adapterId !== "EXTERNAL-010-VALIDATION-PERSISTENCE-MEMORY", { adapterId: state.validationPersistence.adapterId }, "Persistence");

    const evidence = namespace.createExternalIntelligenceValidationEvidence({ validationProfileId: validProfile.validationProfileId, testCaseId: "P15-VALID-BASELINE", expected: { state: "PASS" }, actual: { state: validProfile.overallState }, passed: validProfile.purposeAllowed === true, severity: "INFO", executionEnvironment: "PHASE15_FUNCTIONAL", relatedRecordIds: ["EVIDENCE-REF-P15"] });
    add("Validation Evidence is a separate immutable record", evidence.ok === true && evidence.data.validationEvidence.failedEvidencePreserved === true && evidence.data.validationEvidence.immutable === true, evidence, "Validation Evidence");

    const structuralFail = namespace.evaluateExternalIntelligenceValidationDimensions({ targetRecord: { evidenceReferenceId: "BROKEN" }, schemaId: "EXTERNAL-010-SCHEMA-EXTERNAL-EVIDENCE-REFERENCE", securityState: "CLEAN", freshnessState: "FRESH", coverageState: "COMPLETE" });
    add("Structural Validation detects malformed/required-field failures", structuralFail.some(function find(item) { return item.dimension === "STRUCTURAL" && item.state === "FAIL"; }), structuralFail, "Structural");

    const semanticFail = namespace.evaluateExternalIntelligenceValidationDimensions({ targetRecord: { probability: 1.25, volume: -1 }, securityState: "CLEAN", freshnessState: "FRESH", coverageState: "COMPLETE" });
    add("Semantic Validation detects invalid probability/volume invariants", semanticFail.some(function find(item) { return item.dimension === "SEMANTIC" && item.state === "FAIL"; }), semanticFail, "Semantic");

    const referenceFail = namespace.evaluateExternalIntelligenceValidationDimensions({ references: [{ type: "SOURCE", id: "MISSING-SOURCE-P15" }], securityState: "CLEAN", freshnessState: "FRESH", coverageState: "COMPLETE" });
    add("Reference Validation detects unresolved governed references", referenceFail.some(function find(item) { return item.dimension === "REFERENCE" && item.state === "FAIL"; }), referenceFail, "Reference");

    const lookAhead = await namespace.runExternalIntelligenceValidation({ targetRecordId: "BACKTEST-P15", purpose: "BACKTEST_USE", temporalIntent: "BACKTEST", decisionTime: "2026-01-01T00:00:00.000Z", availableAt: "2026-01-02T00:00:00.000Z", securityState: "CLEAN", coverageState: "COMPLETE", dimensionOverrides: [{ dimension: "STRUCTURAL", state: "PASS" }, { dimension: "REFERENCE", state: "PASS" }, { dimension: "LINEAGE", state: "PASS" }, { dimension: "EVIDENCE", state: "PASS" }, { dimension: "POLICY", state: "PASS" }, { dimension: "INTEGRATION", state: "PASS" }] });
    add("Historical/Backtest look-ahead contamination is Critical and blocks purpose", lookAhead.ok === true && lookAhead.data.validationProfile.overallState === "BLOCKED" && lookAhead.data.validationProfile.criticalFailureCount > 0 && lookAhead.data.validationProfile.purposeAllowed === false, lookAhead.data.validationProfile, "Temporal");

    const staleResearch = await namespace.runExternalIntelligenceValidation({ targetRecordId: "STALE-P15", purpose: "RESEARCH_USE", securityState: "CLEAN", freshnessState: "STALE", coverageState: "PARTIAL", dimensionOverrides: [{ dimension: "STRUCTURAL", state: "PASS" }, { dimension: "POLICY", state: "PASS" }] });
    add("Stale/partial does not automatically equal invalid for Research purpose", staleResearch.ok === true && staleResearch.data.validationProfile.overallState === "PASS_WITH_WARNINGS" && staleResearch.data.validationProfile.purposeAllowed === true, staleResearch.data.validationProfile, "Freshness/Coverage");

    const history = namespace.createExternalIntelligenceHistoricalReplayRecord({ originalRecordId: validProfile.validationProfileId, originalSnapshotId: "SNAPSHOT-P15", replaySuiteId: validProfile.validationSuiteId, replaySuiteVersion: validProfile.validationSuiteVersion, replayResult: { state: "PASS" } });
    add("Historical Replay is isolated from original production result", history.ok === true && history.data.historicalReplay.originalProductionResultRewritten === false && history.data.historicalReplay.replayEqualsOriginalProductionResult === false, history, "Historical Replay");

    const differential = namespace.createExternalIntelligenceDifferentialValidationRecord({ targetRecordId: "DIFF-P15", currentVersion: "1", candidateVersion: "2", current: { value: 1 }, candidate: { value: 2 }, unexpectedDifferenceCount: 1 });
    add("Shadow/Differential hook preserves version difference without automatic promotion", differential.ok === true && differential.data.differentialValidation.changedRecords.length === 1 && differential.data.differentialValidation.automaticPromotionPerformed === false, differential, "Differential");

    const runtimeHealth = namespace.createExternalIntelligenceRuntimeHealthValidation({ runtimeInstanceId: "RUNTIME-P15", capabilities: { GATEWAY: "READY", STORAGE: "READY", SCANNER: "UNKNOWN", POLICY: "READY" } });
    add("Runtime Health is tracked separately from information truth", runtimeHealth.ok === true && runtimeHealth.data.runtimeHealthValidation.informationTruthGranted === false, runtimeHealth, "Runtime Health");

    const gatewayCases = [
      ["Valid session request passes only with operation authority", { sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true }, "PASS", null],
      ["Malicious cross-origin request is rejected", { sessionState: "ACTIVE", originValid: false, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true }, "BLOCKED", "ORIGIN_INVALID"],
      ["Missing session is rejected", { sessionState: "MISSING", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true }, "BLOCKED", "SESSION_MISSING"],
      ["Expired session is rejected", { sessionState: "EXPIRED", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true }, "BLOCKED", "SESSION_EXPIRED"],
      ["Revoked session is rejected", { sessionState: "REVOKED", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true }, "BLOCKED", "SESSION_REVOKED"],
      ["Replayed request is rejected", { sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: true, runtimeBindingValid: true, operationAuthorityAllowed: true }, "BLOCKED", "REPLAY_DETECTED"],
      ["Old session after Gateway restart is rejected by runtime binding", { sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: false, operationAuthorityAllowed: true }, "BLOCKED", "RUNTIME_SESSION_BINDING_INVALID"],
      ["Valid Gateway session without operation authority is rejected", { sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: false }, "BLOCKED", "OPERATION_AUTHORITY_MISSING"],
      ["Session token exposure candidate is rejected", { sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true, tokenExposureCandidate: true }, "BLOCKED", "SESSION_TOKEN_EXPOSURE_CANDIDATE"],
      ["Sensitive health response candidate is rejected", { sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true, healthSensitiveDataCandidate: true }, "BLOCKED", "SENSITIVE_HEALTH_RESPONSE_CANDIDATE"]
    ];
    gatewayCases.forEach(function each(entry) {
      const result = namespace.evaluateExternalIntelligenceGatewayRequestIntegrity(entry[1]);
      add(entry[0], result.overallState === entry[2] && (entry[3] == null || result.reasons.indexOf(entry[3]) >= 0), result, "Decision 054");
    });
    const authSplit = namespace.evaluateExternalIntelligenceGatewayRequestIntegrity({ sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: false });
    add("Request Authentication remains separate from Operation Authorization", authSplit.requestAuthenticationPassed === true && authSplit.operationAuthorizationPassed === false && authSplit.requestAuthenticationEqualsOperationAuthorization === false, authSplit, "Authority Separation");

    const blockedGate = namespace.createExternalIntelligenceReleaseGate({ targetVersion: VERSION_MANIFEST.release.version, validationSuiteVersions: [lookAhead.data.validationProfile.validationSuiteVersion], validationProfileIds: [lookAhead.data.validationProfile.validationProfileId], passed: 10, failed: 1, criticalFailed: 1, mandatoryGates: { Static: true, Contract: true, Golden: false, Regression: true, Persistence: true, Security: true, Policy: true, Integration: true, ControlledRuntime: false } });
    add("Critical failure blocks Release Gate", blockedGate.ok === true && blockedGate.data.releaseGate.releaseAllowed === false, blockedGate, "Release Gate");
    const readyGate = namespace.createExternalIntelligenceReleaseGate({ targetVersion: VERSION_MANIFEST.release.version, validationSuiteVersions: [validProfile.validationSuiteVersion], validationProfileIds: [validProfile.validationProfileId], passed: 10, failed: 0, criticalFailed: 0, mandatoryGates: { Static: true, Contract: true, Golden: true, Regression: true, Persistence: true, Security: true, Policy: true, Integration: true, ControlledRuntime: true } });
    add("All mandatory gates can produce Release Allowed without granting Project Owner approval", readyGate.ok === true && readyGate.data.releaseGate.releaseAllowed === true && readyGate.data.releaseGate.evidenceGrounded === true && readyGate.data.releaseGate.approvalGranted === false && readyGate.data.releaseGate.authorityGranted === false, readyGate, "Release Gate");

    add("Validation safety rules are fixed in Version Manifest", VERSION_MANIFEST.safety.validationPassEqualsApproval === false && VERSION_MANIFEST.safety.validationPassEqualsAuthorityGrant === false && VERSION_MANIFEST.safety.staleEqualsInvalid === false && VERSION_MANIFEST.safety.contradictionDetectedEqualsSystemError === false && VERSION_MANIFEST.safety.mockPassEqualsRealRuntimeValidated === false && VERSION_MANIFEST.safety.validationFailureGrantsCanonicalModificationAuthority === false, VERSION_MANIFEST.safety, "Safety");
    add("Decision 054 security boundaries remain fixed", VERSION_MANIFEST.safety.corsEqualsAuthentication === false && VERSION_MANIFEST.safety.localhostAutomaticallyTrusted === false && VERSION_MANIFEST.safety.gatewaySessionEqualsBusinessAuthority === false && VERSION_MANIFEST.safety.gatewaySessionTokenPersistenceAllowed === false, VERSION_MANIFEST.safety, "Decision 054 Safety");

    const passed = checks.filter(function passed(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    const result = internal.deepFreeze({
      id: internal.nextId("EXTERNAL-010-PHASE15-VALIDATION"), componentId: "EXTERNAL-010", version: VERSION_MANIFEST.release.version,
      gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion, implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      decisionCoverage: 54, requirementCoverage: { primaryDecision: "044", supportingDecision: "054", multiLayerDimensions: 14, purposeSpecificSuites: 8, goldenDataset: true, persistenceReadback: true, localStoragePersistenceReadback: true, temporaryAdapterRestoration: true, releaseGate: true, gatewayIntegrityValidation: true },
      passed: passed, failed: failed, total: checks.length, health: checks.length ? Number((passed / checks.length * 100).toFixed(1)) : 0,
      criticalFailed: criticalFailed, status: failed === 0 ? "EXTERNAL-010 Phase 15 Validation PASS" : "EXTERNAL-010 Phase 15 Validation FAIL",
      releaseAllowed: failed === 0 && criticalFailed === 0, phase15Complete: failed === 0 && criticalFailed === 0, phase16Allowed: failed === 0 && criticalFailed === 0,
      checks: checks, validatedAt: internal.nowIso(), immutable: true
    });
    const contractValidation = namespace.validateExternalIntelligenceContract("phase15ValidationResult", result);
    const schemaValidation = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE15-VALIDATION-RESULT", result);
    return Object.assign({}, internal.clone(result), { validationContractValid: contractValidation.valid === true, validationSchemaValid: schemaValidation.valid === true });
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase15Validation: runExternalIntelligencePhase15Validation });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase15Validation = { id: "EXTERNAL-010-PHASE15-VALIDATION", version: MODULE_VERSION, status: "Ready", phase: 15, primaryDecision: "044", supportingDecision: "054", loadedAt: internal.nowIso() };
  global.runExternalIntelligencePhase15Validation = runExternalIntelligencePhase15Validation;
})(typeof window !== "undefined" ? window : globalThis);
