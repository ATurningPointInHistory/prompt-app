/* ============================================================
   FILE: 17_external_intelligence_claim.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.6.0
   Phase 07: Versioned Atomic Claim Candidates
   Decision: 026 / Supporting 008 / 037 / 042
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("claim");
  if (!(state.claimCandidates instanceof Map)) state.claimCandidates = new Map();

  async function sha256Hex(text) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") throw new Error("SHA-256 capability unavailable");
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text == null ? "" : text)));
    return Array.from(new Uint8Array(digest)).map(function hex(b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function getNormalizedRecord(id) {
    const key = internal.text(id, "");
    return key && state.normalizedRecords.has(key) ? state.normalizedRecords.get(key) : null;
  }

  async function createExternalIntelligenceClaimCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const normalized = getNormalizedRecord(x.normalizedRecordId);
    if (!normalized) return internal.buildResult(false, "EXTERNAL010_CLAIM_NORMALIZED_RECORD_REQUIRED", "Blocked", null);
    const claimType = internal.text(x.claimType, "UNKNOWN").toUpperCase();
    const atomicClaim = internal.isPlainObject(x.atomicClaim) ? internal.clone(x.atomicClaim) : null;
    if (!atomicClaim || Object.keys(atomicClaim).length === 0) return internal.buildResult(false, "EXTERNAL010_ATOMIC_CLAIM_REQUIRED", "Blocked", null);
    const claimantId = internal.text(x.claimantId, "") || null;
    const publisherId = internal.text(x.publisherId, "") || null;
    const extractorId = internal.text(x.claimExtractorId, "");
    const extractorVersion = internal.text(x.claimExtractorVersion, "");
    if (!extractorId || !extractorVersion) return internal.buildResult(false, "EXTERNAL010_CLAIM_EXTRACTOR_ID_VERSION_REQUIRED", "Blocked", null);
    const rawContextReference = internal.text(x.rawContextReference, "");
    if (!rawContextReference) return internal.buildResult(false, "EXTERNAL010_CLAIM_RAW_CONTEXT_REFERENCE_REQUIRED", "Blocked", null);

    const stableMaterial = internal.stableStringify({ sourceEvidenceId: normalized.sourceEvidenceId, rawEvidenceId: normalized.rawEvidenceId, claimType, claimantId, publisherId, atomicClaim });
    const stableHash = await sha256Hex(stableMaterial);
    const claimId = internal.text(x.claimId, "") || ("EXTERNAL-010-CLAIM-" + stableHash.slice(0, 32).toUpperCase());
    const prior = Array.from(state.claimCandidates.values()).filter(function sameClaim(r) { return r.claimId === claimId; }).sort(function newest(a,b){return String(b.createdAt).localeCompare(String(a.createdAt));})[0] || null;
    const extractionState = internal.text(x.extractionState, "EXTRACTED").toUpperCase();
    const record = internal.deepFreeze({
      claimCandidateId: internal.nextId("EXTERNAL-010-CLAIM-CANDIDATE"),
      claimId,
      normalizedRecordId: normalized.normalizedRecordId,
      sourceEvidenceId: normalized.sourceEvidenceId,
      rawEvidenceId: normalized.rawEvidenceId,
      claimType,
      claimantId,
      publisherId,
      claimantPublisherSeparated: claimantId !== publisherId || (claimantId === null && publisherId === null),
      claimExtractorId: extractorId,
      claimExtractorVersion: extractorVersion,
      extractionState,
      extractionConfidence: internal.text(x.extractionConfidence, "UNKNOWN").toUpperCase(),
      assertedAt: x.assertedAt ? String(x.assertedAt) : null,
      targetTime: x.targetTime ? String(x.targetTime) : null,
      temporalContextId: internal.text(x.temporalContextId, "") || null,
      atomicClaim,
      rawContextReference,
      lineageReference: { normalizedRecordId: normalized.normalizedRecordId, sourceEvidenceId: normalized.sourceEvidenceId, rawEvidenceId: normalized.rawEvidenceId },
      supersedesClaimCandidateId: prior ? prior.claimCandidateId : null,
      evidenceEqualsClaim: false,
      claimEqualsTruth: false,
      claimExtractionEqualsKnowledgePromotion: false,
      truthVerified: false,
      knowledgePromotionPerformed: false,
      toolAuthorityGranted: false,
      repositoryAuthorityGranted: false,
      historicalClaimCandidatePreserved: true,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("claimCandidate", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-CLAIM-CANDIDATE", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_CLAIM_CANDIDATE_INVALID", "Blocked", { contract: cv, schema: sv });
    state.claimCandidates.set(record.claimCandidateId, record);
    internal.touch();
    return internal.buildResult(true, prior ? "EXTERNAL010_CLAIM_CANDIDATE_REEXTRACTED" : "EXTERNAL010_CLAIM_CANDIDATE_CREATED", "Candidate", { claimCandidate: internal.clone(record), stableClaimId: claimId, truthEstablished: false, knowledgePromotionPerformed: false });
  }

  function getExternalIntelligenceClaimCandidate(claimCandidateId) {
    const id = internal.text(claimCandidateId, "");
    const record = id && state.claimCandidates.get(id);
    return record ? internal.clone(record) : null;
  }

  function listExternalIntelligenceClaimCandidates(input) {
    const x = internal.isPlainObject(input) ? input : {};
    return Array.from(state.claimCandidates.values()).filter(function filter(record) {
      if (x.claimId && record.claimId !== x.claimId) return false;
      if (x.sourceEvidenceId && record.sourceEvidenceId !== x.sourceEvidenceId) return false;
      if (x.claimType && record.claimType !== String(x.claimType).toUpperCase()) return false;
      return true;
    }).map(internal.clone);
  }

  function initializeExternalIntelligenceClaim() {
    namespace.modules.claim.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_CLAIM_INITIALIZED", "Ready", { atomicClaimCandidates: true, claimantPublisherSeparated: true, claimEqualsTruth: false, claimExtractionEqualsKnowledgePromotion: false });
  }

  Object.assign(namespace.api, { initializeExternalIntelligenceClaim, createExternalIntelligenceClaimCandidate, getExternalIntelligenceClaimCandidate, listExternalIntelligenceClaimCandidates });
  Object.assign(namespace, namespace.api);
  namespace.modules.claim = { id: "EXTERNAL-010-CLAIM", version: MODULE_VERSION, status: "Loaded", phase: 7, decisions: ["026"], supporting: ["008", "037", "042"], loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
