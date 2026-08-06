/* ============================================================
   FILE: 13_intelligence_validation_evidence.js
   IDE-170 Intelligence Platform
   Version: 1.3.0
   Architecture Decision: 011
   Phase: Validation Automation Foundation (Pre-Phase 4)
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Validation Evidence blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.3.0";
  const CAPABILITY_ID = "IDE-170-VALIDATION-EVIDENCE-PACKAGE";
  const PACKAGE_TYPE = "Immutable Validation Evidence Package";

  if (!(state.validationEvidencePackages instanceof Map)) state.validationEvidencePackages = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestValidationEvidencePackageId")) {
    state.latestValidationEvidencePackageId = null;
  }
  if (!Object.prototype.hasOwnProperty.call(state, "lastAutomationValidation")) {
    state.lastAutomationValidation = null;
  }

  function stableStringify(value) {
    return typeof internal.stableStringify === "function"
      ? internal.stableStringify(value)
      : JSON.stringify(value);
  }

  function sha256(value) {
    return namespace.calculateSHA256(typeof value === "string" ? value : stableStringify(value));
  }

  function jsonText(value) {
    return JSON.stringify(value, null, 2) + "\n";
  }

  function sanitizeFilePart(value) {
    return String(value == null ? "" : value)
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown";
  }

  function collectAuditRecords(run) {
    return namespace.getAuditRecords({ limit: 500 }).filter(function related(record) {
      return record.targetId === run.validationRunId || record.sessionId === run.validationRunId ||
        ["AUTOMATED_VALIDATION_COMPLETED", "VALIDATION_RUN_FROZEN", "MANUAL_CONFIRMATION_RECORDED"].includes(record.action);
    });
  }

  function buildEvidenceArtifacts(run, dataset) {
    const failed = run.caseResults.filter(function filter(result) { return result.status === "Failed" || result.status === "Error"; });
    const blocked = run.caseResults.filter(function filter(result) { return result.status === "Blocked"; });
    const artifacts = {
      "test-dataset.json": jsonText(dataset),
      "execution-results.json": jsonText(run.caseResults),
      "expectation-comparison.json": jsonText(run.comparisons),
      "validation-summary.json": jsonText(run.summary),
      "failed-cases.json": jsonText(failed),
      "blocked-cases.json": jsonText(blocked),
      "environment.json": jsonText(run.environment),
      "capability-versions.json": jsonText(run.capabilityVersions),
      "audit-records.json": jsonText(collectAuditRecords(run)),
      "manual-confirmations.json": jsonText(run.manualConfirmations),
      "execution-log.txt": run.executionLog.join("\n") + "\n"
    };
    const integrity = Object.keys(artifacts).sort().map(function mapArtifact(path) {
      return { path: path, sha256: sha256(artifacts[path]), size: artifacts[path].length };
    });
    artifacts["integrity-hashes.json"] = jsonText({
      algorithm: "SHA-256",
      validationRunId: run.validationRunId,
      artifacts: integrity,
      generatedAt: internal.nowIso()
    });
    return artifacts;
  }

  function buildManifest(run, dataset, artifacts) {
    const artifactEntries = Object.keys(artifacts).sort().map(function mapArtifact(path) {
      return {
        path: path,
        mediaType: path.endsWith(".json") ? "application/json" : "text/plain",
        size: artifacts[path].length,
        sha256: sha256(artifacts[path]),
        required: true
      };
    });
    const manifest = {
      packageId: internal.nextId("IDE-170-VALIDATION-EVIDENCE"),
      packageType: PACKAGE_TYPE,
      componentId: namespace.componentId,
      componentVersion: namespace.version,
      phase: "Validation Automation Foundation (Pre-Phase 4)",
      designFreezeVersion: namespace.designFreezeVersion,
      architectureDecisionVersion: "IDE-170-ARCHITECTURE-DECISION-011-v1.0.0",
      datasetId: dataset.datasetId,
      datasetVersion: dataset.version,
      validationRunId: run.validationRunId,
      executionEnvironment: internal.clone(run.environment),
      executedAt: run.completedAt,
      frozenAt: run.frozenAt,
      resultSummary: internal.clone(run.summary),
      releaseGate: {
        requiredGatePassed: run.summary.requiredGatePassed,
        releaseAllowed: run.summary.releaseAllowed,
        nextPhaseAllowed: run.summary.nextPhaseAllowed
      },
      artifacts: artifactEntries,
      manifestHash: null,
      packageHashVersion: "1.0.0"
    };
    manifest.manifestHash = sha256(Object.assign({}, manifest, { manifestHash: null }));
    return manifest;
  }

  async function createZipBlob(manifest, artifacts, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    if (typeof global.JSZip !== "function") {
      const error = new Error("JSZip is not available.");
      error.code = "JSZIP_UNAVAILABLE";
      throw error;
    }
    const zip = new global.JSZip();
    zip.file("manifest.json", jsonText(manifest));
    Object.keys(artifacts).forEach(function addArtifact(path) { zip.file(path, artifacts[path]); });
    return zip.generateAsync({ type: settings.blobType || "blob" });
  }

  async function buildValidationEvidencePackage(validationRunId, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const run = namespace.getValidationRun(validationRunId);
    if (!run) return internal.buildResult(false, "VALIDATION_RUN_NOT_FOUND", "Blocked", null, {
      error: { message: "Validation Run was not found.", category: "Input Failure" }
    });
    if (run.status !== "Frozen" || run.frozen !== true) {
      return internal.buildResult(false, "VALIDATION_RUN_NOT_FROZEN", "Blocked", { validationRunId: validationRunId }, {
        error: { message: "Validation Run must be Frozen before Evidence Package generation.", category: "Governance Failure" }
      });
    }
    const dataset = namespace.getTestDataset(run.datasetId);
    if (!dataset) return internal.buildResult(false, "TEST_DATASET_NOT_FOUND", "Blocked", null, {
      error: { message: "Test Dataset was not found.", category: "Input Failure" }
    });

    if (typeof settings.onProgress === "function") settings.onProgress({ stage: "Integrity Hashing", progress: 25, timestamp: internal.nowIso() });
    const artifacts = buildEvidenceArtifacts(run, dataset);
    const manifest = buildManifest(run, dataset, artifacts);
    const fileName = "IDE-170_Validation_Evidence_Pre-Phase-4_" + sanitizeFilePart(namespace.version) + "_" +
      new Date().toISOString().replace(/[:.]/g, "-") + ".zip";
    if (settings.cancelled === true || (settings.signal && settings.signal.aborted)) {
      return internal.buildResult(false, "EVIDENCE_PACKAGE_CANCELLED", "Cancelled", null, {
        error: { message: "Evidence Package generation was cancelled.", category: "Cancellation" }
      });
    }
    if (typeof settings.onProgress === "function") settings.onProgress({ stage: "Package Generation", progress: 60, timestamp: internal.nowIso() });
    const blob = await createZipBlob(manifest, artifacts, settings);
    const record = internal.deepFreeze({
      packageId: manifest.packageId,
      fileName: fileName,
      manifest: manifest,
      artifacts: artifacts,
      status: "Frozen",
      immutable: true,
      generatedAt: internal.nowIso()
    });
    state.validationEvidencePackages.set(record.packageId, record);
    state.latestValidationEvidencePackageId = record.packageId;
    internal.touch();
    internal.appendAudit({
      action: "VALIDATION_EVIDENCE_PACKAGE_GENERATED",
      actor: internal.text(settings.actor, "Project Owner"),
      targetType: "Evidence Package",
      targetId: record.packageId,
      outcome: "Succeeded",
      detail: { validationRunId: run.validationRunId, artifactCount: Object.keys(artifacts).length, manifestHash: manifest.manifestHash }
    });

    if (settings.download === true && global.document && global.URL && typeof global.URL.createObjectURL === "function") {
      const anchor = global.document.createElement("a");
      anchor.href = global.URL.createObjectURL(blob);
      anchor.download = fileName;
      anchor.click();
      setTimeout(function revoke() { global.URL.revokeObjectURL(anchor.href); }, 1000);
    }
    if (typeof settings.onProgress === "function") settings.onProgress({ stage: "Complete", progress: 100, timestamp: internal.nowIso() });
    return {
      ok: true,
      id: internal.nextId("IDE-170-RESULT"),
      code: "VALIDATION_EVIDENCE_PACKAGE_GENERATED",
      status: "Frozen",
      data: {
        packageId: record.packageId,
        fileName: fileName,
        manifest: internal.clone(manifest),
        artifactCount: Object.keys(artifacts).length
      },
      blob: blob,
      warnings: [],
      error: null,
      createdAt: internal.nowIso()
    };
  }

  function getValidationEvidencePackage(packageId) {
    const record = state.validationEvidencePackages.get(internal.text(packageId, ""));
    return record ? internal.clone(record) : null;
  }

  function listValidationEvidencePackages() {
    return [...state.validationEvidencePackages.values()]
      .map(function mapPackage(record) {
        return {
          packageId: record.packageId,
          fileName: record.fileName,
          status: record.status,
          manifestHash: record.manifest.manifestHash,
          generatedAt: record.generatedAt
        };
      })
      .sort(function sortPackage(left, right) { return left.generatedAt.localeCompare(right.generatedAt); });
  }

  async function loadPackageInput(input) {
    if (typeof input === "string") {
      const record = state.validationEvidencePackages.get(input);
      if (!record) throw Object.assign(new Error("Evidence Package was not found."), { code: "EVIDENCE_PACKAGE_NOT_FOUND" });
      return { manifest: internal.clone(record.manifest), artifacts: internal.clone(record.artifacts) };
    }
    if (internal.isPlainObject(input) && input.manifest && input.artifacts) {
      return { manifest: internal.clone(input.manifest), artifacts: internal.clone(input.artifacts) };
    }
    if (typeof global.JSZip !== "function") throw Object.assign(new Error("JSZip is not available."), { code: "JSZIP_UNAVAILABLE" });
    const zip = await global.JSZip.loadAsync(input);
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) throw Object.assign(new Error("manifest.json is missing."), { code: "EVIDENCE_MANIFEST_MISSING" });
    const manifest = JSON.parse(await manifestFile.async("string"));
    const artifacts = {};
    for (const artifact of manifest.artifacts || []) {
      const file = zip.file(artifact.path);
      if (file) artifacts[artifact.path] = await file.async("string");
    }
    return { manifest: manifest, artifacts: artifacts };
  }

  async function validateValidationEvidencePackage(input) {
    try {
      const loaded = await loadPackageInput(input);
      const manifest = loaded.manifest;
      const artifacts = loaded.artifacts;
      const checks = [];
      function check(name, passed, detail) { checks.push({ name: name, passed: passed === true, detail: internal.text(detail, "") }); }
      check("Manifest exists", Boolean(manifest), manifest && manifest.packageId);
      check("Package type is governed", manifest && manifest.packageType === PACKAGE_TYPE, manifest && manifest.packageType);
      check("Component Version is present", Boolean(manifest && manifest.componentVersion), manifest && manifest.componentVersion);
      const computedManifestHash = manifest ? sha256(Object.assign({}, manifest, { manifestHash: null })) : null;
      check("Manifest Hash is valid", Boolean(manifest && manifest.manifestHash === computedManifestHash), computedManifestHash);
      const artifactEntries = manifest && Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
      artifactEntries.forEach(function validateArtifact(entry) {
        const content = artifacts[entry.path];
        check("Artifact exists: " + entry.path, typeof content === "string", entry.path);
        check("Artifact Hash is valid: " + entry.path, typeof content === "string" && sha256(content) === entry.sha256, entry.sha256);
      });
      const passed = checks.filter(function count(item) { return item.passed; }).length;
      return {
        id: internal.nextId("IDE-170-EVIDENCE-VALIDATION"),
        componentId: namespace.componentId,
        valid: checks.length > 0 && passed === checks.length,
        passed: passed,
        failed: checks.length - passed,
        total: checks.length,
        checks: checks,
        packageId: manifest && manifest.packageId,
        validatedAt: internal.nowIso()
      };
    } catch (error) {
      return {
        id: internal.nextId("IDE-170-EVIDENCE-VALIDATION"),
        componentId: namespace.componentId,
        valid: false,
        passed: 0,
        failed: 1,
        total: 1,
        checks: [{ name: "Evidence Package could be loaded", passed: false, detail: internal.text(error && error.message, String(error)) }],
        error: { code: internal.text(error && error.code, "EVIDENCE_PACKAGE_VALIDATION_FAILED"), message: internal.text(error && error.message, String(error)) },
        validatedAt: internal.nowIso()
      };
    }
  }

  function summarizeFoundationChecks(checks) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const groups = {};
    checks.forEach(function group(item) {
      groups[item.group] = groups[item.group] || { passed: 0, failed: 0, total: 0 };
      groups[item.group].total += 1;
      if (item.passed) groups[item.group].passed += 1;
      else groups[item.group].failed += 1;
    });
    return { passed: passed, failed: checks.length - passed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0, groups: groups };
  }

  async function runValidationAutomationFoundationValidation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    const progressEvents = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group || "Foundation", severity: "High" });
    }
    try {
      const datasetId = "IDE-170-DATASET-VALIDATION-AUTOMATION-FOUNDATION";
      const dataset = namespace.getTestDataset(datasetId);
      const datasetValidation = namespace.validateTestDataset(dataset);
      check("Test Dataset Registry module is Ready", Boolean(namespace.modules.testDatasetRegistry && namespace.modules.testDatasetRegistry.status === "Ready"), JSON.stringify(namespace.modules.testDatasetRegistry), "Module");
      check("Validation Automation module is Ready", Boolean(namespace.modules.validationAutomation && namespace.modules.validationAutomation.status === "Ready"), JSON.stringify(namespace.modules.validationAutomation), "Module");
      check("Validation Evidence module is Ready", Boolean(namespace.modules.validationEvidence && namespace.modules.validationEvidence.status === "Ready"), JSON.stringify(namespace.modules.validationEvidence), "Module");
      check("Foundation Dataset exists", Boolean(dataset), datasetId, "Dataset");
      check("Foundation Dataset is Frozen", Boolean(dataset && dataset.status === "Frozen"), dataset && dataset.status, "Dataset");
      check("Foundation Dataset validation passes", datasetValidation.valid === true, "passed=" + datasetValidation.passed + "/" + datasetValidation.total, "Dataset");
      check("Foundation Dataset has SHA-256 Hash", Boolean(dataset && dataset.datasetHash && dataset.datasetHash.length === 64), dataset && dataset.datasetHash, "Integrity");
      check("Built-in Validation Targets are registered", namespace.listValidationTargets().length >= 6, "count=" + namespace.listValidationTargets().length, "Runner");

      const runResult = await namespace.runAutomatedValidation(datasetId, {
        actor: internal.text(settings.actor, "IDE-170 Validation Automation"),
        onProgress: function captureProgress(event) { progressEvents.push(event); }
      });
      check("Automated Validation Run completes", runResult.ok === true, runResult.code, "Runner");
      const runId = runResult.ok ? runResult.data.validationRun.validationRunId : null;
      let run = runId ? namespace.getValidationRun(runId) : null;
      check("Automated Validation produces seven Case Results", Boolean(run && run.caseResults.length === 7), run && run.caseResults.length, "Runner");
      check("Progress Events are generated", progressEvents.length > 0, "count=" + progressEvents.length, "Runner");
      check("Case execution is isolated", Boolean(run && run.caseResults.every(function result(item) { return item.resultId && item.status; })), "Case Results", "Runner");
      check("Manual Confirmation blocks Release before confirmation", Boolean(run && run.summary.requiredGatePassed === false && run.summary.blocked === 1), JSON.stringify(run && run.summary), "Manual Confirmation");

      if (run && settings.androidRealDevicePassed === true) {
        const manualResult = namespace.addManualConfirmation(runId, {
          caseId: "IDE-170-TEST-ANDROID-MANUAL-CONFIRMATION",
          testType: "Android Real Device Confirmation",
          description: "Validation Automation Foundation Android Chrome checks completed.",
          required: true,
          confirmed: true,
          confirmedBy: internal.text(settings.confirmedBy || settings.actor, "Project Owner"),
          device: internal.text(settings.device, "Android Chrome"),
          evidence: internal.text(settings.androidEvidence, "Android Validation Automation Foundation checks passed.")
        }, { actor: internal.text(settings.actor, "Project Owner") });
        check("Required Manual Confirmation can be recorded", manualResult.ok === true, manualResult.code, "Manual Confirmation");
        run = namespace.getValidationRun(runId);
      } else {
        check("Required Manual Confirmation remains explicit", Boolean(run && run.manualConfirmations.length === 0), "Pending", "Manual Confirmation");
      }

      const ide160Result = run && run.caseResults.find(function find(item) { return item.caseId === "IDE-170-TEST-IDE160-RUNTIME-READY"; });
      check("IDE-160 runtime Expected Result is evaluated", Boolean(ide160Result && ide160Result.status === "Passed"), ide160Result && ide160Result.status, "Regression");
      const manifestResult = run && run.caseResults.find(function find(item) { return item.caseId === "IDE-170-TEST-STATIC-MANIFEST"; });
      check("Static Manifest Expected Result is evaluated", Boolean(manifestResult && manifestResult.status === "Passed"), manifestResult && manifestResult.status, "Regression");
      const zipApiResult = run && run.caseResults.find(function find(item) { return item.caseId === "IDE-170-TEST-PROJECT-ZIP-API"; });
      check("Project ZIP APIs Expected Result is evaluated", Boolean(zipApiResult && zipApiResult.status === "Passed"), zipApiResult && zipApiResult.status, "Regression");

      const freezeResult = namespace.freezeValidationRun(runId, { actor: internal.text(settings.actor, "IDE-170 Validation Automation") });
      check("Validation Run can be Frozen", freezeResult.ok === true, freezeResult.code, "Integrity");
      run = namespace.getValidationRun(runId);
      check("Frozen Validation Run is immutable", Boolean(run && run.status === "Frozen" && run.frozen === true), run && run.status, "Integrity");
      check("Validation Run has SHA-256 Hash", Boolean(run && run.runHash && run.runHash.length === 64), run && run.runHash, "Integrity");

      const packageResult = await buildValidationEvidencePackage(runId, {
        actor: internal.text(settings.actor, "IDE-170 Validation Automation"),
        download: settings.downloadEvidence === true,
        blobType: settings.blobType || "blob"
      });
      check("Validation Evidence ZIP can be generated", packageResult.ok === true, packageResult.code, "Evidence Package");
      check("Evidence Package contains standard Artifacts", Boolean(packageResult.ok && packageResult.data.artifactCount >= 12), packageResult.ok && packageResult.data.artifactCount, "Evidence Package");
      const packageValidation = packageResult.ok
        ? await validateValidationEvidencePackage(packageResult.data.packageId)
        : { valid: false, passed: 0, failed: 1, total: 1 };
      check("Validation Evidence Package passes re-validation", packageValidation.valid === true, "passed=" + packageValidation.passed + "/" + packageValidation.total, "Evidence Package");

      let tamperDetected = false;
      if (packageResult.ok) {
        const stored = getValidationEvidencePackage(packageResult.data.packageId);
        const tampered = internal.clone(stored);
        tampered.artifacts["validation-summary.json"] = "{}\n";
        const tamperValidation = await validateValidationEvidencePackage({ manifest: tampered.manifest, artifacts: tampered.artifacts });
        tamperDetected = tamperValidation.valid === false;
      }
      check("Evidence Package tampering is detected", tamperDetected, String(tamperDetected), "Evidence Package");
      check("Repository automatic mutation remains prohibited", namespace.getStatus().directRepositoryMutationAllowed === false, String(namespace.getStatus().directRepositoryMutationAllowed), "Safety");
      check("Automatic Workflow execution remains prohibited", namespace.getStatus().automaticWorkflowExecutionAllowed === false, String(namespace.getStatus().automaticWorkflowExecutionAllowed), "Safety");
      check("Automatic Startup Test execution remains prohibited", namespace.modules.validationAutomation.automaticStartupExecution === false, String(namespace.modules.validationAutomation.automaticStartupExecution), "Safety");

      const summary = summarizeFoundationChecks(checks);
      const androidPassed = settings.androidRealDevicePassed === true;
      const requiredRunGatePassed = Boolean(run && run.summary && run.summary.requiredGatePassed === true);
      const result = {
        id: internal.nextId("IDE-170-AUTOMATION-FOUNDATION-VALIDATION"),
        componentId: namespace.componentId,
        name: "IDE-170 Validation Automation Foundation Validation",
        version: VERSION,
        architectureDecision: "IDE-170-ARCHITECTURE-DECISION-011",
        valid: summary.failed === 0 && requiredRunGatePassed && androidPassed,
        codeValidationPassed: summary.failed === 0 || (summary.failed === 1 && !androidPassed),
        passed: summary.passed,
        failed: summary.failed,
        total: summary.total,
        health: summary.health,
        status: summary.failed === 0 && requiredRunGatePassed && androidPassed
          ? "Passed"
          : summary.failed === 0 || (!androidPassed && summary.failed === 1)
            ? "Conditional"
            : "Failed",
        groups: summary.groups,
        checks: checks,
        validationRunId: runId,
        datasetId: datasetId,
        evidencePackageId: packageResult.ok ? packageResult.data.packageId : null,
        evidenceFileName: packageResult.ok ? packageResult.data.fileName : null,
        evidencePackageValidation: packageValidation,
        androidRealDeviceValidation: {
          required: true,
          passed: androidPassed,
          device: internal.text(settings.device, androidPassed ? "Android Chrome" : ""),
          evidence: internal.text(settings.androidEvidence, ""),
          validatedAt: androidPassed ? internal.nowIso() : null
        },
        phase4Gate: summary.failed === 0 && requiredRunGatePassed && androidPassed ? "Passed" : "Blocked",
        executedAt: internal.nowIso()
      };
      state.lastAutomationValidation = internal.clone(result);
      internal.touch();
      if (typeof internal.registerExternalIntegration === "function") internal.registerExternalIntegration();
      result.releaseStatus = namespace.getReleaseStatus();
      state.lastAutomationValidation = internal.clone(result);
      return internal.clone(result);
    } catch (error) {
      const summary = summarizeFoundationChecks(checks);
      const result = {
        id: internal.nextId("IDE-170-AUTOMATION-FOUNDATION-VALIDATION"),
        componentId: namespace.componentId,
        name: "IDE-170 Validation Automation Foundation Validation",
        version: VERSION,
        valid: false,
        codeValidationPassed: false,
        passed: summary.passed,
        failed: summary.failed + 1,
        total: summary.total + 1,
        health: summary.total + 1 ? Number(((summary.passed / (summary.total + 1)) * 100).toFixed(2)) : 0,
        status: "Failed",
        groups: summary.groups,
        checks: checks.concat([{ name: "Foundation Validation completed without exception", passed: false, detail: internal.text(error && error.message, String(error)), group: "Runtime", severity: "Critical" }]),
        error: { code: internal.text(error && error.code, "AUTOMATION_FOUNDATION_VALIDATION_FAILED"), message: internal.text(error && error.message, String(error)) },
        androidRealDeviceValidation: { required: true, passed: false, device: "", evidence: "", validatedAt: null },
        phase4Gate: "Blocked",
        executedAt: internal.nowIso()
      };
      state.lastAutomationValidation = internal.clone(result);
      internal.touch();
      return result;
    }
  }

  function getValidationAutomationFoundationStatus() {
    return state.lastAutomationValidation
      ? internal.clone(state.lastAutomationValidation)
      : {
          id: "IDE-170-AUTOMATION-FOUNDATION-VALIDATION-STATUS",
          componentId: namespace.componentId,
          version: VERSION,
          valid: false,
          status: "Not Run",
          passed: 0,
          failed: 0,
          total: 0,
          health: null,
          phase4Gate: "Blocked",
          executedAt: null
        };
  }

  function registerEvidenceSchemas() {
    const definitions = [
      {
        schemaId: "IDE-170-SCHEMA-VALIDATION-EVIDENCE-MANIFEST",
        name: "Validation Evidence Manifest",
        version: VERSION,
        type: "object",
        required: ["packageId", "packageType", "componentId", "componentVersion", "datasetId", "datasetVersion", "validationRunId", "artifacts", "manifestHash"],
        properties: {
          packageId: { type: "string", minLength: 1 },
          packageType: { type: "string", enum: [PACKAGE_TYPE] },
          componentId: { type: "string", enum: ["IDE-170"] },
          componentVersion: { type: "string", format: "semver" },
          datasetId: { type: "string", minLength: 1 },
          datasetVersion: { type: "string", format: "semver" },
          validationRunId: { type: "string", minLength: 1 },
          artifacts: { type: "array" },
          manifestHash: { type: "string", minLength: 64 }
        },
        owner: "IDE-170",
        source: "Architecture Decision 011"
      }
    ];
    return definitions.map(function register(definition) {
      if (namespace.getSchema && namespace.getSchema(definition.schemaId)) return { schemaId: definition.schemaId, registered: true, existing: true };
      const result = namespace.registerSchema(definition);
      return { schemaId: definition.schemaId, registered: result.ok === true, code: result.code };
    });
  }

  function registerEvidenceCapability() {
    if (namespace.getCapability && namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: namespace.getCapability(CAPABILITY_ID) });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Immutable Validation Evidence Package",
      version: VERSION,
      type: "Package",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-VALIDATION-AUTOMATION", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-VALIDATION-EVIDENCE-MANIFEST"],
      provides: ["Evidence ZIP", "Manifest", "Artifact Hash", "Tamper Detection"],
      source: "Architecture Decision 011"
    });
  }

  function initializeValidationEvidence() {
    const schemaResults = registerEvidenceSchemas();
    const capabilityResult = registerEvidenceCapability();
    const ready = schemaResults.every(function readySchema(item) { return item.registered; }) && capabilityResult.ok === true;
    return internal.buildResult(ready,
      ready ? "VALIDATION_EVIDENCE_INITIALIZED" : "VALIDATION_EVIDENCE_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capabilityResult },
      ready ? {} : { error: { message: "Validation Evidence initialization failed.", category: "Initialization Failure" } }
    );
  }

  function removeValidationEvidencePackageForValidation(packageId) {
    const id = internal.text(packageId, "");
    const removed = state.validationEvidencePackages.delete(id);
    if (state.latestValidationEvidencePackageId === id) state.latestValidationEvidencePackageId = null;
    return removed;
  }

  Object.assign(internal, {
    removeValidationEvidencePackageForValidation: removeValidationEvidencePackageForValidation
  });
  Object.assign(namespace.api, {
    initializeValidationEvidence: initializeValidationEvidence,
    buildValidationEvidencePackage: buildValidationEvidencePackage,
    validateValidationEvidencePackage: validateValidationEvidencePackage,
    getValidationEvidencePackage: getValidationEvidencePackage,
    listValidationEvidencePackages: listValidationEvidencePackages,
    runValidationAutomationFoundationValidation: runValidationAutomationFoundationValidation,
    getValidationAutomationFoundationStatus: getValidationAutomationFoundationStatus
  });
  Object.assign(namespace, {
    buildValidationEvidencePackage: buildValidationEvidencePackage,
    validateValidationEvidencePackage: validateValidationEvidencePackage,
    getValidationEvidencePackage: getValidationEvidencePackage,
    listValidationEvidencePackages: listValidationEvidencePackages,
    runValidationAutomationFoundationValidation: runValidationAutomationFoundationValidation,
    getValidationAutomationFoundationStatus: getValidationAutomationFoundationStatus
  });

  namespace.modules.validationEvidence = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    immutablePackage: true,
    zipExport: true,
    artifactHash: true,
    manifestValidation: true,
    tamperDetection: true,
    sourceCodePackageSeparated: true,
    loadedAt: internal.nowIso()
  };

  global.validateIntelligenceAutomationFoundation = runValidationAutomationFoundationValidation;
  global.buildIntelligenceValidationEvidencePackage = buildValidationEvidencePackage;
  global.validateIntelligenceValidationEvidencePackage = validateValidationEvidencePackage;
})(typeof window !== "undefined" ? window : globalThis);
