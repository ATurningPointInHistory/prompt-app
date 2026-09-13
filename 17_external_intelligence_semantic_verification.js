/* ============================================================
   FILE: 17_external_intelligence_semantic_verification.js
   EXTERNAL-010 Initial Requirement Semantic Verification
   Release: 1.20.1 Candidate HF9
   Scope: 803 Initial Implementation Requirements.
   Rule: explicit frozen semantic source assertions + existing runtime gates.
   Dynamic keyword search does NOT grant semantic PASS.
   ============================================================ */
(function (global) {
  "use strict";
  const n = global.EXTERNAL010ExternalIntelligence;
  const m = global.EXTERNAL010VersionManifest;
  if (!n || !n.__internal || !m) return;
  const i = n.__internal;
  const s = i.state;
  const v = m.getModuleVersion("semanticVerification") || m.release.version;
  const PROOF_URL = "./EXTERNAL-010_REQUIREMENT_SEMANTIC_PROOFS_1.0.0.json";
  const sourceCache = new Map();

  async function fetchJson(url) {
    const response = await fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "hf9=" + encodeURIComponent(m.release.version), { cache:"no-store" });
    if (!response.ok) throw new Error("SEMANTIC_PROOF_FETCH_FAILED:" + url + ":" + response.status);
    return response.json();
  }
  async function loadSource(fileName) {
    if (sourceCache.has(fileName)) return sourceCache.get(fileName);
    const response = await fetch("./" + fileName + "?hf9=" + encodeURIComponent(m.release.version), { cache:"no-store" });
    if (!response.ok) throw new Error("SEMANTIC_SOURCE_FETCH_FAILED:" + fileName + ":" + response.status);
    const source = await response.text();
    sourceCache.set(fileName, source);
    return source;
  }
  function suitePass(result, expectedTotal) {
    return Boolean(result && Number(result.failed) === 0 && Number(result.total) === Number(expectedTotal) && Number(result.criticalFailed || 0) === 0);
  }
  async function runRequiredGates() {
    const apis = [
      ["REPAIR_45", "runExternalIntelligenceConformanceValidation", 45],
      ["GAP_REPAIR_34", "runExternalIntelligenceInitialScopeCompletionValidation", 34],
      ["VALIDATION_COVERAGE_65", "runExternalIntelligenceInitialScopeValidationCoverage", 65],
      ["TRACEABILITY_706", "runExternalIntelligenceTraceabilityCoverageValidation", 706],
      ["PHASE21_31", "runExternalIntelligencePhase21Validation", 31]
    ];
    const results = {};
    for (const spec of apis) {
      const fn = n[spec[1]];
      if (typeof fn !== "function") {
        results[spec[0]] = { id:spec[0], passed:false, expectedTotal:spec[2], reason:"API_UNAVAILABLE:" + spec[1] };
        continue;
      }
      const raw = await fn();
      results[spec[0]] = {
        id:spec[0], passed:suitePass(raw, spec[2]), expectedTotal:spec[2],
        actualTotal:Number(raw && raw.total || 0), failed:Number(raw && raw.failed || 0),
        criticalFailed:Number(raw && raw.criticalFailed || 0), resultId:raw && raw.id || null
      };
    }
    return results;
  }
  function gatesPassed(gates) {
    return Object.keys(gates || {}).length === 5 && Object.values(gates).every(function (x) { return x && x.passed === true; });
  }
  async function verifySourceAssertions(entry) {
    const assertionResults = [];
    for (const assertion of (entry.sourceAssertions || [])) {
      try {
        const source = await loadSource(assertion.file);
        const lower = source.toLowerCase();
        const markerResults = (assertion.containsAll || []).map(function (marker) {
          return { marker:marker, found:lower.includes(String(marker).toLowerCase()) };
        });
        assertionResults.push({
          file:assertion.file,
          passed:markerResults.length > 0 && markerResults.every(function (x) { return x.found; }),
          markerResults:markerResults
        });
      } catch (error) {
        assertionResults.push({ file:assertion.file, passed:false, error:error && error.message || String(error), markerResults:[] });
      }
    }
    return {
      passed:assertionResults.length > 0 && assertionResults.every(function (x) { return x.passed; }),
      assertions:assertionResults
    };
  }

  async function runExternalIntelligenceSemanticVerification() {
    const audit = s.latestFullMemoAudit || null;
    if (!audit || audit.traceabilityComplete !== true || audit.exactCatalogMemoHashMatch !== true || Number(audit.requirementCount) !== 803) {
      return i.deepFreeze({
        id:i.nextId("EXTERNAL-010-SEMANTIC-VERIFICATION"), componentId:"EXTERNAL-010", version:m.release.version,
        ok:false, status:"BLOCKED", code:"FULL_MEMO_TRACEABILITY_AUDIT_REQUIRED",
        semanticConformanceGranted:false, verifiedRequirementCount:0, requirementCount:803,
        releaseAllowed:false, projectOwnerAcceptanceRequired:true, validatedAt:i.nowIso(), immutable:true
      });
    }

    const proofCatalog = await fetchJson(PROOF_URL);
    const catalogSourceMatch = proofCatalog && proofCatalog.sourceMemoSha256 === audit.sourceMemoSha256;
    const requirementCountMatch = Number(proofCatalog && proofCatalog.requirementCount) === 803 && Array.isArray(proofCatalog.entries) && proofCatalog.entries.length === 803;
    if (!catalogSourceMatch || !requirementCountMatch || proofCatalog.dynamicKeywordSearchAllowed !== false || proofCatalog.staticAssertionAloneIsSemanticPass !== false) {
      return i.deepFreeze({
        id:i.nextId("EXTERNAL-010-SEMANTIC-VERIFICATION"), componentId:"EXTERNAL-010", version:m.release.version,
        ok:false, status:"BLOCKED", code:"SEMANTIC_PROOF_CATALOG_INVALID",
        catalogSourceMatch:catalogSourceMatch, requirementCountMatch:requirementCountMatch,
        semanticConformanceGranted:false, verifiedRequirementCount:0, requirementCount:803,
        releaseAllowed:false, validatedAt:i.nowIso(), immutable:true
      });
    }

    const gates = await runRequiredGates();
    const runtimeGatePassed = gatesPassed(gates);
    const checks = [];
    const verifiedRequirementIds = [];
    for (const entry of proofCatalog.entries) {
      const sourceProof = await verifySourceAssertions(entry);
      const passed = sourceProof.passed === true && runtimeGatePassed === true;
      if (passed) verifiedRequirementIds.push(entry.requirementId);
      checks.push({
        requirementId:entry.requirementId,
        decisionId:entry.decisionId,
        name:entry.requirementText,
        passed:passed,
        proofMode:entry.proofMode,
        sourceProofPassed:sourceProof.passed === true,
        integratedRuntimeGatePassed:runtimeGatePassed,
        semanticPassGranted:passed,
        detail:i.stableStringify({ sourceAssertions:sourceProof.assertions, validationGates:gates }),
        group:"Initial Requirement Semantic Verification",
        severity:"Critical"
      });
    }

    const passed = checks.filter(function (x) { return x.passed; }).length;
    const failed = checks.length - passed;
    const result = i.deepFreeze({
      id:i.nextId("EXTERNAL-010-SEMANTIC-VERIFICATION"), componentId:"EXTERNAL-010", version:m.release.version,
      gatewayVersion:m.gateway.gatewayVersion, implementationPhase:m.release.implementationPhase,
      proofCatalogId:proofCatalog.proofCatalogId, proofMethod:proofCatalog.proofMethod,
      dynamicKeywordSearchAllowed:false, crossDecisionProofSearchAllowed:false,
      sourceMemoFileName:audit.sourceMemoFileName, sourceMemoSha256:audit.sourceMemoSha256,
      exactCatalogMemoHashMatch:audit.exactCatalogMemoHashMatch === true,
      traceabilityCompleteAtVerification:audit.traceabilityComplete === true,
      requirementCount:checks.length, verifiedRequirementCount:passed, semanticUnverifiedRequirementCount:failed,
      passed:passed, failed:failed, total:checks.length,
      health:checks.length ? Math.round((passed/checks.length)*1000)/10 : 0,
      criticalFailed:checks.filter(function (x) { return !x.passed && x.severity === "Critical"; }).length,
      validationGates:gates, allValidationGatesPassed:runtimeGatePassed,
      semanticConformanceGranted:failed === 0 && passed === 803 && runtimeGatePassed,
      conformanceComplete:failed === 0 && passed === 803 && runtimeGatePassed,
      verifiedRequirementIds:verifiedRequirementIds,
      releaseAllowed:false, finalReleaseAllowed:false,
      projectOwnerAcceptanceRequired:true, pcRealRuntimeRevalidationRequired:true, androidRealDeviceRevalidationRequired:true,
      checks:checks, validatedAt:i.nowIso(), immutable:true
    });
    s.latestSemanticVerification = result;
    i.touch();
    return result;
  }

  function getExternalIntelligenceSemanticVerificationSummary() {
    const r = s.latestSemanticVerification;
    if (!r) return null;
    return {
      id:r.id, requirementCount:r.requirementCount, verifiedRequirementCount:r.verifiedRequirementCount,
      semanticUnverifiedRequirementCount:r.semanticUnverifiedRequirementCount, failed:r.failed, health:r.health,
      allValidationGatesPassed:r.allValidationGatesPassed, semanticConformanceGranted:r.semanticConformanceGranted,
      conformanceComplete:r.conformanceComplete, sourceMemoFileName:r.sourceMemoFileName,
      exactCatalogMemoHashMatch:r.exactCatalogMemoHashMatch, validatedAt:r.validatedAt
    };
  }

  Object.assign(n.api, { runExternalIntelligenceSemanticVerification, getExternalIntelligenceSemanticVerificationSummary });
  Object.assign(n, n.api);
  n.modules.semanticVerification = {
    id:"EXTERNAL-010-SEMANTIC-VERIFICATION", version:v, status:"Ready", phase:21,
    requirementCount:803, dynamicKeywordSearchAllowed:false, staticAssertionAloneIsSemanticPass:false,
    authorityNeutralByDefault:true, loadedAt:i.nowIso()
  };
  global.runExternalIntelligenceSemanticVerification = runExternalIntelligenceSemanticVerification;
})(typeof window !== "undefined" ? window : globalThis);
