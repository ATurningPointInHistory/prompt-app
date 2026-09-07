/* ============================================================
   FILE: 17_external_intelligence_phase5_real_runtime_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 05 PC Real Runtime Validation
   Real HTTP -> Gateway -> Immutable Evidence Persistence -> Readback
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 05 PC real-runtime validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase5RealRuntimeValidation");
  const PURPOSE = "phase5-pc-real-runtime";

  function collector() {
    const checks = [];
    return { checks, check(name, passed, detail, group, severity) { checks.push({ name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "PC Real Runtime", severity: severity || "Critical" }); } };
  }
  function summarize(checks) {
    const passed = checks.filter((x) => x.passed).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter((x) => !x.passed && x.severity === "Critical").length;
    return { passed, failed, total: checks.length, criticalFailed, health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0 };
  }
  async function grantAuthority(action, type, id, owned) {
    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({ action, target: { type, id }, purpose: PURPOSE, scope: { domain: "EXTERNAL-010", operation: action } });
    if (!candidate.ok) return { ok: false, candidate };
    owned.push(candidate.data.envelope.authorityEnvelopeId);
    const activated = await namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId, { validationOnly: true });
    return { ok: activated.ok === true, activated, envelopeId: candidate.data.envelope.authorityEnvelopeId };
  }
  function newestGatewaySuccessResponse() {
    const gatewayAdapterId = VERSION_MANIFEST.acquisition.adapterIds.localGateway;
    const values = Array.from(state.acquisitionResponses.values()).filter((r) => r && r.status === "SUCCESS" && r.evidenceInput && r.evidenceInput.adapterId === gatewayAdapterId);
    values.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return values[0] ? internal.clone(values[0]) : null;
  }

  async function runExternalIntelligencePhase5PcRealRuntimeValidation(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const gatewayBaseUrl = internal.text(settings.gatewayBaseUrl, VERSION_MANIFEST.gateway.defaultBaseUrl).replace(/\/+$/, "");
    const fixtureBaseUrl = internal.text(settings.fixtureBaseUrl, "http://127.0.0.1:43120").replace(/\/+$/, "");
    const c = collector(); const check = c.check; const owned = [];
    let first = null; let second = null; let read = null; let integrity = null; let checkpoint = null; let p4pc = null; let p5 = null;
    try {
      check("Release Version is compatible with Phase 05 baseline", ["1.4.0", "1.5.0"].includes(VERSION_MANIFEST.release.version), VERSION_MANIFEST.release.version, "Foundation");
      check("Gateway compatibility version is 1.3.0 or later supported", ["1.3.0","1.4.0"].includes(VERSION_MANIFEST.gateway.gatewayVersion), VERSION_MANIFEST.gateway.gatewayVersion, "Foundation");
      const init = await namespace.initializeExternalIntelligenceFoundation();
      check("Phase 05 foundation initializes for PC real runtime", init && init.ok === true, init && init.code, "Foundation");

      p5 = await namespace.runExternalIntelligencePhase5Validation();
      check("Phase 05 regression remains PASS", p5.failed === 0 && p5.health === 100 && p5.phase5Complete === true, { passed:p5.passed, failed:p5.failed, total:p5.total }, "Regression");

      p4pc = await namespace.runExternalIntelligencePhase4PcRealRuntimeValidation({ gatewayBaseUrl, fixtureBaseUrl });
      check("Phase 04 PC real HTTP regression remains PASS", p4pc.failed === 0 && p4pc.health === 100 && p4pc.phase4PcRealRuntimeComplete === true, { passed:p4pc.passed, failed:p4pc.failed, total:p4pc.total }, "Real HTTP Regression");

      const configured = namespace.configureExternalIntelligenceGatewayClient({ baseUrl: gatewayBaseUrl });
      check("Gateway client remains loopback-bound", configured.ok === true && /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(configured.data.baseUrl), configured.data || configured.code, "Gateway");
      const health = await namespace.getExternalIntelligenceGatewayHealth();
      check("Real Gateway health is READY at supported Phase 05+ version", health.ok === true && health.data.health && ["1.3.0","1.4.0"].includes(health.data.health.gatewayVersion), health.data || health.code, "Gateway");

      const ownerApproval = namespace.setExternalIntelligenceAuthorityApprovalAdapter({ adapterId:"EXTERNAL-010-PHASE5-PC-OWNER-APPROVAL", requiresExplicitOwnerInteraction:true, async verifyApproval(){ return { approved:true, actorType:"Project Owner", interactionEvidenceId:"PHASE5-PC-OWNER-INTERACTION" }; } });
      check("Project Owner validation approval adapter configured", ownerApproval.ok === true, ownerApproval.data || ownerApproval.code, "Authority");
      const persistAuth = await grantAuthority("PERSIST_EXTERNAL_EVIDENCE", "external-evidence-persistence", "*", owned);
      const readAuth = await grantAuthority("READ_EXTERNAL_EVIDENCE", "external-evidence", "*", owned);
      const checkpointAuth = await grantAuthority("PERSIST_EXTERNAL_PROCESSING_STATE", "external-evidence-persistence", "*", owned);
      check("PC real persistence authorities are explicit and scoped", persistAuth.ok && readAuth.ok && checkpointAuth.ok, { persist:persistAuth.ok, read:readAuth.ok, checkpoint:checkpointAuth.ok }, "Authority");

      const session = await namespace.openExternalIntelligenceGatewaySession({ requestedScope:["PROBE","READ_RUNTIME","ACQUIRE_PUBLIC","PERSIST_EVIDENCE","READ_EVIDENCE"] });
      check("Gateway session includes persistence scopes", session.ok === true && session.data.session.scope.includes("PERSIST_EVIDENCE") && session.data.session.scope.includes("READ_EVIDENCE"), session.data || session.code, "Gateway Security");
      const bridge = namespace.enableExternalIntelligenceGatewayEvidencePersistenceBridge();
      check("Gateway Evidence Persistence bridge is enabled", bridge.ok === true, bridge.data || bridge.code, "Persistence Bridge");

      const response = newestGatewaySuccessResponse();
      check("Real Local Gateway acquisition response is available for persistence", Boolean(response && response.evidenceInput && typeof response.evidenceInput.rawText === "string"), response && { responseId:response.responseId, sourceId:response.evidenceInput.sourceId, adapterId:response.evidenceInput.adapterId, rawTextLength:response.evidenceInput.rawText && response.evidenceInput.rawText.length }, "Evidence Input");

      first = response ? await namespace.persistExternalIntelligenceAcquisitionEvidence({ response, purpose:PURPOSE }) : null;
      check("First real HTTP acquisition persists as immutable Evidence", Boolean(first && first.ok === true && first.data.acquisitionEvidence.immutable === true && first.data.rawEvidence.immutable === true), first && (first.data || first.code), "Persistence");
      check("First persistence creates physical content object", Boolean(first && first.ok === true && first.data.contentCreated === true && first.data.physicalContentDeduplicated === false), first && first.data, "Content Addressing");
      check("SQLite/File Store persistence grants no repository or knowledge authority", Boolean(first && first.ok === true && first.data.canonicalRepositoryMutationPerformed === false && first.data.knowledgePromotionPerformed === false), first && first.data, "Safety");

      second = response ? await namespace.persistExternalIntelligenceAcquisitionEvidence({ response, purpose:PURPOSE }) : null;
      check("Repeated acquisition creates distinct Evidence identity", Boolean(first && second && second.ok === true && first.data.acquisitionEvidence.evidenceId !== second.data.acquisitionEvidence.evidenceId && first.data.acquisitionEvidence.contentHash === second.data.acquisitionEvidence.contentHash), second && second.data, "Evidence Identity");
      check("Repeated identical content is physically deduplicated", Boolean(second && second.ok === true && second.data.contentCreated === false && second.data.physicalContentDeduplicated === true), second && second.data, "Content Addressing");

      read = first && first.ok ? await namespace.readPersistedExternalIntelligenceEvidence({ evidenceId:first.data.acquisitionEvidence.evidenceId, purpose:PURPOSE, verifyHash:true }) : null;
      check("Persisted Evidence readback verifies physical SHA-256", Boolean(read && read.ok === true && read.data.integrityState === "VERIFIED" && read.data.contentAvailable === true), read && (read.data || read.code), "Readback");
      check("Readback preserves Evidence recordHash and raw/content lineage", Boolean(read && read.ok === true && read.data.acquisitionEvidence.recordHash === first.data.acquisitionEvidence.recordHash && read.data.rawEvidence.contentHash === first.data.contentObject.contentHash), read && read.data, "Lineage");

      checkpoint = first && first.ok ? await namespace.createExternalIntelligenceProcessingCheckpoint({ contentHash:first.data.contentObject.contentHash, processorId:"PHASE5-PC-REAL-PROCESSOR", processorVersion:"1.0.0", parameterHash:"", processingState:"COMPLETED", resumeCursor:{ item:1 }, purpose:PURPOSE }) : null;
      check("Real processing checkpoint persists through Gateway", Boolean(checkpoint && checkpoint.ok === true && checkpoint.data.checkpoint.immutable === true), checkpoint && (checkpoint.data || checkpoint.code), "Incremental Processing");

      integrity = await namespace.scanExternalIntelligenceEvidenceIntegrity({ purpose:PURPOSE });
      check("Real File Store / SQLite integrity scan passes", Boolean(integrity && integrity.ok === true && integrity.data.valid === true && integrity.data.missing.length === 0 && integrity.data.corrupted.length === 0), integrity && (integrity.data || integrity.code), "Integrity");
      check("Integrity scan never auto-deletes orphan content", Boolean(integrity && integrity.ok === true && integrity.data.orphanAutomaticDeletionPerformed === false), integrity && integrity.data, "Recovery Boundary");
      check("Physical content count remains lower than Evidence count after dedupe", Boolean(integrity && integrity.ok === true && integrity.data.counts.contentObjectCount < integrity.data.counts.acquisitionEvidenceCount), integrity && integrity.data.counts, "Content Addressing");

      const audit = await namespace.verifyExternalIntelligenceAuditChain();
      check("Audit chain remains valid after PC persistence", audit.valid === true, { valid:audit.valid, eventCount:audit.eventCount }, "Audit");
      check("Persistence boundary remains fail-closed for automatic authority", VERSION_MANIFEST.safety.evidencePersistenceGrantsKnowledgeAuthority === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false && VERSION_MANIFEST.safety.rawEvidenceOverwriteAllowed === false, VERSION_MANIFEST.safety, "Safety");
    } catch (error) {
      check("Phase 05 PC real runtime completes without exception", false, { message:error && error.message || String(error), stack:error && error.stack || null }, "Validation");
    } finally {
      owned.forEach((id) => namespace.revokeExternalIntelligenceAuthorityEnvelope(id, "Phase 05 PC real runtime completed"));
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
    }

    const s = summarize(c.checks); const gate = s.failed === 0 && s.criticalFailed === 0;
    const result = {
      id:internal.nextId("EXTERNAL-010-PHASE5-PC-REAL-RUNTIME"), componentId:"EXTERNAL-010", version:VERSION_MANIFEST.release.version, gatewayVersion:VERSION_MANIFEST.gateway.gatewayVersion,
      implementationPhase:VERSION_MANIFEST.release.implementationPhase, passed:s.passed, failed:s.failed, total:s.total, health:s.health, criticalFailed:s.criticalFailed,
      status:gate ? "EXTERNAL-010 Phase 05 PC Real Runtime Validation PASS" : "EXTERNAL-010 Phase 05 PC Real Runtime Validation FAIL", releaseAllowed:gate,
      phase5PcRealRuntimeComplete:gate, phase5FinalGateReady:false,
      persistence:{ contentAddressed:true, metadataIndex:"SQLITE", immutableRawEvidence:true, restartReadbackValidatedByCli:false },
      regression:p5 ? { passed:p5.passed, failed:p5.failed, total:p5.total, health:p5.health, criticalFailed:p5.criticalFailed, status:p5.status } : null,
      phase4PcRealRuntime:p4pc ? { passed:p4pc.passed, failed:p4pc.failed, total:p4pc.total, health:p4pc.health, status:p4pc.status } : null,
      checks:c.checks, validatedAt:internal.nowIso()
    };
    state.latestPhase5PcRealRuntimeValidation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase5RealRuntimeValidation.status = gate ? "Passed" : "Failed"; internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase5PcRealRuntimeValidation(){ return state.latestPhase5PcRealRuntimeValidation ? internal.clone(state.latestPhase5PcRealRuntimeValidation) : null; }
  Object.assign(namespace.api,{ runExternalIntelligencePhase5PcRealRuntimeValidation, getLatestExternalIntelligencePhase5PcRealRuntimeValidation }); Object.assign(namespace,namespace.api);
  namespace.modules.phase5RealRuntimeValidation={ id:"EXTERNAL-010-PHASE5-PC-REAL-RUNTIME-VALIDATION", version:MODULE_VERSION, status:"Loaded", phase:5, decisions:["005","006","008","014"], realHttpRequired:true, sqliteRequired:true, loadedAt:internal.nowIso() };
  global.runExternalIntelligencePhase5PcRealRuntimeValidation=runExternalIntelligencePhase5PcRealRuntimeValidation;
})(typeof window !== "undefined" ? window : globalThis);
