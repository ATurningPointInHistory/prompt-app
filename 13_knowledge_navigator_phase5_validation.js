/* ============================================================
   FILE: 13_knowledge_navigator_phase5_validation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Phase 5 Validation 1.0.0
   Phase 5: Authority / Evidence / Lineage
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 5 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase5Validation");
  const IMPLEMENTED_TYPES = [
    "dependency", "entity", "evidence", "file", "function", "lineage", "module", "relationship",
    "repository", "reverse-dependency", "search", "timeline", "validation", "version", "workflow"
  ].sort();
  const DEFERRED_TYPES = ["architecture", "knowledge", "decision", "insight", "explanation"].sort();

  function hasScore(value) {
    if (value == null) return false;
    if (Array.isArray(value)) return value.some(hasScore);
    if (typeof value !== "object") return false;
    return Object.keys(value).some(function inspect(key) {
      if (/score$/i.test(key) || /authorityScore|trustScore|conflictScore/i.test(key)) return true;
      return hasScore(value[key]);
    });
  }

  async function runKnowledgeNavigatorPhase5Validation(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const checks = [];
    function check(name, passed, detail, group, severity) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), group: group || "Phase 5", severity: severity || "High" });
    }

    const initialization = namespace.initialize({ requireIDE170: settings.requireIDE170 !== false });
    check("IDE-180 initialization succeeds", initialization.ok === true, initialization.code, "Initialization", "Critical");
    const status = namespace.getStatus();
    check("Release Version is 1.4.0", status.version === "1.4.0", status.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 5", VERSION_MANIFEST.implementation.phase === 5, status.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains 1.0.0", status.designFreezeVersion === "1.0.0", status.designFreezeVersion, "Manifest", "High");
    check("Completed phases include 1 through 4", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1, 2, 3, 4]), JSON.stringify(VERSION_MANIFEST.implementation.completedPhases), "Manifest", "High");

    const safety = namespace.getSafetyStatus();
    Object.keys(VERSION_MANIFEST.safety).forEach(function validateSafetyFlag(key) {
      check("Safety flag remains disabled: " + key, safety[key] === false, safety[key], "Safety", "Critical");
    });

    check("Nine frozen contracts remain registered", namespace.listContractDefinitions().length === 9, namespace.listContractDefinitions().length, "Contracts", "Critical");
    check("All frozen contracts remain read-only", namespace.listContractDefinitions().every(function readonly(item) { return item.readOnly === true; }), namespace.listContractDefinitions().filter(function mutable(item) { return item.readOnly !== true; }).length, "Contracts", "Critical");
    check("Twenty core navigation types remain registered", namespace.listNavigationTypes().length === 20, namespace.listNavigationTypes().length, "Registry", "Critical");
    const implemented = namespace.listNavigationTypes().filter(function filter(item) { return item.implemented === true; }).map(function id(item) { return item.typeId; }).sort();
    check("Exactly fifteen Phase 1-5 navigation types are implemented", JSON.stringify(implemented) === JSON.stringify(IMPLEMENTED_TYPES), implemented.join(","), "Registry", "Critical");
    DEFERRED_TYPES.forEach(function deferred(type) {
      check("Deferred Source/Federation type is not overclaimed: " + type, namespace.getNavigationType(type).implemented === false, namespace.getNavigationType(type).implemented, "No Overclaim", "Critical");
    });

    check("Exactly five resolvers are registered", namespace.listResolverDefinitions().length === 5, JSON.stringify(namespace.listResolverDefinitions()), "Resolver Registry", "Critical");
    [
      ["IDE-180-RESOLVER-EVIDENCE-TRACE", ["evidence"]],
      ["IDE-180-RESOLVER-LINEAGE-VERSION-TIMELINE", ["lineage", "version", "timeline"]],
      ["IDE-180-RESOLVER-VALIDATION-TRACE", ["validation"]]
    ].forEach(function resolverCheck(entry) {
      const resolver = namespace.getResolverDefinition(entry[0]);
      check("Resolver is registered: " + entry[0], Boolean(resolver), resolver && resolver.resolverId, "Resolver", "Critical");
      check("Resolver remains read-only: " + entry[0], Boolean(resolver && resolver.readOnly === true), resolver && resolver.readOnly, "Resolver", "Critical");
      check("Resolver types are exact: " + entry[0], Boolean(resolver && JSON.stringify(resolver.navigationTypes.slice().sort()) === JSON.stringify(entry[1].slice().sort())), resolver && resolver.navigationTypes && resolver.navigationTypes.join(","), "Resolver", "Critical");
    });

    const authorityRules = namespace.getKnowledgeAuthorityRuleSet();
    check("Authority Rule Set is version 1.0.0", authorityRules.version === "1.0.0", authorityRules.version, "Authority", "Critical");
    check("Authority Rule Set contains no score field", hasScore(authorityRules) === false, JSON.stringify(authorityRules), "Authority", "Critical");

    const officialAuthority = namespace.resolveKnowledgeAuthority([
      { candidateId: "draft", sourceId: "S1", lifecycle: "draft", officialState: "non-official", validationState: "not-validated", evidenceReferences: [] },
      { candidateId: "official", sourceId: "S2", lifecycle: "frozen", officialState: "official", validationState: "validated", evidenceReferences: [{ evidenceId: "EV-1" }], lineageContinuous: true }
    ], { evidenceRequired: true });
    check("Deterministic Authority resolves Official validated source", officialAuthority.status === "resolved" && officialAuthority.selectedSource && officialAuthority.selectedSource.candidateId === "official", officialAuthority.status + "/" + (officialAuthority.selectedSource && officialAuthority.selectedSource.candidateId), "Authority", "Critical");
    check("Authority resolution uses no numeric score", hasScore(officialAuthority) === false && officialAuthority.scoringUsed === false, JSON.stringify(officialAuthority), "Authority", "Critical");

    const ambiguousAuthority = namespace.resolveKnowledgeAuthority([
      { candidateId: "A", sourceId: "A", lifecycle: "frozen", officialState: "unknown", validationState: "validated" },
      { candidateId: "B", sourceId: "B", lifecycle: "frozen", officialState: "unknown", validationState: "validated" }
    ]);
    check("Unresolved Authority remains ambiguous", ambiguousAuthority.status === "ambiguous" && ambiguousAuthority.selectedSource === null, ambiguousAuthority.status, "Authority", "Critical");

    const evidenceGate = namespace.resolveKnowledgeAuthority([
      { candidateId: "ONLY", sourceId: "ONLY", lifecycle: "frozen", officialState: "unknown", validationState: "validated", evidenceReferences: [] }
    ], { evidenceRequired: true });
    check("Evidence requirement blocks unsupported Authority promotion", evidenceGate.status === "insufficient-evidence" && evidenceGate.selectedSource === null, evidenceGate.status, "Authority", "Critical");

    const sourceOpen = await namespace.openLatestIntelligencePackageSource({ allowIndexedDB: true });
    check("IDE-170 Intelligence Package opens", sourceOpen && sourceOpen.ok === true, sourceOpen && sourceOpen.code, "Package Intake", "Critical");
    const providerStatus = namespace.getIntelligenceProviderStatus();
    check("Provider remains read-only", providerStatus.readMode === "read-only" && providerStatus.mutationAllowed === false, providerStatus.readMode, "Provider", "Critical");
    check("Provider exposes evidence-trace capability", providerStatus.capabilities.includes("evidence-trace"), providerStatus.capabilities.join(","), "Provider", "Critical");
    check("Provider exposes validation-trace capability", providerStatus.capabilities.includes("validation-trace"), providerStatus.capabilities.join(","), "Provider", "Critical");

    const canonical = namespace.loadKnowledgeNavigatorCanonicalSnapshot();
    check("Canonical Snapshot loads", canonical && canonical.ok === true, canonical && canonical.code, "Canonical", "Critical");
    const records = canonical && canonical.data && canonical.data.records || [];
    const fileRecord = records.find(function find(item) { return item && item.recordType === "file"; }) || null;
    check("Phase 5 fixture file exists", Boolean(fileRecord && fileRecord.identity && fileRecord.identity.canonicalId), fileRecord && fileRecord.identity && fileRecord.identity.canonicalId, "Canonical", "Critical");
    const fileId = fileRecord && fileRecord.identity && fileRecord.identity.canonicalId || "";

    const evidenceIndex = namespace.loadKnowledgeNavigatorEvidenceIndex();
    check("Evidence Index loads", evidenceIndex && evidenceIndex.ok === true, evidenceIndex && evidenceIndex.code, "Evidence", "Critical");
    const evidenceKeys = evidenceIndex && evidenceIndex.data ? Object.keys(evidenceIndex.data.evidenceIndex || {}) : [];
    check("Evidence Index contains explicit records", evidenceKeys.length > 0, evidenceKeys.length, "Evidence", "Critical");
    const firstEvidenceId = evidenceKeys[0] || "";
    const evidenceById = firstEvidenceId ? namespace.resolveKnowledgeEvidenceById(firstEvidenceId) : null;
    check("Evidence ID resolves from index", Boolean(evidenceById && evidenceById.ok === true && evidenceById.data && evidenceById.data.evidence && evidenceById.data.evidence.evidenceId === firstEvidenceId), evidenceById && evidenceById.code, "Evidence", "Critical");
    check("Evidence record is immutable", Boolean(evidenceById && evidenceById.data && Object.isFrozen(evidenceById.data.evidence)), evidenceById && evidenceById.data && evidenceById.data.evidence && evidenceById.data.evidence.immutable, "Read-Only", "Critical");
    check("Evidence record preserves strength instead of score", Boolean(evidenceById && evidenceById.data && evidenceById.data.evidence && evidenceById.data.evidence.strength) && hasScore(evidenceById.data.evidence) === false, evidenceById && evidenceById.data && evidenceById.data.evidence && evidenceById.data.evidence.strength, "Evidence", "Critical");

    const evidenceNav = firstEvidenceId ? await namespace.navigateKnowledge({ navigationType: "evidence", target: { evidenceId: firstEvidenceId } }) : null;
    check("Evidence Navigation completes", Boolean(evidenceNav && evidenceNav.status === "complete"), evidenceNav && evidenceNav.status, "Evidence Navigation", "Critical");
    check("Evidence Navigation returns explicit Evidence payload", Boolean(evidenceNav && evidenceNav.evidence.length === 1 && evidenceNav.evidence[0].evidenceId === firstEvidenceId), evidenceNav && evidenceNav.evidence && evidenceNav.evidence.length, "Evidence Navigation", "Critical");
    check("Evidence Navigation Result satisfies frozen contract", Boolean(evidenceNav && namespace.validateContract("navigationResult", evidenceNav).valid === true), evidenceNav && namespace.validateContract("navigationResult", evidenceNav).failed, "Contracts", "Critical");
    check("Evidence Navigation has deterministic Authority", Boolean(evidenceNav && ["resolved", "insufficient-evidence"].includes(evidenceNav.authority.status) && evidenceNav.authority.scoringUsed === false), evidenceNav && evidenceNav.authority && evidenceNav.authority.status, "Authority", "Critical");

    const fileEvidence = fileId ? namespace.resolveKnowledgeEvidenceForCanonicalId(fileId) : null;
    check("Canonical Entity Evidence resolution executes", Boolean(fileEvidence && fileEvidence.ok === true), fileEvidence && fileEvidence.code, "Evidence", "Critical");
    check("Canonical Entity Evidence never fabricates missing records", Boolean(fileEvidence && fileEvidence.data && Array.isArray(fileEvidence.data.evidence)), fileEvidence && fileEvidence.data && fileEvidence.data.evidence && fileEvidence.data.evidence.length, "Evidence", "Critical");

    const lineage = fileId ? namespace.resolveKnowledgeLineage(fileId) : null;
    check("Canonical Entity Lineage resolves", Boolean(lineage && lineage.ok === true), lineage && lineage.code, "Lineage", "Critical");
    check("Lineage contains Source Record", Boolean(lineage && lineage.data && lineage.data.lineage.some(function source(item) { return item.type === "source-record"; })), lineage && lineage.data && lineage.data.lineage && lineage.data.lineage.map(function type(item) { return item.type; }).join(","), "Lineage", "Critical");
    check("Lineage contains Intelligence Package trace", Boolean(lineage && lineage.data && lineage.data.lineage.some(function source(item) { return item.type === "intelligence-package"; })), lineage && lineage.data && lineage.data.lineage && lineage.data.lineage.map(function type(item) { return item.type; }).join(","), "Lineage", "Critical");
    check("Lineage contains no inferred flag or score", Boolean(lineage && hasScore(lineage.data.lineage) === false && !JSON.stringify(lineage.data.lineage).includes('"inferred":true')), lineage && lineage.data && lineage.data.lineage && lineage.data.lineage.length, "Lineage", "Critical");

    const lineageNav = fileId ? await namespace.navigateKnowledge({ navigationType: "lineage", target: { canonicalId: fileId } }) : null;
    check("Lineage Navigation completes", Boolean(lineageNav && lineageNav.status === "complete"), lineageNav && lineageNav.status, "Lineage Navigation", "Critical");
    check("Lineage Navigation returns explicit lineage", Boolean(lineageNav && lineageNav.lineage.length > 0), lineageNav && lineageNav.lineage && lineageNav.lineage.length, "Lineage Navigation", "Critical");
    check("Lineage Navigation Authority uses no score", Boolean(lineageNav && lineageNav.authority && lineageNav.authority.scoringUsed === false && hasScore(lineageNav.authority) === false), lineageNav && lineageNav.authority && lineageNav.authority.status, "Authority", "Critical");

    const versionNav = fileId ? await namespace.navigateKnowledge({ navigationType: "version", target: { canonicalId: fileId } }) : null;
    check("Version Navigation completes", Boolean(versionNav && versionNav.status === "complete"), versionNav && versionNav.status, "Version", "Critical");
    check("Version Navigation exposes Source version without inventing successor", Boolean(versionNav && (versionNav.version != null || versionNav.lineage.length > 0)), versionNav && versionNav.version, "Version", "Critical");
    const timelineNav = fileId ? await namespace.navigateKnowledge({ navigationType: "timeline", target: { canonicalId: fileId } }) : null;
    check("Timeline Navigation completes", Boolean(timelineNav && timelineNav.status === "complete"), timelineNav && timelineNav.status, "Timeline", "Critical");
    check("Timeline is derived only from explicit timestamps/lineage records", Boolean(timelineNav && timelineNav.lineage.every(function explicit(item) { return item && item.type; })), timelineNav && timelineNav.lineage && timelineNav.lineage.length, "Timeline", "Critical");

    const validationState = namespace.getKnowledgeNavigatorValidationState();
    check("Validation Artifact resolves", Boolean(validationState && validationState.ok === true), validationState && validationState.code, "Validation", "Critical");
    check("Validation State is governed", Boolean(validationState && validationState.data && ["validated", "failed", "unknown"].includes(validationState.data.validation.status)), validationState && validationState.data && validationState.data.validation && validationState.data.validation.status, "Validation", "Critical");
    check("Validation State preserves evidence references", Boolean(validationState && validationState.data && Array.isArray(validationState.data.validation.evidenceReferences)), validationState && validationState.data && validationState.data.validation && validationState.data.validation.evidenceReferences && validationState.data.validation.evidenceReferences.length, "Validation", "High");

    const validationNav = await namespace.navigateKnowledge({ navigationType: "validation", target: { recordType: "validation", name: "IDE-170 Validation Artifact" } });
    check("Validation Navigation completes", validationNav.status === "complete", validationNav.status, "Validation Navigation", "Critical");
    check("Validation Navigation returns evaluated Validation state", validationNav.validation && validationNav.validation.status !== "not-evaluated", validationNav.validation && validationNav.validation.status, "Validation Navigation", "Critical");
    check("Validation Navigation Result satisfies frozen contract", namespace.validateContract("navigationResult", validationNav).valid === true, namespace.validateContract("navigationResult", validationNav).failed, "Contracts", "Critical");

    const fileNav = fileId ? await namespace.navigateKnowledge({ navigationType: "file", target: { canonicalId: fileId, recordType: "file" } }) : null;
    check("Existing Basic File Navigation still completes", Boolean(fileNav && fileNav.status === "complete"), fileNav && fileNav.status, "Regression", "Critical");
    check("Existing Basic Navigation now carries Phase 5 Authority", Boolean(fileNav && fileNav.authority && fileNav.authority.status === "resolved" && fileNav.authority.scoringUsed === false), fileNav && fileNav.authority && fileNav.authority.status, "Authority Integration", "Critical");
    check("Existing Basic Navigation now carries explicit Lineage", Boolean(fileNav && fileNav.lineage.length > 0), fileNav && fileNav.lineage && fileNav.lineage.length, "Lineage Integration", "Critical");
    check("Existing Basic Navigation now carries Validation state", Boolean(fileNav && fileNav.validation && fileNav.validation.status !== "not-evaluated"), fileNav && fileNav.validation && fileNav.validation.status, "Validation Integration", "Critical");
    check("Basic Navigation Evidence remains source-bounded", Boolean(fileNav && Array.isArray(fileNav.evidence) && hasScore(fileNav.evidence) === false), fileNav && fileNav.evidence && fileNav.evidence.length, "Evidence Integration", "Critical");

    const graphLoaded = namespace.getIntelligencePackageArtifact({ artifactType: "fact-relationship-graph" });
    const realGraph = graphLoaded && graphLoaded.ok === true && graphLoaded.data && graphLoaded.data.artifact && graphLoaded.data.artifact.payload || null;
    const relationSource = realGraph && Array.isArray(realGraph.factEdges) && realGraph.factEdges[0] && realGraph.factEdges[0].sourceNode && realGraph.factEdges[0].sourceNode.canonicalId || null;
    const relationNav = relationSource ? await namespace.navigateKnowledge({ navigationType: "relationship", target: { canonicalId: relationSource }, maxDepth: 1 }) : null;
    check("Existing Relationship Navigation still completes", Boolean(relationNav && ["complete", "partial"].includes(relationNav.status)), relationNav && relationNav.status, "Regression", "Critical");
    check("Relationship Navigation resolves Evidence payloads from references", Boolean(relationNav && relationNav.relationships.length > 0 && relationNav.evidence.length > 0), relationNav && relationNav.evidence && relationNav.evidence.length, "Evidence Integration", "Critical");
    check("Relationship Evidence IDs remain traceable", Boolean(relationNav && relationNav.evidence.every(function trace(item) { return Boolean(item.evidenceId); })), relationNav && relationNav.evidence && relationNav.evidence.length, "Traceability", "Critical");
    check("Relationship Navigation has non-scoring Authority", Boolean(relationNav && relationNav.authority && relationNav.authority.scoringUsed === false && hasScore(relationNav.authority) === false), relationNav && relationNav.authority && relationNav.authority.status, "Authority Integration", "Critical");
    check("Relationship Navigation carries explicit Validation state", Boolean(relationNav && relationNav.validation && relationNav.validation.status !== "not-evaluated"), relationNav && relationNav.validation && relationNav.validation.status, "Validation Integration", "Critical");

    const missingEvidence = await namespace.navigateKnowledge({ navigationType: "evidence", target: { evidenceId: "IDE-170-EVIDENCE-__MISSING__" } });
    check("Unknown Evidence returns not-found", missingEvidence.status === "not-found", missingEvidence.status, "Missing Target", "Critical");
    check("Unknown Evidence does not fabricate Evidence", missingEvidence.evidence.length === 0, missingEvidence.evidence.length, "No Inference", "Critical");

    const unsupportedArchitecture = await namespace.navigateKnowledge({ navigationType: "architecture", query: "architecture" });
    check("Architecture remains explicitly unsupported before Federation Provider phase", unsupportedArchitecture.status === "unsupported", unsupportedArchitecture.status, "No Overclaim", "Critical");
    check("Unsupported Architecture contains no invented Source", unsupportedArchitecture.sources.length === 0, unsupportedArchitecture.sources.length, "No Overclaim", "Critical");

    const explanationValidation = fileNav ? namespace.validateContract("navigationExplanation", fileNav.explanation) : { valid: false, failed: 1 };
    check("Phase 5 Explanation satisfies frozen contract", explanationValidation.valid === true, explanationValidation.failed, "Explanation", "Critical");
    check("Phase 5 Explanation excludes hidden reasoning", Boolean(fileNav && fileNav.explanation && fileNav.explanation.metadata.hiddenReasoningIncluded === false), fileNav && fileNav.explanation && fileNav.explanation.metadata.hiddenReasoningIncluded, "Explanation", "Critical");
    check("Phase 5 Explanation no longer claims Authority is unimplemented", Boolean(fileNav && !JSON.stringify(fileNav.explanation).includes("does not resolve authority")), fileNav && fileNav.explanation && fileNav.explanation.humanReadable, "Explanation", "Critical");

    check("Authority module is Ready", namespace.modules.authority && namespace.modules.authority.status === "Ready", namespace.modules.authority && namespace.modules.authority.status, "Modules", "Critical");
    check("Evidence module is Ready", namespace.modules.evidence && namespace.modules.evidence.status === "Ready", namespace.modules.evidence && namespace.modules.evidence.status, "Modules", "Critical");
    check("Lineage module is Ready", namespace.modules.lineage && namespace.modules.lineage.status === "Ready", namespace.modules.lineage && namespace.modules.lineage.status, "Modules", "Critical");
    check("Validation Resolver module is Ready", namespace.modules.validationResolver && namespace.modules.validationResolver.status === "Ready", namespace.modules.validationResolver && namespace.modules.validationResolver.status, "Modules", "Critical");
    check("Orchestrator module remains Ready", namespace.modules.orchestrator && namespace.modules.orchestrator.status === "Ready", namespace.modules.orchestrator && namespace.modules.orchestrator.status, "Modules", "Critical");
    check("Phase 5 Validation module is loaded", Boolean(namespace.modules.phase5Validation), namespace.modules.phase5Validation && namespace.modules.phase5Validation.status, "Modules", "Critical");

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(item) { return !item.passed && item.severity === "Critical"; }).length;
    const result = {
      id: internal.nextId("IDE-180-PHASE5-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "IDE-180 Phase 5 Authority / Evidence / Lineage PASS" : "IDE-180 Phase 5 Authority / Evidence / Lineage FAIL",
      releaseAllowed: failed === 0,
      phase6Allowed: failed === 0,
      readOnly: true,
      authorityScoringAllowed: false,
      implementedNavigationTypes: implemented,
      deferredNavigationTypes: DEFERRED_TYPES.slice(),
      sourceProvider: namespace.getIntelligenceProviderStatus ? namespace.getIntelligenceProviderStatus() : null,
      checks: checks,
      validatedAt: internal.nowIso()
    };
    state.lastValidation = internal.clone(result);
    state.lastPhase5Validation = internal.clone(result);
    namespace.modules.phase5Validation.status = failed === 0 ? "Ready" : "Blocked";
    internal.touch();
    return internal.clone(result);
  }

  function getKnowledgeNavigatorPhase5ValidationStatus() {
    return state.lastPhase5Validation ? internal.clone(state.lastPhase5Validation) : { componentId: "IDE-180", version: VERSION_MANIFEST.release.version, status: "Not Validated", releaseAllowed: false, phase6Allowed: false };
  }

  Object.assign(namespace.api, { runKnowledgeNavigatorPhase5Validation: runKnowledgeNavigatorPhase5Validation, getKnowledgeNavigatorPhase5ValidationStatus: getKnowledgeNavigatorPhase5ValidationStatus });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase5Validation = { id: "IDE-180-PHASE5-VALIDATION", version: MODULE_VERSION, status: "Loaded", phase: 5, phaseName: "Authority / Evidence / Lineage", asynchronous: true, realPackageRequired: true, androidGateRequired: true, releaseGate: true, loadedAt: internal.nowIso() };

  global.runKnowledgeNavigatorPhase5Validation = runKnowledgeNavigatorPhase5Validation;
  global.getKnowledgeNavigatorPhase5ValidationStatus = getKnowledgeNavigatorPhase5ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
