/* ============================================================
   FILE: 17_external_intelligence_privacy_identity.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.5.0
   Phase 06: Privacy / Identity Protection
   Decision: 050
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("privacyIdentity");
  const RISKS = new Set(VERSION_MANIFEST.privacy.privacyRiskStates || []);

  function assessExternalIntelligencePrivacy(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const subjectId = internal.text(x.subjectId, "");
    if (!subjectId) return internal.buildResult(false, "EXTERNAL010_PRIVACY_SUBJECT_REQUIRED", "Blocked", null);
    const requestedSensitive = x.sensitiveAttributeInferenceRequested === true;
    const requestedRealPerson = x.realPersonResolutionRequested === true;
    const requestedCrossPlatform = x.crossPlatformLinkRequested === true;
    const requestedReidentify = x.reIdentificationRequested === true;
    let risk = internal.text(x.privacyRisk, "LOW").toUpperCase();
    if (requestedSensitive || requestedRealPerson || requestedReidentify) risk = "RESTRICTED";
    else if (requestedCrossPlatform && risk === "LOW") risk = "MODERATE";
    if (!RISKS.has(risk)) risk = "UNKNOWN";
    const record = internal.deepFreeze({
      privacyAssessmentId: internal.nextId("EXTERNAL-010-PRIVACY"),
      subjectId,
      identityMode: "PSEUDONYMOUS_ACCOUNT",
      purposeId: internal.text(x.purposeId, "UNSPECIFIED"),
      privacyRisk: risk,
      sensitiveInferenceAllowed: false,
      realPersonResolutionAllowed: false,
      crossPlatformLinkConfirmed: false,
      reIdentificationAllowed: false,
      dataMinimized: x.dataMinimized !== false,
      accountClusterCandidate: x.accountClusterCandidate === true,
      botCandidate: x.botCandidate === true,
      coordinationCandidate: x.coordinationCandidate === true,
      confidence: internal.text(x.confidence, "UNKNOWN").toUpperCase(),
      createdAt: internal.nowIso(),
      immutable: true
    });
    const cv = namespace.validateExternalIntelligenceContract("privacyAssessment", record);
    const sv = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PRIVACY-ASSESSMENT", record);
    if (!cv.valid || !sv.valid) return internal.buildResult(false, "EXTERNAL010_PRIVACY_ASSESSMENT_INVALID", "Blocked", { contract:cv, schema:sv });
    state.privacyAssessments.set(record.privacyAssessmentId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_PRIVACY_ASSESSMENT_CREATED", risk === "RESTRICTED" ? "Restricted" : "Ready", { privacyAssessment:internal.clone(record), profilingAuthorityGranted:false });
  }

  function createExternalIntelligenceCrossPlatformLinkCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const left = internal.text(x.leftAccountId, ""); const right = internal.text(x.rightAccountId, "");
    if (!left || !right || left === right) return internal.buildResult(false, "EXTERNAL010_PRIVACY_LINK_INPUT_INVALID", "Blocked", null);
    const id = internal.nextId("EXTERNAL-010-IDENTITY-LINK-CANDIDATE");
    const record = internal.deepFreeze({ linkCandidateId:id, leftAccountId:left, rightAccountId:right, evidenceRefs:internal.unique(x.evidenceRefs || []), confidence:internal.text(x.confidence,"UNKNOWN").toUpperCase(), samePersonConfirmed:false, realPersonIdentityResolved:false, authorityGranted:false, createdAt:internal.nowIso(), immutable:true });
    state.privacyIdentityLinks.set(id, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_CROSS_PLATFORM_LINK_CANDIDATE_CREATED", "Candidate", { candidate:internal.clone(record) });
  }

  function requestRestrictedExternalIntelligenceIdentityResolution(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const purpose = internal.text(x.purposeId, "");
    return internal.buildResult(false, "EXTERNAL010_REIDENTIFICATION_RESTRICTED", "Blocked", { subjectId:internal.text(x.subjectId,""), purposeId:purpose || null, explicitPurposeRequired:true, privacyRiskReviewRequired:true, usagePolicyRequired:true, authorityRequired:true, reIdentificationPerformed:false });
  }

  function initializeExternalIntelligencePrivacyIdentity() {
    namespace.modules.privacyIdentity.status = "Ready";
    return internal.buildResult(true, "EXTERNAL010_PRIVACY_IDENTITY_INITIALIZED", "Ready", { defaultIdentityMode:"PSEUDONYMOUS_ACCOUNT", dataMinimizationRequired:true, realPersonResolutionRestricted:true, sensitiveAttributeInferenceRestricted:true, reIdentificationRestricted:true });
  }

  Object.assign(namespace.api, { initializeExternalIntelligencePrivacyIdentity, assessExternalIntelligencePrivacy, createExternalIntelligenceCrossPlatformLinkCandidate, requestRestrictedExternalIntelligenceIdentityResolution });
  Object.assign(namespace, namespace.api);
  namespace.modules.privacyIdentity = { id:"EXTERNAL-010-PRIVACY-IDENTITY", version:MODULE_VERSION, status:"Loaded", phase:6, decision:"050", defaultIdentityMode:"PSEUDONYMOUS_ACCOUNT", loadedAt:internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
