/* ============================================================
   FILE: 18_self_development_phase5_dashboard.js
   Decision 058 Phase 5A / Controlled Live Trial UI
   Candidate Hotfix: 0.5.3
   - Replaces the prior read-only-only Phase 5 dashboard behavior.
   - Reuses REPOSITORY-010; does not implement a second mutation engine.
   - Persistent reflection / baseline promotion remain unavailable.
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;

  let mounted = false;
  let panel = null;
  let statusNode = null;
  let logNode = null;
  let session = {
    mutationPackage: null,
    acceptanceToken: null,
    lastTrial: null,
    localLineage: null,
    androidPcVerification: null
  };

  function repo() { return global.REPOSITORY010LocalFirstRepository || null; }
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }
  function writeLog(title, value) {
    if (!logNode) return;
    let payload;
    try { payload = JSON.stringify(value, null, 2); } catch (_) { payload = String(value); }
    logNode.textContent = title + "\n" + payload;
  }
  function lineageSnapshot() {
    const r = repo();
    const state = r && r.__internal && r.__internal.state ? r.__internal.state : null;
    const v4 = state && state.lastV4TargetValidationEvidence ? clone(state.lastV4TargetValidationEvidence) : null;
    const baseline = state && state.lastCanonicalBaseline ? clone(state.lastCanonicalBaseline) : null;
    const v3 = state && state.lastV3ConflictEvidence ? clone(state.lastV3ConflictEvidence) : null;
    const receipt = state && state.lastV2TransferReceipt ? clone(state.lastV2TransferReceipt) : null;
    const envelope = state && state.lastV2TransferEnvelope ? clone(state.lastV2TransferEnvelope) : null;
    const bridge = state && state.lastIDE150BridgeEvidence ? clone(state.lastIDE150BridgeEvidence) : null;
    const transferPackage = envelope && envelope.transferPackage ? envelope.transferPackage : null;
    const transferPackageId = (v4 && v4.transferPackageId) || (transferPackage && transferPackage.transferPackageId) || null;
    const bridgeValid = Boolean(bridge && bridge.repositoryWriteAttempted === false && Array.isArray(bridge.targetValidationResults) && bridge.targetValidationResults.length > 0 && bridge.targetValidationResults.every(function (item) { return item && item.valid === true; }));
    const preparationReady = Boolean(
      baseline && baseline.explicitlyEstablished === true && baseline.establishedBy === "Project Owner" && baseline.integrityStatus === "verified" &&
      v4 && v4.v4TargetEnvironmentValidated === true && v4.targetEnvironmentMatch === true && v4.blockingTargetDrift !== true &&
      v3 && v3.baseRevisionMatch === true && v3.blockingConflict !== true &&
      receipt && receipt.v2TransferIntegrityValidated === true &&
      transferPackage && transferPackage.integrityPreflightPassed === true && transferPackage.integrityPreflightStatus === "verified" &&
      transferPackageId
    );
    const ready = Boolean(preparationReady && bridgeValid);
    return {
      lineageMode: session.localLineage && session.localLineage.lineageMode || (preparationReady ? "LEGACY_OR_EXTERNAL_LINEAGE" : "NOT_READY"),
      androidSyncRequiredForPhase5A: false,
      ready: ready,
      preparationReady: preparationReady,
      bridgeReady: bridgeValid,
      transferPackageId: transferPackageId,
      v4EvidenceId: v4 && v4.v4EvidenceId || null,
      baselineId: baseline && (baseline.baselineId || baseline.canonicalRevisionId) || null,
      bridgeEvidenceId: bridge && (bridge.bridgeEvidenceId || bridge.evidenceId || null),
      missingForPreparation: [
        !baseline ? "canonical-baseline" : null,
        !v4 ? "pc-local-fresh-v4" : null,
        !v3 ? "pc-local-v3-evidence" : null,
        !receipt ? "pc-local-v2-integrity-receipt" : null,
        !transferPackage ? "pc-local-verified-transfer-package" : null
      ].filter(Boolean),
      missing: [
        !baseline ? "canonical-baseline" : null,
        !v4 ? "pc-local-fresh-v4" : null,
        !v3 ? "pc-local-v3-evidence" : null,
        !receipt ? "pc-local-v2-integrity-receipt" : null,
        !transferPackage ? "pc-local-verified-transfer-package" : null,
        !bridgeValid ? "ide150-read-only-bridge" : null
      ].filter(Boolean)
    };
  }

  namespace.getSelfDevelopmentPhase5Dashboard = function () {
    const readiness = namespace.inspectSelfDevelopmentPhase5LiveTrialReadiness();
    const line = lineageSnapshot();
    const writeStatus = readiness && readiness.restrictedWriteAdapterStatus || {};
    return {
      id: "SELF-DEVELOPMENT-058",
      version: "0.5.3",
      phase: 5,
      status: "Candidate / Local Trial Lineage UI",
      readOnlyDashboard: false,
      controlledTrialActionsAvailable: true,
      trialMode: "MANDATORY_ROLLBACK_ONLY",
      liveWritePlatform: "PC_DESKTOP_ONLY",
      androidLiveWriteAllowed: false,
      androidSyncRequiredForPhase5ATrial: false,
      liveTrialTarget: { file: "18_self_development_phase5_trial_fixture.js", functionName: "selfDevelopment058Phase5LiveTrialFixture", protectedControlPlane: false },
      readiness: readiness,
      lineage: line,
      repositoryDirectorySelected: writeStatus.directorySelected === true,
      armStatus: namespace.getSelfDevelopmentPhase5TrialArmStatus(),
      session: {
        mutationPackageId: session.mutationPackage && session.mutationPackage.mutationPackageId || null,
        acceptanceTokenId: session.acceptanceToken && session.acceptanceToken.acceptanceTokenId || null,
        lastTrial: session.lastTrial ? clone(session.lastTrial) : null,
        localLineage: session.localLineage ? clone(session.localLineage) : null,
        androidPcVerification: session.androidPcVerification ? clone(session.androidPcVerification) : null
      },
      persistentReflectionActionsAvailable: false,
      baselinePromotionActionsAvailable: false,
      hardBoundaries: global.SELFDEVELOPMENT058Phase5VersionManifest.hardBoundaries,
      coverage: namespace.getSelfDevelopmentPhase5Coverage(),
      updatedAt: Date.now()
    };
  };

  function addStyle() {
    if (!global.document || document.getElementById("selfdev058-phase5-ui-style")) return;
    const style = document.createElement("style");
    style.id = "selfdev058-phase5-ui-style";
    style.textContent = [
      "#selfdev058-phase5-launcher{position:fixed;right:62px;bottom:64px;z-index:1001;padding:9px 14px;border:1px solid #777;border-radius:999px;background:#263238;color:#fff;font-weight:700;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.28)}",
      "#selfdev058-phase5-panel{position:fixed;inset:0;z-index:2147483002;background:rgba(0,0,0,.58);display:none;align-items:flex-end;justify-content:center}",
      "#selfdev058-phase5-panel.open{display:flex}",
      ".selfdev058-p5-sheet{width:min(760px,100%);max-height:94vh;overflow:auto;background:var(--card,#fff);color:var(--text,#161616);border-radius:18px 18px 0 0;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".selfdev058-p5-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.selfdev058-p5-head h3{margin:0;font-size:20px}",
      ".selfdev058-p5-close{border:1px solid var(--border,#aaa);background:var(--card,#fff);color:var(--text,#161616);border-radius:10px;padding:7px 11px}",
      ".selfdev058-p5-card{border:1px solid var(--border,#ddd);border-radius:12px;padding:12px;margin:10px 0;background:var(--bg,#fafafa)}",
      ".selfdev058-p5-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}",
      ".selfdev058-p5-actions button{min-height:44px;border:1px solid var(--border,#999);border-radius:10px;background:var(--card,#fff);color:var(--text,#161616);padding:8px;font-weight:650}",
      ".selfdev058-p5-actions button.primary{background:var(--accent,#263238);color:#fff;border-color:var(--accent,#263238)}",
      ".selfdev058-p5-actions button.danger{border-width:2px}",
      ".selfdev058-p5-actions button:disabled{opacity:.42}",
      ".selfdev058-p5-note{font-size:12px;line-height:1.5;opacity:.8}",
      ".selfdev058-p5-status{font-size:14px;line-height:1.65}",
      ".selfdev058-p5-log{font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word;max-height:280px;overflow:auto;background:#111;color:#eee;border-radius:10px;padding:10px}",
      "body.dark .selfdev058-p5-actions button:not(.primary),body.dark .selfdev058-p5-close{background:#303134;color:#e8eaed;border-color:#5f6368}",
      "@media(max-width:540px){.selfdev058-p5-actions{grid-template-columns:1fr}.selfdev058-p5-sheet{padding:12px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function render() {
    if (!statusNode) return;
    const d = namespace.getSelfDevelopmentPhase5Dashboard();
    const arm = d.armStatus || {};
    const line = d.lineage || {};
    const ready = d.readiness || {};
    statusNode.innerHTML = [
      "<b>Mode:</b> MANDATORY ROLLBACK ONLY",
      "<br><b>Platform:</b> " + esc(ready.platform || "-"),
      "<br><b>Trial lineage:</b> " + (line.preparationReady ? "READY" : "BLOCKED") + " / " + esc(line.lineageMode || "NOT_READY") + (line.missingForPreparation && line.missingForPreparation.length ? " / " + esc(line.missingForPreparation.join(", ")) : ""),
      "<br><b>Android Sync required for this Trial:</b> NO",
      "<br><b>IDE-150 target bridge:</b> " + (line.bridgeReady ? "READY" : "PENDING (Mutation準備後)"),
      "<br><b>Repository folder:</b> " + (d.repositoryDirectorySelected ? "SELECTED" : "NOT SELECTED"),
      "<br><b>Arm:</b> " + (arm.armed ? "ACTIVE" : "OFF"),
      "<br><b>Mutation package:</b> " + esc(d.session.mutationPackageId || "未作成"),
      "<br><b>Acceptance token:</b> " + esc(d.session.acceptanceTokenId || "未発行"),
      "<br><b>Persistent Reflection:</b> DISABLED",
      "<br><b>Baseline Promotion:</b> DISABLED"
    ].join("");

    const btnLocalLineage = panel && panel.querySelector('[data-p5="local-lineage"]');
    const btnLocalLineageReceive = panel && panel.querySelector('[data-p5="local-lineage-receive"]');
    const btnAndroidVerify = panel && panel.querySelector('[data-p5="android-verify"]');
    const btnArm = panel && panel.querySelector('[data-p5="arm"]');
    const btnPrepare = panel && panel.querySelector('[data-p5="prepare"]');
    const btnToken = panel && panel.querySelector('[data-p5="token"]');
    const btnExecute = panel && panel.querySelector('[data-p5="execute"]');
    const active = arm.armed === true;
    const isAndroid = /Android/i.test(global.navigator && global.navigator.userAgent || "");
    if (btnLocalLineage) btnLocalLineage.disabled = isAndroid || active;
    if (btnLocalLineageReceive) btnLocalLineageReceive.disabled = isAndroid || active;
    if (btnAndroidVerify) btnAndroidVerify.disabled = !isAndroid || active;
    if (btnArm) btnArm.disabled = isAndroid || !(line.preparationReady && d.repositoryDirectorySelected) || active;
    if (btnPrepare) btnPrepare.disabled = !(active && line.preparationReady);
    if (btnToken) btnToken.disabled = !(active && line.ready && session.mutationPackage);
    if (btnExecute) btnExecute.disabled = !(active && line.ready && session.mutationPackage && session.acceptanceToken && d.repositoryDirectorySelected);
  }

  async function run(label, fn) {
    const buttons = panel ? panel.querySelectorAll("button[data-p5]") : [];
    buttons.forEach(function (button) { button.disabled = true; });
    writeLog(label, { status: "実行中" });
    try {
      const result = await fn();
      writeLog(label, result);
      render();
      return result;
    } catch (error) {
      const result = { ok: false, status: "Failed", message: error && error.message ? error.message : String(error) };
      writeLog(label, result);
      render();
      return result;
    } finally {
      render();
    }
  }

  function buildPanel() {
    const overlay = document.createElement("div");
    overlay.id = "selfdev058-phase5-panel";
    overlay.innerHTML = [
      '<div class="selfdev058-p5-sheet" role="dialog" aria-modal="true" aria-label="Self-Development Controlled Trial">',
      ' <div class="selfdev058-p5-head"><h3>Self-Development Controlled Trial</h3><button class="selfdev058-p5-close" type="button">×</button></div>',
      ' <div class="selfdev058-p5-card selfdev058-p5-status" id="selfdev058-phase5-status"></div>',
      ' <div class="selfdev058-p5-card">',
      '  <b>Phase 5A Safety Boundary</b>',
      '  <p class="selfdev058-p5-note">専用Fixture 1関数だけを一時変更し、Readback後に必ずRollbackします。Phase 5AのPC TrialはAndroid Sync不要です。Frozen V2境界を守るため、PCローカル検証Packageを一度保存し、その同じJSONをユーザーが選択して再読込します。Android照合は必要時だけ別ボタンでPackage生成します。Persistent ReflectionとCanonical PromotionはこのUIから実行できません。</p>',
      '  <div class="selfdev058-p5-actions">',
      '   <button type="button" data-p5="refresh">① Readiness更新</button>',
      '   <button type="button" data-p5="local-lineage">②A PC検証Packageを作成</button>',
      '   <button type="button" data-p5="local-lineage-receive">②B 作成したPackageを読み込む</button>',
      '   <button type="button" data-p5="directory">③ 書込対象フォルダ選択（同じAI_Prompt_OS）</button>',
      '   <button type="button" class="primary" data-p5="arm">④ Controlled TrialをArm</button>',
      '   <button type="button" data-p5="prepare">⑤ Safe Mutation準備</button>',
      '   <button type="button" data-p5="token">⑥ Acceptance Token発行</button>',
      '   <button type="button" class="primary danger" data-p5="execute">⑦ 実Write → Readback → Mandatory Rollback</button>',
      '   <button type="button" data-p5="audit">Evidence確認</button>',
      '   <button type="button" data-p5="android-verify">Android: PC照合用Packageを作成</button>',
      '  </div>',
      ' </div>',
      ' <div class="selfdev058-p5-card"><b>結果 / 詳細</b><div class="selfdev058-p5-log" id="selfdev058-phase5-log">Ready</div></div>',
      ' <p class="selfdev058-p5-note">Validation ≠ Approval / Token ≠ Mutation Authority / Android Live Write = OFF / Persistent Reflection = OFF / Baseline Promotion = OFF</p>',
      '</div>'
    ].join("\n");
    document.body.appendChild(overlay);
    return overlay;
  }

  function bind() {
    panel.querySelector(".selfdev058-p5-close").addEventListener("click", function () { panel.classList.remove("open"); });
    panel.addEventListener("click", function (event) { if (event.target === panel) panel.classList.remove("open"); });

    panel.querySelector('[data-p5="refresh"]').addEventListener("click", function () {
      writeLog("Readiness", namespace.getSelfDevelopmentPhase5Dashboard());
      render();
    });

    panel.querySelector('[data-p5="local-lineage"]').addEventListener("click", function () {
      return run("PC検証Packageを作成", async function () {
        if (typeof namespace.prepareSelfDevelopmentPhase5LocalTrialLineage !== "function") return { ok: false, status: "Blocked", message: "PC Local Trial Lineage export API is unavailable." };
        const result = await namespace.prepareSelfDevelopmentPhase5LocalTrialLineage();
        session.localLineage = result && result.data ? clone(result.data) : null;
        return result;
      });
    });

    panel.querySelector('[data-p5="local-lineage-receive"]').addEventListener("click", function () {
      return run("PC検証Packageを読み込む", async function () {
        if (typeof namespace.receiveSelfDevelopmentPhase5LocalTrialLineage !== "function") return { ok: false, status: "Blocked", message: "PC Local Trial Lineage receive API is unavailable." };
        const result = await namespace.receiveSelfDevelopmentPhase5LocalTrialLineage();
        if (result && result.ok === true && result.data) session.localLineage = clone(result.data);
        return result;
      });
    });

    panel.querySelector('[data-p5="android-verify"]').addEventListener("click", function () {
      return run("Android PC照合用Package", async function () {
        if (typeof namespace.exportSelfDevelopmentPhase5AndroidPcVerificationPackage !== "function") return { ok: false, status: "Blocked", message: "Android PC verification export API is unavailable." };
        const result = await namespace.exportSelfDevelopmentPhase5AndroidPcVerificationPackage();
        session.androidPcVerification = result && result.data ? clone(result.data) : clone(result);
        return result;
      });
    });

    panel.querySelector('[data-p5="directory"]').addEventListener("click", async function () {
      const r = repo();
      if (!r || typeof r.initializeRestrictedDesktopWriteAdapter !== "function" || typeof r.selectRestrictedDesktopWriteDirectory !== "function") {
        writeLog("Repositoryフォルダ選択", { ok: false, status: "Blocked", message: "Restricted Desktop Write Adapter is unavailable." });
        return;
      }
      const init = r.initializeRestrictedDesktopWriteAdapter();
      if (!init || init.ok !== true) { writeLog("Repositoryフォルダ選択", init); render(); return; }
      await run("Repositoryフォルダ選択", function () { return r.selectRestrictedDesktopWriteDirectory(); });
    });

    panel.querySelector('[data-p5="arm"]').addEventListener("click", function () {
      const phrase = global.prompt("Controlled TrialをArmします。次の確認文字列を入力してください。\n\nAUTHORIZE_PHASE5A_CONTROLLED_TRIAL", "");
      if (phrase == null) { writeLog("Arm", { ok: false, status: "Cancelled" }); return; }
      const result = namespace.armSelfDevelopmentPhase5LiveTrial({ actorRole: "Project Owner", explicitProjectOwnerAction: true, confirmationPhrase: phrase });
      if (result && result.ok === true) {
        session.mutationPackage = null;
        session.acceptanceToken = null;
        session.lastTrial = null;
      }
      writeLog("Arm", result);
      render();
    });

    panel.querySelector('[data-p5="prepare"]').addEventListener("click", function () {
      return run("Safe Mutation準備", async function () {
        const armStatus = namespace.getSelfDevelopmentPhase5TrialArmStatus();
        const line = lineageSnapshot();
        if (!armStatus.armed || !armStatus.arm || !line.preparationReady || !line.transferPackageId) return { ok: false, status: "Blocked", message: "Active Arm and complete base Repository lineage are required." };
        const result = await namespace.prepareSelfDevelopmentPhase5SafeMutationPackage({ armId: armStatus.arm.armId, transferPackageId: line.transferPackageId });
        const pkg = result && result.data && (result.data.mutationPackage || (result.data.repositoryResult && result.data.repositoryResult.data && result.data.repositoryResult.data.mutationPackage));
        if (result && result.ok === true && pkg) session.mutationPackage = clone(pkg);
        return result;
      });
    });

    panel.querySelector('[data-p5="token"]').addEventListener("click", function () {
      return run("Acceptance Token発行", async function () {
        const armStatus = namespace.getSelfDevelopmentPhase5TrialArmStatus();
        const line = lineageSnapshot();
        if (!armStatus.armed || !armStatus.arm || !session.mutationPackage || !line.v4EvidenceId) return { ok: false, status: "Blocked", message: "Active Arm, Mutation Package and V4 evidence are required." };
        const result = await namespace.issueSelfDevelopmentPhase5TrialAcceptanceToken({ armId: armStatus.arm.armId, mutationPackage: session.mutationPackage, v4EvidenceId: line.v4EvidenceId });
        const token = result && result.data && result.data.repositoryResult && result.data.repositoryResult.data && result.data.repositoryResult.data.acceptanceToken;
        if (result && result.ok === true && token) session.acceptanceToken = clone(token);
        return result;
      });
    });

    panel.querySelector('[data-p5="execute"]').addEventListener("click", function () {
      if (!global.confirm("専用Fixture 1関数に実Writeを行い、Readback後にMandatory Rollbackして元SHA-256へ復元します。\n\nPersistent Reflection / Baseline Promotionは実行しません。\n\nControlled Trialを実行しますか？")) {
        writeLog("Controlled Trial", { ok: false, status: "Cancelled", physicalWritePerformed: false });
        return;
      }
      return run("Controlled Trial", async function () {
        const armStatus = namespace.getSelfDevelopmentPhase5TrialArmStatus();
        if (!armStatus.armed || !armStatus.arm || !session.mutationPackage || !session.acceptanceToken) return { ok: false, status: "Blocked", message: "Active Arm, Mutation Package and Acceptance Token are required." };
        const result = await namespace.executeSelfDevelopmentPhase5ControlledTrial({
          armId: armStatus.arm.armId,
          acceptanceTokenId: session.acceptanceToken.acceptanceTokenId,
          mutationPackageId: session.mutationPackage.mutationPackageId,
          forceFailureAfterWrite: false
        });
        session.lastTrial = clone(result);
        return result;
      });
    });

    panel.querySelector('[data-p5="audit"]').addEventListener("click", function () {
      writeLog("Phase 5A Evidence", {
        dashboard: namespace.getSelfDevelopmentPhase5Dashboard(),
        audit: namespace.getSelfDevelopmentPhase5TrialAuditStatus()
      });
      render();
    });
  }

  function mountSelfDevelopmentPhase5TrialUI() {
    if (!global.document || !document.body) return { ok: false, status: "Blocked", message: "Document is unavailable." };
    if (mounted) return { ok: true, status: "Ready", mounted: true, launcherId: "selfdev058-phase5-launcher" };
    addStyle();
    const launcher = document.createElement("button");
    launcher.id = "selfdev058-phase5-launcher";
    launcher.type = "button";
    launcher.textContent = "SD Trial";
    document.body.appendChild(launcher);
    panel = buildPanel();
    statusNode = document.getElementById("selfdev058-phase5-status");
    logNode = document.getElementById("selfdev058-phase5-log");
    bind();
    launcher.addEventListener("click", function () {
      panel.classList.add("open");
      writeLog("Phase 5A", namespace.getSelfDevelopmentPhase5Dashboard());
      render();
    });
    mounted = true;
    render();
    return { ok: true, status: "Ready", mounted: true, launcherId: launcher.id, consolePasteRequiredForLiveTrial: false };
  }

  namespace.mountSelfDevelopmentPhase5TrialUI = mountSelfDevelopmentPhase5TrialUI;
  namespace.openSelfDevelopmentPhase5TrialUI = function () {
    const mountedResult = mountSelfDevelopmentPhase5TrialUI();
    if (panel) panel.classList.add("open");
    render();
    return mountedResult;
  };
  namespace.getSelfDevelopmentPhase5TrialUIStatus = function () {
    return {
      mounted: mounted,
      launcherPresent: Boolean(global.document && document.getElementById("selfdev058-phase5-launcher")),
      controlledTrialActionsAvailable: true,
      pcLocalTrialLineageAvailable: typeof namespace.prepareSelfDevelopmentPhase5LocalTrialLineage === "function",
      androidPcVerificationPackageAvailable: typeof namespace.exportSelfDevelopmentPhase5AndroidPcVerificationPackage === "function",
      androidSyncRequiredForPhase5ATrial: false,
      persistentReflectionActionsAvailable: false,
      baselinePromotionActionsAvailable: false,
      consolePasteRequiredForLiveTrial: false
    };
  };

  global.openSelfDevelopment058Phase5TrialUI = namespace.openSelfDevelopmentPhase5TrialUI;

  if (global.document) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountSelfDevelopmentPhase5TrialUI, { once: true });
    else mountSelfDevelopmentPhase5TrialUI();
  }
})(typeof window !== "undefined" ? window : globalThis);
