/* ============================================================
   FILE: 13_local_first_repository_guided_operations.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.17.3 / Module: Guided Operations 1.0.3
   Phase 18: Guided Repository Operations
   Additive orchestration only. Phase17 safety boundaries remain authoritative.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Guided Operations blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("guidedOperations") || "1.0.0";
  const EXPECTED_PHASE18_SCRIPT_COUNT = 281;
  const OWNER = "Project Owner";

  if (!state.guidedOperations || typeof state.guidedOperations !== "object") {
    state.guidedOperations = {
      status: "Ready",
      step: "INITIALIZE",
      canonical: null,
      lastScan: null,
      lastSync: null,
      lastMutation: null,
      lastBridge: null,
      lastAcceptance: null,
      lastReflection: null,
      lastPromotion: null,
      lastBootstrapV5: null,
      lastError: null,
      updatedAt: internal.nowIso()
    };
  }

  function clone(value) { return internal.clone(value); }

  function emit() {
    state.guidedOperations.updatedAt = internal.nowIso();
    internal.touch();
    try {
      if (typeof global.CustomEvent === "function" && typeof global.dispatchEvent === "function") {
        global.dispatchEvent(new global.CustomEvent("repository010-guided-state-changed", {
          detail: getGuidedRepositoryOperationsStatus()
        }));
      }
    } catch (_) {}
  }

  function setStatus(status, step) {
    state.guidedOperations.status = status;
    if (step) state.guidedOperations.step = step;
    state.guidedOperations.lastError = null;
    emit();
  }

  function rememberError(step, error) {
    const detail = {
      step: step,
      message: error && error.message ? error.message : String(error || "Unknown error"),
      at: internal.nowIso()
    };
    state.guidedOperations.status = "Blocked";
    state.guidedOperations.step = step;
    state.guidedOperations.lastError = detail;
    emit();
    return internal.buildResult(false, "REPOSITORY010_GUIDED_OPERATION_FAILED", "Blocked", {
      step: step,
      guidedError: clone(detail),
      repositoryWriteAttemptedByGuidedController: false,
      automaticAcceptancePerformed: false,
      automaticPromotionPerformed: false,
      authorityEffect: "none"
    });
  }

  function requireApi(name) {
    if (typeof namespace[name] !== "function") throw new Error("Required REPOSITORY-010 API is unavailable: " + name);
    return namespace[name];
  }

  function parseRevisionSequence(value) {
    const match = String(value || "").match(/REPOSITORY010-CANONICAL-REVISION-(\d+)$/);
    return match ? Number(match[1]) : -1;
  }

  async function list(type) {
    requireApi("listPersistedLocalFirstRepositoryRecords");
    const records = await namespace.listPersistedLocalFirstRepositoryRecords(type);
    return Array.isArray(records) ? records : [];
  }

  function developmentReleaseEvidenceIdentity(record) {
    const item = record || {};
    return [
      internal.text(item.developmentReleasePlanId, ""),
      internal.text(item.releasePlanHash, ""),
      internal.text(item.releasePackageHash, ""),
      internal.text(item.actualManifestHash, ""),
      internal.text(item.actualScriptSetHash, ""),
      String(Number(item.actualScriptCount || 0)),
      internal.text(item.repositoryStateHash, "")
    ].join("|");
  }

  async function resolvePersistedDevelopmentReleaseV5EvidenceId(preferredEvidenceId) {
    const preferred = internal.text(preferredEvidenceId, "");
    if (preferred) {
      return {
        evidenceId: preferred,
        source: "runtime",
        recoveredFromPersistence: false,
        equivalentCandidateCount: 1
      };
    }

    const canonicalResult = await resolveCurrentCanonical();
    if (!canonicalResult || canonicalResult.ok !== true || !canonicalResult.data) {
      throw new Error("Current Canonical could not be resolved for Development Release V5 Evidence recovery.");
    }

    requireApi("getCanonicalRevisionSuggestion");
    const suggestionResult = await namespace.getCanonicalRevisionSuggestion();
    const suggestion = suggestionResult && suggestionResult.data || {};
    const currentRevisionId = internal.text(canonicalResult.data.canonicalRevisionId, "");
    const nextRevisionId = internal.text(suggestion.nextCanonicalRevisionCandidate, "");
    if (!currentRevisionId || !nextRevisionId) {
      throw new Error("Current/next Canonical Revision is unavailable for Development Release V5 Evidence recovery.");
    }

    const groups = await Promise.all([
      list("developmentReleaseV5Evidence"),
      list("baselinePromotionEvidence")
    ]);
    const promotedSourceIds = new Set(groups[1].map(function mapEvidence(item) {
      return internal.text(item && item.sourceEvidenceId, "");
    }).filter(Boolean));

    const candidates = groups[0].filter(function eligible(item) {
      if (!item) return false;
      const evidenceId = internal.text(item.developmentReleaseV5EvidenceId, "");
      return Boolean(evidenceId) &&
        !promotedSourceIds.has(evidenceId) &&
        internal.text(item.baseCanonicalRevisionId, "") === currentRevisionId &&
        internal.text(item.suggestedCanonicalRevisionId, "") === nextRevisionId &&
        item.releasePackageHashVerified === true &&
        item.freshReadOnlyScanPassed === true &&
        item.fullRepositoryIntegrityVerified === true &&
        item.releasePlanMatched === true &&
        item.unexpectedFileDifferenceDetected === false &&
        item.developmentReleaseV5Passed === true &&
        item.canonicalSourceFilesWrittenByEngine === false &&
        item.canonicalMutationPerformedByEngine === false &&
        item.automaticAcceptancePerformed === false &&
        item.automaticPromotionPerformed === false &&
        item.syncEngineInvoked === false &&
        item.githubReflectionPerformed === false &&
        internal.text(item.authorityEffect, "") === "none";
    });

    if (!candidates.length) {
      throw new Error("No eligible persisted Development Release V5 Evidence exists for the current Canonical Revision.");
    }

    const identities = Array.from(new Set(candidates.map(developmentReleaseEvidenceIdentity)));
    if (identities.length !== 1) {
      throw new Error("Multiple non-equivalent persisted Development Release V5 Evidence records exist. Re-run Development Update V5 to establish an unambiguous evidence record.");
    }

    candidates.sort(function newestFirst(a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    const selected = candidates[0];
    return {
      evidenceId: selected.developmentReleaseV5EvidenceId,
      source: "persistence",
      recoveredFromPersistence: true,
      equivalentCandidateCount: candidates.length,
      developmentReleasePlanId: selected.developmentReleasePlanId || null,
      baseCanonicalRevisionId: selected.baseCanonicalRevisionId || null,
      suggestedCanonicalRevisionId: selected.suggestedCanonicalRevisionId || null
    };
  }

  async function resolveCurrentCanonical() {
    try {
      if (typeof namespace.initializeBaselinePromotion === "function") await namespace.initializeBaselinePromotion();
      const groups = await Promise.all([
        list("canonicalBaseline"),
        list("revision"),
        list("integrityRecord"),
        list("stateRecord"),
        list("baselinePromotionEvidence")
      ]);
      const baselines = groups[0].filter(function (record) { return record && record.explicitlyEstablished === true; })
        .sort(function (a, b) { return parseRevisionSequence(a.canonicalRevisionId) - parseRevisionSequence(b.canonicalRevisionId); });
      const baseline = baselines.length ? baselines[baselines.length - 1] : null;
      if (!baseline) throw new Error("Explicit Canonical Baseline is unavailable.");
      const revision = groups[1].filter(function (record) { return record && record.revisionId === baseline.canonicalRevisionId; }).pop() || null;
      const integrity = groups[2].filter(function (record) { return record && record.revisionId === baseline.canonicalRevisionId && record.integrityStatus === "verified"; }).pop() || null;
      const canonicalState = groups[3].filter(function (record) { return record && record.revisionId === baseline.canonicalRevisionId && record.state === "canonical"; }).pop() || null;
      const evidence = groups[4].filter(function (record) { return record && record.canonicalRevisionId === baseline.canonicalRevisionId; }).pop() || null;
      const context = {
        baseline: clone(baseline),
        revision: revision ? {
          revisionId: revision.revisionId,
          baseRevisionId: revision.baseRevisionId || null,
          parentRevisionId: revision.parentRevisionId || null
        } : null,
        integritySummary: integrity ? {
          integrityRecordId: integrity.integrityRecordId || null,
          revisionId: integrity.revisionId || null,
          manifestHash: integrity.manifestHash || null,
          scriptSetHash: integrity.scriptSetHash || null,
          repositoryStateHash: integrity.repositoryStateHash || null,
          fileHashCount: Object.keys(integrity.fileHashes || {}).length,
          integrityStatus: integrity.integrityStatus || null
        } : null,
        canonicalState: canonicalState ? {
          stateRecordId: canonicalState.stateRecordId || null,
          revisionId: canonicalState.revisionId || null,
          state: canonicalState.state || null,
          integrityStatus: canonicalState.integrityStatus || null
        } : null,
        promotionEvidence: evidence ? {
          promotionEvidenceId: evidence.promotionEvidenceId || null,
          previousCanonicalRevisionId: evidence.previousCanonicalRevisionId || null,
          canonicalRevisionId: evidence.canonicalRevisionId || null,
          explicitProjectOwnerAction: evidence.explicitProjectOwnerAction === true
        } : null,
        canonicalRevisionId: baseline.canonicalRevisionId,
        scriptCount: Number(baseline.scriptCount || 0),
        manifestHash: baseline.manifestHash || null,
        scriptSetHash: baseline.scriptSetHash || null,
        phase18RuntimeVersion: VERSION_MANIFEST.release && VERSION_MANIFEST.release.version || null,
        phase18ExpectedScriptCount: EXPECTED_PHASE18_SCRIPT_COUNT,
        bootstrapRequired: Number(baseline.scriptCount || 0) !== EXPECTED_PHASE18_SCRIPT_COUNT,
        resolvedAt: internal.nowIso()
      };
      state.guidedOperations.canonical = clone(context);
      setStatus("Ready", context.bootstrapRequired ? "BOOTSTRAP_REQUIRED" : "REPOSITORY_READY");
      return internal.buildResult(true, "REPOSITORY010_GUIDED_CANONICAL_RESOLVED", "Ready", clone(context));
    } catch (error) {
      return rememberError("CANONICAL_RESOLUTION", error);
    }
  }

  async function initializeGuidedRepositoryOperations() {
    try {
      if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
      requireApi("initializeLocalFirstRepositoryPersistence");
      const persistence = await namespace.initializeLocalFirstRepositoryPersistence();
      if (!persistence || persistence.ok !== true) return persistence;
      if (typeof namespace.restoreLocalFirstRepositoryDevelopmentReleaseRecords === "function") {
        await namespace.restoreLocalFirstRepositoryDevelopmentReleaseRecords();
      }
      const canonical = await resolveCurrentCanonical();
      if (!canonical || canonical.ok !== true) return canonical;
      return internal.buildResult(true, "REPOSITORY010_GUIDED_OPERATIONS_INITIALIZED", "Ready", {
        canonical: clone(canonical.data),
        consolePasteRequiredForNormalUse: false,
        explicitAcceptanceRequired: true,
        explicitReflectionActionRequired: true,
        explicitPromotionRequired: true,
        automaticAcceptancePerformed: false,
        automaticPromotionPerformed: false,
        directRepositoryMutationAllowed: false,
        authorityEffect: "none"
      });
    } catch (error) {
      return rememberError("INITIALIZE", error);
    }
  }

  async function scanGuidedRepository() {
    try {
      requireApi("selectAndScanDesktopRepository");
      setStatus("Working", "REPOSITORY_SCAN");
      const result = await namespace.selectAndScanDesktopRepository();
      if (!result || result.ok !== true) {
        state.guidedOperations.lastScan = clone(result || null);
        setStatus("Blocked", "REPOSITORY_SCAN");
        return result;
      }
      state.guidedOperations.lastScan = clone(result);
      setStatus("Verified", "REPOSITORY_VERIFIED");
      return result;
    } catch (error) {
      return rememberError("REPOSITORY_SCAN", error);
    }
  }

  async function receiveGuidedAndroidToPcSync() {
    try {
      requireApi("prepareLocalFirstRepositoryPickerSafePcReceiver");
      requireApi("selectAndReceiveLocalFirstRepositoryPickerSafeAndroidToPcSync");
      setStatus("Working", "SYNC_PREPARE");
      const prepared = await namespace.prepareLocalFirstRepositoryPickerSafePcReceiver();
      if (!prepared || prepared.ok !== true) return prepared;
      setStatus("Working", "SYNC_FILE_SELECT");
      const received = await namespace.selectAndReceiveLocalFirstRepositoryPickerSafeAndroidToPcSync();
      state.guidedOperations.lastSync = clone(received || null);
      if (!received || received.ok !== true) {
        setStatus("Blocked", "SYNC_VALIDATION");
        return received;
      }
      const data = received.data || {};
      if (received.code !== "REPOSITORY010_ANDROID_TO_PC_SYNC_AWAITING_ACCEPTANCE") {
        setStatus(received.status || "Verified", "SYNC_RESULT");
        return received;
      }
      state.guidedOperations.lastV4Evidence = clone(data.v4Evidence || null);
      setStatus("Awaiting Mutation Package", "SYNC_VERIFIED");
      return received;
    } catch (error) {
      return rememberError("SYNC_RECEIVE", error);
    }
  }

  function pickJsonFile(description) {
    if (typeof global.showOpenFilePicker === "function") {
      return global.showOpenFilePicker({
        multiple: false,
        types: [{ description: description || "JSON", accept: { "application/json": [".json"] } }]
      }).then(function (handles) {
        if (!handles || !handles.length) throw new Error("No JSON file was selected.");
        return handles[0].getFile();
      });
    }
    return new Promise(function (resolve, reject) {
      if (!global.document || !global.document.body) return reject(new Error("File selection UI is unavailable."));
      const input = global.document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.style.display = "none";
      global.document.body.appendChild(input);
      input.onchange = function () {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) reject(new Error("No JSON file was selected.")); else resolve(file);
      };
      input.click();
    });
  }

  async function receiveGuidedMutationPackage() {
    try {
      requireApi("receiveMutationPackageFile");
      requireApi("validateMutationPackageAgainstDesktopTarget");
      setStatus("Working", "MUTATION_FILE_SELECT");
      const file = await pickJsonFile("REPOSITORY-010 Mutation Package");
      const received = await namespace.receiveMutationPackageFile(file, {});
      if (!received || received.ok !== true) {
        state.guidedOperations.lastMutation = clone(received || null);
        setStatus("Blocked", "MUTATION_RECEIVE");
        return received;
      }
      const mutationPackage = received.data && received.data.mutationPackage;
      if (!mutationPackage) throw new Error("Received Mutation Package record is missing.");
      const bridge = await namespace.validateMutationPackageAgainstDesktopTarget(mutationPackage);
      state.guidedOperations.lastMutation = clone(received);
      state.guidedOperations.lastMutationPackage = clone(mutationPackage);
      state.guidedOperations.lastBridge = clone(bridge || null);
      if (!bridge || bridge.ok !== true) {
        setStatus("Blocked", "MUTATION_TARGET_VALIDATION");
        return bridge;
      }
      state.guidedOperations.allowedMutationSet = clone((bridge.data && bridge.data.allowedMutationSet) || mutationPackage.allowedMutationSet || []);
      setStatus("Awaiting Explicit Acceptance", "ACCEPTANCE_REQUIRED");
      return internal.buildResult(true, "REPOSITORY010_GUIDED_MUTATION_READY_FOR_ACCEPTANCE", "Awaiting Acceptance", {
        mutationPackage: clone(mutationPackage),
        bridge: clone(bridge.data),
        explicitProjectOwnerActionRequired: true,
        automaticAcceptancePerformed: false,
        canonicalMutationPerformed: false,
        authorityEffect: "none"
      });
    } catch (error) {
      if (error && error.name === "AbortError") return internal.buildResult(false, "REPOSITORY010_GUIDED_MUTATION_SELECTION_CANCELLED", "Cancelled", null);
      return rememberError("MUTATION_RECEIVE", error);
    }
  }

  async function approveGuidedMutation() {
    try {
      const mutationPackage = state.guidedOperations.lastMutationPackage;
      const allowed = state.guidedOperations.allowedMutationSet;
      const v4 = state.guidedOperations.lastV4Evidence || (state.guidedOperations.lastSync && state.guidedOperations.lastSync.data && state.guidedOperations.lastSync.data.v4Evidence);
      if (!mutationPackage || !Array.isArray(allowed) || !v4 || !v4.v4EvidenceId) {
        throw new Error("Validated Sync + Mutation Package lineage is required before Acceptance.");
      }
      requireApi("issueManualAcceptanceToken");
      setStatus("Working", "MANUAL_ACCEPTANCE");
      const result = await namespace.issueManualAcceptanceToken({
        explicitProjectOwnerAction: true,
        acceptedBy: OWNER,
        v4EvidenceId: v4.v4EvidenceId,
        allowedMutationSet: allowed
      });
      state.guidedOperations.lastAcceptance = clone(result || null);
      if (!result || result.ok !== true) {
        setStatus("Blocked", "MANUAL_ACCEPTANCE");
        return result;
      }
      state.guidedOperations.acceptanceToken = clone(result.data.acceptanceToken);
      setStatus("Accepted / Awaiting Reflection", "REFLECTION_REQUIRED");
      return result;
    } catch (error) {
      return rememberError("MANUAL_ACCEPTANCE", error);
    }
  }

  async function reflectGuidedMutation(options) {
    try {
      const opts = internal.isPlainObject(options) ? options : {};
      const token = state.guidedOperations.acceptanceToken;
      const mutationPackage = state.guidedOperations.lastMutationPackage;
      if (!token || !mutationPackage) throw new Error("Active Acceptance Token and Mutation Package are required.");
      requireApi("initializeRestrictedDesktopWriteAdapter");
      requireApi("selectRestrictedDesktopWriteDirectory");
      requireApi("getRestrictedDesktopWriteAdapterStatus");
      requireApi("executePersistentCanonicalReflection");
      setStatus("Working", "WRITE_DIRECTORY_SELECTION");
      const initialized = namespace.initializeRestrictedDesktopWriteAdapter();
      if (!initialized || initialized.ok !== true) return initialized;
      if (opts.useSelectedWriteDirectory === true) {
        const writeStatus = namespace.getRestrictedDesktopWriteAdapterStatus();
        if (!writeStatus || writeStatus.directorySelected !== true) {
          return internal.buildResult(false, "REPOSITORY010_GUIDED_WRITE_DIRECTORY_REQUIRED", "Blocked", {
            pickerMustBeTriggeredByDirectUserGesture: true,
            repositoryWriteAttempted: false
          });
        }
      } else {
        const selected = await namespace.selectRestrictedDesktopWriteDirectory();
        if (!selected || selected.ok !== true) return selected;
      }
      setStatus("Working", "PERSISTENT_REFLECTION_V5");
      const reflection = await namespace.executePersistentCanonicalReflection({
        acceptanceTokenId: token.acceptanceTokenId,
        mutationPackageId: mutationPackage.mutationPackageId
      });
      state.guidedOperations.lastReflection = clone(reflection || null);
      if (!reflection || reflection.ok !== true || reflection.code !== "REPOSITORY010_PERSISTENT_REFLECTION_V5_VERIFIED") {
        setStatus("Blocked", "PERSISTENT_REFLECTION_V5");
        return reflection;
      }
      const transaction = reflection.data && reflection.data.transaction;
      state.guidedOperations.lastV5EvidenceId = transaction && transaction.transactionId || null;
      setStatus("V5 Verified / Awaiting Explicit Promotion", "PROMOTION_REQUIRED");
      return reflection;
    } catch (error) {
      return rememberError("PERSISTENT_REFLECTION_V5", error);
    }
  }

  async function promoteEvidenceExplicitly(sourceEvidenceId, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const evidenceId = internal.text(sourceEvidenceId, "");
    if (!evidenceId) throw new Error("Eligible V5 Evidence ID is required for promotion.");
    requireApi("selectAndScanDesktopRepository");
    requireApi("scanDesktopRepositoryDirectory");
    requireApi("getDesktopRepositorySelectionSnapshot");
    requireApi("initializeBaselinePromotion");
    requireApi("createBaselinePromotionCandidate");
    requireApi("revalidateBaselinePromotionCandidate");
    requireApi("promoteCanonicalBaseline");

    setStatus("Working", "PROMOTION_FRESH_REPOSITORY_SCAN");
    let scan;
    if (opts.useSelectedDesktopDirectory === true) {
      const selection = namespace.getDesktopRepositorySelectionSnapshot();
      if (!selection || selection.directorySelected !== true) {
        return internal.buildResult(false, "REPOSITORY010_GUIDED_PROMOTION_DIRECTORY_REQUIRED", "Blocked", {
          pickerMustBeTriggeredByDirectUserGesture: true,
          canonicalRevisionPromoted: false
        });
      }
      scan = await namespace.scanDesktopRepositoryDirectory();
    } else {
      scan = await namespace.selectAndScanDesktopRepository();
    }
    if (!scan || scan.ok !== true) return scan;
    const init = await namespace.initializeBaselinePromotion();
    if (!init || init.ok !== true) return init;
    const prepared = await namespace.createBaselinePromotionCandidate({ sourceEvidenceId: evidenceId });
    if (!prepared || prepared.ok !== true) return prepared;
    const candidate = prepared.data && prepared.data.candidate;
    if (!candidate) throw new Error("Baseline Promotion Candidate is missing.");
    const fresh = await namespace.revalidateBaselinePromotionCandidate(candidate.promotionCandidateId);
    if (!fresh || fresh.ok !== true) return fresh;
    const promoted = await namespace.promoteCanonicalBaseline({
      promotionCandidateId: candidate.promotionCandidateId,
      explicitProjectOwnerAction: true
    });
    if (!promoted || promoted.ok !== true) return promoted;
    state.guidedOperations.lastPromotion = clone(promoted);
    await resolveCurrentCanonical();
    setStatus("Promoted", "COMPLETE");
    return internal.buildResult(true, "REPOSITORY010_GUIDED_CANONICAL_PROMOTION_COMPLETE", "Promoted", {
      prepared: clone(prepared.data),
      fresh: clone(fresh.data),
      promotion: clone(promoted.data),
      explicitProjectOwnerAction: true,
      automaticPromotionPerformed: false,
      canonicalSourceFilesWrittenByGuidedController: false
    });
  }

  async function promoteGuidedReflection(options) {
    try {
      const evidenceId = state.guidedOperations.lastV5EvidenceId || (state.guidedOperations.lastReflection && state.guidedOperations.lastReflection.data && state.guidedOperations.lastReflection.data.transaction && state.guidedOperations.lastReflection.data.transaction.transactionId);
      setStatus("Working", "PROMOTION_EXPLICIT");
      return await promoteEvidenceExplicitly(evidenceId, options);
    } catch (error) {
      return rememberError("PROMOTION_EXPLICIT", error);
    }
  }

  async function verifyPhase18BootstrapRelease() {
    try {
      requireApi("selectAndVerifyLocalFirstRepositoryDevelopmentReleaseV5");
      setStatus("Working", "BOOTSTRAP_RELEASE_V5");
      const result = await namespace.selectAndVerifyLocalFirstRepositoryDevelopmentReleaseV5();
      state.guidedOperations.lastBootstrapV5 = clone(result || null);
      if (!result || result.ok !== true || result.code !== "REPOSITORY010_DEVELOPMENT_RELEASE_V5_VERIFIED") {
        setStatus("Blocked", "BOOTSTRAP_RELEASE_V5");
        return result;
      }
      const evidence = result.data && result.data.developmentReleaseV5Evidence;
      state.guidedOperations.lastBootstrapV5EvidenceId = evidence && evidence.developmentReleaseV5EvidenceId || null;
      setStatus("Bootstrap V5 Verified / Awaiting Explicit Promotion", "BOOTSTRAP_PROMOTION_REQUIRED");
      return result;
    } catch (error) {
      return rememberError("BOOTSTRAP_RELEASE_V5", error);
    }
  }

  async function promotePhase18BootstrapRelease(options) {
    try {
      const evidenceId = state.guidedOperations.lastBootstrapV5EvidenceId || (state.guidedOperations.lastBootstrapV5 && state.guidedOperations.lastBootstrapV5.data && state.guidedOperations.lastBootstrapV5.data.developmentReleaseV5Evidence && state.guidedOperations.lastBootstrapV5.data.developmentReleaseV5Evidence.developmentReleaseV5EvidenceId);
      setStatus("Working", "BOOTSTRAP_PROMOTION_EXPLICIT");
      return await promoteEvidenceExplicitly(evidenceId, options);
    } catch (error) {
      return rememberError("BOOTSTRAP_PROMOTION_EXPLICIT", error);
    }
  }

  async function verifyGuidedDevelopmentReleaseUpdate() {
    try {
      requireApi("selectAndVerifyLocalFirstRepositoryDevelopmentReleaseV5");
      setStatus("Working", "DEVELOPMENT_UPDATE_V5");
      const result = await namespace.selectAndVerifyLocalFirstRepositoryDevelopmentReleaseV5();
      state.guidedOperations.lastDevelopmentUpdateV5 = clone(result || null);
      if (!result || result.ok !== true || result.code !== "REPOSITORY010_DEVELOPMENT_RELEASE_V5_VERIFIED") {
        setStatus("Blocked", "DEVELOPMENT_UPDATE_V5");
        return result;
      }
      const evidence = result.data && result.data.developmentReleaseV5Evidence;
      state.guidedOperations.lastDevelopmentUpdateV5EvidenceId = evidence && evidence.developmentReleaseV5EvidenceId || null;
      setStatus("Development Update V5 Verified / Awaiting Explicit Promotion", "DEVELOPMENT_UPDATE_PROMOTION_REQUIRED");
      return result;
    } catch (error) {
      return rememberError("DEVELOPMENT_UPDATE_V5", error);
    }
  }

  async function promoteGuidedDevelopmentReleaseUpdate(options) {
    try {
      const runtimeEvidenceId = state.guidedOperations.lastDevelopmentUpdateV5EvidenceId || (state.guidedOperations.lastDevelopmentUpdateV5 && state.guidedOperations.lastDevelopmentUpdateV5.data && state.guidedOperations.lastDevelopmentUpdateV5.data.developmentReleaseV5Evidence && state.guidedOperations.lastDevelopmentUpdateV5.data.developmentReleaseV5Evidence.developmentReleaseV5EvidenceId);
      setStatus("Working", "DEVELOPMENT_UPDATE_EVIDENCE_RESOLUTION");
      const resolvedEvidence = await resolvePersistedDevelopmentReleaseV5EvidenceId(runtimeEvidenceId);
      state.guidedOperations.lastDevelopmentUpdateV5EvidenceId = resolvedEvidence.evidenceId;
      state.guidedOperations.lastDevelopmentUpdateEvidenceResolution = clone(resolvedEvidence);
      setStatus("Working", "DEVELOPMENT_UPDATE_PROMOTION_EXPLICIT");
      const result = await promoteEvidenceExplicitly(resolvedEvidence.evidenceId, options);
      if (result && result.data && typeof result.data === "object") {
        result.data.guidedEvidenceResolution = clone(resolvedEvidence);
      }
      return result;
    } catch (error) {
      return rememberError("DEVELOPMENT_UPDATE_PROMOTION_EXPLICIT", error);
    }
  }

  async function runGuidedReloadValidation() {
    try {
      requireApi("runLocalFirstRepositoryPhase17PersistenceReloadValidation");
      setStatus("Working", "RELOAD_VALIDATION");
      const result = await namespace.runLocalFirstRepositoryPhase17PersistenceReloadValidation();
      state.guidedOperations.lastReloadValidation = clone(result || null);
      if (!result || result.failed !== 0 || result.health !== 100) {
        setStatus("Blocked", "RELOAD_VALIDATION");
        return result;
      }
      await resolveCurrentCanonical();
      setStatus("Reload Validation Passed", "RELOAD_VALIDATED");
      return result;
    } catch (error) {
      return rememberError("RELOAD_VALIDATION", error);
    }
  }

  function getGuidedRepositoryOperationsStatus() {
    const guided = state.guidedOperations || {};
    return {
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release && VERSION_MANIFEST.release.version || "1.17.0",
      phase: 18,
      moduleVersion: MODULE_VERSION,
      status: guided.status || "Ready",
      step: guided.step || "INITIALIZE",
      canonical: clone(guided.canonical || null),
      lastScanCode: guided.lastScan && guided.lastScan.code || null,
      lastSyncCode: guided.lastSync && guided.lastSync.code || null,
      lastMutationPackageId: guided.lastMutationPackage && guided.lastMutationPackage.mutationPackageId || null,
      lastAcceptanceTokenId: guided.acceptanceToken && guided.acceptanceToken.acceptanceTokenId || null,
      lastV5EvidenceId: guided.lastV5EvidenceId || null,
      lastBootstrapV5EvidenceId: guided.lastBootstrapV5EvidenceId || null,
      lastDevelopmentUpdateV5EvidenceId: guided.lastDevelopmentUpdateV5EvidenceId || null,
      lastDevelopmentUpdateEvidenceResolution: clone(guided.lastDevelopmentUpdateEvidenceResolution || null),
      lastPromotionCode: guided.lastPromotion && guided.lastPromotion.code || null,
      lastError: clone(guided.lastError || null),
      consolePasteRequiredForNormalUse: false,
      explicitAcceptanceRequired: true,
      explicitReflectionActionRequired: true,
      explicitPromotionRequired: true,
      directUserGesturePickerBindingRequired: true,
      selectedDirectoryReuseSupported: true,
      automaticAcceptanceAllowed: false,
      automaticBaselinePromotionAllowed: false,
      directRepositoryMutationAllowed: false,
      updatedAt: guided.updatedAt || null
    };
  }

  Object.assign(namespace.api, {
    initializeGuidedRepositoryOperations: initializeGuidedRepositoryOperations,
    resolveGuidedRepositoryCanonical: resolveCurrentCanonical,
    scanGuidedRepository: scanGuidedRepository,
    receiveGuidedAndroidToPcSync: receiveGuidedAndroidToPcSync,
    receiveGuidedMutationPackage: receiveGuidedMutationPackage,
    approveGuidedMutation: approveGuidedMutation,
    reflectGuidedMutation: reflectGuidedMutation,
    promoteGuidedReflection: promoteGuidedReflection,
    verifyPhase18BootstrapRelease: verifyPhase18BootstrapRelease,
    promotePhase18BootstrapRelease: promotePhase18BootstrapRelease,
    verifyGuidedDevelopmentReleaseUpdate: verifyGuidedDevelopmentReleaseUpdate,
    promoteGuidedDevelopmentReleaseUpdate: promoteGuidedDevelopmentReleaseUpdate,
    runGuidedReloadValidation: runGuidedReloadValidation,
    getGuidedRepositoryOperationsStatus: getGuidedRepositoryOperationsStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.guidedOperations = {
    id: "REPOSITORY-010-GUIDED-OPERATIONS",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 18,
    additiveOrchestrationOnly: true,
    phase17SafetyBoundaryReused: true,
    consolePasteRequiredForNormalUse: false,
    directUserGesturePickerBindingRequired: true,
    selectedDirectoryReuseSupported: true,
    developmentUpdateFlowSupported: true,
    persistedDevelopmentReleaseEvidenceRecoverySupported: true,
    ambiguousPersistedEvidenceAutoSelectionAllowed: false,
    automaticAcceptanceAllowed: false,
    automaticBaselinePromotionAllowed: false,
    directRepositoryMutationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
