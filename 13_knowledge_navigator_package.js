/* ============================================================
   FILE: 13_knowledge_navigator_package.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Navigation Package 1.0.0
   Phase 9: IDE-190 Navigation Package / Handoff
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Navigation Package blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("navigationPackage");
  const PACKAGE_VERSION = "1.0.0";
  const CONTRACT_VERSION = VERSION_MANIFEST.getContractVersion("ide190Handoff");

  if (!(state.navigationPackages instanceof Map)) state.navigationPackages = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestNavigationPackageId")) state.latestNavigationPackageId = null;

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256Text(value) {
    if (global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function") {
      const bytes = new global.TextEncoder().encode(String(value == null ? "" : value));
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    }
    let hash = 2166136261;
    const source = String(value == null ? "" : value);
    for (let i = 0; i < source.length; i += 1) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function withoutIntegrity(value) {
    const copy = internal.clone(value || {});
    delete copy.integrity;
    return copy;
  }

  async function computeIntegrity(value) {
    const hash = await sha256Text(stableStringify(withoutIntegrity(value)));
    return { algorithm: hash.length === 64 ? "SHA-256" : "FNV-1A-32", hash: hash };
  }

  function sourceSnapshotFromResult(result) {
    if (typeof namespace.captureKnowledgeNavigatorSourceSnapshot === "function") {
      try { return namespace.captureKnowledgeNavigatorSourceSnapshot(); } catch (_) { /* source-bounded fallback */ }
    }
    return internal.clone(result && result.metadata && result.metadata.sourceSnapshot || {});
  }

  function packageManifest(result, sourceSnapshot) {
    const providers = typeof namespace.listProviderDefinitions === "function" ? namespace.listProviderDefinitions() : [];
    const resolvers = typeof namespace.listResolverDefinitions === "function" ? namespace.listResolverDefinitions() : [];
    return {
      manifestVersion: "1.0.0",
      packageType: "ide180-navigation-package",
      producer: { componentId: "IDE-180", version: VERSION_MANIFEST.release.version },
      consumer: { componentId: "IDE-190", minimumVersion: VERSION_MANIFEST.compatibility.minimumIDE190Version },
      navigationType: result && result.metadata && result.metadata.navigationType || null,
      navigationStatus: result && result.status || "unknown",
      contractVersions: internal.clone(VERSION_MANIFEST.contractVersions || {}),
      providers: providers.map(function mapProvider(item) { return { providerId: item.providerId, providerVersion: item.providerVersion, sourceType: item.sourceType, readMode: item.readMode }; }),
      resolvers: resolvers.map(function mapResolver(item) { return { resolverId: item.resolverId, resolverVersion: item.resolverVersion, readOnly: item.readOnly === true }; }),
      sourceSnapshotVersion: sourceSnapshot && sourceSnapshot.snapshotVersion || null,
      runtimeStateIncluded: false,
      excludedRuntimeState: ["navigation-session", "traversal-queue", "traversal-stack", "visited-nodes", "visited-relationships", "provider-handle", "archive-file-handle", "source-cache"],
      mutationPermissions: {
        repositoryMutationAllowed: false,
        workflowExecutionAllowed: false,
        recommendationApplicationAllowed: false,
        factPromotionAllowed: false,
        archiveImportAllowed: false
      },
      readOnly: true
    };
  }

  function canonicalTarget(result) {
    if (result && result.target && typeof result.target === "object") return internal.clone(result.target);
    return {
      canonicalId: null,
      status: "unresolved",
      navigationType: result && result.metadata && result.metadata.navigationType || null
    };
  }

  async function buildKnowledgeNavigatorPackage(navigationResult, options) {
    const result = navigationResult && navigationResult.resultId ? navigationResult : null;
    const settings = options && typeof options === "object" ? options : {};
    if (!result) return internal.buildResult(false, "IDE180_NAVIGATION_RESULT_REQUIRED", "Blocked", null, { error: { message: "Navigation Result is required.", category: "Input Failure" } });

    const sourceSnapshot = sourceSnapshotFromResult(result);
    const pkg = {
      packageId: internal.text(settings.packageId, internal.nextId("IDE-180-NAVIGATION-PACKAGE")),
      packageVersion: PACKAGE_VERSION,
      contractVersion: CONTRACT_VERSION,
      canonicalTarget: canonicalTarget(result),
      navigationPath: internal.clone(result.navigationPath || []),
      authority: internal.clone(result.authority || { status: "not-applicable", reason: "Authority unavailable." }),
      evidence: internal.clone(result.evidence || []),
      lineage: internal.clone(result.lineage || []),
      validation: internal.clone(result.validation || { status: "not-evaluated" }),
      conflicts: internal.clone(result.conflicts || []),
      missingSources: internal.clone(result.missingSources || []),
      structuredExplanation: internal.clone(result.explanation || {}),
      sourceSnapshot: internal.clone(sourceSnapshot || {}),
      manifest: packageManifest(result, sourceSnapshot),
      integrity: {},
      componentId: "IDE-180",
      navigationResultId: result.resultId,
      requestId: result.requestId || null,
      navigationStatus: result.status,
      createdAt: internal.nowIso(),
      immutable: true
    };
    pkg.integrity = await computeIntegrity(pkg);
    const validation = await validateKnowledgeNavigatorPackage(pkg);
    if (!validation.valid) return internal.buildResult(false, "IDE180_NAVIGATION_PACKAGE_INVALID", "Blocked", { package: pkg, validation: validation });
    const frozen = internal.deepFreeze(internal.clone(pkg));
    state.navigationPackages.set(frozen.packageId, frozen);
    state.latestNavigationPackageId = frozen.packageId;
    internal.touch();
    return internal.buildResult(true, "IDE180_NAVIGATION_PACKAGE_READY", result.status === "complete" ? "Ready" : "Partial", { package: internal.clone(frozen), validation: validation });
  }

  async function validateKnowledgeNavigatorPackage(packageLike) {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) }); }
    const pkg = packageLike || null;
    check("Package exists", Boolean(pkg), pkg && pkg.packageId);
    if (pkg) {
      const contract = namespace.validateContract("ide190Handoff", pkg);
      check("Frozen IDE-190 Handoff contract validates", contract.valid === true, "failed=" + contract.failed);
      check("Package Version is 1.0.0", pkg.packageVersion === PACKAGE_VERSION, pkg.packageVersion);
      check("Contract Version matches", pkg.contractVersion === CONTRACT_VERSION, pkg.contractVersion);
      check("Package ID is present", Boolean(internal.text(pkg.packageId, "")), pkg.packageId);
      check("Canonical Target is explicit", Boolean(pkg.canonicalTarget && typeof pkg.canonicalTarget === "object"), pkg.canonicalTarget && pkg.canonicalTarget.canonicalId);
      check("Source Snapshot is explicit", Boolean(pkg.sourceSnapshot && typeof pkg.sourceSnapshot === "object"), pkg.sourceSnapshot && pkg.sourceSnapshot.snapshotVersion);
      check("Manifest declares read-only", pkg.manifest && pkg.manifest.readOnly === true, pkg.manifest && pkg.manifest.readOnly);
      check("Manifest excludes Runtime state", pkg.manifest && pkg.manifest.runtimeStateIncluded === false, pkg.manifest && pkg.manifest.runtimeStateIncluded);
      const permissions = pkg.manifest && pkg.manifest.mutationPermissions || {};
      check("Repository mutation is prohibited", permissions.repositoryMutationAllowed === false, permissions.repositoryMutationAllowed);
      check("Workflow execution is prohibited", permissions.workflowExecutionAllowed === false, permissions.workflowExecutionAllowed);
      check("Fact promotion is prohibited", permissions.factPromotionAllowed === false, permissions.factPromotionAllowed);
      check("Archive import is prohibited", permissions.archiveImportAllowed === false, permissions.archiveImportAllowed);
      const expected = await computeIntegrity(pkg);
      check("Package Integrity is valid", Boolean(pkg.integrity && pkg.integrity.hash) && pkg.integrity.hash === expected.hash && pkg.integrity.algorithm === expected.algorithm, pkg.integrity && pkg.integrity.hash);
    }
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return { id: internal.nextId("IDE-180-NAVIGATION-PACKAGE-VALIDATION"), valid: failed === 0, status: failed === 0 ? "Valid" : "Invalid", passed: passed, failed: failed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0, checks: checks, validatedAt: internal.nowIso() };
  }

  function getKnowledgeNavigatorPackage(packageId) { return internal.clone(state.navigationPackages.get(internal.text(packageId, "")) || null); }
  function getLatestKnowledgeNavigatorPackage() { return state.latestNavigationPackageId ? getKnowledgeNavigatorPackage(state.latestNavigationPackageId) : null; }
  function listKnowledgeNavigatorPackages() { return Array.from(state.navigationPackages.values()).map(function cloneItem(item) { return internal.clone(item); }); }

  function getKnowledgeNavigatorPackageStatus() {
    return {
      id: "IDE-180-NAVIGATION-PACKAGE-STATUS",
      version: MODULE_VERSION,
      packageVersion: PACKAGE_VERSION,
      contractVersion: CONTRACT_VERSION,
      status: namespace.modules.navigationPackage && namespace.modules.navigationPackage.status || "Loaded",
      packageCount: state.navigationPackages.size,
      latestPackageId: state.latestNavigationPackageId,
      runtimeStateIncluded: false,
      mutationAllowed: false,
      readOnly: true
    };
  }

  function initializeNavigationPackage() {
    namespace.modules.navigationPackage.status = "Ready";
    return internal.buildResult(true, "IDE180_NAVIGATION_PACKAGE_INITIALIZED", "Ready", getKnowledgeNavigatorPackageStatus());
  }

  Object.assign(namespace.api, {
    initializeNavigationPackage: initializeNavigationPackage,
    buildKnowledgeNavigatorPackage: buildKnowledgeNavigatorPackage,
    validateKnowledgeNavigatorPackage: validateKnowledgeNavigatorPackage,
    getKnowledgeNavigatorPackage: getKnowledgeNavigatorPackage,
    getLatestKnowledgeNavigatorPackage: getLatestKnowledgeNavigatorPackage,
    listKnowledgeNavigatorPackages: listKnowledgeNavigatorPackages,
    getKnowledgeNavigatorPackageStatus: getKnowledgeNavigatorPackageStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.navigationPackage = {
    id: "IDE-180-NAVIGATION-PACKAGE",
    version: MODULE_VERSION,
    packageVersion: PACKAGE_VERSION,
    contractVersion: CONTRACT_VERSION,
    status: "Loaded",
    phase: 9,
    runtimeStateIncluded: false,
    mutationAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
