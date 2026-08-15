/* ============================================================
   FILE: 13_local_first_repository_v2_transfer.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.6.0 / Module: V2 Transfer 1.0.0
   Phase 7: Actual V2 Explicit File Transfer / Integrity Validation
   Boundary: receive + verify only; no canonical mutation, no V3/V4/V5
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 V2 Transfer blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("v2Transfer");
  const ENVELOPE_SCHEMA = "REPOSITORY-010-V2-TRANSFER-ENVELOPE";
  const ENVELOPE_VERSION = "1.0.0";
  const TARGET_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const TRANSPORT_MODE = "explicit-file-transfer";

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function each(key) { out[key] = stableValue(value[key]); });
    return out;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  function isSha256Hex(value) { return /^[0-9a-f]{64}$/i.test(String(value || "")); }

  async function sha256Hex(value) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") {
      throw new Error("Web Crypto SHA-256 is unavailable.");
    }
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
    const buffer = await global.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buffer)).map(function hex(v) { return v.toString(16).padStart(2, "0"); }).join("");
  }

  function transferPackageHashPayload(record) {
    return {
      transferPackageId: record.transferPackageId,
      syncCandidateId: record.syncCandidateId,
      projectId: record.projectId,
      repositoryId: record.repositoryId,
      sourceNodeId: record.sourceNodeId,
      revisionId: record.revisionId,
      baseRevisionId: record.baseRevisionId,
      integrityRecordId: record.integrityRecordId,
      candidateStateRecordId: record.candidateStateRecordId,
      v1GateId: record.v1GateId,
      integritySnapshot: internal.clone(record.integritySnapshot || {}),
      packageHashAlgorithm: "SHA-256",
      integrityPreflightStatus: "verified",
      integrityPreflightPassed: true,
      transferAttempted: false,
      transferCompleted: false,
      v2TransferIntegrityValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none",
      createdAt: record.createdAt,
      immutable: true
    };
  }

  async function calculateV2TransferPackageHash(record) {
    return sha256Hex(stableStringify(transferPackageHashPayload(record || {})));
  }

  async function verifyV2TransferPackage(record) {
    const pkg = internal.isPlainObject(record) ? record : {};
    const contract = typeof namespace.validateContract === "function"
      ? namespace.validateContract("transferPackageDescriptor", pkg)
      : { valid: false, checks: [] };
    let calculatedHash = null;
    let hashMatches = false;
    try {
      calculatedHash = await calculateV2TransferPackageHash(pkg);
      hashMatches = isSha256Hex(pkg.packageHash) && calculatedHash === pkg.packageHash;
    } catch (_) {}
    const snapshot = internal.isPlainObject(pkg.integritySnapshot) ? pkg.integritySnapshot : {};
    const fileHashes = internal.isPlainObject(snapshot.fileHashes) ? snapshot.fileHashes : {};
    const snapshotValid = snapshot.hashAlgorithm === "SHA-256" &&
      snapshot.integrityStatus === "verified" &&
      Object.keys(fileHashes).length > 0 &&
      Object.keys(fileHashes).every(function each(key) { return isSha256Hex(fileHashes[key]); }) &&
      isSha256Hex(snapshot.manifestHash) &&
      isSha256Hex(snapshot.scriptSetHash) &&
      isSha256Hex(snapshot.contentHash) &&
      isSha256Hex(snapshot.repositoryStateHash);
    const boundaryValid = snapshotValid === true && pkg.packageHashAlgorithm === "SHA-256" &&
      pkg.integrityPreflightPassed === true &&
      pkg.integrityPreflightStatus === "verified" &&
      pkg.transferAttempted === false &&
      pkg.transferCompleted === false &&
      pkg.v2TransferIntegrityValidated === false &&
      pkg.syncEngineInvoked === false &&
      pkg.authorityEffect === "none" &&
      pkg.immutable === true;
    return {
      valid: contract.valid === true && hashMatches === true && boundaryValid === true,
      contractValid: contract.valid === true,
      contract: contract,
      packageHashVerified: hashMatches,
      expectedPackageHash: pkg.packageHash || null,
      calculatedPackageHash: calculatedHash,
      boundaryValid: boundaryValid,
      integritySnapshotValid: snapshotValid
    };
  }

  function envelopeHashPayload(envelope) {
    return {
      schema: envelope.schema,
      version: envelope.version,
      componentId: envelope.componentId,
      transportMode: envelope.transportMode,
      senderEvidence: internal.clone(envelope.senderEvidence || {}),
      transferPackage: internal.clone(envelope.transferPackage || {}),
      requiresUserAction: true,
      canonicalMutationRequested: false,
      syncEngineRequested: false,
      createdAt: envelope.createdAt,
      immutable: true
    };
  }

  async function calculateV2TransferEnvelopeHash(envelope) {
    return sha256Hex(stableStringify(envelopeHashPayload(envelope || {})));
  }

  async function buildV2TransferEnvelope(transferPackageOrId, senderEvidence) {
    let pkg = transferPackageOrId;
    if (typeof transferPackageOrId === "string") {
      if (typeof namespace.getPersistedLocalFirstRepositoryRecord !== "function") {
        return internal.buildResult(false, "REPOSITORY010_V2_SOURCE_PERSISTENCE_API_UNAVAILABLE", "Blocked", null);
      }
      pkg = await namespace.getPersistedLocalFirstRepositoryRecord("transferPackage", transferPackageOrId);
    }
    if (!pkg) return internal.buildResult(false, "REPOSITORY010_V2_TRANSFER_PACKAGE_NOT_FOUND", "Blocked", null);
    const verified = await verifyV2TransferPackage(pkg);
    if (!verified.valid) return internal.buildResult(false, "REPOSITORY010_V2_TRANSFER_PACKAGE_INVALID", "Blocked", verified);

    const evidence = internal.isPlainObject(senderEvidence) ? senderEvidence : {};
    const envelope = {
      schema: ENVELOPE_SCHEMA,
      version: ENVELOPE_VERSION,
      componentId: "REPOSITORY-010",
      transportMode: TRANSPORT_MODE,
      senderEvidence: {
        runtimeVersion: internal.text(evidence.runtimeVersion, VERSION_MANIFEST.release.version),
        sourceNodeId: internal.text(evidence.sourceNodeId, pkg.sourceNodeId),
        userAgent: internal.text(evidence.userAgent, global.navigator && global.navigator.userAgent || "unknown"),
        platform: internal.text(evidence.platform, global.navigator && global.navigator.platform || "unknown"),
        origin: internal.text(evidence.origin, global.location && global.location.origin || "unknown"),
        exportedAt: internal.text(evidence.exportedAt, internal.nowIso()),
        realDeviceClaim: internal.text(evidence.realDeviceClaim, /Android/i.test(global.navigator && global.navigator.userAgent || "") ? "android" : "unspecified")
      },
      transferPackage: internal.clone(pkg),
      requiresUserAction: true,
      canonicalMutationRequested: false,
      syncEngineRequested: false,
      createdAt: internal.nowIso(),
      immutable: true
    };
    envelope.envelopeHashAlgorithm = "SHA-256";
    envelope.envelopeHash = await calculateV2TransferEnvelopeHash(envelope);
    return internal.buildResult(true, "REPOSITORY010_V2_TRANSFER_ENVELOPE_READY", "Ready", {
      envelope: envelope,
      packageHashVerified: true,
      envelopeHashVerified: true,
      authorityEffect: "none"
    });
  }

  async function validateV2TransferEnvelope(envelope, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const data = internal.isPlainObject(envelope) ? envelope : {};
    const packageResult = await verifyV2TransferPackage(data.transferPackage);
    let calculatedEnvelopeHash = null;
    let envelopeHashVerified = false;
    try {
      calculatedEnvelopeHash = await calculateV2TransferEnvelopeHash(data);
      envelopeHashVerified = data.envelopeHashAlgorithm === "SHA-256" && isSha256Hex(data.envelopeHash) && data.envelopeHash === calculatedEnvelopeHash;
    } catch (_) {}
    const sender = internal.isPlainObject(data.senderEvidence) ? data.senderEvidence : {};
    const senderIsAndroid = /Android/i.test(String(sender.userAgent || "")) || sender.realDeviceClaim === "android";
    const sourceMatches = Boolean(data.transferPackage && sender.sourceNodeId === data.transferPackage.sourceNodeId);
    const envelopeBoundaryValid = data.schema === ENVELOPE_SCHEMA &&
      data.version === ENVELOPE_VERSION &&
      data.componentId === "REPOSITORY-010" &&
      data.transportMode === TRANSPORT_MODE &&
      data.requiresUserAction === true &&
      data.canonicalMutationRequested === false &&
      data.syncEngineRequested === false &&
      data.immutable === true;
    const androidRequiredSatisfied = opts.requireAndroidSender === true ? senderIsAndroid === true : true;
    return {
      valid: packageResult.valid === true && envelopeHashVerified === true && sourceMatches === true && envelopeBoundaryValid === true && androidRequiredSatisfied === true,
      packageValidation: packageResult,
      envelopeHashVerified: envelopeHashVerified,
      expectedEnvelopeHash: data.envelopeHash || null,
      calculatedEnvelopeHash: calculatedEnvelopeHash,
      senderIsAndroid: senderIsAndroid,
      sourceNodeMatchesSenderEvidence: sourceMatches,
      envelopeBoundaryValid: envelopeBoundaryValid,
      androidSenderRequired: opts.requireAndroidSender === true,
      transportMode: data.transportMode || null
    };
  }

  async function receiveV2TransferEnvelope(envelope, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const validation = await validateV2TransferEnvelope(envelope, { requireAndroidSender: opts.requireAndroidSender === true });
    if (!validation.valid) {
      state.v2TransferStatus = "Blocked";
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_V2_TRANSFER_INTEGRITY_BLOCKED", "Blocked", validation);
    }
    const pkg = envelope.transferPackage;
    const receiptInput = {
      receiptId: internal.text(opts.receiptId, internal.nextId("REPOSITORY010-V2-RECEIPT")),
      transferPackageId: pkg.transferPackageId,
      projectId: pkg.projectId,
      repositoryId: pkg.repositoryId,
      sourceNodeId: pkg.sourceNodeId,
      targetNodeId: TARGET_NODE_ID,
      revisionId: pkg.revisionId,
      baseRevisionId: pkg.baseRevisionId,
      packageHash: pkg.packageHash,
      receiverCalculatedPackageHash: validation.packageValidation.calculatedPackageHash,
      envelopeHash: envelope.envelopeHash,
      senderRuntimeVersion: envelope.senderEvidence.runtimeVersion,
      senderOrigin: envelope.senderEvidence.origin,
      senderUserAgent: envelope.senderEvidence.userAgent,
      transportMode: TRANSPORT_MODE,
      sourceFileName: internal.text(opts.fileName, "transfer-package.json"),
      receivedViaUserSelection: opts.receivedViaUserSelection === true,
      receivedAt: internal.nowIso()
    };
    const created = namespace.createV2TransferReceiptDescriptor(receiptInput);
    if (!created || created.ok !== true) {
      state.v2TransferStatus = "Blocked";
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_V2_RECEIPT_CREATION_FAILED", "Blocked", created && created.data || null);
    }
    const receipt = created.data.record;
    state.v2TransferStatus = "Validated";
    state.lastV2TransferReceipt = internal.clone(receipt);
    state.lastV2TransferEnvelope = internal.clone(envelope);
    state.lastV2TransferValidation = internal.clone(validation);
    internal.touch();
    namespace.modules.v2Transfer.status = "Validated";
    return internal.buildResult(true, "REPOSITORY010_V2_TRANSFER_INTEGRITY_VALIDATED", "Validated", {
      receipt: receipt,
      transferPackage: internal.clone(pkg),
      validation: validation,
      actualTransferReceived: opts.receivedViaUserSelection === true,
      canonicalMutationPerformed: false,
      mutationAuthorityGranted: false,
      validationIsApproval: false,
      explicitAcceptanceGranted: false,
      v3BaseConflictValidated: false,
      v4TargetEnvironmentValidated: false,
      syncEngineInvoked: false,
      authorityEffect: "none"
    });
  }

  async function receiveV2TransferFile(file, options) {
    if (!file || typeof file.text !== "function") return internal.buildResult(false, "REPOSITORY010_V2_TRANSFER_FILE_REQUIRED", "Blocked", null);
    let envelope;
    try { envelope = JSON.parse(await file.text()); }
    catch (error) { return internal.buildResult(false, "REPOSITORY010_V2_TRANSFER_FILE_JSON_INVALID", "Blocked", null, { error: { message: error.message, category: "Transfer" } }); }
    const opts = Object.assign({}, internal.isPlainObject(options) ? options : {}, {
      fileName: internal.text(file.name, "transfer-package.json"),
      receivedViaUserSelection: true
    });
    return receiveV2TransferEnvelope(envelope, opts);
  }

  function downloadJson(filename, value) {
    if (!global.document || typeof Blob === "undefined" || !global.URL || typeof global.URL.createObjectURL !== "function") {
      return internal.buildResult(false, "REPOSITORY010_V2_DOWNLOAD_UNAVAILABLE", "Blocked", null);
    }
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = global.URL.createObjectURL(blob);
    const a = global.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    global.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function revoke() { global.URL.revokeObjectURL(url); }, 0);
    return internal.buildResult(true, "REPOSITORY010_V2_DOWNLOAD_STARTED", "Ready", { filename: filename });
  }

  async function downloadV2TransferEnvelope(transferPackageOrId, senderEvidence) {
    const built = await buildV2TransferEnvelope(transferPackageOrId, senderEvidence);
    if (!built || built.ok !== true) return built;
    const pkg = built.data.envelope.transferPackage;
    const filename = "REPOSITORY-010_V2_" + String(pkg.transferPackageId || "TRANSFER").replace(/[^A-Za-z0-9._-]/g, "_") + ".json";
    const started = downloadJson(filename, built.data.envelope);
    if (!started.ok) return started;
    return internal.buildResult(true, "REPOSITORY010_V2_TRANSFER_ENVELOPE_EXPORTED", "Ready", {
      filename: filename,
      envelope: built.data.envelope,
      packageHash: pkg.packageHash,
      envelopeHash: built.data.envelope.envelopeHash,
      userActionRequiredForPhysicalTransfer: true
    });
  }

  function getV2TransferStatus() {
    return {
      status: state.v2TransferStatus || "Ready",
      phase: 7,
      moduleVersion: MODULE_VERSION,
      transportMode: TRANSPORT_MODE,
      actualV2TransferImplemented: true,
      v2TransferIntegrityValidationImplemented: true,
      crossDeviceRealValidationRequired: true,
      canonicalMutationImplemented: false,
      v3BaseConflictValidationImplemented: false,
      v4TargetEnvironmentValidationImplemented: false,
      explicitAcceptanceImplemented: false,
      syncEngineImplemented: false,
      automaticConflictWinnerAllowed: false,
      lastReceipt: internal.clone(state.lastV2TransferReceipt || null),
      lastValidation: internal.clone(state.lastV2TransferValidation || null),
      receiptCount: state.v2TransferReceipts instanceof Map ? state.v2TransferReceipts.size : 0
    };
  }

  Object.assign(namespace.api, {
    calculateV2TransferPackageHash: calculateV2TransferPackageHash,
    verifyV2TransferPackage: verifyV2TransferPackage,
    calculateV2TransferEnvelopeHash: calculateV2TransferEnvelopeHash,
    buildV2TransferEnvelope: buildV2TransferEnvelope,
    validateV2TransferEnvelope: validateV2TransferEnvelope,
    receiveV2TransferEnvelope: receiveV2TransferEnvelope,
    receiveV2TransferFile: receiveV2TransferFile,
    downloadV2TransferEnvelope: downloadV2TransferEnvelope,
    getV2TransferStatus: getV2TransferStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.v2Transfer = {
    id: "REPOSITORY-010-V2-TRANSFER",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 7,
    transportMode: TRANSPORT_MODE,
    explicitUserActionRequired: true,
    actualV2TransferImplemented: true,
    v2TransferIntegrityValidationImplemented: true,
    canonicalMutationImplemented: false,
    v3BaseConflictValidationImplemented: false,
    v4TargetEnvironmentValidationImplemented: false,
    syncEngineImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.getLocalFirstRepositoryV2TransferStatus = getV2TransferStatus;
  global.downloadLocalFirstRepositoryV2TransferEnvelope = downloadV2TransferEnvelope;
})(typeof window !== "undefined" ? window : globalThis);
