/* ============================================================
   FILE: 17_external_intelligence_openai_provider_integration.js
   EXTERNAL-010 External Intelligence Platform
   Candidate: OpenAI API Integration Phase 2
   Decision: EXTERNAL-010-DECISION-055
   Purpose: Provider profile / pricing / paid activation / cost preflight
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 OpenAI provider integration blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("openaiProviderIntegration");
  const SOURCE_ID = "SOURCE-OPENAI";
  const OPERATION_ID = "INTERNAL_ANALYSIS";
  const ADAPTER_ID = "EXTERNAL-010-ADAPTER-LOCAL-GATEWAY-001";
  const EXACT_URL = "https://api.openai.com/v1/responses";
  const CANONICAL_HOST = "api.openai.com";
  const ENDPOINT_REFERENCE = "OPENAI-RESPONSES-V1";
  const DEFAULT_SECRET_REFERENCE_ID = "SECRET-OPENAI-LEGACY";
  const SOURCE_REGISTRATION_ACTION = "REGISTER_EXTERNAL_SOURCE";
  const SOURCE_REGISTRATION_PURPOSE = "openai-provider-registration";
  const OPERATION_REGISTRATION_ACTION = "REGISTER_SOURCE_OPERATION_CONTRACT";
  const OPERATION_REGISTRATION_PURPOSE = "phase4-operation-contract";
  const ACTIVATION_ACTION = "ACTIVATE_GOVERNED_PAID_SOURCE";
  const ACTIVATION_PURPOSE = "paid-provider-activation";
  const PRICING_SOURCE = "https://platform.openai.com/docs/models";
  const VERIFIED_AT = "2026-09-14T00:00:00+09:00";
  const MAX_MODEL_OUTPUT_TOKENS = 128000;
  const ALLOWED_BODY_FIELDS = Object.freeze(["model", "input", "store", "instructions", "max_output_tokens", "reasoning"]);

  const MODEL_PRICING = Object.freeze({
    "gpt-5.6-luna": Object.freeze({ model: "gpt-5.6-luna", inputPerMTokUsd: 0.20, outputPerMTokUsd: 1.20, cachedInputPerMTokUsd: null, maxOutputTokens: MAX_MODEL_OUTPUT_TOKENS }),
    "gpt-5.6-terra": Object.freeze({ model: "gpt-5.6-terra", inputPerMTokUsd: 2.00, outputPerMTokUsd: 12.00, cachedInputPerMTokUsd: null, maxOutputTokens: MAX_MODEL_OUTPUT_TOKENS }),
    "gpt-5.6-sol": Object.freeze({ model: "gpt-5.6-sol", inputPerMTokUsd: 4.00, outputPerMTokUsd: 20.00, cachedInputPerMTokUsd: null, maxOutputTokens: MAX_MODEL_OUTPUT_TOKENS })
  });

  const PROVIDER_PROFILE = Object.freeze({
    providerId: "OPENAI",
    sourceId: SOURCE_ID,
    sourceType: "AI_SERVICE",
    provider: "OPENAI",
    category: "AI_PROVIDER",
    accessMode: "LOCAL_GATEWAY",
    adapterId: ADAPTER_ID,
    authenticationMode: "BEARER_TOKEN",
    defaultSecretReferenceId: DEFAULT_SECRET_REFERENCE_ID,
    pricingMode: "USAGE_BASED",
    costCurrency: "USD",
    operationId: OPERATION_ID,
    method: "POST",
    endpoint: Object.freeze({ exactUrl: EXACT_URL, canonicalHost: CANONICAL_HOST, endpointReference: ENDPOINT_REFERENCE }),
    initialCapability: Object.freeze({ textInput: true, textOutput: true, streaming: false, background: false, tools: false, files: false, webSearch: false, computerUse: false }),
    storeRequiredValue: false,
    retryMaxAttempts: 1,
    pricingSource: PRICING_SOURCE,
    pricingVerifiedAt: VERIFIED_AT,
    cachedInputAccounting: "STANDARD_INPUT_RATE_UNTIL_VERIFIED",
    noPerRequestHumanApprovalInsideApprovedScope: true,
    automaticPaidActivationAllowed: false,
    automaticBudgetExpansionAllowed: false,
    tradingAuthorityGranted: false,
    repositoryMutationAuthorityGranted: false
  });

  function finitePositive(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function roundUsd(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100000000) / 100000000;
  }

  function utf8ByteLength(value) {
    const text = typeof value === "string" ? value : internal.stableStringify(value);
    if (typeof global.TextEncoder === "function") return new global.TextEncoder().encode(text).length;
    try { return unescape(encodeURIComponent(text)).length; } catch (_) { return text.length * 4; }
  }

  function clonePricing(profile) {
    if (!profile) return null;
    return Object.assign({}, internal.clone(profile), {
      currency: "USD",
      unit: "MILLION_TOKENS",
      effectiveFrom: "2026-09-14",
      verifiedAt: VERIFIED_AT,
      source: PRICING_SOURCE,
      cachedInputAccounting: profile.cachedInputPerMTokUsd == null ? "STANDARD_INPUT_RATE_UNTIL_VERIFIED" : "VERIFIED_CACHED_RATE"
    });
  }

  function getOpenAIProviderIntegrationProfile() {
    return internal.clone(PROVIDER_PROFILE);
  }

  function listOpenAIModelPricingProfiles() {
    return Object.keys(MODEL_PRICING).sort().map(function (model) { return clonePricing(MODEL_PRICING[model]); });
  }

  function getOpenAIModelPricingProfile(model) {
    return clonePricing(MODEL_PRICING[String(model || "").trim()]);
  }

  function validateOpenAIResponsesBody(body) {
    const value = internal.isPlainObject(body) ? body : {};
    const errors = [];
    const keys = Object.keys(value);
    keys.forEach(function (key) { if (!ALLOWED_BODY_FIELDS.includes(key)) errors.push("OPENAI_BODY_FIELD_NOT_ALLOWED:" + key); });
    if (!Object.prototype.hasOwnProperty.call(value, "model") || !MODEL_PRICING[value.model]) errors.push("OPENAI_MODEL_NOT_REGISTERED");
    if (!Object.prototype.hasOwnProperty.call(value, "input")) errors.push("OPENAI_INPUT_REQUIRED");
    if (value.store !== false) errors.push("OPENAI_STORE_FALSE_REQUIRED");
    if (!Number.isInteger(value.max_output_tokens) || value.max_output_tokens <= 0) errors.push("OPENAI_MAX_OUTPUT_TOKENS_REQUIRED");
    const pricing = MODEL_PRICING[value.model];
    if (pricing && Number.isInteger(value.max_output_tokens) && value.max_output_tokens > pricing.maxOutputTokens) errors.push("OPENAI_MAX_OUTPUT_TOKENS_EXCEEDS_MODEL_LIMIT");
    if (Object.prototype.hasOwnProperty.call(value, "stream")) errors.push("OPENAI_STREAMING_NOT_ALLOWED_INITIAL_SCOPE");
    if (Object.prototype.hasOwnProperty.call(value, "background")) errors.push("OPENAI_BACKGROUND_NOT_ALLOWED_INITIAL_SCOPE");
    if (Object.prototype.hasOwnProperty.call(value, "tools")) errors.push("OPENAI_TOOLS_NOT_ALLOWED_INITIAL_SCOPE");
    return internal.buildResult(errors.length === 0,
      errors.length ? "EXTERNAL010_OPENAI_BODY_INVALID" : "EXTERNAL010_OPENAI_BODY_VALID",
      errors.length ? "Blocked" : "Ready",
      { errors: errors, storeFalseEnforced: true, arbitraryToolInvocationAllowed: false, registeredModelRequired: true });
  }

  function estimateOpenAIResponsesCost(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const body = internal.isPlainObject(settings.body) ? settings.body : settings;
    const validation = validateOpenAIResponsesBody(body);
    if (!validation.ok) return validation;
    const pricing = MODEL_PRICING[body.model];
    const supplied = finitePositive(settings.estimatedInputTokens);
    const estimatedInputTokens = supplied == null ? Math.max(1, utf8ByteLength({ input: body.input, instructions: body.instructions || null })) : Math.ceil(supplied);
    const maxOutputTokens = body.max_output_tokens;
    const inputCost = estimatedInputTokens / 1000000 * pricing.inputPerMTokUsd;
    const outputCost = maxOutputTokens / 1000000 * pricing.outputPerMTokUsd;
    const maximumEstimatedCostUsd = roundUsd(inputCost + outputCost);
    return internal.buildResult(true, "EXTERNAL010_OPENAI_COST_ESTIMATE_READY", "Ready", {
      model: body.model,
      estimatedInputTokens: estimatedInputTokens,
      maxOutputTokens: maxOutputTokens,
      estimationMethod: supplied == null ? "UTF8_BYTES_CONSERVATIVE_BOUND" : "CALLER_SUPPLIED_INPUT_TOKEN_ESTIMATE",
      estimatedUsage: { REQUEST_COUNT: 1, AI_TOKEN_USAGE: estimatedInputTokens + maxOutputTokens, FINANCIAL_COST: maximumEstimatedCostUsd },
      maximumEstimatedCostUsd: maximumEstimatedCostUsd,
      currency: "USD",
      pricingProfile: clonePricing(pricing),
      exactBillingAmountKnownBeforeRequest: false,
      unknownPaidCostMayBeAssumedZero: false
    });
  }

  function buildOpenAIProviderSourceRegistration(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const secretReferenceId = internal.text(settings.secretReferenceId, DEFAULT_SECRET_REFERENCE_ID).toUpperCase();
    if (!/^SECRET-[A-Z0-9-]+$/.test(secretReferenceId)) return internal.buildResult(false, "EXTERNAL010_OPENAI_SECRET_REFERENCE_REQUIRED", "Blocked", { secretValueAccepted: false });
    const secretMetadata = typeof namespace.getExternalIntelligenceSecretMetadata === "function" ? namespace.getExternalIntelligenceSecretMetadata(secretReferenceId) : null;
    const secretValidation = typeof namespace.validateExternalIntelligenceSecretReference === "function" && secretMetadata ? namespace.validateExternalIntelligenceSecretReference({ secretReferenceId: secretReferenceId }) : null;
    const secretReady = Boolean(secretValidation && secretValidation.ok === true);
    const candidate = {
      sourceId: SOURCE_ID,
      sourceName: "OpenAI Responses API",
      sourceType: "AI_SERVICE",
      provider: "OPENAI",
      category: "AI_PROVIDER",
      accessMode: "LOCAL_GATEWAY",
      adapterId: ADAPTER_ID,
      endpointPolicy: { canonicalHost: CANONICAL_HOST, endpointReference: ENDPOINT_REFERENCE, allowRedirects: false },
      authenticationMode: "BEARER_TOKEN",
      secretReferenceId: secretReferenceId,
      allowedOperations: [OPERATION_ID],
      allowedMethods: ["POST"],
      pricingMode: "USAGE_BASED",
      costCurrency: "USD",
      identityState: "VERIFIED",
      purpose: "openai-provider-registration"
    };
    return internal.buildResult(true, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_CANDIDATE_READY", "Candidate", {
      sourceCandidate: candidate,
      secretReference: {
        secretReferenceId: secretReferenceId,
        metadataRegistered: Boolean(secretMetadata),
        active: secretReady,
        secretValueAccepted: false,
        nextRequiredAction: secretReady ? "SOURCE_REGISTRATION_AUTHORITY" : "SET_GATEWAY_SECRET_AND_REGISTER_REFERENCE_METADATA"
      },
      sourceRegistrationReady: secretReady,
      registrationPerformed: false,
      paidActivationPerformed: false
    });
  }


  async function registerOpenAIProviderSourceWithProjectOwnerApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const existing = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    if (existing) return internal.buildResult(true, "EXTERNAL010_OPENAI_SOURCE_ALREADY_REGISTERED", "Registered", { source: existing, registrationPerformed: false, paidActivationPerformed: false, nextRequiredAction: "REGISTER_SOURCE_OPERATION_CONTRACT_AUTHORITY" });

    const candidateResult = buildOpenAIProviderSourceRegistration({ secretReferenceId: settings.secretReferenceId });
    if (!candidateResult.ok || !candidateResult.data || candidateResult.data.sourceRegistrationReady !== true) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_NOT_READY", "Blocked", { candidate: candidateResult, registrationPerformed: false, paidActivationPerformed: false });
    }
    if (settings.ownerInteractionTrusted !== true || settings.projectOwnerConfirmed !== true || !internal.text(settings.interactionEvidenceId, "")) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_PROJECT_OWNER_INTERACTION_REQUIRED", "Blocked", { sourceId: SOURCE_ID, registrationPerformed: false, authorityGranted: false });
    }
    const required = [
      "setExternalIntelligenceAuthorityApprovalAdapter",
      "createExternalIntelligenceAuthorityEnvelopeCandidate",
      "activateExternalIntelligenceAuthorityEnvelope",
      "revokeExternalIntelligenceAuthorityEnvelope",
      "registerExternalIntelligenceSource"
    ];
    const missing = required.filter(function (name) { return typeof namespace[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_AUTHORITY_API_UNAVAILABLE", "Blocked", { missing: missing, registrationPerformed: false });

    let authorityEnvelopeId = null;
    let authorityActivated = false;
    const interactionEvidenceId = internal.text(settings.interactionEvidenceId, "");
    const adapter = {
      adapterId: "EXTERNAL-010-OPENAI-SOURCE-REGISTRATION-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval(context) {
        const envelope = context && context.envelope || {};
        const approval = context && context.approvalInput || {};
        const target = envelope.target || {};
        const exactScope = envelope.action === SOURCE_REGISTRATION_ACTION && target.type === "source" && target.id === SOURCE_ID && envelope.purpose === SOURCE_REGISTRATION_PURPOSE;
        const explicit = approval.projectOwnerConfirmed === true && approval.ownerInteractionTrusted === true && internal.text(approval.interactionEvidenceId, "") === interactionEvidenceId;
        return { approved: exactScope && explicit, actorType: "Project Owner", interactionEvidenceId: exactScope && explicit ? interactionEvidenceId : "" };
      }
    };

    try {
      const adapterResult = namespace.setExternalIntelligenceAuthorityApprovalAdapter(adapter);
      if (!adapterResult || adapterResult.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_APPROVAL_ADAPTER_FAILED", "Blocked", { adapter: adapterResult || null, registrationPerformed: false });

      const authorityCandidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
        action: SOURCE_REGISTRATION_ACTION,
        target: { type: "source", id: SOURCE_ID },
        purpose: SOURCE_REGISTRATION_PURPOSE,
        scope: { domain: "EXTERNAL-010", operation: SOURCE_REGISTRATION_ACTION, constraints: { sourceId: SOURCE_ID, provider: "OPENAI", oneTimeRegistration: true } }
      });
      authorityEnvelopeId = authorityCandidate && authorityCandidate.data && authorityCandidate.data.envelope && authorityCandidate.data.envelope.authorityEnvelopeId || null;
      if (!authorityCandidate || authorityCandidate.ok !== true || !authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_AUTHORITY_CANDIDATE_FAILED", "Blocked", { authorityCandidate: authorityCandidate || null, registrationPerformed: false });

      const activation = await namespace.activateExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, { projectOwnerConfirmed: true, ownerInteractionTrusted: true, interactionEvidenceId: interactionEvidenceId });
      if (!activation || activation.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_AUTHORITY_ACTIVATION_FAILED", "Blocked", { activation: activation || null, registrationPerformed: false });
      authorityActivated = true;

      const registration = await namespace.registerExternalIntelligenceSource(candidateResult.data.sourceCandidate);
      if (!registration || registration.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_FAILED", "Blocked", { registration: registration || null, authorityEnvelopeId: authorityEnvelopeId, registrationPerformed: false });

      return internal.buildResult(true, "EXTERNAL010_OPENAI_SOURCE_REGISTERED_WITH_PROJECT_OWNER_APPROVAL", "Registered", {
        source: registration.data && registration.data.source || null,
        authorityEnvelopeId: authorityEnvelopeId,
        approvalEvidenceId: interactionEvidenceId,
        registrationPerformed: true,
        paidActivationPerformed: false,
        budgetMutationPerformed: false,
        operationContractRegistrationPerformed: false,
        nextRequiredAction: "REGISTER_SOURCE_OPERATION_CONTRACT_AUTHORITY"
      });
    } finally {
      if (authorityEnvelopeId) {
        try { namespace.revokeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, authorityActivated ? "One-time OpenAI Source registration completed or ended" : "OpenAI Source registration approval flow ended"); } catch (_) {}
      }
      try { namespace.setExternalIntelligenceAuthorityApprovalAdapter(null); } catch (_) {}
    }
  }

  function buildOpenAIResponsesOperationContract(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const candidate = {
      operationContractId: "EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS",
      sourceId: SOURCE_ID,
      operationId: OPERATION_ID,
      adapterId: ADAPTER_ID,
      method: "POST",
      endpoint: { exactUrl: EXACT_URL, canonicalHost: CANONICAL_HOST, endpointReference: ENDPOINT_REFERENCE },
      parameterPolicy: { required: [], optional: [], allowUnknown: false, maxParameterCount: 1 },
      bodyPolicy: {
        mode: "JSON",
        required: ["model", "input", "store", "max_output_tokens"],
        optional: ["instructions", "reasoning"],
        fixedFields: { store: false },
        allowUnknown: false,
        maxSerializedBytes: Number.isInteger(settings.maxSerializedBytes) ? Math.max(1024, Math.min(settings.maxSerializedBytes, 65536)) : 32768
      },
      timeoutPolicy: { timeoutMs: Number.isInteger(settings.timeoutMs) ? settings.timeoutMs : 60000 },
      retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffPolicy: "NONE", retryableCategories: [] },
      responseMode: "JSON",
      executionHints: { backgroundPreferred: false, expectedResponseSize: "MEDIUM", longRunning: false, batch: false },
      estimatedUsage: { REQUEST_COUNT: 1 },
      enabled: true
    };
    return internal.buildResult(true, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_CANDIDATE_READY", "Candidate", { operationContractCandidate: candidate, registrationPerformed: false });
  }

  async function registerOpenAIResponsesOperationContractWithProjectOwnerApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const existingSource = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    if (!existingSource || existingSource.lifecycleState !== "REGISTERED") {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_REQUIRED", "Blocked", { sourceId: SOURCE_ID, operationContractRegistrationPerformed: false, nextRequiredAction: "SOURCE_REGISTRATION_AUTHORITY" });
    }
    const existingOperation = typeof namespace.getExternalIntelligenceSourceOperationContract === "function" ? namespace.getExternalIntelligenceSourceOperationContract(SOURCE_ID, OPERATION_ID) : null;
    if (existingOperation) {
      return internal.buildResult(true, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_ALREADY_REGISTERED", "Ready", { operationContract: existingOperation, operationContractRegistrationPerformed: false, paidActivationPerformed: false, nextRequiredAction: "USD_RESOURCE_BUDGET" });
    }
    const candidateResult = buildOpenAIResponsesOperationContract({});
    const candidate = candidateResult && candidateResult.data && candidateResult.data.operationContractCandidate || null;
    if (!candidateResult || candidateResult.ok !== true || !candidate) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_CANDIDATE_NOT_READY", "Blocked", { candidate: candidateResult || null, operationContractRegistrationPerformed: false });
    }
    if (settings.ownerInteractionTrusted !== true || settings.projectOwnerConfirmed !== true || !internal.text(settings.interactionEvidenceId, "")) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_PROJECT_OWNER_INTERACTION_REQUIRED", "Blocked", { operationContractId: candidate.operationContractId, operationContractRegistrationPerformed: false, authorityGranted: false });
    }
    const required = [
      "setExternalIntelligenceAuthorityApprovalAdapter",
      "createExternalIntelligenceAuthorityEnvelopeCandidate",
      "activateExternalIntelligenceAuthorityEnvelope",
      "revokeExternalIntelligenceAuthorityEnvelope",
      "registerExternalIntelligenceSourceOperationContract"
    ];
    const missing = required.filter(function (name) { return typeof namespace[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_AUTHORITY_API_UNAVAILABLE", "Blocked", { missing: missing, operationContractRegistrationPerformed: false });

    let authorityEnvelopeId = null;
    let authorityActivated = false;
    const interactionEvidenceId = internal.text(settings.interactionEvidenceId, "");
    const adapter = {
      adapterId: "EXTERNAL-010-OPENAI-OPERATION-CONTRACT-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval(context) {
        const envelope = context && context.envelope || {};
        const approval = context && context.approvalInput || {};
        const target = envelope.target || {};
        const exactScope = envelope.action === OPERATION_REGISTRATION_ACTION && target.type === "source-operation" && target.id === candidate.operationContractId && envelope.purpose === OPERATION_REGISTRATION_PURPOSE;
        const explicit = approval.projectOwnerConfirmed === true && approval.ownerInteractionTrusted === true && internal.text(approval.interactionEvidenceId, "") === interactionEvidenceId;
        return { approved: exactScope && explicit, actorType: "Project Owner", interactionEvidenceId: exactScope && explicit ? interactionEvidenceId : "" };
      }
    };

    try {
      const adapterResult = namespace.setExternalIntelligenceAuthorityApprovalAdapter(adapter);
      if (!adapterResult || adapterResult.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_APPROVAL_ADAPTER_FAILED", "Blocked", { adapter: adapterResult || null, operationContractRegistrationPerformed: false });

      const authorityCandidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
        action: OPERATION_REGISTRATION_ACTION,
        target: { type: "source-operation", id: candidate.operationContractId },
        purpose: OPERATION_REGISTRATION_PURPOSE,
        scope: { domain: "EXTERNAL-010", operation: OPERATION_REGISTRATION_ACTION, constraints: { sourceId: SOURCE_ID, operationId: OPERATION_ID, operationContractId: candidate.operationContractId, oneTimeRegistration: true } }
      });
      authorityEnvelopeId = authorityCandidate && authorityCandidate.data && authorityCandidate.data.envelope && authorityCandidate.data.envelope.authorityEnvelopeId || null;
      if (!authorityCandidate || authorityCandidate.ok !== true || !authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_AUTHORITY_CANDIDATE_FAILED", "Blocked", { authorityCandidate: authorityCandidate || null, operationContractRegistrationPerformed: false });

      const activation = await namespace.activateExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, { projectOwnerConfirmed: true, ownerInteractionTrusted: true, interactionEvidenceId: interactionEvidenceId });
      if (!activation || activation.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_AUTHORITY_ACTIVATION_FAILED", "Blocked", { activation: activation || null, operationContractRegistrationPerformed: false });
      authorityActivated = true;

      const registration = await namespace.registerExternalIntelligenceSourceOperationContract(candidate);
      if (!registration || registration.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_REGISTRATION_FAILED", "Blocked", { registration: registration || null, authorityEnvelopeId: authorityEnvelopeId, operationContractRegistrationPerformed: false });

      return internal.buildResult(true, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_REGISTERED_WITH_PROJECT_OWNER_APPROVAL", "Ready", {
        operationContract: registration.data && registration.data.operationContract || null,
        authorityEnvelopeId: authorityEnvelopeId,
        approvalEvidenceId: interactionEvidenceId,
        operationContractRegistrationPerformed: true,
        paidActivationPerformed: false,
        budgetMutationPerformed: false,
        realApiRequestPerformed: false,
        nextRequiredAction: "USD_RESOURCE_BUDGET"
      });
    } finally {
      if (authorityEnvelopeId) {
        try { namespace.revokeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, authorityActivated ? "One-time OpenAI Operation Contract registration completed or ended" : "OpenAI Operation Contract approval flow ended"); } catch (_) {}
      }
      try { namespace.setExternalIntelligenceAuthorityApprovalAdapter(null); } catch (_) {}
    }
  }

  function prepareOpenAIResponsesRequest(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const body = internal.isPlainObject(settings.body) ? internal.clone(settings.body) : {};
    const cost = estimateOpenAIResponsesCost({ body: body, estimatedInputTokens: settings.estimatedInputTokens });
    if (!cost.ok) return cost;
    const perRequestHardCapUsd = finitePositive(settings.perRequestHardCapUsd);
    if (perRequestHardCapUsd == null) return internal.buildResult(false, "EXTERNAL010_OPENAI_PER_REQUEST_COST_CAP_REQUIRED", "Blocked", { currency: "USD" });
    if (cost.data.maximumEstimatedCostUsd > perRequestHardCapUsd) return internal.buildResult(false, "EXTERNAL010_OPENAI_PER_REQUEST_COST_CAP_EXCEEDED", "Blocked", { maximumEstimatedCostUsd: cost.data.maximumEstimatedCostUsd, perRequestHardCapUsd: perRequestHardCapUsd, currency: "USD" });
    const budgetIds = internal.unique(settings.budgetIds || []);
    if (!budgetIds.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_REQUIRED", "Blocked", { budgetIds: [] });
    return internal.buildResult(true, "EXTERNAL010_OPENAI_REQUEST_CANDIDATE_READY", "Candidate", {
      requestCandidate: {
        sourceId: SOURCE_ID,
        operationId: OPERATION_ID,
        parameters: {},
        body: body,
        executionPreference: "IMMEDIATE",
        timeoutPolicy: { timeoutMs: Number.isInteger(settings.timeoutMs) ? settings.timeoutMs : 60000 },
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffPolicy: "NONE", retryableCategories: [] },
        requestContext: { provider: "OPENAI", pricingVerifiedAt: VERIFIED_AT, perRequestHardCapUsd: perRequestHardCapUsd },
        purpose: internal.text(settings.purpose, "ai-prompt-os-openai-inference"),
        requestedBy: internal.text(settings.requestedBy, "AI Prompt OS / Application"),
        budgetIds: budgetIds,
        estimatedUsage: internal.clone(cost.data.estimatedUsage)
      },
      costEstimate: cost.data,
      paidExecutionPerformed: false,
      humanApprovalRequiredPerRequest: false,
      requestStillRequiresActiveScopedExecutionAuthority: true
    });
  }

  function validateUsdBudgets(budgetIds, estimatedCostUsd) {
    const ids = internal.unique(budgetIds || []);
    if (!ids.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_REQUIRED", "Blocked", { budgetIds: [] });
    const invalid = [];
    ids.forEach(function (id) {
      const budget = typeof namespace.getExternalIntelligenceResourceBudget === "function" ? namespace.getExternalIntelligenceResourceBudget(id) : null;
      if (!budget) { invalid.push({ budgetId: id, reason: "NOT_FOUND" }); return; }
      if (budget.state !== "ACTIVE") invalid.push({ budgetId: id, reason: "NOT_ACTIVE", state: budget.state });
      if (String(budget.currency || "").toUpperCase() !== "USD") invalid.push({ budgetId: id, reason: "USD_REQUIRED", currency: budget.currency });
      const limit = budget.limits && budget.limits.FINANCIAL_COST;
      if (!limit || !Number.isFinite(Number(limit.hardLimit))) invalid.push({ budgetId: id, reason: "FINANCIAL_COST_HARD_LIMIT_REQUIRED" });
    });
    if (invalid.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_INVALID", "Blocked", { invalidBudgets: invalid });
    return namespace.checkExternalIntelligenceResourceBudget({ budgetIds: ids, sourceId: SOURCE_ID, pricingMode: "USAGE_BASED", paidRequest: true, estimatedUsage: { REQUEST_COUNT: 1, FINANCIAL_COST: estimatedCostUsd } });
  }

  async function activateOpenAIGovernedPaidSource(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const source = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    if (!source) return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_NOT_REGISTERED", "Blocked", { sourceId: SOURCE_ID });
    if (source.provider !== "OPENAI" || source.sourceType !== "AI_SERVICE" || source.accessMode !== "LOCAL_GATEWAY" || source.pricingMode !== "USAGE_BASED" || String(source.costCurrency || "").toUpperCase() !== "USD") {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_PROFILE_MISMATCH", "Blocked", { sourceId: SOURCE_ID });
    }
    if (source.authenticationMode !== "BEARER_TOKEN" || !source.secretReferenceId) return internal.buildResult(false, "EXTERNAL010_OPENAI_BEARER_SECRET_BINDING_REQUIRED", "Blocked", { sourceId: SOURCE_ID });
    const secret = typeof namespace.validateExternalIntelligenceSecretReference === "function" ? namespace.validateExternalIntelligenceSecretReference({ secretReferenceId: source.secretReferenceId }) : null;
    if (!secret || secret.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_SECRET_REFERENCE_NOT_READY", "Blocked", { secret: secret || null, secretValueReturned: false });
    const policy = typeof namespace.checkExternalIntelligenceUsagePolicy === "function" ? namespace.checkExternalIntelligenceUsagePolicy({ sourceId: SOURCE_ID, operation: OPERATION_ID }) : null;
    if (!policy || policy.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_BLOCKED", "Blocked", { policy: policy || null });
    const operation = typeof namespace.getExternalIntelligenceSourceOperationContract === "function" ? namespace.getExternalIntelligenceSourceOperationContract(SOURCE_ID, OPERATION_ID) : null;
    if (!operation || operation.method !== "POST" || !operation.endpoint || operation.endpoint.exactUrl !== EXACT_URL || !operation.bodyPolicy || !operation.bodyPolicy.fixedFields || operation.bodyPolicy.fixedFields.store !== false) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_NOT_READY", "Blocked", { storeFalseEnforced: false });
    }
    const perRequestHardCapUsd = finitePositive(settings.perRequestHardCapUsd);
    if (perRequestHardCapUsd == null) return internal.buildResult(false, "EXTERNAL010_OPENAI_PER_REQUEST_COST_CAP_REQUIRED", "Blocked", { currency: "USD" });
    const budget = validateUsdBudgets(settings.budgetIds, perRequestHardCapUsd);
    if (!budget.ok) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_ACTIVATION_BUDGET_BLOCKED", "Blocked", { budget: budget });
    const authority = namespace.evaluateExternalIntelligenceAuthority({ action: ACTIVATION_ACTION, target: { type: "source", id: SOURCE_ID }, purpose: ACTIVATION_PURPOSE });
    if (!authority.allowed || !authority.authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_ACTIVATION_AUTHORITY_DENIED", "Blocked", { authority: authority, hardDeniedGenericActionPreserved: true });
    const envelope = typeof namespace.getExternalIntelligenceAuthorityEnvelope === "function" ? namespace.getExternalIntelligenceAuthorityEnvelope(authority.authorityEnvelopeId) : null;
    if (!envelope || envelope.state !== "ACTIVE" || !envelope.approvalEvidenceId) return internal.buildResult(false, "EXTERNAL010_OPENAI_PROJECT_OWNER_APPROVAL_EVIDENCE_REQUIRED", "Blocked", { authorityEnvelopeId: authority.authorityEnvelopeId || null });
    if (typeof internal.commitExternalIntelligenceSourceVersion !== "function") return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_COMMIT_UNAVAILABLE", "Failed", null);
    const next = internal.commitExternalIntelligenceSourceVersion(SOURCE_ID, {
      enabled: true,
      lifecycleState: "ACTIVE",
      paidActivationPolicy: {
        authorityAction: ACTIVATION_ACTION,
        authorityEnvelopeId: authority.authorityEnvelopeId,
        approvalEvidenceId: envelope.approvalEvidenceId,
        budgetIds: internal.unique(settings.budgetIds || []),
        perRequestHardCapUsd: perRequestHardCapUsd,
        currency: "USD",
        noPerRequestHumanApprovalInsideApprovedScope: true,
        automaticBudgetExpansionAllowed: false,
        activatedAt: internal.nowIso()
      }
    });
    if (!next) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATION_COMMIT_FAILED", "Failed", null);
    if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "GOVERNED_PAID_SOURCE_ACTIVATED", actor: "OpenAI Provider Integration", outcome: "Active", details: { sourceId: SOURCE_ID, authorityEnvelopeId: authority.authorityEnvelopeId, budgetIds: internal.unique(settings.budgetIds || []), perRequestHardCapUsd: perRequestHardCapUsd, currency: "USD", genericActivatePaidApiHardDenyBypassed: false, automaticBudgetExpansionPerformed: false } });
    return internal.buildResult(true, "EXTERNAL010_OPENAI_GOVERNED_PAID_SOURCE_ACTIVATED", "Active", { source: next, authority: authority, budget: budget.data, noPerRequestHumanApprovalInsideApprovedScope: true, genericActivatePaidApiHardDenyPreserved: true });
  }

  function reconcileOpenAIResponsesUsage(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    if (String(settings.sourceId || "").toUpperCase() !== SOURCE_ID) return internal.buildResult(false, "EXTERNAL010_PROVIDER_USAGE_RECONCILIATION_NOT_APPLICABLE", "Skipped", null);
    const payload = internal.isPlainObject(settings.payload) ? settings.payload : {};
    const usage = internal.isPlainObject(payload.usage) ? payload.usage : null;
    const model = String(payload.model || settings.model || "").trim();
    const pricing = MODEL_PRICING[model];
    if (!usage || !pricing) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_AMBIGUOUS", "Reconciliation Pending", { model: model || null, usagePresent: Boolean(usage), pricingProfilePresent: Boolean(pricing), ambiguousBillingState: true });
    const inputTokens = Number(usage.input_tokens);
    const outputTokens = Number(usage.output_tokens);
    const totalTokens = Number(usage.total_tokens);
    if (![inputTokens, outputTokens].every(function (n) { return Number.isFinite(n) && n >= 0; })) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_AMBIGUOUS", "Reconciliation Pending", { ambiguousBillingState: true });
    const cachedTokens = usage.input_tokens_details && Number(usage.input_tokens_details.cached_tokens) || 0;
    // Until a cached-input rate is independently verified in the active pricing profile,
    // cached input is charged at standard input rate for conservative budget reconciliation.
    const financialCost = roundUsd(inputTokens / 1000000 * pricing.inputPerMTokUsd + outputTokens / 1000000 * pricing.outputPerMTokUsd);
    return internal.buildResult(true, "EXTERNAL010_OPENAI_USAGE_RECONCILED", "Reconciled", {
      model: model,
      actualUsage: { AI_TOKEN_USAGE: Number.isFinite(totalTokens) ? totalTokens : inputTokens + outputTokens, FINANCIAL_COST: financialCost },
      providerUsage: internal.clone(usage),
      cachedInputTokensObserved: cachedTokens,
      cachedInputDiscountApplied: false,
      conservativeFinancialAccounting: true,
      currency: "USD",
      pricingProfile: clonePricing(pricing),
      reconciled: true
    });
  }

  function reconcileExternalIntelligenceProviderUsage(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    if (String(settings.sourceId || "").toUpperCase() === SOURCE_ID) return reconcileOpenAIResponsesUsage(settings);
    return internal.buildResult(false, "EXTERNAL010_PROVIDER_USAGE_RECONCILIATION_NOT_APPLICABLE", "Skipped", null);
  }

  function initializeOpenAIProviderIntegration() {
    namespace.modules.openaiProviderIntegration.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_OPENAI_PROVIDER_INTEGRATION_INITIALIZED", "Ready", {
      decisionId: "EXTERNAL-010-DECISION-055",
      sourceId: SOURCE_ID,
      operationId: OPERATION_ID,
      registeredModels: Object.keys(MODEL_PRICING).sort(),
      storeFalseEnforced: true,
      paidActivationAutomatic: false,
      noPerRequestHumanApprovalInsideApprovedScope: true
    });
  }

  Object.assign(namespace.api, {
    initializeOpenAIProviderIntegration: initializeOpenAIProviderIntegration,
    getOpenAIProviderIntegrationProfile: getOpenAIProviderIntegrationProfile,
    listOpenAIModelPricingProfiles: listOpenAIModelPricingProfiles,
    getOpenAIModelPricingProfile: getOpenAIModelPricingProfile,
    validateOpenAIResponsesBody: validateOpenAIResponsesBody,
    estimateOpenAIResponsesCost: estimateOpenAIResponsesCost,
    buildOpenAIProviderSourceRegistration: buildOpenAIProviderSourceRegistration,
    registerOpenAIProviderSourceWithProjectOwnerApproval: registerOpenAIProviderSourceWithProjectOwnerApproval,
    buildOpenAIResponsesOperationContract: buildOpenAIResponsesOperationContract,
    registerOpenAIResponsesOperationContractWithProjectOwnerApproval: registerOpenAIResponsesOperationContractWithProjectOwnerApproval,
    prepareOpenAIResponsesRequest: prepareOpenAIResponsesRequest,
    activateOpenAIGovernedPaidSource: activateOpenAIGovernedPaidSource,
    reconcileOpenAIResponsesUsage: reconcileOpenAIResponsesUsage,
    reconcileExternalIntelligenceProviderUsage: reconcileExternalIntelligenceProviderUsage
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.openaiProviderIntegration = {
    id: "EXTERNAL-010-OPENAI-PROVIDER-INTEGRATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: "API-INTEGRATION-PHASE2-CANDIDATE",
    decision: "055 / 056",
    provider: "OPENAI",
    automaticPaidActivationAllowed: false,
    perRequestHumanApprovalRequiredInsideApprovedScope: false,
    tradingAuthorityGranted: false,
    repositoryMutationAuthorityGranted: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
