/* ============================================================
   FILE: 17_external_intelligence_phase4_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 04 Validation: Acquisition Contract / Router / Adapter / Queue
   Decisions: 002 / 007 / 015 / 016
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 04 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase4Validation");
  const PURPOSE = "phase4-validation";
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
    "17_external_intelligence_acquisition_contract.js",
    "17_external_intelligence_adapter_registry.js",
    "17_external_intelligence_source_router.js",
    "17_external_intelligence_acquisition_queue.js",
    "17_external_intelligence_phase1_validation.js",
    "17_external_intelligence_phase2_validation.js",
    "17_external_intelligence_phase3_validation.js",
    "17_external_intelligence_phase4_validation.js"
  ]);

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "General", severity: severity || "Critical" });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function count(item) { return !item.passed && item.severity === "Critical"; }).length;
    const health = checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0;
    return { passed: passed, failed: failed, total: checks.length, criticalFailed: criticalFailed, health: health };
  }

  async function grantAuthority(action, type, id, owned, purpose) {
    const authorityPurpose = internal.text(purpose, "") || PURPOSE;
    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action: action, target: { type: type, id: id }, purpose: authorityPurpose, scope: { domain: "EXTERNAL-010", operation: action } });
    if (!candidate.ok) return { ok: false, candidate: candidate };
    owned.push(candidate.data.envelope.authorityEnvelopeId);
    const activated = await namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId, { validationOnly: true });
    return { ok: activated.ok === true, candidate: candidate, activated: activated, envelopeId: candidate.data.envelope.authorityEnvelopeId };
  }

  async function setupFreeSource(sourceId, adapterId, accessMode, operationId, endpoint, authorityEnvelopes) {
    const regAuth = await grantAuthority("REGISTER_EXTERNAL_SOURCE", "source", sourceId, authorityEnvelopes);
    if (!regAuth.ok) return { ok: false, stage: "register-authority", result: regAuth };
    const registered = await namespace.registerExternalIntelligenceSource({
      sourceId: sourceId,
      sourceName: "Phase 04 Validation Source " + sourceId,
      sourceType: "PUBLIC_API",
      provider: "Phase 04 Validation Provider",
      accessMode: accessMode,
      adapterId: adapterId,
      endpointPolicy: { canonicalHost: endpoint && endpoint.canonicalHost || "", endpointReference: endpoint && endpoint.endpointReference || "phase4-endpoint", allowRedirects: false },
      authenticationMode: "NONE",
      allowedOperations: [operationId],
      allowedMethods: ["GET"],
      pricingMode: "FREE",
      purpose: PURPOSE
    });
    if (!registered.ok) return { ok: false, stage: "register", result: registered };

    const policyCandidate = namespace.createExternalIntelligenceUsagePolicyCandidate({
      sourceId: sourceId,
      policyVersion: "phase4-1",
      policyEvidenceIds: ["PHASE4-POLICY-EVIDENCE"],
      policyCompleteness: "COMPLETE",
      interpretationConfidence: "HIGH",
      rights: { READ: { state: "ALLOWED", confidence: "HIGH", evidenceIds: ["PHASE4-POLICY-EVIDENCE"] } }
    });
    if (!policyCandidate.ok) return { ok: false, stage: "policy-candidate", result: policyCandidate };
    const policyAuth = await grantAuthority("ACTIVATE_USAGE_POLICY", "usage-policy", policyCandidate.data.usagePolicy.usagePolicyId, authorityEnvelopes);
    if (!policyAuth.ok) return { ok: false, stage: "policy-authority", result: policyAuth };
    const policyActive = await namespace.activateExternalIntelligenceUsagePolicy({ usagePolicyId: policyCandidate.data.usagePolicy.usagePolicyId, purpose: PURPOSE });
    if (!policyActive.ok) return { ok: false, stage: "policy-activate", result: policyActive };

    const enableAuth = await grantAuthority("ENABLE_EXTERNAL_SOURCE", "source", sourceId, authorityEnvelopes);
    if (!enableAuth.ok) return { ok: false, stage: "enable-authority", result: enableAuth };
    const enabled = await namespace.enableExternalIntelligenceSource({ sourceId: sourceId, operations: [operationId], purpose: PURPOSE });
    if (!enabled.ok) return { ok: false, stage: "enable", result: enabled };
    const activateAuth = await grantAuthority("ACTIVATE_EXTERNAL_SOURCE", "source", sourceId, authorityEnvelopes);
    if (!activateAuth.ok) return { ok: false, stage: "activate-authority", result: activateAuth };
    const activated = await namespace.activateExternalIntelligenceSource({ sourceId: sourceId, purpose: PURPOSE });
    if (!activated.ok) return { ok: false, stage: "activate", result: activated };

    const operationIdValue = operationId;
    const operationContractId = "EXTERNAL-010-OP-" + sourceId.replace(/^SOURCE-/, "") + "-" + operationIdValue.replace(/[^A-Z0-9]+/g, "-");
    const opAuth = await grantAuthority("REGISTER_SOURCE_OPERATION_CONTRACT", "source-operation", operationContractId, authorityEnvelopes, "phase4-operation-contract");
    if (!opAuth.ok) return { ok: false, stage: "operation-authority", result: opAuth };
    const operation = await namespace.registerExternalIntelligenceSourceOperationContract({
      operationContractId: operationContractId,
      sourceId: sourceId,
      operationId: operationIdValue,
      adapterId: adapterId,
      method: "GET",
      endpoint: endpoint || { endpointReference: "phase4-mock" },
      parameterPolicy: { required: [], optional: ["query", "__mockFailureCategory"], allowUnknown: false, maxParameterCount: 8 },
      timeoutPolicy: { timeoutMs: 3000 },
      retryPolicy: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0, backoffPolicy: "NONE", retryableCategories: ["TIMEOUT", "RATE_LIMITED", "SOURCE_UNAVAILABLE", "TEMPORARY_SOURCE_UNAVAILABLE"] },
      responseMode: "JSON",
      executionHints: { backgroundPreferred: false, expectedResponseSize: "SMALL", longRunning: false, batch: false },
      estimatedUsage: { REQUEST_COUNT: 1, NETWORK_BYTES: 100, PROCESSING_TIME: 100 }
    });
    if (!operation.ok) return { ok: false, stage: "operation-register", result: operation };
    return { ok: true, registered: registered, policy: policyActive, enabled: enabled, activated: activated, operation: operation };
  }

  async function runExternalIntelligencePhase4Validation() {
    const c = collector();
    const check = c.check;
    const authorityEnvelopes = [];
    const uniqueSuffix = Date.now().toString(36).toUpperCase();

    try {
      check("Release Version is 1.3.0", VERSION_MANIFEST.release.version === "1.3.0", VERSION_MANIFEST.release.version, "Foundation");
      check("Implementation Phase is Phase 04", VERSION_MANIFEST.release.phase === 4 && VERSION_MANIFEST.release.implementationPhase.indexOf("Phase 04") === 0, VERSION_MANIFEST.release.implementationPhase, "Foundation");
      check("Design Freeze remains canonical", VERSION_MANIFEST.release.designFreezeId === "EXTERNAL-010-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Foundation");
      check("Roadmap remains 2.1.0", VERSION_MANIFEST.release.implementationRoadmapId === "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0", VERSION_MANIFEST.release.implementationRoadmapId, "Foundation");
      check("Decision coverage remains 54", VERSION_MANIFEST.release.decisionCount === 54, VERSION_MANIFEST.release.decisionCount, "Foundation");

      const init = await namespace.initializeExternalIntelligenceFoundation();
      check("Phase 04 foundation initializes", init && init.ok === true, init && init.code, "Initialization");
      const phase1 = await namespace.runExternalIntelligencePhase1Validation();
      check("Phase 01 regression remains PASS", phase1.failed === 0 && phase1.health === 100, { passed: phase1.passed, failed: phase1.failed, health: phase1.health }, "Regression");
      const phase2 = await namespace.runExternalIntelligencePhase2Validation({ requireGateway: false });
      check("Phase 02 degraded regression remains PASS", phase2.failed === 0 && phase2.health === 100, { passed: phase2.passed, failed: phase2.failed, health: phase2.health }, "Regression");
      const phase3 = await namespace.runExternalIntelligencePhase3Validation();
      check("Phase 03 regression remains PASS", phase3.failed === 0 && phase3.health === 100, { passed: phase3.passed, failed: phase3.failed, health: phase3.health }, "Regression");

      Object.keys(VERSION_MANIFEST.safety).forEach(function safetyFlag(key) { check("Safety flag " + key + " remains false", VERSION_MANIFEST.safety[key] === false, VERSION_MANIFEST.safety[key], "Safety"); });
      check("Hybrid browser + local gateway architecture remains configured", VERSION_MANIFEST.gateway.loopbackOnly === true && VERSION_MANIFEST.acquisition.arbitraryUrlProxyAllowed === false, { gateway: VERSION_MANIFEST.gateway, acquisition: VERSION_MANIFEST.acquisition }, "Hybrid Routing");
      check("Unified acquisition contract uses finite retries", VERSION_MANIFEST.acquisition.maxRetryAttempts > 0 && VERSION_MANIFEST.acquisition.maxRetryAttempts <= 5, VERSION_MANIFEST.acquisition.maxRetryAttempts, "Acquisition Contract");
      check("Queue concurrency is finite", VERSION_MANIFEST.acquisition.concurrencyLimit > 0 && VERSION_MANIFEST.acquisition.concurrencyLimit <= 8, VERSION_MANIFEST.acquisition.concurrencyLimit, "Queue");
      check("Queue metadata persistence is required", VERSION_MANIFEST.acquisition.persistentQueueMetadataRequired === true, VERSION_MANIFEST.acquisition.persistentQueueMetadataRequired, "Queue");
      check("Pre-execution revalidation is required", VERSION_MANIFEST.acquisition.preExecutionRevalidationRequired === true, VERSION_MANIFEST.acquisition.preExecutionRevalidationRequired, "Queue");

      const contracts = namespace.listExternalIntelligenceContracts();
      const schemas = namespace.listExternalIntelligenceSchemas();
      check("Phase 04 contracts are registered", contracts.length >= 30, contracts.length, "Contracts");
      check("Phase 04 schemas are registered", schemas.length >= 27, schemas.length, "Schemas");
      ["sourceOperationContract", "externalAcquisitionRequest", "externalAcquisitionAttempt", "externalAcquisitionResponse", "externalAcquisitionError", "sourceAdapterDefinition", "sourceRouteDecision", "acquisitionJob", "phase4ValidationResult"].forEach(function contractPresent(key) { check("Contract " + key + " is registered", Boolean(namespace.getExternalIntelligenceContract(key)), key, "Contracts"); });
      ["EXTERNAL-010-SCHEMA-SOURCE-OPERATION-CONTRACT", "EXTERNAL-010-SCHEMA-ACQUISITION-REQUEST", "EXTERNAL-010-SCHEMA-ACQUISITION-ATTEMPT", "EXTERNAL-010-SCHEMA-ACQUISITION-RESPONSE", "EXTERNAL-010-SCHEMA-ACQUISITION-ERROR", "EXTERNAL-010-SCHEMA-SOURCE-ADAPTER-DEFINITION", "EXTERNAL-010-SCHEMA-SOURCE-ROUTE-DECISION", "EXTERNAL-010-SCHEMA-ACQUISITION-JOB", "EXTERNAL-010-SCHEMA-PHASE4-VALIDATION-RESULT"].forEach(function schemaPresent(id) { check("Schema " + id + " is registered", Boolean(namespace.getExternalIntelligenceSchema(id)), id, "Schemas"); });

      const adapters = namespace.listExternalIntelligenceSourceAdapters();
      check("Three built-in adapters are registered", adapters.length >= 3, adapters, "Adapter Registry");
      const mockAdapter = namespace.getExternalIntelligenceSourceAdapter(VERSION_MANIFEST.acquisition.adapterIds.mock);
      const browserAdapter = namespace.getExternalIntelligenceSourceAdapter(VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson);
      const gatewayAdapter = namespace.getExternalIntelligenceSourceAdapter(VERSION_MANIFEST.acquisition.adapterIds.localGateway);
      check("Mock adapter has stable identity/version and is test-only", mockAdapter && mockAdapter.adapterVersion === "1.0.0" && mockAdapter.testOnly === true, mockAdapter, "Adapter Registry");
      check("Browser HTTP JSON adapter has no authority", browserAdapter && browserAdapter.sourceAuthorityGranted === false && browserAdapter.repositoryAuthorityGranted === false && browserAdapter.financialAuthorityGranted === false && browserAdapter.reliabilityAuthorityGranted === false, browserAdapter, "Adapter Registry");
      check("Gateway adapter is registered without enabling arbitrary proxy", gatewayAdapter && gatewayAdapter.arbitraryUrlAllowed === false, gatewayAdapter, "Adapter Registry");
      check("Adapter acquire implementation is not exposed as normal public API", typeof namespace.api.invokeExternalIntelligenceAdapter !== "function" && typeof namespace.invokeExternalIntelligenceAdapter !== "function", "internal-only", "Adapter Registry");

      const ownerApproval = namespace.setExternalIntelligenceAuthorityApprovalAdapter({ adapterId: "EXTERNAL-010-PHASE4-OWNER-APPROVAL", requiresExplicitOwnerInteraction: true, async verifyApproval() { return { approved: true, actorType: "Project Owner", interactionEvidenceId: "PHASE4-OWNER-INTERACTION" }; } });
      check("Project Owner approval adapter configured", ownerApproval.ok === true, ownerApproval.code, "Authority", "Warning");

      const budgetCandidate = namespace.createExternalIntelligenceResourceBudgetCandidate({ scopeType: "GLOBAL", scopeId: "EXTERNAL-010", currency: "JPY", period: { type: "VALIDATION_RUN" }, limits: { REQUEST_COUNT: { softLimit: 80, hardLimit: 100 }, NETWORK_BYTES: { softLimit: 500000, hardLimit: 1000000 }, PROCESSING_TIME: { softLimit: 500000, hardLimit: 1000000 }, FINANCIAL_COST: { softLimit: 0, hardLimit: 0 } } });
      check("Phase 04 validation budget candidate created", budgetCandidate.ok === true, budgetCandidate.data || budgetCandidate.code, "Budget");
      const budgetId = budgetCandidate.ok ? budgetCandidate.data.budget.budgetId : null;
      if (budgetId) {
        const budgetAuth = await grantAuthority("ACTIVATE_RESOURCE_BUDGET", "resource-budget", budgetId, authorityEnvelopes);
        check("Phase 04 validation budget authority explicitly granted", budgetAuth.ok === true, budgetAuth.activated && budgetAuth.activated.code, "Authority", "Warning");
        const budgetActive = await namespace.activateExternalIntelligenceResourceBudget({ budgetId: budgetId, purpose: PURPOSE });
        check("Phase 04 validation budget activated", budgetActive.ok === true, budgetActive.data || budgetActive.code, "Budget");
      }

      const mockSourceId = "SOURCE-PHASE4-MOCK-" + uniqueSuffix;
      const mockSetup = await setupFreeSource(mockSourceId, VERSION_MANIFEST.acquisition.adapterIds.mock, "AUTO_ROUTE", "READ", { endpointReference: "phase4-mock" }, authorityEnvelopes);
      check("Governed mock source is fully prepared", mockSetup.ok === true, mockSetup, "Source Governance");

      const browserSourceId = "SOURCE-PHASE4-BROWSER-" + uniqueSuffix;
      const browserSetup = await setupFreeSource(browserSourceId, VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson, "BROWSER_DIRECT", "READ", { exactUrl: "https://phase4.example.test/data", canonicalHost: "phase4.example.test", endpointReference: "phase4-browser-json" }, authorityEnvelopes);
      check("Governed Browser Direct source is prepared", browserSetup.ok === true, browserSetup, "Hybrid Routing");

      const gatewaySourceId = "SOURCE-PHASE4-GATEWAY-" + uniqueSuffix;
      const gatewaySetup = await setupFreeSource(gatewaySourceId, VERSION_MANIFEST.acquisition.adapterIds.localGateway, "LOCAL_GATEWAY", "READ", { exactUrl: "https://gateway-phase4.example.test/data", canonicalHost: "gateway-phase4.example.test", endpointReference: "phase4-gateway-json" }, authorityEnvelopes);
      check("Governed Local Gateway source is prepared", gatewaySetup.ok === true, gatewaySetup, "Hybrid Routing");

      const secretRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "READ", parameters: { apiKey: "should-never-enter-request" }, purpose: PURPOSE, budgetIds: [budgetId], requestContext: { validationOnly: true } });
      check("Secret-bearing acquisition request is blocked", secretRequest.ok === false && secretRequest.code === "EXTERNAL010_ACQUISITION_REQUEST_SECRET_BLOCKED", secretRequest.code, "Acquisition Contract");

      const unknownSourceRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: "SOURCE-NOT-REGISTERED-" + uniqueSuffix, operationId: "READ", parameters: {}, purpose: PURPOSE, budgetIds: [budgetId], requestContext: { validationOnly: true } });
      check("Unknown source request can exist only as non-executable logical request", unknownSourceRequest.ok === true && unknownSourceRequest.data.executionAuthorityGranted === false, unknownSourceRequest.data || unknownSourceRequest.code, "Acquisition Contract");
      const unknownSourceValidation = unknownSourceRequest.ok ? namespace.validateExternalIntelligenceAcquisitionRequest({ requestId: unknownSourceRequest.data.request.requestId }) : null;
      check("Unregistered source execution is blocked", unknownSourceValidation && unknownSourceValidation.ok === false && unknownSourceValidation.code === "EXTERNAL010_ACQUISITION_SOURCE_VALIDATION_FAILED", unknownSourceValidation && unknownSourceValidation.code, "Acquisition Contract");

      const unknownOperationRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "UNKNOWN_OPERATION", parameters: {}, purpose: PURPOSE, budgetIds: [budgetId], requestContext: { validationOnly: true } });
      const unknownOperationValidation = unknownOperationRequest.ok ? namespace.validateExternalIntelligenceAcquisitionRequest({ requestId: unknownOperationRequest.data.request.requestId }) : null;
      check("Unknown operation execution is blocked", unknownOperationValidation && unknownOperationValidation.ok === false, unknownOperationValidation && unknownOperationValidation.code, "Acquisition Contract");

      const validRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "READ", parameters: { query: "phase4" }, priority: "NORMAL", executionPreference: "IMMEDIATE", purpose: PURPOSE, requestedBy: "Phase 04 Validation", correlationId: "PHASE4-CORRELATION", idempotencyKey: "PHASE4-IDEMPOTENCY-" + uniqueSuffix, budgetIds: [budgetId], acquisitionPlanId: "PHASE4-PLAN", researchGoalId: "PHASE4-GOAL", requestContext: { validationOnly: true } });
      check("Unified acquisition request is created", validRequest.ok === true && validRequest.data.request.sourceId === mockSourceId && validRequest.data.request.operationId === "READ", validRequest.data || validRequest.code, "Acquisition Contract");
      const requestId = validRequest.ok ? validRequest.data.request.requestId : null;
      const duplicateIdempotency = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "READ", parameters: {}, purpose: PURPOSE, idempotencyKey: "PHASE4-IDEMPOTENCY-" + uniqueSuffix, budgetIds: [budgetId], requestContext: { validationOnly: true } });
      check("Duplicate idempotency key is rejected", duplicateIdempotency.ok === false && duplicateIdempotency.data.errors.includes("IDEMPOTENCY_KEY_DUPLICATE"), duplicateIdempotency.data || duplicateIdempotency.code, "Acquisition Contract");

      const validationWithoutAuthority = requestId ? namespace.validateExternalIntelligenceAcquisitionRequest({ requestId: requestId }) : null;
      check("Request validation does not grant execution authority", validationWithoutAuthority && validationWithoutAuthority.ok === false && validationWithoutAuthority.code === "EXTERNAL010_ACQUISITION_EXECUTION_AUTHORITY_DENIED", validationWithoutAuthority && validationWithoutAuthority.data, "Authority");
      const executeAuth = requestId ? await grantAuthority("EXECUTE_EXTERNAL_ACQUISITION", "external-acquisition", requestId, authorityEnvelopes) : { ok: false };
      check("External acquisition execution authority can be explicitly scoped", executeAuth.ok === true, executeAuth.activated && executeAuth.activated.code, "Authority", "Warning");
      const validationWithAuthority = requestId ? namespace.validateExternalIntelligenceAcquisitionRequest({ requestId: requestId }) : null;
      check("Unified common validation passes after authority is explicit", validationWithAuthority && validationWithAuthority.ok === true && validationWithAuthority.data.validationGrantsExecutionAuthority === false, validationWithAuthority && validationWithAuthority.data, "Acquisition Contract");

      const immediatePlan = requestId ? namespace.planExternalIntelligenceAcquisitionExecution({ requestId: requestId }) : null;
      check("Immediate request plans to IMMEDIATE", immediatePlan && immediatePlan.ok === true && immediatePlan.data.executionDecision === "IMMEDIATE" && immediatePlan.data.modeChangeGrantsAuthority === false, immediatePlan && immediatePlan.data, "Execution Planner");
      const mockRoute = requestId ? namespace.resolveExternalIntelligenceAcquisitionRoute({ requestId: requestId }) : null;
      check("Mock validation route resolves through bound adapter only", mockRoute && mockRoute.ok === true && mockRoute.data.route.adapterId === VERSION_MANIFEST.acquisition.adapterIds.mock && mockRoute.data.route.runtimeTarget === "TEST" && mockRoute.data.route.fallbackPerformed === false, mockRoute && mockRoute.data, "Source Router");
      const executed = requestId ? await namespace.executeExternalIntelligenceAcquisition({ requestId: requestId }) : null;
      check("Immediate acquisition executes through common adapter contract", executed && executed.ok === true && executed.data.response.status === "SUCCESS", executed && executed.data, "Execution");
      check("Successful response grants no authority or repository mutation", executed && executed.data.response.externalResponseGrantsAuthority === false && executed.data.response.knowledgePromotionPerformed === false && executed.data.response.canonicalRepositoryMutationPerformed === false, executed && executed.data.response, "Safety");
      check("Physical attempt is linked to logical request", requestId && namespace.getExternalIntelligenceAcquisitionAttempts(requestId).length === 1 && namespace.getExternalIntelligenceAcquisitionAttempts(requestId)[0].requestId === requestId, requestId && namespace.getExternalIntelligenceAcquisitionAttempts(requestId), "Attempt Lineage");
      check("Evidence input retains adapter lineage without persistence authority", executed && executed.data.response.evidenceInput && executed.data.response.evidenceInput.adapterId === VERSION_MANIFEST.acquisition.adapterIds.mock && executed.data.response.evidenceInput.persistenceAuthorityGranted === false, executed && executed.data.response.evidenceInput, "Evidence Boundary");

      const retryRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "READ", parameters: { __mockFailureCategory: "TIMEOUT" }, priority: "NORMAL", executionPreference: "IMMEDIATE", timeoutPolicy: { timeoutMs: 1000 }, retryPolicy: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0, backoffPolicy: "NONE", retryableCategories: ["TIMEOUT"] }, purpose: PURPOSE, budgetIds: [budgetId], requestContext: { validationOnly: true } });
      const retryRequestId = retryRequest.ok ? retryRequest.data.request.requestId : null;
      const retryAuth = retryRequestId ? await grantAuthority("EXECUTE_EXTERNAL_ACQUISITION", "external-acquisition", retryRequestId, authorityEnvelopes) : { ok: false };
      check("Retry validation request receives scoped execution authority", retryAuth.ok === true, retryAuth.activated && retryAuth.activated.code, "Authority", "Warning");
      const retryExecution = retryRequestId ? await namespace.executeExternalIntelligenceAcquisition({ requestId: retryRequestId }) : null;
      const retryAttempts = retryRequestId ? namespace.getExternalIntelligenceAcquisitionAttempts(retryRequestId) : [];
      check("Retry remains finite and records all failed attempts", retryExecution && retryExecution.ok === false && retryAttempts.length === 3 && retryAttempts.every(function a(v) { return v.status === "FAILED"; }), { result: retryExecution, attempts: retryAttempts }, "Retry");
      check("Adapter does not hide unlimited retry", retryAttempts.length <= VERSION_MANIFEST.acquisition.maxRetryAttempts, retryAttempts.length, "Retry");
      const sanitizedError = namespace.mapExternalIntelligenceAcquisitionError({ errorCode: "TEST", category: "INVALID_REQUEST", message: "token=SUPERSECRET password=HIDDEN", retryable: false, sourceId: mockSourceId, operationId: "READ", requestId: requestId, attemptId: namespace.getExternalIntelligenceAcquisitionAttempts(requestId)[0].attemptId });
      check("Common error contract redacts inline secret-like values", sanitizedError.ok === true && sanitizedError.data.error.message.indexOf("SUPERSECRET") === -1 && sanitizedError.data.error.message.indexOf("HIDDEN") === -1 && sanitizedError.data.error.secretRedacted === true, sanitizedError.data || sanitizedError.code, "Error Contract");

      const browserRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: browserSourceId, operationId: "READ", parameters: {}, purpose: PURPOSE, budgetIds: [budgetId], requestContext: {} });
      const browserRoute = browserRequest.ok ? namespace.resolveExternalIntelligenceAcquisitionRoute({ requestId: browserRequest.data.request.requestId }) : null;
      check("Browser Direct route selects Browser HTTP JSON adapter", browserRoute && browserRoute.ok === true && browserRoute.data.route.runtimeTarget === "BROWSER" && browserRoute.data.route.adapterId === VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson, browserRoute && browserRoute.data, "Hybrid Routing");
      check("Browser Direct route uses registered endpoint reference rather than arbitrary URL input", browserRoute && browserRoute.data.operationContract.endpoint.exactUrl === "https://phase4.example.test/data" && browserRoute.data.route.endpointReference === "phase4-browser-json", browserRoute && browserRoute.data, "Hybrid Routing");

      namespace.setExternalIntelligenceGatewayAcquisitionExecutor(null);
      const gatewayRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: gatewaySourceId, operationId: "READ", parameters: {}, purpose: PURPOSE, budgetIds: [budgetId], requestContext: {} });
      const gatewayRouteBlocked = gatewayRequest.ok ? namespace.resolveExternalIntelligenceAcquisitionRoute({ requestId: gatewayRequest.data.request.requestId }) : null;
      check("Gateway-unavailable route blocks instead of unsafe Browser fallback", gatewayRouteBlocked && gatewayRouteBlocked.ok === false && gatewayRouteBlocked.data.fallbackPerformed === false, gatewayRouteBlocked && gatewayRouteBlocked.data, "Hybrid Routing");
      const gatewayExecutorSet = namespace.setExternalIntelligenceGatewayAcquisitionExecutor(async function governedGatewayExecutor(context) { return { status: 200, payload: { ok: true, gateway: true, sourceId: context.request.sourceId }, responseMetadata: { status: 200, contentType: "application/json", responseSize: 64, providerRequestId: "PHASE4-GATEWAY-MOCK", rateLimitMetadata: {} }, temporalMetadata: { observedAt: internal.nowIso(), publishedAt: null, availableAt: null, effectiveAt: null } }; });
      check("Governed Gateway acquisition bridge can be configured without authority grant", gatewayExecutorSet.ok === true && gatewayExecutorSet.data.authorityGranted === false && gatewayExecutorSet.data.arbitraryProxyEnabled === false, gatewayExecutorSet.data || gatewayExecutorSet.code, "Hybrid Routing", "Warning");
      const gatewayRouteReady = gatewayRequest.ok ? namespace.resolveExternalIntelligenceAcquisitionRoute({ requestId: gatewayRequest.data.request.requestId }) : null;
      check("Local Gateway route resolves only after governed bridge availability", gatewayRouteReady && gatewayRouteReady.ok === true && gatewayRouteReady.data.route.runtimeTarget === "LOCAL_GATEWAY" && gatewayRouteReady.data.route.adapterId === VERSION_MANIFEST.acquisition.adapterIds.localGateway, gatewayRouteReady && gatewayRouteReady.data, "Hybrid Routing");

      const memoryJobs = new Map();
      const memoryCheckpoints = new Map();
      namespace.setExternalIntelligenceAcquisitionQueuePersistenceAdapter(null);
      const backgroundRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "READ", parameters: { query: "background" }, priority: "HIGH", executionPreference: "BACKGROUND", purpose: PURPOSE, budgetIds: [budgetId], acquisitionPlanId: "PHASE4-PLAN-BG", researchGoalId: "PHASE4-GOAL-BG", requestContext: { validationOnly: true } });
      const backgroundRequestId = backgroundRequest.ok ? backgroundRequest.data.request.requestId : null;
      const enqueueAuth = backgroundRequestId ? await grantAuthority("ENQUEUE_EXTERNAL_ACQUISITION", "external-acquisition", backgroundRequestId, authorityEnvelopes) : { ok: false };
      check("Queue enrollment authority is separate and explicitly scoped", enqueueAuth.ok === true, enqueueAuth.activated && enqueueAuth.activated.code, "Authority", "Warning");
      const enqueueWithoutPersistence = backgroundRequestId ? await namespace.enqueueExternalIntelligenceAcquisition({ requestId: backgroundRequestId }) : null;
      check("Background queue refuses non-persistent metadata path", enqueueWithoutPersistence && enqueueWithoutPersistence.ok === false && enqueueWithoutPersistence.code === "EXTERNAL010_ACQUISITION_QUEUE_PERSISTENCE_REQUIRED", enqueueWithoutPersistence && enqueueWithoutPersistence.code, "Queue");

      const persistenceSet = namespace.setExternalIntelligenceAcquisitionQueuePersistenceAdapter({
        adapterId: "EXTERNAL-010-PHASE4-MEMORY-PERSISTENCE",
        async writeJob(job) { memoryJobs.set(job.jobId, internal.clone(job)); return { written: true }; },
        async readJob(jobId) { return memoryJobs.has(jobId) ? internal.clone(memoryJobs.get(jobId)) : null; },
        async writeCheckpoint(checkpoint) { memoryCheckpoints.set(checkpoint.checkpointId, internal.clone(checkpoint)); return { written: true }; }
      });
      check("Queue persistence adapter hook accepts readback-capable adapter", persistenceSet.ok === true, persistenceSet.code, "Queue");
      const backgroundPlan = backgroundRequestId ? namespace.planExternalIntelligenceAcquisitionExecution({ requestId: backgroundRequestId }) : null;
      check("Background preference plans to QUEUE", backgroundPlan && backgroundPlan.ok === true && backgroundPlan.data.executionDecision === "QUEUE", backgroundPlan && backgroundPlan.data, "Execution Planner");
      const enqueued = backgroundRequestId ? await namespace.enqueueExternalIntelligenceAcquisition({ requestId: backgroundRequestId }) : null;
      check("Background request becomes stable queued job", enqueued && enqueued.ok === true && enqueued.data.job.status === "QUEUED" && enqueued.data.job.requestId === backgroundRequestId && enqueued.data.persistence.readBackVerified === true, enqueued && enqueued.data, "Queue");
      const backgroundJobId = enqueued && enqueued.ok ? enqueued.data.job.jobId : null;
      const checkpoint = backgroundJobId ? await namespace.checkpointExternalIntelligenceAcquisitionJob({ jobId: backgroundJobId }) : null;
      check("Queue checkpoint hook persists metadata", checkpoint && checkpoint.ok === true && memoryCheckpoints.has(checkpoint.data.checkpoint.checkpointId), checkpoint && checkpoint.data, "Queue");

      const schedulerWithoutExec = await namespace.runExternalIntelligenceAcquisitionSchedulerOnce();
      check("Pre-execution revalidation blocks queued job without execution authority", schedulerWithoutExec.ok === false && schedulerWithoutExec.code === "EXTERNAL010_ACQUISITION_JOB_PREEXECUTION_REVALIDATION_FAILED", schedulerWithoutExec.data || schedulerWithoutExec.code, "Queue");
      check("Queue does not turn scheduling into execution authority", schedulerWithoutExec.data && schedulerWithoutExec.data.validation && schedulerWithoutExec.data.validation.code === "EXTERNAL010_ACQUISITION_EXECUTION_AUTHORITY_DENIED", schedulerWithoutExec.data, "Authority");

      const schedRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "READ", parameters: { query: "scheduler-success" }, priority: "CRITICAL", executionPreference: "BACKGROUND", purpose: PURPOSE, budgetIds: [budgetId], requestContext: { validationOnly: true } });
      const schedRequestId = schedRequest.ok ? schedRequest.data.request.requestId : null;
      const schedEnqueueAuth = schedRequestId ? await grantAuthority("ENQUEUE_EXTERNAL_ACQUISITION", "external-acquisition", schedRequestId, authorityEnvelopes) : { ok: false };
      const schedExecAuth = schedRequestId ? await grantAuthority("EXECUTE_EXTERNAL_ACQUISITION", "external-acquisition", schedRequestId, authorityEnvelopes) : { ok: false };
      check("Scheduler test has separate enqueue and execution authority", schedEnqueueAuth.ok === true && schedExecAuth.ok === true, { enqueue: schedEnqueueAuth.ok, execute: schedExecAuth.ok }, "Authority", "Warning");
      const schedEnqueued = schedRequestId ? await namespace.enqueueExternalIntelligenceAcquisition({ requestId: schedRequestId }) : null;
      check("Scheduler test job is queued", schedEnqueued && schedEnqueued.ok === true, schedEnqueued && schedEnqueued.data, "Queue");
      const schedulerSuccess = await namespace.runExternalIntelligenceAcquisitionSchedulerOnce();
      check("Scheduler executes highest-priority eligible job after revalidation", schedulerSuccess.ok === true && schedulerSuccess.data.job.status === "COMPLETED" && schedulerSuccess.data.preExecutionRevalidated === true, schedulerSuccess.data || schedulerSuccess.code, "Queue");
      check("Scheduler does not invent research goal/purpose/source/operation", schedRequestId && namespace.getExternalIntelligenceAcquisitionRequest(schedRequestId).researchGoalId === null && namespace.getExternalIntelligenceAcquisitionRequest(schedRequestId).purpose === PURPOSE && namespace.getExternalIntelligenceAcquisitionRequest(schedRequestId).sourceId === mockSourceId && namespace.getExternalIntelligenceAcquisitionRequest(schedRequestId).operationId === "READ", namespace.getExternalIntelligenceAcquisitionRequest(schedRequestId), "Scheduler Boundary");

      const cancelRequest = namespace.createExternalIntelligenceAcquisitionRequest({ sourceId: mockSourceId, operationId: "READ", parameters: {}, priority: "LOW", executionPreference: "BACKGROUND", purpose: PURPOSE, budgetIds: [budgetId], requestContext: { validationOnly: true } });
      const cancelRequestId = cancelRequest.ok ? cancelRequest.data.request.requestId : null;
      const cancelEnqueueAuth = cancelRequestId ? await grantAuthority("ENQUEUE_EXTERNAL_ACQUISITION", "external-acquisition", cancelRequestId, authorityEnvelopes) : { ok: false };
      const cancelEnqueue = cancelRequestId ? await namespace.enqueueExternalIntelligenceAcquisition({ requestId: cancelRequestId, scheduledAt: new Date(Date.now() + 600000).toISOString() }) : null;
      check("Future background job can be queued for cancellation", cancelEnqueueAuth.ok === true && cancelEnqueue && cancelEnqueue.ok === true, cancelEnqueue && cancelEnqueue.data, "Queue");
      const cancelled = cancelEnqueue && cancelEnqueue.ok ? await namespace.cancelExternalIntelligenceAcquisitionJob({ jobId: cancelEnqueue.data.job.jobId }) : null;
      check("Cancellation hook transitions queued job to CANCELLED", cancelled && cancelled.ok === true && cancelled.data.job.status === "CANCELLED" && cancelled.data.job.cancellationRequested === true, cancelled && cancelled.data, "Queue");

      const metrics = namespace.getExternalIntelligenceAcquisitionQueueMetrics();
      check("Queue metrics expose finite concurrency and persistence state", metrics.concurrencyLimit === VERSION_MANIFEST.acquisition.concurrencyLimit && metrics.unlimitedConcurrencyAllowed === false && metrics.persistenceConfigured === true, metrics, "Queue Metrics");
      state.acquisitionSchedulerRunning = VERSION_MANIFEST.acquisition.concurrencyLimit;
      const concurrencyBlock = await namespace.runExternalIntelligenceAcquisitionSchedulerOnce();
      state.acquisitionSchedulerRunning = 0;
      check("Scheduler concurrency hard limit blocks additional runner", concurrencyBlock.ok === false && concurrencyBlock.code === "EXTERNAL010_ACQUISITION_SCHEDULER_CONCURRENCY_LIMIT", concurrencyBlock.data || concurrencyBlock.code, "Queue");

      const auditChain = await namespace.verifyExternalIntelligenceAuditChain();
      check("Phase 04 audit chain remains valid", auditChain.valid === true, { valid: auditChain.valid, eventCount: auditChain.eventCount }, "Audit");

      EXPECTED_BROWSER_FILES.forEach(function fileMapped(file) { check("Browser file mapped: " + file, file === "17_external_intelligence_version_manifest.js" || Boolean(VERSION_MANIFEST.fileModules[file]), file, "Static Integration"); });
      ["core", "contracts", "schemaRegistry", "authority", "audit", "runtimeCoordination", "softwareSupplyChain", "gatewayClient", "sourceRegistry", "sourceDiscovery", "resourceBudget", "usagePolicy", "acquisitionContract", "adapterRegistry", "sourceRouter", "acquisitionQueue", "phase1Validation", "phase2Validation", "phase3Validation", "phase4Validation"].forEach(function moduleLoaded(name) { check("Module " + name + " is loaded", Boolean(namespace.modules[name]), namespace.modules[name] && namespace.modules[name].status, "Modules"); });
    } catch (error) {
      check("Phase 04 validation execution completes without exception", false, { message: error && error.message || String(error), stack: error && error.stack || null }, "Validation");
    } finally {
      authorityEnvelopes.forEach(function revoke(id) { namespace.revokeExternalIntelligenceAuthorityEnvelope(id, "Phase 04 validation completed"); });
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
      namespace.setExternalIntelligenceGatewayAcquisitionExecutor(null);
      namespace.setExternalIntelligenceAcquisitionQueuePersistenceAdapter(null);
      state.acquisitionSchedulerRunning = 0;
    }

    const summary = summarize(c.checks);
    const passedGate = summary.failed === 0 && summary.criticalFailed === 0;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE4-VALIDATION"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      roadmapId: VERSION_MANIFEST.release.implementationRoadmapId,
      decisionCoverage: VERSION_MANIFEST.release.decisionCount,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: passedGate ? "EXTERNAL-010 Phase 04 Validation PASS" : "EXTERNAL-010 Phase 04 Validation FAIL",
      releaseAllowed: passedGate,
      phase4Complete: passedGate,
      phase5Allowed: passedGate,
      checks: c.checks,
      safety: internal.clone(VERSION_MANIFEST.safety),
      validatedAt: internal.nowIso()
    };

    const contractValidation = namespace.validateExternalIntelligenceContract("phase4ValidationResult", result);
    const schemaValidation = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE4-VALIDATION-RESULT", result);
    if (!contractValidation.valid || !schemaValidation.valid) {
      result.failed += 1; result.total += 1; result.criticalFailed += 1; result.health = Math.round((result.passed / result.total) * 1000) / 10; result.status = "EXTERNAL-010 Phase 04 Validation FAIL"; result.releaseAllowed = false; result.phase4Complete = false; result.phase5Allowed = false;
      result.checks.push({ name: "Phase 04 result validates against contract and schema", passed: false, detail: internal.stableStringify({ contract: contractValidation, schema: schemaValidation }), group: "Validation", severity: "Critical" });
    } else {
      result.checks.push({ name: "Phase 04 result validates against contract and schema", passed: true, detail: "valid", group: "Validation", severity: "Critical" }); result.passed += 1; result.total += 1; result.health = Math.round((result.passed / result.total) * 1000) / 10;
    }
    state.latestPhase4Validation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase4Validation.status = result.failed === 0 ? "Passed" : "Failed";
    internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase4Validation() { return state.latestPhase4Validation ? internal.clone(state.latestPhase4Validation) : null; }

  Object.assign(namespace.api, { runExternalIntelligencePhase4Validation: runExternalIntelligencePhase4Validation, getLatestExternalIntelligencePhase4Validation: getLatestExternalIntelligencePhase4Validation });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase4Validation = { id: "EXTERNAL-010-PHASE4-VALIDATION", version: MODULE_VERSION, status: "Loaded", phase: 4, decisions: ["002", "007", "015", "016"], loadedAt: internal.nowIso() };
  global.runExternalIntelligencePhase4Validation = runExternalIntelligencePhase4Validation;
})(typeof window !== "undefined" ? window : globalThis);
