/* ============================================================
   FILE: 13_knowledge_navigator_ide190_handoff.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: IDE-190 Handoff 1.0.0
   Phase 9: IDE-190 Navigation Package / Handoff
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 IDE-190 Handoff blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("ide190Handoff");
  const CONTRACT_VERSION = VERSION_MANIFEST.getContractVersion("ide190Handoff");
  const HANDOFF_VERSION = "1.0.0";

  if (!(state.ide190Handoffs instanceof Map)) state.ide190Handoffs = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestIDE190HandoffId")) state.latestIDE190HandoffId = null;

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function sortKey(key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  async function hashText(value) {
    if (global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function") {
      const bytes = new global.TextEncoder().encode(String(value == null ? "" : value));
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    }
    let hash = 2166136261; const source = String(value == null ? "" : value);
    for (let i = 0; i < source.length; i += 1) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  async function computeIntegrity(value) {
    const copy = internal.clone(value || {}); delete copy.integrity;
    const hash = await hashText(stableStringify(copy));
    return { algorithm: hash.length === 64 ? "SHA-256" : "FNV-1A-32", hash: hash };
  }

  async function buildIDE190HandoffContract(packageLike, options) {
    const settings = options && typeof options === "object" ? options : {};
    if (!packageLike || !packageLike.packageId) return internal.buildResult(false, "IDE190_HANDOFF_PACKAGE_REQUIRED", "Blocked", null);
    const packageValidation = await namespace.validateKnowledgeNavigatorPackage(packageLike);
    if (!packageValidation.valid) return internal.buildResult(false, "IDE190_HANDOFF_PACKAGE_INVALID", "Blocked", { validation: packageValidation });

    const now = internal.nowIso();
    const handoff = Object.assign({}, internal.clone(packageLike), {
      handoffId: internal.text(settings.handoffId, internal.nextId("IDE-180-TO-IDE-190")),
      handoffVersion: HANDOFF_VERSION,
      contractVersion: CONTRACT_VERSION,
      producer: { componentId: "IDE-180", version: VERSION_MANIFEST.release.version },
      consumer: { componentId: "IDE-190", minimumVersion: VERSION_MANIFEST.compatibility.minimumIDE190Version },
      status: packageLike.navigationStatus === "complete" ? "Ready" : "Partial",
      policy: {
        packageMutationAllowed: false,
        repositoryMutationAllowed: false,
        workflowExecutionAllowed: false,
        recommendationApplicationAllowed: false,
        factPromotionAllowed: false,
        archiveImportAllowed: false,
        missingSourceInferenceAllowed: false
      },
      loadingModel: ["Handoff Contract", "Package Integrity Validation", "Source Snapshot Validation", "Typed Navigation Read", "IDE-190 Controlled Workflow Decision"],
      createdAt: now,
      frozenAt: now,
      frozen: true,
      immutable: true
    });
    handoff.integrity = await computeIntegrity(handoff);
    const validation = await validateIDE190HandoffContract(handoff);
    if (!validation.valid) return internal.buildResult(false, "IDE190_HANDOFF_INVALID", "Blocked", { handoff: handoff, validation: validation });
    const frozen = internal.deepFreeze(internal.clone(handoff));
    state.ide190Handoffs.set(frozen.handoffId, frozen);
    state.latestIDE190HandoffId = frozen.handoffId;
    internal.touch();
    return internal.buildResult(true, "IDE190_HANDOFF_READY", frozen.status, { handoff: internal.clone(frozen), validation: validation });
  }

  async function validateIDE190HandoffContract(handoff) {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail) }); }
    check("Handoff exists", Boolean(handoff), handoff && handoff.handoffId);
    if (handoff) {
      const contract = namespace.validateContract("ide190Handoff", handoff);
      check("Frozen IDE-190 Contract validates", contract.valid === true, "failed=" + contract.failed);
      check("Handoff ID is present", Boolean(internal.text(handoff.handoffId, "")), handoff.handoffId);
      check("Handoff Version is 1.0.0", handoff.handoffVersion === HANDOFF_VERSION, handoff.handoffVersion);
      check("Contract Version matches", handoff.contractVersion === CONTRACT_VERSION, handoff.contractVersion);
      check("Consumer is IDE-190", handoff.consumer && handoff.consumer.componentId === "IDE-190", handoff.consumer && handoff.consumer.componentId);
      check("Minimum IDE-190 Version is declared", handoff.consumer && Boolean(handoff.consumer.minimumVersion), handoff.consumer && handoff.consumer.minimumVersion);
      check("Package mutation is prohibited", handoff.policy && handoff.policy.packageMutationAllowed === false, handoff.policy && handoff.policy.packageMutationAllowed);
      check("Repository mutation is prohibited", handoff.policy && handoff.policy.repositoryMutationAllowed === false, handoff.policy && handoff.policy.repositoryMutationAllowed);
      check("Workflow execution is prohibited", handoff.policy && handoff.policy.workflowExecutionAllowed === false, handoff.policy && handoff.policy.workflowExecutionAllowed);
      check("Fact promotion is prohibited", handoff.policy && handoff.policy.factPromotionAllowed === false, handoff.policy && handoff.policy.factPromotionAllowed);
      check("Archive import is prohibited", handoff.policy && handoff.policy.archiveImportAllowed === false, handoff.policy && handoff.policy.archiveImportAllowed);
      check("Missing Source inference is prohibited", handoff.policy && handoff.policy.missingSourceInferenceAllowed === false, handoff.policy && handoff.policy.missingSourceInferenceAllowed);
      check("Handoff is Frozen", handoff.frozen === true && handoff.immutable === true && Boolean(handoff.frozenAt), handoff.frozenAt);
      check("Runtime state is excluded", handoff.manifest && handoff.manifest.runtimeStateIncluded === false, handoff.manifest && handoff.manifest.runtimeStateIncluded);
      const expected = await computeIntegrity(handoff);
      check("Handoff Integrity is valid", Boolean(handoff.integrity && handoff.integrity.hash) && handoff.integrity.hash === expected.hash && handoff.integrity.algorithm === expected.algorithm, handoff.integrity && handoff.integrity.hash);
    }
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    return { id: internal.nextId("IDE-180-IDE190-HANDOFF-VALIDATION"), valid: failed === 0, status: failed === 0 ? "Valid" : "Invalid", passed: passed, failed: failed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0, checks: checks, validatedAt: internal.nowIso() };
  }

  function getIDE190Handoff(handoffId) { return internal.clone(state.ide190Handoffs.get(internal.text(handoffId, "")) || null); }
  function getLatestIDE190Handoff() { return state.latestIDE190HandoffId ? getIDE190Handoff(state.latestIDE190HandoffId) : null; }

  function getIDE190HandoffStatus() {
    const latest = state.latestIDE190HandoffId ? state.ide190Handoffs.get(state.latestIDE190HandoffId) : null;
    return {
      id: "IDE-180-IDE190-HANDOFF-STATUS",
      version: MODULE_VERSION,
      handoffVersion: HANDOFF_VERSION,
      contractVersion: CONTRACT_VERSION,
      status: namespace.modules.ide190Handoff && namespace.modules.ide190Handoff.status || "Loaded",
      handoffCount: state.ide190Handoffs.size,
      latestHandoffId: state.latestIDE190HandoffId,
      latestHandoffStatus: latest && latest.status || null,
      consumer: "IDE-190",
      minimumConsumerVersion: VERSION_MANIFEST.compatibility.minimumIDE190Version,
      mutationAllowed: false,
      readOnly: true
    };
  }

  function initializeIDE190Handoff() {
    namespace.modules.ide190Handoff.status = "Ready";
    return internal.buildResult(true, "IDE190_HANDOFF_INITIALIZED", "Ready", getIDE190HandoffStatus());
  }

  Object.assign(namespace.api, {
    initializeIDE190Handoff: initializeIDE190Handoff,
    buildIDE190HandoffContract: buildIDE190HandoffContract,
    validateIDE190HandoffContract: validateIDE190HandoffContract,
    getIDE190Handoff: getIDE190Handoff,
    getLatestIDE190Handoff: getLatestIDE190Handoff,
    getIDE190HandoffStatus: getIDE190HandoffStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.ide190Handoff = {
    id: "IDE-180-IDE190-HANDOFF",
    version: MODULE_VERSION,
    handoffVersion: HANDOFF_VERSION,
    contractVersion: CONTRACT_VERSION,
    status: "Loaded",
    phase: 9,
    consumer: "IDE-190",
    mutationAllowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
