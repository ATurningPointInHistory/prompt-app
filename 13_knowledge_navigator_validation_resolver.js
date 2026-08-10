/* ============================================================
   FILE: 13_knowledge_navigator_validation_resolver.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Validation Resolver 1.0.0
   Phase 5: Authority / Evidence / Lineage
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 validation resolver blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("validationResolver");
  const RESOLVER_ID = "IDE-180-RESOLVER-VALIDATION-TRACE";

  function loadValidationArtifact() {
    if (typeof namespace.getIntelligencePackageArtifact !== "function") return internal.buildResult(false, "IDE180_VALIDATION_PROVIDER_UNAVAILABLE", "missing-source", null, { missingSource: { sourceType: "ide170-intelligence-package", artifactType: "artifact-validation" } });
    const loaded = namespace.getIntelligencePackageArtifact({ artifactType: "artifact-validation" });
    if (!loaded || loaded.ok !== true || !loaded.data || !loaded.data.artifact) return loaded;
    const artifact = loaded.data.artifact;
    return internal.buildResult(true, "IDE180_VALIDATION_ARTIFACT_READY", "complete", { artifactId: artifact.artifactId || null, artifactStatus: artifact.status || null, payload: internal.clone(artifact.payload || {}), record: internal.clone(loaded.data.record || null) }, { sourceSnapshot: loaded.sourceSnapshot || null });
  }

  function normalizedValidation(payload, artifactStatus) {
    const summary = payload && payload.validationSummary || null;
    const staticIntegrity = payload && payload.staticIntegrity || null;
    const releaseGate = payload && payload.releaseGate || null;
    let status = "unknown";
    if (summary && summary.valid === true && Number(summary.failed || 0) === 0) status = "validated";
    else if (summary && summary.valid === false || artifactStatus === "Invalid" || artifactStatus === "Blocked") status = "failed";
    else if (artifactStatus === "Valid") status = "validated";
    return internal.deepFreeze({
      status: status,
      artifactStatus: artifactStatus || null,
      summary: internal.clone(summary),
      staticIntegrity: internal.clone(staticIntegrity),
      releaseGate: internal.clone(releaseGate),
      evidenceReferences: Array.isArray(payload && payload.validationEvidenceReferences) ? internal.clone(payload.validationEvidenceReferences) : [],
      datasetVersion: payload && payload.datasetVersion || null,
      immutable: true
    });
  }


  function getValidationState() {
    const loaded = loadValidationArtifact();
    if (!loaded || loaded.ok !== true) return loaded;
    return internal.buildResult(true, "IDE180_VALIDATION_STATE_RESOLVED", "complete", { validation: normalizedValidation(loaded.data.payload, loaded.data.artifactStatus), artifactId: loaded.data.artifactId }, { sourceSnapshot: loaded.sourceSnapshot || null });
  }

  function resolve(request) {
    const loaded = loadValidationArtifact();
    if (!loaded || loaded.ok !== true) return loaded;
    const validation = normalizedValidation(loaded.data.payload, loaded.data.artifactStatus);
    const target = request && request.target && typeof request.target === "object"
      ? internal.clone(request.target)
      : { canonicalId: "artifact:validation", recordId: loaded.data.artifactId || "artifact-validation", recordType: "validation", name: "IDE-170 Validation Artifact", source: { sourceType: "ide170-intelligence-package", sourceVersion: "" } };
    return internal.buildResult(true, "IDE180_VALIDATION_NAVIGATION_RESOLVED", "complete", {
      target: target,
      navigationPath: [{ pathId: "IDE-180-VALIDATION-PATH-001", depth: 0, artifactId: loaded.data.artifactId || null }],
      validation: validation,
      evidence: validation.evidenceReferences.map(function map(ref) { return internal.deepFreeze({ evidenceType: ref.type || "validation-reference", reference: internal.clone(ref), immutable: true }); }),
      lineage: [],
      sourceSnapshot: loaded.sourceSnapshot || null
    });
  }

  const resolverDefinition = { resolverId: RESOLVER_ID, version: MODULE_VERSION, navigationTypes: ["validation"], readOnly: true, resolve: resolve };

  function initializeValidationResolver() {
    const existing = typeof namespace.getResolverDefinition === "function" ? namespace.getResolverDefinition(RESOLVER_ID) : null;
    const registration = existing ? internal.buildResult(true, "IDE180_RESOLVER_EXISTS", "Ready", { resolverId: RESOLVER_ID, existing: true }) : namespace.registerResolverDefinition(resolverDefinition);
    namespace.modules.validationResolver.status = registration.ok === true ? "Ready" : "Blocked";
    return internal.buildResult(registration.ok === true, registration.ok === true ? "IDE180_VALIDATION_RESOLVER_INITIALIZED" : "IDE180_VALIDATION_RESOLVER_INITIALIZATION_FAILED", registration.ok === true ? "Ready" : "Blocked", { resolverId: RESOLVER_ID, registration: registration, readOnly: true });
  }

  Object.assign(namespace.api, { initializeValidationResolver: initializeValidationResolver, loadKnowledgeNavigatorValidationArtifact: loadValidationArtifact, getKnowledgeNavigatorValidationState: getValidationState, resolveValidationNavigation: resolve });
  Object.assign(namespace, namespace.api);

  namespace.modules.validationResolver = { id: "IDE-180-VALIDATION-RESOLVER", version: MODULE_VERSION, status: "Loaded", phase: 5, resolverId: RESOLVER_ID, mutationAllowed: false, readOnly: true, loadedAt: internal.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
