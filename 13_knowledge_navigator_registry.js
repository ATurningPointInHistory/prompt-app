/* ============================================================
   FILE: 13_knowledge_navigator_registry.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Registry 1.0.0
   Phase 1: Foundation / Contracts
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 registry blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("registry");

  const BUILT_IN_TYPES = [
    { typeId: "search", aliases: ["検索", "探す"], phase: 3, implemented: true, resolverId: "IDE-180-RESOLVER-BASIC-NAVIGATION" },
    { typeId: "entity", aliases: ["entity", "エンティティ", "対象"], phase: 3, implemented: true, resolverId: "IDE-180-RESOLVER-BASIC-NAVIGATION" },
    { typeId: "repository", aliases: ["repository", "リポジトリ"], phase: 3, implemented: true, resolverId: "IDE-180-RESOLVER-BASIC-NAVIGATION" },
    { typeId: "file", aliases: ["file", "ファイル"], phase: 3, implemented: true, resolverId: "IDE-180-RESOLVER-BASIC-NAVIGATION" },
    { typeId: "module", aliases: ["module", "モジュール"], phase: 3, implemented: true, resolverId: "IDE-180-RESOLVER-BASIC-NAVIGATION" },
    { typeId: "function", aliases: ["function", "関数"], phase: 3, implemented: true, resolverId: "IDE-180-RESOLVER-BASIC-NAVIGATION" },
    { typeId: "architecture", aliases: ["architecture", "アーキテクチャ", "構造"], phase: 5 },
    { typeId: "knowledge", aliases: ["knowledge", "ナレッジ", "知識"], phase: 5 },
    { typeId: "relationship", aliases: ["relationship", "relation", "関係", "関連"], phase: 4 },
    { typeId: "dependency", aliases: ["dependency", "依存", "依存関係"], phase: 4 },
    { typeId: "reverse-dependency", aliases: ["reverse dependency", "逆依存", "何が依存している"], phase: 4 },
    { typeId: "workflow", aliases: ["workflow", "ワークフロー"], phase: 4 },
    { typeId: "decision", aliases: ["decision", "決定", "Decision"], phase: 5 },
    { typeId: "evidence", aliases: ["evidence", "根拠", "証拠"], phase: 5 },
    { typeId: "lineage", aliases: ["lineage", "来歴", "系譜", "どこから来た"], phase: 5 },
    { typeId: "version", aliases: ["version", "バージョン"], phase: 5 },
    { typeId: "timeline", aliases: ["timeline", "時系列", "履歴"], phase: 5 },
    { typeId: "validation", aliases: ["validation", "検証", "バリデーション"], phase: 5 },
    { typeId: "insight", aliases: ["insight", "洞察", "Insight"], phase: 5 },
    { typeId: "explanation", aliases: ["explanation", "説明", "理由"], phase: 5 }
  ];

  function normalizeAlias(value) {
    return internal.text(value, "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
  }

  function normalizeNavigationType(definition) {
    const source = internal.isPlainObject(definition) ? definition : {};
    const typeId = normalizeAlias(source.typeId || source.id);
    return internal.deepFreeze({
      typeId: typeId,
      version: internal.text(source.version, "1.0.0"),
      resolverId: source.resolverId == null ? null : internal.text(source.resolverId, ""),
      supportedSources: internal.unique(source.supportedSources),
      supportedTargets: internal.unique(source.supportedTargets),
      status: internal.text(source.status, "Defined"),
      capabilities: internal.unique(source.capabilities || ["read-only-navigation"]),
      aliases: internal.unique([typeId].concat(source.aliases || [])),
      implementationPhase: Number.isInteger(source.phase) ? source.phase : null,
      implemented: source.implemented === true,
      readOnly: true,
      metadata: internal.isPlainObject(source.metadata) ? internal.clone(source.metadata) : {}
    });
  }

  function registerNavigationType(definition) {
    const normalized = normalizeNavigationType(definition);
    if (!normalized.typeId || !VERSION_MANIFEST.navigationTypes.includes(normalized.typeId)) {
      return internal.buildResult(false, "IDE180_NAVIGATION_TYPE_UNSUPPORTED", "Blocked", { typeId: normalized.typeId });
    }

    const existing = state.navigationTypes.get(normalized.typeId);
    if (existing) {
      return internal.buildResult(true, "IDE180_NAVIGATION_TYPE_EXISTS", "Ready", { navigationType: internal.clone(existing), existing: true });
    }

    const aliasConflicts = [];
    normalized.aliases.forEach(function inspectAlias(alias) {
      const key = normalizeAlias(alias);
      const mapped = state.aliases.get(key);
      if (mapped && mapped !== normalized.typeId) aliasConflicts.push({ alias: alias, existingTypeId: mapped });
    });
    if (aliasConflicts.length) {
      return internal.buildResult(false, "IDE180_NAVIGATION_ALIAS_CONFLICT", "Blocked", { typeId: normalized.typeId, conflicts: aliasConflicts });
    }

    state.navigationTypes.set(normalized.typeId, normalized);
    normalized.aliases.forEach(function bindAlias(alias) {
      state.aliases.set(normalizeAlias(alias), normalized.typeId);
    });
    internal.touch();
    return internal.buildResult(true, "IDE180_NAVIGATION_TYPE_REGISTERED", "Ready", { navigationType: internal.clone(normalized), existing: false });
  }

  function getNavigationType(typeId) {
    const key = normalizeAlias(typeId);
    const direct = state.navigationTypes.get(key);
    return direct ? internal.clone(direct) : null;
  }

  function listNavigationTypes() {
    return Array.from(state.navigationTypes.values()).map(function copy(item) { return internal.clone(item); });
  }

  function resolveNavigationType(input) {
    const alias = normalizeAlias(input);
    if (!alias) {
      return {
        ok: false,
        code: "IDE180_NAVIGATION_TYPE_REQUIRED",
        status: "invalid-request",
        input: input == null ? null : String(input),
        typeId: null,
        matchedAlias: null
      };
    }
    const typeId = state.aliases.get(alias) || null;
    if (!typeId) {
      return {
        ok: false,
        code: "IDE180_NAVIGATION_TYPE_UNSUPPORTED",
        status: "unsupported",
        input: String(input),
        typeId: null,
        matchedAlias: null
      };
    }
    return {
      ok: true,
      code: "IDE180_NAVIGATION_TYPE_RESOLVED",
      status: "resolved",
      input: String(input),
      typeId: typeId,
      matchedAlias: alias,
      definition: getNavigationType(typeId)
    };
  }

  function registerResolverDefinition(definition) {
    const source = internal.isPlainObject(definition) ? definition : {};
    const resolverId = internal.text(source.resolverId, "");
    if (!resolverId || typeof source.resolve !== "function") {
      return internal.buildResult(false, "IDE180_RESOLVER_DEFINITION_INVALID", "Blocked", null);
    }
    const validation = namespace.validateContract && namespace.validateContract("resolver", source);
    if (validation && validation.valid !== true) {
      return internal.buildResult(false, "IDE180_RESOLVER_CONTRACT_INVALID", "Blocked", { validation: validation });
    }
    if (state.resolverDefinitions.has(resolverId)) {
      return internal.buildResult(false, "IDE180_RESOLVER_DUPLICATE", "Blocked", { resolverId: resolverId });
    }
    state.resolverDefinitions.set(resolverId, source);
    internal.touch();
    return internal.buildResult(true, "IDE180_RESOLVER_REGISTERED", "Ready", { resolverId: resolverId });
  }

  function registerProviderDefinition(definition) {
    const source = internal.isPlainObject(definition) ? definition : {};
    const providerId = internal.text(source.providerId, "");
    if (!providerId) {
      return internal.buildResult(false, "IDE180_PROVIDER_DEFINITION_INVALID", "Blocked", null);
    }
    const validation = namespace.validateContract && namespace.validateContract("sourceProvider", source);
    if (validation && validation.valid !== true) {
      return internal.buildResult(false, "IDE180_PROVIDER_CONTRACT_INVALID", "Blocked", { validation: validation });
    }
    if (state.providerDefinitions.has(providerId)) {
      return internal.buildResult(false, "IDE180_PROVIDER_DUPLICATE", "Blocked", { providerId: providerId });
    }
    state.providerDefinitions.set(providerId, source);
    internal.touch();
    return internal.buildResult(true, "IDE180_PROVIDER_REGISTERED", "Ready", { providerId: providerId });
  }


  function getResolverDefinition(resolverId) {
    const id = internal.text(resolverId, "");
    const definition = state.resolverDefinitions.get(id);
    return definition || null;
  }

  function getProviderDefinition(providerId) {
    const id = internal.text(providerId, "");
    const definition = state.providerDefinitions.get(id);
    return definition || null;
  }

  function listResolverDefinitions() {
    return Array.from(state.resolverDefinitions.keys()).map(function mapId(id) { return { resolverId: id }; });
  }

  function listProviderDefinitions() {
    return Array.from(state.providerDefinitions.keys()).map(function mapId(id) { return { providerId: id }; });
  }

  function initializeRegistry() {
    const results = BUILT_IN_TYPES.map(registerNavigationType);
    const failed = results.filter(function failedResult(result) { return !result || result.ok !== true; });
    namespace.modules.registry.status = failed.length === 0 ? "Ready" : "Blocked";
    return internal.buildResult(
      failed.length === 0,
      failed.length === 0 ? "IDE180_REGISTRY_INITIALIZED" : "IDE180_REGISTRY_INITIALIZATION_FAILED",
      failed.length === 0 ? "Ready" : "Blocked",
      {
        navigationTypeCount: state.navigationTypes.size,
        aliasCount: state.aliases.size,
        providerDefinitionCount: state.providerDefinitions.size,
        resolverDefinitionCount: state.resolverDefinitions.size,
        results: results
      }
    );
  }

  Object.assign(namespace.api, {
    initializeRegistry: initializeRegistry,
    registerNavigationType: registerNavigationType,
    getNavigationType: getNavigationType,
    listNavigationTypes: listNavigationTypes,
    resolveNavigationType: resolveNavigationType,
    registerResolverDefinition: registerResolverDefinition,
    registerProviderDefinition: registerProviderDefinition,
    getResolverDefinition: getResolverDefinition,
    getProviderDefinition: getProviderDefinition,
    listResolverDefinitions: listResolverDefinitions,
    listProviderDefinitions: listProviderDefinitions
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.registry = {
    id: "IDE-180-REGISTRY",
    version: MODULE_VERSION,
    status: "Loaded",
    navigationTypeCount: BUILT_IN_TYPES.length,
    extensible: true,
    fuzzyIdentityMergeAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
