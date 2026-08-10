/* ============================================================
   FILE: 13_knowledge_navigator_knowledge_provider.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Knowledge Provider 1.0.0
   Phase 6: Federation / Conflict
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-180 Knowledge Provider blocked."); return; }
  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("knowledgeProvider");
  const PROVIDER_ID = "IDE-180-PROVIDER-CURRENT-KNOWLEDGE";
  const SOURCE_TYPE = "knowledge-current";

  function lower(value) { return internal.text(value, "").normalize("NFKC").toLowerCase(); }
  function isKnowledge(record) {
    if (!record) return false;
    const mode = lower(record.sourceMetadata && record.sourceMetadata.memoMode);
    const type = lower(record.sourceMetadata && record.sourceMetadata.knowledgeType || record.recordType);
    return mode === "knowledge" || /knowledge|decision|design freeze|policy|specification|architecture/.test(type);
  }
  function adapt(record) {
    const source = internal.clone(record);
    source.recordId = source.recordId.replace(/^IDE180-MEMO:/, "IDE180-KNOWLEDGE:");
    source.providerId = PROVIDER_ID;
    source.sourceType = SOURCE_TYPE;
    source.sourceMetadata = Object.assign({}, source.sourceMetadata || {}, { sourceMemoProviderId: "IDE-180-PROVIDER-CURRENT-MEMO", scoreBasedDeduplicationUsed: false });
    source.immutable = true;
    return internal.deepFreeze(source);
  }
  function all() {
    if (typeof namespace.listMemoSourceRecords !== "function") return [];
    return namespace.listMemoSourceRecords().filter(isKnowledge).map(adapt);
  }
  function describe() {
    const list = all();
    return { providerId: PROVIDER_ID, providerVersion: MODULE_VERSION, sourceType: SOURCE_TYPE, readMode: "read-only", availability: typeof namespace.listMemoSourceRecords !== "function" ? "unavailable" : (list.length ? "available" : "partial"), capabilities: ["knowledge-navigation", "raw-memo-backed", "federation-source"], recordCount: list.length, scoreBasedDeduplicationUsed: false, mutationAllowed: false };
  }
  function supports(capability) { return describe().capabilities.includes(internal.text(capability, "")); }
  function list() { return all().map(internal.clone); }
  function get(selector) {
    const source = internal.isPlainObject(selector) ? selector : { id: selector };
    const id = internal.text(source.recordId || source.canonicalEntityId || source.sourceId || source.id, "");
    return internal.clone(all().find(function find(item) { return [item.recordId, item.canonicalEntityId, item.sourceId].includes(id); }) || null);
  }
  function search(query) {
    const q = lower(query);
    if (!q) return list();
    return all().filter(function match(item) {
      return [item.recordId, item.canonicalEntityId, item.sourceId, item.recordType, item.title, item.summary, item.sourceMetadata && item.sourceMetadata.category, item.sourceMetadata && item.sourceMetadata.series].map(lower).join(" ").includes(q);
    }).map(internal.clone);
  }
  const providerDefinition = { providerId: PROVIDER_ID, providerVersion: MODULE_VERSION, sourceType: SOURCE_TYPE, readMode: "read-only", availability: "not-loaded", capabilities: ["knowledge-navigation", "raw-memo-backed", "federation-source"], supports: supports, describe: describe, get: get, search: search, list: list };
  function initializeKnowledgeProvider() {
    providerDefinition.availability = describe().availability;
    const existing = namespace.getProviderDefinition && namespace.getProviderDefinition(PROVIDER_ID);
    const registration = existing ? internal.buildResult(true, "IDE180_PROVIDER_EXISTS", "Ready", { providerId: PROVIDER_ID }) : namespace.registerProviderDefinition(providerDefinition);
    namespace.modules.knowledgeProvider.status = registration && registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration && registration.ok === true, registration && registration.ok === true ? "IDE180_KNOWLEDGE_PROVIDER_INITIALIZED" : "IDE180_KNOWLEDGE_PROVIDER_INITIALIZATION_FAILED", registration && registration.ok === true ? "Ready" : "Blocked", { registration: registration, provider: describe() });
  }
  Object.assign(namespace.api, { initializeKnowledgeProvider: initializeKnowledgeProvider, getKnowledgeProviderStatus: describe, listKnowledgeSourceRecords: list, searchKnowledgeSourceRecords: search, getKnowledgeSourceRecord: get });
  Object.assign(namespace, namespace.api);
  namespace.modules.knowledgeProvider = { id: "IDE-180-KNOWLEDGE-PROVIDER", version: MODULE_VERSION, status: "Loaded", phase: 6, providerId: PROVIDER_ID, sourceType: SOURCE_TYPE, readOnly: true, rawMemoBacked: true, scoreBasedDeduplicationUsed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
