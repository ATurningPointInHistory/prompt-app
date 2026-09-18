/* ============================================================
   FILE: 18_self_development_phase6_context_policy.js
   Decision 058 Phase 6 / Purpose-Bound External AI Context Policy
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P6 = global.SELFDEVELOPMENT058Phase6VersionManifest;
  if (!namespace || !namespace.__internal || !P6) return;
  const i = namespace.__internal;
  const POLICY = i.deepFreeze({
    policyId: "SELFDEV058-PHASE6-EXTERNAL-AI-CONTEXT-POLICY",
    policyVersion: "1.0.0",
    provider: "OPENAI",
    sourceId: "SOURCE-OPENAI",
    operationId: "INTERNAL_ANALYSIS",
    purpose: "self-development-governed-reasoning",
    defaultModel: "gpt-5.6-luna",
    maxUserIntentChars: 4000,
    maxEvidenceItems: 8,
    maxEvidenceExcerptChars: 2400,
    maxTotalEvidenceChars: 12000,
    maxPromptChars: 18000,
    maxOutputTokens: 4096,
    allowedEvidenceTypes: ["REPOSITORY_FILE", "RUNTIME_EVIDENCE", "VALIDATION_EVIDENCE", "KNOWLEDGE", "ARCHITECTURE", "USER_SUPPLIED"],
    prohibitedTopLevelFields: ["repositorySnapshot", "allRepositoryFiles", "rawRepository", "secretValue", "apiKey", "password", "credential"],
    storeRequiredValue: false,
    toolsAllowed: false,
    filesAllowed: false,
    webSearchAllowed: false,
    computerUseAllowed: false,
    automaticKnowledgePromotionAllowed: false,
    automaticRepositoryMutationAllowed: false,
    repositoryWideAutomaticTransmissionAllowed: false,
    explicitProjectOwnerTransmissionApprovalRequired: true
  });

  function stableStringify(value) {
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ":" + stableStringify(value[key]); }).join(",") + "}";
    return JSON.stringify(value);
  }
  async function sha256Hex(text) {
    const value = String(text == null ? "" : text);
    if (global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function") {
      const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(value));
      return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let x = 0; x < value.length; x += 1) { h1 ^= value.charCodeAt(x); h1 = Math.imul(h1, h2) >>> 0; }
    return "fnv32-" + h1.toString(16).padStart(8, "0");
  }
  function hasSecretLikeValue(text) {
    const value = String(text == null ? "" : text);
    return /\bsk-[A-Za-z0-9_-]{12,}\b/.test(value) ||
      /\bBearer\s+[A-Za-z0-9._~+\/=-]{12,}\b/i.test(value) ||
      /(?:api[_-]?key|access[_-]?token|password|secret(?:_?value)?)\s*[:=]\s*["'][^"']{6,}["']/i.test(value) ||
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value);
  }
  function prohibitedPath(pathValue) {
    const value = String(pathValue || "").replace(/\\/g, "/").toLowerCase();
    return /(^|\/)\.env(?:\.|$)/.test(value) || /credentials?\.json$/.test(value) || /\.(?:pem|p12|pfx|key)$/.test(value);
  }
  function normalizeEvidenceItem(item, index) {
    const source = i.isPlainObject(item) ? item : {};
    const evidenceType = i.text(source.evidenceType, "").toUpperCase();
    const excerpt = String(source.excerpt == null ? "" : source.excerpt);
    const sourcePath = i.text(source.sourcePath || source.path, "");
    return {
      evidenceId: i.text(source.evidenceId, "P6-EVIDENCE-" + String(index + 1).padStart(2, "0")),
      evidenceType: evidenceType,
      sourceId: i.text(source.sourceId, sourcePath || "UNSPECIFIED"),
      sourcePath: sourcePath || null,
      locator: i.text(source.locator, "") || null,
      selectionReason: i.text(source.selectionReason, "") || null,
      excerpt: excerpt,
      excerptChars: excerpt.length,
      providedHash: i.text(source.sha256 || source.hash, "") || null
    };
  }
  function validateContextInput(input) {
    const source = i.isPlainObject(input) ? input : {};
    const errors = [];
    POLICY.prohibitedTopLevelFields.forEach(function (key) { if (Object.prototype.hasOwnProperty.call(source, key)) errors.push("PROHIBITED_FIELD:" + key); });
    const userIntent = String(source.userIntent == null ? "" : source.userIntent).trim();
    if (!userIntent) errors.push("USER_INTENT_REQUIRED");
    if (userIntent.length > POLICY.maxUserIntentChars) errors.push("USER_INTENT_TOO_LARGE");
    if (hasSecretLikeValue(userIntent)) errors.push("SECRET_LIKE_VALUE_IN_USER_INTENT");
    const rawEvidence = Array.isArray(source.evidenceItems) ? source.evidenceItems : [];
    if (rawEvidence.length > POLICY.maxEvidenceItems) errors.push("EVIDENCE_ITEM_LIMIT_EXCEEDED");
    const evidenceItems = rawEvidence.map(normalizeEvidenceItem);
    let totalEvidenceChars = 0;
    evidenceItems.forEach(function (item) {
      if (POLICY.allowedEvidenceTypes.indexOf(item.evidenceType) < 0) errors.push("EVIDENCE_TYPE_NOT_ALLOWED:" + item.evidenceId);
      if (!item.excerpt) errors.push("EVIDENCE_EXCERPT_REQUIRED:" + item.evidenceId);
      if (item.excerptChars > POLICY.maxEvidenceExcerptChars) errors.push("EVIDENCE_EXCERPT_TOO_LARGE:" + item.evidenceId);
      if (prohibitedPath(item.sourcePath)) errors.push("PROHIBITED_SENSITIVE_PATH:" + item.evidenceId);
      if (hasSecretLikeValue(item.excerpt)) errors.push("SECRET_LIKE_VALUE_IN_EVIDENCE:" + item.evidenceId);
      totalEvidenceChars += item.excerptChars;
    });
    if (totalEvidenceChars > POLICY.maxTotalEvidenceChars) errors.push("TOTAL_EVIDENCE_LIMIT_EXCEEDED");
    return { valid: errors.length === 0, errors: errors, userIntent: userIntent, evidenceItems: evidenceItems, totalEvidenceChars: totalEvidenceChars };
  }
  function buildPromptText(userIntent, evidenceItems) {
    const lines = [
      "SELF-DEVELOPMENT-058 governed external reasoning request.",
      "Purpose: analyze the supplied request and evidence only.",
      "Do not claim repository write, approval, adoption, budget, secret, or execution authority.",
      "Do not infer missing repository content. Distinguish FACT / DERIVED / CANDIDATE.",
      "Return a concise proposed analysis and, when relevant, a smallest-safe-change candidate description.",
      "",
      "USER_INTENT:", userIntent, "", "EVIDENCE:"
    ];
    evidenceItems.forEach(function (item, index) {
      lines.push("[" + (index + 1) + "] " + item.evidenceType + " | " + item.sourceId + (item.locator ? " | " + item.locator : ""));
      lines.push(item.excerpt);
    });
    return lines.join("\n");
  }
  async function buildSelfDevelopmentPhase6ContextPackage(input) {
    const validation = validateContextInput(input);
    if (!validation.valid) return i.buildResult(false, "SELFDEV058_PHASE6_CONTEXT_BLOCKED", "Blocked", { errors: validation.errors, externalTransmissionPerformed: false, secretValueTransmitted: false, repositoryWideTransmissionPerformed: false });
    const promptText = buildPromptText(validation.userIntent, validation.evidenceItems);
    if (promptText.length > POLICY.maxPromptChars) return i.buildResult(false, "SELFDEV058_PHASE6_PROMPT_LIMIT_EXCEEDED", "Blocked", { promptChars: promptText.length, maxPromptChars: POLICY.maxPromptChars, externalTransmissionPerformed: false });
    const lineage = validation.evidenceItems.map(function (item) { return { evidenceId: item.evidenceId, evidenceType: item.evidenceType, sourceId: item.sourceId, sourcePath: item.sourcePath, locator: item.locator, providedHash: item.providedHash, excerptChars: item.excerptChars }; });
    const hashMaterial = { policyId: POLICY.policyId, purpose: POLICY.purpose, userIntent: validation.userIntent, evidence: lineage.map(function (row, idx) { return Object.assign({}, row, { excerpt: validation.evidenceItems[idx].excerpt }); }) };
    const contextHash = await sha256Hex(stableStringify(hashMaterial));
    const packageValue = i.deepFreeze({
      contextPackageId: i.nextId("SELFDEV058-PHASE6-CONTEXT"),
      contextHash: contextHash,
      contextHashAlgorithm: contextHash.indexOf("fnv32-") === 0 ? "FNV32-FALLBACK" : "SHA-256",
      purpose: POLICY.purpose,
      userIntent: validation.userIntent,
      evidenceItems: validation.evidenceItems,
      evidenceLineage: lineage,
      evidenceItemCount: validation.evidenceItems.length,
      totalEvidenceChars: validation.totalEvidenceChars,
      promptText: promptText,
      promptChars: promptText.length,
      repositoryWideTransmission: false,
      secretValueIncluded: false,
      explicitEvidenceBounded: true,
      externalTransmissionPerformed: false,
      canonicalMutationPerformed: false,
      knowledgePromotionPerformed: false,
      createdAt: i.nowIso(),
      immutable: true
    });
    return i.buildResult(true, "SELFDEV058_PHASE6_CONTEXT_READY", "Ready", { contextPackage: packageValue, externalTransmissionPerformed: false, providerNetworkCallPerformed: false, authorityEffect: "none" });
  }
  function getSelfDevelopmentPhase6ExternalAiContextPolicy() { return i.clone(POLICY); }
  function validateSelfDevelopmentPhase6ContextPolicy() {
    const h = P6.hardBoundaries;
    const valid = POLICY.repositoryWideAutomaticTransmissionAllowed === false && POLICY.explicitProjectOwnerTransmissionApprovalRequired === true && P6.hardBoundaries.secretValueTransmissionAllowed === false && h.providerMayDirectlyMutateRepository === false && h.validationMayExecuteProviderNetworkCall === false;
    return { valid: valid, policyId: POLICY.policyId, policyVersion: POLICY.policyVersion, checkedAt: i.nowIso() };
  }
  Object.assign(namespace.api, { getSelfDevelopmentPhase6ExternalAiContextPolicy, validateSelfDevelopmentPhase6ContextPolicy, buildSelfDevelopmentPhase6ContextPackage });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase6ContextPolicy = { id: "SELF-DEVELOPMENT-058-PHASE6-CONTEXT-POLICY", version: P6.version, status: "Ready", repositoryWideAutomaticTransmissionAllowed: false, secretValueTransmissionAllowed: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
