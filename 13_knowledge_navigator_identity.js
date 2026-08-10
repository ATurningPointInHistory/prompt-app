/* ============================================================
   FILE: 13_knowledge_navigator_identity.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Identity 1.0.0
   Phase 3: Basic Navigation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 identity blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("identity");

  function normalize(value) {
    return internal.text(value, "").normalize("NFKC").toLowerCase().trim();
  }

  function identityValues(record) {
    const identity = record && record.identity || {};
    return internal.unique([
      identity.canonicalId,
      identity.name,
      identity.qualifiedName
    ].concat(Array.isArray(identity.aliases) ? identity.aliases : []));
  }

  function summarizeRecord(record) {
    const identity = record && record.identity || {};
    const classification = record && record.classification || {};
    const source = record && record.source || {};
    return internal.deepFreeze({
      canonicalId: internal.text(identity.canonicalId, ""),
      recordId: internal.text(record && record.recordId, ""),
      recordType: internal.text(record && record.recordType, "unknown"),
      name: internal.text(identity.name, identity.qualifiedName || identity.canonicalId || record && record.recordId),
      qualifiedName: internal.text(identity.qualifiedName, ""),
      aliases: internal.unique(identity.aliases),
      domain: internal.text(classification.domain, ""),
      lifecycle: internal.text(classification.lifecycle, "unknown"),
      source: {
        adapterId: internal.text(source.adapterId, ""),
        sourceType: internal.text(source.sourceType, ""),
        sourceVersion: internal.text(source.sourceVersion, "")
      },
      immutable: true
    });
  }

  function loadCanonicalSnapshot() {
    if (typeof namespace.getIntelligencePackageArtifact !== "function") {
      return internal.buildResult(false, "IDE180_CANONICAL_PROVIDER_UNAVAILABLE", "missing-source", null, {
        missingSource: { sourceType: "ide170-intelligence-package", artifactType: "canonical-snapshot" }
      });
    }
    const loaded = namespace.getIntelligencePackageArtifact({ artifactType: "canonical-snapshot" });
    if (!loaded || loaded.ok !== true || !loaded.data || !loaded.data.artifact) {
      return loaded || internal.buildResult(false, "IDE180_CANONICAL_SNAPSHOT_UNAVAILABLE", "missing-source", null);
    }
    const payload = loaded.data.artifact.payload || {};
    const records = Array.isArray(payload.records) ? payload.records : [];
    return internal.buildResult(true, "IDE180_CANONICAL_SNAPSHOT_READY", "complete", {
      snapshot: payload,
      records: records,
      sourceRecord: loaded.data.record || null
    }, {
      sourceSnapshot: loaded.sourceSnapshot || null
    });
  }

  function listCanonicalTargets(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const loaded = loadCanonicalSnapshot();
    if (!loaded.ok) return loaded;
    let records = loaded.data.records.slice();
    if (settings.recordType) {
      const type = normalize(settings.recordType);
      records = records.filter(function filter(record) { return normalize(record && record.recordType) === type; });
    }
    const limit = Math.max(1, Math.min(500, Number(settings.limit) || 100));
    return internal.buildResult(true, "IDE180_CANONICAL_TARGETS_LISTED", "complete", {
      targets: records.slice(0, limit).map(summarizeRecord),
      totalMatches: records.length
    }, { sourceSnapshot: loaded.sourceSnapshot || null });
  }

  function searchCanonicalTargets(query, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const term = normalize(query);
    if (!term) return internal.buildResult(false, "IDE180_IDENTITY_QUERY_REQUIRED", "invalid-request", null);
    const loaded = loadCanonicalSnapshot();
    if (!loaded.ok) return loaded;

    const type = normalize(settings.recordType || "");
    const exact = [];
    const contains = [];
    loaded.data.records.forEach(function inspect(record) {
      if (type && normalize(record && record.recordType) !== type) return;
      const values = identityValues(record).map(normalize).filter(Boolean);
      if (values.some(function isExact(value) { return value === term; })) exact.push(record);
      else if (settings.exactOnly !== true && values.some(function has(value) { return value.includes(term); })) contains.push(record);
    });

    function stable(records) {
      return records.slice().sort(function sort(a, b) {
        const ai = a && a.identity || {};
        const bi = b && b.identity || {};
        const ak = String(ai.canonicalId || ai.qualifiedName || ai.name || a.recordId || "");
        const bk = String(bi.canonicalId || bi.qualifiedName || bi.name || b.recordId || "");
        return ak.localeCompare(bk);
      });
    }

    const matched = stable(exact.length ? exact : contains);
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return internal.buildResult(true, "IDE180_CANONICAL_TARGETS_SEARCHED", matched.length ? "complete" : "not-found", {
      matchKind: exact.length ? "exact" : contains.length ? "contains" : "none",
      targets: matched.slice(0, limit).map(summarizeRecord),
      totalMatches: matched.length
    }, { sourceSnapshot: loaded.sourceSnapshot || null });
  }

  function resolveCanonicalTarget(target, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const source = internal.isPlainObject(target) ? target : { value: target };
    const value = internal.text(source.canonicalId || source.recordId || source.name || source.qualifiedName || source.value, "");
    if (!value) return internal.buildResult(false, "IDE180_TARGET_REQUIRED", "invalid-request", null);

    const result = searchCanonicalTargets(value, {
      recordType: source.recordType || settings.recordType || "",
      exactOnly: settings.exactOnly === true,
      limit: settings.limit || 20
    });
    if (!result.ok || !result.data) return result;
    const targets = result.data.targets || [];
    if (!targets.length) {
      return internal.buildResult(false, "IDE180_TARGET_NOT_FOUND", "not-found", { candidates: [] }, { sourceSnapshot: result.sourceSnapshot || null });
    }
    if (targets.length > 1 && result.data.matchKind === "exact") {
      return internal.buildResult(false, "IDE180_TARGET_AMBIGUOUS", "partial", {
        resolutionStatus: "ambiguous",
        candidates: targets
      }, { sourceSnapshot: result.sourceSnapshot || null });
    }
    return internal.buildResult(true, "IDE180_TARGET_RESOLVED", "complete", {
      resolutionStatus: "resolved",
      target: targets[0],
      candidates: targets
    }, { sourceSnapshot: result.sourceSnapshot || null });
  }

  function getIdentityStatus() {
    return {
      id: "IDE-180-IDENTITY-STATUS",
      version: MODULE_VERSION,
      status: namespace.modules.identity && namespace.modules.identity.status || "Loaded",
      canonicalIdentity: true,
      fuzzyIdentityMergeAllowed: false,
      scoringAllowed: false,
      readOnly: true
    };
  }

  function initializeIdentity() {
    namespace.modules.identity.status = "Ready";
    return internal.buildResult(true, "IDE180_IDENTITY_INITIALIZED", "Ready", getIdentityStatus());
  }

  Object.assign(namespace.api, {
    initializeIdentity: initializeIdentity,
    loadKnowledgeNavigatorCanonicalSnapshot: loadCanonicalSnapshot,
    listCanonicalNavigationTargets: listCanonicalTargets,
    searchCanonicalNavigationTargets: searchCanonicalTargets,
    resolveCanonicalNavigationTarget: resolveCanonicalTarget,
    getKnowledgeNavigatorIdentityStatus: getIdentityStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.identity = {
    id: "IDE-180-IDENTITY",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    readOnly: true,
    deterministic: true,
    fuzzyIdentityMergeAllowed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
