/* ============================================================
   FILE: 17_external_intelligence_external_content_security.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.5.0
   Phase 06: External Content / Payload Security
   Decisions: 017 / 018
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("externalContentSecurity");

  const SIGNALS = Object.freeze([
    ["PROMPT_INJECTION", /(ignore|disregard|override)\s+(all\s+)?(previous|prior|system)|system\s+prompt|developer\s+message|jailbreak/i],
    ["SECRET_REQUEST", /(api\s*key|password|access\s*token|refresh\s*token|credential|secret)\s*(please|now|send|give|reveal|expose|upload)?/i],
    ["TOOL_REQUEST", /(run|execute|invoke|call)\s+(the\s+)?(tool|command|shell|powershell|terminal|script)/i],
    ["REPOSITORY_MUTATION_REQUEST", /(commit|push|modify|overwrite|delete)\s+.*(repository|repo|source\s*code|github|file)/i],
    ["FINANCIAL_REQUEST", /(buy|sell|trade|purchase|subscribe|pay|transfer)\s+/i],
    ["SCHEDULE_REQUEST", /(schedule|every\s+hour|every\s+day|tomorrow\s+at|remind\s+me)/i],
    ["CODE_EXECUTION_CANDIDATE", /<script\b|javascript:|powershell\s+-|cmd\.exe|\beval\s*\(/i]
  ]);

  function textFromInput(input) {
    const x = internal.isPlainObject(input) ? input : {};
    if (typeof x.rawText === "string") return x.rawText;
    if (typeof x.text === "string") return x.text;
    if (x.payload != null) return internal.stableStringify(x.payload);
    return "";
  }

  function sanitizeDerivedView(text) {
    return String(text || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "[REMOVED_SCRIPT]")
      .replace(/javascript:/gi, "[REMOVED_SCHEME]:")
      .replace(/\u0000/g, "");
  }

  function classifyExternalIntelligenceContent(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const rawText = textFromInput(x);
    const signals = SIGNALS.filter(function (pair) { return pair[1].test(rawText); }).map(function (pair) { return pair[0]; });
    const severe = signals.some(function (s) { return ["SECRET_REQUEST","REPOSITORY_MUTATION_REQUEST","FINANCIAL_REQUEST","CODE_EXECUTION_CANDIDATE"].includes(s); });
    const record = internal.deepFreeze({
      securityAssessmentId: internal.nextId("EXTERNAL-010-CONTENT-SECURITY"),
      evidenceId: x.evidenceId ? internal.text(x.evidenceId, "") : null,
      sourceId: x.sourceId ? internal.text(x.sourceId, "").toUpperCase() : null,
      contentHash: x.contentHash ? internal.text(x.contentHash, "").toLowerCase() : null,
      trustClass: "UNTRUSTED_EXTERNAL",
      securityState: severe ? "REVIEW_REQUIRED" : (signals.length ? "SANITIZED_UNTRUSTED" : "UNTRUSTED"),
      signals: internal.unique(signals),
      instructionAuthorityGranted: false,
      toolAuthorityGranted: false,
      secretAuthorityGranted: false,
      repositoryAuthorityGranted: false,
      financialAuthorityGranted: false,
      scheduleAuthorityGranted: false,
      sanitizedAutomaticallyTrusted: false,
      rawEvidencePreserved: true,
      sanitizedDerivedView: sanitizeDerivedView(rawText),
      sourceReliabilityGrantsInstructionAuthority: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("contentSecurityAssessment", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-CONTENT-SECURITY-ASSESSMENT", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_CONTENT_SECURITY_RECORD_INVALID", "Blocked", { contract:cv, schema:sv });
    state.contentSecurityAssessments.set(record.securityAssessmentId, record);
    internal.touch();
    return internal.buildResult(true, "EXTERNAL010_EXTERNAL_CONTENT_CLASSIFIED", record.securityState, { assessment: internal.clone(record), rawTextReturned:false });
  }

  function registerExternalIntelligenceTrustedScanner(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const scannerId = internal.text(x.scannerId, "").toUpperCase();
    if (!/^SCANNER-[A-Z0-9-]+$/.test(scannerId)) return internal.buildResult(false, "EXTERNAL010_SCANNER_ID_INVALID", "Blocked", null);
    if (x.identityVerified !== true || !internal.text(x.version, "") || !internal.text(x.provider, "")) return internal.buildResult(false, "EXTERNAL010_SCANNER_IDENTITY_UNVERIFIED", "Blocked", { scannerId });
    const record = internal.deepFreeze({ scannerId, provider:internal.text(x.provider,""), version:internal.text(x.version,""), identityVerified:true, healthState:internal.text(x.healthState,"UNKNOWN").toUpperCase(), automaticDownloadAllowed:false, automaticInstallAllowed:false, executionAuthorityGranted:false, createdAt:internal.nowIso(), immutable:true });
    state.trustedScannerRegistry.set(scannerId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_TRUSTED_SCANNER_REGISTERED", "Ready", { scanner:internal.clone(record) });
  }

  function validateExternalIntelligenceScannerResult(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const scanner = state.trustedScannerRegistry.get(internal.text(x.scannerId, "").toUpperCase());
    if (!scanner || scanner.identityVerified !== true) return internal.buildResult(false, "EXTERNAL010_UNKNOWN_SCANNER_REJECTED", "Blocked", { scannerId:x.scannerId || null, scanUnavailableImpliesClean:false });
    const result = internal.text(x.result, "UNKNOWN").toUpperCase();
    return internal.buildResult(["CLEAN","MALICIOUS","SUSPICIOUS","UNKNOWN"].includes(result), "EXTERNAL010_SCANNER_RESULT_RECORDED", result === "CLEAN" ? "Clean Signal Only" : "Review Required", { scanner:internal.clone(scanner), result, trusted:false, executionAuthorityGranted:false, repositoryAuthorityGranted:false, financialAuthorityGranted:false });
  }

  function quarantineExternalIntelligenceSource(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const sourceId = internal.text(x.sourceId, "").toUpperCase();
    return internal.buildResult(true, "EXTERNAL010_SOURCE_QUARANTINE_CANDIDATE", "Candidate", { sourceId, reason:internal.text(x.reason,"Security signal"), evidenceDeletionPerformed:false, automaticPermanentDeletionPerformed:false, authorityGranted:false });
  }

  function initializeExternalIntelligenceExternalContentSecurity() {
    namespace.modules.externalContentSecurity.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_EXTERNAL_CONTENT_SECURITY_INITIALIZED", "Ready", { defaultTrustClass:"UNTRUSTED_EXTERNAL", defaultPayloadState:"QUARANTINED", rawEvidencePreserved:true, instructionAuthoritySeparated:true, archiveAutoExtractAllowed:false, binaryAutoExecuteAllowed:false });
  }

  Object.assign(namespace.api, { initializeExternalIntelligenceExternalContentSecurity, classifyExternalIntelligenceContent, registerExternalIntelligenceTrustedScanner, validateExternalIntelligenceScannerResult, quarantineExternalIntelligenceSource });
  Object.assign(namespace, namespace.api);
  namespace.modules.externalContentSecurity = { id:"EXTERNAL-010-EXTERNAL-CONTENT-SECURITY", version:MODULE_VERSION, status:"Loaded", phase:6, decisions:["017","018"], defaultTrustClass:"UNTRUSTED_EXTERNAL", loadedAt:internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
