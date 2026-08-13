/* ============================================================
   FILE: 13_development_automation_reflection.js
   IDE-190 Development Automation
   Release: 1.8.0 / Module: Reflection Package 1.0.0
   Phase 9: UI / Reflection Package / Cross-Device
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Reflection Package blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("reflection");

  function ensureState() {
    if (!(state.reflectionPackages instanceof Map)) state.reflectionPackages = new Map();
    if (!(state.reflectionPayloads instanceof Map)) state.reflectionPayloads = new Map();
    if (!Object.prototype.hasOwnProperty.call(state, "latestReflectionPackageId")) state.latestReflectionPackageId = null;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  async function sha256Text(value) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return "";
    const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(String(value == null ? "" : value)));
    return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function normalizeFilePath(value) {
    let path = internal.text(value, "").trim().replace(/^\.\//, "");
    if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/") || path.includes(":")) return "";
    if (path.includes("/")) return "";
    if (!/^[A-Za-z0-9_.-]+\.(?:js|json|html|css|txt|md)$/i.test(path)) return "";
    return path;
  }

  function explicitFileList(input) {
    const raw = Array.isArray(input) ? input : [];
    const normalized = [];
    raw.forEach(function add(item) {
      const path = normalizeFilePath(item);
      if (path && !normalized.includes(path)) normalized.push(path);
    });
    return normalized;
  }

  async function loadStaticManifest() {
    if (typeof global.loadStaticScriptManifest === "function") {
      const loaded = await global.loadStaticScriptManifest();
      if (loaded && loaded.ok && loaded.manifest) return loaded.manifest;
    }
    const response = await global.fetch("./00_script_manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Static Manifest fetch failed: " + response.status);
    return response.json();
  }

  function scriptUrlFor(path, manifest) {
    const target = "./" + path;
    const script = Array.isArray(manifest && manifest.scripts) ? manifest.scripts.find(function find(item) { return String(item).split("?")[0] === target; }) : null;
    return script || target;
  }

  async function fetchFile(path, manifest) {
    const url = scriptUrlFor(path, manifest);
    const response = await global.fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Reflection source fetch failed: " + path + " (" + response.status + ")");
    const text = await response.text();
    const sha256 = await sha256Text(text);
    const known = manifest && manifest.hashes && manifest.hashes[path] || null;
    if (known && known.sha256 && sha256 !== known.sha256) throw new Error("Reflection source SHA-256 mismatch: " + path);
    return {
      path: path,
      text: text,
      sha256: sha256,
      byteSize: new global.TextEncoder().encode(text).length,
      cacheKey: sha256.slice(0, Number(manifest && manifest.cacheKeyLength || 12)),
      sourceUrl: url,
      staticManifestBound: Boolean(known)
    };
  }

  function integrityPayload(pkg) { const copy = internal.clone(pkg || {}); delete copy.integrity; return copy; }

  async function prepareAutomationReflectionPackage(input) {
    ensureState();
    const settings = internal.isPlainObject(input) ? input : {};
    const files = explicitFileList(settings.filePaths);
    if (!files.length) return internal.buildResult(false, "IDE190_REFLECTION_EXPLICIT_FILES_REQUIRED", "Blocked", { sourceSelectionMode: "explicit-only" });
    if (internal.text(settings.actorRole, "Project Owner") !== "Project Owner") return internal.buildResult(false, "IDE190_REFLECTION_PROJECT_OWNER_REQUIRED", "Blocked", null);

    let manifest;
    try { manifest = await loadStaticManifest(); }
    catch (error) { return internal.buildResult(false, "IDE190_REFLECTION_STATIC_MANIFEST_UNAVAILABLE", "Blocked", null, { error: { message: error.message || String(error), category: "Dependency" } }); }

    const payloads = [];
    try {
      for (const path of files) payloads.push(await fetchFile(path, manifest));
    } catch (error) {
      return internal.buildResult(false, "IDE190_REFLECTION_SOURCE_VERIFICATION_FAILED", "Blocked", null, { error: { message: error.message || String(error), category: "Validation" } });
    }

    let receipt = null;
    const receiptId = internal.text(settings.automationReceiptId, "") || null;
    if (receiptId && typeof namespace.getPersistedAutomationReceipt === "function") {
      try { receipt = await namespace.getPersistedAutomationReceipt(receiptId); } catch (_) { receipt = null; }
      if (!receipt) return internal.buildResult(false, "IDE190_REFLECTION_RECEIPT_NOT_FOUND", "not-found", { automationReceiptId: receiptId });
      if (typeof namespace.verifyAutomationReceipt === "function") {
        const verified = await namespace.verifyAutomationReceipt(receipt);
        if (!verified || verified.valid !== true) return internal.buildResult(false, "IDE190_REFLECTION_RECEIPT_INVALID", "Blocked", { automationReceiptId: receiptId, verification: verified });
      }
    }

    const descriptor = {
      reflectionPackageId: internal.nextId("IDE-190-REFLECTION-PACKAGE"),
      reflectionPackageVersion: VERSION_MANIFEST.getContractVersion("reflectionPackage"),
      componentId: "IDE-190",
      componentVersion: VERSION_MANIFEST.release.version,
      artifactType: "manual-reflection-zip",
      externalEffectLevel: "X1",
      actorRole: "Project Owner",
      userMediated: true,
      sourceSelectionMode: "explicit-only",
      automaticFileSelection: false,
      automaticReflection: false,
      githubWrite: false,
      repositoryWriteCount: 0,
      persistentCommit: false,
      fileCount: payloads.length,
      files: payloads.map(function metadata(item) { return { path: item.path, sha256: item.sha256, byteSize: item.byteSize, cacheKey: item.cacheKey, staticManifestBound: item.staticManifestBound }; }),
      automationReceiptId: receiptId,
      receiptIncludedInExport: Boolean(receipt),
      staticIdentity: {
        manifestHash: internal.text(manifest.manifestHash, ""),
        scriptSetHash: internal.text(manifest.scriptSetHash, ""),
        scriptCount: Array.isArray(manifest.scripts) ? manifest.scripts.length : 0,
        hashAlgorithm: internal.text(manifest.hashAlgorithm, "")
      },
      sourcePayloadInDescriptor: false,
      sourcePayloadInExport: true,
      transientPayloadPersisted: false,
      applyInstructions: [
        "Review the reflection manifest and selected file hashes.",
        "Apply files manually using the existing ZIP paste / repository workflow.",
        "Do not treat package preparation as approval, dispatch, mutation, or commit permission.",
        "GitHub write and automatic external reflection remain disabled.",
        "Run the required Android validation after manual reflection."
      ],
      immutable: true,
      preparedAt: internal.nowIso(),
      integrity: { algorithm: "SHA-256", hash: "" }
    };
    descriptor.integrity.hash = await sha256Text(stableStringify(integrityPayload(descriptor)));
    const validation = namespace.validateContract("reflectionPackage", descriptor);
    if (!validation.valid) return internal.buildResult(false, "IDE190_REFLECTION_PACKAGE_CONTRACT_INVALID", "Blocked", { package: descriptor, validation: validation });

    const frozen = internal.deepFreeze(internal.clone(descriptor));
    state.reflectionPackages.set(frozen.reflectionPackageId, frozen);
    state.reflectionPayloads.set(frozen.reflectionPackageId, { files: payloads.map(function keep(item) { return { path: item.path, text: item.text }; }), receipt: receipt ? internal.clone(receipt) : null });
    state.latestReflectionPackageId = frozen.reflectionPackageId;
    internal.touch();
    return internal.buildResult(true, "IDE190_REFLECTION_PACKAGE_PREPARED", "Prepared", { package: internal.clone(frozen), validation: validation, downloadTriggered: false });
  }

  function getAutomationReflectionPackage(id) {
    ensureState();
    const key = internal.text(id, "") || state.latestReflectionPackageId;
    const pkg = key ? state.reflectionPackages.get(key) : null;
    return pkg ? internal.clone(pkg) : null;
  }

  function getAutomationReflectionStatus() {
    ensureState();
    return {
      status: "Ready",
      latestReflectionPackageId: state.latestReflectionPackageId,
      preparedCount: state.reflectionPackages.size,
      transientPayloadCount: state.reflectionPayloads.size,
      sourceSelectionMode: "explicit-only",
      externalEffectLevel: "X1",
      userMediated: true,
      githubWrite: false,
      automaticReflection: false,
      repositoryWriteCount: 0,
      persistentCommit: false,
      zipPasteManagerAvailable: typeof global.openZipPasteManager === "function",
      zipDiffManagerAvailable: typeof global.openZipDiffManager === "function"
    };
  }

  async function buildAutomationReflectionZip(packageId) {
    ensureState();
    const pkg = getAutomationReflectionPackage(packageId);
    if (!pkg) return { ok: false, code: "IDE190_REFLECTION_PACKAGE_NOT_FOUND", status: "not-found", data: null };
    const transient = state.reflectionPayloads.get(pkg.reflectionPackageId);
    if (!transient) return { ok: false, code: "IDE190_REFLECTION_TRANSIENT_PAYLOAD_NOT_FOUND", status: "not-found", data: null };
    if (typeof global.JSZip !== "function") return { ok: false, code: "IDE190_REFLECTION_JSZIP_REQUIRED", status: "Blocked", data: null };
    const zip = new global.JSZip();
    transient.files.forEach(function add(item) { zip.file(item.path, item.text); });
    zip.file("_ide190_reflection/reflection_manifest.json", JSON.stringify(pkg, null, 2));
    zip.file("_ide190_reflection/reflection_summary.txt", [
      "IDE-190 User-Mediated Reflection Package",
      "Package: " + pkg.reflectionPackageId,
      "External Effect: X1 - User-Mediated Reflection Preparation",
      "GitHub write: disabled",
      "Automatic reflection: disabled",
      "Repository writes: 0",
      "Persistent commit: prohibited",
      "Selected files: " + pkg.fileCount,
      "",
      "Files:",
      pkg.files.map(function line(item) { return "- " + item.path + "  sha256=" + item.sha256; }).join("\n"),
      "",
      "Apply manually and run the required validation."
    ].join("\n"));
    if (transient.receipt) zip.file("_ide190_reflection/automation_receipt.json", JSON.stringify(transient.receipt, null, 2));
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return { ok: true, code: "IDE190_REFLECTION_ZIP_BUILT", status: "Ready", data: { packageId: pkg.reflectionPackageId, bytes: bytes, byteLength: bytes.byteLength, downloadTriggered: false } };
  }

  async function downloadAutomationReflectionPackage(packageId) {
    const built = await buildAutomationReflectionZip(packageId);
    if (!built.ok) return built;
    if (!global.document || !global.URL || typeof global.URL.createObjectURL !== "function") return { ok: false, code: "IDE190_REFLECTION_DOWNLOAD_ENVIRONMENT_UNAVAILABLE", status: "Blocked", data: null };
    const pkg = getAutomationReflectionPackage(packageId);
    const blob = new global.Blob([built.data.bytes], { type: "application/zip" });
    const url = global.URL.createObjectURL(blob);
    const anchor = global.document.createElement("a");
    anchor.href = url;
    anchor.download = "IDE-190_Reflection_" + pkg.reflectionPackageId + ".zip";
    global.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    global.setTimeout(function revoke() { global.URL.revokeObjectURL(url); }, 1000);
    return { ok: true, code: "IDE190_REFLECTION_DOWNLOAD_TRIGGERED", status: "User-Mediated", data: { packageId: pkg.reflectionPackageId, fileName: anchor.download, userMediated: true, githubWrite: false, automaticReflection: false } };
  }

  function discardAutomationReflectionPackage(packageId) {
    ensureState();
    const key = internal.text(packageId, "") || state.latestReflectionPackageId;
    if (!key || !state.reflectionPackages.has(key)) return internal.buildResult(false, "IDE190_REFLECTION_PACKAGE_NOT_FOUND", "not-found", null);
    state.reflectionPackages.delete(key);
    state.reflectionPayloads.delete(key);
    if (state.latestReflectionPackageId === key) state.latestReflectionPackageId = null;
    internal.touch();
    return internal.buildResult(true, "IDE190_REFLECTION_PACKAGE_DISCARDED", "Ready", { packageId: key });
  }

  function initializeReflection() {
    ensureState();
    namespace.modules.reflection.status = "Ready";
    return internal.buildResult(true, "IDE190_REFLECTION_INITIALIZED", "Ready", getAutomationReflectionStatus());
  }

  Object.assign(namespace.api, {
    initializeReflection: initializeReflection,
    prepareAutomationReflectionPackage: prepareAutomationReflectionPackage,
    getAutomationReflectionPackage: getAutomationReflectionPackage,
    getAutomationReflectionStatus: getAutomationReflectionStatus,
    buildAutomationReflectionZip: buildAutomationReflectionZip,
    downloadAutomationReflectionPackage: downloadAutomationReflectionPackage,
    discardAutomationReflectionPackage: discardAutomationReflectionPackage
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.reflection = {
    id: "IDE-190-REFLECTION-PACKAGE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    externalEffectLevel: "X1",
    userMediated: true,
    githubWrite: false,
    automaticReflection: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
