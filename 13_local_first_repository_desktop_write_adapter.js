/* ============================================================
   FILE: 13_local_first_repository_desktop_write_adapter.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.11.1 / Module: Restricted Desktop Write Adapter 1.0.1
   Phase 12: Controlled Transaction Trial only
   Decision-007: No unrestricted filesystem write capability.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Restricted Desktop Write Adapter blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("desktopWriteAdapter");
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  let selectedWriteDirectoryHandle = null;
  const permits = new Map();

  function fail(code, message, data) {
    state.desktopWriteAdapterStatus = "Blocked";
    state.lastDesktopWriteAdapterError = { message: String(message || code || "Restricted Desktop Write Adapter failed."), at: internal.nowIso() };
    internal.touch();
    return internal.buildResult(false, code, "Blocked", data || null, { error: internal.clone(state.lastDesktopWriteAdapterError) });
  }

  function rootFileName(path) {
    const value = internal.text(path, "").split("?")[0].split("#")[0].replace(/^\.\//, "");
    if (!value || value.includes("/") || value.includes("\\") || value === "." || value === "..") return "";
    return value;
  }

  async function sha256(text) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") throw new Error("WebCrypto SHA-256 is unavailable.");
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text == null ? "" : text)));
    return Array.from(new Uint8Array(digest)).map(function hex(value) { return value.toString(16).padStart(2, "0"); }).join("");
  }

  async function queryPermission(handle, mode) {
    if (!handle) return "denied";
    if (typeof handle.queryPermission !== "function") return "granted";
    try { return await handle.queryPermission({ mode: mode }); } catch (_) { return "unknown"; }
  }

  async function requestPermission(handle, mode) {
    if (!handle) return "denied";
    if (typeof handle.requestPermission !== "function") return queryPermission(handle, mode);
    try { return await handle.requestPermission({ mode: mode }); } catch (_) { return "unknown"; }
  }

  async function ensureExplicitReadWritePermission(handle) {
    let permission = await queryPermission(handle, "readwrite");
    if (permission === "prompt") permission = await requestPermission(handle, "readwrite");
    return permission;
  }

  async function readText(handle, fileName) {
    const name = rootFileName(fileName);
    if (!name) throw new Error("Only root-level project files are allowed.");
    const fileHandle = await handle.getFileHandle(name, { create: false });
    const file = await fileHandle.getFile();
    return typeof file.text === "function" ? file.text() : new TextDecoder().decode(await file.arrayBuffer());
  }

  async function writeText(handle, fileName, value) {
    const name = rootFileName(fileName);
    if (!name) throw new Error("Only root-level project files are allowed.");
    const fileHandle = await handle.getFileHandle(name, { create: false });
    if (!fileHandle || typeof fileHandle.createWritable !== "function") throw new Error("File System Access writable handle is unavailable.");
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    let closed = false;
    try {
      await writable.write(String(value));
      await writable.close();
      closed = true;
    } finally {
      if (!closed && writable && typeof writable.abort === "function") {
        try { await writable.abort(); } catch (_) {}
      }
    }
    return true;
  }

  function initializeRestrictedDesktopWriteAdapter() {
    const available = typeof global.showDirectoryPicker === "function";
    const secure = global.isSecureContext !== false;
    state.desktopWriteAdapterStatus = available && secure ? "Ready" : "Blocked";
    state.lastDesktopWriteAdapterError = null;
    internal.touch();
    namespace.modules.desktopWriteAdapter.status = state.desktopWriteAdapterStatus;
    return internal.buildResult(available && secure,
      available && secure ? "REPOSITORY010_RESTRICTED_WRITE_ADAPTER_INITIALIZED" : "REPOSITORY010_RESTRICTED_WRITE_ADAPTER_UNAVAILABLE",
      available && secure ? "Ready" : "Blocked",
      getRestrictedDesktopWriteAdapterStatus()
    );
  }

  async function selectRestrictedDesktopWriteDirectory() {
    if (typeof global.showDirectoryPicker !== "function") return fail("REPOSITORY010_WRITE_DIRECTORY_PICKER_UNAVAILABLE", "File System Access API directory picker is unavailable.");
    if (global.isSecureContext === false) return fail("REPOSITORY010_WRITE_SECURE_CONTEXT_REQUIRED", "A secure context is required for controlled write access.");
    try {
      const handle = await global.showDirectoryPicker({ mode: "readwrite" });
      if (!handle || handle.kind !== "directory") return fail("REPOSITORY010_WRITE_DIRECTORY_SELECTION_INVALID", "The selected handle is not a directory.");
      const permission = await ensureExplicitReadWritePermission(handle);
      if (permission !== "granted") return fail("REPOSITORY010_WRITE_PERMISSION_NOT_GRANTED", "Explicit read/write permission must be granted before a Controlled Transaction can be prepared.", { permission: permission });
      selectedWriteDirectoryHandle = handle;
      state.desktopWriteAdapterStatus = "Selected / Restricted Read-Write";
      state.lastDesktopWriteAdapterError = null;
      internal.touch();
      namespace.modules.desktopWriteAdapter.status = "Selected";
      return internal.buildResult(true, "REPOSITORY010_RESTRICTED_WRITE_DIRECTORY_SELECTED", "Selected", {
        directoryName: internal.text(handle.name, "selected-directory"),
        permission: permission,
        mode: "restricted-readwrite",
        unrestrictedWriteApiExposed: false,
        targetBindingRequired: true,
        transactionPermitRequired: true,
        directRepositoryMutationAllowed: false
      });
    } catch (error) {
      if (error && error.name === "AbortError") return internal.buildResult(false, "REPOSITORY010_WRITE_DIRECTORY_SELECTION_CANCELLED", "Cancelled", null);
      return fail("REPOSITORY010_WRITE_DIRECTORY_SELECTION_FAILED", error && error.message ? error.message : String(error));
    }
  }

  async function verifySelectedWriteRepositoryFresh() {
    if (!selectedWriteDirectoryHandle) return fail("REPOSITORY010_WRITE_DIRECTORY_REQUIRED", "Select the controlled write repository directory first.");
    if (typeof namespace.scanDesktopRepositoryDirectory !== "function") return fail("REPOSITORY010_READONLY_SCAN_REQUIRED", "Read-only Desktop Repository scanner is unavailable.");
    const permission = await queryPermission(selectedWriteDirectoryHandle, "readwrite");
    if (permission !== "granted") return fail("REPOSITORY010_WRITE_PERMISSION_NOT_GRANTED", "Explicit read/write permission must still be granted immediately before transaction preparation. No backup, token consumption, or write may start.", { permission: permission, blockedBeforeBackup: true, blockedBeforeTokenConsumption: true, writeAttempted: false });
    const scan = await namespace.scanDesktopRepositoryDirectory(selectedWriteDirectoryHandle);
    if (!scan || scan.ok !== true) return scan || fail("REPOSITORY010_WRITE_REPOSITORY_SCAN_FAILED", "Fresh repository scan failed.");
    const baseline = state.lastCanonicalBaseline;
    if (!baseline) return fail("REPOSITORY010_WRITE_CANONICAL_BASELINE_REQUIRED", "Canonical Baseline is required before a controlled transaction.");
    const data = scan.data || {};
    const manifest = data.staticManifest || {};
    const matches = Boolean(
      data.descriptor && data.descriptor.nodeId === TARGET_NODE_ID &&
      data.directoryName === baseline.directoryName &&
      manifest.manifestHash === baseline.manifestHash &&
      manifest.scriptSetHash === baseline.scriptSetHash &&
      Number(manifest.scriptCount || 0) === Number(baseline.scriptCount || 0) &&
      data.integrity && data.integrity.status === "verified"
    );
    if (!matches) return fail("REPOSITORY010_WRITE_FRESH_SCAN_BASELINE_MISMATCH", "Fresh write-target repository scan no longer matches the explicit Canonical Baseline.", { scan: data, baseline: internal.clone(baseline) });
    return internal.buildResult(true, "REPOSITORY010_WRITE_TARGET_REPOSITORY_FRESH", "Verified", {
      directoryName: data.directoryName,
      targetNodeId: TARGET_NODE_ID,
      manifestHash: manifest.manifestHash,
      scriptSetHash: manifest.scriptSetHash,
      scriptCount: manifest.scriptCount,
      integrityStatus: data.integrity.status,
      readwritePermission: permission,
      canonicalMutationPerformed: false
    });
  }

  async function inspectExactTarget(fileName) {
    if (!selectedWriteDirectoryHandle) return fail("REPOSITORY010_WRITE_DIRECTORY_REQUIRED", "Select the controlled write repository directory first.");
    const path = rootFileName(fileName);
    if (!path) return fail("REPOSITORY010_WRITE_TARGET_INVALID", "Only a root-level existing target file is allowed.", { path: fileName || null });
    try {
      const source = await readText(selectedWriteDirectoryHandle, path);
      return internal.buildResult(true, "REPOSITORY010_WRITE_TARGET_READ", "Read", {
        targetFile: path,
        source: source,
        sha256: await sha256(source),
        writeAttempted: false
      });
    } catch (error) {
      return fail("REPOSITORY010_WRITE_TARGET_READ_FAILED", error && error.message ? error.message : String(error), { path: path });
    }
  }

  function authorizeBoundTransaction(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const transactionId = internal.text(source.transactionId, "");
    const targetFile = rootFileName(source.targetFile);
    const beforeFileSha256 = internal.text(source.beforeFileSha256, "");
    const afterFileSha256 = internal.text(source.afterFileSha256, "");
    const transaction = state.controlledTransactionRecords instanceof Map ? state.controlledTransactionRecords.get(transactionId) : null;
    if (!transactionId || !targetFile || !beforeFileSha256 || !afterFileSha256 || !transaction) return null;
    if (transaction.status !== "TOKEN_CONSUMED" || transaction.acceptanceTokenConsumed !== true || transaction.backupVerified !== true || transaction.journalPersisted !== true) return null;
    if (transaction.targetFile !== targetFile || transaction.beforeFileSha256 !== beforeFileSha256 || transaction.afterFileSha256 !== afterFileSha256) return null;
    const nonce = internal.nextId("REPOSITORY010-WRITE-PERMIT");
    const permit = {
      nonce: nonce,
      transactionId: transactionId,
      targetFile: targetFile,
      beforeFileSha256: beforeFileSha256,
      afterFileSha256: afterFileSha256,
      issuedAt: internal.nowIso(),
      used: false
    };
    permits.set(nonce, permit);
    return internal.clone(permit);
  }

  async function executeBoundWrite(permitInput, afterSource) {
    const permitId = internal.text(permitInput && permitInput.nonce, "");
    const permit = permits.get(permitId);
    if (!permit || permit.used === true) return fail("REPOSITORY010_WRITE_PERMIT_INVALID", "A valid unused transaction-bound write permit is required.");
    const transaction = state.controlledTransactionRecords instanceof Map ? state.controlledTransactionRecords.get(permit.transactionId) : null;
    if (!transaction || transaction.status !== "WRITE_STARTED") return fail("REPOSITORY010_WRITE_TRANSACTION_STATE_INVALID", "Transaction must be in WRITE_STARTED state before the bound write.");
    if (!selectedWriteDirectoryHandle) return fail("REPOSITORY010_WRITE_DIRECTORY_REQUIRED", "Controlled write directory is unavailable.");
    let physicalWriteInvocationStarted = false;
    let physicalWritePerformed = false;
    try {
      const current = await readText(selectedWriteDirectoryHandle, permit.targetFile);
      const currentHash = await sha256(current);
      if (currentHash !== permit.beforeFileSha256) return fail("REPOSITORY010_WRITE_CONCURRENT_CHANGE_BLOCKED", "Current file no longer matches the accepted before-file hash.", { expected: permit.beforeFileSha256, actual: currentHash, physicalWriteInvocationStarted: false, physicalWritePerformed: false });
      const afterHash = await sha256(String(afterSource));
      if (afterHash !== permit.afterFileSha256) return fail("REPOSITORY010_WRITE_AFTER_HASH_BLOCKED", "Requested write payload does not match the transaction-bound after-file hash.", { expected: permit.afterFileSha256, actual: afterHash, physicalWriteInvocationStarted: false, physicalWritePerformed: false });
      permit.used = true;
      permits.set(permitId, permit);
      physicalWriteInvocationStarted = true;
      await writeText(selectedWriteDirectoryHandle, permit.targetFile, afterSource);
      physicalWritePerformed = true;
      const written = await readText(selectedWriteDirectoryHandle, permit.targetFile);
      const writtenHash = await sha256(written);
      if (writtenHash !== permit.afterFileSha256) return fail("REPOSITORY010_WRITE_READBACK_MISMATCH", "Physical write completed but read-back hash does not match.", { expected: permit.afterFileSha256, actual: writtenHash, physicalWriteInvocationStarted: true, physicalWritePerformed: true });
      return internal.buildResult(true, "REPOSITORY010_BOUND_FUNCTION_FILE_WRITE_COMPLETED", "Written", {
        transactionId: permit.transactionId,
        targetFile: permit.targetFile,
        beforeFileSha256: permit.beforeFileSha256,
        afterFileSha256: writtenHash,
        physicalWriteInvocationStarted: true,
        physicalWritePerformed: true,
        unrestrictedWriteApiExposed: false
      });
    } catch (error) {
      return fail("REPOSITORY010_BOUND_FUNCTION_FILE_WRITE_FAILED", error && error.message ? error.message : String(error), {
        transactionId: permit.transactionId,
        targetFile: permit.targetFile,
        physicalWriteInvocationStarted: physicalWriteInvocationStarted,
        physicalWritePerformed: physicalWritePerformed,
        physicalWriteMayHaveOccurred: physicalWriteInvocationStarted
      });
    } finally {
      permits.delete(permitId);
    }
  }

  async function executeBoundRestore(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const transactionId = internal.text(source.transactionId, "");
    const targetFile = rootFileName(source.targetFile);
    const restoreSource = typeof source.restoreSource === "string" ? source.restoreSource : null;
    const expectedRestoreSha256 = internal.text(source.expectedRestoreSha256, "");
    const transaction = state.controlledTransactionRecords instanceof Map ? state.controlledTransactionRecords.get(transactionId) : null;
    if (!transaction || !targetFile || restoreSource == null || !expectedRestoreSha256) return fail("REPOSITORY010_RESTORE_CONTEXT_INVALID", "A transaction-bound restore context is required.");
    if (!["ROLLBACK_STARTED", "EMERGENCY_ROLLBACK_STARTED"].includes(transaction.status)) return fail("REPOSITORY010_RESTORE_TRANSACTION_STATE_INVALID", "Rollback state is required before restore.", { status: transaction.status });
    if (transaction.targetFile !== targetFile || transaction.beforeFileSha256 !== expectedRestoreSha256) return fail("REPOSITORY010_RESTORE_BINDING_MISMATCH", "Restore payload is not bound to the transaction before-file hash.");
    if (!selectedWriteDirectoryHandle) return fail("REPOSITORY010_WRITE_DIRECTORY_REQUIRED", "Controlled write directory is unavailable.");
    try {
      const restoreHash = await sha256(restoreSource);
      if (restoreHash !== expectedRestoreSha256) return fail("REPOSITORY010_RESTORE_SOURCE_HASH_MISMATCH", "Restore source hash does not match the verified backup hash.", { expected: expectedRestoreSha256, actual: restoreHash });
      await writeText(selectedWriteDirectoryHandle, targetFile, restoreSource);
      const restored = await readText(selectedWriteDirectoryHandle, targetFile);
      const restoredHash = await sha256(restored);
      if (restoredHash !== expectedRestoreSha256) return fail("REPOSITORY010_RESTORE_READBACK_MISMATCH", "Rollback write read-back verification failed.", { expected: expectedRestoreSha256, actual: restoredHash });
      return internal.buildResult(true, "REPOSITORY010_TRANSACTION_BOUND_RESTORE_COMPLETED", "Restored", {
        transactionId: transactionId,
        targetFile: targetFile,
        restoredFileSha256: restoredHash,
        verified: true
      });
    } catch (error) {
      return fail("REPOSITORY010_TRANSACTION_BOUND_RESTORE_FAILED", error && error.message ? error.message : String(error), { transactionId: transactionId, targetFile: targetFile });
    }
  }

  function getRestrictedDesktopWriteAdapterStatus() {
    return {
      status: state.desktopWriteAdapterStatus || "Not Initialized",
      moduleVersion: MODULE_VERSION,
      adapterId: "REPOSITORY-010-PC-RESTRICTED-FUNCTION-WRITE-ADAPTER",
      secureContext: global.isSecureContext !== false,
      fileSystemAccessAvailable: typeof global.showDirectoryPicker === "function",
      directorySelected: Boolean(selectedWriteDirectoryHandle),
      selectedDirectoryName: selectedWriteDirectoryHandle ? internal.text(selectedWriteDirectoryHandle.name, "selected-directory") : null,
      mode: "restricted-readwrite",
      rootLevelExistingFilesOnly: true,
      arbitraryFileCreateAllowed: false,
      arbitraryFileDeleteAllowed: false,
      unrestrictedWriteApiExposed: false,
      transactionPermitRequired: true,
      explicitReadWritePermissionGrantRequired: true,
      promptPermissionRequestImplemented: true,
      preTransactionPermissionRevalidationRequired: true,
      permissionMustBeGrantedBeforeBackupAndTokenConsumption: true,
      exactBeforeHashRequired: true,
      exactAfterHashRequired: true,
      directRepositoryMutationAllowed: false,
      pcCanonicalMutationImplemented: false,
      phase12ControlledTrialWriteImplemented: true,
      activePermitCount: permits.size,
      lastError: internal.clone(state.lastDesktopWriteAdapterError || null)
    };
  }

  internal.phase12DesktopWriteAdapter = {
    verifySelectedWriteRepositoryFresh: verifySelectedWriteRepositoryFresh,
    inspectExactTarget: inspectExactTarget,
    authorizeBoundTransaction: authorizeBoundTransaction,
    executeBoundWrite: executeBoundWrite,
    executeBoundRestore: executeBoundRestore
  };

  Object.assign(namespace.api, {
    initializeRestrictedDesktopWriteAdapter: initializeRestrictedDesktopWriteAdapter,
    selectRestrictedDesktopWriteDirectory: selectRestrictedDesktopWriteDirectory,
    getRestrictedDesktopWriteAdapterStatus: getRestrictedDesktopWriteAdapterStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.desktopWriteAdapter = {
    id: "REPOSITORY-010-RESTRICTED-DESKTOP-WRITE-ADAPTER",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 12,
    mode: "restricted-readwrite",
    functionPatchOnly: true,
    unrestrictedWriteApiExposed: false,
    transactionPermitRequired: true,
    explicitReadWritePermissionGrantRequired: true,
    promptPermissionRequestImplemented: true,
    preTransactionPermissionRevalidationRequired: true,
    permissionMustBeGrantedBeforeBackupAndTokenConsumption: true,
    directRepositoryMutationAllowed: false,
    pcCanonicalMutationImplemented: false,
    controlledTrialWriteImplemented: true,
    loadedAt: internal.nowIso()
  };

  global.initializeLocalFirstRepositoryRestrictedDesktopWriteAdapter = initializeRestrictedDesktopWriteAdapter;
  global.selectLocalFirstRepositoryRestrictedDesktopWriteDirectory = selectRestrictedDesktopWriteDirectory;
  global.getLocalFirstRepositoryRestrictedDesktopWriteAdapterStatus = getRestrictedDesktopWriteAdapterStatus;
})(typeof window !== "undefined" ? window : globalThis);
