/* ============================================================
   FILE: 13_knowledge_navigator_intelligence_provider.js
   IDE-180 Knowledge Navigator
   Release: 1.1.0 / Module: Intelligence Provider 1.0.0
   Phase 2: IDE-170 Package Intake / Provider Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Intelligence Provider blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("intelligenceProvider");
  const PROVIDER_ID = "IDE-180-PROVIDER-IDE170-INTELLIGENCE-PACKAGE";
  const SOURCE_TYPE = "ide170-intelligence-package";
  const BASE_CAPABILITIES = Object.freeze([
    "package-intake",
    "manifest-intake",
    "handoff-intake",
    "entry-point-resolution",
    "artifact-index",
    "lazy-artifact-exposure",
    "runtime-package-read",
    "indexeddb-package-read"
  ]);

  const NAVIGATION_CAPABILITY_MAP = Object.freeze({
    entity: "entity-navigation",
    file: "file-navigation",
    module: "module-navigation",
    function: "function-navigation",
    architecture: "architecture-navigation",
    knowledge: "knowledge-navigation",
    relationship: "relationship-navigation",
    dependency: "dependency-trace",
    "reverse-dependency": "reverse-dependency-trace",
    workflow: "workflow-trace",
    decision: "decision-trace",
    validation: "validation-trace",
    evidence: "evidence-trace",
    insight: "insight-navigation",
    explanation: "confidence-explanation",
    version: "snapshot-comparison",
    timeline: "change-history-navigation"
  });

  const providerState = state.intelligenceProvider && typeof state.intelligenceProvider === "object"
    ? state.intelligenceProvider
    : {
        availability: "not-loaded",
        packageId: null,
        packageHash: null,
        sourceOrigin: null,
        packageRecord: null,
        manifest: null,
        handoff: null,
        artifactIndex: [],
        locationIndex: {},
        typeIndex: {},
        entryPoints: {},
        availableCapabilities: [],
        limitations: [],
        warnings: [],
        lastOpen: null,
        lastError: null,
        openedAt: null,
        updatedAt: null
      };
  state.intelligenceProvider = providerState;

  function ide170() {
    return global.IDE170Intelligence && typeof global.IDE170Intelligence === "object"
      ? global.IDE170Intelligence
      : null;
  }

  function text(value, fallback) {
    return internal.text(value, fallback);
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    return internal.clone(value);
  }

  function clearActiveSource() {
    providerState.availability = "not-loaded";
    providerState.packageId = null;
    providerState.packageHash = null;
    providerState.sourceOrigin = null;
    providerState.packageRecord = null;
    providerState.manifest = null;
    providerState.handoff = null;
    providerState.artifactIndex = [];
    providerState.locationIndex = {};
    providerState.typeIndex = {};
    providerState.entryPoints = {};
    providerState.availableCapabilities = [];
    providerState.limitations = [];
    providerState.warnings = [];
    providerState.openedAt = null;
    providerState.updatedAt = internal.nowIso();
  }

  function releaseReceiptIdentity() {
    const runtime = ide170();
    if (!runtime || typeof runtime.getPackageReleasePersistenceStatus !== "function") return null;
    try {
      const status = runtime.getPackageReleasePersistenceStatus();
      if (!status || status.receiptPresent !== true || !status.receiptPackageId) return null;
      return {
        packageId: status.receiptPackageId,
        packageHash: status.receiptPackageHash || null,
        receiptId: status.receiptId || null,
        persistenceStatus: status.status || null
      };
    } catch (_) {
      return null;
    }
  }

  function runtimePackageIdentity() {
    const runtime = ide170();
    if (!runtime || typeof runtime.getPackageModelStatus !== "function") return null;
    try {
      const status = runtime.getPackageModelStatus();
      if (!status || !status.latestPackageId) return null;
      return {
        packageId: status.latestPackageId,
        packageHash: status.latestPackageHash || null,
        packageCount: status.packageCount || 0
      };
    } catch (_) {
      return null;
    }
  }

  function inspectAvailability() {
    const runtime = ide170();
    const runtimeIdentity = runtimePackageIdentity();
    const receiptIdentity = releaseReceiptIdentity();
    const api = {
      getPackageModelStatus: Boolean(runtime && typeof runtime.getPackageModelStatus === "function"),
      getIntelligencePackage: Boolean(runtime && typeof runtime.getIntelligencePackage === "function"),
      validateIntelligencePackage: Boolean(runtime && typeof runtime.validateIntelligencePackage === "function"),
      validateIDE180HandoffContract: Boolean(runtime && typeof runtime.validateIDE180HandoffContract === "function"),
      loadIntelligencePackageFromIndexedDB: Boolean(runtime && typeof runtime.loadIntelligencePackageFromIndexedDB === "function")
    };
    const requiredReady = api.getIntelligencePackage && api.validateIntelligencePackage && api.validateIDE180HandoffContract;
    return {
      available: requiredReady,
      runtimePackage: runtimeIdentity,
      persistedPackage: receiptIdentity,
      api: api,
      availability: providerState.packageRecord
        ? providerState.availability
        : (runtimeIdentity || receiptIdentity ? "not-loaded" : requiredReady ? "not-loaded" : "unavailable")
    };
  }

  function validateManifestCompatibility(pkg) {
    const manifest = pkg && pkg.manifest;
    const checks = [];
    function check(name, passed, detail) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) });
    }
    check("Package exists", Boolean(pkg), pkg && pkg.packageId);
    check("Package identity is present", Boolean(pkg && pkg.packageId), pkg && pkg.packageId);
    check("Package is frozen", Boolean(pkg && pkg.frozen === true && pkg.immutable === true), pkg && pkg.frozenAt);
    check("Manifest exists", Boolean(manifest), manifest && manifest.packageId);
    if (manifest) {
      check("Manifest package ID matches", manifest.packageId === pkg.packageId, manifest.packageId);
      check("IDE-180 is a supported consumer", asArray(manifest.compatibility && manifest.compatibility.supportedConsumers).includes("IDE-180"), JSON.stringify(manifest.compatibility || {}));
      const minimum = text(manifest.compatibility && manifest.compatibility.minimumIDE180Version, "");
      const comparison = minimum ? internal.compareSemver(VERSION_MANIFEST.release.version, minimum) : null;
      check("IDE-180 release meets package minimum", comparison != null && comparison >= 0, VERSION_MANIFEST.release.version + " >= " + minimum);
      check("Handoff contract version matches", manifest.compatibility && manifest.compatibility.handoffContractVersion === VERSION_MANIFEST.compatibility.requiredIDE170HandoffContractVersion, manifest.compatibility && manifest.compatibility.handoffContractVersion);
      check("Manifest integrity is valid", manifest.integrity && manifest.integrity.status === "Valid" && /^[a-f0-9]{64}$/.test(String(manifest.integrity.packageHash || "")), manifest.integrity && manifest.integrity.packageHash);
      check("Manifest artifacts are declared", asArray(manifest.artifacts).length > 0, asArray(manifest.artifacts).length);
    }
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return {
      valid: failed === 0,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function artifactEntries(pkg) {
    const manifestEntries = asArray(pkg && pkg.manifest && pkg.manifest.artifacts);
    if (manifestEntries.length) return manifestEntries.map(clone);
    const order = asArray(pkg && pkg.artifactOrder);
    const locations = pkg && pkg.locations && typeof pkg.locations === "object" ? pkg.locations : {};
    const artifacts = pkg && pkg.artifacts && typeof pkg.artifacts === "object" ? pkg.artifacts : {};
    return order.map(function map(id) {
      const artifact = artifacts[id];
      if (!artifact) return null;
      return {
        artifactId: artifact.artifactId,
        artifactType: artifact.artifactType,
        artifactVersion: artifact.artifactVersion,
        schemaVersion: artifact.schemaVersion,
        location: locations[id] || null,
        required: false,
        status: artifact.status,
        size: artifact.integrity && artifact.integrity.byteSize || 0,
        hashAlgorithm: artifact.integrity && artifact.integrity.algorithm || null,
        hash: artifact.integrity && artifact.integrity.hash || null
      };
    }).filter(Boolean);
  }

  function extractHandoff(pkg) {
    const runtime = ide170();
    if (runtime && typeof runtime.getIDE180Handoff === "function" && pkg && pkg.handoffId) {
      try {
        const stored = runtime.getIDE180Handoff(pkg.handoffId);
        if (stored) return stored;
      } catch (_) {}
    }
    const artifacts = pkg && pkg.artifacts && typeof pkg.artifacts === "object" ? pkg.artifacts : {};
    const order = asArray(pkg && pkg.artifactOrder);
    const id = order.find(function find(artifactId) {
      const artifact = artifacts[artifactId];
      return artifact && artifact.artifactType === "ide180-handoff-contract";
    });
    return id && artifacts[id] ? clone(artifacts[id].payload) : null;
  }

  function normalizeEntry(entry) {
    const manifest = providerState.manifest || {};
    const packageId = providerState.packageId || "";
    const validationState = entry.status === "Valid" || entry.status === "Ready"
      ? "validated"
      : (entry.status === "Blocked" || entry.status === "Invalid" ? "failed" : "unknown");
    const record = {
      recordId: "IDE180-PACKAGE-ARTIFACT:" + packageId + ":" + entry.artifactId,
      canonicalEntityId: null,
      providerId: PROVIDER_ID,
      sourceId: packageId,
      sourceType: SOURCE_TYPE,
      recordType: text(entry.artifactType, "artifact"),
      title: text(entry.artifactType, entry.artifactId),
      summary: "IDE-170 Intelligence Package artifact descriptor.",
      contentReference: {
        packageId: packageId,
        artifactId: entry.artifactId,
        artifactType: entry.artifactType,
        location: entry.location || null,
        lazy: true
      },
      version: text(entry.artifactVersion, text(providerState.packageRecord && providerState.packageRecord.packageVersion, "1.0.0")),
      lifecycle: "frozen",
      officialState: "unknown",
      validationState: validationState,
      scope: null,
      relationships: [],
      lineage: [],
      evidenceReferences: [],
      trust: "not-applicable",
      timestamps: {
        createdAt: manifest.createdAt || null,
        validatedAt: manifest.validatedAt || null,
        frozenAt: manifest.frozenAt || null
      },
      sourceMetadata: {
        artifactId: entry.artifactId,
        artifactType: entry.artifactType,
        schemaVersion: entry.schemaVersion || null,
        location: entry.location || null,
        required: entry.required === true,
        status: entry.status || null,
        size: Number(entry.size || 0),
        hashAlgorithm: entry.hashAlgorithm || null,
        hash: entry.hash || null,
        packageHash: providerState.packageHash,
        sourceOrigin: providerState.sourceOrigin
      },
      immutable: true
    };
    return internal.deepFreeze(record);
  }

  function indexPackage(pkg, handoff, origin) {
    const entries = artifactEntries(pkg);
    const locationIndex = {};
    const typeIndex = {};
    entries.forEach(function index(entry) {
      if (entry.location) locationIndex[entry.location] = entry.artifactId;
      if (!typeIndex[entry.artifactType]) typeIndex[entry.artifactType] = [];
      typeIndex[entry.artifactType].push(entry.artifactId);
    });

    providerState.packageId = pkg.packageId;
    providerState.packageHash = pkg.manifest && pkg.manifest.integrity && pkg.manifest.integrity.packageHash || null;
    providerState.sourceOrigin = origin;
    providerState.packageRecord = internal.deepFreeze(clone(pkg));
    providerState.manifest = internal.deepFreeze(clone(pkg.manifest));
    providerState.handoff = internal.deepFreeze(clone(handoff));
    providerState.artifactIndex = entries.map(function normalize(entry) { return normalizeEntry(entry); });
    providerState.locationIndex = locationIndex;
    providerState.typeIndex = typeIndex;
    providerState.entryPoints = clone(handoff && handoff.entryPoints || {});
    providerState.availableCapabilities = internal.unique(BASE_CAPABILITIES.concat(asArray(handoff && handoff.availableCapabilities)));
    providerState.limitations = internal.unique(asArray(pkg && pkg.quality && pkg.quality.limitations).concat(asArray(handoff && handoff.limitations)));
    providerState.warnings = internal.unique(asArray(pkg && pkg.quality && pkg.quality.warnings).concat(asArray(handoff && handoff.warnings)));
    providerState.availability = providerState.limitations.length || (pkg.quality && pkg.quality.status === "Partial") ? "partial" : "available";
    providerState.openedAt = internal.nowIso();
    providerState.updatedAt = providerState.openedAt;
    providerDefinition.availability = providerState.availability;
    providerDefinition.capabilities = clone(providerState.availableCapabilities);
  }

  function resolveArtifactEntry(selector) {
    if (!providerState.packageRecord) return null;
    const source = internal.isPlainObject(selector) ? selector : { artifactId: selector };
    let artifactId = text(source.artifactId, "");
    if (!artifactId && source.entryPoint) {
      const location = providerState.entryPoints[source.entryPoint];
      artifactId = location && providerState.locationIndex[location] || "";
    }
    if (!artifactId && source.location) artifactId = providerState.locationIndex[text(source.location, "")] || "";
    if (!artifactId && source.artifactType) {
      const ids = providerState.typeIndex[text(source.artifactType, "")] || [];
      artifactId = ids[0] || "";
    }
    return providerState.artifactIndex.find(function find(record) {
      return record.contentReference && record.contentReference.artifactId === artifactId;
    }) || null;
  }

  function loadArtifact(record) {
    if (!record || !providerState.packageRecord) return null;
    const artifactId = record.contentReference.artifactId;
    const artifacts = providerState.packageRecord.artifacts || {};
    const direct = artifacts[artifactId];
    if (direct) return clone(direct);
    const runtime = ide170();
    if (runtime && providerState.sourceOrigin === "runtime" && typeof runtime.getIntelligenceArtifact === "function") {
      try { return runtime.getIntelligenceArtifact(artifactId); } catch (_) { return null; }
    }
    return null;
  }

  function providerSupports(input) {
    const key = text(input && input.navigationType || input && input.capability || input, "");
    if (!key) return false;
    if (providerState.availableCapabilities.includes(key) || BASE_CAPABILITIES.includes(key)) return true;
    const mapped = NAVIGATION_CAPABILITY_MAP[key];
    return Boolean(mapped && providerState.availableCapabilities.includes(mapped));
  }

  function providerDescribe() {
    const availability = inspectAvailability();
    return {
      providerId: PROVIDER_ID,
      providerVersion: MODULE_VERSION,
      sourceType: SOURCE_TYPE,
      readMode: "read-only",
      availability: providerState.packageRecord ? providerState.availability : availability.availability,
      capabilities: clone(providerState.packageRecord ? providerState.availableCapabilities : BASE_CAPABILITIES),
      activePackage: providerState.packageRecord ? {
        packageId: providerState.packageId,
        packageHash: providerState.packageHash,
        sourceOrigin: providerState.sourceOrigin,
        artifactCount: providerState.artifactIndex.length,
        handoffId: providerState.handoff && providerState.handoff.handoffId || null,
        openedAt: providerState.openedAt
      } : null,
      discovered: availability,
      limitations: clone(providerState.limitations),
      warnings: clone(providerState.warnings),
      mutationAllowed: false,
      lazyArtifactExposure: true,
      indexedDBRecordGranularity: "package"
    };
  }

  function providerList(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    let records = providerState.artifactIndex.slice();
    if (settings.artifactType) records = records.filter(function filter(record) { return record.recordType === settings.artifactType; });
    if (settings.required === true) records = records.filter(function filter(record) { return record.sourceMetadata.required === true; });
    const limit = Math.max(1, Math.min(500, Number(settings.limit) || 100));
    return records.slice(0, limit).map(clone);
  }

  function providerSearch(query, options) {
    const term = text(query, "").toLowerCase();
    if (!term) return [];
    const settings = internal.isPlainObject(options) ? options : {};
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return providerState.artifactIndex.filter(function match(record) {
      const ref = record.contentReference || {};
      return [record.recordId, record.recordType, record.title, ref.artifactId, ref.location]
        .some(function includes(value) { return String(value || "").toLowerCase().includes(term); });
    }).slice(0, limit).map(clone);
  }

  function providerGet(selector, options) {
    if (!providerState.packageRecord) {
      return internal.buildResult(false, "IDE180_INTELLIGENCE_SOURCE_NOT_LOADED", "not-loaded", null, {
        missingSource: { sourceType: SOURCE_TYPE, reason: "package-not-loaded" }
      });
    }
    const record = resolveArtifactEntry(selector);
    if (!record) {
      return internal.buildResult(false, "IDE180_INTELLIGENCE_ARTIFACT_NOT_FOUND", "not-found", null);
    }
    const artifact = loadArtifact(record);
    if (!artifact) {
      return internal.buildResult(false, "IDE180_INTELLIGENCE_ARTIFACT_UNAVAILABLE", "missing-source", { record: clone(record) });
    }
    const settings = internal.isPlainObject(options) ? options : {};
    return internal.buildResult(true, "IDE180_INTELLIGENCE_ARTIFACT_LOADED", "complete", {
      record: clone(record),
      artifact: settings.includePayload === false ? Object.assign({}, artifact, { payload: undefined }) : artifact
    }, {
      sourceSnapshot: {
        packageId: providerState.packageId,
        packageHash: providerState.packageHash,
        providerId: PROVIDER_ID,
        providerVersion: MODULE_VERSION
      }
    });
  }

  const providerDefinition = {
    providerId: PROVIDER_ID,
    providerVersion: MODULE_VERSION,
    sourceType: SOURCE_TYPE,
    readMode: "read-only",
    availability: "not-loaded",
    capabilities: clone(BASE_CAPABILITIES),
    supports: providerSupports,
    describe: providerDescribe,
    get: providerGet,
    search: providerSearch,
    list: providerList
  };

  async function resolvePackageInput(input, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const runtime = ide170();
    if (!runtime) return { ok: false, code: "IDE180_IDE170_RUNTIME_UNAVAILABLE", status: "unavailable" };

    if (internal.isPlainObject(input) && input.packageId && input.manifest) {
      return { ok: true, package: clone(input), origin: "explicit" };
    }

    const requestedId = text(input && input.packageId || input, "");
    const runtimeIdentity = runtimePackageIdentity();
    const receiptIdentity = releaseReceiptIdentity();
    const packageId = requestedId || runtimeIdentity && runtimeIdentity.packageId || receiptIdentity && receiptIdentity.packageId || "";
    if (!packageId) return { ok: false, code: "IDE180_INTELLIGENCE_PACKAGE_ID_UNAVAILABLE", status: "not-loaded" };

    if (typeof runtime.getIntelligencePackage === "function") {
      const inMemory = runtime.getIntelligencePackage(packageId);
      if (inMemory) return { ok: true, package: inMemory, origin: "runtime" };
    }

    if (settings.allowIndexedDB !== false && typeof runtime.loadIntelligencePackageFromIndexedDB === "function") {
      const loaded = await runtime.loadIntelligencePackageFromIndexedDB(packageId);
      if (loaded && loaded.ok === true && loaded.data && loaded.data.package) {
        return { ok: true, package: loaded.data.package, origin: "indexeddb", storage: loaded.data.storage || null, storageValidation: loaded.data.validation || null };
      }
      return {
        ok: false,
        code: loaded && loaded.code || "IDE180_INTELLIGENCE_PACKAGE_INDEXEDDB_NOT_LOADED",
        status: loaded && loaded.status || "not-loaded",
        detail: loaded || null
      };
    }

    return { ok: false, code: "IDE180_INTELLIGENCE_PACKAGE_NOT_LOADED", status: "not-loaded", packageId: packageId };
  }

  async function openIntelligencePackageSource(input, options) {
    const runtime = ide170();
    if (!runtime || typeof runtime.validateIntelligencePackage !== "function" || typeof runtime.validateIDE180HandoffContract !== "function") {
      clearActiveSource();
      providerState.lastError = { code: "IDE180_IDE170_PACKAGE_API_INCOMPATIBLE", checkedAt: internal.nowIso() };
      return internal.buildResult(false, "IDE180_IDE170_PACKAGE_API_INCOMPATIBLE", "incompatible", null);
    }

    const resolved = await resolvePackageInput(input, options);
    if (!resolved.ok) {
      clearActiveSource();
      providerState.lastOpen = clone(resolved);
      providerState.lastError = clone(resolved);
      return internal.buildResult(false, resolved.code, resolved.status || "not-loaded", resolved.detail || null, {
        missingSource: { sourceType: SOURCE_TYPE, packageId: resolved.packageId || null }
      });
    }

    const pkg = clone(resolved.package);
    const packageValidation = runtime.validateIntelligencePackage(pkg);
    if (!packageValidation || packageValidation.valid !== true) {
      clearActiveSource();
      providerState.lastError = { code: "IDE180_INTELLIGENCE_PACKAGE_INVALID", validation: clone(packageValidation), checkedAt: internal.nowIso() };
      return internal.buildResult(false, "IDE180_INTELLIGENCE_PACKAGE_INVALID", "incompatible", { validation: packageValidation });
    }

    const compatibility = validateManifestCompatibility(pkg);
    if (!compatibility.valid) {
      clearActiveSource();
      providerState.lastError = { code: "IDE180_INTELLIGENCE_MANIFEST_INCOMPATIBLE", validation: clone(compatibility), checkedAt: internal.nowIso() };
      return internal.buildResult(false, "IDE180_INTELLIGENCE_MANIFEST_INCOMPATIBLE", "incompatible", { validation: compatibility });
    }

    const handoff = extractHandoff(pkg);
    const handoffValidation = runtime.validateIDE180HandoffContract(handoff, pkg);
    if (!handoff || !handoffValidation || handoffValidation.valid !== true) {
      clearActiveSource();
      providerState.lastError = { code: "IDE180_INTELLIGENCE_HANDOFF_INVALID", validation: clone(handoffValidation), checkedAt: internal.nowIso() };
      return internal.buildResult(false, "IDE180_INTELLIGENCE_HANDOFF_INVALID", "incompatible", { validation: handoffValidation });
    }

    indexPackage(pkg, handoff, resolved.origin);
    providerState.lastError = null;
    providerState.lastOpen = {
      ok: true,
      packageId: providerState.packageId,
      packageHash: providerState.packageHash,
      sourceOrigin: providerState.sourceOrigin,
      availability: providerState.availability,
      artifactCount: providerState.artifactIndex.length,
      openedAt: providerState.openedAt
    };
    internal.touch();

    return internal.buildResult(true, "IDE180_INTELLIGENCE_SOURCE_OPENED", providerState.availability, {
      provider: providerDescribe(),
      manifest: clone(providerState.manifest),
      handoff: clone(providerState.handoff),
      packageValidation: clone(packageValidation),
      compatibilityValidation: clone(compatibility),
      handoffValidation: clone(handoffValidation),
      storage: clone(resolved.storage || null)
    });
  }

  function closeIntelligencePackageSource() {
    const previous = providerState.packageId;
    clearActiveSource();
    providerDefinition.availability = "not-loaded";
    providerDefinition.capabilities = clone(BASE_CAPABILITIES);
    internal.touch();
    return internal.buildResult(true, "IDE180_INTELLIGENCE_SOURCE_CLOSED", "not-loaded", { previousPackageId: previous });
  }

  function getIntelligenceProviderStatus() {
    const description = providerDescribe();
    return Object.assign({
      id: "IDE-180-INTELLIGENCE-PROVIDER-STATUS",
      version: MODULE_VERSION,
      status: namespace.modules.intelligenceProvider && namespace.modules.intelligenceProvider.status || "Loaded",
      registered: state.providerDefinitions instanceof Map && state.providerDefinitions.has(PROVIDER_ID),
      lastOpen: clone(providerState.lastOpen),
      lastError: clone(providerState.lastError)
    }, description);
  }

  function initializeIntelligenceProvider() {
    const existing = state.providerDefinitions instanceof Map ? state.providerDefinitions.get(PROVIDER_ID) : null;
    let registration;
    if (existing) {
      registration = internal.buildResult(true, "IDE180_PROVIDER_EXISTS", "Ready", { providerId: PROVIDER_ID, existing: true });
    } else if (typeof namespace.registerProviderDefinition === "function") {
      registration = namespace.registerProviderDefinition(providerDefinition);
    } else {
      registration = internal.buildResult(false, "IDE180_PROVIDER_REGISTRY_UNAVAILABLE", "Blocked", null);
    }

    const available = inspectAvailability();
    providerDefinition.availability = available.availability;
    namespace.modules.intelligenceProvider.status = registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration.ok === true, registration.ok === true ? "IDE180_INTELLIGENCE_PROVIDER_INITIALIZED" : "IDE180_INTELLIGENCE_PROVIDER_INITIALIZATION_FAILED", registration.ok === true ? "Ready" : "Blocked", {
      registration: registration,
      availability: available,
      provider: providerDescribe()
    });
  }

  Object.assign(namespace.api, {
    initializeIntelligenceProvider: initializeIntelligenceProvider,
    openIntelligencePackageSource: openIntelligencePackageSource,
    openLatestIntelligencePackageSource: function openLatest(options) { return openIntelligencePackageSource(null, options); },
    closeIntelligencePackageSource: closeIntelligencePackageSource,
    getIntelligenceProviderStatus: getIntelligenceProviderStatus,
    getIntelligencePackageArtifact: providerGet,
    listIntelligencePackageArtifacts: providerList,
    searchIntelligencePackageArtifacts: providerSearch,
    describeIntelligencePackageProvider: providerDescribe
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.intelligenceProvider = {
    id: "IDE-180-INTELLIGENCE-PROVIDER",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 2,
    sourceType: SOURCE_TYPE,
    providerId: PROVIDER_ID,
    readOnly: true,
    packageValidationRequired: true,
    handoffValidationRequired: true,
    artifactBackedCapabilitiesOnly: true,
    lazyArtifactExposure: true,
    automaticArchiveImportAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.openKnowledgeNavigatorIntelligenceSource = openIntelligencePackageSource;
  global.getKnowledgeNavigatorIntelligenceProviderStatus = getIntelligenceProviderStatus;
})(typeof window !== "undefined" ? window : globalThis);
