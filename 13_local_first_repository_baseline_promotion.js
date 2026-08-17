/* ============================================================
   FILE: 13_local_first_repository_baseline_promotion.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.13.0 / Module: Baseline Promotion 1.0.0
   Phase 14: V5-Bound Explicit Canonical Baseline Promotion
   Decision-009: Project Owner Explicit Revision Advancement
   IMPORTANT: Promotion changes metadata authority only.
              It never writes Canonical Repository source files.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Baseline Promotion blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("baselinePromotion");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const CANONICAL_REVISION_HINT_KEY = "REPOSITORY010_LAST_EXPLICIT_CANONICAL_REVISION_ID";

  if (!(state.baselinePromotionCandidates instanceof Map)) state.baselinePromotionCandidates = new Map();
  if (!(state.baselinePromotionEvidence instanceof Map)) state.baselinePromotionEvidence = new Map();

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function each(key) { out[key] = stableValue(value[key]); });
    return out;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256(value) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") throw new Error("WebCrypto SHA-256 is required for Baseline Promotion.");
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value == null ? "" : value)));
    return Array.from(new Uint8Array(digest)).map(function hex(item) { return item.toString(16).padStart(2, "0"); }).join("");
  }

  function fail(code, message, data) {
    state.baselinePromotionStatus = "Blocked";
    state.lastBaselinePromotionError = { message: String(message || code || "Baseline Promotion blocked."), at: internal.nowIso() };
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(state.lastBaselinePromotionError) });
  }

  function parseRevisionSequence(value) {
    const match = internal.text(value, "").match(/^REPOSITORY010-CANONICAL-REVISION-(\d{4,})$/);
    if (!match) return null;
    const sequence = Number(match[1]);
    return Number.isInteger(sequence) && sequence >= 0 ? sequence : null;
  }

  function descriptorIdForRevision(revisionId) {
    const sequence = parseRevisionSequence(revisionId);
    return sequence === null ? "" : "REPOSITORY010-PC-CANONICAL-BASELINE-DESCRIPTOR-" + String(sequence).padStart(4, "0");
  }

  function persistRevisionHint(revisionId) {
    try {
      if (!global.localStorage || parseRevisionSequence(revisionId) === null) return false;
      global.localStorage.setItem(CANONICAL_REVISION_HINT_KEY, revisionId);
      return true;
    } catch (_) { return false; }
  }

  async function ensurePersistence() {
    if (typeof namespace.initializeLocalFirstRepositoryPersistence !== "function") throw new Error("Repository Persistence API is unavailable.");
    if (typeof namespace.initializeControlledTransactionPersistence !== "function") throw new Error("Controlled Transaction Persistence API is unavailable.");
    const main = await namespace.initializeLocalFirstRepositoryPersistence();
    if (!main || main.ok !== true) throw new Error("Repository Persistence initialization failed.");
    const controlled = await namespace.initializeControlledTransactionPersistence();
    if (!controlled || controlled.ok !== true) throw new Error("Controlled Transaction Persistence initialization failed.");
    return { main: main, controlled: controlled };
  }

  function setRuntimeBaseline(baseline) {
    if (!baseline) return false;
    if (!(state.canonicalBaselineDescriptors instanceof Map)) state.canonicalBaselineDescriptors = new Map();
    const created = typeof namespace.createCanonicalBaselineDescriptor === "function"
      ? namespace.createCanonicalBaselineDescriptor(baseline)
      : null;
    const record = created && created.ok === true ? created.data.record : internal.clone(baseline);
    state.canonicalBaselineDescriptors.set(record.canonicalBaselineDescriptorId, internal.deepFreeze(internal.clone(record)));
    state.lastCanonicalBaseline = internal.clone(record);
    state.canonicalBaselineStatus = "Established";
    persistRevisionHint(record.canonicalRevisionId);
    internal.touch();
    return true;
  }

  async function restorePersistedBaselines() {
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const valid = (Array.isArray(records) ? records : []).filter(function filter(record) {
      const validation = typeof namespace.validateContract === "function"
        ? namespace.validateContract("canonicalBaselineDescriptor", record)
        : { valid: false };
      return validation.valid === true;
    }).sort(function sort(a, b) {
      const sa = parseRevisionSequence(a.canonicalRevisionId);
      const sb = parseRevisionSequence(b.canonicalRevisionId);
      return Number(sa == null ? -1 : sa) - Number(sb == null ? -1 : sb);
    });

    valid.forEach(function each(record) {
      if (!(state.canonicalBaselineDescriptors instanceof Map)) state.canonicalBaselineDescriptors = new Map();
      state.canonicalBaselineDescriptors.set(record.canonicalBaselineDescriptorId, internal.deepFreeze(internal.clone(record)));
    });
    if (valid.length) setRuntimeBaseline(valid[valid.length - 1]);
    return valid;
  }

  async function restorePromotionRecords() {
    const candidates = await namespace.listPersistedLocalFirstRepositoryRecords("baselinePromotionCandidate");
    (Array.isArray(candidates) ? candidates : []).forEach(function each(record) {
      const validation = namespace.validateContract("baselinePromotionCandidateDescriptor", record);
      if (validation.valid === true) state.baselinePromotionCandidates.set(record.promotionCandidateId, internal.deepFreeze(internal.clone(record)));
    });
    const evidence = await namespace.listPersistedLocalFirstRepositoryRecords("baselinePromotionEvidence");
    (Array.isArray(evidence) ? evidence : []).forEach(function each(record) {
      const validation = namespace.validateContract("baselinePromotionEvidenceDescriptor", record);
      if (validation.valid === true) state.baselinePromotionEvidence.set(record.promotionEvidenceId, internal.deepFreeze(internal.clone(record)));
    });
    return { candidateCount: state.baselinePromotionCandidates.size, evidenceCount: state.baselinePromotionEvidence.size };
  }

  async function readControlledRecord(id) {
    if (!id || typeof namespace.getControlledTransactionRecord !== "function") return null;
    return namespace.getControlledTransactionRecord("transactionJournal", id);
  }

  function normalizeV5Evidence(record) {
    if (!record || typeof record !== "object") return null;

    if (record.schema === "REPOSITORY-010-PHASE13-V5-EVIDENCE-COMPANION") {
      if (record.v5PostReflectionVerified !== true || record.persistentReflectionPerformed !== true || record.canonicalMutationPerformed !== true || record.repositoryRestored === true || record.canonicalRevisionPromoted === true) return null;
      return {
        evidenceId: record.transactionId,
        evidenceHash: internal.text(record.evidenceHash, internal.text(record.closurePlanHash, "")),
        sourceTransactionId: internal.text(record.sourceTransactionId, ""),
        previousCanonicalRevisionId: internal.text(record.canonicalRevisionId, internal.text(record.baseRevisionId, "")),
        targetNodeId: internal.text(record.targetNodeId, ""),
        targetFile: internal.text(record.targetFile, ""),
        targetFileSha256: internal.text(record.afterTargetFileSha256, ""),
        manifestHash: internal.text(record.expectedAfterManifestHash, ""),
        scriptSetHash: internal.text(record.expectedAfterScriptSetHash, ""),
        manifestFileSha256: internal.text(record.expectedAfterManifestFileSha256, ""),
        indexFileSha256: internal.text(record.expectedAfterIndexFileSha256, ""),
        repositoryFileCount: Number(record.repositoryFileCountAtV5 || 0),
        sourceSchema: record.schema
      };
    }

    if (record.schema === "REPOSITORY-010-CONTROLLED-TRANSACTION-JOURNAL") {
      const closure = record.closurePlan || {};
      if (record.status !== "V5_VERIFIED_AWAITING_BASELINE_PROMOTION" || record.v5PostReflectionVerified !== true || record.persistentReflectionPerformed !== true || record.canonicalMutationPerformed !== true || record.repositoryRestored === true || record.canonicalRevisionPromoted === true) return null;
      return {
        evidenceId: record.transactionId,
        evidenceHash: internal.text(record.closurePlanHash, internal.text(closure.closurePlanHash, "")),
        sourceTransactionId: record.transactionId,
        previousCanonicalRevisionId: internal.text(record.canonicalRevisionId, internal.text(record.baseRevisionId, "")),
        targetNodeId: internal.text(record.targetNodeId, ""),
        targetFile: internal.text(record.targetFile, ""),
        targetFileSha256: internal.text(record.afterFileSha256, ""),
        manifestHash: internal.text(record.expectedAfterManifestHash, internal.text(closure.expectedAfterManifestHash, "")),
        scriptSetHash: internal.text(record.expectedAfterScriptSetHash, internal.text(closure.expectedAfterScriptSetHash, "")),
        manifestFileSha256: internal.text(record.afterManifestFileSha256, internal.text(closure.afterManifestFileSha256, "")),
        indexFileSha256: internal.text(record.afterIndexFileSha256, internal.text(closure.afterIndexFileSha256, "")),
        repositoryFileCount: Number(record.repositoryFileCount || 0),
        sourceSchema: record.schema
      };
    }
    return null;
  }

  async function resolveV5Evidence(evidenceId) {
    const requested = internal.text(evidenceId, "");
    if (requested) {
      const exact = await readControlledRecord(requested);
      const normalized = normalizeV5Evidence(exact);
      if (normalized) return normalized;
    }
    const records = typeof namespace.listControlledTransactionRecords === "function"
      ? await namespace.listControlledTransactionRecords("transactionJournal")
      : [];
    const normalized = (Array.isArray(records) ? records : []).map(normalizeV5Evidence).filter(Boolean);
    normalized.sort(function sort(a, b) { return internal.text(a.evidenceId, "").localeCompare(internal.text(b.evidenceId, "")); });
    return normalized.length ? normalized[normalized.length - 1] : null;
  }

  async function migrateBootstrapPromotionEvidence() {
    const existingEvidence = await namespace.listPersistedLocalFirstRepositoryRecords("baselinePromotionEvidence");
    if (Array.isArray(existingEvidence) && existingEvidence.length) return { migrated: false, reason: "formal-evidence-already-exists" };

    const records = await namespace.listControlledTransactionRecords("transactionJournal");
    const bootstrap = (Array.isArray(records) ? records : []).filter(function filter(record) {
      return record && record.schema === "REPOSITORY-010-BASELINE-PROMOTION-BOOTSTRAP" && record.promotionStatus === "promoted" && record.canonicalRevisionPromoted === true && record.explicitProjectOwnerAction === true && record.baseline;
    }).sort(function sort(a, b) { return internal.text(a.promotedAt, "").localeCompare(internal.text(b.promotedAt, "")); }).pop();
    if (!bootstrap) return { migrated: false, reason: "bootstrap-evidence-not-found" };

    const baselineValidation = namespace.validateContract("canonicalBaselineDescriptor", bootstrap.baseline);
    if (!baselineValidation.valid) return { migrated: false, reason: "bootstrap-baseline-invalid" };

    const source = await readControlledRecord(bootstrap.sourceV5EvidenceId);
    const v5 = normalizeV5Evidence(source);
    if (!v5) return { migrated: false, reason: "bootstrap-v5-source-invalid" };

    const candidateId = "REPOSITORY010-MIGRATED-PROMOTION-CANDIDATE-" + bootstrap.canonicalRevisionId.replace(/^.*-/, "");
    const candidate = {
      promotionCandidateId: candidateId,
      sourceEvidenceId: bootstrap.sourceV5EvidenceId,
      sourceTransactionId: bootstrap.sourceTransactionId,
      previousCanonicalRevisionId: bootstrap.previousCanonicalRevisionId,
      suggestedCanonicalRevisionId: bootstrap.canonicalRevisionId,
      projectId: bootstrap.projectId,
      repositoryId: bootstrap.repositoryId,
      targetNodeId: bootstrap.targetNodeId,
      directoryName: bootstrap.directoryName,
      manifestHash: bootstrap.manifestHash,
      scriptSetHash: bootstrap.scriptSetHash,
      scriptCount: Number(bootstrap.scriptCount),
      targetFile: v5.targetFile,
      targetFileSha256: bootstrap.targetFileSha256,
      manifestFileSha256: bootstrap.manifestFileSha256,
      indexFileSha256: bootstrap.indexFileSha256,
      repositoryStateHash: bootstrap.repositoryStateHash,
      sourceV5Verified: true,
      freshRevalidationPassed: true,
      exactPostV5FileHashesVerified: true,
      projectOwnerConfirmationRequired: true,
      automaticPromotionAllowed: false,
      authorityEffect: "none",
      createdAt: internal.text(bootstrap.preparedAt, internal.text(bootstrap.promotedAt, internal.nowIso())),
      immutable: true
    };
    const candidateValidation = namespace.validateContract("baselinePromotionCandidateDescriptor", candidate);
    if (!candidateValidation.valid) return { migrated: false, reason: "bootstrap-candidate-invalid", validation: candidateValidation };

    const evidence = {
      promotionEvidenceId: "REPOSITORY010-FORMAL-" + bootstrap.transactionId,
      promotionCandidateId: candidateId,
      sourceEvidenceId: bootstrap.sourceV5EvidenceId,
      sourceTransactionId: bootstrap.sourceTransactionId,
      previousCanonicalRevisionId: bootstrap.previousCanonicalRevisionId,
      canonicalRevisionId: bootstrap.canonicalRevisionId,
      canonicalBaselineDescriptorId: bootstrap.canonicalBaselineDescriptorId,
      projectId: bootstrap.projectId,
      repositoryId: bootstrap.repositoryId,
      targetNodeId: bootstrap.targetNodeId,
      directoryName: bootstrap.directoryName,
      manifestHash: bootstrap.manifestHash,
      scriptSetHash: bootstrap.scriptSetHash,
      scriptCount: Number(bootstrap.scriptCount),
      repositoryStateHash: bootstrap.repositoryStateHash,
      sourceV5Verified: true,
      freshRevalidationPassed: true,
      exactPostV5FileHashesVerified: true,
      explicitProjectOwnerAction: true,
      canonicalRevisionPromoted: true,
      automaticPromotionPerformed: false,
      canonicalSourceFilesWritten: false,
      syncEngineInvoked: false,
      githubReflectionPerformed: false,
      establishedBy: "Project Owner",
      promotedAt: internal.text(bootstrap.promotedAt, internal.nowIso()),
      immutable: true
    };
    const evidenceValidation = namespace.validateContract("baselinePromotionEvidenceDescriptor", evidence);
    if (!evidenceValidation.valid) return { migrated: false, reason: "bootstrap-evidence-invalid", validation: evidenceValidation };

    const baselinePut = await namespace.persistLocalFirstRepositoryRecord("canonicalBaseline", bootstrap.baseline);
    const candidatePut = await namespace.persistLocalFirstRepositoryRecord("baselinePromotionCandidate", candidate);
    const evidencePut = await namespace.persistLocalFirstRepositoryRecord("baselinePromotionEvidence", evidence);
    if (!baselinePut.ok || !candidatePut.ok || !evidencePut.ok) return { migrated: false, reason: "bootstrap-persistence-failed", baselinePut: baselinePut, candidatePut: candidatePut, evidencePut: evidencePut };

    setRuntimeBaseline(bootstrap.baseline);
    state.baselinePromotionCandidates.set(candidateId, internal.deepFreeze(internal.clone(candidate)));
    state.baselinePromotionEvidence.set(evidence.promotionEvidenceId, internal.deepFreeze(internal.clone(evidence)));
    return { migrated: true, canonicalRevisionId: bootstrap.canonicalRevisionId, promotionEvidenceId: evidence.promotionEvidenceId };
  }

  async function initializeBaselinePromotion() {
    try {
      await ensurePersistence();
      const migration = await migrateBootstrapPromotionEvidence();
      const baselines = await restorePersistedBaselines();
      const restored = await restorePromotionRecords();
      state.baselinePromotionStatus = "Ready";
      state.lastBaselinePromotionError = null;
      namespace.modules.baselinePromotion.status = "Ready";
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_BASELINE_PROMOTION_INITIALIZED", "Ready", {
        moduleVersion: MODULE_VERSION,
        restoredBaselineCount: baselines.length,
        restoredCandidateCount: restored.candidateCount,
        restoredEvidenceCount: restored.evidenceCount,
        bootstrapMigration: migration,
        currentCanonicalRevisionId: state.lastCanonicalBaseline ? state.lastCanonicalBaseline.canonicalRevisionId : null,
        projectOwnerConfirmationRequired: true,
        automaticPromotionAllowed: false,
        canonicalSourceFilesWritten: false,
        syncEngineInvoked: false,
        githubReflectionPerformed: false
      });
    } catch (error) {
      return fail("REPOSITORY010_BASELINE_PROMOTION_INITIALIZATION_FAILED", error && error.message ? error.message : String(error));
    }
  }

  async function inspectExactPostV5State(v5) {
    const scanResult = await namespace.scanDesktopRepositoryDirectory();
    if (!scanResult || scanResult.ok !== true) throw new Error("Fresh PC Repository Read-only scan is required.");
    const scan = scanResult.data;
    const baseline = state.lastCanonicalBaseline || null;
    if (!baseline || baseline.explicitlyEstablished !== true) throw new Error("Current explicit Canonical Baseline is required.");
    if (baseline.canonicalRevisionId !== v5.previousCanonicalRevisionId) throw new Error("V5 source Previous Canonical Revision does not match current explicit baseline.");
    if (scan.descriptor.nodeId !== TARGET_NODE_ID || v5.targetNodeId !== TARGET_NODE_ID) throw new Error("Canonical Node binding mismatch.");
    if (scan.integrity.status !== "verified" || scan.integrity.allFileHashesVerified !== true || scan.integrity.scriptSetVerified !== true || scan.integrity.manifestHashVerified !== true || scan.integrity.indexSequenceMatches !== true) throw new Error("Fresh Repository integrity is not verified.");
    if (scan.staticManifest.manifestHash !== v5.manifestHash || scan.staticManifest.scriptSetHash !== v5.scriptSetHash) throw new Error("Fresh Repository does not match V5 post-reflection integrity hashes.");

    const targetRead = await namespace.readDesktopRepositoryFileText(v5.targetFile);
    const manifestRead = await namespace.readDesktopRepositoryFileText("00_script_manifest.json");
    const indexRead = await namespace.readDesktopRepositoryFileText("index.html");
    if (!targetRead.ok || !manifestRead.ok || !indexRead.ok) throw new Error("Exact Post-V5 file read failed.");
    if (targetRead.data.sha256 !== v5.targetFileSha256 || manifestRead.data.sha256 !== v5.manifestFileSha256 || indexRead.data.sha256 !== v5.indexFileSha256) throw new Error("Exact Post-V5 file hash mismatch.");

    const manifest = JSON.parse(manifestRead.data.text);
    return { scan: scan, targetRead: targetRead.data, manifestRead: manifestRead.data, indexRead: indexRead.data, manifest: manifest };
  }

  async function createBaselinePromotionCandidate(options) {
    const opts = internal.isPlainObject(options) ? options : {};
    try {
      await initializeBaselinePromotion();
      const v5 = await resolveV5Evidence(opts.sourceEvidenceId);
      if (!v5) throw new Error("Eligible Phase 13 V5 Evidence is required.");
      const exact = await inspectExactPostV5State(v5);
      const suggestion = await namespace.getCanonicalRevisionSuggestion();
      const suggested = internal.text(suggestion && suggestion.data && suggestion.data.nextCanonicalRevisionCandidate, "");
      if (!suggested) throw new Error("Next Canonical Revision suggestion is unresolved.");
      if (suggestion.data.lastEstablishedCanonicalRevisionId !== v5.previousCanonicalRevisionId) throw new Error("Canonical Revision suggestion is not based on the V5 source baseline.");
      const requestedRevision = internal.text(opts.canonicalRevisionId, suggested);
      if (requestedRevision !== suggested) throw new Error("Phase 14 initial implementation requires the deterministic next Canonical Revision candidate.");

      const repositoryStateHash = await sha256(stableStringify({
        projectId: exact.scan.descriptor.projectId,
        repositoryId: exact.scan.descriptor.repositoryId,
        nodeId: exact.scan.descriptor.nodeId,
        previousCanonicalRevisionId: v5.previousCanonicalRevisionId,
        suggestedCanonicalRevisionId: requestedRevision,
        manifestHash: exact.scan.staticManifest.manifestHash,
        scriptSetHash: exact.scan.staticManifest.scriptSetHash,
        scriptCount: exact.scan.staticManifest.scriptCount,
        targetFile: v5.targetFile,
        targetFileSha256: exact.targetRead.sha256,
        manifestFileSha256: exact.manifestRead.sha256,
        indexFileSha256: exact.indexRead.sha256,
        fileHashes: exact.manifest.hashes,
        sourceEvidenceId: v5.evidenceId,
        sourceEvidenceHash: v5.evidenceHash
      }));

      const candidate = {
        promotionCandidateId: internal.text(opts.promotionCandidateId, internal.nextId("REPOSITORY010-BASELINE-PROMOTION-CANDIDATE")),
        sourceEvidenceId: v5.evidenceId,
        sourceTransactionId: v5.sourceTransactionId,
        previousCanonicalRevisionId: v5.previousCanonicalRevisionId,
        suggestedCanonicalRevisionId: requestedRevision,
        projectId: exact.scan.descriptor.projectId,
        repositoryId: exact.scan.descriptor.repositoryId,
        targetNodeId: exact.scan.descriptor.nodeId,
        directoryName: exact.scan.directoryName,
        manifestHash: exact.scan.staticManifest.manifestHash,
        scriptSetHash: exact.scan.staticManifest.scriptSetHash,
        scriptCount: Number(exact.scan.staticManifest.scriptCount),
        targetFile: v5.targetFile,
        targetFileSha256: exact.targetRead.sha256,
        manifestFileSha256: exact.manifestRead.sha256,
        indexFileSha256: exact.indexRead.sha256,
        repositoryStateHash: repositoryStateHash,
        sourceV5Verified: true,
        freshRevalidationPassed: true,
        exactPostV5FileHashesVerified: true,
        projectOwnerConfirmationRequired: true,
        automaticPromotionAllowed: false,
        authorityEffect: "none",
        createdAt: internal.nowIso(),
        immutable: true
      };
      const validation = namespace.validateContract("baselinePromotionCandidateDescriptor", candidate);
      if (!validation.valid) throw new Error("Baseline Promotion Candidate contract validation failed.");
      const persisted = await namespace.persistLocalFirstRepositoryRecord("baselinePromotionCandidate", candidate);
      if (!persisted || persisted.ok !== true) throw new Error("Baseline Promotion Candidate persistence failed.");
      const frozen = internal.deepFreeze(internal.clone(candidate));
      state.baselinePromotionCandidates.set(candidate.promotionCandidateId, frozen);
      state.lastBaselinePromotionCandidate = internal.clone(frozen);
      state.baselinePromotionStatus = "Candidate Prepared";
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_BASELINE_PROMOTION_CANDIDATE_PREPARED", "Prepared", {
        candidate: internal.clone(frozen),
        validation: validation,
        projectOwnerConfirmationRequired: true,
        authorityEffect: "none",
        canonicalRevisionPromoted: false,
        automaticPromotionPerformed: false,
        canonicalSourceFilesWritten: false,
        syncEngineInvoked: false
      });
    } catch (error) {
      return fail("REPOSITORY010_BASELINE_PROMOTION_CANDIDATE_FAILED", error && error.message ? error.message : String(error));
    }
  }

  async function getPromotionCandidate(id) {
    const key = internal.text(id, "");
    if (!key) return null;
    if (state.baselinePromotionCandidates.has(key)) return internal.clone(state.baselinePromotionCandidates.get(key));
    const persisted = await namespace.getPersistedLocalFirstRepositoryRecord("baselinePromotionCandidate", key);
    if (persisted) state.baselinePromotionCandidates.set(key, internal.deepFreeze(internal.clone(persisted)));
    return persisted ? internal.clone(persisted) : null;
  }

  async function revalidateBaselinePromotionCandidate(candidateId) {
    try {
      await initializeBaselinePromotion();
      const candidate = await getPromotionCandidate(candidateId);
      if (!candidate) throw new Error("Baseline Promotion Candidate not found.");
      const source = await resolveV5Evidence(candidate.sourceEvidenceId);
      if (!source) throw new Error("Bound V5 Evidence is unavailable or no longer eligible.");
      if (source.sourceTransactionId !== candidate.sourceTransactionId || source.previousCanonicalRevisionId !== candidate.previousCanonicalRevisionId) throw new Error("Bound V5 Evidence lineage mismatch.");
      const exact = await inspectExactPostV5State(source);
      const match = exact.scan.staticManifest.manifestHash === candidate.manifestHash &&
        exact.scan.staticManifest.scriptSetHash === candidate.scriptSetHash &&
        Number(exact.scan.staticManifest.scriptCount) === Number(candidate.scriptCount) &&
        exact.targetRead.sha256 === candidate.targetFileSha256 &&
        exact.manifestRead.sha256 === candidate.manifestFileSha256 &&
        exact.indexRead.sha256 === candidate.indexFileSha256;
      if (!match) throw new Error("Promotion Candidate no longer matches the current Post-V5 Repository state.");
      return internal.buildResult(true, "REPOSITORY010_BASELINE_PROMOTION_FRESH_REVALIDATED", "Verified", {
        promotionCandidateId: candidate.promotionCandidateId,
        previousCanonicalRevisionId: candidate.previousCanonicalRevisionId,
        suggestedCanonicalRevisionId: candidate.suggestedCanonicalRevisionId,
        manifestHash: candidate.manifestHash,
        scriptSetHash: candidate.scriptSetHash,
        scriptCount: candidate.scriptCount,
        freshRevalidationPassed: true,
        exactPostV5FileHashesVerified: true,
        canonicalSourceFilesWritten: false,
        authorityEffect: "none"
      });
    } catch (error) {
      return fail("REPOSITORY010_BASELINE_PROMOTION_FRESH_REVALIDATION_FAILED", error && error.message ? error.message : String(error));
    }
  }

  async function promoteCanonicalBaseline(options) {
    const opts = internal.isPlainObject(options) ? options : {};
    if (opts.explicitProjectOwnerAction !== true) {
      return fail("REPOSITORY010_BASELINE_PROMOTION_EXPLICIT_PROJECT_OWNER_ACTION_REQUIRED", "Project Owner explicit promotion action is required.", {
        projectOwnerConfirmationRequired: true,
        automaticPromotionAllowed: false,
        validationIsApproval: false
      });
    }

    try {
      await initializeBaselinePromotion();
      const candidate = await getPromotionCandidate(opts.promotionCandidateId);
      if (!candidate) throw new Error("Baseline Promotion Candidate not found.");
      const requestedRevision = internal.text(opts.canonicalRevisionId, candidate.suggestedCanonicalRevisionId);
      if (requestedRevision !== candidate.suggestedCanonicalRevisionId) throw new Error("Confirmed Canonical Revision must match the prepared candidate.");

      const fresh = await revalidateBaselinePromotionCandidate(candidate.promotionCandidateId);
      if (!fresh || fresh.ok !== true) throw new Error("Fresh pre-promotion revalidation failed.");

      const revisionResult = namespace.createRepositoryRevision({
        revisionId: requestedRevision,
        baseRevisionId: candidate.previousCanonicalRevisionId,
        parentRevisionId: candidate.previousCanonicalRevisionId,
        sourceNodeId: candidate.targetNodeId
      });
      if (!revisionResult || revisionResult.ok !== true) throw new Error("Canonical Revision metadata creation failed.");

      const manifestRead = await namespace.readDesktopRepositoryFileText("00_script_manifest.json");
      const indexRead = await namespace.readDesktopRepositoryFileText("index.html");
      if (!manifestRead.ok || !indexRead.ok) throw new Error("Promotion metadata source read failed.");
      const manifest = JSON.parse(manifestRead.data.text);

      const integrityId = internal.text(opts.integrityRecordId, "REPOSITORY010-CANONICAL-INTEGRITY-" + requestedRevision.replace(/^.*-/, ""));
      const integrityResult = namespace.createRepositoryIntegrityRecord({
        integrityRecordId: integrityId,
        revisionId: requestedRevision,
        fileHashes: manifest.hashes,
        manifestHash: candidate.manifestHash,
        scriptSetHash: candidate.scriptSetHash,
        contentHash: indexRead.data.sha256,
        repositoryStateHash: candidate.repositoryStateHash,
        integrityStatus: "verified"
      });
      if (!integrityResult || integrityResult.ok !== true) throw new Error("Canonical Integrity metadata creation failed.");

      const stateId = internal.text(opts.stateRecordId, "REPOSITORY010-CANONICAL-STATE-" + requestedRevision.replace(/^.*-/, ""));
      const stateResult = namespace.createRepositoryStateRecord({
        stateRecordId: stateId,
        repositoryId: candidate.repositoryId,
        nodeId: candidate.targetNodeId,
        revisionId: requestedRevision,
        state: "canonical",
        integrityStatus: "verified"
      });
      if (!stateResult || stateResult.ok !== true) throw new Error("Canonical State metadata creation failed.");

      const revisionPut = await namespace.persistLocalFirstRepositoryRecord("revision", revisionResult.data.record);
      const integrityPut = await namespace.persistLocalFirstRepositoryRecord("integrityRecord", integrityResult.data.record);
      const statePut = await namespace.persistLocalFirstRepositoryRecord("stateRecord", stateResult.data.record);
      if (!revisionPut.ok || !integrityPut.ok || !statePut.ok) throw new Error("Canonical Promotion metadata persistence failed before authority action.");

      const baselineDescriptorId = internal.text(opts.canonicalBaselineDescriptorId, descriptorIdForRevision(requestedRevision));
      if (!baselineDescriptorId) throw new Error("Canonical Baseline Descriptor ID could not be derived.");
      const baselineResult = namespace.establishExplicitCanonicalBaseline({
        canonicalRevisionId: requestedRevision,
        canonicalBaselineDescriptorId: baselineDescriptorId,
        explicitProjectOwnerAction: true
      });
      if (!baselineResult || baselineResult.ok !== true) throw new Error("Explicit Canonical Baseline establishment failed.");

      const baselinePut = await namespace.persistLocalFirstRepositoryRecord("canonicalBaseline", baselineResult.data.baseline);
      if (!baselinePut || baselinePut.ok !== true) throw new Error("Canonical Baseline persistence failed after explicit promotion. Metadata recovery is required.");

      const evidence = {
        promotionEvidenceId: internal.text(opts.promotionEvidenceId, internal.nextId("REPOSITORY010-BASELINE-PROMOTION-EVIDENCE")),
        promotionCandidateId: candidate.promotionCandidateId,
        sourceEvidenceId: candidate.sourceEvidenceId,
        sourceTransactionId: candidate.sourceTransactionId,
        previousCanonicalRevisionId: candidate.previousCanonicalRevisionId,
        canonicalRevisionId: requestedRevision,
        canonicalBaselineDescriptorId: baselineResult.data.baseline.canonicalBaselineDescriptorId,
        projectId: candidate.projectId,
        repositoryId: candidate.repositoryId,
        targetNodeId: candidate.targetNodeId,
        directoryName: candidate.directoryName,
        manifestHash: candidate.manifestHash,
        scriptSetHash: candidate.scriptSetHash,
        scriptCount: Number(candidate.scriptCount),
        repositoryStateHash: candidate.repositoryStateHash,
        sourceV5Verified: true,
        freshRevalidationPassed: true,
        exactPostV5FileHashesVerified: true,
        explicitProjectOwnerAction: true,
        canonicalRevisionPromoted: true,
        automaticPromotionPerformed: false,
        canonicalSourceFilesWritten: false,
        syncEngineInvoked: false,
        githubReflectionPerformed: false,
        establishedBy: "Project Owner",
        promotedAt: internal.nowIso(),
        immutable: true
      };
      const evidenceValidation = namespace.validateContract("baselinePromotionEvidenceDescriptor", evidence);
      if (!evidenceValidation.valid) throw new Error("Baseline Promotion Evidence contract validation failed after explicit promotion.");
      const evidencePut = await namespace.persistLocalFirstRepositoryRecord("baselinePromotionEvidence", evidence);
      if (!evidencePut || evidencePut.ok !== true) throw new Error("Baseline Promotion Evidence persistence failed after explicit promotion. Metadata recovery is required.");

      const frozen = internal.deepFreeze(internal.clone(evidence));
      state.baselinePromotionEvidence.set(evidence.promotionEvidenceId, frozen);
      state.lastBaselinePromotionEvidence = internal.clone(frozen);
      state.baselinePromotionStatus = "Promoted";
      persistRevisionHint(requestedRevision);
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_CANONICAL_BASELINE_PROMOTED", "Promoted", {
        previousCanonicalRevisionId: candidate.previousCanonicalRevisionId,
        canonicalRevisionId: requestedRevision,
        baseline: internal.clone(baselineResult.data.baseline),
        promotionEvidence: internal.clone(frozen),
        revisionPersisted: true,
        integrityPersisted: true,
        canonicalStatePersisted: true,
        canonicalBaselinePersisted: true,
        promotionEvidencePersisted: true,
        sourceV5Verified: true,
        freshRevalidationPassed: true,
        exactPostV5FileHashesVerified: true,
        explicitProjectOwnerAction: true,
        canonicalRevisionPromoted: true,
        automaticPromotionPerformed: false,
        canonicalSourceFilesWritten: false,
        syncEngineInvoked: false,
        githubReflectionPerformed: false
      });
    } catch (error) {
      return fail("REPOSITORY010_CANONICAL_BASELINE_PROMOTION_FAILED", error && error.message ? error.message : String(error), {
        explicitProjectOwnerAction: true,
        automaticPromotionPerformed: false,
        canonicalSourceFilesWritten: false,
        syncEngineInvoked: false,
        githubReflectionPerformed: false
      });
    }
  }

  async function listBaselinePromotionCandidates() {
    await initializeBaselinePromotion();
    return Array.from(state.baselinePromotionCandidates.values()).map(internal.clone);
  }

  async function listBaselinePromotionEvidence() {
    await initializeBaselinePromotion();
    return Array.from(state.baselinePromotionEvidence.values()).map(internal.clone);
  }

  function getBaselinePromotionStatus() {
    return {
      status: state.baselinePromotionStatus || "Not Initialized",
      phase: 14,
      moduleVersion: MODULE_VERSION,
      decisionId: "REPOSITORY-010-DECISION-009",
      model: "V5-Bound Explicit Baseline Promotion",
      candidateCount: state.baselinePromotionCandidates instanceof Map ? state.baselinePromotionCandidates.size : 0,
      evidenceCount: state.baselinePromotionEvidence instanceof Map ? state.baselinePromotionEvidence.size : 0,
      currentCanonicalRevisionId: state.lastCanonicalBaseline ? state.lastCanonicalBaseline.canonicalRevisionId : null,
      projectOwnerConfirmationRequired: true,
      automaticPromotionAllowed: false,
      validationIsApproval: false,
      identityGrantsAuthority: false,
      canonicalSourceFilesWritten: false,
      syncEngineImplemented: false,
      githubAutomaticReflectionAllowed: false,
      phase13JournalV5PersistenceHotfixRequired: false,
      lastCandidate: internal.clone(state.lastBaselinePromotionCandidate || null),
      lastEvidence: internal.clone(state.lastBaselinePromotionEvidence || null),
      lastError: internal.clone(state.lastBaselinePromotionError || null)
    };
  }

  Object.assign(namespace.api, {
    initializeBaselinePromotion: initializeBaselinePromotion,
    createBaselinePromotionCandidate: createBaselinePromotionCandidate,
    revalidateBaselinePromotionCandidate: revalidateBaselinePromotionCandidate,
    promoteCanonicalBaseline: promoteCanonicalBaseline,
    listBaselinePromotionCandidates: listBaselinePromotionCandidates,
    listBaselinePromotionEvidence: listBaselinePromotionEvidence,
    getBaselinePromotionStatus: getBaselinePromotionStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.baselinePromotion = {
    id: "REPOSITORY-010-BASELINE-PROMOTION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 14,
    decisionId: "REPOSITORY-010-DECISION-009",
    v5Bound: true,
    projectOwnerExplicitActionRequired: true,
    candidateAuthorityEffect: "none",
    automaticPromotionAllowed: false,
    canonicalBaselinePersistenceImplemented: true,
    promotionEvidencePersistenceImplemented: true,
    reloadRecoveryImplemented: true,
    bootstrapMigrationImplemented: true,
    canonicalSourceFilesWritten: false,
    syncEngineImplemented: false,
    githubAutomaticReflectionAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.initializeLocalFirstRepositoryBaselinePromotion = initializeBaselinePromotion;
  global.createLocalFirstRepositoryBaselinePromotionCandidate = createBaselinePromotionCandidate;
  global.revalidateLocalFirstRepositoryBaselinePromotionCandidate = revalidateBaselinePromotionCandidate;
  global.promoteLocalFirstRepositoryCanonicalBaseline = promoteCanonicalBaseline;
  global.getLocalFirstRepositoryBaselinePromotionStatus = getBaselinePromotionStatus;
})(typeof window !== "undefined" ? window : globalThis);
