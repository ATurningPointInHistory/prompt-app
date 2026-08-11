/* ============================================================
   FILE: 13_knowledge_navigator_memo_archive_provider.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Memo Archive Provider 1.0.0
   Phase 8: Recovery / Archive Boundary
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Memo Archive Provider blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("memoArchiveProvider");
  const PROVIDER_ID = "IDE-180-PROVIDER-MEMO-ARCHIVE";
  const SOURCE_TYPE = "memo-archive-zip";
  const SUPPORTED_TEXT_EXTENSIONS = ["json", "md", "txt", "html", "csv", "tsv"];

  const archiveState = {
    opened: false,
    archiveId: null,
    archiveHash: null,
    archiveHashAlgorithm: null,
    sourceName: null,
    manifest: null,
    trust: "unverified",
    projectRelation: "unknown-project",
    records: [],
    rawItems: new Map(),
    warnings: [],
    errors: [],
    openedAt: null,
    imported: false
  };

  function arr(value) { return Array.isArray(value) ? value : []; }
  function text(value, fallback) { return internal.text(value, fallback); }
  function lower(value) { return text(value, "").normalize("NFKC").toLowerCase(); }
  function clone(value) { return internal.clone(value); }

  function resetArchiveState() {
    archiveState.opened = false;
    archiveState.archiveId = null;
    archiveState.archiveHash = null;
    archiveState.archiveHashAlgorithm = null;
    archiveState.sourceName = null;
    archiveState.manifest = null;
    archiveState.trust = "unverified";
    archiveState.projectRelation = "unknown-project";
    archiveState.records = [];
    archiveState.rawItems = new Map();
    archiveState.warnings = [];
    archiveState.errors = [];
    archiveState.openedAt = null;
    archiveState.imported = false;
  }

  function fnv1a(bytes) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i += 1) {
      hash ^= bytes[i];
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  async function digestBytes(bytes) {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    if (global.crypto && global.crypto.subtle) {
      try {
        const digest = await global.crypto.subtle.digest("SHA-256", view);
        return { algorithm: "SHA-256", hash: Array.from(new Uint8Array(digest)).map(function hex(v) { return v.toString(16).padStart(2, "0"); }).join("") };
      } catch (_) {}
    }
    return { algorithm: "FNV-1A-32", hash: fnv1a(view) };
  }

  async function toUint8Array(input) {
    if (input instanceof Uint8Array) return new Uint8Array(input);
    if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0));
    if (global.Blob && input instanceof global.Blob && typeof input.arrayBuffer === "function") return new Uint8Array(await input.arrayBuffer());
    if (input && input.buffer instanceof ArrayBuffer) return new Uint8Array(input.buffer.slice(input.byteOffset || 0, (input.byteOffset || 0) + (input.byteLength || input.length || 0)));
    throw new Error("Archive input must be File, Blob, ArrayBuffer or Uint8Array.");
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
    return status || "archived";
  }

  function officialState(value) {
    const status = lower(value);
    if (["official", "正式"].includes(status)) return "official";
    return value ? "non-official" : "unknown";
  }

  function validationState(value) {
    const status = lower(value);
    if (["validated", "passed", "pass", "valid"].includes(status)) return "validated";
    if (["failed", "fail", "invalid"].includes(status)) return "failed";
    if (status) return "not-validated";
    return "unknown";
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

  function canonicalEntityId(item, archiveId, path, index) {
    const explicit = text(item && item.canonicalEntityId, "");
    if (explicit) return explicit;
    const id = text(item && item.id, "");
    if (id) return id.includes(":") ? id : "entity:" + id;
    return "archive:" + archiveId + ":" + path + ":" + String(index);
  }

  function recordType(item, extension) {
    const explicit = text(item && (item.knowledgeType || item.type || item.memoMode), "");
    return explicit ? lower(explicit).replace(/\s+/g, "-") : (extension === "json" ? "memo" : "document");
  }

  function normalizeArchiveItem(item, context) {
    const raw = item && typeof item === "object" ? item : { text: text(item, "") };
    const id = text(raw.id, context.path + "#" + String(context.itemIndex));
    const title = text(raw.name || raw.title, context.path);
    const content = text(raw.text != null ? raw.text : (raw.content != null ? raw.content : raw.body), "");
    const relationships = arr(raw.relationships).map(normalizeRelationship).filter(Boolean);
    const evidenceReferences = arr(raw.evidenceReferences || raw.evidence).map(function evidence(itemValue) {
      return typeof itemValue === "string" ? { evidenceId: itemValue } : clone(itemValue);
    });
    const sourceId = context.archiveId + ":" + context.path + ":" + String(context.itemIndex);
    const normalized = {
      recordId: "IDE180-ARCHIVE-RECORD:" + sourceId,
      canonicalEntityId: canonicalEntityId(raw, context.archiveId, context.path, context.itemIndex),
      providerId: PROVIDER_ID,
      sourceId: sourceId,
      sourceType: SOURCE_TYPE,
      recordType: recordType(raw, context.extension),
      title: title,
      summary: text(raw.summary, content.slice(0, 240)),
      contentReference: { archiveId: context.archiveId, path: context.path, itemIndex: context.itemIndex, readMode: "read-only", imported: false },
      version: text(raw.version, ""),
      lifecycle: normalizeLifecycle(raw.status || raw.lifecycle || "archived"),
      officialState: officialState(raw.status || raw.officialState),
      validationState: validationState(raw.validationState || raw.validationStatus),
      scope: raw.scope == null ? null : clone(raw.scope),
      relationships: relationships,
      lineage: arr(raw.lineage).map(clone),
      evidenceReferences: evidenceReferences,
      trust: context.trust,
      timestamps: {
        createdAt: raw.createdAt || null,
        updatedAt: raw.updatedAt || null,
        importedAt: raw.importedAt || null,
        archivedAt: raw.archivedAt || context.openedAt || null
      },
      sourceMetadata: {
        archiveId: context.archiveId,
        archiveHash: context.archiveHash,
        archiveHashAlgorithm: context.archiveHashAlgorithm,
        path: context.path,
        itemIndex: context.itemIndex,
        sourceFormat: context.extension,
        readMode: "read-only",
        imported: false,
        projectRelation: context.projectRelation,
        manifestPresent: Boolean(context.manifest),
        originalStatus: raw.status || null,
        comparable: context.extension === "json" ? Object.keys(raw).sort().reduce(function comparable(out, key) {
          const value = raw[key];
          if (["string", "number", "boolean"].includes(typeof value) && value !== "") out[key] = value;
          return out;
        }, {}) : {}
      },
      immutable: true
    };
    return internal.deepFreeze(normalized);
  }

  function parseJsonItems(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.memos)) return parsed.memos;
    if (parsed && Array.isArray(parsed.memoBoxList)) return parsed.memoBoxList;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  }

  function manifestValidation(manifest) {
    if (!manifest) return { present: false, valid: false, status: "legacy-unverified", reasons: ["archive-manifest-missing"] };
    const reasons = [];
    if (!text(manifest.archiveId, "")) reasons.push("archiveId-missing");
    if (!text(manifest.version, "")) reasons.push("version-missing");
    if (text(manifest.sourceType, "") !== SOURCE_TYPE) reasons.push("sourceType-incompatible");
    if (!text(manifest.createdAt, "")) reasons.push("createdAt-missing");
    if (!Number.isFinite(Number(manifest.recordCount))) reasons.push("recordCount-invalid");
    return { present: true, valid: reasons.length === 0, status: reasons.length ? (reasons.includes("sourceType-incompatible") ? "incompatible" : "invalid") : "valid", reasons: reasons };
  }

  function projectRelation(manifest, settings) {
    const archiveProject = text(manifest && manifest.projectId, "");
    const currentProject = text(settings && settings.currentProjectId, "");
    if (!archiveProject || !currentProject) return "unknown-project";
    return archiveProject === currentProject ? "same-project" : "different-project";
  }

  async function parseZipEntries(zip, context) {
    const records = [];
    const rawItems = new Map();
    const warnings = [];
    const names = Object.keys(zip.files || {}).filter(function filter(name) { return zip.files[name] && !zip.files[name].dir; }).sort();
    for (const path of names) {
      const base = path.split("/").pop().toLowerCase();
      if (["archive_manifest.json", "memo_archive_manifest.json"].includes(base)) continue;
      const extension = path.includes(".") ? path.split(".").pop().toLowerCase() : "";
      if (!SUPPORTED_TEXT_EXTENSIONS.includes(extension)) continue;
      let content = "";
      try { content = await zip.files[path].async("string"); }
      catch (error) { warnings.push("read-failed:" + path + ":" + (error && error.message || error)); continue; }
      let items = [];
      if (extension === "json") {
        try { items = parseJsonItems(JSON.parse(content)); }
        catch (error) { warnings.push("json-parse-failed:" + path); continue; }
      } else {
        items = [{ name: path, text: content, memoMode: "document", knowledgeType: "Document", status: "Archive" }];
      }
      items.forEach(function each(item, index) {
        const record = normalizeArchiveItem(item, Object.assign({}, context, { path: path, extension: extension, itemIndex: index }));
        records.push(record);
        rawItems.set(record.recordId, internal.deepFreeze({ item: clone(item), content: extension === "json" ? JSON.stringify(item) : content, path: path, itemIndex: index, readOnly: true, imported: false }));
      });
    }
    return { records: records, rawItems: rawItems, warnings: warnings };
  }

  async function readManifest(zip) {
    const names = Object.keys(zip.files || {}).filter(function filter(name) { return zip.files[name] && !zip.files[name].dir; });
    const manifestPath = names.find(function find(path) {
      const base = path.split("/").pop().toLowerCase();
      return base === "archive_manifest.json" || base === "memo_archive_manifest.json";
    });
    if (!manifestPath) return { path: null, manifest: null, error: null };
    try {
      const textValue = await zip.files[manifestPath].async("string");
      return { path: manifestPath, manifest: JSON.parse(textValue), error: null };
    } catch (error) {
      return { path: manifestPath, manifest: null, error: error };
    }
  }

  async function open(input, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (settings.userConsent !== true) return internal.buildResult(false, "IDE180_ARCHIVE_USER_CONSENT_REQUIRED", "Blocked", null, { error: { message: "Explicit user consent is required before archive access.", category: "Consent Required" } });
    if (typeof global.JSZip !== "function") return internal.buildResult(false, "IDE180_ARCHIVE_JSZIP_UNAVAILABLE", "unsupported", null);
    resetArchiveState();
    let bytes;
    let zip;
    try {
      bytes = await toUint8Array(input);
      zip = await global.JSZip.loadAsync(bytes);
    } catch (error) {
      archiveState.errors.push(error && error.message || String(error));
      return internal.buildResult(false, "IDE180_ARCHIVE_CORRUPTED", "corrupted", { trust: "corrupted", errors: clone(archiveState.errors) });
    }

    const digest = await digestBytes(bytes);
    const manifestResult = await readManifest(zip);
    if (manifestResult.error) {
      archiveState.errors.push("archive-manifest-invalid-json");
      return internal.buildResult(false, "IDE180_ARCHIVE_MANIFEST_CORRUPTED", "corrupted", { trust: "corrupted", errors: clone(archiveState.errors) });
    }
    const manifestCheck = manifestValidation(manifestResult.manifest);
    if (manifestCheck.status === "incompatible") return internal.buildResult(false, "IDE180_ARCHIVE_INCOMPATIBLE", "incompatible", { trust: "incompatible", manifestValidation: manifestCheck });

    const archiveId = text(manifestResult.manifest && manifestResult.manifest.archiveId, "LEGACY-ARCHIVE-" + digest.hash.slice(0, 16).toUpperCase());
    const relation = projectRelation(manifestResult.manifest, settings);
    let trust = "unverified";
    if (manifestCheck.valid) trust = relation === "same-project" ? "verified-related" : "verified-archive";
    const openedAt = internal.nowIso();
    const parsed = await parseZipEntries(zip, {
      archiveId: archiveId,
      archiveHash: digest.hash,
      archiveHashAlgorithm: digest.algorithm,
      manifest: manifestResult.manifest,
      trust: trust,
      projectRelation: relation,
      openedAt: openedAt
    });
    const declaredCount = manifestResult.manifest && Number(manifestResult.manifest.recordCount);
    if (manifestCheck.valid && Number.isFinite(declaredCount) && declaredCount !== parsed.records.length) {
      trust = "unverified";
      parsed.warnings.push("manifest-record-count-mismatch:" + declaredCount + "!=" + parsed.records.length);
      parsed.records = parsed.records.map(function remap(record) {
        const mutable = clone(record);
        mutable.trust = "unverified";
        mutable.sourceMetadata = Object.assign({}, mutable.sourceMetadata, { manifestRecordCountMismatch: true });
        return internal.deepFreeze(mutable);
      });
    }

    archiveState.opened = true;
    archiveState.archiveId = archiveId;
    archiveState.archiveHash = digest.hash;
    archiveState.archiveHashAlgorithm = digest.algorithm;
    archiveState.sourceName = text(input && input.name, "selected-archive.zip");
    archiveState.manifest = clone(manifestResult.manifest);
    archiveState.trust = trust;
    archiveState.projectRelation = relation;
    archiveState.records = parsed.records.slice();
    archiveState.rawItems = parsed.rawItems;
    archiveState.warnings = parsed.warnings.slice();
    archiveState.errors = [];
    archiveState.openedAt = openedAt;
    archiveState.imported = false;
    providerDefinition.availability = archiveState.records.length ? "available" : "partial";
    return internal.buildResult(true, "IDE180_MEMO_ARCHIVE_OPENED", providerDefinition.availability, describe(), { manifestValidation: manifestCheck });
  }

  function close() {
    resetArchiveState();
    providerDefinition.availability = "not-loaded";
    return internal.buildResult(true, "IDE180_MEMO_ARCHIVE_CLOSED", "Ready", describe());
  }

  function supports(input) {
    const type = typeof input === "string" ? input : text(input && (input.navigationType || input.capability), "");
    return ["knowledge", "decision", "insight", "explanation", "search", "entity", "archive-recovery", "memo-archive-read"].includes(type);
  }

  function describe() {
    return {
      providerId: PROVIDER_ID,
      providerVersion: MODULE_VERSION,
      sourceType: SOURCE_TYPE,
      readMode: "read-only",
      availability: providerDefinition.availability,
      capabilities: providerDefinition.capabilities.slice(),
      archiveId: archiveState.archiveId,
      archiveHash: archiveState.archiveHash,
      archiveHashAlgorithm: archiveState.archiveHashAlgorithm,
      sourceName: archiveState.sourceName,
      recordCount: archiveState.records.length,
      trust: archiveState.trust,
      projectRelation: archiveState.projectRelation,
      imported: false,
      manifestPresent: Boolean(archiveState.manifest),
      warnings: clone(archiveState.warnings),
      errors: clone(archiveState.errors),
      mutationAllowed: false,
      openedAt: archiveState.openedAt
    };
  }

  function list(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const limit = Number.isInteger(settings.limit) && settings.limit >= 0 ? settings.limit : archiveState.records.length;
    return archiveState.records.slice(0, limit).map(function copy(record) { return internal.deepFreeze(clone(record)); });
  }

  function get(recordId) {
    const id = text(recordId && recordId.recordId || recordId, "");
    const record = archiveState.records.find(function find(item) { return item.recordId === id || item.sourceId === id; });
    return record ? internal.deepFreeze(clone(record)) : null;
  }

  function search(query, options) {
    const q = lower(query && query.query != null ? query.query : query);
    const settings = internal.isPlainObject(options) ? options : {};
    const limit = Number.isInteger(settings.limit) && settings.limit > 0 ? settings.limit : 50;
    if (!q) return list({ limit: limit });
    return archiveState.records.filter(function filter(item) {
      const raw = archiveState.rawItems.get(item.recordId);
      const bag = [item.recordId, item.canonicalEntityId, item.sourceId, item.recordType, item.title, item.summary,
        raw && raw.content].map(lower).join(" ");
      return bag.includes(q);
    }).slice(0, limit).map(function copy(record) { return internal.deepFreeze(clone(record)); });
  }

  function getTemporaryReference(recordId) {
    const record = get(recordId);
    if (!record) return internal.buildResult(false, "IDE180_ARCHIVE_RECORD_NOT_FOUND", "not-found", null);
    return internal.buildResult(true, "IDE180_ARCHIVE_TEMPORARY_REFERENCE_READY", "Ready", {
      record: record,
      provenance: {
        sourceType: SOURCE_TYPE,
        archiveId: archiveState.archiveId,
        recordId: record.recordId,
        readMode: "read-only",
        imported: false,
        trust: archiveState.trust,
        projectRelation: archiveState.projectRelation
      }
    });
  }

  const providerDefinition = {
    providerId: PROVIDER_ID,
    providerVersion: MODULE_VERSION,
    sourceType: SOURCE_TYPE,
    readMode: "read-only",
    availability: "not-loaded",
    capabilities: ["memo-archive-read", "archive-recovery", "temporary-reference", "read-only-search"],
    supports: supports,
    describe: describe,
    get: get,
    search: search,
    list: list
  };

  function initializeMemoArchiveProvider() {
    const existing = namespace.getProviderDefinition && namespace.getProviderDefinition(PROVIDER_ID);
    const registration = existing ? internal.buildResult(true, "IDE180_PROVIDER_EXISTS", "Ready", { providerId: PROVIDER_ID }) : namespace.registerProviderDefinition(providerDefinition);
    namespace.modules.memoArchiveProvider.status = registration && registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration && registration.ok === true, registration && registration.ok === true ? "IDE180_MEMO_ARCHIVE_PROVIDER_INITIALIZED" : "IDE180_MEMO_ARCHIVE_PROVIDER_INITIALIZATION_FAILED", registration && registration.ok === true ? "Ready" : "Blocked", { registration: registration, provider: describe() });
  }

  Object.assign(namespace.api, {
    initializeMemoArchiveProvider: initializeMemoArchiveProvider,
    openMemoArchiveSource: open,
    closeMemoArchiveSource: close,
    getMemoArchiveProviderStatus: describe,
    listMemoArchiveSourceRecords: list,
    searchMemoArchiveSourceRecords: search,
    getMemoArchiveSourceRecord: get,
    getMemoArchiveTemporaryReference: getTemporaryReference
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.memoArchiveProvider = {
    id: "IDE-180-MEMO-ARCHIVE-PROVIDER",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    providerId: PROVIDER_ID,
    sourceType: SOURCE_TYPE,
    automaticOpenAllowed: false,
    automaticImportAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
