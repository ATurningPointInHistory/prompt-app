/* ============================================================
   FILE: 17_external_intelligence_traceability_coverage.js
   EXTERNAL-010 Explicit Requirement Traceability Coverage
   Release: 1.20.1 Candidate HF7
   Scope: 704 unresolved requirement links + targeted runtime checks
   for corrected D036 Audit/Lineage and D044 Regression Validation gaps.
   Traceability PASS does NOT grant semantic conformance or release approval.
   ============================================================ */
(function (global) {
  "use strict";
  const n = global.EXTERNAL010ExternalIntelligence;
  const m = global.EXTERNAL010VersionManifest;
  if (!n || !n.__internal || !m) return;
  const i = n.__internal;
  const s = i.state;
  const v = m.getModuleVersion("traceabilityCoverage") || m.release.version;
  const LINKS_URL = "./EXTERNAL-010_REQUIREMENT_TRACEABILITY_LINKS_1.1.0.json";
  const CATALOG_URL = "./EXTERNAL-010_REQUIREMENT_TRACEABILITY_1.0.0.json";
  const sourceCache = new Map();

  async function fetchJson(url) {
    const response = await fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "hf7=" + encodeURIComponent(m.release.version), { cache:"no-store" });
    if (!response.ok) throw new Error("TRACEABILITY_JSON_FETCH_FAILED:" + url + ":" + response.status);
    return response.json();
  }
  async function loadSource(fileName) {
    if (sourceCache.has(fileName)) return sourceCache.get(fileName);
    const response = await fetch("./" + fileName + "?hf7=" + encodeURIComponent(m.release.version), { cache:"no-store" });
    if (!response.ok) throw new Error("TRACEABILITY_SOURCE_FETCH_FAILED:" + fileName + ":" + response.status);
    const source = await response.text();
    sourceCache.set(fileName, source);
    return source;
  }
  function catalogMap(catalog) {
    const map = new Map();
    (catalog.decisions || []).forEach(function (decision) {
      (decision.requirements || []).forEach(function (req) { map.set(req.requirementId, req); });
    });
    return map;
  }
  function markerCheck(source, markers) {
    const haystack = String(source || "").toLowerCase();
    const results = (markers || []).map(function (marker) { return { marker:marker, found:haystack.includes(String(marker).toLowerCase()) }; });
    return { passed:results.length > 0 && results.every(function (x) { return x.found; }), results:results };
  }
  async function targetedD036() {
    if (typeof n.registerExternalIntelligenceAnalyticalCapability !== "function" || typeof n.createExternalIntelligenceCapabilityAuditLineage !== "function") return { passed:false, detail:"D036_RUNTIME_API_UNAVAILABLE" };
    const capabilityId = "EXTERNAL-010-CAPABILITY-HF7-TRACEABILITY";
    const reg = n.registerExternalIntelligenceAnalyticalCapability({ capabilityId:capabilityId, recordVersion:"1.0.0", capabilityType:"LLM", availabilityState:"READY", roles:["PRIMARY"], outputClassifications:["MODEL_ANALYSIS"], providerId:"LOCAL", modelFamily:"HF7", modelVersion:"1.0.0", algorithmVersion:"1.0.0" });
    if (!reg || reg.ok !== true) return { passed:false, detail:i.stableStringify(reg) };
    const result = await n.createExternalIntelligenceCapabilityAuditLineage({ capabilityId:capabilityId, inputReferenceIds:[], outputReferenceIds:[] });
    const rec = result && result.data && result.data.capabilityAuditLineage;
    return { passed:Boolean(result && result.ok === true && rec && rec.auditRequired === true && rec.lineageRequired === true && rec.automaticPromotionPerformed === false && rec.actionAuthorityGranted === false && rec.repositoryAuthorityGranted === false && rec.financialAuthorityGranted === false), detail:i.stableStringify(result) };
  }
  function targetedD044() {
    if (typeof n.createExternalIntelligenceRegressionValidationRecord !== "function") return { passed:false, detail:"D044_RUNTIME_API_UNAVAILABLE" };
    const result = n.createExternalIntelligenceRegressionValidationRecord({ baselineSuiteId:"HF7-BASELINE", baselineSuiteVersion:"1.0.0", candidateSuiteId:"HF7-CANDIDATE", candidateSuiteVersion:"1.0.1", changedCaseIds:["TRACEABILITY"], regressedCaseIds:[], criticalRegressionCount:0 });
    const rec = result && result.data && result.data.regressionValidation;
    return { passed:Boolean(result && result.ok === true && rec && rec.regressionState === "NO_REGRESSION_DETECTED" && rec.historicalResultsRewritten === false && rec.automaticPromotionPerformed === false && rec.approvalGranted === false && rec.authorityGranted === false), detail:i.stableStringify(result) };
  }

  async function runExternalIntelligenceTraceabilityCoverageValidation() {
    if (typeof n.initializeExternalIntelligenceFoundation === "function" && s.initialized !== true) await n.initializeExternalIntelligenceFoundation();
    const pair = await Promise.all([fetchJson(LINKS_URL), fetchJson(CATALOG_URL)]);
    const links = pair[0], catalog = pair[1], cmap = catalogMap(catalog);
    const checks = [];
    for (const entry of (links.entries || [])) {
      try {
        const source = await loadSource(entry.implementationFile);
        const marker = markerCheck(source, entry.implementationMarkers);
        const req = cmap.get(entry.requirementId);
        const expectedImpl = entry.implementationFile + "#trace:" + entry.requirementId;
        const expectedVal = "17_external_intelligence_traceability_coverage.js#" + entry.requirementId;
        const catalogLinked = Boolean(req && Array.isArray(req.implementationRefs) && req.implementationRefs.includes(expectedImpl) && Array.isArray(req.validationRefs) && req.validationRefs.includes(expectedVal) && req.verificationState === "TRACEABILITY_LINKED");
        checks.push({ requirementId:entry.requirementId, decisionId:entry.decisionId, name:entry.requirementText, passed:marker.passed === true && catalogLinked, detail:i.stableStringify({ validationType:"EXPLICIT_LINK_INTEGRITY", implementationFile:entry.implementationFile, markerResults:marker.results, catalogLinked:catalogLinked, semanticPassGranted:false }), group:"Explicit Requirement Traceability", severity:"Critical" });
      } catch (error) {
        checks.push({ requirementId:entry.requirementId, decisionId:entry.decisionId, name:entry.requirementText, passed:false, detail:error && error.message || String(error), group:"Explicit Requirement Traceability", severity:"Critical" });
      }
    }
    const d036 = await targetedD036();
    checks.push({ requirementId:"EXTERNAL-010-REQ-036-INIT-20", decisionId:"EXTERNAL-010-DECISION-036", name:"D036 Audit / Lineage targeted runtime", passed:d036.passed, detail:d036.detail, group:"Corrected Implementation Gap Runtime", severity:"Critical" });
    const d044 = targetedD044();
    checks.push({ requirementId:"EXTERNAL-010-REQ-044-INIT-16", decisionId:"EXTERNAL-010-DECISION-044", name:"D044 Regression Validation targeted runtime", passed:d044.passed, detail:d044.detail, group:"Corrected Implementation Gap Runtime", severity:"Critical" });

    const linkChecks = checks.filter(function (x) { return x.group === "Explicit Requirement Traceability"; });
    const passed = checks.filter(function (x) { return x.passed; }).length;
    const failed = checks.length - passed;
    const result = i.deepFreeze({
      id:i.nextId("EXTERNAL-010-TRACEABILITY-COVERAGE-VALIDATION"), componentId:"EXTERNAL-010", version:m.release.version, gatewayVersion:m.gateway.gatewayVersion,
      implementationPhase:m.release.implementationPhase,
      scope:"704 explicit Requirement ID traceability links plus 2 corrected implementation-gap runtime checks",
      requirementLinkCount:linkChecks.length, targetedRuntimeCheckCount:2, passed:passed, failed:failed, total:checks.length,
      traceabilityPassed:linkChecks.filter(function(x){return x.passed;}).length,
      traceabilityFailed:linkChecks.filter(function(x){return !x.passed;}).length,
      health:checks.length ? Math.round((passed/checks.length)*1000)/10 : 0,
      criticalFailed:checks.filter(function(x){return !x.passed && x.severity === "Critical";}).length,
      status:failed===0 ? "EXTERNAL-010 Traceability Coverage Validation PASS" : "EXTERNAL-010 Traceability Coverage Validation FAIL",
      validationType:"DECISION_SCOPED_EXPLICIT_LINK_INTEGRITY_PLUS_TARGETED_RUNTIME",
      semanticConformanceGranted:false, verifiedRequirementCountGranted:0, releaseAllowed:false, projectOwnerAcceptanceRequired:true,
      pcRealRuntimeRevalidationRequired:true, androidRealDeviceRevalidationRequired:true, checks:checks, validatedAt:i.nowIso(), immutable:true
    });
    s.latestTraceabilityCoverage = result; i.touch(); return result;
  }
  Object.assign(n.api, { runExternalIntelligenceTraceabilityCoverageValidation }); Object.assign(n, n.api);
  n.modules.traceabilityCoverage = { id:"EXTERNAL-010-TRACEABILITY-COVERAGE", version:v, status:"Ready", phase:21, requirementLinkCount:704, semanticConformanceGranted:false, authorityNeutralByDefault:true, loadedAt:i.nowIso() };
  global.runExternalIntelligenceTraceabilityCoverageValidation = runExternalIntelligenceTraceabilityCoverageValidation;
})(typeof window !== "undefined" ? window : globalThis);
