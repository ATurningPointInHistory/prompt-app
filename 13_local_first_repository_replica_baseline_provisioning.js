/* ============================================================
   FILE: 13_local_first_repository_replica_baseline_provisioning.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.16.0 / Module: Replica Baseline Provisioning 1.0.0
   Phase 17 / Decision-015
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Replica Baseline Provisioning blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("replicaBaselineProvisioning");
  const ANDROID_NODE_ID = "REPOSITORY010-ANDROID-VALIDATED-REPLICA";
  if (!(state.replicaBaselineReferences instanceof Map)) state.replicaBaselineReferences = new Map();
  if (!(state.replicaBaselineProvisionPackages instanceof Map)) state.replicaBaselineProvisionPackages = new Map();
  if (!(state.replicaBaselineProvisionEvidence instanceof Map)) state.replicaBaselineProvisionEvidence = new Map();

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function (key) { out[key] = stableValue(value[key]); });
    return out;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }
  async function sha256Text(value) {
    const bytes = new TextEncoder().encode(String(value == null ? "" : value));
    const digest = await global.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }
  function revisionSequence(value) {
    const match = String(value || "").match(/REPOSITORY010-CANONICAL-REVISION-(\d+)$/);
    return match ? Number(match[1]) : -1;
  }

  async function latestCanonicalBaseline() {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords("canonicalBaseline");
    const valid = (Array.isArray(list) ? list : []).filter(function (record) {
      return namespace.validateContract("canonicalBaselineDescriptor", record).valid === true && record.explicitlyEstablished === true;
    }).sort(function (a, b) { return revisionSequence(a.canonicalRevisionId) - revisionSequence(b.canonicalRevisionId); });
    return valid.length ? valid[valid.length - 1] : null;
  }

  async function latestReplicaReference() {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords("replicaBaselineReference");
    const valid = (Array.isArray(list) ? list : []).filter(function (record) {
      return namespace.validateContract("replicaBaselineReferenceDescriptor", record).valid === true && record.explicitlyProvisioned === true;
    }).sort(function (a, b) { return revisionSequence(a.canonicalRevisionId) - revisionSequence(b.canonicalRevisionId); });
    valid.forEach(function (record) { state.replicaBaselineReferences.set(record.replicaBaselineReferenceId, internal.deepFreeze(internal.clone(record))); });
    return valid.length ? internal.clone(valid[valid.length - 1]) : null;
  }

  async function recordByRevision(recordType, revisionId, idField) {
    const list = await namespace.listPersistedLocalFirstRepositoryRecords(recordType);
    const matches = (Array.isArray(list) ? list : []).filter(function (record) {
      return record && (record.revisionId === revisionId || record.canonicalRevisionId === revisionId);
    }).sort(function (a, b) {
      return String(a.promotedAt || a.hashGeneratedAt || a.createdAt || "").localeCompare(String(b.promotedAt || b.hashGeneratedAt || b.createdAt || ""));
    });
    if (!matches.length) return null;
    const selected = matches[matches.length - 1];
    return idField && !selected[idField] ? null : selected;
  }

  async function initializeProvisioning() {
    if (typeof namespace.initializeContracts === "function") namespace.initializeContracts();
    const persistence = await namespace.initializeLocalFirstRepositoryPersistence();
    if (!persistence || persistence.ok !== true) return persistence;
    const refs = await namespace.listPersistedLocalFirstRepositoryRecords("replicaBaselineReference");
    const packages = await namespace.listPersistedLocalFirstRepositoryRecords("replicaBaselineProvisionPackage");
    const evidence = await namespace.listPersistedLocalFirstRepositoryRecords("replicaBaselineProvisionEvidence");
    (refs || []).forEach(function (record) { if (namespace.validateContract("replicaBaselineReferenceDescriptor", record).valid) state.replicaBaselineReferences.set(record.replicaBaselineReferenceId, internal.deepFreeze(internal.clone(record))); });
    (packages || []).forEach(function (record) { if (namespace.validateContract("replicaBaselineProvisionPackageDescriptor", record).valid) state.replicaBaselineProvisionPackages.set(record.replicaBaselineProvisionPackageId, internal.deepFreeze(internal.clone(record))); });
    (evidence || []).forEach(function (record) { if (namespace.validateContract("replicaBaselineProvisionEvidenceDescriptor", record).valid) state.replicaBaselineProvisionEvidence.set(record.replicaBaselineProvisionEvidenceId, internal.deepFreeze(internal.clone(record))); });
    state.replicaBaselineProvisioningStatus = "Ready";
    internal.touch();
    return internal.buildResult(true, "REPOSITORY010_REPLICA_BASELINE_PROVISIONING_INITIALIZED", "Ready", { referenceCount: refs.length, packageCount: packages.length, evidenceCount: evidence.length, authorityEffect: "none" });
  }

  async function createProvisionPackage(options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const initialized = await initializeProvisioning();
    if (!initialized || initialized.ok !== true) return initialized;
    const baseline = await latestCanonicalBaseline();
    if (!baseline) return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_CANONICAL_BASELINE_REQUIRED", "Blocked", null);
    const revision = await namespace.getPersistedLocalFirstRepositoryRecord("revision", baseline.canonicalRevisionId);
    const integrity = await recordByRevision("integrityRecord", baseline.canonicalRevisionId, "integrityRecordId");
    const stateRecord = await recordByRevision("stateRecord", baseline.canonicalRevisionId, "stateRecordId");
    const promotionEvidence = await recordByRevision("baselinePromotionEvidence", baseline.canonicalRevisionId, "promotionEvidenceId");
    if (!revision || !integrity || !stateRecord || !promotionEvidence) {
      return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_LINEAGE_REQUIRED", "Blocked", { revision: Boolean(revision), integrity: Boolean(integrity), stateRecord: Boolean(stateRecord), promotionEvidence: Boolean(promotionEvidence) });
    }
    const targetReplicaNodeId = internal.text(opts.targetReplicaNodeId, ANDROID_NODE_ID);
    const reference = {
      replicaBaselineReferenceId: internal.text(opts.replicaBaselineReferenceId, "REPOSITORY010-REPLICA-BASELINE-REFERENCE-" + String(baseline.canonicalRevisionId).split("-").pop()),
      projectId: baseline.projectId,
      repositoryId: baseline.repositoryId,
      targetReplicaNodeId: targetReplicaNodeId,
      sourceCanonicalNodeId: baseline.sourceNodeId,
      sourceCanonicalBaselineDescriptorId: baseline.canonicalBaselineDescriptorId,
      canonicalRevisionId: baseline.canonicalRevisionId,
      canonicalIntegrityRecordId: integrity.integrityRecordId,
      promotionEvidenceId: promotionEvidence.promotionEvidenceId,
      manifestHash: baseline.manifestHash,
      scriptSetHash: baseline.scriptSetHash,
      scriptCount: baseline.scriptCount,
      repositoryStateHash: integrity.repositoryStateHash,
      integrityStatus: "verified",
      provisionedAt: internal.nowIso(),
      explicitUserTransfer: true,
      explicitlyProvisioned: true,
      identityGrantsAuthority: false,
      validationIsApproval: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      immutable: true
    };
    const refValidation = namespace.validateContract("replicaBaselineReferenceDescriptor", reference);
    if (!refValidation.valid) return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_REFERENCE_INVALID", "Blocked", { validation: refValidation });

    const packageRecord = {
      schema: "REPOSITORY-010-REPLICA-BASELINE-PROVISION-PACKAGE",
      version: "1.0.0",
      componentId: "REPOSITORY-010",
      replicaBaselineProvisionPackageId: internal.text(opts.replicaBaselineProvisionPackageId, internal.nextId("REPOSITORY010-REPLICA-BASELINE-PROVISION-PACKAGE")),
      projectId: baseline.projectId,
      repositoryId: baseline.repositoryId,
      sourceCanonicalNodeId: baseline.sourceNodeId,
      targetReplicaNodeId: targetReplicaNodeId,
      canonicalRevisionId: baseline.canonicalRevisionId,
      canonicalBaseline: internal.clone(baseline),
      revisionRecord: internal.clone(revision),
      integrityRecord: internal.clone(integrity),
      stateRecord: internal.clone(stateRecord),
      baselinePromotionEvidence: internal.clone(promotionEvidence),
      replicaBaselineReference: internal.clone(reference),
      packageHashAlgorithm: "SHA-256",
      packageHash: "",
      createdAt: internal.nowIso(),
      requiresUserAction: true,
      canonicalMutationRequested: false,
      automaticAcceptanceRequested: false,
      automaticPromotionRequested: false,
      githubReflectionRequested: false,
      authorityEffect: "none",
      immutable: true
    };
    const hashSource = internal.clone(packageRecord);
    delete hashSource.packageHash;
    packageRecord.packageHash = await sha256Text(stableStringify(hashSource));
    const validation = namespace.validateContract("replicaBaselineProvisionPackageDescriptor", packageRecord);
    if (!validation.valid) return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_PACKAGE_INVALID", "Blocked", { validation: validation });
    const saved = await namespace.persistLocalFirstRepositoryRecord("replicaBaselineProvisionPackage", packageRecord);
    if (!saved || saved.ok !== true) return saved;
    state.replicaBaselineProvisionPackages.set(packageRecord.replicaBaselineProvisionPackageId, internal.deepFreeze(internal.clone(packageRecord)));
    await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "replica-provision-started", sourceNodeId: baseline.sourceNodeId, targetNodeId: targetReplicaNodeId, revisionId: baseline.canonicalRevisionId, relatedRecordId: packageRecord.replicaBaselineProvisionPackageId, validationPassed: true, detail: { packageHash: packageRecord.packageHash, packagePrepared: true } });
    return internal.buildResult(true, "REPOSITORY010_REPLICA_BASELINE_PROVISION_PACKAGE_PREPARED", "Prepared", { provisionPackage: internal.clone(packageRecord), replicaBaselineReference: internal.clone(reference), authorityEffect: "none" });
  }

  function downloadJson(filename, record) {
    const blob = new Blob([JSON.stringify(record, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  async function downloadProvisionPackage(options) {
    const prepared = await createProvisionPackage(options);
    if (!prepared || prepared.ok !== true) return prepared;
    const pkg = prepared.data.provisionPackage;
    const filename = "REPOSITORY-010_REPLICA_BASELINE_" + pkg.canonicalRevisionId + "_" + pkg.replicaBaselineProvisionPackageId + ".json";
    downloadJson(filename, pkg);
    return internal.buildResult(true, "REPOSITORY010_REPLICA_BASELINE_PROVISION_PACKAGE_EXPORTED", "Exported", { provisionPackage: pkg, filename: filename, requiresPhysicalUserTransfer: true, authorityEffect: "none" });
  }

  async function validateProvisionPackage(packageInput) {
    const pkg = internal.isPlainObject(packageInput) ? internal.clone(packageInput) : null;
    if (!pkg) return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_PACKAGE_REQUIRED", "Blocked", null);
    const packageContract = namespace.validateContract("replicaBaselineProvisionPackageDescriptor", pkg);
    const nested = {
      canonicalBaseline: namespace.validateContract("canonicalBaselineDescriptor", pkg.canonicalBaseline || {}).valid === true,
      revision: namespace.validateContract("repositoryRevision", pkg.revisionRecord || {}).valid === true,
      integrity: namespace.validateContract("repositoryIntegrityRecord", pkg.integrityRecord || {}).valid === true,
      state: namespace.validateContract("repositoryStateRecord", pkg.stateRecord || {}).valid === true,
      promotionEvidence: namespace.validateContract("baselinePromotionEvidenceDescriptor", pkg.baselinePromotionEvidence || {}).valid === true,
      replicaReference: namespace.validateContract("replicaBaselineReferenceDescriptor", pkg.replicaBaselineReference || {}).valid === true
    };
    const hashSource = internal.clone(pkg);
    const expectedHash = hashSource.packageHash;
    delete hashSource.packageHash;
    const calculatedHash = await sha256Text(stableStringify(hashSource));
    const lineage = Boolean(
      pkg.canonicalBaseline && pkg.revisionRecord && pkg.integrityRecord && pkg.stateRecord && pkg.baselinePromotionEvidence && pkg.replicaBaselineReference &&
      pkg.canonicalRevisionId === pkg.canonicalBaseline.canonicalRevisionId &&
      pkg.canonicalRevisionId === pkg.revisionRecord.revisionId &&
      pkg.canonicalRevisionId === pkg.integrityRecord.revisionId &&
      pkg.canonicalRevisionId === pkg.stateRecord.revisionId &&
      pkg.canonicalRevisionId === pkg.baselinePromotionEvidence.canonicalRevisionId &&
      pkg.canonicalRevisionId === pkg.replicaBaselineReference.canonicalRevisionId &&
      pkg.canonicalBaseline.manifestHash === pkg.replicaBaselineReference.manifestHash &&
      pkg.canonicalBaseline.scriptSetHash === pkg.replicaBaselineReference.scriptSetHash &&
      Number(pkg.canonicalBaseline.scriptCount) === Number(pkg.replicaBaselineReference.scriptCount) &&
      pkg.integrityRecord.repositoryStateHash === pkg.replicaBaselineReference.repositoryStateHash &&
      pkg.targetReplicaNodeId === pkg.replicaBaselineReference.targetReplicaNodeId
    );
    const authoritySafe = pkg.requiresUserAction === true && pkg.canonicalMutationRequested === false && pkg.automaticAcceptanceRequested === false && pkg.automaticPromotionRequested === false && pkg.githubReflectionRequested === false && pkg.authorityEffect === "none";
    const nestedValid = Object.keys(nested).every(function (key) { return nested[key] === true; });
    const valid = packageContract.valid === true && nestedValid && calculatedHash === expectedHash && lineage && authoritySafe;
    return internal.buildResult(valid, valid ? "REPOSITORY010_REPLICA_PROVISION_PACKAGE_VERIFIED" : "REPOSITORY010_REPLICA_PROVISION_PACKAGE_INVALID", valid ? "Verified" : "Blocked", { packageContract: packageContract, nestedContracts: nested, packageHashVerified: calculatedHash === expectedHash, expectedPackageHash: expectedHash || null, calculatedPackageHash: calculatedHash, lineageVerified: lineage, authoritySafe: authoritySafe, canonicalRevisionId: pkg.canonicalRevisionId || null });
  }

  async function applyProvisionPackage(packageInput, options) {
    const opts = internal.isPlainObject(options) ? options : {};
    const initialized = await initializeProvisioning();
    if (!initialized || initialized.ok !== true) return initialized;
    const pkg = internal.isPlainObject(packageInput) ? internal.clone(packageInput) : null;
    const validation = await validateProvisionPackage(pkg);
    if (!validation || validation.ok !== true) return validation;
    const incomingSequence = revisionSequence(pkg.canonicalRevisionId);
    const existingReference = await latestReplicaReference();
    if (existingReference) {
      const currentSequence = revisionSequence(existingReference.canonicalRevisionId);
      if (incomingSequence < currentSequence) return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_STALE", "Blocked", { incomingRevisionId: pkg.canonicalRevisionId, currentRevisionId: existingReference.canonicalRevisionId });
      if (incomingSequence === currentSequence) {
        const same = stableStringify(existingReference) === stableStringify(pkg.replicaBaselineReference);
        if (!same) return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_SAME_REVISION_INTEGRITY_CONFLICT", "Blocked", { incomingRevisionId: pkg.canonicalRevisionId, currentReferenceId: existingReference.replicaBaselineReferenceId });
        return internal.buildResult(true, "REPOSITORY010_REPLICA_PROVISION_ALREADY_IDENTICAL", "Verified", { replicaBaselineReference: existingReference, idempotent: true, authorityEffect: "none" });
      }
    }

    const specs = [
      ["revision", pkg.revisionRecord, "revisionId"],
      ["integrityRecord", pkg.integrityRecord, "integrityRecordId"],
      ["stateRecord", pkg.stateRecord, "stateRecordId"],
      ["baselinePromotionEvidence", pkg.baselinePromotionEvidence, "promotionEvidenceId"],
      ["replicaBaselineProvisionPackage", pkg, "replicaBaselineProvisionPackageId"],
      ["replicaBaselineReference", pkg.replicaBaselineReference, "replicaBaselineReferenceId"]
    ];
    const newlyCreated = [];
    try {
      for (const spec of specs) {
        const recordType = spec[0], record = spec[1], idKey = spec[2], recordId = record[idKey];
        const existing = await namespace.getPersistedLocalFirstRepositoryRecord(recordType, recordId);
        if (existing) {
          if (stableStringify(existing) !== stableStringify(record)) throw new Error("Existing " + recordType + " differs from Provision Package.");
          continue;
        }
        const saved = await namespace.persistLocalFirstRepositoryRecord(recordType, record);
        if (!saved || saved.ok !== true) throw new Error("Persistence failed for " + recordType + ".");
        newlyCreated.push([recordType, recordId]);
      }
      const evidence = {
        replicaBaselineProvisionEvidenceId: internal.nextId("REPOSITORY010-REPLICA-BASELINE-PROVISION-EVIDENCE"),
        replicaBaselineProvisionPackageId: pkg.replicaBaselineProvisionPackageId,
        replicaBaselineReferenceId: pkg.replicaBaselineReference.replicaBaselineReferenceId,
        projectId: pkg.projectId,
        repositoryId: pkg.repositoryId,
        sourceCanonicalNodeId: pkg.sourceCanonicalNodeId,
        targetReplicaNodeId: pkg.targetReplicaNodeId,
        canonicalRevisionId: pkg.canonicalRevisionId,
        packageHash: pkg.packageHash,
        packageHashVerified: true,
        lineageVerified: true,
        staleProvisionBlocked: false,
        rollbackPerformed: false,
        explicitUserTransfer: opts.explicitUserTransfer !== false,
        validationIsApproval: false,
        mutationAuthorityGranted: false,
        canonicalMutationPerformed: false,
        automaticAcceptancePerformed: false,
        automaticPromotionPerformed: false,
        authorityEffect: "none",
        createdAt: internal.nowIso(),
        immutable: true
      };
      const evidenceValidation = namespace.validateContract("replicaBaselineProvisionEvidenceDescriptor", evidence);
      if (!evidenceValidation.valid) throw new Error("Provision Evidence contract validation failed.");
      const evidenceSaved = await namespace.persistLocalFirstRepositoryRecord("replicaBaselineProvisionEvidence", evidence);
      if (!evidenceSaved || evidenceSaved.ok !== true) throw new Error("Provision Evidence persistence failed.");
      newlyCreated.push(["replicaBaselineProvisionEvidence", evidence.replicaBaselineProvisionEvidenceId]);
      state.replicaBaselineReferences.set(pkg.replicaBaselineReference.replicaBaselineReferenceId, internal.deepFreeze(internal.clone(pkg.replicaBaselineReference)));
      state.replicaBaselineProvisionPackages.set(pkg.replicaBaselineProvisionPackageId, internal.deepFreeze(internal.clone(pkg)));
      state.replicaBaselineProvisionEvidence.set(evidence.replicaBaselineProvisionEvidenceId, internal.deepFreeze(internal.clone(evidence)));
      state.replicaBaselineProvisioningStatus = "Provisioned";
      internal.touch();
      if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function") await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "replica-provision-verified", sourceNodeId: pkg.sourceCanonicalNodeId, targetNodeId: pkg.targetReplicaNodeId, revisionId: pkg.canonicalRevisionId, relatedRecordId: evidence.replicaBaselineProvisionEvidenceId, validationPassed: true, detail: { packageHashVerified: true, lineageVerified: true, persistedRecordCount: specs.length + 1 } });
      return internal.buildResult(true, "REPOSITORY010_REPLICA_BASELINE_PROVISIONED", "Provisioned", { replicaBaselineReference: internal.clone(pkg.replicaBaselineReference), provisionEvidence: internal.clone(evidence), persistedRecordCount: specs.length + 1, rollbackPerformed: false, canonicalAuthorityGrantedToReplica: false, authorityEffect: "none" });
    } catch (error) {
      const rollback = [];
      for (let i = newlyCreated.length - 1; i >= 0; i -= 1) {
        const item = newlyCreated[i];
        const removed = await namespace.deletePersistedLocalFirstRepositoryRecord(item[0], item[1]);
        rollback.push({ recordType: item[0], recordId: item[1], deleted: Boolean(removed && removed.ok === true) });
      }
      const rollbackVerified = rollback.every(function (item) { return item.deleted; });
      if (typeof namespace.createLocalFirstRepositoryOperationalEvidence === "function") await namespace.createLocalFirstRepositoryOperationalEvidence({ evidenceType: "replica-provision-rollback", sourceNodeId: pkg && pkg.sourceCanonicalNodeId || null, targetNodeId: pkg && pkg.targetReplicaNodeId || null, revisionId: pkg && pkg.canonicalRevisionId || null, relatedRecordId: pkg && pkg.replicaBaselineProvisionPackageId || null, validationPassed: rollbackVerified, detail: { rollback: rollback, error: error && error.message ? error.message : String(error) } });
      state.replicaBaselineProvisioningStatus = rollbackVerified ? "Rolled Back" : "Recovery Required";
      internal.touch();
      return internal.buildResult(false, rollbackVerified ? "REPOSITORY010_REPLICA_PROVISION_ROLLED_BACK" : "REPOSITORY010_REPLICA_PROVISION_RECOVERY_REQUIRED", rollbackVerified ? "Blocked" : "Recovery Required", { rollbackPerformed: true, rollbackVerified: rollbackVerified, rollback: rollback }, { error: { message: error && error.message ? error.message : String(error), category: "Replica Baseline Provisioning" } });
    }
  }

  async function receiveProvisionFile(file, options) {
    let selected = file;
    if (!selected) {
      if (typeof global.showOpenFilePicker !== "function") return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_FILE_PICKER_UNAVAILABLE", "Blocked", null);
      const handles = await global.showOpenFilePicker({ multiple: false, types: [{ description: "REPOSITORY-010 Replica Baseline Provision", accept: { "application/json": [".json"] } }] });
      if (!handles || !handles.length) return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_FILE_REQUIRED", "Blocked", null);
      selected = await handles[0].getFile();
    }
    const text = await selected.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (error) { return internal.buildResult(false, "REPOSITORY010_REPLICA_PROVISION_JSON_INVALID", "Blocked", null, { error: { message: error.message, category: "Replica Baseline Provisioning" } }); }
    return applyProvisionPackage(parsed, Object.assign({}, options || {}, { explicitUserTransfer: true, sourceFileName: selected.name || null }));
  }

  async function listReplicaBaselineReferences() {
    await initializeProvisioning();
    const records = await namespace.listPersistedLocalFirstRepositoryRecords("replicaBaselineReference");
    return (records || []).sort(function (a, b) { return revisionSequence(a.canonicalRevisionId) - revisionSequence(b.canonicalRevisionId); });
  }

  async function getCurrentReplicaBaselineReference() { await initializeProvisioning(); return latestReplicaReference(); }

  function getProvisioningStatus() {
    return {
      status: state.replicaBaselineProvisioningStatus || "Ready",
      phase: 17,
      moduleVersion: MODULE_VERSION,
      referenceCount: state.replicaBaselineReferences instanceof Map ? state.replicaBaselineReferences.size : 0,
      packageCount: state.replicaBaselineProvisionPackages instanceof Map ? state.replicaBaselineProvisionPackages.size : 0,
      evidenceCount: state.replicaBaselineProvisionEvidence instanceof Map ? state.replicaBaselineProvisionEvidence.size : 0,
      replicaBaselineGrantsAuthority: false,
      automaticPromotionAllowed: false,
      canonicalMutationAuthority: false
    };
  }

  Object.assign(namespace.api, {
    initializeLocalFirstRepositoryReplicaBaselineProvisioning: initializeProvisioning,
    restoreLocalFirstRepositoryReplicaBaselineProvisioningRecords: initializeProvisioning,
    createLocalFirstRepositoryReplicaBaselineProvisionPackage: createProvisionPackage,
    downloadLocalFirstRepositoryReplicaBaselineProvisionPackage: downloadProvisionPackage,
    validateLocalFirstRepositoryReplicaBaselineProvisionPackage: validateProvisionPackage,
    applyLocalFirstRepositoryReplicaBaselineProvisionPackage: applyProvisionPackage,
    receiveLocalFirstRepositoryReplicaBaselineProvisionFile: receiveProvisionFile,
    listLocalFirstRepositoryReplicaBaselineReferences: listReplicaBaselineReferences,
    getCurrentLocalFirstRepositoryReplicaBaselineReference: getCurrentReplicaBaselineReference,
    getLocalFirstRepositoryReplicaBaselineProvisioningStatus: getProvisioningStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.replicaBaselineProvisioning = {
    id: "REPOSITORY-010-REPLICA-BASELINE-PROVISIONING",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 17,
    canonicalMutationAuthority: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
