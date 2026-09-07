/* ============================================================
   FILE: 13_local_first_repository_guided_operations_ui.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.17.3 / Module: Guided Operations UI 1.0.3
   Phase 18: Console-free guided Repository workflow
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST || !global.document) {
    console.warn("REPOSITORY-010 Guided Operations UI blocked: dependencies are unavailable.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("guidedOperationsUi") || "1.0.0";
  let mounted = false;
  let panel = null;
  let statusNode = null;
  let logNode = null;
  let bootstrapNode = null;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function style() {
    if (document.getElementById("repository010-guided-style")) return;
    const node = document.createElement("style");
    node.id = "repository010-guided-style";
    node.textContent = [
      "#repository010-guided-launcher{position:fixed;right:62px;bottom:14px;z-index:1000;padding:10px 16px;border:1px solid #777;border-radius:999px;background:#202124;color:#fff;font-weight:700;font-size:14px;box-shadow:0 4px 18px rgba(0,0,0,.28)}",
      "#repository010-guided-panel{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.55);display:none;align-items:flex-end;justify-content:center}",
      "#repository010-guided-panel.open{display:flex}",
      ".repository010-guided-sheet{width:min(720px,100%);max-height:92vh;overflow:auto;background:var(--card,#fff);color:var(--text,#161616);border-radius:18px 18px 0 0;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".repository010-guided-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}",
      ".repository010-guided-head h3{margin:0;font-size:20px}",
      ".repository010-guided-close{border:1px solid var(--border,#aaa);background:var(--card,#fff);color:var(--text,#161616);border-radius:10px;padding:7px 11px;font-size:16px}",
      ".repository010-guided-card{border:1px solid var(--border,#ddd);border-radius:12px;padding:12px;margin:10px 0;background:var(--bg,#fafafa);color:var(--text,#161616)}",
      ".repository010-guided-status{font-size:14px;line-height:1.65;white-space:normal}",
      ".repository010-guided-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
      ".repository010-guided-actions button{min-height:44px;border:1px solid var(--border,#999);border-radius:10px;background:var(--card,#fff);color:var(--text,#161616);padding:8px;font-weight:650}",
      ".repository010-guided-actions button.primary{background:var(--accent,#202124);color:#fff;border-color:var(--accent,#202124)}",
      ".repository010-guided-actions button.danger{border-width:2px}",
      ".repository010-guided-actions button:disabled{opacity:.45}",
      ".repository010-guided-log{font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto;background:#111;color:#eee;border-radius:10px;padding:10px}",
      ".repository010-guided-note{font-size:12px;line-height:1.5;color:var(--text,#555);opacity:.78}",
      "body.dark .repository010-guided-actions button:not(.primary){background:#303134;color:#e8eaed;border-color:#5f6368}",
      "body.dark .repository010-guided-close{background:#303134;color:#e8eaed;border-color:#5f6368}",
      "@media(max-width:540px){.repository010-guided-actions{grid-template-columns:1fr}.repository010-guided-sheet{padding:12px}}"
    ].join("\n");
    document.head.appendChild(node);
  }

  function status() {
    try { return namespace.getGuidedRepositoryOperationsStatus(); } catch (_) { return null; }
  }

  function writeLog(title, value) {
    if (!logNode) return;
    let payload;
    try { payload = JSON.stringify(value, null, 2); } catch (_) { payload = String(value); }
    logNode.textContent = title + "\n" + payload;
  }

  function render() {
    if (!statusNode) return;
    const s = status() || {};
    const c = s.canonical || {};
    const baseline = c.baseline || {};
    statusNode.innerHTML = [
      "<b>Canonical:</b> " + esc(c.canonicalRevisionId || "未解決"),
      "<br><b>Scripts:</b> " + esc(c.scriptCount || "-") + " / Phase18 expected " + esc(c.phase18ExpectedScriptCount || 281),
      "<br><b>Integrity:</b> " + esc(baseline.integrityStatus || "-"),
      "<br><b>状態:</b> " + esc(s.status || "Ready"),
      "<br><b>現在位置:</b> " + esc(s.step || "INITIALIZE")
    ].join("");
    if (bootstrapNode) bootstrapNode.style.display = c.bootstrapRequired ? "block" : "none";
  }

  async function run(label, action) {
    const buttons = panel ? panel.querySelectorAll("button[data-operation]") : [];
    buttons.forEach(function (button) { button.disabled = true; });
    writeLog(label, { status: "実行中" });
    try {
      const result = await action();
      writeLog(label, result);
      render();
      return result;
    } catch (error) {
      const result = { ok: false, message: error && error.message ? error.message : String(error) };
      writeLog(label, result);
      render();
      return result;
    } finally {
      buttons.forEach(function (button) { button.disabled = false; });
    }
  }

  function confirmAction(message) {
    return global.confirm(message);
  }

  function buildPanel() {
    const overlay = document.createElement("div");
    overlay.id = "repository010-guided-panel";
    overlay.innerHTML = [
      '<div class="repository010-guided-sheet" role="dialog" aria-modal="true" aria-label="Repository Control">',
      '  <div class="repository010-guided-head"><h3>Repository Control</h3><button class="repository010-guided-close" type="button">×</button></div>',
      '  <div class="repository010-guided-card repository010-guided-status" id="repository010-guided-status"></div>',
      '  <div class="repository010-guided-card" id="repository010-guided-bootstrap" style="display:none">',
      '    <b>Phase18 初回導入</b>',
      '    <p class="repository010-guided-note">Phase18ファイルを配置した直後は、Canonical 0016と物理Repositoryの差をDevelopment Release V5で検証します。検証と昇格は別操作です。</p>',
      '    <div class="repository010-guided-actions">',
      '      <button type="button" data-operation="bootstrap-v5">① Plan + Diff + Repositoryを検証</button>',
      '      <button type="button" class="primary" data-operation="bootstrap-promote">② Phase18をCanonicalへ昇格</button>',
      '    </div>',
      '  </div>',
      '  <div class="repository010-guided-card">',
      '    <b>Development Update</b>',
      '    <p class="repository010-guided-note">UI修正やVersion Updateなど、物理Repositoryへ差分ファイルを配置した後のRelease Plan / Diff検証と明示Canonical昇格に使います。</p>',
      '    <div class="repository010-guided-actions">',
      '      <button type="button" data-operation="release-v5">① Update Plan + Diffを検証</button>',
      '      <button type="button" class="primary" data-operation="release-promote">② UpdateをCanonicalへ昇格</button>',
      '    </div>',
      '  </div>',
      '  <div class="repository010-guided-card">',
      '    <b>通常運用</b>',
      '    <p class="repository010-guided-note">V2/V3/V4は検証まで自動化します。Acceptance・V5書込み・Canonical Promotionは必ず明示操作です。</p>',
      '    <div class="repository010-guided-actions">',
      '      <button type="button" data-operation="scan">① Repository確認</button>',
      '      <button type="button" data-operation="sync">② Sync受信 + V2/V3/V4</button>',
      '      <button type="button" data-operation="mutation">③ Mutation読込 + Target検証</button>',
      '      <button type="button" class="primary" data-operation="accept">④ この変更を承認</button>',
      '      <button type="button" class="primary danger" data-operation="reflect">⑤ Repositoryへ反映 / V5</button>',
      '      <button type="button" class="primary danger" data-operation="promote">⑥ Canonicalへ昇格</button>',
      '      <button type="button" data-operation="phase18-validation">Phase18 Validation</button>',
      '      <button type="button" data-operation="reload-validation">Reload Validation</button>',
      '      <button type="button" data-operation="refresh">状態更新</button>',
      '    </div>',
      '  </div>',
      '  <div class="repository010-guided-card"><b>結果 / 詳細</b><div class="repository010-guided-log" id="repository010-guided-log">Ready</div></div>',
      '  <p class="repository010-guided-note">Validation ≠ Approval / Automatic Acceptance = OFF / Automatic Promotion = OFF / Direct Repository Mutation = OFF</p>',
      '</div>'
    ].join("\n");
    document.body.appendChild(overlay);
    return overlay;
  }

  function bind() {
    panel.querySelector(".repository010-guided-close").addEventListener("click", function () { panel.classList.remove("open"); });
    panel.addEventListener("click", function (event) { if (event.target === panel) panel.classList.remove("open"); });
    panel.querySelector('[data-operation="scan"]').addEventListener("click", function () { run("Repository確認", function () { return namespace.scanGuidedRepository(); }); });
    panel.querySelector('[data-operation="sync"]').addEventListener("click", function () { run("Sync受信 + V2/V3/V4", function () { return namespace.receiveGuidedAndroidToPcSync(); }); });
    panel.querySelector('[data-operation="mutation"]').addEventListener("click", function () { run("Mutation読込", function () { return namespace.receiveGuidedMutationPackage(); }); });
    panel.querySelector('[data-operation="accept"]').addEventListener("click", function () {
      if (!confirmAction("この変更をProject Ownerとして承認しますか？\n\nValidationだけでは承認されません。")) return;
      run("Manual Acceptance", function () { return namespace.approveGuidedMutation(); });
    });
    panel.querySelector('[data-operation="reflect"]').addEventListener("click", async function () {
      const initialized = namespace.initializeRestrictedDesktopWriteAdapter();
      if (!initialized || initialized.ok !== true) { writeLog("Persistent Reflection / V5", initialized); render(); return; }
      const selected = await namespace.selectRestrictedDesktopWriteDirectory();
      if (!selected || selected.ok !== true) { writeLog("Persistent Reflection / V5", selected); render(); return; }
      if (!confirmAction("選択したRepositoryへ承認済み変更を反映し、Backup → Journal → Write → Readback → V5を実行しますか？")) {
        writeLog("Persistent Reflection / V5", { ok: false, status: "Cancelled", repositoryWriteAttempted: false, directorySelected: true });
        render();
        return;
      }
      run("Persistent Reflection / V5", function () { return namespace.reflectGuidedMutation({ useSelectedWriteDirectory: true }); });
    });
    panel.querySelector('[data-operation="promote"]').addEventListener("click", async function () {
      const selected = await namespace.selectDesktopRepositoryDirectory();
      if (!selected || selected.ok !== true) { writeLog("Canonical Promotion", selected); render(); return; }
      if (!confirmAction("選択したRepositoryをFresh Scanしたうえで、V5 Verifiedの状態を次のCanonical Revisionへ明示昇格しますか？\n\n自動Promotionではありません。")) {
        writeLog("Canonical Promotion", { ok: false, status: "Cancelled", canonicalRevisionPromoted: false, directorySelected: true });
        render();
        return;
      }
      run("Canonical Promotion", function () { return namespace.promoteGuidedReflection({ useSelectedDesktopDirectory: true }); });
    });
    panel.querySelector('[data-operation="bootstrap-v5"]').addEventListener("click", function () {
      run("Phase18 Bootstrap Development Release V5", function () { return namespace.verifyPhase18BootstrapRelease(); });
    });
    panel.querySelector('[data-operation="bootstrap-promote"]').addEventListener("click", async function () {
      const selected = await namespace.selectDesktopRepositoryDirectory();
      if (!selected || selected.ok !== true) { writeLog("Phase18 Bootstrap Promotion", selected); render(); return; }
      if (!confirmAction("選択したRepositoryをFresh Scanしたうえで、Phase18 Development Release V5を次のCanonical Revisionへ昇格しますか？")) {
        writeLog("Phase18 Bootstrap Promotion", { ok: false, status: "Cancelled", canonicalRevisionPromoted: false, directorySelected: true });
        render();
        return;
      }
      run("Phase18 Bootstrap Promotion", function () { return namespace.promotePhase18BootstrapRelease({ useSelectedDesktopDirectory: true }); });
    });
    panel.querySelector('[data-operation="release-v5"]').addEventListener("click", function () {
      run("Development Update V5", function () { return namespace.verifyGuidedDevelopmentReleaseUpdate(); });
    });
    panel.querySelector('[data-operation="release-promote"]').addEventListener("click", async function () {
      const selected = await namespace.selectDesktopRepositoryDirectory();
      if (!selected || selected.ok !== true) { writeLog("Development Update Promotion", selected); render(); return; }
      if (!confirmAction("選択したRepositoryをFresh Scanしたうえで、検証済みDevelopment Updateを次のCanonical Revisionへ明示昇格しますか？\n\n自動Promotionではありません。")) {
        writeLog("Development Update Promotion", { ok: false, status: "Cancelled", canonicalRevisionPromoted: false, directorySelected: true });
        render();
        return;
      }
      run("Development Update Promotion", function () { return namespace.promoteGuidedDevelopmentReleaseUpdate({ useSelectedDesktopDirectory: true }); });
    });
    panel.querySelector('[data-operation="phase18-validation"]').addEventListener("click", function () { run("Phase18 Static Validation", function () { return namespace.runLocalFirstRepositoryPhase18Validation(); }); });
    panel.querySelector('[data-operation="reload-validation"]').addEventListener("click", function () { run("Persistence Reload Validation", function () { return namespace.runGuidedReloadValidation(); }); });
    panel.querySelector('[data-operation="refresh"]').addEventListener("click", function () { run("状態更新", function () { return namespace.resolveGuidedRepositoryCanonical(); }); });
  }

  async function mountGuidedRepositoryOperationsUI() {
    if (mounted) return internal.buildResult(true, "REPOSITORY010_GUIDED_UI_ALREADY_MOUNTED", "Ready", { mounted: true });
    style();
    const launcher = document.createElement("button");
    launcher.id = "repository010-guided-launcher";
    launcher.type = "button";
    launcher.textContent = "Repo";
    document.body.appendChild(launcher);
    panel = buildPanel();
    statusNode = document.getElementById("repository010-guided-status");
    logNode = document.getElementById("repository010-guided-log");
    bootstrapNode = document.getElementById("repository010-guided-bootstrap");
    bind();
    launcher.addEventListener("click", async function () {
      panel.classList.add("open");
      const result = await namespace.initializeGuidedRepositoryOperations();
      writeLog("Repository Control", result);
      render();
    });
    global.addEventListener("repository010-guided-state-changed", render);
    mounted = true;
    namespace.modules.guidedOperationsUi.status = "Mounted";
    return internal.buildResult(true, "REPOSITORY010_GUIDED_UI_MOUNTED", "Ready", {
      mounted: true,
      launcherId: launcher.id,
      consolePasteRequiredForNormalUse: false,
      explicitApprovalControlsPreserved: true
    });
  }

  Object.assign(namespace.api, {
    mountGuidedRepositoryOperationsUI: mountGuidedRepositoryOperationsUI,
    getGuidedRepositoryOperationsUIStatus: function () {
      return {
        status: mounted ? "Mounted" : "Ready",
        phase: 18,
        moduleVersion: MODULE_VERSION,
        mounted: mounted,
        launcherPresent: Boolean(document.getElementById("repository010-guided-launcher")),
        consolePasteRequiredForNormalUse: false,
        directUserGesturePickerBindingImplemented: true,
        confirmationAfterDirectorySelection: true,
        launcherCollisionAvoidanceImplemented: true,
        darkModeContrastHotfixImplemented: true,
        developmentUpdateControlsImplemented: true
      };
    }
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.guidedOperationsUi = {
    id: "REPOSITORY-010-GUIDED-OPERATIONS-UI",
    version: MODULE_VERSION,
    status: "Ready",
    phase: 18,
    explicitApprovalControlsPreserved: true,
    directUserGesturePickerBindingImplemented: true,
    confirmationAfterDirectorySelection: true,
    launcherCollisionAvoidanceImplemented: true,
    darkModeContrastHotfixImplemented: true,
    developmentUpdateControlsImplemented: true,
    consolePasteRequiredForNormalUse: false,
    loadedAt: internal.nowIso()
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { mountGuidedRepositoryOperationsUI(); }, { once: true });
  } else {
    mountGuidedRepositoryOperationsUI();
  }
})(typeof window !== "undefined" ? window : globalThis);
