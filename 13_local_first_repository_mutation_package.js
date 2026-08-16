/* ============================================================
   FILE: 13_local_first_repository_mutation_package.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.10.1 / Module: Hybrid Mutation Package 1.0.1
   Phase 11: Hybrid Mutation Package / Smallest Safe Mutation First
   IMPORTANT: Preparation / validation / explicit file transfer only.
   No Canonical write / no Transaction / no Token consumption / no V5.
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Mutation Package blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("mutationPackage");
  const PACKAGE_SCHEMA = "REPOSITORY-010-HYBRID-MUTATION-PACKAGE";
  const ENVELOPE_SCHEMA = "REPOSITORY-010-HYBRID-MUTATION-PACKAGE-ENVELOPE";
  const SCHEMA_VERSION = "1.0.0";
  const STRATEGY = "smallest-safe-mutation-first";
  const ENABLED_TYPES = ["function-patch"];
  const FALLBACK_TYPES = ["structured-block-patch", "file-replace", "multi-file-zip"];
  const MAX_MUTATIONS = 50;

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function each(key) { output[key] = stableValue(value[key]); });
    return output;
  }

  function stableStringify(value) { return JSON.stringify(stableValue(value)); }

  async function sha256(input) {
    if (!global.crypto || !global.crypto.subtle || typeof TextEncoder === "undefined") throw new Error("Web Crypto SHA-256 is unavailable.");
    const bytes = input instanceof ArrayBuffer
      ? input
      : new TextEncoder().encode(String(input == null ? "" : input)).buffer;
    const digest = await global.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function hex(v) { return v.toString(16).padStart(2, "0"); }).join("");
  }

  function isSha256(value) { return /^[a-f0-9]{64}$/.test(String(value || "")); }

  function normalizeRootFileName(value) {
    const path = internal.text(value, "").replace(/^\.\//, "");
    if (!path || path === "." || path === ".." || path.includes("/") || path.includes("\\")) return "";
    return path;
  }

  function getIde150Internal() {
    const ide = global.__IDE150AutoRefactoringInternal;
    if (!ide || typeof ide.findFunctionBlock !== "function" || typeof ide.countFunctionDefinitions !== "function" || typeof ide.normalizeFunctionSource !== "function" || typeof ide.hashText !== "function") return null;
    return ide;
  }

  function getTransferPackageRecord(id) {
    const transferPackageId = internal.text(id, "");
    if (transferPackageId && typeof namespace.getTransferPackageDescriptor === "function") {
      const record = namespace.getTransferPackageDescriptor(transferPackageId);
      if (record) return record;
    }
    const envelope = state.lastV2TransferEnvelope;
    const pkg = envelope && internal.isPlainObject(envelope.transferPackage) ? envelope.transferPackage : null;
    if (pkg && (!transferPackageId || pkg.transferPackageId === transferPackageId)) return internal.clone(pkg);
    return null;
  }

  async function resolveMutationPackageRecord(packageOrId) {
    if (packageOrId && typeof packageOrId === "object") return internal.clone(packageOrId);
    const mutationPackageId = internal.text(packageOrId, "");
    if (!mutationPackageId) return null;

    if (typeof namespace.getMutationPackageDescriptor === "function") {
      const runtimeRecord = namespace.getMutationPackageDescriptor(mutationPackageId);
      if (runtimeRecord) return runtimeRecord;
    }

    if (state.lastMutationPackage && state.lastMutationPackage.mutationPackageId === mutationPackageId) {
      return internal.clone(state.lastMutationPackage);
    }

    if (typeof namespace.getPersistedLocalFirstRepositoryRecord === "function") {
      const persisted = await namespace.getPersistedLocalFirstRepositoryRecord("mutationPackage", mutationPackageId);
      if (persisted) {
        if (typeof namespace.createMutationPackageDescriptor === "function") {
          const restored = namespace.createMutationPackageDescriptor(persisted);
          if (restored && restored.ok === true) {
            state.lastMutationPackage = internal.clone(restored.data.record);
            state.mutationPackageStatus = "Restored";
            internal.touch();
            return internal.clone(restored.data.record);
          }
        }
        return internal.clone(persisted);
      }
    }

    return null;
  }

  async function fetchRuntimeFileText(fileName) {
    const path = normalizeRootFileName(fileName);
    if (!path) throw new Error("Only root-level project files are allowed.");
    if (typeof global.fetch !== "function") throw new Error("Runtime source fetch is unavailable.");
    const response = await global.fetch("./" + path, { cache: "no-store" });
    if (!response || !response.ok) throw new Error("Runtime source could not be loaded: " + path);
    return response.text();
  }

  function compileJavaScript(source, fileName) {
    try {
      Function(String(source || "") + "\n//# sourceURL=" + String(fileName || "REPOSITORY-010-phase11.js"));
      return { valid: true, error: "" };
    } catch (error) {
      return { valid: false, error: error && error.message ? error.message : String(error) };
    }
  }

  async function buildFunctionMutation(input, index) {
    const source = internal.isPlainObject(input) ? input : {};
    const ide = getIde150Internal();
    if (!ide) throw new Error("IDE-150 function-level mechanics are unavailable.");

    const targetFile = normalizeRootFileName(source.targetFile);
    const targetFunction = internal.text(source.targetFunction, "");
    if (!targetFile || !/\.js$/i.test(targetFile)) throw new Error("Phase 11 function-patch requires a root-level JavaScript targetFile.");
    if (!targetFunction) throw new Error("targetFunction is required.");

    const beforeFunctionSource = ide.normalizeFunctionSource(source.beforeFunctionSource || source.beforeSource, targetFunction);
    const afterFunctionSource = ide.normalizeFunctionSource(source.afterFunctionSource || source.afterSource, targetFunction);
    if (!beforeFunctionSource || !afterFunctionSource) throw new Error("beforeFunctionSource and afterFunctionSource must contain only the scoped function.");
    if (ide.countFunctionDefinitions(beforeFunctionSource, targetFunction) !== 1 || ide.countFunctionDefinitions(afterFunctionSource, targetFunction) !== 1) {
      throw new Error("The scoped function must have exactly one definition in both before/after sources.");
    }
    if (beforeFunctionSource === afterFunctionSource) throw new Error("No function-level change was detected.");

    const currentFileSource = typeof source.currentFileSource === "string" ? source.currentFileSource : await fetchRuntimeFileText(targetFile);
    const currentBlock = ide.findFunctionBlock(currentFileSource, targetFunction);
    if (!currentBlock) throw new Error("Target function was not found in the current runtime source.");
    if (ide.countFunctionDefinitions(currentFileSource, targetFunction) !== 1) throw new Error("Target function definition is ambiguous in the current runtime source.");
    const currentFunctionSource = String(currentBlock.block || "").trim();
    if (currentFunctionSource !== beforeFunctionSource) throw new Error("Concurrent Change detected: current function does not match beforeFunctionSource.");

    const virtualSource = currentFileSource.slice(0, currentBlock.start) + afterFunctionSource + currentFileSource.slice(currentBlock.end);
    const syntax = compileJavaScript(virtualSource, targetFile);
    if (!syntax.valid) throw new Error("Virtual JavaScript syntax failed: " + syntax.error);
    const afterBlock = ide.findFunctionBlock(virtualSource, targetFunction);
    if (!afterBlock || ide.countFunctionDefinitions(virtualSource, targetFunction) !== 1 || String(afterBlock.block || "").trim() !== afterFunctionSource) {
      throw new Error("Target function identity was not preserved in the virtual source.");
    }

    const beforeSha256 = await sha256(beforeFunctionSource);
    const afterSha256 = await sha256(afterFunctionSource);
    const beforeFileSha256 = await sha256(currentFileSource);
    const afterFileSha256 = await sha256(virtualSource);
    const payloadCore = {
      mutationType: "function-patch",
      operation: "replace",
      targetFile: targetFile,
      targetFunction: targetFunction,
      beforeSha256: beforeSha256,
      afterSha256: afterSha256,
      beforeFileSha256: beforeFileSha256,
      afterFileSha256: afterFileSha256,
      beforeFunctionSource: beforeFunctionSource,
      afterFunctionSource: afterFunctionSource
    };
    const payloadHash = await sha256(stableStringify(payloadCore));
    const diff = typeof ide.buildCompactLineDiff === "function"
      ? ide.buildCompactLineDiff(beforeFunctionSource, afterFunctionSource, ide.DEFAULT_BUDGET || undefined)
      : null;

    return {
      mutationId: internal.text(source.mutationId, internal.nextId("REPOSITORY010-FUNCTION-MUTATION")),
      mutationType: "function-patch",
      operation: "replace",
      priorityLevel: 1,
      selectionReason: "exact-single-function-smallest-safe-mutation",
      targetFile: targetFile,
      targetFunction: targetFunction,
      beforeFunctionSource: beforeFunctionSource,
      afterFunctionSource: afterFunctionSource,
      beforeSha256: beforeSha256,
      afterSha256: afterSha256,
      beforeFileSha256: beforeFileSha256,
      afterFileSha256: afterFileSha256,
      payloadHash: payloadHash,
      ide150BeforeHash: ide.hashText(beforeFunctionSource),
      ide150AfterHash: ide.hashText(afterFunctionSource),
      changedLines: diff && Number.isFinite(Number(diff.changedLines)) ? Number(diff.changedLines) : null,
      sourceIndex: Number(index || 0),
      ide150Compatible: true,
      virtualSyntaxValidated: true,
      writeAttempted: false,
      canonicalMutationPerformed: false,
      immutable: true
    };
  }

  function compactAllowedMutation(item) {
    return {
      mutationId: item.mutationId,
      mutationType: item.mutationType,
      operation: item.operation,
      priorityLevel: item.priorityLevel,
      targetFile: item.targetFile,
      targetFunction: item.targetFunction,
      beforeSha256: item.beforeSha256,
      afterSha256: item.afterSha256,
      beforeFileSha256: item.beforeFileSha256,
      afterFileSha256: item.afterFileSha256,
      payloadHash: item.payloadHash,
      ide150BeforeHash: item.ide150BeforeHash,
      ide150AfterHash: item.ide150AfterHash
    };
  }

  async function prepareHybridMutationPackage(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const pkg = getTransferPackageRecord(source.transferPackageId);
    if (!pkg) return internal.buildResult(false, "REPOSITORY010_MUTATION_TRANSFER_PACKAGE_REQUIRED", "Blocked", null);
    if (pkg.integrityPreflightPassed !== true || pkg.integrityPreflightStatus !== "verified") {
      return internal.buildResult(false, "REPOSITORY010_MUTATION_TRANSFER_PACKAGE_NOT_VERIFIED", "Blocked", { transferPackageId: pkg.transferPackageId });
    }

    const requested = Array.isArray(source.mutations) ? source.mutations : [];
    if (!requested.length || requested.length > MAX_MUTATIONS) {
      return internal.buildResult(false, "REPOSITORY010_MUTATION_SET_SIZE_INVALID", "Blocked", { min: 1, max: MAX_MUTATIONS, actual: requested.length });
    }

    try {
      const mutations = [];
      for (let i = 0; i < requested.length; i += 1) {
        const mutationType = internal.text(requested[i] && requested[i].mutationType, "function-patch");
        if (mutationType !== "function-patch") {
          return internal.buildResult(false, "REPOSITORY010_PHASE11_MUTATION_TYPE_DISABLED", "Blocked", {
            requestedMutationType: mutationType,
            enabledMutationTypes: ENABLED_TYPES.slice(),
            fallbackMutationTypes: FALLBACK_TYPES.slice()
          });
        }
        mutations.push(await buildFunctionMutation(requested[i], i));
      }

      const targetKeys = new Set();
      for (const item of mutations) {
        const key = item.targetFile + "::" + item.targetFunction;
        if (targetKeys.has(key)) return internal.buildResult(false, "REPOSITORY010_DUPLICATE_MUTATION_TARGET", "Blocked", { target: key });
        targetKeys.add(key);
      }

      const allowedMutationSet = mutations.map(compactAllowedMutation);
      const mutationSetHash = await sha256(stableStringify(allowedMutationSet));
      const payloadHash = await sha256(stableStringify(mutations.map(function payload(item) {
        return {
          mutationId: item.mutationId,
          payloadHash: item.payloadHash,
          beforeFunctionSource: item.beforeFunctionSource,
          afterFunctionSource: item.afterFunctionSource
        };
      })));

      const draft = {
        mutationPackageId: internal.text(source.mutationPackageId, internal.nextId("REPOSITORY010-MUTATION-PACKAGE")),
        schema: PACKAGE_SCHEMA,
        schemaVersion: SCHEMA_VERSION,
        strategy: STRATEGY,
        projectId: pkg.projectId,
        repositoryId: pkg.repositoryId,
        sourceNodeId: pkg.sourceNodeId,
        candidateId: pkg.syncCandidateId,
        candidateRevisionId: pkg.revisionId,
        baseRevisionId: pkg.baseRevisionId,
        transferPackageId: pkg.transferPackageId,
        sourceTransferPackageHash: pkg.packageHash,
        mutationCount: mutations.length,
        enabledMutationTypes: ENABLED_TYPES.slice(),
        fallbackMutationTypes: FALLBACK_TYPES.slice(),
        mutationSet: mutations,
        allowedMutationSet: allowedMutationSet,
        mutationSetHashAlgorithm: "SHA-256",
        mutationSetHash: mutationSetHash,
        payloadHashAlgorithm: "SHA-256",
        payloadHash: payloadHash,
        mutationPackageHashAlgorithm: "SHA-256",
        mutationPackageHash: "",
        ide150BridgeMode: "read-only-compatibility-adapter",
        smallestSafeMutationFirst: true,
        fullFileReplacementEnabled: false,
        multiFileZipMutationEnabled: false,
        validationIsApproval: false,
        explicitAcceptanceGranted: false,
        mutationAuthorityGranted: false,
        controlledTransactionStarted: false,
        writeAttempted: false,
        canonicalMutationPerformed: false,
        v5PostReflectionVerified: false,
        syncEngineInvoked: false,
        authorityEffect: "none",
        createdAt: internal.nowIso(),
        immutable: true
      };

      const hashPayload = internal.clone(draft);
      hashPayload.mutationPackageHash = "";
      draft.mutationPackageHash = await sha256(stableStringify(hashPayload));
      const created = namespace.createMutationPackageDescriptor(draft);
      if (!created || created.ok !== true) return created;
      const record = created.data.record;

      if (source.persistPackage !== false) {
        if (typeof namespace.persistLocalFirstRepositoryRecord !== "function") {
          state.mutationPackageDescriptors.delete(record.mutationPackageId);
          return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_PERSISTENCE_API_REQUIRED", "Blocked", null);
        }
        const persisted = await namespace.persistLocalFirstRepositoryRecord("mutationPackage", record);
        if (!persisted || persisted.ok !== true) {
          state.mutationPackageDescriptors.delete(record.mutationPackageId);
          try {
            if (typeof namespace.deletePersistedLocalFirstRepositoryRecord === "function") {
              await namespace.deletePersistedLocalFirstRepositoryRecord("mutationPackage", record.mutationPackageId);
            }
          } catch (_) {}
          return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_PERSISTENCE_FAILED", "Failed", persisted && persisted.data || null);
        }
      }

      state.lastMutationPackage = internal.clone(record);
      state.mutationPackageStatus = "Prepared";
      internal.touch();
      namespace.modules.mutationPackage.status = "Prepared";
      return internal.buildResult(true, "REPOSITORY010_HYBRID_MUTATION_PACKAGE_PREPARED", "Prepared", {
        mutationPackage: internal.clone(record),
        allowedMutationSet: internal.clone(record.allowedMutationSet),
        mutationSetHash: record.mutationSetHash,
        mutationPackageHash: record.mutationPackageHash,
        smallestSafeMutationFirst: true,
        selectedMutationType: "function-patch",
        canonicalMutationPerformed: false,
        authorityEffect: "none"
      });
    } catch (error) {
      state.mutationPackageStatus = "Blocked";
      state.lastError = { message: error && error.message ? error.message : String(error), category: "Mutation Package" };
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_PREPARATION_FAILED", "Blocked", null, { error: internal.clone(state.lastError) });
    }
  }

  async function validateMutationPackage(packageOrId) {
    const record = await resolveMutationPackageRecord(packageOrId);
    const reasons = [];
    if (!record) return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_REQUIRED", "Blocked", null);

    const contract = namespace.validateContract("mutationPackageDescriptor", record);
    if (!contract.valid) reasons.push("mutation-package-contract-invalid");
    if (record.schema !== PACKAGE_SCHEMA || record.schemaVersion !== SCHEMA_VERSION) reasons.push("mutation-package-schema-invalid");
    if (record.strategy !== STRATEGY || record.smallestSafeMutationFirst !== true) reasons.push("mutation-strategy-invalid");
    if (!Array.isArray(record.mutationSet) || !record.mutationSet.length || record.mutationSet.length !== record.mutationCount) reasons.push("mutation-set-invalid");
    if (!Array.isArray(record.allowedMutationSet) || record.allowedMutationSet.length !== record.mutationCount) reasons.push("allowed-mutation-set-invalid");
    if (!isSha256(record.sourceTransferPackageHash)) reasons.push("source-transfer-package-hash-invalid");

    try {
      const expectedAllowed = [];
      for (const item of Array.isArray(record.mutationSet) ? record.mutationSet : []) {
        if (item.mutationType !== "function-patch") reasons.push("phase11-non-function-mutation-disabled");
        const ide = getIde150Internal();
        if (!ide) { reasons.push("ide150-mechanics-unavailable"); break; }
        if (ide.countFunctionDefinitions(item.beforeFunctionSource, item.targetFunction) !== 1 || ide.countFunctionDefinitions(item.afterFunctionSource, item.targetFunction) !== 1) reasons.push("function-identity-invalid:" + item.mutationId);
        const beforeSha256 = await sha256(item.beforeFunctionSource);
        const afterSha256 = await sha256(item.afterFunctionSource);
        if (beforeSha256 !== item.beforeSha256) reasons.push("before-sha256-mismatch:" + item.mutationId);
        if (afterSha256 !== item.afterSha256) reasons.push("after-sha256-mismatch:" + item.mutationId);
        if (ide.hashText(item.beforeFunctionSource) !== item.ide150BeforeHash || ide.hashText(item.afterFunctionSource) !== item.ide150AfterHash) reasons.push("ide150-hash-mismatch:" + item.mutationId);
        const payloadCore = {
          mutationType: item.mutationType,
          operation: item.operation,
          targetFile: item.targetFile,
          targetFunction: item.targetFunction,
          beforeSha256: item.beforeSha256,
          afterSha256: item.afterSha256,
          beforeFileSha256: item.beforeFileSha256,
          afterFileSha256: item.afterFileSha256,
          beforeFunctionSource: item.beforeFunctionSource,
          afterFunctionSource: item.afterFunctionSource
        };
        if (await sha256(stableStringify(payloadCore)) !== item.payloadHash) reasons.push("payload-hash-mismatch:" + item.mutationId);
        expectedAllowed.push(compactAllowedMutation(item));
      }
      if (await sha256(stableStringify(expectedAllowed)) !== record.mutationSetHash) reasons.push("mutation-set-hash-mismatch");
      if (stableStringify(expectedAllowed) !== stableStringify(record.allowedMutationSet)) reasons.push("allowed-mutation-set-binding-mismatch");
      const expectedPayloadHash = await sha256(stableStringify((record.mutationSet || []).map(function payload(item) {
        return { mutationId: item.mutationId, payloadHash: item.payloadHash, beforeFunctionSource: item.beforeFunctionSource, afterFunctionSource: item.afterFunctionSource };
      })));
      if (expectedPayloadHash !== record.payloadHash) reasons.push("mutation-payload-hash-mismatch");
      const hashPayload = internal.clone(record);
      hashPayload.mutationPackageHash = "";
      if (await sha256(stableStringify(hashPayload)) !== record.mutationPackageHash) reasons.push("mutation-package-hash-mismatch");
    } catch (error) {
      reasons.push("mutation-package-hash-validation-failed:" + (error && error.message ? error.message : String(error)));
    }

    if (record.validationIsApproval !== false || record.mutationAuthorityGranted !== false || record.controlledTransactionStarted !== false || record.writeAttempted !== false || record.canonicalMutationPerformed !== false) reasons.push("mutation-authority-boundary-violated");
    return internal.buildResult(reasons.length === 0, reasons.length ? "REPOSITORY010_MUTATION_PACKAGE_BLOCKED" : "REPOSITORY010_MUTATION_PACKAGE_VALID", reasons.length ? "Blocked" : "Valid", {
      mutationPackageId: record.mutationPackageId,
      valid: reasons.length === 0,
      reasons: reasons,
      contract: contract,
      mutationCount: record.mutationCount,
      allowedMutationSet: internal.clone(record.allowedMutationSet || []),
      mutationSetHash: record.mutationSetHash || null,
      mutationPackageHash: record.mutationPackageHash || null,
      selectedMutationType: record.mutationSet && record.mutationSet.length ? record.mutationSet[0].mutationType : null,
      smallestSafeMutationFirst: record.smallestSafeMutationFirst === true,
      canonicalMutationPerformed: false,
      authorityEffect: "none"
    });
  }

  async function buildMutationPackageEnvelope(packageOrId, senderEvidence) {
    const record = await resolveMutationPackageRecord(packageOrId);
    const validation = await validateMutationPackage(record);
    if (!validation || validation.ok !== true) return validation;
    const evidence = internal.isPlainObject(senderEvidence) ? senderEvidence : {};
    const envelope = {
      schema: ENVELOPE_SCHEMA,
      version: SCHEMA_VERSION,
      componentId: "REPOSITORY-010",
      transportMode: "explicit-file-transfer",
      senderEvidence: {
        runtimeVersion: internal.text(evidence.runtimeVersion, VERSION_MANIFEST.release.version),
        sourceNodeId: internal.text(evidence.sourceNodeId, record.sourceNodeId),
        userAgent: internal.text(evidence.userAgent, global.navigator && global.navigator.userAgent || "unknown"),
        platform: internal.text(evidence.platform, global.navigator && global.navigator.platform || "unknown"),
        origin: internal.text(evidence.origin, global.location && global.location.origin || "unknown"),
        exportedAt: internal.nowIso(),
        realDeviceClaim: internal.text(evidence.realDeviceClaim, /Android/i.test(global.navigator && global.navigator.userAgent || "") ? "android" : "unspecified")
      },
      mutationPackage: record,
      canonicalMutationRequested: false,
      syncEngineRequested: false,
      immutable: true,
      envelopeHashAlgorithm: "SHA-256",
      envelopeHash: ""
    };
    const payload = internal.clone(envelope);
    payload.envelopeHash = "";
    envelope.envelopeHash = await sha256(stableStringify(payload));
    return internal.buildResult(true, "REPOSITORY010_MUTATION_PACKAGE_ENVELOPE_READY", "Ready", { envelope: envelope });
  }

  function downloadJson(filename, value) {
    if (!global.document || typeof Blob === "undefined" || !global.URL || typeof global.URL.createObjectURL !== "function") return false;
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = global.URL.createObjectURL(blob);
    const a = global.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    global.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function revoke() { global.URL.revokeObjectURL(url); }, 0);
    return true;
  }

  async function downloadMutationPackageEnvelope(packageOrId, senderEvidence) {
    const built = await buildMutationPackageEnvelope(packageOrId, senderEvidence);
    if (!built || built.ok !== true) return built;
    const record = built.data.envelope.mutationPackage;
    const filename = "REPOSITORY-010_MUTATION_" + record.mutationPackageId + ".json";
    if (!downloadJson(filename, built.data.envelope)) return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_DOWNLOAD_UNAVAILABLE", "Blocked", null);
    return internal.buildResult(true, "REPOSITORY010_MUTATION_PACKAGE_ENVELOPE_EXPORTED", "Exported", { filename: filename, envelope: built.data.envelope });
  }

  async function receiveMutationPackageEnvelope(envelope, options) {
    const data = internal.isPlainObject(envelope) ? envelope : {};
    const opts = internal.isPlainObject(options) ? options : {};
    const reasons = [];
    if (data.schema !== ENVELOPE_SCHEMA || data.version !== SCHEMA_VERSION || data.componentId !== "REPOSITORY-010") reasons.push("envelope-schema-invalid");
    if (data.transportMode !== "explicit-file-transfer") reasons.push("transport-mode-invalid");
    if (!internal.isPlainObject(data.senderEvidence)) reasons.push("sender-evidence-missing");
    if (opts.requireAndroidSender === true && !/Android/i.test(internal.text(data.senderEvidence && data.senderEvidence.userAgent, ""))) reasons.push("android-sender-required");
    if (opts.requireAndroidSender === true && internal.text(data.senderEvidence && data.senderEvidence.realDeviceClaim, "") !== "android") reasons.push("android-real-device-claim-required");
    try {
      const payload = internal.clone(data);
      payload.envelopeHash = "";
      const calculated = await sha256(stableStringify(payload));
      if (!isSha256(data.envelopeHash) || calculated !== data.envelopeHash) reasons.push("envelope-hash-mismatch");
    } catch (_) { reasons.push("envelope-hash-validation-failed"); }

    const packageValidation = await validateMutationPackage(data.mutationPackage);
    if (!packageValidation || packageValidation.ok !== true) reasons.push("mutation-package-invalid");
    const currentEnvelope = state.lastV2TransferEnvelope;
    const currentTransfer = currentEnvelope && internal.isPlainObject(currentEnvelope.transferPackage) ? currentEnvelope.transferPackage : null;
    const receipt = state.lastV2TransferReceipt;
    const mutationPackage = data.mutationPackage;
    if (!currentTransfer || !receipt) reasons.push("current-v2-lineage-required");
    if (currentTransfer && mutationPackage) {
      if (mutationPackage.transferPackageId !== currentTransfer.transferPackageId) reasons.push("transfer-package-id-mismatch");
      if (mutationPackage.sourceTransferPackageHash !== currentTransfer.packageHash) reasons.push("transfer-package-hash-mismatch");
      if (mutationPackage.candidateId !== currentTransfer.syncCandidateId) reasons.push("candidate-id-mismatch");
      if (mutationPackage.candidateRevisionId !== currentTransfer.revisionId) reasons.push("candidate-revision-mismatch");
      if (mutationPackage.baseRevisionId !== currentTransfer.baseRevisionId) reasons.push("base-revision-mismatch");
    }
    if (receipt && mutationPackage) {
      if (mutationPackage.transferPackageId !== receipt.transferPackageId || mutationPackage.sourceTransferPackageHash !== receipt.packageHash) reasons.push("v2-receipt-lineage-mismatch");
    }

    if (reasons.length) {
      state.mutationPackageStatus = "Blocked";
      state.lastMutationPackageValidation = { valid: false, reasons: reasons, validatedAt: internal.nowIso() };
      internal.touch();
      return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_ENVELOPE_BLOCKED", "Blocked", { reasons: reasons, packageValidation: packageValidation });
    }

    const created = namespace.createMutationPackageDescriptor(mutationPackage);
    if (!created || created.ok !== true) return created;
    state.lastMutationPackage = internal.clone(created.data.record);
    state.mutationPackageStatus = "Received / Integrity Validated";
    state.lastMutationPackageValidation = {
      valid: true,
      mutationPackageId: mutationPackage.mutationPackageId,
      envelopeHash: data.envelopeHash,
      senderEvidence: internal.clone(data.senderEvidence),
      v2LineageMatch: true,
      validatedAt: internal.nowIso()
    };
    internal.touch();
    namespace.modules.mutationPackage.status = "Received / Integrity Validated";
    return internal.buildResult(true, "REPOSITORY010_MUTATION_PACKAGE_RECEIVED", "Validated", {
      mutationPackage: internal.clone(created.data.record),
      allowedMutationSet: internal.clone(created.data.record.allowedMutationSet),
      senderEvidence: internal.clone(data.senderEvidence),
      v2LineageMatch: true,
      canonicalMutationPerformed: false,
      authorityEffect: "none"
    });
  }

  async function receiveMutationPackageFile(file, options) {
    if (!file || typeof file.text !== "function") return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_FILE_REQUIRED", "Blocked", null);
    try {
      const envelope = JSON.parse(await file.text());
      const opts = Object.assign({}, internal.isPlainObject(options) ? options : {}, { fileName: internal.text(file.name, "mutation-package.json") });
      return receiveMutationPackageEnvelope(envelope, opts);
    } catch (error) {
      return internal.buildResult(false, "REPOSITORY010_MUTATION_PACKAGE_FILE_INVALID", "Blocked", null, { error: { message: error && error.message ? error.message : String(error), category: "Mutation Package" } });
    }
  }

  function phase11ReadOnlyBridgeFixture() {
    return "REPOSITORY010_PHASE11_READ_ONLY_BEFORE";
  }

  function getMutationPackageStatus() {
    return {
      status: state.mutationPackageStatus || "Ready",
      phase: 11,
      strategy: STRATEGY,
      hybridArchitectureSupported: true,
      smallestSafeMutationFirst: true,
      enabledMutationTypes: ENABLED_TYPES.slice(),
      fallbackMutationTypes: FALLBACK_TYPES.slice(),
      fullFileReplacementEnabled: false,
      multiFileZipMutationEnabled: false,
      ide150BridgeMode: "read-only-compatibility-adapter",
      mutationPackagePersistenceImplemented: true,
      mutationPackageReloadRecoveryImplemented: true,
      canonicalMutationImplemented: false,
      controlledTransactionImplemented: false,
      v5PostReflectionVerificationImplemented: false,
      syncEngineImplemented: false,
      lastMutationPackage: internal.clone(state.lastMutationPackage || null),
      lastValidation: internal.clone(state.lastMutationPackageValidation || null)
    };
  }

  Object.assign(namespace.api, {
    prepareHybridMutationPackage: prepareHybridMutationPackage,
    validateMutationPackage: validateMutationPackage,
    buildMutationPackageEnvelope: buildMutationPackageEnvelope,
    downloadMutationPackageEnvelope: downloadMutationPackageEnvelope,
    receiveMutationPackageEnvelope: receiveMutationPackageEnvelope,
    receiveMutationPackageFile: receiveMutationPackageFile,
    getMutationPackageStatus: getMutationPackageStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.mutationPackage = {
    id: "REPOSITORY-010-HYBRID-MUTATION-PACKAGE",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 11,
    strategy: STRATEGY,
    hybridArchitectureSupported: true,
    smallestSafeMutationFirst: true,
    enabledMutationTypes: ENABLED_TYPES.slice(),
    fallbackMutationTypes: FALLBACK_TYPES.slice(),
    mutationPackagePersistenceImplemented: true,
    mutationPackageReloadRecoveryImplemented: true,
    canonicalMutationImplemented: false,
    controlledTransactionImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.prepareLocalFirstRepositoryHybridMutationPackage = prepareHybridMutationPackage;
  global.downloadLocalFirstRepositoryMutationPackageEnvelope = downloadMutationPackageEnvelope;
  global.receiveLocalFirstRepositoryMutationPackageFile = receiveMutationPackageFile;
  global.getLocalFirstRepositoryMutationPackageStatus = getMutationPackageStatus;
})(typeof window !== "undefined" ? window : globalThis);
