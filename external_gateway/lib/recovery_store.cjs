"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");

function sha256Buffer(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const out = {};
  Object.keys(value).sort().forEach((key) => { out[key] = stableValue(value[key]); });
  return out;
}
function stableStringify(value) { return JSON.stringify(stableValue(value)); }
function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.tmp-${process.pid}-${randomUUID()}`);
  const previous = path.join(path.dirname(file), `.previous-${process.pid}-${randomUUID()}`);
  fs.writeFileSync(tmp, data, { flag: "wx" });
  if (!fs.existsSync(file)) { fs.renameSync(tmp, file); return; }
  fs.renameSync(file, previous);
  try {
    fs.renameSync(tmp, file);
    try { fs.unlinkSync(previous); } catch (_) {}
  } catch (error) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
    try { fs.renameSync(previous, file); } catch (_) {}
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    throw error;
  }
}
function copyVerified(source, target, expectedHash) {
  const bytes = fs.readFileSync(source);
  const hash = sha256Buffer(bytes);
  if (expectedHash && hash !== expectedHash) {
    const e = new Error("RECOVERY_SOURCE_HASH_MISMATCH"); e.code = "RECOVERY_SOURCE_HASH_MISMATCH"; throw e;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) atomicWrite(target, bytes);
  const stored = fs.readFileSync(target);
  const storedHash = sha256Buffer(stored);
  if (storedHash !== hash) { const e = new Error("RECOVERY_BACKUP_HASH_MISMATCH"); e.code = "RECOVERY_BACKUP_HASH_MISMATCH"; throw e; }
  return { hash, sizeBytes: stored.byteLength };
}
function safeRecoveryPointId(value) {
  const text = String(value || "");
  if (!/^EXTERNAL-010-RECOVERY-POINT-[A-Z0-9._-]+$/i.test(text)) {
    const e = new Error("RECOVERY_POINT_ID_INVALID"); e.code = "RECOVERY_POINT_ID_INVALID"; e.status = 400; throw e;
  }
  return text;
}

function createRecoveryStore(config, runtime, audit, evidenceStore) {
  const root = path.join(config.evidenceStorageRoot, "recovery");
  const pointsRoot = path.join(root, "points");
  const backupContentRoot = path.join(root, "content", "sha256");
  const catalogPath = path.join(root, "catalog.json");
  fs.mkdirSync(pointsRoot, { recursive: true });
  fs.mkdirSync(backupContentRoot, { recursive: true });

  function defaultCatalog() {
    return { schemaVersion: "1.0.0", recoveryEpoch: `RECOVERY-EPOCH-0-${randomUUID()}`, epochSequence: 0, points: [], updatedAt: new Date().toISOString(), credentialMaterialPresent: false };
  }
  function loadCatalog() {
    if (!fs.existsSync(catalogPath)) {
      const initial = defaultCatalog();
      atomicWrite(catalogPath, Buffer.from(JSON.stringify(initial, null, 2), "utf8"));
      return initial;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
      if (!parsed || !Array.isArray(parsed.points) || !parsed.recoveryEpoch) throw new Error("INVALID_CATALOG");
      parsed.credentialMaterialPresent = false;
      return parsed;
    } catch (error) {
      const e = new Error("RECOVERY_CATALOG_CORRUPTED"); e.code = "RECOVERY_CATALOG_CORRUPTED"; e.status = 500; e.cause = error; throw e;
    }
  }
  function saveCatalog(catalog) {
    catalog.updatedAt = new Date().toISOString();
    catalog.credentialMaterialPresent = false;
    atomicWrite(catalogPath, Buffer.from(JSON.stringify(catalog, null, 2), "utf8"));
  }
  function authorize(authority, action) {
    if (!authority || authority.action !== action || authority.allowed !== true || !authority.authorityEnvelopeId) {
      const e = new Error("RECOVERY_AUTHORITY_REVALIDATION_REQUIRED"); e.code = "RECOVERY_AUTHORITY_REVALIDATION_REQUIRED"; e.status = 403; throw e;
    }
  }
  function pointDir(id) { return path.join(pointsRoot, safeRecoveryPointId(id)); }
  function manifestPath(id) { return path.join(pointDir(id), "manifest.json"); }
  function backupContentPath(hash) { return path.join(backupContentRoot, hash.slice(0, 2), hash.slice(2, 4), hash); }
  function loadManifest(id) {
    const file = manifestPath(id);
    if (!fs.existsSync(file)) { const e = new Error("RECOVERY_POINT_NOT_FOUND"); e.code = "RECOVERY_POINT_NOT_FOUND"; e.status = 404; throw e; }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  let catalog = loadCatalog();
  if (typeof runtime.setRecoveryEpoch === "function") runtime.setRecoveryEpoch(catalog.recoveryEpoch);

  function createRecoveryPoint(payload) {
    const input = payload || {};
    authorize(input.authority, "CREATE_RECOVERY_POINT");
    const recoveryPointId = safeRecoveryPointId(input.recoveryPointId || `EXTERNAL-010-RECOVERY-POINT-${Date.now().toString(36).toUpperCase()}-${randomUUID()}`);
    if (fs.existsSync(pointDir(recoveryPointId))) { const e = new Error("RECOVERY_POINT_ALREADY_EXISTS"); e.code = "RECOVERY_POINT_ALREADY_EXISTS"; e.status = 409; throw e; }
    const recoveryPointType = String(input.recoveryPointType || "CHECKPOINT").toUpperCase();
    const allowedTypes = new Set(["FULL", "INCREMENTAL", "CHECKPOINT", "PRE_MIGRATION", "PRE_UPGRADE", "PRE_MAJOR_IMPORT", "MANUAL_OWNER_BACKUP", "EMERGENCY_BACKUP"]);
    if (!allowedTypes.has(recoveryPointType)) { const e = new Error("RECOVERY_POINT_TYPE_INVALID"); e.code = "RECOVERY_POINT_TYPE_INVALID"; e.status = 400; throw e; }

    const createdAt = new Date().toISOString();
    const dir = pointDir(recoveryPointId);
    fs.mkdirSync(dir, { recursive: false });
    const currentIntegrity = evidenceStore.internalIntegrityScan();
    const metadataSnapshot = evidenceStore.createMetadataSnapshot(path.join(dir, "metadata.sqlite"));
    const contentEntries = [];
    for (const row of evidenceStore.contentInventory()) {
      const hash = String(row.content_hash);
      const live = evidenceStore.contentPath(hash);
      const backup = backupContentPath(hash);
      const reused = fs.existsSync(backup);
      if (!fs.existsSync(live)) {
        contentEntries.push({ contentHash: hash, state: "CONTENT_MISSING", backupReference: null, reused: false });
        continue;
      }
      try {
        copyVerified(live, backup, hash);
        contentEntries.push({ contentHash: hash, state: "VERIFIED", backupReference: path.relative(root, backup).replace(/\\/g, "/"), reused });
      } catch (error) {
        contentEntries.push({ contentHash: hash, state: "CONTENT_CORRUPTED", backupReference: null, reused: false, reason: error.code || "HASH_MISMATCH" });
      }
    }

    const sourceManifests = evidenceStore.evidenceManifestInventory();
    const evidenceManifestEntries = [];
    const manifestBackupDir = path.join(dir, "evidence-manifests");
    fs.mkdirSync(manifestBackupDir, { recursive: true });
    for (const source of sourceManifests) {
      const name = path.basename(source);
      const target = path.join(manifestBackupDir, name);
      const bytes = fs.readFileSync(source);
      const hash = sha256Buffer(bytes);
      atomicWrite(target, bytes);
      evidenceManifestEntries.push({ name, sha256: hash, reference: path.posix.join("evidence-manifests", name) });
    }

    const rebuild = evidenceStore.inspectMetadataRebuild();
    const damagedContent = contentEntries.filter((entry) => entry.state !== "VERIFIED");
    const recoveryPointState = damagedContent.length || currentIntegrity.missing.length || currentIntegrity.corrupted.length ? "PARTIAL" : "VALID";
    const manifestBase = {
      schemaVersion: "1.0.0",
      recoveryPointId,
      recoveryPointType,
      createdAt,
      recoveryPointState,
      applicationConsistentSnapshot: true,
      metadataSnapshot: { reference: "metadata.sqlite", sha256: metadataSnapshot.sha256, sizeBytes: metadataSnapshot.sizeBytes, databaseSchemaVersion: metadataSnapshot.databaseSchemaVersion },
      incrementalContentManifest: contentEntries,
      evidenceManifestEntries,
      currentIntegrityAtSnapshot: currentIntegrity,
      metadataRebuildAssessment: rebuild,
      runtimeProfile: {
        runtimeInstanceId: runtime.runtime.runtimeInstanceId,
        runtimeVersion: runtime.runtime.runtimeVersion,
        startupEpoch: runtime.runtime.startupEpoch,
        recoveryEpoch: runtime.runtime.recoveryEpoch,
        sessionRecordsIncluded: false,
        sessionCredentialsIncluded: false
      },
      queueSnapshot: input.queueSnapshot || { state: "NOT_SUPPLIED", restoredRunningWorkBecomesActive: false },
      watchSnapshot: input.watchSnapshot || { state: "NOT_SUPPLIED", overdueAutoCatchupAllowed: false },
      policyProfile: input.policyProfile || { state: "REQUIRES_RECONCILIATION_ON_RESTORE" },
      retentionProfile: input.retentionProfile || { state: "REQUIRES_RECONCILIATION_ON_RESTORE" },
      privacyProfile: input.privacyProfile || { state: "REQUIRES_RECONCILIATION_ON_RESTORE" },
      secretValuesIncluded: false,
      gatewaySessionTokensIncluded: false,
      credentialMaterialPresent: false,
      filesRestoredEqualsPlatformReady: false,
      backupExistsEqualsRecoveryProven: false,
      immutable: true
    };
    const manifestHash = sha256Buffer(Buffer.from(stableStringify(manifestBase), "utf8"));
    const manifest = Object.assign({}, manifestBase, { manifestHash });
    atomicWrite(manifestPath(recoveryPointId), Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
    catalog.points.push({ recoveryPointId, recoveryPointType, createdAt, recoveryPointState, manifestHash, credentialMaterialPresent: false });
    saveCatalog(catalog);
    audit.append("RECOVERY_POINT_CREATED", recoveryPointState, { recoveryPointId, recoveryPointType, recoveryPointState, manifestHash, credentialMaterialPresent: false, sessionCredentialsIncluded: false });
    return { recoveryPoint: manifest, recoveryPointState, physicalBackupCreated: true, contentAddressedIncrementalBackup: true, credentialMaterialPresent: false };
  }

  function listRecoveryPoints(payload) {
    authorize(payload && payload.authority, "READ_RECOVERY_POINT");
    return { recoveryEpoch: catalog.recoveryEpoch, points: catalog.points.map((item) => Object.assign({}, item)), credentialMaterialPresent: false };
  }

  function validateRecoveryPoint(payload) {
    const input = payload || {};
    authorize(input.authority, "READ_RECOVERY_POINT");
    const id = safeRecoveryPointId(input.recoveryPointId);
    const manifest = loadManifest(id);
    const manifestCopy = Object.assign({}, manifest);
    delete manifestCopy.manifestHash;
    const computedManifestHash = sha256Buffer(Buffer.from(stableStringify(manifestCopy), "utf8"));
    const metadataFile = path.join(pointDir(id), String(manifest.metadataSnapshot && manifest.metadataSnapshot.reference || "metadata.sqlite"));
    const metadataValidation = evidenceStore.validateMetadataSnapshot(metadataFile);
    const contentMissing = [], contentCorrupted = [];
    for (const entry of manifest.incrementalContentManifest || []) {
      if (!entry.backupReference) { contentMissing.push(entry.contentHash); continue; }
      const backup = path.join(root, ...String(entry.backupReference).split("/"));
      if (!fs.existsSync(backup)) contentMissing.push(entry.contentHash);
      else if (sha256Buffer(fs.readFileSync(backup)) !== entry.contentHash) contentCorrupted.push(entry.contentHash);
    }
    const evidenceManifestCorrupted = [];
    for (const entry of manifest.evidenceManifestEntries || []) {
      const file = path.join(pointDir(id), ...String(entry.reference).split("/"));
      if (!fs.existsSync(file) || sha256Buffer(fs.readFileSync(file)) !== entry.sha256) evidenceManifestCorrupted.push(entry.name);
    }
    const secretBoundaryPass = manifest.secretValuesIncluded === false && manifest.gatewaySessionTokensIncluded === false && manifest.credentialMaterialPresent === false && manifest.runtimeProfile && manifest.runtimeProfile.sessionCredentialsIncluded === false;
    const valid = computedManifestHash === manifest.manifestHash && metadataValidation.valid === true && contentMissing.length === 0 && contentCorrupted.length === 0 && evidenceManifestCorrupted.length === 0 && secretBoundaryPass;
    const result = {
      recoveryPointId: id, valid, manifestHashValid: computedManifestHash === manifest.manifestHash,
      metadataValidation, contentMissing, contentCorrupted, evidenceManifestCorrupted,
      secretBoundaryPass, sensitiveMaterialExcluded: secretBoundaryPass, backupExistsEqualsRecoveryProven: false,
      validationState: valid ? "PASS" : "FAIL", validatedAt: new Date().toISOString()
    };
    audit.append("RECOVERY_POINT_VALIDATED", valid ? "PASS" : "FAIL", { recoveryPointId: id, valid, secretBoundaryPass, contentMissing: contentMissing.length, contentCorrupted: contentCorrupted.length });
    return result;
  }

  function restoreRecoveryPoint(payload) {
    const input = payload || {};
    authorize(input.authority, "RESTORE_RECOVERY_POINT");
    const id = safeRecoveryPointId(input.recoveryPointId);
    const readAuthority = { action: "READ_RECOVERY_POINT", allowed: true, authorityEnvelopeId: input.authority.authorityEnvelopeId };
    const validation = validateRecoveryPoint({ recoveryPointId: id, authority: readAuthority });
    const drillOnly = String(input.mode || "DRILL").toUpperCase() !== "ACTIVATE";
    if (!validation.valid) {
      return { restored: false, drillOnly, recoveryPointId: id, state: "BLOCKED", validation, platformReady: false, partialRecovery: false, recoveryEpochChanged: false, sessionInvalidationRequired: false };
    }
    const manifest = loadManifest(id);
    if (drillOnly) {
      const result = { restored: false, drillOnly: true, recoveryPointId: id, state: "RESTORE_DRILL_PASS", validation, platformReady: false, partialRecovery: false, recoveryEpochChanged: false, sessionInvalidationRequired: false, filesRestoredEqualsPlatformReady: false };
      audit.append("RECOVERY_RESTORE_DRILL", "PASS", { recoveryPointId: id, platformReady: false, canonicalMutationPerformed: false });
      return result;
    }

    const restoredContent = [];
    for (const entry of manifest.incrementalContentManifest || []) {
      if (!entry.backupReference) continue;
      const backup = path.join(root, ...String(entry.backupReference).split("/"));
      const live = evidenceStore.contentPath(entry.contentHash);
      let needsRestore = true;
      if (fs.existsSync(live)) {
        try { needsRestore = sha256Buffer(fs.readFileSync(live)) !== entry.contentHash; } catch (_) { needsRestore = true; }
      }
      if (needsRestore) {
        fs.mkdirSync(path.dirname(live), { recursive: true });
        const staged = `${live}.recovery-${randomUUID()}`;
        fs.copyFileSync(backup, staged);
        if (fs.existsSync(live)) fs.unlinkSync(live);
        fs.renameSync(staged, live);
        restoredContent.push(entry.contentHash);
      }
    }
    const metadataFile = path.join(pointDir(id), String(manifest.metadataSnapshot.reference || "metadata.sqlite"));
    const metadataRestore = evidenceStore.replaceMetadataFromSnapshot(metadataFile);
    catalog.epochSequence = Number(catalog.epochSequence || 0) + 1;
    catalog.recoveryEpoch = `RECOVERY-EPOCH-${catalog.epochSequence}-${randomUUID()}`;
    saveCatalog(catalog);
    if (typeof runtime.setRecoveryEpoch === "function") runtime.setRecoveryEpoch(catalog.recoveryEpoch);
    const currentIntegrity = evidenceStore.internalIntegrityScan();
    const physicalIntegrityPass = currentIntegrity.valid === true;
    const result = {
      restored: true, drillOnly: false, recoveryPointId: id,
      state: physicalIntegrityPass ? "RESTORED_PENDING_POLICY_CHECK" : "PARTIAL_RECOVERY",
      validation, metadataRestore, restoredContent,
      currentIntegrity, platformReady: false,
      partialRecovery: !physicalIntegrityPass,
      recoveryEpoch: catalog.recoveryEpoch,
      recoveryEpochChanged: true,
      sessionInvalidationRequired: true,
      restoredSessionRecordBecomesCurrentAuthentication: false,
      secretReconstructionPerformed: false,
      policyReconciliationRequired: true,
      queueReconciliationRequired: true,
      watchReconciliationRequired: true,
      filesRestoredEqualsPlatformReady: false
    };
    audit.append("RECOVERY_RESTORE_PHYSICAL_COMPLETE", result.state, { recoveryPointId: id, recoveryEpoch: catalog.recoveryEpoch, platformReady: false, sessionInvalidationRequired: true, secretReconstructionPerformed: false });
    return result;
  }

  function metadataRebuildAssessment(payload) {
    authorize(payload && payload.authority, "READ_RECOVERY_POINT");
    return evidenceStore.inspectMetadataRebuild();
  }

  function currentRecoveryState() {
    return { recoveryEpoch: catalog.recoveryEpoch, recoveryPointCount: catalog.points.length, credentialMaterialPresent: false, restoredSessionRecordBecomesCurrentAuthentication: false };
  }

  return { createRecoveryPoint, listRecoveryPoints, validateRecoveryPoint, restoreRecoveryPoint, metadataRebuildAssessment, currentRecoveryState, root, catalogPath };
}

module.exports = { createRecoveryStore };
