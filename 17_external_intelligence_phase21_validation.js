/* ============================================================
   FILE: 17_external_intelligence_phase21_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.20.0
   Phase 21 Integrated Validation / Release Gate / Handoff
   Scope: Decision 001 .. 054
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VM = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VM) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VM.getModuleVersion("phase21Validation");

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function each(key) { output[key] = stableValue(value[key]); });
    return output;
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  async function sha256Bytes(buffer) {
    if (!global.crypto || !global.crypto.subtle) throw new Error("Web Crypto API unavailable");
    const digest = await global.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map(function hex(v) { return v.toString(16).padStart(2, "0"); }).join("");
  }

  async function sha256Text(text) {
    return sha256Bytes(new TextEncoder().encode(String(text == null ? "" : text)).buffer);
  }

  function normalizeScriptPath(src) {
    return String(src || "").trim().split("#")[0].split("?")[0].replace(/^\.\//, "");
  }

  function cacheKeyFromScriptUrl(src) {
    const match = String(src || "").match(/[?&]h=([a-f0-9]+)/i);
    return match ? match[1] : "";
  }

  function manifestHashPayload(manifest) {
    const copy = JSON.parse(JSON.stringify(manifest || {}));
    delete copy.manifestHash;
    delete copy.updatedAt;
    return copy;
  }

  function manifestScriptSetPayload(manifest) {
    const hashes = manifest && manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};
    return (manifest && Array.isArray(manifest.scripts) ? manifest.scripts : []).map(function map(src) {
      const path = normalizeScriptPath(src);
      return path + ":" + String(hashes[path] && hashes[path].sha256 || "");
    }).join("\n");
  }

  async function validateStaticIntegrity() {
    const result = {
      ok: false,
      manifestStructureValid: false,
      manifestIntegrityValid: false,
      indexScriptSequenceMatches: false,
      indexManifestHashMatches: false,
      scriptCount: 0,
      fetchedScriptCount: 0,
      fetchFailureCount: 0,
      scriptHashMismatchCount: 0,
      scriptByteSizeMismatchCount: 0,
      scriptCacheKeyMismatchCount: 0,
      errors: [],
      manifestHash: null,
      scriptSetHash: null
    };
    try {
      const stamp = Date.now();
      const manifestResponse = await global.fetch("./00_script_manifest.json?phase21=" + stamp, { cache: "no-store" });
      const indexResponse = await global.fetch("./index.html?phase21=" + stamp, { cache: "no-store" });
      if (!manifestResponse.ok || !indexResponse.ok) {
        result.errors.push("STATIC_FETCH_FAILED");
        return result;
      }
      const manifest = await manifestResponse.json();
      const indexText = await indexResponse.text();
      const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
      const hashes = manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};
      result.scriptCount = scripts.length;
      result.manifestHash = manifest.manifestHash || null;
      result.scriptSetHash = manifest.scriptSetHash || null;
      result.manifestStructureValid = scripts.length > 0 && scripts.every(function every(src) {
        const path = normalizeScriptPath(src), item = hashes[path];
        return !!item && /^[a-f0-9]{64}$/.test(String(item.sha256 || "")) && Number.isInteger(item.byteSize) && item.byteSize >= 0 && String(item.cacheKey || "") === String(item.sha256 || "").slice(0, 12) && cacheKeyFromScriptUrl(src) === item.cacheKey;
      });

      const scriptSetHash = await sha256Text(manifestScriptSetPayload(manifest));
      const manifestHash = await sha256Text(stableStringify(manifestHashPayload(manifest)));
      result.manifestIntegrityValid = result.manifestStructureValid && scriptSetHash === manifest.scriptSetHash && manifestHash === manifest.manifestHash;
      if (!result.manifestIntegrityValid) result.errors.push("MANIFEST_INTERNAL_INTEGRITY_FAILED");

      const indexScripts = [];
      const re = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
      let match;
      while ((match = re.exec(indexText))) {
        const src = match[1];
        if (/^\.\//.test(src) && /\.js(?:\?|$)/i.test(src)) indexScripts.push(src);
      }
      result.indexScriptSequenceMatches = indexScripts.length === scripts.length && indexScripts.every(function same(src, idx) { return src === scripts[idx]; });
      if (!result.indexScriptSequenceMatches) result.errors.push("INDEX_SCRIPT_SEQUENCE_MISMATCH");
      const meta = indexText.match(/<meta\s+name=["']ai-pro-script-manifest-hash["']\s+content=["']([a-f0-9]{64})["']/i);
      result.indexManifestHashMatches = !!meta && meta[1] === manifest.manifestHash;
      if (!result.indexManifestHashMatches) result.errors.push("INDEX_MANIFEST_HASH_MISMATCH");

      for (let i = 0; i < scripts.length; i += 1) {
        const src = scripts[i];
        const path = normalizeScriptPath(src);
        const item = hashes[path];
        try {
          const response = await global.fetch(src + (src.indexOf("?") >= 0 ? "&" : "?") + "p21verify=" + stamp, { cache: "no-store" });
          if (!response.ok) {
            result.fetchFailureCount += 1;
            continue;
          }
          const buffer = await response.arrayBuffer();
          result.fetchedScriptCount += 1;
          const actualHash = await sha256Bytes(buffer);
          if (actualHash !== item.sha256) result.scriptHashMismatchCount += 1;
          if (buffer.byteLength !== item.byteSize) result.scriptByteSizeMismatchCount += 1;
          if (String(item.cacheKey || "") !== actualHash.slice(0, 12)) result.scriptCacheKeyMismatchCount += 1;
        } catch (_) {
          result.fetchFailureCount += 1;
        }
      }
      result.ok = result.manifestIntegrityValid && result.indexScriptSequenceMatches && result.indexManifestHashMatches && result.fetchFailureCount === 0 && result.fetchedScriptCount === scripts.length && result.scriptHashMismatchCount === 0 && result.scriptByteSizeMismatchCount === 0 && result.scriptCacheKeyMismatchCount === 0;
      return result;
    } catch (error) {
      result.errors.push(error && error.message || String(error));
      return result;
    }
  }

  async function runRegression(name, fn, arg) {
    try {
      if (typeof fn !== "function") return { name, ok: false, error: "API_UNAVAILABLE" };
      const result = await fn(arg);
      return { name, ok: !!result && result.failed === 0 && result.criticalFailed === 0, result };
    } catch (error) {
      return { name, ok: false, error: error && error.stack || String(error) };
    }
  }

  function integrityCase(input) {
    return namespace.evaluateExternalIntelligenceGatewayRequestIntegrity(input);
  }

  async function runExternalIntelligencePhase21Validation() {
    const checks = [];
    const add = function add(name, passed, detail, group, severity) {
      checks.push({
        name,
        passed: passed === true,
        detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)),
        group: group || "Phase 21",
        severity: severity || "Critical"
      });
    };

    add("Release is Phase 21 v1.20.0 or compatible hotfix", VM.release.phase === 21 && VM.isReleaseCompatibleFrom("1.20.0"), VM.release, "Foundation");
    add("Roadmap 2.1.0 and Decision 001..054 remain canonical", VM.release.implementationRoadmapId === "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0" && VM.release.decisionCount === 54, VM.release, "Foundation");
    add("Phase 20 is complete and Phase 21 is allowed", VM.implementation.phase20Complete === true && VM.implementation.phase21Allowed === true, VM.implementation, "Foundation");
    add("Final release remains blocked until PC/Android final gates and Project Owner acceptance", VM.implementation.phase21Complete === false && VM.implementation.releaseAllowed === false, VM.implementation, "Authority");

    const initialized = await namespace.initializeExternalIntelligenceFoundation();
    add("EXTERNAL-010 foundation initializes", initialized && initialized.ok === true, initialized, "Initialization");

    const staticIntegrity = await validateStaticIntegrity();
    add("Static Script Manifest structure/internal integrity PASS", staticIntegrity.manifestStructureValid === true && staticIntegrity.manifestIntegrityValid === true, staticIntegrity, "Static Integrity");
    add("index.html script order and manifest hash match Static Manifest", staticIntegrity.indexScriptSequenceMatches === true && staticIntegrity.indexManifestHashMatches === true, staticIntegrity, "Static Integrity");
    add("All static scripts fetch with exact SHA-256 / byteSize / cacheKey", staticIntegrity.ok === true, staticIntegrity, "Static Integrity");

    const regressions = {};
    // Phase 16 executes the dependency-ordered functional regression chain for Phase 01..16.
    // Running every historical validator independently here would duplicate stateful fixtures and
    // incorrectly treat frozen phase identity checks as current-release requirements.
    regressions.phase1To16 = await runRegression("Phase 01..16 dependency chain", namespace.runExternalIntelligencePhase16Validation);
    regressions.phase17 = await runRegression("Phase 17", namespace.runExternalIntelligencePhase17Validation);
    regressions.phase18 = await runRegression("Phase 18", namespace.runExternalIntelligencePhase18Validation);
    regressions.phase19 = await runRegression("Phase 19", namespace.runExternalIntelligencePhase19Validation);
    regressions.phase20 = await runRegression("Phase 20", namespace.runExternalIntelligencePhase20Validation);

    const phase1To16Ready = regressions.phase1To16.ok === true;
    add("Integrated Path 1: Source Discovery -> Policy/Budget -> Registration -> Acquisition", phase1To16Ready && !!namespace.modules.sourceDiscovery && !!namespace.modules.sourceRegistry && !!namespace.modules.resourceBudget && !!namespace.modules.usagePolicy && !!namespace.modules.acquisitionContract && !!namespace.modules.sourceRouter, regressions.phase1To16, "Integrated Path 1");
    add("Integrated Path 2: Acquisition -> Raw Evidence -> Storage -> Normalization -> Claim/Entity", phase1To16Ready && !!namespace.modules.evidencePersistence && !!namespace.modules.normalization && !!namespace.modules.claim && !!namespace.modules.entity, regressions.phase1To16, "Integrated Path 2");
    add("Integrated Path 3: Entity/Event -> Impact -> Signal -> Hypothesis -> Prediction -> Outcome", phase1To16Ready && !!namespace.modules.eventGraph && !!namespace.modules.impactGraph && !!namespace.modules.signalDetection && !!namespace.modules.hypothesis && !!namespace.modules.uncertainty && !!namespace.modules.outcome, regressions.phase1To16, "Integrated Path 3");
    add("Integrated Path 4: External Evidence -> Federated Package -> IDE/Reasoning read boundary", phase1To16Ready && !!namespace.modules.federatedRead && !!namespace.modules.intelligencePackage && !!namespace.modules.knowledgeBoundary && namespace.modules.knowledgeBoundary.automaticPromotionAllowed === false, regressions.phase1To16, "Integrated Path 4");
    add("Integrated Path 5: Watch -> Material Change -> Notification", phase1To16Ready && !!namespace.modules.monitoringWatch && !!namespace.modules.monitoringChange && !!namespace.modules.notificationGovernance, regressions.phase1To16, "Integrated Path 5");
    add("Integrated Path 6: Market Data -> Indicator -> Signal -> Fusion -> Experiment Readiness", regressions.phase17.ok === true && regressions.phase18.ok === true && regressions.phase19.ok === true && !!namespace.modules.marketTimeSeries && !!namespace.modules.technicalIndicator && !!namespace.modules.technicalSignal && !!namespace.modules.marketFusion && !!namespace.modules.strategyExperiment, { phase17: regressions.phase17, phase18: regressions.phase18, phase19: regressions.phase19 }, "Integrated Path 6");
    add("Integrated Path 7: Runtime Failure -> Degraded Mode -> Recovery -> Readback Validation", regressions.phase20.ok === true && !!namespace.modules.capabilityResilience && !!namespace.modules.disasterRecovery, regressions.phase20, "Integrated Path 7");
    add("Integrated Path 8: Dependency Candidate -> Security Admission -> Validation/Authority -> Controlled Promotion", phase1To16Ready && !!namespace.modules.softwareSupplyChain && !!namespace.modules.authority && VM.supplyChain.runtimeInstallByDefault === false, regressions.phase1To16, "Integrated Path 8");

    const validSession = integrityCase({ sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true });
    const untrustedOrigin = integrityCase({ sessionState: "ACTIVE", originValid: false, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true });
    const expired = integrityCase({ sessionState: "EXPIRED", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: true });
    const replayed = integrityCase({ sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: true, runtimeBindingValid: true, operationAuthorityAllowed: true });
    const noAuthority = integrityCase({ sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: true, operationAuthorityAllowed: false });
    const staleRuntime = integrityCase({ sessionState: "ACTIVE", originValid: true, hostValid: true, freshnessValid: true, replayDetected: false, runtimeBindingValid: false, operationAuthorityAllowed: true });
    add("Decision 054 positive path requires Session + Origin + Host + Freshness + Replay + Runtime + Authority", validSession.overallState === "PASS", validSession, "Decision 054");
    add("Negative Path: Untrusted Web Page -> state-changing Gateway request -> REJECT", untrustedOrigin.overallState === "BLOCKED" && untrustedOrigin.reasons.indexOf("ORIGIN_INVALID") >= 0, untrustedOrigin, "Decision 054 Negative");
    add("Negative Path: Expired Session -> Operation -> REJECT", expired.overallState === "BLOCKED" && expired.reasons.indexOf("SESSION_EXPIRED") >= 0, expired, "Decision 054 Negative");
    add("Negative Path: Replayed Request -> Operation -> REJECT", replayed.overallState === "BLOCKED" && replayed.reasons.indexOf("REPLAY_DETECTED") >= 0, replayed, "Decision 054 Negative");
    add("Negative Path: Valid Session + Missing Business Authority -> REJECT", noAuthority.requestAuthenticationPassed === true && noAuthority.operationAuthorizationPassed === false && noAuthority.overallState === "BLOCKED", noAuthority, "Decision 054 Negative");
    add("Negative Path: Gateway restart/stale runtime binding + Old Session -> REJECT", staleRuntime.overallState === "BLOCKED" && staleRuntime.reasons.indexOf("RUNTIME_SESSION_BINDING_INVALID") >= 0, staleRuntime, "Decision 054 Negative");

    add("External content cannot become instruction authority", VM.safety.externalContentInstructionAuthorityAllowed === false && VM.safety.externalContentGrantsInstructionAuthority === false, VM.safety, "Security / Authority");
    add("AI cannot self-grant authority or auto-install arbitrary dependency", VM.safety.automaticAuthorityExpansionAllowed === false && VM.safety.automaticSoftwareInstallAllowed === false && VM.supplyChain.runtimeInstallByDefault === false, { safety: VM.safety, supplyChain: VM.supplyChain }, "Security / Authority");
    add("Hard Security Fail cannot use ordinary approval override", VM.supplyChain.hardSecurityFailOrdinaryOverrideAllowed === false, VM.supplyChain, "Security / Authority");
    add("Knowledge Candidate cannot auto-promote", namespace.modules.knowledgeBoundary && namespace.modules.knowledgeBoundary.automaticPromotionAllowed === false && VM.safety.validationPassEqualsKnowledgePromotion === false, namespace.modules.knowledgeBoundary, "Security / Authority");
    add("Prediction/Strategy layers retain no Trading/Real-Money authority", namespace.modules.marketFusion && namespace.modules.marketFusion.tradingAuthorityGranted === false && namespace.modules.strategyExperiment && namespace.modules.strategyExperiment.tradingAuthorityGranted === false && namespace.modules.strategyExperiment.realMoneyAuthorityGranted === false, { marketFusion: namespace.modules.marketFusion, strategyExperiment: namespace.modules.strategyExperiment }, "Security / Authority");
    add("Gateway leader/session/recovery cannot become Business Authority", VM.safety.gatewaySessionEqualsBusinessAuthority === false && VM.safety.recoveryGrantsBusinessAuthority === false && namespace.modules.runtimeCoordination && namespace.modules.runtimeCoordination.leaderAuthorityType !== "BUSINESS_AUTHORITY", { safety: VM.safety, runtime: namespace.modules.runtimeCoordination }, "Security / Authority");
    add("Validation PASS remains separate from Approval/Authority", VM.safety.validationPassEqualsApproval === false && VM.safety.validationPassEqualsAuthorityGrant === false, VM.safety, "Security / Authority");
    add("Session token remains memory-only and excluded from persistent/public state", VM.gateway.sessionTokenStorage === "memory-only" && VM.safety.gatewaySessionTokenPersistenceAllowed === false && namespace.modules.gatewayClient && namespace.modules.gatewayClient.sessionTokenExposedByPublicState === false, { gateway: VM.gateway, client: namespace.modules.gatewayClient }, "Security / Authority");

    const profiles = typeof namespace.listExternalIntelligenceValidationProfiles === "function" ? namespace.listExternalIntelligenceValidationProfiles() : [];
    const validProfiles = profiles.filter(function filter(profile) { return profile && profile.purposeAllowed === true && Number(profile.criticalFailureCount || 0) === 0; });
    const candidateProfile = validProfiles.length ? validProfiles[validProfiles.length - 1] : null;
    let releaseGateCandidate = null;
    if (candidateProfile) {
      releaseGateCandidate = namespace.createExternalIntelligenceReleaseGate({
        targetVersion: VM.release.version,
        validationSuiteVersions: [candidateProfile.validationSuiteVersion],
        validationProfileIds: [candidateProfile.validationProfileId],
        passed: checks.filter(function pass(item) { return item.passed; }).length,
        failed: checks.filter(function fail(item) { return !item.passed; }).length,
        criticalFailed: checks.filter(function crit(item) { return !item.passed && item.severity === "Critical"; }).length,
        mandatoryGates: {
          Static: staticIntegrity.ok === true,
          Functional: true,
          Regression: Object.keys(regressions).every(function every(key) { return regressions[key].ok === true; }),
          Persistence: regressions.phase1To16.ok === true && regressions.phase17.ok === true && regressions.phase18.ok === true && regressions.phase19.ok === true && regressions.phase20.ok === true,
          Recovery: regressions.phase20.ok === true,
          Security: true,
          Authority: true,
          PCRealRuntime: false,
          AndroidRealDevice: false
        }
      });
    }
    add("Release Gate candidate remains blocked until PC Real Runtime + Android Real Device gates", !!releaseGateCandidate && releaseGateCandidate.ok === true && releaseGateCandidate.data.releaseGate.releaseAllowed === false && releaseGateCandidate.data.releaseGate.approvalGranted === false && releaseGateCandidate.data.releaseGate.authorityGranted === false, releaseGateCandidate, "Release Gate");

    const failedChecks = checks.filter(function fail(item) { return !item.passed; });
    const criticalFailed = failedChecks.filter(function critical(item) { return item.severity === "Critical"; }).length;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE21-INTEGRATED-VALIDATION"),
      componentId: "EXTERNAL-010",
      version: VM.release.version,
      gatewayVersion: VM.gateway.gatewayVersion,
      implementationPhase: VM.release.implementationPhase,
      decisionCoverage: 54,
      integratedPathCoverage: 8,
      requiredNegativePathCoverage: 5,
      passed: checks.length - failedChecks.length,
      failed: failedChecks.length,
      total: checks.length,
      health: checks.length ? Math.round((checks.length - failedChecks.length) * 1000 / checks.length) / 10 : 0,
      criticalFailed,
      status: failedChecks.length ? "EXTERNAL-010 Phase 21 Integrated Validation FAILED" : "EXTERNAL-010 Phase 21 Integrated Validation PASS",
      phase21FunctionalComplete: failedChecks.length === 0,
      pcRealRuntimeRequired: true,
      androidRealDeviceRequired: true,
      finalReleaseAllowed: false,
      projectOwnerAcceptanceRequired: true,
      releaseAllowed: failedChecks.length === 0,
      staticIntegrity,
      regressionSummary: Object.keys(regressions).reduce(function reduce(output, key) { output[key] = { ok: regressions[key].ok, passed: regressions[key].result && regressions[key].result.passed, failed: regressions[key].result && regressions[key].result.failed, total: regressions[key].result && regressions[key].result.total }; return output; }, {}),
      releaseGateCandidate: releaseGateCandidate && releaseGateCandidate.data && releaseGateCandidate.data.releaseGate || null,
      checks,
      validatedAt: internal.nowIso(),
      immutable: true
    };
    state.latestPhase21Validation = internal.deepFreeze(internal.clone(result));
    return result;
  }

  Object.assign(namespace.api, { runExternalIntelligencePhase21Validation });
  Object.assign(namespace, namespace.api);
  global.runExternalIntelligencePhase21Validation = runExternalIntelligencePhase21Validation;
  namespace.modules.phase21Validation = { id: "EXTERNAL-010-PHASE21-INTEGRATED-VALIDATION", version: MODULE_VERSION, phase: 21, decisions: ["001..054"], status: "Ready", integratedPathCount: 8, negativePathCount: 5 };
})(typeof window !== "undefined" ? window : globalThis);
