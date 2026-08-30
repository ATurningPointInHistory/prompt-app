/* ============================================================
   FILE: 13_local_first_repository_picker_safe_transport.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.16.0 / Module: Picker-Safe Transport 1.0.0
   Phase 17 / Decision-015
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Picker-Safe Transport blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("pickerSafeTransport");

  function pageSessionId() {
    if (!state.operationalPageSessionId) state.operationalPageSessionId = internal.nextId("REPOSITORY010-PAGE-SESSION");
    return state.operationalPageSessionId;
  }

  function clearBinding(reason) {
    const previous = state.activeDesktopScanBinding ? internal.clone(state.activeDesktopScanBinding) : null;
    state.activeDesktopScanBinding = null;
    state.activeDesktopScanResult = null;
    state.desktopScanBindingConsumed = Boolean(previous);
    state.desktopScanBindingClearReason = reason || "cleared";
    internal.touch();
    return previous;
  }

  async function preparePcReceiver() {
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const persistence = await namespace.initializeLocalFirstRepositoryPersistence();
    if (!persistence || persistence.ok !== true) return persistence;
    clearBinding("fresh-prepare-started");
    const scan = await namespace.selectAndScanDesktopRepository();
    if (!scan || scan.ok !== true) {
      if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function") await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "picker-operation-blocked", sourceNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL", targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL", validationPassed: false, detail: { operation: "prepare-pc-receiver", resultCode: scan && scan.code || null } });
      return scan;
    }
    const data = scan.data;
    const binding = {
      desktopScanBindingId: internal.nextId("REPOSITORY010-DESKTOP-SCAN-BINDING"),
      pageSessionId: pageSessionId(),
      projectId: data.descriptor.projectId,
      repositoryId: data.descriptor.repositoryId,
      nodeId: data.descriptor.nodeId,
      directoryName: data.directoryName,
      manifestHash: data.staticManifest.manifestHash,
      scriptSetHash: data.staticManifest.scriptSetHash,
      scriptCount: data.staticManifest.scriptCount,
      integrityStatus: data.integrity.status,
      scannedAt: data.scannedAt,
      userGestureBound: true,
      singleUse: true,
      authorityEffect: "none",
      immutable: true
    };
    const validation = namespace.validateContract("desktopScanBindingDescriptor", binding);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_DESKTOP_SCAN_BINDING_INVALID", "Blocked", { validation: validation });
    state.activeDesktopScanBinding = internal.deepFreeze(internal.clone(binding));
    state.activeDesktopScanResult = internal.clone(scan);
    state.desktopScanBindingConsumed = false;
    state.desktopSelectionRequired = false;
    internal.touch();
    if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function") {
      await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "fresh-desktop-scan", sourceNodeId: binding.nodeId, targetNodeId: binding.nodeId, revisionId: null, relatedRecordId: binding.desktopScanBindingId, validationPassed: true, detail: { manifestHash: binding.manifestHash, scriptSetHash: binding.scriptSetHash, scriptCount: binding.scriptCount, pageSessionId: binding.pageSessionId } });
      await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "desktop-receiver-prepared", sourceNodeId: binding.nodeId, targetNodeId: binding.nodeId, relatedRecordId: binding.desktopScanBindingId, validationPassed: true, detail: { singleUse: true, hiddenDirectoryPickerRequired: false } });
    }
    return internal.buildResult(true, "REPOSITORY010_PICKER_SAFE_PC_RECEIVER_PREPARED", "Prepared", { desktopScanBinding: internal.clone(binding), desktopScanResult: internal.clone(scan), hiddenDirectoryPickerRequired: false, authorityEffect: "none" });
  }

  function getActiveBinding() {
    const binding = state.activeDesktopScanBinding;
    if (!binding || binding.pageSessionId !== pageSessionId()) return null;
    return internal.clone(binding);
  }

  function clearActiveBinding() {
    const previous = clearBinding("explicit-clear");
    return internal.buildResult(true, "REPOSITORY010_DESKTOP_SCAN_BINDING_CLEARED", "Ready", { previousBinding: previous, authorityEffect: "none" });
  }

  async function pickJsonFile() {
    if (typeof global.showOpenFilePicker === "function") {
      const handles = await global.showOpenFilePicker({ multiple: false, types: [{ description: "REPOSITORY-010 Sync Transport", accept: { "application/json": [".json"] } }] });
      if (!handles || !handles.length) throw new Error("No Sync Transport JSON was selected.");
      return handles[0].getFile();
    }
    return new Promise(function (resolve, reject) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.style.display = "none";
      document.body.appendChild(input);
      input.onchange = function () {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) reject(new Error("No Sync Transport JSON was selected.")); else resolve(file);
      };
      input.click();
    });
  }

  async function selectAndReceiveAndroidToPcSync() {
    const binding = getActiveBinding();
    const scanResult = state.activeDesktopScanResult ? internal.clone(state.activeDesktopScanResult) : null;
    if (!binding || !scanResult || scanResult.ok !== true) {
      if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function") await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "picker-operation-blocked", sourceNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL", targetNodeId: "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL", validationPassed: false, detail: { operation: "receive-sync-file", reason: "fresh-pc-scan-required" } });
      return internal.buildResult(false, "REPOSITORY010_FRESH_PC_SCAN_REQUIRED", "Blocked", { desktopSelectionRequired: true, hiddenDirectoryPickerInvoked: false });
    }
    let file;
    try { file = await pickJsonFile(); } catch (error) {
      return internal.buildResult(false, "REPOSITORY010_PICKER_SAFE_SYNC_FILE_SELECTION_FAILED", "Blocked", null, { error: { message: error.message, category: "Picker-Safe Transport" } });
    }
    const consumedBinding = clearBinding("receive-attempt-consumed");
    if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function") {
      await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "picker-file-selected", sourceNodeId: consumedBinding.nodeId, targetNodeId: consumedBinding.nodeId, relatedRecordId: consumedBinding.desktopScanBindingId, validationPassed: true, detail: { fileName: file.name || null, hiddenDirectoryPickerInvoked: false } });
      await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "desktop-scan-binding-consumed", sourceNodeId: consumedBinding.nodeId, targetNodeId: consumedBinding.nodeId, relatedRecordId: consumedBinding.desktopScanBindingId, validationPassed: true, detail: { singleUse: true, consumedBeforeVerification: true } });
    }
    return namespace.receiveLocalFirstRepositoryAndroidToPcSyncFile(file, { desktopScanResult: scanResult, desktopScanBindingId: consumedBinding.desktopScanBindingId, pickerSafe: true });
  }

  function getPickerSafeStatus() {
    return {
      status: getActiveBinding() ? "Prepared" : "Ready",
      phase: 17,
      moduleVersion: MODULE_VERSION,
      pageSessionId: pageSessionId(),
      activeDesktopScanBinding: getActiveBinding(),
      desktopSelectionRequired: !getActiveBinding(),
      hiddenDirectoryPickerFallbackAllowed: false,
      singleUseBindingRequired: true,
      pickerBindingGrantsAuthority: false,
      canonicalMutationAuthority: false
    };
  }

  Object.assign(namespace.api, {
    prepareLocalFirstRepositoryPickerSafePcReceiver: preparePcReceiver,
    getLocalFirstRepositoryActiveDesktopScanBinding: getActiveBinding,
    clearLocalFirstRepositoryActiveDesktopScanBinding: clearActiveBinding,
    selectAndReceiveLocalFirstRepositoryPickerSafeAndroidToPcSync: selectAndReceiveAndroidToPcSync,
    getLocalFirstRepositoryPickerSafeTransportStatus: getPickerSafeStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.pickerSafeTransport = {
    id: "REPOSITORY-010-PICKER-SAFE-TRANSPORT",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 17,
    hiddenDirectoryPickerFallbackAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
