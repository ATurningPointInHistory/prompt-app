/* ============================================================
   FILE: 17_external_intelligence_phase4_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 04 PC Real Runtime Validation
   Browser Direct + Governed Local Gateway Real HTTP
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 04 PC real-runtime validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase4RealRuntimeValidation");
  const PURPOSE = "phase4-pc-real-runtime";

  function collector() {
    const checks = [];
    return {
      checks,
      check(name, passed, detail, group, severity) {
        checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "PC Real Runtime", severity: severity || "Critical" });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter((item) => item.passed).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter((item) => !item.passed && item.severity === "Critical").length;
    return { passed, failed, total: checks.length, criticalFailed, health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0 };
  }

  async function grantAuthority(action, type, id, owned, purpose) {
    const authorityPurpose = internal.text(purpose, "") || PURPOSE;
    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action, target: { type, id }, purpose: authorityPurpose, scope: { domain: "EXTERNAL-010", operation: action } });
    if (!candidate.ok) return { ok: false, candidate };
    owned.push(candidate.data.envelope.authorityEnvelopeId);
    const activated = await namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId, { validationOnly: true });
    return { ok: activated.ok === true, candidate, activated, envelopeId: candidate.data.envelope.authorityEnvelopeId };
  }

  async function setupFreeSource(sourceId, adapterId, accessMode, endpoint, budgetId, owned) {
    const operationId = "READ";
    const regAuth = await grantAuthority("REGISTER_EXTERNAL_SOURCE", "source", sourceId, owned);
    if (!regAuth.ok) return { ok: false, stage: "register-authority", result: regAuth };

    const registered = await namespace.registerExternalIntelligenceSource({
      sourceId,
      sourceName: "Phase 04 PC Real Runtime " + sourceId,
      sourceType: "PUBLIC_API",
      provider: "EXTERNAL-010 Controlled HTTP Fixture",
      accessMode,
      adapterId,
      endpointPolicy: { canonicalHost: endpoint.canonicalHost, endpointReference: endpoint.endpointReference, allowRedirects: false },
      authenticationMode: "NONE",
      allowedOperations: [operationId],
      allowedMethods: ["GET"],
      pricingMode: "FREE",
      purpose: PURPOSE
    });
    if (!registered.ok) return { ok: false, stage: "register", result: registered };

    const policyCandidate = namespace.createExternalIntelligenceUsagePolicyCandidate({
      sourceId,
      policyVersion: "phase4-pc-real-runtime-1",
      policyEvidenceIds: ["PHASE4-PC-LOCAL-FIXTURE-POLICY"],
      policyCompleteness: "COMPLETE",
      interpretationConfidence: "HIGH",
      rights: { READ: { state: "ALLOWED", confidence: "HIGH", evidenceIds: ["PHASE4-PC-LOCAL-FIXTURE-POLICY"] } }
    });
    if (!policyCandidate.ok) return { ok: false, stage: "policy-candidate", result: policyCandidate };
    const policyAuth = await grantAuthority("ACTIVATE_USAGE_POLICY", "usage-policy", policyCandidate.data.usagePolicy.usagePolicyId, owned);
    if (!policyAuth.ok) return { ok: false, stage: "policy-authority", result: policyAuth };
    const policyActive = await namespace.activateExternalIntelligenceUsagePolicy({ usagePolicyId: policyCandidate.data.usagePolicy.usagePolicyId, purpose: PURPOSE });
    if (!policyActive.ok) return { ok: false, stage: "policy-activate", result: policyActive };

    const enableAuth = await grantAuthority("ENABLE_EXTERNAL_SOURCE", "source", sourceId, owned);
    if (!enableAuth.ok) return { ok: false, stage: "enable-authority", result: enableAuth };
    const enabled = await namespace.enableExternalIntelligenceSource({ sourceId, operations: [operationId], purpose: PURPOSE });
    if (!enabled.ok) return { ok: false, stage: "enable", result: enabled };

    const activateAuth = await grantAuthority("ACTIVATE_EXTERNAL_SOURCE", "source", sourceId, owned);
    if (!activateAuth.ok) return { ok: false, stage: "activate-authority", result: activateAuth };
    const activated = await namespace.activateExternalIntelligenceSource({ sourceId, purpose: PURPOSE });
    if (!activated.ok) return { ok: false, stage: "activate", result: activated };

    const operationContractId = "EXTERNAL-010-OP-" + sourceId.replace(/^SOURCE-/, "") + "-READ";
    const opAuth = await grantAuthority("REGISTER_SOURCE_OPERATION_CONTRACT", "source-operation", operationContractId, owned, "phase4-operation-contract");
    if (!opAuth.ok) return { ok: false, stage: "operation-authority", result: opAuth };
    const operation = await namespace.registerExternalIntelligenceSourceOperationContract({
      operationContractId,
      sourceId,
      operationId,
      adapterId,
      method: "GET",
      endpoint,
      parameterPolicy: { required: [], optional: ["query"], allowUnknown: false, maxParameterCount: 8 },
      timeoutPolicy: { timeoutMs: 5000 },
      retryPolicy: { maxAttempts: 2, initialDelayMs: 0, maxDelayMs: 250, backoffPolicy: "EXPONENTIAL", retryableCategories: ["TIMEOUT", "RATE_LIMITED", "SOURCE_UNAVAILABLE", "TEMPORARY_SOURCE_UNAVAILABLE"] },
      responseMode: "JSON",
      executionHints: { backgroundPreferred: false, expectedResponseSize: "SMALL", longRunning: false, batch: false },
      estimatedUsage: { REQUEST_COUNT: 1, NETWORK_BYTES: 4096, PROCESSING_TIME: 5000 }
    });
    if (!operation.ok) return { ok: false, stage: "operation-register", result: operation };

    const request = namespace.createExternalIntelligenceAcquisitionRequest({
      sourceId,
      operationId,
      parameters: { query: accessMode === "BROWSER_DIRECT" ? "browser-real-http" : "gateway-real-http" },
      priority: "NORMAL",
      executionPreference: "IMMEDIATE",
      purpose: PURPOSE,
      requestedBy: "Project Owner PC Real Runtime Validation",
      correlationId: "PHASE4-PC-REAL-RUNTIME",
      idempotencyKey: "PHASE4-PC-" + sourceId + "-" + Date.now(),
      budgetIds: [budgetId],
      acquisitionPlanId: "PHASE4-PC-PLAN",
      researchGoalId: "PHASE4-PC-GOAL"
    });
    if (!request.ok) return { ok: false, stage: "request-create", result: request };
    const execAuth = await grantAuthority("EXECUTE_EXTERNAL_ACQUISITION", "external-acquisition", request.data.request.requestId, owned);
    if (!execAuth.ok) return { ok: false, stage: "execute-authority", result: execAuth };
    return { ok: true, request: request.data.request, operation: operation.data.operationContract, source: namespace.getExternalIntelligenceSource(sourceId) };
  }

  async function runExternalIntelligencePhase4PcRealRuntimeValidation(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const fixtureBaseUrl = internal.text(settings.fixtureBaseUrl, "http://127.0.0.1:43120").replace(/\/+$/, "");
    const gatewayBaseUrl = internal.text(settings.gatewayBaseUrl, VERSION_MANIFEST.gateway.defaultBaseUrl).replace(/\/+$/, "");
    const c = collector();
    const check = c.check;
    const owned = [];
    const suffix = Date.now().toString(36).toUpperCase();

    try {
      check("Release Version is compatible with Phase 04 baseline", VERSION_MANIFEST.isReleaseCompatibleFrom("1.3.0"), VERSION_MANIFEST.release.version, "Foundation");
      const init = await namespace.initializeExternalIntelligenceFoundation();
      check("Foundation initializes for PC real runtime", init && init.ok === true, init && init.code, "Foundation");

      const configured = namespace.configureExternalIntelligenceGatewayClient({ baseUrl: gatewayBaseUrl });
      check("Gateway client uses explicit loopback base URL", configured.ok === true && configured.data.baseUrl === gatewayBaseUrl, configured.data || configured.code, "Gateway");
      const health = await namespace.getExternalIntelligenceGatewayHealth();
      check("Real Gateway health is READY", health.ok === true && health.data.health && ["1.2.0", "1.3.0", "1.4.0"].includes(health.data.health.gatewayVersion), health.data || health.code, "Gateway");

      const session = await namespace.openExternalIntelligenceGatewaySession({ requestedScope: ["PROBE", "READ_RUNTIME", "ACQUIRE_PUBLIC"] });
      check("Gateway session with ACQUIRE_PUBLIC is created", session.ok === true && session.data.session.scope.includes("ACQUIRE_PUBLIC"), session.data || session.code, "Gateway Security");
      const bridge = namespace.enableExternalIntelligenceGatewayAcquisitionBridge();
      check("Built-in governed Gateway bridge is enabled", bridge.ok === true && bridge.data.arbitraryUrlProxyEnabled === false, bridge.data || bridge.code, "Gateway");

      const ownerApproval = namespace.setExternalIntelligenceAuthorityApprovalAdapter({ adapterId: "EXTERNAL-010-PHASE4-PC-OWNER-APPROVAL", requiresExplicitOwnerInteraction: true, async verifyApproval() { return { approved: true, actorType: "Project Owner", interactionEvidenceId: "PHASE4-PC-OWNER-INTERACTION" }; } });
      check("Project Owner validation approval adapter configured", ownerApproval.ok === true, ownerApproval.code, "Authority");

      const budgetCandidate = namespace.createExternalIntelligenceResourceBudgetCandidate({ scopeType: "GLOBAL", scopeId: "EXTERNAL-010", currency: "JPY", period: { type: "PC_REAL_RUNTIME" }, limits: { REQUEST_COUNT: { softLimit: 20, hardLimit: 40 }, NETWORK_BYTES: { softLimit: 1000000, hardLimit: 2000000 }, PROCESSING_TIME: { softLimit: 100000, hardLimit: 200000 }, FINANCIAL_COST: { softLimit: 0, hardLimit: 0 } } });
      check("PC real-runtime budget candidate created", budgetCandidate.ok === true, budgetCandidate.data || budgetCandidate.code, "Budget");
      const budgetId = budgetCandidate.ok ? budgetCandidate.data.budget.budgetId : null;
      if (budgetId) {
        const budgetAuth = await grantAuthority("ACTIVATE_RESOURCE_BUDGET", "resource-budget", budgetId, owned);
        const budgetActive = budgetAuth.ok ? await namespace.activateExternalIntelligenceResourceBudget({ budgetId, purpose: PURPOSE }) : budgetAuth;
        check("PC real-runtime budget activated", budgetAuth.ok === true && budgetActive.ok === true, { budgetAuth, budgetActive }, "Budget");
      }

      const fixture = new URL(fixtureBaseUrl);
      const browserSourceId = "SOURCE-PHASE4-PC-BROWSER-" + suffix;
      const browserSetup = await setupFreeSource(browserSourceId, VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson, "BROWSER_DIRECT", { exactUrl: fixtureBaseUrl + "/browser-json", canonicalHost: fixture.hostname, endpointReference: "phase4-pc-browser-json" }, budgetId, owned);
      check("Governed Browser Direct source is prepared", browserSetup.ok === true, browserSetup, "Browser Direct");
      const browserExecution = browserSetup.ok ? await namespace.executeExternalIntelligenceAcquisition({ requestId: browserSetup.request.requestId }) : null;
      check("Browser Direct performs real HTTP acquisition", browserExecution && browserExecution.ok === true && browserExecution.data.response.payload && browserExecution.data.response.payload.transport === "BROWSER_DIRECT", browserExecution && (browserExecution.data || browserExecution.code), "Browser Direct");
      check("Browser Direct result retains adapter lineage", browserExecution && browserExecution.ok === true && browserExecution.data.response.evidenceInput.adapterId === VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson, browserExecution && browserExecution.data.response.evidenceInput, "Lineage");

      const gatewaySourceId = "SOURCE-PHASE4-PC-GATEWAY-" + suffix;
      const gatewaySetup = await setupFreeSource(gatewaySourceId, VERSION_MANIFEST.acquisition.adapterIds.localGateway, "LOCAL_GATEWAY", { exactUrl: fixtureBaseUrl + "/gateway-json", canonicalHost: fixture.hostname, endpointReference: "phase4-pc-gateway-json" }, budgetId, owned);
      check("Governed Local Gateway source is prepared", gatewaySetup.ok === true, gatewaySetup, "Gateway Route");
      const route = gatewaySetup.ok ? namespace.resolveExternalIntelligenceAcquisitionRoute({ requestId: gatewaySetup.request.requestId }) : null;
      check("Gateway source resolves to LOCAL_GATEWAY", route && route.ok === true && route.data.route.runtimeTarget === "LOCAL_GATEWAY", route && (route.data || route.code), "Gateway Route");
      const gatewayExecution = gatewaySetup.ok ? await namespace.executeExternalIntelligenceAcquisition({ requestId: gatewaySetup.request.requestId }) : null;
      check("Local Gateway performs real HTTP acquisition", gatewayExecution && gatewayExecution.ok === true && gatewayExecution.data.response.payload && gatewayExecution.data.response.payload.transport === "LOCAL_GATEWAY", gatewayExecution && (gatewayExecution.data || gatewayExecution.code), "Gateway Route");
      check("Gateway result retains adapter lineage", gatewayExecution && gatewayExecution.ok === true && gatewayExecution.data && gatewayExecution.data.response && gatewayExecution.data.response.evidenceInput && gatewayExecution.data.response.evidenceInput.adapterId === VERSION_MANIFEST.acquisition.adapterIds.localGateway, gatewayExecution && gatewayExecution.data && gatewayExecution.data.response && gatewayExecution.data.response.evidenceInput, "Lineage");
      check("Gateway response does not grant repository/knowledge/financial authority", gatewayExecution && gatewayExecution.ok === true && gatewayExecution.data && gatewayExecution.data.response && gatewayExecution.data.response.externalResponseGrantsAuthority === false && gatewayExecution.data.response.knowledgePromotionPerformed === false && gatewayExecution.data.response.canonicalRepositoryMutationPerformed === false, gatewayExecution && gatewayExecution.data && gatewayExecution.data.response, "Authority Boundary");

      owned.splice(0).forEach((id) => namespace.revokeExternalIntelligenceAuthorityEnvelope(id, "Phase 04 PC real-runtime pre-regression cleanup"));
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
      if (typeof namespace.disableExternalIntelligenceGatewayAcquisitionBridge === "function") namespace.disableExternalIntelligenceGatewayAcquisitionBridge();
      try { await namespace.revokeExternalIntelligenceGatewaySession(); } catch (_) {}
      const phase4 = await namespace.runExternalIntelligencePhase4Validation();
      check("Phase 04 regression remains PASS after real-runtime bridge", phase4.failed === 0 && phase4.health === 100 && phase4.criticalFailed === 0, { passed: phase4.passed, failed: phase4.failed, total: phase4.total, health: phase4.health }, "Regression");
    } catch (error) {
      check("Phase 04 PC real-runtime validation completes without exception", false, { message: error && error.message || String(error), stack: error && error.stack || null }, "Validation");
    } finally {
      owned.forEach((id) => namespace.revokeExternalIntelligenceAuthorityEnvelope(id, "Phase 04 PC real-runtime validation completed"));
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
      if (typeof namespace.disableExternalIntelligenceGatewayAcquisitionBridge === "function") namespace.disableExternalIntelligenceGatewayAcquisitionBridge();
      try { await namespace.revokeExternalIntelligenceGatewaySession(); } catch (_) {}
    }

    const summary = summarize(c.checks);
    const passedGate = summary.failed === 0 && summary.criticalFailed === 0;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE4-PC-REAL-RUNTIME"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: passedGate ? "EXTERNAL-010 Phase 04 PC Real Runtime Validation PASS" : "EXTERNAL-010 Phase 04 PC Real Runtime Validation FAIL",
      releaseAllowed: passedGate,
      phase4PcRealRuntimeComplete: passedGate,
      checks: c.checks,
      fixtureBaseUrl,
      gatewayBaseUrl,
      validatedAt: internal.nowIso()
    };
    state.latestPhase4PcRealRuntimeValidation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase4RealRuntimeValidation.status = passedGate ? "Passed" : "Failed";
    internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase4PcRealRuntimeValidation() {
    return state.latestPhase4PcRealRuntimeValidation ? internal.clone(state.latestPhase4PcRealRuntimeValidation) : null;
  }

  Object.assign(namespace.api, {
    runExternalIntelligencePhase4PcRealRuntimeValidation,
    getLatestExternalIntelligencePhase4PcRealRuntimeValidation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase4RealRuntimeValidation = {
    id: "EXTERNAL-010-PHASE4-PC-REAL-RUNTIME-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    browserDirectRealHttp: true,
    localGatewayRealHttp: true,
    arbitraryUrlProxyAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.runExternalIntelligencePhase4PcRealRuntimeValidation = runExternalIntelligencePhase4PcRealRuntimeValidation;
})(typeof window !== "undefined" ? window : globalThis);
