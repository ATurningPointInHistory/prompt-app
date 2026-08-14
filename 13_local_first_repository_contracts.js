/* ============================================================
   FILE: 13_local_first_repository_contracts.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.3.0 / Module: Contracts 1.2.0
   Phase 3 Compatible: Offline Staging Descriptor added
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Contracts blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("contracts");

  function field(name, options) { return Object.assign({ name: name, required: false }, options || {}); }

  const BUILT_IN_CONTRACTS = [
    {
      key: "foundation",
      name: "REPOSITORY-010 Foundation Contract",
      fields: [
        field("componentId", { required: true, type: "string", enum: ["REPOSITORY-010"] }),
        field("version", { required: true, type: "string", enum: ["1.0.0"] }),
        field("implementationPhase", { required: true, type: "string" }),
        field("architectureStatus", { required: true, type: "string" }),
        field("logicalAuthority", { required: true, type: "string", enum: ["AI Prompt OS Repository"] }),
        field("initialCanonicalNode", { required: true, type: "string", enum: ["PC Local Repository"] }),
        field("syncMode", { required: true, type: "string", enum: ["controlled-two-way"] }),
        field("readOnlyFoundation", { required: true, type: "boolean", enum: [true] }),
        field("persistentMutationImplemented", { required: true, type: "boolean", enum: [false] }),
        field("persistenceImplemented", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineImplemented", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" })
      ]
    },
    {
      key: "repositoryNodeIdentity",
      name: "REPOSITORY-010 Repository Node Identity Contract",
      fields: [
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("nodeId", { required: true, type: "string" }),
        field("nodeType", { required: true, type: "string" }),
        field("identityGrantsAuthority", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "repositoryRevision",
      name: "REPOSITORY-010 Repository Revision Contract",
      fields: [
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string|null" }),
        field("parentRevisionId", { required: true, type: "string|null" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "repositoryIntegrityRecord",
      name: "REPOSITORY-010 Repository Integrity Record Contract",
      fields: [
        field("integrityRecordId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("hashAlgorithm", { required: true, type: "string", enum: ["SHA-256"] }),
        field("fileHashes", { required: true, type: "object" }),
        field("manifestHash", { required: true, type: "string" }),
        field("scriptSetHash", { required: true, type: "string" }),
        field("contentHash", { required: true, type: "string" }),
        field("repositoryStateHash", { required: true, type: "string" }),
        field("integrityStatus", { required: true, type: "string", enum: VERSION_MANIFEST.integrity.statuses }),
        field("hashGeneratedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "repositoryStateRecord",
      name: "REPOSITORY-010 Repository State Record Contract",
      fields: [
        field("stateRecordId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("nodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("state", { required: true, type: "string", enum: VERSION_MANIFEST.repositoryStates }),
        field("integrityStatus", { required: true, type: "string", enum: VERSION_MANIFEST.integrity.statuses }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("recordedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "validationGateDescriptor",
      name: "REPOSITORY-010 Validation Gate Descriptor Contract",
      fields: [
        field("gateId", { required: true, type: "string" }),
        field("capabilityId", { required: true, type: "string" }),
        field("gateType", { required: true, type: "string" }),
        field("applicability", { required: true, type: "string", enum: VERSION_MANIFEST.validationAuthority.gateApplicability }),
        field("result", { required: true, type: "string", enum: VERSION_MANIFEST.validationAuthority.gateResults }),
        field("validationIsApproval", { required: true, type: "boolean", enum: [false] }),
        field("mutationAuthorityGranted", { required: true, type: "boolean", enum: [false] }),
        field("recordedAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "offlineStagingDescriptor",
      name: "REPOSITORY-010 Offline Staging Descriptor Contract",
      fields: [
        field("stagingId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("nodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("integrityRecordId", { required: true, type: "string" }),
        field("stateRecordId", { required: true, type: "string" }),
        field("lifecycleStatus", { required: true, type: "string", enum: ["staged"] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncCandidateCreated", { required: true, type: "boolean", enum: [false] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    },
    {
      key: "syncCandidateDescriptor",
      name: "REPOSITORY-010 Sync Candidate Descriptor Contract",
      fields: [
        field("syncCandidateId", { required: true, type: "string" }),
        field("stagingId", { required: true, type: "string" }),
        field("projectId", { required: true, type: "string" }),
        field("repositoryId", { required: true, type: "string" }),
        field("sourceNodeId", { required: true, type: "string" }),
        field("revisionId", { required: true, type: "string" }),
        field("baseRevisionId", { required: true, type: "string" }),
        field("integrityRecordId", { required: true, type: "string" }),
        field("stagedStateRecordId", { required: true, type: "string" }),
        field("candidateStateRecordId", { required: true, type: "string" }),
        field("v1GateId", { required: true, type: "string" }),
        field("lifecycleStatus", { required: true, type: "string", enum: ["sync-candidate"] }),
        field("validationLayer", { required: true, type: "string", enum: ["V1 Local Validation"] }),
        field("localValidationPassed", { required: true, type: "boolean", enum: [true] }),
        field("transferAttempted", { required: true, type: "boolean", enum: [false] }),
        field("transferIntegrityValidated", { required: true, type: "boolean", enum: [false] }),
        field("baseConflictValidated", { required: true, type: "boolean", enum: [false] }),
        field("targetEnvironmentValidated", { required: true, type: "boolean", enum: [false] }),
        field("explicitAcceptanceReceived", { required: true, type: "boolean", enum: [false] }),
        field("canonicalMutationPerformed", { required: true, type: "boolean", enum: [false] }),
        field("syncEngineInvoked", { required: true, type: "boolean", enum: [false] }),
        field("authorityEffect", { required: true, type: "string", enum: ["none"] }),
        field("createdAt", { required: true, type: "string" }),
        field("immutable", { required: true, type: "boolean", enum: [true] })
      ]
    }
  ];

  function typeMatches(value, type) {
    if (type === "string|null") return value === null || typeof value === "string";
    if (type === "string") return typeof value === "string";
    if (type === "boolean") return typeof value === "boolean";
    if (type === "array") return Array.isArray(value);
    if (type === "object") return internal.isPlainObject(value);
    return true;
  }

  function normalizeDefinition(definition) {
    const contractId = VERSION_MANIFEST.getContractId(definition.key);
    const version = VERSION_MANIFEST.getContractVersion(definition.key);
    return internal.deepFreeze({
      key: definition.key,
      contractId: contractId,
      version: version,
      name: definition.name,
      fields: definition.fields.map(function copyField(item) { return Object.freeze(Object.assign({}, item)); })
    });
  }

  function registerContract(definition) {
    const normalized = normalizeDefinition(definition);
    if (!normalized.contractId || !normalized.version) {
      return internal.buildResult(false, "REPOSITORY010_CONTRACT_MANIFEST_MISSING", "Blocked", { key: normalized.key });
    }
    state.contracts.set(normalized.contractId, normalized);
    state.contracts.set(normalized.key, normalized);
    return internal.buildResult(true, "REPOSITORY010_CONTRACT_REGISTERED", "Ready", { contractId: normalized.contractId, key: normalized.key, version: normalized.version });
  }

  function getContractDefinition(contractIdOrKey) {
    const definition = state.contracts.get(internal.text(contractIdOrKey, ""));
    return definition ? internal.clone(definition) : null;
  }

  function listContractDefinitions() {
    const seen = new Set();
    const output = [];
    state.contracts.forEach(function collect(definition) {
      if (!definition || seen.has(definition.contractId)) return;
      seen.add(definition.contractId);
      output.push(internal.clone(definition));
    });
    return output.sort(function sort(a, b) { return a.contractId.localeCompare(b.contractId); });
  }

  function validateContract(contractIdOrKey, payload) {
    const definition = state.contracts.get(internal.text(contractIdOrKey, ""));
    const checks = [];
    if (!definition) {
      return { valid: false, contractId: contractIdOrKey || null, checks: [{ name: "Contract is registered", passed: false, detail: "not-found" }], validatedAt: internal.nowIso() };
    }
    const data = internal.isPlainObject(payload) ? payload : {};
    definition.fields.forEach(function validateField(rule) {
      const exists = Object.prototype.hasOwnProperty.call(data, rule.name);
      checks.push({ name: rule.name + " required", passed: !rule.required || exists, detail: exists ? "present" : "missing" });
      if (!exists) return;
      checks.push({ name: rule.name + " type", passed: typeMatches(data[rule.name], rule.type), detail: rule.type || "any" });
      if (Array.isArray(rule.enum)) {
        checks.push({ name: rule.name + " enum", passed: rule.enum.indexOf(data[rule.name]) !== -1, detail: data[rule.name] });
      }
      if (rule.required && typeof data[rule.name] === "string") {
        checks.push({ name: rule.name + " non-empty", passed: data[rule.name].trim().length > 0, detail: data[rule.name] });
      }
    });
    return {
      valid: checks.every(function all(item) { return item.passed; }),
      contractId: definition.contractId,
      contractVersion: definition.version,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function initializeContracts() {
    const results = BUILT_IN_CONTRACTS.map(registerContract);
    const failed = results.filter(function find(item) { return !item.ok; });
    namespace.modules.contracts.status = failed.length === 0 ? "Ready" : "Blocked";
    return internal.buildResult(failed.length === 0, failed.length === 0 ? "REPOSITORY010_CONTRACTS_INITIALIZED" : "REPOSITORY010_CONTRACTS_INITIALIZATION_FAILED", failed.length === 0 ? "Ready" : "Blocked", { registered: listContractDefinitions().length, results: results });
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
    id: "REPOSITORY-010-CONTRACTS",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    builtInContractCount: BUILT_IN_CONTRACTS.length,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
