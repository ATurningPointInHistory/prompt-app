/* ============================================================
   FILE: 13_local_first_repository_v4_target_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.8.0 / Module: V4 Target Validation 1.0.0
   Phase 9: Target Environment Revalidation / Drift Gate
   Read-only: no approval, no canonical mutation, no V5, no sync
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 V4 Target Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("v4TargetValidation");

  function resolveV3Evidence(value) {
    if (internal.isPlainObject(value)) return internal.clone(value);
    const id = internal.text(value, "");
    return id && typeof namespace.getV3ConflictEvidenceDescriptor === "function"
      ? namespace.getV3ConflictEvidenceDescriptor(id)
      : null;
  }

  function resolveBaseline(value) {
    if (internal.isPlainObject(value)) return internal.clone(value);
    const id = internal.text(value, "");
    return id && typeof namespace.getCanonicalBaselineDescriptor === "function"
      ? namespace.getCanonicalBaselineDescriptor(id)
      : null;
  }

  function resolveScan(value) {
    if (internal.isPlainObject(value)) return internal.clone(value);
    return internal.clone(state.lastDesktopRepositoryScan || null);
  }

  function evaluateV4TargetEnvironment(v3EvidenceOrId, baselineOrId, currentScan, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const evidence = resolveV3Evidence(v3EvidenceOrId);
    const baseline = resolveBaseline(baselineOrId);
    const scan = resolveScan(currentScan);

    if (!evidence) return internal.buildResult(false, "REPOSITORY010_V4_V3_EVIDENCE_REQUIRED", "Blocked", null);
    if (!baseline) return internal.buildResult(false, "REPOSITORY010_V4_CANONICAL_BASELINE_REQUIRED", "Blocked", null);
    if (!scan) return internal.buildResult(false, "REPOSITORY010_V4_FRESH_TARGET_SCAN_REQUIRED", "Blocked", null);

    const evidenceValidation = namespace.validateContract("v3ConflictEvidenceDescriptor", evidence);
    const baselineValidation = namespace.validateContract("canonicalBaselineDescriptor", baseline);
    if (!evidenceValidation.valid || !baselineValidation.valid) {
      return internal.buildResult(false, "REPOSITORY010_V4_INPUT_CONTRACT_INVALID", "Blocked", {
        evidenceValidation: evidenceValidation,
        baselineValidation: baselineValidation
      });
    }

    if (evidence.baseRevisionMatch !== true || evidence.conflictDetected === true || evidence.blockingConflict === true || evidence.resolutionStatus !== "not-required") {
      return internal.buildResult(false, "REPOSITORY010_V4_V3_BASE_MATCH_REQUIRED", "Blocked", {
        baseRevisionMatch: evidence.baseRevisionMatch,
        conflictDetected: evidence.conflictDetected,
        blockingConflict: evidence.blockingConflict,
        resolutionStatus: evidence.resolutionStatus
      });
    }

    const descriptor = scan.descriptor || {};
    const staticManifest = scan.staticManifest || {};
    const integrity = scan.integrity || {};
    const repositoryIdentityMatch = descriptor.projectId === baseline.projectId && descriptor.repositoryId === baseline.repositoryId &&
      evidence.projectId === baseline.projectId && evidence.repositoryId === baseline.repositoryId;
    const targetNodeMatch = descriptor.nodeId === baseline.sourceNodeId && evidence.targetNodeId === baseline.sourceNodeId;
    const directoryMatch = scan.directoryName === baseline.directoryName;
    const integrityVerified = scan.readOnly === true && scan.writeAttempted === false && scan.canonicalMutationPerformed === false &&
      integrity.status === "verified" && integrity.allFileHashesVerified === true && integrity.scriptSetVerified === true &&
      integrity.manifestHashVerified === true && integrity.indexSequenceMatches === true;
    const manifestHashMatch = staticManifest.manifestHash === baseline.manifestHash;
    const scriptSetHashMatch = staticManifest.scriptSetHash === baseline.scriptSetHash;
    const scriptCountMatch = Number(staticManifest.scriptCount || 0) === Number(baseline.scriptCount || 0);
    const targetEnvironmentMatch = repositoryIdentityMatch && targetNodeMatch && directoryMatch && integrityVerified && manifestHashMatch && scriptSetHashMatch && scriptCountMatch;

    const gateId = internal.text(opts.v4GateId, internal.nextId("REPOSITORY010-V4-GATE"));
    const gate = namespace.createValidationGateDescriptor({
      gateId: gateId,
      capabilityId: "REPOSITORY-010-V4-TARGET-ENVIRONMENT",
      gateType: "V4 Target Environment Revalidation / Drift Gate",
      applicability: "required",
      result: targetEnvironmentMatch ? "passed" : "blocked"
    });
    if (!gate || gate.ok !== true) return gate;

    const created = namespace.createV4TargetValidationEvidenceDescriptor({
      v4EvidenceId: internal.text(opts.v4EvidenceId, internal.nextId("REPOSITORY010-V4-TARGET-EVIDENCE")),
      v4GateId: gateId,
      v3ConflictEvidenceId: evidence.conflictEvidenceId,
      v3GateId: evidence.v3GateId,
      receiptId: evidence.receiptId,
      transferPackageId: evidence.transferPackageId,
      projectId: evidence.projectId,
      repositoryId: evidence.repositoryId,
      sourceNodeId: evidence.sourceNodeId,
      targetNodeId: evidence.targetNodeId,
      candidateRevisionId: evidence.candidateRevisionId,
      candidateBaseRevisionId: evidence.candidateBaseRevisionId,
      canonicalRevisionId: baseline.canonicalRevisionId,
      baselineManifestHash: baseline.manifestHash,
      currentManifestHash: internal.text(staticManifest.manifestHash, ""),
      manifestHashMatch: manifestHashMatch,
      baselineScriptSetHash: baseline.scriptSetHash,
      currentScriptSetHash: internal.text(staticManifest.scriptSetHash, ""),
      scriptSetHashMatch: scriptSetHashMatch,
      baselineScriptCount: Number(baseline.scriptCount || 0),
      currentScriptCount: Number(staticManifest.scriptCount || 0),
      scriptCountMatch: scriptCountMatch,
      repositoryIdentityMatch: repositoryIdentityMatch,
      targetNodeMatch: targetNodeMatch,
      directoryMatch: directoryMatch,
      integrityVerified: integrityVerified,
      targetEnvironmentMatch: targetEnvironmentMatch,
      validatedAt: internal.nowIso()
    });
    if (!created || created.ok !== true) return created;

    const v4Evidence = created.data.record;
    state.lastV4TargetValidationEvidence = internal.clone(v4Evidence);
    state.lastV4Evaluation = {
      v3Evidence: internal.clone(evidence),
      baseline: internal.clone(baseline),
      currentScan: internal.clone(scan),
      evidence: internal.clone(v4Evidence)
    };
    state.v4TargetStatus = targetEnvironmentMatch ? "Validated / Target Stable" : "Target Drift Detected / Blocked";
    internal.touch();
    namespace.modules.v4TargetValidation.status = targetEnvironmentMatch ? "Validated" : "Target Drift Detected";

    return internal.buildResult(true,
      targetEnvironmentMatch ? "REPOSITORY010_V4_TARGET_ENVIRONMENT_VALIDATED" : "REPOSITORY010_V4_TARGET_DRIFT_DETECTED",
      targetEnvironmentMatch ? "Validated" : "Target Drift Detected",
      {
        evidence: internal.clone(v4Evidence),
        v4TargetEnvironmentValidationExecuted: true,
        v4TargetEnvironmentValidated: targetEnvironmentMatch,
        targetEnvironmentMatch: targetEnvironmentMatch,
        blockingTargetDrift: !targetEnvironmentMatch,
        repositoryIdentityMatch: repositoryIdentityMatch,
        targetNodeMatch: targetNodeMatch,
        directoryMatch: directoryMatch,
        integrityVerified: integrityVerified,
        manifestHashMatch: manifestHashMatch,
        scriptSetHashMatch: scriptSetHashMatch,
        scriptCountMatch: scriptCountMatch,
        validationIsApproval: false,
        mutationAuthorityGranted: false,
        explicitAcceptanceGranted: false,
        canonicalMutationPerformed: false,
        v5PostReflectionVerified: false,
        syncEngineInvoked: false,
        authorityEffect: "none"
      }
    );
  }

  function getV4TargetValidationStatus() {
    const evidence = state.lastV4TargetValidationEvidence || null;
    return {
      status: state.v4TargetStatus || "Ready",
      phase: 9,
      moduleVersion: MODULE_VERSION,
      v4TargetEnvironmentValidationImplemented: true,
      v4TargetEnvironmentValidated: Boolean(evidence && evidence.v4TargetEnvironmentValidated === true),
      blockingTargetDrift: Boolean(evidence && evidence.blockingTargetDrift === true),
      validationIsApproval: false,
      explicitAcceptanceImplemented: false,
      pcCanonicalMutationImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false,
      lastEvidence: internal.clone(evidence),
      evidenceCount: state.v4TargetValidationEvidenceDescriptors instanceof Map ? state.v4TargetValidationEvidenceDescriptors.size : 0
    };
  }

  Object.assign(namespace.api, {
    evaluateV4TargetEnvironment: evaluateV4TargetEnvironment,
    getV4TargetValidationStatus: getV4TargetValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.v4TargetValidation = {
    id: "REPOSITORY-010-V4-TARGET-VALIDATION",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 9,
    readOnly: true,
    freshTargetRevalidationRequired: true,
    v4TargetEnvironmentValidationImplemented: true,
    validationIsApproval: false,
    explicitAcceptanceImplemented: false,
    pcCanonicalMutationImplemented: false,
    v5PostReflectionVerificationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.evaluateLocalFirstRepositoryV4TargetEnvironment = evaluateV4TargetEnvironment;
  global.getLocalFirstRepositoryV4TargetValidationStatus = getV4TargetValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
