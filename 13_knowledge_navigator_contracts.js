/* ============================================================
   FILE: 13_knowledge_navigator_contracts.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Contracts 1.0.0
   Phase 1: Foundation / Contracts
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 contracts blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("contracts");
  const STATUS_VALUES = [
    "complete",
    "partial",
    "not-found",
    "missing-source",
    "unsupported",
    "invalid-request",
    "incompatible",
    "error"
  ];
  const AVAILABILITY_VALUES = ["available", "partial", "unavailable", "not-loaded", "unsupported"];
  const AUTHORITY_VALUES = ["resolved", "ambiguous", "insufficient-evidence", "missing-source", "not-applicable"];
  const TRUST_VALUES = ["verified-related", "verified-archive", "unverified", "incompatible", "corrupted", "not-applicable"];

  function field(name, options) {
    return Object.assign({ name: name, required: false }, options || {});
  }

  const BUILT_IN_CONTRACTS = [
    {
      key: "navigationRequest",
      name: "Navigation Request Contract",
      description: "Typed request boundary for IDE-180 navigation.",
      fields: [
        field("requestId", { required: true, type: "string" }),
        field("contractVersion", { required: true, type: "string" }),
        field("query", { type: "string|null" }),
        field("target", { type: "object|string|null" }),
        field("navigationType", { required: true, type: "string" }),
        field("scope", { type: "object|string|null" }),
        field("sourcePreference", { type: "array" }),
        field("evidenceRequirement", { type: "object|string|null" }),
        field("maxDepth", { type: "integer|null" }),
        field("options", { type: "object" })
      ]
    },
    {
      key: "navigationResult",
      name: "Navigation Result Contract",
      description: "Evidence-grounded navigation result boundary.",
      fields: [
        field("resultId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("contractVersion", { required: true, type: "string" }),
        field("status", { required: true, type: "string", enum: STATUS_VALUES }),
        field("target", { type: "object|string|null" }),
        field("navigationPath", { required: true, type: "array" }),
        field("sources", { required: true, type: "array" }),
        field("relationships", { required: true, type: "array" }),
        field("authority", { required: true, type: "object" }),
        field("evidence", { required: true, type: "array" }),
        field("lineage", { required: true, type: "array" }),
        field("version", { type: "object|string|null" }),
        field("validation", { required: true, type: "object" }),
        field("conflicts", { type: "array" }),
        field("missingSources", { required: true, type: "array" }),
        field("partialReason", { type: "string|null" }),
        field("explanation", { required: true, type: "object" }),
        field("metadata", { required: true, type: "object" })
      ]
    },
    {
      key: "navigationContext",
      name: "Navigation Context Contract",
      description: "Isolated runtime context. Context is not Knowledge.",
      fields: [
        field("contextId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("sourceSnapshot", { required: true, type: "object" }),
        field("visitedNodes", { required: true, type: "array" }),
        field("visitedRelationships", { required: true, type: "array" }),
        field("candidateTargets", { required: true, type: "array" }),
        field("resolvedTargets", { required: true, type: "array" }),
        field("partialPaths", { required: true, type: "array" }),
        field("missingSources", { required: true, type: "array" }),
        field("authorityState", { type: "object|null" }),
        field("evidenceState", { type: "object|null" }),
        field("budgetState", { type: "object|null" }),
        field("warnings", { required: true, type: "array" })
      ]
    },
    {
      key: "sourceProvider",
      name: "Source Provider Contract",
      description: "Versioned read-only provider boundary.",
      fields: [
        field("providerId", { required: true, type: "string" }),
        field("providerVersion", { required: true, type: "string" }),
        field("sourceType", { required: true, type: "string" }),
        field("readMode", { required: true, type: "string", enum: ["read-only"] }),
        field("availability", { required: true, type: "string", enum: AVAILABILITY_VALUES }),
        field("capabilities", { required: true, type: "array" }),
        field("supports", { required: true, type: "function" }),
        field("describe", { required: true, type: "function" }),
        field("get", { required: true, type: "function" }),
        field("search", { required: true, type: "function" }),
        field("list", { required: true, type: "function" })
      ]
    },
    {
      key: "resolver",
      name: "Resolver Contract",
      description: "Typed resolver boundary. Resolvers interpret; providers fetch.",
      fields: [
        field("resolverId", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("navigationTypes", { required: true, type: "array" }),
        field("readOnly", { required: true, type: "boolean", enum: [true] }),
        field("resolve", { required: true, type: "function" })
      ]
    },
    {
      key: "normalizedSourceRecord",
      name: "Normalized Source Record Contract",
      description: "Non-destructive source normalization boundary.",
      fields: [
        field("recordId", { required: true, type: "string" }),
        field("canonicalEntityId", { type: "string|null" }),
        field("providerId", { required: true, type: "string" }),
        field("sourceId", { required: true, type: "string" }),
        field("sourceType", { required: true, type: "string" }),
        field("recordType", { required: true, type: "string" }),
        field("title", { type: "string" }),
        field("summary", { type: "string" }),
        field("contentReference", { type: "object|string|null" }),
        field("version", { required: true, type: "string" }),
        field("lifecycle", { required: true, type: "string" }),
        field("officialState", { required: true, type: "string", enum: ["official", "non-official", "unknown"] }),
        field("validationState", { required: true, type: "string", enum: ["validated", "not-validated", "failed", "unknown"] }),
        field("scope", { type: "object|string|null" }),
        field("relationships", { required: true, type: "array" }),
        field("lineage", { required: true, type: "array" }),
        field("evidenceReferences", { required: true, type: "array" }),
        field("trust", { required: true, type: "string", enum: TRUST_VALUES }),
        field("timestamps", { required: true, type: "object" }),
        field("sourceMetadata", { required: true, type: "object" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "navigationExplanation",
      name: "Navigation Explanation Contract",
      description: "Structured + human-readable explanation without hidden reasoning.",
      fields: [
        field("explanationId", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("resultId", { required: true, type: "string" }),
        field("conclusion", { required: true, type: "string" }),
        field("appliedRules", { required: true, type: "array" }),
        field("navigationPath", { required: true, type: "array" }),
        field("sources", { required: true, type: "array" }),
        field("authority", { required: true, type: "object" }),
        field("evidence", { required: true, type: "array" }),
        field("validation", { required: true, type: "object" }),
        field("missingSources", { required: true, type: "array" }),
        field("limitations", { required: true, type: "array" }),
        field("truncation", { required: true, type: "object" }),
        field("ambiguity", { required: true, type: "object" }),
        field("humanReadable", { required: true, type: "string" }),
        field("metadata", { required: true, type: "object" })
      ]
    },
    {
      key: "navigationReceipt",
      name: "Navigation Receipt Contract",
      description: "Selective persistence contract for reproducibility and traceability.",
      fields: [
        field("receiptId", { required: true, type: "string" }),
        field("version", { required: true, type: "string" }),
        field("sessionId", { required: true, type: "string" }),
        field("requestId", { required: true, type: "string" }),
        field("resultId", { required: true, type: "string" }),
        field("status", { required: true, type: "string" }),
        field("sourceSnapshot", { required: true, type: "object" }),
        field("navigationSummary", { required: true, type: "object" }),
        field("path", { required: true, type: "array" }),
        field("authoritySummary", { required: true, type: "object" }),
        field("evidenceRefs", { required: true, type: "array" }),
        field("missing", { required: true, type: "array" }),
        field("budget", { required: true, type: "object" }),
        field("versions", { required: true, type: "object" }),
        field("createdAt", { required: true, type: "string" }),
        field("integrity", { required: true, type: "object" })
      ]
    },
    {
      key: "ide190Handoff",
      name: "IDE-180 to IDE-190 Handoff Contract",
      description: "Frozen typed navigation package boundary for IDE-190.",
      fields: [
        field("packageId", { required: true, type: "string" }),
        field("packageVersion", { required: true, type: "string" }),
        field("contractVersion", { required: true, type: "string" }),
        field("canonicalTarget", { required: true, type: "object" }),
        field("navigationPath", { required: true, type: "array" }),
        field("authority", { required: true, type: "object" }),
        field("evidence", { required: true, type: "array" }),
        field("lineage", { required: true, type: "array" }),
        field("validation", { required: true, type: "object" }),
        field("conflicts", { required: true, type: "array" }),
        field("missingSources", { required: true, type: "array" }),
        field("structuredExplanation", { required: true, type: "object" }),
        field("sourceSnapshot", { required: true, type: "object" }),
        field("manifest", { required: true, type: "object" }),
        field("integrity", { required: true, type: "object" })
      ]
    }
  ];

  function typeMatches(value, type) {
    if (type === "function") return typeof value === "function";
    if (type === "array") return Array.isArray(value);
    if (type === "object") return internal.isPlainObject(value);
    if (type === "boolean") return typeof value === "boolean";
    if (type === "integer") return Number.isInteger(value);
    if (type === "string") return typeof value === "string";
    if (type === "string|null") return value == null || typeof value === "string";
    if (type === "integer|null") return value == null || Number.isInteger(value);
    if (type === "object|string|null") return value == null || internal.isPlainObject(value) || typeof value === "string";
    if (type === "object|null") return value == null || internal.isPlainObject(value);
    return true;
  }

  function normalizeDefinition(definition) {
    const key = internal.text(definition && definition.key, "");
    const contractId = VERSION_MANIFEST.getContractId(key);
    const version = VERSION_MANIFEST.getContractVersion(key);
    return internal.deepFreeze({
      contractId: contractId,
      key: key,
      name: internal.text(definition && definition.name, key),
      version: version,
      status: "Active",
      description: internal.text(definition && definition.description, ""),
      fields: (definition && Array.isArray(definition.fields) ? definition.fields : []).map(function copyField(item) {
        return Object.freeze(Object.assign({}, item));
      }),
      readOnly: true,
      owner: "IDE-180",
      source: "IDE-180 Design Freeze v1.0.0"
    });
  }

  function registerContract(definition) {
    const normalized = normalizeDefinition(definition);
    if (!normalized.contractId || !normalized.version) {
      return internal.buildResult(false, "IDE180_CONTRACT_DEFINITION_INVALID", "Blocked", null, {
        error: { message: "Contract ID or version is missing.", category: "Contract Failure" }
      });
    }

    const existing = state.contracts.get(normalized.contractId);
    if (existing && existing.version === normalized.version) {
      return internal.buildResult(true, "IDE180_CONTRACT_EXISTS", "Ready", { contract: internal.clone(existing), existing: true });
    }
    if (existing && existing.version !== normalized.version) {
      return internal.buildResult(false, "IDE180_CONTRACT_VERSION_CONFLICT", "Blocked", { existing: internal.clone(existing), incoming: internal.clone(normalized) });
    }

    state.contracts.set(normalized.contractId, normalized);
    internal.touch();
    return internal.buildResult(true, "IDE180_CONTRACT_REGISTERED", "Ready", { contract: internal.clone(normalized), existing: false });
  }

  function getContractDefinition(contractIdOrKey) {
    const direct = state.contracts.get(internal.text(contractIdOrKey, ""));
    if (direct) return internal.clone(direct);
    const id = VERSION_MANIFEST.getContractId(internal.text(contractIdOrKey, ""));
    return id && state.contracts.has(id) ? internal.clone(state.contracts.get(id)) : null;
  }

  function listContractDefinitions() {
    return Array.from(state.contracts.values()).map(function copy(item) { return internal.clone(item); });
  }

  function validateContract(contractIdOrKey, payload) {
    const definition = getContractDefinition(contractIdOrKey);
    const checks = [];

    function check(name, passed, detail, fieldName) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : String(detail),
        field: fieldName || null
      });
    }

    check("Contract definition exists", Boolean(definition), contractIdOrKey);
    if (!definition) {
      return { valid: false, status: "Invalid", passed: 0, failed: 1, total: 1, health: 0, checks: checks };
    }

    check("Payload is an object", internal.isPlainObject(payload), typeof payload);
    if (!internal.isPlainObject(payload)) {
      const passed = checks.filter(function count(item) { return item.passed; }).length;
      return { valid: false, status: "Invalid", passed: passed, failed: checks.length - passed, total: checks.length, health: Number(((passed / checks.length) * 100).toFixed(2)), checks: checks };
    }

    definition.fields.forEach(function validateField(rule) {
      const has = Object.prototype.hasOwnProperty.call(payload, rule.name);
      if (rule.required) {
        check("Required field exists: " + rule.name, has, has ? "present" : "missing", rule.name);
      }
      if (!has) return;
      check("Field type is valid: " + rule.name, typeMatches(payload[rule.name], rule.type), rule.type || "any", rule.name);
      if (Array.isArray(rule.enum)) {
        check("Field value is governed: " + rule.name, rule.enum.includes(payload[rule.name]), payload[rule.name], rule.name);
      }
    });

    if (Object.prototype.hasOwnProperty.call(payload, "contractVersion")) {
      check("Contract version matches", payload.contractVersion === definition.version, payload.contractVersion, "contractVersion");
    }
    if (Object.prototype.hasOwnProperty.call(payload, "version") && definition.key !== "normalizedSourceRecord") {
      const versionRequired = ["navigationExplanation", "navigationReceipt", "resolver"].includes(definition.key);
      if (versionRequired) check("Version is present", Boolean(internal.text(payload.version, "")), payload.version, "version");
    }

    if (definition.key === "navigationRequest") {
      check("Request has query or target", Boolean(internal.text(payload.query, "")) || payload.target != null, "query/target", "query");
      check("Navigation type is registered or declared", Boolean(internal.text(payload.navigationType, "")), payload.navigationType, "navigationType");
      if (payload.maxDepth != null) check("maxDepth is non-negative", payload.maxDepth >= 0, payload.maxDepth, "maxDepth");
    }

    if (definition.key === "navigationResult") {
      check("Authority status is governed", !payload.authority || !payload.authority.status || AUTHORITY_VALUES.includes(payload.authority.status), payload.authority && payload.authority.status, "authority.status");
    }

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return {
      valid: failed === 0,
      status: failed === 0 ? "Valid" : "Invalid",
      contractId: definition.contractId,
      contractVersion: definition.version,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function initializeContracts() {
    const results = BUILT_IN_CONTRACTS.map(registerContract);
    const failed = results.filter(function failedResult(result) { return !result || result.ok !== true; });
    namespace.modules.contracts.status = failed.length === 0 ? "Ready" : "Blocked";
    return internal.buildResult(
      failed.length === 0,
      failed.length === 0 ? "IDE180_CONTRACTS_INITIALIZED" : "IDE180_CONTRACTS_INITIALIZATION_FAILED",
      failed.length === 0 ? "Ready" : "Blocked",
      {
        registered: state.contracts.size,
        expected: BUILT_IN_CONTRACTS.length,
        results: results
      }
    );
  }

  Object.assign(namespace.api, {
    initializeContracts: initializeContracts,
    registerContract: registerContract,
    getContractDefinition: getContractDefinition,
    listContractDefinitions: listContractDefinitions,
    validateContract: validateContract
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.contracts = {
    id: "IDE-180-CONTRACTS",
    version: MODULE_VERSION,
    status: "Loaded",
    contractCount: BUILT_IN_CONTRACTS.length,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
