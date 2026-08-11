/* ============================================================
   FILE: 13_knowledge_navigator_phase9_validation.js
   IDE-180 Knowledge Navigator
   Release: 1.8.0 / Module: Phase 9 Validation 1.0.0
   Phase 9: IDE-190 Navigation Package / Handoff
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Phase 9 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase9Validation");

  function checkFactory(checks) {
    return function check(name, passed, detail, group, severity) {
      checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : JSON.stringify(detail)), group: group || "General", severity: severity || "High" });
    };
  }
  function summary(checks) {
    const passed = checks.filter(function item(check) { return check.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function item(check) { return !check.passed && check.severity === "Critical"; }).length;
    return { passed: passed, failed: failed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0, criticalFailed: criticalFailed };
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

  async function runKnowledgeNavigatorPhase9Validation() {
    const checks = [];
    const check = checkFactory(checks);
    const initialized = namespace.initialize({ requireIDE170: true });

    check("IDE-180 initialization succeeds", initialized && initialized.ok === true, initialized && initialized.code, "Initialization", "Critical");
    check("Release Version is 1.8.0", VERSION_MANIFEST.release.version === "1.8.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 9", VERSION_MANIFEST.implementation.phase === 9 && /Phase 9/.test(VERSION_MANIFEST.release.implementationPhase), VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains 1.0.0", VERSION_MANIFEST.release.designFreezeVersion === "1.0.0", VERSION_MANIFEST.release.designFreezeVersion, "Manifest", "High");
    check("Completed phases include 1 through 8", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2,3,4,5,6,7,8]), VERSION_MANIFEST.implementation.completedPhases, "Manifest", "High");
    check("IDE-190 Handoff Contract remains 1.0.0", VERSION_MANIFEST.getContractVersion("ide190Handoff") === "1.0.0", VERSION_MANIFEST.getContractVersion("ide190Handoff"), "Contracts", "Critical");
    check("Minimum IDE-190 Version is declared", VERSION_MANIFEST.compatibility.minimumIDE190Version === "1.0.0", VERSION_MANIFEST.compatibility.minimumIDE190Version, "Compatibility", "Critical");

    Object.keys(VERSION_MANIFEST.safety || {}).forEach(function safetyFlag(name) {
      check("Safety flag remains disabled: " + name, VERSION_MANIFEST.safety[name] === false, VERSION_MANIFEST.safety[name], "Safety", "Critical");
    });

    check("All twenty Navigation Types remain implemented", namespace.listNavigationTypes().filter(function item(type) { return type.implemented === true; }).length === 20, namespace.listNavigationTypes().filter(function item(type) { return type.implemented === true; }).length, "Regression", "Critical");
    check("Exactly six Source Providers remain registered", namespace.listProviderDefinitions().length === 6, namespace.listProviderDefinitions().length, "Regression", "Critical");
    check("Exactly six Resolvers remain registered", namespace.listResolverDefinitions().length === 6, namespace.listResolverDefinitions().length, "Regression", "Critical");
    check("Navigation Package module is Ready", namespace.modules.navigationPackage && namespace.modules.navigationPackage.status === "Ready", namespace.modules.navigationPackage && namespace.modules.navigationPackage.status, "Modules", "Critical");
    check("IDE-190 Handoff module is Ready", namespace.modules.ide190Handoff && namespace.modules.ide190Handoff.status === "Ready", namespace.modules.ide190Handoff && namespace.modules.ide190Handoff.status, "Modules", "Critical");
    check("Navigation Package declares no Runtime state", namespace.modules.navigationPackage.runtimeStateIncluded === false, namespace.modules.navigationPackage.runtimeStateIncluded, "Safety", "Critical");
    check("Navigation Package forbids mutation", namespace.modules.navigationPackage.mutationAllowed === false, namespace.modules.navigationPackage.mutationAllowed, "Safety", "Critical");
    check("IDE-190 Handoff forbids mutation", namespace.modules.ide190Handoff.mutationAllowed === false, namespace.modules.ide190Handoff.mutationAllowed, "Safety", "Critical");

    const result = await namespace.navigate({ navigationType: "file", target: { canonicalId: "file:00_core.js" }, evidenceRequirement: "available" });
    check("Phase 9 source Navigation completes", result && result.status === "complete", result && result.status, "Navigation Package", "Critical");
    check("Phase 9 source Navigation has Canonical Target", Boolean(result && result.target && result.target.canonicalId), result && result.target && result.target.canonicalId, "Navigation Package", "Critical");
    check("Phase 9 source Navigation carries Authority", Boolean(result && result.authority && result.authority.status), result && result.authority && result.authority.status, "Navigation Package", "Critical");
    check("Phase 9 source Navigation carries structured Explanation", Boolean(result && result.explanation && typeof result.explanation === "object"), result && result.explanation && result.explanation.status, "Navigation Package", "High");

    const built = await namespace.buildKnowledgeNavigatorPackage(result);
    check("Navigation Package builds", built && built.ok === true, built && built.code, "Navigation Package", "Critical");
    const pkg = built && built.data && built.data.package;
    const pkgValidation = pkg ? await namespace.validateKnowledgeNavigatorPackage(pkg) : null;
    check("Navigation Package validates", pkgValidation && pkgValidation.valid === true, pkgValidation && pkgValidation.status, "Navigation Package", "Critical");
    check("Navigation Package satisfies frozen IDE-190 Contract", pkg && namespace.validateContract("ide190Handoff", pkg).valid === true, pkg && namespace.validateContract("ide190Handoff", pkg).failed, "Contracts", "Critical");
    check("Navigation Package Version is 1.0.0", pkg && pkg.packageVersion === "1.0.0", pkg && pkg.packageVersion, "Navigation Package", "Critical");
    check("Navigation Package Contract Version is 1.0.0", pkg && pkg.contractVersion === "1.0.0", pkg && pkg.contractVersion, "Navigation Package", "Critical");
    check("Navigation Package preserves Navigation Result ID", pkg && pkg.navigationResultId === result.resultId, pkg && pkg.navigationResultId, "Traceability", "Critical");
    check("Navigation Package preserves Request ID", pkg && pkg.requestId === result.requestId, pkg && pkg.requestId, "Traceability", "High");
    check("Navigation Package preserves Canonical Target", pkg && pkg.canonicalTarget && pkg.canonicalTarget.canonicalId === result.target.canonicalId, pkg && pkg.canonicalTarget && pkg.canonicalTarget.canonicalId, "Traceability", "Critical");
    check("Navigation Package preserves Navigation Path", pkg && Array.isArray(pkg.navigationPath) && pkg.navigationPath.length === result.navigationPath.length, pkg && pkg.navigationPath && pkg.navigationPath.length, "Traceability", "Critical");
    check("Navigation Package preserves Authority", pkg && pkg.authority && pkg.authority.status === result.authority.status, pkg && pkg.authority && pkg.authority.status, "Authority", "Critical");
    check("Navigation Package preserves Evidence", pkg && Array.isArray(pkg.evidence) && pkg.evidence.length === result.evidence.length, pkg && pkg.evidence && pkg.evidence.length, "Evidence", "Critical");
    check("Navigation Package preserves Lineage", pkg && Array.isArray(pkg.lineage) && pkg.lineage.length === result.lineage.length, pkg && pkg.lineage && pkg.lineage.length, "Lineage", "Critical");
    check("Navigation Package preserves Validation", pkg && pkg.validation && pkg.validation.status === result.validation.status, pkg && pkg.validation && pkg.validation.status, "Validation", "Critical");
    check("Navigation Package preserves Conflicts", pkg && Array.isArray(pkg.conflicts) && pkg.conflicts.length === result.conflicts.length, pkg && pkg.conflicts && pkg.conflicts.length, "Conflict", "Critical");
    check("Navigation Package preserves Missing Sources", pkg && Array.isArray(pkg.missingSources) && pkg.missingSources.length === result.missingSources.length, pkg && pkg.missingSources && pkg.missingSources.length, "Missing Source", "Critical");
    check("Navigation Package preserves Structured Explanation", pkg && pkg.structuredExplanation && typeof pkg.structuredExplanation === "object", pkg && pkg.structuredExplanation && pkg.structuredExplanation.status, "Explanation", "Critical");
    check("Navigation Package stores explicit Source Snapshot", pkg && pkg.sourceSnapshot && typeof pkg.sourceSnapshot === "object", pkg && pkg.sourceSnapshot && pkg.sourceSnapshot.snapshotVersion, "Traceability", "Critical");
    check("Navigation Package Manifest identifies IDE-180 producer", pkg && pkg.manifest && pkg.manifest.producer && pkg.manifest.producer.componentId === "IDE-180", pkg && pkg.manifest && pkg.manifest.producer, "Manifest", "Critical");
    check("Navigation Package Manifest identifies IDE-190 consumer", pkg && pkg.manifest && pkg.manifest.consumer && pkg.manifest.consumer.componentId === "IDE-190", pkg && pkg.manifest && pkg.manifest.consumer, "Manifest", "Critical");
    check("Navigation Package Manifest is read-only", pkg && pkg.manifest && pkg.manifest.readOnly === true, pkg && pkg.manifest && pkg.manifest.readOnly, "Safety", "Critical");
    check("Navigation Package excludes Runtime state", pkg && pkg.manifest && pkg.manifest.runtimeStateIncluded === false && hasForbiddenRuntimeKeys(pkg) === false, pkg && pkg.manifest && pkg.manifest.excludedRuntimeState, "Selective Package", "Critical");
    check("Navigation Package does not grant Repository mutation", pkg && pkg.manifest.mutationPermissions.repositoryMutationAllowed === false, pkg && pkg.manifest.mutationPermissions, "Safety", "Critical");
    check("Navigation Package does not grant Workflow execution", pkg && pkg.manifest.mutationPermissions.workflowExecutionAllowed === false, pkg && pkg.manifest.mutationPermissions, "Safety", "Critical");
    check("Navigation Package does not grant Fact promotion", pkg && pkg.manifest.mutationPermissions.factPromotionAllowed === false, pkg && pkg.manifest.mutationPermissions, "Safety", "Critical");
    check("Navigation Package does not grant Archive Import", pkg && pkg.manifest.mutationPermissions.archiveImportAllowed === false, pkg && pkg.manifest.mutationPermissions, "Safety", "Critical");
    check("Navigation Package Integrity is SHA-256", pkg && pkg.integrity && pkg.integrity.algorithm === "SHA-256" && /^[a-f0-9]{64}$/.test(pkg.integrity.hash), pkg && pkg.integrity, "Integrity", "Critical");
    const storedPkg = pkg ? namespace.getKnowledgeNavigatorPackage(pkg.packageId) : null;
    check("Stored Navigation Package is immutable", Boolean(storedPkg && storedPkg.immutable === true), storedPkg && storedPkg.immutable, "Read-Only", "Critical");
    check("Package Registry contains built Package", pkg && namespace.getKnowledgeNavigatorPackageStatus().packageCount >= 1, namespace.getKnowledgeNavigatorPackageStatus().packageCount, "Navigation Package", "High");

    if (pkg) {
      const tampered = internal.clone(pkg); tampered.navigationStatus = "tampered";
      const tamperedValidation = await namespace.validateKnowledgeNavigatorPackage(tampered);
      check("Tampered Navigation Package fails Integrity", tamperedValidation.valid === false, tamperedValidation.status, "Integrity", "Critical");
    } else {
      check("Tampered Navigation Package fails Integrity", false, "package missing", "Integrity", "Critical");
    }

    const handoffBuilt = pkg ? await namespace.buildIDE190HandoffContract(pkg) : null;
    check("IDE-190 Handoff builds", handoffBuilt && handoffBuilt.ok === true, handoffBuilt && handoffBuilt.code, "IDE-190 Handoff", "Critical");
    const handoff = handoffBuilt && handoffBuilt.data && handoffBuilt.data.handoff;
    const handoffValidation = handoff ? await namespace.validateIDE190HandoffContract(handoff) : null;
    check("IDE-190 Handoff validates", handoffValidation && handoffValidation.valid === true, handoffValidation && handoffValidation.status, "IDE-190 Handoff", "Critical");
    check("IDE-190 Handoff satisfies frozen Contract", handoff && namespace.validateContract("ide190Handoff", handoff).valid === true, handoff && namespace.validateContract("ide190Handoff", handoff).failed, "Contracts", "Critical");
    check("IDE-190 Handoff Consumer is IDE-190", handoff && handoff.consumer && handoff.consumer.componentId === "IDE-190", handoff && handoff.consumer, "IDE-190 Handoff", "Critical");
    check("IDE-190 Handoff Minimum Version is 1.0.0", handoff && handoff.consumer && handoff.consumer.minimumVersion === "1.0.0", handoff && handoff.consumer && handoff.consumer.minimumVersion, "Compatibility", "Critical");
    check("IDE-190 Handoff preserves Package identity", handoff && pkg && handoff.packageId === pkg.packageId, handoff && handoff.packageId, "Traceability", "Critical");
    check("IDE-190 Handoff preserves Canonical Target", handoff && pkg && handoff.canonicalTarget.canonicalId === pkg.canonicalTarget.canonicalId, handoff && handoff.canonicalTarget && handoff.canonicalTarget.canonicalId, "Traceability", "Critical");
    check("IDE-190 Handoff Package mutation is prohibited", handoff && handoff.policy.packageMutationAllowed === false, handoff && handoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff Repository mutation is prohibited", handoff && handoff.policy.repositoryMutationAllowed === false, handoff && handoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff Workflow execution is prohibited", handoff && handoff.policy.workflowExecutionAllowed === false, handoff && handoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff Recommendation application is prohibited", handoff && handoff.policy.recommendationApplicationAllowed === false, handoff && handoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff Fact promotion is prohibited", handoff && handoff.policy.factPromotionAllowed === false, handoff && handoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff Archive Import is prohibited", handoff && handoff.policy.archiveImportAllowed === false, handoff && handoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff Missing Source inference is prohibited", handoff && handoff.policy.missingSourceInferenceAllowed === false, handoff && handoff.policy, "Safety", "Critical");
    check("IDE-190 Handoff excludes Runtime state", handoff && handoff.manifest.runtimeStateIncluded === false && hasForbiddenRuntimeKeys(handoff) === false, handoff && handoff.manifest && handoff.manifest.excludedRuntimeState, "Selective Package", "Critical");
    check("IDE-190 Handoff Integrity is SHA-256", handoff && handoff.integrity && handoff.integrity.algorithm === "SHA-256" && /^[a-f0-9]{64}$/.test(handoff.integrity.hash), handoff && handoff.integrity, "Integrity", "Critical");
    check("IDE-190 Handoff is Frozen and immutable", handoff && handoff.frozen === true && handoff.immutable === true && Boolean(handoff.frozenAt), handoff && handoff.frozenAt, "Read-Only", "Critical");
    const storedHandoff = handoff ? namespace.getIDE190Handoff(handoff.handoffId) : null;
    check("Handoff Registry contains built Handoff", Boolean(storedHandoff), storedHandoff && storedHandoff.handoffId, "IDE-190 Handoff", "High");
    if (handoff) {
      const tamperedHandoff = internal.clone(handoff); tamperedHandoff.policy.repositoryMutationAllowed = true;
      const tamperedHandoffValidation = await namespace.validateIDE190HandoffContract(tamperedHandoff);
      check("Tampered IDE-190 Handoff fails Validation", tamperedHandoffValidation.valid === false, tamperedHandoffValidation.status, "Safety", "Critical");
    } else {
      check("Tampered IDE-190 Handoff fails Validation", false, "handoff missing", "Safety", "Critical");
    }

    const missingResult = await namespace.navigate({ navigationType: "knowledge", query: "IDE180-PHASE9-MISSING-SOURCE-DO-NOT-CREATE" });
    check("Missing Source Navigation remains governed", missingResult && ["missing-source", "not-found"].includes(missingResult.status), missingResult && missingResult.status, "Missing Source", "Critical");
    const missingBuilt = missingResult ? await namespace.buildKnowledgeNavigatorPackage(missingResult) : null;
    check("Missing Source can be represented in typed Package", missingBuilt && missingBuilt.ok === true, missingBuilt && missingBuilt.code, "Missing Source", "Critical");
    const missingPkg = missingBuilt && missingBuilt.data && missingBuilt.data.package;
    check("Missing Source Package preserves missingSources array", missingPkg && Array.isArray(missingPkg.missingSources) && missingPkg.missingSources.length >= 0, missingPkg && missingPkg.missingSources && missingPkg.missingSources.length, "Missing Source", "Critical");
    check("Missing Source Package does not infer Canonical Target", missingPkg && (!missingPkg.canonicalTarget.canonicalId || missingResult.target), missingPkg && missingPkg.canonicalTarget, "No Inference", "Critical");

    const archiveStatus = typeof namespace.getMemoArchiveProviderStatus === "function" ? namespace.getMemoArchiveProviderStatus() : null;
    check("Phase 8 Archive remains not automatically imported", !archiveStatus || archiveStatus.imported === false, archiveStatus && archiveStatus.imported, "Regression", "Critical");
    check("Authority scoring remains disabled", VERSION_MANIFEST.safety.authorityScoringAllowed === false, VERSION_MANIFEST.safety.authorityScoringAllowed, "Regression", "Critical");
    check("Conflict scoring remains disabled", VERSION_MANIFEST.safety.conflictScoringAllowed === false, VERSION_MANIFEST.safety.conflictScoringAllowed, "Regression", "Critical");
    check("Direct Repository mutation remains disabled", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Regression", "Critical");
    check("Automatic Workflow execution remains disabled", VERSION_MANIFEST.safety.automaticWorkflowExecutionAllowed === false, VERSION_MANIFEST.safety.automaticWorkflowExecutionAllowed, "Regression", "Critical");
    check("Phase 9 Validation module is loaded", namespace.modules.phase9Validation && namespace.modules.phase9Validation.status === "Loaded", namespace.modules.phase9Validation && namespace.modules.phase9Validation.status, "Modules", "Critical");

    const counts = summary(checks);
    const releaseAllowed = counts.failed === 0 && counts.criticalFailed === 0;
    namespace.modules.phase9Validation.status = releaseAllowed ? "Ready" : "Blocked";
    const out = internal.deepFreeze({
      id: internal.nextId("IDE-180-PHASE9-VALIDATION"),
      componentId: "IDE-180",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: counts.passed,
      failed: counts.failed,
      total: counts.total,
      health: counts.health,
      criticalFailed: counts.criticalFailed,
      status: releaseAllowed ? "IDE-180 Phase 9 IDE-190 Navigation Package / Handoff PASS" : "IDE-180 Phase 9 IDE-190 Navigation Package / Handoff FAIL",
      releaseAllowed: releaseAllowed,
      phase10Allowed: releaseAllowed,
      ide190HandoffReady: releaseAllowed,
      ide190Allowed: false,
      readOnly: true,
      navigationPackage: namespace.getKnowledgeNavigatorPackageStatus(),
      ide190Handoff: namespace.getIDE190HandoffStatus(),
      checks: checks,
      validatedAt: internal.nowIso()
    });
    internal.state.lastPhase9Validation = out;
    return out;
  }

  Object.assign(namespace.api, { runKnowledgeNavigatorPhase9Validation: runKnowledgeNavigatorPhase9Validation });
  Object.assign(namespace, namespace.api);
  global.runKnowledgeNavigatorPhase9Validation = runKnowledgeNavigatorPhase9Validation;

  namespace.modules.phase9Validation = { id: "IDE-180-PHASE9-VALIDATION", version: MODULE_VERSION, status: "Loaded", phase: 9, ide190Allowed: false, readOnly: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
