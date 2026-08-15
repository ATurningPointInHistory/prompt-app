/* ============================================================
   FILE: 13_local_first_repository_v3_conflict.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.7.0 / Module: V3 Base Revision / Conflict Validation 1.0.0
   Decision-004: Explicit Canonical Baseline
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 V3 Conflict blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("v3Conflict");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const BASELINE_DESCRIPTOR_ID = "REPOSITORY010-PC-CANONICAL-BASELINE-DESCRIPTOR";

  function resolveReceipt(receiptOrId) {
    if (internal.isPlainObject(receiptOrId)) return internal.clone(receiptOrId);
    const id = internal.text(receiptOrId, "");
    if (id && typeof namespace.getV2TransferReceiptDescriptor === "function") {
      const found = namespace.getV2TransferReceiptDescriptor(id);
      if (found) return found;
    }
    if (state.lastV2TransferReceipt) return internal.clone(state.lastV2TransferReceipt);
    return null;
  }

  function resolveBaseline(baselineOrId) {
    if (internal.isPlainObject(baselineOrId)) return internal.clone(baselineOrId);
    const id = internal.text(baselineOrId, "");
    if (id && typeof namespace.getCanonicalBaselineDescriptor === "function") {
      const found = namespace.getCanonicalBaselineDescriptor(id);
      if (found) return found;
    }
    if (state.lastCanonicalBaseline) return internal.clone(state.lastCanonicalBaseline);
    return null;
  }

  function validateDesktopScanForBaseline(scan) {
    const item = internal.isPlainObject(scan) ? scan : null;
    return Boolean(
      item &&
      item.readOnly === true &&
      item.writeAttempted === false &&
      item.canonicalMutationPerformed === false &&
      item.integrity &&
      item.integrity.status === "verified" &&
      item.integrity.allFileHashesVerified === true &&
      item.integrity.scriptSetVerified === true &&
      item.integrity.manifestHashVerified === true &&
      item.integrity.indexSequenceMatches === true &&
      item.descriptor &&
      item.descriptor.nodeId === TARGET_NODE_ID &&
      item.descriptor.integrityStatus === "verified"
    );
  }

  function establishExplicitCanonicalBaseline(options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const scan = state.lastDesktopRepositoryScan;
    if (!validateDesktopScanForBaseline(scan)) {
      return internal.buildResult(false, "REPOSITORY010_CANONICAL_BASELINE_PC_SCAN_REQUIRED", "Blocked", {
        desktopRepositoryVerified: false,
        explicitProjectOwnerActionRequired: true
      });
    }
    if (opts.explicitProjectOwnerAction !== true) {
      return internal.buildResult(false, "REPOSITORY010_CANONICAL_BASELINE_EXPLICIT_ACTION_REQUIRED", "Blocked", {
        explicitProjectOwnerActionRequired: true,
        validationIsApproval: false,
        mutationAuthorityGranted: false
      });
    }
    const canonicalRevisionId = internal.text(opts.canonicalRevisionId, "");
    if (!canonicalRevisionId) {
      return internal.buildResult(false, "REPOSITORY010_CANONICAL_REVISION_ID_REQUIRED", "Blocked", null);
    }

    const descriptorInput = {
      canonicalBaselineDescriptorId: internal.text(opts.canonicalBaselineDescriptorId, BASELINE_DESCRIPTOR_ID),
      projectId: scan.descriptor.projectId,
      repositoryId: scan.descriptor.repositoryId,
      canonicalRevisionId: canonicalRevisionId,
      sourceNodeId: scan.descriptor.nodeId,
      directoryName: scan.directoryName,
      manifestHash: scan.staticManifest.manifestHash,
      scriptSetHash: scan.staticManifest.scriptSetHash,
      scriptCount: scan.staticManifest.scriptCount,
      establishedAt: internal.nowIso()
    };

    const existing = state.canonicalBaselineDescriptors instanceof Map
      ? state.canonicalBaselineDescriptors.get(descriptorInput.canonicalBaselineDescriptorId)
      : null;
    if (existing) {
      const same = existing.canonicalRevisionId === descriptorInput.canonicalRevisionId &&
        existing.manifestHash === descriptorInput.manifestHash &&
        existing.scriptSetHash === descriptorInput.scriptSetHash &&
        existing.sourceNodeId === descriptorInput.sourceNodeId;
      if (!same) {
        return internal.buildResult(false, "REPOSITORY010_CANONICAL_BASELINE_IMMUTABLE_MISMATCH", "Blocked", {
          existing: internal.clone(existing),
          requested: descriptorInput
        });
      }
      state.lastCanonicalBaseline = internal.clone(existing);
      state.canonicalBaselineStatus = "Established";
      internal.touch();
      namespace.modules.v3Conflict.status = "Baseline Established";
      return internal.buildResult(true, "REPOSITORY010_CANONICAL_BASELINE_ALREADY_ESTABLISHED", "Established", {
        baseline: internal.clone(existing),
        idempotent: true,
        revisionDerivedFromHash: false,
        revisionDerivedFromVersion: false,
        canonicalMutationPerformed: false,
        authorityEffect: "none"
      });
    }

    const created = namespace.createCanonicalBaselineDescriptor(descriptorInput);
    if (!created || created.ok !== true) return created;
    const baseline = created.data.record;
    state.lastCanonicalBaseline = internal.clone(baseline);
    state.canonicalBaselineStatus = "Established";
    internal.touch();
    namespace.modules.v3Conflict.status = "Baseline Established";
    return internal.buildResult(true, "REPOSITORY010_CANONICAL_BASELINE_ESTABLISHED", "Established", {
      baseline: internal.clone(baseline),
      explicitProjectOwnerAction: true,
      revisionDerivedFromHash: false,
      revisionDerivedFromVersion: false,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none"
    });
  }

  function evaluateV3BaseRevision(receiptOrId, baselineOrId, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const receipt = resolveReceipt(receiptOrId);
    const baseline = resolveBaseline(baselineOrId);
    if (!receipt) return internal.buildResult(false, "REPOSITORY010_V3_V2_RECEIPT_REQUIRED", "Blocked", null);
    if (!baseline) return internal.buildResult(false, "REPOSITORY010_V3_CANONICAL_BASELINE_REQUIRED", "Blocked", null);

    const receiptValidation = namespace.validateContract("v2TransferReceiptDescriptor", receipt);
    const baselineValidation = namespace.validateContract("canonicalBaselineDescriptor", baseline);
    if (!receiptValidation.valid || !baselineValidation.valid) {
      return internal.buildResult(false, "REPOSITORY010_V3_INPUT_CONTRACT_INVALID", "Blocked", {
        receiptValidation: receiptValidation,
        baselineValidation: baselineValidation
      });
    }
    if (receipt.v2TransferIntegrityValidated !== true || receipt.packageHash !== receipt.receiverCalculatedPackageHash) {
      return internal.buildResult(false, "REPOSITORY010_V3_V2_INTEGRITY_REQUIRED", "Blocked", {
        v2TransferIntegrityValidated: receipt.v2TransferIntegrityValidated,
        packageHashMatches: receipt.packageHash === receipt.receiverCalculatedPackageHash
      });
    }
    if (receipt.projectId !== baseline.projectId || receipt.repositoryId !== baseline.repositoryId || receipt.targetNodeId !== baseline.sourceNodeId) {
      return internal.buildResult(false, "REPOSITORY010_V3_REPOSITORY_IDENTITY_MISMATCH", "Blocked", {
        receipt: internal.clone(receipt),
        baseline: internal.clone(baseline)
      });
    }

    const match = receipt.baseRevisionId === baseline.canonicalRevisionId;
    const gateId = internal.text(opts.v3GateId, internal.nextId("REPOSITORY010-V3-GATE"));
    const gate = namespace.createValidationGateDescriptor({
      gateId: gateId,
      capabilityId: "REPOSITORY-010-V3-BASE-CONFLICT",
      gateType: "V3 Base Revision / Conflict Validation",
      applicability: "required",
      result: match ? "passed" : "blocked"
    });
    if (!gate || gate.ok !== true) return gate;

    const evidenceCreated = namespace.createV3ConflictEvidenceDescriptor({
      conflictEvidenceId: internal.text(opts.conflictEvidenceId, internal.nextId("REPOSITORY010-V3-CONFLICT-EVIDENCE")),
      v3GateId: gateId,
      receiptId: receipt.receiptId,
      transferPackageId: receipt.transferPackageId,
      projectId: receipt.projectId,
      repositoryId: receipt.repositoryId,
      sourceNodeId: receipt.sourceNodeId,
      targetNodeId: receipt.targetNodeId,
      candidateRevisionId: receipt.revisionId,
      candidateBaseRevisionId: receipt.baseRevisionId,
      canonicalRevisionId: baseline.canonicalRevisionId,
      baseRevisionMatch: match,
      candidateState: match ? "validated-base-match" : "conflicted",
      resolutionStatus: match ? "not-required" : "manual-resolution-required",
      validatedAt: internal.nowIso()
    });
    if (!evidenceCreated || evidenceCreated.ok !== true) return evidenceCreated;

    const evidence = evidenceCreated.data.record;
    state.lastV3ConflictEvidence = internal.clone(evidence);
    state.lastV3Evaluation = {
      receipt: internal.clone(receipt),
      baseline: internal.clone(baseline),
      evidence: internal.clone(evidence)
    };
    state.v3ConflictStatus = match ? "Validated / Base Match" : "Conflict Detected / Manual Resolution Required";
    internal.touch();
    namespace.modules.v3Conflict.status = match ? "Validated" : "Conflict Detected";

    return internal.buildResult(true,
      match ? "REPOSITORY010_V3_BASE_REVISION_MATCHED" : "REPOSITORY010_V3_CONFLICT_DETECTED",
      match ? "Validated" : "Conflict Detected",
      {
        receipt: internal.clone(receipt),
        baseline: internal.clone(baseline),
        evidence: internal.clone(evidence),
        baseRevisionMatch: match,
        v3BaseConflictValidated: true,
        conflictDetected: !match,
        blockingConflict: !match,
        resolutionStatus: match ? "not-required" : "manual-resolution-required",
        automaticWinnerSelected: false,
        automaticConflictWinnerAllowed: false,
        timestampWinnerUsed: false,
        hashWinnerUsed: false,
        validationIsApproval: false,
        mutationAuthorityGranted: false,
        explicitAcceptanceGranted: false,
        canonicalMutationPerformed: false,
        v4TargetEnvironmentValidated: false,
        syncEngineInvoked: false,
        authorityEffect: "none"
      }
    );
  }

  function getV3ConflictStatus() {
    return {
      status: state.v3ConflictStatus || "Ready",
      phase: 8,
      moduleVersion: MODULE_VERSION,
      baselineMode: "explicit-project-owner",
      canonicalBaselineStatus: state.canonicalBaselineStatus || "Not Established",
      explicitCanonicalBaselineImplemented: true,
      v3BaseConflictValidationImplemented: true,
      automaticConflictWinnerAllowed: false,
      timestampWinnerAllowed: false,
      hashWinnerAllowed: false,
      validationIsApproval: false,
      pcCanonicalMutationImplemented: false,
      v4TargetEnvironmentValidationImplemented: false,
      explicitAcceptanceImplemented: false,
      syncEngineImplemented: false,
      lastCanonicalBaseline: internal.clone(state.lastCanonicalBaseline || null),
      lastConflictEvidence: internal.clone(state.lastV3ConflictEvidence || null),
      baselineCount: state.canonicalBaselineDescriptors instanceof Map ? state.canonicalBaselineDescriptors.size : 0,
      conflictEvidenceCount: state.v3ConflictEvidenceDescriptors instanceof Map ? state.v3ConflictEvidenceDescriptors.size : 0
    };
  }

  Object.assign(namespace.api, {
    establishExplicitCanonicalBaseline: establishExplicitCanonicalBaseline,
    evaluateV3BaseRevision: evaluateV3BaseRevision,
    getV3ConflictStatus: getV3ConflictStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.v3Conflict = {
    id: "REPOSITORY-010-V3-CONFLICT",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 8,
    baselineMode: "explicit-project-owner",
    explicitProjectOwnerActionRequired: true,
    v3BaseConflictValidationImplemented: true,
    automaticConflictWinnerAllowed: false,
    timestampWinnerAllowed: false,
    hashWinnerAllowed: false,
    pcCanonicalMutationImplemented: false,
    v4TargetEnvironmentValidationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.establishLocalFirstRepositoryCanonicalBaseline = establishExplicitCanonicalBaseline;
  global.evaluateLocalFirstRepositoryV3BaseRevision = evaluateV3BaseRevision;
  global.getLocalFirstRepositoryV3ConflictStatus = getV3ConflictStatus;
})(typeof window !== "undefined" ? window : globalThis);
