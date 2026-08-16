/* ============================================================
   FILE: 13_local_first_repository_phase13_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.12.0 / Module: Phase 13 Validation 1.0.2
   Phase 13: Persistent Canonical Reflection / V5 Gate
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase13Validation");

  function summarize(checks) {
    const passed = checks.filter(function f(x) { return x.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function f(x) { return !x.passed && x.severity === "Critical"; }).length;
    return {
      id: "REPOSITORY-010-PHASE13-VALIDATION",
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: "Phase 13 Persistent Canonical Reflection / V5",
      passed: passed, failed: failed, total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "REPOSITORY-010 Phase 13 Pre-Device Validation PASS" : "REPOSITORY-010 Phase 13 Pre-Device Validation FAIL",
      releaseAllowed: failed === 0,
      phase13ReadyForRealDeviceValidation: failed === 0,
      checks: checks,
      validatedAt: internal.nowIso()
    };
  }

  function runLocalFirstRepositoryPhase13Validation() {
    const checks = [];
    function check(name, condition, actual, category, severity) { checks.push({ name: name, passed: Boolean(condition), actual: internal.clone(actual), category: category, severity: severity || "Critical" }); }
    const impl = VERSION_MANIFEST.implementation || {};
    const writeAdapter = namespace.getRestrictedDesktopWriteAdapterStatus ? namespace.getRestrictedDesktopWriteAdapterStatus() : null;
    const closure = namespace.getReflectionIntegrityClosureStatus ? namespace.getReflectionIntegrityClosureStatus() : null;
    const reflection = namespace.getPersistentCanonicalReflectionStatus ? namespace.getPersistentCanonicalReflectionStatus() : null;

    check("Release version is 1.12.0", VERSION_MANIFEST.release.version === "1.12.0", VERSION_MANIFEST.release.version, "Version");
    check("Decision-008 is frozen baseline", Array.isArray(VERSION_MANIFEST.release.decisionIds) && VERSION_MANIFEST.release.decisionIds.indexOf("REPOSITORY-010-DECISION-008") !== -1, VERSION_MANIFEST.release.decisionIds, "Architecture");
    check("Reflection Closure API available", typeof namespace.deriveReflectionIntegrityClosure === "function", typeof namespace.deriveReflectionIntegrityClosure, "API");
    check("Persistent Reflection API available", typeof namespace.executePersistentCanonicalReflection === "function", typeof namespace.executePersistentCanonicalReflection, "API");
    check("Phase 12 transaction persistence preserved", typeof namespace.putControlledTransactionRecord === "function" && typeof namespace.getControlledTransactionRecord === "function", true, "Persistence");
    check("Phase 12 mechanics connected internally", Boolean(internal.phase12ControlledTransactionMechanics), Boolean(internal.phase12ControlledTransactionMechanics), "Connection");
    check("Restricted Desktop Write adapter connected", Boolean(internal.phase12DesktopWriteAdapter), Boolean(internal.phase12DesktopWriteAdapter), "Connection");
    check("Unrestricted public write API remains prohibited", Boolean(writeAdapter && writeAdapter.unrestrictedWriteApiExposed === false && writeAdapter.arbitraryFileCreateAllowed === false && writeAdapter.arbitraryFileDeleteAllowed === false), writeAdapter, "Safety");
    check("Accepted mutation remains function-patch only", Boolean(closure && closure.functionPatchOnly !== false && reflection && reflection.functionPatchOnly === true), { closure: closure, reflection: reflection }, "Scope");
    check("Closure is deterministic only", Boolean(closure && closure.deterministicOnly === true && closure.timestampWinnerUsed === false && closure.authorityScoringUsed === false && closure.trustScoringUsed === false && closure.conflictScoringUsed === false), closure, "Decision-008");
    check("Manifest/index closure write is transaction-bound internal API", Boolean(internal.phase12DesktopWriteAdapter && typeof internal.phase12DesktopWriteAdapter.executeBoundClosureWrite === "function" && typeof internal.phase12DesktopWriteAdapter.executeBoundClosureRestore === "function"), true, "Write Boundary");
    check("V5 full verification API is internal and required", Boolean(internal.phase12DesktopWriteAdapter && typeof internal.phase12DesktopWriteAdapter.runV5PostReflectionVerification === "function" && reflection && reflection.v5Required === true), true, "V5");
    check("V5 failure rollback is required", Boolean(reflection && reflection.automaticRollbackOnV5Failure === true), reflection, "Rollback");
    check("Persistent reflection is implemented", impl.persistentCanonicalReflectionImplemented === true, impl.persistentCanonicalReflectionImplemented, "Implementation");
    check("V5 post-reflection verification is implemented", impl.v5PostReflectionVerificationImplemented === true, impl.v5PostReflectionVerificationImplemented, "Implementation");
    check("Controlled canonical transaction is implemented", impl.controlledCanonicalTransactionImplemented === true, impl.controlledCanonicalTransactionImplemented, "Implementation");
    check("Canonical Revision promotion remains explicit", impl.automaticCanonicalRevisionPromotionEnabled === false && impl.canonicalRevisionPromotionImplemented === false, { auto: impl.automaticCanonicalRevisionPromotionEnabled, implemented: impl.canonicalRevisionPromotionImplemented }, "Authority");
    check("Sync Engine remains out of Phase 13", impl.syncEngineImplemented === false, impl.syncEngineImplemented, "Boundary");
    check("Direct Repository mutation remains prohibited", VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety && VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Safety");

    const result = summarize(checks);
    state.lastPhase13Validation = internal.clone(result);
    state.phase13ValidationStatus = result.status;
    internal.touch();
    return result;
  }


  async function runLocalFirstRepositoryPhase13CrossDeviceValidation() {
    const checks = [];
    function check(name, condition, actual, category, severity) {
      checks.push({ name: name, passed: Boolean(condition), actual: internal.clone(actual), category: category, severity: severity || "Critical" });
    }
    const reflection = state.lastPersistentReflection || null;
    const mutation = state.lastMutationPackage || null;
    const sender = state.lastMutationPackageValidation && state.lastMutationPackageValidation.senderEvidence;
    const baseline = state.lastCanonicalBaseline || null;
    const v4 = state.lastV4TargetValidationEvidence || null;
    const bridge = state.lastIDE150BridgeEvidence || null;
    const pcReal = /Windows/i.test(String(global.navigator && global.navigator.userAgent || ""));
    const androidReal = Boolean(sender && /Android/i.test(String(sender.userAgent || "")) && sender.realDeviceClaim === "android");

    check("Phase 13 pre-device validation passes", Boolean(state.lastPhase13Validation && state.lastPhase13Validation.failed === 0), state.lastPhase13Validation, "Pre-Device");
    check("Receiver runtime is PC real environment", pcReal, { userAgent: global.navigator && global.navigator.userAgent, platform: global.navigator && global.navigator.platform }, "PC Real Environment");
    check("Android Mutation Package sender evidence is present", androidReal, sender, "Android Real Environment");
    check("Explicit Canonical Baseline is current", Boolean(baseline && baseline.explicitlyEstablished === true && baseline.integrityStatus === "verified"), baseline, "Canonical Baseline");
    check("V4 Target Environment is stable", Boolean(v4 && v4.v4TargetEnvironmentValidated === true && v4.blockingTargetDrift === false), v4, "V4");
    check("Mutation Package remains one function-patch and V2-bound", Boolean(mutation && mutation.mutationCount === 1 && mutation.mutationSet && mutation.mutationSet[0] && mutation.mutationSet[0].mutationType === "function-patch" && state.lastMutationPackageValidation && state.lastMutationPackageValidation.v2LineageMatch === true), { mutationPackage: mutation, validation: state.lastMutationPackageValidation }, "Mutation");
    check("IDE-150 read-only Bridge target match remains valid", Boolean(bridge && bridge.repositoryWriteAttempted === false && bridge.targetValidationResults && bridge.targetValidationResults.every(function each(item) { return item.valid === true; })), bridge, "IDE-150 Bridge");
    check("Persistent Reflection performed physical target write", Boolean(reflection && reflection.physicalWritePerformed === true), reflection, "Persistent Reflection");
    check("Reflection Closure wrote Manifest and index", Boolean(reflection && reflection.closureWritePerformed === true), reflection, "Reflection Closure");
    check("Read-after-write verification passed", Boolean(reflection && reflection.readbackVerified === true), reflection, "Readback");
    check("V5 Post-Reflection Verification passed", Boolean(reflection && reflection.v5PostReflectionVerified === true), reflection, "V5");
    check("Controlled Canonical Transaction is implemented", Boolean(reflection && reflection.controlledCanonicalTransactionImplemented === true), reflection, "Transaction");
    check("Persistent reflection remains in Repository", Boolean(reflection && reflection.persistentReflectionPerformed === true && reflection.repositoryRestored === false), reflection, "Canonical Repository");
    check("Transaction reached V5 verified / awaiting baseline promotion", Boolean(reflection && reflection.status === "V5_VERIFIED_AWAITING_BASELINE_PROMOTION"), reflection && reflection.status, "Terminal State");
    check("Canonical Revision was not automatically promoted", Boolean(reflection && reflection.canonicalRevisionPromoted === false), reflection && reflection.canonicalRevisionPromoted, "Authority");
    check("Sync Engine was not invoked", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety");

    const passed = checks.filter(function each(x) { return x.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function each(x) { return !x.passed && x.severity === "Critical"; }).length;
    const result = {
      id: "REPOSITORY-010-PHASE13-CROSSDEVICE-VALIDATION",
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: "Phase 13 Persistent Canonical Reflection / V5 Real Device",
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0,
      criticalFailed: criticalFailed,
      status: failed === 0 ? "REPOSITORY-010 Phase 13 Real Device Validation PASS" : "REPOSITORY-010 Phase 13 Real Device Validation FAIL",
      releaseAllowed: failed === 0,
      phase13Complete: failed === 0,
      pcRealDevice: pcReal,
      androidSenderRealDevice: androidReal,
      crossDeviceRealValidation: pcReal && androidReal,
      v5PostReflectionVerification: Boolean(reflection && reflection.v5PostReflectionVerified === true),
      persistentReflectionPerformed: Boolean(reflection && reflection.persistentReflectionPerformed === true),
      canonicalRevisionPromoted: false,
      syncEngineImplemented: false,
      checks: checks,
      validatedAt: internal.nowIso()
    };
    state.lastPhase13CrossDeviceValidation = internal.clone(result);
    state.phase13CrossDeviceValidationStatus = result.status;
    internal.touch();
    return result;
  }

  async function launchLocalFirstRepositoryPhase13Validation() {
    const initialization = typeof namespace.initialize === "function"
      ? namespace.initialize()
      : null;
    if (!initialization || initialization.ok !== true) {
      return internal.buildResult(false, "REPOSITORY010_PHASE13_FOUNDATION_INITIALIZATION_BLOCKED", "Blocked", {
        initialization: initialization
      });
    }

    const pre = runLocalFirstRepositoryPhase13Validation();
    if (!pre || pre.failed > 0 || !global.document || !global.document.body) {
      return internal.buildResult(false, "REPOSITORY010_PHASE13_PREDEVICE_BLOCKED", "Blocked", {
        initialization: initialization,
        preDeviceValidation: pre
      });
    }

    const revisionSuggestion = typeof namespace.getCanonicalRevisionSuggestion === "function"
      ? await namespace.getCanonicalRevisionSuggestion()
      : null;
    const revisionSuggestionData = revisionSuggestion && revisionSuggestion.ok === true && revisionSuggestion.data
      ? revisionSuggestion.data
      : {};
    const lastEstablishedCanonicalRevisionId = internal.text(
      revisionSuggestionData.lastEstablishedCanonicalRevisionId,
      ""
    );
    const suggestedCanonicalRevisionId = internal.text(
      revisionSuggestionData.nextCanonicalRevisionCandidate,
      ""
    );

    const required = [
      "selectAndScanDesktopRepository",
      "establishExplicitCanonicalBaseline",
      "receiveV2TransferFile",
      "evaluateV3BaseRevision",
      "scanDesktopRepositoryDirectory",
      "evaluateV4TargetEnvironment",
      "receiveMutationPackageFile",
      "validateMutationPackageAgainstDesktopTarget",
      "issueManualAcceptanceToken",
      "selectRestrictedDesktopWriteDirectory",
      "executePersistentCanonicalReflection"
    ];
    const missing = required.filter(function each(name) { return typeof namespace[name] !== "function"; });
    if (missing.length) return internal.buildResult(false, "REPOSITORY010_PHASE13_VALIDATION_API_MISSING", "Blocked", { missingApis: missing });

    const old = global.document.getElementById("repository010Phase13Panel");
    if (old) old.remove();

    const panel = global.document.createElement("div");
    panel.id = "repository010Phase13Panel";
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "2147483647";
    panel.style.width = "410px";
    panel.style.maxHeight = "88vh";
    panel.style.overflow = "auto";
    panel.style.background = "#111827";
    panel.style.color = "#f9fafb";
    panel.style.border = "1px solid #374151";
    panel.style.borderRadius = "10px";
    panel.style.padding = "12px";
    panel.style.font = "13px/1.45 sans-serif";
    panel.style.boxShadow = "0 8px 30px rgba(0,0,0,.45)";

    const title = global.document.createElement("div");
    title.textContent = "REPOSITORY-010 Phase 13 Persistent Reflection / V5";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";

    const status = global.document.createElement("div");
    status.textContent = "Step 1: PC RepositoryをRead-only検証してください。";
    status.style.marginBottom = "8px";

    function button(label) {
      const b = global.document.createElement("button");
      b.textContent = label;
      b.style.display = "block";
      b.style.marginBottom = "8px";
      b.style.width = "100%";
      return b;
    }

    const scanButton = button("1. PC RepositoryをRead-only検証");

    const baselineContext = global.document.createElement("div");
    baselineContext.textContent = lastEstablishedCanonicalRevisionId
      ? "最後の確立済みCanonical Revision: " + lastEstablishedCanonicalRevisionId + " / 次候補: " + suggestedCanonicalRevisionId
      : "最後の確立済みCanonical Revisionを自動特定できません。Project Ownerが確認してください。";
    baselineContext.style.marginBottom = "6px";
    baselineContext.style.opacity = "0.9";

    const revisionInput = global.document.createElement("input");
    revisionInput.type = "text";
    revisionInput.value = suggestedCanonicalRevisionId;
    revisionInput.placeholder = "Project OwnerがCanonical Revisionを確認 / 入力";
    revisionInput.style.width = "100%";
    revisionInput.style.boxSizing = "border-box";
    revisionInput.style.marginBottom = "6px";
    revisionInput.disabled = true;

    const baselineButton = button("2. Project Ownerとして次Baselineを確立"); baselineButton.disabled = true;
    const v2Button = button("3. Android V2 JSON → V2/V3評価"); v2Button.disabled = true;
    const v4Button = button("4. V4 Targetを直前再検証"); v4Button.disabled = true;
    const mutationButton = button("5. Android Mutation JSON → IDE-150 Bridge"); mutationButton.disabled = true;
    const tokenButton = button("6. Project Owner Manual Token発行"); tokenButton.disabled = true;
    const writeDirButton = button("7. 同じPC RepositoryをRestricted Read-Writeで選択"); writeDirButton.disabled = true;
    const reflectButton = button("8. REAL Persistent Reflection → Closure → V5"); reflectButton.disabled = true;

    const note = global.document.createElement("div");
    note.textContent = "⚠ Step 8はPC Canonical Repositoryを実際に変更し、V5 PASS時は変更を残します。V5/Write Failure時のみ自動Rollbackします。Canonical Revisionの自動昇格とSync Engine実行は行いません。";
    note.style.opacity = "0.9";
    note.style.marginTop = "6px";

    const v2Input = global.document.createElement("input");
    v2Input.type = "file"; v2Input.accept = ".json,application/json"; v2Input.style.display = "none";
    const mutationInput = global.document.createElement("input");
    mutationInput.type = "file"; mutationInput.accept = ".json,application/json"; mutationInput.style.display = "none";

    scanButton.addEventListener("click", async function () {
      status.textContent = "PC RepositoryをRead-only検証中...";
      const scan = await namespace.selectAndScanDesktopRepository();
      console.log(JSON.stringify(scan, null, 2));
      if (scan && scan.ok === true) {
        status.textContent = "Read-only VERIFIED。Step 2へ。";
        revisionInput.disabled = false;
        baselineButton.disabled = false;
      } else status.textContent = "Read-only BLOCKED: " + (scan && scan.code || "unknown");
    });

    baselineButton.addEventListener("click", function () {
      const result = namespace.establishExplicitCanonicalBaseline({
        canonicalRevisionId: revisionInput.value,
        explicitProjectOwnerAction: true
      });
      console.log(JSON.stringify(result, null, 2));
      if (result && result.ok === true) {
        status.textContent = "Canonical Baseline ESTABLISHED。Step 3へ。";
        revisionInput.disabled = true;
        baselineButton.disabled = true;
        v2Button.disabled = false;
      } else status.textContent = "Baseline BLOCKED: " + (result && result.code || "unknown");
    });

    v2Button.addEventListener("click", function () { v2Input.value = ""; v2Input.click(); });
    v2Input.addEventListener("change", async function () {
      const file = v2Input.files && v2Input.files[0];
      if (!file) return;
      status.textContent = "V2 → V3評価中...";
      const received = await namespace.receiveV2TransferFile(file, { requireAndroidSender: true });
      if (!received || received.ok !== true) {
        status.textContent = "V2 BLOCKED";
        console.log(JSON.stringify(received, null, 2));
        return;
      }
      const v3 = namespace.evaluateV3BaseRevision(received.data.receipt, state.lastCanonicalBaseline);
      console.log(JSON.stringify({ received: received, v3: v3 }, null, 2));
      if (!v3 || v3.ok !== true || !v3.data || v3.data.baseRevisionMatch !== true || v3.data.blockingConflict === true) {
        status.textContent = "V3 BLOCKED / CONFLICT";
        return;
      }
      status.textContent = "V3 BASE MATCH。Step 4へ。";
      v4Button.disabled = false;
    });

    v4Button.addEventListener("click", async function () {
      status.textContent = "V4 Targetを再検証中...";
      const fresh = await namespace.scanDesktopRepositoryDirectory();
      if (!fresh || fresh.ok !== true) {
        status.textContent = "V4 Scan BLOCKED";
        console.log(JSON.stringify(fresh, null, 2));
        return;
      }
      const v4 = namespace.evaluateV4TargetEnvironment(state.lastV3ConflictEvidence, state.lastCanonicalBaseline, fresh.data);
      console.log(JSON.stringify({ freshScan: fresh, v4: v4 }, null, 2));
      if (!v4 || v4.ok !== true || !v4.data || v4.data.v4TargetEnvironmentValidated !== true || v4.data.blockingTargetDrift === true) {
        status.textContent = "V4 BLOCKED / DRIFT";
        return;
      }
      status.textContent = "V4 TARGET STABLE。Step 5へ。";
      mutationButton.disabled = false;
    });

    mutationButton.addEventListener("click", function () { mutationInput.value = ""; mutationInput.click(); });
    mutationInput.addEventListener("change", async function () {
      const file = mutationInput.files && mutationInput.files[0];
      if (!file) return;
      status.textContent = "Mutation Package / IDE-150 Bridge検証中...";
      const received = await namespace.receiveMutationPackageFile(file, { requireAndroidSender: true });
      if (!received || received.ok !== true) {
        status.textContent = "Mutation BLOCKED";
        console.log(JSON.stringify(received, null, 2));
        return;
      }
      const bridge = await namespace.validateMutationPackageAgainstDesktopTarget(received.data.mutationPackage);
      console.log(JSON.stringify({ mutationPackage: received, bridge: bridge }, null, 2));
      if (!bridge || bridge.ok !== true) {
        status.textContent = "IDE-150 Bridge BLOCKED";
        return;
      }
      status.textContent = "Mutation + Bridge VALID。Step 6へ。";
      tokenButton.disabled = false;
    });

    tokenButton.addEventListener("click", async function () {
      tokenButton.disabled = true;
      status.textContent = "Manual Acceptance Token発行中...";
      const pkg = state.lastMutationPackage;
      const token = pkg && Array.isArray(pkg.allowedMutationSet) && pkg.allowedMutationSet.length
        ? await namespace.issueManualAcceptanceToken({
            v4EvidenceId: state.lastV4TargetValidationEvidence && state.lastV4TargetValidationEvidence.v4EvidenceId,
            allowedMutationSet: pkg.allowedMutationSet,
            acceptedBy: "Project Owner",
            explicitProjectOwnerAction: true
          })
        : null;
      console.log(JSON.stringify(token, null, 2));
      if (!token || token.ok !== true) {
        status.textContent = "Token BLOCKED";
        tokenButton.disabled = false;
        return;
      }
      status.textContent = "Token ISSUED。Step 7で同じRepositoryをRead-Write選択。";
      writeDirButton.disabled = false;
    });

    writeDirButton.addEventListener("click", async function () {
      status.textContent = "Restricted Read-Write Repositoryを選択中...";
      const selected = await namespace.selectRestrictedDesktopWriteDirectory();
      console.log(JSON.stringify(selected, null, 2));
      if (!selected || selected.ok !== true) {
        status.textContent = "Read-Write selection BLOCKED";
        return;
      }
      status.textContent = "Restricted Read-Write GRANTED。Step 8は永続反映です。";
      reflectButton.disabled = false;
    });

    reflectButton.addEventListener("click", async function () {
      reflectButton.disabled = true;
      status.textContent = "REAL Persistent Reflection: Backup → Token Consume → Target Write → Closure → Readback → V5...";
      const result = await namespace.executePersistentCanonicalReflection({
        acceptanceTokenId: state.lastAcceptanceToken && state.lastAcceptanceToken.acceptanceTokenId,
        mutationPackageId: state.lastMutationPackage && state.lastMutationPackage.mutationPackageId
      });
      console.log(JSON.stringify(result, null, 2));
      if (!result || result.ok !== true) {
        status.textContent = result && result.data && result.data.repositoryRestored === true
          ? "Persistent Reflection BLOCKED / Repository RESTORED。ログ確認。"
          : "Persistent Reflection CRITICAL / ログ確認。";
        return;
      }
      const validation = await runLocalFirstRepositoryPhase13CrossDeviceValidation();
      status.textContent = validation.releaseAllowed === true
        ? "Phase 13 PASS：Persistent Reflection + Closure + V5完了。Baseline Promotion待ち。"
        : "Phase 13 BLOCKED：Final Real Device Gate不一致。";
      console.log(JSON.stringify({ persistentReflection: result, validation: validation, status: namespace.getStatus() }, null, 2));
    });

    [title, status, scanButton, baselineContext, revisionInput, baselineButton, v2Button, v4Button, mutationButton, tokenButton, writeDirButton, reflectButton, note, v2Input, mutationInput]
      .forEach(function append(item) { panel.appendChild(item); });
    global.document.body.appendChild(panel);

    return internal.buildResult(true, "REPOSITORY010_PHASE13_VALIDATION_UI_READY", "Ready", {
      initialization: initialization,
      preDeviceValidation: pre,
      lastEstablishedCanonicalRevisionId: lastEstablishedCanonicalRevisionId || null,
      canonicalRevisionSuggested: suggestedCanonicalRevisionId || null,
      canonicalRevisionSuggestionSource: internal.text(revisionSuggestionData.suggestionSource, "unresolved"),
      projectOwnerConfirmationRequired: true,
      automaticCanonicalRevisionPromotion: false,
      requiresFreshAndroidV2AndMutationPackage: true,
      realPhysicalWriteStep: 8,
      persistentReflectionLeavesChangeOnV5Pass: true,
      automaticRollbackOnV5Failure: true,
      canonicalRevisionPromotionImplemented: false,
      syncEngineImplemented: false
    });
  }

  function getLocalFirstRepositoryPhase13ValidationStatus() {
    return internal.clone(state.lastPhase13Validation || { status: "Not Run", moduleVersion: MODULE_VERSION, phase: 13 });
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase13Validation: runLocalFirstRepositoryPhase13Validation,
    getLocalFirstRepositoryPhase13ValidationStatus: getLocalFirstRepositoryPhase13ValidationStatus
  });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase13Validation = { id: "REPOSITORY-010-PHASE13-VALIDATION", version: MODULE_VERSION, status: "Loaded", phase: 13, loadedAt: internal.nowIso() };
  global.runLocalFirstRepositoryPhase13Validation = runLocalFirstRepositoryPhase13Validation;
  global.runLocalFirstRepositoryPhase13CrossDeviceValidation = runLocalFirstRepositoryPhase13CrossDeviceValidation;
  global.launchLocalFirstRepositoryPhase13Validation = launchLocalFirstRepositoryPhase13Validation;
})(typeof window !== "undefined" ? window : globalThis);
