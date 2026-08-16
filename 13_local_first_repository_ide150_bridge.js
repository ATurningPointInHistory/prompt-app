/* ============================================================
   FILE: 13_local_first_repository_ide150_bridge.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.10.0 / Module: IDE-150 Bridge 1.0.0
   Phase 11: Read-only Function-Level Compatibility Bridge
   IMPORTANT: No IDE-150 approval, apply, rollback or persistent commit is invoked.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 IDE-150 Bridge blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("ide150Bridge");

  function ideInternal() {
    const ide = global.__IDE150AutoRefactoringInternal;
    if (!ide || typeof ide.findFunctionBlock !== "function" || typeof ide.countFunctionDefinitions !== "function" || typeof ide.hashText !== "function") return null;
    return ide;
  }

  function compileJavaScript(source, fileName) {
    try {
      Function(String(source || "") + "\n//# sourceURL=" + String(fileName || "REPOSITORY-010-bridge.js"));
      return { valid: true, error: "" };
    } catch (error) {
      return { valid: false, error: error && error.message ? error.message : String(error) };
    }
  }

  async function validateFunctionMutationAgainstSource(mutation, currentFileSource) {
    const ide = ideInternal();
    const reasons = [];
    if (!ide) return { valid: false, reasons: ["ide150-function-mechanics-unavailable"] };
    if (!mutation || mutation.mutationType !== "function-patch") reasons.push("function-patch-required");
    if (typeof currentFileSource !== "string") reasons.push("current-file-source-required");
    if (reasons.length) return { valid: false, reasons: reasons };

    const targetFunction = internal.text(mutation.targetFunction, "");
    const block = ide.findFunctionBlock(currentFileSource, targetFunction);
    if (!block) reasons.push("target-function-not-found");
    if (ide.countFunctionDefinitions(currentFileSource, targetFunction) !== 1) reasons.push("target-function-ambiguous");
    const currentFunction = block ? String(block.block || "").trim() : "";
    if (currentFunction !== mutation.beforeFunctionSource) reasons.push("current-before-source-mismatch");
    if (currentFunction && ide.hashText(currentFunction) !== mutation.ide150BeforeHash) reasons.push("ide150-before-hash-mismatch");

    let virtualSource = null;
    if (!reasons.length) {
      virtualSource = currentFileSource.slice(0, block.start) + mutation.afterFunctionSource + currentFileSource.slice(block.end);
      const syntax = compileJavaScript(virtualSource, mutation.targetFile);
      if (!syntax.valid) reasons.push("virtual-javascript-syntax-failed:" + syntax.error);
      const afterBlock = ide.findFunctionBlock(virtualSource, targetFunction);
      if (!afterBlock) reasons.push("target-function-missing-after-virtual-patch");
      if (ide.countFunctionDefinitions(virtualSource, targetFunction) !== 1) reasons.push("target-function-count-invalid-after-virtual-patch");
      if (afterBlock && String(afterBlock.block || "").trim() !== mutation.afterFunctionSource) reasons.push("after-function-source-mismatch");
      if (afterBlock && ide.hashText(String(afterBlock.block || "").trim()) !== mutation.ide150AfterHash) reasons.push("ide150-after-hash-mismatch");
    }

    return {
      valid: reasons.length === 0,
      reasons: reasons,
      candidateInput: {
        targetFile: mutation.targetFile,
        targetFunction: mutation.targetFunction,
        beforeFunctionSource: mutation.beforeFunctionSource,
        afterFunctionSource: mutation.afterFunctionSource,
        beforeHash: mutation.ide150BeforeHash,
        afterHash: mutation.ide150AfterHash
      },
      virtualPatchPrepared: reasons.length === 0,
      repositoryWriteAttempted: false,
      ide150ApprovalInvoked: false,
      ide150ApplyInvoked: false,
      persistentCommitAllowed: false
    };
  }

  async function validateMutationPackageAgainstDesktopTarget(packageOrId) {
    const record = typeof packageOrId === "string"
      ? (typeof namespace.getMutationPackageDescriptor === "function" ? namespace.getMutationPackageDescriptor(packageOrId) : null)
      : internal.clone(packageOrId);
    if (!record) return internal.buildResult(false, "REPOSITORY010_IDE150_BRIDGE_MUTATION_PACKAGE_REQUIRED", "Blocked", null);
    if (typeof namespace.validateMutationPackage !== "function") return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_VALIDATOR_REQUIRED", "Blocked", null);
    const packageValidation = await namespace.validateMutationPackage(record);
    if (!packageValidation || packageValidation.ok !== true) return internal.buildResult(false, "REPOSITORY010_IDE150_BRIDGE_PACKAGE_INVALID", "Blocked", { packageValidation: packageValidation });
    if (typeof namespace.readDesktopRepositoryFileText !== "function") return internal.buildResult(false, "REPOSITORY010_DESKTOP_READ_API_REQUIRED", "Blocked", null);

    const results = [];
    const fileCache = new Map();
    for (const mutation of record.mutationSet || []) {
      let currentFileSource = fileCache.get(mutation.targetFile);
      if (typeof currentFileSource !== "string") {
        const read = await namespace.readDesktopRepositoryFileText(mutation.targetFile);
        if (!read || read.ok !== true || !read.data || typeof read.data.text !== "string") {
          results.push({ mutationId: mutation.mutationId, valid: false, reasons: ["desktop-target-read-failed"], readResult: read });
          continue;
        }
        currentFileSource = read.data.text;
        fileCache.set(mutation.targetFile, currentFileSource);
      }
      const validated = await validateFunctionMutationAgainstSource(mutation, currentFileSource);
      results.push(Object.assign({ mutationId: mutation.mutationId, targetFile: mutation.targetFile, targetFunction: mutation.targetFunction }, validated));
    }

    const valid = results.length === record.mutationCount && results.every(function all(item) { return item.valid === true; });
    const evidence = {
      bridgeEvidenceId: internal.nextId("REPOSITORY010-IDE150-BRIDGE-EVIDENCE"),
      mutationPackageId: record.mutationPackageId,
      mutationPackageHash: record.mutationPackageHash,
      mutationSetHash: record.mutationSetHash,
      strategy: record.strategy,
      mutationCount: record.mutationCount,
      enabledMutationTypes: internal.clone(record.enabledMutationTypes),
      targetValidationResults: results,
      ide150RuntimeLoaded: Boolean(global.IDE150AutoRefactoring),
      ide150InternalMechanicsLoaded: Boolean(ideInternal()),
      bridgeMode: "read-only-compatibility-adapter",
      smallestSafeMutationFirst: record.smallestSafeMutationFirst === true,
      functionLevelOnlyInPhase11: true,
      ide150ApprovalInvoked: false,
      ide150ApplyInvoked: false,
      repositoryWriteAttempted: false,
      persistentCommitAllowed: false,
      mutationAuthorityGranted: false,
      canonicalMutationPerformed: false,
      authorityEffect: "none",
      validatedAt: internal.nowIso(),
      immutable: true
    };
    state.lastIDE150BridgeEvidence = internal.clone(evidence);
    state.mutationPackageStatus = valid ? "IDE-150 Compatible / Target Match" : "Blocked";
    state.lastMutationPackageValidation = Object.assign({}, internal.clone(state.lastMutationPackageValidation || {}), {
      valid: valid,
      ide150BridgeValidated: valid,
      bridgeEvidenceId: evidence.bridgeEvidenceId,
      targetMatch: valid,
      validatedAt: evidence.validatedAt
    });
    internal.touch();
    namespace.modules.ide150Bridge.status = valid ? "Validated" : "Blocked";
    return internal.buildResult(valid, valid ? "REPOSITORY010_IDE150_BRIDGE_VALIDATED" : "REPOSITORY010_IDE150_BRIDGE_BLOCKED", valid ? "Validated" : "Blocked", {
      evidence: evidence,
      allowedMutationSet: internal.clone(record.allowedMutationSet),
      mutationPackageHash: record.mutationPackageHash,
      mutationSetHash: record.mutationSetHash,
      canonicalMutationPerformed: false,
      authorityEffect: "none"
    });
  }

  function getIDE150BridgeStatus() {
    let controlledStatus = null;
    try {
      if (typeof global.getControlledAutoRefactoringApplicationStatus === "function") controlledStatus = global.getControlledAutoRefactoringApplicationStatus();
    } catch (_) {}
    return {
      status: namespace.modules.ide150Bridge.status,
      phase: 11,
      bridgeMode: "read-only-compatibility-adapter",
      ide150RuntimeLoaded: Boolean(global.IDE150AutoRefactoring),
      ide150InternalMechanicsLoaded: Boolean(ideInternal()),
      existingIDE150PersistentCommitAllowed: Boolean(controlledStatus && controlledStatus.safety && controlledStatus.safety.persistentCommitAllowed === true),
      expectedExistingIDE150PersistentCommitAllowed: false,
      functionLevelOnlyInPhase11: true,
      bridgeInvokesApproval: false,
      bridgeInvokesApply: false,
      canonicalMutationImplemented: false,
      controlledTransactionImplemented: false,
      lastEvidence: internal.clone(state.lastIDE150BridgeEvidence || null)
    };
  }

  Object.assign(namespace.api, {
    validateFunctionMutationAgainstSource: validateFunctionMutationAgainstSource,
    validateMutationPackageAgainstDesktopTarget: validateMutationPackageAgainstDesktopTarget,
    getIDE150BridgeStatus: getIDE150BridgeStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.ide150Bridge = {
    id: "REPOSITORY-010-IDE150-BRIDGE",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 11,
    bridgeMode: "read-only-compatibility-adapter",
    functionLevelOnlyInPhase11: true,
    ide150ApprovalInvoked: false,
    ide150ApplyInvoked: false,
    canonicalMutationImplemented: false,
    controlledTransactionImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.validateLocalFirstRepositoryMutationPackageAgainstDesktopTarget = validateMutationPackageAgainstDesktopTarget;
  global.getLocalFirstRepositoryIDE150BridgeStatus = getIDE150BridgeStatus;
})(typeof window !== "undefined" ? window : globalThis);
