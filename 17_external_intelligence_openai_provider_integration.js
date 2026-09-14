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
  const BUDGET_ACTIVATION_ACTION = "ACTIVATE_RESOURCE_BUDGET";
  const BUDGET_ACTIVATION_PURPOSE = "openai-usd-resource-budget";
  const USAGE_POLICY_ACTIVATION_ACTION = "ACTIVATE_USAGE_POLICY";
  const USAGE_POLICY_PURPOSE = "openai-internal-analysis-usage-policy";
  const ACTIVATION_ACTION = "ACTIVATE_GOVERNED_PAID_SOURCE";
  const ACTIVATION_PURPOSE = "paid-provider-activation";
  const REAL_API_TEST_ACTION = "EXECUTE_EXTERNAL_ACQUISITION";
  const REAL_API_TEST_PURPOSE = "openai-real-api-test";
  const REAL_API_TEST_INPUT = "Reply exactly with: OK";
  const REAL_API_TEST_MAX_OUTPUT_TOKENS = 64;
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

  function resolveOpenAIModelPricing(model) {
    const requested = String(model || "").trim();
    if (MODEL_PRICING[requested]) return MODEL_PRICING[requested];
    const base = Object.keys(MODEL_PRICING).find(function (id) { return requested.indexOf(id + "-") === 0; });
    return base ? MODEL_PRICING[base] : null;
  }

  function getOpenAIModelPricingProfile(model) {
    return clonePricing(resolveOpenAIModelPricing(model));
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


  function openAICredentialAlias(secretReferenceId) {
    const raw = internal.text(secretReferenceId || DEFAULT_SECRET_REFERENCE_ID, DEFAULT_SECRET_REFERENCE_ID).toUpperCase();
    const prefix = "SECRET-OPENAI-";
    const suffix = raw.indexOf(prefix) === 0 ? raw.slice(prefix.length) : raw.replace(/[^A-Z0-9]+/g, "-");
    return suffix || "PRIMARY";
  }

  function openAIBillingProfileId(secretReferenceId) {
    return "BILLING-OPENAI-" + openAICredentialAlias(secretReferenceId);
  }

  function buildOpenAIUsdResourceBudgetReview(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const source = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    const operation = typeof namespace.getExternalIntelligenceSourceOperationContract === "function" ? namespace.getExternalIntelligenceSourceOperationContract(SOURCE_ID, OPERATION_ID) : null;
    if (!source || source.lifecycleState !== "REGISTERED") return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_REQUIRED", "Blocked", { nextRequiredAction: "SOURCE_REGISTRATION_AUTHORITY", budgetMutationPerformed: false });
    if (!operation) return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_REGISTRATION_REQUIRED", "Blocked", { nextRequiredAction: "REGISTER_SOURCE_OPERATION_CONTRACT_AUTHORITY", budgetMutationPerformed: false });

    const secretReferenceId = internal.text(settings.secretReferenceId || source.secretReferenceId || DEFAULT_SECRET_REFERENCE_ID, DEFAULT_SECRET_REFERENCE_ID).toUpperCase();
    if (secretReferenceId !== internal.text(source.secretReferenceId, "").toUpperCase()) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_BUDGET_SECRET_SOURCE_BINDING_MISMATCH", "Blocked", { sourceSecretReferenceId: source.secretReferenceId, requestedSecretReferenceId: secretReferenceId, budgetMutationPerformed: false });
    }
    const metadata = typeof namespace.getExternalIntelligenceSecretMetadata === "function" ? namespace.getExternalIntelligenceSecretMetadata(secretReferenceId) : null;
    const secret = metadata && typeof namespace.validateExternalIntelligenceSecretReference === "function" ? namespace.validateExternalIntelligenceSecretReference({ secretReferenceId: secretReferenceId }) : null;
    if (!metadata || !secret || secret.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_SECRET_REFERENCE_NOT_READY", "Blocked", { secretReferenceId: secretReferenceId, budgetMutationPerformed: false });

    const hardLimitUsd = finitePositive(settings.hardLimitUsd);
    if (hardLimitUsd == null) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_HARD_LIMIT_REQUIRED", "Blocked", { currency: "USD", budgetMutationPerformed: false });
    let softLimitUsd = settings.softLimitUsd == null || settings.softLimitUsd === "" ? roundUsd(hardLimitUsd * 0.8) : Number(settings.softLimitUsd);
    if (!Number.isFinite(softLimitUsd) || softLimitUsd < 0 || softLimitUsd > hardLimitUsd) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_SOFT_LIMIT_INVALID", "Blocked", { softLimitUsd: settings.softLimitUsd, hardLimitUsd: hardLimitUsd, budgetMutationPerformed: false });
    const perRequestHardCapUsd = finitePositive(settings.perRequestHardCapUsd);
    if (perRequestHardCapUsd == null) return internal.buildResult(false, "EXTERNAL010_OPENAI_PER_REQUEST_COST_CAP_REQUIRED", "Blocked", { currency: "USD", budgetMutationPerformed: false });
    if (perRequestHardCapUsd > hardLimitUsd) return internal.buildResult(false, "EXTERNAL010_OPENAI_PER_REQUEST_CAP_EXCEEDS_BUDGET", "Blocked", { perRequestHardCapUsd: perRequestHardCapUsd, hardLimitUsd: hardLimitUsd, budgetMutationPerformed: false });

    const alias = openAICredentialAlias(secretReferenceId);
    const billingProfileId = openAIBillingProfileId(secretReferenceId);
    const review = {
      sourceId: SOURCE_ID,
      operationId: OPERATION_ID,
      secretReferenceId: secretReferenceId,
      credentialAlias: alias,
      billingProfileId: billingProfileId,
      scopeType: "SOURCE",
      scopeId: SOURCE_ID,
      currency: "USD",
      period: { type: "CURRENT_ALLOCATION", startsAt: null, endsAt: null },
      limits: { FINANCIAL_COST: { softLimit: softLimitUsd, hardLimit: hardLimitUsd } },
      perRequestHardCapUsd: perRequestHardCapUsd,
      automaticBudgetExpansionAllowed: false,
      automaticRechargeAllowed: false,
      riskLevel: "RED",
      riskReason: "Paid API financial authority boundary is being created",
      projectOwnerApprovalRequiredForActivation: true,
      paidActivationPerformed: false,
      realApiRequestPerformed: false
    };
    return internal.buildResult(true, "EXTERNAL010_OPENAI_USD_BUDGET_REVIEW_READY", "Review Ready", review);
  }

  function createOpenAIUsdResourceBudgetCandidate(input) {
    const review = buildOpenAIUsdResourceBudgetReview(input);
    if (!review || review.ok !== true) return review;
    if (typeof namespace.createExternalIntelligenceResourceBudgetCandidate !== "function") return internal.buildResult(false, "EXTERNAL010_RESOURCE_BUDGET_API_UNAVAILABLE", "Blocked", { budgetMutationPerformed: false });
    const r = review.data;
    const budgetId = "EXTERNAL-010-BUDGET-OPENAI-" + r.credentialAlias + "-" + Date.now().toString(36).toUpperCase();
    const created = namespace.createExternalIntelligenceResourceBudgetCandidate({
      budgetId: budgetId,
      scopeType: r.scopeType,
      scopeId: r.scopeId,
      period: r.period,
      currency: r.currency,
      limits: r.limits
    });
    if (!created || created.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_CANDIDATE_CREATE_FAILED", "Blocked", { createResult: created || null, budgetMutationPerformed: false });
    return internal.buildResult(true, "EXTERNAL010_OPENAI_USD_BUDGET_CANDIDATE_CREATED", "Candidate", {
      budget: created.data && created.data.budget || null,
      budgetId: budgetId,
      secretReferenceId: r.secretReferenceId,
      credentialAlias: r.credentialAlias,
      billingProfileId: r.billingProfileId,
      perRequestHardCapUsd: r.perRequestHardCapUsd,
      automaticBudgetExpansionAllowed: false,
      automaticRechargeAllowed: false,
      budgetMutationPerformed: true,
      budgetActivated: false,
      paidActivationPerformed: false,
      realApiRequestPerformed: false,
      nextRequiredAction: "ACTIVATE_RESOURCE_BUDGET_AUTHORITY"
    });
  }

  async function activateOpenAIUsdResourceBudgetWithProjectOwnerApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const budgetId = internal.text(settings.budgetId, "");
    const budget = budgetId && typeof namespace.getExternalIntelligenceResourceBudget === "function" ? namespace.getExternalIntelligenceResourceBudget(budgetId) : null;
    if (!budget) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_NOT_FOUND", "Blocked", { budgetId: budgetId || null, budgetActivated: false });
    if (budget.state === "ACTIVE") return internal.buildResult(true, "EXTERNAL010_OPENAI_USD_BUDGET_ALREADY_ACTIVE", "Active", { budget: budget, budgetId: budgetId, budgetActivated: false, nextRequiredAction: "USAGE_POLICY" });
    if (budget.state !== "CANDIDATE" || budget.scopeType !== "SOURCE" || budget.scopeId !== SOURCE_ID || String(budget.currency || "").toUpperCase() !== "USD" || !budget.limits || !budget.limits.FINANCIAL_COST) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_SCOPE_INVALID", "Blocked", { budgetId: budgetId, state: budget.state, budgetActivated: false });
    }
    const hardLimitUsd = Number(budget.limits.FINANCIAL_COST.hardLimit);
    const perRequestHardCapUsd = finitePositive(settings.perRequestHardCapUsd);
    if (!Number.isFinite(hardLimitUsd) || hardLimitUsd <= 0 || perRequestHardCapUsd == null || perRequestHardCapUsd > hardLimitUsd) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_LIMITS_INVALID", "Blocked", { hardLimitUsd: hardLimitUsd, perRequestHardCapUsd: settings.perRequestHardCapUsd, budgetActivated: false });
    }
    if (settings.ownerInteractionTrusted !== true || settings.projectOwnerConfirmed !== true || !internal.text(settings.interactionEvidenceId, "")) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_BUDGET_PROJECT_OWNER_INTERACTION_REQUIRED", "Blocked", { budgetId: budgetId, budgetActivated: false, authorityGranted: false });
    }
    const required = [
      "setExternalIntelligenceAuthorityApprovalAdapter",
      "createExternalIntelligenceAuthorityEnvelopeCandidate",
      "activateExternalIntelligenceAuthorityEnvelope",
      "revokeExternalIntelligenceAuthorityEnvelope",
      "activateExternalIntelligenceResourceBudget"
    ];
    const missing = required.filter(function (name) { return typeof namespace[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_BUDGET_AUTHORITY_API_UNAVAILABLE", "Blocked", { missing: missing, budgetActivated: false });

    let authorityEnvelopeId = null;
    let authorityActivated = false;
    const interactionEvidenceId = internal.text(settings.interactionEvidenceId, "");
    const adapter = {
      adapterId: "EXTERNAL-010-OPENAI-BUDGET-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval(context) {
        const envelope = context && context.envelope || {};
        const approval = context && context.approvalInput || {};
        const target = envelope.target || {};
        const exactScope = envelope.action === BUDGET_ACTIVATION_ACTION && target.type === "resource-budget" && target.id === budgetId && envelope.purpose === BUDGET_ACTIVATION_PURPOSE;
        const explicit = approval.projectOwnerConfirmed === true && approval.ownerInteractionTrusted === true && internal.text(approval.interactionEvidenceId, "") === interactionEvidenceId;
        return { approved: exactScope && explicit, actorType: "Project Owner", interactionEvidenceId: exactScope && explicit ? interactionEvidenceId : "" };
      }
    };

    try {
      const adapterResult = namespace.setExternalIntelligenceAuthorityApprovalAdapter(adapter);
      if (!adapterResult || adapterResult.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_BUDGET_APPROVAL_ADAPTER_FAILED", "Blocked", { budgetActivated: false });
      const authorityCandidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
        action: BUDGET_ACTIVATION_ACTION,
        target: { type: "resource-budget", id: budgetId },
        purpose: BUDGET_ACTIVATION_PURPOSE,
        scope: { domain: "EXTERNAL-010", operation: BUDGET_ACTIVATION_ACTION, constraints: { sourceId: SOURCE_ID, budgetId: budgetId, currency: "USD", hardLimitUsd: hardLimitUsd, oneTimeActivation: true } }
      });
      authorityEnvelopeId = authorityCandidate && authorityCandidate.data && authorityCandidate.data.envelope && authorityCandidate.data.envelope.authorityEnvelopeId || null;
      if (!authorityCandidate || authorityCandidate.ok !== true || !authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_OPENAI_BUDGET_AUTHORITY_CANDIDATE_FAILED", "Blocked", { authorityCandidate: authorityCandidate || null, budgetActivated: false });
      const activation = await namespace.activateExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, { projectOwnerConfirmed: true, ownerInteractionTrusted: true, interactionEvidenceId: interactionEvidenceId });
      if (!activation || activation.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_BUDGET_AUTHORITY_ACTIVATION_FAILED", "Blocked", { activation: activation || null, budgetActivated: false });
      authorityActivated = true;
      const activated = await namespace.activateExternalIntelligenceResourceBudget({ budgetId: budgetId, purpose: BUDGET_ACTIVATION_PURPOSE });
      if (!activated || activated.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USD_BUDGET_ACTIVATION_FAILED", "Blocked", { activationResult: activated || null, budgetActivated: false });
      const secretReferenceId = internal.text(settings.secretReferenceId || (typeof namespace.getExternalIntelligenceSource === "function" && namespace.getExternalIntelligenceSource(SOURCE_ID) || {}).secretReferenceId || DEFAULT_SECRET_REFERENCE_ID, DEFAULT_SECRET_REFERENCE_ID).toUpperCase();
      return internal.buildResult(true, "EXTERNAL010_OPENAI_USD_BUDGET_ACTIVATED_WITH_PROJECT_OWNER_APPROVAL", "Active", {
        budget: activated.data && activated.data.budget || null,
        budgetId: budgetId,
        authorityEnvelopeId: authorityEnvelopeId,
        approvalEvidenceId: interactionEvidenceId,
        secretReferenceId: secretReferenceId,
        credentialAlias: openAICredentialAlias(secretReferenceId),
        billingProfileId: openAIBillingProfileId(secretReferenceId),
        perRequestHardCapUsd: perRequestHardCapUsd,
        budgetActivated: true,
        automaticBudgetExpansionPerformed: false,
        automaticRechargePerformed: false,
        paidActivationPerformed: false,
        realApiRequestPerformed: false,
        nextRequiredAction: "USAGE_POLICY"
      });
    } finally {
      if (authorityEnvelopeId) {
        try { namespace.revokeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, authorityActivated ? "One-time OpenAI USD Budget activation completed or ended" : "OpenAI USD Budget approval flow ended"); } catch (_) {}
      }
      try { namespace.setExternalIntelligenceAuthorityApprovalAdapter(null); } catch (_) {}
    }
  }

  function buildOpenAIUsagePolicyReview(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const source = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    const operation = typeof namespace.getExternalIntelligenceSourceOperationContract === "function" ? namespace.getExternalIntelligenceSourceOperationContract(SOURCE_ID, OPERATION_ID) : null;
    if (!source || source.lifecycleState !== "REGISTERED") return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_REGISTRATION_REQUIRED", "Blocked", { nextRequiredAction: "SOURCE_REGISTRATION_AUTHORITY", policyMutationPerformed: false });
    if (!operation) return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_REGISTRATION_REQUIRED", "Blocked", { nextRequiredAction: "REGISTER_SOURCE_OPERATION_CONTRACT_AUTHORITY", policyMutationPerformed: false });
    const budgetId = internal.text(settings.budgetId, "");
    const budget = budgetId && typeof namespace.getExternalIntelligenceResourceBudget === "function" ? namespace.getExternalIntelligenceResourceBudget(budgetId) : null;
    if (!budget || budget.state !== "ACTIVE" || budget.scopeType !== "SOURCE" || budget.scopeId !== SOURCE_ID || String(budget.currency || "").toUpperCase() !== "USD") {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_ACTIVE_USD_BUDGET_REQUIRED", "Blocked", { budgetId: budgetId || null, nextRequiredAction: "USD_RESOURCE_BUDGET", policyMutationPerformed: false });
    }
    const active = typeof namespace.getActiveExternalIntelligenceUsagePolicyForSource === "function" ? namespace.getActiveExternalIntelligenceUsagePolicyForSource(SOURCE_ID) : null;
    if (active) return internal.buildResult(true, "EXTERNAL010_OPENAI_USAGE_POLICY_ALREADY_ACTIVE", "Active", { usagePolicy: active, policyMutationPerformed: false, nextRequiredAction: "PAID_SOURCE_ACTIVATION_AUTHORITY" });
    const review = {
      sourceId: SOURCE_ID,
      operationId: OPERATION_ID,
      budgetId: budgetId,
      proposedRight: {
        state: "ALLOWED_WITH_CONDITIONS",
        conditions: [
          "Project Owner authorizes this configured OpenAI API credential for INTERNAL_ANALYSIS within the registered Responses API scope",
          "Provider terms and account obligations remain externally applicable",
          "No capability expansion beyond the registered initial scope",
          "Paid execution remains subject to active USD Budget and separate Paid Source Activation authority"
        ],
        evidenceIds: [],
        clauseReference: "PROJECT_OWNER_OPERATIONAL_AUTHORIZATION",
        confidence: "MEDIUM"
      },
      policyCompleteness: "PARTIAL",
      interpretationConfidence: "MEDIUM",
      providerTermsIndependentlyVerified: false,
      aiInterpretationEqualsLegalAuthority: false,
      legalAuthorityGranted: false,
      projectOwnerOperationalAuthorizationRequired: true,
      paidActivationPerformed: false,
      realApiRequestPerformed: false
    };
    return internal.buildResult(true, "EXTERNAL010_OPENAI_USAGE_POLICY_REVIEW_READY", "Review Ready", review);
  }

  function createOpenAIUsagePolicyCandidate(input) {
    const review = buildOpenAIUsagePolicyReview(input);
    if (!review || review.ok !== true) return review;
    if (review.code === "EXTERNAL010_OPENAI_USAGE_POLICY_ALREADY_ACTIVE") return review;
    if (typeof namespace.createExternalIntelligenceUsagePolicyCandidate !== "function") return internal.buildResult(false, "EXTERNAL010_USAGE_POLICY_API_UNAVAILABLE", "Blocked", { policyMutationPerformed: false });
    const r = review.data;
    const created = namespace.createExternalIntelligenceUsagePolicyCandidate({
      sourceId: SOURCE_ID,
      policyVersion: "openai-internal-analysis-v1",
      status: "REVIEW_REQUIRED",
      rights: { INTERNAL_ANALYSIS: r.proposedRight },
      policyCompleteness: r.policyCompleteness,
      interpretationConfidence: r.interpretationConfidence,
      analysisStatus: "SUCCESS",
      analysisVersion: "EXTERNAL-010-OPENAI-USAGE-POLICY-V1",
      policyEvidenceIds: []
    });
    if (!created || created.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_CANDIDATE_CREATE_FAILED", "Blocked", { createResult: created || null, policyMutationPerformed: false });
    return internal.buildResult(true, "EXTERNAL010_OPENAI_USAGE_POLICY_CANDIDATE_CREATED", "Review Required", {
      usagePolicy: created.data && created.data.usagePolicy || null,
      usagePolicyId: created.data && created.data.usagePolicy && created.data.usagePolicy.usagePolicyId || null,
      budgetId: r.budgetId,
      policyMutationPerformed: true,
      policyActivated: false,
      legalAuthorityGranted: false,
      paidActivationPerformed: false,
      realApiRequestPerformed: false,
      nextRequiredAction: "ACTIVATE_USAGE_POLICY_AUTHORITY"
    });
  }

  async function activateOpenAIUsagePolicyWithProjectOwnerApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const usagePolicyId = internal.text(settings.usagePolicyId, "");
    const policy = usagePolicyId && typeof namespace.getExternalIntelligenceUsagePolicy === "function" ? namespace.getExternalIntelligenceUsagePolicy(usagePolicyId) : null;
    if (!policy) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_NOT_FOUND", "Blocked", { usagePolicyId: usagePolicyId || null, policyActivated: false });
    if (policy.status === "ACTIVE") return internal.buildResult(true, "EXTERNAL010_OPENAI_USAGE_POLICY_ALREADY_ACTIVE", "Active", { usagePolicy: policy, policyActivated: false, nextRequiredAction: "PAID_SOURCE_ACTIVATION_AUTHORITY" });
    if (!["CANDIDATE", "REVIEW_REQUIRED"].includes(policy.status) || policy.sourceId !== SOURCE_ID || !policy.rights || !policy.rights[OPERATION_ID] || policy.rights[OPERATION_ID].state !== "ALLOWED_WITH_CONDITIONS") {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_SCOPE_INVALID", "Blocked", { usagePolicyId: usagePolicyId, status: policy.status, policyActivated: false });
    }
    if (settings.ownerInteractionTrusted !== true || settings.projectOwnerConfirmed !== true || !internal.text(settings.interactionEvidenceId, "")) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_PROJECT_OWNER_INTERACTION_REQUIRED", "Blocked", { usagePolicyId: usagePolicyId, policyActivated: false, legalAuthorityGranted: false });
    }
    const required = ["setExternalIntelligenceAuthorityApprovalAdapter","createExternalIntelligenceAuthorityEnvelopeCandidate","activateExternalIntelligenceAuthorityEnvelope","revokeExternalIntelligenceAuthorityEnvelope","activateExternalIntelligenceUsagePolicy"];
    const missing = required.filter(function (name) { return typeof namespace[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_AUTHORITY_API_UNAVAILABLE", "Blocked", { missing: missing, policyActivated: false });
    let authorityEnvelopeId = null;
    let authorityActivated = false;
    const interactionEvidenceId = internal.text(settings.interactionEvidenceId, "");
    const adapter = {
      adapterId: "EXTERNAL-010-OPENAI-USAGE-POLICY-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval(context) {
        const envelope = context && context.envelope || {};
        const approval = context && context.approvalInput || {};
        const target = envelope.target || {};
        const exactScope = envelope.action === USAGE_POLICY_ACTIVATION_ACTION && target.type === "usage-policy" && target.id === usagePolicyId && envelope.purpose === USAGE_POLICY_PURPOSE;
        const explicit = approval.projectOwnerConfirmed === true && approval.ownerInteractionTrusted === true && internal.text(approval.interactionEvidenceId, "") === interactionEvidenceId;
        return { approved: exactScope && explicit, actorType: "Project Owner", interactionEvidenceId: exactScope && explicit ? interactionEvidenceId : "" };
      }
    };
    try {
      const adapterResult = namespace.setExternalIntelligenceAuthorityApprovalAdapter(adapter);
      if (!adapterResult || adapterResult.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_APPROVAL_ADAPTER_FAILED", "Blocked", { adapter: adapterResult || null, policyActivated: false });
      const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
        action: USAGE_POLICY_ACTIVATION_ACTION,
        target: { type: "usage-policy", id: usagePolicyId },
        purpose: USAGE_POLICY_PURPOSE,
        scope: { domain: "EXTERNAL-010", operation: USAGE_POLICY_ACTIVATION_ACTION, constraints: { sourceId: SOURCE_ID, operationId: OPERATION_ID, oneTimeActivation: true } }
      });
      authorityEnvelopeId = candidate && candidate.data && candidate.data.envelope && candidate.data.envelope.authorityEnvelopeId || null;
      if (!candidate || candidate.ok !== true || !authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_AUTHORITY_CANDIDATE_FAILED", "Blocked", { authorityCandidate: candidate || null, policyActivated: false });
      const activation = await namespace.activateExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, { projectOwnerConfirmed: true, ownerInteractionTrusted: true, interactionEvidenceId: interactionEvidenceId });
      if (!activation || activation.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_AUTHORITY_ACTIVATION_FAILED", "Blocked", { activation: activation || null, policyActivated: false });
      authorityActivated = true;
      const activated = await namespace.activateExternalIntelligenceUsagePolicy({ usagePolicyId: usagePolicyId, purpose: USAGE_POLICY_PURPOSE });
      if (!activated || activated.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_ACTIVATION_FAILED", "Blocked", { activationResult: activated || null, policyActivated: false });
      const check = typeof namespace.checkExternalIntelligenceUsagePolicy === "function" ? namespace.checkExternalIntelligenceUsagePolicy({ sourceId: SOURCE_ID, operation: OPERATION_ID }) : null;
      if (!check || check.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_POST_ACTIVATION_CHECK_FAILED", "Blocked", { policyCheck: check || null, policyActivated: false });
      return internal.buildResult(true, "EXTERNAL010_OPENAI_USAGE_POLICY_ACTIVATED_WITH_PROJECT_OWNER_APPROVAL", "Active", {
        usagePolicy: activated.data && activated.data.usagePolicy || null,
        usagePolicyId: usagePolicyId,
        authorityEnvelopeId: authorityEnvelopeId,
        approvalEvidenceId: interactionEvidenceId,
        policyActivated: true,
        policyCheck: check,
        aiInterpretationEqualsLegalAuthority: false,
        legalAuthorityGranted: false,
        paidActivationPerformed: false,
        realApiRequestPerformed: false,
        nextRequiredAction: "PAID_SOURCE_ACTIVATION_AUTHORITY"
      });
    } finally {
      if (authorityEnvelopeId) {
        try { namespace.revokeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, authorityActivated ? "One-time OpenAI Usage Policy activation completed or ended" : "OpenAI Usage Policy approval flow ended"); } catch (_) {}
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


  function buildOpenAIPaidSourceActivationReview(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const source = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    if (!source) return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_NOT_REGISTERED", "Blocked", { sourceId: SOURCE_ID, paidActivationPerformed: false });
    if (source.lifecycleState === "ACTIVE" && source.enabled === true && source.paidActivationPolicy) {
      return internal.buildResult(true, "EXTERNAL010_OPENAI_PAID_SOURCE_ALREADY_ACTIVE", "Active", {
        source: source,
        paidActivationPerformed: false,
        realApiRequestPerformed: false,
        nextRequiredAction: "REAL_API_TEST"
      });
    }
    if (source.provider !== "OPENAI" || source.sourceType !== "AI_SERVICE" || source.accessMode !== "LOCAL_GATEWAY" || source.pricingMode !== "USAGE_BASED" || String(source.costCurrency || "").toUpperCase() !== "USD") {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_SOURCE_PROFILE_MISMATCH", "Blocked", { sourceId: SOURCE_ID, paidActivationPerformed: false });
    }
    const secret = typeof namespace.validateExternalIntelligenceSecretReference === "function" ? namespace.validateExternalIntelligenceSecretReference({ secretReferenceId: source.secretReferenceId }) : null;
    if (!secret || secret.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_SECRET_REFERENCE_NOT_READY", "Blocked", { secret: secret || null, secretValueReturned: false, paidActivationPerformed: false });
    const operation = typeof namespace.getExternalIntelligenceSourceOperationContract === "function" ? namespace.getExternalIntelligenceSourceOperationContract(SOURCE_ID, OPERATION_ID) : null;
    if (!operation || operation.method !== "POST" || !operation.endpoint || operation.endpoint.exactUrl !== EXACT_URL || !operation.bodyPolicy || !operation.bodyPolicy.fixedFields || operation.bodyPolicy.fixedFields.store !== false) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_NOT_READY", "Blocked", { storeFalseEnforced: false, paidActivationPerformed: false });
    }
    const policy = typeof namespace.checkExternalIntelligenceUsagePolicy === "function" ? namespace.checkExternalIntelligenceUsagePolicy({ sourceId: SOURCE_ID, operation: OPERATION_ID }) : null;
    if (!policy || policy.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_BLOCKED", "Blocked", { policy: policy || null, paidActivationPerformed: false });
    const perRequestHardCapUsd = finitePositive(settings.perRequestHardCapUsd);
    if (perRequestHardCapUsd == null) return internal.buildResult(false, "EXTERNAL010_OPENAI_PER_REQUEST_COST_CAP_REQUIRED", "Blocked", { currency: "USD", paidActivationPerformed: false });
    const budgetIds = internal.unique(settings.budgetIds || []);
    const budget = validateUsdBudgets(budgetIds, perRequestHardCapUsd);
    if (!budget.ok) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_ACTIVATION_BUDGET_BLOCKED", "Blocked", { budget: budget, paidActivationPerformed: false });
    const hardDenied = VERSION_MANIFEST.authorityPolicy && Array.isArray(VERSION_MANIFEST.authorityPolicy.hardDeniedActions) ? VERSION_MANIFEST.authorityPolicy.hardDeniedActions : [];
    const genericHardDenyPreserved = hardDenied.includes("ACTIVATE_PAID_API");
    if (!genericHardDenyPreserved) return internal.buildResult(false, "EXTERNAL010_OPENAI_GENERIC_PAID_API_HARD_DENY_REQUIRED", "Blocked", { genericActivatePaidApiHardDenyPreserved: false, paidActivationPerformed: false });
    return internal.buildResult(true, "EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATION_REVIEW_READY", "Review Ready", {
      sourceId: SOURCE_ID,
      sourceLifecycleState: source.lifecycleState,
      sourceEnabled: source.enabled === true,
      secretReferenceId: source.secretReferenceId,
      operationContractId: operation.operationContractId,
      operationId: OPERATION_ID,
      usagePolicyId: policy.data && policy.data.usagePolicyId || null,
      usageRight: policy.data && policy.data.right || null,
      budgetIds: budgetIds,
      budgetCheck: budget.data || null,
      perRequestHardCapUsd: perRequestHardCapUsd,
      currency: "USD",
      activationAuthorityAction: ACTIVATION_ACTION,
      genericActivatePaidApiHardDenyPreserved: true,
      noPerRequestHumanApprovalInsideApprovedScope: true,
      automaticBudgetExpansionAllowed: false,
      automaticRechargeAllowed: false,
      automaticCredentialFailoverAllowed: false,
      riskLevel: "RED",
      riskReason: "Paid OpenAI execution boundary will be activated",
      projectOwnerApprovalRequired: true,
      paidActivationPerformed: false,
      realApiRequestPerformed: false
    });
  }

  async function activateOpenAIPaidSourceWithProjectOwnerApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const review = buildOpenAIPaidSourceActivationReview(settings);
    if (!review || review.ok !== true) return review;
    if (review.code === "EXTERNAL010_OPENAI_PAID_SOURCE_ALREADY_ACTIVE") return review;
    if (settings.ownerInteractionTrusted !== true || settings.projectOwnerConfirmed !== true || !internal.text(settings.interactionEvidenceId, "")) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_PROJECT_OWNER_INTERACTION_REQUIRED", "Blocked", { paidActivationPerformed: false, realApiRequestPerformed: false });
    }
    const required = [
      "setExternalIntelligenceAuthorityApprovalAdapter",
      "createExternalIntelligenceAuthorityEnvelopeCandidate",
      "activateExternalIntelligenceAuthorityEnvelope",
      "revokeExternalIntelligenceAuthorityEnvelope"
    ];
    const missing = required.filter(function (name) { return typeof namespace[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_AUTHORITY_API_UNAVAILABLE", "Blocked", { missing: missing, paidActivationPerformed: false });

    const budgetIds = internal.unique(review.data.budgetIds || []);
    const perRequestHardCapUsd = review.data.perRequestHardCapUsd;
    const interactionEvidenceId = internal.text(settings.interactionEvidenceId, "");
    let authorityEnvelopeId = null;
    let authorityActivated = false;
    const adapter = {
      adapterId: "EXTERNAL-010-OPENAI-PAID-SOURCE-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval(context) {
        const envelope = context && context.envelope || {};
        const approval = context && context.approvalInput || {};
        const target = envelope.target || {};
        const exactScope = envelope.action === ACTIVATION_ACTION && target.type === "source" && target.id === SOURCE_ID && envelope.purpose === ACTIVATION_PURPOSE;
        const explicit = approval.projectOwnerConfirmed === true && approval.ownerInteractionTrusted === true && internal.text(approval.interactionEvidenceId, "") === interactionEvidenceId;
        return { approved: exactScope && explicit, actorType: "Project Owner", interactionEvidenceId: exactScope && explicit ? interactionEvidenceId : "" };
      }
    };

    try {
      const adapterResult = namespace.setExternalIntelligenceAuthorityApprovalAdapter(adapter);
      if (!adapterResult || adapterResult.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_APPROVAL_ADAPTER_FAILED", "Blocked", { paidActivationPerformed: false });
      const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
        action: ACTIVATION_ACTION,
        target: { type: "source", id: SOURCE_ID },
        purpose: ACTIVATION_PURPOSE,
        scope: {
          domain: "EXTERNAL-010",
          operation: ACTIVATION_ACTION,
          constraints: {
            sourceId: SOURCE_ID,
            operationId: OPERATION_ID,
            budgetIds: budgetIds,
            perRequestHardCapUsd: perRequestHardCapUsd,
            currency: "USD",
            noPerRequestHumanApprovalInsideApprovedScope: true,
            automaticBudgetExpansionAllowed: false,
            oneTimeActivation: true
          }
        }
      });
      authorityEnvelopeId = candidate && candidate.data && candidate.data.envelope && candidate.data.envelope.authorityEnvelopeId || null;
      if (!candidate || candidate.ok !== true || !authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_AUTHORITY_CANDIDATE_FAILED", "Blocked", { authorityCandidate: candidate || null, paidActivationPerformed: false });
      const activation = await namespace.activateExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, { projectOwnerConfirmed: true, ownerInteractionTrusted: true, interactionEvidenceId: interactionEvidenceId });
      if (!activation || activation.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_AUTHORITY_ACTIVATION_FAILED", "Blocked", { activation: activation || null, paidActivationPerformed: false });
      authorityActivated = true;
      const activated = await activateOpenAIGovernedPaidSource({ budgetIds: budgetIds, perRequestHardCapUsd: perRequestHardCapUsd });
      if (!activated || activated.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATION_FAILED", "Blocked", { activationResult: activated || null, paidActivationPerformed: false });
      const activeSource = activated.data && activated.data.source || null;
      return internal.buildResult(true, "EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATED_WITH_PROJECT_OWNER_APPROVAL", "Active", {
        source: activeSource,
        authorityEnvelopeId: authorityEnvelopeId,
        approvalEvidenceId: interactionEvidenceId,
        budgetIds: budgetIds,
        perRequestHardCapUsd: perRequestHardCapUsd,
        currency: "USD",
        noPerRequestHumanApprovalInsideApprovedScope: true,
        genericActivatePaidApiHardDenyPreserved: true,
        automaticBudgetExpansionPerformed: false,
        automaticRechargePerformed: false,
        automaticCredentialFailoverPerformed: false,
        paidActivationPerformed: true,
        realApiRequestPerformed: false,
        nextRequiredAction: "REAL_API_TEST"
      });
    } finally {
      if (authorityEnvelopeId) {
        try { namespace.revokeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, authorityActivated ? "One-time OpenAI Paid Source activation completed or ended" : "OpenAI Paid Source approval flow ended"); } catch (_) {}
      }
      try { namespace.setExternalIntelligenceAuthorityApprovalAdapter(null); } catch (_) {}
    }
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

  function extractOpenAIResponseText(payload) {
    const response = internal.isPlainObject(payload) ? payload : {};
    if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
    const output = Array.isArray(response.output) ? response.output : [];
    const parts = [];
    output.forEach(function (item) {
      const content = item && Array.isArray(item.content) ? item.content : [];
      content.forEach(function (entry) {
        if (entry && typeof entry.text === "string") parts.push(entry.text);
        else if (entry && typeof entry.output_text === "string") parts.push(entry.output_text);
      });
    });
    return parts.join("\n").trim();
  }

  function getOpenAIRealApiTestValidation() {
    const source = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    return source && internal.isPlainObject(source.realApiTestValidation) ? internal.clone(source.realApiTestValidation) : null;
  }

  function buildOpenAIRealApiTestReview(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const source = typeof namespace.getExternalIntelligenceSource === "function" ? namespace.getExternalIntelligenceSource(SOURCE_ID) : null;
    if (!source || source.lifecycleState !== "ACTIVE" || source.enabled !== true || !source.paidActivationPolicy) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVE_REQUIRED", "Blocked", { realApiRequestPerformed: false, nextRequiredAction: "PAID_SOURCE_ACTIVATION_AUTHORITY" });
    }
    const existing = getOpenAIRealApiTestValidation();
    if (existing && existing.passed === true) {
      return internal.buildResult(true, "EXTERNAL010_OPENAI_REAL_API_TEST_ALREADY_PASSED", "Passed", { validation: existing, realApiRequestPerformed: false, nextRequiredAction: "FINAL_VALIDATION" });
    }
    const operation = typeof namespace.getExternalIntelligenceSourceOperationContract === "function" ? namespace.getExternalIntelligenceSourceOperationContract(SOURCE_ID, OPERATION_ID) : null;
    if (!operation || operation.method !== "POST" || !operation.bodyPolicy || !operation.bodyPolicy.fixedFields || operation.bodyPolicy.fixedFields.store !== false) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_OPERATION_CONTRACT_NOT_READY", "Blocked", { realApiRequestPerformed: false });
    }
    const secret = typeof namespace.validateExternalIntelligenceSecretReference === "function" ? namespace.validateExternalIntelligenceSecretReference({ secretReferenceId: source.secretReferenceId }) : null;
    if (!secret || secret.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_SECRET_REFERENCE_NOT_READY", "Blocked", { secretValueReturned: false, realApiRequestPerformed: false });
    const policy = typeof namespace.checkExternalIntelligenceUsagePolicy === "function" ? namespace.checkExternalIntelligenceUsagePolicy({ sourceId: SOURCE_ID, operation: OPERATION_ID }) : null;
    if (!policy || policy.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_USAGE_POLICY_BLOCKED", "Blocked", { policy: policy || null, realApiRequestPerformed: false });
    const model = internal.text(settings.model, "");
    if (!MODEL_PRICING[model]) return internal.buildResult(false, "EXTERNAL010_OPENAI_MODEL_NOT_REGISTERED", "Blocked", { model: model || null, realApiRequestPerformed: false });
    const configuredMax = Number(settings.maxOutputTokens);
    const testMaxOutputTokens = Math.max(1, Math.min(Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : REAL_API_TEST_MAX_OUTPUT_TOKENS, REAL_API_TEST_MAX_OUTPUT_TOKENS));
    const perRequestHardCapUsd = finitePositive(settings.perRequestHardCapUsd || source.paidActivationPolicy.perRequestHardCapUsd);
    const budgetIds = internal.unique(settings.budgetIds && settings.budgetIds.length ? settings.budgetIds : source.paidActivationPolicy.budgetIds || []);
    const body = { model: model, input: REAL_API_TEST_INPUT, store: false, max_output_tokens: testMaxOutputTokens };
    const prepared = prepareOpenAIResponsesRequest({ body: body, perRequestHardCapUsd: perRequestHardCapUsd, budgetIds: budgetIds, purpose: REAL_API_TEST_PURPOSE, requestedBy: "Project Owner / OpenAI Real API Test" });
    if (!prepared || prepared.ok !== true) return prepared;
    const budgetCheck = validateUsdBudgets(budgetIds, prepared.data.costEstimate.maximumEstimatedCostUsd);
    if (!budgetCheck || budgetCheck.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_BUDGET_BLOCKED", "Blocked", { budget: budgetCheck || null, realApiRequestPerformed: false });
    const gateway = typeof namespace.getExternalIntelligenceGatewayClientState === "function" ? namespace.getExternalIntelligenceGatewayClientState() : null;
    const session = gateway && gateway.session || null;
    const gatewayReady = Boolean(gateway && String(gateway.healthState || "").toUpperCase() === "READY" && session && String(session.state || "").toUpperCase() === "ACTIVE" && gateway.sessionTokenPresentInMemory === true);
    if (!gatewayReady) return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_GATEWAY_SESSION_REQUIRED", "Blocked", { gatewayReady: false, realApiRequestPerformed: false, nextRequiredAction: "GATEWAY_SESSION" });
    const bridge = typeof namespace.enableExternalIntelligenceGatewayAcquisitionBridge === "function" ? namespace.enableExternalIntelligenceGatewayAcquisitionBridge() : null;
    if (!bridge || bridge.ok !== true) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_GATEWAY_ACQUISITION_BRIDGE_REQUIRED", "Blocked", {
        gatewayReady: true,
        acquisitionBridge: bridge || null,
        realApiRequestAttempted: false,
        providerNetworkCallPerformed: false,
        realApiRequestPerformed: false,
        nextRequiredAction: "GATEWAY_ACQUISITION_BRIDGE"
      });
    }
    return internal.buildResult(true, "EXTERNAL010_OPENAI_REAL_API_TEST_REVIEW_READY", "Review Ready", {
      sourceId: SOURCE_ID,
      operationId: OPERATION_ID,
      secretReferenceId: source.secretReferenceId,
      model: model,
      testBody: body,
      fixedTestInput: REAL_API_TEST_INPUT,
      testInputContainsProjectData: false,
      externalTransmission: "FIXED_TEST_TEXT_ONLY",
      budgetIds: budgetIds,
      perRequestHardCapUsd: perRequestHardCapUsd,
      costEstimate: prepared.data.costEstimate,
      requestCandidate: prepared.data.requestCandidate,
      usagePolicyId: policy.data && policy.data.usagePolicyId || null,
      storeFalseEnforced: true,
      retryMaxAttempts: 1,
      projectOwnerApprovalRequired: true,
      paidSourceAlreadyActive: true,
      gatewayAcquisitionBridgeReady: true,
      realApiRequestAttempted: false,
      providerNetworkCallPerformed: false,
      realApiRequestPerformed: false,
      nextRequiredAction: "PROJECT_OWNER_REAL_API_TEST_APPROVAL"
    });
  }

  async function runOpenAIRealApiTestWithProjectOwnerApproval(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const review = buildOpenAIRealApiTestReview(settings);
    if (!review || review.ok !== true) return review;
    if (review.code === "EXTERNAL010_OPENAI_REAL_API_TEST_ALREADY_PASSED") return review;
    if (settings.ownerInteractionTrusted !== true || settings.projectOwnerConfirmed !== true || !internal.text(settings.interactionEvidenceId, "")) {
      return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_PROJECT_OWNER_INTERACTION_REQUIRED", "Blocked", { realApiRequestPerformed: false });
    }
    const required = [
      "setExternalIntelligenceAuthorityApprovalAdapter",
      "createExternalIntelligenceAuthorityEnvelopeCandidate",
      "activateExternalIntelligenceAuthorityEnvelope",
      "revokeExternalIntelligenceAuthorityEnvelope",
      "submitExternalIntelligenceAcquisition"
    ];
    const missing = required.filter(function (name) { return typeof namespace[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_DEPENDENCY_UNAVAILABLE", "Blocked", { missing: missing, realApiRequestPerformed: false });

    const interactionEvidenceId = internal.text(settings.interactionEvidenceId, "");
    const requestId = internal.nextId("EXTERNAL-010-OPENAI-REAL-TEST");
    const requestInput = Object.assign({}, internal.clone(review.data.requestCandidate), {
      requestId: requestId,
      purpose: REAL_API_TEST_PURPOSE,
      requestedBy: "Project Owner / OpenAI Real API Test",
      executionPreference: "IMMEDIATE",
      idempotencyKey: null
    });
    let authorityEnvelopeId = null;
    let authorityActivated = false;
    const adapter = {
      adapterId: "EXTERNAL-010-OPENAI-REAL-API-TEST-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval(context) {
        const envelope = context && context.envelope || {};
        const approval = context && context.approvalInput || {};
        const target = envelope.target || {};
        const exactScope = envelope.action === REAL_API_TEST_ACTION && target.type === "external-acquisition" && target.id === requestId && envelope.purpose === REAL_API_TEST_PURPOSE;
        const explicit = approval.projectOwnerConfirmed === true && approval.ownerInteractionTrusted === true && internal.text(approval.interactionEvidenceId, "") === interactionEvidenceId;
        return { approved: exactScope && explicit, actorType: "Project Owner", interactionEvidenceId: exactScope && explicit ? interactionEvidenceId : "" };
      }
    };

    try {
      const adapterResult = namespace.setExternalIntelligenceAuthorityApprovalAdapter(adapter);
      if (!adapterResult || adapterResult.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_APPROVAL_ADAPTER_FAILED", "Blocked", { realApiRequestPerformed: false });
      const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
        action: REAL_API_TEST_ACTION,
        target: { type: "external-acquisition", id: requestId },
        purpose: REAL_API_TEST_PURPOSE,
        scope: {
          domain: "EXTERNAL-010",
          operation: OPERATION_ID,
          constraints: {
            sourceId: SOURCE_ID,
            requestId: requestId,
            model: review.data.model,
            budgetIds: internal.clone(review.data.budgetIds),
            maximumEstimatedCostUsd: review.data.costEstimate.maximumEstimatedCostUsd,
            perRequestHardCapUsd: review.data.perRequestHardCapUsd,
            fixedTestInputOnly: true,
            oneTimeRealApiTest: true
          }
        }
      });
      authorityEnvelopeId = candidate && candidate.data && candidate.data.envelope && candidate.data.envelope.authorityEnvelopeId || null;
      if (!candidate || candidate.ok !== true || !authorityEnvelopeId) return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_AUTHORITY_CANDIDATE_FAILED", "Blocked", { authorityCandidate: candidate || null, realApiRequestPerformed: false });
      const activation = await namespace.activateExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, { projectOwnerConfirmed: true, ownerInteractionTrusted: true, interactionEvidenceId: interactionEvidenceId });
      if (!activation || activation.ok !== true) return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_AUTHORITY_ACTIVATION_FAILED", "Blocked", { activation: activation || null, realApiRequestPerformed: false });
      authorityActivated = true;

      const execution = await namespace.submitExternalIntelligenceAcquisition(requestInput);
      if (!execution || execution.ok !== true) {
        const route = execution && execution.data && execution.data.route || null;
        const routeData = route && route.data || null;
        const routeCode = String(routeData && routeData.code || route && route.code || "").toUpperCase();
        const definitelyPreNetwork = [
          "LOCAL_GATEWAY_ACQUISITION_EXECUTOR_UNAVAILABLE",
          "LOCAL_GATEWAY_ADAPTER_REQUIRED",
          "SOURCE_ACCESS_MODE_DISABLED",
          "AUTO_ROUTE_NO_POLICY_COMPLIANT_RUNTIME"
        ].includes(routeCode) || String(execution && execution.code || "").toUpperCase().includes("PREEXECUTION");
        return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_REQUEST_FAILED", "Failed", {
          requestId: requestId,
          execution: execution || null,
          realApiRequestAttempted: true,
          providerNetworkCallPerformed: definitelyPreNetwork ? false : null,
          realApiRequestPerformed: definitelyPreNetwork ? false : null,
          testPassed: false,
          nextRequiredAction: "REVIEW_REAL_API_TEST_FAILURE"
        });
      }
      const reconciliation = execution.data && execution.data.usageReconciliation || null;
      const providerReconciliation = reconciliation && reconciliation.providerReconciliation || null;
      const usageRecordResult = reconciliation && reconciliation.usageRecordResult || null;
      if (!reconciliation || reconciliation.reconciled !== true || !providerReconciliation || providerReconciliation.ok !== true || !usageRecordResult || usageRecordResult.ok !== true) {
        return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_USAGE_RECONCILIATION_REQUIRED", "Reconciliation Pending", {
          requestId: requestId,
          execution: execution.data || null,
          realApiRequestPerformed: true,
          usageReconciled: false,
          ambiguousPaidCostAssumedZero: false,
          testPassed: false,
          nextRequiredAction: "REVIEW_USAGE_RECONCILIATION"
        });
      }
      const response = execution.data && execution.data.response || {};
      const payload = internal.isPlainObject(response.payload) ? response.payload : {};
      const outputText = extractOpenAIResponseText(payload);
      const outputMatchedExpected = outputText.trim().toUpperCase() === "OK";
      if (!outputMatchedExpected) {
        return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_OUTPUT_MISMATCH", "Failed", {
          requestId: requestId,
          providerResponseId: internal.text(payload.id, "") || null,
          outputMatchedExpected: false,
          realApiRequestPerformed: true,
          usageReconciled: true,
          actualUsage: providerReconciliation.data && providerReconciliation.data.actualUsage || null,
          testPassed: false,
          nextRequiredAction: "REVIEW_MODEL_OUTPUT"
        });
      }
      if (typeof internal.commitExternalIntelligenceSourceVersion !== "function") return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_SOURCE_COMMIT_UNAVAILABLE", "Failed", { realApiRequestPerformed: true, usageReconciled: true });
      const actualUsage = internal.clone(providerReconciliation.data.actualUsage || {});
      const completedAt = internal.nowIso();
      const validation = {
        passed: true,
        requestId: requestId,
        responseId: response.responseId || null,
        providerResponseId: internal.text(payload.id, "") || null,
        providerRequestId: response.responseMetadata && response.responseMetadata.providerRequestId || null,
        modelRequested: review.data.model,
        modelReported: internal.text(payload.model, "") || review.data.model,
        budgetIds: internal.clone(review.data.budgetIds),
        estimatedMaximumCostUsd: review.data.costEstimate.maximumEstimatedCostUsd,
        actualUsage: actualUsage,
        outputMatchedExpected: true,
        fixedTestInputOnly: true,
        projectDataTransmitted: false,
        store: false,
        toolsEnabled: false,
        streamingEnabled: false,
        retryMaxAttempts: 1,
        secretValueReturned: false,
        completedAt: completedAt
      };
      const next = internal.commitExternalIntelligenceSourceVersion(SOURCE_ID, { realApiTestValidation: validation });
      if (!next) return internal.buildResult(false, "EXTERNAL010_OPENAI_REAL_API_TEST_VALIDATION_COMMIT_FAILED", "Failed", { realApiRequestPerformed: true, usageReconciled: true });
      if (typeof namespace.appendExternalIntelligenceAuditEvent === "function") await namespace.appendExternalIntelligenceAuditEvent({ eventType: "OPENAI_REAL_API_TEST_PASSED", actor: "OpenAI Provider Integration", outcome: "Passed", details: { sourceId: SOURCE_ID, requestId: requestId, providerResponseId: validation.providerResponseId, model: validation.modelReported, budgetIds: validation.budgetIds, actualUsage: actualUsage, outputMatchedExpected: true, projectDataTransmitted: false, secretValueLogged: false } });
      return internal.buildResult(true, "EXTERNAL010_OPENAI_REAL_API_TEST_PASSED", "Passed", {
        source: next,
        validation: validation,
        authorityEnvelopeId: authorityEnvelopeId,
        approvalEvidenceId: interactionEvidenceId,
        realApiRequestAttempted: true,
        providerNetworkCallPerformed: true,
        realApiRequestPerformed: true,
        usageReconciled: true,
        actualUsage: actualUsage,
        budgetUsageRecordId: usageRecordResult.data && usageRecordResult.data.usageRecord && usageRecordResult.data.usageRecord.usageRecordId || null,
        testPassed: true,
        nextRequiredAction: "FINAL_VALIDATION"
      });
    } finally {
      if (authorityEnvelopeId) {
        try { namespace.revokeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, authorityActivated ? "One-time OpenAI Real API Test completed or ended" : "OpenAI Real API Test approval flow ended"); } catch (_) {}
      }
      try { namespace.setExternalIntelligenceAuthorityApprovalAdapter(null); } catch (_) {}
    }
  }

  function reconcileOpenAIResponsesUsage(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    if (String(settings.sourceId || "").toUpperCase() !== SOURCE_ID) return internal.buildResult(false, "EXTERNAL010_PROVIDER_USAGE_RECONCILIATION_NOT_APPLICABLE", "Skipped", null);
    const payload = internal.isPlainObject(settings.payload) ? settings.payload : {};
    const usage = internal.isPlainObject(payload.usage) ? payload.usage : null;
    const model = String(payload.model || settings.model || "").trim();
    const pricing = resolveOpenAIModelPricing(model);
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
    buildOpenAIUsdResourceBudgetReview: buildOpenAIUsdResourceBudgetReview,
    createOpenAIUsdResourceBudgetCandidate: createOpenAIUsdResourceBudgetCandidate,
    activateOpenAIUsdResourceBudgetWithProjectOwnerApproval: activateOpenAIUsdResourceBudgetWithProjectOwnerApproval,
    buildOpenAIUsagePolicyReview: buildOpenAIUsagePolicyReview,
    createOpenAIUsagePolicyCandidate: createOpenAIUsagePolicyCandidate,
    activateOpenAIUsagePolicyWithProjectOwnerApproval: activateOpenAIUsagePolicyWithProjectOwnerApproval,
    buildOpenAIPaidSourceActivationReview: buildOpenAIPaidSourceActivationReview,
    activateOpenAIPaidSourceWithProjectOwnerApproval: activateOpenAIPaidSourceWithProjectOwnerApproval,
    prepareOpenAIResponsesRequest: prepareOpenAIResponsesRequest,
    activateOpenAIGovernedPaidSource: activateOpenAIGovernedPaidSource,
    buildOpenAIRealApiTestReview: buildOpenAIRealApiTestReview,
    runOpenAIRealApiTestWithProjectOwnerApproval: runOpenAIRealApiTestWithProjectOwnerApproval,
    getOpenAIRealApiTestValidation: getOpenAIRealApiTestValidation,
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
