/* ============================================================
   FILE: 13_local_first_repository_operational_evidence.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.16.0 / Module: Operational Evidence 1.0.0
   Phase 17: Cross-Device Operational Hardening
   Decision-015
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Operational Evidence blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("operationalEvidence");
  if (!(state.operationalEvidenceDescriptors instanceof Map)) state.operationalEvidenceDescriptors = new Map();

  const ALLOWED_TYPES = Object.freeze([
    "fresh-desktop-scan",
    "desktop-receiver-prepared",
    "desktop-scan-binding-consumed",
    "reload-initialization",
    "reload-recovery",
    "replica-provision-started",
    "replica-provision-verified",
    "replica-provision-rollback",
    "picker-file-selected",
    "picker-operation-blocked"
  ]);

  async function createOperationalEvidence(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const evidenceType = internal.text(source.evidenceType, "");
    if (ALLOWED_TYPES.indexOf(evidenceType) === -1) {
      return internal.buildResult(false, "REPOSITORY010_OPERATIONAL_EVIDENCE_TYPE_INVALID", "Blocked", { evidenceType: evidenceType || null });
    }
    const record = {
      operationalEvidenceId: internal.text(source.operationalEvidenceId, internal.nextId("REPOSITORY010-OPERATIONAL-EVIDENCE")),
      evidenceType: evidenceType,
      projectId: internal.text(source.projectId, "AI-PROMPT-OS-MAIN"),
      repositoryId: internal.text(source.repositoryId, "AI-PROMPT-OS-REPOSITORY"),
      sourceNodeId: source.sourceNodeId == null ? null : internal.text(source.sourceNodeId, ""),
      targetNodeId: source.targetNodeId == null ? null : internal.text(source.targetNodeId, ""),
      revisionId: source.revisionId == null ? null : internal.text(source.revisionId, ""),
      relatedRecordId: source.relatedRecordId == null ? null : internal.text(source.relatedRecordId, ""),
      validationPassed: source.validationPassed === true,
      detail: internal.isPlainObject(source.detail) ? internal.clone(source.detail) : {},
      authorityEffect: "none",
      canonicalMutationPerformed: false,
      automaticAcceptancePerformed: false,
      automaticPromotionPerformed: false,
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      immutable: true
    };
    const validation = namespace.validateContract("operationalEvidenceDescriptor", record);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_OPERATIONAL_EVIDENCE_CONTRACT_INVALID", "Blocked", { validation: validation, record: record });
    const saved = await namespace.persistLocalFirstRepositoryRecord("operationalEvidence", record);
    if (!saved || saved.ok !== true) return saved;
    state.operationalEvidenceDescriptors.set(record.operationalEvidenceId, internal.deepFreeze(internal.clone(record)));
    state.lastOperationalEvidenceId = record.operationalEvidenceId;
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_OPERATIONAL_EVIDENCE_PERSISTED", "Verified", { operationalEvidence: internal.clone(record), validation: validation, authorityEffect: "none" });
  }

  async function listOperationalEvidence(evidenceType) {
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("operationalEvidence");
    const filtered = (Array.isArray(records) ? records : []).filter(function (record) {
      return !evidenceType || record.evidenceType === evidenceType;
    }).sort(function (a, b) { return String(a.createdAt || "").localeCompare(String(b.createdAt || "")); });
    filtered.forEach(function (record) {
      if (namespace.validateContract("operationalEvidenceDescriptor", record).valid) state.operationalEvidenceDescriptors.set(record.operationalEvidenceId, internal.deepFreeze(internal.clone(record)));
    });
    return filtered.map(internal.clone);
  }

  async function restoreOperationalEvidence() {
    const records = await listOperationalEvidence();
    return internal.buildResult(true, "REPOSITORY010_OPERATIONAL_EVIDENCE_RESTORED", "Ready", { restoredCount: records.length, authorityEffect: "none" });
  }

  function getOperationalEvidenceStatus() {
    return {
      status: "Ready",
      phase: 17,
      moduleVersion: MODULE_VERSION,
      allowedEvidenceTypes: ALLOWED_TYPES.slice(),
      runtimeEvidenceCount: state.operationalEvidenceDescriptors instanceof Map ? state.operationalEvidenceDescriptors.size : 0,
      lastOperationalEvidenceId: state.lastOperationalEvidenceId || null,
      persistenceGrantsAuthority: false,
      canonicalMutationAuthority: false
    };
  }

  Object.assign(namespace.api, {
    createLocalFirstRepositoryOperationalEvidence: createOperationalEvidence,
    listLocalFirstRepositoryOperationalEvidence: listOperationalEvidence,
    restoreLocalFirstRepositoryOperationalEvidence: restoreOperationalEvidence,
    getLocalFirstRepositoryOperationalEvidenceStatus: getOperationalEvidenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.operationalEvidence = {
    id: "REPOSITORY-010-OPERATIONAL-EVIDENCE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 17,
    authorityEffect: "none",
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
