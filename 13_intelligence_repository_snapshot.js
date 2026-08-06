/* ============================================================
   FILE: 13_intelligence_repository_snapshot.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Phase: 3 Repository Snapshot
   Design Freeze: v1.0.0 / 2026-08-06
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Repository Snapshot blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.6.0";
  const CAPABILITY_ID = "IDE-170-REPOSITORY-SNAPSHOT";
  const HASH_ALGORITHM = "SHA-256";
  const MAX_CHAIN_DEPTH = 100;
  const MAX_RENAME_CANDIDATES = 500;
  const SNAPSHOT_TYPES = Object.freeze(["baseline", "incremental"]);
  const SNAPSHOT_STATUSES = Object.freeze([
    "Draft", "Validating", "Ready", "Partial", "Invalid",
    "Frozen", "Superseded", "Blocked"
  ]);
  const CHANGE_TYPES = Object.freeze([
    "Added", "Modified", "Removed", "Unchanged"
  ]);
  const STATE_COLLECTIONS = Object.freeze([
    "projects",
    "files",
    "functions",
    "modules",
    "configurations",
    "architectureObjects",
    "qualityRecords",
    "workflowRecords",
    "changeRecords",
    "otherRecords"
  ]);

  if (!(state.repositorySnapshots instanceof Map)) state.repositorySnapshots = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestRepositorySnapshotId")) {
    state.latestRepositorySnapshotId = null;
  }
  if (!Object.prototype.hasOwnProperty.call(state, "latestRepositoryBaselineId")) {
    state.latestRepositoryBaselineId = null;
  }

  const SHA256_CONSTANTS = Object.freeze([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function rotateRight(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  function utf8Bytes(input) {
    const value = String(input == null ? "" : input);
    if (typeof TextEncoder !== "undefined") {
      return Array.from(new TextEncoder().encode(value));
    }
    const encoded = unescape(encodeURIComponent(value));
    const bytes = [];
    for (let index = 0; index < encoded.length; index += 1) {
      bytes.push(encoded.charCodeAt(index));
    }
    return bytes;
  }

  function sha256Hex(input) {
    const bytes = utf8Bytes(input);
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    bytes.push(
      (high >>> 24) & 0xff,
      (high >>> 16) & 0xff,
      (high >>> 8) & 0xff,
      high & 0xff,
      (low >>> 24) & 0xff,
      (low >>> 16) & 0xff,
      (low >>> 8) & 0xff,
      low & 0xff
    );

    const hash = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const words = new Array(64);

    for (let offset = 0; offset < bytes.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) {
        const position = offset + (index * 4);
        words[index] = (
          (bytes[position] << 24) |
          (bytes[position + 1] << 16) |
          (bytes[position + 2] << 8) |
          bytes[position + 3]
        ) >>> 0;
      }
      for (let index = 16; index < 64; index += 1) {
        const value15 = words[index - 15];
        const value2 = words[index - 2];
        const sigma0 = rotateRight(value15, 7) ^ rotateRight(value15, 18) ^ (value15 >>> 3);
        const sigma1 = rotateRight(value2, 17) ^ rotateRight(value2, 19) ^ (value2 >>> 10);
        words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
      }

      let a = hash[0];
      let b = hash[1];
      let c = hash[2];
      let d = hash[3];
      let e = hash[4];
      let f = hash[5];
      let g = hash[6];
      let h = hash[7];

      for (let index = 0; index < 64; index += 1) {
        const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choice = (e & f) ^ ((~e) & g);
        const temporary1 = (h + sigma1 + choice + SHA256_CONSTANTS[index] + words[index]) >>> 0;
        const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temporary2 = (sigma0 + majority) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temporary1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temporary1 + temporary2) >>> 0;
      }

      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }

    return hash.map(function toHex(value) {
      return ("00000000" + value.toString(16)).slice(-8);
    }).join("");
  }

  function stableStringify(value) {
    if (value === null) return "null";
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (Array.isArray(value)) {
      return "[" + value.map(function stringifyArray(item) {
        return stableStringify(item === undefined ? null : item);
      }).join(",") + "]";
    }
    if (value && typeof value === "object") {
      const keys = Object.keys(value).filter(function serializable(key) {
        return value[key] !== undefined && typeof value[key] !== "function";
      }).sort();
      return "{" + keys.map(function stringifyObject(key) {
        return JSON.stringify(key) + ":" + stableStringify(value[key]);
      }).join(",") + "}";
    }
    return "null";
  }

  function isOperationCancelled(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (settings.cancelled === true) return true;
    if (settings.signal && (settings.signal.aborted === true || settings.signal.cancelled === true)) return true;
    if (typeof settings.shouldCancel === "function") {
      try {
        return settings.shouldCancel() === true;
      } catch (_) {
        return true;
      }
    }
    return false;
  }

  function notifyProgress(options, stage, current, total) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (typeof settings.onProgress !== "function") return;
    try {
      settings.onProgress({
        componentId: namespace.componentId,
        phase: "Phase 3 Repository Snapshot",
        stage: stage,
        current: current,
        total: total,
        progress: total > 0 ? Number(((current / total) * 100).toFixed(2)) : 100,
        at: internal.nowIso()
      });
    } catch (_) {
      // Progress observers must not alter Snapshot correctness.
    }
  }

  function emptyRepositoryState() {
    const result = {};
    STATE_COLLECTIONS.forEach(function createCollection(name) {
      result[name] = [];
    });
    return result;
  }

  function collectionForRecord(recordType, domain) {
    const type = internal.text(recordType, "").toLowerCase();
    const normalizedDomain = internal.text(domain, "").toLowerCase();
    if (type === "project") return "projects";
    if (type === "file") return "files";
    if (type === "function") return "functions";
    if (type === "module") return "modules";
    if (type === "configuration") return "configurations";
    if (normalizedDomain === "architecture" || ["architecture-object", "component", "layer", "interface"].includes(type)) {
      return "architectureObjects";
    }
    if (normalizedDomain === "quality" || ["validation-result", "diagnostic-result", "test-result", "health-status"].includes(type)) {
      return "qualityRecords";
    }
    if (normalizedDomain === "workflow" || ["workflow-package", "workflow-session", "execution-record", "approval-record", "decision-record"].includes(type)) {
      return "workflowRecords";
    }
    if (normalizedDomain === "change" || ["change-record", "diff-record", "refactoring-record", "deployment-record"].includes(type)) {
      return "changeRecords";
    }
    return "otherRecords";
  }

  function sanitizePayload(record) {
    const payload = internal.clone(record && record.payload || {});
    if (payload && Object.prototype.hasOwnProperty.call(payload, "content")) {
      delete payload.content;
    }
    return payload;
  }

  function buildRepositoryStateRecord(record) {
    const source = internal.isPlainObject(record) ? record : {};
    const recordType = internal.text(source.recordType, "unknown");
    const canonicalId = internal.text(source.identity && source.identity.canonicalId, "");
    const rawContent = recordType === "file" && source.payload && typeof source.payload.content === "string"
      ? source.payload.content
      : null;
    const payload = sanitizePayload(source);
    const contentHash = rawContent !== null ? sha256Hex(rawContent) : null;
    const stableSource = internal.clone(source.source || {});
    const stableMetadata = internal.clone(source.metadata || {});
    if (stableSource) {
      delete stableSource.capturedAt;
      delete stableSource.adapterId;
      delete stableSource.adapterVersion;
      delete stableSource.sourceRecordId;
    }
    if (stableMetadata) {
      delete stableMetadata.canonicalizedAt;
      delete stableMetadata.originalIndex;
    }
    const metadataMaterial = {
      identity: source.identity || {},
      classification: source.classification || {},
      source: stableSource,
      metadata: stableMetadata,
      payload: payload,
      quality: source.quality || {}
    };
    const metadataHash = sha256Hex(stableStringify(metadataMaterial));
    const recordMaterial = {
      canonicalId: canonicalId,
      recordType: recordType,
      metadata: metadataMaterial,
      contentHash: contentHash
    };
    return {
      canonicalId: canonicalId,
      recordType: recordType,
      identity: internal.clone(source.identity || {}),
      classification: internal.clone(source.classification || {}),
      sourceReference: internal.clone(source.source || {}),
      metadata: internal.clone(source.metadata || {}),
      payload: payload,
      quality: internal.clone(source.quality || {}),
      hashes: {
        hashAlgorithm: HASH_ALGORITHM,
        contentHash: contentHash,
        metadataHash: metadataHash,
        recordHash: sha256Hex(stableStringify(recordMaterial))
      },
      contentAvailable: rawContent !== null,
      capturedAt: internal.text(source.metadata && source.metadata.capturedAt, "") ||
        internal.text(source.source && source.source.capturedAt, "") || null
    };
  }

  function buildRepositoryState(canonicalSnapshot, options) {
    const repositoryState = emptyRepositoryState();
    const warnings = [];
    let missingContentHashCount = 0;
    const records = internal.asArray(canonicalSnapshot && canonicalSnapshot.records);
    notifyProgress(options, "Repository State", 0, records.length);
    for (let index = 0; index < records.length; index += 1) {
      if (isOperationCancelled(options)) {
        return {
          state: repositoryState,
          warnings: warnings,
          missingContentHashCount: missingContentHashCount,
          cancelled: true,
          processedRecordCount: index
        };
      }
      const stateRecord = buildRepositoryStateRecord(records[index]);
      const collection = collectionForRecord(
        stateRecord.recordType,
        stateRecord.classification && stateRecord.classification.domain
      );
      repositoryState[collection].push(stateRecord);
      if (stateRecord.recordType === "file" && !stateRecord.hashes.contentHash) {
        missingContentHashCount += 1;
      }
      if ((index + 1) % 100 === 0 || index + 1 === records.length) {
        notifyProgress(options, "Repository State", index + 1, records.length);
      }
    }
    STATE_COLLECTIONS.forEach(function sortCollection(name) {
      repositoryState[name].sort(function compare(left, right) {
        return String(left.canonicalId).localeCompare(String(right.canonicalId));
      });
    });
    if (missingContentHashCount > 0) {
      warnings.push(missingContentHashCount + " File record(s) do not contain Source content; content Hash is unavailable.");
    }
    return {
      state: repositoryState,
      warnings: warnings,
      missingContentHashCount: missingContentHashCount
    };
  }

  function flattenRepositoryState(repositoryState) {
    const records = [];
    STATE_COLLECTIONS.forEach(function collect(name) {
      internal.asArray(repositoryState && repositoryState[name]).forEach(function append(record) {
        records.push(record);
      });
    });
    return records;
  }

  function summarizeRepositoryState(repositoryState) {
    const summary = {
      projectCount: internal.asArray(repositoryState.projects).length,
      fileCount: internal.asArray(repositoryState.files).length,
      functionCount: internal.asArray(repositoryState.functions).length,
      moduleCount: internal.asArray(repositoryState.modules).length,
      configurationCount: internal.asArray(repositoryState.configurations).length,
      architectureObjectCount: internal.asArray(repositoryState.architectureObjects).length,
      qualityRecordCount: internal.asArray(repositoryState.qualityRecords).length,
      workflowRecordCount: internal.asArray(repositoryState.workflowRecords).length,
      changeRecordCount: internal.asArray(repositoryState.changeRecords).length,
      otherRecordCount: internal.asArray(repositoryState.otherRecords).length
    };
    summary.recordCount = Object.keys(summary).reduce(function total(count, key) {
      return key === "recordCount" ? count : count + Number(summary[key] || 0);
    }, 0);
    return summary;
  }

  function repositoryStateMap(repositoryState) {
    const map = new Map();
    flattenRepositoryState(repositoryState).forEach(function add(record) {
      map.set(record.canonicalId, record);
    });
    return map;
  }

  function changedFields(previousValue, currentValue, prefix, result, depth) {
    const output = result || [];
    const path = prefix || "";
    const level = Number(depth) || 0;
    if (output.length >= 100) return output;
    if (stableStringify(previousValue) === stableStringify(currentValue)) return output;
    if (level >= 4 || previousValue == null || currentValue == null ||
        typeof previousValue !== "object" || typeof currentValue !== "object" ||
        Array.isArray(previousValue) || Array.isArray(currentValue)) {
      output.push(path || "record");
      return output;
    }
    const keys = internal.unique(Object.keys(previousValue).concat(Object.keys(currentValue))).sort();
    keys.forEach(function inspect(key) {
      changedFields(previousValue[key], currentValue[key], path ? path + "." + key : key, output, level + 1);
    });
    return output;
  }

  function compareStateRecords(previousRecord, currentRecord) {
    if (!previousRecord) {
      return {
        changeType: "Added",
        contentChange: currentRecord.recordType === "file" ? "Added" : "Not Applicable",
        metadataChange: "Added",
        detectionMethod: currentRecord.hashes.contentHash ? "content-hash" : "record-hash",
        changedFields: ["record"]
      };
    }
    if (!currentRecord) {
      return {
        changeType: "Removed",
        contentChange: previousRecord.recordType === "file" ? "Removed" : "Not Applicable",
        metadataChange: "Removed",
        detectionMethod: previousRecord.hashes.contentHash ? "content-hash" : "record-hash",
        changedFields: ["record"]
      };
    }

    const fileRecord = currentRecord.recordType === "file" && previousRecord.recordType === "file";
    const previousContentHash = previousRecord.hashes && previousRecord.hashes.contentHash;
    const currentContentHash = currentRecord.hashes && currentRecord.hashes.contentHash;
    const contentComparable = fileRecord && Boolean(previousContentHash && currentContentHash);
    const contentChanged = contentComparable && previousContentHash !== currentContentHash;
    const metadataChanged = previousRecord.hashes.metadataHash !== currentRecord.hashes.metadataHash;
    const recordChanged = previousRecord.hashes.recordHash !== currentRecord.hashes.recordHash;

    return {
      changeType: recordChanged ? "Modified" : "Unchanged",
      contentChange: fileRecord
        ? contentComparable
          ? contentChanged ? "Modified" : "Unchanged"
          : "Not Assessable"
        : "Not Applicable",
      metadataChange: metadataChanged ? "Modified" : "Unchanged",
      detectionMethod: contentComparable ? "content-hash+metadata-hash" : "record-hash-fallback",
      changedFields: recordChanged
        ? changedFields(previousRecord, currentRecord, "", [], 0)
        : []
    };
  }

  function buildChangeRecord(previousRecord, currentRecord) {
    const comparison = compareStateRecords(previousRecord, currentRecord);
    const referenceRecord = currentRecord || previousRecord;
    return {
      changeId: internal.nextId("IDE-170-REPOSITORY-CHANGE"),
      canonicalId: referenceRecord.canonicalId,
      recordType: referenceRecord.recordType,
      changeType: comparison.changeType,
      contentChange: comparison.contentChange,
      metadataChange: comparison.metadataChange,
      detectionMethod: comparison.detectionMethod,
      previousRecordReference: previousRecord ? {
        canonicalId: previousRecord.canonicalId,
        recordHash: previousRecord.hashes.recordHash,
        contentHash: previousRecord.hashes.contentHash,
        metadataHash: previousRecord.hashes.metadataHash
      } : null,
      currentRecordReference: currentRecord ? {
        canonicalId: currentRecord.canonicalId,
        recordHash: currentRecord.hashes.recordHash,
        contentHash: currentRecord.hashes.contentHash,
        metadataHash: currentRecord.hashes.metadataHash
      } : null,
      previousRecord: comparison.changeType === "Removed" ? internal.clone(previousRecord) : null,
      currentRecord: comparison.changeType === "Added" || comparison.changeType === "Modified"
        ? internal.clone(currentRecord)
        : null,
      changedFields: comparison.changedFields,
      detectedAt: internal.nowIso()
    };
  }

  function detectRenameCandidates(changes) {
    const removed = changes.filter(function removedChange(change) {
      return change.changeType === "Removed" && change.previousRecord &&
        change.previousRecord.recordType === "file" &&
        change.previousRecord.hashes.contentHash;
    });
    const added = changes.filter(function addedChange(change) {
      return change.changeType === "Added" && change.currentRecord &&
        change.currentRecord.recordType === "file" &&
        change.currentRecord.hashes.contentHash;
    });
    const candidates = [];
    removed.forEach(function compareRemoved(removedChange) {
      added.forEach(function compareAdded(addedChange) {
        if (removedChange.previousRecord.hashes.contentHash !== addedChange.currentRecord.hashes.contentHash) {
          return;
        }
        if (candidates.length >= MAX_RENAME_CANDIDATES) return;
        candidates.push({
          candidateId: internal.nextId("IDE-170-RENAME-CANDIDATE"),
          candidateType: "Rename Candidate",
          layer: "Insight Candidate",
          status: "Candidate",
          removedRecordId: removedChange.canonicalId,
          addedRecordId: addedChange.canonicalId,
          similarityEvidence: {
            hashAlgorithm: HASH_ALGORITHM,
            contentHashMatch: true,
            contentHash: addedChange.currentRecord.hashes.contentHash,
            previousQualifiedName: removedChange.previousRecord.identity.qualifiedName,
            currentQualifiedName: addedChange.currentRecord.identity.qualifiedName
          },
          confidence: {
            score: 0.95,
            level: "High",
            reason: "Exact content Hash match; official Rename confirmation is still required."
          },
          factPromotionAllowed: false,
          reviewStatus: "Not Reviewed",
          generatedAt: internal.nowIso()
        });
      });
    });
    return candidates;
  }

  function resolveCanonicalSnapshot(sessionId, snapshotId) {
    if (snapshotId) return namespace.getCanonicalSnapshot(snapshotId);
    const snapshots = namespace.getCanonicalSnapshots({ sessionId: sessionId, limit: 100 });
    return snapshots.length ? snapshots[snapshots.length - 1] : null;
  }

  function projectIdFromState(repositoryState) {
    const project = internal.asArray(repositoryState.projects)[0];
    return project && project.canonicalId || "project:unknown";
  }

  function snapshotHashPayload(snapshot) {
    const copy = internal.clone(snapshot);
    if (copy.integrity) copy.integrity.snapshotHash = null;
    return copy;
  }

  function finalizeSnapshot(snapshot) {
    snapshot.integrity.stateHash = sha256Hex(stableStringify(snapshot.state));
    snapshot.integrity.snapshotHash = sha256Hex(stableStringify(snapshotHashPayload(snapshot)));
    snapshot.integrity.status = "Valid";
    return snapshot;
  }

  function registerRepositorySnapshotSchemas() {
    const definitions = [
      {
        schemaId: "IDE-170-SCHEMA-REPOSITORY-CHANGE",
        name: "Repository Snapshot Change",
        version: VERSION,
        description: "Typed Added, Modified, Removed or Unchanged Repository record comparison.",
        type: "object",
        required: ["changeId", "canonicalId", "recordType", "changeType", "detectionMethod", "detectedAt"],
        properties: {
          changeId: { type: "string", minLength: 1 },
          canonicalId: { type: "string", minLength: 1 },
          recordType: { type: "string", minLength: 1 },
          changeType: { type: "string", enum: CHANGE_TYPES },
          detectionMethod: { type: "string", minLength: 1 },
          changedFields: { type: "array" },
          detectedAt: { type: "string", format: "date-time" }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      },
      {
        schemaId: "IDE-170-SCHEMA-REPOSITORY-SNAPSHOT",
        name: "Repository Snapshot",
        version: VERSION,
        description: "Immutable Baseline or Incremental Repository state Snapshot.",
        type: "object",
        required: [
          "snapshotId", "snapshotType", "schemaVersion", "projectId", "sessionId",
          "sourceSnapshotId", "status", "state", "summary", "integrity", "frozen", "immutable"
        ],
        properties: {
          snapshotId: { type: "string", minLength: 1 },
          snapshotType: { type: "string", enum: SNAPSHOT_TYPES },
          schemaVersion: { type: "string", format: "semver" },
          projectId: { type: "string", minLength: 1 },
          sessionId: { type: "string", minLength: 1 },
          sourceSnapshotId: { type: "string", minLength: 1 },
          status: { type: "string", enum: SNAPSHOT_STATUSES },
          state: { type: "object" },
          changes: { type: "array" },
          renameCandidates: { type: "array" },
          summary: { type: "object" },
          integrity: { type: "object" },
          frozen: { type: "boolean", enum: [true] },
          immutable: { type: "boolean", enum: [true] }
        },
        additionalProperties: true,
        owner: "IDE-170",
        source: "built-in"
      }
    ];
    return definitions.map(function register(definition) {
      const existing = namespace.getSchema(definition.schemaId);
      if (existing) return { schemaId: definition.schemaId, registered: true, existing: true };
      const result = namespace.registerSchema(definition);
      return { schemaId: definition.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerRepositorySnapshotCapability() {
    if (namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "REPOSITORY_SNAPSHOT_CAPABILITY_EXISTS", "Ready", {
        capability: namespace.getCapability(CAPABILITY_ID)
      });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Repository Snapshot and State Model",
      version: VERSION,
      type: "Service",
      status: "Active",
      owner: "IDE-170",
      description: "Builds immutable Baseline and Incremental Repository Snapshots with SHA-256 integrity and chain validation.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: "1.2.0", optional: false },
        { capabilityId: "IDE-170-CANONICAL-MODEL", minimumVersion: "1.2.0", optional: false }
      ],
      schemas: [
        "IDE-170-SCHEMA-REPOSITORY-CHANGE",
        "IDE-170-SCHEMA-REPOSITORY-SNAPSHOT"
      ],
      provides: [
        "Baseline Snapshot", "Incremental Snapshot", "SHA-256 Change Detection",
        "Snapshot Chain", "Rename Candidate", "Snapshot Integrity"
      ],
      source: "built-in"
    });
  }

  function materializeRepositoryState(snapshotOrId, visited) {
    const snapshot = typeof snapshotOrId === "string"
      ? state.repositorySnapshots.get(snapshotOrId)
      : snapshotOrId;
    if (!snapshot) return null;
    const visitedIds = visited instanceof Set ? visited : new Set();
    if (visitedIds.has(snapshot.snapshotId)) return null;
    visitedIds.add(snapshot.snapshotId);
    if (snapshot.snapshotType === "baseline") return internal.clone(snapshot.state);
    const parent = state.repositorySnapshots.get(snapshot.parentSnapshotId);
    const parentState = materializeRepositoryState(parent, visitedIds);
    if (!parentState) return null;
    const records = repositoryStateMap(parentState);
    internal.asArray(snapshot.changes).forEach(function applyChange(change) {
      if (change.changeType === "Removed") {
        records.delete(change.canonicalId);
      } else if ((change.changeType === "Added" || change.changeType === "Modified") && change.currentRecord) {
        records.set(change.canonicalId, internal.clone(change.currentRecord));
      }
    });
    const result = emptyRepositoryState();
    records.forEach(function place(record) {
      const collection = collectionForRecord(
        record.recordType,
        record.classification && record.classification.domain
      );
      result[collection].push(record);
    });
    STATE_COLLECTIONS.forEach(function sort(name) {
      result[name].sort(function compare(left, right) {
        return String(left.canonicalId).localeCompare(String(right.canonicalId));
      });
    });
    return result;
  }

  function buildRepositoryBaseline(sessionId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = namespace.getSession(sessionId);
    if (!session) {
      return internal.buildResult(false, "REPOSITORY_BASELINE_SESSION_NOT_FOUND", "Blocked", null, {
        error: { message: "Intelligence Session was not found.", category: "Input Failure" }
      });
    }
    if (session.state === "Frozen" || session.frozen === true) {
      return internal.buildResult(false, "REPOSITORY_BASELINE_SESSION_FROZEN", "Blocked", null, {
        error: { message: "Frozen Session cannot build a Repository Baseline.", category: "Governance Failure" }
      });
    }
    const canonicalSnapshot = resolveCanonicalSnapshot(sessionId, settings.canonicalSnapshotId || settings.sourceSnapshotId);
    if (!canonicalSnapshot || canonicalSnapshot.status !== "Frozen") {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_NOT_READY", "Blocked", null, {
        error: { message: "A Frozen Canonical Snapshot is required.", category: "Dependency Failure" }
      });
    }
    const snapshotId = internal.text(settings.snapshotId, internal.nextId("IDE-170-REPOSITORY-BASELINE"));
    if (state.repositorySnapshots.has(snapshotId)) {
      return internal.buildResult(false, "REPOSITORY_SNAPSHOT_ID_DUPLICATE", "Blocked", { snapshotId: snapshotId }, {
        error: { message: "Repository Snapshot ID already exists.", category: "Identity Failure" }
      });
    }

    const built = buildRepositoryState(canonicalSnapshot, settings);
    if (built.cancelled) {
      internal.appendAudit({
        action: "REPOSITORY_BASELINE_CANCELLED",
        actor: internal.text(settings.actor, "IDE-170 Repository Snapshot"),
        targetType: "Repository Snapshot",
        targetId: snapshotId,
        sessionId: sessionId,
        outcome: "Cancelled",
        detail: { processedRecordCount: built.processedRecordCount }
      });
      return internal.buildResult(false, "REPOSITORY_BASELINE_CANCELLED", "Cancelled", {
        processedRecordCount: built.processedRecordCount
      });
    }
    const summary = summarizeRepositoryState(built.state);
    const partial = built.missingContentHashCount > 0 ||
      canonicalSnapshot.quality && canonicalSnapshot.quality.status === "Partial";
    const now = internal.nowIso();
    const snapshot = {
      snapshotId: snapshotId,
      snapshotType: "baseline",
      componentId: namespace.componentId,
      version: VERSION,
      schemaVersion: VERSION,
      projectId: projectIdFromState(built.state),
      sessionId: sessionId,
      parentSnapshotId: null,
      baselineSnapshotId: snapshotId,
      sourceSnapshotId: canonicalSnapshot.snapshotId,
      status: "Frozen",
      chain: {
        depth: 0,
        parentSnapshotHash: null,
        baselineSnapshotId: snapshotId
      },
      state: built.state,
      changes: [],
      renameCandidates: [],
      summary: Object.assign(summary, {
        changeCounts: { Added: 0, Modified: 0, Removed: 0, Unchanged: 0 },
        renameCandidateCount: 0,
        missingContentHashCount: built.missingContentHashCount
      }),
      integrity: {
        hashAlgorithm: HASH_ALGORITHM,
        stateHash: null,
        snapshotHash: null,
        parentSnapshotHash: null,
        status: "Valid"
      },
      quality: {
        status: partial ? "Partial" : "Ready",
        completeness: summary.fileCount
          ? Number(((summary.fileCount - built.missingContentHashCount) / summary.fileCount).toFixed(4))
          : 1,
        warnings: internal.unique(internal.asArray(canonicalSnapshot.quality && canonicalSnapshot.quality.warnings).concat(built.warnings)),
        errors: [],
        missingContentHashCount: built.missingContentHashCount,
        confidenceCapRequired: partial
      },
      validation: {
        status: "Valid",
        issues: []
      },
      capturedAt: canonicalSnapshot.capturedAt || now,
      validatedAt: now,
      frozenAt: now,
      frozen: true,
      immutable: true
    };
    finalizeSnapshot(snapshot);
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-REPOSITORY-SNAPSHOT", snapshot);
    const validation = validateRepositorySnapshot(snapshot);
    if (!schemaValidation.valid || !validation.valid) {
      return internal.buildResult(false, "REPOSITORY_BASELINE_VALIDATION_BLOCKED", "Blocked", {
        snapshot: snapshot,
        schemaValidation: schemaValidation,
        validation: validation
      }, {
        error: { message: "Repository Baseline validation failed.", category: "Integrity Failure" }
      });
    }

    const frozenSnapshot = internal.deepFreeze(snapshot);
    state.repositorySnapshots.set(snapshotId, frozenSnapshot);
    state.latestRepositorySnapshotId = snapshotId;
    state.latestRepositoryBaselineId = snapshotId;
    internal.attachSessionSourceReference(sessionId, {
      referenceType: "Repository Baseline Snapshot",
      snapshotId: snapshotId,
      sourceSnapshotId: canonicalSnapshot.snapshotId,
      status: "Frozen",
      recordCount: summary.recordCount,
      snapshotHash: snapshot.integrity.snapshotHash,
      capturedAt: now
    }, { actor: internal.text(settings.actor, "IDE-170 Repository Snapshot") });
    internal.touch();
    internal.appendAudit({
      action: "REPOSITORY_BASELINE_FROZEN",
      actor: internal.text(settings.actor, "IDE-170 Repository Snapshot"),
      targetType: "Repository Snapshot",
      targetId: snapshotId,
      sessionId: sessionId,
      outcome: partial ? "Partial" : "Ready",
      detail: {
        recordCount: summary.recordCount,
        fileCount: summary.fileCount,
        missingContentHashCount: built.missingContentHashCount,
        snapshotHash: snapshot.integrity.snapshotHash
      }
    });
    return internal.buildResult(true, "REPOSITORY_BASELINE_FROZEN", partial ? "Partial" : "Ready", {
      snapshot: getRepositorySnapshot(snapshotId)
    }, { warnings: snapshot.quality.warnings });
  }

  function buildRepositoryIncrement(sessionId, parentSnapshotId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const session = namespace.getSession(sessionId);
    if (!session) {
      return internal.buildResult(false, "REPOSITORY_INCREMENT_SESSION_NOT_FOUND", "Blocked", null, {
        error: { message: "Intelligence Session was not found.", category: "Input Failure" }
      });
    }
    if (session.state === "Frozen" || session.frozen === true) {
      return internal.buildResult(false, "REPOSITORY_INCREMENT_SESSION_FROZEN", "Blocked", null, {
        error: { message: "Frozen Session cannot build a Repository Increment.", category: "Governance Failure" }
      });
    }
    const parent = state.repositorySnapshots.get(internal.text(parentSnapshotId, ""));
    if (!parent || parent.status !== "Frozen") {
      return internal.buildResult(false, "PARENT_REPOSITORY_SNAPSHOT_NOT_READY", "Blocked", {
        parentSnapshotId: parentSnapshotId || null
      }, {
        error: { message: "A Frozen parent Repository Snapshot is required.", category: "Dependency Failure" }
      });
    }
    const parentChainValidation = validateSnapshotChain(parent.snapshotId);
    if (!parentChainValidation.valid) {
      return internal.buildResult(false, "PARENT_SNAPSHOT_CHAIN_INVALID", "Blocked", {
        validation: parentChainValidation
      }, {
        error: { message: "Parent Snapshot Chain is invalid.", category: "Integrity Failure" }
      });
    }
    if (Number(parent.chain && parent.chain.depth || 0) >= MAX_CHAIN_DEPTH) {
      return internal.buildResult(false, "SNAPSHOT_CHAIN_LIMIT_REACHED", "Blocked", {
        maximumDepth: MAX_CHAIN_DEPTH,
        parentSnapshotId: parent.snapshotId
      }, {
        error: { message: "A new Baseline Snapshot is required.", category: "Governance Failure" }
      });
    }

    const canonicalSnapshot = resolveCanonicalSnapshot(sessionId, settings.canonicalSnapshotId || settings.sourceSnapshotId);
    if (!canonicalSnapshot || canonicalSnapshot.status !== "Frozen") {
      return internal.buildResult(false, "CANONICAL_SNAPSHOT_NOT_READY", "Blocked", null, {
        error: { message: "A Frozen Canonical Snapshot is required.", category: "Dependency Failure" }
      });
    }
    const snapshotId = internal.text(settings.snapshotId, internal.nextId("IDE-170-REPOSITORY-INCREMENTAL"));
    if (state.repositorySnapshots.has(snapshotId)) {
      return internal.buildResult(false, "REPOSITORY_SNAPSHOT_ID_DUPLICATE", "Blocked", { snapshotId: snapshotId }, {
        error: { message: "Repository Snapshot ID already exists.", category: "Identity Failure" }
      });
    }

    const previousState = materializeRepositoryState(parent.snapshotId);
    if (!previousState) {
      return internal.buildResult(false, "PARENT_REPOSITORY_STATE_UNAVAILABLE", "Blocked", null, {
        error: { message: "Parent Repository state could not be materialized.", category: "Integrity Failure" }
      });
    }
    const currentBuilt = buildRepositoryState(canonicalSnapshot, settings);
    if (currentBuilt.cancelled) {
      internal.appendAudit({
        action: "REPOSITORY_INCREMENTAL_CANCELLED",
        actor: internal.text(settings.actor, "IDE-170 Repository Snapshot"),
        targetType: "Repository Snapshot",
        targetId: snapshotId,
        sessionId: sessionId,
        outcome: "Cancelled",
        detail: { processedRecordCount: currentBuilt.processedRecordCount }
      });
      return internal.buildResult(false, "REPOSITORY_INCREMENTAL_CANCELLED", "Cancelled", {
        processedRecordCount: currentBuilt.processedRecordCount
      });
    }
    const previousMap = repositoryStateMap(previousState);
    const currentMap = repositoryStateMap(currentBuilt.state);
    const canonicalIds = internal.unique([...previousMap.keys(), ...currentMap.keys()]).sort();
    const changes = [];
    notifyProgress(settings, "Change Detection", 0, canonicalIds.length);
    for (let index = 0; index < canonicalIds.length; index += 1) {
      if (isOperationCancelled(settings)) {
        return internal.buildResult(false, "REPOSITORY_INCREMENTAL_CANCELLED", "Cancelled", {
          processedRecordCount: index
        });
      }
      const canonicalId = canonicalIds[index];
      changes.push(buildChangeRecord(previousMap.get(canonicalId) || null, currentMap.get(canonicalId) || null));
      if ((index + 1) % 100 === 0 || index + 1 === canonicalIds.length) {
        notifyProgress(settings, "Change Detection", index + 1, canonicalIds.length);
      }
    }
    const renameCandidates = detectRenameCandidates(changes);
    const changedState = emptyRepositoryState();
    changes.forEach(function collectChanged(change) {
      if ((change.changeType === "Added" || change.changeType === "Modified") && change.currentRecord) {
        const collection = collectionForRecord(
          change.currentRecord.recordType,
          change.currentRecord.classification && change.currentRecord.classification.domain
        );
        changedState[collection].push(change.currentRecord);
      }
    });
    STATE_COLLECTIONS.forEach(function sort(name) {
      changedState[name].sort(function compare(left, right) {
        return String(left.canonicalId).localeCompare(String(right.canonicalId));
      });
    });

    const currentSummary = summarizeRepositoryState(currentBuilt.state);
    const changeCounts = { Added: 0, Modified: 0, Removed: 0, Unchanged: 0 };
    changes.forEach(function count(change) {
      changeCounts[change.changeType] = (changeCounts[change.changeType] || 0) + 1;
    });
    const fallbackCount = changes.filter(function fallback(change) {
      return change.detectionMethod === "record-hash-fallback" && change.changeType !== "Unchanged";
    }).length;
    const partial = currentBuilt.missingContentHashCount > 0 || fallbackCount > 0 ||
      canonicalSnapshot.quality && canonicalSnapshot.quality.status === "Partial";
    const now = internal.nowIso();
    const snapshot = {
      snapshotId: snapshotId,
      snapshotType: "incremental",
      componentId: namespace.componentId,
      version: VERSION,
      schemaVersion: VERSION,
      projectId: projectIdFromState(currentBuilt.state),
      sessionId: sessionId,
      parentSnapshotId: parent.snapshotId,
      baselineSnapshotId: parent.baselineSnapshotId || parent.snapshotId,
      sourceSnapshotId: canonicalSnapshot.snapshotId,
      status: "Frozen",
      chain: {
        depth: Number(parent.chain && parent.chain.depth || 0) + 1,
        parentSnapshotHash: parent.integrity.snapshotHash,
        baselineSnapshotId: parent.baselineSnapshotId || parent.snapshotId
      },
      state: changedState,
      changes: changes,
      renameCandidates: renameCandidates,
      summary: Object.assign(currentSummary, {
        changeCounts: changeCounts,
        renameCandidateCount: renameCandidates.length,
        changedRecordCount: changeCounts.Added + changeCounts.Modified + changeCounts.Removed,
        missingContentHashCount: currentBuilt.missingContentHashCount,
        recordHashFallbackCount: fallbackCount
      }),
      integrity: {
        hashAlgorithm: HASH_ALGORITHM,
        stateHash: null,
        snapshotHash: null,
        parentSnapshotHash: parent.integrity.snapshotHash,
        status: "Valid"
      },
      quality: {
        status: partial ? "Partial" : "Ready",
        completeness: currentSummary.fileCount
          ? Number(((currentSummary.fileCount - currentBuilt.missingContentHashCount) / currentSummary.fileCount).toFixed(4))
          : 1,
        warnings: internal.unique(
          internal.asArray(canonicalSnapshot.quality && canonicalSnapshot.quality.warnings)
            .concat(currentBuilt.warnings)
            .concat(fallbackCount ? [fallbackCount + " changed Record(s) used record Hash fallback because content Hash was unavailable."] : [])
        ),
        errors: [],
        missingContentHashCount: currentBuilt.missingContentHashCount,
        recordHashFallbackCount: fallbackCount,
        confidenceCapRequired: partial
      },
      validation: {
        status: "Valid",
        issues: []
      },
      capturedAt: canonicalSnapshot.capturedAt || now,
      validatedAt: now,
      frozenAt: now,
      frozen: true,
      immutable: true
    };
    finalizeSnapshot(snapshot);
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-REPOSITORY-SNAPSHOT", snapshot);
    const validation = validateRepositorySnapshot(snapshot);
    if (!schemaValidation.valid || !validation.valid) {
      return internal.buildResult(false, "REPOSITORY_INCREMENT_VALIDATION_BLOCKED", "Blocked", {
        snapshot: snapshot,
        schemaValidation: schemaValidation,
        validation: validation
      }, {
        error: { message: "Repository Incremental Snapshot validation failed.", category: "Integrity Failure" }
      });
    }

    const frozenSnapshot = internal.deepFreeze(snapshot);
    state.repositorySnapshots.set(snapshotId, frozenSnapshot);
    state.latestRepositorySnapshotId = snapshotId;
    internal.attachSessionSourceReference(sessionId, {
      referenceType: "Repository Incremental Snapshot",
      snapshotId: snapshotId,
      parentSnapshotId: parent.snapshotId,
      sourceSnapshotId: canonicalSnapshot.snapshotId,
      status: "Frozen",
      changedRecordCount: snapshot.summary.changedRecordCount,
      snapshotHash: snapshot.integrity.snapshotHash,
      capturedAt: now
    }, { actor: internal.text(settings.actor, "IDE-170 Repository Snapshot") });
    internal.touch();
    internal.appendAudit({
      action: "REPOSITORY_INCREMENTAL_FROZEN",
      actor: internal.text(settings.actor, "IDE-170 Repository Snapshot"),
      targetType: "Repository Snapshot",
      targetId: snapshotId,
      sessionId: sessionId,
      outcome: partial ? "Partial" : "Ready",
      detail: {
        parentSnapshotId: parent.snapshotId,
        changeCounts: changeCounts,
        renameCandidateCount: renameCandidates.length,
        snapshotHash: snapshot.integrity.snapshotHash
      }
    });
    return internal.buildResult(true, "REPOSITORY_INCREMENTAL_FROZEN", partial ? "Partial" : "Ready", {
      snapshot: getRepositorySnapshot(snapshotId)
    }, { warnings: snapshot.quality.warnings });
  }

  function getRepositorySnapshot(snapshotId) {
    return internal.clone(state.repositorySnapshots.get(internal.text(snapshotId, "")) || null);
  }

  function getRepositorySnapshots(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const sessionId = internal.text(settings.sessionId, "");
    const snapshotType = internal.text(settings.snapshotType, "");
    const status = internal.text(settings.status, "");
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 20));
    return [...state.repositorySnapshots.values()]
      .filter(function filter(snapshot) {
        if (sessionId && snapshot.sessionId !== sessionId) return false;
        if (snapshotType && snapshot.snapshotType !== snapshotType) return false;
        if (status && snapshot.status !== status) return false;
        return true;
      })
      .slice(-limit)
      .map(internal.clone);
  }

  function validateSnapshotChain(snapshotOrId) {
    const start = typeof snapshotOrId === "string"
      ? state.repositorySnapshots.get(snapshotOrId)
      : snapshotOrId;
    const checks = [];
    if (!start) {
      return {
        id: internal.nextId("IDE-170-SNAPSHOT-CHAIN-VALIDATION"),
        valid: false,
        passed: 0,
        failed: 1,
        total: 1,
        checks: [{ name: "Snapshot exists", passed: false, detail: "Snapshot not found" }],
        validatedAt: internal.nowIso()
      };
    }
    const visited = new Set();
    let current = start;
    let depth = 0;
    while (current) {
      const duplicate = visited.has(current.snapshotId);
      checks.push({
        name: "Snapshot Chain contains no cycle at depth " + depth,
        passed: !duplicate,
        detail: current.snapshotId
      });
      if (duplicate) break;
      visited.add(current.snapshotId);
      if (current.snapshotType === "baseline") {
        checks.push({
          name: "Baseline has no parent",
          passed: !current.parentSnapshotId,
          detail: String(current.parentSnapshotId)
        });
        break;
      }
      const parent = state.repositorySnapshots.get(current.parentSnapshotId);
      checks.push({
        name: "Parent Snapshot exists at depth " + depth,
        passed: Boolean(parent),
        detail: current.parentSnapshotId
      });
      if (!parent) break;
      checks.push({
        name: "Parent Snapshot Hash matches at depth " + depth,
        passed: current.chain && current.chain.parentSnapshotHash === parent.integrity.snapshotHash &&
          current.integrity.parentSnapshotHash === parent.integrity.snapshotHash,
        detail: parent.integrity.snapshotHash
      });
      current = parent;
      depth += 1;
      if (depth > MAX_CHAIN_DEPTH) {
        checks.push({ name: "Snapshot Chain depth is governed", passed: false, detail: String(depth) });
        break;
      }
    }
    const passed = checks.filter(function count(check) { return check.passed; }).length;
    return {
      id: internal.nextId("IDE-170-SNAPSHOT-CHAIN-VALIDATION"),
      componentId: namespace.componentId,
      snapshotId: start.snapshotId,
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      depth: depth,
      validatedAt: internal.nowIso()
    };
  }

  function validateRepositorySnapshot(snapshotOrId) {
    const snapshot = typeof snapshotOrId === "string"
      ? state.repositorySnapshots.get(snapshotOrId)
      : snapshotOrId;
    if (!snapshot) {
      return {
        id: internal.nextId("IDE-170-REPOSITORY-SNAPSHOT-VALIDATION"),
        valid: false,
        passed: 0,
        failed: 1,
        total: 1,
        checks: [{ name: "Repository Snapshot exists", passed: false, detail: "Snapshot not found" }],
        validatedAt: internal.nowIso()
      };
    }
    const checks = [];
    function check(name, passed, detail) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, "") });
    }
    const schemaValidation = namespace.validateAgainstSchema("IDE-170-SCHEMA-REPOSITORY-SNAPSHOT", snapshot);
    const materialized = snapshot.snapshotType === "baseline"
      ? internal.clone(snapshot.state)
      : materializeRepositoryState(snapshot);
    const stateRecords = materialized ? flattenRepositoryState(materialized) : [];
    const canonicalIds = stateRecords.map(function id(record) { return record.canonicalId; });
    const uniqueIds = new Set(canonicalIds);
    const expectedSummary = materialized ? summarizeRepositoryState(materialized) : null;
    const computedStateHash = sha256Hex(stableStringify(snapshot.state));
    const computedSnapshotHash = sha256Hex(stableStringify(snapshotHashPayload(snapshot)));
    const chainValidation = snapshot.snapshotType === "baseline"
      ? { valid: !snapshot.parentSnapshotId }
      : validateSnapshotChain(snapshot);

    check("Repository Snapshot Schema", schemaValidation.valid, "errors=" + schemaValidation.errors.length);
    check("Repository Snapshot type is governed", SNAPSHOT_TYPES.includes(snapshot.snapshotType), snapshot.snapshotType);
    check("Repository Snapshot is frozen", snapshot.status === "Frozen" && snapshot.frozen === true, snapshot.status);
    check("Repository Snapshot is immutable", snapshot.immutable === true, String(snapshot.immutable));
    check("Repository Snapshot Hash algorithm is SHA-256", snapshot.integrity && snapshot.integrity.hashAlgorithm === HASH_ALGORITHM, snapshot.integrity && snapshot.integrity.hashAlgorithm);
    check("Repository Snapshot State Hash matches", snapshot.integrity && snapshot.integrity.stateHash === computedStateHash, computedStateHash);
    check("Repository Snapshot Hash matches", snapshot.integrity && snapshot.integrity.snapshotHash === computedSnapshotHash, computedSnapshotHash);
    check("Repository Snapshot Chain is valid", chainValidation.valid === true, snapshot.parentSnapshotId || "Baseline");
    check("Repository Snapshot materializes", Boolean(materialized), snapshot.snapshotId);
    check("Materialized Canonical IDs are unique", canonicalIds.length === uniqueIds.size, canonicalIds.length + "/" + uniqueIds.size);
    check("Summary Record Count matches materialized state", Boolean(expectedSummary && snapshot.summary.recordCount === expectedSummary.recordCount), expectedSummary && expectedSummary.recordCount);
    check("Rename Candidates remain Candidate Layer", internal.asArray(snapshot.renameCandidates).every(function candidate(candidate) {
      return candidate.layer === "Insight Candidate" && candidate.status === "Candidate" && candidate.factPromotionAllowed === false;
    }), "count=" + internal.asArray(snapshot.renameCandidates).length);
    check("Change Types are governed", internal.asArray(snapshot.changes).every(function change(change) {
      return CHANGE_TYPES.includes(change.changeType);
    }), "count=" + internal.asArray(snapshot.changes).length);

    const passed = checks.filter(function count(check) { return check.passed; }).length;
    return {
      id: internal.nextId("IDE-170-REPOSITORY-SNAPSHOT-VALIDATION"),
      componentId: namespace.componentId,
      snapshotId: snapshot.snapshotId,
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      schemaErrors: schemaValidation.errors,
      validatedAt: internal.nowIso()
    };
  }

  function getRepositorySnapshotStatus() {
    const latest = state.latestRepositorySnapshotId
      ? state.repositorySnapshots.get(state.latestRepositorySnapshotId)
      : null;
    return {
      id: "IDE-170-REPOSITORY-SNAPSHOT-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability(CAPABILITY_ID)),
      snapshotCount: state.repositorySnapshots.size,
      baselineCount: [...state.repositorySnapshots.values()].filter(function baseline(snapshot) {
        return snapshot.snapshotType === "baseline";
      }).length,
      incrementalCount: [...state.repositorySnapshots.values()].filter(function incremental(snapshot) {
        return snapshot.snapshotType === "incremental";
      }).length,
      latestSnapshotId: latest && latest.snapshotId || null,
      latestSnapshotType: latest && latest.snapshotType || null,
      latestSnapshotStatus: latest && latest.status || "Not Run",
      latestSnapshotHash: latest && latest.integrity.snapshotHash || null,
      hashAlgorithm: HASH_ALGORITHM,
      frozenSnapshotMutationAllowed: false,
      renameAutomaticConfirmationAllowed: false,
      updatedAt: state.updatedAt || internal.nowIso()
    };
  }

  function initializeRepositorySnapshot() {
    const schemaResults = registerRepositorySnapshotSchemas();
    const capabilityResult = registerRepositorySnapshotCapability();
    const schemaFailures = schemaResults.filter(function failure(item) {
      return item.registered !== true;
    });
    const ready = schemaFailures.length === 0 && capabilityResult.ok === true;
    return internal.buildResult(ready,
      ready ? "REPOSITORY_SNAPSHOT_INITIALIZED" : "REPOSITORY_SNAPSHOT_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      {
        schemaResults: schemaResults,
        capabilityResult: capabilityResult,
        hashAlgorithm: HASH_ALGORITHM,
        maximumChainDepth: MAX_CHAIN_DEPTH
      },
      ready ? {} : {
        error: { message: "Repository Snapshot initialization failed.", category: "Initialization Failure" }
      });
  }

  function removeRepositorySnapshotForValidation(snapshotId) {
    const id = internal.text(snapshotId, "");
    const removed = state.repositorySnapshots.delete(id);
    if (state.latestRepositorySnapshotId === id) state.latestRepositorySnapshotId = null;
    if (state.latestRepositoryBaselineId === id) state.latestRepositoryBaselineId = null;
    return removed;
  }

  Object.assign(internal, {
    sha256Hex: sha256Hex,
    stableStringify: stableStringify,
    repositorySnapshotTypes: SNAPSHOT_TYPES,
    repositorySnapshotStatuses: SNAPSHOT_STATUSES,
    repositoryChangeTypes: CHANGE_TYPES,
    materializeRepositoryState: materializeRepositoryState,
    removeRepositorySnapshotForValidation: removeRepositorySnapshotForValidation
  });

  Object.assign(namespace.api, {
    initializeRepositorySnapshot: initializeRepositorySnapshot,
    buildRepositoryBaseline: buildRepositoryBaseline,
    buildRepositoryIncrement: buildRepositoryIncrement,
    getRepositorySnapshot: getRepositorySnapshot,
    getRepositorySnapshots: getRepositorySnapshots,
    materializeRepositoryState: materializeRepositoryState,
    validateRepositorySnapshot: validateRepositorySnapshot,
    validateSnapshotChain: validateSnapshotChain,
    getRepositorySnapshotStatus: getRepositorySnapshotStatus,
    calculateSHA256: sha256Hex
  });

  Object.assign(namespace, {
    buildRepositoryBaseline: buildRepositoryBaseline,
    buildRepositoryIncrement: buildRepositoryIncrement,
    getRepositorySnapshot: getRepositorySnapshot,
    getRepositorySnapshots: getRepositorySnapshots,
    materializeRepositoryState: materializeRepositoryState,
    validateRepositorySnapshot: validateRepositorySnapshot,
    validateSnapshotChain: validateSnapshotChain,
    getRepositorySnapshotStatus: getRepositorySnapshotStatus,
    calculateSHA256: sha256Hex
  });

  namespace.modules.repositorySnapshot = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    baselineSnapshot: true,
    incrementalSnapshot: true,
    hashAlgorithm: HASH_ALGORITHM,
    immutableSnapshot: true,
    snapshotChain: true,
    renameCandidateOnly: true,
    maximumChainDepth: MAX_CHAIN_DEPTH,
    maximumRenameCandidates: MAX_RENAME_CANDIDATES,
    progressReporting: true,
    cancellation: true,
    loadedAt: internal.nowIso()
  };

  global.buildIntelligenceRepositoryBaseline = buildRepositoryBaseline;
  global.buildIntelligenceRepositoryIncrement = buildRepositoryIncrement;
  global.getIntelligenceRepositorySnapshot = getRepositorySnapshot;
  global.validateIntelligenceRepositorySnapshot = validateRepositorySnapshot;
  global.getIntelligenceRepositorySnapshotStatus = getRepositorySnapshotStatus;
})(typeof window !== "undefined" ? window : globalThis);
