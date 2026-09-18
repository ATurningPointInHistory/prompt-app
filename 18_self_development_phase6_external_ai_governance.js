/* ============================================================
   FILE: 18_self_development_phase6_external_ai_governance.js
   Decision 058 Phase 6 / Governed External AI Reasoning Bridge
   Reuses EXTERNAL-010; does not create a second provider engine.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P6 = global.SELFDEVELOPMENT058Phase6VersionManifest;
  if (!namespace || !namespace.__internal || !P6) return;
  const i = namespace.__internal;
  const PURPOSE = "self-development-governed-reasoning";
  const SOURCE_ID = "SOURCE-OPENAI";
  const OPERATION_ID = "INTERNAL_ANALYSIS";
  const EXECUTION_ACTION = "EXECUTE_EXTERNAL_ACQUISITION";
  const auditState = { records: [], maxRecords: 20, lastPrepared: null, lastExecution: null };

  function external() { return global.EXTERNAL010ExternalIntelligence || null; }
  function extractOutputText(payload) {
    const response = payload && typeof payload === "object" ? payload : {};
    if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
    const parts = [];
    (Array.isArray(response.output) ? response.output : []).forEach(function (item) {
      (item && Array.isArray(item.content) ? item.content : []).forEach(function (entry) {
        if (entry && typeof entry.text === "string") parts.push(entry.text);
        else if (entry && typeof entry.output_text === "string") parts.push(entry.output_text);
      });
    });
    return parts.join("\n").trim();
  }
  function recordAudit(eventType, data) {
    const source = i.isPlainObject(data) ? data : {};
    const record = i.deepFreeze({
      auditId: i.nextId("SELFDEV058-PHASE6-AUDIT"),
      eventType: i.text(eventType, "PHASE6_EVENT"),
      contextPackageId: source.contextPackageId || null,
      contextHash: source.contextHash || null,
      requestId: source.requestId || null,
      providerResponseId: source.providerResponseId || null,
      providerNetworkCallPerformed: source.providerNetworkCallPerformed === true,
      secretValuePersisted: false,
      rawContextPersisted: false,
      rawProviderOutputPersisted: false,
      budgetExpansionPerformed: false,
      candidateApprovalGranted: false,
      adoptionAuthorizationGranted: false,
      repositoryMutationPerformed: false,
      knowledgePromotionPerformed: false,
      authorityEffect: i.text(source.authorityEffect, "none"),
      recordedAt: i.nowIso(),
      immutable: true
    });
    auditState.records.push(record);
    if (auditState.records.length > auditState.maxRecords) auditState.records.splice(0, auditState.records.length - auditState.maxRecords);
    return i.clone(record);
  }
  function inspectSelfDevelopmentPhase6ExternalAiReadiness() {
    const ext = external();
    const finalValidation = ext && typeof ext.getOpenAIFinalValidation === "function" ? ext.getOpenAIFinalValidation() : null;
    const profile = ext && typeof ext.getOpenAIProviderIntegrationProfile === "function" ? ext.getOpenAIProviderIntegrationProfile() : null;
    const source = ext && typeof ext.getExternalIntelligenceSource === "function" ? ext.getExternalIntelligenceSource(SOURCE_ID) : null;
    const operation = ext && typeof ext.getExternalIntelligenceSourceOperationContract === "function" ? ext.getExternalIntelligenceSourceOperationContract(SOURCE_ID, OPERATION_ID) : null;
    const usage = ext && typeof ext.checkExternalIntelligenceUsagePolicy === "function" ? ext.checkExternalIntelligenceUsagePolicy({ sourceId: SOURCE_ID, operation: OPERATION_ID }) : null;
    const secret = source && ext && typeof ext.validateExternalIntelligenceSecretReference === "function" ? ext.validateExternalIntelligenceSecretReference({ secretReferenceId: source.secretReferenceId }) : null;
    const finalReady = Boolean(finalValidation && finalValidation.passed === true && finalValidation.state === "FINAL_VALIDATED" && finalValidation.readiness === "OPENAI_API_INTEGRATION_READY");
    const sourceReady = Boolean(source && source.lifecycleState === "ACTIVE" && source.enabled === true && source.paidActivationPolicy);
    const operationReady = Boolean(operation && operation.enabled === true && operation.method === "POST" && operation.bodyPolicy && operation.bodyPolicy.fixedFields && operation.bodyPolicy.fixedFields.store === false);
    return {
      externalComponentAvailable: Boolean(ext),
      openAIFinalValidated: finalReady,
      sourceReady: sourceReady,
      operationReady: operationReady,
      usagePolicyReady: Boolean(usage && usage.ok === true),
      secretReferenceReady: Boolean(secret && secret.ok === true),
      sourceId: SOURCE_ID,
      operationId: OPERATION_ID,
      provider: profile && profile.provider || "OPENAI",
      storeFalseEnforced: Boolean(profile && profile.storeRequiredValue === false && operationReady),
      noPerRequestHumanApprovalInsideProviderScope: Boolean(profile && profile.noPerRequestHumanApprovalInsideApprovedScope === true),
      phase6StillRequiresExplicitExternalTransmissionApproval: true,
      repositoryWideAutomaticExternalTransmissionAllowed: false,
      providerNetworkCallPerformed: false,
      secretValueReturned: false,
      budgetExpansionPerformed: false,
      authorityExpansionPerformed: false,
      canonicalMutationPerformed: false,
      readiness: finalReady && sourceReady && operationReady && usage && usage.ok === true && secret && secret.ok === true ? "PHASE6_EXTERNAL_AI_READY" : "PHASE6_EXTERNAL_AI_NOT_READY",
      inspectedAt: i.nowIso(),
      immutable: true
    };
  }
  function resolveExecutionSettings(ext, settings) {
    const policy = namespace.getSelfDevelopmentPhase6ExternalAiContextPolicy();
    const source = typeof ext.getExternalIntelligenceSource === "function" ? ext.getExternalIntelligenceSource(SOURCE_ID) : null;
    const paid = source && source.paidActivationPolicy || {};
    return {
      model: i.text(settings.model, policy.defaultModel),
      maxOutputTokens: Math.max(1, Math.min(Number.isInteger(Number(settings.maxOutputTokens)) ? Number(settings.maxOutputTokens) : 2048, policy.maxOutputTokens)),
      reasoningEffort: i.text(settings.reasoningEffort, ""),
      budgetIds: i.unique(Array.isArray(settings.budgetIds) && settings.budgetIds.length ? settings.budgetIds : paid.budgetIds || []),
      perRequestHardCapUsd: Number(settings.perRequestHardCapUsd || paid.perRequestHardCapUsd || 0),
      source: source
    };
  }
  async function prepareSelfDevelopmentPhase6ExternalAiReasoning(input) {
    const settings = i.isPlainObject(input) ? input : {};
    const ext = external();
    if (!ext) return i.buildResult(false, "SELFDEV058_PHASE6_EXTERNAL_COMPONENT_REQUIRED", "Blocked", { providerNetworkCallPerformed: false });
    const readiness = inspectSelfDevelopmentPhase6ExternalAiReadiness();
    if (readiness.readiness !== "PHASE6_EXTERNAL_AI_READY") return i.buildResult(false, "SELFDEV058_PHASE6_EXTERNAL_AI_NOT_READY", "Blocked", { readiness: readiness, providerNetworkCallPerformed: false });
    if (typeof namespace.buildSelfDevelopmentPhase6ContextPackage !== "function") return i.buildResult(false, "SELFDEV058_PHASE6_CONTEXT_POLICY_REQUIRED", "Blocked", { providerNetworkCallPerformed: false });
    const context = await namespace.buildSelfDevelopmentPhase6ContextPackage(settings);
    if (!context || context.ok !== true) return context;
    const execution = resolveExecutionSettings(ext, settings);
    if (!Number.isFinite(execution.perRequestHardCapUsd) || execution.perRequestHardCapUsd <= 0 || !execution.budgetIds.length) return i.buildResult(false, "SELFDEV058_PHASE6_BOUNDED_BUDGET_REQUIRED", "Blocked", { budgetIds: execution.budgetIds, perRequestHardCapUsd: execution.perRequestHardCapUsd || null, budgetExpansionPerformed: false, providerNetworkCallPerformed: false });
    if (typeof ext.prepareOpenAIResponsesRequest !== "function") return i.buildResult(false, "SELFDEV058_PHASE6_OPENAI_PREPARE_API_REQUIRED", "Blocked", { providerNetworkCallPerformed: false });
    const body = {
      model: execution.model,
      input: context.data.contextPackage.promptText,
      store: false,
      max_output_tokens: execution.maxOutputTokens,
      instructions: "Act only as an evidence-grounded reasoning provider. Treat all output as a proposal candidate. Never claim approval, adoption, repository mutation, budget, secret, or execution authority. Do not infer missing repository content."
    };
    if (execution.reasoningEffort) body.reasoning = { effort: execution.reasoningEffort };
    const prepared = ext.prepareOpenAIResponsesRequest({ body: body, perRequestHardCapUsd: execution.perRequestHardCapUsd, budgetIds: execution.budgetIds, purpose: PURPOSE, requestedBy: "SELF-DEVELOPMENT-058 / Phase 6", timeoutMs: 60000 });
    if (!prepared || prepared.ok !== true) return i.buildResult(false, "SELFDEV058_PHASE6_PROVIDER_REQUEST_PREPARATION_BLOCKED", "Blocked", { provider: prepared || null, contextPackageId: context.data.contextPackage.contextPackageId, providerNetworkCallPerformed: false, budgetExpansionPerformed: false });
    const value = {
      contextPackage: context.data.contextPackage,
      requestCandidate: prepared.data.requestCandidate,
      costEstimate: prepared.data.costEstimate,
      model: execution.model,
      budgetIds: execution.budgetIds,
      perRequestHardCapUsd: execution.perRequestHardCapUsd,
      explicitProjectOwnerTransmissionApprovalRequired: true,
      externalTransmissionPerformed: false,
      providerNetworkCallPerformed: false,
      secretValueTransmittedBySelfDevelopment: false,
      budgetExpansionPerformed: false,
      candidateApprovalGranted: false,
      adoptionAuthorizationGranted: false,
      repositoryMutationPerformed: false,
      knowledgePromotionPerformed: false,
      authorityEffect: "none"
    };
    auditState.lastPrepared = i.clone(value);
    recordAudit("PHASE6_EXTERNAL_AI_REQUEST_PREPARED", { contextPackageId: value.contextPackage.contextPackageId, contextHash: value.contextPackage.contextHash, authorityEffect: "none" });
    return i.buildResult(true, "SELFDEV058_PHASE6_EXTERNAL_AI_REQUEST_READY", "Review Ready", value);
  }
  async function executeSelfDevelopmentPhase6ExternalAiReasoning(input) {
    const settings = i.isPlainObject(input) ? input : {};
    if (settings.projectOwnerConfirmed !== true || settings.ownerInteractionTrusted !== true || settings.externalTransmissionApproved !== true || !i.text(settings.interactionEvidenceId, "")) {
      return i.buildResult(false, "SELFDEV058_PHASE6_EXTERNAL_TRANSMISSION_PROJECT_OWNER_APPROVAL_REQUIRED", "Blocked", { externalTransmissionPerformed: false, providerNetworkCallPerformed: false, authorityGranted: false });
    }
    const ext = external();
    if (!ext) return i.buildResult(false, "SELFDEV058_PHASE6_EXTERNAL_COMPONENT_REQUIRED", "Blocked", { providerNetworkCallPerformed: false });
    const prepared = await prepareSelfDevelopmentPhase6ExternalAiReasoning(settings);
    if (!prepared || prepared.ok !== true) return prepared;
    const required = ["setExternalIntelligenceAuthorityApprovalAdapter", "createExternalIntelligenceAuthorityEnvelopeCandidate", "activateExternalIntelligenceAuthorityEnvelope", "revokeExternalIntelligenceAuthorityEnvelope", "submitExternalIntelligenceAcquisition"];
    const missing = required.filter(function (name) { return typeof ext[name] !== "function"; });
    if (missing.length) return i.buildResult(false, "SELFDEV058_PHASE6_EXTERNAL_AUTHORITY_API_UNAVAILABLE", "Blocked", { missing: missing, providerNetworkCallPerformed: false });
    const interactionEvidenceId = i.text(settings.interactionEvidenceId, "");
    const requestId = i.nextId("SELFDEV058-PHASE6-EXTERNAL-AI");
    const requestInput = Object.assign({}, i.clone(prepared.data.requestCandidate), { requestId: requestId, purpose: PURPOSE, requestedBy: "SELF-DEVELOPMENT-058 / Project Owner", executionPreference: "IMMEDIATE", idempotencyKey: null });
    let authorityEnvelopeId = null, authorityActivated = false;
    const adapter = {
      adapterId: "SELFDEV058-PHASE6-EXTERNAL-TRANSMISSION-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval(context) {
        const envelope = context && context.envelope || {}, approval = context && context.approvalInput || {}, target = envelope.target || {};
        const exact = envelope.action === EXECUTION_ACTION && target.type === "external-acquisition" && target.id === requestId && envelope.purpose === PURPOSE;
        const explicit = approval.projectOwnerConfirmed === true && approval.ownerInteractionTrusted === true && approval.externalTransmissionApproved === true && i.text(approval.interactionEvidenceId, "") === interactionEvidenceId;
        return { approved: exact && explicit, actorType: "Project Owner", interactionEvidenceId: exact && explicit ? interactionEvidenceId : "" };
      }
    };
    try {
      const adapterResult = ext.setExternalIntelligenceAuthorityApprovalAdapter(adapter);
      if (!adapterResult || adapterResult.ok !== true) return i.buildResult(false, "SELFDEV058_PHASE6_APPROVAL_ADAPTER_FAILED", "Blocked", { providerNetworkCallPerformed: false });
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const candidate = ext.createExternalIntelligenceAuthorityEnvelopeCandidate({ action: EXECUTION_ACTION, target: { type: "external-acquisition", id: requestId }, purpose: PURPOSE, expiresAt: expiresAt, scope: { domain: "SELF-DEVELOPMENT-058", operation: OPERATION_ID, constraints: { sourceId: SOURCE_ID, requestId: requestId, contextHash: prepared.data.contextPackage.contextHash, budgetIds: i.clone(prepared.data.budgetIds), maximumEstimatedCostUsd: prepared.data.costEstimate.maximumEstimatedCostUsd, perRequestHardCapUsd: prepared.data.perRequestHardCapUsd, oneTimeReasoningRequest: true } } });
      authorityEnvelopeId = candidate && candidate.data && candidate.data.envelope && candidate.data.envelope.authorityEnvelopeId || null;
      if (!candidate || candidate.ok !== true || !authorityEnvelopeId) return i.buildResult(false, "SELFDEV058_PHASE6_AUTHORITY_CANDIDATE_FAILED", "Blocked", { authorityCandidate: candidate || null, providerNetworkCallPerformed: false });
      const activation = await ext.activateExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, { projectOwnerConfirmed: true, ownerInteractionTrusted: true, externalTransmissionApproved: true, interactionEvidenceId: interactionEvidenceId });
      if (!activation || activation.ok !== true) return i.buildResult(false, "SELFDEV058_PHASE6_AUTHORITY_ACTIVATION_FAILED", "Blocked", { activation: activation || null, providerNetworkCallPerformed: false });
      authorityActivated = true;
      const execution = await ext.submitExternalIntelligenceAcquisition(requestInput);
      if (!execution || execution.ok !== true) {
        recordAudit("PHASE6_EXTERNAL_AI_EXECUTION_FAILED", { contextPackageId: prepared.data.contextPackage.contextPackageId, contextHash: prepared.data.contextPackage.contextHash, requestId: requestId, providerNetworkCallPerformed: true, authorityEffect: "one-time-external-transmission" });
        return i.buildResult(false, "SELFDEV058_PHASE6_EXTERNAL_AI_EXECUTION_FAILED", "Failed", { requestId: requestId, execution: execution || null, externalTransmissionPerformed: true, providerNetworkCallPerformed: true, repositoryMutationPerformed: false, knowledgePromotionPerformed: false });
      }
      const response = execution.data && execution.data.response || {};
      const payload = response && response.payload && typeof response.payload === "object" ? response.payload : {};
      const outputText = extractOutputText(payload);
      const result = {
        reasoningCandidateId: i.nextId("SELFDEV058-PHASE6-REASONING-CANDIDATE"),
        requestId: requestId,
        contextPackageId: prepared.data.contextPackage.contextPackageId,
        contextHash: prepared.data.contextPackage.contextHash,
        sourceId: SOURCE_ID,
        operationId: OPERATION_ID,
        modelRequested: prepared.data.model,
        modelReported: i.text(payload.model, "") || prepared.data.model,
        providerResponseId: i.text(payload.id, "") || null,
        responseId: response.responseId || null,
        outputText: outputText,
        outputClassification: "AI_PROPOSAL_CANDIDATE_ONLY",
        evidenceGroundedContextRequired: true,
        providerNetworkCallPerformed: true,
        externalTransmissionPerformed: true,
        usageReconciliation: execution.data && execution.data.usageReconciliation || null,
        candidateApprovalGranted: false,
        adoptionAuthorizationGranted: false,
        mutationAuthorityGranted: false,
        repositoryMutationPerformed: false,
        knowledgePromotionPerformed: false,
        validationEqualsApproval: false,
        authorityEffect: "reasoning-output-only",
        createdAt: i.nowIso(),
        immutable: true
      };
      auditState.lastExecution = i.clone(result);
      recordAudit("PHASE6_EXTERNAL_AI_REASONING_COMPLETED", { contextPackageId: result.contextPackageId, contextHash: result.contextHash, requestId: requestId, providerResponseId: result.providerResponseId, providerNetworkCallPerformed: true, authorityEffect: result.authorityEffect });
      return i.buildResult(true, "SELFDEV058_PHASE6_EXTERNAL_AI_REASONING_CANDIDATE_READY", "Candidate", result);
    } finally {
      if (authorityEnvelopeId) { try { ext.revokeExternalIntelligenceAuthorityEnvelope(authorityEnvelopeId, authorityActivated ? "Phase 6 one-time external reasoning completed or ended" : "Phase 6 external reasoning approval flow ended"); } catch (_) {} }
      try { ext.setExternalIntelligenceAuthorityApprovalAdapter(null); } catch (_) {}
    }
  }
  function buildSelfDevelopmentPhase6ReasoningHandoff(input) {
    const source = i.isPlainObject(input) ? input : {};
    if (source.outputClassification !== "AI_PROPOSAL_CANDIDATE_ONLY" || !source.reasoningCandidateId || !source.contextHash) return i.buildResult(false, "SELFDEV058_PHASE6_REASONING_HANDOFF_INVALID", "Blocked", { patchGenerated: false, approvalGranted: false });
    return i.buildResult(true, "SELFDEV058_PHASE6_REASONING_HANDOFF_READY", "Candidate", {
      handoffId: i.nextId("SELFDEV058-PHASE6-HANDOFF"),
      target: "SELF-DEVELOPMENT-058_CANDIDATE_REVIEW_THEN_IDE-150",
      reasoningCandidateId: source.reasoningCandidateId,
      contextHash: source.contextHash,
      outputText: String(source.outputText || ""),
      patchGenerated: false,
      candidateApprovalGranted: false,
      adoptionAuthorizationGranted: false,
      mutationAuthorityGranted: false,
      repositoryMutationPerformed: false,
      authorityEffect: "none",
      createdAt: i.nowIso(),
      immutable: true
    });
  }
  function getSelfDevelopmentPhase6ExternalAiAuditStatus() {
    return { recordCount: auditState.records.length, maxRecords: auditState.maxRecords, bounded: true, rawContextPersisted: false, rawProviderOutputPersisted: false, secretValuePersisted: false, records: i.clone(auditState.records), lastPrepared: auditState.lastPrepared ? { contextPackageId: auditState.lastPrepared.contextPackage.contextPackageId, contextHash: auditState.lastPrepared.contextPackage.contextHash } : null, lastExecution: auditState.lastExecution ? { reasoningCandidateId: auditState.lastExecution.reasoningCandidateId, requestId: auditState.lastExecution.requestId, contextHash: auditState.lastExecution.contextHash, providerResponseId: auditState.lastExecution.providerResponseId } : null };
  }
  Object.assign(namespace.api, { inspectSelfDevelopmentPhase6ExternalAiReadiness, prepareSelfDevelopmentPhase6ExternalAiReasoning, executeSelfDevelopmentPhase6ExternalAiReasoning, buildSelfDevelopmentPhase6ReasoningHandoff, getSelfDevelopmentPhase6ExternalAiAuditStatus });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase6ExternalAiGovernance = { id: "SELF-DEVELOPMENT-058-PHASE6-EXTERNAL-AI-GOVERNANCE", version: P6.version, status: "Ready", reusesExternal010: true, secondProviderEngineCreated: false, directRepositoryMutationAllowed: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
