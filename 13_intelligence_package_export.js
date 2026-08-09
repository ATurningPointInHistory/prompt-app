/* ============================================================
   FILE: 13_intelligence_package_export.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 8: ZIP Export and IndexedDB Storage Adapter
   Architecture Decision: IDE-170-009
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("packageExport");
  const CAPABILITY_ID = "IDE-170-PACKAGE-EXPORT";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const STORAGE_CAPABILITY_ID = "IDE-170-PACKAGE-STORAGE";
  const STORAGE_CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(STORAGE_CAPABILITY_ID);
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const DB_NAME = "AI_PROMPT_OS_IDE170_INTELLIGENCE_PACKAGES_V1";
  const DB_VERSION = 1;
  const STORE_NAME = "packages";

  if (!(state.intelligencePackageExports instanceof Map)) state.intelligencePackageExports = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "lastIntelligencePackageExport")) state.lastIntelligencePackageExport = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastIntelligencePackageStorage")) state.lastIntelligencePackageStorage = null;

  function jsonText(value) {
    return JSON.stringify(value, null, 2) + "\n";
  }

  function timestampForFile(value) {
    return String(value || internal.nowIso()).replace(/[:.]/g, "-");
  }

  function fileNameForPackage(pkg) {
    return "IDE-170_Intelligence_Package_" + VERSION_MANIFEST.release.version + "_" + timestampForFile(pkg.frozenAt) + ".zip";
  }

  function triggerDownload(blob, fileName) {
    if (!global.document || !global.URL || typeof global.URL.createObjectURL !== "function") return false;
    const url = global.URL.createObjectURL(blob);
    try {
      const anchor = global.document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.style.display = "none";
      global.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return true;
    } finally {
      global.setTimeout(function revoke() { try { global.URL.revokeObjectURL(url); } catch (_) {} }, 60000);
    }
  }

  function requireJSZip() {
    if (typeof global.JSZip !== "function") {
      const error = new Error("JSZip is not available.");
      error.code = "JSZIP_UNAVAILABLE";
      throw error;
    }
    return global.JSZip;
  }

  async function buildIntelligencePackageZip(packageId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const pkg = namespace.getIntelligencePackage(packageId);
    if (!pkg) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_NOT_FOUND", "Blocked", null, { error: { message: "Intelligence Package was not found.", category: "Input Failure" } });
    const validation = namespace.validateIntelligencePackage(pkg);
    if (!validation.valid) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_EXPORT_VALIDATION_BLOCKED", "Blocked", { validation: validation }, { error: { message: "Invalid Package cannot be exported.", category: "Validation Failure" } });
    try {
      const JSZip = requireJSZip();
      const zip = new JSZip();
      zip.file("package_manifest.json", jsonText(pkg.manifest));
      pkg.artifactOrder.forEach(function addArtifact(artifactId) {
        const artifact = pkg.artifacts[artifactId];
        const location = pkg.locations[artifactId];
        zip.file(location, jsonText(artifact));
      });
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const result = {
        packageId: pkg.packageId,
        packageHash: pkg.manifest.integrity.packageHash,
        fileName: internal.text(settings.fileName, fileNameForPackage(pkg)),
        fileCount: pkg.artifactOrder.length + 1,
        artifactCount: pkg.artifactOrder.length,
        byteSize: Number(blob.size || 0),
        blob: blob,
        builtAt: internal.nowIso()
      };
      if (settings.download === true) result.downloadTriggered = triggerDownload(blob, result.fileName);
      // internal.buildResult intentionally JSON-clones ordinary data. Blob is a
      // browser-native binary object and must not pass through that clone path.
      const wrapped = internal.buildResult(true, "INTELLIGENCE_PACKAGE_ZIP_READY", "Ready", Object.assign({}, result, { blob: null }));
      wrapped.data.blob = blob;
      return wrapped;
    } catch (error) {
      return internal.buildResult(false, error.code || "INTELLIGENCE_PACKAGE_ZIP_BUILD_FAILED", "Failed", null, { error: { message: error.message, category: "Export Failure" } });
    }
  }

  function reconstructPackage(manifest, artifactsById, locations) {
    const order = internal.asArray(manifest && manifest.artifacts).map(function id(item) { return item.artifactId; });
    const completionEntry = internal.asArray(manifest && manifest.artifacts).find(function find(item) { return item.artifactType === "completion-gate-result"; });
    const handoffEntry = internal.asArray(manifest && manifest.artifacts).find(function find(item) { return item.artifactType === "ide180-handoff-contract"; });
    const completion = completionEntry && artifactsById[completionEntry.artifactId] && artifactsById[completionEntry.artifactId].payload || null;
    const handoff = handoffEntry && artifactsById[handoffEntry.artifactId] && artifactsById[handoffEntry.artifactId].payload || null;
    return {
      packageId: manifest.packageId,
      packageVersion: manifest.packageVersion,
      manifestVersion: manifest.manifestVersion,
      manifest: manifest,
      artifacts: artifactsById,
      artifactOrder: order,
      locations: locations,
      status: manifest.status || "Frozen",
      quality: { status: manifest.qualityStatus || "Ready", limitations: internal.clone(manifest.limitations || []), warnings: internal.clone(manifest.warnings || []) },
      completionGate: completion,
      handoffId: handoff && handoff.handoffId || manifest.handoff && manifest.handoff.handoffId || null,
      createdAt: manifest.createdAt,
      validatedAt: manifest.validatedAt,
      frozenAt: manifest.frozenAt,
      frozen: true,
      immutable: true
    };
  }

  async function validateIntelligencePackageZip(input) {
    try {
      const JSZip = requireJSZip();
      const zip = await JSZip.loadAsync(input);
      const manifestFile = zip.file("package_manifest.json");
      if (!manifestFile) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_MANIFEST_MISSING", "Invalid", null, { error: { message: "package_manifest.json is missing.", category: "Integrity Failure" } });
      const manifest = JSON.parse(await manifestFile.async("string"));
      const artifacts = {};
      const locations = {};
      const missing = [];
      for (const entry of internal.asArray(manifest.artifacts)) {
        const file = zip.file(entry.location);
        if (!file) { missing.push(entry.location); continue; }
        const artifact = JSON.parse(await file.async("string"));
        artifacts[entry.artifactId] = artifact;
        locations[entry.artifactId] = entry.location;
      }
      if (missing.length) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_ARTIFACTS_MISSING", "Invalid", { missing: missing }, { error: { message: "ZIP is missing one or more declared Artifacts.", category: "Integrity Failure" } });
      const pkg = reconstructPackage(manifest, artifacts, locations);
      const validation = namespace.validateIntelligencePackage(pkg);
      return internal.buildResult(validation.valid === true, validation.valid === true ? "INTELLIGENCE_PACKAGE_ZIP_VALID" : "INTELLIGENCE_PACKAGE_ZIP_INVALID", validation.valid === true ? "Valid" : "Invalid", { package: pkg, validation: validation, fileCount: Object.keys(zip.files).filter(function file(name) { return !zip.files[name].dir; }).length });
    } catch (error) {
      return internal.buildResult(false, error.code || "INTELLIGENCE_PACKAGE_ZIP_VALIDATION_FAILED", "Failed", null, { error: { message: error.message, category: "Integrity Failure" } });
    }
  }

  async function exportIntelligencePackage(packageId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const built = await buildIntelligencePackageZip(packageId, { download: false, fileName: settings.fileName });
    if (!built.ok) return built;
    const roundTrip = settings.validateRoundTrip === false ? null : await validateIntelligencePackageZip(built.data.blob);
    if (roundTrip && !roundTrip.ok) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_EXPORT_ROUNDTRIP_FAILED", "Blocked", { build: built.data, validation: roundTrip }, { error: { message: "Generated ZIP failed Package round-trip validation.", category: "Integrity Failure" } });
    const downloadTriggered = settings.download !== false ? triggerDownload(built.data.blob, built.data.fileName) : false;
    const record = {
      exportId: internal.nextId("IDE-170-PACKAGE-EXPORT"),
      packageId: built.data.packageId,
      packageHash: built.data.packageHash,
      fileName: built.data.fileName,
      fileCount: built.data.fileCount,
      byteSize: built.data.byteSize,
      status: "Exported",
      roundTripValidated: roundTrip ? roundTrip.ok === true : false,
      roundTripHealth: roundTrip && roundTrip.data && roundTrip.data.validation && roundTrip.data.validation.health || null,
      downloadTriggered: downloadTriggered,
      exportedAt: internal.nowIso()
    };
    const frozen = internal.deepFreeze(internal.clone(record));
    state.intelligencePackageExports.set(record.exportId, frozen);
    state.lastIntelligencePackageExport = frozen;
    internal.touch();
    internal.appendAudit({ action: "INTELLIGENCE_PACKAGE_EXPORTED", actor: internal.text(settings.actor, "Project Owner"), targetType: "Intelligence Package", targetId: record.packageId, outcome: "Exported", detail: { exportId: record.exportId, packageHash: record.packageHash, fileName: record.fileName, roundTripValidated: record.roundTripValidated } });
    const wrapped = internal.buildResult(true, "INTELLIGENCE_PACKAGE_EXPORTED", "Exported", { export: internal.clone(record), blob: null, validation: roundTrip && roundTrip.data && roundTrip.data.validation || null });
    wrapped.data.blob = built.data.blob;
    return wrapped;
  }

  function indexedDBAvailable() {
    return Boolean(global.indexedDB && typeof global.indexedDB.open === "function");
  }

  function openDatabase() {
    return new Promise(function promise(resolve, reject) {
      if (!indexedDBAvailable()) return reject(new Error("IndexedDB is unavailable."));
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function upgrade() {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "packageId" });
      };
      request.onsuccess = function success() { resolve(request.result); };
      request.onerror = function error() { reject(request.error || new Error("IndexedDB open failed.")); };
    });
  }

  async function saveIntelligencePackageToIndexedDB(packageId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const pkg = namespace.getIntelligencePackage(packageId);
    if (!pkg) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_NOT_FOUND", "Blocked", null);
    const validation = namespace.validateIntelligencePackage(pkg);
    if (!validation.valid) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_STORAGE_VALIDATION_BLOCKED", "Blocked", { validation: validation });
    try {
      const db = await openDatabase();
      const stored = await new Promise(function transactionPromise(resolve, reject) {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({ packageId: pkg.packageId, packageHash: pkg.manifest.integrity.packageHash, releaseVersion: VERSION_MANIFEST.release.version, savedAt: internal.nowIso(), package: pkg });
        tx.oncomplete = function complete() { resolve(true); };
        tx.onerror = function error() { reject(tx.error || new Error("IndexedDB write failed.")); };
        tx.onabort = function abort() { reject(tx.error || new Error("IndexedDB write aborted.")); };
      });
      db.close();
      const record = { packageId: pkg.packageId, packageHash: pkg.manifest.integrity.packageHash, persisted: stored === true, adapter: "IndexedDB", database: DB_NAME, objectStore: STORE_NAME, savedAt: internal.nowIso() };
      state.lastIntelligencePackageStorage = internal.deepFreeze(record);
      internal.touch();
      return internal.buildResult(true, "INTELLIGENCE_PACKAGE_INDEXEDDB_SAVED", "Persisted", { storage: internal.clone(record) });
    } catch (error) {
      return internal.buildResult(false, "INTELLIGENCE_PACKAGE_INDEXEDDB_SAVE_FAILED", "Failed", null, { error: { message: error.message, category: "Storage Failure" } });
    }
  }

  async function loadIntelligencePackageFromIndexedDB(packageId) {
    try {
      const db = await openDatabase();
      const record = await new Promise(function transactionPromise(resolve, reject) {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(internal.text(packageId, ""));
        req.onsuccess = function success() { resolve(req.result || null); };
        req.onerror = function error() { reject(req.error || new Error("IndexedDB read failed.")); };
      });
      db.close();
      if (!record) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_INDEXEDDB_NOT_FOUND", "Not Found", null);
      const validation = namespace.validateIntelligencePackage(record.package);
      if (!validation.valid || record.packageHash !== record.package.manifest.integrity.packageHash) return internal.buildResult(false, "INTELLIGENCE_PACKAGE_INDEXEDDB_INVALID", "Invalid", { record: record, validation: validation }, { error: { message: "Persisted Package failed read-back validation.", category: "Integrity Failure" } });
      return internal.buildResult(true, "INTELLIGENCE_PACKAGE_INDEXEDDB_LOADED", "Valid", { package: internal.clone(record.package), storage: { packageId: record.packageId, packageHash: record.packageHash, releaseVersion: record.releaseVersion, savedAt: record.savedAt }, validation: validation });
    } catch (error) {
      return internal.buildResult(false, "INTELLIGENCE_PACKAGE_INDEXEDDB_LOAD_FAILED", "Failed", null, { error: { message: error.message, category: "Storage Failure" } });
    }
  }

  async function deleteIntelligencePackageFromIndexedDB(packageId) {
    try {
      const db = await openDatabase();
      await new Promise(function transactionPromise(resolve, reject) {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(internal.text(packageId, ""));
        tx.oncomplete = function complete() { resolve(true); };
        tx.onerror = function error() { reject(tx.error || new Error("IndexedDB delete failed.")); };
      });
      db.close();
      return internal.buildResult(true, "INTELLIGENCE_PACKAGE_INDEXEDDB_DELETED", "Deleted", { packageId: packageId });
    } catch (error) {
      return internal.buildResult(false, "INTELLIGENCE_PACKAGE_INDEXEDDB_DELETE_FAILED", "Failed", null, { error: { message: error.message, category: "Storage Failure" } });
    }
  }

  function getIntelligencePackageExportStatus() {
    const last = state.lastIntelligencePackageExport;
    const storage = state.lastIntelligencePackageStorage;
    return {
      id: "IDE-170-PACKAGE-EXPORT-STATUS",
      version: MODULE_VERSION,
      exportCapabilityVersion: CAPABILITY_VERSION,
      storageCapabilityVersion: STORAGE_CAPABILITY_VERSION,
      status: namespace.getCapability && namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability && namespace.getCapability(CAPABILITY_ID) && namespace.getCapability(STORAGE_CAPABILITY_ID)),
      jsZipAvailable: typeof global.JSZip === "function",
      indexedDBAvailable: indexedDBAvailable(),
      exportCount: state.intelligencePackageExports.size,
      lastExport: internal.clone(last),
      lastStorage: internal.clone(storage),
      automaticExportAllowed: false,
      automaticStorageAllowed: false
    };
  }

  function registerCapability(id, version, name, provides) {
    const existing = namespace.getCapability && namespace.getCapability(id);
    if (existing && existing.version === version) return { ok: true, existing: true };
    if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(id);
    const result = namespace.registerCapability({
      capabilityId: id,
      name: name,
      version: version,
      type: "Package",
      status: "Active",
      owner: "IDE-170",
      dependencies: [{ capabilityId: "IDE-170-INTELLIGENCE-PACKAGE", minimumVersion: MINIMUM_VERSION, optional: false }, { capabilityId: "IDE-170-PACKAGE-VALIDATION", minimumVersion: MINIMUM_VERSION, optional: false }],
      schemas: [],
      provides: provides,
      source: "Architecture Decision 009"
    });
    return { ok: result.ok === true, code: result.code };
  }

  function initializePackageExport() {
    const exporter = registerCapability(CAPABILITY_ID, CAPABILITY_VERSION, "Intelligence Package ZIP Exporter", ["ZIP Export", "ZIP Round-trip Validation", "Explicit Download"]);
    const storage = registerCapability(STORAGE_CAPABILITY_ID, STORAGE_CAPABILITY_VERSION, "Intelligence Package Storage Adapter", ["IndexedDB Save", "IndexedDB Read-back Validation", "Explicit Local Storage"]);
    const ready = exporter.ok === true && storage.ok === true;
    namespace.modules.packageExport.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "PACKAGE_EXPORT_INITIALIZED" : "PACKAGE_EXPORT_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { exporter: exporter, storage: storage });
  }

  Object.assign(namespace.api, {
    initializePackageExport: initializePackageExport,
    buildIntelligencePackageZip: buildIntelligencePackageZip,
    exportIntelligencePackage: exportIntelligencePackage,
    exportPackage: exportIntelligencePackage,
    validateIntelligencePackageZip: validateIntelligencePackageZip,
    saveIntelligencePackageToIndexedDB: saveIntelligencePackageToIndexedDB,
    loadIntelligencePackageFromIndexedDB: loadIntelligencePackageFromIndexedDB,
    deleteIntelligencePackageFromIndexedDB: deleteIntelligencePackageFromIndexedDB,
    getIntelligencePackageExportStatus: getIntelligencePackageExportStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.packageExport = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    capabilityVersion: CAPABILITY_VERSION,
    storageCapabilityVersion: STORAGE_CAPABILITY_VERSION,
    status: "Loaded",
    zipExport: true,
    indexedDBAdapter: true,
    explicitOperationOnly: true,
    automaticExportAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
