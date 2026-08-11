/* ============================================================
   FILE: 13_knowledge_navigator_phase10_validation.js
   IDE-180 Knowledge Navigator
   Release: 1.9.1 / Module: Phase 10 Final Validation 1.0.1
   Phase 10: Integrated / Android Final Validation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 10 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase10Validation");
  const state = internal.state;
  const EXPECTED_RELEASE = "1.9.1";
  const EXPECTED_PHASE = "Phase 10 Integrated / Android Final Validation";
  const EXPECTED_SCRIPT_COUNT = 204;

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

  function summarize(checks) {
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

  function arr(value) { return Array.isArray(value) ? value : []; }
  function text(value, fallback) { return internal.text(value, fallback); }
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
    const response = await global.fetch(url, { cache: "no-store" });
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

      const concurrency = 8;
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
            const response = await global.fetch(url, { cache: "no-store" });
            if (!response || response.ok !== true) throw new Error("HTTP " + (response && response.status));
            const data = await response.arrayBuffer();
            const actualHash = await sha256(data);
            output.fetchedScriptCount += 1;
            if (actualHash !== expected.sha256) {
              output.scriptHashMismatchCount += 1;
              output.mismatches.push({ path: path, type: "sha256", expected: expected.sha256 || null, actual: actualHash });
            }
            if (Number(expected.byteSize) !== data.byteLength) {
              output.scriptByteSizeMismatchCount += 1;
              output.mismatches.push({ path: path, type: "byteSize", expected: expected.byteSize, actual: data.byteLength });
            }
            const expectedCacheKey = String(expected.sha256 || "").slice(0, 12);
            if (expected.cacheKey !== expectedCacheKey || getHashQuery(src) !== expectedCacheKey) {
              output.scriptCacheKeyMismatchCount += 1;
              output.mismatches.push({ path: path, type: "cacheKey", expected: expectedCacheKey, manifest: expected.cacheKey, url: getHashQuery(src) });
            }
          } catch (error) {
            output.fetchFailureCount += 1;
            output.mismatches.push({ path: path, type: "fetch", error: error && error.message ? error.message : String(error) });
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

  function hasForbiddenRuntimeKeys(value) {
    const forbidden = new Set(["queue", "stack", "visitedNodes", "visitedRelationships", "providerHandle", "providerHandles", "archiveFile", "archiveFileHandle", "runtimeSession", "runtimeSessions", "sourceCache"]);
    const seen = new Set();
    function walk(item) {
      if (!item || typeof item !== "object" || seen.has(item)) return false;
      seen.add(item);
      return Object.keys(item).some(function keyCheck(key) { return forbidden.has(key) || walk(item[key]); });
    }
    return walk(value);
  }

  async function runKnowledgeNavigatorPhase10Validation() {
    const checks = [];
    const check = checkFactory(checks);
    namespace.modules.phase10Validation.status = "Running";

    const initialized = namespace.initialize({ requireIDE170: true });
    check("IDE-180 initialization succeeds", initialized && initialized.ok === true, initialized && initialized.code, "Initialization", "Critical");
    check("Release Version is 1.9.1", VERSION_MANIFEST.release.version === EXPECTED_RELEASE, VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 10", VERSION_MANIFEST.implementation.phase === 10 && VERSION_MANIFEST.release.implementationPhase === EXPECTED_PHASE, VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains 1.0.0", VERSION_MANIFEST.release.designFreezeVersion === "1.0.0", VERSION_MANIFEST.release.designFreezeVersion, "Manifest", "High");
    check("Completed phases include 1 through 9", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6,7,8,9]), VERSION_MANIFEST.implementation.completedPhases, "Manifest", "Critical");
    check("Phase Count remains ten", VERSION_MANIFEST.implementation.phaseCount === 10, VERSION_MANIFEST.implementation.phaseCount, "Manifest", "High");
    check("IDE-190 minimum version remains 1.0.0", VERSION_MANIFEST.compatibility.minimumIDE190Version === "1.0.0", VERSION_MANIFEST.compatibility.minimumIDE190Version, "Compatibility", "Critical");

    const userAgent = global.navigator && global.navigator.userAgent || "";
    check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"), Boolean(global.crypto && global.crypto.subtle), "Android", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android", "Critical");
    check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android", "Critical");

    Object.keys(VERSION_MANIFEST.safety || {}).forEach(function safetyFlag(name) {
      check("Safety flag remains disabled: " + name, VERSION_MANIFEST.safety[name] === false, VERSION_MANIFEST.safety[name], "Safety", "Critical");
    });

    const contracts = namespace.listContractDefinitions();
    const types = namespace.listNavigationTypes();
    const providerRefs = namespace.listProviderDefinitions();
    const resolverRefs = namespace.listResolverDefinitions();
    const providers = providerRefs.map(function mapProvider(ref) { return namespace.getProviderDefinition(ref.providerId); }).filter(Boolean);
    const resolvers = resolverRefs.map(function mapResolver(ref) { return namespace.getResolverDefinition(ref.resolverId); }).filter(Boolean);
    check("Nine frozen Contracts are registered", contracts.length === 9, contracts.length, "Contracts", "Critical");
    check("All Contracts are read-only", contracts.every(function item(contract) { return contract.readOnly === true; }), contracts.filter(function item(contract) { return contract.readOnly !== true; }).map(function map(contract) { return contract.contractId; }), "Contracts", "Critical");
    check("All twenty Navigation Types are implemented", types.length === 20 && types.every(function item(type) { return type.implemented === true; }), types.filter(function item(type) { return type.implemented === true; }).length, "Registry", "Critical");
    check("Exactly six Source Providers are registered", providers.length === 6, providers.length, "Providers", "Critical");
    check("All registered Providers are read-only", providers.every(function item(provider) { return provider.readMode === "read-only"; }), providers.filter(function item(provider) { return provider.readMode !== "read-only"; }).map(function map(provider) { return provider.providerId; }), "Providers", "Critical");
    check("Exactly six Resolvers are registered", resolvers.length === 6, resolvers.length, "Resolvers", "Critical");
    check("All registered Resolvers are read-only", resolvers.every(function item(resolver) { return resolver.readOnly === true; }), resolvers.filter(function item(resolver) { return resolver.readOnly !== true; }).map(function map(resolver) { return resolver.resolverId; }), "Resolvers", "Critical");

    ["contracts","registry","intelligenceProvider","identity","queryResolution","basicResolver","budget","traversal","relationshipResolver","authority","evidence","lineage","validationResolver","memoProvider","knowledgeProvider","architectureProvider","validationProvider","memoArchiveProvider","conflict","federation","federatedResolver","explanation","session","persistence","recovery","navigationPackage","ide190Handoff","orchestrator"].forEach(function moduleReady(key) {
      check("Module is Ready: " + key, namespace.modules[key] && namespace.modules[key].status === "Ready", namespace.modules[key] && namespace.modules[key].status, "Modules", "Critical");
    });

    const staticRuntime = await verifyStaticRuntime();
    check("Static Script Manifest structure is valid", staticRuntime.manifestStructureValid === true, staticRuntime.error || staticRuntime.scriptCount, "Static Integrity", "Critical");
    check("Static Script Manifest internal integrity is valid", staticRuntime.manifestIntegrityValid === true, { manifestHash: staticRuntime.computedManifestHash, scriptSetHash: staticRuntime.computedScriptSetHash }, "Static Integrity", "Critical");
    check("Static Script Manifest contains exactly 204 scripts", staticRuntime.scriptCount === EXPECTED_SCRIPT_COUNT, staticRuntime.scriptCount, "Static Integrity", "Critical");
    check("All 204 scripts are fetched on Android", staticRuntime.fetchedScriptCount === EXPECTED_SCRIPT_COUNT && staticRuntime.fetchFailureCount === 0, { fetched: staticRuntime.fetchedScriptCount, failures: staticRuntime.fetchFailureCount }, "Static Integrity", "Critical");
    check("All script SHA-256 hashes match", staticRuntime.scriptHashMismatchCount === 0, staticRuntime.mismatches.filter(function item(x) { return x.type === "sha256"; }).slice(0, 5), "Static Integrity", "Critical");
    check("All script byte sizes match", staticRuntime.scriptByteSizeMismatchCount === 0, staticRuntime.mismatches.filter(function item(x) { return x.type === "byteSize"; }).slice(0, 5), "Static Integrity", "Critical");
    check("All script cache keys match SHA-256", staticRuntime.scriptCacheKeyMismatchCount === 0, staticRuntime.mismatches.filter(function item(x) { return x.type === "cacheKey"; }).slice(0, 5), "Static Integrity", "Critical");
    check("index.html local script sequence matches Static Manifest", staticRuntime.indexScriptSequenceMatches === true && staticRuntime.indexLocalScriptCount === EXPECTED_SCRIPT_COUNT, staticRuntime.indexLocalScriptCount, "Static Integrity", "Critical");
    check("index.html Manifest Hash marker matches Static Manifest", staticRuntime.indexManifestHashMatches === true, staticRuntime.manifest && staticRuntime.manifest.manifestHash, "Static Integrity", "Critical");
    check("Static Manifest keeps IDE-170 frozen application release 1.9.2", staticRuntime.manifest && staticRuntime.manifest.applicationReleaseVersion === "1.9.2", staticRuntime.manifest && staticRuntime.manifest.applicationReleaseVersion, "Version Architecture", "Critical");
    check("Static Manifest keeps independent-version-v1 architecture", staticRuntime.manifest && staticRuntime.manifest.versionArchitecture === "independent-version-v1", staticRuntime.manifest && staticRuntime.manifest.versionArchitecture, "Version Architecture", "Critical");

    const opened = await namespace.openLatestIntelligencePackageSource({ preferIndexedDB: true });
    const intelligenceStatus = namespace.getIntelligenceProviderStatus();
    check("IDE-170 Intelligence Package opens", opened && opened.ok === true, opened && opened.code, "IDE-170 Intake", "Critical");
    check("IDE-170 Provider remains read-only", intelligenceStatus.readMode === "read-only" && intelligenceStatus.mutationAllowed === false, intelligenceStatus.readMode, "IDE-170 Intake", "Critical");
    check("IDE-170 active Package identity is explicit", Boolean(intelligenceStatus.activePackage && intelligenceStatus.activePackage.packageId && /^[a-f0-9]{64}$/.test(String(intelligenceStatus.activePackage.packageHash || ""))), intelligenceStatus.activePackage, "IDE-170 Intake", "Critical");
    const canonicalSnapshot = await namespace.loadKnowledgeNavigatorCanonicalSnapshot({ forceReload: true });
    check("Canonical Snapshot loads from IDE-170 Package", canonicalSnapshot && canonicalSnapshot.ok === true, canonicalSnapshot && canonicalSnapshot.code, "Canonical", "Critical");
    const canonicalRecords = canonicalSnapshot && canonicalSnapshot.data && canonicalSnapshot.data.records || [];
    check("Canonical Snapshot contains records", canonicalRecords.length > 0, canonicalRecords.length, "Canonical", "Critical");
    check("Canonical Snapshot contains file:00_core.js", canonicalRecords.some(function item(record) { return record && record.identity && record.identity.canonicalId === "file:00_core.js"; }), canonicalRecords.length, "Canonical", "Critical");

    const fileResult = await namespace.navigate({ navigationType: "file", target: { canonicalId: "file:00_core.js" }, evidenceRequirement: "available" });
    check("End-to-End File Navigation completes", fileResult && fileResult.status === "complete", fileResult && fileResult.status, "E2E Navigation", "Critical");
    check("File Navigation preserves Canonical Target", fileResult && fileResult.target && fileResult.target.canonicalId === "file:00_core.js", fileResult && fileResult.target && fileResult.target.canonicalId, "E2E Navigation", "Critical");
    check("File Navigation returns explicit Navigation Path", fileResult && arr(fileResult.navigationPath).length >= 1, fileResult && fileResult.navigationPath && fileResult.navigationPath.length, "E2E Navigation", "Critical");
    check("File Navigation resolves non-scoring Authority", fileResult && fileResult.authority && fileResult.authority.status === "resolved" && fileResult.authority.scoringUsed === false, fileResult && fileResult.authority && fileResult.authority.status, "Authority", "Critical");
    check("File Navigation resolves Evidence", fileResult && arr(fileResult.evidence).length >= 1, fileResult && fileResult.evidence && fileResult.evidence.length, "Evidence", "Critical");
    check("File Navigation resolves Lineage", fileResult && arr(fileResult.lineage).length >= 1, fileResult && fileResult.lineage && fileResult.lineage.length, "Lineage", "Critical");
    check("File Navigation exposes governed Validation state", fileResult && fileResult.validation && Boolean(fileResult.validation.status), fileResult && fileResult.validation && fileResult.validation.status, "Validation", "Critical");
    check("File Navigation has structured Explanation", fileResult && fileResult.explanation && typeof fileResult.explanation === "object", fileResult && fileResult.explanation && fileResult.explanation.status, "Explanation", "Critical");
    check("File Navigation Result is immutable", Boolean(fileResult && Object.isFrozen(fileResult)), Boolean(fileResult && Object.isFrozen(fileResult)), "Read-Only", "Critical");

    const searchResult = await namespace.navigate({ navigationType: "search", query: "00_core.js" });
    check("Basic Search remains available", searchResult && searchResult.status === "complete", searchResult && searchResult.status, "E2E Navigation", "Critical");
    check("Basic Search uses no relevance score", searchResult && !JSON.stringify(searchResult).includes('"score"'), "no-score", "Safety", "Critical");
    const japaneseResult = await namespace.navigate("00_core.jsとは？");
    check("IDE-170 Japanese Query bridge remains operational", japaneseResult && japaneseResult.status === "complete", japaneseResult && japaneseResult.status, "Query Bridge", "Critical");
    check("Japanese Query bridge resolves 00_core.js", japaneseResult && japaneseResult.target && japaneseResult.target.canonicalId === "file:00_core.js", japaneseResult && japaneseResult.target && japaneseResult.target.canonicalId, "Query Bridge", "Critical");

    const relationshipResult = await namespace.navigate({ navigationType: "relationship", target: { canonicalId: "project:project:ai-prompt-os" }, maxDepth: 1 });
    check("Relationship Navigation completes", relationshipResult && relationshipResult.status === "complete", relationshipResult && relationshipResult.status, "Traversal", "Critical");
    check("Relationship Navigation returns Fact Relationships", relationshipResult && arr(relationshipResult.relationships).length > 0 && relationshipResult.relationships.every(function item(edge) { return edge.layer !== "candidate"; }), relationshipResult && relationshipResult.relationships && relationshipResult.relationships.length, "Traversal", "Critical");
    check("Traversal remains cycle-safe", namespace.modules.traversal.cycleDetection === true, namespace.modules.traversal.cycleDetection, "Traversal", "Critical");
    check("Traversal ordering remains deterministic", namespace.modules.traversal.deterministicOrdering === true, namespace.modules.traversal.deterministicOrdering, "Traversal", "Critical");
    check("Hard Safety Ceiling cannot be disabled", namespace.modules.budget.hardSafetyCeilingDisableAllowed === false, namespace.modules.budget.hardSafetyCeilingDisableAllowed, "Budget", "Critical");
    check("Traversal Budget uses no scoring", namespace.modules.budget.scoringAllowed === false, namespace.modules.budget.scoringAllowed, "Budget", "Critical");

    const memoStatus = namespace.getMemoProviderStatus();
    const knowledgeStatus = namespace.getKnowledgeProviderStatus();
    const architectureStatus = namespace.getArchitectureProviderStatus();
    const validationProviderStatus = namespace.getValidationProviderStatus();
    check("Current Memo Provider is available and read-only", memoStatus.availability === "available" && memoStatus.mutationAllowed === false, memoStatus, "Federation Sources", "Critical");
    check("Current Knowledge Provider is raw-memo-backed and non-scoring", knowledgeStatus.scoreBasedDeduplicationUsed === false && knowledgeStatus.mutationAllowed === false, knowledgeStatus, "Federation Sources", "Critical");
    check("Architecture Provider exposes explicit availability", ["available","partial","unavailable"].includes(architectureStatus.availability), architectureStatus.availability, "Federation Sources", "High");
    check("Validation Provider is read-only", validationProviderStatus.mutationAllowed === false, validationProviderStatus.mutationAllowed, "Federation Sources", "Critical");

    const knowledgeRecords = namespace.listKnowledgeSourceRecords();
    const memoRecords = namespace.listMemoSourceRecords();
    check("Current Knowledge contains at least one Source Record", knowledgeRecords.length > 0, knowledgeRecords.length, "Federation", "Critical");
    const firstKnowledge = knowledgeRecords[0] || null;
    const pairedMemo = firstKnowledge ? memoRecords.find(function item(record) { return record.canonicalEntityId === firstKnowledge.canonicalEntityId; }) : null;
    const federationInput = [firstKnowledge, pairedMemo].filter(Boolean);
    const federation = namespace.federateKnowledgeSourceRecords(federationInput);
    check("Federation creates Canonical Entity without physical merge", federation && federation.entityCount >= 1 && federation.nonDestructive === true && federation.physicalMergePerformed === false, federation && { entities: federation.entityCount, records: federation.sourceRecordCount }, "Federation", "Critical");
    check("Federation uses no scoring", federation && federation.scoringUsed === false, federation && federation.scoringUsed, "Federation", "Critical");
    check("Federation preserves Source Facets", federation && federation.entities[0] && arr(federation.entities[0].sourceFacets).length >= 1, federation && federation.entities[0] && federation.entities[0].sourceFacets, "Federation", "Critical");

    if (firstKnowledge) {
      const left = internal.clone(firstKnowledge);
      const right = internal.clone(firstKnowledge);
      right.recordId = right.recordId + ":PHASE10-CANDIDATE";
      right.providerId = "IDE-180-PHASE10-FIXTURE-PROVIDER";
      right.sourceId = right.sourceId + ":PHASE10-CANDIDATE";
      left.lifecycle = "active";
      right.lifecycle = "active";
      left.scope = null;
      right.scope = null;
      left.sourceMetadata = Object.assign({}, left.sourceMetadata || {}, { comparable: { phase10Field: "A" } });
      right.sourceMetadata = Object.assign({}, right.sourceMetadata || {}, { comparable: { phase10Field: "B" } });
      left.relationships = [];
      right.relationships = [];
      const conflicts = namespace.detectKnowledgeConflicts([left, right]);
      check("Structured value difference remains Conflict Candidate", conflicts.some(function item(conflict) { return conflict.status === "candidate" && conflict.conflictType === "deterministic-derived"; }), conflicts, "Conflict", "Critical");
      check("Conflict Candidate is never auto-promoted", !conflicts.some(function item(conflict) { return conflict.status === "confirmed"; }), conflicts.map(function map(conflict) { return conflict.status; }), "Conflict", "Critical");
    } else {
      check("Structured value difference remains Conflict Candidate", false, "no knowledge fixture", "Conflict", "Critical");
      check("Conflict Candidate is never auto-promoted", false, "no knowledge fixture", "Conflict", "Critical");
    }
    check("Free-text semantic Conflict confirmation remains disabled", namespace.modules.conflict.semanticFreeTextConfirmationAllowed === false, namespace.modules.conflict.semanticFreeTextConfirmationAllowed, "Conflict", "Critical");

    const missingResult = await namespace.navigate({ navigationType: "knowledge", query: "IDE180-PHASE10-MISSING-SOURCE-DO-NOT-CREATE" });
    check("Missing Source remains explicit", missingResult && ["missing-source","not-found"].includes(missingResult.status), missingResult && missingResult.status, "Recovery", "Critical");
    const recovery = namespace.getRecoverySuggestion(missingResult || { status: "missing-source", metadata: { navigationType: "knowledge" }, missingSources: [{ sourceType: "memo-current", reason: "not-found" }] });
    check("Missing Knowledge offers Archive Recovery only by user consent", recovery && recovery.available === true && recovery.requiresUserConsent === true, recovery, "Recovery", "Critical");
    check("Archive Recovery never enables automatic search", recovery && recovery.automaticSearchAllowed === false, recovery && recovery.automaticSearchAllowed, "Recovery", "Critical");
    check("Archive Recovery never enables automatic import", recovery && recovery.automaticImportAllowed === false, recovery && recovery.automaticImportAllowed, "Recovery", "Critical");
    const archiveStatus = namespace.getMemoArchiveProviderStatus();
    check("Archive Provider remains read-only", archiveStatus.readMode === "read-only" && archiveStatus.mutationAllowed === false, archiveStatus.readMode, "Recovery", "Critical");
    check("Archive Provider does not report imported=true", archiveStatus.imported === false, archiveStatus.imported, "Recovery", "Critical");
    check("Recovery module requires explicit user consent", namespace.modules.recovery.explicitUserConsentRequired === true, namespace.modules.recovery.explicitUserConsentRequired, "Recovery", "Critical");

    const previousReceipt = await namespace.getLatestNavigationReceipt();
    check("A persisted Navigation Receipt from Phase 7 exists", Boolean(previousReceipt && previousReceipt.receiptId), previousReceipt && previousReceipt.receiptId, "Persistence", "Critical");
    check("Persisted Receipt contains Phase 7 Reload Gate marker", Boolean(previousReceipt && previousReceipt.navigationSummary && previousReceipt.navigationSummary.phase7ReloadGate === true), previousReceipt && previousReceipt.navigationSummary && previousReceipt.navigationSummary.phase7ReloadGate, "Persistence", "Critical");
    check("Persisted Receipt survived a later module load", Boolean(previousReceipt && namespace.modules.session.loadedAt > previousReceipt.createdAt && namespace.modules.persistence.loadedAt > previousReceipt.createdAt), previousReceipt && (namespace.modules.session.loadedAt + " > " + previousReceipt.createdAt), "Persistence", "Critical");
    const previousRestore = previousReceipt ? await namespace.restoreNavigationReceipt(previousReceipt.receiptId) : null;
    check("Persisted Phase 7 Receipt restores in Final Gate", previousRestore && previousRestore.data && previousRestore.data.state === "restored", previousRestore && previousRestore.data && previousRestore.data.state, "Persistence", "Critical");
    check("Restored Phase 7 Receipt is not stale", previousRestore && previousRestore.data && previousRestore.data.stale === false, previousRestore && previousRestore.data && previousRestore.data.reasons, "Persistence", "Critical");
    check("Restored Phase 7 Receipt is not incompatible", previousRestore && previousRestore.data && previousRestore.data.incompatible === false, previousRestore && previousRestore.data && previousRestore.data.incompatible, "Persistence", "Critical");
    check("Restored Phase 7 Receipt is not corrupted", previousRestore && previousRestore.data && previousRestore.data.corrupted === false, previousRestore && previousRestore.data && previousRestore.data.corrupted, "Persistence", "Critical");
    check("Persistence excludes runtime queues", namespace.modules.persistence.selectivePersistence === true, namespace.modules.persistence.selectivePersistence, "Persistence", "Critical");
    check("Navigation Session remains runtime-only", namespace.modules.session.runtimeOnly === true, namespace.modules.session.runtimeOnly, "Persistence", "Critical");

    const packageBuilt = await namespace.buildKnowledgeNavigatorPackage(fileResult);
    const finalPackage = packageBuilt && packageBuilt.data && packageBuilt.data.package;
    const packageValidation = finalPackage ? await namespace.validateKnowledgeNavigatorPackage(finalPackage) : null;
    check("Final Navigation Package builds", packageBuilt && packageBuilt.ok === true, packageBuilt && packageBuilt.code, "IDE-190 Handoff", "Critical");
    check("Final Navigation Package validates", packageValidation && packageValidation.valid === true, packageValidation && packageValidation.status, "IDE-190 Handoff", "Critical");
    check("Final Navigation Package producer is IDE-180 1.9.1", finalPackage && finalPackage.manifest && finalPackage.manifest.producer && finalPackage.manifest.producer.componentId === "IDE-180" && finalPackage.manifest.producer.version === EXPECTED_RELEASE, finalPackage && finalPackage.manifest && finalPackage.manifest.producer, "IDE-190 Handoff", "Critical");
    check("Final Navigation Package excludes Runtime state", finalPackage && finalPackage.manifest.runtimeStateIncluded === false && hasForbiddenRuntimeKeys(finalPackage) === false, finalPackage && finalPackage.manifest && finalPackage.manifest.excludedRuntimeState, "IDE-190 Handoff", "Critical");
    check("Final Navigation Package is immutable", Boolean(finalPackage && finalPackage.immutable === true), finalPackage && finalPackage.immutable, "IDE-190 Handoff", "Critical");
    check("Final Navigation Package Integrity is SHA-256", Boolean(finalPackage && finalPackage.integrity && finalPackage.integrity.algorithm === "SHA-256" && /^[a-f0-9]{64}$/.test(finalPackage.integrity.hash)), finalPackage && finalPackage.integrity, "IDE-190 Handoff", "Critical");

    const handoffBuilt = finalPackage ? await namespace.buildIDE190HandoffContract(finalPackage) : null;
    const finalHandoff = handoffBuilt && handoffBuilt.data && handoffBuilt.data.handoff;
    const handoffValidation = finalHandoff ? await namespace.validateIDE190HandoffContract(finalHandoff) : null;
    check("Final IDE-190 Handoff builds", handoffBuilt && handoffBuilt.ok === true, handoffBuilt && handoffBuilt.code, "IDE-190 Handoff", "Critical");
    check("Final IDE-190 Handoff validates", handoffValidation && handoffValidation.valid === true, handoffValidation && handoffValidation.status, "IDE-190 Handoff", "Critical");
    check("Final IDE-190 Handoff consumer is IDE-190", finalHandoff && finalHandoff.consumer && finalHandoff.consumer.componentId === "IDE-190", finalHandoff && finalHandoff.consumer, "IDE-190 Handoff", "Critical");
    check("Final IDE-190 Handoff producer is IDE-180 1.9.1", finalHandoff && finalHandoff.producer && finalHandoff.producer.componentId === "IDE-180" && finalHandoff.producer.version === EXPECTED_RELEASE, finalHandoff && finalHandoff.producer, "IDE-190 Handoff", "Critical");
    check("Final IDE-190 Handoff is frozen and immutable", finalHandoff && finalHandoff.frozen === true && finalHandoff.immutable === true, finalHandoff && finalHandoff.frozenAt, "IDE-190 Handoff", "Critical");
    check("Final IDE-190 Handoff Integrity is SHA-256", Boolean(finalHandoff && finalHandoff.integrity && finalHandoff.integrity.algorithm === "SHA-256" && /^[a-f0-9]{64}$/.test(finalHandoff.integrity.hash)), finalHandoff && finalHandoff.integrity, "IDE-190 Handoff", "Critical");
    check("IDE-190 Handoff grants no Package mutation", finalHandoff && finalHandoff.policy.packageMutationAllowed === false, finalHandoff && finalHandoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff grants no Repository mutation", finalHandoff && finalHandoff.policy.repositoryMutationAllowed === false, finalHandoff && finalHandoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff grants no Workflow execution", finalHandoff && finalHandoff.policy.workflowExecutionAllowed === false, finalHandoff && finalHandoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff grants no Recommendation application", finalHandoff && finalHandoff.policy.recommendationApplicationAllowed === false, finalHandoff && finalHandoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff grants no Fact promotion", finalHandoff && finalHandoff.policy.factPromotionAllowed === false, finalHandoff && finalHandoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff grants no Archive import", finalHandoff && finalHandoff.policy.archiveImportAllowed === false, finalHandoff && finalHandoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff grants no Missing Source inference", finalHandoff && finalHandoff.policy.missingSourceInferenceAllowed === false, finalHandoff && finalHandoff.policy, "Safety", "Critical");
    check("Final IDE-190 Handoff excludes Runtime state", finalHandoff && finalHandoff.manifest.runtimeStateIncluded === false && hasForbiddenRuntimeKeys(finalHandoff) === false, finalHandoff && finalHandoff.manifest && finalHandoff.manifest.excludedRuntimeState, "IDE-190 Handoff", "Critical");

    const s = summarize(checks);
    const releaseAllowed = s.failed === 0 && s.criticalFailed === 0 && Boolean(staticRuntime.ok && finalPackage && finalHandoff);
    const validatedAt = internal.nowIso();
    const releaseReceiptBody = {
      receiptVersion: "1.0.0",
      componentId: "IDE-180",
      componentVersion: EXPECTED_RELEASE,
      releaseStatus: releaseAllowed ? "IDE-180 Knowledge Navigator Complete" : "IDE-180 Phase 10 Final Validation Blocked",
      designFreezeVersion: VERSION_MANIFEST.release.designFreezeVersion,
      staticManifest: staticRuntime.manifest ? { manifestHash: staticRuntime.manifest.manifestHash, scriptSetHash: staticRuntime.manifest.scriptSetHash, scriptCount: staticRuntime.scriptCount } : null,
      ide170Package: intelligenceStatus.activePackage ? { packageId: intelligenceStatus.activePackage.packageId, packageHash: intelligenceStatus.activePackage.packageHash } : null,
      navigationPackage: finalPackage ? { packageId: finalPackage.packageId, packageHash: finalPackage.integrity && finalPackage.integrity.hash } : null,
      ide190Handoff: finalHandoff ? { handoffId: finalHandoff.handoffId, handoffHash: finalHandoff.integrity && finalHandoff.integrity.hash, minimumIDE190Version: finalHandoff.consumer && finalHandoff.consumer.minimumVersion } : null,
      validation: { passed: s.passed, failed: s.failed, total: s.total, health: s.health, criticalFailed: s.criticalFailed, androidRealDevice: /Android/i.test(userAgent) },
      policy: { readOnly: true, ide190Allowed: releaseAllowed, repositoryMutationAllowed: false, workflowExecutionAllowed: false },
      validatedAt: validatedAt
    };
    const receiptHash = await sha256(stableStringify(releaseReceiptBody));
    const releaseReceipt = internal.deepFreeze(Object.assign({}, releaseReceiptBody, { integrity: { algorithm: "SHA-256", hash: receiptHash } }));

    const result = {
      id: internal.nextId("IDE-180-PHASE10-FINAL-VALIDATION"),
      componentId: "IDE-180",
      version: EXPECTED_RELEASE,
      implementationPhase: EXPECTED_PHASE,
      passed: s.passed,
      failed: s.failed,
      total: s.total,
      health: s.health,
      criticalFailed: s.criticalFailed,
      status: releaseAllowed ? "IDE-180 Phase 10 Integrated / Android Final Validation PASS" : "IDE-180 Phase 10 Integrated / Android Final Validation FAIL",
      releaseAllowed: releaseAllowed,
      phase10Complete: releaseAllowed,
      ide180Complete: releaseAllowed,
      ide190HandoffReady: releaseAllowed && Boolean(finalHandoff),
      ide190Allowed: releaseAllowed,
      releaseStatus: releaseAllowed ? "IDE-180 Knowledge Navigator Complete" : "Phase 10 Final Validation Blocked",
      readOnly: true,
      androidRealDeviceValidation: { passed: /Android/i.test(userAgent), userAgent: userAgent, validatedAt: validatedAt },
      staticIntegrity: {
        passed: staticRuntime.ok,
        scriptCount: staticRuntime.scriptCount,
        fetchedScriptCount: staticRuntime.fetchedScriptCount,
        manifestHash: staticRuntime.manifest && staticRuntime.manifest.manifestHash || null,
        scriptSetHash: staticRuntime.manifest && staticRuntime.manifest.scriptSetHash || null,
        mismatchCount: staticRuntime.mismatches.length
      },
      ide170Source: intelligenceStatus,
      navigationPackage: finalPackage ? { packageId: finalPackage.packageId, packageHash: finalPackage.integrity && finalPackage.integrity.hash, immutable: finalPackage.immutable === true } : null,
      ide190Handoff: finalHandoff ? { handoffId: finalHandoff.handoffId, handoffHash: finalHandoff.integrity && finalHandoff.integrity.hash, status: finalHandoff.status, immutable: finalHandoff.immutable === true } : null,
      releaseReceipt: releaseReceipt,
      checks: checks,
      validatedAt: validatedAt
    };

    state.lastPhase10Validation = internal.deepFreeze(internal.clone(result));
    state.ide180FinalReleaseReceipt = releaseReceipt;
    namespace.modules.phase10Validation.status = releaseAllowed ? "Ready" : "Blocked";
    namespace.modules.phase10Validation.ide190Allowed = releaseAllowed;
    internal.touch();
    return internal.clone(result);
  }

  function getKnowledgeNavigatorPhase10ValidationStatus() {
    return internal.clone(state.lastPhase10Validation || null);
  }

  function getIDE180FinalReleaseReceipt() {
    return internal.clone(state.ide180FinalReleaseReceipt || null);
  }

  Object.assign(namespace.api, {
    runKnowledgeNavigatorPhase10Validation: runKnowledgeNavigatorPhase10Validation,
    getKnowledgeNavigatorPhase10ValidationStatus: getKnowledgeNavigatorPhase10ValidationStatus,
    getIDE180FinalReleaseReceipt: getIDE180FinalReleaseReceipt
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase10Validation = {
    id: "IDE-180-PHASE10-FINAL-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 10,
    finalReleaseGate: true,
    androidRealDeviceRequired: true,
    staticIntegrityRequired: true,
    ide190Allowed: false,
    readOnly: true,
    loadedAt: internal.nowIso()
  };

  global.runKnowledgeNavigatorPhase10Validation = runKnowledgeNavigatorPhase10Validation;
})(typeof window !== "undefined" ? window : globalThis);
