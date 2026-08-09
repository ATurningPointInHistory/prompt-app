/* ============================================================
   FILE: 13_intelligence_validation_persistence.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 7: Validation Gate Persistence
   Architecture Decision: IDE-170-008
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("validationPersistence");
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const CAPABILITY_ID = "IDE-170-VALIDATION-PERSISTENCE";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const SCHEMA_ID = "IDE-170-SCHEMA-VALIDATION-GATE-RECEIPT";
  const STORAGE_KEY = "IDE170_VALIDATION_GATE_RECEIPT_V1";

  if (!Object.prototype.hasOwnProperty.call(state, "validationPersistenceStatus")) state.validationPersistenceStatus = "Not Initialized";
  if (!Object.prototype.hasOwnProperty.call(state, "lastValidationGateReceipt")) state.lastValidationGateReceipt = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastValidationGateRestore")) state.lastValidationGateRestore = null;

  function stableStringify(value) {
    if (typeof internal.stableStringify === "function") return internal.stableStringify(value);
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function map(key) { return JSON.stringify(key) + ":" + stableStringify(value[key]); }).join(",") + "}";
  }

  function sha256(value) {
    if (typeof namespace.calculateSHA256 !== "function") throw new Error("SHA-256 API is unavailable.");
    return namespace.calculateSHA256(typeof value === "string" ? value : stableStringify(value));
  }

  function storageAvailable() {
    try {
      if (!global.localStorage) return false;
      const key = "__ide170_validation_persistence_probe__";
      global.localStorage.setItem(key, "1");
      global.localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function compactConfidenceValidation(source) {
    const value = source || {};
    const android = value.androidRealDeviceValidation || {};
    return {
      id: internal.text(value.id, ""),
      status: internal.text(value.status, "Not Run"),
      valid: value.valid === true,
      passed: Number(value.passed || 0),
      failed: Number(value.failed || 0),
      total: Number(value.total || 0),
      health: Number.isFinite(Number(value.health)) ? Number(value.health) : null,
      phase8Gate: internal.text(value.phase8Gate, "Blocked"),
      androidRealDeviceValidation: {
        required: true,
        passed: android.passed === true,
        device: internal.text(android.device, ""),
        evidence: internal.text(android.evidence, ""),
        validatedAt: android.validatedAt || null
      },
      confidenceModel: internal.clone(value.confidenceModel || { modelId: "IDE-170-CONFIDENCE-MODEL-DETERMINISTIC", modelVersion: "1.0.0" }),
      executedAt: value.executedAt || null
    };
  }

  function compactVersionValidation(source) {
    const value = source || {};
    const manifest = value.staticManifest || {};
    return {
      id: internal.text(value.id, ""),
      status: internal.text(value.status, "Not Run"),
      valid: value.valid === true,
      passed: Number(value.passed || 0),
      failed: Number(value.failed || 0),
      total: Number(value.total || 0),
      health: Number.isFinite(Number(value.health)) ? Number(value.health) : null,
      staticManifestValidated: value.staticManifestValidated === true,
      fullScriptHashValidated: value.fullScriptHashValidated === true,
      releaseGateAllowed: value.releaseGateAllowed === true,
      staticManifest: {
        manifestSchemaVersion: internal.text(manifest.manifestSchemaVersion, ""),
        manifestHash: internal.text(manifest.manifestHash, ""),
        scriptSetHash: internal.text(manifest.scriptSetHash, ""),
        scriptCount: Number(manifest.scriptCount || 0)
      },
      validatedAt: value.validatedAt || null
    };
  }

  function receiptHashPayload(receipt) {
    const copy = internal.clone(receipt || {});
    delete copy.receiptHash;
    return copy;
  }

  function validateReceiptStructure(receipt) {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) }); }
    check("Receipt exists", Boolean(receipt && typeof receipt === "object"), receipt && receipt.receiptId);
    check("Release Version matches", receipt && receipt.releaseVersion === RELEASE_VERSION, receipt && receipt.releaseVersion);
    check("Manifest Hash format", receipt && /^[a-f0-9]{64}$/.test(String(receipt.manifestHash || "")), receipt && receipt.manifestHash);
    check("Script Set Hash format", receipt && /^[a-f0-9]{64}$/.test(String(receipt.scriptSetHash || "")), receipt && receipt.scriptSetHash);
    check("Confidence Validation passed", receipt && receipt.confidenceValidation && receipt.confidenceValidation.valid === true && receipt.confidenceValidation.failed === 0 && receipt.confidenceValidation.androidRealDeviceValidation && receipt.confidenceValidation.androidRealDeviceValidation.passed === true, receipt && receipt.confidenceValidation && receipt.confidenceValidation.status);
    check("Version Architecture Validation passed", receipt && receipt.versionArchitectureValidation && receipt.versionArchitectureValidation.valid === true && receipt.versionArchitectureValidation.failed === 0 && receipt.versionArchitectureValidation.staticManifestValidated === true && receipt.versionArchitectureValidation.fullScriptHashValidated === true && receipt.versionArchitectureValidation.releaseGateAllowed === true, receipt && receipt.versionArchitectureValidation && receipt.versionArchitectureValidation.status);
    let confidenceBinding = "";
    let versionBinding = "";
    try {
      confidenceBinding = receipt && receipt.confidenceValidation ? sha256(receipt.confidenceValidation) : "";
      versionBinding = receipt && receipt.versionArchitectureValidation ? sha256(receipt.versionArchitectureValidation) : "";
    } catch (error) {
      confidenceBinding = "ERROR:" + error.message;
      versionBinding = "ERROR:" + error.message;
    }
    check("Confidence Validation binding Hash is valid", Boolean(receipt && receipt.binding && receipt.binding.confidenceValidationHash === confidenceBinding), confidenceBinding);
    check("Version Architecture Validation binding Hash is valid", Boolean(receipt && receipt.binding && receipt.binding.versionArchitectureValidationHash === versionBinding), versionBinding);
    let computed = "";
    try { computed = receipt ? sha256(receiptHashPayload(receipt)) : ""; } catch (error) { computed = "ERROR:" + error.message; }
    check("Receipt Hash is valid", Boolean(receipt && receipt.receiptHash && receipt.receiptHash === computed), computed);
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    return { valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, checks: checks };
  }

  function buildValidationGateReceiptPreview(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const confidenceValidation = compactConfidenceValidation(settings.confidenceValidationOverride || state.lastConfidenceValidation);
    const versionValidation = compactVersionValidation(settings.versionValidationOverride || state.lastVersionArchitectureValidation);
    const manifest = versionValidation.staticManifest || {};

    if (!(confidenceValidation.valid && confidenceValidation.failed === 0 && confidenceValidation.androidRealDeviceValidation.passed === true)) {
      return internal.buildResult(false, "VALIDATION_RECEIPT_CONFIDENCE_GATE_NOT_READY", "Blocked", { confidenceValidation: confidenceValidation }, { error: { message: "Phase 7 Confidence/Android Validation has not passed.", category: "Validation Failure" } });
    }
    if (!(versionValidation.valid && versionValidation.failed === 0 && versionValidation.staticManifestValidated && versionValidation.fullScriptHashValidated && versionValidation.releaseGateAllowed)) {
      return internal.buildResult(false, "VALIDATION_RECEIPT_INTEGRITY_GATE_NOT_READY", "Blocked", { versionArchitectureValidation: versionValidation }, { error: { message: "Static Integrity Validation has not passed.", category: "Integrity Failure" } });
    }
    if (!/^[a-f0-9]{64}$/.test(manifest.manifestHash) || !/^[a-f0-9]{64}$/.test(manifest.scriptSetHash)) {
      return internal.buildResult(false, "VALIDATION_RECEIPT_MANIFEST_IDENTITY_MISSING", "Blocked", { manifest: manifest }, { error: { message: "Static Manifest identity is unavailable.", category: "Integrity Failure" } });
    }

    const receipt = {
      receiptId: internal.nextId("IDE-170-VALIDATION-GATE-RECEIPT"),
      schemaVersion: VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID),
      componentId: "IDE-170",
      releaseVersion: RELEASE_VERSION,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      versionArchitecture: VERSION_MANIFEST.versionArchitecture,
      manifestHash: manifest.manifestHash,
      scriptSetHash: manifest.scriptSetHash,
      scriptCount: manifest.scriptCount,
      confidenceValidation: confidenceValidation,
      versionArchitectureValidation: versionValidation,
      binding: {
        confidenceValidationHash: sha256(confidenceValidation),
        versionArchitectureValidationHash: sha256(versionValidation)
      },
      policy: {
        restoreRequiresSameRelease: true,
        restoreRequiresSameManifestHash: true,
        restoreRequiresSameScriptSetHash: true,
        staleReceiptReleaseAllowed: false,
        automaticManualConfirmationAllowed: false
      },
      createdAt: internal.nowIso(),
      receiptHash: null
    };
    receipt.receiptHash = sha256(receiptHashPayload(receipt));
    const validation = validateReceiptStructure(receipt);
    if (!validation.valid) {
      return internal.buildResult(false, "VALIDATION_RECEIPT_BUILD_FAILED", "Invalid", { receipt: receipt, validation: validation }, { error: { message: "Validation Gate Receipt failed self-validation.", category: "Integrity Failure" } });
    }
    return internal.buildResult(true, settings.dryRun === true ? "VALIDATION_RECEIPT_PREVIEW_READY" : "VALIDATION_RECEIPT_READY", "Ready", { receipt: receipt, validation: validation });
  }

  function persistValidationGateReceipt(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (!storageAvailable()) {
      state.validationPersistenceStatus = "Unavailable";
      return internal.buildResult(false, "VALIDATION_PERSISTENCE_STORAGE_UNAVAILABLE", "Blocked", null, { error: { message: "localStorage is unavailable.", category: "Storage Failure" } });
    }
    const preview = buildValidationGateReceiptPreview(settings);
    if (!preview.ok) return preview;
    try {
      const receipt = preview.data.receipt;
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
      state.lastValidationGateReceipt = internal.deepFreeze(internal.clone(receipt));
      state.validationPersistenceStatus = "Persisted";
      internal.touch();
      return internal.buildResult(true, "VALIDATION_GATE_RECEIPT_PERSISTED", "Persisted", { receipt: internal.clone(receipt), storageKey: STORAGE_KEY });
    } catch (error) {
      state.validationPersistenceStatus = "Failed";
      return internal.buildResult(false, "VALIDATION_GATE_RECEIPT_PERSIST_FAILED", "Failed", null, { error: { message: error.message, category: "Storage Failure" } });
    }
  }

  function tryPersistValidationGateReceipt(options) {
    const confidence = state.lastConfidenceValidation;
    const version = state.lastVersionArchitectureValidation;
    if (!(confidence && confidence.valid === true && confidence.failed === 0 && confidence.androidRealDeviceValidation && confidence.androidRealDeviceValidation.passed === true)) {
      return internal.buildResult(false, "VALIDATION_GATE_RECEIPT_NOT_READY", "Not Ready", null);
    }
    if (!(version && version.valid === true && version.failed === 0 && version.staticManifestValidated === true && version.fullScriptHashValidated === true && version.releaseGateAllowed === true)) {
      return internal.buildResult(false, "VALIDATION_GATE_RECEIPT_NOT_READY", "Not Ready", null);
    }
    return persistValidationGateReceipt(options);
  }

  function loadStoredReceipt() {
    if (!storageAvailable()) return null;
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function fetchCurrentStaticManifest() {
    if (typeof global.fetch !== "function") throw new Error("fetch API is unavailable.");
    const response = await global.fetch("./00_script_manifest.json?receipt=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("Static Manifest fetch failed: HTTP " + response.status);
    return response.json();
  }

  function restoreStateFromReceipt(receipt) {
    const confidence = internal.clone(receipt.confidenceValidation);
    const version = internal.clone(receipt.versionArchitectureValidation);
    confidence.persistedReceiptId = receipt.receiptId;
    confidence.restoredFromPersistence = true;
    version.persistedReceiptId = receipt.receiptId;
    version.restoredFromPersistence = true;
    state.lastConfidenceValidation = internal.deepFreeze(confidence);
    state.lastVersionArchitectureValidation = internal.deepFreeze(version);
    state.lastValidationGateReceipt = internal.deepFreeze(internal.clone(receipt));
    state.validationPersistenceStatus = "Restored";
    internal.touch();
  }

  async function restoreValidationGateReceipt(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const receipt = settings.receipt || loadStoredReceipt();
    if (!receipt) {
      const result = { ok: false, code: "VALIDATION_GATE_RECEIPT_NOT_FOUND", status: "Not Found", restored: false, stale: false, checkedAt: internal.nowIso() };
      state.lastValidationGateRestore = result;
      state.validationPersistenceStatus = "No Receipt";
      return result;
    }

    const structure = validateReceiptStructure(receipt);
    if (!structure.valid) {
      const result = { ok: false, code: "VALIDATION_GATE_RECEIPT_INVALID", status: "Invalid", restored: false, stale: true, validation: structure, checkedAt: internal.nowIso() };
      state.lastValidationGateRestore = result;
      state.validationPersistenceStatus = "Invalid";
      return result;
    }

    try {
      const manifest = settings.currentManifest || await fetchCurrentStaticManifest();
      const releaseMatches = manifest.applicationReleaseVersion === RELEASE_VERSION && receipt.releaseVersion === RELEASE_VERSION;
      const manifestMatches = manifest.manifestHash === receipt.manifestHash;
      const scriptSetMatches = manifest.scriptSetHash === receipt.scriptSetHash;
      const scriptCountMatches = Number(manifest.scripts && manifest.scripts.length || 0) === Number(receipt.scriptCount || 0);
      const current = releaseMatches && manifestMatches && scriptSetMatches && scriptCountMatches;
      if (!current) {
        const result = {
          ok: false,
          code: "VALIDATION_GATE_RECEIPT_STALE",
          status: "Stale - Revalidation Required",
          restored: false,
          stale: true,
          checks: { releaseMatches: releaseMatches, manifestMatches: manifestMatches, scriptSetMatches: scriptSetMatches, scriptCountMatches: scriptCountMatches },
          currentManifest: { applicationReleaseVersion: manifest.applicationReleaseVersion, manifestHash: manifest.manifestHash, scriptSetHash: manifest.scriptSetHash, scriptCount: Number(manifest.scripts && manifest.scripts.length || 0) },
          receiptManifest: { releaseVersion: receipt.releaseVersion, manifestHash: receipt.manifestHash, scriptSetHash: receipt.scriptSetHash, scriptCount: receipt.scriptCount },
          checkedAt: internal.nowIso()
        };
        state.lastValidationGateRestore = result;
        state.validationPersistenceStatus = "Stale";
        return result;
      }
      restoreStateFromReceipt(receipt);
      const result = { ok: true, code: "VALIDATION_GATE_RECEIPT_RESTORED", status: "Restored", restored: true, stale: false, receiptId: receipt.receiptId, manifestHash: receipt.manifestHash, scriptSetHash: receipt.scriptSetHash, checkedAt: internal.nowIso() };
      state.lastValidationGateRestore = result;
      return result;
    } catch (error) {
      const result = { ok: false, code: "VALIDATION_GATE_RECEIPT_RESTORE_FAILED", status: "Failed", restored: false, stale: false, error: { message: error.message, category: "Source Failure" }, checkedAt: internal.nowIso() };
      state.lastValidationGateRestore = result;
      state.validationPersistenceStatus = "Restore Failed";
      return result;
    }
  }

  function clearValidationGateReceipt() {
    try {
      if (global.localStorage) global.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    state.lastValidationGateReceipt = null;
    state.lastValidationGateRestore = null;
    state.validationPersistenceStatus = "Cleared";
    internal.touch();
    return internal.buildResult(true, "VALIDATION_GATE_RECEIPT_CLEARED", "Cleared", { storageKey: STORAGE_KEY });
  }

  function getValidationPersistenceStatus() {
    const receipt = state.lastValidationGateReceipt || loadStoredReceipt();
    return {
      id: "IDE-170-VALIDATION-PERSISTENCE-STATUS",
      version: MODULE_VERSION,
      capabilityVersion: CAPABILITY_VERSION,
      status: state.validationPersistenceStatus,
      ready: storageAvailable() && Boolean(namespace.getCapability && namespace.getCapability(CAPABILITY_ID)),
      storageAvailable: storageAvailable(),
      storageKey: STORAGE_KEY,
      receiptPresent: Boolean(receipt),
      receiptId: receipt && receipt.receiptId || null,
      receiptReleaseVersion: receipt && receipt.releaseVersion || null,
      receiptManifestHash: receipt && receipt.manifestHash || null,
      lastRestore: internal.clone(state.lastValidationGateRestore)
    };
  }

  function registerSchema() {
    const version = VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID);
    const existing = namespace.getSchema && namespace.getSchema(SCHEMA_ID);
    if (existing && existing.version === version) return internal.buildResult(true, "SCHEMA_EXISTS", "Ready", { schema: existing });
    if (existing && internal.removeSchemaForValidation) internal.removeSchemaForValidation(SCHEMA_ID);
    return namespace.registerSchema({
      schemaId: SCHEMA_ID,
      name: "Validation Gate Receipt",
      version: version,
      type: "object",
      required: ["receiptId", "schemaVersion", "componentId", "releaseVersion", "manifestHash", "scriptSetHash", "confidenceValidation", "versionArchitectureValidation", "binding", "policy", "createdAt", "receiptHash"],
      properties: {
        receiptId: { type: "string" }, schemaVersion: { type: "string" }, componentId: { type: "string" }, releaseVersion: { type: "string" }, manifestHash: { type: "string" }, scriptSetHash: { type: "string" }, confidenceValidation: { type: "object" }, versionArchitectureValidation: { type: "object" }, binding: { type: "object" }, policy: { type: "object" }, createdAt: { type: "string" }, receiptHash: { type: "string" }
      },
      additionalProperties: true,
      owner: "IDE-170",
      source: "Architecture Decision 008"
    });
  }

  function registerCapability() {
    const existing = namespace.getCapability && namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === CAPABILITY_VERSION) return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Validation Gate Persistence",
      version: CAPABILITY_VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-INDEPENDENT-VALIDATION", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-VERSION-VALIDATION", minimumVersion: MINIMUM_VERSION, optional: false }
      ],
      schemas: [SCHEMA_ID],
      provides: ["Frozen Gate Receipt", "Release Binding", "Manifest Hash Binding", "Stale Gate Detection", "Gate Restore"],
      source: "Architecture Decision 008"
    });
  }

  function initializeValidationPersistence() {
    const schema = registerSchema();
    const capability = registerCapability();
    const ready = schema.ok === true && capability.ok === true && storageAvailable();
    state.validationPersistenceStatus = ready ? (loadStoredReceipt() ? "Receipt Available" : "Ready") : "Unavailable";
    namespace.modules.validationPersistence.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "VALIDATION_PERSISTENCE_INITIALIZED" : "VALIDATION_PERSISTENCE_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { schema: schema.data && schema.data.schema, capability: capability.data && capability.data.capability, storageAvailable: storageAvailable(), receiptPresent: Boolean(loadStoredReceipt()) });
  }

  Object.assign(namespace.api, {
    initializeValidationPersistence: initializeValidationPersistence,
    buildValidationGateReceiptPreview: buildValidationGateReceiptPreview,
    persistValidationGateReceipt: persistValidationGateReceipt,
    tryPersistValidationGateReceipt: tryPersistValidationGateReceipt,
    restoreValidationGateReceipt: restoreValidationGateReceipt,
    clearValidationGateReceipt: clearValidationGateReceipt,
    getValidationPersistenceStatus: getValidationPersistenceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.validationPersistence = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    capabilityVersion: CAPABILITY_VERSION,
    status: "Loaded",
    receiptBinding: ["releaseVersion", "manifestHash", "scriptSetHash", "validationResultHash"],
    staleDetection: true,
    automaticManualConfirmationAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
