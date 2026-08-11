/* ============================================================
   FILE: 13_knowledge_navigator_phase8_validation.js
   IDE-180 Knowledge Navigator
   Release: 1.7.0 / Module: Phase 8 Validation 1.0.0
   Phase 8: Recovery / Archive Boundary
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 8 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase8Validation");

  function checkFactory(checks) {
    return function check(name, passed, detail, group, severity) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: detail == null ? "" : (typeof detail === "string" ? detail : JSON.stringify(detail)),
        group: group || "General",
        severity: severity || "High"
      });
    };
  }

  function summary(checks) {
    const passed = checks.filter(function item(check) { return check.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function item(check) { return !check.passed && check.severity === "Critical"; }).length;
    return {
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
      criticalFailed: criticalFailed
    };
  }

  async function buildLegacyArchive() {
    const zip = new global.JSZip();
    zip.file("memo_boxes.json", JSON.stringify([
      { id: "ARCHIVE-KO-001", name: "Archive Knowledge One", memoMode: "knowledge", knowledgeType: "Specification", status: "Historical", text: "Phase 8 archive recovery fixture alpha" },
      { id: "ARCHIVE-DECISION-001", name: "Archive Decision One", memoMode: "knowledge", knowledgeType: "Decision", status: "Official", text: "Phase 8 archive recovery fixture beta" }
    ], null, 2));
    return zip.generateAsync({ type: "uint8array" });
  }

  async function buildManifestArchive(options) {
    const settings = options || {};
    const records = [
      { id: "MANIFEST-KO-001", name: "Manifest Archive Knowledge", memoMode: "knowledge", knowledgeType: "Specification", status: "Official", text: "manifest verified fixture" }
    ];
    const zip = new global.JSZip();
    zip.file("archive_manifest.json", JSON.stringify({
      archiveId: settings.archiveId || "IDE180-PHASE8-ARCHIVE-001",
      version: "1.0.0",
      sourceType: settings.sourceType || "memo-archive-zip",
      projectId: settings.projectId || "AI-PROMPT-OS-PHASE8-FIXTURE",
      createdAt: "2026-08-11T00:00:00.000Z",
      recordCount: settings.recordCount == null ? records.length : settings.recordCount,
      indexVersion: "1.0.0"
    }, null, 2));
    zip.file("memo_boxes.json", JSON.stringify(records, null, 2));
    return zip.generateAsync({ type: "uint8array" });
  }

  async function runKnowledgeNavigatorPhase8Validation() {
    const checks = [];
    const check = checkFactory(checks);
    const initialized = namespace.initialize({ requireIDE170: true });

    check("IDE-180 initialization succeeds", initialized && initialized.ok === true, initialized && initialized.code, "Initialization", "Critical");
    check("Release Version is 1.7.0", VERSION_MANIFEST.release.version === "1.7.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 8", VERSION_MANIFEST.implementation.phase === 8 && /Phase 8/.test(VERSION_MANIFEST.release.implementationPhase), VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains 1.0.0", VERSION_MANIFEST.release.designFreezeVersion === "1.0.0", VERSION_MANIFEST.release.designFreezeVersion, "Manifest", "High");
    check("Completed phases include 1 through 7", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6,7]), VERSION_MANIFEST.implementation.completedPhases, "Manifest", "High");

    Object.keys(VERSION_MANIFEST.safety || {}).forEach(function safetyFlag(name) {
      check("Safety flag remains disabled: " + name, VERSION_MANIFEST.safety[name] === false, VERSION_MANIFEST.safety[name], "Safety", "Critical");
    });

    check("All twenty Navigation Types remain implemented", namespace.listNavigationTypes().filter(function item(type) { return type.implemented === true; }).length === 20, namespace.listNavigationTypes().filter(function item(type) { return type.implemented === true; }).length, "Regression", "Critical");
    check("Memo Archive Provider module is Ready", namespace.modules.memoArchiveProvider && namespace.modules.memoArchiveProvider.status === "Ready", namespace.modules.memoArchiveProvider && namespace.modules.memoArchiveProvider.status, "Modules", "Critical");
    check("Recovery module is Ready", namespace.modules.recovery && namespace.modules.recovery.status === "Ready", namespace.modules.recovery && namespace.modules.recovery.status, "Modules", "Critical");
    check("Exactly six Source Providers are registered in Phase 8", namespace.listProviderDefinitions().length === 6, namespace.listProviderDefinitions().map(function item(ref) { return ref.providerId; }), "Providers", "Critical");

    const archiveProvider = namespace.getProviderDefinition("IDE-180-PROVIDER-MEMO-ARCHIVE");
    check("Memo Archive Provider is registered", Boolean(archiveProvider), archiveProvider && archiveProvider.providerId, "Providers", "Critical");
    check("Memo Archive Provider satisfies frozen Source Provider Contract", namespace.validateContract("sourceProvider", archiveProvider).valid === true, namespace.validateContract("sourceProvider", archiveProvider).failed, "Contracts", "Critical");
    check("Memo Archive Provider is read-only", archiveProvider && archiveProvider.readMode === "read-only", archiveProvider && archiveProvider.readMode, "Safety", "Critical");
    check("Memo Archive Provider starts not-loaded before user selection", namespace.getMemoArchiveProviderStatus().availability === "not-loaded", namespace.getMemoArchiveProviderStatus().availability, "Consent Boundary", "Critical");
    check("Memo Archive Provider forbids automatic import", namespace.modules.memoArchiveProvider.automaticImportAllowed === false, namespace.modules.memoArchiveProvider.automaticImportAllowed, "Safety", "Critical");
    check("Memo Archive Provider forbids automatic open", namespace.modules.memoArchiveProvider.automaticOpenAllowed === false, namespace.modules.memoArchiveProvider.automaticOpenAllowed, "Consent Boundary", "Critical");

    const recoveryStatus = namespace.getKnowledgeNavigatorRecoveryStatus();
    check("Recovery requires explicit user consent", namespace.modules.recovery.explicitUserConsentRequired === true, namespace.modules.recovery.explicitUserConsentRequired, "Consent Boundary", "Critical");
    check("Recovery forbids automatic archive search", recoveryStatus.automaticArchiveSearchAllowed === false, recoveryStatus.automaticArchiveSearchAllowed, "Safety", "Critical");
    check("Recovery forbids automatic archive import", recoveryStatus.automaticArchiveImportAllowed === false, recoveryStatus.automaticArchiveImportAllowed, "Safety", "Critical");
    check("Missing Source inference remains disabled", recoveryStatus.missingSourceInferenceAllowed === false, recoveryStatus.missingSourceInferenceAllowed, "Safety", "Critical");

    const missingKnowledge = { status: "missing-source", navigationType: "knowledge", target: { id: "ARCHIVE-KO-001" }, missingSources: [{ sourceType: "memo-current", reason: "not-found" }] };
    const suggestion = namespace.getRecoverySuggestion(missingKnowledge);
    check("Missing Knowledge receives Archive Recovery option", suggestion.available === true && suggestion.recoveryType === "memo-archive-zip", suggestion, "Recovery", "Critical");
    check("Recovery suggestion requires user consent", suggestion.requiresUserConsent === true, suggestion.requiresUserConsent, "Consent Boundary", "Critical");
    check("Recovery suggestion does not allow automatic search", suggestion.automaticSearchAllowed === false, suggestion.automaticSearchAllowed, "Safety", "Critical");
    check("Architecture missing-source does not incorrectly offer Memo Archive recovery", namespace.getRecoverySuggestion({ status: "missing-source", navigationType: "architecture" }).available === false, namespace.getRecoverySuggestion({ status: "missing-source", navigationType: "architecture" }), "Recovery", "Critical");

    const request = namespace.createKnowledgeRecoveryRequest(missingKnowledge, { query: "ARCHIVE-KO-001" });
    const recoveryId = request && request.data && request.data.recovery && request.data.recovery.recoveryId;
    check("Recovery Request creates without archive access", request && request.ok === true && request.status === "awaiting-consent", request && request.status, "Recovery", "Critical");
    check("Recovery Request has stable identity", Boolean(recoveryId), recoveryId, "Recovery", "Critical");
    check("Creating Recovery Request does not open archive", namespace.getMemoArchiveProviderStatus().availability === "not-loaded", namespace.getMemoArchiveProviderStatus().availability, "Consent Boundary", "Critical");

    if (typeof global.JSZip !== "function") {
      check("JSZip is available for real archive gate", false, "JSZip unavailable", "Archive", "Critical");
    } else {
      const legacyBytes = await buildLegacyArchive();
      const noConsent = await namespace.openSelectedMemoArchiveForRecovery(recoveryId, legacyBytes, { userConsent: false });
      check("Archive open without explicit consent is blocked", noConsent && noConsent.ok === false && /CONSENT/.test(noConsent.code || ""), noConsent && noConsent.code, "Consent Boundary", "Critical");
      check("Blocked archive open leaves Provider not-loaded", namespace.getMemoArchiveProviderStatus().availability === "not-loaded", namespace.getMemoArchiveProviderStatus().availability, "Consent Boundary", "Critical");

      const memoBefore = typeof global.getMemoBoxList === "function" ? global.getMemoBoxList().length : null;
      const legacyOpen = await namespace.openSelectedMemoArchiveForRecovery(recoveryId, legacyBytes, { userConsent: true });
      const legacyStatus = namespace.getMemoArchiveProviderStatus();
      check("User-selected legacy ZIP opens read-only", legacyOpen && legacyOpen.ok === true, legacyOpen && legacyOpen.code, "Archive", "Critical");
      check("Legacy ZIP without manifest is classified unverified", legacyStatus.trust === "unverified", legacyStatus.trust, "Trust", "Critical");
      check("Legacy ZIP remains not imported", legacyStatus.imported === false, legacyStatus.imported, "Safety", "Critical");
      check("Legacy ZIP exposes two records", legacyStatus.recordCount === 2, legacyStatus.recordCount, "Archive", "Critical");
      check("Archive Source Type is memo-archive-zip", legacyStatus.providerId === "IDE-180-PROVIDER-MEMO-ARCHIVE", legacyStatus, "Traceability", "Critical");
      const archiveRecords = namespace.listMemoArchiveSourceRecords();
      check("All Archive records satisfy Normalized Source Record Contract", archiveRecords.every(function item(record) { return namespace.validateContract("normalizedSourceRecord", record).valid === true; }), archiveRecords.length, "Normalization", "Critical");
      check("All Archive records are immutable", archiveRecords.every(function item(record) { return record.immutable === true && Object.isFrozen(record); }), archiveRecords.length, "Read-Only", "Critical");
      check("All Archive records preserve imported=false provenance", archiveRecords.every(function item(record) { return record.sourceMetadata && record.sourceMetadata.imported === false; }), archiveRecords.length, "Traceability", "Critical");

      const searched = namespace.searchSelectedMemoArchiveForRecovery(recoveryId, "ARCHIVE-KO-001");
      check("Explicit Recovery search finds archive record", searched && searched.ok === true && searched.status === "found" && searched.data.records.length === 1, searched && searched.data && searched.data.records.length, "Recovery", "Critical");
      const selectedId = searched && searched.data && searched.data.records[0] && searched.data.records[0].recordId;
      const temporary = namespace.selectKnowledgeRecoveryAction(recoveryId, "temporary-reference", [selectedId]);
      check("Temporary Reference can be selected explicitly", temporary && temporary.ok === true, temporary && temporary.code, "Recovery", "Critical");
      check("Temporary Reference remains read-only and not imported", temporary && temporary.data && temporary.data.provenance[0] && temporary.data.provenance[0].readMode === "read-only" && temporary.data.provenance[0].imported === false, temporary && temporary.data && temporary.data.provenance, "Safety", "Critical");

      const importDelegation = namespace.selectKnowledgeRecoveryAction(recoveryId, "import-selected", [selectedId]);
      check("Import Selected is delegated instead of executed by Navigator", importDelegation && importDelegation.ok === true && importDelegation.data.delegationRequired === true && importDelegation.data.mutationPerformed === false, importDelegation && importDelegation.data, "Mutation Boundary", "Critical");
      check("Import delegation requires explicit user action", importDelegation && importDelegation.data && importDelegation.data.applicationCommand.explicitUserActionRequired === true, importDelegation && importDelegation.data && importDelegation.data.applicationCommand, "Mutation Boundary", "Critical");
      check("Navigator does not execute Import Application Command", importDelegation && importDelegation.data && importDelegation.data.applicationCommand.navigatorExecutesCommand === false, importDelegation && importDelegation.data && importDelegation.data.applicationCommand, "Mutation Boundary", "Critical");
      const memoAfter = typeof global.getMemoBoxList === "function" ? global.getMemoBoxList().length : null;
      check("Archive Recovery never mutates Current Memo list", memoBefore == null || memoAfter === memoBefore, String(memoBefore) + "->" + String(memoAfter), "Read-Only", "Critical");

      namespace.closeMemoArchiveSource();
      const verifiedBytes = await buildManifestArchive({});
      const verifiedOpen = await namespace.openMemoArchiveSource(verifiedBytes, { userConsent: true });
      check("Valid Manifest Archive opens", verifiedOpen && verifiedOpen.ok === true, verifiedOpen && verifiedOpen.code, "Archive Manifest", "Critical");
      check("Valid Manifest Archive is classified verified-archive", namespace.getMemoArchiveProviderStatus().trust === "verified-archive", namespace.getMemoArchiveProviderStatus().trust, "Trust", "Critical");
      check("Manifest Archive records observed archive integrity hash", Boolean(namespace.getMemoArchiveProviderStatus().archiveHash), namespace.getMemoArchiveProviderStatus().archiveHashAlgorithm, "Integrity", "Critical");

      namespace.closeMemoArchiveSource();
      const relatedBytes = await buildManifestArchive({ projectId: "AI-PROMPT-OS-PHASE8-FIXTURE" });
      const relatedOpen = await namespace.openMemoArchiveSource(relatedBytes, { userConsent: true, currentProjectId: "AI-PROMPT-OS-PHASE8-FIXTURE" });
      check("Same-project Manifest Archive opens", relatedOpen && relatedOpen.ok === true, relatedOpen && relatedOpen.code, "Archive Manifest", "Critical");
      check("Explicit same Project identity classifies verified-related", namespace.getMemoArchiveProviderStatus().trust === "verified-related" && namespace.getMemoArchiveProviderStatus().projectRelation === "same-project", namespace.getMemoArchiveProviderStatus(), "Trust", "Critical");

      namespace.closeMemoArchiveSource();
      const mismatchBytes = await buildManifestArchive({ recordCount: 9 });
      const mismatchOpen = await namespace.openMemoArchiveSource(mismatchBytes, { userConsent: true });
      check("Manifest record-count mismatch remains readable", mismatchOpen && mismatchOpen.ok === true, mismatchOpen && mismatchOpen.code, "Archive Manifest", "High");
      check("Manifest record-count mismatch downgrades trust to unverified", namespace.getMemoArchiveProviderStatus().trust === "unverified", namespace.getMemoArchiveProviderStatus().trust, "Trust", "Critical");
      check("Manifest record-count mismatch is disclosed", namespace.getMemoArchiveProviderStatus().warnings.some(function item(value) { return String(value).includes("manifest-record-count-mismatch"); }), namespace.getMemoArchiveProviderStatus().warnings, "Traceability", "Critical");

      namespace.closeMemoArchiveSource();
      const incompatibleBytes = await buildManifestArchive({ sourceType: "different-archive-type" });
      const incompatibleOpen = await namespace.openMemoArchiveSource(incompatibleBytes, { userConsent: true });
      check("Incompatible Archive Source Type is rejected", incompatibleOpen && incompatibleOpen.ok === false && incompatibleOpen.status === "incompatible", incompatibleOpen && incompatibleOpen.status, "Compatibility", "Critical");

      namespace.closeMemoArchiveSource();
      const corruptedOpen = await namespace.openMemoArchiveSource(new Uint8Array([1,2,3,4,5,6]), { userConsent: true });
      check("Corrupted ZIP is rejected", corruptedOpen && corruptedOpen.ok === false && corruptedOpen.status === "corrupted", corruptedOpen && corruptedOpen.status, "Integrity", "Critical");

      namespace.closeMemoArchiveSource();
      check("Closing Archive removes temporary records", namespace.getMemoArchiveProviderStatus().availability === "not-loaded" && namespace.listMemoArchiveSourceRecords().length === 0, namespace.getMemoArchiveProviderStatus(), "Read-Only", "Critical");
    }

    const missingResult = await namespace.navigate({ navigationType: "knowledge", query: "IDE180-PHASE8-MISSING-KNOWLEDGE-DO-NOT-CREATE" });
    check("Missing federated Navigation remains source-bounded", ["missing-source", "not-found"].includes(missingResult.status), missingResult.status, "No Inference", "Critical");
    check("Missing Navigation Result exposes Recovery metadata", Boolean(missingResult.metadata && missingResult.metadata.recovery), missingResult.metadata && missingResult.metadata.recovery, "Recovery Integration", "Critical");
    check("Recovery metadata never enables automatic archive import", missingResult.metadata && missingResult.metadata.recovery && missingResult.metadata.recovery.automaticImportAllowed === false, missingResult.metadata && missingResult.metadata.recovery, "Safety", "Critical");

    check("Five original Source Providers remain read-only", [
      "IDE-180-PROVIDER-ARCHITECTURE",
      "IDE-180-PROVIDER-CURRENT-KNOWLEDGE",
      "IDE-180-PROVIDER-CURRENT-MEMO",
      "IDE-180-PROVIDER-IDE170-INTELLIGENCE-PACKAGE",
      "IDE-180-PROVIDER-VALIDATION-RESULTS"
    ].every(function item(id) { const p = namespace.getProviderDefinition(id); return p && p.readMode === "read-only"; }), "original providers", "Regression", "Critical");
    check("Six Resolvers remain registered", namespace.listResolverDefinitions().length === 6, namespace.listResolverDefinitions().length, "Regression", "Critical");
    check("Authority scoring remains disabled", VERSION_MANIFEST.safety.authorityScoringAllowed === false, VERSION_MANIFEST.safety.authorityScoringAllowed, "Regression", "Critical");
    check("Conflict scoring remains disabled", VERSION_MANIFEST.safety.conflictScoringAllowed === false, VERSION_MANIFEST.safety.conflictScoringAllowed, "Regression", "Critical");
    check("Direct Repository mutation remains disabled", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Regression", "Critical");
    check("Phase 8 Validation module is loaded", namespace.modules.phase8Validation && namespace.modules.phase8Validation.status === "Loaded", namespace.modules.phase8Validation && namespace.modules.phase8Validation.status, "Modules", "Critical");

    const counts = summary(checks);
    const releaseAllowed = counts.failed === 0 && counts.criticalFailed === 0;
    namespace.modules.phase8Validation.status = releaseAllowed ? "Ready" : "Blocked";
    return internal.deepFreeze({
      id: internal.nextId("IDE-180-PHASE8-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: counts.passed,
      failed: counts.failed,
      total: counts.total,
      health: counts.health,
      criticalFailed: counts.criticalFailed,
      status: releaseAllowed ? "IDE-180 Phase 8 Recovery / Archive Boundary PASS" : "IDE-180 Phase 8 Recovery / Archive Boundary FAIL",
      releaseAllowed: releaseAllowed,
      phase9Allowed: releaseAllowed,
      readOnly: true,
      automaticArchiveSearchAllowed: false,
      automaticArchiveImportAllowed: false,
      sourceProvider: namespace.getMemoArchiveProviderStatus(),
      checks: checks,
      validatedAt: internal.nowIso()
    });
  }

  Object.assign(namespace.api, { runKnowledgeNavigatorPhase8Validation: runKnowledgeNavigatorPhase8Validation });
  Object.assign(namespace, namespace.api);
  global.runKnowledgeNavigatorPhase8Validation = runKnowledgeNavigatorPhase8Validation;

  namespace.modules.phase8Validation = {
    id: "IDE-180-PHASE8-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 8,
    realArchiveGate: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
