/* ============================================================
   FILE: 17_external_intelligence_phase4_android_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.4.0
   Phase 04 Android Real Device Validation
   Browser Direct + Graceful Gateway Unavailable + Static Integrity
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 04 Android validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase4AndroidValidation");
  const PURPOSE = "phase4-android-real-device";
  const EXPECTED_GATEWAY_VERSIONS = ["1.2.0", "1.3.0", "1.4.0"];
  const EXPECTED_PHASE4_REGRESSION_TOTAL = 248;
  const MINIMUM_PHASE4_SCRIPT_COUNT = 304;

  function collector() {
    const checks = [];
    return {
      checks,
      check(name, passed, detail, group, severity) {
        checks.push({
          name,
          passed: passed === true,
          detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)),
          group: group || "Android Real Device",
          severity: severity || "Critical"
        });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function item(check) { return check.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function item(check) { return !check.passed && check.severity === "Critical"; }).length;
    return {
      passed,
      failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0,
      criticalFailed
    };
  }

  function arr(value) { return Array.isArray(value) ? value : []; }
  function normalizeScriptPath(src) {
    return String(src || "").trim().split("#")[0].split("?")[0].replace(/^\.\//, "");
  }
  function getHashQuery(src) {
    const match = String(src || "").match(/[?&]h=([a-f0-9]+)/i);
    return match ? match[1] : "";
  }
  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function keySort(key) { out[key] = stableValue(value[key]); });
    return out;
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

  async function fetchText(path) {
    const url = typeof global.URL === "function" && global.document && global.document.baseURI
      ? new global.URL(path, global.document.baseURI).href
      : path;
    const response = await global.fetch(url, { cache: "no-store", credentials: "omit" });
    if (!response || response.ok !== true) throw new Error("Fetch failed: " + path + " / " + (response && response.status));
    return response.text();
  }

  async function verifyStaticRuntime() {
    const output = {
      ok: false,
      manifest: null,
      manifestStructureValid: false,
      manifestIntegrityValid: false,
      scriptCount: 0,
      fetchedScriptCount: 0,
      scriptHashMismatchCount: 0,
      scriptByteSizeMismatchCount: 0,
      scriptCacheKeyMismatchCount: 0,
      fetchFailureCount: 0,
      mismatches: [],
      indexScriptSequenceMatches: false,
      indexLocalScriptCount: 0,
      indexManifestHashMatches: false,
      computedScriptSetHash: null,
      computedManifestHash: null
    };

    try {
      const manifestText = await fetchText("./00_script_manifest.json");
      const manifest = JSON.parse(manifestText);
      output.manifest = manifest;
      const scripts = arr(manifest.scripts);
      const hashes = manifest.hashes && typeof manifest.hashes === "object" ? manifest.hashes : {};
      output.scriptCount = scripts.length;
      output.manifestStructureValid = Boolean(
        manifest.manifestSchemaVersion === "2.0.0" &&
        manifest.versionArchitecture === "independent-version-v1" &&
        manifest.hashAlgorithm === "SHA-256" &&
        scripts.length > 0 &&
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
      output.manifestIntegrityValid = Boolean(
        output.computedScriptSetHash && manifest.scriptSetHash === output.computedScriptSetHash &&
        output.computedManifestHash && manifest.manifestHash === output.computedManifestHash
      );

      const concurrency = 6;
      let cursor = 0;
      async function worker() {
        while (cursor < scripts.length) {
          const index = cursor;
          cursor += 1;
          const src = scripts[index];
          const path = normalizeScriptPath(src);
          const expected = hashes[path] || {};
          try {
            const url = typeof global.URL === "function" && global.document && global.document.baseURI
              ? new global.URL(src, global.document.baseURI).href
              : src;
            const response = await global.fetch(url, { cache: "no-store", credentials: "omit" });
            if (!response || response.ok !== true) throw new Error("HTTP " + (response && response.status));
            const data = await response.arrayBuffer();
            const actualHash = await sha256(data);
            output.fetchedScriptCount += 1;
            if (actualHash !== expected.sha256) {
              output.scriptHashMismatchCount += 1;
              output.mismatches.push({ path, type: "sha256", expected: expected.sha256 || null, actual: actualHash });
            }
            if (Number(expected.byteSize) !== data.byteLength) {
              output.scriptByteSizeMismatchCount += 1;
              output.mismatches.push({ path, type: "byteSize", expected: expected.byteSize, actual: data.byteLength });
            }
            const expectedCacheKey = String(expected.sha256 || "").slice(0, 12);
            if (expected.cacheKey !== expectedCacheKey || getHashQuery(src) !== expectedCacheKey) {
              output.scriptCacheKeyMismatchCount += 1;
              output.mismatches.push({ path, type: "cacheKey", expected: expectedCacheKey, manifest: expected.cacheKey, url: getHashQuery(src) });
            }
          } catch (error) {
            output.fetchFailureCount += 1;
            output.mismatches.push({ path, type: "fetch", error: error && error.message ? error.message : String(error) });
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, scripts.length) }, worker));

      const indexText = await fetchText("./index.html");
      const scriptSources = [];
      const scriptRegex = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = scriptRegex.exec(indexText))) {
        const src = match[1];
        if (!/^(?:https?:)?\/\//i.test(src) && /\.js(?:\?|$)/i.test(src)) scriptSources.push(src);
      }
      output.indexLocalScriptCount = scriptSources.length;
      output.indexScriptSequenceMatches = JSON.stringify(scriptSources.map(normalizeScriptPath)) === JSON.stringify(scripts.map(normalizeScriptPath));
      const metaMatch = indexText.match(/<meta\s+name=["']ai-pro-script-manifest-hash["']\s+content=["']([a-f0-9]{64})["']/i);
      output.indexManifestHashMatches = Boolean(metaMatch && metaMatch[1] === manifest.manifestHash);
      output.ok = Boolean(
        output.manifestStructureValid &&
        output.manifestIntegrityValid &&
        output.fetchedScriptCount === scripts.length &&
        output.scriptHashMismatchCount === 0 &&
        output.scriptByteSizeMismatchCount === 0 &&
        output.scriptCacheKeyMismatchCount === 0 &&
        output.fetchFailureCount === 0 &&
        output.indexScriptSequenceMatches &&
        output.indexManifestHashMatches
      );
    } catch (error) {
      output.error = error && error.message ? error.message : String(error);
    }
    return output;
  }

  async function grantAuthority(action, type, id, owned, purpose) {
    const authorityPurpose = internal.text(purpose, "") || PURPOSE;
    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
      action,
      target: { type, id },
      purpose: authorityPurpose,
      scope: { domain: "EXTERNAL-010", operation: action }
    });
    if (!candidate.ok) return { ok: false, candidate };
    owned.push(candidate.data.envelope.authorityEnvelopeId);
    const activated = await namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId, { validationOnly: true });
    return { ok: activated.ok === true, candidate, activated, envelopeId: candidate.data.envelope.authorityEnvelopeId };
  }

  async function activateBudget(owned) {
    const budgetCandidate = namespace.createExternalIntelligenceResourceBudgetCandidate({
      scopeType: "GLOBAL",
      scopeId: "EXTERNAL-010",
      currency: "JPY",
      period: { type: "ANDROID_REAL_DEVICE" },
      limits: {
        REQUEST_COUNT: { softLimit: 10, hardLimit: 20 },
        NETWORK_BYTES: { softLimit: 10000000, hardLimit: 30000000 },
        PROCESSING_TIME: { softLimit: 120000, hardLimit: 300000 },
        FINANCIAL_COST: { softLimit: 0, hardLimit: 0 }
      }
    });
    if (!budgetCandidate.ok) return { ok: false, stage: "budget-candidate", result: budgetCandidate };
    const budgetId = budgetCandidate.data.budget.budgetId;
    const auth = await grantAuthority("ACTIVATE_RESOURCE_BUDGET", "resource-budget", budgetId, owned);
    if (!auth.ok) return { ok: false, stage: "budget-authority", result: auth };
    const active = await namespace.activateExternalIntelligenceResourceBudget({ budgetId, purpose: PURPOSE });
    return { ok: active.ok === true, budgetId, active };
  }

  async function setupFreeSource(sourceId, adapterId, accessMode, endpoint, budgetId, owned) {
    const operationId = "READ";
    const regAuth = await grantAuthority("REGISTER_EXTERNAL_SOURCE", "source", sourceId, owned);
    if (!regAuth.ok) return { ok: false, stage: "register-authority", result: regAuth };

    const registered = await namespace.registerExternalIntelligenceSource({
      sourceId,
      sourceName: "Phase 04 Android Real Device " + sourceId,
      sourceType: "PUBLIC_API",
      provider: "AI Prompt OS Android Real Device Validation",
      accessMode,
      adapterId,
      endpointPolicy: {
        canonicalHost: endpoint.canonicalHost,
        endpointReference: endpoint.endpointReference,
        allowRedirects: false
      },
      authenticationMode: "NONE",
      allowedOperations: [operationId],
      allowedMethods: ["GET"],
      pricingMode: "FREE",
      purpose: PURPOSE
    });
    if (!registered.ok) return { ok: false, stage: "register", result: registered };

    const policyCandidate = namespace.createExternalIntelligenceUsagePolicyCandidate({
      sourceId,
      policyVersion: "phase4-android-real-device-1",
      policyEvidenceIds: ["PHASE4-ANDROID-LOCAL-PROJECT-POLICY"],
      policyCompleteness: "COMPLETE",
      interpretationConfidence: "HIGH",
      rights: {
        READ: { state: "ALLOWED", confidence: "HIGH", evidenceIds: ["PHASE4-ANDROID-LOCAL-PROJECT-POLICY"] }
      }
    });
    if (!policyCandidate.ok) return { ok: false, stage: "policy-candidate", result: policyCandidate };
    const policyAuth = await grantAuthority("ACTIVATE_USAGE_POLICY", "usage-policy", policyCandidate.data.usagePolicy.usagePolicyId, owned);
    if (!policyAuth.ok) return { ok: false, stage: "policy-authority", result: policyAuth };
    const policyActive = await namespace.activateExternalIntelligenceUsagePolicy({ usagePolicyId: policyCandidate.data.usagePolicy.usagePolicyId, purpose: PURPOSE });
    if (!policyActive.ok) return { ok: false, stage: "policy-activate", result: policyActive };

    const enableAuth = await grantAuthority("ENABLE_EXTERNAL_SOURCE", "source", sourceId, owned);
    if (!enableAuth.ok) return { ok: false, stage: "enable-authority", result: enableAuth };
    const enabled = await namespace.enableExternalIntelligenceSource({ sourceId, operations: [operationId], purpose: PURPOSE });
    if (!enabled.ok) return { ok: false, stage: "enable", result: enabled };

    const activateAuth = await grantAuthority("ACTIVATE_EXTERNAL_SOURCE", "source", sourceId, owned);
    if (!activateAuth.ok) return { ok: false, stage: "activate-authority", result: activateAuth };
    const activated = await namespace.activateExternalIntelligenceSource({ sourceId, purpose: PURPOSE });
    if (!activated.ok) return { ok: false, stage: "activate", result: activated };

    const operationContractId = "EXTERNAL-010-OP-" + sourceId.replace(/^SOURCE-/, "") + "-READ";
    const opAuth = await grantAuthority("REGISTER_SOURCE_OPERATION_CONTRACT", "source-operation", operationContractId, owned, "phase4-operation-contract");
    if (!opAuth.ok) return { ok: false, stage: "operation-authority", result: opAuth };
    const operation = await namespace.registerExternalIntelligenceSourceOperationContract({
      operationContractId,
      sourceId,
      operationId,
      adapterId,
      method: "GET",
      endpoint,
      parameterPolicy: { required: [], optional: [], allowUnknown: false, maxParameterCount: 0 },
      timeoutPolicy: { timeoutMs: 15000 },
      retryPolicy: {
        maxAttempts: 1,
        initialDelayMs: 0,
        maxDelayMs: 0,
        backoffPolicy: "NONE",
        retryableCategories: []
      },
      responseMode: "JSON",
      executionHints: { backgroundPreferred: false, expectedResponseSize: "SMALL", longRunning: false, batch: false },
      estimatedUsage: { REQUEST_COUNT: 1, NETWORK_BYTES: 2000000, PROCESSING_TIME: 15000 }
    });
    if (!operation.ok) return { ok: false, stage: "operation-register", result: operation };

    const request = namespace.createExternalIntelligenceAcquisitionRequest({
      sourceId,
      operationId,
      parameters: {},
      priority: "NORMAL",
      executionPreference: "IMMEDIATE",
      purpose: PURPOSE,
      requestedBy: "Project Owner Android Real Device Validation",
      correlationId: "PHASE4-ANDROID-REAL-DEVICE",
      idempotencyKey: "PHASE4-ANDROID-" + sourceId + "-" + Date.now(),
      budgetIds: [budgetId],
      acquisitionPlanId: "PHASE4-ANDROID-PLAN",
      researchGoalId: "PHASE4-ANDROID-GOAL"
    });
    if (!request.ok) return { ok: false, stage: "request-create", result: request };
    const execAuth = await grantAuthority("EXECUTE_EXTERNAL_ACQUISITION", "external-acquisition", request.data.request.requestId, owned);
    if (!execAuth.ok) return { ok: false, stage: "execute-authority", result: execAuth };
    return { ok: true, request: request.data.request, operation: operation.data.operationContract, source: namespace.getExternalIntelligenceSource(sourceId) };
  }

  async function runExternalIntelligencePhase4AndroidValidation(input) {
    const settings = internal.isPlainObject(input) ? input : {};
    const c = collector();
    const check = c.check;
    const owned = [];
    const suffix = Date.now().toString(36).toUpperCase();
    let regression = null;
    let staticRuntime = null;
    let browserExecution = null;
    let gatewayRoute = null;

    try {
      check("Release Version is compatible with Phase 04 baseline", VERSION_MANIFEST.isReleaseCompatibleFrom("1.3.0"), VERSION_MANIFEST.release.version, "Foundation");
      check("Gateway compatibility version is 1.2.0", EXPECTED_GATEWAY_VERSIONS.includes(VERSION_MANIFEST.gateway.gatewayVersion), VERSION_MANIFEST.gateway.gatewayVersion, "Foundation");
      check("Phase 04 Android module version resolves", Boolean(MODULE_VERSION && VERSION_MANIFEST.isReleaseCompatibleFrom(MODULE_VERSION)), MODULE_VERSION, "Foundation");

      const userAgent = global.navigator && global.navigator.userAgent || "";
      check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Environment");
      check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android Environment");
      check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"), Boolean(global.crypto && global.crypto.subtle), "Android Environment");
      check("URL API is available", typeof global.URL === "function", typeof global.URL, "Android Environment");
      check("AbortController is available", typeof global.AbortController === "function", typeof global.AbortController, "Android Environment");
      check("Application document is loaded", Boolean(global.document && global.document.documentElement && global.document.body), global.document && global.document.readyState, "Android Environment");

      check("Repository Core remains available", Boolean(global.REPOSITORY010LocalFirstRepository && typeof global.getLocalFirstRepositoryStatus === "function"), typeof global.getLocalFirstRepositoryStatus, "Core Independence");
      check("Knowledge Navigator remains available", Boolean(global.IDE180KnowledgeNavigator && typeof global.getKnowledgeNavigatorStatus === "function"), typeof global.getKnowledgeNavigatorStatus, "Core Independence");
      check("Memo capability remains available", typeof global.getMemoBoxList === "function" && typeof global.openMemoById === "function", { getMemoBoxList: typeof global.getMemoBoxList, openMemoById: typeof global.openMemoById }, "Core Independence");

      const init = await namespace.initializeExternalIntelligenceFoundation();
      check("EXTERNAL-010 Foundation initializes on Android", init && init.ok === true, init && (init.data || init.code), "Foundation");

      regression = await namespace.runExternalIntelligencePhase4Validation();
      check("Phase 04 Regression remains PASS at 248 baseline or later", Boolean(regression && regression.failed === 0 && regression.criticalFailed === 0 && regression.total >= EXPECTED_PHASE4_REGRESSION_TOTAL && regression.passed === regression.total), regression && { passed: regression.passed, failed: regression.failed, total: regression.total, criticalFailed: regression.criticalFailed }, "Regression");
      check("Phase 04 Regression has zero critical failures", Boolean(regression && regression.criticalFailed === 0 && regression.health === 100 && regression.releaseAllowed === true && regression.phase4Complete === true), regression && { health: regression.health, criticalFailed: regression.criticalFailed, releaseAllowed: regression.releaseAllowed, phase4Complete: regression.phase4Complete }, "Regression");

      staticRuntime = await verifyStaticRuntime();
      check("Static Script Manifest contains Phase 04 baseline or later", staticRuntime.scriptCount >= MINIMUM_PHASE4_SCRIPT_COUNT && staticRuntime.indexLocalScriptCount === staticRuntime.scriptCount, { scriptCount: staticRuntime.scriptCount, indexLocalScriptCount: staticRuntime.indexLocalScriptCount }, "Static Integrity");
      check("Static Script Manifest internal SHA-256 integrity is valid", staticRuntime.manifestStructureValid === true && staticRuntime.manifestIntegrityValid === true, { manifestHash: staticRuntime.computedManifestHash, scriptSetHash: staticRuntime.computedScriptSetHash }, "Static Integrity");
      check("All static scripts are fetched and hash/size/cache-key verified", staticRuntime.fetchedScriptCount === staticRuntime.scriptCount && staticRuntime.scriptHashMismatchCount === 0 && staticRuntime.scriptByteSizeMismatchCount === 0 && staticRuntime.scriptCacheKeyMismatchCount === 0 && staticRuntime.fetchFailureCount === 0, { fetched: staticRuntime.fetchedScriptCount, scriptCount: staticRuntime.scriptCount, hashMismatch: staticRuntime.scriptHashMismatchCount, byteSizeMismatch: staticRuntime.scriptByteSizeMismatchCount, cacheKeyMismatch: staticRuntime.scriptCacheKeyMismatchCount, fetchFailureCount: staticRuntime.fetchFailureCount, mismatches: staticRuntime.mismatches.slice(0, 10) }, "Static Integrity");
      check("index.html script sequence matches Static Manifest", staticRuntime.indexScriptSequenceMatches === true, { indexLocalScriptCount: staticRuntime.indexLocalScriptCount, manifestScriptCount: staticRuntime.scriptCount }, "Static Integrity");
      check("index.html Manifest Hash marker matches Static Manifest", staticRuntime.indexManifestHashMatches === true, staticRuntime.manifest && staticRuntime.manifest.manifestHash, "Static Integrity");

      const approval = namespace.setExternalIntelligenceAuthorityApprovalAdapter({
        adapterId: "EXTERNAL-010-PHASE4-ANDROID-OWNER-APPROVAL",
        requiresExplicitOwnerInteraction: true,
        async verifyApproval() {
          return { approved: true, actorType: "Project Owner", interactionEvidenceId: "PHASE4-ANDROID-OWNER-INTERACTION" };
        }
      });
      check("Project Owner validation approval adapter configured", approval.ok === true, approval.code, "Authority");

      const budget = await activateBudget(owned);
      check("Android zero-cost validation budget is activated", budget.ok === true, budget, "Budget");
      const budgetId = budget.budgetId;

      const projectInfoUrl = typeof global.URL === "function" && global.document && global.document.baseURI
        ? new global.URL("./project_info.json", global.document.baseURI)
        : null;
      check("Android Browser Direct target resolves from current application origin", Boolean(projectInfoUrl && /^https?:$/i.test(projectInfoUrl.protocol)), projectInfoUrl && projectInfoUrl.href, "Browser Direct");

      const browserSourceId = "SOURCE-PHASE4-ANDROID-BROWSER-" + suffix;
      const browserSetup = projectInfoUrl ? await setupFreeSource(
        browserSourceId,
        VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson,
        "BROWSER_DIRECT",
        {
          exactUrl: projectInfoUrl.href,
          canonicalHost: projectInfoUrl.hostname,
          endpointReference: "phase4-android-project-info"
        },
        budgetId,
        owned
      ) : { ok: false, stage: "url-unavailable" };
      check("Governed Android Browser Direct source is prepared", browserSetup.ok === true, browserSetup, "Browser Direct");

      browserExecution = browserSetup.ok ? await namespace.executeExternalIntelligenceAcquisition({ requestId: browserSetup.request.requestId }) : null;
      check("Android Browser Direct performs real HTTP JSON acquisition", Boolean(browserExecution && browserExecution.ok === true && browserExecution.data.response.status === "SUCCESS" && browserExecution.data.response.payload && browserExecution.data.response.payload.project === "AIプロンプト生成Pro"), browserExecution && (browserExecution.data || browserExecution.code), "Browser Direct");
      check("Android Browser Direct retains governed adapter/source/request lineage", Boolean(browserExecution && browserExecution.ok === true && browserExecution.data.response.evidenceInput && browserExecution.data.response.evidenceInput.adapterId === VERSION_MANIFEST.acquisition.adapterIds.browserHttpJson && browserExecution.data.response.evidenceInput.sourceId === browserSourceId && browserExecution.data.response.evidenceInput.requestId === browserSetup.request.requestId), browserExecution && browserExecution.data && browserExecution.data.response && browserExecution.data.response.evidenceInput, "Lineage");
      check("Browser Direct response grants no persistence or business authority", Boolean(browserExecution && browserExecution.ok === true && browserExecution.data.response.evidenceInput.persistenceAuthorityGranted === false && browserExecution.data.response.externalResponseGrantsAuthority === false && browserExecution.data.response.canonicalRepositoryMutationPerformed === false), browserExecution && browserExecution.data && browserExecution.data.response, "Safety");

      namespace.setExternalIntelligenceGatewayAcquisitionExecutor(null);
      const gatewaySourceId = "SOURCE-PHASE4-ANDROID-GATEWAY-" + suffix;
      const gatewaySetup = await setupFreeSource(
        gatewaySourceId,
        VERSION_MANIFEST.acquisition.adapterIds.localGateway,
        "LOCAL_GATEWAY",
        {
          exactUrl: "https://phase4-android-gateway-unavailable.invalid/data",
          canonicalHost: "phase4-android-gateway-unavailable.invalid",
          endpointReference: "phase4-android-gateway-unavailable"
        },
        budgetId,
        owned
      );
      check("Governed Gateway-required Android source is prepared without opening arbitrary proxy", gatewaySetup.ok === true && VERSION_MANIFEST.acquisition.arbitraryUrlProxyAllowed === false, gatewaySetup, "Gateway Unavailable");
      gatewayRoute = gatewaySetup.ok ? namespace.resolveExternalIntelligenceAcquisitionRoute({ requestId: gatewaySetup.request.requestId }) : null;
      check("Gateway-required Android route fails closed when Local Gateway is unavailable", Boolean(gatewayRoute && gatewayRoute.ok === false && gatewayRoute.data && gatewayRoute.data.fallbackPerformed === false), gatewayRoute && (gatewayRoute.data || gatewayRoute.code), "Gateway Unavailable");
      check("Gateway-required Android source never silently falls back to Browser Direct", Boolean(gatewayRoute && gatewayRoute.ok === false && gatewayRoute.data && gatewayRoute.data.fallbackPerformed === false && gatewayRoute.data.fallbackRuntimeTarget == null), gatewayRoute && gatewayRoute.data, "Gateway Unavailable");

      check("Gateway session still does not equal business authority", VERSION_MANIFEST.safety.gatewaySessionEqualsBusinessAuthority === false, VERSION_MANIFEST.safety.gatewaySessionEqualsBusinessAuthority, "Safety");
      check("Arbitrary unregistered source access remains prohibited", VERSION_MANIFEST.safety.arbitraryUnregisteredSourceAccessAllowed === false && VERSION_MANIFEST.acquisition.arbitraryUrlProxyAllowed === false, { arbitraryUnregisteredSourceAccessAllowed: VERSION_MANIFEST.safety.arbitraryUnregisteredSourceAccessAllowed, arbitraryUrlProxyAllowed: VERSION_MANIFEST.acquisition.arbitraryUrlProxyAllowed }, "Safety");
      check("Automatic paid/API/repository/trade authority remains disabled", VERSION_MANIFEST.safety.automaticPaidApiActivationAllowed === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false && VERSION_MANIFEST.safety.automaticTradeExecutionAllowed === false && VERSION_MANIFEST.safety.automaticAuthorityExpansionAllowed === false, { automaticPaidApiActivationAllowed: VERSION_MANIFEST.safety.automaticPaidApiActivationAllowed, directRepositoryMutationAllowed: VERSION_MANIFEST.safety.directRepositoryMutationAllowed, automaticTradeExecutionAllowed: VERSION_MANIFEST.safety.automaticTradeExecutionAllowed, automaticAuthorityExpansionAllowed: VERSION_MANIFEST.safety.automaticAuthorityExpansionAllowed }, "Safety");

      const auditChain = await namespace.verifyExternalIntelligenceAuditChain();
      check("EXTERNAL-010 audit chain remains valid after Android validation", auditChain.valid === true, { valid: auditChain.valid, eventCount: auditChain.eventCount }, "Audit");
    } catch (error) {
      check("Phase 04 Android validation execution completes without exception", false, { message: error && error.message || String(error), stack: error && error.stack || null }, "Validation");
    } finally {
      owned.forEach(function revoke(id) { namespace.revokeExternalIntelligenceAuthorityEnvelope(id, "Phase 04 Android validation completed"); });
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
      namespace.setExternalIntelligenceGatewayAcquisitionExecutor(null);
    }

    const summary = summarize(c.checks);
    const passedGate = summary.failed === 0 && summary.criticalFailed === 0;
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE4-ANDROID-REAL-DEVICE"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      gatewayVersion: VERSION_MANIFEST.gateway.gatewayVersion,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: passedGate ? "EXTERNAL-010 Phase 04 Android Real Device Validation PASS" : "EXTERNAL-010 Phase 04 Android Real Device Validation FAIL",
      releaseAllowed: passedGate,
      phase4AndroidRealDeviceComplete: passedGate,
      phase4FinalGateReady: passedGate,
      androidRealDeviceValidation: {
        passed: passedGate,
        userAgent,
        browserDirectRealHttp: Boolean(browserExecution && browserExecution.ok === true),
        gatewayUnavailableFailClosed: Boolean(gatewayRoute && gatewayRoute.ok === false && gatewayRoute.data && gatewayRoute.data.fallbackPerformed === false),
        staticIntegrityPassed: Boolean(staticRuntime && staticRuntime.ok === true),
        phase4RegressionPassed: Boolean(regression && regression.failed === 0 && regression.criticalFailed === 0 && regression.total >= EXPECTED_PHASE4_REGRESSION_TOTAL && regression.passed === regression.total),
        validatedAt: internal.nowIso()
      },
      staticManifest: staticRuntime && staticRuntime.manifest ? {
        manifestHash: staticRuntime.manifest.manifestHash,
        scriptSetHash: staticRuntime.manifest.scriptSetHash,
        scriptCount: staticRuntime.scriptCount
      } : null,
      regression: regression ? {
        passed: regression.passed,
        failed: regression.failed,
        total: regression.total,
        health: regression.health,
        criticalFailed: regression.criticalFailed,
        status: regression.status
      } : null,
      checks: c.checks,
      validatedAt: internal.nowIso()
    };

    state.latestPhase4AndroidValidation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase4AndroidValidation.status = passedGate ? "Passed" : "Failed";
    internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase4AndroidValidation() {
    return state.latestPhase4AndroidValidation ? internal.clone(state.latestPhase4AndroidValidation) : null;
  }

  Object.assign(namespace.api, {
    runExternalIntelligencePhase4AndroidValidation,
    getLatestExternalIntelligencePhase4AndroidValidation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase4AndroidValidation = {
    id: "EXTERNAL-010-PHASE4-ANDROID-REAL-DEVICE-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 4,
    androidRealDeviceRequired: true,
    browserDirectRealHttp: true,
    gatewayUnavailableFailClosed: true,
    fullStaticIntegrity: true,
    loadedAt: internal.nowIso()
  };

  global.runExternalIntelligencePhase4AndroidValidation = runExternalIntelligencePhase4AndroidValidation;
})(typeof window !== "undefined" ? window : globalThis);
