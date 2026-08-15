/* ============================================================
   FILE: 13_local_first_repository_desktop_adapter.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.5.0 / Module: Desktop Adapter 1.0.0
   Phase 6: PC Local Repository / Desktop Adapter Foundation
   Read-only: no write, no canonical mutation, no transfer
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Desktop Adapter blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("desktopAdapter");
  const DESKTOP_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const DESCRIPTOR_ID = "REPOSITORY010-PC-LOCAL-REPOSITORY-DESCRIPTOR";
  let selectedDirectoryHandle = null;

  function fail(code, message, data) {
    state.desktopAdapterStatus = "Blocked";
    state.lastError = { message: message, category: "Desktop Adapter" };
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(state.lastError) });
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function each(key) { output[key] = stableValue(value[key]); });
    return output;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256(input) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") {
      throw new Error("Web Crypto SHA-256 is unavailable.");
    }
    let buffer;
    if (input instanceof ArrayBuffer) buffer = input;
    else if (ArrayBuffer.isView(input)) buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    else buffer = new TextEncoder().encode(String(input == null ? "" : input)).buffer;
    const digest = await global.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map(function hex(v) { return v.toString(16).padStart(2, "0"); }).join("");
  }

  function normalizeScriptPath(src) {
    const value = String(src || "").split("?")[0].split("#")[0].replace(/^\.\//, "");
    return value;
  }

  function manifestHashPayload(manifest) {
    const value = JSON.parse(JSON.stringify(manifest || {}));
    delete value.manifestHash;
    delete value.updatedAt;
    return value;
  }

  function manifestScriptSetPayload(manifest) {
    const hashes = manifest && manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};
    return (manifest && Array.isArray(manifest.scripts) ? manifest.scripts : []).map(function map(src) {
      const path = normalizeScriptPath(src);
      const item = hashes[path] || {};
      return path + ":" + String(item.sha256 || "");
    }).join("\n");
  }

  async function getFile(directoryHandle, path) {
    if (!directoryHandle || directoryHandle.kind !== "directory") throw new Error("A directory handle is required.");
    if (!path || path.includes("/") || path.includes("\\") || path === "." || path === "..") throw new Error("Only root-level project files are allowed in Phase 6.");
    const fileHandle = await directoryHandle.getFileHandle(path, { create: false });
    return fileHandle.getFile();
  }

  async function readText(directoryHandle, path) {
    const file = await getFile(directoryHandle, path);
    if (file && typeof file.text === "function") return file.text();
    const buffer = await file.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }

  async function fileSha256(directoryHandle, path) {
    const file = await getFile(directoryHandle, path);
    return sha256(await file.arrayBuffer());
  }

  function extractIndexScripts(indexHtml) {
    const output = [];
    const regex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi;
    let match;
    while ((match = regex.exec(String(indexHtml || "")))) {
      const src = String(match[1] || "");
      if (/^(?:https?:)?\/\//i.test(src) || /^data:/i.test(src)) continue;
      output.push(normalizeScriptPath(src));
    }
    return output;
  }

  async function queryReadPermission(directoryHandle) {
    if (!directoryHandle) return "denied";
    if (typeof directoryHandle.queryPermission !== "function") return "granted";
    try { return await directoryHandle.queryPermission({ mode: "read" }); } catch (_) { return "unknown"; }
  }

  function initializeDesktopRepositoryAdapter() {
    const available = typeof global.showDirectoryPicker === "function";
    const secure = global.isSecureContext !== false;
    state.desktopAdapterStatus = available && secure ? "Ready" : "Blocked";
    state.lastError = null;
    internal.touch();
    namespace.modules.desktopAdapter.status = state.desktopAdapterStatus;
    return internal.buildResult(available && secure, available && secure ? "REPOSITORY010_DESKTOP_ADAPTER_INITIALIZED" : "REPOSITORY010_DESKTOP_ADAPTER_UNAVAILABLE", available && secure ? "Ready" : "Blocked", getDesktopRepositoryAdapterStatus());
  }

  async function selectDesktopRepositoryDirectory() {
    if (typeof global.showDirectoryPicker !== "function") return fail("REPOSITORY010_DIRECTORY_PICKER_UNAVAILABLE", "File System Access API directory picker is unavailable.");
    if (global.isSecureContext === false) return fail("REPOSITORY010_SECURE_CONTEXT_REQUIRED", "A secure context is required for desktop directory access.");
    try {
      const handle = await global.showDirectoryPicker({ mode: "read" });
      if (!handle || handle.kind !== "directory") return fail("REPOSITORY010_DIRECTORY_SELECTION_INVALID", "The selected handle is not a directory.");
      selectedDirectoryHandle = handle;
      state.desktopAdapterStatus = "Selected";
      internal.touch();
      return internal.buildResult(true, "REPOSITORY010_DESKTOP_DIRECTORY_SELECTED", "Selected", { directoryName: internal.text(handle.name, "selected-directory"), readOnly: true, writePermissionRequested: false });
    } catch (error) {
      if (error && error.name === "AbortError") return internal.buildResult(false, "REPOSITORY010_DESKTOP_DIRECTORY_SELECTION_CANCELLED", "Cancelled", null);
      return fail("REPOSITORY010_DESKTOP_DIRECTORY_SELECTION_FAILED", error && error.message ? error.message : String(error));
    }
  }

  async function scanDesktopRepositoryDirectory(directoryHandle) {
    const handle = directoryHandle || selectedDirectoryHandle;
    if (!handle || handle.kind !== "directory") return fail("REPOSITORY010_DESKTOP_DIRECTORY_REQUIRED", "Select a desktop repository directory first.");
    try {
      const permission = await queryReadPermission(handle);
      const projectInfo = JSON.parse(await readText(handle, "project_info.json"));
      const manifest = JSON.parse(await readText(handle, "00_script_manifest.json"));
      const indexHtml = await readText(handle, "index.html");
      const entryFile = internal.text(projectInfo.entryFile, "");
      if (entryFile !== "index.html") return fail("REPOSITORY010_DESKTOP_ENTRY_FILE_INVALID", "project_info entryFile must be index.html.", { entryFile: entryFile });
      if (!Array.isArray(manifest.scripts) || !manifest.hashes || typeof manifest.hashes !== "object") return fail("REPOSITORY010_DESKTOP_MANIFEST_INVALID", "Static Script Manifest structure is invalid.");

      const fileChecks = [];
      for (const src of manifest.scripts) {
        const path = normalizeScriptPath(src);
        const expected = manifest.hashes[path] && manifest.hashes[path].sha256;
        let actual = null;
        let passed = false;
        try {
          actual = await fileSha256(handle, path);
          passed = typeof expected === "string" && actual === expected;
        } catch (error) {
          fileChecks.push({ path: path, passed: false, expectedSha256: expected || null, actualSha256: null, error: error && error.message ? error.message : String(error) });
          continue;
        }
        fileChecks.push({ path: path, passed: passed, expectedSha256: expected || null, actualSha256: actual });
      }

      const scriptSetHash = await sha256(manifestScriptSetPayload(manifest));
      const calculatedManifestHash = await sha256(stableStringify(manifestHashPayload(manifest)));
      const indexScripts = extractIndexScripts(indexHtml);
      const manifestScripts = manifest.scripts.map(normalizeScriptPath);
      const indexSequenceMatches = indexScripts.length === manifestScripts.length && indexScripts.every(function same(item, i) { return item === manifestScripts[i]; });
      const allFileHashesVerified = fileChecks.length === manifestScripts.length && fileChecks.every(function all(item) { return item.passed; });
      const scriptSetVerified = scriptSetHash === manifest.scriptSetHash;
      const manifestHashVerified = calculatedManifestHash === manifest.manifestHash;
      const projectFiles = Array.isArray(projectInfo.requestedFiles) ? projectInfo.requestedFiles : [];
      const requiredProjectFilesPresent = ["index.html", "00_script_manifest.json"].every(function has(item) { return projectFiles.indexOf(item) !== -1 || item === "00_script_manifest.json"; });
      const verified = permission !== "denied" && allFileHashesVerified && scriptSetVerified && manifestHashVerified && indexSequenceMatches && requiredProjectFilesPresent;

      if (!verified) {
        state.desktopAdapterStatus = "Integrity Mismatch";
        state.lastDesktopRepositoryScan = { directoryName: internal.text(handle.name, "selected-directory"), integrityStatus: "mismatch", scannedAt: internal.nowIso() };
        internal.touch();
        return fail("REPOSITORY010_DESKTOP_REPOSITORY_INTEGRITY_MISMATCH", "Desktop repository integrity validation failed.", {
          directoryName: internal.text(handle.name, "selected-directory"), permission: permission, allFileHashesVerified: allFileHashesVerified,
          scriptSetVerified: scriptSetVerified, manifestHashVerified: manifestHashVerified, indexSequenceMatches: indexSequenceMatches,
          requiredProjectFilesPresent: requiredProjectFilesPresent, failedFiles: fileChecks.filter(function failed(item) { return !item.passed; }).slice(0, 20)
        });
      }

      const nodeResult = namespace.createRepositoryNodeIdentity({
        projectId: "AI-PROMPT-OS-MAIN", repositoryId: "AI-PROMPT-OS-REPOSITORY", nodeId: DESKTOP_NODE_ID, nodeType: "canonical", createdAt: internal.nowIso()
      });
      if (!nodeResult || !nodeResult.ok) return fail("REPOSITORY010_DESKTOP_NODE_IDENTITY_FAILED", "Desktop repository node identity could not be created.", nodeResult);

      const descriptorResult = namespace.createDesktopRepositoryDescriptor({
        desktopRepositoryDescriptorId: DESCRIPTOR_ID,
        projectId: "AI-PROMPT-OS-MAIN",
        repositoryId: "AI-PROMPT-OS-REPOSITORY",
        nodeId: DESKTOP_NODE_ID,
        directoryName: internal.text(handle.name, "selected-directory"),
        entryFile: entryFile,
        projectVersion: internal.text(projectInfo.version, "unknown"),
        manifestHash: manifest.manifestHash,
        scriptSetHash: manifest.scriptSetHash,
        scriptCount: manifestScripts.length,
        scannedAt: internal.nowIso()
      });
      if (!descriptorResult || !descriptorResult.ok) return fail("REPOSITORY010_DESKTOP_DESCRIPTOR_FAILED", "Desktop repository descriptor could not be created.", descriptorResult);

      const descriptor = descriptorResult.data.record;
      const scan = {
        directoryName: descriptor.directoryName,
        permission: permission,
        projectInfo: { project: projectInfo.project || null, version: projectInfo.version || null, entryFile: entryFile, complete: projectInfo.complete === true },
        staticManifest: { scriptCount: manifestScripts.length, manifestHash: manifest.manifestHash, scriptSetHash: manifest.scriptSetHash },
        integrity: { status: "verified", allFileHashesVerified: true, scriptSetVerified: true, manifestHashVerified: true, indexSequenceMatches: true },
        descriptor: descriptor,
        nodeIdentity: nodeResult.data.record,
        readOnly: true,
        writePermissionRequested: false,
        writeAttempted: false,
        mutationAuthorityGranted: false,
        canonicalMutationPerformed: false,
        actualTransferAttempted: false,
        syncEngineInvoked: false,
        scannedAt: descriptor.scannedAt
      };
      state.desktopAdapterStatus = "Verified";
      state.lastDesktopRepositoryScan = internal.clone(scan);
      state.lastError = null;
      internal.touch();
      namespace.modules.desktopAdapter.status = "Verified";
      return internal.buildResult(true, "REPOSITORY010_DESKTOP_REPOSITORY_VERIFIED", "Verified", scan);
    } catch (error) {
      return fail("REPOSITORY010_DESKTOP_REPOSITORY_SCAN_FAILED", error && error.message ? error.message : String(error));
    }
  }

  async function selectAndScanDesktopRepository() {
    const selected = await selectDesktopRepositoryDirectory();
    if (!selected || !selected.ok) return selected;
    return scanDesktopRepositoryDirectory(selectedDirectoryHandle);
  }

  function getDesktopRepositoryAdapterStatus() {
    return {
      status: state.desktopAdapterStatus || "Not Initialized",
      phase: 6,
      adapterId: "REPOSITORY-010-PC-FILE-SYSTEM-ACCESS-READ-ONLY",
      desktopAdapterImplemented: true,
      secureContext: global.isSecureContext !== false,
      fileSystemAccessAvailable: typeof global.showDirectoryPicker === "function",
      directorySelected: Boolean(selectedDirectoryHandle),
      selectedDirectoryName: selectedDirectoryHandle ? internal.text(selectedDirectoryHandle.name, "selected-directory") : null,
      pcLocalRepositoryReadOnlyScanImplemented: true,
      pcLocalRepositoryIntegrityVerificationImplemented: true,
      readOnly: true,
      writePermissionRequested: false,
      writeAttempted: false,
      pcCanonicalMutationImplemented: false,
      directRepositoryMutationAllowed: false,
      actualV2TransferImplemented: VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === true,
      v2TransferIntegrityValidationImplemented: VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === true,
      syncEngineImplemented: false,
      lastScan: internal.clone(state.lastDesktopRepositoryScan)
    };
  }

  Object.assign(namespace.api, {
    initializeDesktopRepositoryAdapter: initializeDesktopRepositoryAdapter,
    selectDesktopRepositoryDirectory: selectDesktopRepositoryDirectory,
    scanDesktopRepositoryDirectory: scanDesktopRepositoryDirectory,
    selectAndScanDesktopRepository: selectAndScanDesktopRepository,
    getDesktopRepositoryAdapterStatus: getDesktopRepositoryAdapterStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.desktopAdapter = {
    id: "REPOSITORY-010-DESKTOP-ADAPTER",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 6,
    adapterId: "REPOSITORY-010-PC-FILE-SYSTEM-ACCESS-READ-ONLY",
    readOnly: true,
    writePermissionRequested: false,
    writeAttempted: false,
    pcCanonicalMutationImplemented: false,
    actualV2TransferImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.initializeLocalFirstRepositoryDesktopAdapter = initializeDesktopRepositoryAdapter;
  global.selectLocalFirstRepositoryDesktopDirectory = selectDesktopRepositoryDirectory;
  global.scanLocalFirstRepositoryDesktopDirectory = scanDesktopRepositoryDirectory;
  global.selectAndScanLocalFirstRepositoryDesktopRepository = selectAndScanDesktopRepository;
  global.getLocalFirstRepositoryDesktopAdapterStatus = getDesktopRepositoryAdapterStatus;
})(typeof window !== "undefined" ? window : globalThis);
