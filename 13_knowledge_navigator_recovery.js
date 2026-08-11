/* ============================================================
   FILE: 13_knowledge_navigator_recovery.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Recovery 1.0.0
   Phase 8: Recovery / Archive Boundary
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Recovery blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("recovery");
  const RECOVERY_VERSION = "1.0.0";
  const ARCHIVE_PROVIDER_ID = "IDE-180-PROVIDER-MEMO-ARCHIVE";
  const APPLICABLE_TYPES = ["knowledge", "decision", "insight", "explanation", "search", "entity"];
  const ACTIONS = ["temporary-reference", "import-selected", "cancel"];

  if (!(internal.state.recoveryRequests instanceof Map)) internal.state.recoveryRequests = new Map();
  if (!Object.prototype.hasOwnProperty.call(internal.state, "lastRecovery")) internal.state.lastRecovery = null;

  function text(value, fallback) { return internal.text(value, fallback); }
  function clone(value) { return internal.clone(value); }

  function normalizeNavigationType(resultOrRequest) {
    return text(resultOrRequest && resultOrRequest.metadata && resultOrRequest.metadata.navigationType,
      text(resultOrRequest && resultOrRequest.navigationType, ""));
  }

  function isApplicable(resultOrRequest) {
    const type = normalizeNavigationType(resultOrRequest);
    if (!APPLICABLE_TYPES.includes(type)) return false;
    const status = text(resultOrRequest && resultOrRequest.status, "missing-source");
    return ["missing-source", "not-found", "partial"].includes(status);
  }

  function getRecoverySuggestion(resultOrRequest) {
    const applicable = isApplicable(resultOrRequest);
    const missingSources = Array.isArray(resultOrRequest && resultOrRequest.missingSources) ? resultOrRequest.missingSources : [];
    return internal.deepFreeze({
      available: applicable,
      recoveryType: applicable ? "memo-archive-zip" : null,
      providerId: applicable ? ARCHIVE_PROVIDER_ID : null,
      requiresUserConsent: applicable,
      automaticSearchAllowed: false,
      automaticImportAllowed: false,
      readMode: "read-only",
      imported: false,
      missingSources: clone(missingSources),
      action: applicable ? "select-archive-zip" : null,
      reason: applicable ? "Current Source did not provide the requested record. Archive recovery is available only after explicit user selection." : "Archive recovery is not applicable to this navigation type."
    });
  }

  function createRecoveryRequest(resultOrRequest, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const suggestion = getRecoverySuggestion(resultOrRequest);
    if (!suggestion.available) return internal.buildResult(false, "IDE180_RECOVERY_NOT_APPLICABLE", "unsupported", { suggestion: suggestion });
    const recoveryId = internal.nextId("IDE-180-RECOVERY");
    const record = internal.deepFreeze({
      recoveryId: recoveryId,
      version: RECOVERY_VERSION,
      status: "awaiting-consent",
      navigationType: normalizeNavigationType(resultOrRequest),
      query: text(settings.query, text(resultOrRequest && resultOrRequest.query, "")),
      target: clone(settings.target != null ? settings.target : resultOrRequest && resultOrRequest.target || null),
      missingSources: clone(resultOrRequest && resultOrRequest.missingSources || []),
      providerId: ARCHIVE_PROVIDER_ID,
      userConsent: false,
      archiveOpened: false,
      imported: false,
      readMode: "read-only",
      createdAt: internal.nowIso()
    });
    internal.state.recoveryRequests.set(recoveryId, record);
    internal.state.lastRecovery = clone(record);
    internal.touch();
    return internal.buildResult(true, "IDE180_RECOVERY_REQUEST_CREATED", "awaiting-consent", { recovery: clone(record), suggestion: suggestion });
  }

  function recoveryRequest(recoveryId) {
    const id = text(recoveryId, "");
    const record = internal.state.recoveryRequests.get(id);
    return record ? clone(record) : null;
  }

  function updateRecovery(recoveryId, patch) {
    const existing = internal.state.recoveryRequests.get(recoveryId);
    if (!existing) return null;
    const next = internal.deepFreeze(Object.assign({}, clone(existing), clone(patch || {}), { updatedAt: internal.nowIso() }));
    internal.state.recoveryRequests.set(recoveryId, next);
    internal.state.lastRecovery = clone(next);
    internal.touch();
    return clone(next);
  }

  async function openSelectedArchive(recoveryId, input, options) {
    const id = text(recoveryId, "");
    const recovery = recoveryRequest(id);
    if (!recovery) return internal.buildResult(false, "IDE180_RECOVERY_REQUEST_NOT_FOUND", "not-found", null);
    const settings = internal.isPlainObject(options) ? options : {};
    if (settings.userConsent !== true) return internal.buildResult(false, "IDE180_RECOVERY_USER_CONSENT_REQUIRED", "Blocked", { recovery: recovery });
    if (typeof namespace.openMemoArchiveSource !== "function") return internal.buildResult(false, "IDE180_RECOVERY_ARCHIVE_PROVIDER_UNAVAILABLE", "unsupported", null);
    const opened = await namespace.openMemoArchiveSource(input, Object.assign({}, settings, { userConsent: true }));
    if (!opened || opened.ok !== true) {
      updateRecovery(id, { status: opened && opened.status || "failed", userConsent: true, archiveOpened: false });
      return opened;
    }
    const next = updateRecovery(id, {
      status: "archive-opened",
      userConsent: true,
      archiveOpened: true,
      archive: opened.data || null,
      imported: false
    });
    return internal.buildResult(true, "IDE180_RECOVERY_ARCHIVE_OPENED", "Ready", { recovery: next, archive: opened.data || null });
  }

  function searchSelectedArchive(recoveryId, query, options) {
    const id = text(recoveryId, "");
    const recovery = recoveryRequest(id);
    if (!recovery) return internal.buildResult(false, "IDE180_RECOVERY_REQUEST_NOT_FOUND", "not-found", null);
    if (recovery.userConsent !== true || recovery.archiveOpened !== true) return internal.buildResult(false, "IDE180_RECOVERY_ARCHIVE_NOT_OPENED", "Blocked", { recovery: recovery });
    if (typeof namespace.searchMemoArchiveSourceRecords !== "function") return internal.buildResult(false, "IDE180_RECOVERY_ARCHIVE_SEARCH_UNAVAILABLE", "unsupported", null);
    const q = text(query, recovery.query || text(recovery.target && (recovery.target.canonicalId || recovery.target.id || recovery.target.name || recovery.target.title), ""));
    const records = namespace.searchMemoArchiveSourceRecords(q, options || {});
    const status = records.length ? "found" : "not-found";
    const next = updateRecovery(id, {
      status: status,
      lastQuery: q,
      matchCount: records.length,
      matchedRecordIds: records.map(function map(item) { return item.recordId; }),
      imported: false
    });
    return internal.buildResult(true, "IDE180_RECOVERY_ARCHIVE_SEARCH_COMPLETE", status, {
      recovery: next,
      records: records,
      provenance: {
        sourceType: "memo-archive-zip",
        readMode: "read-only",
        imported: false
      },
      availableActions: records.length ? ACTIONS.slice() : ["cancel"]
    });
  }

  function selectRecoveryAction(recoveryId, action, recordIds) {
    const id = text(recoveryId, "");
    const recovery = recoveryRequest(id);
    const selectedAction = text(action, "");
    if (!recovery) return internal.buildResult(false, "IDE180_RECOVERY_REQUEST_NOT_FOUND", "not-found", null);
    if (!ACTIONS.includes(selectedAction)) return internal.buildResult(false, "IDE180_RECOVERY_ACTION_UNSUPPORTED", "unsupported", { action: selectedAction });
    if (selectedAction === "cancel") {
      if (typeof namespace.closeMemoArchiveSource === "function") namespace.closeMemoArchiveSource();
      const next = updateRecovery(id, { status: "cancelled", archiveOpened: false, imported: false });
      return internal.buildResult(true, "IDE180_RECOVERY_CANCELLED", "cancelled", { recovery: next });
    }
    const ids = Array.isArray(recordIds) ? recordIds.map(String) : [text(recordIds, "")].filter(Boolean);
    const records = ids.map(function map(recordId) { return namespace.getMemoArchiveSourceRecord && namespace.getMemoArchiveSourceRecord(recordId); }).filter(Boolean);
    if (!records.length) return internal.buildResult(false, "IDE180_RECOVERY_SELECTION_EMPTY", "not-found", { recordIds: ids });
    if (selectedAction === "temporary-reference") {
      const next = updateRecovery(id, { status: "temporary-reference", imported: false, selectedRecordIds: ids });
      return internal.buildResult(true, "IDE180_RECOVERY_TEMPORARY_REFERENCE_READY", "Ready", {
        recovery: next,
        records: records,
        provenance: records.map(function map(record) {
          return { sourceType: "memo-archive-zip", archiveId: record.sourceMetadata && record.sourceMetadata.archiveId || null, recordId: record.recordId, readMode: "read-only", imported: false, trust: record.trust };
        })
      });
    }
    const next = updateRecovery(id, { status: "import-delegation-required", imported: false, selectedRecordIds: ids });
    return internal.buildResult(true, "IDE180_RECOVERY_IMPORT_DELEGATION_REQUIRED", "Needs Application Command", {
      recovery: next,
      records: records,
      mutationPerformed: false,
      delegationRequired: true,
      applicationCommand: {
        commandType: "memo-import-selected",
        sourceType: "memo-archive-zip",
        recordIds: ids,
        explicitUserActionRequired: true,
        navigatorExecutesCommand: false
      }
    });
  }

  function getRecoveryStatus() {
    return {
      id: "IDE-180-RECOVERY-STATUS",
      version: MODULE_VERSION,
      status: namespace.modules.recovery && namespace.modules.recovery.status || "Loaded",
      activeRequestCount: internal.state.recoveryRequests.size,
      lastRecovery: clone(internal.state.lastRecovery),
      archiveProvider: typeof namespace.getMemoArchiveProviderStatus === "function" ? namespace.getMemoArchiveProviderStatus() : null,
      automaticArchiveSearchAllowed: false,
      automaticArchiveImportAllowed: false,
      missingSourceInferenceAllowed: false,
      readOnly: true
    };
  }

  function initializeRecovery() {
    namespace.modules.recovery.status = "Ready";
    return internal.buildResult(true, "IDE180_RECOVERY_INITIALIZED", "Ready", getRecoveryStatus());
  }

  Object.assign(namespace.api, {
    initializeRecovery: initializeRecovery,
    getRecoverySuggestion: getRecoverySuggestion,
    createKnowledgeRecoveryRequest: createRecoveryRequest,
    getKnowledgeRecoveryRequest: recoveryRequest,
    openSelectedMemoArchiveForRecovery: openSelectedArchive,
    searchSelectedMemoArchiveForRecovery: searchSelectedArchive,
    selectKnowledgeRecoveryAction: selectRecoveryAction,
    getKnowledgeNavigatorRecoveryStatus: getRecoveryStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.recovery = {
    id: "IDE-180-RECOVERY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    explicitUserConsentRequired: true,
    automaticArchiveSearchAllowed: false,
    automaticArchiveImportAllowed: false,
    mutationAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
