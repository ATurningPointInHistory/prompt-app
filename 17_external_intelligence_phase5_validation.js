/* ============================================================
   FILE: 17_external_intelligence_phase5_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 05 Validation: Immutable Evidence / Storage / Incremental Persistence
   Decisions: 005 / 006 / 008 / 014
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 05 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase5Validation");
  const PURPOSE = "phase5-validation";

  function collector() {
    const checks = [];
    return { checks, check(name, passed, detail, group, severity) { checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "General", severity: severity || "Critical" }); } };
  }
  function summarize(checks) {
    const passed = checks.filter((x) => x.passed).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter((x) => !x.passed && x.severity === "Critical").length;
    return { passed, failed, total: checks.length, criticalFailed, health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0 };
  }
  async function grantAuthority(action, type, id, owned, purpose) {
    const p = internal.text(purpose, PURPOSE);
    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action, target: { type, id }, purpose: p, scope: { domain: "EXTERNAL-010", operation: action } });
    if (!candidate.ok) return { ok: false, candidate };
    owned.push(candidate.data.envelope.authorityEnvelopeId);
    const activated = await namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId, { validationOnly: true });
    return { ok: activated.ok === true, activated, envelopeId: candidate.data.envelope.authorityEnvelopeId };
  }
  function newestMockSuccessResponse() {
    const values = Array.from(state.acquisitionResponses.values()).filter((r) => r.status === "SUCCESS" && r.evidenceInput && r.evidenceInput.adapterId === VERSION_MANIFEST.acquisition.adapterIds.mock);
    values.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return values[0] ? internal.clone(values[0]) : null;
  }
  function buildMemoryPersistenceAdapter() {
    const content = new Map(); const evidence = new Map(); const raw = new Map(); const checkpoints = new Map();
    return {
      persistEvidence: async function(input) {
        const hash = input.acquisitionEvidence.contentHash;
        const created = !content.has(hash);
        const contentObject = Object.assign({}, input.contentObject, { storageProvider: "MEMORY_VALIDATION", storageReference: "memory://sha256/" + hash, integrityState: "VERIFIED", verifiedAt: internal.nowIso() });
        if (created) content.set(hash, internal.clone(contentObject));
        const rawEvidence = Object.assign({}, input.rawEvidence, { rawDataReference: contentObject.storageReference, storageClass: "HOT" });
        const acquisitionEvidence = internal.clone(input.acquisitionEvidence);
        evidence.set(acquisitionEvidence.evidenceId, internal.clone(acquisitionEvidence)); raw.set(rawEvidence.rawEvidenceId, internal.clone(rawEvidence));
        return internal.buildResult(true, "MEMORY_EVIDENCE_PERSISTED", "Ready", { persistence: { acquisitionEvidence, rawEvidence, contentObject: internal.clone(content.get(hash)), contentCreated: created, physicalContentDeduplicated: !created, metadataIndex: "MEMORY_VALIDATION", recoveryManifestReference: "memory://evidence/" + acquisitionEvidence.evidenceId, canonicalRepositoryMutationPerformed: false, knowledgePromotionPerformed: false } });
      },
      readEvidence: async function(input) {
        const ev = evidence.get(input.evidenceId); if (!ev) return internal.buildResult(false, "MEMORY_EVIDENCE_NOT_FOUND", "Blocked", null);
        const rr = raw.get(ev.rawEvidenceId); const co = content.get(ev.contentHash);
        return internal.buildResult(true, "MEMORY_EVIDENCE_READ", "Ready", { acquisitionEvidence: internal.clone(ev), rawEvidence: internal.clone(rr), contentObject: internal.clone(co), integrityState: "VERIFIED", contentAvailable: true, metadataIndex: "MEMORY_VALIDATION" });
      },
      integrityScan: async function() { return internal.buildResult(true, "MEMORY_EVIDENCE_INTEGRITY", "Ready", { valid: true, counts: { contentObjectCount: content.size, rawEvidenceCount: raw.size, acquisitionEvidenceCount: evidence.size, processingCheckpointCount: checkpoints.size }, missing: [], corrupted: [], orphan: [], orphanAutomaticDeletionPerformed: false }); },
      persistCheckpoint: async function(input) { checkpoints.set(input.checkpoint.checkpointId, internal.clone(input.checkpoint)); return internal.buildResult(true, "MEMORY_CHECKPOINT_PERSISTED", "Ready", { checkpoint: internal.clone(input.checkpoint), fullReprocessingRequired: false }); }
    };
  }

  async function runExternalIntelligencePhase5Validation() {
    const c = collector(); const check = c.check; const owned = [];
    try {
      check("Release Version is compatible with Phase 05 baseline", ["1.4.0", "1.5.0"].includes(VERSION_MANIFEST.release.version), VERSION_MANIFEST.release.version, "Foundation");
      check("Implementation Phase is Phase 05 or later", VERSION_MANIFEST.release.phase >= 5, VERSION_MANIFEST.release.implementationPhase, "Foundation");
      check("Design Freeze remains canonical", VERSION_MANIFEST.release.designFreezeId === "EXTERNAL-010-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Foundation");
      check("Roadmap remains 2.1.0", VERSION_MANIFEST.release.implementationRoadmapId === "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0", VERSION_MANIFEST.release.implementationRoadmapId, "Foundation");
      check("Phase 05 primary Decisions are 005/006/008/014", namespace.modules.evidencePersistence && internal.stableStringify(namespace.modules.evidencePersistence.decisions) === internal.stableStringify(["005","006","008","014"]), namespace.modules.evidencePersistence, "Foundation");

      const init = await namespace.initializeExternalIntelligenceFoundation();
      check("Phase 05 foundation initializes", init && init.ok === true, init && init.code, "Initialization");
      const p1 = await namespace.runExternalIntelligencePhase1Validation(); check("Phase 01 regression remains PASS", p1.failed === 0 && p1.health === 100, {passed:p1.passed,failed:p1.failed}, "Regression");
      const p2 = await namespace.runExternalIntelligencePhase2Validation({ requireGateway: false }); check("Phase 02 degraded regression remains PASS", p2.failed === 0 && p2.health === 100, {passed:p2.passed,failed:p2.failed}, "Regression");
      const p3 = await namespace.runExternalIntelligencePhase3Validation(); check("Phase 03 regression remains PASS", p3.failed === 0 && p3.health === 100, {passed:p3.passed,failed:p3.failed}, "Regression");
      const p4 = await namespace.runExternalIntelligencePhase4Validation(); check("Phase 04 regression remains PASS", p4.failed === 0 && p4.health === 100 && p4.phase4Complete === true, {passed:p4.passed,failed:p4.failed,total:p4.total}, "Regression");

      check("Persistence architecture is Content-Addressed + SQLite", VERSION_MANIFEST.persistence.contentAddressedStore === true && VERSION_MANIFEST.persistence.metadataIndex === "SQLITE", VERSION_MANIFEST.persistence, "Persistence Architecture");
      check("Raw Evidence is immutable by policy", VERSION_MANIFEST.persistence.immutableRawEvidence === true && VERSION_MANIFEST.safety.rawEvidenceOverwriteAllowed === false, VERSION_MANIFEST.safety, "Immutability");
      check("Metadata Index is not the only Evidence identity copy", VERSION_MANIFEST.persistence.metadataIndexIsOnlyEvidenceIdentityCopy === false && VERSION_MANIFEST.safety.metadataIndexOnlyEvidenceIdentityAllowed === false, VERSION_MANIFEST.persistence, "Recovery Boundary");
      check("Orphan content is never auto-deleted", VERSION_MANIFEST.persistence.orphanAutomaticDeletionAllowed === false && VERSION_MANIFEST.safety.orphanContentAutomaticDeletionAllowed === false, VERSION_MANIFEST.persistence, "Recovery Boundary");
      check("Project ZIP does not auto-include bulk evidence", VERSION_MANIFEST.persistence.projectZipAutoIncludesBulkEvidence === false, VERSION_MANIFEST.persistence.projectZipAutoIncludesBulkEvidence, "Storage Boundary");
      check("Persistence does not grant Knowledge or Repository authority", VERSION_MANIFEST.safety.evidencePersistenceGrantsKnowledgeAuthority === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety, "Authority");

      ["rawEvidenceRecord","acquisitionEvidenceRecord","contentObjectMetadata","processingCheckpoint","phase5ValidationResult"].forEach((key) => check("Contract " + key + " is registered", Boolean(namespace.getExternalIntelligenceContract(key)), key, "Contracts"));
      ["EXTERNAL-010-SCHEMA-RAW-EVIDENCE","EXTERNAL-010-SCHEMA-ACQUISITION-EVIDENCE","EXTERNAL-010-SCHEMA-CONTENT-OBJECT","EXTERNAL-010-SCHEMA-PROCESSING-CHECKPOINT","EXTERNAL-010-SCHEMA-PHASE5-VALIDATION-RESULT"].forEach((id) => check("Schema " + id + " is registered", Boolean(namespace.getExternalIntelligenceSchema(id)), id, "Schemas"));

      const ownerApproval = namespace.setExternalIntelligenceAuthorityApprovalAdapter({ adapterId: "EXTERNAL-010-PHASE5-OWNER-APPROVAL", requiresExplicitOwnerInteraction: true, async verifyApproval() { return { approved: true, actorType: "Project Owner", interactionEvidenceId: "PHASE5-OWNER-INTERACTION" }; } });
      check("Project Owner approval adapter configured", ownerApproval.ok === true, ownerApproval.code, "Authority", "Warning");
      check("Persistence without explicit authority is denied", (await namespace.persistExternalIntelligenceAcquisitionEvidence({ response: newestMockSuccessResponse(), purpose: PURPOSE })).ok === false, "default-deny", "Authority");

      const adapter = buildMemoryPersistenceAdapter();
      const adapterSet = namespace.setExternalIntelligenceEvidencePersistenceAdapter(adapter);
      check("Deterministic persistence adapter can be configured", adapterSet.ok === true, adapterSet.code, "Persistence Adapter");
      const persistAuth = await grantAuthority("PERSIST_EXTERNAL_EVIDENCE", "external-evidence-persistence", "*", owned, PURPOSE);
      const readAuth = await grantAuthority("READ_EXTERNAL_EVIDENCE", "external-evidence", "*", owned, PURPOSE);
      const checkpointAuth = await grantAuthority("PERSIST_EXTERNAL_PROCESSING_STATE", "external-evidence-persistence", "*", owned, PURPOSE);
      check("Evidence persistence/read/checkpoint authorities are separate and explicit", persistAuth.ok && readAuth.ok && checkpointAuth.ok, {persist:persistAuth.ok,read:readAuth.ok,checkpoint:checkpointAuth.ok}, "Authority");

      const response = newestMockSuccessResponse();
      check("Phase 04 successful acquisition is available as Phase 05 input", Boolean(response && response.responseId), response && response.responseId, "Acquisition → Evidence");
      const candidate = response ? await namespace.buildExternalIntelligenceEvidenceCandidate({ response }) : null;
      check("Evidence candidate creates separate Evidence/Raw/Content identities", candidate && candidate.ok === true && candidate.data.acquisitionEvidence.evidenceId !== candidate.data.rawEvidence.rawEvidenceId && candidate.data.rawEvidence.contentId === candidate.data.contentObject.contentId, candidate && candidate.data, "Evidence Identity");
      check("Content Hash is SHA-256 and Record Hash is separate SHA-256", candidate && /^[a-f0-9]{64}$/.test(candidate.data.acquisitionEvidence.contentHash) && /^[a-f0-9]{64}$/.test(candidate.data.acquisitionEvidence.recordHash) && candidate.data.acquisitionEvidence.contentHash !== candidate.data.acquisitionEvidence.recordHash, candidate && candidate.data.acquisitionEvidence, "Integrity");
      check("Raw content is not embedded in final evidence metadata", candidate && !Object.prototype.hasOwnProperty.call(candidate.data.acquisitionEvidence,"rawText") && !Object.prototype.hasOwnProperty.call(candidate.data.rawEvidence,"rawText"), candidate && candidate.data, "Storage Boundary");

      const first = response ? await namespace.persistExternalIntelligenceAcquisitionEvidence({ response, purpose: PURPOSE }) : null;
      check("First acquisition persists immutable Evidence", first && first.ok === true && first.data.contentCreated === true, first && first.data, "Persistence");
      const second = response ? await namespace.persistExternalIntelligenceAcquisitionEvidence({ response, purpose: PURPOSE }) : null;
      check("Same content creates a second Acquisition Evidence record", first && second && second.ok === true && first.data.acquisitionEvidence.evidenceId !== second.data.acquisitionEvidence.evidenceId, second && second.data, "Acquisition History");
      check("Same content is physically deduplicated by Content Hash", first && second && first.data.contentObject.contentHash === second.data.contentObject.contentHash && second.data.physicalContentDeduplicated === true && second.data.contentCreated === false, second && second.data, "Content Addressing");
      check("Acquisition and Raw Evidence retain separate identities", second && second.data.acquisitionEvidence.rawEvidenceId === second.data.rawEvidence.rawEvidenceId && second.data.acquisitionEvidence.evidenceId !== second.data.rawEvidence.rawEvidenceId, second && second.data, "Lineage");
      check("Persisted Evidence grants no Knowledge promotion or Repository mutation", second && second.data.knowledgePromotionPerformed === false && second.data.canonicalRepositoryMutationPerformed === false, second && second.data, "Authority Boundary");

      const read = first && first.ok ? await namespace.readPersistedExternalIntelligenceEvidence({ evidenceId: first.data.acquisitionEvidence.evidenceId, purpose: PURPOSE, verifyHash: true }) : null;
      check("Persisted Evidence readback succeeds with verified integrity", read && read.ok === true && read.data.integrityState === "VERIFIED" && read.data.acquisitionEvidence.recordHash === first.data.acquisitionEvidence.recordHash, read && read.data, "Readback");
      const localCopy = namespace.getExternalIntelligenceAcquisitionEvidence(first.data.acquisitionEvidence.evidenceId); if (localCopy) localCopy.status = "MUTATED";
      check("Returned copies cannot overwrite stored immutable Evidence", namespace.getExternalIntelligenceAcquisitionEvidence(first.data.acquisitionEvidence.evidenceId).status === "ACQUIRED", namespace.getExternalIntelligenceAcquisitionEvidence(first.data.acquisitionEvidence.evidenceId), "Immutability");

      const checkpoint = await namespace.createExternalIntelligenceProcessingCheckpoint({ contentHash: first.data.contentObject.contentHash, processorId: "PHASE5-NORMALIZER", processorVersion: "1.0.0", parameterHash: "", processingState: "COMPLETED", resumeCursor: { item: 100 }, purpose: PURPOSE });
      check("Incremental processing checkpoint persists", checkpoint.ok === true && checkpoint.data.checkpoint.immutable === true, checkpoint.data || checkpoint.code, "Incremental Processing");
      const checkpoint2 = await namespace.createExternalIntelligenceProcessingCheckpoint({ contentHash: first.data.contentObject.contentHash, processorId: "PHASE5-NORMALIZER", processorVersion: "1.0.0", parameterHash: "", processingState: "COMPLETED", resumeCursor: { item: 100 }, purpose: PURPOSE });
      check("Repeated same input/version is recognized without requiring full reprocessing", checkpoint2.ok === true && checkpoint2.data.incremental.sameInputAndProcessor === true && checkpoint2.data.incremental.fullReprocessingRequired === false, checkpoint2.data, "Incremental Processing");
      check("Checkpoint history is append-only via supersedes link", checkpoint2.data.checkpoint.supersedesCheckpointId === checkpoint.data.checkpoint.checkpointId && checkpoint2.data.checkpoint.checkpointId !== checkpoint.data.checkpoint.checkpointId, checkpoint2.data, "Incremental Processing");

      const integrity = await namespace.scanExternalIntelligenceEvidenceIntegrity({ purpose: PURPOSE });
      check("Evidence integrity scan passes", integrity.ok === true && integrity.data.valid === true && integrity.data.missing.length === 0 && integrity.data.corrupted.length === 0, integrity.data || integrity.code, "Integrity");
      check("Integrity scan does not auto-delete orphan content", integrity.ok === true && integrity.data.orphanAutomaticDeletionPerformed === false, integrity.data, "Recovery Boundary");
      const persistenceState = namespace.getExternalIntelligenceEvidencePersistenceState();
      check("Metadata index keeps lightweight identity counts separate from content", persistenceState.acquisitionEvidenceCount >= 2 && persistenceState.rawEvidenceCount >= 2 && persistenceState.uniqueContentCount >= 1, persistenceState, "Metadata Index");
      check("Content object count is lower than acquisition evidence count after dedupe", integrity.data.counts.contentObjectCount < integrity.data.counts.acquisitionEvidenceCount, integrity.data.counts, "Content Addressing");

      const audit = await namespace.verifyExternalIntelligenceAuditChain();
      check("Phase 05 audit chain remains valid", audit.valid === true, {valid:audit.valid,eventCount:audit.eventCount}, "Audit");
      ["evidencePersistence","phase5Validation"].forEach((name) => check("Module " + name + " is loaded", Boolean(namespace.modules[name]), namespace.modules[name] && namespace.modules[name].status, "Modules"));
    } catch (error) {
      check("Phase 05 validation execution completes without exception", false, { message: error && error.message || String(error), stack: error && error.stack || null }, "Validation");
    } finally {
      owned.forEach((id) => namespace.revokeExternalIntelligenceAuthorityEnvelope(id, "Phase 05 validation completed"));
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
      namespace.setExternalIntelligenceEvidencePersistenceAdapter(null);
    }

    const summary = summarize(c.checks); const gate = summary.failed === 0 && summary.criticalFailed === 0;
    const result = { id: internal.nextId("EXTERNAL-010-PHASE5-VALIDATION"), componentId: "EXTERNAL-010", version: VERSION_MANIFEST.release.version, implementationPhase: VERSION_MANIFEST.release.implementationPhase, designFreezeId: VERSION_MANIFEST.release.designFreezeId, roadmapId: VERSION_MANIFEST.release.implementationRoadmapId, decisionCoverage: VERSION_MANIFEST.release.decisionCount, passed: summary.passed, failed: summary.failed, total: summary.total, health: summary.health, criticalFailed: summary.criticalFailed, status: gate ? "EXTERNAL-010 Phase 05 Validation PASS" : "EXTERNAL-010 Phase 05 Validation FAIL", releaseAllowed: gate, phase5Complete: gate, phase6Allowed: gate, checks: c.checks, safety: internal.clone(VERSION_MANIFEST.safety), validatedAt: internal.nowIso() };
    const cv = namespace.validateExternalIntelligenceContract("phase5ValidationResult", result); const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE5-VALIDATION-RESULT", result);
    if (!cv.valid || !sv.valid) { result.failed += 1; result.total += 1; result.criticalFailed += 1; result.health = Math.round((result.passed/result.total)*1000)/10; result.status = "EXTERNAL-010 Phase 05 Validation FAIL"; result.releaseAllowed = false; result.phase5Complete = false; result.phase6Allowed = false; result.checks.push({name:"Phase 05 result validates against contract and schema",passed:false,detail:internal.stableStringify({contract:cv,schema:sv}),group:"Validation",severity:"Critical"}); }
    else { result.checks.push({name:"Phase 05 result validates against contract and schema",passed:true,detail:"valid",group:"Validation",severity:"Critical"}); result.passed += 1; result.total += 1; result.health = Math.round((result.passed/result.total)*1000)/10; }
    state.latestPhase5Validation = internal.deepFreeze(internal.clone(result)); namespace.modules.phase5Validation.status = result.failed === 0 ? "Passed" : "Failed"; internal.touch(); return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase5Validation() { return state.latestPhase5Validation ? internal.clone(state.latestPhase5Validation) : null; }
  Object.assign(namespace.api, { runExternalIntelligencePhase5Validation, getLatestExternalIntelligencePhase5Validation }); Object.assign(namespace, namespace.api);
  namespace.modules.phase5Validation = { id:"EXTERNAL-010-PHASE5-VALIDATION", version:MODULE_VERSION, status:"Loaded", phase:5, decisions:["005","006","008","014"], loadedAt:internal.nowIso() };
  global.runExternalIntelligencePhase5Validation = runExternalIntelligencePhase5Validation;
})(typeof window !== "undefined" ? window : globalThis);
