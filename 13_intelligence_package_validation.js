/* ============================================================
   FILE: 13_intelligence_package_validation.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: Version Manifest
   Phase 8: Package Validation, Completion Gate and Release Receipt
   Architecture Decisions: IDE-170-009 / IDE-170-010 / IDE-170-011
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("packageValidation");
  const CAPABILITY_ID = "IDE-170-PACKAGE-VALIDATION";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;
  const RECEIPT_SCHEMA_ID = "IDE-170-SCHEMA-PACKAGE-RELEASE-RECEIPT";
  const STORAGE_KEY = "IDE170_PHASE8_RELEASE_RECEIPT_V1";
  const HASH_ALGORITHM = "SHA-256";

  if (!(state.packageValidations instanceof Map)) state.packageValidations = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackageValidation")) state.lastPackageValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackagePhaseValidation")) state.lastPackagePhaseValidation = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackageReleaseReceipt")) state.lastPackageReleaseReceipt = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastPackageReleaseRestore")) state.lastPackageReleaseRestore = null;
  if (!Object.prototype.hasOwnProperty.call(state, "packageReleasePersistenceStatus")) state.packageReleasePersistenceStatus = "Not Initialized";

  function stableStringify(value) {
    if (internal.stableStringifyPackage) return internal.stableStringifyPackage(value);
    if (value == null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function mapKey(key) { return JSON.stringify(key) + ":" + stableStringify(value[key]); }).join(",") + "}";
  }

  function sha256(value) {
    if (typeof namespace.calculateSHA256 !== "function") throw new Error("SHA-256 API is unavailable.");
    return namespace.calculateSHA256(typeof value === "string" ? value : stableStringify(value));
  }

  function checkRecord(name, passed, detail, group, severity, code) {
    return {
      name: name,
      passed: passed === true,
      detail: detail == null ? "" : String(detail),
      group: group || "Package Validation",
      severity: severity || "High",
      code: code || ""
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const groups = {};
    checks.forEach(function group(item) {
      if (!groups[item.group]) groups[item.group] = { passed: 0, failed: 0, total: 0 };
      groups[item.group].total += 1;
      if (item.passed) groups[item.group].passed += 1;
      else groups[item.group].failed += 1;
    });
    return { passed: passed, failed: failed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null, groups: groups };
  }

  function getArtifacts(packageRecord) {
    return packageRecord && packageRecord.artifacts && typeof packageRecord.artifacts === "object" ? packageRecord.artifacts : {};
  }

  function artifactEntries(packageRecord) {
    const artifacts = getArtifacts(packageRecord);
    return internal.asArray(packageRecord && packageRecord.artifactOrder).map(function map(id) { return artifacts[id]; }).filter(Boolean);
  }

  function typeMap(packageRecord) {
    const map = new Map();
    artifactEntries(packageRecord).forEach(function index(artifact) {
      if (!map.has(artifact.artifactType)) map.set(artifact.artifactType, []);
      map.get(artifact.artifactType).push(artifact);
    });
    return map;
  }

  function validateTypedArtifact(artifact, packageRecord) {
    const checks = [];
    const types = internal.packageArtifactTypes || {};
    checks.push(checkRecord("Artifact exists", Boolean(artifact), artifact && artifact.artifactId, "Artifact", "Critical"));
    if (!artifact) return { valid: false, checks: checks, passed: 0, failed: 1, total: 1, health: 0 };
    checks.push(checkRecord("Artifact ID is present", Boolean(artifact.artifactId), artifact.artifactId, "Artifact", "Critical"));
    checks.push(checkRecord("Artifact Type is registered", Boolean(types[artifact.artifactType]), artifact.artifactType, "Artifact", "Critical"));
    checks.push(checkRecord("Artifact Package ID matches", !packageRecord || artifact.packageId === packageRecord.packageId, artifact.packageId, "Reference", "Critical"));
    checks.push(checkRecord("Artifact Session ID matches", !packageRecord || artifact.sessionId === packageRecord.manifest.session.sessionId, artifact.sessionId, "Reference", "High"));
    checks.push(checkRecord("Artifact is Frozen", artifact.frozen === true && artifact.immutable === true && Boolean(artifact.frozenAt), artifact.frozenAt, "Freeze", "Critical"));
    checks.push(checkRecord("Artifact has SHA-256 integrity", artifact.integrity && artifact.integrity.algorithm === HASH_ALGORITHM && /^[a-f0-9]{64}$/.test(String(artifact.integrity.hash || "")), artifact.integrity && artifact.integrity.hash, "Integrity", "Critical"));
    if (artifact.integrity && internal.calculatePackageArtifactHash) {
      const actual = internal.calculatePackageArtifactHash(artifact);
      checks.push(checkRecord("Artifact Hash matches content", actual === artifact.integrity.hash, actual, "Integrity", "Critical"));
    }
    if (typeof namespace.validateAgainstSchema === "function") {
      const schema = namespace.validateAgainstSchema("IDE-170-SCHEMA-TYPED-ARTIFACT", artifact);
      checks.push(checkRecord("Artifact common Schema validates", schema.valid === true, "errors=" + internal.asArray(schema.errors).length, "Schema", "Critical"));
    }
    const s = summarize(checks);
    return Object.assign({ valid: s.failed === 0, status: s.failed === 0 ? "Valid" : "Invalid", artifactId: artifact.artifactId }, s, { checks: checks, validatedAt: internal.nowIso() });
  }

  function validateManifest(packageRecord) {
    const manifest = packageRecord && packageRecord.manifest;
    const checks = [];
    checks.push(checkRecord("Package Manifest exists", Boolean(manifest), manifest && manifest.packageId, "Manifest", "Critical"));
    if (!manifest) return Object.assign({ valid: false, status: "Invalid" }, summarize(checks), { checks: checks });
    checks.push(checkRecord("Manifest Package ID matches", manifest.packageId === packageRecord.packageId, manifest.packageId, "Manifest", "Critical"));
    checks.push(checkRecord("Manifest Package Version is present", Boolean(manifest.packageVersion), manifest.packageVersion, "Version", "Critical"));
    checks.push(checkRecord("Manifest Version is present", Boolean(manifest.manifestVersion), manifest.manifestVersion, "Version", "Critical"));
    checks.push(checkRecord("Manifest Compatibility is present", Boolean(manifest.compatibility && manifest.compatibility.minimumIDE180Version && internal.asArray(manifest.compatibility.supportedConsumers).includes("IDE-180")), stableStringify(manifest.compatibility), "Compatibility", "Critical"));
    checks.push(checkRecord("Manifest Handoff entry is present", Boolean(manifest.handoff && manifest.handoff.handoffId), manifest.handoff && manifest.handoff.handoffId, "Handoff", "Critical"));
    const manifestArtifacts = internal.asArray(manifest.artifacts);
    checks.push(checkRecord("Manifest Artifact count matches Package", manifestArtifacts.length === artifactEntries(packageRecord).length, manifestArtifacts.length + "/" + artifactEntries(packageRecord).length, "Manifest", "Critical"));
    const ids = manifestArtifacts.map(function id(item) { return item.artifactId; });
    const locations = manifestArtifacts.map(function location(item) { return item.location; });
    checks.push(checkRecord("Manifest Artifact IDs are unique", new Set(ids).size === ids.length, ids.length, "Manifest", "Critical"));
    checks.push(checkRecord("Manifest locations are unique", new Set(locations).size === locations.length, locations.length, "Manifest", "Critical"));
    const artifactById = getArtifacts(packageRecord);
    manifestArtifacts.forEach(function validateEntry(entry) {
      const artifact = artifactById[entry.artifactId];
      checks.push(checkRecord("Manifest Artifact exists: " + entry.artifactType, Boolean(artifact), entry.artifactId, "Manifest Reference", entry.required ? "Critical" : "High"));
      if (!artifact) return;
      checks.push(checkRecord("Manifest Artifact Type matches: " + entry.artifactType, artifact.artifactType === entry.artifactType, artifact.artifactType, "Manifest Reference", "Critical"));
      checks.push(checkRecord("Manifest Artifact Hash matches: " + entry.artifactType, artifact.integrity && artifact.integrity.hash === entry.hash, entry.hash, "Manifest Integrity", "Critical"));
      checks.push(checkRecord("Manifest Artifact size matches: " + entry.artifactType, artifact.integrity && Number(artifact.integrity.byteSize) === Number(entry.size), String(entry.size), "Manifest Integrity", "High"));
    });
    if (typeof namespace.validateAgainstSchema === "function") {
      const schema = namespace.validateAgainstSchema("IDE-170-SCHEMA-INTELLIGENCE-PACKAGE-MANIFEST", manifest);
      checks.push(checkRecord("Package Manifest Schema validates", schema.valid === true, "errors=" + internal.asArray(schema.errors).length, "Schema", "Critical"));
    }
    const s = summarize(checks);
    return Object.assign({ valid: s.failed === 0, status: s.failed === 0 ? "Valid" : "Invalid" }, s, { checks: checks, validatedAt: internal.nowIso() });
  }

  function validateIntegrity(packageRecord) {
    const checks = [];
    const manifest = packageRecord && packageRecord.manifest;
    if (!manifest) return { valid: false, status: "Invalid", checks: [checkRecord("Manifest exists for integrity", false, "Missing", "Integrity", "Critical")], passed: 0, failed: 1, total: 1, health: 0 };
    const payload = internal.manifestHashPayload ? internal.manifestHashPayload(manifest) : manifest;
    const manifestHash = sha256(payload);
    checks.push(checkRecord("Manifest Hash matches", manifest.integrity && manifest.integrity.manifestHash === manifestHash, manifestHash, "Integrity", "Critical"));
    const entries = internal.asArray(manifest.artifacts);
    const packageHash = internal.calculateIntelligencePackageHash ? internal.calculateIntelligencePackageHash(manifestHash, entries) : sha256({ manifestHash: manifestHash, artifactHashes: entries.map(function map(item) { return { artifactId: item.artifactId, hash: item.hash, location: item.location }; }) });
    checks.push(checkRecord("Package Hash matches", manifest.integrity && manifest.integrity.packageHash === packageHash, packageHash, "Integrity", "Critical"));
    checks.push(checkRecord("Package Integrity status is Valid", manifest.integrity && manifest.integrity.status === "Valid", manifest.integrity && manifest.integrity.status, "Integrity", "Critical"));
    artifactEntries(packageRecord).forEach(function verifyArtifact(artifact) {
      checks.push(checkRecord("Artifact Hash valid: " + artifact.artifactType, internal.calculatePackageArtifactHash && internal.calculatePackageArtifactHash(artifact) === artifact.integrity.hash, artifact.artifactId, "Artifact Integrity", "Critical"));
    });
    const s = summarize(checks);
    return Object.assign({ valid: s.failed === 0, status: s.failed === 0 ? "Valid" : "Invalid", manifestHash: manifestHash, packageHash: packageHash }, s, { checks: checks, validatedAt: internal.nowIso() });
  }

  function requiredArtifactChecks(packageRecord) {
    const checks = [];
    const types = typeMap(packageRecord);
    internal.asArray(internal.packageRequiredArtifactTypes).forEach(function required(type) {
      checks.push(checkRecord("Required Artifact exists: " + type, types.has(type) && types.get(type).length > 0, type, "Required Artifact", "Critical"));
    });
    return checks;
  }

  function validateIntelligencePackageDraft(input) {
    const source = input && input.draft ? input : { draft: input };
    const draft = source.draft;
    const checks = [];
    if (!draft) return { valid: false, status: "Invalid", passed: 0, failed: 1, total: 1, health: 0, checks: [checkRecord("Package Draft exists", false, "Missing", "Draft", "Critical")] };
    checks.push(checkRecord("Draft Package ID is present", Boolean(draft.packageId), draft.packageId, "Draft", "Critical"));
    checks.push(checkRecord("Draft Session ID is present", Boolean(draft.sessionId), draft.sessionId, "Draft", "Critical"));
    const ids = internal.asArray(draft.artifactOrder);
    checks.push(checkRecord("Draft Artifact IDs are unique", new Set(ids).size === ids.length, ids.length, "Draft", "Critical"));
    const locations = Object.values(draft.locations || {});
    checks.push(checkRecord("Draft Artifact locations are unique", new Set(locations).size === locations.length, locations.length, "Draft", "Critical"));
    const draftPackage = {
      packageId: draft.packageId,
      artifactOrder: ids,
      artifacts: draft.artifactsById,
      manifest: { session: { sessionId: draft.sessionId } }
    };
    ids.forEach(function validate(id) {
      const v = validateTypedArtifact(draft.artifactsById[id], draftPackage);
      checks.push(checkRecord("Draft Artifact validates: " + (draft.artifactsById[id] && draft.artifactsById[id].artifactType || id), v.valid === true, v.failed, "Artifact", "Critical"));
    });
    internal.asArray(internal.packageRequiredArtifactTypes).forEach(function required(type) {
      const present = ids.some(function some(id) { return draft.artifactsById[id] && draft.artifactsById[id].artifactType === type; });
      const skipSelfGenerated = ["package-validation", "completion-gate-result"].includes(type);
      checks.push(checkRecord("Draft required Artifact present or scheduled: " + type, present || skipSelfGenerated, type, "Required Artifact", "Critical"));
    });
    const completion = source.completionGate;
    if (completion) checks.push(checkRecord("Completion Gate is Allowed", completion.allowed === true && completion.status === "Allowed", completion.status, "Completion Gate", "Critical"));
    const handoff = source.handoff;
    if (handoff) checks.push(checkRecord("IDE-180 Handoff is Ready", handoff.status === "Ready", handoff.status, "Handoff", "Critical"));
    const s = summarize(checks);
    return Object.assign({ id: internal.nextId("IDE-170-PACKAGE-DRAFT-VALIDATION"), valid: s.failed === 0, status: s.failed === 0 ? "Valid" : "Invalid", packageId: draft.packageId }, s, { checks: checks, validatedAt: internal.nowIso(), packageHashValidation: "Performed after Manifest finalization" });
  }

  function evaluateIntelligencePackageCompletionGate(input) {
    const source = input && input.draft ? input : { draft: input };
    const draft = source.draft;
    const context = source.context || {};
    const handoff = source.handoff || null;
    const checks = [];
    const types = new Set();
    if (draft) internal.asArray(draft.artifactOrder).forEach(function type(id) { const artifact = draft.artifactsById[id]; if (artifact) types.add(artifact.artifactType); });
    const sourceStatus = context.sourceIntake && context.sourceIntake.status || "Unknown";
    const canonicalQuality = context.canonicalSnapshot && context.canonicalSnapshot.quality && context.canonicalSnapshot.quality.status || "Unknown";
    const graphStatus = context.graph && context.graph.status || "Unknown";
    const understandingQuality = context.understanding && context.understanding.quality && context.understanding.quality.status || "Unknown";
    const insights = context.understanding ? internal.asArray(context.understanding.insights) : [];
    const evidenceIds = new Set(context.understanding ? internal.asArray(context.understanding.evidence).map(function id(item) { return item && (item.evidenceId || item.id); }).filter(Boolean) : []);
    const insightsHaveEvidence = insights.every(function evidence(insight) {
      const refs = internal.asArray(insight && (insight.evidenceIds || insight.evidence || insight.evidenceReferences));
      return refs.length === 0 ? false : refs.some(function found(ref) { const id = typeof ref === "string" ? ref : ref && (ref.evidenceId || ref.id); return evidenceIds.has(id); });
    });

    checks.push(checkRecord("Source Intake is allowed", !["Blocked", "Invalid"].includes(sourceStatus), sourceStatus, "Source Gate", "Critical"));
    const expectedSourceIntakeId = context.canonicalSnapshot && internal.text(context.canonicalSnapshot.sourceIntakeId, "");
    const actualSourceIntakeId = context.sourceIntake && internal.text(context.sourceIntake.intakeId, "");
    checks.push(checkRecord("Source Intake lineage matches Canonical Snapshot", !expectedSourceIntakeId || expectedSourceIntakeId === actualSourceIntakeId, (actualSourceIntakeId || "Missing") + "/" + (expectedSourceIntakeId || "Not Declared"), "Traceability Gate", "Critical"));
    checks.push(checkRecord("Canonical Snapshot is Valid or allowed Partial", ["Ready", "Partial", "Valid"].includes(canonicalQuality), canonicalQuality, "Snapshot Gate", "Critical"));
    checks.push(checkRecord("Fact Graph is valid", graphStatus === "Frozen" || graphStatus === "Valid" || graphStatus === "Ready", graphStatus, "Graph Gate", "Critical"));
    checks.push(checkRecord("Understanding Result exists and is valid or allowed Partial", Boolean(context.understanding) && ["Ready", "Partial", "Valid"].includes(understandingQuality), understandingQuality, "Understanding Gate", "Critical"));
    checks.push(checkRecord("Insight has Evidence when Insight exists", insights.length === 0 || insightsHaveEvidence, "insights=" + insights.length, "Insight Gate", "Critical"));
    const confidenceStatus = typeof namespace.getConfidenceStatus === "function" ? namespace.getConfidenceStatus() : null;
    checks.push(checkRecord("Confidence Model is valid", Boolean(confidenceStatus && confidenceStatus.ready === true), confidenceStatus && confidenceStatus.status, "Confidence Gate", "Critical"));
    checks.push(checkRecord("Explanation is present", types.has("explanation-record"), "explanation-record", "Explanation Gate", "Critical"));
    ["source-intake-summary", "canonical-snapshot", "repository-baseline", "fact-relationship-graph"].forEach(function required(type) {
      checks.push(checkRecord("Required base Artifact exists: " + type, types.has(type), type, "Artifact Gate", "Critical"));
    });
    const baseIntegrityValid = draft ? internal.asArray(draft.artifactOrder).every(function hash(id) {
      const artifact = draft.artifactsById[id];
      return artifact && artifact.integrity && artifact.integrity.status === "Valid" && /^[a-f0-9]{64}$/.test(String(artifact.integrity.hash || ""));
    }) : false;
    checks.push(checkRecord("Package Artifact integrity is valid", baseIntegrityValid, String(baseIntegrityValid), "Integrity Gate", "Critical"));
    checks.push(checkRecord("IDE-180 Compatibility is valid", Boolean(handoff && handoff.status === "Ready" && handoff.consumer && handoff.consumer.componentId === "IDE-180"), handoff && handoff.status, "Compatibility Gate", "Critical"));
    const criticalIssues = checks.filter(function failed(item) { return item.severity === "Critical" && item.passed !== true; }).length;
    checks.push(checkRecord("Critical Issue count is zero", criticalIssues === 0, criticalIssues, "Critical Gate", "Critical"));
    const s = summarize(checks);
    const allowed = s.failed === 0;
    return {
      gateId: internal.nextId("IDE-170-COMPLETION-GATE"),
      componentId: "IDE-170",
      packageId: draft && draft.packageId || null,
      status: allowed ? "Allowed" : "Blocked",
      allowed: allowed,
      passed: s.passed,
      failed: s.failed,
      total: s.total,
      health: s.health,
      checks: checks,
      sourceStatus: sourceStatus,
      snapshotQuality: canonicalQuality,
      understandingQuality: understandingQuality,
      criticalIssueCount: criticalIssues,
      evaluatedAt: internal.nowIso(),
      repositoryMutationAllowed: false,
      automaticWorkflowExecutionAllowed: false
    };
  }

  function validateIntelligencePackage(packageOrId) {
    const packageRecord = typeof packageOrId === "string" ? namespace.getIntelligencePackage(packageOrId) : internal.clone(packageOrId);
    const checks = [];
    if (!packageRecord) return { id: internal.nextId("IDE-170-PACKAGE-VALIDATION"), valid: false, status: "Invalid", passed: 0, failed: 1, total: 1, health: 0, checks: [checkRecord("Intelligence Package exists", false, "Not Found", "Package", "Critical")], validatedAt: internal.nowIso() };
    checks.push(checkRecord("Intelligence Package ID is present", Boolean(packageRecord.packageId), packageRecord.packageId, "Package", "Critical"));
    checks.push.apply(checks, requiredArtifactChecks(packageRecord));
    artifactEntries(packageRecord).forEach(function validate(artifact) {
      const result = validateTypedArtifact(artifact, packageRecord);
      checks.push(checkRecord("Typed Artifact validates: " + artifact.artifactType, result.valid === true, "failed=" + result.failed, "Artifact Validation", "Critical"));
      checks.push(checkRecord("Blocked Artifact absent: " + artifact.artifactType, artifact.status !== "Blocked" && artifact.status !== "Invalid", artifact.status, "Artifact Validation", "Critical"));
    });
    const manifestValidation = validateManifest(packageRecord);
    checks.push(checkRecord("Manifest Validation PASS", manifestValidation.valid === true, "failed=" + manifestValidation.failed, "Manifest", "Critical"));
    const integrity = validateIntegrity(packageRecord);
    checks.push(checkRecord("Package Integrity PASS", integrity.valid === true, "failed=" + integrity.failed, "Integrity", "Critical"));
    const completionArtifacts = typeMap(packageRecord).get("completion-gate-result") || [];
    const completion = completionArtifacts[0] && completionArtifacts[0].payload;
    checks.push(checkRecord("Completion Gate is Allowed", Boolean(completion && completion.allowed === true && completion.status === "Allowed"), completion && completion.status, "Completion Gate", "Critical"));
    const handoffArtifacts = typeMap(packageRecord).get("ide180-handoff-contract") || [];
    const handoff = handoffArtifacts[0] && handoffArtifacts[0].payload;
    const handoffValidation = typeof namespace.validateIDE180HandoffContract === "function" ? namespace.validateIDE180HandoffContract(handoff, packageRecord) : null;
    checks.push(checkRecord("IDE-180 Handoff validates", Boolean(handoffValidation && handoffValidation.valid === true), handoffValidation && handoffValidation.status, "Handoff", "Critical"));
    checks.push(checkRecord("Package is Frozen and immutable", packageRecord.frozen === true && packageRecord.immutable === true && Boolean(packageRecord.frozenAt), packageRecord.frozenAt, "Freeze", "Critical"));
    if (typeof namespace.validateAgainstSchema === "function") {
      const schema = namespace.validateAgainstSchema("IDE-170-SCHEMA-INTELLIGENCE-PACKAGE", packageRecord);
      checks.push(checkRecord("Package runtime Schema validates", schema.valid === true, "errors=" + internal.asArray(schema.errors).length, "Schema", "Critical"));
    }
    const s = summarize(checks);
    const result = {
      validationId: internal.nextId("IDE-170-PACKAGE-VALIDATION"),
      componentId: "IDE-170",
      packageId: packageRecord.packageId,
      packageHash: packageRecord.manifest && packageRecord.manifest.integrity && packageRecord.manifest.integrity.packageHash || null,
      valid: s.failed === 0,
      status: s.failed === 0 ? "Valid" : "Invalid",
      passed: s.passed,
      failed: s.failed,
      total: s.total,
      health: s.health,
      checks: checks,
      manifestValidation: manifestValidation,
      integrityValidation: integrity,
      completionGate: completion ? internal.clone(completion) : null,
      handoffValidation: handoffValidation ? internal.clone(handoffValidation) : null,
      validatedAt: internal.nowIso()
    };
    state.lastPackageValidation = internal.deepFreeze(internal.clone(result));
    state.packageValidations.set(result.validationId, state.lastPackageValidation);
    internal.touch();
    return internal.clone(result);
  }

  function getPackageValidation(validationId) {
    return internal.clone(state.packageValidations.get(internal.text(validationId, "")) || null);
  }

  function storageAvailable() {
    try {
      if (!global.localStorage) return false;
      const key = "__IDE170_P8_STORAGE_TEST__";
      global.localStorage.setItem(key, "1");
      global.localStorage.removeItem(key);
      return true;
    } catch (_) { return false; }
  }

  function fetchCurrentStaticManifest() {
    if (typeof global.fetch !== "function") return Promise.reject(new Error("fetch API is unavailable."));
    return global.fetch("./00_script_manifest.json?p8receipt=" + Date.now(), { cache: "no-store" }).then(function parse(response) {
      if (!response.ok) throw new Error("Static Manifest fetch failed: HTTP " + response.status);
      return response.json();
    });
  }

  function compactPackagePhaseValidation(source) {
    if (!source) return null;
    return {
      id: source.id,
      componentId: source.componentId,
      version: source.version,
      valid: source.valid,
      status: source.status,
      passed: source.passed,
      failed: source.failed,
      total: source.total,
      health: source.health,
      packageId: source.packageId,
      packageHash: source.packageHash,
      handoffId: source.handoffId,
      completionGate: source.completionGate,
      androidRealDeviceValidation: internal.clone(source.androidRealDeviceValidation || null),
      executedAt: source.executedAt
    };
  }

  function receiptHashPayload(receipt) {
    const copy = internal.clone(receipt || {});
    copy.receiptHash = null;
    return copy;
  }

  function persistPackageReleaseReceipt(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const phase = state.lastPackagePhaseValidation;
    const version = state.lastVersionArchitectureValidation;
    if (!storageAvailable()) return internal.buildResult(false, "PACKAGE_RELEASE_RECEIPT_STORAGE_UNAVAILABLE", "Blocked", null, { error: { message: "localStorage is unavailable.", category: "Storage Failure" } });
    if (!(phase && phase.valid === true && phase.failed === 0 && phase.androidRealDeviceValidation && phase.androidRealDeviceValidation.passed === true && phase.completionGate === "Allowed")) return internal.buildResult(false, "PACKAGE_RELEASE_RECEIPT_NOT_READY", "Not Ready", null);
    if (!(version && version.valid === true && version.failed === 0 && version.releaseGateAllowed === true && version.staticManifestValidated === true && version.fullScriptHashValidated === true)) return internal.buildResult(false, "PACKAGE_RELEASE_RECEIPT_NOT_READY", "Not Ready", null);
    const staticManifest = settings.staticManifest || settings.manifest;
    if (!staticManifest || !/^[a-f0-9]{64}$/.test(String(staticManifest.manifestHash || "")) || !/^[a-f0-9]{64}$/.test(String(staticManifest.scriptSetHash || ""))) return internal.buildResult(false, "PACKAGE_RELEASE_RECEIPT_MANIFEST_REQUIRED", "Blocked", null, { error: { message: "Current Static Manifest identity is required.", category: "Integrity Failure" } });
    const receipt = {
      receiptId: internal.nextId("IDE-170-PHASE8-RELEASE-RECEIPT"),
      schemaVersion: VERSION_MANIFEST.getSchemaVersion(RECEIPT_SCHEMA_ID),
      componentId: "IDE-170",
      releaseVersion: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      manifestHash: staticManifest.manifestHash,
      scriptSetHash: staticManifest.scriptSetHash,
      scriptCount: internal.asArray(staticManifest.scripts).length,
      packageValidation: compactPackagePhaseValidation(phase),
      versionArchitectureValidation: {
        id: version.id,
        valid: version.valid,
        status: version.status,
        passed: version.passed,
        failed: version.failed,
        total: version.total,
        health: version.health,
        staticManifestValidated: version.staticManifestValidated,
        fullScriptHashValidated: version.fullScriptHashValidated,
        releaseGateAllowed: version.releaseGateAllowed
      },
      policy: { sameReleaseRequired: true, sameManifestRequired: true, staleReceiptReleaseAllowed: false, automaticManualConfirmationAllowed: false },
      createdAt: internal.nowIso(),
      receiptHash: null
    };
    receipt.receiptHash = sha256(receiptHashPayload(receipt));
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
      state.lastPackageReleaseReceipt = internal.deepFreeze(internal.clone(receipt));
      state.packageReleasePersistenceStatus = "Persisted";
      internal.touch();
      return internal.buildResult(true, "PACKAGE_RELEASE_RECEIPT_PERSISTED", "Persisted", { receipt: internal.clone(receipt), storageKey: STORAGE_KEY });
    } catch (error) {
      state.packageReleasePersistenceStatus = "Failed";
      return internal.buildResult(false, "PACKAGE_RELEASE_RECEIPT_PERSIST_FAILED", "Failed", null, { error: { message: error.message, category: "Storage Failure" } });
    }
  }

  function loadReceipt() {
    if (!storageAvailable()) return null;
    try { const raw = global.localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }

  function validateReceipt(receipt) {
    const checks = [];
    checks.push(checkRecord("Receipt exists", Boolean(receipt), receipt && receipt.receiptId, "Receipt", "Critical"));
    if (!receipt) return { valid: false, checks: checks };
    checks.push(checkRecord("Receipt release matches", receipt.releaseVersion === VERSION_MANIFEST.release.version, receipt.releaseVersion, "Receipt", "Critical"));
    checks.push(checkRecord("Receipt Manifest Hash is SHA-256", /^[a-f0-9]{64}$/.test(String(receipt.manifestHash || "")), receipt.manifestHash, "Receipt", "Critical"));
    checks.push(checkRecord("Receipt Script Set Hash is SHA-256", /^[a-f0-9]{64}$/.test(String(receipt.scriptSetHash || "")), receipt.scriptSetHash, "Receipt", "Critical"));
    checks.push(checkRecord("Receipt Package Validation passed", receipt.packageValidation && receipt.packageValidation.valid === true && receipt.packageValidation.failed === 0 && receipt.packageValidation.androidRealDeviceValidation && receipt.packageValidation.androidRealDeviceValidation.passed === true, receipt.packageValidation && receipt.packageValidation.status, "Receipt", "Critical"));
    const hash = sha256(receiptHashPayload(receipt));
    checks.push(checkRecord("Receipt Hash matches", hash === receipt.receiptHash, hash, "Receipt", "Critical"));
    const s = summarize(checks);
    return Object.assign({ valid: s.failed === 0, status: s.failed === 0 ? "Valid" : "Invalid" }, s, { checks: checks });
  }

  function restorePackageReleaseReceipt(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const receipt = settings.receipt || loadReceipt();
    if (!receipt) {
      const result = { ok: false, code: "PACKAGE_RELEASE_RECEIPT_NOT_FOUND", status: "Not Found", restored: false, stale: false, checkedAt: internal.nowIso() };
      state.lastPackageReleaseRestore = result;
      state.packageReleasePersistenceStatus = "No Receipt";
      return Promise.resolve(result);
    }
    const structure = validateReceipt(receipt);
    if (!structure.valid) {
      const result = { ok: false, code: "PACKAGE_RELEASE_RECEIPT_INVALID", status: "Invalid", restored: false, stale: true, validation: structure, checkedAt: internal.nowIso() };
      state.lastPackageReleaseRestore = result;
      state.packageReleasePersistenceStatus = "Invalid";
      return Promise.resolve(result);
    }
    return Promise.resolve(settings.currentManifest || fetchCurrentStaticManifest()).then(function restore(manifest) {
      const releaseMatches = receipt.releaseVersion === VERSION_MANIFEST.release.version && manifest.applicationReleaseVersion === VERSION_MANIFEST.release.version;
      const manifestMatches = receipt.manifestHash === manifest.manifestHash;
      const scriptSetMatches = receipt.scriptSetHash === manifest.scriptSetHash;
      const scriptCountMatches = Number(receipt.scriptCount) === internal.asArray(manifest.scripts).length;
      if (!(releaseMatches && manifestMatches && scriptSetMatches && scriptCountMatches)) {
        const result = { ok: false, code: "PACKAGE_RELEASE_RECEIPT_STALE", status: "Stale - Revalidation Required", restored: false, stale: true, checks: { releaseMatches: releaseMatches, manifestMatches: manifestMatches, scriptSetMatches: scriptSetMatches, scriptCountMatches: scriptCountMatches }, checkedAt: internal.nowIso() };
        state.lastPackageReleaseRestore = result;
        state.packageReleasePersistenceStatus = "Stale";
        return result;
      }
      const phase = internal.clone(receipt.packageValidation);
      phase.restoredFromPersistence = true;
      phase.persistedReceiptId = receipt.receiptId;
      const version = internal.clone(receipt.versionArchitectureValidation);
      version.restoredFromPersistence = true;
      version.persistedReceiptId = receipt.receiptId;
      state.lastPackagePhaseValidation = internal.deepFreeze(phase);
      state.lastVersionArchitectureValidation = internal.deepFreeze(version);
      state.lastPackageReleaseReceipt = internal.deepFreeze(internal.clone(receipt));
      state.packageReleasePersistenceStatus = "Restored";
      internal.touch();
      const result = { ok: true, code: "PACKAGE_RELEASE_RECEIPT_RESTORED", status: "Restored", restored: true, stale: false, receiptId: receipt.receiptId, packageId: phase.packageId, packageHash: phase.packageHash, manifestHash: receipt.manifestHash, checkedAt: internal.nowIso() };
      state.lastPackageReleaseRestore = result;
      return result;
    }).catch(function failed(error) {
      const result = { ok: false, code: "PACKAGE_RELEASE_RECEIPT_RESTORE_FAILED", status: "Failed", restored: false, stale: false, error: { message: error.message, category: "Source Failure" }, checkedAt: internal.nowIso() };
      state.lastPackageReleaseRestore = result;
      state.packageReleasePersistenceStatus = "Restore Failed";
      return result;
    });
  }

  function clearPackageReleaseReceipt() {
    try { if (global.localStorage) global.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    state.lastPackageReleaseReceipt = null;
    state.lastPackageReleaseRestore = null;
    state.packageReleasePersistenceStatus = "Cleared";
    internal.touch();
    return internal.buildResult(true, "PACKAGE_RELEASE_RECEIPT_CLEARED", "Cleared", { storageKey: STORAGE_KEY });
  }

  function getPackageReleasePersistenceStatus() {
    const receipt = state.lastPackageReleaseReceipt || loadReceipt();
    return {
      id: "IDE-170-PACKAGE-RELEASE-PERSISTENCE-STATUS",
      version: MODULE_VERSION,
      status: state.packageReleasePersistenceStatus,
      ready: storageAvailable(),
      storageAvailable: storageAvailable(),
      storageKey: STORAGE_KEY,
      receiptPresent: Boolean(receipt),
      receiptId: receipt && receipt.receiptId || null,
      receiptReleaseVersion: receipt && receipt.releaseVersion || null,
      receiptPackageId: receipt && receipt.packageValidation && receipt.packageValidation.packageId || null,
      receiptPackageHash: receipt && receipt.packageValidation && receipt.packageValidation.packageHash || null,
      receiptManifestHash: receipt && receipt.manifestHash || null,
      lastRestore: internal.clone(state.lastPackageReleaseRestore)
    };
  }

  function buildFixtureContext() {
    const now = internal.nowIso();
    const sessionId = "IDE-170-P8-FIXTURE-SESSION";
    const sourceIntake = {
      intakeId: "IDE-170-P8-FIXTURE-INTAKE", sessionId: sessionId, status: "Partial",
      summary: { requestedAdapterCount: 3, readyAdapterCount: 2, partialAdapterCount: 1, unavailableAdapterCount: 0, recordCount: 4 },
      warnings: ["Fixture Workflow source is Partial."],
      adapterResults: [
        { adapterId: "IDE-170-ADAPTER-REPOSITORY", adapterVersion: "1.0.0", sourceType: "repository-file-data", sourceVersion: "1.0.0", status: "Ready", recordCount: 2, capturedAt: now },
        { adapterId: "IDE-170-ADAPTER-PROJECT", adapterVersion: "1.0.0", sourceType: "project-database", sourceVersion: "v6.0", status: "Ready", recordCount: 1, capturedAt: now },
        { adapterId: "IDE-170-ADAPTER-WORKFLOW", adapterVersion: "1.0.0", sourceType: "ide-160-workflow", sourceVersion: "2.0.1", status: "Partial", recordCount: 1, capturedAt: now }
      ], capturedAt: now
    };
    const records = [
      { recordId: "P8-R-PROJECT", recordType: "project", schemaVersion: "1.0.0", identity: { canonicalId: "project:ai-prompt-os", name: "AI Prompt OS", qualifiedName: "AI Prompt OS", aliases: [] }, classification: { domain: "repository" }, source: { adapterId: "IDE-170-ADAPTER-PROJECT", sourceType: "fixture", sourceVersion: "1.0.0" }, metadata: {}, quality: { status: "Valid" }, payload: { version: "6.0" } },
      { recordId: "P8-R-FILE", recordType: "file", schemaVersion: "1.0.0", identity: { canonicalId: "file:13_intelligence_package_model.js", name: "13_intelligence_package_model.js", qualifiedName: "13_intelligence_package_model.js", aliases: [] }, classification: { domain: "repository" }, source: { adapterId: "IDE-170-ADAPTER-REPOSITORY", sourceType: "fixture", sourceVersion: "1.0.0" }, metadata: {}, quality: { status: "Valid" }, payload: { content: "const secret = 'fixture';", path: "13_intelligence_package_model.js" } },
      { recordId: "P8-R-FUNCTION", recordType: "function", schemaVersion: "1.0.0", identity: { canonicalId: "function:13_intelligence_package_model.js::buildIntelligencePackage", name: "buildIntelligencePackage", qualifiedName: "13_intelligence_package_model.js::buildIntelligencePackage", aliases: [] }, classification: { domain: "repository" }, source: { adapterId: "IDE-170-ADAPTER-REPOSITORY", sourceType: "fixture", sourceVersion: "1.0.0" }, metadata: {}, quality: { status: "Valid" }, payload: { file: "13_intelligence_package_model.js" } },
      { recordId: "P8-R-WORKFLOW", recordType: "workflow-package", schemaVersion: "1.0.0", identity: { canonicalId: "workflow:ide160", name: "IDE-160", qualifiedName: "IDE-160 Workflow", aliases: [] }, classification: { domain: "workflow" }, source: { adapterId: "IDE-170-ADAPTER-WORKFLOW", sourceType: "fixture", sourceVersion: "2.0.1" }, metadata: {}, quality: { status: "Partial" }, payload: { status: "Ready" } }
    ];
    const canonical = { snapshotId: "IDE-170-P8-FIXTURE-CANONICAL", snapshotType: "canonical", componentId: "IDE-170", version: "1.0.0", schemaVersion: "1.0.0", sessionId: sessionId, sourceIntakeId: sourceIntake.intakeId, status: "Frozen", records: records, sourceReferences: sourceIntake.adapterResults, summary: { recordCount: records.length, recordTypeCounts: { project: 1, file: 1, function: 1, "workflow-package": 1 }, domainCounts: { repository: 3, workflow: 1 }, validRecordCount: 3, partialRecordCount: 1, issueCount: 0 }, quality: { status: "Partial", completeness: 0.75, warnings: sourceIntake.warnings, errors: [], missingSources: ["IDE-170-ADAPTER-WORKFLOW"] }, validation: { status: "Valid", issueCount: 0, issues: [] }, capturedAt: now, validatedAt: now, frozenAt: now, frozen: true, immutable: true };
    const repository = { snapshotId: "IDE-170-P8-FIXTURE-BASELINE", snapshotType: "Baseline", componentId: "IDE-170", version: "1.0.0", schemaVersion: "1.0.0", sessionId: sessionId, canonicalSnapshotId: canonical.snapshotId, projectId: "project:ai-prompt-os", status: "Frozen", repositoryState: { projects: [], files: [], functions: [], modules: [], configurations: [], architectureObjects: [], qualityRecords: [], workflowRecords: [], changeRecords: [], otherRecords: [] }, changes: [], summary: { projectCount: 1, fileCount: 1, functionCount: 1, moduleCount: 0, recordCount: 4 }, quality: { status: "Partial", warnings: sourceIntake.warnings }, validation: { status: "Valid" }, integrity: { hashAlgorithm: HASH_ALGORITHM, snapshotHash: sha256("p8-fixture-repository"), status: "Valid" }, createdAt: now, frozenAt: now, frozen: true, immutable: true };
    const graph = { graphId: "IDE-170-P8-FIXTURE-GRAPH", graphType: "evidence", sessionId: sessionId, canonicalSnapshotId: canonical.snapshotId, repositorySnapshotId: repository.snapshotId, status: "Frozen", nodes: records.map(function node(r) { return { canonicalId: r.identity.canonicalId, recordType: r.recordType, name: r.identity.name }; }), factEdges: [{ edgeId: "P8-E1", relationshipType: "defines", layer: "fact", sourceNode: { canonicalId: "file:13_intelligence_package_model.js", recordType: "file" }, targetNode: { canonicalId: "function:13_intelligence_package_model.js::buildIntelligencePackage", recordType: "function" }, evidence: [{ evidenceId: "P8-EVIDENCE" }] }], candidateEdges: [], evidenceIndex: { "P8-EVIDENCE": { evidenceId: "P8-EVIDENCE", evidenceType: "source-reference", strength: "direct", recordId: "P8-R-FUNCTION", sourceReference: { adapterId: "IDE-170-ADAPTER-REPOSITORY" } } }, indexes: {}, summary: { nodeCount: 4, edgeCount: 1, factEdgeCount: 1, candidateEdgeCount: 0, evidenceCount: 1 }, validation: { status: "Valid" }, integrity: { hashAlgorithm: HASH_ALGORITHM, graphHash: sha256("p8-fixture-graph"), status: "Valid" }, createdAt: now, frozenAt: now, frozen: true, immutable: true };
    const understanding = { understandingId: "IDE-170-P8-FIXTURE-UNDERSTANDING", understandingType: "repository-workflow", componentId: "IDE-170", version: "1.0.0", schemaVersion: "1.0.0", sessionId: sessionId, status: "Frozen", scope: { canonicalSnapshotId: canonical.snapshotId, repositorySnapshotId: repository.snapshotId, graphId: graph.graphId, sourceCoverage: { status: "Partial", missingSources: ["IDE-170-ADAPTER-WORKFLOW"] } }, facts: [{ factId: "P8-F1", factType: "repository-structure", statement: "Package builder is defined by a Repository file." }], derivedResults: [], insights: [], evidence: [{ evidenceId: "P8-EVIDENCE", strength: "direct" }], rules: ["IDE-170-RULE-REPOSITORY-STRUCTURE"], engines: [], stages: [], quality: { status: "Partial", completeness: 0.75, warnings: sourceIntake.warnings, errors: [], partialScope: true, missingSources: ["IDE-170-ADAPTER-WORKFLOW"] }, summary: { factCount: 1, derivedResultCount: 0, insightCount: 0, evidenceCount: 1, stageCount: 11, warningCount: 1, errorCount: 0 }, integrity: { hashAlgorithm: HASH_ALGORITHM, understandingHash: sha256("p8-fixture-understanding"), status: "Valid" }, createdAt: now, validatedAt: now, frozenAt: now, frozen: true, immutable: true };
    return { ok: true, session: { sessionId: sessionId, state: "Frozen", createdAt: now, frozenAt: now }, sourceIntake: sourceIntake, canonicalSnapshot: canonical, repositorySnapshot: repository, graph: graph, understanding: understanding, typedQueries: [], queryResults: [], envelopes: [] };
  }

  function runPackagePhaseValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group, severity) { checks.push(checkRecord(name, passed, detail, group, severity)); }
    let fixturePackageId = null;
    try {
      const status = typeof namespace.getPackageModelStatus === "function" ? namespace.getPackageModelStatus() : null;
      const handoffStatus = typeof namespace.getIDE180HandoffStatus === "function" ? namespace.getIDE180HandoffStatus() : null;
      const exportStatus = typeof namespace.getIntelligencePackageExportStatus === "function" ? namespace.getIntelligencePackageExportStatus() : null;
      check("Package Model is Ready", Boolean(status && status.ready), status && status.status, "Foundation", "Critical");
      check("IDE-180 Handoff Provider is Ready", Boolean(handoffStatus && handoffStatus.ready), handoffStatus && handoffStatus.status, "Foundation", "Critical");
      check("Package Exporter is Ready", Boolean(exportStatus && exportStatus.ready), exportStatus && exportStatus.status, "Foundation", "Critical");
      check("Official Artifact Type Registry is populated", status && status.artifactTypeCount >= 30, status && status.artifactTypeCount, "Artifact Model", "Critical");
      check("Required Artifact Types are governed", status && status.requiredArtifactTypeCount === 7, status && status.requiredArtifactTypeCount, "Artifact Model", "Critical");
      check("Single giant JSON export is prohibited", status && status.singleGiantJsonExportAllowed === false, status && status.singleGiantJsonExportAllowed, "Governance", "Critical");

      const fixture = buildFixtureContext();
      const built = internal.buildPackageFromResolvedContext(fixture, { packageId: internal.nextId("IDE-170-P8-VALIDATION-PACKAGE"), actor: "IDE-170 Phase 8 Validation" });
      check("Fixture Intelligence Package builds", built && built.ok === true, built && built.code, "Package Build", "Critical");
      if (!built || !built.ok) throw new Error(built && built.error && built.error.message || "Fixture Package build failed.");
      const pkg = built.data.package;
      fixturePackageId = pkg.packageId;
      const mismatchContext = internal.clone(fixture);
      mismatchContext.sourceIntake = internal.clone(fixture.sourceIntake);
      mismatchContext.sourceIntake.intakeId = "IDE-170-P8-FIXTURE-UNRELATED-INTAKE";
      const mismatchBuild = internal.buildPackageFromResolvedContext(mismatchContext, { packageId: internal.nextId("IDE-170-P8-LINEAGE-NEGATIVE"), actor: "IDE-170 Phase 8 Validation" });
      check("Mismatched Source Intake lineage is blocked", Boolean(mismatchBuild && mismatchBuild.ok === false && mismatchBuild.code === "PACKAGE_SOURCE_INTAKE_LINEAGE_MISMATCH"), mismatchBuild && mismatchBuild.code, "Traceability", "Critical");
      check("Package is Frozen", pkg.frozen === true && pkg.immutable === true && pkg.status === "Frozen", pkg.status, "Freeze", "Critical");
      check("Package Version is independent", pkg.packageVersion === VERSION_MANIFEST.contractVersions.intelligencePackage, pkg.packageVersion, "Version", "Critical");
      check("Manifest Version is independent", pkg.manifest.manifestVersion === VERSION_MANIFEST.contractVersions.intelligencePackageManifest, pkg.manifest.manifestVersion, "Version", "Critical");
      check("Package quality may remain Partial without blocking Required Artifacts", pkg.quality.status === "Partial", pkg.quality.status, "Partial Package", "High");
      check("Partial Package exposes limitations", internal.asArray(pkg.quality.limitations).length > 0, internal.asArray(pkg.quality.limitations).length, "Partial Package", "Critical");
      check("Manifest has SHA-256 Manifest Hash", /^[a-f0-9]{64}$/.test(pkg.manifest.integrity.manifestHash), pkg.manifest.integrity.manifestHash, "Integrity", "Critical");
      check("Manifest has SHA-256 Package Hash", /^[a-f0-9]{64}$/.test(pkg.manifest.integrity.packageHash), pkg.manifest.integrity.packageHash, "Integrity", "Critical");
      check("Required Artifact count is satisfied", internal.packageRequiredArtifactTypes.every(function type(t) { return pkg.manifest.artifacts.some(function some(a) { return a.artifactType === t; }); }), pkg.manifest.artifacts.length, "Required Artifact", "Critical");
      check("Package Manifest is separate from Typed Artifacts", !pkg.artifacts.package_manifest, Object.keys(pkg.artifacts).length, "Architecture", "Critical");
      const canonicalArtifact = Object.values(pkg.artifacts).find(function find(a) { return a.artifactType === "canonical-snapshot"; });
      const canonicalText = stableStringify(canonicalArtifact);
      check("Raw Source content is omitted from Package", !canonicalText.includes("const secret = 'fixture';") && canonicalText.includes("contentOmitted"), canonicalText.includes("contentOmitted"), "Privacy", "Critical");
      check("Source provenance remains traceable", canonicalText.includes("IDE-170-ADAPTER-REPOSITORY"), "adapter reference", "Traceability", "Critical");
      const completion = pkg.completionGate;
      check("Completion Gate is Allowed", completion && completion.allowed === true && completion.status === "Allowed", completion && completion.status, "Completion Gate", "Critical");
      check("Completion Gate has zero Critical Issues", completion && completion.criticalIssueCount === 0, completion && completion.criticalIssueCount, "Completion Gate", "Critical");
      const handoff = built.data.handoff;
      check("IDE-180 Handoff is Ready", handoff && handoff.status === "Ready", handoff && handoff.status, "Handoff", "Critical");
      check("Handoff Consumer is IDE-180", handoff && handoff.consumer && handoff.consumer.componentId === "IDE-180", handoff && handoff.consumer && handoff.consumer.componentId, "Handoff", "Critical");
      check("Handoff minimum IDE-180 version is 1.0.0", handoff && handoff.consumer && handoff.consumer.minimumVersion === "1.0.0", handoff && handoff.consumer && handoff.consumer.minimumVersion, "Handoff", "Critical");
      check("Handoff declares only Artifact-backed Capabilities", handoff && !internal.asArray(handoff.availableCapabilities).includes("knowledge-navigation"), stableStringify(handoff && handoff.availableCapabilities), "Handoff", "Critical");
      const packageValidation = validateIntelligencePackage(pkg);
      check("Final Package Validation PASS", packageValidation.valid === true && packageValidation.failed === 0, packageValidation.failed, "Package Validation", "Critical");
      check("Final Package Validation Health 100", packageValidation.health === 100, packageValidation.health, "Package Validation", "Critical");

      const tampered = internal.clone(pkg);
      const tamperArtifact = Object.values(tampered.artifacts)[0];
      tamperArtifact.payload.__tampered = true;
      const tamperValidation = validateIntelligencePackage(tampered);
      check("Artifact tampering is detected", tamperValidation.valid === false, tamperValidation.status, "Tamper Detection", "Critical");
      const manifestTampered = internal.clone(pkg);
      manifestTampered.manifest.integrity.packageHash = "0".repeat(64);
      const manifestTamperValidation = validateIntelligencePackage(manifestTampered);
      check("Package Hash tampering is detected", manifestTamperValidation.valid === false, manifestTamperValidation.status, "Tamper Detection", "Critical");

      const missingRequired = internal.clone(pkg);
      const sourceArtifactId = missingRequired.artifactOrder.find(function find(id) { return missingRequired.artifacts[id].artifactType === "source-intake-summary"; });
      delete missingRequired.artifacts[sourceArtifactId];
      missingRequired.artifactOrder = missingRequired.artifactOrder.filter(function keep(id) { return id !== sourceArtifactId; });
      const missingValidation = validateIntelligencePackage(missingRequired);
      check("Missing Required Artifact blocks Package", missingValidation.valid === false, missingValidation.status, "Required Artifact", "Critical");

      check("Repository mutation remains prohibited", namespace.getStatus().directRepositoryMutationAllowed === false, namespace.getStatus().directRepositoryMutationAllowed, "Safety", "Critical");
      check("Workflow auto-execution remains prohibited", namespace.getStatus().automaticWorkflowExecutionAllowed === false, namespace.getStatus().automaticWorkflowExecutionAllowed, "Safety", "Critical");
      check("GitHub automatic reflection remains prohibited", namespace.getStatus().githubAutomaticReflectionAllowed === false, namespace.getStatus().githubAutomaticReflectionAllowed, "Safety", "Critical");

      const actualPackageId = internal.text(settings.packageId, state.latestIntelligencePackageId || "");
      const actualPackage = actualPackageId ? namespace.getIntelligencePackage(actualPackageId) : null;
      const actualValidation = actualPackage ? validateIntelligencePackage(actualPackage) : null;
      if (settings.androidRealDevicePassed === true) {
        check("Android Release Package is available", Boolean(actualPackage), actualPackageId, "Android", "Critical");
        check("Android Release Package validates", Boolean(actualValidation && actualValidation.valid === true), actualValidation && actualValidation.status, "Android", "Critical");
        check("Android Package Handoff is Ready", Boolean(actualPackage && actualPackage.completionGate && actualPackage.completionGate.allowed === true), actualPackage && actualPackage.completionGate && actualPackage.completionGate.status, "Android", "Critical");
        const lastExport = state.lastIntelligencePackageExport;
        const lastStorage = state.lastIntelligencePackageStorage;
        check("Android Package ZIP export matches Release Package", Boolean(lastExport && lastExport.packageId === actualPackageId && lastExport.status === "Exported" && lastExport.roundTripValidated === true), lastExport && stableStringify({ packageId: lastExport.packageId, status: lastExport.status, roundTripValidated: lastExport.roundTripValidated }), "Android Export", "Critical");
        check("Android IndexedDB save matches Release Package", Boolean(lastStorage && lastStorage.packageId === actualPackageId && lastStorage.persisted === true), lastStorage && stableStringify({ packageId: lastStorage.packageId, persisted: lastStorage.persisted }), "Android Storage", "Critical");
      }

      const s = summarize(checks);
      const targetPackage = settings.androidRealDevicePassed === true && actualPackage ? actualPackage : pkg;
      const targetHandoff = targetPackage && targetPackage.handoffId || null;
      const result = {
        id: internal.nextId("IDE-170-PHASE8-VALIDATION"),
        componentId: "IDE-170",
        version: VERSION_MANIFEST.release.version,
        name: "IDE-170 Phase 8 Intelligence Package Validation",
        valid: s.failed === 0,
        status: s.failed === 0 ? "Passed" : "Failed",
        passed: s.passed,
        failed: s.failed,
        total: s.total,
        health: s.health,
        groups: s.groups,
        checks: checks,
        packageId: targetPackage && targetPackage.packageId || null,
        packageHash: targetPackage && targetPackage.manifest && targetPackage.manifest.integrity && targetPackage.manifest.integrity.packageHash || null,
        handoffId: targetHandoff,
        completionGate: targetPackage && targetPackage.completionGate && targetPackage.completionGate.status || "Blocked",
        phase8Gate: "Passed - Phase 7 Release Frozen",
        ide180HandoffGate: s.failed === 0 && settings.androidRealDevicePassed === true ? "Passed" : s.failed === 0 ? "Blocked - Phase 8 Android Validation Pending" : "Blocked",
        androidRealDeviceValidation: {
          required: true,
          passed: settings.androidRealDevicePassed === true,
          device: internal.text(settings.device || settings.androidDevice, settings.androidRealDevicePassed === true ? "Android Chrome" : ""),
          evidence: internal.text(settings.androidEvidence, ""),
          validatedAt: settings.androidRealDevicePassed === true ? internal.nowIso() : null
        },
        validationEvidenceIntegration: {
          datasetVersion: VERSION_MANIFEST.getDatasetVersion("phase8IntelligencePackage"),
          phase7DatasetVersion: VERSION_MANIFEST.getDatasetVersion("phase7ConfidenceValidation"),
          validationReceiptPresent: Boolean(state.lastValidationGateReceipt),
          validationEvidencePackageId: state.latestValidationEvidencePackageId || null
        },
        executedAt: internal.nowIso()
      };
      state.lastPackagePhaseValidation = internal.deepFreeze(internal.clone(result));
      internal.touch();
      if (settings.androidRealDevicePassed === true && result.valid === true) {
        const staticManifest = settings.staticManifest || null;
        if (staticManifest) result.packageReleasePersistence = persistPackageReleaseReceipt({ staticManifest: staticManifest });
      }
      return internal.clone(result);
    } catch (error) {
      const s = summarize(checks);
      const result = {
        id: internal.nextId("IDE-170-PHASE8-VALIDATION"), componentId: "IDE-170", version: VERSION_MANIFEST.release.version,
        name: "IDE-170 Phase 8 Intelligence Package Validation", valid: false, status: "Failed", passed: s.passed, failed: s.failed + 1, total: s.total + 1,
        health: s.total + 1 ? Number(((s.passed / (s.total + 1)) * 100).toFixed(2)) : 0, groups: s.groups,
        checks: checks.concat([checkRecord("Phase 8 Validation completed without exception", false, error && error.message, "Runtime", "Critical")]),
        packageId: null, packageHash: null, handoffId: null, completionGate: "Blocked", phase8Gate: "Passed - Phase 7 Release Frozen", ide180HandoffGate: "Blocked",
        androidRealDeviceValidation: { required: true, passed: false, device: "", evidence: "", validatedAt: null },
        error: { message: error && error.message ? error.message : String(error), category: "Validation Failure" }, executedAt: internal.nowIso()
      };
      state.lastPackagePhaseValidation = internal.deepFreeze(internal.clone(result));
      internal.touch();
      return result;
    } finally {
      if (fixturePackageId && typeof internal.removeIntelligencePackageForValidation === "function") internal.removeIntelligencePackageForValidation(fixturePackageId);
    }
  }

  function getPackagePhaseValidationStatus() {
    return state.lastPackagePhaseValidation ? internal.clone(state.lastPackagePhaseValidation) : {
      id: "IDE-170-PHASE8-VALIDATION-STATUS", componentId: "IDE-170", version: VERSION_MANIFEST.release.version,
      valid: false, passed: 0, failed: 0, total: 0, health: null, status: "Not Run", androidRealDeviceValidation: { required: true, passed: false }, executedAt: null
    };
  }

  function registerSchema() {
    const existing = namespace.getSchema && namespace.getSchema(RECEIPT_SCHEMA_ID);
    const version = VERSION_MANIFEST.getSchemaVersion(RECEIPT_SCHEMA_ID);
    if (existing && existing.version === version) return { registered: true, existing: true };
    if (existing && internal.removeSchemaForValidation) internal.removeSchemaForValidation(RECEIPT_SCHEMA_ID);
    const result = namespace.registerSchema({
      schemaId: RECEIPT_SCHEMA_ID,
      name: "Phase 8 Release Receipt",
      version: version,
      type: "object",
      required: ["receiptId", "schemaVersion", "componentId", "releaseVersion", "manifestHash", "scriptSetHash", "packageValidation", "versionArchitectureValidation", "createdAt", "receiptHash"],
      properties: { receiptId: { type: "string" }, schemaVersion: { type: "string" }, componentId: { type: "string" }, releaseVersion: { type: "string" }, manifestHash: { type: "string" }, scriptSetHash: { type: "string" }, packageValidation: { type: "object" }, versionArchitectureValidation: { type: "object" }, createdAt: { type: "string" }, receiptHash: { type: "string" } },
      additionalProperties: true, owner: "IDE-170", source: "Architecture Decision 009 / Phase 7 Persistence Extension"
    });
    return { registered: result.ok === true, code: result.code };
  }

  function registerCapability() {
    const existing = namespace.getCapability && namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === CAPABILITY_VERSION) return internal.buildResult(true, "PACKAGE_VALIDATION_CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Intelligence Package Validation and Completion Gate",
      version: CAPABILITY_VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-INTELLIGENCE-PACKAGE", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-INDEPENDENT-VALIDATION", minimumVersion: MINIMUM_VERSION, optional: false },
        { capabilityId: "IDE-170-VERSION-VALIDATION", minimumVersion: MINIMUM_VERSION, optional: false }
      ],
      schemas: [RECEIPT_SCHEMA_ID],
      provides: ["Artifact Validation", "Manifest Validation", "Package Validation", "Completion Gate", "Tamper Detection", "Phase 8 Release Receipt"],
      source: "Architecture Decisions 009-011"
    });
  }

  function getPackageValidationStatus() {
    return {
      id: "IDE-170-PACKAGE-VALIDATION-STATUS",
      version: MODULE_VERSION,
      capabilityVersion: CAPABILITY_VERSION,
      status: namespace.getCapability && namespace.getCapability(CAPABILITY_ID) ? "Ready" : "Loaded",
      ready: Boolean(namespace.getCapability && namespace.getCapability(CAPABILITY_ID)),
      validationCount: state.packageValidations.size,
      latestValidationId: state.lastPackageValidation && state.lastPackageValidation.validationId || null,
      phase8ValidationStatus: state.lastPackagePhaseValidation && state.lastPackagePhaseValidation.status || "Not Run",
      completionGateSupported: true,
      tamperDetection: true,
      releasePersistenceStatus: state.packageReleasePersistenceStatus
    };
  }

  function initializePackageValidation() {
    const schema = registerSchema();
    const capability = registerCapability();
    const ready = schema.registered === true && capability.ok === true;
    namespace.modules.packageValidation.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "PACKAGE_VALIDATION_INITIALIZED" : "PACKAGE_VALIDATION_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { schema: schema, capability: capability });
  }

  Object.assign(namespace.api, {
    initializePackageValidation: initializePackageValidation,
    validateTypedIntelligenceArtifact: validateTypedArtifact,
    validateIntelligencePackageManifest: validateManifest,
    validateIntelligencePackageIntegrity: validateIntegrity,
    validateIntelligencePackageDraft: validateIntelligencePackageDraft,
    validateIntelligencePackage: validateIntelligencePackage,
    evaluateIntelligencePackageCompletionGate: evaluateIntelligencePackageCompletionGate,
    getPackageValidation: getPackageValidation,
    runPackagePhaseValidation: runPackagePhaseValidation,
    getPackagePhaseValidationStatus: getPackagePhaseValidationStatus,
    persistPackageReleaseReceipt: persistPackageReleaseReceipt,
    restorePackageReleaseReceipt: restorePackageReleaseReceipt,
    clearPackageReleaseReceipt: clearPackageReleaseReceipt,
    getPackageReleasePersistenceStatus: getPackageReleasePersistenceStatus,
    getPackageValidationStatus: getPackageValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.packageValidation = {
    id: CAPABILITY_ID,
    version: MODULE_VERSION,
    capabilityVersion: CAPABILITY_VERSION,
    status: "Loaded",
    artifactValidation: true,
    manifestValidation: true,
    packageValidation: true,
    completionGate: true,
    releaseReceiptPersistence: true,
    automaticManualConfirmationAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.validateIntelligencePackagePhase = runPackagePhaseValidation;
})(typeof window !== "undefined" ? window : globalThis);
