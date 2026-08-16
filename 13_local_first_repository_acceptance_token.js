/* ============================================================
   FILE: 13_local_first_repository_acceptance_token.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.9.0 / Module: Acceptance Token 1.0.0
   Phase 10: Manual Acceptance Token / Authority Gate
   Decision-005: Acceptance Token + Controlled Transaction
                 + Policy-Constrained Delegated Acceptance
   IMPORTANT: Phase 10 issues/validates Manual Acceptance Tokens only.
              No Canonical mutation, no transaction execution, no V5.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Acceptance Token blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("acceptanceToken");
  const TOKEN_TTL_MS = 15 * 60 * 1000;
  const TOKEN_TTL_SECONDS = 15 * 60;
  const ACCEPTED_BY = "Project Owner";
  const ACCEPTANCE_MODE = "MANUAL";

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function mapKey(key) {
      return JSON.stringify(key) + ":" + stableStringify(value[key]);
    }).join(",") + "}";
  }

  async function sha256(text) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") {
      throw new Error("WebCrypto SHA-256 is required for Acceptance Token binding.");
    }
    const bytes = new TextEncoder().encode(String(text));
    const digest = await global.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function toHex(value) {
      return value.toString(16).padStart(2, "0");
    }).join("");
  }

  function normalizeMutationSet(value) {
    if (!Array.isArray(value)) return null;
    return value.map(function cloneItem(item) {
      if (item == null || typeof item === "string" || typeof item === "number" || typeof item === "boolean") return item;
      return internal.clone(item);
    });
  }

  function sameMutationSet(left, right) {
    return stableStringify(Array.isArray(left) ? left : []) === stableStringify(Array.isArray(right) ? right : []);
  }

  function getTokenRecord(tokenOrId) {
    if (internal.isPlainObject(tokenOrId)) return internal.clone(tokenOrId);
    const id = internal.text(tokenOrId, "");
    if (!id || typeof namespace.getAcceptanceTokenDescriptor !== "function") return null;
    return namespace.getAcceptanceTokenDescriptor(id);
  }

  function currentLineageForV4(v4EvidenceOrId) {
    const requestedV4Id = internal.text(v4EvidenceOrId, "");
    let v4 = internal.isPlainObject(v4EvidenceOrId)
      ? internal.clone(v4EvidenceOrId)
      : (typeof namespace.getV4TargetValidationEvidenceDescriptor === "function"
          ? namespace.getV4TargetValidationEvidenceDescriptor(requestedV4Id)
          : null);
    if (!v4 && state.lastV4TargetValidationEvidence && (!requestedV4Id || state.lastV4TargetValidationEvidence.v4EvidenceId === requestedV4Id)) {
      v4 = internal.clone(state.lastV4TargetValidationEvidence);
    }
    const baseline = internal.clone(state.lastCanonicalBaseline || null);
    const v3 = internal.clone(state.lastV3ConflictEvidence || null);
    const receipt = internal.clone(state.lastV2TransferReceipt || null);
    const envelope = internal.clone(state.lastV2TransferEnvelope || null);
    const pkg = envelope && internal.isPlainObject(envelope.transferPackage) ? envelope.transferPackage : null;
    return { v4: v4, baseline: baseline, v3: v3, receipt: receipt, envelope: envelope, transferPackage: pkg };
  }

  function validateManualAcceptancePrerequisites(lineage) {
    const failures = [];
    const v4 = lineage && lineage.v4;
    const baseline = lineage && lineage.baseline;
    const v3 = lineage && lineage.v3;
    const receipt = lineage && lineage.receipt;
    const pkg = lineage && lineage.transferPackage;

    if (!v4) failures.push("v4-evidence-missing");
    if (!baseline) failures.push("canonical-baseline-missing");
    if (!v3) failures.push("v3-evidence-missing");
    if (!receipt) failures.push("v2-receipt-missing");
    if (!pkg) failures.push("transfer-package-missing");
    if (failures.length) return { valid: false, failures: failures };

    const v4Validation = namespace.validateContract("v4TargetValidationEvidenceDescriptor", v4);
    const baselineValidation = namespace.validateContract("canonicalBaselineDescriptor", baseline);
    const v3Validation = namespace.validateContract("v3ConflictEvidenceDescriptor", v3);
    const receiptValidation = namespace.validateContract("v2TransferReceiptDescriptor", receipt);
    if (!v4Validation.valid) failures.push("v4-contract-invalid");
    if (!baselineValidation.valid) failures.push("baseline-contract-invalid");
    if (!v3Validation.valid) failures.push("v3-contract-invalid");
    if (!receiptValidation.valid) failures.push("v2-receipt-contract-invalid");

    if (v4.v4TargetEnvironmentValidated !== true || v4.targetEnvironmentMatch !== true || v4.blockingTargetDrift === true) failures.push("v4-target-not-stable");
    if (v4.integrityVerified !== true || v4.manifestHashMatch !== true || v4.scriptSetHashMatch !== true || v4.scriptCountMatch !== true) failures.push("v4-integrity-not-verified");
    if (v3.baseRevisionMatch !== true || v3.conflictDetected === true || v3.blockingConflict === true || v3.resolutionStatus !== "not-required") failures.push("v3-base-conflict-not-cleared");
    if (receipt.v2TransferIntegrityValidated !== true) failures.push("v2-integrity-not-validated");
    if (baseline.explicitlyEstablished !== true || baseline.establishedBy !== "Project Owner" || baseline.integrityStatus !== "verified") failures.push("canonical-baseline-not-explicit");

    if (v4.v3ConflictEvidenceId !== v3.conflictEvidenceId) failures.push("v4-v3-lineage-mismatch");
    if (v4.v3GateId !== v3.v3GateId) failures.push("v4-v3-gate-mismatch");
    if (v4.receiptId !== receipt.receiptId || v3.receiptId !== receipt.receiptId) failures.push("receipt-lineage-mismatch");
    if (v4.transferPackageId !== receipt.transferPackageId || v3.transferPackageId !== receipt.transferPackageId || pkg.transferPackageId !== receipt.transferPackageId) failures.push("transfer-package-lineage-mismatch");
    if (v4.projectId !== baseline.projectId || v4.repositoryId !== baseline.repositoryId || receipt.projectId !== baseline.projectId || receipt.repositoryId !== baseline.repositoryId) failures.push("repository-identity-mismatch");
    if (v4.targetNodeId !== baseline.sourceNodeId || receipt.targetNodeId !== baseline.sourceNodeId) failures.push("target-node-mismatch");
    if (v4.canonicalRevisionId !== baseline.canonicalRevisionId || v4.candidateBaseRevisionId !== baseline.canonicalRevisionId || receipt.baseRevisionId !== baseline.canonicalRevisionId || pkg.baseRevisionId !== baseline.canonicalRevisionId) failures.push("canonical-revision-binding-mismatch");
    if (v4.candidateRevisionId !== receipt.revisionId || pkg.revisionId !== receipt.revisionId) failures.push("candidate-revision-binding-mismatch");
    if (v4.sourceNodeId !== receipt.sourceNodeId || pkg.sourceNodeId !== receipt.sourceNodeId) failures.push("source-node-binding-mismatch");
    if (!internal.text(pkg.syncCandidateId, "")) failures.push("candidate-id-missing");
    if (pkg.integrityPreflightPassed !== true || pkg.integrityPreflightStatus !== "verified") failures.push("candidate-integrity-preflight-not-verified");
    if (receipt.packageHash !== receipt.receiverCalculatedPackageHash || receipt.packageHash !== pkg.packageHash) failures.push("package-hash-binding-mismatch");

    return {
      valid: failures.length === 0,
      failures: failures,
      v4Validation: v4Validation,
      baselineValidation: baselineValidation,
      v3Validation: v3Validation,
      receiptValidation: receiptValidation
    };
  }

  function tokenIsActive(token, nowMs) {
    if (!token) return false;
    const current = Number.isFinite(nowMs) ? nowMs : Date.now();
    const expires = Date.parse(token.expiresAt || "");
    if (!Number.isFinite(expires) || current >= expires) return false;
    if (state.acceptanceTokenConsumptionRecords instanceof Map && state.acceptanceTokenConsumptionRecords.has(token.acceptanceTokenId)) return false;
    if (state.acceptanceTokenRevocationRecords instanceof Map && state.acceptanceTokenRevocationRecords.has(token.acceptanceTokenId)) return false;
    return token.consumedAt == null && token.revokedAt == null && token.tokenStatus === "issued";
  }

  function findActiveTokenForV4(v4EvidenceId, nowMs) {
    if (!(state.acceptanceTokenDescriptors instanceof Map)) return null;
    let found = null;
    state.acceptanceTokenDescriptors.forEach(function each(token) {
      if (!found && token.v4EvidenceId === v4EvidenceId && tokenIsActive(token, nowMs)) found = internal.clone(token);
    });
    return found;
  }

  async function issueManualAcceptanceToken(input) {
    const source = internal.isPlainObject(input) ? input : {};
    if (source.explicitProjectOwnerAction !== true) {
      return internal.buildResult(false, "REPOSITORY010_MANUAL_ACCEPTANCE_EXPLICIT_ACTION_REQUIRED", "Blocked", null);
    }
    if (internal.text(source.acceptedBy, "") !== ACCEPTED_BY) {
      return internal.buildResult(false, "REPOSITORY010_MANUAL_ACCEPTANCE_PROJECT_OWNER_REQUIRED", "Blocked", null);
    }
    if (!Array.isArray(source.allowedMutationSet)) {
      return internal.buildResult(false, "REPOSITORY010_ACCEPTANCE_MUTATION_SET_REQUIRED", "Blocked", {
        requirement: "allowedMutationSet must be explicitly supplied; Phase 10 real authority-gate validation uses an empty array and authorizes no Canonical mutation."
      });
    }

    const lineage = currentLineageForV4(source.v4EvidenceId || state.lastV4TargetValidationEvidence);
    const prerequisite = validateManualAcceptancePrerequisites(lineage);
    if (!prerequisite.valid) {
      state.acceptanceStatus = "Blocked";
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_MANUAL_ACCEPTANCE_PREREQUISITES_BLOCKED", "Blocked", {
        failures: prerequisite.failures,
        v4EvidenceId: lineage.v4 && lineage.v4.v4EvidenceId || null
      });
    }

    const v4 = lineage.v4;
    const baseline = lineage.baseline;
    const receipt = lineage.receipt;
    const pkg = lineage.transferPackage;
    const allowedMutationSet = normalizeMutationSet(source.allowedMutationSet);
    const nowMs = Date.now();
    const existing = findActiveTokenForV4(v4.v4EvidenceId, nowMs);
    if (existing) {
      return internal.buildResult(false, "REPOSITORY010_ACTIVE_ACCEPTANCE_TOKEN_EXISTS", "Blocked", {
        acceptanceTokenId: existing.acceptanceTokenId,
        expiresAt: existing.expiresAt,
        v4EvidenceId: existing.v4EvidenceId
      });
    }

    const issuedAt = internal.nowIso();
    const expiresAt = new Date(Date.parse(issuedAt) + TOKEN_TTL_MS).toISOString();
    const acceptanceTokenId = internal.text(source.acceptanceTokenId, internal.nextId("REPOSITORY010-ACCEPTANCE-TOKEN"));
    const bindingPayload = {
      acceptanceMode: ACCEPTANCE_MODE,
      candidateId: pkg.syncCandidateId,
      candidateRevisionId: v4.candidateRevisionId,
      baseRevisionId: v4.candidateBaseRevisionId,
      targetNodeId: v4.targetNodeId,
      canonicalRevisionId: baseline.canonicalRevisionId,
      v4EvidenceId: v4.v4EvidenceId,
      transferPackageId: v4.transferPackageId,
      receiptId: receipt.receiptId,
      packageHash: receipt.packageHash,
      allowedMutationSet: allowedMutationSet
    };

    let bindingHash;
    try {
      bindingHash = await sha256(stableStringify(bindingPayload));
    } catch (error) {
      return internal.buildResult(false, "REPOSITORY010_ACCEPTANCE_BINDING_HASH_FAILED", "Blocked", null, {
        error: { message: error && error.message ? error.message : String(error), category: "Integrity" }
      });
    }

    const created = namespace.createAcceptanceTokenDescriptor({
      acceptanceTokenId: acceptanceTokenId,
      acceptanceMode: ACCEPTANCE_MODE,
      candidateId: pkg.syncCandidateId,
      candidateRevisionId: v4.candidateRevisionId,
      baseRevisionId: v4.candidateBaseRevisionId,
      targetNodeId: v4.targetNodeId,
      canonicalRevisionId: baseline.canonicalRevisionId,
      v4EvidenceId: v4.v4EvidenceId,
      transferPackageId: v4.transferPackageId,
      receiptId: receipt.receiptId,
      packageHash: receipt.packageHash,
      allowedMutationSet: allowedMutationSet,
      mutationScopeMode: "explicit",
      policyId: null,
      policyVersion: null,
      delegatedBy: null,
      acceptedBy: ACCEPTED_BY,
      issuerIdentity: ACCEPTED_BY,
      explicitProjectOwnerAction: true,
      tokenTtlSeconds: TOKEN_TTL_SECONDS,
      issuedAt: issuedAt,
      expiresAt: expiresAt,
      oneTimeUse: true,
      consumedAt: null,
      revokedAt: null,
      tokenStatus: "issued",
      bindingHash: bindingHash
    });
    if (!created || created.ok !== true) return created;

    const token = created.data.record;
    state.lastAcceptanceToken = internal.clone(token);
    state.acceptanceStatus = "Manual Token Issued";
    internal.touch();
    namespace.modules.acceptanceToken.status = "Manual Token Issued";

    return internal.buildResult(true, "REPOSITORY010_MANUAL_ACCEPTANCE_TOKEN_ISSUED", "Accepted", {
      acceptanceToken: internal.clone(token),
      tokenTtlMinutes: 15,
      validUntil: token.expiresAt,
      validForControlledTransactionStart: true,
      tokenItselfGrantsMutationAuthority: false,
      controlledTransactionImplemented: false,
      canonicalMutationPerformed: false,
      delegatedAcceptanceEnabled: false,
      v5PostReflectionVerified: false,
      syncEngineInvoked: false,
      authorityEffect: "acceptance-token-only"
    });
  }

  async function validateAcceptanceToken(tokenOrId, expectedBindings, options) {
    const token = getTokenRecord(tokenOrId);
    const expected = internal.isPlainObject(expectedBindings) ? expectedBindings : {};
    const opts = internal.isPlainObject(options) ? options : {};
    if (!token) return internal.buildResult(false, "REPOSITORY010_ACCEPTANCE_TOKEN_REQUIRED", "Blocked", null);

    const contract = namespace.validateContract("acceptanceTokenDescriptor", token);
    const reasons = [];
    if (!contract.valid) reasons.push("token-contract-invalid");
    if (token.acceptanceMode !== ACCEPTANCE_MODE) reasons.push("acceptance-mode-not-manual-phase10");
    if (token.acceptedBy !== ACCEPTED_BY || token.issuerIdentity !== ACCEPTED_BY || token.explicitProjectOwnerAction !== true) reasons.push("project-owner-binding-invalid");
    if (token.oneTimeUse !== true) reasons.push("one-time-use-required");
    if (Number(token.tokenTtlSeconds) !== TOKEN_TTL_SECONDS) reasons.push("token-ttl-invalid");
    if (token.validationIsApproval !== false) reasons.push("validation-approval-boundary-invalid");
    if (token.explicitAcceptanceGranted !== true) reasons.push("explicit-acceptance-missing");
    if (token.mutationAuthorityGranted !== false || token.canonicalMutationPerformed !== false || token.controlledTransactionStarted !== false) reasons.push("mutation-boundary-violated");

    const bindingPayload = {
      acceptanceMode: token.acceptanceMode,
      candidateId: token.candidateId,
      candidateRevisionId: token.candidateRevisionId,
      baseRevisionId: token.baseRevisionId,
      targetNodeId: token.targetNodeId,
      canonicalRevisionId: token.canonicalRevisionId,
      v4EvidenceId: token.v4EvidenceId,
      transferPackageId: token.transferPackageId,
      receiptId: token.receiptId,
      packageHash: token.packageHash,
      allowedMutationSet: Array.isArray(token.allowedMutationSet) ? token.allowedMutationSet : []
    };
    try {
      const calculatedBindingHash = await sha256(stableStringify(bindingPayload));
      if (!/^[a-f0-9]{64}$/.test(String(token.bindingHash || "")) || calculatedBindingHash !== token.bindingHash) reasons.push("binding-hash-mismatch");
    } catch (_) {
      reasons.push("binding-hash-validation-failed");
    }

    const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
    const issuedMs = Date.parse(token.issuedAt || "");
    const expiresMs = Date.parse(token.expiresAt || "");
    if (!Number.isFinite(issuedMs) || !Number.isFinite(expiresMs) || expiresMs - issuedMs !== TOKEN_TTL_MS) reasons.push("token-expiry-window-invalid");
    if (Number.isFinite(expiresMs) && nowMs >= expiresMs) reasons.push("token-expired");
    if (state.acceptanceTokenConsumptionRecords instanceof Map && state.acceptanceTokenConsumptionRecords.has(token.acceptanceTokenId)) reasons.push("token-already-consumed");
    if (state.acceptanceTokenRevocationRecords instanceof Map && state.acceptanceTokenRevocationRecords.has(token.acceptanceTokenId)) reasons.push("token-revoked");
    if (token.consumedAt != null) reasons.push("token-consumed-at-present");
    if (token.revokedAt != null) reasons.push("token-revoked-at-present");

    ["candidateId", "candidateRevisionId", "baseRevisionId", "targetNodeId", "canonicalRevisionId", "v4EvidenceId", "transferPackageId", "receiptId", "packageHash"].forEach(function compare(key) {
      if (Object.prototype.hasOwnProperty.call(expected, key) && internal.text(expected[key], "") !== internal.text(token[key], "")) reasons.push(key + "-mismatch");
    });
    if (Object.prototype.hasOwnProperty.call(expected, "allowedMutationSet") && !sameMutationSet(expected.allowedMutationSet, token.allowedMutationSet)) reasons.push("allowed-mutation-set-mismatch");

    if (opts.requireCurrentLineage !== false) {
      const lineage = currentLineageForV4(token.v4EvidenceId);
      const prerequisite = validateManualAcceptancePrerequisites(lineage);
      if (!prerequisite.valid) {
        prerequisite.failures.forEach(function add(item) { reasons.push("current-lineage:" + item); });
      } else {
        const v4 = lineage.v4;
        const baseline = lineage.baseline;
        const receipt = lineage.receipt;
        const pkg = lineage.transferPackage;
        if (token.candidateId !== pkg.syncCandidateId) reasons.push("current-candidate-id-mismatch");
        if (token.candidateRevisionId !== v4.candidateRevisionId) reasons.push("current-candidate-revision-mismatch");
        if (token.baseRevisionId !== v4.candidateBaseRevisionId) reasons.push("current-base-revision-mismatch");
        if (token.targetNodeId !== v4.targetNodeId) reasons.push("current-target-node-mismatch");
        if (token.canonicalRevisionId !== baseline.canonicalRevisionId) reasons.push("current-canonical-revision-mismatch");
        if (token.transferPackageId !== receipt.transferPackageId) reasons.push("current-transfer-package-mismatch");
        if (token.receiptId !== receipt.receiptId) reasons.push("current-receipt-mismatch");
        if (token.packageHash !== receipt.packageHash) reasons.push("current-package-hash-mismatch");
      }
    }

    const valid = reasons.length === 0;
    return internal.buildResult(valid,
      valid ? "REPOSITORY010_ACCEPTANCE_TOKEN_VALID" : "REPOSITORY010_ACCEPTANCE_TOKEN_BLOCKED",
      valid ? "Valid" : "Blocked",
      {
        acceptanceTokenId: token.acceptanceTokenId,
        acceptanceMode: token.acceptanceMode,
        validForControlledTransactionStart: valid,
        reasons: reasons,
        expiresAt: token.expiresAt,
        oneTimeUse: token.oneTimeUse === true,
        validationIsApproval: false,
        explicitAcceptanceGranted: token.explicitAcceptanceGranted === true,
        mutationAuthorityGranted: false,
        canonicalMutationPerformed: false,
        controlledTransactionImplemented: false,
        delegatedAcceptanceEnabled: false,
        authorityEffect: "acceptance-token-only"
      }
    );
  }

  function getAcceptanceTokenStatus() {
    const token = state.lastAcceptanceToken || null;
    return {
      status: state.acceptanceStatus || "Ready",
      phase: 10,
      moduleVersion: MODULE_VERSION,
      manualAcceptanceImplemented: true,
      tokenTtlMinutes: 15,
      tokenTtlSeconds: TOKEN_TTL_SECONDS,
      oneTimeUseRequired: true,
      delegatedAcceptanceArchitectureSupported: true,
      delegatedAcceptanceEnabled: false,
      automaticLowRiskReflectionEnabled: false,
      controlledTransactionImplemented: false,
      pcCanonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false,
      tokenCount: state.acceptanceTokenDescriptors instanceof Map ? state.acceptanceTokenDescriptors.size : 0,
      lastToken: internal.clone(token)
    };
  }

  Object.assign(namespace.api, {
    issueManualAcceptanceToken: issueManualAcceptanceToken,
    validateAcceptanceToken: validateAcceptanceToken,
    getAcceptanceTokenStatus: getAcceptanceTokenStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.acceptanceToken = {
    id: "REPOSITORY-010-ACCEPTANCE-TOKEN",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 10,
    acceptanceModeImplemented: "MANUAL",
    tokenTtlMinutes: 15,
    tokenOneTimeUseRequired: true,
    delegatedAcceptanceArchitectureSupported: true,
    delegatedAcceptanceEnabled: false,
    automaticLowRiskReflectionEnabled: false,
    controlledTransactionImplemented: false,
    canonicalMutationImplemented: false,
    v5PostReflectionVerificationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.issueLocalFirstRepositoryManualAcceptanceToken = issueManualAcceptanceToken;
  global.validateLocalFirstRepositoryAcceptanceToken = validateAcceptanceToken;
  global.getLocalFirstRepositoryAcceptanceTokenStatus = getAcceptanceTokenStatus;
})(typeof window !== "undefined" ? window : globalThis);
