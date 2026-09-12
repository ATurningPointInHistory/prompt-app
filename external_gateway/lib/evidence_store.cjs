"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

function sha256Buffer(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function sha256Text(text) { return sha256Buffer(Buffer.from(String(text == null ? "" : text), "utf8")); }
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const out = {};
  Object.keys(value).sort().forEach((key) => { out[key] = stableValue(value[key]); });
  return out;
}
function stableStringify(value) { return JSON.stringify(stableValue(value)); }
function safeId(value, pattern, name) {
  const text = String(value || "");
  if (!pattern.test(text)) { const e = new Error(`${name}_INVALID`); e.code = `${name}_INVALID`; e.status = 400; throw e; }
  return text;
}
function atomicWrite(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${randomUUID()}`);
  fs.writeFileSync(tmp, data, { flag: "wx" });
  try { fs.renameSync(tmp, file); }
  catch (error) {
    if (error && (error.code === "EEXIST" || error.code === "EPERM")) { try { fs.unlinkSync(tmp); } catch (_) {} }
    else { try { fs.unlinkSync(tmp); } catch (_) {}; throw error; }
  }
}

function createEvidenceStore(config, audit) {
  const root = config.evidenceStorageRoot;
  const contentRoot = path.join(root, "content", "sha256");
  const evidenceRoot = path.join(root, "evidence");
  const tempRoot = path.join(root, "tmp");
  fs.mkdirSync(contentRoot, { recursive: true });
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(tempRoot, { recursive: true });
  const dbPath = path.join(root, "metadata.sqlite");

  function initializeDatabase(database) {
    database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT OR REPLACE INTO schema_meta(key,value) VALUES ('databaseSchemaVersion','1.0.0');
      CREATE TABLE IF NOT EXISTS content_objects (
        content_hash TEXT PRIMARY KEY, content_id TEXT NOT NULL, size_bytes INTEGER NOT NULL,
        content_type TEXT NOT NULL, storage_class TEXT NOT NULL, storage_provider TEXT NOT NULL,
        storage_reference TEXT NOT NULL, integrity_state TEXT NOT NULL, created_at TEXT NOT NULL, verified_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS raw_evidence (
        raw_evidence_id TEXT PRIMARY KEY, content_hash TEXT NOT NULL, content_id TEXT NOT NULL,
        content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, raw_data_reference TEXT NOT NULL,
        storage_class TEXT NOT NULL, acquired_at TEXT NOT NULL, published_at TEXT,
        source_id TEXT NOT NULL, request_id TEXT NOT NULL, acquisition_status TEXT NOT NULL,
        schema_version TEXT NOT NULL, created_at TEXT NOT NULL, immutable INTEGER NOT NULL CHECK(immutable=1)
      );
      CREATE TABLE IF NOT EXISTS acquisition_evidence (
        evidence_id TEXT PRIMARY KEY, raw_evidence_id TEXT NOT NULL, request_id TEXT NOT NULL,
        source_id TEXT NOT NULL, source_version INTEGER NOT NULL, operation_id TEXT NOT NULL,
        adapter_id TEXT NOT NULL, adapter_version TEXT NOT NULL, access_mode TEXT NOT NULL,
        acquired_at TEXT NOT NULL, published_at TEXT, status TEXT NOT NULL, content_hash TEXT NOT NULL,
        content_type TEXT NOT NULL, attempt_count INTEGER NOT NULL, correlation_id TEXT,
        acquisition_plan_id TEXT, research_goal_id TEXT, response_id TEXT, attempt_id TEXT, route_id TEXT,
        runtime_version TEXT, gateway_version TEXT, schema_version TEXT NOT NULL, record_version INTEGER NOT NULL,
        record_hash TEXT NOT NULL, created_at TEXT NOT NULL, immutable INTEGER NOT NULL CHECK(immutable=1)
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_request ON acquisition_evidence(request_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_source_time ON acquisition_evidence(source_id, acquired_at);
      CREATE INDEX IF NOT EXISTS idx_evidence_content_hash ON acquisition_evidence(content_hash);
      CREATE TABLE IF NOT EXISTS processing_checkpoints (
        checkpoint_id TEXT PRIMARY KEY, content_hash TEXT NOT NULL, processor_id TEXT NOT NULL,
        processor_version TEXT NOT NULL, parameter_hash TEXT NOT NULL, processing_state TEXT NOT NULL,
        resume_cursor_json TEXT, supersedes_checkpoint_id TEXT, created_at TEXT NOT NULL,
        immutable INTEGER NOT NULL CHECK(immutable=1)
      );
      CREATE INDEX IF NOT EXISTS idx_checkpoint_input ON processing_checkpoints(content_hash, processor_id, processor_version, parameter_hash, created_at);
    `);
    return database;
  }

  function openDatabase(file) { return initializeDatabase(new DatabaseSync(file)); }
  let db = openDatabase(dbPath);

  function relativeContentReference(hash) { return path.posix.join("content", "sha256", hash.slice(0, 2), hash.slice(2, 4), hash); }
  function contentPath(hash) { return path.join(root, ...relativeContentReference(hash).split("/")); }
  function evidenceManifestPath(evidenceId) { return path.join(evidenceRoot, `${evidenceId}.json`); }
  function authorize(authority, action) {
    if (!authority || authority.action !== action || authority.allowed !== true || !authority.authorityEnvelopeId) {
      const e = new Error("BUSINESS_AUTHORITY_REVALIDATION_REQUIRED"); e.code = "BUSINESS_AUTHORITY_REVALIDATION_REQUIRED"; e.status = 403; throw e;
    }
  }

  function persistEvidence(payload) {
    const input = payload || {};
    authorize(input.authority, "PERSIST_EXTERNAL_EVIDENCE");
    const ev = input.acquisitionEvidence || {};
    const raw = input.rawEvidence || {};
    const suppliedContent = input.contentObject || {};
    const evidenceId = safeId(ev.evidenceId, /^EXTERNAL-010-EVIDENCE-[A-Z0-9-]+$/, "EVIDENCE_ID");
    const rawEvidenceId = safeId(raw.rawEvidenceId, /^EXTERNAL-010-RAW-[A-Z0-9-]+$/, "RAW_EVIDENCE_ID");
    if (db.prepare("SELECT evidence_id FROM acquisition_evidence WHERE evidence_id=?").get(evidenceId)) { const e = new Error("EVIDENCE_ALREADY_EXISTS"); e.code = "EVIDENCE_ALREADY_EXISTS"; e.status = 409; throw e; }
    const rawText = String(input.rawText == null ? "" : input.rawText);
    const bytes = Buffer.from(rawText, "utf8");
    const contentHash = sha256Buffer(bytes);
    if (ev.contentHash !== contentHash || raw.contentHash !== contentHash || suppliedContent.contentHash !== contentHash) { const e = new Error("CONTENT_HASH_MISMATCH"); e.code = "CONTENT_HASH_MISMATCH"; e.status = 409; throw e; }
    const target = contentPath(contentHash);
    let contentCreated = false;
    if (!fs.existsSync(target)) { atomicWrite(target, bytes); contentCreated = true; }
    const stored = fs.readFileSync(target);
    if (sha256Buffer(stored) !== contentHash) { const e = new Error("CONTENT_INTEGRITY_FAILED"); e.code = "CONTENT_INTEGRITY_FAILED"; e.status = 500; throw e; }
    const now = new Date().toISOString();
    const storageReference = relativeContentReference(contentHash);
    const contentObject = {
      contentId: `EXTERNAL-010-CONTENT-SHA256-${contentHash}`,
      contentHash, storageClass: "HOT", storageProvider: "LOCAL_CONTENT_ADDRESS_STORE",
      storageReference, sizeBytes: stored.byteLength,
      contentType: String(ev.contentType || raw.contentType || "application/octet-stream"),
      integrityState: "VERIFIED", createdAt: suppliedContent.createdAt || now, verifiedAt: now, immutable: true
    };
    const rawEvidence = Object.assign({}, raw, {
      contentId: contentObject.contentId, contentHash, contentType: contentObject.contentType,
      sizeBytes: contentObject.sizeBytes, rawDataReference: storageReference,
      storageClass: "HOT", schemaVersion: String(raw.schemaVersion || "1.0.0"), immutable: true
    });
    const acquisitionBase = Object.assign({}, ev, { contentHash, contentType: contentObject.contentType, rawEvidenceId, immutable: true });
    delete acquisitionBase.recordHash;
    const acquisitionEvidence = Object.assign({}, acquisitionBase, { recordHash: sha256Text(stableStringify(acquisitionBase)) });
    const manifest = {
      schemaVersion: "1.1.0", evidenceId, rawEvidenceId, contentHash, sourceId: acquisitionEvidence.sourceId,
      acquiredAt: acquisitionEvidence.acquiredAt, mediaType: contentObject.contentType, contentLocation: storageReference,
      recordHash: acquisitionEvidence.recordHash,
      recoveryMetadata: {
        contentObject: contentObject,
        rawEvidence: rawEvidence,
        acquisitionEvidence: acquisitionEvidence
      },
      credentialMaterialPresent: false,
      immutable: true
    };
    const manifestFile = evidenceManifestPath(evidenceId);
    atomicWrite(manifestFile, Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`INSERT OR IGNORE INTO content_objects(content_hash,content_id,size_bytes,content_type,storage_class,storage_provider,storage_reference,integrity_state,created_at,verified_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(contentHash, contentObject.contentId, contentObject.sizeBytes, contentObject.contentType, "HOT", contentObject.storageProvider, storageReference, "VERIFIED", contentObject.createdAt, now);
      db.prepare(`INSERT INTO raw_evidence(raw_evidence_id,content_hash,content_id,content_type,size_bytes,raw_data_reference,storage_class,acquired_at,published_at,source_id,request_id,acquisition_status,schema_version,created_at,immutable) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(rawEvidenceId, contentHash, contentObject.contentId, contentObject.contentType, contentObject.sizeBytes, storageReference, "HOT", rawEvidence.acquiredAt, rawEvidence.publishedAt || null, rawEvidence.sourceId, rawEvidence.requestId, rawEvidence.acquisitionStatus || "ACQUIRED", rawEvidence.schemaVersion, rawEvidence.createdAt);
      db.prepare(`INSERT INTO acquisition_evidence(evidence_id,raw_evidence_id,request_id,source_id,source_version,operation_id,adapter_id,adapter_version,access_mode,acquired_at,published_at,status,content_hash,content_type,attempt_count,correlation_id,acquisition_plan_id,research_goal_id,response_id,attempt_id,route_id,runtime_version,gateway_version,schema_version,record_version,record_hash,created_at,immutable) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(acquisitionEvidence.evidenceId, rawEvidenceId, acquisitionEvidence.requestId, acquisitionEvidence.sourceId, Number(acquisitionEvidence.sourceVersion) || 1, acquisitionEvidence.operationId, acquisitionEvidence.adapterId, acquisitionEvidence.adapterVersion, acquisitionEvidence.accessMode, acquisitionEvidence.acquiredAt, acquisitionEvidence.publishedAt || null, acquisitionEvidence.status, contentHash, contentObject.contentType, Number(acquisitionEvidence.attemptCount) || 1, acquisitionEvidence.correlationId || null, acquisitionEvidence.acquisitionPlanId || null, acquisitionEvidence.researchGoalId || null, acquisitionEvidence.responseId || null, acquisitionEvidence.attemptId || null, acquisitionEvidence.routeId || null, acquisitionEvidence.runtimeVersion || null, acquisitionEvidence.gatewayVersion || null, acquisitionEvidence.schemaVersion || "1.0.0", Number(acquisitionEvidence.recordVersion) || 1, acquisitionEvidence.recordHash, acquisitionEvidence.createdAt);
      db.exec("COMMIT");
    } catch (error) { try { db.exec("ROLLBACK"); } catch (_) {}; throw error; }
    audit.append("EVIDENCE_PERSISTED", "Succeeded", { evidenceId, rawEvidenceId, contentHash, contentCreated, storageClass: "HOT" });
    return { acquisitionEvidence, rawEvidence, contentObject, contentCreated, physicalContentDeduplicated: !contentCreated, metadataIndex: "SQLITE", recoveryManifestReference: path.posix.join("evidence", `${evidenceId}.json`), canonicalRepositoryMutationPerformed: false, knowledgePromotionPerformed: false };
  }

  function readEvidence(payload) {
    const input = payload || {};
    authorize(input.authority, "READ_EXTERNAL_EVIDENCE");
    const evidenceId = safeId(input.evidenceId, /^EXTERNAL-010-EVIDENCE-[A-Z0-9-]+$/, "EVIDENCE_ID");
    const row = db.prepare("SELECT * FROM acquisition_evidence WHERE evidence_id=?").get(evidenceId);
    if (!row) { const e = new Error("EVIDENCE_NOT_FOUND"); e.code = "EVIDENCE_NOT_FOUND"; e.status = 404; throw e; }
    const raw = db.prepare("SELECT * FROM raw_evidence WHERE raw_evidence_id=?").get(row.raw_evidence_id);
    const content = db.prepare("SELECT * FROM content_objects WHERE content_hash=?").get(row.content_hash);
    const file = content ? path.join(root, ...String(content.storage_reference).split("/")) : null;
    let integrityState = "MISSING_CONTENT";
    if (file && fs.existsSync(file)) integrityState = sha256Buffer(fs.readFileSync(file)) === row.content_hash ? "VERIFIED" : "CORRUPTED";
    const acquisitionEvidence = {
      evidenceId: row.evidence_id, rawEvidenceId: row.raw_evidence_id, requestId: row.request_id, sourceId: row.source_id, sourceVersion: row.source_version,
      operationId: row.operation_id, adapterId: row.adapter_id, adapterVersion: row.adapter_version, accessMode: row.access_mode, acquiredAt: row.acquired_at,
      publishedAt: row.published_at, status: row.status, contentHash: row.content_hash, contentType: row.content_type, attemptCount: row.attempt_count,
      correlationId: row.correlation_id, acquisitionPlanId: row.acquisition_plan_id, researchGoalId: row.research_goal_id, responseId: row.response_id,
      attemptId: row.attempt_id, routeId: row.route_id, runtimeVersion: row.runtime_version, gatewayVersion: row.gateway_version,
      schemaVersion: row.schema_version, recordVersion: row.record_version, recordHash: row.record_hash, createdAt: row.created_at, immutable: true
    };
    const rawEvidence = raw ? { rawEvidenceId: raw.raw_evidence_id, contentId: raw.content_id, contentHash: raw.content_hash, contentType: raw.content_type, sizeBytes: raw.size_bytes, rawDataReference: raw.raw_data_reference, storageClass: raw.storage_class, acquiredAt: raw.acquired_at, publishedAt: raw.published_at, sourceId: raw.source_id, requestId: raw.request_id, acquisitionStatus: raw.acquisition_status, schemaVersion: raw.schema_version, createdAt: raw.created_at, immutable: true } : null;
    const contentObject = content ? { contentId: content.content_id, contentHash: content.content_hash, storageClass: content.storage_class, storageProvider: content.storage_provider, storageReference: content.storage_reference, sizeBytes: content.size_bytes, contentType: content.content_type, integrityState, createdAt: content.created_at, verifiedAt: content.verified_at, immutable: true } : null;
    return { acquisitionEvidence, rawEvidence, contentObject, integrityState, contentAvailable: integrityState === "VERIFIED", metadataIndex: "SQLITE" };
  }

  function persistCheckpoint(payload) {
    const input = payload || {};
    authorize(input.authority, "PERSIST_EXTERNAL_PROCESSING_STATE");
    const c = input.checkpoint || {};
    safeId(c.checkpointId, /^EXTERNAL-010-PROCESSING-CHECKPOINT-[A-Z0-9-]+$/, "CHECKPOINT_ID");
    if (!/^[a-f0-9]{64}$/.test(String(c.contentHash || ""))) { const e = new Error("CONTENT_HASH_INVALID"); e.code = "CONTENT_HASH_INVALID"; e.status = 400; throw e; }
    db.prepare(`INSERT INTO processing_checkpoints(checkpoint_id,content_hash,processor_id,processor_version,parameter_hash,processing_state,resume_cursor_json,supersedes_checkpoint_id,created_at,immutable) VALUES (?,?,?,?,?,?,?,?,?,1)`).run(c.checkpointId, c.contentHash, c.processorId, c.processorVersion, c.parameterHash || "", c.processingState, c.resumeCursor == null ? null : JSON.stringify(c.resumeCursor), c.supersedesCheckpointId || null, c.createdAt);
    audit.append("PROCESSING_CHECKPOINT_PERSISTED", "Succeeded", { checkpointId: c.checkpointId, contentHash: c.contentHash, processorId: c.processorId, processingState: c.processingState });
    return { checkpoint: c, fullReprocessingRequired: false };
  }

  function integrityScan(payload) {
    authorize(payload && payload.authority, "READ_EXTERNAL_EVIDENCE");
    const contentRows = db.prepare("SELECT content_hash,storage_reference FROM content_objects").all();
    const missing = [];
    const corrupted = [];
    const indexed = new Set();
    for (const row of contentRows) {
      indexed.add(row.content_hash);
      const file = path.join(root, ...String(row.storage_reference).split("/"));
      if (!fs.existsSync(file)) missing.push(row.content_hash);
      else if (sha256Buffer(fs.readFileSync(file)) !== row.content_hash) corrupted.push(row.content_hash);
    }
    const orphan = [];
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/^[a-f0-9]{64}$/.test(entry.name) && !indexed.has(entry.name)) orphan.push(entry.name);
      }
    }
    walk(contentRoot);
    const counts = {
      contentObjectCount: db.prepare("SELECT COUNT(*) AS n FROM content_objects").get().n,
      rawEvidenceCount: db.prepare("SELECT COUNT(*) AS n FROM raw_evidence").get().n,
      acquisitionEvidenceCount: db.prepare("SELECT COUNT(*) AS n FROM acquisition_evidence").get().n,
      processingCheckpointCount: db.prepare("SELECT COUNT(*) AS n FROM processing_checkpoints").get().n
    };
    return { valid: missing.length === 0 && corrupted.length === 0, counts, missing, corrupted, orphan, orphanAutomaticDeletionPerformed: false, databaseSchemaVersion: db.prepare("SELECT value FROM schema_meta WHERE key='databaseSchemaVersion'").get().value, metadataIndex: "SQLITE", contentStore: "CONTENT_ADDRESSED_FILE_STORE" };
  }

  function contentInventory() {
    return db.prepare("SELECT content_hash,storage_reference,size_bytes,content_type,integrity_state FROM content_objects ORDER BY content_hash").all();
  }

  function evidenceManifestInventory() {
    if (!fs.existsSync(evidenceRoot)) return [];
    return fs.readdirSync(evidenceRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(evidenceRoot, entry.name));
  }

  function createMetadataSnapshot(targetPath) {
    const target = path.resolve(String(targetPath || ""));
    if (!target || target === dbPath) { const e = new Error("RECOVERY_SNAPSHOT_PATH_INVALID"); e.code = "RECOVERY_SNAPSHOT_PATH_INVALID"; throw e; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) fs.unlinkSync(target);
    try { db.exec("PRAGMA wal_checkpoint(FULL)"); } catch (_) {}
    const escaped = target.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${escaped}'`);
    const bytes = fs.readFileSync(target);
    return { path: target, sha256: sha256Buffer(bytes), sizeBytes: bytes.byteLength, databaseSchemaVersion: db.prepare("SELECT value FROM schema_meta WHERE key='databaseSchemaVersion'").get().value };
  }

  function validateMetadataSnapshot(snapshotPath) {
    const file = path.resolve(String(snapshotPath || ""));
    if (!fs.existsSync(file)) return { valid: false, code: "METADATA_SNAPSHOT_MISSING" };
    let probe = null;
    try {
      probe = new DatabaseSync(file, { readOnly: true });
      const check = probe.prepare("PRAGMA integrity_check").get();
      const version = probe.prepare("SELECT value FROM schema_meta WHERE key='databaseSchemaVersion'").get();
      return { valid: check && String(check.integrity_check || Object.values(check)[0]).toLowerCase() === "ok", integrityCheck: check, databaseSchemaVersion: version && version.value || null, sha256: sha256Buffer(fs.readFileSync(file)) };
    } catch (error) { return { valid: false, code: "METADATA_SNAPSHOT_INVALID", message: error && error.message || String(error) }; }
    finally { try { if (probe) probe.close(); } catch (_) {} }
  }

  function replaceMetadataFromSnapshot(snapshotPath) {
    const source = path.resolve(String(snapshotPath || ""));
    const validation = validateMetadataSnapshot(source);
    if (!validation.valid) { const e = new Error("METADATA_SNAPSHOT_INVALID"); e.code = "METADATA_SNAPSHOT_INVALID"; e.validation = validation; throw e; }
    const previous = `${dbPath}.pre-recovery-${Date.now()}-${randomUUID()}`;
    const staged = `${dbPath}.recovery-staged-${randomUUID()}`;
    try { db.close(); } catch (_) {}
    try {
      for (const suffix of ["-wal", "-shm"]) { try { if (fs.existsSync(dbPath + suffix)) fs.unlinkSync(dbPath + suffix); } catch (_) {} }
      fs.copyFileSync(source, staged);
      if (fs.existsSync(dbPath)) fs.renameSync(dbPath, previous);
      fs.renameSync(staged, dbPath);
      db = openDatabase(dbPath);
      const post = db.prepare("PRAGMA integrity_check").get();
      const ok = post && String(post.integrity_check || Object.values(post)[0]).toLowerCase() === "ok";
      if (!ok) throw new Error("RESTORED_METADATA_INTEGRITY_FAILED");
      try { if (fs.existsSync(previous)) fs.unlinkSync(previous); } catch (_) {}
      return { restored: true, integrityCheck: post, sourceSnapshotSha256: validation.sha256 };
    } catch (error) {
      try { if (db) db.close(); } catch (_) {}
      try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (_) {}
      try { if (fs.existsSync(previous)) fs.renameSync(previous, dbPath); } catch (_) {}
      try { if (fs.existsSync(staged)) fs.unlinkSync(staged); } catch (_) {}
      db = openDatabase(dbPath);
      throw error;
    }
  }

  function inspectMetadataRebuild() {
    const files = evidenceManifestInventory();
    let rebuildableCount = 0, legacyInsufficientCount = 0, invalidManifestCount = 0;
    for (const file of files) {
      try {
        const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
        if (manifest && manifest.recoveryMetadata && manifest.recoveryMetadata.acquisitionEvidence && manifest.recoveryMetadata.rawEvidence && manifest.recoveryMetadata.contentObject) rebuildableCount += 1;
        else legacyInsufficientCount += 1;
      } catch (_) { invalidManifestCount += 1; }
    }
    return { manifestCount: files.length, rebuildableCount, legacyInsufficientCount, invalidManifestCount, automaticRebuildPerformed: false, fullRebuildPossible: files.length > 0 && legacyInsufficientCount === 0 && invalidManifestCount === 0 };
  }

  function internalIntegrityScan() {
    const authority = { action: "READ_EXTERNAL_EVIDENCE", allowed: true, authorityEnvelopeId: "INTERNAL-RECOVERY-INTEGRITY" };
    return integrityScan({ authority });
  }

  function close() { try { db.close(); } catch (_) {} }
  function details() { return { metadataIndex: "SQLITE", databaseSchemaVersion: "1.0.0", contentStore: "CONTENT_ADDRESSED_FILE_STORE", hashAlgorithm: "SHA-256", storageRootConfigured: true, storageRootExposed: false, recoveryMetadataManifestVersion: "1.1.0" }; }
  return { persistEvidence, readEvidence, persistCheckpoint, integrityScan, internalIntegrityScan, contentInventory, evidenceManifestInventory, createMetadataSnapshot, validateMetadataSnapshot, replaceMetadataFromSnapshot, inspectMetadataRebuild, contentPath, evidenceRoot, details, close, root, dbPath };
}

module.exports = { createEvidenceStore, sha256Text, stableStringify };
