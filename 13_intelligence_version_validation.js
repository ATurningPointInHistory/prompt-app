/* ============================================================
   FILE: 13_intelligence_version_validation.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Purpose: Independent Version Architecture and Static Manifest Integrity Validation
   Architecture Decision: IDE-170-012
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Version Validation blocked: Core is not loaded.");
    return;
  }

  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!VERSION_MANIFEST) {
    console.warn("IDE-170 Version Validation blocked: Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const RELEASE_VERSION = VERSION_MANIFEST.release.version;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("versionValidation");
  const CAPABILITY_ID = "IDE-170-VERSION-VALIDATION";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const INTERNAL_MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const STATIC_MANIFEST_PATH = "./00_script_manifest.json";
  const HASH_ALGORITHM = "SHA-256";
  const CACHE_KEY_LENGTH = 12;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeScriptPath(value) {
    return String(value || "")
      .trim()
      .split("#")[0]
      .split("?")[0]
      .replace(/^\.\//, "");
  }

  function getHashQuery(value) {
    try {
      const url = new URL(String(value || ""), global.document && global.document.baseURI || global.location && global.location.href || "https://local.invalid/");
      return url.searchParams.get("h") || "";
    } catch (_) {
      const match = String(value || "").match(/[?&]h=([a-f0-9]+)/i);
      return match ? match[1] : "";
    }
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) {
      out[key] = stableValue(value[key]);
    });
    return out;
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  async function sha256Text(value) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") {
      const error = new Error("Web Crypto SHA-256 is unavailable.");
      error.code = "SHA256_UNAVAILABLE";
      throw error;
    }
    const bytes = new global.TextEncoder().encode(String(value == null ? "" : value));
    const digest = await global.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function hex(byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function utf8ByteSize(value) {
    if (typeof global.TextEncoder === "function") {
      return new global.TextEncoder().encode(String(value == null ? "" : value)).length;
    }
    return unescape(encodeURIComponent(String(value == null ? "" : value))).length;
  }

  function manifestHashPayload(manifest) {
    const copy = clone(manifest) || {};
    delete copy.manifestHash;
    delete copy.updatedAt;
    return copy;
  }

  function scriptSetPayload(manifest) {
    const hashes = manifest && manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};
    return (Array.isArray(manifest && manifest.scripts) ? manifest.scripts : []).map(function mapScript(src) {
      const path = normalizeScriptPath(src);
      const item = hashes[path] || {};
      return path + ":" + String(item.sha256 || "");
    }).join("\n");
  }

  function addCheck(checks, name, passed, detail, group, severity) {
    checks.push({
      name: name,
      passed: passed === true,
      detail: detail == null ? "" : String(detail),
      group: group || "Version Architecture",
      severity: severity || "High"
    });
  }

  function validateRuntimeVersionContract(checks) {
    addCheck(checks, "Version Manifest exists", Boolean(VERSION_MANIFEST), VERSION_MANIFEST.versionArchitecture, "Contract", "Critical");
    addCheck(checks, "Version Architecture is independent-version-v1", VERSION_MANIFEST.versionArchitecture === "independent-version-v1", VERSION_MANIFEST.versionArchitecture, "Contract", "Critical");
    addCheck(checks, "Release Version is valid SemVer", /^\d+\.\d+\.\d+$/.test(RELEASE_VERSION) && VERSION_MANIFEST.release.version === RELEASE_VERSION, RELEASE_VERSION, "Contract", "High");
    addCheck(checks, "Public IDE-170 version exposes Release Version", namespace.version === RELEASE_VERSION, namespace.version, "Release", "Critical");
    addCheck(checks, "Core status exposes Release Version", namespace.getStatus && namespace.getStatus().version === RELEASE_VERSION, namespace.getStatus && namespace.getStatus().version, "Release", "Critical");

    const moduleEntries = Object.entries(VERSION_MANIFEST.moduleVersions || {});
    addCheck(checks, "Module Version contract covers all file modules", moduleEntries.length === Object.keys(VERSION_MANIFEST.fileModules || {}).length, moduleEntries.length + "/" + Object.keys(VERSION_MANIFEST.fileModules || {}).length, "Module", "High");
    moduleEntries.forEach(function checkModule(entry) {
      addCheck(checks, "Module Version valid: " + entry[0], /^\d+\.\d+\.\d+$/.test(String(entry[1] || "")), entry[1], "Module", "High");
    });

    const capabilities = namespace.getCapabilities ? namespace.getCapabilities() : [];
    const officialCapabilityMap = VERSION_MANIFEST.capabilityVersions || {};
    capabilities.forEach(function checkCapability(item) {
      const expected = officialCapabilityMap[item.capabilityId];
      if (!expected) return;
      addCheck(checks, "Capability Version matches manifest: " + item.capabilityId, item.version === expected, item.version + "/" + expected, "Capability", "Critical");
      (Array.isArray(item.dependencies) ? item.dependencies : []).forEach(function checkDependency(dependency) {
        if (!dependency || !String(dependency.capabilityId || "").startsWith("IDE-170-")) return;
        addCheck(checks, "Internal minimumVersion uses compatibility baseline: " + item.capabilityId + " -> " + dependency.capabilityId,
          dependency.minimumVersion === INTERNAL_MINIMUM_VERSION,
          dependency.minimumVersion,
          "Compatibility",
          "High");
      });
    });

    const schemas = namespace.getSchemas ? namespace.getSchemas() : [];
    const schemaMap = VERSION_MANIFEST.schemaVersions || {};
    schemas.forEach(function checkSchema(item) {
      const expected = schemaMap[item.schemaId];
      if (!expected) return;
      addCheck(checks, "Schema Version matches manifest: " + item.schemaId, item.version === expected, item.version + "/" + expected, "Schema", "Critical");
    });

    Object.entries(VERSION_MANIFEST.fileModules || {}).forEach(function checkLoadedModule(entry) {
      const file = entry[0];
      const moduleKey = entry[1];
      const expected = VERSION_MANIFEST.moduleVersions[moduleKey];
      const runtimeKey = VERSION_MANIFEST.runtimeModuleKeys && VERSION_MANIFEST.runtimeModuleKeys[moduleKey] || moduleKey;
      const moduleRecord = namespace.modules && namespace.modules[runtimeKey];
      if (!moduleRecord) return;
      addCheck(checks, "Loaded Module Version matches manifest: " + file, moduleRecord.version === expected, moduleRecord.version + "/" + expected, "Module", "High");
    });
  }

  async function fetchStaticManifest() {
    const url = new URL(STATIC_MANIFEST_PATH, global.document && global.document.baseURI || global.location && global.location.href || "https://local.invalid/");
    url.searchParams.set("integrityCheck", Date.now());
    const response = await fetch(url.href, { cache: "no-store" });
    if (!response.ok) {
      const error = new Error("Static Script Manifest fetch failed: " + response.status);
      error.code = "STATIC_MANIFEST_FETCH_FAILED";
      throw error;
    }
    return response.json();
  }

  async function validateStaticManifest(options, checks) {
    const settings = options && typeof options === "object" ? options : {};
    const manifest = settings.manifest || await fetchStaticManifest();
    const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
    const hashes = manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};

    addCheck(checks, "Static Manifest Schema is v2.0.0", manifest.manifestSchemaVersion === "2.0.0", manifest.manifestSchemaVersion, "Static Manifest", "Critical");
    addCheck(checks, "Static Manifest Release matches IDE-170", manifest.applicationReleaseVersion === RELEASE_VERSION, manifest.applicationReleaseVersion, "Static Manifest", "Critical");
    addCheck(checks, "Static Manifest Version Architecture matches", manifest.versionArchitecture === VERSION_MANIFEST.versionArchitecture, manifest.versionArchitecture, "Static Manifest", "Critical");
    addCheck(checks, "Static Manifest Hash Algorithm is SHA-256", manifest.hashAlgorithm === HASH_ALGORITHM, manifest.hashAlgorithm, "Static Manifest", "High");
    addCheck(checks, "Static Manifest has scripts", scripts.length > 0, scripts.length, "Static Manifest", "Critical");
    addCheck(checks, "Static Manifest first Script is 00_core.js", normalizeScriptPath(scripts[0]) === "00_core.js", scripts[0], "Static Manifest", "Critical");
    addCheck(checks, "Static Manifest last Script is 99_init.js", normalizeScriptPath(scripts[scripts.length - 1]) === "99_init.js", scripts[scripts.length - 1], "Static Manifest", "Critical");

    const seen = new Set();
    scripts.forEach(function checkScriptEntry(src) {
      const path = normalizeScriptPath(src);
      const hash = hashes[path] || {};
      const sha = String(hash.sha256 || "");
      const cacheKey = String(hash.cacheKey || "");
      addCheck(checks, "Script path unique: " + path, !seen.has(path), path, "Static Manifest", "Critical");
      seen.add(path);
      addCheck(checks, "Script SHA-256 present: " + path, /^[a-f0-9]{64}$/.test(sha), sha, "Static Manifest", "Critical");
      addCheck(checks, "Script byteSize present: " + path, Number.isInteger(hash.byteSize) && hash.byteSize >= 0, hash.byteSize, "Static Manifest", "High");
      addCheck(checks, "Script cacheKey matches SHA-256: " + path, cacheKey === sha.slice(0, CACHE_KEY_LENGTH), cacheKey, "Cache", "High");
      addCheck(checks, "Script URL cacheKey matches Manifest: " + path, getHashQuery(src) === cacheKey, getHashQuery(src), "Cache", "High");
    });

    const computedScriptSetHash = await sha256Text(scriptSetPayload(manifest));
    addCheck(checks, "Script Set Hash is valid", manifest.scriptSetHash === computedScriptSetHash, computedScriptSetHash, "Integrity", "Critical");
    const computedManifestHash = await sha256Text(stableStringify(manifestHashPayload(manifest)));
    addCheck(checks, "Static Manifest Hash is valid", manifest.manifestHash === computedManifestHash, computedManifestHash, "Integrity", "Critical");

    if (settings.fullScriptHash === true) {
      for (const src of scripts) {
        const path = normalizeScriptPath(src);
        const response = await fetch(new URL(src, global.document && global.document.baseURI || global.location.href).href, { cache: "no-store" });
        addCheck(checks, "Script fetch succeeds: " + path, response.ok, response.status, "Integrity", "Critical");
        if (!response.ok) continue;
        const text = await response.text();
        const expected = hashes[path] || {};
        const actualHash = await sha256Text(text);
        const actualSize = utf8ByteSize(text);
        addCheck(checks, "Script SHA-256 matches content: " + path, actualHash === expected.sha256, actualHash, "Integrity", "Critical");
        addCheck(checks, "Script byteSize matches content: " + path, actualSize === expected.byteSize, actualSize + "/" + expected.byteSize, "Integrity", "Critical");
      }
    }

    return manifest;
  }

  async function validateVersionArchitecture(options) {
    const settings = options && typeof options === "object" ? options : {};
    const checks = [];
    try {
      validateRuntimeVersionContract(checks);
      let staticManifest = null;
      if (settings.validateStaticManifest === true) {
        staticManifest = await validateStaticManifest(settings, checks);
      }
      const passed = checks.filter(function count(item) { return item.passed; }).length;
      const failed = checks.length - passed;
      const criticalFailed = checks.filter(function critical(item) { return item.passed !== true && item.severity === "Critical"; }).length;
      const result = {
        id: internal.nextId("IDE-170-VERSION-ARCHITECTURE-VALIDATION"),
        componentId: namespace.componentId,
        version: RELEASE_VERSION,
        versionArchitecture: VERSION_MANIFEST.versionArchitecture,
        moduleVersion: MODULE_VERSION,
        capabilityVersion: CAPABILITY_VERSION,
        valid: failed === 0,
        passed: passed,
        failed: failed,
        total: checks.length,
        health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
        status: failed === 0 ? "Passed" : criticalFailed ? "Blocked" : "Failed",
        checks: checks,
        staticManifestValidated: settings.validateStaticManifest === true,
        fullScriptHashValidated: settings.fullScriptHash === true,
        staticManifest: staticManifest ? {
          manifestSchemaVersion: staticManifest.manifestSchemaVersion,
          manifestHash: staticManifest.manifestHash,
          scriptSetHash: staticManifest.scriptSetHash,
          scriptCount: Array.isArray(staticManifest.scripts) ? staticManifest.scripts.length : 0
        } : null,
        releaseGateAllowed: failed === 0,
        validatedAt: internal.nowIso()
      };
      internal.state.lastVersionArchitectureValidation = internal.deepFreeze(clone(result));
      internal.touch();
      if (result.valid === true && result.releaseGateAllowed === true && typeof namespace.tryPersistValidationGateReceipt === "function") {
        try { namespace.tryPersistValidationGateReceipt({ actor: "IDE-170 Version Validation", automatic: true }); } catch (_) {}
      }
      return result;
    } catch (error) {
      addCheck(checks, "Version Architecture Validation completed without exception", false, error && error.message || String(error), "Runtime", "Critical");
      const passed = checks.filter(function count(item) { return item.passed; }).length;
      const result = {
        id: internal.nextId("IDE-170-VERSION-ARCHITECTURE-VALIDATION"),
        componentId: namespace.componentId,
        version: RELEASE_VERSION,
        versionArchitecture: VERSION_MANIFEST.versionArchitecture,
        moduleVersion: MODULE_VERSION,
        valid: false,
        passed: passed,
        failed: checks.length - passed,
        total: checks.length,
        health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
        status: "Blocked",
        checks: checks,
        error: { code: error && error.code || "VERSION_ARCHITECTURE_VALIDATION_FAILED", message: error && error.message || String(error) },
        releaseGateAllowed: false,
        validatedAt: internal.nowIso()
      };
      internal.state.lastVersionArchitectureValidation = internal.deepFreeze(clone(result));
      internal.touch();
      return result;
    }
  }

  function getVersionArchitectureStatus() {
    const last = internal.state.lastVersionArchitectureValidation;
    return {
      id: "IDE-170-VERSION-ARCHITECTURE-STATUS",
      componentId: namespace.componentId,
      version: RELEASE_VERSION,
      moduleVersion: MODULE_VERSION,
      versionArchitecture: VERSION_MANIFEST.versionArchitecture,
      releaseVersion: RELEASE_VERSION,
      manifestContractVersion: VERSION_MANIFEST.manifestContractVersion,
      moduleCount: Object.keys(VERSION_MANIFEST.moduleVersions || {}).length,
      capabilityVersionCount: Object.keys(VERSION_MANIFEST.capabilityVersions || {}).length,
      schemaVersionCount: Object.keys(VERSION_MANIFEST.schemaVersions || {}).length,
      validationStatus: last ? last.status : "Not Run",
      health: last ? last.health : null,
      releaseGateAllowed: last ? last.releaseGateAllowed === true : false,
      lastValidatedAt: last ? last.validatedAt : null
    };
  }

  function registerCapability() {
    if (!namespace.registerCapability || !namespace.getCapability) {
      return internal.buildResult(false, "VERSION_VALIDATION_REGISTRY_UNAVAILABLE", "Blocked", null, {
        error: { message: "Capability Registry is unavailable.", category: "Dependency Failure" }
      });
    }
    const existing = namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === CAPABILITY_VERSION) {
      return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: existing });
    }
    if (existing && typeof internal.removeCapabilityForValidation === "function") {
      internal.removeCapabilityForValidation(CAPABILITY_ID);
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Independent Version Architecture Validation",
      version: CAPABILITY_VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: INTERNAL_MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-CAPABILITY-REGISTRY", minimumVersion: INTERNAL_MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-SCHEMA-REGISTRY", minimumVersion: INTERNAL_MINIMUM_VERSION, optional: false }
      ],
      schemas: [],
      provides: ["Version Contract Validation", "Static Manifest Integrity", "Stale Deployment Detection"],
      source: "Architecture Decision 012"
    });
  }

  function initializeVersionValidation() {
    const capabilityRegistration = registerCapability();
    namespace.modules.versionValidation.status = capabilityRegistration && capabilityRegistration.ok === true
      ? "Ready"
      : "Blocked";
    namespace.modules.versionValidation.initializedAt = internal.nowIso();
    return capabilityRegistration;
  }

  Object.assign(namespace.api, {
    initializeVersionValidation: initializeVersionValidation,
    validateVersionArchitecture: validateVersionArchitecture,
    validateStaticScriptIntegrity: function validateStaticScriptIntegrity(options) {
      return validateVersionArchitecture(Object.assign({}, options || {}, { validateStaticManifest: true, fullScriptHash: true }));
    },
    getVersionArchitectureStatus: getVersionArchitectureStatus,
    getVersionManifest: function getVersionManifest() { return VERSION_MANIFEST; },
    getModuleVersions: function getModuleVersions() { return clone(VERSION_MANIFEST.moduleVersions); },
    getSchemaVersions: function getSchemaVersions() { return clone(VERSION_MANIFEST.schemaVersions); },
    getCompatibilityStatus: function getCompatibilityStatus() { return clone(VERSION_MANIFEST.compatibility); }
  });

  Object.assign(namespace, {
    initializeVersionValidation: initializeVersionValidation,
    validateVersionArchitecture: namespace.api.validateVersionArchitecture,
    validateStaticScriptIntegrity: namespace.api.validateStaticScriptIntegrity,
    getVersionArchitectureStatus: getVersionArchitectureStatus,
    getVersionManifest: namespace.api.getVersionManifest,
    getModuleVersions: namespace.api.getModuleVersions,
    getSchemaVersions: namespace.api.getSchemaVersions,
    getCompatibilityStatus: namespace.api.getCompatibilityStatus
  });

  namespace.modules.versionValidation = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    capabilityVersion: CAPABILITY_VERSION,
    status: "Loaded",
    explicitExecutionOnly: true,
    automaticStartupValidation: false,
    staticManifestV2: true,
    fullScriptHashValidation: true,
    loadedAt: internal.nowIso()
  };

  global.validateIntelligenceVersionArchitecture = validateVersionArchitecture;
  global.validateIntelligenceStaticScriptIntegrity = namespace.api.validateStaticScriptIntegrity;
})(typeof window !== "undefined" ? window : globalThis);
