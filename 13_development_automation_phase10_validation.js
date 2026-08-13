/* ============================================================
   FILE: 13_development_automation_phase10_validation.js
   IDE-190 Development Automation
   Release: 1.9.0 / Module: Phase 10 Final Validation 1.0.0
   Phase 10: Integrated / Android Final Validation
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Phase 10 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase10Validation");
  const EXPECTED_RELEASE = "1.9.0";
  const EXPECTED_PHASE = "Phase 10 Integrated / Android Final Validation";
  const EXPECTED_SCRIPT_COUNT = 226;
  const PHASE10_FILE = "13_development_automation_phase10_validation.js";

  function ide190Phase10AndroidTrialTarget(value) {
    return value + 1900;
  }

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({
          name: name,
          passed: passed === true,
          detail: detail == null ? "" : (typeof detail === "string" ? detail : JSON.stringify(detail)),
          group: group || "General",
          severity: severity || "Critical"
        });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function item(check) { return check.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function item(check) { return !check.passed && check.severity === "Critical"; }).length;
    return { passed: passed, failed: failed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0, criticalFailed: criticalFailed };
  }

  function finish(checks, stage, extras) {
    const summary = summarize(checks);
    return Object.assign({
      id: internal.nextId(stage === "B" ? "IDE-190-PHASE10-ANDROID-FINAL-VALIDATION" : "IDE-190-PHASE10-STAGE-A-VALIDATION"),
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: summary.failed === 0
        ? (stage === "B" ? "IDE-190 Phase 10 Integrated / Android Final Validation PASS" : "IDE-190 Phase 10 Stage A Integrated Validation PASS")
        : (stage === "B" ? "IDE-190 Phase 10 Integrated / Android Final Validation FAIL" : "IDE-190 Phase 10 Stage A Integrated Validation FAIL"),
      checks: checks,
      validatedAt: internal.nowIso(),
      stage: stage,
      stageName: stage === "B" ? "Phase 10 Integrated / Android Final Validation" : "Phase 10 Integrated Deterministic / Pre-Android Validation"
    }, extras || {});
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function sortKey(key) { output[key] = stableValue(value[key]); });
    return output;
  }
  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256(input) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return null;
    let bytes;
    if (input instanceof ArrayBuffer) bytes = input;
    else if (ArrayBuffer.isView(input)) bytes = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    else bytes = new global.TextEncoder().encode(String(input == null ? "" : input)).buffer;
    const digest = await global.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function hex(byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function normalizeScriptPath(src) { return String(src || "").trim().split("#")[0].split("?")[0].replace(/^\.\//, ""); }
  function getHashQuery(src) { const match = String(src || "").match(/[?&]h=([a-f0-9]+)/i); return match ? match[1] : ""; }
  async function fetchText(path) {
    const url = typeof global.URL === "function" && global.document && global.document.baseURI ? new global.URL(path, global.document.baseURI).href : path;
    const response = await global.fetch(url, { cache: "no-store" });
    if (!response || response.ok !== true) throw new Error("Fetch failed: " + path + " / " + (response && response.status));
    return response.text();
  }

  async function verifyStaticRuntime() {
    const output = {
      ok: false, manifest: null, manifestStructureValid: false, manifestIntegrityValid: false,
      scriptCount: 0, fetchedScriptCount: 0, scriptHashMismatchCount: 0,
      scriptByteSizeMismatchCount: 0, scriptCacheKeyMismatchCount: 0, fetchFailureCount: 0,
      mismatches: [], indexScriptSequenceMatches: false, indexLocalScriptCount: 0,
      indexManifestHashMatches: false, computedScriptSetHash: null, computedManifestHash: null
    };
    try {
      const manifest = JSON.parse(await fetchText("./00_script_manifest.json"));
      output.manifest = manifest;
      const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
      const hashes = manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};
      output.scriptCount = scripts.length;
      output.manifestStructureValid = Boolean(
        manifest.manifestSchemaVersion === "2.0.0" && manifest.versionArchitecture === "independent-version-v1" &&
        manifest.hashAlgorithm === "SHA-256" && scripts.length === EXPECTED_SCRIPT_COUNT &&
        scripts.every(function validScript(src) { return typeof src === "string" && /\.js(?:\?|$)/i.test(src); }) &&
        new Set(scripts.map(normalizeScriptPath)).size === scripts.length
      );
      const scriptSetPayload = scripts.map(function mapScript(src) {
        const path = normalizeScriptPath(src);
        return path + ":" + String(hashes[path] && hashes[path].sha256 || "");
      }).join("\n");
      output.computedScriptSetHash = await sha256(scriptSetPayload);
      const manifestPayload = JSON.parse(JSON.stringify(manifest));
      delete manifestPayload.manifestHash;
      delete manifestPayload.updatedAt;
      output.computedManifestHash = await sha256(stableStringify(manifestPayload));
      output.manifestIntegrityValid = Boolean(output.computedScriptSetHash === manifest.scriptSetHash && output.computedManifestHash === manifest.manifestHash);

      let cursor = 0;
      async function worker() {
        while (cursor < scripts.length) {
          const index = cursor; cursor += 1;
          const src = scripts[index]; const path = normalizeScriptPath(src); const expected = hashes[path] || {};
          try {
            const url = typeof global.URL === "function" && global.document && global.document.baseURI ? new global.URL(src, global.document.baseURI).href : src;
            const response = await global.fetch(url, { cache: "no-store" });
            if (!response || response.ok !== true) throw new Error("HTTP " + (response && response.status));
            const data = await response.arrayBuffer(); const actualHash = await sha256(data); output.fetchedScriptCount += 1;
            if (actualHash !== expected.sha256) { output.scriptHashMismatchCount += 1; output.mismatches.push({ path: path, type: "sha256", expected: expected.sha256, actual: actualHash }); }
            if (Number(expected.byteSize) !== data.byteLength) { output.scriptByteSizeMismatchCount += 1; output.mismatches.push({ path: path, type: "byteSize", expected: expected.byteSize, actual: data.byteLength }); }
            const cacheKey = String(expected.sha256 || "").slice(0, 12);
            if (expected.cacheKey !== cacheKey || getHashQuery(src) !== cacheKey) { output.scriptCacheKeyMismatchCount += 1; output.mismatches.push({ path: path, type: "cacheKey" }); }
          } catch (error) { output.fetchFailureCount += 1; output.mismatches.push({ path: path, type: "fetch", error: error && error.message || String(error) }); }
        }
      }
      await Promise.all(Array.from({ length: Math.min(8, scripts.length) }, worker));
      const indexText = await fetchText("./index.html");
      const scriptSources = []; const regex = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi; let match;
      while ((match = regex.exec(indexText))) { const src = match[1]; if (!/^(?:https?:)?\/\//i.test(src) && /\.js(?:\?|$)/i.test(src)) scriptSources.push(src); }
      output.indexLocalScriptCount = scriptSources.length;
      output.indexScriptSequenceMatches = JSON.stringify(scriptSources.map(normalizeScriptPath)) === JSON.stringify(scripts.map(normalizeScriptPath));
      const meta = indexText.match(/<meta\s+name=["']ai-pro-script-manifest-hash["']\s+content=["']([a-f0-9]{64})["']/i);
      output.indexManifestHashMatches = Boolean(meta && meta[1] === manifest.manifestHash);
      output.ok = Boolean(output.manifestStructureValid && output.manifestIntegrityValid && output.fetchedScriptCount === scripts.length && output.scriptHashMismatchCount === 0 && output.scriptByteSizeMismatchCount === 0 && output.scriptCacheKeyMismatchCount === 0 && output.fetchFailureCount === 0 && output.indexScriptSequenceMatches && output.indexManifestHashMatches);
    } catch (error) { output.error = error && error.message || String(error); }
    return output;
  }

  async function buildMutationFlow(grounding, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const plan = await namespace.createAutomationPlan({
      groundingId: grounding.groundingId,
      objective: internal.text(settings.objective, "IDE-190 Phase 10 integrated controlled mutation trial"),
      operation: {
        operationType: "Controlled Mutation Trial", capabilityId: "IDE-150-CONTROLLED-MUTATION", target: grounding.canonicalTarget,
        scope: { type: "controlled-function-trial", targetFile: settings.targetFile, targetFunction: settings.targetFunction },
        parameters: { targetComponentId: "IDE-150", adapterId: "IDE-160-ADAPTER-IDE-150", adapterOperation: internal.text(settings.prepareOperation, "Prepare Controlled Application"), adapterInput: internal.clone(settings.prepareInput || {}) }
      },
      automationLevel: "L4", mutationLevel: "M2", requestedExecutionMode: "E1", externalEffectLevel: "X0",
      repositoryBaseline: settings.repositoryBaseline || { repositoryBaselineId: "IDE-190-PHASE10-BASELINE", repositoryHash: "IDE-190-PHASE10-BASELINE-HASH" }
    });
    const proposal = plan && plan.ok ? await namespace.createAutomationProposal({ planId: plan.data.plan.planId, summary: "Integrated controlled mutation trial with mandatory rollback" }) : null;
    const dryRun = proposal && proposal.ok ? await namespace.runAutomationDryRun({ proposalId: proposal.data.proposal.proposalId }) : null;
    const preflight = dryRun && dryRun.ok ? await namespace.runAutomationPreflight({ dryRunId: dryRun.data.dryRun.dryRunId }) : null;
    let approvalRequest = null, approval = null, gate = null, dispatch = null;
    if (preflight && preflight.ok) {
      approvalRequest = await namespace.requestAutomationApproval({ preflightId: preflight.data.preflight.preflightId, expiresInMs: 120000 });
      if (approvalRequest && approvalRequest.ok) {
        approval = namespace.grantAutomationApproval({ approvalRequestId: approvalRequest.data.request.approvalRequestId, actor: internal.text(settings.actor, "Phase 10 Project Owner Validator"), actorRole: "Project Owner", reason: internal.text(settings.reason, "Explicit Phase 10 integrated controlled mutation trial"), explicitApproval: true });
        if (approval && approval.ok) gate = await namespace.evaluateAuthorizationGate({ preflightId: preflight.data.preflight.preflightId, approvalId: approval.data.approval.approvalId });
      }
    }
    if (gate && gate.ok) dispatch = await namespace.dispatchAutomationFromGate({ gateId: gate.data.gate.gateId });
    return {
      plan: plan && plan.data && plan.data.plan || null,
      proposal: proposal && proposal.data && proposal.data.proposal || null,
      dryRun: dryRun && dryRun.data && dryRun.data.dryRun || null,
      preflight: preflight && preflight.data && preflight.data.preflight || null,
      approval: approval && approval.data && approval.data.approval || null,
      gate: gate && gate.data && gate.data.gate || null,
      executionResult: dispatch && dispatch.data && dispatch.data.executionResult || null
    };
  }

  function buildInMemoryTrialFixture() {
    const before = ["function phase10ControlledTarget(value) {", "  return value + 10;", "}"].join("\n");
    const after = ["function phase10ControlledTarget(value) {", "  const result = value + 10;", "  return result;", "}"].join("\n");
    const repository = { "phase10-controlled-validation.js": before };
    return {
      fileName: "phase10-controlled-validation.js", functionName: "phase10ControlledTarget", before: before, after: after, repository: repository,
      adapter: { getFileText: function(name) { return Object.prototype.hasOwnProperty.call(repository, name) ? repository[name] : null; }, setFileText: function(name, value) { if (!Object.prototype.hasOwnProperty.call(repository, name)) return false; repository[name] = String(value); return true; } },
      prepareInput: { sources: [{ fileName: "phase10-controlled-validation.js", code: before }], targetFile: "phase10-controlled-validation.js", targetFunction: "phase10ControlledTarget", beforeFunctionSource: before, afterFunctionSource: after, recommendationId: "IDE-190-PHASE10-CONTROLLED-VALIDATION", recommendationSummary: "Validate IDE-190 final integrated mutation chain.", objective: "Temporarily mutate, validate, and mandatorily roll back an isolated function.", actor: "Phase 10 Project Owner Validator" }
    };
  }

  function hashIDE150Source(value) {
    const source = String(value == null ? "" : value); let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function getProjectSource(fileName) {
    if (typeof global.getProjectFile !== "function") return "";
    const file = global.getProjectFile(fileName);
    return file ? String(file.code || file.text || file.content || file.value || "") : "";
  }

  async function ensureProjectSource(fileName) {
    let source = getProjectSource(fileName); let refresh = "Not Required";
    if (!source && typeof global.loadCurrentProjectFileByFetch === "function") {
      const script = global.document ? Array.from(global.document.querySelectorAll("script[src]")).find(function find(item) { const src = String(item && item.getAttribute("src") || ""); return normalizeScriptPath(src).split("/").pop() === fileName; }) : null;
      const path = script ? script.getAttribute("src") : fileName;
      const loaded = await global.loadCurrentProjectFileByFetch(path); refresh = loaded === true ? "Refreshed: " + path : "Refresh Failed: " + path; source = getProjectSource(fileName);
    }
    return { source: source, refresh: refresh };
  }

  async function validateRecoveryIsolation(check) {
    const snapshot = {
      repositoryIntegrityRecords: new Map(state.repositoryIntegrityRecords), rollbackRestorationRecords: new Map(state.rollbackRestorationRecords),
      failureRecords: new Map(state.failureRecords), recoveryDecisions: new Map(state.recoveryDecisions), recoveryVerifications: new Map(state.recoveryVerifications),
      repositoryMutationTrust: internal.clone(state.repositoryMutationTrust), mutationTrialLock: internal.clone(state.mutationTrialLock),
      latestFailureRecordId: state.latestFailureRecordId, latestRecoveryDecisionId: state.latestRecoveryDecisionId, latestRecoveryVerificationId: state.latestRecoveryVerificationId
    };
    try {
      const targetFile = "00_core.js"; const sourceResult = await ensureProjectSource(targetFile); const originalSource = sourceResult.source;
      check("Recovery source is available", Boolean(originalSource), originalSource.length + " | " + sourceResult.refresh, "Recovery", "Critical");
      if (!originalSource) return null;
      const sourceKey = "IDE-190-PHASE10-SYNTHETIC-RECOVERY"; const originalHash = hashIDE150Source(originalSource);
      state.repositoryIntegrityRecords.set(sourceKey, { repositoryIntegrityRecordId: "IDE-190-PHASE10-SYNTHETIC-V6", mutationTrialId: "IDE-190-PHASE10-SYNTHETIC-TRIAL", targetFile: targetFile, targetFunction: "synthetic", originalHash: originalHash, restoredHash: "mismatch", sourceRestored: false, integrityStatus: "Failed" });
      state.rollbackRestorationRecords.set(sourceKey, { rollbackRestorationRecordId: "IDE-190-PHASE10-SYNTHETIC-V7", mutationTrialId: "IDE-190-PHASE10-SYNTHETIC-TRIAL", rollbackId: "IDE-190-PHASE10-SYNTHETIC-ROLLBACK", restorationStatus: "Recovery-Required", repositoryTrustStatus: "Untrusted" });
      state.repositoryMutationTrust = { status: "Untrusted", reason: "Synthetic Phase 10 recovery verification fixture", mutationTrialId: sourceKey, rollbackId: "IDE-190-PHASE10-SYNTHETIC-ROLLBACK", markedAt: internal.nowIso() };
      state.mutationTrialLock = { active: false, mutationTrialId: null, acquiredAt: null, releasedAt: internal.nowIso() };
      const failureResult = namespace.createAutomationFailureRecord({ sourcePhase: 6, sourceRecordId: sourceKey, category: "Rollback", directCause: "Rollback verification did not prove exact restoration.", mutationStarted: true, rollbackVerified: false, sourceRestored: false, outcome: "Recovery-Required", evidence: [{ type: "V7", id: "IDE-190-PHASE10-SYNTHETIC-V7" }] });
      const failure = failureResult && failureResult.data && failureResult.data.failure;
      check("Rollback Failure is Critical Non-Retryable", Boolean(failure && failure.severity === "Critical" && failure.retryEligibility === "Non-Retryable" && failure.rootCauseInferred === false), failure && failure.retryEligibility, "Recovery", "Critical");
      const decisionResult = failure ? namespace.createAutomationRecoveryDecision({ failureRecordId: failure.failureRecordId, action: "Verify-Restoration", actorRole: "Project Owner", explicitDecision: true, evidence: [{ type: "Manual Restoration Evidence", id: "PHASE10-RESTORATION-EVIDENCE" }] }) : null;
      const decision = decisionResult && decisionResult.data && decisionResult.data.recoveryDecision;
      check("Critical Recovery binds Project Owner decision", Boolean(decisionResult && decisionResult.ok && decision), decisionResult && decisionResult.code, "Recovery", "Critical");
      const verified = decision ? namespace.verifyAutomationRepositoryRecovery({ recoveryDecisionId: decision.recoveryDecisionId, explicitVerification: true, targetFile: targetFile, expectedOriginalSource: originalSource }) : null;
      const proof = verified && verified.data && verified.data.recoveryVerification;
      check("Exact Source/Hash Recovery restores Trust with zero writes", Boolean(verified && verified.ok && proof && proof.sourceExact === true && proof.hashExact === true && proof.repositoryWriteCount === 0 && state.repositoryMutationTrust.status === "Trusted"), verified && verified.code, "Recovery", "Critical");
      return proof;
    } finally {
      state.repositoryIntegrityRecords = snapshot.repositoryIntegrityRecords; state.rollbackRestorationRecords = snapshot.rollbackRestorationRecords;
      state.failureRecords = snapshot.failureRecords; state.recoveryDecisions = snapshot.recoveryDecisions; state.recoveryVerifications = snapshot.recoveryVerifications;
      state.repositoryMutationTrust = snapshot.repositoryMutationTrust; state.mutationTrialLock = snapshot.mutationTrialLock;
      state.latestFailureRecordId = snapshot.latestFailureRecordId; state.latestRecoveryDecisionId = snapshot.latestRecoveryDecisionId; state.latestRecoveryVerificationId = snapshot.latestRecoveryVerificationId; internal.touch();
    }
  }

  async function validateSessionAuditReceipt(check, useNative) {
    if (useNative) namespace.setAutomationPersistenceAdapter(null);
    else namespace.setAutomationPersistenceAdapter(namespace.createMemoryAutomationPersistenceAdapter());
    if (typeof namespace.initializeAutomationPersistence === "function") namespace.initializeAutomationPersistence();
    namespace.clearAutomationRuntimeSessions();
    const sessionResult = namespace.createAutomationSession({ actor: "Project Owner" }); const session = sessionResult && sessionResult.data && sessionResult.data.session;
    check("Automation Session creates runtime-only", Boolean(sessionResult && sessionResult.ok && session && session.runtimeOnly === true && session.globalTransactionId === null), sessionResult && sessionResult.code, "Audit / Receipt", "Critical");
    if (!session) { if (!useNative) namespace.setAutomationPersistenceAdapter(null); return null; }
    const refs = [
      { ownerComponentId: "IDE-180", recordType: "navigation", recordId: "IDE-180-PHASE10-INTEGRATED", authoritative: true },
      { ownerComponentId: "IDE-160", recordType: "workflow", recordId: "IDE-160-PHASE10-INTEGRATED", authoritative: true },
      { ownerComponentId: "IDE-150", recordType: "controlled-mutation", recordId: "IDE-150-PHASE10-INTEGRATED", authoritative: true }
    ];
    refs.forEach(function bind(reference) { namespace.bindAutomationSessionReference({ automationSessionId: session.automationSessionId, reference: reference }); });
    const a1 = await namespace.appendAutomationAuditEvent({ automationSessionId: session.automationSessionId, eventType: "Integrated-Validation", summary: "Phase 10 integrated validation evidence recorded.", outcome: "Completed", actor: "Project Owner", sourceComponentId: "IDE-190", federatedReferences: refs });
    const a2 = await namespace.appendAutomationAuditEvent({ automationSessionId: session.automationSessionId, eventType: "Safety-Boundary", summary: "Safety ceiling remains fail-closed.", outcome: "Completed", actor: "Project Owner", sourceComponentId: "IDE-190", federatedReferences: refs });
    check("Append-only Audit Events persist", Boolean(a1 && a1.ok && a2 && a2.ok), (a1 && a1.code) + " / " + (a2 && a2.code), "Audit / Receipt", "Critical");
    const chain = await namespace.verifyAutomationAuditChain(session.automationSessionId);
    check("Audit hash chain verifies", chain && chain.valid === true, chain && chain.lastEventHash, "Audit / Receipt", "Critical");
    namespace.closeAutomationSession({ automationSessionId: session.automationSessionId, outcome: "Completed" });
    const built = await namespace.buildAutomationReceipt({ automationSessionId: session.automationSessionId }); const receipt = built && built.data && built.data.receipt;
    const verified = receipt ? await namespace.verifyAutomationReceipt(receipt) : null;
    check("V8 Automation Receipt builds with SHA-256 integrity", Boolean(built && built.ok && verified && verified.valid === true && receipt && receipt.globalTransactionId === null), receipt && receipt.integrity && receipt.integrity.hash, "Audit / Receipt", "Critical");
    const persisted = receipt ? await namespace.persistFinalAutomationReceipt({ receipt: receipt }) : null;
    const readback = receipt ? await namespace.getPersistedAutomationReceipt(receipt.automationReceiptId) : null;
    check("Automation Receipt persists and reads back", Boolean(persisted && persisted.ok && readback && readback.automationReceiptId === receipt.automationReceiptId), receipt && receipt.automationReceiptId, "Audit / Receipt", "Critical");
    namespace.clearAutomationRuntimeSessions();
    const restored = receipt ? await namespace.restoreAutomationReceipt(receipt.automationReceiptId) : null;
    check("Receipt restore never recreates Runtime Session", Boolean(restored && restored.ok && namespace.getAutomationSessionStatus().sessionCount === 0), namespace.getAutomationSessionStatus().sessionCount, "Audit / Receipt", "Critical");
    if (!useNative) namespace.setAutomationPersistenceAdapter(null);
    return receipt;
  }

  async function runDevelopmentAutomationPhase10Validation() {
    const c = collector(), check = c.check;
    const init = namespace.initialize({ requireIDE180: true, requireIDE160: true });
    check("Foundation initialization succeeds", init && init.ok === true, init && init.code, "Initialization", "Critical");
    check("Release Version is 1.9.0", VERSION_MANIFEST.release.version === EXPECTED_RELEASE, VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 10", VERSION_MANIFEST.release.phase === 10 && VERSION_MANIFEST.release.implementationPhase === EXPECTED_PHASE, VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains exact", VERSION_MANIFEST.release.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Manifest", "Critical");
    check("Phases 1 through 9 are recorded complete", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6,7,8,9]), VERSION_MANIFEST.implementation.completedPhases, "Phase Gate", "Critical");
    check("Frozen lifecycle remains exact", JSON.stringify(VERSION_MANIFEST.lifecycle) === JSON.stringify(["Intake","Ground","Plan","Propose","Preflight","Gate","Dispatch","Verify","Close"]), VERSION_MANIFEST.lifecycle, "Lifecycle", "Critical");
    check("Validation Layers remain V0 through V8", JSON.stringify(VERSION_MANIFEST.validationLayers.map(function(v){return v.id;})) === JSON.stringify(["V0","V1","V2","V3","V4","V5","V6","V7","V8"]), VERSION_MANIFEST.validationLayers.map(function(v){return v.id;}), "Lifecycle", "Critical");
    Object.keys(VERSION_MANIFEST.safety).forEach(function safety(key) { check("Safety flag remains disabled: " + key, VERSION_MANIFEST.safety[key] === false, VERSION_MANIFEST.safety[key], "Safety", "Critical"); });
    check("Persistent Commit remains prohibited", VERSION_MANIFEST.initialPolicy.persistentCommitAllowed === false, VERSION_MANIFEST.initialPolicy.persistentCommitAllowed, "Safety", "Critical");
    check("Mandatory Rollback remains required", VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresMandatoryRollback === true, VERSION_MANIFEST.initialPolicy.controlledMutationTrialRequiresMandatoryRollback, "Safety", "Critical");
    check("X2/X3 external effects remain prohibited", VERSION_MANIFEST.externalEffectLevels.filter(function(x){return x.id === "X2" || x.id === "X3";}).every(function(x){return x.initialPolicy === "PROHIBITED";}), "X2/X3", "Safety", "Critical");

    const dependency = namespace.getDependencyStatus();
    check("IDE-180 dependency is compatible", dependency.ide180VersionCompatible === true && dependency.ide180HandoffContractCompatible === true, dependency.ide180ReleaseVersion, "Dependencies", "Critical");
    check("IDE-160 dependency is compatible", dependency.ide160VersionCompatible === true && dependency.ide160AdapterInvocationApiAvailable === true, dependency.ide160ReleaseVersion, "Dependencies", "Critical");
    check("IDE-150 Controlled Mutation Adapter remains registered through IDE-160", dependency.ide150AdapterRegisteredInIDE160 === true && dependency.ide150ControlledMutationAdapter === true, dependency.ide150AdapterRegisteredInIDE160, "Dependencies", "Critical");
    check("All Phase 1-9 contracts remain registered", namespace.listContractDefinitions().length === 28, namespace.listContractDefinitions().length, "Contracts", "Critical");
    const foundationStateDefinition = namespace.getContractDefinition("foundationState");
    check("Foundation State Contract is Phase 10 capable", Boolean(foundationStateDefinition && foundationStateDefinition.version === "1.9.0"), foundationStateDefinition && foundationStateDefinition.version, "Contracts", "Critical");

    const api = namespace.getPublicApiDescription();
    ["intakeImplemented","groundingImplemented","planningImplemented","proposalImplemented","dryRunImplemented","preflightImplemented","gateImplemented","approvalImplemented","consentImplemented","dispatchImplemented","mutationImplemented","recoveryImplemented","sessionImplemented","auditImplemented","persistenceImplemented","receiptImplemented","reflectionPackageImplemented","uiImplemented","crossDeviceImplemented","finalValidationImplemented"].forEach(function flag(key) { check("Integrated API available: " + key, api[key] === true, api[key], "Modules", "Critical"); });
    check("Persistent Mutation remains unimplemented", api.persistentMutationImplemented === false, api.persistentMutationImplemented, "Safety", "Critical");

    const grounded = await namespace.intakeAndGroundLatestIDE180Navigation(); const grounding = grounded && grounded.ok && grounded.data && grounded.data.grounding;
    check("V0 IDE-180 Grounding is fresh and Grounded", Boolean(grounding && grounding.groundingStatus === "Grounded"), grounding && grounding.groundingStatus, "Integrated Lifecycle", "Critical");
    let flow = null, trial = null, trialRecord = null, v6 = null, v7 = null;
    if (grounding) {
      const fixture = buildInMemoryTrialFixture();
      flow = await buildMutationFlow(grounding, { objective: "Phase 10 in-memory integrated Controlled Mutation Trial", targetFile: fixture.fileName, targetFunction: fixture.functionName, prepareInput: fixture.prepareInput, repositoryBaseline: { repositoryBaselineId: "IDE-190-PHASE10-INMEMORY-BASELINE", repositoryHash: "IDE-190-PHASE10-INMEMORY-HASH" } });
      check("Plan / Proposal / Dry Run / Preflight chain completes", Boolean(flow.plan && flow.proposal && flow.dryRun && flow.preflight && flow.preflight.preflightStatus === "Passed"), flow.preflight && flow.preflight.preflightStatus, "Integrated Lifecycle", "Critical");
      check("P2 Project Owner Approval binds L4/M2/E1", Boolean(flow.approval && flow.approval.actorRole === "Project Owner" && flow.preflight.approvalClassRequired === "P2"), flow.approval && flow.approval.actorRole, "Integrated Lifecycle", "Critical");
      check("V4 Authorization Gate passes", Boolean(flow.gate && flow.gate.gateStatus === "Passed" && flow.gate.dispatchEligible === true), flow.gate && flow.gate.gateStatus, "Integrated Lifecycle", "Critical");
      check("V5 IDE-160 Prepare succeeds with zero Repository writes", Boolean(flow.executionResult && flow.executionResult.dispatchStatus === "Succeeded" && flow.executionResult.repositoryWriteCount === 0 && flow.executionResult.adapterOutput && flow.executionResult.adapterOutput.prepared === true), flow.executionResult && flow.executionResult.adapterOperation, "Integrated Lifecycle", "Critical");
      const before = fixture.repository[fixture.fileName];
      trial = flow.executionResult ? await namespace.executeAutomationControlledMutationTrial({ executionResultId: flow.executionResult.executionResultId, executeTrial: true, adapter: fixture.adapter, rollbackReason: "Phase 10 deterministic mandatory rollback", validator: function(info) { return Boolean(info && typeof info.functionSource === "string" && info.functionSource.includes("const result = value + 10;")); } }) : null;
      trialRecord = trial && trial.data && trial.data.mutationTrial; v6 = trial && trial.data && trial.data.repositoryIntegrity; v7 = trial && trial.data && trial.data.rollbackRestoration;
      check("Controlled Mutation Trial completes through IDE-160", Boolean(trial && trial.ok && trialRecord && trialRecord.ide160InvocationUsed === true && trialRecord.directIDE150Call === false), trial && trial.code, "Integrated Mutation", "Critical");
      check("Temporary Mutation applies and post-validation passes", Boolean(trialRecord && trialRecord.temporaryMutationApplied === true && trialRecord.postValidationPassed === true && v6 && v6.repositoryWriteCount >= 2), v6 && v6.repositoryWriteCount, "Integrated Mutation", "Critical");
      check("V6 Repository Integrity is Verified", Boolean(v6 && v6.integrityStatus === "Verified" && v6.sourceRestored === true && v6.persistentCommit === false && v6.zipFileMutation === false), v6 && v6.integrityStatus, "Integrated Mutation", "Critical");
      check("V7 Mandatory Rollback / Restoration is Verified", Boolean(v7 && v7.mandatoryRollback === true && v7.rollbackExecuted === true && v7.rollbackVerified === true && v7.sourceRestored === true && v7.restorationStatus === "Verified"), v7 && v7.restorationStatus, "Integrated Mutation", "Critical");
      check("In-memory source restores byte-for-byte", fixture.repository[fixture.fileName] === before, fixture.repository[fixture.fileName] === before, "Integrated Mutation", "Critical");
    }
    check("Repository remains Trusted after integrated Mutation", namespace.getAutomationMutationTrustStatus().status === "Trusted", namespace.getAutomationMutationTrustStatus().status, "Repository Trust", "Critical");
    check("Mutation Lock is released after integrated Mutation", namespace.getAutomationMutationLockStatus().active === false, namespace.getAutomationMutationLockStatus().active, "Mutation Lock", "Critical");
    const persistentBlocked = await namespace.executeAutomationControlledMutationTrial({ executionResultId: "PHASE10-DENY", executeTrial: true, retainCommit: true });
    check("Persistent Commit request is hard-denied", Boolean(persistentBlocked && persistentBlocked.ok === false && persistentBlocked.code === "IDE190_PERSISTENT_COMMIT_PROHIBITED"), persistentBlocked && persistentBlocked.code, "Safety", "Critical");

    const hiddenTimeout = namespace.startAutomationTimeoutWatch({ operationId: "PHASE10-NO-DEFAULT" });
    check("Timeout has no hidden default", Boolean(hiddenTimeout && hiddenTimeout.ok === false && hiddenTimeout.code === "IDE190_TIMEOUT_EXPLICIT_DURATION_REQUIRED"), hiddenTimeout && hiddenTimeout.code, "Failure / Timeout", "Critical");
    await validateRecoveryIsolation(check);

    const receipt = await validateSessionAuditReceipt(check, false);
    check("Stage A V8 Receipt excludes Runtime Session persistence", Boolean(receipt && receipt.selectivePersistence && receipt.selectivePersistence.sessionRecreatedOnRestore === false && receipt.selectivePersistence.excluded.includes("automation-session")), receipt && receipt.automationReceiptId, "Audit / Receipt", "Critical");

    const cross = namespace.validateAutomationCrossDeviceParity();
    check("Cross-Device sensitive permission parity verifies", Boolean(cross && cross.ok && cross.data && cross.data.record && cross.data.record.parityVerified === true), cross && cross.code, "Cross-Device", "Critical");
    const projection = namespace.getDevelopmentAutomationUIProjection();
    check("UI grants no Approval / Dispatch / Mutation / Repository write", Boolean(projection && projection.uiCapabilities && projection.uiCapabilities.approvalAction === false && projection.uiCapabilities.dispatchAction === false && projection.uiCapabilities.mutationAction === false && projection.uiCapabilities.repositoryWriteAction === false && projection.uiCapabilities.githubWriteAction === false), projection && projection.uiCapabilities, "UI", "Critical");
    const reflection = await namespace.prepareAutomationReflectionPackage({ filePaths: ["13_development_automation_reflection.js"], actorRole: "Project Owner" });
    const reflectionPackage = reflection && reflection.data && reflection.data.package;
    check("X1 Reflection Package remains explicit and user-mediated", Boolean(reflection && reflection.ok && reflectionPackage && reflectionPackage.externalEffectLevel === "X1" && reflectionPackage.userMediated === true && reflectionPackage.githubWrite === false && reflectionPackage.repositoryWriteCount === 0 && reflectionPackage.persistentCommit === false), reflection && reflection.code, "Reflection", "Critical");

    check("Stage A does not release IDE-190", state.androidPhase10ValidationPassed !== true, state.androidPhase10ValidationPassed, "Release Gate", "Critical");
    const result = finish(c.checks, "A", {
      preDevicePassed: false, androidRealDeviceRequired: true, androidRealDevicePassed: false, phaseGatePassed: false,
      phase10Complete: false, ide190Complete: false, releaseAllowed: false,
      repositoryTrustStatus: namespace.getAutomationMutationTrustStatus().status,
      mutationLockActive: namespace.getAutomationMutationLockStatus().active,
      integratedEvidence: { groundingId: grounding && grounding.groundingId || null, executionResultId: flow && flow.executionResult && flow.executionResult.executionResultId || null, mutationTrialId: trialRecord && trialRecord.mutationTrialId || null, v6Id: v6 && v6.repositoryIntegrityRecordId || null, v7Id: v7 && v7.rollbackRestorationRecordId || null, automationReceiptId: receipt && receipt.automationReceiptId || null, reflectionPackageId: reflectionPackage && reflectionPackage.reflectionPackageId || null }
    });
    internal.markPhase10Validation(result); namespace.setAutomationPersistenceAdapter(null); return internal.clone(result);
  }

  async function runAndroidRuntimeRepositoryTrial(check) {
    if (typeof global.getProjectFile !== "function" || typeof global.updateProjectFile !== "function") { check("Current Project Runtime File Store APIs are available", false, "getProjectFile/updateProjectFile unavailable", "Android Mutation", "Critical"); return null; }
    const targetFunctionName = ide190Phase10AndroidTrialTarget.name;
    const beforeFunctionSource = Function.prototype.toString.call(ide190Phase10AndroidTrialTarget);
    const afterFunctionSource = beforeFunctionSource.replace("return value + 1900;", "const result = value + 1900;\n    return result;");
    const sourceResult = await ensureProjectSource(PHASE10_FILE); const sourceBefore = sourceResult.source;
    check("Phase 10 source is available in Runtime File Store", Boolean(sourceBefore && sourceBefore.includes(beforeFunctionSource)), sourceBefore.length + " | " + sourceResult.refresh, "Android Mutation", "Critical");
    if (!sourceBefore || !sourceBefore.includes(beforeFunctionSource)) return null;
    const grounded = await namespace.intakeAndGroundLatestIDE180Navigation(); const grounding = grounded && grounded.ok && grounded.data && grounded.data.grounding;
    check("Android Runtime obtains fresh V0 Grounding", Boolean(grounding && grounding.groundingStatus === "Grounded"), grounding && grounding.groundingStatus, "Android Mutation", "Critical");
    if (!grounding) return null;
    const flow = await buildMutationFlow(grounding, { objective: "Phase 10 Android Current Project Runtime Controlled Mutation Trial", targetFile: PHASE10_FILE, targetFunction: targetFunctionName, prepareOperation: "Prepare Controlled Application Async", prepareInput: { sources: [{ fileName: PHASE10_FILE, code: sourceBefore }], targetFile: PHASE10_FILE, targetFunction: targetFunctionName, beforeFunctionSource: beforeFunctionSource, afterFunctionSource: afterFunctionSource, recommendationId: "IDE-190-PHASE10-ANDROID-RUNTIME-TRIAL", recommendationSummary: "Android final runtime Repository mutation/rollback verification.", objective: "Temporarily mutate the dedicated Phase 10 validation function and restore it exactly.", actor: "Phase 10 Android Project Owner" }, actor: "Phase 10 Android Project Owner", reason: "Explicit Android final controlled mutation trial with mandatory rollback", repositoryBaseline: { repositoryBaselineId: "IDE-190-PHASE10-ANDROID-RUNTIME-BASELINE", repositoryHash: "IDE-190-PHASE10-ANDROID-RUNTIME-HASH" } });
    check("Android Runtime V5 Prepare succeeds through IDE-160", Boolean(flow.executionResult && flow.executionResult.executionSucceeded === true && flow.executionResult.adapterOutput && flow.executionResult.adapterOutput.prepared === true), flow.executionResult && flow.executionResult.adapterOperation, "Android Mutation", "Critical");
    if (!flow.executionResult) return null;
    const trial = await namespace.executeAutomationControlledMutationTrial({ executionResultId: flow.executionResult.executionResultId, executeTrial: true, rollbackReason: "IDE-190 Phase 10 Android mandatory rollback", validator: function(info) { return Boolean(info && typeof info.functionSource === "string" && info.functionSource.includes("const result = value + 1900;")); } });
    const sourceAfter = getProjectSource(PHASE10_FILE); const tr = trial && trial.data && trial.data.mutationTrial; const v6 = trial && trial.data && trial.data.repositoryIntegrity; const v7 = trial && trial.data && trial.data.rollbackRestoration;
    check("Android Runtime Controlled Mutation Trial completes", Boolean(trial && trial.ok && tr && tr.status === "Trial Completed and Rolled Back"), trial && trial.code, "Android Mutation", "Critical");
    check("Android Runtime performs temporary Repository writes", Boolean(v6 && v6.temporaryMutationApplied === true && v6.repositoryWriteCount >= 2), v6 && v6.repositoryWriteCount, "Android Mutation", "Critical");
    check("Android Runtime V6 Integrity is Verified", Boolean(v6 && v6.integrityStatus === "Verified" && v6.sourceRestored === true && v6.persistentCommit === false), v6 && v6.integrityStatus, "Android Mutation", "Critical");
    check("Android Runtime V7 Rollback / Restoration is Verified", Boolean(v7 && v7.rollbackVerified === true && v7.sourceRestored === true && v7.restorationStatus === "Verified"), v7 && v7.restorationStatus, "Android Mutation", "Critical");
    check("Android Runtime File Store source is byte-for-byte restored", sourceAfter === sourceBefore, sourceAfter === sourceBefore, "Android Mutation", "Critical");
    return { trial: trial, flow: flow, sourceBefore: sourceBefore, sourceAfter: sourceAfter };
  }

  async function buildFinalReleaseReceipt(summary, staticIntegrity, evidence, currentReceipt, reflectionPackageId, crossDeviceRecordId) {
    const body = {
      receiptVersion: "1.0.0", componentId: "IDE-190", componentVersion: VERSION_MANIFEST.release.version,
      releaseStatus: "IDE-190 Development Automation Complete", designFreezeVersion: VERSION_MANIFEST.release.designFreezeVersion,
      staticManifest: { manifestHash: staticIntegrity.manifest.manifestHash, scriptSetHash: staticIntegrity.manifest.scriptSetHash, scriptCount: staticIntegrity.scriptCount },
      dependencies: { ide180Version: namespace.getDependencyStatus().ide180ReleaseVersion, ide160Version: namespace.getDependencyStatus().ide160ReleaseVersion, ide150Adapter: "IDE-160-ADAPTER-IDE-150" },
      phaseCompletion: { completedPhases: [1,2,3,4,5,6,7,8,9,10], phaseCount: 10 },
      validation: { passed: summary.passed, failed: summary.failed, total: summary.total, health: summary.health, criticalFailed: summary.criticalFailed, androidRealDevice: true },
      integratedEvidence: Object.assign({}, evidence || {}, { currentAutomationReceiptId: currentReceipt && currentReceipt.automationReceiptId || null, reflectionPackageId: reflectionPackageId || null, crossDeviceRecordId: crossDeviceRecordId || null }),
      safety: { persistentCommitAllowed: false, githubAutomaticReflectionAllowed: false, directRepositoryMutationAllowed: false, automaticWorkflowExecutionAllowed: false, automaticRepositoryRepairAllowed: false, approvalBypassAllowed: false, repositoryTrustStatus: namespace.getAutomationMutationTrustStatus().status, mutationLockActive: namespace.getAutomationMutationLockStatus().active },
      policy: { releaseAllowed: true, safeAutomationOrchestrator: true, persistentMutationAllowed: false, externalAutomaticReflectionAllowed: false },
      validatedAt: internal.nowIso()
    };
    const hash = await sha256(stableStringify(body)); return internal.deepFreeze(Object.assign({}, body, { integrity: { algorithm: "SHA-256", hash: hash } }));
  }

  async function runDevelopmentAutomationPhase10AndroidValidation() {
    const pre = await runDevelopmentAutomationPhase10Validation(); const c = collector(), check = c.check;
    check("Phase 10 Stage A is PASS", pre.failed === 0 && pre.criticalFailed === 0, pre.status, "Stage A", "Critical");
    const userAgent = String(global.navigator && global.navigator.userAgent || "");
    check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Runtime", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"), Boolean(global.crypto && global.crypto.subtle), "Android Runtime", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android Runtime", "Critical");
    check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android Runtime", "Critical");
    check("JSZip is available", typeof global.JSZip === "function", typeof global.JSZip, "Android Runtime", "Critical");

    const staticIntegrity = await verifyStaticRuntime();
    check("Static Script Manifest structure is valid with exactly 226 scripts", staticIntegrity.manifestStructureValid === true && staticIntegrity.scriptCount === EXPECTED_SCRIPT_COUNT, staticIntegrity.scriptCount, "Static Integrity", "Critical");
    check("Static Script Manifest internal SHA-256 integrity is valid", staticIntegrity.manifestIntegrityValid === true, { manifestHash: staticIntegrity.computedManifestHash, scriptSetHash: staticIntegrity.computedScriptSetHash }, "Static Integrity", "Critical");
    check("All 226 scripts are fetched on Android", staticIntegrity.fetchedScriptCount === EXPECTED_SCRIPT_COUNT && staticIntegrity.fetchFailureCount === 0, { fetched: staticIntegrity.fetchedScriptCount, failures: staticIntegrity.fetchFailureCount }, "Static Integrity", "Critical");
    check("All script SHA-256 hashes match", staticIntegrity.scriptHashMismatchCount === 0, staticIntegrity.mismatches.filter(function(m){return m.type === "sha256";}), "Static Integrity", "Critical");
    check("All script byte sizes match", staticIntegrity.scriptByteSizeMismatchCount === 0, staticIntegrity.mismatches.filter(function(m){return m.type === "byteSize";}), "Static Integrity", "Critical");
    check("All script cache keys match SHA-256", staticIntegrity.scriptCacheKeyMismatchCount === 0, staticIntegrity.mismatches.filter(function(m){return m.type === "cacheKey";}), "Static Integrity", "Critical");
    check("index.html local script sequence matches Static Manifest", staticIntegrity.indexScriptSequenceMatches === true && staticIntegrity.indexLocalScriptCount === EXPECTED_SCRIPT_COUNT, staticIntegrity.indexLocalScriptCount, "Static Integrity", "Critical");
    check("index.html Manifest Hash marker matches Static Manifest", staticIntegrity.indexManifestHashMatches === true, staticIntegrity.manifest && staticIntegrity.manifest.manifestHash, "Static Integrity", "Critical");

    namespace.setAutomationPersistenceAdapter(null); if (typeof namespace.initializeAutomationPersistence === "function") namespace.initializeAutomationPersistence();
    const persistedReceipts = await namespace.listPersistedAutomationReceipts();
    const historicalPhase8 = Array.isArray(persistedReceipts) ? persistedReceipts.find(function find(receipt) { return receipt && receipt.phase8ReloadGate === true && receipt.functionalValidationPassed === true; }) : null;
    check("Historical Phase 8 Full Reload Receipt remains persisted", Boolean(historicalPhase8), historicalPhase8 && historicalPhase8.automationReceiptId, "Persistence Lineage", "Critical");
    const historicalVerify = historicalPhase8 ? await namespace.verifyAutomationReceipt(historicalPhase8) : null;
    check("Historical Phase 8 Receipt own integrity remains valid", Boolean(historicalVerify && historicalVerify.valid === true), historicalVerify && historicalVerify.state, "Persistence Lineage", "Critical");

    const androidTrial = await runAndroidRuntimeRepositoryTrial(check);
    check("Repository remains Trusted after Android Runtime Trial", namespace.getAutomationMutationTrustStatus().status === "Trusted", namespace.getAutomationMutationTrustStatus().status, "Repository Trust", "Critical");
    check("Mutation Lock is released after Android Runtime Trial", namespace.getAutomationMutationLockStatus().active === false, namespace.getAutomationMutationLockStatus().active, "Mutation Lock", "Critical");

    const currentReceipt = await validateSessionAuditReceipt(check, true);
    const cross = namespace.validateAutomationCrossDeviceParity(); const crossRecord = cross && cross.data && cross.data.record;
    check("Android/Web Sensitive Permission parity remains exact", Boolean(cross && cross.ok && cross.data && cross.data.record && cross.data.record.parityVerified === true), cross && cross.code, "Cross-Device", "Critical");
    const sourceReady = await ensureProjectSource(PHASE10_FILE);
    check("Phase 10 source is available for explicit Reflection", Boolean(sourceReady.source), sourceReady.source.length + " | " + sourceReady.refresh, "Reflection", "Critical");
    const prepared = sourceReady.source ? await namespace.prepareAutomationReflectionPackage({ filePaths: [PHASE10_FILE], actorRole: "Project Owner" }) : null; const reflectionPackage = prepared && prepared.data && prepared.data.package;
    check("Final X1 Reflection Package prepares explicitly", Boolean(prepared && prepared.ok && reflectionPackage && reflectionPackage.externalEffectLevel === "X1" && reflectionPackage.userMediated === true), prepared && prepared.code, "Reflection", "Critical");
    const zip = reflectionPackage ? await namespace.buildAutomationReflectionZip(reflectionPackage.reflectionPackageId) : null;
    check("Reflection ZIP builds without auto-download / Repository write", Boolean(zip && zip.ok && zip.data && zip.data.downloadTriggered === false && reflectionPackage.repositoryWriteCount === 0 && reflectionPackage.githubWrite === false && reflectionPackage.persistentCommit === false), zip && zip.code, "Reflection", "Critical");
    const projection = namespace.getDevelopmentAutomationUIProjection();
    check("Final UI grants no execution/write permission", Boolean(projection && projection.uiCapabilities && projection.uiCapabilities.approvalAction === false && projection.uiCapabilities.dispatchAction === false && projection.uiCapabilities.mutationAction === false && projection.uiCapabilities.repositoryWriteAction === false && projection.uiCapabilities.githubWriteAction === false && projection.uiCapabilities.automaticReflectionAction === false), projection && projection.uiCapabilities, "UI", "Critical");
    check("Android cannot grant Persistent Commit", namespace.getPlatformProfile().persistentCommitPermission === false, namespace.getPlatformProfile().persistentCommitPermission, "Safety", "Critical");
    check("Android cannot bypass Approval", namespace.getPlatformProfile().approvalBypassAllowed === false, namespace.getPlatformProfile().approvalBypassAllowed, "Safety", "Critical");
    check("Automatic Repository repair remains prohibited", Boolean(namespace.modules.recovery && namespace.modules.recovery.automaticRepairImplemented === false), namespace.modules.recovery && namespace.modules.recovery.automaticRepairImplemented, "Safety", "Critical");

    const combinedBeforeRelease = pre.checks.concat(c.checks); const preReleaseSummary = summarize(combinedBeforeRelease);
    state.androidPhase10ValidationPassed = preReleaseSummary.failed === 0 && preReleaseSummary.criticalFailed === 0;
    const foundationSnapshot = namespace.buildFoundationStateSnapshot(); const foundationValidation = namespace.validateContract("foundationState", foundationSnapshot); const status = namespace.getStatus();
    check("Final Foundation State Contract validates", foundationValidation.valid === true, foundationValidation.errors || [], "Final Release", "Critical");
    check("Final Foundation State reports releaseAllowed=true", status.releaseAllowed === true && foundationSnapshot.releaseAllowed === true, status.releaseAllowed, "Final Release", "Critical");
    check("Final Foundation State reports ide190Complete=true", status.ide190Complete === true && foundationSnapshot.ide190Complete === true, status.ide190Complete, "Final Release", "Critical");
    check("Final Foundation State remains Phase 10 allowed", status.phase10Allowed === true, status.phase10Allowed, "Final Release", "Critical");

    const combined = pre.checks.concat(c.checks); const summary = summarize(combined); const allPassed = summary.failed === 0 && summary.criticalFailed === 0;
    if (!allPassed) state.androidPhase10ValidationPassed = false;
    const evidence = Object.assign({}, pre.integratedEvidence || {}, {
      androidMutationTrialId: androidTrial && androidTrial.trial && androidTrial.trial.data && androidTrial.trial.data.mutationTrial && androidTrial.trial.data.mutationTrial.mutationTrialId || null,
      historicalPhase8ReceiptId: historicalPhase8 && historicalPhase8.automationReceiptId || null
    });
    const releaseReceipt = allPassed ? await buildFinalReleaseReceipt(summary, staticIntegrity, evidence, currentReceipt, reflectionPackage && reflectionPackage.reflectionPackageId, crossRecord && crossRecord.crossDeviceRecordId) : null;
    const result = finish(combined, "B", {
      preDeviceValidationId: pre.id, preDevicePassed: pre.failed === 0 && pre.criticalFailed === 0,
      androidRealDeviceRequired: true, androidRealDevicePassed: allPassed, phaseGatePassed: allPassed,
      phase10Complete: allPassed, ide190Complete: allPassed, releaseAllowed: allPassed,
      releaseStatus: allPassed ? "IDE-190 Development Automation Complete" : "IDE-190 Development Automation Blocked",
      repositoryTrustStatus: namespace.getAutomationMutationTrustStatus().status,
      mutationLockActive: namespace.getAutomationMutationLockStatus().active,
      androidRealDeviceValidation: { passed: allPassed, userAgent: userAgent, validatedAt: internal.nowIso() },
      staticIntegrity: staticIntegrity,
      releaseReceipt: releaseReceipt,
      integratedEvidence: evidence
    });
    internal.markPhase10AndroidValidation(result);
    namespace.modules.phase10Validation.status = result.phaseGatePassed ? "IDE-190 Complete" : "Blocked";
    return internal.clone(result);
  }

  function getDevelopmentAutomationPhase10ValidationStatus() {
    return {
      componentId: "IDE-190", version: VERSION_MANIFEST.release.version,
      preDevice: internal.clone(state.lastPhase10Validation), android: internal.clone(state.lastPhase10AndroidValidation),
      phaseGatePassed: state.androidPhase10ValidationPassed === true, phase10Complete: state.androidPhase10ValidationPassed === true,
      ide190Complete: state.androidPhase10ValidationPassed === true, releaseAllowed: state.androidPhase10ValidationPassed === true,
      releaseStatus: state.androidPhase10ValidationPassed === true ? "IDE-190 Development Automation Complete" : "Not Released",
      repositoryTrustStatus: namespace.getAutomationMutationTrustStatus().status,
      mutationLockActive: namespace.getAutomationMutationLockStatus().active
    };
  }

  function getIDE190FinalReleaseReceipt() { return state.ide190FinalReleaseReceipt ? internal.clone(state.ide190FinalReleaseReceipt) : null; }
  function initializePhase10Validation() { namespace.modules.phase10Validation.status = "Ready"; return internal.buildResult(true, "IDE190_PHASE10_VALIDATION_INITIALIZED", "Ready", getDevelopmentAutomationPhase10ValidationStatus()); }

  Object.assign(namespace.api, {
    initializePhase10Validation: initializePhase10Validation,
    runDevelopmentAutomationPhase10Validation: runDevelopmentAutomationPhase10Validation,
    runDevelopmentAutomationPhase10AndroidValidation: runDevelopmentAutomationPhase10AndroidValidation,
    getDevelopmentAutomationPhase10ValidationStatus: getDevelopmentAutomationPhase10ValidationStatus,
    getIDE190FinalReleaseReceipt: getIDE190FinalReleaseReceipt
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase10Validation = { id: "IDE-190-PHASE10-FINAL-VALIDATION", version: MODULE_VERSION, status: "Loaded", phase: 10, phaseName: "Integrated / Android Final Validation", androidRealDeviceRequired: true, integratedGate: true, releaseGate: true, loadedAt: internal.nowIso() };
  global.runDevelopmentAutomationPhase10Validation = runDevelopmentAutomationPhase10Validation;
  global.runDevelopmentAutomationPhase10AndroidValidation = runDevelopmentAutomationPhase10AndroidValidation;
  global.getDevelopmentAutomationPhase10ValidationStatus = getDevelopmentAutomationPhase10ValidationStatus;
  global.getIDE190FinalReleaseReceipt = getIDE190FinalReleaseReceipt;
})(typeof window !== "undefined" ? window : globalThis);
