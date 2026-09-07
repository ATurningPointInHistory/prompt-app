/* ============================================================
   FILE: 17_external_intelligence_data_lifecycle.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.5.0
   Phase 06: Policy-Bound Data Lifecycle
   Decision: 041
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("dataLifecycle");
  const DATA_CLASSES = new Set(VERSION_MANIFEST.dataLifecycle.dataClasses || []);
  const STATES = new Set(VERSION_MANIFEST.dataLifecycle.lifecycleStates || []);

  function createExternalIntelligenceDataLifecycleRecord(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const now = internal.nowIso();
    const dataClass = internal.text(x.dataClass, "UNKNOWN").toUpperCase();
    const stateValue = internal.text(x.lifecycleState, "ACTIVE").toUpperCase();
    const record = internal.deepFreeze({
      lifecycleRecordId: internal.nextId("EXTERNAL-010-DATA-LIFECYCLE"),
      subjectType: internal.text(x.subjectType, "EVIDENCE").toUpperCase(),
      subjectId: internal.text(x.subjectId, ""),
      sourceId: x.sourceId ? internal.text(x.sourceId, "").toUpperCase() : null,
      dataClass: DATA_CLASSES.has(dataClass) ? dataClass : "UNKNOWN",
      purposeId: internal.text(x.purposeId, "UNSPECIFIED"),
      usagePolicyReference: x.usagePolicyReference ? internal.text(x.usagePolicyReference, "") : null,
      retentionPolicyReference: x.retentionPolicyReference ? internal.text(x.retentionPolicyReference, "") : null,
      policyVersion: internal.text(x.policyVersion, "UNKNOWN"),
      lifecycleState: STATES.has(stateValue) ? stateValue : "UNKNOWN",
      expiresAt: x.expiresAt ? internal.text(x.expiresAt, "") : null,
      preservationHold: x.preservationHold === true,
      deletionAuthorityGranted: false,
      automaticDeletionPerformed: false,
      createdAt: now,
      updatedAt: now,
      immutable: true
    });
    if (!record.subjectId) return internal.buildResult(false, "EXTERNAL010_DATA_LIFECYCLE_SUBJECT_REQUIRED", "Blocked", null);
    const cv = namespace.validateExternalIntelligenceContract("dataLifecycleRecord", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-DATA-LIFECYCLE", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_DATA_LIFECYCLE_INVALID", "Blocked", { contract:cv, schema:sv });
    state.dataLifecycleRecords.set(record.lifecycleRecordId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_DATA_LIFECYCLE_CREATED", "Ready", { lifecycle:internal.clone(record) });
  }

  function evaluateExternalIntelligenceDataUse(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const record = state.dataLifecycleRecords.get(internal.text(x.lifecycleRecordId, ""));
    const operation = internal.text(x.operation, "").toUpperCase();
    if (!record) return internal.buildResult(false, "EXTERNAL010_DATA_LIFECYCLE_NOT_FOUND", "Blocked", null);
    if (record.preservationHold && operation === "DELETE") return internal.buildResult(false, "EXTERNAL010_PRESERVATION_HOLD_BLOCKS_DELETE", "Blocked", { lifecycle:internal.clone(record), deletionPerformed:false });
    if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now() && operation !== "READ_METADATA") return internal.buildResult(false, "EXTERNAL010_RETENTION_EXPIRED_REQUIRES_REVIEW", "Review Required", { lifecycle:internal.clone(record), automaticDeletionPerformed:false });
    if (["EXPORT","MODEL_TRAINING","EXTERNAL_AI_TRANSMISSION","ARCHIVING","LONG_TERM_STORAGE"].includes(operation)) {
      const usage = record.sourceId && typeof namespace.checkExternalIntelligenceUsagePolicy === "function" ? namespace.checkExternalIntelligenceUsagePolicy({ sourceId:record.sourceId, operation: operation === "EXTERNAL_AI_TRANSMISSION" ? "EXPORT" : operation }) : null;
      if (!usage || usage.ok !== true) return internal.buildResult(false, "EXTERNAL010_DATA_USE_POLICY_NOT_GRANTED", "Blocked", { operation, lifecycle:internal.clone(record), usagePolicy:usage, unknownPolicyEqualsPermission:false });
    }
    return internal.buildResult(true, "EXTERNAL010_DATA_USE_ELIGIBLE", "Ready", { operation, lifecycle:internal.clone(record), authorityGranted:false });
  }

  function createExternalIntelligenceDeletionCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const record = state.dataLifecycleRecords.get(internal.text(x.lifecycleRecordId, ""));
    if (!record) return internal.buildResult(false, "EXTERNAL010_DATA_LIFECYCLE_NOT_FOUND", "Blocked", null);
    return internal.buildResult(true, "EXTERNAL010_DELETION_CANDIDATE_CREATED", "Candidate", { lifecycleRecordId:record.lifecycleRecordId, subjectId:record.subjectId, reason:internal.text(x.reason,"Retention or policy review"), preservationHold:record.preservationHold, deletionAuthorityGranted:false, deletionPerformed:false, tombstoneRequired:true });
  }

  function createExternalIntelligencePreservationHold(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const record = state.dataLifecycleRecords.get(internal.text(x.lifecycleRecordId, ""));
    if (!record) return internal.buildResult(false, "EXTERNAL010_DATA_LIFECYCLE_NOT_FOUND", "Blocked", null);
    const next = internal.deepFreeze(Object.assign({}, internal.clone(record), { lifecycleState:"PRESERVATION_HOLD", preservationHold:true, deletionAuthorityGranted:false, automaticDeletionPerformed:false, updatedAt:internal.nowIso(), immutable:true }));
    state.dataLifecycleRecords.set(record.lifecycleRecordId, next); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_PRESERVATION_HOLD_SET", "Ready", { lifecycle:internal.clone(next), deletionPerformed:false });
  }

  function initializeExternalIntelligenceDataLifecycle() {
    namespace.modules.dataLifecycle.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_DATA_LIFECYCLE_INITIALIZED", "Ready", { retentionUnknownMeansUnlimited:false, automaticRawEvidenceDeletionAllowed:false, preservationHoldSupported:true, exportIndependentPolicyCheck:true, modelTrainingIndependentPolicyCheck:true });
  }

  Object.assign(namespace.api, { initializeExternalIntelligenceDataLifecycle, createExternalIntelligenceDataLifecycleRecord, evaluateExternalIntelligenceDataUse, createExternalIntelligenceDeletionCandidate, createExternalIntelligencePreservationHold });
  Object.assign(namespace, namespace.api);
  namespace.modules.dataLifecycle = { id:"EXTERNAL-010-DATA-LIFECYCLE", version:MODULE_VERSION, status:"Loaded", phase:6, decision:"041", controlledDeletionOnly:true, loadedAt:internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
