/* ============================================================
   FILE: 17_external_intelligence_phase1_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 01 Regression Validation under Phase 02
   Design Freeze: EXTERNAL-010-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 1 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase1Validation");
  const EXPECTED_PHASE1_FILES = Object.freeze([
    "17_external_intelligence_version_manifest.js",
    "17_external_intelligence_core.js",
    "17_external_intelligence_contracts.js",
    "17_external_intelligence_schema_registry.js",
    "17_external_intelligence_authority.js",
    "17_external_intelligence_audit.js",
    "17_external_intelligence_phase1_validation.js"
  ]);

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({
          name: name,
          passed: passed === true,
          detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)),
          group: group || "General",
          severity: severity || "Critical"
        });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function count(item) { return !item.passed && item.severity === "Critical"; }).length;
    const health = checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0;
    return { passed: passed, failed: failed, total: checks.length, criticalFailed: criticalFailed, health: health };
  }

  async function runExternalIntelligencePhase1Validation() {
    const c = collector();
    const check = c.check;

    check("Version Manifest is loaded", Boolean(VERSION_MANIFEST), VERSION_MANIFEST && VERSION_MANIFEST.release.version, "Foundation");
    check("Component ID is EXTERNAL-010", VERSION_MANIFEST.componentId === "EXTERNAL-010", VERSION_MANIFEST.componentId, "Foundation");
    check("Release Version is compatible with Phase 01 baseline", ["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0"].includes(VERSION_MANIFEST.release.version), VERSION_MANIFEST.release.version, "Foundation");
    check("Design Freeze ID is canonical", VERSION_MANIFEST.release.designFreezeId === "EXTERNAL-010-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Foundation");
    check("Roadmap ID is 2.1.0", VERSION_MANIFEST.release.implementationRoadmapId === "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0", VERSION_MANIFEST.release.implementationRoadmapId, "Foundation");
    check("Decision coverage is 54", VERSION_MANIFEST.release.decisionCount === 54 && VERSION_MANIFEST.release.decisionRange === "EXTERNAL-010-DECISION-001..054", VERSION_MANIFEST.release.decisionRange, "Foundation");

    Object.keys(VERSION_MANIFEST.safety).forEach(function safetyFlag(key) {
      check("Safety flag " + key + " is false", (VERSION_MANIFEST.safety[key] === false || (key === "scannerIdentityVerificationRequired" && VERSION_MANIFEST.release.phase >= 6 && VERSION_MANIFEST.safety[key] === true)), VERSION_MANIFEST.safety[key], "Safety");
    });
    check("Authority default is DENY", VERSION_MANIFEST.authorityPolicy.defaultDecision === "DENY", VERSION_MANIFEST.authorityPolicy.defaultDecision, "Authority");
    check("Ordinary approval cannot override hard deny", VERSION_MANIFEST.authorityPolicy.ordinaryApprovalOverridesHardDeny === false, VERSION_MANIFEST.authorityPolicy.ordinaryApprovalOverridesHardDeny, "Authority");

    const init = await namespace.initializeExternalIntelligenceFoundation();
    check("Foundation initializes", init && init.ok === true, init && init.code, "Initialization");
    check("Foundation reports initialized", namespace.getExternalIntelligenceFoundationState().initialized === true, namespace.getExternalIntelligenceFoundationState(), "Initialization");

    const contracts = namespace.listExternalIntelligenceContracts();
    const schemas = namespace.listExternalIntelligenceSchemas();
    check("Eight built-in contracts are registered", Array.isArray(contracts) && contracts.length >= 8, contracts.length, "Contracts");
    check("Five built-in schemas are registered", Array.isArray(schemas) && schemas.length >= 5, schemas.length, "Schemas");
    check("Unknown contract is rejected", namespace.validateExternalIntelligenceContract("NOT-A-CONTRACT", {}).valid === false, "expected invalid", "Contracts");
    check("Unknown schema is rejected", namespace.validateExternalIntelligenceRecord("NOT-A-SCHEMA", {}).valid === false, "expected invalid", "Schemas");

    const foundationState = namespace.getExternalIntelligenceFoundationState();
    check("Foundation State contract validates", namespace.validateExternalIntelligenceContract("foundationState", foundationState).valid === true, foundationState, "Contracts");
    check("Foundation State schema validates", namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-FOUNDATION-STATE", foundationState).valid === true, foundationState, "Schemas");

    const compatibility = namespace.getExternalIntelligenceCompatibilityProfile("claim", ["0.9.0", "1.0.0"]);
    check("Read-old / write-current compatibility is enabled", compatibility.readOldWriteCurrent === true && compatibility.writeVersion === "1.0.0", compatibility, "Compatibility");
    check("Silent schema upgrade is disabled", compatibility.silentUpgradeAllowed === false, compatibility.silentUpgradeAllowed, "Compatibility");
    check("Compatibility profile contract validates", namespace.validateExternalIntelligenceContract("compatibilityProfile", compatibility).valid === true, compatibility, "Compatibility");
    const projection = await namespace.projectExternalIntelligenceRecord({ adapterId: "NOT-REGISTERED", record: { id: "x" } });
    check("Historical projection requires registered adapter", projection && projection.ok === false && projection.code === "EXTERNAL010_PROJECTION_ADAPTER_REQUIRED", projection && projection.code, "Compatibility");

    const defaultDeny = namespace.evaluateExternalIntelligenceAuthority({ action: "READ_EXTERNAL_FOUNDATION", target: { type: "foundation", id: "EXTERNAL-010" }, purpose: "validation" });
    check("Authority evaluation defaults to deny", defaultDeny.allowed === false && defaultDeny.decision === "DENY", defaultDeny, "Authority");

    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action: "READ_EXTERNAL_FOUNDATION", target: { type: "foundation", id: "EXTERNAL-010" }, purpose: "phase1-validation", scope: { domain: "EXTERNAL-010", operation: "READ" } });
    check("Authority candidate can be created without granting authority", candidate && candidate.ok === true && candidate.data.envelope.state === "CANDIDATE" && candidate.data.authorityGranted === false, candidate && candidate.data, "Authority");
    const stillDenied = namespace.evaluateExternalIntelligenceAuthority({ action: "READ_EXTERNAL_FOUNDATION", target: { type: "foundation", id: "EXTERNAL-010" }, purpose: "phase1-validation" });
    check("Authority candidate does not grant authority", stillDenied.allowed === false, stillDenied, "Authority");
    const activationWithoutAdapter = await namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId, {});
    check("Authority activation requires owner approval adapter", activationWithoutAdapter.ok === false && activationWithoutAdapter.code === "EXTERNAL010_AUTHORITY_OWNER_APPROVAL_ADAPTER_REQUIRED", activationWithoutAdapter.code, "Authority");

    const hardDenyCandidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action: "EXECUTE_TRADE", target: { type: "market", id: "*" }, purpose: "phase1-negative-test", scope: { domain: "FINANCE", operation: "TRADE" } });
    check("Trading authority is hard denied", hardDenyCandidate.ok === true && hardDenyCandidate.data.envelope.state === "BLOCKED" && hardDenyCandidate.data.authorityGranted === false, hardDenyCandidate.data, "Authority");
    const hardDenyActivation = await namespace.activateExternalIntelligenceAuthorityEnvelope(hardDenyCandidate.data.envelope.authorityEnvelopeId, { approved: true });
    check("Hard deny cannot be overridden by ordinary approval", hardDenyActivation.ok === false && hardDenyActivation.code === "EXTERNAL010_AUTHORITY_HARD_DENY", hardDenyActivation.code, "Authority");

    const validationApprovalAdapter = {
      adapterId: "EXTERNAL-010-PHASE1-VALIDATION-OWNER-APPROVAL",
      requiresExplicitOwnerInteraction: true,
      async verifyApproval() { return { approved: true, actorType: "Project Owner", interactionEvidenceId: "PHASE1-VALIDATION-OWNER-INTERACTION" }; }
    };
    const adapterSet = namespace.setExternalIntelligenceAuthorityApprovalAdapter(validationApprovalAdapter);
    check("Explicit owner approval adapter hook can be configured", adapterSet.ok === true, adapterSet.code, "Authority", "Warning");
    const positiveCandidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action: "READ_EXTERNAL_FOUNDATION", target: { type: "foundation", id: "EXTERNAL-010" }, purpose: "phase1-positive-validation", scope: { domain: "EXTERNAL-010", operation: "READ" } });
    const activated = await namespace.activateExternalIntelligenceAuthorityEnvelope(positiveCandidate.data.envelope.authorityEnvelopeId, { validationOnly: true });
    check("Verified Project Owner evidence can activate non-hard-denied scoped authority", activated.ok === true && activated.data.envelope.state === "ACTIVE", activated.code, "Authority", "Warning");
    const allowed = namespace.evaluateExternalIntelligenceAuthority({ action: "READ_EXTERNAL_FOUNDATION", target: { type: "foundation", id: "EXTERNAL-010" }, purpose: "phase1-positive-validation" });
    check("Active authority is scope-bound and evaluable", allowed.allowed === true && allowed.authorityEnvelopeId === activated.data.envelope.authorityEnvelopeId, allowed, "Authority", "Warning");
    namespace.revokeExternalIntelligenceAuthorityEnvelope(activated.data.envelope.authorityEnvelopeId, "Validation cleanup");
    const deniedAfterRevoke = namespace.evaluateExternalIntelligenceAuthority({ action: "READ_EXTERNAL_FOUNDATION", target: { type: "foundation", id: "EXTERNAL-010" }, purpose: "phase1-positive-validation" });
    check("Revoked authority no longer grants access", deniedAfterRevoke.allowed === false, deniedAfterRevoke, "Authority");
    namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);

    const promotion = namespace.createExternalIntelligencePromotionBoundaryRecord({ candidateType: "Knowledge Candidate" });
    check("Promotion boundary forbids automatic promotion", promotion.ok === true && promotion.data.record.automaticPromotionAllowed === false, promotion.data && promotion.data.record, "Promotion");
    check("Promotion boundary forbids canonical mutation", promotion.ok === true && promotion.data.record.canonicalMutationPerformed === false, promotion.data && promotion.data.record, "Promotion");
    check("Validation is explicitly not approval", promotion.ok === true && promotion.data.record.validationEqualsApproval === false, promotion.data && promotion.data.record, "Promotion");

    const memoryAudit = namespace.createExternalIntelligenceMemoryAuditPersistenceAdapter();
    const auditAdapter = namespace.setExternalIntelligenceAuditPersistenceAdapter(memoryAudit);
    check("Audit persistence adapter hook accepts readback-capable adapter", auditAdapter.ok === true, auditAdapter.code, "Audit");
    const audit1 = await namespace.appendExternalIntelligenceAuditEvent({
      eventType: "PHASE1_VALIDATION_STARTED",
      actor: "Validation",
      outcome: "Recorded",
      details: { apiToken: "should-never-persist", password: "also-secret", safeValue: "visible" }
    });
    check("Audit event appends", audit1.ok === true, audit1.code, "Audit");
    check("Audit persistence readback verifies", audit1.ok === true && audit1.data.persistence.readBackVerified === true, audit1.data && audit1.data.persistence, "Audit");
    check("Audit secret fields are redacted", audit1.ok === true && audit1.data.event.details.apiToken === "[REDACTED]" && audit1.data.event.details.password === "[REDACTED]" && audit1.data.event.details.safeValue === "visible", audit1.data && audit1.data.event.details, "Audit");
    check("Audit event stored state is frozen", audit1.ok === true && Object.isFrozen(state.auditEvents.get(audit1.data.event.auditEventId)), audit1.data && audit1.data.event.auditEventId, "Audit");
    const persisted = await namespace.readBackExternalIntelligenceAuditEvent(audit1.data.event.auditEventId);
    check("Audit persisted record can be read back", persisted.ok === true && persisted.data.record.eventHash === audit1.data.event.eventHash, persisted.code, "Audit");
    const audit2 = await namespace.appendExternalIntelligenceAuditEvent({ eventType: "PHASE1_VALIDATION_AUTHORITY_CHECKED", actor: "Validation", outcome: "Recorded", details: { authorityEffect: "none" } });
    check("Second audit event appends", audit2.ok === true, audit2.code, "Audit");
    const chain = await namespace.verifyExternalIntelligenceAuditChain();
    check("Audit hash chain verifies", chain.valid === true && chain.eventCount >= 2, chain, "Audit");
    check("Audit payload contains no original validation secret", internal.stableStringify(namespace.listExternalIntelligenceAuditEvents()).indexOf("should-never-persist") === -1, "secret absent", "Audit");
    namespace.setExternalIntelligenceAuditPersistenceAdapter(null);

    const moduleNames = ["core", "contracts", "schemaRegistry", "authority", "audit", "phase1Validation"];
    moduleNames.forEach(function moduleReady(name) {
      check("Module " + name + " is loaded", Boolean(namespace.modules[name]), namespace.modules[name] && namespace.modules[name].status, "Modules");
    });
    check("Phase 01 file map contains all seven files", EXPECTED_PHASE1_FILES.every(function present(file) { return file === "17_external_intelligence_version_manifest.js" || Boolean(VERSION_MANIFEST.fileModules[file]); }), EXPECTED_PHASE1_FILES, "Static Integration");
    check("Existing platform mutation is not required", VERSION_MANIFEST.compatibility.existingPlatformMutationRequired === false, VERSION_MANIFEST.compatibility.existingPlatformMutationRequired, "Regression");

    const summary = summarize(c.checks);
    const passedGate = summary.failed === 0 && summary.criticalFailed === 0;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE1-VALIDATION"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      roadmapId: VERSION_MANIFEST.release.implementationRoadmapId,
      decisionCoverage: VERSION_MANIFEST.release.decisionCount,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: passedGate ? "EXTERNAL-010 Phase 01 Validation PASS" : "EXTERNAL-010 Phase 01 Validation FAIL",
      releaseAllowed: passedGate,
      phase1Complete: passedGate,
      phase2Allowed: passedGate,
      checks: c.checks,
      safety: internal.clone(VERSION_MANIFEST.safety),
      validatedAt: internal.nowIso()
    };
    const resultContract = namespace.validateExternalIntelligenceContract("validationResult", result);
    const resultSchema = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-VALIDATION-RESULT", result);
    if (!resultContract.valid || !resultSchema.valid) {
      result.failed += 1;
      result.total += 1;
      result.criticalFailed += 1;
      result.health = Math.round((result.passed / result.total) * 1000) / 10;
      result.status = "EXTERNAL-010 Phase 01 Validation FAIL";
      result.releaseAllowed = false;
      result.phase1Complete = false;
      result.phase2Allowed = false;
      result.checks.push({ name: "Validation result validates against contract and schema", passed: false, detail: internal.stableStringify({ contract: resultContract, schema: resultSchema }), group: "Validation", severity: "Critical" });
    } else {
      result.checks.push({ name: "Validation result validates against contract and schema", passed: true, detail: "valid", group: "Validation", severity: "Critical" });
      result.passed += 1;
      result.total += 1;
      result.health = Math.round((result.passed / result.total) * 1000) / 10;
    }

    state.latestValidation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase1Validation.status = result.failed === 0 ? "Passed" : "Failed";
    internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase1Validation() {
    return state.latestValidation ? internal.clone(state.latestValidation) : null;
  }

  Object.assign(namespace.api, {
    runExternalIntelligencePhase1Validation: runExternalIntelligencePhase1Validation,
    getLatestExternalIntelligencePhase1Validation: getLatestExternalIntelligencePhase1Validation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase1Validation = {
    id: "EXTERNAL-010-PHASE1-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 1,
    expectedFiles: EXPECTED_PHASE1_FILES.slice(),
    loadedAt: internal.nowIso()
  };

  global.runExternalIntelligencePhase1Validation = runExternalIntelligencePhase1Validation;
  global.getLatestExternalIntelligencePhase1Validation = getLatestExternalIntelligencePhase1Validation;
})(typeof window !== "undefined" ? window : globalThis);
