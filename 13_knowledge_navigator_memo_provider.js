/* ============================================================
   FILE: 13_knowledge_navigator_memo_provider.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Memo Provider 1.0.0
   Phase 6: Federation / Conflict
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Memo Provider blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("memoProvider");
  const PROVIDER_ID = "IDE-180-PROVIDER-CURRENT-MEMO";
  const SOURCE_TYPE = "memo-current";

  function arr(value) { return Array.isArray(value) ? value : []; }
  function text(value, fallback) { return internal.text(value, fallback); }
  function lower(value) { return text(value, "").normalize("NFKC").toLowerCase(); }
  function clone(value) { return internal.clone(value); }

  function rawList() {
    if (typeof global.getMemoBoxList !== "function") return [];
    try { return arr(global.getMemoBoxList()).map(clone); }
    catch (_) { return []; }
  }

  function normalizeLifecycle(value) {
    const status = lower(value);
    if (["official", "正式", "current", "current-official"].includes(status)) return "current-official";
    if (["historical", "history", "履歴", "過去"].includes(status)) return "historical";
    if (["draft", "下書き"].includes(status)) return "draft";
    if (["archive", "archived", "アーカイブ"].includes(status)) return "archived";
    if (["deprecated", "廃止"].includes(status)) return "deprecated";
    if (["accepted", "承認済み"].includes(status)) return "accepted";
    if (["active", "ready", "有効"].includes(status)) return "active";
    if (["proposal", "candidate", "提案"].includes(status)) return "proposal";
    return status || "unknown";
  }

  function officialState(value) {
    return lower(value) === "official" || lower(value) === "正式" ? "official" : (value ? "non-official" : "unknown");
  }

  function canonicalEntityId(memo, index) {
    const explicit = text(memo && memo.canonicalEntityId, "");
    if (explicit) return explicit;
    const id = text(memo && memo.id, "");
    if (id) return id.includes(":") ? id : "entity:" + id;
    return "memo:" + String(index + 1) + ":" + lower(memo && (memo.name || memo.title || "untitled")).replace(/\s+/g, "-");
  }

  function primitiveComparable(input) {
    const source = input && typeof input === "object" ? input : {};
    const out = {};
    Object.keys(source).sort().forEach(function map(key) {
      const value = source[key];
      if (["string", "number", "boolean"].includes(typeof value) && value !== "") out[key] = value;
    });
    return out;
  }

  function normalizeRelationship(item) {
    if (typeof item === "string") return { type: "related-to", targetId: item, explicit: true };
    if (!item || typeof item !== "object") return null;
    return {
      type: text(item.type || item.relationshipType || item.relation, "related-to").toLowerCase(),
      targetId: text(item.targetId || item.target || item.id, ""),
      sourceId: text(item.sourceId || item.source, ""),
      explicit: item.explicit !== false,
      metadata: clone(item.metadata || {})
    };
  }

  function normalizeMemo(memo, index) {
    const id = text(memo && memo.id, "MEMO-INDEX-" + String(index));
    const mode = text(memo && (memo.memoMode || memo.mode), "simple");
    const type = text(memo && (memo.knowledgeType || memo.type), mode === "knowledge" ? "Knowledge" : "Memo");
    const relationships = arr(memo && memo.relationships).map(normalizeRelationship).filter(Boolean);
    const evidenceReferences = arr(memo && (memo.evidenceReferences || memo.evidence)).map(function copy(item) {
      return typeof item === "string" ? { evidenceId: item } : clone(item);
    });
    const record = {
      recordId: "IDE180-MEMO:" + id + ":" + String(index),
      canonicalEntityId: canonicalEntityId(memo, index),
      providerId: PROVIDER_ID,
      sourceId: id,
      sourceType: SOURCE_TYPE,
      recordType: lower(type || mode) || "memo",
      title: text(memo && (memo.name || memo.title), id),
      summary: text(memo && memo.summary, ""),
      contentReference: { memoId: id, memoIndex: index, readOnly: true },
      version: text(memo && memo.version, ""),
      lifecycle: normalizeLifecycle(memo && memo.status),
      officialState: officialState(memo && memo.status),
      validationState: "unknown",
      scope: memo && memo.scope != null ? clone(memo.scope) : null,
      relationships: relationships,
      lineage: arr(memo && memo.lineage).map(clone),
      evidenceReferences: evidenceReferences,
      trust: "not-applicable",
      timestamps: {
        createdAt: memo && (memo.createdAt || memo.importedAt) || null,
        updatedAt: memo && memo.updatedAt || null,
        importedAt: memo && memo.importedAt || null
      },
      sourceMetadata: {
        memoMode: mode,
        knowledgeType: type,
        category: text(memo && memo.category, ""),
        series: text(memo && memo.series, ""),
        priority: text(memo && memo.priority, ""),
        status: text(memo && memo.status, ""),
        tags: arr(memo && (memo.tags || memo.keywords)).map(String),
        sourceFileName: text(memo && memo.sourceFileName, ""),
        sourceFormat: text(memo && memo.sourceFormat, ""),
        comparable: primitiveComparable(memo && memo.metadata)
      },
      immutable: true
    };
    return internal.deepFreeze(record);
  }

  function records() { return rawList().map(normalizeMemo); }

  function describe() {
    const list = records();
    return {
      providerId: PROVIDER_ID,
      providerVersion: MODULE_VERSION,
      sourceType: SOURCE_TYPE,
      readMode: "read-only",
      availability: typeof global.getMemoBoxList !== "function" ? "unavailable" : (list.length ? "available" : "partial"),
      capabilities: ["memo-current-read", "knowledge-navigation", "decision-trace", "federation-source"],
      recordCount: list.length,
      mutationAllowed: false
    };
  }

  function supports(capability) { return describe().capabilities.includes(text(capability, "")); }

  function list(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    let list = records();
    if (settings.recordType) list = list.filter(function filter(item) { return lower(item.recordType) === lower(settings.recordType); });
    if (settings.memoMode) list = list.filter(function filter(item) { return lower(item.sourceMetadata.memoMode) === lower(settings.memoMode); });
    return list.map(clone);
  }

  function get(selector) {
    const source = internal.isPlainObject(selector) ? selector : { id: selector };
    const id = text(source.recordId || source.canonicalEntityId || source.sourceId || source.id, "");
    const found = records().find(function find(item) {
      return [item.recordId, item.canonicalEntityId, item.sourceId].includes(id);
    }) || null;
    return found ? clone(found) : null;
  }

  function search(query, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const q = lower(query);
    let list = records();
    if (settings.memoMode) list = list.filter(function filter(item) { return lower(item.sourceMetadata.memoMode) === lower(settings.memoMode); });
    if (settings.kind === "decision") {
      list = list.filter(function decision(item) {
        const bag = [item.sourceId, item.recordType, item.title, item.sourceMetadata.knowledgeType, item.sourceMetadata.category].map(lower).join(" ");
        return /decision|決定|design freeze|freeze/.test(bag);
      });
    }
    if (!q) return list.map(clone);
    return list.filter(function match(item) {
      const haystack = [item.recordId, item.canonicalEntityId, item.sourceId, item.recordType, item.title, item.summary,
        item.sourceMetadata.knowledgeType, item.sourceMetadata.category, item.sourceMetadata.series].concat(item.sourceMetadata.tags || []).map(lower).join(" ");
      return haystack.includes(q);
    }).map(clone);
  }

  const providerDefinition = {
    providerId: PROVIDER_ID,
    providerVersion: MODULE_VERSION,
    sourceType: SOURCE_TYPE,
    readMode: "read-only",
    availability: "not-loaded",
    capabilities: ["memo-current-read", "knowledge-navigation", "decision-trace", "federation-source"],
    supports: supports,
    describe: describe,
    get: get,
    search: search,
    list: list
  };

  function initializeMemoProvider() {
    providerDefinition.availability = describe().availability;
    const existing = namespace.getProviderDefinition && namespace.getProviderDefinition(PROVIDER_ID);
    const registration = existing ? internal.buildResult(true, "IDE180_PROVIDER_EXISTS", "Ready", { providerId: PROVIDER_ID }) : namespace.registerProviderDefinition(providerDefinition);
    namespace.modules.memoProvider.status = registration && registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration && registration.ok === true, registration && registration.ok === true ? "IDE180_MEMO_PROVIDER_INITIALIZED" : "IDE180_MEMO_PROVIDER_INITIALIZATION_FAILED", registration && registration.ok === true ? "Ready" : "Blocked", { registration: registration, provider: describe() });
  }

  Object.assign(namespace.api, {
    initializeMemoProvider: initializeMemoProvider,
    getMemoProviderStatus: describe,
    listMemoSourceRecords: list,
    searchMemoSourceRecords: search,
    getMemoSourceRecord: get
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.memoProvider = { id: "IDE-180-MEMO-PROVIDER", version: MODULE_VERSION, status: "Loaded", phase: 6, providerId: PROVIDER_ID, sourceType: SOURCE_TYPE, readOnly: true, scoreBasedDeduplicationAllowed: false, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
